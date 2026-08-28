"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import NavIcon from "@/components/NavIcons";
import type { SessionUser } from "@/lib/auth";
import type { CreatorAccount } from "@/lib/types";
import WorkspaceAccountCard from "@/components/WorkspaceAccountCard";

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

const CREATOR_MOBILE_NAV: NavItem[] = [
  { href: "/dashboard/creator", icon: "home", label: "홈", short: "홈" },
  { href: "/dashboard/creator/my-campaigns", icon: "badge", label: "내 미션", short: "미션" },
  { href: "/dashboard/creator/submissions", icon: "file", label: "콘텐츠 제작", short: "제작" },
  { href: "/dashboard/creator/settlement", icon: "check", label: "수익·정산", short: "정산" },
  { href: "/dashboard/creator/profile", icon: "user", label: "더보기", short: "더보기" },
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

export function CreatorSideNav({ creator, user }: CreatorNavigationProps) {
  const pathname = usePathname();
  const withPersona = useCreatorHref();

  return (
    <aside className="creator-rail">
      <Link className="creator-brand" href="/dashboard/creator" aria-label="K-MODU 크리에이터 홈">
        <b>K-MODU</b><span>크리에이터</span>
      </Link>
      <nav className="creator-menu" aria-label="크리에이터 메뉴">
        {CREATOR_NAV.map((item) => (
          <Link key={item.href} href={withPersona(item.href)} className={isActive(pathname, item.href) ? "is-active" : ""}>
            <NavIcon name={item.icon} />
            {item.label}
          </Link>
        ))}
      </nav>
      <WorkspaceAccountCard
        centerLabel="크리에이터 센터"
        title={creator.display_name}
        detail={user.email}
        initial={(creator.display_name || user.email || "C").charAt(0).toUpperCase()}
        tone="creator"
      />
    </aside>
  );
}

export function CreatorTabBar({ creator, user }: CreatorNavigationProps) {
  const pathname = usePathname();
  const withPersona = useCreatorHref();

  return (
    <>
      <header className="creator-mobile-top">
        <Link className="creator-brand" href="/dashboard/creator"><b>K-MODU</b><span>크리에이터</span></Link>
        <Link className="creator-mobile-menu" href="/dashboard/creator/profile" aria-label={`${creator.display_name} 내 정보`}>메뉴</Link>
      </header>
      <nav className="creator-mobile-nav" aria-label="크리에이터 빠른 메뉴">
        {CREATOR_MOBILE_NAV.map((item) => (
          <Link key={item.href} href={withPersona(item.href)} className={isActive(pathname, item.href) ? "is-active" : ""}>
            <NavIcon name={item.icon} />
            <span>{item.short}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
