import assert from "node:assert/strict";
import test from "node:test";

import {
  BEAUTY_PARTNER_NAV_ITEMS,
  brandPartnerCenterPath,
  normalizeBrandCategory,
} from "../src/lib/brand-partner-center";
import { loginEntryUrl, passwordLoginDestination } from "../src/lib/auth";
import { getMasterRoleDestinations } from "../src/lib/master-admin";

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

test("defines three active beauty destinations and reserves the Task 4 destinations", () => {
  assert.deepEqual(
    BEAUTY_PARTNER_NAV_ITEMS.map(({ label, href, availability }) => ({ label, href, availability })),
    [
      { label: "홈", href: "/dashboard/beauty", availability: "active" },
      { label: "브랜드 프로필", href: "/dashboard/beauty/brand", availability: "active" },
      { label: "상품 관리", href: "/dashboard/beauty/products", availability: "active" },
      { label: "캠페인", href: "/dashboard/beauty/campaigns", availability: "upcoming" },
      { label: "크리에이터 매칭", href: "/dashboard/beauty/matching", availability: "upcoming" },
      { label: "거래 관리", href: "/dashboard/beauty/transactions", availability: "upcoming" },
    ],
  );
});

test("master workspace keeps three clear labels and selects the partner center by category", () => {
  assert.deepEqual(getMasterRoleDestinations("K-뷰티"), [
    { key: "admin", label: "관리자 콘솔", href: "/dashboard/admin" },
    { key: "creator", label: "크리에이터 센터", href: "/dashboard/creator" },
    { key: "designer", label: "브랜드 파트너 센터", href: "/dashboard/beauty" },
  ]);
  assert.equal(getMasterRoleDestinations("복합")[2].href, "/dashboard/beauty");
  assert.equal(getMasterRoleDestinations(undefined)[2].href, "/dashboard/designer/brand");
});
