# The Obelisk

**Math Monster Frontier** — a fast-paced roguelike where math problems power your combat actions.

Pick a legend, choose a road, and climb 30 floors of a vertical spire. Every action you play needs a correct answer first; speed and combos turn correct answers into crits, kill streaks, and runs you want to play again.

## Play

The game runs as static ES modules. Serve the folder over HTTP:

```bash
npx serve .
```

Then open `http://localhost:3000`. No build step, no API keys, no backend.

## Legends

| Legend | Identity | Tree fantasy |
|--------|----------|--------------|
| Knight | Bulwark of the frontier — high HP, barrier play, hunts wounded foes | Vanguard / Bulwark / Execution / Ironclad |
| Wizard | Glass cannon — rewards HARD problems and quick crits | Stormweaving / Sigilcraft / Cataclysm / Arcana |
| Rogue  | Tempo & combo — combo never resets below a floor, heals through long combos | Blood Dance / Moon Veil / Knivesong / Shadowcraft |

Each legend has a 16-node skill tree (4 lanes × 4 tiers). Skill points are earned at rest sites and as victory rewards.

## How combat works

1. **Pick an action** from your hand using `A` / `S` / `D` / `F`.
2. **A math problem appears** — answer it before the timer runs out using `1` / `2` / `3` / `4` for the four options.
3. **Correct answers** trigger your action — damage, barrier, AOE, heal, or your ultimate.
4. **Quick answers** (under 3s) open a crit window — crits hit harder and feed combo / energy refunds depending on your build.
5. **Combos** stack power up to 12× (24× for Rogue) and break on a wrong answer (some skills soften the break).
6. **Press `E`** to end your turn. Enemies act, then your hand refills with fresh problems.

## Run structure

- 30 floors split into 3 acts of 10. Each act tightens the timer and raises enemy pressure.
- Map nodes: Monster (combat), Elite (harder + relic guarantee), Event (volatility), Shop (gold sink), Treasure (free relic), Rest (heal/temper/train), Boss (act gate).
- Win the floor 30 boss for a Summit Record. Die anywhere and you get a defeat report — your salvage still banks back to the Outpost.

## Outpost progression

The Outpost (the `/Outpost` button on the hub) is your meta-progression home. Boss salvage banks here as materials. Spend materials to upgrade four wings:

- **Portal Array** — unlocks new spires (subtraction, multiplication, division, mixed)
- **Archive** — unlocks new event chambers
- **Relic Forge** — adds new relics to the run pool
- **War Room** — adds new enemy archetypes and elites

Outpost upgrades trigger reveal modals showing what just unlocked. Earned **Field Honors** (achievements) appear on the Outpost panel and pop a celebration modal next time you visit the hub.

## Question generation

Each run pre-builds a deck of math problems sized to cover a worst-case 30-floor climb (~240 EASY + ~240 HARD). Within a run, problems don't repeat. Across runs, the most recent ~150 prompts per spire are excluded from the next run's bank, so two consecutive sessions feel fresh.

## Save / resume

Profile and active run autosave to `localStorage` after every state change. The hub's **Resume Climb** button loads the last in-progress run; clicking **Return To Camp** mid-run abandons it.

## Tech

Vanilla JS ES modules, single `index.html` entry point, no framework, no build step.

```
js/
  data.js          - All static content (spires, legends, relics, events, skill trees)
  engine.js        - Pure game logic (immutable state, no DOM)
  ui.js            - HTML string rendering
  main.js          - App entry, event wiring, render loop
  storage.js       - localStorage persistence
  achievements.js  - Achievement definitions and evaluator
styles.css         - All visual styles
tools/
  test-mechanics.mjs   - 30+ deterministic engine tests
  test-prototype.mjs   - End-to-end Playwright run
```

## Tests

```bash
node tools/test-mechanics.mjs   # ~1s, exercises engine math + tree balance
# Then in a separate terminal:
npx serve . -p 4173
node tools/test-prototype.mjs   # ~25s, walks a full run via Playwright
```
