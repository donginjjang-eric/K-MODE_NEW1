import assert from "node:assert/strict";
import test from "node:test";

test("dashboard scroll reset wins over the browser's delayed restoration", async () => {
  const { scheduleScrollReset } = await import("../src/lib/scroll-reset.ts");
  const frames = [];
  const scrolls = [];
  const target = {
    history: { scrollRestoration: "auto" },
    requestAnimationFrame(callback) { frames.push(callback); return frames.length; },
    cancelAnimationFrame() {},
    scrollTo(x, y) { scrolls.push([x, y]); },
  };

  scheduleScrollReset(target);
  assert.equal(target.history.scrollRestoration, "manual");
  assert.deepEqual(scrolls, [[0, 0]]);

  frames.shift()();
  assert.deepEqual(scrolls, [[0, 0]]);
  frames.shift()();
  assert.deepEqual(scrolls, [[0, 0], [0, 0]]);
});
