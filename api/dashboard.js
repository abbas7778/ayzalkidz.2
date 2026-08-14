import supabase from './db-client.js';
import { setCors, requireUser, todayIST, sumAmount } from './auth-helper.js';

function lastNMonths(n) {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d).slice(0, 7);
    out.push(key);
  }
  return out;
}

function inMonth(dateStr, ym) {
  return String(dateStr || '').slice(0, 7) === ym;
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const auth = await requireUser(req, res);
    if (!auth) return;
    const supabase = auth.db;
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const today = todayIST();
    const ym = today.slice(0, 7);
    const months = lastNMonths(6);
    const from = `${months[0]}-01`;

    const [inc, exp, mnt, pur, staff] = await Promise.all([
      supabase.from('income').select('*').gte('txn_date', from),
      supabase.from('expenses').select('*').gte('txn_date', from),
      supabase.from('maintenance').select('*').gte('txn_date', from),
      supabase.from('purchases').select('*').gte('txn_date', from),
      supabase.from('staff').select('id,type,status'),
    ]);

    if (inc.error) throw inc.error;
    if (exp.error) throw exp.error;
    if (mnt.error) throw mnt.error;
    if (pur.error) throw pur.error;
    if (staff.error) throw staff.error;

    const income = Array.isArray(inc.data) ? inc.data : [];
    const expenses = Array.isArray(exp.data) ? exp.data : [];
    const maintenance = Array.isArray(mnt.data) ? mnt.data : [];
    const purchases = Array.isArray(pur.data) ? pur.data : [];
    const people = Array.isArray(staff.data) ? staff.data : [];

    const costOf = (dateFilter) => {
      const fn = typeof dateFilter === 'function' ? dateFilter : () => true;
      const e = sumAmount(expenses.filter(fn));
      const m = sumAmount(maintenance.filter(fn));
      const p = sumAmount(purchases.filter(fn), 'total');
      return e + m + p;
    };

    const todayInc = sumAmount(income.filter((r) => r.txn_date === today));
    const todayExp = costOf((r) => r.txn_date === today);
    const monthInc = sumAmount(income.filter((r) => inMonth(r.txn_date, ym)));
    const monthExp = costOf((r) => inMonth(r.txn_date, ym));

    const series = months.map((key) => {
      const incV = sumAmount(income.filter((r) => inMonth(r.txn_date, key)));
      const expV = costOf((r) => inMonth(r.txn_date, key));
      return { month: key, income: incV, expense: expV, profit: incV - expV };
    });

    const byDate = (a, b) => String(b.txn_date || '').localeCompare(String(a.txn_date || '')) || Number(b.id) - Number(a.id);

    const recent = [
      ...income.map((r) => ({ ...r, kind: 'income', amount: Number(r.amount) || 0 })),
      ...expenses.map((r) => ({ ...r, kind: 'expense', amount: Number(r.amount) || 0 })),
      ...maintenance.map((r) => ({ ...r, kind: 'maintenance', amount: Number(r.amount) || 0 })),
      ...purchases.map((r) => ({ ...r, kind: 'purchase', amount: Number(r.total) || 0 })),
    ]
      .sort(byDate)
      .slice(0, 10)
      .map((r) => ({
        id: `${r.kind}-${r.id}`,
        date: r.txn_date,
        kind: r.kind,
        category: r.category || r.item || '',
        description: r.description || r.item || r.seller || '',
        amount: r.amount,
        payment_mode: r.payment_mode || '',
      }));

    const recentIncome = [...income].sort(byDate).slice(0, 6).map((r) => ({
      id: r.id,
      date: r.txn_date,
      category: r.category || '',
      description: r.description || '',
      amount: Number(r.amount) || 0,
      payment_mode: r.payment_mode || '',
      receipt_number: r.receipt_number || '',
    }));

    const recentExpenses = [...expenses].sort(byDate).slice(0, 6).map((r) => ({
      id: r.id,
      date: r.txn_date,
      category: r.category || '',
      item: r.item || '',
      amount: Number(r.amount) || 0,
      payment_mode: r.payment_mode || '',
    }));

    return res.status(200).json({
      today,
      todayIncome: todayInc || 0,
      todayExpense: todayExp || 0,
      todayProfit: (todayInc || 0) - (todayExp || 0),
      monthlyIncome: monthInc || 0,
      monthlyExpense: monthExp || 0,
      monthlyProfit: (monthInc || 0) - (monthExp || 0),
      doctors: people.filter((p) => p.type === 'doctor').length,
      staff: people.filter((p) => p.type === 'staff').length,
      activeDoctors: people.filter((p) => p.type === 'doctor' && p.status === 'active').length,
      activeStaff: people.filter((p) => p.type === 'staff' && p.status === 'active').length,
      series,
      recent,
      recentIncome,
      recentExpenses,
    });
  } catch (err) {
    console.error('dashboard API', err);
    return res.status(500).json({ error: err.message });
  }
}
