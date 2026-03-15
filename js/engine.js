import {
  ACT_COUNT,
  ACT_LENGTH,
  ACT_TIME_LIMITS,
  ACTION_EVOLUTIONS,
  BASE_BUILDING_LABELS,
  BASE_BUILDING_ORDER,
  BASE_ENERGY_PER_TURN,
  BASE_UNLOCKS,
  BASE_ACTIONS,
  BASE_ULTIMATE_CHARGE_REQUIRED,
  ENEMY_ARCHETYPES,
  EVENT_TEMPLATES,
  FLOOR_RULES,
  HERBS,
  LEGENDS,
  MATERIALS,
  MAP_HEIGHT,
  MINIGAME_TEMPLATES,
  NODE_TYPES,
  POTIONS,
  QUICK_WINDOW_MS,
  RELICS,
  REST_TRAINING_FALLBACKS,
  SCREEN,
  SKILL_TREES,
  SHOP_TEMPLATE,
  SPIRES,
  TRAINING_REWARDS,
  ULTIMATES,
} from "./data.js";

const MAX_COMBO = 12;
const MAX_COMBO_ROGUE = 24;

function getComboMax(player) {
  return player?.legendId === "rogue" ? MAX_COMBO_ROGUE : MAX_COMBO;
}

export function clone(value) {
  return structuredClone(value);
}

export function getLegend(id) {
  return LEGENDS.find((legend) => legend.id === id) || LEGENDS[0];
}

export function getSpire(id) {
  return SPIRES.find((spire) => spire.id === id) || SPIRES[SPIRES.length - 1];
}

export function getRelicById(id) {
  return RELICS.find((relic) => relic.id === id) || null;
}

export function getUltimateConfig(legendId) {
  return ULTIMATES[legendId] || ULTIMATES.knight;
}

export function getLegendTechniquePool(legendId) {
  return ACTION_EVOLUTIONS[legendId] || [];
}

export function getSkillTreeConfig(legendId) {
  return SKILL_TREES[legendId] || SKILL_TREES.knight;
}

function getTechniqueTier(technique) {
  return Math.max(1, Number(technique?.tier || technique?.order || 1));
}

function getTechniqueById(techniqueId) {
  return Object.values(ACTION_EVOLUTIONS)
    .flat()
    .find((technique) => technique.id === techniqueId) || null;
}

function getSkillNodeById(legendId, nodeId) {
  return getSkillTreeConfig(legendId).nodes.find((node) => node.id === nodeId) || null;
}

function getTechniqueActionId(techniqueId) {
  return getTechniqueById(techniqueId)?.actionId || null;
}

function getSkillNodeTechniqueActionId(node) {
  return getTechniqueActionId(node?.effect?.techniqueId);
}

function hasConflictingOwnedTechniqueNode(player, node) {
  const targetActionId = getSkillNodeTechniqueActionId(node);
  if (!targetActionId) return false;
  return (player.skillNodesUnlocked || []).some((ownedNodeId) => {
    const ownedNode = getSkillNodeById(player.legendId, ownedNodeId);
    if (!ownedNode || ownedNode.id === node.id) return false;
    return getSkillNodeTechniqueActionId(ownedNode) === targetActionId;
  });
}

function getSkillNodeStatus(player, node) {
  const owned = (player.skillNodesUnlocked || []).includes(node.id);
  if (owned) return "owned";
  const requires = node.requires || [];
  const ready = requires.every((nodeId) => (player.skillNodesUnlocked || []).includes(nodeId));
  if (!ready) return "locked";
  if (hasConflictingOwnedTechniqueNode(player, node)) return "locked";
  return ready ? "available" : "locked";
}

function getSkillNodeLevel(player, nodeId) {
  return (player.skillNodeLevels || {})[nodeId] || 0;
}

const SKILL_LEVEL_MULT = [0, 1, 1.2, 1.4];

function getSkillNodeEffectModifiers(node, level = 1) {
  const mult = SKILL_LEVEL_MULT[Math.max(1, Math.min(3, level))] ?? 1;
  const modifiers = {};
  Object.entries(node.effect || {}).forEach(([key, value]) => {
    if (key === "techniqueId") return;
    if (typeof value === "number") {
      modifiers[key] = Math.round(value * mult * 100) / 100;
    } else {
      modifiers[key] = value;
    }
  });
  return modifiers;
}

function applyTechniquePatch(action, technique) {
  if (!technique || action.id !== technique.actionId) return action;
  const baseValue = technique.patch.baseValue ?? technique.patch.value ?? action.baseValue ?? action.value;
  return {
    ...action,
    ...clone(technique.patch),
    id: action.id,
    hotkey: action.hotkey,
    energyCost: technique.patch.energyCost ?? action.energyCost,
    baseValue,
    value: Number((baseValue + (0.08 * ((action.level || 1) - 1))).toFixed(2)),
    evolutionId: technique.id,
    baseActionId: action.baseActionId || action.id,
  };
}

function rebuildPlayerActions(player) {
  const baseActions = BASE_ACTIONS.map((baseAction) => {
    const existing = player.actions?.find((action) => action.id === baseAction.id);
    return {
      ...baseAction,
      ...existing,
      id: baseAction.id,
      hotkey: baseAction.hotkey,
      baseValue: existing?.baseValue ?? baseAction.baseValue ?? baseAction.value,
      baseActionId: baseAction.id,
      evolutionId: null,
    };
  });
  return (player.techniquesUnlocked || []).reduce((actions, techniqueId) => {
    const technique = getTechniqueById(techniqueId);
    if (!technique || technique.legendId && technique.legendId !== player.legendId) return actions;
    return actions.map((action) => applyTechniquePatch(action, technique));
  }, baseActions);
}

function buildTechniqueTrainingReward(technique) {
  return {
    id: `technique-${technique.id}`,
    kind: "TECHNIQUE",
    techniqueId: technique.id,
    label: `Learn ${technique.unlockTitle}`,
    description: technique.unlockDescription,
  };
}

function getNextTechniqueStage(player) {
  const unlocked = new Set(player.techniquesUnlocked || []);
  const pool = getLegendTechniquePool(player.legendId);
  const tiers = [...new Set(pool.map((technique) => getTechniqueTier(technique)))].sort((left, right) => left - right);

  for (const tier of tiers) {
    const tierChoices = pool.filter((technique) => getTechniqueTier(technique) === tier);
    if (tierChoices.some((technique) => unlocked.has(technique.id))) {
      continue;
    }
    if (tierChoices.length) {
      return {
        tier,
        choices: tierChoices,
      };
    }
  }

  return null;
}

export function getNextTechniqueUnlock(player) {
  return getNextTechniqueStage(player)?.choices?.[0] || null;
}

export function getSkillTreeState(player) {
  const tree = getSkillTreeConfig(player.legendId);
  return {
    title: tree.title,
    points: Math.max(0, Number(player.skillPoints || 0)),
    ownedCount: (player.skillNodesUnlocked || []).length,
    laneOrder: tree.laneOrder,
    lanes: tree.laneOrder.map((laneId) => {
      const lane = tree.lanes[laneId];
      const nodes = tree.nodes
        .filter((node) => node.lane === laneId)
        .sort((left, right) => left.tier - right.tier)
        .map((node) => {
          const level = getSkillNodeLevel(player, node.id);
          const maxLevel = node.maxLevel || 1;
          const owned = (player.skillNodesUnlocked || []).includes(node.id);
          return {
            ...node,
            status: getSkillNodeStatus(player, node),
            level,
            maxLevel,
            isUpgradeable: owned && level < maxLevel,
          };
        });
      return {
        ...lane,
        nodes,
      };
    }),
    availableNodes: tree.nodes
      .filter((node) => getSkillNodeStatus(player, node) === "available")
      .map((node) => node.id),
  };
}

export function getNextRestTraining(player) {
  if (!player.ultimateUnlocked) {
    const ultimate = getUltimateConfig(player.legendId);
    return {
      kind: "ULTIMATE",
      title: `Awaken ${ultimate.name}`,
      description: `Train at the forge-rest to unlock ${ultimate.name} for future battles.`,
      iconLabel: "ULT",
    };
  }
  const tree = getSkillTreeConfig(player.legendId);
  const points = Math.max(0, Number(player.skillPoints || 0));
  return {
    kind: "SKILL_TREE",
    title: points > 0 ? "Deepen Your Discipline" : "Claim A Talent Point",
    description: points > 0
      ? `Gain 1 skill point, then shape your ${tree.title.toLowerCase()} before the climb continues.`
      : `Gain 1 skill point and open the ${tree.title.toLowerCase()} for this run.`,
    iconLabel: "TREE",
  };
}

function createEmptyMaterialStock() {
  return Object.keys(MATERIALS).reduce((result, materialId) => {
    result[materialId] = 0;
    return result;
  }, {});
}

function createEmptyHerbStock() {
  return Object.keys(HERBS).reduce((result, herbId) => {
    result[herbId] = 0;
    return result;
  }, {});
}

function normalizeHerbStock(stock = {}) {
  const next = createEmptyHerbStock();
  Object.keys(HERBS).forEach((herbId) => {
    next[herbId] = Math.max(0, Number(stock?.[herbId] || 0));
  });
  return next;
}

function addHerbStock(baseStock = {}, delta = {}) {
  const next = normalizeHerbStock(baseStock);
  Object.keys(HERBS).forEach((herbId) => {
    next[herbId] += Math.max(0, Number(delta?.[herbId] || 0));
  });
  return next;
}

function createEmptyPotionStock() {
  return Object.keys(POTIONS).reduce((result, potionId) => {
    result[potionId] = 0;
    return result;
  }, {});
}

function normalizePotionStock(stock = {}) {
  const next = createEmptyPotionStock();
  Object.keys(POTIONS).forEach((potionId) => {
    next[potionId] = Math.max(0, Math.min(3, Number(stock?.[potionId] || 0)));
  });
  return next;
}

function createEmptyRunStats() {
  return {
    monstersKilled: 0,
    battlesCleared: 0,
    elitesCleared: 0,
    bossesCleared: 0,
    totalTurns: 0,
    totalHits: 0,
    totalCrits: 0,
    damageDone: 0,
  };
}

function normalizeRunStats(stats = {}) {
  const next = createEmptyRunStats();
  Object.keys(next).forEach((key) => {
    next[key] = Math.max(0, Number(stats?.[key] || 0));
  });
  return next;
}

function addBattleToRunStats(runStats = {}, battle = null) {
  const next = normalizeRunStats(runStats);
  if (!battle) return next;
  next.monstersKilled += Math.max(0, Number(battle.enemyCountStarted || battle.enemies?.length || 0));
  next.battlesCleared += 1;
  if (battle.nodeType === NODE_TYPES.ELITE) next.elitesCleared += 1;
  if (battle.nodeType === NODE_TYPES.BOSS) next.bossesCleared += 1;
  next.totalTurns += Math.max(0, Number(battle.battleStats?.turns || 0));
  next.totalHits += Math.max(0, Number(battle.battleStats?.hits || 0));
  next.totalCrits += Math.max(0, Number(battle.battleStats?.crits || 0));
  next.damageDone += Math.max(0, Number(battle.battleStats?.damageDone || 0));
  return next;
}

function getRunAccuracyPct(runStats = {}) {
  const turns = Math.max(1, Number(runStats?.totalTurns || 0));
  return Math.round((Math.max(0, Number(runStats?.totalHits || 0)) / turns) * 100);
}

function getRunReportStars(report) {
  let stars = 1;
  if (report.accuracy >= 85) stars += 1;
  if (report.elapsedMs <= (26 * 60 * 1000)) stars += 1;
  return Math.max(1, Math.min(3, stars));
}

function buildRunReportFromState(run, player, runStats) {
  const accuracy = getRunAccuracyPct(runStats);
  const report = {
    elapsedMs: Math.max(0, Number(run?.elapsedMs || 0)),
    accuracy,
    monstersKilled: Math.max(0, Number(runStats.monstersKilled || 0)),
    battlesCleared: Math.max(0, Number(runStats.battlesCleared || 0)),
    elitesCleared: Math.max(0, Number(runStats.elitesCleared || 0)),
    bossesCleared: Math.max(0, Number(runStats.bossesCleared || 0)),
    totalTurns: Math.max(0, Number(runStats.totalTurns || 0)),
    totalHits: Math.max(0, Number(runStats.totalHits || 0)),
    totalCrits: Math.max(0, Number(runStats.totalCrits || 0)),
    damageDone: Math.max(0, Number(runStats.damageDone || 0)),
    legendId: player.legendId,
    spireId: run.spireId,
  };
  report.stars = getRunReportStars(report);
  report.starReasons = [
    "Run Cleared",
    report.accuracy >= 85 ? "85%+ Accuracy" : "Missed Precision Star",
    report.elapsedMs <= (26 * 60 * 1000) ? "Speed Star Earned" : "Speed Star Missed",
  ];
  return report;
}

function normalizeMaterialStock(materials = {}, legacy = {}) {
  const next = createEmptyMaterialStock();
  Object.keys(MATERIALS).forEach((materialId) => {
    next[materialId] = Math.max(0, Number(materials?.[materialId] || 0));
  });
  // Migrate the old shard economy into the first two named materials.
  next.emberwood += Math.max(0, Number(legacy?.coreShards || 0));
  next.thorium += Math.max(0, Number(legacy?.fracturedShards || 0));
  return next;
}

function addMaterialStock(baseStock = {}, delta = {}) {
  const next = normalizeMaterialStock(baseStock);
  Object.keys(MATERIALS).forEach((materialId) => {
    next[materialId] += Math.max(0, Number(delta?.[materialId] || 0));
  });
  return next;
}

function canAffordMaterialCost(stock = {}, cost = {}) {
  return Object.entries(cost || {}).every(([materialId, amount]) => {
    return Math.max(0, Number(stock?.[materialId] || 0)) >= Math.max(0, Number(amount || 0));
  });
}

function spendMaterialCost(stock = {}, cost = {}) {
  const next = normalizeMaterialStock(stock);
  Object.entries(cost || {}).forEach(([materialId, amount]) => {
    next[materialId] = Math.max(0, next[materialId] - Math.max(0, Number(amount || 0)));
  });
  return next;
}

