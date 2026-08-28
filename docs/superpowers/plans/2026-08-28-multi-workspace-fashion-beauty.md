# K-MODU 패션·뷰티 다중 작업공간 구현계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 한 계정이 기존 크리에이터 권한을 유지한 채 패션·뷰티 브랜드 작업공간을 독립적으로 보유하고, 관리자가 승인한 뒤 해당 센터에서 상품을 등록·노출할 수 있게 한다.

**Architecture:** `users.role`은 기본 시작 화면 호환용으로 유지하고 `user_workspace_memberships`를 실제 권한 원장으로 추가한다. 센터 선택은 검증된 멤버십 ID를 HttpOnly 쿠키에 저장하되, 모든 페이지와 API가 사용자·작업공간 종류·브랜드 카테고리·승인 상태를 다시 검증한다. 기존 `designer_id` 소유권을 유지해 상품·캠페인·정산 데이터를 브랜드별로 격리한다.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, PostgreSQL, Node test runner, tsx

**Spec:** `docs/superpowers/specs/2026-08-28-multi-workspace-fashion-beauty-design.md`

## Global Constraints

- 기존 패션 디자이너 스튜디오와 크리에이터 센터의 데이터와 URL을 보존한다.
- 패션 브랜드와 뷰티 브랜드의 상품·캠페인·콘텐츠·거래·정산은 `designer_id` 기준으로 격리한다.
- 일반 계정에는 보유하고 승인된 작업공간만 표시한다.
- 승인 대기 또는 비활성 작업공간은 다른 작업공간 이용을 막지 않는다.
- 모든 API는 클라이언트가 보낸 작업공간 ID를 신뢰하지 않고 서버에서 멤버십과 리소스 소유권을 재검증한다.
- 마이그레이션은 멱등적이며 실패 시 트랜잭션 전체를 롤백한다.
- `studioooat@gmail.com`의 기존 크리에이터 연결은 보존한다.
- 기존 사용자 변경 파일인 `next.config.mjs`와 관련 없는 미추적 파일은 수정하거나 커밋하지 않는다.

---

### Task 1: 작업공간 스키마와 권한 도메인

**Files:**
- Modify: `db/schema.sql`
- Create: `src/lib/workspace-access.ts`
- Modify: `src/lib/types.ts`
- Test: `tests/workspace-schema.test.mjs`
- Test: `tests/workspace-access-domain.test.ts`

**Interfaces:**
- Produces: `WorkspaceType`, `WorkspaceStatus`, `UserWorkspaceMembership`
- Produces: `listUserWorkspaces(userId)`, `resolveUserWorkspace(input)`, `backfillWorkspaceMemberships()`
- Consumes: `query`, `one`, `withDatabaseTransaction` from `src/lib/db.ts`

- [ ] **Step 1: Write failing schema and domain tests**

```ts
test("workspace schema supports independent creator fashion beauty and admin memberships", async () => {
  const schema = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");
  assert.match(schema, /CREATE TABLE IF NOT EXISTS user_workspace_memberships/);
  assert.match(schema, /workspace_type IN \('admin', 'creator', 'fashion_partner', 'beauty_partner', 'agency'\)/);
  assert.match(schema, /UNIQUE NULLS NOT DISTINCT \(user_id, workspace_type, resource_id\)/);
});
```

```ts
test("category maps to an isolated partner workspace", () => {
  assert.equal(partnerWorkspaceType("K-패션"), "fashion_partner");
  assert.equal(partnerWorkspaceType("K-뷰티"), "beauty_partner");
  assert.deepEqual(partnerWorkspaceTypes("복합"), ["fashion_partner", "beauty_partner"]);
});
```

- [ ] **Step 2: Run tests and confirm RED**

Run: `node --test tests/workspace-schema.test.mjs && npx tsx --test tests/workspace-access-domain.test.ts`

Expected: FAIL because the table and workspace domain do not exist.

- [ ] **Step 3: Add the membership schema and types**

```sql
CREATE TABLE IF NOT EXISTS user_workspace_memberships (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_type text NOT NULL CHECK (workspace_type IN ('admin', 'creator', 'fashion_partner', 'beauty_partner', 'agency')),
  resource_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'disabled', 'rejected')),
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (user_id, workspace_type, resource_id)
);
```

Add indexes for `(user_id, status)` and `(workspace_type, resource_id)`. Backfill admin, creator, designer and agency links with `INSERT ... ON CONFLICT ... DO UPDATE`; map `복합` to both partner types.

