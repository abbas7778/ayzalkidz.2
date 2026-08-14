import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api, formatINR, formatDate } from '../lib/api';
import PrintChrome, { Letterhead, PrintRow } from '../components/PrintChrome';

export default function PrintReceipt() {
  const { id } = useParams();
  const [sp, setSp] = useSearchParams();
  const kind = (sp.get('kind') || 'income').toLowerCase();
  const [paper, setPaper] = useState(sp.get('paper') === 'thermal' ? 'thermal' : 'a4');
  const [row, setRow] = useState(null);
  const [settings, setSettings] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const next = new URLSearchParams(sp);
    next.set('paper', paper);
    next.set('kind', kind);
    setSp(next, { replace: true });
  }, [paper]);

  useEffect(() => {
    const path = kind === 'expense' ? '/api/expenses' : '/api/income';
    Promise.all([api(path), api('/api/settings')])
      .then(([rows, s]) => {
        const list = Array.isArray(rows) ? rows : [];
        setRow(list.find((r) => String(r.id) === String(id)) || null);
        setSettings(s);
      })
      .catch((e) => setErr(e.message || 'Could not load receipt'))
      .finally(() => setLoading(false));
  }, [id, kind]);

  const thermal = paper === 'thermal';
  const ready = !loading && !!row;

  return (
    <PrintChrome paper={paper} setPaper={setPaper} ready={ready}>
      {loading && <p className="print-muted">Preparing receipt…</p>}
      {err && <p className="print-error">{err}</p>}
      {!loading && !row && <p className="print-muted">Receipt not found.</p>}
      {row && (
        <>
          <Letterhead
            settings={settings}
            thermal={thermal}
            subtitle={kind === 'expense' ? 'EXPENSE VOUCHER' : 'INCOME RECEIPT'}
          />
          <div className="print-rule" />
          {kind === 'expense' ? (
            <>
              <PrintRow label="Date" value={formatDate(row.txn_date)} />
              <PrintRow label="Category" value={row.category} />
              <PrintRow label="Item" value={row.item} />
              <PrintRow label="Quantity" value={row.quantity} />
              <PrintRow label="Paid by" value={row.paid_by} />
              <PrintRow label="Mode" value={row.payment_mode} />
              <PrintRow label="Bill no." value={row.bill_number} />
            </>
          ) : (
            <>
              <PrintRow label="Receipt no." value={row.receipt_number} />
              <PrintRow label="Date" value={formatDate(row.txn_date)} />
              <PrintRow label="Category" value={row.category} />
              <PrintRow label="Description" value={row.description} />
              <PrintRow label="Mode" value={row.payment_mode} />
            </>
          )}
          <div className="print-rule" />
          <div className="print-amount-box">
            <span>Amount</span>
            <strong>{formatINR(row.amount)}</strong>
          </div>
          {row.notes && <p className="print-notes">{row.notes}</p>}
          <div className="print-rule" />
          <p className="print-thanks">
            {kind === 'expense' ? 'Voucher recorded at the hospital desk.' : 'Thank you. Get well soon.'}
          </p>
          <footer className="print-foot">Ayzal Kidz Care Hospital · Tharad, Gujarat</footer>
        </>
      )}
    </PrintChrome>
  );
}
