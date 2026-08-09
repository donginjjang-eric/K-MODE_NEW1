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
