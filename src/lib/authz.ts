import { auth } from "@/auth";
import { db } from "@/db";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message?: string,
  ) {
    super(message ?? code);
  }
}

/**
 * Resolves the session and verifies the caller is a member of the business.
 * Used at the top of every business-scoped route handler.
 */
export async function requireMembership(businessId: string, minRole?: "owner" | "admin") {
  const session = await auth();
  if (!session?.user?.id) throw new ApiError(401, "unauthenticated");

  const membership = await db.query.memberships.findFirst({
    where: (m, { and, eq }) =>
      and(eq(m.userId, session.user!.id!), eq(m.businessId, businessId)),
  });
  // 404, not 403 — don't leak whether the business exists.
  if (!membership) throw new ApiError(404, "not_found");

  if (minRole === "owner" && membership.role !== "owner") {
    throw new ApiError(403, "forbidden");
  }
  if (minRole === "admin" && membership.role === "editor") {
    throw new ApiError(403, "forbidden");
  }

  return { userId: session.user.id, role: membership.role };
}

export function errorResponse(err: unknown): Response {
  if (err instanceof ApiError) {
    return Response.json(
      { error: { code: err.code, message: err.message } },
      { status: err.status },
    );
  }
  console.error(err);
  return Response.json(
    { error: { code: "internal", message: "Something went wrong" } },
    { status: 500 },
  );
}
