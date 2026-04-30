import { LEGENDS, MAP_HEIGHT, SCREEN, SPIRES } from "./data.js";
import {
  answerCurrentProblem,
  applyEventChoice,
  applyRestChoice,
  buyShopItem,
  craftPotion,
  chooseNode,
  chooseVictoryReward,
  closeSkillTree,
  claimTreasure,
  claimVictory,
  createRun,
  dismissAchievementReveal,
  dismissUtilityReveal,
  dismissUnlockReveal,
  endPlayerTurn,
  getBattleTimeLeft,
  getBattleTimeLimit,
  getClimbTier,
  getUnlockedSpireIds,
  hydrateProfile,
  hydrateRunState,
  isSpireAllowedAtTier,
  isSpireUnlocked,
  leaveUtilityNode,
  openSkillTree,
  playMinigameMove,
  resolvePendingEnemyPhase,
  resolvePendingVictory,
  selectAction,
  spendStatPoint,
  unlockSkillNode,
  upgradeBaseBuilding,
  usePotion,
  updateProfile,
} from "./engine.js";
import { clearProfile, loadProfile, saveProfile } from "./storage.js";
import { buildGameText, renderApp } from "./ui.js";

const app = document.getElementById("app");

const state = {
  profile: hydrateProfile(loadProfile()),
  run: null,
  now: performance.now(),
  timeLeft: 1,
  setup: {
    legendId: null,
    spireId: null,
    tierId: null,
    phase: "home",
    view: "expedition",
    entryMode: "new",
    notice: null,
  },
};

let timeoutTriggered = false;
let needsRender = true;
let enemyPhaseTimerRef = null;

function clearEnemyPhaseTimer() {
  if (enemyPhaseTimerRef) {
    clearTimeout(enemyPhaseTimerRef);
    enemyPhaseTimerRef = null;
  }
}

function persist() {
  const nextProfile = {
    ...state.profile,
    lastRun: state.run,
  };
  saveProfile(nextProfile);
  state.profile = nextProfile;
}

function markDirty() {
  needsRender = true;
}

function resetSetup(notice = null) {
  state.setup = {
    legendId: null,
    spireId: null,
    tierId: null,
    phase: "home",
    view: "expedition",
    entryMode: "new",
    notice,
  };
}

function resumeSavedRun() {
  if (!state.profile.lastRun) {
    resetSetup("No saved climb is waiting in the Camp Chronicle.");
    markDirty();
    render(true);
    return;
  }

  try {
    const resumedRun = hydrateRunState(state.profile.lastRun, state.profile);
    if (!resumedRun) {
      throw new Error("Saved run could not be hydrated.");
    }
    state.setup.notice = null;
    commit(resumedRun);
  } catch (error) {
    console.error("Unable to resume saved run.", error);
    clearEnemyPhaseTimer();
    state.run = null;
    state.profile = {
      ...hydrateProfile(state.profile),
      lastRun: null,
    };
    saveProfile(state.profile);
    resetSetup("The saved climb could not be recovered, so it was cleared.");
    markDirty();
    render(true);
  }
}

function syncRuntimeUi() {
  const timerFill = app.querySelector("#battleTimerFill");
  if (timerFill) {
    timerFill.style.width = `${Math.max(0, Math.min(100, state.timeLeft * 100)).toFixed(2)}%`;
  }
}

function syncBattleTargetSelection() {
  const targetId = state.run?.battle?.targetEnemyId;
  if (!targetId) return;
  app.querySelectorAll(".enemy-panel").forEach((panel) => {
    const isTargeted = panel.dataset.enemyId === targetId;
    panel.classList.toggle("is-targeted", isTargeted);
  });
}

function scrollActiveNodeIntoView() {
  const activeNode = app.querySelector('[data-active-node="true"]');
  if (activeNode) {
    activeNode.scrollIntoView({ block: "center", inline: "center", behavior: "auto" });
  }
}

// Track the "screen identity" between renders so we can suppress modal
// entry animations when the user is interacting WITHIN a screen (e.g.,
// picking a victory reward). Without this, every state change replays a
// ~1.2s cascade of fades and it looks like the screen is "refreshing".
let lastScreenKey = null;

