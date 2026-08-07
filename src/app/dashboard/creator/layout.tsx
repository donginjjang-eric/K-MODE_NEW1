import "./creator.css";
import Link from "next/link";
import { requireApprovedCreator } from "@/lib/auth";
import { CreatorSideNav, CreatorTabBar } from "@/components/CreatorNav";

export default async function CreatorCenterLayout({ children }: { children: React.ReactNode }) {
  const { user, creator } = await requireApprovedCreator();

  return (
    <div className="creator-center">
      {user.role === "admin" ? (
        <div className="creator-admin-preview" role="status">
          <strong>관리자 미리보기</strong>
          <span>{creator.display_name} 크리에이터 화면을 읽기 전용으로 보고 있습니다.</span>
          <Link href="/dashboard/admin/campaigns">캠페인 관리로 돌아가기</Link>
        </div>
      ) : null}
      <CreatorTabBar creator={creator} user={user} />
      <div className="creator-shell">
        <CreatorSideNav creator={creator} user={user} />
        <main className="creator-content">{children}</main>
      </div>
    </div>
  );
}
