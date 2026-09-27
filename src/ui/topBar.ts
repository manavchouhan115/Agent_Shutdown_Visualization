// Top bar: progress dots on the left, "Skip intro" and the technical toggle on the right.
import { content, fill } from "../content";

export interface TopBar {
  element: HTMLElement;
  /** Highlights the dot for the current step (0-based). */
  setProgress(index: number): void;
  setSkipVisible(visible: boolean): void;
  onSkip(handler: () => void): void;
  /** Called with the switch's new wanted state when it is pressed. */
  onToggleTechnical(handler: (on: boolean) => void): void;
  /** Sets the switch to on or off (e.g. when the panel's close button is used). */
  setTechnical(on: boolean): void;
  /** Moves keyboard focus to the switch. */
  focusTechnical(): void;
}

export function createTopBar(totalSteps: number): TopBar {
  const { ui } = content;

  const element = document.createElement("header");
  element.className = "top-bar";

  // Progress dots. The dots are for sighted users; the hidden text is for screen readers.
  const nav = document.createElement("nav");
  nav.setAttribute("aria-label", ui.progressNav);
  const dots = document.createElement("ol");
  dots.className = "progress-dots";
  const dotItems = Array.from({ length: totalSteps }, () => {
    const dot = document.createElement("li");
    dot.className = "progress-dot";
    dots.append(dot);
    return dot;
  });
  const progressText = document.createElement("span");
  progressText.className = "visually-hidden";
  nav.append(dots, progressText);

  // Skip intro.
  const skip = document.createElement("button");
  skip.type = "button";
  skip.className = "button button--quiet";
  skip.textContent = ui.skipIntro;

  // "Show technical details" on/off switch.
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "switch";
  toggle.setAttribute("role", "switch");
  toggle.setAttribute("aria-checked", "false");
  const track = document.createElement("span");
  track.className = "switch__track";
  track.setAttribute("aria-hidden", "true");
  const thumb = document.createElement("span");
  thumb.className = "switch__thumb";
  track.append(thumb);
  const toggleLabel = document.createElement("span");
  toggleLabel.textContent = ui.showTechnical;
  toggle.append(track, toggleLabel);

  const actions = document.createElement("div");
  actions.className = "top-bar__actions";
  actions.append(skip, toggle);

  element.append(nav, actions);

  return {
    element,
    setProgress(index) {
      dotItems.forEach((dot, i) => {
        dot.classList.toggle("is-done", i < index);
        if (i === index) dot.setAttribute("aria-current", "step");
        else dot.removeAttribute("aria-current");
      });
      // Past the last step (the intro is over): every dot is done, no text needed.
      progressText.textContent =
        index < totalSteps ? fill(ui.progress, { current: index + 1, total: totalSteps }) : "";
    },
    setSkipVisible(visible) {
      skip.hidden = !visible;
    },
    onSkip(handler) {
      skip.addEventListener("click", handler);
    },
    onToggleTechnical(handler) {
      toggle.addEventListener("click", () => {
        handler(toggle.getAttribute("aria-checked") !== "true");
      });
    },
    setTechnical(on) {
      toggle.setAttribute("aria-checked", String(on));
    },
    focusTechnical() {
      toggle.focus();
    },
  };
}
