import { useEffect, useState } from 'react';
import { Printer, FileDown, Table as TableIcon } from 'lucide-react';
import { api, formatINR, formatDate, todayISO, downloadCSV } from '../lib/api';
import { openPrint } from '../lib/print';
import { useI18n } from '../contexts/I18nContext';
import { useToast } from '../contexts/ToastContext';
import { PageHeader, Card, Button, Input, Select, Skeleton, TableWrap, Th, Td, Empty } from '../components/UI';

export default function Reports() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [period, setPeriod] = useState('monthly');
  const [from, setFrom] = useState(todayISO().slice(0, 8) + '01');
  const [to, setTo] = useState(todayISO());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async (p = period, f = from, tt = to) => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ period: p, from: f, to: tt });
      setData(await api(`/api/reports?${q}`));
    } catch (e) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const applyPeriod = (p) => {
    setPeriod(p);
    const today = todayISO();
    if (p === 'daily') { setFrom(today); setTo(today); load(p, today, today); }
    else if (p === 'monthly') { const f = today.slice(0, 8) + '01'; setFrom(f); setTo(today); load(p, f, today); }
    else { const f = today.slice(0, 4) + '-01-01'; setFrom(f); setTo(today); load(p, f, today); }
  };

  const excel = () => {
    if (!data) return;
    const rows = [
      ...(data.income || []).map((r) => ({ type: 'Income', date: r.txn_date, category: r.category, detail: r.description, amount: r.amount })),
      ...(data.expenses || []).map((r) => ({ type: 'Expense', date: r.txn_date, category: r.category, detail: r.item, amount: r.amount })),
      ...(data.maintenance || []).map((r) => ({ type: 'Maintenance', date: r.txn_date, category: r.category, detail: r.item, amount: r.amount })),
      ...(data.purchases || []).map((r) => ({ type: 'Purchase', date: r.txn_date, category: r.category, detail: r.item, amount: r.total })),
    ];
    downloadCSV(`ayzal-report-${data.from}-${data.to}.csv`, rows);
    toast('Excel (CSV) downloaded', 'info');
  };

  const printA4 = () => {
    const q = new URLSearchParams({ type: period, period, from, to, paper: 'a4' });
    openPrint(`/print/report?${q}`);
  };
  const printThermal = () => {
    const q = new URLSearchParams({ type: period, period, from, to, paper: 'thermal' });
    openPrint(`/print/report?${q}`);
  };
  const printPdf = () => {
    const q = new URLSearchParams({ type: period, period, from, to, paper: 'a4' });
    openPrint(`/print/report?${q}`);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Ledger books"
        title={t('nav.reports')}
        subtitle="Daily, monthly and yearly — filter, print, or take away as a sheet."
        actions={
          <>
            <Button variant="ghost" onClick={printA4}><Printer size={14} /> {t('a4')}</Button>
            <Button variant="ghost" onClick={printThermal}><Printer size={14} /> {t('thermal')}</Button>
            <Button variant="ghost" onClick={printPdf}><FileDown size={14} /> {t('btn.pdf')}</Button>
            <Button variant="gold" onClick={excel}><TableIcon size={14} /> {t('btn.excel')}</Button>
          </>
        }
      />

      <Card className="p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex rounded-xl border border-line overflow-hidden">
            {['daily', 'monthly', 'yearly'].map((p) => (
              <button key={p} onClick={() => applyPeriod(p)} className={`px-3 py-2 text-xs font-medium ${
                period === p ? 'bg-teal text-cream' : 'bg-white text-ink/70'
              }`}>{t(`period.${p}`)}</button>
            ))}
          </div>
          <Input type="date" label={t('fields.date')} value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input type="date" label="To" value={to} onChange={(e) => setTo(e.target.value)} />
          <Button onClick={() => load(period, from, to)}>{t('btn.filter')}</Button>
        </div>
      </Card>

      {loading || !data ? <div className="grid sm:grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div> : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <Card className="p-4"><p className="text-[11px] uppercase tracking-wider text-ink/40">{t('income')}</p><p className="font-display text-2xl text-teal mt-1">{formatINR(data.totalIncome)}</p></Card>
            <Card className="p-4"><p className="text-[11px] uppercase tracking-wider text-ink/40">{t('expense')}</p><p className="font-display text-2xl mt-1">{formatINR(data.totalOut)}</p></Card>
            <Card className="p-4"><p className="text-[11px] uppercase tracking-wider text-ink/40">{t('net')}</p><p className={`font-display text-2xl mt-1 ${data.net >= 0 ? 'text-teal' : 'text-coral'}`}>{formatINR(data.net)}</p></Card>
            <Card className="p-4"><p className="text-[11px] uppercase tracking-wider text-ink/40">Range</p><p className="text-sm mt-2">{formatDate(data.from)} — {formatDate(data.to)}</p></Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-4 mb-4">
            <Card className="p-5">
              <p className="font-display text-lg mb-3">Income by category</p>
              {(data.incomeByCategory || []).length === 0 ? <Empty text="No transactions yet" /> : data.incomeByCategory.map((c) => (
                <div key={c.name} className="flex items-center gap-3 mb-2">
                  <span className="text-sm w-36 truncate">{c.name}</span>
                  <div className="flex-1 h-2 rounded-full bg-paper overflow-hidden">
                    <div className="h-full bg-teal" style={{ width: `${(c.amount / (data.totalIncome || 1)) * 100}%` }} />
                  </div>
                  <span className="text-xs tabular-nums w-20 text-right">{formatINR(c.amount)}</span>
                </div>
              ))}
            </Card>
            <Card className="p-5">
              <p className="font-display text-lg mb-3">Outgo by category</p>
              {![...(data.expenseByCategory || []), ...(data.maintenanceByCategory || []), ...(data.purchaseByCategory || [])].length
                ? <Empty text="No expenses yet" />
                : [...(data.expenseByCategory || []), ...(data.maintenanceByCategory || []), ...(data.purchaseByCategory || [])]
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 10)
                .map((c) => (
                  <div key={c.name} className="flex items-center gap-3 mb-2">
                    <span className="text-sm w-36 truncate">{c.name}</span>
                    <div className="flex-1 h-2 rounded-full bg-paper overflow-hidden">
                      <div className="h-full bg-gold" style={{ width: `${(c.amount / (data.totalOut || 1)) * 100}%` }} />
                    </div>
                    <span className="text-xs tabular-nums w-20 text-right">{formatINR(c.amount)}</span>
                  </div>
                ))}
            </Card>
          </div>

          <Card>
            <div className="px-5 py-4 border-b border-line font-display text-lg">Day-wise</div>
            {(data.daily || []).length === 0 ? <Empty text="No transactions yet" /> : (
              <TableWrap>
                <table className="w-full min-w-[640px]">
                  <thead className="bg-paper/80"><tr>
                    <Th>Date</Th><Th className="text-right">Income</Th><Th className="text-right">Expenses</Th>
                    <Th className="text-right">Maintain</Th><Th className="text-right">Purchases</Th><Th className="text-right">Net</Th>
                  </tr></thead>
                  <tbody>
                    {data.daily.map((d) => (
                      <tr key={d.date} className="border-t border-line/80">
                        <Td>{formatDate(d.date)}</Td>
                        <Td className="text-right text-teal">{formatINR(d.income)}</Td>
                        <Td className="text-right">{formatINR(d.expenses)}</Td>
                        <Td className="text-right">{formatINR(d.maintenance)}</Td>
                        <Td className="text-right">{formatINR(d.purchases)}</Td>
                        <Td className={`text-right font-medium ${d.profit >= 0 ? 'text-teal' : 'text-coral'}`}>{formatINR(d.profit)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
