// ========================================
// COMMAND CENTER MOCK DATA
// Weekly Commit Brief - Facts, drivers, and decisions
// ========================================

// Function to generate Command Center data for a specific product
function getCommandCenterData(productId) {
  const productConfigs = {
    'A': {
      program_name: "Product A",
      week_id: "2026-W04",
      demand_units: 95000,
      capacity_units: 102400,
      ctb_units: 88000,
      planned_input_units: 88000,
      expected_output_units: 86392,
      deliverable_ship_units: 84500,
      gap_units: -10500,
      gap_pct: -11.1,
      primary_limiter: "ctb",
      launch_date: "2026-04-01",
      scenario: "Material shortage at WF site"
    },
    'B': {
      program_name: "Product B",
      week_id: "2026-W04",
      demand_units: 50000,
      capacity_units: 55000,
      ctb_units: 52000,
      planned_input_units: 52000,
      expected_output_units: 40000,
      deliverable_ship_units: 38200,
      gap_units: -11800,
      gap_pct: -23.6,
      primary_limiter: "yield",
      launch_date: "2026-05-15",
      scenario: "Demand softness + overbuild risk"
    },
    'C': {
      program_name: "Product C",
      week_id: "2026-W05",
      demand_units: 75000,
      capacity_units: 72000,
      ctb_units: 76000,
      planned_input_units: 72000,
      expected_output_units: 69480,
      deliverable_ship_units: 68000,
      gap_units: -7000,
      gap_pct: -9.3,
      primary_limiter: "capacity",
      launch_date: "2026-03-20",
      scenario: "Capacity constraint + line changeover"
    },
    'D': {
      program_name: "Product D",
      week_id: "2026-W04",
      demand_units: 60000,
      capacity_units: 65000,
      ctb_units: 62000,
      planned_input_units: 62000,
      expected_output_units: 55800,
      deliverable_ship_units: 53200,
      gap_units: -6800,
      gap_pct: -11.3,
      primary_limiter: "capacity",
      launch_date: "2026-06-01",
      scenario: "Labor shortage impacting output"
    }
  };

  const config = productConfigs[productId] || productConfigs['A'];

  return {
    // Program Timeline (auto-detects current stage based on today's date)
    program_timeline: {
      program_id: `product_${productId.toLowerCase()}`,
      program_name: config.program_name,
      timezone: "Asia/Shanghai",
      stages: [
        {
          id: "proto",
          label: "Proto",
          start: "2025-08-05",
          end: "2025-09-20",
          milestone: "Proto build complete"
        },
        {
          id: "evt",
          label: "EVT",
          start: "2025-09-23",
          end: "2025-11-08",
          milestone: "EVT validation pass"
        },
        {
          id: "dvt",
          label: "DVT",
          start: "2025-08-20",
          end: "2025-10-30",
          milestone: "DVT builds complete"
        },
        {
          id: "pvt",
          label: "PVT",
          start: "2025-11-01",
          end: "2025-11-30",
          milestone: "PVT readiness & pilot"
        },
        {
          id: "ramp",
          label: "Ramp",
          start: "2025-12-01",
          end: "2026-03-31",
          milestone: "Ramp to steady-state"
        },
        {
          id: "launch",
          label: "Launch",
          start: config.launch_date,
          end: "2026-04-15",
          milestone: "Launch window"
        },
        {
          id: "eol",
          label: "EOL",
          start: "2027-11-29",
          end: "2027-12-10",
          milestone: "End of Life"
        }
      ],
      // Auto-calculated summary (will be computed based on today's date)
      getCurrentSummary() {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        let currentStage = null;
        let nextStage = null;

        for (let i = 0; i < this.stages.length; i++) {
          const stage = this.stages[i];
          if (todayStr >= stage.start && todayStr <= stage.end) {
            currentStage = stage;
            nextStage = this.stages[i + 1] || null;
            break;
          } else if (todayStr < stage.start && !currentStage) {
            nextStage = stage;
            break;
          }
        }

        // If past all stages
        if (!currentStage && todayStr > this.stages[this.stages.length - 1].end) {
          currentStage = this.stages[this.stages.length - 1];
        }

        const launchStage = this.stages.find(s => s.id === 'launch');
        const eolStage = this.stages.find(s => s.id === 'eol');

        return {
          current_phase: currentStage ? currentStage.label : 'Not Started',
          current_phase_id: currentStage ? currentStage.id : null,
          next_gate: nextStage ? nextStage.label + ' build readiness' : 'Program Complete',
          next_gate_date: nextStage ? nextStage.start : null,
          launch_target_date: launchStage ? launchStage.start : null,
          eol_target_date: eolStage ? eolStage.start : null
        };
      }
    },

    // Weekly Commit Snapshot (This Week)
    weekly_snapshot: {
      week_id: config.week_id,
      cut_off_time: "2026-01-24 08:00",
      demand_units: config.demand_units,
      commit_units: config.demand_units,
      capacity_units: config.capacity_units,
      ctb_units: config.ctb_units,
      planned_input_units: config.planned_input_units,
      expected_output_units: config.expected_output_units,
      deliverable_ship_units: config.deliverable_ship_units,
      gap_units: config.gap_units,
      gap_pct: config.gap_pct,
      primary_limiter: config.primary_limiter
    },

    // Site Execution Snapshot - varies by product
    site_snapshots: productId === 'B' ? [
      {
        site_id: "VN",
        site_name: "VN-02 (Vietnam)",
        lines_running: "2 lines",
        shifts_running: "2 shifts (Day + Night)",
        ctb_units: 52000,
        ctb_coverage_pct: 100,
        input_units: 52000,
        output_units: 40000,
        deliverable_ship_units: 38200,
        local_limiter_text: "Demand softness - freeze new releases",
        owner_role: "Planning",
        sla_hours: 24
      }
    ] : productId === 'C' ? [
      {
        site_id: "WF",
        site_name: "WF (China)",
        lines_running: "2 lines",
        shifts_running: "2 shifts (Day + Night)",
        ctb_units: 76000,
        ctb_coverage_pct: 100,
        input_units: 72000,
        output_units: 69480,
        deliverable_ship_units: 68000,
        local_limiter_text: "Line changeover window limited (72h constraint)",
        owner_role: "Factory Ops",
        sla_hours: 24
      }
    ] : productId === 'D' ? [
      {
        site_id: "SZ",
        site_name: "SZ-01 (China)",
        lines_running: "3 lines",
        shifts_running: "2 shifts (Day + Night)",
        ctb_units: 62000,
        ctb_coverage_pct: 100,
        input_units: 62000,
        output_units: 55800,
        deliverable_ship_units: 53200,
        local_limiter_text: "Labor shortage -18% vs plan + absenteeism spike",
        owner_role: "HR + Factory Ops",
        sla_hours: 48
      }
    ] : [
      {
        site_id: "WF",
        site_name: "WF (China)",
        lines_running: "3 lines",
        shifts_running: "2 shifts (Day + Night)",
        ctb_units: 58000,
        ctb_coverage_pct: 87,
        input_units: 58000,
        output_units: 56840,
        deliverable_ship_units: 55600,
        local_limiter_text: "CTB shortage on 3 days (Oct 12-14)",
        owner_role: "MO",
        sla_hours: 24
      },
      {
        site_id: "VN02",
        site_name: "VN-02 (Vietnam)",
        lines_running: "1 line",
        shifts_running: "2 shifts (Day + Night)",
        ctb_units: 30000,
        ctb_coverage_pct: 100,
        input_units: 30000,
        output_units: 29552,
        deliverable_ship_units: 28900,
        local_limiter_text: "Yield drift at Test station (FPY: 94.2% vs target 95.9%)",
        owner_role: "Quality Team",
        sla_hours: 48
      }
    ],

    // Gap Decomposition - varies by product
    gap_decomposition: productId === 'B' ? [
      {
        driver_id: "demand_soft",
        driver_label: "Demand forecast down-rev",
        impact_units: -7500,
        explanation: "Demand forecast down -15% for W05-W08"
      },
      {
        driver_id: "yield_loss",
        driver_label: "Yield loss (vs target)",
        impact_units: -4300,
        explanation: "Yield below target at VN site"
      }
    ] : productId === 'C' ? [
      {
        driver_id: "capacity_constraint",
        driver_label: "Capacity constraint",
        impact_units: -4200,
        explanation: "Line 2 at 95% utilization; changeover window limited"
      },
      {
        driver_id: "changeover_loss",
        driver_label: "Line changeover time",
        impact_units: -2800,
        explanation: "72-hour changeover window constraint"
      }
    ] : productId === 'D' ? [
      {
        driver_id: "labor_shortage",
        driver_label: "Labor shortage impact",
        impact_units: -4800,
        explanation: "Labor shortage -18% vs plan (820 vs 1000 headcount)"
      },
      {
        driver_id: "training_lag",
        driver_label: "New hire training lag",
        impact_units: -2000,
        explanation: "New hire productivity 65% vs 85% target"
      }
    ] : [
      {
        driver_id: "ctb_shortage",
        driver_label: "CTB-limited input loss",
        impact_units: -6400,
        explanation: "Material shortage primarily at WF site Oct 12-14"
      },
      {
        driver_id: "yield_loss",
        driver_label: "Yield loss (vs target 95.9%)",
        impact_units: -2900,
        explanation: "Test station FPY drift at VN02 (94.2% actual)"
      },
      {
        driver_id: "ship_lag",
        driver_label: "Ship readiness lag",
        impact_units: -1200,
        explanation: "Packing queue buildup +2WD assumption"
      }
    ],

    // Decisions Needed - varies by product
    decision_queue: productId === 'B' ? [
      {
        decision_id: "dec_b_001",
        decision_text: "Freeze new releases for 7 days",
        why_now: "Demand forecast down-rev -15%; avoid overbuild liability",
        owner_role: "Planning",
        sla_hours: 12,
        options: [
          { label: "Approve", action_type: "approve", link: "#" },
          { label: "Defer", action_type: "defer", link: "#" }
        ],
        evidence_links: [
          { label: "Demand trend", link: "#demand-view" },
          { label: "Inventory status", link: "#inventory" }
        ]
      }
    ] : productId === 'C' ? [
      {
        decision_id: "dec_c_001",
        decision_text: "Lock line changeover plan",
        why_now: "72-hour window critical; delays cascade to W06",
        owner_role: "Factory Ops",
        sla_hours: 24,
        options: [
          { label: "Approve", action_type: "approve", link: "#" },
          { label: "View alternatives", action_type: "view_details", link: "#" }
        ],
        evidence_links: [
          { label: "Changeover plan", link: "#changeover" },
          { label: "Capacity view", link: "#capacity" }
        ]
      }
    ] : productId === 'D' ? [
      {
        decision_id: "dec_d_001",
        decision_text: "Expedite temporary labor staffing",
        why_now: "Current headcount 820 vs 1000 target; 6.8k units at risk",
        owner_role: "HR + Factory Ops",
        sla_hours: 48,
        options: [
          { label: "Approve", action_type: "approve", link: "#" },
          { label: "Evaluate alternatives", action_type: "view_details", link: "#" }
        ],
        evidence_links: [
          { label: "Labor status", link: "#labor" },
          { label: "Temp agency capacity", link: "#staffing" }
        ]
      }
    ] : [
      {
        decision_id: "dec_001",
        decision_text: "Approve weekend retest shift at VN02",
        why_now: "Closes ~2,800 units of yield gap by recovering marginal units",
        owner_role: "MO",
        sla_hours: 24,
        options: [
          { label: "Approve", action_type: "approve", link: "#" },
          { label: "Reject", action_type: "reject", link: "#" }
        ],
        evidence_links: [
          { label: "Yield trend", link: "#yield-view" },
          { label: "Test station log", link: "#test-log" },
          { label: "Cost impact", link: "#cost-analysis" }
        ]
      },
      {
        decision_id: "dec_002",
        decision_text: "Expedite CTB shipment for WF (Oct 12-14 coverage)",
        why_now: "Closes 6,400 units gap; CTB shortage is primary limiter",
        owner_role: "SCM Team",
        sla_hours: 12,
        options: [
          { label: "Expedite", action_type: "approve", link: "#" },
          { label: "View alternatives", action_type: "view_details", link: "#ctb-alternatives" }
        ],
        evidence_links: [
          { label: "CTB daily table", link: "#ctb-view" },
          { label: "Supplier lead time", link: "#supplier-status" }
        ]
      }
    ],

    // Evidence Links (Simple entry points)
    evidence_links: [
      {
        label: "Production Plan (detailed table)",
        icon: "📊",
        link: "#production-plan-latest"
      },
      {
        label: "CTB Daily View",
        icon: "📦",
        link: "#ctb-daily-view"
      },
      {
        label: "Yield & Quality Metrics",
        icon: "📈",
        link: "#yield-quality-view"
      },
      {
        label: "Shipment Readiness",
        icon: "🚚",
        link: "#shipment-readiness"
      }
    ]
  };
}

// Default data for backward compatibility
const COMMAND_CENTER_DATA = getCommandCenterData('A');

// Helper function to get timeline status for each stage
function getTimelineStageStatus(stage, currentPhaseId) {
  const today = new Date().toISOString().split('T')[0];

  if (today > stage.end) {
    return 'done';
  } else if (stage.id === currentPhaseId) {
    return 'current';
  } else if (today < stage.start) {
    // Check if it's the immediate next stage
    const summary = COMMAND_CENTER_DATA.program_timeline.getCurrentSummary();
    if (summary.next_gate && summary.next_gate.includes(stage.label)) {
      return 'next';
    }
    return 'planned';
  }
  return 'planned';
}

// Export for use
if (typeof window !== 'undefined') {
  window.COMMAND_CENTER_DATA = COMMAND_CENTER_DATA;
  window.getCommandCenterData = getCommandCenterData;
  window.getTimelineStageStatus = getTimelineStageStatus;
}