function getCurrentScreenKey() {
  if (state.setup?.view === "base") return "base";
  if (!state.run && state.setup?.phase && state.setup.phase !== "home") {
    return `setup-${state.setup.phase}`;
  }
  if (!state.run) return "home";
  // Group "victory" by floor so the victory modal stays settled across
  // reward picks but re-animates on a brand-new victory.
  if (state.run.screen === "VICTORY") return `victory-${state.run.player?.floor ?? 0}`;
  return `${state.run.screen}-${state.run.player?.floor ?? 0}`;
}

function render(force = false) {
  if (!force && !needsRender) {
    syncRuntimeUi();
    return;
  }

  const newScreenKey = getCurrentScreenKey();
  const isSettled = newScreenKey === lastScreenKey;
  app.innerHTML = renderApp(state);
  // The class lives on the app root and is read by CSS rules that disable
  // the entry-fade animations for modals/cards that have already shown up.
  app.classList.toggle("screen-settled", isSettled);
  lastScreenKey = newScreenKey;

  window.render_game_to_text = () => buildGameText(state);
  needsRender = false;
  syncRuntimeUi();
  syncBattleTargetSelection();
  scrollActiveNodeIntoView();
}

function commit(nextRun) {
  clearEnemyPhaseTimer();
  state.run = nextRun;
  persist();
  markDirty();
  render(true);
  if (state.run?.screen === SCREEN.BATTLE && state.run.battle?.pendingEnemyPhase) {
    enemyPhaseTimerRef = setTimeout(() => {
      if (!state.run?.battle?.pendingEnemyPhase) return;
      commit(resolvePendingEnemyPhase(state.run));
    }, 700);
  } else if (state.run?.screen === SCREEN.BATTLE && state.run.battle?.pendingVictory) {
    enemyPhaseTimerRef = setTimeout(() => {
      if (!state.run?.battle?.pendingVictory) return;
      commit(resolvePendingVictory(state.run));
    }, 520);
  }
}

function finalizeRun() {
  if (!state.run) return;
  clearEnemyPhaseTimer();
  const nextProfile = updateProfile(state.profile, state.run, true);
  nextProfile.lastRun = null;
  state.run = null;
  state.profile = nextProfile;
  saveProfile(state.profile);
  resetSetup();
  markDirty();
  render(true);
}

function resetToHub() {
  clearEnemyPhaseTimer();
  const nextProfile = state.run ? updateProfile(state.profile, state.run, false) : hydrateProfile(state.profile);
  nextProfile.lastRun = null;
  state.profile = nextProfile;
  state.run = null;
  saveProfile(nextProfile);
  resetSetup();
  markDirty();
  render(true);
}

