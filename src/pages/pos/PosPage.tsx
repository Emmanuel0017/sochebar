import { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Minus, Trash2, X } from 'lucide-react';
import { api } from '../../lib/api';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input, Select, Label } from '../../components/Input';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { errorMessage } from '../../lib/errors';
import { formatMWK, localDateStr } from '../../lib/format';
import type { Customer, PaymentMethod, Product } from '../../types';

interface CartLine {
  productId: string;
  productName: string;
  unitId: string;
  unitName: string;
  quantity: number;
  unitPrice: number;
}

interface PaymentLine {
  paymentMethod: PaymentMethod;
  amount: number;
  customerId?: string;
  comment?: string;
}

const METHODS: PaymentMethod[] = ['CASH', 'AIRTEL_MONEY', 'MPAMBA', 'BANK', 'CREDIT', 'OTHER'];

export function PosPage() {
  const { push } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [payments, setPayments] = useState<PaymentLine[]>([{ paymentMethod: 'CASH', amount: 0 }]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [saleDate, setSaleDate] = useState(() => localDateStr());
  const today = localDateStr();

  useEffect(() => {
    api.get('/products', { params: { isActive: true } }).then((r) => setProducts(r.data));
    api.get('/customers').then((r) => setCustomers(r.data));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.barcode?.includes(q),
    );
  }, [products, search]);

  const total = useMemo(() => cart.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0), [cart]);
  const paidTotal = useMemo(() => payments.reduce((sum, p) => sum + (p.amount || 0), 0), [payments]);

  async function addToCart(product: Product) {
    const saleUnit = product.units.find((u) => u.isSaleUnit) ?? product.units[0];
    if (!saleUnit) {
      push(`${product.name} has no sale unit configured`, 'error');
      return;
    }
    try {
      const { data: price } = await api.get(`/products/${product.id}/prices`);
      const active = price.find((p: any) => p.unitId === saleUnit.id && !p.effectiveTo) ?? price[0];
      const unitPrice = active ? Number(active.price) : 0;

      setCart((prev) => {
        const existing = prev.find((l) => l.productId === product.id && l.unitId === saleUnit.id);
        if (existing) {
          return prev.map((l) => (l === existing ? { ...l, quantity: l.quantity + 1 } : l));
        }
        return [
          ...prev,
          {
            productId: product.id,
            productName: product.name,
            unitId: saleUnit.id,
            unitName: saleUnit.name,
            quantity: 1,
            unitPrice,
          },
        ];
      });
    } catch {
      push('Could not load price for this product', 'error');
    }
  }

  function updateQty(idx: number, delta: number) {
    setCart((prev) =>
      prev
        .map((l, i) => (i === idx ? { ...l, quantity: Math.max(0, l.quantity + delta) } : l))
        .filter((l) => l.quantity > 0),
    );
  }

  function removeLine(idx: number) {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  }

  function openCheckout() {
    if (cart.length === 0) return;
    setPayments([{ paymentMethod: 'CASH', amount: total }]);
    setCheckoutOpen(true);
  }

  function updatePayment(idx: number, patch: Partial<PaymentLine>) {
    setPayments((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  }

  async function completeSale() {
    setSubmitting(true);
    try {
      await api.post('/sales', {
        items: cart.map((l) => ({
          productId: l.productId,
          unitId: l.unitId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
        })),
        payments: payments
          .filter((p) => p.amount > 0)
          .map((p) => ({
            paymentMethod: p.paymentMethod,
            amount: p.amount,
            customerId: p.paymentMethod === 'CREDIT' ? p.customerId : undefined,
            comment: p.comment || undefined,
          })),
        saleDate: saleDate !== today ? saleDate : undefined,
      });
      push(saleDate !== today ? `Backdated sale recorded for ${saleDate}` : 'Sale completed');
      setCart([]);
      setCheckoutOpen(false);
      setSaleDate(today);
    } catch (err) {
      push(errorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  }

  // Every CREDIT line needs its own customer picked - this is what lets one
  // sale be split across several customers' tabs instead of just one.
  const creditLinesMissingCustomer = payments.some(
    (p) => p.paymentMethod === 'CREDIT' && p.amount > 0 && !p.customerId,
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 h-[calc(100vh-3rem)]">
      <div className="flex flex-col min-h-0">
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-paper-dim" />
          <Input
            placeholder="Search product, SKU, or barcode…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>
        <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 content-start pb-4">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => addToCart(p)}
              className="text-left bg-panel border border-panel-border rounded-lg p-3 hover:border-brass/60 transition-colors"
            >
              <div className="text-xs text-paper-dim mb-1">{p.category?.name ?? 'Uncategorized'}</div>
              <div className="text-sm text-paper font-medium leading-snug">{p.name}</div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center text-paper-dim text-sm py-12">No products match your search.</div>
          )}
        </div>
      </div>

      <Card className="flex flex-col min-h-0">
        <div className="px-4 py-3 border-b border-panel-border">
          <div className="text-xs uppercase tracking-wide text-paper-dim">Current sale</div>
        </div>
        <div className="flex-1 overflow-y-auto px-4">
          {cart.length === 0 ? (
            <p className="text-sm text-paper-dim py-8 text-center">Tap a product to add it to the sale.</p>
          ) : (
            cart.map((line, idx) => (
              <div key={idx} className="ledger-row py-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm text-paper">{line.productName}</div>
                    <div className="text-xs text-paper-dim font-mono">
                      {formatMWK(line.unitPrice)} / {line.unitName}
                    </div>
                  </div>
                  <button onClick={() => removeLine(idx)} className="text-paper-dim hover:text-copper">
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQty(idx, -1)}
                      className="w-6 h-6 flex items-center justify-center rounded bg-ink-raised border border-panel-border text-paper hover:border-brass/50"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="font-mono text-sm w-6 text-center">{line.quantity}</span>
                    <button
                      onClick={() => updateQty(idx, 1)}
                      className="w-6 h-6 flex items-center justify-center rounded bg-ink-raised border border-panel-border text-paper hover:border-brass/50"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  <div className="font-mono text-sm text-paper">{formatMWK(line.quantity * line.unitPrice)}</div>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="px-4 py-4 border-t border-panel-border">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-paper-dim">Total</span>
            <span className="font-mono text-2xl text-brass">{formatMWK(total)}</span>
          </div>
          <Button className="w-full" onClick={openCheckout} disabled={cart.length === 0}>
            Charge {formatMWK(total)}
          </Button>
        </div>
      </Card>

      <Modal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} title="Take payment">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-paper-dim">Amount due</span>
            <span className="font-mono text-xl text-paper">{formatMWK(total)}</span>
          </div>

          <div>
            <Label>Sale date</Label>
            <Input type="date" value={saleDate} max={today} onChange={(e) => setSaleDate(e.target.value)} />
            {saleDate !== today && (
              <p className="text-xs text-brass bg-brass/10 border border-brass/30 rounded-md px-3 py-2 mt-2">
                Recording this as a past sale for {saleDate}. It won't be added to today's open cash session — only
                to that day's records and reports.
              </p>
            )}
          </div>

          <div className="space-y-2">
            {payments.map((p, idx) => (
              <div key={idx} className="space-y-2 pb-2 border-b border-panel-border/60 last:border-0">
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label>Method</Label>
                    <Select
                      value={p.paymentMethod}
                      onChange={(e) =>
                        updatePayment(idx, {
                          paymentMethod: e.target.value as PaymentMethod,
                          customerId: e.target.value === 'CREDIT' ? p.customerId : undefined,
                        })
                      }
                    >
                      {METHODS.map((m) => (
                        <option key={m} value={m}>
                          {m.replace('_', ' ')}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="w-32">
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      value={p.amount}
                      onChange={(e) => updatePayment(idx, { amount: Number(e.target.value) })}
                    />
                  </div>
                  {payments.length > 1 && (
                    <button
                      onClick={() => setPayments((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-paper-dim hover:text-copper pb-2"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                {p.paymentMethod === 'CREDIT' && (
                  <div>
                    <Label>Customer to credit</Label>
                    <Select value={p.customerId ?? ''} onChange={(e) => updatePayment(idx, { customerId: e.target.value })}>
                      <option value="">Select customer…</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
              </div>
            ))}
            <button
              onClick={() => setPayments((prev) => [...prev, { paymentMethod: 'CASH', amount: 0 }])}
              className="text-xs text-brass hover:text-brass-soft"
            >
              + Split payment
            </button>
            <p className="text-xs text-paper-dim">
              Splitting into more than one Credit line lets you bill this sale to more than one customer at once —
              e.g. two people at a table each covering half.
            </p>
          </div>

          <div className="flex items-center justify-between text-sm pt-2 border-t border-panel-border">
            <span className="text-paper-dim">Received</span>
            <span className={`font-mono ${paidTotal >= total ? 'text-ledger' : 'text-copper'}`}>
              {formatMWK(paidTotal)}
            </span>
          </div>

          <Button
            className="w-full"
            onClick={completeSale}
            disabled={submitting || paidTotal < total - 0.01 || creditLinesMissingCustomer}
          >
            {submitting ? 'Processing…' : 'Complete sale'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
