import assert from "node:assert/strict";
import test from "node:test";
import {
  ADMIN_PAGE_SIZE,
  adminPageMeta,
  isCreatorApprovalApplication,
  paginateAdminItems,
} from "../src/lib/admin-list-utils";

test("admin lists paginate in fixed groups of twenty and clamp stale pages", () => {
  const items = Array.from({ length: 45 }, (_, index) => index + 1);

  assert.equal(ADMIN_PAGE_SIZE, 20);
  assert.deepEqual(paginateAdminItems(items, 1), items.slice(0, 20));
  assert.deepEqual(paginateAdminItems(items, 2), items.slice(20, 40));
  assert.deepEqual(paginateAdminItems(items, 9), items.slice(40, 45));
});

test("admin page metadata reports total, visible range, and numbered controls", () => {
  assert.deepEqual(adminPageMeta(45, 2), {
    currentPage: 2,
    totalPages: 3,
    start: 21,
    end: 40,
    pages: [1, 2, 3],
  });
  assert.deepEqual(adminPageMeta(0, 3), {
    currentPage: 1,
    totalPages: 1,
    start: 0,
    end: 0,
    pages: [1],
  });
});

test("only account-linked self registrations enter the creator approval queue", () => {
  assert.equal(isCreatorApprovalApplication({ onboarding_source: "self_registered", user_id: "user-1", approval_status: "pending" }), true);
  assert.equal(isCreatorApprovalApplication({ onboarding_source: "admin", user_id: null, approval_status: "pending" }), false);
  assert.equal(isCreatorApprovalApplication({ onboarding_source: "self_registered", user_id: null, approval_status: "pending" }), false);
  assert.equal(isCreatorApprovalApplication({ onboarding_source: "self_registered", user_id: "user-1", approval_status: "approved" }), false);
});
