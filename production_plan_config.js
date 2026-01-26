// ========================================
// PRODUCTION PLAN CONFIGURATION & HOLIDAY MANAGEMENT
// Handles Generate Report UI and Holiday Calendar
// ========================================

// ========================================
// HOLIDAY CALENDAR MANAGEMENT
// ========================================

// Global holiday data store
if (!window.holidayCalendarData) {
  window.holidayCalendarData = {
    countries: {
      CN: { name: 'China', holidays: [] },
      VN: { name: 'Vietnam', holidays: [] }
    },
    lastFetched: {}
  };
}

// China official statutory holiday periods (法定节假日)
const CHINA_STATUTORY_HOLIDAYS_2026 = [
  {
    name: '元旦 (New Year)',
    start: '2026-01-01',
    end: '2026-01-03',
    type: 'public',
    editable: true
  },
  {
    name: '春节 (Spring Festival)',
    start: '2026-02-15',
    end: '2026-02-23',
    type: 'public',
    editable: true,
    notes: 'Includes Feb 14 (Sat) & Feb 21 (Sat) makeup work days'
  },
  {
    name: '清明节 (Qingming Festival)',
    start: '2026-04-04',
    end: '2026-04-06',
    type: 'public',
    editable: true
  },
  {
    name: '劳动节 (Labor Day)',
    start: '2026-05-01',
    end: '2026-05-05',
    type: 'public',
    editable: true
  },
  {
    name: '端午节 (Dragon Boat Festival)',
    start: '2026-06-19',
    end: '2026-06-21',
    type: 'public',
    editable: true
  },
  {
    name: '中秋节 (Mid-Autumn Festival)',
    start: '2026-09-25',
    end: '2026-09-27',
    type: 'public',
    editable: true
  },
  {
    name: '国庆节 (National Day)',
    start: '2026-10-01',
    end: '2026-10-07',
    type: 'public',
    editable: true,
    notes: 'Includes Sep 27 (Sun) & Oct 10 (Sat) makeup work days'
  }
];

// Vietnam official statutory holiday periods
const VIETNAM_STATUTORY_HOLIDAYS_2026 = [
  {
    name: 'Tết Dương lịch (New Year)',
    start: '2026-01-01',
    end: '2026-01-01',
    type: 'public',
    editable: true
  },
  {
    name: 'Tết Nguyên Đán (Lunar New Year)',
    start: '2026-02-17',
    end: '2026-02-21',
    type: 'public',
    editable: true,
    notes: '5-day Lunar New Year holiday'
  },
  {
    name: 'Giỗ Tổ Hùng Vương (Hung Kings\' Festival)',
    start: '2026-04-18',
    end: '2026-04-18',
    type: 'public',
    editable: true
  },
  {
    name: 'Ngày Giải phóng miền Nam (Reunification Day)',
    start: '2026-04-30',
    end: '2026-04-30',
    type: 'public',
    editable: true
  },
  {
    name: 'Ngày Quốc tế lao động (International Labor Day)',
    start: '2026-05-01',
    end: '2026-05-01',
    type: 'public',
    editable: true
  },
  {
    name: 'Quốc khánh (National Day)',
    start: '2026-09-02',
    end: '2026-09-02',
    type: 'public',
    editable: true
  }
];

// Fetch holidays from Nager.Date API
async function fetchHolidaysFromAPI(countryCode, year) {
  try {
    const response = await fetch(`https://date.nager.at/api/v3/publicholidays/${year}/${countryCode}`);

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const holidays = await response.json();

    // Transform API response to our format
    return holidays.map(h => ({
      name: h.localName || h.name,
      start: h.date,
      end: h.date,
      type: 'public',
      editable: true
    }));
  } catch (error) {
    console.error(`Error fetching holidays for ${countryCode} ${year}:`, error);
    return null;
  }
}

