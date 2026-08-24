import Link from "next/link";
import { isMasterAdminEmail, masterRoleDestinations } from "@/lib/master-admin";

export default function MasterRoleSwitcher({ email, active }: { email: string; active: "admin" | "creator" | "designer" }) {
  if (!isMasterAdminEmail(email)) return null;

  return (
    <nav className="master-role-switcher" aria-label="마스터 관리자 화면 전환">
      <span>MASTER</span>
      {masterRoleDestinations.map((item) => (
        <Link className={item.key === active ? "is-active" : ""} href={item.href} key={item.key}>{item.label}</Link>
      ))}
    </nav>
  );
}
