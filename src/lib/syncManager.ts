import axios from 'axios';
import { listQueue, removeFromQueue, updateQueueItem, queueLength, type QueuedMutation } from './offlineDb';

type Listener = (state: SyncState) => void;

export interface SyncState {
  pending: number;
  syncing: boolean;
  online: boolean;
  lastSyncedAt: number | null;
  lastError: string | null;
}

let state: SyncState = {
  pending: 0,
  syncing: false,
  online: navigator.onLine,
  lastSyncedAt: null,
  lastError: null,
};

const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((fn) => fn(state));
}

export function subscribeSync(listener: Listener): () => void {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

export async function notifyQueueChanged() {
  state = { ...state, pending: await queueLength() };
  emit();
}

// A raw axios instance for replaying the queue — deliberately bypasses
// our own interceptors (no re-queueing on failure, no re-caching), so we
// control retry/failure handling explicitly below.
const raw = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api',
  timeout: 15_000,
});

async function replayOne(item: QueuedMutation): Promise<'ok' | 'retry' | 'drop'> {
  try {
    const token = localStorage.getItem('accessToken');
    await raw.request({
      method: item.method,
      url: item.url,
      data: item.data,
      headers: {
        ...item.headers,
        Authorization: token ? `Bearer ${token}` : undefined,
      },
    });
    return 'ok';
  } catch (err: any) {
    if (!err.response) {
      // Still offline / connection dropped mid-sync — stop and try again later.
      return 'retry';
    }
    if (err.response.status === 401) {
      // Token expired while offline — can't safely replay without a
      // fresh login. Leave it queued; it'll retry after the user signs
      // back in and the queue is flushed again.
      return 'retry';
    }
    // A real 4xx/5xx from the server (validation error, conflict, etc).
    // Retrying forever won't help — record it and drop it from the queue
    // so it doesn't block everything behind it, but surface the failure.
    await updateQueueItem(item.id, { lastError: err.response?.data?.message ?? err.message });
    return 'drop';
  }
}

let syncing = false;

export async function flushQueue() {
  if (syncing || !navigator.onLine) return;
  syncing = true;
  state = { ...state, syncing: true, online: true };
  emit();

  try {
    const items = await listQueue();
    for (const item of items) {
      const result = await replayOne(item);
      if (result === 'retry') {
        state = { ...state, lastError: 'Sync paused — connection lost mid-sync' };
        break; // preserve order: stop rather than skip ahead
      }
      await removeFromQueue(item.id);
      if (result === 'drop') {
        state = { ...state, lastError: `A queued change was rejected: ${item.description}` };
      }
    }
  } finally {
    const pending = await queueLength();
    state = { ...state, syncing: false, pending, lastSyncedAt: pending === 0 ? Date.now() : state.lastSyncedAt };
    syncing = false;
    emit();
  }
}

export function initSyncManager() {
  window.addEventListener('online', () => {
    state = { ...state, online: true };
    emit();
    flushQueue();
  });
  window.addEventListener('offline', () => {
    state = { ...state, online: false };
    emit();
  });

  // Periodic safety-net flush: covers the case where the browser fires
  // neither event reliably (flaky wifi that never fully "goes offline").
  setInterval(() => {
    if (navigator.onLine) flushQueue();
  }, 30_000);

  notifyQueueChanged();
  if (navigator.onLine) flushQueue();
}
