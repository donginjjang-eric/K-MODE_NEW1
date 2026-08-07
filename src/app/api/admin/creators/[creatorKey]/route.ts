import { requireUser } from "@/lib/auth";
import {
  getPublicCreatorForAdmin,
  isCreatorAccountEmailConflict,
  upsertCreatorAccountLink,
} from "@/lib/db";

const VALID_STATUSES = new Set(["approved", "disabled"]);

function normalizeEmail(email: unknown) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ creatorKey: string }> }) {
  await requireUser("admin");
  const { creatorKey } = await params;
  const body = await request.json().catch(() => null);
  const email = normalizeEmail(body && typeof body === "object" ? (body as { email?: unknown }).email : undefined);
  const requestedStatus = body && typeof body === "object" ? (body as { status?: unknown }).status : undefined;
  const status = requestedStatus === "approved" || requestedStatus === "disabled" ? requestedStatus : null;

  if (!email || !isValidEmail(email) || !status || !VALID_STATUSES.has(status)) {
    return Response.json({ ok: false, error: "입력값을 확인해 주세요." }, { status: 400 });
  }

  const creator = await getPublicCreatorForAdmin(creatorKey);
  if (!creator) {
    return Response.json({ ok: false, error: "요청한 크리에이터를 찾을 수 없습니다." }, { status: 404 });
  }

  try {
    const account = await upsertCreatorAccountLink({
      creatorKey: creator.creatorKey,
      displayName: creator.displayName,
      googleEmail: email,
      platform: creator.platform,
      market: creator.market,
      categories: creator.categories,
      approvalStatus: status,
    });
    return Response.json({ ok: true, account });
  } catch (error) {
    if (isCreatorAccountEmailConflict(error)) {
      return Response.json({ ok: false, error: "이미 다른 크리에이터 계정에 연결된 이메일입니다." }, { status: 409 });
    }
    return Response.json({ ok: false, error: "계정 연결을 저장하지 못했습니다." }, { status: 500 });
  }
}
