import React, { useState } from 'react';
import {
  RefreshCw,
  Eye,
  EyeOff,
  Plus,
  User,
  ShieldCheck,
  Search,
  X,
  ArrowLeft,
  Menu,
} from 'lucide-react';
import { haptic } from '../utils/telegram';

export type AppView = 'FAST_KENO' | 'LOBBY';

interface HeaderNavProps {
  balance: number;
  drawId: string;
  onOpenCashier: () => void;
  onOpenMenu: () => void;
  onOpenProfile: () => void;
  onOpenAdmin?: () => void;
  onRefresh: () => void;
  currentView?: AppView;
  onNavigate?: (view: AppView) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  isAuthorizedAdmin?: boolean;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  balance,
  drawId,
  onOpenCashier,
  onOpenMenu,
  onOpenProfile,
  onOpenAdmin,
  onRefresh,
  currentView = 'LOBBY',
  onNavigate,
  searchQuery = '',
  onSearchChange,
  isAuthorizedAdmin = false,
}) => {
  const [showBalance, setShowBalance] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const handleRefreshClick = () => {
    haptic.selection();
    setIsRefreshing(true);
    onRefresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  return (
    <header className="w-full bg-[#060907] border-b border-[#1a2c20] text-slate-100 sticky top-0 z-30 select-none shadow-md">
      {/* ============================================================
          TOP BAR: Brand Logo + Gold Balance Pill + Profile / Settings
          ============================================================ */}
      <div className="px-3 py-2 flex items-center justify-between border-b border-[#142319] bg-[#09120c]">
        {/* Left: Brand Logo: "FAST KENO" in bold mint green (returns to LOBBY on click) */}
        <div
          onClick={() => onNavigate?.('LOBBY')}
          className="flex items-center gap-1.5 cursor-pointer group"
          title="Return to Lobby"
        >
          <div className="italic font-black text-base sm:text-lg tracking-wider transform -skew-x-6 flex items-center drop-shadow-[0_0_10px_rgba(0,230,153,0.5)]">
            <span className="text-red-500 group-hover:text-red-400 transition-colors">FAST</span>
            <span className="text-white ml-1">KENO</span>
          </div>
        </div>

        {/* Right Section: Gold Balance Pill + Profile Button + Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Gold Balance Pill */}
          <div className="flex items-center gap-1.5 bg-[#0f1913] border border-[#facc15]/40 rounded-full px-2 sm:px-2.5 py-1 shadow-sm">
            <button
              onClick={handleRefreshClick}
              className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Refresh Balance"
            >
              <RefreshCw
                className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-[#00e699]' : ''}`}
              />
            </button>

            <span
              onClick={onOpenCashier}
              className="font-black text-xs sm:text-sm text-[#facc15] font-mono-num tabular-nums cursor-pointer hover:underline"
              title="Tap to Deposit / Withdraw"
            >
              {showBalance ? `${balance.toFixed(2)} ETB` : '•••••• ETB'}
            </span>

            <button
              onClick={() => {
                haptic.selection();
                setShowBalance(!showBalance);
              }}
              className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Toggle Balance Visibility"
            >
              {showBalance ? (
                <Eye className="w-3 h-3" />
              ) : (
                <EyeOff className="w-3 h-3 text-slate-500" />
              )}
            </button>
          </div>

          {/* Quick Deposit Plus Button */}
          <button
            onClick={() => {
              haptic.impact('medium');
              onOpenCashier();
            }}
            className="w-7 h-7 rounded-full bg-[#00e699] hover:bg-[#22c55e] active:scale-95 text-[#060907] flex items-center justify-center font-black shadow-[0_0_8px_rgba(0,230,153,0.4)] transition-all cursor-pointer shrink-0"
            title="Deposit Telebirr"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
          </button>

          {/* Profile / Settings Button with Notification Badge */}
          <button
            onClick={() => {
              haptic.selection();
              onOpenProfile();
            }}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#0f1913] border border-[#1a2c20] hover:border-[#00e699]/60 flex items-center justify-center text-[#00e699] active:scale-95 transition-all cursor-pointer relative"
            title="User Profile & Settings"
          >
            <User className="w-3.5 h-3.5 text-[#00e699]" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#00e699] border-2 border-[#09120c] rounded-full shadow-[0_0_6px_#00e699]" />
          </button>

          {/* Admin Direct Access Button (Rendered ONLY if isAuthorizedAdmin is true) */}
          {isAuthorizedAdmin && (
            <button
              onClick={() => {
                haptic.selection();
                onOpenAdmin?.();
              }}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#0f1913] border border-[#00e699]/50 hover:border-[#00e699] flex items-center justify-center text-[#00e699] active:scale-95 transition-all cursor-pointer shadow-[0_0_8px_rgba(0,230,153,0.25)]"
              title="Admin Console (Authorized Telegram ID)"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#00e699]" />
            </button>
          )}

          {/* Atlas V Menu Button */}
          <button
            onClick={() => {
              haptic.selection();
              onOpenMenu();
            }}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#0f1913] border border-[#1a2c20] hover:border-[#00e699]/60 flex items-center justify-center text-slate-300 hover:text-white active:scale-95 transition-all cursor-pointer"
            title="Atlas V Menu & Settings"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ============================================================
          SUB-HEADER BAR: Section Title ("LOBBY") + Search Bar OR Back Button
          ============================================================ */}
      <div className="px-3 py-1.5 flex items-center justify-between bg-[#0f1913] min-h-[38px]">
        {currentView === 'LOBBY' ? (
          <>
            {/* Left: Section Title: "LOBBY" */}
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00e699] shadow-[0_0_6px_#00e699]" />
              <span className="font-black text-xs tracking-widest uppercase text-slate-100">
                LOBBY
              </span>
            </div>

            {/* Right: Search Bar for Game Filtering */}
            <div className="flex-1 max-w-[200px] sm:max-w-xs ml-3">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  placeholder="Search games..."
                  className="w-full bg-[#060907] border border-[#1a2c20] focus:border-[#00e699] rounded-lg pl-7 pr-7 py-1 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange?.('')}
                    className="absolute right-2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Sub-Header when in Fast Keno: Clean "← LOBBY" back button and Round Badge */
          <div className="w-full flex items-center justify-between">
            <button
              onClick={() => {
                haptic.selection();
                onNavigate?.('LOBBY');
              }}
              className="flex items-center gap-1.5 text-xs font-bold text-[#00e699] hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>LOBBY</span>
            </button>

            <div className="flex items-center gap-1.5 text-[11px] text-slate-300 font-mono-num tabular-nums bg-[#060907] px-2.5 py-0.5 rounded-full border border-[#1a2c20]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#00e699]" />
              <span className="font-bold text-slate-300">
                ROUND <span className="text-white font-mono-num tabular-nums">#{drawId.slice(-6)}</span>
              </span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