function ensureBaseState(base = {}) {
  return {
    materials: normalizeMaterialStock(base.materials, base),
    buildings: BASE_BUILDING_ORDER.reduce((result, buildingId) => {
      result[buildingId] = Math.max(0, Number(base.buildings?.[buildingId] || 0));
      return result;
    }, {}),
  };
}

export function getBaseState(profile) {
  return ensureBaseState(profile?.base);
}

export function getBuildingTier(profile, buildingId) {
  return getBaseState(profile).buildings[buildingId] || 0;
}

function findRelicName(relicId) {
  return RELICS.find((relic) => relic.id === relicId)?.name || relicId;
}

function findEventName(eventId) {
  return EVENT_TEMPLATES.find((event) => event.id === eventId)?.title || eventId;
}

function findEnemyName(enemyId) {
  const enemy = [...ENEMY_ARCHETYPES.MONSTER, ...ENEMY_ARCHETYPES.ELITE, ...ENEMY_ARCHETYPES.BOSS]
    .find((entry) => entry.id === enemyId);
  return enemy?.name || enemyId;
}

function findSpireName(spireId) {
  return SPIRES.find((spire) => spire.id === spireId)?.name || spireId;
}

function findUnlockName(category, id) {
  if (category === "relics") return findRelicName(id);
  if (category === "events") return findEventName(id);
  if (category === "spires") return findSpireName(id);
  return findEnemyName(id);
}

function getUnlockCategoryLabel(category) {
  if (category === "spires") return "New Route";
  if (category === "events") return "New Omens";
  if (category === "relics") return "New Relics";
  if (category === "monsters") return "New Foes";
  if (category === "elites") return "New Wardens";
  if (category === "bosses") return "New Throne-Beasts";
  return "New Discoveries";
}

function buildUnlockReveal(buildingId, upgrade) {
  return {
    buildingId,
    buildingName: BASE_BUILDING_LABELS[buildingId]?.name || buildingId,
    title: upgrade.title,
    description: upgrade.description,
    unlockGroups: Object.entries(upgrade.unlocks || {}).map(([category, ids]) => ({
      category,
      label: getUnlockCategoryLabel(category),
      items: ids.map((id) => findUnlockName(category, id)),
    })),
  };
}

function buildUtilityReveal(payload = {}) {
  return {
    kind: payload.kind || "relic",
    source: payload.source || "event",
    title: payload.title || "Discovery Claimed",
    subtitle: payload.subtitle || "",
    continueLabel: payload.continueLabel || "Continue",
    relic: payload.relic ? clone(payload.relic) : null,
  };
}

function appendUnique(target, values = []) {
  values.forEach((value) => {
    if (!target.includes(value)) target.push(value);
  });
}

function collectUnlockedIds(profile) {
  const unlocked = {
    spires: [...(BASE_UNLOCKS.starting.spires || [])],
    relics: [...BASE_UNLOCKS.starting.relics],
    events: [...BASE_UNLOCKS.starting.events],
    monsters: [...BASE_UNLOCKS.starting.monsters],
    elites: [...BASE_UNLOCKS.starting.elites],
    bosses: [...BASE_UNLOCKS.starting.bosses],
  };
  BASE_BUILDING_ORDER.forEach((buildingId) => {
    const tier = getBuildingTier(profile, buildingId);
    BASE_UNLOCKS[buildingId].slice(0, tier).forEach((upgrade) => {
      Object.entries(upgrade.unlocks).forEach(([category, ids]) => appendUnique(unlocked[category], ids));
    });
  });
  return unlocked;
}

export function buildRunContentState(profile) {
  const unlocked = collectUnlockedIds(profile || createEmptyProfile());
  return {
    spireIds: unlocked.spires,
    relicIds: unlocked.relics,
    eventIds: unlocked.events,
    enemyIds: {
      MONSTER: unlocked.monsters,
      ELITE: unlocked.elites,
      BOSS: unlocked.bosses,
    },
  };
}

export function getUnlockedSpireIds(profile) {
  return collectUnlockedIds(profile || createEmptyProfile()).spires;
}

export function isSpireUnlocked(profile, spireId) {
  return getUnlockedSpireIds(profile).includes(spireId);
}

function getRunContentState(run, profile) {
  return run?.contentState || buildRunContentState(profile || createEmptyProfile());
}

function getRelicPoolFromIds(ids = []) {
  return RELICS.filter((relic) => ids.includes(relic.id));
}

function getEventPoolFromIds(ids = []) {
  return EVENT_TEMPLATES.filter((event) => ids.includes(event.id));
}

function getEnemyPoolFromIds(nodeType, ids = [], floor = 0) {
  const act = getActForFloor(floor);
  const source = nodeType === NODE_TYPES.BOSS
    ? ENEMY_ARCHETYPES.BOSS
    : nodeType === NODE_TYPES.ELITE
      ? ENEMY_ARCHETYPES.ELITE
      : ENEMY_ARCHETYPES.MONSTER;
  const pool = source.filter((enemy) => ids.includes(enemy.id))
    .filter((enemy) => !enemy.acts || enemy.acts.includes(act));
  if (pool.length) return pool;
  if (nodeType === NODE_TYPES.BOSS) {
    return source.filter((enemy) => enemy.id === "sentinel");
  }
  return source.slice(0, 1);
}

export function getBaseUpgradeCards(profile) {
  const base = getBaseState(profile);
  return BASE_BUILDING_ORDER.map((buildingId) => {
    const meta = BASE_BUILDING_LABELS[buildingId];
    const currentTier = base.buildings[buildingId] || 0;
    const tiers = BASE_UNLOCKS[buildingId];
    const nextUpgrade = tiers[currentTier] || null;
    const unlockedNames = tiers.slice(0, currentTier).flatMap((upgrade) => Object.entries(upgrade.unlocks)
      .flatMap(([category, ids]) => ids.map((id) => findUnlockName(category, id))));
    return {
      id: buildingId,
      name: meta.name,
      short: meta.short,
      description: meta.description,
      tier: currentTier,
      maxTier: tiers.length,
      unlockedNames,
      nextUpgrade: nextUpgrade
        ? {
            tier: nextUpgrade.tier,
            title: nextUpgrade.title,
            description: nextUpgrade.description,
            cost: clone(nextUpgrade.cost || {}),
            unlockNames: Object.entries(nextUpgrade.unlocks)
              .flatMap(([category, ids]) => ids.map((id) => findUnlockName(category, id))),
            canAfford: canAffordMaterialCost(base.materials, nextUpgrade.cost),
          }
        : null,
    };
  });
}

export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function sample(list) {
  return list[randomInt(0, list.length - 1)];
}

export function shuffle(list) {
  const next = [...list];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index);
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

export function createPlayerFromLegend(legendId) {
  const legend = getLegend(legendId);
  const maxHp = legend.hp + (legend.stats.vit * 5);
  const player = {
    legendId: legend.id,
    hp: maxHp,
    maxHp,
    block: legend.startingBlock,
    gold: 0,
    floor: 0,
    combo: 0,
    actions: clone(BASE_ACTIONS),
    level: 1,
    xp: 0,
    xpNext: 100,
    stats: clone(legend.stats),
    statPoints: 0,
    relics: [],
    bestCombo: 0,
    ultimateUnlocked: false,
    utilitySlotUnlocked: false,
    skillPoints: 0,
    skillNodesUnlocked: [],
    techniquesUnlocked: [],
    herbs: createEmptyHerbStock(),
    potions: createEmptyPotionStock(),
  };
  player.actions = rebuildPlayerActions(player);
  return player;
}

function pickFloorTypes(rule) {
  const options = [...rule.types];
  const count = rule.count;
  if (count === 1) return [sample(options)];
  const picked = shuffle(options).slice(0, Math.min(count, options.length));
  while (picked.length < count) {
    picked.push(sample(options));
  }
  const floorInAct = rule.floor % ACT_LENGTH;
  if (floorInAct === 5) picked[0] = NODE_TYPES.TREASURE;
  if (floorInAct === 8) picked[0] = NODE_TYPES.REST;
  const combatOptions = options.filter((type) => type === NODE_TYPES.MONSTER || type === NODE_TYPES.ELITE);
  if (combatOptions.length && !picked.some((type) => type === NODE_TYPES.MONSTER || type === NODE_TYPES.ELITE)) {
    const replaceIndex = picked.findIndex((type) => type !== NODE_TYPES.TREASURE && type !== NODE_TYPES.REST);
    picked[replaceIndex >= 0 ? replaceIndex : Math.max(0, picked.length - 1)] = sample(combatOptions);
  }
  return picked;
}

export function generateMap() {
  const rows = FLOOR_RULES.map((rule) => {
    const pickedTypes = pickFloorTypes(rule);
    return pickedTypes.map((type, index) => ({
      id: `f${rule.floor}-n${index}`,
      floor: rule.floor,
      index,
      type,
      parents: [],
      children: [],
    }));
  });

  for (let floor = 0; floor < rows.length - 1; floor += 1) {
    const current = rows[floor];
    const next = rows[floor + 1];
    current.forEach((node, index) => {
      const normalized = current.length === 1 ? 0 : index / (current.length - 1);
      const anchor = Math.round(normalized * (next.length - 1));
      const targets = new Set([anchor]);
      if (next.length > 1 && Math.random() > 0.48) {
        targets.add(Math.max(0, Math.min(next.length - 1, anchor + (Math.random() > 0.5 ? 1 : -1))));
      }
      [...targets].forEach((targetIndex) => {
        const child = next[targetIndex];
        node.children.push(child.id);
        child.parents.push(node.id);
      });
    });
    next.forEach((node, index) => {
      if (node.parents.length === 0) {
        const fallbackParent = current[Math.min(current.length - 1, index)];
        fallbackParent.children.push(node.id);
        node.parents.push(fallbackParent.id);
      }
    });
  }

  return rows;
}

export function getActForFloor(floor) {
  return Math.min(ACT_COUNT, Math.floor(floor / ACT_LENGTH) + 1);
}

export function getBattleTimeLimitForFloor(floor) {
  return ACT_TIME_LIMITS[getActForFloor(floor) - 1];
}

export function getBattleTimeLimit(run) {
  return getBattleTimeLimitForFloor(run?.player?.floor || 0);
}

export function createRun(legendId, spireId = "mixed", profile = createEmptyProfile()) {
  const spire = getSpire(spireId);
  return {
    player: createPlayerFromLegend(legendId),
    spireId: spire.id,
    contentState: buildRunContentState(profile),
    metaRewards: createEmptyMaterialStock(),
    elapsedMs: 0,
    runStats: createEmptyRunStats(),
    runReport: null,
    map: generateMap(),
    reachableNodeIds: ["f0-n0"],
    visitedNodeIds: [],
    chosenNodeId: null,
    battle: null,
    reward: null,
    skillTreeOpen: false,
    screen: "MAP",
    activeFloor: 0,
    eventOffer: null,
    minigameOffer: null,
    restOffer: null,
    shopOffer: null,
    treasureOffer: null,
    utilityReveal: null,
    log: [`The ${spire.name} opens.`],
  };
}

export function hydrateRunState(run, profile = createEmptyProfile()) {
  if (!run) return null;
  const next = clone(run);
  if (!next.spireId) {
    next.spireId = "mixed";
  }

  next.player.ultimateUnlocked = !!next.player.ultimateUnlocked;
  next.player.utilitySlotUnlocked = !!next.player.utilitySlotUnlocked;
  next.player.skillPoints = Math.max(0, Number(next.player.skillPoints || 0));
  next.player.skillNodesUnlocked = [...new Set(next.player.skillNodesUnlocked || [])];
  next.player.techniquesUnlocked = [...new Set(next.player.techniquesUnlocked || [])];
  next.player.herbs = normalizeHerbStock(next.player.herbs);
  next.player.potions = normalizePotionStock(next.player.potions);
  next.player.skillNodesUnlocked.forEach((nodeId) => {
    const node = getSkillNodeById(next.player.legendId, nodeId);
    const techniqueId = node?.effect?.techniqueId;
    if (techniqueId && !next.player.techniquesUnlocked.includes(techniqueId)) {
      next.player.techniquesUnlocked.push(techniqueId);
    }
  });
  next.player.actions = rebuildPlayerActions(next.player);

  const mergeAction = (action) => {
    const base = next.player.actions.find((entry) => entry.id === action?.id)
      || BASE_ACTIONS.find((entry) => entry.id === action?.id)
      || BASE_ACTIONS[0];
    return { ...base, ...action };
  };
  next.contentState = next.contentState || buildRunContentState(profile);
  next.metaRewards = normalizeMaterialStock(next.metaRewards, next.metaRewards);
  next.elapsedMs = Math.max(0, Number(next.elapsedMs || 0));
  next.runStats = normalizeRunStats(next.runStats);
  next.runReport = next.runReport || null;
  next.utilityReveal = next.utilityReveal || null;
  next.minigameOffer = next.minigameOffer || null;
  next.restOffer = next.restOffer || null;
  next.skillTreeOpen = !!next.skillTreeOpen;
  next.shopOffer = (next.shopOffer || []).filter((offer) => offer?.actionId !== "heal");
  if (next.reward?.trainingChoices) {
    next.reward.trainingChoices = next.reward.trainingChoices.filter((choice) => choice?.actionId !== "heal");
  }

  if (next.battle) {
    const relicMods = getRelicModifiers(next.player);
    const energyMax = getEnergyMax(next.player, relicMods);
    next.battle.ultimateThreshold = next.battle.ultimateThreshold ?? getUltimateThreshold(next.player, relicMods);
    next.battle.ultimateCharge = next.battle.ultimateCharge ?? 0;
    next.battle.ultimateReadyCount = next.battle.ultimateReadyCount ?? 0;
    next.battle.spellEnergyRefundUsed = !!next.battle.spellEnergyRefundUsed;
    next.battle.critEnergyRefundUsed = !!next.battle.critEnergyRefundUsed;
    next.battle.potionUsedThisTurn = !!next.battle.potionUsedThisTurn;
    next.battle.pendingVictory = !!next.battle.pendingVictory;
    next.battle.hand = (next.battle.pendingVictory
      ? []
      : (next.battle.hand?.length ? next.battle.hand : createHand(next, next.player, next.battle))
    ).map((action) => mergeAction(action));
    next.battle.energyMax = next.battle.energyMax ?? energyMax;
    next.battle.energy = Math.max(0, Math.min(next.battle.energy ?? next.battle.energyMax, next.battle.energyMax));
      next.battle.turnActionsPlayed = next.battle.turnActionsPlayed ?? 0;
      next.battle.damagePopups = next.battle.damagePopups || [];
      next.battle.effects = next.battle.effects || [];
      next.battle.feedback = next.battle.feedback || "Choose an action.";
    next.battle.turnNote = next.battle.turnNote || `${next.battle.energy}/${next.battle.energyMax} energy ready. Play until you end the turn.`;
      next.battle.playerMotion = next.battle.playerMotion || null;
      next.battle.targetEnemyId = getTargetEnemyId(next.battle.enemies || [], next.battle.targetEnemyId);
      next.battle.battleStats = next.battle.battleStats || { turns: 0, hits: 0, crits: 0, damageDone: 0 };
      next.battle.enemyCountStarted = Math.max(1, Number(next.battle.enemyCountStarted || next.battle.enemies?.length || 1));

    if (next.battle.selectedActionId) {
      const selected = next.battle.hand.find((action) => action.id === next.battle.selectedActionId);
      next.battle.selectedActionCost = next.battle.selectedActionCost ?? (selected ? getActionCost(next.player, selected, {
        relicMods,
        turnActionsPlayed: next.battle.turnActionsPlayed,
      }) : null);
    } else {
      next.battle.selectedActionCost = null;
    }
  }

  return next;
}

