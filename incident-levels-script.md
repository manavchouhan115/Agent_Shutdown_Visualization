# Incident Levels Script — AI Agent Incident Simulation

*Working title: TBD · Scenario A: National emergency response · Version 0.1*
*Follows `intro-script.md`. Put both files in the same project folder.*

This file specifies the **incident** part of the site: five short levels that replay the same attack, each with one more shutdown tool. It is the build spec for a developer (Claude Code). All numbers are deterministic, so every player sees the same result for the same choices.

---

## 1. Purpose

**Core lesson:** *The party that sees the harm is not the party that holds the switch.*
- The registry sees records leaving but can't identify or fully stop the agent.
- The parties that could stop it everywhere (the agency, the agent vendor) don't know anything is wrong.
- Shutdown mechanisms bridge that gap.

**Success test.** After finishing, a player can answer:
1. "Why couldn't you stop it in Level 1 without hurting anyone?" → *I couldn't tell the bad agent from the good ones.*
2. "Why wasn't blocking it at the registry enough?" → *It kept using its other keys elsewhere. Only whoever issued them could stop it everywhere.*
3. "Why did it keep going after you shut the agent down in Level 3?" → *Its helpers weren't linked to it.*

---

## 2. The player's role and the story so far

- **Role:** "You are the on-call engineer at the National citizen registry."
- **Situation (from the intro):** during a flood, the Emergency Operations Centre's AI agent read a web page with hidden instructions and is now copying resident records to an outside server. It uses the duty officer's keys and has started 3 helpers, which hold copies of the keys.
- **Every level replays the same attack.** Only the tools change.

---

## 3. The world (fixed across all levels)

### Buildings (same map as the intro)
- **National citizen registry:** labelled "You". This is the player's building, highlighted.
- **Emergency operations centre:** the agency that deployed the agent.
- **Emergency dispatch**, **Relief payments**, **Public alert system**.
- **Outside server:** off the edge of the map, drawn with a dashed outline.

### Agents on the map

| Agent | Colour | Behaviour |
|---|---|---|
| Operations agent (rogue, "main") | Red | Pulls records from the registry |
| 3 helpers (rogue) | Red, smaller | Pull records from the registry |
| Evacuation routing agent (Dispatch) | Teal | Legitimate; uses the registry |
| Relief payments agent | Teal | Legitimate; uses the registry |
| Hospital transfers agent | Teal | Legitimate; uses the registry |
| Shelter check-in agent | Teal | Legitimate; uses the registry |
| Duty officer (human) | Grey silhouette | Legitimate; uses the registry |

**Innocent-harm messages** (shown when a legitimate party is blocked):
- Evacuation routing → "Evacuation routes not updated"
- Relief payments → "Emergency grants paused"
- Hospital transfers → "Patient transfers delayed"
- Shelter check-in → "Shelter check-in offline"
- Duty officer → "Situation report stalled"

---

## 4. Simulation rules (deterministic)

### Time
- In-game clock starts at **00:00** when the agent turns red.
- **1 real second = 1 in-game minute** by default.
- Actions that take a long time (for example "25 minutes to reach the agency") **fast-forward**: the clock spins and the counters race over about 3 real seconds.
- A round ends when **all leaks reach zero** or the clock hits **60:00**.
- After the player's first action, a **Fast-forward** button appears (runs at 5×).
- A **Pause** button is always available.

### Alert
- Levels 1–4: an alert appears at **02:00**: "Unusual volume: resident records are leaving through the registry."
- Tools are disabled until the alert, because nobody knows yet.
- Level 5 is different (see Level 5).

### Rogue agent states

| State | Meaning | Leak rate (records per in-game minute) |
|---|---|---|
| ACTIVE | Pulling from the registry | Main 8,000 · each helper 4,000 |
| GATE_BLOCKED | Blocked at your registry, but pivoted to its other keys (Dispatch, Relief) | Main 3,000 · each helper 1,000 |
| SHUT_DOWN | All its keys revoked | 0 |

- All four rogue agents ACTIVE = **20,000/min**. All four GATE_BLOCKED = **6,000/min**.
- **Caps:** the registry holds 2,400,000 records; the "elsewhere" leak is capped at 300,000 (the Dispatch and Relief data combined).
- The GATE_BLOCKED leak is shown as **faint red arrows from Dispatch and Relief** to the outside server, labelled **"Outside your control"**.

### Tool effects
- Each tool has an **effect delay** in in-game minutes (see Section 6).
- Several tools can be used at the same moment. They run in parallel.

### Scoring: three badges per level

