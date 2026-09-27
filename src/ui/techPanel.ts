// The "Show technical details" panel (spec §3, §5).
// Desktop/tablet: a column that slides in on the right.
// Phone portrait: a bottom sheet. It sits collapsed as a slim bar, so it never hides the
// step's buttons, and the visitor taps it to read the details.
import { content } from "../content";
import type { Step } from "../content/types";

export interface TechPanel {
  element: HTMLElement;
  /** Shows or hides the whole panel (follows the "Show technical details" switch). */
  setOn(on: boolean): void;
  /** Fills the panel with a step's technical text. */
  show(step: Step): void;
  onClose(handler: () => void): void;
}

const PHONE = window.matchMedia("(max-width: 40rem) and (orientation: portrait)");

export function createTechPanel(): TechPanel {
  const { ui } = content;

  const element = document.createElement("aside");
  element.className = "tech-panel";
  element.hidden = true;
  element.setAttribute("aria-labelledby", "tech-panel-title");

  // Header: the title doubles as the expand/collapse button (used on phones).
  const header = document.createElement("div");
  header.className = "tech-panel__header";
  const title = document.createElement("h2");
  title.className = "tech-panel__title";
  title.id = "tech-panel-title";
  const expand = document.createElement("button");
  expand.type = "button";
  expand.className = "tech-panel__expand";
  expand.textContent = ui.technicalPanelTitle;
  expand.setAttribute("aria-controls", "tech-panel-body");
  title.append(expand);

  const close = document.createElement("button");
  close.type = "button";
  close.className = "button button--quiet tech-panel__close";
  close.setAttribute("aria-label", ui.closeTechnicalPanel);
  close.innerHTML =
    '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">' +
    '<path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  header.append(title, close);

  // Body: an optional code sample, then the explanation.
  const body = document.createElement("div");
  body.className = "tech-panel__body";
  body.id = "tech-panel-body";
  const code = document.createElement("pre");
  code.className = "tech-panel__code";
  const note = document.createElement("p");
  note.className = "tech-panel__note";
  body.append(code, note);

  element.append(header, body);

  const setExpanded = (expanded: boolean) => {
    expand.setAttribute("aria-expanded", String(expanded));
    body.hidden = !expanded;
  };
  // Open on desktop, collapsed on phones.
  setExpanded(!PHONE.matches);
  PHONE.addEventListener("change", () => setExpanded(!PHONE.matches));

  expand.addEventListener("click", () => {
    setExpanded(expand.getAttribute("aria-expanded") !== "true");
  });

  // Escape collapses the phone sheet.
  element.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && PHONE.matches) {
      setExpanded(false);
      expand.focus();
    }
  });

  return {
    element,
    setOn(on) {
      element.hidden = !on;
    },
    show(step) {
      code.textContent = step.technical.code ?? "";
      code.hidden = !step.technical.code;
      note.textContent = step.technical.note;
      // On phones, fold the sheet away on every new step so it never covers the buttons.
      if (PHONE.matches) setExpanded(false);
    },
    onClose(handler) {
      close.addEventListener("click", handler);
    },
  };
}
