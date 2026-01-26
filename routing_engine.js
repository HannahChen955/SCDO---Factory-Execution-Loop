// ========================================
// ROUTING ENGINE v0.1
// 决策路由引擎 - 评估规则并生成决策卡片
// ========================================

/**
 * 核心路由评估函数
 * @param {Object} metricsSnapshot - 指标快照
 * @param {Object} context - 上下文信息（日期、爬坡天数等）
 * @returns {Array} 决策卡片数组
 */
function evaluateRoutingRules(metricsSnapshot, context = {}) {
  const decisionCards = [];

  // 1. 计算所有指标的置信度
  const confidenceResults = calculateBatchConfidence(metricsSnapshot);

  // 2. 遍历所有启用的路由规则
  for (const rule of ROUTING_RULES_CONFIG.rules) {
    if (!rule.enabled) continue;

    const metricId = rule.trigger.metric;
    const metric = metricsSnapshot[metricId];

    if (!metric) continue;

    // 3. 检查置信度要求
    const confidence = confidenceResults[metricId];
    if (!meetsConfidenceRequirement(confidence, rule.trigger.confidence_required)) {
      console.log(`[Routing] Skipping rule ${rule.rule_id}: confidence too low (${confidence.level} < ${rule.trigger.confidence_required})`);
      continue;
    }

    // 4. 检查豁免条件
    if (checkExemptions(rule, context)) {
      console.log(`[Routing] Skipping rule ${rule.rule_id}: exemption condition met`);
      continue;
    }

    // 5. 评估触发条件
    if (evaluateCondition(rule.trigger.condition, metric, context)) {
      console.log(`[Routing] Rule ${rule.rule_id} triggered for metric ${metricId}`);

      // 6. 生成决策卡片
      const card = createDecisionCard(rule, metric, confidence, context);
      decisionCards.push(card);
    }
  }

  // 7. 按优先级排序
  decisionCards.sort((a, b) => {
    const priorityOrder = { high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return decisionCards;
}

/**
 * 评估条件表达式
 * @param {string} conditionString - 条件字符串（如 "value < REF(...)"）
 * @param {Object} metric - 指标数据
 * @param {Object} context - 上下文
 * @returns {boolean}
 */
function evaluateCondition(conditionString, metric, context) {
  try {
    // 解析 REF() 引用
    let resolvedCondition = conditionString;

    // 替换 REF() 引用为实际值
    const refMatches = conditionString.matchAll(/REF\(([^)]+)\)/g);
    for (const match of refMatches) {
      const refPath = match[1];
      const resolvedValue = resolveMetricReference(`REF(${refPath})`);
      resolvedCondition = resolvedCondition.replace(match[0], resolvedValue);
    }

    // 替换变量
    resolvedCondition = resolvedCondition
      .replace(/\bvalue\b/g, metric.value !== undefined ? metric.value : 0)
      .replace(/\butilization\b/g, metric.utilization !== undefined ? metric.utilization : 0)
      .replace(/\bdays_cover\b/g, metric.days_cover !== undefined ? metric.days_cover : 0)
      .replace(/\bage_hours\b/g, metric.age_hours !== undefined ? metric.age_hours : 0);

    // 评估表达式
    // eslint-disable-next-line no-eval
    const result = eval(resolvedCondition);
    return !!result;

  } catch (error) {
    console.error(`[Routing] Failed to evaluate condition: ${conditionString}`, error);
    return false;
  }
}

/**
 * 创建决策卡片
 * @param {Object} rule - 路由规则
 * @param {Object} metric - 指标数据
 * @param {Object} confidence - 置信度结果
 * @param {Object} context - 上下文
 * @returns {Object} 决策卡片
 */
function createDecisionCard(rule, metric, confidence, context) {
  const template = rule.action.card_template;
  const ownership = getDecisionOwner(rule.trigger.metric);

  // 展开模板变量
  const expandedCard = {
    card_id: `${rule.rule_id}_${Date.now()}`,
    rule_id: rule.rule_id,
    metric_id: rule.trigger.metric,
    priority: rule.action.priority,
    confidence: confidence,
    timestamp: new Date().toISOString(),

    // 基本信息
    title: template.title,
    description: expandTemplate(template.description_template, metric, context),
    impact_statement: expandTemplate(template.impact_statement_template, metric, context),

    // 建议行动
    suggested_actions: template.suggested_actions.map(action => ({
      ...action,
      label: expandTemplate(action.label, metric, context)
    })),

    // 责任人信息
    decision_owner: ownership ? ownership.primary_owner : "Unknown",
    escalation_path: ownership ? ownership.escalation_path : [],
    sla_hours: ownership ? ownership.sla_hours : 24,
    requires_approval: ownership ? ownership.requires_approval : false,

    // 原始数据
    metric_value: metric.value,
    metric_data: metric
  };

  return expandedCard;
}

/**
 * 展开模板字符串
 * @param {string} template - 模板字符串
 * @param {Object} metric - 指标数据
 * @param {Object} context - 上下文
 * @returns {string}
 */
function expandTemplate(template, metric, context) {
  if (!template) return '';

  let expanded = template;

  // 替换基础变量
  expanded = expanded
    .replace(/{value}/g, formatMetricValue(metric.value))
    .replace(/{threshold}/g, formatMetricValue(metric.threshold))
    .replace(/{utilization}/g, formatMetricValue(metric.utilization))
    .replace(/{days_cover}/g, metric.days_cover || 0)
    .replace(/{age_hours}/g, metric.age_hours || 0);

  // 替换衍生变量
  if (metric.gap_qty !== undefined) {
    expanded = expanded.replace(/{gap_qty}/g, metric.gap_qty);
  }
  if (metric.affected_customers) {
    expanded = expanded.replace(/{affected_customers}/g, metric.affected_customers.join(', '));
  }
  if (metric.delay_days !== undefined) {
    expanded = expanded.replace(/{delay_days}/g, metric.delay_days);
  }
  if (metric.at_risk_orders !== undefined) {
    expanded = expanded.replace(/{at_risk_orders}/g, metric.at_risk_orders);
  }
  if (metric.late_orders !== undefined) {
    expanded = expanded.replace(/{late_orders}/g, metric.late_orders);
  }
  if (metric.extra_cost_usd !== undefined) {
    expanded = expanded.replace(/{extra_cost_usd}/g, metric.extra_cost_usd.toLocaleString());
  }
  if (metric.cost_breakdown) {
    expanded = expanded.replace(/{cost_breakdown}/g, metric.cost_breakdown);
  }
  if (metric.shortage_components) {
    expanded = expanded.replace(/{shortage_components}/g, metric.shortage_components.join(', '));
  }
  if (metric.affected_lines) {
    expanded = expanded.replace(/{affected_lines}/g, metric.affected_lines.join(', '));
  }
  if (metric.scrap_qty !== undefined) {
    expanded = expanded.replace(/{scrap_qty}/g, metric.scrap_qty);
  }
  if (metric.scrap_cost_usd !== undefined) {
    expanded = expanded.replace(/{scrap_cost_usd}/g, metric.scrap_cost_usd.toLocaleString());
  }
  if (metric.stale_tables) {
    expanded = expanded.replace(/{stale_tables}/g, metric.stale_tables.join(', '));
  }
  if (metric.affected_metrics) {
    expanded = expanded.replace(/{affected_metrics}/g, metric.affected_metrics.join(', '));
  }

  return expanded;
}

/**
 * 格式化指标值
 * @param {number} value
 * @returns {string}
 */
function formatMetricValue(value) {
  if (value === undefined || value === null) return 'N/A';
  if (value >= 0 && value <= 1) {
    return (value * 100).toFixed(1); // 百分比
  }
  return value.toFixed(1);
}

/**
 * 执行决策行动
 * @param {string} actionId - 行动 ID
 * @param {Object} cardData - 决策卡片数据
 */
function executeAction(actionId, cardData) {
  console.log(`[Routing] Executing action: ${actionId}`, cardData);

  // 查找行动定义
  const action = cardData.suggested_actions.find(a => a.action_id === actionId);
  if (!action) {
    showNotification(`❌ Action ${actionId} not found`, 'error');
    return;
  }

  // 处理自动通知
  if (action.auto_notify) {
    showNotification(`📧 Auto-notifying ${cardData.decision_owner}...`, 'info');
    setTimeout(() => {
      showNotification(`✅ Notification sent to ${cardData.decision_owner}`, 'success');
    }, 1000);
    return;
  }

  // 处理自动执行
  if (action.auto_execute) {
    showNotification(`⚙️ Auto-executing ${action.label}...`, 'info');
    setTimeout(() => {
      showNotification(`✅ ${action.label} completed`, 'success');
    }, 1500);
    return;
  }

  // 处理需要批准的行动
  if (action.requires_approval) {
    const confirmed = confirm(`此操作需要 ${action.requires_approval} 批准。\n\n${action.label}\n\n是否提交审批？`);
    if (confirmed) {
      showNotification(`📋 Approval request sent to ${action.requires_approval}`, 'info');
    }
    return;
  }

  // 处理跳转到其他指标
  if (action.next_metrics && action.next_metrics.length > 0) {
    showNotification(`🔍 Navigating to related metrics: ${action.next_metrics.join(', ')}`, 'info');
    // 实际实现中应跳转到指标详情页
    return;
  }

  // 默认处理
  showNotification(`✅ Action logged: ${action.label}`, 'success');
}

/**
 * 生成路由报告
 * @param {Array} decisionCards - 决策卡片数组
 * @returns {Object} 报告摘要
 */
function generateRoutingReport(decisionCards) {
  const report = {
    total_cards: decisionCards.length,
    high_priority: decisionCards.filter(c => c.priority === 'high').length,
    medium_priority: decisionCards.filter(c => c.priority === 'medium').length,
    low_priority: decisionCards.filter(c => c.priority === 'low').length,
    by_metric: {}
  };

  for (const card of decisionCards) {
    if (!report.by_metric[card.metric_id]) {
      report.by_metric[card.metric_id] = 0;
    }
    report.by_metric[card.metric_id]++;
  }

  return report;
}

// ========================================
// 导出
// ========================================
if (typeof window !== 'undefined') {
  window.evaluateRoutingRules = evaluateRoutingRules;
  window.evaluateCondition = evaluateCondition;
  window.createDecisionCard = createDecisionCard;
  window.expandTemplate = expandTemplate;
  window.executeAction = executeAction;
  window.generateRoutingReport = generateRoutingReport;
}
