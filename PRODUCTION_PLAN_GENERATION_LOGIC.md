# Production Plan Generation - Complete Logic Specification

**Document Version**: 1.0
**Last Updated**: 2026-01-24
**Status**: Living Document (continuously updated)

---

## Table of Contents

1. [Overview](#overview)
2. [Field Definitions & Calculation Formulas](#field-definitions--calculation-formulas) ⭐ **NEW**
3. [Data Requirements](#data-requirements)
4. [Generation Modes](#generation-modes)
5. [Core Calculation Logic](#core-calculation-logic)
6. [Calendar System](#calendar-system)
7. [Capacity Calculation](#capacity-calculation)
8. [Output Calculation](#output-calculation)
9. [CTB Constraints](#ctb-constraints)
10. [Shipment Lag](#shipment-lag)
11. [Aggregation Logic](#aggregation-logic)
12. [Validation Rules](#validation-rules)
13. [Edge Cases](#edge-cases)
14. [Future Enhancements](#future-enhancements)

---

## Overview

### Purpose
Production Plan Generation 系统用于生成精确的日度/周度/月度生产计划，基于：
- **Capacity constraints** (产能约束)
- **Material availability** (物料可用性 - CTB)
- **Demand forecast** (需求预测)
- **Ramp curves** (产能爬坡曲线)
- **Working calendar** (工作日历 - 含假期)

### Key Principles
1. **Line × Shift Granularity**: 最小计算单位是 Line × Shift (例如 WF-L1-Day, WF-L1-Night)
2. **Workday-Indexed Curves**: 所有 ramp curves 基于工作日索引，自动跳过周日和假期
3. **Cumulative Validation**: 严格遵守 `Cum Output ≤ Cum Input`
4. **Constraint Binding**: 明确识别每天的约束来源 (CTB vs Capacity)
5. **Actual vs Plan**: 历史数据是 Actual，未来数据是 Projection

---

## Field Definitions & Calculation Formulas

### 核心字段定义表

此章节定义了 Production Plan 中所有关键字段的含义、计算公式和相互关系。

---

### 1. Input Fields (输入字段)

#### 1.1 Base Configuration (基础配置)

| Field | 中文名 | Definition | Unit | Example | Notes |
|-------|--------|------------|------|---------|-------|
| `base_uph` | 基础 UPH | Units Per Hour at 100% efficiency | units/hour | 120 | 满产能状态下每小时产出 |
| `shift_hours` | 班次工时 | Working hours per shift | hours | 10 | 每班工作小时数（可被 override） |
| `shift_type` | 班次类型 | Day or Night shift | - | 'DAY' | DAY = 白班, NIGHT = 夜班 |
| `line_type` | 产线类型 | Auto or Manual line | - | 'AUTO' | 影响 ramp curve 长度 |
| `ramp_start_date` | 爬坡开始日期 | Date when this unit starts production | ISO date | '2026-10-05' | 此日期前 input/output = 0 |

#### 1.2 Ramp Curves (爬坡曲线)

| Field | 中文名 | Definition | Range | Example | Notes |
|-------|--------|------------|-------|---------|-------|
| `uph_ramp_curve.factors` | UPH 爬坡系数 | Daily efficiency multiplier for UPH | 0.0 - 1.0 | [0.50, 0.55, ..., 1.00] | 按**工作日**索引，Day 1 = 50% |
| `uph_ramp_curve.length_workdays` | UPH 爬坡天数 | Number of workdays to reach 100% | workdays | 30 | 自动线通常 30 天，手动线 20 天 |
| `yield_ramp_curve.factors` | 良率爬坡系数 | Daily yield multiplier | 0.0 - 1.0 | [0.70, 0.72, ..., 0.98] | 按**工作日**索引，Day 1 = 70% |
| `yield_ramp_curve.length_workdays` | 良率爬坡天数 | Number of workdays to reach target yield | workdays | 30 | 与 UPH curve 可以不同长度 |
| `target_yield` | 目标良率 | Final achievable yield after rework | 0.0 - 1.0 | 0.98 | 98% 最终良率（含返工） |

**重要说明**:
- **Workday-indexed**: Curves 跳过周日和假期
- **Curve 结束后**: 如果 workday_index > curve length，使用最后一个 factor (100%)
- **Target Yield**: 当前逻辑**未应用**，只使用 yield_ramp_curve（待确认）

#### 1.3 Material & Demand (物料与需求)

| Field | 中文名 | Definition | Unit | Example | Notes |
|-------|--------|------------|------|---------|-------|
| `ctb_qty` (daily) | 日 CTB 可用量 | Daily Clear-to-Build material availability | units | 3000 | 每日可投入的物料数量 |
| `cum_ctb` | 累计 CTB | Cumulative CTB up to this date | units | 15000 | `sum(ctb_qty)` from start to today |
| `demand_qty` (weekly) | 周需求 | Weekly demand forecast | units/week | 12000 | **不分配到每日**，周末对比 |
| `cum_forecast` | 累计需求 | Cumulative forecast up to this date | units | 50000 | `sum(demand_qty)` from start to today |

**重要说明**:
- **CTB 累计逻辑**: 累计可用 - 累计已用 = 剩余可用
- **Weekly Demand**: 仅在周末（Saturday）对比，不影响 daily input

---

### 2. Calculated Fields - Unit Level (计算字段 - 单元级别)

#### 2.1 Daily Capacity (日产能)

| Field | 中文名 | Formula | Unit | Example | Dependencies |
|-------|--------|---------|------|---------|--------------|
| `workday_index` | 工作日索引 | Count of working days from `ramp_start_date` | workdays | 5 | Skips Sundays & holidays |
| `uph_factor` | UPH 系数 | `uph_ramp_curve.factors[workday_index - 1]` | 0.0 - 1.0 | 0.70 | From curve array |
| `yield_factor` | 良率系数 | `yield_ramp_curve.factors[workday_index - 1]` | 0.0 - 1.0 | 0.78 | From curve array |
| `daily_capacity` | 日产能 | `base_uph × uph_factor × shift_hours × 1` | units/day | 840 | 理论最大日投入量 |

**计算示例**:
```javascript
// WF L1 Day - Workday 5
base_uph = 120
uph_factor = 0.70  // 5th working day
shift_hours = 10

daily_capacity = 120 × 0.70 × 10 × 1 = 840 units
```

**关键点**:
- `× 1` 是因为每个 Line × Shift 单独计算（num_shifts = 1）
- 如果有 shift_hours_override，使用 override 值
- workday_index = 0 时（未开始爬坡），capacity = 0

#### 2.2 Daily Input (日投入)

**Unconstrained Mode**:
```
daily_input = daily_capacity
```

**Constrained Mode**:
```
ctb_remaining = cum_ctb(today) - cum_input(yesterday)
daily_input = min(daily_capacity, ctb_remaining)
```

| Field | 中文名 | Formula | Unit | Example | Mode |
|-------|--------|---------|------|---------|------|
| `input_unconstrained` | 无约束投入 | = `daily_capacity` | units/day | 840 | Unconstrained |
| `ctb_remaining` | CTB 剩余 | `cum_ctb - cum_input(prev)` | units | 2400 | Constrained |
| `input_final` | 最终投入 | `min(daily_capacity, ctb_remaining)` | units/day | 840 | Constrained |

**计算示例**:
```javascript
// Oct 12 - Constrained mode
daily_capacity = 2400
cum_ctb(Oct 12) = 12000
cum_input(Oct 11) = 10800

ctb_remaining = 12000 - 10800 = 1200
input_final = min(2400, 1200) = 1200  // CTB-limited!
```

#### 2.3 Daily Output (日产出)

**Current Logic (Simplified 2-Day Release)**:

| Workday | Output Factor | Formula | Yield Applied |
|---------|---------------|---------|---------------|
| Day 1 | 0 | `0` | N/A |
| Day 2 | 0.5 | `input × 0.5 × yield_factor(day2)` | Yes |
| Day 3+ | 0.5 | `input × 0.5 × yield_factor(day3)` | Yes |

```javascript
// Pseudo-code
if (workday_index === 1) {
  output = 0  // No output on first day
} else if (workday_index === 2) {
  output = input × 0.5 × yield_factor  // 50% on day 2
} else {
  output = input × 0.5 × yield_factor  // Remaining 50% on day 3
}

// Apply constraints
output = min(output, daily_capacity)  // Cannot exceed capacity
// Also: cum_output ≤ cum_input (checked at aggregation level)
```

| Field | 中文名 | Formula | Unit | Example | Notes |
|-------|--------|---------|------|---------|-------|
| `output_factor` | 产出系数 | 0 (day1), 0.5 (day2), 0.5 (day3+) | - | 0.5 | Flow-time distribution |
| `base_output` | 基础产出 | `input × output_factor × yield_factor` | units/day | 420 | Before capacity check |
| `output_final` | 最终产出 | `min(base_output, daily_capacity)` | units/day | 420 | After capacity constraint |

**计算示例**:
```javascript
// WF L1 Day - Workday 2
input = 840
output_factor = 0.5  // Day 2
yield_factor = 0.72  // From curve

base_output = 840 × 0.5 × 0.72 = 302.4 ≈ 302 units
daily_capacity = 660  // Day 2 capacity (lower UPH)
output_final = min(302, 660) = 302 units ✅
```

**已知问题** (见 "Questions for User"):
- ⚠️ Target Yield (0.98) 未应用
- ⚠️ Capacity overflow 未处理（直接 cap，不推迟）
- ⚠️ 简化为 2-day release，实际可能是 3-day

---

### 3. Calculated Fields - Aggregated Level (汇总级别)

#### 3.1 Site Level (站点级别)

| Field | 中文名 | Formula | Unit | Example | Notes |
|-------|--------|---------|------|---------|-------|
| `site_input_unconstrained` | 站点无约束投入 | `sum(unit_input_unconstrained)` for all units in site | units/day | 1800 | 所有 Line × Shift 之和 |
| `site_output_unconstrained` | 站点无约束产出 | `sum(unit_output_unconstrained)` | units/day | 1260 | 所有 Line × Shift 之和 |
| `site_input_final` | 站点最终投入 | `sum(unit_input_final)` | units/day | 1200 | Constrained 模式下 |
| `site_output_final` | 站点最终产出 | `sum(unit_output_final)` | units/day | 840 | Constrained 模式下 |

**示例**:
```javascript
// WF Site on Oct 12
WF_L1_DAY:   input=600,  output=420
WF_L1_NIGHT: input=600,  output=420

Site WF: input=1200, output=840
```

#### 3.2 Program Level (产品级别)

| Field | 中文名 | Formula | Unit | Example | Notes |
|-------|--------|---------|------|---------|-------|
| `program_input_final` | 产品日投入 | `sum(site_input_final)` for all sites | units/day | 1680 | 所有站点之和 |
| `program_output_final` | 产品日产出 | `sum(site_output_final)` | units/day | 1176 | 所有站点之和 |
| `program_shipment_final` | 产品日发货 | Mapped from output +2WD | units/day | 980 | 见 Shipment Lag 章节 |

**示例**:
```javascript
// Program Product A on Oct 12
WF:   input=1200, output=840
VN02: input=480,  output=336

Program: input=1680, output=1176
```

#### 3.3 Cumulative Metrics (累计指标)

| Field | 中文名 | Formula | Unit | Example | Notes |
|-------|--------|---------|------|---------|-------|
| `cum_input` | 累计投入 | `sum(daily_input)` from start to today | units | 15840 | 从计划开始日累加 |
| `cum_output` | 累计产出 | `sum(daily_output)` from start to today | units | 11088 | **必须** ≤ cum_input |
| `cum_shipment` | 累计发货 | `sum(daily_shipment)` from start to today | units | 9800 | 包含 +2WD lag |
| `cum_ctb` | 累计 CTB | `sum(daily_ctb)` from start to today | units | 18000 | 物料累计可用 |
| `cum_forecast` | 累计需求 | `sum(weekly_demand)` from start to this week | units | 32000 | 按周累加 |

**关键约束**:
```javascript
// Hard constraint (MUST hold every day)
cum_output ≤ cum_input

// Soft constraint (may violate due to lag)
cum_shipment ≤ cum_output
```

---

### 4. Shipment Fields (发货字段)

| Field | 中文名 | Formula | Unit | Example | Notes |
|-------|--------|---------|------|---------|-------|
| `output_date` | 产出日期 | Date when output occurs | ISO date | '2026-10-10' | Friday |
| `shipment_date` | 发货日期 | `output_date + 2 working days` | ISO date | '2026-10-14' | Tuesday (+2WD) |
| `daily_shipment` | 日发货量 | Aggregated from outputs | units/day | 840 | 多个 output 可能同一天 ship |

**+2 Working Days 逻辑**:
```javascript
// Example 1: Normal week
Output: Mon Oct 5  →  Ship: Wed Oct 7  (+1=Tue, +2=Wed)

// Example 2: Cross weekend
Output: Fri Oct 9  →  Ship: Tue Oct 13  (+1=Sat, +2=Mon, skip Sun)

// Example 3: Cross holiday
Output: Wed Oct 7  →  Ship: Mon Oct 12  (Oct 8-10 holiday, +2WD after)
```

**重要**:
- **NOT including output day** - 从 output 日期的**下一天**开始算 +2WD
- 如果 shipment_date 超出计划范围，**不计入**结果

---

### 5. Weekly Metrics (周度指标)

| Field | 中文名 | Formula | Unit | Example | Notes |
|-------|--------|---------|------|---------|-------|
| `week_id` | 周 ID | ISO week format | - | '2026-W41' | YYYY-Www 格式 |
| `weekly_input` | 周投入 | `sum(daily_input)` Mon-Sat (exclude Sun) | units/week | 7200 | 只算 Mon-Sat |
| `weekly_output` | 周产出 | `sum(daily_output)` Mon-Sat | units/week | 5040 | 只算 Mon-Sat |
| `weekly_shipment` | 周发货 | `sum(daily_shipment)` Mon-Sat | units/week | 4200 | 只算 Mon-Sat |
| `weekly_demand` | 周需求 | From `weeklyDemand` input | units/week | 12000 | 用户提供 |
| `weekly_gap` | 周差距 | `weekly_shipment - weekly_demand` | units/week | -7800 | 负数=缺口 |
| `weekly_attainment` | 周达成率 | `(weekly_shipment / weekly_demand) × 100%` | % | 35% | 百分比 |

**重要**:
- **Sunday 不计入**: 周度汇总跳过 Sunday 的数据
- **Week-end 对比**: 在 Saturday 夜班结束时，对比 cum_shipment vs cum_forecast

---

### 6. Binding Constraint (约束归因)

| Field | 中文名 | Logic | Values | Example | Notes |
|-------|--------|-------|--------|---------|-------|
| `binding_constraint` | 主要约束 | Identify limiting factor | 'CTB', 'Capacity', 'None' | 'CTB' | 每日判定 |
| `constraint_detail` | 约束详情 | Additional info | String | 'CTB short 1,200 units' | 未来扩展 |

**判定逻辑**:
```javascript
function getDailyConstraint(day) {
  const ctb = day.ctb_available || day.capacity_unconstrained;
  const capacity = day.capacity_unconstrained;

  if (ctb < capacity) return 'CTB';      // Material is bottleneck
  if (capacity < ctb) return 'Capacity'; // Production is bottleneck
  return 'None';                          // No constraint
}
```

---

### 7. Field Relationships Diagram

```
INPUT LAYER (用户提供)
├─ base_uph, shift_hours, shift_type
├─ uph_ramp_curve, yield_ramp_curve
├─ ctb_qty (daily)
└─ demand_qty (weekly)

↓ CALCULATION LAYER 1 (Unit Level)

├─ workday_index = countWorkingDays(ramp_start_date, today)
├─ uph_factor = uph_ramp_curve.factors[workday_index - 1]
├─ yield_factor = yield_ramp_curve.factors[workday_index - 1]
├─ daily_capacity = base_uph × uph_factor × shift_hours
│
├─ [Unconstrained]
│   └─ input_unconstrained = daily_capacity
│
└─ [Constrained]
    ├─ cum_ctb = sum(ctb_qty) from start to today
    ├─ ctb_remaining = cum_ctb - cum_input(yesterday)
    └─ input_final = min(daily_capacity, ctb_remaining)

↓ CALCULATION LAYER 2 (Output)

├─ output_factor = {0 (day1), 0.5 (day2), 0.5 (day3+)}
├─ base_output = input × output_factor × yield_factor
└─ output_final = min(base_output, daily_capacity)

↓ CALCULATION LAYER 3 (Aggregation)

├─ site_input = sum(unit_input) for all units in site
├─ site_output = sum(unit_output)
├─ program_input = sum(site_input) for all sites
└─ program_output = sum(site_output)

↓ CALCULATION LAYER 4 (Shipment)

├─ shipment_date = addWorkingDays(output_date, 2)
└─ daily_shipment[shipment_date] += output_qty

↓ CALCULATION LAYER 5 (Cumulative)

├─ cum_input = sum(daily_input) from start to today
├─ cum_output = sum(daily_output)
├─ cum_shipment = sum(daily_shipment)
└─ cum_ctb = sum(daily_ctb)

↓ CALCULATION LAYER 6 (Weekly)

├─ weekly_input = sum(daily_input) Mon-Sat
├─ weekly_output = sum(daily_output) Mon-Sat
├─ weekly_shipment = sum(daily_shipment) Mon-Sat
├─ weekly_gap = weekly_shipment - weekly_demand
└─ weekly_attainment = (weekly_shipment / weekly_demand) × 100%

OUTPUT LAYER (报表展示)
├─ Daily table: date, input, output, shipment, cum_*
├─ Weekly table: week_id, input, output, shipment, demand, gap, attainment
└─ Site breakdown: per-site daily details
```

---

### 8. Example Walkthrough (完整示例)

**Scenario**: WF L1 Day Shift, Workday 5, Constrained mode

**Input Data**:
- `base_uph = 120`
- `shift_hours = 10`
- `uph_ramp_curve.factors[4] = 0.70` (5th element, 0-indexed)
- `yield_ramp_curve.factors[4] = 0.78`
- `ctb_qty (Oct 12) = 1500`
- `cum_ctb (Oct 12) = 12000`
- `cum_input (Oct 11) = 10800`

**Step 1: Calculate Daily Capacity**
```javascript
workday_index = 5
uph_factor = 0.70
daily_capacity = 120 × 0.70 × 10 = 840 units
```

**Step 2: Calculate Daily Input (Constrained)**
```javascript
ctb_remaining = 12000 - 10800 = 1200
input_final = min(840, 1200) = 840 units
// Capacity is the bottleneck on this day
```

**Step 3: Calculate Daily Output (Workday 5 = Day 3+)**
```javascript
output_factor = 0.5  // Day 3+ logic
yield_factor = 0.78
base_output = 840 × 0.5 × 0.78 = 327.6 ≈ 328 units
output_final = min(328, 840) = 328 units
```

**Step 4: Calculate Shipment Date**
```javascript
output_date = '2026-10-12' (Monday)
+1 WD = '2026-10-13' (Tuesday)
+2 WD = '2026-10-14' (Wednesday)
shipment_date = '2026-10-14'
```

**Step 5: Update Cumulative**
```javascript
cum_input (Oct 12) = 10800 + 840 = 11640
cum_output (Oct 12) = 8190 + 328 = 8518
cum_shipment (Oct 14) = 7200 + 328 = 7528
```

**Step 6: Binding Constraint**
```javascript
ctb = 1200 (remaining)
capacity = 840
binding_constraint = 'Capacity'  // Capacity < CTB
```

**Result for Oct 12 (WF L1 Day)**:
- Input: 840 units
- Output: 328 units
- Shipment: 0 units (ships on Oct 14)
- Cum Input: 11,640
- Cum Output: 8,518
- Binding: Capacity-limited

---

### 9. Missing/Unclear Relationships (待确认)

#### 9.1 Target Yield vs Yield Ramp Curve
**Current**: Only `yield_ramp_curve` is used, `target_yield = 0.98` is defined but **not applied**

**Questions**:
- Is `target_yield` the final value of `yield_ramp_curve`?
- Or should we apply: `Cum Output = Cum Input × Target Yield` (separately)?
- Or is it: `Daily Output = Input × Yield_Curve × Target_Yield`?

#### 9.2 Output Flow-Time Distribution
**Current**: Simplified 2-day (Day 1: 0%, Day 2: 50%, Day 3+: 50%)

**Questions**:
- Is this accurate to real manufacturing process?
- Should it be 3-day? (Day 1: 0%, Day 2: 30%, Day 3: 70%)?
- Or more complex distribution?

#### 9.3 Capacity Overflow Handling
**Current**: If `base_output > daily_capacity`, cap to capacity, "lose" the overflow

**Questions**:
- Should overflow be deferred to next working day?
- Or tracked as WIP and released when capacity available?
- Or simply capped (current logic)?

---

## Data Requirements

### 1. Required Data (All Modes)

#### A. Program Configuration (`programConfig`)
```javascript
{
  program_id: 'product_a',                    // Program identifier
  program_name: 'Product A',                  // Display name
  default_shift_hours: { DAY: 10, NIGHT: 10 }, // Default hours per shift
  output_factors: {                           // Flow-time output distribution
    day1: 0.5,      // Day 1: 50% of input yields output
    day2: 1.0,      // Day 2: remaining 50% yields output
    day3_plus: 1.0  // Day 3+: full output (currently unused in simplified logic)
  },
  shipment_lag_workdays: 2,                   // +2 working days from output to shipment
  weekly_window: 'MON_SAT',                   // Week definition (Sunday excluded)
  target_yield: 0.98                          // Final achievable yield after rework (98%)
}
```

**Validation**:
- ✅ `program_id` must be non-empty string
- ✅ `default_shift_hours.DAY` and `.NIGHT` must be > 0
- ✅ `output_factors.day1 + day2` should approximate 1.0
- ✅ `shipment_lag_workdays` must be ≥ 0
- ✅ `target_yield` must be between 0 and 1

#### B. Sites (`sites`)
```javascript
[
  { site_id: 'WF', site_name: 'WF Factory', country: 'CN' },
  { site_id: 'VN02', site_name: 'VN-02 Factory', country: 'VN' }
]
```

**Validation**:
- ✅ At least 1 site required
- ✅ `site_id` must be unique
- ✅ `country` required for holiday mapping

#### C. Capacity Units (`capacityUnits`)
```javascript
[
  {
    unit_id: 'WF_L1_DAY',                     // Unique identifier
    program_id: 'product_a',                  // Links to program
    site_id: 'WF',                            // Links to site
    line_id: 'L1',                            // Production line
    line_type: 'AUTO',                        // AUTO or MANUAL
    shift_type: 'DAY',                        // DAY or NIGHT
    base_uph: 120,                            // Units Per Hour at 100% efficiency
    shift_hours: 10,                          // Hours per shift (can be overridden)
    ramp_start_date: '2026-10-05',           // When this unit starts production

    uph_ramp_curve: {
      length_workdays: 30,                    // Curve spans 30 working days
      factors: [0.50, 0.55, 0.60, ..., 1.00] // 30 factors, day 1 starts at 50%
    },

    yield_ramp_curve: {
      length_workdays: 30,
      factors: [0.70, 0.72, 0.74, ..., 0.98] // 30 factors, day 1 starts at 70%
    }
  }
]
```

**Validation**:
- ✅ At least 1 capacity unit required
- ✅ `unit_id` must be unique
- ✅ `base_uph` must be > 0
- ✅ `shift_hours` must be > 0
- ✅ `ramp_start_date` must be valid ISO date
- ✅ `uph_ramp_curve.factors.length` must equal `length_workdays`
- ✅ `yield_ramp_curve.factors.length` must equal `length_workdays`
- ✅ All factors must be between 0 and 1

#### D. Weekly Demand (`weeklyDemand`)
```javascript
[
  { week_id: '2026-W40', program_id: 'product_a', demand_qty: 5000 },
  { week_id: '2026-W41', program_id: 'product_a', demand_qty: 12000 },
  { week_id: '2026-W42', program_id: 'product_a', demand_qty: 15000 }
]
```

**Validation**:
- ✅ **REQUIRED for all modes** (Unconstrained, Constrained, Combined)
- ✅ `week_id` format: `YYYY-Www` (ISO week)
- ✅ `demand_qty` must be ≥ 0

**Note**: Weekly demand is NOT distributed to daily. It's only compared at week-end (Saturday night cumulative shipment).

### 2. Conditional Data

#### E. CTB Daily (`ctbDaily`) - **Required for Constrained/Combined modes**
```javascript
[
  { date: '2026-10-05', program_id: 'product_a', site_id: 'WF', ctb_qty: 3000 },
  { date: '2026-10-06', program_id: 'product_a', site_id: 'WF', ctb_qty: 3000 },
  { date: '2026-10-12', program_id: 'product_a', site_id: 'WF', ctb_qty: 1500 } // Tight constraint
]
```

**Validation**:
- ✅ **REQUIRED** if mode is `constrained` or `combined`
- ✅ Optional if mode is `unconstrained`
- ✅ `date` must be valid ISO date
- ✅ `ctb_qty` must be ≥ 0
- ⚠️ Missing date = unlimited CTB for that day (treated as Infinity)

#### F. Country Holidays (`countryHolidays`) - Optional
```javascript
{
  'CN': [
    {
      name: '国庆节 (National Day)',
      start: '2026-10-01',
      end: '2026-10-07',
      notes: '7-day statutory holiday period'
    }
  ],
  'VN': [
    {
      name: 'National Day (VN)',
      start: '2026-09-02',
      end: '2026-09-02'
    }
  ]
}
```

**Validation**:
- ✅ Optional (defaults to empty)
- ✅ `start` and `end` must be valid ISO dates
- ✅ `end` must be ≥ `start`

#### G. Site Overrides (`siteOverrides`) - Optional
```javascript
[
  {
    site_id: 'WF',
    overrides: [
      {
        date: '2026-10-03',
        is_working_day: true,                 // Override holiday to work day
        shift_hours_override: { DAY: 12, NIGHT: 10 } // Extended hours
      },
      {
        date: '2026-10-08',
        is_working_day: true                  // Work on Saturday (compensation day)
      }
    ]
  }
]
```

**Validation**:
- ✅ Optional (defaults to empty)
- ✅ `is_working_day` can override both holidays and weekends
- ✅ `shift_hours_override` can override default shift hours

---

## Generation Modes

### Mode 1: Unconstrained (Capacity Only)

**Purpose**: 显示纯产能情况，不考虑物料约束

**Input Requirements**:
- ✅ Program Config
- ✅ Sites
- ✅ Capacity Units
- ✅ Weekly Demand
- ⚠️ CTB data is **ignored** (treated as unlimited)

**Calculation**:
```
Daily Input = Daily Capacity (no CTB limit)
Daily Capacity = UPH × UPH_Curve(%) × Lines × Shifts × Hours
```

**Use Case**:
- "If we have unlimited materials, what's our maximum output?"
- Capacity planning and bottleneck identification

### Mode 2: Constrained (CTB Applied)

**Purpose**: 显示考虑物料约束后的实际可行计划

**Input Requirements**:
- ✅ Program Config
- ✅ Sites
- ✅ Capacity Units
- ✅ Weekly Demand
- ✅ **CTB Daily data** (REQUIRED)

**Calculation**:
```
Daily Input = min(Daily Capacity, CTB Remaining)
CTB Remaining = Cum CTB (up to today) - Cum Input (up to yesterday)
```

**Use Case**:
- "Given current material availability, what can we actually build?"
- Realistic production planning

### Mode 3: Combined (Both Scenarios)

**Purpose**: 并排对比 Unconstrained vs Constrained，快速识别约束来源

**Input Requirements**:
- ✅ All data from Mode 1 AND Mode 2

**Output Structure**:
```javascript
{
  mode: 'combined',
  unconstrained: { /* full plan */ },
  constrained: { /* full plan */ }
}
```

**Use Case**:
- "Is our constraint from capacity or materials?"
- Gap analysis between potential vs reality

---

## Core Calculation Logic

### 6-Step Pipeline

```
Step 1: Calculate Unconstrained Production (Unit Level)
  └─> For each Line × Shift × Date:
      • Check if working day
      • Calculate workday index from ramp start
      • Apply UPH ramp curve
      • Apply Yield ramp curve
      • Calculate Input and Output

Step 2: Aggregate to Site Level
  └─> Sum all units within same site and date

Step 3: Apply CTB Constraints (if Constrained mode)
  └─> For each site × date:
      • Calculate cumulative CTB
      • Cap Input to CTB remaining
      • Scale Output proportionally

Step 4: Calculate Shipments (+2 Working Days Lag)
  └─> For each Output:
      • Find shipment date (+2WD from output date)
      • Map output quantity to that date

Step 5: Aggregate to Program Level
  └─> Sum across all sites for each date
      • Add cumulative metrics

Step 6: Calculate Weekly Metrics
  └─> Aggregate Mon-Sat (exclude Sunday)
      • Compare with weekly demand
      • Calculate gap and attainment %
```

---

## Calendar System

### Working Day Rules (Priority Order)

```
Priority 1: Site Override
  └─> If site has override for this date:
      • Use override.is_working_day (can override holidays/weekends)
      • Use override.shift_hours_override (if provided)

Priority 2: Country Holiday
  └─> If date falls in country holiday range:
      • Non-working day (unless overridden)

Priority 3: Default Pattern
  └─> Monday - Saturday: Working
      Sunday: Non-working
```

### Example: China National Day 2026

```
Original:
Oct 1-7 (Thu-Wed): Statutory holiday (non-working)

With Override:
Oct 3 (Sat): Override to working day + extended hours (DAY: 12h, NIGHT: 10h)
Oct 8 (Thu): Override to working day (compensation day)
```

### Workday Index Calculation

**Definition**: 从 ramp_start_date 开始的工作日计数（1-indexed）

**Example**:
```
Ramp Start: Oct 5 (Mon)
Oct 5: Workday 1
Oct 6: Workday 2
Oct 7: Holiday (skipped)
Oct 8: Workday 3
Oct 9: Workday 4
Oct 10: Workday 5
Oct 11: Sunday (skipped)
Oct 12: Workday 6
```

**Usage**:
- UPH Curve Factor = `uph_ramp_curve.factors[workday_index - 1]`
- Yield Curve Factor = `yield_ramp_curve.factors[workday_index - 1]`

**After Curve Completion**:
- If workday_index > curve length: use last factor (100% efficiency)

---

## Capacity Calculation

### Formula

```javascript
Daily Capacity = base_uph × uph_factor × shift_hours × num_shifts
```

**Where**:
- `base_uph`: Units Per Hour at 100% efficiency
- `uph_factor`: Ramp curve factor for this workday (0.5 to 1.0)
- `shift_hours`: Hours per shift (default or override)
- `num_shifts`: Always 1 (each Line × Shift is tracked separately)

### Example

```javascript
// WF L1 Day Shift - Workday 1
base_uph = 120
uph_factor = 0.50  // First day of ramp
shift_hours = 10

Daily Capacity = 120 × 0.50 × 10 × 1 = 600 units

// WF L1 Day Shift - Workday 10
base_uph = 120
uph_factor = 0.80  // 10th working day
shift_hours = 10

Daily Capacity = 120 × 0.80 × 10 × 1 = 960 units
```

### Multi-Shift Aggregation

```javascript
// WF has L1-Day and L1-Night
WF L1 Day:  600 units
WF L1 Night: 540 units (if started)
─────────────────────
Site Total: 1,140 units
```

---

## Output Calculation

### Current Logic (Simplified 2-Day Release)

**Version**: 1.0 (Subject to refinement)

**Rules**:
1. **Day 1**: No output (input day)
2. **Day 2**: 50% of input releases as output
3. **Day 3+**: Remaining 50% releases as output
4. **All days**: Apply Yield Curve factor
5. **All days**: Respect `Daily Output ≤ Daily Capacity`
6. **All days**: Respect `Cum Output ≤ Cum Input`

### Pseudo-Code

```javascript
function calculateDailyOutput(unit, date, workdayIndex, input) {
  if (workdayIndex === 0) {
    return 0; // Not started yet
  }

  // Get yield factor for this workday
  const yieldFactor = unit.yield_ramp_curve.factors[workdayIndex - 1];

  // Determine output factor based on workday
  let outputFactor;
  if (workdayIndex === 1) {
    outputFactor = 0;  // No output on first day
  } else if (workdayIndex === 2) {
    outputFactor = 0.5; // 50% on second day
  } else {
    outputFactor = 0.5; // Remaining 50% on third day (simplified)
  }

  // Base output calculation
  let output = input × outputFactor × yieldFactor;

  // Constraint 1: Daily output cannot exceed daily capacity
  const dailyCapacity = calculateDailyCapacity(unit, date, workdayIndex);
  output = Math.min(output, dailyCapacity);

  // Constraint 2: Cumulative output cannot exceed cumulative input
  // (This is checked at a higher level during aggregation)

  return output;
}
```

### Example

```javascript
// WF L1 Day - Workday 2
Input (Day 2) = 960 units
Yield Factor (Day 2) = 0.72
Output Factor (Day 2) = 0.5

Base Output = 960 × 0.5 × 0.72 = 345.6 ≈ 346 units

// Check capacity constraint
Daily Capacity (Day 2) = 120 × 0.55 × 10 = 660 units
Final Output = min(346, 660) = 346 units ✅
```

### Known Issues & Future Refinements

**Issue 1**: 当前逻辑没有处理 "overflow" 情况
- 例如：Day 2 理论产出 500，但 capacity 只有 400
- 当前：直接 cap 到 400，丢失 100 units
- 未来：可能需要 WIP tracking，将未产出的量推迟到后续日期

**Issue 2**: Target Yield vs Yield Curve 的关系不清晰
- `target_yield = 0.98` 表示最终良率目标
- `yield_ramp_curve` 表示每日良率爬坡
- 当前逻辑：只使用 yield curve，没有应用 target yield
- 未来：需要明确两者关系（是否 cumulative？是否独立？）

**Issue 3**: 简化的 2-day release 可能不符合实际流程
- 真实情况可能是 3-day 或更复杂的分布
- 需要用户确认实际的 flow-time 逻辑

**待用户确认**:
- [ ] Output 是否需要 WIP tracking？
- [ ] Target Yield 如何与 Yield Curve 结合？
- [ ] 实际的 flow-time 是 2-day 还是 3-day？
- [ ] 如果某天产能不足，未产出的量如何处理？

---

## CTB Constraints

### Cumulative CTB Logic

**Key Principle**: CTB 是累计可用量，不是每日消耗量

```javascript
// Build cumulative CTB map
const cumCtbMap = {};
let cumCtb = 0;

for (const date of dates) {
  const dailyCTB = ctbMap[date] || 0; // 0 if missing = unlimited for that day
  cumCtb += dailyCTB;
  cumCtbMap[date] = cumCtb;
}
```

### Daily Input Capping

```javascript
// For each day
const cumCtbToday = cumCtbMap[date] || 0;
const ctbRemaining = Math.max(0, cumCtbToday - cumInputYesterday);

const inputFinal = Math.min(inputUnconstrained, ctbRemaining);
```

### Example

```
Date       | Daily CTB | Cum CTB | Cum Input (prev) | CTB Remaining | Input Unconstrained | Input Final
-----------|-----------|---------|------------------|---------------|---------------------|-------------
2026-10-05 |     3,000 |   3,000 |                0 |         3,000 |               1,200 |       1,200
2026-10-06 |     3,000 |   6,000 |            1,200 |         4,800 |               1,200 |       1,200
2026-10-12 |     1,500 |  12,000 |           10,800 |         1,200 |               2,400 |       1,200 ⚠️
```

**Week 2 (Oct 12-18)**: CTB daily limit = 1,500
- Capacity could produce 2,400/day
- But CTB only allows 1,500/day
- **Binding Constraint**: CTB

### Missing CTB Data Handling

```javascript
const dailyCTB = ctbMap[date] || Infinity; // Treat missing as unlimited
```

**Rationale**: 如果某天没有 CTB 数据，假设物料无限，只受产能约束

---

## Shipment Lag

### Rule: +2 Working Days (NOT including output day)

**Example 1**: Normal week
```
Output Date:    Monday (Oct 5)
+1 WD:          Tuesday (Oct 6)
+2 WD:          Wednesday (Oct 7) ← Shipment Date
```

**Example 2**: Crosses weekend
```
Output Date:    Friday (Oct 9)
+1 WD:          Saturday (Oct 10)
+2 WD:          Monday (Oct 12) ← Sunday skipped
```

**Example 3**: Crosses holiday
```
Output Date:    Wednesday (Oct 7) - last day before holiday
+1 WD:          Thursday (Oct 8) - holiday starts
+2 WD:          Monday (Oct 12) - first day after holiday
```

### Implementation

```javascript
function addWorkingDays(siteId, country, startDate, numDays) {
  let current = startDate;
  let remaining = numDays;

  while (remaining > 0) {
    current = addOneDayToDate(current);
    if (isWorkingDay(siteId, country, current)) {
      remaining--;
    }
  }

  return current;
}

// Usage
const shipmentDate = addWorkingDays(siteId, country, outputDate, 2);
```

### Shipment Aggregation

```javascript
const shipmentMap = {};

for (const dayData of siteData) {
  const outputQty = dayData.output_final;
  if (outputQty > 0) {
    const shipDate = addWorkingDays(siteId, country, dayData.date, 2);
    shipmentMap[shipDate] = (shipmentMap[shipDate] || 0) + outputQty;
  }
}
```

**Note**: 如果 shipment date 超出计划范围 (endDate)，则不计入

---

## Aggregation Logic

### Unit → Site → Program

```javascript
// Unit Level (Line × Shift)
WF_L1_DAY:   Input=600,  Output=420
WF_L1_NIGHT: Input=540,  Output=378
VN02_L1_DAY: Input=480,  Output=360

// Site Level (Sum all units)
WF:   Input=1,140, Output=798
VN02: Input=480,   Output=360

// Program Level (Sum all sites)
Product A: Input=1,620, Output=1,158
```

### Daily → Weekly (Mon-Sat Only)

**Important**: Sunday 数据 **不计入** weekly aggregation

```javascript
// Week ID calculation
const weekId = getISOWeekId(date); // e.g., "2026-W41"

// Aggregate by week (skip Sunday)
for (const dayData of programResults) {
  if (!isSunday(dayData.date)) {
    weekMap[weekId].input += dayData.input_final;
    weekMap[weekId].output += dayData.output_final;
    weekMap[weekId].shipments += dayData.shipment_final;
  }
}
```

### Weekly Demand Comparison

**Key Point**: 不是每日对比，而是周末（Saturday night）累计对比

```javascript
// Get cumulative shipment at end of week (Saturday)
const weekEndDate = getLastSaturdayOfWeek(weekId);
const cumShipmentAtWeekEnd = getCumulativeShipment(weekEndDate);

// Compare with weekly demand
const weeklyDemand = demandMap[weekId];
const gap = cumShipmentAtWeekEnd - weeklyDemand;
const attainment = weeklyDemand > 0 ? (cumShipmentAtWeekEnd / weeklyDemand) : 1.0;
```

### Monthly Aggregation (5-4-4 Pattern)

**Status**: Not implemented yet

**Fiscal Calendar**:
```
Q1: Month 1 (5 weeks) + Month 2 (4 weeks) + Month 3 (4 weeks) = 13 weeks
Q2: Month 4 (5 weeks) + Month 5 (4 weeks) + Month 6 (4 weeks) = 13 weeks
Q3: Month 7 (5 weeks) + Month 8 (4 weeks) + Month 9 (4 weeks) = 13 weeks
Q4: Month 10 (5 weeks) + Month 11 (4 weeks) + Month 12 (4 weeks) = 13 weeks
```

**Future Implementation**:
```javascript
function aggregateByMonth(weeklyData, fiscalYear) {
  const monthMap = {};

  for (const week of weeklyData) {
    const monthId = getFiscalMonth(week.week_id, fiscalYear);
    if (!monthMap[monthId]) {
      monthMap[monthId] = { input: 0, output: 0, shipments: 0, demand: 0 };
    }
    monthMap[monthId].input += week.input;
    monthMap[monthId].output += week.output;
    monthMap[monthId].shipments += week.shipments;
    monthMap[monthId].demand += week.demand;
  }

  return Object.values(monthMap);
}
```

---

## Validation Rules

### Pre-Generation Validation

**Mode-Specific Checks**:

| Mode          | Forecast | CTB   | Capacity | Sites |
|---------------|----------|-------|----------|-------|
| Unconstrained | ✅ Required | ⚠️ Optional | ✅ Required | ✅ Required |
| Constrained   | ✅ Required | ✅ **Required** | ✅ Required | ✅ Required |
| Combined      | ✅ Required | ✅ **Required** | ✅ Required | ✅ Required |

**Error Messages**:
- "❌ Forecast data is missing - Please upload weekly demand forecast"
- "❌ CTB data is missing - Constrained mode requires daily CTB material availability"
- "❌ Capacity configuration is missing - Please configure at least one production line"
- "❌ Sites configuration is missing - Please add at least one production site"

### Post-Generation Validation

**Cumulative Constraints**:
```javascript
// Check 1: Cumulative Output ≤ Cumulative Input
for (const day of programResults) {
  if (day.cum_output > day.cum_input) {
    console.error(`VIOLATION: Cum Output (${day.cum_output}) > Cum Input (${day.cum_input}) on ${day.date}`);
  }
}

// Check 2: Daily Output ≤ Daily Capacity (unconstrained)
for (const day of siteResults) {
  if (day.output_final > day.input_unconstrained) {
    console.error(`VIOLATION: Output (${day.output_final}) > Capacity (${day.input_unconstrained}) on ${day.date}`);
  }
}
```

---

## Edge Cases

### Case 1: Ramp Start in Middle of Holiday

**Scenario**: Ramp start date = Oct 3 (during Oct 1-7 holiday), but Oct 3 has override to work

**Behavior**:
- Oct 3 is considered Workday 1 (due to override)
- Oct 4-7 are holidays (skipped)
- Oct 8 is Workday 2

### Case 2: CTB Data Missing for Some Days

**Scenario**: CTB data only for Oct 5, 6, 12, but plan runs Oct 1-31

**Behavior**:
- Oct 5, 6, 12: Use provided CTB values
- All other days: Treat as unlimited CTB (constrained only by capacity)

### Case 3: Shipment Date Beyond Plan End Date

**Scenario**: Plan ends Oct 31, but Oct 30 output ships on Nov 3

**Behavior**:
- Shipment on Nov 3 is **not counted** in plan results
- Weekly/monthly metrics will not include this shipment
- User should extend plan end date to capture all shipments

### Case 4: Zero Demand Week

**Scenario**: Week 2026-W45 has demand_qty = 0

**Behavior**:
- Gap = Actual Shipment - 0 = Actual Shipment (always positive)
- Attainment = Infinity (or capped at 100%)

### Case 5: Capacity Unit Starts After Plan End

**Scenario**: Plan is Oct 1-31, but VN02_L1_NIGHT starts Nov 1

**Behavior**:
- VN02_L1_NIGHT contributes 0 input/output for all days in Oct
- Only active units contribute to the plan

---

## Future Enhancements

### Priority 1 (Critical)

1. **WIP (Work In Progress) Tracking**
   - Track cumulative input - cumulative output
   - Handle capacity overflow by deferring to next day
   - Ensure no "lost" units

2. **Target Yield Integration**
   - Clarify relationship with Yield Curve
   - Apply target yield to final cumulative output
   - Handle rework/scrap scenarios

3. **Constraint Attribution Log**
   - Detailed log: "Oct 12: CTB short by 1,200 units on Component-A"
   - Binding constraint identification per day
   - Enable root cause analysis

### Priority 2 (Important)

4. **Monthly Aggregation (5-4-4 Calendar)**
   - Implement fiscal month mapping
   - Support Q1-Q4 structure

5. **Actual Data Integration**
   - Upload mechanism for actual input/output/shipment
   - Merge actual (past) + plan (future) in same report
   - Data cut-off time tracking

6. **Site Drill-Down in Reports**
   - Expandable site-level tables
   - Unit-level details (optional)

### Priority 3 (Nice-to-Have)

7. **Multiple Scenarios**
   - Compare different ramp curves side-by-side
   - What-if analysis: "What if we add another shift?"

8. **Automatic Constraint Resolution Suggestions**
   - "Add 2 more shifts to WF-L1 to close gap"
   - "Expedite CTB for Component-A by 3 days"

9. **Excel Export with Formulas**
   - Editable Excel with live calculations
   - Support what-if analysis in Excel

---

## Change Log

### Version 1.0 (2026-01-24)
- Initial document creation
- Documented 6-step pipeline
- Defined data requirements and validation rules
- Captured current output logic (2-day simplified)
- Listed known issues and future enhancements

### Version 1.1 (TBD)
- [ ] Refine output calculation logic based on user feedback
- [ ] Clarify target yield application
- [ ] Add WIP tracking specification
- [ ] Define monthly aggregation logic

---

## Questions for User

### Urgent (Blocking Current Logic)

1. **Output Flow-Time**: 实际是 2-day release 还是 3-day？是否需要更复杂的分布？

2. **Target Yield Application**: `target_yield = 0.98` 应该如何应用？
   - Option A: 每日 yield curve 已经包含了，target yield 不额外应用
   - Option B: Cum Output = Cum Input × Target Yield (独立于 yield curve)
   - Option C: 其他逻辑

3. **Capacity Overflow Handling**: 如果某天理论产出 > 当日产能，未产出的量：
   - Option A: 直接丢弃（当前逻辑）
   - Option B: 推迟到下一个工作日
   - Option C: 均摊到接下来的 N 天

### Medium Priority

4. **Actual Data Source**: 实际数据（Actual Input/Output/Shipment）会从哪里获取？
   - Manual upload (Excel/CSV)?
   - API integration with MES/ERP?
   - 频率：每日/每周/实时？

5. **Constraint Log Detail Level**: 需要多详细的约束归因？
   - Level 1: "Day X: CTB-limited"
   - Level 2: "Day X: CTB short 1,200 units"
   - Level 3: "Day X: CTB short 1,200 units on Component-A, supplier delay 3 days"

---

## Appendix

### Glossary

- **CTB**: Clear-to-Build，物料可用性，表示有多少物料可以投入生产
- **UPH**: Units Per Hour，单位时间产出（小时）
- **Ramp Curve**: 爬坡曲线，表示产能/良率随时间的提升
- **Workday Index**: 从 ramp start 开始的工作日计数（跳过周日和假期）
- **Binding Constraint**: 当天的主要约束来源（CTB 或 Capacity）
- **WIP**: Work In Progress，在制品，表示已投入但未产出的量
- **Gap**: Actual Shipment - Forecast Demand
- **Attainment**: (Actual Shipment / Forecast Demand) × 100%

### References

- [PRODUCTION_PLAN_SYSTEM_SUMMARY.md](PRODUCTION_PLAN_SYSTEM_SUMMARY.md)
- [OUTPUT_LOGIC_AGREED.md](OUTPUT_LOGIC_AGREED.md)
- [PRODUCTION_PLAN_REFACTOR_SPEC.md](PRODUCTION_PLAN_REFACTOR_SPEC.md)
- [production_plan_engine.js](production_plan_engine.js)
- [production_plan_seed_data.js](production_plan_seed_data.js)
