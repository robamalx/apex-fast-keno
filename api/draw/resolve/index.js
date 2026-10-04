import { neon } from '@neondatabase/serverless';

// Standard KENO Paytable Matrix
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
  
  // Calculate current 60s global draw ID if not passed
  const roundDuration = 60 * 1000;
  const computedDrawId = String(Math.floor(Date.now() / roundDuration));
  const drawId = body?.drawId || req.query?.drawId || computedDrawId;
  const clientTickets = body?.tickets || [];
  const nextDrawId = String(Number(drawId) + 1);

  let drawnNumbers = [];
  let totalWinnings = 0;
  let resolvedTickets = [];
  let newBalance = null;

  if (process.env.DATABASE_URL) {
    try {
      const sql = neon(process.env.DATABASE_URL);

      // 1. Check if drawn_numbers already exist in the draws table for this drawId
      const existingDraw = await sql`
        SELECT id, drawn_numbers 
        FROM draws 
        WHERE id = ${String(drawId)}
      `;

      if (existingDraw.length > 0 && Array.isArray(existingDraw[0].drawn_numbers) && existingDraw[0].drawn_numbers.length === 20) {
        // IF THEY EXIST: Return those exact numbers
        drawnNumbers = existingDraw[0].drawn_numbers;
      } else {
        // IF THEY DO NOT EXIST: Generate 20 numbers and insert into draws table
        const generated = generate20Balls();
        try {
          await sql`
            INSERT INTO draws (id, drawn_numbers, created_at)
            VALUES (${String(drawId)}, ${generated}, NOW())
            ON CONFLICT (id) DO NOTHING
          `;
        } catch (insertErr) {
          console.warn('Concurrent draw insert handled:', insertErr);
        }

        // Fetch back to ensure all concurrent requests get the exact same numbers
        const canonicalDraw = await sql`
          SELECT id, drawn_numbers 
          FROM draws 
          WHERE id = ${String(drawId)}
        `;

        if (canonicalDraw.length > 0 && Array.isArray(canonicalDraw[0].drawn_numbers) && canonicalDraw[0].drawn_numbers.length === 20) {
          drawnNumbers = canonicalDraw[0].drawn_numbers;
        } else {
          drawnNumbers = generated;
        }
      }

      // 2. Fetch all waiting tickets matching this draw_id
      let ticketsToResolve = await sql`
        SELECT id, user_id, draw_id, chosen_numbers, stake, payout, status
        FROM tickets
        WHERE draw_id = ${String(drawId)} AND status = 'waiting'
      `;

      if (ticketsToResolve.length === 0 && telegramId) {
        ticketsToResolve = await sql`
          SELECT id, user_id, draw_id, chosen_numbers, stake, payout, status
          FROM tickets
          WHERE user_id = ${String(telegramId)} AND status = 'waiting'
        `;
      }

      // 3. Resolve all user tickets against these unified numbers
      for (const t of ticketsToResolve) {
        const chosenNumbers = Array.isArray(t.chosen_numbers) ? t.chosen_numbers : [];
        const matchedNumbers = chosenNumbers.filter((n) => drawnNumbers.includes(n));
        const matchedCount = matchedNumbers.length;
        const multiplier = calculateMultiplier(chosenNumbers.length, matchedCount);
        const payout = Math.round((parseFloat(t.stake) || 0) * multiplier * 100) / 100;

        // Update database row to status = 'resolved'
        await sql`
          UPDATE tickets
          SET status = 'resolved', payout = ${payout}
          WHERE id = ${t.id}
        `;

        // Credit winnings to user cash balance
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

      // 4. Also resolve any active client tickets if passed in request body
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

      // 5. Fetch latest updated balance
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

  // Fallback if no database
  if (drawnNumbers.length === 0) {
    drawnNumbers = generate20Balls();
  }

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
    drawId,
    drawnNumbers,
    totalWinnings,
    newBalance,
    nextDrawId,
    resolvedTickets,
    recentDraws: [
      {
        drawId,
        timestamp: new Date().toTimeString().split(' ')[0],
        drawnNumbers,
        totalBets: 750 + Math.floor(Math.random() * 200),
        winnersCount: 95 + Math.floor(Math.random() * 40),
      },
    ],
  });
}
