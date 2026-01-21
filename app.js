let STATE = {
  data: null,
  scenarioId: "A",
  filters: {
    productLine: null,
    factory: null,
    week: null
  },
  activeView: "home", // home | signals | radar | orchestration | evidence
  selectedRiskId: null,
  prdMode: false
};

const $ = (id) => document.getElementById(id);

// Route icons
const ROUTE_ICONS = {
  "AUTO_ACTION_CANDIDATE": "✅",
  "HUMAN_REVIEW": "👤",
  "NO_ACTION": "💤"
};

// Workflow status
const WORKFLOW_STATUS = {
  "A": { signals: "GREEN", radar: "YELLOW", orchestration: "YELLOW", evidence: "GREEN" },
  "B": { signals: "GREEN", radar: "RED", orchestration: "RED", evidence: "GREEN" },
  "C": { signals: "YELLOW", radar: "YELLOW", orchestration: "YELLOW", evidence: "GREEN" }
};

// Sparkline generator
function generateSparkline(values, width = 80, height = 24) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const step = width / (values.length - 1);

  const points = values.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range * height);
    return `${x},${y}`;
  }).join(' ');

  return `<svg width="${width}" height="${height}" class="inline-block"><polyline points="${points}" class="sparkline"/></svg>`;
}

// Mini bar chart
function generateMiniBar(data) {
  const max = Math.max(...data.map(d => d.value));
  return data.map(d => {
    const pct = (d.value / max * 100).toFixed(0);
    return `
      <div class="flex items-center gap-2">
        <div class="text-xs w-12 text-slate-600">${d.label}</div>
        <div class="flex-1 bg-slate-100 rounded-full h-2">
          <div class="bg-slate-600 h-2 rounded-full" style="width: ${pct}%"></div>
        </div>
        <div class="text-xs font-semibold w-12 text-right">${d.value}</div>
      </div>
    `;
  }).join('');
}

async function loadData() {
  const res = await fetch("./mockData.json");
  const data = await res.json();
  STATE.data = data;

  // Add mock trend data
  STATE.data.trendData = {
    "A": { health: [58, 60, 59, 61, 62, 61, 62], inventory: [35, 36, 37, 38, 38, 37, 38] },
    "B": { health: [76, 77, 78, 78, 77, 78, 78], inventory: [72, 74, 76, 78, 80, 81, 81] },
    "C": { health: [65, 67, 68, 69, 70, 69, 69], inventory: [62, 63, 64, 65, 66, 66, 66] }
  };
}

function setMeta() {
  const { meta } = STATE.data;
  $("appName").textContent = "SCDO Control Tower — Factory Execution Loop";
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

  // Scenario select
  const scenarioSelect = $("scenarioSelect");
  scenarioSelect.innerHTML = "";
  STATE.data.scenarios.forEach(s => {
    const o = document.createElement("option");
    o.value = s.id;
    o.textContent = s.name.split("—")[0].trim();
    scenarioSelect.appendChild(o);
  });
  scenarioSelect.value = STATE.scenarioId;
  scenarioSelect.addEventListener("change", (e) => {
    setScenario(e.target.value);
  });

  // Filters
  const dims = STATE.data.dimensions;
  const scenario = getScenario();

  STATE.filters.productLine = scenario.defaultFilters.productLine;
  STATE.filters.factory = scenario.defaultFilters.factory;
  STATE.filters.week = scenario.defaultFilters.week;

  populateSelect($("productLineSelect"), dims.productLines, STATE.filters.productLine);
  populateSelect($("factorySelect"), dims.factories, STATE.filters.factory);
  populateSelect($("weekSelect"), dims.weeks, STATE.filters.week);

  $("productLineSelect").addEventListener("change", (e) => { STATE.filters.productLine = e.target.value; render(); });
  $("factorySelect").addEventListener("change", (e) => { STATE.filters.factory = e.target.value; render(); });
  $("weekSelect").addEventListener("change", (e) => { STATE.filters.week = e.target.value; render(); });

  // Modal controls
  $("closeModalBtn").addEventListener("click", closeModal);
  $("modalBackdrop").addEventListener("click", closeModal);
  $("printBtn").addEventListener("click", () => window.print());
}

function setScenario(id) {
  STATE.scenarioId = id;
  $("scenarioSelect").value = id;
  const scenario = getScenario();
  STATE.filters.productLine = scenario.defaultFilters.productLine;
  STATE.filters.factory = scenario.defaultFilters.factory;
  STATE.filters.week = scenario.defaultFilters.week;
  populateSelect($("productLineSelect"), STATE.data.dimensions.productLines, STATE.filters.productLine);
  populateSelect($("factorySelect"), STATE.data.dimensions.factories, STATE.filters.factory);
  populateSelect($("weekSelect"), STATE.data.dimensions.weeks, STATE.filters.week);

  STATE.activeView = "home";
  render();
}

function getScenario() {
  return STATE.data.scenarios.find(s => s.id === STATE.scenarioId);
}

function getDemo() {
  return STATE.data.demoData[STATE.scenarioId];
}

function getTrend() {
  return STATE.data.trendData[STATE.scenarioId];
}

