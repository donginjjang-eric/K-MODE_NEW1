import { revalidatePath } from "next/cache";
import { getAdminUserForApi, handleCreatorGroupMembersUpdate } from "@/lib/admin-creator-group-route-handlers";
import { assignCreatorsToManagementGroup, removeCreatorsFromManagementGroup } from "@/lib/creator-management";

export async function PATCH(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const auth = await getAdminUserForApi();
  if (!auth.ok) return auth.response;
  const { groupId } = await params;
  return handleCreatorGroupMembersUpdate(request, groupId, {
    adminId: auth.user.id,
    createGroup: async () => "",
    updateGroup: async () => {},
    assignCreators: assignCreatorsToManagementGroup,
    removeCreators: removeCreatorsFromManagementGroup,
    inviteAgencyUser: async () => {},
    revalidatePath,
  });
}
