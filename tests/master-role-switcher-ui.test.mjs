import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("master controls separate permission from workspace navigation", async () => {
  const component = await readFile(new URL("../src/components/MasterRoleSwitcher.tsx", import.meta.url), "utf8");
  assert.match(component, /master-access-badge/);
  assert.match(component, />마스터 권한</);
  assert.match(component, /master-workspace-switcher/);
  assert.match(component, /화면 전환/);
  assert.match(component, /getMasterRoleDestinations\(\)/);
  assert.match(component, /aria-current=\{item\.key === active \? "page" : undefined\}/);
});

test("workspace switcher exposes separate fashion and beauty destinations", async () => {
  const masterAdmin = await readFile(new URL("../src/lib/master-admin.ts", import.meta.url), "utf8");
  for (const label of ["관리자 콘솔", "크리에이터 화면", "패션 브랜드 센터", "뷰티 브랜드 센터"]) {
    assert.match(masterAdmin, new RegExp(label));
  }
  assert.match(masterAdmin, /\/dashboard\/designer\/brand/);
  assert.match(masterAdmin, /\/dashboard\/beauty/);
});

test("regular accounts only receive links for active memberships", async () => {
  const component = await readFile(new URL("../src/components/MasterRoleSwitcher.tsx", import.meta.url), "utf8");
  assert.match(component, /memberships/);
  assert.match(component, /getActiveWorkspaceDestinations\(memberships\)/);
  assert.doesNotMatch(component, /if \(!isMasterAdminEmail\(email\)\) return null/);
});

test("admin and creator workspaces pass the authenticated user id to the switcher", async () => {
  const [adminLayout, creatorLayout] = await Promise.all([
    readFile(new URL("../src/app/dashboard/admin/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/dashboard/creator/layout.tsx", import.meta.url), "utf8"),
  ]);

  for (const layout of [adminLayout, creatorLayout]) {
    assert.match(layout, /userId=\{user\.id\}/);
  }
});

test("master workspace switcher uses the same standalone top bar in every center", async () => {
  const [component, adminLayout, creatorLayout, designerLayout, beautyLayout] = await Promise.all([
    readFile(new URL("../src/components/MasterRoleSwitcher.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/dashboard/admin/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/dashboard/creator/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/dashboard/designer/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/dashboard/beauty/layout.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(component, /master-workspace-bar/);
  for (const layout of [adminLayout, creatorLayout, designerLayout, beautyLayout]) {
    assert.match(layout, /<MasterRoleSwitcher/);
  }

  const preview = creatorLayout.match(/<div className="creator-admin-preview">([\s\S]*?)<\/div>\s*\) : null\}/)?.[1] || "";
  assert.doesNotMatch(preview, /MasterRoleSwitcher/);
});

test("admin navigation identifies the operations console with a dedicated illustration", async () => {
  const adminNav = await readFile(new URL("../src/components/AdminNav.tsx", import.meta.url), "utf8");
  assert.match(adminNav, /admin-console-operator\.webp/);
  assert.match(adminNav, /관리자 콘솔 운영 화면/);
});
