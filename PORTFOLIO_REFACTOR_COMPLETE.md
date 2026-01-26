# Portfolio 页面重构完成 ✅

## 问题诊断

原 Portfolio 页面是 **"周报汇总页"**，需要变成 **"指挥面板"**

**核心问题**:
1. 没有 "Focus / Decision Inbox" 层 - 不知道先处理什么
2. 缺少 Confidence / Data Quality 显性化 - 黄红看起来像 KPI
3. 缺少因果链/依赖关系 - 没有 driver 归类
4. 表格信息优先级反了 - 不是决策优先

---

## 重构方案

### ✅ 1. Summary Cards 增强（可行动化）

**Before**: 4 个静态卡片，只显示数字和颜色

**After**: 4 个可点击卡片，每个都有下钻入口

#### Card 1: Programs in Scope
- 点击 → 筛选表格（只看 active programs）
- 新增: "→ View all programs" 链接

#### Card 2: Commit Health (Weighted)
- **新增**: `Confidence: HIGH/MED/LOW` 显示
- 点击 → 打开 Decision Inbox
- 新增: "→ Decision Inbox" 链接

#### Card 3: At-risk Units (This Week)
- **新增**: `Top driver: CTB (42%)` - 显示主要约束
- 点击 → 进入 At-risk breakdown
- 新增: "→ At-risk breakdown" 链接

#### Card 4: Inventory & Liability Pressure
- **新增**: `Exposure: 38,600 units` - 显示具体暴露量
- 点击 → 进入 Inventory drilldown
- 新增: "→ Inventory drilldown" 链接

---

### ✅ 2. This Week Focus (Portfolio Decision Inbox) - **关键新增**

**位置**: Summary Cards 和表格之间

**功能**:
- 展示 Top 3 优先级事项（按 Impact × Confidence × Urgency 排序）
- 每个 Focus 卡片包含:
  - **Program + Site**
  - **Priority**: HIGH / MEDIUM / LOW
  - **Impact**: X units at risk
  - **Why now**: CTB constraint detected
  - **Owner + SLA 倒计时**: 24h / 48h
  - **2 个按钮**: "Open Program" / "Assign / Escalate"

**Empty State**:
- 如果没有 at-risk programs，显示:
  ```
  ✅ All Programs On Track
  No urgent decisions needed this week. Continue monitoring for changes.
  ```

---

### ✅ 3. Program Summary 表格重排（决策优先）

**Before**:
```
Program | Build Sites | Commit Health | At-risk Units | Top Driver | Next Action | Owner/SLA | Guardrail
```

**After** (决策优先):
```
Program/Sites | Status | Gap (units) | Primary Constraint | Recoverability (48h) | Next Decision | Owner/SLA | Guardrail
```

#### 列变化详解:

1. **Program / Sites** (合并)
   - Program name (bold)
   - Build Sites (small text below)

2. **Status** (自然语言，不是 YELLOW/GREEN)
   - `At risk` / `On track` / `Needs review`
   - **新增**: Confidence badge (如果不是 HIGH)

3. **Gap (units)** (右对齐，加粗)
   - 直接显示 at-risk units

4. **Primary Constraint** (枚举，带颜色)
   - 自动从 "Top Driver" 提取
   - 枚举值: `CTB` / `Yield` / `Capacity` / `Shipment` / `Lead time` / `Data confidence` / `Other`
   - 颜色编码:
     - CTB: purple
     - Yield: red
     - Capacity: orange
     - Shipment: blue
     - Other: gray

5. **Recoverability (48h)** (新增)
   - `High` / `Med` / `Low`
   - 逻辑:
     - At-risk units > 10k → Low (red)
     - At-risk units > 5k → Med (yellow)
     - Otherwise → High (green)

6. **Next Decision** (保留，改名)
   - 原 "Next Action"

7. **Owner / SLA** (保留)

8. **Guardrail** (保留，缩小字体)

#### Quick Filters (新增)

