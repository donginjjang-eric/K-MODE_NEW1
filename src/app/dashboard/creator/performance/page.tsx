import { requireApprovedCreator } from "@/lib/auth";
import { getCreatorPerformanceRows } from "@/lib/creator-center";
import { creatorPersona, currencyMatchesPersona } from "@/lib/creator-persona";

function number(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function money(value: number, currency: string) {
  if (currency === "MYR") return `RM ${number(value)}`;
  return `${currency} ${number(value)}`;
}

export default async function CreatorPerformancePage({ searchParams }: { searchParams: Promise<{ persona?: string }> }) {
  const { user, creator } = await requireApprovedCreator();
  const persona = creatorPersona((await searchParams).persona);
  const allRows = await getCreatorPerformanceRows(creator.id);
  const rows = user.role === "admin" ? allRows.filter((row) => currencyMatchesPersona(row.currency, persona)) : allRows;
  const totals = rows.reduce((sum, row) => ({
    views: sum.views + Number(row.views),
    likes: sum.likes + Number(row.likes),
    comments: sum.comments + Number(row.comments),
    orders: sum.orders + Number(row.orders),
  }), { views: 0, likes: 0, comments: 0, orders: 0 });

  return (
    <div className="creator-campaigns-page">
      <header className="creator-page-heading creator-page-heading-wide">
        <p>PERFORMANCE</p><h1>성과</h1>
        <span>해외 크리에이터가 한국 공급자 제품으로 만든 콘텐츠의 조회, 반응, 주문과 매출을 확인합니다.</span>
      </header>
      <section className="creator-kpi-grid creator-kpi-grid-compact" aria-label="전체 성과">
        <article><span>조회</span><strong>{number(totals.views)}</strong></article>
        <article><span>좋아요</span><strong>{number(totals.likes)}</strong></article>
        <article><span>댓글</span><strong>{number(totals.comments)}</strong></article>
        <article><span>주문</span><strong>{number(totals.orders)}</strong></article>
      </section>
      {rows.length ? (
        <div className="creator-performance-table" role="region" aria-label="캠페인별 성과" tabIndex={0}>
          <table><thead><tr><th>캠페인</th><th>조회</th><th>좋아요</th><th>댓글</th><th>주문</th><th>매출</th></tr></thead>
            <tbody>{rows.map((row) => <tr key={row.participation_id}><td>{row.campaign_title}</td><td>{number(row.views)}</td><td>{number(row.likes)}</td><td>{number(row.comments)}</td><td>{number(row.orders)}</td><td>{money(row.revenue, row.currency)}</td></tr>)}</tbody>
          </table>
        </div>
      ) : <div className="creator-empty-state"><h2>아직 집계된 성과가 없습니다.</h2><p>콘텐츠 게시 후 조회·주문 데이터가 이곳에 표시됩니다.</p></div>}
    </div>
  );
}
