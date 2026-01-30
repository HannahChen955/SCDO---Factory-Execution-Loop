# Simulation & POR Version Management - Implementation Status

**日期**: 2026-01-29
**状态**: Phase 1 MVP 95% 完成

---

## ✅ 已完成功能

### 1. 核心模块 (`simulation_manager.js`)
- [x] Simulation CRUD 操作
- [x] POR 版本管理
- [x] 版本对比功能
- [x] localStorage 数据持久化
- [x] 版本号自动计算 (Major/Minor)
- [x] 数据导入/导出

### 2. UI 4-Tab 结构
- [x] Tab 1: Generate New Simulation
- [x] Tab 2: Simulation Library (卡片展示)
- [x] Tab 3: Current POR (含版本对比)
- [x] Tab 4: POR Version History

### 3. Simulation Library
- [x] 卡片式网格布局
- [x] Gap Summary 展示
- [x] 快速操作按钮 (View/Convert/Delete)
- [x] 空状态提示

### 4. POR 管理
- [x] Current POR 详情展示
- [x] 配置信息显示
- [x] 关键指标卡片
- [x] 自动对比上一版 POR (Config + Metrics)
- [x] POR History 列表

### 5. 操作功能
- [x] View Report (新窗口打开)
- [x] Delete Simulation
- [x] Promote to POR (含确认对话框)
- [x] POR 版本对比 (占位)

---

## 🔄 待完成功能 (剩余 5%)

### 关键步骤：修改 `proceedWithPlanGeneration()` 函数

**当前行为**:
```javascript
// 生成计划后直接保存到 localStorage 并打开报表
const planId = 'plan_' + Date.now();
localStorage.setItem('productionPlan_' + planId, JSON.stringify(planData));
window.open('production_plan_report.html?planId=' + planId);
```

**需要改为**:
```javascript
// 生成计划后弹出 "Save Simulation" 对话框
showSaveSimulationModal(state.planResults, config);
```

---

## 🛠️ 实现步骤 (剩余工作)

### Step 1: 添加 `showSaveSimulationModal()` 函数

在 `app_v2.js` 的 Action Handlers 区域添加：

```javascript
/**
 * Show Save Simulation Modal after plan generation
 */
window.showSaveSimulationModal = function(planResults, config) {
  // Extract summary for default name
  const summary = planResults.mode === 'combined'
    ? planResults.constrained.summary
    : planResults.summary;

  const defaultName = `Production Plan - ${config.mode} - ${config.startDate}`;

  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4">
      <div class="p-6 border-b border-gray-200">
        <h3 class="text-lg font-bold text-gray-800">Save Simulation</h3>
        <p class="text-sm text-gray-600 mt-1">Give this simulation a name for future reference</p>
      </div>
      <div class="p-6">
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Simulation Name <span class="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="simName"
            value="${defaultName}"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., Spring Festival Peak Response Plan A">
        </div>
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Description (Optional)
          </label>
          <textarea
            id="simDescription"
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., Assumes CTB is sufficient, Sunday OT enabled"></textarea>
        </div>
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div class="text-xs font-semibold text-gray-700 mb-2">Preview:</div>
          <div class="text-sm space-y-1">
            <div><span class="text-gray-600">Mode:</span> <span class="font-medium">${config.mode}</span></div>
            <div><span class="text-gray-600">Period:</span> <span class="font-medium">${config.startDate} to ${config.endDate}</span></div>
            <div><span class="text-gray-600">Total Output:</span> <span class="font-medium">${summary.totalOutput.toLocaleString()} units</span></div>
            <div><span class="text-gray-600">Attainment:</span> <span class="font-medium">${summary.overallAttainment.toFixed(1)}%</span></div>
          </div>
        </div>
      </div>
      <div class="p-6 border-t border-gray-200 flex space-x-3">
        <button
          onclick="this.closest('.fixed').remove()"
          class="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">
          Cancel
        </button>
        <button
          onclick="confirmSaveSimulation()"
          class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">
          Save Simulation
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Store data temporarily
  window._tempSimulationData = { planResults, config };
};

/**
 * Confirm and save simulation
 */
window.confirmSaveSimulation = function() {
  const name = document.getElementById('simName').value.trim();
  if (!name) {
    alert('Please enter a simulation name.');
    return;
  }

  const description = document.getElementById('simDescription').value.trim();
  const { planResults, config } = window._tempSimulationData;

  // Calculate summary
  const summary = planResults.mode === 'combined'
    ? {
        totalOutput: planResults.constrained.summary.totalOutput,
        totalShipment: planResults.constrained.summary.totalShipment,
        overallAttainment: planResults.constrained.summary.overallAttainment,
        weeksWithGap: planResults.constrained.weeklyMetrics.filter(w => w.gap < 0).map(w => w.week_id)
      }
    : {
        totalOutput: planResults.summary.totalOutput,
        totalShipment: planResults.summary.totalShipment,
        overallAttainment: planResults.summary.overallAttainment,
        weeksWithGap: planResults.weeklyMetrics.filter(w => w.gap < 0).map(w => w.week_id)
      };

  // Prepare results
  const results = planResults.mode === 'combined'
    ? {
        mode: 'combined',
        unconstrained: {
          programResults: planResults.unconstrained.programResults,
          weeklyMetrics: planResults.unconstrained.weeklyMetrics,
          siteResults: planResults.unconstrained.siteResults,
          summary: planResults.unconstrained.summary
        },
        constrained: {
          programResults: planResults.constrained.programResults,
          weeklyMetrics: planResults.constrained.weeklyMetrics,
          siteResults: planResults.constrained.siteResults,
          summary: planResults.constrained.summary
        }
      }
    : {
        programResults: planResults.programResults,
        weeklyMetrics: planResults.weeklyMetrics,
        siteResults: planResults.siteResults,
        summary: planResults.summary
      };

  results.summary = summary;

  // Enhanced config
  const enhancedConfig = {
    mode: config.mode,
    dateRange: {
      start: config.startDate,
      end: config.endDate
    },
    sites: PRODUCTION_PLAN_SEED_DATA.sites.map(s => s.site_id),
    rampCurve: 'standard', // TODO: Get from config
    otEnabled: false, // TODO: Get from config
    shiftHours: config.shiftHours,
    workingDays: config.workingDays
  };

  // Create simulation
  const simId = SimulationManager.createSimulation({
    name,
    description,
    tags: [],
    config: enhancedConfig,
    results
  });

  console.log('[UI] Simulation saved:', simId);

  // Close modal
  document.querySelector('.fixed.inset-0').remove();

  // Open report in new window
  viewSimulationReport(simId);

  // Switch to Library tab
  window.productionPlanState.activeTab = 'library';
  renderProductionPlan();

  // Show success message
  showNotification('✅ Simulation saved successfully!', 'success');

  // Cleanup
  delete window._tempSimulationData;
};
```

