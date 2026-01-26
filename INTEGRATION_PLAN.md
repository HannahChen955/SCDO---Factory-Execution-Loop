# Command Center 整合方案 v3.0

## 问题诊断
当前有两个 Command Center：
1. **Delivery Command Center** (app_v2.js line 2299) - 完整的项目周报页面
2. **v3.0 Command Center** (command_center.js) - 简化的 Unified Metric Index 页面

**核心问题**：两者都是"信息呈现"，缺少"决策驱动闭环"

## 整合策略

### P0：核心决策闭环组件（立刻让它变可用）

#### 1. Decision Inbox (替代现有的 Scenario Focus)
```
┌─ Decision Inbox ────────────────────────────────────┐
│ ⏰ Needs Action in 48h (3)    📅 Review in 7d (2)  │
│                                                      │
│ 🚨 [HIGH] Output 92% of Target                     │
│    Owner: Production Manager · SLA: 24h remaining  │
│    Impact: 11.6k units gap, affects W04 commit     │
│    [View Chain →] [Take Action]                    │
│                                                      │
│ ⚠️  [MED] Yield drop to 94.2%                       │
│    Owner: Quality Manager · SLA: 36h remaining     │
│    Impact: Component Lot #X2401 issue              │
│    [View Chain →] [Take Action]                    │
└─────────────────────────────────────────────────────┘
```

**数据结构**：
```javascript
decisionCard = {
  card_id: "R002_1737644400",
  rule_id: "R002_OUTPUT_LOW",
  priority: "high",
  metric_id: "mps_attainment",

  // 决策信息
  decision_owner: "Production Manager",
  sla_hours: 24,
  sla_remaining_hours: 18,
  status: "open", // open | in_progress | closed

  // 影响说明
  title: "Output 92% of Target",
  impact_statement: "11.6k units gap, affects W04 commit",
  root_cause: "Yield drop at Test station...",

  // 可执行动作
  suggested_actions: [
    {
      action_id: "add_weekend_shift",
      label: "Add weekend shift for Test station",
      estimated_impact: "+2.8k units",
      requires_approval: "Production Director",
      status: "pending" // pending | approved | rejected | completed
    }
  ],

  // 置信度
  confidence: {
    level: "HIGH",
    details: { age_hours: 2, coverage_pct: 98, reconciliation_status: "matched" }
  },

  // 链路追踪
  decision_chain: ["mps_attainment", "yield", "capacity"],
  evidence_links: [
    { type: "metric", id: "yield", anchor: "#yield-detail" },
    { type: "root_cause", id: "component_lot_x2401", anchor: "#quality-analysis" }
  ]
}
```

#### 2. Decision Chain Widget (可点击钻取)
```
┌─ Decision Chain: Why Output is Red? ───────────────┐
│                                                     │
│  [Plan] → [CTB] → [Input] → [Output] → [Ship+2WD] │
│    ✅      ✅      🟡         🔴         🟡          │
│   150k    98%     97%       92%        95.5%       │
│                              ↑                      │
│                         Click to drill down         │
│                                                     │
│  🔴 Output constrained by:                          │
│    • Yield: 94.2% (target 97.5%) - PRIMARY         │
│    • Test capacity: 87% utilization - SECONDARY    │
│    • Re-test queue: 2.8k units - BOTTLENECK        │
└─────────────────────────────────────────────────────┘
```

**交互逻辑**：
- 点击任一节点 → 展开该节点的详细数据
- 自动高亮当前约束路径
- 显示节点间的因果关系

#### 3. Action Cards (结构化，不是段落)
```
┌─ Suggested Actions ─────────────────────────────────┐
│                                                      │
│ ✅ Action 1: Add weekend shift for Test station     │
│    Owner: Production Manager                        │
│    SLA: Complete by Jan 25, 8:00 AM                 │
│    Expected Impact: +2.8k units, closes 24% of gap  │
│    Requires Approval: Production Director ✓         │
│    Status: [Approved] [Start Execution →]           │
│                                                      │
│ 📋 Action 2: Analyze top 3 failure codes            │
│    Owner: Quality Manager                           │
│    SLA: Report due Jan 24, 6:00 PM                  │
│    Expected Impact: Root cause identified           │
│    Evidence: Component Lot #X2401 quarantined       │
│    Status: [In Progress - 60%]                      │
│                                                      │
│ ⏸️  Action 3: Increase re-test capacity by 20%      │
│    Owner: Equipment Engineering                     │
│    SLA: Plan ready Jan 26                           │
│    Expected Impact: Reduce queue from 2.8k to 1k    │
│    Blocked by: Equipment availability check         │
│    Status: [Pending Input]                          │
└─────────────────────────────────────────────────────┘
```

