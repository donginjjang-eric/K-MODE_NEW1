# 크리에이터 회원·관리 그룹 구현 계획

> **에이전트 작업자용:** 필수 하위 스킬: 작업별 구현에는 `superpowers:subagent-driven-development`(권장) 또는 `superpowers:executing-plans`를 사용한다. 모든 단계는 체크박스로 진행 상태를 기록한다.

**목표:** 관리자 추가 크리에이터 24명을 승인된 실제 크리에이터 회원 레코드로 전환하고, 관리자가 여러 크리에이터를 하나의 관리 그룹으로 묶으며, 초대된 관리 대행사가 소속 크리에이터의 캠페인·거래·정산만 읽을 수 있게 한다.

**아키텍처:** `data/malaysia-meeting-creators.js`를 24명 공개 카드와 서버 가져오기가 함께 사용하는 기준 데이터로 유지하고, 애플리케이션 시작 시 PostgreSQL `creator_accounts`에 멱등 동기화한다. 크리에이터 계정 주위에 관리 그룹, 현재 소속, 대행사 초대, 감사 로그를 추가하고 관리자 전용 변경 API와 대행사 전용 읽기 화면을 분리한다. 모든 대행사 권한은 서버에서 로그인 사용자와 그룹 관계를 확인한 뒤 적용하며 공개 화면에는 내부 관리 정보가 노출되지 않는다.

**기술 스택:** Next.js App Router, TypeScript, React, PostgreSQL(`pg`), Google OAuth 세션 쿠키, Node 테스트 러너, GitHub 연동 Railway 배포

**설계 문서:** `docs/superpowers/specs/2026-08-24-creator-management-groups-design.md`

## 전역 제약 조건

- 추가된 24명의 팔로워 합계는 명시적 갱신 전까지 정확히 `5,031,738`이어야 한다.
- 공개 크리에이터 전체는 `97명`, 전체 팔로워는 `56,620,886`이어야 한다.
- 관리자 등록 크리에이터는 `approved + admin + unclaimed` 상태이며 실제 본인 인증 전까지 `user_id`는 `NULL`이다.
- 공개 화면에서는 가입 경로, 계정 연결 상태, 관리자 메모, 대행사 이메일, 감사 기록을 절대 노출하지 않는다.
- 크리에이터 한 명은 첫 버전에서 활성 관리 그룹을 최대 하나만 가질 수 있다.
- 대행사는 배정받은 그룹의 캠페인·확정 거래·정산만 조회할 수 있고 변경 API는 제공하지 않는다.
- 그룹 일괄 지정, 이동, 계정 귀속, 대행사 활성화는 트랜잭션으로 처리한다.
- 이미 연결된 크리에이터의 `user_id`와 귀속 상태는 명단 재동기화로 덮어쓰지 않는다.
- 관련 없는 로컬 변경은 보존하고 각 작업에 명시된 파일만 스테이징한다.
- 최종 완료는 데스크톱·모바일 시각 확인, 프로덕션 빌드, GitHub 푸시, Railway 배포, 운영 URL 직접 확인 뒤에만 선언한다.

---

## 파일 책임 구조

- `data/malaysia-meeting-creators.js`: 공개 카드와 서버 가져오기가 공유하는 24명 기준 명단
- `scripts/sync-malaysia-meeting-creators.mjs`: 기준 명단을 DB 회원 레코드로 멱등 변환·동기화
- `db/schema.sql`: 역할, 크리에이터 확장 필드, 그룹·소속·대행사·감사 테이블
- `src/lib/creator-management.ts`: 관리자 변경 트랜잭션과 대행사 범위 제한 조회
- `src/app/api/admin/creator-groups/**`: 관리자 전용 그룹·소속·대행사 초대 API
- `src/app/dashboard/admin/creators/**`: 관리자 크리에이터 목록과 개별 상세
- `src/app/dashboard/admin/creator-groups/**`: 그룹 목록과 상세 관리
- `src/app/dashboard/agency/**`: 대행사 전용 읽기 화면

### 작업 1: 크리에이터 회원 및 관리 그룹 스키마 확장

**파일:**

- 수정: `db/schema.sql`
- 수정: `src/lib/types.ts`
- 생성: `tests/creator-management-schema.test.mjs`

**인터페이스:**

- 입력: 기존 `users`, `creator_accounts`, 캠페인·성과·정산 테이블
- 출력: `agency` 역할, 확장된 `CreatorAccount`, 그룹·소속·대행사 초대·감사 로그 테이블

- [ ] **1단계: 실패하는 스키마 계약 테스트 작성**

