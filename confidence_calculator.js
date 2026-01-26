// ========================================
// CONFIDENCE CALCULATOR v0.1
// 数据置信度计算 - 分段规则（非公式化）
// ========================================

const CONFIDENCE_RULES = {
  version: "0.1.0",
  last_updated: "2026-01-23",
  calculation_method: "band_based", // 非公式化，使用分段判断

  // ========================================
  // 置信度分段定义
  // ========================================
  bands: {
    HIGH: {
      label: "High Confidence",
      display: "🟢 High Confidence",
      color: "green",
      conditions: {
        data_age_hours_max: 24,
        coverage_pct_min: 95,
        reconciliation_status_allowed: ["matched"]
      },
      action_policy: "可用于所有决策路由和自动化"
    },

    MEDIUM: {
      label: "Medium Confidence",
      display: "🟡 Medium Confidence",
      color: "yellow",
      conditions: {
        data_age_hours_max: 72,
        coverage_pct_min: 80,
        reconciliation_status_allowed: ["matched", "minor_diff"]
      },
      action_policy: "可用于决策路由，但需人工复核"
    },

    LOW: {
      label: "Low Confidence",
      display: "🔴 Low Confidence - Review Data",
      color: "red",
      conditions: {
        // 任何一项不满足 MEDIUM 条件即为 LOW
        data_age_hours_max: null,  // 超过 72 小时
        coverage_pct_min: null,    // 低于 80%
        reconciliation_status_allowed: ["major_diff", "no_reconciliation"]
      },
      action_policy: "不触发自动路由，仅显示数据质量警告",
      action_required: true
    }
  },

  // ========================================
  // 未来演进计划
  // ========================================
  future_evolution: [
    {
      version: "v1.0",
      planned_for: "Batch B",
      improvement: "加入加权公式计算：0.5×freshness + 0.3×coverage + 0.2×reconciliation"
    },
    {
      version: "v2.0",
      planned_for: "Batch C",
      improvement: "基于历史准确率的动态权重调整，自学习最优置信度模型"
    }
  ]
};

// ========================================
// 核心计算函数
// ========================================

/**
 * 计算数据置信度
 * @param {string} metricId - 指标 ID
 * @param {Object} dataSnapshot - 数据快照
 * @param {number} dataSnapshot.age_hours - 数据年龄（小时）
 * @param {number} dataSnapshot.coverage_pct - 数据覆盖率（百分比）
 * @param {string} dataSnapshot.reconciliation_status - 对账状态
 * @returns {Object} 置信度结果
 */
function calculateConfidence(metricId, dataSnapshot) {
  const { age_hours, coverage_pct, reconciliation_status } = dataSnapshot;

  // 分段判断逻辑
  const highBand = CONFIDENCE_RULES.bands.HIGH.conditions;
  const mediumBand = CONFIDENCE_RULES.bands.MEDIUM.conditions;

  // 检查 HIGH 条件
  if (
    age_hours <= highBand.data_age_hours_max &&
    coverage_pct >= highBand.coverage_pct_min &&
    highBand.reconciliation_status_allowed.includes(reconciliation_status)
  ) {
    return {
      level: "HIGH",
      display: CONFIDENCE_RULES.bands.HIGH.display,
      color: CONFIDENCE_RULES.bands.HIGH.color,
      action_policy: CONFIDENCE_RULES.bands.HIGH.action_policy,
      details: {
        age_hours,
        coverage_pct,
        reconciliation_status
      }
    };
  }

  // 检查 MEDIUM 条件
  if (
    age_hours <= mediumBand.data_age_hours_max &&
    coverage_pct >= mediumBand.coverage_pct_min &&
    mediumBand.reconciliation_status_allowed.includes(reconciliation_status)
  ) {
    return {
      level: "MEDIUM",
      display: CONFIDENCE_RULES.bands.MEDIUM.display,
      color: CONFIDENCE_RULES.bands.MEDIUM.color,
      action_policy: CONFIDENCE_RULES.bands.MEDIUM.action_policy,
      details: {
        age_hours,
        coverage_pct,
        reconciliation_status
      }
    };
  }

  // 默认 LOW
  return {
    level: "LOW",
    display: CONFIDENCE_RULES.bands.LOW.display,
    color: CONFIDENCE_RULES.bands.LOW.color,
    action_policy: CONFIDENCE_RULES.bands.LOW.action_policy,
    action_required: true,
    warning: "数据质量不足，不建议用于决策路由",
    details: {
      age_hours,
      coverage_pct,
      reconciliation_status,
      issues: identifyConfidenceIssues(age_hours, coverage_pct, reconciliation_status)
    }
  };
}

