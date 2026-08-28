import { requireUser } from "@/lib/auth";
import { withDatabaseTransaction } from "@/lib/db";
import { validateWorkspaceRouteId } from "@/lib/admin-workspace-input";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireUser("admin");
  const id = validateWorkspaceRouteId((await params).id);
  if (!id) return Response.json({ ok: false, error: "Designer ID is invalid." }, { status: 400 });
  const designer = await withDatabaseTransaction(async (client) => {
    const result = await client.query(
      "UPDATE designers SET approval_status = 'approved', updated_at = now() WHERE id = $1 RETURNING *",
      [id],
    );
    const saved = result.rows[0];
    if (!saved) return null;
    await client.query(
      `UPDATE user_workspace_memberships
          SET status = 'active', updated_at = now()
        WHERE user_id = $1 AND resource_id = $2
          AND workspace_type IN ('fashion_partner', 'beauty_partner')`,
      [saved.user_id, id],
    );
    await client.query(
      `INSERT INTO creator_management_audit_logs (actor_user_id, action, metadata)
       VALUES ($1, 'designer_and_workspace_approved', $2::jsonb)`,
      [actor.id, JSON.stringify({ designerId: id, userId: saved.user_id })],
    );
    return saved;
  });
  if (!designer) return Response.json({ ok: false, error: "Designer not found." }, { status: 404 });
  return Response.json({ ok: true, designer });
}
