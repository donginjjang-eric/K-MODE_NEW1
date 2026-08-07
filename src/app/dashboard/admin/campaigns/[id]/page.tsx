import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminCampaign } from "@/lib/creator-campaigns";

export default async function AdminCampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = await getAdminCampaign(id);
  if (!campaign) notFound();

  return (
    <>
      <div className="admin-campaign-page-head">
        <div><h1 className="st-title">{campaign.title}</h1><p className="st-sub">{campaign.category} · {campaign.status}</p></div>
        <Link className="st-btn primary" href={`/dashboard/admin/campaigns/${campaign.id}/edit`}>캠페인 수정</Link>
      </div>
      <section className="st-card admin-campaign-detail">
        <p>{campaign.brief}</p>
        <dl><div><dt>리워드</dt><dd>{campaign.reward_text}</dd></div><div><dt>모집 인원</dt><dd>{campaign.slots}</dd></div></dl>
      </section>
    </>
  );
}
