import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("admins receive a dedicated operational creator identity and mutation access", async () => {
  const [auth, db, layout] = await Promise.all([
    source("../src/lib/auth.ts"),
    source("../src/lib/db.ts"),
    source("../src/app/dashboard/creator/layout.tsx"),
  ]);

  assert.match(auth, /user\.role !== "creator" && user\.role !== "admin"/);
  assert.match(auth, /getOrCreateAdminCreatorAccount/);
  assert.match(auth, /user\.role === "admin"/);
  assert.match(db, /export async function getOrCreateAdminCreatorAccount/);
  assert.match(db, /K-MODU 운영자/);
  assert.match(db, /ON CONFLICT \(user_id\)/);
  assert.match(layout, /관리자 운영 모드/);
  assert.match(layout, /\/dashboard\/admin\/campaigns/);

  const apiGuard = auth.slice(auth.indexOf("export async function getApprovedCreatorForApi"));
  assert.match(apiGuard, /user\.role !== "creator" && user\.role !== "admin"/);
  assert.match(apiGuard, /getOrCreateAdminCreatorAccount/);
});
