# Production Capacity Planning Rules & Decision Logic
**版本**: v0.3
**创建日期**: 2026-01-28
**最后更新**: 2026-01-29
**状态**: 完整版 - 包含 Output Logic 和所有确认规则

---

## 📋 文档目的

本文档记录了生产计划中的**决策规则和逻辑**，用于指导系统在面对需求波动、产能不足、CTB 短缺等情况时，能够像有经验的计划员一样做出合理的调整建议。

**核心理念**：
- ✅ 保持生产线**稳定性**优先（避免频繁加人/减人）
- ✅ 以**周/月**为单位调整产能（不是以天为单位）
- ✅ 严格按照 Forecast 生产，库存/缺货需与 Planning 协商
- ✅ 优先使用**低成本、快速响应**的调整方式（OT > 增站点 > 新线）

---

## 📊 Output Logic & Metrics Calculation

### 核心数据流

生产计划系统的核心数据流遵循以下逻辑：

```
Input (投入) → Output (产出) → Shipment (发货)
```

#### **1. Input (投入)**
- **定义**: 投入生产线的原材料/半成品数量
- **特点**:
  - 受 CTB (Clear-to-Build) 约束限制
  - 可以提前投入（建立在制品库存 WIP）
  - 累计值 = Cumulative Input

#### **2. Output (产出)**
- **定义**: 从生产线完成的成品数量
- **计算逻辑**:
  ```
  Output = Input × Yield × Ramp Factor

  其中：
  - Yield: 良率（通常 90-95%）
  - Ramp Factor: 爬坡系数（新线从 0% → 100%）
  ```
- **延迟效应**:
  - Output 滞后于 Input（取决于生产周期 Cycle Time）
  - 例: Day 1 投入 1000 件 → Day 3 产出 900 件（假设 Yield 90%，Cycle Time 3 天）
- **累计值**: Cumulative Output

#### **3. Shipment (发货)**
- **定义**: 实际发给客户的成品数量
- **约束条件**:
  ```
  Shipment ≤ Cumulative Output - Cumulative Shipment (可用库存)
  Shipment ≤ Demand (不超发)
  ```
- **发货策略**:
  - **优先满足需求**: 如果有足够 Output，按 Demand 发货
  - **延迟发货**: 如果 Output 不足，缺口累积到后续周
  - **零库存原则**: 不主动建立成品库存（Finished Goods Inventory）
- **累计值**: Cumulative Shipment

---

### 计划模式 (Planning Modes)

系统支持三种规划模式：

#### **1. Unconstrained Mode (纯产能模式)**
```
假设：
- CTB 无限供应
- 仅考虑产能约束（Line × Shift × UPH × Yield）
- 目标：评估"最大产能"

用途：
- 了解理论最大产能
- 识别产能瓶颈（非物料瓶颈）
```

#### **2. Constrained Mode (CTB 约束模式)**
```
假设：
- CTB 有限（按实际供应量）
- Input ≤ CTB Availability
- Output 受 CTB 影响

用途：
- 真实生产计划
- 评估物料短缺影响
```

#### **3. Combined Mode (对比模式)**
```
并排显示：
- Unconstrained 结果 (左侧)
- Constrained 结果 (右侧)

用途：
- 量化 CTB 限制的影响
- 识别物料短缺造成的产能浪费
- 支持供应链决策（是否紧急采购）
```

---

### 核心指标定义

#### **Daily Metrics (每日指标)**
| 指标 | 说明 | 计算逻辑 |
|------|------|---------|
| Date | 生产日期 | YYYY-MM-DD |
| Input | 当日投入量 | MIN(CTB, Capacity) |
| Output | 当日产出量 | Input × Yield × Ramp Factor |
| Shipment | 当日发货量 | MIN(Available Inventory, Demand) |
| Cum Input | 累计投入 | ∑ Input (从计划开始日) |
| Cum Output | 累计产出 | ∑ Output (从计划开始日) |
| Cum Shipment | 累计发货 | ∑ Shipment (从计划开始日) |

