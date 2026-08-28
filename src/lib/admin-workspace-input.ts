export type ValidAdminWorkspaceAction =
  | { action: "approve" | "disable" | "set_default"; membershipId: string }
  | { action: "create_beauty_partner"; brandName: string; contactEmail: string };

const idPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const emailPattern = /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i;

export function validateWorkspaceRouteId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return idPattern.test(normalized) ? normalized : null;
}

export function isRealisticEmail(value: unknown): value is string {
  return typeof value === "string" && value.length <= 254 && emailPattern.test(value);
}

export function validateAdminWorkspaceAction(value: unknown):
  | { ok: true; value: ValidAdminWorkspaceAction }
  | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, error: "요청 형식이 올바르지 않습니다." };
  const input = value as Record<string, unknown>;
  if (typeof input.action !== "string") return { ok: false, error: "작업 유형이 올바르지 않습니다." };
  if (input.action === "approve" || input.action === "disable" || input.action === "set_default") {
    const membershipId = validateWorkspaceRouteId(input.membershipId);
    return membershipId ? { ok: true, value: { action: input.action, membershipId } } : { ok: false, error: "작업공간 ID가 올바르지 않습니다." };
  }
  if (input.action === "create_beauty_partner") {
    if (typeof input.brandName !== "string" || typeof input.contactEmail !== "string") return { ok: false, error: "브랜드명과 이메일은 문자열이어야 합니다." };
    const brandName = input.brandName.trim();
    const contactEmail = input.contactEmail.trim().toLowerCase();
    if (brandName.length < 2 || brandName.length > 120) return { ok: false, error: "브랜드명은 2~120자로 입력해 주세요." };
    if (!isRealisticEmail(contactEmail)) return { ok: false, error: "이메일 형식이 올바르지 않습니다." };
    return { ok: true, value: { action: input.action, brandName, contactEmail } };
  }
  return { ok: false, error: "지원하지 않는 작업입니다." };
}
