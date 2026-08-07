import { requireUser } from "@/lib/auth";
import { transitionParticipationAsAdmin } from "@/lib/creator-campaigns";
import { handleAdminParticipationMutation } from "@/lib/admin-participation-route-handlers";
import { revalidatePath } from "next/cache";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireUser("admin");
  const { id: participationId } = await params;
  return handleAdminParticipationMutation(request, participationId, { adminId: admin.id, transitionParticipationAsAdmin, revalidatePath });
}
