# Math Monster Frontier - Project Documentation

## 1. Overview

Math Monster Frontier is a high-speed, roguelike deck-builder (inspired by titles like Slay the Spire) where traditional card-based combat is replaced by mental arithmetic. Players ascend a vertical spire, choosing their path through monsters, elite encounters, shops, and rest sites. The core innovation lies in its "Reaction-Math" engine, which uses mathematical proficiency to trigger real-time combat actions.

## 2. Vision

Math Monster Frontier should feel like a real game first and a math workout second. The goal is to build a highly replayable action-roguelike where players return because the runs are exciting, the classes feel different, the branching routes create meaningful choices, and mastery feels satisfying. Math practice is the secret engine of the fun: repetition should happen because players want one more run, not because they are forced into drills.

The ideal player experience is:

- Fast enough to create a flow state
- Strategic enough to reward route planning and build decisions
- Varied enough that no two runs feel identical
- Clear enough that failure feels fair and readable
- Educational in a low-friction way, where arithmetic fluency improves through repetition, speed, and confidence

The long-term product vision is to make mental math feel powerful, stylish, and replayable. A player should finish a session feeling two things at once: "I want another run" and "I am getting faster at math."

## 3. Replayability Pillars

To support long-term retention, the game should be designed around several replayability pillars:

### A. Run Variety

- Procedural branching maps should create distinct risk-reward paths each run.
- Room distributions should produce different pacing profiles, including aggressive elite-heavy climbs, safer recovery routes, and event-rich gambles.
- Treasure, relic, and shop offerings should push players into different build directions rather than repeating a single solved strategy.

### B. Class Identity

- Knight, Wizard, and Rogue should each change how players value speed, accuracy, survivability, and route choice.
- A strong class fantasy increases replayability because starting a new run with a different legend should feel like learning a different style, not just swapping numbers.

### C. Skill Growth

- The player should feel their own improvement over time through faster recall, fewer mistakes, and more confidence under pressure.
- Combo chains, speed bonuses, and class-specific strengths should reward real improvement in arithmetic fluency.
- Difficulty should scale in a way that makes players feel challenged, not punished.

### D. Build Expression

- Players should be able to shape a run through upgrades, relics, card tuning, and route planning.
- Replayability increases when the same player can pursue different strategies on different runs, such as defense-heavy consistency, combo-speed aggression, or high-risk burst damage.

## 4. Recent Core Updates & UX Improvements

Following the latest iteration, several critical UI and gameplay bottlenecks were addressed to enhance the "Game Pace" and "Visual Clarity" as requested:

### A. Avatar & Character Selection

- The "Brain" Removal: Replaced the generic brain icon with a dedicated "Legend Selection" screen. This adds a layer of role-playing and personality to the experience.
- Class Dynamics:
  - Knight: Features a balanced HP pool and consistent damage. Ideal for learning the spire's rhythms.
  - Wizard: Possesses the "High Risk, Massive Damage" trait. Problems generated are statistically weighted toward HARD difficulty but offer significantly higher strike values.
  - Rogue: Focuses on "Fast Strikes." While individual values are lower, the rogue benefits more from the Combo system and has enhanced defense card values.
- Visual Identity: The chosen avatar is reflected in the Header UI, combat stage, and victory reports, providing a consistent player identity throughout the run.

### B. High-Pace Combat System (Hotkeys)

- Action Selection (Phase 1): Use `A` (Strike), `S` (Guard), `D` (Mega Hit), and `F` (Mend) to select cards from the hand. This layout mimics common gaming "home row" positions for ergonomics.
- Answer Selection (Phase 2): Once a problem is active, players use `1`, `2`, `3`, and `4` to select the corresponding math answer pills.
- Game Dynamics: This removes mouse travel time, allowing skilled players to enter a flow state. The time saved by using hotkeys directly impacts the Speed Bonus multiplier.

### C. UI Scaling & "Cut-off" Fixes

