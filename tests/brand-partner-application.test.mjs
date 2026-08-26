import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("brand partner application requires and submits a business category", async () => {
  const html = await readFile(new URL("../apply.html", import.meta.url), "utf8");
  for (const category of ["K-뷰티", "K-패션", "복합"]) assert.match(html, new RegExp(`value="${category}"`));
  assert.match(html, /querySelectorAll\('input\[required\], select\[required\]'\)/);
  assert.match(html, /const category = brandCategory\.value/);
  assert.match(html, /brandCategory\.reportValidity\(\)/);
});
