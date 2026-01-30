# 网站访问统计设置指南

**目标**: 追踪 Vercel 部署的 Demo 访问量
**推荐方案**: Google Analytics 4 (GA4) - 免费且功能强大

---

## 🎯 方案概览

### **Option 1: Google Analytics 4 (推荐)** ⭐⭐⭐⭐⭐
- **费用**: 免费
- **功能**: 实时访客、页面浏览、用户行为、设备分析
- **配置难度**: ⭐ 简单（只需复制粘贴代码）
- **数据隐私**: 可配置 IP 匿名化

### **Option 2: Vercel Analytics**
- **费用**: $20/月起
- **功能**: 访问量、性能监控
- **配置难度**: ⭐ 零配置（Vercel 原生）
- **适用场景**: 预算充足且需要性能监控

### **Option 3: Simple Analytics**
- **费用**: €19/月起
- **功能**: 隐私友好的访问统计
- **配置难度**: ⭐⭐ 简单
- **适用场景**: GDPR 严格合规需求

---

## 📝 Google Analytics 4 设置步骤

### **Step 1: 创建 Google Analytics 账号**

1. 访问 [Google Analytics](https://analytics.google.com/)
2. 点击 "开始衡量" 或 "Create Account"
3. 填写账号信息：
   - **账号名称**: 例如 "FDOS Demo"
   - **媒体资源名称**: 例如 "FDOS Production Plan"
   - **报告时区**: 选择你的时区 (Asia/Shanghai)
   - **货币**: CNY

4. 创建 **数据流 (Data Stream)**:
   - 选择 "网站"
   - **网站网址**: 你的 Vercel 网址（例如：`https://your-app.vercel.app`）
   - **数据流名称**: "FDOS Web"

5. 获取你的 **Measurement ID**:
   - 格式：`G-XXXXXXXXXX`（例如：`G-ABC1234567`）
   - 复制这个 ID

---

### **Step 2: 更新你的网站代码**

你的 `index_v2.html` 已经添加了 Google Analytics 代码模板。

**现在只需要替换 Measurement ID**:

1. 打开 `index_v2.html`
2. 找到第 9-10 行：
   ```html
   <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
   ```
3. 将 `G-XXXXXXXXXX` 替换为你的真实 Measurement ID
4. 在第 15 行也替换一次：
   ```javascript
   gtag('config', 'G-XXXXXXXXXX', {
   ```

**示例**:
```html
<!-- 替换前 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>

<!-- 替换后 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-ABC1234567"></script>
```

---

### **Step 3: 部署到 Vercel**

```bash
# 提交更改
git add index_v2.html
git commit -m "Add Google Analytics tracking"
git push

# Vercel 会自动重新部署
```

或者手动部署：
```bash
vercel --prod
```

---

### **Step 4: 验证追踪是否生效**

#### 方法 1: 实时报告
1. 访问 [Google Analytics](https://analytics.google.com/)
2. 点击左侧 "报告" → "实时"
3. 打开你的 Vercel 网站
4. 几秒钟内应该在实时报告中看到你的访问

#### 方法 2: 浏览器控制台验证
1. 打开你的 Vercel 网站
2. 按 F12 打开开发者工具
3. 切换到 "Network" 标签
4. 刷新页面
5. 查找以下请求：
   - `https://www.google-analytics.com/g/collect?...`
   - 如果看到这个请求，说明追踪正常工作

#### 方法 3: Google Tag Assistant (Chrome 扩展)
1. 安装 [Tag Assistant](https://chrome.google.com/webstore/detail/tag-assistant-legacy-by-g/kejbdjndbnbjgmefkgdddjlbokphdefk)
2. 访问你的网站
3. 点击扩展图标，应该显示 "Google Analytics" 标签已检测到

---

## 📊 你可以查看的数据

### **实时数据** (立即可用)
- 当前在线用户数
- 正在查看的页面
- 用户来源国家/城市
- 设备类型 (桌面/移动)

### **历史数据** (24-48 小时后)
- 每日/每周/每月访问量
- 页面浏览次数 (Page Views)
- 独立访客数 (Users)
- 平均会话时长
- 跳出率
- 用户流量来源 (直接访问、搜索引擎、社交媒体)

### **用户行为分析**
- 最受欢迎的页面
- 用户访问路径
- 设备和浏览器分布
- 地理位置分布

---

## 🔥 高级功能：自定义事件追踪

如果你想追踪特定的用户行为（例如点击某个按钮、生成计划），可以使用自定义事件。

### **示例 1: 追踪 "Generate Simulation" 按钮点击**

在 `app_v2.js` 中添加：

```javascript
// 找到 generateProductionPlan 函数
window.generateProductionPlan = async function() {
  console.log('[Production Plan] Starting generation...');

  // 添加 GA 事件追踪
  if (typeof window.trackEvent === 'function') {
    window.trackEvent('generate_simulation', {
      mode: config.mode,
      date_range: `${config.startDate} to ${config.endDate}`,
      sites_count: config.sites.length
    });
  }

  // 原有代码...
};
```

---

### **示例 2: 追踪 AI 使用情况**

```javascript
// 在 openProductionPlanAIChat 函数中添加
window.openProductionPlanAIChat = function() {
  // 追踪 AI 聊天打开
  if (typeof window.trackEvent === 'function') {
    window.trackEvent('ai_chat_opened', {
      tab: window.productionPlanState.activeTab
    });
  }

  // 原有代码...
};
```

---

### **示例 3: 追踪 Excel 导出**

```javascript
// 在 ExcelExport.exportSimulation 中添加
function exportSimulation(simulation) {
  // 追踪导出事件
  if (typeof window.trackEvent === 'function') {
    window.trackEvent('excel_export', {
      simulation_name: simulation.name,
      mode: simulation.results.mode
    });
  }

  // 原有代码...
}
```

---

### **在 GA4 中查看自定义事件**

1. 访问 Google Analytics
2. 左侧菜单 → "报告" → "事件"
3. 你会看到自定义事件列表：
   - `generate_simulation`
   - `ai_chat_opened`
   - `excel_export`

---

## 🛡️ 隐私保护配置

### **已启用的隐私保护**

在 `index_v2.html` 中已配置：

```javascript
gtag('config', 'G-XXXXXXXXXX', {
  'anonymize_ip': true  // IP 地址匿名化
});
```

### **可选：禁用 Cookie**

如果你想完全不使用 Cookie（更严格的隐私保护）：

```javascript
gtag('config', 'G-XXXXXXXXXX', {
  'anonymize_ip': true,
  'client_storage': 'none'  // 禁用 Cookie
});
```

**注意**: 禁用 Cookie 会导致无法追踪回访用户。

---

## 📱 移动端追踪

Google Analytics 自动支持移动端访问追踪，无需额外配置。

你可以在报告中查看：
- 桌面 vs 移动端访问占比
- 不同设备型号的访问情况
- 移动端浏览器类型

---

## 🆚 方案对比总结

| 功能 | Google Analytics | Vercel Analytics | Simple Analytics |
|------|------------------|------------------|------------------|
| **费用** | 免费 | $20/月 | €19/月 |
| **实时数据** | ✅ | ✅ | ✅ |
| **历史数据** | ✅ 无限 | ✅ 有限 | ✅ 无限 |
| **自定义事件** | ✅ | ❌ | ⚠️ 有限 |
| **地理位置** | ✅ | ✅ | ✅ |
| **设备分析** | ✅ | ✅ | ✅ |
| **用户流路径** | ✅ | ❌ | ❌ |
| **无需账号** | ❌ | ✅ | ❌ |
| **隐私友好** | ⚠️ 可配置 | ✅ | ✅ 最佳 |
| **配置难度** | ⭐ | ⭐ 零配置 | ⭐⭐ |

---

## 🎯 Demo 场景推荐配置

**你的使用场景**: Vercel 部署的 Demo，想知道访问量

**推荐配置**:
```javascript
gtag('config', 'G-XXXXXXXXXX', {
  'send_page_view': true,   // 自动追踪页面浏览
  'anonymize_ip': true,     // IP 匿名化
  'cookie_expires': 7776000 // Cookie 90 天过期 (可选)
});
```

**追踪的关键指标**:
- 📊 总访问量 (Page Views)
- 👥 独立访客数 (Users)
- 🌍 访客地理位置
- 📱 设备类型分布
- ⏱️ 平均会话时长

---

## 🚀 快速测试

部署后，立即测试追踪是否工作：

```bash
# 1. 打开你的 Vercel 网站
open https://your-app.vercel.app

# 2. 打开 Google Analytics 实时报告
open https://analytics.google.com/

# 3. 查看 "实时" → "概览"
# 应该在几秒钟内看到 1 个活跃用户 (你自己)
```

---

## 📞 获取帮助

### Google Analytics 官方文档
- [GA4 设置指南](https://support.google.com/analytics/answer/9304153)
- [事件追踪文档](https://developers.google.com/analytics/devguides/collection/ga4/events)

### 常见问题

**Q: 为什么看不到实时数据？**
- A: 检查 Measurement ID 是否正确复制
- A: 清除浏览器缓存后重试
- A: 等待 5-10 分钟（有时延迟）

**Q: 可以追踪多少访客？**
- A: Google Analytics 免费版无限制

**Q: 数据会保留多久？**
- A: 默认 14 个月，可在设置中调整

---

**准备好了吗？** 按照步骤设置，马上就能看到你的 Demo 访问数据！ 🎉
