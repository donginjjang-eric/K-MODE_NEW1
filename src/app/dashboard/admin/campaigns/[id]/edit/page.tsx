import { notFound } from "next/navigation";
import AdminCampaignForm from "@/components/AdminCampaignForm";
import { getAdminCampaign } from "@/lib/creator-campaigns";

export default async function EditAdminCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = await getAdminCampaign(id);
  if (!campaign) notFound();
  return <><h1 className="st-title">캠페인 수정</h1><p className="st-sub">모집 중인 캠페인의 운영 정보를 최신 상태로 유지해 주세요.</p><AdminCampaignForm campaign={campaign} endpoint={`/api/admin/campaigns/${campaign.id}`} method="PATCH" redirectTo={`/dashboard/admin/campaigns/${campaign.id}`} /></>;
}
