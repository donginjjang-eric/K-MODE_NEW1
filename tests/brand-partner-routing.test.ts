import assert from "node:assert/strict";
import test from "node:test";

import {
  BEAUTY_PARTNER_NAV_ITEMS,
  brandPartnerCenterPath,
  normalizeBrandCategory,
} from "../src/lib/brand-partner-center";
import { loginEntryUrl, passwordLoginDestination } from "../src/lib/auth";
import { getActiveWorkspaceDestinations, getMasterRoleDestinations, resolveMasterPartnerDestination } from "../src/lib/master-admin";

test("normalizes Korean and English partner categories with a fashion-safe legacy fallback", () => {
  for (const value of ["K-뷰티", "k beauty", "K뷰티", "beauty", "뷰티 브랜드"]) {
    assert.equal(normalizeBrandCategory(value), "beauty", value);
  }
  for (const value of ["K-패션", "k fashion", "K패션", "fashion", "패션 브랜드"]) {
    assert.equal(normalizeBrandCategory(value), "fashion", value);
  }
  for (const value of ["복합", "hybrid", "K-뷰티 · K-패션", "beauty/fashion", "뷰티 패션"]) {
    assert.equal(normalizeBrandCategory(value), "hybrid", value);
  }
  for (const value of [undefined, null, "", "legacy-category"]) {
    assert.equal(normalizeBrandCategory(value), "fashion", String(value));
  }
});

test("routes beauty and hybrid partners to beauty while preserving fashion fallback", () => {
  assert.equal(brandPartnerCenterPath("K-뷰티"), "/dashboard/beauty");
  assert.equal(brandPartnerCenterPath("복합"), "/dashboard/beauty");
  assert.equal(brandPartnerCenterPath("K-패션"), "/dashboard/designer/brand");
  assert.equal(brandPartnerCenterPath(undefined), "/dashboard/designer/brand");

  assert.equal(loginEntryUrl({ role: "designer", brand_category: "beauty" }), "/dashboard/beauty");
  assert.equal(loginEntryUrl({ role: "designer" }), "/dashboard/designer/brand");
  assert.equal(passwordLoginDestination({ role: "designer", brand_category: "hybrid" }, ""), "/dashboard/beauty");
  assert.equal(passwordLoginDestination({ role: "designer", brand_category: "beauty" }, "//evil.example"), "/dashboard/beauty");
});

test("defines all eight active beauty partner destinations", () => {
  assert.deepEqual(
    BEAUTY_PARTNER_NAV_ITEMS.map(({ label, href, availability }) => ({ label, href, availability })),
    [
      { label: "홈", href: "/dashboard/beauty", availability: "active" },
      { label: "브랜드", href: "/dashboard/beauty/brand", availability: "active" },
      { label: "상품", href: "/dashboard/beauty/products", availability: "active" },
      { label: "캠페인·매칭", href: "/dashboard/beauty/campaigns", availability: "active" },
      { label: "제안·거래", href: "/dashboard/beauty/proposals", availability: "active" },
      { label: "콘텐츠 검수", href: "/dashboard/beauty/content", availability: "active" },
      { label: "성과·주문", href: "/dashboard/beauty/orders", availability: "active" },
      { label: "정산", href: "/dashboard/beauty/settlements", availability: "active" },
    ],
  );
});

test("master workspace exposes separate fashion and beauty destinations", () => {
  assert.deepEqual(getMasterRoleDestinations("K-뷰티"), [
    { key: "admin", label: "관리자 콘솔", href: "/dashboard/admin" },
    { key: "creator", label: "크리에이터 화면", href: "/dashboard/creator" },
    { key: "fashion_partner", label: "패션 브랜드 센터", href: "/dashboard/designer/brand" },
    { key: "beauty_partner", label: "뷰티 브랜드 센터", href: "/dashboard/beauty" },
  ]);
});

test("regular workspace destinations exclude pending and disabled memberships", () => {
  const memberships = [
    { workspace_type: "creator", status: "active" },
    { workspace_type: "fashion_partner", status: "disabled" },
    { workspace_type: "beauty_partner", status: "pending" },
  ] as Parameters<typeof getActiveWorkspaceDestinations>[0];
  assert.deepEqual(getActiveWorkspaceDestinations(memberships), [
    { key: "creator", label: "크리에이터 화면", href: "/dashboard/creator" },
  ]);
});

test("resolves the master partner destination from a linked brand category with fashion fallback", () => {
  assert.equal(resolveMasterPartnerDestination("K-뷰티"), "/dashboard/beauty");
  assert.equal(resolveMasterPartnerDestination("복합"), "/dashboard/beauty");
  assert.equal(resolveMasterPartnerDestination("K-패션"), "/dashboard/designer/brand");
  assert.equal(resolveMasterPartnerDestination(undefined), "/dashboard/designer/brand");
});
