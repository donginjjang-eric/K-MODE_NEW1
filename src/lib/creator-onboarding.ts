import type { CreatorAccount } from "./types";

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
  return creator
    ? Response.json({ ok: false, error: "이미 크리에이터 유형으로 등록된 계정이에요." }, { status: 409 })
    : null;
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
  if (!input.instagramUrl && !input.tiktokUrl) {
    return Response.json({ ok: false, error: "Instagram 또는 TikTok SNS 주소를 하나 이상 입력해 주세요." }, { status: 400 });
  }
  if (!socialUrl(input.instagramUrl, "instagram.com") || !socialUrl(input.tiktokUrl, "tiktok.com")) {
    return Response.json({ ok: false, error: "올바른 Instagram 또는 TikTok 주소를 입력해 주세요." }, { status: 400 });
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
