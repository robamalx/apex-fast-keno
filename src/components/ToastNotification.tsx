import React from 'react';
import { Sparkles, CheckCircle2, AlertCircle, Info } from 'lucide-react';

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
}

interface ToastNotificationProps {
  toasts: ToastItem[];
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ toasts }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-14 right-3 sm:right-5 z-50 flex flex-col gap-2 max-w-xs pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`px-3.5 py-2.5 rounded-2xl border shadow-2xl flex items-center gap-2.5 backdrop-blur-md pointer-events-auto transition-all animate-bounce-short ${
            toast.type === 'success'
              ? 'bg-[#0f171d]/95 border-[#00e699] text-[#00e699] shadow-[0_0_15px_rgba(0,230,153,0.4)]'
              : toast.type === 'error'
              ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
              : 'bg-[#0f171d]/95 border-[#38bdf8]/50 text-[#38bdf8]'
          }`}
        >
          {toast.type === 'success' && <Sparkles className="w-4 h-4 shrink-0 text-[#00e699]" />}
          {toast.type === 'info' && <Info className="w-4 h-4 shrink-0 text-[#38bdf8]" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />}
          <span className="font-extrabold text-xs sm:text-sm tracking-wide font-mono-num">
            {toast.message}
          </span>
        </div>
      ))}
    </div>
  );
};
