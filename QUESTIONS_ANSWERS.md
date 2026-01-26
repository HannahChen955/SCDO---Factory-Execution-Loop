# 问题解答

**Date**: 2026-01-24

---

## 问题 1: 逻辑文档是否包含所有字段定义和关系？

### 回答：✅ 现在包含了！

我已经在 `PRODUCTION_PLAN_GENERATION_LOGIC.md` 中添加了一个全新的章节：

### **Chapter 2: Field Definitions & Calculation Formulas** ⭐

这个章节包含了**完整的字段定义表格**，涵盖：

#### 1. Input Fields (输入字段)
- **Base Configuration**: `base_uph`, `shift_hours`, `shift_type`, `line_type`, `ramp_start_date`
- **Ramp Curves**: `uph_ramp_curve`, `yield_ramp_curve`, `target_yield`
- **Material & Demand**: `ctb_qty`, `cum_ctb`, `demand_qty`, `cum_forecast`

#### 2. Calculated Fields - Unit Level
- **Daily Capacity**: `workday_index`, `uph_factor`, `yield_factor`, `daily_capacity`
- **Daily Input**: `input_unconstrained`, `ctb_remaining`, `input_final`
- **Daily Output**: `output_factor`, `base_output`, `output_final`

#### 3. Calculated Fields - Aggregated Level
- **Site Level**: `site_input_unconstrained`, `site_output_final`, etc.
- **Program Level**: `program_input_final`, `program_output_final`, `program_shipment_final`
- **Cumulative Metrics**: `cum_input`, `cum_output`, `cum_shipment`, `cum_ctb`, `cum_forecast`

#### 4. Shipment Fields
- `output_date`, `shipment_date`, `daily_shipment`
- +2 Working Days 逻辑详解

#### 5. Weekly Metrics
- `week_id`, `weekly_input`, `weekly_output`, `weekly_shipment`
- `weekly_demand`, `weekly_gap`, `weekly_attainment`

#### 6. Binding Constraint
- `binding_constraint`, `constraint_detail`
- 判定逻辑（CTB vs Capacity）

#### 7. Field Relationships Diagram
一个完整的**层级关系图**，展示从输入到输出的6层计算流程：
```
INPUT LAYER
  ↓
CALCULATION LAYER 1 (Unit Level)
  ↓
CALCULATION LAYER 2 (Output)
  ↓
CALCULATION LAYER 3 (Aggregation)
  ↓
CALCULATION LAYER 4 (Shipment)
  ↓
CALCULATION LAYER 5 (Cumulative)
  ↓
CALCULATION LAYER 6 (Weekly)
  ↓
OUTPUT LAYER (报表展示)
```

#### 8. Example Walkthrough
一个**完整的计算示例**，从头到尾演示所有公式：
- WF L1 Day Shift, Workday 5, Constrained mode
- 每一步都有详细的数值计算

#### 9. Missing/Unclear Relationships
明确标记了**3个待确认的问题**：
1. Target Yield vs Yield Ramp Curve 的关系
2. Output Flow-Time Distribution（2-day 还是 3-day？）
3. Capacity Overflow Handling（如何处理超出部分？）

### 所有字段都有详细说明，包括：
- ✅ 中文名称
- ✅ 定义（Definition）
- ✅ 计算公式（Formula）
- ✅ 单位（Unit）
- ✅ 示例值（Example）
- ✅ 依赖关系（Dependencies）
- ✅ 备注（Notes）

**文档位置**: [PRODUCTION_PLAN_GENERATION_LOGIC.md](PRODUCTION_PLAN_GENERATION_LOGIC.md) - Chapter 2

---

## 问题 2: 可以不用弹窗的形式查看报表吗？

### 回答：✅ 可以！已经改进了

我已经修改了代码，现在有**两种方式**查看报表：

### 方式 1: 新窗口（默认，如果浏览器允许）
- 点击 "Generate New Production Plan" 后
- 自动弹出新窗口显示完整报表
- **优点**: 可以同时查看主窗口和报表窗口
- **缺点**: 可能被浏览器拦截

