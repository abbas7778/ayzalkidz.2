import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { api, MODULES, ROLE_PERMS } from '../lib/api';
import { useI18n } from '../contexts/I18nContext';
import { useToast } from '../contexts/ToastContext';
import { PageHeader, Card, Button, Input, Select, Modal, Badge, Empty, Skeleton, TableWrap, Th, Td } from '../components/UI';

const empty = () => ({
  name: '', email: '', password: '', role: 'staff', mobile: '', status: 'active', permissions: { ...ROLE_PERMS.staff },
});

export default function Users() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty());
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try { const data = await api('/api/users'); setRows(Array.isArray(data) ? data : []); }
    catch (e) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const setRole = (role) => setForm({ ...form, role, permissions: { ...ROLE_PERMS[role] } });

  const validate = () => {
    const e = {};
    if (!form.name?.trim()) e.name = 'Name is required';
    if (modal === 'add' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email || '')) e.email = 'Valid email required';
    if (modal === 'add' && (form.password || '').length < 6) e.password = 'Min 6 characters';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const save = async () => {
    if (!validate()) return;
    setBusy(true);
    try {
      if (modal === 'edit') {
        await api('/api/users', { method: 'PUT', body: JSON.stringify({ id: form.id, name: form.name, role: form.role, mobile: form.mobile, status: form.status, permissions: form.permissions }) });
        toast(t('saved'));
      } else {
        await api('/api/users', { method: 'POST', body: JSON.stringify(form) });
        toast(t('created'));
      }
      setModal(null); await load();
    } catch (e) { toast(e.message, 'error'); }
    finally { setBusy(false); }
  };

  const remove = async (r) => {
    if (!confirm(t('confirmDelete'))) return;
    try { await api('/api/users', { method: 'DELETE', body: JSON.stringify({ id: r.id }) }); toast(t('deleted')); load(); }
    catch (e) { toast(e.message, 'error'); }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Access"
        title={t('nav.users')}
        subtitle="Admin, doctor, staff and accountant — each with a keyed set of modules."
        actions={<Button onClick={() => { setForm(empty()); setErrors({}); setModal('add'); }}><Plus size={15} /> {t('btn.add')}</Button>}
      />
      <Card>
        {loading ? <div className="p-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div> : rows.length === 0 ? <Empty text={t('empty')} /> : (
          <TableWrap>
            <table className="w-full min-w-[720px]">
              <thead className="bg-paper/80"><tr>
                <Th>{t('fields.name')}</Th><Th>{t('fields.email')}</Th><Th>{t('fields.role')}</Th><Th>{t('fields.mobile')}</Th><Th>{t('fields.status')}</Th><Th></Th>
              </tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-line/80">
                    <Td className="font-medium">{r.name}</Td>
                    <Td>{r.email}</Td>
                    <Td className="capitalize"><Badge tone={r.role === 'admin' ? 'gold' : 'teal'}>{r.role}</Badge></Td>
                    <Td>{r.mobile || '—'}</Td>
                    <Td><Badge tone={r.status === 'active' ? 'teal' : 'ink'}>{r.status}</Badge></Td>
                    <Td>
                      <div className="flex justify-end gap-1">
                        <button onClick={() => { setForm({ ...r, password: '', permissions: r.permissions || ROLE_PERMS[r.role] }); setModal('edit'); }} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-paper"><Pencil size={14} /></button>
                        <button onClick={() => remove(r)} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-coral/10 text-coral"><Trash2 size={14} /></button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Card>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'edit' ? t('btn.edit') : t('btn.add')} wide>
        <div className="grid sm:grid-cols-2 gap-3">
          <Input label={t('fields.name')} value={form.name} error={errors.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          {modal === 'add' && <Input label={t('fields.email')} value={form.email} error={errors.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />}
          {modal === 'add' && <Input type="password" label={t('password')} value={form.password} error={errors.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />}
          <Input label={t('fields.mobile')} value={form.mobile || ''} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
          <Select label={t('fields.role')} value={form.role} onChange={(e) => setRole(e.target.value)}>
            <option value="admin">Admin</option>
            <option value="doctor">Doctor</option>
            <option value="staff">Staff</option>
            <option value="accountant">Accountant</option>
          </Select>
          <Select label={t('fields.status')} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>
        <p className="text-xs font-medium text-ink/50 mt-5 mb-2">Module permissions</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {MODULES.map((m) => (
            <label key={m} className="flex items-center gap-2 text-sm rounded-xl border border-line px-3 py-2 bg-paper/50">
              <input
                type="checkbox"
                checked={!!form.permissions?.[m]}
                onChange={(e) => setForm({ ...form, permissions: { ...form.permissions, [m]: e.target.checked } })}
              />
              <span className="capitalize">{m}</span>
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="ghost" onClick={() => setModal(null)}>{t('btn.cancel')}</Button>
          <Button onClick={save} disabled={busy}>{t('btn.save')}</Button>
        </div>
      </Modal>
    </div>
  );
}
