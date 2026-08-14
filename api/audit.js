import supabase from './db-client.js';
import { setCors, requireUser, can } from './auth-helper.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const auth = await requireUser(req, res);
    if (!auth) return;
    const supabase = auth.db;
    if (!can(auth.profile, 'settings') && !can(auth.profile, 'users')) {
      return res.status(403).json({ error: 'No permission' });
    }
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const { module, limit } = req.query || {};
    let q = supabase.from('audit_logs').select('*').order('id', { ascending: false }).limit(Number(limit) || 80);
    if (module) q = q.eq('module', module);
    const { data, error } = await q;
    if (error) throw error;
    return res.status(200).json(data || []);
  } catch (err) {
    console.error('audit API', err);
    return res.status(500).json({ error: err.message });
  }
}
