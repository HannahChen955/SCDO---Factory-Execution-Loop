// ========================================
// METRIC DICTIONARY v0.1
// FDOS 指标字典 - 完整元数据定义
// ========================================

const METRIC_DICTIONARY = {
  version: "0.1.0",
  last_updated: "2026-01-23",

  // ========================================
  // 核心设计原则
  // ========================================
  design_principles: {
    principle_1: "RYG 用于路由决策，不用于评分 - 颜色代表需要关注的程度，不代表表现好坏",
    principle_2: "无行动则无红/黄 - 没有可执行动作的指标不触发警告",
    principle_3: "指标驱动决策，不只是展示 - 每个指标必须明确关联到具体决策场景",
    principle_4: "系统默认 + 版本化覆盖 - 所有阈值可追溯、可审计"
  },

  // ========================================
  // 指标定义 (Batch A: 8 个核心指标)
  // ========================================
  metrics: {

    // ============================================================
    // OUTCOME METRICS (结果类指标) - 3 个
    // ============================================================

    mps_attainment: {
      // === 基础标识 ===
      id: "mps_attainment",
      name: "MPS Attainment",
      display_name: "主计划达成率",
      aliases: ["Plan Attainment", "计划完成率", "Production Achievement"],

      // === 业务上下文 ===
      plain_language: "本周实际产出与主生产计划目标的比值，反映工厂是否按计划交付",
      why_it_matters: "直接决定能否兑现对客户的承诺，影响客户满意度和订单延迟风险",
      decision_usage: [
        "识别产能缺口，触发加班或外包决策",
        "提前预警交付风险，调整客户沟通策略",
        "评估是否需要紧急采购物料或增加产线"
      ],

      // === 系统字段 ===
      metric_type: "outcome",
      grain: "weekly",

      calculation: {
        formula: "SUM(actual_output_weekly) / SUM(mps_plan_weekly)",
        notes: "actual_output = raw_output × output_factors (day1: 0.5, day2: 1.0, day3+: 1.0)",
        proxy_warning: null
      },

      data_contract: {
        source_tables: ["production_output_daily", "mps_plan_weekly"],
        required_fields: ["date", "program_id", "site_id", "actual_qty", "plan_qty"],
        update_frequency: "daily_at_08:00",
        sla_hours: 24
      },

      // === 阈值与路由 ===
      thresholds: {
        system_defaults: {
          green_min: 0.95,
          yellow_min: 0.85,
          red_below: 0.85
        },
        version_history: [
          {
            version: "v1.0",
            effective_from: "2026-01-01",
            approved_by: "Planning Manager",
            audit_log_id: "threshold_init_20260101",
            values: { green_min: 0.95, yellow_min: 0.85, red_below: 0.85 }
          }
        ]
      },

      routing_rules: [
        {
          rule_id: "R001_MPS_LOW",
          condition: "value < REF(mps_attainment.thresholds.red_below)",
          action: "create_decision_card",
          priority: "high"
        }
      ],

      // === 依赖关系 ===
      interdependency_links: {
        upstream_drivers: [
          {
            metric_id: "ctb",
            relationship: "物料短缺直接限制产出，CTB 不足导致 MPS Attainment 下降"
          },
          {
            metric_id: "capacity",
            relationship: "产能不足导致计划无法完成，影响 MPS Attainment"
          },
          {
            metric_id: "yield",
            relationship: "良率下降增加达成难度，需要更多投入才能达成计划"
          }
        ],
        downstream_impacts: [
          {
            metric_id: "service_level",
            relationship: "计划未达成导致服务水平下降，订单延迟风险增加"
          },
          {
            metric_id: "cost_risk",
            relationship: "需要加班或空运弥补缺口，制造成本上升"
          }
        ]
      },

      // === 展示配置 ===
      display_config: {
        chart_type: "trend_line",
        format: "percentage",
        decimal_places: 1,
        show_in_command_center: true,
        glossary_terms: ["MPS", "Output Factors", "Workday"]
      }
    },

    service_level: {
      id: "service_level",
      name: "Service Level",
      display_name: "服务水平",
      aliases: ["On-Time Delivery", "准时交付率", "OTIF"],

      plain_language: "承诺交付日期内按时出货的订单比例，衡量对客户承诺的兑现能力",
      why_it_matters: "直接影响客户满意度和长期合作关系，是供应链绩效的核心指标",
      decision_usage: [
        "识别即将延迟的订单，提前通知客户并调整预期",
        "评估是否需要空运或加急处理",
        "触发与客户服务团队的协调会议"
      ],

      metric_type: "outcome",
      grain: "weekly",

      calculation: {
        formula: "on_time_shipments / total_committed_shipments",
        notes: "使用 shipment_ready_date (output_date + 2 Working Days) 与 commit_date 比较",
        proxy_warning: "v0 版本假设所有产出均在 +2WD 后可发货，实际可能受物流和质检影响"
      },

      data_contract: {
        source_tables: ["shipment_readiness_daily", "customer_commitments"],
        required_fields: ["commit_date", "shipment_ready_date", "order_id", "qty"],
        update_frequency: "daily_at_10:00",
        sla_hours: 24
      },

      thresholds: {
        system_defaults: {
          green_min: 0.95,
          yellow_min: 0.90,
          red_below: 0.90
        },
        version_history: [
          {
            version: "v1.0",
            effective_from: "2026-01-01",
            approved_by: "Supply Chain Manager",
            audit_log_id: "threshold_init_20260101",
            values: { green_min: 0.95, yellow_min: 0.90, red_below: 0.90 }
          }
        ]
      },

      routing_rules: [
        {
          rule_id: "R002_SERVICE_LEVEL_YELLOW",
          condition: "value < REF(service_level.thresholds.yellow_min) AND value >= REF(service_level.thresholds.red_below)",
          action: "create_decision_card",
          priority: "medium"
        },
        {
          rule_id: "R003_SERVICE_LEVEL_RED",
          condition: "value < REF(service_level.thresholds.red_below)",
          action: "create_decision_card",
          priority: "high"
        }
      ],

      interdependency_links: {
        upstream_drivers: [
          {
            metric_id: "mps_attainment",
            relationship: "计划未达成直接导致服务水平下降"
          },
          {
            metric_id: "shipment_readiness",
            relationship: "出货就绪度低会影响服务水平"
          }
        ],
        downstream_impacts: [
          {
            metric_id: "cost_risk",
            relationship: "服务水平低可能触发空运等高成本补救措施"
          }
        ]
      },

      display_config: {
        chart_type: "trend_line",
        format: "percentage",
        decimal_places: 1,
        show_in_command_center: true,
        glossary_terms: ["Service Level", "Shipment Ready Date", "Commit Date"]
      }
    },

    cost_risk: {
      id: "cost_risk",
      name: "Manufacturing Cost Risk",
      display_name: "制造成本风险",
      aliases: ["Cost Variance", "成本偏差", "Budget Risk"],

      plain_language: "由于加班、空运、废料等异常情况导致的额外成本风险",
      why_it_matters: "控制预算，避免因救火式操作导致成本失控",
      decision_usage: [
        "评估是否批准加班或空运请求",
        "识别成本异常，触发根因分析",
        "调整未来计划以避免类似成本风险"
      ],

      metric_type: "outcome",
      grain: "weekly",

      calculation: {
        formula: "SUM(extra_cost_items) / baseline_budget",
        notes: "extra_cost_items 包括：加班工资、空运费用、废料损失、紧急采购溢价",
        proxy_warning: "v0 版本仅计算直接可见成本，未包含机会成本和长期影响"
      },

      data_contract: {
        source_tables: ["cost_tracking_daily", "budget_baseline"],
        required_fields: ["date", "cost_category", "amount", "budget_baseline"],
        update_frequency: "daily_at_18:00",
        sla_hours: 48
      },

      thresholds: {
        system_defaults: {
          green_max: 0.05,
          yellow_max: 0.10,
          red_above: 0.10
        },
        version_history: [
          {
            version: "v1.0",
            effective_from: "2026-01-01",
            approved_by: "Finance Manager",
            audit_log_id: "threshold_init_20260101",
            values: { green_max: 0.05, yellow_max: 0.10, red_above: 0.10 }
          }
        ]
      },

      routing_rules: [
        {
          rule_id: "R004_COST_RISK_HIGH",
          condition: "value > REF(cost_risk.thresholds.red_above)",
          action: "create_decision_card",
          priority: "high"
        }
      ],

      interdependency_links: {
        upstream_drivers: [
          {
            metric_id: "mps_attainment",
            relationship: "计划未达成导致加班和空运，推高成本"
          },
          {
            metric_id: "yield",
            relationship: "良率低导致废料增加，成本上升"
          }
        ],
        downstream_impacts: []
      },

      display_config: {
        chart_type: "bar",
        format: "percentage",
        decimal_places: 1,
        show_in_command_center: true,
        glossary_terms: ["Cost Risk", "Baseline Budget", "Extra Cost"]
      }
    },

    // ============================================================
    // DRIVER METRICS (驱动因素指标) - 4 个
    // ============================================================

    ctb: {
      id: "ctb",
      name: "CTB (Components to Build)",
      display_name: "物料可用性",
      aliases: ["Material Availability", "零件供应", "Component Supply"],

      plain_language: "当日可用于生产的物料数量，直接限制当日最大产出",
      why_it_matters: "物料短缺是生产中断的首要原因，必须提前识别和解决",
      decision_usage: [
        "触发紧急采购或调拨决策",
        "调整生产计划，优先使用有料的产线",
        "与供应商协调加急交付"
      ],

      metric_type: "driver",
      grain: "daily",

      calculation: {
        formula: "MIN(available_qty_per_component)",
        notes: "取所有关键零件的最小可用量作为 CTB 约束",
        proxy_warning: null
      },

      data_contract: {
        source_tables: ["material_inventory_daily", "bom"],
        required_fields: ["date", "component_id", "available_qty", "required_qty_per_unit"],
        update_frequency: "daily_at_06:00",
        sla_hours: 12
      },

      thresholds: {
        system_defaults: {
          green_min_days_cover: 3,
          yellow_min_days_cover: 1,
          red_below_days_cover: 1
        },
        version_history: [
          {
            version: "v1.0",
            effective_from: "2026-01-01",
            approved_by: "Materials Manager",
            audit_log_id: "threshold_init_20260101",
            values: { green_min_days_cover: 3, yellow_min_days_cover: 1, red_below_days_cover: 1 }
          }
        ]
      },

      routing_rules: [
        {
          rule_id: "R005_CTB_LOW",
          condition: "days_cover < REF(ctb.thresholds.red_below_days_cover)",
          action: "create_decision_card",
          priority: "high"
        }
      ],

      interdependency_links: {
        upstream_drivers: [],
        downstream_impacts: [
          {
            metric_id: "mps_attainment",
            relationship: "CTB 不足直接限制产出，导致计划无法完成"
          },
          {
            metric_id: "capacity",
            relationship: "即使有产能，CTB 不足也无法生产"
          }
        ]
      },

      display_config: {
        chart_type: "bar",
        format: "number",
        decimal_places: 0,
        show_in_command_center: true,
        glossary_terms: ["CTB", "Days Cover", "BOM"]
      }
    },

    capacity: {
      id: "capacity",
      name: "Capacity",
      display_name: "产能可用性",
      aliases: ["Production Capacity", "生产能力", "Line Availability"],

      plain_language: "考虑工作时间、爬坡因子、良率后的实际可用产能",
      why_it_matters: "产能不足是无法完成计划的根本原因之一，需要提前规划",
      decision_usage: [
        "评估是否需要加班或增开产线",
        "调整排产优先级，优先高价值订单",
        "识别产能瓶颈，触发长期产能规划"
      ],

      metric_type: "driver",
      grain: "daily",

      calculation: {
        formula: "SUM(shift_hours × base_uph × uph_ramp_factor × yield_ramp_factor)",
        notes: "按产线-班次聚合，考虑爬坡和良率影响",
        proxy_warning: null
      },

      data_contract: {
        source_tables: ["capacity_units", "calendar_workdays", "ramp_curves"],
        required_fields: ["date", "unit_id", "shift_hours", "base_uph", "uph_factor", "yield_factor"],
        update_frequency: "daily_at_06:00",
        sla_hours: 12
      },

      thresholds: {
        system_defaults: {
          green_min_utilization: 0.70,
          yellow_min_utilization: 0.85,
          red_above_utilization: 0.95
        },
        version_history: [
          {
            version: "v1.0",
            effective_from: "2026-01-01",
            approved_by: "Production Manager",
            audit_log_id: "threshold_init_20260101",
            values: { green_min_utilization: 0.70, yellow_min_utilization: 0.85, red_above_utilization: 0.95 }
          }
        ]
      },

      routing_rules: [
        {
          rule_id: "R006_CAPACITY_CONSTRAINED",
          condition: "utilization > REF(capacity.thresholds.red_above_utilization)",
          action: "create_decision_card",
          priority: "medium"
        }
      ],

      interdependency_links: {
        upstream_drivers: [],
        downstream_impacts: [
          {
            metric_id: "mps_attainment",
            relationship: "产能不足导致计划无法完成"
          }
        ]
      },

      display_config: {
        chart_type: "area",
        format: "number",
        decimal_places: 0,
        show_in_command_center: true,
        glossary_terms: ["Capacity", "UPH", "Ramp Factor", "Utilization"]
      }
    },

    yield: {
      id: "yield",
      name: "Yield",
      display_name: "良率",
      aliases: ["First Pass Yield", "FPY", "良品率"],

      plain_language: "一次通过检验的产品比例，反映生产质量稳定性",
      why_it_matters: "良率下降导致浪费增加、成本上升、交付延迟",
      decision_usage: [
        "触发质量问题根因分析",
        "评估是否需要停线检修",
        "调整生产计划以弥补良率损失"
      ],

      metric_type: "driver",
      grain: "daily",

      calculation: {
        formula: "good_units / total_units_produced",
        notes: "考虑爬坡期间的良率曲线",
        proxy_warning: null
      },

      data_contract: {
        source_tables: ["quality_inspection_daily", "production_output_daily"],
        required_fields: ["date", "line_id", "good_qty", "total_qty"],
        update_frequency: "daily_at_20:00",
        sla_hours: 24
      },

      thresholds: {
        system_defaults: {
          green_min: 0.95,
          yellow_min: 0.90,
          red_below: 0.90
        },
        version_history: [
          {
            version: "v1.0",
            effective_from: "2026-01-01",
            approved_by: "Quality Manager",
            audit_log_id: "threshold_init_20260101",
            values: { green_min: 0.95, yellow_min: 0.90, red_below: 0.90 }
          }
        ]
      },

      routing_rules: [
        {
          rule_id: "R007_YIELD_LOW",
          condition: "value < REF(yield.thresholds.red_below)",
          action: "create_decision_card",
          priority: "high"
        }
      ],

      interdependency_links: {
        upstream_drivers: [],
        downstream_impacts: [
          {
            metric_id: "mps_attainment",
            relationship: "良率下降导致实际可用产出减少"
          },
          {
            metric_id: "cost_risk",
            relationship: "良率低导致废料增加，成本上升"
          }
        ]
      },

      display_config: {
        chart_type: "trend_line",
        format: "percentage",
        decimal_places: 1,
        show_in_command_center: true,
        glossary_terms: ["Yield", "FPY", "Ramp Curve"]
      }
    },

    shipment_readiness: {
      id: "shipment_readiness",
      name: "Shipment Readiness",
      display_name: "出货就绪度",
      aliases: ["Ready to Ship", "可发货数量", "Shippable Inventory"],

      plain_language: "产出日期 + 2 个工作日后可发货的数量，反映实际交付能力",
      why_it_matters: "即使生产完成，也需要时间进行包装、质检、入库才能发货",
      decision_usage: [
        "识别即将延迟的订单，提前通知客户",
        "评估是否需要加急后段流程",
        "调整发货优先级"
      ],

      metric_type: "driver",
      grain: "daily",

      calculation: {
        formula: "production_output(date - 2 Working Days)",
        notes: "将产出日期向前推 2 个工作日得到发货就绪日期",
        proxy_warning: null
      },

      data_contract: {
        source_tables: ["production_output_daily", "calendar_workdays"],
        required_fields: ["output_date", "qty", "shipment_ready_date"],
        update_frequency: "daily_at_08:00",
        sla_hours: 24
      },

      thresholds: {
        system_defaults: {
          green_min_days_cover: 5,
          yellow_min_days_cover: 2,
          red_below_days_cover: 2
        },
        version_history: [
          {
            version: "v1.0",
            effective_from: "2026-01-01",
            approved_by: "Logistics Manager",
            audit_log_id: "threshold_init_20260101",
            values: { green_min_days_cover: 5, yellow_min_days_cover: 2, red_below_days_cover: 2 }
          }
        ]
      },

      routing_rules: [
        {
          rule_id: "R008_SHIPMENT_AT_RISK",
          condition: "days_cover < REF(shipment_readiness.thresholds.red_below_days_cover)",
          action: "create_decision_card",
          priority: "medium"
        }
      ],

      interdependency_links: {
        upstream_drivers: [
          {
            metric_id: "mps_attainment",
            relationship: "计划未达成导致出货就绪度下降"
          }
        ],
        downstream_impacts: [
          {
            metric_id: "service_level",
            relationship: "出货就绪度低直接影响服务水平"
          }
        ]
      },

      display_config: {
        chart_type: "bar",
        format: "number",
        decimal_places: 0,
        show_in_command_center: true,
        glossary_terms: ["Shipment Readiness", "Shipment Lag", "Working Days"]
      }
    },

    // ============================================================
    // EVIDENCE METRICS (证据类指标) - 1 个
    // ============================================================

    data_freshness: {
      id: "data_freshness",
      name: "Data Freshness",
      display_name: "数据新鲜度",
      aliases: ["Data Age", "数据时效性", "Update Timeliness"],

      plain_language: "关键数据表的最后更新时间，反映数据质量和系统健康度",
      why_it_matters: "过期数据会导致错误决策，必须确保数据及时更新",
      decision_usage: [
        "识别数据管道故障，触发系统检查",
        "降低基于低质量数据的决策置信度",
        "通知数据工程团队修复问题"
      ],

      metric_type: "evidence",
      grain: "realtime",

      calculation: {
        formula: "NOW() - last_update_timestamp",
        notes: "按数据表聚合，计算最大延迟时间",
        proxy_warning: null
      },

      data_contract: {
        source_tables: ["system_metadata"],
        required_fields: ["table_name", "last_update_timestamp", "expected_update_frequency"],
        update_frequency: "realtime",
        sla_hours: 1
      },

      thresholds: {
        system_defaults: {
          green_max_hours: 24,
          yellow_max_hours: 48,
          red_above_hours: 48
        },
        version_history: [
          {
            version: "v1.0",
            effective_from: "2026-01-01",
            approved_by: "Data Engineering Manager",
            audit_log_id: "threshold_init_20260101",
            values: { green_max_hours: 24, yellow_max_hours: 48, red_above_hours: 48 }
          }
        ]
      },

      routing_rules: [
        {
          rule_id: "R009_DATA_STALE",
          condition: "age_hours > REF(data_freshness.thresholds.red_above_hours)",
          action: "create_decision_card",
          priority: "high"
        }
      ],

      interdependency_links: {
        upstream_drivers: [],
        downstream_impacts: [
          {
            metric_id: "ALL",
            relationship: "数据过期会影响所有其他指标的置信度"
          }
        ]
      },

      display_config: {
        chart_type: "status_indicator",
        format: "hours",
        decimal_places: 1,
        show_in_command_center: true,
        glossary_terms: ["Data Freshness", "SLA", "Data Pipeline"]
      }
    }
  }
};

