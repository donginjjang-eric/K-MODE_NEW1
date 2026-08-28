import { pathToFileURL } from "node:url";

const BEAUTY_CATEGORIES = ["k-뷰티", "뷰티", "k-beauty", "beauty"];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateInput(input) {
  const email = typeof input?.email === "string" ? input.email.trim().toLowerCase() : "";
  const brandName = typeof input?.brandName === "string" ? input.brandName.trim() : "";
  if (!EMAIL_PATTERN.test(email) || email.length > 320) throw new Error("올바른 이메일을 입력해야 합니다.");
  if (!brandName || brandName.length > 120) throw new Error("브랜드명은 1~120자로 입력해야 합니다.");
  return { email, brandName };
}

export async function grantBeautyWorkspace(client, input) {
  const { email, brandName } = validateInput(input);
  await client.query("BEGIN");
  try {
    const users = await client.query(
      "SELECT id, email FROM users WHERE lower(email) = $1 FOR UPDATE",
      [email],
    );
    if (users.rowCount !== 1) throw new Error(users.rowCount ? "사용자 계정이 중복되어 안전하게 중단했습니다." : "사용자 계정을 찾을 수 없습니다.");
    const userId = users.rows[0].id;

    const creators = await client.query(
      `SELECT id, user_id, google_email, approval_status
         FROM creator_accounts
        WHERE user_id = $1 OR lower(google_email) = $2
        FOR UPDATE`,
      [userId, email],
    );
    if (creators.rowCount !== 1) throw new Error(creators.rowCount ? "creator 연결 중복이 발견되어 안전하게 중단했습니다." : "기존 creator 연결을 찾을 수 없습니다.");
    const creator = creators.rows[0];
    if (creator.user_id !== userId) throw new Error("creator가 대상 사용자에게 연결되어 있지 않아 중단했습니다.");
    if (creator.approval_status !== "approved") throw new Error("기존 creator가 승인 상태가 아니어서 중단했습니다.");

    const foreignDesigners = await client.query(
      `SELECT id, user_id
         FROM designers
        WHERE lower(contact_email) = $1 AND user_id <> $2
        FOR UPDATE`,
      [email, userId],
    );
    if (foreignDesigners.rowCount) throw new Error("같은 이메일의 designer가 다른 사용자에게 연결되어 있어 중단했습니다.");

    const designers = await client.query(
      `SELECT id, user_id, brand_name, contact_email, brand_category, approval_status
         FROM designers
        WHERE user_id = $1 AND lower(trim(brand_category)) = ANY($2::text[])
        FOR UPDATE`,
      [userId, BEAUTY_CATEGORIES],
    );
    if (designers.rowCount > 1) throw new Error("K-뷰티 designer 중복이 발견되어 안전하게 중단했습니다.");
    const existingDesigner = designers.rows[0] ?? null;

    const designerResult = await client.query(
      `INSERT INTO designers (id, user_id, brand_name, designer_name, contact_email, brand_category, approval_status)
       VALUES (COALESCE($1::text, gen_random_uuid()::text), $2, $3, $3, $4, 'K-뷰티', 'approved')
       ON CONFLICT (id) DO UPDATE
         SET brand_name = EXCLUDED.brand_name,
             contact_email = EXCLUDED.contact_email,
             brand_category = 'K-뷰티',
             approval_status = 'approved',
             updated_at = now()
       WHERE designers.user_id = EXCLUDED.user_id
       RETURNING id, user_id, brand_category, approval_status`,
      [existingDesigner?.id ?? null, userId, brandName, email],
    );
    if (designerResult.rowCount !== 1 || designerResult.rows[0].user_id !== userId) {
      throw new Error("designer 소유권 검증에 실패했습니다.");
    }
    const designer = designerResult.rows[0];

    const memberships = await client.query(
      `SELECT id, user_id, resource_id, status
         FROM user_workspace_memberships
        WHERE user_id = $1 AND workspace_type = 'beauty_partner'
        FOR UPDATE`,
      [userId],
    );
    if (memberships.rowCount > 1) throw new Error("beauty_partner membership 중복이 발견되어 안전하게 중단했습니다.");
    if (memberships.rowCount === 1 && memberships.rows[0].resource_id !== designer.id) {
      throw new Error("beauty_partner membership이 다른 designer를 가리켜 중단했습니다.");
    }

    const membershipResult = await client.query(
      `INSERT INTO user_workspace_memberships (user_id, workspace_type, resource_id, status, is_default)
       VALUES ($1, 'beauty_partner', $2, 'active', false)
       ON CONFLICT ON CONSTRAINT user_workspace_memberships_identity_key DO UPDATE
         SET status = 'active', updated_at = now()
       RETURNING id, user_id, workspace_type, resource_id, status`,
      [userId, designer.id],
    );
    if (membershipResult.rowCount !== 1) throw new Error("beauty_partner membership 저장에 실패했습니다.");

    await client.query("COMMIT");
    return {
      userId,
      creatorId: creator.id,
      designerId: designer.id,
      membershipId: membershipResult.rows[0].id,
      workspaceType: "beauty_partner",
      status: "active",
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

function readArg(name, argv) {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
}

export async function runGrantBeautyWorkspaceCli({ argv = process.argv.slice(2), env = process.env } = {}) {
  const databaseUrl = env.MIGRATION_DATABASE_URL || env.DATABASE_PUBLIC_URL || env.DATABASE_URL;
  if (!databaseUrl) throw new Error("데이터베이스 연결 환경변수가 필요합니다.");
  const email = readArg("--email", argv) || env.TARGET_EMAIL;
  const brandName = readArg("--brand", argv) || env.TARGET_BRAND_NAME;
  validateInput({ email, brandName });

  const { default: pg } = await import("pg");
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("railway") && !databaseUrl.includes(".railway.internal")
      ? { rejectUnauthorized: false }
      : undefined,
  });
  const client = await pool.connect();
  try {
    const result = await grantBeautyWorkspace(client, { email, brandName });
    console.log(`K-뷰티 작업공간 승인 완료 (designer=${result.designerId}, membership=${result.membershipId})`);
    return result;
  } finally {
    client.release();
    await pool.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runGrantBeautyWorkspaceCli().catch((error) => {
    console.error(error instanceof Error ? error.message : "작업공간 승인에 실패했습니다.");
    process.exitCode = 1;
  });
}
