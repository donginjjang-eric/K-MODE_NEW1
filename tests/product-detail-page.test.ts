import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { normalizeProductDetailImages } from "../src/lib/product-detail-images";

test("normalizes ordered detail images and limits them to fifteen unique entries", () => {
  const values = [" /detail-1.webp ", "/detail-2.webp", "/detail-1.webp", ...Array.from({ length: 20 }, (_, i) => `/extra-${i}.webp`)];
  const result = normalizeProductDetailImages(values);
  assert.equal(result.length, 15);
  assert.deepEqual(result.slice(0, 3), ["/detail-1.webp", "/detail-2.webp", "/extra-0.webp"]);
});

test("schema, persistence, and public API carry detail images separately", async () => {
  const [schema, db, createRoute, updateRoute, publicRoute] = await Promise.all([
    readFile("db/schema.sql", "utf8"), readFile("src/lib/db.ts", "utf8"),
    readFile("src/app/api/products/route.ts", "utf8"), readFile("src/app/api/products/[id]/route.ts", "utf8"),
    readFile("src/app/api/public/beauty-products/route.ts", "utf8"),
  ]);
  assert.match(schema, /detail_image_urls jsonb NOT NULL DEFAULT '\[\]'::jsonb/);
  assert.match(db, /detail_image_urls/);
  assert.match(createRoute, /detailImageUrls/);
  assert.match(updateRoute, /detailImageUrls/);
  assert.match(publicRoute, /detailImageUrls/);
  assert.match(schema, /jsonb_array_length\(p\.detail_image_urls\) = 0/);
  assert.match(schema, /LOWER\(d\.brand_category\) IN \('beauty', 'k-beauty', '뷰티', 'k-뷰티'\)/);
  assert.match(schema, /SET detail_image_urls = p\.image_urls/);
});

test("beauty partner editor has a separate fifteen-image detail section", async () => {
  const source = await readFile("src/components/ProductManager.tsx", "utf8");
  assert.match(source, /상세페이지 이미지/);
  assert.match(source, /최대 15장/);
  assert.match(source, /detailImageUrls/);
  assert.match(source, /위로/);
  assert.match(source, /아래로/);
});

test("public modal renders shopping information, long detail content, and collaboration CTA", async () => {
  const [html, script, css] = await Promise.all([
    readFile("beauty.html", "utf8"), readFile("beauty-products.js", "utf8"), readFile("platform.css", "utf8"),
  ]);
  assert.match(html, /beautySheetPrice/);
  assert.match(html, /beautySheetDetailImages/);
  assert.match(html, /제품 상세정보/);
  assert.match(html, /platform\.css\?v=20260831-product-gallery-6/);
  assert.match(html, /beauty-products\.js\?v=20260831-product-detail-2/);
  assert.match(script, /detailImageUrls/);
  assert.match(script, /beautySheetDetailImages/);
  assert.match(css, /\.beauty-sheet-detail-images/);
  assert.match(css, /\.beauty-sheet-sticky-action/);
});
