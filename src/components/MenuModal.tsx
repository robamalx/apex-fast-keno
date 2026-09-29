import React from 'react';
import { X, Gamepad2, Volume2, VolumeX, HelpCircle, Award, ShieldCheck } from 'lucide-react';
import { haptic } from '../utils/telegram';

interface MenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRules: () => void;
  onOpenCashier: () => void;
  onOpenAdmin: () => void;
  isAudioOn: boolean;
  onToggleAudio: () => void;
  isAuthorizedAdmin?: boolean;
}

export const MenuModal: React.FC<MenuModalProps> = ({
  isOpen,
  onClose,
  onOpenRules,
  onOpenCashier,
  onOpenAdmin,
  isAudioOn,
  onToggleAudio,
  isAuthorizedAdmin = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="bg-[#0b1410] border border-[#1f3127] w-full max-w-sm rounded-3xl p-5 shadow-2xl overflow-hidden flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1f3127]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#00e699] flex items-center justify-center shadow-md">
              <Gamepad2 className="w-4 h-4 text-[#050807]" />
            </div>
            <h3 className="font-extrabold text-base text-white tracking-wide">
              ATLAS V MENU
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#151f19] hover:bg-[#1f3127] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Core Interactive Actions List */}
        <div className="space-y-2.5 text-xs">
          {/* Rules & Paytable */}
          <button
            onClick={() => {
              onClose();
              onOpenRules();
            }}
            className="w-full p-3.5 rounded-2xl bg-[#050807] hover:bg-[#151f19] border border-[#1f3127] flex items-center justify-between text-slate-200 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5 font-bold">
              <HelpCircle className="w-4 h-4 text-[#00e699]" />
              <span>Rules & Paytable</span>
            </div>
            <span className="text-slate-500 font-mono text-[11px]">→</span>
          </button>

          {/* Sound Effects Toggle */}
          <button
            onClick={() => {
              haptic.selection();
              onToggleAudio();
            }}
            className="w-full p-3.5 rounded-2xl bg-[#050807] hover:bg-[#151f19] border border-[#1f3127] flex items-center justify-between text-slate-200 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5 font-bold">
              {isAudioOn ? (
                <Volume2 className="w-4 h-4 text-[#00e699]" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-500" />
              )}
              <span>Sound Effects</span>
            </div>
            <span className={`font-black font-mono ${isAudioOn ? 'text-[#00e699]' : 'text-slate-500'}`}>
              {isAudioOn ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Cashier & Deposits */}
          <button
            onClick={() => {
              onClose();
              onOpenCashier();
            }}
            className="w-full p-3.5 rounded-2xl bg-[#050807] hover:bg-[#151f19] border border-[#1f3127] flex items-center justify-between text-slate-200 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5 font-bold">
              <Award className="w-4 h-4 text-[#facc15]" />
              <span>Cashier & Deposits</span>
            </div>
            <span className="text-[#00e699] font-mono text-[11px] font-bold">+Deposit</span>
          </button>

          {/* Admin Panel (PIN Lock + Pending Deposits) - ONLY rendered for authorized Telegram User IDs */}
          {isAuthorizedAdmin && (
            <button
              onClick={() => {
                onClose();
                onOpenAdmin();
              }}
              className="w-full p-3.5 rounded-2xl bg-[#050807] hover:bg-[#151f19] border border-[#1f3127] flex items-center justify-between text-slate-200 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5 font-bold">
                <ShieldCheck className="w-4 h-4 text-[#00e699]" />
                <span>Admin Panel (PIN Lock)</span>
              </div>
              <span className="text-[#00e699] font-mono text-[11px] font-bold">Secure</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
