# Production Plan - 各因素如何被考虑进计算

**生成日期**: 2026-01-27
**文档目的**: 详细说明Generate Production Plan报告时，各个因素是如何被纳入计算的

---

## ✅ 已被考虑的因素总结

| 因素 | 是否考虑 | 在哪个步骤 | 代码位置 |
|------|---------|----------|---------|
| **UPH (Units Per Hour)** | ✅ 是 | Step 1 - 日产能计算 | line 293 |
| **UPH Ramp Curve** | ✅ 是 | Step 1 - 根据工作日索引获取系数 | line 281 |
| **Yield** | ✅ 是 | Step 1 - 日产出计算 | line 296 |
| **Yield Ramp Curve** | ✅ 是 | Step 1 - 根据工作日索引获取系数 | line 282 |
| **假期 (Holidays)** | ✅ 是 | Step 1 - 判定工作日 | line 237 |
| **线体 (Line)** | ✅ 是 | 所有步骤 - Line × Shift 粒度 | line 228 |
| **班次 (Shift)** | ✅ 是 | 所有步骤 - Day/Night | line 228 |
| **工作时长 (Shift Hours)** | ✅ 是 | Step 1 - 产能计算 | line 285-290 |
| **工作时长覆盖 (Override)** | ✅ 是 | Step 1 - 特定日期可覆盖 | line 285-290 |
| **CTB** | ✅ 是 | Step 3 - 应用CTB约束 | line 371-429 |
| **Weekly Forecast/Demand** | ✅ 是 | Step 6 - 计算周度指标 | line 212 |
| **Shipment Lag (+2WD)** | ✅ 是 | Step 4 - 计算出货日期 | line 206 |
| **Output Factors (Day1/Day2/Day3+)** | ✅ 是 | Step 1 - 产出释放 | line 299-306 |

---

## 📊 计算流程详解

### **总体流程（6个步骤）**

```javascript
// production_plan_engine.js - line 190-222
generatePlan(startDate, endDate, mode = 'unconstrained') {
  // Step 1: 计算无约束产能 (Unit Level)
  const unitResults = this.calculateUnconstrainedProduction(dates);

  // Step 2: 汇总到站点级别 (Site Level)
  const siteResults = this.aggregateToSite(unitResults, dates);

  // Step 3: 应用CTB约束 (如果是constrained模式)
  let siteFinal = siteResults;
  if (mode === 'constrained') {
    siteFinal = this.applyCtbConstraints(siteResults, dates);
  }

  // Step 4: 计算出货时间 (+2 工作日)
  const siteShipments = this.calculateShipments(siteFinal, dates);

  // Step 5: 汇总到产品级别 (Program Level)
  const programResults = this.aggregateToProgram(siteFinal, siteShipments, dates);

  // Step 6: 计算周度指标
  const weeklyMetrics = this.calculateWeeklyMetrics(programResults, dates);

  return { unitResults, siteResults: siteFinal, siteShipments, programResults, weeklyMetrics, mode };
}
```

---

## 🔍 Step 1: 无约束产能计算 (Unit Level)

**代码位置**: `calculateUnconstrainedProduction()` - line 225-331

### **1.1 判定工作日（考虑假期）**

```javascript
// line 237
const isWorking = this.calendar.isWorkingDay(unit.site_id, site.country, date);

if (!isWorking) {
  // 非工作日：input = 0, output = 0
  results.push({ ... input: 0, output: 0 });
  continue;
}
```

**如何实现**:
- `CalendarSystem` 类检查三层逻辑：
  1. **Site Overrides** - 站点特定覆盖（优先级最高）
  2. **Country Holidays** - 国家法定节假日
  3. **Sunday** - 周日默认不工作

**数据来源**:
- `PRODUCTION_PLAN_SEED_DATA.countryHolidays.CN` - 中国7个法定节假日
- `PRODUCTION_PLAN_SEED_DATA.countryHolidays.VN` - 越南6个法定节假日
- `PRODUCTION_PLAN_SEED_DATA.siteOverrides` - 站点级别覆盖（如国庆加班）

---

### **1.2 计算工作日索引（Workday Index）**

