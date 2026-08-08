# Creator Beauty Demo Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 관리자 크리에이터 계정에 K-뷰티 추천·초대·검수·판매·정산 전 과정을 보여주는 초기화 가능한 데모 데이터를 제공한다.

**Architecture:** 관리자 인증을 통과한 서버 액션이 하나의 DB 트랜잭션에서 고정 `demo-beauty-` ID 레코드를 upsert한다. 크리에이터 센터의 기존 조회 화면은 변경하지 않고 실제 도메인 테이블을 그대로 읽으며, 같은 관리자 UI에서 해당 고정 ID만 안전하게 초기화한다.

**Tech Stack:** Next.js 16 App Router, React Server Actions, TypeScript, PostgreSQL, Node test runner

## Global Constraints

- 모든 데모 데이터 제목과 ID에 `DEMO` 또는 `demo-beauty-` 표시를 사용한다.
- 실제 공개 크리에이터, 기존 캠페인, 기존 참여 데이터는 수정하거나 삭제하지 않는다.
- 생성과 초기화는 관리자만 실행할 수 있다.
- 생성은 여러 번 실행해도 중복되지 않아야 한다.
- 실패 시 트랜잭션 전체를 롤백한다.

---

### Task 1: 데모 데이터 도메인 함수

**Files:**
- Create: `src/lib/creator-demo.ts`
- Test: `tests/creator-beauty-demo-domain.test.mjs`

**Interfaces:**
- Consumes: `withDatabaseTransaction`, 관리자 `userId`, 관리자 전용 `CreatorAccount`
- Produces: `seedCreatorBeautyDemo(adminUserId: string, creatorAccountId: string): Promise<DemoSeedResult>` 및 `resetCreatorBeautyDemo(adminUserId: string, creatorAccountId: string): Promise<DemoResetResult>`

- [ ] **Step 1: 실패하는 계약 테스트 작성**

```js
assert.match(source, /demo-beauty-serum-recruiting/);
assert.match(source, /demo-beauty-cream-invited/);
assert.match(source, /demo-beauty-suncushion-review/);
assert.match(source, /demo-beauty-liptint-completed/);
assert.match(source, /withDatabaseTransaction/);
assert.match(source, /ON CONFLICT/);
assert.match(source, /DELETE FROM campaigns WHERE id = ANY/);
```

- [ ] **Step 2: 테스트가 파일 부재로 실패하는지 확인**

Run: `node --test tests/creator-beauty-demo-domain.test.mjs`
Expected: FAIL because `src/lib/creator-demo.ts` does not exist.

- [ ] **Step 3: 네 캠페인과 연관 데이터를 트랜잭션으로 upsert하는 최소 구현 작성**

```ts
export type DemoSeedResult = { campaigns: number; participations: number; submissions: number; events: number; performance: number };
export async function seedCreatorBeautyDemo(adminUserId: string, creatorAccountId: string): Promise<DemoSeedResult>;
export async function resetCreatorBeautyDemo(adminUserId: string, creatorAccountId: string): Promise<{ removedCampaigns: number }>;
```

캠페인 ID는 `demo-beauty-serum-recruiting`, `demo-beauty-cream-invited`, `demo-beauty-suncushion-review`, `demo-beauty-liptint-completed`로 고정한다. 참여 상태는 각각 없음, `invited`, `review`, `completed`이며 완료 건에는 게시 제출물, 성과 `views=184200`, `likes=12740`, `comments=386`, `orders=86`, `revenue=12900`, `currency=MYR`, `settlement_status=paid`를 넣는다. 말레이시아 캠페인 보상은 `RM 420`, 베트남 캠페인 보상은 `₫2,500,000`으로 표시한다.

- [ ] **Step 4: 도메인 테스트 통과 확인**

Run: `node --test tests/creator-beauty-demo-domain.test.mjs`
Expected: PASS.

- [ ] **Step 5: 도메인 함수 커밋**

