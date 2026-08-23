import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("admin creator account linking keeps catalogue identity, normalizes email, and exposes the admin screen", async () => {
  const [db, route, handlers, page, manager, nav, layout] = await Promise.all([
    source("../src/lib/db.ts"),
    source("../src/app/api/admin/creators/[creatorKey]/route.ts"),
    source("../src/lib/admin-creator-group-route-handlers.ts"),
    source("../src/app/dashboard/admin/creators/page.tsx"),
    source("../src/components/AdminCreatorDetailManager.tsx"),
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

  assert.match(route, /getAdminUserForApi/);
  assert.match(route, /creatorKey/);
  assert.match(route, /handleAdminCreatorPatch/);
  assert.match(route, /getManagedCreatorDetail/);
  assert.match(handlers, /toLowerCase\(\)/);
  assert.match(handlers, /status !== "approved" && status !== "disabled"/);
  assert.match(handlers, /upsertCreatorLink/);
  assert.match(handlers, /status: 409/);
  assert.match(handlers, /status: 404/);

  assert.match(page, /getCreatorAccountsForAdmin/);
  assert.match(page, /AdminCreatorManagementTable/);
  assert.match(manager, /Google 이메일/);
  assert.match(manager, /회원 레코드를 만들고 이메일을 연결/);
  assert.match(manager, /value="disabled"/);
  assert.match(nav, /"\/dashboard\/admin\/creators"/);
  assert.match(layout, /\.\/admin\.css/);
});
