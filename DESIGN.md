---
version: 2.0
name: wenhe-paper
description: 问鹤 · 五门问事的第二版视觉系统。以宣纸为底、墨字为骨、朱砂为印、赭石为界，把第一版的"墨玉夜读"改为"白天读纸"。目标用户是 45 岁以上的普通人，所以字号更大、对比更高、装饰更少；传统感来自纸张、宋体与印章，而不是暗色与金色。
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
    fontFamily: "Songti SC, Songti TC, STSong, Noto Serif CJK SC, Source Han Serif SC, SimSun, serif"
    fontSize: 30px
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: 0.12em
  title:
    fontFamily: "Songti SC, STSong, Noto Serif CJK SC, serif"
    fontSize: 21px
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: 0.08em
  body:
    fontFamily: "PingFang SC, HarmonyOS Sans SC, Noto Sans CJK SC, Microsoft YaHei, system-ui, sans-serif"
    fontSize: 17px
    fontWeight: 400
    lineHeight: 1.85
    letterSpacing: 0.01em
  label:
    fontFamily: "PingFang SC, HarmonyOS Sans SC, Noto Sans CJK SC, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0.06em
  caption:
    fontFamily: "PingFang SC, HarmonyOS Sans SC, Noto Sans CJK SC, sans-serif"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0.02em
---

# 问鹤 · 五门问事 — Design System v2「宣纸」

> 品牌识别（标志、语气、应用）见 `BRAND.md`；本文件只管界面与组件。

## Overview

第一版是给夜里静心读的：墨玉底、黄铜线、宣纸批注，气质对，但对 45 岁以上用户不友好——暗底看久了累，金色小字在室外几乎看不见。

第二版把同一个世界翻到白天：**同一套朱砂与宋体，换一张宣纸**。

- 底：宣纸暖白 `#F6F1E6`，不是纯白。纯白刺眼，暖白像纸。
- 字：墨色 `#241F17`，正文 17px，行高 1.85。
- 界：赭石细线 `#8C6B3F`，只在需要分隔时出现。
- 印：朱砂 `#A33B2B`，只给主按钮、印章、关键数字。
- 装饰：几乎为零。纸张本身的纹理和留白就是装饰。

一句话：**像一本大字本的宣纸册子，不像一个道观网页。**

## Colors

### 纸与面

| Token | Hex | 用途 |
| --- | --- | --- |
| `canvas` | `#F6F1E6` | 页面底色 |
| `canvas-deep` | `#EFE7D6` | 分区、页脚 |
| `surface` | `#FBF7EE` | 卡片、输入框底色 |
| `surface-sunken` | `#F2EBDC` | 凹陷区、代码、引用 |

### 墨与字

| Token | Hex | 用途 |
| --- | --- | --- |
| `ink` | `#241F17` | 标题、正文强调 |
| `body` | `#3B342A` | 正文 |
| `muted` | `#6B6253` | 说明、辅助 |
| `muted-soft` | `#8A8171` | 页脚、极弱提示 |

正文对比度：`#3B342A` on `#F6F1E6` ≈ 9.6:1；说明文字 `#6B6253` ≈ 5.6:1，均高于 4.5:1。

### 界与印

| Token | Hex | 用途 |
| --- | --- | --- |
| `hairline` | `#DCD2BE` | 分隔线、卡片描边 |
| `hairline-strong` | `#C9BCA2` | 输入框、需要抓眼的边 |
| `brass` | `#8C6B3F` | 眉题、序号、细线 |
| `cinnabar` | `#A33B2B` | 主按钮、印章、关键数字 |
| `seal` | `#9C3325` | 印章底 |

### 语义

`success #4F7A5A`、`warning #B07A2A`、`error #A33B2B`。只用于状态，不做装饰。

## Typography

### 字体

- 标题：宋体（Songti SC / STSong / Noto Serif CJK SC）
- 正文：苹方 / HarmonyOS Sans / 思源黑体
- 数字：与正文同族，不用等宽字体

### 层级

| 名称 | 字号 | 行高 | 字重 | 字距 | 用途 |
| --- | --- | --- | --- | --- | --- |
| display | 30px | 1.3 | 400 | 0.12em | 页面大标题 |
| title | 21px | 1.45 | 400 | 0.08em | 区块标题 |
| subtitle | 18px | 1.6 | 400 | 0.06em | 卡片标题 |
| body | 17px | 1.85 | 400 | 0.01em | 正文 |
| label | 14px | 1.5 | 400 | 0.06em | 表单标签 |
| caption | 13px | 1.6 | 400 | 0.02em | 注释、出处 |

