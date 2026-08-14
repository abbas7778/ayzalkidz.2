import { createUserClient } from './db-client.js';
import { setCors, requireUser, can, ROLE_PERMS } from './auth-helper.js';
import { writeAudit } from './audit-log.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const auth = await requireUser(req, res);
    if (!auth) return;
    const supabase = auth.db;

    if (req.method === 'GET') {
      if (req.query?.me === '1') {
        return res.status(200).json(auth.profile);
      }
      if (!can(auth.profile, 'users')) return res.status(403).json({ error: 'No permission' });
      const { data, error } = await supabase.from('app_users').select('*').order('name', { ascending: true });
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    if (!can(auth.profile, 'users')) return res.status(403).json({ error: 'No permission' });

    if (req.method === 'POST') {
      const { name, email, password, role, mobile, permissions } = req.body || {};
      if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required' });
      const r = role || 'staff';
      const { data: created, error: aerr } = await createUserClient().auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });
      if (aerr) throw aerr;
      const row = {
        user_id: created.user?.id || '',
        name,
        email,
        role: r,
        mobile: mobile || '',
        status: 'active',
        permissions: permissions || ROLE_PERMS[r] || ROLE_PERMS.staff,
      };
      const { data, error } = await supabase.from('app_users').insert(row).select().single();
      if (error) throw error;
      await writeAudit(auth, { action: 'create', module: 'users', entity: 'app_user', entity_id: data.id, summary: `Created user ${data.email} (${data.role})` });
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const { id, ...rest } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      const patch = {};
      ['name', 'role', 'mobile', 'status', 'permissions'].forEach((k) => {
        if (rest[k] !== undefined) patch[k] = rest[k];
      });
      if (patch.role && !rest.permissions) patch.permissions = ROLE_PERMS[patch.role] || ROLE_PERMS.staff;
      const { data, error } = await supabase.from('app_users').update(patch).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      const { data: existing } = await supabase.from('app_users').select('*').eq('id', id).single();
      const { error } = await supabase.from('app_users').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('users API', err);
    return res.status(500).json({ error: err.message });
  }
}
