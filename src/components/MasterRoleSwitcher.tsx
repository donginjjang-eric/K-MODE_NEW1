import Link from "next/link";
import { getMasterRoleDestinations, isMasterAdminEmail } from "@/lib/master-admin";

export default function MasterRoleSwitcher({
  email,
  active,
  brandCategory,
}: {
  email: string;
  active: "admin" | "creator" | "designer";
  brandCategory?: unknown;
}) {
  if (!isMasterAdminEmail(email)) return null;
  const destinations = getMasterRoleDestinations(brandCategory);

  return (
    <div className="master-access-control">
      <span className="master-access-badge">마스터 권한</span>
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
  );
}
