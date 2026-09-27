// Step 0: the landing screen (title, subtitle, honesty line, Start and Skip).
import type { Step } from "../content/types";

export interface Landing {
  element: HTMLElement;
  start: HTMLButtonElement;
}

export function createLanding(
  step: Step,
  handlers: { onStart: () => void; onSkip: () => void },
): Landing {
  const text = step.landing;
  if (!text) throw new Error(`${step.id} has no landing text`);

  const element = document.createElement("div");
  element.className = "landing";

  const headline = document.createElement("h1");
  headline.className = "landing__headline";
  headline.textContent = text.headline;

  const subtitle = document.createElement("p");
  subtitle.className = "landing__subtitle";
  subtitle.textContent = text.subtitle;

  const start = document.createElement("button");
  start.type = "button";
  start.className = "button button--primary button--large";
  start.textContent = step.action.label ?? "";
  start.addEventListener("click", handlers.onStart);

  const skip = document.createElement("button");
  skip.type = "button";
  skip.className = "button button--quiet button--large";
  skip.textContent = text.secondaryAction;
  skip.addEventListener("click", handlers.onSkip);

  const actions = document.createElement("div");
  actions.className = "landing__actions";
  actions.append(start, skip);

  const honesty = document.createElement("p");
  honesty.className = "landing__honesty";
  honesty.textContent = text.honesty;

  element.append(headline, subtitle, actions, honesty);
  return { element, start };
}
