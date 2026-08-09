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

test("administrator preview shows a multi-currency reward breakdown without conversion", async () => {
  const { buildCreatorCenterMetrics } = await import("../src/lib/creator-center.ts");
  const metrics = buildCreatorCenterMetrics({
    market: "South Korea",
    administratorPreview: true,
    recommendedCount: 2,
    deadlineCount: 0,
    workItems: [
      { status: "review", expectedReward: "VND 2,500,000", settlementStatus: "pending" },
      { status: "completed", expectedReward: "RM 420", settlementStatus: "paid" },
      { status: "invited", expectedReward: "VND 9,999,999", settlementStatus: "none" },
    ],
    performanceRows: [],
  });
  assert.equal(metrics.expectedEarnings, "RM 420 · VND 2,500,000");
});

test("settlement reward totals use creator expected rewards and keep gross performance separate", async () => {
  const { summarizeCreatorSettlementRewards } = await import("../src/lib/creator-rewards.ts");
  const summary = summarizeCreatorSettlementRewards([
    { status: "review", expected_reward: "VND 2,500,000", settlement_status: "pending" },
    { status: "completed", expected_reward: "RM 420", settlement_status: "paid" },
    { status: "invited", expected_reward: "RM 900", settlement_status: "none" },
  ]);
  assert.deepEqual(summary, [
    { currency: "MYR", expected: 420, pending: 0, confirmed: 0, paid: 420 },
    { currency: "VND", expected: 2_500_000, pending: 2_500_000, confirmed: 0, paid: 0 },
  ]);

  const db = await readFile(new URL("src/lib/db.ts", root), "utf8");
  assert.match(db, /expected_reward/);
  assert.doesNotMatch(db.match(/export async function getCreatorSettlementSummary[\s\S]*?\n}/)?.[0] || "", /performance\.revenue/);
});

test("settlement ledger keeps real campaign rewards and maps payout progress", async () => {
  const { toCreatorSettlementItems } = await import("../src/lib/creator-rewards.ts");
  const items = toCreatorSettlementItems([
    { id: "paid", campaign_title: "Velvet Lip Tint", campaign_category: "K-Beauty", status: "completed", expected_reward: "RM 420", settlement_status: "paid", updated_at: "2026-07-05T00:00:00.000Z" },
    { id: "pending", campaign_title: "Skin Story", campaign_category: "Skincare", status: "review", expected_reward: "VND 2,500,000", settlement_status: "pending", updated_at: "2026-07-01T00:00:00.000Z" },
    { id: "future", campaign_title: "Ready Campaign", campaign_category: "Fashion", status: "matched", expected_reward: "USD 100", settlement_status: "none", updated_at: "2026-06-30T00:00:00.000Z" },
    { id: "cancelled", campaign_title: "Cancelled", campaign_category: "Beauty", status: "cancelled", expected_reward: "RM 999", settlement_status: "none", updated_at: "2026-06-20T00:00:00.000Z" },
    { id: "invalid", campaign_title: "Invalid", campaign_category: "Beauty", status: "completed", expected_reward: "협의", settlement_status: "paid", updated_at: "2026-06-10T00:00:00.000Z" },
  ]);

  assert.deepEqual(items.map(({ id, currency, amount, statusLabel, stageIndex }) => ({ id, currency, amount, statusLabel, stageIndex })), [
    { id: "paid", currency: "MYR", amount: 420, statusLabel: "지급 완료", stageIndex: 3 },
    { id: "pending", currency: "VND", amount: 2_500_000, statusLabel: "성과 확인", stageIndex: 0 },
    { id: "future", currency: "USD", amount: 100, statusLabel: "수익 예정", stageIndex: -1 },
  ]);
  assert.match(items[1].nextAction, /성과/);
});

test("mission stages distinguish pre-shipping work and exclude terminal missions from active selection", async () => {
  const { creatorGrade, isActiveMissionStatus, missionPreStageLabel, missionStageIndex, selectActiveMission } = await import("../src/lib/creator-center.ts");
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
  assert.deepEqual(
    [missionPreStageLabel("invited"), missionPreStageLabel("applied"), missionPreStageLabel("matched")],
    ["초대 확인 전", "지원 검토 중", "배송 준비 중"],
  );
});

