import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("creator center exposes the approved seven-step navigation", async () => {
  const nav = await readFile(new URL("src/components/CreatorNav.tsx", root), "utf8");
  for (const label of ["홈", "추천 캠페인", "내 미션", "콘텐츠 제작", "성과", "수익·정산", "등급"]) {
    assert.match(nav, new RegExp(label));
  }
  assert.match(nav, /dashboard\/creator\/performance/);
  assert.match(nav, /dashboard\/creator\/grade/);
});

test("activity home shows overseas-creator KPIs and the five-stage mission board", async () => {
  const home = await readFile(new URL("src/app/dashboard/creator/page.tsx", root), "utf8");
  for (const label of ["추천 캠페인", "오늘 마감", "예상 수익", "누적 주문", "내 미션 보드"]) {
    assert.match(home, new RegExp(label));
  }
  for (const stage of ["제품 수령", "콘텐츠 제작", "검수", "게시", "정산"]) {
    assert.match(home, new RegExp(stage));
  }
  assert.match(home, /한국 공급자/);
  assert.match(home, /해외 크리에이터/);
});

test("creator center totals only accepted active work in the creator local currency", async () => {
  const { buildCreatorCenterMetrics } = await import("../src/lib/creator-center.ts");
  const metrics = buildCreatorCenterMetrics({
    market: "Malaysia",
    recommendedCount: 12,
    deadlineCount: 2,
    workItems: [
      { status: "matched", expectedReward: "RM 420", settlementStatus: "none" },
      { status: "review", expectedReward: "RM 80", settlementStatus: "pending" },
      { status: "invited", expectedReward: "RM 900", settlementStatus: "none" },
      { status: "completed", expectedReward: "RM 700", settlementStatus: "paid" },
      { status: "cancelled", expectedReward: "RM 300", settlementStatus: "none" },
      { status: "creating", expectedReward: "VND 2,500,000", settlementStatus: "none" },
    ],
    performanceRows: [{ orders: 80 }, { orders: 6 }],
  });
  assert.deepEqual(metrics, {
    recommendedCount: 12,
    deadlineCount: 2,
    expectedEarnings: "RM 500",
    totalOrders: 86,
  });
});

test("creator center never substitutes a foreign-currency reward", async () => {
  const { buildCreatorCenterMetrics } = await import("../src/lib/creator-center.ts");
  const metrics = buildCreatorCenterMetrics({
    market: "Vietnam",
    recommendedCount: 0,
    deadlineCount: 0,
    workItems: [{ status: "creating", expectedReward: "RM 420", settlementStatus: "none" }],
    performanceRows: [],
  });
  assert.equal(metrics.expectedEarnings, "—");
});

test("mission stages distinguish pre-shipping work and exclude terminal missions from active selection", async () => {
  const { creatorGrade, isActiveMissionStatus, missionStageIndex, selectActiveMission } = await import("../src/lib/creator-center.ts");
  assert.equal(creatorGrade(0), "STARTER");
  assert.equal(creatorGrade(2), "RISING");
  assert.equal(creatorGrade(3), "PRO");
  assert.equal(missionStageIndex("invited"), -1);
  assert.equal(missionStageIndex("applied"), -1);
  assert.equal(missionStageIndex("matched"), -1);
  assert.equal(missionStageIndex("shipping"), 0);
  assert.equal(missionStageIndex("review"), 2);
  assert.equal(missionStageIndex("completed"), 4);
  assert.equal(missionStageIndex("cancelled"), -1);
  assert.equal(isActiveMissionStatus("cancelled"), false);
  assert.equal(isActiveMissionStatus("completed"), false);
  assert.equal(selectActiveMission([{ id: "done", status: "completed" }, { id: "cancelled", status: "cancelled" }, { id: "waiting", status: "invited" }])?.id, "waiting");
});

test("performance, grade and settlement routes carry creator-local context", async () => {
  const [performance, grade, settlement, submissions] = await Promise.all([
    readFile(new URL("src/app/dashboard/creator/performance/page.tsx", root), "utf8"),
    readFile(new URL("src/app/dashboard/creator/grade/page.tsx", root), "utf8"),
    readFile(new URL("src/app/dashboard/creator/settlement/page.tsx", root), "utf8"),
    readFile(new URL("src/app/dashboard/creator/submissions/page.tsx", root), "utf8"),
  ]);
  assert.match(performance, /조회/);
  assert.match(performance, /주문/);
  assert.match(performance, /매출/);
  assert.match(grade, /STARTER/);
  assert.match(grade, /RISING/);
  assert.match(grade, /PRO/);
  assert.match(settlement, /현지 통화/);
  assert.match(submissions, /콘텐츠 제작/);
});

test("critical center labels are translated to Malay, Vietnamese and English", async () => {
  const i18n = await readFile(new URL("site-i18n.js", root), "utf8");
  assert.match(i18n, /"오늘의 활동"\s*:\s*"Aktiviti hari ini"/);
  assert.match(i18n, /"수익·정산"\s*:\s*"Pendapatan · Penyelesaian"/);
  assert.match(i18n, /'오늘의 활동'\s*:\s*\['Hoạt động hôm nay',\s*'[^']+',\s*"Today's activity"\]/);
  assert.match(i18n, /'수익·정산'\s*:\s*\['Thu nhập · Quyết toán',\s*'[^']+',\s*'Earnings · Settlement'\]/);
  for (const label of [
    "내 국가와 채널에 맞는 제안", "오늘 신청이 끝나는 캠페인", "크리에이터 현지 통화 기준",
    "누적 주문", "게시 콘텐츠에서 발생한 누적 주문", "다음 단계 안내를 확인하세요.",
    "첫 캠페인을 준비하는 단계", "완료 캠페인 1~2건", "완료 캠페인 3건 이상",
    "제품 수령", "콘텐츠 제작", "검수", "게시", "정산", "미션 상세",
  ]) {
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(i18n, new RegExp(`['\"]${escapedLabel}['\"]\\s*:`), `${label} needs an overseas translation entry`);
  }
});
