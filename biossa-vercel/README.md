# BIOSSA-UL Portal — Vercel Frontend + Apps Script Backend

## What changed in this version

1. **`Router.gs`** — `doPost` now returns each function's raw result instead
   of wrapping it in `{success:true, data:result}`. The frontend (written
   for native `google.script.run`) reads fields like `res.success`,
   `res.token`, `res.message` directly off the top-level response, so the
   old wrapper silently broke *every* server call, not just login.
2. **`api/proxy.js`** — Apps Script always answers with HTTP 200, even for
   an invalid secret, a disallowed function, or a thrown exception (it
   signals those with an `{error:"..."}` body). The proxy now detects that
   body shape and forwards it as HTTP 400, so `gas-shim.js` correctly
   throws and calls `withFailureHandler` instead of treating the error as
   a success.
3. **`api/health.js`** — new `GET /api/health` endpoint. Visit it after
   deploying to confirm both env vars are set and the Apps Script URL is
   reachable, without exposing the secret itself.
4. **`.env.example`** — now contains placeholders instead of real values.
   Real secrets should never live in a file that gets committed to git.

## Deploy steps

### 1. Push this folder to a new GitHub repo, then import it in Vercel.

### 2. Set environment variables in Vercel
Project → **Settings → Environment Variables** → add both, for
**Production** (and Preview if you'll test preview deployments):

| Name | Value |
|---|---|
| `APPS_SCRIPT_URL` | `https://script.google.com/macros/s/AKfycbzfvzT7jpsGaeF-9e0mvkXEkvoC2zOrnNNHxDIDWS_Xwv_EbtUt3TFZdN9A9_jUoptE/exec` |
| `PROXY_SHARED_SECRET` | `xK9mP2vQ8rT4wN7zJ1fL5hG3sD6cY0bA` |

A local `.env` with these same values is already included in this bundle
for your own reference — it's gitignored and won't be pushed, so it won't
help Vercel by itself. The dashboard entry above is what actually matters.

### 3. Confirm the Apps Script Web App deployment
In the Apps Script project: **Deploy → Manage deployments** on the active
deployment:
- **Execute as:** Me
- **Who has access:** Anyone

If access is restricted, requests from the Vercel proxy will fail or get
redirected to a Google login page instead of returning JSON.

### 4. Deploy on Vercel, then verify
After the deploy finishes, open:

```
https://<your-vercel-domain>/api/health
```

You should see:
```json
{
  "appsScriptUrlConfigured": true,
  "secretConfigured": true,
  "appsScriptReachable": true,
  "appsScriptStatus": 200
}
```

If any field is `false`, that tells you exactly what's still missing
before you even try logging in.

### 5. Try signing in
Once `/api/health` looks correct, sign-in should work end to end.

## A note on the shared secret
`PROXY_SHARED_SECRET` was previously committed in `.env.example` in your
old repo, which means it may already be exposed if that repo was ever
public or shared. It will still work functionally as-is (this bundle uses
the exact value you provided, matching `Router.gs`), but if the old repo
had any public exposure, consider rotating it: pick a new random string,
update `PROXY_SHARED_SECRET_` in `Router.gs`, redeploy the Apps Script Web
App, and update the Vercel env var to match.
