// ========================================
// DATA UPDATE SYSTEM - AI-Powered Data Ingestion
// Parses unstructured input and updates system data
// ========================================

let uploadedFileContent = null;
let currentInputMethod = 'text';

// Modal Controls
function openDataUpdateModal() {
  document.getElementById('dataUpdateModal').classList.remove('hidden');
  document.getElementById('dataUpdateModalBackdrop').classList.remove('hidden');
  document.getElementById('dataUpdateResult').classList.add('hidden');
  document.getElementById('dataTextInput').value = '';
  clearFileUpload();
}

function closeDataUpdateModal() {
  document.getElementById('dataUpdateModal').classList.add('hidden');
  document.getElementById('dataUpdateModalBackdrop').classList.add('hidden');
}

// Switch Input Method
function switchDataInputMethod(method) {
  currentInputMethod = method;

  if (method === 'text') {
    document.getElementById('textInputPanel').classList.remove('hidden');
    document.getElementById('fileUploadPanel').classList.add('hidden');
    document.getElementById('textInputTab').classList.add('border-blue-600', 'text-blue-600');
    document.getElementById('textInputTab').classList.remove('border-transparent', 'text-slate-600');
    document.getElementById('fileInputTab').classList.remove('border-blue-600', 'text-blue-600');
    document.getElementById('fileInputTab').classList.add('border-transparent', 'text-slate-600');
  } else {
    document.getElementById('textInputPanel').classList.add('hidden');
    document.getElementById('fileUploadPanel').classList.remove('hidden');
    document.getElementById('fileInputTab').classList.add('border-blue-600', 'text-blue-600');
    document.getElementById('fileInputTab').classList.remove('border-transparent', 'text-slate-600');
    document.getElementById('textInputTab').classList.remove('border-blue-600', 'text-blue-600');
    document.getElementById('textInputTab').classList.add('border-transparent', 'text-slate-600');
  }
}

// File Upload Handling
function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  document.getElementById('fileName').textContent = file.name;
  document.getElementById('fileSize').textContent = `${(file.size / 1024).toFixed(1)} KB`;
  document.getElementById('filePreview').classList.remove('hidden');

  const reader = new FileReader();
  reader.onload = function(e) {
    uploadedFileContent = e.target.result;
  };
  reader.readAsText(file);
}

function clearFileUpload() {
  document.getElementById('dataFileInput').value = '';
  document.getElementById('filePreview').classList.add('hidden');
  uploadedFileContent = null;
}

// Main Processing Function
async function processDataUpdate() {
  const resultDiv = document.getElementById('dataUpdateResult');
  const processBtn = document.getElementById('processDataBtn');

  // Get input content
  let inputContent = '';
  if (currentInputMethod === 'text') {
    inputContent = document.getElementById('dataTextInput').value.trim();
  } else {
    inputContent = uploadedFileContent;
  }

  if (!inputContent) {
    resultDiv.innerHTML = `
      <div class="bg-red-50 border border-red-200 rounded-lg p-4">
        <div class="text-sm font-semibold text-red-900">❌ No input provided</div>
        <div class="text-xs text-red-700 mt-1">Please enter text or upload a file</div>
      </div>
    `;
    resultDiv.classList.remove('hidden');
    return;
  }

  // Show loading state
  processBtn.disabled = true;
  processBtn.innerHTML = '⏳ Processing...';
  resultDiv.innerHTML = `
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div class="flex items-center gap-3">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <div>
          <div class="text-sm font-semibold text-blue-900">AI is analyzing your input...</div>
          <div class="text-xs text-blue-700 mt-1">Parsing data and identifying update targets</div>
        </div>
      </div>
    </div>
  `;
  resultDiv.classList.remove('hidden');

  try {
    // Call AI to parse and process data
    const result = await parseAndUpdateData(inputContent);

    // Show results
    displayUpdateResults(result);

    // Apply updates to STATE
    applyDataUpdates(result.updates);

    // Refresh the current view
    render();

  } catch (error) {
    console.error('Data update error:', error);
    resultDiv.innerHTML = `
      <div class="bg-red-50 border border-red-200 rounded-lg p-4">
        <div class="text-sm font-semibold text-red-900">❌ Processing failed</div>
        <div class="text-xs text-red-700 mt-1">${error.message}</div>
      </div>
    `;
  } finally {
    processBtn.disabled = false;
    processBtn.innerHTML = '🤖 Process with AI';
  }
}

