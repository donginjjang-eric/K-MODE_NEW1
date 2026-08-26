"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import NavIcon from "@/components/NavIcons";
import LogoutButton from "@/components/LogoutButton";
import { ADMIN_MOBILE_NAV, ADMIN_NAV_GROUPS } from "@/lib/admin-navigation";

// href별 처리 대기 건수 — 있으면 메뉴 옆에 뱃지로 표시
export type AdminNavBadges = Record<string, number | undefined>;

function isActive(pathname: string, href: string) {
  if (href === "/dashboard/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSideNav({ email, badges = {} }: { email: string; badges?: AdminNavBadges }) {
  const pathname = usePathname();
  const initial = (email || "A").trim().charAt(0).toUpperCase();

  return (
    <aside className="st-side">
      <nav>
        {ADMIN_NAV_GROUPS.map((group) => (
          <section className="admin-nav-group" key={group.label}>
            <span className="admin-nav-group-label">{group.label}</span>
            {group.items.map((item) => {
              const badge = badges[item.href];
              return (
                <Link key={item.href} href={item.href} className={isActive(pathname, item.href) ? "is-active" : ""}>
                  <span className="ic"><NavIcon name={item.icon} /></span> {item.label}
                  {badge ? <span className="nav-badge">{badge > 99 ? "99+" : badge}</span> : null}
                </Link>
              );
            })}
          </section>
        ))}
      </nav>
      <div className="st-account-card admin">
        <div className="st-account-avatar">{initial}</div>
        <div className="st-account-copy">
          <span>관리자 콘솔</span>
          <strong>{email}</strong>
        </div>
        <div className="st-account-actions">
          <Link href="/dashboard/designer">브랜드 파트너 화면</Link>
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}

export function AdminTabBar({ badges = {} }: { badges?: AdminNavBadges }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <>
      {menuOpen ? <div className="admin-mobile-menu" role="dialog" aria-modal="true" aria-label="전체 관리자 메뉴">
        <button className="admin-mobile-menu-close" type="button" onClick={() => setMenuOpen(false)}>닫기</button>
        {ADMIN_NAV_GROUPS.map((group) => <section key={group.label}><b>{group.label}</b>{group.items.map((item) => <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>{item.label}</Link>)}</section>)}
      </div> : null}
      <nav className="st-tabbar">
      {ADMIN_MOBILE_NAV.slice(0, 4).map((item) => {
        const badge = badges[item.href];
        return (
          <Link key={item.href} href={item.href} className={isActive(pathname, item.href) ? "is-active" : ""}>
            <span className="ic">
              <NavIcon name={item.icon} />
              {badge ? <i className="tab-badge">{badge > 99 ? "99+" : badge}</i> : null}
            </span>
            {item.short}
          </Link>
        );
      })}
      <button className={menuOpen ? "is-active" : ""} type="button" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}><span className="ic"><NavIcon name="package" /></span>전체</button>
      </nav>
    </>
  );
}