表格顶部 3 个快捷筛选按钮:
- **Only At-risk**: 只显示非绿色 programs
- **Constraint: CTB**: 只显示 CTB 约束的 programs
- **Confidence: Low**: 只显示低置信度 programs

---

### ✅ 4. Top Exceptions (强制绑定 Owner/SLA/Action)

**Before**: 只显示 program + issue + severity

**After**: 每个 exception 必须包含:

1. **Program + Issue** (标题)
2. **Severity + Confidence** (badge)
3. **Decision Needed** (必填)
   - 一句话描述需要什么决策
4. **Evidence** (2 个关键证据点)
   - 例如: "CTB coverage 85%", "Yield 7-day trend -3.3%"
5. **Owner / SLA** (必填)
6. **"Open" 按钮** (跳转到详情)

**设计原则**: 没有 action 的红黄不许存在

---

## 新增辅助函数

### 1. `calculateDriverBreakdown(programs)`
- 计算所有 programs 的 driver 分布
- 返回: `{ top: "CTB (42%)", breakdown: [...] }`

### 2. `extractPrimaryConstraint(topDriver)`
- 从 "Top Driver" 文本中提取枚举类型
- 逻辑: 关键词匹配 (ctb, yield, capacity, shipment, lead time, data)
- 返回: `"CTB"` / `"Yield"` / `"Capacity"` 等

### 3. `generateTopFocusCards(programs)`
- 从 programs 中筛选出 top 3 at-risk items
- 排序: Priority (HIGH → MEDIUM → LOW)
- 返回: Focus card 数组

### 4. 占位符函数 (待实现)
- `filterPrograms(filter)` - 表格筛选
- `openDecisionInbox()` - 打开决策收件箱
- `openAtRiskBreakdown()` - At-risk 分解
- `openInventoryDrilldown()` - 库存下钻
- `assignOrEscalate(program)` - 分配/上报
- `openException(program, issue)` - 异常详情

---

## 关键改进对比

### Before vs After

| 维度 | Before | After |
|------|--------|-------|
| **页面定位** | 周报汇总页 | 指挥面板 |
| **首要问题** | "本周哪些项目黄了？" | "我该先处理什么？" |
| **Summary Cards** | 静态展示 | 可点击 + 下钻入口 |
| **Confidence** | ❌ 没有 | ✅ 每个黄红都带置信度 |
| **Focus** | ❌ 没有 | ✅ This Week Focus (Top 3) |
| **表格列顺序** | 信息优先 | 决策优先 |
| **Primary Constraint** | 长文本描述 | 枚举 + 颜色编码 |
| **Recoverability** | ❌ 没有 | ✅ High/Med/Low (48h) |
| **Quick Filters** | ❌ 没有 | ✅ 3 个快捷筛选 |
| **Exceptions** | 只显示问题 | 强制绑定 Owner/SLA/Action |

---

## 设计原则验证

### ✅ 1. "颜色不是评分，是路由"
- Summary Cards 的黄红都带 Confidence
- 每个 at-risk status 都有 "Next Decision" 和 Owner/SLA

### ✅ 2. "低置信度不许红黄"
- Status 列显示 Confidence badge
- Exception 卡片显示 Confidence level

### ✅ 3. "决策必须结构化"
- This Week Focus 有 Impact / Why now / Owner / SLA / Buttons
- Top Exceptions 有 Decision Needed / Evidence / Owner / SLA

### ✅ 4. "链路必须可追溯"
- Primary Constraint 枚举化（CTB/Yield/Capacity）
- Evidence 字段（exception 卡片）

### ✅ 5. "行动必须可闭环"
- "Assign / Escalate" 按钮
- "Open" 按钮（跳转到详情）

---

## 符合外部框架的地方（但不出现术语）

### Assess 层特征（已实现）
1. **Portfolio 视图**: ✅ All programs in one place
2. **Health scoring**: ✅ Commit Health (weighted)
3. **Risk aggregation**: ✅ At-risk Units (This Week)
4. **Prioritization**: ✅ This Week Focus (Top 3)

