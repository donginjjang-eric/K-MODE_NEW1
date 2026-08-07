import Link from "next/link";
import AdminCampaignList from "@/components/AdminCampaignList";
import { listAdminCampaigns } from "@/lib/creator-campaigns";
import type { AdminCampaignStatus } from "@/lib/types";

const STATUSES = ["all", "draft", "recruiting", "active", "closed"] as const;

export default async function AdminCampaignsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const selectedStatus = STATUSES.includes(status as typeof STATUSES[number]) ? status as typeof STATUSES[number] : "all";
  const campaigns = await listAdminCampaigns(selectedStatus === "all" ? {} : { status: selectedStatus as AdminCampaignStatus });

  return <><div className="admin-campaign-page-head"><div><h1 className="st-title">크리에이터 캠페인</h1><p className="st-sub">캠페인을 만들고 모집 상태와 운영 정보를 관리합니다.</p></div><Link className="st-btn primary" href="/dashboard/admin/campaigns/new">새 캠페인</Link></div><AdminCampaignList campaigns={campaigns} selectedStatus={selectedStatus} /></>;
}
