import { revalidatePath } from "next/cache";
import { getAdminUserForApi, handleAgencyUserInvite, handleAgencyUserRevoke } from "@/lib/admin-creator-group-route-handlers";
import { inviteAgencyGroupUser, revokeAgencyGroupUser } from "@/lib/creator-management";

function dependencies(adminId: string) {
  return {
    adminId,
    createGroup: async () => "",
    updateGroup: async () => {},
    assignCreators: async () => 0,
    removeCreators: async () => 0,
    inviteAgencyUser: inviteAgencyGroupUser,
    revokeAgencyUser: revokeAgencyGroupUser,
    revalidatePath,
  };
}

export async function POST(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const auth = await getAdminUserForApi();
  if (!auth.ok) return auth.response;
  const { groupId } = await params;
  return handleAgencyUserInvite(request, groupId, dependencies(auth.user.id));
}

export async function DELETE(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const auth = await getAdminUserForApi();
  if (!auth.ok) return auth.response;
  const { groupId } = await params;
  return handleAgencyUserRevoke(request, groupId, dependencies(auth.user.id));
}
