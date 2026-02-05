// ========================================
// CURVE PRESETS MANAGER
// Manages global UPH and Yield ramp curve presets
// ========================================

// Initialize global curve presets storage
if (!window.curvePresets) {
  window.curvePresets = {
    uph: {
      standard_30d: {
        name: 'Standard 30-day Ramp',
        length: 30,
        factors: generateLinearRamp(30, 0.50, 1.00)
      },
      fast_20d: {
        name: 'Fast 20-day Ramp',
        length: 20,
        factors: generateLinearRamp(20, 0.60, 1.00)
      },
      slow_45d: {
        name: 'Slow 45-day Ramp',
        length: 45,
        factors: generateLinearRamp(45, 0.40, 1.00)
      }
    },
    yield: {
      standard_30d: {
        name: 'Standard 30-day Yield',
        length: 30,
        factors: generateLinearRamp(30, 0.70, 0.98)
      },
      fast_20d: {
        name: 'Fast 20-day Yield',
        length: 20,
        factors: generateLinearRamp(20, 0.75, 0.98)
      },
      slow_45d: {
        name: 'Slow 45-day Yield',
        length: 45,
        factors: generateLinearRamp(45, 0.65, 0.98)
      }
    }
  };
}

// Helper function to generate linear ramp
function generateLinearRamp(length, startValue, endValue) {
  const factors = [];
  const increment = (endValue - startValue) / (length - 1);
  for (let i = 0; i < length; i++) {
    factors.push(parseFloat((startValue + increment * i).toFixed(2)));
  }
  return factors;
}

