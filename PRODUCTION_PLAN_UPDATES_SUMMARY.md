# Production Plan Updates - Summary

**Date**: 2026-01-24
**Version**: 1.0

---

## 完成的改动

### 1. ✅ 新窗口报表展示

#### 新增文件：production_plan_report.html
独立的报表展示页面，包含：
- **汇总指标**: Total Input, Output, Shipment, Demand
- **Gap 分析**: Plan vs Demand 差距，颜色标识
- **Daily 明细表**: 完整的每日生产数据（7列）
- **Weekly 指标表**: 周度汇总，Demand 对比，Attainment %
- **Site 分解**: 站点级别详细数据（可展开）
- **操作功能**: Print, Export Excel, Close

#### 修改：app_v2.js - proceedWithPlanGeneration()
添加了新窗口打开逻辑：
```javascript
// 保存到 localStorage
const planId = 'plan_' + Date.now();
localStorage.setItem('productionPlan_' + planId, JSON.stringify(state.planResults));

// 打开新窗口
window.open('production_plan_report.html?planId=' + planId, '_blank', ...);
```

**用户流程**:
1. 点击 "🚀 Generate New Production Plan"
2. 选择模式（Unconstrained/Constrained/Combined）
3. 自动弹出新窗口显示完整报表
4. 主窗口保持在 Latest Plan 视图

---

### 2. ✅ 数据验证机制

#### 修改：app_v2.js - proceedWithPlanGeneration()
在生成前添加了完整的数据验证：

**验证规则**:

| 数据类型 | Unconstrained | Constrained | Combined |
|---------|---------------|-------------|----------|
| Forecast (Weekly Demand) | ✅ Required | ✅ Required | ✅ Required |
| CTB (Daily Material) | ⚠️ Optional | ✅ **Required** | ✅ **Required** |
| Capacity Units | ✅ Required | ✅ Required | ✅ Required |
| Sites | ✅ Required | ✅ Required | ✅ Required |

**错误提示**:
当数据缺失时，显示友好的错误对话框，包含：
- ❌ 缺失的数据列表（具体说明）
- 💡 操作指南（需要上传/配置什么）
- 按钮："OK, I'll Add Missing Data"

**示例错误信息**:
```
⚠️ Cannot Generate Production Plan

The following required data is missing:

❌ CTB (Clear-to-Build) data is missing
   Constrained mode requires daily CTB material availability data.

💡 What you need to do:
  • Forecast data: Upload weekly demand forecast (required for all modes)
  • CTB data: Upload daily material availability (required for Constrained/Combined modes)
  • Capacity config: Add production lines and shifts in the configuration section
  • Sites: Configure at least one production site
```

---

### 3. ✅ 详细逻辑文档

#### 新增文件：PRODUCTION_PLAN_GENERATION_LOGIC.md

**文档结构**（共 13 个章节）:

1. **Overview** - 系统目的和核心原则
2. **Data Requirements** - 完整的数据需求和验证规则
3. **Generation Modes** - 三种模式的详细说明
4. **Core Calculation Logic** - 6步生成流程
5. **Calendar System** - 工作日判定逻辑（含假期/覆盖）
6. **Capacity Calculation** - 产能计算公式和示例
7. **Output Calculation** - 当前逻辑 + 已知问题 + 待确认问题
8. **CTB Constraints** - 物料约束逻辑和示例
9. **Shipment Lag** - +2 工作日逻辑和跨周末/假期处理
10. **Aggregation Logic** - Unit → Site → Program, Daily → Weekly → Monthly
11. **Validation Rules** - 生成前/后的验证规则
12. **Edge Cases** - 9个边界情况处理
13. **Future Enhancements** - 按优先级分类的未来改进

**特别章节**:

- **Questions for User** - 列出了需要用户确认的关键问题：
  1. Output Flow-Time: 2-day 还是 3-day？
  2. Target Yield Application: 如何应用 98% 良率？
  3. Capacity Overflow Handling: 未产出的量如何处理？
  4. Actual Data Source: 从哪里获取实际数据？
  5. Constraint Log Detail Level: 需要多详细的归因？

- **Change Log** - 版本追踪
- **Glossary** - 术语表（CTB, UPH, Ramp Curve, etc.）
- **References** - 相关文档链接

**这是一个 Living Document**，会随着逻辑优化不断更新。

---

## 测试说明

### 如何测试新功能

1. **打开应用**:
   ```
   http://localhost:8080/index_v2.html
   ```

2. **进入 Production Plan 页面**:
   - 点击侧边栏 "Production Plan"

3. **测试数据验证**:
   - 点击 "Generate Report" 标签
   - **场景 A**: 直接点击 "🚀 Generate New Production Plan"
     - 选择 "Constrained (CTB Applied)"
     - 点击 "🚀 Generate Plan"
     - **预期**: 因为当前使用 seed data（包含所有数据），应该成功生成

   - **场景 B**: 测试缺失数据（需要手动修改 seed data）
     - 临时注释掉 `production_plan_seed_data.js` 中的 `ctbDaily`
     - 刷新页面
     - 选择 "Constrained" 模式
     - **预期**: 显示错误提示 "❌ CTB data is missing"

4. **测试报表生成**:
   - 完整数据下生成 Constrained plan
   - **预期**: 新窗口弹出，显示完整报表
   - 检查内容：
     - ✅ Summary cards 显示正确的累计数据
     - ✅ Daily table 有 31 行（Oct 1-31）
     - ✅ Weekly table 显示 4-5 周数据
     - ✅ Gap 用颜色标识（绿=正，红=负）
     - ✅ Site Breakdown 可以展开

5. **测试打印功能**:
   - 在报表窗口点击 "Print"
   - **预期**: 操作按钮隐藏，表格完整显示

