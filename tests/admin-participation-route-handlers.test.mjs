import test from "node:test";
import assert from "node:assert/strict";
import { handleAdminParticipationMutation } from "../src/lib/admin-participation-route-handlers.js";

function request(body) {
  return new Request("http://localhost/api/admin/participations/participation-1", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function dependencies(overrides = {}) {
  return {
    adminId: "admin-1",
    transitionParticipationAsAdmin: async () => ({ id: "participation-1", campaign_id: "campaign-1", status: "matched" }),
    revalidatePath: () => {},
    ...overrides,
  };
}

test("invalid participation payload returns 400 without mutating or revalidating", async () => {
  let mutations = 0;
  let revalidations = 0;
  const response = await handleAdminParticipationMutation(request({ action: "unknown" }), "participation-1", dependencies({
    transitionParticipationAsAdmin: async () => { mutations += 1; throw new Error("must not run"); },
    revalidatePath: () => { revalidations += 1; },
  }));

  assert.equal(response.status, 400);
  assert.equal(mutations, 0);
  assert.equal(revalidations, 0);
});

test("not-found and illegal-state mutations map to 404 and 409 without revalidation", async () => {
  for (const [message, expectedStatus] of [["Campaign participation was not found.", 404], ["Cannot transition participation from completed to matched.", 409]]) {
    let revalidations = 0;
    const response = await handleAdminParticipationMutation(request({ action: "matched" }), "participation-1", dependencies({
      transitionParticipationAsAdmin: async () => { throw new Error(message); },
      revalidatePath: () => { revalidations += 1; },
    }));

    assert.equal(response.status, expectedStatus);
    assert.equal(revalidations, 0);
  }
});

test("successful participation mutation revalidates admin and all affected creator routes", async () => {
  const paths = [];
  const response = await handleAdminParticipationMutation(request({ action: "matched", note: "Approved" }), "participation-1", dependencies({
    revalidatePath: (path) => paths.push(path),
  }));

  assert.equal(response.status, 200);
  assert.deepEqual(paths, [
    "/dashboard/admin/campaigns",
    "/dashboard/admin/campaigns/campaign-1",
    "/dashboard/creator",
    "/dashboard/creator/campaigns",
    "/dashboard/creator/my-campaigns",
    "/dashboard/creator/my-campaigns/participation-1",
    "/dashboard/creator/settlement",
    "/dashboard/creator/submissions",
  ]);
});
