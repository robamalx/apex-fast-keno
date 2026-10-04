import { useState, useEffect, useRef, useCallback } from 'react';
import { Lock } from 'lucide-react';
import { HeaderNav, AppView } from './components/HeaderNav';
import { CasinoLobbyView } from './components/CasinoLobbyView';
import { FastKenoBoardStage } from './components/FastKenoBoardStage';
import { LiveTicketFeed } from './components/LiveTicketFeed';
import { RulesModal } from './components/RulesModal';
import { CashierModal } from './components/CashierModal';
import { VipModal } from './components/VipModal';
import { ProfileModal } from './components/ProfileModal';
import { MenuModal } from './components/MenuModal';
import { AdminPanel } from './components/AdminPanel';
import { ToastNotification, ToastItem } from './components/ToastNotification';
import { haptic } from './utils/telegram';
import { Ticket, DrawResult, CommunityBet, TelegramUser } from './types/keno';
import { checkIsAuthorizedAdmin } from './config/adminConfig';
import { calculateMultiplier } from './utils/paytable';

export default function App() {
  // Navigation View State: Dedicated Fast Keno Mini App (Direct Launch into FAST_KENO)
  const [currentView, setCurrentView] = useState<AppView>('FAST_KENO');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Telegram User & Player Profile
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [playerName, setPlayerName] = useState<string>('Player');

  // Registration & Access Control State (Cloudflare Worker Integration)
  const [isCheckingRegistration, setIsCheckingRegistration] = useState<boolean>(true);
  const [isRegistered, setIsRegistered] = useState<boolean>(false);

  // Telebirr Configuration State
  const [receiverName, setReceiverName] = useState<string>('Robinson Solomon');
  const [phoneNumber, setPhoneNumber] = useState<string>('0963068117');

  // Core Game State: Synchronized Round Loop
  // Real cash balance and promotional bonus balance tracked separately
  const [balance, setBalance] = useState<number>(0);
  const [bonus, setBonus] = useState<number>(0);
  const [currentDrawId, setCurrentDrawId] = useState<string>('890253779');
  const [phase, setPhase] = useState<'betting' | 'drawing' | 'reset'>('betting');
  const [timeRemaining, setTimeRemaining] = useState<number>(45); // 45s betting countdown
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [stake, setStake] = useState<number>(2); // Default stake 2 ETB

  // Ball Reveal Animation State
  const [drawnBalls, setDrawnBalls] = useState<number[]>([]);
  const [lastDrawnBall, setLastDrawnBall] = useState<number | undefined>(undefined);
  const [lastRoundWinnings, setLastRoundWinnings] = useState<number>(0);
  const [isDrawFinished, setIsDrawFinished] = useState<boolean>(false);

  // Active & Historical Tickets & Draws
  const [myTickets, setMyTickets] = useState<Ticket[]>([]); // Current round active tickets (pinned on top)
  const [myBetsHistory, setMyBetsHistory] = useState<Ticket[]>([]);
  const [recentDraws, setRecentDraws] = useState<DrawResult[]>([]);
  const [communityBets, setCommunityBets] = useState<CommunityBet[]>([]);
  const [totalCommunityCount, setTotalCommunityCount] = useState<number>(748);
  const [hotNumbers, setHotNumbers] = useState<number[]>([7, 12, 23, 38, 45, 56, 64, 78]);
  const [coldNumbers, setColdNumbers] = useState<number[]>([3, 19, 28, 31, 49, 52, 60, 73]);

  // Audio / Sound Effects Setting
  const [isAudioOn, setIsAudioOn] = useState<boolean>(true);

  // Non-blocking Toast Notification State
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // UI Modals State
  const [isRulesOpen, setIsRulesOpen] = useState<boolean>(false);
  const [isCashierOpen, setIsCashierOpen] = useState<boolean>(false);
  const [isVipOpen, setIsVipOpen] = useState<boolean>(false);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);

  // Refs for tracking in interval callbacks
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const myTicketsRef = useRef(myTickets);
  myTicketsRef.current = myTickets;
  const selectedNumbersRef = useRef(selectedNumbers);
  selectedNumbersRef.current = selectedNumbers;
  const timeRemainingRef = useRef(timeRemaining);
  timeRemainingRef.current = timeRemaining;
  const currentDrawIdRef = useRef(currentDrawId);
  currentDrawIdRef.current = currentDrawId;
  const drawnBallsRef = useRef(drawnBalls);
  drawnBallsRef.current = drawnBalls;

  // Real persistent Telegram/Browser User ID
  const getRealUserId = useCallback((): string => {
    if (telegramUser?.id) return String(telegramUser.id);
    let stored = localStorage.getItem('atlas_real_user_id');
    if (!stored) {
      stored = 'tg_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('atlas_real_user_id', stored);
    }
    return stored;
  }, [telegramUser]);

  // Compute all unique numbers picked across active tickets of the player
  const allPlayerChosenNumbers = Array.from(
    new Set(myTickets.flatMap((t) => t.chosenNumbers))
  );

  // Authorized Telegram Admin Check (checks window.Telegram?.WebApp?.initDataUnsafe?.user?.id vs ADMIN_IDS)
  const currentTelegramId = typeof window !== 'undefined'
    ? window.Telegram?.WebApp?.initDataUnsafe?.user?.id ?? telegramUser?.id
    : telegramUser?.id;
  const isAuthorizedAdmin = checkIsAuthorizedAdmin(currentTelegramId);

  // Floating Non-intrusive Toast (Auto-fades after 2.5 seconds)
  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = 'toast_' + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  };

  // Fetch balance from /api/balance endpoint
  const fetchNeonBalance = useCallback(async (telegramId: number | string) => {
    try {
      const res = await fetch(`/api/balance?telegram_id=${encodeURIComponent(telegramId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.balance !== undefined) {
          setBalance(Number(data.balance));
        }
        if (data.first_name) {
          setPlayerName(data.first_name);
        }
      }
    } catch {
      // Fallback
    }
  }, []);

  // Fetch initial game state and configuration from real DB
  const fetchGameState = useCallback(async () => {
    try {
      const userId = getRealUserId();
      const name = telegramUser ? `${telegramUser.first_name || ''} ${telegramUser.last_name || ''}`.trim() : playerName;
      const username = telegramUser?.username || '';
      const res = await fetch(`/api/state?userId=${encodeURIComponent(userId)}&name=${encodeURIComponent(name)}&username=${encodeURIComponent(username)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.balance !== undefined) setBalance(data.balance);
        if (data.bonus_balance !== undefined) setBonus(data.bonus_balance);
        if (data.welcomeBonusAwarded) {
          showToast('🎁 Welcome Bonus Credited: +20.00 ETB ready to play!', 'success');
        }
        if (data.currentDrawId) {
          setCurrentDrawId(data.currentDrawId);
        }
        // Protect local tickets: only update if data.myTickets actually contains items
        if (Array.isArray(data.myTickets) && data.myTickets.length > 0) {
          setMyTickets(data.myTickets);
        }
        if (Array.isArray(data.myBetsHistory)) {
          setMyBetsHistory(data.myBetsHistory);
        }
        if (Array.isArray(data.recentDraws) && data.recentDraws.length > 0) {
          setRecentDraws(data.recentDraws);
        }
        if (data.hotNumbers) setHotNumbers(data.hotNumbers);
        if (data.coldNumbers) setColdNumbers(data.coldNumbers);
        if (data.receiverName) setReceiverName(data.receiverName);
        if (data.phoneNumber) setPhoneNumber(data.phoneNumber);
      }
    } catch {
      // Offline fallback
    }
  }, [getRealUserId, telegramUser, playerName]);

  // Check registration and balance via Cloudflare Worker
  const checkUserRegistration = useCallback(async (explicitId?: number | string) => {
    setIsCheckingRegistration(true);

    const tgId =
      explicitId ||
      (typeof window !== 'undefined'
        ? window.Telegram?.WebApp?.initDataUnsafe?.user?.id
        : undefined);

    if (!tgId) {
      setIsRegistered(false);
      setIsCheckingRegistration(false);
      return;
    }

    try {
      const res = await fetch(
        `https://apex-keno-bot.robinsonslmn.workers.dev?telegram_id=${encodeURIComponent(tgId)}`
      );

      if (!res.ok) {
        setIsRegistered(false);
        setIsCheckingRegistration(false);
        return;
      }

      const data = await res.json();

      if (data && data.registered) {
        setIsRegistered(true);
        // Set real cash balance and bonus balance separately
        const realBal = parseFloat(String(data.user?.balance ?? 0)) || 0;
        const bonusBal = parseFloat(String(data.user?.bonus_balance ?? 0)) || 0;
        setBalance(realBal);
        setBonus(bonusBal);

        if (data.user?.first_name) {
          setPlayerName(data.user.first_name);
        }
      } else {
        setIsRegistered(false);
      }
    } catch (err) {
      console.error('Registration verification error:', err);
      setIsRegistered(false);
    } finally {
      setIsCheckingRegistration(false);
    }
  }, []);

  // Telegram Mini App Script Injection & Initialization
  useEffect(() => {
    let script = document.querySelector('script[src="https://telegram.org/js/telegram-web-app.js"]') as HTMLScriptElement | null;
    let didCreateScript = false;

    const initializeTelegram = () => {
      if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
        if (typeof tg.enableVerticalSwipes === 'function') {
          tg.enableVerticalSwipes();
        }

        const user = tg.initDataUnsafe?.user;
        if (user) {
          setTelegramUser(user);
          setPlayerName(user.first_name || 'Player');
          checkUserRegistration(user.id);
        } else {
          checkUserRegistration();
        }
      } else {
        checkUserRegistration();
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.src = 'https://telegram.org/js/telegram-web-app.js';
      script.async = true;
      document.body.appendChild(script);
      didCreateScript = true;
      script.onload = () => {
        setTimeout(initializeTelegram, 50);
      };
    } else {
      setTimeout(initializeTelegram, 50);
    }

    return () => {
      if (didCreateScript && script && document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [checkUserRegistration]);

  // Fetch virtual player community bets (500 - 1,000 player simulation)
  const fetchCommunityBets = useCallback(async () => {
    try {
      const q = new URLSearchParams({
        drawId: currentDrawIdRef.current,
        timeRemaining: String(timeRemainingRef.current),
        phase: phaseRef.current,
        drawnBalls: JSON.stringify(drawnBallsRef.current),
      });
      const res = await fetch(`/api/community-bets?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.bets) {
          setCommunityBets(data.bets);
          if (data.totalCount) setTotalCommunityCount(data.totalCount);
        } else if (Array.isArray(data)) {
          setCommunityBets(data);
          setTotalCommunityCount(data.length);
        }
      }
    } catch {
      // Fallback
    }
  }, []);

  // 1. Isolate fetchGameState: ONLY runs when isRegistered becomes true (loads initial data once)
  useEffect(() => {
    if (isRegistered) {
      fetchGameState();
    }
  }, [isRegistered, fetchGameState]);

  // 2. Isolate the Interval: separate useEffect just for polling community bets every 3.5s
  useEffect(() => {
    if (!isRegistered) return;

    fetchCommunityBets();

    const interval = setInterval(() => {
      fetchCommunityBets();
    }, 3500);

    return () => clearInterval(interval);
  }, [isRegistered, fetchCommunityBets]);

  // Winning function: All winnings go straight to the real cash balance
  const handleWin = useCallback((winAmount: number) => {
    // All winnings go straight to the real cash balance
    setBalance((prev) => prev + winAmount);
  }, []);

  // Sequential 20-Ball Reveal (Step-by-Step, 1 Ball every 1.0 Second)
  const triggerDrawSequence = useCallback(async () => {
    // 1. Stop countdown and lock game in DRAWING state
    setPhase('drawing');
    phaseRef.current = 'drawing';
    setTimeRemaining(0);
    setDrawnBalls([]);
    setLastDrawnBall(undefined);
    setIsDrawFinished(false);
    setLastRoundWinnings(0);

    let fullDrawList: number[] = [];
    let nextDrawIdStr = '';
    let serverNewBalance: number | null = null;

    try {
      const userId = getRealUserId();
      const res = await fetch('/api/draw/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          drawId: currentDrawId,
          tickets: myTicketsRef.current,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.drawnNumbers) && data.drawnNumbers.length === 20) {
          fullDrawList = data.drawnNumbers;
          nextDrawIdStr = data.nextDrawId;
          if (data.recentDraws && Array.isArray(data.recentDraws)) {
            setRecentDraws(data.recentDraws);
          }
          if (data.newBalance !== null && data.newBalance !== undefined) {
            serverNewBalance = data.newBalance;
          }
        }
      }
    } catch {
      // Backend unavailable; fall through to client-side PRNG
    }

    // 2. Client-side PRNG fallback: ensure 20 unique winning numbers (1 to 80)
    if (fullDrawList.length !== 20) {
      const set = new Set<number>();
      while (set.size < 20) {
        set.add(Math.floor(Math.random() * 80) + 1);
      }
      fullDrawList = Array.from(set);
    }

    let currentIndex = 0;
    const playerTicketNumbers = new Set(
      myTicketsRef.current.flatMap((t) => t.chosenNumbers)
    );

    // 3. Visually reveal each ball step-by-step
    const drawInterval = setInterval(() => {
      if (currentIndex < fullDrawList.length) {
        const ball = fullDrawList[currentIndex];
        setDrawnBalls((prev) => [...prev, ball]);
        setLastDrawnBall(ball);

        const isPlayerHit = playerTicketNumbers.has(ball) || selectedNumbersRef.current.includes(ball);
        if (isPlayerHit) {
          haptic.hitReveal();
        } else {
          haptic.ballReveal();
        }

        currentIndex++;
      } else {
        clearInterval(drawInterval);

        // 4. All 20 balls revealed: check player's tickets against drawn numbers
        setIsDrawFinished(true);
        const resolvedNextId = nextDrawIdStr || String(Number(currentDrawId) + 1);
        setCurrentDrawId(resolvedNextId);

        const currentActiveTickets = myTicketsRef.current;
        let totalWinnings = 0;

        const resolvedTickets: Ticket[] = currentActiveTickets.map((t) => {
          const matchedNumbers = t.chosenNumbers.filter((n) => fullDrawList.includes(n));
          const matchedCount = matchedNumbers.length;
          const multiplier = calculateMultiplier(t.chosenNumbers.length, matchedCount);
          const payout = Math.round(t.stake * multiplier * 100) / 100;
          if (payout > 0) {
            totalWinnings += payout;
          }
          return {
            ...t,
            status: payout > 0 ? 'win' : 'loss',
            matchedCount,
            multiplier,
            payout,
            drawnNumbers: fullDrawList,
          };
        });

        if (resolvedTickets.length > 0) {
          setMyTickets(resolvedTickets);
        }

        setLastRoundWinnings(totalWinnings);

        // Update recent draws list
        const newDrawEntry: DrawResult = {
          drawId: currentDrawId,
          timestamp: new Date().toTimeString().split(' ')[0],
          drawnNumbers: fullDrawList,
          totalBets: Math.floor(650 + Math.random() * 250),
          winnersCount: Math.floor(80 + Math.random() * 60),
        };
        setRecentDraws((prev) => [newDrawEntry, ...prev.slice(0, 19)]);

        // 5. Update player's balance if they won: All winnings go straight to the real cash balance
        if (totalWinnings > 0) {
          handleWin(totalWinnings);
          haptic.notification('success');
          showToast(`🎉 Round Won! +${totalWinnings.toFixed(2)} ETB Credited`, 'success');
        } else if (currentActiveTickets.length > 0) {
          haptic.notification('error');
        }

        // 6. Wait a few seconds (4s) for player to see results, then clear board and restart countdown
        setTimeout(() => {
          setIsDrawFinished(false);
          setDrawnBalls([]);
          setLastDrawnBall(undefined);
          setLastRoundWinnings(0);
          setSelectedNumbers([]);
          setMyTickets([]);
          setPhase('betting');
          phaseRef.current = 'betting';
          setTimeRemaining(45);
        }, 4000);
      }
    }, 1000);
  }, [currentDrawId, getRealUserId, handleWin]);

  // Synchronized Round Countdown Loop (ticks down while in betting phase)
  useEffect(() => {
    if (phase !== 'betting') return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase]);

  // When timer hits 0 during betting, trigger the draw sequence immediately
  useEffect(() => {
    if (phase === 'betting' && timeRemaining === 0) {
      triggerDrawSequence();
    }
  }, [timeRemaining, phase, triggerDrawSequence]);

  // Toggle Number Selection on Keno Board
  const handleToggleNumber = (num: number) => {
    if (phase !== 'betting') return;
    haptic.selection();

    setSelectedNumbers((prev) => {
      if (prev.includes(num)) {
        return prev.filter((n) => n !== num);
      } else {
        if (prev.length >= 10) {
          haptic.notification('warning');
          return prev;
        }
        return [...prev, num].sort((a, b) => a - b);
      }
    });
  };

  // Clear Selection
  const handleClearSelection = () => {
    haptic.selection();
    setSelectedNumbers([]);
  };

  // Quick Pick
  const handleQuickPick = (count: number) => {
    haptic.selection();
    const picked: number[] = [];
    while (picked.length < count) {
      const rand = Math.floor(Math.random() * 80) + 1;
      if (!picked.includes(rand)) picked.push(rand);
    }
    picked.sort((a, b) => a - b);
    setSelectedNumbers(picked);
  };

  // Multi-Ticket Placement with Selection Auto-Clear
  const handlePlaceBet = async () => {
    if (phase !== 'betting') return;

    if (selectedNumbers.length === 0) {
      haptic.notification('warning');
      showToast('Select 1 to 10 numbers first!', 'error');
      return;
    }

    if (myTickets.length >= 20) {
      haptic.notification('warning');
      showToast('Max 20 tickets reached for this draw!', 'error');
      return;
    }

    const betAmount = stake;
    const totalFunds = balance + bonus;

    if (betAmount > totalFunds) {
      alert('Insufficient balance');
      return;
    }

    // Deduct from bonus first, then real balance
    if (betAmount <= bonus) {
      setBonus((prev) => prev - betAmount);
    } else {
      const remainingBet = betAmount - bonus;
      setBonus(0);
      setBalance((prev) => prev - remainingBet);
    }

    haptic.impact('heavy');

    const ticketId = 't_' + Math.random().toString(36).substring(2, 9);
    const timeStr = new Date().toTimeString().split(' ')[0];
    const newLocalTicket: Ticket = {
      id: ticketId,
      drawId: currentDrawId,
      userId: getRealUserId(),
      userName: playerName,
      userMasked: `${playerName.slice(0, 3)}***`,
      chosenNumbers: [...selectedNumbers].sort((a, b) => a - b),
      stake: betAmount,
      timestamp: timeStr,
      status: 'waiting',
    };

    setMyTickets((prev) => [newLocalTicket, ...prev]);
    setSelectedNumbers([]);
    haptic.notification('success');
    showToast(`Ticket Placed (${betAmount.toFixed(2)} ETB)`, 'info');

    try {
      const userId = getRealUserId();
      const res = await fetch('/api/bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          chosenNumbers: newLocalTicket.chosenNumbers,
          stake: betAmount,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.realBalance !== undefined) setBalance(data.realBalance);
        if (data.bonusBalance !== undefined) setBonus(data.bonusBalance);
      }
    } catch {
      // offline / backend sync fallback
    }
  };

  const handleDepositVerified = (_creditedAmount: number, newBalance: number) => {
    setBalance(newBalance);
  };

  const handleWithdrawSubmitted = (newBalance: number) => {
    setBalance(newBalance);
  };

  const handleClaimDailyBonus = async () => {
    const userId = getRealUserId();
    try {
      const res = await fetch('/api/wallet/claim-bonus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          amount: 50,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setBalance(data.newBalance);
      } else {
        setBalance((prev) => prev + 50);
      }
    } catch {
      setBalance((prev) => prev + 50);
    }
    showToast('+50.00 ETB Daily VIP Bonus Claimed!', 'success');
    setIsVipOpen(false);
  };

  // 1. Loading Screen: Displayed while verifying Telegram registration
  if (isCheckingRegistration) {
    return (
      <div className="min-h-screen bg-[#060907] flex flex-col items-center justify-center p-4 text-white select-none">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#0b1410] border border-[#1f3127] flex items-center justify-center shadow-2xl relative">
            <div className="w-8 h-8 rounded-full border-2 border-[#00e699] border-t-transparent animate-spin" />
          </div>
          <div className="text-center space-y-1">
            <h2 className="text-sm sm:text-base font-extrabold tracking-wider text-white">APEX FAST KENO</h2>
            <p className="text-xs text-slate-400">Verifying account credentials...</p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Lock Screen: Displayed if user is not registered or has no Telegram ID
  if (!isRegistered) {
    const handleCloseToBot = () => {
      haptic.selection();
      try {
        if (typeof window !== 'undefined' && window.Telegram?.WebApp?.close) {
          window.Telegram.WebApp.close();
        }
      } catch (err) {
        console.warn('Telegram WebApp close error:', err);
      }
    };

    return (
      <div className="min-h-screen bg-[#060907] flex flex-col items-center justify-center p-4 text-white select-none">
        <div className="w-full max-w-sm bg-[#0b1410] border border-[#1f3127] rounded-3xl p-6 shadow-2xl text-center space-y-5 animate-fadeIn">
          {/* Lock Icon */}
          <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
            <Lock className="w-8 h-8 text-amber-400" />
          </div>

          {/* Heading with required warning copy */}
          <div className="space-y-2">
            <h1 className="text-lg sm:text-xl font-black text-white tracking-wide leading-snug">
              ⚠️ Not Registered: You must register in the chat to play.
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              Please return to the bot chat to register your account before playing.
            </p>
          </div>

          {/* Action button to return to bot */}
          <button
            type="button"
            onClick={handleCloseToBot}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-black font-black text-sm tracking-wide transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] active:scale-95 cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Close to Return to Bot</span>
          </button>
        </div>
      </div>
    );
  }

  // 3. Main Game UI: Rendered normally when registered === true
  return (
    <div className="w-full min-h-screen flex flex-col bg-[#060907] overflow-y-auto overflow-x-hidden pb-8">
      {/* Floating Non-Intrusive Toast Notification Overlay */}
      <ToastNotification toasts={toasts} />

      {/* Top Mini Header Displaying Player Name & Balance */}
      <div className="w-full bg-[#030604] border-b border-[#142319] px-3 py-1 flex items-center justify-between text-[11px] text-slate-300 font-mono select-none">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00e699] animate-pulse" />
          <span className="text-slate-400">Player:</span>
          <span className="font-bold text-white truncate max-w-[130px] sm:max-w-[200px]">
            {playerName}
          </span>
          {telegramUser?.username && (
            <span className="text-slate-500 hidden sm:inline">(@{telegramUser.username})</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">Balance:</span>
          <span className="font-black text-[#facc15] font-mono tabular-nums">{(balance + bonus).toFixed(2)} ETB</span>
          {bonus > 0 && (
            <span className="text-[10px] text-emerald-400 font-bold hidden sm:inline">
              ({balance.toFixed(2)} + {bonus.toFixed(2)} Bonus)
            </span>
          )}
        </div>
      </div>

      {/* Main Top Header Navigation Row + Sub-Header */}
      <div className="shrink-0 z-30 sticky top-0 bg-[#060907]">
        <HeaderNav
          balance={balance + bonus}
          drawId={currentDrawId}
          onOpenCashier={() => setIsCashierOpen(true)}
          onOpenMenu={() => setIsMenuOpen(true)}
          onOpenProfile={() => setIsProfileOpen(true)}
          onOpenAdmin={() => setIsAdminOpen(true)}
          onRefresh={fetchGameState}
          currentView={currentView}
          onNavigate={(view) => {
            setCurrentView(view);
          }}
          searchQuery={searchQuery}
          onSearchChange={(q) => setSearchQuery(q)}
          isAuthorizedAdmin={isAuthorizedAdmin}
        />
      </div>

      {/* Main Content Area based on currentView */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-2 sm:px-3 pt-2 flex flex-col space-y-3">
        {currentView === 'LOBBY' ? (
          /* ============================================================
             VIEW 1: CASINO & FAST KENO LOBBY
             - Live Ticker: Recent Keno Hits
             - Spotlight: Fast Keno (Classic 1-80)
             - Upcoming Keno Releases
             ============================================================ */
          <CasinoLobbyView
            onPlayKeno={() => {
              setCurrentView('FAST_KENO');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenRules={() => setIsRulesOpen(true)}
            onOpenCashier={() => setIsCashierOpen(true)}
            showToast={showToast}
            currentDrawId={currentDrawId}
            timeRemaining={timeRemaining}
            balance={balance + bonus}
            searchQuery={searchQuery}
          />
        ) : (
          /* ============================================================
             VIEW 2: FAST KENO PLAY CONSOLE (DEFAULT DIRECT LAUNCH)
             - Permanent HUD / Chute Tray
             - 8x10 Number Board & Bet Controls
             - Active Tickets Feed + 500-1,000 Virtual Community Simulation
             ============================================================ */
          <>
            <div className="w-full">
              <FastKenoBoardStage
                phase={phase}
                selectedNumbers={selectedNumbers}
                onToggleNumber={handleToggleNumber}
                onClearSelection={handleClearSelection}
                onQuickPick={handleQuickPick}
                stake={stake}
                setStake={setStake}
                onPlaceBet={handlePlaceBet}
                timeRemaining={timeRemaining}
                ticketsPlacedCount={myTickets.length}
                onOpenRules={() => setIsRulesOpen(true)}
                balance={balance + bonus}
                hotNumbers={hotNumbers}
                coldNumbers={coldNumbers}
                drawnBalls={drawnBalls}
                lastDrawnBall={lastDrawnBall}
                allPlayerChosenNumbers={allPlayerChosenNumbers}
                totalWinnings={lastRoundWinnings}
                isDrawFinished={isDrawFinished}
                hasActiveTickets={myTickets.length > 0}
              />
            </div>

            <div className="w-full">
              <LiveTicketFeed
                myTickets={myTickets}
                communityBets={communityBets}
                recentDraws={recentDraws}
                drawnBalls={drawnBalls}
                isDrawing={phase === 'drawing'}
                isResetPhase={phase === 'reset'}
                isDrawFinished={isDrawFinished}
                currentDrawId={currentDrawId}
                onOpenVipModal={() => setIsVipOpen(true)}
                hotNumbers={hotNumbers}
                coldNumbers={coldNumbers}
                totalCommunityCount={totalCommunityCount}
              />
            </div>
          </>
        )}
      </main>

      {/* Modals & Menus */}
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
      <CashierModal
        isOpen={isCashierOpen}
        onClose={() => setIsCashierOpen(false)}
        balance={balance}
        receiverName={receiverName}
        phoneNumber={phoneNumber}
        userId={getRealUserId()}
        onDepositVerified={handleDepositVerified}
        onWithdrawSubmitted={handleWithdrawSubmitted}
        showToast={showToast}
      />
      <VipModal
        isOpen={isVipOpen}
        onClose={() => setIsVipOpen(false)}
        onClaimDailyBonus={handleClaimDailyBonus}
      />
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        telegramUser={telegramUser}
        balance={balance}
        onOpenCashier={() => {
          setIsProfileOpen(false);
          setIsCashierOpen(true);
        }}
        ticketsCount={myTickets.length}
      />
      <MenuModal
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onOpenRules={() => {
          setIsMenuOpen(false);
          setIsRulesOpen(true);
        }}
        onOpenCashier={() => {
          setIsMenuOpen(false);
          setIsCashierOpen(true);
        }}
        onOpenAdmin={() => {
          setIsMenuOpen(false);
          setIsAdminOpen(true);
        }}
        isAudioOn={isAudioOn}
        onToggleAudio={() => setIsAudioOn(!isAudioOn)}
        isAuthorizedAdmin={isAuthorizedAdmin}
      />
      <AdminPanel
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        showToast={showToast}
      />
    </div>
  );
}
