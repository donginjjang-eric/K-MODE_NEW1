import Link from "next/link";
import CreatorSubmissionForm from "@/components/CreatorSubmissionForm";
import { requireApprovedCreator } from "@/lib/auth";
import { getContentSubmissionsForParticipation, getCreatorMissionParticipations } from "@/lib/db";
import { creatorNextActionLabel, creatorPersona, missionMatchesPersona } from "@/lib/creator-persona";

export default async function CreatorSubmissionsPage({ searchParams }: { searchParams: Promise<{ persona?: string }> }) {
  const { user, creator } = await requireApprovedCreator();
  const persona = creatorPersona((await searchParams).persona);
  const allParticipations = await getCreatorMissionParticipations(creator.id);
  const participations = user.role === "admin" ? allParticipations.filter((item) => missionMatchesPersona(item, persona)) : allParticipations;
  const missions = await Promise.all(participations.map(async (participation) => ({
    participation,
    submissions: await getContentSubmissionsForParticipation(participation.id),
  })));

  return (
    <div className="creator-submissions-page creator-campaigns-page">
      <header className="creator-page-heading creator-page-heading-wide">
        <p>CONTENT PRODUCTION</p><h1>콘텐츠 제작</h1>
        <span>한국 공급자의 가이드에 맞춰 콘텐츠 링크를 제출하고, 검수 의견과 수정 이력을 한곳에서 관리합니다.</span>
      </header>
      <div className="creator-production-guide" aria-label="콘텐츠 제작 흐름">
        <span>1 · 제품 수령</span><span>2 · 콘텐츠 제작</span><span>3 · 검수</span><span>4 · 게시</span>
      </div>
      {missions.length ? <ul className="creator-production-list">{missions.map(({ participation, submissions }) => <li key={participation.id}>
        <div className="creator-production-copy"><p>{participation.campaign_category}</p><h2>{participation.campaign_title}</h2><span>{creatorNextActionLabel(participation.status)}</span></div>
        {(participation.status === "creating" || participation.status === "review") ? <CreatorSubmissionForm participationId={participation.id} /> : null}
        <div className="creator-production-meta"><span>{submissions.length ? `제출 버전 ${submissions.length}개` : "제출 전"}</span><b>{participation.status}</b><Link href={`/dashboard/creator/my-campaigns/${participation.id}`}>미션 상세</Link></div>
      </li>)}</ul> : <div className="creator-empty-state"><h2>제작할 콘텐츠가 없습니다.</h2><p>캠페인 매칭 후 제작 미션이 여기에 표시됩니다.</p><Link href="/dashboard/creator/my-campaigns">내 미션 보기</Link></div>}
    </div>
  );
}
