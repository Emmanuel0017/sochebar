import { useEffect, useMemo, useState } from 'react';
import { Search, ChevronRight } from 'lucide-react';
import { api } from '../../lib/api';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { Input, Label } from '../../components/Input';
import { PageLoader } from '../../components/Spinner';
import { formatDateTime, formatMWK, localDateStr } from '../../lib/format';
import type { AuditLogEntry } from '../../types';

const TONE_FOR_ACTION: Record<string, 'ok' | 'warn' | 'danger' | 'neutral'> = {
  VOID_SALE: 'danger',
  DEACTIVATE_PRODUCT: 'danger',
  DEACTIVATE_USER: 'danger',
  DELETE_UNIT: 'danger',
  CREATE_SALE: 'ok',
  CREATE_PURCHASE: 'ok',
  CUSTOMER_PAYMENT: 'ok',
  CREATE_CAPITAL_TRANSACTION: 'ok',
  TRANSFER_CASH: 'ok',
  CLOSE_CASH_SESSION: 'warn',
  STOCK_ADJUSTMENT: 'warn',
  RECORD_WASTAGE: 'warn',
};

function actionLabel(action: string) {
  return action
    .split('_')
    .map((w) => w[0] + w.slice(1).toLowerCase())
    .join(' ');
}

function money(n: number) {
  return formatMWK(n);
}

// The single MWK figure this entry is "about" - shown right on the row so
// you don't have to open anything just to see how much was involved.
function amountFor(l: AuditLogEntry): number | null {
  const v = l.newValues as any;
  if (!v || typeof v !== 'object') return null;
  switch (l.action) {
    case 'CREATE_SALE':
    case 'VOID_SALE':
    case 'CREATE_PURCHASE':
      return v.total ?? null;
    case 'CUSTOMER_PAYMENT':
    case 'CREATE_CAPITAL_TRANSACTION':
    case 'TRANSFER_CASH':
    case 'CREATE_CASH_ACCOUNT_TRANSACTION':
      return v.amount ?? null;
    case 'CREATE_FIXED_ASSET':
      return v.cost ?? null;
    default:
      return typeof v.amount === 'number' ? v.amount : typeof v.total === 'number' ? v.total : null;
  }
}

// One-line overview shown on the row itself - short, so a long item list
// gets truncated here (the click-through modal has the full breakdown).
function overviewLine(l: AuditLogEntry): string | null {
  const v = l.newValues as any;
  if (!v || typeof v !== 'object') return null;

  const itemsPreview = (items: any[]) => {
    if (!items?.length) return null;
    const shown = items.slice(0, 3).map((i) => `${i.product} x${i.quantity}`);
    const rest = items.length - shown.length;
    return rest > 0 ? `${shown.join(', ')} +${rest} more` : shown.join(', ');
  };

  switch (l.action) {
    case 'CREATE_SALE':
    case 'VOID_SALE': {
      const preview = itemsPreview(v.items) ?? (v.isFreeformBill ? 'freeform bill' : null);
      const parts = [preview, v.customerName ? `for ${v.customerName}` : null];
      if (l.action === 'VOID_SALE' && v.reason) parts.push(`(${v.reason})`);
      return parts.filter(Boolean).join(' — ') || null;
    }
    case 'CREATE_PURCHASE':
      return [itemsPreview(v.items), v.supplierName ? `from ${v.supplierName}` : null].filter(Boolean).join(' — ') || null;
    case 'CUSTOMER_PAYMENT':
    case 'CREATE_CAPITAL_TRANSACTION':
      return v.description ?? null;
    case 'CREATE_FIXED_ASSET':
      return v.name ?? null;
    case 'TRANSFER_CASH':
      return v.description ?? null;
    default:
      return null;
  }
}

// Older activity entries (logged before item breakdowns were captured) have
// no `items` array in their snapshot. Rather than mislabel those as
// "freeform bills", fall back to fetching the live Sale/Purchase record -
// the real line items still exist there even if the audit snapshot is thin.
function useEntityFallback(log: AuditLogEntry) {
  const [items, setItems] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setItems(null);
    const v = (log.newValues ?? {}) as any;
    const snapshotHasItems = Array.isArray(v.items) && v.items.length > 0;
    if (snapshotHasItems || v.isFreeformBill || !log.entityId) return;

    if (log.action === 'CREATE_SALE' || log.action === 'VOID_SALE') {
      setLoading(true);
      api
        .get(`/sales/${log.entityId}`)
        .then((r) =>
          setItems(
            (r.data.items ?? []).map((i: any) => ({
              product: i.product?.name ?? 'Unknown product',
              unit: i.unit?.name,
              quantity: Number(i.quantity),
              unitPrice: Number(i.unitPrice),
              total: Number(i.total),
            })),
          ),
        )
        .catch(() => setItems([]))
        .finally(() => setLoading(false));
    } else if (log.action === 'CREATE_PURCHASE') {
      setLoading(true);
      api
        .get(`/purchases/${log.entityId}`)
        .then((r) =>
          setItems(
            (r.data.items ?? []).map((i: any) => ({
              product: i.product?.name ?? 'Unknown product',
              unit: i.unit?.name,
              quantity: Number(i.quantity),
              unitCost: Number(i.unitCost),
              total: Number(i.totalCost),
            })),
          ),
        )
        .catch(() => setItems([]))
        .finally(() => setLoading(false));
    }
  }, [log.id]);

  return { items, loading };
}

