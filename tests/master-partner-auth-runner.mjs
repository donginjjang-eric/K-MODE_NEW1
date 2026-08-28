import assert from "node:assert/strict";
import { mock, test } from "node:test";

let sessionToken = null;
let memberships = [];
let provisionCalls = 0;
let backfillCalls = 0;

await mock.module("next/headers", { namedExports: {
  cookies: async () => ({ get: (name) => name === "kmodu_session" && sessionToken ? { value: sessionToken } : undefined }),
} });
await mock.module("next/navigation", { namedExports: {
  redirect: (location) => { const error = new Error(`REDIRECT:${location}`); error.location = location; throw error; },
} });
await mock.module("../src/lib/creator-management.ts", { namedExports: {
  hasActiveAgencyGroupRelationship: async () => false,
} });
await mock.module("../src/lib/db.ts", { namedExports: {
  ensureMasterAdminRole: async () => null,
  ensureMasterPartnerWorkspace: async ({ userId, workspaceType }) => {
    provisionCalls += 1;
    const membership = {
      id: `provisioned-${workspaceType}`, user_id: userId, workspace_type: workspaceType,
      resource_id: `designer-${workspaceType}`, status: "active", is_default: false,
      created_at: "2026-08-28T00:00:00Z", updated_at: "2026-08-28T00:00:00Z",
      brand_category: workspaceType === "beauty_partner" ? "K-뷰티" : "K-패션", designer_user_id: userId,
    };
    memberships = [...memberships, membership];
    return membership;
  },
  getCreatorAccountForUser: async () => null,
  getDesignerForUser: async () => null,
  getDesignerForUserAndId: async () => null,
  getOrCreateAdminCreatorAccount: async () => null,
  getOrCreateAdminDesignerAccount: async () => null,
  getUserByEmail: async () => null,
  hasDatabase: () => true,
} });
await mock.module("../src/lib/workspace-access.ts", { namedExports: {
  backfillUserWorkspaceMemberships: async () => { backfillCalls += 1; },
  listUserWorkspaces: async () => memberships,
  resolveUserWorkspace: async ({ userId, workspaceType, membershipId }) => memberships.find((item) => item.user_id === userId && item.workspace_type === workspaceType && item.id === membershipId) || null,
} });

const { createSessionToken, requireWorkspace } = await import("../src/lib/auth.ts");

test("master auth provisions and resolves a missing beauty workspace", async () => {
  memberships = [{
    id: "admin-membership", user_id: "master-1", workspace_type: "admin", resource_id: null,
    status: "active", is_default: true, created_at: "2026-08-28T00:00:00Z", updated_at: "2026-08-28T00:00:00Z",
    brand_category: null, designer_user_id: null,
  }];
  provisionCalls = 0;
  backfillCalls = 0;
  sessionToken = createSessionToken({ id: "master-1", email: "donginjjang@gmail.com", role: "admin" });
  const result = await requireWorkspace("beauty_partner");
  assert.equal(result.workspace?.resource_id, "designer-beauty_partner");
  assert.equal(provisionCalls, 1);
});

test("ordinary auth never provisions a missing partner workspace", async () => {
  memberships = [];
  provisionCalls = 0;
  backfillCalls = 0;
  sessionToken = createSessionToken({ id: "user-1", email: "user@example.com", role: "creator" });
  await assert.rejects(requireWorkspace("beauty_partner"), /REDIRECT:\/dashboard\/workspaces/);
  assert.equal(provisionCalls, 0);
  assert.equal(backfillCalls, 1);
});