### 方式 2: 嵌入式查看（弹窗被拦截时的备选方案）✅
现在的改进：
1. **自动保存**: 生成的报表数据**同时保存到两个地方**
   - `localStorage['productionPlan_' + planId]` - 带时间戳的版本
   - `localStorage['productionPlan_latest']` - **最新版本**（新增）

2. **自动切换**: 生成完成后，主窗口自动切换到 **"Latest Production Plan"** 标签页
   - 这个页面会展示最新生成的报表数据（嵌入式）
   - 不需要弹窗权限

3. **友好提示**: 如果弹窗被拦截，显示：
   ```
   ⚠️ Plan Generated! View report in "Latest Production Plan" tab below (pop-up was blocked).
   ```

### 方式 3: 直接打开报表页面 ✅
你还可以随时直接访问：
```
http://localhost:8080/production_plan_report.html
```

报表页面会自动：
1. 尝试从 URL 参数加载 `planId`
2. 如果没有参数，从 `localStorage['productionPlan_latest']` 加载最新报表
3. 如果都没有，从 `window.opener.productionPlanState` 加载（如果是弹窗打开的）

### 推荐方案（最稳定）

如果你希望**完全不用弹窗**，我可以进一步修改，让报表**完全嵌入**在 "Latest Production Plan" 页面中：

#### Option A: iframe 嵌入
在 "Latest Production Plan" 标签中嵌入 `<iframe src="production_plan_report.html">`

**优点**:
- 不需要弹窗权限
- 报表和主应用在同一个浏览器标签
- 可以随时切换标签页查看

**缺点**:
- iframe 可能有一些限制
- 无法独立打印报表（需要打印整个页面）

#### Option B: 直接渲染到 Latest Plan 页面
完全重写 `renderProductionPlanLatest()`，把报表内容直接渲染到主页面

**优点**:
- 无需弹窗、无需 iframe
- 完全集成在主应用中
- 打印、导出都很方便

**缺点**:
- 代码量较大（需要把报表 HTML 整合到 app_v2.js）
- 维护两套 UI 代码（报表页面 + 主应用页面）

### 你的选择？

请告诉我你更倾向于哪种方式：

1. **保持现状**（弹窗 + 嵌入式备选） - 最灵活
2. **Option A: iframe 嵌入** - 不用弹窗，但使用 iframe
3. **Option B: 完全集成到 Latest Plan 页面** - 最稳定，但需要更多代码改动

我推荐 **Option B**，因为：
- ✅ 完全不依赖弹窗
- ✅ 用户体验一致（不用在窗口间切换）
- ✅ 打印、导出更方便
- ✅ 数据加载更可靠

如果你同意，我可以立即实现 Option B。

---

## 总结

### 问题 1 解答
✅ **已完成** - `PRODUCTION_PLAN_GENERATION_LOGIC.md` 现在包含了**完整的字段定义和计算公式**（Chapter 2，约 600 行详细文档）

### 问题 2 解答
✅ **已改进** - 现在支持**嵌入式查看**（不依赖弹窗）
🔄 **可进一步优化** - 如果你同意，我可以实现 **Option B: 完全集成到 Latest Plan 页面**

### 下一步行动

1. **查看文档**: 打开 [PRODUCTION_PLAN_GENERATION_LOGIC.md](PRODUCTION_PLAN_GENERATION_LOGIC.md)，检查 Chapter 2 是否满足你的需求

2. **测试报表查看**:
   - 生成一个新的 Production Plan
   - 查看是否弹出新窗口
   - 如果没有弹出，查看 "Latest Production Plan" 标签页

3. **确认优化方向**: 告诉我你更倾向于哪种报表查看方式（保持现状 / iframe / 完全集成）

4. **回答待确认问题**: 文档中 Chapter 2.9 和后续章节中标记的问题（Target Yield, Flow-Time, Overflow Handling）