function getWorkflowStatus() {
  return WORKFLOW_STATUS[STATE.scenarioId];
}

function navigateTo(view) {
  STATE.activeView = view;
  render();
}

function renderNav() {
  const nav = $("moduleNav");
  nav.innerHTML = "";

  const views = [
    { id: "home", icon: "🏠", label: "Home", subtitle: "Control Tower" },
    { id: "signals", icon: "📡", label: "Signals", subtitle: "Data & Events" },
    { id: "radar", icon: "🎯", label: "Risk Radar", subtitle: "Sense & Rank" },
    { id: "orchestration", icon: "⚙️", label: "Orchestration", subtitle: "Decide & Route" },
    { id: "evidence", icon: "📋", label: "Evidence & Learning", subtitle: "Briefing & Feedback" }
  ];

  views.forEach(v => {
    const btn = document.createElement("button");
    const isActive = STATE.activeView === v.id;
    btn.className = `text-left px-3 py-2 rounded-xl border transition
      ${isActive ? "bg-slate-900 text-white border-slate-900" : "bg-white hover:bg-slate-50 border-slate-200"}`;
    btn.innerHTML = `
      <div class="text-sm font-semibold">${v.icon} ${v.label}</div>
      <div class="text-xs ${isActive ? "text-slate-200" : "text-slate-500"}">${v.subtitle}</div>
    `;
    btn.addEventListener("click", () => navigateTo(v.id));
    nav.appendChild(btn);
  });

  // Separator + Specs (PRD Mode only)
  if (STATE.prdMode) {
    const sep = document.createElement("div");
    sep.className = "border-t my-2 pt-2";
    sep.innerHTML = '<div class="text-xs font-semibold text-slate-500 px-3">TECHNICAL SPECS</div>';
    nav.appendChild(sep);

    const specsBtn = document.createElement("button");
    specsBtn.className = "w-full text-left px-3 py-2 rounded-xl border bg-white hover:bg-slate-50 border-slate-200 text-xs";
    specsBtn.innerHTML = "📚 Module Contracts";
    specsBtn.addEventListener("click", () => alert("Module specs - would show detailed I/O contracts"));
    nav.appendChild(specsBtn);
  }
}

function render() {
  renderNav();
  const content = $("content");
  content.innerHTML = "";

  const scenario = getScenario();
  const demo = getDemo();

  // Header card
  content.appendChild(card(`
    <div class="flex items-start justify-between gap-3">
      <div>
        <div class="text-xs text-slate-500 mb-1">ACTIVE SCENARIO</div>
        <div class="text-lg font-semibold">${scenario.name}</div>
        <div class="text-sm text-slate-600 mt-1">${scenario.description}</div>
      </div>
      <div class="text-right">
        <div class="text-xs text-slate-500">Scope</div>
        <div class="text-sm font-semibold">${STATE.filters.productLine}</div>
        <div class="text-xs text-slate-500">${STATE.filters.factory} · ${STATE.filters.week}</div>
      </div>
    </div>
  `));

  // Render based on active view
  if (STATE.activeView === "home") {
    content.appendChild(renderHome(demo));
  } else if (STATE.activeView === "signals") {
    content.appendChild(renderSignals(demo));
  } else if (STATE.activeView === "radar") {
    content.appendChild(renderRadar(demo));
  } else if (STATE.activeView === "orchestration") {
    content.appendChild(renderOrchestration(demo));
  } else if (STATE.activeView === "evidence") {
    content.appendChild(renderEvidence(demo));
  }
}

function card(innerHtml) {
  const div = document.createElement("div");
  div.className = "bg-white rounded-2xl shadow-sm border p-4";
  div.innerHTML = innerHtml;
  return div;
}

function badge(status) {
  const map = {
    "GREEN": "bg-green-50 text-green-700 border-green-200",
    "YELLOW": "bg-amber-50 text-amber-700 border-amber-200",
    "RED": "bg-rose-50 text-rose-700 border-rose-200"
  };
  const cls = map[status] || "bg-slate-50 text-slate-700 border-slate-200";
  return `<span class="inline-flex items-center px-2 py-0.5 rounded-lg text-xs border font-medium ${cls}">${status}</span>`;
}