test("creator rates and grade progress use honest zero-safe campaign thresholds", async () => {
  const { creatorRate, creatorGradeProgress } = await import("../src/lib/creator-center.ts");
  assert.equal(creatorRate(15, 100), 15);
  assert.equal(creatorRate(4, 0), 0);
  assert.deepEqual(creatorGradeProgress(0), { current: "STARTER", next: "RISING", remaining: 1, value: 0, max: 1 });
  assert.deepEqual(creatorGradeProgress(2), { current: "RISING", next: "PRO", remaining: 1, value: 2, max: 3 });
  assert.deepEqual(creatorGradeProgress(3), { current: "PRO", next: null, remaining: 0, value: 3, max: 3 });
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

test("core home actions have complete four-locale runtime dictionary entries", async () => {
  const i18n = await readFile(new URL("site-i18n.js", root), "utf8");
  const labels = [
    "한국 공급자의 K-뷰티·패션 제품을 해외 크리에이터의 콘텐츠와 판매로 연결합니다.",
    "전체 보기", "상세 보기", "보상 협의", "상시 모집", "마감",
    "초대 확인 전", "지원 검토 중", "배송 준비 중",
    "현재 조건에 맞는 추천 캠페인이 없습니다.", "진행 중인 미션이 없습니다.", "추천 캠페인 찾기",
  ];

  for (const label of labels) {
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const overseasEntry = new RegExp(`'${escapedLabel}'\\s*:\\s*\\[[^\\]]+,[^\\]]+,[^\\]]+\\]`);
    const malayEntry = new RegExp(`"${escapedLabel}"\\s*:\\s*"[^"]+"`);
    assert.match(i18n, overseasEntry, `${label} needs Vietnamese, Traditional Chinese and English`);
    assert.match(i18n, malayEntry, `${label} needs Malay`);
  }
});

test("dynamic creator-home and grade strings are composed from runtime-translatable nodes", async () => {
  const [home, grade, i18n] = await Promise.all([
    readFile(new URL("src/app/dashboard/creator/page.tsx", root), "utf8"),
    readFile(new URL("src/app/dashboard/creator/grade/page.tsx", root), "utf8"),
    readFile(new URL("site-i18n.js", root), "utf8"),
  ]);
  assert.match(home, /<span>한국 공급자<\/span>/);
  assert.match(home, /<span>마감<\/span>/);
  assert.match(grade, /<span>완료 캠페인<\/span>/);
  assert.match(grade, /<span>다음 등급까지<\/span>/);
  assert.match(grade, /<span>건 남았습니다\.<\/span>/);

  for (const label of ["한국 공급자", "마감", "완료 캠페인", "건", "다음 등급까지", "건 남았습니다."]) {
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(i18n, new RegExp(`'${escapedLabel}'\\s*:\\s*\\[[^\\]]+,[^\\]]+,[^\\]]+\\]`));
    assert.match(i18n, new RegExp(`"${escapedLabel}"\\s*:\\s*"[^"]+"`));
  }
});

test("deadline and performance-grade labels are locale-ready", async () => {
  const [home, campaigns, performance, grade, i18n] = await Promise.all([
    readFile(new URL("src/app/dashboard/creator/page.tsx", root), "utf8"),
    readFile(new URL("src/app/dashboard/creator/campaigns/page.tsx", root), "utf8"),
    readFile(new URL("src/app/dashboard/creator/performance/page.tsx", root), "utf8"),
    readFile(new URL("src/app/dashboard/creator/grade/page.tsx", root), "utf8"),
    readFile(new URL("site-i18n.js", root), "utf8"),
  ]);
  assert.doesNotMatch(home, /DateTimeFormat\("ko-KR"/);
  assert.match(home, /data-i18n-date/);
  assert.match(campaigns, /data-i18n-date/);
  assert.match(i18n, /getAttribute\('data-i18n-date'\)/);
  for (const label of ["캠페인별 성과", "캠페인", "조회", "좋아요", "댓글", "주문", "매출", "현재 등급", "최고 등급을 유지하고 있습니다.", "다음 등급 진행률", "정확한 콘텐츠 제출과 일정 준수가 등급에 반영됩니다."]) {
    assert.match(performance + grade, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(i18n, new RegExp(`['\"]${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}['\"]`));
  }
  for (const label of ["해외 크리에이터가 한국 공급자 제품으로 만든 콘텐츠의 조회, 반응, 주문과 매출을 확인합니다.", "전체 성과", "아직 집계된 성과가 없습니다.", "콘텐츠 게시 후 조회·주문 데이터가 이곳에 표시됩니다.", "한국 브랜드와의 협업 완료 이력에 따라 더 많은 캠페인과 판매 기회가 열립니다.", "크리에이터 등급 안내"]) {
    assert.match(i18n, new RegExp(`['\"]${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}['\"]`));
  }
});
