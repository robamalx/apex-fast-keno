import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export interface UserAccount {
  userId: string;
  name: string;
  username?: string;
  phone?: string;
  balance: number; // Stored in real ETB
  status?: 'active' | 'suspended';
  createdAt: string;
  lastActive: string;
}

export interface DepositRequest {
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

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userName: string;
  phone: string;
  accountName: string;
  amount: number;
  status: 'pending' | 'settled' | 'rejected';
  submittedAt: string;
  settledAt?: string;
  settledBy?: string;
  notes?: string;
}

export interface TransactionRecord {
  id: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'bet' | 'win' | 'admin_adjustment' | 'WELCOME_BONUS';
  amount: number;
  previousBalance: number;
  newBalance: number;
  receiptNo?: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  timestamp: string;
}

export interface AdminAuditLog {
  id: string;
  admin: string;
  action:
    | 'approve_deposit'
    | 'auto_verify_deposit'
    | 'reject_deposit'
    | 'manual_credit'
    | 'manual_debit'
    | 'settle_withdrawal'
    | 'reject_withdrawal'
    | 'toggle_status'
    | 'flag_fraud';
  targetUserId: string;
  amount?: number;
  receiptNo?: string;
  reason?: string;
  timestamp: string;
}

export interface DatabaseSchema {
  users: Record<string, UserAccount>;
  deposits: DepositRequest[];
  withdrawals: WithdrawalRequest[];
  transactions: TransactionRecord[];
  processedReceipts: Record<string, { receiptNo: string; userId: string; amount: number; approvedAt: string }>;
  auditLogs: AdminAuditLog[];
}

const DEFAULT_DB: DatabaseSchema = {
  users: {},
  deposits: [],
  withdrawals: [],
  transactions: [],
  processedReceipts: {},
  auditLogs: [],
};

