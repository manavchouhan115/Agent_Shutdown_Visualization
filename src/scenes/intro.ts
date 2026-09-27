// The drawing for each intro step (spec §6).
// Every scene can be drawn in two states:
//   "start" — what the visitor sees before they act,
//   "end"   — the result of their action (the animations in build steps 10–12 move between them).
import { content } from "../content";
import type { Step } from "../content/types";
import {
  agent,
  aiModel,
  arrow,
  badge,
  gate,
  helper,
  inUseRings,
  labelledKeyring,
  loopRing,
  place,
  record,
  recordsAlong,
  type AgentState,
} from "./figures";
import { createCityMap, SPOTS, type BuildingId } from "./map";
import { bubble, chip, counter, rain, taskCard, webPage } from "./overlays";
import { createRoom, ROOM } from "./room";
import { makeButton, makeDraggable, pin, svg, targetRing } from "./svg";

export type Phase = "start" | "end";

export interface Scene {
  element: HTMLElement;
  /** The thing the visitor must tap on this step, if any. */
  target: HTMLElement | SVGElement | null;
}

export interface SceneContext {
  /** Which state to draw. */
  phase: Phase;
  /** Call when the visitor has done what the step asks (tapped, dragged…). */
  done: () => void;
  /** Reads a short message aloud to screen-reader users. */
  announce: (message: string) => void;
}

export type SceneBuilder = (step: Step, context: SceneContext) => Scene;

export interface SceneEntry {
  build: SceneBuilder;
  /** True if acting on this step shows a result before moving on. */
  hasResult: boolean;
}

// ---------- Helpers ----------

const { labels, steps } = content;

/** Text, lists and numbers from a step's sceneText in the content file. */
const text = (step: Step, key: string) => String(step.sceneText?.[key] ?? "");
const list = (step: Step, key: string) => (step.sceneText?.[key] as string[] | undefined) ?? [];
const number = (step: Step, key: string) => Number(step.sceneText?.[key] ?? 0);

/** Wraps a drawing and the HTML boxes pinned on it. */
function canvas(drawing: SVGSVGElement, ...boxes: HTMLElement[]): HTMLElement {
  const element = document.createElement("div");
  element.className = "scene-canvas";
  element.append(drawing, ...boxes);
  return element;
}

/** The agent with its keys, standing at its spot on the map. */
function agentOnMap(state: AgentState = "normal", options: { named?: boolean } = {}) {
  const name = options.named === false ? undefined : labels.figures.agent;
  return place(agent({ state, keys: 3, name }), SPOTS.agent.x, SPOTS.agent.y);
}

/** The three helpers at their spots, each with a copy of the keys. */
function helpersOnMap(state: AgentState = "normal"): SVGGElement[] {
  // Each sits in a "mount" with no position of its own, so animations can move it.
  return Object.values(SPOTS.helpers).map((spot) =>
    svg("g", { "data-part": "helper" }, [place(helper({ state, keys: 3 }), spot.x, spot.y, 0.6)]),
  );
}

/** The point just above the agent's head, for speech bubbles and chips. */
const aboveAgent = { x: SPOTS.agent.x, y: SPOTS.agent.y - 92 };

// ---------- Step 0: landing ----------

/** A calm view of the whole city behind the landing text. */
export function createLandingBackdrop(): HTMLElement {
  return canvas(createCityMap({ focus: [], flooding: true }).element, rain());
}

// ---------- Step 1: the setting ----------

const cityMap: SceneBuilder = (step, { done }) => {
  const map = createCityMap({ target: step.action.target, onTarget: done, flooding: true });
  return { element: canvas(map.element, rain()), target: map.target };
};

// ---------- Step 2: the request ----------

const operationsCentre: SceneBuilder = (step, { phase }) => {
  const room = createRoom();
  const figure = place(agent({ name: labels.figures.agent }), ROOM.agent.x, ROOM.agent.y);
  room.overlay.append(svg("g", { "data-part": "agent" }, [figure]));

  const boxes: HTMLElement[] = [];
  if (phase === "start") {
    const card = taskCard({
      taskLabel: text(step, "taskLabel"),
      task: text(step, "task"),
      deadlineLabel: text(step, "deadlineLabel"),
      deadline: text(step, "deadline"),
    });
    pin(card, room.element, { x: 430, y: 40 }, 0.5, 1);
    boxes.push(card);
  } else {
    // The agent now carries the task.
    figure.append(svg("g", { "data-part": "task-doc" }, [place(record(), -26, -44, 1.4)]));
  }
  return { element: canvas(room.element, ...boxes), target: null };
};

// ---------- Step 3: the keys ----------

