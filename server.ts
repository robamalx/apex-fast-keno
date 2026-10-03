import express from 'express';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import jsQR from 'jsqr';
import { Jimp } from 'jimp';
import { KENO_PAYTABLE, calculateMultiplier } from './src/utils/paytable.ts';
import { db } from './src/server/db.ts';
import { virtualSimulation } from './src/server/virtualSimulation.ts';
import { parseTelebirrText } from './src/server/telebirrParser.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT) || 3000;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '789123456:AAFx_MOCK_FAST_KENO_BOT_TOKEN';

// Telebirr Agent Configuration
const TELEBIRR_AGENT_NAME = process.env.TELEBIRR_AGENT_NAME || process.env.TELEBIRR_RECEIVER_NAME || 'ATLAS FAST KENO AGENT';
const TELEBIRR_AGENT_PHONE = process.env.TELEBIRR_AGENT_PHONE || process.env.TELEBIRR_PHONE_NUMBER || '0911234567';

// Ticket Storage for active rounds
interface TicketItem {
  id: string;
  drawId: string;
  userId: string;
  userName: string;
  userMasked: string;
  chosenNumbers: number[];
  stake: number;
  timestamp: string;
  status: 'waiting' | 'win' | 'loss';
  payout?: number;
  matchedCount?: number;
  drawnNumbers?: number[];
  multiplier?: number;
}

// Active tickets per user in current round (in-memory per round lifecycle, user balances are in persistent DB)
const activeRoundTickets: Record<string, TicketItem[]> = {};
const userBetsHistory: Record<string, TicketItem[]> = {};
let currentServerDrawId = 890253779;

// Global Draw History
let drawHistoryList: Array<{ drawId: string; timestamp: string; drawnNumbers: number[]; totalBets?: number; winnersCount?: number }> = [];

function initHistoricalDraws() {
  if (drawHistoryList.length === 0) {
    const now = Date.now();
    for (let i = 0; i < 8; i++) {
      const { drawnNumbers } = generateKenoDrawPRNG();
      const timeOffset = (8 - i) * 60 * 1000;
      const d = new Date(now - timeOffset);
      const timeStr = d.toTimeString().split(' ')[0];
      drawHistoryList.unshift({
        drawId: String(currentServerDrawId - 8 + i),
        timestamp: timeStr,
        drawnNumbers,
        totalBets: Math.floor(600 + Math.random() * 350),
        winnersCount: Math.floor(80 + Math.random() * 70),
      });
    }
  }
}
initHistoricalDraws();

/**
 * Validate Telegram initData using HMAC-SHA256
 */
function validateTelegramInitData(initDataStr: string, botToken: string): boolean {
  if (!initDataStr) return false;
  try {
    const urlParams = new URLSearchParams(initDataStr);
    const hash = urlParams.get('hash');
    if (!hash) return false;

    urlParams.delete('hash');
    const params: string[] = [];
    urlParams.forEach((val, key) => params.push(`${key}=${val}`));
    params.sort();
    const dataCheckString = params.join('\n');

    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    return calculatedHash === hash;
  } catch {
    return false;
  }
}

/**
 * Unbiased Fisher-Yates shuffle sampling 20 unique numbers from 1 to 80
 */
function generateKenoDrawPRNG(): { drawnNumbers: number[] } {
  const pool: number[] = Array.from({ length: 80 }, (_, i) => i + 1);

  for (let i = pool.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    const temp = pool[i];
    pool[i] = pool[j];
    pool[j] = temp;
  }

  const drawn = pool.slice(0, 20).sort((a, b) => a - b);
  return { drawnNumbers: drawn };
}

// ============================================================================
// CONFIG & TELEGRAM VALIDATION
// ============================================================================
app.get('/api/balance', async (req, res) => {
  const telegramId = (req.query.telegram_id as string) || (req.query.telegramId as string);
  if (!telegramId) {
    return res.status(400).json({ error: 'Missing telegram_id' });
  }

  if (process.env.DATABASE_URL) {
    try {
      const { neon } = await import('@neondatabase/serverless');
      const sql = neon(process.env.DATABASE_URL);
      const result = await sql`SELECT balance, bonus_balance, first_name FROM users WHERE telegram_id = ${telegramId}`;
      if (result.length > 0) {
        const realBalance = parseFloat(String(result[0].balance)) || 0;
        const bonusBalance = parseFloat(String(result[0].bonus_balance)) || 0;
        const totalPlayableBalance = (realBalance + bonusBalance).toFixed(2);
        return res.json({
          balance: totalPlayableBalance,
          first_name: result[0].first_name || 'Player',
        });
      }
      return res.json({ balance: '0.00', first_name: 'Player' });
    } catch (err) {
      console.error('Neon query error in local server:', err);
    }
  }

  const user = db.getOrCreateUser(telegramId);
  return res.json({
    balance: user.balance.toFixed(2),
    first_name: user.name || 'Player',
  });
});

