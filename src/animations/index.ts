// Named animations (the "animation" field of each step in the content file).
//
// Each animation can have up to three parts:
//   enter  — plays when the step first appears,
//   leave  — plays after the visitor acts, before the result is drawn (the app waits for it),
//   arrive — plays when the result appears. If it returns a promise, the Continue button
//            waits until it finishes (so slow, "watch this" steps can be read).
//
// Everything uses the browser's own Web Animations API (element.animate), which runs smoothly
// on phones. With reduced motion switched on, movement becomes a short fade (see play()).

export interface StepAnimation {
  enter?(scene: HTMLElement): void;
  leave?(scene: HTMLElement): Promise<void>;
  arrive?(scene: HTMLElement): Promise<void> | void;
}

// ---------- Helpers ----------

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Plays keyframes on an element and resolves when done.
 * Reduced motion: only the fade part (opacity) is kept, and kept short; pure movement is skipped.
 */
function play(element: Element | null, keyframes: Keyframe[], options: KeyframeAnimationOptions): Promise<void> {
  if (!element) return Promise.resolve();
  let frames = keyframes;
  let timing: KeyframeAnimationOptions = { fill: "backwards", ...options };

  if (reducedMotion()) {
    if (!keyframes.some((frame) => "opacity" in frame)) return Promise.resolve();
    frames = keyframes.map((frame) => ({ opacity: frame.opacity ?? 1 }));
    timing = { ...timing, duration: Math.min(Number(options.duration ?? 250), 250), easing: "linear" };
  }
  return element.animate(frames, timing).finished.then(
    () => undefined,
    () => undefined, // cancelled (e.g. the visitor moved on): that's fine
  );
}

/** The centre of an element on screen. */
function centre(element: Element): { x: number; y: number } {
  const r = element.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/** How many screen pixels one drawing unit takes up in this scene's drawing. */
function drawingScale(scene: HTMLElement): number {
  return scene.querySelector("svg")?.getScreenCTM()?.a ?? 1;
}

/** Waits a while (ms). Pauses between stages are kept short when nothing is moving (reduced motion). */
const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, reducedMotion() ? Math.min(ms, 150) : ms));

/** Draws an arrow along its line, then shows its head. */
function drawArrow(arrow: Element | null, delay = 0, duration = 600): Promise<void> {
  const line = arrow?.querySelector<SVGPathElement>(".fig-arrow-line");
  const head = arrow?.querySelector(".fig-arrow-head");
  if (!line) return Promise.resolve();
  const length = line.getTotalLength();
  line.style.strokeDasharray = String(length);
  hideUntilRevealed(head ? [head] : []); // the head appears when the line reaches it
  // In reduced motion the line simply fades in with the head.
  const drawing = reducedMotion()
    ? play(line, [{ opacity: 0 }, { opacity: 1 }], { duration: 250, delay })
    : play(line, [{ strokeDashoffset: length }, { strokeDashoffset: 0 }], { duration, delay, easing: "ease-in-out" });
  return drawing.then(() => reveal(head ?? null, 0, 150));
}

/** Hides something until an animation reveals it (only while motion is allowed). */
function hideUntilRevealed(elements: Iterable<Element>) {
  for (const element of elements) (element as HTMLElement | SVGElement).style.opacity = "0";
}

/** Brings back something hidden by hideUntilRevealed, with a fade. */
function reveal(element: Element | null, delay = 0, duration = 300): Promise<void> {
  if (!element) return Promise.resolve();
  const style = (element as HTMLElement | SVGElement).style;
  return play(element, [{ opacity: 0 }, { opacity: 1 }], { duration, delay }).then(() => {
    style.opacity = "";
  });
}

/** Fades something out and keeps it hidden. */
function fadeAway(element: Element | null, duration = 250): Promise<void> {
  if (!element) return Promise.resolve();
  return play(element, [{ opacity: 1 }, { opacity: 0 }], { duration, fill: "forwards" }).then(() => {
    (element as HTMLElement | SVGElement).style.visibility = "hidden";
  });
}

