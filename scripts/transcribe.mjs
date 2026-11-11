#!/usr/bin/env node
/* ==========================================================================
   transcribe.mjs — 用视觉模型把扫描页转录成入库文本
   用法：
     node scripts/transcribe.mjs --book shenxiang-quanbian --chapter 卷一 --dir knowledge/sources/inbox
   输入：jpg / png / webp，文件名按页序排（001.jpg、002.jpg…）
   输出：knowledge/sources/<book>-<chapter>.md（带 frontmatter，可直接 ingest）
   说明：转录未校勘，kind 记为「原文」，source 标注「扫描转录（未校勘）」。
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const args = process.argv.slice(2);
const opt = (name, fallback = '') => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const BOOK = opt('book');
const CHAPTER = opt('chapter', '卷一');
const DIR = path.resolve(ROOT, opt('dir', 'knowledge/sources/inbox'));
const OUT_DIR = path.join(ROOT, 'knowledge/sources');

const KEY = process.env.FATETELL_VISION_KEY || process.env.FATETELL_LLM_KEY || '';
const BASE = (process.env.FATETELL_VISION_BASE || process.env.FATETELL_LLM_BASE || 'https://api.deepseek.com/v1').replace(/\/+$/, '');
const MODEL = process.env.FATETELL_VISION_MODEL || process.env.FATETELL_LLM_MODEL || '';

if (!BOOK) {
  console.error('缺少 --book（例如 --book shenxiang-quanbian）');
  process.exit(1);
}
if (!KEY || !MODEL) {
  console.error('缺少模型配置：设置 FATETELL_VISION_KEY 与 FATETELL_VISION_MODEL');
  process.exit(1);
}
if (!fs.existsSync(DIR)) {
  console.error(`找不到图片目录：${DIR}`);
  process.exit(1);
}

const books = JSON.parse(fs.readFileSync(path.join(ROOT, 'knowledge/books.json'), 'utf8')).books;
const book = books.find((b) => b.id === BOOK);
if (!book) {
  console.error(`book 不在 books.json：${BOOK}`);
  process.exit(1);
}

const exts = /\.(jpe?g|png|webp)$/i;
const files = fs.readdirSync(DIR).filter((f) => exts.test(f)).sort();
if (!files.length) {
  console.error(`目录里没有图片：${DIR}`);
  process.exit(1);
}

const SYSTEM = `你是古籍扫描页的转录员。逐字转录图片中的中文正文。
规则：
1. 只输出正文，不要解释、不要标题、不要「以下是转录」之类的话。
2. 保留原字（繁体、异体照原样），保留标点、换行与分段。
3. 看不清的字用 □ 代替，不要猜、不要补。
4. 若整页无法辨认，只输出一个 □。`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function transcribe(file) {
  const buf = fs.readFileSync(path.join(DIR, file));
  const mime = file.toLowerCase().endsWith('.png') ? 'png' : file.toLowerCase().endsWith('.webp') ? 'webp' : 'jpeg';
  const dataUrl = `data:image/${mime};base64,${buf.toString('base64')}`;

  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      max_tokens: 3000,
      reasoning_effort: 'low',
      messages: [
        { role: 'system', content: SYSTEM },
        {
          role: 'user',
          content: [
            { type: 'text', text: '转录这一页。' },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  });

  const raw = await res.text();
  if (!res.ok) throw new Error(`模型返回 ${res.status}: ${raw.slice(0, 160)}`);
  const data = JSON.parse(raw);
  let text = data?.choices?.[0]?.message?.content || '';
  text = text.replace(/^```[\s\S]*?\n/, '').replace(/```$/g, '').trim();
  /* 扫描页的换行是排版折行，不是语义分段：并成一段 */
  text = text.split(/\n+/).map((s) => s.trim()).filter(Boolean).join('');
  return text;
}

const safe = CHAPTER.replace(/[\\/:*?"<>|\s]+/g, '');
const outFile = path.join(OUT_DIR, `${BOOK}-${safe}.md`);

const lines = [
  '---',
  `book: ${BOOK}`,
  `chapter: ${CHAPTER}`,
  'kind: 原文',
  'tags: 扫描转录',
  'source: 扫描转录（未校勘）',
  '---',
  '',
];

let total = 0;
for (let i = 0; i < files.length; i++) {
  const f = files[i];
  process.stdout.write(`[${i + 1}/${files.length}] ${f} … `);
  let text = '';
  for (let attempt = 0; attempt < 2 && !text; attempt++) {
    try {
      text = await transcribe(f);
    } catch (e) {
      if (attempt === 1) {
        console.log('失败：' + e.message);
        text = '□';
      } else {
        await sleep(1500);
      }
    }
  }
  console.log(`${text.length} 字`);
  total += text.length;
  lines.push(`<!-- page ${String(i + 1).padStart(3, '0')} · ${f} -->`);
  lines.push(text);
  lines.push('');
  await sleep(400);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(outFile, lines.join('\n'), 'utf8');
console.log(`\n已写入 ${path.relative(ROOT, outFile)}（${total} 字）`);
console.log('下一步：node scripts/ingest.mjs knowledge/sources，然后重启服务。');
