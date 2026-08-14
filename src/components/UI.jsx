import { useEffect } from 'react';
import { X, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
      <div>
        {eyebrow && <p className="text-[11px] uppercase tracking-[0.22em] text-teal font-semibold mb-1">{eyebrow}</p>}
        <h1 className="font-display text-2xl sm:text-3xl text-ink leading-tight">{title}</h1>
        {subtitle && <p className="text-sm text-ink/55 mt-1 max-w-xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = '' }) {
  return <div className={`bg-white rounded-2xl border border-line shadow-card ${className}`}>{children}</div>;
}

export function Button({ children, variant = 'primary', className = '', ...props }) {
  const styles = {
    primary: 'bg-teal text-cream hover:bg-teal-deep shadow-sm',
    gold: 'bg-gold text-ink hover:bg-[#b8934a]',
    ghost: 'bg-white text-ink border border-line hover:bg-paper',
    danger: 'bg-coral text-white hover:bg-[#c24a3a]',
    soft: 'bg-teal/10 text-teal hover:bg-teal/15',
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 min-h-11 text-sm font-medium transition disabled:opacity-50 disabled:pointer-events-none ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ label, error, className = '', ...props }) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="block text-xs font-medium text-ink/60 mb-1.5">{label}</span>}
      <input
        className={`w-full rounded-xl border bg-white px-3 py-2 text-sm text-ink outline-none transition focus:ring-2 focus:ring-teal/25 focus:border-teal ${
          error ? 'border-coral' : 'border-line'
        }`}
        {...props}
      />
      {error && <span className="text-xs text-coral mt-1 block">{error}</span>}
    </label>
  );
}

export function Select({ label, children, className = '', ...props }) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="block text-xs font-medium text-ink/60 mb-1.5">{label}</span>}
      <select
        className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-teal/25 focus:border-teal"
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

export function Textarea({ label, className = '', ...props }) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="block text-xs font-medium text-ink/60 mb-1.5">{label}</span>}
      <textarea
        className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-teal/25 focus:border-teal min-h-[80px]"
        {...props}
      />
    </label>
  );
}

export function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={onClose} />
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            className={`relative w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[min(92vh,100dvh)] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-lift border border-line`}
          >
            <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-line px-5 py-4 flex items-center justify-between z-10">
              <h3 className="font-display text-lg text-ink">{title}</h3>
              <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-full hover:bg-paper text-ink/60">
                <X size={16} />
              </button>
            </div>
            <div className="p-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function SearchBar({ value, onChange, placeholder }) {
  return (
    <div className="relative">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full sm:w-72 rounded-xl border border-line bg-white pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal/25 focus:border-teal"
      />
    </div>
  );
}

export function Pagination({ page, pages, onPage, total, label = 'records' }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-line text-xs text-ink/55">
      <span>{total} {label}</span>
      <div className="flex items-center gap-1">
        <button disabled={page <= 1} onClick={() => onPage(page - 1)} className="h-8 w-8 grid place-items-center rounded-lg border border-line disabled:opacity-40">
          <ChevronLeft size={14} />
        </button>
        <span className="px-2">{page} / {pages}</span>
        <button disabled={page >= pages} onClick={() => onPage(page + 1)} className="h-8 w-8 grid place-items-center rounded-lg border border-line disabled:opacity-40">
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

export function Badge({ children, tone = 'teal' }) {
  const map = {
    teal: 'bg-teal/10 text-teal',
    gold: 'bg-gold/20 text-ink',
    coral: 'bg-coral/10 text-coral',
    ink: 'bg-ink/8 text-ink/70',
    sage: 'bg-sage/40 text-teal-deep',
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${map[tone]}`}>{children}</span>;
}

export function Empty({ text }) {
  return (
    <div className="py-16 text-center">
      <div className="mx-auto h-12 w-12 rounded-2xl bg-paper grid place-items-center text-teal mb-3">✦</div>
      <p className="text-sm text-ink/50">{text}</p>
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-xl bg-line/70 ${className}`} />;
}

export function TableWrap({ children }) {
  return <div className="overflow-x-auto">{children}</div>;
}

export function Th({ children, className = '' }) {
  return <th className={`text-left text-[11px] uppercase tracking-wider text-ink/45 font-semibold px-4 py-3 whitespace-nowrap ${className}`}>{children}</th>;
}

export function Td({ children, className = '' }) {
  return <td className={`px-4 py-3 text-sm text-ink/80 whitespace-nowrap ${className}`}>{children}</td>;
}
