(() => {
  "use strict";

  const TACTICS = [
    {
      id: "assault",
      name: "堂堂之阵",
      description: "正面列阵推进，军势 +8%，但伤亡略增。",
      power: 1.08,
      loss: 1.1,
      enemy: 1,
    },
    {
      id: "encircle",
      name: "围三阙一",
      description: "留出退路瓦解守志，敌军战力 -8%，己方伤亡 -18%。",
      power: 0.96,
      loss: 0.82,
      enemy: 0.92,
    },
    {
      id: "raid",
      name: "轻兵奇袭",
      description: "以军师谋略决定奇袭威力，胜则缴获更多，败则损失更重。",
      power: 1,
      loss: 1.16,
      enemy: 0.97,
    },
    {
      id: "fire",
      name: "火攻粮道",
      description: "消耗木料，削弱敌军战力。军师越强，火势越盛。",
      power: 1.05,
      loss: 0.96,
      enemy: 0.88,
      cost: { wood: 35 },
    },
  ];

  const UNIT_INFO = {
    infantry: {
      name: "步卒",
      glyph: "步",
      batch: 100,
      cost: { grain: 38, coin: 12, manpower: 24 },
      power: 1,
    },
    archer: {
      name: "弓手",
      glyph: "弓",
      batch: 80,
      cost: { grain: 42, coin: 18, wood: 22, manpower: 20 },
      power: 1.18,
    },
    cavalry: {
      name: "骑兵",
      glyph: "骑",
      batch: 50,
      cost: { grain: 52, coin: 32, iron: 18, manpower: 16 },
      power: 1.68,
    },
  };

  const ROLE_NAMES = {
    governor: "太守",
    strategist: "军师",
    commander: "主将",
  };

  const setup = {
    eraId: "189",
    originId: "yingchuan",
    backgroundId: "shizu",
  };

  const ui = {
    view: "city",
    selectedRegionId: null,
    processing: false,
    lastSavedAt: null,
  };

  let state = null;
  let battleDraft = null;
  const el = {};

  init();

  function init() {
    cacheElements();
    renderSetupOptions();
    updateSetupSummary();
    bindGlobalEvents();

    const saved = getSavedState();
    el.continueButton.hidden = !saved;
  }

  function cacheElements() {
    el.landingView = document.getElementById("landing-view");
    el.gameView = document.getElementById("game-view");
    el.continueButton = document.getElementById("continue-button");
    el.eraOptions = document.getElementById("era-options");
    el.originOptions = document.getElementById("origin-options");
    el.backgroundOptions = document.getElementById("background-options");
    el.startSummary = document.getElementById("start-summary");
    el.startButton = document.getElementById("start-button");
    el.rulerName = document.getElementById("ruler-name");

    el.viewHost = document.getElementById("view-host");
    el.rightRail = document.getElementById("right-rail");
    el.gameNav = document.querySelector(".game-nav");
    el.topbarRuler = document.getElementById("topbar-ruler");
    el.topbarRank = document.getElementById("topbar-rank");
    el.topbarYear = document.getElementById("topbar-year");
    el.topbarSeason = document.getElementById("topbar-season");
    el.topbarMonth = document.getElementById("topbar-month");
    el.resourceGrain = document.getElementById("resource-grain");
    el.resourceCoin = document.getElementById("resource-coin");
    el.resourceWood = document.getElementById("resource-wood");
    el.resourceIron = document.getElementById("resource-iron");
    el.resourceReputation = document.getElementById("resource-reputation");
    el.actionPointsValue = document.getElementById("action-points-value");
    el.actionPointsMax = document.getElementById("action-points-max");
    el.mobileTurnbar = document.getElementById("mobile-turnbar");
    el.mobileNextTurn = el.mobileTurnbar.querySelector(".mobile-next-turn");
    el.mobileReportButton = el.mobileTurnbar.querySelector(".mobile-report-button");

    el.dialog = document.getElementById("game-dialog");
    el.dialogClose = el.dialog.querySelector(".dialog-close");
    el.dialogKicker = document.getElementById("dialog-kicker");
    el.dialogTitle = document.getElementById("dialog-title");
    el.dialogSubtitle = document.getElementById("dialog-subtitle");
    el.dialogContent = document.getElementById("dialog-content");
    el.dialogActions = document.getElementById("dialog-actions");
    el.toastRegion = document.getElementById("toast-region");
    el.srStatus = document.getElementById("screen-reader-status");
  }

  function bindGlobalEvents() {
    document.addEventListener("click", handleClick);
    el.dialogClose.addEventListener("click", closeDialog);
    el.dialog.addEventListener("cancel", (event) => {
      if (el.dialog.dataset.dismissible !== "true") {
        event.preventDefault();
      }
    });
    el.dialog.addEventListener("click", (event) => {
      if (event.target === el.dialog && el.dialog.dataset.dismissible === "true") {
        closeDialog();
      }
    });
    window.addEventListener("beforeunload", () => {
      if (state) {
        saveGame(false);
      }
    });
  }

  function handleClick(event) {
    const button = event.target.closest("button");
    if (!button || button.disabled) {
      return;
    }

    const action = button.dataset.action;
    if (!action) {
      return;
    }

    switch (action) {
      case "select-era":
        selectSetupOption("eraId", button.dataset.era);
        break;
      case "select-origin":
        selectSetupOption("originId", button.dataset.origin);
        break;
      case "select-background":
        selectSetupOption("backgroundId", button.dataset.background);
        break;
      case "start-game":
        beginNewGame();
        break;
      case "continue-save":
        continueSavedGame();
        break;
      case "open-guide":
        openGuide();
        break;
      case "nav-view":
        switchView(button.dataset.view);
        break;
      case "save-game":
        saveGame(true);
        break;
      case "next-turn":
        advanceTurn();
        break;
      case "open-briefing":
        openBriefing();
        break;
      case "open-settings":
        openSettings();
        break;
      case "select-region":
        selectRegion(button.dataset.region);
        break;
      case "building-empty":
        openBuildDialog(Number(button.dataset.slot));
        break;
      case "building-upgrade":
        openUpgradeDialog(Number(button.dataset.slot));
        break;
      case "building-construction":
        showToast("此处正在营造，月末即可完工。");
        break;
      case "start-build":
        startConstruction(Number(button.dataset.slot), button.dataset.type);
        break;
      case "start-upgrade":
        startUpgrade(Number(button.dataset.slot));
        break;
      case "open-training":
        openTrainingDialog();
        break;
      case "train-unit":
        trainUnit(button.dataset.unit);
        break;
      case "seek-talent":
        seekTalent();
        break;
      case "hire-candidate":
        recruitCandidate(button.dataset.id);
        break;
      case "assign-role":
        assignRole(button.dataset.id, button.dataset.role);
        break;
      case "open-battle":
        openBattleDialog(button.dataset.region);
        break;
      case "set-tactic":
        setBattleTactic(button.dataset.tactic);
        break;
      case "execute-battle":
        executeBattle();
        break;
      case "toggle-policy":
        togglePolicy(button.dataset.policy);
        break;
      case "court-action":
        performCourtAction(button.dataset.courtAction);
        break;
      case "resolve-event":
        resolveEvent(Number(button.dataset.choice));
        break;
      case "dismiss-dialog":
        closeDialog();
        break;
      case "show-landing":
        saveGame(false);
        showLanding();
        break;
      case "confirm-new-game":
        activateNewGame();
        break;
      case "clear-save":
        clearSaveAndReturn();
        break;
      case "open-ending":
        closeDialog();
        openEndingDialog();
        break;
      default:
        break;
    }
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function round(value, precision = 0) {
    const multiplier = 10 ** precision;
    return Math.round(value * multiplier) / multiplier;
  }

  function formatNumber(value) {
    return Math.max(0, Math.round(Number(value) || 0)).toLocaleString("zh-CN");
  }

  function signed(value) {
    const number = Math.round(Number(value) || 0);
    return `${number >= 0 ? "+" : ""}${formatNumber(number)}`;
  }

  function pickRandom(items) {
    if (!items.length) {
      return null;
    }
    return items[Math.floor(Math.random() * items.length)];
  }

  function shuffle(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function getEra(id = setup.eraId) {
    return ERAS.find((era) => era.id === String(id)) || ERAS[0];
  }

  function getOrigin(id) {
    return ORIGINS.find((origin) => origin.id === id) || ORIGINS[0];
  }

  function getBackground(id) {
    return BACKGROUNDS.find((background) => background.id === id) || BACKGROUNDS[0];
  }

  function getRegion(id) {
    return REGIONS.find((region) => region.id === id) || null;
  }

  function getBuildingDefinition(id) {
    return BUILDINGS[id] || null;
  }

  function getPolicy(id) {
    return POLICIES.find((policy) => policy.id === id) || null;
  }

  function getFigure(id) {
    return HISTORICAL_FIGURES.find((figure) => figure.id === id) || null;
  }

  function getRank(regionCount = 1) {
    return [...RANKS].reverse().find((rank) => regionCount >= rank.min) || RANKS[0];
  }

  function getSeason(month) {
    if (month >= 2 && month <= 4) {
      return "春";
    }
    if (month >= 5 && month <= 7) {
      return "夏";
    }
    if (month >= 8 && month <= 10) {
      return "秋";
    }
    return "冬";
  }

  function getDateLabel(targetState = state) {
    return `公元${targetState.year}年 ${MONTH_NAMES[targetState.month - 1]}`;
  }

  function getHistoricalEraLabel(year) {
    const numerals = ["", "元", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二"];
    if (year <= 189) {
      return `中平${numerals[Math.max(1, year - 183)] || year - 183}年`;
    }
    if (year <= 193) {
      return `初平${numerals[Math.max(1, year - 189)] || year - 189}年`;
    }
    if (year <= 195) {
      return `兴平${year === 194 ? "元" : "二"}年`;
    }
    return `建安${numerals[year - 195] || year - 195}年`;
  }

  function addHistory(targetState, text, type = "general") {
    targetState.history.unshift({
      year: targetState.year,
      month: targetState.month,
      text,
      type,
    });
    if (targetState.history.length > 120) {
      targetState.history.length = 120;
    }
  }

  function renderSetupOptions() {
    el.eraOptions.innerHTML = ERAS.map(
      (era) => `
        <button
          class="era-option ${setup.eraId === era.id ? "selected" : ""}"
          type="button"
          role="radio"
          aria-checked="${setup.eraId === era.id}"
          data-action="select-era"
          data-era="${era.id}"
        >
          <strong>${era.year} · ${era.title}</strong>
          <span>${era.label} · ${era.caption}</span>
        </button>
      `,
    ).join("");

    el.originOptions.innerHTML = ORIGINS.map((origin) => {
      const region = getRegion(origin.regionId);
      return `
        <button
          class="origin-option ${setup.originId === origin.id ? "selected" : ""}"
          type="button"
          role="radio"
          aria-checked="${setup.originId === origin.id}"
          aria-label="${escapeHtml(origin.zhou)} ${escapeHtml(origin.seat)}，${escapeHtml(origin.trait)}"
          data-action="select-origin"
          data-origin="${origin.id}"
        >
          <span class="origin-zhou">${escapeHtml(origin.zhou)} · ${escapeHtml(origin.label)}</span>
          <strong>${escapeHtml(origin.seat)}</strong>
          <small>${escapeHtml(origin.trait)} · 兵${formatNumber(getOriginTroops(origin))}</small>
          <span hidden>${escapeHtml(region?.special || "")}</span>
        </button>
      `;
    }).join("");

    el.backgroundOptions.innerHTML = BACKGROUNDS.map(
      (background) => `
        <button
          class="background-option ${setup.backgroundId === background.id ? "selected" : ""}"
          type="button"
          role="radio"
          aria-checked="${setup.backgroundId === background.id}"
          data-action="select-background"
          data-background="${background.id}"
        >
          <strong>${background.glyph} · ${background.name}</strong>
          <span>${background.description}</span>
        </button>
      `,
    ).join("");
  }

  function getOriginTroops(origin) {
    return Object.values(origin.army).reduce((sum, value) => sum + value, 0);
  }

  function selectSetupOption(key, value) {
    if (!value) {
      return;
    }
    setup[key] = value;
    renderSetupOptions();
    updateSetupSummary();
  }

  function updateSetupSummary() {
    const era = getEra(setup.eraId);
    const origin = getOrigin(setup.originId);
    const background = getBackground(setup.backgroundId);
    const resources = { ...origin.resources };
    resources.population = origin.population;
    Object.entries(background.resourceMods).forEach(([key, value]) => {
      resources[key] = (resources[key] || 0) + value;
    });
    const troops = getOriginTroops(origin) + (background.armyMods.infantry || 0);

    el.startSummary.innerHTML = `
      <strong>${escapeHtml(origin.zhou)} · ${escapeHtml(origin.seat)}／${escapeHtml(background.name)}</strong>
      <span>${era.year}年 · ${escapeHtml(era.label)}</span>
      <p>
        ${escapeHtml(origin.trait)}：${escapeHtml(origin.traitDesc)}
        初始粮 ${formatNumber(resources.grain)}、钱 ${formatNumber(resources.coin)}、
        步卒 ${formatNumber(troops)}。${escapeHtml(era.description)}
      </p>
    `;
  }

  function createInitialState() {
    const era = getEra(setup.eraId);
    const origin = getOrigin(setup.originId);
    const background = getBackground(setup.backgroundId);
    const rulerStats = { ...origin.rulerStats };
    Object.entries(background.statMods).forEach(([key, value]) => {
      rulerStats[key] = clamp((rulerStats[key] || 0) + value, 1, 10);
    });

    const resources = { ...origin.resources };
    Object.entries(background.resourceMods).forEach(([key, value]) => {
      resources[key] = Math.max(0, (resources[key] || 0) + value);
    });

    const army = { ...origin.army };
    Object.entries(background.armyMods).forEach(([key, value]) => {
      army[key] = Math.max(0, (army[key] || 0) + value);
    });

    const structures = Array(12).fill(null);
    origin.buildings.forEach(([type, level], index) => {
      if (index < structures.length) {
        structures[index] = { type, level };
      }
    });

    const initialName = el.rulerName.value.trim().slice(0, 12) || "无名氏";
    const nextState = {
      version: GAME_VERSION,
      rulerName: initialName,
      rulerStats,
      backgroundId: background.id,
      originId: origin.id,
      regionId: origin.regionId,
      eraId: era.id,
      year: era.year,
      month: era.startMonth,
      turn: 0,
      resources,
      publicOrder: origin.publicOrder,
      defenseBonus: 0,
      army,
      structures,
      constructions: [],
      controlled: [origin.regionId],
      generals: [],
      candidates: [],
      assignments: {
        governor: "ruler",
        commander: "ruler",
        strategist: null,
      },
      adoptedPolicies: [],
      history: [],
      seenEvents: [],
      regionWear: {},
      milestones: {
        built: false,
        recruited: false,
        trained: false,
        conquered: false,
        policy: false,
      },
      totals: {
        months: 0,
        wins: 0,
        defeats: 0,
        raidsRepelled: 0,
      },
      actionPoints: 3,
      maxActionPoints: 3,
      gameOver: false,
      ending: "",
      pendingEventId: null,
      createdAt: new Date().toISOString(),
    };

    addHistory(
      nextState,
      `${era.label}，${origin.zhou}${origin.seat}。你以${background.name}之身聚众自守，${origin.traitDesc}`,
      "history",
    );
    addHistory(nextState, era.description, "history");
    addHistory(
      nextState,
      `${origin.description} 眼下府库不多，但脚下的土地足以开始一段基业。`,
      "general",
    );

    nextState.candidates = findCandidateIds(nextState, 3, true);
    return nextState;
  }

  function beginNewGame() {
    const saved = getSavedState();
    if (saved) {
      showDialog({
        kicker: "旧档尚在",
        title: "要另起一方基业吗？",
        subtitle: "开启新档会覆盖当前自动存档。若只是想继续，请回到开局页选择“续治旧档”。",
        content: `<p class="dialog-narrative">你已有一份${escapeHtml(saved.rulerName)}的治世记录。新开局将从公元${saved.year}年重新开始。</p>`,
        actions: [
          { label: "保留旧档", kind: "secondary" },
          {
            label: "确认重开",
            kind: "danger",
            onClick: activateNewGame,
          },
        ],
      });
      return;
    }
    activateNewGame();
  }

  function activateNewGame() {
    state = createInitialState();
    ui.view = "city";
    ui.selectedRegionId = getFirstEnemyNeighborId(state) || state.regionId;
    showGame();
    renderGame();
    saveGame(false);
    showToast(`${state.rulerName}，${getOrigin(state.originId).seat}的百姓正在等你的第一道政令。`, "success");
  }

  function continueSavedGame() {
    const saved = getSavedState();
    if (!saved) {
      showToast("没有可读取的旧档。", "warning");
      el.continueButton.hidden = true;
      return;
    }
    state = saved;
    ui.view = "city";
    ui.selectedRegionId = getFirstEnemyNeighborId(state) || state.regionId;
    showGame();
    renderGame();
    showToast(`已续治${getDateLabel(state)}的旧档。`, "success");
    if (state.pendingEventId) {
      const event = EVENTS.find((item) => item.id === state.pendingEventId);
      if (event) {
        window.setTimeout(() => showEventDialog(event), 120);
      }
    }
  }

  function normalizeState(saved) {
    if (!saved || saved.version !== GAME_VERSION || !Array.isArray(saved.controlled)) {
      return null;
    }
    if (!saved.resources || !saved.army || !saved.assignments) {
      return null;
    }

    const normalized = {
      ...saved,
      structures: Array.isArray(saved.structures) ? saved.structures.slice(0, 12) : [],
      constructions: Array.isArray(saved.constructions) ? saved.constructions : [],
      controlled: [...new Set(saved.controlled)].filter((id) => Boolean(getRegion(id))),
      generals: Array.isArray(saved.generals) ? saved.generals.filter((id) => Boolean(getFigure(id))) : [],
      candidates: Array.isArray(saved.candidates) ? saved.candidates.filter((id) => Boolean(getFigure(id))) : [],
      adoptedPolicies: Array.isArray(saved.adoptedPolicies) ? saved.adoptedPolicies : [],
      history: Array.isArray(saved.history) ? saved.history : [],
      seenEvents: Array.isArray(saved.seenEvents) ? saved.seenEvents : [],
      regionWear: saved.regionWear && typeof saved.regionWear === "object" ? saved.regionWear : {},
      milestones: { ...createEmptyMilestones(), ...(saved.milestones || {}) },
      totals: { months: 0, wins: 0, defeats: 0, raidsRepelled: 0, ...(saved.totals || {}) },
      actionPoints: Number.isFinite(saved.actionPoints) ? saved.actionPoints : 3,
      maxActionPoints: Number.isFinite(saved.maxActionPoints) ? saved.maxActionPoints : 3,
      pendingEventId: saved.pendingEventId || null,
      gameOver: Boolean(saved.gameOver),
      ending: saved.ending || "",
      backgroundId: saved.backgroundId || "shizu",
    };
    while (normalized.structures.length < 12) {
      normalized.structures.push(null);
    }
    if (!normalized.controlled.includes(normalized.regionId)) {
      normalized.controlled.push(normalized.regionId);
    }
    if (!normalized.resources.population || normalized.resources.population <= 0) {
      normalized.resources.population = getOrigin(normalized.originId).population;
    }
    if (!normalized.resources.manpower || normalized.resources.manpower < 0) {
      normalized.resources.manpower = 120;
    }
    normalized.assignments = {
      governor: normalized.assignments.governor || null,
      commander: normalized.assignments.commander || null,
      strategist: normalized.assignments.strategist || null,
      ...normalized.assignments,
    };
    return normalized;
  }

  function createEmptyMilestones() {
    return {
      built: false,
      recruited: false,
      trained: false,
      conquered: false,
      policy: false,
    };
  }

  function getSavedState() {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (!raw) {
        return null;
      }
      return normalizeState(JSON.parse(raw));
    } catch (error) {
      return null;
    }
  }

  function saveGame(manual = false) {
    if (!state) {
      return false;
    }
    try {
      ui.lastSavedAt = new Date().toISOString();
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(state));
      if (manual) {
        showToast(`存档已写入：${getDateLabel()}`, "success");
      }
      return true;
    } catch (error) {
      showToast("浏览器阻止了本地存档，请通过本地服务器运行游戏。", "warning");
      return false;
    }
  }

  function clearSaveAndReturn() {
    try {
      window.localStorage.removeItem(SAVE_KEY);
    } catch (error) {
      // A blocked storage API is handled by returning to the setup screen.
    }
    state = null;
    ui.selectedRegionId = null;
    el.continueButton.hidden = true;
    closeDialog();
    showLanding();
    renderSetupOptions();
    updateSetupSummary();
    showToast("旧档已清除，可择地重新起兵。", "success");
  }

  function showGame() {
    el.landingView.hidden = true;
    el.gameView.hidden = false;
    window.scrollTo(0, 0);
    document.title = `${state.rulerName} · 汉末山河领主`;
  }

  function showLanding() {
    closeDialog();
    el.gameView.hidden = true;
    el.landingView.hidden = false;
    el.continueButton.hidden = !getSavedState();
    document.title = "汉末 · 山河领主";
    window.scrollTo(0, 0);
  }

  function currentOrigin() {
    return getOrigin(state.originId);
  }

  function currentRegion() {
    return getRegion(state.regionId);
  }

  function currentRank() {
    return getRank(state.controlled.length);
  }

  function getRulerOfficer() {
    return {
      id: "ruler",
      name: state.rulerName,
      courtesy: "",
      title: `${currentRank().title} · ${currentOrigin().trait}`,
      stats: state.rulerStats,
      special: `${currentOrigin().trait}：${currentOrigin().traitDesc}`,
      note: `${getDateLabel()}，据有${currentRegion().zhou}${currentRegion().seat}。`,
      tone: 3,
      isRuler: true,
    };
  }

  function getOfficer(id) {
    if (id === "ruler") {
      return getRulerOfficer();
    }
    const figure = getFigure(id);
    return figure || null;
  }

  function getAllOfficers() {
    return [getRulerOfficer(), ...state.generals.map(getOfficer).filter(Boolean)];
  }

  function getAssignedOfficer(role) {
    const id = state.assignments[role];
    return id ? getOfficer(id) : null;
  }

  function totalArmy() {
    return Object.values(state.army).reduce((sum, count) => sum + Math.max(0, count), 0);
  }

  function sumBuildingLevels(type) {
    return state.structures.reduce((sum, structure) => {
      if (structure && structure.type === type) {
        return sum + structure.level;
      }
      return sum;
    }, 0);
  }

  function armyCapacity() {
    const rankArmy = (currentRank().min - 1) * 20;
    return 300 + sumBuildingLevels("barracks") * 120 + rankArmy;
  }

  function policyActive(id) {
    return state.adoptedPolicies.includes(id);
  }

  function hasAdjacentEnemy(region) {
    return region.neighbors.some((neighborId) => state.controlled.includes(neighborId));
  }

  function getFirstEnemyNeighborId(targetState = state) {
    for (const controlledId of targetState.controlled) {
      const region = getRegion(controlledId);
      if (!region) {
        continue;
      }
      const neighbor = region.neighbors.find((id) => !targetState.controlled.includes(id));
      if (neighbor) {
        return neighbor;
      }
    }
    return null;
  }

  function getEnemyTargets() {
    const ids = new Set();
    state.controlled.forEach((controlledId) => {
      const region = getRegion(controlledId);
      region?.neighbors.forEach((neighborId) => {
        if (!state.controlled.includes(neighborId)) {
          ids.add(neighborId);
        }
      });
    });
    return [...ids].map(getRegion).filter(Boolean);
  }

  function getEraFactionKey() {
    if (state.year >= 194) {
      return "194";
    }
    if (state.year >= 189) {
      return "189";
    }
    return "184";
  }

  function getRegionLord(region) {
    if (state.controlled.includes(region.id)) {
      return state.rulerName;
    }
    return (
      region.factions[state.year] ||
      region.factions[getEraFactionKey()] ||
      "州郡守军"
    );
  }

  function getRegionGarrison(region) {
    const eraKey = Number(getEraFactionKey());
    const wear = clamp(state.regionWear[region.id] || 0, 0, 0.55);
    return Math.max(70, Math.round(region.garrison * ERA_GARRISON[eraKey] * (1 - wear)));
  }

  function getDefenseValue() {
    const wallLevel = sumBuildingLevels("wall");
    const originMod = currentOrigin().mods.defense || 1;
    const policyBonus = policyActive("baojing") ? 1.15 : 1;
    return Math.round((22 + wallLevel * 12) * originMod * policyBonus + state.defenseBonus);
  }

  function computeMonthlyBalance(targetState = state) {
    const regionYield = { grain: 0, coin: 0, wood: 0, iron: 0 };
    targetState.controlled.forEach((regionId) => {
      const region = getRegion(regionId);
      if (region) {
        Object.entries(region.yields).forEach(([key, value]) => {
          regionYield[key] += value;
        });
      }
    });

    const buildingYield = { grain: 0, coin: 0, wood: 0, iron: 0 };
    targetState.structures.forEach((structure) => {
      if (!structure) {
        return;
      }
      const definition = getBuildingDefinition(structure.type);
      if (!definition) {
        return;
      }
      Object.entries(definition.yield).forEach(([key, value]) => {
        buildingYield[key] += value * structure.level;
      });
    });

    const originMods = getOrigin(targetState.originId).mods;
    const governor = targetState.assignments.governor ? getOfficerForState(targetState, targetState.assignments.governor) : null;
    const governorBonus = (governor?.stats.governance || 0) * 0.005;
    const grainModifier =
      originMods.grain * (1 + governorBonus) * (policyActiveForState("tuntian", targetState) ? 1.12 : 1);
    const coinModifier =
      originMods.coin *
      (1 + governorBonus) *
      (policyActiveForState("saltiron", targetState) ? 1.15 : 1) *
      (policyActiveForState("qingyao", targetState) ? 0.92 : 1);
    const woodModifier = originMods.wood;
    const ironModifier = originMods.iron * (policyActiveForState("saltiron", targetState) ? 1.12 : 1);

    const harvest = targetState.month === 9 ? 1.5 : 1;
    const gross = {
      grain: Math.round((14 + regionYield.grain + buildingYield.grain) * grainModifier * harvest),
      coin: Math.round((8 + regionYield.coin + buildingYield.coin) * coinModifier),
      wood: Math.round((4 + regionYield.wood + buildingYield.wood) * woodModifier),
      iron: Math.round((2 + regionYield.iron + buildingYield.iron) * ironModifier),
    };

    const armyCount = Object.values(targetState.army).reduce((sum, value) => sum + value, 0);
    const upkeep = {
      grain: Math.ceil(
        targetState.resources.population * 0.011 +
          armyCount * 0.055 * (policyActiveForState("lihu", targetState) ? 1.08 : 1),
      ),
      coin: Math.ceil(armyCount * 0.047 + targetState.generals.length * 2),
    };

    const populationCap = 3000 + targetState.controlled.length * 1200;
    const populationModifier =
      (originMods.population || 1) *
      (policyActiveForState("tuntian", targetState) ? 1.08 : 1) *
      (policyActiveForState("qingyao", targetState) ? 1.12 : 1) *
      (1 + sumBuildingLevelsForState(targetState, "clinic") * 0.03);
    let populationGrowth = Math.round(
      targetState.resources.population * 0.011 *
        (0.55 + targetState.publicOrder / 100) *
        populationModifier,
    );
    if (targetState.publicOrder < 25) {
      populationGrowth = -Math.round(targetState.resources.population * 0.005);
    }

    let orderDelta = 1;
    orderDelta += sumBuildingLevelsForState(targetState, "clinic");
    orderDelta += policyActiveForState("qingyao", targetState) ? 2 : 0;
    orderDelta -= policyActiveForState("saltiron", targetState) ? 1 : 0;
    orderDelta += governor && governor.stats.governance >= 8 ? 1 : 0;
    if (targetState.resources.grain + gross.grain - upkeep.grain < 0) {
      orderDelta -= 6;
      populationGrowth = Math.min(populationGrowth, -10);
    }

    const reputation = sumBuildingLevelsForState(targetState, "academy") *
      (policyActiveForState("weicai", targetState) ? 1.5 : 1);
    const manpowerGrowth =
      targetState.resources.grain + gross.grain - upkeep.grain >= 0
        ? Math.max(10, Math.round(targetState.resources.population * 0.016))
        : 0;

    return {
      regionYield,
      buildingYield,
      gross,
      upkeep,
      net: {
        grain: gross.grain - upkeep.grain,
        coin: gross.coin - upkeep.coin,
      },
      populationGrowth,
      populationCap,
      orderDelta,
      reputation,
      manpowerGrowth,
      harvest,
    };
  }

  function getOfficerForState(targetState, id) {
    if (id === "ruler") {
      return {
        id: "ruler",
        name: targetState.rulerName,
        stats: targetState.rulerStats,
      };
    }
    return getFigure(id);
  }

  function policyActiveForState(id, targetState) {
    return targetState.adoptedPolicies.includes(id);
  }

  function sumBuildingLevelsForState(targetState, type) {
    return targetState.structures.reduce((sum, structure) => {
      if (structure && structure.type === type) {
        return sum + structure.level;
      }
      return sum;
    }, 0);
  }

  function getAdvice() {
    const balance = computeMonthlyBalance();
    const targets = getEnemyTargets();
    const emptySlot = state.structures.findIndex(
      (structure, index) => index < currentRank().slots && !structure &&
        !state.constructions.some((project) => project.slot === index),
    );

    if (!state.milestones.built && emptySlot >= 0) {
      return {
        title: "先把根基扎稳",
        text: "府库尚有余粮，宜先垦田或设市。每月产出是此后所有兵马钱粮的来源。",
        label: "前往城郭",
        view: "city",
      };
    }

    if (!state.milestones.recruited) {
      return {
        title: "一人智短，众士谋长",
        text: state.candidates.length
          ? "在野贤才已在府门外等候。礼聘一位，能明显改变内政或战局。"
          : "府中尚无贤才。花一道政令访求乡里，或许能遇到足以托付一郡的人。",
        label: "访贤纳士",
        view: "people",
      };
    }

    const weakestTarget = [...targets].sort((a, b) => getRegionGarrison(a) - getRegionGarrison(b))[0];
    const currentPower = getArmyPower();
    if (!state.milestones.trained && weakestTarget) {
      return {
        title: "兵贵精，不贵多",
        text: `邻郡${weakestTarget.name}约有守军${getRegionGarrison(weakestTarget)}。先补足军额、整训一支可战之兵，再谈征伐。`,
        label: "整训兵马",
        view: "people",
      };
    }

    if (balance.net.grain < 0) {
      return {
        title: "仓廪将空",
        text: `按现有户口与军额，每月缺粮约${Math.abs(balance.net.grain)}。继续扩军前，应增修农田或暂缓征募。`,
        label: "经营农商",
        view: "city",
      };
    }

    if (state.candidates.length === 0) {
      return {
        title: "广开求贤之路",
        text: "新征服的郡县会带来新的乡里人才。也可耗费一道政令访求本地俊杰。",
        label: "寻访贤才",
        view: "people",
      };
    }

    if (weakestTarget) {
      const chance = getBattleChance(weakestTarget, state.assignments.commander || "ruler", "assault");
      if (currentPower > getEnemyPower(weakestTarget) * 0.82 || chance >= 0.48) {
        return {
          title: "战机已至",
          text: `${weakestTarget.name}守军约${getRegionGarrison(weakestTarget)}，由${getRegionLord(weakestTarget)}据守。整军出征，可把一县之治扩为一郡之基。`,
          label: "查看天下图",
          view: "world",
        };
      }
    }

    return {
      title: "治大国若烹小鲜",
      text: "仓廪、民心、城防与人才缺一不可。先巩固本境，再寻找粮价与兵势都合适的扩张时机。",
      label: "巡视朝政",
      view: "court",
    };
  }

  function renderGame() {
    if (!state) {
      return;
    }
    renderTopbar();
    renderNav();
    renderView();
    renderRightRail();
    el.mobileNextTurn.disabled = Boolean(state.gameOver);
    el.mobileNextTurn.textContent = state.gameOver ? "基业已定" : `结束${MONTH_NAMES[state.month - 1]}`;
    saveGame(false);
  }

  function renderTopbar() {
    const rank = currentRank();
    const region = currentRegion();
    el.topbarRuler.textContent = state.rulerName;
    el.topbarRank.textContent = `${rank.title} · ${region.seat}`;
    el.topbarYear.textContent = `公元${state.year}年`;
    el.topbarSeason.textContent = getSeason(state.month);
    el.topbarMonth.textContent = MONTH_NAMES[state.month - 1];
    el.resourceGrain.textContent = formatNumber(state.resources.grain);
    el.resourceCoin.textContent = formatNumber(state.resources.coin);
    el.resourceWood.textContent = formatNumber(state.resources.wood);
    el.resourceIron.textContent = formatNumber(state.resources.iron);
    el.resourceReputation.textContent = formatNumber(state.resources.reputation);
    el.actionPointsValue.textContent = state.actionPoints;
    el.actionPointsMax.textContent = state.maxActionPoints;
    el.mobileNextTurn.disabled = Boolean(state.gameOver);
  }

  function renderNav() {
    el.gameNav.querySelectorAll("[data-view]").forEach((button) => {
      const active = button.dataset.view === ui.view;
      button.classList.toggle("active", active);
      if (active) {
        button.setAttribute("aria-current", "page");
      } else {
        button.removeAttribute("aria-current");
      }
    });
  }

  function switchView(view) {
    if (!["city", "world", "people", "court", "chronicle"].includes(view)) {
      return;
    }
    ui.view = view;
    renderNav();
    renderView();
    el.viewHost.scrollTop = 0;
    el.viewHost.focus({ preventScroll: true });
  }

  function renderView() {
    switch (ui.view) {
      case "world":
        el.viewHost.innerHTML = renderWorldView();
        break;
      case "people":
        el.viewHost.innerHTML = renderPeopleView();
        break;
      case "court":
        el.viewHost.innerHTML = renderCourtView();
        break;
      case "chronicle":
        el.viewHost.innerHTML = renderChronicleView();
        break;
      case "city":
      default:
        el.viewHost.innerHTML = renderCityView();
        break;
    }
  }

  function viewHeading(kicker, title, description, actions = "") {
    return `
      <header class="view-heading">
        <div class="view-heading-copy">
          <p class="view-kicker">${escapeHtml(kicker)}</p>
          <h1>${escapeHtml(title)}</h1>
          <p class="view-description">${escapeHtml(description)}</p>
        </div>
        ${actions ? `<div class="view-heading-actions">${actions}</div>` : ""}
      </header>
    `;
  }

  function renderCityView() {
    const origin = currentOrigin();
    const region = currentRegion();
    const rank = currentRank();
    const balance = computeMonthlyBalance();
    const army = totalArmy();
    const cap = armyCapacity();
    const governor = getAssignedOfficer("governor");
    const slots = [];
    for (let slot = 0; slot < Math.min(12, rank.slots + 1); slot += 1) {
      slots.push(renderBuildingSlot(slot, rank.slots));
    }

    return `
      ${viewHeading(
        `${origin.zhou} · ${rank.title}`,
        `${region.seat}治所`,
        `${origin.description} 当前辖有${state.controlled.length}处州县，下一阶为${rank.next || "天下共主"}。`,
        `
          <button class="primary-button" type="button" data-action="open-training">整军募兵</button>
          <button class="secondary-button" type="button" data-action="nav-view" data-view="world">查看天下</button>
        `,
      )}

      <section class="city-hero" aria-label="${escapeHtml(region.seat)}领地概况">
        <div class="city-visual">
          <svg class="city-landscape" viewBox="0 0 700 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <defs>
              <linearGradient id="cityMist" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#d8c59f" stop-opacity="0.2" />
                <stop offset="1" stop-color="#16221d" stop-opacity="0.5" />
              </linearGradient>
            </defs>
            <circle cx="545" cy="84" r="50" fill="#d9bd88" opacity="0.27" />
            <path d="M0 264 C78 217 128 240 188 196 C240 158 272 169 311 212 C351 256 394 247 438 204 C482 160 522 148 570 184 C617 219 652 239 700 225 V420 H0 Z" fill="#50665a" opacity="0.45" />
            <path d="M0 307 C65 271 139 285 207 252 C274 220 319 241 369 277 C414 309 475 307 526 268 C583 224 635 237 700 278 V420 H0 Z" fill="#2d443a" opacity="0.5" />
            <path d="M0 350 C74 318 133 331 193 308 C253 284 300 292 344 322 C387 351 436 353 478 326 C532 292 597 299 700 344 V420 H0 Z" fill="#1d3028" opacity="0.75" />
            <path d="M0 377 C99 342 171 360 240 342 C309 324 354 340 414 366 C480 395 569 381 700 337" fill="none" stroke="url(#cityMist)" stroke-width="19" opacity="0.4" />
            <g fill="#13231c" opacity="0.76">
              <path d="M80 337 H218 V352 H80 Z" />
              <path d="M92 315 H208 V338 H92 Z" />
              <path d="M112 286 H189 V316 H112 Z" />
              <path d="M126 262 H176 V287 H126 Z" />
              <path d="M146 239 H158 V264 H146 Z" />
              <path d="M73 301 L117 278 L146 297 L202 271 L231 296 V310 H73 Z" />
              <path d="M438 325 H527 V349 H438 Z" />
              <path d="M449 303 H519 V327 H449 Z" />
              <path d="M466 281 H503 V304 H466 Z" />
              <path d="M432 305 L470 283 L493 296 L531 280 L544 303 V315 H432 Z" />
            </g>
            <g fill="none" stroke="#cbb98e" stroke-width="2" opacity="0.37">
              <path d="M320 354 C357 331 389 335 430 356" />
              <path d="M263 380 C313 353 372 359 424 384" />
              <path d="M566 380 C610 364 648 372 682 394" />
            </g>
          </svg>
          <div class="city-visual-top">
            <div>
              <p class="city-visual-kicker">${origin.zhou} · ${region.seat} · ${getSeason(state.month)}${MONTH_NAMES[state.month - 1]}</p>
              <h2>${region.name}</h2>
            </div>
            <span class="territory-seal">${escapeHtml(rank.title.slice(0, 1))}</span>
          </div>
          <div class="city-visual-bottom">
            <div class="city-trait">
              <strong>${escapeHtml(origin.trait)}</strong>
              <p>${escapeHtml(origin.traitDesc)}</p>
            </div>
            <div class="controlled-region-list" aria-label="已控制州县">
              ${state.controlled.map((id) => `<span class="region-token">${escapeHtml(getRegion(id)?.name || id)}</span>`).join("")}
            </div>
          </div>
        </div>

        <div class="city-status">
          <div class="ruler-brief">
            <span class="ruler-avatar">${escapeHtml(state.rulerName.slice(0, 1))}</span>
            <div>
              <h3>${escapeHtml(state.rulerName)}</h3>
              <p>${escapeHtml(getBackground(state.backgroundId).name)} · 治下${currentRank().title}</p>
            </div>
            <span class="ruler-trait-note">声望 ${formatNumber(state.resources.reputation)}</span>
          </div>

          <div class="stat-grid">
            <div class="stat-cell">
              <span>治下人口</span>
              <strong>${formatNumber(state.resources.population)}</strong>
              <small>月增 ${signed(balance.populationGrowth)}</small>
            </div>
            <div class="stat-cell">
              <span>民心</span>
              <strong>${Math.round(state.publicOrder)}</strong>
              <small>月末 ${signed(balance.orderDelta)}</small>
            </div>
            <div class="stat-cell">
              <span>城防</span>
              <strong>${getDefenseValue()}</strong>
              <small>城墙 ${sumBuildingLevels("wall")} 级</small>
            </div>
            <div class="stat-cell">
              <span>现役兵马</span>
              <strong>${formatNumber(army)}</strong>
              <small>军额 ${formatNumber(cap)}</small>
            </div>
          </div>

          <div class="meter-group">
            <div>
              <div class="meter-label"><span>民心安定</span><strong>${Math.round(state.publicOrder)}%</strong></div>
              <div class="meter" role="progressbar" aria-label="民心" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(state.publicOrder)}">
                <div class="meter-fill order" style="width:${clamp(state.publicOrder, 0, 100)}%"></div>
              </div>
            </div>
            <div>
              <div class="meter-label"><span>军额占用</span><strong>${Math.round((army / Math.max(1, cap)) * 100)}%</strong></div>
              <div class="meter" role="progressbar" aria-label="军额占用" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round((army / Math.max(1, cap)) * 100)}">
                <div class="meter-fill" style="width:${clamp((army / Math.max(1, cap)) * 100, 0, 100)}%"></div>
              </div>
            </div>
          </div>

          <div class="resource-flow">
            <span class="flow-item">月粮产 <strong>+${balance.gross.grain}</strong></span>
            <span class="flow-item">军食民用 <strong>-${balance.upkeep.grain}</strong></span>
            <span class="flow-item ${balance.net.grain < 0 ? "negative" : ""}">粮净 ${signed(balance.net.grain)}</span>
            <span class="flow-item ${balance.net.coin < 0 ? "negative" : ""}">钱净 ${signed(balance.net.coin)}</span>
            <span class="flow-item">木 +${balance.gross.wood}</span>
            <span class="flow-item">铁 +${balance.gross.iron}</span>
            ${balance.harvest > 1 ? `<span class="flow-item"><strong>秋收加成</strong></span>` : ""}
          </div>
        </div>
      </section>

      <section class="content-section">
        <div class="section-title-row">
          <div>
            <h2>营建之地</h2>
            <p>使用一道政令开建或扩建。施工在月末推进，完成后立即计入下月产出。</p>
          </div>
          <span class="badge gold">${rank.title}可营 ${rank.slots} 处</span>
        </div>

        ${
          state.constructions.length
            ? `<div class="construction-banner">
                <strong>正在施工</strong>
                ${state.constructions
                  .map(
                    (project) =>
                      `<span>${escapeHtml(getBuildingDefinition(project.type)?.name || project.type)} ${project.targetLevel}级 · 余${project.remaining}月</span>`,
                  )
                  .join("")}
              </div>`
            : ""
        }

        <div class="building-grid">
          ${slots.join("")}
        </div>
      </section>

      <section class="content-section section-card" style="padding:18px">
        <div class="section-title-row">
          <div>
            <h3>本月度支</h3>
            <p>太守 ${escapeHtml(governor?.name || "未任命")} · 主将 ${escapeHtml(getAssignedOfficer("commander")?.name || "未任命")} · 军师 ${escapeHtml(getAssignedOfficer("strategist")?.name || "未任命")}</p>
          </div>
          <button class="ghost-button" type="button" data-action="nav-view" data-view="people">调整任命</button>
        </div>
        <div class="projection-grid">
          <div class="projection-item"><span>粮食毛利</span><strong>+${balance.gross.grain}</strong></div>
          <div class="projection-item"><span>粮食消耗</span><strong>-${balance.upkeep.grain}</strong></div>
          <div class="projection-item"><span>钱币净额</span><strong>${signed(balance.net.coin)}</strong></div>
          <div class="projection-item"><span>劳力新增</span><strong>+${balance.manpowerGrowth}</strong></div>
        </div>
      </section>
    `;
  }

  function renderBuildingSlot(slot, maxSlots) {
    if (slot >= maxSlots) {
      const nextRank = RANKS.find((rank) => rank.slots > maxSlots);
      return `
        <div class="building-card locked">
          <span class="building-glyph">锁</span>
          <strong>尚未解锁</strong>
          <p class="building-effect">晋升${nextRank ? nextRank.title : "更高爵位"}后开放更多营建地</p>
        </div>
      `;
    }

    const project = state.constructions.find((item) => item.slot === slot);
    if (project) {
      const definition = getBuildingDefinition(project.type);
      return `
        <button class="building-card" type="button" data-action="building-construction">
          <span class="building-glyph">造</span>
          <span class="building-name">${escapeHtml(definition?.name || project.type)} <span class="level-pips">${renderLevelPips(project.targetLevel, definition?.maxLevel || 4)}</span></span>
          <p class="building-effect">工匠与民夫正在施工，预计还需${project.remaining}个月。</p>
          <span class="building-foot"><span>扩建至${project.targetLevel}级</span><strong>营造中</strong></span>
        </button>
      `;
    }

    const structure = state.structures[slot];
    if (structure) {
      const definition = getBuildingDefinition(structure.type);
      const maxed = structure.level >= definition.maxLevel;
      return `
        <button class="building-card" type="button" data-action="building-upgrade" data-slot="${slot}">
          <span class="building-glyph">${escapeHtml(definition.glyph)}</span>
          <span class="building-name">${escapeHtml(definition.name)} <span class="level-pips">${renderLevelPips(structure.level, definition.maxLevel)}</span></span>
          <p class="building-effect">${escapeHtml(definition.effect(structure.level))}</p>
          <span class="building-foot">
            <span>${maxed ? "已达到最高等级" : "点击扩建"}</span>
            <strong>${maxed ? "完成" : `${structure.level}级`}</strong>
          </span>
        </button>
      `;
    }

    return `
      <button class="building-card empty" type="button" data-action="building-empty" data-slot="${slot}">
        <span class="building-glyph">＋</span>
        <span class="building-name">未辟之地</span>
        <p class="building-effect">选择农田、市集、校场或其他设施，让此处产生新的用途。</p>
        <span class="building-foot"><span>消耗一道政令</span><strong>开始营建</strong></span>
      </button>
    `;
  }

  function renderLevelPips(level, maxLevel) {
    return Array.from({ length: maxLevel }, (_, index) => `<i class="${index < level ? "filled" : ""}"></i>`).join("");
  }

  function renderWorldView() {
    const selected = getRegion(ui.selectedRegionId) || getRegion(state.regionId);
    const routes = renderMapRoutes();
    const nodes = REGIONS.map((region) => renderMapNode(region)).join("");

    return `
      ${viewHeading(
        `${state.year}年 · ${getHistoricalEraLabel(state.year)}`,
        "天下形势",
        "写意战略图展示邻接关系。只有与已治州县相邻的地区可以出征；攻克后会增加人口、产出与营建上限。",
        `<button class="secondary-button" type="button" data-action="open-training">整军募兵</button>`,
      )}

      <section class="map-shell" aria-label="汉末州郡战略图">
        <div class="map-toolbar">
          <strong>山河舆图</strong>
          <div class="map-legend">
            <span><i class="legend-dot player"></i>治下</span>
            <span><i class="legend-dot neighbor"></i>可征伐</span>
            <span><i class="legend-dot"></i>未接壤</span>
          </div>
        </div>
        <div class="map-scroll">
          <div class="map-canvas">
            <svg class="map-terrain-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <g fill="none" stroke="rgba(64, 92, 76, .23)" stroke-width="0.45">
                <path d="M-2 39 C16 32 25 37 36 30 C48 22 56 27 72 18 C84 11 91 18 104 10" />
                <path d="M-4 46 C11 40 20 45 33 37 C48 28 58 34 72 25 C84 18 94 23 105 18" />
              </g>
              <g fill="none" stroke="rgba(64, 92, 76, .33)" stroke-width="0.7">
                <path d="M-2 78 C17 70 26 74 39 66 C54 57 60 62 71 57 C84 50 96 55 106 49" />
                <path d="M22 102 C31 87 30 79 36 68 C44 54 39 48 45 35" />
              </g>
              <g fill="#5d725f" opacity="0.2">
                <path d="M5 22 l8 -15 8 15 Z" />
                <path d="M17 24 l6 -11 7 11 Z" />
                <path d="M24 13 l9 -19 9 19 Z" />
                <path d="M80 94 l8 -15 8 15 Z" />
                <path d="M89 94 l6 -10 7 10 Z" />
              </g>
              <g fill="rgba(61, 88, 72, .32)" font-family="serif" font-size="1.5" letter-spacing=".3">
                <text x="28" y="44">黄 河</text>
                <text x="48" y="69">长 江</text>
              </g>
              <text x="73" y="6" fill="rgba(43,63,51,.32)" font-family="serif" font-size="1.4" letter-spacing=".3">幽 燕</text>
              <text x="85" y="56" fill="rgba(43,63,51,.32)" font-family="serif" font-size="1.4" letter-spacing=".3">江 东</text>
            </svg>
            <svg class="map-route-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              ${routes}
            </svg>
            ${nodes}
          </div>
        </div>
      </section>

      ${renderRegionDetail(selected)}

      <p class="frontline-note" style="margin-top:12px">
        地图位置与河流为便于策略判断的写意表达。州郡名称、主要人物与时代背景参考东汉末年史料；战斗、经济与人物能力为游戏化数值。
      </p>
    `;
  }

  function getStateEraId() {
    return state.eraId || (state.year >= 194 ? "194" : state.year >= 189 ? "189" : "184");
  }

  function renderMapRoutes() {
    const drawn = new Set();
    const lines = [];
    REGIONS.forEach((region) => {
      region.neighbors.forEach((neighborId) => {
        const key = [region.id, neighborId].sort().join("-");
        if (drawn.has(key)) {
          return;
        }
        drawn.add(key);
        const neighbor = getRegion(neighborId);
        if (!neighbor) {
          return;
        }
        const bothControlled =
          state.controlled.includes(region.id) && state.controlled.includes(neighbor.id);
        const frontier =
          state.controlled.includes(region.id) !== state.controlled.includes(neighbor.id);
        const className = bothControlled ? "map-route controlled" : frontier ? "map-route frontier" : "map-route";
        lines.push(
          `<line class="${className}" x1="${region.x}" y1="${region.y}" x2="${neighbor.x}" y2="${neighbor.y}" vector-effect="non-scaling-stroke" />`,
        );
      });
    });
    return lines.join("");
  }

  function renderMapNode(region) {
    const controlled = state.controlled.includes(region.id);
    const adjacent = !controlled && hasAdjacentEnemy(region);
    const selected = ui.selectedRegionId === region.id;
    const classes = [
      "map-node",
      controlled ? "is-player" : "",
      adjacent ? "is-adjacent" : "",
      selected ? "is-selected" : "",
      !controlled && !adjacent ? "is-locked" : "",
    ]
      .filter(Boolean)
      .join(" ");

    return `
      <button
        class="${classes}"
        type="button"
        style="left:${region.x}%;top:${region.y}%"
        data-action="select-region"
        data-region="${region.id}"
        aria-label="${escapeHtml(region.zhou)}${escapeHtml(region.name)}，${controlled ? "你的治下" : `由${getRegionLord(region)}据守`}"
      >
        <span class="map-node-core">${escapeHtml(region.name.slice(0, 1))}</span>
        <span class="map-node-name">${escapeHtml(region.name)}</span>
        <span class="map-node-lord">${escapeHtml(getRegionLord(region))}</span>
      </button>
    `;
  }

  function renderRegionDetail(region) {
    if (!region) {
      return "";
    }
    const controlled = state.controlled.includes(region.id);
    const adjacent = !controlled && hasAdjacentEnemy(region);
    const lord = getRegionLord(region);
    const chance = adjacent ? getBattleChance(region, state.assignments.commander || "ruler", "assault") : 0;
    const wear = Math.round((state.regionWear[region.id] || 0) * 100);

    return `
      <section class="region-detail" aria-label="${escapeHtml(region.name)}详情">
        <div class="region-detail-main">
          <div class="region-detail-title">
            <div>
              <h2>${escapeHtml(region.zhou)} · ${escapeHtml(region.name)}</h2>
              <p>${escapeHtml(region.seat)}治所 · ${controlled ? "你的领地" : `现由${escapeHtml(lord)}据守`}</p>
            </div>
            <span class="badge ${controlled ? "green" : adjacent ? "red" : ""}">${controlled ? "治下" : adjacent ? "可征伐" : "未接壤"}</span>
          </div>
          <p class="region-note">${escapeHtml(region.note)}</p>
          <div class="region-stats">
            <div class="region-stat"><span>户口</span><strong>${formatNumber(region.population)}</strong></div>
            <div class="region-stat"><span>${controlled ? "城防" : "守军"}</span><strong>${controlled ? getDefenseValue() : formatNumber(getRegionGarrison(region))}</strong></div>
            <div class="region-stat"><span>${controlled ? "粮产" : "城防"}</span><strong>${controlled ? `+${region.yields.grain}` : region.defense}</strong></div>
          </div>
          <p class="region-note"><strong>地方特性：</strong>${escapeHtml(region.special)}${wear > 0 ? ` 此前战事已使守备削弱${wear}%。` : ""}</p>
        </div>
        <div class="region-detail-actions">
          ${
            controlled
              ? `
                <div class="war-estimate">
                  <span class="war-estimate-ring">治</span>
                  <div class="war-estimate-copy">
                    <strong>此州已在治下</strong>
                    <p>地方产出直接计入本境月结，并增加可营建地点与人口上限。</p>
                  </div>
                </div>
                <div class="button-row">
                  <button class="secondary-button" type="button" data-action="nav-view" data-view="city">回到城郭</button>
                </div>
              `
              : adjacent
                ? `
                  <div class="war-estimate">
                    <span class="war-estimate-ring">${Math.round(chance * 100)}%</span>
                    <div class="war-estimate-copy">
                      <strong>${getBattleAssessment(chance)}</strong>
                      <p>当前由${escapeHtml(getAssignedOfficer("commander")?.name || state.rulerName)}统兵。胜后可收其人口，并缴获粮钱。</p>
                    </div>
                  </div>
                  <div class="button-row">
                    <button class="primary-button" type="button" data-action="open-battle" data-region="${region.id}" ${state.gameOver ? "disabled" : ""}>兴兵征讨</button>
                    <button class="secondary-button" type="button" data-action="open-training">整军募兵</button>
                  </div>
                `
                : `
                  <div class="frontline-note">
                    此地尚未与治下州县接壤。先攻取相邻郡县，才能把兵锋推进到这里。
                  </div>
                `
          }
        </div>
      </section>
    `;
  }

  function getBattleAssessment(chance) {
    if (chance >= 0.78) {
      return "胜算甚大";
    }
    if (chance >= 0.58) {
      return "可以一战";
    }
    if (chance >= 0.4) {
      return "胜负难料";
    }
    if (chance >= 0.24) {
      return "颇为凶险";
    }
    return "宜先避战";
  }

  function selectRegion(regionId) {
    if (!getRegion(regionId)) {
      return;
    }
    ui.selectedRegionId = regionId;
    renderView();
  }

  function getArmyPower(targetState = state, commanderId = targetState.assignments.commander || "ruler", tacticId = "assault") {
    const commander = commanderId
      ? getOfficerForState(targetState, commanderId) || getRulerForState(targetState)
      : getRulerForState(targetState);
    const strategist = targetState.assignments.strategist
      ? getOfficerForState(targetState, targetState.assignments.strategist)
      : null;
    const tactic = TACTICS.find((item) => item.id === tacticId) || TACTICS[0];
    const originMod = getOrigin(targetState.originId).mods.army || 1;
    const archerPower = targetState.army.archer * UNIT_INFO.archer.power * (commander?.id === "taishici" ? 1.08 : 1);
    const cavalryPower = targetState.army.cavalry * UNIT_INFO.cavalry.power;
    let base =
      (targetState.army.infantry * UNIT_INFO.infantry.power + archerPower + cavalryPower) *
      originMod *
      (1 + (commander?.stats.martial || 0) * 0.018) *
      (1 + (strategist?.stats.strategy || 0) * 0.006) *
      (0.82 + targetState.publicOrder * 0.003) *
      (policyActiveForState("lihu", targetState) ? 1.1 : 1);

    if (commander?.id === "zhangliao") {
      base *= 1.05;
    }
    if (commander?.id === "pangde") {
      base *= 1.06;
    }
    if (tacticId === "raid") {
      const cunning = (strategist?.stats.strategy || commander?.stats.strategy || 5) * 0.012;
      base *= 1 + cunning + (commander?.id === "ganning" ? 0.09 : 0);
    }
    if (tacticId === "fire") {
      const strategy = strategist?.stats.strategy || commander?.stats.strategy || 5;
      base *= 1 + strategy * 0.008 + (commander?.id === "zhouyu" ? 0.1 : 0);
    }

    return base * tactic.power;
  }

  function getRulerForState(targetState) {
    return {
      id: "ruler",
      name: targetState.rulerName,
      stats: targetState.rulerStats,
    };
  }

  function getEnemyPower(region, targetState = state, tacticId = "assault") {
    const tactic = TACTICS.find((item) => item.id === tacticId) || TACTICS[0];
    let power = getRegionGarrison(region) * (0.82 + region.defense / 180);
    const commanderId = targetState.assignments.commander;
    const strategistId = targetState.assignments.strategist;
    if (commanderId === "guanyu") {
      power *= 0.94;
    }
    if (strategistId === "jiaxu" && tacticId === "raid") {
      power *= 0.92;
    }
    if (tacticId === "fire" && summonerHasSpecial(targetState, "huangfusong")) {
      power *= 0.94;
    }
    return power * tactic.enemy;
  }

  function summonerHasSpecial(targetState, id) {
    return targetState.assignments.commander === id || targetState.assignments.strategist === id;
  }

  function getBattleChance(region, commanderId = state.assignments.commander || "ruler", tacticId = "assault") {
    const playerPower = getArmyPower(state, commanderId, tacticId);
    const enemyPower = getEnemyPower(region, state, tacticId);
    const scale = Math.max(30, enemyPower * 0.42);
    return clamp(1 / (1 + Math.exp(-(playerPower - enemyPower) / scale)), 0.04, 0.96);
  }

  function findCandidateIds(targetState, count = 3, preferLowRequirements = false) {
    const known = new Set([...targetState.generals, ...targetState.candidates]);
    const available = HISTORICAL_FIGURES.filter(
      (figure) =>
        targetState.controlled.includes(figure.regionId) &&
        figure.from <= targetState.year &&
        !known.has(figure.id),
    );
    const ordered = preferLowRequirements
      ? [...available].sort((a, b) => a.rep - b.rep || a.cost - b.cost)
      : shuffle(available);
    return ordered.slice(0, count).map((figure) => figure.id);
  }

  function getRecruitCost(figure) {
    const originDiscount = currentOrigin().mods.talentCost || 1;
    const policyDiscount = policyActive("weicai") ? 0.8 : 1;
    const envoyDiscount = state.assignments.strategist === "sunqian" ? 0.92 : 1;
    return Math.max(1, Math.round(figure.cost * originDiscount * policyDiscount * envoyDiscount));
  }

  function canRecruitCandidate(figure) {
    return Boolean(
      figure &&
        state.resources.reputation >= figure.rep &&
        state.resources.coin >= getRecruitCost(figure),
    );
  }

  function renderPeopleView() {
    const officers = getAllOfficers();
    const candidates = state.candidates.map(getFigure).filter(Boolean);
    const assignedCount = Object.values(state.assignments).filter(Boolean).length;
    const bestMartial = Math.max(...officers.map((officer) => officer.stats.martial));
    const bestStrategy = Math.max(...officers.map((officer) => officer.stats.strategy));

    return `
      ${viewHeading(
        "府中英杰 · 乡野遗贤",
        "人物与任命",
        "太守影响每月农商收益，军师影响奇谋与火攻，主将决定出征时的军势。每人只能担任一职。",
        `
          <button class="primary-button" type="button" data-action="seek-talent" ${state.actionPoints < 1 ? "disabled" : ""}>访求贤才 · 1政令</button>
          <button class="secondary-button" type="button" data-action="open-training">整军募兵</button>
        `,
      )}

      <section class="people-summary" aria-label="人才概况">
        <div class="people-summary-item">
          <span>麾下人物</span>
          <strong>${officers.length} 人</strong>
          <p>已任职务 ${assignedCount}/3，可在下方随时调整。</p>
        </div>
        <div class="people-summary-item">
          <span>最高武略</span>
          <strong>${bestMartial}</strong>
          <p>主将武略提高全军战力，也降低正面血战损失。</p>
        </div>
        <div class="people-summary-item">
          <span>最高谋略</span>
          <strong>${bestStrategy}</strong>
          <p>军师谋略强化奇袭、火攻与守城判断。</p>
        </div>
      </section>

      <section class="content-section">
        <div class="section-title-row">
          <div>
            <h2>府中名册</h2>
            <p>任命不会消耗政令。主将可在出征时临时更换，但军师任上加成始终生效。</p>
          </div>
        </div>
        <div class="officer-grid">
          ${officers.map((officer) => renderOfficerCard(officer)).join("")}
        </div>
      </section>

      <section class="content-section">
        <div class="section-title-row">
          <div>
            <h2>在野贤才</h2>
            <p>只有已治州县中的历史人物会出现。礼聘消耗钱币与威望要求，不额外消耗政令。</p>
          </div>
          <span class="badge">候选 ${candidates.length}</span>
        </div>
        ${
          candidates.length
            ? `<div class="candidate-list">${candidates.map((figure) => renderCandidateCard(figure)).join("")}</div>`
            : `<div class="empty-state">
                <div>
                  <strong>府门外暂时无人候见</strong>
                  <p>发布求贤令可访得本境名士。攻取新的州郡后，当地人才也会进入可选范围。</p>
                  <button class="secondary-button" type="button" data-action="seek-talent" style="margin-top:14px" ${state.actionPoints < 1 ? "disabled" : ""}>访求贤才 · 1政令</button>
                </div>
              </div>`
        }
      </section>

      <section class="talent-notes">
        <div class="talent-note"><strong>太守</strong><p>治理高于6的太守会逐步提高田赋与市税。高治才还可每月增加民心。</p></div>
        <div class="talent-note"><strong>军师</strong><p>谋略影响奇袭、火攻与知己知彼。战斗前的胜算会随军师变化。</p></div>
        <div class="talent-note"><strong>主将</strong><p>武略决定出征军势。出征弹窗中可以临时更换统兵者，不改变府中任命。</p></div>
      </section>
    `;
  }

  function renderOfficerCard(officer) {
    const activeRoles = Object.entries(state.assignments)
      .filter(([, id]) => id === officer.id)
      .map(([role]) => ROLE_NAMES[role]);
    const isRuler = officer.isRuler || officer.id === "ruler";
    return `
      <article class="officer-card ${isRuler ? "ruler" : ""}">
        <span class="officer-avatar tone-${officer.tone || 0}">${escapeHtml(officer.name.slice(0, 1))}</span>
        <div class="officer-info">
          <div class="officer-heading">
            <div>
              <h3>${escapeHtml(officer.name)}${officer.courtesy ? `<small>字${escapeHtml(officer.courtesy)}</small>` : ""}</h3>
              <p class="officer-title">${escapeHtml(officer.title)}${isRuler ? " · 君主" : ""}</p>
            </div>
            ${activeRoles.length ? `<span class="badge green">${activeRoles.join(" / ")}</span>` : `<span class="badge">待命</span>`}
          </div>
          <div class="stat-mini-grid">
            ${renderStatMini("武略", officer.stats.martial)}
            ${renderStatMini("谋略", officer.stats.strategy)}
            ${renderStatMini("治理", officer.stats.governance)}
            ${renderStatMini("号召", officer.stats.charisma)}
          </div>
          <p class="officer-special">${escapeHtml(officer.special)}</p>
          <div class="role-row">
            ${Object.entries(ROLE_NAMES).map(([role, name]) => {
              const active = state.assignments[role] === officer.id;
              return `<button class="role-button ${active ? "active" : ""}" type="button" data-action="assign-role" data-id="${officer.id}" data-role="${role}">${active ? `卸任${name}` : `任${name}`}</button>`;
            }).join("")}
          </div>
        </div>
      </article>
    `;
  }

  function renderStatMini(label, value) {
    return `
      <div class="stat-mini">
        <span>${label}</span>
        <strong>${value}</strong>
        <div class="bar"><i style="width:${value * 10}%"></i></div>
      </div>
    `;
  }

  function renderCandidateCard(figure) {
    const cost = getRecruitCost(figure);
    const canHire = canRecruitCandidate(figure);
    const reason = state.resources.reputation < figure.rep ? `需威望${figure.rep}` : state.resources.coin < cost ? "钱币不足" : "可礼聘";
    return `
      <article class="candidate-card">
        <div>
          <div class="candidate-heading">
            <strong>${escapeHtml(figure.name)}</strong>
            <span>字${escapeHtml(figure.courtesy)} · ${escapeHtml(figure.title)}</span>
          </div>
          <p class="candidate-note">${escapeHtml(figure.note)}</p>
          <div class="candidate-stats">
            <span>武 <strong>${figure.stats.martial}</strong></span>
            <span>谋 <strong>${figure.stats.strategy}</strong></span>
            <span>治 <strong>${figure.stats.governance}</strong></span>
            <span>望 <strong>${figure.stats.charisma}</strong></span>
          </div>
          <p class="candidate-note"><strong>${escapeHtml(figure.special)}</strong></p>
        </div>
        <button
          class="primary-button"
          type="button"
          data-action="hire-candidate"
          data-id="${figure.id}"
          ${canHire ? "" : "disabled"}
          title="${escapeHtml(reason)}"
        >
          礼聘 · 钱${cost}
        </button>
      </article>
    `;
  }

  function seekTalent() {
    if (!ensureActionPoints()) {
      return;
    }
    const ids = findCandidateIds(state, 3, false);
    if (!ids.length) {
      showToast("已治州县中的可访贤才都已入府，或尚未到出场之年。", "warning");
      return;
    }
    state.actionPoints -= 1;
    state.candidates.push(...ids);
    const names = ids.map((id) => getFigure(id)?.name).filter(Boolean).join("、");
    addHistory(state, `发布求贤令，访得${names}。`, "general");
    renderGame();
    saveGame(false);
    showToast(`府门外来了${names}。`, "success");
  }

  function recruitCandidate(id) {
    const figure = getFigure(id);
    if (!figure || !state.candidates.includes(id)) {
      return;
    }
    const cost = getRecruitCost(figure);
    if (state.resources.reputation < figure.rep) {
      showToast(`${figure.name}认为你的威望尚不足以承载其志。`, "warning");
      return;
    }
    if (state.resources.coin < cost) {
      showToast("府库钱币不足，无法备下聘礼。", "warning");
      return;
    }
    state.resources.coin -= cost;
    state.candidates = state.candidates.filter((candidateId) => candidateId !== id);
    state.generals.push(id);
    state.resources.reputation += 1;
    if (!state.assignments.strategist && figure.stats.strategy >= 8) {
      state.assignments.strategist = id;
    }
    state.milestones.recruited = true;
    addHistory(state, `备礼延请${figure.name}（字${figure.courtesy}），${figure.title}自此入幕。`, "general");
    renderGame();
    saveGame(false);
    showToast(`${figure.name}入府。${figure.special}`, "success");
  }

  function assignRole(id, role) {
    if (!ROLE_NAMES[role] || !getOfficer(id)) {
      return;
    }
    if (state.assignments[role] === id) {
      state.assignments[role] = null;
      addHistory(state, `${getOfficer(id).name}卸去${ROLE_NAMES[role]}之职。`, "general");
    } else {
      Object.keys(state.assignments).forEach((key) => {
        if (state.assignments[key] === id) {
          state.assignments[key] = null;
        }
      });
      state.assignments[role] = id;
      addHistory(state, `任命${getOfficer(id).name}为${ROLE_NAMES[role]}。`, "general");
    }
    renderGame();
    saveGame(false);
  }

  function renderCourtView() {
    const activeCount = state.adoptedPolicies.length;
    return `
      ${viewHeading(
        "法令 · 仓廪 · 民心",
        "朝政与法度",
        "每道临机施政消耗一道政令。国策最多并行两项，可以对当前国策实行罢黜，但已花费的钱币不会退还。",
        `<span class="badge gold">国策 ${activeCount}/2</span>`,
      )}

      <div class="policy-layout">
        <section>
          <div class="section-title-row">
            <div>
              <h2>国策</h2>
              <p>国策持续生效，会改变每月粮钱、民心、军力或招贤效率。</p>
            </div>
          </div>
          <div class="policy-grid">
            ${POLICIES.map((policy) => renderPolicyCard(policy)).join("")}
          </div>
        </section>

        <aside class="section-card governance-panel">
          <div class="section-title-row">
            <div>
              <h2>临机施政</h2>
              <p>无需长期承诺，立即结算效果。</p>
            </div>
          </div>
          ${getCourtActions().map((action) => renderCourtAction(action)).join("")}
          <div class="law-summary">
            <strong>施政之道</strong><br />
            民心低于25时人口将开始流失；粮产不足以供养户口和军队时，月末会额外损失民心。守住粮道，才能守住一方。
          </div>
        </aside>
      </div>
    `;
  }

  function renderPolicyCard(policy) {
    const active = state.adoptedPolicies.includes(policy.id);
    const unlocked = state.controlled.length >= policy.minRegions;
    const canAdopt =
      unlocked &&
      !active &&
      state.adoptedPolicies.length < 2 &&
      state.actionPoints >= 1 &&
      canAffordCost(policy.cost);
    const canRepeal = active && state.actionPoints >= 1;
    let buttonLabel = "采纳 · 1政令";
    let disabled = !canAdopt;
    if (active) {
      buttonLabel = "罢黜 · 1政令";
      disabled = !canRepeal;
    } else if (!unlocked) {
      buttonLabel = `需据有${policy.minRegions}处州县`;
    } else if (state.adoptedPolicies.length >= 2) {
      buttonLabel = "国策名额已满";
    }

    return `
      <article class="policy-card ${active ? "active" : ""} ${unlocked ? "" : "locked"}">
        <div class="policy-card-top">
          <span class="policy-symbol">${policy.glyph}</span>
          <span class="badge ${active ? "green" : ""}">${active ? "施行中" : unlocked ? "可施行" : "未解锁"}</span>
        </div>
        <h3>${policy.name}</h3>
        <p>${policy.description}</p>
        <div class="cost-line">${renderCostTokens(policy.cost)}</div>
        <div class="policy-effect">${policy.effectText}</div>
        <button
          class="${active ? "ghost-button" : "secondary-button"}"
          type="button"
          data-action="toggle-policy"
          data-policy="${policy.id}"
          ${disabled ? "disabled" : ""}
        >${buttonLabel}</button>
      </article>
    `;
  }

  function getCourtActions() {
    return [
      {
        id: "inspect-county",
        glyph: "巡",
        name: "巡视县境",
        description: "亲访乡亭、审断小案，民心+5、威望+2。",
        cost: {},
        effects: { publicOrder: 5, reputation: 2 },
        log: "亲巡县境，问民疾苦，乡里称便。",
      },
      {
        id: "relieve-people",
        glyph: "赈",
        name: "开仓赈济",
        description: "耗粮80，民心+9、人口+45、威望+2。",
        cost: { grain: 80 },
        effects: { publicOrder: 9, population: 45, reputation: 2 },
        log: "开仓赈济贫弱，流散百姓渐有归意。",
      },
      {
        id: "levy-corvee",
        glyph: "役",
        name: "征发徭役",
        description: "木材+45、铁料+20，但民心-8。",
        cost: {},
        effects: { wood: 45, iron: 20, publicOrder: -8 },
        log: "征发民夫入山伐木、入矿采铁，府库物料增加。",
      },
      {
        id: "survey-land",
        glyph: "丈",
        name: "清丈田亩",
        description: "钱币+105，但豪强不满，民心-2。",
        cost: {},
        effects: { coin: 105, publicOrder: -2 },
        log: "重新清丈田亩与商籍，没收隐匿租税。",
      },
    ];
  }

  function renderCourtAction(action) {
    const possible =
      state.actionPoints >= 1 &&
      canAffordCost(action.cost);
    return `
      <div class="governance-action">
        <span class="governance-symbol">${action.glyph}</span>
        <div class="governance-copy">
          <strong>${action.name}</strong>
          <span>${action.description}</span>
          ${Object.keys(action.cost).length ? `<div class="cost-line">${renderCostTokens(action.cost)}</div>` : ""}
        </div>
        <button class="secondary-button" type="button" data-action="court-action" data-court-action="${action.id}" ${possible ? "" : "disabled"}>施行</button>
      </div>
    `;
  }

  function togglePolicy(id) {
    const policy = getPolicy(id);
    if (!policy || !ensureActionPoints()) {
      return;
    }
    const active = policyActive(id);
    if (active) {
      state.actionPoints -= 1;
      state.adoptedPolicies = state.adoptedPolicies.filter((policyId) => policyId !== id);
      addHistory(state, `罢黜《${policy.name}》，${policy.effectText}随之废止。`, "general");
      renderGame();
      saveGame(false);
      showToast(`已罢黜${policy.name}。`);
      return;
    }
    if (state.adoptedPolicies.length >= 2) {
      showToast("最多同时施行两项国策，请先罢黜一项。", "warning");
      return;
    }
    if (state.controlled.length < policy.minRegions) {
      showToast(`据有${policy.minRegions}处州县后才可施行此策。`, "warning");
      return;
    }
    if (!canAffordCost(policy.cost)) {
      showToast("府库钱币不足。", "warning");
      return;
    }
    state.actionPoints -= 1;
    payCost(policy.cost);
    state.adoptedPolicies.push(id);
    state.milestones.policy = true;
    addHistory(state, policy.log, "general");
    renderGame();
    saveGame(false);
    showToast(`《${policy.name}》开始施行。`, "success");
  }

  function performCourtAction(actionId) {
    const action = getCourtActions().find((item) => item.id === actionId);
    if (!action || !ensureActionPoints()) {
      return;
    }
    if (!canAffordCost(action.cost)) {
      showToast("所需粮秣或物资不足。", "warning");
      return;
    }
    state.actionPoints -= 1;
    payCost(action.cost);
    applyEffects(action.effects);
    addHistory(state, action.log, "general");
    renderGame();
    saveGame(false);
    showToast(action.log, "success");
  }

  function renderChronicleView() {
    const historyItems = state.history.slice(0, 80);
    return `
      ${viewHeading(
        "起于乡里 · 录于竹帛",
        "汉末治世录",
        "回看每一道政令、每一场战事和朝野大事。历史节点按东汉末年史实时间写入，人物与局势仍由你的选择改变。",
        `
          <button class="secondary-button" type="button" data-action="save-game">手动存档</button>
          <button class="ghost-button" type="button" data-action="open-settings">存档设置</button>
        `,
      )}

      <div class="chronicle-layout">
        <section class="section-card chronicle-panel">
          <div class="section-title-row">
            <div>
              <h2>治世纪事</h2>
              <p>${getDateLabel()} · 第${state.turn + 1}个月</p>
            </div>
            <span class="badge">${historyItems.length} 条近事</span>
          </div>
          <ol class="timeline">
            ${historyItems.map((entry) => `
              <li class="timeline-item ${escapeHtml(entry.type || "general")}">
                <span class="timeline-date">${formatNumber(entry.year)}年 ${MONTH_NAMES[(entry.month || 1) - 1]}</span>
                <p>${escapeHtml(entry.text)}</p>
              </li>
            `).join("")}
          </ol>
        </section>

        <aside>
          <div class="legacy-stats">
            <div class="legacy-stat"><span>治下州县</span><strong>${state.controlled.length}</strong></div>
            <div class="legacy-stat"><span>征伐胜绩</span><strong>${state.totals.wins}</strong></div>
            <div class="legacy-stat"><span>入伍贤才</span><strong>${state.generals.length}</strong></div>
            <div class="legacy-stat"><span>已历月份</span><strong>${state.totals.months}</strong></div>
            <div class="legacy-stat"><span>现有户口</span><strong>${formatNumber(state.resources.population)}</strong></div>
            <div class="legacy-stat"><span>天下威望</span><strong>${formatNumber(state.resources.reputation)}</strong></div>
          </div>
          <div class="history-disclaimer">
            游戏中的州郡位置、邻接关系、人物登场与数值均为策略玩法服务。重要年代与事件有史可循，但玩家可以选择改变走向；这里不是严格的史实推演器。
          </div>
          <div class="archive-actions">
            <button class="secondary-button" type="button" data-action="show-landing">返回开局页</button>
            <button class="danger-button" type="button" data-action="open-settings">重开或清除存档</button>
          </div>
        </aside>
      </div>
    `;
  }

  function renderRightRail() {
    const rank = currentRank();
    const nextRank = RANKS[RANKS.indexOf(rank) + 1];
    const nextNeed = nextRank ? nextRank.min : REGIONS.length;
    const progress = rank.next
      ? Math.min(100, (state.controlled.length / nextNeed) * 100)
      : 100;
    const advice = getAdvice();
    const missions = [
      ["built", "营建或扩建一处设施"],
      ["recruited", "礼聘一位在野贤才"],
      ["trained", "整训一支新军"],
      ["conquered", "攻取一处邻郡"],
    ];
    const reports = state.history.slice(0, 4);

    el.rightRail.innerHTML = `
      <section class="rail-section dark">
        <div class="goal-title">
          <strong>${rank.title}</strong>
          <span>${state.controlled.length} / ${REGIONS.length} 州县</span>
        </div>
        <div class="goal-progress">
          <div class="meter" role="progressbar" aria-label="天下进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(progress)}">
            <div class="meter-fill" style="width:${progress}%"></div>
          </div>
          <small>${rank.next ? `再取${Math.max(0, nextRank.min - state.controlled.length)}处可晋${nextRank.title}` : "山河归一，天下共主"}</small>
        </div>
      </section>

      <section class="rail-section">
        <div class="rail-heading"><h2>初兴四事</h2><span>${missions.filter(([key]) => state.milestones[key]).length}/4</span></div>
        <div class="mission-list">
          ${missions.map(([key, label]) => `
            <div class="mission-item ${state.milestones[key] ? "complete" : ""}">
              <span class="mission-check">✓</span>
              <span>${label}</span>
            </div>
          `).join("")}
        </div>
      </section>

      <section class="rail-section dark">
        <div class="rail-heading"><h2>军师献策</h2><span>本月</span></div>
        <div class="advisor-card">
          <span class="advisor-seal">${getAssignedOfficer("strategist") ? escapeHtml(getAssignedOfficer("strategist").name.slice(0, 1)) : "策"}</span>
          <div class="advisor-copy">
            <strong>${escapeHtml(advice.title)}</strong>
            <p>${escapeHtml(advice.text)}</p>
          </div>
        </div>
        <button class="secondary-button advisor-action" type="button" data-action="nav-view" data-view="${advice.view}">${escapeHtml(advice.label)}</button>
      </section>

      <section class="rail-section">
        <div class="rail-heading"><h2>本月奏报</h2><span>${getDateLabel()}</span></div>
        <div class="report-list">
          ${reports.map((entry) => `
            <div class="report-item">
              <span class="report-dot ${escapeHtml(entry.type || "")}"></span>
              <div>
                <p>${escapeHtml(entry.text)}</p>
                <time>${formatNumber(entry.year)}年 ${MONTH_NAMES[(entry.month || 1) - 1]}</time>
              </div>
            </div>
          `).join("")}
        </div>
      </section>

      <section class="turn-card">
        <p>现有${state.actionPoints}道政令可用。结束本月后将结算粮钱、人口、民心与营建进度。</p>
        <button class="primary-button" type="button" data-action="next-turn" ${state.gameOver ? "disabled" : ""}>
          ${state.gameOver ? "基业已定" : "结束本月"}
        </button>
      </section>
    `;
  }

  function showDialog({
    kicker = "",
    title,
    subtitle = "",
    content = "",
    actions = [],
    dismissible = true,
  }) {
    if (el.dialog.open) {
      el.dialog.close();
    }
    el.dialog.dataset.dismissible = String(dismissible);
    el.dialogClose.hidden = !dismissible;
    el.dialogKicker.textContent = kicker;
    el.dialogKicker.hidden = !kicker;
    el.dialogTitle.textContent = title;
    el.dialogSubtitle.textContent = subtitle;
    el.dialogSubtitle.hidden = !subtitle;
    el.dialogContent.innerHTML = content;
    el.dialogActions.innerHTML = "";
    el.dialogActions.hidden = actions.length === 0;

    actions.forEach((action) => {
      const button = document.createElement("button");
      const classMap = {
        primary: "primary-button",
        secondary: "secondary-button",
        ghost: "ghost-button",
        danger: "danger-button",
      };
      button.type = "button";
      button.className = classMap[action.kind || "secondary"] || "secondary-button";
      button.textContent = action.label;
      button.disabled = Boolean(action.disabled);
      button.addEventListener("click", () => {
        if (action.close !== false) {
          closeDialog();
        }
        action.onClick?.();
      });
      el.dialogActions.appendChild(button);
    });

    el.dialog.showModal();
    el.dialogContent.scrollTop = 0;
    return el.dialog;
  }

  function closeDialog() {
    if (el.dialog.open) {
      el.dialog.close();
    }
  }

  function showToast(message, type = "") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`.trim();
    toast.textContent = message;
    el.toastRegion.appendChild(toast);
    announce(message);
    window.setTimeout(() => {
      toast.remove();
    }, 4200);
  }

  function announce(message) {
    el.srStatus.textContent = "";
    window.setTimeout(() => {
      el.srStatus.textContent = message;
    }, 30);
  }

  function openGuide() {
    showDialog({
      kicker: "领主手册",
      title: "从一县之地，走到山河一统",
      subtitle: "游戏按月份推进。每月有三道政令，可用于营建、募兵、访贤、施政或出征。",
      content: `
        <div class="guide-grid">
          <div class="guide-item">
            <strong>一月一结</strong>
            <p>结束本月后结算粮钱、消耗、人口、民心与施工。秋月粮产提高；粮荒会显著损伤民心。</p>
          </div>
          <div class="guide-item">
            <strong>先治内，再拓土</strong>
            <p>农田与市集是长期基础，校场提高军额，城墙降低敌军袭扰造成的损失。城郭等级随州县数量提升。</p>
          </div>
          <div class="guide-item">
            <strong>择人任事</strong>
            <p>太守、军师、主将各一人。礼聘不耗政令，但需要达到人物要求的威望；所有角色可随时调整。</p>
          </div>
          <div class="guide-item">
            <strong>邻郡方可征伐</strong>
            <p>天下图中红色节点与治下接壤。出征前会给出预估胜算，可切换统兵者和战术，但随机战况仍会影响结果。</p>
          </div>
          <div class="guide-item">
            <strong>国策有限</strong>
            <p>最多同时采纳两项国策。国策持续改变月结，可以罢黜，但花费不返还。</p>
          </div>
          <div class="guide-item">
            <strong>自动存档</strong>
            <p>每次行动与月末都会写入浏览器本地存档。存档按钮用于确认写入，设置中可以清除旧档重新开始。</p>
          </div>
        </div>
        <div class="dialog-note" style="margin-top:14px">
          历史说明：州郡地名、人物籍贯、主要阵营和年代事件依据汉末历史整理；地图为写意战略图，部分人物登场年份、能力、经济产出与战斗过程经过游戏化调整。
        </div>
      `,
      actions: [{ label: "知道了", kind: "primary" }],
    });
  }

  function openBriefing() {
    if (!state) {
      openGuide();
      return;
    }
    const advice = getAdvice();
    const balance = computeMonthlyBalance();
    showDialog({
      kicker: "军府奏报",
      title: `${getDateLabel()} · ${currentRank().title}`,
      subtitle: `现有政令 ${state.actionPoints}/${state.maxActionPoints} · 治下 ${state.controlled.length} 处州县`,
      content: `
        <div class="battle-grid">
          <div class="battle-side">
            <span>本月军师献策</span>
            <h3>${escapeHtml(advice.title)}</h3>
            <p>${escapeHtml(advice.text)}</p>
          </div>
          <div class="battle-side">
            <span>月末预计</span>
            <h3>粮 ${signed(balance.net.grain)} · 钱 ${signed(balance.net.coin)}</h3>
            <p>人口 ${signed(balance.populationGrowth)}，民心 ${signed(balance.orderDelta)}，劳力 +${balance.manpowerGrowth}。${balance.harvest > 1 ? "本月有秋收加成。" : ""}</p>
          </div>
        </div>
        <div class="dialog-note" style="margin-top:12px">
          ${state.history.slice(0, 3).map((entry) => escapeHtml(entry.text)).join("<br />")}
        </div>
      `,
      actions: [
        {
          label: advice.label,
          kind: "primary",
          onClick: () => switchView(advice.view),
        },
      ],
    });
  }

  function openSettings() {
    if (!state) {
      return;
    }
    showDialog({
      kicker: "存档与设置",
      title: "治世记录",
      subtitle: `当前进度：${getDateLabel()} · ${currentRank().title} · 治下${state.controlled.length}处`,
      content: `
        <p class="dialog-narrative">存档保存在当前浏览器中，不会上传到网络。关闭页面后可从开局页续治。</p>
        <div class="dialog-note">
          自动存档状态：每次政令、任命、建设、招募、战事和月末结算后写入。
          ${ui.lastSavedAt ? `<br />最近写入：${escapeHtml(new Date(ui.lastSavedAt).toLocaleString("zh-CN"))}` : ""}
        </div>
      `,
      actions: [
        {
          label: "手动存档",
          kind: "secondary",
          onClick: () => saveGame(true),
        },
        {
          label: "玩法说明",
          kind: "secondary",
          onClick: openGuide,
        },
        {
          label: "返回开局页",
          kind: "secondary",
          onClick: () => {
            saveGame(false);
            showLanding();
          },
        },
        {
          label: "清除存档并重开",
          kind: "danger",
          onClick: () => {
            showDialog({
              kicker: "确认清除",
              title: "要抹去这一卷治世录吗？",
              subtitle: "此操作会删除当前浏览器中的唯一存档，且无法从游戏内恢复。",
              content: `<p class="dialog-narrative">你已经走到${getDateLabel()}，治下共有${state.controlled.length}处州县。若只想返回开局页，可选择“返回开局页”。</p>`,
              actions: [
                { label: "保留旧档", kind: "secondary" },
                { label: "确认清除", kind: "danger", onClick: clearSaveAndReturn },
              ],
            });
          },
        },
      ],
    });
  }

  function ensureActionPoints() {
    if (!state) {
      return false;
    }
    if (state.actionPoints < 1) {
      showToast("本月政令已经用尽，结束本月后可重新获得三道政令。", "warning");
      return false;
    }
    return true;
  }

  function canAffordCost(cost, targetState = state) {
    if (!cost) {
      return true;
    }
    return Object.entries(cost).every(([key, value]) => {
      if (key === "army") {
        return Object.entries(value).every(([unit, amount]) => (targetState.army[unit] || 0) >= amount);
      }
      return (targetState.resources[key] || 0) >= value;
    });
  }

  function payCost(cost) {
    if (!cost) {
      return;
    }
    Object.entries(cost).forEach(([key, value]) => {
      if (key === "army") {
        Object.entries(value).forEach(([unit, amount]) => {
          state.army[unit] = Math.max(0, (state.army[unit] || 0) - amount);
        });
      } else {
        state.resources[key] = Math.max(0, (state.resources[key] || 0) - value);
      }
    });
  }

  function applyEffects(effects) {
    Object.entries(effects || {}).forEach(([key, value]) => {
      if (key === "army") {
        Object.entries(value).forEach(([unit, amount]) => {
          state.army[unit] = Math.max(0, (state.army[unit] || 0) + amount);
        });
      } else if (key === "publicOrder") {
        state.publicOrder = clamp(state.publicOrder + value, 0, 100);
      } else if (key === "defenseBonus") {
        state.defenseBonus += value;
      } else if (Object.prototype.hasOwnProperty.call(state.resources, key)) {
        state.resources[key] = Math.max(0, (state.resources[key] || 0) + value);
      }
    });
    state.resources.population = Math.max(50, state.resources.population);
    state.publicOrder = clamp(state.publicOrder, 0, 100);
  }

  function getCostLabel(key) {
    return {
      grain: "粮",
      coin: "钱",
      wood: "木",
      iron: "铁",
      manpower: "劳力",
      reputation: "威望",
      population: "人口",
    }[key] || key;
  }

  function renderCostTokens(cost) {
    return Object.entries(cost || {})
      .flatMap(([key, value]) => {
        if (key === "army") {
          return Object.entries(value).map(([unit, amount]) => {
            const insufficient = (state?.army?.[unit] || 0) < amount;
            return `<span class="cost-token ${insufficient ? "insufficient" : ""}">${UNIT_INFO[unit]?.name || unit} ${amount}</span>`;
          });
        }
        const insufficient = (state?.resources?.[key] || 0) < value;
        return `<span class="cost-token ${insufficient ? "insufficient" : ""}">${getCostLabel(key)} ${value}</span>`;
      })
      .join("");
  }

  function getConstructionCost(type, targetLevel) {
    const definition = getBuildingDefinition(type);
    if (!definition) {
      return {};
    }
    const multiplier = targetLevel <= 1 ? 1 : 1 + (targetLevel - 1) * 0.72;
    return Object.fromEntries(
      Object.entries(definition.baseCost).map(([key, value]) => [key, Math.round(value * multiplier)]),
    );
  }

  function getConstructionTime(targetLevel) {
    if (targetLevel <= 1) {
      return 1;
    }
    if (targetLevel >= 4) {
      return 3;
    }
    return 2;
  }

  function openBuildDialog(slot) {
    if (
      slot < 0 ||
      slot >= currentRank().slots ||
      state.structures[slot] ||
      state.constructions.some((project) => project.slot === slot)
    ) {
      return;
    }

    const options = Object.entries(BUILDINGS).map(([type, definition]) => {
      const cost = getConstructionCost(type, 1);
      const canBuild = state.actionPoints >= 1 && canAffordCost(cost);
      return `
        <div class="build-option">
          <span class="build-option-glyph">${definition.glyph}</span>
          <div class="build-option-copy">
            <strong>${definition.name}</strong>
            <span>${definition.description}</span>
            <small>${definition.effect(1)} · 工期${getConstructionTime(1)}月</small>
            <div class="cost-line">${renderCostTokens(cost)}</div>
          </div>
          <button
            class="secondary-button"
            type="button"
            data-action="start-build"
            data-slot="${slot}"
            data-type="${type}"
            ${canBuild ? "" : "disabled"}
          >开建</button>
        </div>
      `;
    }).join("");

    showDialog({
      kicker: `第${slot + 1}处营建地`,
      title: "辟地兴造",
      subtitle: "营建消耗一道政令，所需物料在开工时扣除。",
      content: `
        <p class="dialog-narrative">荒地上能长出什么，取决于这方水土最缺什么。农田养兵，市集生财，城墙保命。</p>
        <div class="build-option-list">${options}</div>
      `,
      actions: [{ label: "暂不营建", kind: "secondary" }],
    });
  }

  function openUpgradeDialog(slot) {
    const structure = state.structures[slot];
    if (!structure || state.constructions.some((project) => project.slot === slot)) {
      return;
    }
    const definition = getBuildingDefinition(structure.type);
    if (!definition) {
      return;
    }
    if (structure.level >= definition.maxLevel) {
      showDialog({
        kicker: "营建完成",
        title: `${definition.name}已达最高等级`,
        subtitle: definition.effect(structure.level),
        content: `<p class="dialog-narrative">此处设施已经完整。新的发展需要另辟营建地，或以战功提升领主爵位。</p>`,
        actions: [{ label: "返回", kind: "secondary" }],
      });
      return;
    }
    const targetLevel = structure.level + 1;
    const cost = getConstructionCost(structure.type, targetLevel);
    const canBuild = state.actionPoints >= 1 && canAffordCost(cost);
    showDialog({
      kicker: `${definition.name} · 扩建`,
      title: `${structure.level}级 → ${targetLevel}级`,
      subtitle: `工期${getConstructionTime(targetLevel)}月，完成后下月开始生效。`,
      content: `
        <p class="dialog-narrative">${definition.description}</p>
        <div class="battle-grid">
          <div class="battle-side"><span>当前效果</span><h3>${definition.effect(structure.level)}</h3></div>
          <div class="battle-side"><span>扩建效果</span><h3>${definition.effect(targetLevel)}</h3></div>
        </div>
        <div class="cost-preview">${renderCostTokens(cost)}<span>消耗政令 1</span></div>
      `,
      actions: [
        { label: "暂不扩建", kind: "secondary" },
        {
          label: "开始扩建",
          kind: "primary",
          disabled: !canBuild,
          onClick: () => startUpgrade(slot),
        },
      ],
    });
  }

  function startConstruction(slot, type) {
    const definition = getBuildingDefinition(type);
    if (!definition || !ensureActionPoints()) {
      return;
    }
    if (
      slot >= currentRank().slots ||
      state.structures[slot] ||
      state.constructions.some((project) => project.slot === slot)
    ) {
      showToast("此处已经无法再开工。", "warning");
      return;
    }
    const cost = getConstructionCost(type, 1);
    if (!canAffordCost(cost)) {
      showToast("木材、粮秣或钱币不足。", "warning");
      return;
    }
    payCost(cost);
    state.actionPoints -= 1;
    const time = getConstructionTime(1);
    state.constructions.push({ slot, type, targetLevel: 1, remaining: time });
    addHistory(state, `下令在第${slot + 1}处荒地营建${definition.name}，预计${time}月完工。`, "general");
    closeDialog();
    renderGame();
    saveGame(false);
    showToast(`${definition.name}开始营建。`, "success");
  }

  function startUpgrade(slot) {
    if (!ensureActionPoints()) {
      return;
    }
    const structure = state.structures[slot];
    if (!structure || state.constructions.some((project) => project.slot === slot)) {
      return;
    }
    const definition = getBuildingDefinition(structure.type);
    if (!definition || structure.level >= definition.maxLevel) {
      return;
    }
    const targetLevel = structure.level + 1;
    const cost = getConstructionCost(structure.type, targetLevel);
    if (!canAffordCost(cost)) {
      showToast("扩建所需物资不足。", "warning");
      return;
    }
    payCost(cost);
    state.actionPoints -= 1;
    const time = getConstructionTime(targetLevel);
    state.constructions.push({ slot, type: structure.type, targetLevel, remaining: time });
    addHistory(state, `扩建${definition.name}至${targetLevel}级，工程预计${time}月。`, "general");
    closeDialog();
    renderGame();
    saveGame(false);
    showToast(`${definition.name}开始扩建至${targetLevel}级。`, "success");
  }

  function getUnitTrainingCost(unitType) {
    const unit = UNIT_INFO[unitType];
    if (!unit) {
      return {};
    }
    const barracksDiscount = 1 - Math.min(0.18, sumBuildingLevels("barracks") * 0.03);
    let originDiscount = 1;
    if (unitType === "cavalry") {
      originDiscount = currentOrigin().mods.cavalryCost || 1;
    } else if (unitType === "archer") {
      originDiscount = currentOrigin().mods.archerCost || 1;
    }
    return Object.fromEntries(
      Object.entries(unit.cost).map(([key, value]) => [
        key,
        Math.max(1, Math.round(value * barracksDiscount * originDiscount)),
      ]),
    );
  }

  function openTrainingDialog() {
    if (!state) {
      return;
    }
    const current = totalArmy();
    const cap = armyCapacity();
    const options = Object.entries(UNIT_INFO).map(([type, unit]) => {
      const cost = getUnitTrainingCost(type);
      const enoughSpace = current + unit.batch <= cap;
      const canTrain = enoughSpace && state.actionPoints >= 1 && canAffordCost(cost);
      const reason = !enoughSpace ? "军额不足" : canAffordCost(cost) ? "可募训" : "物资或劳力不足";
      return `
        <div class="build-option">
          <span class="build-option-glyph">${unit.glyph}</span>
          <div class="build-option-copy">
            <strong>${unit.name} ${unit.batch}人</strong>
            <span>战力系数 ${unit.power.toFixed(2)}。${type === "cavalry" ? "骑兵战力高，但依赖铁料与马匹。" : type === "archer" ? "弓手受谋略与地利加成，攻城时尤其有用。" : "步卒是军阵根基，廉价且可靠。"}</span>
            <small>${reason}</small>
            <div class="cost-line">${renderCostTokens(cost)}</div>
          </div>
          <button
            class="primary-button"
            type="button"
            data-action="train-unit"
            data-unit="${type}"
            ${canTrain ? "" : "disabled"}
          >募训</button>
        </div>
      `;
    }).join("");

    showDialog({
      kicker: "校场点兵",
      title: "整军募兵",
      subtitle: `现有${formatNumber(current)}人，军额上限${formatNumber(cap)}人。每批募训消耗一道政令。`,
      content: `
        <div class="dialog-note" style="margin-bottom:13px">
          可用劳力 ${formatNumber(state.resources.manpower)}。校场每级降低募兵成本3%，当前校场${sumBuildingLevels("barracks")}级。
        </div>
        <div class="build-option-list">${options}</div>
      `,
      actions: [{ label: "暂不募兵", kind: "secondary" }],
    });
  }

  function trainUnit(type) {
    const unit = UNIT_INFO[type];
    if (!unit || !ensureActionPoints()) {
      return;
    }
    if (totalArmy() + unit.batch > armyCapacity()) {
      showToast("营房与军额不足，请先扩建校场或提升爵位。", "warning");
      return;
    }
    const cost = getUnitTrainingCost(type);
    if (!canAffordCost(cost)) {
      showToast("粮、钱、铁料或劳力不足。", "warning");
      return;
    }
    payCost(cost);
    state.actionPoints -= 1;
    state.army[type] = (state.army[type] || 0) + unit.batch;
    state.milestones.trained = true;
    addHistory(state, `募训${unit.name}${unit.batch}人，军容渐盛。`, "general");
    renderGame();
    saveGame(false);
    showToast(`${unit.name}+${unit.batch}，现役${formatNumber(totalArmy())}人。`, "success");
    openTrainingDialog();
  }

  function openBattleDialog(regionId) {
    const region = getRegion(regionId);
    if (!region || state.controlled.includes(regionId) || !hasAdjacentEnemy(region)) {
      return;
    }
    const officers = getAllOfficers();
    const commanderId = officers.some((officer) => officer.id === state.assignments.commander)
      ? state.assignments.commander
      : "ruler";
    battleDraft = {
      regionId,
      commanderId,
      tacticId: "assault",
    };

    const commanderOptions = officers.map(
      (officer) =>
        `<option value="${officer.id}" ${officer.id === commanderId ? "selected" : ""}>${escapeHtml(officer.name)} · 武${officer.stats.martial} 谋${officer.stats.strategy}</option>`,
    ).join("");

    showDialog({
      kicker: "出征点将",
      title: `进兵${region.name}`,
      subtitle: `守军约${formatNumber(getRegionGarrison(region))}，城防${region.defense}。战斗受统兵者、军师、战术、民心与随机战况共同影响。`,
      content: `
        <div class="battle-grid">
          <div class="battle-side">
            <span>我军</span>
            <h3>${escapeHtml(state.rulerName)}军</h3>
            <p>步${state.army.infantry} · 弓${state.army.archer} · 骑${state.army.cavalry}</p>
            <div class="battle-values"><span>民心 ${Math.round(state.publicOrder)}</span><span>城防 ${getDefenseValue()}</span></div>
          </div>
          <div class="battle-side enemy">
            <span>敌军</span>
            <h3>${escapeHtml(getRegionLord(region))}</h3>
            <p>${escapeHtml(region.zhou)}${escapeHtml(region.name)}守军</p>
            <div class="battle-values"><span>城防 ${region.defense}</span><span>守军 ${formatNumber(getRegionGarrison(region))}</span></div>
          </div>
        </div>
        <div class="field-stack" style="margin-top:15px">
          <label for="battle-commander">临阵统兵</label>
          <select class="select-field" id="battle-commander">${commanderOptions}</select>
        </div>
        <div class="tactic-grid" aria-label="选择战术">
          ${TACTICS.map((tactic) => {
            const disabled = tactic.cost && !canAffordCost(tactic.cost);
            return `
              <button class="tactic-option ${tactic.id === battleDraft.tacticId ? "selected" : ""}" type="button" data-action="set-tactic" data-tactic="${tactic.id}" ${disabled ? "disabled" : ""}>
                <strong>${tactic.name}</strong>
                <span>${tactic.description}${tactic.cost ? ` 消耗木材${tactic.cost.wood}。` : ""}</span>
              </button>
            `;
          }).join("")}
        </div>
        <div class="war-estimate" style="margin-top:16px">
          <span class="war-estimate-ring" id="battle-chance-ring">--</span>
          <div class="war-estimate-copy">
            <strong id="battle-chance-label">计算军势中</strong>
            <p id="battle-chance-detail">战术与统兵者会即时改变胜算。</p>
          </div>
        </div>
      `,
      actions: [
        { label: "收兵回府", kind: "secondary" },
        {
          label: "下令出征 · 1政令",
          kind: "primary",
          disabled: state.actionPoints < 1 || totalArmy() <= 0,
          onClick: executeBattle,
        },
      ],
    });

    const commanderSelect = document.getElementById("battle-commander");
    commanderSelect?.addEventListener("change", (event) => {
      if (!battleDraft) {
        return;
      }
      battleDraft.commanderId = event.target.value;
      updateBattlePreview();
    });
    updateBattlePreview();
  }

  function setBattleTactic(tacticId) {
    if (!battleDraft || !TACTICS.some((tactic) => tactic.id === tacticId)) {
      return;
    }
    battleDraft.tacticId = tacticId;
    el.dialogContent.querySelectorAll(".tactic-option").forEach((button) => {
      button.classList.toggle("selected", button.dataset.tactic === tacticId);
    });
    updateBattlePreview();
  }

  function updateBattlePreview() {
    if (!battleDraft) {
      return;
    }
    const region = getRegion(battleDraft.regionId);
    if (!region) {
      return;
    }
    const chance = getBattleChance(region, battleDraft.commanderId, battleDraft.tacticId);
    const playerPower = getArmyPower(state, battleDraft.commanderId, battleDraft.tacticId);
    const enemyPower = getEnemyPower(region, state, battleDraft.tacticId);
    const ring = document.getElementById("battle-chance-ring");
    const label = document.getElementById("battle-chance-label");
    const detail = document.getElementById("battle-chance-detail");
    if (ring) {
      ring.textContent = `${Math.round(chance * 100)}%`;
    }
    if (label) {
      label.textContent = getBattleAssessment(chance);
    }
    if (detail) {
      detail.textContent = `我军军势约${Math.round(playerPower)}，敌军约${Math.round(enemyPower)}。此数值不含最后的随机战况。`;
    }
  }

  function executeBattle() {
    if (!battleDraft || !ensureActionPoints()) {
      return;
    }
    const region = getRegion(battleDraft.regionId);
    const tactic = TACTICS.find((item) => item.id === battleDraft.tacticId) || TACTICS[0];
    if (!region || !hasAdjacentEnemy(region) || totalArmy() <= 0) {
      showToast("当前无法向该地出兵。", "warning");
      return;
    }
    if (tactic.cost && !canAffordCost(tactic.cost)) {
      showToast("战术所需木料不足。", "warning");
      return;
    }

    const commanderId = battleDraft.commanderId;
    const tacticId = battleDraft.tacticId;
    const commander = getOfficer(commanderId) || getRulerOfficer();
    const playerPower = getArmyPower(state, commanderId, tacticId);
    const enemyPower = getEnemyPower(region, state, tacticId);
    const chance = getBattleChance(region, commanderId, tacticId);
    state.actionPoints -= 1;
    if (tactic.cost) {
      payCost(tactic.cost);
    }
    closeDialog();

    const randomSwing = 0.88 + Math.random() * 0.24;
    const won = playerPower * randomSwing >= enemyPower * (1.0 + (Math.random() - 0.5) * 0.08);
    let lossRate = won
      ? 0.065 + (enemyPower / Math.max(1, playerPower)) * 0.095
      : 0.17 + (enemyPower / Math.max(1, playerPower)) * 0.13;
    lossRate *= tactic.loss;
    if (tacticId === "raid" && commanderId === "fazheng") {
      lossRate *= 0.86;
    }
    if (won && commanderId === "zhanghe") {
      lossRate *= 0.9;
    }
    lossRate = clamp(lossRate, 0.035, 0.42);

    const losses = applyArmyLossRate(lossRate, commanderId);
    const logLines = [];

    if (tacticId === "fire") {
      logLines.push(`${region.name}城外粮道起火，守军阵脚浮动。`);
    } else if (tacticId === "raid") {
      logLines.push(`${commander.name}挑选轻骑精锐，沿小路逼近${region.name}。`);
    } else if (tacticId === "encircle") {
      logLines.push(`${commander.name}分兵三路，故意留出西门，诱使守军弃城。`);
    } else {
      logLines.push(`${commander.name}列阵于${region.name}城下，鼓声与旌旗压向城头。`);
    }

    if (won) {
      state.controlled.push(region.id);
      state.resources.population += region.population;
      state.resources.manpower += 35;
      state.resources.grain += region.reward.grain;
      state.resources.coin += region.reward.coin;
      if (commanderId === "xuhuang") {
        state.resources.grain += 20;
      }
      state.resources.reputation += 8 + Math.round(region.defense / 12) + (region.id === "luoyang" ? 12 : 0);
      state.publicOrder = clamp(state.publicOrder - 2, 0, 100);
      delete state.regionWear[region.id];
      state.totals.wins += 1;
      state.milestones.conquered = true;
      logLines.push(`守军力竭，${region.name}城门洞开。你收降地方吏民，将其纳入治下。`);

      const newlyDiscovered = findCandidateIds(state, 2, false);
      if (newlyDiscovered.length) {
        state.candidates.push(...newlyDiscovered);
        logLines.push(`${newlyDiscovered.map((id) => getFigure(id)?.name).filter(Boolean).join("、")}闻讯来投，已列入府中候选。`);
      }

      addHistory(
        state,
        `发兵征讨${region.name}，由${commander.name}统军，破${getRegionLordBeforeCapture(region)}守军，纳入治下。折损${losses}人。`,
        "battle",
      );
    } else {
      const previousWear = state.regionWear[region.id] || 0;
      state.regionWear[region.id] = Math.min(0.55, previousWear + 0.09 + Math.random() * 0.1);
      state.resources.reputation = Math.max(0, state.resources.reputation - 2);
      state.publicOrder = clamp(state.publicOrder - 5, 0, 100);
      state.resources.coin = Math.max(0, state.resources.coin - 25);
      state.totals.defeats += 1;
      logLines.push(`守军据城反击，我军阵线崩动。${commander.name}鸣金退兵，暂且保留残部。`);
      logLines.push(`此战削弱了${region.name}守备约${Math.round((state.regionWear[region.id] - previousWear) * 100)}%，但威望与军心受损。`);
      addHistory(
        state,
        `征讨${region.name}未克，${commander.name}收拢残部退回治所，折损${losses}人。`,
        "battle",
      );
    }

    const victory = won && state.controlled.length >= REGIONS.length;
    if (victory) {
      state.gameOver = true;
      state.ending = "unified";
      addHistory(state, "十二州郡尽归治下，海内重归一统。史官将今日写入新朝开篇。", "history");
    }

    battleDraft = null;
    renderGame();
    saveGame(false);
    showBattleResult(region, commander, won, losses, logLines, chance, victory);
  }

  function getRegionLordBeforeCapture(region) {
    return region.factions[state.year] || region.factions[getEraFactionKey()] || "州郡";
  }

  function applyArmyLossRate(rate, commanderId) {
    let totalLoss = 0;
    Object.entries(state.army).forEach(([unit, count]) => {
      let unitRate = rate;
      if (unit === "infantry" && commanderId === "madai") {
        unitRate *= 0.88;
      }
      const loss = Math.min(count, Math.round(count * unitRate));
      state.army[unit] = Math.max(0, count - loss);
      totalLoss += loss;
    });
    return totalLoss;
  }

  function showBattleResult(region, commander, won, losses, logLines, chance, victory) {
    showDialog({
      kicker: won ? "捷报" : "败报",
      title: won ? `克复${region.name}` : `${region.name}战事不利`,
      subtitle: `${commander.name}统兵 · 预估胜算${Math.round(chance * 100)}% · 折损${losses}人`,
      content: `
        <div class="result-banner ${won ? "" : "defeat"}">
          <strong>${won ? "破城而入" : "收兵回府"}</strong>
          <span>${won ? `新增人口${formatNumber(region.population)}，缴获粮${region.reward.grain}、钱${region.reward.coin}` : `现役兵马${formatNumber(totalArmy())}人，仍需整顿再战`}</span>
        </div>
        <ul class="battle-log">
          ${logLines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}
        </ul>
        ${
          victory
            ? `<div class="dialog-note" style="margin-top:14px">天下十二州郡已经全部纳入治下。乱世并未自动终结，但这一卷山河志已经写到新的开篇。</div>`
            : ""
        }
      `,
      actions: victory
        ? [
            { label: "继续巡视", kind: "secondary" },
            {
              label: "写下天下结局",
              kind: "primary",
              onClick: openEndingDialog,
            },
          ]
        : [{ label: "返回天下图", kind: "primary" }],
    });
  }

  function openEndingDialog() {
    if (!state) {
      return;
    }
    const title = currentRank().title;
    showDialog({
      kicker: "山河一统",
      title: `${state.rulerName} · 天下共主`,
      subtitle: `${getDateLabel()}，十二州郡尽归治下。`,
      content: `
        <p class="dialog-narrative">
          你从${currentOrigin().zhou}${currentOrigin().seat}的一处乡里起兵，经历${state.totals.months}个月，
          礼聘${state.generals.length}位贤才，赢得${state.totals.wins}场征伐。昔日写意舆图上的十二枚城印，如今都刻着同一个名号。
        </p>
        <div class="war-estimate">
          <span class="war-estimate-ring">止</span>
          <div class="war-estimate-copy">
            <strong>${title} · 天下归心</strong>
            <p>这不是史书的终点，而是属于你的汉末。可在设置中保留此档，或清除旧档开启另一个州县。</p>
          </div>
        </div>
      `,
      actions: [
        { label: "回看山河", kind: "secondary" },
        {
          label: "重新开局",
          kind: "primary",
          onClick: showLanding,
        },
      ],
    });
  }

  function advanceTurn() {
    if (!state || ui.processing || state.gameOver) {
      return;
    }
    if (state.pendingEventId) {
      const pending = EVENTS.find((event) => event.id === state.pendingEventId);
      if (pending) {
        showEventDialog(pending);
      }
      return;
    }
    if (el.dialog.open) {
      return;
    }

    ui.processing = true;
    const balance = computeMonthlyBalance();
    const grainBeforeUpkeep = state.resources.grain + balance.gross.grain;
    const grainShortage = grainBeforeUpkeep < balance.upkeep.grain;
    const completedProjects = [];

    state.resources.grain = grainBeforeUpkeep - balance.upkeep.grain;
    state.resources.coin += balance.gross.coin - balance.upkeep.coin;
    state.resources.wood += balance.gross.wood;
    state.resources.iron += balance.gross.iron;
    state.resources.reputation += balance.reputation;

    const coinShortage = state.resources.coin < 0;
    if (grainShortage) {
      state.resources.grain = 0;
    }
    if (coinShortage) {
      state.resources.coin = 0;
    }
    Object.keys(state.resources).forEach((key) => {
      state.resources[key] = Math.max(0, state.resources[key]);
    });

    if (balance.populationGrowth > 0 && state.resources.population < balance.populationCap) {
      state.resources.population += balance.populationGrowth;
      state.resources.population = Math.min(balance.populationCap, state.resources.population);
    } else if (balance.populationGrowth < 0) {
      state.resources.population = Math.max(50, state.resources.population + balance.populationGrowth);
    }
    state.resources.manpower += balance.manpowerGrowth;
    state.resources.manpower = Math.min(
      Math.max(state.resources.manpower, 0),
      Math.max(120, Math.round(state.resources.population * 0.34)),
    );

    let orderDelta = balance.orderDelta;
    if (coinShortage) {
      orderDelta -= 2;
    }
    state.publicOrder = clamp(state.publicOrder + orderDelta, 0, 100);

    state.constructions.forEach((project) => {
      project.remaining -= 1;
      if (project.remaining <= 0 && state.structures[project.slot] === null) {
        state.structures[project.slot] = {
          type: project.type,
          level: project.targetLevel,
        };
        completedProjects.push(project);
      }
    });
    state.constructions = state.constructions.filter((project) => project.remaining > 0);

    completedProjects.forEach((project) => {
      const definition = getBuildingDefinition(project.type);
      addHistory(state, `${definition?.name || project.type}营建完成，现已达到${project.targetLevel}级。`, "general");
      state.milestones.built = true;
    });

    if (grainShortage) {
      addHistory(state, "军食民用超过本月粮入，仓廪见底，乡里出现饥馑与怨声。", "general");
    }
    if (coinShortage) {
      addHistory(state, "府库钱币不敷军饷与俸禄，军中人心略有不稳。", "general");
    }

    state.turn += 1;
    state.totals.months += 1;
    state.month += 1;
    if (state.month > 12) {
      state.month = 1;
      state.year += 1;
    }
    state.actionPoints = state.maxActionPoints;

    const historicalEvent = checkHistoricalMilestone();
    const raidResult = maybeRaid();
    const event = maybeSelectEvent();
    if (event) {
      state.pendingEventId = event.id;
    }

    renderGame();
    saveGame(false);
    ui.processing = false;

    if (event) {
      showEventDialog(event);
    } else {
      const productionMessage = `月末结算：粮${signed(balance.net.grain)}、钱${signed(balance.net.coin)}、民心${signed(orderDelta)}。`;
      showToast(productionMessage, grainShortage || coinShortage ? "warning" : "success");
    }
    if (raidResult) {
      window.setTimeout(() => showToast(raidResult.text, raidResult.success ? "success" : "battle"), 140);
    }
    if (historicalEvent) {
      window.setTimeout(() => showToast(historicalEvent, "warning"), 260);
    }
  }

  function checkHistoricalMilestone() {
    const milestone = MILESTONES[state.year]?.[state.month];
    if (!milestone) {
      return null;
    }
    addHistory(state, `【天下大事】${milestone}`, "history");
    return `天下大事：${milestone}`;
  }

  function maybeRaid() {
    const targets = getEnemyTargets();
    if (!targets.length) {
      return null;
    }
    const era = getEra(state.eraId);
    let chance = 0.1 + era.pressure * 0.11;
    chance -= sumBuildingLevels("wall") * 0.025;
    chance -= policyActive("baojing") ? 0.06 : 0;
    if (state.publicOrder < 45) {
      chance += 0.05;
    }
    if (state.assignments.commander === "zhangfei") {
      chance -= 0.025;
    }
    chance = clamp(chance, 0.04, 0.4);
    if (Math.random() > chance) {
      return null;
    }

    const region = pickRandom(targets);
    if (!region) {
      return null;
    }
    const commander = getAssignedOfficer("commander") || getRulerOfficer();
    const raidPower =
      getRegionGarrison(region) *
      (0.68 + Math.random() * 0.42) *
      (0.92 + region.defense / 160);
    const defensePower =
      getArmyPower(state, state.assignments.commander || "ruler", "encircle") *
      (1 + getDefenseValue() / 130) *
      (state.assignments.commander === "zhangfei" ? 1.08 : 1);
    const success = defensePower >= raidPower * (0.9 + Math.random() * 0.15);

    if (success) {
      const lossRate = 0.006 + Math.random() * 0.012;
      const losses = applyArmyLossRate(lossRate, commander.id);
      state.resources.reputation += 1;
      state.totals.raidsRepelled += 1;
      addHistory(
        state,
        `${getRegionLord(region)}遣军袭扰边境，${commander.name}据城击退，折损${losses}人。`,
        "battle",
      );
      return {
        success: true,
        text: `${commander.name}击退了${getRegionLord(region)}的边境袭扰。`,
      };
    }

    const lossRate = 0.028 + Math.random() * 0.035;
    const losses = applyArmyLossRate(lossRate, commander.id);
    const grainLost = Math.min(state.resources.grain, 35 + Math.round(Math.random() * 20));
    state.resources.grain -= grainLost;
    state.publicOrder = clamp(state.publicOrder - 6, 0, 100);
    addHistory(
      state,
      `${getRegionLord(region)}越境袭掠，${commander.name}未能全数拦下。折兵${losses}人，失粮${grainLost}。`,
      "battle",
    );
    return {
      success: false,
      text: `边境遭${getRegionLord(region)}袭扰，损兵${losses}、失粮${grainLost}。`,
    };
  }

  function maybeSelectEvent() {
    if (state.turn < 1 || Math.random() > 0.58) {
      return null;
    }
    const eligible = EVENTS.filter((event) => {
      if (event.once && state.seenEvents.includes(event.id)) {
        return false;
      }
      if (event.minTurn && state.turn < event.minTurn) {
        return false;
      }
      if (event.minYear && state.year < event.minYear) {
        return false;
      }
      if (event.maxYear && state.year > event.maxYear) {
        return false;
      }
      if (event.minMonth && state.month < event.minMonth) {
        return false;
      }
      if (event.maxMonth && state.month > event.maxMonth) {
        return false;
      }
      return true;
    });
    return pickRandom(eligible);
  }

  function showEventDialog(event) {
    const choices = event.choices.map((choice, index) => {
      const possible = canAffordCost(choice.cost || {});
      return `
        <button class="choice-button" type="button" data-action="resolve-event" data-choice="${index}" ${possible ? "" : "disabled"}>
          <strong>${escapeHtml(choice.label)}</strong>
          <span>${possible ? "可选" : "资源不足"}</span>
          <small>${escapeHtml(choice.summary)}</small>
        </button>
      `;
    }).join("");

    showDialog({
      kicker: event.kicker,
      title: event.title,
      subtitle: `${getDateLabel()} · 请作出处置`,
      content: `
        <p class="dialog-narrative">${escapeHtml(event.text)}</p>
        <div class="choice-list">${choices}</div>
      `,
      actions: [],
      dismissible: false,
    });
  }

  function resolveEvent(index) {
    if (!state.pendingEventId) {
      return;
    }
    const event = EVENTS.find((item) => item.id === state.pendingEventId);
    const choice = event?.choices[index];
    if (!event || !choice) {
      return;
    }
    if (!canAffordCost(choice.cost || {})) {
      showToast("当前资源不足以采取这一处置。", "warning");
      return;
    }

    payCost(choice.cost || {});
    applyEffects(choice.effects || {});
    if (!state.seenEvents.includes(event.id)) {
      state.seenEvents.push(event.id);
    }
    state.pendingEventId = null;
    addHistory(state, `${event.title}：${choice.result}`, "general");
    closeDialog();
    renderGame();
    saveGame(false);
    showToast(choice.result, state.publicOrder > 30 ? "success" : "warning");
  }
})();
