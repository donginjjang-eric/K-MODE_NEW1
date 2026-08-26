import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const bootstrapModule = await import("../scripts/schema-bootstrap.mjs").catch(() => ({}));
const applyRequiredSchema = bootstrapModule.applyRequiredSchema;
const schema = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");

const validCatalog = {
  has_required_columns: true,
  has_owner_type_constraint: true,
  has_designer_owner_constraint: true,
  has_designer_fk: true,
  has_product_fk: true,
  has_product_designer_trigger: true,
  has_product_campaign_designer_trigger: true,
};

class MigrationClient {
  constructor(catalog = validCatalog) {
    this.catalog = catalog;
    this.statements = [];
    this.releaseCount = 0;
  }

  async query(text) {
    this.statements.push(text);
    if (text.includes("information_schema.columns") && text.includes("pg_constraint")) {
      return { rows: [this.catalog] };
    }
    return { rows: [] };
  }

  release() {
    this.releaseCount += 1;
  }
}

class MigrationPool {
  constructor(client) {
    this.client = client;
  }

  async connect() {
    return this.client;
  }
}

test("applies the idempotent schema source twice in validated transactions", async () => {
  assert.equal(typeof applyRequiredSchema, "function", "schema bootstrap transaction helper must exist");
  const client = new MigrationClient();
  const pool = new MigrationPool(client);

  await applyRequiredSchema(pool, schema);
  await applyRequiredSchema(pool, schema);

  assert.deepEqual(
    client.statements.map((statement) => statement === schema ? "SCHEMA" : statement.includes("information_schema.columns") ? "VALIDATE" : statement),
    ["BEGIN", "SCHEMA", "VALIDATE", "COMMIT", "BEGIN", "SCHEMA", "VALIDATE", "COMMIT"],
  );
  assert.equal(client.releaseCount, 2);
});

test("rolls back and rejects when required post-migration schema validation fails", async () => {
  assert.equal(typeof applyRequiredSchema, "function", "schema bootstrap transaction helper must exist");
  const client = new MigrationClient({ ...validCatalog, has_product_campaign_designer_trigger: false });

  await assert.rejects(
    applyRequiredSchema(new MigrationPool(client), schema),
    /required campaign schema validation failed/i,
  );

  assert.equal(client.statements.at(-1), "ROLLBACK");
  assert.equal(client.statements.includes("COMMIT"), false);
  assert.equal(client.releaseCount, 1);
});
