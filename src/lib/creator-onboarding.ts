import type { CreatorAccount } from "./types";
import type { DatabaseTransactionClient } from "./db";
import { partnerWorkspaceTypes } from "./workspace-access";
import { validateCreatorSocialUrls } from "./creator-social-validation";
export { validateCreatorSocialUrls, type CreatorSocialErrors } from "./creator-social-validation";

export type CreatorApplicationInput = {
  userId: string;
  email: string;
  displayName: string;
  market: string;
  category: string;
  instagramUrl: string;
  tiktokUrl: string;
  bio: string;
};

type Dependencies = {
  getCurrentUser: () => Promise<{ id: string; email: string; role: string } | null>;
  getCreatorAccountForUser: (userId: string) => Promise<Pick<CreatorAccount, "id" | "approval_status"> | null>;
  createCreatorApplication: (input: CreatorApplicationInput) => Promise<Pick<CreatorAccount, "id" | "approval_status">>;
};

export function creatorOnboardingDestination(creator: Pick<CreatorAccount, "approval_status"> | null) {
  if (!creator) return "/login?notice=choose_role";
  if (creator.approval_status === "pending") return "/login?notice=creator_approval_pending";
  if (creator.approval_status === "disabled") return "/login?notice=creator_disabled";
  return "/dashboard/creator";
}

export async function designerApplicationRoleGuard(
  userId: string,
  getCreatorAccountForUser: (userId: string) => Promise<Pick<CreatorAccount, "id" | "approval_status"> | null>,
) {
  const creator = await getCreatorAccountForUser(userId);
  return creator && creator.approval_status !== "approved"
    ? Response.json({ ok: false, error: "이미 크리에이터 유형으로 등록된 계정이에요." }, { status: 409 })
    : null;
}

export type PartnerApplicationInput = {
  userId: string;
  brandName: string;
  designerName: string;
  contactEmail: string;
  contactPhone: string;
  description: string;
  category: "K-뷰티" | "K-패션" | "복합";
};

export function validatePartnerApplicationInput(value: unknown):
  | { ok: true; value: Omit<PartnerApplicationInput, "userId"> }
  | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, error: "신청 정보 형식이 올바르지 않습니다." };
  const input = value as Record<string, unknown>;
  const fields = ["brand", "designer", "email", "phone", "headline", "category"] as const;
  if (fields.some((field) => typeof input[field] !== "string")) return { ok: false, error: "모든 신청 정보는 문자열로 입력해 주세요." };
  const brandName = (input.brand as string).trim();
  const designerName = (input.designer as string).trim();
  const contactEmail = (input.email as string).trim().toLowerCase();
  const contactPhone = (input.phone as string).trim();
  const description = (input.headline as string).trim();
  const category = (input.category as string).trim();
  const emailPattern = /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i;
  if (brandName.length < 2 || brandName.length > 120) return { ok: false, error: "브랜드명은 2~120자로 입력해 주세요." };
  if (!designerName || designerName.length > 120) return { ok: false, error: "담당자명은 1~120자로 입력해 주세요." };
  if (contactEmail.length > 254 || !emailPattern.test(contactEmail)) return { ok: false, error: "이메일 형식이 올바르지 않습니다." };
  if (contactPhone.length < 2 || contactPhone.length > 40) return { ok: false, error: "연락처는 2~40자로 입력해 주세요." };
  if (description.length > 1000) return { ok: false, error: "브랜드 소개는 1,000자 이하로 입력해 주세요." };
  if (category !== "K-뷰티" && category !== "K-패션" && category !== "복합") return { ok: false, error: "브랜드 분야를 확인해 주세요." };
  return { ok: true, value: { brandName, designerName, contactEmail, contactPhone, description, category } };
}

export async function createPartnerApplication(client: DatabaseTransactionClient, input: PartnerApplicationInput) {
  const designerResult = await client.query(
    `INSERT INTO designers
       (brand_name, designer_name, contact_email, contact_phone, description, brand_category, mood, country, approval_status, user_id)
     VALUES ($1, $2, $3, $4, $5, $6, '', 'South Korea', 'pending', $7)
     RETURNING *`,
    [input.brandName, input.designerName, input.contactEmail, input.contactPhone, input.description, input.category, input.userId],
  );
  const designer = designerResult.rows[0];
  if (!designer) throw new Error("브랜드 신청서를 저장하지 못했습니다.");

  for (const workspaceType of partnerWorkspaceTypes(input.category)) {
    await client.query(
      `INSERT INTO user_workspace_memberships (user_id, workspace_type, resource_id, status, is_default)
       VALUES ($1, $2, $3, $4, false)
       ON CONFLICT ON CONSTRAINT user_workspace_memberships_identity_key DO NOTHING`,
      [input.userId, workspaceType, designer.id, "pending"],
    );
  }
  await client.query(
    `INSERT INTO creator_management_audit_logs (actor_user_id, action, metadata)
     VALUES ($1, $2, $3::jsonb)`,
    [input.userId, "partner_application_created", JSON.stringify({ designerId: designer.id, category: input.category })],
  );
  return { designer };
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function socialUrl(value: string, host: "instagram.com" | "tiktok.com") {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

export async function handleCreatorApplication(request: Request, dependencies: Dependencies) {
  const user = await dependencies.getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "로그인 후 신청할 수 있어요." }, { status: 401 });
  if (user.role === "admin" || user.role === "agency") {
    return Response.json({ ok: false, error: "이 계정 유형으로는 크리에이터 신청을 할 수 없어요." }, { status: 403 });
  }
  if (await dependencies.getCreatorAccountForUser(user.id)) {
    return Response.json({ ok: false, error: "이미 연결된 크리에이터 신청 또는 계정이 있어요." }, { status: 409 });
  }

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return Response.json({ ok: false, error: "신청 정보를 확인해 주세요." }, { status: 400 });
  const input: CreatorApplicationInput = {
    userId: user.id,
    email: user.email.trim().toLowerCase(),
    displayName: text(body.displayName),
    market: text(body.market),
    category: text(body.category),
    instagramUrl: text(body.instagramUrl),
    tiktokUrl: text(body.tiktokUrl),
    bio: text(body.bio),
  };
  if (!input.displayName || !input.market || !input.category) {
    return Response.json({ ok: false, error: "활동명, 활동 국가, 분야를 입력해 주세요." }, { status: 400 });
  }
  const socialErrors = validateCreatorSocialUrls(input.instagramUrl, input.tiktokUrl);
  const socialError = socialErrors.form || socialErrors.instagramUrl || socialErrors.tiktokUrl;
  if (socialError) {
    return Response.json({ ok: false, error: socialError, fieldErrors: socialErrors }, { status: 400 });
  }

  try {
    const creator = await dependencies.createCreatorApplication(input);
    return Response.json({ ok: true, creator }, { status: 201 });
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    if (code === "23505") return Response.json({ ok: false, error: "이미 신청된 계정 또는 SNS 주소입니다." }, { status: 409 });
    console.error("[creator-application] create failed:", error instanceof Error ? error.message : error);
    return Response.json({ ok: false, error: "신청 접수 중 오류가 발생했어요." }, { status: 500 });
  }
}
