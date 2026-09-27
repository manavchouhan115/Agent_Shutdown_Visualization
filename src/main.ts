// Entry point: builds the page and connects it to the step engine.
// All visitor-facing text comes from the content file, never from code.
import "./styles/tokens.css";
import "./styles/layout.css";
import "./styles/scenes.css";
import "./styles/motion.css";
import { content } from "./content";
import { createStepEngine, type EngineState } from "./engine/stepEngine";
import { createTopBar } from "./ui/topBar";
import { createCaptionBar } from "./ui/captionBar";
import { createAnnouncer } from "./ui/announcer";
import { createTechPanel } from "./ui/techPanel";
import { createLanding } from "./ui/landing";
import { createIncidentPlaceholder } from "./ui/incidentPlaceholder";
import { createIdleHint } from "./engine/idleHint";
import { animationFor } from "./animations";
import { createLandingBackdrop, createScene, sceneHasResult, type Phase, type Scene } from "./scenes/scenes";

document.documentElement.lang = content.meta.lang;
document.title = content.meta.title;

const app = document.querySelector<HTMLElement>("#app");
if (!app) throw new Error("Missing #app element in index.html");

const { steps } = content;

// Developer shortcuts: ?step=5 starts on step 5; &phase=end shows each step's result.
const params = new URLSearchParams(location.search);
const startIndex = Number(params.get("step") ?? 0);
const forcedPhase: Phase | null = params.get("phase") === "end" ? "end" : null;
const engine = createStepEngine(steps.length, startIndex);

// ---------- Build the page once ----------

const topBar = createTopBar(steps.length);
const captionBar = createCaptionBar();
const announcer = createAnnouncer();
const techPanel = createTechPanel();

const stage = document.createElement("main");
stage.className = "stage";
const scene = document.createElement("div");
scene.className = "scene";
stage.append(scene, captionBar.element);

// The workspace holds the stage and, beside it (or below it on phones), the technical panel.
const workspace = document.createElement("div");
workspace.className = "workspace";
workspace.append(stage, techPanel.element);

app.append(topBar.element, workspace, announcer.element);

// ---------- Where the visitor is ----------
// The engine knows which step. Within a step, "phase" says whether the visitor has
// acted yet: "start" = waiting for them, "end" = showing the result of what they did.

let phase: Phase = "start";
let currentScene: Scene | null = null;
/** True while the "after you act" animation plays, so a double tap can't act twice. */
let busy = false;
/** Goes up on every redraw, so a finished animation can tell if the visitor moved on meanwhile. */
let renderCount = 0;

/** The phase a step opens in. Steps that play by themselves open on their result. */
function openingPhase(state: EngineState): Phase {
  if (state.kind !== "step") return "start";
  return forcedPhase ?? (steps[state.index].action.type === "auto" ? "end" : "start");
}

/** The visitor did what the step asked (tapped, dragged, pressed the button). */
async function completeAction() {
  const state = engine.state;
  if (state.kind !== "step" || phase !== "start" || busy || !currentScene) return;
  const step = steps[state.index];
  if (!sceneHasResult(step)) return engine.next();

  // Play the "after you act" animation, then draw the result.
  busy = true;
  idleHint.stop();
  const drawnAt = renderCount;
  await animationFor(step.animation).leave?.(currentScene.element);
  busy = false;
  if (renderCount !== drawnAt) return; // the visitor went Back or skipped meanwhile

  phase = "end";
  render({ announceCaption: false, arriving: true });
}

topBar.onSkip(() => engine.skip());
captionBar.onBack(() => engine.back());
captionBar.onPrimary(() => {
  const state = engine.state;
  const isAction = state.kind === "step" && phase === "start" && steps[state.index].action.type === "button";
  if (isAction) completeAction();
  else engine.next();
});

// "Show technical details": off at first; once on, it stays on from step to step.
let technicalOn = false;
function setTechnical(on: boolean) {
  technicalOn = on;
  topBar.setTechnical(on);
  techPanel.setOn(on && engine.state.kind === "step");
}
topBar.onToggleTechnical(setTechnical);
techPanel.onClose(() => {
  setTechnical(false);
  topBar.focusTechnical();
});

