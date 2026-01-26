# Production Plan 系统全面总结

**日期**: 2026-01-24
**状态**: 系统已实现核心逻辑，待根据您的反馈补充完善

---

## 一、系统设计原则

### 核心理念
1. **双轨展示**: 同时显示 Capacity Track（纯产能）和 Reality Track（物料约束后的真实情况）
2. **约束归因**: 明确标识是 CTB-limited 还是 Capacity-limited，不做主观评分
3. **事实优先**: 用可核对的数字代替红黄绿打分
4. **决策导向**: 帮助用户快速定位瓶颈，而非展示 KPI 墙

### 反对的做法
- ❌ 红黄绿 KPI 卡片
- ❌ Constrained/Unconstrained 模式切换（改为同时展示两条轨道）
- ❌ 主观评分和排名
- ❌ Framework/Consulting 术语

---

## 二、数据结构与种子数据

### 1. 程序配置 (programConfig)
```javascript
{
  program_id: 'product_a',
  program_name: 'Product A',
  default_shift_hours: { DAY: 10, NIGHT: 10 },  // 默认班次小时
  output_factors: {
    day1: 0.5,      // 投入第1天的产出系数
    day2: 1.0,      // 投入第2天的产出系数
    day3_plus: 1.0  // 投入第3天及以后的产出系数
  },
  shipment_lag_workdays: 2,  // 发货延迟（工作日）
  weekly_window: 'MON_SAT'   // 周定义：周一到周六
}
```

**Output Factors 逻辑**:
- Day 1 (投入当天): 只有 50% 的产出流出
- Day 2 (投入后第1天): 100% 的产出流出
- Day 3+ (投入后第2天及以后): 100% 的产出流出

这模拟了生产中的 **Flow-Time**: 投入的物料不会立即全部转化为成品。

---

### 2. 站点配置 (sites)
```javascript
sites: [
  { site_id: 'WF', site_name: 'WF', country: 'CN' },
  { site_id: 'VN02', site_name: 'VN-02', country: 'VN' }
]
```

---

### 3. 法定节假日 (countryHolidays)
```javascript
countryHolidays: {
  CN: [
    {
      name: '国庆节 (National Day)',
      start: '2026-10-01',
      end: '2026-10-07',
      notes: '7-day statutory holiday period'
    }
  ],
  VN: [
    {
      name: 'National Day (VN)',
      start: '2026-09-02',
      end: '2026-09-02'
    }
  ]
}
```

---

### 4. 站点日历覆盖 (siteOverrides)
```javascript
siteOverrides: [
  {
    site_id: 'WF',
    overrides: [
      {
        date: '2026-10-03',
        is_working_day: true,  // 国庆期间工厂加班
        shift_hours_override: { DAY: 12, NIGHT: 10 }  // 日班加班到12小时
      },
      {
        date: '2026-10-08',
        is_working_day: true  // 周六补班（调休）
      }
    ]
  }
]
```

**优先级**: 站点覆盖 > 法定节假日 > 默认周末判断

---

### 5. 产能单元 (capacityUnits) - Line × Shift 粒度

每个产能单元代表一条线的一个班次，包含：

```javascript
{
  unit_id: 'WF_L1_DAY',
  program_id: 'product_a',
  site_id: 'WF',
  line_id: 'L1',
  line_type: 'AUTO',       // AUTO / MANUAL
  shift_type: 'DAY',       // DAY / NIGHT
  base_uph: 120,           // 基准 UPH（units per hour）
  shift_hours: 10,         // 班次小时数
  ramp_start_date: '2026-10-05',  // Ramp 开始日期

  uph_ramp_curve: {
    length_workdays: 30,   // Ramp 曲线长度（工作日）
    factors: [0.50, 0.55, ..., 1.00]  // 30 个系数（第1个工作日到第30个工作日）
  },

  yield_ramp_curve: {
    length_workdays: 30,
    factors: [0.70, 0.72, ..., 0.98]  // 良率 Ramp 曲线
  }
}
```

