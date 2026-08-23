import { revalidatePath } from "next/cache";
import {
  creatorManagementErrorResponse,
  getAdminUserForApi,
  handleCreatorGroupUpdate,
} from "@/lib/admin-creator-group-route-handlers";
import { getCreatorManagementGroup, updateCreatorManagementGroup } from "@/lib/creator-management";

function publicCreator(creator: Record<string, unknown>) {
  return {
    id: creator.id,
    creatorKey: creator.creator_key,
    displayName: creator.display_name,
    approvalStatus: creator.approval_status,
    platform: creator.platform,
    market: creator.market,
    categories: creator.categories,
    profileImageUrl: creator.profile_image_url,
    specialty: creator.specialty,
    bio: creator.bio,
    instagramHandle: creator.instagram_handle,
    instagramUrl: creator.instagram_url,
    instagramFollowers: creator.instagram_followers,
    tiktokHandle: creator.tiktok_handle,
    tiktokUrl: creator.tiktok_url,
    tiktokFollowers: creator.tiktok_followers,
    followersVerifiedAt: creator.followers_verified_at,
    followerTotal: creator.followerTotal,
  };
}

function publicGroup(group: NonNullable<Awaited<ReturnType<typeof getCreatorManagementGroup>>>) {
  return {
    id: group.id,
    name: group.name,
    agencyName: group.agencyName,
    notes: group.notes,
    status: group.status,
    creatorCount: group.creatorCount,
    followerTotal: group.followerTotal,
    creators: group.creators.map((creator) => publicCreator(creator as unknown as Record<string, unknown>)),
    agencyUsers: group.agencyUsers.map((user) => ({ email: user.email, status: user.status })),
    auditEvents: group.auditEvents.map((event) => ({ action: event.action, createdAt: event.createdAt, metadata: event.metadata })),
  };
}

export async function GET(_request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const auth = await getAdminUserForApi();
  if (!auth.ok) return auth.response;
  const { groupId } = await params;
  try {
    const group = await getCreatorManagementGroup(groupId);
    if (!group) return Response.json({ code: "not_found", error: "요청한 관리 그룹을 찾을 수 없습니다." }, { status: 404 });
    return Response.json({ group: publicGroup(group) });
  } catch (error) {
    return creatorManagementErrorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const auth = await getAdminUserForApi();
  if (!auth.ok) return auth.response;
  const { groupId } = await params;
  return handleCreatorGroupUpdate(request, groupId, {
    adminId: auth.user.id,
    createGroup: async () => "",
    updateGroup: updateCreatorManagementGroup,
    assignCreators: async () => 0,
    removeCreators: async () => 0,
    inviteAgencyUser: async () => {},
    revalidatePath,
  });
}
