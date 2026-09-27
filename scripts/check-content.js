// Checks the content file against the copy rules in CLAUDE.md.
// Run with: npm run check:content  (it also runs before every build)
import { readFileSync } from "node:fs";

const FILE = "src/content/en.json";
const MAX_CAPTION_WORDS = 20;
const MAX_SUBLINE_WORDS = 15;
const ACTION_TYPES = ["tap-target", "button", "drag", "auto"];

const content = JSON.parse(readFileSync(FILE, "utf8"));
const problems = [];

// Counts words, ignoring stand-alone symbols such as "—" or "→".
const countWords = (text) =>
  text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

const isText = (value) => typeof value === "string" && value.trim() !== "";

// 1. Each step has the right fields and follows the copy rules.
content.steps.forEach((step, index) => {
  const where = step.id ?? `steps[${index}]`;

  if (step.id !== `step-${index}`) problems.push(`${where}: id should be "step-${index}"`);
  for (const field of ["scene", "animation"]) {
    if (!isText(step[field])) problems.push(`${where}: missing "${field}"`);
  }

  // Step 0 is the landing screen; every other step needs a caption.
  if (index > 0 && !isText(step.caption)) problems.push(`${where}: missing caption`);
  if (index === 0 && !step.landing) problems.push(`${where}: missing "landing" text`);

  if (step.caption && countWords(step.caption) > MAX_CAPTION_WORDS) {
    problems.push(`${where}: caption has ${countWords(step.caption)} words (max ${MAX_CAPTION_WORDS})`);
  }
  if (step.subline && countWords(step.subline) > MAX_SUBLINE_WORDS) {
    problems.push(`${where}: sub-line has ${countWords(step.subline)} words (max ${MAX_SUBLINE_WORDS})`);
  }

  const action = step.action ?? {};
  if (!ACTION_TYPES.includes(action.type)) {
    problems.push(`${where}: action.type must be one of ${ACTION_TYPES.join(", ")}`);
  }
  if ((action.type === "button" || action.type === "auto") && !isText(action.label)) {
    problems.push(`${where}: "${action.type}" action needs a label`);
  }
  if ((action.type === "tap-target" || action.type === "drag") && !isText(action.target)) {
    problems.push(`${where}: "${action.type}" action needs a target`);
  }
  // Steps the player must act on need an idle hint (spec §3, 6-second rule).
  if (action.type !== "auto" && index > 0 && !isText(step.hint)) {
    problems.push(`${where}: missing hint`);
  }

  if (!isText(step.technical?.note)) problems.push(`${where}: missing technical.note`);
});

// 2. No exclamation marks in any visitor text (technical code samples are exempt).
const findExclamations = (value, path) => {
  if (typeof value === "string") {
    if (value.includes("!") && !path.endsWith("technical.code")) {
      problems.push(`${path}: contains an exclamation mark`);
    }
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) findExclamations(child, `${path}.${key}`);
  }
};
findExclamations(content, "content");

if (problems.length > 0) {
  console.error(`Content check failed (${FILE}):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log(`Content check passed: ${content.steps.length} steps.`);