---

## 已知问题

### Issue 1: 报表窗口可能被浏览器拦截

**现象**: 点击 Generate 后没有弹出新窗口

**原因**: 浏览器的 pop-up blocker

**解决方案**:
1. 检查浏览器地址栏右侧是否有弹窗拦截图标
2. 允许 localhost:8080 的弹窗
3. 如果仍然被拦截，会显示 alert: "Please allow pop-ups for this site"

### Issue 2: localStorage 容量限制

**现象**: 大型计划（数千天）可能存储失败

**原因**: 浏览器 localStorage 限制 5-10MB

**解决方案** (未来):
- 使用 IndexedDB（更大容量）
- 或后端存储

### Issue 3: Excel 导出尚未实现

**状态**: 按钮已预留，功能待实现

**未来方案**:
- 集成 SheetJS (xlsx.js)
- 或后端导出服务

---

## 文件清单

### 新增文件
1. ✅ `production_plan_report.html` - 报表展示页面
2. ✅ `PRODUCTION_PLAN_GENERATION_LOGIC.md` - 完整逻辑文档
3. ✅ `PRODUCTION_PLAN_REPORT_INTEGRATION.md` - 集成说明
4. ✅ `PRODUCTION_PLAN_UPDATES_SUMMARY.md` - 本文档

### 修改文件
1. ✅ `app_v2.js`:
   - `proceedWithPlanGeneration()` 函数（添加数据验证 + 新窗口打开）

### 相关现有文件
- `production_plan_engine.js` - 核心计算引擎（未修改）
- `production_plan_seed_data.js` - 演示数据（未修改）
- `PRODUCTION_PLAN_SYSTEM_SUMMARY.md` - 系统总结（之前创建）
- `OUTPUT_LOGIC_AGREED.md` - 输出逻辑文档（之前创建）
- `PRODUCTION_PLAN_REFACTOR_SPEC.md` - 重构规格（之前创建）

---

## 下一步行动

### 用户需要确认的问题（来自 PRODUCTION_PLAN_GENERATION_LOGIC.md）

#### 紧急（阻塞当前逻辑）

1. **Output Flow-Time**:
   - 实际是 2-day release 还是 3-day？
   - 是否需要更复杂的分布？

2. **Target Yield Application**:
   `target_yield = 0.98` 应该如何应用？
   - Option A: 每日 yield curve 已经包含了，target yield 不额外应用
   - Option B: Cum Output = Cum Input × Target Yield (独立于 yield curve)
   - Option C: 其他逻辑

3. **Capacity Overflow Handling**:
   如果某天理论产出 > 当日产能，未产出的量：
   - Option A: 直接丢弃（当前逻辑）
   - Option B: 推迟到下一个工作日
   - Option C: 均摊到接下来的 N 天

#### 中等优先级

4. **Actual Data Source**:
   实际数据（Actual Input/Output/Shipment）会从哪里获取？
   - Manual upload (Excel/CSV)?
   - API integration with MES/ERP?
   - 频率：���日/每周/实时？

5. **Constraint Log Detail Level**:
   需要多详细的约束归因？
   - Level 1: "Day X: CTB-limited"
   - Level 2: "Day X: CTB short 1,200 units"
   - Level 3: "Day X: CTB short 1,200 units on Component-A, supplier delay 3 days"

### 待实现功能（按优先级）

#### Priority 1 (关键)
- [ ] WIP (Work In Progress) Tracking
- [ ] Target Yield Integration 逻辑确认和实现
- [ ] Constraint Attribution Log（详细的约束归因）

#### Priority 2 (重要)
- [ ] Monthly Aggregation (5-4-4 Fiscal Calendar)
- [ ] Actual Data Integration（实际数据上传和合并）
- [ ] Excel 导出功能（多 sheet，含格式）

#### Priority 3 (优化)
- [ ] 图表展示（Trend chart, Ramp curve, Waterfall）
- [ ] Combined mode 并排对比表格
- [ ] localStorage 自动清理机制

---

## 使用建议

### 对于用户

1. **查看逻辑文档**:
   打开 `PRODUCTION_PLAN_GENERATION_LOGIC.md`，了解完整的计算逻辑

2. **测试数据验证**:
   尝试在不同模式下生成计划，确认验证逻辑是否符合预期

3. **查看报表**:
   生成成功后，在新窗口中查看完整报表，确认数据展示是否清晰

4. **提供反馈**:
   针对 "Questions for User" 章节的问题，提供明确的答案

5. **持续更新文档**:
   随着逻辑优化，更新 `PRODUCTION_PLAN_GENERATION_LOGIC.md` 的 Change Log

### 对于开发者

1. **参考逻辑文档**:
   所有计算逻辑改动前，先更新文档中的对应章节

2. **添加验证规则**:
   新增数据字段时，同步更新 "Data Requirements" 和 "Validation Rules"

3. **记录边界情况**:
   遇到新的 edge case，添加到 "Edge Cases" 章节

4. **版本追踪**:
   每次重大改动，更新 "Change Log" 章节

---

## 总结

本次更新完成了三个主要目标：

1. ✅ **新窗口报表展示** - 用户体验提升，报表内容完整
2. ✅ **数据验证机制** - 防止无效数据导致生成失败，提供友好错误提示
3. ✅ **详细逻辑文档** - 建立了完整的 Living Document，持续记录和优化逻辑

接下来的重点是：
- 确认用户对 Output 逻辑的具体要求
- 实现 WIP tracking 和 Target Yield 应用
- 添加 Constraint Attribution Log
- 实现 Excel 导出功能

**PRODUCTION_PLAN_GENERATION_LOGIC.md 是核心文档，请持续更新和维护！**