// Auto-import holidays for a country and year
async function autoImportHolidays(countryCode, year) {
  const loadingKey = `${countryCode}-${year}`;

  // Show loading state
  showNotification(`📥 Loading ${year} holidays for ${countryCode}...`, 'info');

  let holidays;

  // Use built-in data for statutory holidays
  if (countryCode === 'CN' && year === 2026) {
    holidays = CHINA_STATUTORY_HOLIDAYS_2026;
  } else if (countryCode === 'VN' && year === 2026) {
    holidays = VIETNAM_STATUTORY_HOLIDAYS_2026;
  } else {
    // Use API for other years or countries
    holidays = await fetchHolidaysFromAPI(countryCode, year);
  }

  if (!holidays || holidays.length === 0) {
    showNotification(`❌ No holidays available for ${countryCode} ${year}`, 'error');
    return false;
  }

  // Store in our data
  if (!window.holidayCalendarData.countries[countryCode]) {
    window.holidayCalendarData.countries[countryCode] = {
      name: countryCode,
      holidays: []
    };
  }

  // Replace holidays for this year
  window.holidayCalendarData.countries[countryCode].holidays =
    window.holidayCalendarData.countries[countryCode].holidays.filter(h => {
      const holidayYear = new Date(h.start).getFullYear();
      return holidayYear !== year;
    });

  // Add new holidays
  window.holidayCalendarData.countries[countryCode].holidays.push(...holidays);
  window.holidayCalendarData.lastFetched[loadingKey] = new Date().toISOString();

  showNotification(`✅ Loaded ${holidays.length} holiday periods for ${countryCode} ${year}`, 'success');
  return true;
}

// Auto-load holidays when opening the manager
async function autoLoadInitialHolidays() {
  const currentYear = 2026; // Default year for the demo

  // Check if holidays are already loaded for this year
  const cnKey = `CN-${currentYear}`;
  const vnKey = `VN-${currentYear}`;

  const promises = [];

  if (!window.holidayCalendarData.lastFetched[cnKey]) {
    promises.push(autoImportHolidays('CN', currentYear));
  }

  if (!window.holidayCalendarData.lastFetched[vnKey]) {
    promises.push(autoImportHolidays('VN', currentYear));
  }

  if (promises.length > 0) {
    await Promise.all(promises);
  }
}

