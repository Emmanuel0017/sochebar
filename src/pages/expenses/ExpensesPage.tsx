import { useEffect, useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { api } from '../../lib/api';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input, Label, Select } from '../../components/Input';
import { Modal } from '../../components/Modal';
import { PageLoader } from '../../components/Spinner';
import { useToast } from '../../components/Toast';
import { errorMessage } from '../../lib/errors';
import { formatMWK, formatDate } from '../../lib/format';
import type { Expense, ExpenseCategory, PaymentMethod } from '../../types';

const METHODS: PaymentMethod[] = ['CASH', 'AIRTEL_MONEY', 'MPAMBA', 'BANK', 'OTHER'];

export function ExpensesPage() {
  const { push } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [form, setForm] = useState({ categoryId: '', description: '', amount: '', paymentMethod: 'CASH' as PaymentMethod, reference: '' });

  function load() {
    setLoading(true);
    Promise.all([api.get('/expenses'), api.get('/expenses/categories'), api.get('/cash/sessions/current')])
      .then(([e, c, s]) => {
        setExpenses(e.data);
        setCategories(c.data);
        setCurrentSessionId(s.data?.id ?? null);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return expenses;
    return expenses.filter(
      (e) => e.description.toLowerCase().includes(q) || e.category?.name.toLowerCase().includes(q),
    );
  }, [expenses, search]);

  async function submit() {
    try {
      await api.post('/expenses', {
        categoryId: form.categoryId,
        description: form.description,
        amount: Number(form.amount),
        paymentMethod: form.paymentMethod,
        reference: form.reference || undefined,
        cashSessionId: form.paymentMethod === 'CASH' ? currentSessionId ?? undefined : undefined,
      });
      push('Expense recorded');
      setModalOpen(false);
      setForm({ categoryId: '', description: '', amount: '', paymentMethod: 'CASH', reference: '' });
      load();
    } catch (err) {
      push(errorMessage(err), 'error');
    }
  }

  if (loading) return <PageLoader />;

  const needsCashSession = form.paymentMethod === 'CASH' && !currentSessionId;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-paper">Expenses</h1>
        <Button onClick={() => setModalOpen(true)}>
          <span className="flex items-center gap-1.5">
            <Plus size={15} /> New expense
          </span>
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-paper-dim" />
        <Input placeholder="Search expenses…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        {filtered.map((e) => (
          <div key={e.id} className="ledger-row flex items-center justify-between px-4 py-3">
            <div>
              <div className="text-sm text-paper">{e.description}</div>
              <div className="text-xs text-paper-dim">
                {e.category?.name} · {e.paymentMethod} · {formatDate(e.expenseDate)}
              </div>
            </div>
            <span className="font-mono text-sm text-copper">{formatMWK(e.amount)}</span>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-paper-dim text-center py-8">
            {expenses.length === 0 ? 'No expenses recorded.' : 'No expenses match your search.'}
          </p>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New expense">
        <div className="space-y-3">
          <div>
            <Label>Category</Label>
            <Select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
              <option value="">Select category…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Description</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Amount (MWK)</Label>
              <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <Label>Payment method</Label>
              <Select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as PaymentMethod })}>
                {METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m.replace('_', ' ')}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <Label>Reference (optional)</Label>
            <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
          </div>
          {needsCashSession && (
            <p className="text-xs text-copper bg-copper/10 border border-copper/30 rounded-md px-3 py-2">
              No cash session is open — open one on the Cash page first if this expense is paid from the till.
            </p>
          )}
          <Button className="w-full" onClick={submit} disabled={!form.categoryId || !form.description || !form.amount || needsCashSession}>
            Record expense
          </Button>
        </div>
      </Modal>
    </div>
  );
}
