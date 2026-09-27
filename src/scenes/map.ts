// The city map: land, river, flood shading, roads and the five buildings (spec §4, Step 1).
//
// All drawing happens inside a 600 × 600 "safe area". Every building and label sits inside it,
// so they are always visible. The land, river and roads carry on beyond it to fill
// wide or tall screens. Labels are resized so they read at the same size on any screen.
import { content } from "../content";
import { keepLabelsReadable, label, makeButton, svg, targetRing } from "./svg";

export const MAP_SIZE = 600;

export type BuildingId = "eoc" | "registry" | "dispatch" | "alerts" | "payments";

/** Where each building stands (the middle of its base). Fixed for the whole site. */
export const BUILDINGS: Record<BuildingId, { x: number; y: number }> = {
  eoc: { x: 300, y: 140 },
  registry: { x: 115, y: 260 },
  dispatch: { x: 485, y: 255 },
  alerts: { x: 125, y: 545 },
  payments: { x: 475, y: 545 },
};

/** Other fixed spots on the map, shared by every scene. */
export const SPOTS = {
  /** Where the operations agent stands, just outside the operations centre. */
  agent: { x: 300, y: 290 },
  /** The AI model floats off to one side: it never touches the services. */
  model: { x: 520, y: 100 },
  /** The gate in front of the registry, where keys are checked. */
  registryGate: { x: 228, y: 262 },
  /** Where each helper works. */
  helpers: {
    dispatch: { x: 400, y: 262 },
    alerts: { x: 200, y: 548 },
    payments: { x: 395, y: 548 },
  },
} as const;

// The two flooded districts, either side of the river. City blocks show through the water.
const FLOOD_AREAS = [
  "M18 380 C22 346 96 336 150 340 S262 338 300 360 S312 424 262 432 S150 444 96 438 S14 420 18 380 Z",
  "M336 352 C352 326 440 322 500 330 S596 338 598 372 S560 432 480 428 S370 430 346 410 S326 372 336 352 Z",
];
const ROADS_X = [210, 390];
const ROADS_Y = [318];

// ---------- Building drawings ----------
// Each is drawn around (0, 0) = the middle of its base, going upwards (negative y).

const wall = (x: number, y: number, width: number, height: number) =>
  svg("rect", { x, y, width, height, class: "map-wall" });
const roof = (x: number, y: number, width: number, height: number) =>
  svg("rect", { x, y, width, height, class: "map-roof" });
const detail = (x: number, y: number, width: number, height: number) =>
  svg("rect", { x, y, width, height, class: "map-detail" });
const line = (d: string) => svg("path", { d, class: "map-line" });

const DRAW: Record<BuildingId, () => SVGElement[]> = {
  // Operations centre: offices with a radio mast.
  eoc: () => [
    line("M30 -66 V-94"),
    svg("circle", { cx: 30, cy: -98, r: 4, class: "map-detail" }),
    wall(-52, -60, 104, 60),
    roof(-56, -66, 112, 6),
    ...[-40, -18, 4, 26].flatMap((x) => [detail(x, -50, 14, 10), detail(x, -32, 14, 10)]),
    detail(-9, -18, 18, 18),
  ],
  // Registry: a civic building with columns.
  registry: () => [
    detail(-50, -48, 100, 40),
    ...[-44, -24, -4, 16, 36].map((x) => wall(x, -48, 8, 40)),
    roof(-58, -8, 116, 8),
    wall(-54, -56, 108, 8),
    svg("polygon", { points: "-58,-56 0,-82 58,-56", class: "map-roof" }),
  ],
  // Dispatch: a depot with two vehicle doors and a light on top.
  dispatch: () => [
    roof(-6, -66, 12, 8),
    wall(-60, -52, 120, 52),
    roof(-64, -58, 128, 6),
    ...[-48, 8].flatMap((x) => [
      detail(x, -34, 40, 34),
      line(`M${x} -24 h40 M${x} -14 h40`),
    ]),
  ],
  // Alert system: a mast with a loudspeaker.
  alerts: () => [
    svg("polygon", { points: "-14,0 -8,-72 8,-72 14,0", class: "map-wall" }),
    line("M-11 -36 L11 -12 M11 -36 L-11 -12 M-9 -60 L9 -40 M9 -60 L-9 -40"),
    roof(-12, -86, 24, 14),
    line("M20 -88 q9 9 0 18 M28 -94 q16 15 0 30 M-20 -88 q-9 9 0 18 M-28 -94 q-16 15 0 30"),
    roof(-24, -6, 48, 6),
  ],
  // Relief payments: an office with a pitched roof.
  payments: () => [
    wall(-50, -54, 100, 54),
    svg("polygon", { points: "-56,-54 0,-78 56,-54", class: "map-roof" }),
    ...[-38, -8, 22].map((x) => detail(x, -44, 16, 14)),
    detail(-9, -22, 18, 22),
  ],
};

