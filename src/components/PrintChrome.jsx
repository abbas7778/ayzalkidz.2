import { useEffect } from 'react';
import { Printer } from 'lucide-react';
import { applyPrintPage, clearPrintPage } from '../lib/print';

export default function PrintChrome({ paper, setPaper, children, ready }) {
  useEffect(() => {
    applyPrintPage(paper);
    return () => clearPrintPage();
  }, [paper]);

  const printNow = () => {
    applyPrintPage(paper);
    requestAnimationFrame(() => {
      setTimeout(() => window.print(), 50);
    });
  };

  return (
    <div className="print-app">
      <div className="no-print print-toolbar">
        <div className="print-toolbar-inner">
          <div>
            <p className="text-sm font-medium text-ink">Print preview</p>
            <p className="text-[11px] text-ink/50">Check the layout, then print. The browser dialog opens once.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl border border-line overflow-hidden">
              <button type="button" onClick={() => setPaper('a4')} className={`px-3 py-1.5 text-xs font-medium ${
                paper === 'a4' ? 'bg-teal text-cream' : 'bg-white text-ink/70'
              }`}>A4</button>
              <button type="button" onClick={() => setPaper('thermal')} className={`px-3 py-1.5 text-xs font-medium ${
                paper === 'thermal' ? 'bg-teal text-cream' : 'bg-white text-ink/70'
              }`}>Thermal 80mm</button>
            </div>
            <button
              type="button"
              disabled={!ready}
              onClick={printNow}
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal text-cream px-3.5 py-1.5 text-sm font-medium disabled:opacity-40"
            >
              <Printer size={14} /> Print
            </button>
            <button type="button" onClick={() => window.close()} className="rounded-xl border border-line bg-white px-3 py-1.5 text-sm">
              Close
            </button>
          </div>
        </div>
      </div>
      <div className={`print-sheet ${paper === 'thermal' ? 'thermal-sheet' : 'a4-sheet'}`}>
        {children}
      </div>
    </div>
  );
}

export function Letterhead({ settings, thermal, subtitle }) {
  const name = settings?.hospital_name || 'Ayzal Kidz Care Hospital';
  const address = settings?.address || 'Near Civil Hospital Road, Tharad, Banaskantha — 385565, Gujarat';
  const phone = settings?.phone || '';
  const email = settings?.email || '';
  return (
    <header className={`print-head ${thermal ? 'is-thermal' : ''}`}>
      <img src={settings?.logo_url || '/logo.png'} alt="" className="print-logo" />
      <div className="print-head-text">
        <h1 className="print-hospital">{name}</h1>
        <p className="print-meta">{address}</p>
        {(phone || email) && <p className="print-meta">{[phone, email].filter(Boolean).join(' · ')}</p>}
        {subtitle && <p className="print-subtitle">{subtitle}</p>}
      </div>
    </header>
  );
}

export function PrintRow({ label, value }) {
  return (
    <div className="print-kv">
      <span className="print-k">{label}</span>
      <span className="print-v">{value || '—'}</span>
    </div>
  );
}
