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

  // Country holidays (法定节假日 - statutory holiday periods for 2026)
  countryHolidays: {
    CN: [
      {
        name: '元旦 (New Year)',
        start: '2026-01-01',
        end: '2026-01-03',
        notes: '3-day statutory holiday'
      },
      {
        name: '春节 (Spring Festival)',
        start: '2026-02-15',
        end: '2026-02-23',
        notes: '9-day holiday (includes makeup work days on Feb 14, 21)'
      },
      {
        name: '清明节 (Qingming Festival)',
        start: '2026-04-04',
        end: '2026-04-06',
        notes: '3-day statutory holiday'
      },
      {
        name: '劳动节 (Labor Day)',
        start: '2026-05-01',
        end: '2026-05-05',
        notes: '5-day statutory holiday'
      },
      {
        name: '端午节 (Dragon Boat Festival)',
        start: '2026-06-19',
        end: '2026-06-21',
        notes: '3-day statutory holiday'
      },
      {
        name: '中秋节 (Mid-Autumn Festival)',
        start: '2026-09-25',
        end: '2026-09-27',
        notes: '3-day statutory holiday'
      },
      {
        name: '国庆节 (National Day)',
        start: '2026-10-01',
        end: '2026-10-07',
        notes: '7-day statutory holiday (includes makeup work days on Sep 27, Oct 10)'
      }
    ],
    VN: [
      {
        name: 'Tết Dương lịch (New Year)',
        start: '2026-01-01',
        end: '2026-01-01',
        notes: '1-day holiday'
      },
      {
        name: 'Tết Nguyên Đán (Lunar New Year)',
        start: '2026-02-17',
        end: '2026-02-21',
        notes: '5-day Lunar New Year holiday'
      },
      {
        name: 'Giỗ Tổ Hùng Vương (Hung Kings\' Festival)',
        start: '2026-04-18',
        end: '2026-04-18',
        notes: '1-day holiday'
      },
      {
        name: 'Ngày Thống nhất (Reunification Day)',
        start: '2026-04-30',
        end: '2026-04-30',
        notes: '1-day holiday'
      },
      {
        name: 'Ngày Quốc tế Lao động (International Labor Day)',
        start: '2026-05-01',
        end: '2026-05-01',
        notes: '1-day holiday'
      },
      {
        name: 'Quốc khánh (National Day)',
        start: '2026-09-02',
        end: '2026-09-02',
        notes: '1-day holiday'
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

  // CTB Daily (demonstrates constraint binding in different weeks)
  // 说明:
  // - Oct 1-7: 国庆假期，WF 不工作（CTB 不需要）
  // - Oct 8-11: Week 1 后半段，generous CTB（无约束）
  // - Oct 12-18: Week 2，TIGHT CTB（物料短缺，binding constraint）
  // - Oct 19-25: Week 3-4，正常 CTB
  // - Oct 26-31: Week 5，充足 CTB
  ctbDaily: [
    // ========== WF Site ==========
    // Week 1 (Oct 5-11) - 国庆后开始，generous CTB
    { date: '2026-10-08', program_id: 'product_a', site_id: 'WF', ctb_qty: 3000 },
    { date: '2026-10-09', program_id: 'product_a', site_id: 'WF', ctb_qty: 3000 },
    { date: '2026-10-10', program_id: 'product_a', site_id: 'WF', ctb_qty: 3000 },

    // Week 2 (Oct 12-18) - TIGHT CTB! (物料短缺场景)
    { date: '2026-10-12', program_id: 'product_a', site_id: 'WF', ctb_qty: 1500 },
    { date: '2026-10-13', program_id: 'product_a', site_id: 'WF', ctb_qty: 1500 },
    { date: '2026-10-14', program_id: 'product_a', site_id: 'WF', ctb_qty: 1500 },
    { date: '2026-10-15', program_id: 'product_a', site_id: 'WF', ctb_qty: 1500 },
    { date: '2026-10-16', program_id: 'product_a', site_id: 'WF', ctb_qty: 1500 },
    { date: '2026-10-17', program_id: 'product_a', site_id: 'WF', ctb_qty: 1500 },

    // Week 3 (Oct 19-25) - 恢复正常
    { date: '2026-10-19', program_id: 'product_a', site_id: 'WF', ctb_qty: 4000 },
    { date: '2026-10-20', program_id: 'product_a', site_id: 'WF', ctb_qty: 4000 },
    { date: '2026-10-21', program_id: 'product_a', site_id: 'WF', ctb_qty: 4000 },
    { date: '2026-10-22', program_id: 'product_a', site_id: 'WF', ctb_qty: 4000 },
    { date: '2026-10-23', program_id: 'product_a', site_id: 'WF', ctb_qty: 4000 },
    { date: '2026-10-24', program_id: 'product_a', site_id: 'WF', ctb_qty: 4000 },

    // Week 4-5 (Oct 26-31) - 充足
    { date: '2026-10-26', program_id: 'product_a', site_id: 'WF', ctb_qty: 5000 },
    { date: '2026-10-27', program_id: 'product_a', site_id: 'WF', ctb_qty: 5000 },
    { date: '2026-10-28', program_id: 'product_a', site_id: 'WF', ctb_qty: 5000 },
    { date: '2026-10-29', program_id: 'product_a', site_id: 'WF', ctb_qty: 5000 },
    { date: '2026-10-30', program_id: 'product_a', site_id: 'WF', ctb_qty: 5000 },
    { date: '2026-10-31', program_id: 'product_a', site_id: 'WF', ctb_qty: 5000 },

    // ========== VN02 Site ==========
    // VN02 没有 CTB 约束（物料充足），全月 uncapped
    // Week 1 (Oct 1-4, 没有假期)
    { date: '2026-10-01', program_id: 'product_a', site_id: 'VN02', ctb_qty: 10000 },
    { date: '2026-10-02', program_id: 'product_a', site_id: 'VN02', ctb_qty: 10000 },
    { date: '2026-10-03', program_id: 'product_a', site_id: 'VN02', ctb_qty: 10000 },

    // Week 2 (Oct 5-11)
    { date: '2026-10-05', program_id: 'product_a', site_id: 'VN02', ctb_qty: 10000 },
    { date: '2026-10-06', program_id: 'product_a', site_id: 'VN02', ctb_qty: 10000 },
    { date: '2026-10-08', program_id: 'product_a', site_id: 'VN02', ctb_qty: 10000 },
    { date: '2026-10-09', program_id: 'product_a', site_id: 'VN02', ctb_qty: 10000 },
    { date: '2026-10-10', program_id: 'product_a', site_id: 'VN02', ctb_qty: 10000 },

    // Week 3 (Oct 12-18)
    { date: '2026-10-12', program_id: 'product_a', site_id: 'VN02', ctb_qty: 10000 },
    { date: '2026-10-13', program_id: 'product_a', site_id: 'VN02', ctb_qty: 10000 },
    { date: '2026-10-14', program_id: 'product_a', site_id: 'VN02', ctb_qty: 10000 },
    { date: '2026-10-15', program_id: 'product_a', site_id: 'VN02', ctb_qty: 10000 },
    { date: '2026-10-16', program_id: 'product_a', site_id: 'VN02', ctb_qty: 10000 },
    { date: '2026-10-17', program_id: 'product_a', site_id: 'VN02', ctb_qty: 10000 },

    // Week 4 (Oct 19-25)
    { date: '2026-10-19', program_id: 'product_a', site_id: 'VN02', ctb_qty: 10000 },
    { date: '2026-10-20', program_id: 'product_a', site_id: 'VN02', ctb_qty: 10000 },
    { date: '2026-10-21', program_id: 'product_a', site_id: 'VN02', ctb_qty: 10000 },
    { date: '2026-10-22', program_id: 'product_a', site_id: 'VN02', ctb_qty: 10000 },
    { date: '2026-10-23', program_id: 'product_a', site_id: 'VN02', ctb_qty: 10000 },
    { date: '2026-10-24', program_id: 'product_a', site_id: 'VN02', ctb_qty: 10000 },

    // Week 5 (Oct 26-31)
    { date: '2026-10-26', program_id: 'product_a', site_id: 'VN02', ctb_qty: 10000 },
    { date: '2026-10-27', program_id: 'product_a', site_id: 'VN02', ctb_qty: 10000 },
    { date: '2026-10-28', program_id: 'product_a', site_id: 'VN02', ctb_qty: 10000 },
    { date: '2026-10-29', program_id: 'product_a', site_id: 'VN02', ctb_qty: 10000 },
    { date: '2026-10-30', program_id: 'product_a', site_id: 'VN02', ctb_qty: 10000 },
    { date: '2026-10-31', program_id: 'product_a', site_id: 'VN02', ctb_qty: 10000 }
  ],

  // Weekly demand (Mon-Sat aggregation)
  // 说明:
  // - Week 定义: Sunday 到 Saturday (ISO Week, 但周日-周六聚合)
  // - 2026-W40: Sep 28 (Sun) - Oct 4 (Sat) - 包含 Oct 1-4
  // - 2026-W41: Oct 5 (Sun) - Oct 11 (Sat) - 国庆后第一周，需求低
  // - 2026-W42: Oct 12 (Sun) - Oct 18 (Sat) - 爬坡中，需求增加
  // - 2026-W43: Oct 19 (Sun) - Oct 25 (Sat) - 高峰需求
  // - 2026-W44: Oct 26 (Sun) - Nov 1 (Sat) - 包含 Oct 26-31，高峰需求
  weeklyDemand: [
    {
      week_id: '2026-W40',
      program_id: 'product_a',
      demand_qty: 8000,
      notes: 'Week of Sep 28, partial Oct (only Oct 1-4 working days for VN02)'
    },
    {
      week_id: '2026-W41',
      program_id: 'product_a',
      demand_qty: 12000,
      notes: 'Week of Oct 5 (国庆假期后第一周，WF Oct 8-11 开始爬坡)'
    },
    {
      week_id: '2026-W42',
      program_id: 'product_a',
      demand_qty: 16000,
      notes: 'Week of Oct 12 (WF Night shift 启动，CTB 约束周)'
    },
    {
      week_id: '2026-W43',
      program_id: 'product_a',
      demand_qty: 20000,
      notes: 'Week of Oct 19 (高峰需求，产能逐渐爬升)'
    },
    {
      week_id: '2026-W44',
      program_id: 'product_a',
      demand_qty: 22000,
      notes: 'Week of Oct 26 (包含 Oct 26-31，持续高需求)'
    }
  ]
};

// Export for use
if (typeof window !== 'undefined') {
  window.PRODUCTION_PLAN_SEED_DATA = PRODUCTION_PLAN_SEED_DATA;
}
