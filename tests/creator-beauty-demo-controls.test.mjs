import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("admin demo controls protect actions and refresh every creator-center view", async () => {
  const [actions, controls, layout] = await Promise.all([
    source("../src/app/dashboard/creator/demo-actions.ts"),
    source("../src/components/CreatorDemoControls.tsx"),
    source("../src/app/dashboard/creator/layout.tsx"),
  ]);

  assert.match(actions, /user\.role !== "admin"/);
  assert.match(actions, /getOrCreateAdminCreatorAccount/);
  assert.match(actions, /seedCreatorBeautyDemo/);
  assert.match(actions, /resetCreatorBeautyDemo/);
  assert.match(actions, /revalidatePath\("\/dashboard\/creator"\)/);
  assert.match(actions, /revalidatePath\("\/dashboard\/creator\/campaigns"\)/);
  assert.match(actions, /revalidatePath\("\/dashboard\/creator\/my-campaigns"\)/);
  assert.match(actions, /revalidatePath\("\/dashboard\/creator\/my-campaigns\/\[id\]", "page"\)/);
  assert.match(actions, /revalidatePath\("\/dashboard\/creator\/submissions"\)/);
  assert.match(actions, /revalidatePath\("\/dashboard\/creator\/settlement"\)/);
  assert.match(actions, /revalidatePath\("\/dashboard\/creator\/profile"\)/);
  assert.match(actions, /revalidatePath\("\/dashboard\/creator\/performance"\)/);
  assert.match(actions, /revalidatePath\("\/dashboard\/creator\/grade"\)/);
  assert.match(controls, /체험 데이터 채우기/);
  assert.match(controls, /체험 데이터 초기화/);
  assert.match(controls, /seedDemoAction/);
  assert.match(controls, /resetDemoAction/);
  assert.match(layout, /CreatorDemoControls/);
});