// ========================================
// 辅助函数
// ========================================

// 通过 ID 获取指标定义
function getMetricById(metricId) {
  return METRIC_DICTIONARY.metrics[metricId] || null;
}

// 按类型获取指标列表
function getMetricsByType(type) {
  return Object.values(METRIC_DICTIONARY.metrics).filter(m => m.metric_type === type);
}

// 获取指标的当前阈值
function getMetricThresholds(metricId) {
  const metric = getMetricById(metricId);
  if (!metric) return null;
  return metric.thresholds.system_defaults;
}

// 解析 REF() 引用
function resolveMetricReference(refString) {
  // 示例: "REF(mps_attainment.thresholds.red_below)" -> 0.85
  const match = refString.match(/REF\(([^)]+)\)/);
  if (!match) return null;

  const path = match[1].split('.');
  let current = METRIC_DICTIONARY.metrics;

  for (const key of path) {
    if (current[key] === undefined) return null;
    current = current[key];
  }

  return current;
}

// 导出
if (typeof window !== 'undefined') {
  window.METRIC_DICTIONARY = METRIC_DICTIONARY;
  window.getMetricById = getMetricById;
  window.getMetricsByType = getMetricsByType;
  window.getMetricThresholds = getMetricThresholds;
  window.resolveMetricReference = resolveMetricReference;
}
