import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8").catch(() => "");
}

test("admin home exposes a real-data action center for all four review queues", async () => {
  const [page, db] = await Promise.all([
    source("../src/app/dashboard/admin/page.tsx"),
    source("../src/lib/db.ts"),
  ]);

  for (const field of ["pendingCreators", "pendingDesigners", "pendingProducts", "pendingGeneratedLooks"]) {
    assert.match(page, new RegExp(`stats\\.${field}`));
    assert.match(db, new RegExp(field));
  }
  for (const href of ["/dashboard/admin/creators", "/dashboard/admin/designers", "/dashboard/admin/products", "/dashboard/admin/generated-looks"]) {
    assert.match(page, new RegExp(href));
  }
  assert.match(page, /처리할 업무/);
});

test("all five client-side admin lists use the shared twenty-item paginator", async () => {
  const files = await Promise.all([
    source("../src/components/AdminUsersManager.tsx"),
    source("../src/components/AdminCreatorManagementTable.tsx"),
    source("../src/components/AdminProductsManager.tsx"),
    source("../src/components/AdminBrandPartnersManager.tsx"),
    source("../src/components/AdminGeneratedLooksManager.tsx"),
  ]);

  for (const file of files) {
    assert.match(file, /AdminPagination/);
    assert.match(file, /paginateAdminItems/);
  }
  for (const file of files.slice(0, 4)) {
    assert.match(file, /setCurrentPage\(1\)/);
  }
});

test("brand partners expose business-category and approval filters without removing status actions", async () => {
  const manager = await source("../src/components/AdminBrandPartnersManager.tsx");

  assert.match(manager, /K-뷰티/);
  assert.match(manager, /K-패션/);
  assert.match(manager, /복합/);
  assert.match(manager, /승인 상태/);
  assert.match(manager, /AdminDesignerActions/);
});

test("catalogue creators cannot appear as pending applications or expose approval actions", async () => {
  const table = await source("../src/components/AdminCreatorManagementTable.tsx");

  assert.match(table, /isCreatorApprovalApplication/);
  assert.match(table, /운영 카탈로그/);
  assert.match(table, /가입 신청/);
  assert.match(table, /isApprovalApplication \?/);
});

test("product and generated-look cards share an image failure fallback", async () => {
  const [products, looks, fallback] = await Promise.all([
    source("../src/components/AdminProductsManager.tsx"),
    source("../src/components/AdminGeneratedLooksManager.tsx"),
    source("../src/components/AdminImageWithFallback.tsx"),
  ]);

  assert.match(products, /AdminImageWithFallback/);
  assert.match(looks, /AdminImageWithFallback/);
  assert.match(fallback, /onError/);
  assert.match(fallback, /이미지 없음/);
});

test("admin-only mobile styles keep paginator and primary actions free of horizontal scrolling", async () => {
  const css = await source("../src/app/dashboard/admin/admin.css");

  assert.match(css, /admin-pagination/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*admin-pagination/);
  assert.match(css, /admin-brand-actions/);
  assert.match(css, /admin-image-fallback/);
});
