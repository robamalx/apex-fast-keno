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

  const userId = body?.userId || body?.telegram_id || body?.telegramId;
  const rawAmount = body?.amount || body?.withdrawAmount;
  const phoneNumber = body?.phoneNumber || body?.phone || '';
  const accountName = body?.accountName || body?.name || '';

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId or telegram_id' });
  }

  const amount = parseFloat(rawAmount);

  // Server Validation 1: Minimum withdrawal is 1000 ETB
  if (isNaN(amount) || amount < 1000) {
    return res.status(400).json({ error: 'Minimum withdrawal is 1000 ETB.' });
  }

  if (!phoneNumber || !accountName) {
    return res.status(400).json({ error: 'Please provide phone number and account name.' });
  }

  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: 'Database connection not configured' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    // 1. Fetch user's real balance (ignoring bonus_balance)
    const userRes = await sql`
      SELECT balance, bonus_balance, first_name 
      FROM users 
      WHERE telegram_id = ${String(userId)}
    `;

    if (userRes.length === 0) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    const realBalance = parseFloat(userRes[0].balance) || 0;

    // Server Validation 2: Reject if user's real balance < requested amount (ignoring bonus)
    if (realBalance < amount) {
      return res.status(400).json({
        error: `Insufficient real balance. Your withdrawable cash balance is ${realBalance.toFixed(2)} ETB (bonus balance cannot be withdrawn).`,
      });
    }

    // Server Validation 3: Query transactions table to sum all approved deposits for this user
    // (transaction_type = 'DEPOSIT' AND status = 'APPROVED')
    let totalDeposited = 0;
    try {
      const depositRes = await sql`
        SELECT COALESCE(SUM(amount), 0) AS total_deposits
        FROM transactions
        WHERE (user_id = ${String(userId)} OR telegram_id = ${String(userId)})
          AND UPPER(transaction_type) = 'DEPOSIT'
          AND UPPER(status) = 'APPROVED'
      `;

      if (depositRes.length > 0) {
        totalDeposited = parseFloat(depositRes[0].total_deposits) || 0;
      }
    } catch (txQueryErr) {
      // If table has alternate column names or doesn't exist yet, query fallback
      console.warn('Transaction table query notice:', txQueryErr);
    }

    if (totalDeposited < 200) {
      return res.status(400).json({
        error: 'You must deposit at least 200 ETB total to unlock withdrawals.',
        totalDeposited,
        requiredDeposit: 200,
      });
    }

    // 2. Deduct amount from user's real balance
    const newBalance = Math.max(0, parseFloat((realBalance - amount).toFixed(2)));
    await sql`
      UPDATE users 
      SET balance = ${newBalance} 
      WHERE telegram_id = ${String(userId)}
    `;

    // 3. Insert record into transactions table with status = 'PENDING' and transaction_type = 'WITHDRAWAL'
    const txId = 'tx_wd_' + Math.random().toString(36).substring(2, 9);
    try {
      await sql`
        INSERT INTO transactions (
          id, 
          user_id, 
          telegram_id, 
          transaction_type, 
          amount, 
          phone_number, 
          account_name, 
          status, 
          created_at
        )
        VALUES (
          ${txId},
          ${String(userId)},
          ${String(userId)},
          'WITHDRAWAL',
          ${amount},
          ${String(phoneNumber)},
          ${String(accountName)},
          'PENDING',
          NOW()
        )
      `;
    } catch (insertErr) {
      // Fallback for compact transactions schema
      try {
        await sql`
          INSERT INTO transactions (
            user_id, 
            transaction_type, 
            amount, 
            status, 
            created_at
          )
          VALUES (
            ${String(userId)},
            'WITHDRAWAL',
            ${amount},
            'PENDING',
            NOW()
          )
        `;
      } catch (compactErr) {
        console.warn('Could not insert into transactions table:', compactErr);
      }
    }

    // 4. Send Telegram notification to Admin Group
    const BOT_TOKEN = '8230347188:AAHH0dDjBYhuq7TuXr-Gr7dviZDha_wxTbQ';
    const ADMIN_CHAT_ID = '-1004315987317';

    const messageText = `🚨 <b>NEW WITHDRAWAL REQUEST</b> 🚨\n` +
      `<b>Player ID:</b> <code>${userId}</code>\n` +
      `<b>Name:</b> ${accountName}\n` +
      `<b>Phone:</b> <code>${phoneNumber}</code>\n` +
      `<b>Amount:</b> <b>${amount.toFixed(2)} ETB</b>\n` +
      `<b>Timestamp:</b> ${new Date().toISOString()}`;

    try {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: ADMIN_CHAT_ID,
          text: messageText,
          parse_mode: 'HTML',
        }),
      });
    } catch (tgErr) {
      console.error('Failed to send Telegram admin notification:', tgErr);
    }

    // 5. Return updated balance to frontend
    return res.status(200).json({
      success: true,
      newBalance,
      amount,
      message: `Withdrawal request for ${amount.toFixed(2)} ETB submitted successfully.`,
    });
  } catch (error) {
    console.error('Error processing withdrawal:', error);
    return res.status(500).json({ error: 'Server error processing withdrawal.' });
  }
}