function handleAction(action, payload = {}) {
  if (action === "choose-home-mode") {
    if (payload.mode === "load") {
      resumeSavedRun();
      return;
    }
    state.setup.view = "expedition";
    state.setup.phase = "profile";
    state.setup.entryMode = payload.mode || "new";
    state.setup.notice = null;
    state.setup.legendId = null;
    state.setup.spireId = null;
    markDirty();
    render(true);
    return;
  }

  if (action === "select-profile") {
    if (state.setup.entryMode === "load") {
      resumeSavedRun();
      return;
    }
    state.setup.phase = "legend";
    state.setup.legendId = null;
    state.setup.spireId = null;
    state.setup.notice = null;
    markDirty();
    render(true);
    return;
  }

  if (action === "select-legend") {
    const firstUnlockedSpireId = getUnlockedSpireIds(state.profile)[0] || null;
    state.setup.view = "expedition";
    state.setup.legendId = payload.legend;
    state.setup.spireId = firstUnlockedSpireId;
    state.setup.phase = "spire";
    markDirty();
    render(true);
    return;
  }

  if (action === "select-spire") {
    if (!isSpireUnlocked(state.profile, payload.spireId)) return;
    state.setup.spireId = payload.spireId;
    markDirty();
    render(true);
    return;
  }

  // Step 2 -> Step 3: spire chosen, advance to tier picker. Default to the
  // profile's last-used tier so returning players don't have to re-pick.
  if (action === "advance-to-tier") {
    if (!state.setup.spireId || !isSpireUnlocked(state.profile, state.setup.spireId)) return;
    state.setup.phase = "tier";
    if (!state.setup.tierId) {
      state.setup.tierId = state.profile.preferredTierId || "adept";
    }
    markDirty();
    render(true);
    return;
  }

  if (action === "select-tier") {
    state.setup.tierId = payload.tierId;
    markDirty();
    render(true);
    return;
  }

  if (action === "change-legend") {
    state.setup.phase = "legend";
    state.setup.spireId = null;
    state.setup.tierId = null;
    markDirty();
    render(true);
    return;
  }

  if (action === "change-spire") {
    state.setup.phase = "spire";
    markDirty();
    render(true);
    return;
  }

  if (action === "back-to-home") {
    resetSetup(state.setup.notice);
    markDirty();
    render(true);
    return;
  }

  if (action === "start-run") {
    if (!state.setup.legendId || !state.setup.spireId || !isSpireUnlocked(state.profile, state.setup.spireId)) return;
    const tierId = state.setup.tierId || state.profile.preferredTierId || "adept";
    // Defense-in-depth: the tier card disables the Begin button when a tier
    // blocks the chosen spire, but never trust the DOM. Reroute to spire pick.
    if (!isSpireAllowedAtTier(state.setup.spireId, tierId)) {
      state.setup.phase = "spire";
      state.setup.notice = `${getClimbTier(tierId).name} tier doesn't allow that spire's operation. Pick another spire.`;
      markDirty();
      render(true);
      return;
    }
    state.setup.notice = null;
    // Persist tier as the profile's preferred default for future runs.
    state.profile = { ...state.profile, preferredTierId: tierId };
    saveProfile(state.profile);
    commit(createRun(state.setup.legendId, state.setup.spireId, state.profile, tierId));
    return;
  }

  if (action === "open-base") {
    state.setup.view = "base";
    markDirty();
    render(true);
    return;
  }

  if (action === "open-expedition") {
    state.setup.view = "expedition";
    markDirty();
    render(true);
    return;
  }

  // Field Honors — achievements / trophies — live on their own dedicated
  // screen so they don't compete with the actionable Outpost upgrades for
  // attention. Honors are reflective; the Outpost is operational.
  if (action === "open-honors") {
    state.setup.view = "honors";
    markDirty();
    render(true);
    return;
  }

  if (action === "upgrade-base") {
    state.profile = upgradeBaseBuilding(state.profile, payload.buildingId);
    saveProfile({ ...state.profile, lastRun: null });
    markDirty();
    render(true);
    return;
  }

  if (action === "dismiss-unlock-reveal") {
    state.profile = dismissUnlockReveal(state.profile);
    saveProfile({ ...state.profile, lastRun: null });
    markDirty();
    render(true);
    return;
  }

  if (action === "dismiss-achievement-reveal") {
    state.profile = dismissAchievementReveal(state.profile);
    saveProfile({ ...state.profile, lastRun: state.run });
    markDirty();
    render(true);
    return;
  }

  if (action === "clear-save") {
    clearProfile();
    state.profile = loadProfile();
    state.run = null;
    resetSetup();
    markDirty();
    render(true);
    return;
  }

  if (!state.run) return;

  if (action === "return-hub") {
    resetToHub();
    return;
  }

  if (action === "dismiss-utility-reveal") {
    commit(dismissUtilityReveal(state.run));
    return;
  }

  if (action === "toggle-route-panel" && state.run.screen === SCREEN.MAP) {
    state.run = {
      ...state.run,
      routePanel: state.run.routePanel === payload.routePanel ? null : payload.routePanel,
    };
    persist();
    render(true);
    return;
  }

  if (action === "open-skill-tree" && state.run.screen === SCREEN.MAP) {
    commit(openSkillTree(state.run));
    return;
  }

  if (action === "close-skill-tree" && state.run.skillTreeOpen) {
    commit(closeSkillTree(state.run));
    return;
  }

  if (action === "unlock-skill-node" && state.run.skillTreeOpen) {
    commit(unlockSkillNode(state.run, payload.skillNodeId));
    return;
  }

  // Click a node in the skill tree to focus it in the right-rail detail
  // pane. Replaces the old hover-tooltip-only pattern. Selecting a node is
  // a pure UI state change, not a purchase — purchase happens via the
  // Learn button inside the rail.
  if (action === "select-skill-node" && state.run.skillTreeOpen) {
    state.run = {
      ...state.run,
      selectedSkillNodeId: payload.skillNodeId,
    };
    persist();
    render(true);
    return;
  }

  if (action === "spend-stat") {
    commit(spendStatPoint(state.run, payload.stat));
    return;
  }

  if (action === "select-node" && state.run.screen === SCREEN.MAP) {
    commit(chooseNode(state.run, payload.nodeId));
    return;
  }

  if (action === "craft-potion" && state.run.screen === SCREEN.MAP) {
    commit(craftPotion(state.run, payload.potionId));
    return;
  }

  if (action === "use-potion" && state.run && [SCREEN.MAP, SCREEN.BATTLE].includes(state.run.screen)) {
    commit(usePotion(state.run, payload.potionId));
    return;
  }

  if (action === "select-action" && state.run.screen === SCREEN.BATTLE) {
    if (state.run.battle?.pendingEnemyPhase || state.run.battle?.pendingVictory) return;
    timeoutTriggered = false;
    state.timeLeft = 1;
    commit(selectAction(state.run, payload.actionId, state.now));
    return;
  }

  if (action === "target-enemy" && state.run.screen === SCREEN.BATTLE && state.run.battle) {
    if (state.run.battle.pendingEnemyPhase || state.run.battle.pendingVictory) return;
    state.run = {
      ...state.run,
      battle: {
        ...state.run.battle,
        targetEnemyId: payload.enemyId,
      },
    };
    persist();
    syncBattleTargetSelection();
    return;
  }

  if (action === "answer" && state.run.screen === SCREEN.BATTLE) {
    if (state.run.battle?.pendingEnemyPhase || state.run.battle?.pendingVictory) return;
    timeoutTriggered = false;
    state.timeLeft = 1;
    commit(answerCurrentProblem(state.run, payload.answer, state.now));
    return;
  }

  if (action === "end-turn" && state.run.screen === SCREEN.BATTLE) {
    if (state.run.battle?.pendingEnemyPhase || state.run.battle?.pendingVictory) return;
    timeoutTriggered = false;
    state.timeLeft = 1;
    commit(endPlayerTurn(state.run));
    return;
  }

  if (action === "claim-victory" && state.run.screen === SCREEN.VICTORY) {
    const nextRun = claimVictory(state.run);
    commit(nextRun);
    return;
  }

  if (action === "finish-run-report" && state.run.screen === SCREEN.RUN_REPORT) {
    finalizeRun();
    return;
  }

  if (action === "choose-victory-reward" && state.run.screen === SCREEN.VICTORY) {
    commit(chooseVictoryReward(state.run, payload.rewardId));
    return;
  }

  if (action === "rest-choice" && state.run.screen === SCREEN.REST) {
    commit(applyRestChoice(state.run, payload.choice));
    return;
  }

  if (action === "event-choice" && state.run.screen === SCREEN.EVENT) {
    commit(applyEventChoice(state.run, payload.choice));
    return;
  }

  if (action === "play-minigame-move" && state.run.screen === SCREEN.MINIGAME) {
    commit(playMinigameMove(state.run, payload.moveId));
    return;
  }

  if (action === "take-treasure" && state.run.screen === SCREEN.TREASURE) {
    commit(claimTreasure(state.run, payload.relicId));
    return;
  }

  if (action === "buy-shop" && state.run.screen === SCREEN.SHOP) {
    commit(buyShopItem(state.run, payload.itemId));
    return;
  }

  if (action === "leave-utility" && state.run.screen === SCREEN.SHOP) {
    commit(leaveUtilityNode(state.run));
  }
}

