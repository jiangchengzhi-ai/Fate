---
version: 2.6
name: wenhe-paper
description: 问鹤 · 五门问事的第二版视觉系统。以宣纸为底、墨字为骨、朱砂为印、赭石为界，把第一版的"墨玉夜读"改为"白天读纸"。目标用户是 35–70 岁的普通人，所以字号更大、对比更高、装饰更少；传统感来自纸张、留白与印章，而不是暗色、金色或混用字族。
colors:
  canvas: "#F6F1E6"
  canvas-deep: "#EFE7D6"
  surface: "#FBF7EE"
  surface-sunken: "#F2EBDC"
  ink: "#241F17"
  body: "#3B342A"
  muted: "#6B6253"
  muted-soft: "#8A8171"
  hairline: "#DCD2BE"
  hairline-strong: "#C9BCA2"
  brass: "#8C6B3F"
  brass-hi: "#A9854F"
  brass-faint: "rgba(140,107,63,0.10)"
  cinnabar: "#A33B2B"
  cinnabar-deep: "#8B2F22"
  seal: "#9C3325"
  on-seal: "#FBF7EE"
  success: "#4F7A5A"
  warning: "#B07A2A"
  error: "#A33B2B"
typography:
  display:
    fontFamily: "PingFang SC, HarmonyOS Sans SC, Noto Sans CJK SC, Microsoft YaHei, system-ui, sans-serif"
    fontSize: 30px
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: 0.12em
  title:
    fontFamily: "PingFang SC, HarmonyOS Sans SC, Noto Sans CJK SC, Microsoft YaHei, system-ui, sans-serif"
    fontSize: 21px
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: 0.08em
  subtitle:
    fontFamily: "PingFang SC, HarmonyOS Sans SC, Noto Sans CJK SC, Microsoft YaHei, system-ui, sans-serif"
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0.06em
  body:
    fontFamily: "PingFang SC, HarmonyOS Sans SC, Noto Sans CJK SC, Microsoft YaHei, system-ui, sans-serif"
    fontSize: 17px
    fontWeight: 400
    lineHeight: 1.85
    letterSpacing: 0.01em
  label:
    fontFamily: "PingFang SC, HarmonyOS Sans SC, Noto Sans CJK SC, Microsoft YaHei, system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0.06em
  caption:
    fontFamily: "PingFang SC, HarmonyOS Sans SC, Noto Sans CJK SC, Microsoft YaHei, system-ui, sans-serif"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0.02em
---

# 问鹤 · 五门问事 — Design System v2.6「宣纸」

> 品牌识别（标志、语气、应用）见 `BRAND.md`；本文件只管界面与组件。
>
> **视觉实现的唯一权威文件是 `assets/theme-paper.css`。** 本文件是它的文档镜像；两者冲突时以 CSS 为准，并回头修正本文件。

## Overview

第一版是给夜里静心读的：墨玉底、黄铜线、宣纸批注，气质对，但对 35–70 岁用户不友好——暗底看久了累，金色小字在室外几乎看不见。

第二版把同一个世界翻到白天：**同一套朱砂与留白，换一张宣纸**。

- 底：宣纸暖白 `#F6F1E6`，不是纯白。纯白刺眼，暖白像纸。
- 字：墨色 `#241F17`，正文 17px，行高 1.85。
- 界：赭石细线 `#8C6B3F`，只在需要分隔时出现。
- 印：朱砂 `#A33B2B`，只给主按钮、印章、关键数字。
- 装饰：几乎为零。纸张本身的纹理和留白就是装饰。

一句话：**像一本大字本的宣纸册子，不像一个道观网页。**

## Goals & Non-Goals

### Goals

- 让 35–70 岁、不熟悉术语的普通人在手机上**看得清、读得懂、不迷路**。
- 用一套单一黑体字族 + 六级字号，把层级讲清楚，不靠切换字体。
- 让视觉实现只有一个权威来源（CSS token），文档与工具配置都对齐它。

### Non-Goals

- 不做深色模式（产品为 light-only）。
- 不做炫技动效、不做入场特效作为常规交互（品牌开屏是唯一例外，见 Motion）。
- 不为装饰引入第三、第四种字体或金色。

