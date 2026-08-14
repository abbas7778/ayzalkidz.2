import supabase from './db-client.js';
import { setCors, requireUser, can, todayIST } from './auth-helper.js';
import { writeAudit } from './audit-log.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const auth = await requireUser(req, res);
    if (!auth) return;
    const supabase = auth.db;
    if (!can(auth.profile, 'expenses') && req.method !== 'GET') {
      return res.status(403).json({ error: 'No permission' });
    }

    if (req.method === 'GET') {
      let q = supabase.from('expenses').select('*').order('txn_date', { ascending: false }).order('id', { ascending: false });
      const { from, to, category } = req.query || {};
      if (from) q = q.gte('txn_date', from);
      if (to) q = q.lte('txn_date', to);
      if (category) q = q.eq('category', category);
      const { data, error } = await q;
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      if (!body.amount || !body.category) return res.status(400).json({ error: 'Category and amount are required' });
      const row = {
        txn_date: body.txn_date || todayIST(),
        category: body.category,
        item: body.item || '',
        quantity: Number(body.quantity || 1),
        amount: Number(body.amount),
        payment_mode: body.payment_mode || 'Cash',
        paid_by: body.paid_by || auth.profile?.name || '',
        bill_number: body.bill_number || '',
        bill_photo: body.bill_photo || '',
        notes: body.notes || '',
        created_by: auth.profile?.name || auth.user.email,
      };
      const { data, error } = await supabase.from('expenses').insert(row).select().single();
      if (error) throw error;
      await writeAudit(auth, { action: 'create', module: 'expenses', entity: 'expense', entity_id: data.id, summary: `Expense ${data.category} · ₹${data.amount}`, details: { category: data.category, amount: data.amount } });
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const { id, ...rest } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      const patch = {};
      ['txn_date', 'category', 'item', 'payment_mode', 'paid_by', 'bill_number', 'bill_photo', 'notes'].forEach((k) => {
        if (rest[k] !== undefined) patch[k] = rest[k];
      });
      if (rest.amount !== undefined) patch.amount = Number(rest.amount);
      if (rest.quantity !== undefined) patch.quantity = Number(rest.quantity);
      const { data, error } = await supabase.from('expenses').update(patch).eq('id', id).select().single();
      if (error) throw error;
      await writeAudit(auth, { action: 'update', module: 'expenses', entity: 'expense', entity_id: id, summary: `Updated expense #${id}`, details: patch });
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
      await writeAudit(auth, { action: 'delete', module: 'expenses', entity: 'expense', entity_id: id, summary: `Deleted expense #${id}` });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('expenses API', err);
    return res.status(500).json({ error: err.message });
  }
}
