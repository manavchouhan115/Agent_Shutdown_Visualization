// The cast: reusable drawings for every scene (spec §4 visual language).
// Each figure is drawn around (0, 0) = the middle of its base, going upwards (negative y),
// and returned as a <g> you can place with place(figure, x, y).
//
// Colour rules: the agent and its helpers are teal when normal and red when compromised.
// Everything else here is neutral (grey / ink).
import { label, svg } from "./svg";

export type AgentState = "normal" | "compromised";

/** Moves (and optionally scales) a figure to x, y. */
export function place<T extends SVGElement>(figure: T, x: number, y: number, scale = 1): T {
  figure.setAttribute("transform", `translate(${x} ${y})${scale !== 1 ? ` scale(${scale})` : ""}`);
  return figure;
}

// ---------- Keys ----------

/** One key, hanging down from (0, 0). */
function key(angle = 0): SVGGElement {
  return svg("g", { class: "fig-key", transform: `rotate(${angle})` }, [
    svg("circle", { cx: 0, cy: 7, r: 5 }),
    svg("path", { d: "M0 12 V30 M0 25 h5 M0 29 h4" }),
  ]);
}

/** A bunch of keys on a ring, hanging from (0, 0). */
export function keyBunch(count = 3): SVGGElement {
  const angles = count === 1 ? [0] : Array.from({ length: count }, (_, i) => -22 + (44 / (count - 1)) * i);
  return svg("g", { class: "fig-keys" }, [
    svg("circle", { cx: 0, cy: 0, r: 5, class: "fig-key-ring" }),
    ...angles.map((a) => key(a)),
  ]);
}

/**
 * The officer's keyring: keys fanned out from one ring, each named at its tip
 * (Step 3, before it is handed over). The ring's centre is (0, 0).
 */
export function labelledKeyring(names: string[]): SVGGElement {
  const group = svg("g", { class: "fig-keyring" });
  const spread = 50; // degrees either side of straight down
  names.forEach((name, i) => {
    const angle = names.length === 1 ? 0 : -spread + ((2 * spread) / (names.length - 1)) * i;
    const radians = (angle * Math.PI) / 180;
    // Straight-down labels sit lower so they don't collide with their neighbours.
    const distance = angle === 0 ? 92 : 78;
    group.append(
      svg("g", { transform: `rotate(${-angle})` }, [place(svg("g", {}, [key()]), 0, 16, 1.5)]),
      label(name, Math.sin(radians) * distance, Math.cos(radians) * distance, true),
    );
  });
  group.append(svg("circle", { cx: 0, cy: 0, r: 13, class: "fig-key-ring" }));
  return group;
}

/** Rings drawn around something to show it is in use (flat, no glow effects). */
export function inUseRings(r = 14): SVGGElement {
  return svg("g", { class: "fig-in-use" }, [
    svg("circle", { cx: 0, cy: 0, r }),
    svg("circle", { cx: 0, cy: 0, r: r + 7 }),
  ]);
}

// ---------- Agent and helpers ----------

/** The operations agent: a simple geometric figure with a belt for keys. */
export function agent(options: { state?: AgentState; keys?: number; name?: string } = {}): SVGGElement {
  const { state = "normal", keys = 0, name } = options;
  const group = svg("g", { class: `fig-agent${state === "compromised" ? " is-compromised" : ""}` }, [
    svg("rect", { x: -16, y: -9, width: 32, height: 9, rx: 3, class: "fig-body" }),
    svg("rect", { x: -20, y: -58, width: 40, height: 50, rx: 12, class: "fig-body" }),
    svg("circle", { cx: 0, cy: -73, r: 13, class: "fig-body" }),
    // A small diamond on the chest: marks it as a system, not a person.
    svg("path", { d: "M0 -50 l6 7 -6 7 -6 -7 z", class: "fig-emblem" }),
    svg("rect", { x: -21, y: -30, width: 42, height: 5, rx: 2, class: "fig-belt" }),
  ]);
  // Keys hang at the side, just past the end of the belt, so they stay visible.
  // The mount has no position of its own, so animations can swing the keys without moving them.
  if (keys > 0) group.append(svg("g", { class: "fig-keys-mount" }, [place(keyBunch(keys), 25, -28, 0.8)]));
  if (name) group.append(label(name, 0, 14));
  return group;
}

