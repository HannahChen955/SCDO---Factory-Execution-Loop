// ========================================
// PRODUCTION PLAN SEED DATA
// Demonstrates: Day vs Night ramp differences, holidays, CTB constraints, weekly demand
// ========================================

const PRODUCTION_PLAN_SEED_DATA = {
  // Program configuration
  programConfig: {
    program_id: 'product_a',
    program_name: 'Product A',
    default_shift_hours: { DAY: 10, NIGHT: 10 },
    output_factors: { day1: 0.5, day2: 1.0, day3_plus: 1.0 },
    shipment_lag_workdays: 2,
    weekly_window: 'MON_SAT'
  },

  // Sites
  sites: [
    { site_id: 'WF', site_name: 'WF', country: 'CN' },
    { site_id: 'VN02', site_name: 'VN-02', country: 'VN' }
  ],

  // Country holidays (法定节假日 - statutory holiday periods)
  countryHolidays: {
    CN: [
      {
        name: '国庆节 (National Day)',
        start: '2026-10-01',
        end: '2026-10-07',
        notes: '7-day statutory holiday period'
      }
    ],
    VN: [
      {
        name: 'National Day (VN)',
        start: '2026-09-02',
        end: '2026-09-02'
      }
    ]
  },

  // Site calendar overrides
  siteOverrides: [
    {
      site_id: 'WF',
      overrides: [
        {
          date: '2026-10-03',
          is_working_day: true,
          shift_hours_override: { DAY: 12, NIGHT: 10 }
        },
        {
          date: '2026-10-08',
          is_working_day: true  // Work on Saturday after holiday
        }
      ]
    }
  ],

  // Capacity units (Line × Shift)
  // Demonstrates different ramp start dates for Day vs Night shifts
  capacityUnits: [
    // WF Line 1 - Day shift starts Oct 5
    {
      unit_id: 'WF_L1_DAY',
      program_id: 'product_a',
      site_id: 'WF',
      line_id: 'L1',
      line_type: 'AUTO',
      shift_type: 'DAY',
      base_uph: 120,
      shift_hours: 10,
      ramp_start_date: '2026-10-05',
      uph_ramp_curve: {
        length_workdays: 30,
        factors: [
          0.50, 0.55, 0.60, 0.65, 0.70, 0.72, 0.74, 0.76, 0.78, 0.80,
          0.82, 0.84, 0.86, 0.88, 0.90, 0.91, 0.92, 0.93, 0.94, 0.95,
          0.96, 0.97, 0.98, 0.98, 0.99, 0.99, 1.00, 1.00, 1.00, 1.00
        ]
      },
      yield_ramp_curve: {
        length_workdays: 30,
        factors: [
          0.70, 0.72, 0.74, 0.76, 0.78, 0.80, 0.82, 0.84, 0.85, 0.86,
          0.87, 0.88, 0.89, 0.90, 0.91, 0.92, 0.93, 0.94, 0.95, 0.95,
          0.96, 0.96, 0.97, 0.97, 0.98, 0.98, 0.98, 0.98, 0.98, 0.98
        ]
      }
    },

    // WF Line 1 - Night shift starts Oct 12 (week later)
    {
      unit_id: 'WF_L1_NIGHT',
      program_id: 'product_a',
      site_id: 'WF',
      line_id: 'L1',
      line_type: 'AUTO',
      shift_type: 'NIGHT',
      base_uph: 120,
      shift_hours: 10,
      ramp_start_date: '2026-10-12',
      uph_ramp_curve: {
        length_workdays: 30,
        factors: [
          0.50, 0.55, 0.60, 0.65, 0.70, 0.72, 0.74, 0.76, 0.78, 0.80,
          0.82, 0.84, 0.86, 0.88, 0.90, 0.91, 0.92, 0.93, 0.94, 0.95,
          0.96, 0.97, 0.98, 0.98, 0.99, 0.99, 1.00, 1.00, 1.00, 1.00
        ]
      },
      yield_ramp_curve: {
        length_workdays: 30,
        factors: [
          0.70, 0.72, 0.74, 0.76, 0.78, 0.80, 0.82, 0.84, 0.85, 0.86,
          0.87, 0.88, 0.89, 0.90, 0.91, 0.92, 0.93, 0.94, 0.95, 0.95,
          0.96, 0.96, 0.97, 0.97, 0.98, 0.98, 0.98, 0.98, 0.98, 0.98
        ]
      }
    },

    // VN-02 Line 1 - Day shift
    {
      unit_id: 'VN02_L1_DAY',
      program_id: 'product_a',
      site_id: 'VN02',
      line_id: 'L1',
      line_type: 'MANUAL',
      shift_type: 'DAY',
      base_uph: 80,
      shift_hours: 10,
      ramp_start_date: '2026-10-01',
      uph_ramp_curve: {
        length_workdays: 20,
        factors: [
          0.60, 0.65, 0.70, 0.75, 0.80, 0.82, 0.84, 0.86, 0.88, 0.90,
          0.92, 0.94, 0.95, 0.96, 0.97, 0.98, 0.99, 1.00, 1.00, 1.00
        ]
      },
      yield_ramp_curve: {
        length_workdays: 20,
        factors: [
          0.75, 0.77, 0.79, 0.81, 0.83, 0.85, 0.87, 0.88, 0.89, 0.90,
          0.91, 0.92, 0.93, 0.94, 0.95, 0.96, 0.96, 0.97, 0.97, 0.97
        ]
      }
    },

    // VN-02 Line 1 - Night shift
    {
      unit_id: 'VN02_L1_NIGHT',
      program_id: 'product_a',
      site_id: 'VN02',
      line_id: 'L1',
      line_type: 'MANUAL',
      shift_type: 'NIGHT',
      base_uph: 80,
      shift_hours: 10,
      ramp_start_date: '2026-10-08',
      uph_ramp_curve: {
        length_workdays: 20,
        factors: [
          0.60, 0.65, 0.70, 0.75, 0.80, 0.82, 0.84, 0.86, 0.88, 0.90,
          0.92, 0.94, 0.95, 0.96, 0.97, 0.98, 0.99, 1.00, 1.00, 1.00
        ]
      },
      yield_ramp_curve: {
        length_workdays: 20,
        factors: [
          0.75, 0.77, 0.79, 0.81, 0.83, 0.85, 0.87, 0.88, 0.89, 0.90,
          0.91, 0.92, 0.93, 0.94, 0.95, 0.96, 0.96, 0.97, 0.97, 0.97
        ]
      }
    }
  ],

  // CTB Daily (demonstrates constraint binding in week 2-3)
  ctbDaily: [
    // Week 1 - Oct 5-11 (generous CTB)
    { date: '2026-10-05', program_id: 'product_a', site_id: 'WF', ctb_qty: 3000 },
    { date: '2026-10-06', program_id: 'product_a', site_id: 'WF', ctb_qty: 3000 },
    { date: '2026-10-08', program_id: 'product_a', site_id: 'WF', ctb_qty: 3000 },
    { date: '2026-10-09', program_id: 'product_a', site_id: 'WF', ctb_qty: 3000 },
    { date: '2026-10-10', program_id: 'product_a', site_id: 'WF', ctb_qty: 3000 },

    // Week 2 - Oct 12-18 (TIGHT CTB - will bind!)
    { date: '2026-10-12', program_id: 'product_a', site_id: 'WF', ctb_qty: 1500 },
    { date: '2026-10-13', program_id: 'product_a', site_id: 'WF', ctb_qty: 1500 },
    { date: '2026-10-14', program_id: 'product_a', site_id: 'WF', ctb_qty: 1500 },
    { date: '2026-10-15', program_id: 'product_a', site_id: 'WF', ctb_qty: 1500 },
    { date: '2026-10-16', program_id: 'product_a', site_id: 'WF', ctb_qty: 1500 },
    { date: '2026-10-17', program_id: 'product_a', site_id: 'WF', ctb_qty: 1500 },

    // Week 3 - Oct 19-25 (back to normal)
    { date: '2026-10-19', program_id: 'product_a', site_id: 'WF', ctb_qty: 4000 },
    { date: '2026-10-20', program_id: 'product_a', site_id: 'WF', ctb_qty: 4000 },
    { date: '2026-10-21', program_id: 'product_a', site_id: 'WF', ctb_qty: 4000 },
    { date: '2026-10-22', program_id: 'product_a', site_id: 'WF', ctb_qty: 4000 },
    { date: '2026-10-23', program_id: 'product_a', site_id: 'WF', ctb_qty: 4000 },
    { date: '2026-10-24', program_id: 'product_a', site_id: 'WF', ctb_qty: 4000 },

    // VN02 - no CTB constraints (uncapped)
    { date: '2026-10-01', program_id: 'product_a', site_id: 'VN02', ctb_qty: 10000 },
    { date: '2026-10-02', program_id: 'product_a', site_id: 'VN02', ctb_qty: 10000 },
    { date: '2026-10-03', program_id: 'product_a', site_id: 'VN02', ctb_qty: 10000 },
    { date: '2026-10-05', program_id: 'product_a', site_id: 'VN02', ctb_qty: 10000 },
    { date: '2026-10-06', program_id: 'product_a', site_id: 'VN02', ctb_qty: 10000 },
    { date: '2026-10-08', program_id: 'product_a', site_id: 'VN02', ctb_qty: 10000 },
    { date: '2026-10-09', program_id: 'product_a', site_id: 'VN02', ctb_qty: 10000 },
    { date: '2026-10-10', program_id: 'product_a', site_id: 'VN02', ctb_qty: 10000 },
    { date: '2026-10-12', program_id: 'product_a', site_id: 'VN02', ctb_qty: 10000 },
    { date: '2026-10-13', program_id: 'product_a', site_id: 'VN02', ctb_qty: 10000 }
  ],

  // Weekly demand (Mon-Sat aggregation)
  weeklyDemand: [
    { week_id: '2026-W40', program_id: 'product_a', demand_qty: 5000 },  // Week of Sep 28 (partial)
    { week_id: '2026-W41', program_id: 'product_a', demand_qty: 12000 }, // Week of Oct 5
    { week_id: '2026-W42', program_id: 'product_a', demand_qty: 15000 }, // Week of Oct 12
    { week_id: '2026-W43', program_id: 'product_a', demand_qty: 18000 }, // Week of Oct 19
    { week_id: '2026-W44', program_id: 'product_a', demand_qty: 20000 }  // Week of Oct 26
  ]
};

// Export for use
if (typeof window !== 'undefined') {
  window.PRODUCTION_PLAN_SEED_DATA = PRODUCTION_PLAN_SEED_DATA;
}
