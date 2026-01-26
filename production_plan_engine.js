// ========================================
// PRODUCTION PLAN ENGINE
// Daily production planning with Line×Shift granularity
// ========================================

// ========================================
// 1. DATE UTILITIES
// ========================================

const DateUtils = {
  // Parse ISO date string to Date object
  parseDate(dateStr) {
    return new Date(dateStr + 'T00:00:00');
  },

  // Format Date to ISO string YYYY-MM-DD
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // Add days to a date
  addDays(dateStr, days) {
    const date = this.parseDate(dateStr);
    date.setDate(date.getDate() + days);
    return this.formatDate(date);
  },

  // Get ISO week ID (YYYY-Www)
  getWeekId(dateStr) {
    const date = this.parseDate(dateStr);
    const year = date.getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const days = Math.floor((date - startOfYear) / (24 * 60 * 60 * 1000));
    const weekNum = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    return `${year}-W${String(weekNum).padStart(2, '0')}`;
  },

  // Get day of week (0=Sun, 1=Mon, ..., 6=Sat)
  getDayOfWeek(dateStr) {
    return this.parseDate(dateStr).getDay();
  },

  // Check if date is Sunday
  isSunday(dateStr) {
    return this.getDayOfWeek(dateStr) === 0;
  },

  // Get Monday of the week containing this date
  getMondayOfWeek(dateStr) {
    const date = this.parseDate(dateStr);
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Adjust when day is Sunday
    date.setDate(date.getDate() + diff);
    return this.formatDate(date);
  },

  // Generate date range array
  getDateRange(startDate, endDate) {
    const dates = [];
    let current = startDate;
    while (current <= endDate) {
      dates.push(current);
      current = this.addDays(current, 1);
    }
    return dates;
  },

  // Compare dates
  isDateBefore(date1, date2) {
    return date1 < date2;
  },

  isDateAfter(date1, date2) {
    return date1 > date2;
  },

  // Check if date falls within a range [start, end] inclusive
  isDateInRange(date, start, end) {
    return date >= start && date <= end;
  }
};

// ========================================
// 2. CALENDAR SYSTEM
// ========================================

class CalendarSystem {
  constructor(countryHolidays, siteOverrides) {
    this.countryHolidays = countryHolidays || {}; // { "CN": [...], "VN": [...] }
    this.siteOverrides = siteOverrides || [];      // [{ site_id, overrides: [...] }]
  }

  // Check if a date is a working day for a specific site
  isWorkingDay(siteId, siteCountry, date) {
    // Priority 1: Site override
    const siteOverride = this.siteOverrides.find(s => s.site_id === siteId);
    if (siteOverride) {
      const dateOverride = siteOverride.overrides.find(o => o.date === date);
      if (dateOverride && dateOverride.is_working_day !== undefined) {
        return dateOverride.is_working_day;
      }
    }

    // Priority 2: Country holiday
    const holidays = this.countryHolidays[siteCountry] || [];
    for (const holiday of holidays) {
      if (DateUtils.isDateInRange(date, holiday.start, holiday.end)) {
        return false; // Holiday = non-working
      }
    }

    // Priority 3: Default pattern (Mon-Sat working, Sun off)
    return !DateUtils.isSunday(date);
  }

  // Get shift hours for a specific unit on a date (with override support)
  getShiftHours(siteId, date, shiftType, defaultHours) {
    const siteOverride = this.siteOverrides.find(s => s.site_id === siteId);
    if (siteOverride) {
      const dateOverride = siteOverride.overrides.find(o => o.date === date);
      if (dateOverride && dateOverride.shift_hours_override) {
        const override = dateOverride.shift_hours_override[shiftType];
        if (override !== undefined) return override;
      }
    }
    return defaultHours;
  }

  // Count working days from start to end (inclusive)
  countWorkingDays(siteId, siteCountry, startDate, endDate) {
    let count = 0;
    const dates = DateUtils.getDateRange(startDate, endDate);
    for (const date of dates) {
      if (this.isWorkingDay(siteId, siteCountry, date)) {
        count++;
      }
    }
    return count;
  }

  // Add N working days from a date
  addWorkingDays(siteId, siteCountry, startDate, numDays) {
    let current = startDate;
    let remaining = numDays;

    while (remaining > 0) {
      current = DateUtils.addDays(current, 1);
      if (this.isWorkingDay(siteId, siteCountry, current)) {
        remaining--;
      }
    }

    return current;
  }

