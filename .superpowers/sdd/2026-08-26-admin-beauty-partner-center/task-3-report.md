# Task 3 Report — 뷰티 파트너 센터 기반 구조

## Status

DONE_WITH_CONCERNS

Task 3의 필수 shell, home, brand profile, product management, category-aware entry routing을 구현했습니다. Focused tests, TypeScript typecheck, production build가 모두 통과했습니다. 사용자 요청에 따라 범위를 더 확장하지 않았고, 로컬 브라우저 시각 검증과 배포는 수행하지 않았습니다.

## 구현 완료 항목

1. 브랜드 분야 정규화와 진입 경로
   - `brand_category`를 `beauty`, `fashion`, `hybrid`로 정규화합니다.
   - 한국어/영어 표기, 구분 기호가 섞인 K-뷰티/K-패션/복합 값을 처리합니다.
   - K-뷰티와 복합 브랜드는 `/dashboard/beauty`, K-패션과 누락/알 수 없는 legacy 값은 `/dashboard/designer/brand`로 이동합니다.
   - 비밀번호 로그인, Google 로그인, 로그인 상태 CTA, master workspace switcher가 동일한 routing helper를 사용합니다.
   - `/dashboard/beauty` 직접 진입 시 로그인 후 beauty 경로로 복귀하며, 로그인된 fashion 파트너가 직접 접근하면 기존 designer brand 화면으로 되돌아갑니다.
2. 뷰티 파트너 shell
   - 기존 designer studio와 분리된 K-MODU 뷰티 파트너 header/sidebar/mobile navigation을 추가했습니다.
   - primary navigation은 홈, 브랜드 프로필, 상품 관리입니다.
   - Task 4용 캠페인, 크리에이터 매칭, 거래 관리 destination을 준비 중 상태로 명확히 예약했습니다.
   - Pretendard 기반 desktop/mobile 반응형 CSS를 추가했습니다.
3. 뷰티 파트너 홈
   - 실제 브랜드 필드, 승인된 대표 이미지, 전체/공개 상품 수만 사용합니다.
   - 프로필 완성도와 현재 데이터에 따른 다음 작업을 표시합니다.
   - 매출, 조회, 전환 같은 근거 없는 지표를 만들지 않았습니다.
4. 브랜드 프로필과 상품 관리 재사용
   - 기존 `getPortfolioImagesForDesigner`, `getProductsForDesigner` 조회를 owning designer ID로 호출합니다.
   - 기존 `BrandProfileStudio`, `ProductManager`, upload/profile/product API를 그대로 재사용합니다.
   - 두 공유 컴포넌트에는 기본값이 `fashion`인 선택적 `beauty` mode만 추가했습니다. 기존 designer 렌더링의 기본 문구와 동작은 유지됩니다.
   - beauty mode는 담당자/브랜드 키워드 용어와 스킨케어, 메이크업, 헤어·바디, 기타 상품 분류를 제공합니다.
   - 상품 생성, 수정, 공개/비공개, 삭제는 기존 ownership-safe API 경계를 그대로 사용합니다.
5. 권한과 회귀 보호
   - beauty layout은 기존 `requireApprovedDesigner`를 사용해 비파트너 접근을 차단합니다.
   - 모든 브랜드/상품 조회와 mutation은 인증된 designer ID로 제한됩니다.
   - `/dashboard/designer/*` route 파일과 `StudioNav.tsx`는 수정하지 않았고 기준 해시 테스트를 통과합니다.
   - 구현 전 stale 상태였던 designer layout 회귀 해시는 실제 Task 3 기준 커밋 `0ec06b2`의 정규화 해시로 갱신했습니다.

## 변경 파일

### 신규

- `src/app/dashboard/beauty/layout.tsx`
- `src/app/dashboard/beauty/page.tsx`
- `src/app/dashboard/beauty/brand/page.tsx`
- `src/app/dashboard/beauty/products/page.tsx`
- `src/app/dashboard/beauty/beauty.css`
- `src/components/BeautyPartnerNav.tsx`
- `src/components/BeautyPartnerHome.tsx`
- `src/lib/brand-partner-center.js`
- `src/lib/brand-partner-center.d.ts`
- `tests/brand-partner-routing.test.ts`
- `tests/beauty-partner-center.test.mjs`

### 수정

