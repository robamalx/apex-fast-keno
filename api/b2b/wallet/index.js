/**
 * Next.js / Serverless API Route: /api/b2b/wallet
 * Secure proxy that forwards incoming B2B Seamless Wallet debit/credit requests
 * directly to the Cloudflare Worker at [REPLACE_WITH_WORKER_URL]/api/b2b/wallet
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Base URL for Cloudflare Worker
  const workerBaseUrl =
    process.env.WORKER_URL ||
    process.env.CLOUDFLARE_WORKER_URL ||
    'https://apex-keno-bot.robinsonslmn.workers.dev';

  const targetUrl = `${workerBaseUrl.replace(/\/+$/, '')}/api/b2b/wallet`;

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        // Keep as string if parsing fails
      }
    }

    const forwardHeaders = {
      'Content-Type': 'application/json',
    };

    if (req.headers && req.headers['authorization']) {
      forwardHeaders['Authorization'] = req.headers['authorization'];
    }

    const upstreamResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: forwardHeaders,
      body: typeof body === 'object' ? JSON.stringify(body) : body,
    });

    const statusCode = upstreamResponse.status;
    const contentType = upstreamResponse.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const data = await upstreamResponse.json();
      return res.status(statusCode).json(data);
    } else {
      const text = await upstreamResponse.text();
      return res.status(statusCode).send(text);
    }
  } catch (error) {
    console.error('B2B Wallet proxy error:', error);
    return res.status(502).json({
      error: 'Failed to connect to B2B wallet provider',
      details: error?.message || String(error),
    });
  }
}
