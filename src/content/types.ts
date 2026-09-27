// The shape of the content file (see intro-script.md §8).
// scripts/check-content.js checks en.json against these rules before every build.

export type ActionType = "tap-target" | "button" | "drag" | "auto";

export interface StepAction {
  type: ActionType;
  /** Button text. For "auto" steps, the button shown once the animation ends. */
  label: string | null;
  /** What the player taps or drops onto ("tap-target" and "drag" only). */
  target?: string;
}

export interface Step {
  id: string;
  scene: string;
  caption: string | null;
  subline: string | null;
  action: StepAction;
  hint: string | null;
  animation: string;
  technical: {
    code: string | null;
    note: string;
  };
  /** One-off text drawn inside this step's scene. */
  sceneText?: Record<string, unknown>;
  /** Only on step 0. */
  landing?: {
    headline: string;
    subtitle: string;
    honesty: string;
    secondaryAction: string;
  };
}

export interface Content {
  meta: { lang: string; title: string };
  ui: Record<string, string>;
  incident: { heading: string; placeholder: string; replayIntro: string };
  labels: {
    buildings: Record<string, string>;
    figures: Record<string, string>;
    keys: Record<string, string>;
    accessGranted: string;
  };
  steps: Step[];
}
