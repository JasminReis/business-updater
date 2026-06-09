# Database Schema

PostgreSQL + Drizzle ORM. The authoritative source is [`src/db/schema.ts`](../src/db/schema.ts); this doc explains the design.

## Entity-relationship overview

```
users ──< memberships >── businesses ──< sites ──< content_sections
  │                            │            └────< deployments
  │                            ├──< connections (github / google_business / vercel)
  │                            ├──< gbp_locations ──< reviews
  │                            ├──< ai_generations
  │                            ├──< ai_suggestions
  │                            └──< health_snapshots
  └── accounts / sessions / verification_tokens   (Auth.js)
```

## Tables

### Auth (managed by Auth.js Drizzle adapter)
`users`, `accounts`, `sessions`, `verification_tokens` — standard shapes. The Google
`accounts` row stores the *login* tokens only; GBP access uses a separate
incremental-consent token in `connections`.

### `businesses` — the tenant
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| name | text | |
| category | text | e.g. "Plumber", used in AI prompts |
| description | text | elevator pitch, used in AI prompts |
| brand_voice | text | freeform tone guidance for all AI output |
| created_at / updated_at | timestamptz | |

### `memberships` — user ↔ business with role
Composite pk `(user_id, business_id)`. `role`: `owner` \| `admin` \| `editor`.
One business per user in the V1 UI; schema is agency-ready.

### `connections` — encrypted third-party credentials
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| business_id | uuid fk | |
| provider | enum | `github` \| `google_business` \| `vercel` |
| external_id | text | GitHub installation id / Google account id / Vercel team id |
| access_token_enc | text | AES-256-GCM, nullable (GitHub App mints tokens on demand) |
| refresh_token_enc | text | nullable |
| expires_at | timestamptz | nullable |
| scopes | text | |
| status | enum | `active` \| `revoked` \| `error` |

Unique on `(business_id, provider)`.

### `sites` — a connected website
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| business_id | uuid fk | |
| repo_owner / repo_name | text | GitHub repository |
| default_branch | text | commits target this branch |
| vercel_project_id | text | for deploy status |
| production_url | text | shown in UI, used by health checks |
| config | jsonb | cached `presence.config.json` |
| last_synced_at | timestamptz | |

### `content_sections` — editable units of the site
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| site_id | uuid fk | |
| key | text | e.g. `hero.title`; unique per site |
| label | text | human name shown in UI |
| type | enum | `text` \| `markdown` \| `list` \| `image` |
| file_path | text | repo path holding the content |
| json_path | text | path within a JSON file, nullable |
| content | jsonb | last-known value (cache; repo is source of truth) |
| updated_at | timestamptz | |

### `deployments` — publish history
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| site_id | uuid fk | |
| commit_sha | text | |
| message | text | human-readable change summary |
| vercel_deployment_id | text | nullable until Vercel picks it up |
| status | enum | `queued` \| `building` \| `ready` \| `error` |
| triggered_by | uuid fk → users | |
| created_at | timestamptz | |

### `gbp_locations` — connected Google Business Profile locations
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| business_id | uuid fk | |
| google_location_name | text | `locations/{id}` resource name |
| title | text | display name |
| profile_data | jsonb | cached profile (hours, phone, categories, attributes) |
| completeness_score | integer | 0–100, computed on sync |
| last_synced_at | timestamptz | |

### `reviews` — synced GBP reviews
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| gbp_location_id | uuid fk | |
| google_review_name | text unique | GBP resource name (idempotent sync key) |
| reviewer_name / reviewer_photo_url | text | |
| rating | integer | 1–5 |
| comment | text | |
| reply_text | text | nullable |
| reply_status | enum | `none` \| `draft` \| `published` |
| reviewed_at / replied_at | timestamptz | |

### `ai_generations` — every AI task, logged
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| business_id / user_id | uuid fk | |
| task | enum | `website_content` \| `seo_audit` \| `review_reply` \| `business_post` \| `improve_content` |
| input | jsonb | task input (prompt params, never raw secrets) |
| output | jsonb | result text or structured JSON |
| model | text | e.g. `claude-opus-4-8` |
| input_tokens / output_tokens | integer | from API usage block |
| status | enum | `running` \| `done` \| `error` |
| created_at | timestamptz | |

### `ai_suggestions` — dashboard "suggested actions"
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| business_id | uuid fk | |
| kind | enum | `reply_to_review` \| `update_hours` \| `improve_section` \| `create_post` \| `fix_seo` |
| title / body | text | shown on dashboard card |
| payload | jsonb | deep-link target + prefill data |
| status | enum | `open` \| `done` \| `dismissed` |
| created_at | timestamptz | |

### `health_snapshots` — dashboard scores over time
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| business_id | uuid fk | |
| website_health | integer | 0–100 (site reachable, deploy ok, sections fresh) |
| seo_score | integer | 0–100 (from AI SEO audit) |
| gbp_completeness | integer | 0–100 |
| details | jsonb | per-check breakdown for drill-down UI |
| created_at | timestamptz | one row per (roughly) daily computation |

## Conventions

- All PKs are `uuid` with `defaultRandom()`.
- All FKs cascade on business deletion (tenant teardown is one delete).
- Timestamps are `timestamptz`; `updated_at` maintained in app code.
- Enums are Postgres enums (`pgEnum`) for integrity + readable SQL.