// Open Curve Presets Manager
function openCurvePresetsManager() {
  const win = window.open('', 'CurvePresetsManager', 'width=1400,height=900,scrollbars=yes');

  if (!win) {
    alert('⚠️ Pop-up blocked! Please allow pop-ups for this site.');
    return;
  }

  const doc = win.document;
  doc.open();
  doc.write(`
<!DOCTYPE html>
<html>
<head>
  <title>Curve Presets Manager</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js"></script>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; }
    .day-input {
      width: 80px;
      padding: 6px 8px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      text-align: center;
      font-size: 14px;
    }
    .day-input:focus {
      outline: none;
      border-color: #3b82f6;
      ring: 2px;
      ring-color: #3b82f6;
    }
    .day-label {
      font-size: 12px;
      color: #64748b;
      font-weight: 500;
      margin-bottom: 4px;
    }
  </style>
</head>
<body class="bg-slate-50 p-6">
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <div class="bg-white rounded-xl shadow-sm p-6 mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">📈 Curve Presets Manager</h1>
          <p class="text-sm text-slate-600 mt-1">Configure default UPH and Yield ramp curves for all shifts</p>
        </div>
        <div class="flex gap-3">
          <button onclick="exportCurvesToExcel()" class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold shadow-sm">
            📥 Export to Excel
          </button>
          <button onclick="triggerImportExcel()" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm">
            📤 Import from Excel
          </button>
          <input type="file" id="excelFileInput" accept=".xlsx,.xls" style="display:none" onchange="handleExcelImport(event)">
          <button onclick="window.close()" class="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg text-sm font-semibold">
            ✕ Close
          </button>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="bg-white rounded-xl shadow-sm p-6">
      <div class="flex gap-4 border-b border-slate-200 mb-6">
        <button onclick="switchCurveTab('uph')" id="tab-uph" class="px-4 py-2 font-semibold text-blue-600 border-b-2 border-blue-600">
          UPH Curves
        </button>
        <button onclick="switchCurveTab('yield')" id="tab-yield" class="px-4 py-2 font-semibold text-slate-600 hover:text-slate-900">
          Yield Curves
        </button>
      </div>

      <!-- UPH Curves Content -->
      <div id="content-uph" class="space-y-6">
        <!-- Will be populated by renderAllPresets() -->
      </div>

      <!-- Yield Curves Content -->
      <div id="content-yield" class="space-y-6 hidden">
        <!-- Will be populated by renderAllPresets() -->
      </div>

      <!-- Global Action Buttons -->
      <div class="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between">
        <button onclick="openBackupManager()" class="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold shadow-sm">
          💾 Backup Manager
        </button>
        <button onclick="resetAllCurvesToDefault()" class="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50">
          Reset All to Default
        </button>
      </div>
    </div>
  </div>

  <script>
    // Load curve presets from parent window (deep copy)
    let curvePresets = JSON.parse(JSON.stringify(${JSON.stringify(window.curvePresets)}));
    let hasUnsavedChanges = false;

    function switchCurveTab(type) {
      document.getElementById('tab-uph').className = type === 'uph'
        ? 'px-4 py-2 font-semibold text-blue-600 border-b-2 border-blue-600'
        : 'px-4 py-2 font-semibold text-slate-600 hover:text-slate-900';
      document.getElementById('tab-yield').className = type === 'yield'
        ? 'px-4 py-2 font-semibold text-blue-600 border-b-2 border-blue-600'
        : 'px-4 py-2 font-semibold text-slate-600 hover:text-slate-900';

      document.getElementById('content-uph').classList.toggle('hidden', type !== 'uph');
      document.getElementById('content-yield').classList.toggle('hidden', type !== 'yield');
    }

    function toggleCurveSection(sectionId) {
      const content = document.getElementById(sectionId);
      const toggle = document.getElementById(sectionId + '_toggle');
      content.classList.toggle('hidden');
      toggle.textContent = content.classList.contains('hidden') ? '▶' : '▼';
    }

    function updateCurveValue(type, presetKey, index) {
      const inputId = \`input_\${type}_\${presetKey}_\${index}\`;
      const value = parseFloat(document.getElementById(inputId).value);

      if (isNaN(value) || value < 0 || value > 1) {
        alert('⚠️ Invalid value! Must be between 0.00 and 1.00');
        document.getElementById(inputId).value = curvePresets[type][presetKey].factors[index].toFixed(2);
        return;
      }

      curvePresets[type][presetKey].factors[index] = value;
      hasUnsavedChanges = true;
      updateSaveButtonState(type, presetKey);
    }

    function addDay(type, presetKey) {
      const curve = curvePresets[type][presetKey];
      const lastValue = curve.factors[curve.factors.length - 1];
      curve.factors.push(lastValue); // Add a day with the same value as last day
      curve.length = curve.factors.length;
      hasUnsavedChanges = true;
      renderPreset(type, presetKey);
    }

    function removeDay(type, presetKey) {
      const curve = curvePresets[type][presetKey];
      if (curve.factors.length <= 1) {
        alert('⚠️ Cannot remove! At least 1 day is required.');
        return;
      }
      curve.factors.pop(); // Remove last day
      curve.length = curve.factors.length;
      hasUnsavedChanges = true;
      renderPreset(type, presetKey);
    }

    function saveCurvePreset(type, presetKey) {
      try {
        // Save to parent window
        if (window.opener && window.opener.curvePresets) {
          window.opener.curvePresets[type][presetKey] = JSON.parse(JSON.stringify(curvePresets[type][presetKey]));
        }

        // Save to localStorage
        const allPresets = JSON.parse(localStorage.getItem('curvePresets') || '{}');
        if (!allPresets[type]) allPresets[type] = {};
        allPresets[type][presetKey] = curvePresets[type][presetKey];
        localStorage.setItem('curvePresets', JSON.stringify(allPresets));

        hasUnsavedChanges = false;
        updateSaveButtonState(type, presetKey);

        // Show success message
        const btn = document.getElementById(\`save_\${type}_\${presetKey}\`);
        const originalText = btn.innerHTML;
        btn.innerHTML = '✅ Saved!';
        btn.className = btn.className.replace('bg-green-600', 'bg-green-700');
        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.className = btn.className.replace('bg-green-700', 'bg-green-600');
        }, 1500);

      } catch (error) {
        console.error('Error saving curve preset:', error);
        alert('❌ Failed to save: ' + error.message);
      }
    }

    function updateSaveButtonState(type, presetKey) {
      const btn = document.getElementById(\`save_\${type}_\${presetKey}\`);
      if (btn) {
        if (hasUnsavedChanges) {
          btn.className = 'px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 shadow-sm';
          btn.disabled = false;
        } else {
          btn.className = 'px-6 py-2 bg-slate-300 text-slate-500 rounded-lg font-semibold cursor-not-allowed';
          btn.disabled = true;
        }
      }
    }

    function renderPreset(type, presetKey) {
      const preset = curvePresets[type][presetKey];
      const containerId = \`preset_\${type}_\${presetKey}\`;
      const container = document.getElementById(containerId);

      if (!container) return;

      // Generate inputs for all days
      const dayInputs = preset.factors.map((factor, index) => {
        return \`
          <div class="flex flex-col">
            <div class="day-label">Day \${index + 1}</div>
            <input type="number"
                   id="input_\${type}_\${presetKey}_\${index}"
                   step="0.01"
                   min="0"
                   max="1"
                   value="\${factor.toFixed(2)}"
                   onchange="updateCurveValue('\${type}', '\${presetKey}', \${index})"
                   class="day-input">
          </div>
        \`;
      }).join('');

      container.innerHTML = \`
        <div class="border-2 border-slate-200 rounded-lg p-5 bg-gradient-to-r from-slate-50 to-white">
          <!-- Header -->
          <div class="flex items-center justify-between mb-4 cursor-pointer" onclick="toggleCurveSection('section_\${type}_\${presetKey}')">
            <div class="flex items-center gap-3">
              <span id="section_\${type}_\${presetKey}_toggle" class="text-slate-600 text-lg">▼</span>
              <div>
                <h3 class="text-lg font-bold text-slate-900">\${preset.name}</h3>
                <p class="text-sm text-slate-600">\${preset.length} workdays | Start: \${preset.factors[0].toFixed(2)} → End: \${preset.factors[preset.length - 1].toFixed(2)}</p>
              </div>
            </div>
            <div class="flex items-center gap-2" onclick="event.stopPropagation()">
              <button onclick="exportSingleCurve('\${type}', '\${presetKey}')"
                      title="Export this curve to Excel"
                      class="px-2 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded text-xs font-semibold">
                📥
              </button>
              <button onclick="importSingleCurve('\${type}', '\${presetKey}')"
                      title="Import this curve from Excel"
                      class="px-2 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded text-xs font-semibold">
                📤
              </button>
              <button onclick="removeDay('\${type}', '\${presetKey}')"
                      class="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs font-semibold">
                ➖ Remove Day
              </button>
              <button onclick="addDay('\${type}', '\${presetKey}')"
                      class="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs font-semibold">
                ➕ Add Day
              </button>
            </div>
          </div>

          <!-- Curve Values Grid -->
          <div id="section_\${type}_\${presetKey}" class="space-y-4">
            <div class="grid grid-cols-8 gap-3">
              \${dayInputs}
            </div>

            <!-- Save Button -->
            <div class="pt-4 border-t border-slate-200 flex justify-end">
              <button id="save_\${type}_\${presetKey}"
                      onclick="saveCurvePreset('\${type}', '\${presetKey}')"
                      class="px-6 py-2 bg-slate-300 text-slate-500 rounded-lg font-semibold cursor-not-allowed"
                      disabled>
                💾 Save \${preset.name}
              </button>
            </div>
          </div>
        </div>
      \`;

      // Set initial save button state
      hasUnsavedChanges = false;
      updateSaveButtonState(type, presetKey);
    }

    function renderAllPresets() {
      // Render UPH curves
      document.getElementById('content-uph').innerHTML = \`
        <div id="preset_uph_standard_30d"></div>
        <div id="preset_uph_fast_20d"></div>
        <div id="preset_uph_slow_45d"></div>
      \`;

      // Render Yield curves
      document.getElementById('content-yield').innerHTML = \`
        <div id="preset_yield_standard_30d"></div>
        <div id="preset_yield_fast_20d"></div>
        <div id="preset_yield_slow_45d"></div>
      \`;

      // Render each preset
      ['uph', 'yield'].forEach(type => {
        ['standard_30d', 'fast_20d', 'slow_45d'].forEach(presetKey => {
          renderPreset(type, presetKey);
        });
      });
    }

    function resetAllCurvesToDefault() {
      if (!confirm('⚠️ Are you sure you want to reset ALL curves to default values? This will discard all unsaved changes.')) {
        return;
      }

      // Reset to default
      curvePresets = {
        uph: {
          standard_30d: {
            name: 'Standard 30-day Ramp',
            length: 30,
            factors: generateLinearRamp(30, 0.50, 1.00)
          },
          fast_20d: {
            name: 'Fast 20-day Ramp',
            length: 20,
            factors: generateLinearRamp(20, 0.60, 1.00)
          },
          slow_45d: {
            name: 'Slow 45-day Ramp',
            length: 45,
            factors: generateLinearRamp(45, 0.40, 1.00)
          }
        },
        yield: {
          standard_30d: {
            name: 'Standard 30-day Yield',
            length: 30,
            factors: generateLinearRamp(30, 0.70, 0.98)
          },
          fast_20d: {
            name: 'Fast 20-day Yield',
            length: 20,
            factors: generateLinearRamp(20, 0.75, 0.98)
          },
          slow_45d: {
            name: 'Slow 45-day Yield',
            length: 45,
            factors: generateLinearRamp(45, 0.65, 0.98)
          }
        }
      };

      hasUnsavedChanges = false;
      renderAllPresets();
    }

    function generateLinearRamp(length, startValue, endValue) {
      const factors = [];
      const increment = (endValue - startValue) / (length - 1);
      for (let i = 0; i < length; i++) {
        factors.push(parseFloat((startValue + increment * i).toFixed(4)));
      }
      return factors;
    }

    // ========================================
    // EXCEL EXPORT/IMPORT FUNCTIONS (Phase 1 & 2)
    // ========================================

    // Get timestamp for filename
    function getTimestamp() {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      return \`\${year}\${month}\${day}_\${hours}\${minutes}\${seconds}\`;
    }

    // Format curve data for Excel export
    function formatCurvesForExport(type) {
      const curves = curvePresets[type];
      const curveKeys = Object.keys(curves);

      // Find max length across all curves
      let maxLength = 0;
      curveKeys.forEach(key => {
        if (curves[key].length > maxLength) {
          maxLength = curves[key].length;
        }
      });

      // Build header row
      const headerRow = ['Day'];
      curveKeys.forEach(key => {
        headerRow.push(curves[key].name);
      });

      // Build data rows
      const dataRows = [];
      for (let i = 0; i < maxLength; i++) {
        const row = [\`Day \${i + 1}\`];
        curveKeys.forEach(key => {
          const curve = curves[key];
          if (i < curve.length) {
            row.push(curve.factors[i]);
          } else {
            row.push(''); // Empty cell if this curve is shorter
          }
        });
        dataRows.push(row);
      }

      return [headerRow, ...dataRows];
    }

    // Export curves to Excel file
    function exportCurvesToExcel() {
      try {
        // Check if XLSX library is available
        if (typeof XLSX === 'undefined') {
          alert('❌ Excel library not loaded. Please refresh the page and try again.');
          return;
        }

        // Create new workbook
        const workbook = XLSX.utils.book_new();

        // Sheet 1: UPH Curves
        const uphData = formatCurvesForExport('uph');
        const uphSheet = XLSX.utils.aoa_to_sheet(uphData);

        // Set column widths
        uphSheet['!cols'] = [
          { wch: 10 },  // Day column
          { wch: 25 },  // Standard 30-day Ramp
          { wch: 25 },  // Fast 20-day Ramp
          { wch: 25 }   // Slow 45-day Ramp
        ];

        XLSX.utils.book_append_sheet(workbook, uphSheet, 'UPH Curves');

        // Sheet 2: Yield Curves
        const yieldData = formatCurvesForExport('yield');
        const yieldSheet = XLSX.utils.aoa_to_sheet(yieldData);

        // Set column widths
        yieldSheet['!cols'] = [
          { wch: 10 },  // Day column
          { wch: 25 },  // Standard 30-day Yield
          { wch: 25 },  // Fast 20-day Yield
          { wch: 25 }   // Slow 45-day Yield
        ];

        XLSX.utils.book_append_sheet(workbook, yieldSheet, 'Yield Curves');

        // Sheet 3: Metadata
        const metadataRows = [
          ['Curve Name', 'Type', 'Length (Days)', 'Start Value', 'End Value'],
          // UPH curves
          ['Standard 30-day Ramp', 'UPH', 30, curvePresets.uph.standard_30d.factors[0], curvePresets.uph.standard_30d.factors[29]],
          ['Fast 20-day Ramp', 'UPH', 20, curvePresets.uph.fast_20d.factors[0], curvePresets.uph.fast_20d.factors[19]],
          ['Slow 45-day Ramp', 'UPH', 45, curvePresets.uph.slow_45d.factors[0], curvePresets.uph.slow_45d.factors[44]],
          // Yield curves
          ['Standard 30-day Yield', 'Yield', 30, curvePresets.yield.standard_30d.factors[0], curvePresets.yield.standard_30d.factors[29]],
          ['Fast 20-day Yield', 'Yield', 20, curvePresets.yield.fast_20d.factors[0], curvePresets.yield.fast_20d.factors[19]],
          ['Slow 45-day Yield', 'Yield', 45, curvePresets.yield.slow_45d.factors[0], curvePresets.yield.slow_45d.factors[44]]
        ];
        const metadataSheet = XLSX.utils.aoa_to_sheet(metadataRows);
        metadataSheet['!cols'] = [
          { wch: 25 },  // Curve Name
          { wch: 10 },  // Type
          { wch: 15 },  // Length
          { wch: 15 },  // Start Value
          { wch: 15 }   // End Value
        ];
        XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Metadata');

        // Generate filename with timestamp
        const fileName = \`Curve_Presets_\${getTimestamp()}.xlsx\`;

        // Download the file
        XLSX.writeFile(workbook, fileName);

        // Show success message
        alert(\`✅ Successfully exported curves to \${fileName}\`);

      } catch (error) {
        console.error('Export error:', error);
        alert(\`❌ Failed to export: \${error.message}\`);
      }
    }

    // Trigger file input for import
    function triggerImportExcel() {
      document.getElementById('excelFileInput').click();
    }

    // Parse Excel data from uploaded file
    function parseExcelData(workbook) {
      const result = {
        uph: {},
        yield: {}
      };

      try {
        // Parse UPH Curves sheet
        const uphSheet = workbook.Sheets['UPH Curves'];
        if (uphSheet) {
          const uphData = XLSX.utils.sheet_to_json(uphSheet, { header: 1, defval: null });

          if (uphData.length > 1) {
            const headers = uphData[0]; // First row is headers: ['Day', 'Standard 30-day Ramp', ...]

            // Map curve names to preset keys
            const curveNameToKey = {
              'Standard 30-day Ramp': 'standard_30d',
              'Fast 20-day Ramp': 'fast_20d',
              'Slow 45-day Ramp': 'slow_45d'
            };

            // For each column (skip first column which is "Day")
            for (let col = 1; col < headers.length; col++) {
              const curveName = headers[col];
              const curveKey = curveNameToKey[curveName];

              if (curveKey) {
                const factors = [];
                // Read all data rows for this column
                for (let row = 1; row < uphData.length; row++) {
                  const value = uphData[row][col];
                  if (value !== null && value !== '' && !isNaN(value)) {
                    factors.push(parseFloat(value));
                  }
                }

                if (factors.length > 0) {
                  result.uph[curveKey] = {
                    name: curveName,
                    length: factors.length,
                    factors: factors
                  };
                }
              }
            }
          }
        }

        // Parse Yield Curves sheet
        const yieldSheet = workbook.Sheets['Yield Curves'];
        if (yieldSheet) {
          const yieldData = XLSX.utils.sheet_to_json(yieldSheet, { header: 1, defval: null });

          if (yieldData.length > 1) {
            const headers = yieldData[0];

            // Map curve names to preset keys
            const curveNameToKey = {
              'Standard 30-day Yield': 'standard_30d',
              'Fast 20-day Yield': 'fast_20d',
              'Slow 45-day Yield': 'slow_45d'
            };

            // For each column (skip first column which is "Day")
            for (let col = 1; col < headers.length; col++) {
              const curveName = headers[col];
              const curveKey = curveNameToKey[curveName];

              if (curveKey) {
                const factors = [];
                // Read all data rows for this column
                for (let row = 1; row < yieldData.length; row++) {
                  const value = yieldData[row][col];
                  if (value !== null && value !== '' && !isNaN(value)) {
                    factors.push(parseFloat(value));
                  }
                }

                if (factors.length > 0) {
                  result.yield[curveKey] = {
                    name: curveName,
                    length: factors.length,
                    factors: factors
                  };
                }
              }
            }
          }
        }

        return result;

      } catch (error) {
        console.error('Error parsing Excel data:', error);
        throw new Error(\`Failed to parse Excel data: \${error.message}\`);
      }
    }

    // ========================================
    // DATA VALIDATION FUNCTIONS (Phase 3)
    // ========================================

    // Validate a single curve's data
    function validateCurveData(curve, type, curveName) {
      const errors = [];
      const warnings = [];

      // Check if curve has data
      if (!curve || !curve.factors || curve.factors.length === 0) {
        errors.push(\`Curve "\${curveName}" has no data\`);
        return { valid: false, errors, warnings };
      }

      // Check minimum length
      if (curve.factors.length < 5) {
        errors.push(\`Curve "\${curveName}" is too short (\${curve.factors.length} days). Minimum is 5 days.\`);
      }

      // Check maximum length
      if (curve.factors.length > 120) {
        errors.push(\`Curve "\${curveName}" is too long (\${curve.factors.length} days). Maximum is 120 days.\`);
      }

      // Check value ranges and data quality
      let hasInvalidValues = false;
      let hasDecreasingValues = false;
      let previousValue = -1;

      curve.factors.forEach((value, index) => {
        // Check if value is a number
        if (isNaN(value)) {
          errors.push(\`Curve "\${curveName}" has invalid value at Day \${index + 1}: "\${value}"\`);
          hasInvalidValues = true;
          return;
        }

        // Check value range (0.00 to 1.00)
        if (value < 0 || value > 1) {
          errors.push(\`Curve "\${curveName}" has out-of-range value at Day \${index + 1}: \${value} (must be 0.00-1.00)\`);
          hasInvalidValues = true;
        }

        // Check for decreasing trend (warning only for UPH curves)
        if (type === 'uph' && previousValue !== -1 && value < previousValue - 0.05) {
          hasDecreasingValues = true;
        }
        previousValue = value;
      });

      // Add warning for decreasing UPH curves
      if (type === 'uph' && hasDecreasingValues) {
        warnings.push(\`Curve "\${curveName}" has decreasing values. UPH curves typically ramp up over time.\`);
      }

      // Check if start and end values are reasonable
      const startValue = curve.factors[0];
      const endValue = curve.factors[curve.factors.length - 1];

      if (type === 'uph' && endValue < startValue) {
        warnings.push(\`Curve "\${curveName}" ends lower (\${endValue.toFixed(2)}) than it starts (\${startValue.toFixed(2)}). This is unusual for UPH ramps.\`);
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };
    }

    // Validate all imported data
    function validateImportData(importedData) {
      const allErrors = [];
      const allWarnings = [];
      let validCurveCount = 0;

      // Validate UPH curves
      if (importedData.uph) {
        Object.keys(importedData.uph).forEach(key => {
          const curve = importedData.uph[key];
          const validation = validateCurveData(curve, 'uph', curve.name);

          if (validation.valid) {
            validCurveCount++;
          }

          allErrors.push(...validation.errors);
          allWarnings.push(...validation.warnings);
        });
      }

      // Validate Yield curves
      if (importedData.yield) {
        Object.keys(importedData.yield).forEach(key => {
          const curve = importedData.yield[key];
          const validation = validateCurveData(curve, 'yield', curve.name);

          if (validation.valid) {
            validCurveCount++;
          }

          allErrors.push(...validation.errors);
          allWarnings.push(...validation.warnings);
        });
      }

      return {
        valid: allErrors.length === 0,
        errors: allErrors,
        warnings: allWarnings,
        validCurveCount: validCurveCount
      };
    }

    // Show validation report to user
    function showValidationReport(validationResult, fileName) {
      let message = \`📊 Validation Report for "\${fileName}"\\n\\n\`;

      if (validationResult.valid) {
        message += \`✅ All \${validationResult.validCurveCount} curve(s) passed validation!\\n\`;

        if (validationResult.warnings.length > 0) {
          message += \`\\n⚠️ Warnings (\${validationResult.warnings.length}):\\n\`;
          validationResult.warnings.forEach((warning, i) => {
            message += \`  \${i + 1}. \${warning}\\n\`;
          });
          message += \`\\nThese are just warnings. You can still proceed with import.\`;
        }

        message += \`\\n\\nProceed with import?\`;
        return confirm(message);

      } else {
        message += \`❌ Validation failed with \${validationResult.errors.length} error(s):\\n\\n\`;
        validationResult.errors.forEach((error, i) => {
          message += \`  \${i + 1}. \${error}\\n\`;
        });

        if (validationResult.warnings.length > 0) {
          message += \`\\n⚠️ Warnings (\${validationResult.warnings.length}):\\n\`;
          validationResult.warnings.forEach((warning, i) => {
            message += \`  \${i + 1}. \${warning}\\n\`;
          });
        }

        message += \`\\n\\nPlease fix these errors in the Excel file and try again.\`;
        alert(message);
        return false;
      }
    }

    // Apply imported curves
    function applyImportedCurves(importedData) {
      let updatedCount = 0;

      // Update UPH curves
      if (importedData.uph) {
        Object.keys(importedData.uph).forEach(key => {
          if (curvePresets.uph[key]) {
            curvePresets.uph[key] = importedData.uph[key];
            updatedCount++;
          }
        });
      }

      // Update Yield curves
      if (importedData.yield) {
        Object.keys(importedData.yield).forEach(key => {
          if (curvePresets.yield[key]) {
            curvePresets.yield[key] = importedData.yield[key];
            updatedCount++;
          }
        });
      }

      return updatedCount;
    }

    // Save all curves to parent and localStorage
    function saveAllCurves() {
      try {
        // Save to parent window
        if (window.opener && window.opener.curvePresets) {
          window.opener.curvePresets = JSON.parse(JSON.stringify(curvePresets));
        }

        // Save to localStorage
        localStorage.setItem('curvePresets', JSON.stringify(curvePresets));

        return true;
      } catch (error) {
        console.error('Error saving curves:', error);
        return false;
      }
    }

    // ========================================
    // SINGLE CURVE IMPORT/EXPORT (Phase 4)
    // ========================================

    // Export a single curve to Excel
    function exportSingleCurve(type, curveKey) {
      try {
        if (!XLSX) {
          alert('❌ Excel library not loaded. Please refresh the page.');
          return;
        }

        const curve = curvePresets[type][curveKey];
        if (!curve) {
          alert(\`❌ Curve not found: \${type} - \${curveKey}\`);
          return;
        }

        // Create workbook
        const workbook = XLSX.utils.book_new();

        // Prepare data for this single curve
        const data = [
          ['Day', curve.name],  // Header row
        ];

        // Add all day values
        curve.factors.forEach((factor, index) => {
          data.push([\`Day \${index + 1}\`, factor]);
        });

        // Create worksheet
        const worksheet = XLSX.utils.aoa_to_sheet(data);
        worksheet['!cols'] = [
          { wch: 10 },  // Day column
          { wch: 25 }   // Curve values column
        ];

        XLSX.utils.book_append_sheet(workbook, worksheet, type === 'uph' ? 'UPH Curve' : 'Yield Curve');

        // Generate filename
        const curveSafeName = curve.name.replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = \`\${curveSafeName}_\${getTimestamp()}.xlsx\`;

        // Download
        XLSX.writeFile(workbook, fileName);

        // Show success message
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = '✅';
        setTimeout(() => {
          btn.textContent = originalText;
        }, 1000);

      } catch (error) {
        console.error('Export error:', error);
        alert(\`❌ Failed to export: \${error.message}\`);
      }
    }

    // Import a single curve from Excel
    function importSingleCurve(type, curveKey) {
      // Create a temporary file input
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.xlsx,.xls';
      fileInput.style.display = 'none';

      fileInput.onchange = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            // Try to find the curve data in the first sheet
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

            if (sheetData.length < 2) {
              alert('⚠️ No data found in the Excel file.');
              return;
            }

            // Find the data column (skip "Day" column)
            let dataColumnIndex = -1;
            const headers = sheetData[0];

            // Look for a column that's not "Day"
            for (let i = 0; i < headers.length; i++) {
              if (headers[i] && headers[i] !== 'Day') {
                dataColumnIndex = i;
                break;
              }
            }

            if (dataColumnIndex === -1) {
              alert('⚠️ Could not find curve data column in the Excel file.');
              return;
            }

            // Extract the factors
            const factors = [];
            for (let row = 1; row < sheetData.length; row++) {
              const value = sheetData[row][dataColumnIndex];
              if (value !== null && value !== '' && !isNaN(value)) {
                factors.push(parseFloat(value));
              }
            }

            if (factors.length === 0) {
              alert('⚠️ No valid numeric data found in the Excel file.');
              return;
            }

            // Create temporary curve object for validation
            const tempCurve = {
              name: curvePresets[type][curveKey].name,
              length: factors.length,
              factors: factors
            };

            // Validate the curve
            const validation = validateCurveData(tempCurve, type, tempCurve.name);

            if (!validation.valid) {
              let errorMsg = \`❌ Validation failed:\\n\\n\`;
              validation.errors.forEach((error, i) => {
                errorMsg += \`  \${i + 1}. \${error}\\n\`;
              });
              alert(errorMsg);
              return;
            }

            // Show warnings if any
            if (validation.warnings.length > 0) {
              let warningMsg = \`⚠️ Warnings:\\n\\n\`;
              validation.warnings.forEach((warning, i) => {
                warningMsg += \`  \${i + 1}. \${warning}\\n\`;
              });
              warningMsg += \`\\nProceed with import?\`;

              if (!confirm(warningMsg)) {
                return;
              }
            }

            // Confirm import
            const confirmMsg = \`Import \${factors.length} days of data for "\${tempCurve.name}"?\\n\\nThis will replace the existing curve.\`;
            if (!confirm(confirmMsg)) {
              return;
            }

            // Apply the import
            curvePresets[type][curveKey] = tempCurve;

            // Save to parent window and localStorage
            if (window.opener && window.opener.curvePresets) {
              window.opener.curvePresets[type][curveKey] = JSON.parse(JSON.stringify(tempCurve));
            }

            const allPresets = JSON.parse(localStorage.getItem('curvePresets') || '{}');
            if (!allPresets[type]) allPresets[type] = {};
            allPresets[type][curveKey] = tempCurve;
            localStorage.setItem('curvePresets', JSON.stringify(allPresets));

            // Re-render this curve
            renderPreset(type, curveKey);

            // Show success
            alert(\`✅ Successfully imported \${factors.length} days for "\${tempCurve.name}"!\`);

          } catch (error) {
            console.error('Import error:', error);
            alert(\`❌ Failed to import: \${error.message}\`);
          }
        };

        reader.onerror = () => {
          alert('❌ Failed to read file.');
        };

        reader.readAsArrayBuffer(file);
      };

      // Trigger file selection
      document.body.appendChild(fileInput);
      fileInput.click();
      document.body.removeChild(fileInput);
    }

    // ========================================
    // BACKUP AND RESTORE FUNCTIONS (Phase 5)
    // ========================================

    // Create a backup of current curves
    function backupCurrentCurves() {
      try {
        const timestamp = getTimestamp();
        const backupKey = \`curvePresets_backup_\${timestamp}\`;

        // Create backup object
        const backup = {
          timestamp: timestamp,
          date: new Date().toISOString(),
          data: JSON.parse(JSON.stringify(curvePresets))
        };

        // Save to localStorage
        localStorage.setItem(backupKey, JSON.stringify(backup));

        // Update backup list in localStorage
        let backupList = JSON.parse(localStorage.getItem('curvePresets_backupList') || '[]');
        backupList.push({
          key: backupKey,
          timestamp: timestamp,
          date: backup.date
        });

        // Keep only last 10 backups
        if (backupList.length > 10) {
          const oldBackup = backupList.shift();
          localStorage.removeItem(oldBackup.key);
        }

        localStorage.setItem('curvePresets_backupList', JSON.stringify(backupList));

        return timestamp;

      } catch (error) {
        console.error('Backup error:', error);
        return null;
      }
    }

    // Get list of all backups
    function listBackups() {
      try {
        const backupList = JSON.parse(localStorage.getItem('curvePresets_backupList') || '[]');
        return backupList.reverse(); // Most recent first
      } catch (error) {
        console.error('Error listing backups:', error);
        return [];
      }
    }

    // Restore from a backup
    function restoreFromBackup(backupKey) {
      try {
        const backupData = localStorage.getItem(backupKey);
        if (!backupData) {
          alert('❌ Backup not found.');
          return false;
        }

        const backup = JSON.parse(backupData);

        // Restore the data
        curvePresets = JSON.parse(JSON.stringify(backup.data));

        // Save to current storage
        saveAllCurves();

        // Re-render UI
        renderAllPresets();

        return true;

      } catch (error) {
        console.error('Restore error:', error);
        return false;
      }
    }

    // Delete a backup
    function deleteBackup(backupKey) {
      try {
        localStorage.removeItem(backupKey);

        // Update backup list
        let backupList = JSON.parse(localStorage.getItem('curvePresets_backupList') || '[]');
        backupList = backupList.filter(b => b.key !== backupKey);
        localStorage.setItem('curvePresets_backupList', JSON.stringify(backupList));

        return true;

      } catch (error) {
        console.error('Delete backup error:', error);
        return false;
      }
    }

    // Open backup manager modal
    function openBackupManager() {
      const backups = listBackups();

      let backupListHTML = '';

      if (backups.length === 0) {
        backupListHTML = '<p class="text-slate-500 text-center py-8">No backups available</p>';
      } else {
        backupListHTML = backups.map(backup => {
          const date = new Date(backup.date);
          const dateStr = date.toLocaleString();

          return \`
            <div class="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <div class="font-semibold text-slate-900">\${dateStr}</div>
                <div class="text-xs text-slate-500">Backup ID: \${backup.timestamp}</div>
              </div>
              <div class="flex gap-2">
                <button onclick="handleRestoreBackup('\${backup.key}')"
                        class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold">
                  ♻️ Restore
                </button>
                <button onclick="handleDeleteBackup('\${backup.key}')"
                        class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-semibold">
                  🗑️ Delete
                </button>
              </div>
            </div>
          \`;
        }).join('');
      }

      const modalHTML = \`
        <div id="backupModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-auto">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-xl font-bold text-slate-900">💾 Backup Manager</h2>
              <button onclick="closeBackupManager()" class="text-slate-400 hover:text-slate-600 text-2xl">✕</button>
            </div>

            <div class="mb-4">
              <button onclick="handleCreateBackup()"
                      class="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold mb-4">
                ➕ Create New Backup
              </button>
            </div>

            <div class="border-t border-slate-200 pt-4">
              <h3 class="text-sm font-semibold text-slate-700 mb-3">Available Backups (last 10)</h3>
              <div class="space-y-2">
                \${backupListHTML}
              </div>
            </div>

            <div class="mt-6 pt-4 border-t border-slate-200 text-xs text-slate-500">
              💡 Tip: Backups are stored in your browser's localStorage and will be cleared if you clear browser data.
            </div>
          </div>
        </div>
      \`;

      // Remove existing modal if any
      const existingModal = document.getElementById('backupModal');
      if (existingModal) {
        existingModal.remove();
      }

      // Add modal to page
      document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    // Close backup manager
    function closeBackupManager() {
      const modal = document.getElementById('backupModal');
      if (modal) {
        modal.remove();
      }
    }

    // Handle create backup button
    function handleCreateBackup() {
      const timestamp = backupCurrentCurves();
      if (timestamp) {
        alert(\`✅ Backup created successfully!\\n\\nBackup ID: \${timestamp}\`);
        closeBackupManager();
        openBackupManager(); // Refresh the list
      } else {
        alert('❌ Failed to create backup.');
      }
    }

    // Handle restore backup button
    function handleRestoreBackup(backupKey) {
      const backups = listBackups();
      const backup = backups.find(b => b.key === backupKey);

      if (!backup) {
        alert('❌ Backup not found.');
        return;
      }

      const date = new Date(backup.date);
      const confirmMsg = \`Are you sure you want to restore from this backup?\\n\\nBackup Date: \${date.toLocaleString()}\\n\\nThis will replace all current curves.\`;

      if (!confirm(confirmMsg)) {
        return;
      }

      if (restoreFromBackup(backupKey)) {
        alert('✅ Successfully restored from backup!');
        closeBackupManager();
      } else {
        alert('❌ Failed to restore from backup.');
      }
    }

    // Handle delete backup button
    function handleDeleteBackup(backupKey) {
      if (!confirm('Are you sure you want to delete this backup?')) {
        return;
      }

      if (deleteBackup(backupKey)) {
        closeBackupManager();
        openBackupManager(); // Refresh the list
      } else {
        alert('❌ Failed to delete backup.');
      }
    }

    // Auto-backup before import (called from handleExcelImport)
    function autoBackupBeforeImport() {
      const timestamp = backupCurrentCurves();
      if (timestamp) {
        console.log(\`Auto-backup created before import: \${timestamp}\`);
        return true;
      }
      return false;
    }

    // Handle Excel import
    function handleExcelImport(event) {
      const file = event.target.files[0];

      if (!file) {
        return;
      }

      // Check file extension
      const fileName = file.name.toLowerCase();
      if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
        alert('⚠️ Please select a valid Excel file (.xlsx or .xls)');
        return;
      }

      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          // Read the workbook
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });

          // Check if required sheets exist
          if (!workbook.Sheets['UPH Curves'] && !workbook.Sheets['Yield Curves']) {
            alert('⚠️ Invalid Excel file! Required sheets "UPH Curves" or "Yield Curves" not found.');
            return;
          }

          // Parse the data
          const importedData = parseExcelData(workbook);

          // Check if any data was parsed
          const uphCount = Object.keys(importedData.uph).length;
          const yieldCount = Object.keys(importedData.yield).length;

          if (uphCount === 0 && yieldCount === 0) {
            alert('⚠️ No valid curve data found in the Excel file.');
            return;
          }

          // Validate the imported data (Phase 3)
          const validationResult = validateImportData(importedData);

          // Show validation report and get user confirmation
          const shouldProceed = showValidationReport(validationResult, file.name);

          if (!shouldProceed) {
            return;
          }

          // Auto-backup before import (Phase 5)
          autoBackupBeforeImport();

          // Apply the imported curves
          const updatedCount = applyImportedCurves(importedData);

          // Save to parent window and localStorage
          if (saveAllCurves()) {
            // Re-render the UI
            renderAllPresets();

            // Show success message
            alert(\`✅ Successfully imported and saved \${updatedCount} curve(s)!\\n\\nFile: \${file.name}\`);
          } else {
            alert('⚠️ Curves were imported but failed to save. Please try again.');
          }

        } catch (error) {
          console.error('Import error:', error);
          alert(\`❌ Failed to import: \${error.message}\`);
        }
      };

      reader.onerror = () => {
        alert('❌ Failed to read file. Please try again.');
      };

      // Read the file as array buffer
      reader.readAsArrayBuffer(file);

      // Reset the file input so the same file can be imported again
      event.target.value = '';
    }

    // Initialize
    renderAllPresets();
  </script>
</body>
</html>
  `);
  doc.close();
}

// Load saved curve presets from localStorage on page load
if (localStorage.getItem('curvePresets')) {
  try {
    window.curvePresets = JSON.parse(localStorage.getItem('curvePresets'));
    console.log('✅ Loaded curve presets from localStorage');
  } catch (error) {
    console.error('Error loading curve presets:', error);
  }
}
