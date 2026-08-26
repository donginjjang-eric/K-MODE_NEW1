import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("master controls separate permission from workspace navigation", async () => {
  const component = await readFile(new URL("../src/components/MasterRoleSwitcher.tsx", import.meta.url), "utf8");
  assert.match(component, /master-access-badge/);
  assert.match(component, />마스터 권한</);
  assert.match(component, /master-workspace-switcher/);
  assert.match(component, /화면 전환/);
  assert.match(component, /getMasterRoleDestinations\(brandCategory\)/);
  assert.match(component, /aria-current=\{item\.key === active \? "page" : undefined\}/);
});

test("admin and creator master workspaces pass the linked owner brand category to the switcher", async () => {
  const [adminLayout, creatorLayout] = await Promise.all([
    readFile(new URL("../src/app/dashboard/admin/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/dashboard/creator/layout.tsx", import.meta.url), "utf8"),
  ]);

  for (const layout of [adminLayout, creatorLayout]) {
    assert.match(layout, /getDesignerForUser\(user\.id\)/);
    assert.match(layout, /brandCategory=\{masterDesigner\?\.brand_category\}/);
  }
});
