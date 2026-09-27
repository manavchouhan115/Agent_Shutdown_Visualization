// The idle hint (spec §3): if the visitor does nothing for 6 seconds, show a hint.
// "Doing something" means pressing a key, clicking, tapping or scrolling. Just moving
// the mouse around doesn't count, so the hint still appears for someone who is hovering.

export interface IdleHint {
  /** Start counting down (e.g. when a step that needs an action appears). */
  start(): void;
  /** Stop counting (e.g. when the visitor has acted or left the step). */
  stop(): void;
}

const INPUT_EVENTS = ["pointerdown", "keydown", "wheel", "touchstart"];

export function createIdleHint(options: {
  onShow: () => void;
  /** Where to listen for input; the whole window by default. */
  target?: EventTarget;
  delay?: number;
}): IdleHint {
  const { onShow, target = window, delay = 6000 } = options;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let counting = false;

  const restart = () => {
    if (!counting) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      counting = false; // show once, then wait for the next start()
      onShow();
    }, delay);
  };

  for (const type of INPUT_EVENTS) target.addEventListener(type, restart, { passive: true });

  return {
    start() {
      counting = true;
      restart();
    },
    stop() {
      counting = false;
      clearTimeout(timer);
    },
  };
}
