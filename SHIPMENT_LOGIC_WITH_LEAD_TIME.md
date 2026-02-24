# Shipment Logic with Production Lead Time

**版本**: v1.0
**创建日期**: 2026-02-02
**状态**: 新增业务规则

---

## 📋 业务背景

### 核心理念
生产提前于出货是正常的业务流程。Forecast 日期代表**出货目标日期**（Shipment Target Date），但生产需要**提前开始**以满足以下需求：
1. **验证和测试** - 产品需要质量检验
2. **产能爬坡** - 新线需要提前启动并逐步提升产能
3. **安全库存** - 建立缓冲以应对突发问题

---

## 🎯 核心规则

### 规则 0: 法定节假日不出货 (No Shipment on Holidays) ⭐ 最高优先级

```
法定节假日约束：
- ❌ No Input (不投入)
- ❌ No Output (不产出)
- ❌ No Shipment (不出货)

原因：
- 法定节假日通常不安排生产（除非紧急情况需要加班）
- 物流系统也通常不运作
- 需要遵守劳动法规定
```

**实施逻辑**：
```javascript
IF (current_date is a statutory holiday) THEN:
  daily_input = 0;
  daily_output = 0;
  daily_shipment = 0;  // 关键：即使有库存也不能出货
END IF
```

**Holiday Calendar 来源**：
- 系统从 `countryHolidays` 配置读取
- 每个站点根据其所在国家应用对应的法定节假日
- 例如：CN站点应用中国法定节假日，VN站点应用越南法定节假日

---

### 规则 1: 不能提前出货 (No Early Shipment)

```
✅ 正确理解：
- Forecast 从 9月26日 开始
- 生产从 8月30日 开始（提前27天）
- 8月30日 - 9月25日：生产累积库存，但 Shipment = 0
- 9月26日起：开始出货

❌ 错误理解：
- 一旦生产就立即出货
- 提前的生产会提前出货
```

**实施逻辑**：
```javascript
const firstForecastDate = '2026-09-26'; // 从 forecast 数据中获取第一个 week 的日期

IF (current_date < firstForecastDate) THEN:
  daily_shipment = 0;  // 不能提前出货
  inventory_accumulated += daily_output; // 累积库存
ELSE:
  // 按照后续规则处理出货
END IF
```

---

### 规则 2: Shipment Lag 按工作日计算 (Shipment Lag = 2 Working Days) ⭐ 新增

```
出货延迟逻辑：
- Shipment Date = Output Date + 2 working days
- 工作日定义：排除周日和法定节假日
- 即使产出完成，也需要 2 个工作日后才能出货

原因：
- 质检、包装需要时间
- 物流安排需要提前期
- 确保产品质量稳定
```

**计算示例**：
```
假设：Output Date = 2026-09-26 (Thursday)

情况 1: 正常工作日
  - Output: 2026-09-26 (Thu)
  - +1 working day: 2026-09-27 (Fri)
  - +2 working days: 2026-09-28 (Sat) → 工作日
  - Shipment Ready: 2026-09-28 (Sat)

情况 2: 遇到周日
  - Output: 2026-09-27 (Fri)
  - +1 working day: 2026-09-28 (Sat)
  - +2 working days: 跳过 2026-09-29 (Sun)
  - Shipment Ready: 2026-09-30 (Mon)

情况 3: 遇到法定节假日（例如国庆 10/1-10/7）
  - Output: 2026-09-28 (Sat)
  - +1 working day: 跳过周日，2026-09-30 (Mon)
  - +2 working days: 跳过 10/1-10/7，2026-10-08 (Thu)
  - Shipment Ready: 2026-10-08 (Thu)
```

**实施逻辑**：
```javascript
function calculateShipmentDate(outputDate, shipmentLagWorkdays, calendar) {
  let currentDate = outputDate;
  let workdaysAdded = 0;

  while (workdaysAdded < shipmentLagWorkdays) {
    currentDate = addOneDay(currentDate);

    // 跳过周日
    if (isSunday(currentDate)) continue;

    // 跳过法定节假日
    if (isStatutoryHoliday(currentDate, calendar)) continue;

    workdaysAdded++;
  }

  return currentDate;
}
```

