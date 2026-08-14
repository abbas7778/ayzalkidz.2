import { createUserClient, createServiceClient } from './db-client.js';

export function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export function todayIST() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

export function monthKeyIST(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d).slice(0, 7);
}

export const ROLE_PERMS = {
  admin: { dashboard: true, staff: true, income: true, expenses: true, maintenance: true, purchases: true, reports: true, profit: true, users: true, backup: true, settings: true },
  doctor: { dashboard: true, staff: true, income: true, expenses: false, maintenance: false, purchases: false, reports: true, profit: false, users: false, backup: false, settings: false },
  staff: { dashboard: true, staff: false, income: false, expenses: false, maintenance: true, purchases: false, reports: false, profit: false, users: false, backup: false, settings: false },
  accountant: { dashboard: true, staff: false, income: true, expenses: true, maintenance: true, purchases: true, reports: true, profit: true, users: false, backup: false, settings: false },
};

export async function requireUser(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  const authClient = createUserClient(token);
  const { data: { user }, error } = await authClient.auth.getUser(token);
  if (error || !user) {
    res.status(401).json({ error: 'Invalid token' });
    return null;
  }

  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createServiceClient() : authClient;

  const { data: profiles } = await db
    .from('app_users')
    .select('*')
    .eq('email', user.email)
    .limit(1);
  let profile = Array.isArray(profiles) ? profiles[0] : profiles || null;

  if (!profile) {
    const name = user.user_metadata?.full_name || user.user_metadata?.name || (user.email || '').split('@')[0];
    const { count } = await db.from('app_users').select('*', { count: 'exact', head: true });
    const role = count ? 'staff' : 'admin';
    const row = {
      user_id: user.id,
      name,
      email: user.email,
      role,
      mobile: '',
      status: 'active',
      permissions: ROLE_PERMS[role],
    };
    const inserted = await db.from('app_users').insert(row).select().single();
    profile = inserted.data || row;
  }
  return { user, profile, db };
}

export function can(profile, module) {
  if (!profile) return false;
  if (profile.role === 'admin') return true;
  const perms = profile.permissions || ROLE_PERMS[profile.role] || {};
  return !!perms[module];
}

export function sumAmount(rows, field = 'amount') {
  const list = Array.isArray(rows) ? rows : [];
  return list.reduce((s, r) => s + Number(r?.[field] || 0), 0);
}
