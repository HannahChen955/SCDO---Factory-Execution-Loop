// Add this to browser console to see detailed unit-level calculations

function diagnoseDate(dateStr) {
  const state = window.productionPlanState;
  if (!state || !state.planResults) {
    console.error('No plan results found. Generate a plan first.');
    return;
  }+

  let totalInput = 0;
  unitsOnDate.forEach(unit => {
    console.log(`\n${unit.unit_id}:`);
    console.log(`  Ramp Start: ${unit.ramp_start_date}`);
    console.log(`  Workday Index: ${unit.workday_index}`);
    console.log(`  Base UPH: ${unit.base_uph}`);
    console.log(`  UPH Factor: ${unit.uph_factor}`);
    console.log(`  Shift Hours: ${unit.shift_hours}`);
    console.log(`  Calculation: ${unit.base_uph} × ${unit.uph_factor} × ${unit.shift_hours} = ${unit.input}`);
    totalInput += unit.input;
  });

  console.log('\n' + '='.repeat(80));
  console.log(`TOTAL INPUT: ${totalInput}`);
  console.log('='.repeat(80) + '\n');
}

// Export to window
window.diagnoseDate = diagnoseDate;

console.log('Diagnostic tool loaded!');
console.log('Usage: diagnoseDate("2026-09-07")');
