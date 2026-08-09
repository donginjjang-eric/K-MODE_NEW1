import assert from "node:assert/strict";
import test from "node:test";
import {
  isActiveMission,
  isCompletedMission,
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