  // Get workday index for a unit on a specific date
  // Returns 0 if before ramp start, else returns the workday count (1-indexed)
  getWorkdayIndex(siteId, siteCountry, rampStartDate, date, maxDays) {
    if (DateUtils.isDateBefore(date, rampStartDate)) {
      return 0; // Not started yet
    }

    const workdays = this.countWorkingDays(siteId, siteCountry, rampStartDate, date);
    return Math.min(workdays, maxDays);
  }
}

// ========================================
// 3. PRODUCTION PLAN ENGINE
// ========================================

class ProductionPlanEngine {
  constructor(config) {
    this.programConfig = config.programConfig;
    this.sites = config.sites;
    this.capacityUnits = config.capacityUnits;
    this.ctbDaily = config.ctbDaily || [];
    this.weeklyDemand = config.weeklyDemand || [];

    this.calendar = new CalendarSystem(
      config.countryHolidays,
      config.siteOverrides
    );
  }

  // Generate full production plan
  generatePlan(startDate, endDate, mode = 'unconstrained') {
    const dates = DateUtils.getDateRange(startDate, endDate);

    // Step 1: Calculate unconstrained production at unit level
    const unitResults = this.calculateUnconstrainedProduction(dates);

    // Step 2: Aggregate to site level
    const siteResults = this.aggregateToSite(unitResults, dates);

    // Step 3: Apply CTB constraints if in constrained mode
    let siteFinal = siteResults;
    if (mode === 'constrained') {
      siteFinal = this.applyCtbConstraints(siteResults, dates);
    }

    // Step 4: Calculate shipments with +2 working day lag
    const siteShipments = this.calculateShipments(siteFinal, dates);

    // Step 5: Aggregate to program level
    const programResults = this.aggregateToProgram(siteFinal, siteShipments, dates);

    // Step 6: Calculate weekly metrics
    const weeklyMetrics = this.calculateWeeklyMetrics(programResults, dates);

    return {
      unitResults,
      siteResults: siteFinal,
      siteShipments,
      programResults,
      weeklyMetrics,
      mode
    };
  }

  // Calculate unconstrained production for each unit on each date
  calculateUnconstrainedProduction(dates) {
    const results = [];

    for (const unit of this.capacityUnits) {
      const site = this.sites.find(s => s.site_id === unit.site_id);
      if (!site) continue;

      const uphCurveLength = unit.uph_ramp_curve.length_workdays;
      const yieldCurveLength = unit.yield_ramp_curve.length_workdays;

      for (const date of dates) {
        // Check if working day
        const isWorking = this.calendar.isWorkingDay(unit.site_id, site.country, date);

        if (!isWorking) {
          results.push({
            unit_id: unit.unit_id,
            date,
            site_id: unit.site_id,
            line_id: unit.line_id,
            shift_type: unit.shift_type,
            is_working: false,
            workday_index: 0,
            input: 0,
            output: 0
          });
          continue;
        }

        // Get workday index
        const workdayIdx = this.calendar.getWorkdayIndex(
          unit.site_id,
          site.country,
          unit.ramp_start_date,
          date,
          Math.max(uphCurveLength, yieldCurveLength)
        );

        if (workdayIdx === 0) {
          // Before ramp start
          results.push({
            unit_id: unit.unit_id,
            date,
            site_id: unit.site_id,
            line_id: unit.line_id,
            shift_type: unit.shift_type,
            is_working: true,
            workday_index: 0,
            ramp_start_date: unit.ramp_start_date,
            input: 0,
            output: 0
          });
          continue;
        }

        // Get ramp factors (array is 0-indexed, workday is 1-indexed)
        const uphFactor = unit.uph_ramp_curve.factors[Math.min(workdayIdx - 1, uphCurveLength - 1)];
        const yieldFactor = unit.yield_ramp_curve.factors[Math.min(workdayIdx - 1, yieldCurveLength - 1)];

        // Get shift hours (with potential override)
        const shiftHours = this.calendar.getShiftHours(
          unit.site_id,
          date,
          unit.shift_type,
          unit.shift_hours
        );

        // Calculate input
        const input = unit.base_uph * uphFactor * shiftHours;

        // Calculate base output
        const baseOutput = input * yieldFactor;

        // Apply output factor for first two days
        let outputFactor = 1.0;
        if (workdayIdx === 1) {
          outputFactor = this.programConfig.output_factors.day1;
        } else if (workdayIdx === 2) {
          outputFactor = this.programConfig.output_factors.day2;
        } else {
          outputFactor = this.programConfig.output_factors.day3_plus;
        }

        const output = baseOutput * outputFactor;

        results.push({
          unit_id: unit.unit_id,
          date,
          site_id: unit.site_id,
          line_id: unit.line_id,
          shift_type: unit.shift_type,
          is_working: true,
          workday_index: workdayIdx,
          ramp_start_date: unit.ramp_start_date,
          base_uph: unit.base_uph,
          shift_hours: shiftHours,
          uph_factor: uphFactor,
          yield_factor: yieldFactor,
          output_factor: outputFactor,
          input,
          output
        });
      }
    }

    return results;
  }

