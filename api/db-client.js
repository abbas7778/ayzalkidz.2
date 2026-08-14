import { createClient } from '@supabase/supabase-js';
import { triggerRestore } from './db-wake.js';

export function getSupabaseUrl() {
  return process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
}

export function getPublishableKey() {
  return (
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''
  );
}

function resilientFetch(url, options) {
  return fetch(url, options).then((res) => {
    if (!res.ok && res.status >= 500) triggerRestore();
    return res;
  });
}

export function createUserClient(token) {
  return createClient(getSupabaseUrl(), getPublishableKey(), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      fetch: resilientFetch,
    },
  });
}

export function createServiceClient() {
  const url = getSupabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || getPublishableKey();
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: resilientFetch },
  });
}

const supabase = createServiceClient();
export default supabase;
