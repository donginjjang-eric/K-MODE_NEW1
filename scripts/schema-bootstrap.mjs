const REQUIRED_SCHEMA_VALIDATION_SQL = `
SELECT
  (
    SELECT COUNT(*) = 3
      FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'campaigns'
       AND column_name = ANY(ARRAY['owner_type', 'designer_id', 'product_id'])
  ) AS has_required_columns,
  EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'campaigns'::regclass
       AND conname = 'campaigns_owner_type_check'
       AND contype = 'c'
  ) AS has_owner_type_constraint,
  EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'campaigns'::regclass
       AND conname = 'campaigns_designer_owner_check'
       AND contype = 'c'
  ) AS has_designer_owner_constraint,
  EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'campaigns'::regclass
       AND conname = 'campaigns_designer_id_fkey'
       AND contype = 'f'
  ) AS has_designer_fk,
  EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'campaigns'::regclass
       AND conname = 'campaigns_product_id_fkey'
       AND contype = 'f'
  ) AS has_product_fk,
  EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgrelid = 'campaigns'::regclass
       AND tgname = 'campaigns_product_designer_match_trigger'
       AND NOT tgisinternal
  ) AS has_product_designer_trigger,
  EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgrelid = 'products'::regclass
       AND tgname = 'products_campaign_designer_match_trigger'
       AND NOT tgisinternal
  ) AS has_product_campaign_designer_trigger
`;

const REQUIRED_SCHEMA_FLAGS = [
  "has_required_columns",
  "has_owner_type_constraint",
  "has_designer_owner_constraint",
  "has_designer_fk",
  "has_product_fk",
  "has_product_designer_trigger",
  "has_product_campaign_designer_trigger",
];

export async function applyRequiredSchema(pool, schema) {
  const client = await pool.connect();
  let transactionOpen = false;
  try {
    await client.query("BEGIN");
    transactionOpen = true;
    await client.query(schema);
    const validation = await client.query(REQUIRED_SCHEMA_VALIDATION_SQL);
    const result = validation.rows[0];
    const missing = REQUIRED_SCHEMA_FLAGS.filter((flag) => result?.[flag] !== true);
    if (missing.length) {
      throw new Error(`Required campaign schema validation failed: ${missing.join(", ")}`);
    }
    await client.query("COMMIT");
    transactionOpen = false;
  } catch (error) {
    if (transactionOpen) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        if (error && typeof error === "object") error.rollbackError = rollbackError;
      }
    }
    throw error;
  } finally {
    client.release();
  }
}
