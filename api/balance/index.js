import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  // Allow GET requests
  if (req.method && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Extract telegram_id from query params
  let telegramId = req.query?.telegram_id;
  if (!telegramId && req.url) {
    try {
      const url = new URL(req.url, `http://${req.headers?.host || 'localhost'}`);
      telegramId = url.searchParams.get('telegram_id');
    } catch {
      // Ignore URL parse error
    }
  }

  if (!telegramId) {
    return res.status(400).json({ error: 'Missing telegram_id' });
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return res.status(500).json({ error: 'DATABASE_URL environment variable is not configured' });
  }

  try {
    const sql = neon(databaseUrl);
    const result = await sql`SELECT balance, first_name FROM users WHERE telegram_id = ${telegramId}`;

    if (result.length === 0) {
      return res.status(200).json({ 
        balance: '0.00', 
        first_name: 'Player' 
      });
    }

    return res.status(200).json({ 
      balance: String(result[0].balance ?? '0.00'),
      first_name: result[0].first_name || 'Player' 
    });
  } catch (error) {
    console.error('Neon query error:', error);
    return res.status(500).json({ error: 'Failed to fetch balance from database' });
  }
}
