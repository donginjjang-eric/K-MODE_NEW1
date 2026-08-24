import test from "node:test";
import assert from "node:assert/strict";
import { adminUserPresentation } from "../src/lib/admin-user-presentation";

test("linked creator application overrides the legacy designer default role", () => {
  assert.deepEqual(adminUserPresentation({
    role: "designer",
    creator_id: "creator-1",
    creator_key: "self-user-1",
    creator_name: "test creator",
    creator_approval_status: "approved",
    designer_id: null,
    brand_name: null,
    designer_approval_status: null,
  }), {
    roleLabel: "크리에이터",
    segment: "creator_approved",
    profileLabel: "test creator",
    status: "approved",
    statusLabel: "승인 완료",
    href: "/dashboard/admin/creators/self-user-1",
  });
});

test("pending creator application remains distinct from designer approval", () => {
  const result = adminUserPresentation({
    role: "designer",
    creator_id: "creator-2",
    creator_key: "self-user-2",
    creator_name: "pending creator",
    creator_approval_status: "pending",
    designer_id: null,
    brand_name: null,
    designer_approval_status: null,
  });

  assert.equal(result.roleLabel, "크리에이터");
  assert.equal(result.segment, "creator_pending");
  assert.equal(result.statusLabel, "승인 대기");
});
