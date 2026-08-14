import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Printer } from 'lucide-react';
import { api, formatINR, formatDate, todayISO, PAYMENT_MODES, MAINT_CATS } from '../lib/api';
import { openPrint } from '../lib/print';
import { useI18n } from '../contexts/I18nContext';
import { useToast } from '../contexts/ToastContext';
import { PageHeader, Card, Button, Input, Select, Textarea, Modal, SearchBar, Pagination, Empty, Skeleton, TableWrap, Th, Td } from '../components/UI';

const empty = () => ({ txn_date: todayISO(), category: 'Cleaning Material', item: '', quantity: 1, amount: '', payment_mode: 'Cash', paid_by: '', bill_number: '', notes: '' });

export default function Maintenance() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty());
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const per = 10;

  const load = async () => {
    try { const data = await api('/api/maintenance'); setRows(Array.isArray(data) ? data : []); }
    catch (e) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return rows.filter((r) => (!cat || r.category === cat) && (!s || [r.category, r.item, r.paid_by].some((v) => String(v || '').toLowerCase().includes(s))));
  }, [rows, q, cat]);

  const pages = Math.max(1, Math.ceil(filtered.length / per));
  const slice = filtered.slice((page - 1) * per, page * per);
  const totals = useMemo(() => {
    const map = {};
    rows.forEach((r) => { map[r.category] = (map[r.category] || 0) + Number(r.amount || 0); });
    return map;
  }, [rows]);

  const validate = () => {
    const e = {};
    if (!form.category) e.category = 'Required';
    if (!form.amount || Number(form.amount) <= 0) e.amount = 'Enter a valid amount';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const save = async () => {
    if (!validate()) return;
    setBusy(true);
    try {
      await api('/api/maintenance', { method: modal === 'edit' ? 'PUT' : 'POST', body: JSON.stringify(form) });
      toast(modal === 'edit' ? t('saved') : t('created'));
      setModal(null); await load();
    } catch (e) { toast(e.message, 'error'); }
    finally { setBusy(false); }
  };

  const remove = async (r) => {
    if (!confirm(t('confirmDelete'))) return;
    try { await api('/api/maintenance', { method: 'DELETE', body: JSON.stringify({ id: r.id }) }); toast(t('deleted')); load(); }
    catch (e) { toast(e.message, 'error'); }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Housekeeping & repairs"
        title={t('nav.maintenance')}
        subtitle="Cleaner salary, phenyl to plumbing — the building kept kind."
        actions={
          <>
            <Button variant="ghost" onClick={() => openPrint(`/print/report?type=maintenance&period=yearly&from=${todayISO().slice(0, 4)}-01-01&to=${todayISO()}&paper=a4`)}><Printer size={14} /> Print report</Button>
            <Button onClick={() => { setForm(empty()); setErrors({}); setModal('add'); }}><Plus size={15} /> {t('btn.add')}</Button>
          </>
        }
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {['Cleaner Salary', 'Cleaning Material', 'Electrical', 'Building Maintenance'].map((k) => (
          <Card key={k} className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-ink/40 truncate">{k}</p>
            <p className="font-display text-xl mt-1">{formatINR(totals[k] || 0)}</p>
          </Card>
        ))}
      </div>
      <Card>
        <div className="p-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <SearchBar value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder={t('btn.search')} />
          <Select value={cat} onChange={(e) => { setCat(e.target.value); setPage(1); }} className="sm:w-56">
            <option value="">{t('all')}</option>
            {MAINT_CATS.map((c) => <option key={c}>{c}</option>)}
          </Select>
        </div>
        {loading ? <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div> : filtered.length === 0 ? <Empty text="No maintenance records yet" /> : (
          <>
            <TableWrap>
              <table className="w-full min-w-[860px]">
                <thead className="bg-paper/80"><tr>
                  <Th>{t('fields.date')}</Th><Th>{t('fields.category')}</Th><Th>{t('fields.item')}</Th><Th>{t('fields.qty')}</Th>
                  <Th>{t('fields.paidBy')}</Th><Th className="text-right">{t('fields.amount')}</Th><Th></Th>
                </tr></thead>
                <tbody>
                  {slice.map((r) => (
                    <tr key={r.id} className="border-t border-line/80 hover:bg-paper/50">
                      <Td>{formatDate(r.txn_date)}</Td>
                      <Td>{r.category}</Td>
                      <Td>{r.item || '—'}</Td>
                      <Td>{r.quantity}</Td>
                      <Td>{r.paid_by}</Td>
                      <Td className="text-right font-medium">{formatINR(r.amount)}</Td>
                      <Td>
                        <div className="flex justify-end gap-1">
                          <button onClick={() => { setForm(r); setModal('edit'); }} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-paper"><Pencil size={14} /></button>
                          <button onClick={() => remove(r)} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-coral/10 text-coral"><Trash2 size={14} /></button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
            <Pagination page={page} pages={pages} onPage={setPage} total={filtered.length} />
          </>
        )}
      </Card>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'edit' ? t('btn.edit') : t('btn.add')}>
        <div className="grid sm:grid-cols-2 gap-3">
          <Input type="date" label={t('fields.date')} value={form.txn_date || ''} onChange={(e) => setForm({ ...form, txn_date: e.target.value })} />
          <Select label={t('fields.category')} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {MAINT_CATS.map((c) => <option key={c}>{c}</option>)}
          </Select>
          <Input label={t('fields.item')} value={form.item || ''} onChange={(e) => setForm({ ...form, item: e.target.value })} />
          <Input type="number" label={t('fields.qty')} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          <Input type="number" label={t('fields.amount')} value={form.amount} error={errors.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Select label={t('fields.payment')} value={form.payment_mode} onChange={(e) => setForm({ ...form, payment_mode: e.target.value })}>
            {PAYMENT_MODES.map((m) => <option key={m}>{m}</option>)}
          </Select>
          <Input label={t('fields.paidBy')} value={form.paid_by || ''} onChange={(e) => setForm({ ...form, paid_by: e.target.value })} />
          <Input label={t('fields.bill')} value={form.bill_number || ''} onChange={(e) => setForm({ ...form, bill_number: e.target.value })} />
          <Textarea label={t('fields.notes')} className="sm:col-span-2" value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="ghost" onClick={() => setModal(null)}>{t('btn.cancel')}</Button>
          <Button onClick={save} disabled={busy}>{t('btn.save')}</Button>
        </div>
      </Modal>
    </div>
  );
}
