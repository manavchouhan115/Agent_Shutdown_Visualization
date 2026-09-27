// Tests for the idle hint. Run with: npm test
import { beforeEach, afterEach, mock, test } from "node:test";
import assert from "node:assert/strict";
import { createIdleHint } from "./idleHint.ts";

beforeEach(() => mock.timers.enable({ apis: ["setTimeout"] }));
afterEach(() => mock.timers.reset());

function setup() {
  const target = new EventTarget();
  let shown = 0;
  const hint = createIdleHint({ target, onShow: () => shown++ });
  return { target, hint, shown: () => shown };
}

test("appears after 6 seconds with no input", () => {
  const { hint, shown } = setup();
  hint.start();
  mock.timers.tick(5999);
  assert.equal(shown(), 0);
  mock.timers.tick(1);
  assert.equal(shown(), 1);
});

test("any input starts the 6 seconds again", () => {
  const { target, hint, shown } = setup();
  hint.start();
  mock.timers.tick(5000);
  target.dispatchEvent(new Event("keydown"));
  mock.timers.tick(5000);
  assert.equal(shown(), 0);
  mock.timers.tick(1000);
  assert.equal(shown(), 1);
});

test("appears only once per start", () => {
  const { hint, shown } = setup();
  hint.start();
  mock.timers.tick(30000);
  assert.equal(shown(), 1);
});

test("stop cancels it, and input while stopped does nothing", () => {
  const { target, hint, shown } = setup();
  hint.start();
  mock.timers.tick(3000);
  hint.stop();
  target.dispatchEvent(new Event("pointerdown"));
  mock.timers.tick(30000);
  assert.equal(shown(), 0);
});
