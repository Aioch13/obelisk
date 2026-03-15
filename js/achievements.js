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
];

export const UNLOCK_CATEGORY_LABELS = {
  spires: "route",
  relics: "relic",
  events: "record",
  monsters: "monster",
  elites: "elite",
  bosses: "boss",
};
