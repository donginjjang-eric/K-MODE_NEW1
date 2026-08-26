import { mock } from "node:test";

const validCatalog = {
  has_required_columns: true,
  has_owner_type_constraint: true,
  has_designer_owner_constraint: true,
  has_designer_fk: true,
  has_product_fk: true,
  has_product_designer_trigger: true,
  has_product_campaign_designer_trigger: true,
};

class OptionalFailurePool {
  async connect() {
    return {
      async query(text) {
        if (text.includes("information_schema.columns") && text.includes("pg_constraint")) return { rows: [validCatalog] };
        return { rows: [] };
      },
      release() {},
    };
  }

  async query() {
    throw new Error("optional creator synchronization failed");
  }

  async end() {}
}

await mock.module("pg", {
  defaultExport: { Pool: OptionalFailurePool },
  namedExports: { Pool: OptionalFailurePool },
});

process.env.DATABASE_URL = "postgres://test:test@localhost:5432/kmodu_optional_failure";
delete process.env.ADMIN_EMAIL;
delete process.env.ADMIN_PASSWORD;
delete process.env.TEST_ACCOUNT_PASSWORD;
await import("../scripts/ensure-schema.mjs");
