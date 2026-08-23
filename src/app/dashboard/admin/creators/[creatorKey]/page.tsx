import { notFound } from "next/navigation";
import AdminCreatorDetailManager from "@/components/AdminCreatorDetailManager";
import { getCreatorAccountsForAdmin, hasDatabase } from "@/lib/db";
import { getManagedCreatorDetail, listCreatorManagementGroups, type AdminManagedCreatorDetail } from "@/lib/creator-management";

export default async function AdminCreatorDetailPage({ params }: { params: Promise<{ creatorKey: string }> }) {
  const { creatorKey } = await params;
  const databaseReady = hasDatabase();
  const detail = databaseReady ? await getManagedCreatorDetail(creatorKey) : null;
  const groups = databaseReady ? await listCreatorManagementGroups() : [];
  let creator: AdminManagedCreatorDetail | null = detail;

  if (!creator) {
    const legacy = (await getCreatorAccountsForAdmin()).find((item) => item.creator_key === creatorKey);
    if (legacy) {
      creator = {
        ...legacy,
        followerTotal: legacy.instagram_followers + legacy.tiktok_followers,
        managementGroupId: null,
        managementGroupName: null,
        campaigns: [],
        settlement: { expectedRewardTotal: 0, settledCount: 0, unsettledCount: 0 },
      };
    }
  }
  if (!creator) notFound();

  return <AdminCreatorDetailManager creator={creator} groups={groups} durable={Boolean(detail)} />;
}
