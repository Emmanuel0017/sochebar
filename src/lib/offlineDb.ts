import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

/**
 * Offline data store for Sochebar.
 *
 * Two object stores, kept deliberately generic so every existing page
 * (reports, inventory, POS, etc.) benefits without needing per-page code:
 *
 * - `cache`   — the most recent successful response for every GET request,
 *               keyed by method+url+params. Read back when a GET fails
 *               because there's no network.
 * - `queue`   — mutating requests (POST/PUT/PATCH/DELETE) made while
 *               offline, in the order they were made. Replayed in order
 *               once connectivity returns.
 */

export interface CacheEntry {
  key: string;
  url: string;
  data: unknown;
  cachedAt: number;
}

export interface QueuedMutation {
  id: string; // also sent as the Idempotency-Key header
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  data: unknown;
  headers: Record<string, string>;
  createdAt: number;
  description: string; // human-readable, shown in the pending-sync UI
  lastError?: string;
}

interface SochebarOfflineDB extends DBSchema {
  cache: {
    key: string;
    value: CacheEntry;
  };
  queue: {
    key: string;
    value: QueuedMutation;
  };
}

let dbPromise: Promise<IDBPDatabase<SochebarOfflineDB>> | null = null;

export function getOfflineDb() {
  if (!dbPromise) {
    dbPromise = openDB<SochebarOfflineDB>('sochebar-offline', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('queue')) {
          db.createObjectStore('queue', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export function cacheKeyFor(url: string, params?: unknown) {
  return params ? `${url}?${JSON.stringify(params)}` : url;
}

export async function readCache(key: string): Promise<CacheEntry | undefined> {
  const db = await getOfflineDb();
  return db.get('cache', key);
}

export async function writeCache(key: string, url: string, data: unknown) {
  const db = await getOfflineDb();
  await db.put('cache', { key, url, data, cachedAt: Date.now() });
}

export async function enqueueMutation(mutation: QueuedMutation) {
  const db = await getOfflineDb();
  await db.put('queue', mutation);
}

export async function listQueue(): Promise<QueuedMutation[]> {
  const db = await getOfflineDb();
  const all = await db.getAll('queue');
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function removeFromQueue(id: string) {
  const db = await getOfflineDb();
  await db.delete('queue', id);
}

export async function updateQueueItem(id: string, patch: Partial<QueuedMutation>) {
  const db = await getOfflineDb();
  const existing = await db.get('queue', id);
  if (existing) {
    await db.put('queue', { ...existing, ...patch });
  }
}

export async function queueLength(): Promise<number> {
  const db = await getOfflineDb();
  return db.count('queue');
}
