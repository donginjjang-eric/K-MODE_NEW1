import { revalidatePath } from "next/cache";
import { requireBeautyPartner } from "@/lib/auth";
import { beautyCampaignMutationError } from "@/lib/beauty-campaign-response";
import { setBeautyPartnerCampaignStatus } from "@/lib/beauty-partner-campaigns";
import type { AdminCampaignStatus } from "@/lib/types";

const VALID_STATUSES = new Set<AdminCampaignStatus>(["recruiting", "active", "closed"]);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { designer, user } = await requireBeautyPartner();
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const status = body && typeof body === "object" && !Array.isArray(body) ? (body as { status?: unknown }).status : null;
  if (!id || typeof status !== "string" || !VALID_STATUSES.has(status as AdminCampaignStatus)) {
    return Response.json({ code: "invalid_request", error: "변경할 캠페인 상태를 확인해 주세요." }, { status: 400 });
  }
  try {
    const campaign = await setBeautyPartnerCampaignStatus(designer.id, user.id, id, status as AdminCampaignStatus);
    for (const path of ["/dashboard/beauty/campaigns", "/dashboard/creator", "/dashboard/creator/campaigns", "/dashboard/creator/my-campaigns"]) revalidatePath(path);
    return Response.json({ campaign });
  } catch (error) {
    return beautyCampaignMutationError(error);
  }
}