```javascript
// line 255-261
const workdayIdx = this.calendar.getWorkdayIndex(
  unit.site_id,
  site.country,
  unit.ramp_start_date,  // 爬坡开始日期
  date,                  // 当前日期
  Math.max(uphCurveLength, yieldCurveLength)
);

if (workdayIdx === 0) {
  // 还未开始爬坡：input = 0, output = 0
  results.push({ ... input: 0, output: 0 });
  continue;
}
```

**如何实现**:
- 从 `ramp_start_date` 开始计数工作日
- **自动跳过周日和节假日**
- 例如：
  - `ramp_start_date = 2026-10-05` (Monday)
  - Day 1 = 2026-10-05 (Monday) - workday_index = 1
  - Day 2 = 2026-10-06 (Tuesday) - workday_index = 2
  - ...
  - 2026-10-07 (周日) - **跳过**
  - 2026-10-08 (Monday) - workday_index = 3

---

### **1.3 获取UPH和Yield系数（考虑Ramp Curves）**

```javascript
// line 281-282
const uphFactor = unit.uph_ramp_curve.factors[Math.min(workdayIdx - 1, uphCurveLength - 1)];
const yieldFactor = unit.yield_ramp_curve.factors[Math.min(workdayIdx - 1, yieldCurveLength - 1)];
```

**如何实现**:
- **Workday 1** → `factors[0]` (例如 UPH: 0.50, Yield: 0.70)
- **Workday 2** → `factors[1]` (例如 UPH: 0.55, Yield: 0.72)
- **Workday 30** → `factors[29]` (例如 UPH: 1.00, Yield: 0.98)
- 如果 workday > curve length，使用最后一个值（100%）

**数据来源**:
- `unit.uph_ramp_curve.factors` - 从 Curve Presets Manager 或自定义
- `unit.yield_ramp_curve.factors` - 从 Curve Presets Manager 或自定义

---

### **1.4 获取班次工作时长（考虑Override）**

```javascript
// line 285-290
const shiftHours = this.calendar.getShiftHours(
  unit.site_id,
  date,
  unit.shift_type,  // 'DAY' or 'NIGHT'
  unit.shift_hours  // 默认工作时长 (如 10小时)
);
```

**如何实现**:
1. 检查是否有 `siteOverrides` 对该日期+班次的覆盖
2. 如果有覆盖，返回 `shift_hours_override`
3. 否则返回默认 `shift_hours`

**示例**:
```javascript
// 正常情况
date = '2026-10-05', shift_type = 'DAY'
→ shiftHours = 10 (默认)

// 国庆加班（覆盖）
date = '2026-10-03', shift_type = 'DAY'
→ shiftHours = 12 (siteOverrides 设定加班2小时)
```

---

### **1.5 计算 Daily Input (日投入)**

```javascript
// line 293
const input = unit.base_uph * uphFactor * shiftHours;
```

**公式**:
```
Daily Input = Base_UPH × UPH_Factor × Shift_Hours
```

**示例**:
```javascript
// WF L1 Day - Workday 5
base_uph = 120 units/hour
uphFactor = 0.70  // 70% efficiency on day 5
shiftHours = 10 hours

input = 120 × 0.70 × 10 = 840 units
```

---

### **1.6 计算 Daily Output (日产出)**

#### **Step 1: 基础产出 (应用Yield)**

```javascript
// line 296
const baseOutput = input * yieldFactor;
```

**示例**:
```javascript
input = 840 units
yieldFactor = 0.78  // 78% yield on day 5

baseOutput = 840 × 0.78 = 655.2 units
```

#### **Step 2: 应用Output Factors (产出释放曲线)**

```javascript
// line 299-306
let outputFactor = 1.0;
if (workdayIdx === 1) {
  outputFactor = this.programConfig.output_factors.day1;  // 默认 0.5
} else if (workdayIdx === 2) {
  outputFactor = this.programConfig.output_factors.day2;  // 默认 1.0
} else {
  outputFactor = this.programConfig.output_factors.day3_plus;  // 默认 1.0
}

const output = baseOutput * outputFactor;
```

**Output Factors 的含义**:
- **Day 1 (投入当天)**: `0.5` → 只产出50%（另50%在Day 2产出）
- **Day 2**: `1.0` → 100%产出
- **Day 3+**: `1.0` → 100%产出

**数据来源**:
- `PRODUCTION_PLAN_SEED_DATA.programConfig.output_factors`
- 可在配置界面调整

