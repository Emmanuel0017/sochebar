import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Trash2, Download } from 'lucide-react';
import { api } from '../../lib/api';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input, Label, Select } from '../../components/Input';
import { Modal } from '../../components/Modal';
import { PageLoader } from '../../components/Spinner';
import { useToast } from '../../components/Toast';
import { errorMessage } from '../../lib/errors';
import { formatMWK, formatDateTime, downloadBlob, localDateStr } from '../../lib/format';
import { useAuth } from '../../context/AuthContext';
import type { Customer, PaymentMethod, Product } from '../../types';

interface ItemDraft {
  productId: string;
  unitId: string;
  quantity: string;
  unitPrice: string;
}

export function CustomersPage() {
  const { user } = useAuth();
  const { push } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [lastActivity, setLastActivity] = useState<Record<string, string>>({});
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', address: '', creditLimit: '' });

  const [txnTarget, setTxnTarget] = useState<Customer | null>(null);
  const [txnBalance, setTxnBalance] = useState<number | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<any | null>(null);
  const [mode, setMode] = useState<'BILL' | 'PAYMENT'>('BILL');
  const [items, setItems] = useState<ItemDraft[]>([]);
  const [manualTotal, setManualTotal] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [billPaymentMethod, setBillPaymentMethod] = useState<PaymentMethod>('CASH');
  const [comment, setComment] = useState('');
  const [billDate, setBillDate] = useState(() => localDateStr());
  const [submitting, setSubmitting] = useState(false);
  const today = localDateStr();

  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'CASHIER';
  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  function load() {
    setLoading(true);
    Promise.all([api.get('/customers'), api.get('/customers/total-outstanding'), api.get('/products')]).then(
      async ([c, total, prods]) => {
        setCustomers(c.data);
        setTotalOutstanding(total.data.totalOutstanding);
        setProducts(prods.data);
        const pairs = await Promise.all(
          c.data.map((cust: Customer) => api.get(`/customers/${cust.id}/balance`).then((b) => [cust.id, b.data])),
        );
        setBalances(Object.fromEntries(pairs.map(([id, b]: any) => [id, b.outstanding])));
        setLastActivity(Object.fromEntries(pairs.map(([id, b]: any) => [id, b.lastActivityAt])));
        setLoading(false);
      },
    );
  }

  useEffect(load, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => c.name.toLowerCase().includes(q) || c.phone?.toLowerCase().includes(q));
  }, [customers, search]);

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllFiltered() {
    setSelectedIds((prev) => {
      const allSelected = filtered.length > 0 && filtered.every((c) => prev.has(c.id));
      if (allSelected) return new Set();
      return new Set(filtered.map((c) => c.id));
    });
  }

  async function exportCredit(scope: 'all' | 'selected') {
    setExporting(true);
    try {
      const ids = scope === 'selected' ? [...selectedIds] : undefined;
      const res = await api.get('/exports/customer-credit', {
        params: ids?.length ? { customerIds: ids.join(',') } : undefined,
        responseType: 'blob',
      });
      const label = scope === 'selected' ? `Selected_${ids!.length}` : 'All';
      downloadBlob(res.data, `Sochebar_Customer_Credit_${label}.xlsx`);
      push('Exported');
    } catch (err) {
      push(errorMessage(err), 'error');
    } finally {
      setExporting(false);
    }
  }

  function openNewCustomer() {
    setEditingCustomer(null);
    setForm({ name: '', phone: '', address: '', creditLimit: '' });
    setCustomerModalOpen(true);
  }

  function openEditCustomer(c: Customer) {
    setEditingCustomer(c);
    setForm({ name: c.name, phone: c.phone ?? '', address: c.address ?? '', creditLimit: c.creditLimit });
    setCustomerModalOpen(true);
  }

  async function saveCustomer() {
    try {
      const payload = { ...form, creditLimit: form.creditLimit ? Number(form.creditLimit) : undefined };
      if (editingCustomer) {
        await api.patch(`/customers/${editingCustomer.id}`, payload);
        push('Customer updated');
      } else {
        await api.post('/customers', payload);
        push('Customer added');
      }
      setCustomerModalOpen(false);
      load();
    } catch (err) {
      push(errorMessage(err), 'error');
    }
  }

  async function openTxnModal(c: Customer) {
    setTxnTarget(c);
    setMode('BILL');
    setItems([]);
    setManualTotal('');
    setPaymentAmount('');
    setBillPaymentMethod('CASH');
    setComment('');
    setBillDate(today);
    setHistory([]);
    setSelectedHistoryEntry(null);
    try {
      const { data } = await api.get(`/customers/${c.id}/balance`);
      setTxnBalance(data.outstanding);
    } catch {
      setTxnBalance(balances[c.id] ?? 0);
    }
    setHistoryLoading(true);
    try {
      const { data } = await api.get(`/customers/${c.id}/transactions`);
      setHistory(data);
    } finally {
      setHistoryLoading(false);
    }
  }

  function unitsFor(productId: string) {
    return products.find((p) => p.id === productId)?.units.filter((u) => u.isSaleUnit || u.isBaseUnit) ?? [];
  }

  function updateItem(idx: number, patch: Partial<ItemDraft>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  const itemsTotal = items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);
  const billTotal = items.length > 0 ? itemsTotal : Number(manualTotal) || 0;

  async function submitBill() {
    if (!txnTarget) return;
    setSubmitting(true);
    try {
      await api.post('/sales', {
        customerId: txnTarget.id,
        items: items
          .filter((it) => it.productId && it.unitId && it.quantity && it.unitPrice)
          .map((it) => ({
            productId: it.productId,
            unitId: it.unitId,
            quantity: Number(it.quantity),
            unitPrice: Number(it.unitPrice),
          })),
        manualTotal: items.length === 0 ? Number(manualTotal) : undefined,
        payments: [{ paymentMethod: 'CREDIT', amount: billTotal, comment: comment.trim() || undefined }],
        saleDate: billDate !== today ? billDate : undefined,
      });
      push(billDate !== today ? `Bill backdated to ${billDate}` : 'Bill added to tab');
      setTxnTarget(null);
      load();
    } catch (err) {
      push(errorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitPayment() {
    if (!txnTarget) return;
    setSubmitting(true);
    try {
      const base = `Paid via ${billPaymentMethod.replace('_', ' ')}`;
      await api.post(`/customers/${txnTarget.id}/payment`, {
        amount: Number(paymentAmount),
        description: comment.trim() ? `${base} — ${comment.trim()}` : base,
      });
      push('Payment recorded');
      setTxnTarget(null);
      load();
    } catch (err) {
      push(errorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-2xl text-paper">Customers</h1>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-paper-dim">Total owed to us</div>
            <div className="font-mono text-lg text-copper">{formatMWK(totalOutstanding)}</div>
          </div>
          {canEdit && (
            <Button onClick={openNewCustomer}>
              <span className="flex items-center gap-1.5">
                <Plus size={15} /> New customer
              </span>
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-paper-dim" />
          <Input placeholder="Search customers…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <Button variant="secondary" onClick={() => exportCredit('selected')} disabled={exporting}>
                <span className="flex items-center gap-1.5">
                  <Download size={14} /> Export selected ({selectedIds.size})
                </span>
              </Button>
            )}
            <Button variant="secondary" onClick={() => exportCredit('all')} disabled={exporting}>
              <span className="flex items-center gap-1.5">
                <Download size={14} /> {exporting ? 'Exporting…' : 'Export all to Excel'}
              </span>
            </Button>
          </div>
        )}
      </div>

      <Card>
        {canEdit && filtered.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 border-b border-panel-border">
            <input
              type="checkbox"
              checked={filtered.length > 0 && filtered.every((c) => selectedIds.has(c.id))}
              onChange={toggleSelectAllFiltered}
              className="accent-brass"
            />
            <span className="text-xs text-paper-dim">Select all {search ? 'matching' : ''} customers to export</span>
          </div>
        )}
        {filtered.map((c) => (
          <div key={c.id} className="ledger-row flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              {canEdit && (
                <input
                  type="checkbox"
                  checked={selectedIds.has(c.id)}
                  onChange={() => toggleSelected(c.id)}
                  className="accent-brass shrink-0"
                />
              )}
              <button
                className="text-left min-w-0"
                onClick={() => canEdit && openEditCustomer(c)}
                disabled={!canEdit}
              >
                <div className="text-sm text-paper">{c.name}</div>
                <div className="text-xs text-paper-dim">{c.phone ?? '—'} · limit {formatMWK(c.creditLimit)}</div>
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs text-paper-dim">Owes</div>
                <div className={`font-mono text-sm ${(balances[c.id] ?? 0) > 0 ? 'text-copper' : 'text-ledger'}`}>
                  {formatMWK(balances[c.id] ?? 0)}
                </div>
                {lastActivity[c.id] && (
                  <div className="text-[11px] text-paper-dim mt-0.5">Modified {formatDateTime(lastActivity[c.id])}</div>
                )}
              </div>
              {canManage && (
                <Button variant="secondary" onClick={() => openTxnModal(c)}>
                  Bill / Payment
                </Button>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-paper-dim text-center py-8">
            {customers.length === 0 ? 'No customers yet.' : 'No customers match your search.'}
          </p>
        )}
      </Card>

      <Modal open={customerModalOpen} onClose={() => setCustomerModalOpen(false)} title={editingCustomer ? 'Edit customer' : 'New customer'}>
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <Label>Address</Label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div>
            <Label>Credit limit (MWK)</Label>
            <Input type="number" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: e.target.value })} />
          </div>
          <Button className="w-full" onClick={saveCustomer} disabled={!form.name}>
            {editingCustomer ? 'Save changes' : 'Add customer'}
          </Button>
        </div>
      </Modal>

      <Modal open={!!txnTarget} onClose={() => setTxnTarget(null)} title={txnTarget?.name ?? ''} wide>
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-ink-raised border border-panel-border rounded-md px-4 py-3">
            <span className="text-sm text-paper-dim">Current balance</span>
            <span className={`font-mono text-xl ${(txnBalance ?? 0) > 0 ? 'text-copper' : 'text-ledger'}`}>
              {formatMWK(txnBalance ?? 0)}
            </span>
          </div>

          <div className="flex gap-1 bg-ink-raised border border-panel-border rounded-md p-1">
            <button
              onClick={() => setMode('BILL')}
              className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors ${
                mode === 'BILL' ? 'bg-copper/20 text-copper' : 'text-paper-dim hover:text-paper'
              }`}
            >
              Add bill (they owe more)
            </button>
            <button
              onClick={() => setMode('PAYMENT')}
              className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors ${
                mode === 'PAYMENT' ? 'bg-ledger/20 text-ledger' : 'text-paper-dim hover:text-paper'
              }`}
            >
              Record payment (they paid us)
            </button>
          </div>

          {history.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-wide text-paper-dim mb-1.5">History</div>
              <div className="max-h-52 overflow-y-auto space-y-1 bg-ink-raised border border-panel-border rounded-md p-1.5">
                {history.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => setSelectedHistoryEntry(h)}
                    className="w-full flex items-start justify-between text-xs gap-2 text-left px-2 py-1.5 rounded hover:bg-panel transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-paper truncate">
                        {h.transactionType === 'CREDIT_SALE' ? 'Bill' : h.transactionType === 'PAYMENT' ? 'Payment' : 'Adjustment'}
                        {h.items?.length > 0 && (
                          <span className="text-paper-dim">
                            {' '}
                            — {h.items.slice(0, 3).map((i: any) => `${i.product} x${i.quantity}`).join(', ')}
                            {h.items.length > 3 ? ` +${h.items.length - 3} more` : ''}
                          </span>
                        )}
                      </div>
                      <div className="text-paper-dim">{formatDateTime(h.createdAt)}</div>
                    </div>
                    <span className={`font-mono shrink-0 ${h.transactionType === 'PAYMENT' ? 'text-ledger' : 'text-copper'}`}>
                      {h.transactionType === 'PAYMENT' ? '−' : '+'}
                      {formatMWK(h.amount)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {historyLoading && <p className="text-xs text-paper-dim">Loading history…</p>}

          {mode === 'BILL' ? (
            <div className="space-y-3">
              <div>
                <Label>Date this bill was taken</Label>
                <Input type="date" value={billDate} max={today} onChange={(e) => setBillDate(e.target.value)} />
                {billDate !== today && (
                  <p className="text-xs text-brass bg-brass/10 border border-brass/30 rounded-md px-3 py-2 mt-2">
                    Recording this bill for {billDate} — it'll show and filter under that day's records, not today's.
                  </p>
                )}
              </div>
              <div>
                <Label>Items (optional — leave blank to just enter a total)</Label>
                <div className="space-y-2">
                  {items.map((it, idx) => (
                    <div key={idx} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 items-end">
                      <Select value={it.productId} onChange={(e) => updateItem(idx, { productId: e.target.value, unitId: '' })}>
                        <option value="">Product…</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </Select>
                      <Select value={it.unitId} onChange={(e) => updateItem(idx, { unitId: e.target.value })} disabled={!it.productId}>
                        <option value="">Unit…</option>
                        {unitsFor(it.productId).map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </Select>
                      <Input type="number" placeholder="Qty" value={it.quantity} onChange={(e) => updateItem(idx, { quantity: e.target.value })} />
                      <Input
                        type="number"
                        placeholder="Price"
                        value={it.unitPrice}
                        onChange={(e) => updateItem(idx, { unitPrice: e.target.value })}
                      />
                      <button
                        onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-paper-dim hover:text-copper pb-2"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  className="text-xs text-brass hover:text-brass-soft mt-2"
                  onClick={() => setItems((prev) => [...prev, { productId: '', unitId: '', quantity: '', unitPrice: '' }])}
                >
                  + Add another item
                </button>
              </div>

              {items.length === 0 && (
                <div>
                  <Label>Total amount (MWK)</Label>
                  <Input type="number" value={manualTotal} onChange={(e) => setManualTotal(e.target.value)} />
                </div>
              )}

              <div>
                <Label>Comment (optional)</Label>
                <Input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="e.g. paid half now, rest Friday…"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-panel-border">
                <span className="text-sm text-paper-dim">New balance will be</span>
                <span className="font-mono text-lg text-copper">{formatMWK((txnBalance ?? 0) + billTotal)}</span>
              </div>

              <Button className="w-full" variant="danger" onClick={submitBill} disabled={submitting || billTotal <= 0}>
                {submitting ? 'Adding…' : `Add bill of ${formatMWK(billTotal)}`}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label>Amount paid (MWK)</Label>
                <Input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} autoFocus />
              </div>
              <div>
                <Label>Received via</Label>
                <Select value={billPaymentMethod} onChange={(e) => setBillPaymentMethod(e.target.value as PaymentMethod)}>
                  <option value="CASH">Cash</option>
                  <option value="AIRTEL_MONEY">Airtel Money</option>
                  <option value="MPAMBA">Mpamba</option>
                  <option value="BANK">Bank</option>
                  <option value="OTHER">Other</option>
                </Select>
              </div>
              <div>
                <Label>Comment (optional)</Label>
                <Input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="e.g. via John on his behalf…"
                />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-panel-border">
                <span className="text-sm text-paper-dim">New balance will be</span>
                <span className="font-mono text-lg text-ledger">
                  {formatMWK((txnBalance ?? 0) - (Number(paymentAmount) || 0))}
                </span>
              </div>
              <Button className="w-full" onClick={submitPayment} disabled={submitting || !paymentAmount}>
                {submitting ? 'Recording…' : `Record payment of ${formatMWK(Number(paymentAmount) || 0)}`}
              </Button>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={!!selectedHistoryEntry}
        onClose={() => setSelectedHistoryEntry(null)}
        title={
          selectedHistoryEntry
            ? selectedHistoryEntry.transactionType === 'CREDIT_SALE'
              ? 'Bill'
              : selectedHistoryEntry.transactionType === 'PAYMENT'
                ? 'Payment'
                : 'Adjustment'
            : ''
        }
      >
        {selectedHistoryEntry && (
          <div className="space-y-3">
            <div className="flex items-center justify-between py-1.5 border-b border-panel-border">
              <span className="text-xs text-paper-dim">When</span>
              <span className="text-sm text-paper">{formatDateTime(selectedHistoryEntry.createdAt)}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-panel-border">
              <span className="text-xs text-paper-dim">Amount</span>
              <span
                className={`font-mono text-sm ${selectedHistoryEntry.transactionType === 'PAYMENT' ? 'text-ledger' : 'text-copper'}`}
              >
                {formatMWK(selectedHistoryEntry.amount)}
              </span>
            </div>
            {selectedHistoryEntry.description && (
              <div className="flex items-center justify-between py-1.5 border-b border-panel-border">
                <span className="text-xs text-paper-dim">Note</span>
                <span className="text-sm text-paper text-right">{selectedHistoryEntry.description}</span>
              </div>
            )}

            {selectedHistoryEntry.items?.length > 0 && (
              <div>
                <div className="text-xs uppercase tracking-wide text-paper-dim mb-1.5">Products billed</div>
                <div className="rounded-md border border-panel-border overflow-hidden">
                  <div className="grid grid-cols-[2fr_1fr_1fr] gap-2 px-3 py-2 text-xs uppercase tracking-wide text-paper-dim bg-ink-raised">
                    <span>Product</span>
                    <span className="text-right">Qty</span>
                    <span className="text-right">Total</span>
                  </div>
                  {selectedHistoryEntry.items.map((it: any, idx: number) => (
                    <div key={idx} className="ledger-row grid grid-cols-[2fr_1fr_1fr] gap-2 px-3 py-2 items-center">
                      <span className="text-sm text-paper">{it.product}</span>
                      <span className="font-mono text-sm text-right text-paper-dim">{it.quantity}</span>
                      <span className="font-mono text-sm text-right">{formatMWK(it.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
