// Caption bar: the step's caption and sub-line, plus the Back and main action buttons.
// Screen-reader announcements are handled by the announcer, not here.
import { content } from "../content";
import type { Step } from "../content/types";
import type { Phase } from "../scenes/scenes";

export interface CaptionBar {
  element: HTMLElement;
  primary: HTMLButtonElement;
  /** Shows a step's text and the main button for this phase. Hides any hint. */
  show(step: Step, phase: Phase): void;
  /** Shows the idle hint under the caption. */
  showHint(text: string): void;
  onBack(handler: () => void): void;
  onPrimary(handler: () => void): void;
}

export function createCaptionBar(): CaptionBar {
  const element = document.createElement("section");
  element.className = "caption-bar";

  const text = document.createElement("div");
  text.className = "caption-bar__text";
  // The caption is the screen's main heading, so screen-reader users can jump straight to it.
  const caption = document.createElement("h1");
  caption.className = "caption";
  const subline = document.createElement("p");
  subline.className = "subline";
  const hint = document.createElement("p");
  hint.className = "hint";
  hint.hidden = true;
  text.append(caption, subline, hint);

  const back = document.createElement("button");
  back.type = "button";
  back.className = "button button--quiet";
  back.textContent = content.ui.back;

  const primary = document.createElement("button");
  primary.type = "button";
  primary.className = "button button--primary";

  const actions = document.createElement("div");
  actions.className = "caption-bar__actions";
  actions.append(back, primary);

  element.append(text, actions);

  return {
    element,
    primary,
    show(step, phase) {
      caption.textContent = step.caption ?? "";
      subline.textContent = step.subline ?? "";
      subline.hidden = !step.subline;
      hint.hidden = true;
      primary.classList.remove("is-hinting");

      const { action } = step;
      if (phase === "start") {
        // Before acting: only "button" steps have a main button (e.g. "Let it run").
        primary.textContent = action.label ?? "";
        primary.hidden = action.type !== "button";
      } else {
        // After acting: move on. Auto steps have their own label (e.g. "Take control →").
        primary.textContent = (action.type === "auto" ? action.label : null) ?? content.ui.continue;
        primary.hidden = false;
      }
    },
    showHint(message) {
      hint.textContent = message;
      hint.hidden = false;
    },
    onBack(handler) {
      back.addEventListener("click", handler);
    },
    onPrimary(handler) {
      primary.addEventListener("click", handler);
    },
  };
}