**Seed Data 演示场景**:
- WF_L1_DAY: 10月5日开始 Ramp（30天曲线）
- WF_L1_NIGHT: 10月12日开始 Ramp（晚班比早班晚一周启动）
- VN02_L1_DAY: 10月1日开始 Ramp（20天曲线，更快）
- VN02_L1_NIGHT: 10月8日开始 Ramp

**关键**: Day 和 Night 可以有不同的 Ramp Start Date，模拟现实中"先上早班，后上晚班"的情况。

---

### 6. CTB 每日数据 (ctbDaily)
```javascript
ctbDaily: [
  // Week 1 - Oct 5-11 (充足的 CTB)
  { date: '2026-10-05', program_id: 'product_a', site_id: 'WF', ctb_qty: 3000 },

  // Week 2 - Oct 12-18 (紧张的 CTB - 会成为瓶颈！)
  { date: '2026-10-12', program_id: 'product_a', site_id: 'WF', ctb_qty: 1500 },

  // Week 3 - Oct 19-25 (恢复正常)
  { date: '2026-10-19', program_id: 'product_a', site_id: 'WF', ctb_qty: 4000 },

  // VN02 - 无 CTB 约束（充足）
  { date: '2026-10-01', program_id: 'product_a', site_id: 'VN02', ctb_qty: 10000 }
]
```

**Seed Data 演示约束切换**:
- Week 1: CTB 充足，Capacity 是瓶颈（因为刚开始 Ramp）
- Week 2: CTB 紧张（1500），成为瓶颈，限制了投入
- Week 3: CTB 恢复正常，回到 Capacity 瓶颈

---

### 7. 周需求 (weeklyDemand)
```javascript
weeklyDemand: [
  { week_id: '2026-W40', program_id: 'product_a', demand_qty: 5000 },
  { week_id: '2026-W41', program_id: 'product_a', demand_qty: 12000 },
  { week_id: '2026-W42', program_id: 'product_a', demand_qty: 15000 },
  { week_id: '2026-W43', program_id: 'product_a', demand_qty: 18000 },
  { week_id: '2026-W44', program_id: 'product_a', demand_qty: 20000 }
]
```

**Week ID 定义**: ISO Week（周一到周日），但系统使用 MON_SAT 窗口聚合。

---

## 三、计算引擎逻辑 (production_plan_engine.js)

### 架构概览

```
ProductionPlanEngine
├── CalendarSystem (日历系统)
│   ├── 法定节假日判断
│   ├── 站点覆盖判断
│   └── 工作日/休息日判断
│
├── DateUtils (日期工具)
│   ├── 日期加减
│   ├── Week ID 计算
│   └── 日期范围生成
│
└── 计算流程（6步）
    ├── Step 1: calculateUnconstrainedProduction (Line×Shift 级别)
    ├── Step 2: aggregateToSite (站点聚合)
    ├── Step 3: applyCtbConstraints (应用 CTB 约束)
    ├── Step 4: calculateShipments (+2WD 发货延迟)
    ├── Step 5: aggregateToProgram (项目级别聚合)
    └── Step 6: calculateWeeklyMetrics (周汇总)
```

---

### Step 1: calculateUnconstrainedProduction()

**目标**: 计算每个 Line×Shift 在每一天的"纯产能"（不考虑物料约束）

**输入**:
- `dates`: 日期数组 `['2026-10-05', '2026-10-06', ...]`
- `capacityUnits`: 所有产能单元配置

**逻辑**:
```javascript
for each date:
  for each unit (Line×Shift):
    1. 判断是否工作日 (calendar.isWorkingDay)
    2. 如果不是工作日 → capacity = 0
    3. 如果是工作日:
       a. 计算从 ramp_start_date 到当前日期的工作日数 (ramp_day_index)
       b. 从 uph_ramp_curve 和 yield_ramp_curve 获取当天系数
       c. capacity = base_uph × shift_hours × uph_factor × yield_factor
```

