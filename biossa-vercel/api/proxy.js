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

  const { fn, args } = req.body || {};

  // Validate request structure
  if (!fn) {
    return res.status(400).json({ error: 'Missing required field: fn' });
  }

  // Add secret from environment variables (server-side, not exposed to client)
  const secret = process.env.PROXY_SHARED_SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'PROXY_SHARED_SECRET not configured' });
  }

  if (!process.env.APPS_SCRIPT_URL) {
    return res.status(500).json({ error: 'APPS_SCRIPT_URL not configured' });
  }

  // Safely parse a fetch Response as JSON. If it isn't JSON (e.g. Apps
  // Script/Google returned an HTML error or login page), return enough
  // diagnostic info to see why, instead of throwing an opaque
  // "Unexpected token '<'" error.
  async function safeParse(response, label) {
    const raw = await response.text();
    try {
      return { ok: true, data: JSON.parse(raw) };
    } catch (e) {
      return {
        ok: false,
        debug: {
          stage: label,
          status: response.status,
          contentType: response.headers.get('content-type'),
          bodyPreview: raw.slice(0, 300),
        },
      };
    }
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

      // The redirect target serves the already-computed response from
      // the original POST — it only accepts GET, not another POST.
      // (Re-POSTing here previously caused a 405.)
      const finalResponse = await fetch(redirectUrl, {
        method: 'GET',
      });

      const parsed = await safeParse(finalResponse, 'after-redirect');
      if (!parsed.ok) {
        return res.status(502).json({
          error: 'Apps Script returned a non-JSON response after following the redirect.',
          debug: parsed.debug,
        });
      }
      const data = parsed.data;
      // Router.gs (Apps Script) always answers with HTTP 200, even for
      // application-level errors like a bad secret, a disallowed
      // function, or an exception inside the target function — it
      // signals those with an {error: "..."} body instead. Translate
      // that into a non-OK status here so the frontend's
      // withFailureHandler actually fires instead of withSuccessHandler
      // silently receiving an error object.
      if (data && data.error) {
        return res.status(400).json(data);
      }
      return res.status(finalResponse.status).json(data);
    }

    // No redirect, return response directly
    const parsed = await safeParse(response, 'no-redirect');
    if (!parsed.ok) {
      return res.status(502).json({
        error: 'Apps Script returned a non-JSON response (no redirect occurred).',
        debug: parsed.debug,
      });
    }
    const data = parsed.data;
    if (data && data.error) {
      return res.status(400).json(data);
    }
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ error: 'Proxy request failed: ' + error.message });
  }
};
