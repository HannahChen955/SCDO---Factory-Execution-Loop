// ========================================
// AI SYSTEM - AI Response Engine
// Supports both Real OpenAI API and Mock Responses
// ========================================

// Configuration
const AI_CONFIG = {
  useRealAPI: false, // Toggle between real API and mock responses
  apiEndpoint: 'http://localhost:3000/api/openai',
  fallbackToMock: true // If real API fails, fallback to mock
};

// Call Real OpenAI API via backend proxy
async function callRealAI(action, context = {}, params = {}) {
  try {
    const response = await fetch(AI_CONFIG.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action,
        context: {
          ...context,
          ...params
        }
      })
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'API request failed');
    }

    // Convert OpenAI response to our unified format
    return formatOpenAIResponse(data.response, action);

  } catch (error) {
    console.error('Real AI API Error:', error);

    if (AI_CONFIG.fallbackToMock) {
      console.log('Falling back to mock AI response');
      return mockAI(context, action, params);
    }

    throw error;
  }
}

// Format OpenAI text response into structured format
function formatOpenAIResponse(text, action) {
  // For now, return simple formatted response
  // In production, could use more sophisticated parsing or structured outputs
  return {
    summary: [text],
    drivers: [],
    actions: [],
    asks: [],
    evidence: [],
    draft: action.includes('draft') || action.includes('email') ? text : null,
    explanation: action.includes('explain') || action.includes('interpret') ? text : null
  };
}