class PersistentDatabase {
  private data: DatabaseSchema = DEFAULT_DB;

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        // Ensure all keys exist
        this.data.users = this.data.users || {};
        this.data.deposits = this.data.deposits || [];
        this.data.withdrawals = this.data.withdrawals || [];
        this.data.transactions = this.data.transactions || [];
        this.data.processedReceipts = this.data.processedReceipts || {};
        this.data.auditLogs = this.data.auditLogs || [];
      } else {
        this.save();
      }
    } catch (err) {
      console.error('Failed to initialize database file:', err);
      this.data = { ...DEFAULT_DB };
    }
  }

  private save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving database:', err);
    }
  }

  // --- User Operations ---
  public getOrCreateUser(userId: string, initialName?: string, username?: string): UserAccount & { isNewUser: boolean } {
    const cleanId = String(userId).trim();
    if (!this.data.users[cleanId]) {
      const initialBalance = 20.0; // 20.00 ETB Welcome Bonus strictly auto-credited on new registration
      this.data.users[cleanId] = {
        userId: cleanId,
        name: initialName || (username ? `@${username}` : `Player #${cleanId.slice(-4)}`),
        username: username || '',
        balance: initialBalance,
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
      };

      // Insert ledger entry for welcome signup bonus
      const bonusTx: TransactionRecord = {
        id: 'tx_' + Math.random().toString(36).substring(2, 9),
        userId: cleanId,
        type: 'WELCOME_BONUS',
        amount: initialBalance,
        previousBalance: 0.0,
        newBalance: initialBalance,
        status: 'approved',
        notes: 'Welcome Signup Bonus (+20.00 ETB)',
        timestamp: new Date().toISOString(),
      };
      this.data.transactions.unshift(bonusTx);
      this.save();

      return { ...this.data.users[cleanId], isNewUser: true };
    } else {
      // Returning player - retain current saved balance
      this.data.users[cleanId].lastActive = new Date().toISOString();
      if (initialName && this.data.users[cleanId].name.startsWith('Player')) {
        this.data.users[cleanId].name = initialName;
      }
      if (username && !this.data.users[cleanId].username) {
        this.data.users[cleanId].username = username;
      }
      this.save();
      return { ...this.data.users[cleanId], isNewUser: false };
    }
  }

  public getUser(userId: string): UserAccount | null {
    return this.data.users[String(userId).trim()] || null;
  }

  public getAllUsers(): UserAccount[] {
    return Object.values(this.data.users);
  }

  public updateUserBalance(userId: string, amountChange: number, type: TransactionRecord['type'], notes?: string, receiptNo?: string): { success: boolean; newBalance: number; error?: string } {
    const cleanId = String(userId).trim();
    this.getOrCreateUser(cleanId);
    const user = this.data.users[cleanId];
    const prev = user.balance;
    const next = Math.round((prev + amountChange) * 100) / 100;

    if (next < 0) {
      return { success: false, newBalance: prev, error: 'Insufficient balance.' };
    }

    user.balance = next;
    user.lastActive = new Date().toISOString();

    const tx: TransactionRecord = {
      id: 'tx_' + Math.random().toString(36).substring(2, 9),
      userId: cleanId,
      type,
      amount: Math.abs(amountChange),
      previousBalance: prev,
      newBalance: next,
      receiptNo,
      status: 'approved',
      notes,
      timestamp: new Date().toISOString(),
    };
    this.data.transactions.unshift(tx);
    if (this.data.transactions.length > 500) {
      this.data.transactions.pop();
    }
    this.save();

    return { success: true, newBalance: next };
  }

  // --- Deposit & Anti-Replay Operations ---
  public isReceiptProcessed(receiptNo: string): boolean {
    const clean = receiptNo.trim().toUpperCase();
    return !!this.data.processedReceipts[clean];
  }

  public markReceiptProcessed(receiptNo: string, userId: string, amount: number) {
    const clean = receiptNo.trim().toUpperCase();
    this.data.processedReceipts[clean] = {
      receiptNo: clean,
      userId,
      amount,
      approvedAt: new Date().toISOString(),
    };
    this.save();
  }

  public addDepositRequest(deposit: Omit<DepositRequest, 'id' | 'submittedAt' | 'status'>): DepositRequest {
    const item: DepositRequest = {
      ...deposit,
      id: 'dep_' + Math.random().toString(36).substring(2, 10),
      status: 'pending',
      submittedAt: new Date().toISOString(),
    };
    this.data.deposits.unshift(item);
    this.save();
    return item;
  }

  public getPendingDeposits(): DepositRequest[] {
    return this.data.deposits.filter((d) => d.status === 'pending');
  }

  public getAllDeposits(): DepositRequest[] {
    return this.data.deposits;
  }

  public approveDeposit(depositId: string, adminName: string = 'Admin'): { success: boolean; deposit?: DepositRequest; newBalance?: number; error?: string } {
    const dep = this.data.deposits.find((d) => d.id === depositId);
    if (!dep) {
      return { success: false, error: 'Deposit request not found.' };
    }
    if (dep.status === 'approved') {
      return { success: false, error: 'Deposit already approved.' };
    }

    const cleanReceipt = dep.receiptNo.trim().toUpperCase();
    if (this.isReceiptProcessed(cleanReceipt)) {
      return { success: false, error: `Receipt #${cleanReceipt} has already been approved previously! (Anti-Replay blocked)` };
    }

    // Mark processed
    this.markReceiptProcessed(cleanReceipt, dep.userId, dep.amount);

    // Credit user balance
    const userResult = this.updateUserBalance(
      dep.userId,
      dep.amount,
      'deposit',
      `Telebirr Deposit Approved (#${cleanReceipt})`,
      cleanReceipt
    );

    dep.status = 'approved';
    dep.reviewedAt = new Date().toISOString();
    dep.reviewedBy = adminName;

    // Log audit
    this.data.auditLogs.unshift({
      id: 'audit_' + Math.random().toString(36).substring(2, 9),
      admin: adminName,
      action: 'approve_deposit',
      targetUserId: dep.userId,
      amount: dep.amount,
      receiptNo: cleanReceipt,
      reason: `Approved deposit request ${dep.id}`,
      timestamp: new Date().toISOString(),
    });

    this.save();
    return { success: true, deposit: dep, newBalance: userResult.newBalance };
  }

  public rejectDeposit(depositId: string, reason: string, adminName: string = 'Admin'): { success: boolean; deposit?: DepositRequest; error?: string } {
    const dep = this.data.deposits.find((d) => d.id === depositId);
    if (!dep) {
      return { success: false, error: 'Deposit request not found.' };
    }

    dep.status = 'rejected';
    dep.reviewedAt = new Date().toISOString();
    dep.reviewedBy = adminName;
    dep.notes = reason;

    this.data.auditLogs.unshift({
      id: 'audit_' + Math.random().toString(36).substring(2, 9),
      admin: adminName,
      action: 'reject_deposit',
      targetUserId: dep.userId,
      amount: dep.amount,
      receiptNo: dep.receiptNo,
      reason,
      timestamp: new Date().toISOString(),
    });

    this.save();
    return { success: true, deposit: dep };
  }

  public manualAdjustBalance(userId: string, amount: number, isCredit: boolean, reason: string, adminName: string = 'Admin'): { success: boolean; newBalance?: number; error?: string } {
    const user = this.getUser(userId);
    if (!user) {
      return { success: false, error: 'User not found.' };
    }

    const change = isCredit ? Math.abs(amount) : -Math.abs(amount);
    const result = this.updateUserBalance(
      userId,
      change,
      'admin_adjustment',
      `Manual Admin Adjustment: ${reason} (${isCredit ? '+Credit' : '-Debit'})`
    );

    if (!result.success) {
      return { success: false, error: result.error };
    }

    this.data.auditLogs.unshift({
      id: 'audit_' + Math.random().toString(36).substring(2, 9),
      admin: adminName,
      action: isCredit ? 'manual_credit' : 'manual_debit',
      targetUserId: userId,
      amount: Math.abs(amount),
      reason,
      timestamp: new Date().toISOString(),
    });

    this.save();
    return { success: true, newBalance: result.newBalance };
  }

  // --- Withdrawal Operations ---
  public addWithdrawalRequest(req: Omit<WithdrawalRequest, 'id' | 'submittedAt' | 'status'>): WithdrawalRequest {
    const item: WithdrawalRequest = {
      ...req,
      id: 'wdr_' + Math.random().toString(36).substring(2, 10),
      status: 'pending',
      submittedAt: new Date().toISOString(),
    };
    this.data.withdrawals.unshift(item);
    this.save();
    return item;
  }

  public getPendingWithdrawals(): WithdrawalRequest[] {
    return this.data.withdrawals.filter((w) => w.status === 'pending');
  }

  public getAllWithdrawals(): WithdrawalRequest[] {
    return this.data.withdrawals;
  }

  public settleWithdrawal(withdrawalId: string, adminName: string = 'Admin'): { success: boolean; withdrawal?: WithdrawalRequest; error?: string } {
    const item = this.data.withdrawals.find((w) => w.id === withdrawalId);
    if (!item) {
      return { success: false, error: 'Withdrawal request not found.' };
    }
    if (item.status === 'settled') {
      return { success: false, error: 'Withdrawal already marked as settled.' };
    }

    item.status = 'settled';
    item.settledAt = new Date().toISOString();
    item.settledBy = adminName;

    this.data.auditLogs.unshift({
      id: 'audit_' + Math.random().toString(36).substring(2, 9),
      admin: adminName,
      action: 'settle_withdrawal',
      targetUserId: item.userId,
      amount: item.amount,
      reason: `Settled / Paid payout request #${item.id} to Telebirr ${item.phone}`,
      timestamp: new Date().toISOString(),
    });

    this.save();
    return { success: true, withdrawal: item };
  }

  public rejectAndRefundWithdrawal(withdrawalId: string, reason: string, adminName: string = 'Admin'): { success: boolean; withdrawal?: WithdrawalRequest; newBalance?: number; error?: string } {
    const item = this.data.withdrawals.find((w) => w.id === withdrawalId);
    if (!item) {
      return { success: false, error: 'Withdrawal request not found.' };
    }
    if (item.status === 'settled') {
      return { success: false, error: 'Cannot reject an already settled withdrawal.' };
    }
    if (item.status === 'rejected') {
      return { success: false, error: 'Withdrawal already rejected and refunded.' };
    }

    item.status = 'rejected';
    item.settledAt = new Date().toISOString();
    item.settledBy = adminName;
    item.notes = reason;

    // Refund the debited amount back to user's real balance
    const refundRes = this.updateUserBalance(
      item.userId,
      item.amount,
      'win',
      `Withdrawal Refund (#${item.id}): ${reason}`
    );

    this.data.auditLogs.unshift({
      id: 'audit_' + Math.random().toString(36).substring(2, 9),
      admin: adminName,
      action: 'reject_withdrawal',
      targetUserId: item.userId,
      amount: item.amount,
      reason: `Declined & Refunded: ${reason}`,
      timestamp: new Date().toISOString(),
    });

    this.save();
    return { success: true, withdrawal: item, newBalance: refundRes.newBalance };
  }

  // --- User Metrics & Status ---
  public getUserDetailedMetrics(userId: string) {
    const user = this.getUser(userId);
    if (!user) return null;

    const userDeposits = this.data.deposits.filter((d) => d.userId === user.userId && d.status === 'approved');
    const totalDeposited = Math.round(userDeposits.reduce((acc, d) => acc + d.amount, 0) * 100) / 100;

    const userWithdrawals = this.data.withdrawals.filter((w) => w.userId === user.userId && w.status === 'settled');
    const totalWithdrawn = Math.round(userWithdrawals.reduce((acc, w) => acc + w.amount, 0) * 100) / 100;

    const userBets = this.data.transactions.filter((t) => t.userId === user.userId && t.type === 'bet');
    const totalRoundsPlayed = userBets.length;
    const totalBetVolume = Math.round(userBets.reduce((acc, t) => acc + t.amount, 0) * 100) / 100;

    const userWins = this.data.transactions.filter((t) => t.userId === user.userId && t.type === 'win');
    const totalWon = Math.round(userWins.reduce((acc, t) => acc + t.amount, 0) * 100) / 100;

    return {
      userId: user.userId,
      name: user.name,
      username: user.username || '',
      phone: user.phone || '',
      activeBalance: user.balance,
      totalDeposited,
      totalWithdrawn,
      totalRoundsPlayed,
      totalBetVolume,
      totalWon,
      status: user.status || 'active',
      createdAt: user.createdAt,
      lastActive: user.lastActive,
    };
  }

  public setUserStatus(userId: string, status: 'active' | 'suspended', adminName: string = 'Admin'): { success: boolean; user?: UserAccount; error?: string } {
    const user = this.getUser(userId);
    if (!user) {
      return { success: false, error: 'User not found.' };
    }

    user.status = status;
    this.data.auditLogs.unshift({
      id: 'audit_' + Math.random().toString(36).substring(2, 9),
      admin: adminName,
      action: 'toggle_status',
      targetUserId: userId,
      reason: `Account status updated to ${status.toUpperCase()}`,
      timestamp: new Date().toISOString(),
    });

    this.save();
    return { success: true, user };
  }

  public getAuditLogs(): AdminAuditLog[] {
    return this.data.auditLogs;
  }

  public getSystemMetrics(virtualPlayerVolume: number = 748) {
    const totalUsers = Object.keys(this.data.users).length;
    let totalBalances = 0;
    for (const u of Object.values(this.data.users)) {
      totalBalances += u.balance;
    }

    const totalSettledDeposits = this.data.deposits
      .filter((d) => d.status === 'approved')
      .reduce((sum, d) => sum + d.amount, 0);

    const totalSettledWithdrawals = this.data.withdrawals
      .filter((w) => w.status === 'settled')
      .reduce((sum, w) => sum + w.amount, 0);

    const totalBets = this.data.transactions
      .filter((t) => t.type === 'bet')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalWins = this.data.transactions
      .filter((t) => t.type === 'win')
      .reduce((sum, t) => sum + t.amount, 0);

    // GGR = Gross Gaming Revenue (Total Bets - Total Wins)
    const netHouseProfitGGR = Math.round((totalBets - totalWins) * 100) / 100;

    const pendingDepositsCount = this.data.deposits.filter((d) => d.status === 'pending').length;
    const pendingWithdrawalsCount = this.data.withdrawals.filter((w) => w.status === 'pending').length;

    return {
      totalSettledDeposits: Math.round(totalSettledDeposits * 100) / 100,
      totalSettledWithdrawals: Math.round(totalSettledWithdrawals * 100) / 100,
      netHouseProfitGGR,
      activeVirtualPlayerVolume: virtualPlayerVolume,
      totalUsers,
      totalBalances: Math.round(totalBalances * 100) / 100,
      pendingDepositsCount,
      pendingWithdrawalsCount,
      processedReceiptsCount: Object.keys(this.data.processedReceipts).length,
    };
  }

  public getStats() {
    return this.getSystemMetrics();
  }
}

export const db = new PersistentDatabase();
