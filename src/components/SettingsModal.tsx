import React, { useState, useEffect } from 'react';
import { X, Volume2, VolumeX, RefreshCw, ShieldCheck, HelpCircle, Check, Zap } from 'lucide-react';
import { toggleAudioMute, isAudioMuted, getTelegramInitData } from '../utils/telegram';
import { TelegramUser } from '../types/keno';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReloadBalance: () => void;
  onOpenRules: () => void;
  onOpenCashier: () => void;
  telegramUser: TelegramUser | null;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onReloadBalance,
  onOpenRules,
  onOpenCashier,
  telegramUser,
}) => {
  const [muted, setMuted] = useState<boolean>(isAudioMuted());
  const [hmacStatus, setHmacStatus] = useState<string>('Validating HMAC...');
  const [hmacVerified, setHmacVerified] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen) {
      const initData = getTelegramInitData();
      fetch('/api/telegram/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData }),
      })
        .then((res) => res.json())
        .then((data) => {
          setHmacStatus(data.message || 'Signature Verified');
          setHmacVerified(data.valid);
        })
        .catch(() => {
          setHmacStatus('Development Signature Active');
          setHmacVerified(true);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleAudio = () => {
    const nextMuted = toggleAudioMute();
    setMuted(nextMuted);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#141e26] border border-[#233342] w-full max-w-md rounded-2xl p-5 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#202e3b]">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#00e699]" />
            <h3 className="font-extrabold text-base text-slate-100 tracking-wide">
              SETTINGS & MENU
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1e2a36] hover:bg-[#263646] text-slate-400 hover:text-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-4 space-y-4 text-xs">
          {/* Telegram User Profile */}
          {telegramUser && (
            <div className="bg-[#10181f] border border-[#1d2b38] rounded-xl p-3 flex items-center justify-between">
              <div>
                <div className="text-slate-400 font-bold">TELEGRAM USER</div>
                <div className="text-slate-100 font-extrabold text-sm">
                  {telegramUser.first_name} {telegramUser.last_name || ''}
                </div>
                {telegramUser.username && (
                  <div className="text-emerald-400 font-mono text-[11px]">
                    @{telegramUser.username}
                  </div>
                )}
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-base flex items-center justify-center border border-emerald-500/30">
                {telegramUser.first_name[0]}
              </div>
            </div>
          )}

          {/* Audio Sound Toggle */}
          <div className="flex items-center justify-between bg-[#18242f] border border-[#22313f] rounded-xl p-3">
            <div className="flex items-center gap-2.5">
              {muted ? (
                <VolumeX className="w-5 h-5 text-slate-500" />
              ) : (
                <Volume2 className="w-5 h-5 text-[#00e699]" />
              )}
              <div>
                <div className="font-bold text-slate-200">Game Sound Effects</div>
                <div className="text-[11px] text-slate-400">Tile click & ball reveal audio</div>
              </div>
            </div>
            <button
              onClick={handleToggleAudio}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                muted
                  ? 'bg-slate-700 text-slate-300'
                  : 'bg-[#00e699] text-slate-950 shadow-[0_0_8px_rgba(0,230,153,0.5)]'
              }`}
            >
              {muted ? 'MUTED' : 'ON'}
            </button>
          </div>

          {/* Cryptographic HMAC Status */}
          <div className="bg-[#18242f] border border-[#22313f] rounded-xl p-3 space-y-1">
            <div className="flex items-center gap-2 font-bold text-slate-200">
              <ShieldCheck className={`w-4 h-4 ${hmacVerified ? 'text-emerald-400' : 'text-amber-400'}`} />
              <span>Cryptographic HMAC-SHA256 Status</span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono bg-[#0f171e] p-2 rounded border border-[#1c2935]">
              {hmacStatus}
            </p>
          </div>

          {/* Open Cashier Button */}
          <button
            onClick={() => {
              onClose();
              onOpenCashier();
            }}
            className="w-full py-3 rounded-xl bg-[#00e699] hover:bg-[#00c885] text-slate-950 font-black flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
          >
            <span>CASHIER (DEPOSIT / WITHDRAW TELEBIRR)</span>
          </button>

          {/* Reload Balance Button */}
          <button
            onClick={() => {
              onReloadBalance();
              onClose();
            }}
            className="w-full py-2.5 rounded-xl bg-[#1e2c38] hover:bg-[#253746] border border-amber-400/30 text-amber-300 font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <RefreshCw className="w-4 h-4 text-amber-400" />
            <span>RESET DEMO BALANCE TO $10,000</span>
          </button>

          {/* Open Rules Shortcut */}
          <button
            onClick={() => {
              onClose();
              onOpenRules();
            }}
            className="w-full py-2.5 rounded-xl bg-[#16212b] hover:bg-[#1d2a37] border border-[#243444] text-slate-300 font-bold flex items-center justify-center gap-2 transition-all"
          >
            <HelpCircle className="w-4 h-4 text-[#00e699]" />
            <span>VIEW PAYTABLE & WIN RATES</span>
          </button>
        </div>
      </div>
    </div>
  );
};
