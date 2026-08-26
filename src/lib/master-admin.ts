export const masterRoleDestinations = [
  { key: "admin", label: "관리자 콘솔", href: "/dashboard/admin" },
  { key: "creator", label: "크리에이터 센터", href: "/dashboard/creator" },
  { key: "designer", label: "파트너 센터", href: "/dashboard/designer/brand" },
] as const;

const defaultMasterAdminEmails = "donginjjang@gmail.com,clarako298@gmail.com";

export function isMasterAdminEmail(email: string, configuredEmails = process.env.MASTER_ADMIN_EMAILS || "") {
  const normalized = email.trim().toLowerCase();
  return `${defaultMasterAdminEmails},${configuredEmails}`.split(",").some((candidate) => candidate.trim().toLowerCase() === normalized);
}
