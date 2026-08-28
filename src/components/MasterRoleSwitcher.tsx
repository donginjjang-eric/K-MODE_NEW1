import Link from "next/link";
import { getActiveWorkspaceDestinations, getMasterRoleDestinations, isMasterAdminEmail } from "@/lib/master-admin";
import { listUserWorkspaces } from "@/lib/workspace-access";

export default async function MasterRoleSwitcher({
  userId,
  email,
  active,
}: {
  userId: string;
  email: string;
  active: "admin" | "creator" | "fashion_partner" | "beauty_partner";
}) {
  const isMaster = isMasterAdminEmail(email);
  const memberships = isMaster ? [] : await listUserWorkspaces(userId);
  const destinations = isMaster ? getMasterRoleDestinations() : getActiveWorkspaceDestinations(memberships);
  if (destinations.length < 2) return null;

  return (
    <div className="master-workspace-bar">
      <div className="master-access-control">
        {isMaster ? <span className="master-access-badge">마스터 권한</span> : null}
        <nav className="master-workspace-switcher" aria-label="마스터 관리자 화면 전환">
          <span className="master-workspace-label">화면 전환</span>
          {destinations.map((item) => (
            <Link
              aria-current={item.key === active ? "page" : undefined}
              className={item.key === active ? "is-active" : ""}
              href={item.href}
              key={item.key}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
