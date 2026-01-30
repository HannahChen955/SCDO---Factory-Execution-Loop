# Production Plan System Documentation

**文档导航** | **Documentation Navigator**

---

## 📚 文档清单

### 1. [Production Capacity Planning Rules & Decision Logic](./PRODUCTION_CAPACITY_PLANNING_RULES.md)
**生产产能规划规则与决策逻辑**

**用途**: 业务规则和决策逻辑参考手册

**适用对象**:
- 📋 计划员（Production Planners）
- 🧠 系统设计师（需要理解业务逻辑）
- 🎯 业务分析师

**主要内容**:
- ✅ Output Logic & Metrics Calculation（输出逻辑与指标计算）
  - Input → Output → Shipment 数据流
  - Daily / Weekly 指标定义
  - Gap / Attainment 计算逻辑
  - 三种规划模式（Unconstrained / Constrained / Combined）
- ✅ 需求增长/下降应对策略（Decision Trees）
- ✅ CTB 约束管理规则
- ✅ OT 策略（周日 OT、法定假日 OT）
- ✅ 逐线停产逻辑（Line Shutdown Sequence）
- ✅ 库存与缺货管理原则
- ✅ 系统智能边界（What AI Should/Shouldn't Do）

**版本**: v0.3 (2026-01-29)
**状态**: ✅ 完整版 - 包含所有确认规则

---

### 2. [Production Plan Report Integration](./PRODUCTION_PLAN_REPORT_INTEGRATION.md)
**生产计划报表集成 - 技术实现笔记**

**用途**: 技术实现参考文档

**适用对象**:
- 💻 开发人员（Developers）
- 🔧 维护人员（Maintainers）
- 🧪 测试人员（Testers）

**主要内容**:
- ✅ 新窗口报表实现机制
  - localStorage 数据传递
  - window.open 参数配置
  - 报表页面结构
- ✅ 数据结构定义（localStorage schema）
- ✅ 打印功能实现（@media print 优化）
- ✅ 测试场景（Constrained / Combined / Print）
- ✅ 已知限制和优化建议
- 🔄 待实现功能（Excel 导出、图表、Combined 对比）

**完成时间**: 2026-01-24
**状态**: ✅ 已实现功能文档

---

## 🎯 快速导航

### **如果你想了解...**

#### 业务逻辑和规则
→ 阅读 [PRODUCTION_CAPACITY_PLANNING_RULES.md](./PRODUCTION_CAPACITY_PLANNING_RULES.md)

**常见问题**:
- ❓ 需求增长 15% 应该怎么办？
  - 👉 查看 "需求增长应对策略 > Tier 1: 加班 (OT)"
- ❓ CTB 短缺多少算严重？
  - 👉 查看 "CTB 约束管理 > 核心逻辑" (任何短缺 = CRITICAL)
- ❓ 如何计算 Gap 和 Attainment？
  - 👉 查看 "Output Logic & Metrics Calculation > Weekly Metrics"
- ❓ 停线应该怎么停？
  - 👉 查看 "需求下降应对策略 > Tier 2: 减少班次"

---

#### 技术实现细节
→ 阅读 [PRODUCTION_PLAN_REPORT_INTEGRATION.md](./PRODUCTION_PLAN_REPORT_INTEGRATION.md)

**常见问题**:
- ❓ 报表是如何打开的？
  - 👉 查看 "修改文件: app_v2.js > 新增逻辑"
- ❓ 数据是如何传递到新窗口的？
  - 👉 查看 "核心功能 > 数据传递机制"
- ❓ localStorage 数据结构是什么？
  - 👉 查看 "技术细节 > localStorage 数据结构"
- ❓ 如何调试报表显示问题？
  - 👉 查看 "测试场景" 和 "已知限制"

---

## 🔄 文档维护

### 版本历史

#### PRODUCTION_CAPACITY_PLANNING_RULES.md
- **v0.3** (2026-01-29): 新增 Output Logic 章节，整合所有确认规则
- **v0.2** (2026-01-28): 确认 CTB、OT、停线等关键规则
- **v0.1** (2026-01-28): 初稿，基于口述整理

#### PRODUCTION_PLAN_REPORT_INTEGRATION.md
- **v1.0** (2026-01-24): 报表集成完成，记录技术实现

---

### 更新规范

**业务规则变更**:
1. 更新 `PRODUCTION_CAPACITY_PLANNING_RULES.md`
2. 在 "关键确认点" 章节中记录确认时间和上下文
3. 更新版本号

**技术实现变更**:
1. 更新 `PRODUCTION_PLAN_REPORT_INTEGRATION.md`
2. 在相应章节中添加/修改技术细节
3. 更新 "已实现" 或 "待实现" 清单

---

## 📧 联系方式

**文档维护**: Claude Code
**业务规则提供**: User (Production Planning Expert)
**技术实现**: EDO Project Team

---

**最后更新**: 2026-01-29
**文档状态**: ✅ 完整且最新
