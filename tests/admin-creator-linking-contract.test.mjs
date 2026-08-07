import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("admin creator account linking keeps catalogue identity, normalizes email, and exposes the admin screen", async () => {
  const [db, route, page, manager, nav, layout] = await Promise.all([
    source("../src/lib/db.ts"),
    source("../src/app/api/admin/creators/[creatorKey]/route.ts"),
    source("../src/app/dashboard/admin/creators/page.tsx"),
    source("../src/components/AdminCreatorAccountManager.tsx"),
    source("../src/components/AdminNav.tsx"),
    source("../src/app/dashboard/admin/layout.tsx"),
  ]);

  assert.match(db, /export async function getCreatorAccountsForAdmin\(\)/);
  assert.match(db, /export async function upsertCreatorAccountLink\(/);
  assert.match(db, /creator_key/);
  assert.match(db, /lower\(google_email\) = \$1/);
  assert.match(db, /googleEmail\.trim\(\)\.toLowerCase\(\)/);
  assert.match(db, /ON CONFLICT \(creator_key\)/);
  assert.match(db, /DO UPDATE[\s\S]*display_name = creator_accounts\.display_name/);
  assert.match(db, /BEGIN/);
  assert.match(db, /pg_advisory_xact_lock\(hashtext\(\$1\)\)/);
  assert.match(db, /COMMIT/);
  assert.match(db, /ROLLBACK/);
  assert.match(db, /client\.release\(\)/);

  assert.match(route, /await requireUser\("admin"\)/);
  assert.match(route, /creatorKey/);
  assert.match(route, /email\.trim\(\)\.toLowerCase\(\)/);
  assert.match(route, /\["approved", "disabled"\]/);
  assert.match(route, /upsertCreatorAccountLink/);
  assert.match(route, /status: 409/);
  assert.match(route, /status: 404/);

  assert.match(page, /getCreatorAccountsForAdmin/);
  assert.match(page, /AdminCreatorAccountManager/);
  assert.match(manager, /연결 및 승인/);
  assert.match(manager, /비활성화/);
  assert.match(nav, /"\/dashboard\/admin\/creators"/);
  assert.match(layout, /\.\/admin\.css/);
});