**示例**:
```javascript
// Workday 1 (第一天投入)
baseOutput = 655.2
outputFactor = 0.5
output = 655.2 × 0.5 = 327.6 units  // 只产出一半

// Workday 2
baseOutput = 700
outputFactor = 1.0
output = 700 × 1.0 = 700 units  // 全部产出
```

---

### **1.7 保存Unit Level结果**

```javascript
// line 310-326
results.push({
  unit_id: unit.unit_id,            // "WF_L1_DAY"
  date,                              // "2026-10-05"
  site_id: unit.site_id,             // "WF"
  line_id: unit.line_id,             // "L1"
  shift_type: unit.shift_type,       // "DAY"
  is_working: true,
  workday_index: workdayIdx,         // 5
  ramp_start_date: unit.ramp_start_date,
  base_uph: unit.base_uph,           // 120
  shift_hours: shiftHours,           // 10
  uph_factor: uphFactor,             // 0.70
  yield_factor: yieldFactor,         // 0.78
  output_factor: outputFactor,       // 0.5 or 1.0
  input,                             // 840
  output                             // 328 或 700
});
```

---

## 🏢 Step 2: 汇总到站点级别 (Site Level)

**代码位置**: `aggregateToSite()` - line 334-368

```javascript
// 对每个站点，每一天，汇总所有 Line × Shift 的结果
for (const siteId in bySite) {
  const units = bySite[siteId];
  const inputSum = units.reduce((sum, u) => sum + u.input, 0);
  const outputSum = units.reduce((sum, u) => sum + u.output, 0);

  siteMap[siteId].push({
    date,
    site_id: siteId,
    input_unconstrained: inputSum,   // 所有 Line × Shift 投入之和
    output_unconstrained: outputSum, // 所有 Line × Shift 产出之和
    input_final: inputSum,
    output_final: outputSum
  });
}
```

**示例**:
```javascript
// WF Site on 2026-10-05
WF_L1_DAY:   input = 840,  output = 420
WF_L1_NIGHT: input = 840,  output = 420
WF_L2_DAY:   input = 600,  output = 300

→ Site WF: input = 2280, output = 1140
```

---

## 🔒 Step 3: 应用CTB约束 (Constrained Mode)

**代码位置**: `applyCtbConstraints()` - line 371-429

**仅在 mode = 'constrained' 时执行**

### **3.1 构建CTB Map**

```javascript
// line 378-384
const ctbMap = {};
for (const ctb of this.ctbDaily) {
  if (ctb.site_id === siteId && ctb.program_id === this.programConfig.program_id) {
    ctbMap[ctb.date] = ctb.ctb_qty;  // 每日CTB数量
  }
}
```

**数据来源**:
- `PRODUCTION_PLAN_SEED_DATA.ctbDaily`
- 或通过 Forecast & CTB Manager 导入

**示例**:
```javascript
ctbMap = {
  '2026-10-01': 5000,
  '2026-10-02': 3000,
  '2026-10-03': 0,      // 国庆期间无CTB
  '2026-10-05': 2000,
  ...
}
```

---

### **3.2 计算累计CTB**

```javascript
// line 386-392
let cumCtb = 0;
const cumCtbMap = {};
for (const date of dates) {
  cumCtb += (ctbMap[date] || 0);
  cumCtbMap[date] = cumCtb;
}
```

**示例**:
```javascript
cumCtbMap = {
  '2026-10-01': 5000,
  '2026-10-02': 8000,   // 5000 + 3000
  '2026-10-03': 8000,   // 8000 + 0
  '2026-10-05': 10000,  // 8000 + 2000
  ...
}
```

---

### **3.3 每日应用CTB约束**

```javascript
// line 394-423
let cumInputFinal = 0;
for (const dayData of siteData) {
  const date = dayData.date;
  const cumCtbToday = cumCtbMap[date] || 0;

  // CTB剩余 = 累计CTB - 累计已投入
  const ctbRemaining = Math.max(0, cumCtbToday - cumInputFinal);

  // 最终投入 = min(无约束投入, CTB剩余)
  const inputFinal = Math.min(dayData.input_unconstrained, ctbRemaining);

  // 产出按比例缩放
  const effectiveYield = dayData.input_unconstrained > 0
    ? dayData.output_unconstrained / dayData.input_unconstrained
    : 0;
  const outputFinal = inputFinal * effectiveYield;

  cumInputFinal += inputFinal;

  constrainedData.push({
    date,
    site_id: siteId,
    input_unconstrained: dayData.input_unconstrained,  // 原始产能
    output_unconstrained: dayData.output_unconstrained,
    ctb_daily: ctbMap[date] || 0,                     // 当日CTB
    cum_ctb: cumCtbToday,                             // 累计CTB
    ctb_remaining: ctbRemaining,                      // 剩余可用CTB
    input_final: inputFinal,                          // 受限后的投入
    output_final: outputFinal,                        // 受限后的产出
    cum_input_final: cumInputFinal                    // 累计投入
  });
}
```

