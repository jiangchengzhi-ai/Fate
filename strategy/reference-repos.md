# 同类开源项目调研（GitHub）

> 调研时间：2026-11-17
> 目的：看别人怎么把"传统术数"写成工程，找出可以借鉴的架构与做法。
> 只学思路与结构，**不抄代码**；许可证见文末。

---

## 一、星标榜（按 stars 排序）

| 项目 | Stars | 语言 | 许可 | 是什么 |
| --- | --- | --- | --- | --- |
| Renhuai123/ziwei-doushu | 18.5k | TS | MIT | 紫微排盘引擎 + 知识库 + 数据集 |
| SylarLong/iztro | 4.4k | TS | MIT | 轻量紫微排盘库，被大量项目依赖 |
| jinchenma94/bazi-skill | 4.0k | Python | MIT | 八字排盘 + 九本经典分析（Claude Skill） |
| DestinyLinker/MingLi-Bench | 2.6k | Python | MIT | **评测基准**：160 题多选题，评 LLM 命理能力 |
| 6tail/lunar-javascript | 1.8k | JS | MIT | 历法库（公历/农历/干支/节气/八字/建除） |
| FANzR-arch/Numerologist_skills | 1.6k | Python | 无 | 反幻觉工程框架：奇门/紫微/八字 skill |
| china-testing/bazi | 1.6k | Python | 无 | 八字排盘 + 冲刑合会 + 经典评判 |
| hhszzzz/taibu | 777 | TS | 见仓库 | 命理 Agent，覆盖十几门 |
| Brhiza/mingyu | 582 | TS | AGPL-3.0 | 一站式工具包，输出结构化提示词 |
| ChesterRa/mingpan | 133 | TS | Apache-2.0 | **MCP 原生确定性排盘服务**（多门） |
| banderzhm/ZhouYiLab | 162 | C++ | MIT | 多门玄学计算引擎 |
| kentang2017/ichingshifa | 314 | Python | MIT | 六爻/京房易 |
| qfdk/qimen | 211 | JS | MIT | 奇门遁甲在线排盘 |
| Horace-Maxwell/Horosa | 451 | JS | AGPL-3.0 | 全能玄学工作站（多门） |

---

## 二、五种实现范式

### 范式 1：查表型历法库（6tail/lunar-*）

- 无依赖、单文件、按类拆分（Solar / Lunar / JieQi / EightChar / LiuYao…）
- 每个类一个测试文件（`__tests__/Solar.test.js` 等）
- 核心是**表 + 纯函数**，没有规则引擎

**可借鉴**：
- 历法单独成库，不掺业务
- 每个转换函数配一个测试，边界写死在测试里
- 单文件交付，便于离线包复用

### 范式 2：类型化排盘库（iztro）

- TypeScript，类型定义完整（星曜、宫位、四化都是类型）
- 数据表与算法分离（`data/` + `astro/`）
- 有文档站、i18n、npm 包、CHANGELOG

**可借鉴**：
- 用类型/TSDoc 把"术语字段"固定下来
- 数据与算法分离，改数据不改算法
- 对外只暴露少量函数（bySolar / byLunar）

### 范式 3：MCP 原生引擎（ChesterRa/mingpan）

- 排盘做成 MCP Server，AI 客户端直接调用
- 多门：八字、紫微、六爻、梅花、大六壬、奇门
- 有 CI、冒烟测试（stdio / remote）、版本校验脚本、Cloudflare Worker 部署

**可借鉴**：
- 引擎对外暴露成"工具"，而不是"网页"
- 每个 release 跑冒烟测试（stdio 与远程各一遍）
- 版本号写进返回体

### 范式 4：反幻觉工程框架（FANzR-arch/Numerologist_skills）

这是和我们理念最接近的一个。它的四条设计原则：

1. **先追问，再输出**：信息不全时优先补参数，不硬排盘
2. **确定性计算外包**：历法、排盘、结构化计算交给脚本
3. **先声明口径，再做结论**：流派、换日、闰月、默认规则都要说清楚
4. **只给结构化参考**：健康/法律/财务不替代专业建议

目录结构：

```
bazi/SKILL.md + references/*.md
qimen-dunjia/SKILL.md + references/*.md + scripts/*.py + tests/
ziwei-doushu/SKILL.md + references/*.md + scripts/*.py + tests/fixtures
```