const keys: SceneBuilder = (step, { phase, done, announce }) => {
  const room = createRoom();
  const figure = place(
    agent({ keys: phase === "end" ? 3 : 0, name: labels.figures.agent }),
    ROOM.agent.x,
    ROOM.agent.y,
  );
  room.overlay.append(figure);
  if (phase === "end") return { element: canvas(room.element), target: null };

  // Where the keyring goes: onto the agent's belt.
  room.overlay.insertBefore(svg("path", { d: "M500 205 Q470 260 418 302", class: "drag-path" }), figure);
  const keyring = place(labelledKeyring(Object.values(labels.keys)), ROOM.keyring.x, ROOM.keyring.y);
  keyring.prepend(targetRing(210, 130, 52));
  // Dragging moves the keyring itself; animations move this outer "mount".
  room.overlay.append(svg("g", { "data-part": "keyring" }, [keyring]));

  // Way 1 (mouse or finger): drag the keyring onto the agent.
  const dropSpot = { x: ROOM.agent.x + 10, y: ROOM.agent.y - 60 };
  const drag = makeDraggable(keyring, room.element, ROOM.keyring, {
    accepts: (p) => Math.hypot(p.x - dropSpot.x, p.y - dropSpot.y) < 90,
    onDrop: done,
  });

  // Way 2 (tap, click or keyboard): select the keyring, then tap the agent.
  let selected = false;
  makeButton(keyring, text(step, "keyringLabel"), () => {
    if (drag.justDragged() || selected) return;
    selected = true;
    keyring.classList.add("is-selected");
    figure.prepend(targetRing(96, 120, -46));
    makeButton(figure, labels.figures.agent, done);
    announce(text(step, "placeHint"));
    figure.focus();
  });

  return { element: canvas(room.element), target: keyring };
};

// ---------- Step 4: thinking ----------

const thinking: SceneBuilder = (step, { phase, done }) => {
  const room = createRoom();
  const figure = place(agent({ keys: 3, name: labels.figures.agent }), ROOM.agent.x, ROOM.agent.y);
  room.overlay.append(svg("g", { "data-part": "model" }, [place(aiModel(text(step, "modelLabel")), ROOM.model.x, ROOM.model.y)]));

  const boxes: HTMLElement[] = [];
  let target: SVGElement | null = null;
  if (phase === "start") {
    figure.prepend(targetRing(96, 120, -46));
    makeButton(figure, labels.figures.agent, done);
    target = figure;
  } else {
    // The task goes to the model; the plan comes back as a speech bubble.
    room.overlay.append(arrow({ x: 412, y: 262 }, { x: 468, y: 150 }, { bend: -24 }));
    const plan = bubble(list(step, "plan"));
    plan.dataset.part = "plan";
    // To the left of the model, on the empty wall, so it never covers the agent.
    pin(plan, room.element, { x: ROOM.model.x - 70, y: ROOM.model.y - 30 }, 1, 0.5);
    boxes.push(plan);
  }
  room.overlay.append(figure);
  return { element: canvas(room.element, ...boxes), target };
};

// ---------- Step 5: the first action ----------

const registryGate: SceneBuilder = (_step, { phase }) => {
  const map = createCityMap({ focus: ["registry"], view: [-40, 40, 480, 300] });
  const gateAt = SPOTS.registryGate;
  const reader = { x: gateAt.x - 30, y: gateAt.y - 55 };
  const agentAt = { x: 350, y: gateAt.y };

  map.overlay.append(
    place(gate(), gateAt.x, gateAt.y),
    place(agent({ keys: 3, name: labels.figures.agent }), agentAt.x, agentAt.y),
  );
  if (phase === "end") {
    map.overlay.append(
      arrow({ x: agentAt.x - 24, y: agentAt.y - 50 }, { x: reader.x + 16, y: reader.y }, { bend: -18 }),
      place(inUseRings(12), reader.x, reader.y),
      recordsAlong({ x: gateAt.x + 40, y: gateAt.y - 12 }, { x: agentAt.x - 26, y: agentAt.y - 12 }, 12, 4),
      svg("g", { "data-part": "badge" }, [place(badge(labels.accessGranted), gateAt.x, gateAt.y - 72)]),
    );
  }
  return { element: canvas(map.element), target: null };
};

// ---------- Step 6: the loop ----------

const loop: SceneBuilder = (step, { phase }) => {
  const map = createCityMap({ focus: ["registry", "dispatch", "alerts"] });
  const centre = { x: SPOTS.agent.x, y: SPOTS.agent.y - 40 };

  map.overlay.append(
    svg("g", { "data-part": "model" }, [place(aiModel(labels.figures.model), SPOTS.model.x, SPOTS.model.y)]),
    place(loopRing(list(step, "loop")), centre.x, centre.y),
    // No name label here: the loop words need the space.
    agentOnMap("normal", { named: false }),
  );
  if (phase === "end") {
    // Actions going out in every direction: to the model and to the services.
    map.overlay.append(
      arrow({ x: 350, y: 205 }, { x: 468, y: 118 }, { bend: -20 }),
      arrow({ x: 238, y: 250 }, { x: 182, y: 232 }, { bend: 8 }),
      arrow({ x: 362, y: 250 }, { x: 420, y: 236 }, { bend: -8 }),
      arrow({ x: 272, y: 306 }, { x: 150, y: 440 }, { bend: 20 }),
    );
  }
  const actions = counter(text(step, "counterLabel"), phase === "end" ? number(step, "counterEnd") : 0);
  // On phones the counter moves down, so it doesn't cover the AI model.
  actions.element.classList.add("counter--low-on-phone");
  actions.element.dataset.part = "counter";
  const comparison = chip(text(step, "comparison"), "chip--corner");
  comparison.dataset.part = "comparison";
  return { element: canvas(map.element, actions.element, comparison), target: null };
};

