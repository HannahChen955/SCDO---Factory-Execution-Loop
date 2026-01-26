// ============================================================================
// Forecast & CTB Data Management Module
// Handles upload, versioning, history, and comparison of Forecast and CTB data
// ============================================================================

// =========================
// Data Storage (LocalStorage)
// =========================

const STORAGE_KEYS = {
  FORECAST_DATA: 'productionPlan_forecast_versions',
  CTB_DATA: 'productionPlan_ctb_versions',
  PLAN_VERSIONS: 'productionPlan_plan_versions',
  POR_VERSION: 'productionPlan_por_version'
};

// Initialize data storage with mock data if not exists
function initializeDataStorage() {
  // Initialize Forecast data with mock data
  if (!localStorage.getItem(STORAGE_KEYS.FORECAST_DATA)) {
    const mockForecastData = [
      {
        version: "v1",
        releaseDate: "2026-01-15",
        uploadedAt: "2026-01-15T09:00:00.000Z",
        fileName: "forecast_demo_v1.xlsx",
        data: [
          { week_id: "2026-W40", weekly_forecast: 45000, cum_forecast: 45000 },
          { week_id: "2026-W41", weekly_forecast: 52000, cum_forecast: 97000 },
          { week_id: "2026-W42", weekly_forecast: 48000, cum_forecast: 145000 },
          { week_id: "2026-W43", weekly_forecast: 55000, cum_forecast: 200000 },
          { week_id: "2026-W44", weekly_forecast: 50000, cum_forecast: 250000 },
          { week_id: "2026-W45", weekly_forecast: 53000, cum_forecast: 303000 },
          { week_id: "2026-W46", weekly_forecast: 51000, cum_forecast: 354000 },
          { week_id: "2026-W47", weekly_forecast: 49000, cum_forecast: 403000 }
        ]
      },
      {
        version: "v2",
        releaseDate: "2026-01-20",
        uploadedAt: "2026-01-20T14:30:00.000Z",
        fileName: "forecast_demo_v2.xlsx",
        data: [
          { week_id: "2026-W40", weekly_forecast: 48000, cum_forecast: 48000 },
          { week_id: "2026-W41", weekly_forecast: 55000, cum_forecast: 103000 },
          { week_id: "2026-W42", weekly_forecast: 50000, cum_forecast: 153000 },
          { week_id: "2026-W43", weekly_forecast: 57000, cum_forecast: 210000 },
          { week_id: "2026-W44", weekly_forecast: 52000, cum_forecast: 262000 },
          { week_id: "2026-W45", weekly_forecast: 54000, cum_forecast: 316000 },
          { week_id: "2026-W46", weekly_forecast: 53000, cum_forecast: 369000 },
          { week_id: "2026-W47", weekly_forecast: 51000, cum_forecast: 420000 }
        ]
      }
    ];
    localStorage.setItem(STORAGE_KEYS.FORECAST_DATA, JSON.stringify(mockForecastData));
  }

  // Initialize CTB data with mock data
  if (!localStorage.getItem(STORAGE_KEYS.CTB_DATA)) {
    const mockCTBData = [
      {
        version: "v1",
        updateDate: "2026-01-16",
        uploadedAt: "2026-01-16T10:00:00.000Z",
        fileName: "ctb_demo_v1.xlsx",
        data: [
          { week_id: "2026-W40", site: "VN01", weekly_ctb: 28000, cum_ctb: 28000 },
          { week_id: "2026-W40", site: "VN02", weekly_ctb: 15000, cum_ctb: 15000 },
          { week_id: "2026-W41", site: "VN01", weekly_ctb: 30000, cum_ctb: 58000 },
          { week_id: "2026-W41", site: "VN02", weekly_ctb: 18000, cum_ctb: 33000 },
          { week_id: "2026-W42", site: "VN01", weekly_ctb: 29000, cum_ctb: 87000 },
          { week_id: "2026-W42", site: "VN02", weekly_ctb: 16000, cum_ctb: 49000 },
          { week_id: "2026-W43", site: "VN01", weekly_ctb: 32000, cum_ctb: 119000 },
          { week_id: "2026-W43", site: "VN02", weekly_ctb: 19000, cum_ctb: 68000 },
          { week_id: "2026-W44", site: "VN01", weekly_ctb: 31000, cum_ctb: 150000 },
          { week_id: "2026-W44", site: "VN02", weekly_ctb: 17000, cum_ctb: 85000 },
          { week_id: "2026-W45", site: "VN01", weekly_ctb: 30000, cum_ctb: 180000 },
          { week_id: "2026-W45", site: "VN02", weekly_ctb: 18000, cum_ctb: 103000 },
          { week_id: "2026-W46", site: "VN01", weekly_ctb: 29000, cum_ctb: 209000 },
          { week_id: "2026-W46", site: "VN02", weekly_ctb: 17000, cum_ctb: 120000 },
          { week_id: "2026-W47", site: "VN01", weekly_ctb: 28000, cum_ctb: 237000 },
          { week_id: "2026-W47", site: "VN02", weekly_ctb: 16000, cum_ctb: 136000 }
        ]
      },
      {
        version: "v2",
        updateDate: "2026-01-21",
        uploadedAt: "2026-01-21T11:00:00.000Z",
        fileName: "ctb_demo_v2.xlsx",
        data: [
          { week_id: "2026-W40", site: "VN01", weekly_ctb: 30000, cum_ctb: 30000 },
          { week_id: "2026-W40", site: "VN02", weekly_ctb: 16000, cum_ctb: 16000 },
          { week_id: "2026-W41", site: "VN01", weekly_ctb: 32000, cum_ctb: 62000 },
          { week_id: "2026-W41", site: "VN02", weekly_ctb: 19000, cum_ctb: 35000 },
          { week_id: "2026-W42", site: "VN01", weekly_ctb: 31000, cum_ctb: 93000 },
          { week_id: "2026-W42", site: "VN02", weekly_ctb: 17000, cum_ctb: 52000 },
          { week_id: "2026-W43", site: "VN01", weekly_ctb: 33000, cum_ctb: 126000 },
          { week_id: "2026-W43", site: "VN02", weekly_ctb: 20000, cum_ctb: 72000 },
          { week_id: "2026-W44", site: "VN01", weekly_ctb: 32000, cum_ctb: 158000 },
          { week_id: "2026-W44", site: "VN02", weekly_ctb: 18000, cum_ctb: 90000 },
          { week_id: "2026-W45", site: "VN01", weekly_ctb: 31000, cum_ctb: 189000 },
          { week_id: "2026-W45", site: "VN02", weekly_ctb: 19000, cum_ctb: 109000 },
          { week_id: "2026-W46", site: "VN01", weekly_ctb: 30000, cum_ctb: 219000 },
          { week_id: "2026-W46", site: "VN02", weekly_ctb: 18000, cum_ctb: 127000 },
          { week_id: "2026-W47", site: "VN01", weekly_ctb: 29000, cum_ctb: 248000 },
          { week_id: "2026-W47", site: "VN02", weekly_ctb: 17000, cum_ctb: 144000 }
        ]
      }
    ];
    localStorage.setItem(STORAGE_KEYS.CTB_DATA, JSON.stringify(mockCTBData));
  }

  // Initialize Plan Versions (empty by default)
  if (!localStorage.getItem(STORAGE_KEYS.PLAN_VERSIONS)) {
    localStorage.setItem(STORAGE_KEYS.PLAN_VERSIONS, JSON.stringify([]));
  }
}

// =========================
// Forecast Management
// =========================

/**
 * Upload Forecast Data
 */
function uploadForecast() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.xlsx,.xls';

  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    showNotification('📤 Uploading forecast data...', 'info');

    try {
      // Read Excel file
      const data = await readExcelFile(file);

      // Validate data structure
      if (!validateForecastData(data)) {
        throw new Error('Invalid forecast data format');
      }

      // Get existing versions
      const versions = JSON.parse(localStorage.getItem(STORAGE_KEYS.FORECAST_DATA) || '[]');

      // Create new version
      const newVersion = {
        version: `v${versions.length + 1}`,
        releaseDate: new Date().toISOString().split('T')[0],
        uploadedAt: new Date().toISOString(),
        data: data,
        fileName: file.name
      };

      // Save to storage
      versions.push(newVersion);
      localStorage.setItem(STORAGE_KEYS.FORECAST_DATA, JSON.stringify(versions));

      // Update UI
      updateForecastSummary(newVersion);

      showNotification(`✅ Forecast ${newVersion.version} uploaded successfully!`, 'success');
    } catch (error) {
      console.error('Error uploading forecast:', error);
      showNotification(`❌ Error uploading forecast: ${error.message}`, 'error');
    }
  };

  input.click();
}

/**
 * Validate Forecast Data
 */
function validateForecastData(data) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return false;
  }

  // Check required columns: week_id, weekly_forecast, cum_forecast
  const requiredColumns = ['week_id', 'weekly_forecast', 'cum_forecast'];
  const firstRow = data[0];

  return requiredColumns.every(col => col in firstRow);
}

/**
 * Update Forecast Summary Display
 */
function updateForecastSummary(versionData) {
  // Update version info
  document.getElementById('forecastVersion').textContent = versionData.version;
  document.getElementById('forecastReleaseDate').textContent = versionData.releaseDate;

  // Get recent 4 weeks
  const recentWeeks = versionData.data.slice(0, 4);

  // Update table
  const tbody = document.getElementById('forecastSummaryTable');
  tbody.innerHTML = recentWeeks.map(row => `
    <tr class="border-t hover:bg-purple-50">
      <td class="px-3 py-2">${row.week_id}</td>
      <td class="px-3 py-2 text-right font-mono">${parseInt(row.weekly_forecast).toLocaleString()}</td>
      <td class="px-3 py-2 text-right font-mono font-semibold">${parseInt(row.cum_forecast).toLocaleString()}</td>
    </tr>
  `).join('');
}

/**
 * View All Forecast Weeks (New Page)
 */
