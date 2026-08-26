import Link from "next/link";
import NavIcon from "@/components/NavIcons";

type NextStep = {
  done: boolean;
  title: string;
  description: string;
  href: string;
};

export default function BeautyPartnerHome({
  brandName,
  profileCompleted,
  profileTotal,
  productCount,
  publishedProductCount,
  nextSteps,
}: {
  brandName: string;
  profileCompleted: number;
  profileTotal: number;
  productCount: number;
  publishedProductCount: number;
  nextSteps: NextStep[];
}) {
  const completion = Math.round((profileCompleted / profileTotal) * 100);
  const outstanding = nextSteps.filter((step) => !step.done);

  return (
    <div className="beauty-home">
      <section className="beauty-hero">
        <div>
          <p className="beauty-eyebrow">K-MODU BEAUTY PARTNER</p>
          <h1>{brandName}의 글로벌 협업 준비를 시작하세요.</h1>
          <p>브랜드 정보와 협업 상품을 정리하면 다음 캠페인과 크리에이터 매칭 단계로 이어집니다.</p>
        </div>
        <Link className="beauty-primary-action" href="/dashboard/beauty/products">
          상품 관리 <span aria-hidden="true">→</span>
        </Link>
      </section>

      <section className="beauty-status-grid" aria-label="현재 준비 상태">
        <article className="beauty-status-card is-profile">
          <div className="beauty-status-icon"><NavIcon name="badge" /></div>
          <div>
            <p>브랜드 프로필</p>
            <strong>{profileCompleted}/{profileTotal} 항목 완료</strong>
            <div className="beauty-progress" aria-label={`프로필 완성도 ${completion}%`}>
              <i style={{ width: `${completion}%` }} />
            </div>
          </div>
          <Link href="/dashboard/beauty/brand">프로필 관리</Link>
        </article>
        <article className="beauty-status-card">
          <div className="beauty-status-icon"><NavIcon name="package" /></div>
          <div>
            <p>등록 상품</p>
            <strong>{productCount}개</strong>
            <span>공개 중 {publishedProductCount}개</span>
          </div>
          <Link href="/dashboard/beauty/products">상품 관리</Link>
        </article>
      </section>

      <section className="beauty-next-section">
        <div className="beauty-section-heading">
          <div>
            <p className="beauty-eyebrow">NEXT ACTIONS</p>
            <h2>{outstanding.length ? "지금 이어서 할 일" : "기본 준비가 완료됐어요"}</h2>
          </div>
          <span>{nextSteps.filter((step) => step.done).length}/{nextSteps.length} 완료</span>
        </div>
        <ol className="beauty-next-list">
          {nextSteps.map((step, index) => (
            <li className={step.done ? "is-done" : ""} key={step.title}>
              <span className="beauty-step-number">{step.done ? "✓" : index + 1}</span>
              <div>
                <strong>{step.title}</strong>
                <p>{step.description}</p>
              </div>
              {step.done ? <span className="beauty-done-label">완료</span> : <Link href={step.href}>진행하기</Link>}
            </li>
          ))}
        </ol>
      </section>

      <section className="beauty-coming-section">
        <p className="beauty-eyebrow">COMING NEXT</p>
        <h2>파트너 운영 기능</h2>
        <div className="beauty-coming-grid">
          <article><NavIcon name="file" /><strong>캠페인</strong><span>Task 4에서 제공 예정</span></article>
          <article><NavIcon name="users" /><strong>크리에이터 매칭</strong><span>Task 4에서 제공 예정</span></article>
          <article><NavIcon name="inbox" /><strong>거래 관리</strong><span>Task 4에서 제공 예정</span></article>
        </div>
      </section>
    </div>
  );
}
