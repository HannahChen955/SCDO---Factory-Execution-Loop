// ==========================================
// ENHANCED FEATURES INTEGRATION PATCH
// Copy this content to the END of app.js
// ==========================================

// Case Drawer Functions
function openCaseDrawer(riskId) {
  const demo = getDemo();
  const allRisks = [...demo.riskItemsLate, ...demo.riskItemsExcess];
  const risk = allRisks.find(r => r.id === riskId);
  if (!risk) return;

  STATE.selectedRiskId = riskId;
  const ev = risk.evidence;
  const icon = ROUTE_ICONS[risk.route] || "•";

  const drawerHtml = `
    <div class="space-y-4">
      <div class="border rounded-xl p-3 bg-gradient-to-br from-blue-50 to-white">
        <div class="text-xs text-slate-500 mb-2">SNAPSHOT</div>
        <div class="font-bold text-lg mb-2">${risk.object}</div>
        <div class="grid grid-cols-3 gap-2 text-center">
          <div><div class="text-xs text-slate-500">Score</div><div class="text-xl font-bold">${risk.score}</div></div>
          <div><div class="text-xs text-slate-500">Confidence</div><div class="text-xl font-bold">${(risk.confidence * 100).toFixed(0)}%</div></div>
          <div><div class="text-xs text-slate-500">Route</div><div class="text-2xl">${icon}</div></div>
        </div>
        <div class="mt-2 text-xs text-slate-600"><span class="font-semibold">Impact:</span> ${ev.impact}</div>
      </div>
      <div class="border rounded-xl p-3">
        <div class="text-xs font-semibold text-slate-500 mb-2">→ SIGNALS</div>
        <div class="space-y-1">${ev.signals.slice(0, 2).map(s => `<div class="text-xs p-2 bg-slate-50 rounded border-l-2 border-blue-500">${s}</div>`).join('')}</div>
      </div>
      <div class="border rounded-xl p-3 bg-green-50">
        <div class="text-xs font-semibold text-slate-500 mb-2">→ RECOMMENDED ACTION</div>
        <div class="text-sm font-semibold mb-2">${risk.recommendedAction}</div>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div><span class="text-slate-500">Owner:</span> China Delivery</div>
          <div><span class="text-slate-500">SLA:</span> 24-48h</div>
        </div>
      </div>
      <div class="border rounded-xl p-3">
        <div class="text-xs font-semibold text-slate-500 mb-2">→ EVIDENCE PACK</div>
        <button onclick="window.__openEvidence('${risk.id}')" class="w-full text-sm bg-slate-900 text-white rounded-lg px-3 py-2 hover:bg-slate-800 mb-2">Open Full Evidence Pack</button>
        <button onclick="generateReport('${risk.id}')" class="w-full text-sm border rounded-lg px-3 py-2 hover:bg-slate-50">📄 Generate Report</button>
      </div>
      <div class="border rounded-xl p-3">
        <div class="text-xs font-semibold text-slate-500 mb-2">→ FEEDBACK</div>
        <div class="text-xs text-slate-600 mb-2">Was this recommendation effective?</div>
        <div class="grid grid-cols-2 gap-2">
          <button class="text-sm border rounded-lg px-3 py-2 hover:bg-green-50" onclick="submitFeedback('${risk.id}', 'effective')">✓ Effective</button>
          <button class="text-sm border rounded-lg px-3 py-2 hover:bg-red-50" onclick="submitFeedback('${risk.id}', 'ineffective')">✗ Ineffective</button>
        </div>
        <div class="mt-2 text-xs text-slate-500">Status: Pending</div>
      </div>
    </div>
  `;

  document.getElementById('caseDrawerBody').innerHTML = drawerHtml;
  document.getElementById('caseDrawer').classList.remove('hidden');
  document.getElementById('caseDrawerBackdrop').classList.remove('hidden');
}

function closeCaseDrawer() {
  document.getElementById('caseDrawer').classList.add('hidden');
  document.getElementById('caseDrawerBackdrop').classList.add('hidden');
  STATE.selectedRiskId = null;
}

function submitFeedback(riskId, type) {
  alert(`Feedback "${type}" submitted for case ${risk.id}. This would update the learning model.`);
  closeCaseDrawer();
}

