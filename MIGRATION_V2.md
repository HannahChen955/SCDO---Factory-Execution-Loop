# 🚀 Migration Guide to V2 — Delivery-first Architecture

## What Changed

### Core Philosophy Shift
- **V1**: Module showcase (6 modules displayed as separate features)
- **V2**: **Delivery-first decision system** (answer-first, commit protection focused)

### Key Differences

#### 1. Information Architecture
**V1 Navigation (6 modules)**:
- Home / Signals / Risk Radar / Orchestration / Evidence & Learning

**V2 Navigation (5 pages)**:
- **Home — Delivery Command Center** (NEW hero layout)
- Signals
- Risk Radar
- Orchestration
- **Reports** (NEW dedicated page)

#### 2. Home Page — Completely Redesigned

**V1 Home**:
- Executive Summary
- Top Priorities (dual risks side-by-side)
- Today's Loop
- Recent Events

**V2 Home (Delivery-first)**:
```
┌─────────────────────────────────────────┐
│ Scenario Header                         │
├─────────────────────────────────────────┤
│ 🎯 THIS WEEK'S DELIVERY COMMIT          │
│ (Hero Card - YELLOW/GREEN/RED)          │
│                                         │
│ • Commit Health: YELLOW                 │
│ • At-risk Units: 12.4k                  │
│ • Confidence: 78%                       │
│                                         │
│ What we need to do (next 48h):          │
│   1. Expedite IC-77 (Sourcing, 24h)     │
│   2. Prioritize re-test (PQE, 48h)      │
│   3. Re-sequence build (Ops, same day)  │
│                                         │
│ Next checkpoint: Daily 16:00 cut        │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ TOP DELIVERY RISKS (Ranked)             │
│                                         │
│ #1 SKU-A1 / SZ-01 / W04 [LATE]          │
│    Score: 86 | Confidence: 78%          │
│    Driver: IC-77 ETA slip + FPY drift   │
│    Action: Expedite IC-77 + re-test...  │
│                                         │
│ #2 Order-48392 / SKU-A2 [LATE]          │
│ #3 SKU-A3 / W05 [EXCESS] (Monitor)      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ TODAY'S LOOP — End-to-End Case         │
│ (Delivery narrative focus)              │
│                                         │
│ → SIGNALS                               │
│ → FACTORY IMPACT                        │
│ → DELIVERY RISK                         │
│ → DECISION                              │
│ → RECOVERY ACTIONS                      │
│ → NEXT CHECK                            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ ⚠️ PACING GUARDRAIL (Secondary)         │
│ No new releases unless delivery GREEN   │
└─────────────────────────────────────────┘
```

#### 3. Data Structure Changes

**V1 Data (`mockData.json`)**:
```json
{
  "demoData": {
    "A": {
      "kpis": {...},
      "riskItemsLate": [...],
      "riskItemsExcess": [...]
    }
  }
}
```

**V2 Data (`mockData_delivery.json`)**:
```json
{
  "demoData": {
    "A": {
      "deliveryCommit": {
        "commitHealth": "YELLOW",
        "atRiskUnits": 12400,
        "confidence": 78,
        "recoveryActions": [...]
      },
      "topDeliveryRisks": [...],
      "todaysLoop": {...},
      "pacingGuardrail": {...}
    }
  }
}
```

#### 4. File Changes

| Old Files | New Files | Purpose |
|-----------|-----------|---------|
| `index.html` | `index_v2.html` | New layout with Reports nav |
| `app.js` | `app_v2.js` | Delivery-first rendering logic |
| `mockData.json` | `mockData_delivery.json` | Delivery-focused data structure |
| `integration_patch.js` | (integrated in app_v2.js) | Case drawer & reports built-in |

## How to Migrate

### Option 1: Test V2 Alongside V1 (Recommended)

```bash
# V1 stays at:
http://localhost:8000/index.html

# V2 is available at:
http://localhost:8000/index_v2.html
```

Both versions run independently. You can compare them side-by-side.

### Option 2: Replace V1 with V2

```bash
# Backup V1
mv index.html index_v1_backup.html
mv app.js app_v1_backup.js
mv mockData.json mockData_v1_backup.json

# Activate V2
mv index_v2.html index.html
mv app_v2.js app.js
mv mockData_delivery.json mockData.json

# Refresh browser
http://localhost:8000/index.html
```

## Key Features in V2

### ✅ Delivery Commit Hero Card
- Shows **commit health status** (GREEN/YELLOW/RED)
- Displays **at-risk units** and **confidence**
- Lists **top 3 recovery actions** with owners & SLAs
- Shows **next checkpoint**

### ✅ Delivery-first Risk Ranking
- Late risks shown first (delivery threats)
- Excess risks shown as "Guardrails" (secondary)
- Each risk shows: Driver → Impact → Action → Owner/SLA

### ✅ Today's Loop with Delivery Narrative
- Emphasizes "W04 ship window at risk"
- Shows recovery plan and next check

### ✅ Pacing Guardrail
- Small, non-intrusive card
- Rule: "No new releases unless delivery recovery GREEN"

### ✅ Reports Page (NEW)
- 3 report templates:
  1. Weekly Factory Execution Brief
  2. Exception Report — Top 5 Risks
  3. Forecast Downside Impact
