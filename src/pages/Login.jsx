import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import supabase from '../lib/supabase';
import { signInWithGoogle } from '../lib/googleAuth';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { Button, Input } from '../components/UI';
import { LANGS } from '../lib/i18n';
import InstallButton from '../components/InstallButton';
import OfflineBanner from '../components/OfflineBanner';
const DEMOS = [
  { email: 'admin@ayzalkidz.care', password: 'Ayzal@2026', role: 'Admin' },
  { email: 'accounts@ayzalkidz.care', password: 'Ayzal@2026', role: 'Accountant' },
];

export default function Login() {
  const { user, loading } = useAuth();
  const { t, lang, setLang } = useI18n();
  const [mode, setMode] = useState('in');
  const [email, setEmail] = useState('admin@ayzalkidz.care');
  const [password, setPassword] = useState('Ayzal@2026');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!email || !password) { setErr('Email and password are required'); return; }
    if (password.length < 6) { setErr('Password must be at least 6 characters'); return; }
    setBusy(true);
    try {
      if (mode === 'up') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (ex) {
      setErr(ex.message || 'Could not sign in');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-paper overflow-x-clip">
      <div className="relative hidden lg:block overflow-hidden">
        <img src="/images/login-hero.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-teal-deep via-teal-deep/70 to-teal-deep/20" />
        <div className="relative h-full flex flex-col justify-end p-12 text-cream">
          <img src="/logo.png" alt="" className="h-16 w-16 rounded-full bg-cream/10 mb-6" />
          <p className="font-display text-4xl leading-tight">Ayzal Kidz Care</p>
          <p className="mt-3 text-cream/75 max-w-sm leading-relaxed">A quiet paediatric hospital on the Banaskantha plain. Accounts, staff and the day's ledger — kept with the same care as the ward.</p>
          <p className="mt-8 text-xs tracking-[0.2em] uppercase text-gold">Tharad · Gujarat</p>
        </div>
      </div>

      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 pt-[env(safe-area-inset-top)]">
        <div className="-mx-6 -mt-12 mb-6 sm:-mx-12"><OfflineBanner /></div>
        <div className="max-w-md w-full mx-auto">
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <img src="/logo.png" alt="" className="h-12 w-12" />
            <div>
              <p className="font-display text-lg">{t('hospital')}</p>
              <p className="text-xs text-ink/50">{t('tagline')}</p>
            </div>
          </div>

          <div className="flex gap-1 mb-8">
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={`px-3 py-1 rounded-full text-xs ${
                  lang === l.code ? 'bg-teal text-cream' : 'text-ink/50 hover:bg-white'
                }`}
              >{l.native}</button>
            ))}
          </div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-[11px] uppercase tracking-[0.22em] text-teal font-semibold">Hospital desk</p>
            <h1 className="font-display text-3xl mt-2 text-ink">{t('loginTitle')}</h1>
            <p className="text-sm text-ink/55 mt-2">{t('loginSub')}</p>

            <form onSubmit={submit} className="mt-8 space-y-4">
              <Input label={t('email')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              <Input label={t('password')} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
              {err && <p className="text-sm text-coral">{err}</p>}
              <Button type="submit" className="w-full h-11" disabled={busy}>
                {busy ? t('signing') : mode === 'in' ? t('signIn') : t('signUp')}
              </Button>
            </form>

            <div className="my-5 flex items-center gap-3 text-xs text-ink/40">
              <div className="flex-1 h-px bg-line" /> {t('or')} <div className="flex-1 h-px bg-line" />
            </div>

            <Button variant="ghost" className="w-full h-11" type="button" onClick={() => signInWithGoogle('Ayzal Kidz Care')}>
              <svg viewBox="0 0 24 24" className="h-4 w-4"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.4 12 2.4 6.9 2.4 2.7 6.6 2.7 11.7S6.9 21 12 21c6.9 0 9.1-4.8 9.1-7.3 0-.5 0-.8-.1-1.2H12z"/></svg>
              {t('google')}
            </Button>

            <p className="mt-6 text-sm text-ink/55 text-center">
              {mode === 'in' ? t('noAccount') : t('haveAccount')}{' '}
              <button className="text-teal font-medium" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>
                {mode === 'in' ? t('signUp') : t('signIn')}
              </button>
            </p>

            <div className="mt-8 rounded-2xl border border-line bg-white p-4">
              <p className="text-[11px] uppercase tracking-wider text-ink/40 mb-2">{t('demoHint')}</p>
              <div className="space-y-2">
                {DEMOS.map((d) => (
                  <button
                    key={d.email}
                    type="button"
                    onClick={() => { setEmail(d.email); setPassword(d.password); setMode('in'); }}
                    className="w-full text-left text-xs rounded-xl px-3 py-2 hover:bg-paper flex justify-between"
                  >
                    <span className="text-ink/70">{d.email}</span>
                    <span className="text-teal font-medium">{d.role}</span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-ink/40 mt-2">Password · Ayzal@2026</p>
            </div>
            <div className="mt-4">
              <InstallButton variant="settings" />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
