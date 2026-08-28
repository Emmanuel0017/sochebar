import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { api } from '../../lib/api';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Input, Label, Select } from '../../components/Input';
import { Modal } from '../../components/Modal';
import { PageLoader } from '../../components/Spinner';
import { useToast } from '../../components/Toast';
import { errorMessage } from '../../lib/errors';
import type { Product, StockSummaryEntry } from '../../types';

const TABS = ['Stock levels', 'Adjustments', 'Wastage', 'Empty bottles'] as const;
type Tab = (typeof TABS)[number];

export function InventoryPage() {
  const [tab, setTab] = useState<Tab>('Stock levels');

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-paper">Inventory</h1>
      <div className="flex gap-1 border-b border-panel-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
              tab === t ? 'border-brass text-brass' : 'border-transparent text-paper-dim hover:text-paper'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === 'Stock levels' && <StockLevels />}
      {tab === 'Adjustments' && <Adjustments />}
      {tab === 'Wastage' && <Wastage />}
      {tab === 'Empty bottles' && <EmptyBottles />}
    </div>
  );
}

function StockLevels() {
  const [stock, setStock] = useState<StockSummaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/dashboard/stock-alerts').then((r) => {
      setStock(r.data);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return stock;
    return stock.filter((s) => s.name.toLowerCase().includes(q));
  }, [stock, search]);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-paper-dim" />
        <Input placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>
      <Card>
        {filtered.map((s) => (
          <div key={s.productId} className="ledger-row flex items-center justify-between px-4 py-3">
            <span className="text-sm text-paper">{s.name}</span>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-paper-dim">
                {s.stock} {s.baseUnit}
              </span>
              <Badge tone={s.status === 'OUT_OF_STOCK' ? 'danger' : s.status === 'LOW' ? 'warn' : 'ok'}>
                {s.status === 'OUT_OF_STOCK' ? 'Out of stock' : s.status === 'LOW' ? 'Low' : 'OK'}
              </Badge>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-paper-dim text-center py-8">
            {stock.length === 0 ? 'No tracked products.' : 'No products match your search.'}
          </p>
        )}
      </Card>
    </div>
  );
}

const ADJUSTMENT_REASONS = ['COUNT_CORRECTION', 'UNRECORDED_STOCK', 'LOST', 'FOUND', 'OTHER'];

function Adjustments() {
  const { push } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ productId: '', unitId: '', physicalQuantity: '', reason: 'COUNT_CORRECTION', notes: '' });

  function load() {
    api.get('/inventory/adjustments/all').then((r) => setRows(r.data));
  }

  useEffect(() => {
    load();
    api.get('/products').then((r) => setProducts(r.data));
  }, []);

  const selectedProduct = products.find((p) => p.id === form.productId);

  async function submit() {
    try {
      await api.post('/inventory/adjustments', {
        productId: form.productId,
        unitId: form.unitId,
        physicalQuantity: Number(form.physicalQuantity),
        reason: form.reason,
        notes: form.notes || undefined,
      });
      push('Adjustment recorded');
      setModalOpen(false);
      setForm({ productId: '', unitId: '', physicalQuantity: '', reason: 'COUNT_CORRECTION', notes: '' });
      load();
    } catch (err) {
      push(errorMessage(err), 'error');
    }
  }

  async function approve(id: string) {
    try {
      await api.patch(`/inventory/adjustments/${id}/approve`);
      push('Adjustment approved');
      load();
    } catch (err) {
      push(errorMessage(err), 'error');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setModalOpen(true)}>New adjustment</Button>
      </div>
      <Card>
        {rows.map((r) => (
          <div key={r.id} className="ledger-row flex items-center justify-between px-4 py-3">
            <div>
              <div className="text-sm text-paper">{r.product?.name}</div>
              <div className="text-xs text-paper-dim">
                {r.reason} · system {r.systemQuantity} → physical {r.physicalQuantity} (diff {r.difference})
              </div>
            </div>
            {r.approvedById ? (
              <Badge tone="ok">Approved</Badge>
            ) : (
              <Button variant="secondary" onClick={() => approve(r.id)}>
                Approve
              </Button>
            )}
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-paper-dim text-center py-8">No adjustments recorded.</p>}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New stock adjustment">
        <div className="space-y-3">
          <div>
            <Label>Product</Label>
            <Select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value, unitId: '' })}>
              <option value="">Select product…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Unit</Label>
            <Select value={form.unitId} onChange={(e) => setForm({ ...form, unitId: e.target.value })} disabled={!selectedProduct}>
              <option value="">Select unit…</option>
              {(selectedProduct?.units ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Physical count (in selected unit)</Label>
            <Input type="number" value={form.physicalQuantity} onChange={(e) => setForm({ ...form, physicalQuantity: e.target.value })} />
          </div>
          <div>
            <Label>Reason</Label>
            <Select value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}>
              {ADJUSTMENT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r.replace('_', ' ')}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Notes</Label>
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <Button className="w-full" onClick={submit} disabled={!form.productId || !form.unitId || form.physicalQuantity === ''}>
            Submit adjustment
          </Button>
        </div>
      </Modal>
    </div>
  );
}

const WASTAGE_REASONS = ['BROKEN', 'SPOILED', 'SPILLED', 'EXPIRED', 'STAFF_CONSUMPTION', 'OTHER'];

