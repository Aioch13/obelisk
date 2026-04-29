export const ACHIEVEMENT_DEFS = [
  {
    id: "first-footing",
    name: "First Footing",
    description: "Clear your first floor and bring the lesson home.",
    hint: "Return from the frontier with proof of progress.",
    condition: { type: "bestRunFloor", value: 1 },
  },
  {
    id: "gate-crasher",
    name: "Gate Crasher",
    description: "Reach Floor 10 and shake the first gate.",
    hint: "Push deep enough to find the first act boss.",
    condition: { type: "bestRunFloor", value: 9 },
  },
  {
    id: "deep-scholar",
    name: "Deep Scholar",
    description: "Reach Floor 20 and survive into the late expedition.",
    hint: "Keep climbing until the frontier turns hostile.",
    condition: { type: "bestRunFloor", value: 19 },
  },
  {
    id: "crownbound",
    name: "Crownbound",
    description: "Clear all 30 floors in a single expedition.",
    hint: "There is a crown above the four roads.",
    condition: { type: "totalWins", value: 1 },
  },
  {
    id: "relic-bearer",
    name: "Relic Bearer",
    description: "Return from a run while carrying at least 4 relics.",
    hint: "Bring a heavier kit home from the climb.",
    condition: { type: "runRelics", value: 4 },
  },
  {
    id: "ashen-gate-open",
    name: "Ashen Gate Open",
    description: "Unlock the first portal upgrade at the base.",
    hint: "Stabilize the second route.",
    condition: { type: "buildingTier", buildingId: "portalArray", value: 1 },
  },
  {
    id: "records-unsealed",
    name: "Records Unsealed",
    description: "Upgrade the Archive once.",
    hint: "The outpost keeps stranger stories in reserve.",
    condition: { type: "buildingTier", buildingId: "archive", value: 1 },
  },
  {
    id: "field-forged",
    name: "Field Forged",
    description: "Upgrade the Relic Forge once.",
    hint: "Open the forge and new charms will enter the pool.",
    condition: { type: "buildingTier", buildingId: "relicForge", value: 1 },
  },

  // ── Per-legend mastery (3) ─────────────────────────────────────────────
  {
    id: "knight-ascendant",
    name: "Knight Ascendant",
    description: "Crown the climb wearing the Knight's colors.",
    hint: "Take the iron line all the way to floor 30.",
    condition: { type: "runFloorWithLegend", legendId: "knight", value: 30 },
  },
  {
    id: "wizard-ascendant",
    name: "Wizard Ascendant",
    description: "Crown the climb in the Wizard's storm.",
    hint: "Burn the summit through with arcane fire.",
    condition: { type: "runFloorWithLegend", legendId: "wizard", value: 30 },
  },
  {
    id: "rogue-ascendant",
    name: "Rogue Ascendant",
    description: "Crown the climb on the Rogue's edge.",
    hint: "Slip a blade into the summit.",
    condition: { type: "runFloorWithLegend", legendId: "rogue", value: 30 },
  },

  // ── Per-spire conqueror (5) ────────────────────────────────────────────
  {
    id: "addition-crowned",
    name: "Addition Crowned",
    description: "Carry the addition spire all the way to its final boss.",
    hint: "The straight road has its own throne.",
    condition: { type: "runFloorOnSpire", spireId: "addition", value: 30 },
  },
  {
    id: "subtraction-crowned",
    name: "Subtraction Crowned",
    description: "Carry the subtraction spire all the way to its final boss.",
    hint: "The thinning road still leads somewhere.",
    condition: { type: "runFloorOnSpire", spireId: "subtraction", value: 30 },
  },
  {
    id: "multiplication-crowned",
    name: "Multiplication Crowned",
    description: "Carry the multiplication spire all the way to its final boss.",
    hint: "Everything grows at the top.",
    condition: { type: "runFloorOnSpire", spireId: "multiplication", value: 30 },
  },
  {
    id: "division-crowned",
    name: "Division Crowned",
    description: "Carry the division spire all the way to its final boss.",
    hint: "Halve enough things and a crown is left.",
    condition: { type: "runFloorOnSpire", spireId: "division", value: 30 },
  },
  {
    id: "mixed-crowned",
    name: "Mixed Crowned",
    description: "Carry the mixed spire all the way to its final boss.",
    hint: "The braided road answers all four operators at once.",
    condition: { type: "runFloorOnSpire", spireId: "mixed", value: 30 },
  },

  // ── Floor depth gates (3) ──────────────────────────────────────────────
  {
    id: "marrow-walker",
    name: "Marrow Walker",
    description: "Reach Floor 15 and feel the second gate close behind you.",
    hint: "Halfway is its own kind of summit.",
    condition: { type: "bestRunFloor", value: 14 },
  },
  {
    id: "summit-haunt",
    name: "Summit Haunt",
    description: "Reach Floor 25 and stand within sight of the crown.",
    hint: "The third gate is loud when you're near it.",
    condition: { type: "bestRunFloor", value: 24 },
  },
  {
    id: "crown-glimmer",
    name: "Crown Glimmer",
    description: "Reach Floor 29 — one breath from the summit.",
    hint: "The last step is always the heaviest.",
    condition: { type: "bestRunFloor", value: 29 },
  },

  // ── Total wins ladder (3) ──────────────────────────────────────────────
  {
    id: "veteran-of-the-summit",
    name: "Veteran Of The Summit",
    description: "Complete 5 full expeditions.",
    hint: "Five crowns weigh a head down nicely.",
    condition: { type: "totalWins", value: 5 },
  },
  {
    id: "master-of-the-summit",
    name: "Master Of The Summit",
    description: "Complete 10 full expeditions.",
    hint: "The summit knows your name.",
    condition: { type: "totalWins", value: 10 },
  },
  {
    id: "shepherd-of-crowns",
    name: "Shepherd Of Crowns",
    description: "Complete 25 full expeditions.",
    hint: "You bring climbers home now.",
    condition: { type: "totalWins", value: 25 },
  },

  // ── Relic-collector tiers (3) ──────────────────────────────────────────
  {
    id: "relic-hoarder",
    name: "Relic Hoarder",
    description: "Return from a run while carrying at least 6 relics.",
    hint: "Let your kit get heavier than feels prudent.",
    condition: { type: "runRelics", value: 6 },
  },
  {
    id: "relic-seneschal",
    name: "Relic Seneschal",
    description: "Return from a run while carrying at least 9 relics.",
    hint: "Sometimes you have to take everything offered.",
    condition: { type: "runRelics", value: 9 },
  },
  {
    id: "relic-sovereign",
    name: "Relic Sovereign",
    description: "Return from a run while carrying at least 12 relics.",
    hint: "A library you wear on your belt.",
    condition: { type: "runRelics", value: 12 },
  },

  // ── Expedition count gates (4) ─────────────────────────────────────────
  {
    id: "decade-of-expeditions",
    name: "Decade Of Expeditions",
    description: "Begin 10 expeditions, win or lose.",
    hint: "Each setting-out counts.",
    condition: { type: "totalRuns", value: 10 },
  },
  {
    id: "quarter-century-climber",
    name: "Quarter-Century Climber",
    description: "Begin 25 expeditions, win or lose.",
    hint: "The road wears your boot-tread now.",
    condition: { type: "totalRuns", value: 25 },
  },
  {
    id: "half-hundred-walker",
    name: "Half-Hundred Walker",
    description: "Begin 50 expeditions, win or lose.",
    hint: "Most climbers never reach the half-hundred.",
    condition: { type: "totalRuns", value: 50 },
  },
  {
    id: "century-of-roads",
    name: "Century Of Roads",
    description: "Begin 100 expeditions, win or lose.",
    hint: "A hundred sunsets watching the spires.",
    condition: { type: "totalRuns", value: 100 },
  },

  // ── Mastery moments (2) ────────────────────────────────────────────────
  {
    id: "gold-hoarder",
    name: "Gold Hoarder",
    description: "End a run with 500 or more gold in pocket.",
    hint: "Spending it is for other climbers.",
    condition: { type: "runGold", value: 500 },
  },
  {
    id: "combo-monk",
    name: "Combo Monk",
    description: "Reach a 25-stack combo in a single battle.",
    hint: "Twenty-five right answers in a row, no flinch.",
    condition: { type: "runBestCombo", value: 25 },
  },

  // ── Outpost mastery (2) ────────────────────────────────────────────────
  {
    id: "boss-hunt-orders",
    name: "Boss-Hunt Orders",
    description: "Bring the War Room to its full mastery.",
    hint: "The hunt marks need a second blessing.",
    condition: { type: "buildingTier", buildingId: "warRoom", value: 2 },
  },
  {
    id: "mythic-engine-lit",
    name: "Mythic Engine Lit",
    description: "Bring the Relic Forge to its full mastery.",
    hint: "The deeper furnaces want their second fire.",
    condition: { type: "buildingTier", buildingId: "relicForge", value: 2 },
  },
];