**可借鉴**：
- 每门一份 `SKILL.md`（触发条件、工作流、输出约束）
- `references/` 放规则集、术语表、口径说明
- `scripts/` 放确定性计算，附测试
- 用 `fixtures/` 与 iztro 的结果做交叉校验

### 范式 5：评测基准（MingLi-Bench）

- 160 道多选题，来自黄历数据，2022–2025
- 用精确匹配打分，评 LLM 在八字/紫微上的能力

**可借鉴**：
- "AI 解读"也需要评测，不能只靠感觉
- 我们可以做小规模评测：给定盘 + 问题，检查输出是否与引擎结论一致、是否出现禁止表述

---

## 三、10 个可直接借鉴的做法

| # | 做法 | 出处 | 我们怎么用 |
| --- | --- | --- | --- |
| 1 | 历法单独成库，每函数一测试 | 6tail | `engine/calendar/` + fixtures |
| 2 | 数据表与算法分离 | iztro | `rules/data/*.json` |
| 3 | 对外只暴露少量入口函数 | iztro | `createEngine().chart()` |
| 4 | 先声明口径再结论 | Numerologist | 已有 `conventions` 字段 |
| 5 | 信息不全先追问 | Numerologist | 时辰未知 → 标注，不硬算 |
| 6 | 确定性计算交给脚本 | Numerologist | 已有；继续收口到 engine |
| 7 | 引擎做成 MCP/工具 | mingpan | 后续可暴露 MCP |
| 8 | 冒烟测试 + 版本校验 | mingpan | deploy 前跑 smoke |
| 9 | fixtures 交叉校验 | Numerologist | 用 iztro/lunar 的已知结果做对照 |
| 10 | 评测集评解读 | MingLi-Bench | 建 30 题小评测：事实一致性 + 禁止词 |

---

## 四、许可证红线

| 许可 | 能不能抄代码 | 说明 |
| --- | --- | --- |
| MIT | ✅ 可以，保留版权声明 | iztro、lunar-javascript、mingpan（Apache-2.0） |
| Apache-2.0 | ✅ 可以，保留 NOTICE | mingpan |
| AGPL-3.0 | ⚠️ 传染，商用需开源 | mingyu、Horosa —— **只学思路** |
| 无许可证 | ❌ 默认保留所有权利 | china-testing/bazi、Numerologist —— **只学思路** |

**结论**：MIT 的可以借鉴实现细节；AGPL/无证的只看结构，不复制代码。

---

## 五、对我们 engine 设计的修订

对照之后，原设计有三处要补：

### 1. 加"跨实现交叉校验"

不只和自己的黄金样本比，还要和 iztro / lunar-javascript 的已知结果比。
→ `fixtures/cross/`：同样输入，三方结果对照，差异必须能解释。

### 2. 规则参考文件化

借鉴 Numerologist 的 `references/`：
```
engine/rules/references/
├─ bazi-口径.md     换年/换日/闰月/早晚子时
├─ zeri-口径.md
└─ xiang-口径.md
```
代码读 JSON，人读 md，两边同源。

### 3. 加"解读评测"

借鉴 MingLi-Bench：
- 30 道题：给盘 + 问，检查回答是否
  - 数字/干支与引擎一致
  - 无预测性断言
  - 无医疗/投资/法律建议
  - 引文与库中原文一致
→ `tests/interpret.eval.mjs`，每次改 prompt 跑一遍

---

## 六、建议阅读顺序

1. `6tail/lunar-javascript` → 看历法怎么拆、怎么测
2. `SylarLong/iztro` → 看类型与数据分离
3. `FANzR-arch/Numerologist_skills` → 看 skill 结构与口径声明
4. `ChesterRa/mingpan` → 看引擎怎么服务化
5. `DestinyLinker/MingLi-Bench` → 看怎么评"解读"
6. `Renhuai123/ziwei-doushu` → 看知识库与数据规模（别学它的依赖）

---

## 七、一句话

> **这个领域已经有人把"排盘"写得很干净，但几乎没人把"口径 + 依据 + 评测"三件事同时做全。**
> 这正是我们可以补的位置。
