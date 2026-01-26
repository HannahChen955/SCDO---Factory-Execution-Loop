// ========================================
// COMMAND CENTER v3.0
// 决策收件箱 - 基于指标路由的行动推荐系统
// ========================================

// 全局状态
window.commandCenterState = {
  latestMetrics: null,
  latestDecisionCards: null,
  latestConfidence: null,
  featureEnabled: true  // Feature flag
};

/**
 * 渲染 Command Center 主页面
 */
function renderCommandCenter() {
  const container = document.getElementById('content');

  container.innerHTML = `
    <!-- Unified Metric Index - Core Capabilities -->
    <div class="mb-6">
      <div class="text-center mb-4">
        <h1 class="text-2xl font-bold text-slate-900 mb-2">🎯 Command Center</h1>
        <p class="text-sm text-slate-600">基于统一指标体系 (Unified Metric Index) 的智能决策路由系统</p>
      </div>

      <div class="grid grid-cols-3 gap-4">
        <!-- Real-time Execution Visibility -->
        <div class="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-4 text-center">
          <div class="text-3xl mb-2">📊</div>
          <div class="text-lg font-bold text-blue-900 mb-1">Real-time</div>
          <div class="text-sm text-blue-700">Execution Visibility</div>
          <div class="text-xs text-blue-600 mt-2">实时执行可见性</div>
        </div>

        <!-- Predictive Risk Intelligence -->
        <div class="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl p-4 text-center">
          <div class="text-3xl mb-2">🔮</div>
          <div class="text-lg font-bold text-green-900 mb-1">Predictive</div>
          <div class="text-sm text-green-700">Risk Intelligence</div>
          <div class="text-xs text-green-600 mt-2">预测性风险情报</div>
        </div>

        <!-- Automated Decision Support -->
        <div class="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-xl p-4 text-center">
          <div class="text-3xl mb-2">⚡</div>
          <div class="text-lg font-bold text-purple-900 mb-1">Automated</div>
          <div class="text-sm text-purple-700">Decision Support</div>
          <div class="text-xs text-purple-600 mt-2">自动化决策支持</div>
        </div>
      </div>

      <!-- Unified Metric Index Foundation -->
      <div class="mt-4 bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-500 rounded-lg p-3">
        <div class="flex items-center gap-2">
          <div class="text-xl">🔗</div>
          <div class="flex-1">
            <div class="text-sm font-bold text-amber-900">Unified Metric Index (统一指标体系)</div>
            <div class="text-xs text-amber-700 mt-1">
              8 个核心指标 (3 Outcome + 4 Driver + 1 Evidence) · 置信度标注 · 决策路由 · 依赖关系可视化
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Anti-Ranking Commitment Banner -->
    <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-600 p-4 mb-6 rounded-lg">
      <div class="flex items-start gap-3">
        <div class="text-2xl">ℹ️</div>
        <div>
          <div class="font-bold text-blue-900 mb-1">设计原则</div>
          <div class="text-sm text-blue-800">
            本系统不对工厂或团队进行排名比较。红/黄/绿仅用于路由决策，不代表表现评分。
            无可执行动作的指标不会触发警告。
          </div>
        </div>
      </div>
    </div>

    <!-- Glossary Strip -->
    <div class="bg-white border rounded-xl p-4 mb-6">
      <button onclick="toggleGlossary()" class="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-blue-600">
        <span>📖</span>
        <span>术语词汇表</span>
        <span id="glossaryArrow" class="text-xs">▼</span>
      </button>
      <div id="glossaryPanel" class="hidden mt-4 grid grid-cols-2 gap-4 pt-4 border-t">
        <div>
          <dt class="font-semibold text-sm text-slate-900">MPS (Master Production Schedule)</dt>
          <dd class="text-sm text-slate-600 mt-1">主生产计划，规定每周应生产的目标数量</dd>
        </div>
        <div>
          <dt class="font-semibold text-sm text-slate-900">Output Factors</dt>
          <dd class="text-sm text-slate-600 mt-1">产出系数：Day1=0.5, Day2=1.0, Day3+=1.0，反映新生产单元的成熟度</dd>
        </div>
        <div>
          <dt class="font-semibold text-sm text-slate-900">Workday</dt>
          <dd class="text-sm text-slate-600 mt-1">工作日，不包含周日和法定节假日，用于爬坡曲线索引</dd>
        </div>
        <div>
          <dt class="font-semibold text-sm text-slate-900">CTB (Components to Build)</dt>
          <dd class="text-sm text-slate-600 mt-1">可用物料数量，限制当日最大产出</dd>
        </div>
        <div>
          <dt class="font-semibold text-sm text-slate-900">Shipment Readiness</dt>
          <dd class="text-sm text-slate-600 mt-1">出货就绪度 = 产出日期 + 2 个工作日后可发货的数量</dd>
        </div>
        <div>
          <dt class="font-semibold text-sm text-slate-900">Service Level</dt>
          <dd class="text-sm text-slate-600 mt-1">承诺交付日期内按时出货的订单比例</dd>
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="flex items-center gap-3 mb-6">
      <button onclick="runProductionPlanAndRoute()"
              class="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold shadow-sm hover:shadow-md transition-all">
        🔄 运行决策路由
      </button>
      <button onclick="enableSimulationMode()"
              class="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold shadow-sm hover:shadow-md transition-all">
        🧪 进入情景模拟
      </button>
      <button onclick="navigateTo('production_plan')"
              class="px-5 py-2.5 border-2 border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50">
        ← 返回生产计划
      </button>
    </div>

    <!-- Decision Cards Container -->
    <div id="decisionCardsContainer">
      <div class="text-center py-12 text-slate-500">
        <div class="text-6xl mb-4">📋</div>
        <div class="text-lg font-semibold">点击"运行决策路由"查看需要关注的事项</div>
      </div>
    </div>

    <!-- Metrics Overview (Data Reference Only) -->
    <div class="mt-8">
      <h2 class="text-lg font-bold text-slate-900 mb-4">指标总览（数据参考）</h2>
      <div id="metricsOverviewGrid" class="grid grid-cols-4 gap-4">
        <!-- Will be populated dynamically -->
      </div>
    </div>
  `;
}

