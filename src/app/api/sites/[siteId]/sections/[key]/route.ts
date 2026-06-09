import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contentSections, deployments } from "@/db/schema";
import { commitFileChange, readFile, setJsonPath } from "@/lib/integrations/github";
import { ApiError, errorResponse, requireMembership } from "@/lib/authz";

/**
 * PATCH /api/sites/:siteId/sections/:key — the core publish flow.
 * Commits the change to the user's repo; Vercel's git integration deploys it.
 */

const Body = z.object({
  content: z.union([z.string(), z.array(z.unknown())]),
  message: z.string().max(200).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ siteId: string; key: string }> },
) {
  try {
    const { siteId, key } = await params;
    const body = Body.parse(await request.json().catch(() => ({})));

    const site = await db.query.sites.findFirst({
      where: (s, { eq: eq_ }) => eq_(s.id, siteId),
    });
    if (!site) throw new ApiError(404, "not_found");
    const { userId } = await requireMembership(site.businessId);

    const section = await db.query.contentSections.findFirst({
      where: (cs, { and, eq: eq_ }) => and(eq_(cs.siteId, site.id), eq_(cs.key, key)),
    });
    if (!section) throw new ApiError(404, "not_found");

    const connection = await db.query.connections.findFirst({
      where: (c, { and, eq: eq_ }) =>
        and(eq_(c.businessId, site.businessId), eq_(c.provider, "github")),
    });
    if (!connection || connection.status !== "active") {
      throw new ApiError(409, "github_not_connected");
    }
    const installationId = Number(connection.externalId);

    // Build the new file content. Markdown/list sections own their whole
    // file; text sections live at a JSON path inside a shared content file.
    let newFileContent: string;
    if (section.jsonPath) {
      const { content: current } = await readFile(installationId, {
        owner: site.repoOwner,
        repo: site.repoName,
        path: section.filePath,
        ref: site.defaultBranch,
      });
      newFileContent = setJsonPath(current, section.jsonPath, body.content);
    } else if (typeof body.content === "string") {
      newFileContent = body.content;
    } else {
      newFileContent = JSON.stringify(body.content, null, 2) + "\n";
    }

    const message = body.message ?? `PresenceAI: update ${section.label}`;
    let commitSha: string;
    try {
      ({ commitSha } = await commitFileChange(installationId, {
        owner: site.repoOwner,
        repo: site.repoName,
        branch: site.defaultBranch,
        path: section.filePath,
        newContent: newFileContent,
        message,
      }));
    } catch (err) {
      console.error("GitHub commit failed", err);
      throw new ApiError(502, "github_error", "Could not save to your repository");
    }

    const [[updatedSection], [deployment]] = await Promise.all([
      db
        .update(contentSections)
        .set({ content: body.content, updatedAt: new Date() })
        .where(eq(contentSections.id, section.id))
        .returning(),
      db
        .insert(deployments)
        .values({ siteId: site.id, commitSha, message, triggeredBy: userId })
        .returning(),
    ]);

    return Response.json({ section: updatedSection, deployment });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return errorResponse(new ApiError(400, "invalid_input", err.message));
    }
    return errorResponse(err);
  }
}
