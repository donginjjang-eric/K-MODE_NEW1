# Task 2 보고서: 관리자 체험 데이터 제어

## 상태

`DONE`

관리자 전용 체험 데이터 생성·초기화 서버 액션과 기존 관리자 운영 모드 배너의 제어 UI를 구현했습니다. 실제 데모 데이터는 아직 생성하지 않았습니다.

## 구현 범위

- `src/app/dashboard/creator/demo-actions.ts`
  - `seedDemoAction()`과 `resetDemoAction()`을 추가했습니다.
  - 각 액션은 요청마다 현재 사용자를 다시 읽고 `admin` 역할을 확인합니다.
  - 승인된 관리자 전용 CreatorAccount를 다시 가져온 뒤에만 Task 1의 안전한 데모 도메인 함수를 호출합니다.
  - 다음 크리에이터 센터 경로를 모두 재검증합니다.
    - `/dashboard/creator`
    - `/dashboard/creator/campaigns`
    - `/dashboard/creator/my-campaigns`
    - `/dashboard/creator/submissions`
    - `/dashboard/creator/settlement`
- `src/components/CreatorDemoControls.tsx`
  - 관리자 배너에 `체험 데이터 채우기`, `체험 데이터 초기화` 버튼을 추가했습니다.
- `src/app/dashboard/creator/layout.tsx`
  - 관리자에게만 제어 UI를 렌더링하도록 연결했습니다.
- `src/app/dashboard/creator/creator.css`
  - 데스크톱과 모바일 배너에서 버튼이 짧고 읽기 쉽게 정렬되도록 스타일을 추가했습니다.
- `tests/creator-beauty-demo-controls.test.mjs`
  - 관리자 권한 재검증, Task 1 함수 연결, 모든 크리에이터 경로 재검증, 버튼·배너 연결을 계약으로 검증합니다.

## TDD 증거

RED:

```text
node --test tests/creator-beauty-demo-controls.test.mjs
FAIL: ENOENT src/app/dashboard/creator/demo-actions.ts
```

GREEN:

```text
node --test tests/creator-beauty-demo-controls.test.mjs
1 passed, 0 failed
```

## 검증

```text
node --test tests/creator-beauty-demo-domain.test.mjs tests/creator-beauty-demo-controls.test.mjs tests/creator-mission-contract.test.mjs tests/creator-performance-contract.test.mjs tests/admin-creator-preview-contract.test.mjs
17 passed, 0 failed

cmd /c npx tsc --noEmit
exit code 0

cmd /c npm.cmd run build
exit code 0
```

빌드는 기존 프로젝트의 다중 lockfile 및 assets route 추적 경고 2건을 출력했지만 컴파일·타입 검사·정적 페이지 생성은 모두 성공했습니다.

## 자체 검토

- 서버 액션은 UI 렌더링 조건과 별개로 매 요청마다 관리자 역할을 재검증합니다.
- UI는 관리자 배너에서만 렌더링되며 일반 크리에이터에게 노출되지 않습니다.
- 액션은 Task 1의 관리자 소유 CreatorAccount와 고정 `demo-beauty-` 데이터 보호 검증을 우회하지 않습니다.
- 제어 버튼은 아직 실행하지 않았으므로 운영 DB에 체험 데이터가 추가되거나 초기화되지 않았습니다.

## 우려 사항

1. 로컬 서버에서 관리자 세션을 공유할 수 없어 실제 로그인된 화면의 시각 검수는 하지 못했습니다. 로컬 URL은 로그인 페이지로 리디렉션됐고, 컴파일·타입·계약 검증으로 확인했습니다.
2. 초기화 버튼은 Task 1의 데모 데이터만 대상으로 하지만, 운영 사용 전에는 관리자 화면에서 한 번 시드·초기화 동작을 확인해야 합니다.

## 리뷰 수정 라운드 1 — I1

### 지적 내용

데모 생성·초기화 뒤 목록 페이지들만 재검증하고, 동적 미션 상세와 profile 및 이후 활동·수익센터 경로가 누락돼 있었습니다.

### 수정 내용

`revalidateCreatorCenter()`에 다음 경로를 명시적으로 추가했습니다.

- `/dashboard/creator/my-campaigns/[id]` with Next `page` type
- `/dashboard/creator/profile`
- `/dashboard/creator/performance`
- `/dashboard/creator/grade`

### RED/GREEN

RED:

```text
node --test tests/creator-beauty-demo-controls.test.mjs
FAIL: dynamic /dashboard/creator/my-campaigns/[id] page revalidation was missing
```

GREEN:

```text
node --test tests/creator-beauty-demo-controls.test.mjs
1 passed, 0 failed

cmd /c npx tsc --noEmit
exit code 0
```

## 최종 상태

`DONE` — I1에서 지적된 동적 상세·profile·향후 활동·수익센터 경로 누락을 수정했고, Task 2 범위의 계약 테스트와 TypeScript 검증을 통과했습니다.
