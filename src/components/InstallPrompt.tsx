import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if the app is already installed/running in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
                        || (window.navigator as any).standalone 
                        || document.referrer.includes('android-app://');

    if (isStandalone) {
      setIsVisible(false);
      return;
    }

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Capture Android/Chrome's native install prompt from global check
    const checkGlobalPrompt = () => {
      // ONLY set visible if it hasn't been dismissed manually in this session
      if ((window as any).deferredInstallPrompt && !isDismissed) {
        setDeferredPrompt((window as any).deferredInstallPrompt);
        setIsVisible(true);
      }
    };

    // Check immediately and periodically
    checkGlobalPrompt();
    const checkInterval = setInterval(checkGlobalPrompt, 1000);

    const handleBeforeInstallPrompt = (e: any) => {
      console.log('Capture native prompt from event listener');
      e.preventDefault();
      (window as any).deferredInstallPrompt = e;
      setDeferredPrompt(e);
      // Ensure visibility when native prompt is ready, but ONLY if not dismissed
      if (!isDismissed) {
        setIsVisible(true);
      }
    };

    const handleAppInstalled = () => {
      console.log('App was successfully installed');
      setDeferredPrompt(null);
      (window as any).deferredInstallPrompt = null;
      setIsVisible(false);
      toast.success("OmniStudy AI added to your home screen!");
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Show banner on EVERY fresh load if not in standalone mode and not dismissed
    const timer = setTimeout(() => {
      if (!isStandalone && !isDismissed) {
        setIsVisible(true);
      }
    }, 1500);

    return () => {
      clearInterval(checkInterval);
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isDismissed]); // Re-run effect or check state when dismissal changes

  const dismissBanner = () => {
    setIsDismissed(true);
    setIsVisible(false);
  };

  const handleInstallClick = async () => {
    // If we're on iOS, instructions are already visible on screen
    if (isIOS) return;

    // If the browser hasn't officially ready yet, we wait silently
    if (!deferredPrompt) {
       console.log("Installation button clicked but native prompt not ready yet. Waiting silently...");
       return;
    }

    try {
      // Direct call to native prompt
      await deferredPrompt.prompt();
      
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        // DISAPPEAR IMMEDIATELY once the user says YES
        setDeferredPrompt(null);
        (window as any).deferredInstallPrompt = null;
        setIsVisible(false);
        // Browser notification is native, but we show a supportive toast
        toast.info("Installation started! It will appear on your home screen shortly.");
      } else {
        // user dismissed the NATIVE prompt, so we also hide OUR banner for this session
        dismissBanner();
      }
    } catch (err) {
      console.error("Native installation attempt failed:", err);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 z-[9999] animate-in fade-in slide-in-from-bottom-5">
      <div className="bg-slate-900 border border-indigo-500/50 rounded-2xl p-5 shadow-2xl shadow-indigo-500/20 backdrop-blur-xl">
        <button 
          onClick={dismissBanner}
          className="absolute top-3 right-3 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-500/20 rounded-xl">
             <img src="/icons/icon-192x192.png" alt="Logo" className="w-10 h-10 rounded-lg shadow-lg" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white text-lg leading-tight">Install OmniStudy AI</h3>
            <p className="text-slate-400 text-sm mt-0.5 font-medium leading-normal">
              Get better performance and offline access.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {isIOS ? (
             <div className="flex items-start gap-2.5 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
               <Smartphone className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
               <p className="text-sm text-slate-300">
                 Tap <span className="font-semibold text-white inline-block px-1 border border-slate-700 rounded bg-slate-800">Share</span> then select <span className="font-semibold text-white">"Add to Home Screen"</span>
               </p>
             </div>
          ) : (
            <button
              onClick={handleInstallClick}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all shadow-lg active:scale-95 shadow-indigo-500/20 text-base"
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
