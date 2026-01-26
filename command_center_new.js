// ========================================
// NEW DELIVERY COMMAND CENTER v4.0
// Weekly Commit Brief - Facts, drivers, decisions
// ========================================

// Main render function
function renderDeliveryCommandCenter() {
  const data = window.COMMAND_CENTER_DATA;
  const snapshot = data.weekly_snapshot;
  const timeline = data.program_timeline;
  const timelineSummary = timeline.getCurrentSummary();

  const html = `
    <!-- Header -->
    <div class="bg-white border-2 border-slate-300 rounded-xl p-6 mb-6 shadow-sm">
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <div class="text-2xl font-bold text-slate-900 mb-2">Weekly Commit Brief</div>
          <div class="text-sm text-slate-600 leading-relaxed">Facts, drivers, and decisions that change this week's outcome</div>
        </div>
        <div class="text-right">
          <div class="text-xs text-slate-500 font-semibold uppercase tracking-wide">Scope</div>
          <div class="text-base font-bold text-slate-900 mt-1">Product A · ${snapshot.week_id}</div>
          <div class="text-xs text-slate-500 mt-1.5">Cut-off: ${snapshot.cut_off_time}</div>
        </div>
      </div>
    </div>

    ${renderProgramTimeline()}
    ${renderWeeklyCommitSnapshot()}
    ${renderSiteExecutionSnapshot()}
    ${renderGapDecomposition()}
    ${renderDecisionsNeeded()}
    ${renderEvidenceLinks()}
  `;

  $("content").innerHTML = html;
}

// A. Program Timeline
function renderProgramTimeline() {
  const data = window.COMMAND_CENTER_DATA;
  const timeline = data.program_timeline;
  const summary = timeline.getCurrentSummary();

  // Build stage bars
  const stagesHTML = timeline.stages.map(stage => {
    const status = window.getTimelineStageStatus(stage, summary.current_phase_id);

    let statusClass = '';
    let icon = '';

    if (status === 'done') {
      statusClass = 'bg-slate-200 border-slate-300 text-slate-600';
      icon = '✓';
    } else if (status === 'current') {
      statusClass = 'bg-blue-100 border-blue-500 text-blue-900 border-2 font-bold';
      icon = '●';
    } else if (status === 'next') {
      statusClass = 'bg-white border-blue-400 border-dashed text-blue-700';
      icon = '→';
    } else {
      statusClass = 'bg-slate-50 border-slate-200 text-slate-500';
      icon = '';
    }

    return `
      <div class="flex-1 border ${statusClass} rounded-lg px-3 py-2 text-center min-w-[80px]"
           onclick="showStageDetails('${stage.id}')"
           style="cursor: pointer;">
        <div class="text-xs font-semibold">${stage.label}</div>
        <div class="text-lg mt-1">${icon}</div>
        <div class="text-xs mt-1 opacity-75">${stage.start.substring(5)}</div>
      </div>
    `;
  }).join('');

  return `
    <div class="bg-white border border-slate-200 rounded-xl p-5 mb-6 shadow-sm">
      <div class="text-sm font-bold text-slate-900 mb-4">Program Timeline</div>

      <!-- Stage bars -->
      <div class="flex gap-2 mb-4">
        ${stagesHTML}
      </div>

      <!-- Summary lines -->
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div class="flex items-center gap-2">
          <span class="text-slate-600">Current phase:</span>
          <span class="font-bold text-slate-900">${summary.current_phase} (${timeline.stages.find(s => s.id === summary.current_phase_id)?.start.substring(5) || ''})</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-slate-600">Next gate:</span>
          <span class="font-bold text-slate-900">${summary.next_gate} (${summary.next_gate_date ? summary.next_gate_date.substring(5) : 'TBD'})</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-slate-600">Launch target:</span>
          <span class="font-bold text-blue-700">${summary.launch_target_date || 'TBD'}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-slate-600">EOL:</span>
          <span class="font-bold text-slate-600">${summary.eol_target_date || 'TBD'}</span>
        </div>
      </div>
    </div>
  `;
}

