import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createCampaignInvitation } from "@/lib/creator-campaigns";

function invitationCreationError(error: unknown) {
  const message = error instanceof Error ? error.message : "Campaign invitation could not be created.";
  if (/campaign was not found|creator account was not found|creator account is not approved/i.test(message)) {
    return Response.json({ code: "not_found", error: "Campaign or creator was not found." }, { status: 404 });
  }
  if (/not recruiting|deadline|capacity|already participates/i.test(message)) {
    return Response.json({ code: "invalid_state", error: message }, { status: 409 });
  }
  console.error("[admin-campaign-invitation] create failed:", error);
  return Response.json({ code: "server_error", error: "Campaign invitation could not be created." }, { status: 500 });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireUser("admin");
  const { id: campaignId } = await params;
  const body = await request.json().catch(() => null);
  const creatorId = body && typeof body === "object" && typeof (body as { creatorId?: unknown }).creatorId === "string"
    ? (body as { creatorId: string }).creatorId.trim()
    : "";

  if (!campaignId || !creatorId) {
    return Response.json({ code: "invalid_request", error: "Campaign and creator are required." }, { status: 400 });
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
