const STAGE_INDEX: Record<string, number> = {
  applied: 0,
  invited: 0,
  matched: 1,
  shipping: 2,
  creating: 3,
  review: 4,
  published: 5,
  settlement: 6,
  completed: 7,
};

const ACTIVE_STATUSES = new Set([
  "applied",
  "invited",
  "matched",
  "shipping",
  "creating",
  "review",
  "published",
  "settlement",
]);

export function missionStageIndex(status: string) {
  return STAGE_INDEX[status] ?? -1;
}

export function isActiveMission(status: string) {
  return ACTIVE_STATUSES.has(status);
}

export function isCompletedMission(status: string) {
  return status === "completed";
}

export function missionImage(category: string) {
  const normalized = category.toLowerCase();
  return normalized.includes("beauty") || normalized.includes("skin")
    ? "/assets/campaign-kdesigner-02.png"
    : "/assets/campaign-kdesigner-01.png";
}

const DEMO_BRIEF_LABELS: Record<string, string> = {
  "Completed demo campaign connecting a Korean lip tint supplier with a Malaysia creator's content and sales funnel.":
    "한국 립 틴트 브랜드와 말레이시아 크리에이터가 콘텐츠 제작부터 판매까지 함께한 체험 캠페인입니다.",
};

export function missionBriefLabel(brief: string) {
  return DEMO_BRIEF_LABELS[brief] || brief;
}
