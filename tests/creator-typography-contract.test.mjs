import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("creator center uses a readable Pretendard typography system", async () => {
  const css = await readFile(new URL("../src/app/dashboard/creator/creator.css", import.meta.url), "utf8");

  assert.match(css, /font-family:\s*"Pretendard Variable",\s*Pretendard/);
  assert.match(css, /\.creator-page-heading h1\s*\{[^}]*font-size:\s*clamp\(38px,\s*4vw,\s*54px\)/s);
  assert.match(css, /\.creator-menu a\s*\{[^}]*font-size:\s*15px/s);
  assert.match(css, /\.creator-kpi-grid span\s*\{[^}]*font-size:\s*14px/s);
  assert.match(css, /@media \(max-width:\s*760px\)[\s\S]*?\.creator-mobile-nav a\s*\{[^}]*font-size:\s*12px/s);
});