- `src/lib/auth.ts`
- `src/lib/master-admin.ts`
- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/google/callback/route.ts`
- `src/app/api/auth/me/route.ts`
- `src/components/LoginForm.tsx`
- `src/components/MasterRoleSwitcher.tsx`
- `src/components/BrandProfileStudio.tsx`
- `src/components/ProductManager.tsx`
- `tests/agency-auth.test.mjs`
- `tests/master-admin.test.mjs`
- `tests/master-role-switcher-ui.test.mjs`
- `tests/creator-center-regression.test.mjs`

## TDD 기록

### RED

- `node --import tsx --test tests/brand-partner-routing.test.ts`
  - 실패: `src/lib/brand-partner-center`가 존재하지 않아 module not found.
- `node --test tests/beauty-partner-center.test.mjs`
  - 실패: beauty layout/page/components/CSS가 존재하지 않아 3개 계약 실패, designer 기준 해시 검사는 통과.
- `node --test tests/master-admin.test.mjs tests/master-role-switcher-ui.test.mjs`
  - 실패: category-aware master destination 함수와 UI 연결이 존재하지 않아 2개 실패.
- `node --test tests/beauty-partner-center.test.mjs` (직접 진입 복귀 경계)
  - 실패: beauty layout이 `requireApprovedDesigner()` 기본 fashion login destination을 사용.

### GREEN / 최종 focused verification

| 명령 | 결과 |
| --- | --- |
| `node --import tsx --test tests/brand-partner-routing.test.ts` | PASS — 4 tests, 0 failures |
| `node --test tests/beauty-partner-center.test.mjs tests/creator-center-regression.test.mjs tests/master-admin.test.mjs tests/master-role-switcher-ui.test.mjs` | PASS — 10 tests, 0 failures |
| `node --experimental-test-module-mocks --import tsx --test tests/agency-auth.test.mjs` | PASS — 9 tests, 0 failures |
| `npx tsc --noEmit --pretty false` | PASS — type errors 0 |
| `git diff --check` | PASS — whitespace errors 0 |

Focused 합계: 23 tests, 23 pass, 0 failures.

## Production build

- 명령: `npm run build`
- 결과: PASS.
- Next.js 16.2.6 production compile 및 TypeScript가 성공했고 62개 static page generation을 완료했습니다.
- `/dashboard/beauty`, `/dashboard/beauty/brand`, `/dashboard/beauty/products` route가 build output에 포함됐습니다.
- 기존 경고: 다중 lockfile에 따른 workspace root 추론 경고와 `src/app/assets/[...path]/route.ts`의 NFT dynamic file tracing 경고가 출력됐습니다. 빌드 결과에는 영향을 주지 않았습니다.

## Self-review

- brief의 category mapping, legacy fallback, shell/navigation, real-data home, shared profile/product operations, master switcher, authorization, designer regression 항목을 각각 코드와 focused test에 대응시켰습니다.
- 별도 beauty 브랜드/상품 레코드나 mutation API를 만들지 않았습니다.
- home의 independent reads는 `Promise.all`로 병렬 실행합니다.
- Server Components가 owner-scoped data를 읽고, client editor에는 직렬화 가능한 기존 row 배열과 plain object만 전달합니다.
- `BrandProfileStudio`와 `ProductManager`의 default mode는 `fashion`이며 beauty 전용 분기 외 기존 요청 endpoint와 mutation payload를 변경하지 않았습니다.
- `git diff -- src/app/dashboard/designer src/components/StudioNav.tsx` 결과가 비어 있음을 확인했습니다.
- category helper의 unknown/missing fallback, hybrid routing, malicious protocol-relative `next` fallback, master destination을 순수 함수 테스트로 검증했습니다.

## Concerns

1. 사용자 요청에 따라 browser visual verification을 생략했습니다. desktop/mobile 반응형 계약은 source/CSS focused test와 production build로 검증했지만 실제 렌더 screenshot은 없습니다.
2. 변경 사항은 배포하지 않았습니다. 직접 확인 경로는 개발 서버 실행 후 `/dashboard/beauty`, `/dashboard/beauty/brand`, `/dashboard/beauty/products`이며 승인된 K-뷰티 또는 복합 파트너 세션이 필요합니다.
3. production build에는 기존 multi-lockfile workspace root 및 NFT tracing 경고가 남아 있습니다.
4. 기존 shared editor의 client-side mutation 로직을 재사용했기 때문에 beauty와 fashion UI는 같은 API field(`designer_name`, `color`)를 각 화면 용어로 표시합니다. DB schema 변경 없이 호환성을 유지하기 위한 의도된 매핑입니다.