export function getRelicModifiers(player) {
  const mods = (player.skillNodesUnlocked || []).reduce((result, nodeId) => {
    const node = getSkillNodeById(player.legendId, nodeId);
    const level = getSkillNodeLevel(player, nodeId);
    Object.entries(getSkillNodeEffectModifiers(node || {}, level)).forEach(([key, value]) => {
      if (typeof value === "number") {
        result[key] = (result[key] || 0) + value;
      } else {
        result[key] = value;
      }
    });
    return result;
  }, {});
  return player.relics.reduce((result, relic) => {
    Object.entries(relic.apply).forEach(([key, value]) => {
      if (typeof value === "number") {
        result[key] = (result[key] || 0) + value;
      } else {
        result[key] = value;
      }
    });
    return result;
  }, mods);
}

export function getEnergyMax(player, relicMods = getRelicModifiers(player)) {
  return Math.max(1, BASE_ENERGY_PER_TURN + Math.floor(relicMods.bonusEnergyPerTurn || 0));
}

export function getUltimateThreshold(player, relicMods = getRelicModifiers(player)) {
  return Math.max(4, BASE_ULTIMATE_CHARGE_REQUIRED + Math.floor(relicMods.ultimateThresholdDelta || 0));
}

function getPotionConfig(potionId) {
  return POTIONS[potionId] || null;
}

function getPotionHealAmount(player, potion, relicMods = getRelicModifiers(player)) {
  return Math.max(0, Math.floor(player.maxHp * (potion.healPct || 0) * (1 + (relicMods.potionHealPower || 0))));
}

function canCraftPotion(player, potionId) {
  const potion = getPotionConfig(potionId);
  if (!potion) return false;
  if (Math.max(0, Number(player.potions?.[potionId] || 0)) >= 3) return false;
  return Math.max(0, Number(player.herbs?.[potion.herbId] || 0)) >= 1;
}

function rollHerbDrop(nodeType) {
  if (nodeType === NODE_TYPES.MONSTER) {
    const roll = Math.random();
    if (roll < 0.42) return { white: 1 };
    if (roll < 0.67) return { yellow: 1 };
    if (roll < 0.84) return { blue: 1 };
    return { red: 1 };
  }
  if (nodeType === NODE_TYPES.ELITE && Math.random() < 0.5) {
    return Math.random() < 0.6 ? { yellow: 1 } : { blue: 1 };
  }
  return createEmptyHerbStock();
}

function getStrengthMultiplier(strength) {
  const basePoints = Math.min(10, strength);
  const overflowPoints = Math.max(0, strength - 10);
  return 1 + (basePoints * 0.0325) + (overflowPoints * 0.0125);
}

export function getActionCost(player, action, options = {}) {
  const relicMods = options.relicMods ?? getRelicModifiers(player);
  const turnActionsPlayed = options.turnActionsPlayed ?? 0;
  const baseCost = action.energyCost ?? 1;
  const discount = turnActionsPlayed === 0 ? Math.floor(relicMods.firstActionDiscount || 0) : 0;
  return Math.max(0, baseCost - discount);
}

export function canAffordAction(player, battle, action, relicMods = getRelicModifiers(player)) {
  if (!battle || !action) return false;
  if (action.type === "ULTIMATE") {
    return (battle.ultimateReadyCount || 0) > 0;
  }
  return battle.energy >= getActionCost(player, action, {
    relicMods,
    turnActionsPlayed: battle.turnActionsPlayed || 0,
  });
}

function getBattleTurnNote(energy, energyMax, canContinue) {
  if (canContinue) {
    return `${energy}/${energyMax} energy left. Play again or press E to end turn.`;
  }
  return "No playable actions left. Press End Turn to let the enemies act.";
}

function getUltimateTurnNote(player, battle) {
  if (!player.ultimateUnlocked) {
    return "Ultimate sealed | Train at a rest site to awaken it.";
  }
  return `Ultimate ${battle.ultimateCharge}/${battle.ultimateThreshold}${battle.ultimateReadyCount ? ` | Ready x${battle.ultimateReadyCount}` : ""}`;
}

function applySpellCritRefund(nextBattle, action, outcome, popups) {
  const refundAmount = Math.max(0, Math.floor(outcome.relicMods.spellEnergyRefundOnCrit || 0));
  if (!refundAmount) return;
  if (!outcome.isCrit) return;
  if (nextBattle.spellEnergyRefundUsed) return;
  if (action.type === "ULTIMATE" || action.difficulty !== "HARD") return;

  const refunded = Math.min(refundAmount, Math.max(0, (nextBattle.energyMax || 0) - (nextBattle.energy || 0)));
  nextBattle.energy = Math.min(nextBattle.energyMax || nextBattle.energy, (nextBattle.energy || 0) + refundAmount);
  nextBattle.spellEnergyRefundUsed = true;
  if (refunded > 0) {
    popups.push({ target: "player", amount: `+${refunded}`, style: "status", lane: 2, tag: "ENERGY" });
  } else {
    popups.push({ target: "player", amount: "", style: "status", lane: 2, tag: "SURGE" });
  }
}

function applyCritEnergyRefund(nextBattle, outcome, popups) {
  const refundAmount = Math.max(0, Math.floor(outcome.relicMods.critEnergyRefund || 0));
  if (!refundAmount) return;
  if (!outcome.isCrit) return;
  if (nextBattle.critEnergyRefundUsed) return;

  const refunded = Math.min(refundAmount, Math.max(0, (nextBattle.energyMax || 0) - (nextBattle.energy || 0)));
  nextBattle.energy = Math.min(nextBattle.energyMax || nextBattle.energy, (nextBattle.energy || 0) + refundAmount);
  nextBattle.critEnergyRefundUsed = true;
  if (refunded > 0) {
    popups.push({ target: "player", amount: `+${refunded}`, style: "status", lane: 2, tag: "ECLIPSE" });
  }
}