function viewAllForecastWeeks() {
  const versions = JSON.parse(localStorage.getItem(STORAGE_KEYS.FORECAST_DATA) || '[]');

  if (versions.length === 0) {
    showNotification('⚠️ No forecast data available. Please upload first.', 'warning');
    return;
  }

  // Get latest version
  const latestVersion = versions[versions.length - 1];

  // Create new window content
  const content = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Forecast Weekly Details - ${latestVersion.version}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      </style>
    </head>
    <body class="bg-slate-50 p-8">
      <div class="max-w-6xl mx-auto">
        <div class="mb-6">
          <button onclick="window.close()" class="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700">
            ← Back
          </button>
        </div>

        <div class="bg-white rounded-xl shadow-lg p-6">
          <div class="mb-6">
            <h1 class="text-2xl font-bold text-slate-900 mb-2">Forecast Weekly Details (Editable)</h1>
            <div class="text-sm text-slate-600">
              <span class="font-semibold">Version:</span> ${latestVersion.version} |
              <span class="font-semibold">Released:</span> ${latestVersion.releaseDate}
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-sm border-collapse">
              <thead class="bg-purple-100">
                <tr>
                  <th class="px-4 py-3 text-left border">Week ID</th>
                  <th class="px-4 py-3 text-right border">Weekly Forecast</th>
                  <th class="px-4 py-3 text-right border">Cum Forecast</th>
                  <th class="px-4 py-3 text-center border">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${latestVersion.data.map((row, idx) => `
                  <tr class="hover:bg-purple-50 border-b">
                    <td class="px-4 py-2 border">${row.week_id}</td>
                    <td class="px-4 py-2 border text-right">
                      <input type="number" id="weekly_${idx}"
                             value="${row.weekly_forecast}"
                             class="w-full px-2 py-1 border rounded text-right"
                             onchange="updateCumulative(${idx})">
                    </td>
                    <td class="px-4 py-2 border text-right font-semibold" id="cum_${idx}">
                      ${parseInt(row.cum_forecast).toLocaleString()}
                    </td>
                    <td class="px-4 py-2 border text-center">
                      <button onclick="resetRow(${idx})" class="text-blue-600 hover:text-blue-800 text-xs">Reset</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="mt-6 flex gap-3">
            <button onclick="saveChanges()" class="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700">
              💾 Save Changes
            </button>
            <button onclick="revertChanges()" class="px-6 py-3 border border-slate-300 rounded-lg font-semibold hover:bg-slate-50">
              ↻ Revert All
            </button>
            <button onclick="exportData()" class="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700">
              📤 Export
            </button>
          </div>
        </div>
      </div>

      <script>
        const originalData = ${JSON.stringify(latestVersion.data)};

        function updateCumulative(idx) {
          // Recalculate cumulative from start
          let cumSum = 0;
          for (let i = 0; i <= idx; i++) {
            const weeklyInput = document.getElementById('weekly_' + i);
            cumSum += parseInt(weeklyInput.value || 0);
            document.getElementById('cum_' + i).textContent = cumSum.toLocaleString();
          }
        }

        function resetRow(idx) {
          document.getElementById('weekly_' + idx).value = originalData[idx].weekly_forecast;
          updateCumulative(idx);
        }

        function revertChanges() {
          originalData.forEach((row, idx) => {
            document.getElementById('weekly_' + idx).value = row.weekly_forecast;
            document.getElementById('cum_' + idx).textContent = parseInt(row.cum_forecast).toLocaleString();
          });
        }

        function saveChanges() {
          // Collect updated data
          const updatedData = originalData.map((row, idx) => ({
            ...row,
            weekly_forecast: parseInt(document.getElementById('weekly_' + idx).value)
          }));

          // Recalculate cumulative
          let cumSum = 0;
          updatedData.forEach(row => {
            cumSum += row.weekly_forecast;
            row.cum_forecast = cumSum;
          });

          // Send back to parent window
          if (window.opener && window.opener.updateForecastFromEdit) {
            window.opener.updateForecastFromEdit(updatedData);
            alert('✅ Changes saved successfully!');
            window.close();
          }
        }

        function exportData() {
          alert('📊 Export feature coming soon!');
        }
      </script>
    </body>
    </html>
  `;

  const newWindow = window.open('', '_blank', 'width=1200,height=800');
  newWindow.document.write(content);
  newWindow.document.close();
}

/**
 * Update forecast from edit window
 */
function updateForecastFromEdit(updatedData) {
  const versions = JSON.parse(localStorage.getItem(STORAGE_KEYS.FORECAST_DATA) || '[]');

  if (versions.length > 0) {
    // Update latest version
    const latestVersion = versions[versions.length - 1];
    latestVersion.data = updatedData;
    latestVersion.lastModified = new Date().toISOString();

    // Save
    localStorage.setItem(STORAGE_KEYS.FORECAST_DATA, JSON.stringify(versions));

    // Update UI
    updateForecastSummary(latestVersion);

    showNotification('✅ Forecast updated successfully!', 'success');
  }
}

/**
 * View Forecast History
 */
function viewForecastHistory() {
  const versions = JSON.parse(localStorage.getItem(STORAGE_KEYS.FORECAST_DATA) || '[]');

  if (versions.length === 0) {
    showNotification('⚠️ No forecast history available. Please upload forecast data first.', 'warning');
    return;
  }

  // Create history view in new window
  const historyWindow = window.open('', '_blank', 'width=1400,height=900');
  const doc = historyWindow.document;

  doc.write('<!DOCTYPE html><html><head>');
  doc.write('<title>Forecast Version History<\/title>');
  doc.write('<script src="https://cdn.tailwindcss.com"><\/script>');
  doc.write('<style>body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }<\/style>');
  doc.write('<\/head><body class="bg-slate-50 p-8">');
  doc.write('<div class="max-w-7xl mx-auto">');
  doc.write('<div class="mb-6 flex items-center justify-between">');
  doc.write('<h1 class="text-3xl font-bold text-slate-900">📜 Forecast Version History<\/h1>');
  doc.write('<button onclick="window.close()" class="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700">← Close<\/button>');
  doc.write('<\/div><div class="bg-white rounded-xl shadow-lg p-6">');
  doc.write('<div class="mb-4 text-sm text-slate-600">Total Versions: <span class="font-semibold">' + versions.length + '<\/span><\/div>');
  doc.write('<div class="overflow-x-auto"><table class="w-full text-sm">');
  doc.write('<thead class="bg-purple-100"><tr>');
  doc.write('<th class="px-4 py-3 text-left border">Version<\/th>');
  doc.write('<th class="px-4 py-3 text-left border">Release Date<\/th>');
  doc.write('<th class="px-4 py-3 text-left border">Uploaded At<\/th>');
  doc.write('<th class="px-4 py-3 text-left border">File Name<\/th>');
  doc.write('<th class="px-4 py-3 text-center border">Weeks<\/th>');
  doc.write('<th class="px-4 py-3 text-center border">Actions<\/th>');
  doc.write('<\/tr><\/thead><tbody>');

  versions.forEach(function(ver, idx) {
    const isLatest = idx === versions.length - 1;
    const uploadTime = new Date(ver.uploadedAt).toLocaleString();
    const weeksCount = ver.data.length;

    doc.write('<tr class="border-b hover:bg-purple-50' + (isLatest ? ' bg-purple-50 font-semibold' : '') + '">');
    doc.write('<td class="px-4 py-3 border">' + ver.version);
    if (isLatest) {
      doc.write('<span class="ml-2 px-2 py-1 bg-purple-600 text-white text-xs rounded">Latest<\/span>');
    }
    doc.write('<\/td>');
    doc.write('<td class="px-4 py-3 border">' + ver.releaseDate + '<\/td>');
    doc.write('<td class="px-4 py-3 border text-xs text-slate-600">' + uploadTime + '<\/td>');
    doc.write('<td class="px-4 py-3 border text-xs">' + ver.fileName + '<\/td>');
    doc.write('<td class="px-4 py-3 border text-center">' + weeksCount + '<\/td>');
    doc.write('<td class="px-4 py-3 border text-center">');
    doc.write('<button onclick="viewVersion(' + idx + ')" class="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 mr-1">👁️ View<\/button>');
    if (!isLatest) {
      doc.write('<button onclick="switchToVersion(' + idx + ')" class="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">↻ Switch<\/button>');
    }
    doc.write('<\/td><\/tr>');
  });

  doc.write('<\/tbody><\/table><\/div><\/div><\/div>');

  // Write JavaScript functions
  doc.write('<script>');
  doc.write('var allVersions = ' + JSON.stringify(versions) + ';');
  doc.write('function viewVersion(idx) {');
  doc.write('  var version = allVersions[idx];');
  doc.write('  var detailWindow = window.open("", "_blank", "width=1200,height=800");');
  doc.write('  var d = detailWindow.document;');
  doc.write('  d.write("<!DOCTYPE html><html><head>");');
  doc.write('  d.write("<title>Forecast " + version.version + " - Details<\\/title>");');
  doc.write('  d.write("<script src=\\"https://cdn.tailwindcss.com\\"><\\/script>");');
  doc.write('  d.write("<\\/head><body class=\\"bg-slate-50 p-8\\">");');
  doc.write('  d.write("<div class=\\"max-w-6xl mx-auto\\">");');
  doc.write('  d.write("<div class=\\"mb-6\\"><button onclick=\\"window.close()\\" class=\\"px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700\\">← Back<\\/button><\\/div>");');
  doc.write('  d.write("<div class=\\"bg-white rounded-xl shadow-lg p-6\\">");');
  doc.write('  d.write("<div class=\\"mb-6\\"><h1 class=\\"text-2xl font-bold text-purple-900 mb-2\\">Forecast " + version.version + "<\\/h1>");');
  doc.write('  d.write("<div class=\\"text-sm text-slate-600\\">");');
  doc.write('  d.write("<span class=\\"font-semibold\\">Released:<\\/span> " + version.releaseDate + " | ");');
  doc.write('  d.write("<span class=\\"font-semibold\\">Uploaded:<\\/span> " + new Date(version.uploadedAt).toLocaleString() + " | ");');
  doc.write('  d.write("<span class=\\"font-semibold\\">File:<\\/span> " + version.fileName + "<\\/div><\\/div>");');
  doc.write('  d.write("<div class=\\"overflow-x-auto\\"><table class=\\"w-full text-sm\\">");');
  doc.write('  d.write("<thead class=\\"bg-purple-100\\"><tr><th class=\\"px-4 py-2 text-left border\\">Week ID<\\/th>");');
  doc.write('  d.write("<th class=\\"px-4 py-2 text-right border\\">Weekly Forecast<\\/th>");');
  doc.write('  d.write("<th class=\\"px-4 py-2 text-right border\\">Cumulative Forecast<\\/th><\\/tr><\\/thead><tbody>");');
  doc.write('  for (var i=0; i<version.data.length; i++) {');
  doc.write('    var row = version.data[i];');
  doc.write('    d.write("<tr class=\\"border-b hover:bg-purple-50\\">");');
  doc.write('    d.write("<td class=\\"px-4 py-2 border\\">" + row.week_id + "<\\/td>");');
  doc.write('    d.write("<td class=\\"px-4 py-2 border text-right font-mono\\">" + parseInt(row.weekly_forecast).toLocaleString() + "<\\/td>");');
  doc.write('    d.write("<td class=\\"px-4 py-2 border text-right font-mono font-semibold\\">" + parseInt(row.cum_forecast).toLocaleString() + "<\\/td>");');
  doc.write('    d.write("<\\/tr>");');
  doc.write('  }');
  doc.write('  d.write("<\\/tbody><\\/table><\\/div><\\/div><\\/div><\\/body><\\/html>");');
  doc.write('  d.close();');
  doc.write('}');
  doc.write('function switchToVersion(idx) {');
  doc.write('  if (!confirm("Switch to version " + allVersions[idx].version + "? This will make it the current active version.")) return;');
  doc.write('  if (window.opener && window.opener.switchForecastVersion) {');
  doc.write('    window.opener.switchForecastVersion(idx);');
  doc.write('    alert("✅ Switched to version " + allVersions[idx].version);');
  doc.write('    window.location.reload();');
  doc.write('  } else { alert("❌ Cannot switch version - parent window not available"); }');
  doc.write('}');
  doc.write('<\/script><\/body><\/html>');
  doc.close();
}


/**
 * Switch to a specific forecast version
 */
function switchForecastVersion(versionIndex) {
  const versions = JSON.parse(localStorage.getItem(STORAGE_KEYS.FORECAST_DATA) || '[]');

  if (versionIndex < 0 || versionIndex >= versions.length) {
    showNotification('❌ Invalid version index', 'error');
    return;
  }

  const selectedVersion = versions[versionIndex];

  // Update UI to show this version
  updateForecastSummary(selectedVersion);

  // Optionally, mark this version as "active" in metadata
  selectedVersion.lastAccessed = new Date().toISOString();
  localStorage.setItem(STORAGE_KEYS.FORECAST_DATA, JSON.stringify(versions));

  showNotification(`✅ Switched to Forecast ${selectedVersion.version}`, 'success');
}

/**
 * Compare Forecast Versions
 */
function compareForecastVersions() {
  const versions = JSON.parse(localStorage.getItem(STORAGE_KEYS.FORECAST_DATA) || '[]');

  if (versions.length < 2) {
    showNotification('⚠️ Need at least 2 forecast versions to compare', 'warning');
    return;
  }

  // Create comparison selector page
  const content = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Compare Forecast Versions</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      </style>
    </head>
    <body class="bg-slate-50 p-8">
      <div class="max-w-7xl mx-auto">
        <div class="mb-6 flex items-center justify-between">
          <h1 class="text-3xl font-bold text-slate-900">🔄 Compare Forecast Versions</h1>
          <button onclick="window.close()" class="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700">
            ← Close
          </button>
        </div>

        <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div class="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">Base Version (Old)</label>
              <select id="baseVersion" class="w-full border border-slate-300 rounded-lg px-4 py-2">
                ${versions.map((ver, idx) => `
                  <option value="${idx}">${ver.version} - ${ver.releaseDate} (${ver.data.length} weeks)</option>
                `).join('')}
              </select>
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">Compare Version (New)</label>
              <select id="compareVersion" class="w-full border border-slate-300 rounded-lg px-4 py-2">
                ${versions.map((ver, idx) => `
                  <option value="${idx}" ${idx === versions.length - 1 ? 'selected' : ''}>${ver.version} - ${ver.releaseDate} (${ver.data.length} weeks)</option>
                `).join('')}
              </select>
            </div>
          </div>

          <button onclick="performComparison()" class="w-full px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700">
            Compare Versions
          </button>
        </div>

        <div id="comparisonResults" class="hidden bg-white rounded-xl shadow-lg p-6">
          <h2 class="text-2xl font-bold text-purple-900 mb-4">Comparison Results</h2>
          <div id="resultsContent"></div>
        </div>
      </div>

      <script>
        const allVersions = ${JSON.stringify(versions)};

        function performComparison() {
          const baseIdx = parseInt(document.getElementById('baseVersion').value);
          const compareIdx = parseInt(document.getElementById('compareVersion').value);

          if (baseIdx === compareIdx) {
            alert('⚠️ Please select two different versions to compare');
            return;
          }

          const baseVersion = allVersions[baseIdx];
          const compareVersion = allVersions[compareIdx];

          // Create a map for quick lookup
          const baseMap = {};
          baseVersion.data.forEach(row => {
            baseMap[row.week_id] = row;
          });

          const compareMap = {};
          compareVersion.data.forEach(row => {
            compareMap[row.week_id] = row;
          });

          // Get all unique week IDs
          const allWeeks = new Set([
            ...baseVersion.data.map(r => r.week_id),
            ...compareVersion.data.map(r => r.week_id)
          ]);

          const sortedWeeks = Array.from(allWeeks).sort();

          // Build comparison table
          let tableHTML = \`
            <div class="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span class="font-semibold">Base (Old):</span> \${baseVersion.version} - \${baseVersion.releaseDate}
                </div>
                <div>
                  <span class="font-semibold">Compare (New):</span> \${compareVersion.version} - \${compareVersion.releaseDate}
                </div>
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-purple-100">
                  <tr>
                    <th class="px-4 py-3 text-left border">Week ID</th>
                    <th class="px-4 py-3 text-right border">Base Weekly</th>
                    <th class="px-4 py-3 text-right border">Compare Weekly</th>
                    <th class="px-4 py-3 text-right border">Weekly Δ</th>
                    <th class="px-4 py-3 text-right border">Base Cum</th>
                    <th class="px-4 py-3 text-right border">Compare Cum</th>
                    <th class="px-4 py-3 text-right border">Cum Δ</th>
                  </tr>
                </thead>
                <tbody>
          \`;

          sortedWeeks.forEach(weekId => {
            const baseRow = baseMap[weekId];
            const compareRow = compareMap[weekId];

            const baseWeekly = baseRow ? parseInt(baseRow.weekly_forecast) : 0;
            const compareWeekly = compareRow ? parseInt(compareRow.weekly_forecast) : 0;
            const weeklyDelta = compareWeekly - baseWeekly;

            const baseCum = baseRow ? parseInt(baseRow.cum_forecast) : 0;
            const compareCum = compareRow ? parseInt(compareRow.cum_forecast) : 0;
            const cumDelta = compareCum - baseCum;

            const weeklyDeltaClass = weeklyDelta > 0 ? 'text-green-700 bg-green-50' : weeklyDelta < 0 ? 'text-red-700 bg-red-50' : '';
            const cumDeltaClass = cumDelta > 0 ? 'text-green-700 bg-green-50' : cumDelta < 0 ? 'text-red-700 bg-red-50' : '';

            tableHTML += \`
              <tr class="border-b hover:bg-purple-50">
                <td class="px-4 py-2 border font-semibold">\${weekId}</td>
                <td class="px-4 py-2 border text-right font-mono">\${baseWeekly.toLocaleString()}</td>
                <td class="px-4 py-2 border text-right font-mono">\${compareWeekly.toLocaleString()}</td>
                <td class="px-4 py-2 border text-right font-mono font-semibold \${weeklyDeltaClass}">
                  \${weeklyDelta > 0 ? '+' : ''}\${weeklyDelta.toLocaleString()}
                  \${weeklyDelta !== 0 ? \`<span class="text-xs ml-1">(\${((weeklyDelta / (baseWeekly || 1)) * 100).toFixed(1)}%)</span>\` : ''}
                </td>
                <td class="px-4 py-2 border text-right font-mono">\${baseCum.toLocaleString()}</td>
                <td class="px-4 py-2 border text-right font-mono">\${compareCum.toLocaleString()}</td>
                <td class="px-4 py-2 border text-right font-mono font-semibold \${cumDeltaClass}">
                  \${cumDelta > 0 ? '+' : ''}\${cumDelta.toLocaleString()}
                  \${cumDelta !== 0 ? \`<span class="text-xs ml-1">(\${((cumDelta / (baseCum || 1)) * 100).toFixed(1)}%)</span>\` : ''}
                </td>
              </tr>
            \`;
          });

          tableHTML += \`
                </tbody>
              </table>
            </div>
          \`;

          document.getElementById('resultsContent').innerHTML = tableHTML;
          document.getElementById('comparisonResults').classList.remove('hidden');

          // Scroll to results
          document.getElementById('comparisonResults').scrollIntoView({ behavior: 'smooth' });
        }
      </script>
    </body>
    </html>
  `;

  const compareWindow = window.open('', '_blank', 'width=1400,height=900');
  compareWindow.document.write(content);
  compareWindow.document.close();
}

// =========================
// CTB Management
// =========================

/**
 * Upload CTB Data
 */
function uploadCTB() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.xlsx,.xls';

  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    showNotification('📤 Uploading CTB data...', 'info');

    try {
      // Read Excel file
      const data = await readExcelFile(file);

      // Validate data structure
      if (!validateCTBData(data)) {
        throw new Error('Invalid CTB data format');
      }

      // Get existing versions
      const versions = JSON.parse(localStorage.getItem(STORAGE_KEYS.CTB_DATA) || '[]');

      // Create new version
      const newVersion = {
        version: `v${versions.length + 1}`,
        updateDate: new Date().toISOString().split('T')[0],
        uploadedAt: new Date().toISOString(),
        data: data,
        fileName: file.name
      };

      // Save to storage
      versions.push(newVersion);
      localStorage.setItem(STORAGE_KEYS.CTB_DATA, JSON.stringify(versions));

      // Update UI
      updateCTBSummary(newVersion);

      showNotification(`✅ CTB ${newVersion.version} uploaded successfully!`, 'success');
    } catch (error) {
      console.error('Error uploading CTB:', error);
      showNotification(`❌ Error uploading CTB: ${error.message}`, 'error');
    }
  };

  input.click();
}

/**
 * Validate CTB Data
 */
function validateCTBData(data) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return false;
  }

  // Check required columns: week_id, site, weekly_ctb, cum_ctb
  const requiredColumns = ['week_id', 'site', 'weekly_ctb', 'cum_ctb'];
  const firstRow = data[0];

  return requiredColumns.every(col => col in firstRow);
}

