import assert from "node:assert/strict";
import test from "node:test";
import {
  isWorkspaceCandidateAllowed,
  partnerWorkspaceType,
  partnerWorkspaceTypes,
} from "../src/lib/workspace-access";
import type { ResolvedWorkspace } from "../src/lib/workspace-access";

function workspace(overrides: Partial<ResolvedWorkspace> = {}): ResolvedWorkspace {
  return {
    id: "membership-1",
    user_id: "user-1",
    workspace_type: "beauty_partner",
    resource_id: "beauty-1",
    status: "active",
    is_default: false,
    created_at: "2026-08-28T00:00:00.000Z",
    updated_at: "2026-08-28T00:00:00.000Z",
    brand_category: "K-뷰티",
    designer_user_id: "user-1",
    ...overrides,
  };
}

test("category maps to an isolated partner workspace", () => {
  assert.equal(partnerWorkspaceType("K-패션"), "fashion_partner");
  assert.equal(partnerWorkspaceType("K-뷰티"), "beauty_partner");
  assert.deepEqual(partnerWorkspaceTypes("복합"), ["fashion_partner", "beauty_partner"]);
  assert.deepEqual(partnerWorkspaceTypes("미분류"), ["fashion_partner"]);
});

test("strict workspace validation rejects another user and inactive membership", () => {
  assert.equal(isWorkspaceCandidateAllowed(workspace(), { userId: "user-1", workspaceType: "beauty_partner" }), true);
  assert.equal(isWorkspaceCandidateAllowed(workspace({ user_id: "user-2" }), { userId: "user-1", workspaceType: "beauty_partner" }), false);
  assert.equal(isWorkspaceCandidateAllowed(workspace({ status: "pending" }), { userId: "user-1", workspaceType: "beauty_partner" }), false);
});

test("strict workspace validation isolates fashion and beauty resources", () => {
  assert.equal(isWorkspaceCandidateAllowed(workspace({ workspace_type: "fashion_partner", brand_category: "K-패션" }), {
    userId: "user-1",
    workspaceType: "beauty_partner",
  }), false);
  assert.equal(isWorkspaceCandidateAllowed(workspace({ brand_category: "K-패션" }), {
    userId: "user-1",
    workspaceType: "beauty_partner",
  }), false);
  assert.equal(isWorkspaceCandidateAllowed(workspace({ designer_user_id: "user-2" }), {
    userId: "user-1",
    workspaceType: "beauty_partner",
  }), false);
  assert.equal(isWorkspaceCandidateAllowed(workspace({ workspace_type: "creator", resource_id: "creator-1", brand_category: null, designer_user_id: null }), {
    userId: "user-1",
    workspaceType: "creator",
  }), true);
});
