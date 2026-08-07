import test from "node:test";
import assert from "node:assert/strict";
import { handleAdminCampaignCreate, handleAdminCampaignUpdate } from "../src/lib/admin-campaign-route-handlers.js";

function malformedRequest(body) {
  return new Request("http://localhost/api/admin/campaigns", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("POST malformed payload returns 400 without creating a campaign", async () => {
  let calls = 0;
  const response = await handleAdminCampaignCreate(malformedRequest({ title: 42 }), {
    adminId: "admin-1",
    createAdminCampaign: async () => { calls += 1; throw new Error("must not run"); },
    revalidatePath: () => {},
  });

  assert.equal(response.status, 400);
  assert.equal(calls, 0);
});

test("PATCH malformed payload returns 400 without updating a campaign", async () => {
  let calls = 0;
  const response = await handleAdminCampaignUpdate(malformedRequest({ slots: "five" }), "campaign-1", {
    adminId: "admin-1",
    updateAdminCampaign: async () => { calls += 1; throw new Error("must not run"); },
    revalidatePath: () => {},
  });

  assert.equal(response.status, 400);
  assert.equal(calls, 0);
});
