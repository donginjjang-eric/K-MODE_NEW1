import { requireApprovedCreator } from "@/lib/auth";
import { creatorStatusLabel } from "@/lib/creator-copy";

export default async function CreatorProfilePage() {
  const { creator } = await requireApprovedCreator();
  const initial = creator.display_name?.trim().slice(0, 1).toUpperCase() || "K";
  return <div className="creator-campaigns-page creator-profile-page">
    <header className="creator-page-heading creator-page-heading-wide"><p>내 정보</p><h1>크리에이터 프로필</h1><span>캠페인 추천과 운영 안내에 사용되는 연결 정보를 확인하세요.</span></header>
    <section className="creator-profile-identity"><div className="creator-profile-avatar">{initial}</div><div><span>승인된 크리에이터</span><h2>{creator.display_name || "등록되지 않음"}</h2><p>{creator.platform || "플랫폼 미등록"} · {creator.market || "활동 국가 미등록"}</p></div><b>{creatorStatusLabel(creator.approval_status)}</b></section>
    <div className="creator-profile-columns"><section className="creator-detail-panel"><div className="creator-detail-section-heading"><span>계정 정보</span><h2>프로필 상세</h2></div><dl className="creator-profile-grid"><div><dt>활동명</dt><dd>{creator.display_name || "등록되지 않음"}</dd></div><div><dt>주요 플랫폼</dt><dd>{creator.platform || "등록되지 않음"}</dd></div><div><dt>활동 국가</dt><dd>{creator.market || "등록되지 않음"}</dd></div><div><dt>관심 분야</dt><dd>{creator.categories.join(", ") || "등록되지 않음"}</dd></div><div><dt>Google 이메일</dt><dd>{creator.google_email || "등록되지 않음"}</dd></div><div><dt>계정 상태</dt><dd>{creatorStatusLabel(creator.approval_status)}</dd></div></dl></section><aside className="creator-detail-panel creator-profile-guide"><div className="creator-detail-section-heading"><span>정보 관리</span><h2>변경이 필요하신가요?</h2></div><p>현재 프로필은 캠페인 매칭과 지급 확인에 사용되므로 운영팀에서 안전하게 관리합니다.</p><ul><li>활동 채널 또는 국가 변경</li><li>관심 분야 업데이트</li><li>연결 이메일 확인</li></ul><small>수정이 필요한 경우 K-MODU 운영팀에 변경할 내용을 알려주세요.</small></aside></div>
  </div>;
}
