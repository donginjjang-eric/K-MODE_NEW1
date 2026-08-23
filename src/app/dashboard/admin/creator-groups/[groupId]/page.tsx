import { notFound } from "next/navigation";
import AdminCreatorGroupManager from "@/components/AdminCreatorGroupManager";
import { hasDatabase } from "@/lib/db";
import { getCreatorManagementGroup, isOperationalCreatorKey, listCreatorManagementGroups, listManagedCreators } from "@/lib/creator-management";

export default async function AdminCreatorGroupDetailPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  if (!hasDatabase()) notFound();
  const [group, creators, groups] = await Promise.all([
    getCreatorManagementGroup(groupId),
    listManagedCreators(),
    listCreatorManagementGroups(),
  ]);
  if (!group) notFound();
  return <AdminCreatorGroupManager group={group} creators={creators.filter((creator) => isOperationalCreatorKey(creator.creator_key))} groups={groups} />;
}