---

### 规则 3: 每日最大出货量限制 (Daily Max Shipment Cap)

```
每个站点/线体有物理出货能力限制：
- 默认每天最大出货量 = 30,000 units
- 超过此限制无法当天出货（物流、包装能力限制）
- 可在配置中调整此值
```

**配置方式**：
```javascript
// 在 Program 配置中
{
  max_daily_shipment: 30000  // units per day (可调整)
}
```

**作用**：
- 即使有大量库存，每天也不能超过此限制
- 用于平滑出货曲线
- 避免物流系统过载

---

### 规则 4: 库存清空策略 - 尽量出完 (Aggressive Inventory Depletion) ⭐ 核心策略

#### 场景描述：
```
示例：
- 生产日期：8月30日 - 9月25日（27天）
- 累积产出：90,000 units
- Forecast 开始日期：9月26日
- 每日最大出货量：30,000 units
- 每日新产出：5,000 units
```

#### 出货逻辑：

**Phase 1: 清空累积库存（9月26日起）**
```
9月26日：
  - 可出货库存 = 90,000 (累积) + 5,000 (当日产出) = 95,000
  - 实际出货 = min(95,000, 30,000, 当日需求) = 30,000
  - 剩余库存 = 95,000 - 30,000 = 65,000

9月27日：
  - 可出货库存 = 65,000 (昨日剩余) + 5,000 (当日产出) = 70,000
  - 实际出货 = min(70,000, 30,000, 当日需求) = 30,000
  - 剩余库存 = 70,000 - 30,000 = 40,000

9月28日：
  - 可出货库存 = 40,000 (昨日剩余) + 5,000 (当日产出) = 45,000
  - 实际出货 = min(45,000, 30,000, 当日需求) = 30,000
  - 剩余库存 = 45,000 - 30,000 = 15,000

9月29日：
  - 可出货库存 = 15,000 (昨日剩余) + 5,000 (当日产出) = 20,000
  - 实际出货 = min(20,000, 30,000, 当日需求) = 20,000  # 库存清完
  - 剩余库存 = 0
```

**Phase 2: 跟随日产出（库存清完后）**
```
9月30日起：
  - 可出货库存 = 0 (昨日剩余) + 5,000 (当日产出) = 5,000
  - 实际出货 = min(5,000, 30,000, 当日需求) = 5,000
  - 剩余库存 = 0

此后每天：
  - 出货量 = min(当日产出, 30,000, 当日需求)
  - 除非当日产出 > 30,000，才需要再次累积库存
```

---

## 📊 计算公式

### Daily Shipment Calculation (每日出货计算) - 完整版

```javascript
function calculateDailyShipment(date, cumOutput, cumShipment, config, calendar) {
  const firstForecastDate = config.shipmentStartDate || getFirstForecastDate(config.weeklyDemand);
  const maxDailyShipment = config.max_daily_shipment || 30000;

  // ========================================
  // 规则 0: 法定节假日不出货（最高优先级）
  // ========================================
  if (isStatutoryHoliday(date, calendar)) {
    return 0;
  }

  // ========================================
  // 规则 1: 不能提前出货
  // ========================================
  if (date < firstForecastDate) {
    return 0;
  }

  // ========================================
  // 规则 2: 计算可出货的库存（考虑 Shipment Lag）
  // ========================================
  // 只有 Output Date + 2 working days 之前的产出才能出货
  const shipmentLag = config.shipment_lag_workdays || 2;
  const outputCutoffDate = subtractWorkingDays(date, shipmentLag, calendar);

  // 计算截止日期前的累计产出
  const eligibleOutput = getCumulativeOutputUpToDate(outputCutoffDate);
  const availableInventory = eligibleOutput - cumShipment;

  if (availableInventory <= 0) {
    return 0; // 没有可出货的库存
  }

  // ========================================
  // 规则 3 & 4: 尽量出完，但不超过最大出货量
  // ========================================
  const shipment = Math.min(
    availableInventory,   // 可用库存（尽量清空）
    maxDailyShipment      // 每日最大出货能力
    // 注意：不限制 dailyDemand，允许超发以清空库存
  );

  return shipment;
}
```

