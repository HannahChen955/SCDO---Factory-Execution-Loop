# Production Plan Report - New Window Integration

## 完成时间
2026-01-24

## 改动说明

### 1. 新增文件：production_plan_report.html

创建了一个独立的报表展示页面，包含以下功能：

#### 页面结构
- **Header**: 报表标题、生成时间、模式信息
- **Actions**: Print、Export Excel、Close 按钮
- **Plan Summary**: 4个汇总指标卡片 + Gap 分析
- **Daily Results Table**: 完整的每日生产数据表格
- **Weekly Metrics Table**: 周度汇总指标（包含 Demand 对比）
- **Site Breakdown**: 站点级别明细（可展开）

#### 核心功能

1. **数据传递机制**
   ```javascript
   // 从 URL 参数获取 planId
   const planId = urlParams.get('planId');

   // 从 localStorage 读取计划数据
   const planData = localStorage.getItem('productionPlan_' + planId);

   // Fallback: 从 window.opener 获取
   if (window.opener && window.opener.productionPlanState) {
     return window.opener.productionPlanState.planResults;
   }
   ```

2. **报表展示**
   - **Summary Cards**:
     - Total Input (蓝色)
     - Total Output (绿色)
     - Total Shipment (紫色)
     - Total Demand (橙色)

   - **Gap Analysis**:
     - ✅ 绿色: Gap ≥ 0 (满足需求)
     - ⚠️ 红色: Gap < 0 (低于需求)
     - Attainment % 百分比显示

   - **Daily Table**: 7列数据
     - Date, Input, Output, Shipment
     - Cum Input, Cum Output, Cum Shipment

   - **Weekly Table**: 7列数据
     - Week, Input, Output, Shipment, Demand, Gap, Attainment %
     - Gap 用颜色标识（绿/红）
     - Attainment 用颜色标识（绿/橙/红 分别对应 ≥100%, ≥90%, <90%）

3. **打印功能**
   - `@media print` 样式优化
   - 隐藏操作按钮（.no-print 类）
   - 支持分页打印（.page-break 类）

4. **导出功能**
   - Export Excel 按钮（占位，待实现）
   - 未来支持多 sheet 导出：Summary, Daily, Weekly, Site Breakdown

### 2. 修改文件：app_v2.js

在 `proceedWithPlanGeneration()` 函数中添加了新窗口打开逻辑：

#### 修改位置
Lines 4653-4664 (原来的保存和切换逻辑)

#### 新增逻辑
```javascript
// 1. 生成唯一 planId
const planId = 'plan_' + Date.now();

// 2. 保存到 localStorage
localStorage.setItem('productionPlan_' + planId, JSON.stringify(state.planResults));

// 3. 打开新窗口
const reportWindow = window.open(
  'production_plan_report.html?planId=' + planId,
  '_blank',
  'width=1200,height=800,scrollbars=yes,resizable=yes'
);

// 4. 检查弹窗拦截
if (!reportWindow) {
  alert('Please allow pop-ups for this site to view the production plan report.');
}
```

#### 用户体验改进
- 原有的 Latest Plan 视图保持不变
- 生成成功后**同时**：
  1. 在新窗口打开详细报表
  2. 在主窗口切换到 Latest Plan 视图
  3. 显示成功通知："✅ Production Plan Generated Successfully! Report opened in new window."

---

## 使用流程

### 1. 点击 "Generate New Production Plan" 按钮
在 Production Plan > Generate Report 页面，配置好参数后点击生成按钮

### 2. 选择 Planning Mode
弹出模态框，选择：
- Unconstrained (纯产能)
- Constrained (应用 CTB 约束)
- Combined (并排对比)

### 3. 等待生成
显示 loading 动画，提示 "Generating Production Plan..."

### 4. 自动打开新窗口
生成完成后，**自动弹出新窗口**显示完整报表，包含：
- 汇总指标
- 每日明细表
- 周度指标表
- 站点分解

### 5. 主窗口同步更新
主窗口自动切换到 "Latest Production Plan" 视图，显示最新生成的计划

---

## 报表功能特性

### ✅ 已实现

1. **数据展示**
   - Daily 级别完整数据（Input, Output, Shipment, Cumulative）
   - Weekly 级别汇总（对比 Demand, 计算 Gap 和 Attainment）
   - Site 级别分解（可展开查看明细）

2. **格式化**
   - 数字千分位分隔符（12,345）
   - 日期格式化（Jan 24, 2026）
   - 颜色标识（Gap 绿/红，Attainment 绿/橙/红）

3. **交互**
   - Print 打印功能（优化打印样式）
   - Close 关闭窗口
   - Site Breakdown 折叠/展开

4. **响应式**
   - Tailwind CSS 响应式布局
   - 表格横向滚动（overflow-x-auto）
   - 固定表头（sticky top-0）

