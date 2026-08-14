import supabase from './db-client.js';
import { setCors, requireUser, can, todayIST } from './auth-helper.js';
import { writeAudit } from './audit-log.js';

const CAT_MAP = {
  Salary: 'Salary',
  Advance: 'Staff Advance',
  Bonus: 'Staff Bonus',
  Other: 'Staff Payment',
};

function currentMonth() {
  return todayIST().slice(0, 7);
}

function payStatus(salary, salaryPaid, advance) {
  const remaining = Number(salary || 0) - Number(salaryPaid || 0) - Number(advance || 0);
  if (Number(salaryPaid || 0) + Number(advance || 0) <= 0) return 'Pending';
  if (remaining > 0) return 'Partial';
  return 'Paid';
}

async function writeExpense(auth, payment, expenseId) {
  const supabase = auth.db;
  const category = CAT_MAP[payment.payment_type] || 'Staff Payment';
  const item = `${payment.payment_type} · ${payment.staff_name || 'Staff'} · ${payment.month || ''}`;
  const row = {
    txn_date: payment.txn_date || todayIST(),
    category,
    item,
    quantity: 1,
    amount: Number(payment.amount || 0),
    payment_mode: payment.payment_mode || 'Cash',
    paid_by: payment.paid_by || auth.profile?.name || '',
    bill_number: payment.reference || '',
    notes: payment.notes || '',
    created_by: auth.profile?.name || auth.user.email,
  };
  if (expenseId) {
    const { data, error } = await supabase.from('expenses').update(row).eq('id', expenseId).select().single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from('expenses').insert(row).select().single();
  if (error) throw error;
  return data;
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const auth = await requireUser(req, res);
    if (!auth) return;
    const supabase = auth.db;
    if (!can(auth.profile, 'staff') && req.method !== 'GET') {
      return res.status(403).json({ error: 'No permission' });
    }

    if (req.method === 'GET') {
      const { staff_id, month, payment_type, summary } = req.query || {};
      let q = supabase.from('staff_payments').select('*').order('txn_date', { ascending: false }).order('id', { ascending: false });
      if (staff_id) q = q.eq('staff_id', staff_id);
      if (month) q = q.eq('month', month);
      if (payment_type) q = q.eq('payment_type', payment_type);
      const { data, error } = await q;
      if (error) throw error;
      const payments = data || [];

      if (summary === '1') {
        const ym = month || currentMonth();
        const { data: people, error: serr } = await supabase.from('staff').select('*').eq('type', 'staff').order('name');
        if (serr) throw serr;
        const list = people || [];
        const monthPays = payments.filter((p) => p.month === ym || (!month && true));
        const scoped = month ? payments : monthPays.filter((p) => p.month === ym);
        const rows = list.map((s) => {
          const mine = scoped.filter((p) => Number(p.staff_id) === Number(s.id));
          const salaryPaid = mine.filter((p) => p.payment_type === 'Salary').reduce((a, p) => a + Number(p.amount || 0), 0);
          const advance = mine.filter((p) => p.payment_type === 'Advance').reduce((a, p) => a + Number(p.amount || 0), 0);
          const bonus = mine.filter((p) => p.payment_type === 'Bonus').reduce((a, p) => a + Number(p.amount || 0), 0);
          const other = mine.filter((p) => p.payment_type === 'Other').reduce((a, p) => a + Number(p.amount || 0), 0);
          const totalPaid = salaryPaid + advance + bonus + other;
          const remaining = Math.max(0, Number(s.salary || 0) - salaryPaid - advance);
          return {
            ...s,
            month: ym,
            salary_paid: salaryPaid,
            advance_total: advance,
            bonus_total: bonus,
            other_total: other,
            total_paid: totalPaid,
            remaining,
            payment_status: payStatus(s.salary, salaryPaid, advance),
          };
        });
        const totals = {
          month: ym,
          totalStaff: rows.length,
          totalMonthlySalary: rows.reduce((a, r) => a + Number(r.salary || 0), 0),
          salaryPaid: rows.reduce((a, r) => a + r.salary_paid, 0),
          advances: rows.reduce((a, r) => a + r.advance_total, 0),
          pending: rows.reduce((a, r) => a + r.remaining, 0),
        };
        return res.status(200).json({ month: ym, totals, staff: rows, payments: scoped });
      }

      return res.status(200).json(payments);
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      if (!body.staff_id) return res.status(400).json({ error: 'Staff is required' });
      if (!body.amount || Number(body.amount) <= 0) return res.status(400).json({ error: 'Enter a valid amount' });
      const { data: person, error: perr } = await supabase.from('staff').select('*').eq('id', body.staff_id).single();
      if (perr || !person) return res.status(400).json({ error: 'Staff member not found' });
      const payment = {
        staff_id: person.id,
        staff_name: person.name,
        txn_date: body.txn_date || todayIST(),
        payment_type: body.payment_type || 'Salary',
        amount: Number(body.amount),
        month: body.month || currentMonth(),
        payment_mode: body.payment_mode || 'Cash',
        paid_by: body.paid_by || auth.profile?.name || '',
        reference: body.reference || '',
        notes: body.notes || '',
        created_by: auth.profile?.name || auth.user.email,
      };
      const exp = await writeExpense(auth, payment, null);
      payment.expense_id = exp?.id || null;
      const { data, error } = await supabase.from('staff_payments').insert(payment).select().single();
      if (error) throw error;
      await writeAudit(auth, { action: 'create', module: 'staff', entity: 'staff_payment', entity_id: data.id, summary: `${data.payment_type} ₹${data.amount} for ${data.staff_name}` });
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const { id, ...rest } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      const { data: existing, error: ferr } = await supabase.from('staff_payments').select('*').eq('id', id).single();
      if (ferr || !existing) return res.status(404).json({ error: 'Payment not found' });
      const patch = {};
      ['txn_date', 'payment_type', 'month', 'payment_mode', 'paid_by', 'reference', 'notes'].forEach((k) => {
        if (rest[k] !== undefined) patch[k] = rest[k];
      });
      if (rest.amount !== undefined) patch.amount = Number(rest.amount);
      if (rest.staff_id && Number(rest.staff_id) !== Number(existing.staff_id)) {
        const { data: person } = await supabase.from('staff').select('*').eq('id', rest.staff_id).single();
        if (person) {
          patch.staff_id = person.id;
          patch.staff_name = person.name;
        }
      }
      const next = { ...existing, ...patch };
      if (existing.expense_id) {
        await writeExpense(auth, next, existing.expense_id);
      }
      const { data, error } = await supabase.from('staff_payments').update(patch).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      const { data: existing } = await supabase.from('staff_payments').select('*').eq('id', id).single();
      if (existing?.expense_id) {
        await supabase.from('expenses').delete().eq('id', existing.expense_id);
      }
      const { error } = await supabase.from('staff_payments').delete().eq('id', id);
      if (error) throw error;
      await writeAudit(auth, { action: 'delete', module: 'staff', entity: 'staff_payment', entity_id: id, summary: `Deleted staff payment #${id}` });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('staff-payments API', err);
    return res.status(500).json({ error: err.message });
  }
}