**关键逻辑说明**：

1. **法定节假日优先检查**：
   - 即使有再多库存，法定节假日 shipment = 0
   - 这是硬性约束，不能被覆盖

2. **Shipment Lag 按工作日计算**：
   - 例如：今天是 10/8，shipment lag = 2 working days
   - 只能出 10/6 及之前产出的货
   - 如果 10/1-10/7 是国庆假期，则只能出 9/30 及之前的产出

3. **尽量清空库存**：
   - 不考虑 daily demand 限制
   - 只要有库存 + 没超过 max daily shipment → 全部出货
   - 这样可以快速消耗提前生产的库存

4. **不超发**（可选规则，根据业务需要启用）：
   ```javascript
   // 如果需要限制不超过需求，添加：
   const dailyDemand = getDailyDemandForDate(date);
   const shipment = Math.min(
     availableInventory,
     maxDailyShipment,
     dailyDemand  // 新增：不超发
   );
   ```
```

### Weekly Aggregation Logic (周度汇总逻辑)

```javascript
function aggregateWeeklyShipment(dailyShipments, weekDates) {
  // 简单累加每日出货量
  return dailyShipments
    .filter(d => weekDates.includes(d.date))
    .reduce((sum, d) => sum + d.shipment, 0);
}
```

---

## 🔍 对比逻辑：Cumulative 优先

### 为什么用 Cumulative 对比？

**原因 1: 提前生产的时间差**
```
- 生产开始日：8月30日
- 需求开始日：9月26日
- 时间差：27天

如果用每日对比：
  - 8月30日 - 9月25日：Gap 全是负数（因为有产出但没需求）
  - 9月26日起：Gap 突然变正（因为开始出货了）

→ 无法准确评估真实缺口
```

**原因 2: 累计值反映真实交付能力**
```
Cumulative Shipment vs Cumulative Demand:
  - 正值：超额交付，有库存缓冲
  - 零：刚好满足需求，零库存
  - 负值：缺货，需要评估恢复时间
```

**对比示例**：
```
Date        | Daily Output | Cum Output | Daily Shipment | Cum Shipment | Cum Demand | Cum Gap
----------- | ------------ | ---------- | -------------- | ------------ | ---------- | -------
2026-08-30  | 2,000        | 2,000      | 0              | 0            | 0          | 0
2026-09-01  | 3,000        | 5,000      | 0              | 0            | 0          | 0
...
2026-09-25  | 5,000        | 90,000     | 0              | 0            | 0          | 0
2026-09-26  | 5,000        | 95,000     | 30,000         | 30,000       | 32,000     | -2,000   # 略有缺口
2026-09-27  | 5,000        | 100,000    | 30,000         | 60,000       | 64,000     | -4,000   # 缺口扩大
2026-09-28  | 5,000        | 105,000    | 30,000         | 90,000       | 96,000     | -6,000   # 持续缺口
2026-09-29  | 5,000        | 110,000    | 20,000         | 110,000      | 128,000    | -18,000  # 库存清完，缺口明显
```

---

## 🚀 实施步骤

### Step 1: 修改 Validation 逻辑
```javascript
// ❌ 旧逻辑：Unconstrained 模式也检查 CTB
if (selectedMode === 'constrained' || selectedMode === 'combined') {
  if (!seedData.ctbDaily || seedData.ctbDaily.length === 0) {
    validationErrors.push('❌ CTB data is missing');
  }
}

// ✅ 新逻辑：Unconstrained 模式不检查 CTB
if (selectedMode === 'constrained') {
  if (!seedData.ctbDaily || seedData.ctbDaily.length === 0) {
    validationErrors.push('❌ CTB data is missing');
  }
}