- [ ] **Step 4: Implement workspace queries and strict resolver**

```ts
export async function resolveUserWorkspace(input: {
  userId: string;
  workspaceType: WorkspaceType;
  membershipId?: string | null;
  requireActive?: boolean;
}): Promise<ResolvedWorkspace | null>;
```

The resolver must join `designers` for partner workspaces, reject mismatched categories, and never return another user's membership.

- [ ] **Step 5: Run tests and confirm GREEN**

Run: `node --test tests/workspace-schema.test.mjs && npx tsx --test tests/workspace-access-domain.test.ts`

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add db/schema.sql src/lib/workspace-access.ts src/lib/types.ts tests/workspace-schema.test.mjs tests/workspace-access-domain.test.ts
git commit -m "feat: add account workspace permissions"
```

### Task 2: 인증·센터 선택·기존 계정 이관

**Files:**
- Modify: `src/lib/auth.ts`
- Modify: `src/lib/db.ts`
- Create: `src/lib/workspace-selection.ts`
- Create: `src/app/api/workspaces/select/route.ts`
- Create: `src/app/dashboard/workspaces/page.tsx`
- Modify: `src/app/api/auth/google/callback/route.ts`
- Modify: `src/app/api/auth/login/route.ts`
- Test: `tests/workspace-auth.test.ts`
- Test: `tests/workspace-selection-route.test.mjs`

**Interfaces:**
- Consumes: `resolveUserWorkspace`, `listUserWorkspaces`
- Produces: `requireWorkspace(type)`, `requireFashionPartner()`, `requireBeautyPartner()`
- Produces: `workspaceCookieName = "kmodu_workspace"`, `workspaceSelectionUrl(id, next)`

- [ ] **Step 1: Write failing auth tests**

```ts
test("creator user may enter an approved beauty workspace without changing primary role", async () => {
  const result = await authorizeWorkspace({ user: { id: "u1", role: "creator" }, requestedType: "beauty_partner", membership: activeBeauty });
  assert.equal(result.ok, true);
  assert.equal(result.workspace.resourceId, "beauty-1");
});
```

```ts
test("fashion membership cannot authorize beauty center", async () => {
  const result = await authorizeWorkspace({ user: { id: "u1", role: "designer" }, requestedType: "beauty_partner", membership: activeFashion });
  assert.equal(result.ok, false);
});
```

- [ ] **Step 2: Run tests and confirm RED**

Run: `npx tsx --test tests/workspace-auth.test.ts && node --test tests/workspace-selection-route.test.mjs`

Expected: FAIL because capability-based authorization and selector route are missing.

- [ ] **Step 3: Implement the selector and HttpOnly cookie**

`POST /api/workspaces/select` accepts `{ membershipId, next }`, resolves the membership against the current user, writes a `httpOnly`, `sameSite=lax`, `secure` production cookie, and returns only a validated internal redirect.

```ts
export function safeWorkspaceNext(value: unknown, workspaceType: WorkspaceType): string;
```

- [ ] **Step 4: Replace role-only partner authorization**

`requireFashionPartner` and `requireBeautyPartner` must resolve the selected active membership and return `{ user, designer, workspace }`. Keep a legacy fallback only when no membership rows exist, then create the missing membership in the same request path.

- [ ] **Step 5: Implement the workspace selection page**

Render active, pending and disabled cards separately. Active cards submit to the selector API; pending cards show `승인 대기`; disabled cards show `이용 중지`.

- [ ] **Step 6: Run auth and legacy regression tests**

Run: `npx tsx --test tests/workspace-auth.test.ts tests/brand-partner-routing.test.ts && node --test tests/workspace-selection-route.test.mjs tests/agency-auth.test.mjs tests/creator-auth-contract.test.mjs`

Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/auth.ts src/lib/db.ts src/lib/workspace-selection.ts src/app/api/workspaces/select/route.ts src/app/dashboard/workspaces/page.tsx src/app/api/auth/google/callback/route.ts src/app/api/auth/login/route.ts tests/workspace-auth.test.ts tests/workspace-selection-route.test.mjs
git commit -m "feat: authorize independent account workspaces"
```

### Task 3: 브랜드 신청과 관리자 작업공간 승인

