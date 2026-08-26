import test from "node:test";
import assert from "node:assert/strict";
import { adminUserPresentation, adminUserQuickApproval, formatAdminJoinDate } from "../src/lib/admin-user-presentation";

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

test("pending memberships expose the correct inline approval request", () => {
  assert.deepEqual(adminUserQuickApproval({
    role: "creator",
    creator_id: "creator-2",
    creator_key: "self-user-2",
    creator_name: "pending creator",
    creator_approval_status: "pending",
    designer_id: null,
    brand_name: null,
    designer_approval_status: null,
  }), {
    kind: "creator",
    approveUrl: "/api/admin/creators/self-user-2",
    approveMethod: "PATCH",
    approveBody: { approvalStatus: "approved" },
  });

  assert.deepEqual(adminUserQuickApproval({
    role: "designer",
    creator_id: null,
    creator_key: null,
    creator_name: null,
    creator_approval_status: null,
    designer_id: "designer-7",
    brand_name: "Beauty Lab",
    designer_approval_status: "pending",
  }), {
    kind: "designer",
    approveUrl: "/api/admin/designers/designer-7/approve",
    approveMethod: "POST",
  });
});

test("a pending designer remains directly approvable when the same user already has an approved creator profile", () => {
  assert.equal(adminUserQuickApproval({
    role: "creator",
    creator_id: "creator-8",
    creator_key: "self-user-8",
    creator_name: "approved creator",
    creator_approval_status: "approved",
    designer_id: "designer-8",
    brand_name: "Pending Beauty Brand",
    designer_approval_status: "pending",
  })?.kind, "designer");
});

test("approved and account-only users do not expose quick approval", () => {
  assert.equal(adminUserQuickApproval({
    role: "creator",
    creator_id: "creator-3",
    creator_key: "self-user-3",
    creator_name: "approved creator",
    creator_approval_status: "approved",
    designer_id: null,
    brand_name: null,
    designer_approval_status: null,
  }), null);
  assert.equal(adminUserQuickApproval({
    role: "designer",
    creator_id: null,
    creator_key: null,
    creator_name: null,
    creator_approval_status: null,
    designer_id: null,
    brand_name: null,
    designer_approval_status: null,
  }), null);
});

test("join dates use a fixed Korea timezone across server and browser rendering", () => {
  assert.equal(formatAdminJoinDate("2026-08-25T16:10:00.000Z"), "2026.08.26");
  assert.equal(formatAdminJoinDate("invalid"), "-");
});
