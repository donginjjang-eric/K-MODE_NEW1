import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getApprovedCreatorForApi } from "@/lib/auth";
import { applyToCampaign } from "@/lib/creator-campaigns";

function applicationError(error: unknown) {
  const message = error instanceof Error ? error.message : "Campaign application could not be completed.";
  if (/already participates/i.test(message)) {
    return NextResponse.json({ code: "duplicate", error: "You have already applied to this campaign." }, { status: 409 });
  }
  if (/not recruiting|deadline has passed/i.test(message)) {
    return NextResponse.json({ code: "closed", error: "This campaign is no longer accepting applications." }, { status: 409 });
  }
  if (/not found/i.test(message)) {
    return NextResponse.json({ code: "closed", error: "This campaign is no longer available." }, { status: 404 });
  }
  return NextResponse.json({ code: "error", error: "Campaign application could not be completed." }, { status: 500 });
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getApprovedCreatorForApi();
  if (!auth.ok) return NextResponse.json({ code: "unauthorized", error: auth.error }, { status: auth.status });

  const { id: campaignId } = await params;
  if (!campaignId) return NextResponse.json({ code: "closed", error: "This campaign is no longer available." }, { status: 404 });

  try {
    const participation = await applyToCampaign(auth.creator.id, campaignId);
    revalidatePath("/dashboard/creator");
    revalidatePath("/dashboard/creator/campaigns");
    return NextResponse.json({ participation: { id: participation.id, status: participation.status } }, { status: 201 });
  } catch (error) {
    return applicationError(error);
  }
}
