import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card } from '../../components/Card';
import { Input, Label } from '../../components/Input';
import { PageLoader } from '../../components/Spinner';
import { formatMWK } from '../../lib/format';

const REPORT_TABS = ['Profit', 'Product sales', 'Customer credit', 'Supplier debt'] as const;
type ReportTab = (typeof REPORT_TABS)[number];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function monthAgoStr() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
}

export function ReportsPage() {
  const [tab, setTab] = useState<ReportTab>('Profit');
  const [from, setFrom] = useState(monthAgoStr());
  const [to, setTo] = useState(todayStr());

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-paper">Reports</h1>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 border-b border-panel-border">
          {REPORT_TABS.map((t) => (
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
        {(tab === 'Profit' || tab === 'Product sales') && (
          <div className="flex items-end gap-2">
            <div>
              <Label>From</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <Label>To</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
        )}
      </div>

      {tab === 'Profit' && <ProfitReport from={from} to={to} />}
      {tab === 'Product sales' && <ProductSalesReport from={from} to={to} />}
      {tab === 'Customer credit' && <CustomerCreditReport />}
      {tab === 'Supplier debt' && <SupplierDebtReport />}
    </div>
  );
}

function ProfitReport({ from, to }: { from: string; to: string }) {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    setData(null);
    api.get('/reports/profit', { params: { from, to } }).then((r) => setData(r.data));
  }, [from, to]);

  if (!data) return <PageLoader />;

  const rows = [
    ['Revenue', data.revenue, 'text-paper'],
    ['Cost of goods sold', -data.cogs, 'text-copper'],
    ['Gross profit', data.grossProfit, 'text-brass'],
    ['Operating expenses', -data.operatingExpenses, 'text-copper'],
    ['Net profit', data.netProfit, data.netProfit >= 0 ? 'text-ledger' : 'text-copper'],
  ] as const;

  return (
    <Card>
      {rows.map(([label, value, cls]) => (
        <div key={label} className="ledger-row flex items-center justify-between px-4 py-3">
          <span className="text-sm text-paper-dim">{label}</span>
          <span className={`font-mono text-sm ${cls}`}>{formatMWK(value)}</span>
        </div>
      ))}
    </Card>
  );
}

function ProductSalesReport({ from, to }: { from: string; to: string }) {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    setRows(null);
    api.get('/reports/sales', { params: { from, to } }).then((r) => setRows(r.data));
  }, [from, to]);

  if (!rows) return <PageLoader />;

  return (
    <Card>
      <div className="grid grid-cols-[2fr_repeat(4,1fr)] gap-2 px-4 py-2 text-xs uppercase tracking-wide text-paper-dim border-b border-panel-border">
        <span>Product</span>
        <span className="text-right">Qty</span>
        <span className="text-right">Revenue</span>
        <span className="text-right">Gross profit</span>
        <span className="text-right">Margin</span>
      </div>
      {rows.map((r) => (
        <div key={r.productId} className="ledger-row grid grid-cols-[2fr_repeat(4,1fr)] gap-2 px-4 py-2.5 items-center">
          <span className="text-sm text-paper">{r.name}</span>
          <span className="font-mono text-sm text-right text-paper-dim">{r.qty}</span>
          <span className="font-mono text-sm text-right">{formatMWK(r.revenue)}</span>
          <span className="font-mono text-sm text-right text-ledger">{formatMWK(r.grossProfit)}</span>
          <span className="font-mono text-sm text-right text-paper-dim">{r.marginPercent}%</span>
        </div>
      ))}
      {rows.length === 0 && <p className="text-sm text-paper-dim text-center py-8">No sales in this period.</p>}
    </Card>
  );
}

function CustomerCreditReport() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    api.get('/reports/customer-credit').then((r) => setRows(r.data));
  }, []);
  if (!rows) return <PageLoader />;
  return (
    <Card>
      {rows.map((r) => (
        <div key={r.customer} className="ledger-row flex items-center justify-between px-4 py-3">
          <span className="text-sm text-paper">{r.customer}</span>
          <div className="flex gap-4 font-mono text-sm">
            <span className="text-paper-dim">Sales {formatMWK(r.creditSales)}</span>
            <span className="text-copper">Owes {formatMWK(r.outstanding)}</span>
          </div>
        </div>
      ))}
      {rows.length === 0 && <p className="text-sm text-paper-dim text-center py-8">No outstanding customer credit.</p>}
    </Card>
  );
}

function SupplierDebtReport() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    api.get('/reports/supplier-credit').then((r) => setRows(r.data));
  }, []);
  if (!rows) return <PageLoader />;
  return (
    <Card>
      {rows.map((r) => (
        <div key={r.supplier} className="ledger-row flex items-center justify-between px-4 py-3">
          <span className="text-sm text-paper">{r.supplier}</span>
          <div className="flex gap-4 font-mono text-sm">
            <span className="text-paper-dim">Purchases {formatMWK(r.purchases)}</span>
            <span className="text-copper">Owed {formatMWK(r.outstanding)}</span>
          </div>
        </div>
      ))}
      {rows.length === 0 && <p className="text-sm text-paper-dim text-center py-8">No outstanding supplier debt.</p>}
    </Card>
  );
}
