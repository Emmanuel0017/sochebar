import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input, Label } from '../../components/Input';
import { Modal } from '../../components/Modal';
import { PageLoader } from '../../components/Spinner';
import { useToast } from '../../components/Toast';
import { errorMessage } from '../../lib/errors';
import { formatMWK, formatDateTime } from '../../lib/format';
import type { CashSession } from '../../types';

export function CashPage() {
  const { push } = useToast();
  const [session, setSession] = useState<CashSession | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModalOpen, setOpenModalOpen] = useState(false);
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [openingCash, setOpeningCash] = useState('');
  const [actualCash, setActualCash] = useState('');

  function load() {
    setLoading(true);
    api
      .get('/cash/sessions/current')
      .then(async (r) => {
        setSession(r.data);
        if (r.data) {
          const t = await api.get(`/cash/sessions/${r.data.id}/transactions`);
          setTransactions(t.data);
        }
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function openSession() {
    try {
      await api.post('/cash/sessions/open', { openingCash: Number(openingCash) });
      push('Cash session opened');
      setOpenModalOpen(false);
      setOpeningCash('');
      load();
    } catch (err) {
      push(errorMessage(err), 'error');
    }
  }

  async function closeSession() {
    if (!session) return;
    try {
      const { data } = await api.post(`/cash/sessions/${session.id}/close`, { actualCash: Number(actualCash) });
      push(
        data.flagged
          ? `Session closed — flagged, difference ${formatMWK(data.difference)}`
          : 'Session closed — balanced',
        data.flagged ? 'error' : 'success',
      );
      setCloseModalOpen(false);
      setActualCash('');
      load();
    } catch (err) {
      push(errorMessage(err), 'error');
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-paper">Cash session</h1>
        {!session ? (
          <Button onClick={() => setOpenModalOpen(true)}>Open session</Button>
        ) : (
          <Button variant="danger" onClick={() => setCloseModalOpen(true)}>
            Close session
          </Button>
        )}
      </div>

      {!session ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-paper-dim">No cash session is open. Open one to start taking cash sales.</p>
        </Card>
      ) : (
        <>
          <Card className="p-5">
            <div className="text-xs uppercase tracking-wide text-paper-dim mb-1">Opened</div>
            <div className="text-sm text-paper mb-4">{formatDateTime(session.openedAt)}</div>
            <div className="text-xs uppercase tracking-wide text-paper-dim mb-1">Opening float</div>
            <div className="font-mono text-2xl text-brass">{formatMWK(session.openingCash)}</div>
          </Card>

          <Card>
            <div className="px-4 py-3 border-b border-panel-border text-xs uppercase tracking-wide text-paper-dim">
              Transactions
            </div>
            {transactions.map((t) => (
              <div key={t.id} className="ledger-row flex items-center justify-between px-4 py-2.5">
                <div>
                  <div className="text-sm text-paper">{t.transactionType.replace('_', ' ')}</div>
                  <div className="text-xs text-paper-dim">{t.description ?? '—'}</div>
                </div>
                <span className="font-mono text-sm text-paper">{formatMWK(t.amount)}</span>
              </div>
            ))}
            {transactions.length === 0 && (
              <p className="text-sm text-paper-dim text-center py-8">No transactions yet this session.</p>
            )}
          </Card>
        </>
      )}

      <Modal open={openModalOpen} onClose={() => setOpenModalOpen(false)} title="Open cash session">
        <div className="space-y-3">
          <div>
            <Label>Opening float (MWK)</Label>
            <Input type="number" value={openingCash} onChange={(e) => setOpeningCash(e.target.value)} autoFocus />
          </div>
          <Button className="w-full" onClick={openSession} disabled={!openingCash}>
            Open session
          </Button>
        </div>
      </Modal>

      <Modal open={closeModalOpen} onClose={() => setCloseModalOpen(false)} title="Close cash session">
        <div className="space-y-3">
          <p className="text-sm text-paper-dim">Count the till and enter what's actually there.</p>
          <div>
            <Label>Actual cash counted (MWK)</Label>
            <Input type="number" value={actualCash} onChange={(e) => setActualCash(e.target.value)} autoFocus />
          </div>
          <Button variant="danger" className="w-full" onClick={closeSession} disabled={!actualCash}>
            Close and reconcile
          </Button>
        </div>
      </Modal>
    </div>
  );
}