app.get('/api/config', (req, res) => {
  res.json({
    receiverName: TELEBIRR_AGENT_NAME,
    phoneNumber: TELEBIRR_AGENT_PHONE,
  });
});

app.post('/api/telegram/validate', (req, res) => {
  const { initData } = req.body;
  const isValid = validateTelegramInitData(initData, TELEGRAM_BOT_TOKEN);
  res.json({
    valid: isValid,
    message: isValid ? 'Telegram Cryptographic HMAC Verified' : 'Standard Web Session Verified',
  });
});

// ============================================================================
// USER STATE & REAL ETB ACCOUNTS (DEFAULT 0.00 ETB)
// ============================================================================
app.get('/api/state', (req, res) => {
  const userId = (req.query.userId as string) || 'default_user';
  const name = (req.query.name as string) || '';
  const username = (req.query.username as string) || '';

  // Retrieve or create persistent user with real 0.00 ETB balance
  const user = db.getOrCreateUser(userId, name, username);

  const userTickets = activeRoundTickets[userId] || [];
  const userHistory = userBetsHistory[userId] || [];

  const counts: Record<number, number> = {};
  for (let i = 1; i <= 80; i++) counts[i] = 0;
  drawHistoryList.forEach((d) => d.drawnNumbers.forEach((n) => counts[n]++));

  const sortedByFreq = Object.entries(counts).map(([n, c]) => ({ num: Number(n), count: c }));
  sortedByFreq.sort((a, b) => b.count - a.count);

  const hotNumbers = sortedByFreq.slice(0, 8).map((x) => x.num);
  const coldNumbers = sortedByFreq.slice(-8).map((x) => x.num);

  res.json({
    userId: user.userId,
    name: user.name,
    balance: user.balance, // Real ETB balance
    welcomeBonusAwarded: Boolean(user.isNewUser),
    currentDrawId: String(currentServerDrawId),
    myTickets: userTickets,
    myBetsHistory: userHistory,
    recentDraws: drawHistoryList,
    hotNumbers,
    coldNumbers,
    receiverName: TELEBIRR_AGENT_NAME,
    phoneNumber: TELEBIRR_AGENT_PHONE,
  });
});

// ============================================================================
// VIRTUAL PLAYER SIMULATION (500 - 1,000 PARTICIPANTS PER ROUND)
// ============================================================================
app.get('/api/community-bets', (req, res) => {
  const drawId = (req.query.drawId as string) || String(currentServerDrawId);
  const timeRemaining = Number(req.query.timeRemaining ?? 30);
  const phase = (req.query.phase as 'betting' | 'drawing' | 'reset') || 'betting';
  const drawnBallsParam = req.query.drawnBalls as string;

  let drawnBalls: number[] = [];
  if (drawnBallsParam) {
    try {
      drawnBalls = JSON.parse(drawnBallsParam);
    } catch {
      drawnBalls = [];
    }
  }

  const roundData = virtualSimulation.getRoundState(drawId, timeRemaining, phase, drawnBalls);
  res.json(roundData);
});

