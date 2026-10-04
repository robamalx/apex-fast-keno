import { neon } from '@neondatabase/serverless';

// KENO Paytable Matrix
const KENO_PAYTABLE = {
  1: { 1: 3.8 },
  2: { 1: 1.0, 2: 9.0 },
  3: { 2: 2.0, 3: 26.0 },
  4: { 2: 1.0, 3: 5.0, 4: 80.0 },
  5: { 2: 1.0, 3: 3.0, 4: 15.0, 5: 300.0 },
  6: { 3: 1.5, 4: 6.0, 5: 60.0, 6: 1200.0 },
  7: { 3: 1.0, 4: 3.0, 5: 20.0, 6: 150.0, 7: 3000.0 },
  8: { 4: 2.0, 5: 10.0, 6: 60.0, 7: 500.0, 8: 10000.0 },
  9: { 4: 1.5, 5: 5.0, 6: 25.0, 7: 150.0, 8: 1500.0, 9: 25000.0 },
  10: { 0: 2.0, 3: 1.0, 4: 2.0, 5: 4.0, 6: 10.0, 7: 40.0, 8: 200.0, 9: 1000.0, 10: 5000.0 },
};

function calculateMultiplier(picksCount, hitsCount) {
  if (picksCount < 1 || picksCount > 10) return 0;
  const map = KENO_PAYTABLE[picksCount];
  if (!map) return 0;
  return map[hitsCount] ?? 0;
}

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
  const drawId = body?.drawId || req.query?.drawId;
  const clientTickets = body?.tickets || [];

  const drawnNumbers = Array.isArray(body?.drawnNumbers) && body.drawnNumbers.length === 20
    ? body.drawnNumbers
    : generate20Balls();

  const nextDrawId = String(Date.now()).slice(-9);

  let totalWinnings = 0;
  let resolvedTickets = [];
  let newBalance = null;

  if (process.env.DATABASE_URL) {
    try {
      const sql = neon(process.env.DATABASE_URL);

      // 1. Fetch tickets matching the draw_id (or for the user)
      let ticketsToResolve = [];

      if (drawId) {
        ticketsToResolve = await sql`
          SELECT id, user_id, draw_id, chosen_numbers, stake, payout, status
          FROM tickets
          WHERE draw_id = ${String(drawId)} AND status = 'waiting'
        `;
      } else if (telegramId) {
        ticketsToResolve = await sql`
          SELECT id, user_id, draw_id, chosen_numbers, stake, payout, status
          FROM tickets
          WHERE user_id = ${String(telegramId)} AND status = 'waiting'
        `;
      }

      // 2. Update the tickets table for all matching tickets: status = 'resolved' and update payout
      for (const t of ticketsToResolve) {
        const chosenNumbers = Array.isArray(t.chosen_numbers) ? t.chosen_numbers : [];
        const matchedNumbers = chosenNumbers.filter((n) => drawnNumbers.includes(n));
        const matchedCount = matchedNumbers.length;
        const multiplier = calculateMultiplier(chosenNumbers.length, matchedCount);
        const payout = Math.round((parseFloat(t.stake) || 0) * multiplier * 100) / 100;

        // Update database row
        await sql`
          UPDATE tickets
          SET status = 'resolved', payout = ${payout}
          WHERE id = ${t.id}
        `;

        // Credit winnings to user balance
        if (payout > 0) {
          await sql`
            UPDATE users
            SET balance = balance + ${payout}
            WHERE telegram_id = ${t.user_id}
          `;
          if (String(t.user_id) === String(telegramId)) {
            totalWinnings += payout;
          }
        }

        resolvedTickets.push({
          id: t.id,
          userId: t.user_id,
          drawId: t.draw_id,
          chosenNumbers,
          stake: parseFloat(t.stake) || 0,
          payout,
          matchedCount,
          multiplier,
          status: 'resolved',
          drawnNumbers,
        });
      }

      // Also handle any client tickets that might not have been caught by the query
      if (clientTickets.length > 0 && resolvedTickets.length === 0) {
        for (const t of clientTickets) {
          const chosenNumbers = t.chosenNumbers || [];
          const matchedNumbers = chosenNumbers.filter((n) => drawnNumbers.includes(n));
          const matchedCount = matchedNumbers.length;
          const multiplier = calculateMultiplier(chosenNumbers.length, matchedCount);
          const payout = Math.round((parseFloat(t.stake) || 0) * multiplier * 100) / 100;

          if (t.id) {
            await sql`
              UPDATE tickets
              SET status = 'resolved', payout = ${payout}
              WHERE id = ${t.id}
            `;
          }

          if (payout > 0 && telegramId) {
            await sql`
              UPDATE users
              SET balance = balance + ${payout}
              WHERE telegram_id = ${String(telegramId)}
            `;
            totalWinnings += payout;
          }

          resolvedTickets.push({
            ...t,
            status: 'resolved',
            matchedCount,
            multiplier,
            payout,
            drawnNumbers,
          });
        }
      }

      // 3. Fetch latest user balance
      if (telegramId) {
        const userRes = await sql`
          SELECT balance, bonus_balance 
          FROM users 
          WHERE telegram_id = ${String(telegramId)}
        `;
        if (userRes.length > 0) {
          const real = parseFloat(userRes[0].balance) || 0;
          const bonus = parseFloat(userRes[0].bonus_balance) || 0;
          newBalance = parseFloat((real + bonus).toFixed(2));
        }
      }
    } catch (err) {
      console.error('Error resolving draw in database:', err);
    }
  }

  // Fallback for memory/offline mode
  if (resolvedTickets.length === 0 && clientTickets.length > 0) {
    resolvedTickets = clientTickets.map((t) => {
      const chosenNumbers = t.chosenNumbers || [];
      const matchedNumbers = chosenNumbers.filter((n) => drawnNumbers.includes(n));
      const matchedCount = matchedNumbers.length;
      const multiplier = calculateMultiplier(chosenNumbers.length, matchedCount);
      const payout = Math.round((parseFloat(t.stake) || 0) * multiplier * 100) / 100;
      totalWinnings += payout;
      return {
        ...t,
        status: 'resolved',
        matchedCount,
        multiplier,
        payout,
        drawnNumbers,
      };
    });
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
