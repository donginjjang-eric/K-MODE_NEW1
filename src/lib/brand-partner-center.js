export const BEAUTY_PARTNER_NAV_ITEMS = [
  { href: "/dashboard/beauty", icon: "home", label: "홈", short: "홈", availability: "active" },
  { href: "/dashboard/beauty/brand", icon: "badge", label: "브랜드 프로필", short: "프로필", availability: "active" },
  { href: "/dashboard/beauty/products", icon: "package", label: "상품 관리", short: "상품", availability: "active" },
  { href: "/dashboard/beauty/campaigns", icon: "file", label: "캠페인", short: "캠페인", availability: "upcoming" },
  { href: "/dashboard/beauty/matching", icon: "users", label: "크리에이터 매칭", short: "매칭", availability: "upcoming" },
  { href: "/dashboard/beauty/transactions", icon: "inbox", label: "거래 관리", short: "거래", availability: "upcoming" },
];

export function normalizeBrandCategory(value) {
  const normalized = String(value ?? "").normalize("NFKC").trim().toLowerCase();
  const hasBeauty = normalized.includes("beauty") || normalized.includes("뷰티");
  const hasFashion = normalized.includes("fashion") || normalized.includes("패션");

  if (normalized.includes("hybrid") || normalized.includes("복합") || (hasBeauty && hasFashion)) return "hybrid";
  if (hasBeauty) return "beauty";
  if (hasFashion) return "fashion";
  return "fashion";
}

export function brandPartnerCenterPath(category) {
  return normalizeBrandCategory(category) === "fashion"
    ? "/dashboard/designer/brand"
    : "/dashboard/beauty";
}

export function isBeautyPartnerPathActive(pathname, href) {
  if (href === "/dashboard/beauty") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
