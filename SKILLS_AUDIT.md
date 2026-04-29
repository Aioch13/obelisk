# Skills Audit — Math Monster Frontier

A balance, flavor, and fun-mechanics pass on the four base actions and three legend classes. The goal: keep the prototype's swagger, add depth that holds up over a 30+ run player journey, and make every card feel like a *toy a kid wants to play with*, not a stat line.

References pulled from: Slay the Spire (card identity, scaling), Hades (boon-modified base attacks), Mario & Luigi: Superstar Saga (action commands / timing windows), Pokémon (status flavor, type fantasy), Kirby Super Star (signature super), Prodigy Math (element-themed math), Brawl Stars (Super meter charge), Cuphead (parry windows).

---

## 1. Current State — Quick Diagnosis

| Action | Type | Multiplier | Difficulty | Read |
|---|---|---|---|---|
| Strike | ATK | ×1.0 | EASY | Baseline. Healthy. |
| Guard | DEF | ×1.2 | EASY | **Overtuned.** Out-values Strike on the same difficulty. |
| AOE Blast | AOE | ×0.7 | HARD | **Trap card** vs single targets. Punishes hard-math commitment when there's only one enemy. |
| Mend | HEAL | ×1.5 | HARD | Strong, but no cap — a long Mend chain on easy floors is a snooze. |

| Legend | HP | STR / VIT / FOC | Block | Read |
|---|---|---|---|---|
| Knight | 120 | 10 / 12 / 5 | 20 | On-spec, but FOC=5 means crits never trigger. Knight feels *boring*, not *safe*. |
| Wizard | 80 | 14 / 6 / 10 | 0 | High ceiling but no comeback button — one bad chain ends the run. |
| Rogue | 100 | 8 / 8 / 14 | 0 | Stat spread is correct; the *combo system itself* under-rewards them. |

The four actions are also doing too much identical work: every card asks "solve this, then apply a multiplier." There's no *texture* — no timing, no charge, no status, no choice mid-card. That's what we'll add.

---

## 2. Balance Adjustments (Numbers First)

### Base Action Tuning

```
Strike    : ×1.0  EASY    →  ×1.1  EASY    (slight buff — make the workhorse feel rewarding)
Guard     : ×1.2  EASY    →  ×1.0  EASY    (block is already a tempo gain; stop double-paying it)
AOE Blast : ×0.7  HARD    →  ×0.9  HARD per target, MIN 1.4 vs single target
Mend      : ×1.5  HARD    →  ×1.3  HARD, capped at 40% missing HP per cast
```

Rationale: the `MIN` floor on AOE Blast removes the trap. The Mend cap stops sustain spirals on early floors but still saves you in a boss fight (where 40% of missing is a *huge* swing). Guard returning to ×1.0 frees design space for the new mechanic in §4.

### Class HP / Stat Re-tune

Knight FOC=5 means the Knight literally cannot interact with the crit system. That's the single biggest balance bug.

```
Knight  : HP 120 → 110, stats 10/12/8   (FOC up so crits exist; HP down to make Elite routes a real choice)
Wizard  : HP  80 →  85, stats 14/6/10   (tiny HP nudge — one less coin-flip death)
Rogue   : HP 100 → 100, stats  8/9/13   (unchanged feel, FOC marginally smoother)
```

### Speed Bonus & Combo (mechanical fairness pass)

The current `<3s = ×1.5` speed bonus is brutal for a 7-year-old still finger-counting `8 × 7`. Two adjustments:

- **Speed Bonus tiers** instead of a binary cliff: under 2s = ×1.5, under 4s = ×1.25, under 6s = ×1.1, otherwise ×1.0. Reads as a *gradient of mastery*, not a pass/fail gate. (Mario Kart drift boost model — blue → orange → purple.)
- **Combo grace**: at combo ≥ 5, a single miss drops you to combo/2 instead of zero. Combo ≥ 10, you get one full miss-shield per battle. This is the "Hades Death Defiance" pattern — the safety net only matters once you've earned it.

---

## 3. Flavor & Descriptions Refresh

The current names (Strike / Guard / AOE Blast / Mend) are functional but flat. Children remember **Hyper Beam**, not **Damaging Move**. Two-line cards: a punchy verb-noun name, a flavor line, then the rule.

### Strike → **Spark Slash**
> *A bright, clean cut. Your most reliable swing.*
> Solve an EASY problem. Deal STR × 1.1 damage. Correct in under 2s grants +1 Combo.

### Guard → **Bulwark**
> *Plant your feet. Take the hit and grin.*
> Solve an EASY problem. Gain VIT × 1.0 Block. If solved with 4+ seconds remaining, gain 2 extra Block (the "patient stance" bonus).

### AOE Blast → **Starshot**
> *Pick a hard answer, paint the room with light.*
> Solve a HARD problem. Deal STR × 0.9 to ALL enemies, minimum STR × 1.4 to any single target.

### Mend → **Mend-Song**
> *A small song that knits you back together.*
> Solve a HARD problem. Heal STR × 1.3, capped at 40% of missing HP.

