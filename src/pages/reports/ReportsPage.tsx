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
  'Bills',
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
  const [billsDate, setBillsDate] = useState(todayStr());

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
      {tab === 'Bills' && <BillsReport date={billsDate} setDate={setBillsDate} />}
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

function ExportButton({ onClick, label = 'Export to Excel' }: { onClick: () => void; label?: string }) {
  const [exporting, setExporting] = useState(false);
  const { push } = useToast();
  async function run() {
    setExporting(true);
    try {
      await onClick();
      push('Exported');
    } catch (err) {
      push(errorMessage(err), 'error');
    } finally {
      setExporting(false);
    }
  }
  return (
    <Button onClick={run} disabled={exporting} variant="secondary">
      <span className="flex items-center gap-1.5">
        <Download size={15} /> {exporting ? 'Exporting…' : label}
      </span>
    </Button>
  );
}

function BillsReport({ date, setDate }: { date: string; setDate: (d: string) => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get('/reports/bills', { params: { date } })
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, [date]);

  async function exportExcel() {
    const res = await api.get('/exports/bills', { params: { date }, responseType: 'blob' });
    downloadBlob(res.data, `Sochebar_Bills_${date}.xlsx`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <Label>Day</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <ExportButton onClick={exportExcel} />
      </div>

      {loading || !data ? (
        <PageLoader />
      ) : (
        <>
          <Card>
            <div className="grid grid-cols-[2fr_1fr_2fr_1fr] gap-2 px-4 py-2 text-xs uppercase tracking-wide text-paper-dim border-b border-panel-border">
              <span>Customer</span>
              <span>Invoice #</span>
              <span>Note</span>
              <span className="text-right">Amount</span>
            </div>
            {data.bills.map((b: any) => (
              <div key={b.id} className="ledger-row grid grid-cols-[2fr_1fr_2fr_1fr] gap-2 px-4 py-2.5 items-center">
                <span className="text-sm text-paper">{b.customerName}</span>
                <span className="text-xs text-paper-dim font-mono">{b.invoiceNumber}</span>
                <span className="text-xs text-paper-dim">{b.comment ?? '—'}</span>
                <span className="font-mono text-sm text-right text-copper">{formatMWK(b.amount)}</span>
              </div>
            ))}
            {data.bills.length === 0 && (
              <p className="text-sm text-paper-dim text-center py-8">No bills recorded on {date}.</p>
            )}
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4 flex items-center justify-between">
              <span className="text-sm text-paper-dim">Total bills on {date}</span>
              <span className="font-mono text-lg text-copper">{formatMWK(data.dayTotal)}</span>
            </Card>
            <Card className="p-4 flex items-center justify-between">
              <span className="text-sm text-paper-dim">All bills to date (through {date})</span>
              <span className="font-mono text-lg text-brass">{formatMWK(data.cumulativeTotal)}</span>
            </Card>
          </div>
        </>
      )}
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

  async function exportExcel() {
    const res = await api.get('/exports/profit', { params: { from, to }, responseType: 'blob' });
    downloadBlob(res.data, `Sochebar_Profit_${from}_${to}.xlsx`);
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <ExportButton onClick={exportExcel} />
      </div>
      <Card>
        {rows.map(([label, value, cls]) => (
          <div key={label} className="ledger-row flex items-center justify-between px-4 py-3">
            <span className="text-sm text-paper-dim">{label}</span>
            <span className={`font-mono text-sm ${cls}`}>{formatMWK(value)}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

function ProductSalesReport({ from, to }: { from: string; to: string }) {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    setRows(null);
    api.get('/reports/sales', { params: { from, to } }).then((r) => setRows(r.data));
  }, [from, to]);

  if (!rows) return <PageLoader />;

  async function exportExcel() {
    const res = await api.get('/exports/product-sales', { params: { from, to }, responseType: 'blob' });
    downloadBlob(res.data, `Sochebar_Product_Sales_${from}_${to}.xlsx`);
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <ExportButton onClick={exportExcel} />
      </div>
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
    </div>
  );
}

function CustomerCreditReport() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  useEffect(() => {
    api.get('/reports/customer-credit').then((r) => setRows(r.data));
  }, []);
  if (!rows) return <PageLoader />;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function exportExcel(scope: 'all' | 'selected') {
    const ids = scope === 'selected' ? [...selected] : undefined;
    const res = await api.get('/exports/customer-credit', {
      params: ids?.length ? { customerIds: ids.join(',') } : undefined,
      responseType: 'blob',
    });
    downloadBlob(res.data, `Sochebar_Customer_Credit_${scope === 'selected' ? `Selected_${ids!.length}` : 'All'}.xlsx`);
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        {selected.size > 0 && <ExportButton onClick={() => exportExcel('selected')} label={`Export selected (${selected.size})`} />}
        <ExportButton onClick={() => exportExcel('all')} label="Export all to Excel" />
      </div>
      <Card>
        {rows.map((r) => (
          <div key={r.customerId ?? r.customer} className="ledger-row flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              {r.customerId && (
                <input
                  type="checkbox"
                  checked={selected.has(r.customerId)}
                  onChange={() => toggle(r.customerId)}
                  className="accent-brass"
                />
              )}
              <span className="text-sm text-paper">{r.customer}</span>
            </div>
            <div className="flex gap-4 font-mono text-sm">
              <span className="text-paper-dim">Sales {formatMWK(r.creditSales)}</span>
              <span className="text-copper">Owes {formatMWK(r.outstanding)}</span>
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-paper-dim text-center py-8">No outstanding customer credit.</p>}
      </Card>
    </div>
  );
}

function SupplierDebtReport() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    api.get('/reports/supplier-credit').then((r) => setRows(r.data));
  }, []);
  if (!rows) return <PageLoader />;

  async function exportExcel() {
    const res = await api.get('/exports/supplier-credit', { responseType: 'blob' });
    downloadBlob(res.data, `Sochebar_Supplier_Debt.xlsx`);
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <ExportButton onClick={exportExcel} />
      </div>
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
    </div>
  );
}

function PLStatementReport({ from, to }: { from: string; to: string }) {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    setData(null);
    api.get('/reports/pl-statement', { params: { from, to } }).then((r) => setData(r.data));
  }, [from, to]);

  if (!data) return <PageLoader />;

  async function exportExcel() {
    const res = await api.get('/exports/pl-statement', { params: { from, to }, responseType: 'blob' });
    downloadBlob(res.data, `Sochebar_PL_Statement_${from}_${to}.xlsx`);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ExportButton onClick={exportExcel} />
      </div>
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

  async function exportExcel() {
    const res = await api.get('/exports/balance-sheet', { params: asOfDate ? { asOfDate } : undefined, responseType: 'blob' });
    downloadBlob(res.data, `Sochebar_Balance_Sheet_${asOfDate || 'current'}.xlsx`);
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <ExportButton onClick={exportExcel} />
      </div>
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
    </div>
  );
}

function CapitalAccountsReport() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    api.get('/reports/capital-accounts').then((r) => setRows(r.data));
  }, []);
  if (!rows) return <PageLoader />;

  async function exportExcel() {
    const res = await api.get('/exports/capital-accounts', { responseType: 'blob' });
    downloadBlob(res.data, `Sochebar_Capital_Accounts.xlsx`);
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <ExportButton onClick={exportExcel} />
      </div>
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
    </div>
  );
}

function CashBookReport({ from, to }: { from: string; to: string }) {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    setRows(null);
    api.get('/reports/cash-book', { params: { from, to } }).then((r) => setRows(r.data));
  }, [from, to]);
  if (!rows) return <PageLoader />;

  async function exportExcel() {
    const res = await api.get('/exports/cash-book', { params: { from, to }, responseType: 'blob' });
    downloadBlob(res.data, `Sochebar_Cash_Book_${from}_${to}.xlsx`);
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <ExportButton onClick={exportExcel} />
      </div>
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
    </div>
  );
}