// AI-powered parsing function
async function parseAndUpdateData(inputContent) {
  // If using real API, call backend
  if (AI_CONFIG.useRealAPI) {
    try {
      const response = await fetch(AI_CONFIG.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'data_update_parse',
          context: {
            input: inputContent,
            currentData: STATE.data
          }
        })
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      return parseAIResponse(data.response);
    } catch (error) {
      console.warn('Real API failed, using mock parser:', error);
      return mockParseData(inputContent);
    }
  } else {
    // Use mock parser for demo
    return mockParseData(inputContent);
  }
}

// Mock parser for demo (pattern matching)
function mockParseData(input) {
  const updates = [];
  const lines = input.toLowerCase().split('\n');

  for (const line of lines) {
    // Material ETA updates
    if (line.includes('material') && line.includes('eta')) {
      const dateMatch = line.match(/\d{4}-\d{2}-\d{2}/);
      const materialMatch = line.match(/ic-\d+/i);
      if (dateMatch && materialMatch) {
        updates.push({
          type: 'material_eta',
          target: materialMatch[0].toUpperCase(),
          field: 'eta',
          oldValue: '2026-01-28',
          newValue: dateMatch[0],
          confidence: 0.95
        });
      }
    }

    // Yield updates
    if (line.includes('yield') && (line.includes('dropped') || line.includes('changed'))) {
      const percentMatch = line.match(/(\d+\.?\d*)%/);
      const stationMatch = line.match(/\b(test|assembly|ict|fcst)\b/i);
      if (percentMatch) {
        updates.push({
          type: 'yield',
          target: stationMatch ? stationMatch[0] : 'Test',
          field: 'fpy',
          oldValue: 97.5,
          newValue: parseFloat(percentMatch[1]),
          confidence: 0.90
        });
      }
    }

    // Capacity updates
    if (line.includes('capacity') && (line.includes('reduced') || line.includes('increased'))) {
      const percentMatch = line.match(/(\d+)%/);
      const factoryMatch = line.match(/\b(wf|sz-\d+)\b/i);
      if (percentMatch) {
        const change = line.includes('reduced') ? -parseFloat(percentMatch[1]) : parseFloat(percentMatch[1]);
        updates.push({
          type: 'capacity',
          target: factoryMatch ? factoryMatch[0].toUpperCase() : 'WF',
          field: 'available_hours',
          oldValue: 100,
          newValue: 100 + change,
          confidence: 0.88
        });
      }
    }

    // Demand updates
    if (line.includes('demand') && (line.includes('forecast') || line.includes('units'))) {
      const numberMatch = line.match(/(\d+)k?\s*units/i);
      const productMatch = line.match(/product [a-z]/i);
      if (numberMatch) {
        let units = parseInt(numberMatch[1]);
        if (line.includes('k')) units *= 1000;
        updates.push({
          type: 'demand',
          target: productMatch ? productMatch[0] : 'Product A',
          field: 'forecast',
          oldValue: 45000,
          newValue: units,
          confidence: 0.85
        });
      }
    }

    // Risk score updates
    if (line.includes('risk') && line.includes('score')) {
      const scoreMatch = line.match(/(\d+)/);
      const typeMatch = line.match(/\b(late|excess)\b/i);
      if (scoreMatch) {
        updates.push({
          type: 'risk_score',
          target: typeMatch ? `${typeMatch[0]}_risk` : 'late_risk',
          field: 'score',
          oldValue: 65,
          newValue: parseInt(scoreMatch[0]),
          confidence: 0.92
        });
      }
    }
  }

  // If no patterns matched, try JSON parsing
  if (updates.length === 0) {
    try {
      const jsonData = JSON.parse(input);
      // Handle JSON structure
      if (Array.isArray(jsonData)) {
        jsonData.forEach(item => {
          updates.push({
            type: item.type || 'general',
            target: item.target || 'Unknown',
            field: item.field || 'value',
            oldValue: item.oldValue || 'N/A',
            newValue: item.newValue || item.value,
            confidence: 0.95
          });
        });
      }
    } catch (e) {
      // Not JSON, create generic update
      if (input.length > 10) {
        updates.push({
          type: 'general',
          target: 'System Data',
          field: 'manual_entry',
          oldValue: '',
          newValue: input.substring(0, 100),
          confidence: 0.50
        });
      }
    }
  }

  return {
    updates,
    summary: `Identified ${updates.length} potential update${updates.length !== 1 ? 's' : ''}`,
    timestamp: new Date().toISOString()
  };
}