// Unified AI response format - Mock version
function mockAI(context, action, params = {}) {
  const responses = {
    // Portfolio AI responses
    'portfolio_exec_summary': {
      summary: [
        "2 programs at YELLOW health due to material constraints + test yield drift (38.6k units at risk)",
        "Product A (WF) is primary concern: IC-77 ETA slip + FPY drop driving 12.4k units at risk for W04 ship window",
        "Product C (WF, SZ-01) has limited changeover window risk (5.2k units)"
      ],
      drivers: [
        "Single-source IC-77 shortage affecting Product A",
        "Test lane shared capacity constraint across SKUs",
        "Line changeover window limited for Product C"
      ],
      actions: [
        { action: "Expedite IC-77 via air freight", owner: "Sourcing", sla: "24h", impact: "+6-10 pts confidence" },
        { action: "Prioritize re-test lane + add weekend shift", owner: "PQE/Factory", sla: "48h", impact: "Protect 6k units" },
        { action: "Lock changeover plan for Product C", owner: "MO", sla: "24h", impact: "-2d schedule risk" }
      ],
      asks: [
        "Decision needed: Approve $120k expedite cost for IC-77 air freight",
        "Approve overtime budget for re-test lane weekend shift"
      ],
      evidence: [
        { type: "MATERIAL", message: "IC-77 ETA slipped +2 days (supplier constraint)", time: "09:10" },
        { type: "QUALITY", message: "FPY down 3% for SKU-A1 at Test (3-day drift)", time: "09:05" },
        { type: "INVENTORY", message: "Test WIP building: 8.4k units (+18% WoW)", time: "08:45" }
      ]
    },

    // Home/Delivery Command Center AI responses
    'home_diagnose_commit': {
      summary: [
        "W04 commit is YELLOW (recoverable) with 78% confidence",
        "Primary blocker: IC-77 material slip (+2d) combined with test yield drift (92% → 89%)",
        "Test WIP building to 8.4k units (+18% WoW) — re-test lane is constrained"
      ],
      drivers: [
        "Critical material IC-77 ETA slipped by 2 days (supplier capacity constraint)",
        "FPY drift at Test: 92% → 89% over 3-day trend",
        "Re-test lane constrained: staffing + equipment bottleneck",
        "Line 2 changeover window limited"
      ],
      confidence_gaps: [
        "Missing: Latest supplier allocation confirmation for IC-77",
        "Missing: Root cause analysis for FPY drift (Test station level)",
        "Need: Updated WIP projection with current yield assumptions"
      ]
    },

    'home_recovery_plan': {
      actions: [
        {
          priority: 1,
          action: "Expedite IC-77 via air freight + confirm allocation",
          owner: "Sourcing",
          sla: "24h",
          status: "PENDING",
          expectedImpact: "+6-10 pts confidence, protect W04 ship window"
        },
        {
          priority: 2,
          action: "Prioritize re-test lane + add targeted overtime/weekend shift",
          owner: "PQE/Factory",
          sla: "48h",
          status: "PENDING",
          expectedImpact: "Clear 3-4k units from WIP backlog, -2d schedule risk"
        },
        {
          priority: 3,
          action: "Re-sequence build to protect W04 commit units",
          owner: "Ops/SCDO",
          sla: "Same day",
          status: "PENDING",
          expectedImpact: "Lock W04 ship window, defer lower-priority SKUs"
        }
      ]
    },

    'home_leadership_ask': {
      draft: `**Decision Needed: W04 Commit Protection for ${params.product || 'Product A'}**

**Why now:** IC-77 material slip + test yield drift are driving commit confidence to 78% (YELLOW). Without action in next 24-48h, we risk missing W04 ship window for 12.4k units.

**What we need:**
1. **Approve $120k expedite cost** for IC-77 air freight (vs 2-day delay)
2. **Approve OT budget** for re-test lane weekend shift (clear WIP backlog)

**Options + Tradeoff:**
• **Option A (Recommended):** Expedite + OT → Protect W04 commit, +$120k cost, confidence returns to GREEN
• **Option B:** Wait for sea freight → Save $120k, accept 2-day delay + risk W04 miss
• **Option C:** Build with existing stock only → Zero cost, but 12.4k units at risk

**Next checkpoint:** Daily 16:00 cut — commit updated after supplier ETA confirmation.

*Generated by SCDO Control Tower*`
    },

    // Signals AI responses
    'signals_ingest': {
      events: [
        { type: "MATERIAL", severity: "HIGH", message: "IC-77 ETA slip detected (+2 days)", time: "09:15", confidence: 0.92, evidence: "Supplier email + logistics tracker" },
        { type: "QUALITY", severity: "MED", message: "FPY trending down at Test station 3", time: "09:10", confidence: 0.85, evidence: "MES daily report" },
        { type: "CAPACITY", severity: "LOW", message: "Line 2 changeover scheduled for W05", time: "08:30", confidence: 0.95, evidence: "Factory planning system" }
      ]
    },

    // Risk Radar AI responses
    'radar_interpret_scores': {
      execution_health: "Execution health is YELLOW (62 pts) mainly due to test yield drift (FPY 92% → 89% over 3 days) + WIP building at Test (+18% WoW). Re-test lane is capacity-constrained, causing backlog accumulation.",
      inventory_pressure: "Inventory pressure is YELLOW (71 pts) due to FG above target + forecast down-rev risk. Channel sell-through is below baseline, elevating liability exposure if demand softens further."
    },

    'radar_explain_risk': {
      explanation: `This risk matters because IC-77 is single-sourced and gates final assembly for 12.4k units committed to W04 ship window. Without expedite action, 2-day slip cascades to test + pack, breaking commit confidence.`,
      action_options: [
        { option: "A: Conservative (protect ship window)", description: "Expedite via air freight ($120k) + lock W04 sequence + freeze incremental pulls", tradeoff: "High cost, zero schedule risk, protects commit" },
        { option: "B: Cost-optimized", description: "Wait for sea freight + extend W04 window by 2 days + negotiate customer flexibility", tradeoff: "Save $120k, accept 2-day delay, medium commit risk" },
        { option: "C: Speed-optimized", description: "Expedite + pull forward W05 starts + add weekend OT", tradeoff: "Fastest recovery, highest cost ($185k), increases WIP liability" }
      ]
    },

    // Actions/Orchestration AI responses
    'actions_generate_playbook': {
      playbook: [
        { step: 1, action: "Confirm supplier ETA + allocation for IC-77", owner: "Sourcing", sla: "4h", inputs: "Supplier tracker + PO status" },
        { step: 2, action: "Evaluate expedite options (air freight vs partial sea)", owner: "Sourcing + Logistics", sla: "8h", inputs: "Cost comparison + leadtime analysis" },
        { step: 3, action: "Update commit forecast with ETA scenarios", owner: "SCDO", sla: "12h", inputs: "Build sequence + test capacity model" },
        { step: 4, action: "Decision: Execute expedite or adjust commit", owner: "China Delivery + Leadership", sla: "24h", inputs: "Cost-benefit + commit impact brief" },
        { step: 5, action: "Lock build sequence + communicate to factory", owner: "Ops", sla: "Same day after decision", inputs: "Final ETA + approved plan" },
        { step: 6, action: "Daily tracking until material arrival + commit recovery", owner: "SCDO", sla: "Ongoing", inputs: "Logistics tracker + factory MES" }
      ]
    },

    'actions_draft_message': {
      draft: `**TO:** Sourcing Team
**SUBJECT:** [ACTION REQUIRED] Expedite IC-77 for W04 Commit Protection
**SLA:** 24h

**Context:** IC-77 ETA has slipped +2 days, putting 12.4k units at risk for W04 ship window. Current commit confidence is 78% (YELLOW).

**Action Needed:**
1. Confirm latest supplier ETA + allocation
2. Evaluate air freight expedite option (cost + leadtime)
3. Provide recommendation by EOD today

**Decision Gate:** If expedite cost < $150k, execute immediately. If >$150k, escalate to leadership for approval.

**Next Checkpoint:** Daily 16:00 cut — update commit forecast after ETA confirmation.

*This is an auto-generated action from SCDO Control Tower.*`
    },

    // Reports AI responses
    'reports_customize': {
      report_html: `<!-- Customized report would be generated here based on audience/tone/include options -->`
    },

    'reports_exec_email': {
      draft: `**SUBJECT:** W04 Factory Execution Brief — 2 Programs at Risk

**TL;DR:**
• 2 programs YELLOW (38.6k units at risk)
• Primary driver: IC-77 material slip + test yield drift
• Ask: Approve $120k expedite + OT budget

**Detail:**
Product A (WF): IC-77 slip (+2d) + FPY drift → 12.4k units at risk
Product C (WF, SZ-01): Changeover window limited → 5.2k units at risk

**Actions (Next 48h):**
1. Expedite IC-77 via air freight (Sourcing, 24h)
2. Prioritize re-test lane + weekend OT (PQE/Factory, 48h)
3. Lock changeover plan (MO, 24h)

**Decision Needed:**
• Approve $120k expedite cost
• Approve OT budget for re-test lane

**Next Update:** Daily 16:00 cut

*SCDO Control Tower — Factory Execution Loop*`
    },

    // Simulation AI responses
    'simulation_create_scenario': {
      scenario: {
        name: params.description || "Material Slip + Yield Drift",
        parameters: [
          { param: "IC-77 ETA", baseline: "W04 D2", scenario: "W04 D4", delta: "+2 days" },
          { param: "Test FPY", baseline: "92%", scenario: "89%", delta: "-3%" },
          { param: "Test WIP", baseline: "7.1k", scenario: "8.4k", delta: "+18%" }
        ],
        assumptions: [
          "Re-test lane capacity remains constant at 95 UPH",
          "No additional line downtime events",
          "Demand forecast unchanged"
        ],
        metrics_to_compare: ["Commit confidence", "Units at risk", "Liability exposure", "Expedite cost"]
      }
    },

    'simulation_explain_tradeoffs': {
      summary: "Material expedite protects W04 commit but adds $120k cost. Alternative is 2-day delay which risks customer commit and potential revenue impact ($2.8M at stake).",
      recommendation: "Execute expedite + re-test OT. Rationale: $120k cost is justified by $2.8M revenue protection + customer relationship preservation. Delay risk compounds across supply chain.",
      tradeoff_table: [
        { option: "Expedite + OT", commit_impact: "GREEN (95% conf)", cost: "+$120k", liability: "LOW", customer: "Protected" },
        { option: "Wait for sea freight", commit_impact: "RED (62% conf)", cost: "$0", liability: "MED", customer: "At risk" },
        { option: "Partial expedite", commit_impact: "YELLOW (78% conf)", cost: "+$65k", liability: "MED", customer: "Partial risk" }
      ]
    }
  };

  // Return mock response based on action
  return responses[action] || { summary: ["AI response not configured for this action yet"], drivers: [], actions: [], asks: [], evidence: [] };
}

