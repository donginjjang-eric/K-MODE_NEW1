const VALID_ACTIONS = new Set(["approve", "reject", "cancel", "shipping", "creating", "review", "published", "settlement", "completed"]);

export function participationMutationError(error) {
  const message = error instanceof Error ? error.message : "Participation could not be updated.";
  if (/was not found/i.test(message)) return Response.json({ code: "not_found", error: "참여 정보를 찾을 수 없습니다. 캠페인 상세를 새로고침해 주세요." }, { status: 404 });
  if (/capacity/i.test(message)) return Response.json({ code: "capacity_full", error: "모집 인원이 모두 확정되어 승인할 수 없습니다. 모집 인원을 확인해 주세요." }, { status: 409 });
  if (/creator must accept invitations|cannot transition|closed/i.test(message)) {
    return Response.json({ code: "invalid_state", error: "현재 참여 상태에서는 이 작업을 할 수 없습니다. 최신 상태를 확인해 주세요." }, { status: 409 });
  }
  if (/required|invalid/i.test(message)) return Response.json({ code: "invalid_request", error: "요청한 작업과 메모 내용을 확인해 주세요." }, { status: 400 });
  console.error("[admin-participation] update failed:", error);
  return Response.json({ code: "server_error", error: "참여 상태를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
}

export async function handleAdminParticipationMutation(request, participationId, { adminId, transitionParticipationAsAdmin, revalidatePath }) {
  const body = await request.json().catch(() => null);
  const action = body && typeof body === "object" && !Array.isArray(body) ? body.action : null;
  const note = body && typeof body === "object" && !Array.isArray(body) ? body.note : undefined;

  if (!participationId) return Response.json({ code: "not_found", error: "참여 정보를 찾을 수 없습니다. 캠페인 상세를 새로고침해 주세요." }, { status: 404 });
  if (typeof action !== "string" || !VALID_ACTIONS.has(action) || (note !== undefined && typeof note !== "string")) {
    return Response.json({ code: "invalid_request", error: "요청한 작업과 메모 내용을 확인해 주세요." }, { status: 400 });
  }

  try {
    const participation = await transitionParticipationAsAdmin(adminId, participationId, action, note);
    revalidatePath("/dashboard/admin/campaigns");
    revalidatePath(`/dashboard/admin/campaigns/${participation.campaign_id}`);
    revalidatePath("/dashboard/creator");
    revalidatePath("/dashboard/creator/campaigns");
    revalidatePath("/dashboard/creator/my-campaigns");
    revalidatePath(`/dashboard/creator/my-campaigns/${participationId}`);
    revalidatePath("/dashboard/creator/settlement");
    revalidatePath("/dashboard/creator/submissions");
    return Response.json({ participation });
  } catch (error) {
    return participationMutationError(error);
  }
}
