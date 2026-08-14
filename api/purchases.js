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
    if (!can(auth.profile, 'purchases') && req.method !== 'GET') {
      return res.status(403).json({ error: 'No permission' });
    }

    if (req.method === 'GET') {
      let q = supabase.from('purchases').select('*').order('txn_date', { ascending: false }).order('id', { ascending: false });
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
      if (!body.item) return res.status(400).json({ error: 'Item is required' });
      const qty = Number(body.quantity || 1);
      const rate = Number(body.rate || 0);
      const total = body.total !== undefined ? Number(body.total) : qty * rate;
      if (!total) return res.status(400).json({ error: 'Total amount is required' });
      const row = {
        txn_date: body.txn_date || todayIST(),
        category: body.category || 'Hospital Supplies',
        seller: body.seller || '',
        item: body.item,
        quantity: qty,
        rate,
        total,
        payment_mode: body.payment_mode || 'Cash',
        bill_number: body.bill_number || '',
        bill_photo: body.bill_photo || '',
        notes: body.notes || '',
        created_by: auth.profile?.name || auth.user.email,
      };
      const { data, error } = await supabase.from('purchases').insert(row).select().single();
      if (error) throw error;
      await writeAudit(auth, { action: 'create', module: 'purchases', entity: 'purchase', entity_id: data.id, summary: `Purchase ${data.item} · ₹${data.total}` });
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const { id, ...rest } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      const patch = {};
      ['txn_date', 'category', 'seller', 'item', 'payment_mode', 'bill_number', 'bill_photo', 'notes'].forEach((k) => {
        if (rest[k] !== undefined) patch[k] = rest[k];
      });
      if (rest.quantity !== undefined) patch.quantity = Number(rest.quantity);
      if (rest.rate !== undefined) patch.rate = Number(rest.rate);
      if (rest.total !== undefined) patch.total = Number(rest.total);
      else if (patch.quantity !== undefined || patch.rate !== undefined) {
        const qty = patch.quantity ?? Number(rest.quantity || 0);
        const rate = patch.rate ?? Number(rest.rate || 0);
        if (qty && rate) patch.total = qty * rate;
      }
      const { data, error } = await supabase.from('purchases').update(patch).eq('id', id).select().single();
      if (error) throw error;
      await writeAudit(auth, { action: 'update', module: 'purchases', entity: 'purchase', entity_id: id, summary: `Updated purchase #${id}` });
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      const { error } = await supabase.from('purchases').delete().eq('id', id);
      if (error) throw error;
      await writeAudit(auth, { action: 'delete', module: 'purchases', entity: 'purchase', entity_id: id, summary: `Deleted purchase #${id}` });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('purchases API', err);
    return res.status(500).json({ error: err.message });
  }
}
