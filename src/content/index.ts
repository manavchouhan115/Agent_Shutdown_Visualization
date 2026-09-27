// The one place the app loads visitor-facing text from.
// To add a language later, load a different JSON file here.
import en from "./en.json";
import type { Content } from "./types";

export const content = en as Content;

/** Fills blanks in a text, e.g. fill("Step {current} of {total}", { current: 2, total: 10 }). */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
