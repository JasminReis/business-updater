# MVP Implementation Plan

Target: usable V1 in ~8 weeks for a solo dev / small team. Each phase ends with
something demoable on a phone.

## Phase 0 — Foundation (week 1)
- [x] Repo scaffold: Next.js 15, TypeScript, Tailwind v4, Drizzle, this structure
- [ ] Neon database provisioned; `db:push` the schema
- [ ] Auth.js wired: Google login + Resend magic links
- [ ] App shell: bottom nav, dark mode, login page, route protection
- [ ] Onboarding: create business (name, category, description, brand voice)

**Demo:** log in on a phone, create a business, see empty dashboard.

## Phase 1 — Website connection & editing (weeks 2–3)
- [ ] GitHub App created; install + callback flow
- [ ] `presence.config.json` spec + a template repo (simple Next.js site) for new users
- [ ] Site connect: pick repo → seed `content_sections`
- [ ] Section list + section editor (text, markdown, list)
- [ ] Save → commit via Contents API → deployment row
- [ ] Vercel deploy-status polling (user provides Vercel token or we match by commit SHA via their connected Vercel account)

**Demo:** edit your headline on your phone; it's live a minute later.

## Phase 2 — AI assistant core (weeks 3–4)
- [ ] Claude client + prompt library (`src/lib/ai/`)
- [ ] Streamed content generation in the section editor ("Rewrite with AI")
- [ ] `ai_generations` logging + per-user rate limiting
- [ ] Content improvement suggestions (structured output)

**Demo:** "make my About page warmer" → streamed rewrite → publish.

## Phase 3 — Google Business Profile (weeks 5–6)
- [ ] Incremental OAuth + encrypted token storage
- [ ] Location attach + profile sync + completeness score
- [ ] Edit hours / phone / website / description (write-through)
- [ ] Photo upload
- [ ] Review sync (on view + hourly cron)
- [ ] Reply to review (manual text)

**Demo:** fix your opening hours from the couch; see new reviews.

## Phase 4 — AI × GBP + Dashboard (week 7)
- [ ] AI review-reply drafts (streamed, tone control)
- [ ] AI business-post generator
- [ ] SEO audit task (structured output → `health_snapshots.seo_score`)
- [ ] Health computation cron (website health + GBP completeness)
- [ ] Dashboard: score rings, suggested actions, recent reviews
- [ ] `ai_suggestions` generation (unanswered reviews, stale content, profile gaps)

**Demo:** the full dashboard-centric loop — open app, see scores + 2 suggestions, complete both in under a minute.

## Phase 5 — Polish & launch (week 8)
- [ ] PWA: manifest, icons, service worker (offline shell), install prompt
- [ ] Empty states, error states, reconnect banners
- [ ] Rate limiting + abuse guards on AI routes
- [ ] Sentry (or similar) + basic analytics
- [ ] Landing page + waitlist→invite flow
- [ ] Beta with 5–10 real local businesses

## Deliberate V1 cuts
- Arbitrary-site parsing (config-file approach instead)
- Billing (free beta; Stripe in V1.1)
- Multi-business UI (schema supports it; UI later)
- Social publishing, rank tracking, competitor analysis (roadmap)
- Native app wrappers (PWA first; Capacitor if needed)

## Risks & mitigations
| Risk | Mitigation |
|---|---|
| GBP API quota/approval friction | Apply for API access early (week 1); it can take days |
| Users' sites don't follow the config convention | Ship a template repo + "create site from template" path |
| AI cost per user | Log tokens per generation from day one; cap free-tier generations |
| Vercel deploy status matching | Fall back to commit-SHA matching against the user's Vercel deployments list |
