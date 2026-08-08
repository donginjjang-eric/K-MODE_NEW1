import "./creator.css";
import Link from "next/link";
import { requireApprovedCreator } from "@/lib/auth";
import { CreatorSideNav, CreatorTabBar } from "@/components/CreatorNav";
import { CreatorDemoControls } from "@/components/CreatorDemoControls";

export default async function CreatorCenterLayout({ children }: { children: React.ReactNode }) {
  const { user, creator } = await requireApprovedCreator();

  return (
    <div className="creator-center">
      {user.role === "admin" ? (
        <div className="creator-admin-preview">
          <div className="creator-admin-preview-copy" role="status">
            <strong>관리자 운영 모드</strong>
            <span>{creator.display_name} 프로필로 크리에이터 센터 전체 기능을 사용하고 있습니다.</span>
            <Link href="/dashboard/admin/campaigns">캠페인 관리로 돌아가기</Link>
          </div>
          <CreatorDemoControls />
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
