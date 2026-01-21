# SCDO Factory Execution Loop - Enhancement Guide

## 🎯 完成的优化 (已实施)

### 1. ✅ 品牌更新
- **标题改为**: "SCDO Control Tower — Factory Execution Loop"
- 更准确地反映中国工厂交付团队的定位

### 2. ✅ UI结构优化
- 添加了**右侧Case Drawer**（抽屉式侧边栏）
- 添加了**Report Preview Modal**（报告预览弹窗）
- 引入html2pdf.js库支持PDF导出

## 🚀 待集成功能（需要手动合并）

由于app.js文件较大，以下功能已准备好但需要手动集成：

### 1. Active Case Drawer（右侧抽屉）
**功能**: 点击任何风险卡片，右侧打开详细面板

**包含5个区块**:
- Snapshot: Score/Confidence/Route/Impact
- Signals: Top 2信号
- Recommended Action: 建议动作 + Owner + SLA
- Evidence Pack: 打开完整证据包的按钮
- Feedback: 有效/无效反馈按钮

**触发方式**:
```javascript
// 在风险卡片的onclick中调用
onclick="openCaseDrawer('${risk.id}')"
```

### 2. Report Generation（报告生成）
**功能**: 一键生成内部周报格式的Briefing

**报告格式**:
- A4纸大小，专业商务风格
- 包含: Header/Situation/Key Signals/Risk Assessment/Decision & Route/Actions/Evidence/Footer
- 支持HTML和PDF两种格式下载

**触发方式**:
```javascript
// 在Evidence Pack modal或Case Drawer中调用
onclick="generateReport('${risk.id}')"
```

### 3. Interactive Workflow Rail
**功能**: Workflow Rail显示payload和可点击的popover

**增强内容**:
- 每个阶段显示当前数量
- Hover显示Top 3项目
- 点击跳转到对应页面

### 4. Interactive Today's Loop
**功能**: 将Today's Loop变成可点击的时间线

**交互元素**:
- 每个步骤可点击查看详情
- "Simulate Decision"按钮
- "Open Case Drawer"按钮

### 5. Enhanced Risk Cards
**功能**: 风险卡片添加Impact信息

**新增内容**:
- 在drivers下方添加一行Impact
- 例如: "Impact: -12k units @W04 (OTIF risk)"

### 6. Routed Today List（Orchestration页面）
**功能**: 显示今天已路由的案例

**内容**:
- Case ID + Route Icon + Owner + SLA
- 点击打开Case Drawer

### 7. Feedback Closure Widget（Evidence页面）
**功能**: 显示反馈闭环统计

**包含**:
- Pending feedback数量
- Closed this week数量
- Model calibration suggestions

## 📦 快速集成方案

### 方案1: 使用增强版文件
`app_enhanced.js`文件包含了所有新功能的独立实现，需要：

1. 在index.html中添加：
```html
<script src="./app_enhanced.js"></script>
```

2. 在原app.js中更新风险卡片的onclick:
```javascript
// 旧版
onclick="window.__openEvidence('${r.id}')"

// 新版（先打开drawer）
onclick="openCaseDrawer('${r.id}')"
```

### 方案2: 手动集成关键函数
将以下函数从`app_enhanced.js`复制到主`app.js`的末尾：
- `openCaseDrawer()`
- `closeCaseDrawer()`
- `generateReport()`
- `downloadHTMLReport()`
- `downloadPDFReport()`
- `submitFeedback()`

## 🎨 报告样式说明

生成的报告采用**内部周报+商务风格**:
- 字体: System fonts (SF Pro, Segoe UI)
- 配色: 深灰标题 + 淡蓝/淡绿强调色
- 布局: A4纸尺寸，0.75英寸边距
- 分段: 清晰的section标题 + 边框分隔
- 强调: Action Box使用绿色左边框
- 状态: Badge样式的路由标签

## 🔧 事件绑定清单

需要在HTML中添加以下onclick事件:

### Modal按钮
```javascript
document.getElementById('generateReportBtn').addEventListener('click', () => {
  generateReport(STATE.selectedRiskId);
});

document.getElementById('downloadHTMLBtn').addEventListener('click', downloadHTMLReport);
document.getElementById('downloadPDFBtn').addEventListener('click', downloadPDFReport);
document.getElementById('closeReportModalBtn').addEventListener('click', closeReportModal);
```

### Risk Cards
更新所有风险卡片的点击事件：
```javascript
// 从
onclick="window.__openEvidence('${r.id}')"

// 改为
onclick="openCaseDrawer('${r.id}')"  // 打开drawer
// 或同时保留双击打开完整Evidence Pack的功能
```

## 📋 测试清单

完成集成后，测试以下流程：

- [ ] 点击Home页的风险卡片，右侧Drawer打开
- [ ] 在Drawer中点击"Generate Report"，预览弹窗出现
- [ ] 点击"Download HTML"，下载HTML报告文件
- [ ] 点击"Download PDF"，生成并下载PDF文件
- [ ] 在Drawer中提交Feedback，显示确认提示
- [ ] 关闭Drawer和Modal，页面恢复正常

## 🎯 下一步优化建议

1. **Demo Script功能**: 添加右上角"Run Demo"按钮，自动引导演示流程
2. **Workflow Rail Popovers**: 每个阶段hover显示详细信息
3. **Timeline Pills**: Today's Loop的每个步骤变成可点击的pill
4. **Impact Line**: 在所有Risk卡片底部添加Impact信息
5. **Feedback Analytics**: 在Evidence页面添加学习闭环统计

## 💡 演示建议

向老板展示时的最佳流程：

1. **打开Home页** → "这是我们的工厂执行闭环控制塔"
2. **指向Workflow Rail** → "决策流程分4个阶段，每个阶段都有状态监控"
3. **指向Today's Loop** → "这是一个完整案例的端到端链条"
4. **点击风险卡片** → "任何风险都可以打开详细面板"
5. **点击Generate Report** → "一键生成标准化简报，可以转发给跨团队"
6. **下载PDF** → "报告格式符合内部周报标准，可直接使用"
7. **切换Scenario** → "不同场景展示不同类型的风险（Late/Overbuild）"

重点强调：
- "这不是数据看板，是决策编排系统"
- "每个风险都有完整的证据链和可追溯的决策记录"
- "系统支持自动路由和人工审核的闭环"
- "工厂端能更早收到需求变化信号，控制呆料和WIP风险"

## 📞 技术支持

如需进一步优化或遇到集成问题，可以：
1. 查看browser console的错误信息
2. 确认html2pdf.js库已正确加载
3. 验证所有global函数已正确声明
