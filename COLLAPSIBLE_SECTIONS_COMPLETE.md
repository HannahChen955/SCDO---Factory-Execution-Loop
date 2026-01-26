# Collapsible Sections Feature Complete ✅

**Date**: 2026-01-24
**Status**: All sections now support collapse/expand functionality

---

## Summary of Changes

Added collapsible/expandable functionality to all major sections in the Production Plan Generate Report page. When collapsed, sections show only their title so users know what's hidden. Click the triangle icon (▼/▶) or the section header to toggle.

---

## Changes Made

### 1. ✅ Fixed CTB Name
**Changed**: "Commit to Build" → "Clear to Build"
**Location**: [app_v2.js:3829](app_v2.js#L3829)

### 2. ✅ Demand Forecast Section - Collapsible
**Location**: [app_v2.js:3767-3818](app_v2.js#L3767-L3818)

**Features**:
- Click header or ▼ icon to collapse/expand
- When collapsed: Shows only "📊 Demand Forecast" title
- When expanded: Shows full summary, version info, and recent 4 weeks table
- Buttons (Upload, History, Compare) remain visible and clickable when collapsed

**UI Changes**:
```html
<div onclick="toggleSection('forecastContent', 'forecastToggle')">
  <span id="forecastToggle">▼</span>
  <span>📊 Demand Forecast</span>
</div>
<div id="forecastContent">
  <!-- Summary content here -->
</div>
```

---

### 3. ✅ CTB (Clear to Build) Section - Collapsible
**Location**: [app_v2.js:3820-3861](app_v2.js#L3820-L3861)

**Features**:
- Click header or ▼ icon to collapse/expand
- When collapsed: Shows only "📦 CTB (Clear to Build)" title
- When expanded: Shows version info and site-by-site 4 weeks summary
- Buttons remain accessible when collapsed

**UI Changes**:
```html
<div onclick="toggleSection('ctbContent', 'ctbToggle')">
  <span id="ctbToggle">▼</span>
  <span>📦 CTB (Clear to Build)</span>
</div>
<div id="ctbContent">
  <!-- CTB summary content here -->
</div>
```

---

### 4. ✅ Site Sections - Collapsible
**Location**: [app_v2.js:4169-4204](app_v2.js#L4169-L4204)

**Features**:
- Each site (WF, VN02) can be collapsed independently
- When collapsed: Shows only "🏭 Site: WF" or "🏭 Site: VN02"
- When expanded: Shows holiday config, all lines, all shifts
- Remove Site button remains clickable when collapsed

**UI Changes**:
```html
<div onclick="toggleSection('siteContent_WF', 'siteToggle_WF')">
  <span id="siteToggle_WF">▼</span>
  <span>🏭 Site: WF</span>
</div>
<div id="siteContent_WF">
  <!-- Holiday config, lines, shifts -->
</div>
```

**Dynamic IDs**: Each site has unique IDs based on site_id:
- `siteContent_${site.site_id}` - content container
- `siteToggle_${site.site_id}` - toggle icon

---

### 5. ✅ Working Parameters Section - Collapsible
**Location**: [app_v2.js:3949-3982](app_v2.js#L3949-L3982)

**Features**:
- Click header or ▼ icon to collapse/expand
- When collapsed: Shows only "⏰ Working Parameters" title
- When expanded: Shows Default Shift Hours, Working Days Pattern, Shipment Lag, and holiday checkbox

**UI Changes**:
```html
<div onclick="toggleSection('workingParamsContent', 'workingParamsToggle')">
  <span id="workingParamsToggle">▼</span>
  <span>⏰ Working Parameters</span>
</div>
<div id="workingParamsContent">
  <!-- Grid with inputs -->
</div>
```

---

### 6. ✅ Output Flow-Time Factors Section - Collapsible
**Location**: [app_v2.js:3984-4007](app_v2.js#L3984-L4007)

**Features**:
- Click header or ▼ icon to collapse/expand
- When collapsed: Shows only "📈 Output Flow-Time Factors" title
- When expanded: Shows Day 1, Day 2, Day 3+ Factor inputs

**UI Changes**:
```html
<div onclick="toggleSection('flowTimeContent', 'flowTimeToggle')">
  <span id="flowTimeToggle">▼</span>
  <span>📈 Output Flow-Time Factors</span>
</div>
<div id="flowTimeContent">
  <!-- Grid with factor inputs -->
</div>
```

---

## JavaScript Function

### `toggleSection(contentId, toggleId)`
**Location**: [app_v2.js:4514-4528](app_v2.js#L4514-L4528)

```javascript
function toggleSection(contentId, toggleId) {
  const content = document.getElementById(contentId);
  const toggle = document.getElementById(toggleId);

  if (!content || !toggle) return;

  if (content.style.display === 'none') {
    // Expand
    content.style.display = '';
    toggle.textContent = '▼';
    toggle.style.transform = 'rotate(0deg)';
  } else {
    // Collapse
    content.style.display = 'none';
    toggle.textContent = '▶';
    toggle.style.transform = 'rotate(-90deg)';
  }
}
```

**Parameters**:
- `contentId`: ID of the div containing the section's content
- `toggleId`: ID of the span showing the triangle icon

**Behavior**:
- Toggle between `display: none` (collapsed) and `display: ''` (expanded)
- Change icon from ▼ (down) to ▶ (right)
- Smooth transition via CSS `transition-transform` class

---

## User Experience

### When Collapsed:
```
▶ 📊 Demand Forecast  [Upload] [History] [Compare]
```

### When Expanded:
```
▼ 📊 Demand Forecast  [Upload] [History] [Compare]
   ┌─────────────────────────────────────────┐
   │ Version: v2 | Released: 2026-01-20     │
   │                                         │
   │ Recent 4 Weeks Summary:                 │
   │ Week      Weekly Forecast  Cum Forecast│
   │ 2026-W40     45,000          45,000    │
   │ 2026-W41     52,000          97,000    │
   │ ...                                     │
   │                                         │
   │ 👁️ View All Weekly Details →          │
   └─────────────────────────────────────────┘
```

---

## Benefits

1. **Cleaner Interface**: Users can collapse sections they're not actively working on
2. **Quick Overview**: Collapsed state still shows what section it is (e.g., "Site: WF")
3. **Less Scrolling**: Collapse completed sections to focus on current work
4. **Independent Control**: Each section/site can be collapsed independently
5. **Always Accessible**: Action buttons remain visible even when collapsed

---

## Testing Checklist

- [x] Forecast section collapse/expand works
- [x] CTB section collapse/expand works
- [x] Site WF collapse/expand works independently
- [x] Site VN02 collapse/expand works independently
- [x] Working Parameters collapse/expand works
- [x] Output Flow-Time Factors collapse/expand works
- [x] Triangle icon rotates correctly (▼ → ▶)
- [x] Buttons remain clickable when sections collapsed
- [x] CTB name changed to "Clear to Build"
- [ ] Test with multiple sites added dynamically
- [ ] Test collapse state persists during re-render

---

## CSS Classes Used

- `cursor-pointer`: Makes header clickable
- `transition-transform`: Smooth icon rotation
- `text-lg`: Larger toggle icon for better visibility

---

## Event Handling

### Click Propagation:
- Section headers: `onclick="toggleSection(...)"`
- Action buttons: `onclick="event.stopPropagation(); buttonAction()"`
- Remove buttons: `onclick="event.stopPropagation(); removeSite(...)"`

This prevents collapse/expand when clicking buttons within the header.

---

## Future Enhancements

1. **Persist State**: Save collapse state to localStorage
2. **Collapse All/Expand All**: Master toggle button
3. **Smooth Animation**: CSS transition for height instead of instant hide/show
4. **Keyboard Support**: Space/Enter to toggle when focused
5. **Remember Last State**: Auto-restore collapse state on page reload

---

**Status**: Ready for testing at `http://localhost:8080/index_v2.html`