// Open Holiday Calendar Management UI
async function openHolidayCalendarManager() {
  // Auto-load holidays first
  await autoLoadInitialHolidays();

  const modal = document.createElement('div');
  modal.id = 'holidayCalendarModal';
  modal.className = 'fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4';

  const countries = window.holidayCalendarData.countries;

  modal.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-purple-600">
        <div class="flex items-center gap-3">
          <div class="text-3xl">📅</div>
          <div>
            <div class="text-lg font-bold text-white">Holiday Calendar Management</div>
            <div class="text-sm text-blue-100">Manage public holidays by country and year</div>
          </div>
        </div>
        <button onclick="closeHolidayCalendarManager()" class="text-white hover:bg-white/20 rounded-lg p-2">
          <span class="text-2xl">×</span>
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-6">
        <!-- Auto Import Section -->
        <div class="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6 mb-6">
          <div class="flex items-start gap-3 mb-4">
            <div class="text-3xl">🤖</div>
            <div class="flex-1">
              <div class="text-lg font-bold text-green-900 mb-2">Auto-Import Public Holidays</div>
              <div class="text-sm text-green-700 mb-4">Automatically fetch official public holidays from Nager.Date API</div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- China -->
            <div class="bg-white border border-green-300 rounded-lg p-4">
              <div class="flex items-center gap-2 mb-3">
                <span class="text-2xl">🇨🇳</span>
                <div>
                  <div class="font-bold text-slate-900">China (CN)</div>
                  <div class="text-xs text-green-700 mt-0.5">中国法定节假日（假期段）</div>
                </div>
              </div>
              <div class="flex gap-2">
                <select id="cnYear" class="flex-1 border rounded px-3 py-2 text-sm">
                  <option value="2026" selected>2026</option>
                  <option value="2027">2027</option>
                  <option value="2028">2028</option>
                </select>
                <button onclick="importHolidaysForCountry('CN')"
                        class="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700">
                  Load
                </button>
              </div>
              <div class="mt-2 text-xs text-slate-600">
                Current: ${countries.CN.holidays.length} holiday periods loaded
              </div>
              <div class="mt-1 text-xs text-green-600">
                ✓ Includes full statutory holiday periods (连续假期段)
              </div>
            </div>

            <!-- Vietnam -->
            <div class="bg-white border border-green-300 rounded-lg p-4">
              <div class="flex items-center gap-2 mb-3">
                <span class="text-2xl">🇻🇳</span>
                <div>
                  <div class="font-bold text-slate-900">Vietnam (VN)</div>
                  <div class="text-xs text-green-700 mt-0.5">Ngày lễ, Tết của Việt Nam</div>
                </div>
              </div>
              <div class="flex gap-2">
                <select id="vnYear" class="flex-1 border rounded px-3 py-2 text-sm">
                  <option value="2026" selected>2026</option>
                  <option value="2027">2027</option>
                  <option value="2028">2028</option>
                </select>
                <button onclick="importHolidaysForCountry('VN')"
                        class="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700">
                  Load
                </button>
              </div>
              <div class="mt-2 text-xs text-slate-600">
                Current: ${countries.VN.holidays.length} holiday periods loaded
              </div>
              <div class="mt-1 text-xs text-green-600">
                ✓ Includes official public holidays
              </div>
            </div>
          </div>
        </div>

        <!-- Holiday List by Country -->
        <div class="space-y-6">
          ${Object.keys(countries).map(countryCode => {
            const country = countries[countryCode];
            const sortedHolidays = [...country.holidays].sort((a, b) => a.start.localeCompare(b.start));

            return `
              <div class="border rounded-xl overflow-hidden">
                <div class="bg-slate-100 px-6 py-3 border-b flex items-center justify-between">
                  <div class="font-bold text-slate-900">${country.name} (${countryCode})</div>
                  <div class="text-sm text-slate-600">${sortedHolidays.length} holidays</div>
                </div>
                <div class="p-4">
                  ${sortedHolidays.length === 0 ? `
                    <div class="text-center py-8 text-slate-500">
                      <div class="text-4xl mb-2">📭</div>
                      <div class="text-sm">No holidays loaded. Use auto-import to fetch holidays.</div>
                    </div>
                  ` : `
                    <div class="space-y-2">
                      ${sortedHolidays.map((h, idx) => {
                        const startDate = new Date(h.start);
                        const endDate = new Date(h.end);
                        const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
                        const isMultiDay = h.end !== h.start;

                        return `
                        <div class="flex items-center justify-between p-3 border-2 ${isMultiDay ? 'border-amber-200 bg-amber-50' : 'border-slate-200'} rounded-lg hover:shadow-sm transition-all">
                          <div class="flex-1">
                            <div class="flex items-center gap-2 mb-1">
                              <div class="font-semibold text-sm text-slate-900">${h.name}</div>
                              ${isMultiDay ? `
                                <span class="px-2 py-0.5 bg-amber-500 text-white rounded text-xs font-bold">
                                  ${daysDiff} 天假期
                                </span>
                              ` : ''}
                            </div>
                            <div class="text-xs ${isMultiDay ? 'text-amber-700 font-semibold' : 'text-slate-600'}">
                              ${isMultiDay ? `📅 ${h.start} 至 ${h.end}` : `📅 ${h.start}`}
                            </div>
                            ${h.notes ? `
                              <div class="text-xs text-slate-500 mt-1 italic">💡 ${h.notes}</div>
                            ` : ''}
                          </div>
                          <div class="flex items-center gap-2">
                            <span class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">${h.type || 'public'}</span>
                            ${h.editable ? `
                              <button onclick="editHoliday('${countryCode}', ${idx})" class="text-blue-600 hover:bg-blue-100 p-1.5 rounded transition-colors">
                                ✏️
                              </button>
                              <button onclick="deleteHoliday('${countryCode}', ${idx})" class="text-red-600 hover:bg-red-100 p-1.5 rounded transition-colors">
                                🗑️
                              </button>
                            ` : ''}
                          </div>
                        </div>
                      `}).join('')}
                    </div>
                  `}

                  <!-- Add Custom Holiday Button -->
                  <button onclick="addCustomHoliday('${countryCode}')"
                          class="mt-4 w-full border-2 border-dashed border-slate-300 rounded-lg py-3 text-sm text-slate-600 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50">
                    + Add Custom Holiday
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Footer -->
      <div class="border-t px-6 py-4 bg-slate-50 flex items-center justify-between">
        <div class="text-xs text-slate-600">
          Changes are saved automatically
        </div>
        <button onclick="closeHolidayCalendarManager()"
                class="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
          Done
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

function closeHolidayCalendarManager() {
  const modal = document.getElementById('holidayCalendarModal');
  if (modal) modal.remove();
}

async function importHolidaysForCountry(countryCode) {
  const yearSelect = document.getElementById(countryCode === 'CN' ? 'cnYear' : 'vnYear');
  const year = parseInt(yearSelect.value);

  const success = await autoImportHolidays(countryCode, year);

  if (success) {
    // Refresh the modal
    closeHolidayCalendarManager();
    setTimeout(() => openHolidayCalendarManager(), 300);
  }
}

function addCustomHoliday(countryCode) {
  const name = prompt('Holiday name:');
  if (!name) return;

  const startDate = prompt('Start date (YYYY-MM-DD):', '2026-01-01');
  if (!startDate) return;

  const endDate = prompt('End date (YYYY-MM-DD):', startDate);
  if (!endDate) return;

  window.holidayCalendarData.countries[countryCode].holidays.push({
    name,
    start: startDate,
    end: endDate || startDate,
    type: 'custom',
    editable: true
  });

  // Refresh modal
  closeHolidayCalendarManager();
  setTimeout(() => openHolidayCalendarManager(), 100);
}

function editHoliday(countryCode, index) {
  const holiday = window.holidayCalendarData.countries[countryCode].holidays[index];

  const name = prompt('Holiday name:', holiday.name);
  if (name === null) return;

  const startDate = prompt('Start date (YYYY-MM-DD):', holiday.start);
  if (startDate === null) return;

  const endDate = prompt('End date (YYYY-MM-DD):', holiday.end);
  if (endDate === null) return;

  holiday.name = name;
  holiday.start = startDate;
  holiday.end = endDate || startDate;

  // Refresh modal
  closeHolidayCalendarManager();
  setTimeout(() => openHolidayCalendarManager(), 100);
}

function deleteHoliday(countryCode, index) {
  if (!confirm('Delete this holiday?')) return;

  window.holidayCalendarData.countries[countryCode].holidays.splice(index, 1);

  // Refresh modal
  closeHolidayCalendarManager();
  setTimeout(() => openHolidayCalendarManager(), 100);
}

// ========================================
// RAMP CURVE MANAGEMENT
// ========================================

// Global ramp curve templates store
if (!window.rampCurveTemplates) {
  window.rampCurveTemplates = {
    uph: {
      AUTO_30: {
        name: 'AUTO Line - 30 Days',
        line_type: 'AUTO',
        length_workdays: 30,
        factors: [
          0.50, 0.55, 0.60, 0.65, 0.70, 0.72, 0.74, 0.76, 0.78, 0.80,
          0.82, 0.84, 0.86, 0.88, 0.90, 0.91, 0.92, 0.93, 0.94, 0.95,
          0.96, 0.97, 0.98, 0.98, 0.99, 0.99, 1.00, 1.00, 1.00, 1.00
        ]
      },
      MANUAL_20: {
        name: 'MANUAL Line - 20 Days',
        line_type: 'MANUAL',
        length_workdays: 20,
        factors: [
          0.60, 0.65, 0.70, 0.75, 0.80, 0.82, 0.84, 0.86, 0.88, 0.90,
          0.92, 0.94, 0.95, 0.96, 0.97, 0.98, 0.99, 1.00, 1.00, 1.00
        ]
      }
    },
    yield: {
      AUTO_30: {
        name: 'AUTO Line - 30 Days',
        line_type: 'AUTO',
        length_workdays: 30,
        factors: [
          0.70, 0.72, 0.74, 0.76, 0.78, 0.80, 0.82, 0.84, 0.85, 0.86,
          0.87, 0.88, 0.89, 0.90, 0.91, 0.92, 0.93, 0.94, 0.95, 0.95,
          0.96, 0.96, 0.97, 0.97, 0.98, 0.98, 0.98, 0.98, 0.98, 0.98
        ]
      },
      MANUAL_20: {
        name: 'MANUAL Line - 20 Days',
        line_type: 'MANUAL',
        length_workdays: 20,
        factors: [
          0.75, 0.77, 0.79, 0.81, 0.83, 0.85, 0.87, 0.88, 0.89, 0.90,
          0.91, 0.92, 0.93, 0.94, 0.95, 0.96, 0.96, 0.97, 0.97, 0.97
        ]
      }
    }
  };
}

// Open UPH Ramp Curve Manager
function openUphRampCurveManager() {
  openRampCurveManager('uph', 'UPH Ramp Curves', '📊');
}

// Open Yield Ramp Curve Manager
function openYieldRampCurveManager() {
  openRampCurveManager('yield', 'Yield Ramp Curves', '📈');
}

// Generic Ramp Curve Manager
function openRampCurveManager(curveType, title, icon) {
  const modal = document.createElement('div');
  modal.id = 'rampCurveModal';
  modal.className = 'fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4';

  const templates = window.rampCurveTemplates[curveType];
  const curveLabel = curveType === 'uph' ? 'UPH' : 'Yield';

  modal.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-purple-600">
        <div class="flex items-center gap-3">
          <div class="text-3xl">${icon}</div>
          <div>
            <div class="text-lg font-bold text-white">${title}</div>
            <div class="text-sm text-blue-100">Manage default ramp curves by line type</div>
          </div>
        </div>
        <button onclick="closeRampCurveManager()" class="text-white hover:bg-white/20 rounded-lg p-2">
          <span class="text-2xl">×</span>
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-6">
        <div class="space-y-6">
          ${Object.keys(templates).map(templateKey => {
            const template = templates[templateKey];
            return `
              <div class="border-2 border-slate-200 rounded-xl overflow-hidden">
                <div class="bg-gradient-to-r from-slate-100 to-slate-50 px-6 py-4 border-b flex items-center justify-between">
                  <div>
                    <div class="font-bold text-slate-900 text-lg">${template.name}</div>
                    <div class="text-sm text-slate-600 mt-1">
                      Line Type: <span class="font-semibold">${template.line_type}</span> ·
                      Ramp Length: <span class="font-semibold">${template.length_workdays} workdays</span>
                    </div>
                  </div>
                  <button onclick="editRampCurveTemplate('${curveType}', '${templateKey}')"
                          class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">
                    ✏️ Edit Curve
                  </button>
                </div>

                <div class="p-6">
                  <!-- Visual representation of curve -->
                  <div class="mb-4">
                    <div class="flex items-center justify-between mb-2">
                      <div class="text-xs font-semibold text-slate-600">RAMP PROGRESSION (Workday-Indexed)</div>
                      <div class="text-xs text-slate-500">Start: ${(template.factors[0] * 100).toFixed(0)}% → End: ${(template.factors[template.factors.length - 1] * 100).toFixed(0)}%</div>
                    </div>
                    <div class="h-32 border rounded-lg bg-slate-50 p-3 flex items-end gap-0.5">
                      ${template.factors.map((factor, idx) => {
                        const height = factor * 100;
                        const isStart = idx === 0;
                        const isEnd = idx === template.factors.length - 1;
                        return `
                          <div class="flex-1 flex flex-col items-center justify-end group relative">
                            <div class="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t hover:from-blue-700 hover:to-blue-500 transition-all"
                                 style="height: ${height}%">
                            </div>
                            ${(isStart || isEnd || idx % 5 === 0) ? `
                              <div class="absolute -bottom-5 text-xs text-slate-500 font-semibold">${idx + 1}</div>
                            ` : ''}
                            <div class="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
                              Day ${idx + 1}: ${(factor * 100).toFixed(1)}%
                            </div>
                          </div>
                        `;
                      }).join('')}
                    </div>
                  </div>

                  <!-- Factor values grid -->
                  <div class="bg-slate-50 border rounded-lg p-4">
                    <div class="text-xs font-semibold text-slate-700 mb-2">Factor Values by Day:</div>
                    <div class="grid grid-cols-10 gap-2 text-xs">
                      ${template.factors.map((factor, idx) => `
                        <div class="text-center">
                          <div class="text-slate-500 mb-1">D${idx + 1}</div>
                          <div class="font-mono font-semibold ${factor >= 0.95 ? 'text-green-700' : factor >= 0.80 ? 'text-blue-700' : 'text-amber-700'}">
                            ${factor.toFixed(2)}
                          </div>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Add New Template Button -->
        <button onclick="addNewRampCurveTemplate('${curveType}')"
                class="mt-6 w-full border-2 border-dashed border-slate-300 rounded-lg py-4 text-sm text-slate-600 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 font-semibold">
          + Add New ${curveLabel} Ramp Curve Template
        </button>
      </div>

      <!-- Footer -->
      <div class="border-t px-6 py-4 bg-slate-50 flex items-center justify-between">
        <div class="text-xs text-slate-600">
          💡 These templates are used as defaults when creating new capacity units
        </div>
        <button onclick="closeRampCurveManager()"
                class="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
          Done
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

function closeRampCurveManager() {
  const modal = document.getElementById('rampCurveModal');
  if (modal) modal.remove();
}

function editRampCurveTemplate(curveType, templateKey) {
  const template = window.rampCurveTemplates[curveType][templateKey];
  const curveLabel = curveType === 'uph' ? 'UPH' : 'Yield';

  const modal = document.createElement('div');
  modal.id = 'rampCurveEditorModal';
  modal.className = 'fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4';

  modal.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-indigo-600 to-purple-600">
        <div>
          <div class="text-lg font-bold text-white">Edit ${curveLabel} Ramp Curve</div>
          <div class="text-sm text-indigo-100">${template.name}</div>
        </div>
        <button onclick="closeRampCurveEditor()" class="text-white hover:bg-white/20 rounded-lg p-2">
          <span class="text-2xl">×</span>
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-6">
        <!-- Live Preview Chart -->
        <div class="mb-6 bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200 rounded-xl p-6">
          <div class="text-sm font-bold text-slate-700 mb-3">Live Preview</div>
          <div id="curvePreview" class="h-48 border rounded-lg bg-white p-4 flex items-end gap-1">
            <!-- Chart will be rendered here -->
          </div>
        </div>

        <!-- Editable Factors -->
        <div class="bg-white border-2 border-slate-200 rounded-xl p-6">
          <div class="text-sm font-bold text-slate-700 mb-4">Edit Factor Values (0.00 to 1.00)</div>
          <div class="grid grid-cols-5 gap-3" id="factorInputs">
            ${template.factors.map((factor, idx) => `
              <div>
                <label class="text-xs text-slate-600 block mb-1">Day ${idx + 1}</label>
                <input type="number"
                       id="factor_${idx}"
                       value="${factor.toFixed(2)}"
                       min="0"
                       max="1"
                       step="0.01"
                       class="w-full border rounded px-2 py-1.5 text-sm font-mono"
                       onchange="updateCurvePreview('${curveType}', '${templateKey}')">
              </div>
            `).join('')}
          </div>

          <!-- Quick Actions -->
          <div class="mt-6 flex gap-2">
            <button onclick="applyLinearRamp('${curveType}', '${templateKey}')"
                    class="px-3 py-2 bg-slate-600 text-white rounded text-xs font-semibold hover:bg-slate-700">
              Apply Linear Ramp
            </button>
            <button onclick="applyLogarithmicRamp('${curveType}', '${templateKey}')"
                    class="px-3 py-2 bg-slate-600 text-white rounded text-xs font-semibold hover:bg-slate-700">
              Apply S-Curve Ramp
            </button>
            <button onclick="resetToDefault('${curveType}', '${templateKey}')"
                    class="px-3 py-2 bg-amber-600 text-white rounded text-xs font-semibold hover:bg-amber-700">
              Reset to Default
            </button>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="border-t px-6 py-4 bg-slate-50 flex justify-end gap-3">
        <button onclick="closeRampCurveEditor()"
                class="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-100">
          Cancel
        </button>
        <button onclick="saveRampCurveTemplate('${curveType}', '${templateKey}')"
                class="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
          Save Changes
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  updateCurvePreview(curveType, templateKey);
}

function closeRampCurveEditor() {
  const modal = document.getElementById('rampCurveEditorModal');
  if (modal) modal.remove();
}

function updateCurvePreview(curveType, templateKey) {
  const template = window.rampCurveTemplates[curveType][templateKey];
  const preview = document.getElementById('curvePreview');
  if (!preview) return;

  const factors = template.factors.map((_, idx) => {
    const input = document.getElementById(`factor_${idx}`);
    return input ? parseFloat(input.value) : template.factors[idx];
  });

  preview.innerHTML = factors.map((factor, idx) => {
    const height = factor * 100;
    return `
      <div class="flex-1 flex flex-col items-center justify-end group relative">
        <div class="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t transition-all"
             style="height: ${height}%">
        </div>
        <div class="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-xs px-2 py-1 rounded shadow-lg">
          ${(factor * 100).toFixed(1)}%
        </div>
      </div>
    `;
  }).join('');
}

function applyLinearRamp(curveType, templateKey) {
  const template = window.rampCurveTemplates[curveType][templateKey];
  const length = template.factors.length;

  for (let i = 0; i < length; i++) {
    const factor = 0.5 + (0.5 * i / (length - 1));
    const input = document.getElementById(`factor_${i}`);
    if (input) input.value = factor.toFixed(2);
  }

  updateCurvePreview(curveType, templateKey);
}

function applyLogarithmicRamp(curveType, templateKey) {
  const template = window.rampCurveTemplates[curveType][templateKey];
  const length = template.factors.length;

  for (let i = 0; i < length; i++) {
    const x = i / (length - 1);
    const factor = 0.5 + 0.5 / (1 + Math.exp(-10 * (x - 0.5)));
    const input = document.getElementById(`factor_${i}`);
    if (input) input.value = factor.toFixed(2);
  }

  updateCurvePreview(curveType, templateKey);
}

function resetToDefault(curveType, templateKey) {
  const template = window.rampCurveTemplates[curveType][templateKey];

  template.factors.forEach((factor, idx) => {
    const input = document.getElementById(`factor_${idx}`);
    if (input) input.value = factor.toFixed(2);
  });

  updateCurvePreview(curveType, templateKey);
}

function saveRampCurveTemplate(curveType, templateKey) {
  const template = window.rampCurveTemplates[curveType][templateKey];

  const newFactors = template.factors.map((_, idx) => {
    const input = document.getElementById(`factor_${idx}`);
    return input ? parseFloat(input.value) : template.factors[idx];
  });

  template.factors = newFactors;

  closeRampCurveEditor();
  closeRampCurveManager();

  showNotification(`✅ ${curveType === 'uph' ? 'UPH' : 'Yield'} ramp curve saved!`, 'success');

  // Reopen to show updated values
  setTimeout(() => {
    if (curveType === 'uph') {
      openUphRampCurveManager();
    } else {
      openYieldRampCurveManager();
    }
  }, 300);
}

function addNewRampCurveTemplate(curveType) {
  showNotification('⚠️ Add new template feature coming soon!', 'info');
}

// Export functions
window.openHolidayCalendarManager = openHolidayCalendarManager;
window.closeHolidayCalendarManager = closeHolidayCalendarManager;
window.importHolidaysForCountry = importHolidaysForCountry;
window.addCustomHoliday = addCustomHoliday;
window.editHoliday = editHoliday;
window.deleteHoliday = deleteHoliday;
window.autoImportHolidays = autoImportHolidays;
window.openUphRampCurveManager = openUphRampCurveManager;
window.openYieldRampCurveManager = openYieldRampCurveManager;
window.closeRampCurveManager = closeRampCurveManager;
window.editRampCurveTemplate = editRampCurveTemplate;
window.closeRampCurveEditor = closeRampCurveEditor;
window.updateCurvePreview = updateCurvePreview;
window.applyLinearRamp = applyLinearRamp;
window.applyLogarithmicRamp = applyLogarithmicRamp;
window.resetToDefault = resetToDefault;
window.saveRampCurveTemplate = saveRampCurveTemplate;
window.addNewRampCurveTemplate = addNewRampCurveTemplate;