#### **Weekly Metrics (周度指标)**
| 指标 | 说明 | 计算逻辑 | 颜色标识 |
|------|------|---------|---------|
| Week | 周标识 | YYYY-W## (ISO Week) | - |
| Input | 周投入量 | ∑ Daily Input (本周) | - |
| Output | 周产出量 | ∑ Daily Output (本周) | - |
| Shipment | 周发货量 | ∑ Daily Shipment (本周) | - |
| Demand | 周需求 | 来自 Forecast | - |
| **Gap** | **缺口** | **Shipment - Demand** | 🟢 ≥0 / 🔴 <0 |
| **Attainment %** | **达成率** | **(Shipment / Demand) × 100%** | 🟢≥100% / 🟠≥90% / 🔴<90% |

**Gap 和 Attainment 的业务含义**:
```
Gap ≥ 0 (绿色):
  → 本周产出满足需求
  → 可能有少量库存（如果 Shipment > Demand）

Gap < 0 (红色):
  → 本周产出低于需求
  → 需要评估：
    1. 能否在后续周补回？（看 Cumulative Gap）
    2. 是否需要加 OT 或其他措施？
    3. 是否需要修改 Forecast？

Attainment %:
  ≥ 100% (绿色): 完全满足需求
  90-99% (橙色): 轻微缺货，可能可接受
  < 90% (红色): 严重缺货，需要升级
```

---

### 数据结构示例

#### **Daily Results 数据结构**
```javascript
{
  date: '2026-10-01',
  input_final: 1200,        // 当日投入 (受 CTB 约束)
  output_final: 840,        // 当日产出 (Input × 70% Yield，新线爬坡中)
  shipment_final: 0,        // 当日发货 (客户需求从下周开始)
  cum_input: 1200,          // 累计投入
  cum_output: 840,          // 累计产出
  cum_shipment: 0           // 累计发货
}
```

#### **Weekly Metrics 数据结构**
```javascript
{
  week_id: '2026-W40',       // ISO Week 标识
  input: 5400,               // 周投入 (6 天 × 900/天)
  output: 3780,              // 周产出 (5400 × 70%)
  shipments: 3200,           // 周发货 (受 Output 和 Demand 双重约束)
  demand: 5000,              // 周需求 (来自 Forecast)
  gap: -1800,                // 缺口 (3200 - 5000)
  attainment: 64.0           // 达成率 (3200 / 5000 × 100%)
}
```

#### **Site-Level Breakdown**
```javascript
siteResults: {
  'WF': [
    { date: '2026-10-01', input_final: 800, output_final: 560, shipment_final: 0 },
    // ...
  ],
  'VN02': [
    { date: '2026-10-01', input_final: 400, output_final: 280, shipment_final: 0 },
    // ...
  ]
}
```

---

### Output Logic 关键规则总结

#### **规则 1: Input 受 CTB 约束**
```
IF (CTB Availability < Capacity) THEN:
  Input = CTB Availability
  标记为 "CTB Constrained"
ELSE:
  Input = Capacity
END IF
```

#### **规则 2: Output 受 Yield 和 Ramp 影响**
```
Output = Input × Yield × Ramp Factor

其中：
- Yield: 良率（固定值或学习曲线）
- Ramp Factor:
  - Day 1: 0%
  - Day 30 (Standard Ramp): 100%
  - Day 20 (Fast Ramp): 100%
  - Day 15 (Aggressive Ramp): 100%
```

#### **规则 3: Shipment 优先满足 Demand**
```
Available_Inventory = Cum_Output - Cum_Shipment

Daily_Shipment = MIN(
  Available_Inventory,
  Daily_Demand
)

IF (Daily_Shipment < Daily_Demand) THEN:
  Shortage = Daily_Demand - Daily_Shipment
  累积到 Cumulative Shortage
END IF
```

#### **规则 4: Gap 严重程度判断**
```
计算 Cumulative Gap = Cum_Shipment - Cum_Demand

IF (Cumulative Gap < 0 AND 未来 4 周无法补回) THEN:
  风险等级 = HIGH
  建议行动 = 加 OT / 启动新线 / 修改 Forecast
ELSE IF (Cumulative Gap < 0 BUT 未来 4 周可补回) THEN:
  风险等级 = MEDIUM
  建议行动 = 短期加 OT，协商交付时间
ELSE:
  风险等级 = LOW
END IF
```