app.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  handleAction(target.dataset.action, {
    mode: target.dataset.mode,
    legend: target.dataset.legend,
    spireId: target.dataset.spireId,
    tierId: target.dataset.tierId,
    nodeId: target.dataset.nodeId,
    actionId: target.dataset.actionId,
    answer: target.dataset.answer,
    stat: target.dataset.stat,
    choice: target.dataset.choice,
    relicId: target.dataset.relicId,
    itemId: target.dataset.itemId,
    potionId: target.dataset.potionId,
    routePanel: target.dataset.routePanel,
    enemyId: target.dataset.enemyId,
    rewardId: target.dataset.rewardId,
    buildingId: target.dataset.buildingId,
    moveId: target.dataset.moveId,
    techniqueId: target.dataset.techniqueId,
    skillNodeId: target.dataset.skillNodeId,
  });
});

window.addEventListener("keydown", (event) => {
  if (!state.run || state.run.screen !== SCREEN.BATTLE || !state.run.battle) return;
  const battle = state.run.battle;

  if (!battle.selectedActionId) {
    if (event.key.toUpperCase() === "E") {
      event.preventDefault();
      handleAction("end-turn");
      return;
    }
    const match = battle.hand.find((entry) => entry.hotkey === event.key.toUpperCase());
    if (match) {
      event.preventDefault();
      handleAction("select-action", { actionId: match.id });
    }
    return;
  }

  if (event.key === "Escape") {
    commit({
      ...state.run,
      battle: {
        ...state.run.battle,
        selectedActionId: null,
        problemStartedAt: 0,
        feedback: "Choose an action.",
      },
    });
    return;
  }

  const digit = Number(event.key);
  if (digit >= 1 && digit <= 4) {
    const selectedAction = battle.hand.find((entry) => entry.id === battle.selectedActionId);
    const answer = selectedAction?.problem?.options?.[digit - 1];
    if (answer !== undefined) {
      event.preventDefault();
      handleAction("answer", { answer });
    }
  }
});