**示例**:
```javascript
// Day 1: 2026-10-05
input_unconstrained = 2280 (产能)
cum_ctb = 10000
cum_input_final (昨天) = 8500

ctb_remaining = 10000 - 8500 = 1500
input_final = min(2280, 1500) = 1500  // 受CTB限制!

// 产出按比例缩放
effectiveYield = 1140 / 2280 = 0.5
output_final = 1500 × 0.5 = 750

→ Binding Constraint = 'CTB' (因为 CTB < Capacity)
```

---

## 📦 Step 4: 计算出货时间 (+2 工作日)

**代码位置**: `calculateShipments()` - line 432-479

```javascript
for (const dayData of siteFinal[siteId]) {
  const outputDate = dayData.date;
  const outputQty = dayData.output_final;

  // 计算出货日期 = 产出日期 + 2个工作日
  const shipmentDate = this.calendar.addWorkingDays(
    site.country,
    siteId,
    outputDate,
    this.programConfig.shipment_lag_workdays  // 默认 = 2
  );

  // 如果出货日期在计划范围内，累加
  if (dates.includes(shipmentDate)) {
    shipmentMap[shipmentDate] += outputQty;
  }
}
```

**如何计算 +2 工作日**:
- **跳过周日**
- **跳过节假日**
- **从产出日期的下一天开始计数**

**示例**:
```javascript
// 正常周
Output: Mon 2026-10-05 → Ship: Wed 2026-10-07
  +1 WD = Tue 2026-10-06
  +2 WD = Wed 2026-10-07

// 跨周末
Output: Fri 2026-10-09 → Ship: Tue 2026-10-13
  +1 WD = Mon 2026-10-12 (跳过Sun 10-11)
  +2 WD = Tue 2026-10-13

// 跨节假日
Output: Wed 2026-10-01 → Ship: Mon 2026-10-12
  (10-01 到 10-07 国庆假期)
  +1 WD = Thu 2026-10-08
  +2 WD = Fri 2026-10-09
  ...实际可能更晚，取决于假期安排
```

---

## 🌍 Step 5: 汇总到产品级别 (Program Level)

**代码位置**: `aggregateToProgram()` - line 481-550

```javascript
for (const date of dates) {
  let totalInput = 0;
  let totalOutput = 0;
  let totalShipment = 0;

  // 汇总所有站点
  for (const siteId in siteFinal) {
    const siteDay = siteFinal[siteId].find(d => d.date === date);
    if (siteDay) {
      totalInput += siteDay.input_final;
      totalOutput += siteDay.output_final;
    }

    const shipment = siteShipments[siteId]?.[date] || 0;
    totalShipment += shipment;
  }

  cumInput += totalInput;
  cumOutput += totalOutput;
  cumShipment += totalShipment;

  programResults.push({
    date,
    input_final: totalInput,
    output_final: totalOutput,
    shipment_final: totalShipment,
    cum_input: cumInput,
    cum_output: cumOutput,
    cum_shipment: cumShipment
  });
}
```

**示例**:
```javascript
// 2026-10-05 - Program Level
WF Site:   input = 1500, output = 750, shipment = 0
VN02 Site: input = 800,  output = 400, shipment = 650

→ Program: input = 2300, output = 1150, shipment = 650
```

---

## 📅 Step 6: 计算周度指标

**代码位置**: `calculateWeeklyMetrics()` - line 552-620