  // Aggregate unit results to site level
  aggregateToSite(unitResults, dates) {
    const siteMap = {};

    for (const date of dates) {
      const unitsForDate = unitResults.filter(u => u.date === date);

      // Group by site
      const bySite = {};
      for (const unit of unitsForDate) {
        if (!bySite[unit.site_id]) {
          bySite[unit.site_id] = [];
        }
        bySite[unit.site_id].push(unit);
      }

      // Sum up per site
      for (const siteId in bySite) {
        const units = bySite[siteId];
        const inputSum = units.reduce((sum, u) => sum + u.input, 0);
        const outputSum = units.reduce((sum, u) => sum + u.output, 0);

        if (!siteMap[siteId]) siteMap[siteId] = [];
        siteMap[siteId].push({
          date,
          site_id: siteId,
          input_unconstrained: inputSum,
          output_unconstrained: outputSum,
          input_final: inputSum,
          output_final: outputSum
        });
      }
    }

    return siteMap;
  }

  // Apply CTB constraints to site results
  applyCtbConstraints(siteResults, dates) {
    const siteFinal = {};

    for (const siteId in siteResults) {
      const siteData = siteResults[siteId];
      const constrainedData = [];

      // Build CTB map for this site
      const ctbMap = {};
      for (const ctb of this.ctbDaily) {
        if (ctb.site_id === siteId && ctb.program_id === this.programConfig.program_id) {
          ctbMap[ctb.date] = ctb.ctb_qty;
        }
      }

      // Calculate cumulative CTB
      let cumCtb = 0;
      const cumCtbMap = {};
      for (const date of dates) {
        cumCtb += (ctbMap[date] || 0);
        cumCtbMap[date] = cumCtb;
      }

      // Apply constraint day by day
      let cumInputFinal = 0;
      for (const dayData of siteData) {
        const date = dayData.date;
        const cumCtbToday = cumCtbMap[date] || 0;
        const ctbRemaining = Math.max(0, cumCtbToday - cumInputFinal);

        const inputFinal = Math.min(dayData.input_unconstrained, ctbRemaining);

        // Scale output proportionally
        const effectiveYield = dayData.input_unconstrained > 0
          ? dayData.output_unconstrained / dayData.input_unconstrained
          : 0;
        const outputFinal = inputFinal * effectiveYield;

        cumInputFinal += inputFinal;

        constrainedData.push({
          date,
          site_id: siteId,
          input_unconstrained: dayData.input_unconstrained,
          output_unconstrained: dayData.output_unconstrained,
          ctb_daily: ctbMap[date] || 0,
          cum_ctb: cumCtbToday,
          ctb_remaining: ctbRemaining,
          input_final: inputFinal,
          output_final: outputFinal,
          cum_input_final: cumInputFinal
        });
      }

      siteFinal[siteId] = constrainedData;
    }

    return siteFinal;
  }

  // Calculate shipments with +2 working day lag per site
  calculateShipments(siteFinal, dates) {
    const siteShipments = {};

    for (const siteId in siteFinal) {
      const site = this.sites.find(s => s.site_id === siteId);
      if (!site) continue;

      const shipmentMap = {};

      // Initialize all dates to 0
      for (const date of dates) {
        shipmentMap[date] = 0;
      }

      // Map outputs to shipment dates
      for (const dayData of siteFinal[siteId]) {
        const outputDate = dayData.date;
        const outputQty = dayData.output_final;

        if (outputQty > 0) {
          const shipDate = this.calendar.addWorkingDays(
            siteId,
            site.country,
            outputDate,
            this.programConfig.shipment_lag_workdays
          );

          // Only count shipment if it's within our date range
          if (dates.includes(shipDate)) {
            shipmentMap[shipDate] += outputQty;
          }
        }
      }

      siteShipments[siteId] = Object.keys(shipmentMap).map(date => ({
        date,
        site_id: siteId,
        shipment: shipmentMap[date]
      }));
    }

    return siteShipments;
  }