### Step 2: 修改 `proceedWithPlanGeneration()` 函数

在 `app_v2.js` 第 5615-5648 行，替换为：

```javascript
// Close loading overlay
loadingOverlay.remove();

// Show "Save Simulation" modal
showSaveSimulationModal(state.planResults, config);
```

删除原来的：
```javascript
// Save plan to localStorage...
// Open report window...
// Switch to Latest Plan view...
```

### Step 3: 更新 "Generate" 按钮文字

在 `renderProductionPlanGenerate()` 函数中，将按钮文字改为：

```html
🚀 Generate New Simulation
```

---

## 📝 测试清单

### Test 1: 生成 Simulation
- [ ] 点击 "Generate New Simulation"
- [ ] 选择 Mode (Constrained)
- [ ] 配置参数
- [ ] 点击 "Generate"
- [ ] 验证：弹出 "Save Simulation" 对话框
- [ ] 输入名称："Test Simulation 1"
- [ ] 输入描述："Test description"
- [ ] 点击 "Save Simulation"
- [ ] 验证：自动跳转到 "Simulation Library" Tab
- [ ] 验证：新 Simulation 出现在卡片列表中
- [ ] 验证：报表在新窗口打开

### Test 2: 查看 Simulation
- [ ] 在 Library 中点击 "View Report"
- [ ] 验证：报表正确显示

### Test 3: Promote to POR
- [ ] 在 Library 中点击 "→ Convert to POR"
- [ ] 验证：弹出确认对话框
- [ ] 输入 Notes："First POR"
- [ ] 点击 "Confirm Promotion"
- [ ] 验证：自动跳转到 "POR" Tab
- [ ] 验证：显示 POR v1.0
- [ ] 验证：配置信息正确
- [ ] 验证：关键指标正确
- [ ] 验证：无 "Changes from Previous" (因为是第一个 POR)

### Test 4: POR Version History
- [ ] 点击 "POR Version History" Tab
- [ ] 验证：显示 POR v1.0

### Test 5: 第二次 Promote
- [ ] 生成新 Simulation (不同配置)
- [ ] Promote to POR
- [ ] 验证：POR v1.1 或 v2.0 (取决于变更类型)
- [ ] 验证："Changes from Previous POR" 部分显示
- [ ] 验证：Config Changes 表格正确
- [ ] 验证：Metrics Changes 表格正确
- [ ] 切换到 History Tab
- [ ] 验证：显示 v1.0 和 v1.1/v2.0

### Test 6: Delete Simulation
- [ ] 在 Library 中点击 "Delete"
- [ ] 验证：弹出确认对话框
- [ ] 点击确认
- [ ] 验证：Simulation 从列表中移除

---

## 🐛 已知问题

### Issue 1: calculateNextVersion 函数重复
`simulation_manager.js` 和 `app_v2.js` 中都有 `calculateNextVersion` 函数。

**解决方案**: 统一使用 `SimulationManager` 中的版本。

### Issue 2: Config 数据不完整
当前 config 缺少 `rampCurve`, `otEnabled` 等字段。

**解决方案**: 在 `renderProductionPlanGenerate()` 中添加这些配置项。

### Issue 3: Combined Mode 数据结构
Combined mode 的数据结构需要特殊处理。

**解决方案**: 已在 `confirmSaveSimulation()` 中实现。

---

## 📊 数据库迁移建议

参考 `docs/SIMULATION_VERSION_MANAGEMENT.md` 第 289-423 行的 PostgreSQL 架构设计。

**迁移步骤**:
1. 搭建 PostgreSQL + TimescaleDB
2. 创建表结构 (参考文档)
3. 实现 API 后端 (Node.js + Express)
4. 修改 `simulation_manager.js` 使用 API 而非 localStorage
5. 数据迁移工具 (localStorage → PostgreSQL)

---

## ✅ 总结

**已完成**: 95%
**剩余工作**: 5% (约 1-2 小时)

**关键剩余步骤**:
1. 添加 `showSaveSimulationModal()` 和 `confirmSaveSimulation()` 函数
2. 修改 `proceedWithPlanGeneration()` 调用 modal
3. 测试完整流程

**立即可用功能**:
- Simulation Library (可以手动通过 console 添加测试数据)
- POR 管理 (可以手动 Promote)
- 版本对比

**需要最后一步才能完全打通**:
- Generate → Save Simulation → Library 流程

---

**文档作者**: Claude Code
**最后更新**: 2026-01-29
**状态**: 等待最后 5% 实现
