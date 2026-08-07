import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { setAdminCampaignStatus } from "@/lib/creator-campaigns";
import { campaignMutationError } from "@/lib/admin-campaign-route-handlers";
import type { AdminCampaignStatus } from "@/lib/types";

const VALID_STATUSES = new Set<AdminCampaignStatus>(["recruiting", "active", "closed"]);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireUser("admin");
  const { id: campaignId } = await params;
  const body = await request.json().catch(() => null);
  const status = body && typeof body === "object" && !Array.isArray(body) ? (body as { status?: AdminCampaignStatus }).status : undefined;
  if (!campaignId) return Response.json({ code: "not_found", error: "캠페인을 찾을 수 없습니다." }, { status: 404 });
  if (!status || !VALID_STATUSES.has(status as AdminCampaignStatus)) {
    return Response.json({ code: "invalid_request", error: "모집, 진행, 마감 중 하나의 상태를 선택해 주세요." }, { status: 400 });
  }

  try {
    const campaign = await setAdminCampaignStatus(admin.id, campaignId, status);
    revalidatePath("/dashboard/admin/campaigns");
    revalidatePath(`/dashboard/admin/campaigns/${campaignId}`);
    revalidatePath("/dashboard/creator");
    revalidatePath("/dashboard/creator/campaigns");
    revalidatePath("/dashboard/creator/my-campaigns");
    revalidatePath("/dashboard/creator/settlement");
    return Response.json({ campaign });
  } catch (error) {
    return campaignMutationError(error);
  }
}
