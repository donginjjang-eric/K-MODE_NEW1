import Link from "next/link";
import { requireApprovedCreator } from "@/lib/auth";
import { getCreatorMissionParticipations } from "@/lib/db";
import CreatorInvitationActions from "@/components/CreatorInvitationActions";
import { creatorNextActionLabel, creatorPersona, missionMatchesPersona } from "@/lib/creator-persona";

export default async function MyCampaignsPage({ searchParams }: { searchParams: Promise<{ persona?: string }> }) {
  const { user, creator } = await requireApprovedCreator();
  const persona = creatorPersona((await searchParams).persona);
  const allParticipations = await getCreatorMissionParticipations(creator.id);
  const participations = user.role === "admin" ? allParticipations.filter((item) => missionMatchesPersona(item, persona)) : allParticipations;

  return (
    <div className="creator-missions-page">
      <header className="creator-page-heading"><p>MY CAMPAIGNS</p><h1>My missions</h1><span>Track invitations, briefs, and your next campaign action.</span></header>
      {participations.length ? <ul className="creator-activity-list">{participations.map((participation) => (
        <li key={participation.id}>
          <div><strong>{participation.campaign_title}</strong><span>{creatorNextActionLabel(participation.status)}</span></div>
          <div><b>{participation.status}</b>{participation.status === "invited" ? <><CreatorInvitationActions participationId={participation.id} /><Link href={`/dashboard/creator/my-campaigns/${participation.id}`}>View mission</Link></> : <Link href={`/dashboard/creator/my-campaigns/${participation.id}`}>View mission</Link>}</div>
        </li>
      ))}</ul> : <div className="creator-empty-state"><h2>No campaign missions yet.</h2><p>Accepted invitations and applications will appear here.</p><Link href="/dashboard/creator/campaigns">Explore campaigns</Link></div>}
    </div>
  );
}
