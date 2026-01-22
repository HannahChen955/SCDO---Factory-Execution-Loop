// SCDO Control Tower — Factory Execution Loop
// Version 2.0 - Delivery-first Architecture

let STATE = {
  data: null,
  scenarioId: "A",
  filters: { product: null, factorySite: null, week: null },
  activeView: "overview", // overview | portfolio | home | signals | radar | actions | reports
  currentProgram: null, // Current program context { product, factorySite, week }
  selectedRiskId: null,
  prdMode: false,
  viewMode: "live", // live | simulation
  simulationPreset: null,
  simulationResults: null,
  aiMode: false, // AI mode toggle
  aiContext: null // Current AI context for drawer
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
  selectEl.innerHTML = "";
  options.forEach(opt => {
    const o = document.createElement("option");
    o.value = opt;
    o.textContent = opt;
    if (opt === value) o.selected = true;
    selectEl.appendChild(o);
  });
}

function initControls() {
  // PRD Mode toggle
  $("prdModeToggle").addEventListener("change", (e) => {
    STATE.prdMode = e.target.checked;
    render();
  });

  // View Mode toggle (Live vs Simulation)
  $("liveMode").addEventListener("change", (e) => {
    if (e.target.checked) {
      STATE.viewMode = "live";
      $("presetFilterContainer").style.display = "none";
      $("runSimulationBtn").style.display = "none";
      STATE.simulationResults = null;
      render();
    }
  });

  $("simulationMode").addEventListener("change", (e) => {
    if (e.target.checked) {
      STATE.viewMode = "simulation";
      $("presetFilterContainer").style.display = "flex";
      $("runSimulationBtn").style.display = "block";
      render();
    }
  });

  // Run Simulation button
  $("runSimulationBtn").addEventListener("click", () => {
    runSimulation();
  });

  // Filters
  const { products, factorySites, weeks } = STATE.data.dimensions;
  const scenario = getScenario();
  const { product, factorySite, week } = scenario.defaultFilters;

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
  const isProgramWorkspace = ["home", "delivery", "production-plan", "mfg-leadtime", "bto-cto-leadtime", "fv-management", "labor-fulfillment", "campus-readiness", "signals", "radar", "actions", "reports"].includes(STATE.activeView);

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

  if (STATE.activeView === "overview") {
    // Hide filters on Overview page
    if (filtersBar) filtersBar.style.display = "none";
  } else if (STATE.activeView === "portfolio") {
    // Show filters but hide Update Data button on Portfolio page
    if (filtersBar) filtersBar.style.display = "block";
    if (updateDataBtn) updateDataBtn.style.display = "none";
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

  const { hero, scopeCoverage, whyFactory, proposal, challenges, roadmap } = overview;

  const html = `
    <!-- Hero Section -->
    <div class="bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 rounded-2xl p-12 mb-6 relative overflow-hidden shadow-2xl">
      <!-- Decorative Grid Pattern -->
      <div class="absolute inset-0 opacity-5">
        <div class="absolute inset-0" style="background-image: radial-gradient(circle at 2px 2px, white 1px, transparent 0); background-size: 40px 40px;"></div>
      </div>

      <!-- Decorative Glow Elements -->
      <div class="absolute top-0 right-0 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl -mr-48 -mt-48"></div>
      <div class="absolute bottom-0 left-0 w-80 h-80 bg-purple-400/20 rounded-full blur-3xl -ml-40 -mb-40"></div>

      <div class="relative z-10 max-w-5xl">
        <!-- Title with accent -->
        <div class="mb-6">
          <div class="inline-block px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-xs font-semibold text-blue-100 mb-3 border border-white/20">
            Factory Execution Loop
          </div>
          <h1 class="text-2xl font-bold text-white drop-shadow-lg">${hero.title}</h1>
        </div>

        <!-- Content Card with Modern Design -->
        <div class="bg-gradient-to-br from-white to-slate-50 rounded-2xl p-8 shadow-2xl border border-slate-200/50 backdrop-blur-sm">
          <div class="relative pb-4">
            <!-- Decorative Quote Accent -->
            <div class="absolute -top-4 -left-4 w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg opacity-10 transform -rotate-6"></div>
            <div class="absolute -top-2 -left-2 text-6xl text-blue-300/40 font-serif leading-none select-none pointer-events-none">"</div>

            <div class="relative pl-8 pr-6 space-y-4 text-slate-700">
              <p class="text-base leading-relaxed">
                SCDO already connects planning, inventory, logistics, and orders — but the missing link is factory execution, where plans become deliverable commits.
              </p>
              <p class="text-base leading-relaxed">
                This demo shows how we close that loop: we convert fast-changing factory reality into trusted signals with confidence labels, rank what threatens the weekly commit, and automatically route recovery actions (or escalate to human review) with owners and SLAs.
              </p>

              <!-- Highlighted conclusion box -->
              <div class="relative bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-lg p-4 shadow-sm mt-5">
                <div class="flex items-start gap-3">
                  <div class="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mt-1">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                    </svg>
                  </div>
                  <p class="text-base leading-relaxed font-semibold text-slate-800 flex-1">
                    The output is a unified execution data stream — a clear, end-to-end view of factory reality. It completes the enterprise data loop, replacing siloed spreadsheets with shared context for faster, better decisions.
                  </p>
                </div>
              </div>
            </div>

            <!-- Bottom quote mark - positioned carefully to not overlap text -->
            <div class="absolute -bottom-2 right-4 text-6xl text-blue-300/40 font-serif leading-none select-none pointer-events-none">"</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Scope Coverage -->
    <div class="bg-white border rounded-xl p-6 mb-6">
      <div class="mb-4">
        <div class="text-lg font-bold mb-1">Current SCDO Scope vs Missing Link</div>
        <div class="text-sm text-slate-600">Factory execution is the critical gap between planning and deliverable commit</div>
      </div>

      <!-- Coverage Summary - Text Only -->
      <div class="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div class="flex items-center gap-2 mb-2">
          <div class="text-xl">⚠️</div>
          <div class="text-sm font-semibold text-amber-900">Incomplete Loop without Factory Data</div>
        </div>
        <div class="text-sm text-slate-700">
          SCDO currently connects planning, orders, logistics, and inventory — but without factory execution data, the loop cannot close. Planning operates blind to execution reality, leading to late surprises and liability accumulation.
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Included -->
        <div>
          <div class="text-sm font-semibold mb-3 text-green-700">✓ Included Today</div>
          <div class="space-y-2">
            ${scopeCoverage.included.map(item => `
              <div class="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div class="text-2xl">${item.icon}</div>
                <div class="flex-1">
                  <div class="font-semibold text-sm">${item.label}</div>
                  <div class="text-xs text-slate-600">${item.detail}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Missing -->
        <div>
          <div class="text-sm font-semibold mb-3 text-red-700">⚠️ Not Yet Included (Missing Link)</div>
          <div class="space-y-2">
            ${scopeCoverage.missing.map(item => `
              <div class="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div class="text-2xl">${item.icon}</div>
                <div class="flex-1">
                  <div class="font-semibold text-sm">${item.label}</div>
                  <div class="text-xs text-slate-600">${item.detail}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>

    <!-- Closed-Loop Map (Simplified SVG Placeholder) -->
    <div class="bg-white border rounded-xl p-6 mb-6">
      <div class="text-lg font-bold mb-2">The SCDO Closed Loop — Factory is the Missing Link</div>
      <div class="text-sm text-slate-600 mb-6">A plan is not a commit. The factory is where orders become deliverable reality.</div>

      <div class="relative">
        <!-- Simple Flow Diagram -->
        <div class="flex items-center justify-between gap-4 flex-wrap">
          <div class="flex-1 min-w-[120px] p-4 bg-blue-50 border-2 border-blue-300 rounded-xl text-center">
            <div class="text-2xl mb-2">📦</div>
            <div class="text-sm font-semibold">Planning</div>
            <div class="text-xs text-slate-600">Forecast / Build Plan</div>
          </div>
          <div class="text-2xl text-slate-400">→</div>
          <div class="flex-1 min-w-[120px] p-4 bg-red-50 border-2 border-red-400 border-dashed rounded-xl text-center">
            <div class="text-2xl mb-2">🏭</div>
            <div class="text-sm font-semibold text-red-700">Manufacturing</div>
            <div class="text-xs text-red-600 font-semibold">MISSING TODAY</div>
          </div>
          <div class="text-2xl text-slate-400">→</div>
          <div class="flex-1 min-w-[120px] p-4 bg-blue-50 border-2 border-blue-300 rounded-xl text-center">
            <div class="text-2xl mb-2">🚚</div>
            <div class="text-sm font-semibold">Logistics</div>
            <div class="text-xs text-slate-600">Shipments / ETA</div>
          </div>
          <div class="text-2xl text-slate-400">→</div>
          <div class="flex-1 min-w-[120px] p-4 bg-blue-50 border-2 border-blue-300 rounded-xl text-center">
            <div class="text-2xl mb-2">📊</div>
            <div class="text-sm font-semibold">Inventory</div>
            <div class="text-xs text-slate-600">FG / Transit</div>
          </div>
          <div class="text-2xl text-slate-400">→</div>
          <div class="flex-1 min-w-[120px] p-4 bg-blue-50 border-2 border-blue-300 rounded-xl text-center">
            <div class="text-2xl mb-2">🧾</div>
            <div class="text-sm font-semibold">Orders</div>
            <div class="text-xs text-slate-600">Demand / Commit</div>
          </div>
        </div>
        <div class="text-center mt-4">
          <div class="inline-block px-4 py-2 bg-amber-50 border border-amber-300 rounded-lg text-sm">
            <strong>Without factory data:</strong> Planning operates blind to execution reality, leading to late surprises and liability accumulation
          </div>
        </div>
      </div>
    </div>

    <!-- Why Factory Matters (Risk Cards) -->
    <div class="bg-white border rounded-xl p-6 mb-6">
      <div class="text-lg font-bold mb-2">Why Factory Execution Must Be Part of the Loop</div>
      <div class="text-sm text-slate-600 mb-6">Manufacturing has inertia. Late signals create shortages. Slow response creates liability.</div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        ${whyFactory.map(risk => `
          <div class="border rounded-xl p-4 ${risk.severity === 'HIGH' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}">
            <div class="flex items-center gap-2 mb-3">
              <div class="text-3xl">${risk.icon}</div>
              <div>
                <div class="font-semibold text-sm">${risk.title}</div>
                <span class="px-2 py-0.5 rounded text-xs font-semibold ${risk.severity === 'HIGH' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}">${risk.severity}</span>
              </div>
            </div>
            <div class="text-sm font-semibold mb-2">${risk.message}</div>
            <div class="text-xs text-slate-600 mb-3">${risk.consequence}</div>
            <div class="p-2 bg-white border rounded text-xs">
              <strong>Example signal:</strong> ${risk.exampleSignal}
            </div>
          </div>
        `).join('')}
      </div>

      <div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <div class="text-sm font-semibold text-blue-900 mb-2">Our Proposal</div>
        <div class="text-sm text-blue-900">If SCDO's goal is "automate high-confidence decisions + manage exceptions," then <strong>factory execution is the critical decision point that turns "orders/plans" into "deliverable commit."</strong></div>
      </div>
    </div>

    <!-- Proposed Extension (Capability Tiles) -->
    <div class="bg-white border rounded-xl p-6 mb-6">
      <div class="text-lg font-bold mb-2">Proposed Extension: Factory Execution Decision Orchestration</div>
      <div class="text-sm text-slate-600 mb-6">A factory-side decision layer that translates execution reality into trusted commit — and routes recovery actions with owners, SLAs, and evidence.</div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${proposal.map(cap => `
          <details class="border rounded-xl overflow-hidden">
            <summary class="p-4 cursor-pointer hover:bg-slate-50 flex items-start gap-3">
              <div class="text-3xl">${cap.icon}</div>
              <div class="flex-1">
                <div class="font-semibold text-sm mb-1">${cap.title}</div>
                <div class="text-xs text-slate-600">${cap.description}</div>
              </div>
              <div class="text-slate-400">▼</div>
            </summary>
            <div class="p-4 border-t bg-slate-50 space-y-2">
              <div class="text-xs">
                <div class="font-semibold text-green-700 mb-1">✓ In Demo Now:</div>
                <div class="text-slate-700">${cap.inDemoNow}</div>
              </div>
              <div class="text-xs">
                <div class="font-semibold text-blue-700 mb-1">→ Next Phase:</div>
                <div class="text-slate-700">${cap.nextPhase}</div>
              </div>
            </div>
          </details>
        `).join('')}
      </div>
    </div>

    <!-- Factory Data Challenges -->
    <div class="bg-white border rounded-xl p-6 mb-6">
      <div class="text-lg font-bold mb-2">Why Factory Data Is Hard (and why it matters)</div>
      <div class="text-sm text-slate-600 mb-6">This is exactly why the factory layer should be "decision-oriented," not just another dashboard.</div>

      <!-- Reality Gauges -->
      <div class="grid grid-cols-3 gap-4 mb-6">
        <div class="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
          <div class="text-xs text-slate-600 mb-1">Data Cleanliness</div>
          <div class="text-2xl font-bold text-red-600">LOW</div>
        </div>
        <div class="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
          <div class="text-xs text-slate-600 mb-1">Change Speed</div>
          <div class="text-2xl font-bold text-red-600">HIGH</div>
        </div>
        <div class="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
          <div class="text-xs text-slate-600 mb-1">On-site Dependency</div>
          <div class="text-2xl font-bold text-yellow-600">HIGH</div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        ${challenges.map(challenge => `
          <div class="p-4 border rounded-lg ${challenge.severity === 'HIGH' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}">
            <div class="flex items-center justify-between mb-2">
              <div class="font-semibold text-sm">${challenge.title}</div>
              <span class="px-2 py-0.5 rounded text-xs font-semibold ${challenge.severity === 'HIGH' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}">${challenge.severity}</span>
            </div>
            <div class="text-xs text-slate-600 mb-2">${challenge.description}</div>
            <div class="text-xs text-slate-700 font-semibold">Impact: ${challenge.impact}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- What This Demo Shows (Stepper) -->
    <div class="bg-white border rounded-xl p-6 mb-6">
      <div class="text-lg font-bold mb-2">What This Demo Shows: The Factory Execution Loop</div>
      <div class="text-sm text-slate-600 mb-6">This prototype demonstrates how factory execution can be integrated into SCDO as a delivery-first decision loop.</div>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 items-stretch">
        <div class="relative">
          <button onclick="STATE.activeView = 'signals'; render();" class="w-full h-full text-left p-5 border-2 border-blue-500 rounded-xl hover:bg-blue-50 transition flex flex-col justify-between" style="min-height: 156px;">
            <div>
              <div class="flex items-center gap-2 mb-2">
                <div class="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">1</div>
                <div class="font-semibold text-sm">Signals</div>
              </div>
              <div class="text-xs text-slate-600 mb-2">Data Readiness</div>
            </div>
            <div class="text-xs text-slate-700">Turn factory reality into trusted signals with freshness, coverage, and confidence labels.</div>
          </button>
          <div class="hidden md:block absolute top-1/2 -right-2 transform -translate-y-1/2 text-2xl text-blue-500">→</div>
        </div>

        <div class="relative">
          <button onclick="STATE.activeView = 'radar'; render();" class="w-full h-full text-left p-5 border-2 border-purple-500 rounded-xl hover:bg-purple-50 transition flex flex-col justify-between" style="min-height: 156px;">
            <div>
              <div class="flex items-center gap-2 mb-2">
                <div class="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold">2</div>
                <div class="font-semibold text-sm">Risk Radar</div>
              </div>
              <div class="text-xs text-slate-600 mb-2">What Threatens Commit</div>
            </div>
            <div class="text-xs text-slate-700">Rank late and liability risks by impact × confidence, with explainable drivers.</div>
          </button>
          <div class="hidden md:block absolute top-1/2 -right-2 transform -translate-y-1/2 text-2xl text-purple-500">→</div>
        </div>

        <div class="relative">
          <button onclick="STATE.activeView = 'actions'; render();" class="w-full h-full text-left p-5 border-2 border-green-500 rounded-xl hover:bg-green-50 transition flex flex-col justify-between" style="min-height: 156px;">
            <div>
              <div class="flex items-center gap-2 mb-2">
                <div class="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold">3</div>
                <div class="font-semibold text-sm">Actions</div>
              </div>
              <div class="text-xs text-slate-600 mb-2">Recovery Playbooks</div>
            </div>
            <div class="text-xs text-slate-700">Convert recommendations into routable actions with owners, SLAs, and expected impact.</div>
          </button>
          <div class="hidden md:block absolute top-1/2 -right-2 transform -translate-y-1/2 text-2xl text-green-500">→</div>
        </div>

        <div>
          <button onclick="STATE.activeView = 'reports'; render();" class="w-full h-full text-left p-5 border-2 border-amber-500 rounded-xl hover:bg-amber-50 transition flex flex-col justify-between" style="min-height: 156px;">
            <div>
              <div class="flex items-center gap-2 mb-2">
                <div class="w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center text-sm font-bold">4</div>
                <div class="font-semibold text-sm">Reports</div>
              </div>
              <div class="text-xs text-slate-600 mb-2">Briefings & Evidence</div>
            </div>
            <div class="text-xs text-slate-700">Generate one-click leadership briefs that capture what we decided, why, and what happened next.</div>
          </button>
        </div>
      </div>
    </div>

    <!-- Phased Roadmap (Timeline) -->
    <div class="bg-white border rounded-xl p-6 mb-6">
      <div class="text-lg font-bold mb-2">Phased Roadmap: From Demo to Deployable Capability</div>
      <div class="text-sm text-slate-600 mb-6">Progressive approach from prototype validation to closed-loop optimization.</div>

      <div class="space-y-4">
        ${roadmap.map((phase, index) => `
          <div class="relative pl-8 ${phase.status === 'NOW' ? 'border-l-4 border-green-500' : 'border-l-4 border-slate-300'}">
            <div class="absolute left-0 top-0 -ml-2 w-4 h-4 rounded-full ${phase.status === 'NOW' ? 'bg-green-500 ring-4 ring-green-100' : 'bg-slate-300'}"></div>

            <div class="pb-4">
              <div class="flex items-center gap-2 mb-2">
                <div class="font-semibold">${phase.phase}</div>
                ${phase.status === 'NOW' ? '<span class="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-semibold rounded">YOU ARE HERE</span>' : ''}
                ${phase.status === 'NEXT' ? '<span class="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-semibold rounded">NEXT</span>' : ''}
              </div>

              <div class="text-sm text-slate-700 mb-3">${phase.goal}</div>

              <div class="text-xs font-semibold text-slate-500 mb-2">SUCCESS METRICS:</div>
              <ul class="space-y-1">
                ${phase.successMetrics.map(metric => `
                  <li class="flex items-start gap-2 text-xs text-slate-600">
                    <span class="text-green-600">✓</span>
                    <span>${metric}</span>
                  </li>
                `).join('')}
              </ul>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- AI Integration Note -->
    <div class="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6 mb-6">
      <div class="flex items-start gap-4">
        <div class="text-4xl">🤖</div>
        <div class="flex-1">
          <div class="text-lg font-bold mb-2">Where AI Helps (Decision Support, Not Just Automation)</div>
          <ul class="space-y-2 text-sm">
            <li class="flex items-start gap-2">
              <span class="text-blue-600">•</span>
              <span>Convert messy inputs (emails, notes, daily updates) into <strong>structured signals and confidence labels</strong></span>
            </li>
            <li class="flex items-start gap-2">
              <span class="text-blue-600">•</span>
              <span>Explain <strong>"why commit is at risk"</strong> in plain language and generate decision-ready action options</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="text-blue-600">•</span>
              <span>Generate <strong>leadership briefs and evidence packs automatically</strong>, so reviews focus on decisions, not data collection</span>
            </li>
          </ul>
          <div class="mt-4 text-xs text-slate-600">
            Click the 🤖 buttons throughout the demo to see AI-powered decision support in action.
          </div>
        </div>
      </div>
    </div>

    <!-- Demo Notes Footer -->
    <div class="bg-slate-50 border rounded-xl p-6">
      <div class="text-sm font-semibold text-slate-700 mb-3">Demo Notes</div>
      <ul class="space-y-2 text-sm text-slate-600">
        <li class="flex items-start gap-2">
          <span>•</span>
          <span>This page is designed for internal alignment: it translates the org SCDO direction into a concrete factory-side extension proposal.</span>
        </li>
        <li class="flex items-start gap-2">
          <span>•</span>
          <span>All data in this prototype is mocked for illustration; the goal is to validate the decision workflow and information design.</span>
        </li>
        <li class="flex items-start gap-2">
          <span>•</span>
          <span>Next step: confirm minimum viable factory signals and define confidence scoring + routing guardrails.</span>
        </li>
      </ul>
    </div>
  `;

  $("content").innerHTML = html;
}

// ========================================
// PORTFOLIO - All Programs
// ========================================
function renderPortfolio() {
  const portfolio = STATE.data.portfolio;

  if (!portfolio) {
    $("content").innerHTML = `<div class="p-4 text-center text-slate-500">Portfolio data not available</div>`;
    return;
  }

  const { summary, programs, topExceptions } = portfolio;

  const html = `
    <!-- Page Header -->
    <div class="bg-white border rounded-xl p-6 mb-4">
      <div class="flex items-start justify-between mb-2">
        <div class="flex-1">
          <div class="text-lg font-bold mb-2">Portfolio — All Programs</div>
          <div class="text-sm text-slate-600">Single place to see which programs are at risk this week, where to focus, and which actions change outcomes.</div>
        </div>
        <button onclick="openAIDrawer('portfolio_exec_summary')" class="flex items-center gap-2 text-sm bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg px-4 py-2 hover:from-blue-700 hover:to-purple-700 flex-shrink-0">
          <span>🤖</span>
          <span>AI: Weekly Exec Summary</span>
        </button>
      </div>
    </div>

    <!-- Top KPI Strip -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
      <div class="bg-white border-2 border-blue-300 bg-blue-50 rounded-xl p-4">
        <div class="text-xs text-slate-500 font-semibold mb-1">Programs in Scope</div>
        <div class="text-3xl font-bold text-blue-700">${summary.programsInScope}</div>
        <div class="text-xs text-slate-600 mt-1">Active programs with weekly commit.</div>
      </div>
      <div class="bg-white border-2 ${summary.commitHealth === 'GREEN' ? 'border-green-400 bg-green-50' : summary.commitHealth === 'YELLOW' ? 'border-yellow-400 bg-yellow-50' : 'border-red-400 bg-red-50'} rounded-xl p-4">
        <div class="text-xs text-slate-500 font-semibold mb-1">Commit Health (Weighted)</div>
        <div class="flex items-center gap-2">
          <div class="text-3xl font-bold ${summary.commitHealth === 'GREEN' ? 'text-green-700' : summary.commitHealth === 'YELLOW' ? 'text-yellow-700' : 'text-red-700'}">${summary.commitHealth}</div>
        </div>
        <div class="text-xs text-slate-600 mt-1">Weighted by units at risk.</div>
      </div>
      <div class="bg-white border-2 ${summary.atRiskUnits > 20000 ? 'border-red-400 bg-red-50' : summary.atRiskUnits > 10000 ? 'border-yellow-400 bg-yellow-50' : 'border-green-400 bg-green-50'} rounded-xl p-4">
        <div class="text-xs text-slate-500 font-semibold mb-1">At-risk Units (This Week)</div>
        <div class="text-3xl font-bold ${summary.atRiskUnits > 20000 ? 'text-red-700' : summary.atRiskUnits > 10000 ? 'text-yellow-700' : 'text-green-700'}">${summary.atRiskUnits.toLocaleString()}</div>
        <div class="text-xs text-slate-600 mt-1">Units that may miss ship window without actions.</div>
      </div>
      <div class="bg-white border-2 ${summary.inventoryPressure === 'GREEN' ? 'border-green-400 bg-green-50' : summary.inventoryPressure === 'YELLOW' ? 'border-yellow-400 bg-yellow-50' : 'border-red-400 bg-red-50'} rounded-xl p-4">
        <div class="text-xs text-slate-500 font-semibold mb-1">Inventory & Liability Pressure</div>
        <div class="flex items-center gap-2">
          <div class="text-3xl font-bold ${summary.inventoryPressure === 'GREEN' ? 'text-green-700' : summary.inventoryPressure === 'YELLOW' ? 'text-yellow-700' : 'text-red-700'}">${summary.inventoryPressure}</div>
        </div>
        <div class="text-xs text-slate-600 mt-1">FG/WIP/components exposure under downside signals.</div>
      </div>
    </div>

    <!-- Portfolio Table -->
    <div class="bg-white border rounded-xl overflow-hidden mb-4">
      <div class="p-4 border-b">
        <div class="text-sm font-semibold">Program Summary — Week ${portfolio.week}</div>
        <div class="text-xs text-slate-500 mt-1">Click a program to open Delivery Command Center.</div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead class="bg-slate-50 border-b">
            <tr>
              <th class="text-left p-3 font-semibold">Program</th>
              <th class="text-left p-3 font-semibold">Build Sites</th>
              <th class="text-left p-3 font-semibold">Commit Health</th>
              <th class="text-right p-3 font-semibold">At-risk Units</th>
              <th class="text-left p-3 font-semibold">Top Driver</th>
              <th class="text-left p-3 font-semibold">Next Action</th>
              <th class="text-left p-3 font-semibold">Owner / SLA</th>
              <th class="text-left p-3 font-semibold">Pacing Guardrail</th>
            </tr>
          </thead>
          <tbody>
            ${programs.map(prog => `
              <tr class="border-b hover:bg-slate-50 cursor-pointer" onclick="enterProgram('${prog.name}', '${prog.buildSites.split(',')[0].trim()}');">
                <td class="p-3 font-semibold">${prog.name}</td>
                <td class="p-3 text-slate-600">${prog.buildSites}</td>
                <td class="p-3">
                  <span class="px-2 py-1 rounded text-xs font-semibold ${prog.commitHealth === 'GREEN' ? 'bg-green-100 text-green-800' : prog.commitHealth === 'YELLOW' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}">
                    ${prog.commitHealth}
                  </span>
                </td>
                <td class="p-3 text-right font-semibold">${prog.atRiskUnits.toLocaleString()}</td>
                <td class="p-3 text-slate-600">${prog.topDriver}</td>
                <td class="p-3">${prog.nextAction}</td>
                <td class="p-3 text-slate-600">${prog.owner} · ${prog.sla}</td>
                <td class="p-3 text-slate-600">${prog.pacingGuardrail}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Right-side panel: Top Exceptions -->
    <div class="bg-white border rounded-xl p-6">
      <div class="text-sm font-semibold mb-2">Top Exceptions (Across Programs)</div>
      <div class="text-xs text-slate-500 mb-4">Exceptions are ranked by Impact × Confidence.</div>

      <div class="space-y-2">
        ${topExceptions.map((ex, idx) => `
          <div class="border rounded-lg p-3 flex items-start gap-3">
            <div class="text-lg font-bold text-slate-400">#${idx + 1}</div>
            <div class="flex-1">
              <div class="font-semibold text-sm">${ex.program} — ${ex.issue}</div>
              <div class="mt-1">
                <span class="px-2 py-0.5 rounded text-xs font-semibold ${ex.severity === 'HIGH' ? 'bg-red-100 text-red-800' : ex.severity === 'MED' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}">
                  ${ex.severity}
                </span>
              </div>
            </div>
          </div>
        `).join('')}
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
      <div class="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div class="text-xs font-semibold text-amber-900 uppercase mb-2">⚠️ Pacing Guardrail (Secondary)</div>
        <div class="text-sm text-amber-900 mb-2">${pacingGuardrail.message}</div>
        <div class="text-xs text-amber-800"><strong>Rule:</strong> ${pacingGuardrail.rule}</div>
      </div>
    ` : ''}
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

// 1. Delivery Command Center
function renderDeliveryCommandCenter() {
  const cutoffTime = getWeekMondayCutoff();

  const html = `
    <!-- Scenario Focus with Cutoff Time -->
    <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-lg p-4 mb-4">
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <div class="text-lg font-bold text-slate-900 mb-1">Scenario Focus: Protect W04 Commit (Delivery Risk + Yield Drift)</div>
          <div class="text-sm text-slate-700">Material constraint + yield drift are pressuring commit confidence. Prioritize actions that change outcomes within 48 hours.</div>
        </div>
        <div class="text-right">
          <div class="text-xs text-slate-600 font-semibold">Scope</div>
          <div class="text-sm font-bold text-blue-700 mb-2">Product A · Total · 2026-W04</div>
          <div class="text-xs text-slate-500 bg-white rounded px-2 py-1 border">
            📅 Data Cut-off: <span class="font-semibold text-slate-700">${cutoffTime}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Product Snapshot -->
    <div class="bg-white border rounded-xl p-6 mb-4">
      <div class="text-lg font-bold text-slate-900 mb-3">Product Snapshot — Manufacturing Footprint</div>
      <div class="text-sm text-slate-600 mb-4">A stable view of where and how this product is built. Use this to sanity-check capacity and pacing decisions.</div>

      <div class="grid grid-cols-4 gap-4 mb-4">
        <div>
          <div class="text-xs text-slate-600 font-semibold mb-1">FY Volume (EoY)</div>
          <div class="text-2xl font-bold text-slate-900">2.8M units</div>
        </div>
        <div>
          <div class="text-xs text-slate-600 font-semibold mb-1">EOM (End of Manufacturing)</div>
          <div class="text-lg text-slate-900">2026-11</div>
        </div>
        <div>
          <div class="text-xs text-slate-600 font-semibold mb-1">Primary Build Sites</div>
          <div class="text-lg text-slate-900">WF (CN), VN-02 (VN)</div>
        </div>
        <div>
          <div class="text-xs text-slate-600 font-semibold mb-1">Weekly Capacity (Nominal)</div>
          <div class="text-lg text-slate-900">150k / week</div>
        </div>
      </div>

      <div class="bg-slate-50 border rounded-lg p-4">
        <div class="text-xs font-semibold text-slate-700 mb-2">Lines & UPH</div>
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>WF (CN): 3 lines · 110–135 UPH</div>
          <div>VN-02 (VN): 2 lines · 95–120 UPH</div>
        </div>
      </div>

      <div class="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
        <div class="text-xs font-semibold text-amber-900 mb-1">Notable Constraints:</div>
        <div class="text-sm text-amber-800">Test lane shared across SKUs · IC-77 is single-source · Holiday labor availability impacts W05–W07</div>
      </div>

      <div class="text-xs text-slate-500 mt-3">Footprint metrics change infrequently; weekly execution signals update daily.</div>
    </div>

    <!-- Completion Index -->
    <div class="bg-white border rounded-xl p-6 mb-4">
      <div class="text-lg font-bold text-slate-900 mb-3">Completion Index</div>
      <div class="text-sm text-slate-600 mb-4">Key metrics showing progress and resource utilization</div>

      <div class="grid grid-cols-5 gap-3">
        <!-- Ex-F to Supply Commit -->
        <div class="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-400 rounded-xl p-4 text-center">
          <div class="text-xs font-semibold text-slate-700 mb-2">Ex-F to Supply Commit</div>
          <div class="text-4xl font-bold text-green-700 mb-1">94%</div>
          <div class="inline-block px-2 py-1 bg-green-100 border border-green-300 rounded text-xs font-semibold text-green-800">ON TRACK</div>
        </div>

        <!-- Capacity Utilization -->
        <div class="bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-400 rounded-xl p-4 text-center">
          <div class="text-xs font-semibold text-slate-700 mb-2">Capacity Utilization</div>
          <div class="text-4xl font-bold text-yellow-700 mb-1">87%</div>
          <div class="inline-block px-2 py-1 bg-yellow-100 border border-yellow-300 rounded text-xs font-semibold text-yellow-800">MODERATE</div>
        </div>

        <!-- Labor Fulfillment -->
        <div class="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-400 rounded-xl p-4 text-center">
          <div class="text-xs font-semibold text-slate-700 mb-2">Labor Fulfillment</div>
          <div class="text-4xl font-bold text-green-700 mb-1">96%</div>
          <div class="inline-block px-2 py-1 bg-green-100 border border-green-300 rounded text-xs font-semibold text-green-800">EXCELLENT</div>
        </div>

        <!-- Cum Output -->
        <div class="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-400 rounded-xl p-4 text-center">
          <div class="text-xs font-semibold text-slate-700 mb-2">Cum Output</div>
          <div class="text-3xl font-bold text-blue-700 mb-1">1.76M</div>
          <div class="inline-block px-2 py-1 bg-blue-100 border border-blue-300 rounded text-xs font-semibold text-blue-800">62.8% OF TARGET</div>
        </div>

        <!-- Cum Shipment -->
        <div class="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-400 rounded-xl p-4 text-center">
          <div class="text-xs font-semibold text-slate-700 mb-2">Cum Shipment</div>
          <div class="text-3xl font-bold text-purple-700 mb-1">1.68M</div>
          <div class="inline-block px-2 py-1 bg-purple-100 border border-purple-300 rounded text-xs font-semibold text-purple-800">95.5% SHIPPED</div>
        </div>
      </div>
    </div>

    <!-- Weekly Summary Table -->
    <div class="bg-white border rounded-xl p-6">
      <div class="text-lg font-bold text-slate-900 mb-3">Weekly Production Summary</div>
      <div class="text-sm text-slate-600 mb-4">Highlighting weekly status and cumulative progress</div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-100">
            <tr>
              <th class="px-4 py-3 text-left font-semibold text-slate-700">Metric</th>
              <th class="px-4 py-3 text-right font-semibold text-slate-700 bg-blue-50">Weekly</th>
              <th class="px-4 py-3 text-right font-semibold text-slate-700">Cumulative</th>
              <th class="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <tr class="hover:bg-slate-50">
              <td class="px-4 py-3 font-medium text-slate-900">Input</td>
              <td class="px-4 py-3 text-right bg-blue-50 font-bold text-blue-700">145,200</td>
              <td class="px-4 py-3 text-right text-slate-700">1,824,500</td>
              <td class="px-4 py-3">
                <span class="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">97% of target</span>
              </td>
            </tr>
            <tr class="hover:bg-slate-50">
              <td class="px-4 py-3 font-medium text-slate-900">Output</td>
              <td class="px-4 py-3 text-right bg-blue-50 font-bold text-blue-700">138,400</td>
              <td class="px-4 py-3 text-right text-slate-700">1,756,800</td>
              <td class="px-4 py-3">
                <span class="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">92% of target</span>
              </td>
            </tr>
            <tr class="hover:bg-slate-50">
              <td class="px-4 py-3 font-medium text-slate-900">Forecast</td>
              <td class="px-4 py-3 text-right bg-blue-50 font-bold text-blue-700">150,000</td>
              <td class="px-4 py-3 text-right text-slate-700">1,875,000</td>
              <td class="px-4 py-3">
                <span class="inline-block px-2 py-1 bg-slate-100 text-slate-800 text-xs font-semibold rounded">Baseline plan</span>
              </td>
            </tr>
            <tr class="hover:bg-slate-50">
              <td class="px-4 py-3 font-medium text-slate-900">Material Supply (Cum)</td>
              <td class="px-4 py-3 text-right bg-blue-50 font-bold text-blue-700">—</td>
              <td class="px-4 py-3 text-right text-slate-700">1,845,000</td>
              <td class="px-4 py-3">
                <span class="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">98% coverage</span>
              </td>
            </tr>
            <tr class="bg-slate-50 hover:bg-slate-100">
              <td class="px-4 py-3 font-bold text-slate-900">Yield (FPY)</td>
              <td class="px-4 py-3 text-right bg-blue-100 font-bold text-blue-900">94.2%</td>
              <td class="px-4 py-3 text-right text-slate-700">96.8%</td>
              <td class="px-4 py-3">
                <span class="inline-block px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded">⚠️ Below target (-3.3%)</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
        <div class="text-xs font-semibold text-blue-900 mb-1">Key Insight</div>
        <div class="text-sm text-blue-900">Weekly yield drift (-3.3%) at Test station is impacting output. Prioritize re-test lane capacity and containment actions to protect W04 commit.</div>
      </div>
    </div>
  `;

  $("content").innerHTML = html;
}

// 2. Production Plan
function renderProductionPlan() {
  const html = `
    <div class="bg-white border rounded-xl p-6">
      <div class="text-lg font-bold text-slate-900 mb-3">Production Plan</div>
      <div class="text-sm text-slate-600 mb-4">Interactive planning tool - update conditions to auto-generate production schedule</div>

      <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
        <div class="text-6xl mb-4">🏗️</div>
        <div class="text-xl font-bold text-slate-900 mb-2">Production Planning Tool</div>
        <div class="text-sm text-slate-600 mb-4">Configure parameters and generate optimized production schedules</div>
        <div class="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold">Coming Soon</div>
      </div>

      <div class="mt-6 grid grid-cols-3 gap-4">
        <div class="bg-slate-50 border rounded-lg p-4">
          <div class="text-xs text-slate-600 font-semibold mb-2">Planning Inputs</div>
          <ul class="text-xs text-slate-700 space-y-1">
            <li>• Demand forecast</li>
            <li>• Capacity constraints</li>
            <li>• Material availability</li>
            <li>• Labor schedule</li>
          </ul>
        </div>
        <div class="bg-slate-50 border rounded-lg p-4">
          <div class="text-xs text-slate-600 font-semibold mb-2">Auto-generation</div>
          <ul class="text-xs text-slate-700 space-y-1">
            <li>• Weekly build plan</li>
            <li>• Line allocation</li>
            <li>• WIP scheduling</li>
            <li>• Buffer recommendations</li>
          </ul>
        </div>
        <div class="bg-slate-50 border rounded-lg p-4">
          <div class="text-xs text-slate-600 font-semibold mb-2">Outputs</div>
          <ul class="text-xs text-slate-700 space-y-1">
            <li>• Production schedule</li>
            <li>• Resource allocation</li>
            <li>• Risk assessment</li>
            <li>• Constraint analysis</li>
          </ul>
        </div>
      </div>
    </div>
  `;

  $("content").innerHTML = html;
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

      <!-- Process Breakdown Table -->
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-100">
            <tr>
              <th class="px-4 py-3 text-left font-semibold text-slate-700">Process Stage</th>
              <th class="px-4 py-3 text-right font-semibold text-slate-700">Standard (Days)</th>
              <th class="px-4 py-3 text-right font-semibold text-slate-700">Actual (Days)</th>
              <th class="px-4 py-3 text-right font-semibold text-slate-700">Variance</th>
              <th class="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <tr class="hover:bg-slate-50">
              <td class="px-4 py-3 font-medium">MIH (Material In-House)</td>
              <td class="px-4 py-3 text-right">3.0</td>
              <td class="px-4 py-3 text-right font-bold">4.2</td>
              <td class="px-4 py-3 text-right text-red-700 font-semibold">+1.2</td>
              <td class="px-4 py-3">
                <span class="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">⚠️ Delayed</span>
              </td>
            </tr>
            <tr class="hover:bg-slate-50">
              <td class="px-4 py-3 font-medium">SMT Input</td>
              <td class="px-4 py-3 text-right">2.5</td>
              <td class="px-4 py-3 text-right font-bold">3.1</td>
              <td class="px-4 py-3 text-right text-red-700 font-semibold">+0.6</td>
              <td class="px-4 py-3">
                <span class="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">⚠️ Delayed</span>
              </td>
            </tr>
            <tr class="hover:bg-slate-50">
              <td class="px-4 py-3 font-medium">SMT Output</td>
              <td class="px-4 py-3 text-right">5.0</td>
              <td class="px-4 py-3 text-right font-bold">5.8</td>
              <td class="px-4 py-3 text-right text-red-700 font-semibold">+0.8</td>
              <td class="px-4 py-3">
                <span class="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">⚠️ Delayed</span>
              </td>
            </tr>
            <tr class="hover:bg-slate-50">
              <td class="px-4 py-3 font-medium">FAT Input</td>
              <td class="px-4 py-3 text-right">4.0</td>
              <td class="px-4 py-3 text-right font-bold">5.2</td>
              <td class="px-4 py-3 text-right text-red-700 font-semibold">+1.2</td>
              <td class="px-4 py-3">
                <span class="inline-block px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded">🔴 Critical</span>
              </td>
            </tr>
            <tr class="hover:bg-slate-50">
              <td class="px-4 py-3 font-medium">Packing</td>
              <td class="px-4 py-3 text-right">6.0</td>
              <td class="px-4 py-3 text-right font-bold">6.9</td>
              <td class="px-4 py-3 text-right text-red-700 font-semibold">+0.9</td>
              <td class="px-4 py-3">
                <span class="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">⚠️ Delayed</span>
              </td>
            </tr>
            <tr class="hover:bg-slate-50">
              <td class="px-4 py-3 font-medium">WH (Warehouse)</td>
              <td class="px-4 py-3 text-right">2.5</td>
              <td class="px-4 py-3 text-right font-bold">2.8</td>
              <td class="px-4 py-3 text-right text-yellow-700 font-semibold">+0.3</td>
              <td class="px-4 py-3">
                <span class="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">✅ Acceptable</span>
              </td>
            </tr>
            <tr class="bg-slate-100 font-bold">
              <td class="px-4 py-3">Total Lead-time</td>
              <td class="px-4 py-3 text-right">23.0</td>
              <td class="px-4 py-3 text-right text-lg">28.0</td>
              <td class="px-4 py-3 text-right text-red-700 text-lg">+5.0</td>
              <td class="px-4 py-3"></td>
            </tr>
          </tbody>
        </table>
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
            <div class="text-xs font-semibold text-slate-700 mb-2">Actual BTO Lead-time</div>
            <div class="text-4xl font-bold text-red-700">23 days</div>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-100">
              <tr>
                <th class="px-4 py-3 text-left font-semibold text-slate-700">BTO Stage</th>
                <th class="px-4 py-3 text-right font-semibold text-slate-700">Standard</th>
                <th class="px-4 py-3 text-right font-semibold text-slate-700">Actual</th>
                <th class="px-4 py-3 text-right font-semibold text-slate-700">Gap</th>
                <th class="px-4 py-3 text-left font-semibold text-slate-700">Improvement Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y">
              <tr class="hover:bg-slate-50">
                <td class="px-4 py-3 font-medium">Order Processing</td>
                <td class="px-4 py-3 text-right">1 day</td>
                <td class="px-4 py-3 text-right font-bold">1.5 days</td>
                <td class="px-4 py-3 text-right text-red-700">+0.5</td>
                <td class="px-4 py-3 text-xs">Automate order validation</td>
              </tr>
              <tr class="hover:bg-slate-50 bg-red-50">
                <td class="px-4 py-3 font-medium">Material Kitting</td>
                <td class="px-4 py-3 text-right">2 days</td>
                <td class="px-4 py-3 text-right font-bold">4 days</td>
                <td class="px-4 py-3 text-right text-red-700 font-bold">+2.0</td>
                <td class="px-4 py-3 text-xs font-semibold text-red-700">🔴 Pre-stage critical parts, optimize warehouse layout</td>
              </tr>
              <tr class="hover:bg-slate-50">
                <td class="px-4 py-3 font-medium">Assembly</td>
                <td class="px-4 py-3 text-right">8 days</td>
                <td class="px-4 py-3 text-right font-bold">10 days</td>
                <td class="px-4 py-3 text-right text-red-700">+2.0</td>
                <td class="px-4 py-3 text-xs">Reduce changeover time, add flex capacity</td>
              </tr>
              <tr class="hover:bg-slate-50">
                <td class="px-4 py-3 font-medium">Testing & QC</td>
                <td class="px-4 py-3 text-right">4 days</td>
                <td class="px-4 py-3 text-right font-bold">4.5 days</td>
                <td class="px-4 py-3 text-right text-yellow-700">+0.5</td>
                <td class="px-4 py-3 text-xs">Parallel testing for high-volume SKUs</td>
              </tr>
              <tr class="hover:bg-slate-50">
                <td class="px-4 py-3 font-medium">Packing & Shipping</td>
                <td class="px-4 py-3 text-right">3 days</td>
                <td class="px-4 py-3 text-right font-bold">3 days</td>
                <td class="px-4 py-3 text-right text-green-700">0.0</td>
                <td class="px-4 py-3 text-xs text-green-700">✅ Meeting standard</td>
              </tr>
            </tbody>
          </table>
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
            <div class="text-xs font-semibold text-slate-700 mb-2">Actual CTO Lead-time</div>
            <div class="text-4xl font-bold text-yellow-700">14 days</div>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-100">
              <tr>
                <th class="px-4 py-3 text-left font-semibold text-slate-700">CTO Stage</th>
                <th class="px-4 py-3 text-right font-semibold text-slate-700">Standard</th>
                <th class="px-4 py-3 text-right font-semibold text-slate-700">Actual</th>
                <th class="px-4 py-3 text-right font-semibold text-slate-700">Gap</th>
                <th class="px-4 py-3 text-left font-semibold text-slate-700">Improvement Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y">
              <tr class="hover:bg-slate-50">
                <td class="px-4 py-3 font-medium">Configuration Design</td>
                <td class="px-4 py-3 text-right">1 day</td>
                <td class="px-4 py-3 text-right font-bold">1 day</td>
                <td class="px-4 py-3 text-right text-green-700">0.0</td>
                <td class="px-4 py-3 text-xs text-green-700">✅ Meeting standard</td>
              </tr>
              <tr class="hover:bg-slate-50 bg-yellow-50">
                <td class="px-4 py-3 font-medium">Part Sourcing</td>
                <td class="px-4 py-3 text-right">3 days</td>
                <td class="px-4 py-3 text-right font-bold">4 days</td>
                <td class="px-4 py-3 text-right text-yellow-700 font-bold">+1.0</td>
                <td class="px-4 py-3 text-xs font-semibold text-yellow-700">⚠️ Buffer stock for common configs</td>
              </tr>
              <tr class="hover:bg-slate-50">
                <td class="px-4 py-3 font-medium">Custom Assembly</td>
                <td class="px-4 py-3 text-right">5 days</td>
                <td class="px-4 py-3 text-right font-bold">6 days</td>
                <td class="px-4 py-3 text-right text-yellow-700">+1.0</td>
                <td class="px-4 py-3 text-xs">Dedicated CTO line, reduce setup time</td>
              </tr>
              <tr class="hover:bg-slate-50">
                <td class="px-4 py-3 font-medium">Final Test</td>
                <td class="px-4 py-3 text-right">2 days</td>
                <td class="px-4 py-3 text-right font-bold">2 days</td>
                <td class="px-4 py-3 text-right text-green-700">0.0</td>
                <td class="px-4 py-3 text-xs text-green-700">✅ Meeting standard</td>
              </tr>
              <tr class="hover:bg-slate-50">
                <td class="px-4 py-3 font-medium">Fulfillment</td>
                <td class="px-4 py-3 text-right">1 day</td>
                <td class="px-4 py-3 text-right font-bold">1 day</td>
                <td class="px-4 py-3 text-right text-green-700">0.0</td>
                <td class="px-4 py-3 text-xs text-green-700">✅ Meeting standard</td>
              </tr>
            </tbody>
          </table>
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
      <div class="text-lg font-bold text-slate-900 mb-3">FV (Factory Variance) Management</div>
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
        <div class="text-lg font-bold text-slate-900 mb-3">Campus Readiness — Location & Space Utilization</div>
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