---

## 🏭 产能规划基础概念

### 1. 产能设计原则

**Peak Volume 设计法**：
- 产能设计基于 **Peak Volume**（高峰需求），而非平均需求
- Peak Volume 通常是 **2-3 个月持续的高峰需求**（不是单周峰值）
- 正常情况下，设计产能应能覆盖 Peak Volume，无需额外措施

**Baseline 产能配置**：
```
标准配置：
- 每班（Shift）：10 小时/天
- 工作天数：6 天/周（周日休息）
- 法定假日：不安排生产（3倍工资成本过高）
- 班次：Day + Night（双班制）
```

**这是系统的"基准线"（Baseline）**：
- 用于对比实际需求 vs 标准产能
- 如果 Weekly Demand > Baseline Capacity → 需要采取措施
- 如果 Weekly Demand < Baseline Capacity → 考虑减产

---

## 🔼 需求增长应对策略

### 决策层次（按优先级排序）

#### **Tier 1: 加班（Overtime - OT）** ⭐ 优先级最高
**适用场景**：需求超出设计产能 ≤ 15%

**OT 方式 1：隔周周日加班**
- **实现方式**：每两周加 1 个周日
- **产能提升**：+8.3%（0.5 天 / 6 天）
- **合规性**：符合 CSR 要求（员工 14 天内仍有 1 天休息）
- **成本**：1.5x 工资
- **实施周期**：立即（1 周内）

**OT 方式 2：法定假日加班**
- **实现方式**：在缺货期间的法定假日安排生产
- **产能提升**：视具体假日数量而定
- **成本**：3x 工资（高成本，谨慎使用）
- **实施周期**：立即
- **决策条件**：
  - ✅ Gap 期间内有法定假日
  - ✅ 加班能够有效覆盖缺口
  - ⚠️ 需要高层批准（成本敏感）

**重要说明**：
- 法定假日分布不均（有的月份多，有的月份少）
- 需要根据**具体项目的 Holiday Calendar** 计算
- 系统可以根据实际假日日期自动计算提升量

**计算公式**：
```
周日 OT 产能提升 = Baseline Capacity × 8.3%

法定假日 OT 产能提升（动态计算）：
  Step 1: 识别 Gap 期间内的法定假日数量
  Step 2: 计算每个假日的产能贡献
  Step 3: 法定假日 OT 产能 = (假日天数 / 当月工作日) × Baseline Capacity

示例：
  如果 Oct Week 2 有 Gap，且 Oct 1-7 是国庆假期（7 天）
  则 Oct Week 2 可用假日 OT = 7 天产能
  提升 = (7 / 6) × Weekly Baseline ≈ +116% (一周的产能)
```

**约束条件**：
- ❌ 不能连续 7 天工作（CSR 要求）
- ❌ 最多支持 +15% 产能提升
- ✅ 需求波动 > 15% → 必须考虑其他方案

---

#### **Tier 2: 增加瓶颈站点（Bottleneck Station Expansion）**
**适用场景**：需求超出设计产能 10-20%，且持续时间较长（> 1 个月）

**核心思路**：
- 不增加整条线，只增加 **瓶颈工站（Bottleneck Stations）** 的产能
- 利用现有生产线的空余空间（Space）
- 提升整体线体 UPH 10-20%

**实施条件**：
- ✅ 现有生产线有足够物理空间
- ✅ 瓶颈工站明确（已完成线平衡分析）
- ✅ 增加工站后不会产生新的瓶颈

**优点**：
- ✅ 成本低于新增整条线
- ✅ 实施周期短于新线（约 3-4 周 vs 2 个月）
- ✅ 灵活调整，不造成长期产能过剩

**缺点**：
- ❌ 产能提升有限（通常 10-20%）
- ❌ 需要工程团队评估可行性

**决策逻辑**：
```
IF (Demand Gap > 15% AND Gap Duration > 4 weeks) THEN:
  1. 评估瓶颈工站
  2. 检查生产线空间
  3. 计算新增工站的 UPH 提升
  4. 估算成本和实施周期
  5. 如果 Cost-Effective → 执行
```

