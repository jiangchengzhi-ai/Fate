---
name: fatetell
description: 中国传统术数五门 H5 —— 墨玉为底、黄铜为界、宣纸为批注
colors:
  ink-jade: "#0B1210"
  ink-jade-raised: "#0F1916"
  ink-jade-sunken: "#15211D"
  compass-brass: "#A98A4E"
  compass-brass-bright: "#CBA968"
  cinnabar: "#A33B2B"
  cinnabar-deep: "#8B2F22"
  seal-paste: "#9C3325"
  rice-paper: "#EDE7D8"
  rice-paper-deep: "#E5DDCB"
  paper-ink: "#241F17"
  bone: "#E9E4D6"
typography:
  display:
    fontFamily: "Songti SC, Songti TC, STSong, Noto Serif CJK SC, Source Han Serif SC, SimSun, serif"
    fontSize: "27px"
    fontWeight: 400
    lineHeight: 1.35
    letterSpacing: "0.16em"
  headline:
    fontFamily: "Songti SC, STSong, Noto Serif CJK SC, serif"
    fontSize: "19px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0.2em"
  title:
    fontFamily: "Songti SC, STSong, Noto Serif CJK SC, serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0.14em"
  body:
    fontFamily: "PingFang SC, HarmonyOS Sans SC, Noto Sans CJK SC, Microsoft YaHei, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.95
    letterSpacing: "0.02em"
  label:
    fontFamily: "Songti SC, STSong, Noto Serif CJK SC, serif"
    fontSize: "10.5px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0.2em"
rounded:
  instrument: "1px"
  control: "1px"
  seal: "0px"
spacing:
  hair: "1px"
  xs: "6px"
  sm: "10px"
  md: "14px"
  lg: "22px"
  xl: "38px"
components:
  button-primary:
    backgroundColor: "{colors.cinnabar}"
    textColor: "#F5EBD6"
    rounded: "{rounded.control}"
    height: "50px"
    padding: "0 22px"
  button-primary-hover:
    backgroundColor: "{colors.cinnabar-deep}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.bone}"
    rounded: "{rounded.control}"
    height: "44px"
    padding: "0 18px"
  option:
    backgroundColor: "rgba(233,228,214,0.018)"
    textColor: "{colors.bone}"
    rounded: "{rounded.control}"
    height: "44px"
    padding: "9px 14px"
  option-selected:
    backgroundColor: "rgba(169,138,78,0.13)"
    textColor: "{colors.bone}"
  paper-report:
    backgroundColor: "{colors.rice-paper}"
    textColor: "{colors.paper-ink}"
    rounded: "0px"
    padding: "7px"
system:
  description: "fatetell 的界面由两层物质构成：墨玉底上的黄铜仪器，与结果处的宣纸批注。"
---

# Design System: fatetell

## Overview

**Creative North Star: "铜镜与宣纸"**

界面只承认两种物质：一块墨玉底上的黄铜罗盘，和一张写满批注的宣纸。罗盘是尺，负责输入与方位；宣纸是纸，负责结论。所有设计判断都回到这两个比喻：它是不是刻在铜上的一根线，还是落在纸上的一笔字。

这套系统拒绝"深色科技风"的默认装饰：没有渐变文字，没有发光卡片，没有圆角浮层。深度靠色阶与发丝线，不靠阴影堆叠；强调靠字重与字号，不靠第二套亮色。唯一的暖色行动色是朱砂，且只出现在钤印与主操作上——它的稀有是刻意的。

**Key Characteristics:**
- 墨玉三阶铺底，黄铜发丝线勾结构，宣纸只承载结果。
- 直角优先（0–1px），圆只属于罗盘与印。
- 宋体作显示与标题，黑体作正文；小字不低 9.5px，且必须过 4.5:1。
- 动效只服务两处：盘面入场、纸面落定。

## Colors

冷绿黑作底，黄铜作结构，朱砂作行动，宣纸作结论。