function renderHome(demo) {
  const k = demo.kpis;
  const late = demo.riskItemsLate || [];
  const excess = demo.riskItemsExcess || [];
  const events = demo.events || [];
  const trend = getTrend();
  const workflowStatus = getWorkflowStatus();

  const wrapper = document.createElement("div");
  wrapper.className = "space-y-4";

  // Workflow Rail
  const workflow = STATE.data.workflow;
  const counts = {
    signals: events.length,
    radar: late.length + excess.length,
    orchestration: [...late, ...excess].filter(r => r.route !== "NO_ACTION").length,
    evidence: [...late, ...excess].length
  };

  wrapper.appendChild(card(`
    <div class="text-sm font-semibold mb-3">Decision Workflow</div>
    <div class="grid grid-cols-4 gap-2">
      ${workflow.map(w => `
        <button onclick="navigateTo('${w.id}')" class="text-left border rounded-xl p-3 hover:bg-slate-50 transition group">
          <div class="flex items-center justify-between mb-2">
            <div class="text-xs font-semibold text-slate-500">${w.name.toUpperCase()}</div>
            ${badge(workflowStatus[w.id])}
          </div>
          <div class="text-sm font-semibold group-hover:text-blue-600">${w.tagline}</div>
          <div class="text-xs text-slate-500 mt-2">Count: ${counts[w.id]}</div>
        </button>
      `).join("")}
    </div>
    <div class="flex items-center justify-center gap-2 mt-3 text-slate-400">
      <div class="text-xs">→</div>
      <div class="text-xs">→</div>
      <div class="text-xs">→</div>
    </div>
  `));

  // Today's Loop - Case Thread
  const mainCase = late[0] || excess[0];
  if (mainCase) {
    const ev = mainCase.evidence;
    wrapper.appendChild(card(`
      <div class="text-sm font-semibold mb-3">Today's Loop — End-to-End Case</div>
      <div class="border-l-4 border-blue-500 pl-4 space-y-3">
        <div>
          <div class="text-xs text-slate-500">CASE</div>
          <div class="font-semibold">${mainCase.object}</div>
          <div class="text-xs text-slate-600 mt-1">Score: ${mainCase.score} | Confidence: ${(mainCase.confidence * 100).toFixed(0)}%</div>
        </div>
        <div>
          <div class="text-xs text-slate-500">→ SIGNAL</div>
          <div class="text-sm">${ev.signals.slice(0, 2).join(", ")}</div>
        </div>
        <div>
          <div class="text-xs text-slate-500">→ RISK</div>
          <div class="text-sm">${mainCase.drivers[0]}</div>
        </div>
        <div>
          <div class="text-xs text-slate-500">→ ROUTE</div>
          <div class="text-sm flex items-center gap-2">
            <span class="text-lg">${ROUTE_ICONS[mainCase.route]}</span>
            <span>${mainCase.route.replace(/_/g, " ")}</span>
          </div>
        </div>
        <div>
          <div class="text-xs text-slate-500">→ ACTION</div>
          <div class="text-sm">${mainCase.recommendedAction}</div>
        </div>
        <div>
          <div class="text-xs text-slate-500">→ EVIDENCE PACK</div>
          <button onclick="window.__openEvidence('${mainCase.id}')" class="text-sm text-blue-600 hover:underline">Ready - Click to review</button>
        </div>
        <div>
          <div class="text-xs text-slate-500">→ FEEDBACK</div>
          <div class="text-sm text-slate-500">Pending</div>
        </div>
      </div>
    `));
  }

  // KPIs with sparklines
  wrapper.appendChild(card(`
    <div class="text-sm font-semibold mb-3">Executive Summary</div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="border rounded-xl p-3 bg-gradient-to-br from-slate-50 to-white">
        <div class="flex items-center justify-between mb-2">
          <div class="text-xs text-slate-500">EXECUTION HEALTH</div>
          ${badge(k.executionHealth.status)}
        </div>
        <div class="flex items-end justify-between">
          <div class="text-3xl font-bold">${k.executionHealth.score}</div>
          <div class="text-slate-400">${generateSparkline(trend.health)}</div>
        </div>
        <div class="text-xs text-slate-600 mt-2">7-day trend</div>
      </div>
      <div class="border rounded-xl p-3 bg-gradient-to-br from-slate-50 to-white">
        <div class="flex items-center justify-between mb-2">
          <div class="text-xs text-slate-500">INVENTORY PRESSURE</div>
          ${badge(k.inventoryPressure.status)}
        </div>
        <div class="flex items-end justify-between">
          <div class="text-3xl font-bold">${k.inventoryPressure.score}</div>
          <div class="text-slate-400">${generateSparkline(trend.inventory)}</div>
        </div>
        <div class="text-xs text-slate-600 mt-2">7-day trend</div>
      </div>
    </div>
  `));

  // Dual Risk Top 3 (Compact)
  const compactRiskCard = (r) => {
    const icon = ROUTE_ICONS[r.route] || "•";
    return `
      <button class="w-full text-left border rounded-lg p-2 hover:bg-slate-50 transition"
        onclick="window.__openEvidence('${r.id}')">
        <div class="flex items-center justify-between text-xs">
          <div class="font-semibold flex-1 truncate">${r.object}</div>
          <div class="flex items-center gap-1.5">
            <span class="text-base">${icon}</span>
            <span class="font-semibold">${r.score}</span>
          </div>
        </div>
        <div class="text-xs text-slate-600 mt-1 truncate">${r.drivers[0]}</div>
      </button>
    `;
  };

  wrapper.appendChild(card(`
    <div class="text-sm font-semibold mb-3">Top Priorities</div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <div class="flex items-center justify-between mb-2">
          <div class="text-xs font-semibold text-slate-500">LATE RISK (Supply)</div>
          <div class="text-xs text-slate-500">${late.length} total</div>
        </div>
        <div class="space-y-1.5">
          ${late.slice(0, 3).map(r => compactRiskCard(r)).join("") || `<div class="text-sm text-slate-500 text-center py-3">No late risks</div>`}
        </div>
        ${late.length > 3 ? `<button class="text-xs text-blue-600 hover:underline mt-2" onclick="navigateTo('radar')">View all →</button>` : ''}
      </div>
      <div>
        <div class="flex items-center justify-between mb-2">
          <div class="text-xs font-semibold text-slate-500">EXCESS RISK (Inventory)</div>
          <div class="text-xs text-slate-500">${excess.length} total</div>
        </div>
        <div class="space-y-1.5">
          ${excess.slice(0, 3).map(r => compactRiskCard(r)).join("") || `<div class="text-sm text-slate-500 text-center py-3">No excess risks</div>`}
        </div>
        ${excess.length > 3 ? `<button class="text-xs text-blue-600 hover:underline mt-2" onclick="navigateTo('radar')">View all →</button>` : ''}
      </div>
    </div>
  `));

  // Recent Events (Top 3)
  const severityPill = (sev) => {
    const map = { LOW: "bg-slate-100 text-slate-700", MED: "bg-amber-100 text-amber-800", HIGH: "bg-rose-100 text-rose-800" };
    return `<span class="px-2 py-0.5 rounded-lg text-xs ${map[sev] || map.LOW}">${sev}</span>`;
  };

  wrapper.appendChild(card(`
    <div class="flex items-center justify-between mb-3">
      <div class="text-sm font-semibold">Recent Events</div>
      <button onclick="navigateTo('signals')" class="text-xs text-blue-600 hover:underline">View all →</button>
    </div>
    <div class="space-y-2">
      ${events.slice(0, 3).map(e => `
        <div class="flex items-start justify-between gap-3 border rounded-lg p-2">
          <div class="flex-1">
            <div class="text-xs text-slate-500">${e.time} · ${e.type}</div>
            <div class="text-sm font-medium mt-0.5">${e.title}</div>
          </div>
          ${severityPill(e.severity)}
        </div>
      `).join("")}
    </div>
  `));

  return wrapper;
}