---

#### **Tier 3: 加速爬坡曲线（Accelerate Ramp-Up Curve）**
**适用场景**：有新线正在爬坡中（尚未达到 Target UPH）

**实施方式**：
- 压缩爬坡时间（Standard 30 天 → Fast 20 天 → Aggressive 15 天）
- 增加培训资源、工程支持
- 提前达到 Target UPH

**重要说明**：
- ✅ **系统不做建议**：加速爬坡需要跨团队 Align（工程、质量、培训）
- ✅ **用户预设曲线**：如果团队已批准加速方案，用户会提前将 Fast/Aggressive Curve 预设到系统中
- ✅ **批准前置**：批准过程发生在数据输入系统**之前**，而非系统运行时

**系统职责**：
```
系统只负责：
  1. 识别哪些线体在爬坡中
  2. 使用用户预设的 Curve（Standard / Fast / Aggressive）
  3. 计算该 Curve 下的产能输出

系统不负责：
  - ❌ 建议是否加速爬坡
  - ❌ 评估加速风险
  - ❌ 推荐 Curve 类型
```

**决策逻辑**：
```
IF (用户已预设 Fast Ramp Curve) THEN:
  系统使用 Fast Curve 计算产能
ELSE:
  系统使用 Standard Curve 计算产能
```

---

#### **Tier 4: 启动备用线体（Activate Backup Line）** ⭐ 最后手段
**适用场景**：长期需求增长 > 20%，持续时间 > 2 个月

**实施方式**：
- 新增一条完整生产线（Day + Night Shifts）
- 按照 Ramp-Up Curve 爬坡（标准 30 天）

**约束条件**：
- ⏰ 实施周期：2 个月（从规划到投产）
- 💰 成本：最高（设备、人员、场地）
- 📈 长期承诺：一旦启动，不能轻易停线

**决策逻辑**：
```
IF (Demand Gap > 20% AND Gap Duration > 8 weeks) THEN:
  评估新增生产线
  计算投资回报率（ROI）
  制定详细的 Ramp-Up 计划
```

---

## 🔽 需求下降应对策略

### 决策层次（按优先级排序）

#### **Tier 1: 减少加班（Reduce Overtime）**
**适用场景**：当前有 OT 安排，需求下降 < 10%

**实施方式**：
- 取消周日加班
- 取消法定假日加班

**实施周期**：立即（1 周内）

---

#### **Tier 2: 减少班次（Reduce Shifts）** ⭐ 核心策略
**适用场景**：需求持续下降 > 10%

**停线原则**：
- ✅ **一条线一条线地停**（逐线停产）
- ✅ 优先停 **Night Shift**（保留 Day Shift）
- ✅ 保持剩余线体的 **Day + Night 完整配置**
- ❌ **不允许**：先停所有线的 Night Shift（会导致所有线只剩 Day Shift）

**示例逻辑**：
```
假设：3 条线，每条线 Day + Night
需求下降 20% → 需要减少约 1.2 条线的产能

Step 1: 停 Line 3 的 Night Shift（-8.3%）
Step 2: 停 Line 3 的 Day Shift（-16.6%）
Step 3: 如果还需要，停 Line 2 的 Night Shift

✅ 正确结果：Line 1 (Day+Night), Line 2 (Day+Night), Line 3 (停产)
❌ 错误做法：Line 1 (Day only), Line 2 (Day only), Line 3 (Day only)
```

**原因**：
- 保持线体完整性，便于快速恢复生产
- 避免单班生产效率低下
- 减少人员管理复杂度

---

#### **Tier 3: 推迟新线启动（Delay New Line Start）**
**适用场景**：有计划中的新线，但需求下降

**实施方式**：
- 推迟新线 Kick-off 时间
- 重新评估需求趋势
- 节省前期投资成本

---

#### **Tier 4: 临时停线（Temporary Line Shutdown）**
**适用场景**：需求大幅下降 > 30%，持续时间 > 1 个月

