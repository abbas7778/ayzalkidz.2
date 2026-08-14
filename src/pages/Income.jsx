import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Printer } from 'lucide-react';
import { api, formatINR, formatDate, todayISO, PAYMENT_MODES } from '../lib/api';
import { openPrint } from '../lib/print';
import { useI18n } from '../contexts/I18nContext';
import { useToast } from '../contexts/ToastContext';
import { PageHeader, Card, Button, Input, Select, Textarea, Modal, SearchBar, Pagination, Empty, Skeleton, TableWrap, Th, Td } from '../components/UI';

const empty = () => ({ txn_date: todayISO(), category: '', description: '', amount: '', payment_mode: 'Cash', receipt_number: '', notes: '' });

export default function Income() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [cats, setCats] = useState([]);
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
    try {
      const [inc, c] = await Promise.all([api('/api/income'), api('/api/categories?kind=income')]);
      setRows(Array.isArray(inc) ? inc : []);
      setCats(Array.isArray(c) ? c : []);
    } catch (e) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return rows.filter((r) => {
      if (cat && r.category !== cat) return false;
      if (!s) return true;
      return [r.category, r.description, r.receipt_number, r.payment_mode].some((v) => String(v || '').toLowerCase().includes(s));
    });
  }, [rows, q, cat]);

  const pages = Math.max(1, Math.ceil(filtered.length / per));
  const slice = filtered.slice((page - 1) * per, page * per);
  const total = filtered.reduce((s, r) => s + Number(r.amount || 0), 0);

  const validate = () => {
    const e = {};
    if (!form.category) e.category = 'Category is required';
    if (!form.amount || Number(form.amount) <= 0) e.amount = 'Enter a valid amount';
    if (!form.txn_date) e.txn_date = 'Date is required';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const save = async () => {
    if (!validate()) return;
    setBusy(true);
    try {
      if (modal === 'edit') {
        await api('/api/income', { method: 'PUT', body: JSON.stringify(form) });
        toast(t('saved'));
      } else {
        await api('/api/income', { method: 'POST', body: JSON.stringify(form) });
        toast(t('created'));
      }
      setModal(null);
      await load();
    } catch (e) { toast(e.message, 'error'); }
    finally { setBusy(false); }
  };

  const remove = async (r) => {
    if (!confirm(t('confirmDelete'))) return;
    try {
      await api('/api/income', { method: 'DELETE', body: JSON.stringify({ id: r.id }) });
      toast(t('deleted')); load();
    } catch (e) { toast(e.message, 'error'); }
  };

  const printRow = (r) => openPrint(`/print/receipt/${r.id}?kind=income&paper=a4`);

  return (
    <div>
      <PageHeader
        eyebrow="Collections"
        title={t('nav.income')}
        subtitle="OPD, pharmacy, lab and ward receipts — dated and numbered."
        actions={<Button onClick={() => { setForm({ ...empty(), category: cats[0]?.name || '' }); setErrors({}); setModal('add'); }}><Plus size={15} /> {t('btn.add')}</Button>}
      />
      <div className="grid sm:grid-cols-3 gap-3 mb-4">
        <Card className="p-4"><p className="text-[11px] uppercase tracking-wider text-ink/40">Shown total</p><p className="font-display text-2xl text-teal mt-1">{formatINR(total)}</p></Card>
        <Card className="p-4"><p className="text-[11px] uppercase tracking-wider text-ink/40">Entries</p><p className="font-display text-2xl mt-1">{filtered.length}</p></Card>
        <Card className="p-4"><p className="text-[11px] uppercase tracking-wider text-ink/40">Today</p><p className="font-display text-2xl mt-1">{formatINR(rows.filter((r) => r.txn_date === todayISO()).reduce((s, r) => s + Number(r.amount), 0))}</p></Card>
      </div>
      <Card>
        <div className="p-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <SearchBar value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder={t('btn.search')} />
          <Select value={cat} onChange={(e) => { setCat(e.target.value); setPage(1); }} className="sm:w-52">
            <option value="">{t('all')}</option>
            {cats.map((c) => <option key={c.id}>{c.name}</option>)}
          </Select>
        </div>
        {loading ? <div className="p-4 space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div> : filtered.length === 0 ? <Empty text="No transactions yet" /> : (
          <>
            <TableWrap>
              <table className="w-full min-w-[860px]">
                <thead className="bg-paper/80"><tr>
                  <Th>{t('fields.date')}</Th><Th>{t('fields.receipt')}</Th><Th>{t('fields.category')}</Th><Th>{t('fields.description')}</Th>
                  <Th>{t('fields.payment')}</Th><Th className="text-right">{t('fields.amount')}</Th><Th></Th>
                </tr></thead>
                <tbody>
                  {slice.map((r) => (
                    <tr key={r.id} className="border-t border-line/80 hover:bg-paper/50">
                      <Td>{formatDate(r.txn_date)}</Td>
                      <Td className="font-mono text-xs">{r.receipt_number}</Td>
                      <Td>{r.category}</Td>
                      <Td className="max-w-[220px] truncate">{r.description}</Td>
                      <Td>{r.payment_mode}</Td>
                      <Td className="text-right font-medium text-teal">{formatINR(r.amount)}</Td>
                      <Td>
                        <div className="flex justify-end gap-1">
                          <button onClick={() => printRow(r)} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-paper"><Printer size={14} /></button>
                          <button onClick={() => { setForm(r); setErrors({}); setModal('edit'); }} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-paper"><Pencil size={14} /></button>
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
          <Input type="date" label={t('fields.date')} value={form.txn_date || ''} error={errors.txn_date} onChange={(e) => setForm({ ...form, txn_date: e.target.value })} />
          <Select label={t('fields.category')} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option value="">Select</option>
            {cats.map((c) => <option key={c.id}>{c.name}</option>)}
          </Select>
          {errors.category && <p className="text-xs text-coral sm:col-span-2 -mt-2">{errors.category}</p>}
          <Input label={t('fields.description')} className="sm:col-span-2" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Input type="number" label={t('fields.amount')} value={form.amount} error={errors.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Select label={t('fields.payment')} value={form.payment_mode} onChange={(e) => setForm({ ...form, payment_mode: e.target.value })}>
            {PAYMENT_MODES.map((m) => <option key={m}>{m}</option>)}
          </Select>
          <Input label={t('fields.receipt')} value={form.receipt_number || ''} onChange={(e) => setForm({ ...form, receipt_number: e.target.value })} placeholder="Auto if empty" />
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