// AI Drawer Functions
async function openAIDrawer(action, params = {}) {
  // Show loading state
  document.getElementById('aiDrawerBody').innerHTML = `
    <div class="flex flex-col items-center justify-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
      <div class="text-sm text-slate-600">AI is thinking...</div>
    </div>
  `;
  document.getElementById('aiDrawer').classList.remove('hidden');
  document.getElementById('aiDrawerBackdrop').classList.remove('hidden');

  // Get AI response (real or mock based on config)
  let aiResponse;
  if (AI_CONFIG.useRealAPI) {
    aiResponse = await callRealAI(action, STATE, params);
  } else {
    aiResponse = mockAI(STATE, action, params);
  }

  STATE.aiContext = { action, params, response: aiResponse };

  let drawerContent = '';

  // Build drawer content based on response structure
  if (aiResponse.summary && aiResponse.summary.length > 0) {
    drawerContent += `
      <div class="border rounded-xl p-4 bg-gradient-to-br from-blue-50 to-white mb-4">
        <div class="flex items-center gap-2 mb-3">
          <div class="text-2xl">🤖</div>
          <div class="text-sm font-semibold">AI Summary</div>
        </div>
        <ul class="text-sm space-y-2">
          ${aiResponse.summary.map(s => `<li class="flex items-start gap-2"><span class="text-blue-600">•</span><span>${s}</span></li>`).join('')}
        </ul>
      </div>
    `;
  }

  if (aiResponse.drivers && aiResponse.drivers.length > 0) {
    drawerContent += `
      <div class="border rounded-xl p-4 mb-4">
        <div class="text-xs font-semibold text-slate-500 uppercase mb-3">Top Drivers</div>
        <ul class="text-xs space-y-2">
          ${aiResponse.drivers.map(d => `<li class="p-2 bg-slate-50 rounded border-l-2 border-blue-500">${d}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  if (aiResponse.actions && aiResponse.actions.length > 0) {
    drawerContent += `
      <div class="border rounded-xl p-4 mb-4 bg-green-50">
        <div class="text-xs font-semibold text-slate-500 uppercase mb-3">Recommended Actions</div>
        <div class="space-y-2">
          ${aiResponse.actions.map((a, i) => `
            <div class="bg-white border rounded-lg p-3">
              <div class="flex items-start gap-3">
                ${a.priority ? `<div class="flex-shrink-0 w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">${a.priority || i+1}</div>` : ''}
                <div class="flex-1">
                  <div class="text-sm font-semibold mb-1">${a.action}</div>
                  <div class="text-xs text-slate-600">
                    <span class="font-semibold">Owner:</span> ${a.owner}
                    <span class="mx-2">|</span>
                    <span class="font-semibold">SLA:</span> ${a.sla}
                  </div>
                  ${a.impact || a.expectedImpact ? `<div class="text-xs text-green-600 mt-1"><strong>Impact:</strong> ${a.impact || a.expectedImpact}</div>` : ''}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  if (aiResponse.asks && aiResponse.asks.length > 0) {
    drawerContent += `
      <div class="border rounded-xl p-4 mb-4 bg-amber-50">
        <div class="text-xs font-semibold text-amber-900 uppercase mb-3">Leadership Asks</div>
        <ul class="text-sm space-y-2">
          ${aiResponse.asks.map(a => `<li class="flex items-start gap-2"><span class="text-amber-600">⚠️</span><span>${a}</span></li>`).join('')}
        </ul>
      </div>
    `;
  }

  if (aiResponse.evidence && aiResponse.evidence.length > 0) {
    drawerContent += `
      <div class="border rounded-xl p-4 mb-4">
        <div class="text-xs font-semibold text-slate-500 uppercase mb-3">Supporting Evidence</div>
        <div class="space-y-2">
          ${aiResponse.evidence.map(e => `
            <div class="flex items-start gap-3 p-2 bg-slate-50 rounded">
              <div class="text-xs font-mono text-slate-500">${e.time || ''}</div>
              <div class="flex-1">
                <span class="px-2 py-0.5 rounded text-xs font-semibold ${e.severity === 'HIGH' ? 'bg-red-100 text-red-800' : e.severity === 'MED' ? 'bg-yellow-100 text-yellow-800' : 'bg-slate-100 text-slate-700'}">${e.type}</span>
                <div class="text-xs mt-1">${e.message}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  if (aiResponse.draft) {
    drawerContent += `
      <div class="border rounded-xl p-4 mb-4">
        <div class="text-xs font-semibold text-slate-500 uppercase mb-3">Generated Draft</div>
        <div class="bg-slate-50 rounded-lg p-3 text-xs font-mono whitespace-pre-wrap border">${aiResponse.draft}</div>
        <button onclick="copyToClipboard(\`${aiResponse.draft.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`)" class="mt-3 w-full text-sm border rounded-lg px-3 py-2 hover:bg-slate-50">📋 Copy to Clipboard</button>
      </div>
    `;
  }

  if (aiResponse.explanation) {
    drawerContent += `
      <div class="border rounded-xl p-4 mb-4 bg-blue-50">
        <div class="text-xs font-semibold text-blue-900 uppercase mb-3">AI Explanation</div>
        <div class="text-sm text-slate-700">${aiResponse.explanation}</div>
      </div>
    `;
  }

  if (aiResponse.action_options && aiResponse.action_options.length > 0) {
    drawerContent += `
      <div class="border rounded-xl p-4 mb-4">
        <div class="text-xs font-semibold text-slate-500 uppercase mb-3">Action Options</div>
        <div class="space-y-3">
          ${aiResponse.action_options.map(opt => `
            <div class="border rounded-lg p-3 bg-white">
              <div class="text-sm font-semibold mb-1">${opt.option}</div>
              <div class="text-xs text-slate-600 mb-2">${opt.description}</div>
              <div class="text-xs text-slate-500"><strong>Tradeoff:</strong> ${opt.tradeoff}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Confidence gaps
  if (aiResponse.confidence_gaps && aiResponse.confidence_gaps.length > 0) {
    drawerContent += `
      <div class="border rounded-xl p-4 mb-4 bg-yellow-50">
        <div class="text-xs font-semibold text-yellow-900 uppercase mb-3">Data Gaps Affecting Confidence</div>
        <ul class="text-xs space-y-1">
          ${aiResponse.confidence_gaps.map(g => `<li class="flex items-start gap-2"><span class="text-yellow-600">⚠️</span><span>${g}</span></li>`).join('')}
        </ul>
      </div>
    `;
  }

  // Execution health/inventory pressure explanations
  if (aiResponse.execution_health) {
    drawerContent += `
      <div class="border rounded-xl p-4 mb-4">
        <div class="text-xs font-semibold text-slate-500 uppercase mb-2">Execution Health Interpretation</div>
        <div class="text-sm text-slate-700">${aiResponse.execution_health}</div>
      </div>
    `;
  }

  if (aiResponse.inventory_pressure) {
    drawerContent += `
      <div class="border rounded-xl p-4 mb-4">
        <div class="text-xs font-semibold text-slate-500 uppercase mb-2">Inventory Pressure Interpretation</div>
        <div class="text-sm text-slate-700">${aiResponse.inventory_pressure}</div>
      </div>
    `;
  }

  // Events (for signals ingest)
  if (aiResponse.events && aiResponse.events.length > 0) {
    drawerContent += `
      <div class="border rounded-xl p-4 mb-4">
        <div class="text-xs font-semibold text-slate-500 uppercase mb-3">Extracted Events</div>
        <div class="space-y-2">
          ${aiResponse.events.map(e => `
            <div class="border rounded-lg p-3 bg-white">
              <div class="flex items-center gap-2 mb-1">
                <span class="px-2 py-0.5 rounded text-xs font-semibold ${e.severity === 'HIGH' ? 'bg-red-100 text-red-800' : e.severity === 'MED' ? 'bg-yellow-100 text-yellow-800' : 'bg-slate-100 text-slate-700'}">${e.type}</span>
                <span class="text-xs text-slate-500">${e.severity} | ${(e.confidence * 100).toFixed(0)}% confidence</span>
              </div>
              <div class="text-sm mb-1">${e.message}</div>
              <div class="text-xs text-slate-500">Evidence: ${e.evidence}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Playbook
  if (aiResponse.playbook && aiResponse.playbook.length > 0) {
    drawerContent += `
      <div class="border rounded-xl p-4 mb-4">
        <div class="text-xs font-semibold text-slate-500 uppercase mb-3">Generated Playbook</div>
        <div class="space-y-2">
          ${aiResponse.playbook.map(step => `
            <div class="flex items-start gap-3">
              <div class="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">${step.step}</div>
              <div class="flex-1 pt-1">
                <div class="text-sm font-semibold">${step.action}</div>
                <div class="text-xs text-slate-600 mt-1">
                  <span class="font-semibold">Owner:</span> ${step.owner} |
                  <span class="font-semibold">SLA:</span> ${step.sla}
                </div>
                ${step.inputs ? `<div class="text-xs text-slate-500 mt-1">Inputs: ${step.inputs}</div>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Scenario (for simulation)
  if (aiResponse.scenario) {
    const sc = aiResponse.scenario;
    drawerContent += `
      <div class="border rounded-xl p-4 mb-4 bg-blue-50">
        <div class="text-sm font-semibold mb-3">${sc.name}</div>

        <div class="mb-3">
          <div class="text-xs font-semibold text-slate-500 uppercase mb-2">Parameters</div>
          <div class="space-y-1">
            ${sc.parameters.map(p => `
              <div class="text-xs bg-white rounded p-2">
                <strong>${p.param}:</strong> ${p.baseline} → ${p.scenario} <span class="text-red-600">(${p.delta})</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="mb-3">
          <div class="text-xs font-semibold text-slate-500 uppercase mb-2">Assumptions</div>
          <ul class="text-xs space-y-1">
            ${sc.assumptions.map(a => `<li class="flex items-start gap-2"><span>•</span><span>${a}</span></li>`).join('')}
          </ul>
        </div>

        <div>
          <div class="text-xs font-semibold text-slate-500 uppercase mb-2">Metrics to Compare</div>
          <div class="flex flex-wrap gap-2">
            ${sc.metrics_to_compare.map(m => `<span class="px-2 py-1 bg-white rounded text-xs border">${m}</span>`).join('')}
          </div>
        </div>
      </div>
    `;
  }

  // Tradeoff table (simulation)
  if (aiResponse.tradeoff_table && aiResponse.tradeoff_table.length > 0) {
    drawerContent += `
      <div class="border rounded-xl p-4 mb-4">
        <div class="text-xs font-semibold text-slate-500 uppercase mb-3">Tradeoff Comparison</div>
        <div class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead class="bg-slate-50 border-b">
              <tr>
                <th class="text-left p-2 font-semibold">Option</th>
                <th class="text-left p-2 font-semibold">Commit Impact</th>
                <th class="text-left p-2 font-semibold">Cost</th>
                <th class="text-left p-2 font-semibold">Liability</th>
                <th class="text-left p-2 font-semibold">Customer</th>
              </tr>
            </thead>
            <tbody>
              ${aiResponse.tradeoff_table.map(row => `
                <tr class="border-b">
                  <td class="p-2 font-semibold">${row.option}</td>
                  <td class="p-2">${row.commit_impact}</td>
                  <td class="p-2">${row.cost}</td>
                  <td class="p-2">${row.liability}</td>
                  <td class="p-2">${row.customer}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  if (aiResponse.recommendation) {
    drawerContent += `
      <div class="border rounded-xl p-4 mb-4 bg-green-50 border-green-200">
        <div class="text-xs font-semibold text-green-900 uppercase mb-2">AI Recommendation</div>
        <div class="text-sm text-green-900">${aiResponse.recommendation}</div>
      </div>
    `;
  }

  // Footer
  const modeIndicator = AI_CONFIG.useRealAPI
    ? '<span class="text-green-600">✓ Real OpenAI API</span>'
    : '<span class="text-amber-600">⚠ Mock Response (Demo Mode)</span>';

  drawerContent += `
    <div class="mt-4 p-3 bg-slate-50 rounded-lg text-xs text-slate-600">
      <div class="flex items-center justify-between mb-2">
        <strong>AI Mode:</strong>
        ${modeIndicator}
      </div>
      ${!AI_CONFIG.useRealAPI ? '<div><strong>Note:</strong> Enable real AI in AI_CONFIG to use OpenAI API with factory context.</div>' : '<div><strong>Note:</strong> Response generated by OpenAI GPT-4 with factory execution context.</div>'}
    </div>
  `;

  document.getElementById('aiDrawerBody').innerHTML = drawerContent;
  document.getElementById('aiDrawer').classList.remove('hidden');
  document.getElementById('aiDrawerBackdrop').classList.remove('hidden');
}

function closeAIDrawer() {
  document.getElementById('aiDrawer').classList.add('hidden');
  document.getElementById('aiDrawerBackdrop').classList.add('hidden');
  STATE.aiContext = null;
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    alert('Copied to clipboard!');
  }).catch(err => {
    console.error('Failed to copy:', err);
  });
}

// Global exports for AI functions
window.openAIDrawer = openAIDrawer;
window.closeAIDrawer = closeAIDrawer;
window.copyToClipboard = copyToClipboard;
