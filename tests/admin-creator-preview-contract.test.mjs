import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("admins can preview the creator center without receiving creator mutation access", async () => {
  const [auth, db, layout] = await Promise.all([
    source("../src/lib/auth.ts"),
    source("../src/lib/db.ts"),
    source("../src/app/dashboard/creator/layout.tsx"),
  ]);

  assert.match(auth, /user\.role !== "creator" && user\.role !== "admin"/);
  assert.match(auth, /getApprovedCreatorAccountForAdminPreview/);
  assert.match(auth, /user\.role === "admin"/);
  assert.match(auth, /creator_preview_unavailable/);
  assert.match(db, /export async function getApprovedCreatorAccountForAdminPreview/);
  assert.match(db, /approval_status = 'approved'/);
  assert.match(db, /catalogue-\$\{snapshot\.creatorKey\}/);
  assert.match(db, /approval_status: "approved"/);
  assert.match(layout, /관리자 미리보기/);
  assert.match(layout, /\/dashboard\/admin\/campaigns/);

  const apiGuard = auth.slice(auth.indexOf("export async function getApprovedCreatorForApi"));
  assert.match(apiGuard, /user\.role !== "creator"/);
  assert.doesNotMatch(apiGuard, /getApprovedCreatorAccountForAdminPreview/);
});
