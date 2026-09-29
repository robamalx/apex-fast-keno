import React, { useState } from 'react';
import { Play, RotateCcw, CheckCircle2, BarChart3, Crown } from 'lucide-react';
import { Ticket, CommunityBet, DrawResult } from '../types/keno';
import { haptic } from '../utils/telegram';

interface LiveTicketFeedProps {
  myTickets: Ticket[];
  communityBets: CommunityBet[];
  recentDraws: DrawResult[];
  drawnBalls: number[];
  isDrawing: boolean;
  isResetPhase: boolean;
  isDrawFinished?: boolean;
  currentDrawId: string;
  onOpenVipModal: () => void;
  hotNumbers?: number[];
  coldNumbers?: number[];
  totalCommunityCount?: number;
}

export const LiveTicketFeed: React.FC<LiveTicketFeedProps> = ({
  myTickets,
  communityBets = [],
  recentDraws,
  drawnBalls,
  isDrawing,
  isResetPhase,
  isDrawFinished = false,
  currentDrawId,
  onOpenVipModal,
  hotNumbers = [7, 12, 23, 38, 45, 56, 64, 78],
  coldNumbers = [3, 19, 28, 31, 49, 52, 60, 73],
  totalCommunityCount,
}) => {
  // Navigation Tabs: GAME, HISTORY, RESULTS, STATISTICS, VIP
  const [activeTab, setActiveTab] = useState<'game' | 'history' | 'results' | 'stats'>('game');
  // Sub-Filter Badges for GAME tab: "All", "My Tickets", "My Bets"
  const [subFilter, setSubFilter] = useState<'all' | 'myTickets' | 'myBets'>('all');

  const displayAllCount =
    totalCommunityCount !== undefined
      ? totalCommunityCount + myTickets.length
      : myTickets.length + (Array.isArray(communityBets) ? communityBets.length : 0);

  return (
    <div className="w-full bg-[#0a120e] border border-[#1e3325] rounded-2xl p-2.5 sm:p-3.5 shadow-2xl flex flex-col space-y-2.5 select-none">
      {/* Top Navigation Tabs: ▶ GAME, ⟲ HISTORY, ✔ RESULTS, 📊 STATISTICS, 👑 */}
      <div className="flex items-center justify-between border-b border-[#1e3325] pb-2 text-xs sm:text-sm font-bold">
        <div className="flex items-center gap-3 sm:gap-6 overflow-x-auto no-scrollbar">
          {/* ▶ GAME Tab */}
          <button
            onClick={() => {
              haptic.selection();
              setActiveTab('game');
            }}
            className={`pb-1 flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'game'
                ? 'text-[#00e699] border-b-2 border-[#00e699]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>GAME</span>
          </button>

          {/* ⟲ HISTORY Tab */}
          <button
            onClick={() => {
              haptic.selection();
              setActiveTab('history');
            }}
            className={`pb-1 flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'text-[#00e699] border-b-2 border-[#00e699]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>HISTORY</span>
          </button>

          {/* ✔ RESULTS Tab */}
          <button
            onClick={() => {
              haptic.selection();
              setActiveTab('results');
            }}
            className={`pb-1 flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'results'
                ? 'text-[#00e699] border-b-2 border-[#00e699]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>RESULTS</span>
          </button>

          {/* 📊 STATISTICS Tab */}
          <button
            onClick={() => {
              haptic.selection();
              setActiveTab('stats');
            }}
            className={`pb-1 flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'stats'
                ? 'text-[#00e699] border-b-2 border-[#00e699]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>STATISTICS</span>
          </button>
        </div>

        {/* 👑 VIP Club Button */}
        <button
          onClick={() => {
            haptic.selection();
            onOpenVipModal();
          }}
          className="text-[#facc15] hover:text-yellow-300 transition-transform active:scale-95 cursor-pointer flex items-center gap-1 text-xs font-black bg-[#141f18] border border-[#facc15]/40 px-2 py-0.5 rounded-full shadow-sm"
          title="VIP Club & Rewards"
        >
          <Crown className="w-3.5 h-3.5 fill-current text-[#facc15]" />
          <span className="hidden xs:inline">VIP</span>
        </button>
      </div>

      {/* Tab View: GAME (Live Ticket Feed) */}
      {activeTab === 'game' && (
        <div className="space-y-2.5">
          {/* Sub-Filter Badges: "All [count]", "My Tickets [count]", "My Bets [count]" */}
          <div className="flex items-center gap-2 overflow-x-auto text-xs py-0.5">
            <button
              onClick={() => {
                haptic.selection();
                setSubFilter('all');
              }}
              className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer border ${
                subFilter === 'all'
                  ? 'bg-[#00e699] text-[#040705] border-[#00e699] shadow-[0_0_10px_rgba(0,230,153,0.3)]'
                  : 'bg-[#040705] text-slate-300 border-[#1e3325] hover:bg-[#141f18]'
              }`}
            >
              All [{displayAllCount}]
            </button>

            <button
              onClick={() => {
                haptic.selection();
                setSubFilter('myTickets');
              }}
              className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer border ${
                subFilter === 'myTickets'
                  ? 'bg-[#00e699] text-[#040705] border-[#00e699] shadow-[0_0_10px_rgba(0,230,153,0.3)]'
                  : 'bg-[#040705] text-slate-300 border-[#1e3325] hover:bg-[#141f18]'
              }`}
            >
              My Tickets [{myTickets.length}]
            </button>

            <button
              onClick={() => {
                haptic.selection();
                setSubFilter('myBets');
              }}
              className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer border ${
                subFilter === 'myBets'
                  ? 'bg-[#00e699] text-[#040705] border-[#00e699] shadow-[0_0_10px_rgba(0,230,153,0.3)]'
                  : 'bg-[#040705] text-slate-300 border-[#1e3325] hover:bg-[#141f18]'
              }`}
            >
              My Bets [{myTickets.length}]
            </button>
          </div>

          {/* Ticket Cards Stack: Current User's Active Tickets PINNED ON TOP! */}
          <div className="space-y-2.5">
            {/* 1. Player's Active Tickets (Pinned on Top) */}
            {myTickets.map((ticket, idx) => {
              const matchedHits = ticket.chosenNumbers.filter((n) => drawnBalls.includes(n)).length;
              const hasWon = ticket.payout !== undefined && ticket.payout > 0;

              return (
                <div
                  key={ticket.id}
                  className="bg-[#040705] border-2 border-[#00e699]/70 rounded-xl p-2.5 sm:p-3 shadow-lg relative transition-all"
                >
                  {/* Header: Ticket label in mint green */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-extrabold text-xs sm:text-sm text-[#00e699] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#00e699] animate-pulse" />
                      {idx + 1} My Ticket
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono-num tabular-nums">
                      ID: #{ticket.id.slice(-6)}
                    </span>
                  </div>

                  {/* Spot Grid: 2 rows of 5 slots representing chosen spots */}
                  <div className="grid grid-cols-5 gap-1.5 mb-2">
                    {Array.from({ length: 10 }, (_, slotIdx) => {
                      const spotNum = ticket.chosenNumbers[slotIdx];
                      const hasSpot = spotNum !== undefined;
                      const isHit = hasSpot && drawnBalls.includes(spotNum);

                      return (
                        <div
                          key={slotIdx}
                          className={`h-7 sm:h-8 rounded-lg flex items-center justify-center font-mono-num font-bold text-xs sm:text-sm tabular-nums transition-all ${
                            !hasSpot
                              ? 'bg-transparent border border-[#142319] text-transparent'
                              : isHit
                              ? 'ticket-spot-hit'
                              : 'bg-[#141f18] border border-[#1e3325] text-white'
                          }`}
                        >
                          {hasSpot ? spotNum : ''}
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer: Left shows "Bet [amount]", right shows "Waiting" in yellow (or exact won amount in bright green digits on win, cleared on loss) */}
                  <div className="flex items-center justify-between text-xs pt-1.5 border-t border-[#142319]">
                    <span className="text-slate-300 font-semibold">
                      Bet <strong className="text-white font-mono-num tabular-nums">{ticket.stake} ETB</strong>
                    </span>

                    <div>
                      {isResetPhase || isDrawFinished || ticket.payout !== undefined ? (
                        hasWon ? (
                          <span className="text-[#00e699] font-black font-mono-num text-xs sm:text-sm flex items-center gap-1 animate-bounce tabular-nums">
                            <span className="text-sm sm:text-base text-[#00e699] tabular-nums">
                              +{ticket.payout ? ticket.payout.toFixed(2) : '0.00'}
                            </span>
                            <span>ETB</span>
                          </span>
                        ) : (
                          /* Cleared Waiting label on loss */
                          <span className="text-slate-600 font-mono-num text-[11px]">—</span>
                        )
                      ) : (
                        <span className="text-[#facc15] font-black animate-pulse flex items-center gap-1">
                          <span>Waiting</span>
                          {matchedHits > 0 && (
                            <span className="text-white font-mono-num tabular-nums">({matchedHits} Hits)</span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* 2. Community Bets (if subFilter allows) */}
            {subFilter !== 'myTickets' &&
              subFilter !== 'myBets' &&
              communityBets.map((cBet) => {
                const matchedHits = cBet.chosenNumbers.filter((n) => drawnBalls.includes(n)).length;

                return (
                  <div
                    key={cBet.id}
                    className="bg-[#040705] border border-[#1e3325] rounded-xl p-2.5 sm:p-3 shadow-md transition-all opacity-90 hover:opacity-100"
                  >
                    {/* Header: User ID in mint green */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs sm:text-sm text-[#00e699]">
                        {cBet.userMasked}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono-num tabular-nums">
                        {cBet.timeAgo || 'Just now'}
                      </span>
                    </div>

                    {/* Spot Grid: 2 rows of 5 slots */}
                    <div className="grid grid-cols-5 gap-1.5 mb-2">
                      {Array.from({ length: 10 }, (_, slotIdx) => {
                        const spotNum = cBet.chosenNumbers[slotIdx];
                        const hasSpot = spotNum !== undefined;
                        const isHit = hasSpot && drawnBalls.includes(spotNum);

                        return (
                          <div
                            key={slotIdx}
                            className={`h-7 sm:h-8 rounded-lg flex items-center justify-center font-mono-num font-bold text-xs sm:text-sm tabular-nums transition-all ${
                              !hasSpot
                                ? 'bg-transparent border border-[#142319] text-transparent'
                                : isHit
                                ? 'ticket-spot-hit'
                                : 'bg-[#141f18] border border-[#1e3325] text-slate-300'
                            }`}
                          >
                            {hasSpot ? spotNum : ''}
                          </div>
                        );
                      })}
                    </div>

                    {/* Footer: Left "Bet [amount]", right "Waiting" / "X Hits" / "Won X ETB" */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-[#142319]">
                      <span className="text-slate-400">
                        Bet <strong className="text-white font-mono-num tabular-nums">{cBet.stake.toFixed(2)} ETB</strong>
                      </span>
                      {cBet.status === 'win' && cBet.payout && cBet.payout > 0 ? (
                        <span className="text-[#00e699] font-black font-mono-num tabular-nums drop-shadow-[0_0_8px_rgba(0,230,153,0.4)]">
                          Won {cBet.payout.toFixed(2)} ETB
                        </span>
                      ) : matchedHits > 0 ? (
                        <span className="text-[#facc15] font-bold">
                          {matchedHits} Hits
                        </span>
                      ) : (
                        <span className="text-slate-500 font-bold">
                          Waiting
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

            {/* Empty State when no user tickets placed */}
            {myTickets.length === 0 && subFilter !== 'all' && (
              <div className="py-6 text-center text-slate-400 text-xs">
                No active tickets placed for this draw yet. Pick numbers above and tap BET!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab View: HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-2.5">
          {recentDraws.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              No previous round history recorded yet.
            </div>
          ) : (
            recentDraws.map((draw) => (
              <div
                key={draw.drawId}
                className="bg-[#040705] border border-[#1e3325] rounded-xl p-2.5 flex flex-col space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white font-mono-num tabular-nums">
                    Draw #{draw.drawId}
                  </span>
                  <span className="text-slate-400 text-[11px] font-mono-num tabular-nums">{draw.timestamp}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {draw.drawnNumbers.map((num) => (
                    <span
                      key={num}
                      className="w-6 h-6 rounded bg-[#141f18] border border-[#1e3325] text-slate-200 flex items-center justify-center font-mono-num font-bold text-xs tabular-nums"
                    >
                      {num}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab View: RESULTS (Past rounds with Draw IDs, timestamps, and 2x10 ball combinations) */}
      {activeTab === 'results' && (
        <div className="space-y-2.5">
          {recentDraws.map((draw) => {
            const row1 = draw.drawnNumbers.slice(0, 10);
            const row2 = draw.drawnNumbers.slice(10, 20);

            return (
              <div
                key={draw.drawId}
                className="bg-[#040705] border border-[#1e3325] rounded-xl p-2.5 shadow-md flex flex-col space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#00e699]" />
                    <span className="font-bold text-sm text-white font-mono-num tabular-nums">
                      Round #{draw.drawId}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono-num tabular-nums">{draw.timestamp}</span>
                </div>

                {/* 2x10 Ball Combinations */}
                <div className="space-y-1">
                  {/* Row 1: First 10 balls */}
                  <div className="grid grid-cols-10 gap-1">
                    {row1.map((num) => (
                      <div
                        key={`r1_${num}`}
                        className="h-6 sm:h-7 rounded-md bg-[#141f18] text-[#00e699] border border-[#1e3325] flex items-center justify-center font-mono-num font-bold text-xs tabular-nums shadow-sm"
                      >
                        {num}
                      </div>
                    ))}
                  </div>
                  {/* Row 2: Next 10 balls */}
                  <div className="grid grid-cols-10 gap-1">
                    {row2.map((num) => (
                      <div
                        key={`r2_${num}`}
                        className="h-6 sm:h-7 rounded-md bg-[#141f18] text-[#00e699] border border-[#1e3325] flex items-center justify-center font-mono-num font-bold text-xs tabular-nums shadow-sm"
                      >
                        {num}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab View: STATISTICS (Frequency bars for numbers across last 100 rounds) */}
      {activeTab === 'stats' && (
        <div className="space-y-3 p-1">
          {/* Hot & Cold Summary (Strict Black, Green, Gold) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="bg-[#040705] border border-[#1e3325] rounded-xl p-2.5">
              <h4 className="text-xs font-bold text-[#facc15] mb-1.5 flex items-center gap-1">
                🔥 HOT NUMBERS (Top Frequency)
              </h4>
              <div className="grid grid-cols-4 gap-1.5">
                {hotNumbers.map((num) => (
                  <div
                    key={num}
                    className="h-7 rounded-lg bg-[#1a180f] border border-[#facc15]/50 text-[#facc15] font-mono-num font-bold text-xs tabular-nums flex items-center justify-center shadow-md"
                  >
                    {num}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#040705] border border-[#1e3325] rounded-xl p-2.5">
              <h4 className="text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1">
                ❄️ COLD NUMBERS (Least Drawn)
              </h4>
              <div className="grid grid-cols-4 gap-1.5">
                {coldNumbers.map((num) => (
                  <div
                    key={num}
                    className="h-7 rounded-lg bg-[#141f18] border border-[#1e3325] text-slate-200 font-mono-num font-bold text-xs tabular-nums flex items-center justify-center shadow-md"
                  >
                    {num}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Number Frequency Bars across last 100 rounds */}
          <div className="bg-[#040705] border border-[#1e3325] rounded-xl p-3">
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Frequency Distribution (Last 100 Rounds)
              </h4>
              <span className="text-[10px] text-[#00e699] font-mono-num font-bold tabular-nums">20.0% Avg</span>
            </div>

            <div className="space-y-2 text-xs font-mono-num">
              {[
                { num: 23, freq: 34, isHot: true },
                { num: 45, freq: 31, isHot: true },
                { num: 12, freq: 29, isHot: true },
                { num: 7, freq: 28, isHot: true },
                { num: 64, freq: 27, isHot: true },
                { num: 19, freq: 9, isHot: false },
                { num: 3, freq: 8, isHot: false },
                { num: 52, freq: 7, isHot: false },
              ].map((item) => (
                <div key={item.num} className="flex items-center gap-2">
                  <span className="w-6 text-slate-300 font-bold text-right tabular-nums">{item.num}</span>
                  <div className="flex-1 bg-[#141f18] h-2.5 rounded-full overflow-hidden border border-[#1e3325]">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        item.isHot ? 'bg-[#00e699]' : 'bg-slate-500'
                      }`}
                      style={{ width: `${Math.min(100, item.freq * 2.8)}%` }}
                    />
                  </div>
                  <span
                    className={`w-8 text-right font-bold text-[11px] tabular-nums ${
                      item.isHot ? 'text-[#00e699]' : 'text-slate-400'
                    }`}
                  >
                    {item.freq}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
