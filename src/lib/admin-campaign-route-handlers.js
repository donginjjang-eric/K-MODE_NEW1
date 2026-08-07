import { invalidCampaignInputResponse, parseAdminCampaignCreateInput, parseAdminCampaignPatchInput } from "./admin-campaign-input.js";

export function campaignMutationError(error) {
  const message = error instanceof Error ? error.message : "캠페인을 처리할 수 없습니다.";
  if (/not found/i.test(message)) return Response.json({ error: "캠페인을 찾을 수 없습니다." }, { status: 404 });
  if (/closed|conflict|cannot be reopened/i.test(message)) return Response.json({ error: "현재 상태에서는 캠페인을 변경할 수 없습니다." }, { status: 409 });
  if (/required|invalid|positive|at least|before|https/i.test(message)) return Response.json({ error: "입력한 캠페인 정보를 확인해 주세요." }, { status: 400 });
  return Response.json({ error: "캠페인을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
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
