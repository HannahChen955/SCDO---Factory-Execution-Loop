# Production Plan Output 计算逻辑 - 完整讨论记录

**日期**: 2026-01-24
**状态**: 讨论中，待最终确认

---

## 一、核心计算公式（已确认）

### 1. Daily Capacity 计算
```javascript
Daily Capacity (Day N) = Target_UPH × UPH_Curve[N] (%) × Lines × Shifts × Working_Hours
```

**说明**:
- `Target_UPH`: 基础 UPH（如 120 units/hour）
- `UPH_Curve[N]`: 第 N 个工作日的 UPH 系数（如 Day 1 = 50%, Day 30 = 100%）
- `Lines`: 产线数量（在 Line×Shift 粒度下，Lines = 1）
- `Shifts`: 班次数量（在 Line×Shift 粒度下，Shifts = 1 or 2，通常为 1）
- `Working_Hours`: 工作小时数（如 10 小时/班）

**示例**:
```javascript
// WF Line 1 Day Shift - Workday 5
Target_UPH = 120
UPH_Curve[5] = 0.70  // 70% efficiency on day 5
Shifts = 1
Working_Hours = 10

Daily_Capacity = 120 × 0.70 × 1 × 10 = 840 units
```

---

### 2. Daily Input 计算
```javascript
Daily Input = min(Daily_Capacity, CTB_Available)
```

**不缺料情况下**:
```javascript
Daily Input = Daily_Capacity
```

**缺料情况下**:
```javascript
Daily Input = CTB_Available  // 受物料限制
```

---

### 3. Daily Output 计算（关键逻辑）

#### 基本原则
1. **投入当天无产出**: Day 1 投入 → Day 1 产出 = 0
2. **分批释放产出**:
   - Day 2: 释放部分产出
   - Day 3: 释放剩余产出
   - Day 4: 收尾（如果需要）
3. **Target Yield 约束**: 每批次最终产出 = Input × Target_Yield
4. **Capacity 约束**: Daily Output ≤ Daily Capacity

#### 当前讨论的逻辑

**方案 1: 3-Day Release (原讨论)**
```javascript
// Day 1 投入 1000，Target Yield = 0.98，Yield Curve = [0.70, 0.72, 0.74, ...]

Day 1:
  Input = 1000
  Output = 0

Day 2:
  Output from Day 1 = 1000 × 50% × Yield[2] = 1000 × 0.5 × 0.72 = 360

Day 3:
  Output from Day 1 = 1000 × 50% × Yield[3] = 1000 × 0.5 × 0.74 = 370

Day 4:
  Output from Day 1 (收尾) = 980 - 360 - 370 = 250

// 验证: 360 + 370 + 250 = 980 ✓
```

**方案 2: Simplified 2-Day Release (用户建议)**
```javascript
// "day 1产出50%，day 2产出所有的，但是要考虑良率损失"

Day 1:
  Input = 1000
  Output = 0

Day 2:
  Output from Day 1 = 1000 × 50% × Yield[2] = 360

Day 3:
  Output from Day 1 (剩余全部) = ???

  // 问题: 如何计算 Day 3 的产出？
  // Option A: (980 - 360) = 620 (直接补齐到 Target Yield)
  // Option B: (980 - 360) × Yield[3] = 620 × 0.74 = 459
  // Option C: 1000 × 50% × Yield[3] = 370
```

**待用户确认**: 方案 2 中 Day 3 的产出如何计算？

---

### 4. Capacity 约束与线体平衡

#### 核心约束
```javascript
// 每天实际产出不能超过线体容量
Daily Output (实际) = min(Daily_Output_理论, Daily_Capacity)

// 累计产出不能超过累计投入
Cum Output ≤ Cum Input
```

#### 稳态行为
当投入稳定且 Yield Curve 达到 Target Yield 时:
```javascript
// 每天投入 1000 (Capacity上限)，Target Yield = 0.98
Daily Input = 1000
Daily Output (稳态) = 1000 × 0.98 = 980

// 重要: 在稳态下，每天产出不能超过 980
```

#### 超出容量时的处理

**场景**: Day 4 理论产出 = 1010，但 Capacity = 1000

**方案 A (已选择): 按优先级分配**
```javascript
// 优先完成老批次
Day 1 收尾: 250 (优先)
Day 2: 380
Day 3: 370 (受限，实际只能 370，剩余 10 丢弃)

Total = 1000
```

**说明**:
- 超出部分不追踪，不推迟
- 用 WIP (Work In Progress) 间接反映: `WIP = Cum Input - Cum Output`
- 在实际生产中，超出的 10 units 会被延迟到下一天，但为了简化计算，这里不追踪

