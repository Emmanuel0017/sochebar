import { useEffect, useState } from 'react';
import { CloudOff, CloudUpload, RefreshCw, X } from 'lucide-react';
import { subscribeSync, flushQueue, type SyncState } from '../lib/syncManager';
import { listQueue, removeFromQueue, type QueuedMutation } from '../lib/offlineDb';

export function OfflineStatusBadge() {
  const [state, setState] = useState<SyncState>({
    pending: 0,
    syncing: false,
    online: navigator.onLine,
    lastSyncedAt: null,
    lastError: null,
  });
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<QueuedMutation[]>([]);

  useEffect(() => subscribeSync(setState), []);

  useEffect(() => {
    if (open) listQueue().then(setItems);
  }, [open, state.pending]);

  if (state.online && state.pending === 0 && !state.syncing) {
    return null; // fully synced, nothing to show
  }

  const label = !state.online
    ? state.pending > 0
      ? `Offline — ${state.pending} pending sync`
      : 'Offline'
    : state.syncing
      ? 'Syncing…'
      : `${state.pending} pending sync`;

  const Icon = !state.online ? CloudOff : state.syncing ? RefreshCw : CloudUpload;

  async function discard(id: string) {
    await removeFromQueue(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs border transition-colors ${
          !state.online
            ? 'border-copper/40 text-copper bg-copper/10'
            : 'border-brass/40 text-brass bg-brass/10 hover:bg-brass/20'
        }`}
      >
        <Icon size={13} className={state.syncing ? 'animate-spin' : ''} />
        {label}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-ink-raised border border-panel-border rounded-md shadow-xl z-50 p-2">
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-xs text-paper-dim">
              {state.online ? 'Waiting to sync' : "Saved on this device — will sync when you're back online"}
            </span>
            {state.online && !state.syncing && state.pending > 0 && (
              <button onClick={() => flushQueue()} className="text-xs text-brass hover:underline">
                Sync now
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <div className="px-2 py-3 text-xs text-paper-dim">Nothing queued.</div>
          ) : (
            <ul className="space-y-1">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-2 px-2 py-1.5 rounded bg-panel/50 text-xs"
                >
                  <div className="min-w-0">
                    <div className="text-paper truncate">{item.description}</div>
                    <div className="text-paper-dim">{new Date(item.createdAt).toLocaleString()}</div>
                    {item.lastError && <div className="text-copper mt-0.5">{item.lastError}</div>}
                  </div>
                  <button
                    onClick={() => discard(item.id)}
                    title="Discard this queued change"
                    className="shrink-0 text-paper-dim hover:text-copper"
                  >
                    <X size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
