import { App } from "octokit";
import { z } from "zod";

/**
 * GitHub App integration. We store only the installation id per business;
 * short-lived installation tokens are minted on demand via the App's
 * private key. See docs/05-auth-flow.md.
 */

const app = new App({
  appId: process.env.GITHUB_APP_ID!,
  privateKey: process.env.GITHUB_APP_PRIVATE_KEY!.replace(/\\n/g, "\n"),
});

export const PresenceConfig = z.object({
  sections: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      type: z.enum(["text", "markdown", "list", "image"]).default("text"),
      file: z.string(),
      path: z.string().optional(), // JSON path within `file`, e.g. "hero.title"
    }),
  ),
});
export type PresenceConfig = z.infer<typeof PresenceConfig>;

async function installationClient(installationId: number) {
  return app.getInstallationOctokit(installationId);
}

export async function listInstallationRepos(installationId: number) {
  const octokit = await installationClient(installationId);
  const { data } = await octokit.request("GET /installation/repositories", {
    per_page: 100,
  });
  return data.repositories.map((r) => ({
    owner: r.owner.login,
    name: r.name,
    defaultBranch: r.default_branch,
    private: r.private,
  }));
}

export async function readFile(
  installationId: number,
  args: { owner: string; repo: string; path: string; ref?: string },
): Promise<{ content: string; sha: string }> {
  const octokit = await installationClient(installationId);
  const { data } = await octokit.request("GET /repos/{owner}/{repo}/contents/{path}", {
    owner: args.owner,
    repo: args.repo,
    path: args.path,
    ref: args.ref,
  });
  if (Array.isArray(data) || data.type !== "file") {
    throw new Error(`${args.path} is not a file`);
  }
  return {
    content: Buffer.from(data.content, "base64").toString("utf-8"),
    sha: data.sha,
  };
}

export async function readPresenceConfig(
  installationId: number,
  args: { owner: string; repo: string; ref?: string },
): Promise<PresenceConfig> {
  const { content } = await readFile(installationId, { ...args, path: "presence.config.json" });
  return PresenceConfig.parse(JSON.parse(content));
}

/**
 * Commits a single-file content change and returns the new commit SHA.
 * `message` becomes the commit message shown in the user's repo history.
 */
export async function commitFileChange(
  installationId: number,
  args: {
    owner: string;
    repo: string;
    branch: string;
    path: string;
    newContent: string;
    message: string;
  },
): Promise<{ commitSha: string }> {
  const octokit = await installationClient(installationId);

  // Fetch the current blob SHA — required by the Contents API for updates,
  // and acts as an optimistic-concurrency check against drift.
  const existing = await readFile(installationId, {
    owner: args.owner,
    repo: args.repo,
    path: args.path,
    ref: args.branch,
  });

  const { data } = await octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", {
    owner: args.owner,
    repo: args.repo,
    path: args.path,
    branch: args.branch,
    message: args.message,
    content: Buffer.from(args.newContent, "utf-8").toString("base64"),
    sha: existing.sha,
  });

  return { commitSha: data.commit.sha! };
}

/**
 * Applies a value at a dot-separated JSON path ("hero.title") inside a JSON
 * document and returns the re-serialized file. Used for `type: text` sections
 * stored inside shared JSON content files.
 */
export function setJsonPath(jsonText: string, path: string, value: unknown): string {
  const doc = JSON.parse(jsonText);
  const keys = path.split(".");
  let node = doc;
  for (const key of keys.slice(0, -1)) {
    if (typeof node[key] !== "object" || node[key] === null) node[key] = {};
    node = node[key];
  }
  node[keys[keys.length - 1]] = value;
  return JSON.stringify(doc, null, 2) + "\n";
}
