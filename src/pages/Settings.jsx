import { useEffect, useState } from 'react';
import { api, uploadFile, formatDate } from '../lib/api';
import { useI18n } from '../contexts/I18nContext';
import { useToast } from '../contexts/ToastContext';
import { PageHeader, Card, Button, Input, Select, Textarea, Skeleton } from '../components/UI';
import InstallButton from '../components/InstallButton';

export default function Settings() {
  const { t, setLang } = useI18n();
  const { toast } = useToast();
  const [form, setForm] = useState(null);
  const [cats, setCats] = useState([]);
  const [newCat, setNewCat] = useState({ kind: 'income', name: '' });
  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState([]);

  const load = async () => {
    try {
      const [s, c, a] = await Promise.all([
        api('/api/settings'),
        api('/api/categories'),
        api('/api/audit?limit=20').catch(() => []),
      ]);
      setLogs(Array.isArray(a) ? a : []);
      setForm(s || {
        hospital_name: 'Ayzal Kidz Care Hospital',
        address: 'Tharad, Banaskantha, Gujarat',
        phone: '', email: '', gstin: '', logo_url: '/logo.png',
        language: 'en', currency: 'INR', printer: 'a4',
      });
      setCats(Array.isArray(c) ? c : []);
    } catch (e) { toast(e.message, 'error'); }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setBusy(true);
    try {
      const saved = await api('/api/settings', { method: 'PUT', body: JSON.stringify(form) });
      setForm(saved);
      if (saved.language) setLang(saved.language);
      toast(t('saved'));
    } catch (e) { toast(e.message, 'error'); }
    finally { setBusy(false); }
  };

  const onLogo = async (file) => {
    if (!file) return;
    try {
      const { url } = await uploadFile(file);
      setForm({ ...form, logo_url: url });
      toast('Logo uploaded');
    } catch (e) { toast(e.message, 'error'); }
  };

  const addCat = async () => {
    if (!newCat.name.trim()) return;
    try {
      await api('/api/categories', { method: 'POST', body: JSON.stringify(newCat) });
      setNewCat({ ...newCat, name: '' });
      setCats(await api('/api/categories'));
      toast(t('created'));
    } catch (e) { toast(e.message, 'error'); }
  };

  const delCat = async (id) => {
    try {
      await api('/api/categories', { method: 'DELETE', body: JSON.stringify({ id }) });
      setCats(await api('/api/categories'));
    } catch (e) { toast(e.message, 'error'); }
  };

  if (!form) return <Skeleton className="h-80" />;

  return (
    <div>
      <PageHeader eyebrow="House rules" title={t('nav.settings')} subtitle="Letterhead, language, printer and the categories the ledger lives by." />
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5 sm:p-6">
          <p className="font-display text-lg mb-4">Hospital details</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Hospital name" className="sm:col-span-2" value={form.hospital_name || ''} onChange={(e) => setForm({ ...form, hospital_name: e.target.value })} />
            <Textarea label={t('fields.address')} className="sm:col-span-2" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <Input label={t('fields.phone')} value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label={t('fields.email')} value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label={t('fields.gstin')} value={form.gstin || ''} onChange={(e) => setForm({ ...form, gstin: e.target.value })} />
            <Select label={t('fields.language')} value={form.language || 'en'} onChange={(e) => setForm({ ...form, language: e.target.value })}>
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
              <option value="gu">ગુજરાતી</option>
            </Select>
            <Select label={t('fields.currency')} value={form.currency || 'INR'} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
              <option value="INR">INR · ₹</option>
              <option value="USD">USD · $</option>
            </Select>
            <Select label={t('fields.printer')} value={form.printer || 'a4'} onChange={(e) => setForm({ ...form, printer: e.target.value })}>
              <option value="a4">A4 laser / inkjet</option>
              <option value="thermal">80mm thermal</option>
            </Select>
            <div className="sm:col-span-2">
              <span className="block text-xs font-medium text-ink/60 mb-1.5">{t('fields.logo')}</span>
              <div className="flex items-center gap-4">
                <img src={form.logo_url || '/logo.png'} alt="" className="h-14 w-14 rounded-full object-cover bg-paper border border-line" />
                <input type="file" accept="image/*" onChange={(e) => onLogo(e.target.files?.[0])} className="text-sm" />
              </div>
            </div>
          </div>
          <div className="flex justify-end mt-5">
            <Button onClick={save} disabled={busy}>{t('btn.save')}</Button>
          </div>
          <div className="mt-6 pt-5 border-t border-line">
            <InstallButton variant="settings" />
          </div>
        </Card>

        <Card className="p-5">
          <p className="font-display text-lg mb-3">Categories</p>
          <div className="flex gap-2 mb-3">
            <Select value={newCat.kind} onChange={(e) => setNewCat({ ...newCat, kind: e.target.value })} className="w-28">
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </Select>
            <Input value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} placeholder="Name" className="flex-1" />
            <Button onClick={addCat}>{t('btn.add')}</Button>
          </div>
          <div className="space-y-1 max-h-[420px] overflow-y-auto">
            {cats.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-sm px-2 py-1.5 rounded-lg hover:bg-paper">
                <span><span className="text-[10px] uppercase text-ink/40 mr-2">{c.kind}</span>{c.name}</span>
                <button onClick={() => delCat(c.id)} className="text-coral text-xs">Remove</button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-5 mt-4">
        <p className="font-display text-lg mb-1">Audit log</p>
        <p className="text-xs text-ink/45 mb-3">Recent writes stored in Supabase. Not a local cache.</p>
        {logs.length === 0 ? (
          <p className="text-sm text-ink/45">No audit entries yet.</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {logs.map((l) => (
              <div key={l.id} className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-line px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="font-medium truncate">{l.summary || l.action}</p>
                  <p className="text-[11px] text-ink/45">{l.actor_name || l.actor_email} · {l.module}</p>
                </div>
                <span className="text-[11px] text-ink/40 whitespace-nowrap">{formatDate(String(l.created_at || '').slice(0, 10))}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
