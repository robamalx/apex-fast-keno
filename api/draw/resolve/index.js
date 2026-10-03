import { neon } from '@neondatabase/serverless';
import { calculateMultiplier } from '../../../src/utils/paytable.ts';

function generate20Balls() {
  const balls = new Set();
  while (balls.size < 20) {
    balls.add(Math.floor(Math.random() * 80) + 1);
  }
  return Array.from(balls);
}

export default async function handler(req, res) {
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  const telegramId = body?.userId || body?.telegram_id || body?.telegramId || req.query?.userId || req.query?.telegram_id;
  const tickets = body?.tickets || [];

  const drawnNumbers = generate20Balls();
  const nextDrawId = String(Date.now()).slice(-9);

  let totalWinnings = 0;
  const resolvedTickets = tickets.map((t) => {
    const chosenNumbers = t.chosenNumbers || [];
    const matchedNumbers = chosenNumbers.filter((n) => drawnNumbers.includes(n));
    const matchedCount = matchedNumbers.length;
    const multiplier = calculateMultiplier(chosenNumbers.length, matchedCount);
    const payout = Math.round((parseFloat(t.stake) || 0) * multiplier * 100) / 100;
    return {
      ...t,
      status: payout > 0 ? 'win' : 'loss',
      matchedCount,
      multiplier,
      payout,
      drawnNumbers,
    };
  });

  totalWinnings = resolvedTickets.reduce((acc, t) => acc + (t.payout || 0), 0);

  let newBalance = null;

  if (process.env.DATABASE_URL && telegramId) {
    try {
      const sql = neon(process.env.DATABASE_URL);
      if (totalWinnings > 0) {
        await sql`UPDATE users SET balance = balance + ${totalWinnings} WHERE telegram_id = ${telegramId}`;
      }
      const userRes = await sql`SELECT balance, bonus_balance FROM users WHERE telegram_id = ${telegramId}`;
      if (userRes.length > 0) {
        const real = parseFloat(userRes[0].balance) || 0;
        const bonus = parseFloat(userRes[0].bonus_balance) || 0;
        newBalance = parseFloat((real + bonus).toFixed(2));
      }
    } catch (err) {
      console.error('Error crediting draw winnings in DB:', err);
    }
  }

  return res.status(200).json({
    success: true,
    drawnNumbers,
    totalWinnings,
    newBalance,
    nextDrawId,
    resolvedTickets,
    recentDraws: [
      {
        drawId: nextDrawId,
        timestamp: new Date().toTimeString().split(' ')[0],
        drawnNumbers,
        totalBets: 750 + Math.floor(Math.random() * 200),
        winnersCount: 95 + Math.floor(Math.random() * 40),
      },
    ],
  });
}
