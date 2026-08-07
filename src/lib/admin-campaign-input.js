const REQUIRED_CREATE_FIELDS = ["title", "category", "markets", "platforms", "brief", "reward_text", "slots"];
const OPTIONAL_FIELDS = ["application_deadline", "content_deadline", "image_urls"];
const ALL_FIELDS = [...REQUIRED_CREATE_FIELDS, ...OPTIONAL_FIELDS];

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isNullableString(value) {
  return value === null || typeof value === "string";
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
  if ("application_deadline" in value && !isNullableString(value.application_deadline)) return false;
  if ("content_deadline" in value && !isNullableString(value.content_deadline)) return false;
  return true;
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
  return Response.json({ error: "입력한 캠페인 정보를 확인해 주세요." }, { status: 400 });
}
