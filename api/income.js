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
    if (!can(auth.profile, 'income') && req.method !== 'GET') {
      return res.status(403).json({ error: 'No permission' });
    }

    if (req.method === 'GET') {
      let q = supabase.from('income').select('*').order('txn_date', { ascending: false }).order('id', { ascending: false });
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
      let receipt = body.receipt_number;
      if (!receipt) {
        const year = todayIST().slice(0, 4);
        const { count } = await supabase.from('income').select('*', { count: 'exact', head: true });
        receipt = `INC-${year}-${String((count || 0) + 1).padStart(4, '0')}`;
      }
      const row = {
        txn_date: body.txn_date || todayIST(),
        category: body.category,
        description: body.description || '',
        amount: Number(body.amount),
        payment_mode: body.payment_mode || 'Cash',
        receipt_number: receipt,
        notes: body.notes || '',
        created_by: auth.profile?.name || auth.user.email,
      };
      const { data, error } = await supabase.from('income').insert(row).select().single();
      if (error) throw error;
      await writeAudit(auth, { action: 'create', module: 'income', entity: 'income', entity_id: data.id, summary: `Income ${data.receipt_number || data.id} · ₹${data.amount}`, details: { category: data.category, amount: data.amount } });
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const { id, ...rest } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      const patch = {};
      ['txn_date', 'category', 'description', 'payment_mode', 'receipt_number', 'notes'].forEach((k) => {
        if (rest[k] !== undefined) patch[k] = rest[k];
      });
      if (rest.amount !== undefined) patch.amount = Number(rest.amount);
      const { data, error } = await supabase.from('income').update(patch).eq('id', id).select().single();
      if (error) throw error;
      await writeAudit(auth, { action: 'update', module: 'income', entity: 'income', entity_id: id, summary: `Updated income #${id}`, details: patch });
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      const { error } = await supabase.from('income').delete().eq('id', id);
      if (error) throw error;
      await writeAudit(auth, { action: 'delete', module: 'income', entity: 'income', entity_id: id, summary: `Deleted income #${id}` });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('income API', err);
    return res.status(500).json({ error: err.message });
  }
}
