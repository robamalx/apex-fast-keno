import React, { useState } from 'react';
import { Check, Radio, Sparkles } from 'lucide-react';
import { haptic } from '../utils/telegram';
import { DynamicSpotHud } from './DynamicSpotHud';

interface FastKenoBoardStageProps {
  phase: 'betting' | 'drawing' | 'reset';
  selectedNumbers: number[];
  onToggleNumber: (num: number) => void;
  onClearSelection: () => void;
  onQuickPick: (count: number) => void;
  stake: number;
  setStake: (stake: number) => void;
  onPlaceBet: () => void;
  timeRemaining: number;
  ticketsPlacedCount: number;
  onOpenRules: () => void;
  balance: number;
  hotNumbers?: number[];
  coldNumbers?: number[];
  drawnBalls: number[];
  lastDrawnBall?: number;
  allPlayerChosenNumbers: number[];
  totalWinnings: number;
  isDrawFinished: boolean;
  hasActiveTickets: boolean;
}

export const FastKenoBoardStage: React.FC<FastKenoBoardStageProps> = ({
  phase,
  selectedNumbers,
  onToggleNumber,
  onClearSelection,
  onQuickPick,
  stake,
  setStake,
  onPlaceBet,
  timeRemaining,
  ticketsPlacedCount,
  onOpenRules,
  balance,
  hotNumbers = [7, 12, 23, 38, 45, 56, 64, 78],
  coldNumbers = [3, 19, 28, 31, 49, 52, 60, 73],
  drawnBalls,
  lastDrawnBall,
  allPlayerChosenNumbers,
  totalWinnings,
  isDrawFinished,
  hasActiveTickets,
}) => {
  const [isBetAccepted, setIsBetAccepted] = useState<boolean>(false);
  const isMaxTicketsReached = ticketsPlacedCount >= 20;
  const isDrawingOrReset = phase === 'drawing' || phase === 'reset';

  // Strict Highlighting: Only submitted/confirmed bets count as active player targets
  const confirmedTargets = allPlayerChosenNumbers;

  // Count active player hits in drawn balls
  const activeHitsCount = confirmedTargets.filter((num) => drawnBalls.includes(num)).length;

  const handleBetClick = () => {
    if (selectedNumbers.length === 0 || isMaxTicketsReached || isDrawingOrReset) return;
    setIsBetAccepted(true);
    onPlaceBet();
    setTimeout(() => {
      setIsBetAccepted(false);
    }, 1200);
  };

  const handleDecreaseStake = () => {
    if (isDrawingOrReset) return;
    haptic.selection();
    setStake(Math.max(1, stake - (stake > 10 ? 5 : 1)));
  };

  const handleIncreaseStake = () => {
    if (isDrawingOrReset) return;
    haptic.selection();
    setStake(stake + (stake >= 10 ? 5 : 1));
  };

  const handleDoubleStake = () => {
    if (isDrawingOrReset) return;
    haptic.selection();
    setStake(Math.min(5000, stake * 2));
  };

  const handleMaxStake = () => {
    if (isDrawingOrReset) return;
    haptic.selection();
    setStake(Math.min(5000, Math.max(stake, Math.floor(balance))));
  };

  // 2-Row Chute Queues: 10 on row 1, 10 on row 2
  const chuteRow1 = drawnBalls.slice(0, 10);
  const chuteRow2 = drawnBalls.slice(10, 20);

  return (
    <div className="w-full flex flex-col space-y-1.5 select-none">
      {/* ============================================================
          TOP AREA: PERMANENT HUD (BETTING) OR 2-ROW BALL TRAY (DRAWING)
          ============================================================ */}
      {!isDrawingOrReset ? (
        /* PHASE 1: BETTING HUD (Permanent fixed-height HUD: Stake, Possible win, Match/Pays, 10 Picks, Auto, Clear) */
        <DynamicSpotHud
          selectedNumbers={selectedNumbers}
          stake={stake}
          timeRemaining={timeRemaining}
          onOpenRules={onOpenRules}
          onQuickPick={onQuickPick}
          onClearSelection={onClearSelection}
          isMaxTicketsReached={isMaxTicketsReached}
        />
      ) : (
        /* PHASE 2: SLEEK 2-ROW BALL CHUTE / TRAY (10 balls top, 10 balls bottom) */
        <div className="w-full bg-[#0a120e] border border-[#1e3325] rounded-xl px-2.5 py-1.5 shadow-lg flex flex-col space-y-1.5 animate-fadeIn">
          {/* Chute Header Row: Drawing Status or Inline Round Conclusion Banner */}
          <div className="flex items-center justify-between min-h-[26px]">
            {isDrawFinished ? (
              /* Inline Status Message Banner in the Header Zone above the 20-ball tray */
              totalWinnings > 0 ? (
                <div className="flex items-center gap-1.5 font-mono-num animate-pulse">
                  <Sparkles className="w-4 h-4 text-[#facc15]" />
                  <span className="text-xs sm:text-sm font-black text-[#00e699] drop-shadow-[0_0_10px_rgba(0,230,153,0.8)]">
                    YOU WON +{totalWinnings.toFixed(2)} ETB!
                  </span>
                </div>
              ) : hasActiveTickets ? (
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#94a3b8]" />
                  <span className="text-xs sm:text-sm font-extrabold text-[#94a3b8] tracking-wide">
                    ROUND FINISHED — TRY AGAIN
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-extrabold text-[#94a3b8] tracking-wide">
                    ROUND FINISHED
                  </span>
                </div>
              )
            ) : (
              /* In Progress: DRAWING BALLS */
              <div className="flex items-center gap-1.5">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00e699] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00e699]" />
                </span>
                <span className="text-[10px] sm:text-[11px] font-extrabold tracking-wider uppercase text-slate-300 flex items-center gap-1 font-mono-num">
                  <Radio className="w-3 h-3 text-[#00e699] animate-pulse" />
                  <span>DRAWING BALLS</span>
                </span>
              </div>
            )}

            {/* Active Hits & Live Ball Counter Badge ("BALL XX / 20" in bright green) */}
            <div className="flex items-center gap-2">
              {confirmedTargets.length > 0 && activeHitsCount > 0 && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#112017] border border-[#1e3828] text-[#facc15] text-[10px] font-bold font-mono-num">
                  <Sparkles className="w-2.5 h-2.5 text-[#facc15]" />
                  <span>{activeHitsCount} Hits</span>
                </div>
              )}

              <div className="flex items-center gap-1 bg-[#040705] border border-[#00e699]/40 px-2.5 py-0.5 rounded-full shadow-[0_0_8px_rgba(0,230,153,0.2)]">
                <span className="font-mono-num text-xs sm:text-sm font-bold text-[#00e699] tracking-wider tabular-nums">
                  BALL {drawnBalls.length.toString().padStart(2, '0')}
                  <span className="text-slate-500 text-[10px]"> / 20</span>
                </span>
              </div>
            </div>
          </div>

          {/* 2-Row Mechanical Ball Chute Tray (10 balls top, 10 balls bottom) */}
          <div className="bg-[#040705] border border-[#1e3325] rounded-lg p-1.5 flex flex-col space-y-1">
            {/* Top Row: Balls 1 to 10 */}
            <div className="grid grid-cols-10 gap-1 sm:gap-1.5">
              {Array.from({ length: 10 }, (_, i) => {
                const ball = chuteRow1[i];
                const isSlotted = ball !== undefined;
                const isHit = isSlotted && confirmedTargets.includes(ball);
                const isLatest = isSlotted && ball === lastDrawnBall;

                return (
                  <div
                    key={`chute1_${i}`}
                    className={`h-6 sm:h-7 rounded-full flex items-center justify-center font-mono-num font-bold text-xs sm:text-[13px] tabular-nums transition-all select-none ${
                      isSlotted
                        ? isHit
                          ? 'chute-ball-hit animate-chute-reveal'
                          : 'chute-ball-regular animate-chute-reveal'
                        : 'chute-slot-empty text-transparent'
                    } ${isLatest ? 'scale-105 ring-1 ring-white/70' : ''}`}
                  >
                    {isSlotted ? ball : ''}
                  </div>
                );
              })}
            </div>

            {/* Bottom Row: Balls 11 to 20 */}
            <div className="grid grid-cols-10 gap-1 sm:gap-1.5">
              {Array.from({ length: 10 }, (_, i) => {
                const ball = chuteRow2[i];
                const isSlotted = ball !== undefined;
                const isHit = isSlotted && confirmedTargets.includes(ball);
                const isLatest = isSlotted && ball === lastDrawnBall;

                return (
                  <div
                    key={`chute2_${i}`}
                    className={`h-6 sm:h-7 rounded-full flex items-center justify-center font-mono-num font-bold text-xs sm:text-[13px] tabular-nums transition-all select-none ${
                      isSlotted
                        ? isHit
                          ? 'chute-ball-hit animate-chute-reveal'
                          : 'chute-ball-regular animate-chute-reveal'
                        : 'chute-slot-empty text-transparent'
                    } ${isLatest ? 'scale-105 ring-1 ring-white/70' : ''}`}
                  >
                    {isSlotted ? ball : ''}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          PERMANENT 8x10 NUMBER BOARD GRID (Numbers 1 to 80)
          Zero scroll: Compact aspect-square tiles (~28px-30px, gap 2px)
          Strict Black & Green Casino Aesthetic + Draw-Only Reactive Highlight
          NEUTRAL BOARD START: All 80 tiles start neutral dark slate-black (#141f18).
          Only light up when and if drawn!
          ============================================================ */}
      <div className="bg-[#0a120e] border border-[#1e3325] rounded-xl p-1 sm:p-1.5 shadow-2xl relative">
        <div className="grid grid-cols-10 gap-[2px] sm:gap-1">
          {Array.from({ length: 80 }, (_, i) => i + 1).map((num) => {
            const isSelected = selectedNumbers.includes(num);
            const isTicketTarget = confirmedTargets.includes(num);
            const isDrawn = drawnBalls.includes(num);
            const isHit = isDrawn && isTicketTarget;
            const isMiss = isDrawn && !isTicketTarget;
            const isLatest = isDrawn && num === lastDrawnBall;
            const isHot = hotNumbers.includes(num);
            const isCold = coldNumbers.includes(num);

            // Determine tile styling class based on exact decoupled state:
            let tileClass = 'tile-atlas-unselected';
            if (isDrawingOrReset) {
              // Neutral Board Start: Only light up IF AND WHEN its specific ball is drawn
              if (isDrawn) {
                if (isHit) {
                  tileClass = 'tile-atlas-drawn-hit';
                } else {
                  tileClass = 'tile-atlas-drawn-miss';
                }
              } else {
                tileClass = 'tile-atlas-unselected';
              }
            } else {
              if (isSelected) {
                tileClass = 'tile-atlas-selected';
              }
            }

            return (
              <button
                key={num}
                onClick={() => !isDrawingOrReset && onToggleNumber(num)}
                disabled={isDrawingOrReset || isMaxTicketsReached}
                className={`h-[29px] sm:h-[32px] aspect-square w-full rounded-md text-[13px] sm:text-[14px] font-bold flex items-center justify-center transition-all duration-100 transform font-mono-num relative select-none tabular-nums ${tileClass} ${
                  isLatest ? 'animate-bounce-pop' : ''
                } ${
                  isDrawingOrReset
                    ? 'cursor-default'
                    : isMaxTicketsReached
                    ? 'cursor-not-allowed opacity-80'
                    : 'cursor-pointer active:scale-90 hover:brightness-110'
                }`}
              >
                {/* Tiny corner indicators during betting phase: Red dot for Hot, Muted Green for Cold */}
                {!isDrawingOrReset && !isSelected && isHot && (
                  <span
                    className="absolute top-0.5 right-0.5 w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-rose-500 shadow-[0_0_4px_rgba(244,63,94,0.8)]"
                    title="Hot Number"
                  />
                )}
                {!isDrawingOrReset && !isSelected && isCold && (
                  <span
                    className="absolute top-0.5 right-0.5 w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-emerald-600/70"
                    title="Cold Number"
                  />
                )}

                {/* Animated "HIT!" badge directly on matched tile */}
                {isDrawingOrReset && isHit && (
                  <span className="absolute -top-1 -right-1 bg-[#ffffff] text-[#040705] font-black text-[7px] px-1 py-0.2 rounded font-sans leading-none shadow-md animate-hit-badge">
                    HIT
                  </span>
                )}

                {num}
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================
          BET CONTROLS BAR: Height ~38px to 40px
          Locks during draw: "DRAWING... (XX/20)"
          ============================================================ */}
      <div className="bg-[#0a120e] border border-[#1e3325] rounded-xl p-1 sm:p-1.5 shadow-xl flex items-center justify-between gap-1.5 sm:gap-2">
        {/* Stake Controls Container */}
        <div
          className={`flex items-center gap-1 bg-[#040705] border border-[#1e3325] rounded-lg p-1 flex-1 sm:flex-initial justify-between sm:justify-start h-[38px] sm:h-[40px] transition-opacity ${
            isDrawingOrReset ? 'opacity-60 cursor-not-allowed' : ''
          }`}
        >
          {/* "-" Stepper Decrement */}
          <button
            onClick={handleDecreaseStake}
            disabled={isDrawingOrReset}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-[#141f18] hover:bg-[#1e3325] active:scale-95 text-slate-200 font-bold text-sm flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed"
            title="Decrease stake"
          >
            -
          </button>

          {/* Stake Input Field */}
          <div className="flex items-center justify-center px-1">
            <span className="text-[10px] sm:text-[11px] text-slate-400 mr-1 font-bold">ETB</span>
            <input
              type="number"
              disabled={isDrawingOrReset}
              value={stake}
              onChange={(e) => setStake(Math.max(1, Number(e.target.value)))}
              className="w-10 sm:w-14 bg-transparent text-center font-mono-num font-bold text-sm sm:text-base text-white focus:outline-none disabled:text-slate-400 tabular-nums"
            />
          </div>

          {/* "+" Stepper Increment */}
          <button
            onClick={handleIncreaseStake}
            disabled={isDrawingOrReset}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-[#141f18] hover:bg-[#1e3325] active:scale-95 text-slate-200 font-bold text-sm flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed"
            title="Increase stake"
          >
            +
          </button>

          {/* "X2" Multiplier Button */}
          <button
            onClick={handleDoubleStake}
            disabled={isDrawingOrReset}
            className="px-2 py-1 rounded-md bg-[#141f18] hover:bg-[#1e3325] active:scale-95 text-[#00e699] font-bold text-[11px] sm:text-xs transition-all cursor-pointer ml-0.5 disabled:cursor-not-allowed font-mono-num"
          >
            X2
          </button>

          {/* "MAX" Button (Gold Accent) */}
          <button
            onClick={handleMaxStake}
            disabled={isDrawingOrReset}
            className="px-2 py-1 rounded-md bg-[#141f18] hover:bg-[#1e3325] active:scale-95 text-[#facc15] font-bold text-[11px] sm:text-xs transition-all cursor-pointer disabled:cursor-not-allowed font-mono-num"
          >
            MAX
          </button>
        </div>

        {/* Action Button: Wide Green Gradient "BET" OR Locked "DRAWING... (XX/20)" */}
        <button
          onClick={handleBetClick}
          disabled={isDrawingOrReset || selectedNumbers.length === 0 || isMaxTicketsReached}
          className={`h-[38px] sm:h-[40px] px-4 sm:px-8 rounded-xl font-bold text-xs sm:text-sm tracking-wider uppercase transition-all duration-200 shadow-md flex items-center justify-center gap-1.5 shrink-0 ${
            isDrawingOrReset
              ? 'bg-[#101c15] text-[#00e699] border border-[#1e3828] cursor-not-allowed'
              : isBetAccepted
              ? 'bg-[#00e699] text-[#040705] shadow-[0_0_20px_rgba(0,230,153,0.8)] scale-102'
              : isMaxTicketsReached
              ? 'bg-[#141f18] text-slate-500 border border-[#1e3325] cursor-not-allowed'
              : selectedNumbers.length === 0
              ? 'bg-[#141f18] text-slate-500 border border-[#1e3325] cursor-not-allowed'
              : 'bg-gradient-to-r from-[#00e699] to-[#059669] hover:from-[#34d399] hover:to-[#10b981] text-[#040705] shadow-[0_0_16px_rgba(0,230,153,0.5)] cursor-pointer active:scale-98'
          }`}
        >
          {isDrawingOrReset ? (
            <span className="flex items-center gap-1.5 font-bold text-xs sm:text-sm tracking-wider text-[#00e699] font-mono-num tabular-nums">
              <Radio className="w-3.5 h-3.5 animate-spin text-[#00e699]" />
              <span>DRAWING... ({drawnBalls.length}/20)</span>
            </span>
          ) : isBetAccepted ? (
            <span className="flex items-center gap-1.5 text-[#040705] font-black animate-pulse">
              <Check className="w-4 h-4 stroke-[3] text-[#040705]" />
              <span>BET ACCEPTED</span>
            </span>
          ) : isMaxTicketsReached ? (
            'LIMIT REACHED (20)'
          ) : selectedNumbers.length === 0 ? (
            'PICK NUMBERS'
          ) : (
            `BET (${stake} ETB)`
          )}
        </button>
      </div>
    </div>
  );
};