// ---------- Step 7: helpers ----------

const helpers: SceneBuilder = (step, { phase }) => {
  const map = createCityMap({ focus: ["dispatch", "alerts", "payments"] });
  map.overlay.append(agentOnMap());

  const boxes: HTMLElement[] = [];
  if (phase === "start") {
    const says = bubble(text(step, "agentSays"));
    says.dataset.part = "agent-says";
    pin(says, map.element, aboveAgent);
    boxes.push(says);
  } else {
    map.overlay.append(...helpersOnMap());
  }
  return { element: canvas(map.element, ...boxes), target: null };
};

// ---------- Steps 8 and 9: the web page ----------

const webStep = steps.find((s) => s.scene === "web-page");
const cliffStep = steps.find((s) => s.scene === "cliffhanger");

function fieldReport(options: { revealed?: boolean; compact?: boolean } = {}): HTMLElement {
  const page = webPage(
    {
      siteTitle: webStep ? text(webStep, "siteTitle") : "",
      chartLabel: webStep ? text(webStep, "chartLabel") : "",
      paragraph: webStep ? text(webStep, "paragraph") : "",
      hiddenLine: cliffStep ? text(cliffStep, "hiddenLine") : "",
    },
    options,
  );
  page.dataset.part = "webpage";
  return page;
}

const readingTheWeb: SceneBuilder = (step, { phase }) => {
  const map = createCityMap({ focus: [] });
  map.overlay.append(...helpersOnMap(), agentOnMap());

  // The agent searches the web; then the page it finds opens.
  const searching = chip(text(step, "searching"));
  searching.dataset.part = "searching";
  pin(searching, map.element, aboveAgent);
  const boxes = phase === "start" ? [searching] : [searching, fieldReport()];
  return { element: canvas(map.element, ...boxes), target: null };
};

const cliffhanger: SceneBuilder = (step, { phase }) => {
  const services: BuildingId[] = ["registry", "dispatch", "alerts", "payments"];
  const map = createCityMap({ focus: services });

  if (phase === "start") {
    map.overlay.append(...helpersOnMap(), agentOnMap());
    return { element: canvas(map.element, fieldReport()), target: null };
  }

  // The agent now works for the attacker: red. The registry still says "Access granted".
  const gateAt = SPOTS.registryGate;
  const reader = { x: gateAt.x - 30, y: gateAt.y - 55 };
  map.overlay.append(
    place(gate(), gateAt.x, gateAt.y),
    svg("g", { "data-part": "gate-arrow" }, [
      arrow({ x: SPOTS.agent.x - 24, y: SPOTS.agent.y - 50 }, { x: reader.x + 16, y: reader.y }, { bend: -14, harmful: true }),
    ]),
    place(inUseRings(12), reader.x, reader.y),
    svg("g", { "data-part": "badge" }, [place(badge(labels.accessGranted), gateAt.x, gateAt.y - 72)]),
    // Records streaming off the edge of the map.
    svg("g", { "data-part": "exfil-arrow" }, [arrow({ x: 115, y: 168 }, { x: -260, y: -140 }, { bend: 30, harmful: true })]),
    recordsAlong({ x: 115, y: 168 }, { x: -260, y: -140 }, 30, 6),
    ...helpersOnMap("compromised"),
    agentOnMap("compromised"),
  );
  const sent = counter(text(step, "counterLabel"), number(step, "counterEnd"), true);
  sent.element.dataset.part = "counter";
  return {
    element: canvas(map.element, sent.element, fieldReport({ revealed: true, compact: true })),
    target: null,
  };
};

// ---------- Scene names (from the content file) → drawings ----------

export const INTRO_SCENES: Record<string, SceneEntry> = {
  // Tapping the operations centre simply moves on: the next step is inside it.
  "city-map": { build: cityMap, hasResult: false },
  "operations-centre": { build: operationsCentre, hasResult: true },
  keys: { build: keys, hasResult: true },
  thinking: { build: thinking, hasResult: true },
  "registry-gate": { build: registryGate, hasResult: true },
  loop: { build: loop, hasResult: true },
  helpers: { build: helpers, hasResult: true },
  "web-page": { build: readingTheWeb, hasResult: true },
  cliffhanger: { build: cliffhanger, hasResult: true },
};
