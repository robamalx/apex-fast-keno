import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Search,
  X,
  Users,
  FileText,
  DollarSign,
  ArrowUpRight,
  ShieldAlert,
  KeyRound,
  Delete,
} from 'lucide-react';
import { haptic } from '../utils/telegram';

interface DepositItem {
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
  reviewedAt?: string;
  reviewedBy?: string;
  notes?: string;
}

interface UserAccount {
  userId: string;
  name: string;
  username?: string;
  phone?: string;
  balance: number;
  createdAt: string;
  lastActive: string;
}

interface AdminAuditLog {
  id: string;
  admin: string;
  action: string;
  targetUserId: string;
  amount?: number;
  receiptNo?: string;
  reason?: string;
  timestamp: string;
}

interface Stats {
  totalUsers: number;
  totalBalances: number;
  totalDepositsApproved: number;
  pendingDepositsCount: number;
  processedReceiptsCount: number;
}

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (message: string, type: 'success' | 'info' | 'error') => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose, showToast }) => {
  // PIN Lock State (Default PIN: 1234)
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [pinError, setPinError] = useState<boolean>(false);
  const correctPin = '1234';

  // Admin Panel Data State
  const [activeTab, setActiveTab] = useState<'pending' | 'all_deposits' | 'users' | 'audit'>('pending');
  const [pendingDeposits, setPendingDeposits] = useState<DepositItem[]>([]);
  const [allDeposits, setAllDeposits] = useState<DepositItem[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Reject Modal State
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('Receipt could not be verified in Telebirr statement');

  // Manual User Adjustment Modal
  const [adjustingUser, setAdjustingUser] = useState<UserAccount | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<string>('');
  const [adjustIsCredit, setAdjustIsCredit] = useState<boolean>(true);
  const [adjustReason, setAdjustReason] = useState<string>('Bonus / Manual adjustment');

  // Fetch admin data
  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/deposits');
      if (res.ok) {
        const data = await res.json();
        setPendingDeposits(data.pending || []);
        setAllDeposits(data.all || []);
        if (data.stats) setStats(data.stats);
      }

      const usersRes = await fetch('/api/admin/users');
      if (usersRes.ok) {
        const uData = await usersRes.json();
        setUsers(uData.users || []);
      }

      const auditRes = await fetch('/api/admin/audit');
      if (auditRes.ok) {
        const aData = await auditRes.json();
        setAuditLogs(aData.auditLogs || []);
      }
    } catch {
      showToast('Failed to load admin telemetry data.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setIsUnlocked(false);
      setEnteredPin('');
      setPinError(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isUnlocked && isOpen) {
      fetchAdminData();
    }
  }, [isUnlocked, isOpen]);

  if (!isOpen) return null;

  // Handle Keypad PIN entry
  const handlePinDigit = (digit: string) => {
    haptic.selection();
    if (enteredPin.length < 4) {
      const next = enteredPin + digit;
      setEnteredPin(next);
      if (next.length === 4) {
        if (next === correctPin) {
          haptic.notification('success');
          setIsUnlocked(true);
          setPinError(false);
        } else {
          haptic.notification('error');
          setPinError(true);
          setTimeout(() => {
            setEnteredPin('');
            setPinError(false);
          }, 600);
        }
      }
    }
  };

  const handleClearPin = () => {
    haptic.selection();
    setEnteredPin('');
  };

  const handleBackspacePin = () => {
    haptic.selection();
    setEnteredPin((prev) => prev.slice(0, -1));
  };

  // Approve Deposit
  const handleApproveDeposit = async (id: string) => {
    haptic.impact('medium');
    try {
      const res = await fetch(`/api/admin/deposits/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminName: 'SuperAdmin' }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Deposit approved & credited successfully!`, 'success');
        haptic.notification('success');
        fetchAdminData();
      } else {
        showToast(data.error || 'Approval failed', 'error');
        haptic.notification('error');
      }
    } catch {
      showToast('Network error approving deposit.', 'error');
    }
  };

  // Reject Deposit
  const handleRejectDeposit = async () => {
    if (!rejectingId) return;
    haptic.impact('medium');
    try {
      const res = await fetch(`/api/admin/deposits/${rejectingId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason, adminName: 'SuperAdmin' }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Deposit request rejected.', 'info');
        setRejectingId(null);
        fetchAdminData();
      } else {
        showToast(data.error || 'Rejection failed', 'error');
      }
    } catch {
      showToast('Network error rejecting deposit.', 'error');
    }
  };

  // Manual User Balance Adjustment
  const handleUserAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingUser) return;
    const amt = Number(adjustAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast('Enter a valid adjustment amount.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/admin/users/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: adjustingUser.userId,
          amount: amt,
          isCredit: adjustIsCredit,
          reason: adjustReason,
          adminName: 'SuperAdmin',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(
          `Successfully ${adjustIsCredit ? 'credited' : 'debited'} ${amt.toFixed(2)} ETB for ${adjustingUser.name}`,
          'success'
        );
        haptic.notification('success');
        setAdjustingUser(null);
        setAdjustAmount('');
        fetchAdminData();
      } else {
        showToast(data.error || 'Adjustment failed.', 'error');
      }
    } catch {
      showToast('Network error updating balance.', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-lg animate-fadeIn select-none overflow-y-auto">
      <div className="bg-[#070e0a] border border-[#1a3824] w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* ============================================================
            HEADER BAR
            ============================================================ */}
        <div className="px-5 py-4 bg-[#0c1b12] border-b border-[#1a3824] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00e699]/10 border border-[#00e699]/30 flex items-center justify-center text-[#00e699] shadow-[0_0_12px_rgba(0,230,153,0.3)]">
              {isUnlocked ? <ShieldCheck className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg text-white tracking-wide">
                ADMIN CONSOLE // SECURE GATEWAY
              </h2>
              <p className="text-xs text-slate-400">
                {isUnlocked ? 'Authorized SuperAdmin Session' : 'PIN Authentication Required'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#13281c] hover:bg-[#1a3824] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ============================================================
            LOCKED VIEW: PIN KEYPAD
            ============================================================ */}
        {!isUnlocked ? (
          <div className="p-8 flex flex-col items-center justify-center space-y-6 my-auto">
            <div className="text-center space-y-1">
              <KeyRound className="w-10 h-10 text-[#00e699] mx-auto mb-2 opacity-90" />
              <h3 className="font-bold text-base text-white">Enter Admin PIN</h3>
              <p className="text-xs text-slate-400">Default PIN is <span className="text-[#00e699] font-mono font-bold">1234</span></p>
            </div>

            {/* PIN Dots */}
            <div className={`flex items-center gap-4 ${pinError ? 'animate-shake' : ''}`}>
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full border-2 transition-all ${
                    idx < enteredPin.length
                      ? 'bg-[#00e699] border-[#00e699] shadow-[0_0_10px_#00e699]'
                      : 'border-[#1a3824] bg-[#0c1b12]'
                  }`}
                />
              ))}
            </div>

            {pinError && (
              <p className="text-xs text-rose-400 font-medium animate-fadeIn">
                Incorrect PIN. Please try again (Hint: 1234).
              </p>
            )}

            {/* Keypad Grid */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-[260px]">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  onClick={() => handlePinDigit(digit)}
                  className="h-14 rounded-2xl bg-[#0c1b12] hover:bg-[#13281c] border border-[#1a3824] text-white font-extrabold text-lg active:scale-95 transition-all cursor-pointer shadow-sm"
                >
                  {digit}
                </button>
              ))}
              <button
                onClick={handleClearPin}
                className="h-14 rounded-2xl bg-[#0c1b12] hover:bg-rose-950/30 border border-[#1a3824] hover:border-rose-800 text-rose-400 font-bold text-xs active:scale-95 transition-all cursor-pointer"
              >
                CLEAR
              </button>
              <button
                onClick={() => handlePinDigit('0')}
                className="h-14 rounded-2xl bg-[#0c1b12] hover:bg-[#13281c] border border-[#1a3824] text-white font-extrabold text-lg active:scale-95 transition-all cursor-pointer"
              >
                0
              </button>
              <button
                onClick={handleBackspacePin}
                className="h-14 rounded-2xl bg-[#0c1b12] hover:bg-[#13281c] border border-[#1a3824] text-slate-300 font-bold text-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center"
              >
                ⌫
              </button>
            </div>
          </div>
        ) : (
          /* ============================================================
             UNLOCKED VIEW: ADMIN DASHBOARD
             ============================================================ */
          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* Stats Summary Cards */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 p-3 bg-[#050b07] border-b border-[#1a3824] shrink-0">
                <div className="bg-[#0c1b12] p-3 rounded-2xl border border-[#1a3824]">
                  <div className="text-[11px] text-slate-400 font-medium">Pending Deposits</div>
                  <div className="text-lg font-black text-[#facc15] font-mono tabular-nums mt-0.5">
                    {stats.pendingDepositsCount}
                  </div>
                </div>

                <div className="bg-[#0c1b12] p-3 rounded-2xl border border-[#1a3824]">
                  <div className="text-[11px] text-slate-400 font-medium">Total Approved ETB</div>
                  <div className="text-lg font-black text-[#00e699] font-mono tabular-nums mt-0.5">
                    {stats.totalDepositsApproved.toLocaleString()} ETB
                  </div>
                </div>

                <div className="bg-[#0c1b12] p-3 rounded-2xl border border-[#1a3824]">
                  <div className="text-[11px] text-slate-400 font-medium">Registered Players</div>
                  <div className="text-lg font-black text-white font-mono tabular-nums mt-0.5">
                    {stats.totalUsers}
                  </div>
                </div>

                <div className="bg-[#0c1b12] p-3 rounded-2xl border border-[#1a3824]">
                  <div className="text-[11px] text-slate-400 font-medium">Total User Balances</div>
                  <div className="text-lg font-black text-cyan-400 font-mono tabular-nums mt-0.5">
                    {stats.totalBalances.toLocaleString()} ETB
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 px-3 py-2 bg-[#09140e] border-b border-[#1a3824] shrink-0 overflow-x-auto">
              <button
                onClick={() => {
                  haptic.selection();
                  setActiveTab('pending');
                }}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'pending'
                    ? 'bg-[#00e699] text-[#070e0a] shadow-[0_0_10px_rgba(0,230,153,0.4)]'
                    : 'bg-[#0c1b12] text-slate-300 hover:text-white'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Pending Deposits ({pendingDeposits.length})</span>
              </button>

              <button
                onClick={() => {
                  haptic.selection();
                  setActiveTab('all_deposits');
                }}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'all_deposits'
                    ? 'bg-[#00e699] text-[#070e0a] shadow-[0_0_10px_rgba(0,230,153,0.4)]'
                    : 'bg-[#0c1b12] text-slate-300 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>All Deposits ({allDeposits.length})</span>
              </button>

              <button
                onClick={() => {
                  haptic.selection();
                  setActiveTab('users');
                }}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'users'
                    ? 'bg-[#00e699] text-[#070e0a] shadow-[0_0_10px_rgba(0,230,153,0.4)]'
                    : 'bg-[#0c1b12] text-slate-300 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Player Accounts ({users.length})</span>
              </button>

              <button
                onClick={() => {
                  haptic.selection();
                  setActiveTab('audit');
                }}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'audit'
                    ? 'bg-[#00e699] text-[#070e0a] shadow-[0_0_10px_rgba(0,230,153,0.4)]'
                    : 'bg-[#0c1b12] text-slate-300 hover:text-white'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Audit Logs</span>
              </button>

              <div className="ml-auto">
                <button
                  onClick={fetchAdminData}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-[#0c1b12] hover:bg-[#13281c] border border-[#1a3824] text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#00e699]' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              
              {/* TAB 1: PENDING DEPOSITS LIST */}
              {activeTab === 'pending' && (
                <div className="space-y-3">
                  {pendingDeposits.length === 0 ? (
                    <div className="text-center py-12 bg-[#0c1b12]/50 rounded-2xl border border-[#1a3824]">
                      <CheckCircle2 className="w-10 h-10 text-[#00e699] mx-auto mb-2 opacity-80" />
                      <h4 className="font-bold text-white text-sm">No Pending Deposits</h4>
                      <p className="text-xs text-slate-400 mt-1">All Telebirr deposit receipts have been processed.</p>
                    </div>
                  ) : (
                    pendingDeposits.map((dep) => (
                      <div
                        key={dep.id}
                        className="bg-[#0c1b12] border border-[#1a3824] hover:border-[#00e699]/40 rounded-2xl p-4 flex flex-col space-y-3 transition-all shadow-sm"
                      >
                        <div className="flex items-center justify-between border-b border-[#1a3824] pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-[#facc15]/10 border border-[#facc15]/30 text-[#facc15] font-mono text-xs font-extrabold">
                              {dep.amount.toFixed(2)} ETB
                            </span>
                            <span className="font-mono text-xs text-slate-300 font-bold">
                              Ref: {dep.receiptNo}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {new Date(dep.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-slate-500">Player ID / Name:</span>{' '}
                            <span className="text-white font-medium">{dep.userName} ({dep.userId})</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Sender Phone:</span>{' '}
                            <span className="text-cyan-400 font-mono">{dep.senderPhone || 'Not specified'}</span>
                          </div>
                        </div>

                        {/* Raw SMS Box */}
                        <div className="bg-[#050a07] border border-[#15291e] rounded-xl p-2.5 text-[11px] text-slate-300 font-mono whitespace-pre-wrap">
                          {dep.rawText}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            onClick={() => setRejectingId(dep.id)}
                            className="px-4 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/40 border border-rose-800/60 text-rose-300 text-xs font-bold active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Reject</span>
                          </button>

                          <button
                            onClick={() => handleApproveDeposit(dep.id)}
                            className="px-5 py-2 rounded-xl bg-[#00e699] hover:bg-[#22c55e] text-[#070e0a] text-xs font-extrabold active:scale-95 transition-all cursor-pointer shadow-[0_0_10px_rgba(0,230,153,0.3)] flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Approve & Credit Balance</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 2: ALL DEPOSITS */}
              {activeTab === 'all_deposits' && (
                <div className="space-y-2">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#1a3824] text-slate-400 font-semibold bg-[#0c1b12]">
                          <th className="p-2.5">Receipt #</th>
                          <th className="p-2.5">Player</th>
                          <th className="p-2.5">Amount</th>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5">Submitted</th>
                          <th className="p-2.5">Reviewed By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1a3824]">
                        {allDeposits.map((d) => (
                          <tr key={d.id} className="hover:bg-[#0c1b12]/50">
                            <td className="p-2.5 font-mono font-bold text-white">{d.receiptNo}</td>
                            <td className="p-2.5 text-slate-300">{d.userName}</td>
                            <td className="p-2.5 font-mono text-[#facc15] font-bold">{d.amount.toFixed(2)} ETB</td>
                            <td className="p-2.5">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  d.status === 'approved'
                                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                    : d.status === 'rejected'
                                    ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                    : 'bg-amber-950 text-amber-400 border border-amber-800'
                                }`}
                              >
                                {d.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-400 font-mono text-[11px]">
                              {new Date(d.submittedAt).toLocaleTimeString()}
                            </td>
                            <td className="p-2.5 text-slate-400">{d.reviewedBy || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: USERS & BALANCES */}
              {activeTab === 'users' && (
                <div className="space-y-3">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#1a3824] text-slate-400 font-semibold bg-[#0c1b12]">
                          <th className="p-2.5">User ID / Name</th>
                          <th className="p-2.5">Telegram Username</th>
                          <th className="p-2.5">Balance</th>
                          <th className="p-2.5">Joined</th>
                          <th className="p-2.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1a3824]">
                        {users.map((u) => (
                          <tr key={u.userId} className="hover:bg-[#0c1b12]/50">
                            <td className="p-2.5">
                              <div className="font-bold text-white">{u.name}</div>
                              <div className="text-[10px] text-slate-500 font-mono">{u.userId}</div>
                            </td>
                            <td className="p-2.5 text-cyan-400 font-mono">
                              {u.username ? `@${u.username}` : 'Direct Web'}
                            </td>
                            <td className="p-2.5 font-mono text-[#facc15] font-bold text-sm">
                              {u.balance.toFixed(2)} ETB
                            </td>
                            <td className="p-2.5 text-slate-400 text-[11px]">
                              {new Date(u.createdAt).toLocaleDateString()}
                            </td>
                            <td className="p-2.5 text-right">
                              <button
                                onClick={() => {
                                  setAdjustingUser(u);
                                  setAdjustAmount('');
                                }}
                                className="px-3 py-1.5 rounded-xl bg-[#00e699]/10 hover:bg-[#00e699]/20 border border-[#00e699]/30 text-[#00e699] font-bold text-xs active:scale-95 transition-all cursor-pointer"
                              >
                                Adjust Balance
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 4: AUDIT LOGS */}
              {activeTab === 'audit' && (
                <div className="space-y-2">
                  <div className="space-y-2">
                    {auditLogs.map((log) => (
                      <div
                        key={log.id}
                        className="bg-[#0c1b12] border border-[#1a3824] rounded-xl p-3 flex flex-col space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#00e699] uppercase font-mono">{log.action}</span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-slate-300">
                          Admin: <strong className="text-white">{log.admin}</strong> — Target User:{' '}
                          <code className="text-cyan-400">{log.targetUserId}</code>
                        </div>
                        {log.reason && <div className="text-slate-400 italic">"{log.reason}"</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

      </div>

      {/* ============================================================
          REJECT REASON MODAL POPUP
          ============================================================ */}
      {rejectingId && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0c1b12] border border-rose-800/60 rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
            <h4 className="font-bold text-base text-rose-400">Reject Deposit Request</h4>
            <p className="text-xs text-slate-300">Please provide a rejection reason for the player:</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="w-full bg-[#050a07] border border-[#1a3824] focus:border-rose-500 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectingId(null)}
                className="px-4 py-2 rounded-xl bg-[#13281c] text-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectDeposit}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MANUAL USER ADJUSTMENT MODAL
          ============================================================ */}
      {adjustingUser && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0c1b12] border border-[#1a3824] rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
            <h4 className="font-bold text-base text-white">Manual Balance Adjustment</h4>
            <p className="text-xs text-slate-300">
              Player: <span className="text-[#00e699] font-bold">{adjustingUser.name}</span> (Current:{' '}
              {adjustingUser.balance.toFixed(2)} ETB)
            </p>

            <form onSubmit={handleUserAdjustmentSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Action Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustIsCredit(true)}
                    className={`py-2 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
                      adjustIsCredit
                        ? 'bg-emerald-950 border-emerald-600 text-emerald-300'
                        : 'bg-[#050a07] border-[#1a3824] text-slate-400'
                    }`}
                  >
                    + Credit Funds
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustIsCredit(false)}
                    className={`py-2 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
                      !adjustIsCredit
                        ? 'bg-rose-950 border-rose-600 text-rose-300'
                        : 'bg-[#050a07] border-[#1a3824] text-slate-400'
                    }`}
                  >
                    - Debit Funds
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Amount (ETB)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  placeholder="e.g. 100.00"
                  className="w-full bg-[#050a07] border border-[#1a3824] focus:border-[#00e699] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Reason / Note</label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full bg-[#050a07] border border-[#1a3824] focus:border-[#00e699] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustingUser(null)}
                  className="px-4 py-2 rounded-xl bg-[#13281c] text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#00e699] hover:bg-[#22c55e] text-[#070e0a] text-xs font-extrabold cursor-pointer"
                >
                  Apply Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
