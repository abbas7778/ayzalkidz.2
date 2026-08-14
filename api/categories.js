import supabase from './db-client.js';
import { setCors, requireUser, can } from './auth-helper.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const auth = await requireUser(req, res);
    if (!auth) return;
    const supabase = auth.db;

    if (req.method === 'GET') {
      const { kind } = req.query || {};
      let q = supabase.from('categories').select('*').order('name', { ascending: true });
      if (kind) q = q.eq('kind', kind);
      const { data, error } = await q;
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    if (!can(auth.profile, 'settings')) return res.status(403).json({ error: 'No permission' });

    if (req.method === 'POST') {
      const { kind, name } = req.body || {};
      if (!kind || !name) return res.status(400).json({ error: 'kind and name required' });
      const { data, error } = await supabase.from('categories').insert({ kind, name, active: true }).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const { id, name, active } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      const patch = {};
      if (name !== undefined) patch.name = name;
      if (active !== undefined) patch.active = active;
      const { data, error } = await supabase.from('categories').update(patch).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('categories API', err);
    return res.status(500).json({ error: err.message });
  }
}
