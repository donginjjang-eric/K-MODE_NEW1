import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { initialProductApprovalStatus } from "../src/lib/product-approval";

test("auto-approves products unless manual approval is explicitly enabled", () => {
  assert.equal(initialProductApprovalStatus(undefined), "approved");
  assert.equal(initialProductApprovalStatus("true"), "approved");
  assert.equal(initialProductApprovalStatus("false"), "pending");
});

test("schema and product creation preserve an independent approval state", async () => {
  const [schema, db] = await Promise.all([
    readFile("db/schema.sql", "utf8"),
    readFile("src/lib/db.ts", "utf8"),
  ]);
  assert.match(schema, /approval_status text NOT NULL DEFAULT 'approved'/);
  assert.match(db, /AUTO_APPROVE_PRODUCTS/);
  assert.match(db, /approvalStatus/);
});

test("public catalogue requires both approval and public visibility", async () => {
  const db = await readFile("src/lib/db.ts", "utf8");
  assert.match(db, /products\.approval_status = 'approved'/);
  assert.match(db, /products\.status = 'active'/);
});

test("admin product management shows approval and can approve pending products", async () => {
  const [manager, route] = await Promise.all([
    readFile("src/components/AdminProductsManager.tsx", "utf8"),
    readFile("src/app/api/admin/products/[id]/route.ts", "utf8"),
  ]);
  assert.match(manager, /승인 완료/);
  assert.match(manager, /승인하기/);
  assert.match(manager, /상세.*MAX_PRODUCT_DETAIL_IMAGES/);
  assert.match(route, /approvalStatus/);
});