// Combined 模式特殊处理
if (selectedMode === 'combined') {
  if (!seedData.ctbDaily || seedData.ctbDaily.length === 0) {
    validationErrors.push('⚠️ CTB data is missing. Combined mode will show Unconstrained scenario only.');
  }
}
```

### Step 2: 添加配置字段
```javascript
// 在 programConfig 中添加
{
  program_id: 'product_a',
  program_name: 'Product A',
  max_daily_shipment: 30000,  // 新增：每日最大出货量
  shipment_start_mode: 'first_forecast_date',  // 新增：出货开始模式
  // ... 其他配置
}
```

### Step 3: 修改 Shipment 计算逻辑
```javascript
// 在 production_plan_engine.js 中修改 calculateDailyShipment 函数
// 实现上述公式逻辑
```

### Step 4: 更新报表显示
```javascript
// 在 Daily Production Plan 表格中添加：
- Inventory (库存) 列
- Max Shipment Cap (最大出货量) 提示

// 在 Weekly Metrics 中强调：
- 使用 Cumulative Gap 作为主要指标
- Daily Gap 仅供参考
```

---

## ⚠️ 注意事项

### 1. Forecast 数据必须连续
```
如果 forecast 有间隙（例如只有偶数周的数据）：
  - 系统需要插值或报错
  - 建议：要求用户提供完整的周数据
```

### 2. 最大出货量的合理性
```
配置验证：
  - max_daily_shipment 应该 >= 日均需求
  - 否则永远无法满足需求

建议值：
  - 设为 Peak Daily Demand 的 1.5 - 2.0 倍
  - 例如：Peak = 20K，则 max = 30K - 40K
```

### 3. 库存过大的警告
```
如果提前生产导致库存过大（例如 > 7天需求）：
  - 系统应发出警告
  - 建议：调整生产开始日期或爬坡曲线
```

---

## 📈 测试案例

### Test Case 1: 跨越国庆假期的复杂场景 ⭐ 综合测试

```
配置：
  - 生产开始：2026-09-26 (Week W39 开始)
  - Forecast 开始：2026-09-26
  - 国庆假期：2026-10-01 ~ 2026-10-07 (7天)
  - Shipment Lag: 2 working days
  - Max Daily Shipment: 30,000 units
  - 每日产出：5,000 units (工作日)

日期详细流程：
---------------------------------------------------------------------------
Date        | Day  | Holiday? | Output | Cum Output | Shipment | Cum Ship | Notes
---------------------------------------------------------------------------
2026-09-26  | Fri  | No       | 5,000  | 5,000      | 0        | 0        | Lag不足，不能出货
2026-09-27  | Sat  | No       | 5,000  | 10,000     | 0        | 0        | Lag不足
2026-09-28  | Sat  | No       | 5,000  | 15,000     | 5,000    | 5,000    | 可出9/26的产出
2026-09-29  | Sun  | -        | 0      | 15,000     | 0        | 5,000    | 周日不生产不出货
2026-09-30  | Mon  | No       | 5,000  | 20,000     | 5,000    | 10,000   | 可出9/27的产出
2026-10-01  | Thu  | YES 🇨🇳  | 0      | 20,000     | 0        | 10,000   | 国庆假期开始
2026-10-02  | Fri  | YES 🇨🇳  | 0      | 20,000     | 0        | 10,000   | 国庆
2026-10-03  | Sat  | YES 🇨🇳  | 0      | 20,000     | 0        | 10,000   | 国庆
2026-10-04  | Sun  | YES 🇨🇳  | 0      | 20,000     | 0        | 10,000   | 国庆+周日
2026-10-05  | Mon  | YES 🇨🇳  | 0      | 20,000     | 0        | 10,000   | 国庆
2026-10-06  | Tue  | YES 🇨🇳  | 0      | 20,000     | 0        | 10,000   | 国庆
2026-10-07  | Wed  | YES 🇨🇳  | 0      | 20,000     | 0        | 10,000   | 国庆最后一天
2026-10-08  | Thu  | No       | 5,000  | 25,000     | 10,000   | 20,000   | 恢复生产，出9/28+9/30的库存
2026-10-09  | Fri  | No       | 5,000  | 30,000     | 5,000    | 25,000   | 出10/8的产出（lag=2）
---------------------------------------------------------------------------