function renderSignals(demo) {
  const events = demo.events || [];
  const module = STATE.data.modules.find(m => m.id === 1);

  const wrapper = document.createElement("div");
  wrapper.className = "space-y-4";

  wrapper.appendChild(card(`
    <div class="text-sm font-semibold mb-2">📡 Signals — Data & Events Layer</div>
    <div class="text-sm text-slate-600">Turn scattered data into trusted signals with quality labels and event streams</div>
  `));

  // Data quality grid
  const sources = ["Planning", "Factory", "Materials", "Inventory", "Demand"];
  const aspects = ["Freshness", "Coverage", "Trust"];
  const quality = {
    "Planning": ["GREEN", "GREEN", "GREEN"],
    "Factory": ["GREEN", "YELLOW", "GREEN"],
    "Materials": ["GREEN", "GREEN", "GREEN"],
    "Inventory": ["YELLOW", "YELLOW", "GREEN"],
    "Demand": ["GREEN", "YELLOW", "GREEN"]
  };

  wrapper.appendChild(card(`
    <div class="text-sm font-semibold mb-3">Data Quality Matrix</div>
    <div class="overflow-x-auto">
      <table class="w-full text-xs">
        <thead>
          <tr class="border-b">
            <th class="text-left py-2 px-2">Source</th>
            ${aspects.map(a => `<th class="text-center py-2 px-2">${a}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${sources.map(s => `
            <tr class="border-b">
              <td class="py-2 px-2 font-medium">${s}</td>
              ${quality[s].map(q => `<td class="text-center py-2 px-2">${badge(q)}</td>`).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `));

  // Event Stream
  const severityPill = (sev) => {
    const map = { LOW: "bg-slate-100 text-slate-700", MED: "bg-amber-100 text-amber-800", HIGH: "bg-rose-100 text-rose-800" };
    return `<span class="px-2 py-0.5 rounded-lg text-xs ${map[sev] || map.LOW}">${sev}</span>`;
  };

  wrapper.appendChild(card(`
    <div class="text-sm font-semibold mb-3">Event Stream (All)</div>
    <div class="space-y-2">
      ${events.map(e => `
        <div class="flex items-start justify-between gap-3 border rounded-lg p-2">
          <div class="flex-1">
            <div class="text-xs text-slate-500">${e.time} · ${e.type}</div>
            <div class="text-sm font-medium mt-0.5">${e.title}</div>
          </div>
          ${severityPill(e.severity)}
        </div>
      `).join("")}
    </div>
  `));

  // Source Cards
  wrapper.appendChild(card(`
    <div class="text-sm font-semibold mb-3">Source Cards</div>
    <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
      ${module.inputs.slice(0, 6).map(i => `
        <div class="border rounded-lg p-2 bg-slate-50">
          <div class="text-xs font-semibold">${i.name}</div>
          <div class="text-xs text-slate-600 mt-1">${i.source}</div>
          <div class="flex items-center justify-between mt-2">
            <span class="text-xs text-slate-500">${i.refresh}</span>
            ${badge(i.quality)}
          </div>
        </div>
      `).join("")}
    </div>
  `));

  if (STATE.prdMode) {
    wrapper.appendChild(renderModuleSpec(module));
  }

  return wrapper;
}

function renderRadar(demo) {
  const k = demo.kpis;
  const late = demo.riskItemsLate || [];
  const excess = demo.riskItemsExcess || [];
  const trend = getTrend();

  const wrapper = document.createElement("div");
  wrapper.className = "space-y-4";

  wrapper.appendChild(card(`
    <div class="text-sm font-semibold mb-2">🎯 Risk Radar — Sense & Rank</div>
    <div class="text-sm text-slate-600">Identify dual risks with explainable drivers and confidence scores</div>
  `));

  const riskCard = (r) => {
    const icon = ROUTE_ICONS[r.route] || "•";
    return `
      <button class="w-full text-left border rounded-xl p-3 hover:bg-slate-50 transition"
        onclick="window.__openEvidence('${r.id}')">
        <div class="flex items-center justify-between">
          <div class="text-sm font-semibold flex-1">${r.object}</div>
          <div class="flex items-center gap-2">
            <span class="text-xl">${icon}</span>
            <div class="text-right">
              <div class="text-xs font-semibold">${r.score}</div>
              <div class="text-xs text-slate-500">${(r.confidence * 100).toFixed(0)}%</div>
            </div>
          </div>
        </div>
        <div class="text-xs text-slate-600 mt-2">
          <span class="font-semibold">Drivers:</span> ${r.drivers.slice(0, 2).join(" · ")}
        </div>
        <div class="text-xs mt-1.5 text-slate-700">
          → ${r.recommendedAction}
        </div>
      </button>
    `;
  };

  wrapper.appendChild(card(`
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div class="border rounded-2xl p-3 bg-slate-50">
        <div class="flex items-center justify-between">
          <div class="text-sm font-semibold">Execution Health</div>
          ${badge(k.executionHealth.status)}
        </div>
        <div class="flex items-end justify-between mt-2">
          <div class="text-3xl font-semibold">${k.executionHealth.score}</div>
          <div class="text-slate-400">${generateSparkline(trend.health)}</div>
        </div>
      </div>
      <div class="border rounded-2xl p-3 bg-slate-50">
        <div class="flex items-center justify-between">
          <div class="text-sm font-semibold">Inventory Pressure</div>
          ${badge(k.inventoryPressure.status)}
        </div>
        <div class="flex items-end justify-between mt-2">
          <div class="text-3xl font-semibold">${k.inventoryPressure.score}</div>
          <div class="text-slate-400">${generateSparkline(trend.inventory)}</div>
        </div>
      </div>
    </div>
  `));

  wrapper.appendChild(card(`
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div class="border rounded-2xl p-3">
        <div class="flex items-center justify-between mb-2">
          <div class="text-sm font-semibold">Late Risk (All)</div>
          <div class="text-xs text-slate-500">Supply-side</div>
        </div>
        <div class="space-y-2">
          ${late.map(r => riskCard(r)).join("") || `<div class="text-sm text-slate-500">No late risks.</div>`}
        </div>
      </div>
      <div class="border rounded-2xl p-3">
        <div class="flex items-center justify-between mb-2">
          <div class="text-sm font-semibold">Excess Risk (All)</div>
          <div class="text-xs text-slate-500">Inventory-side</div>
        </div>
        <div class="space-y-2">
          ${excess.map(r => riskCard(r)).join("") || `<div class="text-sm text-slate-500">No excess risks.</div>`}
        </div>
      </div>
    </div>
  `));

  if (STATE.prdMode) {
    const modules = [2, 3, 4].map(id => STATE.data.modules.find(m => m.id === id));
    modules.forEach(m => wrapper.appendChild(renderModuleSpec(m)));
  }

  return wrapper;
}

function renderOrchestration(demo) {
  const playbooks = demo.playbooks || [];
  const module = STATE.data.modules.find(m => m.id === 5);

  const wrapper = document.createElement("div");
  wrapper.className = "space-y-4";

  wrapper.appendChild(card(`
    <div class="text-sm font-semibold mb-2">⚙️ Orchestration — Decide & Route</div>
    <div class="text-sm text-slate-600">Turn recommendations into routable workflows with playbooks</div>
  `));

  // Routing rules
  wrapper.appendChild(card(`
    <div class="text-sm font-semibold mb-3">Routing Rules</div>
    <div class="space-y-2">
      <div class="flex items-start gap-3 p-3 border rounded-xl bg-green-50">
        <span class="text-2xl">✅</span>
        <div class="flex-1">
          <div class="text-sm font-semibold">Auto-action</div>
          <div class="text-xs text-slate-600 mt-1">Confidence ≥ 80% + Risk score < 70 + Within policy</div>
        </div>
      </div>
      <div class="flex items-start gap-3 p-3 border rounded-xl bg-amber-50">
        <span class="text-2xl">👤</span>
        <div class="flex-1">
          <div class="text-sm font-semibold">Human review</div>
          <div class="text-xs text-slate-600 mt-1">Confidence 60-80% OR Risk score 70-85 OR Cross-team impact</div>
        </div>
      </div>
      <div class="flex items-start gap-3 p-3 border rounded-xl bg-slate-50">
        <span class="text-2xl">💤</span>
        <div class="flex-1">
          <div class="text-sm font-semibold">No action (Monitor)</div>
          <div class="text-xs text-slate-600 mt-1">Risk score < 60 OR Early signal only</div>
        </div>
      </div>
    </div>
  `));

  // Playbook library
  wrapper.appendChild(card(`
    <div class="text-sm font-semibold mb-3">Playbook Library</div>
    <div class="space-y-3">
      ${playbooks.map(pb => `
        <div class="border rounded-xl p-4">
          <div class="flex items-start justify-between mb-2">
            <div class="text-sm font-semibold">${pb.name}</div>
            <button class="text-xs text-blue-600 hover:underline" onclick="alert('Simulate: ${pb.name}')">Simulate</button>
          </div>
          <div class="text-xs text-slate-600 mb-3">When: ${pb.when}</div>
          <div class="flex items-center gap-2 overflow-x-auto">
            ${pb.steps.map((s, i) => `
              <div class="flex-shrink-0 border rounded-lg p-2 bg-slate-50 text-center" style="min-width: 120px;">
                <div class="text-xs font-semibold text-slate-500">Step ${i+1}</div>
                <div class="text-xs mt-1">${s.substring(0, 20)}...</div>
              </div>
            `).join("")}
          </div>
        </div>
      `).join("")}
    </div>
  `));

  if (STATE.prdMode) {
    wrapper.appendChild(renderModuleSpec(module));
  }

  return wrapper;
}

function renderEvidence(demo) {
  const allRisks = [...(demo.riskItemsLate || []), ...(demo.riskItemsExcess || [])];
  const module = STATE.data.modules.find(m => m.id === 6);

  const wrapper = document.createElement("div");
  wrapper.className = "space-y-4";

  wrapper.appendChild(card(`
    <div class="text-sm font-semibold mb-2">📋 Evidence & Learning — Briefing & Feedback</div>
    <div class="text-sm text-slate-600">Generate evidence packs and learn from outcomes</div>
  `));

  wrapper.appendChild(card(`
    <div class="text-sm font-semibold mb-3">Evidence Packs</div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
      ${allRisks.map(r => `
        <button class="text-left border rounded-xl p-3 hover:bg-slate-50"
          onclick="window.__openEvidence('${r.id}')">
          <div class="flex items-center justify-between">
            <div class="text-sm font-semibold flex-1 truncate">${r.object}</div>
            <span class="text-xl ml-2">${ROUTE_ICONS[r.route]}</span>
          </div>
          <div class="text-xs text-slate-600 mt-1">Score: ${r.score} · ${(r.confidence * 100).toFixed(0)}%</div>
          <div class="text-xs text-slate-700 mt-1 truncate">${r.recommendedAction}</div>
        </button>
      `).join("")}
    </div>
  `));

  if (STATE.prdMode) {
    wrapper.appendChild(renderModuleSpec(module));
  }

  return wrapper;
}

function renderModuleSpec(module) {
  const inputsTable = `
    <table class="w-full text-xs">
      <thead class="text-slate-500">
        <tr>
          <th class="text-left py-2">Input</th>
          <th class="text-left py-2">Source</th>
          <th class="text-left py-2">Refresh</th>
        </tr>
      </thead>
      <tbody>
        ${(module.inputs || []).map(i => `
          <tr class="border-t">
            <td class="py-2 font-medium">${i.name}</td>
            <td class="py-2">${i.source || "-"}</td>
            <td class="py-2">${i.refresh || "-"}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  const outputsList = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
      ${(module.outputs || []).map(o => `
        <div class="border rounded-lg p-2 bg-slate-50">
          <div class="text-xs font-semibold">${o.name}</div>
          <div class="text-xs text-slate-500 mt-1">Type: ${o.type}</div>
        </div>
      `).join("")}
    </div>
  `;

  const wrapper = document.createElement("div");
  wrapper.className = "space-y-4 border-t pt-4";

  wrapper.appendChild(card(`
    <div class="text-xs font-semibold text-slate-500 mb-2">📚 MODULE SPEC: ${module.title}</div>
    <div class="text-xs text-slate-600 mb-3">${module.decides}</div>
    <div class="space-y-3">
      <div>
        <div class="text-xs font-semibold text-slate-500 mb-2">INPUTS</div>
        ${inputsTable}
      </div>
      <div>
        <div class="text-xs font-semibold text-slate-500 mb-2">OUTPUTS</div>
        ${outputsList}
      </div>
    </div>
  `));

  return wrapper;
}

function openEvidence(riskId) {
  const demo = getDemo();
  const allRisks = [...demo.riskItemsLate, ...demo.riskItemsExcess];
  const risk = allRisks.find(r => r.id === riskId);

  if (!risk) return;

  const ev = risk.evidence;
  const icon = ROUTE_ICONS[risk.route] || "•";

  // 4-quadrant briefing
  const evidenceHtml = `
    <div class="grid grid-cols-2 gap-4">
      <div class="col-span-2 md:col-span-1 border rounded-2xl p-4 bg-gradient-to-br from-slate-50 to-white">
        <div class="text-xs text-slate-500 mb-2">EXCEPTION</div>
        <div class="text-lg font-bold">${risk.object}</div>
        <div class="flex items-center gap-3 mt-3">
          <div>
            <div class="text-xs text-slate-500">Risk Score</div>
            <div class="text-2xl font-bold">${risk.score}</div>
          </div>
          <div>
            <div class="text-xs text-slate-500">Confidence</div>
            <div class="text-2xl font-bold">${(risk.confidence * 100).toFixed(0)}%</div>
          </div>
          <div>
            <div class="text-xs text-slate-500">Route</div>
            <div class="text-2xl">${icon}</div>
          </div>
        </div>
      </div>

      <div class="col-span-2 md:col-span-1 border rounded-2xl p-4 bg-gradient-to-br from-amber-50 to-white">
        <div class="text-xs text-slate-500 mb-2">IMPACT</div>
        <div class="text-sm font-semibold">${ev.impact}</div>
      </div>

      <div class="col-span-2 md:col-span-1 border rounded-2xl p-4">
        <div class="text-xs text-slate-500 mb-2">TOP DRIVERS</div>
        <ul class="text-sm space-y-1.5">
          ${risk.drivers.slice(0, 3).map(d => `<li class="flex items-start gap-2"><span>•</span><span>${d}</span></li>`).join("")}
        </ul>
      </div>

      <div class="col-span-2 md:col-span-1 border rounded-2xl p-4 bg-gradient-to-br from-green-50 to-white">
        <div class="text-xs text-slate-500 mb-2">RECOMMENDED ACTION</div>
        <div class="text-sm font-semibold mb-3">${ev.recommendation}</div>
        <div class="text-xs text-slate-600">Options:</div>
        <ul class="text-xs text-slate-600 mt-1 space-y-0.5">
          ${ev.options.slice(0, 2).map(o => `<li>· ${o}</li>`).join("")}
        </ul>
      </div>
    </div>

    <div class="mt-4 border-t pt-4">
      <button class="text-xs text-blue-600 hover:underline" onclick="this.nextElementSibling.classList.toggle('hidden')">
        Show decision log & feedback ↓
      </button>
      <div class="hidden mt-3 space-y-2">
        <div class="text-xs font-semibold text-slate-500">DECISION LOG</div>
        <div class="text-xs text-slate-600 p-3 border rounded-lg bg-slate-50">
          <div>Decision: Pending review</div>
          <div class="mt-1">Assigned to: China Delivery Team</div>
          <div class="mt-1">SLA: 24h</div>
        </div>

        <div class="text-xs font-semibold text-slate-500 mt-3">FEEDBACK</div>
        <div class="flex gap-2">
          <button class="flex-1 border rounded-lg px-3 py-2 text-xs hover:bg-green-50">✓ Effective</button>
          <button class="flex-1 border rounded-lg px-3 py-2 text-xs hover:bg-red-50">✗ Ineffective</button>
        </div>
      </div>
    </div>
  `;

  $("modalTitle").textContent = `Evidence Pack — ${risk.id}`;
  $("modalBody").innerHTML = evidenceHtml;
  $("modal").classList.remove("hidden");
  $("modalBackdrop").classList.remove("hidden");
}

function closeModal() {
  $("modal").classList.add("hidden");
  $("modalBackdrop").classList.add("hidden");
}

// Global functions
window.__openEvidence = openEvidence;
window.navigateTo = navigateTo;

// Init
(async function() {
  await loadData();
  setMeta();
  initControls();
  render();
})();
// ==========================================
// ENHANCED FEATURES INTEGRATION PATCH
// Copy this content to the END of app.js
// ==========================================

// Case Drawer Functions
function openCaseDrawer(riskId) {
  const demo = getDemo();
  const allRisks = [...demo.riskItemsLate, ...demo.riskItemsExcess];
  const risk = allRisks.find(r => r.id === riskId);
  if (!risk) return;

  STATE.selectedRiskId = riskId;
  const ev = risk.evidence;
  const icon = ROUTE_ICONS[risk.route] || "•";

  const drawerHtml = `
    <div class="space-y-4">
      <div class="border rounded-xl p-3 bg-gradient-to-br from-blue-50 to-white">
        <div class="text-xs text-slate-500 mb-2">SNAPSHOT</div>
        <div class="font-bold text-lg mb-2">${risk.object}</div>
        <div class="grid grid-cols-3 gap-2 text-center">
          <div><div class="text-xs text-slate-500">Score</div><div class="text-xl font-bold">${risk.score}</div></div>
          <div><div class="text-xs text-slate-500">Confidence</div><div class="text-xl font-bold">${(risk.confidence * 100).toFixed(0)}%</div></div>
          <div><div class="text-xs text-slate-500">Route</div><div class="text-2xl">${icon}</div></div>
        </div>
        <div class="mt-2 text-xs text-slate-600"><span class="font-semibold">Impact:</span> ${ev.impact}</div>
      </div>
      <div class="border rounded-xl p-3">
        <div class="text-xs font-semibold text-slate-500 mb-2">→ SIGNALS</div>
        <div class="space-y-1">${ev.signals.slice(0, 2).map(s => `<div class="text-xs p-2 bg-slate-50 rounded border-l-2 border-blue-500">${s}</div>`).join('')}</div>
      </div>
      <div class="border rounded-xl p-3 bg-green-50">
        <div class="text-xs font-semibold text-slate-500 mb-2">→ RECOMMENDED ACTION</div>
        <div class="text-sm font-semibold mb-2">${risk.recommendedAction}</div>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div><span class="text-slate-500">Owner:</span> China Delivery</div>
          <div><span class="text-slate-500">SLA:</span> 24-48h</div>
        </div>
      </div>
      <div class="border rounded-xl p-3">
        <div class="text-xs font-semibold text-slate-500 mb-2">→ EVIDENCE PACK</div>
        <button onclick="window.__openEvidence('${risk.id}')" class="w-full text-sm bg-slate-900 text-white rounded-lg px-3 py-2 hover:bg-slate-800 mb-2">Open Full Evidence Pack</button>
        <button onclick="generateReport('${risk.id}')" class="w-full text-sm border rounded-lg px-3 py-2 hover:bg-slate-50">📄 Generate Report</button>
      </div>
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
  alert(`Feedback "${type}" submitted for case ${risk.id}. This would update the learning model.`);
  closeCaseDrawer();
}

// Report Generation with Internal Weekly Report Style
function generateReport(riskId) {
  const demo = getDemo();
  const allRisks = [...demo.riskItemsLate, ...demo.riskItemsExcess];
  const risk = allRisks.find(r => r.id === riskId);
  if (!risk) return;

  const ev = risk.evidence;
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
<h1>🏭 SCDO Decision Briefing — Factory Execution Loop</h1>
<div class="meta"><strong>Case ID:</strong> ${risk.id} | <strong>Scope:</strong> ${STATE.filters.productLine} / ${STATE.filters.factory} / ${STATE.filters.week} | <strong>Generated:</strong> ${timestamp} | <strong>Scenario:</strong> ${scenario.name}</div>
</div>
<div class="section"><div class="section-title">Situation</div><div class="section-content"><strong>${risk.object}</strong> — ${risk.drivers[0]}. Requires <span class="status-badge">${risk.route.replace(/_/g, ' ')}</span> routing.</div></div>
<div class="section"><div class="section-title">Key Signals</div><ul>${ev.signals.slice(0, 3).map(s => `<li>${s}</li>`).join('')}</ul></div>
<div class="section"><div class="section-title">Risk Assessment</div>
<div class="metrics">
<div class="metric-card"><div class="metric-label">Risk Score</div><div class="metric-value">${risk.score}</div></div>
<div class="metric-card"><div class="metric-label">Confidence</div><div class="metric-value">${(risk.confidence * 100).toFixed(0)}%</div></div>
<div class="metric-card"><div class="metric-label">Route</div><div class="metric-value" style="font-size:20px;">${ROUTE_ICONS[risk.route]}</div></div>
</div>
<div class="section-content"><strong>Impact:</strong> ${ev.impact}</div></div>
<div class="section"><div class="section-title">Decision & Route</div>
<div class="section-content"><strong>Route:</strong> ${risk.route.replace(/_/g, ' ')}<br><strong>Rule:</strong> ${risk.route === 'HUMAN_REVIEW' ? 'Confidence 60-80% OR Risk score 70-85 OR Cross-team impact' : 'Auto-action threshold met'}</div></div>
<div class="section"><div class="section-title">Recommended Actions</div>
${risk.recommendedAction.split(/[;,+]/).slice(0, 3).map((action, i) => `
<div class="action-box"><strong>Action ${i + 1}:</strong> ${action.trim()}<br>
<span style="font-size:11px;color:#64748b;">Owner: ${i === 0 ? 'Sourcing' : i === 1 ? 'PQE/Factory' : 'China Delivery'} | SLA: ${i === 0 ? '24h' : '48h'}</span></div>`).join('')}
</div>
<div class="section"><div class="section-title">Evidence</div><ul>${ev.signals.map(s => `<li>${s}</li>`).join('')}${risk.drivers.map(d => `<li>${d}</li>`).join('')}</ul></div>
<div class="footer">
<div><strong>Decision Log:</strong> (Pending review by China Delivery Team)</div>
<div><strong>Feedback Status:</strong> Awaiting outcome validation within 7 days</div>
<div style="margin-top:8px;"><em>Generated by SCDO Control Tower — Factory Execution Loop | Confidential & Internal Use Only</em></div>
</div></body></html>`;

  document.getElementById('reportPreview').innerHTML = reportHtml;
  document.getElementById('reportModal').classList.remove('hidden');
  document.getElementById('reportModalBackdrop').classList.remove('hidden');
  window._currentReportHtml = reportHtml;
  window._currentReportFilename = `SCDO_Briefing_${risk.id}_${timestamp}`;
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
    const generateReportBtn = document.getElementById('generateReportBtn');

    if (downloadHTMLBtn) {
      downloadHTMLBtn.addEventListener('click', downloadHTMLReport);
      downloadPDFBtn.addEventListener('click', downloadPDFReport);
      closeReportModalBtn.addEventListener('click', closeReportModal);
      if (generateReportBtn) {
        generateReportBtn.addEventListener('click', () => {
          if (STATE.selectedRiskId) generateReport(STATE.selectedRiskId);
        });
      }
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReportButtons);
  } else {
    initReportButtons();
  }
})();