  // Aggregate to program level
  aggregateToProgram(siteFinal, siteShipments, dates) {
    const programData = [];

    for (const date of dates) {
      let inputFinal = 0;
      let outputFinal = 0;
      let shipmentFinal = 0;

      // Sum across sites
      for (const siteId in siteFinal) {
        const dayData = siteFinal[siteId].find(d => d.date === date);
        if (dayData) {
          inputFinal += dayData.input_final;
          outputFinal += dayData.output_final;
        }
      }

      for (const siteId in siteShipments) {
        const shipData = siteShipments[siteId].find(d => d.date === date);
        if (shipData) {
          shipmentFinal += shipData.shipment;
        }
      }

      programData.push({
        date,
        input_final: inputFinal,
        output_final: outputFinal,
        shipment_final: shipmentFinal
      });
    }

    // Add cumulative metrics
    let cumInput = 0;
    let cumOutput = 0;
    let cumShipment = 0;

    for (const dayData of programData) {
      cumInput += dayData.input_final;
      cumOutput += dayData.output_final;
      cumShipment += dayData.shipment_final;

      dayData.cum_input = cumInput;
      dayData.cum_output = cumOutput;
      dayData.cum_shipment = cumShipment;
    }

    return programData;
  }

  // Calculate weekly metrics (Mon-Sat aggregation)
  calculateWeeklyMetrics(programResults, dates) {
    const weekMap = {};

    // Aggregate daily data into weeks
    for (const dayData of programResults) {
      const weekId = DateUtils.getWeekId(dayData.date);

      if (!weekMap[weekId]) {
        weekMap[weekId] = {
          week_id: weekId,
          input: 0,
          output: 0,
          shipments: 0,
          demand: 0,
          gap: 0
        };
      }

      // Only count Mon-Sat (skip Sunday)
      if (!DateUtils.isSunday(dayData.date)) {
        weekMap[weekId].input += dayData.input_final;
        weekMap[weekId].output += dayData.output_final;
        weekMap[weekId].shipments += dayData.shipment_final;
      }
    }

    // Add demand data
    for (const demand of this.weeklyDemand) {
      if (weekMap[demand.week_id]) {
        weekMap[demand.week_id].demand = demand.demand_qty;
        weekMap[demand.week_id].gap = weekMap[demand.week_id].shipments - demand.demand_qty;
      }
    }

    return Object.values(weekMap).sort((a, b) => a.week_id.localeCompare(b.week_id));
  }
}

// ========================================
// METRICS CALCULATION (v3.0 Integration)
// ========================================

/**
 * 从生产计划结果计算 8 个核心指标
 * @param {Object} planResults - Production Plan Engine 的输出结果
 * @param {Object} engineState - Engine 状态 (包含 weeklyDemand 等)
 * @returns {Object} 指标快照
 */
