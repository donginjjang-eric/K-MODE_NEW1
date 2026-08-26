import Link from "next/link";
import { BeautyParticipationActions } from "@/components/BeautyCampaignActions";
import { participationStatusLabel, submissionStatusLabel } from "@/lib/admin-campaign";
import { safeHttpsUrl } from "@/lib/admin-campaign-ui";
import { requireBeautyPartner } from "@/lib/auth";
import { listBeautyPartnerContent } from "@/lib/beauty-partner-campaigns";

export default async function BeautyContentPage() {
  const { designer } = await requireBeautyPartner();
  const submissions = await listBeautyPartnerContent(designer.id);
  return <div className="beauty-operations-page">
    <header className="beauty-page-heading"><p>CONTENT REVIEW</p><h1>콘텐츠 검수</h1><span>내 캠페인 참여자가 제출한 실제 콘텐츠 버전만 표시됩니다. 검수 단계에서 승인하거나 수정 사유를 전달하세요.</span></header>
    {submissions.length ? <section className="beauty-content-list" aria-label="콘텐츠 제출 목록">{submissions.map((submission) => {
      const contentUrl = safeHttpsUrl(submission.content_url);
      return <article key={submission.id}><header><div><span>{submission.product_name || submission.campaign_title}</span><h2>{submission.campaign_title}</h2><p>{submission.creator_display_name} · {submission.creator_platform || "플랫폼 미등록"} · v{submission.version}</p></div><b className={`beauty-status is-${submission.status}`}>{submissionStatusLabel(submission.status)}</b></header><div className="beauty-content-body"><p>{submission.caption_text || "캡션이 등록되지 않았습니다."}</p>{contentUrl ? <a href={contentUrl} rel="noopener noreferrer" target="_blank">제출 콘텐츠 열기 ↗</a> : <span>안전한 HTTPS 콘텐츠 링크가 없습니다.</span>}</div><footer><span>참여 단계 · {participationStatusLabel(submission.participation_status)}</span>{submission.review_note ? <p>최근 검수 메모 · {submission.review_note}</p> : null}</footer>{submission.is_latest && submission.participation_status === "review" ? <BeautyParticipationActions participationId={submission.participation_id} status={submission.participation_status} submissionId={submission.id} /> : null}</article>;
    })}</section> : <section className="beauty-empty-state"><h2>검수할 콘텐츠가 없습니다.</h2><p>캠페인 참여자가 제작 단계에서 콘텐츠를 제출하면 버전과 검수 상태가 여기에 표시됩니다.</p><Link className="beauty-action primary" href="/dashboard/beauty/campaigns">캠페인 참여 현황 보기</Link></section>}
  </div>;
}
