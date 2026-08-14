import supabase from './db-client.js';
import { setCors, requireUser, can } from './auth-helper.js';
import { writeAudit } from './audit-log.js';

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
      let q = supabase.from('staff').select('*').order('name', { ascending: true });
      const { type, status, q: search } = req.query || {};
      if (type) q = q.eq('type', type);
      if (status) q = q.eq('status', status);
      const { data, error } = await q;
      if (error) throw error;
      let rows = data || [];
      if (search) {
        const s = String(search).toLowerCase();
        rows = rows.filter((r) =>
          [r.name, r.mobile, r.qualification, r.designation].some((v) => String(v || '').toLowerCase().includes(s))
        );
      }
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      if (!body.name) return res.status(400).json({ error: 'Name is required' });
      const row = {
        name: body.name,
        mobile: body.mobile || '',
        type: body.type || 'staff',
        qualification: body.qualification || '',
        designation: body.specialization || body.designation || '',
        joining_date: body.joining_date || null,
        salary: Number(body.salary || 0),
        status: body.status || 'active',
        notes: body.notes || '',
      };
      const { data, error } = await supabase.from('staff').insert(row).select().single();
      if (error) throw error;
      await writeAudit(auth, { action: 'create', module: 'staff', entity: 'staff', entity_id: data.id, summary: `Added ${data.type} ${data.name}` });
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const { id, ...rest } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      const patch = {};
      ['name', 'mobile', 'type', 'qualification', 'joining_date', 'status', 'notes'].forEach((k) => {
        if (rest[k] !== undefined) patch[k] = rest[k];
      });
      if (rest.specialization !== undefined) patch.designation = rest.specialization;
      else if (rest.designation !== undefined) patch.designation = rest.designation;
      if (rest.salary !== undefined) patch.salary = Number(rest.salary);
      const { data, error } = await supabase.from('staff').update(patch).eq('id', id).select().single();
      if (error) throw error;
      await writeAudit(auth, { action: 'update', module: 'staff', entity: 'staff', entity_id: id, summary: `Updated ${data.name}` });
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      const { data: pays } = await supabase.from('staff_payments').select('id,expense_id').eq('staff_id', id);
      for (const p of pays || []) {
        if (p.expense_id) await supabase.from('expenses').delete().eq('id', p.expense_id);
      }
      await supabase.from('staff_payments').delete().eq('staff_id', id);
      const { error } = await supabase.from('staff').delete().eq('id', id);
      if (error) throw error;
      await writeAudit(auth, { action: 'delete', module: 'staff', entity: 'staff', entity_id: id, summary: `Deleted staff #${id}` });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('staff API', err);
    return res.status(500).json({ error: err.message });
  }
}
