// The step engine: remembers where the visitor is and moves between steps.
// It knows nothing about drawing. The page subscribes and redraws whenever the state changes.

export type EngineState =
  | { kind: "step"; index: number } // one of the intro steps (0 = landing)
  | { kind: "incident" }; // the intro is over (finished or skipped)

export type Listener = (state: EngineState) => void;

export interface StepEngine {
  readonly state: EngineState;
  /** Go to a step by number. Out-of-range numbers are clamped. */
  goTo(index: number): void;
  /** Go forward. After the last step, the intro ends. */
  next(): void;
  /** Go back one step. Does nothing on the landing screen. */
  back(): void;
  /** Leave the intro and jump to the incident. */
  skip(): void;
  /** Start the intro again from the landing screen. */
  replay(): void;
  /** Call `listener` now and after every change. */
  subscribe(listener: Listener): void;
}

export function createStepEngine(stepCount: number, startIndex = 0): StepEngine {
  const clamp = (index: number) => Math.min(Math.max(Math.trunc(index) || 0, 0), stepCount - 1);

  let state: EngineState = { kind: "step", index: clamp(startIndex) };
  const listeners: Listener[] = [];

  const set = (next: EngineState) => {
    state = next;
    listeners.forEach((listener) => listener(state));
  };

  return {
    get state() {
      return state;
    },
    goTo(index) {
      set({ kind: "step", index: clamp(index) });
    },
    next() {
      if (state.kind !== "step") return;
      if (state.index >= stepCount - 1) set({ kind: "incident" });
      else set({ kind: "step", index: state.index + 1 });
    },
    back() {
      if (state.kind === "step" && state.index > 0) set({ kind: "step", index: state.index - 1 });
    },
    skip() {
      set({ kind: "incident" });
    },
    replay() {
      set({ kind: "step", index: 0 });
    },
    subscribe(listener) {
      listeners.push(listener);
      listener(state);
    },
  };
}
