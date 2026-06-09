# CLAUDE.md — PresenceAI

Mobile-first SaaS PWA: small business owners manage their website, Google Business
Profile, and reviews from a phone, with an AI assistant doing the writing.
(Directory is named `iAppearance`; the product is **PresenceAI**.)

## Current state (2026-06-10)

**Scaffold complete, never built or run.** `npm install` has not been executed,
no database exists, no `.env.local`, not a git repository. Expect to install
deps and possibly fix minor type/version drift on first build.

What exists and is real:
- Full planning docs in `docs/01`–`06` (architecture, schema, API, wireframes, auth, MVP plan)
- Drizzle schema (`src/db/schema.ts`) — the source of truth for the data model
- Auth.js v5 config (`src/auth.ts`), middleware, login page
- AI layer (`src/lib/ai/`) — implemented
- Integration clients (`src/lib/integrations/`) — implemented but untested against real APIs
- Three exemplar route handlers + dashboard UI + app shell

What does NOT exist yet (see `docs/06-mvp-plan.md` checklist):
- Most API routes from `docs/03-api-structure.md` (connect flows, GBP routes, cron, sync)
- `/website`, `/business`, `/assistant`, `/onboarding` pages (bottom nav links to them)
- PWA icons (`public/icons/`), service worker, Drizzle `relations()` config
- One known hack: `dashboard/page.tsx` has a `with: {...} as never` pending relations()

## Stack

Next.js 15 App Router · TypeScript strict · Tailwind v4 (CSS `@theme` in
`globals.css`, no config file) · Drizzle + Neon Postgres · Auth.js v5 beta
(database sessions) · Anthropic SDK · Octokit (GitHub App) · Zod. Path alias `@/* → src/*`.

## Key decisions (don't re-litigate without asking)

- **PWA, not native app** — deliberate; Capacitor wrap is the later escape hatch.
- **Website editing = `presence.config.json` convention**, not arbitrary-site parsing.
  Publish flow: edit section → commit via GitHub Contents API → Vercel git
  integration auto-deploys → we poll Vercel API for status. We never trigger deploys.
- **AI model is `claude-opus-4-8`** (`AI_MODEL` in `src/lib/ai/client.ts`). Streaming
  tasks return raw text deltas (`text/plain`, no SSE framing); structured tasks use
  `messages.parse` + `zodOutputFormat`. Every generation logged to `ai_generations`.
- **Auth scopes are split**: login = Google openid/email/profile only; GBP scope via
  incremental OAuth (`/api/gbp/connect`, tokens AES-256-GCM encrypted in `connections`);
  GitHub = GitHub App installs (store installation id only, mint tokens on demand).
- **Multi-tenancy ready**: `businesses` is the tenant, joined via `memberships` with
  roles. V1 UI shows one business per user; don't collapse the schema.
- **Reviews use the legacy GBP v4 API** (reviews never moved to v1) — raw fetch in
  `src/lib/integrations/google-business.ts`, intentional.

## Conventions

- Every business-scoped route: `requireMembership(businessId)` from `src/lib/authz.ts`;
  missing membership → **404** (not 403, don't leak existence). Errors:
  `{ error: { code, message } }` via `errorResponse()`.
- Validate request bodies with Zod; third-party failures → 502 with provider code
  (`github_error`, `google_error`).
- AI drafts, human approves: nothing AI-generated publishes without an explicit
  user action carrying the final text.
- Mobile UI rules: ≥44px touch targets, bottom-tab nav, `pb-safe`/`pt-safe` utilities
  for notch/home-indicator, dark mode via `prefers-color-scheme` tokens.
- Timestamps `timestamptz`; `updatedAt` maintained in app code; uuid PKs `defaultRandom()`.

## Commands

```bash
npm run dev / build / typecheck
npm run db:push      # push schema to Postgres (needs DATABASE_URL)
npm run db:studio
```

Env vars: see `.env.example` — all required services listed in README table.

## Gotchas

- Middleware only checks session-cookie *presence* (edge can't hit the DB);
  real authz always happens in handlers/server components. Keep it that way.
- `GITHUB_APP_PRIVATE_KEY` stores newlines as `\n` (un-escaped in `github.ts`).
- GBP API access requires Google approval — apply early, it can take days.
- Vercel deploy ↔ commit matching is by `meta.githubCommitSha` (`vercel.ts`).