**输出** (unitResults):
```javascript
{
  'WF_L1_DAY': [
    { date: '2026-10-05', capacity: 600, uph_factor: 0.50, yield_factor: 0.70, ... },
    { date: '2026-10-06', capacity: 660, uph_factor: 0.55, yield_factor: 0.72, ... },
    ...
  ],
  'WF_L1_NIGHT': [...],
  ...
}
```

**关键点**:
- Ramp Curve 是基于**工作日索引**，不是自然日
- 如果 ramp_day_index > curve.length，则使用最后一个系数（稳态）
- 如果 date < ramp_start_date，capacity = 0（还没开始 Ramp）

---

### Step 2: aggregateToSite()

**目标**: 将同一个站点的所有 Line×Shift 聚合到站点级别

**逻辑**:
```javascript
for each date:
  for each site:
    site_capacity = sum(所有属于该站点的 unit 的 capacity)
```

**输出** (siteResults):
```javascript
{
  'WF': [
    { date: '2026-10-05', capacity: 600, ... },  // 只有 DAY 班有产能
    { date: '2026-10-06', capacity: 660, ... },
    { date: '2026-10-12', capacity: 2500, ... }, // DAY + NIGHT 都有产能了
    ...
  ],
  'VN02': [...]
}
```

---

### Step 3: applyCtbConstraints()

**目标**: 应用 CTB（物料）约��，得到真实投入 = min(Capacity, CTB)

**逻辑**:
```javascript
for each date:
  for each site:
    ctb_available = ctbDaily 中该日期该站点的 ctb_qty（没有数据则为 Infinity）
    actual_input = min(site_capacity, ctb_available)
    binding_constraint = (ctb_available < site_capacity) ? 'CTB' : 'Capacity'
```

**输出** (siteFinal):
```javascript
{
  'WF': [
    {
      date: '2026-10-05',
      capacity: 600,
      ctb_available: 3000,
      actual_input: 600,      // min(600, 3000) = 600
      binding_constraint: 'Capacity'  // Capacity 是瓶颈
    },
    {
      date: '2026-10-12',
      capacity: 2500,
      ctb_available: 1500,
      actual_input: 1500,     // min(2500, 1500) = 1500
      binding_constraint: 'CTB'  // CTB 是瓶颈！
    },
    ...
  ]
}
```

---

### Step 4: calculateShipments()

**目标**: 计算发货，考虑 Output Flow-Time 和 Shipment Lag

**Flow-Time 逻辑** (Output Factors):
```javascript
// 投入 100 units 在 Day 0，产出分配：
Day 0: 100 × 0.5 = 50 units 流出
Day 1: 100 × 1.0 = 100 units 流出（但减去 Day 0 已流出的 50，实际新增 50）
Day 2+: 0（全部已流出）

// 实际实现：每天的 output 是前3天 input 的加权和
output[date] =
  input[date] × day1_factor +
  input[date-1] × (day2_factor - day1_factor) +
  input[date-2] × (day3_plus_factor - day2_factor)
```

**Shipment Lag 逻辑**:
```javascript
shipment[date] = output[date - shipment_lag_workdays]
```

**示例** (shipment_lag_workdays = 2):
- 10月5日产出 → 10月9日发货（跳过周末10月7日）
- 10月6日产出 → 10月10日发货

**输出** (siteShipments):
```javascript
{
  'WF': [
    { date: '2026-10-05', output: 300, shipment: 0 },  // 还没有可发货的
    { date: '2026-10-09', output: 500, shipment: 300 }, // 发出10月5日的产出
    ...
  ]
}
```

---

### Step 5: aggregateToProgram()

**目标**: 将所有站点聚合到项目级别，计算累计值

**逻辑**:
```javascript
for each date:
  program_input = sum(所有站点的 actual_input)
  program_output = sum(所有站点的 output)
  program_shipment = sum(所有站点的 shipment)
  program_capacity = sum(所有站点的 capacity)
  program_ctb = sum(所有站点的 ctb_available)

  cum_input += program_input
  cum_output += program_output
  cum_shipment += program_shipment
```

