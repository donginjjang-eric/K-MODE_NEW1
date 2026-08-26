import LoginEditorialPanel from "@/components/LoginEditorialPanel";
import LoginForm from "@/components/LoginForm";
import { isGoogleLoginConfigured } from "@/lib/google-oauth";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const previewRoleSelection = process.env.NODE_ENV !== "production" && params.preview === "roles";
  return (
    <main className="page login-page">
      <section className="login-hero">
        <LoginEditorialPanel />
        <div className="login-auth-column">
          <div className="login-auth-intro">
            <p className="login-auth-brand">K-MODU</p>
            <h1>K-MODU 글로벌 파트너 시작</h1>
            <p>K-뷰티·K-패션과 글로벌 크리에이터를 연결합니다.</p>
            <span>브랜드와 크리에이터가 캠페인·콘텐츠·거래를 함께 시작하는 파트너 플랫폼입니다.</span>
          </div>
          <LoginForm googleEnabled={isGoogleLoginConfigured()} previewRoleSelection={previewRoleSelection} />
          <p className="login-legal">
            계속 진행하면 <a href="/terms">이용약관</a> 및 <a href="/privacy-policy">개인정보처리방침</a>에 동의하는 것으로 간주됩니다.
          </p>
        </div>
      </section>
    </main>
  );
}
