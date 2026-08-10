// Vercel serverless function — proxies frontend requests to Apps Script backend
// This keeps your Apps Script URL private and handles the redirect quirk
// Requires two environment variables in Vercel:
//   APPS_SCRIPT_URL — your Apps Script Web App /exec URL
//   PROXY_SHARED_SECRET — a secret string shared with Apps Script Router.gs

module.exports = async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { fn, args, secret } = req.body || {};

  // Validate request structure
  if (!fn || !secret) {
    return res.status(400).json({ error: 'Missing required fields: fn and secret' });
  }

  // Verify the shared secret
  if (secret !== process.env.PROXY_SHARED_SECRET) {
    return res.status(403).json({ error: 'Invalid secret' });
  }

  if (!process.env.APPS_SCRIPT_URL) {
    return res.status(500).json({ error: 'APPS_SCRIPT_URL not configured' });
  }

  try {
    // Apps Script /exec URLs have a quirk: they redirect POST to GET
    // We need to follow the redirect manually and re-issue the POST
    const response = await fetch(process.env.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fn, args, secret }),
      redirect: 'manual', // Don't auto-follow redirects
    });

    // Handle redirect
    if (response.status === 302 || response.status === 301) {
      const redirectUrl = response.headers.get('location');
      if (!redirectUrl) {
        throw new Error('Redirect without location header');
      }

      // Re-issue POST to the redirect target
      const finalResponse = await fetch(redirectUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fn, args, secret }),
      });

      const data = await finalResponse.json();
      return res.status(finalResponse.status).json(data);
    }

    // No redirect, return response directly
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ error: 'Proxy request failed: ' + error.message });
  }
};
