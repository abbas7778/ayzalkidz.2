import { useEffect, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Stethoscope, Users, TrendingUp, Wallet, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { api, formatINR, formatDate, greeting, todayISO, PAYMENT_MODES, MAINT_CATS } from '../lib/api';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Card, Empty, Skeleton, TableWrap, Th, Td, Button, Input, Select } from '../components/UI';

const EMPTY_DASH = {
  today: todayISO(),
  todayIncome: 0,
  todayExpense: 0,
  todayProfit: 0,
  monthlyIncome: 0,
  monthlyExpense: 0,
  monthlyProfit: 0,
  doctors: 0,
  staff: 0,
  activeDoctors: 0,
  activeStaff: 0,
  series: [],
  recent: [],
  recentIncome: [],
  recentExpenses: [],
};

function Kpi({ label, value, hint, icon: Icon, tone = 'teal' }) {
  const tones = {
    teal: 'from-teal to-teal-deep text-cream',
    gold: 'from-gold to-[#b8934a] text-ink',
    cream: 'from-white to-paper text-ink border border-line',
    coral: 'from-[#f4d6cf] to-white text-ink border border-line',
  };
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`rounded-2xl p-4 sm:p-5 bg-gradient-to-br shadow-card ${tones[tone] || tones.cream}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] opacity-70">{label}</p>
          <p className="font-display text-2xl sm:text-[28px] mt-2 leading-none tabular-nums">{value}</p>
          {hint && <p className="text-[11px] mt-2 opacity-60">{hint}</p>}
        </div>
        {Icon && <div className="h-9 w-9 rounded-xl bg-black/10 grid place-items-center"><Icon size={16} /></div>}
      </div>
    </motion.div>
  );
}

function Bars({ series }) {
  const list = Array.isArray(series) ? series.filter((s) => s && s.month) : [];
  const nums = list.flatMap((s) => [Number(s.income) || 0, Number(s.expense) || 0]);
  const hasActivity = nums.some((n) => n !== 0);
  if (!list.length || !hasActivity) {
    return <p className="text-sm text-ink/45 py-16 text-center">No transactions yet</p>;
  }
  const max = Math.max(1, ...nums);
  return (
    <div className="flex items-end gap-3 sm:gap-5 h-48 pt-4">
      {list.map((s) => (
        <div key={s.month} className="flex-1 flex flex-col items-center gap-2">
          <div className="w-full flex items-end justify-center gap-1 h-36">
            <div className="w-[42%] rounded-t-md bg-teal min-h-[2px]" style={{ height: `${((Number(s.income) || 0) / max) * 100}%` }} title={`Income ${s.income}`} />
            <div className="w-[42%] rounded-t-md bg-gold min-h-[2px]" style={{ height: `${((Number(s.expense) || 0) / max) * 100}%` }} title={`Expense ${s.expense}`} />
          </div>
          <span className="text-[10px] text-ink/45">{String(s.month).slice(5)}/{String(s.month).slice(2, 4)}</span>
        </div>
      ))}
    </div>
  );
}

function Spark({ series }) {
  const list = Array.isArray(series) ? series.filter((s) => s && s.month) : [];
  const vals = list.map((s) => Number(s.profit) || 0);
  if (!list.length || !vals.some((n) => n !== 0)) {
    return <p className="text-sm text-ink/45 py-16 text-center">No transactions yet</p>;
  }
  const min = Math.min(0, ...vals);
  const max = Math.max(1, ...vals);
  const w = 520, h = 160, p = 12;
  const pts = vals.map((v, i) => {
    const x = p + (i * (w - p * 2)) / Math.max(1, vals.length - 1);
    const y = h - p - ((v - min) / (max - min || 1)) * (h - p * 2);
    return [x, y];
  });
  const d = pts.map((pt, i) => `${i ? 'L' : 'M'}${pt[0]},${pt[1]}`).join(' ');
  const last = pts[pts.length - 1] || [0, h - p];
  const first = pts[0] || [0, h - p];
  const area = `${d} L${last[0]},${h - p} L${first[0]},${h - p} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-44">
      <defs>
        <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1F6F69" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#1F6F69" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#pg)" />
      <path d={d} fill="none" stroke="#1F6F69" strokeWidth="2.4" strokeLinejoin="round" />
      {pts.map((pt, i) => <circle key={i} cx={pt[0]} cy={pt[1]} r="3.2" fill="#C4A35A" stroke="#fff" strokeWidth="1.5" />)}
    </svg>
  );
}

