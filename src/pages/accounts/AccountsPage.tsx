import { useEffect, useState } from 'react';
import { Plus, ArrowRightLeft } from 'lucide-react';
import { api } from '../../lib/api';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input, Label, Select } from '../../components/Input';
import { Modal } from '../../components/Modal';
import { PageLoader } from '../../components/Spinner';
import { useToast } from '../../components/Toast';
import { errorMessage } from '../../lib/errors';
import { formatMWK, formatDate } from '../../lib/format';

const TABS = ['Capital accounts', 'Fixed assets', 'Cash accounts'] as const;
type Tab = (typeof TABS)[number];

export function AccountsPage() {
  const [tab, setTab] = useState<Tab>('Capital accounts');

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-paper">Accounts</h1>
      <p className="text-sm text-paper-dim -mt-4">
        Partner capital, fixed assets, and the Bank / Airtel Money / Petty Cash cash book.
      </p>

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

      {tab === 'Capital accounts' && <CapitalAccountsTab />}
      {tab === 'Fixed assets' && <FixedAssetsTab />}
      {tab === 'Cash accounts' && <CashAccountsTab />}
    </div>
  );
}

// ---------------- Capital accounts ----------------
function CapitalAccountsTab() {
  const { push } = useToast();
  const [partners, setPartners] = useState<any[]>([]);
  const [txns, setTxns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [partnerModalOpen, setPartnerModalOpen] = useState(false);
  const [newPartnerName, setNewPartnerName] = useState('');
  const [txnModalOpen, setTxnModalOpen] = useState(false);
  const [form, setForm] = useState({ partnerId: '', transactionType: 'CONTRIBUTION', description: '', amount: '', stockValue: '' });

  function load() {
    setLoading(true);
    Promise.all([api.get('/accounts/partners'), api.get('/accounts/capital-transactions')])
      .then(([p, t]) => {
        setPartners(p.data);
        setTxns(t.data);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function addPartner() {
    try {
      await api.post('/accounts/partners', { name: newPartnerName });
      push('Partner added');
      setPartnerModalOpen(false);
      setNewPartnerName('');
      load();
    } catch (err) {
      push(errorMessage(err), 'error');
    }
  }

  async function submitTxn() {
    try {
      await api.post('/accounts/capital-transactions', {
        partnerId: form.partnerId,
        transactionType: form.transactionType,
        description: form.description,
        amount: Number(form.amount),
        stockValue: form.stockValue ? Number(form.stockValue) : undefined,
      });
      push('Capital transaction recorded');
      setTxnModalOpen(false);
      setForm({ partnerId: '', transactionType: 'CONTRIBUTION', description: '', amount: '', stockValue: '' });
      load();
    } catch (err) {
      push(errorMessage(err), 'error');
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => setPartnerModalOpen(true)}>
          <span className="flex items-center gap-1.5">
            <Plus size={15} /> New partner
          </span>
        </Button>
        <Button onClick={() => setTxnModalOpen(true)} disabled={partners.length === 0}>
          <span className="flex items-center gap-1.5">
            <Plus size={15} /> Contribution / drawing
          </span>
        </Button>
      </div>

      <Card>
        {txns.map((t) => (
          <div key={t.id} className="ledger-row flex items-center justify-between px-4 py-3">
            <div>
              <div className="text-sm text-paper">
                {t.partner.name} — {t.description}
              </div>
              <div className="text-xs text-paper-dim">
                {t.transactionType === 'CONTRIBUTION' ? 'Contribution' : 'Drawing'} · {formatDate(t.transactionDate)}
                {t.stockValue != null && (
                  <> · <span className="text-brass">{formatMWK(t.stockValue)} stock</span></>
                )}
              </div>
            </div>
            <span className={`font-mono text-sm ${t.transactionType === 'CONTRIBUTION' ? 'text-ledger' : 'text-copper'}`}>
              {t.transactionType === 'CONTRIBUTION' ? '+' : '−'}
              {formatMWK(t.amount)}
            </span>
          </div>
        ))}
        {txns.length === 0 && (
          <p className="text-sm text-paper-dim text-center py-8">
            {partners.length === 0 ? 'Add a partner first.' : 'No capital transactions recorded yet.'}
          </p>
        )}
      </Card>

      <Modal open={partnerModalOpen} onClose={() => setPartnerModalOpen(false)} title="New partner">
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input value={newPartnerName} onChange={(e) => setNewPartnerName(e.target.value)} autoFocus />
          </div>
          <Button className="w-full" onClick={addPartner} disabled={!newPartnerName}>
            Add partner
          </Button>
        </div>
      </Modal>

      <Modal open={txnModalOpen} onClose={() => setTxnModalOpen(false)} title="Contribution / drawing">
        <div className="space-y-3">
          <div>
            <Label>Partner</Label>
            <Select value={form.partnerId} onChange={(e) => setForm({ ...form, partnerId: e.target.value })}>
              <option value="">Select…</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Type</Label>
            <Select value={form.transactionType} onChange={(e) => setForm({ ...form, transactionType: e.target.value })}>
              <option value="CONTRIBUTION">Contribution (put money/stock in)</option>
              <option value="DRAWING">Drawing (took money/goods out)</option>
            </Select>
          </div>
          <div>
            <Label>Description</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Carlsberg crates, part rent, fuel…" />
          </div>
          <div>
            <Label>Amount (MWK)</Label>
            <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div>
            <Label>Of that, how much was stock/inventory? (optional)</Label>
            <Input
              type="number"
              value={form.stockValue}
              onChange={(e) => setForm({ ...form, stockValue: e.target.value })}
              placeholder="Leave blank if none of it was stock"
            />
            <p className="text-xs text-paper-dim mt-1">
              This is the extra column from the paper capital account sheet — it splits out how much of this
              amount was spent buying stock (drinks, snacks, etc.) versus other things like rent, fuel, or
              fixtures. Leave it blank for a purely non-stock entry, or if you're not sure.
            </p>
          </div>
          <Button className="w-full" onClick={submitTxn} disabled={!form.partnerId || !form.description || !form.amount}>
            Save
          </Button>
        </div>
      </Modal>
    </div>
  );
}

// ---------------- Fixed assets ----------------
function FixedAssetsTab() {
  const { push } = useToast();
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', cost: '', acquiredDate: '', notes: '' });

  function load() {
    setLoading(true);
    api
      .get('/accounts/fixed-assets')
      .then((r) => setAssets(r.data))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function submit() {
    try {
      await api.post('/accounts/fixed-assets', {
        name: form.name,
        cost: Number(form.cost),
        acquiredDate: form.acquiredDate || undefined,
        notes: form.notes || undefined,
      });
      push('Fixed asset recorded');
      setModalOpen(false);
      setForm({ name: '', cost: '', acquiredDate: '', notes: '' });
      load();
    } catch (err) {
      push(errorMessage(err), 'error');
    }
  }

  if (loading) return <PageLoader />;

  const total = assets.reduce((s, a) => s + Number(a.cost), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-paper-dim">
          Total non-current assets: <span className="font-mono text-brass">{formatMWK(total)}</span>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <span className="flex items-center gap-1.5">
            <Plus size={15} /> New fixed asset
          </span>
        </Button>
      </div>

      <Card>
        {assets.map((a) => (
          <div key={a.id} className="ledger-row flex items-center justify-between px-4 py-3">
            <div>
              <div className="text-sm text-paper">{a.name}</div>
              <div className="text-xs text-paper-dim">
                {formatDate(a.acquiredDate)} {a.notes ? `· ${a.notes}` : ''}
              </div>
            </div>
            <span className="font-mono text-sm text-paper">{formatMWK(a.cost)}</span>
          </div>
        ))}
        {assets.length === 0 && <p className="text-sm text-paper-dim text-center py-8">No fixed assets recorded yet.</p>}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New fixed asset">
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus placeholder="e.g. Lounge chairs" />
          </div>
          <div>
            <Label>Cost (MWK)</Label>
            <Input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
          </div>
          <div>
            <Label>Acquired date</Label>
            <Input type="date" value={form.acquiredDate} onChange={(e) => setForm({ ...form, acquiredDate: e.target.value })} />
          </div>
          <div>
            <Label>Notes</Label>
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. receipts available" />
          </div>
          <Button className="w-full" onClick={submit} disabled={!form.name || !form.cost}>
            Save
          </Button>
        </div>
      </Modal>
    </div>
  );
}

// ---------------- Cash accounts ----------------
function CashAccountsTab() {
  const { push } = useToast();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [txnModalOpen, setTxnModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [txnForm, setTxnForm] = useState({ cashAccountId: '', transactionType: 'ADJUSTMENT', amount: '', description: '' });
  const [transferForm, setTransferForm] = useState({ fromCashAccountId: '', toCashAccountId: '', amount: '', description: '' });

  function load() {
    setLoading(true);
    api
      .get('/accounts/cash-accounts')
      .then(async (r) => {
        setAccounts(r.data);
        const pairs = await Promise.all(
          r.data.map((a: any) => api.get(`/accounts/cash-accounts/${a.id}/balance`).then((b) => [a.id, b.data.balance])),
        );
        setBalances(Object.fromEntries(pairs));
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function submitTxn() {
    try {
      await api.post('/accounts/cash-account-transactions', {
        cashAccountId: txnForm.cashAccountId,
        transactionType: txnForm.transactionType,
        amount: Number(txnForm.amount),
        description: txnForm.description || undefined,
      });
      push('Cash transaction recorded');
      setTxnModalOpen(false);
      setTxnForm({ cashAccountId: '', transactionType: 'ADJUSTMENT', amount: '', description: '' });
      load();
    } catch (err) {
      push(errorMessage(err), 'error');
    }
  }

  async function submitTransfer() {
    try {
      await api.post('/accounts/cash-transfers', {
        fromCashAccountId: transferForm.fromCashAccountId,
        toCashAccountId: transferForm.toCashAccountId,
        amount: Number(transferForm.amount),
        description: transferForm.description || undefined,
      });
      push('Cash transferred (banked)');
      setTransferModalOpen(false);
      setTransferForm({ fromCashAccountId: '', toCashAccountId: '', amount: '', description: '' });
      load();
    } catch (err) {
      push(errorMessage(err), 'error');
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => setTransferModalOpen(true)} disabled={accounts.length < 2}>
          <span className="flex items-center gap-1.5">
            <ArrowRightLeft size={15} /> Bank cash / transfer
          </span>
        </Button>
        <Button onClick={() => setTxnModalOpen(true)} disabled={accounts.length === 0}>
          <span className="flex items-center gap-1.5">
            <Plus size={15} /> Record transaction
          </span>
        </Button>
      </div>

      <Card>
        {accounts.map((a) => (
          <div key={a.id} className="ledger-row flex items-center justify-between px-4 py-3">
            <div>
              <div className="text-sm text-paper">{a.name}</div>
              <div className="text-xs text-paper-dim">{a.type.replace('_', ' ')}</div>
            </div>
            <span className="font-mono text-sm text-brass">{formatMWK(balances[a.id] ?? 0)}</span>
          </div>
        ))}
        {accounts.length === 0 && (
          <p className="text-sm text-paper-dim text-center py-8">No cash accounts set up yet — run the seed script.</p>
        )}
      </Card>

      <Modal open={txnModalOpen} onClose={() => setTxnModalOpen(false)} title="Record cash transaction">
        <div className="space-y-3">
          <div>
            <Label>Account</Label>
            <Select value={txnForm.cashAccountId} onChange={(e) => setTxnForm({ ...txnForm, cashAccountId: e.target.value })}>
              <option value="">Select…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Type</Label>
            <Select value={txnForm.transactionType} onChange={(e) => setTxnForm({ ...txnForm, transactionType: e.target.value })}>
              <option value="CAPITAL_IN">Capital in</option>
              <option value="SALE">Cash sale collected</option>
              <option value="BILL_PAYMENT">Customer bill payment</option>
              <option value="PURCHASE">Stock purchase paid</option>
              <option value="EXPENSE">Expense paid</option>
              <option value="ADJUSTMENT">Adjustment</option>
            </Select>
          </div>
          <div>
            <Label>Amount (MWK) — negative for money out</Label>
            <Input type="number" value={txnForm.amount} onChange={(e) => setTxnForm({ ...txnForm, amount: e.target.value })} />
          </div>
          <div>
            <Label>Description</Label>
            <Input value={txnForm.description} onChange={(e) => setTxnForm({ ...txnForm, description: e.target.value })} />
          </div>
          <Button className="w-full" onClick={submitTxn} disabled={!txnForm.cashAccountId || !txnForm.amount}>
            Save
          </Button>
        </div>
      </Modal>

      <Modal open={transferModalOpen} onClose={() => setTransferModalOpen(false)} title="Bank cash / transfer between accounts">
        <div className="space-y-3">
          <div>
            <Label>From</Label>
            <Select
              value={transferForm.fromCashAccountId}
              onChange={(e) => setTransferForm({ ...transferForm, fromCashAccountId: e.target.value })}
            >
              <option value="">Select…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>To</Label>
            <Select
              value={transferForm.toCashAccountId}
              onChange={(e) => setTransferForm({ ...transferForm, toCashAccountId: e.target.value })}
            >
              <option value="">Select…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Amount (MWK)</Label>
            <Input type="number" value={transferForm.amount} onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })} />
          </div>
          <div>
            <Label>Description</Label>
            <Input value={transferForm.description} onChange={(e) => setTransferForm({ ...transferForm, description: e.target.value })} placeholder="e.g. Banked petty cash" />
          </div>
          <Button
            className="w-full"
            onClick={submitTransfer}
            disabled={!transferForm.fromCashAccountId || !transferForm.toCashAccountId || !transferForm.amount}
          >
            Transfer
          </Button>
        </div>
      </Modal>
    </div>
  );
}
