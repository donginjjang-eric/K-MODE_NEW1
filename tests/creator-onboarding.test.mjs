import assert from "node:assert/strict";
import test from "node:test";

import { creatorOnboardingDestination, designerApplicationRoleGuard, handleCreatorApplication } from "../src/lib/creator-onboarding.ts";

const sessionUser = {
  id: "user-1",
  email: "new.creator@example.com",
  role: "designer",
  created_at: "2026-08-24T00:00:00.000Z",
  updated_at: "2026-08-24T00:00:00.000Z",
};

function request(body) {
  return new Request("https://k-modu.co.kr/api/creator/applications", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("creator application requires an authenticated account", async () => {
  const response = await handleCreatorApplication(request({}), {
    getCurrentUser: async () => null,
    getCreatorAccountForUser: async () => null,
    createCreatorApplication: async () => { throw new Error("must not run"); },
  });

  assert.equal(response.status, 401);
});

test("creator application validates profile and at least one SNS URL", async () => {
  const response = await handleCreatorApplication(request({
    displayName: "Syamimi",
    market: "Malaysia",
    category: "Beauty",
    instagramUrl: "",
    tiktokUrl: "",
  }), {
    getCurrentUser: async () => sessionUser,
    getCreatorAccountForUser: async () => null,
    createCreatorApplication: async () => { throw new Error("must not run"); },
  });

  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /SNS/);
});

test("creator application creates a pending self-registered creator linked to the Google user", async () => {
  let received;
  const response = await handleCreatorApplication(request({
    displayName: " Syamimi ",
    market: " Malaysia ",
    category: "Beauty",
    instagramUrl: "https://www.instagram.com/syamimifzain/",
    tiktokUrl: "",
    bio: " Beauty creator ",
  }), {
    getCurrentUser: async () => sessionUser,
    getCreatorAccountForUser: async () => null,
    createCreatorApplication: async (input) => {
      received = input;
      return { id: "creator-1", approval_status: "pending" };
    },
  });

  assert.equal(response.status, 201);
  assert.deepEqual(received, {
    userId: "user-1",
    email: "new.creator@example.com",
    displayName: "Syamimi",
    market: "Malaysia",
    category: "Beauty",
    instagramUrl: "https://www.instagram.com/syamimifzain/",
    tiktokUrl: "",
    bio: "Beauty creator",
  });
  assert.deepEqual(await response.json(), { ok: true, creator: { id: "creator-1", approval_status: "pending" } });
});

test("creator application cannot replace an existing creator account", async () => {
  const response = await handleCreatorApplication(request({
    displayName: "Syamimi",
    market: "Malaysia",
    category: "Beauty",
    instagramUrl: "https://www.instagram.com/syamimifzain/",
  }), {
    getCurrentUser: async () => sessionUser,
    getCreatorAccountForUser: async () => ({ id: "existing", approval_status: "pending" }),
    createCreatorApplication: async () => { throw new Error("must not run"); },
  });

  assert.equal(response.status, 409);
});

test("new and pending creator accounts receive distinct onboarding destinations", () => {
  assert.equal(creatorOnboardingDestination(null), "/login?notice=choose_role");
  assert.equal(creatorOnboardingDestination({ approval_status: "pending" }), "/login?notice=creator_approval_pending");
  assert.equal(creatorOnboardingDestination({ approval_status: "disabled" }), "/login?notice=creator_disabled");
});

test("a creator application prevents the same account from applying as a designer", async () => {
  const conflict = await designerApplicationRoleGuard("user-1", async () => ({ id: "creator-1", approval_status: "pending" }));
  assert.equal(conflict?.status, 409);
  assert.match((await conflict.json()).error, /크리에이터/);
  assert.equal(await designerApplicationRoleGuard("user-2", async () => null), null);
});
