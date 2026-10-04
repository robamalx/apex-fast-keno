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

  const parsedBetAmount = parseFloat(betAmount);
  if (isNaN(parsedBetAmount) || parsedBetAmount <= 0) {
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

    // Safely parse numbers (protecting against null/undefined)
    let balance = parseFloat(user.balance) || 0;
    let bonus_balance = parseFloat(user.bonus_balance) || 0;

    // Calculate total playable funds
    const totalFunds = balance + bonus_balance;

    // Check if bet amount exceeds available funds
    if (parsedBetAmount > totalFunds) {
      return res.status(400).json({ error: 'Insufficient Funds' });
    }

    // Deduct the bet properly:
    if (parsedBetAmount <= bonus_balance) {
      // Deduct entirely from bonus_balance
      bonus_balance -= parsedBetAmount;
    } else {
      // Drain bonus_balance to 0, subtract remainder from main balance
      const remainder = parsedBetAmount - bonus_balance;
      bonus_balance = 0;
      balance -= remainder;
    }

    // Clean floating point precision and prevent negative drift
    balance = Math.max(0, parseFloat(balance.toFixed(2)));
    bonus_balance = Math.max(0, parseFloat(bonus_balance.toFixed(2)));

    // 3. Save updated balances to database
    await sql`UPDATE users SET balance = ${balance}, bonus_balance = ${bonus_balance} WHERE telegram_id = ${telegramId}`;

    // 4. Build ticket entry
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
      stake: parsedBetAmount,
      timestamp: timeStr,
      status: 'waiting',
    };

    // Optional ticket insert if tickets table exists
    try {
      await sql`
        INSERT INTO tickets (ticket_id, telegram_id, chosen_numbers, stake, status, created_at)
        VALUES (${ticketId}, ${telegramId}, ${JSON.stringify(ticket.chosenNumbers)}, ${parsedBetAmount}, 'waiting', NOW())
      `;
    } catch {
      // Optional table fallback
    }

    const newTotalBalance = parseFloat((balance + bonus_balance).toFixed(2));

    return res.status(200).json({
      success: true,
      ticket,
      ticketsPlacedCount: 1,
      newBalance: newTotalBalance,
      balance: newTotalBalance,
      realBalance: balance,
      bonusBalance: bonus_balance,
    });
  } catch (error) {
    console.error('API Error in bet handler:', error);
    return res.status(500).json({ error: 'Failed to process bet' });
  }
}
