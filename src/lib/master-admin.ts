import { brandPartnerCenterPath } from "./brand-partner-center.js";
import type { ResolvedWorkspace } from "./workspace-access";

export function resolveMasterPartnerDestination(brandCategory?: unknown) {
  return brandPartnerCenterPath(brandCategory);
}

export function getMasterRoleDestinations(brandCategory?: unknown) {
  return [
    { key: "admin", label: "관리자 콘솔", href: "/dashboard/admin" },
    { key: "creator", label: "크리에이터 화면", href: "/dashboard/creator" },
    { key: "fashion_partner", label: "패션 브랜드 센터", href: "/dashboard/designer/brand" },
    { key: "beauty_partner", label: "뷰티 브랜드 센터", href: "/dashboard/beauty" },
  ] as const;
}

export function getActiveWorkspaceDestinations(memberships: ResolvedWorkspace[]) {
  const activeTypes = new Set(memberships.filter((item) => item.status === "active").map((item) => item.workspace_type));
  return getMasterRoleDestinations().filter((item) => activeTypes.has(item.key));
}

export const masterRoleDestinations = getMasterRoleDestinations();

const defaultMasterAdminEmails = "donginjjang@gmail.com,clarako298@gmail.com";

export function isMasterAdminEmail(email: string, configuredEmails = process.env.MASTER_ADMIN_EMAILS || "") {
  const normalized = email.trim().toLowerCase();
  return `${defaultMasterAdminEmails},${configuredEmails}`.split(",").some((candidate) => candidate.trim().toLowerCase() === normalized);
}
