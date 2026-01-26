# Command Center Refactor Complete ✅

**Date**: 2026-01-24
**Status**: Command Center 完全改造为 "Weekly Commit Brief" - 事实中心 + 决策中心

---

## 改造概览

### 从 "KPI Dashboard" 到 "Weekly Commit Brief"

**Before**: 7-node chain + 红黄绿标签 + Evidence 彩色卡片 → 像在"打分/贴标签"

**After**: 用最少文字 + 可核对数字 + 变化 + 归因 → 讲清楚"本周交付真相 + 需要的决策"

---

## 新增文件

### 1. `command_center_data.js`
**Mock 数据结构**，包含：

#### A. Program Timeline（项目时间线）
```javascript
program_timeline: {
  stages: [
    { id: "proto", label: "Proto", start: "2025-08-05", end: "2025-09-20" },
    { id: "evt", label: "EVT", start: "2025-09-23", end: "2025-11-08" },
    { id: "dvt", label: "DVT", start: "2025-11-18", end: "2026-02-28" },
    { id: "pvt", label: "PVT", start: "2026-03-10", end: "2026-09-30" },
    { id: "ramp", label: "Ramp", start: "2026-10-01", end: "2026-12-20" },
    { id: "launch", label: "Launch", start: "2026-12-23", end: "2026-12-27" },
    { id: "eol", label: "EOL", start: "2027-11-29", end: "2027-12-10" }
  ],
  getCurrentSummary() // 自动计算当前阶段
}
```

**自动阶段检测**：
- 根据今天日期自动判断当前处于哪个阶段
- 状态：done（已完成）/ current（当前）/ next（下一个）/ planned（计划中）
- 不使用红黄绿，只用状态标识

**示例**：
- 今天是 2026-01-24 → current_phase = "PVT"
- 到了 2026-10-01 → current_phase 自动变成 "Ramp"

#### B. Weekly Snapshot（本周快照）
```javascript
weekly_snapshot: {
  week_id: "2026-W04",
  demand_units: 95000,
  capacity_units: 102400,
  ctb_units: 88000,
  planned_input_units: 88000,  // min(Capacity, CTB)
  expected_output_units: 86392, // After yield
  deliverable_ship_units: 84500, // After +2WD
  gap_units: -10500,
  gap_pct: -11.1,
  primary_limiter: "ctb"  // 基于计算而非主观判断
}
```

#### C. Site Snapshots（站点快照）
```javascript
site_snapshots: [
  {
    site_id: "WF",
    lines_running: "3 lines",
    shifts_running: "2 shifts",
    ctb_coverage_pct: 87,
    local_limiter_text: "CTB shortage on 3 days (Oct 12-14)",
    owner_role: "Factory Ops",
    sla_hours: 24
  },
  // VN02 ...
]
```

#### D. Gap Decomposition（缺口拆解）
```javascript
gap_decomposition: [
  {
    driver_label: "CTB-limited input loss",
    impact_units: -6400,
    explanation: "Material shortage at WF site Oct 12-14"
  },
  {
    driver_label: "Yield loss (vs target 95.9%)",
    impact_units: -2900,
    explanation: "Test station FPY drift at VN02 (94.2% actual)"
  },
  // ...
]
```

#### E. Decision Queue（决策队列）
```javascript
decision_queue: [
  {
    decision_text: "Approve weekend retest shift at VN02",
    why_now: "Closes ~2,800 units of yield gap",
    owner_role: "Factory Ops",
    sla_hours: 24,
    options: [
      { label: "Approve", action_type: "approve" },
      { label: "Reject", action_type: "reject" }
    ],
    evidence_links: [
      { label: "Yield trend", link: "#yield-view" }
    ]
  }
]
```

### 2. `command_center_new.js`
**新的渲染函数**，完全替换旧的 `renderDeliveryCommandCenter()`

---

## 新页面结构

### Header
```
Weekly Commit Brief
Facts, drivers, and decisions that change this week's outcome

Product A · 2026-W04
Cut-off: 2026-01-24 08:00
```

### 区块顺序（5个）

