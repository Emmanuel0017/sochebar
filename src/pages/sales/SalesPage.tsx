import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { api } from '../../lib/api';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Input, Label } from '../../components/Input';
import { PageLoader } from '../../components/Spinner';
import { useToast } from '../../components/Toast';
import { errorMessage } from '../../lib/errors';
import { formatMWK, formatDateTime, localDateStr } from '../../lib/format';
import { useAuth } from '../../context/AuthContext';
import type { Sale } from '../../types';

export function SalesPage() {
  const { user } = useAuth();
  const { push } = useToast();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [date, setDate] = useState(() => localDateStr());
  const [allDates, setAllDates] = useState(false);
  const [voidTarget, setVoidTarget] = useState<Sale | null>(null);
  const [voidReason, setVoidReason] = useState('');

  function load() {
    setLoading(true);
    api
      .get('/sales', allDates ? undefined : { params: { from: date, to: date } })
      .then((r) => setSales(r.data))
      .finally(() => setLoading(false));
  }

  useEffect(load, [date, allDates]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sales;
    return sales.filter(
      (s) =>
        s.invoiceNumber.toLowerCase().includes(q) ||
        s.user?.name.toLowerCase().includes(q) ||
        s.customer?.name?.toLowerCase().includes(q) ||
        s.items.some((it) => it.product?.name?.toLowerCase().includes(q)),
    );
  }, [sales, search]);

  const dayTotal = useMemo(
    () => filtered.filter((s) => s.status !== 'VOIDED').reduce((sum, s) => sum + Number(s.total), 0),
    [filtered],
  );

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

  const toneFor = (status: Sale['status']) =>
    status === 'COMPLETED' ? 'ok' : status === 'VOIDED' ? 'danger' : 'warn';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-2xl text-paper">Sales</h1>
        {!allDates && !loading && (
          <div className="text-right">
            <div className="text-xs text-paper-dim">Total for {date}</div>
            <div className="font-mono text-lg text-brass">{formatMWK(dayTotal)}</div>
          </div>
        )}
      </div>

      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <Label>Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={allDates} />
        </div>
        <label className="flex items-center gap-2 text-sm text-paper-dim pb-2">
          <input type="checkbox" checked={allDates} onChange={(e) => setAllDates(e.target.checked)} />
          Show all dates
        </label>
        <div className="relative flex-1 min-w-[240px]">
          <Label>&nbsp;</Label>
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-paper-dim" />
          <Input
            placeholder="Search invoice, cashier, customer, or product…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <PageLoader />
      ) : (
        <Card>
          {filtered.map((s) => (
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
          {filtered.length === 0 && (
            <p className="text-sm text-paper-dim text-center py-8">
              {sales.length === 0 ? `No sales recorded for ${allDates ? 'any date' : date}.` : 'No sales match your search.'}
            </p>
          )}
        </Card>
      )}

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
