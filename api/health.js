import { createServiceClient } from './db-client.js';
import { setCors } from './auth-helper.js';

const TABLES = [
  'staff', 'staff_payments', 'income', 'expenses', 'maintenance', 'purchases',
  'app_users', 'hospital_settings', 'categories', 'backups', 'notifications', 'audit_logs',
];

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const supabase = createServiceClient();
    const checks = {};
    for (const table of TABLES) {
      const { error } = await supabase.from(table).select('id').limit(1);
      checks[table] = error ? error.message : 'ok';
    }
    const missing = Object.entries(checks)
      .filter(([, v]) => v !== 'ok' && /Could not find the table|schema cache|PGRST205|relation/i.test(String(v)))
      .map(([k]) => k);
    return res.status(200).json({
      ok: missing.length === 0,
      needsSetup: missing.length > 0,
      missing,
      backend: 'supabase',
      auth: 'supabase',
      project: process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      tables: checks,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message, backend: 'supabase', needsSetup: true });
  }
}
