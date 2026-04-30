import {
  ACT_TIME_LIMITS,
  CLIMB_TIERS,
  DEFAULT_TIER_ID,
  EFFECT_TO_KEYWORD,
  HERBS,
  KEYWORD_FORMATS,
  KEYWORDS,
  LEGENDS,
  MAP_HEIGHT,
  MATERIALS,
  NODE_ASSETS,
  NODE_ICONS,
  POTIONS,
  SCREEN,
  SPIRES,
} from "./data.js";
import {
  canAffordAction,
  getBattleBuffSummary,
  describeActionPreviewClean,
  getAchievementCatalog,
  getActForFloor,
  getActionCost,
  getBattleTimeLimit,
  getBaseUpgradeCards,
  getClimbTier,
  getLegend,
  getNextRestTraining,
  getPlayerMechanicSummary,
  getReachableNodes,
  getRunModifierSummary,
  getSkillTreeState,
  getSpire,
  getUnlockedSpireIds,
  isSpireAllowedAtTier,
} from "./engine.js";
import { getAchievementById } from "./achievements.js";

const SHELL_BACKDROPS = {
  hub: "./assets/backgrounds/bg-hub-frontier.webp",
  map: "./assets/backgrounds/bg-map-obelisk.webp",
  battle1: "./assets/backgrounds/bg-battle-act1.webp",
  battle2: "./assets/backgrounds/bg-battle-act2.webp",
  battle3: "./assets/backgrounds/bg-battle-act3.webp",
};

const UTILITY_SCENES = {
  rest: "./assets/scenes/scene-rest-chamber.webp",
  shop: "./assets/scenes/scene-shop-vendor.webp",
  treasure: "./assets/scenes/scene-treasure-vault.webp",
};

function pct(value) {
  return `${Math.max(0, Math.min(100, value * 100)).toFixed(1)}%`;
}

function seconds(ms) {
  return `${(ms / 1000).toFixed(ms % 1000 === 0 ? 0 : 1)}s`;
}