### Primary
- **朱砂 (Cinnabar)** (#A33B2B): 主按钮、批语分隔、钤印、区块小方点。一屏占比不超过 5%，且从不用于正文文字。

### Secondary
- **罗盘铜 (Compass Brass)** (#A98A4E): 命盘刻度、分隔线、焦点环、次级强调。它是"尺"的颜色，不是"行动"的颜色。
- **亮铜 (Brass Bright)** (#CBA968): 悬停、当前项、可点击文字的强调；与罗盘铜同色相，只提亮一档。

### Neutral
- **墨玉 (Ink Jade)** (#0B1210): 页面底色。
- **墨玉·浮 (Ink Jade Raised)** (#0F1916): 弹层、输入框、面板。
- **墨玉·沉 (Ink Jade Sunken)** (#15211D): 卡片内凹、悬停背景。
- **骨白 (Bone)** (#E9E4D6): 正文文字；72% 为次级，54% 为提示（实测 8.0 / 5.0）。
- **宣纸 (Rice Paper)** (#EDE7D8): 批注纸面。
- **纸墨 (Paper Ink)** (#241F17): 纸上的字。

### Named Rules
**The Paper-Only Rule.** 宣纸色只用于"结果"：批注、印章、报告里的表格。导航、表单、设置永远留在墨玉上。

**The Seal Rule.** 朱砂的用量以一枚印为上限：主按钮、钤印、区块标记。它不做背景、不做正文、不做图标填充色。

## Typography

**Display Font:** Songti SC / STSong（回退 Noto Serif CJK SC, SimSun）
**Body Font:** PingFang SC / HarmonyOS Sans（回退 Noto Sans CJK SC, Microsoft YaHei）

**Character:** 宋体的横细竖粗带出"刻"的味道，黑体负责把话说清楚。两种字体各司其职，不混用。

### Hierarchy
- **Display** (400, 27px, 1.35, tracking .16em): 批注标题、门名。只出现在结果页。
- **Headline** (400, 19px, 1.4, tracking .2em): 页面标题（观面、择日、定盘）。
- **Title** (400, 17px, 1.5, tracking .14em): 表单问题标题、报告小节标题。
- **Body** (400, 13px, 1.95): 正文与报告段落；纸面行宽约 34em。
- **Label** (400, 10.5px, tracking .2em): 字段标签、表格头、引文出处；9.5px 为绝对下限。

### Named Rules
**The Label Floor Rule.** 小于 9.5px 的字不存在。9.5–12px 的字必须达到 4.5:1，否则提亮，不靠加粗补偿。

**The Two Faces Rule.** 宋体只做标题、题目、批语与数字；黑体只做正文、按钮、表单与提示。不新增第三种字体。

## Layout

单列移动优先，内容宽 480px 上限，左右 22px。表单底部固定 `.dock`（含主按钮），页面底部留 120px 防遮挡。

节奏：同组 6–10px，组间 22px，章节间 38px；标题上方永远大于下方。报告内部用 1px 界行分隔小节，不用卡片包裹。

桌面只做居中留白，不放大栅格；390px 是首要验证宽度，320px 不得横向溢出。

## Elevation & Depth

整体是平的。深度只由三样东西表达：墨玉的明度阶、1px 发丝线、以及宣纸的纸面投影。

- 纸面投影：`0 30px 70px -34px rgba(0,0,0,.95)`，只给 `.paper`。
- 弹层：`rgba(6,10,9,.66)` 遮罩 + 3px 背景模糊，只给确认与说明。
- 其余一律无阴影。卡片不存在，圆角浮层不存在。

**The Flat-By-Default Rule.** 静止状态没有阴影；阴影只属于"被拿起来的一张纸"和"挡住页面的一层幕"。

## Shapes

直角系统：控件 1px 圆角，纸张 0，印 0。圆只出现在三处：命盘环、罗盘环、五行/状态圆点。

线条一律 1px；分隔线用 10%–20% 透明度，结构线用黄铜 26%。不使用胶囊、药丸、大圆角卡片。

## Components

### Buttons
- **Shape:** 1px 圆角，高 50px（主）/ 44px（次）。
- **Primary:** 朱砂底、纸白字、宋体 15px、字距 .22em；hover 提亮到 #BE4C39，按下转深。
- **Ghost:** 透明底、1px 骨白 18% 边框、骨白 72% 字；hover 边框转铜。
- **Line:** 透明底、1px 黄铜边框、亮铜字；用于次级确认。

### Options / Chips
- 默认：墨玉底、1px 18% 边框、13.5px 字；最小高 44px。
- 选中：边框转亮铜、背景 brass 13%、右上角 5px 朱砂方点；同时维护 `aria-pressed` 与 `aria-checked`。
- 单选组必须是 `role="radiogroup"`，选项 `role="radio"`，roving tabindex。

### Inputs
- 46px 高、1px 18% 边框、无圆角；聚焦时边框转铜、底色 brass 6%。
- 占位符 58% 骨白；原生 `select` 必须显式给 `option` 与 `optgroup` 上色；分组选择优先用 chip，不用原生 optgroup。

### Paper Report
- 双层版框：外 1px 42% 纸墨，内 1px 30%，内边距 22/20。
- 右上竖排题签（`writing-mode: vertical-rl`），右下 48px 朱砂钤印（2×2 字，-3.5° 旋转）。
- 表格 `table-layout: fixed`，首列 34% 且不换行；长中文列允许 `overflow-wrap: anywhere`。
- 分数 64px 宋体；等级 19px 朱砂；小节标题前 5px 朱砂方点。

### Dial
- 5 个 64° 楔形（命/卜/相/堪舆/择日），内外半径 52–132；24 格刻度，外环 158。
- 罗盘版：24 山直排、指针旋转、坐向高亮；拖动用 pointer capture，`touch-action: none`。
- 命盘与罗盘共用刻度语言，但只允许出现在"方位"相关页面。

### Sheet / Toast
- 弹层从底部升起 380ms；遮罩 66% + 3px 模糊；焦点锁在层内，Esc 关闭，背景锁滚动。
- 危险操作的默认焦点是"保留"，不是"删除"。
- Toast 2.4s 自动消失；带撤销时 6s，并把动作放在文字右侧。

### Inline Warning
- 服务不可用时的页内条：黄铜 26% 边框、brass 6% 底、12px 说明 + 44px「重试」。
- 错误态与空态必须文案不同；错误给恢复路径。

## Do's and Don'ts

### Do:
- **Do** 用 1px 发丝线与明度阶表达结构，阴影只给纸与幕。
- **Do** 把结果放进宣纸，把操作留在墨玉。
- **Do** 保持 0–1px 圆角；圆只给罗盘、印与状态点。
- **Do** 主操作固定在拇指区（`.dock`），并在报告底部给「再算一次 / 复制 / 存图」。
- **Do** 单选组用 radiogroup + aria-checked，点击目标 ≥44×44。
- **Do** 所有小字过 4.5:1；9.5px 是下限。
- **Do** 数字由工具层算，模型只负责叙述；分数必须有单位（命格/课象/日课/地气/气象）。
- **Do** 发送照片前先弹确认，写清「发给谁、存不存、能不能改」，默认不发。

### Don't:
- **Don't** 用原生 `<optgroup>` 做分组选择：暗色下标签会白字白底。
- **Don't** 用渐变文字、发光卡片、圆角浮层、卡片套卡片。
- **Don't** 把朱砂用于正文或大面积背景。
- **Don't** 用 emoji 或 Unicode 字符当图标。
- **Don't** 在标题上方加 kicker/eyebrow 小标签。
- **Don't** 让删除按钮默认获得焦点，或把 16px 的 `×` 放在拇指热区。
- **Don't** 用颜色单独承载状态（吉/凶必须同时有文字）。
- **Don't** 在 390px 下让表格首列换行或页面横向滚动。
