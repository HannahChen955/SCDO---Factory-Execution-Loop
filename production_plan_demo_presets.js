// ========================================
// PRODUCTION PLAN DEMO PRESETS
// Multiple demo scenarios for testing different time periods
// ========================================

const PRODUCTION_PLAN_DEMO_PRESETS = {

  // Demo 1: Q4 Ramp-Up (Oct - Dec 2026)
  q4_rampup: {
    name: 'Q4 Ramp-Up (Oct-Dec)',
    description: 'National Day holiday, new product ramp, year-end sprint',
    dateRange: {
      start: '2026-10-01',
      end: '2026-12-27'  // Last Saturday of 2026
    },
    scenario: {
      icon: '🚀',
      highlights: [
        'National Day holiday (Oct 1-7)',
        'New product ramp (30-day curve)',
        'Year-end demand spike',
        'CTB constraints in Week 2-3'
      ]
    },
    // Weekly demand pattern (15 weeks)
    weeklyDemand: [
      { week_id: '2026-W40', demand_qty: 8000, notes: 'Post-holiday ramp-up' },
      { week_id: '2026-W41', demand_qty: 12000, notes: 'Week 1 production start' },
      { week_id: '2026-W42', demand_qty: 16000, notes: 'CTB constraint week' },
      { week_id: '2026-W43', demand_qty: 20000, notes: 'Peak demand' },
      { week_id: '2026-W44', demand_qty: 22000, notes: 'Sustained high demand' },
      { week_id: '2026-W45', demand_qty: 24000, notes: 'November ramp' },
      { week_id: '2026-W46', demand_qty: 25000, notes: 'Peak capacity' },
      { week_id: '2026-W47', demand_qty: 26000, notes: 'Thanksgiving week' },
      { week_id: '2026-W48', demand_qty: 27000, notes: 'Dec start' },
      { week_id: '2026-W49', demand_qty: 28000, notes: 'Year-end push' },
      { week_id: '2026-W50', demand_qty: 30000, notes: 'Christmas prep' },
      { week_id: '2026-W51', demand_qty: 25000, notes: 'Christmas week (reduced)' },
      { week_id: '2026-W52', demand_qty: 15000, notes: 'Year-end (partial)' }
    ],
    // CTB pattern: tight in Oct Week 2-3, generous after
    ctbPattern: 'oct_tight',
    rampStartDates: {
      WF_L1_DAY: '2026-10-08',
      WF_L1_NIGHT: '2026-10-15',
      VN02_L1_DAY: '2026-10-01',
      VN02_L1_NIGHT: '2026-10-08'
    }
  },

  // Demo 2: Q1 Fresh Start (Jan - Mar 2026)
  q1_fresh: {
    name: 'Q1 Fresh Start (Jan-Mar)',
    description: 'New Year, Spring Festival long holiday, post-holiday recovery',
    dateRange: {
      start: '2026-01-01',
      end: '2026-03-28'  // Last Saturday of Q1
    },
    scenario: {
      icon: '🎊',
      highlights: [
        'New Year holiday (Jan 1-3)',
        'Spring Festival (Feb 15-23, 9 days)',
        'Post-CNY recovery ramp',
        'Q1 capacity build-up'
      ]
    },
    weeklyDemand: [
      { week_id: '2026-W01', demand_qty: 5000, notes: 'New Year week (partial)' },
      { week_id: '2026-W02', demand_qty: 10000, notes: 'Jan ramp-up' },
      { week_id: '2026-W03', demand_qty: 12000, notes: 'Steady demand' },
      { week_id: '2026-W04', demand_qty: 14000, notes: 'Pre-CNY build' },
      { week_id: '2026-W05', demand_qty: 8000, notes: 'CNY week (reduced)' },
      { week_id: '2026-W06', demand_qty: 4000, notes: 'CNY holiday (minimal)' },
      { week_id: '2026-W07', demand_qty: 6000, notes: 'CNY holiday (partial)' },
      { week_id: '2026-W08', demand_qty: 10000, notes: 'Post-CNY recovery' },
      { week_id: '2026-W09', demand_qty: 15000, notes: 'Recovery ramp' },
      { week_id: '2026-W10', demand_qty: 18000, notes: 'March demand' },
      { week_id: '2026-W11', demand_qty: 20000, notes: 'Peak recovery' },
      { week_id: '2026-W12', demand_qty: 22000, notes: 'Sustained production' },
      { week_id: '2026-W13', demand_qty: 24000, notes: 'Q1 end (partial)' }
    ],
    ctbPattern: 'cny_recovery',
    rampStartDates: {
      WF_L1_DAY: '2026-01-05',
      WF_L1_NIGHT: '2026-01-12',
      VN02_L1_DAY: '2026-01-01',
      VN02_L1_NIGHT: '2026-01-08'
    }
  },

  // Demo 3: Q2 Steady Production (Apr - Jun 2026)
  q2_steady: {
    name: 'Q2 Steady Production (Apr-Jun)',
    description: 'Stable production period, minimal holidays, consistent output',
    dateRange: {
      start: '2026-04-01',
      end: '2026-06-27'  // Last Saturday of Q2
    },
    scenario: {
      icon: '⚡',
      highlights: [
        'Qingming Festival (Apr 4-6)',
        'Labor Day (May 1-5)',
        'Dragon Boat Festival (Jun 19-21)',
        'Stable capacity, high utilization'
      ]
    },
    weeklyDemand: [
      { week_id: '2026-W14', demand_qty: 24000, notes: 'Q2 start' },
      { week_id: '2026-W15', demand_qty: 22000, notes: 'Qingming week (reduced)' },
      { week_id: '2026-W16', demand_qty: 25000, notes: 'Post-Qingming' },
      { week_id: '2026-W17', demand_qty: 26000, notes: 'April peak' },
      { week_id: '2026-W18', demand_qty: 24000, notes: 'Labor Day week' },
      { week_id: '2026-W19', demand_qty: 27000, notes: 'May production' },
      { week_id: '2026-W20', demand_qty: 28000, notes: 'Peak demand' },
      { week_id: '2026-W21', demand_qty: 28000, notes: 'Sustained high' },
      { week_id: '2026-W22', demand_qty: 29000, notes: 'Max capacity' },
      { week_id: '2026-W23', demand_qty: 27000, notes: 'June start' },
      { week_id: '2026-W24', demand_qty: 25000, notes: 'Dragon Boat prep' },
      { week_id: '2026-W25', demand_qty: 23000, notes: 'Dragon Boat week' },
      { week_id: '2026-W26', demand_qty: 26000, notes: 'Q2 end (partial)' }
    ],
    ctbPattern: 'steady',
    rampStartDates: {
      WF_L1_DAY: '2026-04-01',
      WF_L1_NIGHT: '2026-04-01',  // Already ramped
      VN02_L1_DAY: '2026-04-01',
      VN02_L1_NIGHT: '2026-04-01'
    }
  },

  // Demo 4: Mid-Year Sprint (May - Aug 2026)
  midyear_sprint: {
    name: 'Mid-Year Sprint (May-Aug)',
    description: 'Cross-quarter sprint, summer production, sustained high demand',
    dateRange: {
      start: '2026-05-01',
      end: '2026-08-29'  // Last Saturday of August
    },
    scenario: {
      icon: '🏃',
      highlights: [
        'Labor Day (May 1-5)',
        'Dragon Boat Festival (Jun 19-21)',
        '4-month sustained production',
        'Summer heat challenges'
      ]
    },
    weeklyDemand: [
      { week_id: '2026-W18', demand_qty: 20000, notes: 'Labor Day week' },
      { week_id: '2026-W19', demand_qty: 25000, notes: 'May ramp' },
      { week_id: '2026-W20', demand_qty: 27000, notes: 'Peak demand' },
      { week_id: '2026-W21', demand_qty: 28000, notes: 'Sustained high' },
      { week_id: '2026-W22', demand_qty: 29000, notes: 'Max capacity' },
      { week_id: '2026-W23', demand_qty: 30000, notes: 'June sprint' },
      { week_id: '2026-W24', demand_qty: 28000, notes: 'Dragon Boat prep' },
      { week_id: '2026-W25', demand_qty: 26000, notes: 'Dragon Boat week' },
      { week_id: '2026-W26', demand_qty: 29000, notes: 'Post-holiday' },
      { week_id: '2026-W27', demand_qty: 30000, notes: 'July peak' },
      { week_id: '2026-W28', demand_qty: 31000, notes: 'Summer high' },
      { week_id: '2026-W29', demand_qty: 30000, notes: 'Sustained' },
      { week_id: '2026-W30', demand_qty: 29000, notes: 'August start' },
      { week_id: '2026-W31', demand_qty: 28000, notes: 'Mid-August' },
      { week_id: '2026-W32', demand_qty: 27000, notes: 'August cont.' },
      { week_id: '2026-W33', demand_qty: 26000, notes: 'Late August' },
      { week_id: '2026-W34', demand_qty: 25000, notes: 'Aug end (partial)' }
    ],
    ctbPattern: 'summer_tight',
    rampStartDates: {
      WF_L1_DAY: '2026-05-01',
      WF_L1_NIGHT: '2026-05-01',
      VN02_L1_DAY: '2026-05-01',
      VN02_L1_NIGHT: '2026-05-01'
    }
  },

  // Demo 5: Half-Year View (Mar - Aug 2026)
  halfyear: {
    name: 'Half-Year View (Mar-Aug)',
    description: '6-month comprehensive plan, multi-holiday coverage, long-term view',
    dateRange: {
      start: '2026-03-01',
      end: '2026-08-29'  // Last Saturday of August
    },
    scenario: {
      icon: '📅',
      highlights: [
        'Qingming Festival (Apr 4-6)',
        'Labor Day (May 1-5)',
        'Dragon Boat Festival (Jun 19-21)',
        '6-month comprehensive planning'
      ]
    },
    weeklyDemand: [
      { week_id: '2026-W10', demand_qty: 18000, notes: 'March start' },
      { week_id: '2026-W11', demand_qty: 20000, notes: 'March ramp' },
      { week_id: '2026-W12', demand_qty: 22000, notes: 'March peak' },
      { week_id: '2026-W13', demand_qty: 23000, notes: 'March end' },
      { week_id: '2026-W14', demand_qty: 24000, notes: 'April start' },
      { week_id: '2026-W15', demand_qty: 22000, notes: 'Qingming week' },
      { week_id: '2026-W16', demand_qty: 25000, notes: 'Post-Qingming' },
      { week_id: '2026-W17', demand_qty: 26000, notes: 'April peak' },
      { week_id: '2026-W18', demand_qty: 24000, notes: 'Labor Day week' },
      { week_id: '2026-W19', demand_qty: 27000, notes: 'May production' },
      { week_id: '2026-W20', demand_qty: 28000, notes: 'May peak' },
      { week_id: '2026-W21', demand_qty: 28000, notes: 'Sustained' },
      { week_id: '2026-W22', demand_qty: 29000, notes: 'Max capacity' },
      { week_id: '2026-W23', demand_qty: 30000, notes: 'June sprint' },
      { week_id: '2026-W24', demand_qty: 28000, notes: 'Dragon Boat prep' },
      { week_id: '2026-W25', demand_qty: 26000, notes: 'Dragon Boat week' },
      { week_id: '2026-W26', demand_qty: 29000, notes: 'Post-holiday' },
      { week_id: '2026-W27', demand_qty: 30000, notes: 'July peak' },
      { week_id: '2026-W28', demand_qty: 31000, notes: 'Summer high' },
      { week_id: '2026-W29', demand_qty: 30000, notes: 'Sustained' },
      { week_id: '2026-W30', demand_qty: 29000, notes: 'August start' },
      { week_id: '2026-W31', demand_qty: 28000, notes: 'Mid-August' },
      { week_id: '2026-W32', demand_qty: 27000, notes: 'August cont.' },
      { week_id: '2026-W33', demand_qty: 26000, notes: 'Late August' },
      { week_id: '2026-W34', demand_qty: 25000, notes: 'Aug end (partial)' }
    ],
    ctbPattern: 'longterm',
    rampStartDates: {
      WF_L1_DAY: '2026-03-01',
      WF_L1_NIGHT: '2026-03-08',
      VN02_L1_DAY: '2026-03-01',
      VN02_L1_NIGHT: '2026-03-08'
    }
  }
};