function createBattleEffect(type, target, lane = 0, tone = "default", delay = 0) {
  return {
    id: `fx-${type}-${target}-${lane}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    target,
    lane,
    tone,
    delay,
  };
}

function getTargetLaneByEnemyId(enemies = [], enemyId = null) {
  const lane = enemies.findIndex((enemy) => enemy.id === enemyId);
  return Math.max(0, lane);
}

function buildActionEffects(action, outcome, player, battle) {
  if (!action) return [];
  const targetLane = getTargetLaneByEnemyId(battle.enemies, outcome.targetEnemyId);
  const critTone = outcome.isCrit ? "critical" : "default";

  if (!outcome.isCorrect) {
    return [createBattleEffect("misfire", "player", 0, action.type === "ULTIMATE" ? "ultimate" : "muted")];
  }

  if (action.type === "ULTIMATE") {
    if (player.legendId === "knight") {
      return [
        createBattleEffect("bash", "enemy", targetLane, critTone),
        createBattleEffect("impact", "enemy", targetLane, critTone, 70),
        createBattleEffect("guard", "player", 0, "knight", 30),
      ];
    }
    if (player.legendId === "wizard") {
      return [
        createBattleEffect("nova", "player", 0, critTone),
        ...battle.enemies.map((enemy, index) => createBattleEffect("impact", "enemy", index, critTone, 90 + (index * 35))),
      ];
    }
    return [
      createBattleEffect("flurry", "enemy", targetLane, critTone),
      createBattleEffect("impact", "enemy", targetLane, critTone, 95),
    ];
  }

  if (action.type === "ATK") {
    if ((outcome.preview.hits || 1) > 1 || action.hitTargeting === "RANDOM") {
      return Array.from({ length: outcome.preview.hits || 1 }, (_, index) => {
        const lane = action.hitTargeting === "RANDOM"
          ? index % Math.max(1, battle.enemies.length)
          : targetLane;
        return [
          createBattleEffect("slash", "enemy", lane, critTone, index * 55),
          createBattleEffect("impact", "enemy", lane, critTone, 35 + (index * 55)),
        ];
      }).flat();
    }
    return [
      createBattleEffect("slash", "enemy", targetLane, critTone),
      createBattleEffect("impact", "enemy", targetLane, critTone, 60),
    ];
  }

  if (action.type === "AOE") {
    if (action.hitTargeting === "RANDOM" && (outcome.preview.hits || 1) > 1) {
      return [
        createBattleEffect("aoe", "player", 0, critTone),
        ...Array.from({ length: outcome.preview.hits || 1 }, (_, index) => createBattleEffect("impact", "enemy", index % Math.max(1, battle.enemies.length), critTone, 75 + (index * 35))),
      ];
    }
    return [
      createBattleEffect("aoe", "player", 0, critTone),
      ...battle.enemies.map((enemy, index) => createBattleEffect("impact", "enemy", index, critTone, 90 + (index * 30))),
    ];
  }

  if (action.type === "DEF") {
    return [createBattleEffect("guard", "player", 0, "defense")];
  }

  if (action.type === "UTILITY") {
    return [createBattleEffect("heal", "player", 0, "healing")];
  }

  return [];
}

function createStatusState() {
  return {
    stun: 0,
  };
}

function applyStatus(target, statusId, amount = 1) {
  target.statuses = target.statuses || createStatusState();
  target.statuses[statusId] = Math.max(0, (target.statuses[statusId] || 0) + amount);
}

function getStatus(target, statusId) {
  return target?.statuses?.[statusId] || 0;
}

function buildUltimateAction(run, player, battle) {
  if (!player.ultimateUnlocked) return null;
  const config = getUltimateConfig(player.legendId);
  const threshold = battle?.ultimateThreshold ?? getUltimateThreshold(player);
  const charge = battle?.ultimateCharge ?? 0;
  const readyCount = battle?.ultimateReadyCount ?? 0;
  const remaining = Math.max(0, threshold - charge);
  return {
    ...config,
    energyCost: 0,
    isUltimate: true,
    readyCount,
    charge,
    chargeRequired: threshold,
    locked: readyCount <= 0,
    detail: readyCount > 0
      ? `Ready: ${config.tags.join(" | ")}`
      : `Spend ${remaining} more energy this battle.`,
  };
}

function applyUltimateCharge(battle, amount) {
  if (!amount) return battle;
  let charge = (battle.ultimateCharge || 0) + amount;
  let readyCount = battle.ultimateReadyCount || 0;
  const threshold = battle.ultimateThreshold || BASE_ULTIMATE_CHARGE_REQUIRED;
  while (charge >= threshold) {
    charge -= threshold;
    readyCount += 1;
  }
  return {
    ...battle,
    ultimateCharge: charge,
    ultimateReadyCount: readyCount,
  };
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, value));
}

function upgradeAction(action, levels = 1) {
  const baseValue = action.baseValue ?? action.value;
  action.level += levels;
  action.baseValue = baseValue;
  action.value = Number((baseValue + (0.08 * (action.level - 1))).toFixed(2));
}

function increaseStat(player, stat, amount) {
  player.stats[stat] += amount;
  if (stat === "vit") {
    const hpGain = amount * 10;
    player.maxHp += hpGain;
    player.hp += hpGain;
  }
}

function applyTechniqueToPlayer(player, techniqueId) {
  if (!techniqueId || (player.techniquesUnlocked || []).includes(techniqueId)) {
    return null;
  }
  const technique = getTechniqueById(techniqueId);
  if (!technique) return null;
  player.techniquesUnlocked = [...(player.techniquesUnlocked || []), technique.id];
  if (technique.actionId === "util") {
    player.utilitySlotUnlocked = true;
  }
  player.actions = rebuildPlayerActions(player);
  return technique;
}

function applyRestTraining(player, training = getNextRestTraining(player)) {
  if (!training) return null;
  if (training.kind === "SKILL_TREE") return null;
  if (training.kind === "ULTIMATE") {
    player.ultimateUnlocked = true;
    return {
      title: training.title,
      description: `${getUltimateConfig(player.legendId).name} is now available in battle once charged.`,
    };
  }
  if (training.kind === "TECHNIQUE") {
    const technique = applyTechniqueToPlayer(player, training.techniqueId);
    if (technique) {
      return {
        title: `Technique Learned: ${technique.unlockTitle}`,
        description: technique.unlockDescription,
      };
    }
  }
  const fallback = REST_TRAINING_FALLBACKS[player.legendId];
  if (fallback?.effect?.stats) {
    Object.entries(fallback.effect.stats).forEach(([stat, amount]) => {
      increaseStat(player, stat, amount);
    });
  }
  return {
    title: fallback.title,
    description: fallback.description,
  };
}

function grantRandomRelic(player, relicPool = RELICS) {
  const ownedIds = new Set(player.relics.map((relic) => relic.id));
  const relic = shuffle(relicPool.filter((entry) => !ownedIds.has(entry.id)))[0] || null;
  if (relic) {
    player.relics.push(relic);
  }
  return relic;
}

function grantSpecificRelic(player, relicId) {
  if (!relicId || player.relics.some((relic) => relic.id === relicId)) {
    return null;
  }
  const relic = getRelicById(relicId);
  if (relic) {
    player.relics.push(relic);
  }
  return relic;
}

function applyStructuredEffect(player, effect = {}, options = {}) {
  const notes = [];
  const gainedRelics = [];
  const relicPool = options.relicPool || RELICS;

  if (effect.stats) {
    Object.entries(effect.stats).forEach(([stat, amount]) => {
      increaseStat(player, stat, amount);
      notes.push(`+${amount} ${stat.toUpperCase()}`);
    });
  }

  if (effect.maxHp) {
    player.maxHp += effect.maxHp;
    player.hp += effect.maxHp;
    notes.push(`+${effect.maxHp} max HP`);
  }

  if (effect.heal) {
    player.hp = Math.min(player.maxHp, player.hp + effect.heal);
    notes.push(`heal ${effect.heal}`);
  }

  if (effect.healPct) {
    const healAmount = Math.floor(player.maxHp * effect.healPct);
    player.hp = Math.min(player.maxHp, player.hp + healAmount);
    notes.push(`heal ${healAmount}`);
  }

  if (effect.loseHpPct) {
    const hpLoss = Math.max(1, Math.floor(player.maxHp * effect.loseHpPct));
    player.hp = Math.max(1, player.hp - hpLoss);
    notes.push(`lose ${hpLoss} HP`);
  }

  if (effect.gold) {
    player.gold += effect.gold;
    notes.push(`+${effect.gold} gold`);
  }

  if (effect.loseGold) {
    const goldLoss = Math.min(player.gold, effect.loseGold);
    player.gold -= goldLoss;
    notes.push(`lose ${goldLoss} gold`);
  }

  if (effect.herbs) {
    player.herbs = addHerbStock(player.herbs, effect.herbs);
    Object.entries(effect.herbs).forEach(([herbId, amount]) => {
      if (amount > 0) notes.push(`+${amount} ${HERBS[herbId]?.name || herbId}`);
    });
  }

  if (effect.upgradeLowestHard) {
    const hardActions = player.actions.filter((action) => action.difficulty === "HARD" && action.id !== "util");
    const target = hardActions.reduce((best, action) => (action.level < best.level ? action : best), hardActions[0] || player.actions[0]);
    if (target) {
      upgradeAction(target, effect.upgradeLowestHard);
      notes.push(`${target.name} upgraded`);
    }
  }

  if (effect.upgradeRandomActions) {
    shuffle(player.actions.filter((action) => action.id !== "util")).slice(0, effect.upgradeRandomActions).forEach((action) => {
      upgradeAction(action, 1);
      notes.push(`${action.name} upgraded`);
    });
  }

  if (effect.upgradeActionId) {
    const action = player.actions.find((entry) => entry.id === effect.upgradeActionId);
    if (action) {
      upgradeAction(action, effect.upgradeActionLevels || 1);
      notes.push(`${action.name} +${effect.upgradeActionLevels || 1} level`);
    }
  }

  if (effect.randomRelic) {
    const relic = grantRandomRelic(player, relicPool);
    if (relic) {
      notes.push(`${relic.name} gained`);
      gainedRelics.push(relic);
    }
  }

  if (effect.relicId) {
    const relic = grantSpecificRelic(player, effect.relicId);
    if (relic) {
      notes.push(`${relic.name} gained`);
      gainedRelics.push(relic);
    }
  }

  if (effect.unlockUltimate && !player.ultimateUnlocked) {
    player.ultimateUnlocked = true;
    notes.push(`${getUltimateConfig(player.legendId).name} awakened`);
  }

  if (effect.techniqueId) {
    const technique = applyTechniqueToPlayer(player, effect.techniqueId);
    if (technique) {
      notes.push(`${technique.unlockTitle} learned`);
    }
  }

  return { notes, gainedRelics };
}

function getChoiceDisabledReason(player, choice, relicPool = RELICS) {
  const effect = choice.effect || {};
  if (effect.loseGold && player.gold < effect.loseGold) {
    return `Need ${effect.loseGold} gold`;
  }
  if (effect.relicId && !relicPool.some((relic) => relic.id === effect.relicId)) {
    return "Requires Relic Forge unlock";
  }
  if (effect.relicId && player.relics.some((relic) => relic.id === effect.relicId)) {
    return "Already owned";
  }
  if (effect.randomRelic) {
    const ownedIds = new Set(player.relics.map((relic) => relic.id));
    if (relicPool.every((relic) => ownedIds.has(relic.id))) {
      return "Relic pool exhausted";
    }
  }
  return "";
}

function decorateEventChoices(player, template, relicPool = RELICS) {
  template.choices = template.choices.map((choice) => {
    const disabledReason = getChoiceDisabledReason(player, choice, relicPool);
    return {
      ...choice,
      disabled: Boolean(disabledReason),
      disabledReason,
    };
  });
  return template;
}

export function materializeTrainingReward(player, reward) {
  const verbByAction = {
    atk: "Sharpen",
    blk: "Temper",
    aoe: "Prime",
    util: "Attune",
  };
  const next = clone(reward);
  if (next.kind === "ACTION") {
    const action = player.actions.find((entry) => entry.id === next.actionId);
    const actionName = action?.name || next.label.replace(/^(Sharpen|Temper|Prime|Attune)\s+/u, "");
    next.label = `${verbByAction[next.actionId] || "Improve"} ${actionName}`;
    next.description = `Upgrade ${actionName} by 1 level.`;
  }
  return next;
}

export function buildVictoryTrainingChoices(nodeType, player) {
  const skillPointRewards = TRAINING_REWARDS.filter((reward) => reward.kind === "SKILL_POINT");
  const otherRewards = TRAINING_REWARDS
    .filter((reward) => reward.kind !== "SKILL_POINT")
    .filter((reward) => reward.kind !== "ACTION" || player.actions.some((action) => action.id === reward.actionId))
    .map((reward) => materializeTrainingReward(player, reward));
  const guaranteedSkillReward = skillPointRewards.length ? [materializeTrainingReward(player, sample(skillPointRewards))] : [];
  const pool = [...guaranteedSkillReward, ...shuffle(otherRewards)];
  const baseCount = nodeType === NODE_TYPES.BOSS ? 4 : 3;
  return pool.slice(0, baseCount);
}

export function getActionUpgradeValue(action) {
  return action.value * (1 + ((action.level - 1) * 0.14));
}

function resolveActionAmount(action, power, relicMods) {
  if (action.type === "DEF") {
    return Math.floor(power * 1.15 * (1 + (relicMods.guardPower || 0)));
  }
  if (action.type === "UTILITY") {
    const flatHeal = Math.floor(action.flatHeal || 0);
    const percentHeal = Math.floor((action.healPct || 0) * (action.ownerMaxHp || 0));
    const vitBonus = Math.floor((action.ownerVit || 0) * 0.8);
    return Math.floor((flatHeal + percentHeal + vitBonus) * (1 + (relicMods.restorationHealPower || 0))) + Math.floor(relicMods.restorationHealFlat || 0);
  }
  return Math.floor(power);
}

export function getActionPreview(player, action, options = {}) {
  const combo = Math.min(getComboMax(player), options.combo ?? player.combo);
  const elapsed = options.elapsed ?? 1000;
  const relicMods = options.relicMods ?? getRelicModifiers(player);
  const turnActionsPlayed = options.turnActionsPlayed ?? 0;
  const speedFactor = Math.max(0, 1 - (elapsed / 4000));
  const quick = elapsed <= QUICK_WINDOW_MS;
  const bonusCritChance = action.bonusCritChance || 0;
  const critChance = clampPercent((player.stats.focus * 1.5) + (speedFactor * 70) + (quick ? (relicMods.quickCritChance || 0) : 0) + bonusCritChance);
  const critMultiplier = 1.5 + (player.stats.focus * 0.05) + (relicMods.critPowerBonus || 0) + (relicMods.focusCritBoost || 0);
  const strMult = getStrengthMultiplier(player.stats.str);
  const hardBoost = action.difficulty === "HARD" ? (relicMods.hardActionPower || 0) : 0;
  const comboMult = 1 + (combo * (0.05 + (relicMods.comboPowerPerStackBonus || 0)));
  const hits = action.hits || 1;
  const hitTargeting = action.hitTargeting || (action.type === "AOE" ? "ALL" : "TARGET");
  if (action.type === "UTILITY") {
    const utilityAction = {
      ...action,
      ownerMaxHp: player.maxHp,
      ownerVit: player.stats.vit,
    };
    const normalAmount = resolveActionAmount(utilityAction, 0, relicMods);
    return {
      quick,
      critChance: 0,
      critMultiplier: 1,
      strMult,
      hardBoost,
      comboMult,
      speedFactor,
      normalAmount,
      critAmount: normalAmount,
      bonusBlockOnCorrect: relicMods.blockOnCorrect || 0,
      guardHealOnCorrect: 0,
      hits: 1,
      hitTargeting: "SELF",
      perHitNormalAmount: normalAmount,
      perHitCritAmount: normalAmount,
      secondaryBlock: action.blockGain ? Math.floor(action.blockGain + (player.stats.vit * 0.8) + (relicMods.utilityBlockBonus || 0)) : 0,
      stunTurns: 0,
      energyRestore: Math.max(0, Number(action.energyRestore || 0)),
    };
  }
  const baseValue = action.type === "ULTIMATE" ? (action.baseDamage || 1) : getActionUpgradeValue(action);
  const powerBase = action.type === "ULTIMATE" ? 18 : 15;
  const firstAttackBoost = turnActionsPlayed === 0 && (action.type === "ATK" || action.type === "AOE")
    ? (relicMods.firstAttackPower || 0)
    : 0;
  const ultimatePowerBoost = action.type === "ULTIMATE" ? (relicMods.ultimatePowerBonus || 0) : 0;
  const normalPower = baseValue * powerBase * strMult * (1 + hardBoost + firstAttackBoost + ultimatePowerBoost) * comboMult * hits;
  const critPower = normalPower * critMultiplier;
  const normalAmount = resolveActionAmount(action, normalPower, relicMods);
  const critAmount = resolveActionAmount(action, critPower, relicMods);
  return {
    quick,
    critChance,
    critMultiplier,
    strMult,
    hardBoost,
    comboMult,
    speedFactor,
    normalAmount,
    critAmount,
    bonusBlockOnCorrect: relicMods.blockOnCorrect || 0,
    guardHealOnCorrect: (action.guardHealOnCorrect || 0) + (action.type === "DEF" ? (relicMods.guardHealOnCorrect || 0) : 0),
    hits,
    hitTargeting,
    perHitNormalAmount: hits > 1 ? Math.max(1, Math.floor(normalAmount / hits)) : normalAmount,
    perHitCritAmount: hits > 1 ? Math.max(1, Math.floor(critAmount / hits)) : critAmount,
    secondaryBlock: action.blockGain ? Math.floor(action.blockGain + (player.stats.vit * 0.8)) : 0,
    stunTurns: action.stunTurns || 0,
  };
}

export function getPlayerMechanicSummary(player) {
  const relicMods = getRelicModifiers(player);
  return {
    strPowerPct: Math.round((getStrengthMultiplier(player.stats.str) - 1) * 100),
    vitGrowthHp: 10,
    focusCritChancePct: Number((player.stats.focus * 1.5).toFixed(1)),
    focusCritPowerPct: Math.round(player.stats.focus * 5),
    quickCritChancePct: 70,
    quickWindowMs: QUICK_WINDOW_MS,
    energyPerTurn: getEnergyMax(player, relicMods),
    firstActionDiscount: Math.floor(relicMods.firstActionDiscount || 0),
    ultimateThreshold: getUltimateThreshold(player, relicMods),
  };
}

function formatAmountText(action, amount) {
  if (action.type === "DEF") return `${amount} block`;
  if (action.type === "UTILITY") return `${amount} restore`;
  if (action.type === "AOE") return `${amount} AOE`;
  return `${amount} damage`;
}

export function describeActionPreview(player, action) {
  const preview = getActionPreview(player, action);
  const normal = formatAmountText(action, preview.normalAmount);
  const crit = formatAmountText(action, preview.critAmount);
  const extraBlock = preview.bonusBlockOnCorrect ? ` · +${preview.bonusBlockOnCorrect} bonus block on hit` : "";
  return {
    preview,
    label: `Est. ${normal} · Crit ${crit} · ${preview.critChance.toFixed(0)}% quick crit${extraBlock}`,
  };
}

export function describeActionPreviewClean(player, action) {
  const preview = getActionPreview(player, action);
  if (action.type === "UTILITY") {
    const notes = [];
    if (preview.secondaryBlock) notes.push(`+${preview.secondaryBlock} block`);
    if (preview.energyRestore) notes.push(`+${preview.energyRestore} energy`);
    return {
      preview,
      label: `Est. ${preview.normalAmount} restore${notes.length ? ` | ${notes.join(" | ")}` : ""}`,
    };
  }
  const normal = formatAmountText(action, preview.normalAmount);
  const crit = formatAmountText(action, preview.critAmount);
  const notes = [];
  if (preview.hits > 1) {
    notes.push(`${preview.hits} hits${preview.hitTargeting === "RANDOM" ? " random" : ""}`);
  }
  if (action.type === "ULTIMATE") {
    if (preview.stunTurns) notes.push(`stun ${preview.stunTurns} turn`);
  }
  if (preview.secondaryBlock) notes.push(`+${preview.secondaryBlock} block`);
  if (preview.bonusBlockOnCorrect) notes.push(`+${preview.bonusBlockOnCorrect} relic block`);
  if (preview.guardHealOnCorrect) notes.push(`+${preview.guardHealOnCorrect} guard heal`);
  return {
    preview,
    label: `Est. ${normal} | Crit ${crit} | ${preview.critChance.toFixed(0)}% crit${notes.length ? ` | ${notes.join(" | ")}` : ""}`,
  };
}

export function describeShopOffer(player, offer) {
  if (offer.kind === "RELIC") {
    return offer.relic.description;
  }

  if (offer.kind === "ACTION_UPGRADE") {
    const action = player.actions.find((entry) => entry.id === offer.actionId);
    if (!action) return "Upgrade a combat action.";
    const before = getActionPreview(player, action);
    const upgraded = clone(action);
    upgradeAction(upgraded, 1);
    const after = getActionPreview(player, upgraded);
    return `${action.name} L${action.level} -> L${upgraded.level} | ${formatAmountText(action, before.normalAmount)} -> ${formatAmountText(action, after.normalAmount)}`;
  }

  if (offer.kind === "STAT") {
    const beforePlayer = clone(player);
    const afterPlayer = clone(player);
    increaseStat(afterPlayer, offer.stat, 1);
    const primaryAction = beforePlayer.actions.find((entry) => entry.id === "atk");
    const nextPrimaryAction = afterPlayer.actions.find((entry) => entry.id === "atk");
    if (offer.stat === "str") {
      const before = getActionPreview(beforePlayer, primaryAction);
      const after = getActionPreview(afterPlayer, nextPrimaryAction);
      return `+1 STR | ${primaryAction?.name || "Primary attack"} ${before.normalAmount} -> ${after.normalAmount} damage`;
    }
    if (offer.stat === "focus") {
      const before = getActionPreview(beforePlayer, primaryAction);
      const after = getActionPreview(afterPlayer, nextPrimaryAction);
      return `+1 FOCUS | ${primaryAction?.name || "Primary attack"} crit ${before.critChance.toFixed(0)}% -> ${after.critChance.toFixed(0)}% | crit damage ${before.critAmount} -> ${after.critAmount}`;
    }
    if (offer.stat === "vit") {
      return `+1 VIT | +10 max HP`;
    }
  }

  if (offer.kind === "HERBS") {
    return Object.entries(offer.herbs || {})
      .filter(([, amount]) => amount > 0)
      .map(([herbId, amount]) => `+${amount} ${HERBS[herbId]?.short || herbId} Herb`)
      .join(" | ");
  }

  if (offer.kind === "REMOVE") {
    return "Steady cleanup purchase that slightly sharpens Strike.";
  }

  return "Run upgrade.";
}

function getShopOfferLabel(player, offer) {
  if (offer.kind === "ACTION_UPGRADE") {
    const action = player.actions.find((entry) => entry.id === offer.actionId);
    if (!action) return offer.label;
    const verbByAction = {
      atk: "Sharpen",
      blk: "Temper",
      aoe: "Prime",
      util: "Attune",
    };
    return `${verbByAction[offer.actionId] || "Improve"} ${action.name}`;
  }
  return offer.label || offer.relic?.name || "Run upgrade";
}

function getSpireOperators(spireId, act) {
  if (spireId === "addition") return ["+"];
  if (spireId === "subtraction") return ["-"];
  if (spireId === "multiplication") return ["*"];
  if (spireId === "division") return ["/"];
  if (act === 1) return ["+", "-"];
  if (act === 2) return ["+", "-", "*"];
  return ["+", "-", "*", "/"];
}

function buildOperandsForOperation(op, act, difficulty, legendId) {
  const hard = difficulty === "HARD";
  const wizardBias = legendId === "wizard" && hard ? 1 : 0;

  if (op === "+") {
    const low = act === 1 ? 2 : act === 2 ? 8 : 14;
    const high = act === 1 ? 12 : act === 2 ? 26 : 40;
    const spread = hard ? 6 : 0;
    return {
      left: randomInt(low + wizardBias, high + spread + wizardBias),
      right: randomInt(low, high + spread),
    };
  }

  if (op === "-") {
    const low = act === 1 ? 3 : act === 2 ? 10 : 18;
    const high = act === 1 ? 14 : act === 2 ? 28 : 42;
    const spread = hard ? 6 : 0;
    const a = randomInt(low + wizardBias, high + spread + wizardBias);
    const b = randomInt(low, high + spread);
    return { left: Math.max(a, b), right: Math.min(a, b) };
  }

  if (op === "*") {
    const rangeByAct = [
      { aMin: 2, aMax: 6, bMin: 2, bMax: 6 },
      { aMin: 3, aMax: 9, bMin: 3, bMax: 9 },
      { aMin: 4, aMax: 12, bMin: 4, bMax: 12 },
    ][act - 1];
    const bump = hard ? 2 : 0;
    return {
      left: randomInt(rangeByAct.aMin, rangeByAct.aMax + bump + wizardBias),
      right: randomInt(rangeByAct.bMin, rangeByAct.bMax + bump),
    };
  }

  const divisionByAct = [
    { divisorMin: 2, divisorMax: 5, quotientMin: 2, quotientMax: 8 },
    { divisorMin: 3, divisorMax: 8, quotientMin: 3, quotientMax: 10 },
    { divisorMin: 4, divisorMax: 10, quotientMin: 4, quotientMax: 12 },
  ][act - 1];
  const bump = hard ? 2 : 0;
  const divisor = randomInt(divisionByAct.divisorMin, divisionByAct.divisorMax + bump);
  const quotient = randomInt(divisionByAct.quotientMin, divisionByAct.quotientMax + bump + wizardBias);
  return { left: divisor * quotient, right: divisor };
}

export function generateProblem(difficulty, player, spireId = "mixed", floor = 0) {
  const act = getActForFloor(floor);
  const operators = getSpireOperators(spireId, act);
  const op = sample(operators);
  const { left, right } = buildOperandsForOperation(op, act, difficulty, player.legendId);
  const answer = op === "+" ? left + right : op === "-" ? left - right : op === "*" ? left * right : Math.floor(left / right);
  const variants = new Set([answer]);
  const offsets = shuffle([-6, -5, -4, -3, -2, 1, 2, 3, 4, 5, 6]);
  for (const offset of offsets) {
    variants.add(Math.max(1, answer + offset));
    if (variants.size >= 4) break;
  }
  let fallbackStep = 1;
  while (variants.size < 4) {
    variants.add(answer + fallbackStep);
    fallbackStep += 1;
  }
  const options = shuffle([...variants]);
  return {
    text: `${left} ${op === "*" ? "x" : op} ${right}`,
    answer,
    options,
    difficulty,
    operator: op,
    act,
    spireId,
  };
}

export function createHand(run, playerOverride = null, battleOverride = null) {
  const player = playerOverride || run.player;
  const baseHand = player.actions
    .filter((action) => !action.requiresUnlock || player[action.requiresUnlock])
    .map((action) => ({
    ...action,
    problem: generateProblem(action.difficulty, player, run.spireId, player.floor),
  }));
  const ultimateAction = buildUltimateAction(run, player, battleOverride);
  if (!ultimateAction) return baseHand;
  return [
    ...baseHand,
    {
      ...ultimateAction,
      problem: generateProblem(ultimateAction.difficulty, player, run.spireId, player.floor),
    },
  ];
}

export function createEnemies(nodeType, floor, legendId, contentState = null) {
  const isBoss = nodeType === NODE_TYPES.BOSS;
  const isElite = nodeType === NODE_TYPES.ELITE;
  let count = 1;
  if (isElite) count = 2;
  if (nodeType === NODE_TYPES.MONSTER && Math.random() > 0.62) count = 3;
  const poolIds = contentState?.enemyIds?.[nodeType] || null;
  const pool = poolIds
    ? getEnemyPoolFromIds(nodeType, poolIds, floor)
    : (isBoss ? ENEMY_ARCHETYPES.BOSS : isElite ? ENEMY_ARCHETYPES.ELITE : ENEMY_ARCHETYPES.MONSTER);
  const legend = getLegend(legendId);

  return Array.from({ length: count }, (_, index) => {
    const base = sample(pool);
    const hpScale = isBoss ? 1.8 : isElite ? 1.3 : 1;
    const hp = Math.floor((base.hp + floor * 14) * hpScale / (count > 1 && !isBoss ? 1.35 : 1));
    const damage = Math.floor(base.damage + floor * 1.45 + (legend.id === "wizard" && isBoss ? 2 : 0));
    return {
      id: `${base.id}-${index}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      name: base.name,
      icon: base.icon,
      asset: base.asset || null,
      hp,
      maxHp: hp,
      intent: { type: "ATTACK", value: damage },
      statuses: createStatusState(),
    };
  });
}