### P1：避免 KPI 化

#### 4. Confidence Badges (全站统一)
```
Every metric display includes:

┌────────────────────────────┐
│ Output: 138.4k units       │
│ 🟢 High Confidence         │
│ ├─ Data age: 2h           │
│ ├─ Coverage: 98%          │
│ └─ Reconciliation: ✓      │
└────────────────────────────┘

When confidence is LOW:
┌────────────────────────────┐
│ CTB Availability           │
│ 🔴 Low Confidence          │
│ ⚠️  Do not use for routing │
│ └─ Action: Validate data   │
└────────────────────────────┘
```

#### 5. Executive Scorecard (Overview 页顶部)
```
┌─ Executive Scorecard ───────────────────────────────┐
│ Metric              Value  vs Target  Confidence   Conclusion                │
│ ─────────────────────────────────────────────────────────────────────────── │
│ Plan Achievement    92%    🔴 -8%     🟢 High      Output gap 11.6k units    │
│ Commit Fulfillment  95.5%  🟡 -4.5%   🟢 High      Shipment bottleneck       │
│ Cost Risk           $45k   🟡 +12%    🟡 Medium    Overtime + rework costs   │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### 6. Metric Standardization Table (Overview 页底部)
```
┌─ Unified Metric Index: 8 Core Metrics ──────────────────────────────────────┐
│ ID               Plain Language          Grain   Source      Refresh  Conf  │
│ ──────────────────────────────────────────────────────────────────────────  │
│ mps_attainment   本周实际产出 vs 主计划    Weekly  MES/ERP     6h      HIGH  │
│ service_level    订单按时交付比率         Weekly  OMS/Ship    12h     HIGH  │
│ cost_risk        额外成本占基准预算比例    Weekly  Finance     24h     MED   │
│ ctb              物料可用天数             Daily   CTB/Planner  6h     HIGH  │
│ capacity         产能利用率               Daily   MES         6h      HIGH  │
│ yield            良率 (FPY)              Daily   MES/QMS     6h      HIGH  │
│ shipment_ready   可发货库存天数           Daily   WMS         8h      HIGH  │
│ data_freshness   关键表最后更新时间        Real-time  ETL     0h      HIGH  │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 文件修改清单

### 新增文件
1. `decision_inbox.js` - Decision Inbox 逻辑 + UI
2. `decision_chain_widget.js` - 可点击的链路组件
3. `action_cards.js` - 结构化行动卡片

### 修改文件
1. **app_v2.js**
   - 删除 `case "command-center"` (line 332-334)
   - 保留 `renderDeliveryCommandCenter()` 但大幅改造

2. **index_v2.html**
   - 移除 🎯 Command Center 菜单项（保留 Delivery Command Center）
   - 添加新脚本引用

3. **command_center.js**
   - 废弃整个文件，功能整合到 app_v2.js

## 实施步骤

### Step 1: 创建 Decision Inbox 组件
- 从 routing_engine 生成的 decisionCards 渲染
- 48h/7d 分栏
- 可点击展开详情

### Step 2: 改造 Delivery Command Center
- 顶部：Decision Inbox (替代 Scenario Focus)
- 中部：Decision Chain Widget + Product Snapshot
- 底部：Weekly Summary (增加 Confidence badges)

### Step 3: 连接数据流
```
Production Plan Engine
  ↓ calculateMetricsFromPlan()
Metrics Snapshot (8 metrics)
  ↓ calculateBatchConfidence()
Confidence Results
  ↓ evaluateRoutingRules()
Decision Cards
  ↓ renderDecisionInbox()
UI Display
```

### Step 4: 测试闭环
- 生成计划 → 触发路由 → 生成决策卡 → 用户采取行动 → 回写状态

## 关键设计原则

1. **颜色不是评分，是路由**：红黄必带 Owner/SLA/Actions
2. **低置信度不许红黄**：只许"Validate Data"
3. **决策必须结构化**：不能是段落文字
4. **链路必须可追溯**：每个决策可回溯到证据
5. **行动必须可闭环**：状态从 Open → In Progress → Closed

## 演示场景

**场景**：Production Manager 周一早上打开 Command Center

1. 看到 Decision Inbox：3 个 48h 必做的决策
2. 点击第一个"Output 92%"卡片
3. 展开 Decision Chain，看到是 Yield 拖累了 Output
4. 查看 3 个 Suggested Actions，选择"Add weekend shift"
5. 点击"Request Approval"，系统发送给 Production Director
6. Director 在手机上批准
7. Manager 点击"Mark as In Progress"
8. 周二复盘时，系统显示这个决策的最新状态

**这才是闭环决策系统，不是 KPI Dashboard。**
