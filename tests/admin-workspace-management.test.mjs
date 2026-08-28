import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("admin member drawer exposes creator fashion and beauty workspace controls", async () => {
  const component = await source("../src/components/AdminUserWorkspaceManager.tsx");
  for (const label of ["크리에이터", "패션 브랜드", "뷰티 브랜드", "승인", "비활성화", "기본 작업공간"]) {
    assert.match(component, new RegExp(label));
  }
  assert.match(component, /\/api\/admin\/users\/\$\{userId\}\/workspaces/);
});

test("member approval drawer embeds workspace manager without navigating away", async () => {
  const manager = await source("../src/components/AdminUsersManager.tsx");
  assert.match(manager, /AdminUserWorkspaceManager/);
  assert.match(manager, /<AdminUserWorkspaceManager[\s\S]*userId=\{selected\.u\.id\}/);
  assert.match(manager, /router\.refresh\(\)/);
});

test("admin workspace endpoint validates exact actions and audits every mutation", async () => {
  const route = await source("../src/app/api/admin/users/[userId]/workspaces/route.ts");
  const input = await source("../src/lib/admin-workspace-input.ts");
  for (const action of ["approve", "disable", "set_default", "create_beauty_partner"]) {
    assert.match(`${route}\n${input}`, new RegExp(`\"${action}\"`));
  }
  assert.match(route, /requireUser\("admin"\)/);
  assert.match(route, /withDatabaseTransaction/);
  assert.match(route, /creator_management_audit_logs/);
  assert.match(route, /WHERE id = \$2 AND user_id = \$1/);
  assert.match(route, /body\.action === "set_default" && membership\.status !== "active"/);
});

test("legacy inline approvals activate the matching membership atomically before UI success", async () => {
  const designerRoute = await source("../src/app/api/admin/designers/[id]/approve/route.ts");
  const creatorDomain = await source("../src/lib/creator-management.ts");
  const ui = await source("../src/components/AdminUsersManager.tsx");
  assert.match(designerRoute, /withDatabaseTransaction/);
  assert.match(designerRoute, /UPDATE user_workspace_memberships[\s\S]*status = 'active'/);
  assert.match(creatorDomain, /UPDATE user_workspace_memberships[\s\S]*workspace_type = 'creator'/);
  const review = ui.match(/const review = async \(\) => \{([\s\S]*?)\n  \};/)?.[1] || "";
  assert.ok(review.indexOf("if (!response.ok) throw") < review.indexOf("setToast("));
});

test("disabling one hybrid workspace preserves an active sibling and clears its default", async () => {
  const route = await source("../src/app/api/admin/users/[userId]/workspaces/route.ts");
  assert.match(route, /status = \$3, is_default = false/);
  assert.match(route, /NOT EXISTS[\s\S]*workspace_type IN \('fashion_partner', 'beauty_partner'\)[\s\S]*status = 'active'/);
  assert.match(route, /body\.action === "approve"[\s\S]*approval_status = 'approved'/);
});

test("workspace schema allows only one active default per user", async () => {
  const schema = await source("../db/schema.sql");
  assert.match(schema, /CREATE UNIQUE INDEX IF NOT EXISTS user_workspace_memberships_one_active_default_idx/);
  assert.match(schema, /ON user_workspace_memberships\(user_id\)[\s\S]*WHERE is_default = true AND status = 'active'/);
});
