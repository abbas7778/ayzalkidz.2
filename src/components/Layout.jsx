import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Stethoscope, IndianRupee, Wallet, Sparkles, ShoppingBag,
  FileBarChart, Scale, Users, HardDrive, Settings, Bell, Menu, X, LogOut,
  ChevronDown, Languages,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { api } from '../lib/api';
import supabase from '../lib/supabase';
import { LANGS } from '../lib/i18n';
import InstallButton from './InstallButton';
import OfflineBanner from './OfflineBanner';

const NAV = [
  { to: '/', key: 'dashboard', icon: LayoutDashboard, mod: 'dashboard' },
  { to: '/staff', key: 'staff', icon: Stethoscope, mod: 'staff' },
  { to: '/income', key: 'income', icon: IndianRupee, mod: 'income' },
  { to: '/expenses', key: 'expenses', icon: Wallet, mod: 'expenses' },
  { to: '/maintenance', key: 'maintenance', icon: Sparkles, mod: 'maintenance' },
  { to: '/purchases', key: 'purchases', icon: ShoppingBag, mod: 'purchases' },
  { to: '/reports', key: 'reports', icon: FileBarChart, mod: 'reports' },
  { to: '/profit', key: 'profit', icon: Scale, mod: 'profit' },
  { to: '/users', key: 'users', icon: Users, mod: 'users' },
  { to: '/backup', key: 'backup', icon: HardDrive, mod: 'backup' },
  { to: '/settings', key: 'settings', icon: Settings, mod: 'settings' },
];

const SIDEBAR_KEY = 'ayzal-sidebar-open';
const LG = 1024;

function isLg() {
  return typeof window !== 'undefined' && window.innerWidth >= LG;
}

function readDesktopPref() {
  try {
    const v = localStorage.getItem(SIDEBAR_KEY);
    if (v === '0') return false;
    if (v === '1') return true;
  } catch { /* ignore */ }
  return true;
}