export function startBattle(run, node) {
  const player = clone(run.player);
  const legend = getLegend(player.legendId);
  player.block = legend.startingBlock || 0;
  const enemies = createEnemies(node.type, node.floor, player.legendId, run.contentState);
  const relicMods = getRelicModifiers(player);
  const energyMax = getEnergyMax(player, relicMods);
  const ultimateThreshold = getUltimateThreshold(player, relicMods);
  const battle = {
    nodeType: node.type,
    turn: 1,
    enemies: enemies.map((enemy) => ({ ...enemy, statuses: enemy.statuses || createStatusState() })),
    hand: [],
    selectedActionId: null,
    selectedActionCost: null,
    problemStartedAt: 0,
    feedback: "Choose an action.",
    turnNote: `${energyMax}/${energyMax} energy ready. ${player.ultimateUnlocked ? `Spend ${ultimateThreshold} energy to ready your ultimate.` : "Train at a rest site to awaken your ultimate."}`,
    damagePopups: [],
    effects: [],
    targetEnemyId: enemies[0]?.id || null,
    pendingEnemyPhase: false,
    pendingVictory: false,
    phaseCue: null,
    energy: energyMax,
    energyMax,
    turnActionsPlayed: 0,
    spellEnergyRefundUsed: false,
    critEnergyRefundUsed: false,
    potionUsedThisTurn: false,
    ultimateCharge: 0,
    ultimateThreshold,
    ultimateReadyCount: 0,
    playerMotion: null,
    enemyCountStarted: enemies.length,
    battleStats: { turns: 0, hits: 0, crits: 0, damageDone: 0 },
  };
  battle.hand = createHand(run, player, battle);
  return {
    ...run,
    chosenNodeId: node.id,
    screen: "BATTLE",
    battle,
    player,
    skillTreeOpen: false,
    log: [...run.log, `${node.type} node engaged in Act ${getActForFloor(node.floor)}.`],
  };
}

export function getNodeById(map, nodeId) {
  return map.flat().find((node) => node.id === nodeId) || null;
}

export function getReachableNodes(run) {
  const activeRow = run.map[run.activeFloor] || [];
  return activeRow.filter((node) => run.reachableNodeIds.includes(node.id));
}

export function chooseNode(run, nodeId) {
  const node = getNodeById(run.map, nodeId);
  if (!node) return run;
  const activeRow = run.map[run.activeFloor] || [];
  const isReachable = node.floor === run.activeFloor
    && run.reachableNodeIds.includes(node.id)
    && activeRow.some((entry) => entry.id === node.id);
  if (!isReachable) return run;
  if (node.type === NODE_TYPES.MONSTER || node.type === NODE_TYPES.ELITE || node.type === NODE_TYPES.BOSS) {
    return startBattle(run, node);
  }
  if (node.type === NODE_TYPES.EVENT) {
    return {
      ...run,
      screen: "EVENT",
      chosenNodeId: node.id,
      eventOffer: buildEventOffer(run),
      log: [...run.log, "An omen chamber opens along the climb."],
    };
  }
  if (node.type === NODE_TYPES.REST) {
    return {
      ...run,
      screen: "REST",
      chosenNodeId: node.id,
      restOffer: { healPct: 0.4 },
      log: [...run.log, "A forge-rest chamber offers a breather."],
    };
  }
  if (node.type === NODE_TYPES.TREASURE) {
    return {
      ...run,
      screen: "TREASURE",
      chosenNodeId: node.id,
      treasureOffer: buildTreasureOffer(run),
      log: [...run.log, "A relic cache hums inside the Obelisk."],
    };
  }
  if (node.type === NODE_TYPES.SHOP) {
    return {
      ...run,
      screen: "SHOP",
      chosenNodeId: node.id,
      shopOffer: buildShopOffer(run),
      log: [...run.log, "A frontier vendor signals from a side route."],
    };
  }
  return run;
}

export function buildTreasureOffer(run) {
  const player = run.player;
  const ownedIds = new Set(player.relics.map((relic) => relic.id));
  const relicPool = getRelicPoolFromIds(getRunContentState(run).relicIds);
  const relic = shuffle(relicPool.filter((entry) => !ownedIds.has(entry.id)))[0] || null;
  return {
    goldBonus: 160 + player.floor * 30,
    relic,
  };
}

export function buildEventOffer(run) {
  const player = run.player;
  const eventPool = getEventPoolFromIds(getRunContentState(run).eventIds);
  const template = clone(sample(eventPool.length ? eventPool : EVENT_TEMPLATES));
  const relicPool = getRelicPoolFromIds(getRunContentState(run).relicIds);
  if (template.id === "blood-merchant") {
    template.choices = template.choices.map((choice) => choice.id === "take-gold"
      ? {
          ...choice,
          description: `Gain ${140 + (player.floor * 12)} gold with no further risk.`,
          effect: { gold: 140 + (player.floor * 12) },
        }
      : choice);
  }
  if (template.id === "shattered-dynamo") {
    template.choices = template.choices.map((choice) => choice.id === "rupture-shell"
      ? {
          ...choice,
          description: `Gain ${170 + (player.floor * 10)} gold, but lose 10% max HP in the blast.`,
          effect: { gold: 170 + (player.floor * 10), loseHpPct: 0.1 },
        }
      : choice);
  }
  if (template.id === "sealed-vault") {
    template.choices = template.choices.map((choice) => choice.id === "take-the-coin"
      ? {
          ...choice,
          description: `Gain ${220 + (player.floor * 14)} gold, but lose 8% max HP escaping the trap.`,
          effect: { gold: 220 + (player.floor * 14), loseHpPct: 0.08 },
        }
      : choice);
  }
  return decorateEventChoices(player, template, relicPool);
}

export function buildShopOffer(run) {
  const player = run.player;
  const relicMods = getRelicModifiers(player);
  const discount = relicMods.shopDiscount || 0;
  const relicPool = getRelicPoolFromIds(getRunContentState(run).relicIds);
  const relicChoices = shuffle(relicPool.filter((relic) => !player.relics.some((owned) => owned.id === relic.id))).slice(0, 2)
    .map((relic) => ({ kind: "RELIC", relic, cost: applyDiscount(180 + player.floor * 20, discount) }));
  const utilityChoices = shuffle(SHOP_TEMPLATE).slice(0, 3)
    .map((item) => ({ ...item, cost: applyDiscount(item.baseCost + player.floor * 8, discount) }));
  return [...relicChoices, ...utilityChoices].slice(0, 5)
    .map((offer) => ({
      ...offer,
      label: getShopOfferLabel(player, offer),
      summary: describeShopOffer(player, offer),
    }));
}