// ============================================================================
// REAL BET PLACEMENT (DEBITING REAL ETB BALANCE)
// ============================================================================
app.post('/api/bet', async (req, res) => {
  const { userId = 'default_user', chosenNumbers, stake } = req.body;

  if (!Array.isArray(chosenNumbers) || chosenNumbers.length < 1 || chosenNumbers.length > 10) {
    return res.status(400).json({ error: 'Please select between 1 and 10 numbers.' });
  }

  const parsedStake = Number(stake);
  if (isNaN(parsedStake) || parsedStake <= 0) {
    return res.status(400).json({ error: 'Invalid stake amount.' });
  }

  // If DATABASE_URL is configured, use Neon DB
  if (process.env.DATABASE_URL) {
    try {
      const { neon } = await import('@neondatabase/serverless');
      const sql = neon(process.env.DATABASE_URL);
      const userResult = await sql`SELECT balance, bonus_balance, first_name FROM users WHERE telegram_id = ${String(userId)}`;

      if (userResult.length > 0) {
        const realBalance = parseFloat(String(userResult[0].balance)) || 0;
        const bonusBalance = parseFloat(String(userResult[0].bonus_balance)) || 0;
        const totalPlayableBalance = realBalance + bonusBalance;

        if (totalPlayableBalance < parsedStake) {
          return res.status(400).json({
            error: `Insufficient balance! Your balance is ${totalPlayableBalance.toFixed(2)} ETB. Please deposit to play.`,
          });
        }

        let newBonusBalance = bonusBalance;
        let newRealBalance = realBalance;

        if (bonusBalance >= parsedStake) {
          newBonusBalance = bonusBalance - parsedStake;
        } else {
          const remainder = parsedStake - bonusBalance;
          newBonusBalance = 0;
          newRealBalance = realBalance - remainder;
        }

        newBonusBalance = Math.max(0, newBonusBalance);
        newRealBalance = Math.max(0, newRealBalance);

        await sql`
          UPDATE users 
          SET balance = ${newRealBalance}, bonus_balance = ${newBonusBalance} 
          WHERE telegram_id = ${userId}
        `;

        const drawIdStr = String(currentServerDrawId);
        const now = new Date();
        const timeStr = now.toTimeString().split(' ')[0];
        const ticket: TicketItem = {
          id: 't_' + Math.random().toString(36).substring(2, 9),
          drawId: drawIdStr,
          userId: String(userId),
          userName: userResult[0].first_name || 'Player',
          userMasked: `${(userResult[0].first_name || 'Player').slice(0, 3)}***`,
          chosenNumbers: [...chosenNumbers].sort((a, b) => a - b),
          stake: parsedStake,
          timestamp: timeStr,
          status: 'waiting',
        };

        if (!activeRoundTickets[userId]) {
          activeRoundTickets[userId] = [];
        }
        activeRoundTickets[userId].unshift(ticket);

        return res.json({
          success: true,
          ticket,
          ticketsPlacedCount: activeRoundTickets[userId].length,
          newBalance: parseFloat((newRealBalance + newBonusBalance).toFixed(2)),
        });
      }
    } catch (neonErr) {
      console.error('Neon DB bet placement error:', neonErr);
    }
  }

  const user = db.getOrCreateUser(userId);

  if (user.balance < parsedStake) {
    return res.status(400).json({
      error: `Insufficient balance! Your balance is ${user.balance.toFixed(2)} ETB. Please deposit via Telebirr to play.`,
    });
  }

  // Deduct real balance persistently
  const updateRes = db.updateUserBalance(
    userId,
    -parsedStake,
    'bet',
    `Fast Keno Bet on #${currentServerDrawId} (${chosenNumbers.length} spots)`
  );

  if (!updateRes.success) {
    return res.status(400).json({ error: updateRes.error || 'Balance deduction failed.' });
  }

  const drawIdStr = String(currentServerDrawId);
  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0];

  const ticket: TicketItem = {
    id: 't_' + Math.random().toString(36).substring(2, 9),
    drawId: drawIdStr,
    userId: user.userId,
    userName: user.name,
    userMasked: `${user.name.slice(0, 3)}***`,
    chosenNumbers: [...chosenNumbers].sort((a, b) => a - b),
    stake: parsedStake,
    timestamp: timeStr,
    status: 'waiting',
  };

  if (!activeRoundTickets[userId]) {
    activeRoundTickets[userId] = [];
  }
  activeRoundTickets[userId].unshift(ticket);

  res.json({
    success: true,
    ticket,
    ticketsPlacedCount: activeRoundTickets[userId].length,
    newBalance: updateRes.newBalance,
  });
});

