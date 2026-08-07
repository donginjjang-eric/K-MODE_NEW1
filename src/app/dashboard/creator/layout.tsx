import "./creator.css";
import { requireApprovedCreator } from "@/lib/auth";
import { CreatorSideNav, CreatorTabBar } from "@/components/CreatorNav";

export default async function CreatorCenterLayout({ children }: { children: React.ReactNode }) {
  const { user, creator } = await requireApprovedCreator();

  return (
    <div className="creator-center">
      <CreatorTabBar creator={creator} user={user} />
      <div className="creator-shell">
        <CreatorSideNav creator={creator} user={user} />
        <main className="creator-content">{children}</main>
      </div>
    </div>
  );
}
