import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { invalidCampaignInputResponse, parseAdminCampaignCreateInput, parseAdminCampaignPatchInput } from "../src/lib/admin-campaign-input.js";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("campaign list renders domain-provided application and matched counts instead of hard-coded zeroes", async () => {
  const [list, domain] = await Promise.all([
    source("../src/components/AdminCampaignList.tsx"),
    source("../src/lib/creator-campaigns.ts"),
  ]);

  assert.match(list, /campaign\.application_count/);
  assert.match(list, /campaign\.matched_count/);
  assert.doesNotMatch(list, /<td>0<\/td><td>0<\/td>/);
  assert.match(domain, /p\.source = 'application'/);
  assert.match(domain, /MATCHED_PARTICIPATION_STATUSES/);
  assert.match(domain, /p\.status = ANY\(\$\d+::text\[\]\)/);
});

test("malformed campaign JSON is rejected with 400 before a domain mutation", async () => {
  const validShape = {
    title: "Campaign",
    category: "Beauty",
    markets: ["KR"],
    platforms: ["Instagram"],
    brief: "Brief",
    reward_text: "Reward",
    slots: 5,
  };

  assert.equal(parseAdminCampaignCreateInput({ ...validShape, title: { invalid: true } }), null);
  assert.equal(parseAdminCampaignPatchInput({ slots: "five" }), null);
  assert.equal(parseAdminCampaignPatchInput({ unknown: "field" }), null);

  const response = invalidCampaignInputResponse();
  assert.equal(response.status, 400);
  assert.match(await response.text(), /error/);
});
