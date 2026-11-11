#!/usr/bin/env node
/* ==========================================================================
   ingest.mjs — 把整本书切成可检索的条文
   用法：node scripts/ingest.mjs knowledge/sources
   文件格式（UTF-8）：
     ---
     book: shenxiang-quanbian
     chapter: 卷一·相法
     kind: 原文        # 原文 | 提要
     ---
     正文……
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.resolve(ROOT, process.argv[2] || 'knowledge/sources');
const OUT = path.join(ROOT, 'knowledge/passages.generated.json');

if (!fs.existsSync(SRC)) {
  console.error(`找不到目录：${SRC}`);
  console.error('先建 knowledge/sources/，每个文件一本书或一章，顶部写 frontmatter。');
  process.exit(1);
}

const books = JSON.parse(fs.readFileSync(path.join(ROOT, 'knowledge/books.json'), 'utf8')).books;
const known = new Set(books.map((b) => b.id));

function parse(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return null;
  const meta = {};
  m[1].split(/\r?\n/).forEach((line) => {
    const i = line.indexOf(':');
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  });
  return { meta, body: m[2] };
}

// 按句读切块，尽量 120–180 字一段，保留上下文
function chunk(text, size = 170) {
  const clean = text.replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim();
  const parts = clean.split(/(?<=[。！？；])/);
  const out = [];
  let buf = '';
  for (const p of parts) {
    if ((buf + p).length > size && buf.length > 60) {
      out.push(buf.trim());
      buf = p;
    } else {
      buf += p;
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out.filter((x) => x.length >= 12);
}

const files = [];
(function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (/\.(md|txt)$/i.test(name)) files.push(p);
  }
})(SRC);

if (!files.length) {
  console.error(`目录里没有 .md/.txt：${SRC}`);
  process.exit(1);
}

const passages = [];
const warnings = [];
for (const file of files) {
  const parsed = parse(fs.readFileSync(file, 'utf8'));
  if (!parsed) { warnings.push(`跳过（无 frontmatter）：${path.relative(ROOT, file)}`); continue; }
  const { meta, body } = parsed;
  if (!known.has(meta.book)) { warnings.push(`跳过（book 未在 books.json 登记）：${meta.book} — ${path.basename(file)}`); continue; }
  const kind = meta.kind === '提要' ? '提要' : '原文';
  chunk(body).forEach((text, i) => {
    passages.push({
      id: `${meta.book}-g${String(passages.length + 1).padStart(4, '0')}`,
      book: meta.book,
      kind,
      chapter: meta.chapter || path.basename(file, path.extname(file)),
      text,
      tags: (meta.tags || '').split(/[,，\s]+/).filter(Boolean),
      source: meta.source || '',
      sourceFile: path.relative(ROOT, file),
      seq: i + 1,
    });
  });
}

fs.writeFileSync(OUT, `${JSON.stringify({ generatedAt: new Date().toISOString(), passages }, null, 2)}\n`);
console.log(`已写入 ${passages.length} 条 → ${path.relative(ROOT, OUT)}`);
if (warnings.length) console.log(warnings.join('\n'));
console.log('重启 server/server.mjs 后生效。');
