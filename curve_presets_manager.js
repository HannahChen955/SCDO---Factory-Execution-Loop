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
  const win = window.open('', 'CurvePresetsManager', 'width=1200,height=800,scrollbars=yes');

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
    .curve-input { width: 70px; }
  </style>
</head>
<body class="bg-slate-50 p-6">
  <div class="max-w-6xl mx-auto">
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
        ${renderCurvePresetSection('uph', 'standard_30d')}
        ${renderCurvePresetSection('uph', 'fast_20d')}
        ${renderCurvePresetSection('uph', 'slow_45d')}
      </div>

      <!-- Yield Curves Content -->
      <div id="content-yield" class="space-y-6 hidden">
        ${renderCurvePresetSection('yield', 'standard_30d')}
        ${renderCurvePresetSection('yield', 'fast_20d')}
        ${renderCurvePresetSection('yield', 'slow_45d')}
      </div>

      <!-- Action Buttons -->
      <div class="mt-8 pt-6 border-t border-slate-200 flex items-center justify-end gap-3">
        <button onclick="resetAllCurvesToDefault()" class="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50">
          Reset All to Default
        </button>
        <button onclick="saveAllCurvePresets()" class="px-8 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700">
          💾 Save All Presets
        </button>
      </div>
    </div>
  </div>

  <script>
    // Load curve presets from parent window
    let curvePresets = ${JSON.stringify(window.curvePresets)};

    function switchCurveTab(type) {
      // Update tabs
      document.getElementById('tab-uph').className = type === 'uph'
        ? 'px-4 py-2 font-semibold text-blue-600 border-b-2 border-blue-600'
        : 'px-4 py-2 font-semibold text-slate-600 hover:text-slate-900';
      document.getElementById('tab-yield').className = type === 'yield'
        ? 'px-4 py-2 font-semibold text-blue-600 border-b-2 border-blue-600'
        : 'px-4 py-2 font-semibold text-slate-600 hover:text-slate-900';

      // Update content
      document.getElementById('content-uph').classList.toggle('hidden', type !== 'uph');
      document.getElementById('content-yield').classList.toggle('hidden', type !== 'yield');
    }

    function toggleCurveSection(sectionId) {
      const content = document.getElementById(sectionId);
      const toggle = document.getElementById(sectionId + '_toggle');
      content.classList.toggle('hidden');
      toggle.textContent = content.classList.contains('hidden') ? '▶' : '▼';
    }

    function updateCurveValue(type, preset, index, value) {
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue < 0 || numValue > 1) {
        alert('Invalid value! Must be between 0.00 and 1.00');
        return;
      }
      curvePresets[type][preset].factors[index] = numValue;
      updateCurveChart(type, preset);
    }

    function updateCurveChart(type, preset) {
      const curve = curvePresets[type][preset];
      const chartId = \`chart_\${type}_\${preset}\`;
      const chart = document.getElementById(chartId);

      if (!chart) return;

      // Simple ASCII-style chart
      const width = 600;
      const height = 100;
      const points = curve.factors.map((f, i) => {
        const x = (i / (curve.length - 1)) * width;
        const y = height - (f * height);
        return \`\${x},\${y}\`;
      }).join(' ');

      chart.innerHTML = \`
        <svg width="\${width}" height="\${height}" class="border border-slate-200 rounded bg-white">
          <polyline points="\${points}" fill="none" stroke="#3b82f6" stroke-width="2"/>
          <line x1="0" y1="\${height}" x2="\${width}" y2="\${height}" stroke="#cbd5e1" stroke-width="1"/>
          <text x="5" y="15" font-size="12" fill="#64748b">1.0</text>
          <text x="5" y="\${height - 5}" font-size="12" fill="#64748b">0.0</text>
        </svg>
      \`;
    }

    function saveAllCurvePresets() {
      try {
        // Save to parent window
        window.opener.curvePresets = curvePresets;

        // Save to localStorage
        localStorage.setItem('curvePresets', JSON.stringify(curvePresets));

        alert('✅ All curve presets saved successfully!');
      } catch (error) {
        console.error('Error saving curve presets:', error);
        alert('❌ Failed to save curve presets: ' + error.message);
      }
    }

    function resetAllCurvesToDefault() {
      if (!confirm('Are you sure you want to reset all curves to default values?')) {
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

      // Reload the page
      location.reload();
    }

    function generateLinearRamp(length, startValue, endValue) {
      const factors = [];
      const increment = (endValue - startValue) / (length - 1);
      for (let i = 0; i < length; i++) {
        factors.push(parseFloat((startValue + increment * i).toFixed(4)));
      }
      return factors;
    }

    // Initialize charts
    ['uph', 'yield'].forEach(type => {
      ['standard_30d', 'fast_20d', 'slow_45d'].forEach(preset => {
        updateCurveChart(type, preset);
      });
    });
  </script>
</body>
</html>
  `);
  doc.close();
}