- Preview & Download PDF buttons

### ✅ Case Drawer (Enhanced)
- Snapshot: Score/Confidence/Route/Impact
- Driver (single most important)
- Recommended Action with Owner/SLA
- Generate Report button
- Feedback buttons

### ✅ Report Generation (Delivery-focused)
- Report title: "W04 Commit Protection Brief"
- First line: "Current commit is at risk..."
- Sections: Situation / Driver / Impact / Risk Assessment / Decision & Route / Recommended Actions
- Professional PDF export

## English Copy (V2)

All copy is now **delivery-first** and **executive-friendly**:

### Home Page
- "This Week's Delivery Commit — W04"
- "What we need to do (next 48h):"
- "At-risk units: 12.4k"
- "Next checkpoint: Daily 16:00 cut"

### Signals Page
- "Turn factory reality into trusted signals for commit decisions"

### Risk Radar
- "Rank what threatens commit and highlight the few actions that move delivery outcomes"

### Orchestration
- "Route recovery actions with owners and SLAs; escalate only when it changes commit"

### Reports
- "One-click Briefings for Leadership"

## Testing Checklist

After migration, test these flows:

- [ ] Open `index_v2.html` in browser
- [ ] Home page shows Delivery Commit hero card with YELLOW status
- [ ] Click risk card #1 → Case Drawer opens on right
- [ ] In drawer, click "📄 Generate Report" → Report preview appears
- [ ] Click "Download PDF" → PDF downloads with filename `SCDO_W04_Commit_Brief_*.pdf`
- [ ] Navigate to Reports page → See 3 template cards
- [ ] Switch to Scenario B → Home shows GREEN commit health
- [ ] Switch to Signals page → See Data Quality Matrix and Event Stream
- [ ] Switch to Risk Radar → See Late Risks first, Excess Risks below
- [ ] Switch to Orchestration → See routing rules and playbooks

## Common Issues

### Issue 1: "No data available for this scenario"
**Cause**: Scenario B or C may not have complete `deliveryCommit` data in mockData_delivery.json
**Fix**: Check that all scenarios have at minimum:
```json
"deliveryCommit": {
  "commitHealth": "GREEN",
  "atRiskUnits": 0,
  "confidence": 85
}
```

### Issue 2: Case Drawer doesn't open
**Cause**: Risk ID mismatch between topDeliveryRisks and riskRadar
**Fix**: Ensure risk IDs are unique and consistent (e.g., "RISK-A1-001")

### Issue 3: Report PDF doesn't download
**Cause**: html2pdf.js library not loaded
**Fix**: Verify CDN link in index_v2.html line 125:
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
```

## What to Show Your Boss

### Demo Script (5 minutes)

1. **Open Home page**
   - "This is our Factory Execution Loop control tower. It's delivery-first — you see the commit health immediately."

2. **Point to Hero Card**
   - "This week's commit is YELLOW — recoverable with these 3 actions in next 48 hours."

3. **Scroll to Top Delivery Risks**
   - "These are ranked by what threatens W04 commit most. #1 is IC-77 material slip plus yield drift."

4. **Click risk card #1**
   - "Every risk opens a detailed panel with driver, impact, and recommended action."

5. **Click Generate Report**
   - "We can generate a one-page brief in seconds. Title: 'W04 Commit Protection Brief.'"

6. **Download PDF**
   - "This can go straight to planning, sourcing, or leadership. It's ready-made."

7. **Close, navigate to Reports**
   - "We have 3 standard templates: Weekly Brief, Exception Report, and Forecast Downside Impact."

8. **Switch Scenario to B**
   - "In Scenario B, commit is GREEN but we have a pacing guardrail active — demand softness detected, so we freeze releases."

### Value Pitch
- "This isn't a dashboard. It's a **decision system**."
- "Factory execution signals feed into SCDO to **protect commit** and **control liability**."
- "The team gets **clear actions** with **owners and SLAs**, not just metrics."
- "Leadership gets **one-click briefs** they can forward or print."

## Next Steps

After V2 is validated:

1. **Enhance Reports page** with actual preview modals (not just alerts)
2. **Add Workflow Rail** (horizontal pipeline showing Signals → Radar → Orchestration → Evidence)
3. **Add interactive Timeline** for Today's Loop (clickable steps)
4. **Add Impact line** to every risk card
5. **Add Routed Today list** on Orchestration page
6. **Add Feedback Closure widget** on Evidence page

## Rollback Plan

If you need to revert to V1:

```bash
# Restore V1 files
mv index_v1_backup.html index.html
mv app_v1_backup.js app.js
mv mockData_v1_backup.json mockData.json

# Refresh browser
http://localhost:8000/index.html
```

## Questions?

Check these files:
- **Data structure**: [mockData_delivery.json](mockData_delivery.json)
- **Rendering logic**: [app_v2.js](app_v2.js)
- **HTML layout**: [index_v2.html](index_v2.html)
- **Original requirements**: [QUICK_START.md](QUICK_START.md)

---

**V2 is ready to demo.** 🚀

Open `http://localhost:8000/index_v2.html` to see the Delivery-first Factory Execution Loop.
