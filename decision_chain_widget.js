// ========================================
// DECISION CHAIN WIDGET v3.0
// 决策链路可视化 - 可点击钻取的因果关系图
// ========================================

/**
 * 渲染决策链路组件
 * @param {Object} metrics - 指标快照
 * @param {Object} focusMetric - 当前关注的指标
 * @returns {string} HTML
 */
function renderDecisionChain(metrics, focusMetric = null) {
  // Define standard decision chain
  const chain = [
    { id: 'mps_attainment', label: 'Plan', shortLabel: 'Plan' },
    { id: 'ctb', label: 'CTB', shortLabel: 'CTB' },
    { id: 'capacity', label: 'Capacity', shortLabel: 'Cap' },
    { id: 'yield', label: 'Yield', shortLabel: 'Yield' },
    { id: 'mps_attainment_output', label: 'Output', shortLabel: 'Output' },
    { id: 'shipment_readiness', label: 'Ship+2WD', shortLabel: 'Ship' },
    { id: 'service_level', label: 'Commit', shortLabel: 'Commit' }
  ];

  // Calculate node states
  const nodes = chain.map(node => {
    const metric = metrics[node.id];
    if (!metric && node.id === 'mps_attainment_output') {
      // Special case: Output is derived from mps_attainment
      const mpsMetric = metrics['mps_attainment'];
      return {
        ...node,
        value: mpsMetric ? (mpsMetric.value * 100).toFixed(1) + '%' : 'N/A',
        status: getNodeStatus(mpsMetric),
        metric: mpsMetric
      };
    }

    return {
      ...node,
      value: metric ? formatMetricValue(metric) : 'N/A',
      status: metric ? getNodeStatus(metric) : 'unknown',
      metric: metric
    };
  });

  // Identify primary constraint
  const constraintNode = identifyPrimaryConstraint(nodes);

  return `
    <div class="bg-white border-2 border-slate-200 rounded-xl p-6 mb-5 shadow-sm">
      <div class="flex items-center justify-between mb-5">
        <div class="text-base font-bold text-slate-900">Why at risk · 7-node chain</div>
        <div class="text-sm text-slate-600">Binding today: <span class="font-bold text-red-700">${constraintNode ? constraintNode.label : 'None'}</span></div>
      </div>

      <!-- Compact Chain: State Nodes -->
      <div class="mb-5">
        <div class="flex items-center justify-between gap-3">
          ${nodes.map((node, idx) => `
            <div class="flex items-center gap-3">
              <!-- State Node (compact) -->
              <div class="cursor-pointer group relative"
                   onclick="drillDownNode('${node.id}')">
                <div class="border-2 ${getNodeBorderColor(node.status)} rounded-xl px-4 py-3 text-center transition-all min-w-[85px]
                            ${node.id === constraintNode?.id ? 'bg-red-50 border-red-500 shadow-md' : 'bg-white hover:shadow-md hover:scale-105'}">
                  <div class="text-xs font-bold text-slate-700 mb-1">${node.shortLabel}</div>
                  <div class="text-2xl font-bold ${getNodeTextColor(node.status)} my-1">
                    ${node.id === constraintNode?.id ? '⚠️' : node.status === 'ok' ? '✓' : node.status === 'low_confidence' ? '?' : '!'}
                  </div>
                  <div class="text-xs ${getNodeStatusBadgeColor(node.status)} font-bold uppercase tracking-wide">
                    ${node.id === constraintNode?.id ? 'BIND' : node.status === 'ok' ? 'OK' : node.status === 'low_confidence' ? 'LOW' : 'RISK'}
                  </div>
                </div>

                <!-- Tooltip -->
                <div class="absolute z-10 -top-20 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  <div class="font-semibold">${node.label}: ${node.value}</div>
                  <div class="text-slate-300 mt-1">${node.metric?.data_snapshot?.reconciliation_status ? `Conf: ${node.metric.data_snapshot.reconciliation_status}` : 'Click for details'}</div>
                </div>
              </div>

              <!-- Arrow -->
              ${idx < nodes.length - 1 ? `
                <div class="text-xl text-slate-400 font-bold">→</div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Constraint Summary (compact) -->
      ${constraintNode ? `
        <div class="bg-red-50 border-2 border-red-300 rounded-xl p-4 shadow-sm">
          <div class="text-sm font-bold text-red-900 mb-3">⚠️ ${constraintNode.label} is binding today</div>
          <div class="text-sm text-red-800 space-y-2 mb-3">
            ${getConstraintBullets(constraintNode).map(bullet => `<div class="flex items-start gap-2"><span class="text-red-600 font-bold">•</span><span>${bullet}</span></div>`).join('')}
          </div>
          <div class="text-sm bg-white border-2 border-red-400 rounded-lg px-3 py-2 font-semibold text-red-900">
            → ${getConstraintRecommendation(constraintNode)}
          </div>
        </div>
      ` : `
        <div class="bg-green-50 border-2 border-green-300 rounded-xl p-4 shadow-sm">
          <div class="text-sm font-bold text-green-900">✓ All nodes OK — no binding constraint</div>
        </div>
      `}
    </div>
  `;
}

/**
 * 获取节点状态
 * @param {Object} metric - 指标对象
 * @returns {string} 'green' | 'yellow' | 'red' | 'unknown'
 */
function getNodeStatus(metric) {
  if (!metric || !metric.value || !metric.threshold) return 'unknown';

  // Different logic depending on metric type
  if (metric.threshold_type === 'above') {
    // Higher is better (e.g., yield, service level)
    if (metric.value >= metric.threshold * 1.05) return 'green';
    if (metric.value >= metric.threshold) return 'yellow';
    return 'red';
  } else if (metric.threshold_type === 'below') {
    // Lower is better (e.g., cost risk)
    if (metric.value <= metric.threshold * 0.95) return 'green';
    if (metric.value <= metric.threshold) return 'yellow';
    return 'red';
  } else {
    // Default: assume higher is better
    if (metric.value >= 0.95) return 'green';
    if (metric.value >= 0.85) return 'yellow';
    return 'red';
  }
}

/**
 * 格式化指标值显示
 */
function formatMetricValue(metric) {
  if (!metric || metric.value === undefined) return 'N/A';

  // If it's a percentage
  if (metric.value >= 0 && metric.value <= 1) {
    return (metric.value * 100).toFixed(1) + '%';
  }

  // If it's days cover
  if (metric.days_cover !== undefined) {
    return metric.days_cover.toFixed(1) + 'd';
  }

  // Default
  if (metric.value >= 1000) {
    return (metric.value / 1000).toFixed(1) + 'k';
  }

  return metric.value.toFixed(1);
}

/**
 * 获取节点边框颜色
 */
function getNodeBorderColor(status) {
  const colors = {
    green: 'border-green-400',
    yellow: 'border-yellow-400',
    red: 'border-red-400',
    unknown: 'border-slate-300'
  };
  return colors[status] || colors.unknown;
}

/**
 * 获取节点文本颜色
 */
function getNodeTextColor(status) {
  const colors = {
    green: 'text-green-700',
    yellow: 'text-yellow-700',
    red: 'text-red-700',
    unknown: 'text-slate-500'
  };
  return colors[status] || colors.unknown;
}

/**
 * 获取节点状态徽章颜色
 */
function getNodeStatusBadgeColor(status) {
  const colors = {
    green: 'bg-green-100 text-green-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    red: 'bg-red-100 text-red-700',
    unknown: 'bg-slate-100 text-slate-500'
  };
  return colors[status] || colors.unknown;
}

/**
 * 获取节点状态图标
 */
function getNodeStatusIcon(status) {
  const icons = {
    green: '✓',
    yellow: '⚠',
    red: '✗',
    unknown: '?'
  };
  return icons[status] || icons.unknown;
}

/**
 * 识别主要约束节点
 * @param {Array} nodes - 节点数组
 * @returns {Object|null} 约束节点
 */
function identifyPrimaryConstraint(nodes) {
  // Find the first red node
  const redNode = nodes.find(node => node.status === 'red');
  if (redNode) return redNode;

  // If no red, find first yellow
  const yellowNode = nodes.find(node => node.status === 'yellow');
  return yellowNode || null;
}

/**
 * 获取约束解释
 */
function getConstraintExplanation(node) {
  const explanations = {
    'ctb': 'Material availability is below required levels, preventing the factory from releasing planned input to production lines.',
    'capacity': 'Production line capacity utilization is at or above maximum, leaving no buffer for demand fluctuations.',
    'yield': 'Manufacturing yield is below target, resulting in higher scrap rates and reduced effective output.',
    'mps_attainment': 'Actual production output is significantly below the Master Production Schedule target.',
    'mps_attainment_output': 'Actual production output is significantly below the Master Production Schedule target.',
    'shipment_readiness': 'Finished goods inventory is insufficient to support committed shipment dates.',
    'service_level': 'On-time delivery performance is below target, putting customer commitments at risk.'
  };

  return explanations[node.id] || `${node.label} performance is below target, impacting downstream operations.`;
}

/**
 * 渲染相关因素
 */
function renderRelatedFactors(node) {
  const factors = getRelatedFactors(node);
  if (!factors || factors.length === 0) return '';

  return `
    <div class="bg-white border rounded p-3 mb-2">
      <div class="text-xs font-semibold text-slate-700 mb-2">Contributing Factors:</div>
      <ul class="text-xs text-slate-700 space-y-1">
        ${factors.map(factor => `
          <li class="flex items-start gap-2">
            <span class="text-red-500">•</span>
            <span>${factor}</span>
          </li>
        `).join('')}
      </ul>
    </div>
  `;
}

/**
 * 获取相关因素（模拟）
 */
function getRelatedFactors(node) {
  const factorMap = {
    'yield': [
      'Test station: 94.2% (target 97.5%, -3.3%)',
      'Re-test queue: 2.8k units backlog',
      'Top failure modes: AC-401 (45%), DC-203 (30%), FN-105 (25%)'
    ],
    'ctb': [
      'IC-77 component shortage: 2 days supply remaining',
      'Supplier delay on Lot #X2401',
      'Cross-site transfer in progress: +800 units ETA 48h'
    ],
    'capacity': [
      'Line utilization: 87% average (peak 95%)',
      'Changeover efficiency: 82% (target 90%)',
      'Holiday staffing constraints: W05-W07'
    ]
  };

  return factorMap[node.id] || [];
}

/**
 * 获取约束节点的简化要点（3个要点）
 */
function getConstraintBullets(node) {
  const bulletMap = {
    'yield': [
      'Current: 94.2% vs target 97.5% (-3.3%)',
      'Impact: ~4.8k units scrapped/reworked',
      'Top failure codes: AC-401 (45%), DC-203 (30%), FN-105 (25%)'
    ],
    'ctb': [
      'IC-77 component: 2 days supply remaining',
      'Supplier Lot #X2401 delayed',
      'Cross-site transfer: +800 units ETA 48h'
    ],
    'capacity': [
      'Test capacity: 87% utilization (constrained)',
      'Re-test queue: 2.8k units backlog',
      'Holiday staffing: W05-W07 constraints'
    ],
    'shipment_readiness': [
      'Packing bottleneck: +1.5d lead-time variance',
      'WH space: 94% utilization (nearing capacity)',
      'Current shipment: 95.5% to commit'
    ],
    'service_level': [
      'On-time delivery: below target',
      'Customer commitments at risk',
      'Downstream impact from output gap'
    ]
  };

  return bulletMap[node.id] || [
    `${node.label} is below target`,
    'Impacting downstream operations',
    'Detailed analysis needed'
  ];
}

/**
 * 获取约束节点的推荐行动（1个推荐）
 */
function getConstraintRecommendation(node) {
  const recommendationMap = {
    'yield': 'Quarantine Lot #X2401 + fast-track ECN for AC-401 fix by W05',
    'ctb': 'Expedite IC-77 via air freight + confirm cross-site transfer timeline',
    'capacity': 'Add weekend shift for Test station + reallocate 20% capacity',
    'shipment_readiness': 'Dual-shift packing + prioritize high-priority SKUs',
    'service_level': 'Evaluate air freight options + schedule customer coordination',
    'mps_attainment': 'Review capacity constraints (CTB, Capacity, Yield)'
  };

  return recommendationMap[node.id] || `Investigate ${node.label} root cause and escalate`;
}

/**
 * 钻取节点详情
 */
function drillDownNode(nodeId) {
  console.log(`[Decision Chain] Drilling down into node: ${nodeId}`);

  // Find metric data
  const metrics = window.commandCenterState?.latestMetrics || {};
  const metric = metrics[nodeId];

  if (!metric) {
    showNotification(`❌ No data available for ${nodeId}`, 'error');
    return;
  }

  // Render drill-down modal
  const modal = document.createElement('div');
  modal.id = 'nodeDrillDownModal';
  modal.className = 'fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4';
  modal.onclick = (e) => {
    if (e.target === modal) closeNodeDrillDown();
  };

  const metricDict = window.METRIC_DICTIONARY?.metrics[nodeId];

  modal.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
      <!-- Header -->
      <div class="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-white">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-lg font-bold">${metricDict?.display_name || nodeId}</div>
            <div class="text-sm text-blue-100">${metricDict?.plain_language || 'Metric detail view'}</div>
          </div>
          <button onclick="closeNodeDrillDown()" class="text-white hover:bg-white/20 rounded-lg p-2">
            <span class="text-2xl">×</span>
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-6">
        <!-- Current Value -->
        <div class="mb-6">
          <div class="text-sm font-bold text-slate-700 mb-2">Current Value</div>
          <div class="text-4xl font-bold ${getNodeTextColor(getNodeStatus(metric))}">${formatMetricValue(metric)}</div>
          <div class="text-sm text-slate-600 mt-1">Target: ${metric.threshold ? formatMetricValue({value: metric.threshold}) : 'N/A'}</div>
        </div>

        <!-- Confidence -->
        <div class="mb-6">
          <div class="text-sm font-bold text-slate-700 mb-2">Data Confidence</div>
          <div class="bg-slate-50 border rounded-lg p-4">
            <div class="text-xs text-slate-600">
              Age: ${metric.data_snapshot?.age_hours || 0}h ·
              Coverage: ${metric.data_snapshot?.coverage_pct || 0}% ·
              Status: ${metric.data_snapshot?.reconciliation_status || 'unknown'}
            </div>
          </div>
        </div>

        <!-- Why It Matters -->
        ${metricDict?.why_it_matters ? `
          <div class="mb-6">
            <div class="text-sm font-bold text-slate-700 mb-2">Why It Matters</div>
            <div class="text-sm text-slate-700">${metricDict.why_it_matters}</div>
          </div>
        ` : ''}

        <!-- Related Metrics -->
        ${metricDict?.interdependency_links ? `
          <div>
            <div class="text-sm font-bold text-slate-700 mb-2">Related Metrics</div>
            <div class="space-y-2">
              ${(metricDict.interdependency_links.upstream_drivers || []).map(link => `
                <div class="text-xs text-slate-600">
                  ⬆️ Upstream: <span class="font-semibold">${link.metric_id}</span> - ${link.relationship}
                </div>
              `).join('')}
              ${(metricDict.interdependency_links.downstream_impacts || []).map(link => `
                <div class="text-xs text-slate-600">
                  ⬇️ Downstream: <span class="font-semibold">${link.metric_id}</span> - ${link.relationship}
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

/**
 * 关闭节点钻取模态框
 */
function closeNodeDrillDown() {
  const modal = document.getElementById('nodeDrillDown Modal');
  if (modal) modal.remove();
}

/**
 * 调查约束
 */
function investigateConstraint(nodeId) {
  console.log(`[Decision Chain] Investigating constraint: ${nodeId}`);
  showNotification('🔍 Root cause analysis coming soon!', 'info');
}

/**
 * 查看历史趋势
 */
function viewHistoricalTrend(nodeId) {
  console.log(`[Decision Chain] Viewing trend for: ${nodeId}`);
  showNotification('📈 Historical trend viewer coming soon!', 'info');
}

/**
 * 获取指标状态描述
 */
function getMetricStatus(metric) {
  if (!metric) return 'performing';
  const status = getNodeStatus(metric);
  if (status === 'red') return 'red (below target)';
  if (status === 'yellow') return 'yellow (at risk)';
  if (status === 'green') return 'green (on track)';
  return 'unknown';
}

// ========================================
// 导出
// ========================================
if (typeof window !== 'undefined') {
  window.renderDecisionChain = renderDecisionChain;
  window.drillDownNode = drillDownNode;
  window.closeNodeDrillDown = closeNodeDrillDown;
  window.investigateConstraint = investigateConstraint;
  window.viewHistoricalTrend = viewHistoricalTrend;
  window.getNodeStatus = getNodeStatus;
  window.identifyPrimaryConstraint = identifyPrimaryConstraint;
}
