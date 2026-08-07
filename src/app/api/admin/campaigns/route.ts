import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createAdminCampaign, listAdminCampaigns } from "@/lib/creator-campaigns";
import { invalidCampaignInputResponse, parseAdminCampaignCreateInput } from "@/lib/admin-campaign-input";

function campaignError(error: unknown) {
  const message = error instanceof Error ? error.message : "캠페인을 처리할 수 없습니다.";
  if (/not found/i.test(message)) return Response.json({ error: "캠페인을 찾을 수 없습니다." }, { status: 404 });
  if (/closed|conflict|cannot be reopened/i.test(message)) return Response.json({ error: "현재 상태에서는 캠페인을 변경할 수 없습니다." }, { status: 409 });
  if (/required|invalid|positive|at least|before|https/i.test(message)) return Response.json({ error: "입력한 캠페인 정보를 확인해 주세요." }, { status: 400 });
  return Response.json({ error: "캠페인을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
}

export async function GET(request: Request) {
  await requireUser("admin");
  const status = new URL(request.url).searchParams.get("status");
  if (status && !["draft", "recruiting", "active", "closed"].includes(status)) {
    return Response.json({ error: "캠페인 상태 필터가 올바르지 않습니다." }, { status: 400 });
  }

  try {
    const campaigns = await listAdminCampaigns(status ? { status: status as "draft" | "recruiting" | "active" | "closed" } : {});
    return Response.json({ campaigns });
  } catch (error) {
    return campaignError(error);
  }
}

export async function POST(request: Request) {
  const admin = await requireUser("admin");
  const body = await request.json().catch(() => null);
  const input = parseAdminCampaignCreateInput(body);
  if (!input) return invalidCampaignInputResponse();

  try {
    const campaign = await createAdminCampaign(admin.id, input);
    revalidatePath("/dashboard/admin/campaigns");
    revalidatePath(`/dashboard/admin/campaigns/${campaign.id}`);
    return Response.json({ campaign }, { status: 201 });
  } catch (error) {
    return campaignError(error);
  }
}
