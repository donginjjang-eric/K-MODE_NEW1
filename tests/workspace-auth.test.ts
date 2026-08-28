import assert from "node:assert/strict";
import test from "node:test";

import { authorizeWorkspace } from "../src/lib/workspace-selection";
import type { ResolvedWorkspace } from "../src/lib/workspace-access";

const activeBeauty: ResolvedWorkspace = {
  id: "membership-beauty",
  user_id: "u1",
  workspace_type: "beauty_partner",
  resource_id: "beauty-1",
  status: "active",
  is_default: false,
  created_at: "2026-08-28T00:00:00.000Z",
  updated_at: "2026-08-28T00:00:00.000Z",
  brand_category: "K-뷰티",
  designer_user_id: "u1",
};

const activeFashion: ResolvedWorkspace = {
  ...activeBeauty,
  id: "membership-fashion",
  workspace_type: "fashion_partner",
  resource_id: "fashion-1",
  brand_category: "K-패션",
};

test("creator user may enter an approved beauty workspace without changing primary role", () => {
  const result = authorizeWorkspace({
    user: { id: "u1", role: "creator" },
    requestedType: "beauty_partner",
    membership: activeBeauty,
  });

  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.workspace.resource_id, "beauty-1");
});

test("fashion membership cannot authorize beauty center", () => {
  const result = authorizeWorkspace({
    user: { id: "u1", role: "designer" },
    requestedType: "beauty_partner",
    membership: activeFashion,
  });

  assert.equal(result.ok, false);
});

test("inactive or another user's membership cannot authorize a workspace", () => {
  assert.equal(authorizeWorkspace({
    user: { id: "u1", role: "creator" },
    requestedType: "beauty_partner",
    membership: { ...activeBeauty, status: "pending" },
  }).ok, false);

  assert.equal(authorizeWorkspace({
    user: { id: "u2", role: "creator" },
    requestedType: "beauty_partner",
    membership: activeBeauty,
  }).ok, false);
});

