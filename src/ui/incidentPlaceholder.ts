// TEMPORARY: shown when the intro ends or is skipped, until the incident (Level 1) is built.
import { content } from "../content";

export interface IncidentPlaceholder {
  element: HTMLElement;
  replay: HTMLButtonElement;
}

export function createIncidentPlaceholder(onReplay: () => void): IncidentPlaceholder {
  const text = content.incident;

  const element = document.createElement("div");
  element.className = "landing";

  const heading = document.createElement("h1");
  heading.className = "landing__headline";
  heading.textContent = text.heading;

  const note = document.createElement("p");
  note.className = "landing__subtitle";
  note.textContent = text.placeholder;

  const replay = document.createElement("button");
  replay.type = "button";
  replay.className = "button button--quiet button--large";
  replay.textContent = text.replayIntro;
  replay.addEventListener("click", onReplay);

  element.append(heading, note, replay);
  return { element, replay };
}