/** A few gentle pulses (opacity), e.g. the AI model "thinking". */
const pulse = (element: Element | null, times = 2, delay = 0) =>
  play(element, [{ opacity: 1 }, { opacity: 0.25 }, { opacity: 1 }], { duration: 450, delay, iterations: times });

/**
 * Lights up the loop words (Think, Act, Check, Repeat) one after another.
 * Each word stays lit for `interval(i)` ms, so the loop can speed up. Stops if the scene is gone.
 */
async function cycleLoopWords(scene: HTMLElement, turns: number, interval: (i: number) => number): Promise<void> {
  const words = [...scene.querySelectorAll(".fig-loop-word")];
  if (!words.length || reducedMotion()) return;
  const total = turns * words.length;
  for (let i = 0; i < total; i++) {
    if (!scene.isConnected) return;
    words.forEach((word, w) => word.classList.toggle("is-active", w === i % words.length));
    await wait(interval(i));
  }
  words.forEach((word) => word.classList.remove("is-active"));
}

/** Counts a number up from 0 to what it already shows. Reduced motion: it just shows the number. */
function countUp(number: Element | null, duration: number, easing: (t: number) => number): Promise<void> {
  if (!number || reducedMotion()) return Promise.resolve();
  const target = Number(number.textContent?.replace(/[^0-9]/g, "") ?? 0);
  const start = performance.now();
  return new Promise((resolve) => {
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      number.textContent = Math.round(target * easing(t)).toLocaleString("en");
      if (t < 1 && number.isConnected) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
}

const EASE_OUT = "cubic-bezier(0.2, 0.7, 0.3, 1)";
const EASE_IN_OUT = "cubic-bezier(0.6, 0, 0.3, 1)";

/** Fades something in while it rises a little into place. */
const riseIn = (element: Element | null, delay = 0, distance = 10) =>
  play(
    element,
    [
      { opacity: 0, transform: `translateY(${distance}px)` },
      { opacity: 1, transform: "none" },
    ],
    { duration: 400, delay, easing: EASE_OUT },
  );

// ---------- Step 0: landing ----------

const landingRain: StepAnimation = {
  // The rain itself is a looping CSS animation (motion.css); here the title card fades in.
  enter(scene) {
    riseIn(scene.querySelector(".landing"), 200, 12);
  },
};

// ---------- Step 1: the setting ----------

const buildingsAppear: StepAnimation = {
  // The five buildings fade in one by one, 0.3 seconds apart (spec, Step 1).
  enter(scene) {
    scene.querySelectorAll(".map-building").forEach((building, i) => {
      play(building, [{ opacity: 0 }, { opacity: 1 }], { duration: 450, delay: 200 + i * 300, easing: "ease-out" });
    });
  },
};

// ---------- Step 2: the request ----------

const cardToAgent: StepAnimation = {
  // Zoom into the operations centre; the agent appears; the task card slides in.
  enter(scene) {
    play(
      scene.querySelector("svg"),
      [
        { opacity: 0, transform: "scale(1.08)" },
        { opacity: 1, transform: "none" },
      ],
      { duration: 500, easing: EASE_OUT },
    );
    riseIn(scene.querySelector('[data-part="agent"]'), 450);
    riseIn(scene.querySelector('[data-part="task-card"]'), 800, -12);
  },
  // The task card flies to the agent.
  leave(scene) {
    const card = scene.querySelector<HTMLElement>('[data-part="task-card"]');
    const agent = scene.querySelector('[data-part="agent"]');
    if (!card || !agent) return Promise.resolve();
    const from = centre(card);
    const to = centre(agent);
    return play(
      card,
      [
        { transform: "none", opacity: 1 },
        { transform: `translate(${to.x - from.x}px, ${to.y - from.y}px) scale(0.12)`, opacity: 0.4 },
      ],
      { duration: 650, easing: EASE_IN_OUT, fill: "forwards" },
    );
  },
  // The agent now holds the task: it pops into its hand.
  arrive(scene) {
    play(
      scene.querySelector('[data-part="task-doc"]'),
      [
        { opacity: 0, transform: "scale(0.2)" },
        { opacity: 1, transform: "scale(1.2)", offset: 0.7 },
        { opacity: 1, transform: "none" },
      ],
      { duration: 350, easing: "ease-out" },
    );
  },
};

// ---------- Step 3: the keys ----------

const keysAttach: StepAnimation = {
  // The keyring drops in from above; then the dashed line shows where it goes.
  enter(scene) {
    riseIn(scene.querySelector('[data-part="keyring"]'), 250, -24);
    play(scene.querySelector(".drag-path"), [{ opacity: 0 }, { opacity: 1 }], { duration: 400, delay: 700 });
  },
  // The keyring moves to the agent's belt (a short trip if it was dragged there).
  leave(scene) {
    const mount = scene.querySelector('[data-part="keyring"]');
    const belt = scene.querySelector(".fig-agent .fig-belt");
    if (!mount || !belt) return Promise.resolve();
    // The keyring shrinks around its own centre, so aim its centre at the spot
    // where the keys will hang: just past the end of the belt, a little below it.
    const from = centre(mount);
    const to = centre(belt);
    const scale = drawingScale(scene);
    // SVG shapes move in drawing units, so convert the screen distance.
    const dx = (to.x - from.x) / scale + 26;
    const dy = (to.y - from.y) / scale + 14;
    return play(
      mount,
      [
        { transform: "none", opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.5)`, opacity: 0.6 },
      ],
      { duration: 450, easing: EASE_IN_OUT, fill: "forwards" },
    );
  },
  // The keys clip onto the belt with a small swing ("click").
  arrive(scene) {
    play(
      scene.querySelector(".fig-agent .fig-keys-mount"),
      [
        { opacity: 0, transform: "scale(1.4) rotate(-14deg)" },
        { opacity: 1, transform: "scale(1) rotate(10deg)", offset: 0.55 },
        { opacity: 1, transform: "rotate(-5deg)", offset: 0.8 },
        { opacity: 1, transform: "none" },
      ],
      { duration: 600, easing: "ease-out" },
    );
  },
};

// ---------- Step 4: thinking ----------

const modelReturnsPlan: StepAnimation = {
  // The AI model floats in, off to the side.
  enter(scene) {
    riseIn(scene.querySelector('[data-part="model"]'), 300, -14);
  },
  // Task goes to the model (arrow), the model thinks, the plan comes back line by line.
  async arrive(scene) {
    const plan = scene.querySelector<HTMLElement>('[data-part="plan"]');
    const items = plan ? [...plan.querySelectorAll("li")] : [];
    if (!reducedMotion()) hideUntilRevealed([plan, ...items].filter((e): e is HTMLElement => !!e));
    await drawArrow(scene.querySelector(".fig-arrow"), 150, 550);
    await Promise.all([...scene.querySelectorAll(".fig-model-node")].map((node, i) => pulse(node, 2, i * 90)));
    await reveal(plan, 0, 250);
    for (const item of items) await reveal(item, 0, 260);
  },
};

// ---------- Step 5: the first action (plays by itself, slowly) ----------

const firstActionGranted: StepAnimation = {
  async arrive(scene) {
    const rings = scene.querySelector(".fig-in-use");
    const badge = scene.querySelector('[data-part="badge"]');
    const records = [...scene.querySelectorAll(".fig-records .fig-record")];
    if (!reducedMotion()) hideUntilRevealed([rings, badge, ...records].filter((e): e is Element => !!e));

    // The agent presents the key at the gate…
    await drawArrow(scene.querySelector(".fig-arrow"), 400, 800);
    await reveal(rings, 0, 200);
    await pulse(rings, 2);
    // …the gate lets it in…
    await play(
      badge,
      [
        { opacity: 0, transform: "scale(0.6)" },
        { opacity: 1, transform: "scale(1.1)", offset: 0.7 },
        { opacity: 1, transform: "none" },
      ],
      { duration: 400, easing: "ease-out" },
    );
    if (badge) (badge as SVGElement).style.opacity = "";
    // …and the records flow back to the agent, one by one.
    await wait(400);
    for (const record of records) await reveal(record, 0, 300);
    await wait(600);
  },
};

// ---------- Step 6: the loop ----------

const loopAccelerate: StepAnimation = {
  // The loop turns twice, slowly: Think → Act → Check → Repeat.
  enter(scene) {
    riseIn(scene.querySelector('[data-part="comparison"]'), 400);
    cycleLoopWords(scene, 2, () => 650);
  },
  // "Let it run": the loop speeds up sharply, actions fly out, the counter races up.
  async arrive(scene) {
    const arrows = [...scene.querySelectorAll(".fig-arrow")];
    const duration = 2200;
    const flashing = arrows.map((arrow, i) =>
      play(arrow, [{ opacity: 0.15 }, { opacity: 1 }], {
        duration: 180,
        delay: 300 + i * 60,
        iterations: 10,
        direction: "alternate",
        easing: "ease-in",
      }),
    );
    await Promise.all([
      ...flashing,
      // Each word stays lit for less time than the one before: from 300 ms down to 40 ms.
      cycleLoopWords(scene, 8, (i) => Math.max(40, 300 * Math.pow(0.8, i))),
      // Slow at first, then very fast.
      countUp(scene.querySelector('[data-part="counter"] strong'), duration, (t) => t * t * t),
    ]);
  },
};

// ---------- Step 7: helpers ----------

const helpersSpawn: StepAnimation = {
  enter(scene) {
    riseIn(scene.querySelector('[data-part="agent-says"]'), 300);
  },
  leave(scene) {
    return fadeAway(scene.querySelector('[data-part="agent-says"]'), 200);
  },
  // Three helpers split off from the agent and travel to their services.
  // As each arrives, the agent's keys flash and a copy appears on the helper.
  async arrive(scene) {
    const agentFigure = scene.querySelector(".fig-agent:not(.fig-helper)");
    const agentKeys = agentFigure?.querySelector(".fig-keys-mount") ?? null;
    const helpers = [...scene.querySelectorAll('[data-part="helper"]')];
    if (!agentFigure) return;
    const home = centre(agentFigure);
    const scale = drawingScale(scene);

    const trips = helpers.map(async (mount, i) => {
      const keys = mount.querySelector(".fig-keys-mount");
      if (!reducedMotion()) hideUntilRevealed(keys ? [keys] : []);
      const spot = centre(mount);
      // Start on top of the agent (converted to drawing units), small; end at the helper's own spot.
      const dx = (home.x - spot.x) / scale;
      const dy = (home.y - spot.y) / scale;
      await play(
        mount,
        [
          { opacity: 0, transform: `translate(${dx}px, ${dy}px) scale(0.4)` },
          { opacity: 1, transform: `translate(${dx * 0.8}px, ${dy * 0.8}px) scale(0.7)`, offset: 0.2 },
          { opacity: 1, transform: "none" },
        ],
        { duration: 800, delay: 200 + i * 300, easing: EASE_IN_OUT },
      );
      // The copy: the agent's keys flash as the helper's copy appears.
      pulse(agentKeys, 1);
      await reveal(keys, 0, 150);
      await play(keys, [{ transform: "scale(1.6)" }, { transform: "none" }], { duration: 350, easing: "ease-out" });
    });
    await Promise.all(trips);
  },
};

// ---------- Step 8: reading the web (plays by itself) ----------

const webPageOpens: StepAnimation = {
  // "Searching the web…" appears, then the page it found opens.
  async arrive(scene) {
    const searching = scene.querySelector('[data-part="searching"]');
    const page = scene.querySelector('[data-part="webpage"]');
    if (!reducedMotion()) hideUntilRevealed(page ? [page] : []);
    await riseIn(searching, 300);
    await wait(1100);
    await Promise.all([
      fadeAway(searching, 200),
      play(
        page,
        [
          { opacity: 0, transform: "translateY(16px) scale(0.96)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: 450, easing: EASE_OUT },
      ).then(() => {
        if (page) (page as HTMLElement).style.opacity = "";
      }),
    ]);
    await wait(900);
  },
};

// ---------- Step 9: the cliffhanger (plays by itself) ----------

const injectionCompromise: StepAnimation = {
  async arrive(scene) {
    const page = scene.querySelector<HTMLElement>('[data-part="webpage"]');
    const hiddenLine = page?.querySelector(".webpage__hidden") ?? null;
    const agentFigure = scene.querySelector(".fig-agent:not(.fig-helper)");
    const helperFigures = [...scene.querySelectorAll(".fig-helper")];
    const rings = scene.querySelector(".fig-in-use");
    const badge = scene.querySelector('[data-part="badge"]');
    const records = [...scene.querySelectorAll(".fig-records .fig-record")];
    const counterBox = scene.querySelector('[data-part="counter"]');
    const gateArrow = scene.querySelector('[data-part="gate-arrow"] .fig-arrow');
    const exfilArrow = scene.querySelector('[data-part="exfil-arrow"] .fig-arrow');

    // Rewind to how things looked on the previous step: everything teal, the page normal.
    const compromised = [agentFigure, ...helperFigures].filter((e): e is Element => !!e);
    compromised.forEach((figure) => figure.classList.remove("is-compromised"));
    page?.classList.remove("is-compact");
    hiddenLine?.classList.remove("is-revealed");
    // Arrows stay hidden until each one is drawn (see showAndDraw below).
    for (const arrowLine of scene.querySelectorAll('[data-part$="-arrow"] .fig-arrow-line')) {
      (arrowLine as SVGElement).style.opacity = "0";
    }
    const showAndDraw = (arrow: Element | null, delay: number, duration: number) => {
      const line = arrow?.querySelector<SVGElement>(".fig-arrow-line");
      if (line) line.style.opacity = "";
      return drawArrow(arrow, delay, duration);
    };
    const arrowHeads = [...scene.querySelectorAll('[data-part$="-arrow"] .fig-arrow-head')];
    hideUntilRevealed([rings, badge, counterBox, ...records, ...arrowHeads].filter((e): e is Element => !!e));

    // 1. The page flickers, and the hidden line shows itself.
    await wait(600);
    await play(page, [{ opacity: 1 }, { opacity: 0.3 }, { opacity: 1 }, { opacity: 0.5 }, { opacity: 1 }], {
      duration: 500,
    });
    hiddenLine?.classList.add("is-revealed");
    await wait(1400);
    page?.classList.add("is-compact");

    // 2. The agent pauses for one beat, then turns red.
    await wait(700);
    agentFigure?.classList.add("is-compromised");
    await wait(700);

    // 3. The helpers turn red one by one.
    for (const figure of helperFigures) {
      figure.classList.add("is-compromised");
      await wait(400);
    }

    // 4. At the registry gate, the key is checked again: "Access granted".
    await showAndDraw(gateArrow, 200, 700);
    await reveal(rings, 0, 200);
    await pulse(rings, 2);
    await play(
      badge,
      [
        { opacity: 0, transform: "scale(0.6)" },
        { opacity: 1, transform: "scale(1.1)", offset: 0.7 },
        { opacity: 1, transform: "none" },
      ],
      { duration: 400, easing: "ease-out" },
    );
    if (badge) (badge as SVGElement).style.opacity = "";

    // 5. Records stream off the edge of the map, and the counter starts climbing.
    await wait(300);
    await reveal(counterBox, 0, 250);
    await Promise.all([
      showAndDraw(exfilArrow, 0, 900),
      (async () => {
        for (const record of records) await reveal(record, 0, 220);
      })(),
      countUp(counterBox?.querySelector("strong") ?? null, 2800, (t) => t * t),
    ]);
  },
};

// ---------- Names (from the content file) → animations ----------

const ANIMATIONS: Record<string, StepAnimation> = {
  "landing-rain": landingRain,
  "setting-buildings-appear": buildingsAppear,
  "request-card-to-agent": cardToAgent,
  "keys-attach": keysAttach,
  "model-returns-plan": modelReturnsPlan,
  "first-action-granted": firstActionGranted,
  "loop-accelerate": loopAccelerate,
  "helpers-spawn": helpersSpawn,
  "web-page-opens": webPageOpens,
  "injection-compromise": injectionCompromise,
};

/** The animation for a name; an empty one if it isn't built yet. */
export function animationFor(name: string): StepAnimation {
  return ANIMATIONS[name] ?? {};
}
