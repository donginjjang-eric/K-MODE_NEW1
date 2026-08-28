import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { safeWorkspaceNext, workspaceSelectionUrl } from "../src/lib/workspace-selection.ts";

test("workspace redirect accepts only internal paths for the selected center", () => {
  assert.equal(safeWorkspaceNext("/dashboard/beauty/products", "beauty_partner"), "/dashboard/beauty/products");
  assert.equal(safeWorkspaceNext("/dashboard/designer/products", "beauty_partner"), "/dashboard/beauty");
  assert.equal(safeWorkspaceNext("//evil.example", "fashion_partner"), "/dashboard/designer/brand");
  assert.equal(safeWorkspaceNext("https://evil.example", "creator"), "/dashboard/creator");
  assert.equal(workspaceSelectionUrl("membership 1", "/dashboard/beauty/products"), "/dashboard/workspaces?membership=membership+1&next=%2Fdashboard%2Fbeauty%2Fproducts");
});

test("workspace redirect rejects normalized and encoded traversal or backslash paths", () => {
  const fallback = "/dashboard/beauty";
  for (const value of [
    "/dashboard/beauty/../designer/brand",
    "/dashboard/beauty/%2e%2e/designer/brand",
    "/dashboard/beauty/%252e%252e/designer/brand",
    "/dashboard/beauty/%5c..%5cdesigner",
    "/dashboard/beauty\\..\\designer",
    "/dashboard/beautyevil/products",
  ]) {
    assert.equal(safeWorkspaceNext(value, "beauty_partner"), fallback, value);
  }
});

test("workspace redirect rejects encoded query or hash boundaries after repeated decoding", () => {
  const fallback = "/dashboard/beauty";
  for (const value of [
    "/dashboard/beauty/%3Fnext=/dashboard/admin",
    "/dashboard/beauty/%23/admin",
    "/dashboard/beauty/%253Fnext=/dashboard/admin",
    "/dashboard/beauty/%252523/admin",
    "/dashboard/beauty/products%3Fnext=%2Fdashboard%2Fadmin?allowed=1",
  ]) {
    assert.equal(safeWorkspaceNext(value, "beauty_partner"), fallback, value);
  }
});

test("login routes only run a user-scoped migration when that user has no memberships", async () => {
  const [passwordRoute, googleRoute] = await Promise.all([
    readFile(new URL("../src/app/api/auth/login/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/auth/google/callback/route.ts", import.meta.url), "utf8"),
  ]);
  for (const source of [passwordRoute, googleRoute]) {
    assert.doesNotMatch(source, /backfillWorkspaceMemberships\(/);
    assert.match(source, /if \(.*Workspaces\.length === 0\)/s);
    assert.match(source, /backfillUserWorkspaceMemberships\(.*\.id\)/s);
  }
});

test("workspace authorization retries requested capability migration before redirecting", async () => {
  const auth = await readFile(new URL("../src/lib/auth.ts", import.meta.url), "utf8");
  assert.match(auth, /backfillUserWorkspaceMemberships\(user\.id, type\)/);
  const migrateAt = auth.indexOf("backfillUserWorkspaceMemberships(user.id, type)");
  const retryAt = auth.indexOf("listUserWorkspaces(user.id)", migrateAt);
  const redirectAt = auth.indexOf("redirect(`/dashboard/workspaces", migrateAt);
  assert.ok(migrateAt >= 0 && retryAt > migrateAt && redirectAt > retryAt);
});

test("selector route verifies the session membership and writes a protected cookie", async () => {
  const route = await readFile(new URL("../src/app/api/workspaces/select/route.ts", import.meta.url), "utf8");

  assert.match(route, /getCurrentUser\(\)/);
  assert.match(route, /resolveUserWorkspace\(/);
  assert.match(route, /httpOnly:\s*true/);
  assert.match(route, /sameSite:\s*"lax"/);
  assert.match(route, /secure:\s*process\.env\.NODE_ENV === "production"/);
  assert.match(route, /safeWorkspaceNext\(/);
});

test("workspace page separates active pending and disabled memberships", async () => {
  const page = await readFile(new URL("../src/app/dashboard/workspaces/page.tsx", import.meta.url), "utf8");
  for (const label of ["사용 가능", "승인 대기", "이용 중지"]) assert.match(page, new RegExp(label));
});