/**
 * 切换术语词汇表显示
 */
function toggleGlossary() {
  const panel = document.getElementById('glossaryPanel');
  const arrow = document.getElementById('glossaryArrow');

  if (panel.classList.contains('hidden')) {
    panel.classList.remove('hidden');
    arrow.textContent = '▲';
  } else {
    panel.classList.add('hidden');
    arrow.textContent = '▼';
  }
}

/**
 * 运行生产计划并执行路由
 */
function runProductionPlanAndRoute() {
  // 1. 检查是否有生产计划结果
  const planState = window.productionPlanState;
  if (!planState || !planState.planResults || planState.planResults.length === 0) {
    showNotification('⚠️ 请先在 Production Plan 页面生成计划', 'warning');
    return;
  }

  showNotification('🔄 正在计算指标并评估路由规则...', 'info');

  setTimeout(() => {
    // 2. 计算指标
    const metrics = calculateMetricsFromPlan(
      planState.planResults.dailyResults || [],
      planState.engine || {}
    );

    // 3. 计算置信度
    const confidence = calculateBatchConfidence(metrics);

    // 4. 执行路由评估
    const context = {
      isHoliday: false,
      ramp_day_index: 10,
      isMonthEnd: false
    };

    const decisionCards = evaluateRoutingRules(metrics, context);

    // 5. 保存到全局状态
    window.commandCenterState.latestMetrics = metrics;
    window.commandCenterState.latestDecisionCards = decisionCards;
    window.commandCenterState.latestConfidence = confidence;

    // 6. 渲染决策卡片
    renderDecisionCards(decisionCards);

    // 7. 渲染指标总览
    renderMetricsOverview(metrics, confidence);

    showNotification(`✅ 完成！发现 ${decisionCards.length} 个需要关注的事项`, 'success');
  }, 500);
}

/**
 * 渲染决策卡片
 */
