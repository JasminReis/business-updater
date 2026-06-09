import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

// ---------------------------------------------------------------------------
// Auth.js tables (shapes required by @auth/drizzle-adapter)
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const membershipRole = pgEnum("membership_role", ["owner", "admin", "editor"]);
export const connectionProvider = pgEnum("connection_provider", [
  "github",
  "google_business",
  "vercel",
]);
export const connectionStatus = pgEnum("connection_status", ["active", "revoked", "error"]);
export const sectionType = pgEnum("section_type", ["text", "markdown", "list", "image"]);
export const deploymentStatus = pgEnum("deployment_status", [
  "queued",
  "building",
  "ready",
  "error",
]);
export const replyStatus = pgEnum("reply_status", ["none", "draft", "published"]);
export const aiTask = pgEnum("ai_task", [
  "website_content",
  "seo_audit",
  "review_reply",
  "business_post",
  "improve_content",
]);
export const aiStatus = pgEnum("ai_status", ["running", "done", "error"]);
export const suggestionKind = pgEnum("suggestion_kind", [
  "reply_to_review",
  "update_hours",
  "improve_section",
  "create_post",
  "fix_seo",
]);
export const suggestionStatus = pgEnum("suggestion_status", ["open", "done", "dismissed"]);

// ---------------------------------------------------------------------------
// Tenancy
// ---------------------------------------------------------------------------

export const businesses = pgTable("businesses", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  category: text("category"),
  description: text("description"),
  brandVoice: text("brand_voice"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const memberships = pgTable(
  "memberships",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    role: membershipRole("role").notNull().default("owner"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.businessId] })],
);

// ---------------------------------------------------------------------------
// Third-party connections (tokens encrypted at rest)
// ---------------------------------------------------------------------------

export const connections = pgTable(
  "connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    provider: connectionProvider("provider").notNull(),
    externalId: text("external_id").notNull(),
    accessTokenEnc: text("access_token_enc"),
    refreshTokenEnc: text("refresh_token_enc"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    scopes: text("scopes"),
    status: connectionStatus("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("connections_business_provider").on(t.businessId, t.provider)],
);

// ---------------------------------------------------------------------------
// Website
// ---------------------------------------------------------------------------

export const sites = pgTable("sites", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  repoOwner: text("repo_owner").notNull(),
  repoName: text("repo_name").notNull(),
  defaultBranch: text("default_branch").notNull().default("main"),
  vercelProjectId: text("vercel_project_id"),
  productionUrl: text("production_url"),
  config: jsonb("config"), // cached presence.config.json
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const contentSections = pgTable(
  "content_sections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    label: text("label").notNull(),
    type: sectionType("type").notNull().default("text"),
    filePath: text("file_path").notNull(),
    jsonPath: text("json_path"),
    content: jsonb("content"), // last-known value; the repo is the source of truth
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("content_sections_site_key").on(t.siteId, t.key)],
);

export const deployments = pgTable("deployments", {
  id: uuid("id").primaryKey().defaultRandom(),
  siteId: uuid("site_id")
    .notNull()
    .references(() => sites.id, { onDelete: "cascade" }),
  commitSha: text("commit_sha").notNull(),
  message: text("message"),
  vercelDeploymentId: text("vercel_deployment_id"),
  status: deploymentStatus("status").notNull().default("queued"),
  triggeredBy: text("triggered_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Google Business Profile
// ---------------------------------------------------------------------------

export const gbpLocations = pgTable("gbp_locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  googleLocationName: text("google_location_name").notNull().unique(), // "locations/{id}"
  title: text("title").notNull(),
  profileData: jsonb("profile_data"), // hours, phone, categories, attributes
  completenessScore: integer("completeness_score").notNull().default(0),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  gbpLocationId: uuid("gbp_location_id")
    .notNull()
    .references(() => gbpLocations.id, { onDelete: "cascade" }),
  googleReviewName: text("google_review_name").notNull().unique(),
  reviewerName: text("reviewer_name"),
  reviewerPhotoUrl: text("reviewer_photo_url"),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  replyText: text("reply_text"),
  replyStatus: replyStatus("reply_status").notNull().default("none"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }).notNull(),
  repliedAt: timestamp("replied_at", { withTimezone: true }),
});

// ---------------------------------------------------------------------------
// AI
// ---------------------------------------------------------------------------

export const aiGenerations = pgTable("ai_generations", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  task: aiTask("task").notNull(),
  input: jsonb("input").notNull(),
  output: jsonb("output"),
  model: text("model").notNull(),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  status: aiStatus("status").notNull().default("running"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const aiSuggestions = pgTable("ai_suggestions", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  kind: suggestionKind("kind").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  payload: jsonb("payload"), // deep-link target + prefill data
  status: suggestionStatus("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Dashboard health
// ---------------------------------------------------------------------------

export const healthSnapshots = pgTable("health_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  websiteHealth: integer("website_health").notNull().default(0),
  seoScore: integer("seo_score").notNull().default(0),
  gbpCompleteness: integer("gbp_completeness").notNull().default(0),
  details: jsonb("details"), // per-check breakdown for drill-down UI
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
