import { useEffect, useState } from 'react';
import { api, formatINR, formatDate, todayISO } from '../lib/api';
import { openPrint } from '../lib/print';
import { useI18n } from '../contexts/I18nContext';
import { useToast } from '../contexts/ToastContext';
import { PageHeader, Card, Button, Input, Skeleton } from '../components/UI';

export default function Profit() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [from, setFrom] = useState(todayISO().slice(0, 4) + '-01-01');
  const [to, setTo] = useState(todayISO());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setData(await api(`/api/reports?period=yearly&from=${from}&to=${to}`));
    } catch (e) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  return (
    <div>
      <PageHeader
        eyebrow="The closing figure"
        title={t('nav.profit')}
        subtitle="Total income − total expenses (including maintenance & purchases) = net."
        actions={<Button onClick={() => openPrint(`/print/report?type=profit&period=yearly&from=${from}&to=${to}&paper=a4`)}>Print statement</Button>}
      />

      <Card className="p-4 mb-4 flex flex-wrap gap-3 items-end">
        <Input type="date" label="From" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input type="date" label="To" value={to} onChange={(e) => setTo(e.target.value)} />
        <Button onClick={load}>{t('btn.filter')}</Button>
      </Card>

      {loading || !data ? <Skeleton className="h-72" /> : (
        <div className="grid lg:grid-cols-5 gap-4">
          <Card className="lg:col-span-3 p-6 sm:p-8">
            <p className="text-[11px] uppercase tracking-[0.2em] text-teal font-semibold">Statement of profit & loss</p>
            <p className="font-display text-2xl mt-1">Ayzal Kidz Care Hospital</p>
            <p className="text-sm text-ink/50">{formatDate(data.from)} — {formatDate(data.to)}</p>

            <div className="mt-8 space-y-0 text-sm">
              {[
                ['Consultation, pharmacy, lab & ward income', data.totalIncome, false],
                ['Operating expenses', -data.totalExpenses, true],
                ['Cleaning & maintenance', -data.totalMaintenance, true],
                ['Hospital purchases', -data.totalPurchases, true],
              ].map(([label, amt]) => (
                <div key={label} className="flex justify-between py-3 border-b border-line">
                  <span className="text-ink/70">{label}</span>
                  <span className={`tabular-nums ${amt < 0 ? 'text-ink/80' : 'text-teal font-medium'}`}>{formatINR(amt)}</span>
                </div>
              ))}
              <div className="flex justify-between py-5">
                <span className="font-display text-xl">{t('net')}</span>
                <span className={`font-display text-3xl tabular-nums ${data.net >= 0 ? 'text-teal' : 'text-coral'}`}>{formatINR(data.net)}</span>
              </div>
            </div>
            <p className="text-xs text-ink/40 mt-4">Automatically calculated. No manual override.</p>
          </Card>

          <div className="lg:col-span-2 space-y-3">
            <Card className="p-5 bg-teal text-cream">
              <p className="text-[11px] uppercase tracking-wider text-cream/70">Income</p>
              <p className="font-display text-3xl mt-2">{formatINR(data.totalIncome)}</p>
            </Card>
            <Card className="p-5">
              <p className="text-[11px] uppercase tracking-wider text-ink/40">All outgo</p>
              <p className="font-display text-3xl mt-2">{formatINR(data.totalOut)}</p>
              <ul className="mt-3 text-xs text-ink/55 space-y-1">
                <li className="flex justify-between"><span>Expenses</span><span>{formatINR(data.totalExpenses)}</span></li>
                <li className="flex justify-between"><span>Maintenance</span><span>{formatINR(data.totalMaintenance)}</span></li>
                <li className="flex justify-between"><span>Purchases</span><span>{formatINR(data.totalPurchases)}</span></li>
              </ul>
            </Card>
            <Card className={`p-5 ${data.net >= 0 ? '' : 'border-coral/40'}`}>
              <p className="text-[11px] uppercase tracking-wider text-ink/40">{data.net >= 0 ? 'Surplus for the period' : 'Deficit for the period'}</p>
              <p className={`font-display text-3xl mt-2 ${data.net >= 0 ? 'text-teal' : 'text-coral'}`}>{formatINR(Math.abs(data.net))}</p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