关键点：
1. ✅ 国庆期间：No Output, No Shipment
2. ✅ Shipment Lag 计算跳过国庆假期
3. ✅ 10/8 可以出货 10,000（积累的 9/28 和 9/30 的产出）
4. ✅ 每日出货不超过 30K
```

---

### Test Case 2: 基本场景（无假期干扰）
```
配置：
  - 生产开始：8月30日
  - Forecast 开始：9月26日（Week 2026-W39）
  - 每日产出：5,000 units
  - 每日最大出货：30,000 units
  - 周需求：32,000 units (约 5,333/天)

预期结果：
  - 8月30日 - 9月25日：Shipment = 0，库存累积至 ~90K
  - 9月26日 - 9月29日：Shipment = 30K/天，清空库存
  - 9月30日起：Shipment = 5K/天（跟随产出）
  - Cumulative Gap：始终为负（产能不足）
```

### Test Case 2: 产能充足场景
```
配置：
  - 每日产出：10,000 units
  - 每日最大出货：30,000 units
  - 周需求：32,000 units (约 5,333/天)

预期结果：
  - 前期库存累积
  - 清空库存后，每日出货 5,333（跟随需求，不超发）
  - 剩余 4,667 继续累积库存
  - Cumulative Gap：逐渐变正（有缓冲库存）
```

---

## 🛠️ 辅助函数实现

### Working Days 相关函数

```javascript
/**
 * 判断日期是否为法定节假日
 */
function isStatutoryHoliday(date, countryHolidays, siteCountry) {
  const holidays = countryHolidays[siteCountry] || [];

  for (const holiday of holidays) {
    if (isDateInRange(date, holiday.start, holiday.end)) {
      return true;
    }
  }

  return false;
}

/**
 * 判断日期是否为工作日
 */
function isWorkingDay(date, countryHolidays, siteCountry) {
  // 周日不是工作日
  if (isSunday(date)) return false;

  // 法定节假日不是工作日
  if (isStatutoryHoliday(date, countryHolidays, siteCountry)) return false;

  return true;
}

/**
 * 向前减去 N 个工作日
 * 用于计算 Shipment Lag
 */
function subtractWorkingDays(date, workdays, countryHolidays, siteCountry) {
  let currentDate = new Date(date);
  let workdaysSubtracted = 0;

  while (workdaysSubtracted < workdays) {
    currentDate.setDate(currentDate.getDate() - 1); // 减一天

    if (isWorkingDay(currentDate, countryHolidays, siteCountry)) {
      workdaysSubtracted++;
    }
  }

  return formatDate(currentDate); // 返回 'YYYY-MM-DD'
}

/**
 * 向后加上 N 个工作日
 */
function addWorkingDays(date, workdays, countryHolidays, siteCountry) {
  let currentDate = new Date(date);
  let workdaysAdded = 0;

  while (workdaysAdded < workdays) {
    currentDate.setDate(currentDate.getDate() + 1); // 加一天

    if (isWorkingDay(currentDate, countryHolidays, siteCountry)) {
      workdaysAdded++;
    }
  }

  return formatDate(currentDate);
}
```

### Shipment 完整计算逻辑

```javascript
/**
 * 计算每日出货量（完整实现）
 */
