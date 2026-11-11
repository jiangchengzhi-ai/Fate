# 扫描页放这里

把要转录的书页拍成图片，按页码命名，放进这个文件夹：

```
knowledge/sources/inbox/001.jpg
knowledge/sources/inbox/002.jpg
...
```

要求：

- 单页一张图，jpg / png / webp 都行；建议 1500px 宽、光线均匀、不要阴影压在字上。
- 顺序按文件名排，拼音或数字都行（001、002…最稳）。
- 一页只放一页内容，不要跨页拼图。

然后跑：

```bash
node scripts/transcribe.mjs --book shenxiang-quanbian --chapter 卷一
node scripts/ingest.mjs knowledge/sources
```

`--book` 必须用 `knowledge/books.json` 里已有的 id（例如 `shenxiang-quanbian`、`mayi-shenxiang`、`zangshu`、`bazhai-mingjing`、`xieji-bianfang`）。

转录结果写到 `knowledge/sources/<book>-<chapter>.md`，自动带 frontmatter，`kind` 记为「原文」，`source` 标注「扫描转录（未校勘）」。

**未校勘就是未校勘**：录入后建议自己抽两页对一遍原图，再把 `source` 改成实际底本。错字比空着更伤权威。
