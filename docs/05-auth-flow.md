# Authentication & Connection Flows

Auth.js (NextAuth v5) with database sessions (Drizzle adapter). Three distinct flows:
**app login**, **Google Business Profile connection**, and **GitHub connection**.
Keeping them separate keeps first login frictionless and scopes minimal.

## 1. App login

### Google OAuth (primary)
```
Phone → /login → "Continue with Google"
  → Google consent (scopes: openid, email, profile ONLY)
  → /api/auth/callback/google
  → Auth.js: upsert users + accounts row, create session (httpOnly cookie)
  → redirect /dashboard (or /onboarding if no business yet)
```

### Email magic link (fallback — works for everyone)
```
Phone → /login → enter email → "Email me a login link"
  → Resend sends one-time link (verification_tokens row, 10 min TTL)
  → user taps link on phone → session created → /dashboard
```

### Session model
- Database sessions (revocable server-side), httpOnly + Secure + SameSite=Lax cookie.
- 30-day rolling expiry — re-login on a personal phone should be rare.
- `middleware.ts` protects everything except `/login`, `/api/auth/*`, and static assets.

## 2. Google Business Profile connection (incremental consent)

Login deliberately does **not** request the GBP scope. When the user taps
"Connect Google Business Profile":

```
POST /api/gbp/connect
  → build Google OAuth URL:
      scope = https://www.googleapis.com/auth/business.manage
      access_type = offline, prompt = consent   (guarantees refresh_token)
      state = signed { businessId, userId, nonce }
  → user approves → GET /api/gbp/connect/callback
  → verify state, exchange code for tokens
  → encrypt tokens (AES-256-GCM) → upsert connections (provider: google_business)
  → list GBP accounts/locations → user picks location → POST /api/gbp/locations
  → initial sync: profile data, completeness score, reviews
```

Token refresh happens server-side on demand (refresh ~5 min before expiry).
If refresh fails (revoked), `connections.status = 'error'` and the UI shows a
"Reconnect Google" banner.

## 3. GitHub connection (GitHub App)

A **GitHub App** (not OAuth app) — repo-scoped installs, short-lived tokens,
and users can grant access to a single repository:

```
POST /api/sites/connect/github
  → redirect to GitHub App install page (user picks repo(s))
  → GET /api/sites/connect/github/callback?installation_id=…
  → store installation_id in connections (provider: github)
  → list accessible repos → user picks repo → POST /api/sites
  → read presence.config.json → seed content_sections
```

At request time we mint a ~1h installation token via the App's private key
(JWT → installation token). Nothing long-lived is stored for GitHub.

## 4. Authorization model (every request)

```
session = await auth()                       // 401 if absent
membership = memberships(user, businessId)   // 404 if absent
role check: editor may edit content; owner/admin may manage connections
```

Business-scoped resources are always fetched **through** the membership join —
no route trusts a bare resource id.

## 5. Secret handling

| Secret | Storage |
|---|---|
| Session | httpOnly cookie + `sessions` table |
| Google login tokens | `accounts` (Auth.js), unused after login |
| GBP refresh/access tokens | `connections`, AES-256-GCM encrypted with `TOKEN_ENCRYPTION_KEY` |
| GitHub installation id | `connections` (not a secret; tokens minted on demand) |
| Anthropic API key | server env var only — never per-user, never client-side |