function calculateDailyShipment({
  date,                 // 当前日期
  cumOutput,            // 累计产出
  cumShipment,          // 累计出货
  dailyOutputByDate,    // 每日产出数据 {date: qty}
  config,               // 配置 {max_daily_shipment, shipment_lag_workdays, shipment_start_date}
  countryHolidays,      // 法定节假日配置
  siteCountry           // 站点所在国家 'CN' or 'VN'
}) {
  // ========================================
  // 规则 0: 法定节假日不出货
  // ========================================
  if (isStatutoryHoliday(date, countryHolidays, siteCountry)) {
    return 0;
  }

  // ========================================
  // 规则 1: 不能提前出货
  // ========================================
  const shipmentStartDate = config.shipment_start_date || getFirstForecastDate();
  if (date < shipmentStartDate) {
    return 0;
  }

  // ========================================
  // 规则 2: 计算可出货的库存（考虑 Lag）
  // ========================================
  const shipmentLag = config.shipment_lag_workdays || 2;
  const outputCutoffDate = subtractWorkingDays(date, shipmentLag, countryHolidays, siteCountry);

  // 计算截止日期前的累计产出
  let eligibleOutput = 0;
  for (const [outputDate, qty] of Object.entries(dailyOutputByDate)) {
    if (outputDate <= outputCutoffDate) {
      eligibleOutput += qty;
    }
  }

  const availableInventory = eligibleOutput - cumShipment;
  if (availableInventory <= 0) {
    return 0;
  }

  // ========================================
  // 规则 3 & 4: 尽量出完，但不超过最大出货量
  // ========================================
  const maxDailyShipment = config.max_daily_shipment || 30000;
  const shipment = Math.min(availableInventory, maxDailyShipment);

  return shipment;
}
```

---

## 🔗 相关文档

- `PRODUCTION_CAPACITY_PLANNING_RULES.md` - Shipment 基础规则（第 53-64 行）
- `PRODUCTION_PLAN_GENERATION_LOGIC.md` - 计算公式和数据结构
- `production_plan_engine.js` - 实施代码位置

---

## 📝 实施检查清单

在实现 Shipment Logic 时，请确保：

- [ ] **法定节假日检查**：读取 `countryHolidays` 配置
- [ ] **周日检查**：`isSunday(date)` 正确实现
- [ ] **工作日计算**：`subtractWorkingDays()` 跳过周日和假期
- [ ] **Shipment Lag**：从配置读取 `shipment_lag_workdays`（默认2天）
- [ ] **Max Daily Shipment**：从配置读取 `max_daily_shipment`（默认30K）
- [ ] **Shipment Start Date**：支持手动设置或自动从 forecast 获取
- [ ] **库存清空策略**：优先出货，不限制 demand
- [ ] **Cumulative 验证**：`Cum Shipment ≤ Cum Output` 始终成立
- [ ] **日志输出**：清晰记录每日出货决策过程

---

---

## 🏭 Output 计算逻辑增强

### 首日产出50%规则

**业务背景**：
- 每条生产线第一天没有在制品（WIP），导致产出减半
- 后续每天正常：output = input × yield_curve_factor

**计算规则**：
```javascript
// 判断是否为该shift的第一个工作日
const isFirstWorkday = (current_date === shift.ramp_start_date);

if (isFirstWorkday) {
  output = input × yield_curve_factor × 0.5;  // 首日打5折
} else {
  output = input × yield_curve_factor;        // 正常计算
}
```

**实施逻辑**：
```javascript
function calculateDailyOutput(unit, date, input, yieldFactor) {
  // 检查是否为该unit的第一个工作日
  const isFirstDay = (date === unit.ramp_start_date);

  // 计算基础产出
  const baseOutput = input * yieldFactor;

  // 首日打5折
  const output = isFirstDay ? baseOutput * 0.5 : baseOutput;

  return output;
}
```

**配置来源**：
- `ramp_start_date` 从 Capacity Configuration 中每个 shift 的配置读取
- 例如：WF_L1_DAY 的 ramp_start_date = "2026-09-03"

---

## 💰 法定节假日3倍工资逻辑

### 核心概念

**3倍工资定义**：
- 真正的法定节假日（如国庆10/1-10/3）= 3倍工资
- 周末调休的天数 = 2倍工资（按周末计算）
- 法定节假日从凌晨00:00开始计算

**2026年3倍工资日期清单**：
```
元旦：    2026-01-01
春节：    2026-02-16, 2026-02-17, 2026-02-18, 2026-02-19
清明：    2026-04-04
劳动节：  2026-05-01, 2026-05-02, 2026-05-03
端午：    2026-06-19
中秋：    2026-09-25
国庆：    2026-10-01, 2026-10-02, 2026-10-03
2027元旦：2027-01-01
```

### 前夜晚班排产规则

**业务逻辑**：
- 法定节假日从凌晨00:00开始 → 前一天晚班12点后不能上班
- 前一天晚班只能上4小时（例如：18:00-22:00）
- 晚班 **不投入新料**（input = 0），只清理在制品（output = 4小时）

**适用条件**：
```
IF (明天是3倍工资的法定节假日) AND (今天不是周日) THEN:
  今天晚班：
    - Shift Hours: 10 → 4 小时
    - Input Hours: 0 小时（不投入新料，开始清WIP）
    - Output Hours: 4 小时（清理在制品）
