import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const telegramId = req.query.telegram_id;

  if (!telegramId) {
    return res.status(400).json({ error: 'Missing telegram_id' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const result = await sql`SELECT balance, bonus_balance, first_name FROM users WHERE telegram_id = ${telegramId}`;

    if (result.length === 0) {
      return res.status(200).json({ balance: '0.00', first_name: 'Player' });
    }

    // Safely handle null or undefined values
    const realBalance = parseFloat(result[0].balance) || 0;
    const bonusBalance = parseFloat(result[0].bonus_balance) || 0;
    const totalPlayableBalance = (realBalance + bonusBalance).toFixed(2);

    return res.status(200).json({ 
      balance: totalPlayableBalance,
      first_name: result[0].first_name || 'Player'
    });
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ error: 'Failed to fetch balance' });
  }
}
