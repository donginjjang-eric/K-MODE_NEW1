import Image from "next/image";

export default function LoginEditorialPanel() {
  return (
    <section className="login-editorial" aria-label="K-MODU 브랜드 소개">
      <Image
        className="login-editorial-image"
        src="/assets/login-kbeauty-global-v1.webp"
        alt="K-뷰티 제품과 함께한 글로벌 크리에이터 캠페인 이미지"
        width={1132}
        height={1390}
        priority
        sizes="(max-width: 820px) 100vw, 52vw"
      />
      <div className="login-editorial-overlay" aria-hidden="true" />
      <div className="login-editorial-copy">
        <p className="login-editorial-kicker">K-MODU / GLOBAL CREATOR NETWORK</p>
        <h2>
          <span className="login-editorial-line">K-beauty, K-fashion</span>
          <br />
          세계를 향합니다
        </h2>
        <p>K-뷰티와 K-패션을 글로벌 크리에이터의 콘텐츠와 영향력으로 연결합니다.</p>
        <div className="login-editorial-tags">
          <span>K-BEAUTY</span>
          <span>K-FASHION</span>
          <span>GLOBAL CREATORS</span>
        </div>
      </div>
    </section>
  );
}
