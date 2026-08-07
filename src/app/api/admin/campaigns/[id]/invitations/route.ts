import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createCampaignInvitation } from "@/lib/creator-campaigns";

function invitationCreationError(error: unknown) {
  const message = error instanceof Error ? error.message : "Campaign invitation could not be created.";
  if (/campaign was not found|creator account was not found|creator account is not approved/i.test(message)) {
    return Response.json({ code: "not_found", error: "캠페인 또는 승인된 크리에이터를 찾을 수 없습니다." }, { status: 404 });
  }
  if (/capacity/i.test(message)) return Response.json({ code: "capacity_full", error: "모집 인원이 모두 확정되어 초대할 수 없습니다." }, { status: 409 });
  if (/already participates/i.test(message)) return Response.json({ code: "already_participating", error: "이미 이 캠페인에 참여 중인 크리에이터입니다." }, { status: 409 });
  if (/not recruiting|deadline/i.test(message)) return Response.json({ code: "invalid_state", error: "모집 중이고 신청 마감 전인 캠페인에서만 초대할 수 있습니다." }, { status: 409 });
  console.error("[admin-campaign-invitation] create failed:", error);
  return Response.json({ code: "server_error", error: "초대를 보내지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireUser("admin");
  const { id: campaignId } = await params;
  const body = await request.json().catch(() => null);
  const creatorId = body && typeof body === "object" && typeof (body as { creatorId?: unknown }).creatorId === "string"
    ? (body as { creatorId: string }).creatorId.trim()
    : "";

  if (!campaignId || !creatorId) {
    return Response.json({ code: "invalid_request", error: "캠페인과 크리에이터를 선택해 주세요." }, { status: 400 });
  }

  try {
    const participation = await createCampaignInvitation(admin.id, campaignId, creatorId);
    revalidatePath("/dashboard/admin/campaigns");
    revalidatePath(`/dashboard/admin/campaigns/${campaignId}`);
    revalidatePath("/dashboard/creator");
    revalidatePath("/dashboard/creator/campaigns");
    revalidatePath("/dashboard/creator/my-campaigns");
    revalidatePath(`/dashboard/creator/my-campaigns/${participation.id}`);
    revalidatePath("/dashboard/creator/settlement");
    return Response.json({ participation: { id: participation.id, status: participation.status } }, { status: 201 });
  } catch (error) {
    return invitationCreationError(error);
  }
}
