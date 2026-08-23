import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("the creators page changes its stylesheet URL whenever platform.css changes", async () => {
  const [html, css] = await Promise.all([
    readFile(new URL("creators.html", root), "utf8"),
    readFile(new URL("platform.css", root), "utf8"),
  ]);
  const stylesheetHref = html.match(/href="platform\.css\?v=([a-f0-9]{12})"/)?.[1];
  const contentHash = createHash("sha256").update(css).digest("hex").slice(0, 12);

  assert.equal(stylesheetHref, contentHash, "creators.html must cache-bust the exact platform.css content");
});
