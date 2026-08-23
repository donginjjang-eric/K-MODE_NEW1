import Link from "next/link";
import { hasDatabase } from "@/lib/db";
import { listCreatorManagementGroups } from "@/lib/creator-management";

const numberFormat = new Intl.NumberFormat("ko-KR");

export default async function AdminCreatorGroupsPage() {
  const groups = hasDatabase() ? await listCreatorManagementGroups() : [];
  return (
    <>
      <div className="admin-creator-page-head"><div><p className="st-eyebrow">AGENCY OPERATIONS</p><h1 className="st-title">관리 그룹</h1><p className="st-sub">여러 크리에이터를 대행사 단위로 묶고 소속 범위와 운영 상태를 관리합니다.</p></div><Link className="st-btn dark" href="/dashboard/admin/creators">크리에이터 선택해 그룹 만들기</Link></div>
      {groups.length ? <section className="admin-group-grid" aria-label="크리에이터 관리 그룹 목록">{groups.map((group) => <Link className="admin-group-card" href={`/dashboard/admin/creator-groups/${group.id}`} key={group.id}>
        <header><span className={`admin-group-status is-${group.status}`}>{group.status === "active" ? "운영 중" : "비활성"}</span><span>상세 관리 →</span></header>
        <h2>{group.name}</h2><p>{group.agencyName || "대행사 미지정"}</p>
        <dl><div><dt>소속 크리에이터</dt><dd>{group.creatorCount}명</dd></div><div><dt>총 팔로워</dt><dd>{numberFormat.format(group.followerTotal)}</dd></div><div><dt>캠페인 · 거래</dt><dd>{group.campaignCount}개 · {group.dealCount}건</dd></div><div><dt>정산</dt><dd>완료 {group.settledCount}건 · 진행 {group.pendingSettlementCount}건</dd></div><div className="is-wide"><dt>리워드</dt><dd>금액 텍스트 확인 가능 {group.rewardTextCount}건 · 통화 혼합 합산 안 함</dd></div></dl>
      </Link>)}</section> : <div className="st-empty"><p>아직 관리 그룹이 없습니다. 크리에이터를 선택해 첫 그룹을 만들어 주세요.</p><Link className="st-btn primary" href="/dashboard/admin/creators">크리에이터 관리로 이동</Link></div>}
    </>
  );
}
