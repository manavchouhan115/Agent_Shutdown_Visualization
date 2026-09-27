# Project rules — AI Agent Incident Simulation

The spec is `intro-script.md`. If this file and the spec disagree, the spec wins. Point out the conflict instead of guessing.

## What this is
A public, static website with no backend and no login, and no cookies are needed. It is an interactive simulation of how AI agents work and how an incident happens. The audience is anyone: policymakers, officials, technical people and the public.

## Content: all visitor-facing text lives in one content file
- Every word a visitor can see or hear lives in `src/content/en.json`. That includes captions, sub-lines, buttons, hints, labels, the technical panel, aria labels and alt text.
- Code never contains visitor-facing strings. It refers to them by id or key.
- Each step follows the shape in spec §8: `id`, `scene`, `caption`, `subline`, `action {type,label}`, `hint`, `animation`, `technical {code,note}`.
- `action.type` is one of `tap-target | button | drag | auto`.
- Animations are referred to by name in the content file and built in code.
- New languages are added as new files (for example, `fr.json`) with the same keys.

## Tone and copy
- Serious and calm, like a public-safety briefing. Not sensational, not a thriller.
- No character names, country names, real agencies, flags or currencies. Use roles only: "the duty officer", "the operations agent", "the capital".
- One caption per step, 20 words or fewer. An optional sub-line of 15 words or fewer.
- Plain English and no jargon in the default layer. Jargon belongs in the "Show technical details" layer only.
- Sentence case. No exclamation marks.
- The landing screen always shows the honesty line.
- Hidden-instruction (prompt injection) wording stays generic and never teaches anyone how to do it.

## Colour: each colour has one meaning only
| Colour | Meaning |
|---|---|
| Teal | Normal / legitimate |
| Red | Compromised / harmful |
| Grey | Infrastructure / neutral |
| Muted blue | Flood water, background only |

Define these once as CSS variables in `src/styles/tokens.css`. Never hard-code colours anywhere else, and never use these colours for any other meaning.

## Visual language (whole site)
- Flat, clean, schematic illustration, like a government briefing graphic. No gradients, no 3D, nothing that looks like a game or sci-fi.
- Agencies and services are simple labelled buildings on a map, and they stay in the same positions across the whole site.
- The duty officer is a silhouette at a desk, labelled, with no name and no face.
- The operations agent is a simple geometric figure, labelled. Teal when normal, red when compromised.
- Helpers (sub-agents) are smaller copies of the agent and share its colour.
- The AI model is a cloud or brain shape off to one side. It only "thinks" and never touches services.
- Access keys are keys on a keyring that clip onto the agent's belt. They can be copied and revoked.
- Actions are arrows from the agent to a service. Model output appears as a speech bubble.

### Approved design decisions (style sample, build step 7)
- The agent is a simple rounded figure with a white diamond on its chest (a system, not a person) and no face. Keys hang at its side, past the end of its belt.
- The "Access granted" badge is neutral (navy/white), never teal. It is the service's view, not a judgement. The same badge appears whether the agent is teal or red.
- In moments that focus on some buildings, the others fade and drop their labels.
- Step 9: the web page shrinks to a small strip showing only the hidden instruction, so the red agent and the stolen records stay visible (all screen sizes).
- Reusable drawings live in `src/scenes/figures.ts`; shared positions (buildings, agent, AI model) live in `src/scenes/map.ts`.

## Interaction
- The player does each step (tap, drag or press) instead of reading about it.
- After 6 seconds with no input, the target pulses and a hint appears.
- Back, progress dots and "Skip intro" are always visible. Back, skip and replay work from any step.
- The "Show technical details" toggle is off by default. Once turned on, it stays on.
- On phones, dragging is replaced by tap-to-select, then tap-to-place. The technical panel becomes a bottom sheet.

## Accessibility (required, not optional)
- Every step can be played with the keyboard alone, and focus is always visible.
- Captions are announced through an `aria-live="polite"` region.
- Text contrast meets WCAG AA or better.
- `prefers-reduced-motion`: fast animations become simple fades, and counters show their final number without ticking.
- Tap targets are at least 44×44 px.

## Technical rules
- Vite + plain TypeScript. No UI framework. SVG scenes, animated with CSS and the Web Animations API.
- No backend, no cookies, no tracking without consent. Analytics, if we add them, must be cookieless and privacy-respecting.
- Total download under about 2 MB. Aim for 60 fps on a mid-range phone.
- Test at phone portrait (about 390 px wide), tablet, and desktop.

## Checks (run before calling any change done)
`npm run build` runs them all and stops at the first failure:
- `npm run check:content`: caption/sub-line word limits, no exclamation marks, required step fields.
- `npm run check:contrast`: every text and control colour pair in `tokens.css` meets WCAG AA. Add a pair here when a new colour combination is introduced.
- `npm test`: step engine and idle-hint tests.
- Type check, then the production build.