/**
 * 识别置信度问题
 * @private
 */
function identifyConfidenceIssues(age_hours, coverage_pct, reconciliation_status) {
  const issues = [];

  const mediumBand = CONFIDENCE_RULES.bands.MEDIUM.conditions;

  if (age_hours > mediumBand.data_age_hours_max) {
    issues.push(`数据过期（${age_hours} 小时，超过 ${mediumBand.data_age_hours_max} 小时阈值）`);
  }

  if (coverage_pct < mediumBand.coverage_pct_min) {
    issues.push(`数据覆盖率不足（${coverage_pct}%，低于 ${mediumBand.coverage_pct_min}% 阈值）`);
  }

  if (!mediumBand.reconciliation_status_allowed.includes(reconciliation_status)) {
    issues.push(`对账状态异常（${reconciliation_status}）`);
  }

  return issues;
}

/**
 * 批量计算多个指标的置信度
 * @param {Object} metricsSnapshot - 多个指标的数据快照
 * @returns {Object} 置信度结果映射
 */
function calculateBatchConfidence(metricsSnapshot) {
  const results = {};

  for (const [metricId, snapshot] of Object.entries(metricsSnapshot)) {
    if (snapshot.data_snapshot) {
      results[metricId] = calculateConfidence(metricId, snapshot.data_snapshot);
    }
  }

  return results;
}

/**
 * 检查置信度是否满足路由要求
 * @param {Object} confidence - 置信度结果
 * @param {string} requiredLevel - 要求的最低置信度级别
 * @returns {boolean}
 */
function meetsConfidenceRequirement(confidence, requiredLevel) {
  const levels = { HIGH: 3, MEDIUM: 2, LOW: 1 };
  return levels[confidence.level] >= levels[requiredLevel];
}

/**
 * 生成置信度报告
 * @param {Object} confidenceResults - 置信度结果映射
 * @returns {Object} 报告摘要
 */
function generateConfidenceReport(confidenceResults) {
  const summary = {
    total_metrics: 0,
    high_confidence: 0,
    medium_confidence: 0,
    low_confidence: 0,
    action_required: []
  };

  for (const [metricId, result] of Object.entries(confidenceResults)) {
    summary.total_metrics++;

    if (result.level === "HIGH") summary.high_confidence++;
    else if (result.level === "MEDIUM") summary.medium_confidence++;
    else if (result.level === "LOW") {
      summary.low_confidence++;
      summary.action_required.push({
        metric_id: metricId,
        issues: result.details.issues
      });
    }
  }

  return summary;
}

// ========================================
// 辅助函数
// ========================================

/**
 * 获取置信度颜色（用于 UI 渲染）
 */
function getConfidenceBadgeClass(confidenceLevel) {
  const classMap = {
    HIGH: "bg-green-100 text-green-700 border-green-300",
    MEDIUM: "bg-yellow-100 text-yellow-700 border-yellow-300",
    LOW: "bg-red-100 text-red-700 border-red-300"
  };
  return classMap[confidenceLevel] || classMap.LOW;
}

/**
 * 创建模拟数据快照（用于测试）
 */
function createMockDataSnapshot(scenario = "normal") {
  const scenarios = {
    normal: {
      age_hours: 12,
      coverage_pct: 98,
      reconciliation_status: "matched"
    },
    stale: {
      age_hours: 80,
      coverage_pct: 95,
      reconciliation_status: "matched"
    },
    incomplete: {
      age_hours: 6,
      coverage_pct: 75,
      reconciliation_status: "matched"
    },
    unreconciled: {
      age_hours: 10,
      coverage_pct: 92,
      reconciliation_status: "major_diff"
    }
  };

  return scenarios[scenario] || scenarios.normal;
}

// ========================================
// 导出
// ========================================
if (typeof window !== 'undefined') {
  window.CONFIDENCE_RULES = CONFIDENCE_RULES;
  window.calculateConfidence = calculateConfidence;
  window.calculateBatchConfidence = calculateBatchConfidence;
  window.meetsConfidenceRequirement = meetsConfidenceRequirement;
  window.generateConfidenceReport = generateConfidenceReport;
  window.getConfidenceBadgeClass = getConfidenceBadgeClass;
  window.createMockDataSnapshot = createMockDataSnapshot;
}
