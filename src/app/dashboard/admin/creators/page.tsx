import AdminCreatorAccountManager from "@/components/AdminCreatorAccountManager";
import { getCreatorAccountsForAdmin } from "@/lib/db";

export default async function AdminCreatorAccountsPage() {
  const creators = await getCreatorAccountsForAdmin();

  return (
    <>
      <h1 className="st-title">크리에이터 계정 연결</h1>
      <p className="st-sub">공개 크리에이터 카탈로그의 프로필에만 Google 로그인 이메일을 연결하고 접근 상태를 관리합니다.</p>
      <AdminCreatorAccountManager creators={creators} />
    </>
  );
}
