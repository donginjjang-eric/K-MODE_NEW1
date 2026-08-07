import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getApprovedCreatorForApi } from "@/lib/auth";
import { respondToInvitation } from "@/lib/creator-campaigns";

function invitationError(error: unknown) {
  const message = error instanceof Error ? error.message : "Invitation could not be updated.";
  if (/not found/i.test(message)) return NextResponse.json({ code: "not_found", error: "Invitation was not found." }, { status: 404 });
  if (/capacity/i.test(message)) return NextResponse.json({ code: "capacity_full", error: "This campaign has reached capacity." }, { status: 409 });
  if (/only invitations/i.test(message)) return NextResponse.json({ code: "invalid_state", error: "This invitation has already been answered." }, { status: 409 });
  return NextResponse.json({ code: "error", error: "Invitation could not be updated." }, { status: 500 });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getApprovedCreatorForApi();
  if (!auth.ok) return NextResponse.json({ code: "unauthorized", error: auth.error }, { status: auth.status });
  const { id: participationId } = await params;
  const body = await request.json().catch(() => null);
  if (!participationId) return NextResponse.json({ code: "not_found", error: "Invitation was not found." }, { status: 404 });
  if (!body || typeof body.accept !== "boolean") return NextResponse.json({ code: "invalid_request", error: "An invitation response is required." }, { status: 400 });

  try {
    const accept = body.accept;
    const participation = await respondToInvitation(auth.creator.id, participationId, accept);
    revalidatePath("/dashboard/creator");
    revalidatePath("/dashboard/creator/my-campaigns");
    revalidatePath(`/dashboard/creator/my-campaigns/${participationId}`);
    return NextResponse.json({ participation: { id: participation.id, status: participation.status } });
  } catch (error) {
    return invitationError(error);
  }
}