---

### 5. 关键参数说明

#### Target Yield
- **类型**: 固定值（不是曲线）
- **示例**: 0.98 (98%)
- **含义**: 每批次投入最终能产出的比例
- **说明**: 不良品可以 Rework（返工），所以最终都能达到 Target Yield

#### Yield Curve
- **类型**: 数组，按工作日索引
- **示例**: [0.70, 0.72, 0.74, ..., 0.98]
- **含义**: 每天产出时的良率系数，反映员工熟练度
- **说明**:
  - Day 1 (第一个工作日): 70% 的产出是良品，30% 需要 Rework
  - 随着员工熟练度提升，良率逐渐接近 Target Yield (98%)
  - Rework 的部分最终也能产出，所以总产出 = Input × Target Yield

#### UPH Curve
- **类型**: 数组，按工作日索引
- **示例**: [0.50, 0.55, 0.60, ..., 1.00]
- **含义**: 每天的 UPH 效率系数
- **说明**: Day 1 只能达到 50% 的标准 UPH，逐渐爬升到 100%

---

## 二、其他已确认的信息

### 1. 周需求 (Weekly Demand)

**不分配到每天**:
```javascript
// 错误做法
daily_demand = weekly_demand / 7  // ❌

// 正确做法
// 只在周末（周六晚班结束）对比累计值
if (today is Saturday night) {
  gap = cum_shipment - cum_forecast_this_week
}
```

**周定义**: 周日到周六（Sunday to Saturday）

**对比逻辑**:
```javascript
// 主要看累计达成
Weekly Gap = Cum Shipment (end of week) - Cum Forecast (end of week)

// 单周可以有波动（+/-），只要累计达标即可
```

---

### 2. Monthly 聚合

**5-4-4 财务周模式**:
```
Q1 (Jan-Mar): 13 weeks = 5 (Jan) + 4 (Feb) + 4 (Mar)
Q2 (Apr-Jun): 13 weeks = 5 (Apr) + 4 (May) + 4 (Jun)
Q3 (Jul-Sep): 13 weeks = 5 (Jul) + 4 (Aug) + 4 (Sep)
Q4 (Oct-Dec): 13 weeks = 5 (Oct) + 4 (Nov) + 4 (Dec)
```

**说明**: 每个季度的第一个月是 5 周，后两个月各 4 周

---

### 3. Actual 数据来源

**前期 (Phase 1)**:
- 手动上传 CSV 文件
- 或在 UI 中手动编辑

**进阶 (Phase 2)**:
- 从供应商系统导入
- API 集成

**数据格式示例**:
```csv
date,site_id,actual_input,actual_output,actual_shipment
2026-01-20,WF,1200,1150,1100
2026-01-21,WF,1250,1200,1150
```

---

### 4. CTB 缺失值处理

**规则**: 如果某天没有 CTB 数据，默认为无约束（纯产能）

```javascript
if (ctbDaily[date] === undefined) {
  ctb_available = Infinity;
  daily_input = daily_capacity;  // 不受物料限制
}
```

---

### 5. Constraint 细粒度归因

**需求**: 需要更详细的约束原因说明

**建议方案: Constraint Log**
```javascript
constraintLog: [
  {
    date_start: '2026-10-12',
    date_end: '2026-10-14',
    site_id: 'WF',
    constraint_type: 'CTB',
    driver: 'Material shortage',
    root_cause: 'Supplier delay on IC-77',
    impact_units: -6400,
    owner: 'Supply Chain',
    mitigation_plan: 'Expedite air shipment'
  }
]
```

**优点**:
- 不污染 CTB 数据结构
- 可以跨天记录
- 容易导出和分析

---

### 6. Site Drill-down

**展示方式**: 站点级别展开

**UI 设计**:
```
┌─ Program Level (Total) ────────────────────────────┐
│ Date   │ Capacity │ Input  │ Output │ Shipment    │
│ 10-12  │ 12,000   │ 10,000 │ 9,500  │ 9,000       │
│   ├─ WF                                            │
│   │    │ 8,000    │ 6,500  │ 6,200  │ 5,900       │
│   └─ VN02                                          │
│        │ 4,000    │ 3,500  │ 3,300  │ 3,100       │
└────────────────────────────────────────────────────┘

[Collapse All Sites]  [Expand All Sites]
```

---

### 7. Shipment Lag

**规则**: +2 工作日（不包括产出当天）

