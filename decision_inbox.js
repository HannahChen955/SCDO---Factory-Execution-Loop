// ========================================
// DECISION INBOX v3.0
// 决策收件箱 - 48h/7d 分栏的行动队列
// ========================================

/**
 * 渲染 Decision Inbox
 * @param {Array} decisionCards - 决策卡片数组（来自 routing_engine）
 * @param {Object} options - 渲染选项
 * @returns {string} HTML
 */
function renderDecisionInbox(decisionCards, options = {}) {
  if (!decisionCards || decisionCards.length === 0) {
    return renderEmptyInbox();
  }

  // 按 SLA 分类
  const now = new Date();
  const urgent = decisionCards.filter(card => {
    const slaHours = card.sla_hours || 48;
    return slaHours <= 48;
  });
  const review = decisionCards.filter(card => {
    const slaHours = card.sla_hours || 48;
    return slaHours > 48;
  });

  // 按优先级排序
  const sortByPriority = (a, b) => {
    const priorityOrder = { high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  };

  urgent.sort(sortByPriority);
  review.sort(sortByPriority);

  return `
    <div class="bg-gradient-to-r from-slate-50 to-slate-100 border rounded-xl overflow-hidden mb-6">
      <!-- Header -->
      <div class="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-white">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-lg font-bold">Decision Inbox</div>
            <div class="text-sm text-blue-100">Prioritized actions that require attention or decision</div>
          </div>
          <div class="flex items-center gap-3">
            <div class="text-right">
              <div class="text-2xl font-bold">${decisionCards.length}</div>
              <div class="text-xs text-blue-100">Total decisions</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Two-column layout -->
      <div class="grid grid-cols-2 divide-x divide-slate-200">
        <!-- 48h Column -->
        <div class="p-6">
          <div class="flex items-center gap-2 mb-4">
            <div class="text-xl">⏰</div>
            <div>
              <div class="font-bold text-slate-900">Needs Action in 48h</div>
              <div class="text-xs text-slate-600">${urgent.length} decision${urgent.length !== 1 ? 's' : ''}</div>
            </div>
          </div>

          <div class="space-y-3">
            ${urgent.length > 0 ? urgent.map(card => renderDecisionCard(card, 'urgent')).join('') :
              '<div class="text-center py-8 text-slate-400"><div class="text-4xl mb-2">✅</div><div class="text-sm">No urgent decisions</div></div>'}
          </div>
        </div>

        <!-- 7d Column -->
        <div class="p-6 bg-slate-50">
          <div class="flex items-center gap-2 mb-4">
            <div class="text-xl">📅</div>
            <div>
              <div class="font-bold text-slate-900">Review in 7d</div>
              <div class="text-xs text-slate-600">${review.length} decision${review.length !== 1 ? 's' : ''}</div>
            </div>
          </div>

          <div class="space-y-3">
            ${review.length > 0 ? review.map(card => renderDecisionCard(card, 'review')).join('') :
              '<div class="text-center py-8 text-slate-400"><div class="text-4xl mb-2">📭</div><div class="text-sm">No scheduled reviews</div></div>'}
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * 渲染单个决策卡片
 * @param {Object} card - 决策卡片
 * @param {string} urgency - 'urgent' | 'review'
 * @returns {string} HTML
 */
function renderDecisionCard(card, urgency) {
  const priorityConfig = {
    high: { icon: '🚨', color: 'red', label: 'HIGH' },
    medium: { icon: '⚠️', color: 'yellow', label: 'MED' },
    low: { icon: 'ℹ️', color: 'blue', label: 'LOW' }
  };

  const config = priorityConfig[card.priority] || priorityConfig.medium;
  const confidenceColor = {
    HIGH: 'green',
    MEDIUM: 'yellow',
    LOW: 'red'
  }[card.confidence?.level || 'MEDIUM'];

  // Calculate SLA remaining
  const slaRemaining = calculateSLARemaining(card);

  return `
    <div class="bg-white border-2 border-${config.color}-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
         onclick="expandDecisionCard('${card.card_id}')">
      <!-- Header -->
      <div class="flex items-start justify-between mb-2">
        <div class="flex items-center gap-2">
          <span class="text-2xl">${config.icon}</span>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold px-2 py-0.5 bg-${config.color}-100 text-${config.color}-800 rounded">${config.label}</span>
              <span class="text-xs font-semibold text-slate-900">${card.title}</span>
            </div>
          </div>
        </div>
        <div class="text-right">
          <div class="text-xs text-slate-500">Confidence</div>
          <div class="inline-block px-2 py-0.5 bg-${confidenceColor}-100 text-${confidenceColor}-700 text-xs font-semibold rounded">
            ${card.confidence?.level || 'MEDIUM'}
          </div>
        </div>
      </div>

      <!-- Impact -->
      <div class="text-sm text-slate-700 mb-3">
        ${card.impact_statement || card.description}
      </div>

      <!-- Owner & SLA -->
      <div class="flex items-center justify-between text-xs text-slate-600 mb-3">
        <div class="flex items-center gap-1">
          <span>👤</span>
          <span class="font-semibold">${card.decision_owner || 'Unassigned'}</span>
        </div>
        <div class="flex items-center gap-1">
          <span>⏱️</span>
          <span class="font-semibold ${slaRemaining.isUrgent ? 'text-red-600' : 'text-slate-600'}">
            ${slaRemaining.display}
          </span>
        </div>
      </div>

      <!-- Actions Preview -->
      <div class="flex items-center justify-between">
        <div class="text-xs text-slate-500">
          ${card.suggested_actions?.length || 0} suggested action${(card.suggested_actions?.length || 0) !== 1 ? 's' : ''}
        </div>
        <div class="flex gap-2">
          <button onclick="event.stopPropagation(); viewDecisionChain('${card.card_id}')"
                  class="px-3 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200">
            View Chain →
          </button>
          <button onclick="event.stopPropagation(); takeAction('${card.card_id}')"
                  class="px-3 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded">
            Take Action
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * 计算 SLA 剩余时间
 * @param {Object} card - 决策卡片
 * @returns {Object} { hours, display, isUrgent }
 */
function calculateSLARemaining(card) {
  const now = new Date();
  const cardTime = new Date(card.timestamp);
  const slaHours = card.sla_hours || 48;

  const elapsedMs = now - cardTime;
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  const remainingHours = Math.max(0, slaHours - elapsedHours);

  let display;
  if (remainingHours < 1) {
    display = `${Math.round(remainingHours * 60)}min remaining`;
  } else if (remainingHours < 24) {
    display = `${Math.round(remainingHours)}h remaining`;
  } else {
    display = `${Math.round(remainingHours / 24)}d remaining`;
  }

  return {
    hours: remainingHours,
    display,
    isUrgent: remainingHours < 12
  };
}

/**
 * 渲染空收件箱
 */
function renderEmptyInbox() {
  return `
    <div class="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-8 mb-6 text-center">
      <div class="text-6xl mb-4">✨</div>
      <div class="text-lg font-bold text-green-900 mb-2">Decision Inbox is Clear</div>
      <div class="text-sm text-green-700">
        All metrics are within target ranges and data confidence is high.
        The system will automatically route new decisions here when attention is needed.
      </div>
    </div>
  `;
}

/**
 * 展开决策卡片详情
 * @param {string} cardId - 卡片 ID
 */
function expandDecisionCard(cardId) {
  console.log(`[Decision Inbox] Expanding card: ${cardId}`);

  // Find the card
  const cards = window.commandCenterState?.latestDecisionCards || [];
  const card = cards.find(c => c.card_id === cardId);

  if (!card) {
    showNotification('❌ Decision card not found', 'error');
    return;
  }

  // Render modal
  const modal = document.createElement('div');
  modal.id = 'decisionCardModal';
  modal.className = 'fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4';
  modal.onclick = (e) => {
    if (e.target === modal) closeDecisionCardModal();
  };

  const priorityConfig = {
    high: { icon: '🚨', color: 'red', label: 'HIGH PRIORITY' },
    medium: { icon: '⚠️', color: 'yellow', label: 'MEDIUM PRIORITY' },
    low: { icon: 'ℹ️', color: 'blue', label: 'LOW PRIORITY' }
  };
  const config = priorityConfig[card.priority] || priorityConfig.medium;

  modal.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
      <!-- Header -->
      <div class="bg-gradient-to-r from-${config.color}-600 to-${config.color}-700 px-6 py-4 text-white">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-3xl">${config.icon}</span>
            <div>
              <div class="text-xs font-semibold text-${config.color}-100">${config.label}</div>
              <div class="text-lg font-bold">${card.title}</div>
            </div>
          </div>
          <button onclick="closeDecisionCardModal()" class="text-white hover:bg-white/20 rounded-lg p-2">
            <span class="text-2xl">×</span>
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-6">
        <!-- Impact Statement -->
        <div class="mb-6">
          <div class="text-sm font-bold text-slate-700 mb-2">Impact</div>
          <div class="text-base text-slate-900">${card.impact_statement || card.description}</div>
        </div>

        <!-- Owner & SLA -->
        <div class="grid grid-cols-2 gap-4 mb-6">
          <div class="bg-slate-50 border rounded-lg p-4">
            <div class="text-xs text-slate-600 mb-1">Decision Owner</div>
            <div class="text-lg font-bold text-slate-900">${card.decision_owner || 'Unassigned'}</div>
          </div>
          <div class="bg-slate-50 border rounded-lg p-4">
            <div class="text-xs text-slate-600 mb-1">SLA</div>
            <div class="text-lg font-bold text-slate-900">${card.sla_hours || 48}h</div>
          </div>
        </div>

        <!-- Confidence -->
        <div class="mb-6">
          <div class="text-sm font-bold text-slate-700 mb-2">Data Confidence</div>
          <div class="bg-slate-50 border rounded-lg p-4">
            <div class="flex items-center justify-between mb-2">
              <div class="text-base font-semibold">${card.confidence?.display || '🟡 Medium Confidence'}</div>
            </div>
            <div class="text-xs text-slate-600">
              Data age: ${card.confidence?.details?.age_hours || 0}h ·
              Coverage: ${card.confidence?.details?.coverage_pct || 0}% ·
              Status: ${card.confidence?.details?.reconciliation_status || 'unknown'}
            </div>
          </div>
        </div>

        <!-- Suggested Actions -->
        <div>
          <div class="text-sm font-bold text-slate-700 mb-3">Suggested Actions</div>
          <div class="space-y-3">
            ${(card.suggested_actions || []).map((action, idx) => `
              <div class="border-2 border-slate-200 rounded-lg p-4">
                <div class="flex items-start justify-between mb-2">
                  <div class="flex-1">
                    <div class="font-semibold text-slate-900 mb-1">${idx + 1}. ${action.label}</div>
                    ${action.estimated_time_minutes ?
                      `<div class="text-xs text-slate-600">⏱️ Est. time: ${action.estimated_time_minutes} min</div>` : ''}
                    ${action.estimated_cost_usd ?
                      `<div class="text-xs text-slate-600">💰 Est. cost: $${action.estimated_cost_usd.toLocaleString()}</div>` : ''}
                    ${action.requires_approval ?
                      `<div class="text-xs text-amber-700 font-semibold">✋ Requires approval: ${action.requires_approval}</div>` : ''}
                  </div>
                </div>
                <div class="flex gap-2 mt-3">
                  <button onclick="executeAction('${action.action_id}', '${card.card_id}')"
                          class="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded hover:bg-blue-700">
                    ${action.requires_approval ? 'Request Approval' : 'Execute'}
                  </button>
                  ${action.next_metrics && action.next_metrics.length > 0 ?
                    `<button onclick="viewRelatedMetrics('${JSON.stringify(action.next_metrics).replace(/"/g, '&quot;')}')"
                            class="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-semibold rounded hover:bg-slate-200">
                      View Related Metrics
                    </button>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

/**
 * 关闭决策卡片模态框
 */
function closeDecisionCardModal() {
  const modal = document.getElementById('decisionCardModal');
  if (modal) modal.remove();
}

/**
 * 查看决策链路
 * @param {string} cardId - 卡片 ID
 */
function viewDecisionChain(cardId) {
  console.log(`[Decision Inbox] Viewing decision chain for: ${cardId}`);
  showNotification('📊 Decision Chain widget coming soon!', 'info');
  // TODO: Integrate with decision_chain_widget.js
}

/**
 * 采取行动
 * @param {string} cardId - 卡片 ID
 */
function takeAction(cardId) {
  console.log(`[Decision Inbox] Taking action on: ${cardId}`);
  expandDecisionCard(cardId);
}

/**
 * 查看相关指标
 * @param {string} metricsJson - JSON string of metric IDs
 */
function viewRelatedMetrics(metricsJson) {
  const metrics = JSON.parse(metricsJson);
  console.log(`[Decision Inbox] Viewing related metrics:`, metrics);
  showNotification(`🔍 Navigating to: ${metrics.join(', ')}`, 'info');
  // TODO: Implement navigation to metric detail views
}

// ========================================
// 导出
// ========================================
if (typeof window !== 'undefined') {
  window.renderDecisionInbox = renderDecisionInbox;
  window.renderDecisionCard = renderDecisionCard;
  window.expandDecisionCard = expandDecisionCard;
  window.closeDecisionCardModal = closeDecisionCardModal;
  window.viewDecisionChain = viewDecisionChain;
  window.takeAction = takeAction;
  window.viewRelatedMetrics = viewRelatedMetrics;
  window.calculateSLARemaining = calculateSLARemaining;
}
