import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Eye, Banknote } from 'lucide-react';
import { api, formatINR, formatDate, todayISO, PAYMENT_MODES } from '../lib/api';
import { useI18n } from '../contexts/I18nContext';
import { useToast } from '../contexts/ToastContext';
import { PageHeader, Card, Button, Input, Select, Textarea, Modal, SearchBar, Pagination, Badge, Empty, Skeleton, TableWrap, Th, Td } from '../components/UI';

const PAY_TYPES = ['Salary', 'Advance', 'Bonus', 'Other'];

function monthNow() {
  return todayISO().slice(0, 7);
}

function monthLabel(ym) {
  if (!ym) return '—';
  const [y, m] = String(ym).split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  if (Number.isNaN(d.getTime())) return ym;
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function monthOptions() {
  const out = [];
  const now = new Date();
  for (let i = 0; i < 18; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    out.push({ key, label: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) });
  }
  return out;
}

const emptyDoctor = () => ({
  name: '', mobile: '', type: 'doctor', qualification: '', designation: '', joining_date: todayISO(), salary: '', status: 'active', notes: '',
});

const emptyStaff = () => ({
  name: '', mobile: '', type: 'staff', designation: '', joining_date: todayISO(), salary: '', status: 'active', notes: '',
});

const emptyPay = (staffId = '', month = monthNow()) => ({
  staff_id: staffId, txn_date: todayISO(), payment_type: 'Salary', amount: '', month, payment_mode: 'Cash', paid_by: '', reference: '', notes: '',
});

function statusTone(s) {
  if (s === 'Paid') return 'teal';
  if (s === 'Partial') return 'gold';
  return 'ink';
}

