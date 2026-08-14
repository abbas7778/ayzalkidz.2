import { createContext, useContext, useEffect, useState } from 'react';
import { isIos, isStandalone } from '../lib/pwa';

const PWAContext = createContext({
  canInstall: false,
  installed: false,
  iosHint: false,
  online: true,
  install: async () => false,
});

export function PWAProvider({ children }) {
  const [promptEvent, setPromptEvent] = useState(null);
  const [installed, setInstalled] = useState(() => isStandalone());
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine);
  const iosHint = isIos() && !installed;

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault();
      setPromptEvent(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const install = async () => {
    if (!promptEvent) return false;
    promptEvent.prompt();
    const choice = await promptEvent.userChoice.catch(() => ({ outcome: 'dismissed' }));
    setPromptEvent(null);
    return choice?.outcome === 'accepted';
  };

  return (
    <PWAContext.Provider value={{
      canInstall: !!promptEvent && !installed,
      installed,
      iosHint,
      online,
      install,
    }}>
      {children}
    </PWAContext.Provider>
  );
}

export const usePWA = () => useContext(PWAContext);
