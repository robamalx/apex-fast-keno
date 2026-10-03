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

  const telegramId = body?.userId || body?.telegram_id || body?.telegramId;
  const chosenNumbers = body?.chosenNumbers;
  const stake = body?.stake;

  if (!telegramId) {
    return res.status(400).json({ error: 'Missing userId / telegram_id' });
  }

  if (!Array.isArray(chosenNumbers) || chosenNumbers.length < 1 || chosenNumbers.length > 10) {
    return res.status(400).json({ error: 'Please select between 1 and 10 numbers.' });
  }

  const parsedStake = parseFloat(stake);
  if (isNaN(parsedStake) || parsedStake <= 0) {
    return res.status(400).json({ error: 'Invalid stake amount.' });
  }

  try {
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ error: 'DATABASE_URL is not configured.' });
    }

    const sql = neon(process.env.DATABASE_URL);
    const userResult = await sql`
      SELECT id, telegram_id, balance, bonus_balance, first_name 
      FROM users 
      WHERE telegram_id = ${String(telegramId)}
      LIMIT 1
    `;

    if (userResult.length === 0) {
      return res.status(404).json({ error: 'Player account not found.' });
    }

    const user = userResult[0];

    // Safely handle null or undefined values using parseFloat with || 0
    const realBalance = parseFloat(user.balance) || 0;
    const bonusBalance = parseFloat(user.bonus_balance) || 0;
    const totalPlayableBalance = realBalance + bonusBalance;

    // Check if the user has enough combined funds (balance + bonus_balance)
    if (totalPlayableBalance < parsedStake) {
      return res.status(400).json({
        error: `Insufficient balance! Available: ${totalPlayableBalance.toFixed(2)} ETB (Stake: ${parsedStake.toFixed(2)} ETB).`,
      });
    }

    // Deduct from bonus_balance first
    let newBonusBalance = bonusBalance;
    let newRealBalance = realBalance;

    if (bonusBalance >= parsedStake) {
      newBonusBalance = bonusBalance - parsedStake;
    } else {
      // If the bet is larger than bonus_balance, deduct remainder from main balance
      const remainder = parsedStake - bonusBalance;
      newBonusBalance = 0;
      newRealBalance = realBalance - remainder;
    }

    // Clamp to prevent negative values from floating point inaccuracies
    newBonusBalance = Math.max(0, newBonusBalance);
    newRealBalance = Math.max(0, newRealBalance);

    // Update database balances
    await sql`
      UPDATE users 
      SET balance = ${newRealBalance.toFixed(2)}, 
          bonus_balance = ${newBonusBalance.toFixed(2)} 
      WHERE telegram_id = ${String(telegramId)}
    `;

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const ticketId = 't_' + Math.random().toString(36).substring(2, 9);
    const playerName = user.first_name || 'Player';

    const ticket = {
      id: ticketId,
      drawId: body.drawId || String(Date.now()).slice(-9),
      userId: String(telegramId),
      userName: playerName,
      userMasked: `${playerName.slice(0, 3)}***`,
      chosenNumbers: [...chosenNumbers].sort((a, b) => a - b),
      stake: parsedStake,
      timestamp: timeStr,
      status: 'waiting',
    };

    const combinedNewBalance = parseFloat((newRealBalance + newBonusBalance).toFixed(2));

    return res.status(200).json({
      success: true,
      ticket,
      ticketsPlacedCount: 1,
      newBalance: combinedNewBalance,
    });
  } catch (error) {
    console.error('API /api/bet Error:', error);
    return res.status(500).json({ error: 'Failed to place bet. Please try again.' });
  }
}
