import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createAdminCampaign, listAdminCampaigns } from "@/lib/creator-campaigns";
import { campaignMutationError, handleAdminCampaignCreate } from "@/lib/admin-campaign-route-handlers";

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
    return campaignMutationError(error);
  }
}

export async function POST(request: Request) {
  const admin = await requireUser("admin");
  return handleAdminCampaignCreate(request, { adminId: admin.id, createAdminCampaign, revalidatePath });
}
