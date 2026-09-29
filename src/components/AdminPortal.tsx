import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  KeyRound,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  TrendingUp,
  CreditCard,
  UserCheck,
  UserX,
  FileText,
  LogOut,
  ExternalLink,
  ChevronRight,
  BadgeCheck,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { haptic } from '../utils/telegram';

interface AdminPortalProps {
  onBackToApp: () => void;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

interface SystemMetrics {
  totalSettledDeposits: number;
  totalSettledWithdrawals: number;
  netHouseProfitGGR: number;
  activeVirtualPlayerVolume: number;
  totalUsers: number;
  totalBalances: number;
  pendingDepositsCount: number;
  pendingWithdrawalsCount: number;
  processedReceiptsCount: number;
}

interface PendingDeposit {
  id: string;
  userId: string;
  userName: string;
  rawText: string;
  receiptNo: string;
  amount: number;
  senderName?: string;
  senderPhone?: string;
  receiptTimestamp?: string;
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  submittedAt: string;
  isAntiReplayFlagged?: boolean;
}

interface PendingWithdrawal {
  id: string;
  userId: string;
  userName: string;
  phone: string;
  accountName: string;
  amount: number;
  status: 'pending' | 'settled' | 'rejected';
  submittedAt: string;
}

interface UserProfileMetrics {
  userId: string;
  name: string;
  username: string;
  phone: string;
  activeBalance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  totalRoundsPlayed: number;
  totalBetVolume: number;
  totalWon: number;
  status: 'active' | 'suspended';
  createdAt: string;
  lastActive: string;
}

interface AuditLogItem {
  id: string;
  admin: string;
  action: string;
  targetUserId: string;
  amount?: number;
  receiptNo?: string;
  reason?: string;
  timestamp: string;
}

// Inactivity timeout: 30 minutes in milliseconds
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
const SESSION_STORAGE_KEY = 'atlas_admin_portal_session_token';

// Simple obfuscation for sessionStorage token
function encodeSessionToken(key: string): string {
  try {
    return btoa(`atlas_v_${key}_${Date.now()}`);
  } catch {
    return key;
  }
}

function decodeSessionToken(obfuscated: string): string {
  try {
    const raw = atob(obfuscated);
    const parts = raw.split('_');
    if (parts[0] === 'atlas' && parts[1] === 'v' && parts[2]) {
      return parts[2];
    }
    return '';
  } catch {
    return '';
  }
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ onBackToApp, showToast }) => {
  // Authentication & Session
  const [adminKey, setAdminKey] = useState<string>(() => {
    const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
    return saved ? decodeSessionToken(saved) : '';
  });
  const [pinInput, setPinInput] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);

  // Active Tab: 'deposits' | 'withdrawals' | 'users' | 'logs'
  const [activeTab, setActiveTab] = useState<'deposits' | 'withdrawals' | 'users' | 'logs'>('deposits');

  // Dashboard Data
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [currentDrawId, setCurrentDrawId] = useState<string>('');
  const [receiverName, setReceiverName] = useState<string>('');
  const [agentPhone, setAgentPhone] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Queues
  const [pendingDeposits, setPendingDeposits] = useState<PendingDeposit[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<PendingWithdrawal[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  // Action Loading states
  const [actionInProgressId, setActionInProgressId] = useState<string>('');

  // User Management
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [userSearchResults, setUserSearchResults] = useState<UserProfileMetrics[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfileMetrics | null>(null);
  const [isSearchingUsers, setIsSearchingUsers] = useState<boolean>(false);

  // Balance Override Controls
  const [adjustAmount, setAdjustAmount] = useState<string>('');
  const [adjustReason, setAdjustReason] = useState<string>('Manual Admin Adjustment');
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'credit' | 'debit';
    userId: string;
    userName: string;
    amount: number;
    reason: string;
  } | null>(null);

  // Reject Modal for deposits/withdrawals
  const [rejectDialog, setRejectDialog] = useState<{
    isOpen: boolean;
    targetType: 'deposit' | 'withdrawal';
    targetId: string;
    amount: number;
    userId: string;
  } | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState<string>('');

  // Auto-logout inactivity tracking ref
  const lastActivityRef = useRef<number>(Date.now());

  // --------------------------------------------------------------------------
  // Inactivity Auto-Logout Tracker (30 Minutes)
  // --------------------------------------------------------------------------
  const handleUserActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  const handleLogout = useCallback((reason?: string) => {
    setAdminKey('');
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    showToast(reason || 'Admin session signed out', 'info');
  }, [showToast]);

  useEffect(() => {
    if (!adminKey) return;

    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'];
    events.forEach((evt) => window.addEventListener(evt, handleUserActivity, { passive: true }));

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        handleLogout('Session timed out after 30 minutes of inactivity');
      }
    }, 15000); // Check every 15s

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleUserActivity));
      clearInterval(interval);
    };
  }, [adminKey, handleUserActivity, handleLogout]);

  // --------------------------------------------------------------------------
  // Authenticated Data Fetching Helper
  // --------------------------------------------------------------------------
  const adminFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      if (!adminKey) throw new Error('Not authenticated');

      const headers = new Headers(options.headers || {});
      headers.set('x-admin-key', adminKey);
      headers.set('Content-Type', 'application/json');

      const res = await fetch(url, { ...options, headers });
      if (res.status === 401) {
        handleLogout('Session expired. Please re-enter Admin PIN.');
        throw new Error('Unauthorized');
      }
      return res;
    },
    [adminKey, handleLogout]
  );

  // --------------------------------------------------------------------------
  // Load All Admin Data
  // --------------------------------------------------------------------------
  const loadDashboardData = useCallback(async () => {
    if (!adminKey) return;
    setIsLoading(true);
    try {
      const [overviewRes, depositsRes, withdrawalsRes, logsRes] = await Promise.all([
        adminFetch('/api/admin/overview'),
        adminFetch('/api/admin/pending-deposits'),
        adminFetch('/api/admin/pending-withdrawals'),
        adminFetch('/api/admin/audit-logs'),
      ]);

      if (overviewRes.ok) {
        const data = await overviewRes.json();
        setMetrics(data.metrics);
        setCurrentDrawId(data.currentDrawId);
        setReceiverName(data.receiverName);
        setAgentPhone(data.agentPhone);
      }

      if (depositsRes.ok) {
        const deps = await depositsRes.json();
        setPendingDeposits(deps);
      }

      if (withdrawalsRes.ok) {
        const withs = await withdrawalsRes.json();
        setPendingWithdrawals(withs);
      }

      if (logsRes.ok) {
        const lgs = await logsRes.json();
        setAuditLogs(lgs);
      }
    } catch (err: any) {
      if (err.message !== 'Unauthorized') {
        console.error('Failed to load admin data:', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [adminKey, adminFetch]);

  useEffect(() => {
    if (adminKey) {
      loadDashboardData();
    }
  }, [adminKey, loadDashboardData]);

  // --------------------------------------------------------------------------
  // Authentication Submit
  // --------------------------------------------------------------------------
  const handlePinLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pinInput.trim()) {
      setAuthError('Please enter the Admin Secret PIN / Key.');
      return;
    }

    setIsAuthenticating(true);
    setAuthError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const token = data.token;
        setAdminKey(token);
        sessionStorage.setItem(SESSION_STORAGE_KEY, encodeSessionToken(token));
        setPinInput('');
        haptic.notification('success');
        showToast('Admin Portal session established', 'success');
      } else {
        haptic.notification('error');
        setAuthError(data.error || 'Access denied: Incorrect Admin PIN.');
      }
    } catch {
      setAuthError('Network error connecting to Admin service.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // --------------------------------------------------------------------------
  // Deposit Actions: Auto-Verify, Manual Approve, Reject
  // --------------------------------------------------------------------------
  const handleAutoVerifyDeposit = async (depositId: string, receiptNo: string) => {
    setActionInProgressId(depositId);
    haptic.impact('medium');

    try {
      const res = await adminFetch('/api/admin/auto-verify-deposit', {
        method: 'POST',
        body: JSON.stringify({ depositId, adminName: 'Admin Auto-Verify' }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        haptic.notification('success');
        showToast(`Auto-verified #${receiptNo}! Credited ${data.deposit?.amount.toFixed(2)} ETB`, 'success');
        loadDashboardData();
      } else {
        haptic.notification('error');
        showToast(data.error || 'Auto-verify failed.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Auto-verification failed.', 'error');
    } finally {
      setActionInProgressId('');
    }
  };

  const handleManualApproveDeposit = async (depositId: string, amount: number) => {
    setActionInProgressId(depositId);
    haptic.impact('medium');

    try {
      const res = await adminFetch('/api/admin/approve-deposit', {
        method: 'POST',
        body: JSON.stringify({ depositId, adminName: 'Admin' }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        haptic.notification('success');
        showToast(`Approved! Credited ${amount.toFixed(2)} ETB to user #${data.deposit?.userId}`, 'success');
        loadDashboardData();
      } else {
        haptic.notification('error');
        showToast(data.error || 'Failed to approve deposit.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Approval error', 'error');
    } finally {
      setActionInProgressId('');
    }
  };

  const submitRejectDeposit = async () => {
    if (!rejectDialog) return;
    const { targetId } = rejectDialog;
    setActionInProgressId(targetId);

    try {
      const res = await adminFetch('/api/admin/reject-deposit', {
        method: 'POST',
        body: JSON.stringify({
          depositId: targetId,
          reason: rejectReasonInput.trim() || 'Declined by Admin',
          adminName: 'Admin',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        haptic.selection();
        showToast(`Deposit #${targetId} declined.`, 'info');
        setRejectDialog(null);
        setRejectReasonInput('');
        loadDashboardData();
      } else {
        showToast(data.error || 'Failed to reject deposit.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Rejection error', 'error');
    } finally {
      setActionInProgressId('');
    }
  };

  // --------------------------------------------------------------------------
  // Withdrawal Actions: Settle / Pay, Reject & Refund
  // --------------------------------------------------------------------------
  const handleSettleWithdrawal = async (withdrawalId: string, amount: number) => {
    setActionInProgressId(withdrawalId);
    haptic.impact('medium');

    try {
      const res = await adminFetch('/api/admin/settle-withdrawal', {
        method: 'POST',
        body: JSON.stringify({ withdrawalId, adminName: 'Admin' }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        haptic.notification('success');
        showToast(`Payout #${withdrawalId} (${amount.toFixed(2)} ETB) marked as Settled / Paid.`, 'success');
        loadDashboardData();
      } else {
        haptic.notification('error');
        showToast(data.error || 'Failed to settle payout.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Settlement error', 'error');
    } finally {
      setActionInProgressId('');
    }
  };

  const submitRejectWithdrawal = async () => {
    if (!rejectDialog) return;
    const { targetId } = rejectDialog;
    setActionInProgressId(targetId);

    try {
      const res = await adminFetch('/api/admin/reject-withdrawal', {
        method: 'POST',
        body: JSON.stringify({
          withdrawalId: targetId,
          reason: rejectReasonInput.trim() || 'Payout request declined by Admin',
          adminName: 'Admin',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        haptic.notification('success');
        showToast(`Payout rejected. Refunded ${data.withdrawal?.amount.toFixed(2)} ETB to player balance.`, 'success');
        setRejectDialog(null);
        setRejectReasonInput('');
        loadDashboardData();
      } else {
        showToast(data.error || 'Failed to reject withdrawal.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Rejection error', 'error');
    } finally {
      setActionInProgressId('');
    }
  };

  // --------------------------------------------------------------------------
  // User Search & Balance Overrides
  // --------------------------------------------------------------------------
  const handleSearchUsers = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSearchingUsers(true);
    try {
      const res = await adminFetch(`/api/admin/users?q=${encodeURIComponent(searchQuery.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setUserSearchResults(data);
        if (data.length > 0) {
          setSelectedUser(data[0]);
        } else {
          setSelectedUser(null);
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Error searching users', 'error');
    } finally {
      setIsSearchingUsers(false);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: 'active' | 'suspended') => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    haptic.impact('heavy');

    try {
      const res = await adminFetch('/api/admin/toggle-user-status', {
        method: 'POST',
        body: JSON.stringify({ userId, status: nextStatus, adminName: 'Admin' }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Account status set to ${nextStatus.toUpperCase()}`, 'success');
        // Update local state
        if (selectedUser && selectedUser.userId === userId) {
          setSelectedUser({ ...selectedUser, status: nextStatus });
        }
        setUserSearchResults((prev) =>
          prev.map((u) => (u.userId === userId ? { ...u, status: nextStatus } : u))
        );
        loadDashboardData();
      } else {
        showToast(data.error || 'Failed to update status', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating status', 'error');
    }
  };

  const confirmBalanceAdjustment = async () => {
    if (!confirmDialog) return;
    const { userId, amount, type, reason } = confirmDialog;
    setActionInProgressId(userId);

    try {
      const res = await adminFetch('/api/admin/adjust-balance', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          amount,
          isCredit: type === 'credit',
          reason,
          adminName: 'Admin',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        haptic.notification('success');
        showToast(
          `Successfully ${type === 'credit' ? 'credited' : 'debited'} ${amount.toFixed(2)} ETB! New balance: ${data.newBalance.toFixed(2)} ETB`,
          'success'
        );
        setConfirmDialog(null);
        setAdjustAmount('');
        // Refresh selected user
        if (selectedUser && selectedUser.userId === userId) {
          setSelectedUser({ ...selectedUser, activeBalance: data.newBalance });
        }
        loadDashboardData();
      } else {
        showToast(data.error || 'Balance adjustment failed', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Adjustment error', 'error');
    } finally {
      setActionInProgressId('');
    }
  };

  // ==========================================================================
  // VIEW: 1. ADMIN PIN LOCK SCREEN
  // ==========================================================================
  if (!adminKey) {
    return (
      <div className="w-full min-h-screen bg-[#040705] flex items-center justify-center p-4 text-slate-100 select-none">
        <div className="w-full max-w-md bg-[#0a120d] border border-[#1b3022] rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col items-center">
          {/* Top Decorative Glow */}
          <div className="absolute -top-16 -right-16 w-36 h-36 bg-[#00e699]/15 rounded-full blur-3xl pointer-events-none" />

          {/* Security Badge Icon */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#00e699]/20 to-[#00e699]/5 border border-[#00e699]/40 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(0,230,153,0.25)]">
            <Lock className="w-8 h-8 text-[#00e699]" />
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide text-center uppercase">
            ADMIN SECURITY PORTAL
          </h2>
          <p className="text-xs text-slate-400 text-center mt-1 mb-6 max-w-xs leading-relaxed">
            Fast Keno Financial & Game Round Operations. Enter the authorized Admin PIN to access the dashboard.
          </p>

          {/* PIN Screen Form */}
          <form onSubmit={handlePinLogin} className="w-full space-y-4">
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                Admin Secret Key / PIN
              </label>
              <div className="relative flex items-center">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                <input
                  type={showPin ? 'text' : 'password'}
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    if (authError) setAuthError('');
                  }}
                  placeholder="Enter ADMIN_SECRET_KEY..."
                  autoFocus
                  className="w-full bg-[#050906] border border-[#1b3022] focus:border-[#00e699] rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-slate-600 focus:outline-none transition-colors tracking-widest font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 text-slate-400 hover:text-white cursor-pointer"
                  title="Toggle PIN visibility"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {authError && (
                <div className="flex items-center gap-1.5 text-xs text-rose-400 font-semibold mt-2 animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isAuthenticating}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#00e699] to-[#059669] hover:from-[#34d399] hover:to-[#10b981] active:scale-98 text-[#040705] font-black text-xs sm:text-sm tracking-wider uppercase shadow-[0_0_20px_rgba(0,230,153,0.4)] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <Unlock className="w-4 h-4" />
              <span>{isAuthenticating ? 'VERIFYING CREDENTIALS...' : 'ACCESS ADMIN PORTAL'}</span>
            </button>
          </form>

          {/* Quick Return to Player App */}
          <button
            onClick={onBackToApp}
            className="mt-6 text-xs text-slate-500 hover:text-slate-300 font-bold transition-colors cursor-pointer"
          >
            ← Return to Fast Keno Game
          </button>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // VIEW: 2. MAIN ADMIN PORTAL DASHBOARD
  // ==========================================================================
  return (
    <div className="w-full min-h-screen bg-[#050906] text-slate-100 flex flex-col select-none pb-12">
      {/* ============================================================
          TOP APP HEADER
          ============================================================ */}
      <header className="w-full bg-[#08110b] border-b border-[#14261b] sticky top-0 z-40 px-3 sm:px-6 py-2.5 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#00e699]/15 border border-[#00e699]/40 flex items-center justify-center shadow-[0_0_10px_rgba(0,230,153,0.3)]">
              <ShieldCheck className="w-4 h-4 text-[#00e699]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black text-white tracking-wider uppercase">
                  FAST KENO ADMIN PORTAL
                </h1>
                <span className="text-[10px] font-mono-num font-bold bg-[#00e699]/20 text-[#00e699] border border-[#00e699]/40 px-2 py-0.2 rounded-full">
                  SECURE v2.4
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono-num">
                Agent: <span className="text-white font-bold">{receiverName || 'Robinson Solomon'}</span> ({agentPhone || '0963068117'})
              </p>
            </div>
          </div>
        </div>

        {/* Right Header Actions: Refresh + Return + Logout */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              haptic.selection();
              loadDashboardData();
            }}
            disabled={isLoading}
            className="p-2 rounded-xl bg-[#0e1c12] border border-[#1b3022] hover:border-[#00e699]/50 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            title="Refresh All Operations"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#00e699]' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={onBackToApp}
            className="p-2 px-3 rounded-xl bg-[#0e1c12] border border-[#1b3022] hover:border-slate-500 text-slate-300 hover:text-white transition-all cursor-pointer text-xs font-bold"
            title="Return to Game View"
          >
            Game View
          </button>

          <button
            onClick={() => handleLogout()}
            className="p-2 rounded-xl bg-rose-950/40 border border-rose-800/50 hover:bg-rose-900/60 text-rose-300 hover:text-white transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
            title="Sign Out (Auto-logouts after 30m of inactivity)"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-6xl mx-auto px-3 sm:px-6 pt-4 space-y-4">
        {/* ============================================================
            METRICS DASHBOARD (TOP STATS RIBBON)
            ============================================================ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3.5">
          {/* Card 1: Total Settled Deposits */}
          <div className="bg-[#09130d] border border-[#1b3022] rounded-2xl p-3 sm:p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
              <span className="uppercase tracking-wider text-[10px]">Settled Deposits</span>
              <ArrowDownLeft className="w-4 h-4 text-[#00e699]" />
            </div>
            <div className="mt-2">
              <span className="text-lg sm:text-2xl font-black text-[#00e699] font-mono-num tabular-nums">
                +{metrics ? metrics.totalSettledDeposits.toFixed(2) : '0.00'} ETB
              </span>
              <span className="block text-[10px] text-slate-400 mt-0.5">
                {metrics?.processedReceiptsCount ?? 0} verified receipts
              </span>
            </div>
          </div>

          {/* Card 2: Total Settled Withdrawals */}
          <div className="bg-[#09130d] border border-[#1b3022] rounded-2xl p-3 sm:p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
              <span className="uppercase tracking-wider text-[10px]">Settled Payouts</span>
              <ArrowUpRight className="w-4 h-4 text-[#facc15]" />
            </div>
            <div className="mt-2">
              <span className="text-lg sm:text-2xl font-black text-[#facc15] font-mono-num tabular-nums">
                -{metrics ? metrics.totalSettledWithdrawals.toFixed(2) : '0.00'} ETB
              </span>
              <span className="block text-[10px] text-slate-400 mt-0.5">
                Paid out via Telebirr
              </span>
            </div>
          </div>

          {/* Card 3: Net House Profit / GGR */}
          <div className="bg-[#09130d] border border-[#1b3022] rounded-2xl p-3 sm:p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
              <span className="uppercase tracking-wider text-[10px]">Net House GGR</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2">
              <span className={`text-lg sm:text-2xl font-black font-mono-num tabular-nums ${
                (metrics?.netHouseProfitGGR ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {(metrics?.netHouseProfitGGR ?? 0) >= 0 ? '+' : ''}
                {metrics ? metrics.netHouseProfitGGR.toFixed(2) : '0.00'} ETB
              </span>
              <span className="block text-[10px] text-slate-400 mt-0.5">
                Gross Gaming Revenue
              </span>
            </div>
          </div>

          {/* Card 4: Active Virtual Player Volume */}
          <div className="bg-[#09130d] border border-[#1b3022] rounded-2xl p-3 sm:p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
              <span className="uppercase tracking-wider text-[10px]">Virtual Player Volume</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00e699] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00e699]" />
              </span>
            </div>
            <div className="mt-2">
              <span className="text-lg sm:text-2xl font-black text-white font-mono-num tabular-nums">
                {metrics ? metrics.activeVirtualPlayerVolume : 748} Bets
              </span>
              <span className="block text-[10px] text-[#00e699] font-bold mt-0.5">
                Current Draw #{currentDrawId.slice(-6) || '890253'}
              </span>
            </div>
          </div>
        </div>

        {/* ============================================================
            TABS BAR: DEPOSITS | WITHDRAWALS | USERS | AUDIT LOGS
            ============================================================ */}
        <div className="flex items-center gap-1.5 p-1 bg-[#09130d] border border-[#1b3022] rounded-2xl overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('deposits')}
            className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'deposits'
                ? 'bg-[#00e699] text-[#050906] shadow-[0_0_12px_rgba(0,230,153,0.35)]'
                : 'text-slate-400 hover:text-white hover:bg-[#122216]'
            }`}
          >
            <span>PENDING DEPOSITS</span>
            {pendingDeposits.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono-num ${
                activeTab === 'deposits' ? 'bg-[#050906] text-[#00e699]' : 'bg-[#00e699] text-[#050906]'
              }`}>
                {pendingDeposits.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'withdrawals'
                ? 'bg-[#facc15] text-[#050906] shadow-[0_0_12px_rgba(250,204,21,0.35)]'
                : 'text-slate-400 hover:text-white hover:bg-[#122216]'
            }`}
          >
            <span>PENDING PAYOUTS</span>
            {pendingWithdrawals.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono-num ${
                activeTab === 'withdrawals' ? 'bg-[#050906] text-[#facc15]' : 'bg-[#facc15] text-[#050906]'
              }`}>
                {pendingWithdrawals.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'users'
                ? 'bg-[#38bdf8] text-[#050906] shadow-[0_0_12px_rgba(56,189,248,0.35)]'
                : 'text-slate-400 hover:text-white hover:bg-[#122216]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>USER & WALLETS</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`flex-1 min-w-[110px] py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'logs'
                ? 'bg-white text-[#050906]'
                : 'text-slate-400 hover:text-white hover:bg-[#122216]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>AUDIT TRAIL</span>
          </button>
        </div>

        {/* ============================================================
            TAB 1: PENDING DEPOSITS QUEUE
            ============================================================ */}
        {activeTab === 'deposits' && (
          <div className="w-full bg-[#09130d] border border-[#1b3022] rounded-2xl p-4 sm:p-5 shadow-md flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-sm sm:text-base text-white tracking-wide uppercase flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#00e699]" />
                  <span>Telebirr Deposit Verification Queue</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verify official Telebirr SMS receipts or trigger automated Ethio Telecom scraper.
                </p>
              </div>
              <span className="text-xs font-mono-num font-bold text-slate-400">
                {pendingDeposits.length} pending
              </span>
            </div>

            {pendingDeposits.length === 0 ? (
              <div className="p-8 text-center bg-[#050906] border border-[#14261b] rounded-xl flex flex-col items-center justify-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-[#00e699]/60" />
                <span className="text-sm font-bold text-slate-300">All Telebirr deposits processed!</span>
                <span className="text-xs text-slate-500">New submissions from players will appear here in real time.</span>
              </div>
            ) : (
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#1b3022] text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">Player (Telegram ID)</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Receipt / Ref No</th>
                      <th className="py-2.5 px-3">Anti-Replay</th>
                      <th className="py-2.5 px-3">Submitted</th>
                      <th className="py-2.5 px-3 text-right">Verification Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#14261b]">
                    {pendingDeposits.map((dep) => (
                      <tr key={dep.id} className="hover:bg-[#0d1c12] transition-colors">
                        <td className="py-3 px-3">
                          <span className="font-bold text-white block">{dep.userName}</span>
                          <span className="text-[10px] text-slate-400 font-mono-num block">
                            ID: {dep.userId}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-black text-sm text-[#00e699] font-mono-num tabular-nums">
                            +{dep.amount.toFixed(2)} ETB
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono-num font-bold text-[#facc15] bg-[#facc15]/10 border border-[#facc15]/30 px-2 py-0.5 rounded">
                              #{dep.receiptNo}
                            </span>
                            <a
                              href={`https://transactioninfo.ethiotelecom.et/receipt/${dep.receiptNo}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-400 hover:text-white"
                              title="Inspect Ethio Telecom Receipt"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          {dep.isAntiReplayFlagged ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/80 text-rose-300 border border-rose-700/50">
                              <AlertTriangle className="w-3 h-3 text-rose-400" />
                              <span>DUPLICATE / REPLAY</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00e699]/15 text-[#00e699] border border-[#00e699]/40">
                              <CheckCircle2 className="w-3 h-3 text-[#00e699]" />
                              <span>CLEAN RECEIPT</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-400 font-mono-num text-[11px]">
                          {new Date(dep.submittedAt).toLocaleTimeString()}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* [AUTO-VERIFY] */}
                            <button
                              onClick={() => handleAutoVerifyDeposit(dep.id, dep.receiptNo)}
                              disabled={actionInProgressId === dep.id}
                              className="px-2.5 py-1.5 rounded-lg bg-[#00e699]/20 hover:bg-[#00e699]/30 border border-[#00e699]/50 text-[#00e699] font-black text-[11px] transition-all cursor-pointer disabled:opacity-50"
                              title="Scrape and verify official Ethio Telecom receipt"
                            >
                              {actionInProgressId === dep.id ? 'SCRAPING...' : 'AUTO-VERIFY'}
                            </button>

                            {/* [MANUAL APPROVE] */}
                            <button
                              onClick={() => handleManualApproveDeposit(dep.id, dep.amount)}
                              disabled={actionInProgressId === dep.id}
                              className="px-2.5 py-1.5 rounded-lg bg-[#00e699] hover:bg-[#22c55e] text-[#050906] font-black text-[11px] transition-all cursor-pointer disabled:opacity-50"
                              title="Manually credit user balance immediately"
                            >
                              APPROVE
                            </button>

                            {/* [REJECT] */}
                            <button
                              onClick={() => {
                                setRejectDialog({
                                  isOpen: true,
                                  targetType: 'deposit',
                                  targetId: dep.id,
                                  amount: dep.amount,
                                  userId: dep.userId,
                                });
                              }}
                              disabled={actionInProgressId === dep.id}
                              className="px-2 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 font-bold text-[11px] transition-all cursor-pointer"
                              title="Decline deposit"
                            >
                              REJECT
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            TAB 2: PENDING WITHDRAWALS QUEUE
            ============================================================ */}
        {activeTab === 'withdrawals' && (
          <div className="w-full bg-[#09130d] border border-[#1b3022] rounded-2xl p-4 sm:p-5 shadow-md flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-sm sm:text-base text-white tracking-wide uppercase flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-[#facc15]" />
                  <span>Pending Telebirr Payouts Queue</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Process player cashout requests. Mark as Settled once Telebirr payout is sent, or decline & refund.
                </p>
              </div>
              <span className="text-xs font-mono-num font-bold text-slate-400">
                {pendingWithdrawals.length} pending
              </span>
            </div>

            {pendingWithdrawals.length === 0 ? (
              <div className="p-8 text-center bg-[#050906] border border-[#14261b] rounded-xl flex flex-col items-center justify-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-[#facc15]/60" />
                <span className="text-sm font-bold text-slate-300">All player payouts are up to date!</span>
                <span className="text-xs text-slate-500">Player cashout requests will queue here automatically.</span>
              </div>
            ) : (
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#1b3022] text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">Player ID</th>
                      <th className="py-2.5 px-3">Telebirr Phone</th>
                      <th className="py-2.5 px-3">Account Name</th>
                      <th className="py-2.5 px-3">Amount (ETB)</th>
                      <th className="py-2.5 px-3">Requested At</th>
                      <th className="py-2.5 px-3 text-right">Settlement Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#14261b]">
                    {pendingWithdrawals.map((w) => (
                      <tr key={w.id} className="hover:bg-[#0d1c12] transition-colors">
                        <td className="py-3 px-3">
                          <span className="font-bold text-white block">{w.userName}</span>
                          <span className="text-[10px] text-slate-400 font-mono-num block">
                            ID: {w.userId}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono-num font-bold text-white bg-[#0e1c12] border border-[#1b3022] px-2 py-0.5 rounded">
                            {w.phone}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-200 font-medium">
                          {w.accountName}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-black text-sm text-[#facc15] font-mono-num tabular-nums">
                            {w.amount.toFixed(2)} ETB
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-400 font-mono-num text-[11px]">
                          {new Date(w.submittedAt).toLocaleTimeString()}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* [Mark Settled / Paid] */}
                            <button
                              onClick={() => handleSettleWithdrawal(w.id, w.amount)}
                              disabled={actionInProgressId === w.id}
                              className="px-3 py-1.5 rounded-lg bg-[#facc15] hover:bg-[#eab308] text-[#050906] font-black text-[11px] transition-all cursor-pointer disabled:opacity-50"
                              title="Mark payout sent to user Telebirr"
                            >
                              SETTLE / PAID
                            </button>

                            {/* [Reject & Refund Balance] */}
                            <button
                              onClick={() => {
                                setRejectDialog({
                                  isOpen: true,
                                  targetType: 'withdrawal',
                                  targetId: w.id,
                                  amount: w.amount,
                                  userId: w.userId,
                                });
                              }}
                              disabled={actionInProgressId === w.id}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 font-bold text-[11px] transition-all cursor-pointer"
                              title="Decline payout and refund funds to balance"
                            >
                              REJECT & REFUND
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            TAB 3: USER & WALLET MANAGEMENT
            ============================================================ */}
        {activeTab === 'users' && (
          <div className="w-full bg-[#09130d] border border-[#1b3022] rounded-2xl p-4 sm:p-5 shadow-md flex flex-col space-y-5">
            <div>
              <h3 className="font-black text-sm sm:text-base text-white tracking-wide uppercase flex items-center gap-2">
                <Users className="w-4 h-4 text-[#38bdf8]" />
                <span>Player Profiles & Balance Overrides</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Search player by verified Telegram user ID or username. Manage active balance and account permissions.
              </p>
            </div>

            {/* Search Input */}
            <form onSubmit={handleSearchUsers} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Telegram ID (e.g. 789123456) or Username..."
                  className="w-full bg-[#050906] border border-[#1b3022] focus:border-[#38bdf8] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={isSearchingUsers}
                className="px-4 py-2.5 rounded-xl bg-[#38bdf8] hover:bg-sky-400 text-[#050906] font-black text-xs uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSearchingUsers ? 'SEARCHING...' : 'SEARCH'}
              </button>
            </form>

            {/* User Profile Card */}
            {selectedUser ? (
              <div className="bg-[#050906] border border-[#1b3022] rounded-2xl p-4 sm:p-5 space-y-4">
                {/* Profile Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#14261b] gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-base text-white">{selectedUser.name}</h4>
                      {selectedUser.username && (
                        <span className="text-xs text-[#38bdf8] font-mono">@{selectedUser.username}</span>
                      )}
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase border ${
                          selectedUser.status === 'active'
                            ? 'bg-[#00e699]/15 text-[#00e699] border-[#00e699]/40'
                            : 'bg-rose-950 text-rose-300 border-rose-800'
                        }`}
                      >
                        {selectedUser.status.toUpperCase()}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono-num block mt-0.5">
                      Verified Telegram ID: <strong className="text-white">{selectedUser.userId}</strong>
                    </span>
                  </div>

                  {/* Account Status Toggle Button */}
                  <button
                    onClick={() => handleToggleUserStatus(selectedUser.userId, selectedUser.status)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      selectedUser.status === 'active'
                        ? 'bg-rose-950/60 hover:bg-rose-900 border border-rose-800/60 text-rose-300'
                        : 'bg-[#00e699]/20 hover:bg-[#00e699]/30 border border-[#00e699]/50 text-[#00e699]'
                    }`}
                  >
                    {selectedUser.status === 'active' ? (
                      <>
                        <UserX className="w-3.5 h-3.5" />
                        <span>SUSPEND ACCOUNT</span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>ACTIVATE ACCOUNT</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Profile Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-[#0b140e] border border-[#192c1f] p-3 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Active Balance</span>
                    <span className="text-base sm:text-lg font-black text-[#facc15] font-mono-num tabular-nums mt-0.5 block">
                      {selectedUser.activeBalance.toFixed(2)} ETB
                    </span>
                  </div>

                  <div className="bg-[#0b140e] border border-[#192c1f] p-3 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Deposited</span>
                    <span className="text-base sm:text-lg font-black text-[#00e699] font-mono-num tabular-nums mt-0.5 block">
                      +{selectedUser.totalDeposited.toFixed(2)} ETB
                    </span>
                  </div>

                  <div className="bg-[#0b140e] border border-[#192c1f] p-3 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Withdrawn</span>
                    <span className="text-base sm:text-lg font-black text-slate-300 font-mono-num tabular-nums mt-0.5 block">
                      -{selectedUser.totalWithdrawn.toFixed(2)} ETB
                    </span>
                  </div>

                  <div className="bg-[#0b140e] border border-[#192c1f] p-3 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Rounds Played</span>
                    <span className="text-base sm:text-lg font-black text-white font-mono-num tabular-nums mt-0.5 block">
                      {selectedUser.totalRoundsPlayed}
                    </span>
                  </div>
                </div>

                {/* Direct Balance Controls: [CREDIT ETB] & [DEBIT ETB] */}
                <div className="pt-3 border-t border-[#14261b]">
                  <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
                    Direct Balance Override
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        value={adjustAmount}
                        onChange={(e) => setAdjustAmount(e.target.value)}
                        placeholder="Amount in ETB (e.g. 100)"
                        className="w-full bg-[#09130d] border border-[#1b3022] focus:border-[#00e699] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono-num focus:outline-none"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={adjustReason}
                        onChange={(e) => setAdjustReason(e.target.value)}
                        placeholder="Reason (for audit log)..."
                        className="w-full bg-[#09130d] border border-[#1b3022] focus:border-[#00e699] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      {/* [CREDIT ETB] */}
                      <button
                        type="button"
                        onClick={() => {
                          const amt = parseFloat(adjustAmount);
                          if (!amt || amt <= 0) {
                            showToast('Please enter a valid positive amount.', 'error');
                            return;
                          }
                          setConfirmDialog({
                            isOpen: true,
                            type: 'credit',
                            userId: selectedUser.userId,
                            userName: selectedUser.name,
                            amount: amt,
                            reason: adjustReason.trim() || 'Manual Admin Credit',
                          });
                        }}
                        className="flex-1 py-2 rounded-xl bg-[#00e699] hover:bg-[#22c55e] text-[#050906] font-black text-xs uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        + CREDIT ETB
                      </button>

                      {/* [DEBIT ETB] */}
                      <button
                        type="button"
                        onClick={() => {
                          const amt = parseFloat(adjustAmount);
                          if (!amt || amt <= 0) {
                            showToast('Please enter a valid positive amount.', 'error');
                            return;
                          }
                          setConfirmDialog({
                            isOpen: true,
                            type: 'debit',
                            userId: selectedUser.userId,
                            userName: selectedUser.name,
                            amount: amt,
                            reason: adjustReason.trim() || 'Manual Admin Debit',
                          });
                        }}
                        className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        - DEBIT ETB
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center bg-[#050906] border border-[#14261b] rounded-xl text-xs text-slate-500">
                {searchQuery
                  ? 'No player accounts matching your search query.'
                  : 'Search for a player by ID above or select from the recent user registrations.'}
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            TAB 4: AUDIT TRAIL & LOGS
            ============================================================ */}
        {activeTab === 'logs' && (
          <div className="w-full bg-[#09130d] border border-[#1b3022] rounded-2xl p-4 sm:p-5 shadow-md flex flex-col space-y-4">
            <div>
              <h3 className="font-black text-sm sm:text-base text-white tracking-wide uppercase flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-300" />
                <span>Immutable Admin Audit Trail</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Permanent ledger recording all deposit approvals, payouts, manual balance adjustments, and anti-replay events.
              </p>
            </div>

            {auditLogs.length === 0 ? (
              <div className="p-8 text-center bg-[#050906] border border-[#14261b] rounded-xl text-xs text-slate-500">
                No administrative audit records logged yet.
              </div>
            ) : (
              <div className="overflow-x-auto no-scrollbar max-h-96">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-[#09130d]">
                    <tr className="border-b border-[#1b3022] text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Admin</th>
                      <th className="py-2.5 px-3">Action</th>
                      <th className="py-2.5 px-3">Target User</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Details / Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#14261b] font-mono-num">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#0d1c12] transition-colors text-[11px]">
                        <td className="py-2.5 px-3 text-slate-400">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-white">{log.admin}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              log.action.includes('approve') || log.action.includes('credit') || log.action.includes('settle')
                                ? 'bg-[#00e699]/15 text-[#00e699]'
                                : 'bg-rose-950/60 text-rose-300'
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">{log.targetUserId}</td>
                        <td className="py-2.5 px-3 font-bold text-white">
                          {log.amount ? `${log.amount.toFixed(2)} ETB` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 max-w-xs truncate">
                          {log.reason || log.receiptNo || 'System recorded'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ============================================================
          CONFIRMATION DIALOG MODAL (FOR BALANCE OVERRIDES)
          ============================================================ */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
          <div className="bg-[#0b140e] border border-[#1f3827] w-full max-w-sm rounded-3xl p-5 shadow-2xl flex flex-col space-y-4">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  confirmDialog.type === 'credit'
                    ? 'bg-[#00e699]/20 text-[#00e699]'
                    : 'bg-rose-950 text-rose-400'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-sm text-white uppercase">
                  CONFIRM BALANCE OVERRIDE
                </h4>
                <span className="text-[10px] text-slate-400">Irreversible financial transaction</span>
              </div>
            </div>

            <div className="bg-[#050906] border border-[#14261b] rounded-xl p-3 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Target Player:</span>
                <span className="font-bold text-white">{confirmDialog.userName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Operation:</span>
                <span
                  className={`font-black uppercase ${
                    confirmDialog.type === 'credit' ? 'text-[#00e699]' : 'text-rose-400'
                  }`}
                >
                  {confirmDialog.type === 'credit' ? '+ CREDIT' : '- DEBIT'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount:</span>
                <span className="font-black font-mono-num text-white">
                  {confirmDialog.amount.toFixed(2)} ETB
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-[#14261b]">
                <span className="text-slate-400">Reason:</span>
                <span className="text-slate-300 italic">{confirmDialog.reason}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#14261b] hover:bg-[#1a3324] text-slate-300 font-bold text-xs uppercase cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmBalanceAdjustment}
                className={`flex-1 py-2.5 rounded-xl font-black text-xs uppercase cursor-pointer ${
                  confirmDialog.type === 'credit'
                    ? 'bg-[#00e699] hover:bg-[#22c55e] text-[#050906]'
                    : 'bg-rose-600 hover:bg-rose-500 text-white'
                }`}
              >
                Confirm & Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          REJECT DIALOG MODAL (FOR DEPOSITS & PAYOUTS)
          ============================================================ */}
      {rejectDialog && rejectDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
          <div className="bg-[#0b140e] border border-[#1f3827] w-full max-w-sm rounded-3xl p-5 shadow-2xl flex flex-col space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-950 text-rose-400 flex items-center justify-center">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-sm text-white uppercase">
                  DECLINE {rejectDialog.targetType.toUpperCase()}
                </h4>
                <span className="text-[10px] text-slate-400">
                  {rejectDialog.targetType === 'withdrawal'
                    ? 'Funds will be immediately refunded to user balance'
                    : 'Player deposit request will be marked as rejected'}
                </span>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                Decline Reason Note
              </label>
              <input
                type="text"
                value={rejectReasonInput}
                onChange={(e) => setRejectReasonInput(e.target.value)}
                placeholder="e.g. Receipt unverified, invalid transaction code..."
                className="w-full bg-[#050906] border border-[#1b3022] focus:border-rose-500 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setRejectDialog(null);
                  setRejectReasonInput('');
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#14261b] hover:bg-[#1a3324] text-slate-300 font-bold text-xs uppercase cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (rejectDialog.targetType === 'deposit') {
                    submitRejectDeposit();
                  } else {
                    submitRejectWithdrawal();
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase cursor-pointer"
              >
                Decline Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