END IF
```

**示例**：
```
中秋节：2026-09-25（3倍工资）
前一天：2026-09-24（周三，正常工作日）

排产调整：
  - 9/24 白班：正常10小时 input + output
  - 9/24 晚班：
      * Shift Hours: 4小时（18:00-22:00）
      * Input: 0 小时（不投新料）
      * Output: 4 小时（清WIP）
  - 9/25 全天：放假，无生产
```

**Holiday Calendar 数据结构**：
```javascript
{
  name: "中秋节 (Mid-Autumn Festival)",
  start: "2026-09-25",
  end: "2026-09-27",
  total_days: 3,
  triple_pay_dates: ["2026-09-25"],  // 新增：3倍工资日期
  eve_night_shift: {                  // 新增：前夜晚班配置
    date: "2026-09-24",
    input_hours: 0,    // 可自定义
    output_hours: 4    // 可自定义
  }
}
```

### 加班Override逻辑

**手动覆盖规则**：
- 默认法定节假日不排产
- 用户可在 Holiday Calendar Management 中手动设置加班日期
- 设置加班后，系统按照override配置计算

**实施逻辑**：
```javascript
function shouldWorkOnHoliday(date, holidayOverrides) {
  // 检查是否有手动override
  if (holidayOverrides[date]) {
    return holidayOverrides[date].working === true;
  }

  // 默认法定节假日不工作
  return false;
}
```

---

## 📦 Inventory Audit（库存盘点）逻辑

### 业务背景
- 海关和财务要求：半年期库存盘点
- 盘点期间：**完全停产**（no input, no output, no shipment）

### 默认配置（2026年）

```javascript
inventory_audit: {
  middle_year: {
    days: 1,
    dates: ["2026-06-30"]
  },
  end_year: {
    days: 1,
    dates: ["2026-12-31"]
  }
}
```

**可配置性**：
- 天数可选：1天或2天
- 日期可自定义
- 选择天数后动态生成日期输入框

### 计算逻辑

```javascript
function isInventoryAuditDate(date, inventoryAuditConfig) {
  const allAuditDates = [
    ...inventoryAuditConfig.middle_year.dates,
    ...inventoryAuditConfig.end_year.dates
  ];

  return allAuditDates.includes(date);
}

// 在生产计算中应用
if (isInventoryAuditDate(current_date, config.inventory_audit)) {
  daily_input = 0;
  daily_output = 0;
  daily_shipment = 0;  // 完全停产
}
```

---

## 🎯 Simulation 项目管理系统

### 业务需求

**当前问题**：
- 所有 simulation 独立存在
- 无法对比同一条件下不同变量的影响

**新系统设计**：
- 引入 **Project** 概念
- 一个 Project = 同一大条件下的多个 simulation 变体
- 支持横向对比不同配置的影响

### 数据结构

```javascript
// Project 结构
{
  id: "proj_001",
  name: "2026 Q3-Q4 Production Plan",
  created_at: "2026-02-07",
  base_conditions: {
    forecast: {...},
    ctb: {...},
    sites: [...],
    program: {...}
  },
  simulations: [
    {
      id: "sim_001",
      name: "Baseline - No Holiday OT",
      config_diff: {},  // 与base_conditions的差异
      results: {
        total_output: 386013,
        attainment: 117.6,
        weeks_with_gap: 3
      }
    },
    {
      id: "sim_002",
      name: "National Day +1 Day OT",
      config_diff: {
        holiday_overrides: {
          "2026-10-01": { working: true, shifts: ["day"] }
        }
      },
      results: {
        total_output: 391000,
        attainment: 119.0,
        weeks_with_gap: 2
      }
    }
  ]
}
```

### 用户流程

**创建新 Simulation 的两种方式**：

**方式1: 手动调整配置**
```
1. 在现有 simulation 基础上点击 "Create Variant"
2. 系统弹出对话框：
   - 选项1：手动调整配置变量
   - 选项2：AI自然语言输入（placeholder）
