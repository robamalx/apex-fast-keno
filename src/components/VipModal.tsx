import React from 'react';
import { X, Crown, Gift } from 'lucide-react';
import { haptic } from '../utils/telegram';

interface VipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClaimDailyBonus: () => void;
}

export const VipModal: React.FC<VipModalProps> = ({ isOpen, onClose, onClaimDailyBonus }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="bg-[#0b1410] border border-[#1f3127] w-full max-w-sm rounded-3xl p-5 shadow-2xl overflow-hidden flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1f3127]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#facc15] flex items-center justify-center shadow-md">
              <Crown className="w-4 h-4 text-[#050807] fill-current" />
            </div>
            <h3 className="font-extrabold text-base text-white tracking-wide">
              ATLAS V VIP CLUB
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#151f19] hover:bg-[#1f3127] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* VIP Rank Card */}
        <div className="bg-gradient-to-br from-[#151f19] to-[#050807] border border-[#facc15]/40 rounded-2xl p-4 text-center space-y-1">
          <div className="inline-block px-3 py-1 rounded-full bg-[#facc15]/20 text-[#facc15] font-black text-xs border border-[#facc15]/40 mb-1">
            VIP LEVEL 1
          </div>
          <h4 className="font-black text-lg text-white">BRONZE HIGH-ROLLER</h4>
          <p className="text-xs text-slate-400">Play Fast Keno to unlock 5% Daily Rakeback & Mystery Rewards</p>
        </div>

        {/* Daily Bonus Claim */}
        <div className="bg-[#050807] border border-[#1f3127] rounded-2xl p-4 text-center space-y-2.5">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#00e699]">
            <Gift className="w-4 h-4 text-[#00e699]" />
            <span>DAILY FREE REWARD AVAILABLE</span>
          </div>

          <p className="text-xs text-slate-300">
            Claim your daily +50.00 ETB reload bonus to keep playing Fast Keno!
          </p>

          <button
            onClick={() => {
              haptic.notification('success');
              onClaimDailyBonus();
            }}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#00e699] to-[#059669] hover:from-[#34d399] hover:to-[#10b981] text-[#050807] font-black text-xs tracking-wider transition-all shadow-[0_0_15px_rgba(0,230,153,0.4)] active:scale-95 cursor-pointer"
          >
            CLAIM +50.00 ETB BONUS
          </button>
        </div>

        {/* VIP Perks */}
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="bg-[#050807] border border-[#1f3127] p-2.5 rounded-xl text-center">
            <span className="text-[#facc15] font-bold block mb-0.5">INSTANT</span>
            <span className="text-slate-400">Telebirr Payouts</span>
          </div>
          <div className="bg-[#050807] border border-[#1f3127] p-2.5 rounded-xl text-center">
            <span className="text-[#00e699] font-bold block mb-0.5">0% FEES</span>
            <span className="text-slate-400">Deposit & Withdraw</span>
          </div>
        </div>
      </div>
    </div>
  );
};
