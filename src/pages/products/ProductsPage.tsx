import { useEffect, useMemo, useState } from 'react';
import { Plus, ChevronDown, ChevronUp, Search, Pencil, Trash2, Archive } from 'lucide-react';
import { api } from '../../lib/api';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Input, Label, Select } from '../../components/Input';
import { Modal } from '../../components/Modal';
import { PageLoader } from '../../components/Spinner';
import { useToast } from '../../components/Toast';
import { errorMessage } from '../../lib/errors';
import { formatMWK } from '../../lib/format';
import type { Category, Product, ProductUnit } from '../../types';

export function ProductsPage() {
  const { push } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState({
    name: '',
    categoryId: '',
    sku: '',
    barcode: '',
    tracksEmptyBottles: false,
  });

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q) ||
        p.category?.name.toLowerCase().includes(q),
    );
  }, [products, search]);

  function openNew() {
    setEditingProduct(null);
    setForm({ name: '', categoryId: '', sku: '', barcode: '', tracksEmptyBottles: false });
    setProductModalOpen(true);
  }

  function openEdit(p: Product) {
    setEditingProduct(p);
    setForm({
      name: p.name,
      categoryId: p.categoryId ?? '',
      sku: p.sku ?? '',
      barcode: p.barcode ?? '',
      tracksEmptyBottles: p.tracksEmptyBottles,
    });
    setProductModalOpen(true);
  }

  async function saveProduct() {
    try {
      const payload = {
        name: form.name,
        categoryId: form.categoryId || undefined,
        sku: form.sku || undefined,
        barcode: form.barcode || undefined,
        tracksEmptyBottles: form.tracksEmptyBottles,
      };
      if (editingProduct) {
        await api.patch(`/products/${editingProduct.id}`, payload);
        push('Product updated');
      } else {
        await api.post('/products', payload);
        push('Product created');
      }
      setProductModalOpen(false);
      load();
    } catch (err) {
      push(errorMessage(err), 'error');
    }
  }

  async function deactivateProduct(p: Product) {
    if (!confirm(`Deactivate ${p.name}? It will be hidden from the POS and product lists, but its sales/purchase history stays intact.`)) return;
    try {
      await api.delete(`/products/${p.id}`);
      push('Product deactivated');
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
        <Button onClick={openNew}>
          <span className="flex items-center gap-1.5">
            <Plus size={15} /> New product
          </span>
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-paper-dim" />
        <Input
          placeholder="Search name, SKU, barcode, or category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        {filtered.map((p) => (
          <div key={p.id} className="ledger-row">
            <div className="w-full flex items-center justify-between px-4 py-3">
              <button className="flex-1 text-left" onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
                <div className="text-sm text-paper flex items-center gap-2">
                  {p.name}
                  {!p.isActive && <Badge tone="neutral">Inactive</Badge>}
                  {p.tracksEmptyBottles && <Badge tone="warn">Empties</Badge>}
                </div>
                <div className="text-xs text-paper-dim">
                  {p.category?.name ?? 'Uncategorized'} {p.sku ? `· ${p.sku}` : ''}
                </div>
              </button>
              <div className="flex items-center gap-1">
                <button className="p-1.5 text-paper-dim hover:text-brass" onClick={() => openEdit(p)} title="Edit">
                  <Pencil size={14} />
                </button>
                {p.isActive && (
                  <button className="p-1.5 text-paper-dim hover:text-copper" onClick={() => deactivateProduct(p)} title="Deactivate">
                    <Archive size={14} />
                  </button>
                )}
                <button onClick={() => setExpanded(expanded === p.id ? null : p.id)} className="p-1.5 text-paper-dim">
                  {expanded === p.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>
            </div>
            {expanded === p.id && <ProductDetail product={p} onChange={load} />}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-paper-dim text-center py-8">
            {products.length === 0 ? 'No products yet.' : 'No products match your search.'}
          </p>
        )}
      </Card>

      <Modal open={productModalOpen} onClose={() => setProductModalOpen(false)} title={editingProduct ? 'Edit product' : 'New product'}>
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
          <label className="flex items-center gap-2 text-sm text-paper">
            <input
              type="checkbox"
              checked={form.tracksEmptyBottles}
              onChange={(e) => setForm({ ...form, tracksEmptyBottles: e.target.checked })}
            />
            Track empty bottles for this product (returnable deposit bottles)
          </label>
          <Button className="w-full" onClick={saveProduct} disabled={!form.name}>
            {editingProduct ? 'Save changes' : 'Create product'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function ProductDetail({ product, onChange }: { product: Product; onChange: () => void }) {
  const { push } = useToast();
  const [unitModalOpen, setUnitModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<ProductUnit | null>(null);
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [openingStockOpen, setOpeningStockOpen] = useState(false);
  const [unitForm, setUnitForm] = useState({ name: '', quantityInBaseUnit: '1', isBaseUnit: false, isPurchaseUnit: false, isSaleUnit: false });
  const [priceForm, setPriceForm] = useState({ unitId: '', price: '' });
  const [openingForm, setOpeningForm] = useState({ unitId: '', physicalQuantity: '' });

  function openNewUnit() {
    setEditingUnit(null);
    setUnitForm({ name: '', quantityInBaseUnit: '1', isBaseUnit: false, isPurchaseUnit: false, isSaleUnit: false });
    setUnitModalOpen(true);
  }

  function openEditUnit(u: ProductUnit) {
    setEditingUnit(u);
    setUnitForm({
      name: u.name,
      quantityInBaseUnit: u.quantityInBaseUnit,
      isBaseUnit: u.isBaseUnit,
      isPurchaseUnit: u.isPurchaseUnit,
      isSaleUnit: u.isSaleUnit,
    });
    setUnitModalOpen(true);
  }

  async function saveUnit() {
    try {
      const payload = {
        name: unitForm.name,
        quantityInBaseUnit: Number(unitForm.quantityInBaseUnit),
        isBaseUnit: unitForm.isBaseUnit,
        isPurchaseUnit: unitForm.isPurchaseUnit,
        isSaleUnit: unitForm.isSaleUnit,
      };
      if (editingUnit) {
        await api.patch(`/units/${editingUnit.id}`, payload);
        push('Unit updated');
      } else {
        await api.post('/units', { productId: product.id, ...payload });
        push('Unit added');
      }
      setUnitModalOpen(false);
      onChange();
    } catch (err) {
      push(errorMessage(err), 'error');
    }
  }

  async function deleteUnit(u: ProductUnit) {
    if (!confirm(`Delete unit "${u.name}"? This can't be undone.`)) return;
    try {
      await api.delete(`/units/${u.id}`);
      push('Unit deleted');
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

  async function submitOpeningStock() {
    try {
      await api.post('/inventory/adjustments', {
        productId: product.id,
        unitId: openingForm.unitId,
        physicalQuantity: Number(openingForm.physicalQuantity),
        reason: 'UNRECORDED_STOCK',
        notes: 'Opening stock — already on shelf before this was entered into the system',
      });
      push('Opening stock recorded');
      setOpeningStockOpen(false);
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
            <button className="text-xs text-brass hover:text-brass-soft" onClick={openNewUnit}>
              + Add unit
            </button>
          </div>
          {(product.units ?? []).map((u) => (
            <div key={u.id} className="text-sm text-paper py-1 flex items-center justify-between">
              <span>{u.name}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-paper-dim">
                  1 {u.name} = {u.quantityInBaseUnit} base
                  {u.isSaleUnit ? ' · sale' : ''}
                  {u.isPurchaseUnit ? ' · purchase' : ''}
                </span>
                <button className="text-paper-dim hover:text-brass" onClick={() => openEditUnit(u)}>
                  <Pencil size={12} />
                </button>
                <button className="text-paper-dim hover:text-copper" onClick={() => deleteUnit(u)}>
                  <Trash2 size={12} />
                </button>
              </div>
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

      <div className="pt-3 mt-3 border-t border-panel-border">
        <button className="text-xs text-brass hover:text-brass-soft" onClick={() => setOpeningStockOpen(true)}>
          + Already have stock on the shelf? Record opening stock (no purchase needed)
        </button>
      </div>

      <Modal open={unitModalOpen} onClose={() => setUnitModalOpen(false)} title={editingUnit ? `Edit unit — ${product.name}` : `Add unit — ${product.name}`}>
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
          <Button className="w-full" onClick={saveUnit} disabled={!unitForm.name}>
            {editingUnit ? 'Save changes' : 'Add unit'}
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

      <Modal open={openingStockOpen} onClose={() => setOpeningStockOpen(false)} title={`Opening stock — ${product.name}`}>
        <div className="space-y-3">
          <p className="text-sm text-paper-dim">
            For stock that was already at the bar before you started using this system, with no purchase record to
            trace it to. This sets the shelf count directly — it's logged as a stock adjustment, not a purchase, so
            it won't affect supplier balances or cost tracking.
          </p>
          <div>
            <Label>Unit</Label>
            <Select value={openingForm.unitId} onChange={(e) => setOpeningForm({ ...openingForm, unitId: e.target.value })}>
              <option value="">Select unit…</option>
              {(product.units ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Quantity currently on the shelf</Label>
            <Input
              type="number"
              value={openingForm.physicalQuantity}
              onChange={(e) => setOpeningForm({ ...openingForm, physicalQuantity: e.target.value })}
            />
          </div>
          <Button className="w-full" onClick={submitOpeningStock} disabled={!openingForm.unitId || openingForm.physicalQuantity === ''}>
            Record opening stock
          </Button>
        </div>
      </Modal>
    </div>
  );
}
