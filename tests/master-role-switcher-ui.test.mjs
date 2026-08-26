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
