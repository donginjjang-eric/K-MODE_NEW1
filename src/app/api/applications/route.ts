import { getCurrentUser } from "@/lib/auth";
import { getCreatorAccountForUser, getUserById, withDatabaseTransaction } from "@/lib/db";
import { createPartnerApplication, designerApplicationRoleGuard, validatePartnerApplicationInput } from "@/lib/creator-onboarding";

export async function POST(request: Request) {
  // 신청은 구글 로그인 후에만 가능 (화면 게이트와 동일한 규칙을 서버에서도 강제 — 스팸 차단)
  const sessionUser = await getCurrentUser();
  if (!sessionUser) {
    return Response.json({ ok: false, error: "로그인 후 신청할 수 있어요." }, { status: 401 });
  }
  // 세션은 무상태(쿠키)라 계정이 삭제돼도 토큰이 남는다 — 실제 유저가 없으면 신청 연결 시 FK 오류가 나므로 막는다
  const accountUser = await getUserById(sessionUser.id);
  if (!accountUser) {
    return Response.json({ ok: false, error: "로그인이 만료됐어요. 로그아웃 후 다시 로그인해 신청해주세요." }, { status: 401 });
  }
  const roleConflict = await designerApplicationRoleGuard(accountUser.id, getCreatorAccountForUser);
  if (roleConflict) return roleConflict;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ ok: false, error: "Invalid application payload." }, { status: 400 });
  }

  const validated = validatePartnerApplicationInput(body);
  if (!validated.ok) return Response.json({ ok: false, error: validated.error }, { status: 400 });
  const { brandName, designerName, contactEmail, contactPhone, description, category } = validated.value;

  try {
    const { designer } = await withDatabaseTransaction((client) => createPartnerApplication(client, {
      userId: accountUser.id,
      brandName,
      designerName,
      contactEmail,
      contactPhone,
      description,
      category,
    }));
    return Response.json({ ok: true, designer });
  } catch (error) {
    console.error("[applications] create failed:", error instanceof Error ? error.message : error);
    return Response.json({ ok: false, error: "신청 접수 중 오류가 발생했어요. 잠시 후 다시 시도해주세요." }, { status: 500 });
  }
}