function calculateMetricsFromPlan(planResults, engineState) {
  const metrics = {};

  if (!planResults || planResults.length === 0) {
    return metrics;
  }

  // ============================================================
  // 1. MPS Attainment (主计划达成率)
  // ============================================================
  const totalActual = planResults.reduce((sum, day) => {
    const outputFactor = day.ramp_day_index === 1 ? 0.5 :
                         day.ramp_day_index === 2 ? 1.0 : 1.0;
    return sum + (day.daily_output * outputFactor);
  }, 0);

  const totalPlan = engineState.weeklyDemand ?
    engineState.weeklyDemand.reduce((sum, w) => sum + w.demand_qty, 0) : 10000;

  metrics.mps_attainment = {
    value: totalPlan > 0 ? totalActual / totalPlan : 1.0,
    threshold: 0.85,
    gap_qty: Math.max(0, totalPlan - totalActual),
    affected_customers: totalActual < totalPlan ? ['Customer A', 'Customer B'] : [],
    delay_days: totalActual < totalPlan ? 3 : 0,
    data_snapshot: {
      age_hours: 2,
      coverage_pct: 100,
      reconciliation_status: 'matched'
    }
  };

  // ============================================================
  // 2. Service Level (服务水平)
  // ============================================================
  // 模拟：使用 shipment_final (output + 2WD) 与 demand 对比
  const totalShipments = planResults.reduce((sum, day) => sum + day.shipment_final, 0);
  const onTimeRate = totalPlan > 0 ? Math.min(1.0, totalShipments / totalPlan) : 1.0;

  metrics.service_level = {
    value: onTimeRate,
    threshold: 0.90,
    at_risk_orders: onTimeRate < 0.95 ? 3 : 0,
    late_orders: onTimeRate < 0.90 ? 2 : 0,
    affected_customers: onTimeRate < 0.90 ? ['Customer A'] : [],
    data_snapshot: {
      age_hours: 6,
      coverage_pct: 98,
      reconciliation_status: 'matched'
    }
  };

  // ============================================================
  // 3. Manufacturing Cost Risk (制造成本风险)
  // ============================================================
  // 模拟：如果 MPS Attainment < 0.90，假设有额外成本
  const costRiskPct = metrics.mps_attainment.value < 0.90 ? 0.12 : 0.03;

  metrics.cost_risk = {
    value: costRiskPct,
    threshold: 0.10,
    extra_cost_usd: costRiskPct > 0.10 ? 15000 : 3000,
    cost_breakdown: '加班工资 $8k, 空运 $5k, 废料 $2k',
    data_snapshot: {
      age_hours: 24,
      coverage_pct: 92,
      reconciliation_status: 'matched'
    }
  };

  // ============================================================
  // 4. CTB (物料可用性)
  // ============================================================
  // 模拟：从第一天的 CTB 数据推算
  const firstDayCTB = planResults[0]?.ctb_available || 2000;
  const dailyConsumption = 800;
  const daysCover = firstDayCTB / dailyConsumption;

  metrics.ctb = {
    value: firstDayCTB,
    days_cover: daysCover,
    threshold: 1, // 红线 1 天
    shortage_components: daysCover < 2 ? ['Component-A', 'Component-B'] : [],
    affected_lines: daysCover < 2 ? ['WF-L1', 'VN02-L1'] : [],
    data_snapshot: {
      age_hours: 6,
      coverage_pct: 95,
      reconciliation_status: 'matched'
    }
  };

  // ============================================================
  // 5. Capacity (产能可用性)
  // ============================================================
  const totalCapacity = planResults.reduce((sum, day) => sum + day.capacity_available, 0);
  const totalUsed = planResults.reduce((sum, day) => sum + day.input_final, 0);
  const utilization = totalCapacity > 0 ? totalUsed / totalCapacity : 0;

  metrics.capacity = {
    value: totalCapacity,
    utilization: utilization,
    threshold: 0.95, // 红线 95% 利用率
    data_snapshot: {
      age_hours: 6,
      coverage_pct: 100,
      reconciliation_status: 'matched'
    }
  };

  // ============================================================
  // 6. Yield (良率)
  // ============================================================
  // 模拟：从 output / input 推算平均良率
  const avgYield = totalUsed > 0 ?
    planResults.reduce((sum, day) => sum + day.daily_output, 0) / totalUsed : 0.95;

  metrics.yield = {
    value: avgYield,
    threshold: 0.90,
    scrap_qty: avgYield < 0.90 ? Math.round(totalUsed * (1 - avgYield)) : 0,
    scrap_cost_usd: avgYield < 0.90 ? 8000 : 0,
    data_snapshot: {
      age_hours: 20,
      coverage_pct: 96,
      reconciliation_status: 'matched'
    }
  };

  // ============================================================
  // 7. Shipment Readiness (出货就绪度)
  // ============================================================
  const futureShipments = planResults
    .filter(day => new Date(day.date) > new Date())
    .reduce((sum, day) => sum + day.shipment_final, 0);
  const shipmentDaysCover = futureShipments / dailyConsumption;

  metrics.shipment_readiness = {
    value: futureShipments,
    days_cover: shipmentDaysCover,
    threshold: 2, // 红线 2 天
    at_risk_orders: shipmentDaysCover < 3 ? 2 : 0,
    affected_customers: shipmentDaysCover < 3 ? ['Customer C'] : [],
    data_snapshot: {
      age_hours: 8,
      coverage_pct: 97,
      reconciliation_status: 'matched'
    }
  };

  // ============================================================
  // 8. Data Freshness (数据新鲜度)
  // ============================================================
  metrics.data_freshness = {
    age_hours: 12,
    threshold: 48,
    stale_tables: [],
    affected_metrics: [],
    data_snapshot: {
      age_hours: 0, // 实时
      coverage_pct: 100,
      reconciliation_status: 'matched'
    }
  };

  return metrics;
}

// Export for use in other files
if (typeof window !== 'undefined') {
  window.DateUtils = DateUtils;
  window.CalendarSystem = CalendarSystem;
  window.ProductionPlanEngine = ProductionPlanEngine;
  window.calculateMetricsFromPlan = calculateMetricsFromPlan;
}
