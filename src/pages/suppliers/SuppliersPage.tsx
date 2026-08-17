import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { api } from '../../lib/api';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input, Label } from '../../components/Input';
import { Modal } from '../../components/Modal';
import { PageLoader } from '../../components/Spinner';
import { useToast } from '../../components/Toast';
import { errorMessage } from '../../lib/errors';
import { formatMWK } from '../../lib/format';
import type { Supplier } from '../../types';

export function SuppliersPage() {
  const { push } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' });

  function load() {
    setLoading(true);
    api.get('/suppliers').then(async (r) => {
      setSuppliers(r.data);
      const balancePairs = await Promise.all(
        r.data.map((s: Supplier) => api.get(`/suppliers/${s.id}/balance`).then((b) => [s.id, b.data.outstanding])),
      );
      setBalances(Object.fromEntries(balancePairs));
      setLoading(false);
    });
  }

  useEffect(load, []);

  async function createSupplier() {
    try {
      await api.post('/suppliers', form);
      push('Supplier added');
      setModalOpen(false);
      setForm({ name: '', phone: '', email: '', address: '' });
      load();
    } catch (err) {
      push(errorMessage(err), 'error');
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-paper">Suppliers</h1>
        <Button onClick={() => setModalOpen(true)}>
          <span className="flex items-center gap-1.5">
            <Plus size={15} /> New supplier
          </span>
        </Button>
      </div>

      <Card>
        {suppliers.map((s) => (
          <div key={s.id} className="ledger-row flex items-center justify-between px-4 py-3">
            <div>
              <div className="text-sm text-paper">{s.name}</div>
              <div className="text-xs text-paper-dim">{s.phone ?? s.email ?? '—'}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-paper-dim">Outstanding</div>
              <div className={`font-mono text-sm ${(balances[s.id] ?? 0) > 0 ? 'text-copper' : 'text-ledger'}`}>
                {formatMWK(balances[s.id] ?? 0)}
              </div>
            </div>
          </div>
        ))}
        {suppliers.length === 0 && <p className="text-sm text-paper-dim text-center py-8">No suppliers yet.</p>}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New supplier">
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
            <Label>Email</Label>
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label>Address</Label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <Button className="w-full" onClick={createSupplier} disabled={!form.name}>
            Add supplier
          </Button>
        </div>
      </Modal>
    </div>
  );
}
