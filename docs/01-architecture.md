# Product Architecture

## System overview

```
                 ┌─────────────────────────────────────────────┐
                 │   PresenceAI  (Next.js 15 PWA on Vercel)    │
                 │                                             │
  Phone ────────▶│  App Router pages (mobile-first UI)         │
  (installed     │  Route handlers  (/api/*)                   │
   PWA)          │  Server actions  (form mutations)           │
                 └──────┬──────────┬──────────┬──────────┬─────┘
                        │          │          │          │
                ┌───────▼──┐  ┌────▼─────┐ ┌──▼───────┐ ┌▼──────────────┐
                │ Postgres │  │ Claude   │ │ GitHub   │ │ Google APIs   │
                │ (Neon)   │  │ API      │ │ App API  │ │ - OAuth       │
                │ Drizzle  │  │ (opus-   │ │ (Octokit)│ │ - Business    │
                │          │  │  4-8)    │ │          │ │   Profile     │
                └──────────┘  └──────────┘ └────┬─────┘ └───────────────┘
                                                │ commit
                                          ┌─────▼─────┐
                                          │ User's    │──── webhook ───┐
                                          │ GitHub    │                │
                                          │ repo      │          ┌─────▼─────┐
                                          └───────────┘          │ Vercel    │
                                                                 │ (user's   │
                                                                 │  site)    │
                                                                 └───────────┘
```

## Key decisions

### 1. Mobile-first PWA, not a native app
- Single codebase serves iOS and Android.
- Installable (manifest + service worker), full-screen, home-screen icon.
- No app-store review cycle; instant deploys.
- Escape hatch: Capacitor wrap of the same codebase if store presence is required later.

### 2. Monolith on Vercel, no separate backend
- Next.js route handlers + server actions are the entire backend.
- All third-party API calls happen server-side (tokens never reach the browser).
- Long-running AI generations stream to the client; nothing needs a job queue at V1 scale. (A queue — e.g. Vercel Cron + a `jobs` table, or Inngest — is the first thing to add when review-sync volume grows.)

### 3. Website editing model: "predefined content sections"
V1 does **not** parse arbitrary websites. A connected site declares its editable
sections in a `presence.config.json` file at the repo root:

```json
{
  "sections": [
    { "key": "hero.title",    "label": "Headline",       "type": "text",     "file": "content/home.json", "path": "hero.title" },
    { "key": "hero.subtitle", "label": "Subheadline",    "type": "text",     "file": "content/home.json", "path": "hero.subtitle" },
    { "key": "about.body",    "label": "About us",       "type": "markdown", "file": "content/about.md" },
    { "key": "services",      "label": "Services list",  "type": "list",     "file": "content/services.json" }
  ]
}
```

Edit flow:
1. App reads `presence.config.json` + referenced files via GitHub Contents API.
2. User edits a section on their phone (optionally with AI rewrite).
3. Save → commit to the repo (`PresenceAI: update About us`).
4. Vercel's existing git integration auto-deploys; we poll the Vercel API for deploy status and surface it in the UI.

This keeps V1 simple, git remains the source of truth, and it degrades gracefully:
any static site (Next.js, Astro, Hugo, plain HTML reading JSON) can adopt the config file.

### 4. Google Business Profile
- Same Google OAuth app as login, but GBP scope (`https://www.googleapis.com/auth/business.manage`) is requested **incrementally** only when the user connects their profile — keeps first login low-friction.
- Refresh tokens stored encrypted (AES-256-GCM, `TOKEN_ENCRYPTION_KEY`) in the `connections` table.
- Reviews are synced into our DB (on view + periodic cron) so the dashboard is fast and we can compute "needs reply" state.

### 5. AI layer
- Claude `claude-opus-4-8` via the official `@anthropic-ai/sdk`.
- Every AI feature is a **task** with a typed input, a system prompt, and either a streamed text result (content writing) or a structured JSON result (SEO audit, suggestions) validated with Zod via `messages.parse`.
- All generations are logged to `ai_generations` (tokens, cost attribution, history).
- Long generations stream token-by-token to the phone — perceived latency matters more on mobile.

### 6. Multi-tenancy from day one
`businesses` is the tenant unit, joined to users through `memberships` with a role.
V1 UI only exposes one business per user, but the schema already supports the
agency roadmap item without a migration.

## Request lifecycles

**Edit + publish website copy**
```
Phone ─PATCH /api/sites/:id/sections/:key─▶ route handler
  ├─ auth + membership check
  ├─ GitHub: get file → apply JSON-path/markdown change → commit
  ├─ insert deployments row (status: queued)
  └─ 200 { deployment }
Vercel auto-builds from the commit; client polls GET /api/sites/:id/deployments/latest
```

**AI review reply**
```
Phone ─POST /api/ai/review-reply─▶ route handler
  ├─ load review + business voice settings
  ├─ Claude generates reply draft (streamed)
  └─ user edits/approves ─POST /api/gbp/reviews/:id/reply─▶ GBP API
```

## Security notes

- All third-party tokens encrypted at rest; never sent to the client.
- Route handlers verify session **and** business membership on every request.
- AI endpoints are rate-limited per user (simple fixed-window counter in Postgres at V1).
- Review replies and site publishes always require an explicit user tap — AI drafts, the human approves.
