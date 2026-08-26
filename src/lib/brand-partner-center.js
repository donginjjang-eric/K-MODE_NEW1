export const BEAUTY_PARTNER_NAV_ITEMS = [
  { href: "/dashboard/beauty", icon: "home", label: "홈", short: "홈", availability: "active" },
  { href: "/dashboard/beauty/brand", icon: "badge", label: "브랜드", short: "브랜드", availability: "active" },
  { href: "/dashboard/beauty/products", icon: "package", label: "상품", short: "상품", availability: "active" },
  { href: "/dashboard/beauty/campaigns", icon: "users", label: "캠페인·매칭", short: "캠페인", availability: "active" },
  { href: "/dashboard/beauty/proposals", icon: "inbox", label: "제안·거래", short: "제안", availability: "active" },
  { href: "/dashboard/beauty/content", icon: "image", label: "콘텐츠 검수", short: "검수", availability: "active" },
  { href: "/dashboard/beauty/orders", icon: "file", label: "성과·주문", short: "성과", availability: "active" },
  { href: "/dashboard/beauty/settlements", icon: "book", label: "정산", short: "정산", availability: "active" },
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
