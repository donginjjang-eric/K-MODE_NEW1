"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import NavIcon from "@/components/NavIcons";
import type { SessionUser } from "@/lib/auth";
import type { CreatorAccount } from "@/lib/types";

type NavItem = {
  href: string;
  icon: "home" | "sparkles" | "badge" | "file" | "check" | "user";
  label: string;
  short: string;
};

const CREATOR_NAV: NavItem[] = [
  { href: "/dashboard/creator", icon: "home", label: "홈", short: "홈" },
  { href: "/dashboard/creator/campaigns", icon: "sparkles", label: "추천 캠페인", short: "캠페인" },
  { href: "/dashboard/creator/my-campaigns", icon: "badge", label: "내 미션", short: "미션" },
  { href: "/dashboard/creator/submissions", icon: "file", label: "콘텐츠 제작", short: "제작" },
  { href: "/dashboard/creator/performance", icon: "sparkles", label: "성과", short: "성과" },
  { href: "/dashboard/creator/settlement", icon: "check", label: "수익·정산", short: "정산" },
  { href: "/dashboard/creator/grade", icon: "badge", label: "등급", short: "등급" },
];

type CreatorNavigationProps = {
  creator: Pick<CreatorAccount, "display_name" | "platform">;
  user: Pick<SessionUser, "email" | "role">;
};

function useCreatorHref() {
  const persona = useSearchParams().get("persona");
  return (href: string) => persona ? `${href}?persona=${persona}` : href;
}

function isActive(pathname: string, href: string) {
  return href === "/dashboard/creator" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function CreatorIdentity({ creator, user }: CreatorNavigationProps) {
  const initial = (creator.display_name || user.email || "C").trim().charAt(0).toUpperCase();

  return (
    <Link href="/dashboard/creator/profile" className="creator-identity" aria-label="내 정보">
      <span className="creator-avatar" aria-hidden="true">{initial}</span>
      <span className="creator-identity-copy">
        <strong>{creator.display_name}</strong>
        <small>{creator.platform || user.email}</small>
      </span>
    </Link>
  );
}

export function CreatorSideNav({ creator, user }: CreatorNavigationProps) {
  const pathname = usePathname();
  const withPersona = useCreatorHref();

  return (
    <aside className="creator-rail">
      <Link className="creator-brand" href="/dashboard/creator" aria-label="K-MODU Creator Center 홈">
        <b>K-MODU</b><span>CREATOR</span>
      </Link>
      <CreatorIdentity creator={creator} user={user} />
      <nav className="creator-menu" aria-label="Creator Center 메뉴">
        {CREATOR_NAV.map((item) => (
          <Link key={item.href} href={withPersona(item.href)} className={isActive(pathname, item.href) ? "is-active" : ""}>
            <NavIcon name={item.icon} />
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

export function CreatorTabBar({ creator, user }: CreatorNavigationProps) {
  const pathname = usePathname();
  const withPersona = useCreatorHref();

  return (
    <>
      <header className="creator-mobile-top">
        <Link className="creator-brand" href="/dashboard/creator"><b>K-MODU</b><span>CREATOR</span></Link>
        <Link className="creator-mobile-menu" href="/dashboard/creator/profile" aria-label={`${creator.display_name} 내 정보`}>메뉴</Link>
      </header>
      <nav className="creator-mobile-nav" aria-label="Creator Center 빠른 메뉴">
        {CREATOR_NAV.map((item) => (
          <Link key={item.href} href={withPersona(item.href)} className={isActive(pathname, item.href) ? "is-active" : ""}>
            <NavIcon name={item.icon} />
            <span>{item.short}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