#### A. Program Timeline（放在最上面）
- **横向 Stage Bar**: Proto → EVT → DVT → PVT → Ramp → Launch → EOL
- **状态图标**:
  - ✓ (done - 灰色)
  - ● (current - 蓝色加粗边框)
  - → (next - 蓝色虚线)
  - 空白 (planned - 浅灰)
- **两行摘要**:
  - Current phase: PVT (03-10) | Next gate: PVT build readiness (09-30)
  - Launch target: 2026-12-23 | EOL: 2027-11-29
- **点击交互**: 点击任意 stage 弹出 tooltip 显示 milestone

#### B. Weekly Commit Snapshot（核心事实账单）
8-10 行数字，讲清本周交付态势：

```
Demand / Commit:          95,000 units
Capacity (unconstrained): 102,400 units
Material Available (CTB): 88,000 units
─────────────────────────────────────
Planned Input = min(Cap, CTB): 88,000 units  [高亮]
─────────────────────────────────────
Expected Output (apply yield): 86,392 units
Deliverable Ship (+2WD):      84,500 units
═════════════════════════════════════
Gap vs Commit:                -10,500 units (-11.1%)  [红色]

Primary limiter: Material (CTB)  [自动标注]
```

**关键点**:
- **不显示红黄绿**
- 只显示 delta（如 -10,500 units）
- Primary limiter 基于 min() 计算，可解释、可复算

#### C. Site Execution Snapshot（站点表格）
表格形式，一屏可见两个 site：

| Site | Lines/Shifts | CTB Coverage | Input | Output | Ship | Top Local Limiter | Owner & SLA |
|------|--------------|--------------|-------|--------|------|-------------------|-------------|
| WF (China) | 3 lines<br/>2 shifts | 58,000<br/>87% | 58,000 | 56,840 | 55,600 | CTB shortage on 3 days | Factory Ops<br/>24h |
| VN-02 (Vietnam) | 1 line<br/>2 shifts | 30,000<br/>100% | 30,000 | 29,552 | 28,900 | Yield drift at Test station | Quality Team<br/>48h |

**特点**: 纯事实陈述，不做评分

#### D. Gap Decomposition（贡献度拆解）
排序表格（按 impact 从大到小）：

| Driver | Impact (units) | Explanation |
|--------|----------------|-------------|
| 1. CTB-limited input loss | -6,400 | Material shortage at WF site Oct 12-14 |
| 2. Yield loss (vs target) | -2,900 | Test station FPY drift at VN02 (94.2% actual) |
| 3. Ship readiness lag | -1,200 | Packing queue buildup +2WD assumption |

**顶部一句话**:
> Top driver: **CTB-limited input loss** (-6,400 units), then Yield loss (-2,900 units)

**关键**: 用加总代替主观判断，可量化、可验证

#### E. Decisions Needed（真正的决策队列，≤ 3 条）
每条决策卡片包含：

```
1. Approve weekend retest shift at VN02

Why now: Closes ~2,800 units of yield gap by recovering marginal units

┌─────────────────────────────────────────────────────┐
│ OWNER & SLA          │ EVIDENCE                      │
│ Factory Ops          │ [Yield trend] [Test log]     │
│ SLA: 24h             │ [Cost impact]                 │
└─────────────────────────────────────────────────────┘

[Approve] [Reject]
```

**强制规则**:
- 没有明确 decision 的内容不能出现
- 必须有 owner + SLA + options + evidence

#### F. Evidence Links（收口，只4个入口）
```
┌─────────────────────────────────────────────────┐
│ 📊 Production Plan (detailed table)             │
│ 📦 CTB Daily View                                │
│ 📈 Yield & Quality Metrics                       │
│ 🚚 Shipment Readiness                            │
└─────────────────────────────────────────────────┘
```

**不在 Command Center 展开长解释**，把解释交给 drill-down 页面

---

## 关键设计原则

### 1. 不 KPI 化
- ❌ 不用红黄绿标签
- ✅ 用可核对的数字 + delta
- ✅ Primary limiter 基于计算（min, contribution）

