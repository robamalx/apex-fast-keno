import React from 'react';
import { HelpCircle, Wand2, Trash2 } from 'lucide-react';
import { KENO_PAYTABLE } from '../utils/paytable';
import { haptic } from '../utils/telegram';

interface DynamicSpotHudProps {
  selectedNumbers: number[];
  stake: number;
  timeRemaining: number;
  onOpenRules: () => void;
  onQuickPick: (count: number) => void;
  onClearSelection: () => void;
  isMaxTicketsReached?: boolean;
}

export const DynamicSpotHud: React.FC<DynamicSpotHudProps> = ({
  selectedNumbers,
  stake,
  timeRemaining,
  onOpenRules,
  onQuickPick,
  onClearSelection,
  isMaxTicketsReached = false,
}) => {
  const pickCount = selectedNumbers.length;
  const isZeroPicks = pickCount === 0;

  // If numbers picked, use actual paytable; if 0 picks, use base 10-spot paytable for dimmed layout
  const activePayKey = isZeroPicks ? 10 : pickCount;
  const payMap = KENO_PAYTABLE[activePayKey] || {};

  // Find max multiplier possible for this pickCount
  const multipliers = Object.values(payMap);
  const maxMult = multipliers.length > 0 ? Math.max(...multipliers) : 0;
  const maxWin = isZeroPicks ? 0 : Math.round(stake * maxMult);

  // Match / Pays thresholds
  const matchThresholds = Object.keys(payMap)
    .map(Number)
    .sort((a, b) => a - b);

  // Digital countdown format MM:SS
  const mins = Math.floor(timeRemaining / 60);
  const secs = timeRemaining % 60;
  const formattedTimer = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  return (
    <div className="w-full bg-[#0a120e] border border-[#1e3325] rounded-xl px-2.5 py-1.5 shadow-lg select-none flex flex-col space-y-1.5">
      {/* ============================================================
          1. TOP BAR: Stake, Possible win, Countdown Timer, "?" Rules
          ============================================================ */}
      <div className="flex items-center justify-between text-xs pb-1 border-b border-[#1e3325]">
        <div className="flex items-center gap-1.5 font-bold">
          <span className="text-slate-400 font-medium text-[11px]">Stake</span>
          <span className="text-white font-mono-num font-black text-xs">{stake}</span>
          <span className="text-slate-400 font-medium text-[11px] ml-1">Possible win</span>
          <span
            className={`font-black font-mono-num text-xs sm:text-sm ${
              !isZeroPicks
                ? 'text-[#00e699] drop-shadow-[0_0_8px_rgba(0,230,153,0.5)]'
                : 'text-slate-400'
            }`}
          >
            {!isZeroPicks ? `${maxWin.toLocaleString()} ETB` : '0 ETB'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Digital Countdown Timer */}
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#040705] border border-[#00e699]/40 text-[#00e699] font-mono-num font-bold text-[11px] tabular-nums">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00e699] animate-pulse" />
            <span className="font-mono-num tabular-nums">{formattedTimer}</span>
          </div>

          {/* Circular "?" Help Button */}
          <button
            onClick={() => {
              haptic.selection();
              onOpenRules();
            }}
            className="w-6 h-6 rounded-full bg-[#141f18] border border-[#1e3325] flex items-center justify-center text-[#00e699] hover:text-white transition-all cursor-pointer shrink-0"
            title="Rules & Paytable"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#00e699]" />
          </button>
        </div>
      </div>

      {/* ============================================================
          2. PERMANENT MULTIPLIER ROW: MATCH & PAYS (Never collapses)
          ============================================================ */}
      <div className="bg-[#040705] border border-[#1e3325] rounded-lg px-2 py-0.5 overflow-x-auto no-scrollbar min-h-[36px] flex items-center">
        <div className="flex flex-col space-y-0.5 min-w-max mx-auto text-center font-mono-num text-[10px] sm:text-[11px] w-full">
          {/* Row 1: "MATCH" */}
          <div className="flex items-center gap-1.5 justify-center text-slate-400">
            <span className="text-[9px] uppercase font-bold text-slate-500 w-11 text-left shrink-0">
              Match
            </span>
            {matchThresholds.map((hits) => (
              <span
                key={hits}
                className={`w-7 text-center font-bold rounded py-0.2 ${
                  !isZeroPicks
                    ? 'text-white bg-[#141f18]'
                    : 'text-slate-600 bg-[#0e1611]'
                }`}
              >
                {hits}
              </span>
            ))}
          </div>

          {/* Row 2: "PAYS" in gold accent (or placeholder '-' when 0 picks) */}
          <div className="flex items-center gap-1.5 justify-center text-slate-300">
            <span
              className={`text-[9px] uppercase font-bold w-11 text-left shrink-0 ${
                !isZeroPicks ? 'text-[#facc15]' : 'text-slate-600'
              }`}
            >
              Pays
            </span>
            {matchThresholds.map((hits) => {
              const mult = payMap[hits] || 0;
              return (
                <span
                  key={hits}
                  className={`w-7 text-center font-extrabold rounded py-0.2 ${
                    isZeroPicks
                      ? 'text-slate-600'
                      : mult > 0
                      ? 'text-[#facc15] bg-[#1a180f]'
                      : 'text-slate-600'
                  }`}
                >
                  {isZeroPicks ? '-' : mult > 0 ? `x${mult}` : '-'}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* ============================================================
          3. PICKS TRAY & 4. INSTRUCTION / COUNTER / ACTION CONTROLS
          - 10 fixed rectangular slots (never collapses)
          - State 0: 10 dashed/dark placeholder slots + "Selected: 0 / 10"
          - State 1: filled chips (#00e699) + remaining placeholders
          ============================================================ */}
      <div className="flex items-center justify-between gap-1.5 pt-0.5">
        {/* Left: PICKS Tray with 10 fixed rectangular slots */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-0.5">
            Picks:
          </span>
          <div className="flex items-center gap-1">
            {Array.from({ length: 10 }, (_, i) => {
              const num = selectedNumbers[i];
              const hasNum = num !== undefined;
              return (
                <div
                  key={i}
                  className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md font-mono-num font-black text-[10px] sm:text-[11px] flex items-center justify-center transition-all ${
                    hasNum
                      ? 'bg-[#00e699] text-[#040705] shadow-[0_0_6px_rgba(0,230,153,0.5)]'
                      : 'bg-[#141f18]/50 border border-dashed border-[#1e3325] text-transparent'
                  }`}
                >
                  {hasNum ? num : ''}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: "Selected: X / 10" Counter + Auto Pick + Clear */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <span className="text-[10px] sm:text-[11px] text-slate-400 font-bold whitespace-nowrap">
            Selected:{' '}
            <strong
              className={`font-mono-num ${
                pickCount > 0 ? 'text-[#00e699]' : 'text-slate-300'
              }`}
            >
              {pickCount} / 10
            </strong>
          </span>

          <button
            onClick={() => {
              haptic.selection();
              onQuickPick(10);
            }}
            disabled={isMaxTicketsReached}
            className="bg-[#141f18] hover:bg-[#1e3325] active:scale-95 text-slate-200 px-2 py-0.5 rounded-lg border border-[#1e3325] font-bold text-[10px] sm:text-[11px] flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40"
            title="Auto Pick 10 Numbers"
          >
            <Wand2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#00e699]" />
            <span>Auto</span>
          </button>

          <button
            onClick={() => {
              haptic.selection();
              onClearSelection();
            }}
            disabled={isZeroPicks}
            className="bg-[#141f18] hover:bg-rose-950/40 active:scale-95 text-rose-300 px-1.5 py-0.5 rounded-lg border border-[#1e3325] font-bold text-[10px] sm:text-[11px] flex items-center gap-1 transition-all cursor-pointer disabled:opacity-30"
            title="Clear Picks"
          >
            <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-rose-400" />
            <span>Clear</span>
          </button>
        </div>
      </div>
    </div>
  );
};