- Pill Sizing: Reduced the vertical padding and font size of answer pills in the battle view. This ensures the options remain visible even on smaller laptop screens or compressed browser windows.
- Safe-Area Layout: Added a scrollable container (`scrollbar-hide`) for the action hand and answer grid, ensuring that if content exceeds the viewport, it remains accessible via touch or scroll rather than being hard-clipped.
- Responsive Layout: Utilizing Tailwind's `flex-col` and `flex-row` utilities, the battle arena shifts its focus between the combatants and the problem-solving tray based on the active state.

## 5. Technical Architecture

### State Management & Reactivity

- Player State: A central object tracking HP, Max HP, Block, Gold, Floor, Combo, XP, and Level. This state is synchronized to the Firestore database upon every major event (battle end, shop purchase, rest).
- Battle State:
  - Enemy Management: Tracks an array of objects including current HP, Max HP, and telegraphed moves.
  - Hand Generation: Each card in the hand is injected with a fresh problem object generated at the start of the turn.
- Procedural Map Generation: A 15-floor algorithm that ensures a varied path. It uses a width-based distribution where the start and end are narrow (1 node) and the middle floors offer more branching choices (2-3 nodes).

### Persistence (Firestore)

The game adheres to a strict "No Complex Query" rule to ensure instant performance without server-side indexing:

- Path Structure:
  - Public Data: `/artifacts/{appId}/public/data/{collectionName}`
  - Private User Data: `/artifacts/{appId}/users/{userId}/profile/data`
- Sync Strategy: Uses `onSnapshot` for real-time reactivity. Authentication is handled anonymously via `signInAnonymously` to allow immediate play without account barriers.

### Combat Logic & Difficulty Scaling

- Problem Generation Engine:
  - Easy Difficulty: Addition and subtraction with operands between 2 and 12.
  - Hard Difficulty: Multiplication with operands between 2 and 12.
- Distractor Logic: Incorrect choices are generated by adding/subtracting small offsets from the correct answer, ensuring the player must actually solve the problem rather than just looking for the only reasonable number.
- Speed Bonus: Solving a problem in under 3 seconds grants a `1.5x` damage/heal/block multiplier.
- Combo System: Consecutive correct answers increment a combo counter, where each point adds a stacking `5%` power bonus. A single miss or time-out resets the combo to zero.
- Practice Philosophy: The game should adapt challenge through class tuning, encounter design, relics, and action upgrades so players repeatedly engage core arithmetic skills in fresh contexts instead of grinding static worksheets.

## 6. Fun-First Learning Principles

- The game should never feel like a quiz wrapped in fantasy art.
- Math prompts should support momentum, confidence, and readable escalation.
- Early runs should create quick wins and teach the battle rhythm.
- Later runs should increase pressure by combining harder problems, enemy intent, and route consequences.
- Misses should feel recoverable enough to keep players engaged, while high-skill play should feel meaningfully rewarded.
- Every system should answer both questions: "Is this fun in a roguelike?" and "Does this encourage useful math repetition?"

## 7. Visual Design Tokens

- Typography: Leverages `font-black` (Inter or system sans) with italic styling for headings to convey momentum and urgency.
- Colors & Theme:
  - Primary (`Indigo-600`): Used for UI borders, branding, and friendly actions.
  - Danger (`Rose-500`): Used for enemy HP, enemy lunges, and damage alerts.
  - Success (`Emerald-500`): Used for healing and XP gains.
  - Economy (`Amber-500`): Used for gold and legendary or critical hit effects.
- Animations:
  - Screen Shake: Triggered on miss or player damage via custom CSS `@keyframes`.
  - Lunge: A horizontal translation animation that moves the enemy toward the player when attacking.

## 8. Future Roadmap

- Relic System: Passive artifacts found in treasure chests (e.g., "The Abacus" - reduces multiplication operands by 1).
- Multiplayer Ghost Runs: A feature to see the progress of other users as small icons on your own map view.
- Dynamic Audio Engine: Implementation of the Gemini TTS or Web Audio API to announce "Critical Hit" or "Speed Bonus" to reinforce the reward loop.
- Shop Expansion: Ability to remove easy cards and replace them with expert cards for higher-level spire climbing.
- Mastery Tracks: Optional long-term progression layers, such as class milestones, challenge modifiers, or performance badges, that increase replayability without undermining the purity of run-based play.
