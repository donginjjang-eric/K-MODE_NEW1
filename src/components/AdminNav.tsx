"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import NavIcon from "@/components/NavIcons";
import WorkspaceAccountCard from "@/components/WorkspaceAccountCard";
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
      <figure className="admin-console-identity" aria-label="관리자 콘솔 전용 표지">
        <svg
          className="admin-console-identity-mark"
          viewBox="0 0 320 220"
          role="img"
          aria-labelledby="admin-console-title admin-console-description"
          preserveAspectRatio="xMidYMid meet"
        >
          <title id="admin-console-title">ADMIN CONSOLE 관리자 운영</title>
          <desc id="admin-console-description">네이비와 골드 색상의 모니터, 운영 차트, 설정 아이콘으로 구성된 관리자 콘솔 표지</desc>
          <defs>
            <linearGradient id="admin-console-bg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#101f35" />
              <stop offset="1" stopColor="#07111f" />
            </linearGradient>
            <linearGradient id="admin-console-gold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f2d58d" />
              <stop offset="1" stopColor="#b99145" />
            </linearGradient>
          </defs>
          <rect width="320" height="220" rx="22" fill="url(#admin-console-bg)" />
          <path d="M0 166C65 140 111 182 173 157c55-22 87-10 147-40v103H0Z" fill="#142b45" opacity=".72" />
          <circle cx="270" cy="42" r="58" fill="#c9a45c" opacity=".08" />
          <g className="admin-console-identity-emblem">
            <rect x="32" y="30" width="58" height="58" rx="16" fill="url(#admin-console-gold)" />
            <path d="M51 46v27M70 46v27M51 59h17M73 47 62 59l12 14" fill="none" stroke="#0b1728" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          <g className="admin-console-identity-dashboard" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <rect x="130" y="29" width="153" height="104" rx="13" fill="#0d1c30" stroke="#d2ae62" strokeWidth="3" />
            <path d="M151 106V83m26 23V68m26 38V76m26 30V54m25 52V88" stroke="#d2ae62" strokeWidth="8" />
            <path d="m151 66 26-17 26 9 26-20 25 7" stroke="#f1d68e" strokeWidth="3" />
            <circle cx="151" cy="66" r="4" fill="#f1d68e" stroke="none" />
            <circle cx="177" cy="49" r="4" fill="#f1d68e" stroke="none" />
            <circle cx="203" cy="58" r="4" fill="#f1d68e" stroke="none" />
            <circle cx="229" cy="38" r="4" fill="#f1d68e" stroke="none" />
            <circle cx="254" cy="45" r="4" fill="#f1d68e" stroke="none" />
            <path d="M184 134v12m-22 0h87" stroke="#d2ae62" strokeWidth="4" />
          </g>
          <g className="admin-console-identity-gear" transform="translate(250 134)">
            <path d="m22 0 4 8 9 1 2 9 8 5-3 9 3 9-8 5-2 9-9 1-4 8-9-4-9 4-4-8-9-1-2-9-8-5 3-9-3-9 8-5 2-9 9-1 4-8 9 4Z" fill="#d2ae62" />
            <circle cx="13" cy="32" r="11" fill="#0b1728" />
            <circle cx="13" cy="32" r="5" fill="#f1d68e" />
          </g>
          <text x="32" y="172" fill="#f5e5bd" fontSize="22" fontWeight="900" letterSpacing="2.3">ADMIN CONSOLE</text>
          <text x="32" y="198" fill="#fff" fontSize="16" fontWeight="800">관리자 운영</text>
          <path d="M142 192h141" stroke="#d2ae62" strokeWidth="2" opacity=".55" />
        </svg>
      </figure>
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
      <WorkspaceAccountCard centerLabel="관리자 콘솔" title={email} detail="운영자 계정" initial={initial} tone="admin" />
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