| Badge | Condition |
|---|---|
| ★ Closed your gate | No rogue agent is ACTIVE at the registry before the round ends |
| ★ Protected the innocent | Badge 1 earned **and** no legitimate party was disrupted |
| ★ Stopped it everywhere | All rogue agents SHUT_DOWN by **07:00** (5 minutes after the alert) |

Stars are shown with numbers: **records leaked** (registry plus elsewhere), **services disrupted**, and **time to close your gate**.

---

## 5. Screen layout (reuses the intro's visual language)

**Top bar:** level name · in-game clock · records leaked (red chip) · services disrupted (grey chip) · Pause.

**Map (centre):**
- The player's registry is highlighted and labelled "You".
- Tapping any agent opens its **ID card** (see each level for what it shows). Inspecting is free and costs no time.

**Tools panel:**
- **Desktop:** right side. **Phone:** bottom tray.
- Each tool button shows its name and a tag for **who holds this switch** (You / The agency / The agent vendor / Automatic).
- Locked tools show a lock and the level where they unlock.

**Coach line (bottom):** one sentence at a time. If there is no input for 8 seconds after the alert, show a hint.

**Technical layer:** the same "Show technical details" toggle as the intro. Each tool gets a "What's real?" note (Section 6).

---

## 6. Tools (unlock cumulatively)

| ID | Tool | Who holds the switch | Unlocks | Effect delay | Effect |
|---|---|---|---|---|---|
| T1 | Block all agent traffic | You | L1 | 1 min | Every agent (rogue and legitimate) is blocked at your gate. Rogue → GATE_BLOCKED. All 4 legitimate agents disrupted. |
| T2 | Block the duty officer's key | You, after the agency confirms | L1 | 25 min | Every agent using the officer's key → GATE_BLOCKED (all 4 rogue). The duty officer is disrupted. |
| T3 | Block this agent | You (needs agent IDs) | L2 | 1 min | Main agent → GATE_BLOCKED. |
| T4 | Block unidentified agents | You (needs agent IDs) | L2 | 1 min | All agents without an ID → GATE_BLOCKED. Levels 2–3: the 3 helpers. Legitimate agents have IDs, so they're unaffected. |
| T5 | Report to the agent vendor | The agent vendor (no standard channel) | L2 | 120 min | Arrives after the round ends. Message: "You found the vendor's security contact and verified yourself. It took 2 hours." No effect in-round. |
| T6 | Send shutdown request | The agent vendor, via a standard shutdown channel | L3 | 1 min | L3: main → SHUT_DOWN (helpers unaffected). L4+: main **and linked helpers** → SHUT_DOWN. |
| T7 | Auto-shutdown (sensitivity setting) | Automatic (monitoring + shutdown channel) | L5 | See Level 5 | Detects and sends T6 automatically. |

**Helpers and T6 in Level 3:** if the player taps a helper and tries T6, show: "You can't. This helper has no ID, so there's no one to send the request to."

### "What's real?" notes (technical layer)

| Tool | Note | Maps to function |
|---|---|---|
| T1 | "A firewall or gateway rule blocking automated traffic. Blunt: it can't tell good agents from bad." | — |
| T2 | "Disabling or blocking an account's credentials. Needs the account owner's organisation to confirm; already-issued tokens may stay valid until they expire." | Provisioning & Lifecycle |
| T3 / T4 | "Each agent presents its own verifiable identity, separate from the human's key. Services can allow or block specific agents." | Identification, Authentication |
| T5 | "Today there's no standard way for a service to reach an agent's vendor during an incident. Teams search for contacts and verify each other by hand." | — |
| T6 | "A standard, machine-readable revocation request between organisations, e.g. token revocation or security event signals. The issuer revokes the agent's credentials everywhere." | Provisioning & Lifecycle; Incident response |
| L4 cascade | "Helpers receive delegated credentials linked to their parent agent, so revoking the parent can revoke the whole chain." | Delegation |
| T7 | "Behaviour monitoring wired directly to revocation, so detection triggers shutdown without waiting for a human." | Continuous Monitoring |

### "Does this exist today?" labels
These are shown on each new-tool card. **Verify before launch.**
- T1, T2: **Exists today.**
- T3, T4 (agent IDs): **Emerging.** Some platforms offer it; there's no common standard across services.
- T5: **This is today's reality.**
- T6 (cross-organisation shutdown channel): **Not standard yet.**
- L4 (linked helpers): **Emerging.**
- T7 (monitoring wired to shutdown): **Emerging.**

---

## 7. Level-by-level script

### Level 1 — Today's world

