import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';

export const NetworkStatus: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 selection:bg-red-500 selection:text-white animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-100 text-center transform animate-in zoom-in-95 duration-300">
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
          <WifiOff className="w-8 h-8 sm:w-10 sm:h-10 stroke-[2.5]" />
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-bold uppercase tracking-wider mb-3">
          <AlertTriangle className="w-3.5 h-3.5" />
          नेटवर्क एरर
        </span>

        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-2">
          इंटरनेट कनेक्शन उपलब्ध नाही
        </h2>

        <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed mb-6">
          कृपया तुमचे इंटरनेट नेटवर्क तपासा. ऑफलाइन डेटा सेव्ह राहील आणि नेटवर्क सुरू होताच ०-मिलीसेकंदात सिंक होईल.
        </p>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => {
              if (navigator.onLine) {
                setIsOffline(false);
              } else {
                window.location.reload();
              }
            }}
            className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-sm sm:text-base py-3.5 px-5 rounded-2xl transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 animate-spin-slow" />
            कनेक्शन पुन्हा तपासा
          </button>

          <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
            Network Error: Connection Failed
          </p>
        </div>
      </div>
    </div>
  );
};
