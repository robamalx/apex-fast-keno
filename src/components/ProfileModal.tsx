import React from 'react';
import { X, User, ShieldCheck, Wallet, Clock } from 'lucide-react';
import { TelegramUser } from '../types/keno';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  telegramUser: TelegramUser | null;
  balance: number;
  onOpenCashier: () => void;
  ticketsCount: number;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  telegramUser,
  balance,
  onOpenCashier,
  ticketsCount,
}) => {
  if (!isOpen) return null;

  const displayName = telegramUser
    ? `${telegramUser.first_name || ''} ${telegramUser.last_name || ''}`.trim() ||
      telegramUser.username ||
      'Telegram Player'
    : 'ATLAS V Player';

  const userHandle = telegramUser?.username
    ? `@${telegramUser.username}`
    : `ID: ${telegramUser?.id || '890253779'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="bg-[#0b1410] border border-[#1f3127] w-full max-w-sm rounded-3xl p-5 shadow-2xl overflow-hidden flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1f3127]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#00e699] flex items-center justify-center shadow-md">
              <User className="w-4 h-4 text-[#050807]" />
            </div>
            <h3 className="font-extrabold text-base text-white tracking-wide">
              PLAYER PROFILE
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#151f19] hover:bg-[#1f3127] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Player Info Card */}
        <div className="bg-[#050807] border border-[#1f3127] rounded-2xl p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full sphere-3d-mint flex items-center justify-center text-[#050807] font-black text-lg border-2 border-white/60">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-black text-white text-sm truncate">{displayName}</h4>
            <div className="text-xs text-slate-400 font-mono-num">{userHandle}</div>
            <div className="flex items-center gap-1 text-[11px] text-[#00e699] font-bold mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verified Telegram Account</span>
            </div>
          </div>
        </div>

        {/* Balance & Wallet Stats */}
        <div className="bg-[#050807] border border-[#1f3127] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-bold flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-[#00e699]" />
              <span>Available Balance</span>
            </span>
            <span className="text-base font-digital font-extrabold text-[#00e699]">
              {balance.toFixed(2)} ETB
            </span>
          </div>

          <div className="flex items-center justify-between text-xs border-t border-[#15231c] pt-2">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Active Tickets in Round</span>
            </span>
            <span className="text-white font-mono-num font-bold">{ticketsCount} Tickets</span>
          </div>

          <button
            onClick={onOpenCashier}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#00e699] to-[#059669] hover:from-[#34d399] hover:to-[#10b981] text-[#050807] font-black text-xs tracking-wider uppercase transition-all shadow-[0_0_12px_rgba(0,230,153,0.4)] active:scale-95 cursor-pointer"
          >
            DEPOSIT / WITHDRAW VIA TELEBIRR
          </button>
        </div>
      </div>
    </div>
  );
};
