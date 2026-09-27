// A hidden area that screen readers read aloud whenever its text changes (aria-live).
// It lives outside the caption bar, so announcements still work while that bar is hidden.

export interface Announcer {
  element: HTMLElement;
  announce(text: string): void;
}

export function createAnnouncer(): Announcer {
  const element = document.createElement("div");
  element.className = "visually-hidden";
  element.setAttribute("aria-live", "polite");
  element.setAttribute("aria-atomic", "true");

  let timer: number | undefined;

  return {
    element,
    announce(text) {
      // Empty it first, so the same text (e.g. on replay) is still read again.
      element.textContent = "";
      window.clearTimeout(timer);
      timer = window.setTimeout(() => (element.textContent = text), 50);
    },
  };
}
