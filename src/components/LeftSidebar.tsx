import React, { useState } from 'react';
import { Play, RotateCcw, Ticket as TicketIcon, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Ticket, CommunityBet } from '../types/keno';

interface LeftSidebarProps {
  myTickets: Ticket[];
  myBetsHistory: Ticket[];
  communityBets: CommunityBet[];
  activeTab: 'game' | 'history';
  setActiveTab: (tab: 'game' | 'history') => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  myTickets,
  myBetsHistory,
  communityBets,
  activeTab,
  setActiveTab,
}) => {
  const [filterTab, setFilterTab] = useState<'all' | 'myTickets' | 'myBets'>('all');

  return (
    <aside className="w-full lg:w-80 bg-[#141d24] border-r border-[#1f2c37] flex flex-col h-full overflow-hidden shadow-xl">
      {/* Header Tabs: GAME & HISTORY */}
      <div className="flex border-b border-[#1f2c37] bg-[#0e161c]">
        <button
          onClick={() => setActiveTab('game')}
          className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 font-bold text-xs sm:text-sm tracking-wide transition-all border-b-2 ${
            activeTab === 'game'
              ? 'border-[#00e699] text-[#00e699] bg-[#16222b]'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#121a20]'
          }`}
        >
          <Play className="w-4 h-4 fill-current" />
          <span>GAME</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 font-bold text-xs sm:text-sm tracking-wide transition-all border-b-2 ${
            activeTab === 'history'
              ? 'border-[#00e699] text-[#00e699] bg-[#16222b]'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#121a20]'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>HISTORY</span>
        </button>
      </div>

      {/* Filter Tabs: All (count), My Tickets, My Bets */}
      <div className="p-2.5 bg-[#10181f] border-b border-[#1b2631] flex items-center gap-1">
        <button
          onClick={() => setFilterTab('all')}
          className={`flex-1 py-1.5 px-2 rounded text-xs font-semibold transition-all whitespace-nowrap text-center ${
            filterTab === 'all'
              ? 'bg-[#00e699] text-slate-950 shadow-sm'
              : 'bg-[#18232c] text-slate-400 hover:text-slate-200 hover:bg-[#1e2c38]'
          }`}
        >
          All ({communityBets.length})
        </button>
        <button
          onClick={() => setFilterTab('myTickets')}
          className={`flex-1 py-1.5 px-2 rounded text-xs font-semibold transition-all whitespace-nowrap text-center ${
            filterTab === 'myTickets'
              ? 'bg-[#00e699] text-slate-950 shadow-sm'
              : 'bg-[#18232c] text-slate-400 hover:text-slate-200 hover:bg-[#1e2c38]'
          }`}
        >
          My Tickets ({myTickets.length})
        </button>
        <button
          onClick={() => setFilterTab('myBets')}
          className={`flex-1 py-1.5 px-2 rounded text-xs font-semibold transition-all whitespace-nowrap text-center ${
            filterTab === 'myBets'
              ? 'bg-[#00e699] text-slate-950 shadow-sm'
              : 'bg-[#18232c] text-slate-400 hover:text-slate-200 hover:bg-[#1e2c38]'
          }`}
        >
          My Bets
        </button>
      </div>

      {/* Ticket Cards Feed */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filterTab === 'all' && (
          <>
            {communityBets.map((item, idx) => (
              <div
                key={`${item.id}_${idx}`}
                className="bg-[#18232c] hover:bg-[#1d2b37] border border-[#233240] rounded-lg p-3 transition-all shadow-md group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-300 font-mono">
                      {item.userMasked}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono-num">
                      {item.timeAgo}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400 font-semibold font-mono-num">
                      Bet ${item.stake}
                    </span>
                    {item.status === 'waiting' && (
                      <span className="bg-[#facc15]/20 text-[#facc15] border border-[#facc15]/40 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" /> Waiting
                      </span>
                    )}
                    {item.status === 'win' && (
                      <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" /> +${item.payout}
                      </span>
                    )}
                    {item.status === 'loss' && (
                      <span className="bg-slate-700/50 text-slate-400 text-[10px] font-medium px-1.5 py-0.5 rounded">
                        Loss
                      </span>
                    )}
                  </div>
                </div>

                {/* Mini Number Chips */}
                <div className="flex flex-wrap gap-1">
                  {item.chosenNumbers.map((num) => (
                    <span
                      key={num}
                      className="w-5 h-5 rounded-full sphere-3d-green text-slate-950 font-extrabold text-[10px] flex items-center justify-center font-mono-num"
                    >
                      {num}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {(filterTab === 'myTickets' || filterTab === 'myBets') && (
          <>
            {myTickets.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs">
                <TicketIcon className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                <p>No tickets placed yet.</p>
                <p className="text-[11px] text-slate-600 mt-1">Pick up to 10 numbers and hit BET!</p>
              </div>
            ) : (
              myTickets.map((ticket, idx) => (
                <div
                  key={`${ticket.id}_${idx}`}
                  className="bg-[#18232c] border border-[#233240] rounded-lg p-3 transition-all shadow-md"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-200 font-mono">
                        ID: {ticket.drawId}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono-num">
                        {ticket.timestamp}
                      </span>
                    </div>
                    <div>
                      {ticket.status === 'waiting' && (
                        <span className="bg-[#facc15]/20 text-[#facc15] border border-[#facc15]/40 text-[10px] font-bold px-2 py-0.5 rounded">
                          Waiting
                        </span>
                      )}
                      {ticket.status === 'win' && (
                        <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded">
                          Win +${ticket.payout} ({ticket.matchedCount} hits)
                        </span>
                      )}
                      {ticket.status === 'loss' && (
                        <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold px-2 py-0.5 rounded">
                          No Win ({ticket.matchedCount || 0} hits)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-slate-400 mb-2 flex items-center justify-between">
                    <span>Stake: <strong className="text-amber-400 font-mono-num">${ticket.stake}</strong></span>
                    <span>Picks: <strong className="text-slate-200">{ticket.chosenNumbers.length}</strong></span>
                  </div>

                  {/* Chips Grid */}
                  <div className="flex flex-wrap gap-1">
                    {ticket.chosenNumbers.map((num) => {
                      const isHit = ticket.drawnNumbers?.includes(num);
                      return (
                        <span
                          key={num}
                          className={`w-6 h-6 rounded-full font-extrabold text-[11px] flex items-center justify-center font-mono-num ${
                            isHit
                              ? 'sphere-3d-green text-slate-950 ring-2 ring-emerald-300'
                              : 'bg-[#222d36] text-slate-300 border border-[#2e3b46]'
                          }`}
                        >
                          {num}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </aside>
  );
};
