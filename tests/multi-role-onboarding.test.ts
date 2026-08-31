import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import {
  createPartnerApplication,
  designerApplicationRoleGuard,
  validatePartnerApplicationInput,
} from "../src/lib/creator-onboarding";
import { validateAdminWorkspaceAction, validateWorkspaceRouteId } from "../src/lib/admin-workspace-input";

test("existing approved creator may apply for a beauty partner workspace", async () => {
  assert.equal(
    await designerApplicationRoleGuard("u1", async () => ({ id: "creator-1", approval_status: "approved" })),
    null,
  );
});

test("approved creator login card keeps creator center and exposes brand partner application", async () => {
  const source = await readFile(new URL("../src/components/LoginForm.tsx", import.meta.url), "utf8");
  const approvedCreatorBranch = source.match(/: isCreator \? \(([\s\S]*?)\) : isCreatorPending \?/)?.[1] || "";
  assert.match(approvedCreatorBranch, /href="\/dashboard\/creator"/);
  assert.match(approvedCreatorBranch, /href="\/apply"/);
  assert.match(approvedCreatorBranch, /뷰티·패션 브랜드/);
});

test("brand application creates its designer and immediately active beauty membership in one transaction callback", async () => {
  const statements: Array<{ text: string; params: unknown[] }> = [];
  const client = {
    async query(text: string, params: unknown[] = []) {
      statements.push({ text, params });
      if (text.includes("INSERT INTO designers")) {
        return { rows: [{ id: "beauty-1", approval_status: "pending", brand_category: "K-뷰티" }] };
      }
      return { rows: [], rowCount: 1 };
    },
  };

  const result = await createPartnerApplication(client as never, {
    userId: "u1",
    brandName: "Glow Lab",
    designerName: "Kim",
    contactEmail: "creator@example.com",
    contactPhone: "010-0000-0000",
    description: "Beauty brand",
    category: "K-뷰티",
  });

  assert.equal(result.designer.id, "beauty-1");
  const membership = statements.find(({ text }) => text.includes("INSERT INTO user_workspace_memberships"));
  assert.deepEqual(membership?.params.slice(0, 4), ["u1", "beauty_partner", "beauty-1", "active"]);
  assert.ok(statements.some(({ text, params }) => text.includes("creator_management_audit_logs") && params.includes("partner_application_created")));
});

test("hybrid brand application creates both pending partner memberships", async () => {
  const statements: Array<{ text: string; params: unknown[] }> = [];
  const client = {
    async query(text: string, params: unknown[] = []) {
      statements.push({ text, params });
      return text.includes("INSERT INTO designers")
        ? { rows: [{ id: "hybrid-1", approval_status: "pending", brand_category: "복합" }] }
        : { rows: [], rowCount: 1 };
    },
  };

  await createPartnerApplication(client as never, {
    userId: "u1", brandName: "Both", designerName: "Kim", contactEmail: "a@b.com",
    contactPhone: "010", description: "Both", category: "복합",
  });

  const membershipTypes = statements
    .filter(({ text }) => text.includes("INSERT INTO user_workspace_memberships"))
    .map(({ params }) => params[1]);
  assert.deepEqual(membershipTypes, ["fashion_partner", "beauty_partner"]);
});

test("admin workspace input rejects non-string ids and malformed brand data", () => {
  assert.equal(validateWorkspaceRouteId({}), null);
  assert.equal(validateWorkspaceRouteId("../other"), null);
  assert.equal(validateAdminWorkspaceAction({ action: "approve", membershipId: 7 }).ok, false);
  assert.equal(validateAdminWorkspaceAction({ action: "create_beauty_partner", brandName: "A", contactEmail: "x@y" }).ok, false);
  assert.equal(validateAdminWorkspaceAction({ action: "create_beauty_partner", brandName: "Glow Lab", contactEmail: "hello@example.com" }).ok, true);
});

test("partner application validates every string, email and realistic lengths", () => {
  assert.equal(validatePartnerApplicationInput({ brand: {}, designer: "Kim", email: "a@b.com", phone: "010", headline: "intro", category: "K-뷰티" }).ok, false);
  assert.equal(validatePartnerApplicationInput({ brand: "A".repeat(121), designer: "Kim", email: "a@b.com", phone: "010", headline: "intro", category: "K-뷰티" }).ok, false);
  assert.equal(validatePartnerApplicationInput({ brand: "Glow", designer: "Kim", email: "bad@x", phone: "010", headline: "intro", category: "K-뷰티" }).ok, false);
  assert.equal(validatePartnerApplicationInput({ brand: "Glow", designer: "Kim", email: "hello@example.com", phone: "010-1234-5678", headline: "intro", category: "K-뷰티" }).ok, true);
});
