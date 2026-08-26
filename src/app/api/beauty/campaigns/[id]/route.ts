import { revalidatePath } from "next/cache";
import { requireBeautyPartner } from "@/lib/auth";
import { parseBeautyCampaignPatchInput } from "@/lib/beauty-campaign-input";
import { beautyCampaignMutationError } from "@/lib/beauty-campaign-response";
import { updateBeautyPartnerCampaign } from "@/lib/beauty-partner-campaigns";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { designer, user } = await requireBeautyPartner();
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const input = parseBeautyCampaignPatchInput(body);
  if (!id || !input) return Response.json({ code: "invalid_request", error: "캠페인 수정 항목을 확인해 주세요." }, { status: 400 });
  try {
    const campaign = await updateBeautyPartnerCampaign(designer.id, user.id, id, input);
    revalidatePath("/dashboard/beauty/campaigns");
    revalidatePath("/dashboard/creator/campaigns");
    return Response.json({ campaign });
  } catch (error) {
    return beautyCampaignMutationError(error);
  }
}
