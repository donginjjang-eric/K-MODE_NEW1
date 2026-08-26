# 관리자 콘솔·뷰티 파트너 센터 구현 계획

## 목표
관리자 콘솔의 오류와 긴 목록 UX를 개선하고, 기존 패션 디자이너 스튜디오는 유지하면서 K-뷰티 브랜드가 상품·캠페인·거래를 관리하는 별도 파트너 센터를 제공한다.

## 전역 제약
- 기존 `/dashboard/designer/*` 패션 디자이너 스튜디오의 화면과 동작은 변경하지 않는다.
- 내부 호환성을 위해 기존 `designer` 역할 키는 유지하고, `brand_category`로 K-뷰티·K-패션·복합 파트너를 구분한다.
- 관리자 등록 카탈로그 크리에이터와 실제 가입·승인 대기 회원을 명확히 구분한다.
- 모든 신규 관리자/파트너 화면은 Pretendard 기반 한국어 UI와 PC·모바일 반응형을 지원한다.
- 기존 상품·캠페인·제안·주문 데이터/API를 우선 재사용한다.
- 각 작업은 테스트, 프로덕션 빌드, PC·모바일 브라우저 검증을 거친다.

## Task 1: 캠페인 운영 오류 및 한글화
**Files:** `src/components/AdminCampaignForm.tsx`, `src/components/AdminCampaignList.tsx`, `src/components/AdminCampaignStatusAction.tsx`, `src/components/AdminCampaignOperations.tsx`, `src/app/dashboard/admin/campaigns/[id]/page.tsx`, `src/lib/admin-campaign.ts`, `tests/admin-campaign-domain.test.ts`

**Requirements:**
- Date/string/nullable 마감일을 `datetime-local` 값으로 안전하게 변환해 편집 페이지 500 오류를 제거한다.
- 캠페인 상태, 참여자, 초대, 버튼, 빈 상태를 자연스러운 한국어로 통일한다.
- 기존 캠페인 생성·편집·상태 변경 동작은 유지한다.

## Task 2: 관리자 목록·승인 UX 및 운영 홈
**Files:** `src/app/dashboard/admin/page.tsx`, `src/components/AdminUsersManager.tsx`, `src/components/AdminCreatorManagementTable.tsx`, `src/components/AdminProductsManager.tsx`, `src/app/dashboard/admin/designers/page.tsx`, `src/app/dashboard/admin/generated-looks/page.tsx`, `src/lib/db.ts`, relevant tests

**Requirements:**
- 운영 홈에 승인 대기, 검수 대기, 최근 활동을 바로 처리할 수 있는 액션 센터를 제공한다.
- 긴 목록에 페이지당 20개 기준 페이지네이션과 결과 수·현재 범위를 제공한다.
- 실제 가입 승인 대기와 관리자 등록 카탈로그 크리에이터를 서로 다른 상태·행동으로 표시한다.
- 회원 관리 목록에서 승인 대기 계정을 페이지 이동 없이 우측 패널 또는 모달로 검토·승인·보류할 수 있게 한다.
- 브랜드 파트너 목록에 검색, 분야, 상태 필터를 제공한다.
- 이미지 로딩 실패 시 깨진 카드 대신 일관된 대체 상태를 표시한다.

## Task 3: 뷰티 파트너 센터 기반 구조
**Files:** `src/app/dashboard/beauty/layout.tsx`, `src/app/dashboard/beauty/page.tsx`, `src/app/dashboard/beauty/brand/page.tsx`, `src/app/dashboard/beauty/products/page.tsx`, `src/components/BeautyPartnerNav.tsx`, `src/components/BeautyPartnerHome.tsx`, role routing/auth helpers, tests

**Requirements:**
- K-뷰티/복합 브랜드 파트너는 로그인 후 뷰티 파트너 센터로 이동한다.
- K-패션 파트너는 기존 디자이너 스튜디오를 그대로 사용한다.
- 뷰티 센터는 홈, 브랜드 프로필, 상품 관리 메뉴를 우선 제공하고 기존 상품 CRUD를 재사용한다.
- 마스터 관리자는 관리자 콘솔·크리에이터 센터·브랜드 파트너 센터 전환을 유지한다.

## Task 4: 뷰티 캠페인·매칭·거래 운영 화면
**Files:** `src/app/dashboard/beauty/campaigns/page.tsx`, `src/app/dashboard/beauty/proposals/page.tsx`, `src/app/dashboard/beauty/content/page.tsx`, `src/app/dashboard/beauty/orders/page.tsx`, `src/app/dashboard/beauty/settlements/page.tsx`, shared components, tests

**Requirements:**
- 뷰티 브랜드가 상품 기반 캠페인을 만들고 크리에이터 매칭 현황을 확인한다.
- 제안·거래·콘텐츠 검수·주문/성과·정산을 같은 센터에서 조회한다.
- 데이터가 없는 기능은 가짜 수치를 만들지 않고 다음 행동이 분명한 빈 상태를 제공한다.
- 권한은 본인 브랜드 데이터 범위로 제한한다.

## Task 5: 통합 검증·배포
**Requirements:**
- 관련 단위 테스트와 전체 프로덕션 빌드를 통과한다.
- 관리자 핵심 페이지와 뷰티 파트너 센터를 Chrome PC·모바일에서 직접 점검한다.
- 기존 디자이너 스튜디오의 핵심 페이지가 변하지 않았는지 회귀 확인한다.
- 변경사항을 커밋·푸시하고 Railway 배포 완료 후 운영 URL에서 재검증한다.
