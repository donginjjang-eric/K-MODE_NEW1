import { brandPartnerCenterPath } from "./brand-partner-center.js";

export function resolveMasterPartnerDestination(brandCategory?: unknown) {
  return brandPartnerCenterPath(brandCategory);
}

export function getMasterRoleDestinations(brandCategory?: unknown) {
  return [
    { key: "admin", label: "관리자 콘솔", href: "/dashboard/admin" },
    { key: "creator", label: "크리에이터 화면", href: "/dashboard/creator" },
    { key: "designer", label: "브랜드 파트너 센터", href: resolveMasterPartnerDestination(brandCategory) },
  ] as const;
}

export const masterRoleDestinations = getMasterRoleDestinations();

const defaultMasterAdminEmails = "donginjjang@gmail.com,clarako298@gmail.com";

export function isMasterAdminEmail(email: string, configuredEmails = process.env.MASTER_ADMIN_EMAILS || "") {
  const normalized = email.trim().toLowerCase();
  return `${defaultMasterAdminEmails},${configuredEmails}`.split(",").some((candidate) => candidate.trim().toLowerCase() === normalized);
}