function step(ms) {
  state.now += ms;

  if (state.run && ![SCREEN.RUN_REPORT, SCREEN.GAMEOVER].includes(state.run.screen)) {
    state.run.elapsedMs = Math.max(0, Number(state.run.elapsedMs || 0) + ms);
  }

  if (state.run?.screen === SCREEN.BATTLE && state.run.battle?.selectedActionId) {
    state.timeLeft = getBattleTimeLeft(state.run, state.now);
    const elapsed = state.now - state.run.battle.problemStartedAt;
    if (elapsed >= getBattleTimeLimit(state.run) && !timeoutTriggered) {
      timeoutTriggered = true;
      state.timeLeft = 0;
      commit(answerCurrentProblem(state.run, null, state.now));
      return;
    }
  } else {
    timeoutTriggered = false;
    state.timeLeft = 1;
  }

  render(false);
}

// When the tab is backgrounded, requestAnimationFrame is throttled or
// paused entirely. On return, nextNow is much further ahead of state.now
// than a normal frame's worth (~16ms). Without compensation, the rAF
// catch-up — clamped to small per-frame deltas but firing at 60fps —
// burns the in-progress question's timer at ~3x real-time speed, so an
// 8-second timer ran out in ~2.7 wall seconds. Detect the gap, snap
// state.now to wall clock, and shift any active battle's
// problemStartedAt forward by the same gap so the question's elapsed
// time is unchanged across the pause.
const FRAME_GAP_THRESHOLD_MS = 250;

function frame(nextNow) {
  const rawDelta = Math.max(0, nextNow - state.now);
  if (rawDelta > FRAME_GAP_THRESHOLD_MS) {
    const gap = rawDelta - 16.67;
    // Pause the active question's timer across the tab-away gap.
    if (state.run?.screen === SCREEN.BATTLE && state.run.battle?.problemStartedAt > 0) {
      state.run.battle = {
        ...state.run.battle,
        problemStartedAt: state.run.battle.problemStartedAt + gap,
      };
    }
    // run.elapsedMs is incremented in step() from delta — and delta is
    // clamped to one normal frame after the snap below, so the gap is
    // naturally excluded from the run timer too.
    state.now = nextNow - 16.67;
  }
  const delta = Math.min(50, Math.max(0, nextNow - state.now));
  step(delta || 16.67);
  requestAnimationFrame(frame);
}

// Page Visibility API fallback. Most browsers throttle rAF on hidden
// tabs but a few (or some OS sleep states) pause it entirely; this
// handler catches those cases too. On return, the next frame() call
// will see the gap and apply the same problemStartedAt shift.
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    // Force state.now to lag behind so frame()'s gap-detection branch
    // runs on the next tick and applies the timer-pause shift.
    state.now = Math.min(state.now, performance.now() - FRAME_GAP_THRESHOLD_MS - 1);
  }
});

window.advanceTime = (ms) => {
  const steps = Math.max(1, Math.round(ms / (1000 / 60)));
  const slice = ms / steps;
  for (let index = 0; index < steps; index += 1) {
    step(slice);
  }
};

render(true);
requestAnimationFrame(frame);
