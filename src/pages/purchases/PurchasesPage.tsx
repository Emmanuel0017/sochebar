import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Input, Label, Select } from '../../components/Input';
import { Modal } from '../../components/Modal';
import { PageLoader } from '../../components/Spinner';
import { useToast } from '../../components/Toast';
import { errorMessage } from '../../lib/errors';
import { formatMWK, formatDate } from '../../lib/format';
import { useAuth } from '../../context/AuthContext';
import type { Product, Purchase, Supplier } from '../../types';

interface ItemDraft {
  productId: string;
  unitId: string;
  quantity: string;
  unitCost: string;
}

export function PurchasesPage() {
  const { push } = useToast();
  const { user } = useAuth();
  // Storekeepers can see purchase history for their own reference, but
  // recording a new purchase is now Admin/Manager only.
  const canRecord = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [items, setItems] = useState<ItemDraft[]>([{ productId: '', unitId: '', quantity: '', unitCost: '' }]);
  const [amountPaidNow, setAmountPaidNow] = useState('');

  function load() {
    setLoading(true);
    Promise.all([api.get('/purchases'), api.get('/suppliers'), api.get('/products')])
      .then(([p, s, pr]) => {
        setPurchases(p.data);
        setSuppliers(s.data);
        setProducts(pr.data);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return purchases;
    return purchases.filter(
      (p) =>
        (p.supplier?.name ?? 'no supplier').toLowerCase().includes(q) ||
        p.invoiceNumber?.toLowerCase().includes(q) ||
        p.items?.some((it) => it.product?.name?.toLowerCase().includes(q)),
    );
  }, [purchases, search]);

  function updateItem(idx: number, patch: Partial<ItemDraft>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function unitsFor(productId: string) {
    return products.find((p) => p.id === productId)?.units.filter((u) => u.isPurchaseUnit || u.isBaseUnit) ?? [];
  }

  const total = items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitCost) || 0), 0);

  async function submit() {
    try {
      await api.post('/purchases', {
        supplierId: supplierId || undefined,
        invoiceNumber: invoiceNumber || undefined,
        items: items
          .filter((it) => it.productId && it.unitId && it.quantity && it.unitCost)
          .map((it) => ({
            productId: it.productId,
            unitId: it.unitId,
            quantity: Number(it.quantity),
            unitCost: Number(it.unitCost),
          })),
        amountPaidNow: amountPaidNow ? Number(amountPaidNow) : undefined,
      });
      push('Purchase received — stock updated');
      setModalOpen(false);
      setSupplierId('');
      setInvoiceNumber('');
      setItems([{ productId: '', unitId: '', quantity: '', unitCost: '' }]);
      setAmountPaidNow('');
      load();
    } catch (err) {
      push(errorMessage(err), 'error');
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-paper">Purchases</h1>
        {canRecord && (
          <Button onClick={() => setModalOpen(true)}>
            <span className="flex items-center gap-1.5">
              <Plus size={15} /> Receive stock
            </span>
          </Button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-paper-dim" />
        <Input
          placeholder="Search supplier, invoice, or product…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        {filtered.map((p) => (
          <div key={p.id} className="ledger-row flex items-center justify-between px-4 py-3">
            <div>
              <div className="text-sm text-paper">{p.supplier?.name ?? 'No supplier'}</div>
              <div className="text-xs text-paper-dim">
                {p.invoiceNumber ?? 'No invoice #'} · {formatDate(p.purchaseDate)} · {p.items?.length ?? 0} items
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-paper">{formatMWK(p.total)}</span>
              <Badge tone={p.paymentStatus === 'PAID' ? 'ok' : p.paymentStatus === 'PARTIAL' ? 'warn' : 'danger'}>
                {p.paymentStatus}
              </Badge>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-paper-dim text-center py-8">
            {purchases.length === 0 ? 'No purchases yet.' : 'No purchases match your search.'}
          </p>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Receive stock" wide>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Supplier (optional)</Label>
              <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">No supplier / one-off purchase</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Invoice number (optional)</Label>
              <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
            </div>
          </div>

          {!supplierId && (
            <p className="text-xs text-paper-dim bg-ink-raised border border-panel-border rounded-md px-3 py-2">
              No supplier selected — this purchase will be recorded as paid in full immediately, since there's no
              supplier account to track a balance against.
            </p>
          )}

          <div>
            <Label>Items</Label>
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
                  <Input type="number" placeholder="Unit cost" value={it.unitCost} onChange={(e) => updateItem(idx, { unitCost: e.target.value })} />
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
              onClick={() => setItems((prev) => [...prev, { productId: '', unitId: '', quantity: '', unitCost: '' }])}
            >
              + Add line
            </button>
          </div>

          {supplierId && (
            <div>
              <Label>Amount paid now (optional)</Label>
              <Input type="number" value={amountPaidNow} onChange={(e) => setAmountPaidNow(e.target.value)} />
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-panel-border">
            <span className="text-sm text-paper-dim">Total</span>
            <span className="font-mono text-xl text-brass">{formatMWK(total)}</span>
          </div>

          <Button className="w-full" onClick={submit} disabled={total === 0}>
            Receive stock
          </Button>
        </div>
      </Modal>
    </div>
  );
}