**Files:**
- Modify: `src/lib/creator-onboarding.ts`
- Modify: `src/app/api/applications/route.ts`
- Modify: `src/components/LoginForm.tsx`
- Create: `src/app/api/admin/users/[userId]/workspaces/route.ts`
- Create: `src/components/AdminUserWorkspaceManager.tsx`
- Modify: `src/components/AdminUsersManager.tsx`
- Modify: `src/app/dashboard/admin/admin.css`
- Test: `tests/multi-role-onboarding.test.ts`
- Test: `tests/admin-workspace-management.test.mjs`

**Interfaces:**
- Consumes: workspace creation and resolver functions from Task 1
- Produces: admin `POST/PATCH /api/admin/users/:userId/workspaces`
- Produces: inline account workspace manager in member approval drawer

- [ ] **Step 1: Write failing onboarding and admin tests**

```ts
test("existing creator may apply for a beauty partner workspace", async () => {
  assert.equal(await designerApplicationRoleGuard("u1", async () => ({ id: "creator-1", approval_status: "approved" })), null);
});
```

```ts
test("admin member drawer exposes creator fashion and beauty workspace controls", async () => {
  const source = await readFile(new URL("../src/components/AdminUserWorkspaceManager.tsx", import.meta.url), "utf8");
  for (const label of ["크리에이터", "패션 브랜드", "뷰티 브랜드", "승인", "비활성화"]) assert.match(source, new RegExp(label));
});
```

- [ ] **Step 2: Run tests and confirm RED**

Run: `npx tsx --test tests/multi-role-onboarding.test.ts && node --test tests/admin-workspace-management.test.mjs`

Expected: FAIL because creator conflict removal and admin manager are absent.

- [ ] **Step 3: Make brand application role-independent and transactional**

Create the designer application and pending workspace membership in one transaction. `K-뷰티` creates `beauty_partner`, `K-패션` creates `fashion_partner`, and `복합` creates both.

- [ ] **Step 4: Add administrator workspace operations**

The route accepts exact actions:

```ts
type AdminWorkspaceAction =
  | { action: "approve"; membershipId: string }
  | { action: "disable"; membershipId: string }
  | { action: "set_default"; membershipId: string }
  | { action: "create_beauty_partner"; brandName: string; contactEmail: string };
```

Each mutation writes an audit log and never changes unrelated memberships.

- [ ] **Step 5: Add the workspace section to the existing quick approval drawer**

Show all workspace statuses and keep approval actions inline without navigating away. Refresh counts and the selected account after success.

- [ ] **Step 6: Run tests and confirm GREEN**

Run: `npx tsx --test tests/multi-role-onboarding.test.ts tests/creator-onboarding.test.mjs && node --test tests/admin-workspace-management.test.mjs tests/admin-users-creator-contract.test.mjs`

Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/creator-onboarding.ts src/app/api/applications/route.ts src/components/LoginForm.tsx src/app/api/admin/users/[userId]/workspaces/route.ts src/components/AdminUserWorkspaceManager.tsx src/components/AdminUsersManager.tsx src/app/dashboard/admin/admin.css tests/multi-role-onboarding.test.ts tests/admin-workspace-management.test.mjs
git commit -m "feat: manage account workspaces in admin"
```

### Task 4: 패션·뷰티 센터와 API 데이터 격리

**Files:**
- Modify: `src/app/dashboard/designer/layout.tsx`
- Modify: `src/app/dashboard/beauty/layout.tsx`
- Modify: `src/lib/master-admin.ts`
- Modify: `src/components/MasterRoleSwitcher.tsx`
- Modify: `src/lib/admin-navigation.ts`
- Modify: all handlers under `src/app/api/beauty/`
- Modify: product handlers under `src/app/api/products/` and `src/app/api/uploads/product-image/route.ts`
- Test: `tests/partner-workspace-isolation.test.ts`
- Test: `tests/master-role-switcher-ui.test.mjs`
- Test: `tests/beauty-product-workspace-contract.test.mjs`

**Interfaces:**
- Consumes: `requireFashionPartner`, `requireBeautyPartner`
- Produces: four explicit master destinations and membership-aware partner links

- [ ] **Step 1: Write failing isolation tests**

```ts
test("beauty product mutation is scoped to the selected beauty designer", async () => {
  const result = await authorizeProductMutation({ selectedDesignerId: "beauty-1", productDesignerId: "fashion-1" });
  assert.equal(result.ok, false);
});
```

Assert the switcher labels are `관리자 콘솔`, `크리에이터 화면`, `패션 브랜드 센터`, `뷰티 브랜드 센터`.

- [ ] **Step 2: Run tests and confirm RED**

Run: `npx tsx --test tests/partner-workspace-isolation.test.ts && node --test tests/master-role-switcher-ui.test.mjs tests/beauty-product-workspace-contract.test.mjs`

Expected: FAIL because the current switcher has one partner destination and API auth resolves the first designer.

- [ ] **Step 3: Bind each center to its workspace type**

Designer layouts and handlers use only `fashion_partner`; beauty layouts and handlers use only `beauty_partner`. Every product, upload and campaign mutation compares its `designer_id` to the resolved workspace resource ID.

- [ ] **Step 4: Split top navigation destinations**

Master admins see four destinations. Regular accounts see only active memberships returned by `listUserWorkspaces`; no inactive workspace link is rendered.

- [ ] **Step 5: Run isolation and full center regressions**

Run: `npx tsx --test tests/partner-workspace-isolation.test.ts tests/brand-partner-routing.test.ts && node --test tests/master-role-switcher-ui.test.mjs tests/beauty-product-workspace-contract.test.mjs tests/creator-center-regression.test.mjs tests/admin-campaign-regression.test.mjs`

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/designer/layout.tsx src/app/dashboard/beauty/layout.tsx src/lib/master-admin.ts src/components/MasterRoleSwitcher.tsx src/lib/admin-navigation.ts src/app/api/beauty src/app/api/products src/app/api/uploads/product-image/route.ts tests/partner-workspace-isolation.test.ts tests/master-role-switcher-ui.test.mjs tests/beauty-product-workspace-contract.test.mjs
git commit -m "feat: isolate fashion and beauty partner centers"
```