/** A helper (sub-agent): a copy of the agent in its colour. Place it smaller, e.g. place(h, x, y, 0.6). */
export function helper(options: { state?: AgentState; keys?: number } = {}): SVGGElement {
  const figure = agent({ ...options, name: undefined });
  figure.classList.add("fig-helper");
  return figure;
}

// ---------- People and places ----------

/** The duty officer: a faceless silhouette at a desk with a screen. */
export function officerAtDesk(name?: string): SVGGElement {
  const group = svg("g", { class: "fig-officer-desk" }, [
    // Chair back, then the person, then the desk in front.
    svg("rect", { x: -56, y: -74, width: 7, height: 40, rx: 2, class: "fig-furniture" }),
    svg("circle", { cx: -30, cy: -82, r: 11, class: "fig-officer" }),
    svg("path", { d: "M-48 -40 V-58 q0 -10 10 -10 h16 q10 0 10 10 V-40 z", class: "fig-officer" }),
    svg("rect", { x: -6, y: -70, width: 30, height: 20, rx: 2, class: "fig-furniture" }),
    svg("path", { d: "M9 -50 V-44", class: "fig-line" }),
    svg("rect", { x: -60, y: -44, width: 110, height: 6, rx: 1, class: "fig-furniture" }),
    svg("path", { d: "M-54 -38 V0 M44 -38 V0", class: "fig-line fig-line--thick" }),
  ]);
  if (name) group.append(label(name, -5, 14));
  return group;
}

/** The AI model: a cloud with a few connected points. It only thinks. */
export function aiModel(name?: string): SVGGElement {
  const group = svg("g", { class: "fig-model" }, [
    svg("path", {
      d: "M-46 0 a20 20 0 0 1 -2 -38 a26 26 0 0 1 44 -22 a30 30 0 0 1 54 10 a22 22 0 0 1 2 50 z",
      class: "fig-model-cloud",
    }),
    svg("path", { d: "M-24 -22 L0 -36 L22 -18 L0 -8 Z M0 -36 V-8", class: "fig-model-link" }),
    ...[
      [-24, -22],
      [0, -36],
      [22, -18],
      [0, -8],
    ].map(([cx, cy]) => svg("circle", { cx, cy, r: 4, class: "fig-model-node" })),
  ]);
  if (name) group.append(label(name, 0, 14));
  return group;
}

/** A gate in front of a service, with a card reader. Stands on (0, 0). */
export function gate(): SVGGElement {
  return svg("g", { class: "fig-gate" }, [
    svg("rect", { x: -34, y: -44, width: 8, height: 44, rx: 2, class: "fig-gate-post" }),
    svg("rect", { x: 26, y: -44, width: 8, height: 44, rx: 2, class: "fig-gate-post" }),
    svg("path", { d: "M-26 -30 H26", class: "fig-line fig-line--thick" }),
    // The reader: where the key is checked.
    svg("rect", { x: -42, y: -64, width: 24, height: 18, rx: 3, class: "fig-gate-reader" }),
    svg("rect", { x: -37, y: -60, width: 14, height: 6, rx: 1, class: "fig-gate-screen" }),
  ]);
}

/** A resident record: a small document. */
export function record(): SVGGElement {
  return svg("g", { class: "fig-record" }, [
    svg("rect", { x: -6, y: -8, width: 12, height: 15, rx: 1.5 }),
    svg("path", { d: "M-3 -3 h6 M-3 1 h6 M-3 4 h4" }),
  ]);
}