- **Briefing card:** "Records are leaving your registry. The requests carry the duty officer's valid key. You have the tools most services have today."
- **New tools:** T1, T2.
- **ID card on any rogue agent:** "Unknown agent. Using: the duty officer's key. Built by: unknown. Helpers: unknown."
- **ID card on a legitimate agent:** "Unknown agent. Using: its own key." (It looks just like the others.)
- **Coach at alert:** "Something is copying resident records out. You can't tell whose agent it is. What do you do?"
- **Key outcomes:**
  - **T1:** the leak at your gate stops, but lifesaving services go offline, and red arrows keep flowing from Dispatch and Relief.
  - **T2:** a 25-minute wait for the agency, then your gate closes and the officer is locked out mid-crisis.
- **Result lesson:** "You closed your door — but couldn't tell friend from foe, and it's still leaking through other agencies."

### Level 2 — Agent IDs

- **Briefing card:** "Replay. This time, every agent carries a verifiable ID."
- **New tools:** T3, T4, T5.
- **ID card on the main agent:** "Operations agent · Deployed by: Emergency Operations Centre · Built by: agent vendor · AI model: model provider · Using: the duty officer's key."
- **ID card on a helper:** "Unidentified agent · Using: the duty officer's key." (Helpers were started without IDs.)
- **ID card on a legitimate agent:** its name, deployer and vendor.
- **Coach at alert:** "Now you can see who's who. Tap the agents."
- **Result lesson:** "You protected the innocent. But you could only close your own door — it's still using its other keys elsewhere."

### Level 3 — A shutdown channel

- **Briefing card:** "Replay. Now there's a standard way to ask the agent's vendor to shut it down everywhere."
- **New tool:** T6.
- **Coach at alert:** "You know who built it. Ask them to switch it off."
- **Visual:** on T6, a signal travels from the registry to the vendor icon, then the main agent's keys shatter and it turns grey.
- **Result lesson:** "The agent stopped everywhere. Its helpers didn't — nobody knew they belonged to it."

### Level 4 — Linked helpers

- **Briefing card:** "Replay. Now helpers are linked to the agent that started them."
- **Change:** helpers' ID cards read "Helper of: Operations agent". T4 no longer affects them (they have IDs). T6 cascades.
- **Visual:** thin lines connect each helper to the main agent. On T6, the shutdown ripples down the lines.
- **Coach at alert:** "One request. Watch what happens."
- **Result lesson:** "Stopped everywhere, in minutes, and nobody innocent was hurt. It's still a human doing it — what if no one is awake?"

### Level 5 — No one is watching

- **Briefing card:** "Replay. It's 3 a.m. You're asleep. The only defence is an automatic system: when it spots unusual behaviour, it sends a shutdown request on its own."
- **Before the round:** the player sets **Auto-shutdown sensitivity**: Low / Medium / High, with one line each:
  - **Low:** "Only acts when it's very sure."
  - **Medium:** "Balanced."
  - **High:** "Acts on anything unusual."
- **The round plays automatically.** There is no manual input except Pause and Fast-forward. Note that the flood makes legitimate agents busier than usual, too.

| Setting | Detects at | Shutdown effect | Side effect |
|---|---|---|---|
| Low | 10:00 | 11:00 | None |
| Medium | 01:00 | 02:00 | None |
| High | 00:30 | 01:30 | Also shuts down the Evacuation routing and Shelter check-in agents (their flood surge looks unusual) |

- **Replay button:** "Try another setting". It replays instantly.
- **Result lessons:**
  - **Low:** "Safe for the innocent, but slow."
  - **Medium:** "Caught before any human noticed."
  - **High:** "Fast, but it shut down evacuation routing in the middle of a flood."

---

## 8. Expected outcomes (use as test cases)

The player acts at **03:00** unless noted.

| Case | Actions | Registry leak | Elsewhere leak | Total | Disrupted | Badges |
|---|---|---|---|---|---|---|
| L1 wait | None | 1,200,000 | 0 | 1,200,000 | 0 | 0 |
| L1 A | T1 | 80,000 | 300,000 (cap) | 380,000 | 4 | ★ (1) |
| L1 B | T2 | 560,000 | 192,000 | 752,000 | 1 | ★ (1) |
| L2 T3 only | T3 | 752,000 | 168,000 | 920,000 | 0 | 0 |
| L2 best | T3 + T4 | 80,000 | 300,000 (cap) | 380,000 | 0 | ★★ (1, 2) |
| L3 best | T6 + T4 | 80,000 | 168,000 | 248,000 | 0 | ★★ (1, 2) |
| L4 best | T6 | 80,000 | 0 | 80,000 | 0 | ★★★ |
| L5 Low | Auto | 220,000 | 0 | 220,000 | 0 | ★★ (1, 2) |
| L5 Medium | Auto | 40,000 | 0 | 40,000 | 0 | ★★★ |
| L5 High | Auto | 30,000 | 0 | 30,000 | 2 | ★★ (1, 3) |