```bash
git add src/lib/creator-demo.ts tests/creator-beauty-demo-domain.test.mjs
git commit -m "feat: add creator beauty demo data domain"
```

### Task 2: 관리자 전용 생성·초기화 액션과 UI

**Files:**
- Create: `src/app/dashboard/creator/demo-actions.ts`
- Create: `src/components/CreatorDemoControls.tsx`
- Modify: `src/app/dashboard/creator/layout.tsx`
- Test: `tests/creator-beauty-demo-controls.test.mjs`

**Interfaces:**
- Consumes: `seedCreatorBeautyDemo`, `resetCreatorBeautyDemo`, `getCurrentUser`, `getOrCreateAdminCreatorAccount`
- Produces: `seedDemoAction()`과 `resetDemoAction()` 서버 액션, 관리자 배너 내 데모 제어 버튼

- [ ] **Step 1: 실패하는 권한·UI 계약 테스트 작성**

```js
assert.match(actions, /user\.role !== "admin"/);
assert.match(actions, /seedCreatorBeautyDemo/);
assert.match(actions, /resetCreatorBeautyDemo/);
assert.match(actions, /revalidatePath\("\/dashboard\/creator"/);
assert.match(layout, /CreatorDemoControls/);
assert.match(controls, /체험 데이터 채우기/);
assert.match(controls, /체험 데이터 초기화/);
```

- [ ] **Step 2: 테스트가 새 파일 부재로 실패하는지 확인**

Run: `node --test tests/creator-beauty-demo-controls.test.mjs`
Expected: FAIL because the server actions and component do not exist.

- [ ] **Step 3: 관리자 전용 서버 액션과 배너 제어 UI 구현**

```ts
export async function seedDemoAction(): Promise<void>;
export async function resetDemoAction(): Promise<void>;
```

액션은 관리자 역할을 다시 검사하고 전용 운영자 크리에이터 ID만 전달한다. 성공 후 홈, 추천, 내 미션, 제출, 정산 경로를 재검증한다. UI는 현재 `관리자 운영 모드` 배너 안에 두 개의 작은 버튼으로 표시한다.

- [ ] **Step 4: UI 계약 테스트 통과 확인**

Run: `node --test tests/creator-beauty-demo-controls.test.mjs`
Expected: PASS.

- [ ] **Step 5: 관리자 UI 커밋**

```bash
git add src/app/dashboard/creator/demo-actions.ts src/components/CreatorDemoControls.tsx src/app/dashboard/creator/layout.tsx tests/creator-beauty-demo-controls.test.mjs
git commit -m "feat: add admin creator demo controls"
```

### Task 3: 활동·수익센터 대시보드와 메뉴

**Files:**
- Modify: `src/components/CreatorNav.tsx`
- Modify: `src/app/dashboard/creator/page.tsx`
- Create: `src/app/dashboard/creator/performance/page.tsx`
- Create: `src/app/dashboard/creator/grade/page.tsx`
- Modify: `src/app/dashboard/creator/settlement/page.tsx`
- Modify: `src/app/dashboard/creator/submissions/page.tsx`
- Modify: `src/app/globals.css`
- Modify: `site-i18n.js`
- Test: `tests/creator-activity-revenue-center.test.mjs`

**Interfaces:**
- Consumes: 기존 크리에이터 요약·활동·성과·정산 조회 함수와 Task 1 데모 데이터
- Produces: 오늘의 활동 KPI, 미션 단계 보드, 성과 페이지, 등급 페이지, `콘텐츠 제작` 및 `수익·정산` 메뉴
- Produces: 한국어·말레이어·베트남어·영어로 전환되는 핵심 크리에이터 센터 문구

- [ ] **Step 1: 첨부안의 메뉴와 KPI를 요구하는 실패 테스트 작성**

