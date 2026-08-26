import { mock } from "node:test";

class FailingPool {
  async connect() {
    return {
      async query(text) {
        if (text === "BEGIN") return { rows: [] };
        if (text === "ROLLBACK") return { rows: [] };
        throw new Error("required schema is unavailable");
      },
      release() {},
    };
  }

  async query() {
    throw new Error("required schema is unavailable");
  }

  async end() {}
}

await mock.module("pg", {
  defaultExport: { Pool: FailingPool },
  namedExports: { Pool: FailingPool },
});

process.env.DATABASE_URL = "postgres://test:test@localhost:5432/kmodu_startup_failure";
await import("../scripts/ensure-schema.mjs");
