import { isMasterAdminEmail } from "./master-admin";

export type AccountBadgeContext = "admin" | "creator" | "fashion_partner" | "beauty_partner";

export function accountRoleBadgeLabel(email: string, context: AccountBadgeContext) {
  if (isMasterAdminEmail(email)) return "운영자";
  if (context === "admin") return "부운영자";
  if (context === "creator") return "크리에이터";
  return "디자이너";
}
