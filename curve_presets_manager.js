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
    factors.push(parseFloat((startValue + increment * i).toFixed(4)));
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
        <button onclick="window.close()" class="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg text-sm font-semibold">
          ✕ Close
        </button>
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
      <div class="mt-8 pt-6 border-t border-slate-200 flex items-center justify-end gap-3">
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