## Colors

### 纸与面

| Token | CSS 变量 | Hex | 用途 |
| --- | --- | --- | --- |
| `canvas` | `--paper` | `#F6F1E6` | 页面底色 |
| `canvas-deep` | `--paper-2` | `#EFE7D6` | 分区、页脚 |
| `surface` | `--ink-2` | `#FBF7EE` | 卡片、输入框底色 |
| `surface-sunken` | `--ink-3` | `#F2EBDC` | 凹陷区、引用 |

### 墨与字

| Token | CSS 变量 | Hex | 用途 |
| --- | --- | --- | --- |
| `ink` | `--text` | `#241F17` | 标题、正文强调 |
| `body` | `--text-2` | `#3B342A` | 正文 |
| `muted` | `--text-3` | `#6B6253` | 说明、辅助（可作正文级文字） |
| `muted-soft` | （无 token，仅文档保留） | `#8A8171` | 仅限大字或非文字装饰；**不作小字正文** |

> **命名说明**：文档 token `ink`（墨字）在 `theme-paper.css` 里对应 `--text`，而 `--ink` 在该文件里指纸色（历史变量名）。二者语义相反，故下表以 CSS 变量名为准；新代码一律用 `--text` 表示字色、`--paper` 表示纸色，不再使用含义含混的 `--ink`。

### 界与印

| Token | CSS 变量 | Hex | 用途 |
| --- | --- | --- | --- |
| `hairline` | `--line` | `#DCD2BE` | 分隔线、卡片描边 |
| `hairline-strong` | `--line-strong` | `#C9BCA2` | 输入框、需要抓眼的边 |
| `brass` | `--brass` | `#8C6B3F` | 眉题、序号、细线 |
| `brass-hi` | `--brass-hi` | `#A9854F` | 强调文字（**仅 ≥18px 大字**或图形；小字用它会不过 AA） |
| `cinnabar` | `--cinnabar` | `#A33B2B` | 主按钮、印章、关键数字 |
| `seal` | `--seal` | `#9C3325` | 印章底 |

### 语义

`success #4F7A5A`、`warning #B07A2A`、`error #A33B2B`。只用于状态，不做装饰。

### 对比度（实测，对宣纸底 `#F6F1E6`）

| 前景 | 对比度 | 判定 | 可用范围 |
| --- | --- | --- | --- |
| `--text` `#241F17` | ≈ 10.9:1 | AAA | 任意字号正文 |
| `--text-2` `#3B342A` | ≈ 10.0:1 | AAA | 任意字号正文 |
| `--text-3` `#6B6253` | ≈ 5.33:1 | AA | 正文与说明文字 |
| `--brass` `#8C6B3F` | ≈ 4.6:1 | AA（临界） | 正文可用；小字慎用 |
| `--muted-soft` `#8A8171` | ≈ 3.4:1 | 未达 AA | 仅大字 / 非文字装饰 |
| `--brass-hi` `#A9854F` | ≈ 3.0:1 | 未达 AA | 仅 ≥18px 大字 / 图形 |

## Typography

### 字体

- 全站统一黑体：苹方 / HarmonyOS Sans / 思源黑体 / 微软雅黑
- 标题与正文同族，层级靠字号 / 字重 / 字距 / 颜色拉开，不切换字族
- 数字：与正文同族，不用等宽字体
- 自 v2.3 起废弃「标题宋体、正文黑体」双字族方案；Logo 字标仍用宋体（属标志图形，见 BRAND.md）
- frontmatter 与下方层级表的每一级 `fontFamily` 必须一致；不得出现 `Songti / STSong / serif`

### 层级

| 名称 | CSS 变量 | 字号 | 行高 | 字重 | 字距 | 字族 | 用途 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| display | `--fs-display` | 30px | 1.3 | 400 | 0.12em | 黑体 | 页面大标题 |
| title | `--fs-title` | 21px | 1.45 | 400 | 0.08em | 黑体 | 区块标题 |
| subtitle | `--fs-subtitle` | 18px | 1.6 | 400 | 0.06em | 黑体 | 卡片标题 |
| body | `--fs-body` | 17px | 1.85 | 400 | 0.01em | 黑体 | 正文 |
| label | `--fs-label` | 14px | 1.5 | 400 | 0.06em | 黑体 | 表单标签 |
| caption | `--fs-caption` | 13px | 1.6 | 400 | 0.02em | 黑体 | 注释、出处（下限） |

