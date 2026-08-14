import supabase from './db-client.js';
import { setCors, requireUser, can, todayIST } from './auth-helper.js';
import { writeAudit } from './audit-log.js';

async function snapshot(db) {
  const tables = ['staff', 'staff_payments', 'income', 'expenses', 'maintenance', 'purchases', 'categories', 'hospital_settings', 'audit_logs'];
  const payload = {};
  for (const t of tables) {
    const { data, error } = await db.from(t).select('*');
    if (error) throw error;
    payload[t] = data || [];
  }
  return payload;
}

function resolveWhen(row) {
  if (row?.created_at) return row.created_at;
  const match = String(row?.notes || '').match(/(\d{4}-\d{2}-\d{2})/);
  if (match) return `${match[1]}T09:00:00+05:30`;
  return new Date().toISOString();
}

function withWhen(row) {
  if (!row) return row;
  return { ...row, created_at: resolveWhen(row) };
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const auth = await requireUser(req, res);
    if (!auth) return;
    const supabase = auth.db;
    if (!can(auth.profile, 'backup')) return res.status(403).json({ error: 'No permission' });

    if (req.method === 'GET') {
      const today = todayIST();
      const { data: existing } = await supabase.from('backups').select('*').order('created_at', { ascending: false });
      const list = existing || [];
      const hasToday = list.some((b) => String(b.created_at || '').slice(0, 10) === today || String(b.notes || '').includes(today));
      if (!hasToday) {
        const payload = await snapshot(supabase);
        const raw = JSON.stringify(payload);
        const row = {
          backup_type: 'auto',
          status: 'completed',
          size_kb: Math.max(1, Math.round(raw.length / 1024)),
          notes: `Automatic daily backup · ${today}`,
          created_by: 'system',
          payload,
          created_at: new Date().toISOString(),
        };
        const { data: created } = await supabase.from('backups').insert(row).select().single();
        if (created) list.unshift(created);
      }
      const slim = list.map(({ payload: _p, ...rest }) => withWhen(rest));
      return res.status(200).json(slim);
    }

    if (req.method === 'POST') {
      const action = req.body?.action || 'create';

      if (action === 'create') {
        const payload = await snapshot(supabase);
        const raw = JSON.stringify(payload);
        const row = {
          backup_type: 'manual',
          status: 'completed',
          size_kb: Math.max(1, Math.round(raw.length / 1024)),
          notes: req.body?.notes || `Manual backup · ${todayIST()}`,
          created_by: auth.profile?.name || auth.user.email,
          payload,
          created_at: new Date().toISOString(),
        };
        const { data, error } = await supabase.from('backups').insert(row).select('id,backup_type,status,size_kb,notes,created_by,created_at').single();
        if (error) throw error;
        await writeAudit(auth, { action: 'create', module: 'backup', entity: 'backup', entity_id: data.id, summary: 'Manual backup created' });
        return res.status(201).json(withWhen(data));
      }

      if (action === 'download') {
        const { id } = req.body || {};
        const { data, error } = await supabase.from('backups').select('*').eq('id', id).single();
        if (error) throw error;
        return res.status(200).json(data);
      }

      if (action === 'restore') {
        const { id } = req.body || {};
        const { data: bak, error } = await supabase.from('backups').select('*').eq('id', id).single();
        if (error) throw error;
        const payload = bak.payload || {};
        const order = ['staff', 'staff_payments', 'income', 'expenses', 'maintenance', 'purchases', 'categories'];
        for (const t of order) {
          if (!payload[t]) continue;
          const { error: delErr } = await supabase.from(t).delete().neq('id', 0);
          if (delErr) throw delErr;
          if (payload[t].length) {
            const { error: insErr } = await supabase.from(t).insert(payload[t]);
            if (insErr) throw insErr;
          }
        }
        return res.status(200).json({ ok: true });
      }

      return res.status(400).json({ error: 'Unknown action' });
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      const { error } = await supabase.from('backups').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('backups API', err);
    return res.status(500).json({ error: err.message });
  }
}
