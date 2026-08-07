import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { updateAdminCampaign } from "@/lib/creator-campaigns";
import type { AdminCampaignInput } from "@/lib/types";

function campaignError(error: unknown) {
  const message = error instanceof Error ? error.message : "캠페인을 처리할 수 없습니다.";
  if (/not found/i.test(message)) return Response.json({ error: "캠페인을 찾을 수 없습니다." }, { status: 404 });
  if (/closed|conflict|cannot be reopened/i.test(message)) return Response.json({ error: "현재 상태에서는 캠페인을 변경할 수 없습니다." }, { status: 409 });
  if (/required|invalid|positive|at least|before|https/i.test(message)) return Response.json({ error: "입력한 캠페인 정보를 확인해 주세요." }, { status: 400 });
  return Response.json({ error: "캠페인을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireUser("admin");
  const { id: campaignId } = await params;
  const body = await request.json().catch(() => null);
  if (!campaignId) return Response.json({ error: "캠페인을 찾을 수 없습니다." }, { status: 404 });
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "수정할 캠페인 정보를 입력해 주세요." }, { status: 400 });
  }

  try {
    const input = body as Partial<AdminCampaignInput>;
    const campaign = await updateAdminCampaign(admin.id, campaignId, input);
    revalidatePath("/dashboard/admin/campaigns");
    revalidatePath(`/dashboard/admin/campaigns/${campaignId}`);
    revalidatePath(`/dashboard/admin/campaigns/${campaignId}/edit`);
    return Response.json({ campaign });
  } catch (error) {
    return campaignError(error);
  }
}
