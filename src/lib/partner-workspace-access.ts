import type { WorkspaceType } from "./types";

export type PartnerWorkspaceType = Extract<WorkspaceType, "fashion_partner" | "beauty_partner">;

export function authorizePartnerResource(input: {
  workspaceType: PartnerWorkspaceType;
  workspaceResourceId: string | null;
  resourceDesignerId?: string | null;
}) {
  if (!input.workspaceResourceId) return { ok: false as const, status: 403 as const };
  if (input.resourceDesignerId && input.resourceDesignerId !== input.workspaceResourceId) {
    return { ok: false as const, status: 404 as const };
  }
  return { ok: true as const, designerId: input.workspaceResourceId };
}

export function parsePartnerWorkspaceType(value: unknown): PartnerWorkspaceType | null {
  return value === "fashion_partner" || value === "beauty_partner" ? value : null;
}