export default function Dashboard() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState(EMPTY_DASH);
  const [loading, setLoading] = useState(true);
  const [incomeCats, setIncomeCats] = useState([]);
  const [expenseCats, setExpenseCats] = useState([]);
  const [busy, setBusy] = useState('');

  const [incForm, setIncForm] = useState({ txn_date: todayISO(), category: '', description: '', amount: '', payment_mode: 'Cash' });
  const [expForm, setExpForm] = useState({ txn_date: todayISO(), category: '', item: '', amount: '', payment_mode: 'Cash' });
  const [mntForm, setMntForm] = useState({ txn_date: todayISO(), category: 'Cleaning Material', item: '', amount: '', payment_mode: 'Cash' });

  const load = async () => {
    try {
      const dash = await api('/api/dashboard');
      setData({
        ...EMPTY_DASH,
        ...(dash && typeof dash === 'object' ? dash : {}),
        todayIncome: Number(dash?.todayIncome) || 0,
        todayExpense: Number(dash?.todayExpense) || 0,
        todayProfit: Number(dash?.todayProfit) || 0,
        monthlyIncome: Number(dash?.monthlyIncome) || 0,
        monthlyExpense: Number(dash?.monthlyExpense) || 0,
        monthlyProfit: Number(dash?.monthlyProfit) || 0,
        doctors: Number(dash?.doctors) || 0,
        staff: Number(dash?.staff) || 0,
        activeDoctors: Number(dash?.activeDoctors) || 0,
        activeStaff: Number(dash?.activeStaff) || 0,
        series: Array.isArray(dash?.series) ? dash.series : [],
        recent: Array.isArray(dash?.recent) ? dash.recent : [],
        recentIncome: Array.isArray(dash?.recentIncome) ? dash.recentIncome : [],
        recentExpenses: Array.isArray(dash?.recentExpenses) ? dash.recentExpenses : [],
      });
    } catch {
      setData({ ...EMPTY_DASH });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    api('/api/categories')
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : [];
        setIncomeCats(list.filter((c) => c.kind === 'income'));
        setExpenseCats(list.filter((c) => c.kind === 'expense'));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (incomeCats[0] && !incForm.category) setIncForm((f) => ({ ...f, category: incomeCats[0].name }));
  }, [incomeCats]);
  useEffect(() => {
    if (expenseCats[0] && !expForm.category) setExpForm((f) => ({ ...f, category: expenseCats[0].name }));
  }, [expenseCats]);

  const submitIncome = async (e) => {
    e.preventDefault();
    if (!incForm.amount || Number(incForm.amount) <= 0) { toast('Enter a valid amount', 'error'); return; }
    if (!incForm.category) { toast('Choose a category', 'error'); return; }
    setBusy('income');
    try {
      await api('/api/income', { method: 'POST', body: JSON.stringify(incForm) });
      toast('Income recorded');
      setIncForm((f) => ({ ...f, description: '', amount: '' }));
      await load();
    } catch (err) { toast(err.message || 'Could not save', 'error'); }
    finally { setBusy(''); }
  };

  const submitExpense = async (e) => {
    e.preventDefault();
    if (!expForm.amount || Number(expForm.amount) <= 0) { toast('Enter a valid amount', 'error'); return; }
    if (!expForm.category) { toast('Choose a category', 'error'); return; }
    setBusy('expense');
    try {
      await api('/api/expenses', { method: 'POST', body: JSON.stringify(expForm) });
      toast('Expense recorded');
      setExpForm((f) => ({ ...f, item: '', amount: '' }));
      await load();
    } catch (err) { toast(err.message || 'Could not save', 'error'); }
    finally { setBusy(''); }
  };

  const submitMaint = async (e) => {
    e.preventDefault();
    if (!mntForm.amount || Number(mntForm.amount) <= 0) { toast('Enter a valid amount', 'error'); return; }
    setBusy('maint');
    try {
      await api('/api/maintenance', { method: 'POST', body: JSON.stringify(mntForm) });
      toast('Maintenance recorded');
      setMntForm((f) => ({ ...f, item: '', amount: '' }));
      await load();
    } catch (err) { toast(err.message || 'Could not save', 'error'); }
    finally { setBusy(''); }
  };

  const g = typeof greeting === 'function' ? greeting() : 'morning';
  const firstName = (profile?.name || 'Team').split(' ')[0];

  if (loading) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
        <div className="grid lg:grid-cols-2 gap-4"><Skeleton className="h-64" /><Skeleton className="h-64" /></div>
      </div>
    );
  }

  const recentIncome = Array.isArray(data.recentIncome) ? data.recentIncome : [];
  const recentExpenses = Array.isArray(data.recentExpenses) ? data.recentExpenses : [];

  return (
    <div>
      <div className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.22em] text-teal font-semibold">{t('greet.' + g)}</p>
        <h1 className="font-display text-2xl sm:text-3xl text-ink mt-1">{firstName}, the ledger is open.</h1>
        <p className="text-sm text-ink/50 mt-1">{formatDate(data.today)} · Tharad desk</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <Kpi label={t('kpi.todayIncome')} value={formatINR(data.todayIncome)} icon={ArrowUpRight} tone="teal" />
        <Kpi label={t('kpi.todayExpense')} value={formatINR(data.todayExpense)} icon={ArrowDownRight} tone="gold" />
        <Kpi label={t('kpi.todayProfit')} value={formatINR(data.todayProfit)} icon={TrendingUp} tone={data.todayProfit >= 0 ? 'cream' : 'coral'} />
        <Kpi label={t('kpi.monthIncome')} value={formatINR(data.monthlyIncome)} icon={Wallet} tone="cream" />
        <Kpi label={t('kpi.monthExpense')} value={formatINR(data.monthlyExpense)} tone="cream" />
        <Kpi label={t('kpi.monthProfit')} value={formatINR(data.monthlyProfit)} tone={data.monthlyProfit >= 0 ? 'cream' : 'coral'} />
        <Kpi label={t('kpi.doctors')} value={data.doctors} hint={`${data.activeDoctors} on duty`} icon={Stethoscope} tone="cream" />
        <Kpi label={t('kpi.staff')} value={data.staff} hint={`${data.activeStaff} on duty`} icon={Users} tone="cream" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <Card className="p-5">
          <p className="font-display text-lg">{t('chartIncExp')}</p>
          <p className="text-xs text-ink/45 mt-0.5">Last six months · teal income · gold outgo</p>
          <Bars series={data.series} />
        </Card>
        <Card className="p-5">
          <p className="font-display text-lg">{t('chartProfit')}</p>
          <p className="text-xs text-ink/45 mt-0.5">Monthly profit after expenses, maintenance and purchases</p>
          <Spark series={data.series} />
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <Card>
          <div className="px-5 py-4 border-b border-line">
            <p className="font-display text-lg">Recent income</p>
            <p className="text-xs text-ink/45">Latest collections from the ward</p>
          </div>
          {recentIncome.length === 0 ? <Empty text="No transactions yet" /> : (
            <TableWrap>
              <table className="w-full min-w-[480px]">
                <thead className="bg-paper/80">
                  <tr><Th>Date</Th><Th>Category</Th><Th>Detail</Th><Th className="text-right">Amount</Th></tr>
                </thead>
                <tbody>
                  {recentIncome.map((r) => (
                    <tr key={r.id} className="border-t border-line/80 hover:bg-paper/60">
                      <Td>{formatDate(r.date)}</Td>
                      <Td>{r.category || '—'}</Td>
                      <Td className="max-w-[180px] truncate">{r.description || r.receipt_number || '—'}</Td>
                      <Td className="text-right font-medium text-teal">{formatINR(r.amount)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </Card>

        <Card>
          <div className="px-5 py-4 border-b border-line">
            <p className="font-display text-lg">Recent expenses</p>
            <p className="text-xs text-ink/45">Latest outgo from the desk</p>
          </div>
          {recentExpenses.length === 0 ? <Empty text="No expenses yet" /> : (
            <TableWrap>
              <table className="w-full min-w-[480px]">
                <thead className="bg-paper/80">
                  <tr><Th>Date</Th><Th>Category</Th><Th>Item</Th><Th className="text-right">Amount</Th></tr>
                </thead>
                <tbody>
                  {recentExpenses.map((r) => (
                    <tr key={r.id} className="border-t border-line/80 hover:bg-paper/60">
                      <Td>{formatDate(r.date)}</Td>
                      <Td>{r.category || '—'}</Td>
                      <Td className="max-w-[180px] truncate">{r.item || '—'}</Td>
                      <Td className="text-right font-medium">{formatINR(r.amount)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        <Card className="p-5">
          <p className="font-display text-lg">Quick add income</p>
          <p className="text-xs text-ink/45 mb-4">Record a receipt without leaving the desk</p>
          <form onSubmit={submitIncome} className="space-y-3">
            <Input type="date" label={t('fields.date')} value={incForm.txn_date} onChange={(e) => setIncForm({ ...incForm, txn_date: e.target.value })} />
            <Select label={t('fields.category')} value={incForm.category} onChange={(e) => setIncForm({ ...incForm, category: e.target.value })}>
              <option value="">Select</option>
              {incomeCats.map((c) => <option key={c.id}>{c.name}</option>)}
            </Select>
            <Input label={t('fields.description')} value={incForm.description} onChange={(e) => setIncForm({ ...incForm, description: e.target.value })} />
            <Input type="number" min="0" step="1" label={t('fields.amount')} value={incForm.amount} onChange={(e) => setIncForm({ ...incForm, amount: e.target.value })} />
            <Select label={t('fields.payment')} value={incForm.payment_mode} onChange={(e) => setIncForm({ ...incForm, payment_mode: e.target.value })}>
              {PAYMENT_MODES.map((m) => <option key={m}>{m}</option>)}
            </Select>
            <Button type="submit" className="w-full" disabled={busy === 'income'}><Plus size={14} /> {busy === 'income' ? 'Saving…' : 'Add income'}</Button>
          </form>
        </Card>

        <Card className="p-5">
          <p className="font-display text-lg">Quick add expense</p>
          <p className="text-xs text-ink/45 mb-4">Book an outgo against today&apos;s ledger</p>
          <form onSubmit={submitExpense} className="space-y-3">
            <Input type="date" label={t('fields.date')} value={expForm.txn_date} onChange={(e) => setExpForm({ ...expForm, txn_date: e.target.value })} />
            <Select label={t('fields.category')} value={expForm.category} onChange={(e) => setExpForm({ ...expForm, category: e.target.value })}>
              <option value="">Select</option>
              {expenseCats.map((c) => <option key={c.id}>{c.name}</option>)}
            </Select>
            <Input label={t('fields.item')} value={expForm.item} onChange={(e) => setExpForm({ ...expForm, item: e.target.value })} />
            <Input type="number" min="0" step="1" label={t('fields.amount')} value={expForm.amount} onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })} />
            <Select label={t('fields.payment')} value={expForm.payment_mode} onChange={(e) => setExpForm({ ...expForm, payment_mode: e.target.value })}>
              {PAYMENT_MODES.map((m) => <option key={m}>{m}</option>)}
            </Select>
            <Button type="submit" className="w-full" disabled={busy === 'expense'}><Plus size={14} /> {busy === 'expense' ? 'Saving…' : 'Add expense'}</Button>
          </form>
        </Card>

        <Card className="p-5">
          <p className="font-display text-lg">Quick add maintenance</p>
          <p className="text-xs text-ink/45 mb-4">Cleaner, phenyl, plumbing and the rest</p>
          <form onSubmit={submitMaint} className="space-y-3">
            <Input type="date" label={t('fields.date')} value={mntForm.txn_date} onChange={(e) => setMntForm({ ...mntForm, txn_date: e.target.value })} />
            <Select label={t('fields.category')} value={mntForm.category} onChange={(e) => setMntForm({ ...mntForm, category: e.target.value })}>
              {MAINT_CATS.map((c) => <option key={c}>{c}</option>)}
            </Select>
            <Input label={t('fields.item')} value={mntForm.item} onChange={(e) => setMntForm({ ...mntForm, item: e.target.value })} />
            <Input type="number" min="0" step="1" label={t('fields.amount')} value={mntForm.amount} onChange={(e) => setMntForm({ ...mntForm, amount: e.target.value })} />
            <Select label={t('fields.payment')} value={mntForm.payment_mode} onChange={(e) => setMntForm({ ...mntForm, payment_mode: e.target.value })}>
              {PAYMENT_MODES.map((m) => <option key={m}>{m}</option>)}
            </Select>
            <Button type="submit" className="w-full" disabled={busy === 'maint'}><Plus size={14} /> {busy === 'maint' ? 'Saving…' : 'Add maintenance'}</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
