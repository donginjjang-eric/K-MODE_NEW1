import Link from "next/link";
import { requireApprovedCreator } from "@/lib/auth";
import { getCreatorMissionParticipations } from "@/lib/db";
import CreatorInvitationActions from "@/components/CreatorInvitationActions";
import { creatorNextActionLabel, creatorPersona, missionMatchesPersona } from "@/lib/creator-persona";
import { creatorStatusLabel } from "@/lib/creator-copy";

export default async function MyCampaignsPage({ searchParams }: { searchParams: Promise<{ persona?: string }> }) {
  const { user, creator } = await requireApprovedCreator();
  const persona = creatorPersona((await searchParams).persona);
  const allParticipations = await getCreatorMissionParticipations(creator.id);
  const participations = user.role === "admin" ? allParticipations.filter((item) => missionMatchesPersona(item, persona)) : allParticipations;

  return (
    <div className="creator-missions-page">
      <header className="creator-page-heading"><p>참여 캠페인</p><h1>내 미션</h1><span>초대와 지원 현황, 캠페인 안내, 다음 할 일을 한곳에서 확인하세요.</span></header>
      {participations.length ? <ul className="creator-activity-list">{participations.map((participation) => (
        <li key={participation.id}>
          <div><strong>{participation.campaign_title}</strong><span>{creatorNextActionLabel(participation.status)}</span></div>
          <div><b>{creatorStatusLabel(participation.status)}</b>{participation.status === "invited" ? <><CreatorInvitationActions participationId={participation.id} /><Link href={`/dashboard/creator/my-campaigns/${participation.id}`}>미션 보기</Link></> : <Link href={`/dashboard/creator/my-campaigns/${participation.id}`}>미션 보기</Link>}</div>
        </li>
      ))}</ul> : <div className="creator-empty-state"><h2>아직 참여 중인 미션이 없습니다.</h2><p>초대를 수락하거나 캠페인에 지원하면 이곳에 표시됩니다.</p><Link href="/dashboard/creator/campaigns">추천 캠페인 보기</Link></div>}
    </div>
  );
}