```javascript
for (const weekId of weekIds) {
  const weekDays = programResults.filter(d =>
    DateUtils.getWeekId(d.date) === weekId && !DateUtils.isSunday(d.date)
  );

  const weeklyInput = weekDays.reduce((sum, d) => sum + d.input_final, 0);
  const weeklyOutput = weekDays.reduce((sum, d) => sum + d.output_final, 0);
  const weeklyShipment = weekDays.reduce((sum, d) => sum + d.shipment_final, 0);

  // 获取该周的需求
  const demandEntry = this.weeklyDemand.find(w => w.week_id === weekId);
  const weeklyDemand = demandEntry ? demandEntry.demand_qty : 0;

  cumForecast += weeklyDemand;

  const weeklyGap = weeklyShipment - weeklyDemand;
  const weeklyAttainment = weeklyDemand > 0
    ? (weeklyShipment / weeklyDemand) * 100
    : 0;

  weeklyMetrics.push({
    week_id: weekId,
    input: weeklyInput,
    output: weeklyOutput,
    shipments: weeklyShipment,
    demand: weeklyDemand,
    gap: weeklyGap,
    attainment: weeklyAttainment,
    cum_forecast: cumForecast,
    cum_shipment: lastDayOfWeek.cum_shipment
  });
}
```

**数据来源**:
- `PRODUCTION_PLAN_SEED_DATA.weeklyDemand`
- 或通过 Forecast & CTB Manager 导入

**示例**:
```javascript
// Week 2026-W41
Monday-Saturday 每日shipment汇总 = 12000
Weekly Demand (from forecast) = 15000

Gap = 12000 - 15000 = -3000 (缺口)
Attainment = 12000 / 15000 = 80%
```

---

## 🎯 总结：各因素如何被使用

| 因素 | 使用位置 | 影响结果 | 计算公式 |
|------|---------|---------|---------|
| **Base UPH** | Step 1 - 日投入 | Daily Input | `base_uph × uph_factor × shift_hours` |
| **UPH Ramp Curve** | Step 1 - 获取UPH系数 | Daily Input | `factors[workday_index - 1]` |
| **Yield Ramp Curve** | Step 1 - 获取Yield系数 | Daily Output | `factors[workday_index - 1]` |
| **Shift Hours** | Step 1 - 日投入 | Daily Input | 乘数因子 |
| **Shift Hours Override** | Step 1 - 特定日期覆盖 | Daily Input | 替换默认值 |
| **Holidays** | Step 1 - 判定工作日 | 整个计算 | 非工作日 = 0 |
| **Workday Index** | Step 1 - 索引ramp curves | UPH/Yield系数 | 从ramp_start_date开始计数（跳过假期） |
| **Output Factors** | Step 1 - 产出释放 | Daily Output | Day1=0.5, Day2=1.0, Day3+=1.0 |
| **CTB Daily** | Step 3 - 约束检查 | Input/Output Final | `min(capacity, ctb_remaining)` |
| **CTB Cumulative** | Step 3 - 累计逻辑 | Input/Output Final | `cum_ctb - cum_input_used` |
| **Shipment Lag** | Step 4 - 出货日期 | Shipment Date | `output_date + 2 working days` |
| **Weekly Demand** | Step 6 - 周度对比 | Gap, Attainment | `shipment - demand` |

---

## 🔍 验证方法

你可以通过以下方式验证各因素是否被正确应用：

### **方法1: 查看生成的报表数据**

在 `test_production_plan.html` 或生成的报表中，检查：

1. **Workday Index** - 是否正确跳过周日和假期
2. **UPH Factor / Yield Factor** - 是否按曲线变化
3. **Daily Input** - 是否 = `base_uph × uph_factor × shift_hours`
4. **Daily Output** - 是否考虑了yield和output_factors
5. **CTB Remaining** - constrained模式下是否正确计算
6. **Shipment Date** - 是否正确 +2 工作日

### **方法2: Console日志**

生成计划时，打开浏览器开发者工具，查看console输出的详细日志。

### **方法3: 单元测试**

使用 `test_production_plan.html` 运行测试，查看输出表格。

---

## ⚠️ 已知限制

1. **Target Yield 未应用** - 当前只使用 `yield_ramp_curve`，没有单独应用 `target_yield`
2. **Capacity Overflow** - 如果产出超过产能，直接cap，不推迟到下一天
3. **Output Factors 简化** - 当前是固定的 Day1/Day2/Day3+，实际可能需要更复杂的分布

这些限制在 `PRODUCTION_PLAN_GENERATION_LOGIC.md` 中有详细说明。

---

**结论**: ✅ 所有你提到的因素（UPH, Yield, Holidays, Lines, Shifts, Shift Hours, CTB, Forecast）都已被正确纳入计算流程中。
