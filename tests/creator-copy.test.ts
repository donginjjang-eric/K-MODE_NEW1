import assert from "node:assert/strict";
import test from "node:test";
import {
  creatorFieldLabel,
  creatorMatchReasonLabel,
  creatorStatusLabel,
} from "../src/lib/creator-copy";

test("크리에이터 진행 상태를 쉬운 한국어로 표시한다", () => {
  assert.equal(creatorStatusLabel("invited"), "초대됨");
  assert.equal(creatorStatusLabel("creating"), "제작 중");
  assert.equal(creatorStatusLabel("review"), "검수 중");
  assert.equal(creatorStatusLabel("published"), "게시 완료");
  assert.equal(creatorStatusLabel("settlement"), "정산 중");
});

test("추천 이유를 사용자가 이해할 수 있는 한국어로 표시한다", () => {
  assert.equal(creatorMatchReasonLabel("market"), "활동 국가 적합");
  assert.equal(creatorMatchReasonLabel("platform"), "활동 채널 적합");
  assert.equal(creatorMatchReasonLabel("category"), "관심 분야 적합");
  assert.equal(creatorMatchReasonLabel("deadline"), "현재 모집 중");
});

test("성과 입력 항목을 한국어로 표시하고 알 수 없는 값은 보존한다", () => {
  assert.equal(creatorFieldLabel("views"), "조회수");
  assert.equal(creatorFieldLabel("revenue"), "매출");
  assert.equal(creatorFieldLabel("unknown"), "unknown");
});
