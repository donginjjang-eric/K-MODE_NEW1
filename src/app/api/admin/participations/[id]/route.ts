import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { transitionParticipationAsAdmin } from "@/lib/creator-campaigns";
import type { AdminParticipationAction } from "@/lib/types";

const VALID_ACTIONS = new Set<AdminParticipationAction>(["matched", "shipping", "creating", "review", "published", "settlement", "completed", "cancelled"]);

function participationError(error: unknown) {
  const message = error instanceof Error ? error.message : "Participation could not be updated.";
  if (/was not found/i.test(message)) return Response.json({ code: "not_found", error: message }, { status: 404 });
  if (/cannot transition|closed/i.test(message)) return Response.json({ code: "invalid_state", error: message }, { status: 409 });
  if (/required|invalid/i.test(message)) return Response.json({ code: "invalid_request", error: message }, { status: 400 });
  console.error("[admin-participation] update failed:", error);
  return Response.json({ code: "server_error", error: "Participation could not be updated." }, { status: 500 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireUser("admin");
  const { id: participationId } = await params;
  const body = await request.json().catch(() => null);
  const action = body && typeof body === "object" && !Array.isArray(body) ? (body as { action?: unknown }).action : null;
  const note = body && typeof body === "object" && !Array.isArray(body) ? (body as { note?: unknown }).note : undefined;

  if (!participationId) return Response.json({ code: "not_found", error: "Participation was not found." }, { status: 404 });
  if (typeof action !== "string" || !VALID_ACTIONS.has(action as AdminParticipationAction) || (note !== undefined && typeof note !== "string")) {
    return Response.json({ code: "invalid_request", error: "A valid action and optional note are required." }, { status: 400 });
  }

  try {
    const participation = await transitionParticipationAsAdmin(admin.id, participationId, action as AdminParticipationAction, note);
    revalidatePath("/dashboard/admin/campaigns");
    revalidatePath(`/dashboard/admin/campaigns/${participation.campaign_id}`);
    revalidatePath("/dashboard/creator");
    revalidatePath("/dashboard/creator/campaigns");
    revalidatePath("/dashboard/creator/my-campaigns");
    revalidatePath(`/dashboard/creator/my-campaigns/${participationId}`);
    revalidatePath("/dashboard/creator/settlement");
    return Response.json({ participation });
  } catch (error) {
    return participationError(error);
  }
}
