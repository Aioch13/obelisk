# The Obelisk — Replayability Audit & Opportunity Report

_Generated 2026-04-30. Based on the live state of `js/data.js`, `js/engine.js`, `js/achievements.js`, and `assets/`._

This document does two things:

1. **Inventories** the content currently in the game so you can see at a glance what's loaded vs thin.
2. **Surfaces concrete gaps and opportunities** — placeholders that are wired but unfilled, and systems that exist but only have one or two entries when they want a dozen.

The report is opinionated. Items are grouped by impact on replayability, with quick-win placeholders called out first so you can chip away as time allows.

---

## TL;DR — The five biggest replayability levers

| # | Lever | Current state | Suggested target | Why it matters |
|---|---|---|---|---|
| 1 | **Enemy AI variety** | Every enemy uses one intent: `{ type: "ATTACK", value: damage }`. No buffers, defenders, debuffers, summoners, or status casters. | 6–8 distinct intent types (attack/defend/buff/debuff/summon/charge/heal/wait) + per-archetype patterns. | Single biggest cause of "all fights feel the same." |
| 2 | **Status effect system** | Only `stun` exists in the engine. The player has no statuses at all. | Add poison, weak, vulnerable, frail, regen, thorns, strength, dexterity. | Unlocks deck-building decisions, relic interactions, enemy archetypes — the whole tactical surface. |
| 3 | **Run modifiers / curses** | 5 modifiers total (3 boons, 1 curse, 1 bargain). | 20+ across boons / bargains / curses / spire-themed. | Currently events feel samey because the long-tail outcome (a modifier) only has 5 faces. |
| 4 | **Run-meta modes** | Standard climb only. No daily, no ascension/heat, no challenge runs, no seeded sharing. | Add "Heat" ladder (Slay-the-Spire ascensions), Daily Climb, Weekly Trial. | This is where roguelikes get their 100+ hour tail. Currently a 30-floor win has nothing harder to chase. |
| 5 | **Spire personality** | All spires share the same enemy/event/relic pools. The math operator is the only difference. | Per-spire monster sub-pools, signature bosses, and signature relics. | Makes the choice of route _matter_ beyond preferred operator. |

---

## Part 1 — Inventory

### Content currently loaded

| Category | Count | Notes |
|---|---|---|
| Legends | 3 | Knight, Wizard, Rogue. Each has a 16-node tree, 4–5 evolutions, and 1 ultimate. |
| Spires | 5 | +, −, ×, ÷, mixed |
| Climb tiers (difficulty bands) | 5 | Sprout, Apprentice, Adept, Master, Sage |
| Skill tree nodes | 48 (16/legend × 3) | Full |
| Action evolutions | 14 (5/5/4) | Functional but lean |
| Ultimates | 3 (1/legend) | Minimal — no alt ultimates per build |
| Base actions | 4 (atk/blk/aoe/util) | Util slot starts locked |
| Relics | 32 | 11 C / 6 U / 9 R / 4 E / 2 L |
| Run modifiers | **5** | Thinnest content slot in the game |
| Events | 22 defined, **5 placeholders referenced** | See Part 2 |
| Monsters | 6 | 3 use placeholder icons (no asset) |
| Elites | 4 | 2 use placeholder icons |
| Bosses | 4 | 1 has art; 3 use placeholder letters |
| Achievements | 8 | No relic-collection, no class-specific, no perfect-run, no daily-streak |
| Status effects (engine) | 1 (`stun`) | Player statuses: 0 |
| Enemy intent types | 1 (`ATTACK`) | All variety is hp/damage scaling |
| Materials (meta-currency) | 3 | Emberwood / Thorium / Eternium |
| Herbs / potions | 4 / 4 | Heal, heal+, heal++, energy |
| Outpost wings | 4 | Portal / Archive / Forge / War Room — all with 1–4 tiers |
| Run modes | 1 | Standard climb only |

### Asset coverage

| Folder | Defined | Has art | Missing |
|---|---|---|---|
| `assets/legends/` | 3 | 3 | 0 |
| `assets/enemies/` | 6 monsters + 4 elites = 10 | 5 | **5 missing portraits** |
| `assets/bosses/` | 4 | 1 | **3 missing portraits** (gatekeeper, sigil-engine, obelisk-heart) |
| `assets/relics/` | 32 | 13 | **19 missing relic icons** |
| `assets/spires/` | 5 | 5 (one is `spire-mixed-emblem.png`) | 0 |
| `assets/scenes/` | 3 | 3 | rest / shop / treasure scenes only |
| `assets/backgrounds/` | 5 | 5 | OK (act 1/2/3, hub, map) |
| `assets/nodes/` | 7 | 7 | OK |

