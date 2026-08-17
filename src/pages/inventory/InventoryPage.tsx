import { useEffect, useState } from 'react';
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

const TABS = ['Stock levels', 'Adjustments', 'Wastage'] as const;
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
    </div>
  );
}

function StockLevels() {
  const [stock, setStock] = useState<StockSummaryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/stock-alerts').then((r) => {
      setStock(r.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <PageLoader />;

  return (
    <Card>
      {stock.map((s) => (
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
      {stock.length === 0 && <p className="text-sm text-paper-dim text-center py-8">No tracked products.</p>}
    </Card>
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
