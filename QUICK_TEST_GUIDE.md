# 快速测试指南 - AI Assistant 重构

**版本**: v20260129-106-unified
**测试时间**: 5-10 分钟

---

## 🎯 测试目标

验证 AI 组件合并后的功能完整性和用户体验。

---

## ✅ 测试步骤

### **Test 1: Generate 页面提示卡片**

1. 打开应用，导航到 **Production Plan → Generate** 页面
2. 检查页面顶部是否有紫色渐变卡片
3. 验证卡片内容：
   - ✅ 标题: "💡 New to Production Planning?"
   - ✅ 描述提到 "AI Assistant"
   - ✅ 有 "💬 Open AI Assistant" 按钮
   - ✅ 有示例文本: "Try: 'Create a 90-day plan...'"

**预期结果**: 卡片显示正常，没有输入框

---

### **Test 2: 点击提示卡片按钮**

1. 点击 "💬 Open AI Assistant" 按钮
2. AI 聊天抽屉应该打开
3. 检查初始上下文消息是否包含：
   - ✅ "Production Plan AI Assistant"
   - ✅ "Configure New Plans" 部分
   - ✅ "Analyze Existing Plans" 部分
   - ✅ 配置选项列表 (Modes, Sites, etc.)

**预期结果**: 聊天抽屉打开，上下文丰富且包含配置说明

---

### **Test 3: AI 配置功能 (自然语言)**

1. 在 AI 聊天中输入配置请求：
   ```
   Create a 90-day constrained plan for SZ and WH sites with Sunday OT enabled
   ```

2. 发送消息，等待 AI 响应

3. 验证 AI 响应：
   - ✅ AI 应该理解你的请求
   - ✅ AI 应该提供配置建议
   - ✅ AI 应该告诉你如何应用配置（手动填写表单）

**预期结果**: AI 能理解并响应配置请求

---

### **Test 4: AI 分析功能 (问答)**

1. 在同一个 AI 聊天中（不关闭），问一个分析问题：
   ```
   What's the difference between constrained and unconstrained mode?
   ```

2. 验证 AI 响应：
   - ✅ AI 应该解释两种模式的区别
   - ✅ 响应应该是业务语言，不是技术术语

**预期结果**: AI 能在同一对话中处理不同类型的问题

---

### **Test 5: 右下角浮动按钮 (所有页面)**

1. 关闭 AI 聊天抽屉
2. 导航到 **Library** 页面
3. 检查右下角是否有 "💬 Ask AI" 浮动按钮
4. 点击按钮，AI 聊天抽屉应该打开
5. 导航到 **POR** 页面，验证按钮仍然存在

**预期结果**: 浮动按钮在所有页面都可用

---

### **Test 6: 连续对话测试**

1. 打开 AI 聊天
2. 依次问以下问题：
   ```
   1. "How do I optimize my production plan?"
   2. "Give me a specific example"
   3. "What about Sunday OT?"
   ```

3. 验证 AI 能：
   - ✅ 记住上下文（引用之前的回答）
   - ✅ 提供连贯的对话

**预期结果**: AI 能进行多轮对话

---

### **Test 7: 其他 AI 功能验证**

确保其他 AI 功能未受影响：

#### 7.1 AI Insights (Report 页面)
1. 生成一个 Simulation
2. 查看报告页面
3. 点击 "🤖 Load AI Insights"
4. ✅ 应该正常加载 AI 分析

#### 7.2 AI Naming (Save Simulation)
1. 生成计划后，保存 Simulation
2. 在 Save 模态框中点击 "🤖 AI Suggest"
3. ✅ 应该自动填充名称和描述

#### 7.3 POR AI Summary (POR Changes)
1. 创建新的 POR 版本
2. 在 POR 页面查看版本变化
3. 点击 "🤖 AI Summary"
4. ✅ 应该生成变化总结

**预期结果**: 所有其他 AI 功能正常工作

---

## 🐛 潜在问题排查

### 问题 1: "💬 Open AI Assistant" 按钮点击无反应

**排查步骤**:
```javascript
// 在浏览器控制台执行
console.log(typeof openProductionPlanAIChat);  // 应该是 'function'
console.log(typeof window.AI_SYSTEM);  // 应该是 'object'
console.log(typeof window.openAIDrawer);  // 应该是 'function'
```

**可能原因**:
- AI_SYSTEM 未加载 → 检查 ai_system.js
- openAIDrawer 未定义 → 检查 index_v2.html 中的脚本加载顺序

---

### 问题 2: AI 聊天打开但上下文缺失

**排查步骤**:
```javascript
// 检查当前状态
console.log(window.productionPlanState);
console.log(SimulationManager.getCurrentPOR());
console.log(SimulationManager.getSimulations());
```

**可能原因**:
- SimulationManager 未初始化
- 状态为空

---

### 问题 3: 仍然看到旧的 AI Assistant 输入框

**原因**: 浏览器缓存未更新

**解决方法**:
```bash
# 硬刷新浏览器
Mac: Cmd + Shift + R
Windows: Ctrl + Shift + R

# 或清除浏览器缓存后重新加载
```

**验证缓存版本**:
```javascript
// 在控制台查看加载的脚本
performance.getEntriesByType('resource')
  .find(r => r.name.includes('app_v2.js'))
  .name
// 应该包含 "v=20260129-106-unified"
```

---

## 📊 测试结果记录

| 测试项 | 状态 | 备注 |
|--------|------|------|
| Test 1: 提示卡片显示 | ⬜ |  |
| Test 2: 点击按钮打开聊天 | ⬜ |  |
| Test 3: AI 配置功能 | ⬜ |  |
| Test 4: AI 分析功能 | ⬜ |  |
| Test 5: 浮动按钮 | ⬜ |  |
| Test 6: 连续对话 | ⬜ |  |
| Test 7.1: AI Insights | ⬜ |  |
| Test 7.2: AI Naming | ⬜ |  |
| Test 7.3: POR AI Summary | ⬜ |  |

**状态**: ✅ 通过 | ⬜ 未测试 | ❌ 失败

---

## 💡 测试提示

1. **清除缓存**: 测试前先硬刷新浏览器
2. **打开控制台**: 查看是否有 JavaScript 错误
3. **逐步测试**: 按顺序执行，不要跳过
4. **记录问题**: 发现问题立即记录错误信息

---

## 🎯 成功标准

- ✅ **所有 9 个测试通过**
- ✅ **无 JavaScript 错误**
- ✅ **用户体验流畅**
- ✅ **AI 响应准确**

---

**准备好了？开始测试吧！** 🚀
