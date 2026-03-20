# The Obelisk — AI Teacher Layer: Implementation Brief

## Project Overview

The Obelisk is a Slay the Spire-style roguelite where every combat action (attack, block, AoE, ultimate) requires the player to answer a math question under a timer. The game is built for two children, ages 7 and 9.

The codebase is a vanilla JS module project with three well-separated layers:

| File | Role |
|---|---|
| `data.js` | Pure constants and templates (no logic) |
| `engine.js` | Pure game logic (no DOM, immutable state pattern) |
| `ui.js` | Pure rendering (HTML string generation) |
| `main.js` | App entry point and event wiring |

The architecture is already clean and modular. **Do not refactor the existing layers.** Add to them minimally and additively only.

---

## Goal

Add an **AI Teacher mode** as a new opt-in run type, alongside the existing Spire system which remains fully intact as the default/fallback.

The existing Spires (`addition`, `subtraction`, `multiplication`, `division`, `mixed`) continue to work exactly as they do today. The AI Teacher mode is a sixth option that replaces the static question bank with dynamically generated questions from the Anthropic Claude API.

---

## New File: `learning.js`

Create a new module `./js/learning.js`. This is the only significant new file. It is the boundary layer between the game engine and the Claude API. Nothing else in the codebase should call the API directly.

### Responsibilities

- Accept a `LearningContext` object and return a valid `Question` object
- Maintain a **pre-fetch queue** so the next question is ready before it's needed
- Track per-session performance (correct/incorrect per topic)
- Expose a `LearningSession` object that the engine can read to understand the child's current focus and progress
- Never expose raw API responses to the engine — always validate and normalise before returning

### The Question Contract

Every question — whether from the static bank or the AI — must conform to this shape. This is the shared contract across all layers:

```js
{
  text: "What is 7 × 8?",          // The question string
  options: ["54", "56", "58", "64"], // Always exactly 4 strings
  answer: "56",                      // Must be one of the options
  subject: "multiplication",         // Topic tag
  difficulty: 2,                     // 1 (easy) to 3 (hard)
  source: "ai" | "static"           // Origin tag
}
```

The engine already uses `action.problem.text` and `action.problem.options`. The new contract is backward compatible with this shape.

### LearningContext (input to the AI call)

```js
{
  childAge: 7 | 9,
  subject: "multiplication",         // What the child chose or what was inferred
  difficulty: 1 | 2 | 3,            // Current difficulty level
  actionType: "EASY" | "HARD",      // Maps to question difficulty ceiling
  sessionStats: {
    correct: 12,
    incorrect: 3,
    streak: 4,
    topicHistory: ["multiplication", "multiplication", "multiplication"]
  }
}
```

### Difficulty Progression Rules

These rules live entirely inside `learning.js` and must not leak into the engine:

- Start every session at difficulty 1
- After 3 consecutive correct answers: increment difficulty (max 3)
- After 2 consecutive incorrect answers: decrement difficulty (min 1)
- `EASY` actions (Strike, Guard) cap at difficulty 2
- `HARD` actions (Sunder Wave, Ultimate) use full difficulty range
- Difficulty resets between acts (floors 1–10, 11–20, 21–30)

---

## API Call Specification

**Model:** `claude-haiku-4-5-20251001` (fast, cheap, appropriate for short question generation)

**System prompt (exact, do not modify without discussion):**

```
You are a math question generator for children aged 7–9. Your only job is to output valid JSON math questions. You never explain, chat, or go off-topic. You always output exactly one JSON object matching the schema provided. Questions must be age-appropriate, solvable with mental arithmetic, and never involve decimals unless the child is age 9 and difficulty is 3.
```

**User prompt template:**

```
Generate one math question for a {childAge}-year-old child.
Subject: {subject}
Difficulty: {difficulty} (1=easy, 2=medium, 3=hard)
Action type: {actionType}

Return ONLY this JSON object, no markdown, no preamble:
{
  "text": "question string",
  "options": ["wrong", "correct", "wrong", "wrong"],
  "answer": "correct answer string",
  "subject": "{subject}",
  "difficulty": {difficulty}
}

Rules:
- Exactly 4 options
- answer must appear in options
- All options must be plausible (no obviously wrong answers)
- Options must be shuffled (correct answer not always in same position)
- No decimals for age 7 or difficulty 1–2
- Number ranges by difficulty: 1 = 1–10, 2 = 1–20, 3 = 1–50
```

### Response Handling

Always parse the response safely:

```js
function parseAIQuestion(rawText, context) {
  try {
    const cleaned = rawText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (validateQuestion(parsed)) {
      return { ...parsed, source: "ai" };
    }
  } catch (_) {}
  // Fall back to static question on any failure
  return getFallbackQuestion(context);
}
```

`validateQuestion` must check:
- `text` is a non-empty string
- `options` is an array of exactly 4 non-empty strings
- `answer` is a string present in `options`
- `subject` is a string
- `difficulty` is 1, 2, or 3

---

## Pre-fetch Queue

Latency must be invisible to the child. Implement a simple 2-slot queue:

```js
// Conceptual shape — implement as a class or module-level object
const queue = {
  pending: null,   // Promise<Question> currently in flight
  ready: null,     // Question already resolved and waiting
}
```

