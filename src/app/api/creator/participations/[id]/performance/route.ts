import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getApprovedCreatorForApi } from "@/lib/auth";
import { upsertCampaignPerformance } from "@/lib/db";

const currencies = ["KRW", "USD", "VND", "TWD", "MYR"] as const;

function performanceError(error: unknown) {
  const message = error instanceof Error ? error.message : "Performance could not be saved.";
  if (/not found/i.test(message)) return NextResponse.json({ code: "not_found", error: "Mission was not found." }, { status: 404 });
  if (/not available/i.test(message)) return NextResponse.json({ code: "invalid_state", error: "This mission is not ready for performance reporting." }, { status: 409 });
  if (/non-negative|supported/i.test(message)) return NextResponse.json({ code: "invalid_input", error: message }, { status: 400 });
  return NextResponse.json({ code: "error", error: "Performance could not be saved." }, { status: 500 });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getApprovedCreatorForApi();
  if (!auth.ok) return NextResponse.json({ code: "unauthorized", error: auth.error }, { status: auth.status });
  const { id: participationId } = await params;
  const body = await request.json().catch(() => null);
  if (!participationId) return NextResponse.json({ code: "not_found", error: "Mission was not found." }, { status: 404 });

  const input = {
    views: body?.views,
    likes: body?.likes,
    comments: body?.comments,
    orders: body?.orders,
    revenue: body?.revenue,
    currency: body?.currency,
  };
  if (!currencies.includes(input.currency)) {
    return NextResponse.json({ code: "invalid_input", error: "Choose a supported currency." }, { status: 400 });
  }

  try {
    const performance = await upsertCampaignPerformance(auth.creator.id, participationId, input);
    revalidatePath("/dashboard/creator");
    revalidatePath("/dashboard/creator/settlement");
    revalidatePath(`/dashboard/creator/my-campaigns/${participationId}`);
    return NextResponse.json({ performance }, { status: 201 });
  } catch (error) {
    return performanceError(error);
  }
}