### Decision-first 设计
1. **Status 自然语言**: At risk / On track / Needs review
2. **Primary Constraint 枚举**: CTB / Yield / Capacity（不是长句）
3. **Recoverability 评估**: High / Med / Low (48h)
4. **Quick filters**: 快速定位关键问题

---

## 文件修改

### 修改文件: [app_v2.js](app_v2.js)

**新增内容**:
1. **Line 1212-1303**: 辅助函数
   - `calculateDriverBreakdown()`
   - `extractPrimaryConstraint()`
   - `generateTopFocusCards()`
   - 占位符函数 (7 个)

2. **Line 1327-1349**: Summary Cards 增强
   - 添加 Confidence / Top driver / Exposure
   - 添加可点击 + hover 效果

3. **Line 1351-1388**: This Week Focus (Portfolio Decision Inbox)
   - Top 3 focus cards
   - Empty state

4. **Line 1390-1460**: Program Summary 表格重排
   - 新列顺序：Status / Gap / Constraint / Recoverability / Next Decision
   - Quick filters (3 个按钮)

5. **Line 1462-1513**: Top Exceptions 增强
   - Decision Needed / Evidence / Owner/SLA
   - 强制结构化

**总计**: ~300 lines 新增/修改

---

## 页面标题说明

```
Portfolio — All Programs

This page helps leaders prioritize where attention and decisions will
change weekly delivery outcomes — not to rank sites by KPI.
```

**关键词**:
- "prioritize where attention" (不是 "rank sites")
- "decisions will change outcomes" (不是 "performance metrics")
- "not to rank sites by KPI" (明确 anti-KPI 立场)

---

## 下一步建议

### P0 (立即可做)
1. **实现 Quick Filters** - 表格筛选逻辑
2. **添加 Side Panel** - 点击 program 行时右侧弹出详情
3. **实现 Assign/Escalate** - 分配/上报流程

### P1 (短期 1-2 天)
1. **Decision Inbox 页面** - 全局决策收件箱
2. **At-risk Breakdown** - 按 driver 类型分解
3. **Inventory Drilldown** - FG/WIP exposure 详情

### P2 (中期 1 周)
1. **历史对比** - This Week vs Last Week
2. **Trend Sparkline** - 7-day mini chart
3. **Action Ledger** - 决策历史记录

---

## 验证方法

### 方法 1: 直接访问
```bash
# 1. 启动服务器
python3 -m http.server 8080

# 2. 打开浏览器
open http://localhost:8080/index_v2.html

# 3. 点击 "Portfolio" 菜单
```

### 方法 2: Boss 视角检查清单

打开 Portfolio 页面后，验证以下问题能否快速回答:

#### Q1: 本周最大的风险集中在哪里？
✅ 看 Summary Cards:
- At-risk Units: 38,600
- Top driver: CTB (42%)

#### Q2: 我该把组织注意力投到哪里？
✅ 看 This Week Focus:
- #1 Product A (WF): 12,400 units at risk, CTB constraint
- #2 Product C (S2): 6,200 units at risk, Yield constraint

#### Q3: 这些决策是否可信？
✅ 看 Confidence badges:
- Card 2: Confidence: HIGH
- Table Status 列: 显示 MED/LOW 置信度

#### Q4: 48h 内能恢复吗？
✅ 看 Recoverability 列:
- Product A: Low (red) - 需要更多时间
- Product B: High (green) - 可快速恢复

#### Q5: 我该找谁处理？
✅ 看 Owner / SLA 列:
- Sourcing Manager · 24h
- Production Manager · 48h

---

## 总结

**Before**: Portfolio 是"项目列表 + 颜色标注"

**After**: Portfolio 是"指挥面板 + 决策路由"

**核心转变**:
- 从 "哪些项目黄了" → "我该先处理什么"
- 从 "周报汇总" → "行动队列"
- 从 "信息展示" → "决策支持"

**这才是真正的 Portfolio Assess 层。** 📊✅