---

## Part 2 — Confirmed placeholders (wired but unfilled)

These are the easiest wins because the systems already exist. Code references something that just isn't there.

### A. 5 unimplemented event templates ⚠️

`BASE_UNLOCKS.archive[1].unlocks.events` references events that don't exist in `EVENT_TEMPLATES`:

```
ghost-market
fracture-dais
ember-tribunal
moon-reliquary
gallows-ledger
```

These will be silently dropped from the event pool when the player upgrades the Archive to tier 2 — the climactic Outpost upgrade is currently giving them less content than tier 1. Each needs ~20 lines of data following the existing pattern (title, text, 3 choices with `effect: { ... }` payloads).

### B. 19 relics with `asset: null` (or no asset key)

```
guardian-circuit, combo-censer, war-drum, brass-bulwark, field-bandage,
cinder-charm, duelist-thread, quarter-seal, herbal-satchel, storm-phial,
raven-banner, glass-compass, hearth-sigil, soul-prism, night-market-coin,
forked-fang, gale-cutters, thorn-codex, cathedral-battery
```

These show up in shops/treasure as text-only cards. `assets/relics/` only has 13 of the 32 png files.

### C. 8 enemies + 3 bosses with `asset: null`

```
monsters: brute, crow, priest
elites:   disciple, breaker
bosses:   gatekeeper, sigil-engine, obelisk-heart
```

Each falls back to a single-letter icon. The `BASE_UNLOCKS.warRoom` upgrade is the player's reward for grinding meta-currency, and the unlocks all roll out as letter tiles.

### D. Mixed spire emblem