// ============================================================================
// PRNG DRAW RESOLUTION (CREDITING REAL ETB WINNINGS)
// ============================================================================
app.post('/api/draw/resolve', (req, res) => {
  const { userId = 'default_user' } = req.body;
  const user = db.getOrCreateUser(userId);

  const drawIdStr = String(currentServerDrawId);
  const { drawnNumbers } = generateKenoDrawPRNG();

  let totalWinnings = 0;
  let winningTicketsCount = 0;
  const userTickets = activeRoundTickets[userId] || [];

  userTickets.forEach((ticket) => {
    const matchedNumbers = ticket.chosenNumbers.filter((n) => drawnNumbers.includes(n));
    const matchedCount = matchedNumbers.length;
    const multiplier = calculateMultiplier(ticket.chosenNumbers.length, matchedCount);
    const payout = Math.round(ticket.stake * multiplier * 100) / 100;

    ticket.drawnNumbers = drawnNumbers;
    ticket.matchedCount = matchedCount;
    ticket.multiplier = multiplier;
    ticket.payout = payout;

    if (payout > 0) {
      ticket.status = 'win';
      totalWinnings += payout;
      winningTicketsCount++;
    } else {
      ticket.status = 'loss';
    }

    if (!userBetsHistory[userId]) {
      userBetsHistory[userId] = [];
    }
    userBetsHistory[userId].unshift(ticket);
    if (userBetsHistory[userId].length > 100) userBetsHistory[userId].pop();
  });

  // Credit real winnings persistently
  if (totalWinnings > 0) {
    db.updateUserBalance(
      userId,
      totalWinnings,
      'win',
      `Fast Keno Winnings Draw #${drawIdStr} (${winningTicketsCount} winning tickets)`
    );
  }

  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0];

  const newDrawResult = {
    drawId: drawIdStr,
    timestamp: timeStr,
    drawnNumbers,
    totalBets: userTickets.length + Math.floor(580 + Math.random() * 320),
    winnersCount: winningTicketsCount + Math.floor(75 + Math.random() * 65),
  };

  drawHistoryList.unshift(newDrawResult);
  if (drawHistoryList.length > 30) drawHistoryList.pop();

  const resolvedTickets = [...userTickets];

  // Advance Draw ID & clear round tickets
  currentServerDrawId += 1;
  activeRoundTickets[userId] = [];

  // Reset next virtual round
  virtualSimulation.initRound(String(currentServerDrawId));

  const updatedUser = db.getUser(userId);

  res.json({
    success: true,
    drawId: drawIdStr,
    drawnNumbers,
    totalWinnings,
    winningTicketsCount,
    newBalance: updatedUser ? updatedUser.balance : 0,
    nextDrawId: String(currentServerDrawId),
    resolvedTickets,
    recentDraws: drawHistoryList,
  });
});

// ============================================================================
// TELEBIRR DEPOSIT SUBMISSION (FOR ADMIN QUEUE & REAL-TIME APPROVAL)
// ============================================================================
app.post('/api/wallet/deposit/sms', (req, res) => {
  const { userId = 'default_user', smsText } = req.body;

  if (!smsText || typeof smsText !== 'string' || smsText.trim().length < 5) {
    return res.status(400).json({ error: 'Please paste the Telebirr confirmation SMS or receipt link.' });
  }

  const user = db.getOrCreateUser(userId);
  const parsed = parseTelebirrText(smsText);

  // Check Anti-Replay: Is receipt already processed?
  if (db.isReceiptProcessed(parsed.receiptNo)) {
    return res.status(400).json({
      error: `Receipt #${parsed.receiptNo} has already been approved and credited! (Anti-Replay Protection)`,
    });
  }

  // Add to admin approval queue
  const deposit = db.addDepositRequest({
    userId: user.userId,
    userName: user.name,
    rawText: smsText.trim(),
    receiptNo: parsed.receiptNo,
    amount: parsed.amount,
    senderName: parsed.senderName,
    senderPhone: parsed.senderPhone,
    receiptTimestamp: parsed.timestamp,
    notes: 'Submitted via Telebirr Cashier modal',
  });

  res.json({
    success: true,
    status: 'pending',
    depositId: deposit.id,
    receiptNo: parsed.receiptNo,
    amount: parsed.amount,
    message: `Deposit request for ${parsed.amount.toFixed(2)} ETB (Ref: ${parsed.receiptNo}) submitted for Telebirr verification!`,
    newBalance: user.balance,
  });
});

