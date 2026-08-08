# Task 1 보고서: Creator Beauty Demo Domain

## 상태

`DONE_WITH_CONCERNS`

Task 1의 도메인 함수와 계약 테스트를 구현하고 검증했습니다. Task 2 이후 범위인 관리자 버튼·서버 액션·화면 연결은 구현하지 않았습니다.

## 구현 범위

한국 공급자가 말레이시아·베트남 크리에이터와 협업하는 데모 흐름을 고정 데이터로 제공합니다.

- `demo-beauty-serum-recruiting`: 참여 전, Malaysia, `RM 420`
- `demo-beauty-cream-invited`: 초대 상태, Vietnam, `VND 2,500,000`
- `demo-beauty-suncushion-review`: 콘텐츠 검수 상태, Vietnam, `VND 2,500,000`
- `demo-beauty-liptint-completed`: 게시·성과·정산 완료, Malaysia, `RM 420`

완료 캠페인에는 다음 성과가 기록됩니다.

- 조회수 `184,200`
- 좋아요 `12,740`
- 댓글 `386`
- 주문 `86`
- 매출 `12,900 MYR`
- 정산 상태 `paid`

## 변경 파일

- `src/lib/creator-demo.ts`
  - `seedCreatorBeautyDemo(adminUserId, creatorAccountId)`
  - `resetCreatorBeautyDemo(adminUserId, creatorAccountId)`
  - 캠페인·참여·이벤트·제출물·성과 upsert
  - 관리자 및 관리자 소유의 승인된 CreatorAccount 검증
  - 고정 데모 ID 충돌 방지
  - 데모 캠페인만 삭제하는 reset
- `tests/creator-beauty-demo-domain.test.mjs`
  - Task 1 계약 테스트
  - 해외 시장·통화·성과 데이터 검증
  - 권한·충돌 방지 검증

## RED 증거

구현 파일을 만들기 전에 다음 명령을 실행했습니다.

```text
node --test tests/creator-beauty-demo-domain.test.mjs
```

결과: 4개 테스트 실패. 원인은 예상대로 `src/lib/creator-demo.ts`가 존재하지 않는 `ENOENT`였습니다.

## GREEN 증거

구현 후 다음 결과를 확인했습니다.

```text
node --test tests/creator-beauty-demo-domain.test.mjs
5 passed, 0 failed
```

관련 회귀 계약 테스트:

```text
node --test tests/creator-beauty-demo-domain.test.mjs tests/creator-schema.test.mjs tests/creator-mission-contract.test.mjs tests/creator-performance-contract.test.mjs tests/admin-creator-preview-contract.test.mjs
16 passed, 0 failed
```

TypeScript 검사:

```text
cmd /c npx.cmd tsc --noEmit
exit code 0
```

## 자체 검토

- 모든 데모 ID는 `demo-beauty-` 접두사를 사용합니다.
- 모든 캠페인 제목은 `[DEMO]`로 시작합니다.
- 시드와 reset은 `withDatabaseTransaction` 내부에서 실행됩니다.
- 모든 데모 테이블 쓰기는 고정 ID와 `ON CONFLICT` upsert를 사용해 반복 실행에 안전합니다.
- 관리자 역할과 관리자 계정에 연결된 승인 CreatorAccount를 트랜잭션 안에서 `FOR UPDATE`로 검증합니다.
- 고정 ID가 실제 캠페인 또는 다른 관리자 소유 데이터와 충돌하면 `Demo campaign ID collision`으로 중단합니다.
- reset은 고정 데모 ID, 관리자 owner, `[DEMO]` 제목 조건을 모두 만족하는 캠페인만 삭제하며 하위 데모 레코드는 FK cascade로 함께 정리됩니다.
- 실제 CreatorAccount, 실제 캠페인, 실제 참여 데이터의 조회·수정·삭제 로직은 추가하지 않았습니다.

## 우려 사항

1. Task 1은 도메인 함수만 구현했으므로 현재 관리자 화면에서 시드/reset 버튼을 호출하지 않습니다. 이 연결은 Task 2 범위입니다.
2. 실제 PostgreSQL에 시드를 실행하는 통합 테스트는 운영 데이터 보호를 위해 수행하지 않았습니다. 계약·타입 검증만 실행했습니다.
3. 실제 실행 전에는 관리자 UI에서 데모 배지와 reset 확인 절차를 Task 2에서 추가해야 합니다.

## 커밋

초기 구현 커밋: `b4b9311`

## Fix round 1

리뷰에서 지적된 하위 레코드 provenance 문제를 수정했습니다.

### 수정 내용

- 참여 레코드 전체를 데모 캠페인 관계, 관리자 CreatorAccount, source/status/action/reward/settlement payload와 함께 검증합니다.
- 이벤트 레코드 전체를 데모 참여 관계, 관리자 actor, event type/status/message payload와 함께 검증합니다.
- 제출물 레코드 전체를 데모 참여 관계와 version/content/status/review/publish payload와 함께 검증합니다.
- 성과 레코드는 데모 참여 관계와 views/likes/comments/orders/revenue/currency를 검증합니다.
- 고정 ID가 아닌 임의의 실제 하위 레코드가 데모 캠페인에 붙어 있어도 provenance 위반으로 거부합니다.
- seed와 reset 모두 하위 그래프 검증을 먼저 실행합니다. 따라서 reset의 FK cascade가 실제 하위 데이터를 삭제하기 전에 rollback됩니다.
- 반복 seed에서 이전에 정상 생성된 동일 payload만 허용하고, 같은 ID의 다른 payload는 충돌로 거부합니다.

### 추가 실행 테스트

새 테스트 파일:

- `tests/creator-beauty-demo-transaction-runner.mjs`

실제 `pg` 모듈을 트랜잭션 실행 모형으로 대체해 다음을 검증합니다.

- 반복 seed의 idempotency와 전체 그래프 개수
- 참여 고정 ID 충돌 보존
- reset 전 하위 데이터 충돌 거부와 cascade 방지
- 후속 제출물 SQL 실패 시 전체 rollback
- 비관리자 seed 거부와 rollback

### Fix round RED/GREEN

RED:

```text
node --experimental-test-module-mocks --import tsx --test tests/creator-beauty-demo-transaction-runner.mjs
```

기존 구현에서 고정 하위 ID 충돌 테스트가 예상대로 거부되지 않아 실패했습니다.

GREEN:

```text
creator-beauty-demo-transaction-runner.mjs: 5 passed, 0 failed
creator-beauty-demo-domain.test.mjs: 5 passed, 0 failed
관련 회귀 계약 테스트: 12 passed, 0 failed
cmd /c npx.cmd tsc --noEmit: exit code 0
```

### Fix round 커밋

수정 커밋: `8bcadb5`

## 추가 검증 증거

요청된 실행 명령으로 Fix round 실행 테스트를 재확인했습니다.

```text
node --import tsx --experimental-test-module-mocks --test tests/creator-beauty-demo-transaction-runner.mjs
5 passed, 0 failed
```
