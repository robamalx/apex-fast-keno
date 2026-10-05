import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  ArrowDownCircle,
  ArrowUpCircle,
  ShieldCheck,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { haptic } from '../utils/telegram';

interface CashierModalProps {
  isOpen: boolean;
  onClose: () => void;
  balance: number;
  receiverName: string;
  phoneNumber?: string;
  depositNumber?: string;
  userId?: string;
  onDepositVerified: (amount: number, newBalance: number) => void;
  onWithdrawSubmitted: (newBalance: number, amount: number) => void;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const CashierModal: React.FC<CashierModalProps> = ({
  isOpen,
  onClose,
  balance,
  receiverName,
  phoneNumber = '',
  depositNumber = phoneNumber || 'Loading...',
  userId = 'real_user',
  onDepositVerified,
  onWithdrawSubmitted,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [copied, setCopied] = useState(false);

  // Withdraw Form State
  const [withdrawPhone, setWithdrawPhone] = useState('');
  const [withdrawName, setWithdrawName] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('200');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');

  if (!isOpen) return null;

  const handleCopyNumber = () => {
    if (depositNumber && depositNumber !== 'Loading...') {
      navigator.clipboard.writeText(depositNumber);
      setCopied(true);
      haptic.selection();
      showToast('Deposit number copied to clipboard!', 'info');
      setTimeout(() => setCopied(false), 2000);
    } else {
      showToast('Deposit number is loading...', 'info');
    }
  };

  const handleCloseToSendReceipt = () => {
    haptic.selection();
    try {
      if (typeof window !== 'undefined' && (window as unknown as { Telegram?: { WebApp?: { close: () => void } } })?.Telegram?.WebApp?.close) {
        (window as unknown as { Telegram?: { WebApp?: { close: () => void } } }).Telegram?.WebApp?.close();
      } else {
        onClose();
      }
    } catch {
      onClose();
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(withdrawAmount);

    // Client-side Validation: Minimum base threshold is 200 ETB (backend dynamically checks 1000 ETB for first-time)
    if (isNaN(amountNum) || amountNum < 200) {
      setWithdrawError('Minimum withdrawal is 200 ETB.');
      showToast('Minimum withdrawal is 200 ETB.', 'error');
      haptic.notification('warning');
      return;
    }

    if (amountNum > balance) {
      setWithdrawError(`Withdrawal amount exceeds available balance (${balance.toFixed(2)} ETB).`);
      showToast('Insufficient balance.', 'error');
      haptic.notification('error');
      return;
    }

    if (!withdrawPhone || !withdrawName) {
      setWithdrawError('Please provide phone number and account name.');
      showToast('Please provide phone number and account name.', 'warning');
      haptic.notification('warning');
      return;
    }

    setWithdrawError('');
    setIsWithdrawing(true);
    haptic.impact('heavy');

    try {
      const res = await fetch('/api/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          amount: amountNum,
          phoneNumber: withdrawPhone,
          phone: withdrawPhone,
          accountName: withdrawName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setWithdrawError(data.error || 'Withdrawal request failed.');
        showToast(data.error || 'Withdrawal request failed.', 'error');
        haptic.notification('error');
        return;
      }

      onWithdrawSubmitted(data.newBalance, amountNum);
      haptic.notification('success');
      showToast(`Withdrawal of ${amountNum.toFixed(2)} ETB submitted!`, 'success');
      onClose();
    } catch {
      setWithdrawError('Network error processing withdrawal.');
      showToast('Network error processing withdrawal.', 'error');
      haptic.notification('error');
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="bg-[#0b1410] border border-[#1f3127] w-full max-w-md rounded-3xl p-5 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1f3127]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#00e699] flex items-center justify-center shadow-md">
              <Zap className="w-4 h-4 text-[#050807]" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white tracking-wide">
                TELEBIRR CASHIER
              </h3>
              <p className="text-[11px] text-slate-400 font-mono-num">
                Balance: <strong className="text-[#00e699]">{balance.toFixed(2)} ETB</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#151f19] hover:bg-[#1f3127] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-2 gap-2 my-3 p-1 bg-[#050807] border border-[#1f3127] rounded-2xl">
          <button
            onClick={() => setActiveTab('deposit')}
            className={`py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'deposit'
                ? 'bg-[#00e699] text-[#050807] shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowDownCircle className="w-4 h-4" />
            <span>DEPOSIT</span>
          </button>
          <button
            onClick={() => setActiveTab('withdraw')}
            className={`py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'withdraw'
                ? 'bg-[#00e699] text-[#050807] shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowUpCircle className="w-4 h-4" />
            <span>WITHDRAW</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto space-y-4 py-1 text-xs text-slate-300">
          {activeTab === 'deposit' ? (
            <div className="space-y-4 py-2">
              {/* Deposit Card */}
              <div className="bg-[#050807] border border-[#1f3127] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#142319]">
                  <span className="text-[11px] font-bold text-[#00e699] uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#00e699]" />
                    Manual Telebirr Deposit
                  </span>
                  {receiverName && (
                    <span className="text-[11px] text-slate-400 font-medium">
                      {receiverName}
                    </span>
                  )}
                </div>

                {/* Exact Instruction Message */}
                <div className="bg-[#151f19] p-3.5 rounded-xl border border-[#1f3127] text-slate-200 text-xs sm:text-sm leading-relaxed">
                  <p className="font-semibold text-white mb-2">
                    How to Deposit:
                  </p>
                  <p className="text-slate-300">
                    Send your ETB via Telebirr to{' '}
                    <strong className="text-[#00e699] font-mono font-bold tracking-wider">
                      {depositNumber}
                    </strong>
                    . Then, close this game and paste your exact Telebirr SMS receipt into the bot chat.
                  </p>
                </div>

                {/* Quick Copy Phone Pill */}
                {depositNumber && (
                  <div className="flex items-center justify-between bg-[#0a140e] p-2.5 rounded-xl border border-[#1a2c20]">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Telebirr Number:</span>
                      <span className="font-extrabold text-white font-mono text-sm tracking-wider">
                        {depositNumber}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyNumber}
                      className="px-3 py-1.5 bg-[#151f19] hover:bg-[#1f3127] rounded-lg text-[#00e699] transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy Number'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Action Button: Close to Send Receipt */}
              <button
                type="button"
                onClick={handleCloseToSendReceipt}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#00e699] to-[#059669] hover:from-[#34d399] hover:to-[#10b981] text-[#050807] font-black text-sm tracking-wide transition-all shadow-[0_0_15px_rgba(0,230,153,0.4)] active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Close to Send Receipt</span>
              </button>
            </div>
          ) : (
            /* Withdraw Form */
            <form onSubmit={handleWithdrawSubmit} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Withdrawal Amount (ETB):
                </label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Min 200 ETB (1000 ETB for first-time)"
                  className="w-full bg-[#050807] border border-[#1f3127] rounded-xl p-3 text-white font-mono-num font-bold text-sm focus:outline-none focus:border-[#00e699]"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Your Telebirr Phone Number:
                </label>
                <input
                  type="text"
                  value={withdrawPhone}
                  onChange={(e) => setWithdrawPhone(e.target.value)}
                  placeholder="09XXXXXXXX"
                  className="w-full bg-[#050807] border border-[#1f3127] rounded-xl p-3 text-white font-mono-num text-sm focus:outline-none focus:border-[#00e699]"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Registered Account Holder Name:
                </label>
                <input
                  type="text"
                  value={withdrawName}
                  onChange={(e) => setWithdrawName(e.target.value)}
                  placeholder="Full name as in Telebirr"
                  className="w-full bg-[#050807] border border-[#1f3127] rounded-xl p-3 text-white text-sm focus:outline-none focus:border-[#00e699]"
                />
              </div>

              {withdrawError && (
                <div className="bg-rose-950/40 border border-rose-500/40 rounded-xl p-2.5 text-rose-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span>{withdrawError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isWithdrawing}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#00e699] to-[#059669] hover:from-[#34d399] hover:to-[#10b981] text-[#050807] font-black text-sm tracking-wide transition-all shadow-[0_0_15px_rgba(0,230,153,0.4)] active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isWithdrawing ? 'PROCESSING WITHDRAWAL...' : 'SUBMIT WITHDRAWAL'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
