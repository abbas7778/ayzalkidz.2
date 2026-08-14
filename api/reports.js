import supabase from './db-client.js';
import { setCors, requireUser, todayIST, sumAmount } from './auth-helper.js';

function groupBy(rows, key, amountField = 'amount') {
  const map = {};
  for (const r of rows || []) {
    const k = r[key] || 'Other';
    map[k] = (map[k] || 0) + Number(r[amountField] || 0);
  }
  return Object.entries(map)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);
}

function rangeFor(period, from, to) {
  const today = todayIST();
  if (from && to) return { from, to };
  if (period === 'yearly') {
    const y = today.slice(0, 4);
    return { from: `${y}-01-01`, to: today };
  }
  if (period === 'monthly') {
    const ym = today.slice(0, 7);
    return { from: `${ym}-01`, to: today };
  }
  return { from: today, to: today };
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const auth = await requireUser(req, res);
    if (!auth) return;
    const supabase = auth.db;
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const { period = 'monthly', from: qFrom, to: qTo } = req.query || {};
    const { from, to } = rangeFor(period, qFrom, qTo);

    const [inc, exp, mnt, pur] = await Promise.all([
      supabase.from('income').select('*').gte('txn_date', from).lte('txn_date', to).order('txn_date', { ascending: true }),
      supabase.from('expenses').select('*').gte('txn_date', from).lte('txn_date', to).order('txn_date', { ascending: true }),
      supabase.from('maintenance').select('*').gte('txn_date', from).lte('txn_date', to).order('txn_date', { ascending: true }),
      supabase.from('purchases').select('*').gte('txn_date', from).lte('txn_date', to).order('txn_date', { ascending: true }),
    ]);
    if (inc.error) throw inc.error;
    if (exp.error) throw exp.error;
    if (mnt.error) throw mnt.error;
    if (pur.error) throw pur.error;

    const income = inc.data || [];
    const expenses = exp.data || [];
    const maintenance = mnt.data || [];
    const purchases = pur.data || [];

    const totalIncome = sumAmount(income);
    const totalExpenses = sumAmount(expenses);
    const totalMaintenance = sumAmount(maintenance);
    const totalPurchases = sumAmount(purchases, 'total');
    const totalOut = totalExpenses + totalMaintenance + totalPurchases;
    const net = totalIncome - totalOut;

    const byDay = {};
    const bump = (date, field, amt) => {
      if (!byDay[date]) byDay[date] = { date, income: 0, expenses: 0, maintenance: 0, purchases: 0, profit: 0 };
      byDay[date][field] += amt;
      byDay[date].profit = byDay[date].income - byDay[date].expenses - byDay[date].maintenance - byDay[date].purchases;
    };
    income.forEach((r) => bump(r.txn_date, 'income', Number(r.amount)));
    expenses.forEach((r) => bump(r.txn_date, 'expenses', Number(r.amount)));
    maintenance.forEach((r) => bump(r.txn_date, 'maintenance', Number(r.amount)));
    purchases.forEach((r) => bump(r.txn_date, 'purchases', Number(r.total)));

    return res.status(200).json({
      period,
      from,
      to,
      totalIncome,
      totalExpenses,
      totalMaintenance,
      totalPurchases,
      totalOut,
      net,
      incomeByCategory: groupBy(income, 'category'),
      expenseByCategory: groupBy(expenses, 'category'),
      maintenanceByCategory: groupBy(maintenance, 'category'),
      purchaseByCategory: groupBy(purchases, 'category', 'total'),
      paymentModes: groupBy(income, 'payment_mode'),
      daily: Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)),
      income,
      expenses,
      maintenance,
      purchases,
    });
  } catch (err) {
    console.error('reports API', err);
    return res.status(500).json({ error: err.message });
  }
}
