// ========================================
// COMMAND CENTER MOCK DATA
// Weekly Commit Brief - Facts, drivers, and decisions
// ========================================

const COMMAND_CENTER_DATA = {
  // Program Timeline (auto-detects current stage based on today's date)
  program_timeline: {
    program_id: "product_a",
    program_name: "Product A",
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
        start: "2026-04-01",
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
    week_id: "2026-W04",
    cut_off_time: "2026-01-24 08:00",
    demand_units: 95000,
    commit_units: 95000,
    capacity_units: 102400,  // Unconstrained capacity
    ctb_units: 88000,  // Clear-to-Build material available
    planned_input_units: 88000,  // min(Capacity, CTB)
    expected_output_units: 86392,  // After yield
    deliverable_ship_units: 84500,  // After +2WD ship readiness
    gap_units: -10500,  // vs Commit
    gap_pct: -11.1,
    primary_limiter: "ctb"  // capacity | ctb | yield | ship
  },

  // Site Execution Snapshot
  site_snapshots: [
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

  // Gap Decomposition (Contribution breakdown)
  gap_decomposition: [
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

  // Decisions Needed (Max 3)
  decision_queue: [
    {
      decision_id: "dec_001",
      decision_text: "Approve weekend retest shift at VN02",
      why_now: "Closes ~2,800 units of yield gap by recovering marginal units",
      owner_role: "MO",
      sla_hours: 24,
      options: [
        {
          label: "Approve",
          action_type: "approve",
          link: "#"
        },
        {
          label: "Reject",
          action_type: "reject",
          link: "#"
        }
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
        {
          label: "Expedite",
          action_type: "approve",
          link: "#"
        },
        {
          label: "View alternatives",
          action_type: "view_details",
          link: "#ctb-alternatives"
        }
      ],
      evidence_links: [
        { label: "CTB daily table", link: "#ctb-view" },
        { label: "Supplier lead time", link: "#supplier-status" }
      ]
    },
    {
      decision_id: "dec_003",
      decision_text: "Add dual-shift packing on Oct 15-17",
      why_now: "Reduces ship lag by 900 units; prioritizes high-priority SKUs",
      owner_role: "Logistics",
      sla_hours: 48,
      options: [
        {
          label: "Approve",
          action_type: "approve",
          link: "#"
        },
        {
          label: "Defer",
          action_type: "defer",
          link: "#"
        }
      ],
      evidence_links: [
        { label: "Packing queue", link: "#packing-status" },
        { label: "SKU priority list", link: "#sku-priority" }
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
  window.getTimelineStageStatus = getTimelineStageStatus;
}