// Helper function to render curve preset section
function renderCurvePresetSection(type, presetKey) {
  const preset = window.curvePresets[type][presetKey];
  const sectionId = `section_${type}_${presetKey}`;

  // Generate input fields for curve factors (show first 10, last 5, and middle sample)
  const factorInputs = [];
  const length = preset.length;

  // Show first 10 days
  for (let i = 0; i < Math.min(10, length); i++) {
    factorInputs.push(`
      <div class="flex items-center gap-2">
        <span class="text-xs text-slate-600 w-16">Day ${i + 1}:</span>
        <input type="number" step="0.01" min="0" max="1" value="${preset.factors[i].toFixed(2)}"
               onchange="updateCurveValue('${type}', '${presetKey}', ${i}, this.value)"
               class="curve-input border rounded px-2 py-1 text-sm">
      </div>
    `);
  }

  // Add ellipsis if more than 15 days
  if (length > 15) {
    factorInputs.push(`<div class="text-center text-slate-400">...</div>`);

    // Show last 5 days
    for (let i = length - 5; i < length; i++) {
      factorInputs.push(`
        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-600 w-16">Day ${i + 1}:</span>
          <input type="number" step="0.01" min="0" max="1" value="${preset.factors[i].toFixed(2)}"
                 onchange="updateCurveValue('${type}', '${presetKey}', ${i}, this.value)"
                 class="curve-input border rounded px-2 py-1 text-sm">
        </div>
      `);
    }
  } else if (length > 10) {
    // Show remaining days
    for (let i = 10; i < length; i++) {
      factorInputs.push(`
        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-600 w-16">Day ${i + 1}:</span>
          <input type="number" step="0.01" min="0" max="1" value="${preset.factors[i].toFixed(2)}"
                 onchange="updateCurveValue('${type}', '${presetKey}', ${i}, this.value)"
                 class="curve-input border rounded px-2 py-1 text-sm">
        </div>
      `);
    }
  }

  return `
    <div class="border-2 border-slate-200 rounded-lg p-5 bg-gradient-to-r from-slate-50 to-white">
      <div class="flex items-center justify-between mb-4 cursor-pointer" onclick="toggleCurveSection('${sectionId}')">
        <div class="flex items-center gap-3">
          <span id="${sectionId}_toggle" class="text-slate-600 text-lg">▼</span>
          <div>
            <h3 class="text-lg font-bold text-slate-900">${preset.name}</h3>
            <p class="text-sm text-slate-600">${preset.length} workdays | Start: ${preset.factors[0].toFixed(2)} → End: ${preset.factors[preset.length - 1].toFixed(2)}</p>
          </div>
        </div>
        <button onclick="event.stopPropagation(); editAllValues('${type}', '${presetKey}')"
                class="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs font-semibold">
          ✏️ Edit All Values
        </button>
      </div>

      <div id="${sectionId}">
        <!-- Preview Chart -->
        <div class="mb-4">
          <div id="chart_${type}_${presetKey}" class="w-full"></div>
        </div>

        <!-- Curve Values (Sample) -->
        <div class="grid grid-cols-5 gap-3">
          ${factorInputs.join('')}
        </div>
      </div>
    </div>
  `;
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