**输出** (programResults):
```javascript
[
  {
    date: '2026-10-05',
    input: 700, cum_input: 700,
    output: 350, cum_output: 350,
    shipment: 0, cum_shipment: 0,
    capacity: 700, cum_capacity: 700,
    ctb_available: 13000, cum_ctb: 13000,
    demand: 1714, cum_demand: 1714  // 12000/7天 ≈ 1714/天
  },
  ...
]
```

---

### Step 6: calculateWeeklyMetrics()

**目标**: 按周聚合，生成周报告

**周定义**: MON_SAT（周一到周六），周日不计入

**逻辑**:
```javascript
for each date:
  week_id = DateUtils.getWeekId(date)

  weekly[week_id].input += daily_input
  weekly[week_id].output += daily_output
  weekly[week_id].shipment += daily_shipment
  weekly[week_id].demand = weeklyDemand 中对应的 demand_qty
```

**输出** (weeklyMetrics):
```javascript
{
  '2026-W41': {
    week_id: '2026-W41',
    input: 8000,
    output: 7500,
    shipment: 7000,
    demand: 12000,
    gap: -5000  // shipment - demand
  },
  ...
}
```

---

## 四、UI 展示逻辑（规格）

### Generate Report 页面结构

#### 1. Context Header
```
Program: Product A | Vendor: Vendor X
Start Date: 2026-10-01 | End Date: 2026-12-31
[🚀 Generate Plan]  [📊 Export Excel]
```

#### 2. "What this page shows" 说明文案
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

#### 3. Summary Strip（4个解释型数字）
```
┌─ Forecast (Cum) ─────┐  ┌─ Capacity (Cum) ─────┐
│ 95,000 units         │  │ 102,400 units        │
│ Demand target        │  │ Not limited by CTB   │
└──────────────────────┘  └──────────────────────┘

┌─ CTB (Cum) ──────────┐  ┌─ Deliverable Ship ───┐
│ 88,000 units         │  │ 84,500 units (+2 WD) │
│ Materials available  │  │ Realistic delivery   │
└──────────────────────┘  └──────────────────────┘

Primary Binding Constraint: Material (CTB)
Gap (Deliverable vs Forecast): -10,500 units (-11.1%)
```

#### 4. Granularity Toggle
```
[● Daily]  [○ Weekly]  [○ Monthly]
```

#### 5. Main Truth Table（核心）

**4 个 Column Groups**:

| Date | Demand/Supply | Capacity Track | Reality Track | Gap/Constraint |
|------|---------------|----------------|---------------|----------------|
| | Cum Forecast<br/>Cum CTB | Daily Cap<br/>Cum Cap | Daily Input<br/>Cum Input<br/>Daily Output<br/>Cum Output<br/>Daily Ship<br/>Cum Ship | Gap (Cum)<br/>Binding |
| 2026-10-05 | 1,714<br/>13,000 | 700<br/>700 | 700<br/>700<br/>350<br/>350<br/>0<br/>0 | -1,714<br/>Capacity |
| 2026-10-06 | 3,428<br/>26,000 | 660<br/>1,360 | 660<br/>1,360<br/>510<br/>860<br/>0<br/>0 | -3,428<br/>Capacity |
| 2026-10-12 | 10,000<br/>80,000 | 2,500<br/>15,000 | 1,500<br/>12,000<br/>1,200<br/>10,000<br/>350<br/>8,500 | -1,500<br/>**CTB** |

**颜色逻辑**:
- Binding = 'CTB' → 该行 CTB 列高亮黄色
- Binding = 'Capacity' → 该行 Capacity 列高亮蓝色
- Gap < 0 → Gap 数字显示红色
- 历史数据行：白色背景
- 未来预测行：浅灰色背景 `bg-slate-50`

**关键**: 不做红黄绿打分，只用颜色标识约束位置

---

## 五、当前系统支持的功能

### ✅ 已实现

1. **日历系统**
   - 法定节假日判断（中国、越南）
   - 站点覆盖（加班、调休）
   - 工作日计算（跳过周末和节假日）

