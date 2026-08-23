"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import NavIcon from "@/components/NavIcons";
import LogoutButton from "@/components/LogoutButton";

const NAV = [
  { href: "/dashboard/agency", icon: "home" as const, label: "관리 그룹", short: "그룹" },
];

function active(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AgencySideNav({ email }: { email: string }) {
  const pathname = usePathname();
  const initial = (email || "A").trim().charAt(0).toUpperCase();
  return (
    <aside className="st-side">
      <nav aria-label="대행사 메뉴">
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} className={active(pathname, item.href) ? "is-active" : ""}>
            <span className="ic"><NavIcon name={item.icon} /></span>{item.label}
          </Link>
        ))}
      </nav>
      <div className="st-account-card agency">
        <div className="st-account-avatar">{initial}</div>
        <div className="st-account-copy"><span>Agency partner</span><strong>{email}</strong></div>
        <div className="st-account-actions"><LogoutButton /></div>
      </div>
    </aside>
  );
}

export function AgencyTabBar() {
  const pathname = usePathname();
  return (
    <nav className="st-tabbar" aria-label="대행사 빠른 메뉴">
      {NAV.map((item) => (
        <Link key={item.href} href={item.href} className={active(pathname, item.href) ? "is-active" : ""}>
          <span className="ic"><NavIcon name={item.icon} /></span>{item.short}
        </Link>
      ))}
    </nav>
  );
}
