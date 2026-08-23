import { getCurrentUser } from "./auth";
import type {
  CreateCreatorManagementGroupInput,
  UpdateCreatorManagementGroupInput,
  UpdateManagedCreatorPublicProfileInput,
} from "./creator-management";

type AdminUser = { id: string; role: string };
type RevalidatePath = (path: string) => void;
type CreatorLinkSource = Record<string, unknown>;

type GroupMutationDependencies = {
  adminId: string;
  createGroup: (actorUserId: string, input: CreateCreatorManagementGroupInput) => Promise<string>;
  updateGroup: (actorUserId: string, groupId: string, input: UpdateCreatorManagementGroupInput) => Promise<void>;
  assignCreators: (actorUserId: string, groupId: string, creatorAccountIds: string[]) => Promise<number>;
  removeCreators: (actorUserId: string, groupId: string, creatorAccountIds: string[]) => Promise<number>;
  inviteAgencyUser: (actorUserId: string, groupId: string, email: string) => Promise<void>;
  revokeAgencyUser?: (actorUserId: string, groupId: string, email: string) => Promise<void>;
  revalidatePath: RevalidatePath;
};

type CreatorPatchDependencies = {
  adminId: string;
  getManagedCreator: (creatorKey: string) => Promise<CreatorLinkSource | null>;
  getLegacyCreator: (creatorKey: string) => Promise<CreatorLinkSource | null>;
  updateCreatorProfile: (actorUserId: string, creatorKey: string, input: UpdateManagedCreatorPublicProfileInput) => Promise<void>;
  upsertCreatorLink: (input: {
    creatorKey: string;
    displayName: string;
    googleEmail: string;
    platform: string;
    market: string;
    categories: string[];
    approvalStatus: "approved" | "disabled";
  }) => Promise<unknown>;
  isEmailConflict?: (error: unknown) => boolean;
  revalidatePath: RevalidatePath;
};

const profileFields = new Set([
  "displayName", "approvalStatus", "profileImageUrl", "specialty", "bio",
  "instagramHandle", "instagramUrl", "instagramFollowers", "tiktokHandle", "tiktokUrl",
  "tiktokFollowers", "followersVerifiedAt",
]);

export function adminApiAuthorization(user: AdminUser | null) {
  if (!user) {
    return {
      ok: false as const,
      response: Response.json({ code: "unauthorized", error: "로그인이 필요합니다." }, { status: 401 }),
    };
  }
  if (user.role !== "admin") {
    return {
      ok: false as const,
      response: Response.json({ code: "forbidden", error: "관리자 권한이 필요합니다." }, { status: 403 }),
    };
  }
  return { ok: true as const, user };
}

export async function getAdminUserForApi() {
  return adminApiAuthorization(await getCurrentUser());
}

function invalidInputResponse() {
  return Response.json({ code: "invalid_input", error: "입력값을 확인해 주세요." }, { status: 400 });
}

function missingResourceResponse() {
  return Response.json({ code: "not_found", error: "요청한 정보를 찾을 수 없습니다." }, { status: 404 });
}

function errorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
    ? error.code
    : null;
}