// ============================================================================
// WITHDRAWAL REQUEST
// ============================================================================
app.post('/api/wallet/withdraw', (req, res) => {
  const { userId = 'default_user', phone, accountName, amount } = req.body;

  if (!phone || !accountName) {
    return res.status(400).json({ error: 'Phone number and account name are required.' });
  }

  const withdrawAmount = Number(amount);
  if (isNaN(withdrawAmount) || withdrawAmount < 50) {
    return res.status(400).json({ error: 'Minimum withdrawal amount is 50.00 ETB.' });
  }

  const user = db.getOrCreateUser(userId);

  if (user.balance < withdrawAmount) {
    return res.status(400).json({
      error: `Insufficient balance! Available: ${user.balance.toFixed(2)} ETB.`,
    });
  }

  const updateRes = db.updateUserBalance(
    userId,
    -withdrawAmount,
    'withdrawal',
    `Telebirr Withdrawal to ${phone} (${accountName})`
  );

  if (!updateRes.success) {
    return res.status(400).json({ error: updateRes.error || 'Withdrawal failed.' });
  }

  res.json({
    success: true,
    newBalance: updateRes.newBalance,
    message: `Withdrawal request for ${withdrawAmount.toFixed(2)} ETB submitted to Telebirr (${phone})!`,
  });
});

// ============================================================================
// VIP DAILY RELOAD BONUS CLAIM
// ============================================================================
app.post('/api/wallet/claim-bonus', (req, res) => {
  const { userId = 'default_user', amount = 50 } = req.body;
  const numAmount = Number(amount);
  const user = db.getOrCreateUser(userId);
  const updateRes = db.updateUserBalance(
    user.userId,
    numAmount,
    'win',
    `VIP Daily Reload Bonus (+${numAmount.toFixed(2)} ETB)`
  );

  if (!updateRes.success) {
    return res.status(400).json({ error: updateRes.error || 'Failed to claim reload bonus.' });
  }

  res.json({
    success: true,
    newBalance: updateRes.newBalance,
    message: `Successfully claimed +${numAmount.toFixed(2)} ETB VIP Daily Bonus!`,
  });
});

// ============================================================================
// ADMIN PANEL API ENDPOINTS
// ============================================================================
app.get('/api/admin/deposits', (req, res) => {
  const pending = db.getPendingDeposits();
  const all = db.getAllDeposits();
  const stats = db.getStats();
  res.json({ success: true, pending, all, stats });
});

app.post('/api/admin/deposits/:id/approve', (req, res) => {
  const depositId = req.params.id;
  const { adminName = 'Admin' } = req.body;
  const result = db.approveDeposit(depositId, adminName);
  if (!result.success) {
    return res.status(400).json({ success: false, error: result.error });
  }
  res.json({
    success: true,
    deposit: result.deposit,
    newBalance: result.newBalance,
    stats: db.getStats(),
  });
});

app.post('/api/admin/deposits/:id/reject', (req, res) => {
  const depositId = req.params.id;
  const { reason = 'Invalid or unverified receipt', adminName = 'Admin' } = req.body;
  const result = db.rejectDeposit(depositId, reason, adminName);
  if (!result.success) {
    return res.status(400).json({ success: false, error: result.error });
  }
  res.json({
    success: true,
    deposit: result.deposit,
    stats: db.getStats(),
  });
});

app.get('/api/admin/stats', (req, res) => {
  res.json({ success: true, stats: db.getStats() });
});

app.get('/api/admin/users', (req, res) => {
  res.json({ success: true, users: db.getAllUsers() });
});

app.post('/api/admin/users/adjust', (req, res) => {
  const { userId, amount, isCredit, reason, adminName = 'Admin' } = req.body;
  const result = db.manualAdjustBalance(userId, Number(amount), Boolean(isCredit), reason || 'Admin adjustment', adminName);
  if (!result.success) {
    return res.status(400).json({ success: false, error: result.error });
  }
  res.json({
    success: true,
    newBalance: result.newBalance,
    stats: db.getStats(),
  });
});

app.get('/api/admin/audit', (req, res) => {
  res.json({ success: true, auditLogs: db.getAuditLogs() });
});

// Catch-all 404 for unrecognized API requests
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ============================================================================
// VITE INTEGRATION & SSR FOR DEV / PROD
// ============================================================================
if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom',
  });
  app.use(vite.middlewares);

  app.get('*', async (req, res, next) => {
    const url = req.originalUrl;
    try {
      let template = await import('fs').then((fs) =>
        fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8')
      );
      template = await vite.transformIndexHtml(url, template);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
} else {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`FAST KENO Applet Server running on http://0.0.0.0:${PORT}`);
});