### 原则

1. **不缩字**。面向用户阅读的文字最小 13px，不再用 9px、10px。
2. 一屏最多三级字号，避免层级混乱。
3. 中文标点用全角，数字与中文之间不空格。
4. 标题不假粗体，靠字号与字距区分层级。
5. 常显区所有 HTML 文字遵守 13px 下限（含分数注解、三源对照、五行条、标签、注脚）。唯一例外：`<details>` 折叠区内的原始术语表。SVG 图形内的坐标标注（雷达/罗盘/命盘）已在 v2.7 通过「放大 viewBox 字号 + 放大渲染容器」提升到屏幕实际约 13–16px，坐标几何不动，见 Known Gaps。

## Layout

### 间距

基数 4px：4 / 8 / 12 / 16 / 24 / 32 / 48。
表单字段间距 24px；区块之间 32px；页面左右边距 20px（小屏 18px）。

### 栅格与容器

单列，最大宽度 480px（`--w`，`.shell{max-width:480px}`），居中。不做多列——手机上一列最稳。

### 留白

留白是正文的一部分。每个区块上下至少 24px；主按钮上方 32px。

## Elevation & Depth

不用重投影堆层次，用：

1. 纸色深浅（canvas → surface）
2. 1px 发丝线
3. 极轻的内阴影（输入框）

卡片可用 `rgba(36,31,23,.05)` 级柔和阴影 + 两点纸色渐层替代发丝线做分层（见下方「实现基线」）。浮动层（toast、相册预览）阴影规则：
`0 12px 32px rgba(36,31,23,0.12)`。

禁止：深色投影、发光、渐变文字。

## Shapes

### 圆角（实现基线）

- 卡片：20px（大圆角，对 35–70 岁更柔和）
- 输入框：14px
- 主/次按钮：999px（胶囊）
- 选项（时辰/性别）芯片：14px
- 印章、标签：4px
- 头像：50%

### 线条

描边统一 1px；选中态 1.5px；不用 2px 以上的粗边。

### 图像

照片不加滤镜、不加边框；需要解释时在下方加一行 caption。

## Components

> 下方为规范形制。`theme-paper.css` 中已交付的组件一并登记，避免遗漏产生第二套实现。

### 顶栏

高 56px，左侧品牌（圆环 + 问鹤），右侧一个文字链接。底部 1px 发丝线，背景 `rgba(246,241,230,0.94)`，滚动时轻微模糊。

### 按钮

- 主按钮：朱砂底、纸色字、999px 胶囊、高 52px、字号 17px、字距 0.12em。
- 次按钮：透明底、赭石描边、墨字、胶囊。
- 危险/重置：仅文字，朱砂色。

### 卡片

`surface` 底、1px `hairline`、20px 圆角、内边距 18–20px。卡片之间 12px。可带纸色微渐层与 0.05 柔和阴影，不加发丝线重描。

### 输入

`surface` 底、1px `hairline-strong`、14px 圆角、高 52px、内边距 14px。
聚焦时描边变 `brass`，不发光。

### 选项组（时辰/性别/历法）

等宽网格，高 ≥52px；选中：`brass-faint` 底 + `brass` 1.5px 边 + 墨字；未选中：纸底 + 发丝线。选中态不加角标、不加投影。

### 标签 / 印章

印章：朱砂底、纸色字、4px 圆角、字号 12px、字距 0.1em。
必填标记 `.req-tag`：赭石小字标，填好后变「已填」并淡化。

### 注解

左侧 2px 赭石竖线 + 14px 内边距，字号 14px，`muted` 色。

### 表单分区 `.form-block`

表单页把散落说明收成「模块卡片 + 折叠须知」：分区用 1px 发丝线框，赭石序号（一/二）带层次；须知收进 `<details class="detail-blocks">`，默认收起。

### 详细排盘折叠 `.detail-blocks`