export const UNLOCK_CATEGORY_LABELS = {
  spires: "route",
  relics: "relic",
  events: "record",
  monsters: "monster",
  elites: "elite",
  bosses: "boss",
};

/**
 * Read-only helper that returns true when a given achievement condition is
 * satisfied by the supplied profile + optional run snapshot.
 */
export function isAchievementUnlocked(definition, profile, run = null) {
  if (!definition?.condition) return false;
  const condition = definition.condition;
  switch (condition.type) {
    case "bestRunFloor":
      return Number(profile?.bestRunFloor || 0) >= Number(condition.value || 0);
    case "totalWins":
      return Number(profile?.totalWins || 0) >= Number(condition.value || 0);
    case "totalRuns":
      return Number(profile?.totalRuns || 0) >= Number(condition.value || 0);
    case "buildingTier": {
      const tier = Number(profile?.base?.buildings?.[condition.buildingId] || 0);
      return tier >= Number(condition.value || 0);
    }
    case "runRelics": {
      const count = Number(run?.player?.relics?.length || 0);
      return count >= Number(condition.value || 0);
    }
    case "runGold": {
      const gold = Number(run?.player?.gold || 0);
      return gold >= Number(condition.value || 0);
    }
    case "runBestCombo": {
      const best = Number(run?.player?.bestCombo || 0);
      return best >= Number(condition.value || 0);
    }
    case "runFloorWithLegend": {
      if (!run?.player) return false;
      if (run.player.legendId !== condition.legendId) return false;
      return Number(run.player.floor || 0) >= Number(condition.value || 0);
    }
    case "runFloorOnSpire": {
      if (!run) return false;
      if (run.spireId !== condition.spireId) return false;
      return Number(run?.player?.floor || 0) >= Number(condition.value || 0);
    }
    default:
      return false;
  }
}

