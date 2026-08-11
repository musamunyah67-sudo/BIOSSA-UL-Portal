// GET /api/health — quick diagnostics, safe to leave public.
// Never returns the secret itself, only whether it's configured, and
// (optionally) whether the Apps Script URL is currently reachable.
module.exports = async (req, res) => {
  const appsScriptUrlConfigured = !!process.env.APPS_SCRIPT_URL;
  const secretConfigured = !!process.env.PROXY_SHARED_SECRET;

  let appsScriptReachable = null;
  let appsScriptStatus = null;

  if (appsScriptUrlConfigured) {
    try {
      const r = await fetch(process.env.APPS_SCRIPT_URL, { method: 'GET' });
      appsScriptReachable = true;
      appsScriptStatus = r.status;
    } catch (err) {
      appsScriptReachable = false;
    }
  }

  return res.status(200).json({
    appsScriptUrlConfigured,
    secretConfigured,
    appsScriptReachable,
    appsScriptStatus,
  });
};
