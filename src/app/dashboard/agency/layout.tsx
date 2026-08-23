import "../designer/studio.css";
import "./agency.css";
import Link from "next/link";
import { requireAgencyUser } from "@/lib/auth";
import { AgencySideNav, AgencyTabBar } from "@/components/AgencyNav";
import LogoutButton from "@/components/LogoutButton";
import ScrollResetOnLoad from "@/components/ScrollResetOnLoad";

export default async function AgencyLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAgencyUser();
  return (
    <div className="studio agency-studio">
      <ScrollResetOnLoad />
      <header className="st-top">
        <Link className="brand" href="/dashboard/agency"><b>K-MODU</b><span className="role-chip agency">대행사 포털</span></Link>
        <div className="top-context"><div className="me compact"><span className="role-label">조회 전용</span><span>{user.email}</span></div></div>
      </header>
      <div className="st-shell">
        <AgencySideNav email={user.email} />
        <main className="st-main">{children}</main>
      </div>
      <div className="st-mobile-account"><span>{user.email}</span><LogoutButton /></div>
      <AgencyTabBar />
    </div>
  );
}