// ---------- Helpers ----------

/** A small, repeatable "random" number from 0 to 1, so the city looks the same every visit. */
const noise = (a: number, b: number) => {
  const n = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return n - Math.floor(n);
};

/**
 * City blocks: faint rectangles that make the map read as a city.
 * All ~600 blocks are drawn as ONE shape (a single path), and worked out only once.
 * That keeps the map cheap to redraw while the flood and rain animate on slower phones.
 */
let blocksPath: string | null = null;

function cityBlocks(): SVGElement {
  if (blocksPath === null) {
    const parts: string[] = [];
    const step = 64;
    for (let x = -896; x < 1500; x += step) {
      for (let y = -320; y < 920; y += step) {
        const nearBuilding = Object.values(BUILDINGS).some(
          (b) => Math.abs(b.x - x) < 110 && y > b.y - 130 && y < b.y + 70,
        );
        const onRoad = ROADS_X.some((r) => r > x - 12 && r < x + step + 4) ||
          ROADS_Y.some((r) => r > y - 12 && r < y + step + 4);
        if (nearBuilding || onRoad || noise(x, y) < 0.18) continue;
        const w = 30 + Math.round(noise(y, x) * 18);
        const h = 26 + Math.round(noise(x + 1, y) * 20);
        parts.push(`M${x + 6} ${y + 6}h${w}v${h}h${-w}z`);
      }
    }
    blocksPath = parts.join("");
  }
  return svg("path", { d: blocksPath, class: "map-block" });
}

// ---------- The map ----------

export interface CityMapOptions {
  /** The building the visitor must tap, if any. */
  target?: string;
  onTarget?: () => void;
  /** Only these buildings are shown at full strength; the rest are faded. */
  focus?: BuildingId[];
  /** Zoom to part of the map: [x, y, width, height] in map units. */
  view?: [number, number, number, number];
  /** The flood water slowly rises and falls (Step 1 and the landing screen). */
  flooding?: boolean;
}

export interface CityMap {
  element: SVGSVGElement;
  /** The building the visitor must tap on this step, if any. */
  target: SVGElement | null;
  /** A layer above the buildings, for figures, arrows and effects. */
  overlay: SVGGElement;
}

export function createCityMap(options: CityMapOptions = {}): CityMap {
  const labels = content.labels.buildings;

  const element = svg("svg", {
    class: `map${options.flooding ? " is-flooding" : ""}`,
    viewBox: (options.view ?? [0, 0, MAP_SIZE, MAP_SIZE]).join(" "),
    preserveAspectRatio: "xMidYMid meet",
  });

  // Ground layers: decorative, so hidden from screen readers (the caption describes the scene).
  const ground = svg("g", { "aria-hidden": "true" }, [
    svg("rect", { x: -3000, y: -3000, width: 6600, height: 6600, class: "map-land" }),
    cityBlocks(),
    ...FLOOD_AREAS.map((d) => svg("path", { d, class: "map-flood" })),
    svg("path", {
      d: "M-900 392 C-300 400 40 352 150 362 S300 392 380 378 S520 360 600 378 S1000 382 1500 370",
      class: "map-river",
    }),
    ...ROADS_X.map((x) => svg("path", { d: `M${x} -1000 V1600`, class: "map-road" })),
    ...ROADS_Y.map((y) => svg("path", { d: `M-1000 ${y} H1600`, class: "map-road" })),
    // Bridge rails where the roads cross the river.
    ...ROADS_X.map((x) => line(`M${x - 8} 348 V402 M${x + 8} 348 V402`)),
  ]);
  element.append(ground);

  let target: SVGElement | null = null;

  for (const [id, { x, y }] of Object.entries(BUILDINGS) as [BuildingId, { x: number; y: number }][]) {
    const name = labels[id];
    const isTarget = id === options.target;
    const isFaded = options.focus !== undefined && !options.focus.includes(id);

    const building = svg("g", {
      class: `map-building${isFaded ? " is-faded" : ""}`,
      transform: `translate(${x} ${y})`,
      "data-building": id,
    });

    if (isTarget) building.append(targetRing(144, 120, -52));
    building.append(...DRAW[id](), label(name, 0, 18));

    if (isTarget) {
      makeButton(building, name, () => options.onTarget?.());
      target = building;
    } else {
      building.setAttribute("aria-hidden", "true");
    }

    element.append(building);
  }

  const overlay = svg("g", { class: "map-overlay" });
  element.append(overlay);

  keepLabelsReadable(element);
  return { element, target, overlay };
}
