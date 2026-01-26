# Capacity Configuration Restructure Complete ✅

**Date**: 2026-01-24
**Status**: Configuration UI restructured to hierarchical Site → Line → Shift model

---

## Summary of Changes

Restructured the Production Plan Configuration section to use a hierarchical structure where:
1. Users first select/add Sites
2. Under each Site, add production Lines
3. Under each Line, add Shifts (DAY/NIGHT)
4. Holiday configuration is set at Site level
5. Curve selection (UPH/Yield) is done at Line-Shift level via dropdowns

---

## Key Changes

### 1. Removed Common Info Buttons from Config Section

**Before**:
- Manage Holidays, UPH Ramp Curves, and Yield Curves buttons were in the config section header
- These should be managed in Command Center as common information

**After**:
- Config section header now only shows title and description
- Description emphasizes that added capacity units define what the report will cover

**File**: [app_v2.js:3865-3869](app_v2.js#L3865-L3869)

---

### 2. New Hierarchical UI Structure

**Before**: Flat list of capacity units showing all fields

**After**: Three-level hierarchy:
```
🏭 Site: WF
  ├─ 📍 Line L1 (AUTO)
  │   ├─ DAY Shift
  │   └─ NIGHT Shift
  └─ + Add Line to WF
```

**Features**:
- **Site Level**:
  - Remove entire site
  - Holiday configuration (Legal vs Custom)
  - Add new lines to site

- **Line Level**:
  - Line ID and Type (AUTO/MANUAL)
  - Add shifts to line

- **Shift Level** (DAY/NIGHT):
  - Base UPH, Shift Hours, Ramp Start Date
  - **UPH Ramp Curve dropdown** (Standard 30-day, Fast 20-day, Slow 45-day, Custom)
  - **Yield Curve dropdown** (Standard 30-day, Fast 20-day, Slow 45-day, Custom)
  - Remove individual shift

**File**: [app_v2.js:3943-3958](app_v2.js#L3943-L3958)

---

### 3. Site-Level Holiday Configuration

Each site now has radio buttons to choose:
- **Follow Legal Holidays**: Uses statutory holidays for the site's country
- **Custom Holiday Schedule**: Site-specific holiday configuration

**Implementation**:
```html
<label>
  <input type="radio" name="holiday_WF" value="legal" checked>
  Follow Legal Holidays
</label>
<label>
  <input type="radio" name="holiday_WF" value="custom">
  Custom Holiday Schedule
</label>
```

**File**: [app_v2.js:4100-4113](app_v2.js#L4100-L4113)

---

### 4. Curve Selection via Dropdowns

Instead of "Edit" buttons, each shift now has dropdown selectors for curves:

**UPH Ramp Curve Options**:
- Standard 30-day Ramp
- Fast 20-day Ramp
- Slow 45-day Ramp
- Custom Curve (shows current point count)

**Yield Curve Options**:
- Standard 30-day Yield
- Fast 20-day Yield
- Slow 45-day Yield
- Custom Curve (shows current point count)

**File**: [app_v2.js:4086-4099](app_v2.js#L4086-L4099)

---

### 5. Updated Management Functions

**New Functions**:
- `addSiteCapacity()`: Add a new site
- `removeSite(siteId)`: Remove site and all its lines/shifts
- `addLineToSite(siteId)`: Add a production line to a site
- `addShiftToLine(siteId, lineId)`: Add DAY or NIGHT shift to a line
- `updateSiteHolidayConfig(siteId, configType)`: Update holiday configuration for a site

**Modified Functions**:
- `removeCapacityUnit(index)`: Now shows which shift is being removed
- `renderCapacityUnitsConfig()`: Completely rewritten to support hierarchical structure

**File**: [app_v2.js:4171-4264](app_v2.js#L4171-L4264)

---

### 6. Updated Configuration Tips

**New Tips**:
- Use the hierarchical structure: Add Site → Add Line → Add Shift
- Configure holiday schedules at the site level
- Select UPH and Yield curves for each Line × Shift combination using dropdowns
- Different shifts can have different ramp start dates and curves
- Ramp curves are workday-indexed

**File**: [app_v2.js:4022-4029](app_v2.js#L4022-L4029)

---

## Data Structure

### Updated Capacity Unit Format

Each capacity unit now includes:
```javascript
{
  unit_id: "WF_L1_DAY",
  program_id: "product_a",
  site_id: "WF",          // Used for Site grouping
  line_id: "L1",          // Used for Line grouping
  line_type: "AUTO",      // Shown at Line level
  shift_type: "DAY",      // Shift level
  base_uph: 120,
  shift_hours: 10,
  ramp_start_date: "2026-10-05",
  holiday_config: "legal", // NEW: Site-level holiday config
  uph_ramp_curve: { ... },
  yield_ramp_curve: { ... }
}
```

---

## UI Workflow

### Adding New Capacity

1. **Add Site**:
   - Click "+ Add Site"
   - Enter Site ID (e.g., WF, VN01)
   - Choose holiday configuration (Legal/Custom)

2. **Add Line to Site**:
   - Click "+ Add Line to [Site]"
   - Enter Line ID (e.g., L1, L2)
   - Enter Line Type (AUTO/MANUAL)

3. **Add Shift to Line**:
   - Click "+ Add Shift" under a Line
   - Choose Shift Type (DAY/NIGHT)
   - Configure UPH, hours, ramp start date
   - Select UPH and Yield curves from dropdowns

### Removing Capacity

- **Remove entire Site**: Removes all lines and shifts
- **Remove individual Shift**: Keeps site and line structure
- Confirmation prompts prevent accidental deletion

---

## Visual Structure

```
Production Plan Configuration
└─ Capacity Configuration (Site → Line → Shift)
    ├─ 🏭 Site: WF [Remove Site]
    │   ├─ Holiday Configuration: ○ Legal ● Custom
    │   ├─ 📍 Line L1 (AUTO) [+ Add Shift]
    │   │   ├─ DAY Shift [Remove]
    │   │   │   ├─ Base UPH: 120
    │   │   │   ├─ Shift Hours: 10
    │   │   │   ├─ Ramp Start: 2026-10-05
    │   │   │   ├─ UPH Curve: [Dropdown]
    │   │   │   └─ Yield Curve: [Dropdown]
    │   │   └─ NIGHT Shift [Remove]
    │   │       └─ (same fields)
    │   └─ [+ Add Line to WF]
    ├─ 🏭 Site: VN02
    └─ [+ Add Site]
```

---

## Benefits of New Structure

1. **Clearer Hierarchy**: Site → Line → Shift structure matches real-world organization
2. **Site-Level Holiday Config**: Makes sense since holidays are site/country-specific
3. **Easier Curve Selection**: Dropdowns are more intuitive than "Edit" buttons for predefined curves
4. **Better Visualization**: Indentation and borders clearly show relationships
5. **Common Info Separation**: Curve library and holiday management belong in Command Center
6. **Flexible Configuration**: Easy to add/remove at any level without affecting others

---

## Testing Checklist

- [x] UI renders correctly with hierarchical structure
- [x] Site-level holiday configuration radio buttons work
- [x] Curve selection dropdowns display correctly
- [x] Add Site button functional
- [x] Add Line button functional
- [x] Add Shift button functional
- [x] Remove functions work at all levels
- [x] Seed data displays correctly in new format
- [ ] Verify curve dropdown changes save properly
- [ ] Verify holiday config changes propagate to all units in site
- [ ] Test with multiple sites
- [ ] Test adding/removing various combinations

---

## Next Steps

1. **Implement Curve Dropdown Functionality**: Wire up dropdown changes to update the actual curve data
2. **Add Custom Curve Editor**: When "Custom" is selected, open curve editor
3. **Holiday Calendar Integration**: Link "Custom Holiday Schedule" to holiday manager
4. **Persist Configuration**: Save user's curve selections and holiday preferences
5. **Command Center Integration**: Move curve library and holiday management to Command Center

---

## Notes

- The rendering function `renderCapacityUnitsConfig()` now groups units by Site, then by Line
- All existing seed data works with the new structure (backward compatible)
- Default curve selection shows "Standard 30-day" with option to view/edit custom curves
- Holiday config defaults to "legal" (follow statutory holidays)

---

**Status**: Ready for testing and user feedback