function fieldRow(label: string, value: React.ReactNode) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-panel-border/60 last:border-0">
      <span className="text-xs text-paper-dim">{label}</span>
      <span className="text-sm text-paper text-right">{value}</span>
    </div>
  );
}

// Full-detail view rendered inside the modal once a row is clicked. Every
// action gets a purpose-built breakdown; anything not explicitly handled
// falls back to a readable dump of every field that was actually recorded.
function DetailBody({ log }: { log: AuditLogEntry }) {
  const v = (log.newValues ?? {}) as any;
  const fallback = useEntityFallback(log);

  const header = (
    <div className="mb-3 pb-3 border-b border-panel-border space-y-1">
      {fieldRow('Action', actionLabel(log.action))}
      {fieldRow('Entity', log.entityType)}
      {fieldRow('By', log.user?.name ?? 'System')}
      {fieldRow('When', formatDateTime(log.createdAt))}
    </div>
  );

  if (log.action === 'CREATE_SALE' || log.action === 'VOID_SALE') {
    const snapshotItems = Array.isArray(v.items) ? v.items : [];
    const usingFallback = snapshotItems.length === 0 && !v.isFreeformBill;
    const items = usingFallback ? fallback.items ?? [] : snapshotItems;
    return (
      <div>
        {header}
        <div className="space-y-1 mb-3">
          {v.invoiceNumber && fieldRow('Invoice', v.invoiceNumber)}
          {v.customerName && fieldRow('Customer', v.customerName)}
          {log.action === 'VOID_SALE' && v.reason && fieldRow('Void reason', v.reason)}
        </div>
        {usingFallback && fallback.loading ? (
          <p className="text-sm text-paper-dim mb-3">Loading products…</p>
        ) : items.length > 0 ? (
          <>
            <div className="text-xs uppercase tracking-wide text-paper-dim mb-1.5">Products sold</div>
            <div className="rounded-md border border-panel-border overflow-hidden mb-3">
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-2 px-3 py-2 text-xs uppercase tracking-wide text-paper-dim bg-ink-raised">
                <span>Product</span>
                <span className="text-right">Qty</span>
                <span className="text-right">Unit price</span>
                <span className="text-right">Total</span>
              </div>
              {items.map((it: any, idx: number) => (
                <div key={idx} className="ledger-row grid grid-cols-[2fr_1fr_1fr_1fr] gap-2 px-3 py-2 items-center">
                  <span className="text-sm text-paper">{it.product}</span>
                  <span className="font-mono text-sm text-right text-paper-dim">
                    {it.quantity}
                    {it.unit ? ` ${it.unit}` : ''}
                  </span>
                  <span className="font-mono text-sm text-right text-paper-dim">
                    {it.unitPrice != null ? money(it.unitPrice) : '—'}
                  </span>
                  <span className="font-mono text-sm text-right">{it.total != null ? money(it.total) : '—'}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-paper-dim mb-3">Freeform bill — no individual line items recorded.</p>
        )}
        {v.total != null && fieldRow('Sale total', <span className="font-mono text-brass">{money(v.total)}</span>)}
      </div>
    );
  }

  if (log.action === 'CREATE_PURCHASE') {
    const snapshotItems = Array.isArray(v.items) ? v.items : [];
    const usingFallback = snapshotItems.length === 0;
    const items = usingFallback ? fallback.items ?? [] : snapshotItems;
    return (
      <div>
        {header}
        <div className="space-y-1 mb-3">
          {v.supplierName && fieldRow('Supplier', v.supplierName)}
          {v.paymentStatus && fieldRow('Payment status', v.paymentStatus)}
        </div>
        <div className="text-xs uppercase tracking-wide text-paper-dim mb-1.5">Products purchased</div>
        {usingFallback && fallback.loading ? (
          <p className="text-sm text-paper-dim mb-3">Loading products…</p>
        ) : (
          <div className="rounded-md border border-panel-border overflow-hidden mb-3">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-2 px-3 py-2 text-xs uppercase tracking-wide text-paper-dim bg-ink-raised">
              <span>Product</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Unit cost</span>
              <span className="text-right">Total</span>
            </div>
            {items.map((it: any, idx: number) => (
              <div key={idx} className="ledger-row grid grid-cols-[2fr_1fr_1fr_1fr] gap-2 px-3 py-2 items-center">
                <span className="text-sm text-paper">{it.product}</span>
                <span className="font-mono text-sm text-right text-paper-dim">
                  {it.quantity}
                  {it.unit ? ` ${it.unit}` : ''}
                </span>
                <span className="font-mono text-sm text-right text-paper-dim">{it.unitCost != null ? money(it.unitCost) : '—'}</span>
                <span className="font-mono text-sm text-right">{it.total != null ? money(it.total) : '—'}</span>
              </div>
            ))}
            {items.length === 0 && <p className="text-sm text-paper-dim px-3 py-2">No line items found.</p>}
          </div>
        )}
        {v.total != null && fieldRow('Purchase total', <span className="font-mono text-brass">{money(v.total)}</span>)}
      </div>
    );
  }

  if (log.action === 'CUSTOMER_PAYMENT') {
    return (
      <div>
        {header}
        {fieldRow('Amount paid', <span className="font-mono text-ledger">{v.amount != null ? money(v.amount) : '—'}</span>)}
        {v.description && fieldRow('Note', v.description)}
      </div>
    );
  }

  if (log.action === 'CREATE_CAPITAL_TRANSACTION') {
    return (
      <div>
        {header}
        {v.transactionType && fieldRow('Type', v.transactionType === 'CONTRIBUTION' ? 'Contribution' : 'Drawing')}
        {v.description && fieldRow('Description', v.description)}
        {fieldRow('Amount', <span className="font-mono text-brass">{v.amount != null ? money(v.amount) : '—'}</span>)}
      </div>
    );
  }

  if (log.action === 'CREATE_FIXED_ASSET') {
    return (
      <div>
        {header}
        {v.name && fieldRow('Asset', v.name)}
        {fieldRow('Cost', <span className="font-mono text-brass">{v.cost != null ? money(v.cost) : '—'}</span>)}
        {v.notes && fieldRow('Notes', v.notes)}
      </div>
    );
  }

  if (log.action === 'TRANSFER_CASH') {
    return (
      <div>
        {header}
        {fieldRow('Amount', <span className="font-mono text-brass">{v.amount != null ? money(v.amount) : '—'}</span>)}
        {v.description && fieldRow('Note', v.description)}
      </div>
    );
  }

  // Fallback for every other action type: dump whatever fields were
  // actually captured, in a readable key/value list rather than raw JSON.
  const entries = Object.entries(v).filter(([, val]) => val !== null && val !== undefined && typeof val !== 'object');
  const objectEntries = Object.entries(v).filter(([, val]) => val && typeof val === 'object');
  return (
    <div>
      {header}
      {entries.length > 0 ? (
        entries.map(([key, val]) => fieldRow(key, String(val)))
      ) : (
        <p className="text-sm text-paper-dim">No further details were recorded for this action.</p>
      )}
      {objectEntries.map(([key, val]) => (
        <div key={key} className="mt-2">
          <div className="text-xs uppercase tracking-wide text-paper-dim mb-1">{key}</div>
          <pre className="text-xs text-paper-dim bg-ink-raised rounded-md p-2 overflow-x-auto">
            {JSON.stringify(val, null, 2)}
          </pre>
        </div>
      ))}
    </div>
  );
}

export function ActivityPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [date, setDate] = useState(() => localDateStr());
  const [allDates, setAllDates] = useState(false);
  const [selected, setSelected] = useState<AuditLogEntry | null>(null);

  function load() {
    setLoading(true);
    api
      .get('/audit-logs', allDates ? undefined : { params: { date } })
      .then((r) => setLogs(r.data))
      .finally(() => setLoading(false));
  }

  useEffect(load, [date, allDates]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter(
      (l) =>
        l.action.toLowerCase().includes(q) ||
        l.entityType.toLowerCase().includes(q) ||
        l.user?.name.toLowerCase().includes(q),
    );
  }, [logs, search]);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-paper">Activity</h1>
      <p className="text-sm text-paper-dim -mt-4">
        Every stock change, sale, payment, and edit made in the system — who did it and when. Click any entry for the
        full breakdown. Nothing here can be edited or removed; it's the record of what happened.
      </p>

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
            placeholder="Search by action, entity, or user…"
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
          {filtered.map((l) => {
            const amount = amountFor(l);
            return (
              <button
                key={l.id}
                onClick={() => setSelected(l)}
                className="ledger-row w-full flex items-center justify-between px-4 py-3 text-left hover:bg-panel transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-sm text-paper flex items-center gap-2">
                    {actionLabel(l.action)}
                    <Badge tone={TONE_FOR_ACTION[l.action] ?? 'neutral'}>{l.entityType}</Badge>
                  </div>
                  {overviewLine(l) && <div className="text-xs text-paper-dim mt-0.5 truncate">{overviewLine(l)}</div>}
                  <div className="text-xs text-paper-dim mt-0.5">
                    {l.user?.name ?? 'System'} · {formatDateTime(l.createdAt)}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 pl-3">
                  {amount != null && (
                    <span className={`font-mono text-sm ${l.action === 'VOID_SALE' ? 'text-copper' : 'text-brass'}`}>
                      {money(amount)}
                    </span>
                  )}
                  <ChevronRight size={15} className="text-paper-dim" />
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-sm text-paper-dim text-center py-8">
              {logs.length === 0 ? `No activity recorded for ${allDates ? 'any date' : date}.` : 'No activity matches your search.'}
            </p>
          )}
        </Card>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected ? actionLabel(selected.action) : ''} wide>
        {selected && <DetailBody log={selected} />}
      </Modal>
    </div>
  );
}
