import Link from "next/link";
import CollabRequestActions from "@/components/CollabRequestActions";
import { requireBeautyPartner } from "@/lib/auth";
import { getCollabRequestsForDesigner } from "@/lib/db";

const TYPE_LABELS = { sample: "샘플 요청", collab: "협업 제안" } as const;
const STATUS_LABELS = { new: "새 요청", read: "확인함", done: "처리 완료" } as const;

export default async function BeautyProposalsPage() {
  const { designer } = await requireBeautyPartner();
  const requests = await getCollabRequestsForDesigner(designer.id);
  return <div className="beauty-operations-page">
    <header className="beauty-page-heading"><p>INBOUND COLLABORATION</p><h1>제안·거래</h1><span>공개 브랜드 페이지에서 들어온 실제 샘플 요청과 협업 제안을 확인하고 처리 상태를 관리하세요.</span></header>
    {requests.length ? <section className="beauty-request-list" aria-label="받은 제안과 거래 요청">{requests.map((request) => <article key={request.id}><header><div><span>{TYPE_LABELS[request.request_type]}</span><h2>{request.creator_name}</h2><p>{request.creator_contact}</p></div><b className={`beauty-status is-${request.status}`}>{STATUS_LABELS[request.status]}</b></header><p>{request.message || "별도 메시지가 없습니다."}</p><footer><time dateTime={request.created_at}>{new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(new Date(request.created_at))}</time><CollabRequestActions requestId={request.id} status={request.status} /></footer></article>)}</section> : <section className="beauty-empty-state"><h2>아직 받은 제안이 없습니다.</h2><p>브랜드 소개와 협업 상품을 공개하면 크리에이터가 샘플 또는 협업 요청을 보낼 수 있습니다.</p><Link className="beauty-action primary" href="/dashboard/beauty/brand">공개 프로필 점검</Link></section>}
  </div>;
}
