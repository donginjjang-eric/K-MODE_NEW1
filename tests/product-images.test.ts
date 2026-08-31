import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { normalizeProductImages } from "../src/lib/product-images";

test("normalizes an ordered product gallery and limits it to eight unique images", () => {
  const input = [" /one.webp ", "/two.webp", "/one.webp", ...Array.from({ length: 10 }, (_, index) => `/extra-${index}.webp`)];
  assert.deepEqual(normalizeProductImages(input), [
    "/one.webp", "/two.webp", "/extra-0.webp", "/extra-1.webp",
    "/extra-2.webp", "/extra-3.webp", "/extra-4.webp", "/extra-5.webp",
  ]);
});

test("uses the legacy cover as a gallery fallback", () => {
  assert.deepEqual(normalizeProductImages(undefined, " /legacy.webp "), ["/legacy.webp"]);
  assert.deepEqual(normalizeProductImages(["", 3, null], "/legacy.webp"), ["/legacy.webp"]);
});

test("product persistence and APIs carry the gallery while preserving the cover", async () => {
  const [schema, db, createRoute, updateRoute, publicRoute] = await Promise.all([
    readFile("db/schema.sql", "utf8"),
    readFile("src/lib/db.ts", "utf8"),
    readFile("src/app/api/products/route.ts", "utf8"),
    readFile("src/app/api/products/[id]/route.ts", "utf8"),
    readFile("src/app/api/public/beauty-products/route.ts", "utf8"),
  ]);
  assert.match(schema, /image_urls jsonb NOT NULL DEFAULT '\[\]'::jsonb/);
  assert.match(db, /image_urls/);
  assert.match(createRoute, /imageUrls/);
  assert.match(updateRoute, /imageUrls/);
  assert.match(publicRoute, /imageUrls/);
});

test("beauty upload UI accepts multiple images and exposes gallery controls", async () => {
  const source = await readFile("src/components/ProductManager.tsx", "utf8");
  assert.match(source, /multiple/);
  assert.match(source, /최대 8장/);
  assert.match(source, /대표 이미지/);
  assert.match(source, /imageUrls/);
});

test("public product sheet includes gallery controls and restrained title sizes", async () => {
  const [html, script, css] = await Promise.all([
    readFile("beauty.html", "utf8"),
    readFile("beauty-products.js", "utf8"),
    readFile("platform.css", "utf8"),
  ]);
  assert.match(html, /beautySheetThumbs/);
  assert.match(script, /imageUrls/);
  assert.match(script, /beautySheetThumbs/);
  assert.match(css, /\.beauty-product-sheet-thumbs/);
  assert.match(css, /clamp\(30px,\s*3\.2vw,\s*48px\)/);
  assert.match(css, /clamp\(28px,\s*8vw,\s*36px\)/);
});