**停线后果**：
- ⚠️ 人员需要遣散（Layoff）
- ⚠️ 重启需要 **1 个月**（重新招聘 + 培训）
- ⚠️ 需要高层批准

**决策条件**：
- 需求下降确认为长期趋势
- 其他减产措施不足以应对
- 已与 Planning 团队确认 Forecast 修正

---

#### **Tier 5: 降低 UPH（Reduce UPH）** ⚠️ 极少使用
**适用场景**：极端情况 - 连 1 条线都无法维持满产

**实施方式**：
- 降低生产线速度
- 减少每小时产出

**约束**：
- ❌ 通常不采用（效率低下）
- ✅ 仅在无法停线的情况下考虑（如合同义务）

---

## ⚖️ 库存与缺货管理原则

### 核心理念：**零库存 + 与 Planning 协商**

#### **库存（Inventory）**
```
❌ 不主动规划库存
✅ 严格按照 Forecast 生产
```

**如果需要超产（Build Inventory）**：
- 必须与 Planning 团队协商
- Planning 修改 Forecast，将需求"前置"
- Manufacturing 不能擅自决定库存水平

**示例**：
```
原 Forecast: Week 5 = 10K, Week 6 = 15K
需求平滑后: Week 5 = 12K, Week 6 = 13K (总量不变，提前生产)
```

---

#### **缺货（Shortage）**
```
❌ 没有"可接受的缺货率"
✅ 任何缺货都需要与 Planning 协商
```

**缺货严重程度判断标准**：
- ⚠️ **不看缺货比例**（5% vs 10% 不重要）
- ✅ **看能否 Recover**（能否在后续周补回来）

**严重程度分级**：
| 情况 | 描述 | 风险等级 | 行动 |
|------|------|---------|------|
| 可恢复缺货 | Gap < 15%，后续周有余量可补 | 🟡 MEDIUM | 加 OT，协商交付时间 |
| 持续缺货 | Gap > 15%，后续周无余量 | 🔴 HIGH | 紧急加线，升级决策 |
| 长期缺货 | 连续 4 周以上缺货 | 🔴 CRITICAL | 修改 Forecast，调整产能规划 |

**决策逻辑**：
```
IF (Cumulative Shortage 无法在未来 4 周内补回) THEN:
  风险等级 = HIGH
  建议行动 = 启动备用线 OR 修改 Forecast
```

---

## 🔧 CTB (Clear-to-Build) 约束管理

### 核心原则
```
⚠️ CTB 短缺 = 绝对约束（硬性约束）
产能可以挤一挤、加加班，但物料少了就是实打实的少！
```

**关键差异**：
- ✅ **产能不足**：有弹性（OT、加站点、加速爬坡）
- ❌ **CTB 不足**：无弹性（物料就是不够，无法临时补救）

#### **CTB 短缺场景**
| CTB 可用性 | 风险等级 | 严重程度 | 决策 |
|-----------|---------|---------|------|
| CTB ≥ Demand | 🟢 SAFE | 无风险 | 正常生产 |
| **CTB < Demand（任何短缺）** | 🔴 **CRITICAL** | **极高** | 立即停线，升级供应链 |

**核心逻辑**：
```
IF (CTB < Demand) THEN:
  风险等级 = CRITICAL（不管少 1% 还是 50%）
  原因：物料短缺无临时补救措施
  行动：
    1. 按 CTB 上限生产（不能超产）
    2. 立即上报供应链团队
    3. 评估缺货影响和恢复时间
```

#### **产能分配策略**
**当 CTB < Total Capacity 时，如何分配？**

**方案 1：按站点优先级**
```
IF (WF 是主力站点) THEN:
  优先保证 WF 的 CTB 供应
  VN02 作为 Backup（吸收波动）
```

**方案 2：按需求紧急度**
```
IF (某周 Demand 特别高) THEN:
  优先分配 CTB 给该周
  后续周可以通过加班补回
```

**方案 3：人工决策**
⚠️ **推荐方式**：系统提供建议，但最终由人决策

**系统需要提供的信息**：
- 各站点的 CTB 可用量
- 各站点的当前产能利用率
- 各周的需求缺口
- 不同分配方案的影响分析

