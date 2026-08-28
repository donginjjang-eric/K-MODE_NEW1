export type AdminNavItem = {
  href: string;
  icon: "home" | "inbox" | "users" | "package" | "image";
  label: string;
  short: string;
};

export const ADMIN_NAV_GROUPS: Array<{ label: string; items: AdminNavItem[] }> = [
  {
    label: "운영 현황",
    items: [{ href: "/dashboard/admin", icon: "home", label: "운영 홈", short: "홈" }],
  },
  {
    label: "회원·파트너",
    items: [
      { href: "/dashboard/admin/users", icon: "users", label: "회원·등급 관리", short: "회원" },
      { href: "/dashboard/admin/creators", icon: "users", label: "크리에이터 관리", short: "크리에이터" },
      { href: "/dashboard/admin/designers", icon: "users", label: "브랜드 파트너 관리", short: "파트너" },
      { href: "/dashboard/admin/creator-groups", icon: "package", label: "관리 그룹·대행사", short: "그룹" },
    ],
  },
  {
    label: "캠페인·거래",
    items: [
      { href: "/dashboard/admin/campaigns", icon: "package", label: "캠페인 관리", short: "캠페인" },
      { href: "/dashboard/admin/creator-proposals", icon: "inbox", label: "협업 제안", short: "제안" },
    ],
  },
  {
    label: "콘텐츠 검수",
    items: [
      { href: "/dashboard/admin/products", icon: "package", label: "상품 검수", short: "상품" },
      { href: "/dashboard/admin/generated-looks", icon: "image", label: "AI 콘텐츠 검수", short: "AI" },
    ],
  },
];

const mobileHrefs = new Set([
  "/dashboard/admin",
  "/dashboard/admin/users",
  "/dashboard/admin/creators",
  "/dashboard/admin/campaigns",
  "/dashboard/admin/products",
]);

export const ADMIN_MOBILE_NAV = ADMIN_NAV_GROUPS.flatMap((group) => group.items).filter((item) => mobileHrefs.has(item.href));
