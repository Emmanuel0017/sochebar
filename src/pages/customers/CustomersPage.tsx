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
import type { Customer } from '../../types';

export function CustomersPage() {
  const { push } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<Customer | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', address: '', creditLimit: '' });

  function load() {
    setLoading(true);
    api.get('/customers').then(async (r) => {
      setCustomers(r.data);
      const pairs = await Promise.all(
        r.data.map((c: Customer) => api.get(`/customers/${c.id}/balance`).then((b) => [c.id, b.data.outstanding])),
      );
      setBalances(Object.fromEntries(pairs));
      setLoading(false);
    });
  }

  useEffect(load, []);

  async function createCustomer() {
    try {
      await api.post('/customers', { ...form, creditLimit: form.creditLimit ? Number(form.creditLimit) : undefined });
      push('Customer added');
      setModalOpen(false);
      setForm({ name: '', phone: '', address: '', creditLimit: '' });
      load();
    } catch (err) {
      push(errorMessage(err), 'error');
    }
  }

  async function recordPayment() {
    if (!payTarget) return;
    try {
      await api.post(`/customers/${payTarget.id}/payment`, { amount: Number(payAmount) });
      push('Payment recorded');
      setPayTarget(null);
      setPayAmount('');
      load();
    } catch (err) {
      push(errorMessage(err), 'error');
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-paper">Customers</h1>
        <Button onClick={() => setModalOpen(true)}>
          <span className="flex items-center gap-1.5">
            <Plus size={15} /> New customer
          </span>
        </Button>
      </div>

      <Card>
        {customers.map((c) => (
          <div key={c.id} className="ledger-row flex items-center justify-between px-4 py-3">
            <div>
              <div className="text-sm text-paper">{c.name}</div>
              <div className="text-xs text-paper-dim">{c.phone ?? '—'} · limit {formatMWK(c.creditLimit)}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs text-paper-dim">Owes</div>
                <div className={`font-mono text-sm ${(balances[c.id] ?? 0) > 0 ? 'text-copper' : 'text-ledger'}`}>
                  {formatMWK(balances[c.id] ?? 0)}
                </div>
              </div>
              <Button variant="secondary" onClick={() => setPayTarget(c)}>
                Record payment
              </Button>
            </div>
          </div>
        ))}
        {customers.length === 0 && <p className="text-sm text-paper-dim text-center py-8">No customers yet.</p>}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New customer">
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
          <Button className="w-full" onClick={createCustomer} disabled={!form.name}>
            Add customer
          </Button>
        </div>
      </Modal>

      <Modal open={!!payTarget} onClose={() => setPayTarget(null)} title={`Record payment — ${payTarget?.name ?? ''}`}>
        <div className="space-y-3">
          <div>
            <Label>Amount (MWK)</Label>
            <Input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} autoFocus />
          </div>
          <Button className="w-full" onClick={recordPayment} disabled={!payAmount}>
            Record payment
          </Button>
        </div>
      </Modal>
    </div>
  );
}