---

## 📏 产能调整约束条件

### 时间约束
| 行动 | 实施周期 | 说明 |
|------|---------|------|
| OT（周日） | 1 周 | 立即执行 |
| OT（假日） | < 1 周 | 需要审批 |
| 增加瓶颈站点 | 3-4 周 | 需要工程评估 |
| 加速爬坡 | 1-2 周 | 风险较高 |
| 新增生产线 | 2 个月 | 长周期投资 |
| 停线 | 立即 | 但重启需要 1 个月 |
| 招聘人员 | 6 周 | 包括培训 |

### 稳定性约束
**核心原则**：产能调整以 **月** 为单位，不能以 **周** 为单位

```
❌ 错误做法：Week 1 加人，Week 2 减人，Week 3 再加人
✅ 正确做法：Month 1 稳定产能，Month 2 根据趋势调整
```

**原因**：
- 招聘周期 = 6 周（不能做 1 周）
- 人员至少工作 1 个月（不能做 1 周就走）
- 频繁调整影响员工士气和质量

**Forecast 平滑要求**：
- 如果 Forecast 波动过大（WoW > 30%），要求 Planning 平滑需求
- 将高峰需求"前置"或"后延"，换取产能稳定性

---

## 🎯 决策矩阵总结

### 需求增长决策树
```
Demand Gap ≤ 15%
  → Tier 1: 加周日 OT (+8.3%)
  → Tier 1: 加假日 OT (如果时间窗口内有假日)

15% < Demand Gap ≤ 20%
  → Tier 2: 增加瓶颈站点 (评估可行性)
  → Tier 3: 加速在爬坡的线体

Demand Gap > 20% AND Duration > 8 周
  → Tier 4: 启动备用线体（2 个月实施）
```

### 需求下降决策树
```
Demand Drop ≤ 10%
  → Tier 1: 取消 OT

10% < Demand Drop ≤ 20%
  → Tier 2: 减少 1 条线的 Night Shift

20% < Demand Drop ≤ 30%
  → Tier 2: 停产 1 条完整线体 (Day + Night)

Demand Drop > 30% AND Duration > 4 周
  → Tier 4: 考虑临时停线（需高层批准）
```

---

## 📊 系统需要提供的智能建议

### Report 中应包含的内容

#### 1. **Baseline vs Actual Gap Analysis**
```
Week-by-Week 对比：
- Baseline Capacity (标准 6 天 × 10 小时/班)
- Actual Demand
- Gap (Demand - Baseline)
- Gap %
```

#### 2. **Capacity Adjustment Recommendations**
```
针对每周的 Gap，系统建议：
- 如果 Gap +10% → 建议：加周日 OT
- 如果 Gap +18% → 建议：加假日 OT + 评估瓶颈站点
- 如果 Gap +25% → 建议：启动新线规划
```

#### 3. **Stability Check（稳定性检查）**
```
检测频繁波动：
- 如果连续 3 周波动 > 20% → 警告：需求不稳定，建议与 Planning 协商平滑
- 如果某月内产能调整 > 2 次 → 警告：影响生产稳定性
```

#### 4. **CTB Constraint Alerts**
```
CTB 约束分析：
- 每周 CTB vs Capacity vs Demand
- 如果 CTB < Capacity → 标记为 "CTB Binding"
- 建议产能分配方案（多个 scenarios）
```

#### 5. **Recovery Plan（缺货恢复计划）**
```
如果出现缺货：
- 计算 Cumulative Shortage
- 评估未来 4-8 周的余量
- 建议恢复措施：加 OT / 加线 / 修改 Forecast
- 预计恢复时间点
```

---

## 🚧 待完善部分（需要进一步输入）

### 1. 项目特定参数（Per-Program Configuration）
需要为每个项目配置：
- [ ] 线体数量和配置（Line × Shift）
- [ ] 设计产能（Peak UPH）
- [ ] **瓶颈站点数据**：
  - [ ] 各 Station 的 UPH（用于自动识别瓶颈）
  - [ ] 或人工标注哪些 Station 是瓶颈
  - 📝 说明：每个项目/产品不同，需要用户提供线平衡数据
