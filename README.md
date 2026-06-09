# PresenceAI

Manage your entire online presence from your phone — website, Google Business Profile, reviews, and SEO — with an AI assistant that does the writing for you.

**Target users:** small business owners, freelancers, consultants, agencies, local businesses.

## What it does (V1)

| Area | Capability |
|---|---|
| Website | Connect GitHub repo + Vercel project, edit predefined content sections from your phone, publish via git commit → Vercel deploy |
| Google Business Profile | View/edit hours, contact details, services, photos; read and reply to reviews |
| AI Assistant | Website copy generation, SEO optimization, review reply drafts, business post drafts, content improvement suggestions (powered by Claude) |
| Dashboard | Website health, SEO status, GBP completeness score, recent reviews, suggested AI actions |

## Tech stack

- **App:** Next.js 15 (App Router) — mobile-first PWA, installable on iOS & Android
- **Language:** TypeScript end-to-end
- **UI:** Tailwind CSS v4, dark mode, large touch targets, bottom-tab navigation
- **Auth:** Auth.js (NextAuth v5) — Google OAuth + email magic links
- **Database:** PostgreSQL (Neon) + Drizzle ORM
- **AI:** Anthropic Claude (`claude-opus-4-8`) via `@anthropic-ai/sdk`
- **Integrations:** GitHub API (Octokit), Vercel REST API, Google Business Profile API
- **Hosting:** Vercel

### Why a PWA instead of a native app?

One codebase covers iOS *and* Android, installs to the home screen, ships updates instantly without app-store review, and deploys on Vercel — the same platform we integrate with. If a store presence is needed later, the same codebase wraps with Capacitor.

## Documentation

| Doc | Contents |
|---|---|
| [docs/01-architecture.md](docs/01-architecture.md) | Product architecture, system diagram, key decisions |
| [docs/02-database-schema.md](docs/02-database-schema.md) | Full schema with rationale (live source: `src/db/schema.ts`) |
| [docs/03-api-structure.md](docs/03-api-structure.md) | Route handlers, request/response shapes |
| [docs/04-wireframes.md](docs/04-wireframes.md) | Mobile UI wireframes for all V1 screens |
| [docs/05-auth-flow.md](docs/05-auth-flow.md) | Login, session, and third-party OAuth connection flows |
| [docs/06-mvp-plan.md](docs/06-mvp-plan.md) | Phased implementation plan |

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local   # then fill in values

# 3. Push the schema to your Postgres database
npm run db:push

# 4. Run the dev server
npm run dev
```

Open http://localhost:3000 on your phone (or in devtools mobile view).

### Required services

| Service | Used for | Env vars |
|---|---|---|
| Neon (or any Postgres) | Database | `DATABASE_URL` |
| Google Cloud Console | Login + Business Profile API | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| Resend | Magic-link emails | `RESEND_API_KEY` |
| Anthropic | AI assistant | `ANTHROPIC_API_KEY` |
| GitHub App | Repo read/write | `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` |
| Vercel | Deploy status + triggers | `VERCEL_API_TOKEN` (per-user OAuth token stored in DB at runtime) |

## Project structure

```
src/
  app/                  # Next.js App Router
    (auth)/login/       # Public auth pages
    (app)/              # Authenticated app shell (bottom nav)
      dashboard/
      website/
      business/
      assistant/
    api/                # Route handlers (REST-ish JSON API)
  components/           # Shared UI components
  db/                   # Drizzle schema + client
  lib/
    ai/                 # Claude client, prompts, task runners
    integrations/       # GitHub, Vercel, Google Business Profile clients
  auth.ts               # Auth.js configuration
  middleware.ts         # Route protection
docs/                   # Architecture & planning docs
```

## Roadmap (post-V1, not implemented)

Full website builder · AI website creation · landing page generation · multi-client agency accounts · social media publishing · SEO rank tracking · competitor analysis · white-label.
