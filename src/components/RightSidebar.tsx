import React, { useState } from 'react';
import { CheckCircle2, BarChart2, Clock, Flame, Snowflake, Shield } from 'lucide-react';
import { DrawResult } from '../types/keno';

interface RightSidebarProps {
  recentDraws: DrawResult[];
  currentDrawId: string;
  isDrawing: boolean;
  hotNumbers: number[];
  coldNumbers: number[];
  activeNumbers: number[];
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  recentDraws,
  currentDrawId,
  isDrawing,
  hotNumbers,
  coldNumbers,
  activeNumbers,
}) => {
  const [tab, setTab] = useState<'results' | 'statistics'>('results');

  return (
    <aside className="w-full lg:w-80 bg-[#141d24] border-l border-[#1f2c37] flex flex-col h-full overflow-hidden shadow-xl">
      {/* Header Tabs: RESULTS & STATISTICS */}
      <div className="flex border-b border-[#1f2c37] bg-[#0e161c]">
        <button
          onClick={() => setTab('results')}
          className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 font-bold text-xs sm:text-sm tracking-wide transition-all border-b-2 ${
            tab === 'results'
              ? 'border-[#00e699] text-[#00e699] bg-[#16222b]'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#121a20]'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>RESULTS</span>
        </button>
        <button
          onClick={() => setTab('statistics')}
          className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 font-bold text-xs sm:text-sm tracking-wide transition-all border-b-2 ${
            tab === 'statistics'
              ? 'border-[#00e699] text-[#00e699] bg-[#16222b]'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#121a20]'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>STATISTICS</span>
        </button>
      </div>

      {tab === 'results' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Active / Current Draw Row (WAIT indicator) */}
          <div className="bg-[#182631] border border-[#facc15]/40 rounded-lg p-3 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#00e699]" />
                <span className="text-xs font-bold text-slate-100 font-mono">
                  ID: {currentDrawId}
                </span>
              </div>
              <span className="bg-[#facc15]/20 text-[#facc15] border border-[#facc15]/40 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                <Clock className="w-2.5 h-2.5 animate-spin" />
                {isDrawing ? 'DRAWING NOW...' : 'WAIT'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              {isDrawing ? 'Balls popping...' : 'Select your 1-10 numbers & place bet'}
            </div>
          </div>

          {/* Table Headers */}
          <div className="flex items-center justify-between px-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-[#1f2c37] pb-1">
            <span>Draw ID</span>
            <span>20 Drawn Combination</span>
          </div>

          {/* Historical Draws List */}
          {recentDraws.map((draw, idx) => (
            <div
              key={`${draw.drawId}_${idx}`}
              className="bg-[#18232c] hover:bg-[#1d2b37] border border-[#233240] rounded-lg p-2.5 transition-all shadow-md"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-xs font-extrabold text-slate-200 font-mono">
                    {draw.drawId}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono-num">
                  {draw.timestamp}
                </span>
              </div>

              {/* 2x10 grid for 20 drawn balls */}
              <div className="grid grid-cols-10 gap-1 pt-1">
                {draw.drawnNumbers.map((num) => {
                  const isPlayerMatch = activeNumbers.includes(num);
                  return (
                    <div
                      key={num}
                      className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] font-mono-num transition-all ${
                        isPlayerMatch
                          ? 'bg-emerald-500 text-slate-950 shadow-[0_0_8px_rgba(0,230,153,0.8)] ring-1 ring-white'
                          : 'bg-[#222d36] text-slate-300 border border-[#2d3a46]'
                      }`}
                      title={`Ball ${num}`}
                    >
                      {num}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'statistics' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Hot Numbers Section */}
          <div className="bg-[#18232c] border border-red-500/20 rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-red-400 mb-2.5">
              <Flame className="w-4 h-4 fill-red-500/20" />
              <span>HOT NUMBERS (Most Frequent)</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {hotNumbers.map((num) => (
                <div
                  key={num}
                  className="bg-[#241a1a] border border-red-500/30 rounded p-1.5 text-center"
                >
                  <span className="text-sm font-extrabold text-red-300 font-mono-num">
                    {num}
                  </span>
                  <div className="text-[9px] text-red-400/80 mt-0.5">HIGH FREQ</div>
                </div>
              ))}
            </div>
          </div>

          {/* Cold Numbers Section */}
          <div className="bg-[#18232c] border border-cyan-500/20 rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 mb-2.5">
              <Snowflake className="w-4 h-4 fill-cyan-500/20" />
              <span>COLD NUMBERS (Least Frequent)</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {coldNumbers.map((num) => (
                <div
                  key={num}
                  className="bg-[#17242d] border border-cyan-500/30 rounded p-1.5 text-center"
                >
                  <span className="text-sm font-extrabold text-cyan-300 font-mono-num">
                    {num}
                  </span>
                  <div className="text-[9px] text-cyan-400/80 mt-0.5">DUE SOON</div>
                </div>
              ))}
            </div>
          </div>

          {/* Game Stats Summary */}
          <div className="bg-[#18232c] border border-[#233240] rounded-lg p-3 space-y-2 text-xs">
            <div className="text-slate-400 font-bold mb-1">SESSION RTP & ODDS</div>
            <div className="flex justify-between border-b border-[#22303c] pb-1">
              <span className="text-slate-400">Target RTP:</span>
              <span className="font-bold text-emerald-400 font-mono-num">92% - 96%</span>
            </div>
            <div className="flex justify-between border-b border-[#22303c] pb-1">
              <span className="text-slate-400">Boosted Match Logic:</span>
              <span className="font-bold text-amber-400 font-mono-num">65% Boosted Chance</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Maximum Spot Payout:</span>
              <span className="font-bold text-emerald-400 font-mono-num">5000x</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
