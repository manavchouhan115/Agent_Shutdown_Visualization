// TEMPORARY: a grey box standing in for scenes that are not drawn yet.
// For "tap-target" and "drag" steps it adds a plain button for the target, so every
// step can be completed now. Build step 9 replaces this with the real tap and drag.
import { content } from "../content";
import type { Step } from "../content/types";

export interface ScenePlaceholder {
  element: HTMLElement;
  /** The temporary target button, if this step has one. */
  target: HTMLButtonElement | null;
}

/** Finds the visitor-facing name of a target, e.g. "eoc" → "Emergency operations centre". */
function targetName(target: string): string {
  const { buildings, figures } = content.labels;
  return buildings[target] ?? figures[target] ?? target;
}

export function createScenePlaceholder(step: Step, onTarget: () => void): ScenePlaceholder {
  const element = document.createElement("div");
  element.className = "scene__placeholder";

  const name = document.createElement("span");
  name.textContent = step.scene;
  element.append(name);

  let target: HTMLButtonElement | null = null;
  const { action } = step;
  if ((action.type === "tap-target" || action.type === "drag") && action.target) {
    target = document.createElement("button");
    target.type = "button";
    target.className = "button button--quiet";
    target.textContent = targetName(action.target);
    target.addEventListener("click", onTarget);
    element.append(target);
  }

  return { element, target };
}