3. 选择 "手动调整"
4. 系统引导到相应配置页面
5. 调整完成后点击 "Generate Report"
6. 新 simulation 添加到当前 Project
```

**方式2: AI辅助（Future）**
```
1. 在现有 simulation 基础上点击 "Create Variant"
2. 选择 "AI自然语言输入"
3. 输入需求，例如：
   - "把国庆加班从1天调到3天"
   - "Line 2开线时间提前1周"
   - "使用fast_20d curve"
4. AI解析后弹出确认框：
   - 显示具体变更内容
   - 用户确认或修改
5. 确认后自动change config 或引导到配置页面
6. Generate Report，新simulation加入Project
```

### 对比界面

```
项目名称：2026 Q3-Q4 Production Plan
基础条件：Product A | Forecast W39-W01 | WF+VN02

┌─────────────────────────────────────────────────────────────┐
│ Simulation 对比                                              │
├─────────────────────────────────────────────────────────────┤
│                    │ Baseline    │ ND +1d OT  │ ND +3d OT  │
│ Total Output       │ 386,013     │ 391,000    │ 398,500    │
│ Attainment         │ 117.6%      │ 119.0%     │ 121.2%     │
│ Weeks w/ Gap       │ 3           │ 2          │ 1          │
│ Config Diff        │ -           │ +1d 10/1   │ +3d 10/1-3 │
└─────────────────────────────────────────────────────────────┘
```

### UI组件

**Generate Report 按钮升级**：
```
Before: [ Generate Report ]

After:  [ Generate Report ▼ ]
        ├─ 独立 Simulation
        ├─ 新建 Project
        └─ 添加到现有 Project
```

**AI对话框 Placeholder**：
```html
<div class="ai-dialog-placeholder">
  <div class="bg-gradient-to-r from-purple-100 to-blue-100 p-6 rounded-xl">
    <h3>🤖 AI配置助手（即将推出）</h3>
    <p>未来可通过自然语言调整配置变量</p>
    <textarea disabled placeholder="例如：把国庆加班从1天调到3天"></textarea>
    <button disabled>分析并应用</button>
  </div>
</div>
```

---

## 📝 实施优先级

### Phase 1: 核心逻辑（高优先级）
1. ✅ Output首日50%规则
2. ✅ 法定节假日前夜晚班逻辑（0 input, 4h output）
3. ✅ Inventory Audit完全停产逻辑
4. ✅ 3倍工资日期配置和标注

### Phase 2: 配置界面（中优先级）
5. ✅ Holiday Calendar UI增强（3倍工资标记 + 前夜配置）
6. ✅ Working Parameters添加Inventory Audit
7. ✅ Save功能和change detection

### Phase 3: 项目管理（中低优先级）
8. 🔄 Simulation Library项目结构
9. 🔄 项目对比界面
10. 🔄 手动配置调整流程

### Phase 4: AI功能（低优先级，Placeholder）
11. ⏳ AI对话框UI（仅placeholder）
12. ⏳ AI自然语言解析（未来功能）

---

**文档作者**: Claude Code
**基于**: 用户业务需求整理
**最后更新**: 2026-02-07
**状态**: ✅ 完整规则文档（含新需求），待实施
