import { revalidatePath } from "next/cache";
import { requireBeautyPartner } from "@/lib/auth";
import { beautyCampaignMutationError } from "@/lib/beauty-campaign-response";
import { transitionBeautyPartnerParticipation } from "@/lib/beauty-partner-campaigns";
import type { AdminParticipationAction } from "@/lib/types";

const VALID_ACTIONS = new Set<AdminParticipationAction>(["approve", "reject", "cancel", "shipping", "creating", "review", "published", "settlement", "completed"]);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { designer, user } = await requireBeautyPartner();
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const action = body && typeof body === "object" && !Array.isArray(body) ? (body as { action?: unknown }).action : null;
  const note = body && typeof body === "object" && !Array.isArray(body) ? (body as { note?: unknown }).note : undefined;
  const submissionId = body && typeof body === "object" && !Array.isArray(body) ? (body as { submissionId?: unknown }).submissionId : undefined;
  if (!id || typeof action !== "string" || !VALID_ACTIONS.has(action as AdminParticipationAction) || (note !== undefined && typeof note !== "string") || (submissionId !== undefined && typeof submissionId !== "string")) {
    return Response.json({ code: "invalid_request", error: "참여 상태와 메모를 확인해 주세요." }, { status: 400 });
  }
  try {
    const participation = await transitionBeautyPartnerParticipation(designer.id, user.id, id, action as AdminParticipationAction, note ?? "", submissionId);
    for (const path of ["/dashboard/beauty/campaigns", "/dashboard/beauty/content", "/dashboard/beauty/orders", "/dashboard/beauty/settlements", "/dashboard/creator", "/dashboard/creator/my-campaigns", "/dashboard/creator/submissions", "/dashboard/creator/settlement"]) revalidatePath(path);
    return Response.json({ participation });
  } catch (error) {
    return beautyCampaignMutationError(error);
  }
}
