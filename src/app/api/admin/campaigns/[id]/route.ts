import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { updateAdminCampaign } from "@/lib/creator-campaigns";
import { handleAdminCampaignUpdate } from "@/lib/admin-campaign-route-handlers";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireUser("admin");
  const { id: campaignId } = await params;
  if (!campaignId) return Response.json({ code: "not_found", error: "캠페인을 찾을 수 없습니다." }, { status: 404 });
  return handleAdminCampaignUpdate(request, campaignId, { adminId: admin.id, updateAdminCampaign, revalidatePath });
}