The voice matters: *Spark Slash*, *Bulwark*, *Starshot*, *Mend-Song* sound like attacks a child would name. They each pair a noun (an object you can picture) with a verb-feel. Compare *Strike* — what does Strike *look* like? Nothing in particular. *Spark Slash* you can draw.

---

## 4. New Fun Mechanics (the heart of this pass)

### 4.1 Action Commands — "The Tap"

**Inspired by:** Mario & Luigi: Superstar Saga, Paper Mario, Cuphead parry.

The moment a player picks the correct answer, a half-second window opens with a glowing prompt: **TAP!**. Hitting Spacebar (or any key) inside the window triggers a **Perfect** — a small extra effect attached to the card.

```
Spark Slash  Perfect : +1 Combo, screen-pops a "PERFECT!" stamp
Bulwark      Perfect : +3 Block AND 1 Thorns (1 dmg back next hit)
Starshot     Perfect : sparks splash to a second target for 50%
Mend-Song    Perfect : the heal also clears 1 debuff
```

This is the single biggest *feel* upgrade in the audit. It turns every correct answer into a two-beat moment — *think → tap* — which is the same dopamine pattern as a Pokémon attack animation followed by "It's super effective!". Failing the tap costs *nothing* (the card resolves normally), so it's pure upside for engaged players. Kids who don't notice it for the first three runs will discover it organically and feel like they unlocked a secret.

### 4.2 Status Effects — Friendly Names

**Inspired by:** Pokémon (sleep / paralyze), Slay the Spire (vulnerable / weak), but renamed for kids.

Five statuses, all visually distinct, all describable in one sentence:

```
Sparkled   - target takes +50% damage from your next hit (Slay's Vulnerable)
Soaked     - target deals -25% damage on its next attack (Slay's Weak)
Stuck      - target skips its next turn (Pokémon Paralyze, but cleaner)
Glowing    - YOU heal 2 HP each time you answer correctly while glowing
Shielded   - YOU absorb 1 hit fully (think Mario's cape)
```

Each status lasts 2 turns, has a color (yellow / blue / purple / green / gold), and a wiggly icon over the affected unit. The names are verbs-as-adjectives — children parse "the goblin is *Sparkled*" instantly. *Vulnerable* is a five-syllable Latin word.

### 4.3 The Super Meter — "Star Charge"

**Inspired by:** Brawl Stars Super, Kirby Star Allies, Mega Man X charge.

A new top-bar resource. Every correct answer fills 10%. Every Perfect tap fills 20%. At 100%, the player can press **G** to spend the meter on their **Legend Super** — a class-defining once-or-twice-per-fight ultimate (see §5).

This solves three problems at once:
- Gives Knight a damage payoff that doesn't depend on FOCUS.
- Gives Wizard a comeback button when the run goes sideways.
- Gives Rogue a reason to push speed even when the current enemy is almost dead.

### 4.4 "Math Moods" — Themed Problem Skins

**Inspired by:** Prodigy Math's elemental wizards, Pokémon types.

Same arithmetic, different costume. Every floor is one of four moods: Forest (green), Ocean (blue), Volcano (red), Storm (purple). The numbers are reskinned in flavor only:

- Forest floor: `8 acorns + 7 acorns = ?`
- Ocean floor: `12 fish ÷ 4 nets = ?`
- Volcano floor: `9 × 6 cinders = ?`

The *math* is identical to the current engine. The *fiction* changes. This is essentially zero engineering cost (a string template per operator per mood) for a massive replayability lift — kids will run a Volcano build because they want to see the lava prompts, not because the math is different.

### 4.5 Card Charge — "Wind-Up"

**Inspired by:** Zelda spin attack, Mega Man X-Buster, Hades cast charge.

Holding the action key (instead of tapping) for 1 second before answer-selection turns the card into its **Charged** version, at the cost of one extra second on the timer. Charged cards trade time for a payoff — a classic risk/reward kids learn instantly:

```
Charged Spark Slash : 2 hits at ×0.7 each (great into Sparkled targets)
Charged Bulwark     : Block + 1 Combo regardless of speed
Charged Starshot    : single target, ×2.0 damage (your "panic burst" option)
Charged Mend-Song   : also grants Glowing for 2 turns
```

### 4.6 Pity & Praise — Misses That Don't Crush

**Inspired by:** Celeste's death-and-retry rhythm, Hollow Knight's gentle bench checkpoints.

Currently: a wrong answer or timeout breaks combo and resolves with full enemy damage. For kids, that's two punishments stacked on a math mistake — the fastest way to get "I'm bad at math" tears.

Proposed: a wrong answer **still resolves the card at 50% effect** (the Strike still hits, just softer) and the popup says "Close one!" in friendly text. Combo still breaks, but the kid sees their effort *did something*. The miss-shield from §2 layers on top of this.

This is the most important child-experience change in the entire document. Every successful kids' learning game (Prodigy, DragonBox, Zombies Run for Kids) treats misses as soft.

