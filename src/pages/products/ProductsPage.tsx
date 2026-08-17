import { useEffect, useState } from 'react';
import { Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../../lib/api';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input, Label, Select } from '../../components/Input';
import { Modal } from '../../components/Modal';
import { PageLoader } from '../../components/Spinner';
import { useToast } from '../../components/Toast';
import { errorMessage } from '../../lib/errors';
import { formatMWK } from '../../lib/format';
import type { Category, Product } from '../../types';

export function ProductsPage() {
  const { push } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', categoryId: '', sku: '', barcode: '' });

  function load() {
    setLoading(true);
    Promise.all([api.get('/products'), api.get('/categories')])
      .then(([p, c]) => {
        setProducts(p.data);
        setCategories(c.data);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function createProduct() {
    try {
      await api.post('/products', {
        name: form.name,
        categoryId: form.categoryId || undefined,
        sku: form.sku || undefined,
        barcode: form.barcode || undefined,
      });
      push('Product created');
      setProductModalOpen(false);
      setForm({ name: '', categoryId: '', sku: '', barcode: '' });
      load();
    } catch (err) {
      push(errorMessage(err), 'error');
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-paper">Products</h1>
        <Button onClick={() => setProductModalOpen(true)}>
          <span className="flex items-center gap-1.5">
            <Plus size={15} /> New product
          </span>
        </Button>
      </div>

      <Card>
        {products.map((p) => (
          <div key={p.id} className="ledger-row">
            <button
              className="w-full flex items-center justify-between px-4 py-3 text-left"
              onClick={() => setExpanded(expanded === p.id ? null : p.id)}
            >
              <div>
                <div className="text-sm text-paper">{p.name}</div>
                <div className="text-xs text-paper-dim">
                  {p.category?.name ?? 'Uncategorized'} {p.sku ? `· ${p.sku}` : ''}
                </div>
              </div>
              {expanded === p.id ? <ChevronUp size={16} className="text-paper-dim" /> : <ChevronDown size={16} className="text-paper-dim" />}
            </button>
            {expanded === p.id && <ProductDetail product={p} onChange={load} />}
          </div>
        ))}
        {products.length === 0 && <p className="text-sm text-paper-dim text-center py-8">No products yet.</p>}
      </Card>

      <Modal open={productModalOpen} onClose={() => setProductModalOpen(false)} title="New product">
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
              <option value="">None</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>SKU</Label>
              <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div>
              <Label>Barcode</Label>
              <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
            </div>
          </div>
          <Button className="w-full" onClick={createProduct} disabled={!form.name}>
            Create product
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function ProductDetail({ product, onChange }: { product: Product; onChange: () => void }) {
  const { push } = useToast();
  const [unitModalOpen, setUnitModalOpen] = useState(false);
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [unitForm, setUnitForm] = useState({ name: '', quantityInBaseUnit: '1', isBaseUnit: false, isPurchaseUnit: false, isSaleUnit: false });
  const [priceForm, setPriceForm] = useState({ unitId: '', price: '' });

  async function createUnit() {
    try {
      await api.post('/units', {
        productId: product.id,
        name: unitForm.name,
        quantityInBaseUnit: Number(unitForm.quantityInBaseUnit),
        isBaseUnit: unitForm.isBaseUnit,
        isPurchaseUnit: unitForm.isPurchaseUnit,
        isSaleUnit: unitForm.isSaleUnit,
      });
      push('Unit added');
      setUnitModalOpen(false);
      onChange();
    } catch (err) {
      push(errorMessage(err), 'error');
    }
  }

  async function createPrice() {
    try {
      await api.post(`/products/${product.id}/prices`, { unitId: priceForm.unitId, price: Number(priceForm.price) });
      push('Price updated');
      setPriceModalOpen(false);
      onChange();
    } catch (err) {
      push(errorMessage(err), 'error');
    }
  }

  return (
    <div className="px-4 pb-4 bg-ink-raised">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs uppercase tracking-wide text-paper-dim">Units</div>
            <button className="text-xs text-brass hover:text-brass-soft" onClick={() => setUnitModalOpen(true)}>
              + Add unit
            </button>
          </div>
          {(product.units ?? []).map((u) => (
            <div key={u.id} className="text-sm text-paper py-1 flex justify-between">
              <span>{u.name}</span>
              <span className="font-mono text-xs text-paper-dim">
                1 {u.name} = {u.quantityInBaseUnit} base
                {u.isSaleUnit ? ' · sale' : ''}
                {u.isPurchaseUnit ? ' · purchase' : ''}
              </span>
            </div>
          ))}
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs uppercase tracking-wide text-paper-dim">Prices</div>
            <button className="text-xs text-brass hover:text-brass-soft" onClick={() => setPriceModalOpen(true)}>
              + Set price
            </button>
          </div>
          {(product.prices ?? []).map((p) => (
            <div key={p.id} className="text-sm text-paper py-1 flex justify-between">
              <span>{p.unit?.name ?? p.unitId} · {p.priceType}</span>
              <span className="font-mono text-xs">{formatMWK(p.price)}</span>
            </div>
          ))}
        </div>
      </div>

      <Modal open={unitModalOpen} onClose={() => setUnitModalOpen(false)} title={`Add unit — ${product.name}`}>
        <div className="space-y-3">
          <div>
            <Label>Unit name</Label>
            <Input placeholder="e.g. Bottle, Case, Shot" value={unitForm.name} onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })} />
          </div>
          <div>
            <Label>Quantity in base unit</Label>
            <Input type="number" value={unitForm.quantityInBaseUnit} onChange={(e) => setUnitForm({ ...unitForm, quantityInBaseUnit: e.target.value })} />
          </div>
          <div className="flex gap-4 text-sm text-paper">
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={unitForm.isBaseUnit} onChange={(e) => setUnitForm({ ...unitForm, isBaseUnit: e.target.checked })} /> Base
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={unitForm.isPurchaseUnit} onChange={(e) => setUnitForm({ ...unitForm, isPurchaseUnit: e.target.checked })} /> Purchase
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={unitForm.isSaleUnit} onChange={(e) => setUnitForm({ ...unitForm, isSaleUnit: e.target.checked })} /> Sale
            </label>
          </div>
          <Button className="w-full" onClick={createUnit} disabled={!unitForm.name}>
            Add unit
          </Button>
        </div>
      </Modal>

      <Modal open={priceModalOpen} onClose={() => setPriceModalOpen(false)} title={`Set price — ${product.name}`}>
        <div className="space-y-3">
          <div>
            <Label>Unit</Label>
            <Select value={priceForm.unitId} onChange={(e) => setPriceForm({ ...priceForm, unitId: e.target.value })}>
              <option value="">Select unit…</option>
              {(product.units ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Price (MWK)</Label>
            <Input type="number" value={priceForm.price} onChange={(e) => setPriceForm({ ...priceForm, price: e.target.value })} />
          </div>
          <Button className="w-full" onClick={createPrice} disabled={!priceForm.unitId || !priceForm.price}>
            Save price
          </Button>
        </div>
      </Modal>
    </div>
  );
}
