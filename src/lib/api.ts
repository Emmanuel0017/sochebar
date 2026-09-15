import axios, { type AxiosResponse } from 'axios';
import { v4 as uuid } from 'uuid';
import { cacheKeyFor, enqueueMutation, readCache, writeCache } from './offlineDb';
import { notifyQueueChanged } from './syncManager';

const MUTATING_METHODS = new Set(['post', 'put', 'patch', 'delete']);

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api',
  timeout: 10_000, // fail fast on a dead connection instead of hanging
});

// Holds the exact payload we intended to send for any in-flight mutating
// request, keyed by its idempotency key. We capture it here (before axios
// serializes it) so that if the request fails to reach the server, we can
// queue *exactly* what was meant to be sent, byte for byte, rather than
// trying to reconstruct it from a possibly-transformed error.config.data.
const pendingPayloads = new Map<
  string,
  { method: string; url: string; data: unknown; description: string }
>();

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const method = (config.method ?? 'get').toLowerCase();
  if (MUTATING_METHODS.has(method)) {
    // Reuse an existing key on retried requests, otherwise mint one. This
    // header is what makes the backend safe to replay this exact request
    // more than once (e.g. after it's been queued offline and replayed).
    const key = (config.headers?.['Idempotency-Key'] as string) || uuid();
    config.headers = config.headers ?? {};
    config.headers['Idempotency-Key'] = key;
    pendingPayloads.set(key, {
      method: method.toUpperCase(),
      url: config.url ?? '',
      data: config.data,
      description: describeRequest(method.toUpperCase(), config.url ?? ''),
    });
  }

  return config;
});

let isRefreshing = false;
let queue: Array<() => void> = [];

api.interceptors.response.use(
  (response) => {
    // Write-through cache: every successful GET refreshes what's
    // available offline. Fire-and-forget, never blocks the UI.
    if ((response.config.method ?? 'get').toLowerCase() === 'get') {
      const key = cacheKeyFor(response.config.url ?? '', response.config.params);
      writeCache(key, response.config.url ?? '', response.data).catch(() => {});
    }
    return response;
  },
  async (error) => {
    const original = error.config;
    const method = (original?.method ?? 'get').toLowerCase();

    // --- Existing auth-refresh flow (unchanged) ---
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve) => {
          queue.push(() => resolve(api(original)));
        });
      }

      isRefreshing = true;
      try {
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'}/auth/refresh`,
          { refreshToken },
        );
        localStorage.setItem('accessToken', data.accessToken);
        queue.forEach((fn) => fn());
        queue = [];
        return api(original);
      } catch (refreshError) {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // --- Offline handling ---
    // error.response is only set if the server actually answered. Its
    // absence means the request never got a reply: no connectivity, DNS
    // failure, or our own 10s timeout. That's the offline signal.
    const isNetworkFailure = !error.response;

    if (isNetworkFailure && method === 'get') {
      const key = cacheKeyFor(original?.url ?? '', original?.params);
      const cached = await readCache(key);
      if (cached) {
        const syntheticResponse: AxiosResponse = {
          data: cached.data,
          status: 200,
          statusText: 'OK (offline cache)',
          headers: {},
          config: original,
        } as AxiosResponse;
        return Promise.resolve(syntheticResponse);
      }
      // Nothing cached for this yet — surface a clearer flag than a raw
      // network error so the UI can show "no offline data for this".
      error.isOfflineNoCache = true;
      return Promise.reject(error);
    }

    if (isNetworkFailure && MUTATING_METHODS.has(method)) {
      const key = original?.headers?.['Idempotency-Key'] as string | undefined;
      const captured = key ? pendingPayloads.get(key) : undefined;
      const finalKey = key ?? uuid();

      await enqueueMutation({
        id: finalKey,
        method: method.toUpperCase() as 'POST' | 'PUT' | 'PATCH' | 'DELETE',
        url: captured?.url ?? original?.url ?? '',
        data: captured?.data ?? original?.data,
        headers: { 'Idempotency-Key': finalKey },
        createdAt: Date.now(),
        description: captured?.description ?? describeRequest(method.toUpperCase(), original?.url ?? ''),
      });
      notifyQueueChanged();

      // Resolve (don't reject) so existing page code — which only handles
      // success/failure, not "queued" — treats this as a success and
      // updates its UI, e.g. closing the checkout modal. Callers can check
      // response.headers['x-offline-queued'] if they want to know.
      const syntheticResponse: AxiosResponse = {
        data: { ...(typeof original?.data === 'object' && original?.data ? original.data : {}), __offlineQueued: true },
        status: 202,
        statusText: 'Queued (offline)',
        headers: { 'x-offline-queued': 'true' },
        config: original,
      } as AxiosResponse;
      return Promise.resolve(syntheticResponse);
    }

    return Promise.reject(error);
  },
);

function describeRequest(method: string, url: string): string {
  const clean = url.split('?')[0];
  const verb = { POST: 'Create', PUT: 'Update', PATCH: 'Update', DELETE: 'Delete' }[method] ?? method;
  return `${verb} ${clean}`;
}
