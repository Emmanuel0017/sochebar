import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Input, Label } from '../../components/Input';
import { PageLoader } from '../../components/Spinner';
import { useToast } from '../../components/Toast';
import { errorMessage } from '../../lib/errors';
import { formatMWK, formatDateTime } from '../../lib/format';
import { useAuth } from '../../context/AuthContext';
import type { Sale } from '../../types';

export function SalesPage() {
  const { user } = useAuth();
  const { push } = useToast();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [voidTarget, setVoidTarget] = useState<Sale | null>(null);
  const [voidReason, setVoidReason] = useState('');

  function load() {
    setLoading(true);
    api.get('/sales').then((r) => setSales(r.data)).finally(() => setLoading(false));
  }

  useEffect(load, []);

  const canVoid = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  async function submitVoid() {
    if (!voidTarget) return;
    try {
      await api.post(`/sales/${voidTarget.id}/void`, { reason: voidReason });
      push('Sale voided');
      setVoidTarget(null);
      setVoidReason('');
      load();
    } catch (err) {
      push(errorMessage(err), 'error');
    }
  }

  if (loading) return <PageLoader />;

  const toneFor = (status: Sale['status']) =>
    status === 'COMPLETED' ? 'ok' : status === 'VOIDED' ? 'danger' : 'warn';

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-paper">Sales</h1>

      <Card>
        {sales.map((s) => (
          <div key={s.id} className="ledger-row flex items-center justify-between px-4 py-3">
            <div>
              <div className="text-sm text-paper font-mono">{s.invoiceNumber}</div>
              <div className="text-xs text-paper-dim">
                {formatDateTime(s.saleDate)} · {s.user?.name} · {s.items.length} items
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-paper">{formatMWK(s.total)}</span>
              <Badge tone={toneFor(s.status)}>{s.status}</Badge>
              {canVoid && s.status === 'COMPLETED' && (
                <Button variant="ghost" onClick={() => setVoidTarget(s)}>
                  Void
                </Button>
              )}
            </div>
          </div>
        ))}
        {sales.length === 0 && <p className="text-sm text-paper-dim text-center py-8">No sales recorded yet.</p>}
      </Card>

      <Modal open={!!voidTarget} onClose={() => setVoidTarget(null)} title={`Void ${voidTarget?.invoiceNumber ?? ''}`}>
        <div className="space-y-3">
          <p className="text-sm text-paper-dim">
            This reverses inventory and any cash/credit ledger entries for this sale. The record is kept, not
            deleted.
          </p>
          <div>
            <Label>Reason</Label>
            <Input value={voidReason} onChange={(e) => setVoidReason(e.target.value)} autoFocus />
          </div>
          <Button variant="danger" className="w-full" onClick={submitVoid} disabled={!voidReason}>
            Void sale
          </Button>
        </div>
      </Modal>
    </div>
  );
}
