import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, ImageIcon, Printer } from 'lucide-react';
import { api, formatINR, formatDate, todayISO, PAYMENT_MODES, PURCHASE_CATS, uploadFile } from '../lib/api';
import { openPrint } from '../lib/print';
import { useI18n } from '../contexts/I18nContext';
import { useToast } from '../contexts/ToastContext';
import { PageHeader, Card, Button, Input, Select, Textarea, Modal, SearchBar, Pagination, Empty, Skeleton, TableWrap, Th, Td } from '../components/UI';

const empty = () => ({ txn_date: todayISO(), category: 'Hospital Supplies', seller: '', item: '', quantity: 1, rate: '', total: '', payment_mode: 'Cash', bill_number: '', bill_photo: '', notes: '' });

export default function Purchases() {
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
  const [preview, setPreview] = useState('');
  const per = 10;

  const load = async () => {
    try { const data = await api('/api/purchases'); setRows(Array.isArray(data) ? data : []); }
    catch (e) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return rows.filter((r) => (!cat || r.category === cat) && (!s || [r.seller, r.item, r.bill_number, r.category].some((v) => String(v || '').toLowerCase().includes(s))));
  }, [rows, q, cat]);

  const pages = Math.max(1, Math.ceil(filtered.length / per));
  const slice = filtered.slice((page - 1) * per, page * per);

  const setNum = (patch) => {
    const next = { ...form, ...patch };
    const qty = Number(next.quantity || 0);
    const rate = Number(next.rate || 0);
    next.total = qty && rate ? qty * rate : next.total;
    setForm(next);
  };

  const validate = () => {
    const e = {};
    if (!form.item?.trim()) e.item = 'Item is required';
    if (!form.total || Number(form.total) <= 0) e.total = 'Enter rate and quantity';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const onFile = async (file) => {
    if (!file) return;
    try {
      const { url } = await uploadFile(file);
      setForm((f) => ({ ...f, bill_photo: url }));
      toast('Bill photo attached');
    } catch (e) { toast(e.message, 'error'); }
  };

  const save = async () => {
    if (!validate()) return;
    setBusy(true);
    try {
      await api('/api/purchases', { method: modal === 'edit' ? 'PUT' : 'POST', body: JSON.stringify(form) });
      toast(modal === 'edit' ? t('saved') : t('created'));
      setModal(null); await load();
    } catch (e) { toast(e.message, 'error'); }
    finally { setBusy(false); }
  };

  const remove = async (r) => {
    if (!confirm(t('confirmDelete'))) return;
    try { await api('/api/purchases', { method: 'DELETE', body: JSON.stringify({ id: r.id }) }); toast(t('deleted')); load(); }
    catch (e) { toast(e.message, 'error'); }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Stores"
        title={t('nav.purchases')}
        subtitle="Bedsheets, curtains, stationery and hospital supplies."
        actions={
          <>
            <Button variant="ghost" onClick={() => openPrint(`/print/report?type=purchases&period=yearly&from=${todayISO().slice(0, 4)}-01-01&to=${todayISO()}&paper=a4`)}><Printer size={14} /> Print report</Button>
            <Button onClick={() => { setForm(empty()); setErrors({}); setModal('add'); }}><Plus size={15} /> {t('btn.add')}</Button>
          </>
        }
      />
      <Card>
        <div className="p-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <SearchBar value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder={t('btn.search')} />
          <Select value={cat} onChange={(e) => { setCat(e.target.value); setPage(1); }} className="sm:w-52">
            <option value="">{t('all')}</option>
            {PURCHASE_CATS.map((c) => <option key={c}>{c}</option>)}
          </Select>
        </div>
        {loading ? <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div> : filtered.length === 0 ? <Empty text="No purchases yet" /> : (
          <>
            <TableWrap>
              <table className="w-full min-w-[960px]">
                <thead className="bg-paper/80"><tr>
                  <Th>{t('fields.date')}</Th><Th>{t('fields.seller')}</Th><Th>{t('fields.item')}</Th><Th>{t('fields.qty')}</Th>
                  <Th>{t('fields.rate')}</Th><Th className="text-right">{t('fields.total')}</Th><Th>{t('fields.payment')}</Th><Th></Th>
                </tr></thead>
                <tbody>
                  {slice.map((r) => (
                    <tr key={r.id} className="border-t border-line/80 hover:bg-paper/50">
                      <Td>{formatDate(r.txn_date)}</Td>
                      <Td>{r.seller}</Td>
                      <Td>
                        <div className="flex items-center gap-2">
                          <span>{r.item}</span>
                          <span className="text-[11px] text-ink/40">{r.category}</span>
                          {r.bill_photo && <button onClick={() => setPreview(r.bill_photo)} className="text-teal"><ImageIcon size={14} /></button>}
                        </div>
                      </Td>
                      <Td>{r.quantity}</Td>
                      <Td>{formatINR(r.rate)}</Td>
                      <Td className="text-right font-medium">{formatINR(r.total)}</Td>
                      <Td>{r.payment_mode}</Td>
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

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'edit' ? t('btn.edit') : t('btn.add')} wide>
        <div className="grid sm:grid-cols-2 gap-3">
          <Input type="date" label={t('fields.date')} value={form.txn_date || ''} onChange={(e) => setForm({ ...form, txn_date: e.target.value })} />
          <Select label={t('fields.category')} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {PURCHASE_CATS.map((c) => <option key={c}>{c}</option>)}
          </Select>
          <Input label={t('fields.seller')} value={form.seller || ''} onChange={(e) => setForm({ ...form, seller: e.target.value })} />
          <Input label={t('fields.item')} value={form.item || ''} error={errors.item} onChange={(e) => setForm({ ...form, item: e.target.value })} />
          <Input type="number" label={t('fields.qty')} value={form.quantity} onChange={(e) => setNum({ quantity: e.target.value })} />
          <Input type="number" label={t('fields.rate')} value={form.rate} onChange={(e) => setNum({ rate: e.target.value })} />
          <Input type="number" label={t('fields.total')} value={form.total} error={errors.total} onChange={(e) => setForm({ ...form, total: e.target.value })} />
          <Select label={t('fields.payment')} value={form.payment_mode} onChange={(e) => setForm({ ...form, payment_mode: e.target.value })}>
            {PAYMENT_MODES.map((m) => <option key={m}>{m}</option>)}
          </Select>
          <Input label={t('fields.bill')} value={form.bill_number || ''} onChange={(e) => setForm({ ...form, bill_number: e.target.value })} />
          <div>
            <span className="block text-xs font-medium text-ink/60 mb-1.5">{t('fields.photo')}</span>
            <input type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0])} className="text-sm" />
            {form.bill_photo && <img src={form.bill_photo} alt="" className="mt-2 h-16 rounded-lg object-cover" />}
          </div>
          <Textarea label={t('fields.notes')} className="sm:col-span-2" value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="ghost" onClick={() => setModal(null)}>{t('btn.cancel')}</Button>
          <Button onClick={save} disabled={busy}>{t('btn.save')}</Button>
        </div>
      </Modal>

      <Modal open={!!preview} onClose={() => setPreview('')} title="Bill photo">
        {preview && <img src={preview} alt="" className="w-full rounded-xl" />}
      </Modal>
    </div>
  );
}