2. **产能计算**
   - Line×Shift 粒度
   - UPH Ramp Curve（工作日索引）
   - Yield Ramp Curve
   - Day vs Night 不同启动日期支持

3. **CTB 约束**
   - 每日 CTB 数据
   - min(Capacity, CTB) 逻辑
   - Binding Constraint 自动判定

4. **Output Flow-Time**
   - 3-day output factors (day1, day2, day3_plus)
   - 累计产出计算

5. **Shipment Lag**
   - +2 工作日延迟
   - 跳过周末和节假日

6. **聚合**
   - Line×Shift → Site → Program
   - Daily → Weekly
   - 累计值计算

7. **Seed Data**
   - 完整的测试数据
   - 演示约束切换（Week 1: Capacity-limited, Week 2: CTB-limited）

---

### 🚧 待完善（需要您的确认）

1. **Demand 分配逻辑**
   - 当前: 周需求均分到每一天（12000/7天 = 1714/天）
   - **问题**: 周日是否计入？MON_SAT 还是 MON_SUN？
   - **建议**: 需要明确 Demand 是否只针对工作日

2. **Monthly 聚合**
   - 当前: 只有 Weekly 聚合
   - **问题**: Monthly 的定义是？自然月还是 5-4-4 财务周？
   - **建议**: 如果需要 Monthly 视图，需要补充聚合逻辑

3. **Actual vs Projection 标识**
   - 当前: 所有数据都是 Projection（因为是生成报告）
   - **问题**: 什么时候数据变成 Actual？是手动标记还是基于 Cut-off Date？
   - **建议**: 需要明确 Actual 数据的来源和更新逻辑

4. **CTB 数据填充**
   - 当前: 如果某天没有 CTB 数据，默认为 Infinity（无约束）
   - **问题**: 是否应该填充为前一天的 CTB？还是保持 Infinity？
   - **建议**: 需要明确 CTB 缺失值的处理规则

5. **Gap 计算基准**
   - 当前: Gap = Cum Ship - Cum Demand
   - **问题**: 是否应该是 Cum Ship - Cum Forecast？还是有其他定义？
   - **建议**: 需要明确 Gap 的业务定义

6. **Constraint 细粒度归因**
   - 当前: 只区分 CTB vs Capacity
   - **问题**: 是否需要更细的归因（如 "Yield drift", "Holiday capacity loss"）？
   - **建议**: 如果需要，可以在 Binding Constraint 列添加 tooltip 或 drill-down

7. **Site-Level Drill-down**
   - 当前: 只展示 Program 级别聚合
   - **问题**: 是否需要按站点展开的详细表格？
   - **建议**: 可以添加"展开/收起"功能，点击某一行展开站点明细

8. **Export Excel 功能**
   - 当前: 只有按钮，没有实现
   - **建议**: 可以用 SheetJS 或类似库导出表格

---

## 六、需要您补充的信息

### 1. Demand 分配规则
**问题**: 周需求 12,000 units，如何分配到每一天？

**选项**:
- A. 均分到 Mon-Sat（6天）：12000/6 = 2000/天
- B. 均分到 Mon-Sun（7天）：12000/7 = 1714/天
- C. 只均分到工作日（跳过节假日）
- D. 其他规则（如周一需求更高）

**当前实现**: 选项 B

---

### 2. Monthly 视图定义
**问题**: 如果用户切换到 Monthly 视图，如何定义"月"？

**选项**:
- A. 自然月（10月1日 - 10月31日）
- B. 财务周 5-4-4 模式（第1个月5周，第2个月4周，第3个月4周）
- C. 4周滚动窗口

**建议**: 先实现自然月，后续可扩展

---

### 3. Actual 数据来源
**问题**: Production Plan 中的 Actual 数据从哪里来？

**选项**:
- A. 手动标记：用户在某个日期前的数据标记为 Actual
- B. Cut-off Date：系统自动根据 Cut-off 时间判断
- C. 外部系统导入：从 MES/ERP 导入实际产量
- D. 不区分 Actual/Projection（都是计划）

**建议**: 先实现 B（基于 Cut-off Date），后续接入外部系统

