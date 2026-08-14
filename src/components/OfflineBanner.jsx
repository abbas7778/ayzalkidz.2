import { WifiOff } from 'lucide-react';
import { usePWA } from '../contexts/PWAContext';

export default function OfflineBanner() {
  const { online } = usePWA();
  if (online) return null;
  return (
    <div className="no-print bg-[#3d2a22] text-cream text-xs sm:text-sm px-4 py-2 flex items-center justify-center gap-2">
      <WifiOff size={14} />
      <span>You are offline. Internet connection required to save hospital data.</span>
    </div>
  );
}
