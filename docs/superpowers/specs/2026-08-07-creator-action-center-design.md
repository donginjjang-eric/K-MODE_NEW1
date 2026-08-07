# K-MODU 크리에이터 액션 센터 설계

## 1. 목표

기존 디자이너 스튜디오를 변경하지 않고, 승인된 크리에이터가 추천 캠페인을 찾고 신청하며 콘텐츠 제출·검수·성과·정산까지 처리하는 독립적인 크리에이터 센터를 구축한다.

핵심 원칙은 **한 화면에서 다음 행동을 바로 찾을 수 있어야 한다**는 것이다.

## 2. 범위와 보존 원칙

### 포함

- 운영자가 기존 크리에이터 프로필과 Google 이메일을 연결하고 승인
- 승인된 크리에이터만 `/dashboard/creator` 접근
- 행동 중심 홈
- 추천 캠페인 검색 및 신청
- 브랜드 또는 운영자가 보낸 초대 확인과 수락
- 내 캠페인과 단계별 미션
- 콘텐츠 링크 제출, 수정 요청 확인, 재제출
- 게시 링크와 기본 성과 입력
- 예상 수익 및 정산 상태 조회
- 운영자용 크리에이터 계정 연결·승인 기능

### 제외

- 기존 디자이너 스튜디오 메뉴, 레이아웃, 상품, AI 룩, 룩북 기능 변경
- 크리에이터가 브랜드 상품이나 디자이너 데이터를 직접 수정하는 기능
- 자동 송금, 세금계산서, 해외 결제
- 실시간 채팅
- 크리에이터 자유가입 즉시 승인
- 완전 자동 추천 알고리즘

디자이너 스튜디오와 맞물리는 기능은 공유 캠페인 데이터와 검수 상태에 한정한다. 첫 버전에서는 디자이너 스튜디오 UI를 수정하지 않는다.

## 3. 사용자와 권한

### 크리에이터

- Google 로그인 사용
- 운영자가 `creator_key`와 Google 이메일을 연결한 승인 계정만 입장
- 자신의 캠페인, 콘텐츠, 성과, 정산만 조회·수정
- 추천 캠페인 신청 가능
- 초대받은 캠페인 수락 또는 거절 가능

### 운영자

- 기존 공개 크리에이터 목록에서 프로필 선택
- Google 이메일 연결
- 계정 승인·비활성화
- 캠페인 생성과 크리에이터 초대
- 신청 승인·거절
- 콘텐츠 검수 상태와 정산 상태 관리

### 디자이너

- 기존 `designer` 권한과 스튜디오를 그대로 유지
- 향후 공유 캠페인 API를 통해 초대, 검수, 성과 상태만 연결
- 이번 구현 범위에서는 디자이너 화면을 변경하지 않음

## 4. 인증 구조

기존 `User.role`에 `creator`를 추가한다. Google 로그인 콜백은 이메일과 연결된 승인 크리에이터 계정을 찾으면 `/dashboard/creator`로 이동한다.

승인되지 않은 Google 계정은 크리에이터 센터에 접근할 수 없다. 로그인 화면에는 일반 로그인 흐름을 유지하고, 역할 판정은 서버에서 수행한다.

필요한 서버 가드:

- `requireApprovedCreator()`
- `getApprovedCreatorForApi()`

관리자가 비활성화하면 기존 세션이 있어도 다음 서버 요청부터 접근을 차단한다.

## 5. 화면 구조

### PC

왼쪽 고정 메뉴와 오른쪽 콘텐츠 영역을 사용한다.

메뉴:

1. 홈
2. 추천 캠페인
3. 내 캠페인
4. 콘텐츠 제출
5. 성과·정산
6. 프로필

홈의 정보 우선순위:

1. 오늘 할 일
2. 마감 임박 미션
3. 추천 캠페인
4. 진행 중 캠페인
5. 예상 수익과 정산 대기

### 모바일

- 상단 K-MODU 로고와 메뉴 버튼
- 첫 화면에 오늘 할 일 카드
- 한 개의 핵심 CTA만 강조
- 추천 캠페인은 세로 카드
- 하단 탭: 홈, 캠페인, 미션, 정산, 내 정보
- 가로 스크롤 없이 390px 기준 동작

## 6. 캠페인 흐름

공통 상태는 다음 순서를 사용한다.

1. `applied` — 크리에이터 신청
2. `invited` — 브랜드 또는 운영자 초대
3. `matched` — 참여 확정
4. `shipping` — 제품 발송 및 수령
5. `creating` — 콘텐츠 제작
6. `review` — 콘텐츠 검수
7. `published` — 게시 완료
8. `settlement` — 성과 집계 및 정산 대기
9. `completed` — 정산 완료
10. `cancelled` — 취소 또는 거절

