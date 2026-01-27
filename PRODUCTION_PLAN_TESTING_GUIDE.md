# Production Plan Testing Guide

**最后更新**: 2026-01-27
**状态**: 已完成集成

---

## 🎯 测试目标

验证 Production Plan 系统的完整功能，包括：
- ✅ 数据加载（Forecast, CTB, Capacity）
- ✅ 引擎计算逻辑
- ✅ UI 展示和交互
- ✅ 报表生成和导出

---

## 🚀 快速测试流程（推荐）

### 方法 1: 使用主页面 + Load Demo Data（推荐）

这是测试 **完整用户流程** 的最佳方法。

#### Step 1: 打开主页面
```
打开浏览器 → file:///Users/chenhan/Documents/EDO/index_v2.html
```

#### Step 2: 进入 Production Plan 页面
```
点击侧边栏 → "Production Plan" → "Generate New Production Plan"
```

#### Step 3: 加载 Demo 数据
```
点击 "🧪 Load Demo Data (Oct 2026)" 按钮
→ 确认弹窗中的数据说明
→ 点击 "🚀 Load Demo Data"
→ 看到成功通知：日期已自动填充为 Oct 1-31, 2026
```

#### Step 4: 生成生产计划
```
点击 "🚀 Generate New Production Plan"
→ 选择模式:
   - Unconstrained（纯产能）
   - Constrained（含 CTB 约束）⭐ 推荐
   - Both Scenarios（两种模式对比）

→ 点击 "🚀 Generate Plan"
→ 系统验证数据（Forecast, CTB, Capacity）
→ 新窗口打开完整报表
```

#### Step 5: 验证报表
在新打开的报表窗口中检查：
- ✅ **Program Summary**: 总投入、总产出、总发货
- ✅ **Daily Metrics**: 每日 Input, Output, Shipment, Cum 数据
- ✅ **Weekly Metrics**: 周度汇总，Gap 分析
- ✅ **Site Breakdown**: WF 和 VN02 站点详细数据

---

### 方法 2: 使用独立测试页面（快速验证引擎）

适合快速验证引擎逻辑，不测试 UI 集成。

#### Step 1: 打开测试页面
```
file:///Users/chenhan/Documents/EDO/test_production_plan_demo.html
```

#### Step 2: 运行测试
```
点击 "▶ Run Test"
→ 查看 Console Log（实时日志）
→ 查看 Test Summary（汇总结果）
→ 查看 Daily Metrics（前 14 天数据）
→ 查看 Weekly Metrics（周度汇总）
→ 查看 Validation Checks（验证结果）
```

#### Step 3: 打开完整报表
```
点击 "📊 Open Full Report"
→ 新窗口打开完整报表
```

---

## 📊 Demo 数据详情

### 时间范围
- **Start Date**: 2026-10-01
- **End Date**: 2026-10-31
- **总天数**: 31 天（包含假期和周日）

### 站点配置

#### WF (中国站点)
| Line | Shift | Base UPH | Ramp Start | Ramp Curve | 说明 |
|------|-------|----------|------------|------------|------|
| L1 | DAY | 120 | Oct 5 | Auto 30d | 国庆后第一个工作日开始 |
| L1 | NIGHT | 120 | Oct 12 | Auto 30d | 晚一周启动 |

**假期**: Oct 1-7 国庆假期（7天）

#### VN02 (越南站点)
| Line | Shift | Base UPH | Ramp Start | Ramp Curve | 说明 |
|------|-------|----------|------------|------------|------|
| L1 | DAY | 80 | Oct 1 | Manual 20d | 月初开始 |
| L1 | NIGHT | 80 | Oct 8 | Manual 20d | 晚一周启动 |

**假期**: 无（越南没有中国国庆假期）

### CTB 数据（物料可用性）

#### WF Site
| 时间段 | Daily CTB | 说明 |
|--------|-----------|------|
| Oct 8-11 | 3,000 units/day | 充足，无约束 |
| **Oct 12-18** | **1,500 units/day** | ⚠️ **物料短缺，CTB 约束！** |
| Oct 19-25 | 4,000 units/day | 恢复正常 |
| Oct 26-31 | 5,000 units/day | 充足 |

#### VN02 Site
- **全月**: 10,000 units/day（完全无约束）

### Weekly Forecast（周需求）

| Week | 日期范围 | 需求量 | 说明 |
|------|---------|--------|------|
| W40 | Sep 28 - Oct 4 | 8,000 | 部分 10 月 |
| W41 | Oct 5 - Oct 11 | 12,000 | 国庆后第一周 |
| W42 | Oct 12 - Oct 18 | 16,000 | CTB 约束周 |
| W43 | Oct 19 - Oct 25 | 20,000 | 高峰需求 |
| W44 | Oct 26 - Nov 1 | 22,000 | 持续高需求 |

---

## 🔍 关键验证点

### 1. Holiday Impact（假期影响）
- ✅ WF 在 Oct 1-7 **无产出**（国庆假期）
- ✅ VN02 在 Oct 1-4 **正常工作**（没有中国假期）
- ✅ Workday Index 正确跳过假期和周日

**验证方法**:
```
查看 Daily Metrics → WF 在 Oct 1-7 的 Input/Output 应为 0
查看 Daily Metrics → VN02 在 Oct 1-4 有 Input/Output
```

### 2. CTB Binding Constraint（物料约束）
- ✅ Oct 12-18: WF 受 CTB 限制（1,500/天）
- ✅ Binding Constraint 标记为 **"CTB"**（红色）
- ✅ Daily Input ≤ CTB Remaining

