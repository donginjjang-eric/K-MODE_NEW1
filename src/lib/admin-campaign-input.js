const REQUIRED_CREATE_FIELDS = ["title", "category", "markets", "platforms", "brief", "reward_text", "application_deadline", "content_deadline", "slots"];
const OPTIONAL_FIELDS = ["image_urls"];
const ALL_FIELDS = [...REQUIRED_CREATE_FIELDS, ...OPTIONAL_FIELDS];

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isDeadline(value) {
  return typeof value === "string" && Boolean(value.trim()) && Number.isFinite(new Date(value).getTime());
}

function hasOrderedDeadlinePair(value) {
  if (!("application_deadline" in value) || !("content_deadline" in value)) return true;
  return new Date(value.application_deadline).getTime() < new Date(value.content_deadline).getTime();
}

function hasValidCampaignFieldTypes(value) {
  if (!isRecord(value)) return false;
  if (Object.keys(value).some((key) => !ALL_FIELDS.includes(key))) return false;
  if ("title" in value && typeof value.title !== "string") return false;
  if ("category" in value && typeof value.category !== "string") return false;
  if ("brief" in value && typeof value.brief !== "string") return false;
  if ("reward_text" in value && typeof value.reward_text !== "string") return false;
  if ("markets" in value && !isStringArray(value.markets)) return false;
  if ("platforms" in value && !isStringArray(value.platforms)) return false;
  if ("image_urls" in value && !isStringArray(value.image_urls)) return false;
  if ("slots" in value && (typeof value.slots !== "number" || !Number.isFinite(value.slots))) return false;
  if ("application_deadline" in value && !isDeadline(value.application_deadline)) return false;
  if ("content_deadline" in value && !isDeadline(value.content_deadline)) return false;
  return hasOrderedDeadlinePair(value);
}

export function parseAdminCampaignCreateInput(value) {
  if (!hasValidCampaignFieldTypes(value) || REQUIRED_CREATE_FIELDS.some((field) => !(field in value))) return null;
  return value;
}

export function parseAdminCampaignPatchInput(value) {
  if (!hasValidCampaignFieldTypes(value) || Object.keys(value).length === 0) return null;
  return value;
}

export function invalidCampaignInputResponse() {
  return Response.json({ code: "invalid_request", error: "필수 항목과 마감일 순서를 확인해 주세요. 신청 마감은 콘텐츠 마감보다 빨라야 합니다." }, { status: 400 });
}
