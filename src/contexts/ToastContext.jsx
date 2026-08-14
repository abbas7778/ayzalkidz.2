import { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext({ toast: () => {} });

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);

  const toast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3800);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="no-print fixed bottom-5 right-5 z-[80] flex flex-col gap-2 w-[min(360px,calc(100vw-2rem))]">
        <AnimatePresence>
          {items.map((it) => (
            <motion.div
              key={it.id}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8 }}
              className="flex items-start gap-3 rounded-2xl bg-ink text-cream px-4 py-3 shadow-lift border border-white/10"
            >
              {it.type === 'success' && <CheckCircle2 size={18} className="text-teal mt-0.5 shrink-0" />}
              {it.type === 'error' && <AlertCircle size={18} className="text-coral mt-0.5 shrink-0" />}
              {it.type === 'info' && <Info size={18} className="text-gold mt-0.5 shrink-0" />}
              <p className="text-sm leading-snug flex-1">{it.message}</p>
              <button onClick={() => setItems((p) => p.filter((x) => x.id !== it.id))} className="text-cream/50 hover:text-cream">
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
