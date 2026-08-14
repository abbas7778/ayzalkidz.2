import { Download } from 'lucide-react';
import { usePWA } from '../contexts/PWAContext';

export default function InstallButton({ variant = 'header' }) {
  const { canInstall, iosHint, installed, install } = usePWA();

  if (installed) {
    if (variant === 'settings') {
      return (
        <div className="rounded-2xl border border-line bg-paper/60 p-4">
          <p className="text-sm font-medium">Installed</p>
          <p className="text-xs text-ink/50 mt-1">Ayzal Hospital is opening as a standalone app on this device.</p>
        </div>
      );
    }
    return null;
  }

  if (canInstall) {
    if (variant === 'settings') {
      return (
        <div className="rounded-2xl border border-line p-4">
          <p className="font-display text-lg">Install app</p>
          <p className="text-xs text-ink/50 mt-1 mb-3">Add Ayzal Kidz Care Hospital to your home screen. Opens without the browser chrome.</p>
          <button
            type="button"
            onClick={install}
            className="inline-flex items-center gap-2 rounded-xl bg-teal text-cream px-3.5 py-2.5 text-sm font-medium min-h-11"
          >
            <Download size={15} /> Install App
          </button>
        </div>
      );
    }
    return (
      <button
        type="button"
        onClick={install}
        className="h-9 px-2.5 rounded-xl border border-line bg-white text-xs font-medium flex items-center gap-1.5 hover:border-teal/40 min-w-9"
        title="Install App"
      >
        <Download size={14} className="text-teal" />
        <span className="hidden sm:inline">Install App</span>
      </button>
    );
  }

  if (iosHint && variant === 'settings') {
    return (
      <div className="rounded-2xl border border-line p-4">
        <p className="font-display text-lg">Install on iPhone</p>
        <p className="text-xs text-ink/60 mt-2 leading-relaxed">
          Tap the Share button in Safari, then <strong>Add to Home Screen</strong>. The desk will open like a standalone app.
        </p>
      </div>
    );
  }

  return null;
}
