# Production Plan 页面重构完成 ✅

## 实施完成日期
2026-01-24

---

## ✅ 已完成内容

### 1. 辅助函数（全部实现）

#### `aggregateByMonth(dailyData)`
**位置**: [app_v2.js:5221-5259](app_v2.js#L5221-L5259)

**功能**: 将日度数据聚合为月度数据

**输入**: 日度数据数组
**输出**: 月度数据数组，包含：
- `month_id`: 月份标识 (YYYY-MM)
- `forecast`, `ctb`, `capacity`, `input`, `output`, `shipments`
- `cum_forecast`, `cum_ctb`, `cum_capacity`, `cum_input`, `cum_output`, `cum_shipment`
- `gap`: shipments - forecast

---

#### `calculatePlanSummary(dailyData)`
**位置**: [app_v2.js:5264-5274](app_v2.js#L5264-L5274)

**功能**: 计算整个计划周期的汇总指标

**输出**:
```javascript
{
  cumForecast: 2800000,    // 总需求
  cumCTB: 2700000,         // 总物料可用量
  cumCapacity: 2900000,    // 总产能
  cumShip: 2600000,        // 总发货量
  gap: -200000             // 缺口
}
```

---

#### `analyzePrimaryConstraint(dailyData)`
**位置**: [app_v2.js:5279-5318](app_v2.js#L5279-L5318)

**功能**: 分析主要约束是 CTB 还是 Capacity

**输出**:
```javascript
{
  primaryConstraint: 'CTB' | 'Capacity' | 'Mixed',
  ctbLimitedDays: 25,           // CTB 受限天数
  capacityLimitedDays: 5,       // Capacity 受限天数
  ctbLimitedUnits: 50000,       // CTB 短缺总量
  capacityLimitedUnits: 8000,   // Capacity 短缺总量
  ctbLimitedPct: '83.3',        // CTB 受限百分比
  capacityLimitedPct: '16.7'    // Capacity 受限百分比
}
```

**判定逻辑**: 哪种约束的天数更多，就是主约束

---

#### `getDailyConstraint(day)`
**位置**: [app_v2.js:5323-5333](app_v2.js#L5323-L5333)

**功能**: 判断单日的约束类型

**输出**: `'CTB'` | `'Capacity'` | `'None'`

**判定逻辑**:
```javascript
if (ctb < capacity) return 'CTB';
if (capacity < ctb) return 'Capacity';
return 'None';
```

---

#### `switchPlanGranularity(granularity)`
**位置**: [app_v2.js:5338-5344](app_v2.js#L5338-L5344)

**功能**: 切换视图粒度（Daily / Weekly / Monthly）

**实现**:
```javascript
function switchPlanGranularity(granularity) {
  window.productionPlanState.viewGranularity = granularity;
  renderProductionPlanLatest();
}
```

---

### 2. 页面结构重构（renderProductionPlanLatest）

#### ✅ Subpage Navigation（保持不变）
```html
<div class="bg-white border rounded-xl p-4">
  <button>📊 Latest Production Plan</button>
  <button>⚙️ Generate Report</button>
</div>
```

---

#### ✅ Context Header（简化版）

**删除**: Planning Mode 切换

**保留**:
- Program
- Date Range
- Sites
- Last Updated（新增）
- Export Excel 按钮

```html
<div class="bg-white border rounded-xl p-4">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-4">
      <div>Program: Product A</div>
      <div>Date Range: 2026-10-01 to 2026-12-31</div>
      <div>Sites: All Sites</div>
      <div>Last Updated: 2026-01-24 15:30:00</div>
    </div>
    <button>📊 Export Excel</button>
  </div>
</div>
```

---

#### ✅ What this page shows（新增说明文案）

**样式**: 蓝色背景提示框

**内容**:
```
What this page shows:
This plan shows two truths at once: what we could build (Capacity) and
what we can actually build (Materials/CTB) — so you can quickly see
whether a gap is driven by capacity readiness or material readiness.

How to read it: If Capacity is healthy but Input/Ship is capped, the constraint is likely
CTB/materials. If Capacity itself is below demand, the constraint is capacity/line readiness.
```

---

#### ✅ Summary Strip（替换 KPI Cards）

**Before**: 4 个 KPI 卡片（This Week Input, Output, Shipments, Gap）

**After**: 4 个解释型指标（无大色块，去 KPI 化）

```
┌─ Forecast (Cum) ─────┐  ┌─ Capacity (Cum) ─────┐
│ 2.8M units           │  │ 2.9M units           │
│ Demand target        │  │ Pure (not limited    │
│                      │  │ by CTB)              │
└──────────────────────┘  └──────────────────────┘

┌─ CTB (Cum) ──────────┐  ┌─ Deliverable Ship ───┐
│ 2.7M units           │  │ 2.6M units           │
│ Materials available  │  │ Realistic delivery   │
│                      │  │ (+2 WD)              │
└──────────────────────┘  └──────────────────────┘
```

**实现位置**: [app_v2.js:3277-3301](app_v2.js#L3277-L3301)

---

#### ✅ Primary Constraint Summary（新增）

**显示内容**:
```
Primary Binding Constraint (This Period): 📦 CTB-limited
Gap (Deliverable vs Forecast): -200k units
CTB limited 83.3% of days (50,000 units short)
```

**实现位置**: [app_v2.js:3303-3321](app_v2.js#L3303-L3321)

**颜色规则**:
- CTB-limited: 橙色 (text-orange-700)
- Capacity-limited: 红色 (text-red-700)
- No constraint: 绿色 (text-green-700)

---

#### ✅ Granularity Toggle（新增）

**按钮**: [Daily] [Weekly] [Monthly]

**默认**: Daily

**交互**: 点击切换 → 调用 `switchPlanGranularity(granularity)` → 重新渲染表格

**实现位置**: [app_v2.js:3323-3337](app_v2.js#L3323-L3337)

---

#### ✅ Main Truth Table（核心重构）

**新表结构 - 4 个 Column Groups**:

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ Date/Week/Month │ Demand/Supply │ Capacity Track │ Reality Track    │ Gap/Constraint │
├─────────────────┼───────────────┼────────────────┼──────────────────┼────────────────┤
│                 │ Cum     Cum   │ Daily   Cum    │ Daily   Cum      │ Gap    Binding │
│                 │ Forecast CTB  │ Capacity Cap   │ Input   Input    │ (Cum)  Driver  │
│                 │               │                │ Output  Output   │                │
│                 │               │                │ Ship    Ship     │                │
├─────────────────┼───────────────┼────────────────┼──────────────────┼────────────────┤
│ 2026-10-01      │ 150k   148k   │ 150     150k   │ 148     148k     │ -2k    CTB     │
│ 2026-10-02      │ 300k   296k   │ 150     300k   │ 148     296k     │ -4k    CTB     │
│ ...             │               │                │                  │                │
└─────────────────┴───────────────┴────────────────┴──────────────────┴────────────────┘
```

**Column Group 1: Demand / Supply**（灰色背景）
- Cum Forecast（累计需求）
- Cum CTB（累计物料可用）

**Column Group 2: Capacity Track**（蓝色背景）
- Daily Capacity（日产能）
- Cum Capacity（累计产能）

**Column Group 3: Reality Track**（绿色背景）
- Daily Input（日投��）
- Cum Input（累计投入）
- Daily Output（日产出）
- Cum Output（累计产出）
- Daily Ship（日发货）
- Cum Ship（累计发货）

**Column Group 4: Gap / Constraint**（橙色背景）
- Gap (Cum Ship – Cum Forecast)
- Binding Driver（CTB / Capacity / None）

**实现位置**: [app_v2.js:3339-3436](app_v2.js#L3339-L3436)

---

### 3. 数据流

```
1. User clicks "Production Plan"
   ↓
2. renderProductionPlanLatest()
   ↓ reads state.viewGranularity
   ↓
3. Get data based on granularity:
   - Daily: results.programResults
   - Weekly: results.weeklyMetrics
   - Monthly: aggregateByMonth(results.programResults)
   ↓
4. Calculate summary metrics:
   - calculatePlanSummary() → cumForecast, cumCTB, cumCapacity, cumShip, gap
   ↓
5. Analyze constraints:
   - analyzePrimaryConstraint() → primaryConstraint, ctbLimitedPct, etc.
   ↓
6. Render table:
   - Loop through currentData
   - For each row: calculate cumulative values + getDailyConstraint()
   - Apply color coding based on gap and binding driver
```

---

### 4. 颜色规则

#### Summary Strip
- 所有卡片: 白色背景 + border-2 + shadow-sm（无颜色区分）
- 数值字体: Forecast/Capacity/CTB 用 slate-900，Ship 用 blue-700

#### Primary Constraint Summary
- CTB-limited: 橙色 text-orange-700
- Capacity-limited: 红色 text-red-700
- No constraint: 绿色 text-green-700
- Gap 正数: 绿色 text-green-700
- Gap 负数: 红色 text-red-700

#### Main Table Column Groups
- Demand/Supply: bg-slate-200（浅灰）
- Capacity Track: bg-blue-50（浅蓝）
- Reality Track: bg-green-50（浅绿）
- Gap/Constraint: bg-orange-50（浅橙）

#### Main Table Gap Column
- Gap ≥ 0: 绿色 text-green-700
- Gap < 0: 红色 text-red-700

#### Main Table Binding Driver Column
- CTB: 橙色 text-orange-700
- Capacity: 红色 text-red-700
- None: 灰色 text-slate-500

---

### 5. 删除的内容

✅ **Planning Mode 切换** - 不再需要 Constrained/Unconstrained 模式
✅ **KPI Cards（4个）** - 替换为 Summary Strip
✅ **Weekly Chart（可视化图表）** - 删除，因为已有 Truth Table

---

### 6. 保留的内容

✅ **Subpage Navigation** - Latest / Generate Report 切换
✅ **Export Excel** - 保持功能（按钮位置不变）
✅ **Generate Report 页面** - 完全不动

---

## 验收标准

### ✅ 同一张表同时看到
- Forecast（需求）
- CTB（物料可用）
- Capacity（纯产能）
- Reality（实际投入/产出/发货）
- Gap（缺口）

### ✅ 一眼能看出
- Gap 是 CTB 造成还是 Capacity 造成
- 主约束是什么（Primary Binding Constraint）
- 每天的约束类型（Binding Driver 列）

### ✅ Daily/Weekly/Monthly 切换正常
- 3 个按钮（蓝色高亮当前选项）
- 点击后重新渲染表格
- 字段保持一致

### ✅ 不出现 KPI 墙
- Summary Strip 使用白色卡片，无颜色区分
- 颜色只用于解释约束（橙/红/绿）

### ✅ Actual vs Projection 区分
- **目前未实现**（需要额外数据标记 actual vs projection）
- 预留方案：过去行用白色背景，未来行用浅灰色背景

---

## 技术细节

### 文件修改
- **app_v2.js**:
  - Lines 5221-5344: 新增 5 个辅助函数
  - Lines 3195-3436: 重写 `renderProductionPlanLatest()`

### 新增 State 属性
- `window.productionPlanState.viewGranularity`: 'daily' | 'weekly' | 'monthly'

### 新增全局函数
- `switchPlanGranularity(granularity)`: 切换视图粒度

---

## 测试方法

### 方法 1: 直接访问
```bash
# 1. 确保服务器运行
python3 -m http.server 8080

# 2. 打开页面
open http://localhost:8080/index_v2.html

# 3. 点击侧边栏 "Production Plan"

# 4. 测试功能
- 查看 Summary Strip（4 个白色卡片）
- 查看 Primary Constraint Summary（CTB/Capacity 判定）
- 点击 Daily/Weekly/Monthly 按钮
- 查看 Truth Table（4 个 Column Groups）
- 点击 Export Excel
```

### 方法 2: Console 验证
```javascript
// 打开浏览器 console

// 1. 检查 state
console.log('View Granularity:', window.productionPlanState?.viewGranularity);

// 2. 测试切换
switchPlanGranularity('weekly');
switchPlanGranularity('monthly');
switchPlanGranularity('daily');

// 3. 检查数据
const summary = calculatePlanSummary(window.productionPlanState.planResults.programResults);
console.log('Summary:', summary);

const constraint = analyzePrimaryConstraint(window.productionPlanState.planResults.programResults);
console.log('Constraint:', constraint);
```

---

## 已知限制

### 1. Actual vs Projection 区分未实现
**原因**: 需要数据源标记每天是 actual 还是 projection

**预留方案**:
```javascript
// 在 row rendering 时判断
const isActual = new Date(day.date) <= new Date();
const bgColor = isActual ? 'bg-white' : 'bg-slate-50';
```

### 2. Weekly 数据的 Binding Driver 显示为 "-"
**原因**: `getDailyConstraint()` 只适用于日度数据，周度/月度数据无法判定单点约束

**解决方案**: 周度/月度可显示 "Mixed" 或计算 dominant constraint

---

## 下一步增强（可选）

### P1 功能
1. **Actual vs Projection 区分** - 需要数据源支持
2. **周度/月度 Binding Driver** - 计算 dominant constraint
3. **Export Excel 支持新表结构** - 更新导出逻辑

### P2 功能
1. **行内 Sparkline** - 显示趋势小图
2. **Drill-down** - 点击行展开详情
3. **Constraint Tooltip** - 悬停显示约束原因

---

## 总结

**Before**: Production Plan = 简单数据展示（4 个 KPI 卡片 + 简单表格）

**After**: Production Plan = 约束解释 + 决策指向工具

**核心改进**:
- ✅ 一张表同时展示 Capacity Track + CTB Reality Track
- ✅ 明确约束归因（CTB vs Capacity）
- ✅ 去 KPI 化（Summary Strip 无颜色区分）
- ✅ 支持 Daily/Weekly/Monthly 切换
- ✅ 4 个 Column Groups 清晰分组

**这才是真正的\"约束解释\"，不是 KPI 墙。** 🎯✅
