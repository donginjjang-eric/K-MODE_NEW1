export type NormalizedBrandCategory = "beauty" | "fashion" | "hybrid";

export type BeautyPartnerNavItem = {
  href: string;
  icon: "home" | "badge" | "package" | "file" | "users" | "inbox" | "image" | "book";
  label: string;
  short: string;
  availability: "active" | "upcoming";
};

export const BEAUTY_PARTNER_NAV_ITEMS: readonly BeautyPartnerNavItem[];
export function normalizeBrandCategory(value: unknown): NormalizedBrandCategory;
export function brandPartnerCenterPath(category: unknown): "/dashboard/beauty" | "/dashboard/designer/brand";
export function isBeautyPartnerPathActive(pathname: string, href: string): boolean;
