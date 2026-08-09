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

export const CREATOR_MISSION_STAGES = ["배송", "제작", "검수", "게시", "정산"] as const;

export type CreatorMissionGroup = "attention" | "active" | "completed";

type MissionPresentation = {
  group: CreatorMissionGroup;
  stageIndex: number;
  actionLabel: string;
  actionPath: "detail" | "submissions" | "performance" | "settlement";
};

const MISSION_PRESENTATION: Record<string, MissionPresentation> = {
  invited: { group: "attention", stageIndex: 0, actionLabel: "참여 여부 선택", actionPath: "detail" },
  applied: { group: "active", stageIndex: 0, actionLabel: "지원 현황 확인", actionPath: "detail" },
  matched: { group: "active", stageIndex: 0, actionLabel: "배송 준비 확인", actionPath: "detail" },
  shipping: { group: "attention", stageIndex: 0, actionLabel: "배송 정보 확인", actionPath: "detail" },
  creating: { group: "attention", stageIndex: 1, actionLabel: "콘텐츠 제출하기", actionPath: "submissions" },
  review: { group: "attention", stageIndex: 2, actionLabel: "검수 의견 확인", actionPath: "submissions" },
  published: { group: "attention", stageIndex: 3, actionLabel: "성과 입력하기", actionPath: "performance" },
  settlement: { group: "attention", stageIndex: 4, actionLabel: "정산 일정 확인", actionPath: "settlement" },
  completed: { group: "completed", stageIndex: 4, actionLabel: "완료 내역 보기", actionPath: "detail" },
  rejected: { group: "completed", stageIndex: -1, actionLabel: "종료 내역 보기", actionPath: "detail" },
  cancelled: { group: "completed", stageIndex: -1, actionLabel: "종료 내역 보기", actionPath: "detail" },
};

export function creatorMissionPresentation(status: string): MissionPresentation {
  return MISSION_PRESENTATION[status] || { group: "active", stageIndex: -1, actionLabel: "미션 확인하기", actionPath: "detail" };
}

export function creatorMissionActionHref(status: string, participationId: string) {
  const path = creatorMissionPresentation(status).actionPath;
  if (path === "submissions") return `/dashboard/creator/submissions#mission-${participationId}`;
  if (path === "performance") return `/dashboard/creator/my-campaigns/${participationId}#performance`;
  if (path === "settlement") return "/dashboard/creator/settlement";
  return `/dashboard/creator/my-campaigns/${participationId}`;
}

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