**Trigger rules:**
- When a battle starts: immediately pre-fetch the first question for each action slot
- When a question is consumed (answer submitted): immediately fire the next pre-fetch
- The timer does not start until a question is available (pending state shows a brief spinner on the action button, not the full problem UI)

---

## Session Setup: The Teacher Conversation

Before an AI Teacher run starts, show a simple **subject selection screen** (not a free-text chat). This is a structured UI, not an open conversation. The child never types anything.

The screen asks: **"What do you want to practice today?"**

Options presented as large buttons:
- ➕ Addition
- ➖ Subtraction
- ✖️ Multiplication
- ➗ Division
- 🌀 Surprise me

"Surprise me" lets the AI vary topics based on session performance (rotating weakest areas).

After selection, ask: **"How are you feeling today?"**
- 😊 Great — start at difficulty 1, scale normally
- 😐 Okay — start at difficulty 1, scale more slowly (require 5 correct to increment)
- 😔 Tired — lock to difficulty 1 for the whole session

These inputs feed into the `LearningSession` object and are passed with every API call.

---

## Changes to Existing Files

### `data.js`

Add one new entry to `SPIRES`:

```js
{
  id: "ai-teacher",
  name: "The Living Spire",
  symbol: "AI",
  asset: "./assets/spires/spire-ai-teacher-emblem.png",  // New asset needed
  description: "A spire that reads your progress and shapes every question to what you need most.",
  requiresAITeacher: true,  // Flag used by UI to show setup screen
}
```

The existing five spires are untouched.

### `engine.js`

Add one small utility export:

```js
export function isAITeacherRun(run) {
  return run?.spireId === "ai-teacher";
}
```

The engine does not call `learning.js` directly. Instead, the question is injected into the action's `problem` field **before** the engine processes it. This keeps the engine pure and synchronous.

### `ui.js`

- Add the subject/mood selection screen (`renderAITeacherSetup`)
- Add a brief loading state for action buttons when `problem` is null but `awaitingQuestion: true` is set on the action
- Display a small "AI" badge on question prompts when `source === "ai"` (subtle, not intrusive)
- Optionally show a small subject tag below the question text ("Multiplication · Level 2")

### `main.js`

The main event loop is where `learning.js` is wired in:

- On action button click in an AI Teacher run: check queue, inject question into action before calling engine
- On answer submission: record result in `LearningSession`, trigger next pre-fetch
- On battle start: initialise `LearningSession` for this battle, kick off initial pre-fetches

---

## Static Fallback Bank

`learning.js` must include a minimal static fallback bank (30–40 questions per subject, all difficulties). This is used when:

- The API call fails or times out (2 second timeout on question fetch)
- The user is offline
- Question validation fails

The fallback bank is the existing Spire question logic, repackaged as a local function inside `learning.js`. The engine and the child never know the difference — the contract shape is identical.

---

## Session Stats Tracking

Track the following in `LearningSession` (in-memory only, no persistence needed for v1):

```js
{
  subject: "multiplication",
  childAge: 9,
  difficulty: 2,
  moodModifier: "normal" | "slow" | "locked",
  correct: 0,
  incorrect: 0,
  streak: 0,                    // Current consecutive correct
  worstStreak: 0,               // Longest incorrect streak
  topicHistory: [],             // Last 10 subject tags answered
  questionHistory: [],          // Last 5 question texts (to avoid repeats)
}
```

Pass `questionHistory` in the API prompt as: `"Avoid repeating these questions: [list]"` appended to the user prompt.

---

## What This Brief Does NOT Cover (future scope)

- Persistent progress tracking across sessions (would need localStorage or Firebase)
- Parent/teacher dashboard
- Multiple child profiles
- Subjects beyond maths
- Voice input
- Difficulty branching by subject (e.g. child is strong at addition but weak at division)

These are intentionally deferred. The architecture described here will support all of them without structural changes.

---

## File Structure After Implementation

```
/js
  data.js          ← add AI Teacher spire entry only
  engine.js        ← add isAITeacherRun() only
  learning.js      ← NEW: all AI teacher logic lives here
  ui.js            ← add setup screen + loading state + question badge
  main.js          ← wire learning.js into event loop
/assets
  /spires
    spire-ai-teacher-emblem.png   ← NEW asset needed
```

---

## Implementation Order

1. `learning.js` — build the module, queue, API call, fallback, validation
2. `data.js` — add the spire entry
3. `main.js` — wire the setup flow and question injection
4. `ui.js` — add setup screen, loading state, question badge
5. `engine.js` — add `isAITeacherRun()` helper
6. Test with API key in a `.env` or hardcoded temporarily, then move to a config pattern

---

## Key Constraints (Non-Negotiable)

- The child **never interacts with the AI directly** — all API calls are behind `learning.js`
- The API prompt is **strictly constrained** — the model only generates question JSON, never free text shown to the child
- **Every API response is validated** before use — invalid responses fall back to static questions silently
- The existing five Spires must work **exactly as they do today** — zero regression
- `engine.js` remains **synchronous and pure** — no async logic, no API calls
- Questions must feel **instant** — pre-fetch queue is mandatory, not optional