`spire-mixed-emblem.png` exists but no incoming-asset variant. Worth verifying it visually matches the other four (it's the "summit" emblem so it should feel grander).

---

## Part 3 — Systems that exist but are content-thin

Different from Part 2: these systems _work_, they just don't have enough variety to carry 50+ runs.

### E. Run modifiers — 5 total

`RUN_MODIFIERS` only has `fury-censer`, `storm-battery`, `warding-echo`, `glass-curse`, `crow-contract`. Events that grant a modifier feel repetitive within a single run. Suggest growing to 20–25 with a clear taxonomy:

- **Boons (8–10)** — combat-stat buffs, crit-window widen, energy gen, gold-bonus, herb-find.
- **Bargains (5–7)** — meaningful trade-offs (more spoils, less defense; more crit, fragile).
- **Curses (5–7)** — pure penalties for narrative cost (often event-attached).
- **Spire-themed (4–5)** — only spawn in specific spires, e.g. _Equation Echo_ in mixed spire boosts whichever operator you just cleared.

### F. Status effects — 1 (`stun`)

The player has _no_ status surface at all. Adding even four common statuses gives every other system more to grip:

| Status | What it does | New design surface |
|---|---|---|
| **Poison / Bleed** | Decays HP each turn; stacks | Rogue tree, DoT relics, "thorns" enemies |
| **Weak** | Reduce attack power | Tank enemies inflict it; wizard cleanses |
| **Vulnerable** | Take +50% damage | Enables crit-fishing strategies |
| **Frail** | Reduce barrier gained | Knight's defining check |
| **Regen** | Heal each turn | Rest-relic interactions, Knight ult |
| **Thorns** | Reflect a flat amount | Defensive Knight payoff |
| **Strength / Focus surge** | Battle-only stat buffs | Wizard combo finishers |

### G. Enemy intent diversity — 1 (`ATTACK`)

Compare to Slay the Spire's 7+ intent types. Each archetype currently differs only by HP and damage. Suggested intent vocabulary:

| Intent | Example archetype | Hand-feel |
|---|---|---|
| `ATTACK` (single) | Spire Fiend | Existing baseline |
| `MULTI_HIT` (e.g. 4 × 3 dmg) | Razor Fang | Punishes thin block |
| `BUFF_ALLIES` (+2 dmg next turn) | Fracture Priest | Forces priority targeting |
| `DEBUFF_PLAYER` (apply Weak) | Cipher Shade | Rewards cleanse / removal |
| `BLOCK_SELF` (gain 20 block) | Vault Breaker | Rewards big-burst windows |
| `SUMMON` (spawns minion) | Sigil Disciple | Pressure escalation |
| `CHARGE` (huge attack in 2 turns) | Obelisk Warden | Tension / interrupt window |
| `HEAL_ALLIES` | (new) Sigil Mender | Forces focus fire |
| `WAIT` / unknown intent | (new) Mirror Shade | Bluff / fog of war |

The architecture is ready — `enemy.intent` already shapes a typed object. Engine changes localized to `createEnemies` and the enemy-turn block (engine.js ~3010).

### H. Boss roster — 4 bosses, 3 acts

`gatekeeper` is hardcoded to act 1, `sigil-engine` to act 2, `obelisk-heart` to act 3, plus `sentinel` as a wildcard. With 30 floors that means once the War Room is fully upgraded, every act-end is _the same fight_. Suggest:

- **2 bosses per act** (random pick) → 6 unique bosses minimum
- **1 spire-specific signature boss** per spire → 5 more, each only appearing on the matching road
- **Each boss has 3 phases** with intent change at 66% and 33% HP

This converts the boss-hunt achievement into something that wants completion across multiple climbs.

### I. Relic rarity distribution

```
COMMON 11   UNCOMMON 6   RARE 9   EPIC 4   LEGENDARY 2
```

11 commons but only 2 legendaries means the late-game relic chase is shallow. Recommend: **+4 legendaries** (build-defining payoffs — "every 4th hit is a free crit", "first hit each battle = double damage") and **+3 epics** (synergy enablers).

### J. Achievements — 8 total

Currently all are floor/run-count gates. Missing: collection, mastery, and surprise.

Suggested ~25 additions:

- **Per-legend mastery (3):** _Knight Ascendant_, _Wizard Ascendant_, _Rogue Ascendant_ — beat floor 30 with each.
- **Per-spire conqueror (5):** clear final boss on each spire.
- **Relic collector (3):** own 6 / 12 / all relics across runs.
- **No-hit event:** clear a battle without losing HP.
- **Combo monk:** hit MAX combo without breaking.
- **Untouched climb:** clear an act without using any tonic.
- **Pacifist event-runner:** clear 5 events in a single run.
- **Gold hoarder:** end run with 500+ gold.
- **Ascension/heat ladder gates** (if Heat lands): _Frontier 5_, _Frontier 10_, _Frontier 15_.
- **Hidden ones:** secret unlocks for obscure interactions (cleanse a curse, take all 3 oath-pyre vows in one run, etc.).

### K. Ultimates — only 3 total

One ultimate per legend means a Knight always casts Guardian Bash. There's no "build choice" at the ult level. Suggested: **2 alternate ults per legend** (6 more) gated behind a tier-4 skill tree node, so picking your final tree node also picks your finisher.

### L. Spire identity is shallow

All spires currently share the same monster/event/relic pools. The only difference is which math operator dominates. Bigger payoffs:

- **Spire-locked monsters:** Razor Fang only appears on Multiplication, Cipher Shade only on Division, etc.
- **Spire-locked events:** an "operator spirit" event whose choice depends on the spire.
- **Signature relic per spire:** offered guaranteed in act 1 first treasure of each spire.
- **Spire weather modifier:** Forge of Echoes always carries a passive modifier (e.g. crits chain) that defines its identity.

---

## Part 4 — Net-new replayability systems

If even half of Part 3 lands you'll have a much deeper game. Past that, here's where the real long-tail comes from.

### M. Heat / Ascension ladder ⭐

The single highest-leverage feature for a roguelike's tail. Rationale: a player who beats floor 30 currently has nothing to do except start over identically.

- After your first crown win on a spire, unlock **Frontier 1** for that spire.
- 15+ tiers, each adding one stacking modifier:
  - F1: Elites give no extra reward
  - F2: Hard timer −1s
  - F3: Curses last 1 extra battle
  - F4: Bosses gain 15% HP
  - F5: Negative event RNG slightly worse
  - …
  - F15: All of the above + a unique "frontier curse"
- Track high-Frontier wins per spire per legend = 5 × 3 × 15 = **225 record cells** to chase.

### N. Daily Climb

A seeded run shared across all players for the day. Posts your floor + score. Cheap to build (deterministic seed for spire/legend/map/banks) and creates a daily reason to open the game.

### O. Weekly Trial / Custom Modifiers

Rotating challenge: e.g. "Wizard / Division / start at Floor 11 / no shops / one extra elite per act." Becomes a content slot you can keep refilling (community trials, curated trials).

### P. Cosmetic / palette unlocks

Every run that ends in a win awards a cosmetic shard. Spend on:
- Alternate legend portraits (3 tints × 3 legends = 9)
- Outpost background variants (frosted, scorched, dusk)
- Boss summit poses

Pure pull-forward content — no new mechanics, just visual chase.

### Q. "Bonded" / cursed relics

Every current relic is pure upside. Add ~6 relics that come with a real downside, e.g.:
- _Hollow Crown_ — "+25% all damage; you can't use ultimates."
- _Twin Theorem_ — "Strike hits twice, but its energy cost is 2."
- _Silver Tongue_ — "All shops are 50% off; you can't visit Rest sites."

Tightens the build-skill curve and gives "trade your safety net for a payoff" decisions.

### R. Event-chain / per-spire NPCs

A repeating NPC that appears at one node per act with a long-arc payoff. (E.g. the Apothecary's herbs in act 1 become a tonic in act 2 become a special potion in act 3.) Multi-run memory if persisted to the Outpost.

### S. Per-legend starter relic

Each legend currently starts identical. Give each a class-defining starter relic ("Knight's Oath", "Wizard's Cipher", "Rogue's Mark") that nudges build identity from turn one.

### T. Map node variety — Mystery / Shrine / Forge / Library

The map currently has 7 node types. A few more would lift the path-picking tension:

- **Shrine** — choose from 3 small permanent buffs (mini-relic). Limited per run.
- **Forge** — burn a relic to upgrade an action twice or remove a curse.
- **Library** — pre-roll the next 2 events or peek next floor's enemies.
- **Mystery** — appears as `?` until stepped on; rolls a random subtype.

---

## Part 5 — Suggested rollout order

If you want to bank quick replay-wins fast, then build toward the long tail:

| Sprint | Goal | Includes |
|---|---|---|
| 1 — _Plug the holes_ | No more silent placeholders | Add the 5 missing events (B); generate art for the 19 relics (B), 8 enemies, 3 bosses (C/D) |
| 2 — _Combat tactics_ | Battles stop feeling samey | 6 status effects (F); 6 enemy intent types (G); first-pass status icons in UI |
| 3 — _Build identity_ | Every run feels like a build | Per-legend starter relic (S); 2 alt ultimates per legend (K); 7 new relics including 4 epics + 4 legendaries (I) |
| 4 — _Spire identity_ | Route choice matters | Spire-locked monster sub-pools, signature relics, signature bosses (L) |
| 5 — _Long tail_ | Replays past Crown 1 | Heat ladder (M); 25 new run modifiers (E); 25 new achievements (J) |
| 6 — _Live ops_ | Reasons to come back | Daily Climb (N); Weekly Trial (O); cosmetic shards (P) |
| 7 — _Decision-rich_ | Build-choices have stakes | Bonded relics (Q); new map nodes (T); event chain NPC (R) |

---

## Part 6 — Drop-in JSON: 5 missing events + 5 starter run modifiers

Sprint-1 ready content. Drop these into `data.js`.

### Missing events (Part 2-A)

```js
// Append inside EVENT_TEMPLATES
{
  id: "ghost-market",
  title: "Ghost Market",
  text: "Translucent merchants haggle in a language of subtraction. Their wares are real; only the prices are spectral.",
  choices: [
    { id: "buy-the-fade",   label: "Trade A Memory",        description: "Lose 1 random skill point. Gain a random RARE relic.",  effect: { loseSkillPoints: 1, randomRelicRarity: "RARE" } },
    { id: "haggle",          label: "Haggle In Coin",        description: "Pay 80 gold. Gain 2 herbs of your choice and 1 skill point.", effect: { loseGold: 80, herbs: { red: 1, blue: 1 }, skillPoints: 1 } },
    { id: "walk-on",         label: "Walk On",               description: "The market fades. Gain 35 gold from a dropped purse.", effect: { gold: 35 } },
  ],
},
{
  id: "fracture-dais",
  title: "Fracture Dais",
  text: "A circular dais splits in three concentric rings. Each ring promises a permanent fracture in exchange for a permanent gift.",
  choices: [
    { id: "outer-ring",  label: "Outer Ring (Lose 8% Max HP)", description: "Lose 8% max HP. Upgrade two random actions.", effect: { loseHpPct: 0.08, upgradeRandomActions: 2 } },
    { id: "middle-ring", label: "Middle Ring (Lose 1 Relic)",   description: "Discard a random relic. Gain 2 skill points.", effect: { discardRandomRelic: true, skillPoints: 2 } },
    { id: "inner-ring",  label: "Inner Ring (Take A Curse)",    description: "Add Glass Curse to your next 3 battles. Gain a random EPIC relic.", effect: { runModifier: "glass-curse", runModifierBattles: 3, randomRelicRarity: "EPIC" } },
  ],
},
{
  id: "ember-tribunal",
  title: "Ember Tribunal",
  text: "Three judges of glowing coal rise from the brazier. Confess the sin of your climb and they will reshape your kit.",
  choices: [
    { id: "confess-greed", label: "Confess Greed",     description: "Pay all gold above 50. Gain +3 Focus.", effect: { capGoldAt: 50, stats: { focus: 3 } } },
    { id: "confess-pride", label: "Confess Pride",     description: "Reset your highest-level action to level 1. Gain a random RARE relic.", effect: { resetHighestAction: true, randomRelicRarity: "RARE" } },
    { id: "confess-fear",  label: "Confess Fear",      description: "Heal to full HP. Apply Glass Curse to the next battle.", effect: { healFull: true, runModifier: "glass-curse", runModifierBattles: 1 } },
  ],
},
{
  id: "moon-reliquary",
  title: "Moon Reliquary",
  text: "A cold reliquary holds three moons in glass. Touching one bonds you to its phase.",
  choices: [
    { id: "waxing-moon",  label: "Waxing Moon",  description: "Apply Warding Echo to the next 3 battles.",       effect: { runModifier: "warding-echo", runModifierBattles: 3 } },
    { id: "full-moon",    label: "Full Moon",    description: "Apply Fury Censer to the next 3 battles.",         effect: { runModifier: "fury-censer", runModifierBattles: 3 } },
    { id: "waning-moon",  label: "Waning Moon",  description: "Heal 30% max HP and gain 1 Red Herb.",            effect: { healPct: 0.30, herbs: { red: 1 } } },
  ],
},
{
  id: "gallows-ledger",
  title: "Gallows Ledger",
  text: "An open ledger stained with old ink lists every climber that came before. There is room for one more name—and a price for the privilege.",
  choices: [
    { id: "sign-in-coin",  label: "Sign In Coin",   description: "Pay 160 gold. Gain a guaranteed EPIC relic.", effect: { loseGold: 160, randomRelicRarity: "EPIC" } },
    { id: "sign-in-blood", label: "Sign In Blood",  description: "Lose 18% max HP. Gain a guaranteed LEGENDARY relic.", effect: { loseHpPct: 0.18, randomRelicRarity: "LEGENDARY" } },
    { id: "do-not-sign",   label: "Refuse To Sign", description: "Tear out a page. Gain 1 skill point and 60 gold.", effect: { skillPoints: 1, gold: 60 } },
  ],
},
```

> **Note:** some effect keys above (`runModifier`, `randomRelicRarity`, `discardRandomRelic`, `capGoldAt`, `resetHighestAction`, `loseSkillPoints`, `healFull`, `healPct`) aren't all wired yet. The audit's Part 5 sprint 1 should pair these data drops with handlers in `engine.js#applyEventEffect`. Keys I confirmed already work: `gold`, `loseGold`, `loseHpPct`, `herbs`, `stats`, `skillPoints`, `randomRelic`, `relicId`, `upgradeRandomActions`, `upgradeLowestHard`, `maxHp`.

### 5 new run modifiers

```js
// Append inside RUN_MODIFIERS
{ id: "wraith-dance",     name: "Wraith Dance",     tone: "boon",    battles: 2, description: "Next 2 battles: combo never breaks below 4.",                       apply: { comboFloor: 4 } },
{ id: "ironclad-march",   name: "Ironclad March",   tone: "boon",    battles: 3, description: "Next 3 battles: enter at 14 block, +10% guard.",                    apply: { battleStartBlock: 14, guardPower: 0.10 } },
{ id: "forge-fever",      name: "Forge Fever",      tone: "bargain", battles: 2, description: "Next 2 battles: +25% damage, but lose 4 HP at the start of every turn.", apply: { attackPower: 0.25, aoePower: 0.25, hpDrainPerTurn: 4 } },
{ id: "muted-songs",      name: "Muted Songs",      tone: "curse",   battles: 1, description: "Next battle: cannot use your ultimate.",                              apply: { ultimateLocked: true } },
{ id: "tide-of-coin",     name: "Tide Of Coin",     tone: "boon",    battles: 1, description: "Next battle: every successful answer drips 4 gold.",                  apply: { goldOnCorrect: 4 } },
```

> Same caveat: `comboFloor`, `hpDrainPerTurn`, `ultimateLocked`, `goldOnCorrect` will need an engine handler. Sprint 2 work.

---

## Appendix — Files inspected

```
js/data.js           (2,324 lines)
js/engine.js         (3,577 lines)
js/ui.js             (2,104 lines)
js/main.js           (542 lines)
js/achievements.js   (133 lines)
assets/{enemies,bosses,relics,spires,scenes,backgrounds,nodes,legends}/
```

If any number above is off, the discrepancy is most likely between `data.js` (audited) and any wiring in `engine.js` not yet exercised. The "5 missing events" and the asset-coverage gaps are the highest-confidence findings — they're directly verifiable in the file system.
