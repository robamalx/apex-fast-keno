import React from 'react';
import { X, Gamepad2, Play, Flame, Star } from 'lucide-react';
import { haptic } from '../utils/telegram';

interface GamesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GamesModal: React.FC<GamesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const games = [
    {
      title: 'FAST KENO',
      tag: 'NOW PLAYING',
      multiplier: 'Up to 25,000x',
      desc: '1-min PRNG rounds with high hit frequency',
      gradient: 'from-pink-500 via-purple-600 to-indigo-700',
      active: true,
    },
    {
      title: 'CYBER CRASH',
      tag: 'HOT',
      multiplier: 'Up to 10,000x',
      desc: 'Cash out before the rocket crashes',
      gradient: 'from-cyan-500 to-blue-700',
      active: false,
    },
    {
      title: 'LIGHTNING ROULETTE',
      tag: 'POPULAR',
      multiplier: '500x Multipliers',
      desc: 'Electrified casino classic with lucky numbers',
      gradient: 'from-amber-500 to-rose-700',
      active: false,
    },
    {
      title: 'DICE 99',
      tag: 'CLASSIC',
      multiplier: '99% RTP',
      desc: 'Instant provably fair roll over/under',
      gradient: 'from-emerald-500 to-teal-700',
      active: false,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#14111d] border border-[#2a233d] w-full max-w-md rounded-3xl p-5 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#2a233d]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#ec4899] to-[#a855f7] flex items-center justify-center shadow-md">
              <Gamepad2 className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-extrabold text-base text-white tracking-wide">
              CASINO GAMES LOBBY
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1b1728] hover:bg-[#251f38] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
          {games.map((game, i) => (
            <div
              key={i}
              onClick={() => {
                haptic.selection();
                onClose();
              }}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                game.active
                  ? 'bg-gradient-to-r from-[#1b1728] to-[#251d36] border-[#ec4899] shadow-[0_0_15px_rgba(236,72,153,0.3)] ring-1 ring-[#ec4899]/50'
                  : 'bg-[#1b1728] border-[#2a233d] hover:border-purple-400/40 opacity-85'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-white">{game.title}</span>
                  <span
                    className={`text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase ${
                      game.active
                        ? 'bg-pink-500 text-white'
                        : 'bg-purple-900/60 text-purple-300'
                    }`}
                  >
                    {game.tag}
                  </span>
                </div>
                <p className="text-[11px] text-purple-300/70">{game.desc}</p>
                <span className="text-[10px] text-amber-300 font-mono-num font-bold block">
                  {game.multiplier}
                </span>
              </div>

              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center ${
                  game.active
                    ? 'bg-gradient-to-r from-[#ec4899] to-[#a855f7] text-white shadow-md'
                    : 'bg-[#262038] text-purple-400'
                }`}
              >
                <Play className="w-4 h-4 fill-current ml-0.5" />
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-[#1b1728] hover:bg-[#251f38] border border-[#2a233d] text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
        >
          Back to Keno
        </button>
      </div>
    </div>
  );
};