// After 6 seconds with no input, the thing to do glows and a hint appears.
const idleHint = createIdleHint({
  onShow() {
    const state = engine.state;
    if (state.kind !== "step" || phase !== "start") return;
    const step = steps[state.index];
    if (!step.hint) return;
    captionBar.showHint(step.hint);
    announcer.announce(step.hint);
    const glowing = step.action.type === "button" ? captionBar.primary : currentScene?.target;
    glowing?.classList.add("is-hinting");
  },
});

// ---------- Redraw ----------

/** The control the visitor most likely wants next; focus moves here when needed. */
let mainControl: HTMLElement | SVGElement | null = null;
let firstRender = true;

function render({ announceCaption, arriving = false }: { announceCaption: boolean; arriving?: boolean }) {
  const state = engine.state;
  renderCount++;
  busy = false;
  idleHint.stop();
  currentScene = null;

  if (state.kind === "incident") {
    const view = createIncidentPlaceholder(() => engine.replay());
    topBar.setProgress(steps.length);
    topBar.setSkipVisible(false);
    captionBar.element.hidden = true;
    scene.replaceChildren(view.element);
    techPanel.setOn(false);
    announcer.announce(content.incident.heading);
    mainControl = view.replay;
  } else if (state.index === 0) {
    const view = createLanding(steps[0], {
      onStart: () => engine.next(),
      onSkip: () => engine.skip(),
    });
    topBar.setProgress(0);
    topBar.setSkipVisible(false); // the landing screen has its own skip button
    captionBar.element.hidden = true;
    const backdrop = createLandingBackdrop();
    backdrop.append(view.element);
    scene.replaceChildren(backdrop);
    animationFor(steps[0].animation).enter?.(backdrop);
    techPanel.show(steps[0]);
    techPanel.setOn(technicalOn);
    announcer.announce(steps[0].landing?.headline ?? "");
    mainControl = view.start;
  } else {
    const step = steps[state.index];
    currentScene = createScene(step, {
      phase,
      done: completeAction,
      announce: (message) => announcer.announce(message),
    });
    topBar.setProgress(state.index);
    topBar.setSkipVisible(true);
    captionBar.element.hidden = false;
    captionBar.show(step, phase);
    scene.replaceChildren(currentScene.element);
    techPanel.show(step);
    techPanel.setOn(technicalOn);
    if (announceCaption) announcer.announce([step.caption, step.subline].filter(Boolean).join(" "));
    mainControl = captionBar.primary.hidden ? currentScene.target : captionBar.primary;
    if (phase === "start" && step.action.type !== "auto") idleHint.start();

    const animation = animationFor(step.animation);
    if (phase === "start") {
      animation.enter?.(currentScene.element);
    } else if (arriving) {
      // Let the result play out; Continue appears when it has finished.
      const playing = animation.arrive?.(currentScene.element);
      if (playing) {
        captionBar.primary.hidden = true;
        const drawnAt = renderCount;
        const moveFocus = !firstRender;
        playing.then(() => {
          if (renderCount !== drawnAt) return; // the visitor moved on meanwhile
          captionBar.primary.hidden = false;
          const focused = document.activeElement;
          if (moveFocus && (!focused || focused === document.body)) captionBar.primary.focus();
        });
      }
    }
  }

  // Keyboard users: if the focused button just disappeared, move focus to the main control.
  // If it is still there (e.g. Back, or the same main button), leave it where it is.
  // Not on first load, so screen-reader users start at the top of the page.
  const focused = document.activeElement;
  const lostFocus = !focused || focused === document.body || !focused.checkVisibility();
  if (lostFocus && !firstRender) mainControl?.focus();
  firstRender = false;
}

// A new step always opens in its opening phase, with its caption read aloud.
// Steps that play by themselves open straight onto their result, playing it out.
engine.subscribe((state) => {
  phase = openingPhase(state);
  const playsByItself = state.kind === "step" && steps[state.index].action.type === "auto";
  render({ announceCaption: true, arriving: playsByItself });
});
