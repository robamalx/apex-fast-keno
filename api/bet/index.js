import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  }

  const telegramId = body?.telegram_id || body?.userId || body?.telegramId;
  const betAmount = body?.stake || body?.amount || body?.betAmount;
  const chosenNumbers = body?.chosenNumbers || [];

  if (!telegramId) {
    return res.status(400).json({ error: 'Missing telegram_id' });
  }

  const amountToDeduct = parseFloat(betAmount);
  if (isNaN(amountToDeduct) || amountToDeduct <= 0) {
    return res.status(400).json({ error: 'Invalid bet amount' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    // 1. Fetch user's current balances first
    const userResult = await sql`SELECT balance, bonus_balance, first_name FROM users WHERE telegram_id = ${telegramId}`;

    if (userResult.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult[0];

    // 2. Do the math safely in JavaScript
    let realBalance = parseFloat(user.balance) || 0;
    let bonusBalance = parseFloat(user.bonus_balance) || 0;

    if (realBalance + bonusBalance < amountToDeduct) {
      return res.status(400).json({ error: 'Insufficient funds' });
    }

    if (bonusBalance >= amountToDeduct) {
      bonusBalance -= amountToDeduct;
    } else {
      let remaining = amountToDeduct - bonusBalance;
      bonusBalance = 0;
      realBalance -= remaining;
    }

    // Clean floating point precision
    realBalance = Math.max(0, parseFloat(realBalance.toFixed(2)));
    bonusBalance = Math.max(0, parseFloat(bonusBalance.toFixed(2)));

    // 3. Simple UPDATE query to save newly calculated balances
    await sql`UPDATE users SET balance = ${realBalance}, bonus_balance = ${bonusBalance} WHERE telegram_id = ${telegramId}`;

    // 4. Build ticket / ledger entry
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const ticketId = 't_' + Math.random().toString(36).substring(2, 9);
    const playerName = user.first_name || 'Player';

    const ticket = {
      id: ticketId,
      drawId: body?.drawId || String(Date.now()).slice(-9),
      userId: String(telegramId),
      userName: playerName,
      userMasked: `${playerName.slice(0, 3)}***`,
      chosenNumbers: Array.isArray(chosenNumbers) ? [...chosenNumbers].sort((a, b) => a - b) : [],
      stake: amountToDeduct,
      timestamp: timeStr,
      status: 'waiting',
    };

    // Optional ticket insert if tickets table exists in user's database
    try {
      await sql`
        INSERT INTO tickets (ticket_id, telegram_id, chosen_numbers, stake, status, created_at)
        VALUES (${ticketId}, ${telegramId}, ${JSON.stringify(ticket.chosenNumbers)}, ${amountToDeduct}, 'waiting', NOW())
      `;
    } catch {
      // Table may not exist; continue safely
    }

    const newPlayableBalance = parseFloat((realBalance + bonusBalance).toFixed(2));

    return res.status(200).json({
      success: true,
      ticket,
      ticketsPlacedCount: 1,
      newBalance: newPlayableBalance,
      balance: newPlayableBalance,
      realBalance,
      bonusBalance,
    });
  } catch (error) {
    console.error('API Error in bet handler:', error);
    return res.status(500).json({ error: 'Failed to process bet' });
  }
}
