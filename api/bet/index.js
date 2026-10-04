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
  const drawId = body?.drawId || String(Date.now()).slice(-9);

  if (!telegramId) {
    return res.status(400).json({ error: 'Missing telegram_id or userId' });
  }

  const parsedBetAmount = parseFloat(betAmount);
  if (isNaN(parsedBetAmount) || parsedBetAmount <= 0) {
    return res.status(400).json({ error: 'Invalid bet amount' });
  }

  const formattedNumbers = Array.isArray(chosenNumbers)
    ? chosenNumbers.map(Number).filter((n) => !isNaN(n) && n >= 1 && n <= 80).sort((a, b) => a - b)
    : [];

  if (formattedNumbers.length === 0) {
    return res.status(400).json({ error: 'Please choose between 1 and 10 numbers' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    // 1. Fetch user's current balances first
    const userResult = await sql`
      SELECT balance, bonus_balance, first_name 
      FROM users 
      WHERE telegram_id = ${String(telegramId)}
    `;

    if (userResult.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult[0];

    // Safely parse numbers (protecting against null/undefined)
    let balance = parseFloat(user.balance) || 0;
    let bonus_balance = parseFloat(user.bonus_balance) || 0;

    // Calculate total playable funds
    const totalFunds = balance + bonus_balance;

    // Check if bet amount exceeds available funds
    if (parsedBetAmount > totalFunds) {
      return res.status(400).json({ error: 'Insufficient funds' });
    }

    // Deduct the bet properly: bonus first, then real balance
    if (parsedBetAmount <= bonus_balance) {
      bonus_balance -= parsedBetAmount;
    } else {
      const remainder = parsedBetAmount - bonus_balance;
      bonus_balance = 0;
      balance -= remainder;
    }

    // Clean floating point precision and prevent negative drift
    balance = Math.max(0, parseFloat(balance.toFixed(2)));
    bonus_balance = Math.max(0, parseFloat(bonus_balance.toFixed(2)));

    // Save updated balances to database
    await sql`
      UPDATE users 
      SET balance = ${balance}, bonus_balance = ${bonus_balance} 
      WHERE telegram_id = ${String(telegramId)}
    `;

    // 2. Insert the new ticket into the tickets table with status = 'waiting'
    const ticketId = 't_' + Math.random().toString(36).substring(2, 9);
    const playerName = user.first_name || 'Player';

    await sql`
      INSERT INTO tickets (id, user_id, draw_id, chosen_numbers, stake, payout, status, created_at)
      VALUES (
        ${ticketId},
        ${String(telegramId)},
        ${String(drawId)},
        ${formattedNumbers},
        ${parsedBetAmount},
        0,
        'waiting',
        NOW()
      )
    `;

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];

    const ticket = {
      id: ticketId,
      drawId: String(drawId),
      userId: String(telegramId),
      userName: playerName,
      userMasked: `${playerName.slice(0, 3)}***`,
      chosenNumbers: formattedNumbers,
      stake: parsedBetAmount,
      payout: 0,
      timestamp: timeStr,
      status: 'waiting',
    };

    const newTotalBalance = parseFloat((balance + bonus_balance).toFixed(2));

    return res.status(200).json({
      success: true,
      ticket,
      ticketsPlacedCount: 1,
      newBalance: newTotalBalance,
      balance: balance,
      bonusBalance: bonus_balance,
      realBalance: balance,
    });
  } catch (error) {
    console.error('API Error in /api/bet:', error);
    return res.status(500).json({ error: 'Failed to process bet and save ticket' });
  }
}
