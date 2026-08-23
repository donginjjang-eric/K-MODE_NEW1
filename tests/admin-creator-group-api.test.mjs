import assert from "node:assert/strict";
import test from "node:test";

import {
  adminApiAuthorization,
  handleAgencyUserInvite,
  handleAdminCreatorPatch,
  handleCreatorGroupCreate,
  handleCreatorGroupMembersUpdate,
  handleCreatorGroupUpdate,
} from "../src/lib/admin-creator-group-route-handlers.ts";

function request(body, method = "POST") {
  return new Request("http://localhost/api/admin/creator-groups", {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function dependencies(overrides = {}) {
  return {
    adminId: "admin-1",
    createGroup: async () => "group-new",
    updateGroup: async () => {},
    assignCreators: async () => 2,
    removeCreators: async () => 1,
    inviteAgencyUser: async () => {},
    revalidatePath: () => {},
    ...overrides,
  };
}

test("admin API authorization returns JSON 401 for guests and 403 for non-admin users", async () => {
  for (const [user, status] of [[null, 401], [{ id: "creator-1", role: "creator" }, 403]]) {
    const result = adminApiAuthorization(user);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.response.status, status);
      const body = await result.response.json();
      assert.match(body.error, /[가-힣]/u);
    }
  }
});

test("group mutation handlers reject null, arrays, and malformed payloads before domain calls", async () => {
  for (const body of [null, [], { name: "Group", creatorAccountIds: [] }, { action: "move", creatorAccountIds: ["creator-1"] }]) {
    let calls = 0;
    const response = body && typeof body === "object" && "action" in body
      ? await handleCreatorGroupMembersUpdate(request(body, "PATCH"), "group-1", dependencies({ assignCreators: async () => { calls += 1; return 1; } }))
      : await handleCreatorGroupCreate(request(body), dependencies({ createGroup: async () => { calls += 1; return "should-not-create"; } }));
    assert.equal(response.status, 400);
    assert.equal(calls, 0);
  }
});

test("group mutation handlers map missing and domain-conflict codes to safe Korean JSON", async () => {
  const missing = await handleCreatorGroupUpdate(request({ name: "Renamed" }, "PATCH"), "missing-group", dependencies({
    updateGroup: async () => { const error = new Error("raw database row"); error.code = "GROUP_NOT_FOUND"; throw error; },
  }));
  const conflict = await handleAgencyUserInvite(request({ email: "Agency@Example.com" }), "group-1", dependencies({
    inviteAgencyUser: async () => { const error = new Error("duplicate key value violates unique constraint"); error.code = "AGENCY_EMAIL_DUPLICATE"; throw error; },
  }));

  for (const [response, status] of [[missing, 404], [conflict, 409]]) {
    assert.equal(response.status, status);
    const body = await response.json();
    assert.match(body.error, /[가-힣]/u);
    assert.doesNotMatch(body.error, /raw database|duplicate key|constraint/i);
  }
});

test("successful group mutations return narrow payloads and revalidate admin group routes", async () => {
  const paths = [];
  const create = await handleCreatorGroupCreate(request({ name: "Blue", creatorAccountIds: ["creator-1"] }), dependencies({ revalidatePath: (path) => paths.push(path) }));
  const assign = await handleCreatorGroupMembersUpdate(request({ action: "assign", creatorAccountIds: ["creator-1", "creator-2"] }, "PATCH"), "group-new", dependencies({ revalidatePath: (path) => paths.push(path) }));

  assert.deepEqual(await create.json(), { id: "group-new" });
  assert.deepEqual(await assign.json(), { affectedCount: 2 });
  assert.ok(paths.includes("/dashboard/admin/creators"));
  assert.ok(paths.includes("/dashboard/admin/creator-groups"));
  assert.ok(paths.includes("/dashboard/admin/creator-groups/group-new"));
});

test("creator PATCH updates a DB-imported creator by creatorKey without falling back to the legacy catalogue", async () => {
  let legacyLookupCalls = 0;
  let received;
  const response = await handleAdminCreatorPatch(request({ displayName: "Imported creator", approvalStatus: "pending" }, "PATCH"), "imported-key", {
    adminId: "admin-1",
    getManagedCreator: async () => ({ id: "creator-db-1", creator_key: "imported-key" }),
    getLegacyCreator: async () => { legacyLookupCalls += 1; return null; },
    updateCreatorProfile: async (adminId, creatorKey, input) => { received = { adminId, creatorKey, input }; },
    upsertCreatorLink: async () => { throw new Error("must not link"); },
    revalidatePath: () => {},
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { updated: true });
  assert.equal(legacyLookupCalls, 0);
  assert.deepEqual(received, { adminId: "admin-1", creatorKey: "imported-key", input: { displayName: "Imported creator", approvalStatus: "pending" } });
});

test("creator PATCH preserves normalized email and approved-status linking", async () => {
  let linkInput;
  const response = await handleAdminCreatorPatch(request({ email: " Imported@Example.com ", status: "approved" }, "PATCH"), "imported-key", {
    adminId: "admin-1",
    getManagedCreator: async () => ({ id: "creator-db-1", creator_key: "imported-key", display_name: "Imported", platform: "Instagram", market: "Malaysia", categories: ["Beauty"] }),
    getLegacyCreator: async () => { throw new Error("must not use legacy"); },
    updateCreatorProfile: async () => {},
    upsertCreatorLink: async (input) => { linkInput = input; },
    revalidatePath: () => {},
  });

  assert.equal(response.status, 200);
  assert.deepEqual(linkInput, {
    creatorKey: "imported-key",
    displayName: "Imported",
    googleEmail: "imported@example.com",
    platform: "Instagram",
    market: "Malaysia",
    categories: ["Beauty"],
    approvalStatus: "approved",
  });
});

test("creator PATCH maps the legacy email-link conflict to a safe 409 response", async () => {
  const duplicate = new Error("duplicate key value violates unique constraint");
  const response = await handleAdminCreatorPatch(request({ email: "imported@example.com", status: "approved" }, "PATCH"), "imported-key", {
    adminId: "admin-1",
    getManagedCreator: async () => ({ id: "creator-db-1", creator_key: "imported-key", display_name: "Imported", platform: "Instagram", market: "Malaysia", categories: [] }),
    getLegacyCreator: async () => null,
    updateCreatorProfile: async () => {},
    upsertCreatorLink: async () => { throw duplicate; },
    isEmailConflict: (error) => error === duplicate,
    revalidatePath: () => {},
  });

  assert.equal(response.status, 409);
  const body = await response.json();
  assert.match(body.error, /[가-힣]/u);
  assert.doesNotMatch(body.error, /duplicate key|constraint/i);
});
