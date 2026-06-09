/**
 * Minimal Vercel REST API client. Used read-only in V1: we never trigger
 * deployments directly (Vercel's git integration builds the commits we push);
 * we only resolve deploy status to show honest publish progress in the UI.
 */

const VERCEL_API = "https://api.vercel.com";

export interface VercelDeployment {
  id: string;
  state: "QUEUED" | "BUILDING" | "READY" | "ERROR" | "CANCELED";
  url: string;
  meta?: { githubCommitSha?: string };
  createdAt: number;
}

async function vercelFetch<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${VERCEL_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    // Deploy status changes fast; never cache.
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Vercel API ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

export async function listProjectDeployments(
  token: string,
  projectId: string,
  limit = 10,
): Promise<VercelDeployment[]> {
  const data = await vercelFetch<{ deployments: VercelDeployment[] }>(
    token,
    `/v6/deployments?projectId=${encodeURIComponent(projectId)}&limit=${limit}`,
  );
  return data.deployments;
}

/** Find the deployment created for a specific commit we pushed. */
export async function findDeploymentByCommit(
  token: string,
  projectId: string,
  commitSha: string,
): Promise<VercelDeployment | null> {
  const deployments = await listProjectDeployments(token, projectId, 20);
  return deployments.find((d) => d.meta?.githubCommitSha === commitSha) ?? null;
}

export function toDeploymentStatus(
  state: VercelDeployment["state"],
): "queued" | "building" | "ready" | "error" {
  switch (state) {
    case "QUEUED":
      return "queued";
    case "BUILDING":
      return "building";
    case "READY":
      return "ready";
    default:
      return "error";
  }
}
