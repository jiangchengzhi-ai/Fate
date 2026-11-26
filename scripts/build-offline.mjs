/* 把整个前端打成一个可双击打开的单文件（file:// 也能跑）
   用法：node scripts/build-offline.mjs  →  fatetell-offline.html */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

/* 墨鹤主标：从品牌 SVG 提取路径，内联进开屏，避免单文件引用外部图裂图 */
const cranePath = (read('assets/brand/crane-small.svg').match(/<path d="([^"]+)"/) || [])[1] || '';
if (!cranePath) { console.error('打包失败：未找到墨鹤路径 assets/brand/crane-small.svg'); process.exit(1); }

const ORDER = [
  'assets/js/data.js',
  'assets/js/nlp.js',
  'assets/js/cities-cn.js',
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
  async visionStatus() { return { ready: false, model: 'offline', offline: true, kinds: ['face', 'palm'] }; },
  async vision(kind) {
    const e = new Error('照片识别暂时用不了');
    e.status = 503;
    throw e;
  },
  async visionFace() { return this.vision('face'); },
};
`;

/* 节气数据在服务端靠 import.meta.url 读文件；离线包是普通 <script>，
   一旦保留 import.meta，整段脚本会在解析期抛错 → 页面全白。这里改成内联。 */
const JIEQI_LINE = "const JIEQI = JSON.parse(fs.readFileSync(new URL('../knowledge/jieqi.json', import.meta.url), 'utf8'));";
const toolsSrcRaw = read('server/tools.mjs');
if (!toolsSrcRaw.includes(JIEQI_LINE)) {
  console.error('打包失败：tools.mjs 的节气读取行已变化，请同步更新 build-offline.mjs');
  process.exit(1);
}
const toolsSrc = toolsSrcRaw.replace(JIEQI_LINE, `const JIEQI = ${read('knowledge/jieqi.json').trim()};`);

/* lunar.mjs 用 createRequire 加载 vendored CJS 农历库，离线版改为
   模拟 module.exports 后直接取 Solar/Lunar，避免 require/import.meta。 */
const LUNAR_REQ = /const require = createRequire\(import\.meta\.url\);\s*\n\s*const \{ Solar, Lunar \} = require\('\.\.\/vendor\/lunar-javascript\.cjs'\);/;
const lunarSrcRaw = read('server/lunar.mjs');
if (!LUNAR_REQ.test(lunarSrcRaw)) {
  console.error('打包失败：lunar.mjs 的 require 行已变化，请同步更新 build-offline.mjs');
  process.exit(1);
}
const lunarSrc = lunarSrcRaw.replace(LUNAR_REQ, 'const { Solar, Lunar } = __m_lunar_vendor;');
const lunarVendor = `
const __m_lunar_vendor = (() => {
  const module = { exports: {} };
  ${read('vendor/lunar-javascript.cjs')}
  return module.exports;
})();`;

/* 每个服务端模块各自包一层闭包：tools/solar/bazi/dst 的顶层 GAN/ZHI/pad
   等符号大量重名，平铺会直接语法报错。闭包导出后再显式解构所需符号。 */
const wrapModule = (src, name) => {
  const names = new Set();
  for (const m of src.matchAll(/^export\s+(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm)) names.add(m[1]);
  for (const m of src.matchAll(/^export\s*\{([^}]+)\}/gm)) {
    for (const p of m[1].split(',')) {
      const t = p.trim().split(/\s+as\s+/).pop().trim();
      if (t) names.add(t);
    }
  }
  if (!names.size) throw new Error(`打包失败：${name} 没有识别到导出符号`);
  return `const __m_${name} = (() => {\n${strip(src)}\nreturn { ${[...names].join(', ')} };\n})();`;
};

const TOOL_DEPS = [
  ['fortune', read('server/fortune.mjs'), ['fortuneSheet']],
  ['solar', read('server/solar.mjs'), ['solarCorrection', 'toMinutes', 'fromMinutes', 'zhiOfMinutes', 'midMinutesOfZhi']],
  ['cities', read('server/cities.mjs'), ['cityByName']],
  ['lunar', lunarSrc, ['lunarToSolar']],
  ['dst', read('server/dst-cn.mjs'), ['inChinaDST']],
  ['bazi', read('server/bazi.mjs'), ['deepen']],
  ['relations', read('server/relations.mjs'), ['isClash', 'isHe', 'isStemHe', 'dayRelations', 'dayEnergy', 'dayAdvice']],
];

const toolsWrap = `
/* ---------- 工具层：8 个模块各自隔离，函数与常量不互相污染 ---------- */
const __TOOLS = (() => {
${lunarVendor}
${TOOL_DEPS.map(([n, src, used]) => `${wrapModule(src, n)}\nconst { ${used.join(', ')} } = __m_${n};`).join('\n')}
${wrapModule(toolsSrc, 'tools')}
return __m_tools;
})();
`;

/* file:// 下埋点请求会撞 CORS，离线版直接短路 /api/ */
const offlineFetchShim = `
const __realFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = (url, opt) => {
  if (typeof url === 'string' && url.startsWith('/api/')) {
    return Promise.resolve(new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }));
  }
  return __realFetch(url, opt);
};
`;

/* 工具层放最后：cities.mjs 顶层引用 cities-cn.js 的 PROVINCES，
   必须先让 ORDER 里的全局常量完成初始化，否则触发 TDZ。 */
const js = [offlineFetchShim, shim, ...ORDER.map((f) => `\n/* ===== ${f} ===== */\n${strip(read(f))}`), toolsWrap].join('\n');
const css = read('assets/app.css') + '\n' + read('assets/theme-paper.css');

/* 构建期自检：离线包是普通 <script>，任何 Node 专属语法都会在解析期
   让整段脚本停摆，页面全白。宁可构建失败，也不产出白屏文件。 */
const forbidden = js.match(/import\.meta|fs\.readFileSync|from\s*['"]node:|\brequire\s*\(/g);
if (forbidden) {
  console.error('打包失败：产物含 Node 专属语法 ' + [...new Set(forbidden)].join('、') + '，离线版会白屏');
  process.exit(1);
}
try {
  new Function(js);
} catch (e) {
  console.error('打包失败：产物脚本语法错误 → ' + e.message);
  process.exit(1);
}

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#EAE3D5">
<title>fatetell · 离线预览</title>
<style>${css}</style>
</head>
<body>
  <div id="splash" aria-hidden="true">
    <div class="splash-inner">
      <span class="splash-halo"></span>
      <svg class="splash-crane" viewBox="0 0 160 164" role="img" aria-label="问鹤 墨鹤标">
        <path d="${cranePath}" fill="#1F1A13" fill-rule="evenodd"/>
        <circle class="eye" cx="121.50" cy="22.00" r="2.12" fill="#99371F"/>
      </svg>
      <div class="splash-brand">问鹤</div>
      <div class="splash-tagline">问一句，有出处</div>
    </div>
  </div>
  <div id="app" class="shell"></div>
  <div id="layer" class="layer"></div>
  <script>${js.replace(/<\/script/gi, '<\\/script')}</script>
</body>
</html>`;

fs.writeFileSync(path.join(ROOT, 'fatetell-offline.html'), html);
console.log(`fatetell-offline.html  ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB  ·  ${ORDER.length} modules`);
