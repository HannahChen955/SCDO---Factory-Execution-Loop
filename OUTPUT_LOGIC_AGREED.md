# Output Calculation Logic - Discussion Summary

**Date**: 2026-01-24
**Status**: Under discussion - to be refined

---

## 当前已确认的要点

### 1. 核心约束

✅ **Cum Output ≤ Cum Input** (硬约束，必须满足)
✅ **Daily Output ≤ Daily Capacity** (线体平衡约束)
✅ **Target Yield** = 固定值（如 98%），每个项目一个值
✅ **Yield Curve** = 每天产出时应用的系数，反映员工熟练度

### 2. 产出释放规则（当前理解）

```
Day 1 (投入当天): Output = 0
Day 2: Output = Input × 50% × Yield[day2]
Day 3: Output = (剩余部分) × Yield[day3]
Day 4: Output = 收尾，确保总产出 = Input × Target_Yield
```

### 3. 稳态行为

当 Input 稳定且 Yield Curve 达到 Target Yield 时：
```
每天 Input = 1000
每天 Output = 980 (= 1000 × 0.98)
```

### 4. Shipment Lag

✅ **已确认**: +2 工作日（不包括产出当天）
```
周一产出 → 周三出货
周二产出 → 周四出货
周日不出货
```

---

## 待明确的细节

### 问题 1: Day 2 和 Day 3 的产出计算

**场景**: Day 1 投入 1000，Target Yield = 98%，Yield Curve = [0.70, 0.72, 0.74, ...]

**选项 A**:
```
Day 2 产出 = 1000 × 50% × 0.72 = 360
Day 3 产出 = (980 - 360) = 620 (确保总计 980)
```

**选项 B**:
```
Day 2 产出 = 1000 × 50% × 0.72 = 360
Day 3 产出 = (980 - 360) × 0.74 = 459
Day 4 产出 = 980 - 360 - 459 = 161
```

**选项 C**:
```
Day 2 产出 = 980 × 50% = 490
Day 3 产出 = 980 × 50% = 490
总计 = 980
```

**待确认**: 用户倾向哪个选项？

### 问题 2: 超出 Capacity 时的处理

当理论产出 > Daily Capacity 时：

**已选择**: 方案 A - 按优先级分配（先完成老批次）

**待明确**:
- 被推迟的产出如何追踪？
- 是否会导致最终产出 < Input × Target Yield？

### 问题 3: WIP (Work in Progress) 计算

**用户建议**: 用 Cum Input - Cum Output 来计算，更准确

**待实现**:
- 在报表中显示 WIP
- 用 WIP 来验证逻辑正确性

---

## 当前引擎实现

### production_plan_engine.js 的逻辑

**Output Factors** (当前代码):
```javascript
output_factors: {
  day1: 0.5,      // Day 1: 50%
  day2: 1.0,      // Day 2: 100%
  day3_plus: 1.0  // Day 3+: 100%
}
```

**计算逻辑** (当前代码):
```javascript
// Calculate base output
const baseOutput = input * yieldFactor;

// Apply output factor for first two days
let outputFactor = 1.0;
if (workdayIdx === 1) {
  outputFactor = this.programConfig.output_factors.day1;  // 0.5
} else if (workdayIdx === 2) {
  outputFactor = this.programConfig.output_factors.day2;  // 1.0
} else {
  outputFactor = this.programConfig.output_factors.day3_plus;  // 1.0
}

const output = baseOutput * outputFactor;
```

**问题**: 这个逻辑与我们讨论的不完全一致，需要重构

---

## 下一步行动

### 立即（不修改逻辑）

1. ✅ 使用当前引擎生成测试报表
2. ✅ 验证报表能否正常显示
3. ✅ 确认数据结构是否完整

### 短期（优化逻辑）

1. 明确 Output 计算的精确公式
2. 重构 `production_plan_engine.js` 的 Output 计算部分
3. 添加 Capacity 约束检查
4. 添加 Cum Output ≤ Cum Input 验证

### 中期（增强功能）

1. 在报表中显示 WIP
2. 实现 Constraint 细粒度归因
3. 添加 Site Drill-down
4. 实现 Monthly 视图（5-4-4 财务周）

---

## 测试用例（待验证）

### 测试 1: 稳态产出
```
Input: 每天 1000（稳定）
Capacity: 1000
Target Yield: 0.98
Yield Curve: 达到 0.98

预期: 每天产出 980
```

### 测试 2: Ramp 阶段
```
Input: 每天 1000
Capacity: 1000
Target Yield: 0.98
Yield Curve: [0.70, 0.72, 0.74, ...]

预期:
- Day 2: 360
- Day 3: 740
- Day 4: 1000 (受 Capacity 限制)
- Cum Output ≤ Cum Input (每天验证)
```

### 测试 3: CTB 约束
```
Input: min(Capacity, CTB)
Week 2: CTB = 1500/天

预期:
- Input 受限于 CTB
- Binding Constraint = 'CTB'
```

---

## 参考文档

- [PRODUCTION_PLAN_SYSTEM_SUMMARY.md](PRODUCTION_PLAN_SYSTEM_SUMMARY.md)
- [production_plan_engine.js](production_plan_engine.js)
- [production_plan_seed_data.js](production_plan_seed_data.js)

---

**注**: 本文档记录了讨论过程，部分细节仍需用户确认。当前优先任务是验证报表生成功能。