export function creatorManagementErrorResponse(error: unknown) {
  const code = errorCode(error);
  if (code && code.endsWith("_NOT_FOUND")) return missingResourceResponse();
  if (code && (code.includes("DUPLICATE") || code.includes("CONFLICT") || code.includes("INACTIVE"))) {
    return Response.json({ code: "conflict", error: "현재 상태에서는 이 작업을 할 수 없습니다." }, { status: 409 });
  }
  if (code && (code.endsWith("_REQUIRED") || code.endsWith("_INVALID") || code === "INVALID_INPUT")) return invalidInputResponse();
  return Response.json({ code: "server_error", error: "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
}

async function requestObject(request: Request) {
  const body = await request.json().catch(() => null);
  return body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : null;
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function optionalText(value: unknown, allowNull = false) {
  if (allowNull && value === null) return null;
  return text(value);
}

function creatorIds(value: unknown) {
  if (!Array.isArray(value)) return null;
  const ids = [...new Set(value.map(text))];
  return ids.length && ids.every((id): id is string => Boolean(id)) ? ids : null;
}

function parseCreateGroupInput(body: Record<string, unknown>): CreateCreatorManagementGroupInput | null {
  const name = text(body.name);
  const creatorAccountIds = creatorIds(body.creatorAccountIds);
  if (!name || !creatorAccountIds) return null;
  if ("agencyName" in body && !optionalText(body.agencyName)) return null;
  if ("notes" in body && !optionalText(body.notes)) return null;
  return { name, creatorAccountIds, ...("agencyName" in body ? { agencyName: text(body.agencyName)! } : {}), ...("notes" in body ? { notes: text(body.notes)! } : {}) };
}

function parseUpdateGroupInput(body: Record<string, unknown>): UpdateCreatorManagementGroupInput | null {
  const input: UpdateCreatorManagementGroupInput = {};
  if ("name" in body) {
    const name = text(body.name);
    if (!name) return null;
    input.name = name;
  }
  if ("agencyName" in body) {
    const agencyName = optionalText(body.agencyName, true);
    if (agencyName === null && body.agencyName !== null) return null;
    input.agencyName = agencyName;
  }
  if ("notes" in body) {
    const notes = optionalText(body.notes, true);
    if (notes === null && body.notes !== null) return null;
    input.notes = notes;
  }
  if ("status" in body) {
    if (body.status !== "active" && body.status !== "inactive") return null;
    input.status = body.status;
  }
  return Object.keys(input).length ? input : null;
}

function parseCreatorProfileInput(body: Record<string, unknown>): UpdateManagedCreatorPublicProfileInput | null {
  const input: UpdateManagedCreatorPublicProfileInput = {};
  for (const key of profileFields) {
    if (!(key in body)) continue;
    const value = body[key];
    if (["displayName", "approvalStatus"].includes(key) && (typeof value !== "string" || !value.trim())) return null;
    if (["profileImageUrl", "specialty", "bio", "instagramHandle", "instagramUrl", "tiktokHandle", "tiktokUrl"].includes(key) && value !== null && typeof value !== "string") return null;
    if (["instagramFollowers", "tiktokFollowers"].includes(key) && (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)) return null;
    if (key === "followersVerifiedAt" && value !== null && (typeof value !== "string" || Number.isNaN(new Date(value).getTime()))) return null;
    Object.assign(input, { [key]: typeof value === "string" ? value.trim() : value });
  }
  return Object.keys(input).length ? input : null;
}

function revalidateCreatorRoutes(revalidatePath: RevalidatePath, groupId?: string) {
  revalidatePath("/dashboard/admin/creators");
  revalidatePath("/dashboard/admin/creator-groups");
  if (groupId) revalidatePath(`/dashboard/admin/creator-groups/${groupId}`);
}

export async function handleCreatorGroupCreate(request: Request, dependencies: GroupMutationDependencies) {
  const body = await requestObject(request);
  const input = body && parseCreateGroupInput(body);
  if (!input) return invalidInputResponse();
  try {
    const id = await dependencies.createGroup(dependencies.adminId, input);
    revalidateCreatorRoutes(dependencies.revalidatePath, id);
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    return creatorManagementErrorResponse(error);
  }
}

export async function handleCreatorGroupUpdate(request: Request, groupId: string, dependencies: GroupMutationDependencies) {
  const body = await requestObject(request);
  const input = body && parseUpdateGroupInput(body);
  if (!input) return invalidInputResponse();
  try {
    await dependencies.updateGroup(dependencies.adminId, groupId, input);
    revalidateCreatorRoutes(dependencies.revalidatePath, groupId);
    return Response.json({ updated: true });
  } catch (error) {
    return creatorManagementErrorResponse(error);
  }
}

export async function handleCreatorGroupMembersUpdate(request: Request, groupId: string, dependencies: GroupMutationDependencies) {
  const body = await requestObject(request);
  const ids = body && creatorIds(body.creatorAccountIds);
  if (!body || !ids || (body.action !== "assign" && body.action !== "remove")) return invalidInputResponse();
  try {
    const affectedCount = body.action === "assign"
      ? await dependencies.assignCreators(dependencies.adminId, groupId, ids)
      : await dependencies.removeCreators(dependencies.adminId, groupId, ids);
    revalidateCreatorRoutes(dependencies.revalidatePath, groupId);
    return Response.json({ affectedCount });
  } catch (error) {
    return creatorManagementErrorResponse(error);
  }
}

function normalizedEmail(value: unknown) {
  const email = text(value)?.toLowerCase();
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export async function handleAgencyUserInvite(request: Request, groupId: string, dependencies: GroupMutationDependencies) {
  const body = await requestObject(request);
  const email = body && normalizedEmail(body.email);
  if (!email) return invalidInputResponse();
  try {
    await dependencies.inviteAgencyUser(dependencies.adminId, groupId, email);
    revalidateCreatorRoutes(dependencies.revalidatePath, groupId);
    return Response.json({ updated: true }, { status: 201 });
  } catch (error) {
    return creatorManagementErrorResponse(error);
  }
}

export async function handleAgencyUserRevoke(request: Request, groupId: string, dependencies: GroupMutationDependencies) {
  const body = await requestObject(request);
  const email = body && normalizedEmail(body.email);
  if (!email || !dependencies.revokeAgencyUser) return invalidInputResponse();
  try {
    await dependencies.revokeAgencyUser(dependencies.adminId, groupId, email);
    revalidateCreatorRoutes(dependencies.revalidatePath, groupId);
    return Response.json({ updated: true });
  } catch (error) {
    return creatorManagementErrorResponse(error);
  }
}

function creatorLinkValue(creator: CreatorLinkSource, snakeCase: string, camelCase: string) {
  const value = creator[snakeCase] ?? creator[camelCase];
  return typeof value === "string" ? value : null;
}

function hasProfileInput(body: Record<string, unknown>) {
  return [...profileFields].some((field) => field in body);
}

export async function handleAdminCreatorPatch(request: Request, creatorKey: string, dependencies: CreatorPatchDependencies) {
  const body = await requestObject(request);
  if (!body) return invalidInputResponse();
  const profileInput = hasProfileInput(body) ? parseCreatorProfileInput(body) : null;
  if (hasProfileInput(body) && !profileInput) return invalidInputResponse();
  const hasEmail = "email" in body || "status" in body;
  if (!hasEmail && !profileInput) return invalidInputResponse();

  try {
    if (hasEmail) {
      const email = normalizedEmail(body.email);
      const status = body.status;
      if (!email || (status !== "approved" && status !== "disabled")) return invalidInputResponse();
      const creator = await dependencies.getManagedCreator(creatorKey) ?? await dependencies.getLegacyCreator(creatorKey);
      if (!creator) return missingResourceResponse();
      const displayName = creatorLinkValue(creator, "display_name", "displayName");
      const platform = creatorLinkValue(creator, "platform", "platform");
      const market = creatorLinkValue(creator, "market", "market");
      const normalizedKey = creatorLinkValue(creator, "creator_key", "creatorKey") ?? creatorKey;
      const categories = Array.isArray(creator.categories) && creator.categories.every((item) => typeof item === "string") ? creator.categories : [];
      if (!displayName || !platform || !market) return missingResourceResponse();
      await dependencies.upsertCreatorLink({ creatorKey: normalizedKey, displayName, googleEmail: email, platform, market, categories, approvalStatus: status });
    }
    if (profileInput) await dependencies.updateCreatorProfile(dependencies.adminId, creatorKey, profileInput);
    revalidateCreatorRoutes(dependencies.revalidatePath);
    return Response.json({ updated: true });
  } catch (error) {
    if (dependencies.isEmailConflict?.(error)) {
      return Response.json({ code: "conflict", error: "이미 다른 크리에이터 계정에 연결된 이메일입니다." }, { status: 409 });
    }
    return creatorManagementErrorResponse(error);
  }
}
