#!/usr/bin/env node

// Load seed data and engine
const fs = require('fs');
const path = require('path');

// Read and execute the files to get the classes/data
const seedDataCode = fs.readFileSync(path.join(__dirname, 'production_plan_seed_data.js'), 'utf8');
const engineCode = fs.readFileSync(path.join(__dirname, 'production_plan_engine.js'), 'utf8');

// Create a minimal window-like environment
global.window = {};

// Execute the code
eval(seedDataCode);
eval(engineCode);

// Get the exported objects
const PRODUCTION_PLAN_SEED_DATA = global.window.PRODUCTION_PLAN_SEED_DATA;
const ProductionPlanEngine = global.window.ProductionPlanEngine;

console.log('========================================');
console.log('PRODUCTION PLAN ENGINE TEST');
console.log('========================================\n');

// Create engine instance
const engine = new ProductionPlanEngine(PRODUCTION_PLAN_SEED_DATA);
console.log('✓ Engine instance created');

// Generate plan
const result = engine.generatePlan('2026-10-01', '2026-10-31', 'constrained');
console.log('✓ Plan generated');
console.log(`  Mode: ${result.mode}`);
console.log(`  Total days: ${result.programResults.length}`);

// Display first 10 days of program results
console.log('\n========================================');
console.log('PROGRAM RESULTS (First 10 Days)');
console.log('========================================');
console.log('Date       | Input  | Output | Ship   | Cum In | Cum Out| Cum Ship');
console.log('-----------|--------|--------|--------|--------|--------|--------');

result.programResults.slice(0, 10).forEach(day => {
  console.log(
    `${day.date} | ${day.input_final.toFixed(0).padStart(6)} | ${day.output_final.toFixed(0).padStart(6)} | ${day.shipment_final.toFixed(0).padStart(6)} | ${day.cum_input.toFixed(0).padStart(6)} | ${day.cum_output.toFixed(0).padStart(6)} | ${day.cum_shipment.toFixed(0).padStart(8)}`
  );
});

// Display weekly metrics
console.log('\n========================================');
console.log('WEEKLY METRICS');
console.log('========================================');
console.log('Week    | Input  | Output | Ship   | Demand | Gap    ');
console.log('--------|--------|--------|--------|--------|--------');

result.weeklyMetrics.forEach(week => {
  const gap = week.gap || (week.shipments - week.demand);
  const gapStr = gap.toFixed(0);
  const gapFormatted = gap < 0 ? `(${Math.abs(gap).toFixed(0)})` : gapStr;

  console.log(
    `${week.week_id} | ${week.input.toFixed(0).padStart(6)} | ${week.output.toFixed(0).padStart(6)} | ${week.shipments.toFixed(0).padStart(6)} | ${week.demand.toFixed(0).padStart(6)} | ${gapFormatted.padStart(6)}`
  );
});

// Check for CTB constraints
console.log('\n========================================');
console.log('CTB CONSTRAINT ANALYSIS');
console.log('========================================');

const wfSiteData = result.siteResults['WF'];
if (wfSiteData) {
  console.log('WF Site (First 10 days):');
  console.log('Date       | Unconstrain | CTB Daily | Input Final | Constrained?');
  console.log('-----------|-------------|-----------|-------------|-------------');

  wfSiteData.slice(0, 10).forEach(day => {
    const constrained = day.input_final < day.input_unconstrained ? 'YES' : 'NO';
    console.log(
      `${day.date} | ${day.input_unconstrained.toFixed(0).padStart(11)} | ${day.ctb_daily.toFixed(0).padStart(9)} | ${day.input_final.toFixed(0).padStart(11)} | ${constrained}`
    );
  });
}

console.log('\n========================================');
console.log('✓ Test completed successfully');
console.log('========================================\n');
