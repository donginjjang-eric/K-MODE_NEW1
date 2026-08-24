import assert from "node:assert/strict";
import test from "node:test";

import { isMasterAdminEmail, masterRoleDestinations } from "../src/lib/master-admin.ts";

test("the designated owner account is recognized as master admin", () => {
  assert.equal(isMasterAdminEmail("DONGINJJANG@gmail.com"), true);
  assert.equal(isMasterAdminEmail("clarako298@gmail.com"), true);
  assert.equal(isMasterAdminEmail("DONGINJJANG@gmail.com", "existing.admin@example.com"), true);
  assert.equal(isMasterAdminEmail("existing.admin@example.com", "existing.admin@example.com"), true);
  assert.equal(isMasterAdminEmail("other@example.com"), false);
});

test("master admin can switch among all three service surfaces", () => {
  assert.deepEqual(masterRoleDestinations, [
    { key: "admin", label: "관리자", href: "/dashboard/admin" },
    { key: "creator", label: "크리에이터", href: "/dashboard/creator" },
    { key: "designer", label: "디자이너", href: "/dashboard/designer/brand" },
  ]);
});
