import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { api } from '../../lib/api';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input, Label } from '../../components/Input';
import { PageLoader } from '../../components/Spinner';
import { useToast } from '../../components/Toast';
import { errorMessage } from '../../lib/errors';
import { formatMWK, downloadBlob, localDateStr } from '../../lib/format';

const REPORT_TABS = [
  'Daily sheet',
  'Profit',
  'Product sales',
  'Customer credit',
  'Supplier debt',
  'P&L Statement',
  'Balance Sheet',
  'Capital accounts',
  'Cash book',
] as const;
type ReportTab = (typeof REPORT_TABS)[number];

function todayStr() {
  return localDateStr();
}
function monthAgoStr() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return localDateStr(d);
}

export function ReportsPage() {
  const [tab, setTab] = useState<ReportTab>('Daily sheet');
  const [from, setFrom] = useState(monthAgoStr());
  const [to, setTo] = useState(todayStr());

  const [asOfDate, setAsOfDate] = useState(todayStr());

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-paper">Reports</h1>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 border-b border-panel-border overflow-x-auto">
          {REPORT_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors whitespace-nowrap ${
                tab === t ? 'border-brass text-brass' : 'border-transparent text-paper-dim hover:text-paper'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {(tab === 'Profit' || tab === 'Product sales' || tab === 'P&L Statement' || tab === 'Cash book') && (
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
        {tab === 'Balance Sheet' && (
          <div>
            <Label>As of</Label>
            <Input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} />
          </div>
        )}
      </div>

      {tab === 'Daily sheet' && <DailySheetReport />}
      {tab === 'Profit' && <ProfitReport from={from} to={to} />}
      {tab === 'Product sales' && <ProductSalesReport from={from} to={to} />}
      {tab === 'Customer credit' && <CustomerCreditReport />}
      {tab === 'Supplier debt' && <SupplierDebtReport />}
      {tab === 'P&L Statement' && <PLStatementReport from={from} to={to} />}
      {tab === 'Balance Sheet' && <BalanceSheetReport asOfDate={asOfDate} />}
      {tab === 'Capital accounts' && <CapitalAccountsReport />}
      {tab === 'Cash book' && <CashBookReport from={from} to={to} />}
    </div>
  );
}

function DailySheetReport() {
  const { push } = useToast();
  const [date, setDate] = useState(todayStr());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .get('/reports/daily-sheet', { params: { date } })
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, [date]);

  async function exportExcel() {
    setExporting(true);
    try {
      const res = await api.get('/exports/daily-sheet', { params: { date }, responseType: 'blob' });
      downloadBlob(res.data, `Soche_Bar_Inventory_${date}.xlsx`);
      push('Exported');
    } catch (err) {
      push(errorMessage(err), 'error');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <Label>Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <Button onClick={exportExcel} disabled={exporting}>
          <span className="flex items-center gap-1.5">
            <Download size={15} /> {exporting ? 'Exporting…' : 'Export to Excel'}
          </span>
        </Button>
      </div>

      {loading || !data ? (
        <PageLoader />
      ) : (
        <>
          <Card>
            <div className="grid grid-cols-[2fr_repeat(5,1fr)] gap-2 px-4 py-2 text-xs uppercase tracking-wide text-paper-dim border-b border-panel-border">
              <span>Item</span>
              <span className="text-right">Opening</span>
              <span className="text-right">Purchase</span>
              <span className="text-right">Closing</span>
              <span className="text-right">Sales</span>
              <span className="text-right">Total</span>
            </div>
            {data.items
              .filter((i: any) => i.opening || i.purchase || i.sales || i.closing)
              .map((i: any) => (
                <div key={i.name} className="ledger-row grid grid-cols-[2fr_repeat(5,1fr)] gap-2 px-4 py-2 items-center">
                  <span className="text-sm text-paper">{i.name}</span>
                  <span className="font-mono text-sm text-right text-paper-dim">{i.opening || '—'}</span>
                  <span className="font-mono text-sm text-right text-paper-dim">{i.purchase || '—'}</span>
                  <span className="font-mono text-sm text-right text-paper-dim">{i.closing}</span>
                  <span className="font-mono text-sm text-right text-brass">{i.sales || '—'}</span>
                  <span className="font-mono text-sm text-right">{i.total ? formatMWK(i.total) : '—'}</span>
                </div>
              ))}
            <div className="flex items-center justify-between px-4 py-3 border-t border-panel-border">
              <span className="text-sm font-medium text-paper">Grand Total</span>
              <span className="font-mono text-lg text-brass">{formatMWK(data.grandTotal)}</span>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4">
              <div className="text-xs uppercase tracking-wide text-paper-dim mb-3">Bills today</div>
              {data.bills.length === 0 ? (
                <p className="text-sm text-paper-dim">No credit bills recorded today.</p>
              ) : (
                <div className="space-y-1.5">
                  {data.bills.map((b: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-paper">{b.customerName}</span>
                      <span className="font-mono text-copper">{formatMWK(b.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm pt-2 border-t border-panel-border font-medium">
                    <span className="text-paper">Total bills</span>
                    <span className="font-mono text-copper">{formatMWK(data.billsTotal)}</span>
                  </div>
                </div>
              )}
            </Card>

            <Card className="p-4">
              <div className="text-xs uppercase tracking-wide text-paper-dim mb-3">Cash summary</div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-paper-dim">Opening cash</span>
                  <span className="font-mono text-paper">{formatMWK(data.openingCash)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-paper-dim">Cash collected</span>
                  <span className="font-mono text-ledger">{formatMWK(data.cashCollected)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-paper-dim">Bills paid</span>
                  <span className="font-mono text-ledger">{formatMWK(data.billsPaid)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-paper-dim">Zochoka (expenses)</span>
                  <span className="font-mono text-copper">{formatMWK(data.expenses)}</span>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}
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

function PLStatementReport({ from, to }: { from: string; to: string }) {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    setData(null);
    api.get('/reports/pl-statement', { params: { from, to } }).then((r) => setData(r.data));
  }, [from, to]);

  if (!data) return <PageLoader />;

  return (
    <div className="space-y-4">
      <Card>
        <div className="ledger-row flex items-center justify-between px-4 py-3">
          <span className="text-sm text-paper">Sales</span>
          <span className="font-mono text-sm text-paper">{formatMWK(data.sales)}</span>
        </div>
        <div className="px-4 py-2 text-xs uppercase tracking-wide text-paper-dim border-t border-panel-border">
          Cost of sales
        </div>
        <div className="ledger-row flex items-center justify-between px-4 py-2 pl-8">
          <span className="text-sm text-paper-dim">Opening stock</span>
          <span className="font-mono text-sm text-paper-dim">{formatMWK(data.costOfSales.opening)}</span>
        </div>
        <div className="ledger-row flex items-center justify-between px-4 py-2 pl-8">
          <span className="text-sm text-paper-dim">+ Purchases</span>
          <span className="font-mono text-sm text-paper-dim">{formatMWK(data.costOfSales.purchases)}</span>
        </div>
        <div className="ledger-row flex items-center justify-between px-4 py-2 pl-8">
          <span className="text-sm text-paper-dim">− Closing stock</span>
          <span className="font-mono text-sm text-paper-dim">{formatMWK(data.costOfSales.closing)}</span>
        </div>
        <div className="ledger-row flex items-center justify-between px-4 py-3">
          <span className="text-sm text-paper">Cost of sales</span>
          <span className="font-mono text-sm text-copper">{formatMWK(data.costOfSales.total)}</span>
        </div>
        <div className="ledger-row flex items-center justify-between px-4 py-3">
          <span className="text-sm font-medium text-paper">Gross profit</span>
          <span className="font-mono text-sm text-brass">{formatMWK(data.grossProfit)}</span>
        </div>
      </Card>

      <Card>
        <div className="px-4 py-2 text-xs uppercase tracking-wide text-paper-dim">Expenses</div>
        {data.expenses.map((e: any) => (
          <div key={e.category} className="ledger-row flex items-center justify-between px-4 py-2">
            <span className="text-sm text-paper-dim">{e.category}</span>
            <span className="font-mono text-sm text-copper">{formatMWK(e.amount)}</span>
          </div>
        ))}
        <div className="ledger-row flex items-center justify-between px-4 py-3">
          <span className="text-sm text-paper">Total expenses</span>
          <span className="font-mono text-sm text-copper">{formatMWK(data.totalExpenses)}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-panel-border">
          <span className="text-sm font-medium text-paper">Net profit</span>
          <span className={`font-mono text-lg ${data.netProfit >= 0 ? 'text-ledger' : 'text-copper'}`}>
            {formatMWK(data.netProfit)}
          </span>
        </div>
      </Card>
    </div>
  );
}

function BalanceSheetReport({ asOfDate }: { asOfDate: string }) {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    setData(null);
    api.get('/reports/balance-sheet', { params: { asOfDate } }).then((r) => setData(r.data));
  }, [asOfDate]);

  if (!data) return <PageLoader />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <div className="px-4 py-2 text-xs uppercase tracking-wide text-paper-dim">Non-current assets</div>
        {data.nonCurrentAssets.fixedAssets.map((a: any) => (
          <div key={a.id} className="ledger-row flex items-center justify-between px-4 py-2">
            <span className="text-sm text-paper-dim">{a.name}</span>
            <span className="font-mono text-sm text-paper">{formatMWK(a.cost)}</span>
          </div>
        ))}
        <div className="ledger-row flex items-center justify-between px-4 py-3">
          <span className="text-sm text-paper">Total non-current assets</span>
          <span className="font-mono text-sm text-brass">{formatMWK(data.nonCurrentAssets.total)}</span>
        </div>

        <div className="px-4 py-2 text-xs uppercase tracking-wide text-paper-dim border-t border-panel-border">
          Current assets
        </div>
        <div className="ledger-row flex items-center justify-between px-4 py-2">
          <span className="text-sm text-paper-dim">Stock</span>
          <span className="font-mono text-sm text-paper">{formatMWK(data.currentAssets.stock)}</span>
        </div>
        {data.currentAssets.cash.accounts.map((c: any) => (
          <div key={c.name} className="ledger-row flex items-center justify-between px-4 py-2">
            <span className="text-sm text-paper-dim">{c.name}</span>
            <span className="font-mono text-sm text-paper">{formatMWK(c.balance)}</span>
          </div>
        ))}
        <div className="ledger-row flex items-center justify-between px-4 py-2">
          <span className="text-sm text-paper-dim">Customer receivables</span>
          <span className="font-mono text-sm text-paper">{formatMWK(data.currentAssets.receivables)}</span>
        </div>
        <div className="ledger-row flex items-center justify-between px-4 py-3">
          <span className="text-sm text-paper">Total current assets</span>
          <span className="font-mono text-sm text-brass">{formatMWK(data.currentAssets.total)}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-panel-border">
          <span className="text-sm font-medium text-paper">Total assets</span>
          <span className="font-mono text-lg text-brass">{formatMWK(data.totalAssets)}</span>
        </div>
      </Card>

      <Card>
        <div className="px-4 py-2 text-xs uppercase tracking-wide text-paper-dim">Liabilities</div>
        {data.liabilities.payables.map((p: any) => (
          <div key={p.supplier} className="ledger-row flex items-center justify-between px-4 py-2">
            <span className="text-sm text-paper-dim">{p.supplier}</span>
            <span className="font-mono text-sm text-copper">{formatMWK(p.outstanding)}</span>
          </div>
        ))}
        <div className="ledger-row flex items-center justify-between px-4 py-3">
          <span className="text-sm text-paper">Total liabilities</span>
          <span className="font-mono text-sm text-copper">{formatMWK(data.liabilities.total)}</span>
        </div>

        <div className="px-4 py-2 text-xs uppercase tracking-wide text-paper-dim border-t border-panel-border">
          Equity
        </div>
        {data.equity.capitalAccounts.map((c: any) => (
          <div key={c.partner} className="ledger-row flex items-center justify-between px-4 py-2">
            <span className="text-sm text-paper-dim">{c.partner} capital</span>
            <span className="font-mono text-sm text-paper">{formatMWK(c.balance)}</span>
          </div>
        ))}
        <div className="ledger-row flex items-center justify-between px-4 py-2">
          <span className="text-sm text-paper-dim">Retained earnings</span>
          <span className="font-mono text-sm text-paper">{formatMWK(data.equity.retainedEarnings)}</span>
        </div>
        <div className="ledger-row flex items-center justify-between px-4 py-3">
          <span className="text-sm text-paper">Total equity</span>
          <span className="font-mono text-sm text-brass">{formatMWK(data.equity.total)}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-panel-border">
          <span className="text-sm font-medium text-paper">Total liabilities & equity</span>
          <span className="font-mono text-lg text-brass">{formatMWK(data.totalLiabilitiesAndEquity)}</span>
        </div>
        {Math.abs(data.checkDifference) > 1 && (
          <div className="px-4 py-2 text-xs text-copper border-t border-panel-border">
            Doesn't balance — difference of {formatMWK(data.checkDifference)}
          </div>
        )}
      </Card>
    </div>
  );
}

function CapitalAccountsReport() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    api.get('/reports/capital-accounts').then((r) => setRows(r.data));
  }, []);
  if (!rows) return <PageLoader />;
  return (
    <Card>
      <div className="grid grid-cols-[2fr_repeat(3,1fr)] gap-2 px-4 py-2 text-xs uppercase tracking-wide text-paper-dim border-b border-panel-border">
        <span>Partner</span>
        <span className="text-right">Contributions</span>
        <span className="text-right">Drawings</span>
        <span className="text-right">Balance</span>
      </div>
      {rows.map((r) => (
        <div key={r.partner} className="ledger-row grid grid-cols-[2fr_repeat(3,1fr)] gap-2 px-4 py-3 items-center">
          <span className="text-sm text-paper">{r.partner}</span>
          <span className="font-mono text-sm text-right text-ledger">{formatMWK(r.contributions)}</span>
          <span className="font-mono text-sm text-right text-copper">{formatMWK(r.drawings)}</span>
          <span className="font-mono text-sm text-right text-brass">{formatMWK(r.balance)}</span>
        </div>
      ))}
      {rows.length === 0 && <p className="text-sm text-paper-dim text-center py-8">No partners recorded yet.</p>}
    </Card>
  );
}

function CashBookReport({ from, to }: { from: string; to: string }) {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    setRows(null);
    api.get('/reports/cash-book', { params: { from, to } }).then((r) => setRows(r.data));
  }, [from, to]);
  if (!rows) return <PageLoader />;
  return (
    <Card>
      <div className="grid grid-cols-[2fr_repeat(4,1fr)] gap-2 px-4 py-2 text-xs uppercase tracking-wide text-paper-dim border-b border-panel-border">
        <span>Account</span>
        <span className="text-right">Opening</span>
        <span className="text-right">In</span>
        <span className="text-right">Out</span>
        <span className="text-right">Closing</span>
      </div>
      {rows.map((r) => (
        <div key={r.account} className="ledger-row grid grid-cols-[2fr_repeat(4,1fr)] gap-2 px-4 py-3 items-center">
          <span className="text-sm text-paper">{r.account}</span>
          <span className="font-mono text-sm text-right text-paper-dim">{formatMWK(r.openingBalance)}</span>
          <span className="font-mono text-sm text-right text-ledger">{formatMWK(r.totalIn)}</span>
          <span className="font-mono text-sm text-right text-copper">{formatMWK(r.totalOut)}</span>
          <span className="font-mono text-sm text-right text-brass">{formatMWK(r.closingBalance)}</span>
        </div>
      ))}
      {rows.length === 0 && <p className="text-sm text-paper-dim text-center py-8">No cash accounts set up yet.</p>}
    </Card>
  );
}