신청형 캠페인은 `applied`에서 시작하고 초대형 캠페인은 `invited`에서 시작한다. 수락·승인 후 모두 `matched`로 합쳐진다.

각 캠페인은 현재 단계에 맞는 다음 행동 하나를 제공한다.

- 신청 확인
- 초대 수락
- 배송 정보 확인
- 콘텐츠 제출
- 수정본 재제출
- 게시 링크 등록
- 성과 입력
- 정산 확인

## 7. 데이터 모델

### `creator_accounts`

- `id`
- `user_id`
- `creator_key`
- `display_name`
- `google_email`
- `approval_status`: `pending | approved | disabled`
- `platform`
- `market`
- `categories`
- `created_at`, `updated_at`

### `campaigns`

- `id`
- `owner_type`: 첫 버전은 `admin`
- `owner_id`
- `title`
- `category`
- `markets`
- `platforms`
- `brief`
- `reward_text`
- `application_deadline`
- `content_deadline`
- `slots`
- `status`: `draft | recruiting | active | closed`
- `created_at`, `updated_at`

### `campaign_participations`

- `id`
- `campaign_id`
- `creator_account_id`
- `source`: `application | invitation`
- `status`: 캠페인 흐름 상태
- `next_action`
- `shipping_note`
- `expected_reward`
- `settlement_status`: `none | pending | confirmed | paid`
- `created_at`, `updated_at`

한 캠페인과 한 크리에이터 조합에는 참여 레코드 하나만 허용한다.

### `content_submissions`

- `id`
- `participation_id`
- `version`
- `content_url`
- `caption_text`
- `status`: `submitted | revision_requested | approved | published`
- `review_note`
- `published_url`
- `submitted_at`, `reviewed_at`, `published_at`

### `campaign_events`

- `id`
- `participation_id`
- `actor_user_id`
- `event_type`
- `from_status`, `to_status`
- `message`
- `created_at`

상태 변경은 항상 이벤트 이력을 남긴다.

### `campaign_performance`

- `participation_id`
- `views`
- `likes`
- `comments`
- `orders`
- `revenue`
- `currency`
- `updated_at`

## 8. 추천 방식

첫 버전은 설명 가능한 규칙 기반 점수를 사용한다.

- 국가 일치: 40점
- 플랫폼 일치: 30점
- 카테고리 일치: 20점
- 모집 마감 여유: 10점

점수가 같은 경우 마감이 가까운 캠페인을 먼저 보여준다. 크리에이터에게는 점수 대신 `국가 일치`, `플랫폼 일치`, `뷰티 적합` 같은 근거 태그를 표시한다.

## 9. 오류와 예외 처리

- 미승인 계정: 로그인 안내 페이지로 이동
- 이미 신청한 캠페인: 중복 신청 차단 후 현재 상태 표시
- 모집 종료 캠페인: 신청 버튼 비활성화
- 권한 없는 참여 데이터 접근: 404로 응답해 존재 여부를 노출하지 않음
- 잘못된 상태 이동: 서버에서 거절
- 콘텐츠 URL 오류: HTTPS URL만 허용하고 인라인 오류 표시
- 네트워크 오류: 입력값을 유지하고 재시도 버튼 제공
- 빈 상태: 다음 행동 또는 추천 캠페인으로 이동하는 CTA 제공

## 10. 테스트와 완료 기준

### 자동 테스트

- 승인된 크리에이터만 접근
- 다른 크리에이터의 참여 데이터 접근 차단
- 신청과 초대 흐름이 `matched`로 합쳐짐
- 중복 신청 차단
- 허용된 상태 전이만 성공
- 콘텐츠 재제출 시 버전 증가
- 추천 점수 계산
- 정산 데이터 읽기 권한

### 브라우저 검수

- PC 1440px에서 왼쪽 메뉴와 행동 카드 정상 표시
- 모바일 390px에서 가로 넘침 없음
- 오늘 할 일의 핵심 CTA가 첫 화면에 표시
- 추천 캠페인 신청 후 내 캠페인에 반영
- 콘텐츠 제출·수정 요청·재제출 흐름 확인
- 디자이너 스튜디오 주요 경로와 기존 인증 회귀 확인

## 11. 구현 순서

1. 크리에이터 계정 연결과 승인
2. 독립 레이아웃과 행동 중심 홈
3. 추천 캠페인과 신청·초대
4. 내 캠페인 상태와 다음 행동
5. 콘텐츠 제출·검수
6. 성과·정산 조회
7. 운영자 관리 화면

첫 배포는 운영자 승인 계정과 데모 캠페인 데이터로 검수한 뒤 실제 캠페인을 등록한다.