### 原则

1. **不缩字**。小字最小 13px，不再用 9px、10px。
2. 一屏最多三级字号，避免层级混乱。
3. 中文标点用全角，数字与中文之间不空格。
4. 标题不假粗体，靠字号与字距区分层级。

## Layout

### 间距

基数 4px：4 / 8 / 12 / 16 / 24 / 32 / 48。
表单字段间距 24px；区块之间 32px；页面左右边距 20px（小屏 16px）。

### 栅格与容器

单列，最大宽度 520px，居中。不做多列——手机上一列最稳。

### 留白

留白是正文的一部分。每个区块上下至少 24px；主按钮上方 32px。

## Elevation & Depth

不用投影堆层次，用：

1. 纸色深浅（canvas → surface）
2. 1px 发丝线
3. 极轻的内阴影（输入框）

阴影只出现在浮动层（toast、相册预览），规则：
`0 12px 32px rgba(36,31,23,0.12)`。

## Shapes

### 圆角

- 卡片：10px
- 输入框、按钮：8px
- 印章、标签：4px
- 头像：50%

### 线条

描边统一 1px；选中态 1.5px；不用 2px 以上的粗边。

### 图像

照片不加滤镜、不加边框；需要解释时在下方加一行 caption。

## Components

### 顶栏

高 56px，左侧品牌（圆环 + 问鹤），右侧一个文字链接。底部 1px 发丝线，背景 `rgba(246,241,230,0.94)`，滚动时轻微模糊。

### 按钮

- 主按钮：朱砂底、纸色字、8px 圆角、高 52px、字号 17px、字距 0.12em。
- 次按钮：透明底、赭石描边、墨字。
- 危险/重置：仅文字，朱砂色。

### 卡片

`surface` 底、1px `hairline`、10px 圆角、内边距 18px。卡片之间 12px。
不用阴影，不用渐变。

### 输入

`surface` 底、1px `hairline-strong`、8px 圆角、高 52px、内边距 14px。
聚焦时描边变 `brass`，不发光。

### 选项组（时辰/性别/历法）

等宽网格，高 56px；选中：`brass-faint` 底 + `brass` 1.5px 边 + 墨字；未选中：纸底 + 发丝线。

### 标签 / 印章

印章：朱砂底、纸色字、4px 圆角、字号 12px、字距 0.1em。

### 注解

左侧 2px 赭石竖线 + 14px 内边距，字号 14px，`muted` 色。

## Motion & Interaction

### 原则

1. **慢一点，但别让人等**：所有反馈 ≤240ms；超过 300ms 的动画一律删掉。
2. **只动该动的**：不做入场炫技、不做视差、不做自动轮播。
3. **老人要看得见反馈**：按下必须变颜色，不能只靠位移 1px。
4. **拇指优先**：所有交互在单手持机、拇指可达区内完成。

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

- 尊重 `prefers-reduced-motion: reduce`：关闭位移与缩放，只保留颜色变化。
- 所有图标按钮必须有 `aria-label`。
- 表单错误用文字 + 颜色双重提示，不只靠红色。

### 反模式

- ❌ 骨架屏闪烁
- ❌ 按钮点击后无任何变化
- ❌ 超过 300ms 的转场
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
- 不要给卡片加阴影和渐变。
- 不要用纯黑 `#000` 和纯白 `#FFF`。
- 不要让正文小于 15px。
- 不要用超过两种强调色。

## Responsive Behavior

### 断点

- ≤380px：页面边距 16px，display 26px。
- 381–520px：默认。
- ≥521px：容器 520px 居中，页面底色延伸。

### 触控

所有可点区域 ≥48×48px；表单控件高 52px；相邻可点元素间距 ≥8px。

### 折叠

高级项（手动经度、原始测量值）一律折叠进 `<details>`，默认收起。

## Iteration Guide

1. 先改 token，再改组件；不要在组件里写死颜色。
2. 新组件必须回答：它属于"纸、墨、界、印"哪一层。
3. 每次改完看三张图：首页、表单页、批注页。
4. 版本用 git tag 记录：`design-v2.0`。

## Known Gaps

- 深色模式未保留；如需要，另开 `design/v2-paper-dark` 分支。
- 罗盘页的刻度线在浅底上对比度需单独校准。
- 照片预览区的深色蒙版需改为纸色蒙版。
