// Tests for the step engine. Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { createStepEngine, type EngineState } from "./stepEngine.ts";

const step = (index: number): EngineState => ({ kind: "step", index });

test("starts on the landing screen", () => {
  assert.deepEqual(createStepEngine(10).state, step(0));
});

test("next walks through every step, then ends the intro", () => {
  const engine = createStepEngine(10);
  for (let i = 1; i <= 9; i++) {
    engine.next();
    assert.deepEqual(engine.state, step(i));
  }
  engine.next();
  assert.deepEqual(engine.state, { kind: "incident" });
});

test("back goes one step back and stops at the landing screen", () => {
  const engine = createStepEngine(10, 2);
  engine.back();
  assert.deepEqual(engine.state, step(1));
  engine.back();
  engine.back();
  assert.deepEqual(engine.state, step(0));
});

test("skip works from any step, and replay starts again", () => {
  for (let i = 0; i < 10; i++) {
    const engine = createStepEngine(10, i);
    engine.skip();
    assert.deepEqual(engine.state, { kind: "incident" });
    engine.replay();
    assert.deepEqual(engine.state, step(0));
  }
});

test("goTo keeps the step number in range", () => {
  const engine = createStepEngine(10);
  engine.goTo(42);
  assert.deepEqual(engine.state, step(9));
  engine.goTo(-3);
  assert.deepEqual(engine.state, step(0));
  engine.goTo(Number.NaN);
  assert.deepEqual(engine.state, step(0));
});

test("subscribers hear the current state and every change", () => {
  const engine = createStepEngine(10);
  const heard: EngineState[] = [];
  engine.subscribe((state) => heard.push(state));
  engine.next();
  engine.skip();
  assert.deepEqual(heard, [step(0), step(1), { kind: "incident" }]);
});
