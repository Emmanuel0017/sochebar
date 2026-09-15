import { useEffect, useState } from 'react';
import { CloudCheck, RefreshCw, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';

interface SyncStatus {
  enabled: boolean;
  pending: number;
  syncing: boolean;
  lastSyncedAt: string | null;
  lastError: string | null;
}

// Polls the LOCAL backend's own /api/sync/* endpoints (not Render
// directly) — the local app's sync job is what actually talks to Render;
// this just reflects its status and offers a manual nudge.
export function SyncToCloudBadge() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [pushing, setPushing] = useState(false);

  async function refresh() {
    try {
      const { data } = await api.get<SyncStatus>('/sync/status');
      setStatus(data);
    } catch {
      // Not fatal — most installs won't have sync configured at all, and
      // a transient failure here shouldn't show an error state for a
      // feature that's inherently best-effort in the background.
    }
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, []);

  if (!status?.enabled) return null; // sync not configured on this install — nothing to show

  async function pushNow() {
    setPushing(true);
    try {
      const { data } = await api.post<SyncStatus>('/sync/push');
      setStatus(data);
    } finally {
      setPushing(false);
    }
  }

  const busy = status.syncing || pushing;
  const label = busy
    ? 'Syncing to cloud…'
    : status.pending > 0
      ? `${status.pending} awaiting cloud sync`
      : 'Synced to cloud';

  const Icon = status.lastError && status.pending > 0 ? AlertCircle : busy ? RefreshCw : CloudCheck;

  return (
    <button
      onClick={pushNow}
      disabled={busy}
      title={status.lastError ?? undefined}
      className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs border border-panel-border text-paper-dim hover:text-paper hover:border-brass/40 transition-colors disabled:opacity-60"
    >
      <Icon size={13} className={busy ? 'animate-spin' : ''} />
      {label}
    </button>
  );
}
