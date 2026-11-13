/* 把整个前端打成一个可双击打开的单文件（file:// 也能跑）
   用法：node scripts/build-offline.mjs  →  fatetell-offline.html */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const ORDER = [
  'assets/js/data.js',
  'assets/js/engine.js',
  'assets/js/store.js',
  'assets/js/ui.js',
  'assets/js/lunar.js',
  'assets/js/facemesh.js',
  'assets/js/sensors.js',
  'assets/js/track.js',
  'assets/js/views/home.js',
  'assets/js/views/reading.js',
  'assets/js/views/combo.js',
  'assets/js/views/compass.js',
  'assets/js/views/report.js',
  'assets/js/views/library.js',
  'assets/js/views/misc.js',
  'assets/js/views/arts.js',
  'assets/js/views/yinzha.js',
  'assets/js/app.js',
];

/* 构建前自检：任何被 import 的本地模块必须已在 ORDER 里，避免“未定义” */
const missing = new Set();
for (const f of ORDER) {
  for (const m of read(f).matchAll(/from\s+['"](\.[^'"]+)['"]/g)) {
    const rel = path.relative(ROOT, path.resolve(ROOT, path.dirname(f), m[1])).split(path.sep).join('/');
    if (!ORDER.includes(rel) && rel !== 'assets/js/api.js') missing.add(`${rel}  ← import 于 ${f}`);
  }
}
if (missing.size) {
  console.error('缺少模块，请补进 ORDER：\n  ' + [...missing].join('\n  '));
  process.exit(1);
}

const strip = (src) => src
  .replace(/^import[\s\S]*?from\s*['"][^'"]+['"];?[ \t]*$/gm, '')
  .replace(/^export\s*\{[^}]*\};?[ \t]*$/gm, '')
  .replace(/^export\s+default\s+/gm, '')
  .replace(/^export\s+/gm, '');

const books = JSON.parse(read('knowledge/books.json'));
const passages = JSON.parse(read('knowledge/passages.json')).passages;

const shim = `
/* ---------- 离线数据层：没有 Node 服务时使用 ---------- */
const __KB = ${JSON.stringify({ categories: books.categories, books: books.books, passages })};
const __bookOf = (id) => __KB.books.find((b) => b.id === id) || {};
const api = {
  online: false,
  async health() { return { ok: true, books: __KB.books.length, passages: __KB.passages.length, version: 'offline' }; },
  async categories() {
    const c = {};
    __KB.books.forEach((b) => { c[b.cat] = (c[b.cat] || 0) + 1; });
    return { categories: __KB.categories.map((x) => ({ ...x, bookCount: c[x.id] || 0 })) };
  },
  async books(cat = '', q = '') {
    return { books: __KB.books.filter((b) => (!cat || b.cat === cat) && (!q || (b.title + b.author + b.note).includes(q))) };
  },
  async search(q = '', cat = '', k = 8) {
    const hit = __KB.passages.filter((p) => {
      const b = __bookOf(p.book);
      return (!cat || b.cat === cat) && (!q || p.text.includes(q) || (p.tags || []).some((t) => t.includes(q)) || (b.title || '').includes(q));
    }).slice(0, k);
    return { results: hit.map((p) => ({ ...p, bookTitle: __bookOf(p.book).title, cat: __bookOf(p.book).cat })) };
  },
  async passages(book) {
    return { passages: __KB.passages.filter((p) => p.book === book).map((p) => ({ ...p, bookTitle: __bookOf(p.book).title })) };
  },
  async llmStatus() { return { ready: false, model: 'offline' }; },
  async tool(name, body) {
    const fn = __TOOLS[name];
    if (!fn) throw new Error('未知工具：' + name);
    const r = fn(body);
    const cat = { paipan: 'ming', xiaoliuren: 'bu', zeri: 'ze', bazhai: 'kan', yangzhai: 'kan', yinzha: 'kan' }[name];
    const topic = { paipan: '月令 用神 调候', xiaoliuren: '小六壬 六宫', zeri: '建除 择日 月建', bazhai: '八宅 命卦', yangzhai: '八宅 床位 灶', yinzha: '葬书 乘生气' }[name] || '';
    const words = topic.split(' ').filter(Boolean);
    const hits = __KB.passages.filter((p) => {
      const b = __bookOf(p.book);
      return b.cat === cat && words.some((w) => p.text.includes(w) || (p.tags || []).some((t) => t.includes(w)));
    }).slice(0, 3);
    r.citations = hits.map((p) => ({ ...p, bookTitle: __bookOf(p.book).title, chapter: p.chapter }));
    return r;
  },
  async interpret() { throw new Error('离线版不接模型；需要时请启动本地服务'); },
  async visionStatus() { return { ready: false, model: 'offline', kinds: ['face', 'palm'] }; },
  async vision(kind) {
    const e = new Error('离线包不接视觉模型，请用启动.bat 打开在线版');
    e.status = 503;
    throw e;
  },
  async visionFace() { return this.vision('face'); },
};
`;

const toolsWrap = `
/* ---------- 工具层：与 Node 服务同一份代码，包进闭包避免重名 ---------- */
const __TOOLS = (() => {
${strip(read('server/fortune.mjs'))}
${strip(read('server/tools.mjs'))}
return { paipan, xiaoliuren, zeri, bazhai, yangzhai, yinzha };
})();
`;

const js = [toolsWrap, shim, ...ORDER.map((f) => `\n/* ===== ${f} ===== */\n${strip(read(f))}`)].join('\n');
const css = read('assets/app.css');

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0B1210">
<title>fatetell · 离线预览</title>
<style>${css}</style>
</head>
<body>
  <div id="app" class="shell"></div>
  <div id="layer" class="layer"></div>
  <script>${js.replace(/<\/script/gi, '<\\/script')}</script>
</body>
</html>`;

fs.writeFileSync(path.join(ROOT, 'fatetell-offline.html'), html);
console.log(`fatetell-offline.html  ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB  ·  ${ORDER.length} modules`);