**示例**:
```
10月5日 (周一) 产出 10K → 10月7日 (周三) 出货
  +1WD = 10月6日 (周二)
  +2WD = 10月7日 (周三)

10月6日 (周二) 产出 10K → 10月8日 (周四) 出货

10月7日 (周日) 不工作，无产出

10月8日 (周一) 产出 10K → 10月10日 (周三) 出货
  (10月9日周二 +1WD, 10月10日周三 +2WD)
```

**关键**: 周日不出货，shipment_date 的计算跳过周日和节假日

---

## 三、计算示例验证

### 场景: 稳定投入 Day 1-5

**输入**:
- 每天 Input = 1000 (也是 Capacity 上限)
- Target Yield = 0.98
- Yield Curve = [0.70, 0.72, 0.74, 0.76, 0.78, ...]

### 计算结果（基于方案 1）

| Day | Input | Cum Input | Output Details | Daily Output | Cum Output | WIP |
|-----|-------|-----------|----------------|--------------|------------|-----|
| 1 | 1000 | 1000 | - | 0 | 0 | 1000 |
| 2 | 1000 | 2000 | D1: 360 | 360 | 360 | 1640 |
| 3 | 1000 | 3000 | D1:370 + D2:370 | 740 | 1100 | 1900 |
| 4 | 1000 | 4000 | D1:250 + D2:380 + D3:370 | 1000 | 2100 | 1900 |
| 5 | 1000 | 5000 | D3:10 + D2:230 + D3:390 + D4:370 | 1000 | 3100 | 1900 |

**验证**:
- ✅ Cum Output (3100) ≤ Cum Input (5000)
- ✅ Day 1 批次总产出: 360 + 370 + 250 = 980 (= 1000 × 0.98)
- ✅ Day 2 批次总产出: 370 + 380 + 230 = 980
- ✅ WIP 稳定在 1900（从 Day 3 开始）

---

## 四、待最终确认的问题

### 问题 1: Simplified 2-Day Release 的 Day 3 产出

**用户建议**: "day 1产出50%，day 2产出所有的，但是要考虑良率损失"

**需要明确**:
```javascript
Day 1: Input = 1000
Day 2: Output = 1000 × 50% × Yield[2] = 360
Day 3: Output = ???

// Option A: 直接补齐到 Target Yield
Day 3 Output = (1000 × 0.98) - 360 = 620

// Option B: 应用 Yield Curve
Day 3 Output = (980 - 360) × Yield[3] = 620 × 0.74 = 459

// Option C: 另一个 50%
Day 3 Output = 1000 × 50% × Yield[3] = 370
```

**请用户选择**: A / B / C / 其他？

---

### 问题 2: Target Yield 和 Yield Curve 的关系

**当前理解**:
- Target Yield = 最终能达到的良率（经过 Rework）
- Yield Curve = 每天产出时的良率（影响产出速度）

**需要确认**:
- Yield Curve 达到 0.98 后，是否等于 Target Yield？
- Yield Curve 的最大值应该 = Target Yield 吗？

---

### 问题 3: 超出 Capacity 的产出如何处理

**当前方案**: 按优先级分配，超出部分丢弃

**替代方案**:
- 推迟到下一天？
- 记录在 WIP 中，后续补产？

**用户倾向**: 当前方案（丢弃），用 WIP 间接反映

---

## 五、当前引擎实现状态

### production_plan_engine.js 中的逻辑

```javascript
// 当前代码
programConfig: {
  output_factors: { day1: 0.5, day2: 1.0, day3_plus: 1.0 }
}

// 计算逻辑（简化）
output = input × output_factor × yield_factor

// 问题:
// 1. 没有明确的 "收尾" 逻辑确保达到 Target Yield
// 2. 没有 Capacity 约束检查
// 3. 没有 Cum Output ≤ Cum Input 验证
```

**需要改进**:
1. 添加 Target Yield 约束
2. 添加 Capacity 约束
3. 添加 Cum Output 验证
4. 改进 Output Factors 逻辑

---

## 六、下一步行动

### 立即（不修改逻辑）
1. ✅ 使用当前引擎生成测试报表
2. ✅ 验证报表能否正常显示
3. ✅ 确认数据结构是否完整

### 短期（优化逻辑）
1. 明确 Output 计算的精确公式（用户确认问题 1）
2. 重构 `production_plan_engine.js` 的 Output 计算部分
3. 添加 Capacity 约束检查
4. 添加 Cum Output ≤ Cum Input 验证

### 中期（增强功能）
1. 在报表中显示 WIP
2. 实现 Constraint 细粒度归因
3. 添加 Site Drill-down
4. 实现 Monthly 视图（5-4-4 财务周）

---

**文档创建日期**: 2026-01-24
**最后更新**: 2026-01-24
**状态**: 待用户最终确认