function applyDiscount(cost, discount) {
  return Math.max(40, Math.floor(cost * (1 - discount)));
}

export function selectAction(run, actionId, timestamp) {
  if (!run.battle) return run;
  const action = run.battle.hand.find((entry) => entry.id === actionId);
  if (!action) return run;
  if (action.type === "ULTIMATE" && (run.battle.ultimateReadyCount || 0) <= 0) {
    const remaining = Math.max(0, (run.battle.ultimateThreshold || 0) - (run.battle.ultimateCharge || 0));
    return {
      ...run,
      battle: {
        ...run.battle,
        feedback: "ULTIMATE LOCKED",
        turnNote: `Spend ${remaining} more energy this battle to ready ${action.name}.`,
      },
    };
  }
  const relicMods = getRelicModifiers(run.player);
  const energyCost = getActionCost(run.player, action, {
    relicMods,
    turnActionsPlayed: run.battle.turnActionsPlayed || 0,
  });
  if (run.battle.energy < energyCost) {
    return {
      ...run,
      battle: {
        ...run.battle,
        feedback: "LOW ENERGY",
        turnNote: `Need ${energyCost} energy for ${action.name}. Pick a cheaper action or press E to end turn.`,
      },
    };
  }
  return {
    ...run,
    battle: {
      ...run.battle,
      selectedActionId: actionId,
      selectedActionCost: energyCost,
      problemStartedAt: timestamp,
      phaseCue: null,
      effects: [],
      feedback: "Solve fast.",
      turnNote: `${action.name} will spend ${energyCost} energy on answer.`,
    },
  };
}

function getSelectedAction(battle) {
  return battle.hand.find((action) => action.id === battle.selectedActionId) || null;
}

function getTargetEnemyId(enemies, preferredId = null) {
  if (preferredId && enemies.some((enemy) => enemy.id === preferredId)) {
    return preferredId;
  }
  return enemies[0]?.id || null;
}

function hasPlayableActions(player, battle, relicMods = getRelicModifiers(player)) {
  return battle.hand.some((action) => canAffordAction(player, battle, action, relicMods));
}

function applyUltimateEffect(player, battle, action, outcome, popups) {
  if (action.legendId === "knight") {
    const targetIndex = Math.max(0, battle.enemies.findIndex((enemy) => enemy.id === outcome.targetEnemyId));
    const damage = outcome.amount;
    battle.enemies[targetIndex].hp -= damage;
    battle.battleStats.damageDone += damage;
    applyStatus(battle.enemies[targetIndex], "stun", action.stunTurns || 1);
    player.block += outcome.preview.secondaryBlock;
    popups.push({ target: "enemy", amount: damage, style: outcome.popupStyle, lane: targetIndex });
    popups.push({ target: "enemy", amount: 0, style: "status", lane: targetIndex, tag: "STUN" });
    popups.push({ target: "player", amount: outcome.preview.secondaryBlock, style: "block", lane: 0, tag: "ULT" });
    return "Shield Bash!";
  }

  if (action.legendId === "wizard") {
    const damage = outcome.amount;
    const laneDamages = [];
    battle.enemies.forEach((enemy, index) => {
      enemy.hp -= damage;
      battle.battleStats.damageDone += damage;
      laneDamages.push({ lane: index, damage });
    });
    laneDamages.forEach(({ lane, damage }) => {
      pushMultiHitPopups(popups, {
        lane,
        damages: [damage],
        style: outcome.popupStyle,
        prefixTag: "ARC",
        tallyLabel: "NOVA",
      });
    });
    return "Arcstorm!";
  }

  const targetIndex = Math.max(0, battle.enemies.findIndex((enemy) => enemy.id === outcome.targetEnemyId));
  const totalDamage = outcome.amount;
  const hits = outcome.preview.hits || 3;
  const hitDamages = splitDamageIntoHits(totalDamage, hits);
  hitDamages.forEach((slice) => {
    battle.enemies[targetIndex].hp -= slice;
    battle.battleStats.damageDone += slice;
  });
  pushMultiHitPopups(popups, {
    lane: targetIndex,
    damages: hitDamages,
    style: outcome.popupStyle,
    prefixTag: "ULT",
    tallyLabel: "FLURRY",
    stepDelayMs: 70,
  });
  return "Shadow Flurry!";
}

function resolveEnemyTurn(run, player, battle, logMessage, inheritedPopups = []) {
  const retaliation = resolveEnemyPhase(player, battle.enemies);
  const finalPlayer = {
    ...retaliation.player,
    block: 0,
  };
  const relicMods = getRelicModifiers(finalPlayer);
  const energyMax = getEnergyMax(finalPlayer, relicMods);
  const finalBattle = {
    ...battle,
    enemies: retaliation.enemies,
    feedback: null,
    selectedActionId: null,
    selectedActionCost: null,
    problemStartedAt: 0,
    damagePopups: [...inheritedPopups, ...retaliation.popups],
    effects: retaliation.effects || [],
    playerMotion: retaliation.playerMotion || null,
    targetEnemyId: getTargetEnemyId(retaliation.enemies, battle.targetEnemyId),
    turn: battle.turn + 1,
    pendingEnemyPhase: false,
    phaseCue: finalPlayer.hp <= 0 ? null : "PLAYER TURN",
    energy: energyMax,
    energyMax,
    turnActionsPlayed: 0,
    spellEnergyRefundUsed: false,
    critEnergyRefundUsed: false,
    potionUsedThisTurn: false,
    turnNote: finalPlayer.hp <= 0
      ? "The enemy phase ends the climb."
      : `${energyMax}/${energyMax} energy refilled. ${getUltimateTurnNote(finalPlayer, battle)}`,
  };
  finalBattle.hand = createHand(run, finalPlayer, finalBattle);

  if (finalPlayer.hp <= 0) {
    return {
      ...run,
      screen: "GAMEOVER",
      player: finalPlayer,
      battle: finalBattle,
      log: [...run.log, "The Obelisk overwhelms the legend."],
    };
  }

  return {
    ...run,
    player: finalPlayer,
    battle: finalBattle,
    log: [...run.log, logMessage],
  };
}

function splitDamageIntoHits(totalDamage, hits) {
  const safeHits = Math.max(1, hits || 1);
  const baseHit = Math.floor(totalDamage / safeHits);
  let remaining = totalDamage;
  return Array.from({ length: safeHits }, (_, index) => {
    const slice = index === safeHits - 1 ? remaining : Math.max(1, baseHit);
    remaining -= slice;
    return slice;
  });
}

function chooseRandomTargetIndex(enemies) {
  const liveIndices = enemies
    .map((enemy, index) => ({ enemy, index }))
    .filter(({ enemy }) => enemy.hp > 0)
    .map(({ index }) => index);
  if (!liveIndices.length) return 0;
  return liveIndices[Math.floor(Math.random() * liveIndices.length)];
}

function buildPopup(target, amount, style, lane, extra = {}) {
  return {
    target,
    amount,
    style,
    lane,
    ...extra,
  };
}

function getMultiHitMotion(hitIndex) {
  const side = hitIndex % 2 === 0 ? -1 : 1;
  const rank = Math.floor(hitIndex / 2);
  return {
    offsetX: side * (24 + (rank * 14)),
    offsetY: 14 - (hitIndex * 20),
    tiltDeg: side * (5 + (rank * 2)),
  };
}

function pushMultiHitPopups(popups, options) {
  const {
    target = "enemy",
    lane = 0,
    damages = [],
    style = "damage",
    prefixTag = "HIT",
    tallyLabel = "TOTAL",
    baseDelayMs = 0,
    stepDelayMs = 80,
  } = options;
  if (!damages.length) return;
  damages.forEach((damage, hitIndex) => {
    const motion = getMultiHitMotion(hitIndex);
    popups.push(buildPopup(target, damage, style, lane, {
      tag: damages.length > 1 ? `${prefixTag} ${hitIndex + 1}` : null,
      delayMs: baseDelayMs + (hitIndex * stepDelayMs),
      offsetX: motion.offsetX,
      offsetY: motion.offsetY,
      tiltDeg: motion.tiltDeg,
      variant: damages.length > 1 ? "multi-hit" : "single-hit",
    }));
  });
  if (damages.length > 1) {
    const total = damages.reduce((sum, damage) => sum + damage, 0);
    popups.push(buildPopup(target, total, `${style}-total`, lane, {
      tag: tallyLabel,
      delayMs: baseDelayMs + (damages.length * stepDelayMs) + 90,
      offsetX: 0,
      offsetY: -58,
      variant: "multi-total",
    }));
  }
}

function applyDamageHits(nextBattle, action, outcome, popups) {
  if (!nextBattle.enemies.length) return;
  const hits = outcome.preview.hits || 1;
  const hitDamages = splitDamageIntoHits(outcome.amount, hits);
  const targeting = outcome.preview.hitTargeting || (action.type === "AOE" ? "ALL" : "TARGET");

  if (targeting === "ALL") {
    nextBattle.enemies.forEach((enemy, enemyIndex) => {
      hitDamages.forEach((damage) => {
        enemy.hp -= damage;
        nextBattle.battleStats.damageDone += damage;
      });
      pushMultiHitPopups(popups, {
        lane: enemyIndex,
        damages: hitDamages,
        style: outcome.popupStyle,
        stepDelayMs: 95,
      });
    });
    return;
  }

  const laneDamageTallies = new Map();
  hitDamages.forEach((damage, hitIndex) => {
    if (!nextBattle.enemies.length) return;
    const targetIndex = targeting === "RANDOM"
      ? chooseRandomTargetIndex(nextBattle.enemies)
      : Math.max(0, nextBattle.enemies.findIndex((enemy) => enemy.id === outcome.targetEnemyId));
    const enemy = nextBattle.enemies[targetIndex];
    if (!enemy) return;
    enemy.hp -= damage;
    nextBattle.battleStats.damageDone += damage;
    laneDamageTallies.set(targetIndex, [...(laneDamageTallies.get(targetIndex) || []), damage]);
    const motion = getMultiHitMotion(hitIndex);
    popups.push(buildPopup("enemy", damage, outcome.popupStyle, targetIndex, {
      tag: hits > 1 ? `HIT ${hitIndex + 1}` : null,
      delayMs: hitIndex * 95,
      offsetX: motion.offsetX,
      offsetY: motion.offsetY,
      tiltDeg: motion.tiltDeg,
      variant: hits > 1 ? "multi-hit" : "single-hit",
    }));
    if (outcome.isCrit && outcome.relicMods.critSplash) {
      nextBattle.enemies.forEach((splashTarget, splashIndex) => {
        if (splashIndex !== targetIndex) {
          const splash = Math.floor(damage * outcome.relicMods.critSplash);
          splashTarget.hp -= splash;
          nextBattle.battleStats.damageDone += splash;
          popups.push(buildPopup("enemy", splash, "damage", splashIndex, {
            tag: "SPLASH",
            delayMs: (hitIndex * 95) + 40,
            offsetX: 0,
            offsetY: -8,
          }));
        }
      });
    }
  });
  if (hits > 1) {
    laneDamageTallies.forEach((damages, lane) => {
      popups.push(buildPopup("enemy", damages.reduce((sum, damage) => sum + damage, 0), `${outcome.popupStyle}-total`, lane, {
        tag: "TOTAL",
        delayMs: (hitDamages.length * 95) + 90,
        offsetX: 0,
        offsetY: -58,
        variant: "multi-total",
      }));
    });
  }
}

function resolveTurnFromOutcome(run, player, nextBattle, action, outcome) {
  const popups = [];
  nextBattle.battleStats.turns += 1;
  nextBattle.playerMotion = null;

  if (outcome.isCorrect) {
    nextBattle.battleStats.hits += 1;
    player.combo = Math.min(getComboMax(player), player.combo + 1);
    player.bestCombo = Math.max(player.bestCombo || 0, player.combo);
    if (outcome.isCrit) nextBattle.battleStats.crits += 1;

    if (action.type === "ULTIMATE") {
      nextBattle.feedback = applyUltimateEffect(player, nextBattle, action, outcome, popups);
    }

    if (action.type === "ATK" || action.type === "AOE") {
      applyDamageHits(nextBattle, action, outcome, popups);
    }

    if (action.type === "DEF") {
      player.block += outcome.amount;
      popups.push({ target: "player", amount: outcome.amount, style: "block", lane: 0 });
      if (outcome.preview.guardHealOnCorrect) {
        player.hp = Math.min(player.maxHp, player.hp + outcome.preview.guardHealOnCorrect);
        popups.push({ target: "player", amount: outcome.preview.guardHealOnCorrect, style: "heal", lane: 1, tag: "GUARD" });
      }
    }

    if (action.type === "UTILITY") {
      player.hp = Math.min(player.maxHp, player.hp + outcome.amount);
      popups.push({ target: "player", amount: outcome.amount, style: "heal", lane: 0 });
      if (outcome.preview.secondaryBlock) {
        player.block += outcome.preview.secondaryBlock;
        popups.push({ target: "player", amount: outcome.preview.secondaryBlock, style: "block", lane: 1, tag: "WARD" });
      }
      if (outcome.preview.energyRestore) {
        nextBattle.energy = Math.min(nextBattle.energyMax || nextBattle.energy, (nextBattle.energy || 0) + outcome.preview.energyRestore);
        popups.push({ target: "player", amount: outcome.preview.energyRestore, style: "status", lane: 2, tag: "ENERGY" });
      }
    }

    if (outcome.preview.secondaryBlock && action.type !== "ULTIMATE" && action.type !== "DEF") {
      player.block += outcome.preview.secondaryBlock;
      popups.push({ target: "player", amount: outcome.preview.secondaryBlock, style: "block", lane: 1, tag: "SKILL" });
    }

    if (outcome.relicMods.blockOnCorrect) {
      player.block += outcome.relicMods.blockOnCorrect;
      popups.push({
        target: "player",
        amount: outcome.relicMods.blockOnCorrect,
        style: "block",
        lane: 2,
        tag: "RELIC",
      });
    }

    applySpellCritRefund(nextBattle, action, outcome, popups);
    applyCritEnergyRefund(nextBattle, outcome, popups);

    nextBattle.feedback = action.type === "ULTIMATE" ? nextBattle.feedback : outcome.feedback;
    nextBattle.playerMotion = action.type === "ULTIMATE"
      ? `${player.legendId}-ultimate`
      : action.type.toLowerCase();
  } else {
    player.combo = outcome.relicMods.softComboBreak ? Math.floor(player.combo / 2) : 0;
    nextBattle.feedback = action.type === "ULTIMATE" ? "ULTIMATE MISSED!" : "MISS!";
    nextBattle.playerMotion = action.type === "ULTIMATE" ? `${player.legendId}-ultimate` : "misfire";
  }

  nextBattle.damagePopups = popups;
  nextBattle.effects = buildActionEffects(action, outcome, player, nextBattle);
  nextBattle.enemies = nextBattle.enemies.filter((enemy) => enemy.hp > 0);
  nextBattle.selectedActionId = null;
  nextBattle.selectedActionCost = null;
  nextBattle.problemStartedAt = 0;
  nextBattle.pendingEnemyPhase = false;
  nextBattle.phaseCue = null;

  if (!nextBattle.enemies.length) {
    return createVictoryState(run, player, nextBattle);
  }

  const canContinue = hasPlayableActions(player, nextBattle, outcome.relicMods);
  nextBattle.targetEnemyId = getTargetEnemyId(nextBattle.enemies, nextBattle.targetEnemyId);
  nextBattle.turnNote = `${getBattleTurnNote(nextBattle.energy, nextBattle.energyMax, canContinue)} ${getUltimateTurnNote(player, nextBattle)}`;

  if (canContinue) {
    nextBattle.hand = createHand(run, player, nextBattle);
    return {
      ...run,
      player,
      battle: nextBattle,
      log: [...run.log, outcome.logMessage],
    };
  }

  nextBattle.hand = createHand(run, player, nextBattle);
  return {
    ...run,
    player,
    battle: nextBattle,
    log: [...run.log, outcome.logMessage],
  };
}

