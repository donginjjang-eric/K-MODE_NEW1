import Link from "next/link";
import { isMasterAdminEmail, masterRoleDestinations } from "@/lib/master-admin";

export default function MasterRoleSwitcher({ email, active }: { email: string; active: "admin" | "creator" | "designer" }) {
  if (!isMasterAdminEmail(email)) return null;

  return (
    <div className="master-access-control">
      <span className="master-access-badge">마스터 권한</span>
      <nav className="master-workspace-switcher" aria-label="마스터 관리자 화면 전환">
        <span className="master-workspace-label">화면 전환</span>
        {masterRoleDestinations.map((item) => (
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
  );
}