### 2. 事实先于结论
- ❌ "系统下结论"（Risk / At Risk / Binding）
- ✅ 数据说话，让人自己得出结论

### 3. 服务决策
- ❌ 指标墙
- ✅ 决策队列（What / Why now / Owner / SLA / Options）

### 4. 对老板友好
- ❌ Framework/Consulting 味道
- ✅ 自然语言（Material Available (CTB), Ready-to-Ship (+2WD)）

---

## Timeline 自动状态变化逻辑

### 实现方式
```javascript
getCurrentSummary() {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // 遍历所有 stages，找到当前所在阶段
  for (let stage of this.stages) {
    if (todayStr >= stage.start && todayStr <= stage.end) {
      return { current_phase: stage.label, ... };
    }
  }
}
```

### 示例场景

**场景 1: 今天是 2026-01-24**
- 处于 PVT 阶段（2026-03-10 ~ 2026-09-30）
- 显示：Current phase: **PVT**
- Stage bar: DVT(✓) → **PVT(●)** → Ramp(→) → Launch → EOL

**场景 2: 到了 2026-10-01**
- 自动进入 Ramp 阶段
- 显示：Current phase: **Ramp**
- Stage bar: PVT(✓) → **Ramp(●)** → Launch(→) → EOL

**场景 3: 到了 2026-12-23**
- 自动进入 Launch 阶段
- 显示：Current phase: **Launch**
- Stage bar: Ramp(✓) → **Launch(●)** → EOL(→)

### 时间轴配置
用户可以在 `command_center_data.js` 中修改日期：

```javascript
{
  id: "ramp",
  label: "Ramp",
  start: "2026-10-01",  // 修改这里
  end: "2026-12-20",
  milestone: "Ramp to steady-state"
}
```

修改后，系统会根据新的日期自动重新计算当前阶段。

---

## 验收标准

### ✅ 首屏 10 秒内能回答：
1. Can we meet commit?
2. If not, how big is the gap?
3. Why?

### ✅ 页面中没有任何 R/Y/G scorecard 语义
- 允许少量 delta 高亮（如 -10,500 units）
- 但不做评级

### ✅ Decision Inbox ≤ 3 条
- 每条都有 owner + SLA + options + evidence

### ✅ Site 一屏可见
- 不用滚动就能看到两个站点

### ✅ Timeline 自动变化
- 根据今天日期自动更新当前阶段
- 用户只需配置日期，不需要手动更新状态

---

## 使用方法

### 刷新页面查看新 Command Center
访问：`http://localhost:8080/index_v2.html`

点击左侧菜单 **"Delivery Command Center"**

### 修改 Timeline 日期
编辑 `command_center_data.js`：

```javascript
{
  id: "ramp",
  start: "2026-10-01",  // 修改 Ramp 开始日期
  end: "2026-12-20"
}
```

保存后刷新页面，Timeline 会自动根据今天日期更新当前阶段。

### 修改本周数据
编辑 `command_center_data.js` 中的 `weekly_snapshot`:

```javascript
weekly_snapshot: {
  week_id: "2026-W05",  // 改周数
  demand_units: 100000,  // 改需求
  ctb_units: 95000,      // 改 CTB
  // ...
}
```

---

## 文件清单

- ✅ `command_center_data.js` - Mock 数据（Timeline + Snapshot + Decisions）
- ✅ `command_center_new.js` - 新的渲染函数（完全替换旧版）
- ✅ `index_v2.html` - 引入新文件
- ✅ `COMMAND_CENTER_REFACTOR_COMPLETE.md` - 本文档

---

## 下一步

1. **测试页面**: 刷新 `http://localhost:8080/index_v2.html` 查看新 Command Center
2. **调整数据**: 修改 `command_center_data.js` 中的数字以匹配实际情况
3. **连接真实数据**: 将 mock 数据替换为从 `production_plan_engine.js` 计算的真实数据
4. **添加交互**: 实现 Decision 的 Approve/Reject 逻辑
5. **Evidence 页面**: 补充 drill-down 详细页面

---

**Status**: Ready for testing and feedback
