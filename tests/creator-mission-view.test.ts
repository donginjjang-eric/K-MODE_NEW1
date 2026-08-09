import assert from "node:assert/strict";
import test from "node:test";
import {
  isActiveMission,
  isCompletedMission,
  missionBriefLabel,
  missionImage,
  missionStageIndex,
} from "../src/lib/creator-mission-view";

test("미션 상태를 진행 단계 순서로 변환한다", () => {
  assert.equal(missionStageIndex("applied"), 0);
  assert.equal(missionStageIndex("matched"), 1);
  assert.equal(missionStageIndex("shipping"), 2);
  assert.equal(missionStageIndex("creating"), 3);
  assert.equal(missionStageIndex("review"), 4);
  assert.equal(missionStageIndex("published"), 5);
  assert.equal(missionStageIndex("settlement"), 6);
  assert.equal(missionStageIndex("completed"), 7);
});

test("진행 중과 완료 미션을 분리한다", () => {
  assert.equal(isActiveMission("review"), true);
  assert.equal(isActiveMission("completed"), false);
  assert.equal(isActiveMission("cancelled"), false);
  assert.equal(isCompletedMission("completed"), true);
  assert.equal(isCompletedMission("shipping"), false);
});

test("카테고리에 맞는 대표 이미지를 선택한다", () => {
  assert.equal(missionImage("K-Beauty Skin Care"), "/assets/campaign-kdesigner-02.png");
  assert.equal(missionImage("Fashion"), "/assets/campaign-kdesigner-01.png");
});

test("등록된 체험 캠페인 설명만 자연스러운 한국어로 표시한다", () => {
  assert.equal(
    missionBriefLabel("Completed demo campaign connecting a Korean lip tint supplier with a Malaysia creator's content and sales funnel."),
    "한국 립 틴트 브랜드와 말레이시아 크리에이터가 콘텐츠 제작부터 판매까지 함께한 체험 캠페인입니다.",
  );
  assert.equal(missionBriefLabel("브랜드가 등록한 원문 설명"), "브랜드가 등록한 원문 설명");
});
