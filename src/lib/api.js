import supabase from './supabase';

export async function api(path, options = {}) {
  const method = String(options.method || 'GET').toUpperCase();
  const mutating = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';
  if (mutating && typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('Internet connection required');
  }
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
    const res = await fetch(path, { ...options, headers });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { error: text }; }
    if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
    return data;
  } catch (err) {
    if (mutating) {
      const msg = err?.message || '';
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        throw new Error('Internet connection required');
      }
      if (msg === 'Failed to fetch' || msg === 'NetworkError when attempting to fetch resource.' || msg.includes('NetworkError') || msg.includes('Load failed')) {
        throw new Error('Internet connection required');
      }
    }
    throw err;
  }
}

export function formatINR(n, currency = 'INR') {
  const num = Number(n) || 0;
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(num);
  } catch {
    return `₹${num.toLocaleString('en-IN')}`;
  }
}

export function formatDate(d) {
  if (!d) return '—';
  const dt = new Date(d + (String(d).includes('T') ? '' : 'T00:00:00'));
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function todayISO() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

export function greeting() {
  const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false }).format(new Date()));
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

export async function uploadFile(file) {
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  return api('/api/upload', {
    method: 'POST',
    body: JSON.stringify({
      fileName: file.name,
      fileBase64: base64,
      contentType: file.type,
    }),
  });
}

export function downloadCSV(filename, rows) {
  if (!rows?.length) return;
  const headers = Object.keys(rows[0]);
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export const PAYMENT_MODES = ['Cash', 'UPI', 'Bank', 'Card', 'Other'];

export const MAINT_CATS = [
  'Cleaner Salary',
  'Cleaning Material',
  'Phenyl',
  'Detergent',
  'Bleach',
  'Mop',
  'Broom',
  'Gloves',
  'Masks',
  'Bedsheet/Chadar Washing',
  'Laundry',
  'Electrical',
  'Plumbing',
  'AC/Fan Repair',
  'Furniture Repair',
  'Building Maintenance',
];

export const PURCHASE_CATS = [
  'Cleaning items',
  'Bedsheets',
  'Curtains',
  'Stationery',
  'Furniture',
  'Electrical Items',
  'Hospital Supplies',
];

export const MODULES = [
  'dashboard', 'staff', 'income', 'expenses', 'maintenance',
  'purchases', 'reports', 'profit', 'users', 'backup', 'settings',
];

export const ROLE_PERMS = {
  admin: { dashboard: true, staff: true, income: true, expenses: true, maintenance: true, purchases: true, reports: true, profit: true, users: true, backup: true, settings: true },
  doctor: { dashboard: true, staff: true, income: true, expenses: false, maintenance: false, purchases: false, reports: true, profit: false, users: false, backup: false, settings: false },
  staff: { dashboard: true, staff: false, income: false, expenses: false, maintenance: true, purchases: false, reports: false, profit: false, users: false, backup: false, settings: false },
  accountant: { dashboard: true, staff: false, income: true, expenses: true, maintenance: true, purchases: true, reports: true, profit: true, users: false, backup: false, settings: false },
};
