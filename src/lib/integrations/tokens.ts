import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { connections } from "@/db/schema";

/**
 * AES-256-GCM encryption for third-party tokens at rest, plus Google
 * refresh-token rotation. TOKEN_ENCRYPTION_KEY is a 32-byte hex string.
 */

function key(): Buffer {
  const k = Buffer.from(process.env.TOKEN_ENCRYPTION_KEY!, "hex");
  if (k.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY must be 32 bytes of hex");
  return k;
}

export function encryptToken(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), enc].map((b) => b.toString("base64")).join(".");
}

export function decryptToken(stored: string): string {
  const [iv, tag, enc] = stored.split(".").map((s) => Buffer.from(s, "base64"));
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf-8");
}

/**
 * Returns a valid Google access token for the business's GBP connection,
 * refreshing it if it expires within 5 minutes. Marks the connection as
 * errored if the refresh is rejected (user revoked access).
 */
export async function getGoogleBusinessToken(businessId: string): Promise<string> {
  const conn = await db.query.connections.findFirst({
    where: (c, { and, eq: eq_ }) =>
      and(eq_(c.businessId, businessId), eq_(c.provider, "google_business")),
  });
  if (!conn || conn.status !== "active" || !conn.refreshTokenEnc) {
    throw new Error("google_business connection missing or inactive");
  }

  const fresh =
    conn.expiresAt && conn.expiresAt.getTime() - Date.now() > 5 * 60 * 1000;
  if (fresh && conn.accessTokenEnc) {
    return decryptToken(conn.accessTokenEnc);
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: decryptToken(conn.refreshTokenEnc),
    }),
  });

  if (!res.ok) {
    await db
      .update(connections)
      .set({ status: "error", updatedAt: new Date() })
      .where(eq(connections.id, conn.id));
    throw new Error(`Google token refresh failed (${res.status})`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  await db
    .update(connections)
    .set({
      accessTokenEnc: encryptToken(data.access_token),
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      updatedAt: new Date(),
    })
    .where(eq(connections.id, conn.id));

  return data.access_token;
}
