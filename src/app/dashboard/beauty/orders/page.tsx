import Link from "next/link";
import { participationStatusLabel } from "@/lib/admin-campaign";
import { requireBeautyPartner } from "@/lib/auth";
import { listBeautyPartnerOrders } from "@/lib/beauty-partner-campaigns";
import { getCollabRequestsForDesigner } from "@/lib/db";

const number = (value: number) => new Intl.NumberFormat("ko-KR").format(value);

export default async function BeautyOrdersPage() {
  const { designer } = await requireBeautyPartner();
  const [orders, requests] = await Promise.all([
    listBeautyPartnerOrders(designer.id),
    getCollabRequestsForDesigner(designer.id),
  ]);
  return <div className="beauty-operations-page">
    <header className="beauty-page-heading"><p>FULFILLMENT & PERFORMANCE</p><h1>성과·주문</h1><span>캠페인 배송·제작 진행과 크리에이터가 입력한 실제 조회·반응·주문 성과를 함께 확인하세요.</span></header>
    <section className="beauty-real-summary" aria-label="실데이터 운영 요약"><article><span>캠페인 참여</span><strong>{orders.length}</strong><small>내 캠페인 전체 참여 기록</small></article><article><span>받은 요청</span><strong>{requests.length}</strong><small>샘플·협업 요청 전체</small></article><article><span>새 요청</span><strong>{requests.filter((request) => request.status === "new").length}</strong><small>아직 확인하지 않은 요청</small></article></section>
    {orders.length ? <section className="beauty-order-list" aria-label="참여 이행과 성과">{orders.map((row) => <article key={row.id}><header><div><span>{row.product_name || "연결 상품 확인 필요"}</span><h2>{row.campaign_title}</h2><p>{row.creator_display_name} · {row.creator_platform || "플랫폼 미등록"} · {row.creator_market || "시장 미등록"}</p></div><b className={`beauty-status is-${row.status}`}>{participationStatusLabel(row.status)}</b></header><dl><div><dt>배송 메모</dt><dd>{row.shipping_note || "등록된 배송 메모 없음"}</dd></div><div><dt>다음 작업</dt><dd>{row.next_action || "현재 지정된 작업 없음"}</dd></div></dl>{row.views === null ? <div className="beauty-empty-inline"><p>아직 입력된 성과가 없습니다.</p><span>크리에이터가 게시 후 성과를 입력하면 조회·반응·주문이 표시됩니다.</span></div> : <div className="beauty-performance-row"><span>조회 <b>{number(Number(row.views))}</b></span><span>좋아요 <b>{number(Number(row.likes || 0))}</b></span><span>댓글 <b>{number(Number(row.comments || 0))}</b></span><span>주문 <b>{number(Number(row.orders || 0))}</b></span><span>매출 <b>{row.currency} {number(Number(row.revenue || 0))}</b></span></div>}</article>)}</section> : <section className="beauty-empty-state"><h2>아직 캠페인 참여·성과가 없습니다.</h2><p>캠페인을 모집 상태로 전환하고 신청자를 매칭하면 이행 단계와 실제 성과가 표시됩니다.</p><Link className="beauty-action primary" href="/dashboard/beauty/campaigns">캠페인 운영 시작</Link></section>}
  </div>;
}