/**
 * A badge such as "Access granted", above (0, 0).
 * It is sized in "em", so it grows with the readable label size.
 */
export function badge(text: string): SVGGElement {
  const width = text.length * 0.56 + 2.4;
  return svg("g", { class: "fig-badge" }, [
    svg("rect", { x: `${-width / 2}em`, y: "-2.1em", width: `${width}em`, height: "1.9em", rx: "0.4em" }),
    svg("text", { x: 0, y: "-1.15em" }, [`✓ ${text}`]),
  ]);
}

// ---------- Arrows ----------

type Point = { x: number; y: number };

/** A point part-way (t = 0…1) along a curved arrow. */
export function pointOnArrow(from: Point, to: Point, bend: number, t: number): Point {
  const c = control(from, to, bend);
  const u = 1 - t;
  return {
    x: u * u * from.x + 2 * u * t * c.x + t * t * to.x,
    y: u * u * from.y + 2 * u * t * c.y + t * t * to.y,
  };
}

/** The curve's middle handle, pushed sideways by `bend`. */
function control(from: Point, to: Point, bend: number): Point {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: mx - (dy / length) * bend, y: my + (dx / length) * bend };
}

/** An action arrow from the agent to a service. Teal when normal, red when harmful. */
export function arrow(from: Point, to: Point, options: { bend?: number; harmful?: boolean } = {}): SVGGElement {
  const { bend = 0, harmful = false } = options;
  const c = control(from, to, bend);
  const angle = (Math.atan2(to.y - c.y, to.x - c.x) * 180) / Math.PI;
  return svg("g", { class: `fig-arrow${harmful ? " is-harmful" : ""}` }, [
    svg("path", { d: `M${from.x} ${from.y} Q${c.x} ${c.y} ${to.x - 0} ${to.y}`, class: "fig-arrow-line" }),
    svg("path", {
      d: "M0 0 L-12 -6 L-12 6 Z",
      class: "fig-arrow-head",
      transform: `translate(${to.x} ${to.y}) rotate(${angle})`,
    }),
  ]);
}

/** Records spread along an arrow, as if flowing along it. */
export function recordsAlong(from: Point, to: Point, bend: number, count: number): SVGGElement {
  const group = svg("g", { class: "fig-records" });
  for (let i = 1; i <= count; i++) {
    const p = pointOnArrow(from, to, bend, i / (count + 1));
    group.append(place(record(), p.x, p.y));
  }
  return group;
}

// ---------- The agent loop (Step 6) ----------

/**
 * A ring around the agent with four words (Think, Act, Check, Repeat) placed
 * top, right, bottom, left, and arrowheads showing it turns clockwise. Centred on (0, 0).
 */
export function loopRing(words: string[], r = 62): SVGGElement {
  const group = svg("g", { class: "fig-loop" }, [svg("circle", { cx: 0, cy: 0, r, class: "fig-loop-ring" })]);

  // Arrowheads between the words, pointing clockwise.
  for (const degrees of [45, 135, 225, 315]) {
    const a = (degrees * Math.PI) / 180;
    group.append(
      svg("path", {
        d: "M0 0 L-10 -6 L-10 6 Z",
        class: "fig-loop-head",
        transform: `translate(${Math.cos(a) * r} ${Math.sin(a) * r}) rotate(${degrees + 90})`,
      }),
    );
  }

  // Words: top, right, bottom, left. Each sits on a small white tab so it reads over the ring.
  const spots = [
    { x: 0, y: -r - 26 },
    { x: r + 34, y: -10 },
    { x: 0, y: r + 8 },
    { x: -r - 34, y: -10 },
  ];
  words.slice(0, 4).forEach((word, i) => {
    const text = label(word, spots[i].x, spots[i].y, true);
    text.classList.add("fig-loop-word");
    group.append(text);
  });
  return group;
}
