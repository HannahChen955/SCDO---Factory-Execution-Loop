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
      <div class="text-sm font-semibold mb-4">This Week's Delivery Commit</div>

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
