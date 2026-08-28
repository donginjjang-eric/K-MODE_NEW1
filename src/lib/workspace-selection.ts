import type { Role, WorkspaceType } from "./types";
import type { ResolvedWorkspace } from "./workspace-access";

export const workspaceCookieName = "kmodu_workspace";

const workspaceHomes: Record<WorkspaceType, string> = {
  admin: "/dashboard/admin",
  creator: "/dashboard/creator",
  fashion_partner: "/dashboard/designer/brand",
  beauty_partner: "/dashboard/beauty",
  agency: "/dashboard/agency",
};

const workspacePrefixes: Record<WorkspaceType, string[]> = {
  admin: ["/dashboard/admin"],
  creator: ["/dashboard/creator"],
  fashion_partner: ["/dashboard/designer"],
  beauty_partner: ["/dashboard/beauty"],
  agency: ["/dashboard/agency"],
};

export function safeWorkspaceNext(value: unknown, workspaceType: WorkspaceType) {
  const candidate = typeof value === "string" ? value.trim() : "";
  const fallback = workspaceHomes[workspaceType];
  if (!candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\")) return fallback;

  const boundaryIndex = candidate.search(/[?#]/);
  const rawPath = boundaryIndex < 0 ? candidate : candidate.slice(0, boundaryIndex);
  let decodedPath = rawPath;
  try {
    for (let pass = 0; pass < 4; pass += 1) {
      const next = decodeURIComponent(decodedPath);
      if (next === decodedPath) break;
      decodedPath = next;
    }
  } catch {
    return fallback;
  }
  if (decodedPath.includes("?") || decodedPath.includes("#")) return fallback;
  if (decodedPath.includes("\\") || decodedPath.includes("\0")) return fallback;
  if (decodedPath.split("/").some((segment) => segment === "." || segment === "..")) return fallback;

  let parsed: URL;
  try {
    parsed = new URL(candidate, "https://kmodu.local");
  } catch {
    return fallback;
  }
  if (parsed.origin !== "https://kmodu.local") return fallback;

  const normalizedPath = new URL(decodedPath, "https://kmodu.local").pathname;
  const allowed = workspacePrefixes[workspaceType].some(
    (prefix) => normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`),
  );
  return allowed ? `${parsed.pathname}${parsed.search}${parsed.hash}` : fallback;
}

export function workspaceSelectionUrl(membershipId: string, next?: string | null) {
  const params = new URLSearchParams({ membership: membershipId });
  if (next) params.set("next", next);
  return `/dashboard/workspaces?${params.toString()}`;
}

export function authorizeWorkspace(input: {
  user: { id: string; role: Role };
  requestedType: WorkspaceType;
  membership: ResolvedWorkspace | null;
}): { ok: true; workspace: ResolvedWorkspace } | { ok: false } {
  const { membership } = input;
  if (!membership) return { ok: false };
  if (membership.user_id !== input.user.id) return { ok: false };
  if (membership.workspace_type !== input.requestedType) return { ok: false };
  if (membership.status !== "active") return { ok: false };
  return { ok: true, workspace: membership };
}
