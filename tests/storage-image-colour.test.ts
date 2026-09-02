import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";

test("제품 표시본은 포맷별 색 손실 설정을 피하고 sRGB 프로파일을 포함한다", async () => {
  const dataDir = mkdtempSync(path.join(os.tmpdir(), "kmodu-colour-test-"));
  process.env.DATA_DIR = dataDir;
  process.env.STORAGE_RESERVE_BYTES = "0";

  try {
    const { getStorageRoot, saveStorageImage } = await import("../src/lib/storage");
    const width = 1800;
    const height = 1200;
    const pixels = Buffer.alloc(width * height * 3);

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const offset = (y * width + x) * 3;
        pixels[offset] = Math.round((x / (width - 1)) * 255);
        pixels[offset + 1] = Math.round((y / (height - 1)) * 255);
        pixels[offset + 2] = (x + y) % 256;
      }
    }

    const input = await sharp(pixels, { raw: { width, height, channels: 3 } })
      .png()
      .withIccProfile("srgb")
      .toBuffer();
    const saved = await saveStorageImage("productUploads", input, "image/png");
    const output = readFileSync(path.join(getStorageRoot("productUploads"), path.basename(saved.url)));
    const metadata = await sharp(output).metadata();

    assert.equal(metadata.width, 1600);
    assert.notEqual(metadata.palette, true);
    assert.ok(metadata.icc && metadata.icc.length > 0);

    for (const format of ["jpeg", "webp"] as const) {
      const formattedInput = await sharp(pixels, { raw: { width, height, channels: 3 } })
        .toFormat(format, { quality: 100 })
        .withIccProfile("srgb")
        .toBuffer();
      const formattedSaved = await saveStorageImage(
        "productUploads",
        formattedInput,
        format === "jpeg" ? "image/jpeg" : "image/webp",
      );
      const formattedOutput = readFileSync(
        path.join(getStorageRoot("productUploads"), path.basename(formattedSaved.url)),
      );
      const formattedMetadata = await sharp(formattedOutput).metadata();

      assert.equal(formattedMetadata.width, 1600);
      assert.ok(formattedMetadata.icc && formattedMetadata.icc.length > 0, `${format} ICC profile`);
    }
  } finally {
    rmSync(dataDir, { recursive: true, force: true });
  }
});
