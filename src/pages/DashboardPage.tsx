import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
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

interface MonthlyRow {
  month: string; // "2026-01"
  sales: number;
  purchases: number;
  expenses: number;
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash',
  airtelMoney: 'Airtel Money',
  mpamba: 'Mpamba',
  bank: 'Bank',
  credit: 'Credit',
  other: 'Other',
};

function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
}

function MonthlyTrendCard({ rows }: { rows: MonthlyRow[] }) {
  const data = rows.map((r) => ({ ...r, label: monthLabel(r.month) }));
  return (
    <Card className="p-5">
      <div className="text-xs uppercase tracking-wide text-paper-dim mb-4">
        Monthly sales, purchases &amp; expenses
      </div>
      {data.every((d) => d.sales === 0 && d.purchases === 0 && d.expenses === 0) ? (
        <p className="text-sm text-paper-dim">No sales, purchases, or expenses recorded yet.</p>
      ) : (
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A3136" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#A8A398', fontSize: 12 }} axisLine={{ stroke: '#2A3136' }} tickLine={false} />
              <YAxis
                tick={{ fill: '#A8A398', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => (v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v))}
              />
              <Tooltip
                contentStyle={{ background: '#1D2226', border: '1px solid #2A3136', borderRadius: 6, fontSize: 12 }}
                labelStyle={{ color: '#EDE7DA' }}
                formatter={(value: number) => formatMWK(value)}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: '#A8A398' }} />
              <Bar dataKey="sales" name="Sales" fill="#4FAE8C" radius={[3, 3, 0, 0]} />
              <Bar dataKey="purchases" name="Purchases" fill="#C89B3C" radius={[3, 3, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#C1553D" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

export function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [stockAlerts, setStockAlerts] = useState<StockSummaryEntry[]>([]);
  const [cashRows, setCashRows] = useState<CashRow[]>([]);
  const [monthly, setMonthly] = useState<MonthlyRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/summary'),
      api.get('/dashboard/stock-alerts'),
      api.get('/dashboard/cash'),
      api.get('/dashboard/monthly'),
    ])
      .then(([s, alerts, cash, monthlyRes]) => {
        setSummary(s.data);
        setStockAlerts(alerts.data.filter((a: StockSummaryEntry) => a.status !== 'OK'));
        setCashRows(cash.data);
        setMonthly(monthlyRes.data);
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

      <MonthlyTrendCard rows={monthly} />

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
