# Production Plan 页面重构规格 v2.0

## 重构目标

将 Production Plan 从"简单数据展示"改造成"约束解释 + 决策指向"工具

### 核心原则
1. **一张表同时展示 Capacity Track + CTB Reality Track**
2. **不做模式切换** - 删除 "Constrained/Unconstrained" 切换
3. **约束归因** - 明确显示是 CTB-limited 还是 Capacity-limited
4. **Actual vs Plan** - 过去是实际，未来是预测，同一张表
5. **避免 KPI 化** - 不做打分/排名，只做约束解释

---

## 页面新结构

### 1. Context Header（保持轻量）
```
Program: Product A | Date Range | Sites | Last Updated
[Export Excel 按钮]
```

**删除**: "Planning Mode" 切换（不再需要 Constrained/Unconstrained 切换）

### 2. What this page shows（新增说明文案）
```
What this page shows:
This plan shows two truths at once: what we could build (Capacity) and
what we can actually build (Materials/CTB) — so you can quickly see
whether a gap is driven by capacity readiness or material readiness.

How to read it:
If Capacity is healthy but Input/Ship is capped, the constraint is likely
CTB/materials. If Capacity itself is below demand, the constraint is
capacity/line readiness.
```

### 3. Summary Strip（替换 KPI Cards）
**Before**: 4 个 KPI 卡片（This Week Input, Output, Shipments, Gap）

**After**: 4 个解释型数字（无大色块）
```
┌─ Forecast (Cum) ─────┐  ┌─ Capacity (Cum) ─────┐
│ 2.8M units           │  │ 2.9M units (pure)    │
│ Demand target        │  │ Not limited by CTB   │
└──────────────────────┘  └──────────────────────┘

┌─ CTB (Cum) ──────────┐  ┌─ Deliverable Ship ───┐
│ 2.7M units           │  │ 2.6M units (+2 WD)   │
│ Materials available  │  │ Realistic delivery   │
└──────────────────────┘  └──────────────────────┘
```

**新增**: 一行系统解释
```
Primary Binding Constraint (This Period): CTB-limited
Gap (Deliverable vs Forecast): -200k units
```

**关键**: 用 "Binding constraint" 作为核心输出，不是 "82% 红了"

### 4. Granularity Toggle（新增）
```
[Daily] [Weekly] [Monthly]
```
- 默认：Daily
- 点击切换：同一套数据，不同聚合粒度
- 不换页面，只换表格内容

### 5. Main Truth Table（核心改造）

**新表结构 - 4 个 Column Groups**:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ Date/Week/Month │ Demand/Supply │ Capacity Track │ Reality Track │ Gap/Constraint │
├─────────────────┼───────────────┼────────────────┼───────────────┼────────────────┤
│                 │ Cum     Cum   │ Daily   Cum    │ Daily  Cum    │ Gap    Binding │
│                 │ Forecast CTB  │ Capacity Cap   │ Input  Input  │ (Cum)  Driver  │
│                 │               │                │ Output Output │                │
│                 │               │                │ Ship   Ship   │                │
├─────────────────┼───────────────┼────────────────┼───────────────┼────────────────┤
│ 2026-10-01      │ 150k   148k   │ 150    150k    │ 148    148k   │ -2k    CTB     │
│ 2026-10-02      │ 300k   296k   │ 150    300k    │ 148    296k   │ -4k    CTB     │
│ ...             │               │                │               │                │
└─────────────────┴───────────────┴────────────────┴───────────────┴────────────────┘
```

**Column Group 1: Demand / Supply Inputs**
- Cum Forecast（累计需求）
- Cum CTB（累计物料可用）

**Column Group 2: Capacity Track**（纯产能，不看物料）
- Daily Capacity（日产能）
- Cum Capacity（累计产能）

**Column Group 3: Reality Track**（真实情况，CTB 与产能取 min）
- Daily Input（日投入 = min(CTB, Capacity)）
- Cum Input（累计投入）
- Daily Output（日产出 = Input × Yield）
- Cum Output（累计产出）
- Daily Ship（日发货 = Output + 2 WD lag）
- Cum Ship（累计发货）

**Column Group 4: Gap & Constraint**
- Gap (Cum Ship – Cum Forecast)
- Binding Constraint（CTB / Capacity / None）
- Driver note（可点击，例如 "CTB short 3 days"）

### 6. Actual vs Projection 显示规则

**不增加第二张表**，在同一张表中区分：

方案 1（推荐）：
- 历史行背景：白色
- 未来行背景：浅灰色（`bg-slate-50`）
- 数字右上角标记：A / P（极轻，不占空间）

方案 2：
- 每个 cell 右上角用极小字号显示：`A` / `P`

---

## 数据字段映射

### 输入数据（从 Production Plan Engine）
- `date`
- `demand` / `cum_demand`
- `ctb_available`（物料可用）
- `capacity_unconstrained`（纯产能）
- `input_final`（实际投入）
- `output_final`（实际产出）
- `shipment_final`（实际发货）
- `cum_input`, `cum_output`, `cum_shipment`

### 派生计算
- `cum_ctb` = sum(ctb_available)
- `cum_capacity` = sum(capacity_unconstrained)
- `gap` = cum_shipment - cum_demand
- `binding_constraint` = 判定逻辑（见下）

### Binding Constraint 判定逻辑
```javascript
function getDailyConstraint(day) {
  const ctb = day.ctb_available || day.capacity_unconstrained;
  const capacity = day.capacity_unconstrained;

  if (ctb < capacity) return 'CTB';
  if (capacity < ctb) return 'Capacity';
  return 'None';
}
```

---

## 删除的内容

1. **Planning Mode 切换** - 不再需要 Constrained/Unconstrained 模式
2. **Weekly Chart** - 可选保留，但不是主要内容
3. **Site Breakdown 占位** - 删除空白占位

---

## 保留的内容

1. **Subpage Navigation** - Latest / Generate Report 切换
2. **Export Excel** - 保持功能
3. **Generate Report 页面** - 完全不动

---

## 实施步骤

### Step 1: 添加辅助函数 ✅
- `aggregateByMonth()`
- `calculatePlanSummary()`
- `analyzePrimaryConstraint()`
- `getDailyConstraint()`
- `switchPlanGranularity()`

### Step 2: 重写 renderProductionPlanLatest()
- 删除 KPI Cards
- 添加 What this page shows 说明
- 添加 Summary Strip
- 添加 Granularity Toggle
- 重构 Main Table（4 column groups）

### Step 3: 测试
- Daily / Weekly / Monthly 切换
- Binding Constraint 显示
- Export Excel 功能

---

## 验收标准

✅ 同一张表同时看到：Forecast、CTB、Capacity、Reality、Gap
✅ 一眼能看出：gap 是 CTB 造成还是 capacity 造成
✅ Daily/Weekly/Monthly 切换正常，字段一致
✅ 不出现 KPI 墙，颜色只解释约束
✅ Actual vs Projection 区分清楚

---

## 下一步

确认规格后，开始实施 Step 2。