**验证方法**:
```
查看 Daily Metrics → Oct 12-18 的 Constraint 列
→ 应显示红色 "CTB" 标记
→ Input 应该 ≤ 1,500 (如果多条线，总和 ≤ CTB)
```

### 3. Ramp-Up（产能爬坡）
- ✅ WF L1 Day: Oct 8 开始（Workday 1）
- ✅ WF L1 Night: Oct 12 开始（Workday 1）
- ✅ UPH 从 50% 逐渐爬升到 100%
- ✅ Yield 从 70% 逐渐爬升到 98%

**验证方法**:
```
查看 Site Breakdown → WF L1 Day
→ Oct 8 (Workday 1): Input ≈ 600 (120 × 0.5 × 10)
→ Oct 9 (Workday 2): Input ≈ 660 (120 × 0.55 × 10)
→ 逐渐增加
```

### 4. Demand vs Supply Gap（需求缺口）
- ✅ Week 2-3: 需求高（16K, 20K），产能爬坡中
- ✅ Weekly Gap 为负（供不应求）
- ✅ Attainment < 100%

**验证方法**:
```
查看 Weekly Metrics → W42, W43
→ Gap 列应为负数（红色）
→ Attainment 列 < 100%（红色或橙色）
```

### 5. Cumulative Validation（累计验证）
- ✅ **Cum Output ≤ Cum Input**（硬约束，必须满足）
- ✅ Cum Shipment ≤ Cum Output（考虑 +2WD lag）

**验证方法**:
```
查看 Validation Checks
→ "Cum Output ≤ Cum Input" 应为 ✅
→ 或在 Daily Metrics 中检查每一天的 Cum 列
```

### 6. Shipment Lag（发货延迟）
- ✅ 产出后 +2 工作日发货
- ✅ 跳过周日和假期

**验证方法**:
```
Example: Oct 8 (Mon) 产出 → Oct 10 (Wed) 发货
查看 Daily Metrics:
→ Oct 8: Output > 0, Shipment = 0
→ Oct 10: Shipment 应包含 Oct 8 的产出
```

---

## ⚠️ 常见问题排查

### 问题 1: 报表打开失败
**症状**: 点击 "Generate Plan" 后无反应或报错

**检查**:
1. 浏览器 Console 是否有错误？
2. `production_plan_engine.js` 是否正确加载？
3. `PRODUCTION_PLAN_SEED_DATA` 是否存在？

**解决**:
```javascript
// 在 Console 中检查
console.log(typeof ProductionPlanEngine);  // 应为 'function'
console.log(PRODUCTION_PLAN_SEED_DATA);    // 应显示对象
```

### 问题 2: 数据验证失败
**症状**: 显示 "Forecast data is missing" 或 "CTB data is missing"

**检查**:
1. 是否点击了 "Load Demo Data"？
2. `production_plan_seed_data.js` 中的数据是否完整？

**解决**:
```javascript
// 检查数据
console.log(PRODUCTION_PLAN_SEED_DATA.weeklyDemand);  // 应有 5 条记录
console.log(PRODUCTION_PLAN_SEED_DATA.ctbDaily);       // 应有 ~60 条记录
```

### 问题 3: Cum Output > Cum Input
**症状**: Validation Check 失败

**原因**: Output 计算逻辑有误，或 Output Factor 设置过高

**检查**:
```javascript
// 检查 output_factors
console.log(PRODUCTION_PLAN_SEED_DATA.programConfig.output_factors);
// 应为: { day1: 0.5, day2: 1.0, day3_plus: 1.0 }
```

---

## 📁 相关文件

| 文件 | 说明 |
|------|------|
| `production_plan_engine.js` | 核心计算引擎 |
| `production_plan_seed_data.js` | Demo 数据（CTB, Forecast, Capacity） |
| `production_plan_config.js` | 假日配置 |
| `production_plan_report.html` | 报表展示页面 |
| `test_production_plan_demo.html` | 独立测试页面 |
| `app_v2.js` | 主应用逻辑（包含 Load Demo Data 功能） |

---

## 📝 测试检查清单

使用此清单确保所有功能正常：

### 数据加载
- [ ] 点击 "Load Demo Data" 成功
- [ ] 日期自动填��为 Oct 1-31, 2026
- [ ] 成功通知显示

### 计划生成
- [ ] 选择 "Constrained" 模式
- [ ] 数据验证通过
- [ ] 报表新窗口打开

### 报表内容
- [ ] Program Summary 显示总计数据
- [ ] Daily Metrics 显示 31 天数据
- [ ] Weekly Metrics 显示 5 周数据
- [ ] Site Breakdown 显示 WF 和 VN02

### 数据正确性
- [ ] WF Oct 1-7 无产出（假期）
- [ ] VN02 Oct 1-4 有产出（正常工作）
- [ ] Oct 12-18 有红色 "CTB" 标记
- [ ] Weekly Gap 为负（Week 2-3）
- [ ] Cum Output ≤ Cum Input (所有天)

### 导出功能
- [ ] 导出 PDF 成功
- [ ] 导出 Excel 成功

---

## 🎓 下一步学习

1. **修改 Demo 数据**:
   - 编辑 `production_plan_seed_data.js`
   - 修改 CTB、Forecast 或 Capacity 配置
   - 重新生成计划，观察变化

2. **调整计算逻辑**:
   - 编辑 `production_plan_engine.js`
   - 修改 Output Factors（day1, day2, day3+）
   - 验证 Cum Output 是否仍 ≤ Cum Input

3. **添加新站点**:
   - 在 `production_plan_seed_data.js` 添加新 Site
   - 配置 Line×Shift units
   - 测试多站点聚合

---

**最后更新**: 2026-01-27
**作者**: Claude Code
**状态**: ✅ 已完成集成到主页面
