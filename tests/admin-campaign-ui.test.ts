import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);
const tsxCli = resolve("node_modules/tsx/dist/cli.mjs");

test("admin campaign UI renders only legal controls, safe links, and actionable messages", async () => {
  await execFileAsync(process.execPath, ["--experimental-test-module-mocks", tsxCli, "--test", "tests/admin-campaign-ui-runner.mjs"], { cwd: process.cwd() });
});