---

## 5. Legend Supers (Star Charge spend)

Each class gets one signature ultimate that costs 100 Star Charge. These are the "I want to play Knight specifically because" moments.

### Knight — **Iron Vow**
> *Plant the flag. Nothing gets past you.*
> Gain 30 Block immediately, +2 Block per correct answer for the rest of the battle. Once per battle.

The Knight super is an *engine*, not a burst. It rewards staying in the fight, which is the Knight's whole fantasy.

### Wizard — **Equation Storm**
> *Three problems. Three answers. The room ends.*
> Solve a chain of three HARD problems back-to-back. Each correct answer deals STR × 1.5 to all enemies. Wrong answers do nothing (no penalty).

This is the "burst caster" fantasy in one card. It's also a flow-state moment — three problems in maybe 6 seconds. Kids who land all three feel like *wizards*.

### Rogue — **Cipher Step**
> *The world slows. Every answer counts twice.*
> For the next 5 seconds, every correct answer deals STR × 0.6 immediately AND adds +2 Combo. No card selection needed — just keep answering.

This is the Rogue's flow-state distilled. Five seconds of pure tap-tap-tap-tap. Pull it off and you've sometimes just won the fight in one button.

---

## 6. Suggested Pool Expansion (Post-V1)

Once the four base cards plus Charged variants plus Supers ship, the natural next layer is **Trinkets** (passives) found in treasure rooms. A short starter list, all one-line readable:

```
Counter Charm     : every 5th correct answer = automatic Perfect tap
Number Magnet     : answer pills slide closer when the timer hits 3s
Lucky Calculator  : 10% chance per battle that the first problem is "free" (auto-correct)
Echo Stone        : the LAST card you played gets +20% effect
Bouncer's Knot    : enemies always attack the lowest-HP target (synergy with Knight)
Sparkler          : Sparkled status lasts 1 extra turn
Twin Quill        : Spark Slash always hits twice for 60% each
Patience Sigil    : if the timer hits 0 with no answer, gain 2 Block instead of taking damage
```

These are designed to *enable a fantasy*, not stack flat numbers — Bouncer's Knot is a Knight build piece, Twin Quill is a Rogue piece, Sparkler is a status-stacking build seed.

---

## 7. Kid-Tested Polish Notes

A few small, cheap polishes that pay disproportionate dividends with the under-12 audience:

- **Big numbers above heads.** When damage lands, fly the number up in a giant comic font with a slight wobble. Slay the Spire does this; so does every Pokémon game ever. The number IS the reward.
- **Sound on every correct answer.** A bright "ding" is a Skinner-box reinforcement, but in the good way. Different ding for Perfect tap.
- **No red.** Already mostly true (Rose-500 only on enemies/damage). Keep it that way — red on the kid's own UI reads as "you're failing" even when it isn't.
- **Defeat screen says "One more!"** Not "Game Over." A Mario Maker / Celeste lesson: the framing of the loss is most of the loss.
- **Mood music shifts on combo ≥ 8.** A subtle filter sweeps open. Kids notice this in their bones before they notice it consciously. Combo becomes audible.
- **Avatar reacts.** Knight crosses their arms when blocking. Wizard's hat sparks when charging. Rogue's eyes glow on Combo ≥ 10. One frame of art each. Worth ten frames of UI text.

---

## 8. Implementation Pointers

The changes above touch four files in the prototype reference:

- `prototype_v12_reference.jsx:28-58` — AVATARS array (HP/stat retunes, §2)
- `prototype_v12_reference.jsx:61-66` — INITIAL_ACTIONS array (multiplier retunes + new flavor copy, §2 + §3)
- New module `actionCommands.js` — Tap window detection (§4.1), Charge hold detection (§4.5)
- New module `statusEffects.js` — Sparkled / Soaked / Stuck / Glowing / Shielded (§4.2)
- New module `starCharge.js` — Super meter + three Legend Supers (§4.3, §5)
- `generateProblem` (`prototype_v12_reference.jsx:93`) — accepts a `mood` param for themed prompts (§4.4)

The pity-and-praise softening from §4.6 is a 4-line change in `resolveTurn` — apply 50% effect on wrong-answer branch, swap the feedback string. Cheapest big-impact change in this document.

---

## 9. Closing Thought

The current prototype is doing the hardest thing right: **math is the trigger, not the test.** Everything in this audit is layered *on top* of that core. Action Commands, Star Charge, Status, Charged variants, friendly Supers, soft misses — none of them replace the math loop. They give the math loop more *moves*, more *moments*, more *ways for a kid to feel cool* while doing third-grade arithmetic.

Slay the Spire's lesson is: depth comes from how cards talk to each other, not from how many cards exist. Four base actions, plus Tap, plus Charge, plus Status, plus Super = a combinatorial space already richer than the prototype's current 4-card flat list, with no new arithmetic complexity for the player to learn.

Ship the Tap window first. If the playtester smiles when they nail one, the rest of this doc is worth building.
