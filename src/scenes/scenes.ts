// Picks the drawing for each step's "scene" name (from the content file).
// A scene name with no drawing yet falls back to the grey placeholder box.
import type { Step } from "../content/types";
import { INTRO_SCENES, type Phase, type Scene, type SceneContext } from "./intro";
import { createScenePlaceholder } from "./placeholder";

export type { Phase, Scene, SceneContext };
export { createLandingBackdrop } from "./intro";

export function createScene(step: Step, context: SceneContext): Scene {
  const entry = INTRO_SCENES[step.scene];
  return entry ? entry.build(step, context) : createScenePlaceholder(step, context.done);
}

/** True if acting on this step shows a result before moving on. */
export function sceneHasResult(step: Step): boolean {
  return INTRO_SCENES[step.scene]?.hasResult ?? false;
}