// CTB Patterns Generator
function generateCTBPattern(pattern, startDate, endDate) {
  const ctbData = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Helper: generate dates
  const dates = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    if (dayOfWeek !== 0) { // Skip Sundays
      dates.push(d.toISOString().split('T')[0]);
    }
  }

  // Apply pattern
  dates.forEach((date, idx) => {
    const weekNum = Math.floor(idx / 6);
    let wfQty, vn02Qty;

    switch(pattern) {
      case 'oct_tight':
        // Week 2-3 tight for WF
        wfQty = (weekNum >= 1 && weekNum <= 2) ? 1500 : (weekNum === 0 ? 3000 : 4500);
        vn02Qty = 10000;
        break;

      case 'cny_recovery':
        // CNY weeks (week 5-7) very low, then recover
        wfQty = (weekNum >= 5 && weekNum <= 7) ? 500 : (weekNum < 5 ? 3000 : 4000);
        vn02Qty = (weekNum >= 5 && weekNum <= 7) ? 2000 : 10000;
        break;

      case 'steady':
        // Steady supply
        wfQty = 5000;
        vn02Qty = 10000;
        break;

      case 'summer_tight':
        // Summer material shortage weeks 8-10
        wfQty = (weekNum >= 8 && weekNum <= 10) ? 2000 : 5000;
        vn02Qty = 10000;
        break;

      case 'longterm':
        // Variable pattern over 6 months
        wfQty = (weekNum % 4 === 2) ? 3000 : 5000;  // Every 4th week tight
        vn02Qty = 10000;
        break;

      default:
        wfQty = 5000;
        vn02Qty = 10000;
    }

    ctbData.push(
      { date, program_id: 'product_a', site_id: 'WF', ctb_qty: wfQty },
      { date, program_id: 'product_a', site_id: 'VN02', ctb_qty: vn02Qty }
    );
  });

  return ctbData;
}