---

### 4. CTB 缺失值处理
**问题**: 如果某天没有 CTB 数据，怎么办？

**选项**:
- A. 默认为 Infinity（无约束）
- B. 使用前一天的 CTB 值（Forward Fill）
- C. 使用前7天的平均值
- D. 标记为错误，要求用户补充

**当前实现**: 选项 A

---

### 5. Binding Constraint 细粒度
**问题**: 是否需要更细的约束归因？

**示例**:
- 当前: "CTB"
- 细化: "CTB shortage on 3 days (Oct 12-14)"
- 更细: "CTB: Component IC-77 delayed +2 days"

**建议**:
- Level 1 (当前): CTB / Capacity / None
- Level 2 (可扩展): 在 tooltip 或 drill-down 中显示具体原因

---

### 6. Site Drill-down
**问题**: 用户是否需要看到站点级别的明细？

**示例**:
```
2026-10-12 (Total)
  ├─ WF:   Input 1,500, Output 1,200, Ship 800
  └─ VN02: Input 500,   Output 450,   Ship 400
```

**选项**:
- A. 默认展开所有站点
- B. 默认折叠，点击展开
- C. 不展示，单独开一个 Site Breakdown 页面

**建议**: 选项 B（默认折叠，点击展开）

---

### 7. Output Factors 的业务含义
**问题**: Output Factors (0.5, 1.0, 1.0) 是否符合您的业务实际？

**当前逻辑**:
- 投入 100 units 在 Day 0
- Day 0 产出 50 units
- Day 1 产出 50 units
- Day 2+ 产出 0

**建议**: 确认这个 Flow-Time 模型是否准确，或需要调整系数

---

### 8. Shipment Lag 的计算
**问题**: +2 工作日是否包括产出当天？

**示例 1** (产出当天 = Day 0):
- 10月5日产出 → 10月5日算 Day 0 → +2WD → 10月9日发货

**示例 2** (产出当天 = Day 1):
- 10月5日产出 → 10月5日算 Day 1 → +2WD → 10月8日发货

**当前实现**: 示例 1（产出当天不计入）

---

## 七、下一步行动

### 优先级 P0（必须确认）
1. **Demand 分配规则** - 影响 Gap 计算准确性
2. **Actual vs Projection 逻辑** - 影响 UI 展示
3. **CTB 缺失值处理** - 影响计算健壮性

### 优先级 P1（建议补充）
4. **Binding Constraint 细粒度** - 提升决策价值
5. **Site Drill-down** - 提升可操作性
6. **Monthly 视图** - 提升用户体验

### 优先级 P2（可选扩展）
7. **Export Excel** - 便利功能
8. **外部数据接入** - 长期规划

---

## 八、文件清单

### 核心文件
- `production_plan_engine.js` - 计算引擎（1100+ 行）
- `production_plan_seed_data.js` - 种子数据
- `production_plan_config.js` - UI 配置层（待实现）
- `app_v2.js` - UI 渲染（renderProductionPlanGenerate 函数）

### 文档文件
- `PRODUCTION_PLAN_REFACTOR_SPEC.md` - 重构规格
- `PRODUCTION_PLAN_REFACTOR_COMPLETE.md` - 重构完成文档
- `PRODUCTION_PLAN_SYSTEM_SUMMARY.md` - 本文档

---

## 九、快速验证脚本

如果您想快速验证当前系统的计算结果，可以在浏览器 Console 中运行：

```javascript
// 1. 加载 Seed Data
const engine = new ProductionPlanEngine(PRODUCTION_PLAN_SEED_DATA);

// 2. 生成计划
const result = engine.generatePlan('2026-10-01', '2026-10-31');

// 3. 查看 Week 2 的约束情况（应该看到 CTB-limited）
console.table(result.weeklyMetrics);

// 4. 查看每日明细
console.table(result.programResults.slice(0, 20));

// 5. 查看站点级别
console.log(result.siteResults);
```

---

**请您审阅以上总结，并告知我需要补充或调整的地方！**
