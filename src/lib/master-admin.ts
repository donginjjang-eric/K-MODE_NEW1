export const masterRoleDestinations = [
  { key: "admin", label: "관리자", href: "/dashboard/admin" },
  { key: "creator", label: "크리에이터", href: "/dashboard/creator" },
  { key: "designer", label: "디자이너", href: "/dashboard/designer/brand" },
] as const;

const defaultMasterAdminEmails = "dongjinjjang@gmail.com";

export function isMasterAdminEmail(email: string, configuredEmails = process.env.MASTER_ADMIN_EMAILS || defaultMasterAdminEmails) {
  const normalized = email.trim().toLowerCase();
  return configuredEmails.split(",").some((candidate) => candidate.trim().toLowerCase() === normalized);
}