// A. Weekly Commit Snapshot
function renderWeeklyCommitSnapshot() {
  const data = window.COMMAND_CENTER_DATA;
  const snapshot = data.weekly_snapshot;

  // Determine primary limiter label
  let limiterLabel = '';
  let limiterColor = '';
  switch (snapshot.primary_limiter) {
    case 'ctb':
      limiterLabel = 'Material (CTB)';
      limiterColor = 'text-orange-700';
      break;
    case 'yield':
      limiterLabel = 'Yield';
      limiterColor = 'text-red-700';
      break;
    case 'capacity':
      limiterLabel = 'Capacity';
      limiterColor = 'text-blue-700';
      break;
    case 'ship':
      limiterLabel = 'Ship readiness';
      limiterColor = 'text-yellow-700';
      break;
  }

  return `
    <div class="bg-white border border-blue-200 rounded-xl p-6 mb-6 shadow-sm">
      <div class="flex items-center justify-between mb-4">
        <div class="text-lg font-bold text-slate-900">Weekly Commit Snapshot</div>
        <div class="text-sm">
          <span class="text-slate-600">Primary limiter:</span>
          <span class="font-bold ${limiterColor}">${limiterLabel}</span>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-6">
        <!-- This Week -->
        <div class="space-y-3 text-sm">
          <div class="flex justify-between items-center pb-2 border-b">
            <span class="text-slate-600">Demand / Commit</span>
            <span class="font-bold text-slate-900">${snapshot.demand_units.toLocaleString()} units</span>
          </div>
          <div class="flex justify-between items-center pb-2 border-b">
            <span class="text-slate-600">Capacity (unconstrained)</span>
            <span class="font-bold text-slate-900">${snapshot.capacity_units.toLocaleString()} units</span>
          </div>
          <div class="flex justify-between items-center pb-2 border-b">
            <span class="text-slate-600">Material Available (CTB)</span>
            <span class="font-bold text-slate-900">${snapshot.ctb_units.toLocaleString()} units</span>
          </div>
          <div class="flex justify-between items-center pb-2 border-b bg-blue-50 px-2 py-1 rounded">
            <span class="text-slate-700 font-semibold">Planned Input = min(Cap, CTB)</span>
            <span class="font-bold text-blue-900">${snapshot.planned_input_units.toLocaleString()} units</span>
          </div>
          <div class="flex justify-between items-center pb-2 border-b">
            <span class="text-slate-600">Expected Output (apply yield)</span>
            <span class="font-bold text-slate-900">${snapshot.expected_output_units.toLocaleString()} units</span>
          </div>
          <div class="flex justify-between items-center pb-2 border-b">
            <span class="text-slate-600">Deliverable Ship (+2WD)</span>
            <span class="font-bold text-slate-900">${snapshot.deliverable_ship_units.toLocaleString()} units</span>
          </div>
          <div class="flex justify-between items-center pt-2 bg-red-50 px-2 py-1 rounded">
            <span class="text-slate-700 font-bold">Gap vs Commit</span>
            <span class="font-bold text-red-700">${snapshot.gap_units.toLocaleString()} (${snapshot.gap_pct.toFixed(1)}%)</span>
          </div>
        </div>

        <!-- Placeholder for future: YTD or Quarter-to-date -->
        <div class="flex items-center justify-center bg-slate-50 rounded-lg border border-slate-200">
          <div class="text-center text-slate-500">
            <div class="text-3xl mb-2">📊</div>
            <div class="text-sm font-semibold">Quarter-to-date view</div>
            <div class="text-xs mt-1">(Coming soon)</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// B. Site Execution Snapshot
function renderSiteExecutionSnapshot() {
  const data = window.COMMAND_CENTER_DATA;
  const sites = data.site_snapshots;

  const sitesHTML = sites.map(site => `
    <tr class="border-b hover:bg-slate-50">
      <td class="px-4 py-3 font-semibold text-slate-900">${site.site_name}</td>
      <td class="px-4 py-3 text-sm text-slate-700">${site.lines_running}<br/><span class="text-xs text-slate-500">${site.shifts_running}</span></td>
      <td class="px-4 py-3 text-sm">
        <div class="font-bold text-slate-900">${site.ctb_units.toLocaleString()}</div>
        <div class="text-xs text-slate-600">${site.ctb_coverage_pct}% coverage</div>
      </td>
      <td class="px-4 py-3 text-sm">
        <div>${site.input_units.toLocaleString()}</div>
        <div class="text-xs text-slate-500">input</div>
      </td>
      <td class="px-4 py-3 text-sm">
        <div>${site.output_units.toLocaleString()}</div>
        <div class="text-xs text-slate-500">output</div>
      </td>
      <td class="px-4 py-3 text-sm">
        <div>${site.deliverable_ship_units.toLocaleString()}</div>
        <div class="text-xs text-slate-500">ship (+2WD)</div>
      </td>
      <td class="px-4 py-3 text-sm text-slate-700">${site.local_limiter_text}</td>
      <td class="px-4 py-3 text-sm">
        <div class="font-semibold text-slate-900">${site.owner_role}</div>
        <div class="text-xs text-slate-500">SLA: ${site.sla_hours}h</div>
      </td>
    </tr>
  `).join('');

  return `
    <div class="bg-white border border-slate-200 rounded-xl p-6 mb-6 shadow-sm">
      <div class="text-lg font-bold text-slate-900 mb-4">Site Execution Snapshot</div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-100 border-b-2">
            <tr>
              <th class="px-4 py-2 text-left font-semibold text-slate-700">Site</th>
              <th class="px-4 py-2 text-left font-semibold text-slate-700">Lines / Shifts</th>
              <th class="px-4 py-2 text-left font-semibold text-slate-700">CTB Coverage</th>
              <th class="px-4 py-2 text-left font-semibold text-slate-700">Input</th>
              <th class="px-4 py-2 text-left font-semibold text-slate-700">Output</th>
              <th class="px-4 py-2 text-left font-semibold text-slate-700">Ship</th>
              <th class="px-4 py-2 text-left font-semibold text-slate-700">Top Local Limiter</th>
              <th class="px-4 py-2 text-left font-semibold text-slate-700">Owner & SLA</th>
            </tr>
          </thead>
          <tbody>
            ${sitesHTML}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// C. Gap Decomposition
function renderGapDecomposition() {
  const data = window.COMMAND_CENTER_DATA;
  const decomp = data.gap_decomposition;
  const snapshot = data.weekly_snapshot;

  // Sort by impact (most negative first)
  const sorted = [...decomp].sort((a, b) => a.impact_units - b.impact_units);

  const rowsHTML = sorted.map((driver, idx) => `
    <tr class="border-b ${idx === 0 ? 'bg-red-50' : ''}">
      <td class="px-4 py-3 text-sm font-semibold text-slate-900">${idx + 1}. ${driver.driver_label}</td>
      <td class="px-4 py-3 text-sm font-bold ${driver.impact_units < 0 ? 'text-red-700' : 'text-green-700'}">${driver.impact_units.toLocaleString()}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${driver.explanation}</td>
    </tr>
  `).join('');

  const topDriver = sorted[0];

  return `
    <div class="bg-white border border-slate-200 rounded-xl p-6 mb-6 shadow-sm">
      <div class="text-lg font-bold text-slate-900 mb-2">Gap Decomposition</div>
      <div class="text-sm text-slate-600 mb-4">
        Top driver: <span class="font-bold text-slate-900">${topDriver.driver_label}</span> (${topDriver.impact_units.toLocaleString()} units)
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-100 border-b-2">
            <tr>
              <th class="px-4 py-2 text-left font-semibold text-slate-700">Driver</th>
              <th class="px-4 py-2 text-left font-semibold text-slate-700">Impact (units)</th>
              <th class="px-4 py-2 text-left font-semibold text-slate-700">Explanation</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHTML}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// D. Decisions Needed
function renderDecisionsNeeded() {
  const data = window.COMMAND_CENTER_DATA;
  const decisions = data.decision_queue.slice(0, 3); // Max 3

  if (decisions.length === 0) {
    return `
      <div class="bg-white border-2 border-green-300 rounded-xl p-8 mb-6 text-center shadow-sm">
        <div class="text-4xl mb-3">✅</div>
        <div class="text-lg font-bold text-green-900 mb-2">No Decisions Due</div>
        <div class="text-sm text-green-700">All metrics within acceptable range. Continue monitoring.</div>
      </div>
    `;
  }

  const decisionsHTML = decisions.map((dec, idx) => {
    const optionsHTML = dec.options.map(opt => `
      <button onclick="handleDecision('${dec.decision_id}', '${opt.action_type}')"
              class="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
        ${opt.label}
      </button>
    `).join('');

    const evidenceHTML = dec.evidence_links.map(ev => `
      <a href="${ev.link}" class="px-2 py-1 text-xs bg-slate-200 text-slate-700 rounded-full hover:bg-slate-300">
        ${ev.label}
      </a>
    `).join('');

    return `
      <div class="border-2 border-blue-300 bg-blue-50 rounded-xl p-5 shadow-sm">
        <div class="flex items-start justify-between mb-3">
          <div class="flex-1">
            <div class="text-base font-bold text-slate-900 mb-2">${idx + 1}. ${dec.decision_text}</div>
            <div class="text-sm text-slate-700 mb-3"><strong>Why now:</strong> ${dec.why_now}</div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4 mb-3 pb-3 border-b border-blue-200">
          <div>
            <div class="text-xs font-semibold text-slate-600 mb-1">OWNER & SLA</div>
            <div class="text-sm font-bold text-slate-900">${dec.owner_role}</div>
            <div class="text-xs text-slate-600">SLA: ${dec.sla_hours}h</div>
          </div>
          <div>
            <div class="text-xs font-semibold text-slate-600 mb-2">EVIDENCE</div>
            <div class="flex flex-wrap gap-1">
              ${evidenceHTML}
            </div>
          </div>
        </div>

        <div class="flex gap-2 justify-end">
          ${optionsHTML}
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="bg-white border border-blue-200 rounded-xl p-6 mb-6 shadow-sm">
      <div class="flex items-center justify-between mb-4">
        <div>
          <div class="text-lg font-bold text-slate-900">Decisions Needed</div>
          <div class="text-sm text-slate-600 mt-1">${decisions.length} decision(s) require action</div>
        </div>
      </div>

      <div class="space-y-4">
        ${decisionsHTML}
      </div>
    </div>
  `;
}

// E. Evidence Links
function renderEvidenceLinks() {
  const data = window.COMMAND_CENTER_DATA;
  const links = data.evidence_links;

  const linksHTML = links.map(link => `
    <a href="${link.link}"
       class="flex items-center gap-3 px-4 py-3 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-blue-400 transition-colors">
      <div class="text-2xl">${link.icon}</div>
      <div class="text-sm font-semibold text-slate-900">${link.label}</div>
    </a>
  `).join('');

  return `
    <div class="bg-slate-50 border border-slate-200 rounded-xl p-6 shadow-sm">
      <div class="text-sm font-bold text-slate-900 mb-4">Evidence & Drill-down Views</div>
      <div class="grid grid-cols-4 gap-3">
        ${linksHTML}
      </div>
    </div>
  `;
}

// Helper functions
function getTimelineStageStatus(stage, currentPhaseId) {
  const timeline = window.COMMAND_CENTER_DATA.program_timeline;
  const currentStage = timeline.stages.find(s => s.id === currentPhaseId);

  if (!currentStage) return 'planned';

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // If stage end date is before today, it's done
  if (stage.end < todayStr) return 'done';

  // If this is the current stage
  if (stage.id === currentPhaseId) return 'current';

  // If stage start is after current stage end, check if it's next
  const currentIdx = timeline.stages.findIndex(s => s.id === currentPhaseId);
  const stageIdx = timeline.stages.findIndex(s => s.id === stage.id);

  if (stageIdx === currentIdx + 1) return 'next';

  // Otherwise it's planned (future)
  if (stageIdx > currentIdx) return 'planned';

  return 'done';
}

function showStageDetails(stageId) {
  const timeline = window.COMMAND_CENTER_DATA.program_timeline;
  const stage = timeline.stages.find(s => s.id === stageId);
  if (!stage) return;

  alert(`Stage: ${stage.label}\n\nStart: ${stage.start}\nEnd: ${stage.end}\n\nMilestone: ${stage.milestone}`);
}

function handleDecision(decisionId, actionType) {
  console.log(`Decision ${decisionId}: Action ${actionType}`);
  alert(`Decision ${decisionId}: ${actionType}\n\n(This would trigger the actual decision workflow)`);
}

// Export
if (typeof window !== 'undefined') {
  window.renderDeliveryCommandCenter = renderDeliveryCommandCenter;
  window.getTimelineStageStatus = getTimelineStageStatus;
  window.showStageDetails = showStageDetails;
  window.handleDecision = handleDecision;
}
