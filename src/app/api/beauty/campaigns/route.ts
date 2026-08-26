import { revalidatePath } from "next/cache";
import { requireBeautyPartner } from "@/lib/auth";
import { parseBeautyCampaignCreateInput } from "@/lib/beauty-campaign-input";
import { beautyCampaignMutationError } from "@/lib/beauty-campaign-response";
import { createBeautyPartnerCampaign } from "@/lib/beauty-partner-campaigns";

export async function POST(request: Request) {
  const { designer, user } = await requireBeautyPartner();
  const body = await request.json().catch(() => null);
  const input = parseBeautyCampaignCreateInput(body);
  if (!input) return Response.json({ code: "invalid_request", error: "상품과 캠페인 필수 항목을 확인해 주세요." }, { status: 400 });
  try {
    const campaign = await createBeautyPartnerCampaign(designer.id, user.id, input);
    revalidatePath("/dashboard/beauty");
    revalidatePath("/dashboard/beauty/campaigns");
    revalidatePath("/dashboard/creator/campaigns");
    return Response.json({ campaign }, { status: 201 });
  } catch (error) {
    return beautyCampaignMutationError(error);
  }
}