`tests/creator-management-schema.test.mjs`에 다음 핵심 계약을 넣는다.

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("크리에이터 관리 스키마와 agency 역할을 선언한다", async () => {
  const schema = await readFile("db/schema.sql", "utf8");
  const types = await readFile("src/lib/types.ts", "utf8");

  assert.match(schema, /creator_management_groups/);
  assert.match(schema, /creator_management_group_members/);
  assert.match(schema, /UNIQUE\s*\(creator_account_id\)/);
  assert.match(schema, /creator_management_group_users/);
  assert.match(schema, /creator_management_audit_logs/);
  assert.match(schema, /onboarding_source/);
  assert.match(schema, /claim_state/);
  assert.match(schema, /instagram_followers BIGINT/);
  assert.match(schema, /tiktok_followers BIGINT/);
  assert.match(types, /"admin" \| "designer" \| "creator" \| "agency"/);
});
```

- [ ] **2단계: 테스트가 실패하는지 확인**

실행: `node --test tests/creator-management-schema.test.mjs`

예상 결과: 관리 테이블과 `agency` 역할이 없어 실패한다.

- [ ] **3단계: 기존 DB도 안전하게 갱신되는 스키마 작성**

`users.role` 제약을 시작 스크립트에서 재생성해 `agency`를 허용하고, `creator_accounts`에는 다음 필드를 `ADD COLUMN IF NOT EXISTS` 방식으로 추가한다.

```sql
onboarding_source TEXT NOT NULL DEFAULT 'self_registered'
  CHECK (onboarding_source IN ('self_registered', 'admin')),
claim_state TEXT NOT NULL DEFAULT 'claimed'
  CHECK (claim_state IN ('unclaimed', 'claimed')),
created_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
profile_image_url TEXT,
specialty TEXT,
bio TEXT,
instagram_handle TEXT,
instagram_url TEXT,
instagram_followers BIGINT NOT NULL DEFAULT 0 CHECK (instagram_followers >= 0),
tiktok_handle TEXT,
tiktok_url TEXT,
tiktok_followers BIGINT NOT NULL DEFAULT 0 CHECK (tiktok_followers >= 0),
followers_verified_at TIMESTAMPTZ
```

현재 소속을 한 그룹으로 제한하는 핵심 테이블은 다음 형태로 만든다.

```sql
CREATE TABLE IF NOT EXISTS creator_management_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  agency_name TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS creator_management_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES creator_management_groups(id) ON DELETE CASCADE,
  creator_account_id UUID NOT NULL REFERENCES creator_accounts(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (creator_account_id)
);

CREATE TABLE IF NOT EXISTS creator_management_group_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES creator_management_groups(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  invite_status TEXT NOT NULL DEFAULT 'invited'
    CHECK (invite_status IN ('invited', 'active', 'revoked')),
  invited_by UUID NOT NULL REFERENCES users(id),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  UNIQUE (group_id, invited_email)
);

