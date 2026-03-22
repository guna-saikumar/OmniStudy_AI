import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if the app is already installed/running in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
                        || (window.navigator as any).standalone 
                        || document.referrer.includes('android-app://');

    if (isStandalone) return;

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Show prompt after a short delay to ensure user sees the page
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 2000);

    // Capture Android/Chrome's native install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsVisible(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 z-[9999] animate-in fade-in slide-in-from-bottom-5">
      <div className="bg-slate-900 border border-indigo-500/50 rounded-2xl p-5 shadow-2xl shadow-indigo-500/20 backdrop-blur-xl">
        <button 
          onClick={() => setIsVisible(false)}
          className="absolute top-3 right-3 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-500/20 rounded-xl">
             <img src="/icons/icon-192x192.png" alt="Logo" className="w-10 h-10 rounded-lg shadow-lg" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-white text-lg leading-tight">Install OmniStudy AI</h3>
            <p className="text-slate-400 text-sm mt-0.5">
              Add to your home screen for the full experience.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {isIOS ? (
             <div className="flex items-start gap-2.5 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
               <Smartphone className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
               <p className="text-sm text-slate-300">
                 Tap <span className="font-bold text-white inline-block px-1 border border-slate-700 rounded bg-slate-800">Share</span> then select <span className="font-bold text-white">"Add to Home Screen"</span>
               </p>
             </div>
          ) : (
              <button
                onClick={handleInstallClick}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg active:scale-95 shadow-indigo-500/20"
              >
                <Download className="w-5 h-5" />
                <span>Install Now</span>
              </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;
