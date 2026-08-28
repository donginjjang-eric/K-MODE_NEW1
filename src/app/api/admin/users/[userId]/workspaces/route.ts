import { requireUser } from "@/lib/auth";
import { query, withDatabaseTransaction } from "@/lib/db";
import { validateAdminWorkspaceAction, validateWorkspaceRouteId } from "@/lib/admin-workspace-input";

class WorkspaceMutationError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export async function GET(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  await requireUser("admin");
  const userId = validateWorkspaceRouteId((await params).userId);
  if (!userId) return Response.json({ ok: false, error: "회원 ID가 올바르지 않습니다." }, { status: 400 });
  const workspaces = await query(
    `SELECT memberships.id, memberships.workspace_type, memberships.resource_id,
            memberships.status, memberships.is_default, memberships.updated_at,
            COALESCE(designers.brand_name, creator_accounts.display_name) AS resource_name
       FROM user_workspace_memberships memberships
       LEFT JOIN designers ON designers.id = memberships.resource_id
       LEFT JOIN creator_accounts ON creator_accounts.id = memberships.resource_id
      WHERE memberships.user_id = $1
      ORDER BY memberships.created_at ASC`,
    [userId],
  );
  return Response.json({ ok: true, workspaces });
}

async function mutate(request: Request, userId: string) {
  const actor = await requireUser("admin");
  const validUserId = validateWorkspaceRouteId(userId);
  if (!validUserId) return Response.json({ ok: false, error: "회원 ID가 올바르지 않습니다." }, { status: 400 });
  const validated = validateAdminWorkspaceAction(await request.json().catch(() => null));
  if (!validated.ok) return Response.json({ ok: false, error: validated.error }, { status: 400 });
  const body = validated.value;
  userId = validUserId;

  try {
    const result = await withDatabaseTransaction(async (client) => {
      if (body.action === "create_beauty_partner") {
        const { brandName, contactEmail } = body;
        const user = await client.query("SELECT id FROM users WHERE id = $1 FOR UPDATE", [userId]);
        if (!user.rows[0]) throw new WorkspaceMutationError("회원을 찾을 수 없습니다.", 404);
        const designerResult = await client.query(
          `INSERT INTO designers
             (brand_name, designer_name, contact_email, contact_phone, description, brand_category, mood, country, approval_status, user_id)
           VALUES ($1, $1, $2, '', '', 'K-뷰티', '', 'South Korea', 'approved', $3)
           RETURNING id, brand_name`,
          [brandName, contactEmail, userId],
        );
        const designer = designerResult.rows[0];
        const membershipResult = await client.query(
          `INSERT INTO user_workspace_memberships (user_id, workspace_type, resource_id, status, is_default)
           VALUES ($1, 'beauty_partner', $2, 'active', false)
           RETURNING *`,
          [userId, designer.id],
        );
        await client.query(
          `INSERT INTO creator_management_audit_logs (actor_user_id, action, metadata)
           VALUES ($1, $2, $3::jsonb)`,
          [actor.id, "workspace_created", JSON.stringify({ userId, membershipId: membershipResult.rows[0].id, designerId: designer.id, workspaceType: "beauty_partner" })],
        );
        return membershipResult.rows[0];
      }

      const membershipId = body.membershipId;
      const locked = await client.query(
        "SELECT * FROM user_workspace_memberships WHERE id = $2 AND user_id = $1 FOR UPDATE",
        [userId, membershipId],
      );
      const membership = locked.rows[0];
      if (!membership) throw new WorkspaceMutationError("작업공간을 찾을 수 없습니다.", 404);
      if (body.action === "set_default" && membership.status !== "active") {
        throw new WorkspaceMutationError("승인 완료된 작업공간만 기본으로 설정할 수 있습니다.", 409);
      }

      if (body.action === "set_default") {
        await client.query("UPDATE user_workspace_memberships SET is_default = false, updated_at = now() WHERE user_id = $1 AND is_default = true", [userId]);
        await client.query("UPDATE user_workspace_memberships SET is_default = true, updated_at = now() WHERE id = $2 AND user_id = $1", [userId, membershipId]);
      } else {
        const status = body.action === "approve" ? "active" : "disabled";
        await client.query("UPDATE user_workspace_memberships SET status = $3, is_default = false, updated_at = now() WHERE id = $2 AND user_id = $1", [userId, membershipId, status]);
        if (["fashion_partner", "beauty_partner"].includes(membership.workspace_type)) {
          if (body.action === "approve") {
            await client.query("UPDATE designers SET approval_status = 'approved', updated_at = now() WHERE id = $2 AND user_id = $1", [userId, membership.resource_id]);
          } else {
            await client.query(
              `UPDATE designers
                  SET approval_status = 'disabled', updated_at = now()
                WHERE id = $2 AND user_id = $1
                  AND NOT EXISTS (
                    SELECT 1 FROM user_workspace_memberships sibling
                     WHERE sibling.user_id = $1
                       AND sibling.resource_id = $2
                       AND sibling.id <> $3
                       AND sibling.workspace_type IN ('fashion_partner', 'beauty_partner')
                       AND sibling.status = 'active'
                  )`,
              [userId, membership.resource_id, membershipId],
            );
          }
        } else if (membership.workspace_type === "creator") {
          await client.query("UPDATE creator_accounts SET approval_status = $3, updated_at = now() WHERE id = $2 AND user_id = $1", [userId, membership.resource_id, status === "active" ? "approved" : "disabled"]);
        }
      }
      await client.query(
        `INSERT INTO creator_management_audit_logs (actor_user_id, action, metadata)
         VALUES ($1, $2, $3::jsonb)`,
        [actor.id, `workspace_${body.action}`, JSON.stringify({ userId, membershipId, workspaceType: membership.workspace_type, resourceId: membership.resource_id })],
      );
      const updated = await client.query("SELECT * FROM user_workspace_memberships WHERE id = $2 AND user_id = $1", [userId, membershipId]);
      return updated.rows[0];
    });
    return Response.json({ ok: true, workspace: result });
  } catch (error) {
    if (error instanceof WorkspaceMutationError) return Response.json({ ok: false, error: error.message }, { status: error.status });
    console.error("[admin-workspaces] mutation failed:", error instanceof Error ? error.message : error);
    return Response.json({ ok: false, error: "작업공간 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  return mutate(request, (await params).userId);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  return mutate(request, (await params).userId);
}
