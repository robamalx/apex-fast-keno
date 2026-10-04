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

  // Basic sanity check on amount
  if (isNaN(amount) || amount < 200) {
    return res.status(400).json({ error: 'Minimum withdrawal is 200 ETB.' });
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

    // Server Validation 1: Real balance check
    if (realBalance < amount) {
      return res.status(400).json({
        error: `Insufficient real balance. Your withdrawable cash balance is ${realBalance.toFixed(2)} ETB (bonus balance cannot be withdrawn).`,
      });
    }

    // 2. Query transactions table to calculate deposits and approved withdrawals history
    const txHistory = await sql`
      SELECT transaction_type, status, amount
      FROM transactions
      WHERE telegram_id = ${String(userId)}
    `;

    let approvedDeposits = 0;
    let pendingDeposits = 0;
    let approvedWithdrawals = 0;

    txHistory.forEach((row) => {
      const type = String(row.transaction_type).toUpperCase();
      const status = String(row.status).toUpperCase();
      const val = parseFloat(row.amount) || 0;

      if (type === 'DEPOSIT') {
        if (status === 'APPROVED') {
          approvedDeposits += val;
        } else {
          pendingDeposits += val;
        }
      } else if (type === 'WITHDRAWAL') {
        if (status === 'APPROVED') {
          approvedWithdrawals += 1;
        }
      }
    });

    // Rule 1: Lifetime approved deposits must be at least 200 ETB
    if (approvedDeposits < 200) {
      return res.status(400).json({
        error: `Deposit Rule Failed. Approved: ${approvedDeposits} ETB | Pending: ${pendingDeposits} ETB. You must have 200 ETB in APPROVED deposits.`,
      });
    }

    // Rule 2: Dynamic minimum withdrawal (1000 ETB for first-time, 200 ETB for subsequent)
    const minWithdrawal = approvedWithdrawals === 0 ? 1000 : 200;

    if (amount < minWithdrawal) {
      if (approvedWithdrawals === 0) {
        return res.status(400).json({
          error: 'Your first withdrawal must be at least 1000 ETB. Subsequent withdrawals require only 200 ETB.',
          minWithdrawal: 1000,
          approvedWithdrawals: 0,
        });
      } else {
        return res.status(400).json({
          error: 'Minimum withdrawal is 200 ETB.',
          minWithdrawal: 200,
          approvedWithdrawals,
        });
      }
    }

    // 3. Deduct amount from user's real balance
    const newBalance = Math.max(0, parseFloat((realBalance - amount).toFixed(2)));
    await sql`
      UPDATE users 
      SET balance = ${newBalance} 
      WHERE telegram_id = ${String(userId)}
    `;

    // 4. Insert record into transactions table letting PostgreSQL auto-generate numeric ID
    let dbTxId;
    try {
      const insertRes = await sql`
        INSERT INTO transactions (
          telegram_id, 
          transaction_type, 
          amount, 
          phone_number, 
          account_name, 
          status, 
          created_at
        )
        VALUES (
          ${String(userId)},
          'WITHDRAWAL',
          ${amount},
          ${String(phoneNumber)},
          ${String(accountName)},
          'PENDING',
          NOW()
        )
        RETURNING id
      `;
      if (insertRes && insertRes.length > 0) {
        dbTxId = insertRes[0].id;
      }
    } catch (insertErr) {
      try {
        const fallbackRes = await sql`
          INSERT INTO transactions (
            telegram_id, 
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
          RETURNING id
        `;
        if (fallbackRes && fallbackRes.length > 0) {
          dbTxId = fallbackRes[0].id;
        }
      } catch (compactErr) {
        console.warn('Could not insert into transactions table:', compactErr);
      }
    }

    // 5. Send Telegram notification to Admin Group with Interactive Inline Buttons using auto-generated dbTxId
    const BOT_TOKEN = '8230347188:AAHH0dDjBYhuq7TuXr-Gr7dviZDha_wxTbQ';
    const ADMIN_CHAT_ID = '-1004315987317';

    const withdrawalBadge = approvedWithdrawals === 0 ? '🆕 FIRST-TIME WITHDRAWAL' : `🔁 WITHDRAWAL #${approvedWithdrawals + 1}`;

    const messageText = `🚨 <b>NEW WITHDRAWAL REQUEST</b> 🚨\n` +
      `<b>Type:</b> <i>${withdrawalBadge}</i>\n\n` +
      `<b>Transaction ID:</b> <code>${dbTxId || 'Pending'}</code>\n` +
      `<b>Player ID:</b> <code>${userId}</code>\n` +
      `<b>Name:</b> ${accountName}\n` +
      `<b>Phone:</b> <code>${phoneNumber}</code>\n` +
      `<b>Amount:</b> <b>${amount.toFixed(2)} ETB</b>\n` +
      `<b>Status:</b> ⏳ <b>PENDING</b>\n` +
      `<b>Timestamp:</b> ${new Date().toISOString()}`;

    try {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: ADMIN_CHAT_ID,
          text: messageText,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ Approve', callback_data: `wd_approve_${dbTxId}` },
                { text: '❌ Reject', callback_data: `wd_reject_${dbTxId}` },
              ],
            ],
          },
        }),
      });
    } catch (tgErr) {
      console.error('Failed to send Telegram admin notification:', tgErr);
    }

    // 6. Return updated balance and database generated ID to frontend
    return res.status(200).json({
      success: true,
      newBalance,
      amount,
      id: dbTxId,
      txId: dbTxId,
      message: `Withdrawal request for ${amount.toFixed(2)} ETB submitted successfully.`,
    });
  } catch (error) {
    console.error('Error processing withdrawal:', error);
    return res.status(500).json({ error: 'Server error processing withdrawal.' });
  }
}