```js
assert.match(nav, /콘텐츠 제작/);
assert.match(nav, /성과/);
assert.match(nav, /수익·정산/);
assert.match(nav, /등급/);
assert.match(home, /오늘의 활동/);
assert.match(home, /예상 수익/);
assert.match(home, /이번 달 주문/);
assert.match(home, /내 미션 보드/);
assert.match(i18n, /오늘의 활동["']:\s*["']Aktiviti hari ini["']/);
assert.match(i18n, /수익·정산["']:\s*["']Pendapatan · Penyelesaian["']/);
```

- [ ] **Step 2: 테스트가 새 메뉴와 페이지 부재로 실패하는지 확인**

Run: `node --test tests/creator-activity-revenue-center.test.mjs`
Expected: FAIL on missing activity and revenue center strings.

- [ ] **Step 3: 기존 조회 데이터를 조합해 활동·수익센터 구현**

홈 KPI는 추천 캠페인 수, 7일 내 마감 수, 참여의 현지 통화 `expected_reward`, 성과의 이번 달 주문 합계를 사용한다. 미션 보드는 가장 최근 진행 참여의 상태를 제품 수령·콘텐츠 제작·검수·게시·정산 다섯 단계로 표시한다. 캠페인 카드에는 `한국 공급사`, 도착 국가, 현지 보상 통화를 명시한다.

- [ ] **Step 4: 성과와 등급 페이지 구현**

성과 페이지는 캠페인별 조회·좋아요·댓글·주문·매출을 표시한다. 등급 페이지는 완료 0건 `STARTER`, 1~2건 `RISING`, 3건 이상 `PRO` 규칙과 다음 단계 조건을 표시한다.

- [ ] **Step 5: PC·모바일 스타일과 테스트 통과 확인**

Run: `node --test tests/creator-activity-revenue-center.test.mjs`
Expected: PASS with seven navigation items and responsive KPI cards.

- [ ] **Step 6: 활동·수익센터 커밋**

```bash
git add src/components/CreatorNav.tsx src/app/dashboard/creator src/app/globals.css tests/creator-activity-revenue-center.test.mjs
git commit -m "feat: build creator activity revenue center"
```

### Task 4: 통합 검증과 운영 데이터 생성

**Files:**
- Modify: `tests/creator-beauty-demo-domain.test.mjs` only if a real regression is discovered

**Interfaces:**
- Consumes: completed demo domain and admin controls
- Produces: verified production build and populated admin creator dashboard

- [ ] **Step 1: 관련 테스트 전체 실행**

Run: `node --test tests/creator-beauty-demo-domain.test.mjs tests/creator-beauty-demo-controls.test.mjs tests/creator-mission-contract.test.mjs tests/creator-performance-contract.test.mjs tests/admin-creator-preview-contract.test.mjs`
Expected: all tests PASS.

- [ ] **Step 2: 프로덕션 빌드 실행**

Run: `cmd /c npm.cmd run build`
Expected: Next.js build exits 0 and all dashboard routes compile.

- [ ] **Step 3: 브랜치 푸시와 Railway 배포**

```bash
git push origin codex/creator-action-center
railway up . --path-as-root --detach --message "Add creator beauty demo flow"
```

- [ ] **Step 4: 운영 관리자 화면에서 `체험 데이터 채우기` 실행**

Open: `https://www.k-modu.co.kr/dashboard/creator`
Expected: 초대 1, 진행 2, 추천 1과 정산 완료 1건이 표시된다.

- [ ] **Step 5: PC·모바일 전체 메뉴 시각 검수**

Check: `/dashboard/creator`, `/dashboard/creator/campaigns`, `/dashboard/creator/my-campaigns`, `/dashboard/creator/submissions`, `/dashboard/creator/settlement`.
Expected: 데모 라벨, 상태, 제출물, 성과, 정산이 가로 넘침 없이 표시된다.

- [ ] **Step 6: 최종 상태 커밋 필요 여부 확인**

Run: `git status --short`
Expected: clean worktree.
