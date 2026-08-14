import { createContext, useContext, useState, useEffect } from 'react';
import supabase from '../lib/supabase';
import { api } from '../lib/api';

const AuthContext = createContext({
  user: null,
  session: null,
  profile: null,
  loading: true,
  can: () => false,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile() {
    try {
      const p = await api('/api/users?me=1');
      setProfile(p);
    } catch {
      setProfile(null);
    }
  }

  useEffect(() => {
    let unsub = () => {};
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        loadProfile().finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        loadProfile().finally(() => setLoading(false));
      } else {
        setProfile(null);
        setLoading(false);
      }
    });
    unsub = () => subscription.unsubscribe();
    return () => unsub();
  }, []);

  const can = (mod) => {
    if (profile?.role === 'admin') return true;
    if (!profile) return !!user;
    return !!(profile.permissions || {})[mod];
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, can, refreshProfile: loadProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
