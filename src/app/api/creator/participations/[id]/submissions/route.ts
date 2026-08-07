import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getApprovedCreatorForApi } from "@/lib/auth";
import { createContentSubmission } from "@/lib/db";

function validHttpsUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function submissionError(error: unknown) {
  const message = error instanceof Error ? error.message : "Content submission could not be saved.";
  if (/not found/i.test(message)) return NextResponse.json({ code: "not_found", error: "Mission was not found." }, { status: 404 });
  if (/not available/i.test(message)) return NextResponse.json({ code: "invalid_state", error: "This mission is not ready for submission." }, { status: 409 });
  return NextResponse.json({ code: "error", error: "Content submission could not be saved." }, { status: 500 });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getApprovedCreatorForApi();
  if (!auth.ok) return NextResponse.json({ code: "unauthorized", error: auth.error }, { status: auth.status });
  const { id: participationId } = await params;
  const body = await request.json().catch(() => null);
  const contentUrl = validHttpsUrl(body?.contentUrl);
  const captionText = typeof body?.captionText === "string" ? body.captionText.trim() : "";
  if (!participationId) return NextResponse.json({ code: "not_found", error: "Mission was not found." }, { status: 404 });
  if (!contentUrl) return NextResponse.json({ code: "invalid_url", error: "Use a valid HTTPS content URL." }, { status: 400 });

  try {
    const submission = await createContentSubmission(auth.creator.id, participationId, { contentUrl, captionText });
    revalidatePath("/dashboard/creator");
    revalidatePath("/dashboard/creator/my-campaigns");
    revalidatePath(`/dashboard/creator/my-campaigns/${participationId}`);
    revalidatePath("/dashboard/creator/submissions");
    return NextResponse.json({ submission: { id: submission.id, version: submission.version, status: submission.status } }, { status: 201 });
  } catch (error) {
    return submissionError(error);
  }
}