专业表格、分数注解、原始术语默认收起；标题「详细排盘 · 想看术语再展开」。折叠区内小字可例外于 13px 下限。

### 开屏动画 `#splash`（品牌演绎例外）

墨鹤主标 + 问鹤字标 + 标语 + 问印落款，约 2.4 秒。属品牌标志演绎，**不受下方「常规界面动效」约束**，规则见 Motion。每个标签页会话只播一次，`?splash=1` 可强制重播，`prefers-reduced-motion` 下直接静态呈现。

## Motion & Interaction

### 原则（常规界面）

1. **慢一点，但别让人等**：所有反馈 ≤240ms；常规界面超过 300ms 的动画一律删掉。
2. **只动该动的**：不做入场炫技、不做视差、不做自动轮播。
3. **老人要看得见反馈**：按下必须变颜色，不能只靠位移 1px。
4. **拇指优先**：所有交互在单手持机、拇指可达区内完成。

> **品牌开屏例外**：`BRAND.md` 的开屏是标志演绎（墨晕扩散、鹤从墨中显形、朱砂点睛），限时约 2.4s，允许 scale / blur / rotate / 回弹，不套用上面的时长上限与「不旋转弹跳」条款。它只在会话首次进入出现，且随时可点击跳过；不属于常规交互反馈。

### 时长与曲线

| Token | 值 | 用途 |
| --- | --- | --- |
| `motion-fast` | 120ms | 按下、勾选 |
| `motion-base` | 180ms | hover、聚焦、颜色变化 |
| `motion-slow` | 240ms | 页面进入、弹层 |
| `ease-paper` | `cubic-bezier(.22,.61,.36,1)` | 默认曲线，收尾慢 |

### 状态反馈

- **按下**：底色加深一档 + 轻微缩到 `scale(.985)`，120ms。
- **选中**：底色 `brass-faint` + 1.5px 赭石边，180ms 渐变。
- **聚焦（键盘）**：2px 赭石外框，偏移 2px，只在 `:focus-visible` 出现。
- **禁用**：透明度 0.5，不响应点击，不加删除线。
- **加载**：按钮文案不变，右侧出现三点呼吸；`aria-busy="true"`。

### 页面与层级

- 页面进入：`opacity 0→1` + `translateY(6px)→0`，240ms。
- 底部弹层：从下往上 240ms，背景纸色 60% 遮罩。
- Toast：底部上移 12px 淡入，2.4s 后自动消失。
- 不做左右滑动切页——老人容易误触。

### 手势与触控

- 点击区域最小 48×48px；相邻可点元素间距 ≥8px。
- 不做长按、双击、滑动删除这类隐藏手势。
- 滚动不劫持；不锁定页面滚动。

### 无障碍

- 尊重 `prefers-reduced-motion: reduce`：关闭位移与缩放，只保留颜色变化；开屏直接静态呈现。
- 所有图标按钮必须有 `aria-label`。
- 表单错误用文字 + 颜色双重提示，不只靠红色。

### 反模式

- ❌ 骨架屏闪烁
- ❌ 按钮点击后无任何变化
- ❌ 常规界面超过 300ms 的转场（开屏例外）
- ❌ 用动画掩盖加载慢

## Do's and Don'ts

### Do

- 用暖白纸色，不用纯白。
- 正文 17px 起，行高 ≥1.8。
- 用 1px 线与纸色差分层。
- 朱砂只给"要做的事"和"印记"。
- 每屏留一处空白。
- 标志允许毛笔肌理（品牌例外）；界面本身仍不用纹理。

### Don't

- 不要暗底 + 金字的组合（第一版的问题）。
- 不要给卡片加发丝线 + 重投影叠加（微阴影可以）。
- 不要用纯黑 `#000` 和纯白 `#FFF`。
- 不要让面向阅读的正文小于 13px。
- 不要用超过两种强调色。

## Responsive Behavior

### 断点（以 `app.css` 实际为准）

- ≤379px：页面边距 18px，容器自适应；部分组件字号微调。
- 380–899px：默认（`--pad:20px`，容器最大 480px 居中）。
- ≥900px：容器仍 480px 居中，纸色底延伸，四周加一圈淡淡的暗角晕影（`inset box-shadow`），让宽屏上视线聚焦在中间的"纸"上。