### Task 5: 운영 계정 연결, 검증과 배포

**Files:**
- Create: `scripts/grant-beauty-workspace.mjs`
- Test: `tests/grant-beauty-workspace.test.mjs`
- Modify: `docs/superpowers/plans/2026-08-28-multi-workspace-fashion-beauty.md` only to check completed steps

**Interfaces:**
- Consumes: production database connection and workspace schema
- Produces: idempotent command `node scripts/grant-beauty-workspace.mjs studioooat@gmail.com "Studioooat Beauty"`

- [ ] **Step 1: Write a failing idempotency test**

```ts
test("grant script preserves creator membership and upserts one approved beauty workspace", async () => {
  const result = await grantBeautyWorkspace(fakeDb, { email: "studioooat@gmail.com", brandName: "Studioooat Beauty" });
  assert.equal(result.creatorPreserved, true);
  assert.equal(result.beautyMembership.status, "active");
  assert.equal(result.duplicateCount, 0);
});
```

- [ ] **Step 2: Run test and confirm RED**

Run: `node --test tests/grant-beauty-workspace.test.mjs`

Expected: FAIL because the script does not exist.

- [ ] **Step 3: Implement the transactional, idempotent grant command**

The command must find the existing user, preserve `creator_accounts.user_id`, create or reuse a `K-뷰티` designer with matching contact email, set its approval to `approved`, and upsert one active `beauty_partner` membership. It must print IDs and statuses but no secrets.

- [ ] **Step 4: Run focused and full verification**

Run: `node --test tests/grant-beauty-workspace.test.mjs`

Run: `npx tsc --noEmit`

Run: `npm run build`

Expected: all tests PASS, TypeScript exits 0, production build exits 0.

- [ ] **Step 5: Commit and push**

```bash
git add scripts/grant-beauty-workspace.mjs tests/grant-beauty-workspace.test.mjs docs/superpowers/plans/2026-08-28-multi-workspace-fashion-beauty.md
git commit -m "ops: add approved beauty workspace grant"
git push origin master
```

- [ ] **Step 6: Wait for Railway success and run the production grant**

Run the grant command against the production database only after the deployment reports `Success - k-modu.co.kr`. Confirm `studioooat@gmail.com` retains creator access and has one active beauty workspace.

- [ ] **Step 7: Browser verification**

Verify with Chrome at desktop and mobile widths:

- `/dashboard/creator` still opens for `studioooat@gmail.com`
- `/dashboard/beauty/products` opens after selecting the beauty workspace
- a draft product can be created and remains scoped to the beauty designer
- after admin approval the product is visible in the intended public/creator surface
- `/dashboard/designer/brand` does not show the beauty product
- administrator account shows all four workspace destinations

- [ ] **Step 8: Final review and deployment handoff**

Run the full focused test set, inspect browser console logs, record the deployed URLs and exact account workspace status, and report any missing real product asset separately from platform readiness.
