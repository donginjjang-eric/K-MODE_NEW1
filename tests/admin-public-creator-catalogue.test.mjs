import assert from "node:assert/strict";
import test from "node:test";

import { getCreatorAccountsForAdmin } from "../src/lib/db.ts";
import { isOperationalCreatorKey } from "../src/lib/creator-management.ts";

test("admin catalogue includes every public runtime creator with thumbnail and follower facts", async () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;

  try {
    const creators = await getCreatorAccountsForAdmin();

    assert.equal(creators.length, 73);
    assert.equal(new Set(creators.map((creator) => creator.creator_key)).size, 73);

    const vietnam = creators.find((creator) => creator.creator_key === "@rosermae");
    assert.equal(vietnam?.profile_image_url, "assets/influencer-sourcing/cards/vietnam-beauty/rosermae.webp");
    assert.equal(vietnam?.tiktok_followers, 1_300_000);

    const seeding = creators.find((creator) => creator.display_name === "Nora Lunia");
    assert.equal(seeding?.profile_image_url, "assets/influencer-sourcing/cards/verified/nora-lunia-verified.webp");
    assert.equal(seeding?.tiktok_followers, 332_500);
  } finally {
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
  }
});

test("admin management excludes preview identities from real creator operations", () => {
  assert.equal(isOperationalCreatorKey("syamimi"), true);
  assert.equal(isOperationalCreatorKey("test-creator"), false);
  assert.equal(isOperationalCreatorKey("admin-operator-admin-id"), false);
});