// Report Generation with Internal Weekly Report Style
function generateReport(riskId) {
  const demo = getDemo();
  const allRisks = [...demo.riskItemsLate, ...demo.riskItemsExcess];
  const risk = allRisks.find(r => r.id === riskId);
  if (!risk) return;

  const ev = risk.evidence;
  const scenario = getScenario();
  const timestamp = new Date().toISOString().split('T')[0];

  const reportHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;max-width:8.5in;margin:0 auto;padding:0.75in;background:white;color:#1e293b;line-height:1.5}
.header{border-bottom:3px solid #0f172a;padding-bottom:12px;margin-bottom:24px}
.header h1{font-size:18px;font-weight:700;margin:0 0 4px 0;color:#0f172a}
.header .meta{font-size:11px;color:#64748b}
.section{margin-bottom:20px;page-break-inside:avoid}
.section-title{font-size:10px;font-weight:700;text-transform:uppercase;color:#64748b;letter-spacing:0.5px;margin-bottom:8px;border-bottom:1px solid #e2e8f0;padding-bottom:4px}
.section-content{font-size:12px;color:#334155}
.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:16px 0}
.metric-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;text-align:center}
.metric-label{font-size:10px;color:#64748b;text-transform:uppercase;margin-bottom:4px}
.metric-value{font-size:24px;font-weight:700;color:#0f172a}
.action-box{background:#f0fdf4;border-left:4px solid #22c55e;padding:12px;margin:8px 0;border-radius:4px}
.action-box strong{color:#166534}
ul{margin:8px 0;padding-left:20px}
li{margin:4px 0;font-size:12px}
.footer{margin-top:32px;padding-top:16px;border-top:2px solid #e2e8f0;font-size:10px;color:#94a3b8}
.status-badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:600;background:#fef3c7;color:#92400e}
</style></head><body>
<div class="header">
<h1>🏭 SCDO Decision Briefing — Factory Execution Loop</h1>
<div class="meta"><strong>Case ID:</strong> ${risk.id} | <strong>Scope:</strong> ${STATE.filters.productLine} / ${STATE.filters.factory} / ${STATE.filters.week} | <strong>Generated:</strong> ${timestamp} | <strong>Scenario:</strong> ${scenario.name}</div>
</div>
<div class="section"><div class="section-title">Situation</div><div class="section-content"><strong>${risk.object}</strong> — ${risk.drivers[0]}. Requires <span class="status-badge">${risk.route.replace(/_/g, ' ')}</span> routing.</div></div>
<div class="section"><div class="section-title">Key Signals</div><ul>${ev.signals.slice(0, 3).map(s => `<li>${s}</li>`).join('')}</ul></div>
<div class="section"><div class="section-title">Risk Assessment</div>
<div class="metrics">
<div class="metric-card"><div class="metric-label">Risk Score</div><div class="metric-value">${risk.score}</div></div>
<div class="metric-card"><div class="metric-label">Confidence</div><div class="metric-value">${(risk.confidence * 100).toFixed(0)}%</div></div>
<div class="metric-card"><div class="metric-label">Route</div><div class="metric-value" style="font-size:20px;">${ROUTE_ICONS[risk.route]}</div></div>
</div>
<div class="section-content"><strong>Impact:</strong> ${ev.impact}</div></div>
<div class="section"><div class="section-title">Decision & Route</div>
<div class="section-content"><strong>Route:</strong> ${risk.route.replace(/_/g, ' ')}<br><strong>Rule:</strong> ${risk.route === 'HUMAN_REVIEW' ? 'Confidence 60-80% OR Risk score 70-85 OR Cross-team impact' : 'Auto-action threshold met'}</div></div>
<div class="section"><div class="section-title">Recommended Actions</div>
${risk.recommendedAction.split(/[;,+]/).slice(0, 3).map((action, i) => `
<div class="action-box"><strong>Action ${i + 1}:</strong> ${action.trim()}<br>
<span style="font-size:11px;color:#64748b;">Owner: ${i === 0 ? 'Sourcing' : i === 1 ? 'PQE/Factory' : 'China Delivery'} | SLA: ${i === 0 ? '24h' : '48h'}</span></div>`).join('')}
</div>
<div class="section"><div class="section-title">Evidence</div><ul>${ev.signals.map(s => `<li>${s}</li>`).join('')}${risk.drivers.map(d => `<li>${d}</li>`).join('')}</ul></div>
<div class="footer">
<div><strong>Decision Log:</strong> (Pending review by China Delivery Team)</div>
<div><strong>Feedback Status:</strong> Awaiting outcome validation within 7 days</div>
<div style="margin-top:8px;"><em>Generated by SCDO Control Tower — Factory Execution Loop | Confidential & Internal Use Only</em></div>
</div></body></html>`;

  document.getElementById('reportPreview').innerHTML = reportHtml;
  document.getElementById('reportModal').classList.remove('hidden');
  document.getElementById('reportModalBackdrop').classList.remove('hidden');
  window._currentReportHtml = reportHtml;
  window._currentReportFilename = `SCDO_Briefing_${risk.id}_${timestamp}`;
}

function downloadHTMLReport() {
  const blob = new Blob([window._currentReportHtml], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${window._currentReportFilename}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadPDFReport() {
  const element = document.getElementById('reportPreview');
  const opt = {
    margin: 0.5,
    filename: `${window._currentReportFilename}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
  };
  html2pdf().set(opt).from(element).save();
}

function closeReportModal() {
  document.getElementById('reportModal').classList.add('hidden');
  document.getElementById('reportModalBackdrop').classList.add('hidden');
}

// Global exports
window.openCaseDrawer = openCaseDrawer;
window.closeCaseDrawer = closeCaseDrawer;
window.generateReport = generateReport;
window.submitFeedback = submitFeedback;
window.downloadHTMLReport = downloadHTMLReport;
window.downloadPDFReport = downloadPDFReport;
window.closeReportModal = closeReportModal;

// Initialize report modal buttons after DOM loads
(function() {
  const initReportButtons = () => {
    const downloadHTMLBtn = document.getElementById('downloadHTMLBtn');
    const downloadPDFBtn = document.getElementById('downloadPDFBtn');
    const closeReportModalBtn = document.getElementById('closeReportModalBtn');
    const generateReportBtn = document.getElementById('generateReportBtn');

    if (downloadHTMLBtn) {
      downloadHTMLBtn.addEventListener('click', downloadHTMLReport);
      downloadPDFBtn.addEventListener('click', downloadPDFReport);
      closeReportModalBtn.addEventListener('click', closeReportModal);
      if (generateReportBtn) {
        generateReportBtn.addEventListener('click', () => {
          if (STATE.selectedRiskId) generateReport(STATE.selectedRiskId);
        });
      }
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReportButtons);
  } else {
    initReportButtons();
  }
})();