// Apply demo preset to seed data
function applyDemoPreset(presetKey) {
  const preset = PRODUCTION_PLAN_DEMO_PRESETS[presetKey];
  if (!preset) {
    console.error('Unknown preset:', presetKey);
    return false;
  }

  // Update weekly demand
  PRODUCTION_PLAN_SEED_DATA.weeklyDemand = preset.weeklyDemand.map(w => ({
    week_id: w.week_id,
    program_id: 'product_a',
    demand_qty: w.demand_qty,
    notes: w.notes
  }));

  // Generate CTB data
  PRODUCTION_PLAN_SEED_DATA.ctbDaily = generateCTBPattern(
    preset.ctbPattern,
    preset.dateRange.start,
    preset.dateRange.end
  );

  // Update ramp start dates
  PRODUCTION_PLAN_SEED_DATA.capacityUnits.forEach(unit => {
    const key = `${unit.site_id}_${unit.line_id}_${unit.shift_type}`;
    if (preset.rampStartDates[key]) {
      unit.ramp_start_date = preset.rampStartDates[key];
    }
  });

  console.log(`✅ Applied demo preset: ${preset.name}`);
  console.log(`  Date range: ${preset.dateRange.start} → ${preset.dateRange.end}`);
  console.log(`  Weekly demand: ${preset.weeklyDemand.length} weeks`);
  console.log(`  CTB data: ${PRODUCTION_PLAN_SEED_DATA.ctbDaily.length} entries`);

  return true;
}

// Export
if (typeof window !== 'undefined') {
  window.PRODUCTION_PLAN_DEMO_PRESETS = PRODUCTION_PLAN_DEMO_PRESETS;
  window.applyDemoPreset = applyDemoPreset;
  window.generateCTBPattern = generateCTBPattern;
}
