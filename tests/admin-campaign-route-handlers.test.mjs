import test from "node:test";
import assert from "node:assert/strict";
import { handleAdminCampaignCreate, handleAdminCampaignUpdate } from "../src/lib/admin-campaign-route-handlers.js";

const validCampaign = {
  title: "Summer launch",
  category: "beauty",
  markets: ["KR"],
  platforms: ["Instagram"],
  brief: "Create one short-form campaign video.",
  reward_text: "KRW 500,000",
  application_deadline: "2026-09-01T00:00:00.000Z",
  content_deadline: "2026-09-15T00:00:00.000Z",
  slots: 3,
  image_urls: [],
};

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

test("POST requires both deadlines and rejects reversed deadlines before creating", async () => {
  for (const body of [
    { ...validCampaign, application_deadline: undefined },
    { ...validCampaign, content_deadline: undefined },
    { ...validCampaign, application_deadline: validCampaign.content_deadline, content_deadline: validCampaign.application_deadline },
  ]) {
    let calls = 0;
    const response = await handleAdminCampaignCreate(malformedRequest(body), {
      adminId: "admin-1",
      createAdminCampaign: async () => { calls += 1; return { id: "campaign-1" }; },
      revalidatePath: () => {},
    });

    assert.equal(response.status, 400);
    assert.equal(calls, 0);
  }
});

test("PATCH rejects a reversed deadline pair before updating", async () => {
  let calls = 0;
  const response = await handleAdminCampaignUpdate(malformedRequest({
    application_deadline: validCampaign.content_deadline,
    content_deadline: validCampaign.application_deadline,
  }), "campaign-1", {
    adminId: "admin-1",
    updateAdminCampaign: async () => { calls += 1; return { id: "campaign-1" }; },
    revalidatePath: () => {},
  });

  assert.equal(response.status, 400);
  assert.equal(calls, 0);
});

test("POST and PATCH return a clear reward-format error before persistence", async () => {
  for (const operation of ["create", "update"]) {
    const dependencies = {
      adminId: "admin-1",
      createAdminCampaign: async () => { throw new Error("Campaign reward must use a supported currency code followed by a whole-number amount, for example RM 420 or VND 2,500,000."); },
      updateAdminCampaign: async () => { throw new Error("Campaign reward must use a supported currency code followed by a whole-number amount, for example RM 420 or VND 2,500,000."); },
      revalidatePath: () => {},
    };
    const response = operation === "create"
      ? await handleAdminCampaignCreate(malformedRequest({ ...validCampaign, reward_text: "420 RM" }), dependencies)
      : await handleAdminCampaignUpdate(malformedRequest({ reward_text: "420 RM" }), "campaign-1", dependencies);
    const body = await response.json();
    assert.equal(response.status, 400);
    assert.equal(body.code, "invalid_reward");
    assert.match(body.error, /RM 420/);
  }
});

test("an immutable campaign update maps to a stable Korean conflict response", async () => {
  const rawError = "Only draft or recruiting campaigns can be edited.";
  const response = await handleAdminCampaignUpdate(malformedRequest({ title: "Updated title" }), "campaign-1", {
    adminId: "admin-1",
    updateAdminCampaign: async () => { throw new Error(rawError); },
    revalidatePath: () => {},
  });
  const body = await response.json();

  assert.equal(response.status, 409);
  assert.equal(body.code, "invalid_state");
  assert.match(body.error, /[가-힣]/u);
  assert.doesNotMatch(body.error, /Only draft|recruiting campaigns/i);
});
