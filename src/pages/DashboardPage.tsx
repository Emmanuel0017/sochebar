import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { PageLoader } from '../components/Spinner';
import { formatMWK } from '../lib/format';
import type { StockSummaryEntry } from '../types';

interface Summary {
  date: string;
  sales: number;
  expenses: number;
  netProfit: number;
  payments: Record<string, number>;
}

interface CashRow {
  sessionId: string;
  userId: string;
  openingCash: number;
  cashSales: number;
  cashExpenses: number;
  expectedCash: number | null;
  actualCash: number | null;
  difference: number | null;
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash',
  airtelMoney: 'Airtel Money',
  mpamba: 'Mpamba',
  bank: 'Bank',
  credit: 'Credit',
  other: 'Other',
};

export function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [stockAlerts, setStockAlerts] = useState<StockSummaryEntry[]>([]);
  const [cashRows, setCashRows] = useState<CashRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/summary'),
      api.get('/dashboard/stock-alerts'),
      api.get('/dashboard/cash'),
    ])
      .then(([s, alerts, cash]) => {
        setSummary(s.data);
        setStockAlerts(alerts.data.filter((a: StockSummaryEntry) => a.status !== 'OK'));
        setCashRows(cash.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-paper">Today's till</h1>
        <p className="text-sm text-paper-dim mt-1">
          {summary?.date ? new Date(summary.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card tear className="p-5">
          <div className="text-xs uppercase tracking-wide text-paper-dim mb-2">Sales</div>
          <div className="font-mono text-3xl text-paper">{formatMWK(summary?.sales ?? 0)}</div>
        </Card>
        <Card tear className="p-5">
          <div className="text-xs uppercase tracking-wide text-paper-dim mb-2">Expenses</div>
          <div className="font-mono text-3xl text-copper">{formatMWK(summary?.expenses ?? 0)}</div>
        </Card>
        <Card tear className="p-5">
          <div className="text-xs uppercase tracking-wide text-paper-dim mb-2">Net profit</div>
          <div className={`font-mono text-3xl ${((summary?.netProfit ?? 0) >= 0) ? 'text-ledger' : 'text-copper'}`}>
            {formatMWK(summary?.netProfit ?? 0)}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="text-xs uppercase tracking-wide text-paper-dim mb-4">Payment collection</div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {Object.entries(summary?.payments ?? {}).map(([key, value]) => (
            <div key={key}>
              <div className="text-xs text-paper-dim">{PAYMENT_LABELS[key] ?? key}</div>
              <div className="font-mono text-lg text-paper mt-1">{formatMWK(value)}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="text-xs uppercase tracking-wide text-paper-dim mb-4">Stock alerts</div>
          {stockAlerts.length === 0 ? (
            <p className="text-sm text-paper-dim">All tracked products are within healthy stock levels.</p>
          ) : (
            <div>
              {stockAlerts.map((s) => (
                <div key={s.productId} className="ledger-row flex items-center justify-between py-2">
                  <span className="text-sm text-paper">{s.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-paper-dim">
                      {s.stock} {s.baseUnit}
                    </span>
                    <Badge tone={s.status === 'OUT_OF_STOCK' ? 'danger' : 'warn'}>
                      {s.status === 'OUT_OF_STOCK' ? 'Out of stock' : 'Low'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="text-xs uppercase tracking-wide text-paper-dim mb-4">Open cash sessions</div>
          {cashRows.length === 0 ? (
            <p className="text-sm text-paper-dim">No cash sessions are currently open.</p>
          ) : (
            <div>
              {cashRows.map((c) => (
                <div key={c.sessionId} className="ledger-row py-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-paper">Opening {formatMWK(c.openingCash)}</span>
                    <span className="font-mono text-paper-dim">Sales {formatMWK(c.cashSales)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
