import Link from "next/link";
import { participationStatusLabel, settlementStatusLabel } from "@/lib/admin-campaign";
import { requireBeautyPartner } from "@/lib/auth";
import { BEAUTY_SETTLEMENT_STATUSES, listBeautyPartnerSettlements } from "@/lib/beauty-partner-campaigns";

export default async function BeautySettlementsPage() {
  const { designer } = await requireBeautyPartner();
  const settlements = await listBeautyPartnerSettlements(designer.id);
  const counts = Object.fromEntries(BEAUTY_SETTLEMENT_STATUSES.map((status) => [status, settlements.filter((item) => item.settlement_status === status).length]));
  return <div className="beauty-operations-page">
    <header className="beauty-page-heading"><p>SETTLEMENT LEDGER</p><h1>정산</h1><span>내 캠페인의 확정 참여에 저장된 기대 리워드와 정산 상태를 그대로 확인합니다. 서로 다른 통화나 상품 보상은 합산하지 않습니다.</span></header>
    {settlements.length ? <>
      <section className="beauty-real-summary is-four" aria-label="정산 상태별 건수">{BEAUTY_SETTLEMENT_STATUSES.map((status) => <article key={status}><span>{settlementStatusLabel(status)}</span><strong>{counts[status]}</strong><small>참여 건수</small></article>)}</section>
      <section className="beauty-settlement-list" aria-label="캠페인 정산 내역">{settlements.map((item) => <article key={item.id}><div><span>{item.creator_display_name}</span><h2>{item.campaign_title}</h2><p>참여 단계 · {participationStatusLabel(item.status)}</p></div><div><span>기대 리워드</span><strong>{item.expected_reward || "미확정"}</strong><b className={`beauty-status is-${item.settlement_status}`}>{settlementStatusLabel(item.settlement_status)}</b></div></article>)}</section>
    </> : <section className="beauty-empty-state"><h2>아직 정산 대상 참여가 없습니다.</h2><p>신청자를 매칭해 캠페인 참여가 확정되면 저장된 리워드와 실제 정산 상태가 여기에 표시됩니다.</p><Link className="beauty-action primary" href="/dashboard/beauty/campaigns">캠페인·매칭 보기</Link></section>}
  </div>;
}
