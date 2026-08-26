import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("login editorial uses the approved K-beauty and K-fashion message", async () => {
  const component = await readFile(new URL("../src/components/LoginEditorialPanel.tsx", import.meta.url), "utf8");
  const i18n = await readFile(new URL("../site-i18n.js", import.meta.url), "utf8");

  assert.match(component, /K-beauty, K-fashion/);
  assert.match(component, /세계를 향합니다/);
  assert.match(i18n, /'K-beauty, K-fashion':\s*\[[^\]]*'K-BEAUTY, K-FASHION\.'/s);
  assert.match(i18n, /'세계를 향합니다':\s*\[[^\]]*'TOWARD THE WORLD\.'/s);
});