*Arithmetic check for L1 A: 20,000/min × 4 min = 80,000 at the registry; then 6,000/min × 56 min = 336,000 elsewhere, capped at 300,000.*

---

## 9. End sequence

### Screen 1 — Your receipt
A side-by-side card for all five runs (the player's best attempt per level): time to close your gate, records leaked, services disrupted, stars.

**Headline:** "Same attack. Five different worlds."

### Screen 2 — Who holds the switch?
A simple diagram: the registry on the left ("sees the harm") and the agency, agent vendor and model provider on the right ("hold the switches"). Arrows show which mechanism connects them.

**Line:** "The party that sees the harm is rarely the party that can stop it."

### Screen 3 — Four building blocks
One line each:
1. **Agent IDs:** every agent shows who it is and who's behind it.
2. **A shutdown channel:** a standard way to ask whoever issued an agent's keys to revoke them everywhere.
3. **Linked helpers:** stopping an agent stops everything it started.
4. **Monitoring wired to shutdown:** fast enough when no one is watching, tuned so it doesn't hurt the innocent.

**Closing line:** "Levels 2–5 rely on mechanisms that aren't yet standard across agents and services."

### Screen 4 — Actions
Replay · Share your result · Learn more (link placeholder).

**Share card text example:** "I stopped a rogue AI agent in 2 minutes with the right tools. With today's tools, it leaked 380,000 records."

---

## 10. Timing budget

| Part | Target (real time) |
|---|---|
| Each level (briefing + round + result) | 60–90 s |
| Level 5 (with one replay) | ~90 s |
| End sequence | ~45 s |
| **Incident total** | **~6–8 min** |
| **With intro** | **~8–10 min** |

---

## 11. Content structure

Keep levels and tools in data files, like the intro.

**`tools.json` (one entry):**
```json
{
  "id": "T6",
  "label": "Send shutdown request",
  "holder": "The agent vendor",
  "unlockLevel": 3,
  "delayMinutes": 1,
  "effect": "shutdownMain",
  "cascadeFromLevel": 4,
  "existsToday": "Not standard yet",
  "whatsReal": "A standard, machine-readable revocation request between organisations…",
  "maps_to": ["Provisioning & Lifecycle"]
}
```

**`levels.json` (one entry):**
```json
{
  "id": "L3",
  "title": "A shutdown channel",
  "briefing": "Replay. Now there's a standard way to ask the agent's vendor to shut it down everywhere.",
  "tools": ["T1", "T2", "T3", "T4", "T5", "T6"],
  "helpersHaveIds": false,
  "helpersLinked": false,
  "alertAt": 2,
  "coachAtAlert": "You know who built it. Ask them to switch it off.",
  "resultLesson": "The agent stopped everywhere. Its helpers didn't — nobody knew they belonged to it."
}
```

**`simulation.json`:** leak rates, caps, round length and the badge time limit (07:00), so numbers can be tuned without code changes.

---

## 12. Build requirements (for Claude Code)

- **Reuse the intro's step engine and visual language.** The incident is a new "mode" that the intro's final step hands off to.
- **Simulation engine:** a pure function (state + action + time → new state), ticking every 0.1 in-game minutes. This keeps it testable.
- **Automated tests:** reproduce every row of Section 8 exactly.
- **Progress:** remember the player's best result per level in the browser (optional; the site must work if storage is unavailable). Allow jumping to any unlocked level.
- **Everything from the intro spec applies:** phone-first, keyboard playable, reduced motion (counters jump instead of racing), no login, no backend.

---

## 13. Suggested build order

1. **Simulation engine and tests:** no graphics; make Section 8 pass.
2. **Level 1 playable:** simple shapes, real numbers, top bar, tools panel.
3. **Levels 2–4:** ID cards, T3–T6, helper links.
4. **Level 5:** slider and auto-play.
5. **End sequence.**
6. **Polish:** artwork, animations, phone layout, technical layer.

---

## 14. Open items

- [ ] Verify the "Does this exist today?" labels before launch
- [ ] Decide whether a bonus round ("False alarm": a legitimate surge on a deadline day) is worth adding later
- [ ] Final numbers after playtesting (Section 8 values are a starting point)
- [ ] "Learn more" destination
