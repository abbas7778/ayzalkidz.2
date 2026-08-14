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

    if (req.method === 'GET') {
      const { data, error } = await supabase.from('hospital_settings').select('*').order('id', { ascending: true }).limit(1);
      if (error) throw error;
      return res.status(200).json(data?.[0] || null);
    }

    if (req.method === 'PUT' || req.method === 'POST') {
      if (!can(auth.profile, 'settings')) return res.status(403).json({ error: 'No permission' });
      const body = req.body || {};
      const { data: existing } = await supabase.from('hospital_settings').select('id').order('id').limit(1);
      const patch = {
        hospital_name: body.hospital_name,
        address: body.address,
        phone: body.phone,
        email: body.email,
        gstin: body.gstin,
        logo_url: body.logo_url,
        language: body.language,
        currency: body.currency,
        printer: body.printer,
        updated_at: new Date().toISOString(),
      };
      Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k]);
      let result;
      if (existing?.[0]?.id) {
        const { data, error } = await supabase.from('hospital_settings').update(patch).eq('id', existing[0].id).select().single();
        if (error) throw error;
        result = data;
      } else {
        const { data, error } = await supabase.from('hospital_settings').insert(patch).select().single();
        if (error) throw error;
        result = data;
      }
      await writeAudit(auth, { action: 'update', module: 'settings', entity: 'hospital_settings', entity_id: result?.id, summary: 'Updated hospital settings' });
      return res.status(200).json(result);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('settings API', err);
    return res.status(500).json({ error: err.message });
  }
}
