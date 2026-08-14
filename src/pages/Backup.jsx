import { useEffect, useState } from 'react';
import { Download, RotateCcw, Plus, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { useI18n } from '../contexts/I18nContext';
import { useToast } from '../contexts/ToastContext';
import { PageHeader, Card, Button, Badge, Empty, Skeleton, TableWrap, Th, Td } from '../components/UI';

function backupStamp(row) {
  const raw = row?.created_at;
  const fromNotes = String(row?.notes || '').match(/(\d{4}-\d{2}-\d{2})/)?.[1];
  const value = raw && raw !== 'null' && raw !== 'undefined' ? raw : fromNotes;
  if (!value) return { date: '—', time: '' };
  const iso = String(value).includes('T') ? value : `${String(value).slice(0, 10)}T00:00:00`;
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return { date: '—', time: '' };
  return {
    date: dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
  };
}

export default function Backup() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try { setRows(await api('/api/backups')); }
    catch (e) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    setBusy(true);
    try {
      await api('/api/backups', { method: 'POST', body: JSON.stringify({ action: 'create' }) });
      toast('Manual backup completed');
      await load();
    } catch (e) { toast(e.message, 'error'); }
    finally { setBusy(false); }
  };

  const download = async (r) => {
    try {
      const full = await api('/api/backups', { method: 'POST', body: JSON.stringify({ action: 'download', id: r.id }) });
      const blob = new Blob([JSON.stringify(full.payload || full, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `ayzal-backup-${r.id}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast('Backup downloaded', 'info');
    } catch (e) { toast(e.message, 'error'); }
  };

  const restore = async (r) => {
    if (!confirm('Restore this backup? Current live data will be replaced.')) return;
    setBusy(true);
    try {
      await api('/api/backups', { method: 'POST', body: JSON.stringify({ action: 'restore', id: r.id }) });
      toast('Restore complete');
    } catch (e) { toast(e.message, 'error'); }
    finally { setBusy(false); }
  };

  const remove = async (r) => {
    if (!confirm(t('confirmDelete'))) return;
    try { await api('/api/backups', { method: 'DELETE', body: JSON.stringify({ id: r.id }) }); toast(t('deleted')); load(); }
    catch (e) { toast(e.message, 'error'); }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Continuity"
        title={t('nav.backup')}
        subtitle="A daily snapshot is taken when you open this page. You may also take one by hand."
        actions={<Button onClick={create} disabled={busy}><Plus size={15} /> {t('btn.backupNow')}</Button>}
      />
      <div className="grid sm:grid-cols-3 gap-3 mb-4">
        <Card className="p-4"><p className="text-[11px] uppercase tracking-wider text-ink/40">Snapshots</p><p className="font-display text-2xl mt-1">{rows.length}</p></Card>
        <Card className="p-4"><p className="text-[11px] uppercase tracking-wider text-ink/40">Automatic</p><p className="text-sm mt-2 text-ink/70">Daily, on first visit</p></Card>
        <Card className="p-4"><p className="text-[11px] uppercase tracking-wider text-ink/40">Latest</p><p className="text-sm mt-2">{rows[0] ? [backupStamp(rows[0]).date, backupStamp(rows[0]).time].filter(Boolean).join(' · ') : '—'}</p></Card>
      </div>
      <Card>
        {loading ? <div className="p-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div> : rows.length === 0 ? <Empty text={t('empty')} /> : (
          <TableWrap>
            <table className="w-full min-w-[720px]">
              <thead className="bg-paper/80"><tr>
                <Th>When</Th><Th>Type</Th><Th>Size</Th><Th>By</Th><Th>Notes</Th><Th></Th>
              </tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-line/80">
                    <Td>{backupStamp(r).date} <span className="text-[11px] text-ink/40">{backupStamp(r).time}</span></Td>
                    <Td><Badge tone={r.backup_type === 'auto' ? 'gold' : 'teal'}>{r.backup_type}</Badge></Td>
                    <Td>{r.size_kb} KB</Td>
                    <Td>{r.created_by}</Td>
                    <Td className="max-w-[240px] truncate">{r.notes}</Td>
                    <Td>
                      <div className="flex justify-end gap-1">
                        <button onClick={() => download(r)} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-paper" title={t('btn.download')}><Download size={14} /></button>
                        <button onClick={() => restore(r)} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-paper" title={t('btn.restore')}><RotateCcw size={14} /></button>
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
    </div>
  );
}
