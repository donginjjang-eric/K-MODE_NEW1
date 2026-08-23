import AdminCreatorManagementTable, { type AdminCreatorManagementRow } from "@/components/AdminCreatorManagementTable";
import { getCreatorAccountsForAdmin, hasDatabase } from "@/lib/db";
import { listCreatorManagementGroups, listManagedCreators } from "@/lib/creator-management";

export default async function AdminCreatorAccountsPage() {
  const catalogue = await getCreatorAccountsForAdmin();
  const [durableCreators, groups] = hasDatabase()
    ? await Promise.all([listManagedCreators(), listCreatorManagementGroups()])
    : [[], []];
  const byCreatorKey = new Map<string, AdminCreatorManagementRow>();

  for (const creator of catalogue) {
    byCreatorKey.set(creator.creator_key, {
      ...creator,
      followerTotal: creator.instagram_followers + creator.tiktok_followers,
      managementGroupId: null,
      managementGroupName: null,
      durable: creator.is_linked,
    });
  }
  for (const creator of durableCreators) {
    byCreatorKey.set(creator.creator_key, { ...creator, durable: true });
  }

  return (
    <>
      <div className="admin-creator-page-head">
        <div>
          <p className="st-eyebrow">CREATOR OPERATIONS</p>
          <h1 className="st-title">크리에이터 관리</h1>
          <p className="st-sub">회원 상태와 공개 프로필을 확인하고, 저장된 크리에이터를 관리 그룹에 한 번에 배정합니다.</p>
        </div>
        <div className="admin-creator-page-count"><strong>{byCreatorKey.size}</strong><span>전체 크리에이터</span></div>
      </div>
      <AdminCreatorManagementTable creators={[...byCreatorKey.values()]} groups={groups} />
    </>
  );
}
