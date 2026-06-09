# API Structure

All endpoints are Next.js route handlers under `src/app/api/`. JSON in/out unless noted.
Every authenticated route resolves the session via `auth()` and verifies the caller's
membership in the target business. Errors follow `{ error: { code, message } }`.

## Auth

| Method & path | Purpose |
|---|---|
| `GET/POST /api/auth/[...nextauth]` | Auth.js handlers (Google OAuth, magic link, session) |

## Businesses

| Method & path | Purpose |
|---|---|
| `GET    /api/businesses` | List businesses for current user |
| `POST   /api/businesses` | Create business `{ name, category, description }` |
| `GET    /api/businesses/:id` | Business detail incl. connection statuses |
| `PATCH  /api/businesses/:id` | Update profile / brand voice |

## Website (sites, sections, publishing)

| Method & path | Purpose |
|---|---|
| `POST   /api/sites/connect/github` | Begin GitHub App install flow → returns install URL |
| `GET    /api/sites/connect/github/callback` | Install callback; lists accessible repos |
| `POST   /api/sites` | Create site `{ businessId, repoOwner, repoName, vercelProjectId? }`; reads `presence.config.json`, seeds `content_sections` |
| `GET    /api/sites/:id` | Site detail + sections + latest deployment |
| `POST   /api/sites/:id/sync` | Re-read config + content from repo |
| `PATCH  /api/sites/:id/sections/:key` | Update one section `{ content, message? }` → commits to repo, returns `{ deployment }` |
| `GET    /api/sites/:id/deployments` | Publish history |
| `GET    /api/sites/:id/deployments/latest` | Poll target for deploy status |

## Google Business Profile

| Method & path | Purpose |
|---|---|
| `POST   /api/gbp/connect` | Begin incremental Google OAuth (business.manage scope) |
| `GET    /api/gbp/connect/callback` | Store encrypted tokens, list locations |
| `POST   /api/gbp/locations` | Attach a location `{ businessId, googleLocationName }`; initial sync |
| `GET    /api/gbp/locations/:id` | Cached profile + completeness score |
| `PATCH  /api/gbp/locations/:id` | Update hours / phone / website / description (writes through to Google) |
| `POST   /api/gbp/locations/:id/photos` | Upload photo (multipart) |
| `GET    /api/gbp/locations/:id/reviews` | Synced reviews, `?filter=needs_reply` |
| `POST   /api/gbp/reviews/:id/reply` | Publish reply `{ text }` to Google |
| `POST   /api/gbp/locations/:id/sync` | Force re-sync profile + reviews |

## AI Assistant

All AI routes log to `ai_generations` and are rate-limited per user.

| Method & path | Purpose | Response |
|---|---|---|
| `POST /api/ai/generate` | Website content for a section `{ siteId, sectionKey, instructions }` | **streams** text |
| `POST /api/ai/improve` | Improvement suggestions for existing content `{ siteId, sectionKey }` | JSON `{ suggestions: [...] }` |
| `POST /api/ai/seo-audit` | Audit site content `{ siteId }` | JSON `{ score, issues: [{ severity, finding, fix }] }` |
| `POST /api/ai/review-reply` | Draft a review reply `{ reviewId, tone? }` | **streams** text |
| `POST /api/ai/business-post` | Draft a GBP post `{ businessId, topic, cta? }` | **streams** text |

**Streaming contract:** streamed routes return `Content-Type: text/plain; charset=utf-8`
and write raw token deltas. The client renders progressively and treats stream close
as completion. (Simple to consume with `fetch` + `ReadableStream` on mobile; no SSE
parsing needed.)

## Dashboard

| Method & path | Purpose |
|---|---|
| `GET /api/dashboard?businessId=` | Aggregated payload: latest `health_snapshot`, open `ai_suggestions`, recent reviews, latest deployment |

The dashboard page itself is a server component that queries the DB directly; this
endpoint exists for pull-to-refresh on the client.

## Cron (Vercel Cron, protected by `CRON_SECRET`)

| Method & path | Schedule | Purpose |
|---|---|---|
| `GET /api/cron/sync-reviews` | hourly | Sync GBP reviews for active locations; create `reply_to_review` suggestions |
| `GET /api/cron/health` | daily | Compute `health_snapshots` + refresh `ai_suggestions` |

## Validation & errors

- Request bodies validated with Zod; invalid input → `400 { error: { code: "invalid_input" } }`.
- Missing/foreign business membership → `404` (don't leak existence).
- Third-party failures surface as `502 { error: { code: "github_error" | "google_error" | ... } }` with a safe message.
