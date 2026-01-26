// ========================================
// ROUTING RULES CONFIGURATION v0.1
// Decision Routing Rules - Config-driven Exception Detection and Action Recommendations
// ========================================

const ROUTING_RULES_CONFIG = {
  version: "0.1.0",
  last_updated: "2026-01-23",

  // ========================================
  // Decision Ownership Mapping
  // ========================================
  decision_ownership: {
    mps_attainment: {
      primary_owner: "Planning Manager",
      escalation_path: ["Production Director", "VP Operations"],
      sla_hours: 24,
      requires_approval: false
    },
    service_level: {
      primary_owner: "Supply Chain Manager",
      escalation_path: ["Customer Service Director", "VP Operations"],
      sla_hours: 48,
      requires_approval: true
    },
    cost_risk: {
      primary_owner: "Finance Manager",
      escalation_path: ["CFO"],
      sla_hours: 72,
      requires_approval: true
    },
    ctb: {
      primary_owner: "Materials Manager",
      escalation_path: ["Procurement Director"],
      sla_hours: 12,
      requires_approval: false
    },
    capacity: {
      primary_owner: "Production Manager",
      escalation_path: ["Production Director"],
      sla_hours: 24,
      requires_approval: false
    },
    yield: {
      primary_owner: "Quality Manager",
      escalation_path: ["Quality Director"],
      sla_hours: 12,
      requires_approval: false
    },
    shipment_readiness: {
      primary_owner: "Logistics Manager",
      escalation_path: ["Supply Chain Manager"],
      sla_hours: 24,
      requires_approval: false
    },
    data_freshness: {
      primary_owner: "Data Engineering Manager",
      escalation_path: ["IT Director"],
      sla_hours: 6,
      requires_approval: false
    }
  },

  // ========================================
  // Routing Rules Definition
  // ========================================
  rules: [
    // ============================================================
    // R001: MPS Attainment below red line
    // ============================================================
    {
      rule_id: "R001_MPS_LOW",
      enabled: true,
      trigger: {
        metric: "mps_attainment",
        condition: "value < REF(mps_attainment.thresholds.red_below)",
        confidence_required: "MEDIUM"
      },
      exemptions: [
        {
          condition: "date in holiday_period",
          reason: "Plan attainment naturally declines during holidays, no warning needed"
        },
        {
          condition: "ramp_day_index < 5",
          reason: "100% attainment not required during first 5 days of ramp-up"
        }
      ],
      action: {
        type: "create_decision_card",
        priority: "high",
        card_template: {
          title: "Plan Attainment Below Target",
          description_template: "This week's MPS Attainment is {value}%, below red line threshold {threshold}%",
          impact_statement_template: "Current gap: {gap_qty} units, affecting customers {affected_customers}, potential {delay_days} day delay",
          suggested_actions: [
            {
              action_id: "review_capacity_constraints",
              label: "Review capacity constraints (CTB, Capacity, Yield)",
              next_metrics: ["ctb", "capacity", "yield"],
              estimated_time_minutes: 30
            },
            {
              action_id: "evaluate_overtime",
              label: "Evaluate overtime options",
              requires_approval: "Production Manager",
              estimated_cost_usd: 5000
            },
            {
              action_id: "notify_customer_service",
              label: "Notify customer service team of risk",
              auto_notify: true
            }
          ]
        }
      }
    },

    // ============================================================
    // R002: Service Level yellow warning
    // ============================================================
    {
      rule_id: "R002_SERVICE_LEVEL_YELLOW",
      enabled: true,
      trigger: {
        metric: "service_level",
        condition: "value < REF(service_level.thresholds.yellow_min) AND value >= REF(service_level.thresholds.red_below)",
        confidence_required: "MEDIUM"
      },
      exemptions: [],
      action: {
        type: "create_decision_card",
        priority: "medium",
        card_template: {
          title: "Service Level Warning",
          description_template: "This week's service level is {value}%, in yellow warning zone",
          impact_statement_template: "{at_risk_orders} orders at risk of delay",
          suggested_actions: [
            {
              action_id: "review_shipment_readiness",
              label: "Review shipment readiness",
              next_metrics: ["shipment_readiness"]
            },
            {
              action_id: "notify_customer_service",
              label: "Notify customer service team to prepare communication",
              auto_notify: true
            }
          ]
        }
      }
    },

    // ============================================================
    // R003: Service Level red alert
    // ============================================================
    {
      rule_id: "R003_SERVICE_LEVEL_RED",
      enabled: true,
      trigger: {
        metric: "service_level",
        condition: "value < REF(service_level.thresholds.red_below)",
        confidence_required: "MEDIUM"
      },
      exemptions: [],
      action: {
        type: "create_decision_card",
        priority: "high",
        card_template: {
          title: "Service Level Critically Below Target",
          description_template: "This week's service level is {value}%, below red line threshold {threshold}%",
          impact_statement_template: "{late_orders} orders confirmed delayed, affecting customers {affected_customers}",
          suggested_actions: [
            {
              action_id: "evaluate_air_freight",
              label: "Evaluate air freight options",
              requires_approval: "Supply Chain Manager",
              estimated_cost_usd: 15000
            },
            {
              action_id: "customer_escalation_meeting",
              label: "Schedule customer coordination meeting",
              requires_approval: "VP Operations"
            }
          ]
        }
      }
    },

    // ============================================================
    // R004: Manufacturing Cost Risk exceeded
    // ============================================================
    {
      rule_id: "R004_COST_RISK_HIGH",
      enabled: true,
      trigger: {
        metric: "cost_risk",
        condition: "value > REF(cost_risk.thresholds.red_above)",
        confidence_required: "MEDIUM"
      },
      exemptions: [
        {
          condition: "week_is_month_end",
          reason: "Cost accounting may be delayed during month-end closing period"
        }
      ],
      action: {
        type: "create_decision_card",
        priority: "high",
        card_template: {
          title: "Manufacturing Cost Risk Exceeded",
          description_template: "This week's extra cost is {value}% of baseline budget, exceeding red line {threshold}%",
          impact_statement_template: "Extra cost: ${extra_cost_usd}, primary sources: {cost_breakdown}",
          suggested_actions: [
            {
              action_id: "root_cause_analysis",
              label: "Conduct root cause analysis for cost anomaly",
              estimated_time_minutes: 60
            },
            {
              action_id: "review_approval_process",
              label: "Review overtime and air freight approval process",
              requires_approval: "Finance Manager"
            }
          ]
        }
      }
    },

    // ============================================================
    // R005: CTB material shortage
    // ============================================================
    {
      rule_id: "R005_CTB_LOW",
      enabled: true,
      trigger: {
        metric: "ctb",
        condition: "days_cover < REF(ctb.thresholds.red_below_days_cover)",
        confidence_required: "HIGH"
      },
      exemptions: [],
      action: {
        type: "create_decision_card",
        priority: "high",
        card_template: {
          title: "Material Shortage Warning",
          description_template: "Material inventory covers only {days_cover} days of production, below red line {threshold} days",
          impact_statement_template: "Shortage components: {shortage_components}, affected lines: {affected_lines}",
          suggested_actions: [
            {
              action_id: "emergency_procurement",
              label: "Initiate emergency procurement",
              requires_approval: "Materials Manager",
              estimated_cost_usd: 3000
            },
            {
              action_id: "cross_site_transfer",
              label: "Transfer materials across sites",
              estimated_time_minutes: 120
            },
            {
              action_id: "adjust_production_schedule",
              label: "Adjust production plan, prioritize lines with materials",
              next_metrics: ["capacity"]
            }
          ]
        }
      }
    },

    // ============================================================
    // R006: Capacity constrained
    // ============================================================
    {
      rule_id: "R006_CAPACITY_CONSTRAINED",
      enabled: true,
      trigger: {
        metric: "capacity",
        condition: "utilization > REF(capacity.thresholds.red_above_utilization)",
        confidence_required: "MEDIUM"
      },
      exemptions: [],
      action: {
        type: "create_decision_card",
        priority: "medium",
        card_template: {
          title: "Capacity Utilization Too High",
          description_template: "Current capacity utilization is {utilization}%, exceeding red line {threshold}%",
          impact_statement_template: "May not handle demand fluctuations, lacking buffer capacity",
          suggested_actions: [
            {
              action_id: "evaluate_overtime",
              label: "Evaluate adding shifts or overtime",
              requires_approval: "Production Manager"
            },
            {
              action_id: "long_term_capacity_planning",
              label: "Trigger long-term capacity planning review",
              estimated_time_minutes: 180
            }
          ]
        }
      }
    },

    // ============================================================
    // R007: Yield below target
    // ============================================================
    {
      rule_id: "R007_YIELD_LOW",
      enabled: true,
      trigger: {
        metric: "yield",
        condition: "value < REF(yield.thresholds.red_below)",
        confidence_required: "MEDIUM"
      },
      exemptions: [
        {
          condition: "ramp_day_index < 10",
          reason: "Yield naturally lower during first 10 days of ramp-up"
        }
      ],
      action: {
        type: "create_decision_card",
        priority: "high",
        card_template: {
          title: "Yield Below Target",
          description_template: "Current yield is {value}%, below red line {threshold}%",
          impact_statement_template: "Scrap loss approximately {scrap_qty} units, extra cost ${scrap_cost_usd}",
          suggested_actions: [
            {
              action_id: "quality_root_cause",
              label: "Conduct quality root cause analysis",
              estimated_time_minutes: 90
            },
            {
              action_id: "evaluate_line_stoppage",
              label: "Evaluate need for line stoppage and maintenance",
              requires_approval: "Quality Manager"
            },
            {
              action_id: "adjust_plan_for_yield_loss",
              label: "Adjust production plan to compensate for yield loss",
              next_metrics: ["mps_attainment"]
            }
          ]
        }
      }
    },

    // ============================================================
    // R008: Shipment Readiness at risk
    // ============================================================
    {
      rule_id: "R008_SHIPMENT_AT_RISK",
      enabled: true,
      trigger: {
        metric: "shipment_readiness",
        condition: "days_cover < REF(shipment_readiness.thresholds.red_below_days_cover)",
        confidence_required: "MEDIUM"
      },
      exemptions: [],
      action: {
        type: "create_decision_card",
        priority: "medium",
        card_template: {
          title: "Shipment Readiness Insufficient",
          description_template: "Shippable inventory covers only {days_cover} days, below red line {threshold} days",
          impact_statement_template: "At-risk orders: {at_risk_orders}, may affect customers {affected_customers}",
          suggested_actions: [
            {
              action_id: "expedite_backend_processes",
              label: "Expedite packaging and QC processes",
              estimated_cost_usd: 2000
            },
            {
              action_id: "notify_customer_service",
              label: "Notify customer service team to prepare explanation",
              auto_notify: true
            }
          ]
        }
      }
    },

    // ============================================================
    // R009: Data Freshness stale data
    // ============================================================
    {
      rule_id: "R009_DATA_STALE",
      enabled: true,
      trigger: {
        metric: "data_freshness",
        condition: "age_hours > REF(data_freshness.thresholds.red_above_hours)",
        confidence_required: "HIGH"
      },
      exemptions: [],
      action: {
        type: "create_decision_card",
        priority: "high",
        card_template: {
          title: "Data Update Delayed",
          description_template: "Critical data tables {stale_tables} not updated for {age_hours} hours",
          impact_statement_template: "Affected metrics: {affected_metrics}, lowering decision confidence",
          suggested_actions: [
            {
              action_id: "check_data_pipeline",
              label: "Check data pipeline status",
              estimated_time_minutes: 30
            },
            {
              action_id: "notify_data_engineering",
              label: "Notify data engineering team for fix",
              auto_notify: true
            },
            {
              action_id: "downgrade_confidence",
              label: "Downgrade related metrics confidence to LOW",
              auto_execute: true
            }
          ]
        }
      }
    }
  ]
};

