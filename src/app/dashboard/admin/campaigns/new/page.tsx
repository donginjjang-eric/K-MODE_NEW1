"use client";

import { useRouter } from "next/navigation";
import AdminCampaignForm from "@/components/AdminCampaignForm";

const INITIAL_STATUS = "draft";

export default function NewAdminCampaignPage() {
  const router = useRouter();
  return <><h1 className="st-title">새 캠페인</h1><p className="st-sub">새 캠페인은 {INITIAL_STATUS} 상태로 저장됩니다.</p><AdminCampaignForm endpoint="/api/admin/campaigns" method="POST" onSuccess={(campaign) => router.push(`/dashboard/admin/campaigns/${campaign.id}`)} /></>;
}
