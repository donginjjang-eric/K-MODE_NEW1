import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");
const normalizedHash = (value) => createHash("sha256").update(value.replaceAll("\r\n", "\n")).digest("hex");

test("beauty routes use the guarded partner identity and owner-scoped existing data", async () => {
  const [layout, home, brand, products] = await Promise.all([
    source("../src/app/dashboard/beauty/layout.tsx"),
    source("../src/app/dashboard/beauty/page.tsx"),
    source("../src/app/dashboard/beauty/brand/page.tsx"),
    source("../src/app/dashboard/beauty/products/page.tsx"),
  ]);

  for (const routeSource of [layout, home, brand, products]) {
    assert.match(routeSource, /requireBeautyPartner\(\)/);
    assert.doesNotMatch(routeSource, /requireApprovedDesigner\(/);
  }
  assert.match(home, /getProductsForDesigner\(designer\.id\)/);
  assert.match(home, /getPortfolioImagesForDesigner\(designer\.id\)/);
  assert.match(brand, /getPortfolioImagesForDesigner\(designer\.id\)/);
  assert.match(products, /getProductsForDesigner\(designer\.id\)/);
  assert.match(brand, /<BrandProfileStudio[\s\S]*mode="beauty"/);
  assert.match(products, /<ProductManager[\s\S]*mode="beauty"/);
});

test("beauty shell is distinct, responsive, and exposes only real current data", async () => {
  const [layout, home, nav, css] = await Promise.all([
    source("../src/app/dashboard/beauty/layout.tsx"),
    source("../src/components/BeautyPartnerHome.tsx"),
    source("../src/components/BeautyPartnerNav.tsx"),
    source("../src/app/dashboard/beauty/beauty.css"),
  ]);

  assert.match(layout, /K-MODU/);
  assert.match(layout, /뷰티 파트너 센터/);
  assert.match(layout, /BeautyPartnerSideNav/);
  assert.match(layout, /BeautyPartnerMobileNav/);
  assert.match(home, /profileCompleted/);
  assert.match(home, /productCount/);
  assert.match(home, /publishedProductCount/);
  assert.doesNotMatch(home, /매출|조회수|전환율/);
  assert.match(nav, /aria-disabled="true"/);
  assert.match(css, /@media \(max-width: 760px\)/);
});

test("designer studio route shell and navigation remain byte-for-byte at the Task 3 baseline", async () => {
  const [layout, nav] = await Promise.all([
    source("../src/app/dashboard/designer/layout.tsx"),
    source("../src/components/StudioNav.tsx"),
  ]);
  assert.equal(normalizedHash(layout), "fb8e3696a063c8aeb961944258981d9579f615a6ecb94c9b9d805a9f16f24ecc");
  assert.equal(normalizedHash(nav), "534c66c1994d75891efe74dd7100e3e12ace1aba04027c8044627fa6dee34f0b");
});

test("existing product mutations remain authenticated and owner-scoped", async () => {
  const [collection, item] = await Promise.all([
    source("../src/app/api/products/route.ts"),
    source("../src/app/api/products/[id]/route.ts"),
  ]);
  assert.match(collection, /getApprovedDesignerForApi\(\)/);
  assert.match(collection, /createProductForDesigner\(\{[\s\S]*designerId:\s*designer\.id/);
  assert.match(item, /getApprovedDesignerForApi\(\)/);
  assert.match(item, /updateProductForDesigner\(designer\.id, id/);
  assert.match(item, /updateProductForDesigner\(designer\.id, id, \{ status: "hidden" \}\)/);
});