export function answerCurrentProblem(run, answer, now) {
  const battle = run.battle;
  if (!battle || !battle.selectedActionId) return run;
  const player = clone(run.player);
  const nextBattle = clone(battle);
  const action = getSelectedAction(nextBattle);
  if (!action) return run;

  const isCorrect = Number(answer) === action.problem.answer;
  const relicMods = getRelicModifiers(player);
  const elapsed = Math.max(0, now - battle.problemStartedAt);
  const preview = getActionPreview(player, action, {
    combo: player.combo,
    elapsed,
    relicMods,
    turnActionsPlayed: battle.turnActionsPlayed || 0,
  });
  const actionCost = battle.selectedActionCost ?? getActionCost(player, action, {
    relicMods,
    turnActionsPlayed: battle.turnActionsPlayed || 0,
  });
  nextBattle.energy = Math.max(0, (battle.energy || 0) - actionCost);
  nextBattle.turnActionsPlayed = (battle.turnActionsPlayed || 0) + 1;
  if (player.ultimateUnlocked) {
    const chargedBattle = applyUltimateCharge(nextBattle, actionCost);
    nextBattle.ultimateCharge = chargedBattle.ultimateCharge;
    nextBattle.ultimateReadyCount = chargedBattle.ultimateReadyCount;
  } else {
    nextBattle.ultimateCharge = 0;
    nextBattle.ultimateReadyCount = 0;
  }
  if (action.type === "ULTIMATE") {
    nextBattle.ultimateReadyCount = Math.max(0, (battle.ultimateReadyCount || 0) - 1);
  }
  const isCrit = isCorrect && (Math.random() * 100 < preview.critChance);

  if (isCorrect) {
    return resolveTurnFromOutcome(run, player, nextBattle, action, {
      isCorrect: true,
      isCrit,
      amount: isCrit ? preview.critAmount : preview.normalAmount,
      popupStyle: isCrit ? "crit" : "damage",
      feedback: action.type === "ULTIMATE" ? action.name : (isCrit ? "CRITICAL!" : (preview.quick ? "QUICK HIT!" : "HIT!")),
      relicMods,
      preview,
      targetEnemyId: nextBattle.targetEnemyId,
      logMessage: `${action.name} resolved cleanly.`,
    });
  }

  return resolveTurnFromOutcome(run, player, nextBattle, action, {
    isCorrect: false,
    isCrit: false,
    amount: 0,
    popupStyle: "damage",
    feedback: "MISS!",
    relicMods,
    preview,
    targetEnemyId: nextBattle.targetEnemyId,
    logMessage: `${action.name} misfired.`,
  });
}

export function endPlayerTurn(run) {
  if (!run.battle || run.battle.selectedActionId || run.battle.pendingEnemyPhase) return run;
  return {
    ...run,
    battle: {
      ...clone(run.battle),
      selectedActionId: null,
      selectedActionCost: null,
      problemStartedAt: 0,
      damagePopups: [],
      effects: [],
      playerMotion: null,
      pendingEnemyPhase: true,
      phaseCue: "ENEMY TURN",
      feedback: null,
      turnNote: "Enemies are acting. Brace for impact.",
    },
    log: [...run.log, "Turn ended."],
  };
}

export function resolvePendingVictory(run) {
  if (!run.battle?.pendingVictory) return run;
  return {
    ...run,
    screen: SCREEN.VICTORY,
    battle: {
      ...clone(run.battle),
      pendingVictory: false,
      phaseCue: null,
      turnNote: null,
      hand: [],
      effects: [],
    },
  };
}

export function resolvePendingEnemyPhase(run) {
  if (!run.battle?.pendingEnemyPhase) return run;
  const battle = clone(run.battle);
  battle.pendingEnemyPhase = false;
  battle.phaseCue = null;
  return resolveEnemyTurn(run, clone(run.player), battle, "Enemy phase resolved.");
}

function resolveEnemyPhase(player, enemies) {
  const nextPlayer = clone(player);
  const popups = [];
  const effects = [];
  let playerMotion = null;
  enemies.forEach((enemy, index) => {
    if (getStatus(enemy, "stun") > 0) {
      enemy.statuses.stun = Math.max(0, enemy.statuses.stun - 1);
      popups.push({ target: "enemy", amount: 0, style: "status", lane: index, tag: "STUNNED" });
      effects.push(createBattleEffect("stun", "enemy", index, "status"));
      return;
    }
    effects.push(createBattleEffect("enemy-strike", "enemy", index, "hostile"));
    let damage = enemy.intent.value;
    if (nextPlayer.block >= damage) {
      nextPlayer.block -= damage;
      playerMotion = playerMotion || "brace-hit";
    } else {
      damage -= nextPlayer.block;
      nextPlayer.block = 0;
      nextPlayer.hp = Math.max(0, nextPlayer.hp - damage);
      playerMotion = "hurt";
    }
    popups.push({ target: "player", amount: enemy.intent.value, style: "damage", lane: index });
    effects.push(createBattleEffect("impact", "player", 0, damage > 0 ? "hostile" : "guarded", 90 + (index * 30)));
  });
  return { player: nextPlayer, enemies, popups, effects, playerMotion };
}

function getMetaRewardForNode(nodeType, floor) {
  const act = getActForFloor(floor);
  if (nodeType === NODE_TYPES.BOSS) {
    if (act === 1) return { emberwood: 3 };
    if (act === 2) return { emberwood: 1, thorium: 2 };
    return { thorium: 2, eternium: 1 };
  }
  if (nodeType === NODE_TYPES.ELITE) {
    const roll = Math.random();
    if (act === 1) {
      return roll < 0.28 ? { emberwood: 1 } : createEmptyMaterialStock();
    }
    if (act === 2) {
      if (roll < 0.18) return { thorium: 1 };
      if (roll < 0.48) return { emberwood: 1 };
      return createEmptyMaterialStock();
    }
    if (roll < 0.14) return { eternium: 1 };
    if (roll < 0.42) return { thorium: 1 };
    return createEmptyMaterialStock();
  }
  return createEmptyMaterialStock();
}

function buildVictoryReward(run, player, battle) {
  const nodeType = battle.nodeType;
  const baseGold = Math.floor(28 + (player.floor * 8));
  const gold = Math.floor(baseGold + (nodeType === NODE_TYPES.ELITE ? 60 : 0) + (nodeType === NODE_TYPES.BOSS ? 180 : 0));
  const xp = Math.floor(40 + (player.floor * 16) + (nodeType === NODE_TYPES.ELITE ? 45 : 0) + (nodeType === NODE_TYPES.BOSS ? 150 : 0));
  const relic = nodeType === NODE_TYPES.ELITE ? buildTreasureOffer(run).relic : null;
  const materials = getMetaRewardForNode(nodeType, player.floor);
  const herbs = rollHerbDrop(nodeType);
  const leveled = player.xp + xp >= player.xpNext;
  return {
    gold,
    xp,
    relic,
    materials,
    herbs,
    leveled,
    nodeType,
    accuracy: Math.round((battle.battleStats.hits / Math.max(1, battle.battleStats.turns)) * 100),
    trainingChoices: buildVictoryTrainingChoices(nodeType, player),
    selectedTrainingId: null,
  };
}

function createVictoryState(run, player, battle) {
  const reward = buildVictoryReward(run, player, battle);
  return {
    ...run,
    screen: SCREEN.BATTLE,
    player,
    battle: {
      ...battle,
      pendingVictory: true,
      pendingEnemyPhase: false,
      phaseCue: "BATTLE CLEARED",
      turnNote: "Hold the line. Claiming spoils...",
      hand: [],
      selectedActionId: null,
      selectedActionCost: null,
      problemStartedAt: 0,
    },
    reward,
    log: [...run.log, `${reward.nodeType} cleared.`],
  };
}

export function chooseVictoryReward(run, rewardId) {
  if (!run.reward) return run;
  return {
    ...run,
    reward: {
      ...run.reward,
      selectedTrainingId: rewardId === "skip" ? null : rewardId,
    },
  };
}

function applyTrainingReward(player, reward) {
  if (!reward) return null;
  if (reward.kind === "TECHNIQUE") {
    const technique = applyTechniqueToPlayer(player, reward.techniqueId);
    return technique ? `Technique learned: ${technique.unlockTitle}` : null;
  }
  if (reward.kind === "ACTION") {
    const action = player.actions.find((entry) => entry.id === reward.actionId);
    if (action) {
      upgradeAction(action, 1);
      return reward.label;
    }
  }
  if (reward.kind === "STAT") {
    increaseStat(player, reward.stat, reward.amount);
    return reward.label;
  }
  if (reward.kind === "HERBS") {
    player.herbs = addHerbStock(player.herbs, reward.herbs || {});
    return reward.label;
  }
  if (reward.kind === "GOLD") {
    player.gold += reward.amount;
    return reward.label;
  }
  if (reward.kind === "SKILL_POINT") {
    player.skillPoints = Math.max(0, Number(player.skillPoints || 0) + Number(reward.amount || 1));
    return reward.label;
  }
  return null;
}

export function claimVictory(run) {
  if (!run.reward) return run;
  const player = clone(run.player);
  const reward = run.reward;
  const nextRunStats = addBattleToRunStats(run.runStats, run.battle);
  player.block = 0;
  player.gold += reward.gold;
  let xpPool = player.xp + reward.xp;
  while (xpPool >= player.xpNext) {
    xpPool -= player.xpNext;
    player.level += 1;
    player.statPoints += 5;
    player.xpNext = Math.floor(player.xpNext * 1.4);
  }
  player.xp = xpPool;
  if (reward.relic) {
    player.relics.push(reward.relic);
  }
  const selectedTraining = reward.trainingChoices?.find((choice) => choice.id === reward.selectedTrainingId) || null;
  const trainingLog = applyTrainingReward(player, selectedTraining);
  const nextMetaRewards = addMaterialStock(run.metaRewards, reward.materials);
  player.herbs = addHerbStock(player.herbs, reward.herbs || {});
  player.floor += 1;
  const isFinalClear = player.floor >= MAP_HEIGHT;
  const chosenNode = getNodeById(run.map, run.chosenNodeId);
  const reachableNodeIds = chosenNode?.children?.length ? chosenNode.children : [];
  const visitedNodeIds = [...run.visitedNodeIds, run.chosenNodeId];
  const runReport = isFinalClear ? buildRunReportFromState(run, player, nextRunStats) : null;
  const shouldOpenSkillTree = !isFinalClear && selectedTraining?.kind === "SKILL_POINT";
  return {
    ...run,
    player,
    metaRewards: nextMetaRewards,
    runStats: nextRunStats,
    runReport,
    reward: null,
    battle: null,
    screen: isFinalClear ? SCREEN.RUN_REPORT : SCREEN.MAP,
    activeFloor: player.floor,
    reachableNodeIds: isFinalClear ? [] : reachableNodeIds,
    visitedNodeIds,
    chosenNodeId: null,
    skillTreeOpen: shouldOpenSkillTree,
    log: [...run.log, isFinalClear ? "The summit yields. The full report is ready." : trainingLog ? `${trainingLog} added to the run.` : reward.relic ? `${reward.relic.name} claimed from victory.` : "The path opens upward."],
  };
}

export function openSkillTree(run) {
  return {
    ...run,
    skillTreeOpen: true,
  };
}

export function closeSkillTree(run) {
  return {
    ...run,
    skillTreeOpen: false,
  };
}

export function unlockSkillNode(run, nodeId) {
  const player = clone(run.player);
  const node = getSkillNodeById(player.legendId, nodeId);
  if (!node) return run;
  if (Math.max(0, Number(player.skillPoints || 0)) <= 0) return run;

  const isOwned = (player.skillNodesUnlocked || []).includes(nodeId);
  const currentLevel = getSkillNodeLevel(player, nodeId);
  const maxLevel = node.maxLevel || 1;

  if (isOwned) {
    if (currentLevel >= maxLevel) return run;
    player.skillNodeLevels = { ...(player.skillNodeLevels || {}), [nodeId]: currentLevel + 1 };
  } else {
    if (getSkillNodeStatus(player, node) !== "available") return run;
    player.skillNodesUnlocked = [...(player.skillNodesUnlocked || []), nodeId];
    player.skillNodeLevels = { ...(player.skillNodeLevels || {}), [nodeId]: 1 };
    if (node.effect?.techniqueId) {
      applyTechniqueToPlayer(player, node.effect.techniqueId);
    }
  }

  player.skillPoints -= 1;
  player.actions = rebuildPlayerActions(player);

  const levelAfter = (player.skillNodeLevels || {})[nodeId] || 1;
  const logMsg = isOwned ? `${node.label} upgraded to L${levelAfter}.` : `${node.label} learned.`;

  return {
    ...run,
    player,
    skillTreeOpen: true,
    log: [...run.log, logMsg],
  };
}

