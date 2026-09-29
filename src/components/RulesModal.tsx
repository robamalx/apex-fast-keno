import React, { useState } from 'react';
import { X, HelpCircle, Shield, Award, Sparkles } from 'lucide-react';
import { getPaytableBreakdown } from '../utils/paytable';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  const [selectedSpots, setSelectedSpots] = useState<number>(10);

  if (!isOpen) return null;

  const breakdown = getPaytableBreakdown(selectedSpots);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="bg-[#0b1410] border border-[#1f3127] w-full max-w-lg rounded-3xl p-5 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1f3127]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#00e699] flex items-center justify-center shadow-md">
              <HelpCircle className="w-4 h-4 text-[#050807]" />
            </div>
            <h3 className="font-extrabold text-base text-white tracking-wide">
              FAST KENO — RULES & PAYTABLE
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#151f19] hover:bg-[#1f3127] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs text-slate-300">
          {/* PRNG & High Win Rate Highlight */}
          <div className="bg-[#050807] border border-[#00e699]/40 rounded-2xl p-3.5 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-[#00e699] shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-[#00e699] text-sm mb-0.5">
                High Hit-Frequency PRNG Engine (93% - 96% RTP)
              </h4>
              <p className="text-slate-300 leading-relaxed">
                Powered by an unbiased Fisher-Yates PRNG algorithm sampling 20 unique balls from 1-80 using cryptographic entropy (<code className="text-[#00e699] font-mono">crypto.randomInt</code>). High win-frequency design pays out on 0, 3, 4, 5 partial catches for Pick 10!
              </p>
            </div>
          </div>

          {/* Paytable Selector */}
          <div>
            <label className="block text-slate-200 font-bold mb-2">
              Select Number of Spots Picked (1 to 10):
            </label>
            <div className="grid grid-cols-10 gap-1">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((spot) => (
                <button
                  key={spot}
                  onClick={() => setSelectedSpots(spot)}
                  className={`py-1.5 rounded-xl font-extrabold text-xs font-mono transition-all cursor-pointer ${
                    selectedSpots === spot
                      ? 'bg-[#00e699] text-[#050807] shadow-[0_0_10px_rgba(0,230,153,0.6)]'
                      : 'bg-[#151f19] text-slate-400 hover:bg-[#1f3127] hover:text-white border border-[#1f3127]'
                  }`}
                >
                  {spot}
                </button>
              ))}
            </div>
          </div>

          {/* Paytable Matrix for selected spots */}
          <div className="bg-[#050807] border border-[#1f3127] rounded-2xl p-3">
            <div className="flex items-center justify-between font-bold text-slate-300 border-b border-[#1f3127] pb-2 mb-2">
              <span>Matched Hits (Out of {selectedSpots})</span>
              <span>Multiplier Payout</span>
            </div>
            {breakdown.length === 0 ? (
              <div className="text-slate-500 text-center py-2">No payout for 0 matches.</div>
            ) : (
              <div className="space-y-1.5">
                {breakdown.map((row) => (
                  <div
                    key={row.hits}
                    className="flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-[#151f19] border border-[#1f3127]"
                  >
                    <span className="font-digital text-white font-semibold">
                      {row.hits} Matches
                    </span>
                    <span className="font-extrabold text-[#00e699] font-digital text-sm">
                      {row.multiplier}x
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Rules Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-[#050807] border border-[#1f3127] rounded-2xl p-3">
              <div className="flex items-center gap-2 font-bold text-white mb-1">
                <Shield className="w-4 h-4 text-[#00e699]" />
                <span>Round Lifecycle</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                45s Betting phase allows selecting 1-10 numbers or placing multiple tickets (up to 20 per draw). Direct in-place draw reveals 20 balls with instant hit lighting.
              </p>
            </div>

            <div className="bg-[#050807] border border-[#1f3127] rounded-2xl p-3">
              <div className="flex items-center gap-2 font-bold text-white mb-1">
                <Award className="w-4 h-4 text-[#facc15]" />
                <span>Cashier & Telebirr</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Seamless deposits and withdrawals in ETB with automated double-spending verification guard.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