CREATE TABLE IF NOT EXISTS creator_management_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  group_id UUID REFERENCES creator_management_groups(id) ON DELETE SET NULL,
  creator_account_id UUID REFERENCES creator_accounts(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

그룹별 소속, 소문자 초대 이메일, 그룹별 최신 감사 로그 인덱스를 추가한다.

- [ ] **4단계: TypeScript 역할과 계정 타입 확장**

```ts
export type Role = "admin" | "designer" | "creator" | "agency";
export type CreatorOnboardingSource = "self_registered" | "admin";
export type CreatorClaimState = "unclaimed" | "claimed";
export type CreatorManagementGroupStatus = "active" | "inactive";
export type AgencyInviteStatus = "invited" | "active" | "revoked";
```

`CreatorAccount`에는 위 DB 필드와 동일한 이름·널 허용 여부를 반영한다.

- [ ] **5단계: 스키마 및 기존 인증 회귀 테스트 실행**

실행: `node --test tests/creator-management-schema.test.mjs tests/creator-schema.test.mjs tests/creator-auth-contract.test.mjs`

예상 결과: 선택한 테스트가 모두 통과한다.

- [ ] **6단계: 작업 1 커밋**

```powershell
git add db/schema.sql src/lib/types.ts tests/creator-management-schema.test.mjs
git commit -m "feat: add creator management group schema"
```

### 작업 2: 관리자 추가 크리에이터 24명 멱등 동기화

**파일:**

- 생성: `scripts/sync-malaysia-meeting-creators.mjs`
- 수정: `scripts/ensure-schema.mjs`
- 생성: `tests/malaysia-meeting-creator-sync.test.mjs`
- 수정: `tests/malaysia-meeting-creators.test.mjs`

**인터페이스:**

- 입력: `globalThis.KMODU_MALAYSIA_MEETING_CREATORS`, PostgreSQL 클라이언트, 선택적 관리자 ID
- 출력: `toCreatorAccountImportRows(creators)`, `malaysiaMeetingFollowerTotal(rows)`, `syncMalaysiaMeetingCreators(client, adminUserId)`

- [ ] **1단계: 실패하는 변환·동기화 테스트 작성**

```js
assert.equal(rows.length, 24);
assert.equal(new Set(rows.map((row) => row.creator_key)).size, 24);
assert.equal(rows.every((row) => row.approval_status === "approved"), true);
assert.equal(rows.every((row) => row.onboarding_source === "admin"), true);
assert.equal(rows.every((row) => row.claim_state === "unclaimed"), true);
assert.equal(malaysiaMeetingFollowerTotal(rows), 5_031_738);
```

기록형 가짜 DB 클라이언트로 실행된 SQL을 수집해 충돌 갱신문이 `user_id`, `claim_state`, 기존 `created_by_admin_id`를 덮어쓰지 않는지도 검사한다.

- [ ] **2단계: 동기화 모듈 부재로 실패하는지 확인**

실행: `node --test tests/malaysia-meeting-creator-sync.test.mjs tests/malaysia-meeting-creators.test.mjs`

예상 결과: 새 동기화 모듈을 찾지 못해 실패한다.

- [ ] **3단계: 명단 변환기와 멱등 UPSERT 구현**

공개 데이터 스크립트를 가져온 뒤 `creator_key`를 충돌 기준으로 사용한다. 신규 행에는 `approved`, `admin`, `unclaimed`, `user_id = NULL`을 넣고, 충돌 시에는 다음 공개 필드만 갱신한다.

```sql
ON CONFLICT (creator_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  approval_status = 'approved',
  platform = EXCLUDED.platform,
  market = EXCLUDED.market,
  categories = EXCLUDED.categories,
  profile_image_url = EXCLUDED.profile_image_url,
  specialty = EXCLUDED.specialty,
  instagram_handle = EXCLUDED.instagram_handle,
  instagram_url = EXCLUDED.instagram_url,
  instagram_followers = EXCLUDED.instagram_followers,
  tiktok_handle = EXCLUDED.tiktok_handle,
  tiktok_url = EXCLUDED.tiktok_url,
  tiktok_followers = EXCLUDED.tiktok_followers,
  followers_verified_at = EXCLUDED.followers_verified_at,
  updated_at = NOW()
```

- [ ] **4단계: 스키마 시작 과정에 동기화 연결**

`scripts/ensure-schema.mjs`에서 스키마 적용과 관리자 계정 확인 뒤 다음을 실행한다.

```js
await syncMalaysiaMeetingCreators(client, adminUserId ?? null);
```

관리자 ID는 설정된 관리자 이메일로 조회하고, 관리자 시드가 없는 환경에서는 `NULL`을 허용한다.

- [ ] **5단계: 24명·팔로워 합계·반복 실행 검증**

실행: `node --test tests/malaysia-meeting-creator-sync.test.mjs tests/malaysia-meeting-creators.test.mjs`

예상 결과: 24개 고유 키, 추가 팔로워 `5,031,738`, 반복 실행 시 동일한 24개 키가 확인된다.

- [ ] **6단계: 작업 2 커밋**

```powershell
git add scripts/sync-malaysia-meeting-creators.mjs scripts/ensure-schema.mjs tests/malaysia-meeting-creator-sync.test.mjs tests/malaysia-meeting-creators.test.mjs
git commit -m "feat: sync admin onboarded creator members"
```

### 작업 3: 관리 그룹 도메인과 트랜잭션 구현

**파일:**

- 생성: `src/lib/creator-management.ts`
- 생성: `tests/creator-management-domain.test.mjs`

**인터페이스:**

- 입력: 작업 1의 테이블과 기존 `query`, `one`, `withDatabaseTransaction`
- 출력:

```ts
export type CreatorCampaignAdminSummary = {
  campaignId: string;
  campaignTitle: string;
  participationStatus: string;
  expectedReward: number | null;
  currency: string | null;
  settlementStatus: string | null;
};

export type CreatorSettlementSummary = {
  expectedRewardTotal: number;
  settledCount: number;
  unsettledCount: number;
};

export type AdminManagedCreator = CreatorAccount & {
  followerTotal: number;
  managementGroupId: string | null;
  managementGroupName: string | null;
};

export type AdminManagedCreatorDetail = AdminManagedCreator & {
  campaigns: CreatorCampaignAdminSummary[];
  settlement: CreatorSettlementSummary;
};

export type CreatorManagementGroupSummary = {
  id: string;
  name: string;
  agencyName: string | null;
  status: CreatorManagementGroupStatus;
  creatorCount: number;
  followerTotal: number;
};

export type CreatorManagementGroupDetail = CreatorManagementGroupSummary & {
  notes: string | null;
  creators: AdminManagedCreator[];
  agencyUsers: Array<{ email: string; status: AgencyInviteStatus }>;
  auditEvents: Array<{ action: string; createdAt: string; metadata: Record<string, unknown> }>;
};

export type CreateCreatorManagementGroupInput = {
  name: string;
  agencyName?: string;
  notes?: string;
  creatorAccountIds: string[];
};

export type UpdateCreatorManagementGroupInput = {
  name?: string;
  agencyName?: string | null;
  notes?: string | null;
  status?: CreatorManagementGroupStatus;
};

export type ManagedCreatorFilters = {
  search?: string;
  market?: string;
  platform?: string;
  groupId?: string;
  onboardingSource?: CreatorOnboardingSource;
  claimState?: CreatorClaimState;
  approvalStatus?: "pending" | "approved" | "rejected";
};

export declare function listManagedCreators(filters?: ManagedCreatorFilters): Promise<AdminManagedCreator[]>;
export declare function getManagedCreatorDetail(creatorKey: string): Promise<AdminManagedCreatorDetail | null>;
export declare function listCreatorManagementGroups(): Promise<CreatorManagementGroupSummary[]>;
export declare function getCreatorManagementGroup(groupId: string): Promise<CreatorManagementGroupDetail | null>;
export declare function createCreatorManagementGroup(actorUserId: string, input: CreateCreatorManagementGroupInput): Promise<string>;
export declare function updateCreatorManagementGroup(actorUserId: string, groupId: string, input: UpdateCreatorManagementGroupInput): Promise<void>;
export declare function assignCreatorsToManagementGroup(actorUserId: string, groupId: string, creatorAccountIds: string[]): Promise<number>;
export declare function removeCreatorsFromManagementGroup(actorUserId: string, groupId: string, creatorAccountIds: string[]): Promise<number>;
export declare function inviteAgencyGroupUser(actorUserId: string, groupId: string, email: string): Promise<void>;
export declare function revokeAgencyGroupUser(actorUserId: string, groupId: string, email: string): Promise<void>;
```

- [ ] **1단계: 실패하는 도메인 동작 테스트 작성**

저장소의 트랜잭션 러너 패턴으로 검색·전체 필터, 그룹 생성과 동시 배정, 기존 그룹에서 새 그룹으로 이동, 선택 제거, 비활성 그룹 거부, 중복 이메일 거부, 모든 변경의 `actor_user_id` 감사 기록을 검사한다.

```js
assert.deepEqual(result.creatorAccountIds, [creatorA, creatorB]);
assert.equal(recordedStatements.at(0).text, "BEGIN");
assert.match(recordedStatements.at(-2).text, /creator_management_audit_logs/);
assert.equal(recordedStatements.at(-1).text, "COMMIT");
```

- [ ] **2단계: 도메인 모듈 부재로 실패하는지 확인**

실행: `node --import tsx --test tests/creator-management-domain.test.mjs`

예상 결과: 새 모듈 또는 내보낸 함수가 없어 실패한다.

- [ ] **3단계: 검증과 범위 제한 조회 구현**

검색어·이메일을 정규화하고 크리에이터 ID를 중복 제거한다. 빈 그룹명, UUID 형식 오류, 존재하지 않는 크리에이터, 비활성 그룹은 트랜잭션 전에 또는 잠금 직후 안정된 한국어 오류 코드로 거부한다. 팔로워 합계는 DB 숫자 필드인 `instagram_followers + tiktok_followers`로 계산한다.

- [ ] **4단계: 그룹 변경 트랜잭션 구현**

배정 대상 소속 행을 `FOR UPDATE`로 잠그고, 이동이면 기존 소속 삭제와 새 소속 삽입을 같은 트랜잭션에서 처리한다. 생성·수정·배정·이동·제거·초대·해제마다 `creator_management_audit_logs`에 이전/이후 메타데이터를 기록한다.

```sql
SELECT creator_account_id, group_id
FROM creator_management_group_members
WHERE creator_account_id = ANY($1::uuid[])
FOR UPDATE;
```

- [ ] **5단계: 도메인 및 기존 트랜잭션 회귀 테스트 실행**

실행: `node --import tsx --test tests/creator-management-domain.test.mjs tests/admin-campaign-final-fix-transaction-runner.mjs`

예상 결과: 두 테스트가 모두 통과한다.

- [ ] **6단계: 작업 3 커밋**

```powershell
git add src/lib/creator-management.ts tests/creator-management-domain.test.mjs
git commit -m "feat: add creator group management domain"
```

### 작업 4: 관리자 전용 크리에이터·그룹 API 구현

**파일:**

- 수정: `src/app/api/admin/creators/[creatorKey]/route.ts`
- 생성: `src/app/api/admin/creator-groups/route.ts`
- 생성: `src/app/api/admin/creator-groups/[groupId]/route.ts`
- 생성: `src/app/api/admin/creator-groups/[groupId]/members/route.ts`
- 생성: `src/app/api/admin/creator-groups/[groupId]/agency-users/route.ts`
- 생성: `tests/admin-creator-group-api.test.mjs`

**인터페이스:**

- 입력: 작업 3의 조회·변경 함수, `requireUser("admin")`
- 출력: 관리자 전용 JSON API; 크리에이터 공개 프로필 수정, 그룹 생성·수정·비활성화, 일괄 배정·이동·제거, 대행사 초대·해제

- [ ] **1단계: 실패하는 API 권한·입력 테스트 작성**

미로그인 `401`, 비관리자 `403`, 잘못된 본문 `400`, 없는 대상 `404`, 실제 충돌 `409`를 검사한다. 다음 본문 형식을 고정한다.

```ts
type CreateGroupBody = {
  name: string;
  agencyName?: string;
  notes?: string;
  creatorAccountIds: string[];
};

type UpdateMembersBody = {
  action: "assign" | "remove";
  creatorAccountIds: string[];
};

type InviteAgencyBody = { email: string };
```

- [ ] **2단계: 새 라우트 부재로 실패하는지 확인**

실행: `node --import tsx --test tests/admin-creator-group-api.test.mjs`

예상 결과: 라우트 모듈을 찾지 못해 실패한다.

- [ ] **3단계: 모든 변경 라우트에 관리자 인증 적용**

각 핸들러의 첫 권한 확인은 다음과 같이 통일한다.

```ts
const admin = await requireUser("admin");
```

DB 오류 원문은 응답하지 않고 도메인 오류 코드를 안정된 한국어 메시지로 변환한다.

- [ ] **4단계: 크리에이터 개별 수정과 그룹 API 구현**

기존 크리에이터 라우트에는 공개 프로필·SNS·팔로워 확인 시각 수정만 허용한다. 그룹 라우트는 작업 3의 트랜잭션 함수만 호출하고 SQL 행 전체를 응답하지 않는다. 성공 응답은 `{ id }`, `{ updated: true }`, `{ affectedCount }` 형태로 고정한다.

- [ ] **5단계: API 및 인증 회귀 테스트 실행**

실행: `node --import tsx --test tests/admin-creator-group-api.test.mjs tests/creator-auth-contract.test.mjs`

예상 결과: 선택한 테스트가 모두 통과한다.

- [ ] **6단계: 작업 4 커밋**

```powershell
git add src/app/api/admin/creators/[creatorKey]/route.ts src/app/api/admin/creator-groups tests/admin-creator-group-api.test.mjs
git commit -m "feat: add admin creator group APIs"
```

### 작업 5: 관리자 목록·개별 상세·그룹 관리 화면 구현

**파일:**

- 수정: `src/app/dashboard/admin/creators/page.tsx`
- 생성: `src/app/dashboard/admin/creators/[creatorKey]/page.tsx`
- 생성: `src/components/AdminCreatorManagementTable.tsx`
- 생성: `src/components/AdminCreatorDetailManager.tsx`
- 생성: `src/app/dashboard/admin/creator-groups/page.tsx`
- 생성: `src/app/dashboard/admin/creator-groups/[groupId]/page.tsx`
- 생성: `src/components/AdminCreatorGroupManager.tsx`
- 수정: `src/components/AdminNav.tsx`
- 수정: `src/app/dashboard/admin/admin.css`
- 생성: `tests/admin-creator-management-ui.test.mjs`

**인터페이스:**

- 입력: 작업 3의 서버 조회, 작업 4의 관리자 API
- 출력: 검색·필터·다중 선택 목록, 개별 크리에이터 상세, 그룹 목록·상세 관리 UI

- [ ] **1단계: 실패하는 접근성·화면 계약 테스트 작성**

이름/핸들 검색, 국가, 플랫폼, 관리 그룹, 가입 경로, 귀속 상태, 승인 상태 필터를 모두 검사한다. 행 선택·전체 선택, `새 관리 그룹 만들기`, `선택 크리에이터 그룹 지정`, `그룹 이동`, `그룹에서 제거` 버튼과 접근 가능한 레이블도 검사한다.

```js
assert.match(table, /aria-label="전체 크리에이터 선택"/);
assert.match(table, /선택 크리에이터 그룹 지정/);
assert.match(table, /그룹에서 제거/);
assert.match(page, /가입 경로/);
assert.match(page, /계정 상태/);
```

- [ ] **2단계: UI 계약 테스트가 실패하는지 확인**

실행: `node --test tests/admin-creator-management-ui.test.mjs`

예상 결과: 새 화면과 조작 요소가 없어 실패한다.

- [ ] **3단계: 관리자 크리에이터 목록과 일괄 도구 구현**

서버 페이지가 초기 목록과 그룹을 불러오고 클라이언트 컴포넌트가 선택 상태만 관리한다. 일괄 도구 막대는 표 영역 안에서만 고정해 본문을 가리지 않는다. 각 행에는 썸네일, 이름, SNS 핸들, 숫자 팔로워 합계, 승인 상태, 가입 경로, 귀속 상태, 현재 그룹을 표시한다.

내부 상태 문구는 다음처럼 사실대로 표시한다.

```text
가입 경로: 관리자 등록
계정 상태: 미연결 | 회원 연결
관리 그룹: 미지정 | {그룹명}
```

- [ ] **4단계: 개별 크리에이터 상세 관리 구현**

`/dashboard/admin/creators/[creatorKey]`에서 공개 프로필, SNS URL과 팔로워 수, 확인 시각, 가입/귀속 상태, 현재 그룹, 캠페인 이력, 정산 요약을 보여준다. 저장 시 작업 4의 기존 크리에이터 API를 호출하고 내부 필드는 공개 화면에 전달하지 않는다.

- [ ] **5단계: 그룹 목록과 상세 관리 구현**

그룹 목록에는 상태, 크리에이터 수, 팔로워 합계, 대행사명, 캠페인·거래·정산 요약을 표시한다. 상세 화면에는 그룹명·메모 수정, 비활성화, 구성원 배정·이동·제거, 대행사 이메일 초대·해제, 감사 이력을 제공한다.

- [ ] **6단계: 관리자 내비게이션과 반응형 CSS 적용**

`AdminNav`에 `크리에이터 관리`와 `관리 그룹` 링크를 추가한다. 좁은 화면에서는 검색·필터를 세로 배치하고 표 자체만 가로 스크롤되게 한다. 일괄 도구와 모달은 우측 퀵 링크 및 상단 내비게이션과 겹치지 않게 한다.

- [ ] **7단계: UI 테스트와 프로덕션 빌드 실행**

```powershell
node --test tests/admin-creator-management-ui.test.mjs
cmd /c corepack pnpm run build
```

예상 결과: UI 계약 테스트와 빌드가 통과한다.

- [ ] **8단계: 작업 5 커밋**

```powershell
git add src/app/dashboard/admin/creators src/app/dashboard/admin/creator-groups src/components/AdminCreatorManagementTable.tsx src/components/AdminCreatorDetailManager.tsx src/components/AdminCreatorGroupManager.tsx src/components/AdminNav.tsx src/app/dashboard/admin/admin.css tests/admin-creator-management-ui.test.mjs
git commit -m "feat: add bulk creator group administration"
```

### 작업 6: Google 로그인으로 크리에이터 귀속과 대행사 초대 연결

**파일:**

- 수정: `src/lib/auth.ts`
- 수정: `src/lib/creator-management.ts`
- 수정: `src/app/api/auth/google/callback/route.ts`
- 수정: `src/app/login/page.tsx`
- 수정: `src/app/page.tsx`
- 생성: `tests/agency-auth.test.mjs`

**인터페이스:**

- 입력: 검증된 Google 이메일, 미귀속 크리에이터 이메일, 활성 대행사 초대
- 출력: `requireAgencyUser()`, `activateAgencyInvitationsForLogin(userId, email)`, 역할별 로그인 진입 URL

- [ ] **1단계: 실패하는 인증 우선순위·활성화 테스트 작성**

`agency` 진입 URL이 `/dashboard/agency`인지, 초대 이메일 비교가 대소문자를 무시하는지, 해제된 초대가 활성화되지 않는지 검사한다. 로그인 우선순위는 기존 관리자 → 크리에이터 귀속 → 활성 대행사 초대 → 기존 디자이너 기본값으로 고정한다.

```js
assert.equal(loginEntryUrl({ role: "agency" }), "/dashboard/agency");
assert.equal(normalizeEmail(" Agency@Example.com "), "agency@example.com");
assert.equal(activatedInvitation.invite_status, "active");
```

- [ ] **2단계: agency 인증 함수 부재로 실패하는지 확인**

실행: `node --import tsx --test tests/agency-auth.test.mjs`

예상 결과: 역할 또는 인증 도우미가 없어 실패한다.

- [ ] **3단계: 대행사 역할 인증과 초대 활성화 구현**

```ts
export async function requireAgencyUser(): Promise<SessionUser> {
  return requireUser("agency");
}
```

`activateAgencyInvitationsForLogin`은 `invited` 또는 `active` 초대만 사용자와 연결하고 `activated_at`을 기록한다. 기존 `admin` 또는 `creator` 사용자의 역할은 절대 `agency`로 낮추지 않는다.

- [ ] **4단계: 로그인 콜백과 크리에이터 귀속 감사 기록 구현**

관리자 역할을 먼저 보존하고, 기존 크리에이터 계정 귀속을 원자적으로 처리한 뒤 감사 로그에 `creator_claimed`를 기록한다. 그 다음 활성 대행사 초대를 처리하고, 해당하지 않을 때만 기존 디자이너 흐름을 유지한다. 대행사는 `/dashboard/agency`로 이동시킨다.

- [ ] **5단계: 마지막 그룹 배정이 해제된 계정의 접근 차단 구현**

사용자 레코드는 삭제하지 않지만 활성 `creator_management_group_users`가 한 건도 없으면 대행사 데이터 화면에 접근할 수 없게 한다. 직접 그룹 URL 요청도 동일한 서버 조회 경계에서 `404` 또는 접근 불가로 처리한다.

- [ ] **6단계: 인증 회귀 테스트 실행**

실행: `node --import tsx --test tests/agency-auth.test.mjs tests/creator-auth-contract.test.mjs`

예상 결과: 새 대행사 인증과 기존 크리에이터 인증이 모두 통과한다.

- [ ] **7단계: 작업 6 커밋**

```powershell
git add src/lib/auth.ts src/lib/creator-management.ts src/app/api/auth/google/callback/route.ts src/app/login/page.tsx src/app/page.tsx tests/agency-auth.test.mjs
git commit -m "feat: activate read only agency accounts"
```

### 작업 7: 대행사 전용 읽기 포털 구현

**파일:**

- 수정: `src/lib/creator-management.ts`
- 생성: `src/app/dashboard/agency/layout.tsx`
- 생성: `src/app/dashboard/agency/page.tsx`
- 생성: `src/app/dashboard/agency/groups/[groupId]/page.tsx`
- 생성: `src/components/AgencyNav.tsx`
- 생성: `src/app/dashboard/agency/agency.css`
- 생성: `tests/agency-portal-access.test.mjs`

**인터페이스:**

- 입력: 인증된 `agency` 사용자 ID와 활성 그룹 배정
- 출력:

```ts
export type AgencyGroupSummary = {
  id: string;
  name: string;
  creatorCount: number;
  activeCampaignCount: number;
  expectedRewardTotal: number;
  settlementPendingCount: number;
};

export type AgencyGroupOverview = AgencyGroupSummary & {
  creators: Array<{
    creatorKey: string;
    displayName: string;
    profileImageUrl: string | null;
    followerTotal: number;
  }>;
  campaigns: Array<{
    campaignId: string;
    campaignTitle: string;
    creatorKey: string;
    participationStatus: string;
    expectedReward: number | null;
    currency: string | null;
    settlementStatus: string | null;
    revenue: number | null;
  }>;
};

export declare function listAgencyManagementGroups(userId: string): Promise<AgencyGroupSummary[]>;
export declare function getAgencyGroupOverview(userId: string, groupId: string): Promise<AgencyGroupOverview | null>;
```

- [ ] **1단계: 실패하는 데이터 격리·집계 테스트 작성**

배정된 그룹만 조회되는지, 해제된 사용자는 결과가 없는지, 타 그룹 ID는 `null`인지 검사한다. 캠페인 참여에서 확정 거래·예상 보상·통화·정산 상태를, 캠페인 성과에서 수익·통화를 읽는지 검사한다. `/api/agency` 변경 라우트가 존재하지 않는지도 확인한다.

```js
assert.equal(ownGroup.id, assignedGroupId);
assert.equal(await getAgencyGroupOverview(userId, otherGroupId), null);
assert.equal(agencyMutationRoutes.length, 0);
```

- [ ] **2단계: 대행사 조회 함수와 화면 부재로 실패하는지 확인**

실행: `node --import tsx --test tests/agency-portal-access.test.mjs`

예상 결과: 조회 함수 또는 페이지가 없어 실패한다.

- [ ] **3단계: 로그인 사용자 관계에서 시작하는 조회 구현**

모든 상세 조회는 다음 접근 경계를 먼저 만족해야 한다.

```sql
FROM creator_management_group_users gu
JOIN creator_management_groups g ON g.id = gu.group_id
JOIN creator_management_group_members gm ON gm.group_id = g.id
JOIN creator_accounts ca ON ca.id = gm.creator_account_id
WHERE gu.user_id = $1
  AND gu.invite_status = 'active'
  AND g.status = 'active'
  AND g.id = $2
```

이 경계 뒤에만 캠페인, 참여, 성과, 정산 데이터를 조인한다. 거래가 없으면 빈 배열과 0 합계를 반환하고 다른 그룹의 존재 여부는 누설하지 않는다.

- [ ] **4단계: 서버 렌더링 읽기 전용 화면 구현**

대행사 홈에는 배정 그룹만 표시한다. 그룹 상세에는 소속 크리에이터, 캠페인과 진행 단계, 확정 참여, 예상 보상 금액과 통화, 성과, 정산 상태를 표시한다. 수정·배정·삭제·승인·콘텐츠 제출·정산 변경 버튼은 렌더링하지 않는다.

- [ ] **5단계: 대행사 테스트와 프로덕션 빌드 실행**

```powershell
node --import tsx --test tests/agency-portal-access.test.mjs
cmd /c corepack pnpm run build
```

예상 결과: 접근 격리 테스트와 빌드가 통과한다.

- [ ] **6단계: 작업 7 커밋**

```powershell
git add src/lib/creator-management.ts src/app/dashboard/agency src/components/AgencyNav.tsx tests/agency-portal-access.test.mjs
git commit -m "feat: add agency creator oversight portal"
```

### 작업 8: 전체 수치·권한·화면·운영 배포 검증

**파일:**

- 생성: `tests/creator-management-end-to-end.test.mjs`

**인터페이스:**

- 입력: 작업 1~7의 DB 구조, 동기화, 관리자 화면, 대행사 인증·조회
- 출력: 자동화 검증 결과, 로컬 데스크톱·모바일 화면 증거, 운영 배포 URL

- [ ] **1단계: 실패하는 전체 불변조건 테스트 작성**

```js
assert.equal(importedCreators.length, 24);
assert.equal(publicCreators.length, 97);
assert.equal(importedFollowerTotal, 5_031_738);
assert.equal(publicFollowerTotal, 56_620_886);
assert.deepEqual(importedKeys.sort(), publicImportedKeys.sort());
assert.equal(agencyMutationRoutes.length, 0);
```

DB 스키마의 크리에이터당 단일 소속 제약과 이미 귀속된 계정의 `user_id` 보존도 함께 검사한다.

- [ ] **2단계: 기능 집중 테스트 전체 실행**

```powershell
node --import tsx --test tests/creator-management-schema.test.mjs tests/malaysia-meeting-creator-sync.test.mjs tests/malaysia-meeting-creators.test.mjs tests/creator-management-domain.test.mjs tests/admin-creator-group-api.test.mjs tests/admin-creator-management-ui.test.mjs tests/agency-auth.test.mjs tests/agency-portal-access.test.mjs tests/creator-management-end-to-end.test.mjs
```

예상 결과: 이번 기능에 해당하는 테스트가 모두 통과한다.

- [ ] **3단계: 전체 회귀 테스트와 프로덕션 빌드 실행**

```powershell
node --import tsx --test tests/*.test.mjs
cmd /c corepack pnpm run build
```

기존 기준에서 재현되는 관련 없는 실패는 별도로 기록한다. 새 실패가 하나라도 생기면 기능 완료로 처리하지 않는다.

- [ ] **4단계: 로컬 프로덕션 서버에서 데스크톱·모바일 직접 확인**

사용하지 않는 포트로 빌드 결과를 실행하고 다음을 확인한다.

- `/creators`: 기존 썸네일, 검색, 97명, 전체 팔로워 `56,620,886`
- `/dashboard/admin/creators`: 모든 필터와 일괄 선택이 작동하고 화면을 가리지 않음
- `/dashboard/admin/creators/[creatorKey]`: 개별 프로필·캠페인·정산 관리 정보
- `/dashboard/admin/creator-groups/[groupId]`: 소속 크리에이터와 대행사 초대 관리
- `/dashboard/agency`: 배정된 그룹만 표시하고 변경 기능이 없음
- 타 그룹 직접 URL: 데이터가 노출되지 않음
- 공개 페이지: 내부 가입·귀속·그룹·대행사 정보가 노출되지 않음

관리자 크리에이터 목록과 대행사 그룹 상세를 데스크톱 및 모바일 크기로 캡처한다.

- [ ] **5단계: 최종 검증 테스트 커밋**

```powershell
git add tests/creator-management-end-to-end.test.mjs
git commit -m "test: verify creator management workflow"
```

- [ ] **6단계: GitHub 푸시와 Railway 배포 상태 확인**

```powershell
git status --short
git push origin master
```

푸시한 커밋의 GitHub/Railway 상태가 성공할 때까지 확인한다. 배포 실패 시 관련 로그를 확인해 해당 결함만 수정하고 집중 테스트와 빌드를 다시 통과시킨 뒤 새 커밋을 푸시한다.

- [ ] **7단계: 운영 URL 직접 검증**

다음 운영 경로를 직접 연다.

```text
https://www.k-modu.co.kr/creators
https://www.k-modu.co.kr/dashboard/admin/creators
https://www.k-modu.co.kr/dashboard/agency
```

배포 커밋, 공개 KPI와 카드 수, 관리자 그룹 지정 흐름, 대행사 접근 경계, 데스크톱·모바일 레이아웃을 확인한다. 이 검증이 성공한 뒤에만 운영 URL과 증거를 사용자에게 전달한다.
