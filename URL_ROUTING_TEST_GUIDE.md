# URL Routing System - Test Guide

**Version**: v20260130-url-routing
**Date**: 2026-01-30

---

## 🎯 What's New

Your application now has **URL routing**! Each page and product combination has its own unique URL that you can share and bookmark.

---

## 🔗 URL Structure

### Global Pages (No product context)

```
http://localhost:8080/index_v2.html#/overview
http://localhost:8080/index_v2.html#/decision-center
http://localhost:8080/index_v2.html#/mo-kpis
http://localhost:8080/index_v2.html#/mo-kpis/product-a
http://localhost:8080/index_v2.html#/data-foundation
http://localhost:8080/index_v2.html#/white-paper
```

### Program Workspace (With product/site/week)

```
http://localhost:8080/index_v2.html#/mo-dashboard/product-a/wf/2026-w04
http://localhost:8080/index_v2.html#/mo-dashboard/product-b/sz/2026-w05
http://localhost:8080/index_v2.html#/mo-dashboard/product-c
http://localhost:8080/index_v2.html#/mo-dashboard/product-d/wf
```

---

## ✅ Test Checklist

### Test 1: Basic Navigation
- [ ] 打开应用（默认进入 Overview）
- [ ] URL 应该显示 `#/overview`
- [ ] 点击 "Decision Center" → URL 变为 `#/decision-center`
- [ ] 点击 "MO Operations Dashboard" → URL 变为 `#/mo-dashboard/...`
- [ ] 点击 "MO KPIs" → URL 变为 `#/mo-kpis`

### Test 2: Product Switching
- [ ] 在 MO Operations Dashboard 页面
- [ ] 从 Product 下拉框选择 Product B
- [ ] URL 应该更新为 `#/mo-dashboard/product-b/...`
- [ ] 页面内容应该显示 Product B 的数据
- [ ] 再切换到 Product C，URL 和数据都应该对应更新

### Test 3: Site & Week Changes
- [ ] 在 MO Operations Dashboard 页面
- [ ] 选择不同的 Factory Site（例如 SZ）
- [ ] URL 应该包含 `/sz/`
- [ ] 选择不同的 Week（例如 2026-W05）
- [ ] URL 应该包含 `/2026-w05`

### Test 4: Direct URL Access
- [ ] 复制 URL: `http://localhost:8080/index_v2.html#/mo-dashboard/product-b/wf/2026-w04`
- [ ] 在新标签页中粘贴并访问
- [ ] 应该直接打开 Product B, WF site, Week 2026-W04 的页面
- [ ] 数据应该是 Product B 的数据

### Test 5: Browser Back/Forward
- [ ] 从 Overview 导航到 Decision Center
- [ ] 然后到 MO Dashboard
- [ ] 点击浏览器的"后退"按钮
- [ ] 应该回到 Decision Center，URL 也应该更新
- [ ] 点击"前进"按钮
- [ ] 应该回到 MO Dashboard

### Test 6: MO KPIs Product URLs
- [ ] 进入 MO KPIs 页面
- [ ] 选择 Product A
- [ ] URL 应该是 `#/mo-kpis/product-a`
- [ ] 切换到 Product B
- [ ] URL 应该更新为 `#/mo-kpis/product-b`
- [ ] KPI 数据应该显示 Product B 的数据

### Test 7: Sidebar Navigation
- [ ] 在 Program Workspace（例如 Delivery Command Center）
- [ ] 点击左侧边栏中的 "Production Plan"
- [ ] URL 应该保持当前的 product/site/week
- [ ] 只有 view 改变（但目前实现可能还是 mo-dashboard）
- [ ] 点击 "← Back to Decision Center"
- [ ] URL 应该变为 `#/decision-center`

---

## 🐛 Known Issues & Limitations

### 当前版本的限制：

1. **Program Workspace 子页面**：
   - 所有 Program Workspace 的子页面（Delivery Command Center, Production Plan, etc.）都使用相同的 URL 格式 `#/mo-dashboard/...`
   - 原因：这些都是同一个 "Program" 下的不同视图
   - 未来可以改进为：`#/mo-dashboard/delivery-command-center/...`

2. **Filter 初始化**：
   - 从 URL 进入时，如果 URL 中没有指定 product/site/week，会使用默认值
   - 这是预期行为

3. **URL 与数据同步**：
   - 如果你手动编辑 URL 为不存在的 product（例如 product-z），会回退到 Product A

---

## 🎉 Demo 演示场景

### 场景 1: 分享特定产品的问题

**假设**: 你发现 Product B 在 WF 工厂有问题

1. 导航到 Product B / WF / 2026-W04
2. URL: `http://localhost:8080/index_v2.html#/mo-dashboard/product-b/wf/2026-w04`
3. 复制 URL 发送给同事
4. 同事打开链接，直接看到 Product B 的具体问题

### 场景 2: 对比不同产品的 KPIs

**步骤**:
1. 打开 MO KPIs，选择 Product A
2. 复制 URL: `.../mo-kpis/product-a`
3. 新标签页打开
4. 在新标签页选择 Product B
5. 现在可以并排对比两个产品的 KPIs

### 场景 3: 浏览器历史记录

**步骤**:
1. 依次访问：Overview → Decision Center → Product A Dashboard → Product B Dashboard
2. 使用浏览器的后退按钮快速返回之前查看的页面
3. 每次后退，数据都会正确恢复

---

## 🔧 Technical Notes

### How It Works

1. **Router.js**:
   - 监听 `window.location.hash` 变化
   - 解析 hash 为 route 对象 `{ view, product, site, week }`
   - 当 hash 改变时，调用回调函数更新 STATE

2. **app_v2.js Integration**:
   - `navigateTo(view)` 函数：更新 STATE 并调用 `Router.navigate()`
   - `Router.navigate()` 更新 URL hash
   - Hash 改变触发 `hashchange` 事件
   - 事件处理器更新 STATE 并重新渲染

3. **Filter Synchronization**:
   - Product/Site/Week 选择器改变时，调用 `Router.navigate()` 更新 URL
   - URL 包含完整的 product/site/week 信息

### Backward Compatibility

如果 `router.js` 没有加载或出错：
- 应用会回退到原有的无路由模式
- 所有功能仍然正常工作
- 只是 URL 不会更新

---

## 📊 Next Steps (Optional Improvements)

1. **Sub-page URLs**:
   - `#/mo-dashboard/production-plan/product-a/wf`
   - `#/mo-dashboard/fv-tracker/product-b/sz`

2. **Query Parameters**:
   - `#/mo-dashboard/product-a?simulation=true&preset=yield-drift`
   - 用于保存 simulation 状态

3. **Pretty URLs** (需要服务器配置):
   - `/overview` 而不是 `#/overview`
   - Vercel 支持，但需要配置 `vercel.json`

---

**准备好测试了吗？** 🚀

按照上面的测试清单逐项验证，有问题随时告诉我！
