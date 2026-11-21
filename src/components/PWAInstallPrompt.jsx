import React, { useState, useEffect } from 'react';
import { DownloadCloud, X } from 'lucide-react';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-blue-600 text-white p-3.5 rounded-xl shadow-lg flex items-center justify-between gap-3 z-50 animate-bounce-once">
      <div className="flex items-center gap-2.5">
        <DownloadCloud className="w-5 h-5 shrink-0" />
        <div>
          <p className="text-xs font-semibold">Install QuickEntry App</p>
          <p className="text-[11px] text-blue-100">Use offline on PC & mobile home screen</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleInstall}
          className="px-2.5 py-1 text-xs font-bold bg-white text-blue-600 rounded-lg shadow-sm hover:bg-blue-50 transition"
        >
          Install
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 text-blue-200 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