### 🔄 待实现

1. **Excel 导出**
   - 多 sheet 导出（Summary, Daily, Weekly, Sites）
   - 格式化（颜色、边框、合并单元格）
   - 公式（SUM, attainment 计算）

2. **图表展示**
   - Weekly trend chart (Shipment vs Demand)
   - Ramp curve visualization
   - Gap waterfall chart

3. **Combined Mode 对比**
   - Side-by-side 表格对比
   - Unconstrained vs Constrained 差异高亮

---

## 技术细节

### localStorage 数据结构
```javascript
// Key format
'productionPlan_plan_1706061234567'

// Value structure
{
  mode: 'constrained',  // or 'unconstrained', 'combined'
  programResults: [
    {
      date: '2026-10-01',
      input_final: 1200,
      output_final: 840,
      shipment_final: 0,
      cum_input: 1200,
      cum_output: 840,
      cum_shipment: 0
    },
    // ...
  ],
  weeklyMetrics: [
    {
      week_id: '2026-W40',
      input: 5400,
      output: 3780,
      shipments: 3200,
      demand: 5000,
      gap: -1800
    },
    // ...
  ],
  siteResults: {
    'WF': [ /* daily data */ ],
    'VN02': [ /* daily data */ ]
  }
}

// Combined mode structure
{
  mode: 'combined',
  unconstrained: { /* same as above */ },
  constrained: { /* same as above */ }
}
```

### Window.open 参数
```javascript
window.open(
  'production_plan_report.html?planId=' + planId,  // URL with query param
  '_blank',                                          // Open in new tab/window
  'width=1200,height=800,scrollbars=yes,resizable=yes'  // Window features
);
```

### 打印优化
```css
@media print {
  .no-print { display: none; }         /* 隐藏操作按钮 */
  .page-break { page-break-after: always; }  /* 强制分页 */
}
```

---

## 测试场景

### 场景 1: Constrained Mode
1. 进入 Production Plan > Generate Report
2. 保持默认配置（2026-10-01 to 2026-10-31）
3. 点击 "Generate New Production Plan"
4. 选择 "Constrained (CTB Applied)"
5. 点击 "Generate Plan"
6. **预期结果**:
   - 新窗口打开，显示报表
   - Weekly 表格中 Week 2 (2026-W42) 应该显示 CTB 约束效果（1500/day limit）
   - Gap 用红色标识（如果低于 demand）

### 场景 2: Combined Mode
1. 同上进入 Generate Report
2. 选择 "Both Scenarios (Side-by-Side)"
3. 点击 "Generate Plan"
4. **预期结果**:
   - 新窗口打开
   - 报表显示 Constrained 版本数据
   - 可以看到 Week 2 受 CTB 约束的效果

### 场景 3: Print
1. 打开报表窗口
2. 点击 Print 按钮
3. **预期结果**:
   - 操作按钮隐藏
   - 表格完整显示
   - 分页合理

---

## 已知限制

1. **Pop-up Blocker**:
   - 如果浏览器拦截弹窗，需要用户允许
   - 已添加 alert 提示

2. **localStorage 容量**:
   - 浏览器 localStorage 限制约 5-10MB
   - 大型计划（数千天数据）可能超限
   - 解决方案：使用 IndexedDB 或后端存储

3. **窗口关闭检测**:
   - 无法自动清理 localStorage 中的旧数据
   - 建议添加定时清理机制（保留最近 10 个计划）

4. **Excel 导出**:
   - 当前仅占位，需要集成 SheetJS 或后端导出服务

---

## 下一步优化

### 优先级 1 (必须)
- [ ] Excel 导出功能实现
- [ ] Combined mode 并排对比表格
- [ ] localStorage 清理机制

### 优先级 2 (重要)
- [ ] Weekly trend chart (Chart.js)
- [ ] Ramp curve visualization
- [ ] Gap waterfall chart

### 优先级 3 (优化)
- [ ] 报表模板选择（简版/详版）
- [ ] 自定义打印范围
- [ ] PDF 导出
- [ ] Email 分享功能

---

## 总结

现在用户点击 "Generate New Production Plan" 按钮后：

1. ✅ 弹出模式选择对话框
2. ✅ 生成计划数据（使用 ProductionPlanEngine）
3. ✅ **自动打开新窗口**显示完整报表
4. ✅ 主窗口保持在 Latest Plan 视图
5. ✅ 显示成功通知

报表窗口包含：
- ✅ 完整的 Daily / Weekly 数据表格
- ✅ 汇总指标和 Gap 分析
- ✅ Site 级别分解
- ✅ Print 功能
- 🔄 Export Excel（待实现）

用户体验流畅，满足需求：**点击按钮 → 弹出新窗口 → 查看完整报表**
