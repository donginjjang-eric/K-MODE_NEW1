import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { setAdminCampaignStatus } from "@/lib/creator-campaigns";
import type { AdminCampaignStatus } from "@/lib/types";

const VALID_STATUSES = new Set<AdminCampaignStatus>(["recruiting", "active", "closed"]);

function campaignError(error: unknown) {
  const message = error instanceof Error ? error.message : "캠페인을 처리할 수 없습니다.";
  if (/not found/i.test(message)) return Response.json({ error: "캠페인을 찾을 수 없습니다." }, { status: 404 });
  if (/closed|conflict|cannot be reopened/i.test(message)) return Response.json({ error: "마감된 캠페인은 다시 열 수 없습니다." }, { status: 409 });
  if (/required|invalid|positive|at least|before|https/i.test(message)) return Response.json({ error: "변경할 상태를 확인해 주세요." }, { status: 400 });
  return Response.json({ error: "캠페인 상태를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireUser("admin");
  const { id: campaignId } = await params;
  const body = await request.json().catch(() => null);
  const status = body && typeof body === "object" && !Array.isArray(body) ? (body as { status?: AdminCampaignStatus }).status : undefined;
  if (!campaignId) return Response.json({ error: "캠페인을 찾을 수 없습니다." }, { status: 404 });
  if (!status || !VALID_STATUSES.has(status as AdminCampaignStatus)) {
    return Response.json({ error: "모집, 진행, 마감 중 하나의 상태를 선택해 주세요." }, { status: 400 });
  }

  try {
    const campaign = await setAdminCampaignStatus(admin.id, campaignId, status);
    revalidatePath("/dashboard/admin/campaigns");
    revalidatePath(`/dashboard/admin/campaigns/${campaignId}`);
    return Response.json({ campaign });
  } catch (error) {
    return campaignError(error);
  }
}