function formatRunDuration(ms) {
  const totalSeconds = Math.max(0, Math.round((ms || 0) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secondsLeft = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secondsLeft).padStart(2, "0")}`;
  }
  return `${minutes}:${String(secondsLeft).padStart(2, "0")}`;
}

function titleize(type) {
  if (type === "EVENT") return "Unknown";
  return type.charAt(0) + type.slice(1).toLowerCase();
}

function formatSavedRunScreen(screen) {
  const labels = {
    MAP: "On The Map",
    BATTLE: "In Battle",
    VICTORY: "Victory Spoils",
    EVENT: "Within An Omen",
    MINIGAME: "At The Wager Table",
    REST: "Within The Sanctuary",
    TREASURE: "At The Vault",
    SHOP: "At The Quartermaster",
    RUN_REPORT: "At The Summit Report",
    GAMEOVER: "After A Broken Climb",
  };
  return labels[screen] || titleize(screen || "Unknown");
}

function buildSavedRunSummary(run) {
  if (!run?.player) return null;
  const floor = Math.max(0, Number(run.player.floor || 0));
  const legend = getLegend(run.player.legendId);
  const spire = getSpire(run.spireId || "mixed");
  return {
    legend: legend?.name || "Unknown Legend",
    spire: spire?.name || "Unknown Road",
    floor: floor + 1,
    act: getActForFloor(floor),
    screen: formatSavedRunScreen(run.screen),
    hp: Math.max(0, Number(run.player.hp || 0)),
    maxHp: Math.max(1, Number(run.player.maxHp || 1)),
  };
}

function formatCompactImpact(action, info) {
  const { preview } = info;
  if (action.type === "ULTIMATE") {
    return `${preview.normalAmount} power | ${preview.critAmount} crit`;
  }
  if (action.type === "UTILITY") {
    const notes = [];
    if (preview.buffLabel) notes.push(`${preview.buffDuration} turns`);
    if (preview.secondaryBlock) notes.push(`+${preview.secondaryBlock} ward`);
    if (preview.energyRestore) notes.push(`+${preview.energyRestore} energy`);
    if (preview.buffLabel) {
      return `${preview.buffLabel}${notes.length ? ` | ${notes.join(" | ")}` : ""}`;
    }
    return `${preview.normalAmount} restore${notes.length ? ` | ${notes.join(" | ")}` : ""}`;
  }
  // Type tag for defensive actions is "DEF" (see BASE_ACTIONS in data.js).
  // We were checking "DEFEND" here, so the branch never matched and barrier
  // actions like Guard / Prism Ward fell through to the damage label.
  const amountLabel = action.type === "DEF"
    ? `${preview.normalAmount} block`
    : action.type === "AOE"
      ? `${preview.normalAmount} to all`
      : `${preview.normalAmount} dmg`;
  const notes = [];
  if (action.type !== "DEF") notes.push(`${preview.critAmount} crit`);
  if (preview.hits > 1) notes.push(`${preview.hits} hits`);
  if (preview.secondaryBlock) notes.push(`+${preview.secondaryBlock} ward`);
  if (preview.guardHealOnCorrect) notes.push(`+${preview.guardHealOnCorrect} mend`);
  return `${amountLabel}${notes.length ? ` | ${notes.join(" | ")}` : ""}`;
}

function tooltipAttr(text) {
  if (!text) return "";
  // Encode real newlines as &#10; so the attribute round-trips into a real
  // \n character; combined with `white-space: pre-line` on the tooltip
  // pseudo-element this lets a single tooltip render multiple stacked lines.
  const escaped = String(text)
    .replaceAll('"', "&quot;")
    .replaceAll("\n", "&#10;");
  return `data-tooltip="${escaped}"`;
}

function escapeAttr(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderArtBadge({ asset, fallback, alt, className = "avatar-art" }) {
  if (asset) {
    return `<img class="${className}" src="${asset}" alt="${escapeAttr(alt)}" draggable="false" />`;
  }
  return `<span class="${className} fallback-art">${fallback}</span>`;
}

function renderRelicBadge(relic, className = "relic-badge-art") {
  if (relic?.asset) {
    return `<img class="${className}" src="${relic.asset}" alt="${escapeAttr(relic.name)}" draggable="false" />`;
  }
  return `<div class="${className} relic-badge-fallback ${rarityClass(relic?.rarity || "COMMON")}"><span>◆</span></div>`;
}

function rarityClass(rarity) {
  return `rarity-${String(rarity || "COMMON").toLowerCase()}`;
}

function getBattleBackdrop(act) {
  if (act >= 3) return SHELL_BACKDROPS.battle3;
  if (act === 2) return SHELL_BACKDROPS.battle2;
  return SHELL_BACKDROPS.battle1;
}

function getShellBackdrop(run, setup) {
  if (!run) {
    return {
      asset: SHELL_BACKDROPS.hub,
      tone: setup?.view === "base" ? "outpost" : "hub",
    };
  }

  if ([SCREEN.BATTLE, SCREEN.VICTORY, SCREEN.GAMEOVER].includes(run.screen) && run.battle) {
    return {
      asset: getBattleBackdrop(getActForFloor(run.player.floor)),
      tone: "battle",
    };
  }

  if (run.screen === SCREEN.RUN_REPORT) {
    return {
      asset: getBattleBackdrop(3),
      tone: "report",
    };
  }

  return {
    asset: SHELL_BACKDROPS.map,
    tone: run.screen === SCREEN.HUB ? "hub" : "map",
  };
}

function renderShellBackdrop(run, setup) {
  const backdrop = getShellBackdrop(run, setup);
  return `
    <div class="app-environment tone-${backdrop.tone}" aria-hidden="true">
      <div class="app-environment-image" style="background-image:url('${backdrop.asset}')"></div>
      <div class="app-environment-vignette"></div>
      <div class="app-environment-glow"></div>
    </div>
  `;
}

function renderUtilityScene(asset, eyebrow, title) {
  if (!asset) return "";
  return `
    <div class="utility-scene">
      <div class="utility-scene-image" style="background-image:url('${asset}')" role="img" aria-label="${escapeAttr(title)}"></div>
      <div class="utility-scene-copy">
        <span>${eyebrow}</span>
        <strong>${title}</strong>
      </div>
    </div>
  `;
}

function getMaterialRows(stock = {}, { includeEmpty = false } = {}) {
  return Object.values(MATERIALS)
    .map((material) => ({
      ...material,
      amount: Math.max(0, Number(stock?.[material.id] || 0)),
    }))
    .filter((material) => includeEmpty || material.amount > 0);
}

function renderMaterialPills(stock = {}, options = {}) {
  const rows = getMaterialRows(stock, options);
  if (!rows.length) return "";
  return rows.map((material) => `
    <div class="header-pill material-pill ${rarityClass(material.rarity)}">
      <span>${material.name}</span>
      <strong>${material.amount}</strong>
    </div>
  `).join("");
}

function renderMaterialCost(cost = {}) {
  const rows = getMaterialRows(cost);
  if (!rows.length) return "No material cost";
  return rows.map((material) => `${material.amount} ${material.name}`).join(" | ");
}

function renderRewardMaterials(materials = {}) {
  const rows = getMaterialRows(materials);
  if (!rows.length) return "";
  return `
    <div class="reward-materials">
      ${rows.map((material) => `
        <div class="material-reward-card ${rarityClass(material.rarity)} tooltip-anchor" title="${material.description}" ${tooltipAttr(material.description)} tabindex="0">
          <span>${material.name}</span>
          <strong>+${material.amount}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function getHerbRows(stock = {}, { includeEmpty = false } = {}) {
  return Object.values(HERBS)
    .map((herb) => ({
      ...herb,
      amount: Math.max(0, Number(stock?.[herb.id] || 0)),
    }))
    .filter((herb) => includeEmpty || herb.amount > 0);
}

function renderHerbPills(stock = {}, options = {}) {
  const rows = getHerbRows(stock, options);
  const className = options.className || "herb-pill-row";
  if (!rows.length) {
    return `<div class="${className}"><div class="herb-pill is-empty">Herb satchel empty</div></div>`;
  }
  return `
    <div class="${className}">
      ${rows.map((herb) => `
        <div class="herb-pill herb-${herb.id}">
          <span>${herb.short}</span>
          <strong>${herb.amount}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function renderPotionRack(player, options = {}) {
  const mode = options.mode || "map";
  const battle = options.battle || null;

  if (mode === "battle") {
    // Compact belt for battle: small pill buttons only
    const slots = Object.values(POTIONS).map((potion) => {
      const amount = Math.max(0, Number(player.potions?.[potion.id] || 0));
      const canUseInBattle = !!battle
        && amount > 0
        && !battle.pendingEnemyPhase
        && !battle.pendingVictory
        && !battle.selectedActionId
        && !battle.potionUsedThisTurn
        && (potion.kind === "HEAL" ? player.hp < player.maxHp : battle.energy < battle.energyMax);
      const shortName = potion.name.replace(/\s+Tonic$/, "").replace(/\s+Potion$/, "");
      return `
        <button
          class="potion-slot ${amount === 0 ? "is-empty" : ""}"
          data-action="use-potion"
          data-potion-id="${potion.id}"
          ${!canUseInBattle ? "disabled" : ""}
        >
          ${shortName} <em>${amount}/3</em>
        </button>
      `;
    }).join("");
    return `<div class="potion-belt">${slots}</div>`;
  }

  // Map mode: full cards without description paragraph
  return `
    <div class="potion-rack map">
      ${Object.values(POTIONS).map((potion) => {
        const amount = Math.max(0, Number(player.potions?.[potion.id] || 0));
        const herbCount = Math.max(0, Number(player.herbs?.[potion.herbId] || 0));
        const craftDisabled = herbCount <= 0 || amount >= 3;
        const canUseOnMap = potion.kind === "HEAL" && amount > 0 && player.hp < player.maxHp;
        const useDisabled = !canUseOnMap;
        return `
          <div class="potion-card potion-${potion.id}">
            <div class="potion-card-head">
              <span>${potion.name}</span>
              <strong>${amount}/3</strong>
            </div>
            <div class="potion-card-actions">
              <button
                class="header-button subtle potion-craft-button"
                data-action="craft-potion"
                data-potion-id="${potion.id}"
                ${craftDisabled ? "disabled" : ""}
              >
                ${amount >= 3 ? "Full" : `Brew (${herbCount})`}
              </button>
              <button
                class="header-button ghost potion-use-button"
                data-action="use-potion"
                data-potion-id="${potion.id}"
                ${useDisabled ? "disabled" : ""}
              >
                ${potion.kind === "HEAL" ? "Drink" : "Use In Battle"}
              </button>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderModifierRows(modifiers = []) {
  if (!modifiers.length) {
    return `<div class="snapshot-item"><strong>No active omens</strong><span>The climb is clear of temporary boons and curses.</span></div>`;
  }
  return modifiers.map((modifier) => `
    <div class="snapshot-item omen-item omen-${modifier.tone}">
      <strong>${modifier.name}</strong>
      <span>${modifier.description}</span>
      <em>${modifier.battlesLeft} battle${modifier.battlesLeft === 1 ? "" : "s"} left</em>
    </div>
  `).join("");
}

function renderRewardHerbs(herbs = {}) {
  const rows = getHerbRows(herbs);
  if (!rows.length) return "";
  return `
    <div class="reward-herb-strip">
      ${rows.map((herb) => `
        <div class="material-reward-card herb-${herb.id}">
          <span>${herb.name}</span>
          <strong>+${herb.amount}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function renderRelicRewardCard(relic, label = "Relic") {
  if (!relic) return "";
  return `
    <div class="reward-relic ${rarityClass(relic.rarity)} tooltip-anchor" title="${relic.description}" ${tooltipAttr(relic.description)} tabindex="0">
      <div class="reward-relic-art">${renderRelicBadge(relic, "reward-relic-badge")}</div>
      <div class="reward-relic-copy">
        <span>${label}</span>
        <strong>${relic.name}</strong>
      </div>
    </div>
  `;
}

function getStatTooltip(stat, mechanics) {
  if (stat === "str") {
    return `Strength increases action power with diminishing returns. Current gain: +${mechanics.strPowerPct}% power.`;
  }
  if (stat === "vit") {
    return `Vitality grants +${mechanics.vitGrowthHp} max HP per point.`;
  }
  return `Focus gives +${mechanics.focusCritChancePct}% base crit chance and +${mechanics.focusCritPowerPct}% crit damage from your current total. Fast answers can add up to +${mechanics.quickCritChancePct}% more crit chance, but they do not increase crit damage.`;
}

function renderStatChips(stats, mechanics, className = "") {
  return `
    <div class="${className}">
      <span title="${escapeAttr(getStatTooltip("str", mechanics))}"><strong>STR</strong>${stats.str}</span>
      <span title="${escapeAttr(getStatTooltip("vit", mechanics))}"><strong>VIT</strong>${stats.vit}</span>
      <span title="${escapeAttr(getStatTooltip("focus", mechanics))}"><strong>FOCUS</strong>${stats.focus}</span>
    </div>
  `;
}

function renderHeaderRelics(relics) {
  if (!relics?.length) return "";
  const visibleRelics = relics.slice(0, 8);
  const extraRelics = Math.max(0, relics.length - visibleRelics.length);
  return `
    <div class="header-relic-rack" aria-label="Relics">
      ${visibleRelics.map((relic) => `
        <div class="relic-orb-wrap" tabindex="0">
          <div class="relic-orb ${rarityClass(relic.rarity)}" aria-label="${escapeAttr(relic.name)}">
            <span class="relic-orb-icon">◆</span>
          </div>
          <div class="relic-hovercard">
            <span>${relic.rarity}</span>
            <strong>${relic.name}</strong>
            <p>${relic.description}</p>
          </div>
        </div>
      `).join("")}
      ${extraRelics ? `<div class="relic-orb-wrap"><div class="relic-orb relic-orb-more"><span class="relic-orb-icon">+${extraRelics}</span></div></div>` : ""}
    </div>
  `;
}

function renderHeader(profile, run, setup = null, roster = null) {
  if (!run) {
    const hasActiveProfile = !!roster?.activeProfileId;
    const onPickerScreen = setup?.phase === "picker" || setup?.phase === "create-profile" || !hasActiveProfile;
    const playerName = profile?.name || "Player";
    return `
      <header class="app-header app-header-hub">
        <div class="brand-block compact">
          <p class="eyebrow">Math Monster Frontier</p>
          ${onPickerScreen || setup?.phase === "home" ? "" : `<button class="header-button ghost hub-home-button" data-action="back-to-home">Home</button>`}
        </div>
        <div class="header-tray">
          ${onPickerScreen ? "" : `
            <div class="header-pill profile-pill" title="Currently signed in as ${escapeAttr(playerName)}">
              <span>Player</span><strong>${escapeAttr(playerName)}</strong>
            </div>
            <button class="header-button ghost" data-action="switch-player" title="Hand the keyboard to another player">Switch Player</button>
            <div class="header-pill"><span>Best Floor</span><strong>${(profile.bestRunFloor || 0) + 1}</strong></div>
            <div class="header-pill"><span>Runs</span><strong>${profile.totalRuns || 0}</strong></div>
            <button class="header-button subtle" data-action="clear-save" title="Wipe this profile's save (other profiles are not affected)">Clear Save</button>
          `}
        </div>
      </header>
    `;
  }

  const legend = getLegend(run.player.legendId);
  const spire = getSpire(run.spireId);
  const tier = getClimbTier(run.tierId);
  const act = getActForFloor(run.player.floor);
  const hpPct = pct(run.player.hp / Math.max(1, run.player.maxHp));

  return `
    <header class="app-header in-run">
      <div class="legend-header">
        <div class="legend-badge ${legend.color}">${renderArtBadge({ asset: legend.asset, fallback: legend.icon, alt: legend.name, className: "avatar-art badge-art" })}</div>
        <div>
          <p class="eyebrow">${legend.name.toUpperCase()} | ${spire.name.toUpperCase()} <span class="run-tier-badge" title="Climb tier — sets the math content level">${tier.name}</span></p>
          <h1>Act ${act} | Floor ${run.player.floor + 1}</h1>
        </div>
      </div>
      <div class="header-tray">
        ${renderHeaderRelics(run.player.relics)}
        ${run.player.statPoints > 0 ? `<div class="header-pill highlight"><span>Points</span><strong>${run.player.statPoints}</strong></div>` : ""}
        <div class="header-pill"><span>Timer</span><strong>${seconds(getBattleTimeLimit(run))}</strong></div>
        <div class="header-pill health-pill">
          <span>Health</span>
          <strong>${run.player.hp}/${run.player.maxHp}</strong>
          <div class="mini-meter"><i style="width:${hpPct}"></i></div>
        </div>
        <div class="header-pill"><span>Gold</span><strong>${run.player.gold}</strong></div>
        <div class="header-pill"><span>XP</span><strong>${run.player.xp}/${run.player.xpNext}</strong></div>
        <div class="header-pill"><span>Level</span><strong>${run.player.level}</strong></div>
        <div class="header-pill"><span>Combo</span><strong>${run.player.combo}</strong></div>
      </div>
    </header>
  `;
}

function renderLegendCards(setup) {
  return LEGENDS.map((legend) => {
    const mechanics = getPlayerMechanicSummary({
      stats: legend.stats,
      relics: [],
    });
    return `
    <button class="legend-select-card ${setup.legendId === legend.id ? "is-selected" : ""}" data-action="select-legend" data-legend="${legend.id}">
      <div class="legend-select-avatar ${legend.color}">${renderArtBadge({ asset: legend.asset, fallback: legend.icon, alt: legend.name, className: "avatar-art select-art" })}</div>
      <div class="legend-select-copy">
        <h3>${legend.name}</h3>
        <p>${legend.description}</p>
      </div>
      ${renderStatChips(legend.stats, mechanics, "legend-select-stats")}
      <div class="legend-select-footer">${legend.passive}</div>
    </button>
  `;
  }).join("");
}

function renderSpireCards(setup, profile) {
  const unlockedSpireIds = new Set(getUnlockedSpireIds(profile));
  return SPIRES.map((spire) => {
    const unlocked = unlockedSpireIds.has(spire.id);
    const hoverDetails = unlocked
      ? `${spire.name} | ${spire.description} | Acts: ${ACT_TIME_LIMITS.map((limit) => seconds(limit)).join(" / ")}`
      : `${spire.name} | This gate still sleeps.`;
    return `
    <button class="spire-select-card ${setup.spireId === spire.id ? "is-selected" : ""} ${unlocked ? "" : "is-locked"}" data-action="select-spire" data-spire-id="${spire.id}" title="${hoverDetails}">
      <div class="spire-symbol">${unlocked
        ? renderArtBadge({ asset: spire.asset, fallback: spire.symbol, alt: spire.name, className: "spire-art" })
        : `<div class="spire-locked-glyph" aria-hidden="true"><span>?</span></div>`}
      </div>
      <div class="spire-copy">
        <strong>${spire.name}</strong>
      </div>
      ${setup.spireId === spire.id ? `<div class="spire-selected-flag">Chosen</div>` : ""}
    </button>
  `;
  }).join("");
}

function renderHubSteps(phase) {
  // Three-step setup: Legend -> Spire -> Tier. A pill is "is-active" when
  // it's the current step, "is-complete" once the user has progressed past
  // it, otherwise neutral.
  const order = ["legend", "spire", "tier"];
  const currentIndex = order.indexOf(phase);
  const stepClass = (index) => {
    if (currentIndex < 0) return "";
    if (index === currentIndex) return "is-active";
    if (index < currentIndex) return "is-complete";
    return "";
  };
  return `
    <div class="hub-step-row" aria-label="Run setup progress">
      <div class="hub-step-pill ${stepClass(0)}">
        <span>1</span>
        <strong>Legend</strong>
      </div>
      <div class="hub-step-connector ${currentIndex >= 1 ? "is-active" : ""}"></div>
      <div class="hub-step-pill ${stepClass(1)}">
        <span>2</span>
        <strong>Spire</strong>
      </div>
      <div class="hub-step-connector ${currentIndex >= 2 ? "is-active" : ""}"></div>
      <div class="hub-step-pill ${stepClass(2)}">
        <span>3</span>
        <strong>Tier</strong>
      </div>
    </div>
  `;
}

function renderTierCards(setup, profile) {
  const selectedSpireId = setup.spireId;
  const selectedTierId = setup.tierId || profile?.preferredTierId || DEFAULT_TIER_ID;
  return CLIMB_TIERS.map((tier) => {
    const compatible = !selectedSpireId || isSpireAllowedAtTier(selectedSpireId, tier.id);
    const selected = tier.id === selectedTierId;
    const disabledOps = ["+", "-", "*", "/"].filter((op) => !(tier.allowedOps || []).includes(op));
    const opsTag = disabledOps.length
      ? `<span class="tier-card-ops-tag">No ${disabledOps.map((op) => op === "+" ? "addition" : op === "-" ? "subtraction" : op === "*" ? "multiplication" : "division").join(" / ")}</span>`
      : `<span class="tier-card-ops-tag">All four operations</span>`;
    const timerTag = tier.timerMultiplier === 1
      ? "Standard timer"
      : tier.timerMultiplier > 1
        ? `+${Math.round((tier.timerMultiplier - 1) * 100)}% timer`
        : `${Math.round((tier.timerMultiplier - 1) * 100)}% timer`;
    const incompatibleNote = compatible ? "" : `<span class="tier-card-warning">Locks ${getSpire(selectedSpireId)?.name || "the chosen spire"}</span>`;
    return `
      <button class="tier-select-card ${selected ? "is-selected" : ""} ${compatible ? "" : "is-incompatible"}" data-action="select-tier" data-tier-id="${tier.id}">
        <div class="tier-card-head">
          <p class="eyebrow">${tier.audience}</p>
          <h3>${tier.name}</h3>
        </div>
        <p class="tier-card-summary">${tier.summary}</p>
        <p class="tier-card-detail">${tier.description}</p>
        <div class="tier-card-footer">
          ${opsTag}
          <span class="tier-card-timer-tag">${timerTag}</span>
        </div>
        ${incompatibleNote}
        ${selected ? `<div class="tier-selected-flag">Chosen</div>` : ""}
      </button>
    `;
  }).join("");
}

function renderSelectedLegendCard(legend) {
  return `
    <div class="selected-legend-card">
      <div class="selected-legend-art ${legend.color}">${renderArtBadge({ asset: legend.asset, fallback: legend.icon, alt: legend.name, className: "avatar-art select-art" })}</div>
      <div class="selected-legend-copy">
        <p class="eyebrow">Chosen Legend</p>
        <h3>${legend.name}</h3>
        <p>${legend.description}</p>
        <button class="header-button subtle selected-legend-button" data-action="change-legend">Change Legend</button>
      </div>
      <div class="selected-legend-stats">
        <span><strong>STR</strong>${legend.stats.str}</span>
        <span><strong>VIT</strong>${legend.stats.vit}</span>
        <span><strong>FOCUS</strong>${legend.stats.focus}</span>
      </div>
    </div>
  `;
}

function renderSpirePhaseLegendTag(legend) {
  return `
    <div class="spire-phase-legend-tag">
      <div class="spire-phase-legend-art ${legend.color}">${renderArtBadge({ asset: legend.asset, fallback: legend.icon, alt: legend.name, className: "avatar-art spire-phase-art" })}</div>
      <div class="spire-phase-legend-copy">
        <p class="eyebrow">Chosen Legend</p>
        <strong>${legend.name}</strong>
      </div>
      <button class="header-button subtle spire-phase-change" data-action="change-legend">Change Legend</button>
    </div>
  `;
}

function renderLandingAchievementOverlay(profile) {
  const reveal = profile?.achievements?.reveal;
  if (!reveal) return "";
  return renderAchievementRevealModal(reveal);
}

function renderLanding(profile, setup) {
  const unlockedCount = getUnlockedSpireIds(profile).length;
  const savedRun = buildSavedRunSummary(profile.lastRun);
  return `
    <section class="hub-screen hub-screen-home">
      <div class="landing-stage">
        <div class="landing-mark">
          <p class="eyebrow">Math Monster Frontier</p>
          <h2><em>THE</em><span>OBELISK</span></h2>
          <p class="landing-copy">Ancient roads wake beyond the frontier. Choose your legend and answer the climb.</p>
        </div>
        ${setup?.notice ? `<div class="landing-notice">${setup.notice}</div>` : ""}
        <div class="landing-actions">
          <div class="landing-cta">
            <button class="header-button primary landing-button" data-action="choose-home-mode" data-mode="new">Begin Climb</button>
          </div>
          <div class="landing-secondary-actions">
            <button class="header-button subtle landing-button" data-action="choose-home-mode" data-mode="load"${savedRun ? "" : " disabled"}>Resume Climb</button>
            <button class="header-button ghost landing-button" data-action="open-base">Outpost</button>
          </div>
        </div>
        ${savedRun ? `
          <div class="landing-save-panel">
            <div class="landing-save-head">
              <p class="eyebrow">Camp Chronicle</p>
              <strong>Chronicle Save Ready</strong>
            </div>
            <div class="landing-save-grid">
              <div class="landing-save-stat"><span>Legend</span><strong>${savedRun.legend}</strong></div>
              <div class="landing-save-stat"><span>Floor</span><strong>${savedRun.floor}</strong></div>
              <div class="landing-save-stat"><span>Road</span><strong>${savedRun.spire}</strong></div>
              <div class="landing-save-stat"><span>Scene</span><strong>${savedRun.screen}</strong></div>
            </div>
            <p class="landing-save-copy">Act ${savedRun.act} | ${savedRun.hp}/${savedRun.maxHp} HP. Choose <strong>Resume Climb</strong> to return to the Chronicle.</p>
          </div>
        ` : ""}
        <div class="landing-meta">
          <div class="landing-meta-pill"><span>Best Floor</span><strong>${(profile.bestRunFloor || 0) + 1}</strong></div>
          <div class="landing-meta-pill"><span>Runs</span><strong>${profile.totalRuns || 0}</strong></div>
          <div class="landing-meta-pill"><span>Gates Lit</span><strong>${unlockedCount}/${SPIRES.length}</strong></div>
        </div>
      </div>
      ${renderLandingAchievementOverlay(profile)}
    </section>
  `;
}

// Multi-profile picker. Lists every profile in the roster as a tile and
// offers a "+ New Player" tile that routes into the creator. Each tile
// shows the profile's most-recently-used legend as its portrait, so a
// kid can identify their slot at a glance without reading their own name.
function renderProfilePicker(roster, setup) {
  const profiles = Array.isArray(roster?.list) ? roster.list : [];
  const isEmpty = profiles.length === 0;
  return `
    <section class="hub-screen hub-screen-profile">
      <div class="profile-picker-stage">
        <div class="hub-phase-header compact profile-phase-header">
          <div class="hub-phase-copy">
            <p class="eyebrow">Camp Chronicle</p>
            <h2>${isEmpty ? "Create Your Profile" : "Who's Climbing?"}</h2>
            <p>${isEmpty
              ? "No records yet. Type a name to create your first profile and start the climb."
              : "Pick a profile to play, or create a new one."}</p>
          </div>
        </div>
        ${setup?.notice ? `<div class="landing-notice">${setup.notice}</div>` : ""}
        <div class="profile-picker-grid">
          ${profiles.map((entry) => {
            const legend = entry.lastLegendId ? getLegend(entry.lastLegendId) : null;
            const portrait = legend
              ? `<img class="profile-tile-portrait" src="${legend.asset}" alt="${escapeAttr(legend.name)}" />`
              : `<div class="profile-tile-portrait profile-tile-portrait-blank"><span>?</span></div>`;
            const legendLabel = legend ? legend.name : "No legend yet";
            const summary = entry.totalRuns > 0
              ? `Best Floor ${entry.bestRunFloor + 1} · ${entry.totalRuns} run${entry.totalRuns === 1 ? "" : "s"}`
              : "Fresh climb";
            return `
              <button class="profile-tile ${entry.isActive ? "is-active" : ""}" data-action="pick-profile" data-profile-id="${entry.id}">
                ${portrait}
                <div class="profile-tile-body">
                  <strong>${escapeAttr(entry.name)}</strong>
                  <span class="profile-tile-legend">${escapeAttr(legendLabel)}</span>
                  <span class="profile-tile-stats">${summary}</span>
                </div>
              </button>
            `;
          }).join("")}
          <button class="profile-tile profile-tile-new" data-action="open-create-profile">
            <div class="profile-tile-portrait profile-tile-portrait-add"><span>+</span></div>
            <div class="profile-tile-body">
              <strong>New Player</strong>
              <span class="profile-tile-stats">Type a name to start</span>
            </div>
          </button>
        </div>
      </div>
    </section>
  `;
}

// Name-input flow for creating a new profile. Kept deliberately simple —
// one text input, an Enter-to-submit form, and a back button that
// returns to the picker without creating anything.
function renderProfileCreator(roster, setup) {
  const draft = setup?.creatingProfileName || "";
  const profiles = Array.isArray(roster?.list) ? roster.list : [];
  const allowBack = profiles.length > 0;
  return `
    <section class="hub-screen hub-screen-profile">
      <div class="profile-picker-stage profile-creator-stage">
        <div class="hub-phase-header compact profile-phase-header">
          <div class="hub-phase-copy">
            <p class="eyebrow">New Player</p>
            <h2>What's your name?</h2>
            <p>This name will appear on your profile and your saves. You can pick a legend after.</p>
          </div>
          ${allowBack ? `<button class="header-button ghost" data-action="cancel-create-profile">Back</button>` : ""}
        </div>
        ${setup?.notice ? `<div class="landing-notice">${setup.notice}</div>` : ""}
        <form class="profile-creator-form" data-action="submit-create-profile">
          <label class="profile-creator-label" for="profile-name-input">Name</label>
          <input
            id="profile-name-input"
            class="profile-creator-input"
            type="text"
            name="profileName"
            value="${escapeAttr(draft)}"
            maxlength="24"
            autocomplete="off"
            autofocus
            placeholder="e.g. Lucas"
          />
          <div class="profile-creator-actions">
            <!-- No data-action on this button: both the form's submit
                 event and a button click would otherwise fire the same
                 handler, causing a double-call. The form's data-action
                 attribute is the single source of truth — clicking the
                 button just submits the form natively. -->
            <button class="header-button primary" type="submit">Create Profile</button>
          </div>
        </form>
      </div>
    </section>
  `;
}

function renderPortalTrack(profile, selectedSpireId = null, mode = "full") {
  const unlockedSpireIds = new Set(getUnlockedSpireIds(profile));
  return `
    <div class="portal-track portal-track-${mode}">
      ${SPIRES.map((spire, index) => {
        const unlocked = unlockedSpireIds.has(spire.id);
        const selected = selectedSpireId === spire.id;
        const stateLabel = unlocked ? "Online" : "Locked";
        return `
          <div class="portal-node ${unlocked ? "is-online" : "is-locked"} ${selected ? "is-selected" : ""}">
            <div class="portal-node-emblem">
              ${renderArtBadge({ asset: spire.asset, fallback: spire.symbol, alt: spire.name, className: "portal-art" })}
            </div>
            <div class="portal-node-copy">
              <strong>${spire.name}</strong>
              <span>${stateLabel}</span>
            </div>
            ${index < SPIRES.length - 1 ? `<div class="portal-link ${unlocked && unlockedSpireIds.has(SPIRES[index + 1].id) ? "is-online" : ""}"></div>` : ""}
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderHubModeSwitch(view) {
  return `
    <div class="hub-mode-switch">
      <button class="hub-mode-pill ${view === "expedition" ? "is-active" : ""}" data-action="open-expedition">Expedition</button>
      <button class="hub-mode-pill ${view === "base" ? "is-active" : ""}" data-action="open-base">Outpost</button>
      <button class="hub-mode-pill ${view === "honors" ? "is-active" : ""}" data-action="open-honors">Honors</button>
    </div>
  `;
}

function renderBase(profile) {
  const cards = getBaseUpgradeCards(profile);
  const base = profile.base;
  const unlockReveal = profile.unlockReveal;
  const achievementReveal = profile.achievements?.reveal;
  return `
    <section class="hub-screen base-screen">
      <div class="hub-phase-header base-phase-header">
      <div class="hub-phase-copy">
          <h2>The Outpost</h2>
          <p>Boss salvage keeps the halls alive. Every rekindled wing changes what waits beyond the next gate.</p>
        </div>
        ${renderHubModeSwitch("base")}
      </div>
      <div class="base-resource-row">
        ${renderMaterialPills(base.materials, { includeEmpty: true })}
        <div class="base-resource-note">Bosses haul back seasoned salvage. Elites sometimes carry stranger ore.</div>
      </div>
      <section class="base-portal-band">
        <div class="section-copy">
          <h3>Gate Array</h3>
        </div>
        ${renderPortalTrack(profile, null, "full")}
      </section>
      <div class="base-grid">
        ${cards.map((card) => `
          <section class="base-card ${card.id === "portalArray" ? "portal-array-card" : ""}">
            <div class="base-card-head">
              <div>
                <h3>${card.name}</h3>
              </div>
              <div class="base-tier-pill">Rank ${card.tier}/${card.maxTier}</div>
            </div>
            <p class="base-card-copy">${card.description}</p>
            ${card.nextUpgrade ? `
              <div class="base-upgrade-panel">
                <div class="base-upgrade-copy">
                  <strong>${card.nextUpgrade.title}</strong>
                  <p>${card.nextUpgrade.description}</p>
                </div>
                <div class="base-upgrade-footer">
                  <div class="base-cost">Cost: ${renderMaterialCost(card.nextUpgrade.cost)}</div>
                  <button class="header-button ${card.nextUpgrade.canAfford ? "primary" : "subtle"}" data-action="upgrade-base" data-building-id="${card.id}" ${card.nextUpgrade.canAfford ? "" : "disabled"}>${card.nextUpgrade.canAfford ? "Rekindle Wing" : "Need More Salvage"}</button>
                </div>
              </div>
            ` : `
              <div class="base-upgrade-panel maxed">
                <span class="base-block-label">State</span>
                <strong>Complete</strong>
                <p>This wing is lit and waiting.</p>
              </div>
            `}
          </section>
        `).join("")}
      </div>
      ${unlockReveal
        ? renderUnlockRevealModal(unlockReveal)
        : achievementReveal ? renderAchievementRevealModal(achievementReveal) : ""}
    </section>
  `;
}

function renderAchievementRevealModal(reveal) {
  const ids = Array.isArray(reveal?.ids) ? reveal.ids : [];
  const definitions = ids
    .map((id) => getAchievementById(id))
    .filter(Boolean);
  if (!definitions.length) return "";
  const isMulti = definitions.length > 1;
  return `
    <section class="modal-backdrop">
      <div class="utility-modal achievement-reveal-modal">
        <p class="eyebrow">${isMulti ? `${definitions.length} New Honors` : "New Honor"}</p>
        <h2>${isMulti ? "Field Honors Earned" : definitions[0].name}</h2>
        ${isMulti ? "" : `<p class="utility-copy">${definitions[0].description}</p>`}
        <div class="achievement-reveal-grid">
          ${definitions.map((entry) => `
            <article class="achievement-card is-earned achievement-reveal-card">
              <div class="achievement-card-mark">★</div>
              <div class="achievement-card-body">
                <strong>${entry.name}</strong>
                <p>${entry.description}</p>
              </div>
            </article>
          `).join("")}
        </div>
        <button class="header-button primary utility-close" data-action="dismiss-achievement-reveal">Take The Honor</button>
      </div>
    </section>
  `;
}

function renderUnlockRevealModal(reveal) {
  return `
    <section class="modal-backdrop">
      <div class="utility-modal unlock-reveal-modal">
        <p class="eyebrow">New Paths Stir</p>
        <h2>${reveal.title}</h2>
        <p class="utility-copy">${reveal.description}</p>
        <div class="unlock-reveal-building">${reveal.buildingName}</div>
        <div class="unlock-reveal-grid">
          ${reveal.unlockGroups.map((group) => `
            <div class="unlock-reveal-card">
              <span>${group.label}</span>
              <strong>${group.items.length === 1 ? group.items[0] : `${group.items.length} discoveries`}</strong>
              <div class="unlock-reveal-chip-row">
                ${group.items.map((item) => `<div class="base-chip accent">${item}</div>`).join("")}
              </div>
            </div>
          `).join("")}
        </div>
        <button class="header-button primary utility-close" data-action="dismiss-unlock-reveal">Back To The Outpost</button>
      </div>
    </section>
  `;
}

// Field Honors as their own screen. Carved out of the Outpost so the
// trophy wall doesn't compete with the actionable upgrade cards for
// attention. The Honors screen is reflective — players come here to
// see what they've achieved and what's still ahead, not to take
// immediate action on the run.
function renderHonors(profile) {
  const catalog = getAchievementCatalog();
  const unlocked = new Set(profile?.achievements?.unlocked || []);
  const earned = catalog.filter((entry) => unlocked.has(entry.id));
  const earnedCount = earned.length;
  const totalCount = catalog.length;
  const completionPct = totalCount ? Math.round((earnedCount / totalCount) * 100) : 0;
  const unlockReveal = profile.unlockReveal;
  const achievementReveal = profile.achievements?.reveal;
  return `
    <section class="hub-screen honors-screen">
      <div class="hub-phase-header honors-phase-header">
        <div class="hub-phase-copy">
          <p class="eyebrow">Field Honors</p>
          <h2>The Trophy Wall</h2>
          <p>Every honor below is a story the climb left in your hand. Earn one and the wall changes shape.</p>
        </div>
        ${renderHubModeSwitch("honors")}
      </div>
      <div class="honors-summary">
        <div class="honors-summary-stat">
          <span>Earned</span>
          <strong>${earnedCount} / ${totalCount}</strong>
        </div>
        <div class="honors-summary-progress">
          <div class="honors-summary-bar"><i style="width:${completionPct}%"></i></div>
          <span>${completionPct}% complete</span>
        </div>
      </div>
      <div class="honors-grid">
        ${catalog.map((entry) => {
          const isUnlocked = unlocked.has(entry.id);
          return `
            <article class="honor-card ${isUnlocked ? "is-earned" : "is-locked"}">
              <div class="honor-card-mark">${isUnlocked ? "★" : "·"}</div>
              <div class="honor-card-body">
                <strong>${isUnlocked ? entry.name : "Locked Honor"}</strong>
                <p>${isUnlocked ? entry.description : entry.hint || entry.description}</p>
              </div>
            </article>
          `;
        }).join("")}
      </div>
      ${unlockReveal
        ? renderUnlockRevealModal(unlockReveal)
        : achievementReveal ? renderAchievementRevealModal(achievementReveal) : ""}
    </section>
  `;
}

function renderHub(profile, setup, roster) {
  // Profile picker takes precedence over everything else when there's no
  // active profile selected — first launch, after a Switch Player click,
  // or after the active profile got deleted. The picker also wins when
  // setup.phase is explicitly "picker" or "create-profile".
  const phase = setup.phase || "home";
  const hasActiveProfile = !!roster?.activeProfileId;
  if (phase === "create-profile") {
    return renderProfileCreator(roster, setup);
  }
  if (!hasActiveProfile || phase === "picker") {
    return renderProfilePicker(roster, setup);
  }
  if (setup.view === "base") {
    return renderBase(profile);
  }
  if (setup.view === "honors") {
    return renderHonors(profile);
  }
  if (phase === "home") {
    return renderLanding(profile, setup);
  }
  const selectedLegend = setup.legendId ? getLegend(setup.legendId) : null;
  const selectedSpire = setup.spireId ? getSpire(setup.spireId) : null;
  const unlockedSpireIds = new Set(getUnlockedSpireIds(profile));
  const selectedSpireUnlocked = selectedSpire ? unlockedSpireIds.has(selectedSpire.id) : false;
  const tierFallbackId = setup.tierId || profile?.preferredTierId || DEFAULT_TIER_ID;
  const selectedTier = getClimbTier(tierFallbackId);
  const tierAllowsSpire = selectedSpire ? isSpireAllowedAtTier(selectedSpire.id, selectedTier.id) : true;
  const canBeginRun = !!selectedSpire && selectedSpireUnlocked && tierAllowsSpire;
  const heroCopy = phase === "legend"
    ? "Choose the legend who will answer the climb."
    : phase === "spire"
      ? `Choose the road ${selectedLegend?.name || "your legend"} will tread.`
      : `Choose the difficulty for this climb. The act-by-act ramp still happens — only the math content scales.`;

  const beginButtonLabel = selectedSpire
    ? selectedSpireUnlocked
      ? tierAllowsSpire
        ? `Begin ${selectedSpire.name}`
        : "Tier Blocks Spire"
      : "Portal Locked"
    : "Choose Spire First";

  const phaseHeader = phase === "legend"
    ? `
      <div class="hub-phase-header legend-phase-header">
        <div class="hub-phase-copy">
          <p class="eyebrow">Step 1 Of 3</p>
          <h2>Choose Your Legend</h2>
          <p>${heroCopy}</p>
        </div>
        <div class="legend-phase-actions">
          <button class="header-button ghost" data-action="open-base">Outpost</button>
          <button class="header-button ghost" data-action="back-to-home">Back</button>
          ${renderHubSteps(phase)}
        </div>
      </div>`
    : phase === "spire"
      ? `
      <div class="hub-phase-header">
        <div class="hub-phase-copy">
          <p class="eyebrow">Step 2 Of 3</p>
          <h2>Choose Your Spire</h2>
          <p>${heroCopy}</p>
        </div>
        <div class="phase-header-actions spire-header-actions">
          <div class="spire-top-actions">
            <button class="header-button ghost" data-action="open-base">Outpost</button>
            ${renderHubSteps(phase)}
          </div>
          ${renderSpirePhaseLegendTag(selectedLegend)}
        </div>
      </div>`
      : `
      <div class="hub-phase-header">
        <div class="hub-phase-copy">
          <p class="eyebrow">Step 3 Of 3</p>
          <h2>Choose Your Tier</h2>
          <p>${heroCopy}</p>
        </div>
        <div class="phase-header-actions tier-header-actions">
          <div class="spire-top-actions">
            <button class="header-button ghost" data-action="open-base">Outpost</button>
            <button class="header-button ghost" data-action="change-spire">Change Spire</button>
            ${renderHubSteps(phase)}
          </div>
          ${renderSpirePhaseLegendTag(selectedLegend)}
        </div>
      </div>`;

  const phaseBody = phase === "legend"
    ? `
      <div class="hub-section legend-stage-section">
        <div class="legend-select-grid legend-stage-grid">${renderLegendCards(setup)}</div>
      </div>`
    : phase === "spire"
      ? `
      <div class="hub-section spire-stage-section">
        <div class="spire-select-grid">${renderSpireCards(setup, profile)}</div>
        <div class="spire-stage-cta">
          <button class="header-button primary hub-start-button" data-action="advance-to-tier" ${selectedSpireUnlocked ? "" : "disabled"}>${selectedSpire ? (selectedSpireUnlocked ? `Continue To Tier` : "Portal Locked") : "Choose Spire First"}</button>
        </div>
      </div>`
      : `
      <div class="hub-section tier-stage-section">
        <div class="tier-select-grid">${renderTierCards({ ...setup, tierId: selectedTier.id }, profile)}</div>
        <div class="spire-stage-cta">
          <button class="header-button primary hub-start-button" data-action="start-run" ${canBeginRun ? "" : "disabled"}>${beginButtonLabel}</button>
        </div>
      </div>`;

  const hubScreenClass = phase === "tier" ? "hub-screen-tier" : phase === "spire" ? "hub-screen-spire" : "hub-screen-legend";

  return `
    <section class="hub-screen ${hubScreenClass}">
      ${phaseHeader}
      <div class="hub-body">
        ${phaseBody}
      </div>
    </section>
  `;
}

function getMapLayout(map) {
  const width = 780;
  const topPad = 110;
  const rowGap = 184;
  const nodes = [];
  map.forEach((row, rowIndex) => {
    row.forEach((node, nodeIndex) => {
      const x = row.length === 1 ? width / 2 : 140 + (nodeIndex * ((width - 280) / (row.length - 1)));
      const y = topPad + ((MAP_HEIGHT - 1 - rowIndex) * rowGap);
      nodes.push({ ...node, x, y });
    });
  });
  return { width, height: topPad * 2 + ((MAP_HEIGHT - 1) * rowGap), nodes };
}

function renderMap(run) {
  const layout = getMapLayout(run.map);
  const nodeMap = new Map(layout.nodes.map((node) => [node.id, node]));
  const visited = new Set(run.visitedNodeIds);
  const reachable = new Set(run.reachableNodeIds);
  const spire = getSpire(run.spireId);
  const act = getActForFloor(run.player.floor);

  const lines = layout.nodes.flatMap((node) => node.children.map((childId) => {
    const child = nodeMap.get(childId);
    if (!child) return "";
    const activePath = (visited.has(node.id) && reachable.has(childId)) || run.chosenNodeId === node.id;
    return `<line x1="${node.x}" y1="${node.y}" x2="${child.x}" y2="${child.y}" class="map-line ${activePath ? "active" : ""}" />`;
  })).join("");

  const buttons = layout.nodes.map((node) => {
    const isReachable = reachable.has(node.id) && node.floor === run.activeFloor;
    const isVisited = visited.has(node.id);
    const isFuture = node.floor > run.activeFloor;
    const classes = ["spire-node", `node-${node.type.toLowerCase()}`];
    if (isReachable) classes.push("is-active");
    if (isVisited) classes.push("is-visited");
    if (isFuture) classes.push("is-future");
    return `
      <button
        class="${classes.join(" ")}"
        style="left:${node.x}px;top:${node.y}px;"
        data-action="select-node"
        data-node-id="${node.id}"
        data-active-node="${isReachable ? "true" : "false"}"
        ${isReachable ? "" : "disabled"}
      >
        <span class="node-glyph">${renderArtBadge({ asset: NODE_ASSETS[node.type], fallback: NODE_ICONS[node.type], alt: titleize(node.type), className: "node-art" })}</span>
        <span class="node-type">${titleize(node.type)}</span>
      </button>
    `;
  }).join("");

  return `
    <section class="map-screen">
      <div class="screen-title-row">
        <div>
          <p class="eyebrow">${spire.name} | Act ${act}</p>
          <h2>The Obelisk</h2>
        </div>
        <button class="header-button subtle" data-action="return-hub">Return To Camp</button>
      </div>
      <div class="map-layout">
        <div class="map-main-column">
          ${renderRoutePanel(run)}
          <div class="map-scroll-shell" id="mapScrollShell">
            <div class="map-canvas" style="height:${layout.height}px;">
              <svg class="map-svg" viewBox="0 0 ${layout.width} ${layout.height}" preserveAspectRatio="xMidYMin meet">${lines}</svg>
              ${buttons}
            </div>
          </div>
        </div>
        ${renderRunRail(run)}
      </div>
    </section>
  `;
}

function renderRunRail(run) {
  const legend = getLegend(run.player.legendId);
  const spire = getSpire(run.spireId);
  const mechanics = getPlayerMechanicSummary(run.player);
  const skillTree = getSkillTreeState(run.player);
  const act = getActForFloor(run.player.floor);
  const herbTotal = Object.values(run.player.herbs || {}).reduce((sum, amount) => sum + Math.max(0, Number(amount || 0)), 0);
  const potionTotal = Object.values(run.player.potions || {}).reduce((sum, amount) => sum + Math.max(0, Number(amount || 0)), 0);
  const modifiers = getRunModifierSummary(run.player);
  const readyNodes = skillTree.lanes.reduce((sum, lane) => sum + lane.nodes.filter((node) => node.status === "available").length, 0);
  const ownedNodes = skillTree.lanes.reduce((sum, lane) => sum + lane.nodes.filter((node) => node.status === "owned").length, 0);
  const activePanel = run.routePanel || "";
  const panelButtons = [
    { id: "stats", label: "Stats", meta: `${run.player.stats.str}/${run.player.stats.vit}/${run.player.stats.focus}` },
    { id: "skill-tree", label: "Skill Tree", meta: `${ownedNodes} learned | ${readyNodes} ready` },
    { id: "omens", label: "Omens", meta: modifiers.length ? `${modifiers.length} active` : "quiet" },
    { id: "potions", label: "Potions", meta: `${herbTotal} herbs | ${potionTotal} tonics` },
    { id: "relics", label: "Relics", meta: `${run.player.relics.length} carried` },
  ];
  return `
    <aside class="run-rail">
      <section class="rail-card rail-summary-card">
        <p class="eyebrow">Field Ledger</p>
        <h3>${legend.name}</h3>
        <div class="snapshot-subline">${spire.name} | Act ${act} | ${seconds(getBattleTimeLimit(run))}</div>
        ${renderStatChips(run.player.stats, mechanics, "rail-stats")}
        <div class="rail-summary-strip">
          <div class="snapshot-item compact-tree-item"><strong>Energy</strong><span>${mechanics.energyPerTurn} each turn</span></div>
          <div class="snapshot-item compact-tree-item"><strong>Ultimate</strong><span>${mechanics.ultimateThreshold} spent</span></div>
          <div class="snapshot-item compact-tree-item"><strong>Relics</strong><span>${run.player.relics.length} carried</span></div>
        </div>
      </section>
      <section class="rail-card rail-nav-card">
        <p class="eyebrow">Field Kit</p>
        <div class="rail-nav-list">
          ${panelButtons.map((panel) => `
            <button
              class="rail-nav-button ${activePanel === panel.id ? "is-active" : ""}"
              data-action="toggle-route-panel"
              data-route-panel="${panel.id}"
            >
              <span>${panel.label}</span>
              <em>${panel.meta}</em>
            </button>
          `).join("")}
        </div>
      </section>
    </aside>
  `;
}

function renderRoutePanel(run) {
  const panel = run.routePanel || "";
  if (!panel) return "";

  const legend = getLegend(run.player.legendId);
  const mechanics = getPlayerMechanicSummary(run.player);
  const skillTree = getSkillTreeState(run.player);
  const modifiers = getRunModifierSummary(run.player);
  const herbTotal = Object.values(run.player.herbs || {}).reduce((sum, amount) => sum + Math.max(0, Number(amount || 0)), 0);
  const potionTotal = Object.values(run.player.potions || {}).reduce((sum, amount) => sum + Math.max(0, Number(amount || 0)), 0);
  const logNote = run.log[run.log.length - 1] || "Choose the next foothold when you're ready.";
  const panelLabels = {
    stats: "Stats",
    "skill-tree": "Skill Tree",
    omens: "Omens",
    potions: "Potions",
    relics: "Relics",
  };

  const panelMeta = {
    stats: `${run.player.stats.str}/${run.player.stats.vit}/${run.player.stats.focus}`,
    "skill-tree": `${skillTree.points} point${skillTree.points === 1 ? "" : "s"} banked`,
    omens: modifiers.length ? `${modifiers.length} active` : "No active omens",
    potions: `${herbTotal} herbs | ${potionTotal} tonics`,
    relics: `${run.player.relics.length} carried`,
  };

  let body = "";
  if (panel === "stats") {
    body = `
      <div class="route-panel-grid stats-grid">
        <div class="snapshot-item"><strong>Passive</strong><span>${legend.passive}</span></div>
        <div class="snapshot-item"><strong>Pace</strong><span>${ACT_TIME_LIMITS.map((limit) => seconds(limit)).join(" / ")}</span></div>
        <div class="snapshot-item"><strong>Power</strong><span>STR +${mechanics.strPowerPct}% | FOCUS +${mechanics.focusCritChancePct}% crit</span></div>
        <div class="snapshot-item"><strong>Crit</strong><span>FOCUS +${mechanics.focusCritPowerPct}% crit damage</span></div>
      </div>
    `;
  }

  if (panel === "skill-tree") {
    body = `
      <div class="route-panel-grid talent-grid compact-lane-grid">
        ${skillTree.lanes.map((lane) => {
          const owned = lane.nodes.filter((node) => node.status === "owned").length;
          const available = lane.nodes.filter((node) => node.status === "available").length;
          return `<div class="snapshot-item compact-tree-item"><strong>${lane.name}</strong><span>${owned} learned${available ? ` | ${available} ready` : ""}</span></div>`;
        }).join("")}
      </div>
      <div class="route-panel-actions">
        <button class="header-button primary talent-open-button" data-action="open-skill-tree">${skillTree.points > 0 ? `Spend ${skillTree.points} Point${skillTree.points === 1 ? "" : "s"}` : "View Skill Tree"}</button>
      </div>
    `;
  }

  if (panel === "potions") {
    body = `
      <div class="route-panel-potions">
        ${renderHerbPills(run.player.herbs, { includeEmpty: true })}
        ${renderPotionRack(run.player, { mode: "map" })}
      </div>
    `;
  }

  if (panel === "omens") {
    body = `
      <div class="route-panel-grid omen-grid">
        ${renderModifierRows(modifiers)}
      </div>
    `;
  }

  if (panel === "relics") {
    body = `
      <div class="route-panel-grid relics-grid">
        <div class="relic-chip-row">
          ${run.player.relics.length
            ? run.player.relics.map((relic) => `<div class="relic-chip tooltip-anchor" title="${relic.description}" ${tooltipAttr(relic.description)} tabindex="0"><strong>${relic.name}</strong><span>${relic.rarity}</span></div>`).join("")
            : `<div class="relic-chip muted">Relic satchel empty</div>`}
        </div>
        <div class="rail-last-note">${logNote}</div>
      </div>
    `;
  }

  return `
    <section class="route-stage-panel" data-route-panel-stage="${panel}">
      <div class="route-stage-panel-head">
        <div>
          <p class="eyebrow">Field Kit</p>
          <h3>${panelLabels[panel] || "Field Notes"}</h3>
        </div>
        <div class="route-stage-panel-tools">
          <span>${panelMeta[panel] || ""}</span>
          <button class="header-button ghost route-stage-close" data-action="toggle-route-panel" data-route-panel="${panel}">Close</button>
        </div>
      </div>
      ${body}
    </section>
  `;
}

const TECHNIQUE_LABELS = {
  "knight-shield-rush":      "Strike → Shield Rush (ATK+barrier)",
  "knight-bulwark-form":     "Guard → Bulwark Form (heavy ward)",
  "knight-sanctuary-banner": "Unlocks Sanctuary Banner (UTIL: heal+barrier)",
  "knight-execution-drive":  "Strike → Execution Drive (2-hit finisher)",
  "wizard-arc-lash":         "Strike → Arc Lash (3-hit AOE roam)",
  "wizard-rune-spear":       "Strike → Rune Spear (precision crit bolt)",
  "wizard-restoration-sigil":"Unlocks Restoration Sigil (UTIL: heal+ward)",
  "wizard-chain-burst":      "Sunder Wave → Chain Burst (5-hit AOE storm)",
  "rogue-slice-and-dice":    "Strike → Slice and Dice (roaming flurry)",
  "rogue-night-bloom":       "Strike → Night Bloom (assassin string)",
  "rogue-fan-of-knives":     "Sunder Wave → Fan of Knives (full-field ricochet)",
};

// Skill node level scales the numeric value of most effects.
// L1 = 1.0x, L2 = 1.2x, L3 = 1.4x.
const SKILL_LEVEL_MULTIPLIERS = [0, 1, 1.2, 1.4];

function getSkillLevelMultiplier(level = 1) {
  const clamped = Math.max(1, Math.min(3, level));
  return SKILL_LEVEL_MULTIPLIERS[clamped] ?? 1;
}

// formatSkillEffect now returns an array of chip objects:
//   { keywordId, name, definition, valueLabel, isReforge }
// Each chip pairs a keyword (canonical name + universal definition) with
// its value at the node's current level. The renderer composes chips into
// the visual chip + glossary block.
//
// REFORGE chips carry a custom valueLabel (the technique name) since
// "Reforges Strike → Arc Lash" is more useful than just "Reforge".
function formatSkillEffect(effect = {}, level = 1) {
  const mult = getSkillLevelMultiplier(level);
  const chips = [];
  for (const [effectKey, value] of Object.entries(effect)) {
    if (value === false || value === 0 || value === null || value === undefined) continue;
    const mapping = EFFECT_TO_KEYWORD[effectKey];
    if (!mapping) continue;
    const keyword = KEYWORDS[mapping.keywordId];
    if (!keyword) continue;
    let valueLabel = "";
    if (mapping.format === "boolean") {
      valueLabel = "";
    } else {
      const formatter = KEYWORD_FORMATS[mapping.format] || ((v) => `${v}`);
      const scaled = mapping.levelScales ? value * mult : value;
      const rounded = mapping.format === "pct"
        ? Math.round(scaled * 100) / 100
        : Math.round(scaled);
      valueLabel = formatter(rounded);
    }
    const chip = {
      keywordId: keyword.id,
      name: keyword.name,
      definition: keyword.definition,
      valueLabel,
      isReforge: keyword.id === "REFORGE",
    };
    // Reforge chips show "Reforges X → Y" as the value, using the
    // existing TECHNIQUE_LABELS table for the destination action.
    if (chip.isReforge && typeof value === "string") {
      chip.valueLabel = TECHNIQUE_LABELS[value] || `Unlocks ${value}`;
    }
    chips.push(chip);
  }
  return chips;
}

// Find a node anywhere in the tree by id. Used by the right-rail detail
// pane to look up the currently-selected node across all lanes.
function findSkillNodeInTree(tree, nodeId) {
  if (!nodeId) return null;
  for (const lane of tree.lanes) {
    const found = lane.nodes.find((node) => node.id === nodeId);
    if (found) return { node: found, lane };
  }
  return null;
}

// Right-rail detail pane. Shows the focused skill node's flavor, keyword
// chips with universal definitions (Hearthstone pattern), prerequisites,
// level info, and a Learn button. Replaces the unreliable hover-tooltip
// read-it path. Click any node card to focus it here.
function renderSkillTreeDetail(tree, selection) {
  if (!selection) {
    return `
      <aside class="skill-tree-detail skill-tree-detail-empty">
        <p class="eyebrow">Detail</p>
        <p class="utility-copy">Click a node to inspect it. The Learn button appears here when a node is available and you have points to spend.</p>
      </aside>
    `;
  }
  const { node, lane } = selection;
  const chips = formatSkillEffect(node.effect || {}, node.level || 1);
  const isMaxed = node.status === "owned" && !node.isUpgradeable;
  const canAct = (node.status === "available" || node.isUpgradeable) && tree.points > 0;
  const learnLabel = isMaxed
    ? "Maxed"
    : node.isUpgradeable
      ? `Upgrade to L${(node.level || 0) + 1}`
      : node.status === "available"
        ? `Learn (1 point)`
        : "Locked";
  // Resolve prerequisite labels for the rail's "Requires" line.
  const prereqLabels = (node.requires || []).map((reqId) => {
    for (const candidateLane of tree.lanes) {
      const found = candidateLane.nodes.find((n) => n.id === reqId);
      if (found) return found.label;
    }
    return reqId;
  });
  const chipsHtml = chips.length
    ? chips.map((chip) => {
        const valueHtml = chip.valueLabel
          ? `<span class="skill-chip-value">${escapeAttr(chip.valueLabel)}</span>`
          : "";
        return `
          <div class="skill-chip skill-chip-${chip.isReforge ? "reforge" : "passive"}">
            <span class="skill-chip-name">${escapeAttr(chip.isReforge ? "Reforge" : chip.name)}</span>
            ${valueHtml}
          </div>
        `;
      }).join("")
    : `<p class="skill-chip-empty">No mechanical effect.</p>`;
  const glossaryHtml = chips.length
    ? `
      <div class="skill-glossary">
        ${chips.map((chip) => `
          <p class="skill-glossary-line">
            <strong>${escapeAttr(chip.isReforge ? "Reforge" : chip.name)}</strong>
            <span> — ${escapeAttr(chip.isReforge ? "Replaces a base action with a new variant." : chip.definition)}</span>
          </p>
        `).join("")}
      </div>
    `
    : "";
  const prereqHtml = prereqLabels.length
    ? `
      <div class="skill-detail-prereqs">
        <p class="eyebrow">Requires</p>
        <ul>${prereqLabels.map((label) => `<li>${escapeAttr(label)}</li>`).join("")}</ul>
      </div>
    `
    : "";
  return `
    <aside class="skill-tree-detail">
      <header class="skill-detail-head">
        <p class="eyebrow">${escapeAttr(lane.name)} · Tier ${node.tier}</p>
        <h3>${escapeAttr(node.label)}</h3>
        ${node.maxLevel > 1 ? `<p class="skill-detail-level">Level ${node.level || 0} / ${node.maxLevel}</p>` : ""}
      </header>
      <p class="skill-detail-description">${escapeAttr(node.description || "")}</p>
      <div class="skill-detail-chips">${chipsHtml}</div>
      ${glossaryHtml}
      ${prereqHtml}
      <button
        class="header-button primary skill-detail-learn"
        data-action="unlock-skill-node"
        data-skill-node-id="${node.id}"
        ${canAct ? "" : "disabled"}
      >${escapeAttr(learnLabel)}</button>
    </aside>
  `;
}

function renderSkillTree(run) {
  const tree = getSkillTreeState(run.player);
  const selection = findSkillNodeInTree(tree, run.selectedSkillNodeId);
  return `
    <section class="modal-backdrop">
      <div class="utility-modal skill-tree-modal skill-tree-modal-split">
        <div class="skill-tree-head">
          <div>
            <p class="eyebrow">Run Skill Tree</p>
            <h2>${tree.title}</h2>
            <p class="utility-copy">Click a node to inspect it. Spend points from the detail panel to shape this climb.</p>
          </div>
          <div class="skill-tree-points">
            <span>Points</span>
            <strong>${tree.points}</strong>
          </div>
        </div>
        <div class="skill-tree-body">
          <div class="skill-tree-lanes">
            ${tree.lanes.map((lane) => `
              <div class="skill-lane" data-skill-lane="${lane.id}">
                <div class="skill-lane-head">
                  <p class="eyebrow">${lane.name}</p>
                  <span>${lane.theme}</span>
                </div>
                <div class="skill-lane-track">
                  ${lane.nodes.map((node, index) => {
                    const isMaxed = node.status === "owned" && !node.isUpgradeable;
                    const badgeLabel = isMaxed ? "Maxed" : node.isUpgradeable ? `Upgrade → L${(node.level || 0) + 1}` : node.status === "available" ? "Learn" : "Locked";
                    const isSelected = node.id === run.selectedSkillNodeId;
                    const levelChip = node.maxLevel > 1
                      ? `<span class="skill-node-level-chip">L${node.level || 0}/${node.maxLevel}</span>`
                      : "";
                    return `
                    <div class="skill-node-step ${index === lane.nodes.length - 1 ? "is-last" : ""}">
                      <div class="skill-node-spine" aria-hidden="true">
                        <span class="skill-node-orb skill-node-orb-${isMaxed ? "owned" : node.status}">${node.tier}</span>
                        ${index === lane.nodes.length - 1 ? "" : `<span class="skill-node-link"></span>`}
                      </div>
                      <button
                        class="skill-node skill-node-compact skill-node-${isMaxed ? "owned" : node.status} ${isSelected ? "is-selected" : ""}"
                        data-action="select-skill-node"
                        data-skill-node-id="${node.id}"
                      >
                        <div class="skill-node-name-row">
                          <strong>${node.label}</strong>
                          ${levelChip}
                        </div>
                        <em class="skill-node-badge skill-node-badge-${isMaxed ? "owned" : node.status}">${badgeLabel.replace("â†’", "to")}</em>
                      </button>
                    </div>
                  `}).join("")}
                </div>
              </div>
            `).join("")}
          </div>
          ${renderSkillTreeDetail(tree, selection)}
        </div>
        <div class="utility-actions">
          <button class="header-button ghost" data-action="close-skill-tree">Close</button>
        </div>
      </div>
    </section>
  `;
}

function renderStatOverlay(run) {
  if (!run || run.player.statPoints <= 0 || run.screen === SCREEN.BATTLE) {
    return "";
  }

  return `
    <section class="stat-overlay">
      <div class="overlay-title"><span>Attribute Points</span><strong>${run.player.statPoints}</strong></div>
      <div class="stat-row"><span>STR ${run.player.stats.str}</span><button data-action="spend-stat" data-stat="str" title="+1 STR increases action power with diminishing returns.">+</button></div>
      <div class="stat-row"><span>VIT ${run.player.stats.vit}</span><button data-action="spend-stat" data-stat="vit" title="+1 VIT grants +10 max HP.">+</button></div>
      <div class="stat-row"><span>FOCUS ${run.player.stats.focus}</span><button data-action="spend-stat" data-stat="focus" title="+1 FOCUS increases both crit chance and crit damage. Fast answers increase crit chance only.">+</button></div>
      <p>STR adds power. VIT adds max HP. FOCUS adds crit chance and crit damage. Fast answers boost crit chance only.</p>
    </section>
  `;
}

function renderBattleEffects(effects = []) {
  if (!effects.length) return "";
  return effects.map((effect) => `
    <div
      class="battle-effect effect-${effect.type} target-${effect.target} tone-${effect.tone}"
      style="--lane:${effect.lane || 0}; --effect-delay:${effect.delay || 0}ms;"
      aria-hidden="true"
    ></div>
  `).join("");
}

function renderBattle(run, timeLeft) {
  const battle = run.battle;
  const player = run.player;
  const legend = getLegend(player.legendId);
  const spire = getSpire(run.spireId);
  const act = getActForFloor(player.floor);
  const ultimateUnlocked = !!player.ultimateUnlocked;
  const timeLimitMs = getBattleTimeLimit(run);
  const timeSecondsLeft = Math.max(0, Math.ceil((timeLeft * timeLimitMs) / 1000));
  const selectedAction = battle.hand.find((action) => action.id === battle.selectedActionId) || null;
  const isEnemyPhase = !!battle.pendingEnemyPhase;
  const isVictoryBeat = !!battle.pendingVictory;
  const showBurst = battle.feedback && !["Choose an action.", "Solve fast."].includes(battle.feedback);
  const playerMotionClass = battle.playerMotion ? `motion-${battle.playerMotion}` : "";
  const activeBuffs = getBattleBuffSummary(player);
  const actionCards = battle.hand.map((action, handIndex) => {
    const info = describeActionPreviewClean(player, action);
    const impactLabel = formatCompactImpact(action, info);
    const liveCost = getActionCost(player, action, { turnActionsPlayed: battle.turnActionsPlayed || 0 });
    const affordable = canAffordAction(player, battle, action);
    const title = affordable ? info.label : (action.type === "ULTIMATE"
      ? `${info.label} | Spend more energy this battle to ready this ultimate.`
      : `${info.label} | Not enough energy right now.`);
    return `
      <button
        class="combat-card ${action.color} ${affordable ? "" : "is-disabled"}"
        data-action="select-action"
        data-action-id="${action.id}"
        title="${title}"
        style="--hand-index:${handIndex};"
        ${affordable && !isEnemyPhase ? "" : "disabled"}
      >
        <div class="combat-card-key">${action.hotkey}</div>
        <div class="combat-card-cost">${action.type === "ULTIMATE" ? (battle.ultimateReadyCount > 0 ? "READY" : `${battle.ultimateCharge}/${battle.ultimateThreshold}`) : `${liveCost} EN`}</div>
        <div class="combat-card-title">${action.name}</div>
        <div class="combat-card-meta">
          ${action.difficulty
            ? `<span class="combat-card-difficulty combat-card-difficulty-${action.difficulty.toLowerCase()}">${action.difficulty}</span>`
            : ""}
          <span class="combat-card-type">${action.type}${action.level ? ` · L${action.level}` : ""}${action.type === "ULTIMATE" ? ` · ${legend.name}` : ""}</span>
        </div>
        <div class="combat-card-impact">${impactLabel}</div>
        <div class="combat-card-detail">${action.detail || ""}</div>
      </button>
    `;
  }).join("");
  const popups = (battle.damagePopups || []).map((popup, index) => `
    <div class="damage-popup ${popup.style} ${popup.target} ${popup.variant || ""}" style="--lane:${popup.lane || 0}; --popup-index:${index}; --popup-delay:${popup.delayMs || 0}ms; --popup-offset-x:${popup.offsetX || 0}px; --popup-offset-y:${popup.offsetY || 0}px; --popup-tilt:${popup.tiltDeg || 0}deg;">
      <span>${popup.style.includes("damage") || popup.style.includes("crit") ? "-" : popup.style === "status" ? "" : "+"}${popup.amount || ""}</span>
      ${popup.style.startsWith("crit") ? `<em>${popup.style === "crit-bonus" || popup.style === "crit-bonus-total" ? "CRIT+50%" : "CRIT"}</em>` : ""}
      ${popup.tag ? `<em>${popup.tag}</em>` : ""}
    </div>
  `).join("");
  const energyPips = Array.from({ length: battle.energyMax || 0 }, (_, index) => `
    <span class="energy-pip ${index < battle.energy ? "is-filled" : ""}"></span>
  `).join("");
  const ultimatePct = `${Math.max(0, Math.min(100, ((battle.ultimateCharge || 0) / Math.max(1, battle.ultimateThreshold || 1)) * 100)).toFixed(1)}%`;
  const potionRow = renderPotionRack(player, { mode: "battle", battle });

  return `
    <section class="battle-screen ${selectedAction ? "is-solving" : ""} ${isEnemyPhase ? "is-enemy-phase" : ""}">
      <div class="battle-popups">${popups}</div>
      <div class="battle-effects">${renderBattleEffects(battle.effects || [])}</div>
      ${battle.phaseCue ? `<div class="turn-phase-banner ${isEnemyPhase ? "enemy" : "player"}">${battle.phaseCue}</div>` : ""}
      <div class="battle-upper">
        <div class="player-panel ${playerMotionClass}">
          <div class="player-avatar-wrap">
            <div class="player-avatar ${legend.color}">${renderArtBadge({ asset: legend.asset, fallback: legend.icon, alt: legend.name, className: "avatar-art player-art" })}</div>
            ${player.block > 0 ? `<div class="player-block-ring">${player.block}</div>` : ""}
          </div>
          <div class="player-info">
            <div class="player-name-pill">${legend.name}</div>
            <div class="health-stack">
              <div class="meter-row"><span>HP</span><div class="meter"><i style="width:${pct(player.hp / player.maxHp)}"></i></div></div>
              <div class="player-health-copy">${player.hp} / ${player.maxHp} HP | Combo ${player.combo}</div>
            </div>
            ${activeBuffs.length ? `<div class="player-buff-strip">${activeBuffs.map((buff) => `<span class="player-buff-pill" title="${escapeAttr(buff.description)}">${buff.label} ${buff.turns}T</span>`).join("")}</div>` : ""}
          </div>
        </div>
        <div class="enemy-stage">
          ${battle.enemies.map((enemy) => `
            <button class="enemy-panel ${battle.targetEnemyId === enemy.id ? "is-targeted" : ""} ${isEnemyPhase && !enemy.statuses?.stun ? "is-attacking" : ""}" data-action="target-enemy" data-enemy-id="${enemy.id}" ${isEnemyPhase ? "disabled" : ""}>
              <div class="enemy-intent-pill">${enemy.intent.value} DMG</div>
              ${enemy.statuses?.stun ? `<div class="enemy-status-pill">STUN</div>` : ""}
              <div class="enemy-avatar">${renderArtBadge({ asset: enemy.asset, fallback: enemy.icon, alt: enemy.name, className: "avatar-art enemy-art" })}</div>
              <div class="meter enemy-meter"><i style="width:${pct(enemy.hp / enemy.maxHp)}"></i></div>
              <div class="enemy-copy">${enemy.name}</div>
            </button>
          `).join("")}
        </div>
      </div>
      <div class="combat-tray">
        ${selectedAction ? `<div class="tray-timer"><i id="battleTimerFill" style="width:${pct(timeLeft)}"></i></div>` : ""}
        <div class="combat-context">${spire.name} | Act ${act} | ${seconds(timeLimitMs)} timer${selectedAction ? ` | ${timeSecondsLeft}s left` : ""}</div>
        <div class="combat-toolbar">
          <div class="energy-cluster" title="Energy resets at the start of each player turn. Actions spend energy when answered.">
            <span class="energy-label">Energy</span>
            <div class="energy-pips">${energyPips}</div>
            <strong>${battle.energy}/${battle.energyMax}</strong>
          </div>
          <div class="ultimate-cluster ${ultimateUnlocked ? "" : "is-locked"}" title="${ultimateUnlocked ? "Spend energy during battle to charge your character-specific ultimate." : "Train at a rest site to awaken your ultimate."}">
            <span class="energy-label">Ultimate</span>
            ${ultimateUnlocked
              ? `<div class="ultimate-meter"><i style="width:${ultimatePct}"></i></div>
                 <strong>${battle.ultimateReadyCount > 0 ? `Ready x${battle.ultimateReadyCount}` : `${battle.ultimateCharge}/${battle.ultimateThreshold}`}</strong>`
              : `<div class="ultimate-meter locked"><i style="width:0%"></i></div>
                 <strong>Sealed</strong>`}
          </div>
          <button
            class="header-button subtle combat-end-turn"
            data-action="end-turn"
            ${selectedAction || isEnemyPhase || isVictoryBeat ? "disabled" : ""}
            title="End your turn now and let enemies act."
          >
            End Turn
          </button>
        </div>
        <div class="combat-turn-note">${battle.turnNote || "Spend energy carefully and keep the pressure on."}</div>
        <div class="battle-potion-strip">
          <span class="belt-label">Belt${battle.potionUsedThisTurn ? " | Used" : ""}</span>
          ${potionRow}
        </div>
        ${isVictoryBeat ? `
          <div class="problem-stage victory-beat-stage">
            <div class="problem-text">Encounter Cleared</div>
          </div>
        ` : !selectedAction ? `
          <div class="action-hand">${actionCards}</div>
        ` : `
          <div class="problem-stage">
            <div class="problem-header">
              <span>${selectedAction.name}</span>
              <span>${selectedAction.type === "ULTIMATE" ? "CHARGED" : `${battle.selectedActionCost ?? getActionCost(player, selectedAction, { turnActionsPlayed: battle.turnActionsPlayed || 0 })} EN`}</span>
              <span>${selectedAction.type === "ULTIMATE" ? `${battle.ultimateReadyCount} ready` : `${Math.max(0, battle.energy - (battle.selectedActionCost ?? 0))} left after play`}</span>
            </div>
            <div class="problem-text">${selectedAction.problem.text}</div>
            <div class="answer-grid">
              ${selectedAction.problem.options.map((option, index) => `
                <button class="answer-button" data-action="answer" data-answer="${option}" style="--answer-index:${index};">
                  <span class="answer-key">KEY ${index + 1}</span>
                  <span>${option}</span>
                </button>
              `).join("")}
            </div>
          </div>
        `}
      </div>
      ${showBurst ? `<div class="feedback-burst ${battle.feedback.includes("CRITICAL") ? "critical" : ""}">${battle.feedback}</div>` : ""}
    </section>
  `;
}

function renderVictory(run) {
  const reward = run.reward;
  return `
    <section class="modal-backdrop">
      <div class="victory-modal">
        <div class="modal-accent"></div>
        <div class="victory-scroll no-scroll-needed">
        <div class="victory-title-row">
          <div class="victory-title-copy">
            <p class="eyebrow">Encounter Cleared</p>
            <h2>${reward.leveled ? "Level Up!" : "Spoils Claimed"}</h2>
            <p class="victory-subcopy">Choose one prize for the road, then press deeper into the spire.</p>
          </div>
          ${reward.leveled ? `<div class="levelup-banner">LEVEL ${run.player.level + 1}</div>` : ""}
          </div>
          <div class="reward-grid">
            <div><span>XP</span><strong>+${reward.xp}</strong></div>
            <div><span>Gold</span><strong>+${reward.gold}</strong></div>
            <div><span>Accuracy</span><strong>${reward.accuracy}%</strong></div>
            <div><span>Crits</span><strong>${run.battle?.battleStats.crits || 0}</strong></div>
          </div>
          <div class="victory-bonus-row">
            ${renderRewardMaterials(reward.materials)}
            ${renderRewardHerbs(reward.herbs)}
            ${reward.relic ? renderRelicRewardCard(reward.relic, "Elite Relic") : ""}
          </div>
          <div class="draft-header compact">
            <p class="eyebrow">War Chest</p>
            <h3>Choose One Prize</h3>
          </div>
          <div class="reward-draft-grid">
            ${reward.trainingChoices.map((choice, rewardIndex) => `
              <button class="reward-draft-card ${reward.selectedTrainingId === choice.id ? "is-selected" : ""}" data-action="choose-victory-reward" data-reward-id="${choice.id}" style="--reward-index:${rewardIndex};">
                <strong>${choice.label}</strong>
                <span>${choice.description}</span>
              </button>
            `).join("")}
            <button class="reward-draft-card skip-card ${!reward.selectedTrainingId ? "is-selected" : ""}" data-action="choose-victory-reward" data-reward-id="skip" style="--reward-index:${reward.trainingChoices.length};">
              <strong>Pass For Now</strong>
              <span>Travel light and keep climbing.</span>
            </button>
          </div>
        </div>
        <div class="victory-footer">
          <button class="header-button primary continue-ascent-button" data-action="claim-victory">Continue Ascent</button>
        </div>
      </div>
    </section>
  `;
}

function renderRunReport(run) {
  const report = run.runReport;
  const legend = getLegend(report.legendId || run.player.legendId);
  const spire = getSpire(report.spireId || run.spireId);
  const stars = Array.from({ length: 3 }, (_, index) => `
    <div class="run-report-star ${index < report.stars ? "is-earned" : ""}" style="--star-index:${index};">
      <span>&#9733;</span>
    </div>
  `).join("");

  return `
    <section class="modal-backdrop">
      <div class="victory-modal run-report-modal">
        <div class="modal-accent"></div>
        <div class="run-report-head">
          <p class="eyebrow">Summit Record</p>
          <h2>${spire.name} Conquered</h2>
          <p class="run-report-subcopy">${legend.name} reached the summit of Act 3. The frontier records your climb.</p>
        </div>
        <div class="run-report-stars">
          ${stars}
        </div>
        <div class="run-report-grid">
          <div><span>Total Time</span><strong>${formatRunDuration(report.elapsedMs)}</strong></div>
          <div><span>Accuracy</span><strong>${report.accuracy}%</strong></div>
          <div><span>Foes Defeated</span><strong>${report.monstersKilled}</strong></div>
          <div><span>Crits Landed</span><strong>${report.totalCrits}</strong></div>
        </div>
        <div class="run-report-grid secondary">
          <div><span>Battles</span><strong>${report.battlesCleared}</strong></div>
          <div><span>Elites</span><strong>${report.elitesCleared}</strong></div>
          <div><span>Bosses</span><strong>${report.bossesCleared}</strong></div>
          <div><span>Total Damage</span><strong>${report.damageDone}</strong></div>
        </div>
        <div class="run-report-reasons">
          ${report.starReasons.map((reason, index) => `
            <div class="run-report-reason ${index < report.stars ? "is-earned" : ""}" style="--star-index:${index};">
              <span>Star ${index + 1}</span>
              <strong>${reason}</strong>
            </div>
          `).join("")}
        </div>
        <div class="victory-footer run-report-footer">
          <button class="header-button primary" data-action="finish-run-report">Return To Camp</button>
        </div>
      </div>
    </section>
  `;
}

function renderEvent(run) {
  const event = run.eventOffer;
  return `
    <section class="modal-backdrop">
      <div class="utility-modal event-modal">
        <p class="eyebrow">Omen Chamber</p>
        <h2>${event.title}</h2>
        <p class="utility-copy">${event.text}</p>
        <div class="utility-grid triple event-choice-grid">
          ${event.choices.map((choice) => `
            <button class="utility-card event-card ${choice.disabled ? "is-disabled" : ""}" data-action="event-choice" data-choice="${choice.id}" ${choice.disabled ? "disabled" : ""}>
              <span class="event-card-tag">${choice.disabled ? "Unavailable" : "Choice"}</span>
              <strong>${choice.label}</strong>
              <p>${choice.description}</p>
              ${choice.disabledReason ? `<em>${choice.disabledReason}</em>` : ""}
            </button>
          `).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderRest(run) {
  const training = getNextRestTraining(run.player);
  const healAmount = Math.floor(run.player.maxHp * 0.4);
  const missingHp = Math.max(0, run.player.maxHp - run.player.hp);
  const recoverValue = Math.min(healAmount, missingHp);
  const lowestAction = [...(run.player.actions || [])].sort((left, right) => {
    if ((left.level || 1) !== (right.level || 1)) return (left.level || 1) - (right.level || 1);
    return String(left.name || "").localeCompare(String(right.name || ""));
  })[0] || null;
  return `
    <section class="modal-backdrop">
      <div class="utility-modal scenic-modal rest-modal">
        <div class="rest-hero">
          ${renderUtilityScene(UTILITY_SCENES.rest, "Sanctuary", "The chamber hums with quiet rites and green flame.")}
          <div class="rest-hero-rail">
            <div class="rest-vitals">
              <span>Condition</span>
              <strong>${run.player.hp} / ${run.player.maxHp}</strong>
              <em>${missingHp > 0 ? `${recoverValue} HP recoverable here` : "Already fighting fit"}</em>
            </div>
            <div class="rest-guidance">
              <span>Forge Note</span>
              <strong>${lowestAction ? `${lowestAction.name} is ready for tempering` : "Your kit is steady"}</strong>
              <p>Take the line that best shapes the next floor, not the one that feels safest.</p>
            </div>
          </div>
        </div>
        <div class="rest-toolbar">
          <div class="rest-toolbar-copy">
            <strong>Choose how this chamber changes the run.</strong>
            <span>Recovery, tempering, and discipline all matter. Only one leaves with you.</span>
          </div>
        </div>
        <div class="rest-choice-grid">
          <button class="utility-card rest-choice-card recover" data-action="rest-choice" data-choice="heal">
            <div class="rest-choice-top">
              <span class="rest-choice-type">Recover</span>
              <em>+${recoverValue} HP</em>
            </div>
            <strong>Bind Wounds</strong>
            <p>Draw on the chamber fire and restore 40% of your maximum health.</p>
          </button>
          <button class="utility-card rest-choice-card temper" data-action="rest-choice" data-choice="temper">
            <div class="rest-choice-top">
              <span class="rest-choice-type">Temper</span>
              <em>${lowestAction ? `${lowestAction.name} L${lowestAction.level}` : "Kit Ready"}</em>
            </div>
            <strong>Sharpen The Kit</strong>
            <p>${lowestAction ? `Raise ${lowestAction.name}, your lowest-level action, by one rank.` : "Refine the weakest edge in your current loadout."}</p>
          </button>
          <button class="utility-card rest-choice-card train" data-action="rest-choice" data-choice="train">
            <div class="rest-choice-top">
              <span class="rest-choice-type">Discipline</span>
              <em>${training.iconLabel || "TREE"}</em>
            </div>
            <strong>${training.title}</strong>
            <p>${training.description}</p>
          </button>
        </div>
      </div>
    </section>
  `;
}

function renderMinigame(run) {
  const minigame = run.minigameOffer;
  const lastRound = [...(minigame.history || [])].reverse()[0] || null;
  return `
    <section class="modal-backdrop">
      <div class="utility-modal minigame-modal">
        <p class="eyebrow">Broker's Wager</p>
        <h2>${minigame.title}</h2>
        <p class="utility-copy">${minigame.subtitle}</p>
        <div class="minigame-scoreboard">
          <div><span>You</span><strong>${minigame.playerWins}</strong></div>
          <div><span>Broker</span><strong>${minigame.foeWins}</strong></div>
          <div><span>Round</span><strong>${minigame.round}</strong></div>
        </div>
        ${lastRound ? `<div class="minigame-last-round">Last round: ${lastRound.playerMove} vs ${lastRound.foeMove} | ${lastRound.winner === "draw" ? "draw" : lastRound.winner === "player" ? "you won" : "broker won"}</div>` : ""}
        <div class="utility-grid triple">
          ${minigame.moves.map((move) => `
            <button class="utility-card minigame-move-card" data-action="play-minigame-move" data-move-id="${move.id}">
              <strong>${move.label}</strong>
              <span>${move.id === "stone" ? "Breaks Shears." : move.id === "scroll" ? "Binds Stone." : "Cuts Scroll."}</span>
            </button>
          `).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderTreasure(run) {
  const relic = run.treasureOffer?.relic || null;
  const goldBonus = Math.max(0, Number(run.treasureOffer?.goldBonus || 0));
  return `
    <section class="modal-backdrop">
      <div class="utility-modal scenic-modal treasure-modal">
        <div class="treasure-hero">
          ${renderUtilityScene(UTILITY_SCENES.treasure, "Vault", "A sealed cache has been pried open beneath the spire.")}
          <div class="treasure-hero-rail">
            <div class="treasure-hero-pill">
              <span>Vault Purse</span>
              <strong>+${goldBonus}</strong>
              <em>gold recovered</em>
            </div>
            <div class="treasure-hero-pill">
              <span>Relic Slot</span>
              <strong>${relic ? relic.rarity : "Empty"}</strong>
              <em>${relic ? "secured for this climb" : "pool exhausted"}</em>
            </div>
          </div>
        </div>
        <div class="treasure-toolbar">
          <div class="treasure-toolbar-copy">
            <p class="eyebrow">Vault Opened</p>
            <h2>Vault Spoils</h2>
            <p class="utility-copy">Claim the relic, pocket the haul, and get back to the route before the chamber goes dark.</p>
          </div>
          <button class="header-button primary treasure-claim-button" data-action="take-treasure">${relic ? "Secure The Haul" : "Take The Gold"}</button>
        </div>
        <div class="treasure-body">
          <div class="utility-card utility-relic-card treasure-relic-card ${rarityClass(relic?.rarity || "COMMON")}">
            <div class="utility-relic-visual">${renderRelicBadge(relic, "utility-relic-art")}</div>
            <div class="treasure-relic-copy">
              <strong>${relic?.name || "Relic Pool Empty"}</strong>
              <span>${relic?.description || "No more relics are available in the current unlocked pool."}</span>
              <em>${relic?.rarity || "NONE"}</em>
            </div>
          </div>
          <div class="utility-card treasure-ledger-card">
            <span class="treasure-ledger-label">Recovered Goods</span>
            <strong>+${goldBonus} gold</strong>
            <p>Treasure rooms always pay coin with the relic. Take both, then continue the ascent.</p>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderUtilityReveal(run) {
  const reveal = run.utilityReveal;
  if (!reveal) return "";
  const relic = reveal.relic;
  return `
    <section class="modal-backdrop">
      <div class="utility-modal utility-reveal-modal">
        <p class="eyebrow">${reveal.source === "event" ? "Omen Reward" : "Discovery"}</p>
        <h2>${reveal.title}</h2>
        ${reveal.subtitle ? `<p class="utility-copy">${reveal.subtitle}</p>` : ""}
        <div class="utility-reveal-card ${rarityClass(relic?.rarity || "COMMON")}">
          <div class="utility-reveal-orb">${renderRelicBadge(relic, "utility-reveal-badge")}</div>
          <div class="utility-reveal-copy">
            <span>${relic?.rarity || "COMMON"}</span>
            <strong>${relic?.name || "Unknown Relic"}</strong>
            <p>${relic?.description || "A strange token now joins the run."}</p>
          </div>
        </div>
        <button class="header-button primary utility-close" data-action="dismiss-utility-reveal">${reveal.continueLabel || "Continue"}</button>
      </div>
    </section>
  `;
}

function getShopOfferTypeLabel(offer) {
  if (offer.kind === "RELIC") return "Relic";
  if (offer.kind === "ACTION_UPGRADE") return "Refinement";
  if (offer.kind === "HERBS") return "Apothecary";
  if (offer.kind === "STAT") return "Field Draft";
  if (offer.kind === "REMOVE") return "Polish";
  return "Stock";
}

function getShopOfferToken(offer) {
  if (offer.kind === "RELIC") return offer.relic?.rarity || "Relic";
  if (offer.kind === "ACTION_UPGRADE") return "EDGE";
  if (offer.kind === "HERBS") return "HERBS";
  if (offer.kind === "STAT") {
    if (offer.stat === "str") return "STR";
    if (offer.stat === "vit") return "VIT";
    if (offer.stat === "focus") return "FOCUS";
  }
  if (offer.kind === "REMOVE") return "TEMPER";
  return "STOCK";
}

// A token visual is the fallback for offers that don't carry a relic
// portrait — STAT drafts, action refinements, polish/temper services.
// We give each kind a distinct token-modifier class so they read as
// deliberate badges instead of letters-in-a-box. The text glyph stays
// short (STR / VIT / FOC / EDGE / TEMPER) but the surrounding chrome
// does the visual differentiation.
function getShopOfferTokenKind(offer) {
  if (offer.kind === "STAT") return `stat-${offer.stat || "any"}`;
  if (offer.kind === "ACTION_UPGRADE") return "edge";
  if (offer.kind === "REMOVE") return "temper";
  return "stock";
}

function renderShopOfferVisual(offer) {
  if (offer.relic) {
    return `<div class="shop-card-visual ${rarityClass(offer.relic.rarity)}">${renderRelicBadge(offer.relic, "shop-relic-art")}</div>`;
  }
  if (offer.kind === "HERBS") {
    return `
      <div class="shop-card-visual shop-card-herbs">
        ${renderHerbPills(offer.herbs, { className: "shop-herb-stack" })}
      </div>
    `;
  }
  const tokenKind = getShopOfferTokenKind(offer);
  return `
    <div class="shop-card-visual shop-card-token shop-card-token-${tokenKind}">
      <span>${getShopOfferToken(offer)}</span>
    </div>
  `;
}

function renderShop(run) {
  const offerCount = run.shopOffer?.length || 0;
  const affordableCount = run.shopOffer?.filter((offer) => run.player.gold >= offer.cost).length || 0;
  return `
    <section class="modal-backdrop">
      <div class="utility-modal scenic-modal shop-modal">
        <div class="shop-hero">
          ${renderUtilityScene(UTILITY_SCENES.shop, "Quartermaster", "A frontier trader waits with contraband, ledgers, and steel.")}
          <div class="shop-hero-rail">
            <div class="shop-wallet">
              <span>Purse</span>
              <strong>${run.player.gold}</strong>
              <em>gold on hand</em>
            </div>
            <div class="shop-ledger">
              <span>Quartermaster's Counter</span>
              <strong>${affordableCount}/${offerCount} offers within reach</strong>
              <p>Buy for impact, not comfort. The climb charges interest.</p>
            </div>
          </div>
        </div>
        <div class="shop-toolbar">
          <div class="shop-toolbar-copy">
            <strong>Curated stock for the next leg of the climb.</strong>
            <span>Patch a weak slot, lock in a relic, then get back on the route.</span>
          </div>
          <button class="header-button subtle utility-close" data-action="leave-utility">Back To Route</button>
        </div>
        <div class="shop-counter-grid">
          ${run.shopOffer.map((offer) => {
            const disabled = run.player.gold < offer.cost;
            const shortage = Math.max(0, offer.cost - run.player.gold);
            return `
            <button class="utility-card shop-card ${disabled ? "is-disabled" : ""}" data-action="buy-shop" data-item-id="${offer.id || offer.relic?.id}" ${disabled ? "disabled" : ""}>
              <div class="shop-card-main">
                ${renderShopOfferVisual(offer)}
                <div class="shop-card-copy">
                  <div class="shop-card-meta">
                    <span class="shop-card-type">${getShopOfferTypeLabel(offer)}</span>
                    ${disabled ? "" : `<span class="shop-card-ready">Ready</span>`}
                  </div>
                  <strong>${offer.label || offer.relic?.name}</strong>
                  <p>${offer.summary || offer.relic?.description || "Run upgrade"}</p>
                </div>
                <div class="shop-card-price">
                  <strong>${offer.cost}</strong>
                  <span>gold</span>
                  ${disabled ? `<em class="shop-card-shortage">${shortage}g short</em>` : ""}
                </div>
              </div>
            </button>
          `;
          }).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderGameOver(run) {
  const report = run.runReport || {};
  const legend = getLegend(run.player?.legendId);
  const spire = getSpire(run.spireId || "mixed");
  const floor = Number(report.floorDisplay || (Number(run.player?.floor || 0) + 1));
  const accuracy = Number.isFinite(report.accuracy) ? report.accuracy : 0;
  const elapsed = formatRunDuration(report.elapsedMs || run.elapsedMs || 0);
  const monstersFelled = Math.max(0, Number(report.monstersKilled || 0));
  const battlesCleared = Math.max(0, Number(report.battlesCleared || 0));
  const elitesCleared = Math.max(0, Number(report.elitesCleared || 0));
  const bossesCleared = Math.max(0, Number(report.bossesCleared || 0));
  const totalDamage = Math.max(0, Number(report.damageDone || 0));
  const totalCrits = Math.max(0, Number(report.totalCrits || 0));
  const relicsCarried = Math.max(0, Number(report.relicsCarried || 0));
  const materials = report.materialsBanked || run.metaRewards || {};
  const hasMaterials = Object.values(materials).some((value) => Number(value || 0) > 0);
  return `
    <section class="modal-backdrop loss">
      <div class="gameover-modal run-report-modal gameover-report-modal">
        <div class="modal-accent"></div>
        <div class="run-report-head">
          <p class="eyebrow">Run Ended</p>
          <h2>The Climb Is Broken</h2>
          <p class="run-report-subcopy">${legend?.name || "Your legend"} fell on Floor ${floor} of ${MAP_HEIGHT} along ${spire?.name || "the spire"}. The frontier banks the salvage you carried.</p>
        </div>
        <div class="run-report-grid">
          <div><span>Run Time</span><strong>${elapsed}</strong></div>
          <div><span>Accuracy</span><strong>${accuracy}%</strong></div>
          <div><span>Foes Felled</span><strong>${monstersFelled}</strong></div>
          <div><span>Crits Landed</span><strong>${totalCrits}</strong></div>
        </div>
        <div class="run-report-grid secondary">
          <div><span>Battles</span><strong>${battlesCleared}</strong></div>
          <div><span>Elites</span><strong>${elitesCleared}</strong></div>
          <div><span>Bosses</span><strong>${bossesCleared}</strong></div>
          <div><span>Total Damage</span><strong>${totalDamage}</strong></div>
        </div>
        <div class="gameover-meta-row">
          <div class="gameover-meta-card">
            <span>Floor Reached</span>
            <strong>${floor} / ${MAP_HEIGHT}</strong>
          </div>
          <div class="gameover-meta-card">
            <span>Relics Carried</span>
            <strong>${relicsCarried}</strong>
          </div>
        </div>
        ${hasMaterials ? `
          <div class="gameover-salvage">
            <span>Salvage Banked</span>
            <div class="gameover-salvage-row">${renderMaterialPills(materials, { includeEmpty: false })}</div>
          </div>
        ` : `
          <p class="gameover-salvage-empty">No salvage made it back. Push to an Elite or Boss next run to bank materials.</p>
        `}
        <div class="victory-footer run-report-footer">
          <button class="header-button primary" data-action="return-hub">Return To Camp</button>
        </div>
      </div>
    </section>
  `;
}

export function renderApp(state) {
  const { profile, run, setup, timeLeft, roster } = state;

  if (!run) {
    return `
      <div class="app-shell">
        ${renderShellBackdrop(null, setup)}
        ${renderHeader(profile, null, setup, roster)}
        ${renderHub(profile, setup, roster)}
      </div>
    `;
  }

  let mainScreen = "";
  if (run.screen === SCREEN.HUB) mainScreen = renderHub(profile, setup, roster);
    if ([SCREEN.MAP, SCREEN.EVENT, SCREEN.MINIGAME, SCREEN.REST, SCREEN.TREASURE, SCREEN.SHOP].includes(run.screen)) {
      mainScreen = renderMap(run);
    }
    if (run.screen === SCREEN.RUN_REPORT) {
      mainScreen = `<section class="report-stage"></section>`;
    }
    if ((run.screen === SCREEN.BATTLE || run.screen === SCREEN.VICTORY || run.screen === SCREEN.GAMEOVER) && run.battle) {
      mainScreen = renderBattle(run, timeLeft);
    }

  return `
    <div class="app-shell in-run-shell">
      ${renderShellBackdrop(run, setup)}
      ${renderHeader(profile, run)}
      <main class="app-main">
        ${renderStatOverlay(run)}
        ${mainScreen}
      </main>
      <footer class="app-footer">
        <span>Hotkeys: A / S / D${run.player.utilitySlotUnlocked ? " / F" : ""} choose actions${run.player.ultimateUnlocked ? " | G ultimate" : ""} | 1 / 2 / 3 / 4 answer | E end turn</span>
        <button class="header-button ghost" data-action="return-hub">End Run</button>
      </footer>
        ${run.screen === SCREEN.VICTORY ? renderVictory(run) : ""}
        ${run.screen === SCREEN.RUN_REPORT ? renderRunReport(run) : ""}
      ${run.screen === SCREEN.EVENT ? renderEvent(run) : ""}
      ${run.screen === SCREEN.REST ? renderRest(run) : ""}
      ${run.screen === SCREEN.MINIGAME ? renderMinigame(run) : ""}
      ${run.screen === SCREEN.TREASURE ? renderTreasure(run) : ""}
      ${run.screen === SCREEN.SHOP ? renderShop(run) : ""}
      ${run.screen === SCREEN.GAMEOVER ? renderGameOver(run) : ""}
      ${run.skillTreeOpen ? renderSkillTree(run) : ""}
      ${run.utilityReveal ? renderUtilityReveal(run) : ""}
    </div>
  `;
}

export function buildGameText(state) {
  const { profile, run, setup, timeLeft } = state;
  if (!run) {
    const savedRun = buildSavedRunSummary(profile.lastRun);
    return JSON.stringify({
      screen: "HUB",
      legends: LEGENDS.map((legend) => legend.id),
      spires: SPIRES.map((spire) => spire.id),
      unlockedSpires: getUnlockedSpireIds(profile),
      base: profile.base,
      unlockReveal: profile.unlockReveal,
      setup,
      savedRun,
    });
  }

  const payload = {
    screen: run.screen,
    floor: run.player.floor,
    act: getActForFloor(run.player.floor),
    spire: run.spireId,
    legend: run.player.legendId,
    hp: run.player.hp,
    maxHp: run.player.maxHp,
    block: run.player.block,
    gold: run.player.gold,
    level: run.player.level,
    combo: run.player.combo,
    statPoints: run.player.statPoints,
    skillPoints: run.player.skillPoints || 0,
    utilitySlotUnlocked: !!run.player.utilitySlotUnlocked,
    timerMs: getBattleTimeLimit(run),
    stats: run.player.stats,
    herbs: run.player.herbs || {},
    potions: run.player.potions || {},
    relics: run.player.relics.map((relic) => relic.id),
    ultimateUnlocked: !!run.player.ultimateUnlocked,
    skillNodesUnlocked: run.player.skillNodesUnlocked || [],
    techniquesUnlocked: run.player.techniquesUnlocked || [],
    actions: run.player.actions.map((action) => ({
      id: action.id,
      name: action.name,
      level: action.level,
      energyCost: action.energyCost ?? 1,
      evolutionId: action.evolutionId || null,
    })),
    metaRewards: run.metaRewards || {},
    utilityReveal: run.utilityReveal ? {
      kind: run.utilityReveal.kind,
      source: run.utilityReveal.source,
      title: run.utilityReveal.title,
      relic: run.utilityReveal.relic?.id || null,
    } : null,
  };

  if (run.screen === SCREEN.MAP) {
    payload.routePanel = run.routePanel || null;
    payload.reachableNodes = getReachableNodes(run).map((node) => ({ id: node.id, type: node.type, floor: node.floor }));
    payload.crafting = {
      available: true,
      potionCaps: Object.values(POTIONS).map((potion) => ({
        id: potion.id,
        owned: Math.max(0, Number(run.player.potions?.[potion.id] || 0)),
        herb: Math.max(0, Number(run.player.herbs?.[potion.herbId] || 0)),
      })),
    };
    payload.modifiers = getRunModifierSummary(run.player);
  }

  if (run.screen === SCREEN.EVENT) {
    payload.event = {
      title: run.eventOffer?.title || null,
      choices: run.eventOffer?.choices?.map((choice) => ({ id: choice.id, label: choice.label })) || [],
    };
  }

  if (run.screen === SCREEN.MINIGAME) {
    payload.minigame = {
      id: run.minigameOffer?.id || null,
      title: run.minigameOffer?.title || null,
      round: run.minigameOffer?.round || 0,
      playerWins: run.minigameOffer?.playerWins || 0,
      foeWins: run.minigameOffer?.foeWins || 0,
      moves: run.minigameOffer?.moves?.map((move) => move.id) || [],
    };
  }

  if (run.screen === SCREEN.REST) {
    const training = getNextRestTraining(run.player);
    payload.rest = {
      choices: ["heal", "temper", "train"],
      trainingTitle: training.title,
      trainingKind: training.kind,
      talentPointsAfterTrain: (run.player.skillPoints || 0) + (training.kind === "SKILL_TREE" ? 1 : 0),
    };
  }

  if (run.screen === SCREEN.TREASURE) {
    payload.treasure = {
      goldBonus: run.treasureOffer?.goldBonus || 0,
      relic: run.treasureOffer?.relic?.id || null,
    };
  }

  if (run.screen === SCREEN.SHOP) {
    payload.shop = {
      offers: run.shopOffer?.map((offer) => ({
        id: offer.id || offer.relic?.id,
        kind: offer.kind,
        cost: offer.cost,
        label: offer.label || offer.relic?.name,
      })) || [],
    };
  }

  if (run.screen === SCREEN.VICTORY && run.reward) {
    payload.reward = {
      gold: run.reward.gold,
      xp: run.reward.xp,
      accuracy: run.reward.accuracy,
      leveled: run.reward.leveled,
      relic: run.reward.relic?.id || null,
      materials: run.reward.materials || {},
      herbs: run.reward.herbs || {},
      selectedTrainingId: run.reward.selectedTrainingId,
      trainingChoices: run.reward.trainingChoices?.map((choice) => ({
        id: choice.id,
        kind: choice.kind,
        techniqueId: choice.techniqueId || null,
        label: choice.label,
      })) || [],
    };
  }

  payload.skillTree = {
    open: !!run.skillTreeOpen,
    ...getSkillTreeState(run.player),
  };

  if (run.screen === SCREEN.RUN_REPORT && run.runReport) {
    payload.runReport = { ...run.runReport };
  }

  if (run.screen === SCREEN.GAMEOVER && run.runReport) {
    payload.runReport = { ...run.runReport };
  }

  if (run.screen === SCREEN.BATTLE && run.battle) {
    const selectedAction = run.battle.hand.find((action) => action.id === run.battle.selectedActionId) || null;
    payload.battle = {
      targetEnemyId: run.battle.targetEnemyId,
      selectedActionId: run.battle.selectedActionId,
      selectedActionCost: run.battle.selectedActionCost,
      timeLeft,
      energy: run.battle.energy,
      energyMax: run.battle.energyMax,
      pendingEnemyPhase: !!run.battle.pendingEnemyPhase,
      pendingVictory: !!run.battle.pendingVictory,
      phaseCue: run.battle.phaseCue || null,
      ultimateCharge: run.battle.ultimateCharge || 0,
      ultimateThreshold: run.battle.ultimateThreshold || 0,
      ultimateReadyCount: run.battle.ultimateReadyCount || 0,
      turnActionsPlayed: run.battle.turnActionsPlayed || 0,
      potionUsedThisTurn: !!run.battle.potionUsedThisTurn,
      turnNote: run.battle.turnNote,
      effects: (run.battle.effects || []).map((effect) => ({ type: effect.type, target: effect.target, lane: effect.lane || 0, tone: effect.tone || "default" })),
      popups: (run.battle.damagePopups || []).map((popup) => ({
        amount: popup.amount,
        style: popup.style,
        target: popup.target,
        lane: popup.lane || 0,
        delayMs: popup.delayMs || 0,
        variant: popup.variant || null,
      })),
      enemies: run.battle.enemies.map((enemy) => ({ id: enemy.id, hp: enemy.hp, maxHp: enemy.maxHp, intent: enemy.intent.value, statuses: enemy.statuses || {} })),
      hand: run.battle.hand.map((action) => ({
        id: action.id,
        type: action.type,
        energyCost: getActionCost(run.player, action, { turnActionsPlayed: run.battle.turnActionsPlayed || 0 }),
        affordable: canAffordAction(run.player, run.battle, action),
      })),
      prompt: selectedAction?.problem?.text || null,
      answers: selectedAction?.problem?.options || [],
      feedback: run.battle.feedback,
      activeBuffs: getBattleBuffSummary(run.player),
    };
  }

  return JSON.stringify(payload);
}