/**
 * Update CTB Summary Display
 */
function updateCTBSummary(versionData) {
  // Update version info
  document.getElementById('ctbVersion').textContent = versionData.version;
  document.getElementById('ctbUpdateDate').textContent = versionData.updateDate;

  // Group by site
  const bySite = {};
  versionData.data.forEach(row => {
    if (!bySite[row.site]) {
      bySite[row.site] = [];
    }
    bySite[row.site].push(row);
  });

  // Create summary by site
  const container = document.getElementById('ctbSummaryBySite');
  container.innerHTML = Object.entries(bySite).map(([site, siteData]) => {
    const recentWeeks = siteData.slice(0, 4);

    return `
      <div class="border border-orange-200 rounded-lg p-3 bg-white">
        <div class="text-sm font-semibold text-orange-900 mb-2">Site: ${site}</div>
        <table class="w-full text-xs">
          <thead class="bg-orange-100">
            <tr>
              <th class="px-2 py-1 text-left">Week</th>
              <th class="px-2 py-1 text-right">Weekly CTB</th>
              <th class="px-2 py-1 text-right">Cum CTB</th>
            </tr>
          </thead>
          <tbody>
            ${recentWeeks.map(row => `
              <tr class="border-t">
                <td class="px-2 py-1">${row.week_id}</td>
                <td class="px-2 py-1 text-right font-mono">${parseInt(row.weekly_ctb).toLocaleString()}</td>
                <td class="px-2 py-1 text-right font-mono font-semibold">${parseInt(row.cum_ctb).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }).join('');
}

/**
 * View All CTB Weeks
 */
function viewAllCTBWeeks() {
  showNotification('👁️ CTB weekly details view coming soon!', 'info');
}

/**
 * View CTB History
 */
function viewCTBHistory() {
  const versions = JSON.parse(localStorage.getItem(STORAGE_KEYS.CTB_DATA) || '[]');

  if (versions.length === 0) {
    showNotification('⚠️ No CTB history available. Please upload CTB data first.', 'warning');
    return;
  }

  // Create history view in new window
  const content = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>CTB Version History</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      </style>
    </head>
    <body class="bg-slate-50 p-8">
      <div class="max-w-7xl mx-auto">
        <div class="mb-6 flex items-center justify-between">
          <h1 class="text-3xl font-bold text-slate-900">📜 CTB Version History</h1>
          <button onclick="window.close()" class="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700">
            ← Close
          </button>
        </div>

        <div class="bg-white rounded-xl shadow-lg p-6">
          <div class="mb-4 text-sm text-slate-600">
            Total Versions: <span class="font-semibold">${versions.length}</span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-orange-100">
                <tr>
                  <th class="px-4 py-3 text-left border">Version</th>
                  <th class="px-4 py-3 text-left border">Update Date</th>
                  <th class="px-4 py-3 text-left border">Uploaded At</th>
                  <th class="px-4 py-3 text-left border">File Name</th>
                  <th class="px-4 py-3 text-center border">Sites</th>
                  <th class="px-4 py-3 text-center border">Records</th>
                  <th class="px-4 py-3 text-center border">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${versions.map((ver, idx) => {
                  const isLatest = idx === versions.length - 1;
                  const uploadTime = new Date(ver.uploadedAt).toLocaleString();
                  const recordsCount = ver.data.length;

                  // Get unique sites
                  const sites = [...new Set(ver.data.map(row => row.site))];
                  const sitesCount = sites.length;

                  return `
                    <tr class="border-b hover:bg-orange-50 ${isLatest ? 'bg-orange-50 font-semibold' : ''}">
                      <td class="px-4 py-3 border">
                        ${ver.version}
                        ${isLatest ? '<span class="ml-2 px-2 py-1 bg-orange-600 text-white text-xs rounded">Latest</span>' : ''}
                      </td>
                      <td class="px-4 py-3 border">${ver.updateDate}</td>
                      <td class="px-4 py-3 border text-xs text-slate-600">${uploadTime}</td>
                      <td class="px-4 py-3 border text-xs">${ver.fileName}</td>
                      <td class="px-4 py-3 border text-center">${sitesCount} (${sites.join(', ')})</td>
                      <td class="px-4 py-3 border text-center">${recordsCount}</td>
                      <td class="px-4 py-3 border text-center">
                        <button onclick="viewVersion(${idx})" class="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 mr-1">
                          👁️ View
                        </button>
                        ${!isLatest ? `
                          <button onclick="switchToVersion(${idx})" class="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">
                            ↻ Switch
                          </button>
                        ` : ''}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <script>
        const allVersions = ${JSON.stringify(versions)};

        function viewVersion(idx) {
          const version = allVersions[idx];

          // Group data by site
          const bySite = {};
          version.data.forEach(row => {
            if (!bySite[row.site]) bySite[row.site] = [];
            bySite[row.site].push(row);
          });

          // Create detail window
          const detailContent = \`
            <!DOCTYPE html>
            <html>
            <head>
              <title>CTB \${version.version} - Details</title>
              <script src="https://cdn.tailwindcss.com"><\/script>
            </head>
            <body class="bg-slate-50 p-8">
              <div class="max-w-6xl mx-auto">
                <div class="mb-6">
                  <button onclick="window.close()" class="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700">
                    ← Back
                  </button>
                </div>

                <div class="bg-white rounded-xl shadow-lg p-6">
                  <div class="mb-6">
                    <h1 class="text-2xl font-bold text-orange-900 mb-2">CTB \${version.version}</h1>
                    <div class="text-sm text-slate-600">
                      <span class="font-semibold">Updated:</span> \${version.updateDate} |
                      <span class="font-semibold">Uploaded:</span> \${new Date(version.uploadedAt).toLocaleString()} |
                      <span class="font-semibold">File:</span> \${version.fileName}
                    </div>
                  </div>

                  <div class="space-y-6">
                    \${Object.entries(bySite).map(([site, siteData]) => \\\`
                      <div class="border border-orange-200 rounded-lg p-4">
                        <h3 class="text-lg font-semibold text-orange-900 mb-3">Site: \\\${site}</h3>
                        <div class="overflow-x-auto">
                          <table class="w-full text-sm">
                            <thead class="bg-orange-100">
                              <tr>
                                <th class="px-4 py-2 text-left border">Week ID</th>
                                <th class="px-4 py-2 text-right border">Weekly CTB</th>
                                <th class="px-4 py-2 text-right border">Cumulative CTB</th>
                              </tr>
                            </thead>
                            <tbody>
                              \\\${siteData.map(row => \\\\\`
                                <tr class="border-b hover:bg-orange-50">
                                  <td class="px-4 py-2 border">\\\\\${row.week_id}</td>
                                  <td class="px-4 py-2 border text-right font-mono">\\\\\${parseInt(row.weekly_ctb).toLocaleString()}</td>
                                  <td class="px-4 py-2 border text-right font-mono font-semibold">\\\\\${parseInt(row.cum_ctb).toLocaleString()}</td>
                                </tr>
                              \\\\\`).join('')}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    \\\`).join('')}
                  </div>
                </div>
              </div>
            </body>
            </html>
          \`;

          const detailWindow = window.open('', '_blank', 'width=1200,height=800');
          detailWindow.document.write(detailContent);
          detailWindow.document.close();
        }

        function switchToVersion(idx) {
          if (!confirm('Switch to version ' + allVersions[idx].version + '? This will make it the current active version.')) {
            return;
          }

          const selectedVersion = allVersions[idx];

          // Send message to parent window to switch version
          if (window.opener && window.opener.switchCTBVersion) {
            window.opener.switchCTBVersion(idx);
            alert('✅ Switched to version ' + selectedVersion.version);
            window.location.reload();
          } else {
            alert('❌ Cannot switch version - parent window not available');
          }
        }
      </script>
    </body>
    </html>
  `;

  const historyWindow = window.open('', '_blank', 'width=1400,height=900');
  historyWindow.document.write(content);
  historyWindow.document.close();
}

/**
 * Switch to a specific CTB version
 */
function switchCTBVersion(versionIndex) {
  const versions = JSON.parse(localStorage.getItem(STORAGE_KEYS.CTB_DATA) || '[]');

  if (versionIndex < 0 || versionIndex >= versions.length) {
    showNotification('❌ Invalid version index', 'error');
    return;
  }

  const selectedVersion = versions[versionIndex];

  // Update UI to show this version
  updateCTBSummary(selectedVersion);

  // Mark this version as last accessed
  selectedVersion.lastAccessed = new Date().toISOString();
  localStorage.setItem(STORAGE_KEYS.CTB_DATA, JSON.stringify(versions));

  showNotification(`✅ Switched to CTB ${selectedVersion.version}`, 'success');
}

/**
 * Compare CTB Versions
 */
function compareCTBVersions() {
  const versions = JSON.parse(localStorage.getItem(STORAGE_KEYS.CTB_DATA) || '[]');

  if (versions.length < 2) {
    showNotification('⚠️ Need at least 2 CTB versions to compare', 'warning');
    return;
  }

  // Create comparison selector page
  const content = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Compare CTB Versions</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      </style>
    </head>
    <body class="bg-slate-50 p-8">
      <div class="max-w-7xl mx-auto">
        <div class="mb-6 flex items-center justify-between">
          <h1 class="text-3xl font-bold text-slate-900">🔄 Compare CTB Versions</h1>
          <button onclick="window.close()" class="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700">
            ← Close
          </button>
        </div>

        <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div class="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">Base Version (Old)</label>
              <select id="baseVersion" class="w-full border border-slate-300 rounded-lg px-4 py-2">
                ${versions.map((ver, idx) => `
                  <option value="${idx}">${ver.version} - ${ver.updateDate} (${ver.data.length} records)</option>
                `).join('')}
              </select>
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">Compare Version (New)</label>
              <select id="compareVersion" class="w-full border border-slate-300 rounded-lg px-4 py-2">
                ${versions.map((ver, idx) => `
                  <option value="${idx}" ${idx === versions.length - 1 ? 'selected' : ''}>${ver.version} - ${ver.updateDate} (${ver.data.length} records)</option>
                `).join('')}
              </select>
            </div>
          </div>

          <button onclick="performComparison()" class="w-full px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700">
            Compare Versions
          </button>
        </div>

        <div id="comparisonResults" class="hidden bg-white rounded-xl shadow-lg p-6">
          <h2 class="text-2xl font-bold text-orange-900 mb-4">Comparison Results</h2>
          <div id="resultsContent"></div>
        </div>
      </div>

      <script>
        const allVersions = ${JSON.stringify(versions)};

        function performComparison() {
          const baseIdx = parseInt(document.getElementById('baseVersion').value);
          const compareIdx = parseInt(document.getElementById('compareVersion').value);

          if (baseIdx === compareIdx) {
            alert('⚠️ Please select two different versions to compare');
            return;
          }

          const baseVersion = allVersions[baseIdx];
          const compareVersion = allVersions[compareIdx];

          // Group data by site
          const baseBySite = {};
          baseVersion.data.forEach(row => {
            if (!baseBySite[row.site]) baseBySite[row.site] = {};
            baseBySite[row.site][row.week_id] = row;
          });

          const compareBySite = {};
          compareVersion.data.forEach(row => {
            if (!compareBySite[row.site]) compareBySite[row.site] = {};
            compareBySite[row.site][row.week_id] = row;
          });

          // Get all unique sites
          const allSites = new Set([
            ...Object.keys(baseBySite),
            ...Object.keys(compareBySite)
          ]);

          let resultsHTML = \`
            <div class="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span class="font-semibold">Base (Old):</span> \${baseVersion.version} - \${baseVersion.updateDate}
                </div>
                <div>
                  <span class="font-semibold">Compare (New):</span> \${compareVersion.version} - \${compareVersion.updateDate}
                </div>
              </div>
            </div>

            <div class="space-y-6">
          \`;

          // Create comparison for each site
          Array.from(allSites).sort().forEach(site => {
            const baseData = baseBySite[site] || {};
            const compareData = compareBySite[site] || {};

            // Get all unique weeks for this site
            const allWeeks = new Set([
              ...Object.keys(baseData),
              ...Object.keys(compareData)
            ]);
            const sortedWeeks = Array.from(allWeeks).sort();

            resultsHTML += \`
              <div class="border border-orange-200 rounded-lg p-4">
                <h3 class="text-lg font-semibold text-orange-900 mb-3">Site: \${site}</h3>
                <div class="overflow-x-auto">
                  <table class="w-full text-sm">
                    <thead class="bg-orange-100">
                      <tr>
                        <th class="px-4 py-2 text-left border">Week ID</th>
                        <th class="px-4 py-2 text-right border">Base Weekly</th>
                        <th class="px-4 py-2 text-right border">Compare Weekly</th>
                        <th class="px-4 py-2 text-right border">Weekly Δ</th>
                        <th class="px-4 py-2 text-right border">Base Cum</th>
                        <th class="px-4 py-2 text-right border">Compare Cum</th>
                        <th class="px-4 py-2 text-right border">Cum Δ</th>
                      </tr>
                    </thead>
                    <tbody>
            \`;

            sortedWeeks.forEach(weekId => {
              const baseRow = baseData[weekId];
              const compareRow = compareData[weekId];

              const baseWeekly = baseRow ? parseInt(baseRow.weekly_ctb) : 0;
              const compareWeekly = compareRow ? parseInt(compareRow.weekly_ctb) : 0;
              const weeklyDelta = compareWeekly - baseWeekly;

              const baseCum = baseRow ? parseInt(baseRow.cum_ctb) : 0;
              const compareCum = compareRow ? parseInt(compareRow.cum_ctb) : 0;
              const cumDelta = compareCum - baseCum;

              const weeklyDeltaClass = weeklyDelta > 0 ? 'text-green-700 bg-green-50' : weeklyDelta < 0 ? 'text-red-700 bg-red-50' : '';
              const cumDeltaClass = cumDelta > 0 ? 'text-green-700 bg-green-50' : cumDelta < 0 ? 'text-red-700 bg-red-50' : '';

              resultsHTML += \`
                <tr class="border-b hover:bg-orange-50">
                  <td class="px-4 py-2 border font-semibold">\${weekId}</td>
                  <td class="px-4 py-2 border text-right font-mono">\${baseWeekly.toLocaleString()}</td>
                  <td class="px-4 py-2 border text-right font-mono">\${compareWeekly.toLocaleString()}</td>
                  <td class="px-4 py-2 border text-right font-mono font-semibold \${weeklyDeltaClass}">
                    \${weeklyDelta > 0 ? '+' : ''}\${weeklyDelta.toLocaleString()}
                    \${weeklyDelta !== 0 && baseWeekly !== 0 ? \`<span class="text-xs ml-1">(\${((weeklyDelta / baseWeekly) * 100).toFixed(1)}%)</span>\` : ''}
                  </td>
                  <td class="px-4 py-2 border text-right font-mono">\${baseCum.toLocaleString()}</td>
                  <td class="px-4 py-2 border text-right font-mono">\${compareCum.toLocaleString()}</td>
                  <td class="px-4 py-2 border text-right font-mono font-semibold \${cumDeltaClass}">
                    \${cumDelta > 0 ? '+' : ''}\${cumDelta.toLocaleString()}
                    \${cumDelta !== 0 && baseCum !== 0 ? \`<span class="text-xs ml-1">(\${((cumDelta / baseCum) * 100).toFixed(1)}%)</span>\` : ''}
                  </td>
                </tr>
              \`;
            });

            resultsHTML += \`
                    </tbody>
                  </table>
                </div>
              </div>
            \`;
          });

          resultsHTML += \`
            </div>
          \`;

          document.getElementById('resultsContent').innerHTML = resultsHTML;
          document.getElementById('comparisonResults').classList.remove('hidden');

          // Scroll to results
          document.getElementById('comparisonResults').scrollIntoView({ behavior: 'smooth' });
        }
      </script>
    </body>
    </html>
  `;

  const compareWindow = window.open('', '_blank', 'width=1400,height=900');
  compareWindow.document.write(content);
  compareWindow.document.close();
}

// =========================
// Excel File Reading
// =========================

/**
 * Read Excel File using SheetJS
 */
async function readExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        // Check if XLSX library is available
        if (typeof XLSX === 'undefined') {
          reject(new Error('XLSX library not loaded. Please include SheetJS.'));
          return;
        }

        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

// =========================
// Production Plan Versioning
// =========================

/**
 * Save Production Plan as Versioned Plan
 */
function saveProductionPlanVersion(planResults, config) {
  try {
    // Get existing versions
    const versions = JSON.parse(localStorage.getItem(STORAGE_KEYS.PLAN_VERSIONS) || '[]');

    // Generate plan name: "Product A Production Plan 20260124 v1"
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const versionNumber = versions.length + 1;
    const productName = config.program || 'Product A';
    const planName = `${productName} Production Plan ${today} v${versionNumber}`;

    // Create new version
    const newVersion = {
      version: `v${versionNumber}`,
      name: planName,
      createdAt: new Date().toISOString(),
      createdDate: new Date().toISOString().split('T')[0],
      config: config,
      planResults: planResults,
      isPOR: false // Plan of Record flag
    };

    // Save to storage
    versions.push(newVersion);
    localStorage.setItem(STORAGE_KEYS.PLAN_VERSIONS, JSON.stringify(versions));

    console.log('[ProductionPlan] Saved version:', planName);
    showNotification(`💾 Plan saved as: ${planName}`, 'success');

    return newVersion;
  } catch (error) {
    console.error('[ProductionPlan] Error saving plan version:', error);
    showNotification('❌ Error saving plan version: ' + error.message, 'error');
    return null;
  }
}

/**
 * View Production Plan History
 */
function viewProductionPlanHistory() {
  const versions = JSON.parse(localStorage.getItem(STORAGE_KEYS.PLAN_VERSIONS) || '[]');

  if (versions.length === 0) {
    showNotification('⚠️ No production plan history available. Generate a plan first.', 'warning');
    return;
  }

  // Create history view in new window
  const content = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Production Plan Version History</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      </style>
    </head>
    <body class="bg-slate-50 p-8">
      <div class="max-w-7xl mx-auto">
        <div class="mb-6 flex items-center justify-between">
          <h1 class="text-3xl font-bold text-slate-900">📜 Production Plan Version History</h1>
          <button onclick="window.close()" class="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700">
            ← Close
          </button>
        </div>

        <div class="bg-white rounded-xl shadow-lg p-6">
          <div class="mb-4 text-sm text-slate-600">
            Total Versions: <span class="font-semibold">${versions.length}</span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-blue-100">
                <tr>
                  <th class="px-4 py-3 text-left border">Version</th>
                  <th class="px-4 py-3 text-left border">Plan Name</th>
                  <th class="px-4 py-3 text-left border">Created Date</th>
                  <th class="px-4 py-3 text-left border">Mode</th>
                  <th class="px-4 py-3 text-left border">Date Range</th>
                  <th class="px-4 py-3 text-center border">POR</th>
                  <th class="px-4 py-3 text-center border">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${versions.map((ver, idx) => {
                  const isLatest = idx === versions.length - 1;
                  const createdTime = new Date(ver.createdAt).toLocaleString();
                  const dateRange = `${ver.config.startDate} ~ ${ver.config.endDate}`;

                  return `
                    <tr class="border-b hover:bg-blue-50 ${isLatest ? 'bg-blue-50 font-semibold' : ''}">
                      <td class="px-4 py-3 border">
                        ${ver.version}
                        ${isLatest ? '<span class="ml-2 px-2 py-1 bg-blue-600 text-white text-xs rounded">Latest</span>' : ''}
                      </td>
                      <td class="px-4 py-3 border">${ver.name}</td>
                      <td class="px-4 py-3 border text-xs text-slate-600">${createdTime}</td>
                      <td class="px-4 py-3 border">
                        <span class="px-2 py-1 rounded text-xs ${ver.config.mode === 'unconstrained' ? 'bg-green-100 text-green-800' : ver.config.mode === 'constrained' ? 'bg-orange-100 text-orange-800' : 'bg-purple-100 text-purple-800'}">
                          ${ver.config.mode}
                        </span>
                      </td>
                      <td class="px-4 py-3 border text-xs">${dateRange}</td>
                      <td class="px-4 py-3 border text-center">
                        ${ver.isPOR ? '<span class="px-2 py-1 bg-yellow-400 text-yellow-900 text-xs rounded font-bold">★ POR</span>' : '-'}
                      </td>
                      <td class="px-4 py-3 border text-center">
                        <button onclick="viewVersion(${idx})" class="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 mr-1">
                          👁️ View
                        </button>
                        ${!ver.isPOR ? `
                          <button onclick="setPOR(${idx})" class="px-3 py-1 bg-yellow-500 text-white text-xs rounded hover:bg-yellow-600">
                            ★ Set POR
                          </button>
                        ` : ''}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <script>
        const allVersions = ${JSON.stringify(versions)};

        function viewVersion(idx) {
          const version = allVersions[idx];

          // Get summary statistics
          const isCombined = version.planResults.mode === 'combined';
          const results = isCombined ? version.planResults.unconstrained : version.planResults;
          const totalDays = results.programResults ? results.programResults.length : 0;
          const totalWeeks = results.weeklyMetrics ? results.weeklyMetrics.length : 0;

          alert(\`Plan: \${version.name}\\n\\nMode: \${version.config.mode}\\nDate Range: \${version.config.startDate} to \${version.config.endDate}\\nTotal Days: \${totalDays}\\nTotal Weeks: \${totalWeeks}\\n\\nFull plan viewing coming soon!\`);
        }

        function setPOR(idx) {
          if (!confirm('Set this version as Plan of Record (POR)?\\n\\nThis will mark it as the official approved plan.')) {
            return;
          }

          // Send message to parent window
          if (window.opener && window.opener.setProductionPlanPOR) {
            window.opener.setProductionPlanPOR(idx);
            alert('✅ Plan marked as POR');
            window.location.reload();
          } else {
            alert('❌ Cannot set POR - parent window not available');
          }
        }
      </script>
    </body>
    </html>
  `;

  const historyWindow = window.open('', '_blank', 'width=1400,height=900');
  historyWindow.document.write(content);
  historyWindow.document.close();
}

/**
 * Set Plan of Record (POR)
 */
function setProductionPlanPOR(versionIndex) {
  const versions = JSON.parse(localStorage.getItem(STORAGE_KEYS.PLAN_VERSIONS) || '[]');

  if (versionIndex < 0 || versionIndex >= versions.length) {
    showNotification('❌ Invalid version index', 'error');
    return;
  }

  // Clear all POR flags
  versions.forEach(v => v.isPOR = false);

  // Set new POR
  versions[versionIndex].isPOR = true;

  // Save
  localStorage.setItem(STORAGE_KEYS.PLAN_VERSIONS, JSON.stringify(versions));

  // Also save POR reference
  localStorage.setItem(STORAGE_KEYS.POR_VERSION, JSON.stringify(versions[versionIndex]));

  showNotification(`✅ ${versions[versionIndex].name} marked as Plan of Record (POR)`, 'success');
}

/**
 * Get current POR version
 */
function getCurrentPOR() {
  const porVersion = localStorage.getItem(STORAGE_KEYS.POR_VERSION);
  return porVersion ? JSON.parse(porVersion) : null;
}

/**
 * Call back to previous POR
 */
function callBackToPOR() {
  const versions = JSON.parse(localStorage.getItem(STORAGE_KEYS.PLAN_VERSIONS) || '[]');
  const porVersion = versions.find(v => v.isPOR);

  if (!porVersion) {
    showNotification('⚠️ No POR version found. Please set a Plan of Record first.', 'warning');
    return;
  }

  if (!confirm(`Call back to POR version?\\n\\nThis will switch to: ${porVersion.name}`)) {
    return;
  }

  // Load POR version into current state
  const state = window.productionPlanState;
  state.planResults = porVersion.planResults;
  state.program = porVersion.config.program;
  state.startDate = porVersion.config.startDate;
  state.endDate = porVersion.config.endDate;
  state.mode = porVersion.config.mode;

  // Re-render
  if (typeof renderProductionPlan === 'function') {
    renderProductionPlan();
  }

  showNotification(`✅ Called back to POR: ${porVersion.name}`, 'success');
}

// =========================
// Excel Export (All-in-One Format)
// =========================

/**
 * Export Production Plan to Excel with Forecast, CTB, IOS, and Delta
 */
function exportProductionPlanToExcel(planVersion) {
  try {
    // Check if XLSX library is available
    if (typeof XLSX === 'undefined') {
      showNotification('❌ XLSX library not loaded. Please refresh the page.', 'error');
      return;
    }

    // Get latest forecast and CTB versions
    const forecastVersions = JSON.parse(localStorage.getItem(STORAGE_KEYS.FORECAST_DATA) || '[]');
    const ctbVersions = JSON.parse(localStorage.getItem(STORAGE_KEYS.CTB_DATA) || '[]');

    const latestForecast = forecastVersions.length > 0 ? forecastVersions[forecastVersions.length - 1] : null;
    const latestCTB = ctbVersions.length > 0 ? ctbVersions[ctbVersions.length - 1] : null;

    if (!latestForecast || !latestCTB) {
      showNotification('⚠️ Both Forecast and CTB data are required for export', 'warning');
      return;
    }

    // Get weekly metrics from plan
    const getWeeklyMetrics = (plan) => {
      if (plan.planResults.mode === 'combined') {
        return plan.planResults.unconstrained.weeklyMetrics || [];
      }
      return plan.planResults.weeklyMetrics || [];
    };

    const weeklyMetrics = getWeeklyMetrics(planVersion);

    // Create maps for quick lookup
    const forecastMap = {};
    latestForecast.data.forEach(row => {
      forecastMap[row.week_id] = row;
    });

    const ctbMap = {};
    latestCTB.data.forEach(row => {
      if (!ctbMap[row.week_id]) {
        ctbMap[row.week_id] = { weekly: 0, cumulative: 0 };
      }
      ctbMap[row.week_id].weekly += parseInt(row.weekly_ctb || 0);
      ctbMap[row.week_id].cumulative += parseInt(row.cum_ctb || 0);
    });

    // Build export data
    const exportData = [];

    // Header row
    exportData.push({
      'Week ID': 'Week ID',
      'Forecast (Weekly)': 'Forecast (Weekly)',
      'Forecast (Cum)': 'Forecast (Cum)',
      'CTB (Weekly)': 'CTB (Weekly)',
      'CTB (Cum)': 'CTB (Cum)',
      'Input (Cum)': 'Input (Cum)',
      'Output (Cum)': 'Output (Cum)',
      'Shipment (Cum)': 'Shipment (Cum)',
      'Delta vs Forecast': 'Delta vs Forecast',
      'Delta %': 'Delta %'
    });

    // Data rows
    weeklyMetrics.forEach(row => {
      const weekId = row.week_id;
      const forecastRow = forecastMap[weekId];
      const ctbRow = ctbMap[weekId];

      const forecastWeekly = forecastRow ? parseInt(forecastRow.weekly_forecast || 0) : 0;
      const forecastCum = forecastRow ? parseInt(forecastRow.cum_forecast || 0) : 0;
      const ctbWeekly = ctbRow ? ctbRow.weekly : 0;
      const ctbCum = ctbRow ? ctbRow.cumulative : 0;

      const input = row.cumInput || 0;
      const output = row.cumOutput || 0;
      const shipment = row.cumShipment || 0;

      const delta = shipment - forecastCum;
      const deltaPercent = forecastCum !== 0 ? ((delta / forecastCum) * 100).toFixed(2) + '%' : '0%';

      exportData.push({
        'Week ID': weekId,
        'Forecast (Weekly)': forecastWeekly,
        'Forecast (Cum)': forecastCum,
        'CTB (Weekly)': ctbWeekly,
        'CTB (Cum)': ctbCum,
        'Input (Cum)': input,
        'Output (Cum)': output,
        'Shipment (Cum)': shipment,
        'Delta vs Forecast': delta,
        'Delta %': deltaPercent
      });
    });

    // Create workbook
    const ws = XLSX.utils.json_to_sheet(exportData, { skipHeader: true });

    // Set column widths
    ws['!cols'] = [
      { wch: 12 },  // Week ID
      { wch: 18 },  // Forecast Weekly
      { wch: 15 },  // Forecast Cum
      { wch: 15 },  // CTB Weekly
      { wch: 12 },  // CTB Cum
      { wch: 12 },  // Input Cum
      { wch: 12 },  // Output Cum
      { wch: 15 },  // Shipment Cum
      { wch: 18 },  // Delta
      { wch: 10 }   // Delta %
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Production Plan');

    // Generate filename
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const filename = planVersion.name.replace(/ /g, '_') + '_Export_' + today + '.xlsx';

    // Download
    XLSX.writeFile(wb, filename);

    showNotification('✅ Excel file exported successfully!', 'success');
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    showNotification('❌ Error exporting to Excel: ' + error.message, 'error');
  }
}

/**
 * Export latest production plan
 */
function exportLatestProductionPlan() {
  const versions = JSON.parse(localStorage.getItem(STORAGE_KEYS.PLAN_VERSIONS) || '[]');

  if (versions.length === 0) {
    showNotification('⚠️ No production plan available to export', 'warning');
    return;
  }

  const latestVersion = versions[versions.length - 1];
  exportProductionPlanToExcel(latestVersion);
}

/**
 * Export specific production plan version
 */
function exportProductionPlanVersion(versionIndex) {
  const versions = JSON.parse(localStorage.getItem(STORAGE_KEYS.PLAN_VERSIONS) || '[]');

  if (versionIndex < 0 || versionIndex >= versions.length) {
    showNotification('❌ Invalid version index', 'error');
    return;
  }

  exportProductionPlanToExcel(versions[versionIndex]);
}

// =========================
// Site Options Update
// =========================

/**
 * Update site options based on selected vendor
 */
function updateSiteOptions() {
  const vendor = document.getElementById('configVendor').value;
  const sitesSelect = document.getElementById('configSites');

  // Define site mappings
  const sitesByVendor = {
    'vendor_x': ['VN01', 'VN02'],
    'vendor_y': ['CN01', 'CN02'],
    'vendor_z': ['TW01']
  };

  // Update options
  sitesSelect.innerHTML = '';
  const sites = sitesByVendor[vendor] || [];

  sites.forEach(site => {
    const option = document.createElement('option');
    option.value = site;
    option.textContent = site;
    option.selected = true; // Select all by default
    sitesSelect.appendChild(option);
  });
}

/**
 * Compare Production Plan Versions
 */
function compareProductionPlanVersions() {
  const versions = JSON.parse(localStorage.getItem(STORAGE_KEYS.PLAN_VERSIONS) || '[]');

  if (versions.length < 2) {
    showNotification('⚠️ Need at least 2 production plan versions to compare', 'warning');
    return;
  }

  // Create comparison selector page
  const content = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Compare Production Plan Versions</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      </style>
    </head>
    <body class="bg-slate-50 p-8">
      <div class="max-w-7xl mx-auto">
        <div class="mb-6 flex items-center justify-between">
          <h1 class="text-3xl font-bold text-slate-900">🔄 Compare Production Plan Versions</h1>
          <button onclick="window.close()" class="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700">
            ← Close
          </button>
        </div>

        <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div class="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">Base Plan (Old)</label>
              <select id="basePlan" class="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm">
                ${versions.map((ver, idx) => `
                  <option value="${idx}">${ver.name} (${ver.config.mode})</option>
                `).join('')}
              </select>
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">Compare Plan (New)</label>
              <select id="comparePlan" class="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm">
                ${versions.map((ver, idx) => `
                  <option value="${idx}" ${idx === versions.length - 1 ? 'selected' : ''}>${ver.name} (${ver.config.mode})</option>
                `).join('')}
              </select>
            </div>
          </div>

          <button onclick="performComparison()" class="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
            Compare Plans
          </button>
        </div>

        <div id="comparisonResults" class="hidden bg-white rounded-xl shadow-lg p-6">
          <h2 class="text-2xl font-bold text-blue-900 mb-4">Comparison Results - Weekly IOS</h2>
          <div id="resultsContent"></div>
        </div>
      </div>

      <script>
        const allVersions = ${JSON.stringify(versions)};

        function performComparison() {
          const baseIdx = parseInt(document.getElementById('basePlan').value);
          const compareIdx = parseInt(document.getElementById('comparePlan').value);

          if (baseIdx === compareIdx) {
            alert('⚠️ Please select two different plans to compare');
            return;
          }

          const basePlan = allVersions[baseIdx];
          const comparePlan = allVersions[compareIdx];

          // Get weekly metrics from plans (handle combined mode)
          const getWeeklyMetrics = (plan) => {
            if (plan.planResults.mode === 'combined') {
              return plan.planResults.unconstrained.weeklyMetrics || [];
            }
            return plan.planResults.weeklyMetrics || [];
          };

          const baseWeekly = getWeeklyMetrics(basePlan);
          const compareWeekly = getWeeklyMetrics(comparePlan);

          // Create maps for quick lookup
          const baseMap = {};
          baseWeekly.forEach(row => {
            baseMap[row.week_id] = row;
          });

          const compareMap = {};
          compareWeekly.forEach(row => {
            compareMap[row.week_id] = row;
          });

          // Get all unique weeks
          const allWeeks = new Set([
            ...baseWeekly.map(r => r.week_id),
            ...compareWeekly.map(r => r.week_id)
          ]);
          const sortedWeeks = Array.from(allWeeks).sort();

          let tableHTML = \`
            <div class="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span class="font-semibold">Base Plan:</span> \${basePlan.name}<br>
                  <span class="text-xs text-slate-600">Mode: \${basePlan.config.mode} | Created: \${new Date(basePlan.createdAt).toLocaleString()}</span>
                </div>
                <div>
                  <span class="font-semibold">Compare Plan:</span> \${comparePlan.name}<br>
                  <span class="text-xs text-slate-600">Mode: \${comparePlan.config.mode} | Created: \${new Date(comparePlan.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-xs">
                <thead class="bg-blue-100">
                  <tr>
                    <th class="px-3 py-2 text-left border" rowspan="2">Week</th>
                    <th class="px-3 py-2 text-center border" colspan="3">Input</th>
                    <th class="px-3 py-2 text-center border" colspan="3">Output</th>
                    <th class="px-3 py-2 text-center border" colspan="3">Shipment</th>
                  </tr>
                  <tr>
                    <th class="px-3 py-2 text-right border">Base</th>
                    <th class="px-3 py-2 text-right border">Compare</th>
                    <th class="px-3 py-2 text-right border">Δ</th>
                    <th class="px-3 py-2 text-right border">Base</th>
                    <th class="px-3 py-2 text-right border">Compare</th>
                    <th class="px-3 py-2 text-right border">Δ</th>
                    <th class="px-3 py-2 text-right border">Base</th>
                    <th class="px-3 py-2 text-right border">Compare</th>
                    <th class="px-3 py-2 text-right border">Δ</th>
                  </tr>
                </thead>
                <tbody>
          \`;

          sortedWeeks.forEach(weekId => {
            const baseRow = baseMap[weekId];
            const compareRow = compareMap[weekId];

            const baseInput = baseRow ? (baseRow.cumInput || 0) : 0;
            const compareInput = compareRow ? (compareRow.cumInput || 0) : 0;
            const inputDelta = compareInput - baseInput;

            const baseOutput = baseRow ? (baseRow.cumOutput || 0) : 0;
            const compareOutput = compareRow ? (compareRow.cumOutput || 0) : 0;
            const outputDelta = compareOutput - baseOutput;

            const baseShipment = baseRow ? (baseRow.cumShipment || 0) : 0;
            const compareShipment = compareRow ? (compareRow.cumShipment || 0) : 0;
            const shipmentDelta = compareShipment - baseShipment;

            const inputDeltaClass = inputDelta > 0 ? 'text-green-700 bg-green-50' : inputDelta < 0 ? 'text-red-700 bg-red-50' : '';
            const outputDeltaClass = outputDelta > 0 ? 'text-green-700 bg-green-50' : outputDelta < 0 ? 'text-red-700 bg-red-50' : '';
            const shipmentDeltaClass = shipmentDelta > 0 ? 'text-green-700 bg-green-50' : shipmentDelta < 0 ? 'text-red-700 bg-red-50' : '';

            tableHTML += \`
              <tr class="border-b hover:bg-blue-50">
                <td class="px-3 py-2 border font-semibold">\${weekId}</td>

                <td class="px-3 py-2 border text-right font-mono">\${baseInput.toLocaleString()}</td>
                <td class="px-3 py-2 border text-right font-mono">\${compareInput.toLocaleString()}</td>
                <td class="px-3 py-2 border text-right font-mono font-semibold \${inputDeltaClass}">
                  \${inputDelta > 0 ? '+' : ''}\${inputDelta.toLocaleString()}
                </td>

                <td class="px-3 py-2 border text-right font-mono">\${baseOutput.toLocaleString()}</td>
                <td class="px-3 py-2 border text-right font-mono">\${compareOutput.toLocaleString()}</td>
                <td class="px-3 py-2 border text-right font-mono font-semibold \${outputDeltaClass}">
                  \${outputDelta > 0 ? '+' : ''}\${outputDelta.toLocaleString()}
                </td>

                <td class="px-3 py-2 border text-right font-mono">\${baseShipment.toLocaleString()}</td>
                <td class="px-3 py-2 border text-right font-mono">\${compareShipment.toLocaleString()}</td>
                <td class="px-3 py-2 border text-right font-mono font-semibold \${shipmentDeltaClass}">
                  \${shipmentDelta > 0 ? '+' : ''}\${shipmentDelta.toLocaleString()}
                </td>
              </tr>
            \`;
          });

          tableHTML += \`
                </tbody>
              </table>
            </div>
          \`;

          document.getElementById('resultsContent').innerHTML = tableHTML;
          document.getElementById('comparisonResults').classList.remove('hidden');

          // Scroll to results
          document.getElementById('comparisonResults').scrollIntoView({ behavior: 'smooth' });
        }
      </script>
    </body>
    </html>
  `;

  const compareWindow = window.open('', '_blank', 'width=1600,height=900');
  compareWindow.document.write(content);
  compareWindow.document.close();
}

// =========================
// Unified Historic Versions Page
// =========================

/**
 * View all historic versions in one unified page
 */
function viewAllHistoricVersions() {
  const forecastVersions = JSON.parse(localStorage.getItem(STORAGE_KEYS.FORECAST_DATA) || '[]');
  const ctbVersions = JSON.parse(localStorage.getItem(STORAGE_KEYS.CTB_DATA) || '[]');
  const planVersions = JSON.parse(localStorage.getItem(STORAGE_KEYS.PLAN_VERSIONS) || '[]');

  // Create unified history view
  const content = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Historic Versions - All Data</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        .section-container { scroll-margin-top: 2rem; }
      </style>
    </head>
    <body class="bg-slate-50 p-8">
      <div class="max-w-7xl mx-auto">
        <!-- Header -->
        <div class="mb-6 flex items-center justify-between">
          <h1 class="text-3xl font-bold text-slate-900">📚 Historic Versions - All Data</h1>
          <button onclick="window.close()" class="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700">
            ← Close
          </button>
        </div>

        <!-- Quick Navigation -->
        <div class="bg-white rounded-xl shadow-lg p-4 mb-6">
          <div class="flex gap-4 items-center">
            <span class="font-semibold text-slate-700">Jump to:</span>
            <a href="#forecast-section" class="px-3 py-2 bg-purple-100 text-purple-800 rounded hover:bg-purple-200 text-sm font-medium">
              📊 Forecast (${forecastVersions.length})
            </a>
            <a href="#ctb-section" class="px-3 py-2 bg-orange-100 text-orange-800 rounded hover:bg-orange-200 text-sm font-medium">
              🏭 CTB (${ctbVersions.length})
            </a>
            <a href="#plan-section" class="px-3 py-2 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 text-sm font-medium">
              📋 Plans (${planVersions.length})
            </a>
          </div>
        </div>

        <!-- Forecast Section -->
        <div id="forecast-section" class="section-container bg-white rounded-xl shadow-lg p-6 mb-6">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-2xl font-bold text-purple-900">📊 Demand Forecast Versions</h2>
            <span class="text-sm text-slate-600">Total: <span class="font-semibold">${forecastVersions.length}</span></span>
          </div>

          ${forecastVersions.length === 0 ? `
            <div class="text-center py-8 text-slate-500">
              <div class="text-4xl mb-2">📭</div>
              <div>No forecast versions available</div>
            </div>
          ` : `
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-purple-100">
                  <tr>
                    <th class="px-4 py-3 text-left border">Version</th>
                    <th class="px-4 py-3 text-left border">Release Date</th>
                    <th class="px-4 py-3 text-left border">Uploaded</th>
                    <th class="px-4 py-3 text-left border">File</th>
                    <th class="px-4 py-3 text-center border">Weeks</th>
                    <th class="px-4 py-3 text-center border">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${forecastVersions.map((ver, idx) => {
                    const isLatest = idx === forecastVersions.length - 1;
                    return `
                      <tr class="border-b hover:bg-purple-50 ${isLatest ? 'bg-purple-50' : ''}">
                        <td class="px-4 py-3 border font-semibold">
                          ${ver.version}
                          ${isLatest ? '<span class="ml-2 px-2 py-1 bg-purple-600 text-white text-xs rounded">Latest</span>' : ''}
                        </td>
                        <td class="px-4 py-3 border">${ver.releaseDate}</td>
                        <td class="px-4 py-3 border text-xs">${new Date(ver.uploadedAt).toLocaleString()}</td>
                        <td class="px-4 py-3 border text-xs">${ver.fileName}</td>
                        <td class="px-4 py-3 border text-center">${ver.data.length}</td>
                        <td class="px-4 py-3 border text-center">
                          <button onclick="viewForecastDetail(${idx})" class="px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700">
                            View
                          </button>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>

        <!-- CTB Section -->
        <div id="ctb-section" class="section-container bg-white rounded-xl shadow-lg p-6 mb-6">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-2xl font-bold text-orange-900">🏭 CTB Versions</h2>
            <span class="text-sm text-slate-600">Total: <span class="font-semibold">${ctbVersions.length}</span></span>
          </div>

          ${ctbVersions.length === 0 ? `
            <div class="text-center py-8 text-slate-500">
              <div class="text-4xl mb-2">📭</div>
              <div>No CTB versions available</div>
            </div>
          ` : `
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-orange-100">
                  <tr>
                    <th class="px-4 py-3 text-left border">Version</th>
                    <th class="px-4 py-3 text-left border">Update Date</th>
                    <th class="px-4 py-3 text-left border">Uploaded</th>
                    <th class="px-4 py-3 text-left border">File</th>
                    <th class="px-4 py-3 text-center border">Sites</th>
                    <th class="px-4 py-3 text-center border">Records</th>
                    <th class="px-4 py-3 text-center border">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${ctbVersions.map((ver, idx) => {
                    const isLatest = idx === ctbVersions.length - 1;
                    const sites = [...new Set(ver.data.map(row => row.site))];
                    return `
                      <tr class="border-b hover:bg-orange-50 ${isLatest ? 'bg-orange-50' : ''}">
                        <td class="px-4 py-3 border font-semibold">
                          ${ver.version}
                          ${isLatest ? '<span class="ml-2 px-2 py-1 bg-orange-600 text-white text-xs rounded">Latest</span>' : ''}
                        </td>
                        <td class="px-4 py-3 border">${ver.updateDate}</td>
                        <td class="px-4 py-3 border text-xs">${new Date(ver.uploadedAt).toLocaleString()}</td>
                        <td class="px-4 py-3 border text-xs">${ver.fileName}</td>
                        <td class="px-4 py-3 border text-center">${sites.length} (${sites.join(', ')})</td>
                        <td class="px-4 py-3 border text-center">${ver.data.length}</td>
                        <td class="px-4 py-3 border text-center">
                          <button onclick="viewCTBDetail(${idx})" class="px-3 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700">
                            View
                          </button>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>

        <!-- Production Plan Section -->
        <div id="plan-section" class="section-container bg-white rounded-xl shadow-lg p-6 mb-6">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-2xl font-bold text-blue-900">📋 Production Plan Versions</h2>
            <span class="text-sm text-slate-600">Total: <span class="font-semibold">${planVersions.length}</span></span>
          </div>

          ${planVersions.length === 0 ? `
            <div class="text-center py-8 text-slate-500">
              <div class="text-4xl mb-2">📭</div>
              <div>No production plan versions available</div>
            </div>
          ` : `
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-blue-100">
                  <tr>
                    <th class="px-4 py-3 text-left border">Version</th>
                    <th class="px-4 py-3 text-left border">Plan Name</th>
                    <th class="px-4 py-3 text-left border">Created</th>
                    <th class="px-4 py-3 text-center border">Mode</th>
                    <th class="px-4 py-3 text-center border">Date Range</th>
                    <th class="px-4 py-3 text-center border">POR</th>
                    <th class="px-4 py-3 text-center border">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${planVersions.map((ver, idx) => {
                    const isLatest = idx === planVersions.length - 1;
                    return `
                      <tr class="border-b hover:bg-blue-50 ${isLatest ? 'bg-blue-50' : ''}">
                        <td class="px-4 py-3 border font-semibold">
                          ${ver.version}
                          ${isLatest ? '<span class="ml-2 px-2 py-1 bg-blue-600 text-white text-xs rounded">Latest</span>' : ''}
                        </td>
                        <td class="px-4 py-3 border">${ver.name}</td>
                        <td class="px-4 py-3 border text-xs">${new Date(ver.createdAt).toLocaleString()}</td>
                        <td class="px-4 py-3 border text-center">
                          <span class="px-2 py-1 rounded text-xs ${ver.config.mode === 'unconstrained' ? 'bg-green-100 text-green-800' : ver.config.mode === 'constrained' ? 'bg-orange-100 text-orange-800' : 'bg-purple-100 text-purple-800'}">
                            ${ver.config.mode}
                          </span>
                        </td>
                        <td class="px-4 py-3 border text-center text-xs">${ver.config.startDate} ~ ${ver.config.endDate}</td>
                        <td class="px-4 py-3 border text-center">
                          ${ver.isPOR ? '<span class="px-2 py-1 bg-yellow-400 text-yellow-900 text-xs rounded font-bold">★ POR</span>' : '-'}
                        </td>
                        <td class="px-4 py-3 border text-center">
                          <button onclick="viewPlanDetail(${idx})" class="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">
                            View
                          </button>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>

      <script>
        const forecastData = ${JSON.stringify(forecastVersions)};
        const ctbData = ${JSON.stringify(ctbVersions)};
        const planData = ${JSON.stringify(planVersions)};

        function viewForecastDetail(idx) {
          if (window.opener && window.opener.viewForecastHistory) {
            window.opener.viewForecastHistory();
          } else {
            alert('View forecast version ' + forecastData[idx].version);
          }
        }

        function viewCTBDetail(idx) {
          if (window.opener && window.opener.viewCTBHistory) {
            window.opener.viewCTBHistory();
          } else {
            alert('View CTB version ' + ctbData[idx].version);
          }
        }

        function viewPlanDetail(idx) {
          if (window.opener && window.opener.viewProductionPlanHistory) {
            window.opener.viewProductionPlanHistory();
          } else {
            alert('View plan version ' + planData[idx].version);
          }
        }
      </script>
    </body>
    </html>
  `;

  const historyWindow = window.open('', '_blank', 'width=1600,height=900');
  historyWindow.document.write(content);
  historyWindow.document.close();
}

// =========================
// Initialization
// =========================

// Initialize storage when page loads
document.addEventListener('DOMContentLoaded', () => {
  initializeDataStorage();

  // Load latest versions if available
  const forecastVersions = JSON.parse(localStorage.getItem(STORAGE_KEYS.FORECAST_DATA) || '[]');
  if (forecastVersions.length > 0) {
    updateForecastSummary(forecastVersions[forecastVersions.length - 1]);
  }

  const ctbVersions = JSON.parse(localStorage.getItem(STORAGE_KEYS.CTB_DATA) || '[]');
  if (ctbVersions.length > 0) {
    updateCTBSummary(ctbVersions[ctbVersions.length - 1]);
  }
});

// =========================
// Expose functions to global scope for onclick handlers
// =========================
console.log('[ForecastCTB] Exposing functions to global scope...');

window.uploadForecast = uploadForecast;
window.viewForecastHistory = viewForecastHistory;
window.compareForecastVersions = compareForecastVersions;
window.viewAllForecastWeeks = viewAllForecastWeeks;
window.updateForecastFromEdit = updateForecastFromEdit;
window.switchForecastVersion = switchForecastVersion;

window.uploadCTB = uploadCTB;
window.viewCTBHistory = viewCTBHistory;
window.compareCTBVersions = compareCTBVersions;
window.viewAllCTBWeeks = viewAllCTBWeeks;
window.switchCTBVersion = switchCTBVersion;

window.saveProductionPlanVersion = saveProductionPlanVersion;
window.viewProductionPlanHistory = viewProductionPlanHistory;
window.setProductionPlanPOR = setProductionPlanPOR;
window.getCurrentPOR = getCurrentPOR;
window.callBackToPOR = callBackToPOR;
window.compareProductionPlanVersions = compareProductionPlanVersions;

window.exportProductionPlanToExcel = exportProductionPlanToExcel;
window.exportLatestProductionPlan = exportLatestProductionPlan;
window.exportProductionPlanVersion = exportProductionPlanVersion;

window.viewAllHistoricVersions = viewAllHistoricVersions;
window.updateSiteOptions = updateSiteOptions;

console.log('[ForecastCTB] Functions exposed. Testing:', {
  uploadForecast: typeof window.uploadForecast,
  viewForecastHistory: typeof window.viewForecastHistory,
  viewAllHistoricVersions: typeof window.viewAllHistoricVersions
});
