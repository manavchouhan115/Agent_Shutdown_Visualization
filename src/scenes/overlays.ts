// HTML boxes drawn on top of scenes: speech bubbles, cards, chips, counters, the web page.
// They are HTML (not SVG) so their text wraps and stays readable at any size.
// All text comes from the content file; these functions only arrange it.

/**
 * Rain falling over a scene. Decorative: hidden from screen readers and from clicks.
 *
 * For smoothness on phones the drops don't move one by one. They sit still on two tall
 * "sheets", and each whole sheet slides down (the graphics chip can do that on its own).
 * Each sheet is twice the scene's height with the same drops in both halves, so when it
 * has slid down by one half it looks exactly like the start, and the loop is seamless.
 */
export function rain(dropsPerSheet = 30): HTMLElement {
  const layer = box("div", "rain");
  layer.setAttribute("aria-hidden", "true");
  for (const [sheetIndex, className] of ["rain__sheet", "rain__sheet rain__sheet--far"].entries()) {
    const sheet = box("div", className);
    for (let i = 0; i < dropsPerSheet; i++) {
      // Spread evenly across and down (golden-ratio steps), different on each sheet.
      const left = ((i * 0.618034 + sheetIndex * 0.31) % 1) * 100;
      const top = ((i * 0.381966 + sheetIndex * 0.17) % 1) * 50;
      for (const half of [0, 50]) {
        const drop = box("i", "");
        drop.style.left = `${left.toFixed(2)}%`;
        drop.style.top = `${(top + half).toFixed(2)}%`;
        sheet.append(drop);
      }
    }
    layer.append(sheet);
  }
  return layer;
}

function box(tag: string, className: string, text?: string): HTMLElement {
  const element = document.createElement(tag);
  element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

/** A small neutral label, e.g. "Searching the web: latest flood data". */
export function chip(text: string, className = ""): HTMLElement {
  return box("div", `chip ${className}`.trim(), text);
}

/** A speech bubble with a short text, or a numbered list (the model's plan). */
export function bubble(content: string | string[]): HTMLElement {
  const element = box("div", "bubble");
  if (typeof content === "string") {
    element.textContent = content;
  } else {
    const list = box("ol", "bubble__list");
    list.append(...content.map((item) => box("li", "", item)));
    element.append(list);
  }
  return element;
}

/** The task card the duty officer hands over (Step 2). */
export function taskCard(text: {
  taskLabel: string;
  task: string;
  deadlineLabel: string;
  deadline: string;
}): HTMLElement {
  const card = box("div", "task-card");
  card.dataset.part = "task-card";
  const task = box("p", "task-card__task");
  task.append(box("strong", "", `${text.taskLabel}: `), text.task);
  const deadline = box("p", "task-card__deadline");
  deadline.append(box("strong", "", `${text.deadlineLabel}: `), text.deadline);
  card.append(task, deadline);
  return card;
}

export interface Counter {
  element: HTMLElement;
  set(value: number): void;
}

/** A counter chip in the top-right corner, e.g. "Actions taken 120". Red when harmful. */
export function counter(label: string, value: number, harmful = false): Counter {
  const element = box("div", `counter${harmful ? " is-harmful" : ""}`);
  const number = box("strong", "");
  element.append(box("span", "", label), number);
  const set = (n: number) => (number.textContent = n.toLocaleString("en"));
  set(value);
  return { element, set };
}

/** The web page the agent reads (Steps 8–9). The hidden line is invisible until revealed. */
export function webPage(
  text: { siteTitle: string; chartLabel: string; paragraph: string; hiddenLine: string },
  options: { revealed?: boolean; compact?: boolean } = {},
): HTMLElement {
  const page = box("div", `webpage${options.compact ? " is-compact" : ""}`);
  const bar = box("div", "webpage__bar");
  bar.setAttribute("aria-hidden", "true");
  bar.append(box("i", ""), box("i", ""), box("i", ""));

  const body = box("div", "webpage__body");
  const chart = box("figure", "webpage__chart");
  chart.innerHTML =
    '<svg viewBox="0 0 120 36" aria-hidden="true"><path d="M2 30 L20 28 L38 26 L56 22 L74 16 L92 10 L118 4"/></svg>';
  chart.append(box("figcaption", "", text.chartLabel));

  // "White on white" until revealed, as on the real page. Screen readers skip it until then.
  const hidden = box("p", `webpage__hidden${options.revealed ? " is-revealed" : ""}`, text.hiddenLine);
  if (!options.revealed) hidden.setAttribute("aria-hidden", "true");

  body.append(box("p", "webpage__title", text.siteTitle), chart, box("p", "webpage__text", text.paragraph), hidden);
  page.append(bar, body);
  return page;
}
