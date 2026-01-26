// FDOS — Factory Delivery Orchestration System
// Unified execution intelligence for manufacturing commit protection

let STATE = {
  data: null,
  scenarioId: "A",
  filters: { product: null, factorySite: null, week: null },
  activeView: "overview", // overview | portfolio | home | signals | radar | actions | reports | dataFoundation
  currentProgram: null, // Current program context { product, factorySite, week }
  selectedRiskId: null,
  prdMode: false,
  viewMode: "live", // live | simulation
  simulationPreset: null,
  simulationResults: null,
  aiMode: false, // AI mode toggle
  aiContext: null, // Current AI context for drawer
  dataFoundationSubpage: "alignedIndex" // alignedIndex | dataSource | productionPlanLogic
};

const $ = (id) => document.getElementById(id);

// Route icons
const ROUTE_ICONS = {
  "AUTO_ACTION": "✅",
  "HUMAN_REVIEW": "👤",
  "MONITOR": "👁️",
  "AUTO_ACTION_CANDIDATE": "✅"
};

// Commit health colors
const COMMIT_HEALTH_COLORS = {
  "GREEN": "bg-green-50 border-green-200 text-green-900",
  "YELLOW": "bg-yellow-50 border-yellow-200 text-yellow-900",
  "RED": "bg-red-50 border-red-200 text-red-900"
};

// Status badge colors
const STATUS_COLORS = {
  "GREEN": "bg-green-100 text-green-800",
  "YELLOW": "bg-yellow-100 text-yellow-800",
  "RED": "bg-red-100 text-red-800"
};

// Load data
async function loadData() {
  const res = await fetch("./mockData_delivery.json");
  const data = await res.json();
  STATE.data = data;
  console.log('Data loaded successfully. Has overview:', !!data.overview);
}

function setMeta() {
  const { meta } = STATE.data;
  $("appName").textContent = meta.appName;
  $("version").textContent = `v${meta.version}`;
  $("lastRefresh").textContent = meta.lastRefresh;
  $("dqStatus").textContent = meta.dataQuality.status;
  $("dqStatus").className = `font-medium ${meta.dataQuality.status === "OK" ? "text-green-600" : "text-amber-600"}`;
}

function populateSelect(selectEl, options, value) {
  if (!selectEl) {
    console.error('[populateSelect] selectEl is null');
    return;
  }
  if (!options || !Array.isArray(options)) {
    console.error('[populateSelect] options is not an array:', options);
    return;
  }

  selectEl.innerHTML = "";
  options.forEach(opt => {
    const o = document.createElement("option");
    o.value = opt;
    o.textContent = opt;
    if (opt === value) o.selected = true;
    selectEl.appendChild(o);
  });

  console.log(`[populateSelect] Populated ${selectEl.id} with ${options.length} options, selected: ${value}`);
}

function initControls() {
  console.log('[initControls] Starting initialization');
  console.log('[initControls] STATE.data:', STATE.data);
  console.log('[initControls] STATE.data.dimensions:', STATE.data?.dimensions);

  // Note: PRD Mode toggle (liveMode/simulationMode) has been removed from UI
  // Run Simulation button (if it exists)
  const runSimBtn = $("runSimulationBtn");
  if (runSimBtn) {
    runSimBtn.addEventListener("click", () => {
      runSimulation();
    });
  }

  // Filters
  const { products, factorySites, weeks } = STATE.data.dimensions;
  console.log('[initControls] Filter dimensions:', { products, factorySites, weeks });

  const scenario = getScenario();
  console.log('[initControls] Scenario:', scenario);

  const { product, factorySite, week } = scenario.defaultFilters;
  console.log('[initControls] Default filters:', { product, factorySite, week });

  STATE.filters = { product, factorySite, week };

  populateSelect($("productFilter"), products, product);
  populateSelect($("factorySiteFilter"), factorySites, factorySite);
  populateSelect($("weekFilter"), weeks, week);

  $("productFilter").addEventListener("change", (e) => {
    STATE.filters.product = e.target.value;
    render();
  });

  $("factorySiteFilter").addEventListener("change", (e) => {
    STATE.filters.factorySite = e.target.value;
    render();
  });

  $("weekFilter").addEventListener("change", (e) => {
    STATE.filters.week = e.target.value;
    render();
  });

  // Navigation
  document.querySelectorAll("[data-view]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const view = btn.getAttribute("data-view");
      STATE.activeView = view;
      render();
    });
  });
}

function applyFilters(filters) {
  STATE.filters = filters;
  populateSelect($("productFilter"), STATE.data.dimensions.products, filters.product);
  populateSelect($("factorySiteFilter"), STATE.data.dimensions.factorySites, filters.factorySite);
  populateSelect($("weekFilter"), STATE.data.dimensions.weeks, filters.week);
}

function getScenario() {
  return STATE.data.scenarios.find(s => s.id === STATE.scenarioId);
}

function getDemo() {
  return STATE.data.demoData[STATE.scenarioId];
}

function enterProgram(productName, factorySite) {
  // Set filters for the selected program
  STATE.filters.product = productName;
  STATE.filters.factorySite = factorySite;
  // Week is already set from portfolio, but ensure it's set
  if (!STATE.filters.week) {
    STATE.filters.week = STATE.data.portfolio.week;
  }

  // Update dropdown UI to reflect the selected filters
  $("productFilter").value = productName;
  $("factorySiteFilter").value = factorySite;
  $("weekFilter").value = STATE.filters.week;

  // Navigate to Program Home
  STATE.activeView = 'home';
  render();
}

function runSimulation() {
  const preset = $("presetSelect").value;

  // Mock simulation results
  const baseCommit = getDemo().deliveryCommit;
  const baseConfidence = baseCommit.confidence;
  const baseAtRisk = baseCommit.atRiskUnits;

  let simResults = {
    preset: preset,
    before: {
      confidence: baseConfidence,
      atRiskUnits: baseAtRisk,
      commitHealth: baseCommit.commitHealth,
      liabilityPressure: "YELLOW"
    },
    after: {},
    recommendation: ""
  };

  // Different outcomes based on preset
  if (preset.includes("Material Slip")) {
    simResults.after = {
      confidence: Math.max(baseConfidence - 15, 50),
      atRiskUnits: baseAtRisk + 6500,
      commitHealth: "RED",
      liabilityPressure: "YELLOW",
      expediteCost: 120000
    };
    simResults.recommendation = "Keep W04 recovery actions ON; expedite IC-77 via air freight.";
  } else if (preset.includes("Yield Drift")) {
    simResults.after = {
      confidence: Math.max(baseConfidence - 12, 55),
      atRiskUnits: baseAtRisk + 5200,
      commitHealth: "RED",
      liabilityPressure: "YELLOW",
      expediteCost: 0
    };
    simResults.recommendation = "Prioritize re-test lane + add weekend shift; freeze non-critical releases.";
  } else if (preset.includes("Holiday")) {
    simResults.after = {
      confidence: Math.max(baseConfidence - 18, 48),
      atRiskUnits: baseAtRisk + 8100,
      commitHealth: "RED",
      liabilityPressure: "YELLOW",
      expediteCost: 95000
    };
    simResults.recommendation = "Pull forward W05 starts to W04; negotiate holiday overtime package.";
  } else if (preset.includes("Demand Downside")) {
    simResults.after = {
      confidence: baseConfidence - 3,
      atRiskUnits: Math.max(baseAtRisk - 2000, 0),
      commitHealth: baseCommit.commitHealth,
      liabilityPressure: "RED",
      expediteCost: 0
    };
    simResults.recommendation = "Block additional pre-build releases; slow down WIP starts by 10%; maintain W04 commit actions.";
  } else { // Mixed Shock
    simResults.after = {
      confidence: Math.max(baseConfidence - 25, 42),
      atRiskUnits: baseAtRisk + 9800,
      commitHealth: "RED",
      liabilityPressure: "RED",
      expediteCost: 185000
    };
    simResults.recommendation = "Escalate to leadership for commit re-negotiation; freeze all non-committed builds.";
  }

  STATE.simulationResults = simResults;
  render();
}

function render() {
  // Determine if we're in Program workspace (vs Global pages)
  // Portfolio and Data Foundation are global pages - no sidebar filters
  const isProgramWorkspace = ["home", "delivery", "production-plan", "command-center", "mfg-leadtime", "bto-cto-leadtime", "fv-management", "labor-fulfillment", "campus-readiness", "signals", "radar", "actions", "reports"].includes(STATE.activeView);

  // Toggle sidebar visibility
  const sidebar = $("sidebar");
  const mainContent = $("mainContent");
  if (isProgramWorkspace) {
    sidebar.classList.remove("hidden");
    sidebar.classList.add("md:col-span-3");
    mainContent.classList.remove("col-span-12");
    mainContent.classList.add("md:col-span-9");
  } else {
    sidebar.classList.add("hidden");
    sidebar.classList.remove("md:col-span-3");
    mainContent.classList.remove("md:col-span-9");
    mainContent.classList.add("col-span-12");
  }

  // Update breadcrumb for Program workspace
  if (isProgramWorkspace) {
    updateBreadcrumb();
  }

  // Update global navigation active state
  document.querySelectorAll("[data-global-nav]").forEach(btn => {
    const view = btn.getAttribute("data-global-nav");
    if (view === STATE.activeView || (view === "program" && isProgramWorkspace)) {
      btn.classList.add("bg-blue-50", "text-blue-600", "font-semibold");
    } else {
      btn.classList.remove("bg-blue-50", "text-blue-600", "font-semibold");
    }
  });

  // Update Program button text with current selection
  const programNavText = $("programNavText");
  if (programNavText) {
    const { product, factorySite } = STATE.filters;
    if (product && factorySite) {
      programNavText.textContent = `${product} / ${factorySite}`;
    } else {
      programNavText.textContent = `Product A / WF`;
    }
  }

  // Show/hide filters bar based on view
  const filtersBar = document.querySelector(".no-print.bg-slate-50.border-b");
  const updateDataBtn = document.querySelector("#updateDataBtn");

  if (STATE.activeView === "overview" || STATE.activeView === "portfolio" || STATE.activeView === "dataFoundation" || STATE.activeView === "whitePaper") {
    // Hide filters on global pages (Overview, Portfolio, Data Foundation, White Paper)
    if (filtersBar) filtersBar.style.display = "none";
  } else {
    // Show filters and Update Data button on Program workspace
    if (filtersBar) filtersBar.style.display = "block";
    if (updateDataBtn) updateDataBtn.style.display = "flex";
  }

  // Update sidebar nav active state
  document.querySelectorAll("[data-view]").forEach(btn => {
    if (btn.getAttribute("data-view") === STATE.activeView) {
      btn.classList.add("bg-slate-100", "font-semibold");
    } else {
      btn.classList.remove("bg-slate-100", "font-semibold");
    }
  });

  // Render content based on active view
  switch (STATE.activeView) {
    case "overview":
      renderOverview();
      break;
    case "portfolio":
      renderPortfolio();
      break;
    case "home":
    case "delivery":
      renderDeliveryCommandCenter();
      break;
    case "production-plan":
      renderProductionPlan();
      break;
    case "mfg-leadtime":
      renderManufacturingLeadtime();
      break;
    case "bto-cto-leadtime":
      renderBTOCTOLeadtime();
      break;
    case "fv-management":
      renderFVManagement();
      break;
    case "labor-fulfillment":
      renderLaborFulfillment();
      break;
    case "campus-readiness":
      renderCampusReadiness();
      break;
    case "signals":
      renderSignals();
      break;
    case "radar":
      renderRadar();
      break;
    case "actions":
    case "orchestration":
      renderActions();
      break;
    case "reports":
      renderReports();
      break;
    case "dataFoundation":
      renderDataFoundation();
      break;
    case "whitePaper":
      renderWhitePaper();
      break;
    default:
      renderOverview();
  }
}

// Update breadcrumb for Program workspace
function updateBreadcrumb() {
  const breadcrumb = $("breadcrumb");
  if (!breadcrumb) return;

  const { product, factorySite, week } = STATE.filters;
  const viewNames = {
    "home": "Delivery Command Center",
    "signals": "Signals",
    "radar": "Risk Radar",
    "actions": "Actions",
    "reports": "Reports"
  };

  breadcrumb.innerHTML = `
    <div class="flex items-center gap-1 flex-wrap">
      <a href="#" onclick="STATE.activeView = 'portfolio'; render(); return false;" class="hover:text-blue-600">Portfolio</a>
      <span>›</span>
      <span class="font-semibold">${product} / ${factorySite}</span>
      <span>›</span>
      <span class="text-slate-400">${week}</span>
      <span>›</span>
      <span class="text-blue-600 font-semibold">${viewNames[STATE.activeView]}</span>
    </div>
  `;
}

// ========================================
// OVERVIEW - Vision & Scope
// ========================================
function renderOverview() {
  console.log('renderOverview called. STATE.data:', STATE.data);
  const overview = STATE.data?.overview;
  console.log('Overview data:', overview);

  if (!overview) {
    $("content").innerHTML = `<div class="p-4 text-center text-slate-500">Overview data not available. Please refresh the page (Cmd+Shift+R).</div>`;
    return;
  }

  const html = `
    <!-- ============================================================ -->
    <!-- 0) HERO: Restrained Introduction -->
    <!-- ============================================================ -->
    <div class="bg-white border-2 border-slate-300 rounded-xl p-8 mb-6">
      <h1 class="text-3xl font-bold text-slate-900 mb-2">FDOS — Factory Delivery Orchestration System</h1>
      <div class="text-base text-slate-700 mb-3">
        Turning factory execution into deliverable commitments across the supply chain.
      </div>
      <div class="text-sm text-slate-600 border-l-4 border-blue-500 pl-4 py-2 bg-blue-50 rounded-r-lg">
        FDOS closes the missing factory link by standardizing execution signals and routing decisions with evidence.
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- 1) THE MISSING LINK: Why this exists -->
    <!-- ============================================================ -->
    <div class="bg-white border-2 border-red-200 rounded-xl p-6 mb-6">
      <div class="text-lg font-bold text-slate-900 mb-2">Why this exists</div>
      <div class="text-sm text-slate-700 space-y-2 mb-5">
        <p>Factory execution is the least standardized part of the end-to-end decision chain.</p>
        <p>When factory signals are missing or inconsistent, planning and commitments become "best guesses" — and the loop cannot learn.</p>
        <p><strong>FDOS exists to turn factory reality into decision-grade signals</strong> that can be used by planners and leaders.</p>
      </div>

      <!-- Supply Chain Flow Diagram -->
      <div class="relative">
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <div class="flex-1 min-w-[140px] p-4 bg-blue-50 border-2 border-blue-300 rounded-xl text-center">
            <div class="text-3xl mb-2">📦</div>
            <div class="text-sm font-bold text-slate-900">Planning</div>
            <div class="text-xs text-slate-600 mt-1">Forecast / Build Plan</div>
          </div>
          <div class="text-3xl text-slate-400">→</div>
          <div class="flex-1 min-w-[140px] p-4 bg-red-50 border-2 border-red-400 border-dashed rounded-xl text-center">
            <div class="text-3xl mb-2">🏭</div>
            <div class="text-sm font-bold text-red-700">Manufacturing</div>
            <div class="text-xs text-red-600 font-bold mt-1">MISSING TODAY</div>
          </div>
          <div class="text-3xl text-slate-400">→</div>
          <div class="flex-1 min-w-[140px] p-4 bg-blue-50 border-2 border-blue-300 rounded-xl text-center">
            <div class="text-3xl mb-2">🚚</div>
            <div class="text-sm font-bold text-slate-900">Logistics</div>
            <div class="text-xs text-slate-600 mt-1">Shipments / ETA</div>
          </div>
          <div class="text-3xl text-slate-400">→</div>
          <div class="flex-1 min-w-[140px] p-4 bg-blue-50 border-2 border-blue-300 rounded-xl text-center">
            <div class="text-3xl mb-2">📊</div>
            <div class="text-sm font-bold text-slate-900">Inventory</div>
            <div class="text-xs text-slate-600 mt-1">FG / Transit</div>
          </div>
          <div class="text-3xl text-slate-400">→</div>
          <div class="flex-1 min-w-[140px] p-4 bg-blue-50 border-2 border-blue-300 rounded-xl text-center">
            <div class="text-3xl mb-2">🧾</div>
            <div class="text-sm font-bold text-slate-900">Orders</div>
            <div class="text-xs text-slate-600 mt-1">Demand / Commit</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- 2) WHY FACTORY DATA IS HARD: 4 compact challenge cards -->
    <!-- ============================================================ -->
    <div class="bg-white border-2 border-slate-200 rounded-xl p-6 mb-6">
      <div class="text-lg font-bold text-slate-900 mb-2">Why factory signals don't travel well today</div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Card 1: Metric inconsistency -->
        <div class="border-2 border-amber-200 bg-amber-50 rounded-lg p-4">
          <div class="text-sm font-bold text-slate-900 mb-2">Metric inconsistency</div>
          <div class="text-xs text-slate-700 space-y-1">
            <div>• Same names, different definitions across sites/tools</div>
            <div>• Reconciliation becomes manual</div>
          </div>
        </div>

        <!-- Card 2: Messy inputs -->
        <div class="border-2 border-red-200 bg-red-50 rounded-lg p-4">
          <div class="text-sm font-bold text-slate-900 mb-2">Messy inputs</div>
          <div class="text-xs text-slate-700 space-y-1">
            <div>• Manual logs and missing fields</div>
            <div>• Low trust without validation</div>
          </div>
        </div>

        <!-- Card 3: High change speed -->
        <div class="border-2 border-orange-200 bg-orange-50 rounded-lg p-4">
          <div class="text-sm font-bold text-slate-900 mb-2">High change speed</div>
          <div class="text-xs text-slate-700 space-y-1">
            <div>• Yield/constraints/staffing shift daily</div>
            <div>• Dashboards lag behind reality</div>
          </div>
        </div>

        <!-- Card 4: Truth lives offline -->
        <div class="border-2 border-purple-200 bg-purple-50 rounded-lg p-4">
          <div class="text-sm font-bold text-slate-900 mb-2">Truth lives offline</div>
          <div class="text-xs text-slate-700 space-y-1">
            <div>• Key context sits in meetings/photos/notes</div>
            <div>• Systems miss the "why"</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- 3) HOW FDOS WORKS: The 4-step mechanism -->
    <!-- ============================================================ -->
    <div class="bg-white border-2 border-blue-200 rounded-xl p-6 mb-6">
      <div class="text-lg font-bold text-slate-900 mb-2">How FDOS works (the mechanism)</div>
      <div class="text-sm text-slate-600 mb-5">Four-step process to turn factory data into decision-grade signals</div>

      <div class="space-y-4">
        <!-- Step 1: Standardize -->
        <div class="flex items-start gap-4 border-l-4 border-blue-500 pl-4 py-2">
          <div class="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm">1</div>
          <div>
            <div class="font-bold text-slate-900 mb-1">Standardize</div>
            <div class="text-sm text-slate-700">Build a shared metric dictionary: definition, grain, owner, refresh rules — so "the same word means the same thing."</div>
          </div>
        </div>

        <!-- Step 2: Validate -->
        <div class="flex items-start gap-4 border-l-4 border-green-500 pl-4 py-2">
          <div class="flex-shrink-0 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-sm">2</div>
          <div>
            <div class="font-bold text-slate-900 mb-1">Validate</div>
            <div class="text-sm text-slate-700">Attach confidence to every key signal (freshness, coverage, reconciliation) so decisions can distinguish "real risk" vs "data noise."</div>
          </div>
        </div>

        <!-- Step 3: Route decisions -->
        <div class="flex items-start gap-4 border-l-4 border-amber-500 pl-4 py-2">
          <div class="flex-shrink-0 w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold text-sm">3</div>
          <div>
            <div class="font-bold text-slate-900 mb-1">Route decisions</div>
            <div class="text-sm text-slate-700">When an outcome is at risk, the system routes it to the right owner with an SLA, linked evidence, and a small set of action options.</div>
          </div>
        </div>

        <!-- Step 4: Close the loop -->
        <div class="flex items-start gap-4 border-l-4 border-purple-500 pl-4 py-2">
          <div class="flex-shrink-0 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-sm">4</div>
          <div>
            <div class="font-bold text-slate-900 mb-1">Close the loop</div>
            <div class="text-sm text-slate-700">Record what decision was taken and what happened next — so the system can learn which actions actually change outcomes.</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- 4) BUILT TO AVOID KPI THEATER: 4 hard guardrails -->
    <!-- ============================================================ -->
    <div class="bg-white border-2 border-green-200 rounded-xl p-6 mb-6">
      <div class="text-lg font-bold text-slate-900 mb-2">Built to avoid KPI theater</div>
      <div class="text-sm text-slate-600 mb-4">Four hard-coded principles to ensure FDOS routes decisions, not ranks performance</div>

      <div class="space-y-3">
        <!-- Rule 1 -->
        <div class="border-l-4 border-blue-500 bg-blue-50 rounded-r-lg p-3">
          <div class="text-sm font-bold text-slate-900 mb-1">No color without an action</div>
          <div class="text-xs text-slate-700">Every Yellow/Red must have an owner, SLA, evidence, and options.</div>
        </div>

        <!-- Rule 2 -->
        <div class="border-l-4 border-green-500 bg-green-50 rounded-r-lg p-3">
          <div class="text-sm font-bold text-slate-900 mb-1">Routing, not scoring</div>
          <div class="text-xs text-slate-700">Status is a decision signal, never a performance grade.</div>
        </div>

        <!-- Rule 3 -->
        <div class="border-l-4 border-amber-500 bg-amber-50 rounded-r-lg p-3">
          <div class="text-sm font-bold text-slate-900 mb-1">No raw cross-site ranking</div>
          <div class="text-xs text-slate-700">Comparisons require context and consistent definitions.</div>
        </div>

        <!-- Rule 4 -->
        <div class="border-l-4 border-purple-500 bg-purple-50 rounded-r-lg p-3">
          <div class="text-sm font-bold text-slate-900 mb-1">Confidence before conclusions</div>
          <div class="text-xs text-slate-700">Low-confidence signals route to validation, not escalation.</div>
        </div>
      </div>
    </div>


    <!-- ============================================================ -->
    <!-- 5) OPERATING MODEL: What runs in FDOS every week -->
    <!-- ============================================================ -->
    <div class="bg-white border-2 border-slate-200 rounded-xl p-6 mb-6">
      <div class="text-lg font-bold text-slate-900 mb-2">What runs in FDOS every week</div>
      <div class="text-sm text-slate-600 mb-5">The system operates on a predictable cadence to keep factory execution aligned with commitments</div>

      <div class="space-y-3 mb-5">
        <!-- Weekly -->
        <div class="flex items-start gap-3 border-l-4 border-blue-500 pl-4 py-2 bg-blue-50 rounded-r-lg">
          <div class="flex-shrink-0 font-bold text-sm text-blue-900 w-16">Weekly</div>
          <div class="text-sm text-slate-700">Commitments are set → FDOS tracks whether factory execution can meet them.</div>
        </div>

        <!-- Daily -->
        <div class="flex items-start gap-3 border-l-4 border-green-500 pl-4 py-2 bg-green-50 rounded-r-lg">
          <div class="flex-shrink-0 font-bold text-sm text-green-900 w-16">Daily</div>
          <div class="text-sm text-slate-700">Constraints (materials/capacity/yield) update → FDOS refreshes risk and routes decisions.</div>
        </div>

        <!-- 48h window -->
        <div class="flex items-start gap-3 border-l-4 border-amber-500 pl-4 py-2 bg-amber-50 rounded-r-lg">
          <div class="flex-shrink-0 font-bold text-sm text-amber-900 w-16">48h window</div>
          <div class="text-sm text-slate-700">The system prioritizes the few decisions that can still change this week's outcome.</div>
        </div>
      </div>

      <!-- Closed-loop chain -->
      <div class="border-t pt-4">
        <div class="text-xs font-semibold text-slate-700 mb-2">Closed-loop chain:</div>
        <div class="text-xs text-slate-600 bg-slate-50 rounded-lg p-3 font-mono">
          Plan → Constraints → Input → Output → Shipment readiness → Commit → Exceptions → Actions → Learning
        </div>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- 6) IMPLEMENTATION ROADMAP (keep as-is) -->
    <!-- ============================================================ -->
    <!-- Implementation Roadmap with Timeline -->
    <div class="bg-white border rounded-xl p-6 mb-6">
      <div class="text-lg font-bold mb-2">Implementation Roadmap: Q1 2026 - Q4 2026</div>
      <div class="text-sm text-slate-600 mb-6">Four-phase deployment strategy with clear milestones and deliverables</div>

      <!-- Timeline Visualization -->
      <div class="relative mb-8">
        <!-- Timeline Bar -->
        <div class="absolute top-6 left-0 right-0 h-1 bg-slate-200"></div>
        <div class="absolute top-6 left-0 w-[25%] h-1 bg-green-500"></div>

        <!-- Phase Markers -->
        <div class="relative grid grid-cols-4 gap-2">
          <!-- Q1 2026 -->
          <div class="relative">
            <div class="flex flex-col items-center">
              <div class="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-bold shadow-lg ring-4 ring-green-100 relative z-10">
                Q1
              </div>
              <div class="mt-2 text-center">
                <div class="text-xs font-bold text-green-700">Phase 1</div>
                <div class="text-xs text-slate-600">Jan - Mar 2026</div>
                <span class="inline-block px-2 py-0.5 bg-green-100 text-green-800 text-xs font-semibold rounded mt-1">IN PROGRESS</span>
              </div>
            </div>
          </div>

          <!-- Q2 2026 -->
          <div class="relative">
            <div class="flex flex-col items-center">
              <div class="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-white font-bold shadow-lg relative z-10">
                Q2
              </div>
              <div class="mt-2 text-center">
                <div class="text-xs font-bold text-blue-700">Phase 2</div>
                <div class="text-xs text-slate-600">Apr - Jun 2026</div>
                <span class="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-semibold rounded mt-1">PLANNED</span>
              </div>
            </div>
          </div>

          <!-- Q3 2026 -->
          <div class="relative">
            <div class="flex flex-col items-center">
              <div class="w-12 h-12 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-white font-bold shadow-md relative z-10">
                Q3
              </div>
              <div class="mt-2 text-center">
                <div class="text-xs font-bold text-slate-700">Phase 3</div>
                <div class="text-xs text-slate-600">Jul - Sep 2026</div>
              </div>
            </div>
          </div>

          <!-- Q4 2026 -->
          <div class="relative">
            <div class="flex flex-col items-center">
              <div class="w-12 h-12 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-white font-bold shadow-md relative z-10">
                Q4
              </div>
              <div class="mt-2 text-center">
                <div class="text-xs font-bold text-slate-700">Phase 4</div>
                <div class="text-xs text-slate-600">Oct - Dec 2026</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Phase Details -->
      <div class="space-y-4">
        <!-- Phase 1: Foundation -->
        <div class="border-2 border-green-400 rounded-xl overflow-hidden">
          <div class="bg-gradient-to-r from-green-50 to-green-100 px-4 py-3 border-b-2 border-green-400">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold">1</div>
                <div>
                  <div class="font-bold text-slate-900">Phase 1: Foundation & Core Modules</div>
                  <div class="text-xs text-slate-600">Q1 2026 (Jan - Mar) · 12 weeks</div>
                </div>
              </div>
              <span class="px-3 py-1 bg-green-600 text-white text-xs font-bold rounded-full">IN PROGRESS</span>
            </div>
          </div>
          <div class="p-4 bg-white">
            <div class="grid grid-cols-2 gap-4 mb-3">
              <div>
                <div class="text-xs font-semibold text-slate-700 mb-2">📦 Deliverables</div>
                <ul class="text-xs text-slate-600 space-y-1">
                  <li class="flex items-start gap-2"><span class="text-green-600">✓</span><span>Portfolio & Program Workspace UI</span></li>
                  <li class="flex items-start gap-2"><span class="text-green-600">✓</span><span>Delivery Command Center module</span></li>
                  <li class="flex items-start gap-2"><span class="text-green-600">✓</span><span>Manufacturing & BTO/CTO Lead-time tracking</span></li>
                  <li class="flex items-start gap-2"><span class="text-yellow-600">⏳</span><span>Basic data ingestion pipeline</span></li>
                </ul>
              </div>
              <div>
                <div class="text-xs font-semibold text-slate-700 mb-2">🎯 Success Metrics</div>
                <ul class="text-xs text-slate-600 space-y-1">
                  <li>• Demo validated with 5+ stakeholders</li>
                  <li>• Core workflows tested with pilot factory</li>
                  <li>• 90% positive feedback on UI/UX design</li>
                </ul>
              </div>
            </div>
            <div class="pt-3 border-t">
              <div class="text-xs font-semibold text-slate-700 mb-1">Current Status:</div>
              <div class="text-xs text-slate-600">Prototype complete. Gathering stakeholder feedback for Phase 2 prioritization.</div>
            </div>
          </div>
        </div>

        <!-- Phase 2: Integration -->
        <div class="border-2 border-blue-300 rounded-xl overflow-hidden">
          <div class="bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-3 border-b-2 border-blue-300">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">2</div>
                <div>
                  <div class="font-bold text-slate-900">Phase 2: Data Integration & AI Layer</div>
                  <div class="text-xs text-slate-600">Q2 2026 (Apr - Jun) · 12 weeks</div>
                </div>
              </div>
              <span class="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">PLANNED</span>
            </div>
          </div>
          <div class="p-4 bg-white">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <div class="text-xs font-semibold text-slate-700 mb-2">📦 Deliverables</div>
                <ul class="text-xs text-slate-600 space-y-1">
                  <li>• Real-time data connectors (MES, ERP, WMS)</li>
                  <li>• AI chatbot with natural language queries</li>
                  <li>• Smart data update system (auto-parsing)</li>
                  <li>• FV Management & Labor Fulfillment modules</li>
                </ul>
              </div>
              <div>
                <div class="text-xs font-semibold text-slate-700 mb-2">🎯 Success Metrics</div>
                <ul class="text-xs text-slate-600 space-y-1">
                  <li>• Connect to 3+ factory data sources</li>
                  <li>• 95% data accuracy vs. manual tracking</li>
                  <li>• AI response accuracy >85%</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <!-- Phase 3: Optimization -->
        <div class="border-2 border-slate-300 rounded-xl overflow-hidden">
          <div class="bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3 border-b-2 border-slate-300">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-slate-500 text-white flex items-center justify-center text-sm font-bold">3</div>
              <div>
                <div class="font-bold text-slate-900">Phase 3: Advanced Analytics & Predictive Intelligence</div>
                <div class="text-xs text-slate-600">Q3 2026 (Jul - Sep) · 12 weeks</div>
              </div>
            </div>
          </div>
          <div class="p-4 bg-white">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <div class="text-xs font-semibold text-slate-700 mb-2">📦 Deliverables</div>
                <ul class="text-xs text-slate-600 space-y-1">
                  <li>• Predictive risk modeling (ML-based)</li>
                  <li>• Production Plan optimization engine</li>
                  <li>• Campus Readiness capacity planning</li>
                  <li>• Automated anomaly detection</li>
                </ul>
              </div>
              <div>
                <div class="text-xs font-semibold text-slate-700 mb-2">🎯 Success Metrics</div>
                <ul class="text-xs text-slate-600 space-y-1">
                  <li>• Predict 70% of delays 5+ days early</li>
                  <li>• Reduce manual planning time by 40%</li>
                  <li>• Detect anomalies within 2 hours</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <!-- Phase 4: Scale -->
        <div class="border-2 border-slate-300 rounded-xl overflow-hidden">
          <div class="bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3 border-b-2 border-slate-300">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-slate-500 text-white flex items-center justify-center text-sm font-bold">4</div>
              <div>
                <div class="font-bold text-slate-900">Phase 4: Enterprise Scale & Closed-Loop Automation</div>
                <div class="text-xs text-slate-600">Q4 2026 (Oct - Dec) · 12 weeks</div>
              </div>
            </div>
          </div>
          <div class="p-4 bg-white">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <div class="text-xs font-semibold text-slate-700 mb-2">📦 Deliverables</div>
                <ul class="text-xs text-slate-600 space-y-1">
                  <li>• Multi-region deployment (APAC, Americas, EMEA)</li>
                  <li>• Closed-loop action routing & tracking</li>
                  <li>• Mobile app for factory floor visibility</li>
                  <li>• Executive dashboard & automated reporting</li>
                </ul>
              </div>
              <div>
                <div class="text-xs font-semibold text-slate-700 mb-2">🎯 Success Metrics</div>
                <ul class="text-xs text-slate-600 space-y-1">
                  <li>• 20+ factories onboarded globally</li>
                  <li>• 50% reduction in commit misses</li>
                  <li>• <2 second average query response time</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- Demo Information Footer -->
    <div class="bg-gradient-to-r from-slate-50 to-slate-100 border-2 border-slate-300 rounded-xl p-6">
      <div class="flex items-start gap-4">
        <div class="text-3xl">ℹ️</div>
        <div class="flex-1">
          <div class="text-sm font-bold text-slate-900 mb-3">About This Demonstration</div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700">
            <div>
              <div class="font-semibold mb-2">Purpose</div>
              <ul class="space-y-1">
                <li>• Executive-level system overview and value proposition</li>
                <li>• Validate architecture and information design</li>
                <li>• Demonstrate integrated workflow across all modules</li>
              </ul>
            </div>
            <div>
              <div class="font-semibold mb-2">Data & Interactions</div>
              <ul class="space-y-1">
                <li>• All data is mocked for demonstration purposes</li>
                <li>• Click <strong>Portfolio</strong> to explore program-level details</li>
                <li>• Try the chatbot and data update features</li>
              </ul>
            </div>
          </div>
          <div class="mt-4 pt-4 border-t border-slate-300">
            <div class="text-xs text-slate-600">
              <strong>Next Steps:</strong> Schedule stakeholder demos, finalize Phase 2 requirements, establish data integration partnerships with factory teams.
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  $("content").innerHTML = html;
}

// ========================================
// PORTFOLIO - All Programs
// ========================================
// ========================================
// Portfolio Helper Functions
// ========================================

function calculateDriverBreakdown(programs) {
  const drivers = {};
  let totalAtRisk = 0;

  programs.forEach(prog => {
    const constraint = extractPrimaryConstraint(prog.topDriver);
    drivers[constraint] = (drivers[constraint] || 0) + prog.atRiskUnits;
    totalAtRisk += prog.atRiskUnits;
  });

  const sorted = Object.entries(drivers)
    .map(([driver, units]) => ({
      driver,
      units,
      percentage: totalAtRisk > 0 ? Math.round((units / totalAtRisk) * 100) : 0
    }))
    .sort((a, b) => b.units - a.units);

  return {
    top: sorted[0] ? `${sorted[0].driver} (${sorted[0].percentage}%)` : 'N/A',
    breakdown: sorted
  };
}

function extractPrimaryConstraint(topDriver) {
  if (!topDriver) return 'Unknown';

  const lower = topDriver.toLowerCase();
  if (lower.includes('ctb') || lower.includes('material')) return 'CTB';
  if (lower.includes('yield')) return 'Yield';
  if (lower.includes('capacity')) return 'Capacity';
  if (lower.includes('shipment') || lower.includes('ship')) return 'Shipment';
  if (lower.includes('lead time') || lower.includes('cycle')) return 'Lead time';
  if (lower.includes('data') || lower.includes('confidence')) return 'Data confidence';

  return 'Other';
}

function generateTopFocusCards(programs) {
  // Generate top 3 focus items based on impact × confidence × urgency
  return programs
    .filter(prog => prog.commitHealth !== 'GREEN' && prog.atRiskUnits > 0)
    .map(prog => {
      const priority = prog.commitHealth === 'RED' || prog.atRiskUnits > 10000 ? 'HIGH' :
                       prog.commitHealth === 'YELLOW' || prog.atRiskUnits > 5000 ? 'MEDIUM' : 'LOW';

      const slaHours = prog.sla === '24h' ? 24 :
                       prog.sla === '48h' ? 48 :
                       prog.sla === '72h' ? 72 : 48;

      const constraint = extractPrimaryConstraint(prog.topDriver);

      return {
        program: prog.name,
        site: prog.buildSites.split(',')[0].trim(),
        priority,
        impact: `${prog.atRiskUnits.toLocaleString()} units at risk`,
        whyNow: `${constraint} constraint detected`,
        owner: prog.owner,
        slaHours,
        confidence: prog.confidence || 'HIGH'
      };
    })
    .sort((a, b) => {
      const priorityOrder = { HIGH: 1, MEDIUM: 2, LOW: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    })
    .slice(0, 3);
}

// Placeholder functions for card click handlers
function filterPrograms(filter) {
  console.log(`[Portfolio] Filter programs by: ${filter}`);
  // TODO: Implement filtering logic
}

function openDecisionInbox() {
  console.log('[Portfolio] Opening Decision Inbox');
  // TODO: Implement decision inbox
}

function openAtRiskBreakdown() {
  console.log('[Portfolio] Opening At-risk breakdown');
  // TODO: Implement at-risk breakdown
}

function openInventoryDrilldown() {
  console.log('[Portfolio] Opening Inventory drilldown');
  // TODO: Implement inventory drilldown
}

function assignOrEscalate(program) {
  console.log(`[Portfolio] Assign/Escalate for program: ${program}`);
  // TODO: Implement assign/escalate flow
}

function openException(program, issue) {
  console.log(`[Portfolio] Opening exception: ${program} - ${issue}`);
  // TODO: Implement exception detail view
}

// ========================================
// Portfolio Rendering
// ========================================

function renderPortfolio() {
  const portfolio = STATE.data.portfolio;

  if (!portfolio) {
    $("content").innerHTML = `<div class="p-4 text-center text-slate-500">Portfolio data not available</div>`;
    return;
  }

  const { summary, programs, topExceptions } = portfolio;

  // Calculate top drivers distribution for At-risk Units card
  const driverBreakdown = calculateDriverBreakdown(programs);

  const html = `
    <!-- Page Header: Weekly Decision Triage -->
    <div class="bg-white border-2 border-slate-300 rounded-xl p-6 mb-4">
      <div class="flex items-start justify-between mb-3">
        <div class="flex-1">
          <div class="text-xl font-bold mb-2">Portfolio — Weekly Decision Triage</div>
          <div class="text-sm text-slate-700 mb-3">Highlights where attention changes outcomes (not a performance ranking).</div>
          <div class="grid grid-cols-3 gap-4 text-xs text-slate-600">
            <div><span class="font-semibold text-slate-900">1.</span> What needs a decision this week / within 48h</div>
            <div><span class="font-semibold text-slate-900">2.</span> Who owns it + what evidence is ready</div>
            <div><span class="font-semibold text-slate-900">3.</span> What will change if we act</div>
          </div>
        </div>
        <button onclick="openAIDrawer('portfolio_exec_summary')" class="flex items-center gap-2 text-sm bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg px-4 py-2 hover:from-blue-700 hover:to-purple-700 flex-shrink-0">
          <span>🤖</span>
          <span>AI: Weekly Exec Summary</span>
        </button>
      </div>
    </div>

    <!-- Signals Strip (replacing KPI Cards) -->
    <div class="bg-white border-2 border-slate-200 rounded-xl p-4 mb-4">
      <div class="text-xs font-semibold text-slate-700 mb-3">Weekly Signals</div>
      <div class="space-y-2">
        <!-- Signal 1: Commit coverage -->
        <div class="flex items-start gap-3 py-2 border-b border-slate-100">
          <div class="flex-shrink-0 w-2 h-2 rounded-full mt-1 ${summary.commitHealth === 'GREEN' ? 'bg-green-500' : summary.commitHealth === 'YELLOW' ? 'bg-yellow-500' : 'bg-red-500'}"></div>
          <div class="flex-1 text-sm text-slate-700">
            <span class="font-semibold">Commit coverage:</span> ${(summary.programsInScope * 5000).toLocaleString()} demand / ${summary.atRiskUnits.toLocaleString()} at-risk · confidence ${summary.dataConfidence || 'HIGH'} · needs ${generateTopFocusCards(programs).length} decisions
          </div>
        </div>

        <!-- Signal 2: Top constraint -->
        <div class="flex items-start gap-3 py-2 border-b border-slate-100">
          <div class="flex-shrink-0 w-2 h-2 rounded-full mt-1 ${summary.atRiskUnits > 20000 ? 'bg-red-500' : summary.atRiskUnits > 10000 ? 'bg-yellow-500' : 'bg-green-500'}"></div>
          <div class="flex-1 text-sm text-slate-700">
            <span class="font-semibold">Primary constraint:</span> ${driverBreakdown.top || 'CTB (42%)'} driving most at-risk units
          </div>
        </div>

        <!-- Signal 3: Inventory exposure -->
        <div class="flex items-start gap-3 py-2 border-b border-slate-100">
          <div class="flex-shrink-0 w-2 h-2 rounded-full mt-1 ${summary.inventoryPressure === 'GREEN' ? 'bg-green-500' : summary.inventoryPressure === 'YELLOW' ? 'bg-yellow-500' : 'bg-red-500'}"></div>
          <div class="flex-1 text-sm text-slate-700">
            <span class="font-semibold">Inventory exposure:</span> FG/WIP risk trending ${summary.inventoryPressure === 'GREEN' ? '→' : summary.inventoryPressure === 'YELLOW' ? '↑' : '↑↑'} · confidence ${summary.dataConfidence === 'HIGH' ? 'HIGH' : 'MED'} · ${summary.inventoryPressure !== 'GREEN' ? '1 review' : 'monitor'}
          </div>
        </div>

        <!-- Signal 4: System load -->
        <div class="flex items-start gap-3 py-2">
          <div class="flex-shrink-0 w-2 h-2 rounded-full mt-1 ${topExceptions.length > 3 ? 'bg-yellow-500' : 'bg-green-500'}"></div>
          <div class="flex-1 text-sm text-slate-700">
            <span class="font-semibold">System load:</span> ${topExceptions.length} open decisions · SLA breaches: ${topExceptions.filter(ex => ex.slaHours && ex.slaHours <= 24).length}
          </div>
        </div>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- DECISION QUEUE: What needs a decision this week -->
    <!-- ============================================================ -->
    <div class="bg-white border-2 border-blue-200 rounded-xl p-6 mb-4">
      <div class="flex items-center justify-between mb-4">
        <div>
          <div class="text-lg font-bold text-slate-900">Decision Queue — This Week</div>
          <div class="text-xs text-slate-600 mt-1">Ranked by Impact × Confidence × Urgency. Every card answers: Decision / Why now / Impact / Owner+SLA / Actions</div>
        </div>
        <div class="text-xs text-slate-500">Updated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
      </div>

      <div class="space-y-4">
        ${generateTopFocusCards(programs).map((focus, idx) => `
          <div class="bg-white border-2 ${focus.priority === 'HIGH' ? 'border-red-300' : focus.priority === 'MEDIUM' ? 'border-yellow-300' : 'border-blue-300'} rounded-lg p-5 hover:shadow-md transition-shadow">
            <!-- Header: Program + Priority -->
            <div class="flex items-center gap-2 mb-3">
              <span class="text-lg font-bold text-slate-400">#${idx + 1}</span>
              <span class="text-base font-bold text-slate-900">${focus.program}</span>
              ${focus.site ? `<span class="text-xs text-slate-500">/ ${focus.site}</span>` : ''}
              <span class="px-2 py-0.5 rounded text-xs font-semibold ${focus.priority === 'HIGH' ? 'bg-red-100 text-red-800' : focus.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}">${focus.priority}</span>
            </div>

            <!-- Decision needed (one sentence) -->
            <div class="mb-3">
              <div class="text-xs font-semibold text-slate-700 mb-1">Decision:</div>
              <div class="text-sm text-slate-900 font-medium">Protect W04 commit (${focus.whyNow})</div>
            </div>

            <!-- Why now + Impact (grid) -->
            <div class="grid grid-cols-2 gap-4 mb-3 pb-3 border-b border-slate-200">
              <div>
                <div class="text-xs font-semibold text-slate-700 mb-1">Why now:</div>
                <div class="text-xs text-slate-700">${focus.whyNow} · confidence <span class="font-semibold ${focus.confidence === 'HIGH' ? 'text-green-700' : focus.confidence === 'MEDIUM' ? 'text-yellow-700' : 'text-red-700'}">${focus.confidence || 'HIGH'}</span></div>
              </div>
              <div>
                <div class="text-xs font-semibold text-slate-700 mb-1">Impact:</div>
                <div class="text-xs text-slate-700">${focus.impact} · SLA: <span class="font-semibold ${focus.slaHours <= 24 ? 'text-red-600' : 'text-slate-600'}">${focus.slaHours}h</span></div>
              </div>
            </div>

            <!-- Owner + Actions -->
            <div class="flex items-center justify-between">
              <div class="text-xs text-slate-600">
                <span class="font-semibold">Owner:</span> ${focus.owner}
              </div>
              <div class="flex gap-2">
                <button onclick="enterProgram('${focus.program}', '${focus.site || 'WF'}')" class="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200">
                  [Open Plan]
                </button>
                <button onclick="openAtRiskBreakdown()" class="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200">
                  [Check CTB]
                </button>
                <button onclick="assignOrEscalate('${focus.program}')" class="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded">
                  [Run What-if]
                </button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>

      ${generateTopFocusCards(programs).length === 0 ? `
        <div class="bg-white border-2 border-green-300 rounded-lg p-6 text-center">
          <div class="text-4xl mb-2">✅</div>
          <div class="text-sm font-bold text-green-900 mb-1">All Programs On Track</div>
          <div class="text-xs text-green-700">No urgent decisions needed this week. Continue monitoring for changes.</div>
        </div>
      ` : ''}
    </div>

    <!-- Program Summary Table (Browse Layer - lightened) -->
    <div class="bg-white border rounded-xl overflow-hidden mb-4">
      <div class="p-4 border-b bg-slate-50">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-semibold text-slate-700">Browse All Programs — Week ${portfolio.week}</div>
            <div class="text-xs text-slate-500 mt-1">Facts + Routing layer. Click program to open detailed view.</div>
          </div>
          <div class="flex gap-2">
            <button onclick="filterPrograms('at-risk')" class="px-3 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded border border-slate-200">
              At-risk only
            </button>
            <button onclick="filterPrograms('ctb')" class="px-3 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded border border-slate-200">
              Filter: CTB
            </button>
          </div>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead class="bg-slate-50 border-b">
            <tr>
              <th class="text-left p-3 font-semibold text-slate-700">Program / Sites</th>
              <th class="text-right p-3 font-semibold text-slate-700">Gap (units)</th>
              <th class="text-left p-3 font-semibold text-slate-700">Binding Constraint</th>
              <th class="text-left p-3 font-semibold text-slate-700">Decision Due</th>
              <th class="text-left p-3 font-semibold text-slate-700">Owner</th>
              <th class="text-center p-3 font-semibold text-slate-700">Open Module</th>
            </tr>
          </thead>
          <tbody>
            ${programs.map(prog => {
              const constraint = extractPrimaryConstraint(prog.topDriver);
              const constraintIcon =
                constraint === 'CTB' ? '📦' :
                constraint === 'Yield' ? '🎯' :
                constraint === 'Capacity' ? '🏭' :
                constraint === 'Shipment' ? '🚚' : '📊';
              const confidence = prog.confidence || 'HIGH';
              const statusDot = prog.commitHealth === 'GREEN' ? '🟢' : prog.commitHealth === 'YELLOW' ? '🟡' : '🔴';

              return `
              <tr class="border-b hover:bg-blue-50 cursor-pointer transition" onclick="enterProgram('${prog.name}', '${prog.buildSites.split(',')[0].trim()}');">
                <td class="p-3">
                  <div class="flex items-center gap-2">
                    <span class="text-sm">${statusDot}</span>
                    <div>
                      <div class="font-semibold text-slate-900">${prog.name}</div>
                      <div class="text-xs text-slate-500">${prog.buildSites}</div>
                    </div>
                    ${confidence !== 'HIGH' ? `
                      <span class="px-1.5 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-700">
                        ${confidence}
                      </span>
                    ` : ''}
                  </div>
                </td>
                <td class="p-3 text-right font-semibold text-slate-900">${prog.atRiskUnits > 0 ? prog.atRiskUnits.toLocaleString() : '—'}</td>
                <td class="p-3">
                  <div class="flex items-center gap-1.5">
                    <span>${constraintIcon}</span>
                    <span class="font-medium text-slate-700">${constraint}</span>
                  </div>
                </td>
                <td class="p-3">
                  <span class="font-medium ${prog.sla === '24h' ? 'text-red-600' : prog.sla === '48h' ? 'text-yellow-600' : 'text-slate-600'}">${prog.sla}</span>
                </td>
                <td class="p-3 text-slate-700">${prog.owner}</td>
                <td class="p-3 text-center">
                  <button onclick="enterProgram('${prog.name}', '${prog.buildSites.split(',')[0].trim()}'); event.stopPropagation();" class="px-2 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200">
                    Production Plan
                  </button>
                </td>
              </tr>
            `}).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Top Exceptions (Evidence-backed) -->
    <div class="bg-white border rounded-xl p-6">
      <div class="text-sm font-semibold mb-2">Top Exceptions — Evidence-Backed Routing</div>
      <div class="text-xs text-slate-500 mb-4">Every exception shows: Decision / Evidence ready / Threatens outcome / Owner+SLA / Actions</div>

      <div class="space-y-4">
        ${topExceptions.map((ex, idx) => {
          // Determine what outcome this threatens
          const threatenedOutcome = ex.issue.toLowerCase().includes('ctb') || ex.issue.toLowerCase().includes('material') ? 'Commit fulfillment' :
                                    ex.issue.toLowerCase().includes('yield') ? 'Output quality' :
                                    ex.issue.toLowerCase().includes('ship') ? 'Delivery timing' : 'Plan execution';

          return `
          <div class="border-2 ${ex.severity === 'HIGH' ? 'border-red-300 bg-red-50' : ex.severity === 'MED' ? 'border-yellow-300 bg-yellow-50' : 'border-blue-300 bg-blue-50'} rounded-lg p-4">
            <!-- Header -->
            <div class="flex items-start justify-between gap-3 mb-3">
              <div class="flex items-start gap-2 flex-1">
                <div class="text-base font-bold text-slate-400">#${idx + 1}</div>
                <div class="flex-1">
                  <div class="font-semibold text-sm text-slate-900 mb-1">${ex.program} — ${ex.issue}</div>
                  <div class="flex items-center gap-2">
                    <span class="px-2 py-0.5 rounded text-xs font-semibold ${ex.severity === 'HIGH' ? 'bg-red-100 text-red-800' : ex.severity === 'MED' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}">
                      ${ex.severity}
                    </span>
                    ${ex.confidence ? `
                      <span class="px-2 py-0.5 rounded text-xs font-semibold ${ex.confidence === 'HIGH' ? 'bg-green-100 text-green-700' : ex.confidence === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'} border ${ex.confidence === 'HIGH' ? 'border-green-300' : ex.confidence === 'MEDIUM' ? 'border-yellow-300' : 'border-red-300'}">
                        ${ex.confidence}
                      </span>
                    ` : ''}
                  </div>
                </div>
              </div>
            </div>

            <!-- Exception details grid -->
            <div class="grid grid-cols-2 gap-3 mb-3">
              <!-- Decision needed -->
              <div class="bg-white border border-slate-200 rounded p-3">
                <div class="text-xs font-semibold text-slate-700 mb-1">Exception:</div>
                <div class="text-xs text-slate-900">${ex.decisionNeeded || ex.issue}</div>
              </div>

              <!-- Threatens -->
              <div class="bg-white border border-slate-200 rounded p-3">
                <div class="text-xs font-semibold text-slate-700 mb-1">Threatens:</div>
                <div class="text-xs text-slate-900 font-medium">${threatenedOutcome}</div>
              </div>
            </div>

            <!-- Evidence ready -->
            ${ex.evidence && ex.evidence.length > 0 ? `
              <div class="mb-3 bg-white border border-slate-200 rounded p-3">
                <div class="text-xs font-semibold text-slate-700 mb-2">Evidence:</div>
                <div class="flex items-center gap-3 flex-wrap">
                  ${ex.evidence.slice(0, 3).map(e => `
                    <div class="text-xs text-slate-700 flex items-center gap-1">
                      <span class="text-green-600">✅</span>
                      <span>${e.split(':')[0] || e}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : `
              <div class="mb-3 bg-white border border-amber-200 rounded p-3">
                <div class="text-xs text-amber-800">⚠️ Evidence incomplete — needs validation before routing</div>
              </div>
            `}

            <!-- Routing: Owner + SLA + Actions -->
            <div class="flex items-center justify-between pt-3 border-t border-slate-200">
              <div class="text-xs text-slate-600">
                <span class="font-semibold">Routing to:</span> ${ex.owner || 'Unassigned'} ·
                <span class="font-semibold ${ex.slaHours && ex.slaHours <= 24 ? 'text-red-600' : 'text-slate-600'}">
                  SLA ${ex.sla || ex.slaHours ? ex.slaHours + 'h' : 'TBD'}
                </span>
              </div>
              <div class="flex gap-2">
                <button onclick="openException('${ex.program}', '${ex.issue}')" class="px-2 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded border border-slate-200">
                  [Open evidence]
                </button>
                <button onclick="enterProgram('${ex.program}', 'WF')" class="px-2 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded">
                  [Open plan]
                </button>
              </div>
            </div>
          </div>
        `}).join('')}
      </div>
    </div>
  `;

  $("content").innerHTML = html;
}

// ========================================
// HOME - Delivery Command Center
// ========================================
function renderHome() {
  const demo = getDemo();
  const scenario = getScenario();

  if (!demo || !demo.deliveryCommit) {
    $("content").innerHTML = `<div class="p-4 text-center text-slate-500">No data available for this scenario</div>`;
    return;
  }

  const { deliveryCommit, topDeliveryRisks = [], todaysLoop, pacingGuardrail, kpis } = demo;

  const html = `
    <!-- Scenario Header -->
    <div class="bg-white border rounded-xl p-4">
      <div class="text-sm font-semibold text-slate-900">${scenario.name}</div>
      <div class="text-xs text-slate-600 mt-1">${scenario.description}</div>
    </div>

    <!-- Delivery Commit Hero Card -->
    <div class="bg-white border rounded-xl p-6 ${COMMIT_HEALTH_COLORS[deliveryCommit.commitHealth]} border-2">
      <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">This Week's Delivery Commit</div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <div class="text-xs text-slate-600">Week / Product / Factory Site</div>
          <div class="font-semibold text-sm">${deliveryCommit.week} / ${deliveryCommit.product} / ${deliveryCommit.factorySite}</div>
        </div>
        <div>
          <div class="text-xs text-slate-600">Commit Health</div>
          <div class="flex items-center gap-2">
            <div class="text-2xl font-bold">${deliveryCommit.commitHealth}</div>
            <div class="text-xs">${deliveryCommit.commitHealthLabel}</div>
          </div>
        </div>
        <div>
          <div class="text-xs text-slate-600">At-risk Units / Confidence</div>
          <div class="text-2xl font-bold">${deliveryCommit.atRiskUnits.toLocaleString()} <span class="text-sm font-normal">/ ${deliveryCommit.confidence}%</span></div>
        </div>
      </div>

      ${deliveryCommit.recoveryActions && deliveryCommit.recoveryActions.length > 0 ? `
        <div class="border-t pt-4 mt-4">
          <div class="text-xs font-semibold text-slate-700 mb-3">What we need to do (next 48h):</div>
          <div class="space-y-2">
            ${deliveryCommit.recoveryActions.map((action, i) => `
              <div class="flex items-start gap-3 p-3 bg-white rounded-lg border">
                <div class="flex-shrink-0 w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">${action.priority}</div>
                <div class="flex-1">
                  <div class="text-sm font-semibold">${action.action}</div>
                  <div class="text-xs text-slate-600 mt-1">
                    <span class="font-semibold">Owner:</span> ${action.owner}
                    <span class="mx-2">|</span>
                    <span class="font-semibold">SLA:</span> ${action.sla}
                    <span class="mx-2">|</span>
                    <span class="px-2 py-0.5 rounded ${action.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'}">${action.status.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : '<div class="text-sm text-slate-600">✓ No recovery actions needed — commit on track</div>'}

      <div class="border-t pt-3 mt-4 text-xs text-slate-600">
        <strong>Next checkpoint:</strong> ${deliveryCommit.nextCheckpoint}
      </div>
    </div>

    <!-- Top Delivery Risks -->
    ${topDeliveryRisks.length > 0 ? `
      <div class="bg-white border rounded-xl p-6">
        <div class="text-sm font-semibold mb-4">Top Delivery Risks (Ranked)</div>
        <div class="space-y-3">
          ${topDeliveryRisks.map((risk, index) => `
            <div class="border rounded-lg p-4 hover:bg-slate-50 cursor-pointer" onclick="openCaseDrawer('${risk.id}')">
              <div class="flex items-start justify-between gap-4">
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-2">
                    <span class="text-xs font-bold text-slate-500">#${index + 1}</span>
                    <span class="text-sm font-semibold">${risk.sku || risk.order} / ${risk.factory} / ${risk.week}</span>
                    <span class="px-2 py-0.5 rounded text-xs ${risk.type === 'LATE' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}">${risk.type}</span>
                  </div>
                  <div class="text-xs text-slate-600 mb-2">
                    <strong>Driver:</strong> ${risk.driver}
                  </div>
                  <div class="text-xs text-slate-600 mb-2">
                    <strong>Impact:</strong> ${risk.impact}
                  </div>
                  <div class="text-xs bg-green-50 border-l-2 border-green-500 p-2 rounded">
                    <strong>Action:</strong> ${risk.action}
                  </div>
                  <div class="flex items-center gap-4 mt-2 text-xs text-slate-500">
                    <div><strong>Owner:</strong> ${risk.owner}</div>
                    <div><strong>SLA:</strong> ${risk.sla}</div>
                    <div class="flex items-center gap-1">
                      <span>${ROUTE_ICONS[risk.route]}</span>
                      <span>${risk.route.replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-2xl font-bold">${risk.score}</div>
                  <div class="text-xs text-slate-500">${risk.confidence}% conf</div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}

    <!-- Today's Loop -->
    ${todaysLoop ? `
      <div class="bg-white border rounded-xl p-6">
        <div class="text-sm font-semibold mb-4">Today's Loop — End-to-End Case</div>
        <div class="space-y-4">
          <!-- Case Header -->
          <div class="border rounded-lg p-3 bg-slate-50">
            <div class="text-sm font-bold mb-1">${todaysLoop.caseId}</div>
            <div class="text-xs text-slate-600 mb-2">${todaysLoop.deliveryImpact}</div>
            <div class="flex items-center gap-4 text-xs">
              <div><strong>Late Score:</strong> ${todaysLoop.lateScore}</div>
              <div><strong>Excess Score:</strong> ${todaysLoop.excessScore}</div>
              <div><strong>Confidence:</strong> ${todaysLoop.confidence}%</div>
            </div>
          </div>

          <!-- Signals -->
          <div class="border-l-4 border-blue-500 pl-4">
            <div class="text-xs font-semibold text-slate-500 uppercase mb-2">→ SIGNALS</div>
            <ul class="text-xs space-y-1">
              ${todaysLoop.signals.map(s => `<li>• ${s}</li>`).join('')}
            </ul>
          </div>

          <!-- Factory Reality -->
          <div class="border-l-4 border-purple-500 pl-4">
            <div class="text-xs font-semibold text-slate-500 uppercase mb-2">→ FACTORY IMPACT</div>
            <ul class="text-xs space-y-1">
              ${todaysLoop.factoryReality.map(f => `<li>• ${f}</li>`).join('')}
            </ul>
          </div>

          <!-- Decision -->
          <div class="border-l-4 border-orange-500 pl-4">
            <div class="text-xs font-semibold text-slate-500 uppercase mb-2">→ DECISION</div>
            <div class="text-sm font-semibold">Route: ${todaysLoop.decision}</div>
          </div>

          <!-- Actions -->
          <div class="border-l-4 border-green-500 pl-4">
            <div class="text-xs font-semibold text-slate-500 uppercase mb-2">→ ACTIONS</div>
            <ul class="text-xs space-y-1">
              ${todaysLoop.actions.map(a => `<li>• ${a}</li>`).join('')}
            </ul>
          </div>

          <!-- Evidence & Feedback -->
          <div class="flex items-center gap-4">
            <div class="flex-1 border-l-4 border-slate-500 pl-4">
              <div class="text-xs font-semibold text-slate-500 uppercase">→ EVIDENCE PACK</div>
              <div class="text-xs">${todaysLoop.evidencePack}</div>
            </div>
            <div class="flex-1 border-l-4 border-slate-500 pl-4">
              <div class="text-xs font-semibold text-slate-500 uppercase">→ FEEDBACK</div>
              <div class="text-xs">${todaysLoop.feedback}</div>
            </div>
          </div>
        </div>
      </div>
    ` : ''}

    <!-- Pacing Guardrail -->
    ${pacingGuardrail ? `
      <div class="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div class="text-xs font-semibold text-amber-900 uppercase mb-2">⚠️ Pacing Guardrail (Secondary)</div>
        <div class="text-sm text-amber-900 mb-2">${pacingGuardrail.message}</div>
        <div class="text-xs text-amber-800"><strong>Rule:</strong> ${pacingGuardrail.rule}</div>
      </div>
    ` : ''}

    <!-- Executive KPIs -->
    ${kpis ? `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="bg-white border rounded-xl p-4">
          <div class="text-xs text-slate-500 mb-1">Execution Health</div>
          <div class="flex items-center gap-3">
            <div class="text-3xl font-bold">${kpis.executionHealth}</div>
            <span class="px-2 py-1 rounded text-xs ${STATUS_COLORS[kpis.executionHealthStatus]}">${kpis.executionHealthStatus}</span>
          </div>
          <div class="text-xs text-slate-600 mt-2">${kpis.executionHealthDrivers}</div>
        </div>
        <div class="bg-white border rounded-xl p-4">
          <div class="text-xs text-slate-500 mb-1">Inventory & Liability Pressure</div>
          <div class="flex items-center gap-3">
            <div class="text-3xl font-bold">${kpis.inventoryPressure}</div>
            <span class="px-2 py-1 rounded text-xs ${STATUS_COLORS[kpis.inventoryPressureStatus]}">${kpis.inventoryPressureStatus}</span>
          </div>
          <div class="text-xs text-slate-600 mt-2">${kpis.inventoryPressureDrivers}</div>
        </div>
      </div>
    ` : ''}
  `;

  $("content").innerHTML = html;
}

// ========================================
// SIGNALS
// ========================================
function renderSignals() {
  const demo = getDemo();

  if (!demo || !demo.signals) {
    $("content").innerHTML = `<div class="p-4 text-center text-slate-500">No signal data available</div>`;
    return;
  }

  const { signals } = demo;

  const html = `
    <div class="bg-white border rounded-xl p-6">
      <div class="flex items-start justify-between mb-2">
        <div class="flex-1">
          <div class="text-sm font-semibold mb-2">Signals — Turn factory reality into trusted signals</div>
          <div class="text-xs text-slate-600 mb-4">Convert fragmented planning / factory / material / inventory inputs into trusted signals with freshness, coverage, and confidence labels.</div>
        </div>
        <button onclick="openAIDrawer('signals_ingest')" class="flex items-center gap-2 text-sm bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg px-4 py-2 hover:from-blue-700 hover:to-purple-700 flex-shrink-0">
          <span>🤖</span>
          <span>AI: Ingest Update</span>
        </button>
      </div>

      <!-- Data Quality Matrix -->
      <div class="mb-6">
        <div class="text-xs font-semibold text-slate-700 mb-3">Data Quality Matrix</div>
        <div class="border rounded-lg overflow-hidden">
          <table class="w-full text-xs">
            <thead class="bg-slate-50">
              <tr>
                <th class="text-left p-2 font-semibold">Source</th>
                <th class="text-center p-2 font-semibold">Freshness</th>
                <th class="text-center p-2 font-semibold">Coverage</th>
                <th class="text-center p-2 font-semibold">Trust</th>
              </tr>
            </thead>
            <tbody>
              ${signals.dataQuality.map((dq, i) => `
                <tr class="${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}">
                  <td class="p-2">${dq.source}</td>
                  <td class="text-center p-2"><span class="px-2 py-0.5 rounded ${STATUS_COLORS[dq.freshness]}">${dq.freshness}</span></td>
                  <td class="text-center p-2"><span class="px-2 py-0.5 rounded ${STATUS_COLORS[dq.coverage]}">${dq.coverage}</span></td>
                  <td class="text-center p-2"><span class="px-2 py-0.5 rounded ${STATUS_COLORS[dq.trust]}">${dq.trust}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div class="text-xs text-slate-500 mt-2">Low coverage reduces decision automation. High trust enables auto-routing.</div>
      </div>

      <!-- Event Stream -->
      <div>
        <div class="text-xs font-semibold text-slate-700 mb-3">Event Stream — What changed since last cut (last 24h)</div>
        <div class="space-y-2">
          ${signals.eventStream.map(event => `
            <div class="border rounded-lg p-3 flex items-start gap-3">
              <div class="text-xs font-mono text-slate-500">${event.time}</div>
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <span class="px-2 py-0.5 rounded text-xs font-semibold ${event.severity === 'HIGH' ? 'bg-red-100 text-red-800' : event.severity === 'MED' ? 'bg-yellow-100 text-yellow-800' : 'bg-slate-100 text-slate-700'}">${event.type}</span>
                  <span class="text-xs text-slate-500">${event.severity}</span>
                </div>
                <div class="text-sm">${event.message}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  $("content").innerHTML = html;
}

// ========================================
// RISK RADAR
// ========================================
function renderRadar() {
  const demo = getDemo();

  if (!demo || !demo.riskRadar) {
    $("content").innerHTML = `<div class="p-4 text-center text-slate-500">No risk data available</div>`;
    return;
  }

  const { riskRadar, kpis } = demo;

  const html = `
    <div class="bg-white border rounded-xl p-6">
      <div class="flex items-start justify-between mb-2">
        <div class="flex-1">
          <div class="text-sm font-semibold mb-2">Risk Radar — Rank what threatens commit</div>
          <div class="text-xs text-slate-600 mb-4">Rank delivery risk and overbuild liability with explainable drivers and confidence. Focus on actions that change outcomes, not just metrics.</div>
        </div>
        <button onclick="openAIDrawer('radar_interpret_scores')" class="flex items-center gap-2 text-xs bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg px-3 py-1.5 hover:from-blue-700 hover:to-purple-700 flex-shrink-0">
          <span>🤖</span>
          <span>AI: Interpret Scores</span>
        </button>
      </div>

      <!-- KPIs -->
      ${kpis ? `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div class="border rounded-lg p-4 bg-slate-50">
            <div class="text-xs text-slate-500 mb-1">Execution Health</div>
            <div class="flex items-center gap-3">
              <div class="text-2xl font-bold">${kpis.executionHealth}</div>
              <span class="px-2 py-1 rounded text-xs ${STATUS_COLORS[kpis.executionHealthStatus]}">${kpis.executionHealthStatus}</span>
            </div>
            <div class="text-xs text-slate-600 mt-2">${kpis.executionHealthDrivers}</div>
          </div>
          <div class="border rounded-lg p-4 bg-slate-50">
            <div class="text-xs text-slate-500 mb-1">Inventory Pressure</div>
            <div class="flex items-center gap-3">
              <div class="text-2xl font-bold">${kpis.inventoryPressure}</div>
              <span class="px-2 py-1 rounded text-xs ${STATUS_COLORS[kpis.inventoryPressureStatus]}">${kpis.inventoryPressureStatus}</span>
            </div>
            <div class="text-xs text-slate-600 mt-2">${kpis.inventoryPressureDrivers}</div>
          </div>
        </div>
      ` : ''}

      <!-- Late Risks -->
      <div class="mb-6">
        <div class="text-sm font-semibold mb-3">Late Risks (Delivery)</div>
        <div class="space-y-3">
          ${riskRadar.lateRisks.map(risk => `
            <div class="border rounded-lg p-4 hover:bg-slate-50">
              <div class="flex items-start justify-between gap-4 mb-3 cursor-pointer" onclick="openCaseDrawer('${risk.id}')">
                <div class="flex-1">
                  <div class="text-sm font-semibold mb-2">${risk.object}</div>
                  <div class="text-xs text-slate-600 mb-2">
                    <strong>Drivers:</strong> ${risk.drivers.join(' • ')}
                  </div>
                  <div class="text-xs text-slate-600 mb-2">
                    <strong>Impact:</strong> ${risk.impact}
                  </div>
                  <div class="text-xs bg-green-50 border-l-2 border-green-500 p-2 rounded">
                    <strong>Suggested:</strong> ${risk.recommendedAction}
                  </div>
                  <div class="flex items-center gap-2 mt-2 text-xs">
                    <span>${ROUTE_ICONS[risk.route]}</span>
                    <span>${risk.route.replace(/_/g, ' ')}</span>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-2xl font-bold">${risk.score}</div>
                  <div class="text-xs text-slate-500">${risk.confidence}% conf</div>
                </div>
              </div>
              <div class="flex items-center gap-2 border-t pt-3">
                <button onclick="event.stopPropagation(); openAIDrawer('radar_explain_risk')" class="flex items-center gap-1 text-xs bg-blue-600 text-white rounded-lg px-3 py-1.5 hover:bg-blue-700">
                  <span>🤖</span>
                  <span>Explain</span>
                </button>
                <button onclick="event.stopPropagation(); openAIDrawer('radar_explain_risk')" class="flex items-center gap-1 text-xs bg-green-600 text-white rounded-lg px-3 py-1.5 hover:bg-green-700">
                  <span>🤖</span>
                  <span>Action Options</span>
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Excess Risks -->
      ${riskRadar.excessRisks.length > 0 ? `
        <div>
          <div class="text-sm font-semibold mb-3">Excess Risks (Guardrails)</div>
          <div class="space-y-3">
            ${riskRadar.excessRisks.map(risk => `
              <div class="border rounded-lg p-4 hover:bg-slate-50 cursor-pointer bg-amber-50" onclick="openCaseDrawer('${risk.id}')">
                <div class="flex items-start justify-between gap-4">
                  <div class="flex-1">
                    <div class="text-sm font-semibold mb-2">${risk.object}</div>
                    <div class="text-xs text-slate-600 mb-2">
                      <strong>Drivers:</strong> ${risk.drivers.join(' • ')}
                    </div>
                    <div class="text-xs text-slate-600 mb-2">
                      <strong>Impact:</strong> ${risk.impact}
                    </div>
                    <div class="text-xs bg-yellow-50 border-l-2 border-yellow-500 p-2 rounded">
                      <strong>Suggested:</strong> ${risk.recommendedAction}
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="text-2xl font-bold">${risk.score}</div>
                    <div class="text-xs text-slate-500">${risk.confidence}% conf</div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Footer Note -->
      <div class="mt-6 p-3 bg-slate-50 rounded-lg text-xs text-slate-600">
        <strong>Note:</strong> Confidence controls routing: auto-action vs human review vs monitor.
      </div>
    </div>
  `;

  $("content").innerHTML = html;
}

// ========================================
// ACTIONS — Recovery Playbooks
// ========================================
function renderActions() {
  const demo = getDemo();

  if (!demo || !demo.orchestration) {
    $("content").innerHTML = `<div class="p-4 text-center text-slate-500">No orchestration data available</div>`;
    return;
  }

  const { orchestration } = demo;

  const html = `
    <div class="bg-white border rounded-xl p-6">
      <div class="flex items-start justify-between mb-2">
        <div class="flex-1">
          <div class="text-sm font-semibold mb-2">Actions — Route Recovery with Owners and SLAs</div>
          <div class="text-xs text-slate-600 mb-4">Turn recommendations into routable workflows with clear thresholds, owners, SLAs, and checkpoints.</div>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <button onclick="openAIDrawer('actions_generate_playbook')" class="flex items-center gap-1 text-xs bg-blue-600 text-white rounded-lg px-3 py-1.5 hover:bg-blue-700">
            <span>🤖</span>
            <span>Generate Playbook</span>
          </button>
          <button onclick="openAIDrawer('actions_draft_message')" class="flex items-center gap-1 text-xs bg-green-600 text-white rounded-lg px-3 py-1.5 hover:bg-green-700">
            <span>📝</span>
            <span>Draft Message</span>
          </button>
        </div>
      </div>

      <!-- Routing Rules -->
      <div class="mb-6">
        <div class="text-sm font-semibold mb-3">Routing Rules</div>
        <div class="space-y-2">
          <div class="border rounded-lg p-3">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-lg">✅</span>
              <span class="text-xs font-semibold">Auto-action</span>
            </div>
            <div class="text-xs text-slate-600">${orchestration.routingRules.autoAction}</div>
          </div>
          <div class="border rounded-lg p-3">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-lg">👤</span>
              <span class="text-xs font-semibold">Human review</span>
            </div>
            <div class="text-xs text-slate-600">${orchestration.routingRules.humanReview}</div>
          </div>
          <div class="border rounded-lg p-3">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-lg">👁️</span>
              <span class="text-xs font-semibold">Monitor only</span>
            </div>
            <div class="text-xs text-slate-600">${orchestration.routingRules.monitor}</div>
          </div>
        </div>
      </div>

      <!-- Playbook Library -->
      <div>
        <div class="text-sm font-semibold mb-3">Playbook Library</div>
        <div class="space-y-3">
          ${orchestration.playbooks.map(pb => `
            <div class="border rounded-lg p-4">
              <div class="text-sm font-semibold mb-2">${pb.name}</div>
              <div class="text-xs text-slate-600 mb-3"><strong>When:</strong> ${pb.trigger}</div>
              <div class="space-y-1">
                ${pb.steps.map((step, i) => `
                  <div class="flex items-start gap-2 text-xs">
                    <span class="font-semibold text-slate-500">Step ${i + 1}:</span>
                    <span>${step}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  $("content").innerHTML = html;
}

// ========================================
// REPORTS
// ========================================
function renderReports() {
  const html = `
    <div class="bg-white border rounded-xl p-6">
      <div class="flex items-start justify-between mb-2">
        <div class="flex-1">
          <div class="text-sm font-semibold mb-2">Reports — One-click Briefings for Leadership</div>
          <div class="text-xs text-slate-600 mb-4">Generate decision briefings and evidence packs. Capture what we decided, why, and what happened next.</div>
        </div>
        <button onclick="openAIDrawer('reports_exec_email')" class="flex items-center gap-2 text-sm bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg px-4 py-2 hover:from-blue-700 hover:to-purple-700 flex-shrink-0">
          <span>🤖</span>
          <span>AI: Generate Exec Email</span>
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Template 1 -->
        <div class="border rounded-lg p-4 hover:bg-slate-50">
          <div class="text-sm font-semibold mb-2">📄 Weekly Factory Execution Brief</div>
          <div class="text-xs text-slate-600 mb-4">Factory snapshot + pacing recommendation + top risks + actions</div>
          <div class="flex gap-2">
            <button onclick="alert('Preview feature coming soon')" class="flex-1 text-xs border rounded-lg px-3 py-2 hover:bg-slate-100">Preview</button>
            <button onclick="alert('Download feature coming soon')" class="flex-1 text-xs bg-slate-900 text-white rounded-lg px-3 py-2 hover:bg-slate-800">Download PDF</button>
          </div>
        </div>

        <!-- Template 2 -->
        <div class="border rounded-lg p-4 hover:bg-slate-50">
          <div class="text-sm font-semibold mb-2">⚠️ Exception Report — Top 5 Risks</div>
          <div class="text-xs text-slate-600 mb-4">Late + excess risks ranked, with drivers and owners</div>
          <div class="flex gap-2">
            <button onclick="alert('Preview feature coming soon')" class="flex-1 text-xs border rounded-lg px-3 py-2 hover:bg-slate-100">Preview</button>
            <button onclick="alert('Download feature coming soon')" class="flex-1 text-xs bg-slate-900 text-white rounded-lg px-3 py-2 hover:bg-slate-800">Download PDF</button>
          </div>
        </div>

        <!-- Template 3 -->
        <div class="border rounded-lg p-4 hover:bg-slate-50">
          <div class="text-sm font-semibold mb-2">💰 Forecast Downside Impact</div>
          <div class="text-xs text-slate-600 mb-4">Overbuild exposure (FG/WIP/components) + recommended slow-down plan</div>
          <div class="flex gap-2">
            <button onclick="alert('Preview feature coming soon')" class="flex-1 text-xs border rounded-lg px-3 py-2 hover:bg-slate-100">Preview</button>
            <button onclick="alert('Download feature coming soon')" class="flex-1 text-xs bg-slate-900 text-white rounded-lg px-3 py-2 hover:bg-slate-800">Download PDF</button>
          </div>
        </div>
      </div>

      <div class="mt-6 p-4 bg-slate-50 rounded-lg text-xs text-slate-600">
        <strong>Demo mode:</strong> Reports are generated from mocked data for illustration.
      </div>
    </div>
  `;

  $("content").innerHTML = html;
}

// ========================================
// CASE DRAWER & REPORT FUNCTIONS
// ========================================

// Case Drawer Functions
function openCaseDrawer(riskId) {
  const demo = getDemo();

  // Find risk from all sources
  let risk = null;
  if (demo.topDeliveryRisks) {
    risk = demo.topDeliveryRisks.find(r => r.id === riskId);
  }
  if (!risk && demo.riskRadar) {
    risk = [...(demo.riskRadar.lateRisks || []), ...(demo.riskRadar.excessRisks || [])].find(r => r.id === riskId);
  }

  if (!risk) return;

  STATE.selectedRiskId = riskId;
  const icon = ROUTE_ICONS[risk.route] || "•";

  const drawerHtml = `
    <div class="space-y-4">
      <!-- Snapshot -->
      <div class="border rounded-xl p-3 bg-gradient-to-br from-blue-50 to-white">
        <div class="text-xs text-slate-500 mb-2">SNAPSHOT</div>
        <div class="font-bold text-lg mb-2">${risk.sku || risk.object || risk.id}</div>
        <div class="grid grid-cols-3 gap-2 text-center">
          <div><div class="text-xs text-slate-500">Score</div><div class="text-xl font-bold">${risk.score}</div></div>
          <div><div class="text-xs text-slate-500">Confidence</div><div class="text-xl font-bold">${risk.confidence}%</div></div>
          <div><div class="text-xs text-slate-500">Route</div><div class="text-2xl">${icon}</div></div>
        </div>
        <div class="mt-2 text-xs text-slate-600"><span class="font-semibold">Impact:</span> ${risk.impact}</div>
      </div>

      <!-- Driver -->
      <div class="border rounded-xl p-3">
        <div class="text-xs font-semibold text-slate-500 mb-2">→ DRIVER</div>
        <div class="text-xs p-2 bg-slate-50 rounded border-l-2 border-blue-500">${risk.driver}</div>
      </div>

      <!-- Recommended Action -->
      <div class="border rounded-xl p-3 bg-green-50">
        <div class="text-xs font-semibold text-slate-500 mb-2">→ RECOMMENDED ACTION</div>
        <div class="text-sm font-semibold mb-2">${risk.action || risk.recommendedAction}</div>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div><span class="text-slate-500">Owner:</span> ${risk.owner || 'China Delivery'}</div>
          <div><span class="text-slate-500">SLA:</span> ${risk.sla || '24-48h'}</div>
        </div>
      </div>

      <!-- Evidence Pack -->
      <div class="border rounded-xl p-3">
        <div class="text-xs font-semibold text-slate-500 mb-2">→ EVIDENCE PACK</div>
        <button onclick="generateReport('${risk.id}')" class="w-full text-sm border rounded-lg px-3 py-2 hover:bg-slate-50">📄 Generate Report</button>
      </div>

      <!-- Feedback -->
      <div class="border rounded-xl p-3">
        <div class="text-xs font-semibold text-slate-500 mb-2">→ FEEDBACK</div>
        <div class="text-xs text-slate-600 mb-2">Was this recommendation effective?</div>
        <div class="grid grid-cols-2 gap-2">
          <button class="text-sm border rounded-lg px-3 py-2 hover:bg-green-50" onclick="submitFeedback('${risk.id}', 'effective')">✓ Effective</button>
          <button class="text-sm border rounded-lg px-3 py-2 hover:bg-red-50" onclick="submitFeedback('${risk.id}', 'ineffective')">✗ Ineffective</button>
        </div>
        <div class="mt-2 text-xs text-slate-500">Status: Pending</div>
      </div>
    </div>
  `;

  document.getElementById('caseDrawerBody').innerHTML = drawerHtml;
  document.getElementById('caseDrawer').classList.remove('hidden');
  document.getElementById('caseDrawerBackdrop').classList.remove('hidden');
}

function closeCaseDrawer() {
  document.getElementById('caseDrawer').classList.add('hidden');
  document.getElementById('caseDrawerBackdrop').classList.add('hidden');
  STATE.selectedRiskId = null;
}

function submitFeedback(riskId, type) {
  alert(`Feedback "${type}" submitted for case ${riskId}. This would update the learning model.`);
  closeCaseDrawer();
}

// Report Generation with Delivery-first Weekly Report Style
function generateReport(riskId) {
  const demo = getDemo();

  // Find risk from all sources
  let risk = null;
  if (demo.topDeliveryRisks) {
    risk = demo.topDeliveryRisks.find(r => r.id === riskId);
  }
  if (!risk && demo.riskRadar) {
    risk = [...(demo.riskRadar.lateRisks || []), ...(demo.riskRadar.excessRisks || [])].find(r => r.id === riskId);
  }

  if (!risk) return;

  const scenario = getScenario();
  const timestamp = new Date().toISOString().split('T')[0];

  const reportHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;max-width:8.5in;margin:0 auto;padding:0.75in;background:white;color:#1e293b;line-height:1.5}
.header{border-bottom:3px solid #0f172a;padding-bottom:12px;margin-bottom:24px}
.header h1{font-size:18px;font-weight:700;margin:0 0 4px 0;color:#0f172a}
.header .meta{font-size:11px;color:#64748b}
.section{margin-bottom:20px;page-break-inside:avoid}
.section-title{font-size:10px;font-weight:700;text-transform:uppercase;color:#64748b;letter-spacing:0.5px;margin-bottom:8px;border-bottom:1px solid #e2e8f0;padding-bottom:4px}
.section-content{font-size:12px;color:#334155}
.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:16px 0}
.metric-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;text-align:center}
.metric-label{font-size:10px;color:#64748b;text-transform:uppercase;margin-bottom:4px}
.metric-value{font-size:24px;font-weight:700;color:#0f172a}
.action-box{background:#f0fdf4;border-left:4px solid #22c55e;padding:12px;margin:8px 0;border-radius:4px}
.action-box strong{color:#166534}
ul{margin:8px 0;padding-left:20px}
li{margin:4px 0;font-size:12px}
.footer{margin-top:32px;padding-top:16px;border-top:2px solid #e2e8f0;font-size:10px;color:#94a3b8}
.status-badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:600;background:#fef3c7;color:#92400e}
</style></head><body>
<div class="header">
<h1>🏭 W04 Commit Protection Brief — ${risk.factory} / ${STATE.filters.product}</h1>
<div class="meta"><strong>Case ID:</strong> ${risk.id} | <strong>Generated:</strong> ${timestamp} | <strong>Scenario:</strong> ${scenario.name}</div>
</div>
<div class="section"><div class="section-title">Situation</div><div class="section-content"><strong>${risk.sku || risk.object}</strong> — Current commit is at risk. Requires <span class="status-badge">${risk.route.replace(/_/g, ' ')}</span> routing.</div></div>
<div class="section"><div class="section-title">Driver</div><div class="section-content">${risk.driver}</div></div>
<div class="section"><div class="section-title">Impact</div><div class="section-content">${risk.impact}</div></div>
<div class="section"><div class="section-title">Risk Assessment</div>
<div class="metrics">
<div class="metric-card"><div class="metric-label">Risk Score</div><div class="metric-value">${risk.score}</div></div>
<div class="metric-card"><div class="metric-label">Confidence</div><div class="metric-value">${risk.confidence}%</div></div>
<div class="metric-card"><div class="metric-label">Route</div><div class="metric-value" style="font-size:20px;">${ROUTE_ICONS[risk.route]}</div></div>
</div></div>
<div class="section"><div class="section-title">Decision & Route</div>
<div class="section-content"><strong>Route:</strong> ${risk.route.replace(/_/g, ' ')}<br><strong>Reason:</strong> ${risk.routeReason || 'Policy threshold'}</div></div>
<div class="section"><div class="section-title">Recommended Actions</div>
<div class="action-box"><strong>Action:</strong> ${risk.action || risk.recommendedAction}<br>
<span style="font-size:11px;color:#64748b;">Owner: ${risk.owner || 'China Delivery'} | SLA: ${risk.sla || '24-48h'}</span></div>
</div>
<div class="footer">
<div><strong>Decision Log:</strong> Pending review by China Delivery Team</div>
<div><strong>Feedback Status:</strong> Awaiting outcome validation within 7 days</div>
<div style="margin-top:8px;"><em>Generated by SCDO Control Tower — Factory Execution Loop | Confidential & Internal Use Only</em></div>
</div></body></html>`;

  document.getElementById('reportPreview').innerHTML = reportHtml;
  document.getElementById('reportModal').classList.remove('hidden');
  document.getElementById('reportModalBackdrop').classList.remove('hidden');
  window._currentReportHtml = reportHtml;
  window._currentReportFilename = `SCDO_W04_Commit_Brief_${risk.id}_${timestamp}`;
}

function downloadHTMLReport() {
  const blob = new Blob([window._currentReportHtml], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${window._currentReportFilename}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadPDFReport() {
  const element = document.getElementById('reportPreview');
  const opt = {
    margin: 0.5,
    filename: `${window._currentReportFilename}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
  };
  html2pdf().set(opt).from(element).save();
}

function closeReportModal() {
  document.getElementById('reportModal').classList.add('hidden');
  document.getElementById('reportModalBackdrop').classList.add('hidden');
}

// Global exports
window.openCaseDrawer = openCaseDrawer;
window.closeCaseDrawer = closeCaseDrawer;
window.generateReport = generateReport;
window.submitFeedback = submitFeedback;
window.downloadHTMLReport = downloadHTMLReport;
window.downloadPDFReport = downloadPDFReport;
window.closeReportModal = closeReportModal;

// Initialize report modal buttons after DOM loads
(function() {
  const initReportButtons = () => {
    const downloadHTMLBtn = document.getElementById('downloadHTMLBtn');
    const downloadPDFBtn = document.getElementById('downloadPDFBtn');
    const closeReportModalBtn = document.getElementById('closeReportModalBtn');

    if (downloadHTMLBtn) {
      downloadHTMLBtn.addEventListener('click', downloadHTMLReport);
      downloadPDFBtn.addEventListener('click', downloadPDFReport);
      closeReportModalBtn.addEventListener('click', closeReportModal);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReportButtons);
  } else {
    initReportButtons();
  }
})();

// Initialize
(async function() {
  await loadData();
  setMeta();
  initControls();
  render();
})();
// Home v3 - Delivery Command Center
// This is the new renderHome function with v3 architecture

function renderHomeV3() {
  const demo = getDemo();
  const scenario = getScenario();

  if (!demo || !demo.deliveryCommit) {
    $("content").innerHTML = `<div class="p-4 text-center text-slate-500">No data available for this scenario</div>`;
    return;
  }

  const { deliveryCommit, topDeliveryRisks = [], todaysLoop, pacingGuardrail, kpis } = demo;
  const isSimulation = STATE.viewMode === "simulation";
  const simResults = STATE.simulationResults;

  const html = `
    ${isSimulation ? `
      <!-- Simulation Mode Banner -->
      <div class="bg-blue-600 text-white border rounded-xl p-3 mb-4">
        <div class="flex items-center gap-2">
          <div class="text-lg">🔬</div>
          <div class="flex-1">
            <div class="text-sm font-bold">Simulation Mode</div>
            <div class="text-xs opacity-90">You are viewing a what-if scenario. No operational actions are executed.</div>
          </div>
        </div>
      </div>
    ` : ''}

    <!-- Hero Banner -->
    <div class="bg-gradient-to-r from-blue-50 to-slate-50 border rounded-xl p-4 mb-4">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-sm font-bold text-slate-900">Scenario Focus: Protect W04 Commit (Delivery Risk + Yield Drift)</div>
          <div class="text-xs text-slate-600 mt-1">Material constraint + yield drift are pressuring commit confidence. Prioritize actions that change outcomes within 48 hours.</div>
        </div>
        <div class="px-3 py-1.5 bg-white border rounded-lg text-xs font-semibold">
          <span class="text-slate-500">Scope:</span> ${STATE.filters.product} · ${STATE.filters.factorySite} · ${STATE.filters.week}
        </div>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- COMPONENT 1: Executive Scorecard (NEW) -->
    <!-- ============================================================ -->
    <div class="bg-white border-2 border-slate-200 rounded-xl p-6 mb-4">
      <div class="flex items-center justify-between mb-4">
        <div>
          <div class="text-sm font-bold text-slate-900">Executive Scorecard</div>
          <div class="text-xs text-slate-600">This week's outcome metrics with data confidence and system routing</div>
        </div>
        <div class="text-xs text-slate-500">
          Updated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead class="bg-slate-100">
            <tr>
              <th class="px-4 py-3 text-left font-semibold text-slate-700">Metric</th>
              <th class="px-4 py-3 text-right font-semibold text-slate-700">This Week</th>
              <th class="px-4 py-3 text-right font-semibold text-slate-700">vs Target</th>
              <th class="px-4 py-3 text-center font-semibold text-slate-700">Confidence</th>
              <th class="px-4 py-3 text-left font-semibold text-slate-700">System Routing</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <!-- Row 1: Plan Achievement -->
            <tr class="hover:bg-slate-50">
              <td class="px-4 py-3 font-medium text-slate-900">Plan Achievement</td>
              <td class="px-4 py-3 text-right font-bold text-slate-900">92%</td>
              <td class="px-4 py-3 text-right">
                <span class="inline-block px-2 py-1 bg-red-100 text-red-800 rounded font-semibold">-8%</span>
              </td>
              <td class="px-4 py-3 text-center">
                <span class="inline-block px-2 py-1 bg-green-100 text-green-700 border border-green-300 rounded font-semibold">🟢 HIGH</span>
              </td>
              <td class="px-4 py-3 text-slate-700">
                <div class="font-semibold">Review needed within 48h</div>
                <div class="text-slate-600 mt-0.5">Output gap 11.6k units → check yield + capacity</div>
              </td>
            </tr>

            <!-- Row 2: Commit Fulfillment -->
            <tr class="hover:bg-slate-50">
              <td class="px-4 py-3 font-medium text-slate-900">Commit Fulfillment</td>
              <td class="px-4 py-3 text-right font-bold text-slate-900">95.5%</td>
              <td class="px-4 py-3 text-right">
                <span class="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 rounded font-semibold">-4.5%</span>
              </td>
              <td class="px-4 py-3 text-center">
                <span class="inline-block px-2 py-1 bg-green-100 text-green-700 border border-green-300 rounded font-semibold">🟢 HIGH</span>
              </td>
              <td class="px-4 py-3 text-slate-700">
                <div class="font-semibold">Monitor shipment pacing</div>
                <div class="text-slate-600 mt-0.5">Shipment lag +1.5d → expedite packing if needed</div>
              </td>
            </tr>

            <!-- Row 3: Cost Risk -->
            <tr class="hover:bg-slate-50">
              <td class="px-4 py-3 font-medium text-slate-900">Cost Risk</td>
              <td class="px-4 py-3 text-right font-bold text-slate-900">$45k</td>
              <td class="px-4 py-3 text-right">
                <span class="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 rounded font-semibold">+12%</span>
              </td>
              <td class="px-4 py-3 text-center">
                <span class="inline-block px-2 py-1 bg-yellow-100 text-yellow-700 border border-yellow-300 rounded font-semibold">🟡 MED</span>
              </td>
              <td class="px-4 py-3 text-slate-700">
                <div class="font-semibold">Track but no immediate action</div>
                <div class="text-slate-600 mt-0.5">Overtime + rework costs elevated, watch weekly trend</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-4 p-3 bg-blue-50 border-l-4 border-blue-500 rounded text-xs text-blue-900">
        <strong>How to read:</strong> "System Routing" shows what decision/action the system recommends based on the metric state + confidence level. Red/yellow status triggers routing, not ranking.
      </div>
    </div>

    <!-- Section A: Product Snapshot (NEW) -->
    <div class="bg-white border rounded-xl p-6 mb-4">
      <div class="text-sm font-semibold mb-2">Product Snapshot — Manufacturing Footprint</div>
      <div class="text-xs text-slate-600 mb-4">A stable view of where and how this product is built. Use this to sanity-check capacity and pacing decisions.</div>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <div class="text-xs text-slate-500">FY Volume (EoY)</div>
          <div class="font-semibold text-lg">2.8M units</div>
        </div>
        <div>
          <div class="text-xs text-slate-500">EOM (End of Manufacturing)</div>
          <div class="font-semibold text-lg">2026-11</div>
        </div>
        <div>
          <div class="text-xs text-slate-500">Primary Build Sites</div>
          <div class="font-semibold text-sm">WF (CN), VN-02 (VN)</div>
        </div>
        <div>
          <div class="text-xs text-slate-500">Weekly Capacity (Nominal)</div>
          <div class="font-semibold text-lg">150k / week</div>
        </div>
      </div>

      <div class="mt-4 p-3 bg-slate-50 rounded-lg text-xs">
        <div class="font-semibold mb-2">Lines & UPH</div>
        <div class="grid grid-cols-2 gap-2">
          <div>WF (CN): 3 lines · 110–135 UPH</div>
          <div>VN-02 (VN): 2 lines · 95–120 UPH</div>
        </div>
      </div>

      <div class="mt-3 p-3 bg-amber-50 border-l-2 border-amber-400 rounded text-xs">
        <strong>Notable Constraints:</strong> Test lane shared across SKUs · IC-77 is single-source · Holiday labor availability impacts W05–W07
      </div>

      <div class="text-xs text-slate-500 mt-3">
        Footprint metrics change infrequently; weekly execution signals update daily.
      </div>
    </div>

    <!-- Section B: Weekly Command Summary -->

    <!-- B1: Two Hero KPIs (MOVED UP) -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <div class="bg-white border rounded-xl p-4">
        <div class="text-xs text-slate-500 mb-1">Execution Health</div>
        <div class="flex items-center gap-3">
          <div class="text-3xl font-bold">${kpis?.executionHealth || 62}</div>
          <span class="px-2 py-1 rounded text-xs ${STATUS_COLORS[kpis?.executionHealthStatus || 'YELLOW']}">${kpis?.executionHealthStatus || 'YELLOW'}</span>
        </div>
        <div class="text-xs text-slate-600 mt-2">${kpis?.executionHealthDrivers || 'Yield drift at Test + WIP building above baseline.'}</div>
        ${STATE.prdMode ? '<div class="text-xs text-slate-500 mt-2 italic">Composite score from yield stability, throughput vs plan, rework load, and critical process downtime.</div>' : ''}
      </div>
      <div class="bg-white border rounded-xl p-4">
        <div class="text-xs text-slate-500 mb-1">Inventory & Liability Pressure</div>
        <div class="flex items-center gap-3">
          <div class="text-3xl font-bold">${kpis?.inventoryPressure || 71}</div>
          <span class="px-2 py-1 rounded text-xs ${STATUS_COLORS[kpis?.inventoryPressureStatus || 'YELLOW']}">${kpis?.inventoryPressureStatus || 'YELLOW'}</span>
        </div>
        <div class="text-xs text-slate-600 mt-2">${kpis?.inventoryPressureDrivers || 'FG above target + forecast down-rev risk; watch WIP exposure.'}</div>
        ${STATE.prdMode ? '<div class="text-xs text-slate-500 mt-2 italic">Composite score from FG/WIP/transit exposure, demand signals, and cancel/freeze risk vs manufacturing lead time.</div>' : ''}
      </div>
    </div>

    <!-- B2: This Week's Delivery Commit (Command Card) -->
    <div class="bg-white border rounded-xl p-6 ${COMMIT_HEALTH_COLORS[deliveryCommit.commitHealth]} border-2 mb-4">
      <div class="flex items-center justify-between mb-4">
        <div class="text-sm font-semibold">This Week's Delivery Commit</div>
        <div class="flex items-center gap-2">
          <button onclick="openAIDrawer('home_diagnose_commit', {product: '${deliveryCommit.product}'})" class="flex items-center gap-1 text-xs bg-blue-600 text-white rounded-lg px-3 py-1.5 hover:bg-blue-700">
            <span>🤖</span>
            <span>Diagnose</span>
          </button>
          <button onclick="openAIDrawer('home_recovery_plan')" class="flex items-center gap-1 text-xs bg-green-600 text-white rounded-lg px-3 py-1.5 hover:bg-green-700">
            <span>🤖</span>
            <span>Generate Plan</span>
          </button>
          <button onclick="openAIDrawer('home_leadership_ask', {product: '${deliveryCommit.product}'})" class="flex items-center gap-1 text-xs bg-purple-600 text-white rounded-lg px-3 py-1.5 hover:bg-purple-700">
            <span>📝</span>
            <span>Leadership Ask</span>
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <div class="text-xs text-slate-600">Week / Product / Factory Site</div>
          <div class="font-semibold text-sm">${deliveryCommit.week} / ${deliveryCommit.product} / ${deliveryCommit.factorySite}</div>
        </div>
        <div>
          <div class="text-xs text-slate-600">Commit Health</div>
          <div class="flex items-center gap-2">
            <div class="text-2xl font-bold">${deliveryCommit.commitHealth}</div>
            <div class="text-xs">${deliveryCommit.commitHealthLabel}</div>
          </div>
        </div>
        <div>
          <div class="text-xs text-slate-600">At-risk Units / Confidence</div>
          <div class="text-2xl font-bold">${deliveryCommit.atRiskUnits.toLocaleString()} <span class="text-sm font-normal">/ ${deliveryCommit.confidence}%</span></div>
        </div>
      </div>

      ${deliveryCommit.recoveryActions && deliveryCommit.recoveryActions.length > 0 ? `
        <div class="border-t pt-4 mt-4">
          <div class="text-xs font-semibold text-slate-700 mb-3">Next 48 Hours — Actions That Move the Commit</div>
          <div class="space-y-2">
            ${deliveryCommit.recoveryActions.map((action, i) => `
              <div class="flex items-start gap-3 p-3 bg-white rounded-lg border">
                <div class="flex-shrink-0 w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">${action.priority}</div>
                <div class="flex-1">
                  <div class="text-sm font-semibold">${action.action}</div>
                  <div class="text-xs text-slate-600 mt-1">
                    <span class="font-semibold">Owner:</span> ${action.owner}
                    <span class="mx-2">|</span>
                    <span class="font-semibold">SLA:</span> ${action.sla}
                    <span class="mx-2">|</span>
                    <span class="px-2 py-0.5 rounded ${action.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'}">${action.status.replace('_', ' ')}</span>
                  </div>
                  <div class="text-xs text-green-600 mt-1">
                    <strong>Expected impact:</strong> ${i === 0 ? '+6–10 pts confidence' : i === 1 ? '-2–3 days schedule drift risk' : '-3.5k at-risk units'}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : '<div class="text-sm text-slate-600">✓ No recovery actions needed — commit on track</div>'}

      <div class="border-t pt-3 mt-4 text-xs text-slate-600">
        <strong>Next checkpoint:</strong> ${deliveryCommit.nextCheckpoint}
      </div>
    </div>

    <!-- Section C: Top Delivery Risks (Ranked) -->
    ${topDeliveryRisks.length > 0 ? `
      <div class="bg-white border rounded-xl p-6 mb-4">
        <div class="text-sm font-semibold mb-2">Top Risks (Ranked by Impact × Confidence)</div>
        <div class="text-xs text-slate-600 mb-4">Focus on risks that can break commit or create liability. Each card links to the drivers and recommended routing.</div>

        <div class="space-y-3">
          ${topDeliveryRisks.map((risk, index) => `
            <div class="border rounded-lg p-4 hover:bg-slate-50 cursor-pointer" onclick="openCaseDrawer('${risk.id}')">
              <div class="flex items-start justify-between gap-4">
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-2">
                    <span class="text-xs font-bold text-slate-500">#${index + 1}</span>
                    <span class="text-sm font-semibold">${risk.sku || risk.order} / ${risk.factory} / ${risk.week}</span>
                    <span class="px-2 py-0.5 rounded text-xs ${risk.type === 'LATE' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}">${risk.type}</span>
                  </div>
                  <div class="text-xs text-slate-600 mb-1">
                    <strong>Drivers:</strong> ${risk.driver}
                  </div>
                  <div class="text-xs text-slate-600 mb-2">
                    <strong>Impact:</strong> ${risk.impact}
                  </div>
                  <div class="text-xs bg-green-50 border-l-2 border-green-500 p-2 rounded mb-2">
                    <strong>Suggested:</strong> ${risk.action}
                  </div>
                  <div class="text-xs bg-blue-50 p-2 rounded mb-2">
                    <strong>Why it matters:</strong> ${index === 0 ? 'This is the primary constraint driving commit confidence below GREEN.' : index === 1 ? 'A preventable schedule slip with clear operational levers.' : 'Avoid solving W04 late risk by creating W05+ inventory liability.'}
                  </div>
                  <div class="flex items-center gap-4 mt-2 text-xs text-slate-500">
                    <div><strong>Owner:</strong> ${risk.owner}</div>
                    <div><strong>SLA:</strong> ${risk.sla}</div>
                    <div class="flex items-center gap-1">
                      <span>${ROUTE_ICONS[risk.route]}</span>
                      <span>${risk.route.replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-2xl font-bold">${risk.score}</div>
                  <div class="text-xs text-slate-500">${risk.confidence}% conf</div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}

    <!-- Section D: What-if Simulation (NEW) -->
    ${isSimulation ? `
      <div class="bg-white border rounded-xl p-6 mb-4">
        <div class="text-sm font-semibold mb-2">What-if Simulation — Decision Sandbox</div>
        <div class="text-xs text-slate-600 mb-4">Factory execution is not static. Simulation helps the team test trade-offs (commit vs cost vs liability) before changing pacing.</div>

        ${simResults ? `
          <!-- Simulation Results -->
          <div class="bg-gradient-to-r from-blue-50 to-slate-50 rounded-lg p-4 mb-4">
            <div class="text-xs font-semibold text-slate-700 mb-3">Outcome Comparison (Before → After)</div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <div class="text-xs text-slate-500">Commit confidence</div>
                <div class="font-semibold">${simResults.before.confidence}% → <span class="text-red-600">${simResults.after.confidence}%</span></div>
              </div>
              <div>
                <div class="text-xs text-slate-500">At-risk units</div>
                <div class="font-semibold">${simResults.before.atRiskUnits.toLocaleString()} → <span class="text-red-600">${simResults.after.atRiskUnits.toLocaleString()}</span></div>
              </div>
              ${simResults.after.expediteCost ? `
                <div>
                  <div class="text-xs text-slate-500">Expected expedite cost</div>
                  <div class="font-semibold text-amber-600">+$${(simResults.after.expediteCost / 1000).toFixed(0)}k</div>
                </div>
              ` : ''}
              <div>
                <div class="text-xs text-slate-500">Liability pressure</div>
                <div class="font-semibold">${simResults.before.liabilityPressure} → <span class="${simResults.after.liabilityPressure === 'RED' ? 'text-red-600' : 'text-yellow-600'}">${simResults.after.liabilityPressure}</span></div>
              </div>
            </div>

            <div class="bg-white border-l-4 border-green-500 p-3 rounded">
              <div class="text-xs font-semibold text-slate-700 mb-1">Recommendation</div>
              <div class="text-xs text-slate-600">${simResults.recommendation}</div>
            </div>
          </div>

          <div class="flex gap-2">
            <button onclick="openAIDrawer('simulation_explain_tradeoffs')" class="flex items-center gap-2 text-sm bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg px-4 py-2 hover:from-blue-700 hover:to-purple-700">
              <span>🤖</span>
              <span>AI: Explain Trade-offs</span>
            </button>
            <button onclick="alert('Demo: Would update 48-hour action list based on simulation results')" class="text-sm bg-green-600 text-white rounded-lg px-4 py-2 hover:bg-green-700">Apply to Recovery Plan (Demo)</button>
            <button onclick="STATE.simulationResults = null; render();" class="text-sm border rounded-lg px-4 py-2 hover:bg-slate-50">Reset</button>
          </div>

          <div class="text-xs text-slate-500 mt-3">
            <strong>Demo note:</strong> Numbers are mocked for illustration; the goal is to show decision flow, not model accuracy.
          </div>
        ` : `
          <div class="text-xs text-slate-600 mb-4">
            <strong>Preset selected:</strong> ${$("presetSelect")?.value || 'None'}
          </div>
          <div class="text-sm text-slate-500 text-center py-8">
            Click "Run Simulation" in the top filter bar to test this scenario's impact.
          </div>
        `}
      </div>
    ` : ''}

    <!-- Section E: Case Trace (Collapsible, replaces Today's Loop) -->
    ${todaysLoop ? `
      <details class="bg-white border rounded-xl overflow-hidden mb-4">
        <summary class="p-4 cursor-pointer hover:bg-slate-50">
          <div class="text-sm font-semibold">Case Trace — Why this routed to Human Review</div>
          <div class="text-xs text-slate-500 mt-1">Signals → Drivers → Decision → Actions → Evidence</div>
        </summary>
        <div class="p-4 border-t space-y-4">
          <!-- Case Header -->
          <div class="border rounded-lg p-3 bg-slate-50">
            <div class="text-sm font-bold mb-1">${todaysLoop.caseId}</div>
            <div class="text-xs text-slate-600 mb-2">${todaysLoop.deliveryImpact}</div>
            <div class="flex items-center gap-4 text-xs">
              <div><strong>Late Score:</strong> ${todaysLoop.lateScore}</div>
              <div><strong>Excess Score:</strong> ${todaysLoop.excessScore}</div>
              <div><strong>Confidence:</strong> ${todaysLoop.confidence}%</div>
            </div>
          </div>

          <!-- Signals (Latest) -->
          <div class="border-l-4 border-blue-500 pl-4">
            <div class="text-xs font-semibold text-slate-700 uppercase mb-2">Signals (Latest)</div>
            <ul class="text-xs space-y-1">
              ${todaysLoop.signals.map(s => `<li>• ${s}</li>`).join('')}
            </ul>
          </div>

          <!-- Factory Impact -->
          <div class="border-l-4 border-purple-500 pl-4">
            <div class="text-xs font-semibold text-slate-700 uppercase mb-2">Factory Impact</div>
            <ul class="text-xs space-y-1">
              ${todaysLoop.factoryReality.map(f => `<li>• ${f}</li>`).join('')}
            </ul>
          </div>

          <!-- Decision -->
          <div class="border-l-4 border-orange-500 pl-4">
            <div class="text-xs font-semibold text-slate-700 uppercase mb-2">Decision</div>
            <div class="text-sm font-semibold">Route: ${todaysLoop.decision}</div>
          </div>

          <!-- Actions -->
          <div class="border-l-4 border-green-500 pl-4">
            <div class="text-xs font-semibold text-slate-700 uppercase mb-2">Actions</div>
            <ul class="text-xs space-y-1">
              ${todaysLoop.actions.map(a => `<li>• ${a}</li>`).join('')}
            </ul>
          </div>

          <!-- Evidence & Feedback -->
          <div class="grid grid-cols-2 gap-4">
            <div class="border-l-4 border-slate-500 pl-4">
              <div class="text-xs font-semibold text-slate-700 uppercase">Evidence Pack</div>
              <div class="text-xs">${todaysLoop.evidencePack}</div>
            </div>
            <div class="border-l-4 border-slate-500 pl-4">
              <div class="text-xs font-semibold text-slate-700 uppercase">Feedback</div>
              <div class="text-xs">${todaysLoop.feedback}</div>
            </div>
          </div>
        </div>
      </details>
    ` : ''}

    <!-- Pacing Guardrail -->
    ${pacingGuardrail ? `
      <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
        <div class="text-xs font-semibold text-amber-900 uppercase mb-2">⚠️ Pacing Guardrail (Secondary)</div>
        <div class="text-sm text-amber-900 mb-2">${pacingGuardrail.message}</div>
        <div class="text-xs text-amber-800"><strong>Rule:</strong> ${pacingGuardrail.rule}</div>
      </div>
    ` : ''}

    <!-- ============================================================ -->
    <!-- COMPONENT 2: How We Avoid KPI Theater (Concrete Example) -->
    <!-- ============================================================ -->
    <div class="bg-white border-2 border-blue-200 rounded-xl p-6 mb-4">
      <div class="text-sm font-bold text-slate-900 mb-2">How We Avoid KPI Theater</div>
      <div class="text-xs text-slate-600 mb-4">Red/Yellow is not a score — it's a routing signal. Every colored status must have: Owner, SLA, Evidence, Options, and Expected Impact.</div>

      <div class="bg-gradient-to-r from-blue-50 to-slate-50 border-2 border-blue-300 rounded-lg p-4">
        <div class="text-xs font-semibold text-blue-900 mb-3">Example: Commit Turns Yellow</div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <!-- What Changed -->
          <div>
            <div class="text-xs font-bold text-slate-700 mb-2">📊 What Changed</div>
            <div class="text-xs text-slate-700 space-y-1">
              <div>• CTB short 3 days (IC-77 component)</div>
              <div>• Yield drift: 94.2% → 97.5% target (-3.3%)</div>
              <div>• Test capacity: 87% utilization</div>
            </div>
          </div>

          <!-- System Decision -->
          <div>
            <div class="text-xs font-bold text-slate-700 mb-2">🎯 System Decision</div>
            <div class="text-xs text-slate-700 space-y-1">
              <div>• Route to: <span class="font-semibold">Production Planner</span></div>
              <div>• SLA: <span class="font-semibold">48h review required</span></div>
              <div>• Confidence: <span class="inline-block px-2 py-0.5 bg-green-100 text-green-700 border border-green-300 rounded font-semibold">HIGH</span></div>
            </div>
          </div>
        </div>

        <!-- Evidence Linked -->
        <div class="mb-4">
          <div class="text-xs font-bold text-slate-700 mb-2">🔗 Evidence Linked</div>
          <div class="flex flex-wrap gap-2">
            <button class="text-xs px-3 py-1.5 bg-white border border-slate-300 rounded hover:bg-slate-50 font-semibold">CTB Trend (past 7d)</button>
            <button class="text-xs px-3 py-1.5 bg-white border border-slate-300 rounded hover:bg-slate-50 font-semibold">Yield by Line</button>
            <button class="text-xs px-3 py-1.5 bg-white border border-slate-300 rounded hover:bg-slate-50 font-semibold">Downtime Log</button>
            <button class="text-xs px-3 py-1.5 bg-white border border-slate-300 rounded hover:bg-slate-50 font-semibold">Component Lot #X2401</button>
          </div>
        </div>

        <!-- Options with Expected Impact -->
        <div>
          <div class="text-xs font-bold text-slate-700 mb-2">⚙️ Options (with Expected Impact)</div>
          <div class="space-y-2">
            <div class="flex items-start gap-2 p-2 bg-white border rounded">
              <div class="flex-shrink-0 w-5 h-5 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold">1</div>
              <div class="flex-1">
                <div class="text-xs font-semibold">Rebalance CTB (cross-site transfer)</div>
                <div class="text-xs text-slate-600 mt-0.5">Impact: +800 units, closes 6.8% of gap</div>
              </div>
            </div>
            <div class="flex items-start gap-2 p-2 bg-white border rounded">
              <div class="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">2</div>
              <div class="flex-1">
                <div class="text-xs font-semibold">Add overtime (weekend shift for Test)</div>
                <div class="text-xs text-slate-600 mt-0.5">Impact: +2.8k units, closes 24% of gap, cost +$8k</div>
              </div>
            </div>
            <div class="flex items-start gap-2 p-2 bg-white border rounded">
              <div class="flex-shrink-0 w-5 h-5 rounded-full bg-yellow-600 text-white flex items-center justify-center text-xs font-bold">3</div>
              <div class="flex-1">
                <div class="text-xs font-semibold">Freeze pull (delay lower-priority SKUs)</div>
                <div class="text-xs text-slate-600 mt-0.5">Impact: +4.2k units W04 recovery, pushes 4.2k to W05 (liability risk)</div>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-4 p-3 bg-green-50 border-l-4 border-green-500 rounded text-xs">
          <strong>Result:</strong> Expected impact: +4.8k ship recovery in W04 if Option 1+2 approved by Production Director within 24h.
        </div>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- COMPONENT 3: Metric Standardization Snapshot -->
    <!-- ============================================================ -->
    <div class="bg-white border-2 border-slate-200 rounded-xl p-6 mb-4">
      <div class="text-sm font-bold text-slate-900 mb-2">Unified Metric Index: 8 Core Metrics</div>
      <div class="text-xs text-slate-600 mb-4">We standardized metric definitions across 8 metrics that matter for decision-making. This prevents "my number vs your number" debates and enables automated routing.</div>

      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead class="bg-slate-100">
            <tr>
              <th class="px-3 py-2 text-left font-semibold text-slate-700">Metric (Plain Language)</th>
              <th class="px-3 py-2 text-center font-semibold text-slate-700">Grain</th>
              <th class="px-3 py-2 text-center font-semibold text-slate-700">Source</th>
              <th class="px-3 py-2 text-center font-semibold text-slate-700">Refresh</th>
              <th class="px-3 py-2 text-left font-semibold text-slate-700">Confidence Rule</th>
              <th class="px-3 py-2 text-left font-semibold text-slate-700">Decision Usage</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <!-- Row 1 -->
            <tr class="hover:bg-slate-50">
              <td class="px-3 py-2 font-medium">Plan Achievement Rate</td>
              <td class="px-3 py-2 text-center text-slate-600">Program×Week</td>
              <td class="px-3 py-2 text-center text-slate-600">Planning+MES</td>
              <td class="px-3 py-2 text-center text-slate-600">Daily</td>
              <td class="px-3 py-2 text-slate-600">Fresh <24h & coverage >95%</td>
              <td class="px-3 py-2 text-slate-600">Routes to planning review when below target</td>
            </tr>

            <!-- Row 2 -->
            <tr class="hover:bg-slate-50">
              <td class="px-3 py-2 font-medium">Material Availability</td>
              <td class="px-3 py-2 text-center text-slate-600">Site×Day</td>
              <td class="px-3 py-2 text-center text-slate-600">WMS</td>
              <td class="px-3 py-2 text-center text-slate-600">Daily</td>
              <td class="px-3 py-2 text-slate-600">Fresh <12h & coverage >98%</td>
              <td class="px-3 py-2 text-slate-600">Caps daily input in constrained mode</td>
            </tr>

            <!-- Row 3 -->
            <tr class="hover:bg-slate-50">
              <td class="px-3 py-2 font-medium">First Pass Yield</td>
              <td class="px-3 py-2 text-center text-slate-600">Line×Shift×Day</td>
              <td class="px-3 py-2 text-center text-slate-600">MES</td>
              <td class="px-3 py-2 text-center text-slate-600">Daily</td>
              <td class="px-3 py-2 text-slate-600">Fresh <6h & coverage >95%</td>
              <td class="px-3 py-2 text-slate-600">Explains output gap, triggers quality action</td>
            </tr>

            <!-- Row 4 -->
            <tr class="hover:bg-slate-50">
              <td class="px-3 py-2 font-medium">Capacity Utilization</td>
              <td class="px-3 py-2 text-center text-slate-600">Site×Week</td>
              <td class="px-3 py-2 text-center text-slate-600">Planning+MES</td>
              <td class="px-3 py-2 text-center text-slate-600">Daily</td>
              <td class="px-3 py-2 text-slate-600">Fresh <24h & coverage >90%</td>
              <td class="px-3 py-2 text-slate-600">Identifies bottleneck lines for rebalancing</td>
            </tr>

            <!-- Row 5 -->
            <tr class="hover:bg-slate-50">
              <td class="px-3 py-2 font-medium">Commit Fulfillment Rate</td>
              <td class="px-3 py-2 text-center text-slate-600">Program×Week</td>
              <td class="px-3 py-2 text-center text-slate-600">OMS+Shipping</td>
              <td class="px-3 py-2 text-center text-slate-600">12h</td>
              <td class="px-3 py-2 text-slate-600">Fresh <24h & reconciled with OMS</td>
              <td class="px-3 py-2 text-slate-600">Triggers customer escalation if below threshold</td>
            </tr>

            <!-- Row 6 -->
            <tr class="hover:bg-slate-50">
              <td class="px-3 py-2 font-medium">Cost Risk (Extra Cost %)</td>
              <td class="px-3 py-2 text-center text-slate-600">Site×Month</td>
              <td class="px-3 py-2 text-center text-slate-600">Finance+MES</td>
              <td class="px-3 py-2 text-center text-slate-600">Weekly</td>
              <td class="px-3 py-2 text-slate-600">Fresh <72h & reconciled with actuals</td>
              <td class="px-3 py-2 text-slate-600">Routes to finance review when above budget</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-4 p-3 bg-amber-50 border-l-4 border-amber-500 rounded text-xs text-amber-900">
        <strong>Why this matters:</strong> Without unified definitions, each team uses their own calculation logic. This creates "my number vs your number" debates that delay decisions. Unified metrics = one source of truth = faster routing.
      </div>
    </div>
  `;

  $("content").innerHTML = html;
}

// ========================================
// NEW PROGRAM PAGES
// ========================================

// Helper function to get current week's Monday 8am
function getWeekMondayCutoff() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust if Sunday
  const monday = new Date(now.setDate(diff));
  monday.setHours(8, 0, 0, 0);

  // Format: "Jan 20, 2026 8:00 AM"
  const options = { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true };
  return monday.toLocaleString('en-US', options);
}

// 1. Delivery Command Center (v3.0 with Decision Inbox)
// NOTE: This old version is replaced by command_center_new.js
// Commented out to use the new "Weekly Commit Brief" version
/*
function renderDeliveryCommandCenter() {
  const cutoffTime = getWeekMondayCutoff();

  // ============================================================
  // STEP 1: Generate metrics from Production Plan
  // ============================================================
  let metrics = {};
  let decisionCards = [];
  let confidenceResults = {};

  if (window.productionPlanState && window.productionPlanState.planResults) {
    metrics = calculateMetricsFromPlan(
      window.productionPlanState.planResults.dailyDetails,
      window.productionPlanState.engine?.state || {}
    );

    // Calculate confidence for all metrics
    confidenceResults = calculateBatchConfidence(metrics);

    // Evaluate routing rules to generate decision cards
    decisionCards = evaluateRoutingRules(metrics, {
      date: new Date(),
      isHoliday: false,
      ramp_day_index: 10 // Example
    });

    // Store in global state for other components to access
    window.commandCenterState = {
      latestMetrics: metrics,
      latestDecisionCards: decisionCards,
      latestConfidence: confidenceResults,
      featureEnabled: true
    };

    console.log('[Delivery Command Center] Generated:', {
      metricsCount: Object.keys(metrics).length,
      decisionCardsCount: decisionCards.length,
      confidenceResults
    });
  } else {
    console.warn('[Delivery Command Center] No production plan data available - using example data');

    // Provide example metrics for Decision Chain visualization
    metrics = {
      mps_attainment: {
        value: 0.92,
        threshold: 0.85,
        gap_qty: 11600,
        status: 'at_risk',
        data_snapshot: {
          age_hours: 2,
          coverage_pct: 98,
          reconciliation_status: 'matched'
        }
      },
      ctb: {
        value: 5.2,
        threshold: 5.0,
        status: 'on_track',
        days_cover: 5.2,
        shortage_components: [],
        data_snapshot: {
          age_hours: 4,
          coverage_pct: 95,
          reconciliation_status: 'matched'
        }
      },
      capacity: {
        value: 0.87,
        threshold: 0.90,
        status: 'on_track',
        utilization: 0.87,
        data_snapshot: {
          age_hours: 6,
          coverage_pct: 100,
          reconciliation_status: 'matched'
        }
      },
      yield: {
        value: 0.942,
        threshold: 0.975,
        status: 'at_risk',
        drift_pct: -3.3,
        scrap_qty: 1200,
        data_snapshot: {
          age_hours: 3,
          coverage_pct: 98,
          reconciliation_status: 'matched'
        }
      },
      shipment_readiness: {
        value: 3.2,
        threshold: 5.0,
        status: 'at_risk',
        days_cover: 3.2,
        at_risk_orders: 15,
        data_snapshot: {
          age_hours: 8,
          coverage_pct: 92,
          reconciliation_status: 'matched'
        }
      },
      service_level: {
        value: 0.955,
        threshold: 1.00,
        status: 'at_risk',
        late_orders: 12,
        data_snapshot: {
          age_hours: 12,
          coverage_pct: 90,
          reconciliation_status: 'partial'
        }
      }
    };

    confidenceResults = calculateBatchConfidence(metrics);

    // Generate decision cards from example metrics
    decisionCards = evaluateRoutingRules(metrics, {
      date: new Date(),
      isHoliday: false,
      ramp_day_index: 10
    });
  }

  // ============================================================
  // STEP 2: Decision Inbox is now inlined in main layout below
  // ============================================================

  // ============================================================
  // STEP 3: Render Decision Chain Widget
  // ============================================================
  const focusMetric = metrics['mps_attainment'] || null;
  const decisionChainHTML = renderDecisionChain(metrics, focusMetric);

  // ============================================================
  // STEP 4: Render main page
  // ============================================================
  const html = `
    <!-- Header: Simplified -->
    <div class="bg-white border-2 border-slate-300 rounded-xl p-5 mb-6 shadow-sm">
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <div class="text-xl font-bold text-slate-900 mb-2">Delivery Command Center — Decision routing for weekly commit</div>
          <div class="text-sm text-slate-600 leading-relaxed">What decision is needed, by whom, by when, based on what evidence, and what happens if we act?</div>
        </div>
        <div class="text-right">
          <div class="text-xs text-slate-500 font-semibold uppercase tracking-wide">Scope</div>
          <div class="text-base font-bold text-slate-900 mt-1">Product A · 2026-W04</div>
          <div class="text-xs text-slate-500 mt-1.5">Cut-off: ${cutoffTime}</div>
        </div>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- PRIMARY: Decision Inbox + At-a-Glance (60% of first screen) -->
    <!-- ============================================================ -->
    <div class="grid grid-cols-3 gap-5 mb-6">
      <!-- LEFT: Decision Inbox (占2列 = 66%) -->
      <div class="col-span-2">
        <div class="bg-white border-2 border-blue-200 rounded-xl p-6">
          <div class="flex items-center justify-between mb-4">
            <div>
              <div class="text-lg font-bold text-slate-900">Decisions Due (48h)</div>
              <div class="text-xs text-slate-600 mt-1">Every decision shows: What / Why now / Impact / Owner+SLA / Actions</div>
            </div>
            <div class="text-xs text-slate-500">
              ${decisionCards.length} total decisions
            </div>
          </div>

          ${decisionCards.length > 0 ? `
            <div class="space-y-5">
              ${decisionCards.slice(0, 3).map((card, idx) => `
                <div class="border-2 ${card.priority === 'high' ? 'border-red-300 bg-red-50' : card.priority === 'medium' ? 'border-yellow-300 bg-yellow-50' : 'border-blue-300 bg-blue-50'} rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <!-- Header -->
                  <div class="flex items-center gap-3 mb-4">
                    <span class="text-lg font-bold text-slate-400">#${idx + 1}</span>
                    <span class="text-base font-bold text-slate-900 flex-1">${card.title || 'Decision needed'}</span>
                    <span class="px-3 py-1 rounded-full text-xs font-bold ${card.priority === 'high' ? 'bg-red-200 text-red-900' : card.priority === 'medium' ? 'bg-yellow-200 text-yellow-900' : 'bg-blue-200 text-blue-900'}">
                      ${card.priority.toUpperCase()}
                    </span>
                  </div>

                  <!-- Why now + Impact (grid) -->
                  <div class="grid grid-cols-2 gap-4 mb-4 pb-4 border-b-2 border-slate-200">
                    <div class="space-y-1.5">
                      <div class="text-xs font-bold text-slate-700 uppercase tracking-wide">Why now</div>
                      <div class="text-sm text-slate-800 leading-relaxed">${card.description || 'Trigger detected'}</div>
                      <div class="text-xs text-slate-600">Confidence: <span class="font-bold ${card.confidence?.level === 'HIGH' ? 'text-green-600' : card.confidence?.level === 'MEDIUM' ? 'text-yellow-600' : 'text-red-600'}">${card.confidence?.level || 'HIGH'}</span></div>
                    </div>
                    <div class="space-y-1.5">
                      <div class="text-xs font-bold text-slate-700 uppercase tracking-wide">Impact</div>
                      <div class="text-sm text-slate-800 leading-relaxed">${card.impact_statement || 'Units at risk'}</div>
                      <div class="text-xs text-slate-600">SLA: <span class="font-bold ${card.sla_hours <= 24 ? 'text-red-600' : 'text-slate-600'}">${card.sla_hours}h</span></div>
                    </div>
                  </div>

                  <!-- Owner + Actions -->
                  <div class="flex items-center justify-between gap-3">
                    <div class="text-sm text-slate-700">
                      <span class="font-semibold">Owner:</span> <span class="text-slate-900 font-medium">${card.decision_owner || 'Unassigned'}</span>
                    </div>
                    <div class="flex gap-2 flex-wrap justify-end">
                      ${card.suggested_actions?.slice(0, 3).map(action => `
                        <button onclick="executeAction('${card.card_id}', '${action.action_id}')" class="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-lg border border-slate-300 shadow-sm transition-all">
                          ${action.label.split(' ').slice(0, 2).join(' ')}
                        </button>
                      `).join('') || `
                        <button class="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all">
                          Open Plan
                        </button>
                      `}
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : `
            <div class="bg-white border-2 border-green-300 rounded-lg p-8 text-center">
              <div class="text-4xl mb-3">✅</div>
              <div class="text-sm font-bold text-green-900 mb-2">No Decisions Due</div>
              <div class="text-xs text-green-700">All metrics within target. Continue monitoring for changes.</div>
            </div>
          `}
        </div>
      </div>

      <!-- RIGHT: This Week at a Glance (占1列 = 33%) -->
      <div class="col-span-1">
        <div class="bg-white border-2 border-slate-200 rounded-xl p-5 shadow-sm">
          <div class="text-sm font-bold text-slate-900 mb-1">This Week at a Glance</div>
          <div class="text-xs text-slate-500 mb-4">3 outcome metrics only</div>

          <div class="space-y-4">
            <!-- Plan Achievement -->
            <div class="border-b-2 border-slate-100 pb-4">
              <div class="flex items-start gap-3">
                <div class="w-3 h-3 rounded-full mt-1 ${metrics.mps_attainment?.status === 'at_risk' ? 'bg-red-500' : 'bg-green-500'} shadow-sm"></div>
                <div class="flex-1">
                  <div class="text-xs font-bold text-slate-900 uppercase tracking-wide">Plan Achievement</div>
                  <div class="text-lg font-bold text-slate-900 mt-1">${metrics.mps_attainment ? (metrics.mps_attainment.value * 100).toFixed(1) : '92.0'}%</div>
                  <div class="text-xs text-slate-600 mt-1.5">Gap: ${metrics.mps_attainment?.gap_qty?.toLocaleString() || '11,600'} units</div>
                  <div class="text-xs text-slate-500 mt-2">Confidence: <span class="font-bold ${confidenceResults.mps_attainment?.level === 'HIGH' ? 'text-green-600' : 'text-yellow-600'}">${confidenceResults.mps_attainment?.level || 'HIGH'}</span></div>
                </div>
              </div>
            </div>

            <!-- Commit Fulfillment -->
            <div class="border-b-2 border-slate-100 pb-4">
              <div class="flex items-start gap-3">
                <div class="w-3 h-3 rounded-full mt-1 ${metrics.service_level?.status === 'at_risk' ? 'bg-yellow-500' : 'bg-green-500'} shadow-sm"></div>
                <div class="flex-1">
                  <div class="text-xs font-bold text-slate-900 uppercase tracking-wide">Commit Fulfillment</div>
                  <div class="text-lg font-bold text-slate-900 mt-1">${metrics.service_level ? (metrics.service_level.value * 100).toFixed(1) : '95.5'}%</div>
                  <div class="text-xs text-slate-600 mt-1.5">${metrics.service_level?.late_orders || 12} orders at risk</div>
                  <div class="text-xs text-slate-500 mt-2">Confidence: <span class="font-bold ${confidenceResults.service_level?.level === 'HIGH' ? 'text-green-600' : 'text-yellow-600'}">${confidenceResults.service_level?.level || 'HIGH'}</span></div>
                </div>
              </div>
            </div>

            <!-- Cost Risk -->
            <div>
              <div class="flex items-start gap-3">
                <div class="w-3 h-3 rounded-full mt-1 bg-yellow-500 shadow-sm"></div>
                <div class="flex-1">
                  <div class="text-xs font-bold text-slate-900 uppercase tracking-wide">Cost Risk</div>
                  <div class="text-lg font-bold text-slate-900 mt-1">$45k</div>
                  <div class="text-xs text-slate-600 mt-1.5">Extra cost: +12%</div>
                  <div class="text-xs text-slate-500 mt-2">Confidence: <span class="font-bold text-yellow-600">MED</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- SECONDARY: Why This Is At Risk (Decision Chain - simplified) -->
    <!-- ============================================================ -->
    ${decisionChainHTML}

    <!-- Product Snapshot -->
    <div class="bg-white border rounded-xl p-6 mb-4">
      <div class="text-lg font-bold text-slate-900 mb-3">Product Snapshot — Manufacturing Footprint</div>
      <div class="text-sm text-slate-600 mb-5">A stable view of where and how this product is built. Use this to sanity-check capacity and pacing decisions.</div>

      <!-- Two-column cutoff view -->
      <div class="grid grid-cols-2 gap-6 mb-5">
        <!-- This Week Cutoff (W04) -->
        <div class="border-2 border-blue-200 bg-blue-50 rounded-xl p-4">
          <div class="text-sm font-bold text-blue-900 mb-3">Cut-off: This Week (W04 — Sat Jan 25, 2026)</div>
          <div class="space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-xs text-slate-700">Cum Forecast</span>
              <span class="text-base font-bold text-slate-900">580k units</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-xs text-slate-700">Cum Capacity</span>
              <span class="text-base font-bold text-slate-900">600k units</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-xs text-slate-700">Cum CTB</span>
              <span class="text-base font-bold text-slate-900">575k units</span>
            </div>
            <div class="flex justify-between items-center border-t pt-2 mt-2">
              <span class="text-xs text-slate-700">Cum Ship (+2WD)</span>
              <span class="text-base font-bold text-blue-700">534k units</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-xs text-slate-700">Gap vs Forecast</span>
              <span class="text-base font-bold text-red-700">-46k units</span>
            </div>
          </div>
        </div>

        <!-- Year End Cutoff (2026) -->
        <div class="border-2 border-slate-200 bg-slate-50 rounded-xl p-4">
          <div class="text-sm font-bold text-slate-900 mb-3">Cut-off: Year End (Dec 31, 2026)</div>
          <div class="space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-xs text-slate-700">Cum Forecast</span>
              <span class="text-base font-bold text-slate-900">2.8M units</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-xs text-slate-700">Cum Capacity</span>
              <span class="text-base font-bold text-slate-900">2.9M units</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-xs text-slate-700">Cum CTB</span>
              <span class="text-base font-bold text-slate-900">2.7M units</span>
            </div>
            <div class="flex justify-between items-center border-t pt-2 mt-2">
              <span class="text-xs text-slate-700">Cum Ship (+2WD)</span>
              <span class="text-base font-bold text-blue-700">2.6M units</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-xs text-slate-700">Gap vs Forecast</span>
              <span class="text-base font-bold text-red-700">-200k units</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Build Sites & Capacity -->
      <div class="bg-slate-50 border rounded-lg p-4 mb-4">
        <div class="text-xs font-semibold text-slate-700 mb-3">Build Sites & Capacity</div>
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div class="font-semibold text-slate-900">WF (CN): 3 lines</div>
            <div class="text-xs text-slate-600">110–135 UPH · 95–120k/week</div>
          </div>
          <div>
            <div class="font-semibold text-slate-900">VN-02 (VN): 2 lines</div>
            <div class="text-xs text-slate-600">95–120 UPH · 96–120k/week</div>
          </div>
        </div>
      </div>

      <div class="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <div class="text-xs font-semibold text-amber-900 mb-1">Notable Constraints:</div>
        <div class="text-sm text-amber-800">Test lane shared across SKUs · IC-77 is single-source · Holiday labor availability impacts W05–W07</div>
      </div>

      <div class="text-xs text-slate-500 mt-3">Footprint metrics change infrequently; weekly execution signals update daily.</div>
    </div>

    <!-- ============================================================ -->
    <!-- Evidence Panel (5 key drivers only, compact) -->
    <!-- ============================================================ -->
    <div class="bg-white border-2 border-slate-200 rounded-xl p-6 shadow-sm">
      <div class="flex items-center justify-between mb-5">
        <div>
          <div class="text-base font-bold text-slate-900">Evidence: What's constraining this week</div>
          <div class="text-xs text-slate-600 mt-1.5">Max 5 drivers · 3 bullets + 1 action per driver</div>
        </div>
        <div class="text-sm text-slate-600">Binding constraint: <span class="font-bold text-red-700">Yield</span></div>
      </div>

      <div class="space-y-4">
        <!-- Driver 1: CTB (OK) -->
        <div class="border-2 rounded-xl p-4 bg-green-50 border-green-300 shadow-sm min-h-[140px] flex">
          <div class="flex items-start gap-4 w-full">
            <div class="flex-shrink-0 w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold shadow-md">✓</div>
            <div class="flex-1">
              <div class="text-sm font-bold text-slate-900 mb-2.5">📦 Material Availability (CTB)</div>
              <div class="text-sm text-slate-700 space-y-1.5 mb-3">
                <div class="flex items-start gap-2"><span class="text-green-600 font-bold">•</span><span>Coverage: 98% (1.85M units available)</span></div>
                <div class="flex items-start gap-2"><span class="text-green-600 font-bold">•</span><span>Confidence: HIGH (updated 4h ago)</span></div>
                <div class="flex items-start gap-2"><span class="text-green-600 font-bold">•</span><span>Not constraining this week</span></div>
              </div>
              <div class="text-sm text-green-800 font-bold bg-white border-2 border-green-400 rounded-lg px-3 py-2">✓ No action needed</div>
            </div>
          </div>
        </div>

        <!-- Driver 2: Yield (BINDING CONSTRAINT) -->
        <div class="border-2 rounded-xl p-4 bg-red-50 border-red-400 shadow-md min-h-[140px] flex">
          <div class="flex items-start gap-4 w-full">
            <div class="flex-shrink-0 w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center text-lg font-bold shadow-md">⚠️</div>
            <div class="flex-1">
              <div class="text-sm font-bold text-slate-900 mb-2.5">🎯 First Pass Yield · <span class="text-red-700 uppercase text-xs tracking-wide">BINDING TODAY</span></div>
              <div class="text-sm text-slate-700 space-y-1.5 mb-3">
                <div class="flex items-start gap-2"><span class="text-red-600 font-bold">•</span><span>Current: 94.2% vs target 97.5% (-3.3%)</span></div>
                <div class="flex items-start gap-2"><span class="text-red-600 font-bold">•</span><span>Impact: ~4.8k units scrapped/reworked → causes 11.6k output gap</span></div>
                <div class="flex items-start gap-2"><span class="text-red-600 font-bold">•</span><span>Top 3 failure codes: AC-401 (45%), DC-203 (30%), FN-105 (25%)</span></div>
              </div>
              <div class="text-sm bg-white border-2 border-red-500 rounded-lg px-3 py-2 font-bold text-red-900">⚡ Quarantine Lot #X2401 + fast-track ECN for AC-401 fix by W05</div>
            </div>
          </div>
        </div>

        <!-- Driver 3: Capacity (Moderate) -->
        <div class="border-2 rounded-xl p-4 bg-yellow-50 border-yellow-300 shadow-sm min-h-[140px] flex">
          <div class="flex items-start gap-4 w-full">
            <div class="flex-shrink-0 w-10 h-10 rounded-full bg-yellow-500 text-white flex items-center justify-center text-sm font-bold shadow-md">!</div>
            <div class="flex-1">
              <div class="text-sm font-bold text-slate-900 mb-2.5">🏭 Test Capacity</div>
              <div class="text-sm text-slate-700 space-y-1.5 mb-3">
                <div class="flex items-start gap-2"><span class="text-yellow-600 font-bold">•</span><span>Utilization: 87% (constrained)</span></div>
                <div class="flex items-start gap-2"><span class="text-yellow-600 font-bold">•</span><span>Re-test queue: 2.8k units</span></div>
                <div class="flex items-start gap-2"><span class="text-yellow-600 font-bold">•</span><span>Contributing to output gap (not primary driver)</span></div>
              </div>
              <div class="text-sm bg-white border-2 border-yellow-400 rounded-lg px-3 py-2 font-bold text-yellow-900">→ Add weekend shift + reallocate 20% capacity</div>
            </div>
          </div>
        </div>

        <!-- Driver 4: Shipment Readiness (Moderate) -->
        <div class="border-2 rounded-xl p-4 bg-yellow-50 border-yellow-300 shadow-sm min-h-[140px] flex">
          <div class="flex items-start gap-4 w-full">
            <div class="flex-shrink-0 w-10 h-10 rounded-full bg-yellow-500 text-white flex items-center justify-center text-sm font-bold shadow-md">!</div>
            <div class="flex-1">
              <div class="text-sm font-bold text-slate-900 mb-2.5">🚚 Shipment Readiness</div>
              <div class="text-sm text-slate-700 space-y-1.5 mb-3">
                <div class="flex items-start gap-2"><span class="text-yellow-600 font-bold">•</span><span>Current: 132.6k shipped vs 139k commit (95.5%)</span></div>
                <div class="flex items-start gap-2"><span class="text-yellow-600 font-bold">•</span><span>Packing bottleneck: +1.5d lead-time variance</span></div>
                <div class="flex items-start gap-2"><span class="text-yellow-600 font-bold">•</span><span>WH space: 94% utilization (nearing capacity)</span></div>
              </div>
              <div class="text-sm bg-white border-2 border-yellow-400 rounded-lg px-3 py-2 font-bold text-yellow-900">→ Dual-shift packing + prioritize high-priority SKUs</div>
            </div>
          </div>
        </div>

        <!-- Driver 5: Data Confidence (OK) -->
        <div class="border-2 rounded-xl p-4 bg-green-50 border-green-300 shadow-sm min-h-[140px] flex">
          <div class="flex items-start gap-4 w-full">
            <div class="flex-shrink-0 w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold shadow-md">✓</div>
            <div class="flex-1">
              <div class="text-sm font-bold text-slate-900 mb-2.5">📊 Data Confidence</div>
              <div class="text-sm text-slate-700 space-y-1.5 mb-3">
                <div class="flex items-start gap-2"><span class="text-green-600 font-bold">•</span><span>All metrics: HIGH confidence (updated <8h ago)</span></div>
                <div class="flex items-start gap-2"><span class="text-green-600 font-bold">•</span><span>Coverage: >95% across all tables</span></div>
                <div class="flex items-start gap-2"><span class="text-green-600 font-bold">•</span><span>Not limiting decision quality</span></div>
              </div>
              <div class="text-sm text-green-800 font-bold bg-white border-2 border-green-400 rounded-lg px-3 py-2">✓ Data quality supports routing</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  $("content").innerHTML = html;
}
*/

// 2. Production Plan
function renderProductionPlan() {
  //Initialize production plan state if not exists
  if (!window.productionPlanState) {
    window.productionPlanState = {
      program: 'product_a',
      site: 'all',
      startDate: '2026-01-20',
      endDate: '2026-12-31',
      mode: 'unconstrained',
      planResults: null,
      engine: null,
      activeSubpage: 'latest' // 'latest' or 'generate'
    };
  }

  const state = window.productionPlanState;

  // Render based on active subpage
  if (state.activeSubpage === 'generate') {
    renderProductionPlanGenerate();
    return;
  }

  // Default: render Latest Production Plan
  renderProductionPlanLatest();
}

// 2.1 Latest Production Plan (read-only view)
function renderProductionPlanLatest() {
  const state = window.productionPlanState;

  console.log('[Render] renderProductionPlanLatest called. State:', {
    mode: state.mode,
    hasPlanResults: !!state.planResults,
    planResultsType: state.planResults ? (state.planResults.mode || 'normal') : 'none'
  });

  //Initialize engine with seed data if not exists
  if (!state.engine) {
    state.engine = new ProductionPlanEngine(PRODUCTION_PLAN_SEED_DATA);
  }

  // Generate plan(s) if not yet generated or mode changed
  let needsRegeneration = false;

  if (!state.planResults) {
    console.log('[Render] No planResults, needs regeneration');
    needsRegeneration = true;
  } else if (state.mode === 'combined') {
    // If current mode is combined but planResults is not combined structure
    needsRegeneration = !state.planResults.mode || state.planResults.mode !== 'combined';
    console.log('[Render] Combined mode check:', { needsRegeneration, hasMode: !!state.planResults.mode });
  } else {
    // If current mode is not combined but planResults has combined structure
    needsRegeneration = state.planResults.mode === 'combined';
    console.log('[Render] Non-combined mode check:', { needsRegeneration, isCombinedStructure: state.planResults.mode === 'combined' });
  }

  if (needsRegeneration) {
    console.log('[Render] Regenerating plan for mode:', state.mode);
    try {
      if (state.mode === 'combined') {
        // Generate both unconstrained and constrained plans
        const unconstrainedPlan = state.engine.generatePlan(state.startDate, state.endDate, 'unconstrained');
        const constrainedPlan = state.engine.generatePlan(state.startDate, state.endDate, 'constrained');

        // Validate plans
        if (!unconstrainedPlan || !unconstrainedPlan.programResults || !unconstrainedPlan.weeklyMetrics) {
          console.error('[Render] Unconstrained plan validation failed:', unconstrainedPlan);
          throw new Error('Unconstrained plan generation failed');
        }
        if (!constrainedPlan || !constrainedPlan.programResults || !constrainedPlan.weeklyMetrics) {
          console.error('[Render] Constrained plan validation failed:', constrainedPlan);
          throw new Error('Constrained plan generation failed');
        }

        state.planResults = {
          unconstrained: unconstrainedPlan,
          constrained: constrainedPlan,
          mode: 'combined'
        };
        console.log('[Render] Combined plans generated successfully');
      } else {
        const plan = state.engine.generatePlan(state.startDate, state.endDate, state.mode);

        // Validate plan
        if (!plan || !plan.programResults || !plan.weeklyMetrics) {
          console.error('[Render] Plan validation failed:', plan);
          throw new Error('Plan generation failed - missing required data');
        }

        console.log('[Render] Plan generated:', {
          programResultsLength: plan.programResults.length,
          weeklyMetricsLength: plan.weeklyMetrics.length
        });

        state.planResults = plan;
      }
    } catch (error) {
      console.error('[Render] Error during plan generation:', error);
      showNotification('❌ Error generating plan: ' + error.message, 'error');
      // Set empty structure to prevent further errors
      state.planResults = {
        programResults: [],
        weeklyMetrics: []
      };
    }
  }

  const isCombinedMode = state.planResults && state.planResults.mode === 'combined';
  const results = isCombinedMode ? state.planResults.unconstrained : state.planResults;
  const resultsConstrained = isCombinedMode ? state.planResults.constrained : null;

  console.log('[Render] Prepared results:', {
    isCombinedMode,
    hasResults: !!results,
    hasProgramResults: !!(results && results.programResults),
    hasWeeklyMetrics: !!(results && results.weeklyMetrics)
  });

  const weeklyMetrics = (results && results.weeklyMetrics) ? results.weeklyMetrics : [];

  // Determine current granularity (default: daily)
  const granularity = state.viewGranularity || 'daily';

  // Get the month to display - use the start date of the plan
  // Extract YYYY-MM from state.startDate (e.g., "2026-10-01" -> "2026-10")
  const planStartMonth = state.startDate ? state.startDate.substring(0, 7) : null;

  console.log('[Render] Display month:', planStartMonth, 'from startDate:', state.startDate);

  // Get data based on granularity and filter to plan start month
  let currentData = [];
  if (results && results.programResults) {
    if (granularity === 'weekly') {
      // For weekly view, filter weeks that fall within the plan start month
      currentData = planStartMonth
        ? weeklyMetrics.filter(w => w.week_id && w.week_id.substring(0, 7) === planStartMonth)
        : weeklyMetrics;
    } else if (granularity === 'monthly') {
      // For monthly view, filter months matching the plan start month
      const monthlyData = aggregateByMonth(results.programResults);
      currentData = planStartMonth
        ? monthlyData.filter(m => m.month_id === planStartMonth)
        : monthlyData;
    } else {
      // Daily view - show only plan start month
      currentData = planStartMonth
        ? results.programResults.filter(d => d.date && d.date.substring(0, 7) === planStartMonth)
        : results.programResults;
    }

    console.log('[Render] Filtered data:', {
      granularity,
      totalResults: results.programResults.length,
      filteredCount: currentData.length
    });
  }

  // Calculate summary metrics for two cutoff dates
  const thisWeekSaturday = '2026-01-25'; // This week Saturday (W04)
  const yearEnd = '2026-12-31'; // Year end

  const weekSummary = results && results.programResults ?
    calculateCutoffSummary(results.programResults, thisWeekSaturday) :
    { cumForecast: 0, cumCTB: 0, cumCapacity: 0, cumShip: 0, gap: 0 };
  const yearSummary = results && results.programResults ?
    calculateCutoffSummary(results.programResults, yearEnd) :
    { cumForecast: 0, cumCTB: 0, cumCapacity: 0, cumShip: 0, gap: 0 };

  // Analyze primary constraint
  const constraintAnalysis = results && results.programResults ?
    analyzePrimaryConstraint(results.programResults) :
    { primaryConstraint: 'Mixed', ctbLimitedDays: 0, capacityLimitedDays: 0, ctbLimitedUnits: 0, capacityLimitedUnits: 0, ctbLimitedPct: '0', capacityLimitedPct: '0' };

  const html = `
    <div class="space-y-6">
      <!-- Subpage Navigation -->
      <div class="bg-white border rounded-xl p-4">
        <div class="flex gap-2">
          <button onclick="switchProductionPlanSubpage('latest')"
                  class="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold">
            📊 Latest Production Plan
          </button>
          <button onclick="switchProductionPlanSubpage('generate')"
                  class="px-4 py-2 rounded-lg border hover:bg-slate-50 text-slate-700">
            ⚙️ Generate Report
          </button>
        </div>
      </div>

      <!-- Context Header (Simplified) -->
      <div class="bg-white border rounded-xl p-4">
        <div class="flex items-center justify-between flex-wrap gap-3">
          <div class="flex items-center gap-4">
            <div>
              <div class="text-xs text-slate-600 mb-1">Program</div>
              <div class="font-semibold text-slate-900">Product A</div>
            </div>
            <div class="border-l pl-4">
              <div class="text-xs text-slate-600 mb-1">Date Range</div>
              <div class="font-semibold text-slate-900">${state.startDate} to ${state.endDate}</div>
            </div>
            <div class="border-l pl-4">
              <div class="text-xs text-slate-600 mb-1">Sites</div>
              <div class="font-semibold text-slate-900">${state.site === 'all' ? 'All Sites' : state.site}</div>
            </div>
            <div class="border-l pl-4">
              <div class="text-xs text-slate-600 mb-1">Last Updated</div>
              <div class="font-semibold text-slate-900">${new Date().toLocaleString()}</div>
            </div>
            ${(function() {
              const porVersion = typeof getCurrentPOR === 'function' ? getCurrentPOR() : null;
              if (porVersion) {
                return `
                  <div class="border-l pl-4">
                    <div class="text-xs text-slate-600 mb-1">Plan of Record</div>
                    <div class="flex items-center gap-2">
                      <span class="px-2 py-1 bg-yellow-400 text-yellow-900 text-xs rounded font-bold">★ POR</span>
                      <span class="font-semibold text-slate-900 text-xs">${porVersion.version}</span>
                    </div>
                  </div>
                `;
              }
              return '';
            })()}
          </div>
          <div class="flex items-center gap-2">
            <button onclick="viewAllHistoricVersions()" class="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50">
              📚 Historic Versions
            </button>
            <button onclick="exportLatestProductionPlan()" class="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700">
              📊 Export Excel
            </button>
          </div>
        </div>
      </div>

      <!-- What this page shows -->
      <div class="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <div class="text-sm font-bold text-slate-900 mb-2">What this page shows:</div>
        <div class="text-sm text-slate-700 leading-relaxed mb-3">
          This plan shows two truths at once: what we <strong>could build</strong> (Capacity) and
          what we <strong>can actually build</strong> (Materials/CTB) — so you can quickly see
          whether a gap is driven by capacity readiness or material readiness.
        </div>
        <div class="text-sm text-slate-700 leading-relaxed">
          <strong>How to read it:</strong> If Capacity is healthy but Input/Ship is capped, the constraint is likely
          CTB/materials. If Capacity itself is below demand, the constraint is capacity/line readiness.
        </div>
      </div>

      <!-- Summary Strip: Two-Column Cutoff Comparison -->
      <div class="grid grid-cols-2 gap-6">
        <!-- This Week Cutoff (W04 Saturday) -->
        <div class="border-2 border-blue-300 bg-blue-50 rounded-xl p-5 shadow-sm">
          <div class="text-sm font-bold text-blue-900 mb-4">Cut-off: This Week (Sat, Jan 25, 2026)</div>
          <div class="space-y-3">
            <div class="flex justify-between items-baseline">
              <span class="text-xs text-slate-700">Cum Forecast</span>
              <span class="text-lg font-bold text-slate-900">${(weekSummary.cumForecast / 1000).toFixed(1)}k</span>
            </div>
            <div class="flex justify-between items-baseline">
              <span class="text-xs text-slate-700">Cum Capacity</span>
              <span class="text-lg font-bold text-slate-900">${(weekSummary.cumCapacity / 1000).toFixed(1)}k</span>
            </div>
            <div class="flex justify-between items-baseline">
              <span class="text-xs text-slate-700">Cum CTB</span>
              <span class="text-lg font-bold text-slate-900">${(weekSummary.cumCTB / 1000).toFixed(1)}k</span>
            </div>
            <div class="flex justify-between items-baseline border-t-2 border-blue-200 pt-3 mt-3">
              <span class="text-xs text-slate-700">Cum Ship</span>
              <span class="text-lg font-bold text-blue-700">${(weekSummary.cumShip / 1000).toFixed(1)}k</span>
            </div>
            <div class="flex justify-between items-baseline">
              <span class="text-xs text-slate-700">Gap vs Forecast</span>
              <span class="text-lg font-bold ${weekSummary.gap >= 0 ? 'text-green-700' : 'text-red-700'}">
                ${weekSummary.gap >= 0 ? '+' : ''}${(weekSummary.gap / 1000).toFixed(1)}k
              </span>
            </div>
          </div>
        </div>

        <!-- Year End Cutoff (Dec 31, 2026) -->
        <div class="border-2 border-slate-300 bg-slate-50 rounded-xl p-5 shadow-sm">
          <div class="text-sm font-bold text-slate-900 mb-4">Cut-off: Year End (Dec 31, 2026)</div>
          <div class="space-y-3">
            <div class="flex justify-between items-baseline">
              <span class="text-xs text-slate-700">Cum Forecast</span>
              <span class="text-lg font-bold text-slate-900">${(yearSummary.cumForecast / 1000).toFixed(1)}k</span>
            </div>
            <div class="flex justify-between items-baseline">
              <span class="text-xs text-slate-700">Cum Capacity</span>
              <span class="text-lg font-bold text-slate-900">${(yearSummary.cumCapacity / 1000).toFixed(1)}k</span>
            </div>
            <div class="flex justify-between items-baseline">
              <span class="text-xs text-slate-700">Cum CTB</span>
              <span class="text-lg font-bold text-slate-900">${(yearSummary.cumCTB / 1000).toFixed(1)}k</span>
            </div>
            <div class="flex justify-between items-baseline border-t-2 border-slate-200 pt-3 mt-3">
              <span class="text-xs text-slate-700">Cum Ship</span>
              <span class="text-lg font-bold text-blue-700">${(yearSummary.cumShip / 1000).toFixed(1)}k</span>
            </div>
            <div class="flex justify-between items-baseline">
              <span class="text-xs text-slate-700">Gap vs Forecast</span>
              <span class="text-lg font-bold ${yearSummary.gap >= 0 ? 'text-green-700' : 'text-red-700'}">
                ${yearSummary.gap >= 0 ? '+' : ''}${(yearSummary.gap / 1000).toFixed(1)}k
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Primary Constraint Summary -->
      <div class="bg-white border-2 rounded-xl p-4 shadow-sm">
        <div class="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div class="text-xs font-bold text-slate-500 mb-1">PRIMARY BINDING CONSTRAINT (THIS PERIOD)</div>
            <div class="text-lg font-bold ${constraintAnalysis.primaryConstraint === 'CTB' ? 'text-orange-700' : constraintAnalysis.primaryConstraint === 'Capacity' ? 'text-red-700' : 'text-green-700'}">
              ${constraintAnalysis.primaryConstraint === 'CTB' ? '📦 CTB-limited' : constraintAnalysis.primaryConstraint === 'Capacity' ? '⚙️ Capacity-limited' : '✅ No binding constraint'}
            </div>
          </div>
          <div>
            <div class="text-xs font-bold text-slate-500 mb-1">GAP (YEAR END: DELIVERABLE VS FORECAST)</div>
            <div class="text-lg font-bold ${yearSummary.gap >= 0 ? 'text-green-700' : 'text-red-700'}">
              ${yearSummary.gap >= 0 ? '+' : ''}${(yearSummary.gap / 1000).toFixed(1)}k units
            </div>
          </div>
          <div class="text-sm text-slate-600">
            ${constraintAnalysis.primaryConstraint === 'CTB' ?
              `CTB limited ${constraintAnalysis.ctbLimitedPct}% of days (${constraintAnalysis.ctbLimitedUnits.toLocaleString()} units short)` :
              constraintAnalysis.primaryConstraint === 'Capacity' ?
              `Capacity limited ${constraintAnalysis.capacityLimitedPct}% of days (${constraintAnalysis.capacityLimitedUnits.toLocaleString()} units short)` :
              'Both capacity and materials are sufficient'
            }
          </div>
        </div>
      </div>

      <!-- Granularity Toggle -->
      <div class="flex items-center gap-3">
        <span class="text-sm font-semibold text-slate-700">View:</span>
        <div class="flex gap-2">
          <button onclick="switchPlanGranularity('daily')"
                  class="px-4 py-2 rounded-lg text-sm font-semibold ${granularity === 'daily' ? 'bg-blue-600 text-white' : 'border hover:bg-slate-50 text-slate-700'}">
            Daily
          </button>
          <button onclick="switchPlanGranularity('weekly')"
                  class="px-4 py-2 rounded-lg text-sm font-semibold ${granularity === 'weekly' ? 'bg-blue-600 text-white' : 'border hover:bg-slate-50 text-slate-700'}">
            Weekly
          </button>
          <button onclick="switchPlanGranularity('monthly')"
                  class="px-4 py-2 rounded-lg text-sm font-semibold ${granularity === 'monthly' ? 'bg-blue-600 text-white' : 'border hover:bg-slate-50 text-slate-700'}">
            Monthly
          </button>
        </div>
      </div>

      <!-- Main Truth Table (4 or 5 Column Groups depending on mode) -->
      <div class="bg-white border-2 rounded-xl p-6 shadow-sm">
        <div class="text-sm font-bold text-slate-900 mb-4">
          Production Plan Truth Table
          ${isCombinedMode ? '<span class="ml-2 text-xs font-normal text-blue-600">(Combined View: Unconstrained vs Constrained)</span>' : ''}
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-xs border-collapse">
            <thead class="bg-slate-100">
              <!-- Column Group Headers -->
              <tr class="border-b-2">
                <th class="px-2 py-2 text-left font-bold border-r-2" rowspan="2">${granularity === 'daily' ? 'Date' : granularity === 'weekly' ? 'Week' : 'Month'}</th>
                <th class="px-2 py-2 text-center font-bold border-r-2 bg-slate-200" colspan="2">Demand / Supply</th>
                <th class="px-2 py-2 text-center font-bold border-r-2 bg-blue-50" colspan="2">Capacity Track</th>
                <th class="px-2 py-2 text-center font-bold border-r-2 bg-green-50" colspan="6">Reality Track${isCombinedMode ? '<br/><span class="text-xs font-normal">(Unconstrained)</span>' : ''}</th>
                ${isCombinedMode ? `<th class="px-2 py-2 text-center font-bold border-r-2 bg-purple-50" colspan="6">Reality Track<br/><span class="text-xs font-normal">(Constrained)</span></th>` : ''}
                <th class="px-2 py-2 text-center font-bold bg-orange-50" colspan="2">Gap / Constraint</th>
              </tr>
              <!-- Sub-column Headers -->
              <tr class="border-b-2">
                <th class="px-2 py-2 text-right font-semibold bg-slate-200">Cum<br/>Forecast</th>
                <th class="px-2 py-2 text-right font-semibold bg-slate-200 border-r-2">Cum<br/>CTB</th>
                <th class="px-2 py-2 text-right font-semibold bg-blue-50">${granularity === 'daily' ? 'Daily' : granularity === 'weekly' ? 'Weekly' : 'Monthly'}<br/>Capacity</th>
                <th class="px-2 py-2 text-right font-semibold bg-blue-50 border-r-2">Cum<br/>Capacity</th>
                <!-- Unconstrained Reality Track -->
                <th class="px-2 py-2 text-right font-semibold bg-green-50">${granularity === 'daily' ? 'Daily' : granularity === 'weekly' ? 'Weekly' : 'Monthly'}<br/>Input</th>
                <th class="px-2 py-2 text-right font-semibold bg-green-50">Cum<br/>Input</th>
                <th class="px-2 py-2 text-right font-semibold bg-green-50">${granularity === 'daily' ? 'Daily' : granularity === 'weekly' ? 'Weekly' : 'Monthly'}<br/>Output</th>
                <th class="px-2 py-2 text-right font-semibold bg-green-50">Cum<br/>Output</th>
                <th class="px-2 py-2 text-right font-semibold bg-green-50">${granularity === 'daily' ? 'Daily' : granularity === 'weekly' ? 'Weekly' : 'Monthly'}<br/>Ship</th>
                <th class="px-2 py-2 text-right font-semibold bg-green-50 ${isCombinedMode ? '' : 'border-r-2'}">Cum<br/>Ship</th>
                <!-- Constrained Reality Track (only in Combined mode) -->
                ${isCombinedMode ? `
                  <th class="px-2 py-2 text-right font-semibold bg-purple-50">${granularity === 'daily' ? 'Daily' : granularity === 'weekly' ? 'Weekly' : 'Monthly'}<br/>Input</th>
                  <th class="px-2 py-2 text-right font-semibold bg-purple-50">Cum<br/>Input</th>
                  <th class="px-2 py-2 text-right font-semibold bg-purple-50">${granularity === 'daily' ? 'Daily' : granularity === 'weekly' ? 'Weekly' : 'Monthly'}<br/>Output</th>
                  <th class="px-2 py-2 text-right font-semibold bg-purple-50">Cum<br/>Output</th>
                  <th class="px-2 py-2 text-right font-semibold bg-purple-50">${granularity === 'daily' ? 'Daily' : granularity === 'weekly' ? 'Weekly' : 'Monthly'}<br/>Ship</th>
                  <th class="px-2 py-2 text-right font-semibold bg-purple-50 border-r-2">Cum<br/>Ship</th>
                ` : ''}
                <th class="px-2 py-2 text-right font-semibold bg-orange-50">Gap<br/>(Cum)</th>
                <th class="px-2 py-2 text-center font-semibold bg-orange-50">Binding<br/>Driver</th>
              </tr>
            </thead>
            <tbody>
              ${currentData.map((row, idx) => {
                const dateLabel = granularity === 'daily' ? row.date :
                                 granularity === 'weekly' ? row.week_id : row.month_id;
                const isSunday = granularity === 'daily' && DateUtils.isSunday(row.date);

                // Calculate cumulative values
                const cumForecast = row.cum_demand || (idx > 0 ? currentData.slice(0, idx + 1).reduce((sum, r) => sum + (r.demand || 0), 0) : row.demand || 0);
                const cumCTB = idx > 0 ? currentData.slice(0, idx + 1).reduce((sum, r) => sum + ((r.ctb_available || r.capacity_unconstrained) || 0), 0) : (row.ctb_available || row.capacity_unconstrained || 0);
                const cumCapacity = idx > 0 ? currentData.slice(0, idx + 1).reduce((sum, r) => sum + (r.capacity_unconstrained || 0), 0) : (row.capacity_unconstrained || 0);

                const dailyInput = granularity === 'daily' ? (row.input_final || 0) : (row.input || 0);
                const cumInput = row.cum_input || (idx > 0 ? currentData.slice(0, idx + 1).reduce((sum, r) => sum + ((granularity === 'daily' ? r.input_final : r.input) || 0), 0) : dailyInput);

                const dailyOutput = granularity === 'daily' ? (row.output_final || 0) : (row.output || 0);
                const cumOutput = row.cum_output || (idx > 0 ? currentData.slice(0, idx + 1).reduce((sum, r) => sum + ((granularity === 'daily' ? r.output_final : r.output) || 0), 0) : dailyOutput);

                const dailyShip = granularity === 'daily' ? (row.shipment_final || 0) : (row.shipments || 0);
                const cumShip = row.cum_shipment || (idx > 0 ? currentData.slice(0, idx + 1).reduce((sum, r) => sum + ((granularity === 'daily' ? r.shipment_final : r.shipments) || 0), 0) : dailyShip);

                const gap = cumShip - cumForecast;
                const bindingDriver = granularity === 'daily' ? getDailyConstraint(row) : '-';

                // Get constrained data if in combined mode
                let dailyInputC = 0, cumInputC = 0, dailyOutputC = 0, cumOutputC = 0, dailyShipC = 0, cumShipC = 0;
                if (isCombinedMode && resultsConstrained) {
                  const constrainedData = granularity === 'weekly' ?
                    resultsConstrained.weeklyMetrics.filter(w => w.week_id && w.week_id.substring(0, 7) === currentMonth) :
                    granularity === 'monthly' ?
                    aggregateByMonth(resultsConstrained.programResults).filter(m => m.month_id === currentMonth) :
                    resultsConstrained.programResults.filter(d => d.date && d.date.substring(0, 7) === currentMonth);

                  const rowC = constrainedData[idx];
                  if (rowC) {
                    dailyInputC = granularity === 'daily' ? (rowC.input_final || 0) : (rowC.input || 0);
                    cumInputC = rowC.cum_input || (idx > 0 ? constrainedData.slice(0, idx + 1).reduce((sum, r) => sum + ((granularity === 'daily' ? r.input_final : r.input) || 0), 0) : dailyInputC);

                    dailyOutputC = granularity === 'daily' ? (rowC.output_final || 0) : (rowC.output || 0);
                    cumOutputC = rowC.cum_output || (idx > 0 ? constrainedData.slice(0, idx + 1).reduce((sum, r) => sum + ((granularity === 'daily' ? r.output_final : r.output) || 0), 0) : dailyOutputC);

                    dailyShipC = granularity === 'daily' ? (rowC.shipment_final || 0) : (rowC.shipments || 0);
                    cumShipC = rowC.cum_shipment || (idx > 0 ? constrainedData.slice(0, idx + 1).reduce((sum, r) => sum + ((granularity === 'daily' ? r.shipment_final : r.shipments) || 0), 0) : dailyShipC);
                  }
                }

                const bgColor = idx % 2 === 0 ? 'bg-white' : 'bg-slate-50';

                return `
                  <tr class="${bgColor} ${isSunday ? 'text-slate-400' : ''} hover:bg-blue-50 border-b">
                    <td class="px-2 py-2 font-mono text-xs border-r-2">${dateLabel}</td>
                    <td class="px-2 py-2 text-right font-mono">${Math.round(cumForecast).toLocaleString()}</td>
                    <td class="px-2 py-2 text-right font-mono border-r-2">${Math.round(cumCTB).toLocaleString()}</td>
                    <td class="px-2 py-2 text-right font-mono">${Math.round(row.capacity_unconstrained || 0).toLocaleString()}</td>
                    <td class="px-2 py-2 text-right font-mono border-r-2">${Math.round(cumCapacity).toLocaleString()}</td>
                    <!-- Unconstrained Reality Track -->
                    <td class="px-2 py-2 text-right font-mono">${Math.round(dailyInput).toLocaleString()}</td>
                    <td class="px-2 py-2 text-right font-mono">${Math.round(cumInput).toLocaleString()}</td>
                    <td class="px-2 py-2 text-right font-mono">${Math.round(dailyOutput).toLocaleString()}</td>
                    <td class="px-2 py-2 text-right font-mono">${Math.round(cumOutput).toLocaleString()}</td>
                    <td class="px-2 py-2 text-right font-mono text-blue-700">${Math.round(dailyShip).toLocaleString()}</td>
                    <td class="px-2 py-2 text-right font-mono text-blue-700 ${isCombinedMode ? '' : 'border-r-2'}">${Math.round(cumShip).toLocaleString()}</td>
                    <!-- Constrained Reality Track (only in Combined mode) -->
                    ${isCombinedMode ? `
                      <td class="px-2 py-2 text-right font-mono text-purple-700">${Math.round(dailyInputC).toLocaleString()}</td>
                      <td class="px-2 py-2 text-right font-mono text-purple-700">${Math.round(cumInputC).toLocaleString()}</td>
                      <td class="px-2 py-2 text-right font-mono text-purple-700">${Math.round(dailyOutputC).toLocaleString()}</td>
                      <td class="px-2 py-2 text-right font-mono text-purple-700">${Math.round(cumOutputC).toLocaleString()}</td>
                      <td class="px-2 py-2 text-right font-mono text-purple-700 font-semibold">${Math.round(dailyShipC).toLocaleString()}</td>
                      <td class="px-2 py-2 text-right font-mono text-purple-700 font-semibold border-r-2">${Math.round(cumShipC).toLocaleString()}</td>
                    ` : ''}
                    <td class="px-2 py-2 text-right font-mono ${gap >= 0 ? 'text-green-700' : 'text-red-700'} font-semibold">
                      ${gap >= 0 ? '+' : ''}${Math.round(gap).toLocaleString()}
                    </td>
                    <td class="px-2 py-2 text-center text-xs font-semibold ${bindingDriver === 'CTB' ? 'text-orange-700' : bindingDriver === 'Capacity' ? 'text-red-700' : 'text-slate-500'}">
                      ${bindingDriver}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Fiscal Calendar Reference (Collapsible) -->
      <div class="bg-white border-2 rounded-xl shadow-sm">
        <button id="fiscalCalendarToggle" onclick="toggleFiscalCalendar()"
                class="w-full px-6 py-4 text-left text-sm font-bold text-slate-900 hover:bg-slate-50 flex items-center justify-between">
          <span>▶ Show Fiscal Calendar (2026)</span>
          <span class="text-xs text-slate-500">4-4-5 Week Structure</span>
        </button>

        <div id="fiscalCalendarContent" style="display: none;" class="p-6 border-t">
          <div class="mb-4">
            <div class="text-sm font-semibold text-slate-900 mb-2">Fiscal Calendar Rules:</div>
            <ul class="text-xs text-slate-700 space-y-1 list-disc list-inside">
              <li>Each <strong>quarter</strong> has exactly <strong>13 weeks</strong></li>
              <li>Each quarter follows a <strong>5-4-4 pattern</strong>: Month 1 = 5 weeks, Month 2 = 4 weeks, Month 3 = 4 weeks</li>
              <li>Weeks run from <strong>Sunday to Saturday</strong></li>
              <li>Week 1 of January 2026 starts on December 28, 2025 and ends on January 3, 2026</li>
            </ul>
          </div>

          ${(() => {
            const fiscalCal = generateFiscalCalendar2026();
            return fiscalCal.map(quarter => `
              <div class="mb-6 border-2 rounded-lg overflow-hidden">
                <div class="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3">
                  <div class="text-white font-bold">${quarter.quarter} — ${quarter.months.map(m => m.name.split(' ')[0]).join(', ')}</div>
                  <div class="text-blue-100 text-xs">13 weeks total (5+4+4 pattern)</div>
                </div>
                <div class="grid grid-cols-3 gap-0">
                  ${quarter.months.map((month, idx) => `
                    <div class="border-r last:border-r-0 ${idx === 0 ? 'bg-amber-50' : 'bg-slate-50'}">
                      <div class="px-3 py-2 border-b ${idx === 0 ? 'bg-amber-100' : 'bg-slate-100'}">
                        <div class="text-xs font-bold text-slate-900">${month.name}</div>
                        <div class="text-xs text-slate-600">${month.weeks} weeks ${idx === 0 ? '(M1)' : idx === 1 ? '(M2)' : '(M3)'}</div>
                      </div>
                      <div class="p-3 space-y-2">
                        ${month.weekDetails.map(week => `
                          <div class="text-xs">
                            <div class="font-mono font-semibold text-blue-700">${week.week}</div>
                            <div class="text-slate-600">${week.start} to ${week.end}</div>
                          </div>
                        `).join('')}
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            `).join('');
          })()}
        </div>
      </div>
    </div>
  `;

  $("content").innerHTML = html;
}

// 2.2 Generate Report (Configure + Generate new plan)
function renderProductionPlanGenerate() {
  const state = window.productionPlanState;

  // Initialize engine if needed
  if (!state.engine) {
    state.engine = new ProductionPlanEngine(PRODUCTION_PLAN_SEED_DATA);
  }

  const html = `
    <div class="space-y-4">
      <!-- Subpage Navigation -->
      <div class="bg-white border rounded-xl p-4">
        <div class="flex gap-2">
          <button onclick="switchProductionPlanSubpage('latest')"
                  class="px-4 py-2 rounded-lg border hover:bg-slate-50 text-slate-700">
            📊 Latest Production Plan
          </button>
          <button onclick="switchProductionPlanSubpage('generate')"
                  class="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold">
            ⚙️ Generate Report
          </button>
        </div>
      </div>

      <!-- Forecast Section -->
      <div class="bg-white border-2 border-purple-200 rounded-xl p-6 shadow-sm">
        <div class="flex items-center justify-between mb-4 cursor-pointer" onclick="toggleSection('forecastContent', 'forecastToggle')">
          <div class="flex items-center gap-3">
            <span id="forecastToggle" class="text-purple-600 text-lg transition-transform">▼</span>
            <div>
              <div class="text-lg font-bold text-purple-900 flex items-center gap-2">
                <span>📊</span>
                <span>Demand Forecast</span>
              </div>
              <div class="text-sm text-slate-600 mt-1">Upload and manage weekly forecast data</div>
            </div>
          </div>
          <div class="flex items-center gap-2" onclick="event.stopPropagation()">
            <button onclick="uploadForecast()" class="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 flex items-center gap-2">
              <span>📤</span>
              <span>Upload</span>
            </button>
            <button onclick="viewForecastHistory()" class="px-4 py-2 border border-purple-600 text-purple-600 rounded-lg text-sm font-semibold hover:bg-purple-50 flex items-center gap-2">
              <span>📜</span>
              <span>History</span>
            </button>
            <button onclick="compareForecastVersions()" class="px-4 py-2 border border-purple-600 text-purple-600 rounded-lg text-sm font-semibold hover:bg-purple-50 flex items-center gap-2">
              <span>🔄</span>
              <span>Compare</span>
            </button>
          </div>
        </div>

        <div id="forecastContent" class="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div class="text-sm text-purple-900 mb-3">
            <span class="font-semibold">Version:</span> <span id="forecastVersion">Not uploaded</span> |
            <span class="font-semibold">Released:</span> <span id="forecastReleaseDate">-</span>
          </div>
          <div class="text-sm font-semibold text-purple-900 mb-2">Recent 4 Weeks Summary:</div>
          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead class="bg-purple-100">
                <tr>
                  <th class="px-3 py-2 text-left">Week</th>
                  <th class="px-3 py-2 text-right">Weekly Forecast</th>
                  <th class="px-3 py-2 text-right">Cum Forecast</th>
                </tr>
              </thead>
              <tbody id="forecastSummaryTable">
                <tr><td colspan="3" class="px-3 py-4 text-center text-slate-500">No forecast data uploaded yet</td></tr>
              </tbody>
            </table>
          </div>
          <div class="mt-3 text-center">
            <button onclick="viewAllForecastWeeks()" class="text-sm text-purple-600 hover:text-purple-800 font-semibold">
              👁️ View All Weekly Details →
            </button>
          </div>
        </div>
      </div>

      <!-- CTB Section -->
      <div class="bg-white border-2 border-orange-200 rounded-xl p-6 shadow-sm">
        <div class="flex items-center justify-between mb-4 cursor-pointer" onclick="toggleSection('ctbContent', 'ctbToggle')">
          <div class="flex items-center gap-3">
            <span id="ctbToggle" class="text-orange-600 text-lg transition-transform">▼</span>
            <div>
              <div class="text-lg font-bold text-orange-900 flex items-center gap-2">
                <span>📦</span>
                <span>CTB (Clear to Build)</span>
              </div>
              <div class="text-sm text-slate-600 mt-1">Upload and manage weekly CTB data by site</div>
            </div>
          </div>
          <div class="flex items-center gap-2" onclick="event.stopPropagation()">
            <button onclick="uploadCTB()" class="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-semibold hover:bg-orange-700 flex items-center gap-2">
              <span>📤</span>
              <span>Upload</span>
            </button>
            <button onclick="viewCTBHistory()" class="px-4 py-2 border border-orange-600 text-orange-600 rounded-lg text-sm font-semibold hover:bg-orange-50 flex items-center gap-2">
              <span>📜</span>
              <span>History</span>
            </button>
            <button onclick="compareCTBVersions()" class="px-4 py-2 border border-orange-600 text-orange-600 rounded-lg text-sm font-semibold hover:bg-orange-50 flex items-center gap-2">
              <span>🔄</span>
              <span>Compare</span>
            </button>
          </div>
        </div>

        <div id="ctbContent" class="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div class="text-sm text-orange-900 mb-3">
            <span class="font-semibold">Version:</span> <span id="ctbVersion">Not uploaded</span> |
            <span class="font-semibold">Updated:</span> <span id="ctbUpdateDate">-</span>
          </div>
          <div class="text-sm font-semibold text-orange-900 mb-2">Recent 4 Weeks Summary (by Site):</div>
          <div id="ctbSummaryBySite" class="space-y-4">
            <div class="text-center text-slate-500 py-4">No CTB data uploaded yet</div>
          </div>
          <div class="mt-3 text-center">
            <button onclick="viewAllCTBWeeks()" class="text-sm text-orange-600 hover:text-orange-800 font-semibold">
              👁️ View All Weekly Details →
            </button>
          </div>
        </div>
      </div>

      <!-- Configure Panel -->
      <div class="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6">
        <div class="flex items-center justify-between mb-6">
          <div>
            <div class="text-xl font-bold text-slate-900">Production Plan Configuration</div>
            <div class="text-sm text-slate-600 mt-1">Add capacity units (Site → Line → Shift) to define what the report will cover</div>
          </div>
        </div>

        <!-- Configuration Form -->
        <div class="space-y-6">
          <!-- Section 1: Program & Timeline -->
          <div class="bg-white rounded-lg border border-blue-200 p-5">
            <div class="text-sm font-bold text-blue-900 mb-4 flex items-center gap-2">
              <span>📦</span>
              <span>Program & Timeline</span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label class="text-xs text-slate-600 font-semibold block mb-1">Program</label>
                <div class="w-full bg-slate-100 border border-slate-300 rounded px-3 py-2 text-sm text-slate-700">Product A</div>
              </div>
              <div>
                <label class="text-xs text-slate-600 font-semibold block mb-1">Vendor</label>
                <div class="w-full bg-slate-100 border border-slate-300 rounded px-3 py-2 text-sm text-slate-700">Vendor X</div>
              </div>
              <div>
                <label class="text-xs text-slate-600 font-semibold block mb-1">Start Date</label>
                <input type="date" id="configStartDate" value="2026-10-01" class="w-full border rounded px-3 py-2 text-sm">
              </div>
              <div>
                <label class="text-xs text-slate-600 font-semibold block mb-1">End Date</label>
                <input type="date" id="configEndDate" value="2026-10-31" class="w-full border rounded px-3 py-2 text-sm">
              </div>
            </div>
          </div>

          <!-- Section 2: Capacity Configuration (Site → Line → Shift) -->
          <div class="bg-white rounded-lg border border-blue-200 p-5">
            <div class="text-sm font-bold text-blue-900 mb-4 flex items-center gap-2">
              <span>🏭</span>
              <span>Capacity Configuration (Site → Line → Shift)</span>
            </div>

            <div id="capacitySitesContainer" class="space-y-6">
              <!-- Sites with their lines and shifts will be rendered here -->
            </div>

            <button onclick="addSiteCapacity()"
                    class="mt-4 w-full border-2 border-dashed border-blue-300 rounded-lg py-3 text-sm text-blue-600 hover:border-blue-500 hover:bg-blue-50 font-semibold">
              + Add Site
            </button>
          </div>

          <!-- Section 3: Working Parameters -->
          <div class="bg-white rounded-lg border border-blue-200 p-5">
            <div class="text-sm font-bold text-blue-900 mb-4 flex items-center gap-2 cursor-pointer" onclick="toggleSection('workingParamsContent', 'workingParamsToggle')">
              <span id="workingParamsToggle" class="text-blue-600 transition-transform">▼</span>
              <span>⏰</span>
              <span>Working Parameters</span>
            </div>
            <div id="workingParamsContent" class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="text-xs text-slate-600 font-semibold block mb-1">Default Shift Hours</label>
                <input type="number" id="configShiftHours" value="10" min="1" max="24" class="w-full border rounded px-3 py-2 text-sm">
                <div class="text-xs text-slate-500 mt-1">Hours per shift (can be overridden per line)</div>
              </div>
              <div>
                <label class="text-xs text-slate-600 font-semibold block mb-1">Working Days Pattern</label>
                <select id="configWorkingDays" class="w-full border rounded px-3 py-2 text-sm">
                  <option value="MON_SAT" selected>Mon-Sat (6 days)</option>
                  <option value="MON_FRI">Mon-Fri (5 days)</option>
                  <option value="MON_SUN">Mon-Sun (7 days)</option>
                </select>
              </div>
              <div>
                <label class="text-xs text-slate-600 font-semibold block mb-1">Shipment Lag (Workdays)</label>
                <input type="number" id="configShipmentLag" value="2" min="0" max="10" class="w-full border rounded px-3 py-2 text-sm">
                <div class="text-xs text-slate-500 mt-1">Days from output to shipment-ready</div>
              </div>
            </div>

              <div class="mt-4 col-span-full">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" id="configConsiderHolidays" checked class="rounded">
                  <span class="text-sm font-semibold text-slate-700">Consider holidays when calculating working days</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Section 4: Output Flow-Time Factors -->
          <div class="bg-white rounded-lg border border-blue-200 p-5">
            <div class="text-sm font-bold text-blue-900 mb-4 flex items-center gap-2 cursor-pointer" onclick="toggleSection('flowTimeContent', 'flowTimeToggle')">
              <span id="flowTimeToggle" class="text-blue-600 transition-transform">▼</span>
              <span>📈</span>
              <span>Output Flow-Time Factors</span>
            </div>
            <div id="flowTimeContent" class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="text-xs text-slate-600 font-semibold block mb-1">Day 1 Factor</label>
                <input type="number" id="configDay1Factor" value="0.5" step="0.1" min="0" max="1" class="w-full border rounded px-3 py-2 text-sm">
                <div class="text-xs text-slate-500 mt-1">First day output multiplier</div>
              </div>
              <div>
                <label class="text-xs text-slate-600 font-semibold block mb-1">Day 2 Factor</label>
                <input type="number" id="configDay2Factor" value="1.0" step="0.1" min="0" max="1" class="w-full border rounded px-3 py-2 text-sm">
                <div class="text-xs text-slate-500 mt-1">Second day output multiplier</div>
              </div>
              <div>
                <label class="text-xs text-slate-600 font-semibold block mb-1">Day 3+ Factor</label>
                <input type="number" id="configDay3Factor" value="1.0" step="0.1" min="0" max="1" class="w-full border rounded px-3 py-2 text-sm">
                <div class="text-xs text-slate-500 mt-1">Day 3+ output multiplier</div>
              </div>
            </div>
          </div>

          <!-- Generate Button -->
          <div class="flex items-center justify-end gap-3 pt-4 border-t">
            <button onclick="resetConfigurationToDefault()"
                    class="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50">
              Reset to Default
            </button>
            <button onclick="generatePlanFromConfig()"
                    class="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-bold hover:from-blue-700 hover:to-indigo-700 shadow-lg">
              🚀 Generate New Production Plan
            </button>
          </div>
        </div>
      </div>

      <!-- Quick Info -->
      <div class="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div class="flex items-start gap-3">
          <div class="text-2xl">💡</div>
          <div class="flex-1">
            <div class="font-semibold text-amber-900 mb-1">Configuration Tips</div>
            <ul class="text-sm text-amber-800 space-y-1">
              <li>• Use the hierarchical structure: Add <strong>Site</strong> → Add <strong>Line</strong> → Add <strong>Shift</strong></li>
              <li>• Configure holiday schedules at the <strong>site level</strong> (follow legal holidays or custom)</li>
              <li>• Select <strong>UPH and Yield curves</strong> for each Line × Shift combination using dropdowns</li>
              <li>• Different shifts of the same line can have different ramp start dates and curves</li>
              <li>• Ramp curves are <strong>workday-indexed</strong> - they skip Sundays and holidays</li>
              <li>• <strong>Unconstrained mode</strong> shows pure capacity, <strong>Constrained mode</strong> applies CTB material limits, <strong>Combined mode</strong> shows both scenarios side-by-side for easy comparison</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `;

  $("content").innerHTML = html;

  // Render initial capacity units from seed data
  renderCapacityUnitsConfig();
}

// Switch between subpages
function switchProductionPlanSubpage(subpage) {
  window.productionPlanState.activeSubpage = subpage;
  renderProductionPlan();
}

// Render capacity configuration with hierarchical structure (Site → Line → Shift)
function renderCapacityUnitsConfig() {
  const seedData = PRODUCTION_PLAN_SEED_DATA;
  const container = document.getElementById('capacitySitesContainer');

  if (!container) return;

  const units = seedData.capacityUnits || [];

  if (units.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-slate-500">
        <div class="text-4xl mb-2">🏭</div>
        <div class="text-sm">No sites configured. Click "+ Add Site" to start.</div>
      </div>
    `;
    return;
  }

  // Group units by site
  const siteGroups = {};
  units.forEach((unit, idx) => {
    if (!siteGroups[unit.site_id]) {
      siteGroups[unit.site_id] = {
        site_id: unit.site_id,
        holiday_config: unit.holiday_config || 'legal', // 'legal' or 'custom'
        lines: {}
      };
    }

    // Group by line within site
    if (!siteGroups[unit.site_id].lines[unit.line_id]) {
      siteGroups[unit.site_id].lines[unit.line_id] = {
        line_id: unit.line_id,
        line_type: unit.line_type,
        shifts: []
      };
    }

    siteGroups[unit.site_id].lines[unit.line_id].shifts.push({
      ...unit,
      originalIndex: idx
    });
  });

  container.innerHTML = Object.values(siteGroups).map(site => {
    const linesHtml = Object.values(site.lines).map(line => {
      const shiftsHtml = line.shifts.map(shift => `
        <div class="ml-8 border-l-2 border-slate-300 pl-4 py-3 bg-white">
          <div class="flex items-start justify-between mb-3">
            <div>
              <div class="font-semibold text-slate-900">${shift.shift_type} Shift</div>
              <div class="text-xs text-slate-500 mt-1">${shift.unit_id}</div>
            </div>
            <button onclick="removeCapacityUnit(${shift.originalIndex})" class="text-red-600 hover:bg-red-50 px-2 py-1 rounded text-xs">
              🗑️ Remove
            </button>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
            <div>
              <label class="text-xs text-slate-600 block mb-1">Base UPH</label>
              <input type="number" value="${shift.base_uph}" class="w-full border rounded px-2 py-1 text-sm">
            </div>
            <div>
              <label class="text-xs text-slate-600 block mb-1">Shift Hours</label>
              <input type="number" value="${shift.shift_hours}" class="w-full border rounded px-2 py-1 text-sm">
            </div>
            <div>
              <label class="text-xs text-slate-600 block mb-1">Ramp Start Date</label>
              <input type="date" value="${shift.ramp_start_date}" class="w-full border rounded px-2 py-1 text-sm">
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-slate-600 block mb-1">UPH Ramp Curve</label>
              <select class="w-full border rounded px-2 py-1 text-sm">
                <option value="standard_30d" selected>Standard 30-day Ramp</option>
                <option value="fast_20d">Fast 20-day Ramp</option>
                <option value="slow_45d">Slow 45-day Ramp</option>
                <option value="custom">Custom Curve (${shift.uph_ramp_curve?.factors?.length || 0} points)</option>
              </select>
            </div>
            <div>
              <label class="text-xs text-slate-600 block mb-1">Yield Curve</label>
              <select class="w-full border rounded px-2 py-1 text-sm">
                <option value="standard_30d" selected>Standard 30-day Yield</option>
                <option value="fast_20d">Fast 20-day Yield</option>
                <option value="slow_45d">Slow 45-day Yield</option>
                <option value="custom">Custom Curve (${shift.yield_ramp_curve?.factors?.length || 0} points)</option>
              </select>
            </div>
          </div>
        </div>
      `).join('');

      return `
        <div class="ml-6 border-l-2 border-blue-300 pl-4 py-2 bg-blue-50/30">
          <div class="flex items-center justify-between mb-2">
            <div class="font-semibold text-blue-900">📍 Line ${line.line_id} <span class="text-xs font-normal text-slate-600">(${line.line_type})</span></div>
            <button onclick="addShiftToLine('${site.site_id}', '${line.line_id}')"
                    class="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
              + Add Shift
            </button>
          </div>
          ${shiftsHtml}
        </div>
      `;
    }).join('');

    return `
      <div class="border-2 border-blue-300 rounded-lg p-4 bg-gradient-to-r from-blue-50 to-slate-50">
        <div class="flex items-center justify-between mb-3 cursor-pointer" onclick="toggleSection('siteContent_${site.site_id}', 'siteToggle_${site.site_id}')">
          <div class="flex items-center gap-3">
            <span id="siteToggle_${site.site_id}" class="text-blue-600 text-lg transition-transform">▼</span>
            <div class="text-lg font-bold text-blue-900">🏭 Site: ${site.site_id}</div>
          </div>
          <button onclick="event.stopPropagation(); removeSite('${site.site_id}')" class="text-red-600 hover:bg-red-50 px-3 py-1 rounded text-sm font-semibold">
            🗑️ Remove Site
          </button>
        </div>

        <div id="siteContent_${site.site_id}">
          <div class="mb-3 pb-3 border-b border-blue-200">
            <label class="text-xs text-slate-600 font-semibold block mb-2">Holiday Configuration</label>
            <div class="flex items-center gap-4">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="holiday_${site.site_id}" value="legal" ${site.holiday_config === 'legal' ? 'checked' : ''}
                       class="rounded-full" onchange="updateSiteHolidayConfig('${site.site_id}', 'legal')">
                <span class="text-sm">Follow Legal Holidays</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="holiday_${site.site_id}" value="custom" ${site.holiday_config === 'custom' ? 'checked' : ''}
                       class="rounded-full" onchange="updateSiteHolidayConfig('${site.site_id}', 'custom')">
                <span class="text-sm">Custom Holiday Schedule</span>
              </label>
            </div>
          </div>

          <div class="space-y-3">
            ${linesHtml}
            <button onclick="addLineToSite('${site.site_id}')"
                    class="w-full border-2 border-dashed border-blue-300 rounded-lg py-2 text-sm text-blue-600 hover:border-blue-500 hover:bg-blue-100 font-semibold">
              + Add Line to ${site.site_id}
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Hierarchical capacity configuration management functions

function addSiteCapacity() {
  const siteId = prompt('Enter Site ID (e.g., WF, VN01, VN02):');
  if (!siteId) return;

  // Check if site already exists
  const existingSite = PRODUCTION_PLAN_SEED_DATA.capacityUnits.find(u => u.site_id === siteId);
  if (existingSite) {
    showNotification('⚠️ Site already exists. Use "Add Line" to add more lines.', 'warning');
    return;
  }

  showNotification(`✅ Site ${siteId} ready. Click "Add Line" to configure production lines.`, 'success');
  renderCapacityUnitsConfig();
}

function removeSite(siteId) {
  if (!confirm(`Remove site ${siteId} and all its lines/shifts?`)) return;

  // Remove all units for this site
  PRODUCTION_PLAN_SEED_DATA.capacityUnits = PRODUCTION_PLAN_SEED_DATA.capacityUnits.filter(
    unit => unit.site_id !== siteId
  );

  renderCapacityUnitsConfig();
  showNotification(`✅ Site ${siteId} removed`, 'success');
}

function addLineToSite(siteId) {
  const lineId = prompt(`Enter Line ID for site ${siteId} (e.g., L1, L2, L3):`);
  if (!lineId) return;

  const lineType = prompt('Enter Line Type (AUTO or MANUAL):')?.toUpperCase();
  if (!lineType || (lineType !== 'AUTO' && lineType !== 'MANUAL')) {
    showNotification('⚠️ Invalid line type. Must be AUTO or MANUAL.', 'warning');
    return;
  }

  showNotification(`✅ Line ${lineId} ready. Click "Add Shift" to configure shifts.`, 'success');
  renderCapacityUnitsConfig();
}

function addShiftToLine(siteId, lineId) {
  const shiftType = prompt('Enter Shift Type (DAY or NIGHT):')?.toUpperCase();
  if (!shiftType || (shiftType !== 'DAY' && shiftType !== 'NIGHT')) {
    showNotification('⚠️ Invalid shift type. Must be DAY or NIGHT.', 'warning');
    return;
  }

  // Check if this shift already exists
  const existingShift = PRODUCTION_PLAN_SEED_DATA.capacityUnits.find(
    u => u.site_id === siteId && u.line_id === lineId && u.shift_type === shiftType
  );
  if (existingShift) {
    showNotification(`⚠️ ${shiftType} shift already exists for ${siteId} Line ${lineId}`, 'warning');
    return;
  }

  // Get line type from existing units
  const existingLine = PRODUCTION_PLAN_SEED_DATA.capacityUnits.find(
    u => u.site_id === siteId && u.line_id === lineId
  );
  const lineType = existingLine ? existingLine.line_type : 'AUTO';

  // Create new capacity unit
  const newUnit = {
    unit_id: `${siteId}_${lineId}_${shiftType}`,
    program_id: 'product_a',
    site_id: siteId,
    line_id: lineId,
    line_type: lineType,
    shift_type: shiftType,
    base_uph: 100,
    shift_hours: 10,
    ramp_start_date: '2026-10-01',
    holiday_config: 'legal',
    uph_ramp_curve: {
      length_workdays: 30,
      factors: [
        0.50, 0.55, 0.60, 0.65, 0.70, 0.72, 0.74, 0.76, 0.78, 0.80,
        0.82, 0.84, 0.86, 0.88, 0.90, 0.91, 0.92, 0.93, 0.94, 0.95,
        0.96, 0.97, 0.98, 0.98, 0.99, 0.99, 1.00, 1.00, 1.00, 1.00
      ]
    },
    yield_ramp_curve: {
      length_workdays: 30,
      factors: [
        0.70, 0.72, 0.74, 0.76, 0.78, 0.80, 0.82, 0.84, 0.85, 0.86,
        0.87, 0.88, 0.89, 0.90, 0.91, 0.92, 0.93, 0.94, 0.95, 0.95,
        0.96, 0.96, 0.97, 0.97, 0.98, 0.98, 0.98, 0.98, 0.98, 0.98
      ]
    }
  };

  PRODUCTION_PLAN_SEED_DATA.capacityUnits.push(newUnit);
  renderCapacityUnitsConfig();
  showNotification(`✅ ${shiftType} shift added to ${siteId} Line ${lineId}`, 'success');
}

function removeCapacityUnit(index) {
  const unit = PRODUCTION_PLAN_SEED_DATA.capacityUnits[index];
  if (!confirm(`Remove ${unit.shift_type} shift from ${unit.site_id} Line ${unit.line_id}?`)) return;

  PRODUCTION_PLAN_SEED_DATA.capacityUnits.splice(index, 1);
  renderCapacityUnitsConfig();
  showNotification('✅ Shift removed', 'success');
}

function updateSiteHolidayConfig(siteId, configType) {
  if (configType === 'custom') {
    // Open custom holiday editor
    openCustomHolidayEditor(siteId);
  } else {
    // Update all units for this site
    PRODUCTION_PLAN_SEED_DATA.capacityUnits.forEach(unit => {
      if (unit.site_id === siteId) {
        unit.holiday_config = configType;
        delete unit.custom_holidays; // Remove custom holidays when switching to legal
      }
    });

    showNotification(`✅ ${siteId} now follows legal holidays`, 'success');
  }
}

function openCustomHolidayEditor(siteId) {
  // Get site's country
  const siteData = PRODUCTION_PLAN_SEED_DATA.sites.find(s => s.site_id === siteId);
  const country = siteData?.country || 'CN';

  // Get legal holidays for this country
  const legalHolidays = PRODUCTION_PLAN_SEED_DATA.countryHolidays[country] || [];

  // Get existing custom holidays for this site
  const siteUnit = PRODUCTION_PLAN_SEED_DATA.capacityUnits.find(u => u.site_id === siteId);
  const customHolidays = siteUnit?.custom_holidays || JSON.parse(JSON.stringify(legalHolidays)); // Deep copy

  // Open popup window
  const editorWindow = window.open('', '_blank', 'width=900,height=700');
  const doc = editorWindow.document;

  doc.write('<!DOCTYPE html><html><head>');
  doc.write('<title>Custom Holiday Schedule - ' + siteId + '</title>');
  doc.write('<script src="https://cdn.tailwindcss.com"></script>');
  doc.write('</head><body class="bg-slate-50 p-6">');

  doc.write('<div class="max-w-4xl mx-auto">');
  doc.write('<div class="bg-white rounded-lg shadow-lg p-6">');
  doc.write('<div class="flex items-center justify-between mb-6">');
  doc.write('<div>');
  doc.write('<h1 class="text-2xl font-bold text-slate-900">Custom Holiday Schedule</h1>');
  doc.write('<p class="text-sm text-slate-600 mt-1">Site: <strong>' + siteId + '</strong> (Country: ' + country + ')</p>');
  doc.write('</div>');
  doc.write('<button onclick="window.close()" class="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300">✕ Close</button>');
  doc.write('</div>');

  doc.write('<div class="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">');
  doc.write('<div class="text-sm text-blue-900">');
  doc.write('<strong>💡 Instructions:</strong> Below are the legal holidays for ' + country + '. ');
  doc.write('You can edit the start date, end date, and add notes for each holiday. ');
  doc.write('For example, if National Day is legally 7 days (Oct 1-7) but the factory only rests 3 days, ');
  doc.write('you can change the end date to Oct 3.');
  doc.write('</div>');
  doc.write('</div>');

  // Holiday list
  doc.write('<div id="holidayList" class="space-y-4">');

  customHolidays.forEach(function(holiday, idx) {
    doc.write('<div class="border border-slate-200 rounded-lg p-4 bg-slate-50">');
    doc.write('<div class="flex items-center justify-between mb-3">');
    doc.write('<div class="font-semibold text-slate-900">' + holiday.name + '</div>');
    doc.write('<button onclick="removeHoliday(' + idx + ')" class="text-red-600 hover:bg-red-50 px-2 py-1 rounded text-sm">🗑️ Remove</button>');
    doc.write('</div>');

    doc.write('<div class="grid grid-cols-2 gap-4 mb-2">');
    doc.write('<div>');
    doc.write('<label class="text-xs text-slate-600 block mb-1">Start Date</label>');
    doc.write('<input type="date" id="start_' + idx + '" value="' + holiday.start + '" class="w-full border rounded px-3 py-2 text-sm">');
    doc.write('</div>');
    doc.write('<div>');
    doc.write('<label class="text-xs text-slate-600 block mb-1">End Date</label>');
    doc.write('<input type="date" id="end_' + idx + '" value="' + holiday.end + '" class="w-full border rounded px-3 py-2 text-sm">');
    doc.write('</div>');
    doc.write('</div>');

    doc.write('<div>');
    doc.write('<label class="text-xs text-slate-600 block mb-1">Notes</label>');
    doc.write('<input type="text" id="notes_' + idx + '" value="' + (holiday.notes || '') + '" ');
    doc.write('class="w-full border rounded px-3 py-2 text-sm" placeholder="e.g., Factory working on Oct 4-7">');
    doc.write('</div>');

    doc.write('</div>');
  });

  doc.write('</div>');

  // Add new holiday button
  doc.write('<button onclick="addNewHoliday()" class="mt-4 w-full border-2 border-dashed border-blue-300 rounded-lg py-3 text-sm text-blue-600 hover:border-blue-500 hover:bg-blue-50 font-semibold">');
  doc.write('+ Add Custom Holiday');
  doc.write('</button>');

  // Save button
  doc.write('<div class="mt-6 flex items-center justify-end gap-3">');
  doc.write('<button onclick="window.close()" class="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50">');
  doc.write('Cancel');
  doc.write('</button>');
  doc.write('<button onclick="saveCustomHolidays()" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">');
  doc.write('💾 Save Custom Schedule');
  doc.write('</button>');
  doc.write('</div>');

  doc.write('</div>');
  doc.write('</div>');

  // JavaScript for the popup
  doc.write('<script>');
  doc.write('var holidays = ' + JSON.stringify(customHolidays) + ';');
  doc.write('var siteId = "' + siteId + '";');

  doc.write('function removeHoliday(idx) {');
  doc.write('  if (!confirm("Remove this holiday?")) return;');
  doc.write('  holidays.splice(idx, 1);');
  doc.write('  location.reload();');
  doc.write('}');

  doc.write('function addNewHoliday() {');
  doc.write('  var name = prompt("Enter holiday name:");');
  doc.write('  if (!name) return;');
  doc.write('  var start = prompt("Enter start date (YYYY-MM-DD):");');
  doc.write('  if (!start) return;');
  doc.write('  var end = prompt("Enter end date (YYYY-MM-DD):");');
  doc.write('  if (!end) return;');
  doc.write('  holidays.push({ name: name, start: start, end: end, notes: "" });');
  doc.write('  location.reload();');
  doc.write('}');

  doc.write('function saveCustomHolidays() {');
  doc.write('  var updatedHolidays = holidays.map(function(h, idx) {');
  doc.write('    return {');
  doc.write('      name: h.name,');
  doc.write('      start: document.getElementById("start_" + idx).value,');
  doc.write('      end: document.getElementById("end_" + idx).value,');
  doc.write('      notes: document.getElementById("notes_" + idx).value');
  doc.write('    };');
  doc.write('  });');
  doc.write('  ');
  doc.write('  if (window.opener && window.opener.saveCustomHolidaysToSite) {');
  doc.write('    window.opener.saveCustomHolidaysToSite(siteId, updatedHolidays);');
  doc.write('    alert("✅ Custom holiday schedule saved for " + siteId);');
  doc.write('    window.close();');
  doc.write('  }');
  doc.write('}');

  doc.write('</script>');
  doc.write('</body></html>');
  doc.close();
}

// Function to receive data from popup
function saveCustomHolidaysToSite(siteId, customHolidays) {
  // Update all units for this site with custom holidays
  PRODUCTION_PLAN_SEED_DATA.capacityUnits.forEach(unit => {
    if (unit.site_id === siteId) {
      unit.holiday_config = 'custom';
      unit.custom_holidays = customHolidays;
    }
  });

  showNotification(`✅ Custom holiday schedule saved for ${siteId}`, 'success');
  renderCapacityUnitsConfig();
}

// Expose to window for popup access
window.saveCustomHolidaysToSite = saveCustomHolidaysToSite;

function editUphRampCurve(index) {
  showNotification('⚠️ UPH Ramp Curve editor coming soon!', 'info');
}

function editYieldRampCurve(index) {
  showNotification('⚠️ Yield Ramp Curve editor coming soon!', 'info');
}

function resetConfigurationToDefault() {
  if (!confirm('Reset all configuration to default values?')) return;

  // Reset form values
  document.getElementById('configStartDate').value = '2026-10-01';
  document.getElementById('configEndDate').value = '2026-10-31';
  document.getElementById('configShiftHours').value = '10';
  document.getElementById('configWorkingDays').value = 'MON_SAT';
  document.getElementById('configShipmentLag').value = '2';
  document.getElementById('configConsiderHolidays').checked = true;
  document.getElementById('configDay1Factor').value = '0.5';
  document.getElementById('configDay2Factor').value = '1.0';
  document.getElementById('configDay3Factor').value = '1.0';

  showNotification('✅ Configuration reset to default', 'success');
}

// Toggle section collapse/expand
function toggleSection(contentId, toggleId) {
  const content = document.getElementById(contentId);
  const toggle = document.getElementById(toggleId);

  if (!content || !toggle) return;

  if (content.style.display === 'none') {
    content.style.display = '';
    toggle.textContent = '▼';
    toggle.style.transform = 'rotate(0deg)';
  } else {
    content.style.display = 'none';
    toggle.textContent = '▶';
    toggle.style.transform = 'rotate(-90deg)';
  }
}

function generatePlanFromConfig() {
  // Show planning mode selection modal
  showPlanningModeModal();
}

function showPlanningModeModal() {
  // Create modal overlay
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center';
  modal.innerHTML = `
    <div class="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full mx-4">
      <div class="text-2xl font-bold text-slate-900 mb-2">Select Planning Mode</div>
      <div class="text-sm text-slate-600 mb-6">Choose which scenario(s) to include in the production plan report</div>

      <div class="space-y-4">
        <label class="flex items-start gap-4 p-4 border-2 border-slate-200 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
          <input type="radio" name="planningMode" value="unconstrained" class="mt-1" checked>
          <div class="flex-1">
            <div class="font-semibold text-slate-900">Unconstrained (Capacity Only)</div>
            <div class="text-sm text-slate-600 mt-1">Shows pure production capacity without CTB material constraints</div>
          </div>
        </label>

        <label class="flex items-start gap-4 p-4 border-2 border-slate-200 rounded-lg cursor-pointer hover:border-orange-500 hover:bg-orange-50 transition-colors">
          <input type="radio" name="planningMode" value="constrained" class="mt-1">
          <div class="flex-1">
            <div class="font-semibold text-slate-900">Constrained (CTB Applied)</div>
            <div class="text-sm text-slate-600 mt-1">Applies Clear-to-Build material limits to production plan</div>
          </div>
        </label>

        <label class="flex items-start gap-4 p-4 border-2 border-slate-200 rounded-lg cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-colors">
          <input type="radio" name="planningMode" value="combined" class="mt-1">
          <div class="flex-1">
            <div class="font-semibold text-slate-900">Both Scenarios (Side-by-Side)</div>
            <div class="text-sm text-slate-600 mt-1">Displays both unconstrained and constrained plans for easy comparison</div>
          </div>
        </label>
      </div>

      <div class="flex items-center justify-end gap-3 mt-8">
        <button onclick="this.closest('.fixed').remove()" class="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50">
          Cancel
        </button>
        <button onclick="proceedWithPlanGeneration()" class="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-bold hover:from-blue-700 hover:to-indigo-700 shadow-lg">
          🚀 Generate Plan
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

function proceedWithPlanGeneration() {
  // Get selected mode
  const selectedMode = document.querySelector('input[name="planningMode"]:checked').value;

  // ========================================
  // DATA VALIDATION BEFORE GENERATION
  // ========================================
  const validationErrors = [];
  const seedData = PRODUCTION_PLAN_SEED_DATA;

  // Check 1: Forecast data (required for all modes)
  if (!seedData.weeklyDemand || seedData.weeklyDemand.length === 0) {
    validationErrors.push('❌ <strong>Forecast data is missing</strong><br>Please upload weekly demand forecast data before generating the plan.');
  }

  // Check 2: CTB data (required for Constrained and Combined modes)
  if (selectedMode === 'constrained' || selectedMode === 'combined') {
    if (!seedData.ctbDaily || seedData.ctbDaily.length === 0) {
      validationErrors.push('❌ <strong>CTB (Clear-to-Build) data is missing</strong><br>Constrained mode requires daily CTB material availability data.');
    }
  }

  // Check 3: Capacity configuration (required for all modes)
  if (!seedData.capacityUnits || seedData.capacityUnits.length === 0) {
    validationErrors.push('❌ <strong>Capacity configuration is missing</strong><br>Please configure at least one production line with shift settings.');
  }

  // Check 4: Sites configuration
  if (!seedData.sites || seedData.sites.length === 0) {
    validationErrors.push('❌ <strong>Sites configuration is missing</strong><br>Please add at least one production site.');
  }

  // If there are validation errors, show them and stop
  if (validationErrors.length > 0) {
    const errorModal = document.createElement('div');
    errorModal.className = 'fixed inset-0 bg-black/60 z-50 flex items-center justify-center';
    errorModal.innerHTML = `
      <div class="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full mx-4">
        <div class="flex items-start gap-4 mb-6">
          <div class="text-4xl">⚠️</div>
          <div class="flex-1">
            <div class="text-2xl font-bold text-red-900 mb-2">Cannot Generate Production Plan</div>
            <div class="text-sm text-slate-600">The following required data is missing:</div>
          </div>
        </div>

        <div class="space-y-3 mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
          ${validationErrors.map(err => `<div class="text-sm text-red-900">${err}</div>`).join('<div class="border-t border-red-200 my-2"></div>')}
        </div>

        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div class="font-semibold text-blue-900 mb-2">💡 What you need to do:</div>
          <ul class="text-sm text-blue-800 space-y-1">
            <li>• <strong>Forecast data</strong>: Upload weekly demand forecast (required for all modes)</li>
            <li>• <strong>CTB data</strong>: Upload daily material availability (required for Constrained/Combined modes)</li>
            <li>• <strong>Capacity config</strong>: Add production lines and shifts in the configuration section</li>
            <li>• <strong>Sites</strong>: Configure at least one production site</li>
          </ul>
        </div>

        <div class="flex justify-end gap-3">
          <button onclick="this.closest('.fixed').remove()"
                  class="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
            OK, I'll Add Missing Data
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(errorModal);
    return; // Stop execution
  }

  // Close modal
  document.querySelector('.fixed.inset-0').remove();

  // Gather configuration
  const config = {
    program: 'product_a', // Fixed value
    startDate: document.getElementById('configStartDate').value,
    endDate: document.getElementById('configEndDate').value,
    mode: selectedMode, // From modal selection
    shiftHours: parseFloat(document.getElementById('configShiftHours').value),
    workingDays: document.getElementById('configWorkingDays').value,
    shipmentLag: parseInt(document.getElementById('configShipmentLag').value),
    considerHolidays: document.getElementById('configConsiderHolidays').checked,
    outputFactors: {
      day1: parseFloat(document.getElementById('configDay1Factor').value),
      day2: parseFloat(document.getElementById('configDay2Factor').value),
      day3_plus: parseFloat(document.getElementById('configDay3Factor').value)
    }
  };

  // Show loading overlay
  const loadingOverlay = document.createElement('div');
  loadingOverlay.className = 'fixed inset-0 bg-black/40 z-50 flex items-center justify-center';
  loadingOverlay.innerHTML = `
    <div class="bg-white rounded-xl shadow-2xl p-8 flex flex-col items-center gap-4 max-w-md">
      <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
      <div class="text-xl font-bold">Generating Production Plan...</div>
      <div class="text-sm text-slate-600 text-center">
        Calculating capacity, applying ramp curves, checking constraints...
      </div>
    </div>
  `;
  document.body.appendChild(loadingOverlay);

  // Simulate processing
  setTimeout(() => {
    try {
      // Update state with new configuration
      const state = window.productionPlanState;
      state.program = config.program;
      state.startDate = config.startDate;
      state.endDate = config.endDate;
      state.mode = config.mode;

      console.log('[Generate] Starting plan generation with config:', config);

      // Generate new plan(s) based on mode
      if (config.mode === 'combined') {
        // Generate both unconstrained and constrained plans
        console.log('[Generate] Generating combined mode plans...');
        const unconstrainedPlan = state.engine.generatePlan(config.startDate, config.endDate, 'unconstrained');
        const constrainedPlan = state.engine.generatePlan(config.startDate, config.endDate, 'constrained');

        // Validate plans
        if (!unconstrainedPlan || !unconstrainedPlan.programResults || !unconstrainedPlan.weeklyMetrics) {
          throw new Error('Unconstrained plan generation failed - missing required data');
        }
        if (!constrainedPlan || !constrainedPlan.programResults || !constrainedPlan.weeklyMetrics) {
          throw new Error('Constrained plan generation failed - missing required data');
        }

        state.planResults = {
          unconstrained: unconstrainedPlan,
          constrained: constrainedPlan,
          mode: 'combined'
        };
        console.log('[Generate] Combined plans generated successfully');
      } else {
        console.log('[Generate] Generating single mode plan:', config.mode);
        const plan = state.engine.generatePlan(config.startDate, config.endDate, config.mode);

        // Validate plan
        if (!plan || !plan.programResults || !plan.weeklyMetrics) {
          console.error('[Generate] Plan validation failed. Plan object:', plan);
          throw new Error('Plan generation failed - missing required data (programResults or weeklyMetrics)');
        }

        console.log('[Generate] Plan generated:', {
          mode: config.mode,
          programResultsLength: plan.programResults.length,
          weeklyMetricsLength: plan.weeklyMetrics.length
        });

        state.planResults = plan;
      }

      // Save plan as versioned plan
      if (typeof saveProductionPlanVersion === 'function') {
        saveProductionPlanVersion(state.planResults, config);
      }

      // Save plan to localStorage for the report window
      const planId = 'plan_' + Date.now();
      localStorage.setItem('productionPlan_' + planId, JSON.stringify(state.planResults));
      localStorage.setItem('productionPlan_latest', JSON.stringify(state.planResults)); // Also save as latest

      // Try to open report in new window
      const reportWindow = window.open(
        'production_plan_report.html?planId=' + planId,
        '_blank',
        'width=1200,height=800,scrollbars=yes,resizable=yes'
      );

      // Switch to Latest Plan view (which will show the embedded report)
      state.activeSubpage = 'latest';

      loadingOverlay.remove();
      renderProductionPlan();

      if (!reportWindow) {
        // If popup was blocked, show notification to view in Latest Plan tab
        showNotification('✅ Plan Generated! View report in "Latest Production Plan" tab below (pop-up was blocked).', 'warning');
      } else {
        showNotification('✅ Production Plan Generated Successfully! Report opened in new window.', 'success');
      }
    } catch (error) {
      console.error('[Generate] Error generating plan:', error);
      console.error('[Generate] Error stack:', error.stack);
      loadingOverlay.remove();
      showNotification('❌ Error generating plan: ' + error.message, 'error');
    }
  }, 1500);
}

// Production Plan Helper Functions
function updateProductionPlanFilters() {
  const state = window.productionPlanState;
  state.program = document.getElementById('ppProgram').value;
  state.site = document.getElementById('ppSite').value;
  state.startDate = document.getElementById('ppStartDate').value;
  state.endDate = document.getElementById('ppEndDate').value;
  state.mode = document.getElementById('ppMode').value;

  // Auto-regenerate
  regenerateProductionPlan();
}

function regenerateProductionPlan() {
  const state = window.productionPlanState;

  // Show loading state in UI
  const loadingOverlay = document.createElement('div');
  loadingOverlay.className = 'fixed inset-0 bg-black/20 z-50 flex items-center justify-center';
  loadingOverlay.innerHTML = `
    <div class="bg-white rounded-xl shadow-2xl p-6 flex items-center gap-4">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <div class="text-lg font-semibold">Generating Production Plan...</div>
    </div>
  `;
  document.body.appendChild(loadingOverlay);

  // Simulate processing time for better UX
  setTimeout(() => {
    try {
      // Regenerate plan with new settings
      state.planResults = state.engine.generatePlan(state.startDate, state.endDate, state.mode);

      // Remove loading overlay
      loadingOverlay.remove();

      // Re-render
      renderProductionPlan();

      // Show success notification
      showNotification('✅ Production Plan Generated Successfully!', 'success');
    } catch (error) {
      console.error('Error generating plan:', error);
      loadingOverlay.remove();
      showNotification('❌ Error generating plan: ' + error.message, 'error');
    }
  }, 500);
}

// Helper function to show notifications
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-semibold animate-fade-in ${
    type === 'success' ? 'bg-green-600' :
    type === 'error' ? 'bg-red-600' :
    'bg-blue-600'
  }`;
  notification.textContent = message;

  document.body.appendChild(notification);

  // Auto remove after 3 seconds
  setTimeout(() => {
    notification.classList.add('animate-fade-out');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function exportProductionPlanToExcel() {
  showNotification('📊 Excel export feature coming soon!', 'info');
}

function openProductionPlanConfig() {
  // This function is deprecated - now using subpage navigation
  window.productionPlanState.activeSubpage = 'generate';
  renderProductionPlan();
}

// 3. Manufacturing Lead-time
function renderManufacturingLeadtime() {
  const html = `
    <div class="bg-white border rounded-xl p-6 mb-4">
      <div class="text-lg font-bold text-slate-900 mb-3">Manufacturing Lead-time Overview</div>
      <div class="text-sm text-slate-600 mb-4">Complete weekly lead-time from material receipt to warehouse</div>

      <!-- Timeline Chart -->
      <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border rounded-xl p-6 mb-6">
        <div class="text-sm font-semibold text-slate-700 mb-4">End-to-End Manufacturing Timeline (Weekly Average)</div>

        <!-- Timeline -->
        <div class="relative">
          <!-- Timeline bar -->
          <div class="flex items-center mb-4">
            <div class="flex-1 h-12 bg-gradient-to-r from-blue-400 to-purple-400 rounded-lg flex items-center justify-center text-white font-bold">
              Total: 28 Days
            </div>
          </div>

          <!-- Process breakdown -->
          <div class="grid grid-cols-6 gap-2 text-xs">
            <div class="bg-blue-100 border border-blue-300 rounded p-2 text-center">
              <div class="font-semibold text-blue-900">MIH</div>
              <div class="text-blue-700">4 days</div>
            </div>
            <div class="bg-indigo-100 border border-indigo-300 rounded p-2 text-center">
              <div class="font-semibold text-indigo-900">SMT Input</div>
              <div class="text-indigo-700">3 days</div>
            </div>
            <div class="bg-purple-100 border border-purple-300 rounded p-2 text-center">
              <div class="font-semibold text-purple-900">SMT Output</div>
              <div class="text-purple-700">6 days</div>
            </div>
            <div class="bg-pink-100 border border-pink-300 rounded p-2 text-center">
              <div class="font-semibold text-pink-900">FAT Input</div>
              <div class="text-pink-700">5 days</div>
            </div>
            <div class="bg-rose-100 border border-rose-300 rounded p-2 text-center">
              <div class="font-semibold text-rose-900">Packing</div>
              <div class="text-rose-700">7 days</div>
            </div>
            <div class="bg-red-100 border border-red-300 rounded p-2 text-center">
              <div class="font-semibold text-red-900">WH</div>
              <div class="text-red-700">3 days</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Process Breakdown Table with Percentiles -->
      <div class="text-sm font-semibold text-slate-700 mb-3">Weekly Lead-time Performance (Previous Week)</div>
      <div class="overflow-x-auto mb-6">
        <table class="w-full text-sm">
          <thead class="bg-slate-100">
            <tr>
              <th class="px-4 py-3 text-left font-semibold text-slate-700">Process Stage</th>
              <th class="px-4 py-3 text-right font-semibold text-slate-700">Standard (Days)</th>
              <th class="px-4 py-3 text-right font-semibold text-slate-700 bg-green-50">75% Actual</th>
              <th class="px-4 py-3 text-right font-semibold text-slate-700 bg-yellow-50">90% Actual</th>
              <th class="px-4 py-3 text-right font-semibold text-slate-700 bg-blue-50">Average</th>
              <th class="px-4 py-3 text-right font-semibold text-slate-700">Variance</th>
              <th class="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <tr class="hover:bg-slate-50">
              <td class="px-4 py-3 font-medium">MIH (Material In-House)</td>
              <td class="px-4 py-3 text-right">3.0</td>
              <td class="px-4 py-3 text-right bg-green-50 font-semibold text-green-700">3.8</td>
              <td class="px-4 py-3 text-right bg-yellow-50 font-semibold text-yellow-700">4.5</td>
              <td class="px-4 py-3 text-right bg-blue-50 font-bold text-blue-700">4.2</td>
              <td class="px-4 py-3 text-right text-red-700 font-semibold">+1.2</td>
              <td class="px-4 py-3">
                <span class="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">⚠️ Delayed</span>
              </td>
            </tr>
            <tr class="hover:bg-slate-50">
              <td class="px-4 py-3 font-medium">SMT Input</td>
              <td class="px-4 py-3 text-right">2.5</td>
              <td class="px-4 py-3 text-right bg-green-50 font-semibold text-green-700">2.8</td>
              <td class="px-4 py-3 text-right bg-yellow-50 font-semibold text-yellow-700">3.3</td>
              <td class="px-4 py-3 text-right bg-blue-50 font-bold text-blue-700">3.1</td>
              <td class="px-4 py-3 text-right text-red-700 font-semibold">+0.6</td>
              <td class="px-4 py-3">
                <span class="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">⚠️ Delayed</span>
              </td>
            </tr>
            <tr class="hover:bg-slate-50">
              <td class="px-4 py-3 font-medium">SMT Output</td>
              <td class="px-4 py-3 text-right">5.0</td>
              <td class="px-4 py-3 text-right bg-green-50 font-semibold text-green-700">5.2</td>
              <td class="px-4 py-3 text-right bg-yellow-50 font-semibold text-yellow-700">6.1</td>
              <td class="px-4 py-3 text-right bg-blue-50 font-bold text-blue-700">5.8</td>
              <td class="px-4 py-3 text-right text-red-700 font-semibold">+0.8</td>
              <td class="px-4 py-3">
                <span class="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">⚠️ Delayed</span>
              </td>
            </tr>
            <tr class="hover:bg-slate-50">
              <td class="px-4 py-3 font-medium">FAT Input</td>
              <td class="px-4 py-3 text-right">4.0</td>
              <td class="px-4 py-3 text-right bg-green-50 font-semibold text-green-700">4.8</td>
              <td class="px-4 py-3 text-right bg-yellow-50 font-semibold text-yellow-700">5.6</td>
              <td class="px-4 py-3 text-right bg-blue-50 font-bold text-blue-700">5.2</td>
              <td class="px-4 py-3 text-right text-red-700 font-semibold">+1.2</td>
              <td class="px-4 py-3">
                <span class="inline-block px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded">🔴 Critical</span>
              </td>
            </tr>
            <tr class="hover:bg-slate-50">
              <td class="px-4 py-3 font-medium">Packing</td>
              <td class="px-4 py-3 text-right">6.0</td>
              <td class="px-4 py-3 text-right bg-green-50 font-semibold text-green-700">6.3</td>
              <td class="px-4 py-3 text-right bg-yellow-50 font-semibold text-yellow-700">7.2</td>
              <td class="px-4 py-3 text-right bg-blue-50 font-bold text-blue-700">6.9</td>
              <td class="px-4 py-3 text-right text-red-700 font-semibold">+0.9</td>
              <td class="px-4 py-3">
                <span class="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">⚠️ Delayed</span>
              </td>
            </tr>
            <tr class="hover:bg-slate-50">
              <td class="px-4 py-3 font-medium">WH (Warehouse)</td>
              <td class="px-4 py-3 text-right">2.5</td>
              <td class="px-4 py-3 text-right bg-green-50 font-semibold text-green-700">2.6</td>
              <td class="px-4 py-3 text-right bg-yellow-50 font-semibold text-yellow-700">3.0</td>
              <td class="px-4 py-3 text-right bg-blue-50 font-bold text-blue-700">2.8</td>
              <td class="px-4 py-3 text-right text-yellow-700 font-semibold">+0.3</td>
              <td class="px-4 py-3">
                <span class="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">✅ Acceptable</span>
              </td>
            </tr>
            <tr class="bg-slate-100 font-bold">
              <td class="px-4 py-3">Total Lead-time</td>
              <td class="px-4 py-3 text-right">23.0</td>
              <td class="px-4 py-3 text-right bg-green-50 text-green-700">25.5</td>
              <td class="px-4 py-3 text-right bg-yellow-50 text-yellow-700">29.7</td>
              <td class="px-4 py-3 text-right bg-blue-50 text-blue-700 text-lg">28.0</td>
              <td class="px-4 py-3 text-right text-red-700 text-lg">+5.0</td>
              <td class="px-4 py-3"></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mb-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
        <div class="text-xs font-semibold text-blue-900 mb-1">📊 Percentile Explanation</div>
        <div class="text-sm text-blue-900">
          <strong>75% Actual:</strong> 75% of units complete within this time (best case performance).
          <strong>90% Actual:</strong> 90% of units complete within this time (typical target).
          <strong>Average:</strong> Mean lead-time across all units.
        </div>
      </div>

      <!-- Monthly Tracking Table -->
      <div class="mt-6">
        <div class="text-sm font-semibold text-slate-700 mb-3">Monthly Lead-time Tracking (Total End-to-End)</div>
        <div class="text-xs text-slate-600 mb-3">Plan values are set at beginning of year. Actual values updated at beginning of each month for the previous month.</div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-100">
              <tr>
                <th class="px-3 py-2 text-left font-semibold text-slate-700">Metric</th>
                <th class="px-3 py-2 text-center font-semibold text-slate-700">Jan</th>
                <th class="px-3 py-2 text-center font-semibold text-slate-700">Feb</th>
                <th class="px-3 py-2 text-center font-semibold text-slate-700">Mar</th>
                <th class="px-3 py-2 text-center font-semibold text-slate-700">Apr</th>
                <th class="px-3 py-2 text-center font-semibold text-slate-700">May</th>
                <th class="px-3 py-2 text-center font-semibold text-slate-700">Jun</th>
                <th class="px-3 py-2 text-center font-semibold text-slate-700">Jul</th>
                <th class="px-3 py-2 text-center font-semibold text-slate-700">Aug</th>
                <th class="px-3 py-2 text-center font-semibold text-slate-700">Sep</th>
                <th class="px-3 py-2 text-center font-semibold text-slate-700">Oct</th>
                <th class="px-3 py-2 text-center font-semibold text-slate-700">Nov</th>
                <th class="px-3 py-2 text-center font-semibold text-slate-700">Dec</th>
              </tr>
            </thead>
            <tbody>
              <tr class="bg-blue-50 hover:bg-blue-100">
                <td class="px-3 py-3 font-semibold text-slate-900">Plan (Days)</td>
                <td class="px-3 py-3 text-center text-blue-700 font-semibold">23.0</td>
                <td class="px-3 py-3 text-center text-blue-700 font-semibold">23.0</td>
                <td class="px-3 py-3 text-center text-blue-700 font-semibold">23.0</td>
                <td class="px-3 py-3 text-center text-blue-700 font-semibold">23.0</td>
                <td class="px-3 py-3 text-center text-blue-700 font-semibold">23.0</td>
                <td class="px-3 py-3 text-center text-blue-700 font-semibold">23.0</td>
                <td class="px-3 py-3 text-center text-blue-700 font-semibold">23.0</td>
                <td class="px-3 py-3 text-center text-blue-700 font-semibold">23.0</td>
                <td class="px-3 py-3 text-center text-blue-700 font-semibold">23.0</td>
                <td class="px-3 py-3 text-center text-blue-700 font-semibold">23.0</td>
                <td class="px-3 py-3 text-center text-blue-700 font-semibold">23.0</td>
                <td class="px-3 py-3 text-center text-blue-700 font-semibold">23.0</td>
              </tr>
              <tr class="hover:bg-slate-50">
                <td class="px-3 py-3 font-semibold text-slate-900">Actual (Days)</td>
                <td class="px-3 py-3 text-center bg-green-50 font-bold text-green-700">22.8</td>
                <td class="px-3 py-3 text-center text-slate-400">—</td>
                <td class="px-3 py-3 text-center text-slate-400">—</td>
                <td class="px-3 py-3 text-center text-slate-400">—</td>
                <td class="px-3 py-3 text-center text-slate-400">—</td>
                <td class="px-3 py-3 text-center text-slate-400">—</td>
                <td class="px-3 py-3 text-center text-slate-400">—</td>
                <td class="px-3 py-3 text-center text-slate-400">—</td>
                <td class="px-3 py-3 text-center text-slate-400">—</td>
                <td class="px-3 py-3 text-center text-slate-400">—</td>
                <td class="px-3 py-3 text-center text-slate-400">—</td>
                <td class="px-3 py-3 text-center text-slate-400">—</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mt-3 text-xs text-slate-600 bg-slate-50 border rounded p-3">
          <strong>Note:</strong> January actual (22.8 days) was updated on Feb 1st. Current week is W04 of January, so Feb-Dec actuals will be populated at the beginning of each subsequent month. Plan remains constant at 23.0 days throughout the year as the baseline target.
        </div>
      </div>

      <div class="mt-4 p-4 bg-red-50 border-l-4 border-red-500 rounded">
        <div class="text-xs font-semibold text-red-900 mb-2">⚠️ Critical Bottleneck Identified</div>
        <div class="text-sm text-red-900 mb-2"><strong>FAT Input stage:</strong> +1.2 days variance (30% over standard)</div>
        <div class="text-xs text-red-800"><strong>Improvement Actions:</strong> Increase test capacity, optimize changeover time, add weekend shift for critical SKUs</div>
      </div>
    </div>
  `;

  $("content").innerHTML = html;
}

// 4. BTO/CTO Lead-time
function renderBTOCTOLeadtime() {
  const html = `
    <div class="space-y-4">
      <!-- BTO Lead-time -->
      <div class="bg-white border rounded-xl p-6">
        <div class="text-lg font-bold text-slate-900 mb-3">BTO (Build-to-Order) Lead-time</div>
        <div class="text-sm text-slate-600 mb-4">Standard vs actual performance with improvement areas</div>

        <div class="grid grid-cols-2 gap-6 mb-4">
          <div class="bg-blue-50 border-2 border-blue-400 rounded-xl p-4 text-center">
            <div class="text-xs font-semibold text-slate-700 mb-2">Standard BTO Lead-time</div>
            <div class="text-4xl font-bold text-blue-700">18 days</div>
          </div>
          <div class="bg-red-50 border-2 border-red-400 rounded-xl p-4 text-center">
            <div class="text-xs font-semibold text-slate-700 mb-2">Actual BTO Lead-time (Average)</div>
            <div class="text-4xl font-bold text-red-700">23 days</div>
          </div>
        </div>

        <!-- BTO Stage Breakdown with Percentiles -->
        <div class="text-sm font-semibold text-slate-700 mb-3">Weekly BTO Performance (Previous Week)</div>
        <div class="overflow-x-auto mb-6">
          <table class="w-full text-sm">
            <thead class="bg-slate-100">
              <tr>
                <th class="px-4 py-3 text-left font-semibold text-slate-700">BTO Stage</th>
                <th class="px-4 py-3 text-right font-semibold text-slate-700">Standard</th>
                <th class="px-4 py-3 text-right font-semibold text-slate-700 bg-green-50">75% Actual</th>
                <th class="px-4 py-3 text-right font-semibold text-slate-700 bg-yellow-50">90% Actual</th>
                <th class="px-4 py-3 text-right font-semibold text-slate-700 bg-blue-50">Average</th>
                <th class="px-4 py-3 text-right font-semibold text-slate-700">Gap</th>
                <th class="px-4 py-3 text-left font-semibold text-slate-700">Improvement Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y">
              <tr class="hover:bg-slate-50">
                <td class="px-4 py-3 font-medium">Order Processing</td>
                <td class="px-4 py-3 text-right">1 day</td>
                <td class="px-4 py-3 text-right bg-green-50 font-semibold text-green-700">1.2</td>
                <td class="px-4 py-3 text-right bg-yellow-50 font-semibold text-yellow-700">1.7</td>
                <td class="px-4 py-3 text-right bg-blue-50 font-bold text-blue-700">1.5</td>
                <td class="px-4 py-3 text-right text-red-700">+0.5</td>
                <td class="px-4 py-3 text-xs">Automate order validation</td>
              </tr>
              <tr class="hover:bg-slate-50 bg-red-50">
                <td class="px-4 py-3 font-medium">Material Kitting</td>
                <td class="px-4 py-3 text-right">2 days</td>
                <td class="px-4 py-3 text-right bg-green-50 font-semibold text-green-700">3.5</td>
                <td class="px-4 py-3 text-right bg-yellow-50 font-semibold text-yellow-700">4.8</td>
                <td class="px-4 py-3 text-right bg-blue-50 font-bold text-blue-700">4.0</td>
                <td class="px-4 py-3 text-right text-red-700 font-bold">+2.0</td>
                <td class="px-4 py-3 text-xs font-semibold text-red-700">🔴 Pre-stage critical parts, optimize warehouse layout</td>
              </tr>
              <tr class="hover:bg-slate-50">
                <td class="px-4 py-3 font-medium">Assembly</td>
                <td class="px-4 py-3 text-right">8 days</td>
                <td class="px-4 py-3 text-right bg-green-50 font-semibold text-green-700">9.2</td>
                <td class="px-4 py-3 text-right bg-yellow-50 font-semibold text-yellow-700">10.5</td>
                <td class="px-4 py-3 text-right bg-blue-50 font-bold text-blue-700">10.0</td>
                <td class="px-4 py-3 text-right text-red-700">+2.0</td>
                <td class="px-4 py-3 text-xs">Reduce changeover time, add flex capacity</td>
              </tr>
              <tr class="hover:bg-slate-50">
                <td class="px-4 py-3 font-medium">Testing & QC</td>
                <td class="px-4 py-3 text-right">4 days</td>
                <td class="px-4 py-3 text-right bg-green-50 font-semibold text-green-700">4.2</td>
                <td class="px-4 py-3 text-right bg-yellow-50 font-semibold text-yellow-700">4.8</td>
                <td class="px-4 py-3 text-right bg-blue-50 font-bold text-blue-700">4.5</td>
                <td class="px-4 py-3 text-right text-yellow-700">+0.5</td>
                <td class="px-4 py-3 text-xs">Parallel testing for high-volume SKUs</td>
              </tr>
              <tr class="hover:bg-slate-50">
                <td class="px-4 py-3 font-medium">Packing & Shipping</td>
                <td class="px-4 py-3 text-right">3 days</td>
                <td class="px-4 py-3 text-right bg-green-50 font-semibold text-green-700">2.8</td>
                <td class="px-4 py-3 text-right bg-yellow-50 font-semibold text-yellow-700">3.2</td>
                <td class="px-4 py-3 text-right bg-blue-50 font-bold text-blue-700">3.0</td>
                <td class="px-4 py-3 text-right text-green-700">0.0</td>
                <td class="px-4 py-3 text-xs text-green-700">✅ Meeting standard</td>
              </tr>
              <tr class="bg-slate-100 font-bold">
                <td class="px-4 py-3">Total BTO Lead-time</td>
                <td class="px-4 py-3 text-right">18</td>
                <td class="px-4 py-3 text-right bg-green-50 text-green-700">20.9</td>
                <td class="px-4 py-3 text-right bg-yellow-50 text-yellow-700">25.0</td>
                <td class="px-4 py-3 text-right bg-blue-50 text-blue-700 text-lg">23.0</td>
                <td class="px-4 py-3 text-right text-red-700 text-lg">+5.0</td>
                <td class="px-4 py-3"></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mb-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
          <div class="text-xs font-semibold text-blue-900 mb-1">📊 Percentile Explanation</div>
          <div class="text-sm text-blue-900">
            <strong>75% Actual:</strong> 75% of orders complete within this time.
            <strong>90% Actual:</strong> 90% of orders complete within this time.
            <strong>Average:</strong> Mean lead-time across all orders.
          </div>
        </div>

        <!-- BTO Monthly Tracking -->
        <div class="mt-6">
          <div class="text-sm font-semibold text-slate-700 mb-3">BTO Monthly Lead-time Tracking</div>
          <div class="text-xs text-slate-600 mb-3">Plan values are set at beginning of year. Actual values updated at beginning of each month for the previous month.</div>

          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-slate-100">
                <tr>
                  <th class="px-3 py-2 text-left font-semibold text-slate-700">Metric</th>
                  <th class="px-3 py-2 text-center font-semibold text-slate-700">Jan</th>
                  <th class="px-3 py-2 text-center font-semibold text-slate-700">Feb</th>
                  <th class="px-3 py-2 text-center font-semibold text-slate-700">Mar</th>
                  <th class="px-3 py-2 text-center font-semibold text-slate-700">Apr</th>
                  <th class="px-3 py-2 text-center font-semibold text-slate-700">May</th>
                  <th class="px-3 py-2 text-center font-semibold text-slate-700">Jun</th>
                  <th class="px-3 py-2 text-center font-semibold text-slate-700">Jul</th>
                  <th class="px-3 py-2 text-center font-semibold text-slate-700">Aug</th>
                  <th class="px-3 py-2 text-center font-semibold text-slate-700">Sep</th>
                  <th class="px-3 py-2 text-center font-semibold text-slate-700">Oct</th>
                  <th class="px-3 py-2 text-center font-semibold text-slate-700">Nov</th>
                  <th class="px-3 py-2 text-center font-semibold text-slate-700">Dec</th>
                </tr>
              </thead>
              <tbody>
                <tr class="bg-blue-50 hover:bg-blue-100">
                  <td class="px-3 py-3 font-semibold text-slate-900">Plan (Days)</td>
                  <td class="px-3 py-3 text-center text-blue-700 font-semibold">18.0</td>
                  <td class="px-3 py-3 text-center text-blue-700 font-semibold">18.0</td>
                  <td class="px-3 py-3 text-center text-blue-700 font-semibold">18.0</td>
                  <td class="px-3 py-3 text-center text-blue-700 font-semibold">18.0</td>
                  <td class="px-3 py-3 text-center text-blue-700 font-semibold">18.0</td>
                  <td class="px-3 py-3 text-center text-blue-700 font-semibold">18.0</td>
                  <td class="px-3 py-3 text-center text-blue-700 font-semibold">18.0</td>
                  <td class="px-3 py-3 text-center text-blue-700 font-semibold">18.0</td>
                  <td class="px-3 py-3 text-center text-blue-700 font-semibold">18.0</td>
                  <td class="px-3 py-3 text-center text-blue-700 font-semibold">18.0</td>
                  <td class="px-3 py-3 text-center text-blue-700 font-semibold">18.0</td>
                  <td class="px-3 py-3 text-center text-blue-700 font-semibold">18.0</td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="px-3 py-3 font-semibold text-slate-900">Actual (Days)</td>
                  <td class="px-3 py-3 text-center bg-red-50 font-bold text-red-700">23.2</td>
                  <td class="px-3 py-3 text-center text-slate-400">—</td>
                  <td class="px-3 py-3 text-center text-slate-400">—</td>
                  <td class="px-3 py-3 text-center text-slate-400">—</td>
                  <td class="px-3 py-3 text-center text-slate-400">—</td>
                  <td class="px-3 py-3 text-center text-slate-400">—</td>
                  <td class="px-3 py-3 text-center text-slate-400">—</td>
                  <td class="px-3 py-3 text-center text-slate-400">—</td>
                  <td class="px-3 py-3 text-center text-slate-400">—</td>
                  <td class="px-3 py-3 text-center text-slate-400">—</td>
                  <td class="px-3 py-3 text-center text-slate-400">—</td>
                  <td class="px-3 py-3 text-center text-slate-400">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- CTO Lead-time -->
      <div class="bg-white border rounded-xl p-6">
        <div class="text-lg font-bold text-slate-900 mb-3">CTO (Configure-to-Order) Lead-time</div>
        <div class="text-sm text-slate-600 mb-4">Standard vs actual performance with improvement areas</div>

        <div class="grid grid-cols-2 gap-6 mb-4">
          <div class="bg-blue-50 border-2 border-blue-400 rounded-xl p-4 text-center">
            <div class="text-xs font-semibold text-slate-700 mb-2">Standard CTO Lead-time</div>
            <div class="text-4xl font-bold text-blue-700">12 days</div>
          </div>
          <div class="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-4 text-center">
            <div class="text-xs font-semibold text-slate-700 mb-2">Actual CTO Lead-time (Average)</div>
            <div class="text-4xl font-bold text-yellow-700">14 days</div>
          </div>
        </div>

        <!-- CTO Stage Breakdown with Percentiles -->
        <div class="text-sm font-semibold text-slate-700 mb-3">Weekly CTO Performance (Previous Week)</div>
        <div class="overflow-x-auto mb-6">
          <table class="w-full text-sm">
            <thead class="bg-slate-100">
              <tr>
                <th class="px-4 py-3 text-left font-semibold text-slate-700">CTO Stage</th>
                <th class="px-4 py-3 text-right font-semibold text-slate-700">Standard</th>
                <th class="px-4 py-3 text-right font-semibold text-slate-700 bg-green-50">75% Actual</th>
                <th class="px-4 py-3 text-right font-semibold text-slate-700 bg-yellow-50">90% Actual</th>
                <th class="px-4 py-3 text-right font-semibold text-slate-700 bg-blue-50">Average</th>
                <th class="px-4 py-3 text-right font-semibold text-slate-700">Gap</th>
                <th class="px-4 py-3 text-left font-semibold text-slate-700">Improvement Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y">
              <tr class="hover:bg-slate-50">
                <td class="px-4 py-3 font-medium">Configuration Design</td>
                <td class="px-4 py-3 text-right">1 day</td>
                <td class="px-4 py-3 text-right bg-green-50 font-semibold text-green-700">0.9</td>
                <td class="px-4 py-3 text-right bg-yellow-50 font-semibold text-yellow-700">1.1</td>
                <td class="px-4 py-3 text-right bg-blue-50 font-bold text-blue-700">1.0</td>
                <td class="px-4 py-3 text-right text-green-700">0.0</td>
                <td class="px-4 py-3 text-xs text-green-700">✅ Meeting standard</td>
              </tr>
              <tr class="hover:bg-slate-50 bg-yellow-50">
                <td class="px-4 py-3 font-medium">Part Sourcing</td>
                <td class="px-4 py-3 text-right">3 days</td>
                <td class="px-4 py-3 text-right bg-green-50 font-semibold text-green-700">3.5</td>
                <td class="px-4 py-3 text-right bg-yellow-50 font-semibold text-yellow-700">4.5</td>
                <td class="px-4 py-3 text-right bg-blue-50 font-bold text-blue-700">4.0</td>
                <td class="px-4 py-3 text-right text-yellow-700 font-bold">+1.0</td>
                <td class="px-4 py-3 text-xs font-semibold text-yellow-700">⚠️ Buffer stock for common configs</td>
              </tr>
              <tr class="hover:bg-slate-50">
                <td class="px-4 py-3 font-medium">Custom Assembly</td>
                <td class="px-4 py-3 text-right">5 days</td>
                <td class="px-4 py-3 text-right bg-green-50 font-semibold text-green-700">5.5</td>
                <td class="px-4 py-3 text-right bg-yellow-50 font-semibold text-yellow-700">6.5</td>
                <td class="px-4 py-3 text-right bg-blue-50 font-bold text-blue-700">6.0</td>
                <td class="px-4 py-3 text-right text-yellow-700">+1.0</td>
                <td class="px-4 py-3 text-xs">Dedicated CTO line, reduce setup time</td>
              </tr>
              <tr class="hover:bg-slate-50">
                <td class="px-4 py-3 font-medium">Final Test</td>
                <td class="px-4 py-3 text-right">2 days</td>
                <td class="px-4 py-3 text-right bg-green-50 font-semibold text-green-700">1.9</td>
                <td class="px-4 py-3 text-right bg-yellow-50 font-semibold text-yellow-700">2.2</td>
                <td class="px-4 py-3 text-right bg-blue-50 font-bold text-blue-700">2.0</td>
                <td class="px-4 py-3 text-right text-green-700">0.0</td>
                <td class="px-4 py-3 text-xs text-green-700">✅ Meeting standard</td>
              </tr>
              <tr class="hover:bg-slate-50">
                <td class="px-4 py-3 font-medium">Fulfillment</td>
                <td class="px-4 py-3 text-right">1 day</td>
                <td class="px-4 py-3 text-right bg-green-50 font-semibold text-green-700">0.9</td>
                <td class="px-4 py-3 text-right bg-yellow-50 font-semibold text-yellow-700">1.1</td>
                <td class="px-4 py-3 text-right bg-blue-50 font-bold text-blue-700">1.0</td>
                <td class="px-4 py-3 text-right text-green-700">0.0</td>
                <td class="px-4 py-3 text-xs text-green-700">✅ Meeting standard</td>
              </tr>
              <tr class="bg-slate-100 font-bold">
                <td class="px-4 py-3">Total CTO Lead-time</td>
                <td class="px-4 py-3 text-right">12</td>
                <td class="px-4 py-3 text-right bg-green-50 text-green-700">12.7</td>
                <td class="px-4 py-3 text-right bg-yellow-50 text-yellow-700">15.4</td>
                <td class="px-4 py-3 text-right bg-blue-50 text-blue-700 text-lg">14.0</td>
                <td class="px-4 py-3 text-right text-yellow-700 text-lg">+2.0</td>
                <td class="px-4 py-3"></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mb-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
          <div class="text-xs font-semibold text-blue-900 mb-1">📊 Percentile Explanation</div>
          <div class="text-sm text-blue-900">
            <strong>75% Actual:</strong> 75% of orders complete within this time.
            <strong>90% Actual:</strong> 90% of orders complete within this time.
            <strong>Average:</strong> Mean lead-time across all orders.
          </div>
        </div>

        <!-- CTO Monthly Tracking -->
        <div class="mt-6">
          <div class="text-sm font-semibold text-slate-700 mb-3">CTO Monthly Lead-time Tracking</div>
          <div class="text-xs text-slate-600 mb-3">Plan values are set at beginning of year. Actual values updated at beginning of each month for the previous month.</div>

          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-slate-100">
                <tr>
                  <th class="px-3 py-2 text-left font-semibold text-slate-700">Metric</th>
                  <th class="px-3 py-2 text-center font-semibold text-slate-700">Jan</th>
                  <th class="px-3 py-2 text-center font-semibold text-slate-700">Feb</th>
                  <th class="px-3 py-2 text-center font-semibold text-slate-700">Mar</th>
                  <th class="px-3 py-2 text-center font-semibold text-slate-700">Apr</th>
                  <th class="px-3 py-2 text-center font-semibold text-slate-700">May</th>
                  <th class="px-3 py-2 text-center font-semibold text-slate-700">Jun</th>
                  <th class="px-3 py-2 text-center font-semibold text-slate-700">Jul</th>
                  <th class="px-3 py-2 text-center font-semibold text-slate-700">Aug</th>
                  <th class="px-3 py-2 text-center font-semibold text-slate-700">Sep</th>
                  <th class="px-3 py-2 text-center font-semibold text-slate-700">Oct</th>
                  <th class="px-3 py-2 text-center font-semibold text-slate-700">Nov</th>
                  <th class="px-3 py-2 text-center font-semibold text-slate-700">Dec</th>
                </tr>
              </thead>
              <tbody>
                <tr class="bg-blue-50 hover:bg-blue-100">
                  <td class="px-3 py-3 font-semibold text-slate-900">Plan (Days)</td>
                  <td class="px-3 py-3 text-center text-blue-700 font-semibold">12.0</td>
                  <td class="px-3 py-3 text-center text-blue-700 font-semibold">12.0</td>
                  <td class="px-3 py-3 text-center text-blue-700 font-semibold">12.0</td>
                  <td class="px-3 py-3 text-center text-blue-700 font-semibold">12.0</td>
                  <td class="px-3 py-3 text-center text-blue-700 font-semibold">12.0</td>
                  <td class="px-3 py-3 text-center text-blue-700 font-semibold">12.0</td>
                  <td class="px-3 py-3 text-center text-blue-700 font-semibold">12.0</td>
                  <td class="px-3 py-3 text-center text-blue-700 font-semibold">12.0</td>
                  <td class="px-3 py-3 text-center text-blue-700 font-semibold">12.0</td>
                  <td class="px-3 py-3 text-center text-blue-700 font-semibold">12.0</td>
                  <td class="px-3 py-3 text-center text-blue-700 font-semibold">12.0</td>
                  <td class="px-3 py-3 text-center text-blue-700 font-semibold">12.0</td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="px-3 py-3 font-semibold text-slate-900">Actual (Days)</td>
                  <td class="px-3 py-3 text-center bg-yellow-50 font-bold text-yellow-700">13.8</td>
                  <td class="px-3 py-3 text-center text-slate-400">—</td>
                  <td class="px-3 py-3 text-center text-slate-400">—</td>
                  <td class="px-3 py-3 text-center text-slate-400">—</td>
                  <td class="px-3 py-3 text-center text-slate-400">—</td>
                  <td class="px-3 py-3 text-center text-slate-400">—</td>
                  <td class="px-3 py-3 text-center text-slate-400">—</td>
                  <td class="px-3 py-3 text-center text-slate-400">—</td>
                  <td class="px-3 py-3 text-center text-slate-400">—</td>
                  <td class="px-3 py-3 text-center text-slate-400">—</td>
                  <td class="px-3 py-3 text-center text-slate-400">—</td>
                  <td class="px-3 py-3 text-center text-slate-400">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  $("content").innerHTML = html;
}

// 5. FV Management
function renderFVManagement() {
  const html = `
    <div class="bg-white border rounded-xl p-6">
      <div class="text-lg font-bold text-slate-900 mb-3">FV Tracker (Factory Variance)</div>
      <div class="text-sm text-slate-600 mb-4">Track factory variance costs by program and category - Budget vs Actual vs Negotiated</div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-3 gap-4 mb-6">
        <div class="bg-blue-50 border-2 border-blue-400 rounded-xl p-4 text-center">
          <div class="text-xs font-semibold text-slate-700 mb-2">Total Budget (2026)</div>
          <div class="text-3xl font-bold text-blue-700">$2.4M</div>
        </div>
        <div class="bg-red-50 border-2 border-red-400 rounded-xl p-4 text-center">
          <div class="text-xs font-semibold text-slate-700 mb-2">Claimed by CM</div>
          <div class="text-3xl font-bold text-red-700">$3.8M</div>
          <div class="text-xs text-red-600 font-semibold mt-1">+158% over budget</div>
        </div>
        <div class="bg-green-50 border-2 border-green-400 rounded-xl p-4 text-center">
          <div class="text-xs font-semibold text-slate-700 mb-2">Final After Negotiation</div>
          <div class="text-3xl font-bold text-green-700">$2.9M</div>
          <div class="text-xs text-green-600 font-semibold mt-1">Saved $900K (24%)</div>
        </div>
      </div>

      <!-- Category Breakdown -->
      <div class="mb-6">
        <div class="text-sm font-semibold text-slate-700 mb-3">By Category (2026 Annual)</div>

        <div class="space-y-4">
          <!-- VXR Category -->
          <div class="border rounded-lg overflow-hidden">
            <div class="bg-slate-100 px-4 py-2 font-semibold text-sm border-b">VXR (Stinson, Ventura)</div>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-slate-50">
                  <tr>
                    <th class="px-4 py-2 text-left font-semibold text-slate-700">Program</th>
                    <th class="px-4 py-2 text-right font-semibold text-slate-700">Budget</th>
                    <th class="px-4 py-2 text-right font-semibold text-slate-700">Claimed by CM</th>
                    <th class="px-4 py-2 text-right font-semibold text-slate-700">Final (Negotiated)</th>
                    <th class="px-4 py-2 text-right font-semibold text-slate-700">Savings</th>
                    <th class="px-4 py-2 text-left font-semibold text-slate-700">vs Budget</th>
                  </tr>
                </thead>
                <tbody class="divide-y">
                  <tr class="hover:bg-slate-50">
                    <td class="px-4 py-2 font-medium">Stinson</td>
                    <td class="px-4 py-2 text-right">$850K</td>
                    <td class="px-4 py-2 text-right font-bold text-red-700">$1,450K</td>
                    <td class="px-4 py-2 text-right font-bold text-blue-700">$1,050K</td>
                    <td class="px-4 py-2 text-right text-green-700 font-semibold">$400K</td>
                    <td class="px-4 py-2">
                      <span class="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">+24% over</span>
                    </td>
                  </tr>
                  <tr class="hover:bg-slate-50">
                    <td class="px-4 py-2 font-medium">Ventura</td>
                    <td class="px-4 py-2 text-right">$620K</td>
                    <td class="px-4 py-2 text-right font-bold text-red-700">$980K</td>
                    <td class="px-4 py-2 text-right font-bold text-blue-700">$710K</td>
                    <td class="px-4 py-2 text-right text-green-700 font-semibold">$270K</td>
                    <td class="px-4 py-2">
                      <span class="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">+15% over</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Wearables Category -->
          <div class="border rounded-lg overflow-hidden">
            <div class="bg-slate-100 px-4 py-2 font-semibold text-sm border-b">Wearables (Hypernova, Ceres)</div>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-slate-50">
                  <tr>
                    <th class="px-4 py-2 text-left font-semibold text-slate-700">Program</th>
                    <th class="px-4 py-2 text-right font-semibold text-slate-700">Budget</th>
                    <th class="px-4 py-2 text-right font-semibold text-slate-700">Claimed by CM</th>
                    <th class="px-4 py-2 text-right font-semibold text-slate-700">Final (Negotiated)</th>
                    <th class="px-4 py-2 text-right font-semibold text-slate-700">Savings</th>
                    <th class="px-4 py-2 text-left font-semibold text-slate-700">vs Budget</th>
                  </tr>
                </thead>
                <tbody class="divide-y">
                  <tr class="hover:bg-slate-50">
                    <td class="px-4 py-2 font-medium">Hypernova</td>
                    <td class="px-4 py-2 text-right">$480K</td>
                    <td class="px-4 py-2 text-right font-bold text-red-700">$720K</td>
                    <td class="px-4 py-2 text-right font-bold text-blue-700">$550K</td>
                    <td class="px-4 py-2 text-right text-green-700 font-semibold">$170K</td>
                    <td class="px-4 py-2">
                      <span class="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">+15% over</span>
                    </td>
                  </tr>
                  <tr class="hover:bg-slate-50">
                    <td class="px-4 py-2 font-medium">Ceres</td>
                    <td class="px-4 py-2 text-right">$320K</td>
                    <td class="px-4 py-2 text-right font-bold text-red-700">$520K</td>
                    <td class="px-4 py-2 text-right font-bold text-blue-700">$380K</td>
                    <td class="px-4 py-2 text-right text-green-700 font-semibold">$140K</td>
                    <td class="px-4 py-2">
                      <span class="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">+19% over</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Smart Glasses Category -->
          <div class="border rounded-lg overflow-hidden">
            <div class="bg-slate-100 px-4 py-2 font-semibold text-sm border-b">Smart Glasses (RBM 2.0, Sprize, Charging Case)</div>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-slate-50">
                  <tr>
                    <th class="px-4 py-2 text-left font-semibold text-slate-700">Program</th>
                    <th class="px-4 py-2 text-right font-semibold text-slate-700">Budget</th>
                    <th class="px-4 py-2 text-right font-semibold text-slate-700">Claimed by CM</th>
                    <th class="px-4 py-2 text-right font-semibold text-slate-700">Final (Negotiated)</th>
                    <th class="px-4 py-2 text-right font-semibold text-slate-700">Savings</th>
                    <th class="px-4 py-2 text-left font-semibold text-slate-700">vs Budget</th>
                  </tr>
                </thead>
                <tbody class="divide-y">
                  <tr class="hover:bg-slate-50">
                    <td class="px-4 py-2 font-medium">RBM 2.0</td>
                    <td class="px-4 py-2 text-right">$180K</td>
                    <td class="px-4 py-2 text-right font-bold text-red-700">$280K</td>
                    <td class="px-4 py-2 text-right font-bold text-blue-700">$210K</td>
                    <td class="px-4 py-2 text-right text-green-700 font-semibold">$70K</td>
                    <td class="px-4 py-2">
                      <span class="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">+17% over</span>
                    </td>
                  </tr>
                  <tr class="hover:bg-slate-50">
                    <td class="px-4 py-2 font-medium">Sprize</td>
                    <td class="px-4 py-2 text-right">$90K</td>
                    <td class="px-4 py-2 text-right font-bold text-red-700">$145K</td>
                    <td class="px-4 py-2 text-right font-bold text-blue-700">$105K</td>
                    <td class="px-4 py-2 text-right text-green-700 font-semibold">$40K</td>
                    <td class="px-4 py-2">
                      <span class="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">+17% over</span>
                    </td>
                  </tr>
                  <tr class="hover:bg-slate-50">
                    <td class="px-4 py-2 font-medium">Charging Case</td>
                    <td class="px-4 py-2 text-right">$60K</td>
                    <td class="px-4 py-2 text-right font-bold text-red-700">$105K</td>
                    <td class="px-4 py-2 text-right font-bold text-blue-700">$70K</td>
                    <td class="px-4 py-2 text-right text-green-700 font-semibold">$35K</td>
                    <td class="px-4 py-2">
                      <span class="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">+17% over</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Key Insights -->
      <div class="grid grid-cols-2 gap-4">
        <div class="bg-green-50 border-l-4 border-green-500 rounded p-4">
          <div class="text-xs font-semibold text-green-900 mb-2">💰 Negotiation Success</div>
          <div class="text-sm text-green-900">Team successfully negotiated down $900K (24%) from initial CM claims, demonstrating strong cost control.</div>
        </div>
        <div class="bg-yellow-50 border-l-4 border-yellow-500 rounded p-4">
          <div class="text-xs font-semibold text-yellow-900 mb-2">⚠️ Budget Pressure</div>
          <div class="text-sm text-yellow-900">Final costs still 21% over budget ($2.9M vs $2.4M). Consider tighter variance controls and prevention strategies for next year.</div>
        </div>
      </div>
    </div>
  `;

  $("content").innerHTML = html;
}

// 6. Labor Fulfillment
function renderLaborFulfillment() {
  const html = `
    <div class="space-y-4">
      <!-- Overview Card -->
      <div class="bg-white border rounded-xl p-6">
        <div class="text-lg font-bold text-slate-900 mb-3">Labor Fulfillment — Weekly Headcount Status</div>
        <div class="text-sm text-slate-600 mb-4">Monitor weekly labor availability and fulfillment across all factory sites</div>

        <!-- Summary Metrics -->
        <div class="grid grid-cols-4 gap-4 mb-6">
          <div class="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-400 rounded-xl p-4 text-center">
            <div class="text-xs font-semibold text-slate-700 mb-2">Overall Fulfillment</div>
            <div class="text-4xl font-bold text-green-700 mb-1">96%</div>
            <div class="inline-block px-2 py-1 bg-green-100 border border-green-300 rounded text-xs font-semibold text-green-800">EXCELLENT</div>
          </div>
          <div class="bg-blue-50 border-2 border-blue-400 rounded-xl p-4 text-center">
            <div class="text-xs font-semibold text-slate-700 mb-2">Total Headcount Needed</div>
            <div class="text-3xl font-bold text-blue-700">2,450</div>
            <div class="text-xs text-slate-600 mt-1">Direct Labor</div>
          </div>
          <div class="bg-green-50 border-2 border-green-400 rounded-xl p-4 text-center">
            <div class="text-xs font-semibold text-slate-700 mb-2">Current Headcount</div>
            <div class="text-3xl font-bold text-green-700">2,352</div>
            <div class="text-xs text-slate-600 mt-1">+45 temp workers</div>
          </div>
          <div class="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-4 text-center">
            <div class="text-xs font-semibold text-slate-700 mb-2">Gap</div>
            <div class="text-3xl font-bold text-yellow-700">-98</div>
            <div class="text-xs text-slate-600 mt-1">4% shortage</div>
          </div>
        </div>

        <!-- Weekly Trend Chart Placeholder -->
        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border rounded-xl p-6 mb-6">
          <div class="text-sm font-semibold text-slate-700 mb-4">12-Week Labor Fulfillment Trend</div>
          <div class="flex items-end justify-between gap-2 h-40">
            <div class="flex-1 flex flex-col justify-end items-center">
              <div class="w-full bg-green-400 rounded-t" style="height: 92%"></div>
              <div class="text-xs text-slate-600 mt-2">W49</div>
              <div class="text-xs font-semibold text-green-700">92%</div>
            </div>
            <div class="flex-1 flex flex-col justify-end items-center">
              <div class="w-full bg-green-400 rounded-t" style="height: 94%"></div>
              <div class="text-xs text-slate-600 mt-2">W50</div>
              <div class="text-xs font-semibold text-green-700">94%</div>
            </div>
            <div class="flex-1 flex flex-col justify-end items-center">
              <div class="w-full bg-green-400 rounded-t" style="height: 95%"></div>
              <div class="text-xs text-slate-600 mt-2">W51</div>
              <div class="text-xs font-semibold text-green-700">95%</div>
            </div>
            <div class="flex-1 flex flex-col justify-end items-center">
              <div class="w-full bg-yellow-400 rounded-t" style="height: 89%"></div>
              <div class="text-xs text-slate-600 mt-2">W52</div>
              <div class="text-xs font-semibold text-yellow-700">89%</div>
            </div>
            <div class="flex-1 flex flex-col justify-end items-center">
              <div class="w-full bg-yellow-400 rounded-t" style="height: 88%"></div>
              <div class="text-xs text-slate-600 mt-2">W01</div>
              <div class="text-xs font-semibold text-yellow-700">88%</div>
            </div>
            <div class="flex-1 flex flex-col justify-end items-center">
              <div class="w-full bg-green-400 rounded-t" style="height: 93%"></div>
              <div class="text-xs text-slate-600 mt-2">W02</div>
              <div class="text-xs font-semibold text-green-700">93%</div>
            </div>
            <div class="flex-1 flex flex-col justify-end items-center">
              <div class="w-full bg-green-400 rounded-t" style="height: 95%"></div>
              <div class="text-xs text-slate-600 mt-2">W03</div>
              <div class="text-xs font-semibold text-green-700">95%</div>
            </div>
            <div class="flex-1 flex flex-col justify-end items-center border-2 border-blue-500 rounded-t">
              <div class="w-full bg-green-400 rounded-t" style="height: 96%"></div>
              <div class="text-xs text-blue-600 mt-2 font-bold">W04</div>
              <div class="text-xs font-semibold text-green-700">96%</div>
            </div>
            <div class="flex-1 flex flex-col justify-end items-center opacity-50">
              <div class="w-full bg-slate-300 rounded-t" style="height: 95%"></div>
              <div class="text-xs text-slate-500 mt-2">W05</div>
              <div class="text-xs text-slate-500">95%</div>
            </div>
            <div class="flex-1 flex flex-col justify-end items-center opacity-50">
              <div class="w-full bg-slate-300 rounded-t" style="height: 94%"></div>
              <div class="text-xs text-slate-500 mt-2">W06</div>
              <div class="text-xs text-slate-500">94%</div>
            </div>
            <div class="flex-1 flex flex-col justify-end items-center opacity-50">
              <div class="w-full bg-slate-300 rounded-t" style="height: 96%"></div>
              <div class="text-xs text-slate-500 mt-2">W07</div>
              <div class="text-xs text-slate-500">96%</div>
            </div>
            <div class="flex-1 flex flex-col justify-end items-center opacity-50">
              <div class="w-full bg-slate-300 rounded-t" style="height: 97%"></div>
              <div class="text-xs text-slate-500 mt-2">W08</div>
              <div class="text-xs text-slate-500">97%</div>
            </div>
          </div>
          <div class="flex items-center justify-center gap-4 mt-4 text-xs">
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 bg-green-400 rounded"></div>
              <span>≥90% (Good)</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 bg-yellow-400 rounded"></div>
              <span>80-90% (At Risk)</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 bg-slate-300 rounded"></div>
              <span>Forecast</span>
            </div>
          </div>
        </div>
      </div>

      <!-- By Factory Site -->
      <div class="bg-white border rounded-xl p-6">
        <div class="text-lg font-bold text-slate-900 mb-3">Headcount by Factory Site (Week 2026-W04)</div>
        
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-100">
              <tr>
                <th class="px-4 py-3 text-left font-semibold text-slate-700">Factory Site</th>
                <th class="px-4 py-3 text-right font-semibold text-slate-700">Required</th>
                <th class="px-4 py-3 text-right font-semibold text-slate-700">Direct Labor</th>
                <th class="px-4 py-3 text-right font-semibold text-slate-700">Temp Workers</th>
                <th class="px-4 py-3 text-right font-semibold text-slate-700">Total Available</th>
                <th class="px-4 py-3 text-right font-semibold text-slate-700">Gap</th>
                <th class="px-4 py-3 text-right font-semibold text-slate-700">Fulfillment %</th>
                <th class="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y">
              <tr class="hover:bg-slate-50">
                <td class="px-4 py-3 font-medium">WF (CN)</td>
                <td class="px-4 py-3 text-right">1,450</td>
                <td class="px-4 py-3 text-right">1,420</td>
                <td class="px-4 py-3 text-right">25</td>
                <td class="px-4 py-3 text-right font-bold">1,445</td>
                <td class="px-4 py-3 text-right text-yellow-700">-5</td>
                <td class="px-4 py-3 text-right font-bold text-green-700">99.7%</td>
                <td class="px-4 py-3">
                  <span class="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">✅ Excellent</span>
                </td>
              </tr>
              <tr class="hover:bg-slate-50">
                <td class="px-4 py-3 font-medium">VN-02 (VN)</td>
                <td class="px-4 py-3 text-right">850</td>
                <td class="px-4 py-3 text-right">782</td>
                <td class="px-4 py-3 text-right">20</td>
                <td class="px-4 py-3 text-right font-bold">802</td>
                <td class="px-4 py-3 text-right text-red-700 font-bold">-48</td>
                <td class="px-4 py-3 text-right font-bold text-yellow-700">94.4%</td>
                <td class="px-4 py-3">
                  <span class="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">⚠️ Below Target</span>
                </td>
              </tr>
              <tr class="hover:bg-slate-50 bg-yellow-50">
                <td class="px-4 py-3 font-medium">SZ-01 (CN)</td>
                <td class="px-4 py-3 text-right">150</td>
                <td class="px-4 py-3 text-right">150</td>
                <td class="px-4 py-3 text-right">0</td>
                <td class="px-4 py-3 text-right font-bold">150</td>
                <td class="px-4 py-3 text-right text-green-700">0</td>
                <td class="px-4 py-3 text-right font-bold text-green-700">100%</td>
                <td class="px-4 py-3">
                  <span class="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">✅ Perfect</span>
                </td>
              </tr>
              <tr class="bg-slate-100 font-bold">
                <td class="px-4 py-3">Total</td>
                <td class="px-4 py-3 text-right">2,450</td>
                <td class="px-4 py-3 text-right">2,352</td>
                <td class="px-4 py-3 text-right">45</td>
                <td class="px-4 py-3 text-right">2,397</td>
                <td class="px-4 py-3 text-right text-red-700">-53</td>
                <td class="px-4 py-3 text-right text-lg text-green-700">97.8%</td>
                <td class="px-4 py-3"></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
          <div class="text-xs font-semibold text-yellow-900 mb-2">⚠️ Action Required</div>
          <div class="text-sm text-yellow-900">VN-02 site has a 48-person shortage (5.6% below target). Recommend recruiting additional temp workers or shifting capacity to WF for critical programs.</div>
        </div>
      </div>

      <!-- By Shift -->
      <div class="bg-white border rounded-xl p-6">
        <div class="text-lg font-bold text-slate-900 mb-3">Labor Distribution by Shift</div>
        
        <div class="grid grid-cols-3 gap-4">
          <div class="border rounded-lg p-4">
            <div class="text-xs text-slate-600 font-semibold mb-2">Day Shift (7am - 7pm)</div>
            <div class="text-3xl font-bold text-slate-900 mb-2">1,450</div>
            <div class="flex items-center gap-2 text-xs">
              <div class="flex-1 bg-slate-200 rounded-full h-2">
                <div class="bg-green-500 h-2 rounded-full" style="width: 98%"></div>
              </div>
              <span class="text-green-700 font-semibold">98%</span>
            </div>
            <div class="text-xs text-slate-600 mt-2">Required: 1,480</div>
          </div>

          <div class="border rounded-lg p-4">
            <div class="text-xs text-slate-600 font-semibold mb-2">Night Shift (7pm - 7am)</div>
            <div class="text-3xl font-bold text-slate-900 mb-2">780</div>
            <div class="flex items-center gap-2 text-xs">
              <div class="flex-1 bg-slate-200 rounded-full h-2">
                <div class="bg-yellow-500 h-2 rounded-full" style="width: 93%"></div>
              </div>
              <span class="text-yellow-700 font-semibold">93%</span>
            </div>
            <div class="text-xs text-slate-600 mt-2">Required: 840</div>
          </div>

          <div class="border rounded-lg p-4">
            <div class="text-xs text-slate-600 font-semibold mb-2">Weekend Shift (Sat-Sun)</div>
            <div class="text-3xl font-bold text-slate-900 mb-2">167</div>
            <div class="flex items-center gap-2 text-xs">
              <div class="flex-1 bg-slate-200 rounded-full h-2">
                <div class="bg-red-500 h-2 rounded-full" style="width: 64%"></div>
              </div>
              <span class="text-red-700 font-semibold">64%</span>
            </div>
            <div class="text-xs text-slate-600 mt-2">Required: 260</div>
          </div>
        </div>

        <div class="mt-4 p-4 bg-red-50 border-l-4 border-red-500 rounded">
          <div class="text-xs font-semibold text-red-900 mb-2">🔴 Critical Shortage</div>
          <div class="text-sm text-red-900">Weekend shift is significantly under-staffed (36% shortage). This impacts ability to run accelerated production schedules. Immediate action required.</div>
        </div>
      </div>
    </div>
  `;

  $("content").innerHTML = html;
}

// 7. Campus Readiness
function renderCampusReadiness() {
  const html = `
    <div class="space-y-4">
      <!-- Overview -->
      <div class="bg-white border rounded-xl p-6">
        <div class="text-lg font-bold text-slate-900 mb-3">Campus Status — Location & Space Utilization</div>
        <div class="text-sm text-slate-600 mb-4">Monitor program distribution across campuses and facility utilization</div>

        <!-- Summary Metrics -->
        <div class="grid grid-cols-4 gap-4 mb-6">
          <div class="bg-blue-50 border-2 border-blue-400 rounded-xl p-4 text-center">
            <div class="text-xs font-semibold text-slate-700 mb-2">Total Campuses</div>
            <div class="text-4xl font-bold text-blue-700">4</div>
            <div class="text-xs text-slate-600 mt-1">Active locations</div>
          </div>
          <div class="bg-purple-50 border-2 border-purple-400 rounded-xl p-4 text-center">
            <div class="text-xs font-semibold text-slate-700 mb-2">Total Buildings</div>
            <div class="text-4xl font-bold text-purple-700">12</div>
            <div class="text-xs text-slate-600 mt-1">Production facilities</div>
          </div>
          <div class="bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-400 rounded-xl p-4 text-center">
            <div class="text-xs font-semibold text-slate-700 mb-2">Avg Utilization</div>
            <div class="text-4xl font-bold text-yellow-700 mb-1">78%</div>
            <div class="inline-block px-2 py-1 bg-yellow-100 border border-yellow-300 rounded text-xs font-semibold text-yellow-800">MODERATE</div>
          </div>
          <div class="bg-green-50 border-2 border-green-400 rounded-xl p-4 text-center">
            <div class="text-xs font-semibold text-slate-700 mb-2">Available Capacity</div>
            <div class="text-4xl font-bold text-green-700">22%</div>
            <div class="text-xs text-slate-600 mt-1">For expansion</div>
          </div>
        </div>
      </div>

      <!-- Campus Distribution -->
      <div class="bg-white border rounded-xl p-6">
        <div class="text-lg font-bold text-slate-900 mb-3">Program Distribution by Campus</div>

        <div class="space-y-4">
          <!-- WF Campus (Wuxi, China) -->
          <div class="border-2 border-blue-300 rounded-xl overflow-hidden">
            <div class="bg-gradient-to-r from-blue-100 to-indigo-100 px-4 py-3 flex items-center justify-between">
              <div>
                <div class="font-bold text-lg text-slate-900">WF Campus (Wuxi, China)</div>
                <div class="text-sm text-slate-600">Primary production site for Product A & C</div>
              </div>
              <div class="text-right">
                <div class="text-2xl font-bold text-blue-700">82%</div>
                <div class="text-xs text-slate-600">Utilization</div>
              </div>
            </div>

            <div class="p-4">
              <table class="w-full text-sm">
                <thead class="bg-slate-50">
                  <tr>
                    <th class="px-3 py-2 text-left font-semibold text-slate-700">Building</th>
                    <th class="px-3 py-2 text-left font-semibold text-slate-700">Floor</th>
                    <th class="px-3 py-2 text-left font-semibold text-slate-700">Programs</th>
                    <th class="px-3 py-2 text-right font-semibold text-slate-700">Floor Space (m²)</th>
                    <th class="px-3 py-2 text-right font-semibold text-slate-700">Utilization</th>
                  </tr>
                </thead>
                <tbody class="divide-y">
                  <tr class="hover:bg-slate-50">
                    <td class="px-3 py-2 font-medium">Building A</td>
                    <td class="px-3 py-2">F1, F2</td>
                    <td class="px-3 py-2">Product A (SMT, Assembly)</td>
                    <td class="px-3 py-2 text-right">12,500</td>
                    <td class="px-3 py-2 text-right">
                      <div class="flex items-center gap-2 justify-end">
                        <div class="w-20 bg-slate-200 rounded-full h-2">
                          <div class="bg-green-500 h-2 rounded-full" style="width: 85%"></div>
                        </div>
                        <span class="font-semibold text-green-700">85%</span>
                      </div>
                    </td>
                  </tr>
                  <tr class="hover:bg-slate-50">
                    <td class="px-3 py-2 font-medium">Building A</td>
                    <td class="px-3 py-2">F3</td>
                    <td class="px-3 py-2">Product A (Test, Pack)</td>
                    <td class="px-3 py-2 text-right">6,800</td>
                    <td class="px-3 py-2 text-right">
                      <div class="flex items-center gap-2 justify-end">
                        <div class="w-20 bg-slate-200 rounded-full h-2">
                          <div class="bg-yellow-500 h-2 rounded-full" style="width: 92%"></div>
                        </div>
                        <span class="font-semibold text-yellow-700">92%</span>
                      </div>
                    </td>
                  </tr>
                  <tr class="hover:bg-slate-50">
                    <td class="px-3 py-2 font-medium">Building B</td>
                    <td class="px-3 py-2">F1-F3</td>
                    <td class="px-3 py-2">Product C (Full line)</td>
                    <td class="px-3 py-2 text-right">18,200</td>
                    <td class="px-3 py-2 text-right">
                      <div class="flex items-center gap-2 justify-end">
                        <div class="w-20 bg-slate-200 rounded-full h-2">
                          <div class="bg-green-500 h-2 rounded-full" style="width: 78%"></div>
                        </div>
                        <span class="font-semibold text-green-700">78%</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- VN-02 Campus (Vietnam) -->
          <div class="border-2 border-purple-300 rounded-xl overflow-hidden">
            <div class="bg-gradient-to-r from-purple-100 to-pink-100 px-4 py-3 flex items-center justify-between">
              <div>
                <div class="font-bold text-lg text-slate-900">VN-02 Campus (Ho Chi Minh, Vietnam)</div>
                <div class="text-sm text-slate-600">Secondary production site for Product A</div>
              </div>
              <div class="text-right">
                <div class="text-2xl font-bold text-purple-700">68%</div>
                <div class="text-xs text-slate-600">Utilization</div>
              </div>
            </div>

            <div class="p-4">
              <table class="w-full text-sm">
                <thead class="bg-slate-50">
                  <tr>
                    <th class="px-3 py-2 text-left font-semibold text-slate-700">Building</th>
                    <th class="px-3 py-2 text-left font-semibold text-slate-700">Floor</th>
                    <th class="px-3 py-2 text-left font-semibold text-slate-700">Programs</th>
                    <th class="px-3 py-2 text-right font-semibold text-slate-700">Floor Space (m²)</th>
                    <th class="px-3 py-2 text-right font-semibold text-slate-700">Utilization</th>
                  </tr>
                </thead>
                <tbody class="divide-y">
                  <tr class="hover:bg-slate-50">
                    <td class="px-3 py-2 font-medium">Building VN-1</td>
                    <td class="px-3 py-2">F1, F2</td>
                    <td class="px-3 py-2">Product A (Assembly, Test)</td>
                    <td class="px-3 py-2 text-right">9,500</td>
                    <td class="px-3 py-2 text-right">
                      <div class="flex items-center gap-2 justify-end">
                        <div class="w-20 bg-slate-200 rounded-full h-2">
                          <div class="bg-green-500 h-2 rounded-full" style="width: 72%"></div>
                        </div>
                        <span class="font-semibold text-green-700">72%</span>
                      </div>
                    </td>
                  </tr>
                  <tr class="hover:bg-slate-50">
                    <td class="px-3 py-2 font-medium">Building VN-2</td>
                    <td class="px-3 py-2">F1</td>
                    <td class="px-3 py-2">Warehouse & Logistics</td>
                    <td class="px-3 py-2 text-right">5,200</td>
                    <td class="px-3 py-2 text-right">
                      <div class="flex items-center gap-2 justify-end">
                        <div class="w-20 bg-slate-200 rounded-full h-2">
                          <div class="bg-green-500 h-2 rounded-full" style="width: 64%"></div>
                        </div>
                        <span class="font-semibold text-green-700">64%</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- SZ Campus (Shenzhen, China) -->
          <div class="border-2 border-green-300 rounded-xl overflow-hidden">
            <div class="bg-gradient-to-r from-green-100 to-emerald-100 px-4 py-3 flex items-center justify-between">
              <div>
                <div class="font-bold text-lg text-slate-900">SZ-01 Campus (Shenzhen, China)</div>
                <div class="text-sm text-slate-600">R&D and pilot production</div>
              </div>
              <div class="text-right">
                <div class="text-2xl font-bold text-green-700">55%</div>
                <div class="text-xs text-slate-600">Utilization</div>
              </div>
            </div>

            <div class="p-4">
              <table class="w-full text-sm">
                <thead class="bg-slate-50">
                  <tr>
                    <th class="px-3 py-2 text-left font-semibold text-slate-700">Building</th>
                    <th class="px-3 py-2 text-left font-semibold text-slate-700">Floor</th>
                    <th class="px-3 py-2 text-left font-semibold text-slate-700">Programs</th>
                    <th class="px-3 py-2 text-right font-semibold text-slate-700">Floor Space (m²)</th>
                    <th class="px-3 py-2 text-right font-semibold text-slate-700">Utilization</th>
                  </tr>
                </thead>
                <tbody class="divide-y">
                  <tr class="hover:bg-slate-50">
                    <td class="px-3 py-2 font-medium">Building SZ-A</td>
                    <td class="px-3 py-2">F2</td>
                    <td class="px-3 py-2">Product B (NPI), Product D (Pilot)</td>
                    <td class="px-3 py-2 text-right">4,200</td>
                    <td class="px-3 py-2 text-right">
                      <div class="flex items-center gap-2 justify-end">
                        <div class="w-20 bg-slate-200 rounded-full h-2">
                          <div class="bg-green-500 h-2 rounded-full" style="width: 55%"></div>
                        </div>
                        <span class="font-semibold text-green-700">55%</span>
                      </div>
                    </td>
                  </tr>
                  <tr class="hover:bg-slate-50">
                    <td class="px-3 py-2 font-medium">Building SZ-A</td>
                    <td class="px-3 py-2">F3</td>
                    <td class="px-3 py-2">Lab & Testing facilities</td>
                    <td class="px-3 py-2 text-right">3,800</td>
                    <td class="px-3 py-2 text-right">
                      <div class="flex items-center gap-2 justify-end">
                        <div class="w-20 bg-slate-200 rounded-full h-2">
                          <div class="bg-green-500 h-2 rounded-full" style="width: 55%"></div>
                        </div>
                        <span class="font-semibold text-green-700">55%</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- MX Campus (Mexico) -->
          <div class="border-2 border-orange-300 rounded-xl overflow-hidden">
            <div class="bg-gradient-to-r from-orange-100 to-red-100 px-4 py-3 flex items-center justify-between">
              <div>
                <div class="font-bold text-lg text-slate-900">MX-03 Campus (Guadalajara, Mexico)</div>
                <div class="text-sm text-slate-600">Americas production hub</div>
              </div>
              <div class="text-right">
                <div class="text-2xl font-bold text-orange-700">88%</div>
                <div class="text-xs text-slate-600">Utilization</div>
              </div>
            </div>

            <div class="p-4">
              <table class="w-full text-sm">
                <thead class="bg-slate-50">
                  <tr>
                    <th class="px-3 py-2 text-left font-semibold text-slate-700">Building</th>
                    <th class="px-3 py-2 text-left font-semibold text-slate-700">Floor</th>
                    <th class="px-3 py-2 text-left font-semibold text-slate-700">Programs</th>
                    <th class="px-3 py-2 text-right font-semibold text-slate-700">Floor Space (m²)</th>
                    <th class="px-3 py-2 text-right font-semibold text-slate-700">Utilization</th>
                  </tr>
                </thead>
                <tbody class="divide-y">
                  <tr class="hover:bg-slate-50 bg-yellow-50">
                    <td class="px-3 py-2 font-medium">Building M-1</td>
                    <td class="px-3 py-2">F1-F2</td>
                    <td class="px-3 py-2">Product B (Full line)</td>
                    <td class="px-3 py-2 text-right">11,200</td>
                    <td class="px-3 py-2 text-right">
                      <div class="flex items-center gap-2 justify-end">
                        <div class="w-20 bg-slate-200 rounded-full h-2">
                          <div class="bg-yellow-500 h-2 rounded-full" style="width: 88%"></div>
                        </div>
                        <span class="font-semibold text-yellow-700">88%</span>
                      </div>
                    </td>
                  </tr>
                  <tr class="hover:bg-slate-50">
                    <td class="px-3 py-2 font-medium">Building M-2</td>
                    <td class="px-3 py-2">F1</td>
                    <td class="px-3 py-2">Final Assembly & Pack</td>
                    <td class="px-3 py-2 text-right">6,500</td>
                    <td class="px-3 py-2 text-right">
                      <div class="flex items-center gap-2 justify-end">
                        <div class="w-20 bg-slate-200 rounded-full h-2">
                          <div class="bg-yellow-500 h-2 rounded-full" style="width: 88%"></div>
                        </div>
                        <span class="font-semibold text-yellow-700">88%</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Insights -->
      <div class="bg-white border rounded-xl p-6">
        <div class="text-lg font-bold text-slate-900 mb-3">Campus Utilization Insights</div>
        
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-green-50 border-l-4 border-green-500 rounded p-4">
            <div class="text-xs font-semibold text-green-900 mb-2">✅ Expansion Opportunity</div>
            <div class="text-sm text-green-900">VN-02 and SZ-01 campuses have significant available capacity (32-45%). Consider shifting future programs to these sites to balance utilization.</div>
          </div>
          <div class="bg-yellow-50 border-l-4 border-yellow-500 rounded p-4">
            <div class="text-xs font-semibold text-yellow-900 mb-2">⚠️ Capacity Constraint</div>
            <div class="text-sm text-yellow-900">WF Building A F3 (Test/Pack) is at 92% utilization. Near capacity limit - may become bottleneck for Product A scale-up.</div>
          </div>
          <div class="bg-blue-50 border-l-4 border-blue-500 rounded p-4">
            <div class="text-xs font-semibold text-blue-900 mb-2">💡 Optimization</div>
            <div class="text-sm text-blue-900">MX-03 campus is well-utilized (88%) but has room for 12% growth. Ideal for Americas market expansion.</div>
          </div>
          <div class="bg-purple-50 border-l-4 border-purple-500 rounded p-4">
            <div class="text-xs font-semibold text-purple-900 mb-2">📊 Planning</div>
            <div class="text-sm text-purple-900">Overall campus utilization is 78% - healthy balance between productivity and flexibility for new program ramps.</div>
          </div>
        </div>
      </div>
    </div>
  `;

  $("content").innerHTML = html;
}

// ========================================
// NAVIGATION HELPER (v3.0)
// ========================================

/**
 * Navigate to a specific view
 * @param {string} view - View name
 */
function navigateTo(view) {
  STATE.activeView = view;
  render();
}

// Export navigateTo globally
if (typeof window !== 'undefined') {
  window.navigateTo = navigateTo;
}

// ========================================
// PRODUCTION PLAN HELPERS (v2.0)
// ========================================

/**
 * Aggregate daily data by month
 */
function aggregateByMonth(dailyData) {
  const monthlyMap = {};

  dailyData.forEach(day => {
    const month = day.date.substring(0, 7); // 'YYYY-MM'

    if (!monthlyMap[month]) {
      monthlyMap[month] = {
        month_id: month,
        forecast: 0,
        ctb: 0,
        capacity: 0,
        input: 0,
        output: 0,
        shipments: 0,
        days: []
      };
    }

    monthlyMap[month].forecast += day.demand || 0;
    monthlyMap[month].ctb += day.ctb_available || day.capacity_unconstrained || 0;
    monthlyMap[month].capacity += day.capacity_unconstrained || 0;
    monthlyMap[month].input += day.input_final || 0;
    monthlyMap[month].output += day.output_final || 0;
    monthlyMap[month].shipments += day.shipment_final || 0;
    monthlyMap[month].days.push(day);
  });

  return Object.values(monthlyMap).map(month => ({
    ...month,
    gap: month.shipments - month.forecast,
    cum_forecast: month.forecast,
    cum_ctb: month.ctb,
    cum_capacity: month.capacity,
    cum_input: month.input,
    cum_output: month.output,
    cum_shipment: month.shipments
  }));
}

/**
 * Calculate summary metrics for the plan
 */
function calculatePlanSummary(dailyData) {
  if (!dailyData || dailyData.length === 0) {
    return {
      cumForecast: 0,
      cumCTB: 0,
      cumCapacity: 0,
      cumShip: 0,
      gap: 0
    };
  }

  const lastDay = dailyData[dailyData.length - 1];

  // Calculate cumulative CTB (sum of all daily CTB available)
  const cumCTB = dailyData.reduce((sum, d) => sum + (d.ctb_available || d.capacity_unconstrained || 0), 0);

  // Calculate cumulative Capacity (sum of all daily capacity)
  const cumCapacity = dailyData.reduce((sum, d) => sum + (d.capacity_unconstrained || 0), 0);

  return {
    cumForecast: lastDay?.cum_demand || 0,
    cumCTB: cumCTB,
    cumCapacity: cumCapacity,
    cumShip: lastDay?.cum_shipment || 0,
    gap: (lastDay?.cum_shipment || 0) - (lastDay?.cum_demand || 0)
  };
}

/**
 * Calculate summary up to a specific cutoff date
 */
function calculateCutoffSummary(dailyData, cutoffDate) {
  if (!dailyData || dailyData.length === 0) {
    return {
      cumForecast: 0,
      cumCTB: 0,
      cumCapacity: 0,
      cumShip: 0,
      gap: 0
    };
  }

  // Filter data up to cutoff date
  const cutoffData = dailyData.filter(d => d.date <= cutoffDate);

  if (cutoffData.length === 0) {
    return {
      cumForecast: 0,
      cumCTB: 0,
      cumCapacity: 0,
      cumShip: 0,
      gap: 0
    };
  }

  const lastDay = cutoffData[cutoffData.length - 1];

  // Calculate cumulative CTB and Capacity
  const cumCTB = cutoffData.reduce((sum, d) => sum + (d.ctb_available || d.capacity_unconstrained || 0), 0);
  const cumCapacity = cutoffData.reduce((sum, d) => sum + (d.capacity_unconstrained || 0), 0);

  return {
    cumForecast: lastDay?.cum_demand || 0,
    cumCTB: cumCTB,
    cumCapacity: cumCapacity,
    cumShip: lastDay?.cum_shipment || 0,
    gap: (lastDay?.cum_shipment || 0) - (lastDay?.cum_demand || 0)
  };
}

/**
 * Analyze primary binding constraint
 */
function analyzePrimaryConstraint(dailyData) {
  let ctbLimitedDays = 0;
  let capacityLimitedDays = 0;
  let ctbLimitedUnits = 0;
  let capacityLimitedUnits = 0;

  dailyData.forEach(day => {
    const ctb = day.ctb_available || day.capacity_unconstrained || 0;
    const capacity = day.capacity_unconstrained || 0;
    const input = day.input_final || 0;

    // Check if CTB is the binding constraint
    if (ctb < capacity && Math.abs(input - ctb) < Math.abs(input - capacity)) {
      ctbLimitedDays++;
      ctbLimitedUnits += (capacity - ctb);
    }
    // Check if Capacity is the binding constraint
    else if (capacity < ctb) {
      capacityLimitedDays++;
      capacityLimitedUnits += (ctb - capacity);
    }
  });

  const totalDays = dailyData.length;
  const primaryConstraint = ctbLimitedDays > capacityLimitedDays ? 'CTB' :
                            capacityLimitedDays > ctbLimitedDays ? 'Capacity' : 'Mixed';

  return {
    primaryConstraint,
    ctbLimitedDays,
    capacityLimitedDays,
    ctbLimitedUnits: Math.round(ctbLimitedUnits),
    capacityLimitedUnits: Math.round(capacityLimitedUnits),
    ctbLimitedPct: ((ctbLimitedDays / totalDays) * 100).toFixed(1),
    capacityLimitedPct: ((capacityLimitedDays / totalDays) * 100).toFixed(1)
  };
}

/**
 * Determine daily binding constraint
 */
function getDailyConstraint(day) {
  const ctb = day.ctb_available || day.capacity_unconstrained || 0;
  const capacity = day.capacity_unconstrained || 0;

  if (ctb === 0 && capacity === 0) return 'None';
  if (Math.abs(ctb - capacity) < 10) return 'None'; // Within tolerance

  if (ctb < capacity) return 'CTB';
  if (capacity < ctb) return 'Capacity';
  return 'None';
}

/**
 * Switch production plan granularity
 */
function switchPlanGranularity(granularity) {
  window.productionPlanState.viewGranularity = granularity;
  renderProductionPlanLatest();
}

/**
 * Generate fiscal calendar data for 2026
 * Each quarter has 13 weeks: M1=5 weeks, M2=4 weeks, M3=4 weeks
 */
function generateFiscalCalendar2026() {
  const fiscalYear = [];

  // Q1: Jan-Mar (13 weeks: 5+4+4)
  fiscalYear.push({
    quarter: 'Q1',
    months: [
      {
        month: '2026-01',
        name: 'January 2026',
        weeks: 5,
        weekDetails: [
          { week: '2026-W01', start: '2025-12-28', end: '2026-01-03' },
          { week: '2026-W02', start: '2026-01-04', end: '2026-01-10' },
          { week: '2026-W03', start: '2026-01-11', end: '2026-01-17' },
          { week: '2026-W04', start: '2026-01-18', end: '2026-01-24' },
          { week: '2026-W05', start: '2026-01-25', end: '2026-01-31' }
        ]
      },
      {
        month: '2026-02',
        name: 'February 2026',
        weeks: 4,
        weekDetails: [
          { week: '2026-W06', start: '2026-02-01', end: '2026-02-07' },
          { week: '2026-W07', start: '2026-02-08', end: '2026-02-14' },
          { week: '2026-W08', start: '2026-02-15', end: '2026-02-21' },
          { week: '2026-W09', start: '2026-02-22', end: '2026-02-28' }
        ]
      },
      {
        month: '2026-03',
        name: 'March 2026',
        weeks: 4,
        weekDetails: [
          { week: '2026-W10', start: '2026-03-01', end: '2026-03-07' },
          { week: '2026-W11', start: '2026-03-08', end: '2026-03-14' },
          { week: '2026-W12', start: '2026-03-15', end: '2026-03-21' },
          { week: '2026-W13', start: '2026-03-22', end: '2026-03-28' }
        ]
      }
    ]
  });

  // Q2: Apr-Jun (13 weeks: 5+4+4)
  fiscalYear.push({
    quarter: 'Q2',
    months: [
      {
        month: '2026-04',
        name: 'April 2026',
        weeks: 5,
        weekDetails: [
          { week: '2026-W14', start: '2026-03-29', end: '2026-04-04' },
          { week: '2026-W15', start: '2026-04-05', end: '2026-04-11' },
          { week: '2026-W16', start: '2026-04-12', end: '2026-04-18' },
          { week: '2026-W17', start: '2026-04-19', end: '2026-04-25' },
          { week: '2026-W18', start: '2026-04-26', end: '2026-05-02' }
        ]
      },
      {
        month: '2026-05',
        name: 'May 2026',
        weeks: 4,
        weekDetails: [
          { week: '2026-W19', start: '2026-05-03', end: '2026-05-09' },
          { week: '2026-W20', start: '2026-05-10', end: '2026-05-16' },
          { week: '2026-W21', start: '2026-05-17', end: '2026-05-23' },
          { week: '2026-W22', start: '2026-05-24', end: '2026-05-30' }
        ]
      },
      {
        month: '2026-06',
        name: 'June 2026',
        weeks: 4,
        weekDetails: [
          { week: '2026-W23', start: '2026-05-31', end: '2026-06-06' },
          { week: '2026-W24', start: '2026-06-07', end: '2026-06-13' },
          { week: '2026-W25', start: '2026-06-14', end: '2026-06-20' },
          { week: '2026-W26', start: '2026-06-21', end: '2026-06-27' }
        ]
      }
    ]
  });

  // Q3: Jul-Sep (13 weeks: 5+4+4)
  fiscalYear.push({
    quarter: 'Q3',
    months: [
      {
        month: '2026-07',
        name: 'July 2026',
        weeks: 5,
        weekDetails: [
          { week: '2026-W27', start: '2026-06-28', end: '2026-07-04' },
          { week: '2026-W28', start: '2026-07-05', end: '2026-07-11' },
          { week: '2026-W29', start: '2026-07-12', end: '2026-07-18' },
          { week: '2026-W30', start: '2026-07-19', end: '2026-07-25' },
          { week: '2026-W31', start: '2026-07-26', end: '2026-08-01' }
        ]
      },
      {
        month: '2026-08',
        name: 'August 2026',
        weeks: 4,
        weekDetails: [
          { week: '2026-W32', start: '2026-08-02', end: '2026-08-08' },
          { week: '2026-W33', start: '2026-08-09', end: '2026-08-15' },
          { week: '2026-W34', start: '2026-08-16', end: '2026-08-22' },
          { week: '2026-W35', start: '2026-08-23', end: '2026-08-29' }
        ]
      },
      {
        month: '2026-09',
        name: 'September 2026',
        weeks: 4,
        weekDetails: [
          { week: '2026-W36', start: '2026-08-30', end: '2026-09-05' },
          { week: '2026-W37', start: '2026-09-06', end: '2026-09-12' },
          { week: '2026-W38', start: '2026-09-13', end: '2026-09-19' },
          { week: '2026-W39', start: '2026-09-20', end: '2026-09-26' }
        ]
      }
    ]
  });

  // Q4: Oct-Dec (13 weeks: 5+4+4)
  fiscalYear.push({
    quarter: 'Q4',
    months: [
      {
        month: '2026-10',
        name: 'October 2026',
        weeks: 5,
        weekDetails: [
          { week: '2026-W40', start: '2026-09-27', end: '2026-10-03' },
          { week: '2026-W41', start: '2026-10-04', end: '2026-10-10' },
          { week: '2026-W42', start: '2026-10-11', end: '2026-10-17' },
          { week: '2026-W43', start: '2026-10-18', end: '2026-10-24' },
          { week: '2026-W44', start: '2026-10-25', end: '2026-10-31' }
        ]
      },
      {
        month: '2026-11',
        name: 'November 2026',
        weeks: 4,
        weekDetails: [
          { week: '2026-W45', start: '2026-11-01', end: '2026-11-07' },
          { week: '2026-W46', start: '2026-11-08', end: '2026-11-14' },
          { week: '2026-W47', start: '2026-11-15', end: '2026-11-21' },
          { week: '2026-W48', start: '2026-11-22', end: '2026-11-28' }
        ]
      },
      {
        month: '2026-12',
        name: 'December 2026',
        weeks: 4,
        weekDetails: [
          { week: '2026-W49', start: '2026-11-29', end: '2026-12-05' },
          { week: '2026-W50', start: '2026-12-06', end: '2026-12-12' },
          { week: '2026-W51', start: '2026-12-13', end: '2026-12-19' },
          { week: '2026-W52', start: '2026-12-20', end: '2026-12-26' }
        ]
      }
    ]
  });

  return fiscalYear;
}

/**
 * Toggle fiscal calendar visibility
 */
function toggleFiscalCalendar() {
  const calendar = document.getElementById('fiscalCalendarContent');
  const button = document.getElementById('fiscalCalendarToggle');

  if (calendar.style.display === 'none') {
    calendar.style.display = 'block';
    button.textContent = '▼ Hide Fiscal Calendar (2026)';
  } else {
    calendar.style.display = 'none';
    button.textContent = '▶ Show Fiscal Calendar (2026)';
  }
}

// ========================================
// DATA FOUNDATION
// ========================================

/**
 * Render Data Foundation page with three subpages:
 * 1. Aligned Index - Metrics dictionary
 * 2. Data Source - Data sources and integration
 * 3. Production Plan Logic - Detailed calculation logic
 */
function renderDataFoundation() {
  console.log('[DataFoundation] renderDataFoundation called, subpage:', STATE.dataFoundationSubpage);
  const content = $("content");

  content.innerHTML = `
    <div class="space-y-6">
      <!-- Header -->
      <div class="bg-white rounded-xl shadow-sm p-6">
        <h1 class="text-2xl font-bold text-slate-900">Data Foundation</h1>
        <p class="text-sm text-slate-600 mt-1">Reference documentation for metrics, data sources, and calculation logic</p>
      </div>

      <!-- Subpage Navigation -->
      <div class="bg-white rounded-xl shadow-sm">
        <div class="border-b border-slate-200">
          <nav class="flex gap-1 px-6" role="tablist">
            <button
              onclick="STATE.dataFoundationSubpage = 'alignedIndex'; render();"
              class="px-4 py-3 text-sm font-medium transition-colors ${STATE.dataFoundationSubpage === 'alignedIndex' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-600 hover:text-slate-900'}"
            >
              Aligned Index
            </button>
            <button
              onclick="STATE.dataFoundationSubpage = 'dataSource'; render();"
              class="px-4 py-3 text-sm font-medium transition-colors ${STATE.dataFoundationSubpage === 'dataSource' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-600 hover:text-slate-900'}"
            >
              Data Source
            </button>
            <button
              onclick="STATE.dataFoundationSubpage = 'productionPlanLogic'; render();"
              class="px-4 py-3 text-sm font-medium transition-colors ${STATE.dataFoundationSubpage === 'productionPlanLogic' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-600 hover:text-slate-900'}"
            >
              Production Plan Logic
            </button>
          </nav>
        </div>

        <!-- Subpage Content -->
        <div class="p-6">
          <div id="dataFoundationContent"></div>
        </div>
      </div>
    </div>
  `;

  // Render appropriate subpage (after DOM update)
  setTimeout(() => {
    switch (STATE.dataFoundationSubpage) {
      case 'alignedIndex':
        renderAlignedIndex();
        break;
      case 'dataSource':
        renderDataSource();
        break;
      case 'productionPlanLogic':
        renderProductionPlanLogic();
        break;
      default:
        renderAlignedIndex();
    }
  }, 0);
}

/**
 * Render Aligned Index (Metrics Dictionary)
 */
function renderAlignedIndex() {
  console.log('[DataFoundation] renderAlignedIndex called');
  const content = $("dataFoundationContent");
  console.log('[DataFoundation] dataFoundationContent element:', content);

  const metrics = [
    {
      name: "Ex-factory to Supply Commit Attainment %",
      target: "≥90%",
      definition: "Measures the percentage of actual shipments against committed ExFactory quantities for each SKU, ensuring alignment with commitment.",
      calculation: "Weighted (actual ship quantity / plan quantity) by SKU",
      bgColor: ""
    },
    {
      name: "Production Schedule Adherence %",
      target: "92%-95%",
      definition: "Measures the actual production input against the planned production schedule for each SKU, helping to identify potential bottlenecks and risks to impact supply performance.",
      calculation: "Weighted (actual input quantity / plan quantity) by SKU",
      bgColor: ""
    },
    {
      name: "Capacity Utilization",
      target: "≥85%",
      definition: "Measure if factory under or over utilize installed capacity, idle due to CTB shortage / technical line down or OT w/, extra cost will all impact this indicator",
      calculation: "Actual output / Installed output capacity",
      bgColor: ""
    },
    {
      name: "Manufacturing Lead Time Achieve Rate",
      target: "≥90%",
      definition: "Calculates the percentage of parts produced within the committed lead time, ensuring that production is meeting supply commitment and minimizing delays.",
      calculation: "Units produced within committed lead time / total units produced",
      bgColor: ""
    },
    {
      name: "BTO On-Time Ship %",
      target: "≥80%",
      definition: "Measures the percentage of units shipped within the committed lead time, ensuring timely delivery to customers and maintaining a high level of customer satisfaction.",
      calculation: "PO quantity shipped within committed lead time / total PO quantity",
      bgColor: ""
    },
    {
      name: "CTO On-Time Ship %",
      target: "≥90%",
      definition: "Measures the percentage of units shipped within the committed lead time, ensuring timely delivery to customers and maintaining a high level of customer satisfaction.",
      calculation: "PO quantity shipped within committed lead time / total PO quantity",
      bgColor: ""
    },
    {
      name: "Labor Fulfillment %",
      target: "100%",
      definition: "Monitors the percentage of direct labor quantity to meet project requests, ensuring that the labor workforce is in place to support production demands and project timelines",
      calculation: "labor demand quantity / actual onboarded labor quantity",
      bgColor: ""
    },
    {
      name: "Campus readiness on-time %",
      target: "100%",
      definition: "Evaluates the availability and readiness of campus facilities (e.g., workshops, meeting rooms) to support project requests",
      calculation: "Ok2use campus space&facility / Total campus demands",
      bgColor: ""
    }
  ];

  content.innerHTML = `
    <div class="space-y-4">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-slate-900">Aligned Index - Metrics Dictionary</h2>
        <p class="text-sm text-slate-600">Reference: Program workspace metrics</p>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm border-collapse">
          <thead>
            <tr class="border-b-2 border-slate-900">
              <th class="text-left font-bold p-3 border-r border-slate-300">Metric Name</th>
              <th class="text-left font-bold p-3 border-r border-slate-300">Target</th>
              <th class="text-left font-bold p-3 border-r border-slate-300">Definition</th>
              <th class="text-left font-bold p-3">Calculation</th>
            </tr>
          </thead>
          <tbody>
            ${metrics.map(metric => `
              <tr class="border-b border-slate-200 ${metric.bgColor}">
                <td class="p-3 border-r border-slate-300 font-medium align-top">${metric.name}</td>
                <td class="p-3 border-r border-slate-300 text-sm align-top">${metric.target}</td>
                <td class="p-3 border-r border-slate-300 text-sm align-top">${metric.definition}</td>
                <td class="p-3 text-sm align-top">${metric.calculation}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p class="text-sm text-slate-700">
          <strong>Note:</strong> Highlighted metrics (orange/yellow) indicate areas requiring special attention or have unique calculation considerations.
        </p>
      </div>
    </div>
  `;
}

/**
 * Render Data Source mapping
 */
function renderDataSource() {
  const content = $("dataFoundationContent");

  const dataSources = [
    {
      category: "Ex-f: Plan/Actual",
      source: "Contract Manufacturer",
      currentMethod: "Email + Excel File",
      advancedMethod: "WMS/ERP API",
      destination: "Internal Team",
      team: "Planning",
      bgColor: "bg-purple-50"
    },
    {
      category: "CTB File",
      source: "Contract Manufacturer",
      currentMethod: "Email + Excel File",
      advancedMethod: "ERP/MRP API",
      destination: "Internal Team",
      team: "MPM",
      bgColor: "bg-purple-50"
    },
    {
      category: "Production Plan",
      source: "Contract Manufacturer",
      currentMethod: "Email + Excel File",
      advancedMethod: "MES API",
      destination: "Internal Team",
      team: "MO",
      bgColor: "bg-yellow-50"
    }
  ];

  content.innerHTML = `
    <div class="space-y-4">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-slate-900">Data Source Mapping</h2>
        <p class="text-sm text-slate-600">Integration flow between Contract Manufacturer and Internal Teams</p>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm border-collapse border border-slate-300">
          <thead>
            <tr class="bg-slate-100">
              <th class="text-left font-bold p-3 border border-slate-300">Data Category</th>
              <th class="text-left font-bold p-3 border border-slate-300">Source</th>
              <th class="text-left font-bold p-3 border border-slate-300">Current Method<br/>(Manual)</th>
              <th class="text-left font-bold p-3 border border-slate-300">Advanced Method<br/>(Future)</th>
              <th class="text-left font-bold p-3 border border-slate-300">Destination</th>
              <th class="text-left font-bold p-3 border border-slate-300">Internal Team</th>
            </tr>
          </thead>
          <tbody>
            ${dataSources.map(ds => `
              <tr class="${ds.bgColor} border border-slate-300">
                <td class="p-3 font-medium border border-slate-300">${ds.category}</td>
                <td class="p-3 border border-slate-300">${ds.source}</td>
                <td class="p-3 border border-slate-300">${ds.currentMethod}</td>
                <td class="p-3 border border-slate-300">${ds.advancedMethod}</td>
                <td class="p-3 border border-slate-300">${ds.destination}</td>
                <td class="p-3 font-semibold border border-slate-300">${ds.team}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
        <h3 class="font-semibold text-amber-900 mb-2">⚠️ Integration Status</h3>
        <ul class="text-sm text-slate-700 space-y-1 list-disc list-inside">
          <li><strong>Current State:</strong> All data sources use Email + Excel File (Manual process)</li>
          <li><strong>Future State:</strong> API-based integration for automated data flow (WMS/ERP, ERP/MRP, MES)</li>
        </ul>
      </div>
    </div>
  `;
}

/**
 * Render White Paper (Global Page)
 */
function renderWhitePaper() {
  const content = $("content");

  content.innerHTML = `
    <div class="space-y-6">
      <!-- Header -->
      <div class="bg-white rounded-xl shadow-sm p-6">
        <h1 class="text-2xl font-bold text-slate-900">White Paper</h1>
        <p class="text-sm text-slate-600 mt-1">Enterprise Decision Operations (EDO) - System Overview & Development Roadmap</p>
      </div>

      <!-- Executive Summary -->
      <div class="bg-white rounded-xl shadow-sm p-8">
        <h2 class="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <span class="text-2xl">📋</span>
          Executive Summary
        </h2>
        <div class="prose prose-slate max-w-none">
          <p class="text-slate-700 leading-relaxed mb-4">
            Enterprise Decision Operations (EDO) is an integrated internal decision support system designed to transform how our organization manages manufacturing operations and supply chain execution. Built on the foundation of Manufacturing Operations (MO) expertise, this platform addresses critical operational challenges through systematic data integration, standardization, and intelligent automation.
          </p>
          <p class="text-slate-700 leading-relaxed mb-4">
            This system serves multiple interconnected purposes: it automates external data integration from contract manufacturers and suppliers, standardizes metrics and indices across the organization to ensure data integrity, and completes the supply chain decision loop by connecting planning, execution, and performance monitoring in a unified environment.
          </p>
          <p class="text-slate-700 leading-relaxed">
            Beyond operational efficiency, EDO represents our evolution toward intelligent workflow reconstruction. By consolidating critical operational data, key performance indicators (KPI), and decision support tools in one platform, we establish a comprehensive knowledge base that reduces manual work, enables AI-powered analysis and recommendations, and supports faster, data-driven decision-making across the manufacturing supply chain.
          </p>
        </div>
      </div>

      <!-- Core Objectives -->
      <div class="bg-white rounded-xl shadow-sm p-8">
        <h2 class="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <span class="text-2xl">🎯</span>
          Core Objectives
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="border border-slate-200 rounded-lg p-5 hover:shadow-md transition-shadow">
            <h3 class="font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <span class="text-blue-600">🔗</span>
              External Data Integration & Automation
            </h3>
            <p class="text-sm text-slate-600">
              Automate data collection from contract manufacturers, suppliers, and logistics partners. Eliminate manual data entry and email-based processes, establishing real-time or near-real-time data pipelines through API integration and system connections.
            </p>
          </div>

          <div class="border border-slate-200 rounded-lg p-5 hover:shadow-md transition-shadow">
            <h3 class="font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <span class="text-green-600">📊</span>
              Data & Index Standardization
            </h3>
            <p class="text-sm text-slate-600">
              Establish unified definitions for operational metrics, KPIs, and indices across all programs and sites. Ensure data integrity, consistency, and reliability through standardized calculation logic and validation rules.
            </p>
          </div>

          <div class="border border-slate-200 rounded-lg p-5 hover:shadow-md transition-shadow">
            <h3 class="font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <span class="text-purple-600">🔄</span>
              Supply Chain Decision Loop
            </h3>
            <p class="text-sm text-slate-600">
              Complete the closed-loop system connecting demand forecasting, production planning, execution monitoring, shipment tracking, and performance analysis. Enable proactive decision-making through real-time visibility and constraint identification.
            </p>
          </div>

          <div class="border border-slate-200 rounded-lg p-5 hover:shadow-md transition-shadow">
            <h3 class="font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <span class="text-orange-600">📈</span>
              KPI Visualization & Performance Monitoring
            </h3>
            <p class="text-sm text-slate-600">
              Provide intuitive, role-based dashboards presenting critical operational data and KPIs. Enable stakeholders at all levels to access relevant metrics, identify trends, and monitor performance against targets in real-time.
            </p>
          </div>

          <div class="border border-slate-200 rounded-lg p-5 hover:shadow-md transition-shadow">
            <h3 class="font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <span class="text-indigo-600">⚡</span>
              Intelligent Workflow Reconstruction
            </h3>
            <p class="text-sm text-slate-600">
              Evolve beyond traditional MO processes by embedding intelligence into daily workflows. Automate routine tasks, standardize decision frameworks, and free team members to focus on strategic problem-solving and continuous improvement.
            </p>
          </div>

          <div class="border border-slate-200 rounded-lg p-5 hover:shadow-md transition-shadow">
            <h3 class="font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <span class="text-pink-600">🤖</span>
              AI-Powered Analysis & Recommendations
            </h3>
            <p class="text-sm text-slate-600">
              Leverage AI capabilities to analyze operational data, identify patterns and anomalies, generate actionable recommendations, and suggest specific actions. Support decision-makers with data-driven insights and predictive analytics.
            </p>
          </div>

          <div class="border border-slate-200 rounded-lg p-5 hover:shadow-md transition-shadow">
            <h3 class="font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <span class="text-teal-600">💬</span>
              Knowledge Base & Chatbot Assistant
            </h3>
            <p class="text-sm text-slate-600">
              Build an organizational knowledge repository accessible through natural language queries. Enable team members to quickly retrieve data, understand metrics, and access historical context without navigating multiple systems or files.
            </p>
          </div>

          <div class="border border-slate-200 rounded-lg p-5 hover:shadow-md transition-shadow">
            <h3 class="font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <span class="text-red-600">⚙️</span>
              System-Based Work Management
            </h3>
            <p class="text-sm text-slate-600">
              Transform manual, ad-hoc processes into systematic, repeatable workflows managed through the platform. Reduce manual effort, minimize errors, and ensure consistency in operational execution and reporting.
            </p>
          </div>
        </div>
      </div>

      <!-- Development Phases -->
      <div class="bg-white rounded-xl shadow-sm p-8">
        <h2 class="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <span class="text-2xl">🚀</span>
          Development Phases
        </h2>
        <div class="space-y-4">
          <!-- Phase 1 -->
          <div class="border-l-4 border-blue-500 pl-4 py-2">
            <h3 class="font-semibold text-slate-900 mb-2">Phase 1: Foundation & Core Capabilities</h3>
            <p class="text-sm text-slate-600 mb-3">
              Establish the fundamental system architecture, data models, and core operational modules. Focus on manual data input with standardized templates and calculation engines.
            </p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div class="bg-blue-50 rounded p-3">
                <div class="font-medium text-blue-900 mb-1">Delivery Command Center</div>
                <div class="text-blue-700">Weekly shipment tracking, demand attainment monitoring, gap analysis, constraint identification</div>
              </div>
              <div class="bg-blue-50 rounded p-3">
                <div class="font-medium text-blue-900 mb-1">Production Plan Engine</div>
                <div class="text-blue-700">Site-level capacity planning, input/output modeling, ramp curve simulation, scenario analysis</div>
              </div>
              <div class="bg-blue-50 rounded p-3">
                <div class="font-medium text-blue-900 mb-1">Portfolio Overview</div>
                <div class="text-blue-700">Multi-program aggregation, cross-site visibility, executive summary dashboards</div>
              </div>
              <div class="bg-blue-50 rounded p-3">
                <div class="font-medium text-blue-900 mb-1">Data Foundation</div>
                <div class="text-blue-700">Aligned index definitions, data source mapping, calculation logic documentation</div>
              </div>
            </div>
          </div>

          <!-- Phase 2 -->
          <div class="border-l-4 border-green-500 pl-4 py-2">
            <h3 class="font-semibold text-slate-900 mb-2">Phase 2: External Integration & Automation</h3>
            <p class="text-sm text-slate-600 mb-3">
              Connect with external systems to automate data collection and reduce manual input. Establish API integrations with contract manufacturers, suppliers, and logistics providers.
            </p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div class="bg-green-50 rounded p-3">
                <div class="font-medium text-green-900 mb-1">CM/Supplier API Integration</div>
                <div class="text-green-700">Real-time production data, shipment updates, material availability from WMS/ERP/MES systems</div>
              </div>
              <div class="bg-green-50 rounded p-3">
                <div class="font-medium text-green-900 mb-1">Logistics Integration</div>
                <div class="text-green-700">Shipment tracking, delivery confirmation, transit visibility from 3PL systems</div>
              </div>
              <div class="bg-green-50 rounded p-3">
                <div class="font-medium text-green-900 mb-1">Automated Data Validation</div>
                <div class="text-green-700">Real-time data quality checks, anomaly detection, automatic reconciliation</div>
              </div>
              <div class="bg-green-50 rounded p-3">
                <div class="font-medium text-green-900 mb-1">Alert & Notification System</div>
                <div class="text-green-700">Proactive alerts for constraint triggers, delivery risks, performance deviations</div>
              </div>
            </div>
          </div>

          <!-- Phase 3 -->
          <div class="border-l-4 border-purple-500 pl-4 py-2">
            <h3 class="font-semibold text-slate-900 mb-2">Phase 3: Intelligence & Advanced Analytics</h3>
            <p class="text-sm text-slate-600 mb-3">
              Embed AI capabilities for predictive analytics, automated recommendations, and natural language interaction. Transform from reactive monitoring to proactive optimization.
            </p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div class="bg-purple-50 rounded p-3">
                <div class="font-medium text-purple-900 mb-1">AI Chatbot Assistant</div>
                <div class="text-purple-700">Natural language data queries, metric explanations, historical context retrieval</div>
              </div>
              <div class="bg-purple-50 rounded p-3">
                <div class="font-medium text-purple-900 mb-1">Predictive Analytics</div>
                <div class="text-purple-700">Demand forecasting, constraint prediction, delivery risk scoring, capacity optimization</div>
              </div>
              <div class="bg-purple-50 rounded p-3">
                <div class="font-medium text-purple-900 mb-1">Automated Recommendations</div>
                <div class="text-purple-700">Action suggestions for constraint mitigation, resource allocation, expedite decisions</div>
              </div>
              <div class="bg-purple-50 rounded p-3">
                <div class="font-medium text-purple-900 mb-1">Knowledge Base</div>
                <div class="text-purple-700">Searchable repository of decisions, issue resolutions, best practices, lessons learned</div>
              </div>
            </div>
          </div>

          <!-- Phase 4 -->
          <div class="border-l-4 border-orange-500 pl-4 py-2">
            <h3 class="font-semibold text-slate-900 mb-2">Phase 4: Ecosystem Expansion & Optimization</h3>
            <p class="text-sm text-slate-600 mb-3">
              Extend system capabilities to adjacent processes, establish advanced collaboration tools, and implement continuous optimization mechanisms.
            </p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div class="bg-orange-50 rounded p-3">
                <div class="font-medium text-orange-900 mb-1">Upstream Planning Integration</div>
                <div class="text-orange-700">Demand planning sync, S&OP integration, forecast accuracy tracking</div>
              </div>
              <div class="bg-orange-50 rounded p-3">
                <div class="font-medium text-orange-900 mb-1">Quality & Yield Analytics</div>
                <div class="text-orange-700">Defect tracking, yield analysis, root cause identification, continuous improvement</div>
              </div>
              <div class="bg-orange-50 rounded p-3">
                <div class="font-medium text-orange-900 mb-1">Collaboration Platform</div>
                <div class="text-orange-700">Cross-functional issue tracking, decision documentation, stakeholder communication</div>
              </div>
              <div class="bg-orange-50 rounded p-3">
                <div class="font-medium text-orange-900 mb-1">Advanced Simulation</div>
                <div class="text-orange-700">What-if scenario modeling, optimization algorithms, capacity balancing tools</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Roadmap & Timeline -->
      <div class="bg-white rounded-xl shadow-sm p-8">
        <h2 class="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <span class="text-2xl">📅</span>
          Roadmap & Timeline
        </h2>
        <div class="relative">
          <!-- Timeline Line -->
          <div class="absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 via-green-500 via-purple-500 to-orange-500"></div>

          <!-- Timeline Items -->
          <div class="space-y-6">
            <!-- Q1 2026 -->
            <div class="flex items-start gap-4">
              <div class="flex-shrink-0 w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg z-10">
                Q1
              </div>
              <div class="flex-grow pt-2">
                <h3 class="font-semibold text-slate-900 mb-1">Q1 2026: Foundation Launch</h3>
                <p class="text-sm text-slate-600 mb-2">Complete Phase 1 core modules with manual data input capabilities</p>
                <div class="text-xs text-blue-700 bg-blue-50 rounded px-2 py-1 inline-block">Jan - Mar 2026</div>
              </div>
            </div>

            <!-- Q2 2026 -->
            <div class="flex items-start gap-4">
              <div class="flex-shrink-0 w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg z-10">
                Q2
              </div>
              <div class="flex-grow pt-2">
                <h3 class="font-semibold text-slate-900 mb-1">Q2 2026: Integration Pilot</h3>
                <p class="text-sm text-slate-600 mb-2">Begin Phase 2 with pilot API integrations for 1-2 key contract manufacturers</p>
                <div class="text-xs text-green-700 bg-green-50 rounded px-2 py-1 inline-block">Apr - Jun 2026</div>
              </div>
            </div>

            <!-- Q3 2026 -->
            <div class="flex items-start gap-4">
              <div class="flex-shrink-0 w-16 h-16 bg-green-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg z-10">
                Q3
              </div>
              <div class="flex-grow pt-2">
                <h3 class="font-semibold text-slate-900 mb-1">Q3 2026: Integration Expansion</h3>
                <p class="text-sm text-slate-600 mb-2">Scale Phase 2 integrations across all major suppliers and logistics partners</p>
                <div class="text-xs text-green-700 bg-green-50 rounded px-2 py-1 inline-block">Jul - Sep 2026</div>
              </div>
            </div>

            <!-- Q4 2026 -->
            <div class="flex items-start gap-4">
              <div class="flex-shrink-0 w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg z-10">
                Q4
              </div>
              <div class="flex-grow pt-2">
                <h3 class="font-semibold text-slate-900 mb-1">Q4 2026: AI Foundation</h3>
                <p class="text-sm text-slate-600 mb-2">Launch Phase 3 with AI chatbot assistant and initial predictive analytics capabilities</p>
                <div class="text-xs text-purple-700 bg-purple-50 rounded px-2 py-1 inline-block">Oct - Dec 2026</div>
              </div>
            </div>

            <!-- 2027 -->
            <div class="flex items-start gap-4">
              <div class="flex-shrink-0 w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg z-10">
                2027
              </div>
              <div class="flex-grow pt-2">
                <h3 class="font-semibold text-slate-900 mb-1">2027: Intelligence & Ecosystem</h3>
                <p class="text-sm text-slate-600 mb-2">Complete Phase 3 AI capabilities and initiate Phase 4 ecosystem expansion</p>
                <div class="text-xs text-orange-700 bg-orange-50 rounded px-2 py-1 inline-block">Jan - Dec 2027</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Key Success Metrics -->
      <div class="bg-white rounded-xl shadow-sm p-8">
        <h2 class="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <span class="text-2xl">📊</span>
          Key Success Metrics
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div class="text-2xl font-bold text-blue-600 mb-2">📉</div>
            <div class="text-sm font-medium text-slate-900 mb-1">Manual Work Reduction</div>
            <div class="text-xs text-slate-600">Measure reduction in repetitive data collection and reporting tasks through automation</div>
          </div>
          <div class="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div class="text-2xl font-bold text-green-600 mb-2">✓</div>
            <div class="text-sm font-medium text-slate-900 mb-1">Data Accuracy</div>
            <div class="text-xs text-slate-600">Track data integrity improvement through standardized processes and validation</div>
          </div>
          <div class="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div class="text-2xl font-bold text-purple-600 mb-2">⚡</div>
            <div class="text-sm font-medium text-slate-900 mb-1">Decision Speed</div>
            <div class="text-xs text-slate-600">Monitor acceleration in decision-making through real-time visibility and AI insights</div>
          </div>
          <div class="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div class="text-2xl font-bold text-orange-600 mb-2">🔄</div>
            <div class="text-sm font-medium text-slate-900 mb-1">Process Standardization</div>
            <div class="text-xs text-slate-600">Measure adoption of unified metrics and workflows across all programs and sites</div>
          </div>
          <div class="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div class="text-2xl font-bold text-indigo-600 mb-2">👁️</div>
            <div class="text-sm font-medium text-slate-900 mb-1">Data Visibility</div>
            <div class="text-xs text-slate-600">Track transition from periodic reports to continuous operational monitoring</div>
          </div>
          <div class="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div class="text-2xl font-bold text-teal-600 mb-2">💬</div>
            <div class="text-sm font-medium text-slate-900 mb-1">Knowledge Access</div>
            <div class="text-xs text-slate-600">Monitor usage of on-demand information retrieval through AI chatbot assistant</div>
          </div>
        </div>
      </div>

      <!-- Conclusion -->
      <div class="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl shadow-sm p-8 border border-blue-100">
        <h2 class="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <span class="text-2xl">💡</span>
          Looking Forward
        </h2>
        <div class="prose prose-slate max-w-none">
          <p class="text-slate-700 leading-relaxed">
            Enterprise Decision Operations represents more than a technology implementation—it is a fundamental transformation in how we approach manufacturing operations management. By systematically building capabilities across data integration, standardization, intelligence, and automation, we create a sustainable competitive advantage rooted in operational excellence and informed decision-making.
          </p>
          <p class="text-slate-700 leading-relaxed mt-3">
            This platform leverages our deep Manufacturing Operations expertise while positioning us at the forefront of intelligent supply chain management. As we progress through each development phase, we will continuously refine and expand capabilities based on real-world operational needs, user feedback, and emerging technology opportunities.
          </p>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render Production Plan Logic from markdown documentation
 */
async function renderProductionPlanLogic() {
  const content = $("dataFoundationContent");

  // Show loading state
  content.innerHTML = `
    <div class="text-center py-12">
      <div class="text-4xl mb-4">⏳</div>
      <div class="text-slate-600">Loading Production Plan Logic...</div>
    </div>
  `;

  try {
    // Load the markdown documentation
    const response = await fetch('./OUTPUT_LOGIC_DISCUSSION.md');
    if (!response.ok) throw new Error('Failed to load documentation');

    const markdownText = await response.text();

    // Convert markdown to HTML (simple conversion)
    const htmlContent = convertMarkdownToHTML(markdownText);

    content.innerHTML = `
      <div class="space-y-4">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-slate-900">Production Plan Generation Logic</h2>
          <a href="./OUTPUT_LOGIC_DISCUSSION.md" target="_blank" class="text-sm text-blue-600 hover:text-blue-800">
            📄 View Original Document
          </a>
        </div>

        <div class="prose prose-sm max-w-none bg-white">
          ${htmlContent}
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Error loading Production Plan Logic:', error);
    content.innerHTML = `
      <div class="text-center py-12">
        <div class="text-4xl mb-4">❌</div>
        <div class="text-red-600 font-semibold">Failed to load documentation</div>
        <div class="text-sm text-slate-600 mt-2">${error.message}</div>
        <a href="./OUTPUT_LOGIC_DISCUSSION.md" target="_blank" class="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Open Document Directly
        </a>
      </div>
    `;
  }
}

/**
 * Simple Markdown to HTML converter
 * Supports: headers, bold, italic, code blocks, lists, tables
 */
function convertMarkdownToHTML(markdown) {
  let html = markdown;

  // Code blocks
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-slate-100 p-4 rounded-lg overflow-x-auto"><code class="language-$1">$2</code></pre>');

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mt-6 mb-3 text-slate-900">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-8 mb-4 text-slate-900 border-b pb-2">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-10 mb-5 text-slate-900">$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>');

  // Lists
  html = html.replace(/^\- (.*$)/gim, '<li class="ml-4">$1</li>');
  html = html.replace(/(<li class="ml-4">.*<\/li>\n?)+/g, '<ul class="list-disc list-inside space-y-1 my-2">$&</ul>');

  // Line breaks
  html = html.replace(/\n\n/g, '</p><p class="my-3">');
  html = '<p class="my-3">' + html + '</p>';

  // Tables (basic support)
  html = html.replace(/\|(.+)\|/g, function(match) {
    const cells = match.split('|').filter(c => c.trim());
    return '<tr>' + cells.map(c => `<td class="border border-slate-300 px-3 py-2">${c.trim()}</td>`).join('') + '</tr>';
  });
  html = html.replace(/(<tr>.*<\/tr>\n?)+/g, '<table class="w-full border-collapse my-4">$&</table>');

  return html;
}
