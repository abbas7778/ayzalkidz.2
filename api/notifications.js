import supabase from './db-client.js';
import { setCors, requireUser } from './auth-helper.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const auth = await requireUser(req, res);
    if (!auth) return;
    const supabase = auth.db;

    if (req.method === 'GET') {
      const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(30);
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    if (req.method === 'PUT') {
      const { id, all } = req.body || {};
      if (all) {
        const { error } = await supabase.from('notifications').update({ read: true }).eq('read', false);
        if (error) throw error;
        return res.status(200).json({ ok: true });
      }
      if (!id) return res.status(400).json({ error: 'id required' });
      const { data, error } = await supabase.from('notifications').update({ read: true }).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('notifications API', err);
    return res.status(500).json({ error: err.message });
  }
}
