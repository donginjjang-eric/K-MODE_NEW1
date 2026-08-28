import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('new and existing person accounts become immediately usable', async () => {
  const [db, schema, auth, callback, workspaceRoute] = await Promise.all([
    source('../src/lib/db.ts'),
    source('../db/schema.sql'),
    source('../src/lib/auth.ts'),
    source('../src/app/api/auth/google/callback/route.ts'),
    source('../src/app/api/admin/users/[userId]/workspaces/route.ts'),
  ]);

  assert.match(db, /creator_accounts[\s\S]*VALUES \(\$1, \$2, \$3, \$4, 'approved'/);
  assert.match(schema, /UPDATE creator_accounts SET approval_status = 'approved' WHERE approval_status = 'pending'/);
  assert.match(schema, /UPDATE designers SET approval_status = 'approved' WHERE approval_status = 'pending'/);
  assert.match(schema, /UPDATE user_workspace_memberships SET status = 'active' WHERE status = 'pending'/);
  assert.doesNotMatch(auth, /designer\.approval_status !== "approved"\) redirect/);
  assert.doesNotMatch(auth, /creator\.approval_status !== "approved"\) redirect/);
  assert.doesNotMatch(callback, /notice=approval_pending/);
  assert.match(workspaceRoute, /'approved'/);
  assert.match(workspaceRoute, /'active'/);
});

test('shared workspace header exposes clear operator and member badges', async () => {
  const [labels, switcher] = await Promise.all([
    source('../src/lib/account-role-badge.ts'),
    source('../src/components/MasterRoleSwitcher.tsx'),
  ]);

  for (const label of ['운영자', '부운영자', '디자이너', '크리에이터']) assert.match(labels, new RegExp(label));
  assert.match(switcher, /accountRoleBadgeLabel/);
  assert.match(switcher, /account-role-badge/);
});

test('onboarding copy opens centers immediately and removes account approval banners', async () => {
  const [login, designerLayout, beautyLayout] = await Promise.all([
    source('../src/components/LoginForm.tsx'),
    source('../src/app/dashboard/designer/layout.tsx'),
    source('../src/app/dashboard/beauty/layout.tsx'),
  ]);
  assert.match(login, /등록 완료! 크리에이터 센터를 바로 이용할 수 있어요/);
  assert.match(login, /approvalStatus: "approved"/);
  assert.doesNotMatch(designerLayout, /승인 전/);
  assert.doesNotMatch(beautyLayout, /승인 전/);
});

test('admin account surfaces use access language instead of approval waiting language', async () => {
  const [home, nav, usersPage] = await Promise.all([
    source('../src/app/dashboard/admin/page.tsx'),
    source('../src/lib/admin-navigation.ts'),
    source('../src/app/dashboard/admin/users/page.tsx'),
  ]);
  for (const content of [home, nav, usersPage]) assert.doesNotMatch(content, /회원·승인|크리에이터 승인|브랜드 파트너 승인|승인 대기/);
  assert.match(nav, /회원·등급 관리/);
  assert.match(home, /크리에이터 현황/);
  assert.match(home, /브랜드 파트너 현황/);
});