function renderDecisionCards(cards) {
  const container = document.getElementById('decisionCardsContainer');

  if (!cards || cards.length === 0) {
    container.innerHTML = `
      <div class="bg-green-50 border-2 border-green-200 rounded-xl p-8 text-center">
        <div class="text-5xl mb-3">✅</div>
        <div class="text-lg font-bold text-green-900">所有指标正常</div>
        <div class="text-sm text-green-700 mt-2">当前没有需要立即关注的事项</div>
      </div>
    `;
    return;
  }

  // 按优先级分组
  const highPriority = cards.filter(c => c.priority === 'high');
  const mediumPriority = cards.filter(c => c.priority === 'medium');
  const lowPriority = cards.filter(c => c.priority === 'low');

  let html = '';

  // 高优先级
  if (highPriority.length > 0) {
    html += `
      <div class="mb-6">
        <h3 class="text-lg font-bold text-red-900 mb-3 flex items-center gap-2">
          <span>🔴</span>
          <span>需要立即关注 (High Priority - ${highPriority.length})</span>
        </h3>
        <div class="space-y-4">
          ${highPriority.map(card => renderSingleCard(card, 'high')).join('')}
        </div>
      </div>
    `;
  }

  // 中优先级
  if (mediumPriority.length > 0) {
    html += `
      <div class="mb-6">
        <h3 class="text-lg font-bold text-yellow-900 mb-3 flex items-center gap-2">
          <span>🟡</span>
          <span>建议查看 (Medium Priority - ${mediumPriority.length})</span>
        </h3>
        <div class="space-y-4">
          ${mediumPriority.map(card => renderSingleCard(card, 'medium')).join('')}
        </div>
      </div>
    `;
  }

  // 低优先级
  if (lowPriority.length > 0) {
    html += `
      <div class="mb-6">
        <h3 class="text-lg font-bold text-blue-900 mb-3 flex items-center gap-2">
          <span>🔵</span>
          <span>信息参考 (Low Priority - ${lowPriority.length})</span>
        </h3>
        <div class="space-y-4">
          ${lowPriority.map(card => renderSingleCard(card, 'low')).join('')}
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
}

/**
 * 渲染单个决策卡片
 */
function renderSingleCard(card, priority) {
  const borderColor = {
    high: 'border-red-300 bg-red-50',
    medium: 'border-yellow-300 bg-yellow-50',
    low: 'border-blue-300 bg-blue-50'
  }[priority];

  const badgeColor = {
    high: 'bg-red-600',
    medium: 'bg-yellow-600',
    low: 'bg-blue-600'
  }[priority];

  const confidenceBadge = getConfidenceBadgeClass(card.confidence.level);

  return `
    <div class="border-2 ${borderColor} rounded-xl overflow-hidden">
      <!-- Header -->
      <div class="px-6 py-4 bg-white border-b flex items-center justify-between">
        <div class="flex-1">
          <div class="flex items-center gap-3 mb-2">
            <h4 class="text-lg font-bold text-slate-900">${card.title}</h4>
            <span class="px-3 py-1 ${badgeColor} text-white text-xs font-bold rounded-full uppercase">
              ${priority}
            </span>
          </div>
          <div class="flex items-center gap-4 text-sm text-slate-600">
            <span>📋 ${card.metric_id}</span>
            <span>👤 ${card.decision_owner}</span>
            <span>⏱️ SLA: ${card.sla_hours}h</span>
          </div>
        </div>
        <div class="px-3 py-1.5 border-2 ${confidenceBadge} rounded-lg text-xs font-semibold">
          ${card.confidence.display}
        </div>
      </div>

      <!-- Body -->
      <div class="px-6 py-4">
        <!-- Description -->
        <div class="mb-4">
          <div class="text-sm text-slate-700">${card.description}</div>
        </div>

        <!-- Impact Statement -->
        <div class="mb-4 p-4 bg-white border-l-4 border-orange-500 rounded">
          <div class="text-xs font-semibold text-orange-900 mb-1">影响分析</div>
          <div class="text-sm text-orange-800">${card.impact_statement}</div>
        </div>

        <!-- Suggested Actions -->
        <div class="bg-white rounded-lg p-4 border">
          <div class="text-sm font-bold text-slate-900 mb-3">建议行动</div>
          <div class="space-y-2">
            ${card.suggested_actions.map((action, idx) => `
              <div class="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                <div class="flex-1">
                  <div class="text-sm font-semibold text-slate-900">${idx + 1}. ${action.label}</div>
                  ${action.estimated_time_minutes ? `
                    <div class="text-xs text-slate-600 mt-1">预估时间: ${action.estimated_time_minutes} 分钟</div>
                  ` : ''}
                  ${action.estimated_cost_usd ? `
                    <div class="text-xs text-slate-600 mt-1">预估成本: $${action.estimated_cost_usd.toLocaleString()}</div>
                  ` : ''}
                  ${action.requires_approval ? `
                    <div class="text-xs text-amber-600 mt-1">⚠️ 需要批准: ${action.requires_approval}</div>
                  ` : ''}
                </div>
                <button onclick='executeActionFromCard(${JSON.stringify(card.card_id)}, ${JSON.stringify(action.action_id)})'
                        class="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
                  执行
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-3 bg-slate-50 border-t flex items-center justify-between text-xs text-slate-600">
        <div>创建时间: ${new Date(card.timestamp).toLocaleString()}</div>
        <div>规则: ${card.rule_id}</div>
      </div>
    </div>
  `;
}

/**
 * 从卡片执行行动
 */
function executeActionFromCard(cardId, actionId) {
  const card = window.commandCenterState.latestDecisionCards?.find(c => c.card_id === cardId);
  if (!card) {
    showNotification('❌ 卡片未找到', 'error');
    return;
  }

  executeAction(actionId, card);
}

/**
 * 渲染指标总览
 */
function renderMetricsOverview(metrics, confidence) {
  const container = document.getElementById('metricsOverviewGrid');

  const metricsList = [
    { id: 'mps_attainment', name: 'MPS Attainment', format: 'percentage' },
    { id: 'service_level', name: 'Service Level', format: 'percentage' },
    { id: 'cost_risk', name: 'Cost Risk', format: 'percentage' },
    { id: 'ctb', name: 'CTB', format: 'number' },
    { id: 'capacity', name: 'Capacity', format: 'number' },
    { id: 'yield', name: 'Yield', format: 'percentage' },
    { id: 'shipment_readiness', name: 'Shipment Readiness', format: 'number' },
    { id: 'data_freshness', name: 'Data Freshness', format: 'hours' }
  ];

  const html = metricsList.map(m => {
    const metric = metrics[m.id];
    if (!metric) return '';

    const conf = confidence[m.id];
    const confBadge = conf ? getConfidenceBadgeClass(conf.level) : '';

    let displayValue = 'N/A';
    if (m.format === 'percentage' && metric.value !== undefined) {
      displayValue = `${(metric.value * 100).toFixed(1)}%`;
    } else if (m.format === 'number' && metric.value !== undefined) {
      displayValue = metric.value.toLocaleString();
    } else if (m.format === 'hours' && metric.age_hours !== undefined) {
      displayValue = `${metric.age_hours}h`;
    }

    return `
      <div class="bg-white border rounded-lg p-4">
        <div class="flex items-center justify-between mb-2">
          <div class="text-xs font-semibold text-slate-600">${m.name}</div>
          ${conf ? `
            <div class="px-2 py-0.5 border ${confBadge} rounded text-xs font-semibold">
              ${conf.level}
            </div>
          ` : ''}
        </div>
        <div class="text-2xl font-bold text-slate-900">${displayValue}</div>
      </div>
    `;
  }).join('');

  container.innerHTML = html;
}

/**
 * 启用情景模拟模式
 */
function enableSimulationMode() {
  showNotification('🧪 情景模拟功能将在 Batch A 完成后启用', 'info');
}

// 导出函数
if (typeof window !== 'undefined') {
  window.renderCommandCenter = renderCommandCenter;
  window.toggleGlossary = toggleGlossary;
  window.runProductionPlanAndRoute = runProductionPlanAndRoute;
  window.renderDecisionCards = renderDecisionCards;
  window.executeActionFromCard = executeActionFromCard;
  window.renderMetricsOverview = renderMetricsOverview;
  window.enableSimulationMode = enableSimulationMode;
}
