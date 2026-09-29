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
  phoneNumber: string;
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
  phoneNumber,
  userId = 'real_user',
  onDepositVerified,
  onWithdrawSubmitted,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [copied, setCopied] = useState(false);

  // Deposit Form State
  const [smsText, setSmsText] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [depositError, setDepositError] = useState('');

  // Withdraw Form State
  const [withdrawPhone, setWithdrawPhone] = useState(phoneNumber);
  const [withdrawName, setWithdrawName] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('100');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');

  if (!isOpen) return null;

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(phoneNumber);
    setCopied(true);
    haptic.selection();
    showToast('Agent number copied to clipboard!', 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerifyDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsText.trim()) {
      setDepositError('Please paste your Telebirr SMS or receipt text.');
      haptic.notification('warning');
      return;
    }

    setDepositError('');
    setIsVerifying(true);
    haptic.impact('heavy');

    try {
      const res = await fetch('/api/wallet/deposit/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          smsText,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setDepositError(data.error || 'Verification failed. Please check the receipt.');
        haptic.notification('error');
        return;
      }

      if (data.status === 'pending') {
        haptic.notification('success');
        showToast(data.message || `Deposit request submitted for verification!`, 'info');
        setSmsText('');
        onClose();
        return;
      }

      const credited = data.creditedAmount ?? data.amount ?? 0;
      onDepositVerified(credited, data.newBalance);
      haptic.notification('success');
      showToast(data.message || `Successfully deposited ${credited.toFixed(2)} ETB!`, 'success');
      setSmsText('');
      onClose();
    } catch {
      setDepositError('Network error connecting to payment gateway.');
      haptic.notification('error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(withdrawAmount);

    if (isNaN(amountNum) || amountNum < 50) {
      setWithdrawError('Minimum withdrawal is 50.00 ETB.');
      haptic.notification('warning');
      return;
    }

    if (amountNum > balance) {
      setWithdrawError('Withdrawal amount exceeds available balance.');
      haptic.notification('error');
      return;
    }

    if (!withdrawPhone || !withdrawName) {
      setWithdrawError('Please provide phone number and account name.');
      haptic.notification('warning');
      return;
    }

    setWithdrawError('');
    setIsWithdrawing(true);
    haptic.impact('heavy');

    try {
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          amount: amountNum,
          phone: withdrawPhone,
          accountName: withdrawName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setWithdrawError(data.error || 'Withdrawal request failed.');
        haptic.notification('error');
        return;
      }

      onWithdrawSubmitted(data.newBalance, amountNum);
      haptic.notification('success');
      showToast(`Withdrawal of ${amountNum.toFixed(2)} ETB submitted!`, 'success');
      onClose();
    } catch {
      setWithdrawError('Network error processing withdrawal.');
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
            <>
              {/* Agent Instructions */}
              <div className="bg-[#050807] border border-[#1f3127] rounded-2xl p-3.5 space-y-2">
                <span className="text-[10px] font-bold text-[#00e699] uppercase tracking-wider block">
                  Step 1: Transfer Funds via Telebirr
                </span>
                <div className="flex items-center justify-between bg-[#151f19] p-2.5 rounded-xl border border-[#1f3127]">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Agent Receiver Name:</span>
                    <span className="font-extrabold text-white text-xs">{receiverName}</span>
                  </div>
                  <ShieldCheck className="w-4 h-4 text-[#00e699]" />
                </div>
                <div className="flex items-center justify-between bg-[#151f19] p-2.5 rounded-xl border border-[#1f3127]">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Telebirr Phone Number:</span>
                    <span className="font-extrabold text-white font-mono-num text-xs tracking-wider">
                      {phoneNumber}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyNumber}
                    className="p-1.5 bg-[#050807] hover:bg-[#1f3127] rounded-lg text-[#00e699] transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Deposit Form */}
              <form onSubmit={handleVerifyDeposit} className="space-y-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">
                    Step 2: Paste SMS or Ethio Telecom Receipt URL:
                  </label>
                  <textarea
                    rows={4}
                    value={smsText}
                    onChange={(e) => setSmsText(e.target.value)}
                    placeholder="e.g. Your payment of 100 ETB to Robinson Solomon... receipt: https://transactioninfo.ethiotelecom.et/receipt/..."
                    className="w-full bg-[#050807] border border-[#1f3127] rounded-xl p-3 text-white text-xs focus:outline-none focus:border-[#00e699] transition-colors placeholder:text-slate-600 font-mono"
                  />
                </div>

                {depositError && (
                  <div className="bg-rose-950/40 border border-rose-500/40 rounded-xl p-2.5 text-rose-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                    <span>{depositError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isVerifying}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#00e699] to-[#059669] hover:from-[#34d399] hover:to-[#10b981] text-[#050807] font-black text-sm tracking-wide transition-all shadow-[0_0_15px_rgba(0,230,153,0.4)] active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isVerifying ? 'VERIFYING WITH ETHIO TELECOM...' : 'VERIFY & INSTANT DEPOSIT'}
                </button>
              </form>
            </>
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
                  placeholder="Min 50 ETB"
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
