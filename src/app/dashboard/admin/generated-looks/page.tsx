import { getGeneratedLooksForAdmin } from "@/lib/db";
import AdminGeneratedLooksManager from "@/components/AdminGeneratedLooksManager";

export default async function AdminGeneratedLooksPage() {
  const looks = await getGeneratedLooksForAdmin();

  return (
    <>
      <h1 className="st-title">AI 결과 검수</h1>
      <p className="st-sub">생성된 AI 룩을 확인하고 공개 승인, 반려, 숨김 상태를 관리합니다.</p>

      {looks.length ? (
        <AdminGeneratedLooksManager looks={looks} />
      ) : (
        <div className="st-empty">
          <div className="ic">AI</div>
          <p>아직 생성된 AI 이미지가 없습니다.</p>
        </div>
      )}
    </>
  );
}
