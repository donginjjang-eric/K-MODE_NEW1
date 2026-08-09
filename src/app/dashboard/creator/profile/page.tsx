import { requireApprovedCreator } from "@/lib/auth";
import { creatorStatusLabel } from "@/lib/creator-copy";

export default async function CreatorProfilePage() {
  const { creator } = await requireApprovedCreator();
  return <div className="creator-campaigns-page">
    <header className="creator-page-heading"><p>내 정보</p><h1>크리에이터 프로필</h1><span>연결된 프로필 정보는 K-MODU 운영팀에서 관리합니다.</span></header>
    <section className="creator-campaign-card"><div className="creator-campaign-card-body"><dl>
      <div><dt>활동명</dt><dd>{creator.display_name}</dd></div>
      <div><dt>플랫폼</dt><dd>{creator.platform}</dd></div>
      <div><dt>활동 국가</dt><dd>{creator.market}</dd></div>
      <div><dt>관심 분야</dt><dd>{creator.categories.join(", ") || "등록되지 않음"}</dd></div>
      <div><dt>Google 이메일</dt><dd>{creator.google_email}</dd></div>
      <div><dt>승인 상태</dt><dd>{creatorStatusLabel(creator.approval_status)}</dd></div>
    </dl></div></section>
  </div>;
}
