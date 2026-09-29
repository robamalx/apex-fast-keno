import React, { useState } from 'react';
import {
  Play,
  Sparkles,
  Flame,
  Users,
  ShieldCheck,
  Zap,
  Layers,
  Palette,
  ArrowRight,
  TrendingUp,
  Target,
} from 'lucide-react';
import { haptic } from '../utils/telegram';

interface CasinoLobbyViewProps {
  onPlayKeno: () => void;
  onOpenRules: () => void;
  onOpenCashier: () => void;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  currentDrawId: string;
  timeRemaining: number;
  balance: number;
  searchQuery?: string;
}

interface UpcomingGame {
  id: string;
  title: string;
  category: string;
  description: string;
  badge: 'SOON' | 'IN DEVELOPMENT';
  icon: React.ReactNode;
  gradient: string;
}

export const CasinoLobbyView: React.FC<CasinoLobbyViewProps> = ({
  onPlayKeno,
  onOpenRules,
  onOpenCashier,
  showToast,
  currentDrawId,
  timeRemaining,
  balance,
  searchQuery = '',
}) => {
  // Live Ticker Data: Recent Fast Keno Hits & Big Winners
  const [liveWinners] = useState([
    { id: '1', user: 'ID: 890***412', game: 'FAST KENO', hits: '8/10 Hits', amount: '12,450.00 ETB', timeAgo: 'Just now' },
    { id: '2', user: 'ID: 742***881', game: 'FAST KENO', hits: '7/8 Hits', amount: '7,500.00 ETB', timeAgo: '1m ago' },
    { id: '3', user: 'ID: 915***203', game: 'FAST KENO', hits: '10/10 Jackpot', amount: '50,000.00 ETB', timeAgo: '2m ago' },
    { id: '4', user: 'ID: 618***954', game: 'FAST KENO', hits: '9/10 Hits', amount: '15,000.00 ETB', timeAgo: '3m ago' },
    { id: '5', user: 'ID: 334***119', game: 'FAST KENO', hits: '8/8 Hits', amount: '16,000.00 ETB', timeAgo: '4m ago' },
    { id: '6', user: 'ID: 552***730', game: 'FAST KENO', hits: '6/6 Perfect Hit', amount: '22,500.00 ETB', timeAgo: '6m ago' },
  ]);

  // Upcoming Keno Releases
  const upcomingGames: UpcomingGame[] = [
    {
      id: 'fast-keno-turbo',
      title: 'Fast Keno Turbo',
      category: 'Keno Blitz (15s)',
      description: 'Ultra-fast 15-second lightning draw variant with continuous ball drop action.',
      badge: 'SOON',
      icon: <Zap className="w-5 h-5 text-[#00e699]" />,
      gradient: 'from-[#00e699]/15 to-transparent',
    },
    {
      id: 'keno-multi-card',
      title: 'Keno Multi-Card',
      category: 'Multi-Board Keno',
      description: 'Simultaneously bet on up to 4 boards per round with aggregated payouts.',
      badge: 'IN DEVELOPMENT',
      icon: <Layers className="w-5 h-5 text-[#38bdf8]" />,
      gradient: 'from-[#38bdf8]/15 to-transparent',
    },
    {
      id: 'color-keno',
      title: 'Color Keno',
      category: 'Bonus Multiplier Keno',
      description: 'Pick colored ball groups with up to 100x bonus multiplier mystery ball.',
      badge: 'SOON',
      icon: <Palette className="w-5 h-5 text-[#facc15]" />,
      gradient: 'from-[#facc15]/15 to-transparent',
    },
    {
      id: 'speed-keno-live',
      title: 'Speed Keno 20/80',
      category: 'High Multiplier Keno',
      description: 'Instant round cycling with custom payout patterns and enhanced high-tier jackpots.',
      badge: 'SOON',
      icon: <Target className="w-5 h-5 text-[#00e699]" />,
      gradient: 'from-[#00e699]/15 to-transparent',
    },
  ];

  // Filter based on search input
  const query = searchQuery.trim().toLowerCase();
  const filteredUpcoming = upcomingGames.filter(
    (g) =>
      g.title.toLowerCase().includes(query) ||
      g.category.toLowerCase().includes(query) ||
      g.description.toLowerCase().includes(query)
  );

  const showHeroKeno =
    !query ||
    'fast keno'.includes(query) ||
    'atlas v'.includes(query) ||
    'keno'.includes(query);

  const handleUpcomingClick = (gameTitle: string) => {
    haptic.selection();
    showToast(`Launching soon! Fast Keno is live right now.`, 'info');
  };

  return (
    <div className="w-full flex flex-col space-y-3.5 select-none pb-2">
      {/* ============================================================
          SECTION: LIVE TICKER (RECENT KENO HITS)
          ============================================================ */}
      <div className="w-full flex flex-col space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00e699] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00e699]" />
            </span>
            <span className="tracking-wider uppercase text-[11px] font-extrabold text-[#00e699]">
              LIVE WINNERS & RECENT HITS
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono-num">Real-Time Feed</span>
        </div>

        {/* Horizontally swipeable ribbon */}
        <div className="w-full overflow-x-auto no-scrollbar scroll-smooth flex items-center gap-2.5 py-1 px-0.5">
          {liveWinners.map((winner) => (
            <div
              key={winner.id}
              className="min-w-[190px] sm:min-w-[210px] bg-[#0f1913] border border-[#1a2c20] hover:border-[#00e699]/60 rounded-xl p-2.5 shadow-md flex flex-col space-y-1.5 transition-all hover:scale-[1.02] shrink-0"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded tracking-wide border bg-[#00e699]/15 text-[#00e699] border-[#00e699]/40">
                  {winner.game}
                </span>
                <span className="text-[10px] text-slate-400 font-mono-num">{winner.timeAgo}</span>
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-mono-num">{winner.user}</span>
                  <span className="text-[10px] font-bold text-[#00e699]">{winner.hits}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs sm:text-sm font-black text-[#facc15] font-mono-num tabular-nums drop-shadow-[0_0_8px_rgba(250,204,21,0.3)]">
                    +{winner.amount}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ============================================================
          FEATURED TITLE 1: SPOTLIGHT PLAY FAST KENO
          ============================================================ */}
      {showHeroKeno && (
        <div className="w-full flex flex-col space-y-2.5">
          {/* Fast Keno Hero Card */}
          <div
            onClick={() => {
              haptic.impact('heavy');
              onPlayKeno();
            }}
            className="w-full bg-gradient-to-b from-[#0f1913] via-[#09120c] to-[#060907] border-2 border-[#00e699]/60 hover:border-[#00e699] rounded-2xl p-4 sm:p-5 shadow-[0_0_35px_rgba(0,230,153,0.22)] relative overflow-hidden transition-all duration-300 cursor-pointer group"
          >
            {/* Top Badges Row */}
            <div className="flex items-center justify-between mb-3 relative z-10">
              <div className="flex items-center gap-1.5">
                <span className="bg-[#00e699] text-[#060907] font-black text-[10px] tracking-wider uppercase px-2.5 py-0.5 rounded-full shadow-[0_0_10px_rgba(0,230,153,0.5)]">
                  PLAY NOW
                </span>
                <span className="bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Flame className="w-3 h-3 text-rose-500" />
                  <span>HOT</span>
                </span>
              </div>

              {/* Live Status beacon */}
              <div className="flex items-center gap-1.5 bg-[#060907]/80 border border-[#1a2c20] px-2.5 py-0.5 rounded-full text-[10px] font-mono-num text-[#00e699]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00e699] animate-pulse" />
                <span>Next in {timeRemaining.toString().padStart(2, '0')}s</span>
              </div>
            </div>

            {/* Game Title & Description */}
            <div className="relative z-10 flex flex-col space-y-1 mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide drop-shadow-[0_0_12px_rgba(0,230,153,0.4)]">
                  FAST KENO
                </h2>
                <span className="text-xs font-black text-[#00e699] px-2 py-0.5 rounded bg-[#00e699]/10 border border-[#00e699]/30">
                  ATLAS V
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 font-medium">
                Classic 1 to 80 • 60s Fast Draw • Instant Payouts
              </p>
            </div>

            {/* Hot Balls Preview Grid */}
            <div className="relative z-10 flex items-center justify-between bg-[#060907]/90 border border-[#1a2c20] rounded-xl p-2.5 mb-4">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Hot Spots:</span>
                {[7, 23, 45, 64, 78].map((num) => (
                  <span
                    key={num}
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#0f1913] border border-[#00e699]/40 text-[#00e699] font-mono-num font-bold text-xs flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform"
                  >
                    {num}
                  </span>
                ))}
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-medium">Max Multiplier</span>
                <span className="text-xs sm:text-sm font-black text-[#facc15] font-mono-num">10,000x</span>
              </div>
            </div>

            {/* Primary Action Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                haptic.impact('heavy');
                onPlayKeno();
              }}
              className="w-full py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-[#00e699] to-[#059669] hover:from-[#34d399] hover:to-[#10b981] text-[#060907] font-black text-xs sm:text-sm tracking-wider uppercase shadow-[0_0_20px_rgba(0,230,153,0.5)] flex items-center justify-center gap-2 transition-all transform active:scale-98 cursor-pointer relative z-10"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>START PLAYING FAST KENO</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Background Ambient Glow */}
            <div className="absolute -right-8 -bottom-8 w-44 h-44 bg-[#00e699]/10 rounded-full blur-3xl pointer-events-none" />
          </div>

          {/* Clean 2-Column Quick Stats Row */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-[#0f1913] border border-[#1a2c20] rounded-xl p-2.5 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Current Draw</span>
              <span className="text-xs sm:text-sm font-black text-white font-mono-num tabular-nums mt-0.5">
                #{currentDrawId.slice(-6)}
              </span>
              <span className="text-[9px] text-[#00e699] font-medium flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00e699] animate-pulse" />
                Live Round
              </span>
            </div>

            <div className="bg-[#0f1913] border border-[#1a2c20] rounded-xl p-2.5 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Active Players</span>
              <span className="text-xs sm:text-sm font-black text-[#00e699] font-mono-num tabular-nums mt-0.5 flex items-center gap-1">
                <Users className="w-3 h-3 text-[#00e699]" />
                <span>2,842</span>
              </span>
              <span className="text-[9px] text-slate-400 font-medium mt-0.5">In Lobby Now</span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          SECTION: "COMING SOON" CARDS (EXPANDABLE 2-COLUMN GRID)
          ============================================================ */}
      <div className="w-full flex flex-col space-y-2.5 pt-1">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#00e699]" />
            <span>UPCOMING KENO RELEASES</span>
          </h3>
          <span className="text-[10px] text-slate-400 font-bold">In Development</span>
        </div>

        {filteredUpcoming.length === 0 ? (
          <div className="w-full bg-[#0f1913] border border-[#1a2c20] rounded-xl p-6 text-center text-slate-400 text-xs">
            No games found matching "{searchQuery}". Tap "Fast Keno" to play!
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {filteredUpcoming.map((game) => (
              <div
                key={game.id}
                onClick={() => handleUpcomingClick(game.title)}
                className={`bg-[#0f1913] border border-[#1a2c20] hover:border-[#00e699]/50 rounded-xl p-3 shadow-md flex flex-col justify-between space-y-2.5 cursor-pointer transition-all hover:scale-[1.02] bg-gradient-to-b ${game.gradient}`}
              >
                {/* Top Badge & Icon */}
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-[#060907] border border-[#1a2c20] flex items-center justify-center">
                    {game.icon}
                  </div>
                  <span
                    className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                      game.badge === 'IN DEVELOPMENT'
                        ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                        : 'bg-[#facc15]/15 text-[#facc15] border-[#facc15]/30'
                    }`}
                  >
                    {game.badge}
                  </span>
                </div>

                {/* Details */}
                <div className="flex flex-col space-y-0.5">
                  <h4 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                    {game.title}
                  </h4>
                  <span className="text-[9px] text-[#00e699] font-medium">{game.category}</span>
                  <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed pt-1">
                    {game.description}
                  </p>
                </div>

                {/* Notify Me / Preview */}
                <div className="pt-1 border-t border-[#1a2c20] flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-medium">Early Access</span>
                  <span className="text-[#00e699] font-bold">Preview →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Information Footer / Fair Play Guarantee */}
      <div className="w-full bg-[#0f1913]/60 border border-[#1a2c20] rounded-xl p-3 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[#00e699]" />
          <span>Provably Fair RNG • Instant Telebirr Payouts</span>
        </div>
        <button
          onClick={onOpenRules}
          className="text-[#00e699] font-bold hover:underline cursor-pointer"
        >
          Rules & Paytable
        </button>
      </div>
    </div>
  );
};
