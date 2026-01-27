/**
 * Render MO KPIs page V2
 * Manufacturing Operations Executive Brief - Decision-oriented dashboard
 *
 * This is the new improved version following ChatGPT's recommendations:
 * - Remove "KPI打分墙" feeling
 * - Add Executive Summary section
 * - Transform Action Items into Decision List
 * - Add collapsible drill-down sections
 * - Use "OK/WATCH/ACTION_NEEDED" instead of GREEN/YELLOW/RED
 */
function renderMOKpis() {
  const content = $("content");

  // Mock data for demonstration (replace with real data later)
  const kpiData = {
    production: {
      current: 45800,
      target: 50000,
      weeklyTrend: [42000, 43500, 44200, 45800],
      status: 'WATCH',
      variance: -8.4,
      delta: -4200,
      driver: "Yield –3.3pp (WF) | CTB short 3 days (VN02)",
      owner: "Operations",
      details: {
        wf: { current: 28500, target: 32000, yield: 0.912 },
        vn02: { current: 17300, target: 18000, yield: 0.955 }
      }
    },
    shipment: {
      current: 44200,
      target: 48000,
      weeklyTrend: [41000, 42800, 43500, 44200],
      status: 'WATCH',
      variance: -7.9,
      delta: -3800,
      driver: "Ready-to-ship backlog +12% | WH packing bottleneck",
      owner: "Logistics",
      details: {
        backlog: 8200,
        avgLeadTime: 2.8,
        onTimeRate: 0.892
      }
    },
    labor: {
      current: 2450,
      target: 2600,
      weeklyTrend: [2380, 2420, 2440, 2450],
      status: 'WATCH',
      variance: -5.8,
      delta: -150,
      fulfillmentRate: 94.2,
      driver: "Fill rate 94.2% | Overtime +18% WoW | Absence 4.2%",
      owner: "HR / Operations",
      details: {
        directLabor: 1850,
        indirectLabor: 600,
        overtime: 450,
        absenceRate: 0.042
      }
    },
    fvCost: {
      current: 285.5,
      target: 275.0,
      weeklyTrend: [288.2, 286.8, 286.0, 285.5],
      status: 'ACTION_NEEDED',
      variance: 3.8,
      delta: 10.5,
      driver: "Material premium freight +$8/u | Rework cost +$4/u",
      owner: "Finance / Operations",
      details: {
        material: 195.2,
        labor: 48.5,
        overhead: 32.8,
        rework: 9.0
      }
    },
    campus: {
      readiness: 96.5,
      target: 98.0,
      issues: 3,
      status: 'WATCH',
      variance: -1.5,
      driver: "3 open issues: Utility backup (critical) | HVAC (med) | Parking (low)",
      owner: "Facilities",
      details: {
        infrastructure: { status: 'OK', issues: 0 },
        safety: { status: 'OK', issues: 0 },
        utilities: { status: 'WATCH', issues: 3 }
      }
    }
  };

  const getStatusPill = (status) => {
    if (status === 'OK') return 'bg-green-100 text-green-700 border border-green-300';
    if (status === 'WATCH') return 'bg-amber-100 text-amber-700 border border-amber-300';
    return 'bg-rose-100 text-rose-700 border border-rose-300';
  };

  const getStatusText = (status) => {
    if (status === 'OK') return 'OK';
    if (status === 'WATCH') return 'Watch';
    return 'Action needed';
  };

  const formatNumber = (num) => num.toLocaleString('en-US');
  const formatPercent = (num) => `${num >= 0 ? '+' : ''}${num.toFixed(1)}%`;
  const formatDelta = (num) => `${num >= 0 ? '+' : ''}${formatNumber(num)}`;

  // Calculate overall status
  const hasActionNeeded = Object.values(kpiData).some(kpi => kpi.status === 'ACTION_NEEDED');
  const commitOutlook = hasActionNeeded ? 'At risk' : 'On track';
  const primaryDrivers = [
    kpiData.fvCost.status === 'ACTION_NEEDED' ? 'FV cost spike' : null,
    kpiData.production.variance < -5 ? 'Production yield drift' : null,
    kpiData.shipment.variance < -5 ? 'Shipment backlog' : null
  ].filter(Boolean).slice(0, 2).join(', ') || 'No major concerns';

  content.innerHTML = `
    <div class="space-y-6">
      <!-- Executive Summary -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <h2 class="text-xl font-bold text-slate-900 mb-6">Executive Summary</h2>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <!-- Left: One-sentence conclusion + Key metrics -->
          <div class="space-y-4">
            <div>
              <div class="text-sm text-slate-600 mb-1">Commit Outlook</div>
              <div class="text-2xl font-bold ${hasActionNeeded ? 'text-rose-600' : 'text-green-600'}">${commitOutlook}</div>
            </div>
            <div>
              <div class="text-sm text-slate-600 mb-1">Primary Drivers</div>
              <div class="text-base text-slate-900">${primaryDrivers}</div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <div class="text-sm text-slate-600 mb-1">Decisions due in 48h</div>
                <div class="text-xl font-bold text-slate-900">2</div>
              </div>
              <div>
                <div class="text-sm text-slate-600 mb-1">Data Confidence</div>
                <div class="text-xl font-bold text-green-600">High</div>
              </div>
            </div>
            <div class="text-xs text-slate-500 pt-2 border-t">
              Cut-off: 2026-01-27 14:30 | Refreshes every 4h
            </div>
          </div>

          <!-- Right: This Week Focus (Top 3 decisions) -->
          <div>
            <div class="text-sm font-semibold text-slate-900 mb-3">This Week Focus — Top 3</div>
            <div class="space-y-2">
              <div class="bg-rose-50 border border-rose-200 rounded-lg p-3">
                <div class="flex items-start justify-between mb-1">
                  <div class="text-sm font-semibold text-rose-900">FV cost mitigation plan</div>
                  <span class="text-xs px-2 py-0.5 bg-rose-200 text-rose-800 rounded">48h</span>
                </div>
                <div class="text-xs text-rose-700 mb-2">Impact: +$XXk/week exposure | Owner: Finance</div>
                <div class="flex gap-2">
                  <button class="text-xs px-2 py-1 bg-white hover:bg-rose-100 border border-rose-300 rounded" onclick="alert('Open FV Cost Details')">View details</button>
                  <button class="text-xs px-2 py-1 bg-white hover:bg-rose-100 border border-rose-300 rounded" onclick="alert('Request validation')">Request validation</button>
                </div>
              </div>
              <div class="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div class="flex items-start justify-between mb-1">
                  <div class="text-sm font-semibold text-amber-900">Production capacity review</div>
                  <span class="text-xs px-2 py-0.5 bg-amber-200 text-amber-800 rounded">24h</span>
                </div>
                <div class="text-xs text-amber-700 mb-2">Impact: –4.2k units vs plan | Owner: Operations</div>
                <div class="flex gap-2">
                  <button class="text-xs px-2 py-1 bg-white hover:bg-amber-100 border border-amber-300 rounded" onclick="alert('Check yield')">Check yield</button>
                  <button class="text-xs px-2 py-1 bg-white hover:bg-amber-100 border border-amber-300 rounded" onclick="alert('Check capacity')">Check capacity</button>
                </div>
              </div>
              <div class="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div class="flex items-start justify-between mb-1">
                  <div class="text-sm font-semibold text-amber-900">Labor hiring acceleration</div>
                  <span class="text-xs px-2 py-0.5 bg-amber-200 text-amber-800 rounded">72h</span>
                </div>
                <div class="text-xs text-amber-700 mb-2">Impact: –150 HC gap, risk to W05 ramp | Owner: HR</div>
                <div class="flex gap-2">
                  <button class="text-xs px-2 py-1 bg-white hover:bg-amber-100 border border-amber-300 rounded" onclick="alert('Hiring plan')">Hiring plan</button>
                  <button class="text-xs px-2 py-1 bg-white hover:bg-amber-100 border border-amber-300 rounded" onclick="alert('Shift re-balance')">Shift re-balance</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- KPI Signals (white background, small pill status) -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <!-- Production -->
        <div class="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
          <div class="flex items-start justify-between mb-3">
            <div class="flex-1">
              <div class="text-xs font-semibold text-slate-600 mb-1">📦 Production</div>
              <div class="text-2xl font-bold text-slate-900">${formatNumber(kpiData.production.current)}</div>
              <div class="text-xs text-slate-500">Target: ${formatNumber(kpiData.production.target)}</div>
            </div>
            <span class="px-2 py-1 ${getStatusPill(kpiData.production.status)} rounded text-xs font-medium">
              ${getStatusText(kpiData.production.status)}
            </span>
          </div>
          <div class="text-sm text-slate-700 mb-2">
            <span class="font-semibold ${kpiData.production.delta < 0 ? 'text-red-600' : 'text-green-600'}">
              ${formatDelta(kpiData.production.delta)}
            </span>
            <span class="text-slate-500"> (${formatPercent(kpiData.production.variance)})</span>
          </div>
          <div class="text-xs text-slate-600 mb-2">
            <span class="font-medium">Driver:</span> ${kpiData.production.driver}
          </div>
          <div class="flex items-center justify-between pt-2 border-t border-slate-200">
            <span class="text-xs text-slate-500">Owner: ${kpiData.production.owner}</span>
            <button class="text-xs text-blue-600 hover:text-blue-800 font-medium" onclick="toggleDetailSection('production')">
              View details →
            </button>
          </div>
        </div>

        <!-- Shipment -->
        <div class="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
          <div class="flex items-start justify-between mb-3">
            <div class="flex-1">
              <div class="text-xs font-semibold text-slate-600 mb-1">🚚 Shipment</div>
              <div class="text-2xl font-bold text-slate-900">${formatNumber(kpiData.shipment.current)}</div>
              <div class="text-xs text-slate-500">Target: ${formatNumber(kpiData.shipment.target)}</div>
            </div>
            <span class="px-2 py-1 ${getStatusPill(kpiData.shipment.status)} rounded text-xs font-medium">
              ${getStatusText(kpiData.shipment.status)}
            </span>
          </div>
          <div class="text-sm text-slate-700 mb-2">
            <span class="font-semibold ${kpiData.shipment.delta < 0 ? 'text-red-600' : 'text-green-600'}">
              ${formatDelta(kpiData.shipment.delta)}
            </span>
            <span class="text-slate-500"> (${formatPercent(kpiData.shipment.variance)})</span>
          </div>
          <div class="text-xs text-slate-600 mb-2">
            <span class="font-medium">Driver:</span> ${kpiData.shipment.driver}
          </div>
          <div class="flex items-center justify-between pt-2 border-t border-slate-200">
            <span class="text-xs text-slate-500">Owner: ${kpiData.shipment.owner}</span>
            <button class="text-xs text-blue-600 hover:text-blue-800 font-medium" onclick="toggleDetailSection('shipment')">
              View details →
            </button>
          </div>
        </div>

        <!-- Labor -->
        <div class="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
          <div class="flex items-start justify-between mb-3">
            <div class="flex-1">
              <div class="text-xs font-semibold text-slate-600 mb-1">👷 Labor</div>
              <div class="text-2xl font-bold text-slate-900">${formatNumber(kpiData.labor.current)}</div>
              <div class="text-xs text-slate-500">Target: ${formatNumber(kpiData.labor.target)}</div>
            </div>
            <span class="px-2 py-1 ${getStatusPill(kpiData.labor.status)} rounded text-xs font-medium">
              ${getStatusText(kpiData.labor.status)}
            </span>
          </div>
          <div class="text-sm text-slate-700 mb-2">
            <span class="font-semibold ${kpiData.labor.delta < 0 ? 'text-red-600' : 'text-green-600'}">
              ${formatDelta(kpiData.labor.delta)}
            </span>
            <span class="text-slate-500"> (${formatPercent(kpiData.labor.variance)})</span>
          </div>
          <div class="text-xs text-slate-600 mb-2">
            <span class="font-medium">Driver:</span> ${kpiData.labor.driver}
          </div>
          <div class="flex items-center justify-between pt-2 border-t border-slate-200">
            <span class="text-xs text-slate-500">Owner: ${kpiData.labor.owner}</span>
            <button class="text-xs text-blue-600 hover:text-blue-800 font-medium" onclick="toggleDetailSection('labor')">
              View details →
            </button>
          </div>
        </div>

        <!-- FV Cost -->
        <div class="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
          <div class="flex items-start justify-between mb-3">
            <div class="flex-1">
              <div class="text-xs font-semibold text-slate-600 mb-1">💰 FV Cost</div>
              <div class="text-2xl font-bold text-slate-900">$${kpiData.fvCost.current.toFixed(1)}</div>
              <div class="text-xs text-slate-500">Target: $${kpiData.fvCost.target.toFixed(1)}</div>
            </div>
            <span class="px-2 py-1 ${getStatusPill(kpiData.fvCost.status)} rounded text-xs font-medium">
              ${getStatusText(kpiData.fvCost.status)}
            </span>
          </div>
          <div class="text-sm text-slate-700 mb-2">
            <span class="font-semibold ${kpiData.fvCost.delta > 0 ? 'text-red-600' : 'text-green-600'}">
              ${formatDelta(kpiData.fvCost.delta)}
            </span>
            <span class="text-slate-500"> (${formatPercent(kpiData.fvCost.variance)})</span>
          </div>
          <div class="text-xs text-slate-600 mb-2">
            <span class="font-medium">Driver:</span> ${kpiData.fvCost.driver}
          </div>
          <div class="flex items-center justify-between pt-2 border-t border-slate-200">
            <span class="text-xs text-slate-500">Owner: ${kpiData.fvCost.owner}</span>
            <button class="text-xs text-blue-600 hover:text-blue-800 font-medium" onclick="toggleDetailSection('fvCost')">
              View details →
            </button>
          </div>
        </div>

        <!-- Campus -->
        <div class="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
          <div class="flex items-start justify-between mb-3">
            <div class="flex-1">
              <div class="text-xs font-semibold text-slate-600 mb-1">🏭 Campus</div>
              <div class="text-2xl font-bold text-slate-900">${kpiData.campus.readiness.toFixed(1)}%</div>
              <div class="text-xs text-slate-500">Target: ${kpiData.campus.target.toFixed(1)}%</div>
            </div>
            <span class="px-2 py-1 ${getStatusPill(kpiData.campus.status)} rounded text-xs font-medium">
              ${getStatusText(kpiData.campus.status)}
            </span>
          </div>
          <div class="text-sm text-slate-700 mb-2">
            <span class="font-semibold text-slate-900">${kpiData.campus.issues} open issues</span>
          </div>
          <div class="text-xs text-slate-600 mb-2">
            <span class="font-medium">Driver:</span> ${kpiData.campus.driver}
          </div>
          <div class="flex items-center justify-between pt-2 border-t border-slate-200">
            <span class="text-xs text-slate-500">Owner: ${kpiData.campus.owner}</span>
            <button class="text-xs text-blue-600 hover:text-blue-800 font-medium" onclick="toggleDetailSection('campus')">
              View details →
            </button>
          </div>
        </div>

        <!-- Outcome Strip (full width, 6th card) -->
        <div class="bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg border border-slate-300 p-5 lg:col-span-3">
          <div class="text-xs font-semibold text-slate-600 mb-3">Week Outcome Summary</div>
          <div class="grid grid-cols-5 gap-4">
            <div class="text-center">
              <div class="text-sm text-slate-600 mb-1">Production</div>
              <div class="text-lg font-bold text-slate-900">${formatNumber(kpiData.production.current)}</div>
              <div class="text-xs ${kpiData.production.variance < 0 ? 'text-red-600' : 'text-green-600'}">${formatPercent(kpiData.production.variance)}</div>
            </div>
            <div class="text-center border-l border-slate-300 pl-4">
              <div class="text-sm text-slate-600 mb-1">Shipment</div>
              <div class="text-lg font-bold text-slate-900">${formatNumber(kpiData.shipment.current)}</div>
              <div class="text-xs ${kpiData.shipment.variance < 0 ? 'text-red-600' : 'text-green-600'}">${formatPercent(kpiData.shipment.variance)}</div>
            </div>
            <div class="text-center border-l border-slate-300 pl-4">
              <div class="text-sm text-slate-600 mb-1">Labor</div>
              <div class="text-lg font-bold text-slate-900">${kpiData.labor.fulfillmentRate}%</div>
              <div class="text-xs text-slate-600">fulfilled</div>
            </div>
            <div class="text-center border-l border-slate-300 pl-4">
              <div class="text-sm text-slate-600 mb-1">FV Cost</div>
              <div class="text-lg font-bold text-slate-900">$${kpiData.fvCost.current.toFixed(1)}</div>
              <div class="text-xs ${kpiData.fvCost.variance > 0 ? 'text-red-600' : 'text-green-600'}">${formatPercent(kpiData.fvCost.variance)}</div>
            </div>
            <div class="text-center border-l border-slate-300 pl-4">
              <div class="text-sm text-slate-600 mb-1">Campus</div>
              <div class="text-lg font-bold text-slate-900">${kpiData.campus.readiness.toFixed(1)}%</div>
              <div class="text-xs text-amber-600">${kpiData.campus.issues} issues</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Decision List (instead of Action Items) -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 class="text-lg font-bold text-slate-900 mb-4">Decision List</h3>
        <div class="space-y-3">
          <div class="bg-white border-2 border-rose-200 rounded-lg p-4">
            <div class="flex items-start justify-between mb-2">
              <div class="flex-1">
                <div class="font-semibold text-slate-900 mb-1">FV cost above target (+3.8%)</div>
                <div class="text-sm text-slate-600 mb-2">
                  <span class="font-medium">Impact:</span> +$XXk weekly exposure |
                  <span class="font-medium">Owner:</span> Finance / Operations |
                  <span class="font-medium">SLA:</span> 48h
                </div>
                <div class="text-xs text-slate-600">Material premium freight +$8/u | Rework cost +$4/u</div>
              </div>
              <span class="px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-bold">HIGH</span>
            </div>
            <div class="flex gap-2 pt-2 border-t border-slate-200">
              <button class="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium">Open FV Details</button>
              <button class="text-xs px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-medium">Request validation</button>
            </div>
          </div>

          <div class="bg-white border-2 border-amber-200 rounded-lg p-4">
            <div class="flex items-start justify-between mb-2">
              <div class="flex-1">
                <div class="font-semibold text-slate-900 mb-1">Production output below target (–8.4%)</div>
                <div class="text-sm text-slate-600 mb-2">
                  <span class="font-medium">Impact:</span> –4.2k units vs plan |
                  <span class="font-medium">Owner:</span> Operations |
                  <span class="font-medium">SLA:</span> 24h
                </div>
                <div class="text-xs text-slate-600">Yield –3.3pp (WF) | CTB short 3 days (VN02)</div>
              </div>
              <span class="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">MEDIUM</span>
            </div>
            <div class="flex gap-2 pt-2 border-t border-slate-200">
              <button class="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium">Check yield</button>
              <button class="text-xs px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-medium">Check capacity</button>
            </div>
          </div>

          <div class="bg-white border-2 border-amber-200 rounded-lg p-4">
            <div class="flex items-start justify-between mb-2">
              <div class="flex-1">
                <div class="font-semibold text-slate-900 mb-1">Labor fulfillment at 94.2%</div>
                <div class="text-sm text-slate-600 mb-2">
                  <span class="font-medium">Impact:</span> –150 HC gap, risk to W05 ramp |
                  <span class="font-medium">Owner:</span> HR / Operations |
                  <span class="font-medium">SLA:</span> 72h
                </div>
                <div class="text-xs text-slate-600">Fill rate 94.2% | Overtime +18% WoW | Absence 4.2%</div>
              </div>
              <span class="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">MEDIUM</span>
            </div>
            <div class="flex gap-2 pt-2 border-t border-slate-200">
              <button class="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium">Hiring plan</button>
              <button class="text-xs px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-medium">Shift re-balance</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Drill-down sections (collapsed by default) -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 class="text-lg font-bold text-slate-900 mb-4">Details by Domain</h3>
        <div class="space-y-3">
          ${['production', 'shipment', 'labor', 'fvCost', 'campus'].map(domain => `
            <div class="border border-slate-200 rounded-lg">
              <button onclick="toggleDetailSection('${domain}')" class="w-full flex items-center justify-between p-4 hover:bg-slate-50">
                <span class="font-semibold text-slate-900">${domain === 'fvCost' ? 'FV Cost' : domain.charAt(0).toUpperCase() + domain.slice(1)} Details</span>
                <span id="${domain}-toggle" class="text-slate-400">▼</span>
              </button>
              <div id="${domain}-details" class="hidden p-4 border-t border-slate-200 bg-slate-50">
                <div class="text-sm text-slate-600">Detailed breakdown coming soon...</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

// Helper function to toggle detail sections
function toggleDetailSection(sectionId) {
  const details = document.getElementById(`${sectionId}-details`);
  const toggle = document.getElementById(`${sectionId}-toggle`);

  if (details && toggle) {
    if (details.classList.contains('hidden')) {
      details.classList.remove('hidden');
      toggle.textContent = '▲';
    } else {
      details.classList.add('hidden');
      toggle.textContent = '▼';
    }
  }
}
