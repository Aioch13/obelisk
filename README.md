# The Obelisk

**Math Monster Frontier** — a dark fantasy roguelike where math problems power your combat actions.

Inspired by Slay the Spire. Answer equations quickly to deal damage, crit, and chain combos. Choose a legend, pick a spire, and climb 30 floors.

## Play

Open `index.html` via any HTTP server (required for ES modules):

```bash
npx serve .
```

Then visit `http://localhost:3000`.

## Legends

| Legend | Style |
|--------|-------|
| Knight | Tank — high HP, barrier play |
| Wizard | Burst — hard spells, crit chains |
| Rogue  | Speed — combos, tempo, flurries |

## How combat works

1. Select an action from your hand
2. A math problem appears — answer it before the timer runs out
3. Correct answers deal damage or raise barrier; wrong answers miss
4. Fast answers open crit windows
5. Chain correct answers to build combo multiplier (caps at 12×)

## Tech

Vanilla JS ES modules, no framework, no build step. Single `index.html` entry point.
