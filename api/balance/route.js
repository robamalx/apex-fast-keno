import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const telegramId = searchParams.get('telegram_id');

  if (!telegramId) {
    return NextResponse.json({ error: 'Missing telegram_id' }, { status: 400 });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const result = await sql`SELECT balance, first_name FROM users WHERE telegram_id = ${telegramId}`;

    if (result.length === 0) {
      return NextResponse.json({ balance: '0.00', first_name: 'Player' });
    }

    return NextResponse.json({ 
      balance: result[0].balance,
      first_name: result[0].first_name 
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch balance' }, { status: 500 });
  }
}
