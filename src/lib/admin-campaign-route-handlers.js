import { invalidCampaignInputResponse, parseAdminCampaignCreateInput, parseAdminCampaignPatchInput } from "./admin-campaign-input.js";

export function campaignMutationError(error) {
  const message = error instanceof Error ? error.message : "Campaign operation failed.";
  if (/supported currency code followed by a whole-number amount/i.test(message)) {
    return Response.json({ code: "invalid_reward", error: "리워드는 RM 420, VND 2,500,000처럼 지원 통화 코드와 정수 금액 순서로 입력해 주세요." }, { status: 400 });
  }
  if (/not found/i.test(message)) return Response.json({ code: "not_found", error: "캠페인을 찾을 수 없습니다. 목록을 새로고침해 주세요." }, { status: 404 });
  if (/capacity/i.test(message)) return Response.json({ code: "capacity_full", error: "현재 확정 인원보다 모집 인원을 적게 설정할 수 없습니다." }, { status: 409 });
  if (/only draft or recruiting|closed|conflict|cannot transition|cannot be reopened/i.test(message)) {
    return Response.json({ code: "invalid_state", error: "현재 캠페인 상태에서는 이 작업을 할 수 없습니다. 목록을 새로고침해 주세요." }, { status: 409 });
  }
  if (/required|invalid|positive|at least|before|https/i.test(message)) {
    return Response.json({ code: "invalid_request", error: "필수 항목, 모집 인원, 마감일 순서와 HTTPS 주소를 확인해 주세요." }, { status: 400 });
  }
  console.error("[admin-campaign] mutation failed:", error);
  return Response.json({ code: "server_error", error: "캠페인을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
}

export async function handleAdminCampaignCreate(request, { adminId, createAdminCampaign, revalidatePath }) {
  const body = await request.json().catch(() => null);
  const input = parseAdminCampaignCreateInput(body);
  if (!input) return invalidCampaignInputResponse();

  try {
    const campaign = await createAdminCampaign(adminId, input);
    revalidatePath("/dashboard/admin/campaigns");
    revalidatePath(`/dashboard/admin/campaigns/${campaign.id}`);
    return Response.json({ campaign }, { status: 201 });
  } catch (error) {
    return campaignMutationError(error);
  }
}

export async function handleAdminCampaignUpdate(request, campaignId, { adminId, updateAdminCampaign, revalidatePath }) {
  const body = await request.json().catch(() => null);
  const input = parseAdminCampaignPatchInput(body);
  if (!input) return invalidCampaignInputResponse();

  try {
    const campaign = await updateAdminCampaign(adminId, campaignId, input);
    revalidatePath("/dashboard/admin/campaigns");
    revalidatePath(`/dashboard/admin/campaigns/${campaignId}`);
    revalidatePath(`/dashboard/admin/campaigns/${campaignId}/edit`);
    return Response.json({ campaign });
  } catch (error) {
    return campaignMutationError(error);
  }
}
