/**
 * Excel Export Module for Production Plan
 *
 * Dependencies: SheetJS (xlsx.js)
 * CDN: https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js
 *
 * Author: Claude Code
 * Created: 2026-01-29
 */

const ExcelExport = (function() {
  'use strict';

  /**
   * Check if SheetJS library is loaded
   */
  function checkXLSX() {
    if (typeof XLSX === 'undefined') {
      console.error('[ExcelExport] SheetJS library not loaded');
      alert('Excel export library not loaded. Please refresh the page.');
      return false;
    }
    return true;
  }

  /**
   * Export simulation to Excel file
   * @param {Object} simulation - Simulation object
   */
  function exportSimulation(simulation) {
    if (!checkXLSX()) return;

    console.log('[ExcelExport] Exporting simulation:', simulation.id);

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Sheet 1: Summary
    const summarySheet = createSummarySheet(simulation);
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

    // Sheet 2: Daily Results
    const dailySheet = createDailySheet(simulation);
    XLSX.utils.book_append_sheet(wb, dailySheet, 'Daily Results');

    // Sheet 3: Weekly Metrics
    const weeklySheet = createWeeklySheet(simulation);
    XLSX.utils.book_append_sheet(wb, weeklySheet, 'Weekly Metrics');

    // Sheet 4: Site Breakdown (if available)
    if (simulation.results.siteResults) {
      const siteSheet = createSiteSheet(simulation);
      XLSX.utils.book_append_sheet(wb, siteSheet, 'Site Breakdown');
    }

    // Generate filename
    const filename = `${simulation.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Write file
    XLSX.writeFile(wb, filename);

    console.log('[ExcelExport] File exported:', filename);
  }

  /**
   * Create Summary Sheet
   */
  function createSummarySheet(simulation) {
    const summary = simulation.results.summary;
    const config = simulation.config;

    const data = [
      ['Production Plan Export'],
      [''],
      ['Simulation Information'],
      ['Name', simulation.name],
      ['Description', simulation.description || ''],
      ['Created', new Date(simulation.createdAt).toLocaleString()],
      [''],
      ['Configuration'],
      ['Planning Mode', config.mode],
      ['Date Range', `${config.dateRange.start} to ${config.dateRange.end}`],
      ['Sites', config.sites.join(', ')],
      ['Ramp Curve', config.rampCurve || 'Standard'],
      ['Sunday OT', config.otEnabled ? 'Enabled' : 'Disabled'],
      ['Shift Hours', config.shiftHours || '10'],
      ['Working Days', config.workingDays || '6 days/week'],
      [''],
      ['Summary Metrics'],
      ['Total Output', summary.totalOutput],
      ['Total Shipment', summary.totalShipment],
      ['Total Demand', summary.totalOutput], // TODO: Get actual demand
      ['Overall Attainment', summary.overallAttainment + '%'],
      ['Weeks with Gap < 0', summary.weeksWithGap.length],
      [''],
      ['Gap Analysis'],
      ['Week', 'Gap'],
    ];

    // Add gap details
    summary.weeksWithGap.forEach(weekId => {
      const week = simulation.results.weeklyMetrics.find(w => w.week_id === weekId);
      if (week) {
        data.push([weekId, week.gap]);
      }
    });

    const ws = XLSX.utils.aoa_to_sheet(data);

    // Set column widths
    ws['!cols'] = [
      { wch: 25 },
      { wch: 30 }
    ];

    // Apply styles (if supported)
    // Title row
    if (ws['A1']) {
      ws['A1'].s = {
        font: { bold: true, sz: 16 },
        alignment: { horizontal: 'center' }
      };
    }

    return ws;
  }

  /**
   * Create Daily Results Sheet
   */
  function createDailySheet(simulation) {
    const results = simulation.results.mode === 'combined'
      ? simulation.results.constrained.programResults
      : simulation.results.programResults;

    if (!results || results.length === 0) {
      return XLSX.utils.aoa_to_sheet([['No daily data available']]);
    }

    const data = [
      ['Date', 'Input', 'Output', 'Shipment', 'Cum Input', 'Cum Output', 'Cum Shipment']
    ];

    results.forEach(day => {
      data.push([
        day.date,
        day.input_final || 0,
        day.output_final || 0,
        day.shipment_final || 0,
        day.cum_input || 0,
        day.cum_output || 0,
        day.cum_shipment || 0
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);

    // Set column widths
    ws['!cols'] = [
      { wch: 12 }, // Date
      { wch: 12 }, // Input
      { wch: 12 }, // Output
      { wch: 12 }, // Shipment
      { wch: 12 }, // Cum Input
      { wch: 12 }, // Cum Output
      { wch: 12 }  // Cum Shipment
    ];

    // Freeze header row
    ws['!freeze'] = { xSplit: 0, ySplit: 1 };

    return ws;
  }

  /**
   * Create Weekly Metrics Sheet
   */
  function createWeeklySheet(simulation) {
    const weekly = simulation.results.mode === 'combined'
      ? simulation.results.constrained.weeklyMetrics
      : simulation.results.weeklyMetrics;

    if (!weekly || weekly.length === 0) {
      return XLSX.utils.aoa_to_sheet([['No weekly data available']]);
    }

    const data = [
      ['Week', 'Input', 'Output', 'Shipment', 'Demand', 'Gap', 'Attainment %']
    ];

    weekly.forEach(week => {
      data.push([
        week.week_id,
        week.input || 0,
        week.output || 0,
        week.shipments || week.shipment || 0,
        week.demand || 0,
        week.gap || 0,
        week.attainment ? week.attainment.toFixed(1) : '0.0'
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);

    // Set column widths
    ws['!cols'] = [
      { wch: 12 }, // Week
      { wch: 12 }, // Input
      { wch: 12 }, // Output
      { wch: 12 }, // Shipment
      { wch: 12 }, // Demand
      { wch: 12 }, // Gap
      { wch: 14 }  // Attainment
    ];

    // Freeze header row
    ws['!freeze'] = { xSplit: 0, ySplit: 1 };

    // Apply conditional formatting to Gap column (manual styling)
    // Note: SheetJS doesn't support conditional formatting directly
    // This would need to be done with a more advanced library

    return ws;
  }

  /**
   * Create Site Breakdown Sheet
   */
  function createSiteSheet(simulation) {
    const siteResults = simulation.results.mode === 'combined'
      ? simulation.results.constrained.siteResults
      : simulation.results.siteResults;

    if (!siteResults) {
      return XLSX.utils.aoa_to_sheet([['No site data available']]);
    }

    const data = [
      ['Site', 'Date', 'Input', 'Output', 'Shipment', 'Cum Input', 'Cum Output', 'Cum Shipment']
    ];

    Object.keys(siteResults).forEach(siteId => {
      const siteDays = siteResults[siteId];
      siteDays.forEach(day => {
        data.push([
          siteId,
          day.date,
          day.input_final || 0,
          day.output_final || 0,
          day.shipment_final || 0,
          day.cum_input || 0,
          day.cum_output || 0,
          day.cum_shipment || 0
        ]);
      });
    });

    const ws = XLSX.utils.aoa_to_sheet(data);

    // Set column widths
    ws['!cols'] = [
      { wch: 8 },  // Site
      { wch: 12 }, // Date
      { wch: 12 }, // Input
      { wch: 12 }, // Output
      { wch: 12 }, // Shipment
      { wch: 12 }, // Cum Input
      { wch: 12 }, // Cum Output
      { wch: 12 }  // Cum Shipment
    ];

    // Freeze header row
    ws['!freeze'] = { xSplit: 0, ySplit: 1 };

    // Auto-filter
    ws['!autofilter'] = { ref: `A1:H${data.length}` };

    return ws;
  }

  /**
   * Export POR to Excel
   */
  function exportPOR(por) {
    // POR uses same structure as simulation
    exportSimulation(por);
  }

  /**
   * Export comparison of multiple simulations
   */
  function exportComparison(simulations) {
    if (!checkXLSX()) return;

    console.log('[ExcelExport] Exporting comparison of', simulations.length, 'simulations');

    const wb = XLSX.utils.book_new();

    // Sheet 1: Comparison Summary
    const comparisonSheet = createComparisonSheet(simulations);
    XLSX.utils.book_append_sheet(wb, comparisonSheet, 'Comparison');

    // Add individual simulation sheets (first 3 only to avoid too many sheets)
    simulations.slice(0, 3).forEach((sim, idx) => {
      const weeklySheet = createWeeklySheet(sim);
      XLSX.utils.book_append_sheet(wb, weeklySheet, `Sim ${idx + 1} Weekly`);
    });

    const filename = `Simulation_Comparison_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);

    console.log('[ExcelExport] Comparison file exported:', filename);
  }

  /**
   * Create Comparison Sheet
   */
  function createComparisonSheet(simulations) {
    const data = [
      ['Simulation Comparison'],
      [''],
      ['', ...simulations.map((s, i) => `Simulation ${i + 1}`)],
      ['Name', ...simulations.map(s => s.name)],
      ['Mode', ...simulations.map(s => s.config.mode)],
      ['Date Range', ...simulations.map(s => `${s.config.dateRange.start} to ${s.config.dateRange.end}`)],
      [''],
      ['Summary Metrics'],
      ['Total Output', ...simulations.map(s => s.results.summary.totalOutput)],
      ['Total Shipment', ...simulations.map(s => s.results.summary.totalShipment)],
      ['Overall Attainment', ...simulations.map(s => s.results.summary.overallAttainment.toFixed(1) + '%')],
      ['Weeks with Gap', ...simulations.map(s => s.results.summary.weeksWithGap.length)],
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);

    // Set column widths
    ws['!cols'] = [
      { wch: 20 },
      ...simulations.map(() => ({ wch: 20 }))
    ];

    return ws;
  }

  // Public API
  return {
    exportSimulation,
    exportPOR,
    exportComparison
  };
})();

// Make available globally
window.ExcelExport = ExcelExport;

console.log('[ExcelExport] Module loaded');
