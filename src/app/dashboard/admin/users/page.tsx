// 관리자: 회원 관리 — 필터·검색·정렬은 AdminUsersManager가 담당
import AdminUsersManager from "@/components/AdminUsersManager";
import { getAllUsersWithDesigner } from "@/lib/db";

export default async function AdminUsersPage() {
  const users = await getAllUsersWithDesigner();

  return (
    <>
      <h1 className="st-title">회원 관리</h1>
      <p className="st-sub">가입한 모든 계정을 크리에이터·디자이너 역할과 승인 상태별로 찾고 전용 관리 화면으로 이동합니다.</p>

      {users.length ? (
        <AdminUsersManager users={users} />
      ) : (
        <div className="st-empty">
          <div className="ic">M</div>
          <p>가입한 회원이 없습니다.</p>
        </div>
      )}
    </>
  );
}