export function spendStatPoint(run, stat) {
  if (run.player.statPoints <= 0) return run;
  const player = clone(run.player);
  player.statPoints -= 1;
  player.stats[stat] += 1;
  if (stat === "vit") {
    player.maxHp += 10;
    player.hp += 10;
  }
  return { ...run, player };
}

export function applyRestChoice(run, choice) {
  const player = clone(run.player);
  let logMessage = `Rest choice: ${choice}.`;
  if (choice === "heal") {
    const relicMods = getRelicModifiers(player);
    const healPct = 0.4 + (relicMods.bonusRestHeal || 0);
    player.hp = Math.min(player.maxHp, player.hp + Math.floor(player.maxHp * healPct));
    logMessage = "The forge-rest steadies the legend.";
  }
  if (choice === "temper") {
    const temperPool = player.actions.filter((action) => action.id !== "util");
    const target = temperPool.reduce((best, action) => (action.level < best.level ? action : best), temperPool[0]);
    upgradeAction(target, 1);
    logMessage = `${target.name} is tempered at the anvil.`;
  }
  if (choice === "train") {
    const nextTraining = getNextRestTraining(player);
    if (nextTraining?.kind === "SKILL_TREE") {
      player.skillPoints = Math.max(0, Number(player.skillPoints || 0) + 1);
      logMessage = "A new talent point is etched into the run. The class tree opens.";
      const nextRun = advanceAfterUtility(run, player, logMessage);
      return {
        ...nextRun,
        skillTreeOpen: true,
      };
    }
    const training = applyRestTraining(player, nextTraining);
    logMessage = training ? `${training.title}. ${training.description}` : "Training complete.";
  }
  return advanceAfterUtility(run, player, logMessage);
}

export function claimTreasure(run, relicId) {
  const player = clone(run.player);
  const relic = run.treasureOffer?.relic || null;
  if (relic) player.relics.push(relic);
  player.gold += run.treasureOffer?.goldBonus || 0;
  return advanceAfterUtility(run, player, relic ? `${relic.name} claimed from the vault.` : "The vault is stripped clean.");
}

export function craftPotion(run, potionId) {
  if (!run || run.screen !== SCREEN.MAP) return run;
  const player = clone(run.player);
  const potion = getPotionConfig(potionId);
  if (!potion || !canCraftPotion(player, potionId)) return run;
  player.herbs[potion.herbId] = Math.max(0, Number(player.herbs?.[potion.herbId] || 0) - 1);
  player.potions = normalizePotionStock({
    ...player.potions,
    [potionId]: Math.max(0, Number(player.potions?.[potionId] || 0) + 1),
  });
  return {
    ...run,
    player,
    log: [...run.log, `${potion.name} brewed from ${HERBS[potion.herbId].name}.`],
  };
}

export function usePotion(run, potionId) {
  if (!run) return run;
  const player = clone(run.player);
  const potion = getPotionConfig(potionId);
  if (!potion) return run;
  const amountOwned = Math.max(0, Number(player.potions?.[potionId] || 0));
  if (amountOwned <= 0) return run;

  if (run.screen === SCREEN.MAP) {
    if (potion.kind !== "HEAL") return run;
    const healAmount = getPotionHealAmount(player, potion);
    if (healAmount <= 0 || player.hp >= player.maxHp) return run;
    player.hp = Math.min(player.maxHp, player.hp + healAmount);
    player.potions[potionId] = amountOwned - 1;
    return {
      ...run,
      player,
      log: [...run.log, `${potion.name} restores ${healAmount} HP.`],
    };
  }

  if (run.screen !== SCREEN.BATTLE || !run.battle || run.battle.pendingEnemyPhase || run.battle.pendingVictory || run.battle.selectedActionId) {
    return run;
  }
  if (run.battle.potionUsedThisTurn) return run;

  const battle = clone(run.battle);
  let feedback = potion.name;
  if (potion.kind === "HEAL") {
    const healAmount = getPotionHealAmount(player, potion);
    if (healAmount <= 0 || player.hp >= player.maxHp) return run;
    player.hp = Math.min(player.maxHp, player.hp + healAmount);
    battle.damagePopups = [{ target: "player", amount: healAmount, style: "heal", lane: 0, tag: "POTION" }];
    feedback = `${potion.name} +${healAmount}`;
  } else {
    const restored = Math.min(potion.energyRestore || 0, Math.max(0, (battle.energyMax || 0) - (battle.energy || 0)));
    if (restored <= 0) return run;
    battle.energy = Math.min(battle.energyMax || battle.energy, (battle.energy || 0) + restored);
    battle.damagePopups = [{ target: "player", amount: restored, style: "status", lane: 2, tag: "ENERGY" }];
    feedback = `${potion.name} +${restored} EN`;
  }
  player.potions[potionId] = amountOwned - 1;
  battle.potionUsedThisTurn = true;
  battle.effects = [];
  battle.feedback = feedback;
  battle.turnNote = `${battle.energy}/${battle.energyMax} energy left. One potion per turn.`;
  return {
    ...run,
    player,
    battle,
    log: [...run.log, `${potion.name} used.`],
  };
}

export function buyShopItem(run, itemId) {
  const player = clone(run.player);
  const offer = run.shopOffer?.find((entry) => entry.id === itemId || entry.relic?.id === itemId);
  if (!offer || player.gold < offer.cost) return run;
  player.gold -= offer.cost;

  if (offer.kind === "RELIC") {
    player.relics.push(offer.relic);
  }
  if (offer.kind === "ACTION_UPGRADE") {
    const action = player.actions.find((entry) => entry.id === offer.actionId);
    if (action) {
      upgradeAction(action, 1);
    }
  }
  if (offer.kind === "STAT") {
    increaseStat(player, offer.stat, 1);
  }
  if (offer.kind === "HERBS") {
    player.herbs = addHerbStock(player.herbs, offer.herbs || {});
  }
  if (offer.kind === "REMOVE") {
    const easyAction = player.actions.find((entry) => entry.id === "atk") || player.actions[0];
    upgradeAction(easyAction, 1);
  }

  return {
    ...run,
    player,
    shopOffer: run.shopOffer.filter((entry) => (entry.id || entry.relic?.id) !== itemId),
    log: [...run.log, `${offer.label || offer.relic?.name} purchased.`],
  };
}

export function leaveUtilityNode(run) {
  return advanceAfterUtility(run, clone(run.player), "The climb continues.");
}

function buildMinigameOffer(effect, event) {
  const template = MINIGAME_TEMPLATES[effect.minigameId];
  if (!template) return null;
  return {
    id: template.id,
    type: template.type,
    title: template.title,
    subtitle: template.subtitle,
    eventTitle: event.title,
    targetWins: template.targetWins,
    moves: clone(template.moves),
    playerWins: 0,
    foeWins: 0,
    round: 1,
    history: [],
    onWin: clone(effect.onWin || {}),
    onLose: clone(effect.onLose || {}),
    onDraw: clone(effect.onDraw || {}),
  };
}

function resolveRpsRound(minigame, moveId) {
  const moves = minigame.moves || [];
  const playerMove = moves.find((entry) => entry.id === moveId) || moves[0];
  const foeMove = sample(moves);
  let winner = "draw";
  if (playerMove.id !== foeMove.id) {
    winner = playerMove.beats === foeMove.id ? "player" : "foe";
  }
  return { playerMove, foeMove, winner };
}

function resolveMinigameResult(run, player, minigame, resultKey) {
  const effect = resultKey === "player" ? minigame.onWin : resultKey === "foe" ? minigame.onLose : minigame.onDraw;
  const relicPool = getRelicPoolFromIds(getRunContentState(run).relicIds);
  const effectResult = applyStructuredEffect(player, effect, { relicPool });
  const utilityReveal = effectResult.gainedRelics[0]
    ? buildUtilityReveal({
        kind: "relic",
        source: "event",
        title: "Broker Bested",
        subtitle: minigame.eventTitle,
        continueLabel: "Continue Ascent",
        relic: effectResult.gainedRelics[0],
      })
    : null;
  const summary = resultKey === "player"
    ? "The wager breaks in your favor."
    : resultKey === "foe"
      ? "The broker takes the round and names the price."
      : "The wager closes in a dead draw.";
  const noteTail = effectResult.notes.length ? ` ${effectResult.notes.join(", ")}.` : "";
  return advanceAfterUtility(run, player, `${minigame.eventTitle}: ${summary}${noteTail}`, utilityReveal);
}

export function playMinigameMove(run, moveId) {
  const minigame = run.minigameOffer;
  if (!minigame) return run;
  const player = clone(run.player);
  const round = resolveRpsRound(minigame, moveId);
  const nextOffer = clone(minigame);
  nextOffer.history.push({
    round: nextOffer.round,
    playerMove: round.playerMove.id,
    foeMove: round.foeMove.id,
    winner: round.winner,
  });
  if (round.winner === "player") nextOffer.playerWins += 1;
  if (round.winner === "foe") nextOffer.foeWins += 1;
  nextOffer.round += 1;
  if (nextOffer.playerWins >= nextOffer.targetWins) {
    return resolveMinigameResult(run, player, nextOffer, "player");
  }
  if (nextOffer.foeWins >= nextOffer.targetWins) {
    return resolveMinigameResult(run, player, nextOffer, "foe");
  }
  if (nextOffer.history.length >= ((nextOffer.targetWins * 2) - 1)) {
    return resolveMinigameResult(run, player, nextOffer, "draw");
  }
  return {
    ...run,
    screen: SCREEN.MINIGAME,
    minigameOffer: nextOffer,
    log: [...run.log, `${nextOffer.eventTitle}: ${round.playerMove.label} vs ${round.foeMove.label}.`],
  };
}

export function applyEventChoice(run, choiceId) {
  const event = run.eventOffer;
  if (!event) return run;
  const choice = event.choices.find((entry) => entry.id === choiceId);
  if (!choice || choice.disabled) return run;
  if (choice.effect?.minigameId) {
    const minigameOffer = buildMinigameOffer(choice.effect, event);
    if (!minigameOffer) return run;
    return {
      ...run,
      screen: SCREEN.MINIGAME,
      minigameOffer,
      log: [...run.log, `${event.title}: ${choice.label}.`],
    };
  }
  const player = clone(run.player);
  const relicPool = getRelicPoolFromIds(getRunContentState(run).relicIds);
  const effectResult = applyStructuredEffect(player, choice.effect, { relicPool });
  const logMessage = effectResult.notes.length
    ? `${event.title}: ${choice.label}. ${effectResult.notes.join(", ")}.`
    : `${event.title}: ${choice.label}.`;
  const utilityReveal = effectResult.gainedRelics[0]
    ? buildUtilityReveal({
        kind: "relic",
        source: "event",
        title: "Relic Claimed",
        subtitle: event.title,
        continueLabel: "Continue Ascent",
        relic: effectResult.gainedRelics[0],
      })
    : null;
  return advanceAfterUtility(run, player, logMessage, utilityReveal);
}

function advanceAfterUtility(run, player, logMessage, utilityReveal = null) {
  player.block = 0;
  player.floor += 1;
  const chosenNode = getNodeById(run.map, run.chosenNodeId);
  const reachableNodeIds = chosenNode?.children?.length ? chosenNode.children : [];
  const visitedNodeIds = [...run.visitedNodeIds, run.chosenNodeId];
  return {
    ...run,
    player,
    chosenNodeId: null,
    activeFloor: player.floor,
    reachableNodeIds,
    visitedNodeIds,
    screen: player.floor >= MAP_HEIGHT ? "HUB" : "MAP",
    eventOffer: null,
    minigameOffer: null,
    restOffer: null,
    shopOffer: null,
    treasureOffer: null,
    skillTreeOpen: false,
    utilityReveal,
    log: [...run.log, logMessage],
  };
}

export function dismissUtilityReveal(run) {
  if (!run?.utilityReveal) return run;
  return {
    ...run,
    utilityReveal: null,
  };
}

export function serializeProfile(run) {
  if (!run) return null;
  return clone(run);
}

export function createEmptyProfile() {
  return {
    bestRunFloor: 0,
    totalRuns: 0,
    totalWins: 0,
    base: ensureBaseState(),
    unlockReveal: null,
    lastRun: null,
  };
}

export function hydrateProfile(profile) {
  const next = clone(profile || createEmptyProfile());
  next.base = ensureBaseState(profile?.base);
  next.bestRunFloor = Number(next.bestRunFloor || 0);
  next.totalRuns = Number(next.totalRuns || 0);
  next.totalWins = Number(next.totalWins || 0);
  next.unlockReveal = next.unlockReveal || null;
  next.lastRun = next.lastRun || null;
  return next;
}

export function updateProfile(profile, run, completed = false) {
  const next = hydrateProfile(profile || createEmptyProfile());
  next.totalRuns += completed ? 1 : 0;
  next.totalWins += completed && run.player.floor >= MAP_HEIGHT ? 1 : 0;
  next.bestRunFloor = Math.max(next.bestRunFloor, run.player.floor);
  next.base.materials = addMaterialStock(next.base.materials, run.metaRewards);
  next.lastRun = serializeProfile(run);
  return next;
}

export function upgradeBaseBuilding(profile, buildingId) {
  const next = hydrateProfile(profile);
  const currentTier = next.base.buildings[buildingId] || 0;
  const upgrade = BASE_UNLOCKS[buildingId]?.[currentTier];
  if (!upgrade) return next;
  if (!canAffordMaterialCost(next.base.materials, upgrade.cost)) {
    return next;
  }
  next.base.materials = spendMaterialCost(next.base.materials, upgrade.cost);
  next.base.buildings[buildingId] = currentTier + 1;
  next.unlockReveal = buildUnlockReveal(buildingId, upgrade);
  return next;
}

export function dismissUnlockReveal(profile) {
  const next = hydrateProfile(profile);
  next.unlockReveal = null;
  return next;
}

export function getBattleTimeLeft(run, now) {
  const battle = run.battle;
  if (!battle?.selectedActionId || !battle.problemStartedAt) return 1;
  const elapsed = now - battle.problemStartedAt;
  return Math.max(0, 1 - (elapsed / getBattleTimeLimit(run)));
}
