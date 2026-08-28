import assert from "node:assert/strict";
import test from "node:test";
import { authorizePartnerResource } from "../src/lib/partner-workspace-access.ts";

test("beauty mutation rejects a product owned by the selected fashion designer", () => {
  const result = authorizePartnerResource({
    workspaceType: "beauty_partner",
    workspaceResourceId: "beauty-1",
    resourceDesignerId: "fashion-1",
  });
  assert.deepEqual(result, { ok: false, status: 404 });
});

test("beauty mutation accepts a product owned by the selected beauty designer", () => {
  const result = authorizePartnerResource({
    workspaceType: "beauty_partner",
    workspaceResourceId: "beauty-1",
    resourceDesignerId: "beauty-1",
  });
  assert.deepEqual(result, { ok: true, designerId: "beauty-1" });
});

test("partner resource authorization rejects missing selected workspace ownership", () => {
  const result = authorizePartnerResource({
    workspaceType: "fashion_partner",
    workspaceResourceId: null,
    resourceDesignerId: "fashion-1",
  });
  assert.deepEqual(result, { ok: false, status: 403 });
});
