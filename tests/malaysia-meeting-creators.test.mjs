import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";

test("the August Malaysia meeting roster exposes 24 public creator cards without commercial rates", async () => {
  delete globalThis.KMODU_MALAYSIA_MEETING_CREATORS;
  await import(`../data/malaysia-meeting-creators.js?test=${Date.now()}`);

  const creators = globalThis.KMODU_MALAYSIA_MEETING_CREATORS;
  assert.equal(creators.length, 24);
  assert.equal(creators.reduce((total, creator) => total + creator.totalFollowers, 0), 5_031_738);
  assert.deepEqual(
    creators.map((creator) => creator.name),
    [
      "Syamimi", "Alif", "Anis", "Nadia", "Bella", "Yasmeen", "Arisha", "Shazwani",
      "Husin", "Fatin", "Allysha", "Yaya", "JamJien", "Afrina", "Alissa Azam", "Tiysyaa",
      "Munirah Jay", "Afeesya", "Dalysha", "Nezzah", "Fya", "Stephanie", "Leree", "Atiqah",
    ],
  );

  for (const creator of creators) {
    assert.match(creator.instagramUrl, /^https:\/\/www\.instagram\.com\//);
    assert.match(creator.tiktokUrl, /^https:\/\/www\.tiktok\.com\/@/);
    assert.equal(typeof creator.instagramFollowers, "number");
    assert.ok(creator.instagramFollowers > 0);
    assert.ok(creator.tiktokFollowers === null || creator.tiktokFollowers >= 0);
    assert.equal(creator.totalFollowers, creator.instagramFollowers + (creator.tiktokFollowers || 0));
    assert.match(creator.image, /^assets\/influencer-sourcing\/cards\/malaysia-meeting\/[a-z0-9-]+\.webp$/);
    assert.match(creator.slug, /^[a-z0-9-]+$/);
    assert.ok(creator.direction.length > 0);
    assert.equal("igReelRate" in creator, false);
    assert.equal("tiktokVideoRate" in creator, false);
    assert.equal("syncRate" in creator, false);
  }
});

test("the meeting roster renders into the existing Malaysia creator-card contract", async () => {
  delete globalThis.KMODU_MALAYSIA_MEETING_CREATORS;
  delete globalThis.KMODU_RENDER_MALAYSIA_MEETING_CREATORS;
  await import(`../data/malaysia-meeting-creators.js?render=${Date.now()}`);

  const markup = globalThis.KMODU_RENDER_MALAYSIA_MEETING_CREATORS(
    globalThis.KMODU_MALAYSIA_MEETING_CREATORS,
    {
      formatFollowers: (value) => String(value),
      imageMarkup: (source, alt) => `<img data-profile-src="${source}" alt="${alt}">`,
    },
  );

  assert.equal((markup.match(/<article class="market-card is-seeding is-meeting"/g) || []).length, 24);
  assert.match(markup, /data-instagram-url="https:\/\/www\.instagram\.com\/syamimifzain\/"/);
  assert.match(markup, /data-tiktok-url="https:\/\/www\.tiktok\.com\/@syamimifzain"/);
  assert.match(markup, /<strong>416500<\/strong>Total/);
  assert.match(markup, /<strong>138000<\/strong>IG · TT 278500/);
  assert.match(markup, /MEETING VERIFIED/);
  assert.doesNotMatch(markup, /RM\s*[\d,]+/);
});

test("every meeting creator uses the existing source plus 360w and 720w WebP thumbnail pattern", async () => {
  delete globalThis.KMODU_MALAYSIA_MEETING_CREATORS;
  await import(`../data/malaysia-meeting-creators.js?images=${Date.now()}`);

  const root = path.resolve(import.meta.dirname, "..");
  for (const creator of globalThis.KMODU_MALAYSIA_MEETING_CREATORS) {
    const sourcePath = path.join(root, ...creator.image.split("/"));
    await access(sourcePath);
    const source = await sharp(sourcePath).metadata();
    assert.equal(source.format, "webp");
    assert.ok(source.width >= 720, `${creator.name} source must be at least 720px wide`);
    assert.ok(source.height > source.width, `${creator.name} source must be portrait`);

    for (const width of [360, 720]) {
      const thumbnailPath = path.join(root, "assets", "creator-thumbnails", `${creator.slug}-${width}.webp`);
      await access(thumbnailPath);
      const thumbnail = await sharp(thumbnailPath).metadata();
      assert.equal(thumbnail.format, "webp");
      assert.equal(thumbnail.width, width);
      assert.ok(thumbnail.height > thumbnail.width, `${creator.name} ${width}w thumbnail must be portrait`);
    }
  }
});
