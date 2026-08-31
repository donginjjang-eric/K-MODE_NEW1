import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { normalizeProductImages } from "../src/lib/product-images";

test("normalizes one cover and four additional product images", () => {
  const input = [" /one.webp ", "/two.webp", "/one.webp", ...Array.from({ length: 10 }, (_, index) => `/extra-${index}.webp`)];
  assert.deepEqual(normalizeProductImages(input), [
    "/one.webp", "/two.webp", "/extra-0.webp", "/extra-1.webp", "/extra-2.webp",
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

test("beauty upload UI separates one cover from four additional images", async () => {
  const source = await readFile("src/components/ProductManager.tsx", "utf8");
  assert.match(source, /대표 썸네일/);
  assert.match(source, /추가 상품 이미지/);
  assert.match(source, /최대 4장/);
  assert.match(source, /onCoverFile/);
  assert.match(source, /onAdditionalFiles/);
  assert.match(source, /imageUrls/);
});

test("public product sheet includes gallery controls and restrained title sizes", async () => {
  const [html, script, css] = await Promise.all([
    readFile("beauty.html", "utf8"),
    readFile("beauty-products.js", "utf8"),
    readFile("platform.css", "utf8"),
  ]);
  assert.match(html, /beautySheetThumbs/);
  assert.match(html, /platform\.css\?v=20260831-product-gallery-6/);
  assert.match(html, /beauty-products\.js\?v=20260831-product-detail-2/);
  assert.match(script, /imageUrls/);
  assert.match(script, /beautySheetThumbs/);
  assert.match(css, /\.beauty-product-sheet-thumbs/);
  assert.match(css, /\.beauty-product-sheet-thumbs\s*\{[^}]*position:\s*static/s);
  assert.match(css, /\.beauty-product-sheet-visual\s*\{[^}]*justify-content:\s*flex-start/s);
  assert.match(css, /clamp\(30px,\s*3\.2vw,\s*48px\)/);
  assert.match(css, /clamp\(28px,\s*8vw,\s*36px\)/);
});
