// Small helpers for drawing SVG from code.
// svg("rect", { x: 0, y: 0, width: 10, height: 10, class: "wall" }) makes <rect x="0" …/>.

const SVG_NS = "http://www.w3.org/2000/svg";

type Attributes = Record<string, string | number>;

export function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attributes: Attributes = {},
  children: (SVGElement | string)[] = [],
): SVGElementTagNameMap[K] {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, String(value));
  }
  element.append(...children);
  return element;
}

const LABEL_PX = 14; // on-screen label size, whatever the drawing's scale

/**
 * Keeps labels the same on-screen size however big or small the drawing is shown.
 * Sets --label-size on the <svg>, which the .scene-label style uses.
 */
export function keepLabelsReadable(element: SVGSVGElement): void {
  // Start with the size worked out last time this framing was shown (most steps reuse one),
  // so the browser lays the drawing out once instead of twice.
  const framing = element.getAttribute("viewBox") ?? "";
  const remembered = lastLabelSize.get(framing);
  if (remembered) element.style.setProperty("--label-size", remembered);

  const observer = new ResizeObserver(([entry]) => {
    if (!element.isConnected) return observer.disconnect();
    const view = element.viewBox.baseVal;
    const { width, height } = entry.contentRect;
    const scale = Math.min(width / view.width, height / view.height);
    if (scale <= 0) return;
    const size = `${(LABEL_PX / scale).toFixed(2)}px`;
    lastLabelSize.set(framing, size);
    // Only touch the style if it changed: every change makes the browser lay the drawing out again.
    if (element.style.getPropertyValue("--label-size") !== size) element.style.setProperty("--label-size", size);
  });
  observer.observe(element);
}

/** The label size last used for each drawing framing (viewBox). */
const lastLabelSize = new Map<string, string>();

/** Short labels stay on one line. */
const ONE_LINE_MAX = 16;

/** Splits a long label into two lines of similar length, e.g. "Emergency dispatch" → ["Emergency", "dispatch"]. */
export function splitLabel(label: string): string[] {
  const words = label.split(" ");
  if (words.length < 2 || label.length <= ONE_LINE_MAX) return [label];
  let best = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const diff = Math.abs(words.slice(0, i).join(" ").length - words.slice(i).join(" ").length);
    if (diff < bestDiff) [best, bestDiff] = [i, diff];
  }
  return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
}

/** A label centred under (x, y). Long labels go on two lines unless `oneLine` is set. */
export function label(text: string, x: number, y: number, oneLine = false): SVGTextElement {
  const element = svg("text", { class: "scene-label", y });
  const lines = oneLine ? [text] : splitLabel(text);
  lines.forEach((line, i) => {
    element.append(svg("tspan", { x, dy: i === 0 ? 0 : "1.2em" }, [line]));
  });
  return element;
}

/**
 * Makes an SVG shape work like a button: it can be focused with Tab and pressed
 * with a click, a tap, Enter or Space. Screen readers announce it by `name`.
 */
export function makeButton(element: SVGElement, name: string, onPress: () => void): void {
  element.setAttribute("role", "button");
  element.setAttribute("tabindex", "0");
  element.setAttribute("aria-label", name);
  element.removeAttribute("aria-hidden");
  element.classList.add("is-target");
  element.addEventListener("click", onPress);
  element.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onPress();
    }
  });
}

/** A dashed ring marking the thing to tap. Centred on (0, cy). */
export function targetRing(width: number, height: number, cy: number): SVGRectElement {
  return svg("rect", {
    x: -width / 2,
    y: cy - height / 2,
    width,
    height,
    rx: 12,
    class: "target-ring",
  });
}

/**
 * Pins an HTML box (speech bubble, card, chip) to a point in a drawing, and keeps it
 * there when the screen changes size. The box is always kept inside the scene.
 * ax / ay say which part of the box sits on the point: (0.5, 1) = centred above it,
 * (0.5, 0) = centred below it.
 */
export function pin(
  box: HTMLElement,
  drawing: SVGSVGElement,
  point: { x: number; y: number },
  ax = 0.5,
  ay = 1,
): void {
  const EDGE = 8; // keep this far from the scene's edges (px)
  const GAP = 10; // gap between the point and the box (px)
  box.classList.add("is-pinned");

  const update = () => {
    const scene = box.parentElement;
    const matrix = drawing.getScreenCTM();
    if (!scene || !matrix) return;
    const area = scene.getBoundingClientRect();
    const p = new DOMPoint(point.x, point.y).matrixTransform(matrix);
    const { offsetWidth: w, offsetHeight: h } = box;
    const shift = ay === 1 ? -GAP : ay === 0 ? GAP : 0;
    const left = p.x - area.left - w * ax;
    const top = p.y - area.top - h * ay + shift;
    box.style.left = `${Math.max(Math.min(left, area.width - w - EDGE), EDGE)}px`;
    box.style.top = `${Math.max(Math.min(top, area.height - h - EDGE), EDGE)}px`;
  };

  const observer = new ResizeObserver(() => {
    if (!drawing.isConnected) return observer.disconnect();
    update();
  });
  observer.observe(drawing);
  observer.observe(box);
}

type Point = { x: number; y: number };

export interface Draggable {
  /** True (once) if the last press was a drag, so the click that follows it can be ignored. */
  justDragged(): boolean;
}

/**
 * Lets the visitor drag a drawing with a mouse, finger or pen.
 * Dropped where `accepts` says yes → `onDrop` is called. Dropped anywhere else → it goes back home.
 * A press that barely moves is left alone, so it still counts as a normal tap.
 */
export function makeDraggable(
  item: SVGGElement,
  drawing: SVGSVGElement,
  home: Point,
  options: { accepts: (point: Point) => boolean; onDrop: () => void },
): Draggable {
  const MOVE_THRESHOLD = 6; // drawing units before a press becomes a drag
  let position = { ...home };
  let grab: { pointer: Point; item: Point } | null = null;
  let dragging = false;
  let wasDrag = false;

  const moveTo = (p: Point) => {
    position = p;
    item.setAttribute("transform", `translate(${p.x} ${p.y})`);
  };

  /** Converts a pointer position on screen into drawing units. */
  const toDrawing = (event: PointerEvent): Point | null => {
    const matrix = drawing.getScreenCTM();
    if (!matrix) return null;
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: p.x, y: p.y };
  };

  item.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    const p = toDrawing(event);
    if (!p) return;
    grab = { pointer: p, item: { ...position } };
    item.setPointerCapture(event.pointerId);
  });

  item.addEventListener("pointermove", (event) => {
    if (!grab) return;
    const p = toDrawing(event);
    if (!p) return;
    const dx = p.x - grab.pointer.x;
    const dy = p.y - grab.pointer.y;
    if (!dragging && Math.hypot(dx, dy) < MOVE_THRESHOLD) return;
    dragging = true;
    item.classList.add("is-dragging");
    moveTo({ x: grab.item.x + dx, y: grab.item.y + dy });
  });

  const release = (dropped: boolean) => {
    grab = null;
    if (!dragging) return;
    dragging = false;
    wasDrag = true;
    item.classList.remove("is-dragging");
    if (dropped && options.accepts(position)) options.onDrop();
    else moveTo(home);
  };
  item.addEventListener("pointerup", () => release(true));
  item.addEventListener("pointercancel", () => release(false));

  return {
    justDragged() {
      const result = wasDrag;
      wasDrag = false;
      return result;
    },
  };
}