export default function Staff() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [tab, setTab] = useState('doctors');
  const [people, setPeople] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(monthNow());
  const months = useMemo(() => monthOptions(), []);

  const load = async () => {
    try {
      const [all, sum] = await Promise.all([
        api('/api/staff'),
        api(`/api/staff-payments?summary=1&month=${month}`),
      ]);
      setPeople(Array.isArray(all) ? all : []);
      setSummary(sum && typeof sum === 'object' ? sum : { totals: {}, staff: [], payments: [] });
    } catch (e) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [month]); // reload roster + month totals together

  const doctors = people.filter((p) => p.type === 'doctor');
  const staffRows = Array.isArray(summary?.staff) ? summary.staff : people.filter((p) => p.type === 'staff');
  const totals = summary?.totals || {};

  return (
    <div>
      <PageHeader
        eyebrow="People of the ward"
        title={t('nav.staff')}
        subtitle="Doctors and house staff kept on separate rosters. Advances and salary sit with staff."
      />

      <div className="flex flex-wrap gap-1 mb-5 p-1 rounded-2xl bg-white border border-line w-fit">
        {[
          { id: 'doctors', label: 'Doctors' },
          { id: 'staff', label: 'Staff' },
          { id: 'payments', label: 'Staff advance & payments' },
        ].map((x) => (
          <button
            key={x.id}
            onClick={() => setTab(x.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium ${tab === x.id ? 'bg-teal text-cream' : 'text-ink/65 hover:bg-paper'}`}
          >
            {x.label}
          </button>
        ))}
      </div>

      {tab === 'doctors' && (
        <PeopleTable
          kind="doctor"
          rows={doctors}
          loading={loading}
          onChanged={load}
          toast={toast}
          t={t}
        />
      )}
      {tab === 'staff' && (
        <StaffRoster
          rows={staffRows}
          totals={totals}
          loading={loading}
          month={month}
          months={months}
          onMonth={setMonth}
          onChanged={load}
          toast={toast}
          t={t}
        />
      )}
      {tab === 'payments' && (
        <PaymentsDesk
          staff={staffRows}
          payments={Array.isArray(summary?.payments) ? summary.payments : []}
          month={month}
          months={months}
          onMonth={setMonth}
          onChanged={load}
          toast={toast}
          t={t}
        />
      )}
    </div>
  );
}

function PeopleTable({ kind, rows, loading, onChanged, toast, t }) {
  const isDoc = kind === 'doctor';
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(isDoc ? emptyDoctor() : emptyStaff());
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const per = 8;

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return rows.filter((r) => {
      if (status && r.status !== status) return false;
      if (!s) return true;
      return [r.name, r.mobile, r.qualification, r.designation].some((v) => String(v || '').toLowerCase().includes(s));
    });
  }, [rows, q, status]);

  const pages = Math.max(1, Math.ceil(filtered.length / per));
  const slice = filtered.slice((page - 1) * per, page * per);

  const openAdd = () => { setForm(isDoc ? emptyDoctor() : emptyStaff()); setErrors({}); setModal('add'); };
  const openEdit = (r) => { setForm({ ...r, salary: r.salary ?? '' }); setErrors({}); setModal('edit'); };
  const openView = (r) => { setForm(r); setModal('view'); };

  const validate = () => {
    const e = {};
    if (!form.name?.trim()) e.name = 'Name is required';
    if (form.mobile && !/^[0-9+\-\s]{8,15}$/.test(form.mobile)) e.mobile = 'Enter a valid mobile';
    if (form.salary !== '' && Number(form.salary) < 0) e.salary = 'Cannot be negative';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const save = async () => {
    if (!validate()) return;
    setBusy(true);
    try {
      const payload = { ...form, type: kind };
      if (isDoc) payload.specialization = form.designation;
      if (modal === 'edit') {
        await api('/api/staff', { method: 'PUT', body: JSON.stringify(payload) });
        toast(t('saved'));
      } else {
        await api('/api/staff', { method: 'POST', body: JSON.stringify(payload) });
        toast(t('created'));
      }
      setModal(null);
      await onChanged();
    } catch (e) { toast(e.message, 'error'); }
    finally { setBusy(false); }
  };

  const remove = async (r) => {
    if (!confirm(t('confirmDelete'))) return;
    try {
      await api('/api/staff', { method: 'DELETE', body: JSON.stringify({ id: r.id }) });
      toast(t('deleted'));
      onChanged();
    } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <>
      <Card>
        <div className="p-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <SearchBar value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder={`${t('btn.search')} name, mobile…`} />
          <div className="flex flex-wrap gap-2">
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="sm:w-36">
              <option value="">{t('all')}</option>
              <option value="active">{t('status.active')}</option>
              <option value="inactive">{t('status.inactive')}</option>
            </Select>
            <Button onClick={openAdd}><Plus size={15} /> {isDoc ? 'Add doctor' : 'Add staff'}</Button>
          </div>
        </div>
        {loading ? <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          : filtered.length === 0 ? <Empty text={isDoc ? 'No doctors yet' : 'No staff yet'} /> : (
          <>
            <TableWrap>
              <table className="w-full min-w-[860px]">
                <thead className="bg-paper/80"><tr>
                  <Th>{t('fields.name')}</Th>
                  <Th>{t('fields.mobile')}</Th>
                  {isDoc ? <><Th>Qualification</Th><Th>Specialization</Th></> : <Th>Designation</Th>}
                  <Th>{t('fields.join')}</Th>
                  <Th>{isDoc ? 'Payment / Salary' : 'Monthly salary'}</Th>
                  <Th>{t('fields.status')}</Th>
                  <Th></Th>
                </tr></thead>
                <tbody>
                  {slice.map((r) => (
                    <tr key={r.id} className="border-t border-line/80 hover:bg-paper/50">
                      <Td className="font-medium text-ink">{r.name}</Td>
                      <Td>{r.mobile || '—'}</Td>
                      {isDoc ? (
                        <>
                          <Td>{r.qualification || '—'}</Td>
                          <Td>{r.designation || '—'}</Td>
                        </>
                      ) : <Td>{r.designation || '—'}</Td>}
                      <Td>{formatDate(r.joining_date)}</Td>
                      <Td className="tabular-nums">{formatINR(r.salary)}</Td>
                      <Td><Badge tone={r.status === 'active' ? 'teal' : 'ink'}>{t(`status.${r.status}`) || r.status}</Badge></Td>
                      <Td>
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => openView(r)} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-paper" title={t('btn.view')}><Eye size={14} /></button>
                          <button onClick={() => openEdit(r)} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-paper" title={t('btn.edit')}><Pencil size={14} /></button>
                          <button onClick={() => remove(r)} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-coral/10 text-coral" title={t('btn.delete')}><Trash2 size={14} /></button>
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

      <Modal open={modal === 'add' || modal === 'edit'} onClose={() => setModal(null)} title={modal === 'edit' ? (isDoc ? 'Edit doctor' : 'Edit staff') : (isDoc ? 'Add doctor' : 'Add staff')}>
        <div className="grid sm:grid-cols-2 gap-3">
          <Input label={t('fields.name')} value={form.name} error={errors.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label={t('fields.mobile')} value={form.mobile} error={errors.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
          {isDoc && <Input label="Qualification" value={form.qualification || ''} onChange={(e) => setForm({ ...form, qualification: e.target.value })} />}
          <Input label={isDoc ? 'Specialization' : 'Designation'} value={form.designation || ''} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
          <Input type="date" label={t('fields.join')} value={form.joining_date || ''} onChange={(e) => setForm({ ...form, joining_date: e.target.value })} />
          <Input type="number" label={isDoc ? 'Payment / Salary' : 'Monthly salary'} value={form.salary} error={errors.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} />
          <Select label={t('fields.status')} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="active">{t('status.active')}</option>
            <option value="inactive">{t('status.inactive')}</option>
          </Select>
          <Textarea label={t('fields.notes')} className="sm:col-span-2" value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="ghost" onClick={() => setModal(null)}>{t('btn.cancel')}</Button>
          <Button onClick={save} disabled={busy}>{t('btn.save')}</Button>
        </div>
      </Modal>

      <Modal open={modal === 'view'} onClose={() => setModal(null)} title={form.name}>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {[
            ['Mobile', form.mobile],
            isDoc ? ['Qualification', form.qualification] : ['Designation', form.designation],
            isDoc ? ['Specialization', form.designation] : null,
            ['Joined', formatDate(form.joining_date)],
            [isDoc ? 'Payment / Salary' : 'Monthly salary', formatINR(form.salary)],
            ['Status', form.status],
          ].filter(Boolean).map(([k, v]) => (
            <div key={k}><dt className="text-[11px] uppercase tracking-wider text-ink/40">{k}</dt><dd className="mt-0.5 capitalize">{v || '—'}</dd></div>
          ))}
        </dl>
        {form.notes && <p className="mt-4 text-sm text-ink/60">{form.notes}</p>}
      </Modal>
    </>
  );
}

function StaffRoster({ rows, totals, loading, month, months, onMonth, onChanged, toast, t }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [payOpen, setPayOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [history, setHistory] = useState([]);
  const [histMonth, setHistMonth] = useState('');
  const [histType, setHistType] = useState('');
  const per = 8;

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return rows.filter((r) => {
      if (status && r.status !== status) return false;
      if (!s) return true;
      return [r.name, r.mobile, r.designation].some((v) => String(v || '').toLowerCase().includes(s));
    });
  }, [rows, q, status]);

  const pages = Math.max(1, Math.ceil(filtered.length / per));
  const slice = filtered.slice((page - 1) * per, page * per);

  const openDetail = async (r) => {
    setDetail(r);
    setHistMonth(month);
    setHistType('');
    try {
      const pays = await api(`/api/staff-payments?staff_id=${r.id}`);
      setHistory(Array.isArray(pays) ? pays : []);
    } catch (e) { toast(e.message, 'error'); setHistory([]); }
  };

  const shownHistory = history.filter((p) => {
    if (histMonth && p.month !== histMonth) return false;
    if (histType && p.payment_type !== histType) return false;
    return true;
  });

  const histSalary = shownHistory.filter((p) => p.payment_type === 'Salary').reduce((a, p) => a + Number(p.amount || 0), 0);
  const histAdv = shownHistory.filter((p) => p.payment_type === 'Advance').reduce((a, p) => a + Number(p.amount || 0), 0);
  const histOther = shownHistory.filter((p) => p.payment_type !== 'Salary' && p.payment_type !== 'Advance').reduce((a, p) => a + Number(p.amount || 0), 0);

  return (
    <>
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 mb-4">
        <Card className="p-4"><p className="text-[11px] uppercase tracking-wider text-ink/40">Total staff</p><p className="font-display text-2xl mt-1">{totals.totalStaff || 0}</p></Card>
        <Card className="p-4"><p className="text-[11px] uppercase tracking-wider text-ink/40">Total monthly salary</p><p className="font-display text-2xl mt-1">{formatINR(totals.totalMonthlySalary)}</p></Card>
        <Card className="p-4"><p className="text-[11px] uppercase tracking-wider text-ink/40">Salary paid</p><p className="font-display text-2xl mt-1 text-teal">{formatINR(totals.salaryPaid)}</p></Card>
        <Card className="p-4"><p className="text-[11px] uppercase tracking-wider text-ink/40">Advances</p><p className="font-display text-2xl mt-1">{formatINR(totals.advances)}</p></Card>
        <Card className="p-4 col-span-2 xl:col-span-1"><p className="text-[11px] uppercase tracking-wider text-ink/40">Pending salary</p><p className="font-display text-2xl mt-1">{formatINR(totals.pending)}</p></Card>
      </div>

      <PeopleTable kind="staff" rows={rows} loading={loading} onChanged={onChanged} toast={toast} t={t} />

      <Card className="mt-4">
        <div className="p-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div>
            <p className="font-display text-lg">This month’s ledger</p>
            <p className="text-xs text-ink/45">{monthLabel(month)} · salary, advance and remaining</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={month} onChange={(e) => onMonth(e.target.value)} className="sm:w-48">
              {months.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </Select>
            <SearchBar value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search staff…" />
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="sm:w-36">
              <option value="">{t('all')}</option>
              <option value="active">{t('status.active')}</option>
              <option value="inactive">{t('status.inactive')}</option>
            </Select>
          </div>
        </div>
        {loading ? <div className="p-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          : filtered.length === 0 ? <Empty text="No staff yet" /> : (
          <>
            <TableWrap>
              <table className="w-full min-w-[980px]">
                <thead className="bg-paper/80"><tr>
                  <Th>Name</Th><Th>Designation</Th><Th>Monthly salary</Th><Th>Advance</Th><Th>Salary paid</Th>
                  <Th>Remaining</Th><Th>Payment status</Th><Th></Th>
                </tr></thead>
                <tbody>
                  {slice.map((r) => (
                    <tr key={r.id} className="border-t border-line/80 hover:bg-paper/50">
                      <Td>
                        <div className="font-medium">{r.name}</div>
                        <div className="text-[11px] text-ink/45">{r.mobile || '—'}</div>
                      </Td>
                      <Td>{r.designation || '—'}</Td>
                      <Td className="tabular-nums">{formatINR(r.salary)}</Td>
                      <Td className="tabular-nums">{formatINR(r.advance_total)}</Td>
                      <Td className="tabular-nums text-teal">{formatINR(r.salary_paid)}</Td>
                      <Td className="tabular-nums font-medium">{formatINR(r.remaining)}</Td>
                      <Td><Badge tone={statusTone(r.payment_status)}>{r.payment_status}</Badge></Td>
                      <Td>
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => openDetail(r)} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-paper" title="History"><Eye size={14} /></button>
                          <button onClick={() => setPayOpen({ ...emptyPay(r.id, month) })} className="h-8 px-2 rounded-lg hover:bg-paper text-teal flex items-center gap-1 text-xs font-medium"><Banknote size={14} /> Pay</button>
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

      <PaymentModal
        open={!!payOpen}
        form={payOpen || emptyPay()}
        setForm={setPayOpen}
        staff={rows}
        onClose={() => setPayOpen(false)}
        onSaved={async () => { setPayOpen(false); await onChanged(); }}
        toast={toast}
        t={t}
      />

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.name || 'Staff'} wide>
        {detail && (
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <div className="rounded-xl bg-paper p-3"><p className="text-[11px] uppercase tracking-wider text-ink/40">Monthly salary</p><p className="font-display text-xl mt-1">{formatINR(detail.salary)}</p></div>
              <div className="rounded-xl bg-paper p-3"><p className="text-[11px] uppercase tracking-wider text-ink/40">This month advance</p><p className="font-display text-xl mt-1">{formatINR(detail.advance_total)}</p></div>
              <div className="rounded-xl bg-paper p-3"><p className="text-[11px] uppercase tracking-wider text-ink/40">This month remaining</p><p className="font-display text-xl mt-1">{formatINR(detail.remaining)}</p></div>
              <div className="rounded-xl bg-paper p-3"><p className="text-[11px] uppercase tracking-wider text-ink/40">Total paid ({monthLabel(detail.month)})</p><p className="font-display text-xl mt-1">{formatINR(detail.total_paid)}</p></div>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              <Select value={histMonth} onChange={(e) => setHistMonth(e.target.value)} className="sm:w-48">
                <option value="">All months</option>
                {months.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
              </Select>
              <Select value={histType} onChange={(e) => setHistType(e.target.value)} className="sm:w-40">
                <option value="">All types</option>
                {PAY_TYPES.map((p) => <option key={p}>{p}</option>)}
              </Select>
              <Button variant="soft" onClick={() => setPayOpen({ ...emptyPay(detail.id, histMonth || month) })}><Plus size={14} /> Record payment</Button>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs mb-3">
              <div className="rounded-lg border border-line px-3 py-2">Salary history · {formatINR(histSalary)}</div>
              <div className="rounded-lg border border-line px-3 py-2">Advance history · {formatINR(histAdv)}</div>
              <div className="rounded-lg border border-line px-3 py-2">Other · {formatINR(histOther)}</div>
            </div>
            {shownHistory.length === 0 ? <Empty text="No payments yet" /> : (
              <TableWrap>
                <table className="w-full min-w-[640px]">
                  <thead className="bg-paper/80"><tr>
                    <Th>Date</Th><Th>Type</Th><Th>Month</Th><Th>Mode</Th><Th>By</Th><Th className="text-right">Amount</Th>
                  </tr></thead>
                  <tbody>
                    {shownHistory.map((p) => (
                      <tr key={p.id} className="border-t border-line/80">
                        <Td>{formatDate(p.txn_date)}</Td>
                        <Td><Badge tone={p.payment_type === 'Advance' ? 'gold' : p.payment_type === 'Salary' ? 'teal' : 'ink'}>{p.payment_type}</Badge></Td>
                        <Td>{monthLabel(p.month)}</Td>
                        <Td>{p.payment_mode}</Td>
                        <Td>{p.paid_by || '—'}</Td>
                        <Td className="text-right font-medium">{formatINR(p.amount)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}

function PaymentsDesk({ staff, payments, month, months, onMonth, onChanged, toast, t }) {
  const [form, setForm] = useState(emptyPay('', month));
  const [typeFilter, setTypeFilter] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setForm((f) => ({ ...f, month }));
  }, [month]);

  const list = payments.filter((p) => !typeFilter || p.payment_type === typeFilter);

  const save = async (e) => {
    e.preventDefault();
    if (!form.staff_id) { toast('Choose a staff member', 'error'); return; }
    if (!form.amount || Number(form.amount) <= 0) { toast('Enter a valid amount', 'error'); return; }
    setBusy(true);
    try {
      await api('/api/staff-payments', { method: 'POST', body: JSON.stringify(form) });
      toast(`${form.payment_type} recorded`);
      setForm(emptyPay(form.staff_id, form.month));
      await onChanged();
    } catch (err) { toast(err.message, 'error'); }
    finally { setBusy(false); }
  };

  const remove = async (p) => {
    if (!confirm(t('confirmDelete'))) return;
    try {
      await api('/api/staff-payments', { method: 'DELETE', body: JSON.stringify({ id: p.id }) });
      toast(t('deleted'));
      onChanged();
    } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <div className="grid lg:grid-cols-5 gap-4">
      <Card className="lg:col-span-2 p-5">
        <p className="font-display text-lg">Record payment</p>
        <p className="text-xs text-ink/45 mb-4">Salary, advance, bonus or other — booked once into expenses.</p>
        <form onSubmit={save} className="space-y-3">
          <Select label="Staff name" value={form.staff_id} onChange={(e) => setForm({ ...form, staff_id: e.target.value })}>
            <option value="">Select staff</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name}{s.designation ? ` · ${s.designation}` : ''}</option>)}
          </Select>
          <Input type="date" label="Date" value={form.txn_date} onChange={(e) => setForm({ ...form, txn_date: e.target.value })} />
          <Select label="Payment type" value={form.payment_type} onChange={(e) => setForm({ ...form, payment_type: e.target.value })}>
            {PAY_TYPES.map((p) => <option key={p}>{p}</option>)}
          </Select>
          <Input type="number" min="0" label="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Select label="Month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })}>
            {months.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </Select>
          <Select label="Payment mode" value={form.payment_mode} onChange={(e) => setForm({ ...form, payment_mode: e.target.value })}>
            {PAYMENT_MODES.map((m) => <option key={m}>{m}</option>)}
          </Select>
          <Input label="Paid by" value={form.paid_by} onChange={(e) => setForm({ ...form, paid_by: e.target.value })} />
          <Input label="Reference / receipt number" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
          <Textarea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Saving…' : 'Save payment'}</Button>
        </form>
      </Card>

      <Card className="lg:col-span-3">
        <div className="p-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between border-b border-line">
          <div>
            <p className="font-display text-lg">Payments this month</p>
            <p className="text-xs text-ink/45">{monthLabel(month)}</p>
          </div>
          <div className="flex gap-2">
            <Select value={month} onChange={(e) => onMonth(e.target.value)} className="sm:w-44">
              {months.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </Select>
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="sm:w-36">
              <option value="">All types</option>
              {PAY_TYPES.map((p) => <option key={p}>{p}</option>)}
            </Select>
          </div>
        </div>
        {list.length === 0 ? <Empty text="No payments yet" /> : (
          <TableWrap>
            <table className="w-full min-w-[720px]">
              <thead className="bg-paper/80"><tr>
                <Th>Date</Th><Th>Staff</Th><Th>Type</Th><Th>Mode</Th><Th>Reference</Th><Th className="text-right">Amount</Th><Th></Th>
              </tr></thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id} className="border-t border-line/80">
                    <Td>{formatDate(p.txn_date)}</Td>
                    <Td className="font-medium">{p.staff_name}</Td>
                    <Td><Badge tone={p.payment_type === 'Advance' ? 'gold' : p.payment_type === 'Salary' ? 'teal' : 'ink'}>{p.payment_type}</Badge></Td>
                    <Td>{p.payment_mode}</Td>
                    <Td className="font-mono text-xs">{p.reference || '—'}</Td>
                    <Td className="text-right font-medium">{formatINR(p.amount)}</Td>
                    <Td>
                      <button onClick={() => remove(p)} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-coral/10 text-coral"><Trash2 size={14} /></button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Card>
    </div>
  );
}

function PaymentModal({ open, form, setForm, staff, onClose, onSaved, toast, t }) {
  const [busy, setBusy] = useState(false);
  const months = useMemo(() => monthOptions(), []);
  const save = async () => {
    if (!form.staff_id) { toast('Choose a staff member', 'error'); return; }
    if (!form.amount || Number(form.amount) <= 0) { toast('Enter a valid amount', 'error'); return; }
    setBusy(true);
    try {
      await api('/api/staff-payments', { method: 'POST', body: JSON.stringify(form) });
      toast(`${form.payment_type} recorded`);
      await onSaved();
    } catch (e) { toast(e.message, 'error'); }
    finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Record staff payment">
      <div className="grid sm:grid-cols-2 gap-3">
        <Select label="Staff name" value={form.staff_id} onChange={(e) => setForm({ ...form, staff_id: e.target.value })}>
          <option value="">Select</option>
          {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Input type="date" label="Date" value={form.txn_date || ''} onChange={(e) => setForm({ ...form, txn_date: e.target.value })} />
        <Select label="Payment type" value={form.payment_type} onChange={(e) => setForm({ ...form, payment_type: e.target.value })}>
          {PAY_TYPES.map((p) => <option key={p}>{p}</option>)}
        </Select>
        <Input type="number" label="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        <Select label="Month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })}>
          {months.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
        </Select>
        <Select label="Payment mode" value={form.payment_mode} onChange={(e) => setForm({ ...form, payment_mode: e.target.value })}>
          {PAYMENT_MODES.map((m) => <option key={m}>{m}</option>)}
        </Select>
        <Input label="Paid by" value={form.paid_by || ''} onChange={(e) => setForm({ ...form, paid_by: e.target.value })} />
        <Input label="Reference / receipt number" value={form.reference || ''} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
        <Textarea label="Notes" className="sm:col-span-2" value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <Button variant="ghost" onClick={onClose}>{t('btn.cancel')}</Button>
        <Button onClick={save} disabled={busy}>{t('btn.save')}</Button>
      </div>
    </Modal>
  );
}