### 触控

所有可点区域 ≥48×48px；表单控件高 52px；相邻可点元素间距 ≥8px。

### 折叠

高级项（手动经度、原始测量值、专业术语表）一律折叠进 `<details>`，默认收起。

## Alternatives Considered

- **两套字族（标题宋体 + 正文黑体）**：v2.2 曾采用，视觉上割裂，v2.3 废弃。单一黑体靠字号分层更统一。
- **480px vs 520px 容器**：曾考虑 520px，代码实际统一到 480px；文档已跟随代码。
- **开屏收敛到 240ms**：考虑过严格遵守界面动效上限，但品牌开屏承担仪式感与识别功能，定为独立例外，且可跳过、不受等待税。
- **保留深色模式**：产品为 light-only，放弃；如需另开分支。

## Risks & Mitigations

- **文档与代码再次漂移**：唯一权威是 `theme-paper.css`；本文件、`.impeccable/design.json` 均为镜像。修样式后须同步二者，并跑漂移检测。
- **低对比度 token 被误用**：`muted-soft`、`brass-hi` 未达 AA，已标注「仅大字/图形」；小字一律用 `--text-3` 及以上。
- **开屏的等待税**：约 2.4s；已支持点击跳过、会话只播一次、`prefers-reduced-motion` 静态化。若反馈偏慢，优先缩短停留而非删鹤。
- **常显区小字回潮**：新增报告样式时须走 13px 下限，专业术语只进折叠区。

## Iteration Guide

1. 先改 token，再改组件；不要在组件里写死颜色。
2. 新组件必须回答：它属于"纸、墨、界、印"哪一层。
3. 每次改完看三张图：首页、表单页、批注页。
4. 版本用 git tag 记录：`design-v2.6`。

## Known Gaps

- 深色模式未保留（产品 light-only）；如需要，另开 `design/v2-paper-dark` 分支。
- `app.css` 仍保留 v1 暗色「墨玉夜读」的基座变量，由 `theme-paper.css` 覆盖成浅色；这是历史包袱。加载顺序**必须先 `app.css` 后 `theme-paper.css`**，不可颠倒。中期应把暗色基座清理为一套浅色层。
- 专业排盘的原始术语表在 `<details>` 折叠区内沿用更小字号；常显区的 HTML 文字已统一到 13px 下限。
- SVG 图形内的坐标标注（v2.7 已整体放大，不再是小字例外）：几何坐标一律不动，改「提高 viewBox 内字号 + 放大渲染容器」两处，小屏由 `width:100%` 自动收缩。实测屏幕实际字号——雷达 `.radar .lab` 12px(viewBox)×1.15≈13.8px、`.val`≈12.6px；罗盘 `.cp-shan` 13–14px(viewBox)×1.125≈15px、`.cp-gua`≈14.6px；命盘 `.dial .gua` 15px、`.core-s` 10px。标签边界仍在 viewBox 内不裁切，页面零横向溢出。规则在 `theme-paper.css` 的「SVG 图形内嵌标注放大」段。时辰网格 `.hour span` 已是 11px 并随容器放大。纯装饰性序号前缀（`::before` 的「＋」、步骤圆点）仍不受约束。
- 常显区 HTML 阅读文字的下限执行由 `theme-paper.css` 末尾「常显区小字收口」段统一覆写 `app.css` 的历史小字；新增报告类样式时须把新选择器加进该段。

## Changelog

| 版本 | 日期 | 变更 |
| --- | --- | --- |
| 2.6 | 2026-11-21 | EGM 评审收敛：frontmatter/层级表统一黑体；补 token→CSS 映射与对比度分级；容器/断点对齐代码（480/379/18px）；开屏声明为品牌动效例外并登记组件；补齐 Goals/Non-Goals、Alternatives、Risks；删除「仅两处微调」双轨叙述；常显区小字统一 13px。 |
| 2.3 | 2026-11 | 废弃双字族，全站统一黑体。 |
| 2.0 | 2026-11 | 宣纸 v2 建立，替代 v1 墨玉夜读。 |