- [ ] 可用场地空间
- [ ] 爬坡曲线参数（Standard / Fast / Aggressive）
  - ✅ 用户预设：已团队批准的 Curve
  - ⚠️ 系统不建议加速，只使用预设值

### 2. 成本参数
- [ ] OT 成本系数（周日 1.5x，假日 3x）
- [ ] 新增站点成本
- [ ] 新线投资成本
- [ ] 停线/重启成本

### 3. 历史案例库
需要收集 2-3 个真实案例：
- [ ] 需求暴涨案例（如何应对？结果如何？）
- [ ] CTB 短缺案例（如何分配产能？）
- [ ] 需求暴跌案例（如何减产？）

---

## 📝 下一步行动

1. **Review 本文档**：确认理解是否正确
2. **补充具体参数**：填写上述"待完善部分"
3. **设计规则引擎架构**：基于本文档设计 `production_plan_rules_engine.js`
4. **实现智能建议模块**：在 Report 中添加 Recommendations 部分

---

## ✅ 关键确认点（已与用户确认）

### 1. CTB 约束 ⚠️ **最高优先级**
```
✅ 确认：CTB < Demand（任何短缺）= CRITICAL
   原因：物料短缺无临时补救措施（不能像产能一样"挤一挤"）
   影响：必须按 CTB 上限生产，无法超产
```

### 2. 法定假日 OT 计算
```
✅ 确认：系统可以根据具体项目的 Holiday Calendar 自动计算
   原因：假日分布不均，无通用公式
   实现：系统读取项目配置中的假日日期，动态计算产能提升
```

### 3. 逐线停产逻辑
```
✅ 确认：停产顺序为 Line 3 Night → Line 3 Day → Line 2 Night → Line 2 Day ...
   原因：保持剩余线体的完整性（Day+Night），便于快速恢复
   错误做法：所有线先停 Night（会导致所有线只剩 Day）
```

### 4. 瓶颈站点识别
```
✅ 确认：需要用户提供线平衡数据（各 Station 的 UPH）
   原因：每个项目/产品不同，系统无法自动判断
   实现：
     - 选项 1：用户提供完整的 Station UPH 数据 → 系统自动识别瓶颈
     - 选项 2：用户直接标注哪些 Station 是瓶颈
```

### 5. 加速爬坡曲线
```
✅ 确认：系统不建议加速爬坡，只使用用户预设的 Curve
   原因：加速爬坡需要跨团队 Align（工程、质量、培训）
   流程：团队批准 → 用户预设 Fast/Aggressive Curve → 系统使用预设值计算
   系统不负责：建议加速、评估风险、推荐 Curve 类型
```

---

## 🎯 系统设计要点总结

### 系统的"智能"边界

**系统应该做**：
1. ✅ 计算 Baseline vs Actual Gap
2. ✅ 识别 CTB 约束（并标记为 CRITICAL）
3. ✅ 提供产能调整建议（OT、增站点、加线）
4. ✅ 检测不稳定波动（连续 3 周 > 20%）
5. ✅ 计算缺货恢复时间
6. ✅ 提供多个分配方案供人选择

**系统不应该做**：
1. ❌ 自动决定 CTB 分配方案（需要人决策）
2. ❌ 建议加速爬坡（需要团队预先 Align）
3. ❌ 自动调整 Forecast（需要与 Planning 协商）
4. ❌ 自动规划库存（零库存政策，需要 Planning 修改 Forecast）

### 人机协作模式

```
系统角色：分析师 + 顾问
人类角色：决策者

系统提供：
  - 数据分析（Gap、趋势、约束）
  - 多个方案（Scenario A / B / C）
  - 预测影响（如果采用方案 A，预计结果是...）

人类决定：
  - 选择哪个方案
  - 是否修改 Forecast
  - 是否批准加速爬坡
  - CTB 如何分配
```

---

**文档作者**: Claude Code
**基于**: 用户口述经验整理
**最后更新**: 2026-01-28 15:30
**版本**: v0.2
**状态**: ✅ 关键点已确认，等待进一步 Review
