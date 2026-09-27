// Checks colour contrast (WCAG 2.2 AA) for every text and control colour pair the site uses.
// Colours are read from src/styles/tokens.css, so this catches problems when a colour changes.
// Run with: npm run check:contrast  (it also runs before every build)
import { readFileSync } from "node:fs";

const css = readFileSync("src/styles/tokens.css", "utf8");
const tokens = Object.fromEntries([...css.matchAll(/--(color-[\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));

// WCAG minimums: 4.5 for normal text, 3 for large/bold-large text and for controls and graphics.
const TEXT = 4.5;
const UI = 3;

// [what it is, foreground token, background token, minimum]
const PAIRS = [
  ["Body text on the page", "color-ink", "color-paper", TEXT],
  ["Text on bars, cards, panels", "color-ink", "color-surface", TEXT],
  ["Map and room labels", "color-ink", "color-land", TEXT],
  ["Secondary text (sub-lines, notes)", "color-ink-muted", "color-surface", TEXT],
  ["Secondary text on the page", "color-ink-muted", "color-paper", TEXT],
  ["Primary button text", "color-surface", "color-ink", TEXT],
  ["Active loop word (teal, bold 14px)", "color-teal", "color-land", TEXT],
  ["Hidden instruction, revealed (red)", "color-red", "color-surface", TEXT],
  ["Records counter number (red)", "color-red", "color-surface", TEXT],
  ["Code sample in technical panel", "color-ink", "color-paper", TEXT],
  ["Keyboard focus ring", "color-focus", "color-surface", UI],
  ["Keyboard focus ring on the map", "color-focus", "color-land", UI],
  ["Target ring (thing to tap)", "color-ink", "color-land", UI],
  ["Switch, off (track)", "color-control", "color-surface", UI],
  ["Progress dot, not reached yet", "color-control", "color-surface", UI],
  ["Progress dot, done", "color-ink-muted", "color-surface", UI],
  ["Agent (teal) on the map", "color-teal", "color-land", UI],
  ["Agent (red) on the map", "color-red", "color-land", UI],
  ["Building outlines", "color-grey", "color-land", UI],
];

/** Relative luminance of a #rrggbb colour (WCAG formula). */
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

let failures = 0;
for (const [what, fg, bg, min] of PAIRS) {
  if (!tokens[fg] || !tokens[bg]) {
    console.error(`  ✖ ${what}: missing token --${tokens[fg] ? bg : fg}`);
    failures++;
    continue;
  }
  const r = ratio(tokens[fg], tokens[bg]);
  const ok = r >= min;
  if (!ok) failures++;
  if (!ok || process.argv.includes("--verbose")) {
    console.log(`  ${ok ? "✔" : "✖"} ${what}: ${r.toFixed(2)}:1 (needs ${min}:1)`);
  }
}

if (failures) {
  console.error(`Contrast check failed: ${failures} pair(s) below WCAG AA.`);
  process.exit(1);
}
console.log(`Contrast check passed: ${PAIRS.length} colour pairs meet WCAG AA.`);
