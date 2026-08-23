import { revalidatePath } from "next/cache";
import { getPublicCreatorForAdmin, isCreatorAccountEmailConflict, upsertCreatorAccountLink } from "@/lib/db";
import { getAdminUserForApi, handleAdminCreatorPatch } from "@/lib/admin-creator-group-route-handlers";
import { getManagedCreatorDetail, updateManagedCreatorPublicProfile } from "@/lib/creator-management";

export async function PATCH(request: Request, { params }: { params: Promise<{ creatorKey: string }> }) {
  const auth = await getAdminUserForApi();
  if (!auth.ok) return auth.response;
  const { creatorKey } = await params;
  return handleAdminCreatorPatch(request, creatorKey, {
    adminId: auth.user.id,
    getManagedCreator: async (key) => await getManagedCreatorDetail(key) as unknown as Record<string, unknown> | null,
    getLegacyCreator: async (key) => await getPublicCreatorForAdmin(key) as unknown as Record<string, unknown> | null,
    updateCreatorProfile: updateManagedCreatorPublicProfile,
    upsertCreatorLink: upsertCreatorAccountLink,
    isEmailConflict: isCreatorAccountEmailConflict,
    revalidatePath,
  });
}
