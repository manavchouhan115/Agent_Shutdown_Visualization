// Inside the emergency operations centre (Steps 2–4): wall, floor, a rainy window,
// and the duty officer at their desk. Figures are added to `overlay`.
import { content } from "../content";
import { officerAtDesk, place } from "./figures";
import { keepLabelsReadable, label, svg } from "./svg";

/** Fixed spots inside the room. */
export const ROOM = {
  view: "20 30 600 370",
  officer: { x: 170, y: 330 },
  agent: { x: 390, y: 330 },
  keyring: { x: 510, y: 95 },
  model: { x: 530, y: 150 },
} as const;

export interface Room {
  element: SVGSVGElement;
  overlay: SVGGElement;
}

export function createRoom(): Room {
  const { labels } = content;
  // Drawn from the bottom up: on tall (phone) screens the spare space is wall at the top,
  // where cards and speech bubbles can sit without covering anyone.
  const element = svg("svg", { class: "room", viewBox: ROOM.view, preserveAspectRatio: "xMidYMax meet" });

  const background = svg("g", { "aria-hidden": "true" }, [
    svg("rect", { x: -2000, y: -2000, width: 5000, height: 5000, class: "room-wall" }),
    svg("rect", { x: -2000, y: 330, width: 5000, height: 2000, class: "room-floor" }),
    // Window: rain outside, flood water rising.
    svg("rect", { x: 40, y: 60, width: 170, height: 120, rx: 4, class: "room-window" }),
    svg("rect", { x: 42, y: 132, width: 166, height: 46, class: "room-water" }),
    svg("path", {
      d: "M70 72 l-8 22 M110 78 l-8 22 M150 68 l-8 22 M190 80 l-8 22 M90 104 l-8 20 M130 100 l-8 22 M175 106 l-8 20",
      class: "room-rain",
    }),
    svg("rect", { x: 40, y: 60, width: 170, height: 120, rx: 4, class: "room-window-frame" }),
  ]);
  // A sign on the wall says where we are. It starts at the window's left edge and grows rightwards.
  const sign = label(labels.buildings.eoc, 40, 40, true);
  sign.classList.add("scene-label--start");
  background.append(sign);

  const overlay = svg("g", { class: "room-overlay" });
  overlay.append(place(officerAtDesk(labels.figures.officer), ROOM.officer.x, ROOM.officer.y));

  element.append(background, overlay);
  keepLabelsReadable(element);
  return { element, overlay };
}