function Wastage() {
  const { push } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ productId: '', unitId: '', quantity: '', reason: 'BROKEN', description: '' });

  function load() {
    api.get('/inventory/wastage/all').then((r) => setRows(r.data));
  }

  useEffect(() => {
    load();
    api.get('/products').then((r) => setProducts(r.data));
  }, []);

  const selectedProduct = products.find((p) => p.id === form.productId);

  async function submit() {
    try {
      await api.post('/inventory/wastage', {
        productId: form.productId,
        unitId: form.unitId,
        quantity: Number(form.quantity),
        reason: form.reason,
        description: form.description || undefined,
      });
      push('Wastage recorded');
      setModalOpen(false);
      setForm({ productId: '', unitId: '', quantity: '', reason: 'BROKEN', description: '' });
      load();
    } catch (err) {
      push(errorMessage(err), 'error');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setModalOpen(true)}>Record wastage</Button>
      </div>
      <Card>
        {rows.map((r) => (
          <div key={r.id} className="ledger-row flex items-center justify-between px-4 py-3">
            <div>
              <div className="text-sm text-paper">{r.product?.name}</div>
              <div className="text-xs text-paper-dim">
                {r.reason} · {r.quantity} {r.unit?.name}
              </div>
            </div>
            <Badge tone={r.approvedById ? 'ok' : 'warn'}>{r.approvedById ? 'Approved' : 'Pending'}</Badge>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-paper-dim text-center py-8">No wastage recorded.</p>}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Record wastage">
        <div className="space-y-3">
          <div>
            <Label>Product</Label>
            <Select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value, unitId: '' })}>
              <option value="">Select product…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Unit</Label>
            <Select value={form.unitId} onChange={(e) => setForm({ ...form, unitId: e.target.value })} disabled={!selectedProduct}>
              <option value="">Select unit…</option>
              {(selectedProduct?.units ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Quantity</Label>
            <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          </div>
          <div>
            <Label>Reason</Label>
            <Select value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}>
              {WASTAGE_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r.replace('_', ' ')}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Description</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <Button className="w-full" onClick={submit} disabled={!form.productId || !form.unitId || !form.quantity}>
            Submit
          </Button>
        </div>
      </Modal>
    </div>
  );
}

const EMPTY_BOTTLE_TYPES = ['COLLECTED', 'RETURNED_TO_SUPPLIER', 'BROKEN', 'ADJUSTMENT'] as const;

function EmptyBottles() {
  const { push } = useToast();
  const [rows, setRows] = useState<{ productId: string; name: string; count: number }[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ productId: '', transactionType: 'COLLECTED' as (typeof EMPTY_BOTTLE_TYPES)[number], quantity: '', notes: '' });

  function load() {
    setLoading(true);
    Promise.all([api.get('/empty-bottles'), api.get('/products')])
      .then(([r, p]) => {
        setRows(r.data);
        setProducts(p.data.filter((prod: Product) => prod.tracksEmptyBottles));
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function submit() {
    try {
      await api.post('/empty-bottles', {
        productId: form.productId,
        transactionType: form.transactionType,
        quantity: Number(form.quantity),
        notes: form.notes || undefined,
      });
      push('Empty bottle transaction recorded');
      setModalOpen(false);
      setForm({ productId: '', transactionType: 'COLLECTED', quantity: '', notes: '' });
      load();
    } catch (err) {
      push(errorMessage(err), 'error');
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      {products.length === 0 && (
        <p className="text-sm text-paper-dim bg-ink-raised border border-panel-border rounded-md px-4 py-3">
          No products are set to track empty bottles yet. Enable "Track empty bottles" when editing a product on the
          Products page.
        </p>
      )}
      <div className="flex justify-end">
        <Button onClick={() => setModalOpen(true)} disabled={products.length === 0}>
          Log empty bottles
        </Button>
      </div>
      <Card>
        {rows.map((r) => (
          <div key={r.productId} className="ledger-row flex items-center justify-between px-4 py-3">
            <span className="text-sm text-paper">{r.name}</span>
            <span className="font-mono text-sm text-paper-dim">{r.count} on hand</span>
          </div>
        ))}
        {rows.length === 0 && products.length > 0 && (
          <p className="text-sm text-paper-dim text-center py-8">No empty bottle activity recorded yet.</p>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Log empty bottles">
        <div className="space-y-3">
          <div>
            <Label>Product</Label>
            <Select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
              <option value="">Select product…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Type</Label>
            <Select value={form.transactionType} onChange={(e) => setForm({ ...form, transactionType: e.target.value as any })}>
              <option value="COLLECTED">Collected (empties came back to the bar)</option>
              <option value="RETURNED_TO_SUPPLIER">Returned to supplier (for deposit)</option>
              <option value="BROKEN">Broken</option>
              <option value="ADJUSTMENT">Adjustment (recount — enter signed difference)</option>
            </Select>
          </div>
          <div>
            <Label>{form.transactionType === 'ADJUSTMENT' ? 'Difference (can be negative)' : 'Quantity'}</Label>
            <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          </div>
          <div>
            <Label>Notes</Label>
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <Button className="w-full" onClick={submit} disabled={!form.productId || !form.quantity}>
            Submit
          </Button>
        </div>
      </Modal>
    </div>
  );
}