// ========================================
// Helper Functions
// ========================================

// Get routing rules for a metric
function getRoutingRulesForMetric(metricId) {
  return ROUTING_RULES_CONFIG.rules.filter(rule =>
    rule.enabled && rule.trigger.metric === metricId
  );
}

// Get decision owner information
function getDecisionOwner(metricId) {
  return ROUTING_RULES_CONFIG.decision_ownership[metricId] || null;
}

// Check exemption conditions
function checkExemptions(rule, context) {
  if (!rule.exemptions || rule.exemptions.length === 0) return false;

  return rule.exemptions.some(exemption => {
    return evaluateExemptionCondition(exemption.condition, context);
  });
}

// Evaluate exemption condition (simplified version)
function evaluateExemptionCondition(condition, context) {
  // Example implementation, should dynamically evaluate based on condition type
  if (condition === "date in holiday_period") {
    return context.isHoliday === true;
  }
  if (condition.startsWith("ramp_day_index <")) {
    const threshold = parseInt(condition.split("<")[1].trim());
    return context.ramp_day_index < threshold;
  }
  if (condition === "week_is_month_end") {
    return context.isMonthEnd === true;
  }
  return false;
}

// Export
if (typeof window !== 'undefined') {
  window.ROUTING_RULES_CONFIG = ROUTING_RULES_CONFIG;
  window.getRoutingRulesForMetric = getRoutingRulesForMetric;
  window.getDecisionOwner = getDecisionOwner;
  window.checkExemptions = checkExemptions;
}