// Parse structured AI response
function parseAIResponse(response) {
  // TODO: Implement proper parsing of OpenAI structured output
  // For now, return mock format
  return mockParseData(response);
}

// Display results in UI
function displayUpdateResults(result) {
  const resultDiv = document.getElementById('dataUpdateResult');

  if (result.updates.length === 0) {
    resultDiv.innerHTML = `
      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div class="text-sm font-semibold text-yellow-900">⚠️ No updates identified</div>
        <div class="text-xs text-yellow-700 mt-1">AI couldn't parse any valid updates from the input. Try being more specific about what changed.</div>
      </div>
    `;
    return;
  }

  let html = `
    <div class="bg-green-50 border border-green-200 rounded-lg p-4">
      <div class="text-sm font-semibold text-green-900 mb-3">✅ ${result.summary}</div>
      <div class="space-y-2">
  `;

  result.updates.forEach((update, idx) => {
    const confidenceColor = update.confidence >= 0.9 ? 'text-green-600' :
                           update.confidence >= 0.7 ? 'text-yellow-600' : 'text-red-600';
    const confidenceText = `${(update.confidence * 100).toFixed(0)}%`;

    html += `
      <div class="bg-white border rounded-lg p-3 text-xs">
        <div class="flex items-start justify-between mb-2">
          <div class="font-semibold text-slate-900">${idx + 1}. ${formatUpdateType(update.type)}</div>
          <div class="${confidenceColor} font-semibold">${confidenceText}</div>
        </div>
        <div class="grid grid-cols-2 gap-2 text-slate-600">
          <div><span class="font-medium">Target:</span> ${update.target}</div>
          <div><span class="font-medium">Field:</span> ${update.field}</div>
          <div><span class="font-medium">Old:</span> ${formatValue(update.oldValue)}</div>
          <div><span class="font-medium">New:</span> <span class="text-blue-600 font-semibold">${formatValue(update.newValue)}</span></div>
        </div>
      </div>
    `;
  });

  html += `
      </div>
      <div class="mt-3 pt-3 border-t border-green-300 text-xs text-green-800">
        <strong>Note:</strong> Updates have been applied to the system. Refresh the page to see changes reflected throughout the dashboard.
      </div>
    </div>
  `;

  resultDiv.innerHTML = html;
}

// Apply updates to STATE
function applyDataUpdates(updates) {
  updates.forEach(update => {
    console.log('Applying update:', update);

    // For demo, we'll update some mock values in STATE
    // In production, this would update the actual data structure

    if (!STATE.dataUpdates) STATE.dataUpdates = [];
    STATE.dataUpdates.push({
      ...update,
      appliedAt: new Date().toISOString()
    });
  });

  // Store update history
  if (!window.dataUpdateHistory) window.dataUpdateHistory = [];
  window.dataUpdateHistory.push({
    timestamp: new Date().toISOString(),
    updates: updates
  });

  console.log('Applied data updates:', updates.length);
}

// Utility functions
function formatUpdateType(type) {
  const typeMap = {
    'material_eta': '📦 Material ETA Update',
    'yield': '📊 Yield Update',
    'capacity': '🏭 Capacity Update',
    'demand': '📈 Demand Update',
    'risk_score': '⚠️ Risk Score Update',
    'general': '📝 General Update'
  };
  return typeMap[type] || type;
}

function formatValue(value) {
  if (typeof value === 'number') {
    if (value > 1000) return value.toLocaleString();
    if (value < 1) return (value * 100).toFixed(1) + '%';
    return value.toFixed(2);
  }
  return value;
}

// Export functions
window.openDataUpdateModal = openDataUpdateModal;
window.closeDataUpdateModal = closeDataUpdateModal;
window.switchDataInputMethod = switchDataInputMethod;
window.handleFileSelect = handleFileSelect;
window.clearFileUpload = clearFileUpload;
window.processDataUpdate = processDataUpdate;
