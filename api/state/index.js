import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  const userId = req.query?.userId || req.query?.telegram_id || req.query?.telegramId || 'default_user';
  const name = req.query?.name || 'Player';

  let balance = 0;
  let bonus_balance = 0;
  let myTickets = [];
  let myBetsHistory = [];
  const currentDrawId = String(Date.now()).slice(-9);

  if (process.env.DATABASE_URL && userId && userId !== 'default_user') {
    try {
      const sql = neon(process.env.DATABASE_URL);

      // 1. Fetch user balance
      const userRes = await sql`
        SELECT balance, bonus_balance, first_name 
        FROM users 
        WHERE telegram_id = ${String(userId)}
      `;

      if (userRes.length > 0) {
        balance = parseFloat(userRes[0].balance) || 0;
        bonus_balance = parseFloat(userRes[0].bonus_balance) || 0;
      }

      // 2. Query the tickets table for this user_id
      const ticketRows = await sql`
        SELECT id, user_id, draw_id, chosen_numbers, stake, payout, status, created_at
        FROM tickets
        WHERE user_id = ${String(userId)}
        ORDER BY created_at DESC
        LIMIT 50
      `;

      const formatted = ticketRows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        drawId: row.draw_id,
        chosenNumbers: Array.isArray(row.chosen_numbers) ? row.chosen_numbers : [],
        stake: parseFloat(row.stake) || 0,
        payout: parseFloat(row.payout) || 0,
        status: row.status,
        timestamp: row.created_at ? new Date(row.created_at).toTimeString().split(' ')[0] : '',
      }));

      // Return tickets with status = 'waiting' in the myTickets array
      myTickets = formatted.filter((t) => t.status === 'waiting');

      // Return tickets with status = 'resolved' in the myBetsHistory array
      myBetsHistory = formatted.filter((t) => t.status === 'resolved');
    } catch (err) {
      console.error('Error in /api/state database fetch:', err);
    }
  }

  return res.status(200).json({
    userId,
    name,
    balance,
    bonus_balance,
    currentDrawId,
    myTickets,
    myBetsHistory,
    recentDraws: [],
    hotNumbers: [7, 12, 23, 38, 45, 56, 64, 78],
    coldNumbers: [3, 19, 28, 31, 49, 52, 60, 73],
    receiverName: 'Robinson Solomon',
    phoneNumber: '0963068117',
  });
}