export default function Layout() {
  const { profile, can, user } = useAuth();
  const { t, lang, setLang } = useI18n();
  const allow = typeof can === 'function' ? can : () => true;
  void allow;
  const [wide, setWide] = useState(isLg);
  const [open, setOpen] = useState(() => (isLg() ? readDesktopPref() : false));
  const [notifOpen, setNotifOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [profOpen, setProfOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const loc = useLocation();
  const nav = useNavigate();

  useEffect(() => {
    const onResize = () => {
      const nowWide = isLg();
      setWide((wasWide) => {
        if (wasWide && !nowWide) setOpen(false);
        if (!wasWide && nowWide) setOpen(readDesktopPref());
        return nowWide;
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!isLg()) setOpen(false);
    setNotifOpen(false);
    setLangOpen(false);
    setProfOpen(false);
  }, [loc.pathname]);

  useEffect(() => {
    api('/api/notifications')
      .then((rows) => setNotifs(Array.isArray(rows) ? rows : []))
      .catch(() => setNotifs([]));
  }, []);

  const setSidebar = (next) => {
    setOpen(next);
    if (isLg()) {
      try { localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0'); } catch { /* ignore */ }
    }
  };

  const toggleSidebar = () => setSidebar(!open);
  const closeSidebar = () => setSidebar(false);

  const unread = (Array.isArray(notifs) ? notifs : []).filter((n) => !n.read).length;
  const items = NAV;

  const markAll = async () => {
    try {
      await api('/api/notifications', { method: 'PUT', body: JSON.stringify({ all: true }) });
      setNotifs((p) => p.map((n) => ({ ...n, read: true })));
    } catch { /* ignore */ }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    nav('/login');
  };

  const initials = (profile?.name || user?.email || 'A').slice(0, 2).toUpperCase();

  const MOBILE_NAV = [
    { to: '/', key: 'dashboard', icon: LayoutDashboard, end: true },
    { to: '/staff', key: 'staff', icon: Stethoscope },
    { to: '/income', key: 'income', icon: IndianRupee },
    { to: '/expenses', key: 'expenses', icon: Wallet },
  ];

  return (
    <div className="relative min-h-screen bg-paper">
      <div
        className={`fixed inset-0 z-[45] bg-ink/40 transition-opacity duration-300 lg:hidden ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      <aside
        id="app-sidebar"
        className="fixed top-0 left-0 z-[50] flex h-[100dvh] w-[min(272px,88vw)] flex-col bg-teal-deep pt-[env(safe-area-inset-top)] text-cream shadow-lift transition-transform duration-300 ease-in-out"
        style={{ transform: open ? 'translateX(0)' : 'translateX(-100%)' }}
        aria-hidden={!open}
      >
        <div className="border-b border-white/10 px-5 pb-5 pt-6">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="" className="h-11 w-11 rounded-full bg-cream/10 object-cover" />
            <div className="min-w-0">
              <p className="truncate font-display text-[15px] leading-tight">{t('hospital')}</p>
              <p className="mt-0.5 truncate text-[11px] text-cream/55">Tharad · Gujarat</p>
            </div>
            <button type="button" className="ml-auto grid h-8 w-8 place-items-center text-cream/70" onClick={closeSidebar} aria-label="Close menu">
              <X size={18} />
            </button>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {items.map((n) => {
            const Icon = n.icon;
            return (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] transition ${
                    isActive ? 'bg-cream/12 text-cream shadow-inner' : 'text-cream/70 hover:bg-white/6 hover:text-cream'
                  }`
                }
              >
                <Icon size={17} strokeWidth={1.75} />
                <span>{t(`nav.${n.key}`)}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="rounded-2xl bg-white/6 px-3 py-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-gold/90">Paediatric desk</p>
            <p className="mt-1 text-xs leading-relaxed text-cream/60">Ayzal Kidz Care · accounts & ward ledger</p>
          </div>
        </div>
      </aside>

      <div
        className="flex min-h-screen min-w-0 flex-col transition-[padding] duration-300 ease-in-out"
        style={{ paddingLeft: wide && open ? 272 : 0 }}
      >
        <header className="sticky top-0 z-[40] border-b border-line bg-paper/85 pt-[env(safe-area-inset-top)] backdrop-blur-md">
          <OfflineBanner />
          <div className="flex h-14 items-center gap-2 px-3 sm:h-16 sm:gap-3 sm:px-6">
            <button
              type="button"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line bg-white"
              onClick={toggleSidebar}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              aria-controls="app-sidebar"
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div className="hidden min-w-0 sm:block">
              <p className="truncate font-display text-[15px] text-ink">{t('hospital')}</p>
              <p className="truncate text-[11px] text-ink/45">{t('tagline')}</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
              <InstallButton />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => { setLangOpen((v) => !v); setNotifOpen(false); setProfOpen(false); }}
                  className="flex h-9 items-center gap-1.5 rounded-xl border border-line bg-white px-2.5 text-xs font-medium hover:border-teal/40"
                >
                  <Languages size={14} className="text-teal" />
                  <span className="hidden sm:inline">{LANGS.find((l) => l.code === lang)?.native}</span>
                  <span className="sm:hidden">{lang.toUpperCase()}</span>
                  <ChevronDown size={12} className="text-ink/40" />
                </button>
                {langOpen && (
                  <div className="absolute right-0 mt-2 w-40 overflow-hidden rounded-2xl border border-line bg-white py-1 shadow-lift">
                    {LANGS.map((l) => (
                      <button
                        key={l.code}
                        type="button"
                        onClick={() => { setLang(l.code); setLangOpen(false); }}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-paper ${
                          lang === l.code ? 'font-medium text-teal' : 'text-ink/80'
                        }`}
                      >
                        {l.native}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => { setNotifOpen((v) => !v); setLangOpen(false); setProfOpen(false); }}
                  className="relative grid h-9 w-9 place-items-center rounded-xl border border-line bg-white"
                >
                  <Bell size={16} />
                  {unread > 0 && (
                    <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-coral px-1 text-[10px] text-white">
                      {unread}
                    </span>
                  )}
                </button>
                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-white shadow-lift">
                    <div className="flex items-center justify-between border-b border-line px-4 py-3">
                      <p className="text-sm font-medium">{t('notifications')}</p>
                      {unread > 0 && (
                        <button type="button" onClick={markAll} className="text-[11px] font-medium text-teal">{t('btn.markAll')}</button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifs.length === 0 && <p className="px-4 py-8 text-center text-sm text-ink/45">{t('noNotif')}</p>}
                      {notifs.map((n) => (
                        <div key={n.id} className={`border-b border-line/70 px-4 py-3 ${n.read ? '' : 'bg-sage/30'}`}>
                          <p className="text-sm text-ink">{n.title}</p>
                          <p className="mt-0.5 text-xs text-ink/50">{n.body}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => { setProfOpen((v) => !v); setLangOpen(false); setNotifOpen(false); }}
                  className="flex h-9 items-center gap-2 rounded-xl border border-line bg-white pl-1.5 pr-2.5"
                >
                  <span className="grid h-6 w-6 place-items-center rounded-lg bg-teal text-[10px] font-semibold text-cream">{initials}</span>
                  <span className="hidden max-w-[120px] truncate text-xs font-medium md:block">{profile?.name || 'Staff'}</span>
                  <ChevronDown size={12} className="hidden text-ink/40 md:block" />
                </button>
                {profOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-line bg-white py-2 shadow-lift">
                    <div className="mb-1 border-b border-line px-3 pb-2">
                      <p className="truncate text-sm font-medium">{profile?.name}</p>
                      <p className="truncate text-[11px] text-ink/45">{user?.email}</p>
                      <p className="mt-1 text-[11px] capitalize text-teal">{profile?.role}</p>
                    </div>
                    <button type="button" onClick={signOut} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-coral hover:bg-paper">
                      <LogOut size={14} /> {t('btn.signOut')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-3 pb-24 sm:p-6 lg:p-8 lg:pb-8">
          <Outlet />
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-[30] border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
          <div className="grid grid-cols-5">
            {MOBILE_NAV.map((n) => {
              const Icon = n.icon;
              return (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) =>
                    `flex min-h-14 flex-col items-center justify-center gap-0.5 py-2 text-[10px] ${
                      isActive ? 'font-semibold text-teal' : 'text-ink/50'
                    }`
                  }
                >
                  <Icon size={18} strokeWidth={1.75} />
                  <span>{t(`nav.${n.key}`)}</span>
                </NavLink>
              );
            })}
            <button
              type="button"
              onClick={toggleSidebar}
              className="flex min-h-14 flex-col items-center justify-center gap-0.5 py-2 text-[10px] text-ink/50"
            >
              <Menu size={18} />
              <span>More</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