/**
 * Pure evaluator: returns the IDs of every achievement currently satisfied.
 * Always preserves IDs already present in `profile.achievements.unlocked`.
 */
export function evaluateAchievementIds(profile, run = null) {
  const earned = new Set(profile?.achievements?.unlocked || []);
  ACHIEVEMENT_DEFS.forEach((definition) => {
    if (isAchievementUnlocked(definition, profile, run)) {
      earned.add(definition.id);
    }
  });
  return ACHIEVEMENT_DEFS
    .map((definition) => definition.id)
    .filter((id) => earned.has(id));
}

/**
 * Evaluates achievements against the profile and optional run snapshot.
 * Returns a new `achievements` block plus the list of newly earned IDs.
 */
export function evaluateAchievements(profile, run = null) {
  const previouslyUnlocked = new Set(profile?.achievements?.unlocked || []);
  const unlocked = evaluateAchievementIds(profile, run);
  const newlyEarned = unlocked.filter((id) => !previouslyUnlocked.has(id));
  return {
    achievements: {
      unlocked,
      reveal: newlyEarned.length
        ? { ids: newlyEarned }
        : profile?.achievements?.reveal || null,
    },
    newlyEarned,
  };
}

export function getAchievementById(id) {
  return ACHIEVEMENT_DEFS.find((definition) => definition.id === id) || null;
}
