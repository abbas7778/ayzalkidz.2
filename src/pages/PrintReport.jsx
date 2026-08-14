import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, formatINR, formatDate, todayISO } from '../lib/api';
import PrintChrome, { Letterhead } from '../components/PrintChrome';

const TITLES = {
  daily: 'Daily accounts report',
  monthly: 'Monthly accounts report',
  yearly: 'Yearly accounts report',
  profit: 'Profit & loss statement',
  purchases: 'Hospital purchase report',
  maintenance: 'Cleaning & maintenance report',
  accounts: 'Accounts report',
};

export default function PrintReport() {
  const [sp, setSp] = useSearchParams();
  const type = (sp.get('type') || sp.get('period') || 'monthly').toLowerCase();
  const period = ['daily', 'monthly', 'yearly'].includes(type) ? type : 'monthly';
  const from = sp.get('from') || '';
  const to = sp.get('to') || '';
  const [paper, setPaper] = useState(sp.get('paper') === 'thermal' ? 'thermal' : 'a4');
  const [data, setData] = useState(null);
  const [settings, setSettings] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const next = new URLSearchParams(sp);
    next.set('paper', paper);
    setSp(next, { replace: true });
  }, [paper]);

  useEffect(() => {
    const q = new URLSearchParams({ period, from, to });
    Promise.all([api(`/api/reports?${q}`), api('/api/settings')])
      .then(([r, s]) => { setData(r); setSettings(s); })
      .catch((e) => setErr(e.message || 'Could not load report'))
      .finally(() => setLoading(false));
  }, [period, from, to]);

  const thermal = paper === 'thermal';
  const title = TITLES[type] || TITLES.accounts;
  const ready = !loading && !!data;

  const purchaseRows = useMemo(() => Array.isArray(data?.purchases) ? data.purchases : [], [data]);
  const maintRows = useMemo(() => Array.isArray(data?.maintenance) ? data.maintenance : [], [data]);
  const daily = useMemo(() => Array.isArray(data?.daily) ? data.daily : [], [data]);

  return (
    <PrintChrome paper={paper} setPaper={setPaper} ready={ready}>
      {loading && <p className="print-muted">Preparing report…</p>}
      {err && <p className="print-error">{err}</p>}
      {data && (
        <>
          <Letterhead settings={settings} thermal={thermal} subtitle={title.toUpperCase()} />
          <p className="print-range">
            {formatDate(data.from || from || todayISO())} — {formatDate(data.to || to || todayISO())}
          </p>
          <div className="print-rule" />

          {(type === 'profit' || type === 'daily' || type === 'monthly' || type === 'yearly' || type === 'accounts') && (
            <div className="print-totals">
              <div><span>Income</span><b>{formatINR(data.totalIncome)}</b></div>
              <div><span>Expenses</span><b>{formatINR(data.totalExpenses)}</b></div>
              <div><span>Maintenance</span><b>{formatINR(data.totalMaintenance)}</b></div>
              <div><span>Purchases</span><b>{formatINR(data.totalPurchases)}</b></div>
              <div className="print-net"><span>Net profit / loss</span><b>{formatINR(data.net)}</b></div>
            </div>
          )}

          {type === 'profit' && (
            <table className="print-table">
              <thead>
                <tr><th>Particulars</th><th className="num">Amount</th></tr>
              </thead>
              <tbody>
                <tr><td>Total income</td><td className="num">{formatINR(data.totalIncome)}</td></tr>
                <tr><td>Less: operating expenses</td><td className="num">{formatINR(data.totalExpenses)}</td></tr>
                <tr><td>Less: cleaning & maintenance</td><td className="num">{formatINR(data.totalMaintenance)}</td></tr>
                <tr><td>Less: hospital purchases</td><td className="num">{formatINR(data.totalPurchases)}</td></tr>
                <tr className="strong"><td>Net profit / loss</td><td className="num">{formatINR(data.net)}</td></tr>
              </tbody>
            </table>
          )}

          {(type === 'daily' || type === 'monthly' || type === 'yearly' || type === 'accounts') && daily.length > 0 && (
            <table className="print-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th className="num">Income</th>
                  {!thermal && <th className="num">Expenses</th>}
                  {!thermal && <th className="num">Maintain</th>}
                  {!thermal && <th className="num">Purchases</th>}
                  <th className="num">Net</th>
                </tr>
              </thead>
              <tbody>
                {daily.map((d) => (
                  <tr key={d.date}>
                    <td>{formatDate(d.date)}</td>
                    <td className="num">{formatINR(d.income)}</td>
                    {!thermal && <td className="num">{formatINR(d.expenses)}</td>}
                    {!thermal && <td className="num">{formatINR(d.maintenance)}</td>}
                    {!thermal && <td className="num">{formatINR(d.purchases)}</td>}
                    <td className="num">{formatINR(d.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {type === 'purchases' && (
            <>
              <div className="print-totals">
                <div className="print-net"><span>Purchase total</span><b>{formatINR(data.totalPurchases)}</b></div>
              </div>
              {purchaseRows.length === 0 ? <p className="print-muted">No purchases yet</p> : (
                <table className="print-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Seller</th>
                      <th>Item</th>
                      {!thermal && <th className="num">Qty</th>}
                      <th className="num">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseRows.map((r) => (
                      <tr key={r.id}>
                        <td>{formatDate(r.txn_date)}</td>
                        <td>{r.seller || '—'}</td>
                        <td>{r.item}</td>
                        {!thermal && <td className="num">{r.quantity}</td>}
                        <td className="num">{formatINR(r.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}

          {type === 'maintenance' && (
            <>
              <div className="print-totals">
                <div className="print-net"><span>Maintenance total</span><b>{formatINR(data.totalMaintenance)}</b></div>
              </div>
              {maintRows.length === 0 ? <p className="print-muted">No maintenance records yet</p> : (
                <table className="print-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Category</th>
                      <th>Item</th>
                      <th className="num">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {maintRows.map((r) => (
                      <tr key={r.id}>
                        <td>{formatDate(r.txn_date)}</td>
                        <td>{r.category}</td>
                        <td>{r.item || '—'}</td>
                        <td className="num">{formatINR(r.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}

          {daily.length === 0 && type !== 'purchases' && type !== 'maintenance' && (
            <p className="print-muted">No transactions yet</p>
          )}

          <footer className="print-foot">Ayzal Kidz Care Hospital · Tharad, Gujarat</footer>
        </>
      )}
    </PrintChrome>
  );
}
