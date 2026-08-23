import { revalidatePath } from "next/cache";
import {
  creatorManagementErrorResponse,
  getAdminUserForApi,
  handleCreatorGroupCreate,
} from "@/lib/admin-creator-group-route-handlers";
import { createCreatorManagementGroup, listCreatorManagementGroups } from "@/lib/creator-management";

export async function GET() {
  const auth = await getAdminUserForApi();
  if (!auth.ok) return auth.response;
  try {
    return Response.json({ groups: await listCreatorManagementGroups() });
  } catch (error) {
    return creatorManagementErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const auth = await getAdminUserForApi();
  if (!auth.ok) return auth.response;
  return handleCreatorGroupCreate(request, {
    adminId: auth.user.id,
    createGroup: createCreatorManagementGroup,
    updateGroup: async () => {},
    assignCreators: async () => 0,
    removeCreators: async () => 0,
    inviteAgencyUser: async () => {},
    revalidatePath,
  });
}
