/* ==========================================================================
   server.mjs — 零依赖 Node 服务
   静态站点 + 典籍检索 API + 工具 API。node server/server.mjs [--port 5173]
   ========================================================================== */
import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { TOOLS, TOOL_MANIFEST } from './tools.mjs';
import { interpret, llmStatus } from './llm.mjs';
import { analyzeImage, visionStatus } from './vision.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.argv.find((a, i, arr) => arr[i - 1] === '--port') || process.env.PORT || 5173);
const HOST = process.argv.find((a, i, arr) => arr[i - 1] === '--host') || process.env.HOST || '127.0.0.1';

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const BOOKS = readJson(path.join(ROOT, 'knowledge/books.json'));
const PASSAGES = (() => {
  const base = readJson(path.join(ROOT, 'knowledge/passages.json')).passages;
  const genPath = path.join(ROOT, 'knowledge/passages.generated.json');
  const extra = fs.existsSync(genPath) ? readJson(genPath).passages : [];
  return [...base, ...extra];
})();

const BOOK_MAP = Object.fromEntries(BOOKS.books.map((b) => [b.id, b]));

/* ---------------- 检索：字符二元组 + BM25-lite ---------------- */
const tokenize = (s) => {
  const clean = String(s).replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '').toLowerCase();
  const out = [];
  for (let i = 0; i < clean.length - 1; i++) out.push(clean.slice(i, i + 2));
  if (clean.length === 1) out.push(clean);
  return out;
};

const INDEX = (() => {
  const postings = new Map();
  const docs = PASSAGES.map((p) => {
    const book = BOOK_MAP[p.book] || { title: '', note: '' };
    return {
      ...p,
      bookTitle: book.title,
      bookAuthor: book.author,
      edition: book.edition,
      cat: book.cat,
      kind: p.kind,
      tags: p.tags || [],
      source: p.source || '',
      text: p.text,
      hay: `${book.title}${book.author || ''}${p.chapter}${p.text}${(p.tags || []).join('')}`,
    };
  });
  docs.forEach((d, id) => {
    const tf = new Map();
    tokenize(d.hay).forEach((t) => tf.set(t, (tf.get(t) || 0) + 1));
    for (const [t, n] of tf) {
      if (!postings.has(t)) postings.set(t, []);
      postings.get(t).push({ id, n });
    }
  });
  return { docs, postings };
})();

const SYNONYMS = {
    面: '相 颜 五官 面',
    相: '面 五官 形神',
    掌: '手 掌纹 掌丘',
    手: '掌 掌纹',
    坟: '葬 阴宅 墓',
    墓: '葬 阴宅',
    阴宅: '葬 风水 水法',
    阳宅: '宅 八宅 九星',
    宅: '阳宅 八宅',
    风水: '堪舆 葬 水法',
    择日: '建除 宜忌 日辰',
    八字: '四柱 命 十神',
    命: '四柱 八字 大运',
    痣: '相 面 气色',
  };

function expand(q) {
  const out = [];
  for (const [k, v] of Object.entries(SYNONYMS)) {
    if (q.includes(k)) out.push(v);
  }
  return out;
}

function search(q, cat = '', k = 8) {
  /* 单字查询没有 bigram，直接按子串扫 */
  const chars = [...q].filter((c) => /[\u4e00-\u9fa5]/.test(c));
  if (chars.length < 2) {
    return INDEX.docs
      .filter((d) => (!cat || d.cat === cat) && d.hay.includes(q))
      .map((d) => ({
        ...d,
        score: (d.tags || []).includes(q) ? 3 : d.kind === '原文' ? 2 : 1,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }

  const toks = tokenize(q);
  if (!toks.length) return [];
  const extra = expand(q).flatMap(tokenize);
  const all = [...new Set([...toks, ...extra])];
  const tokSet = new Set(all);
  const scores = new Map();
  const N = INDEX.docs.length;
  for (const t of all) {
    const list = INDEX.postings.get(t);
    if (!list) continue;
    const idf = Math.log(1 + (N - list.length + 0.5) / (list.length + 0.5));
    for (const { id, n } of list) {
      scores.set(id, (scores.get(id) || 0) + idf * (n / (n + 1.2)));
    }
  }
  return [...scores.entries()]
    .map(([id, s]) => {
      const d = INDEX.docs[id];
      let score = s;
      if (cat && d.cat === cat) score *= 1.8;
      if (d.text.includes(q)) score *= 1.5;
      if ((d.tags || []).some((t) => tokSet.has(t) || t.includes(q))) score *= 1.7;
      if (d.kind === '原文') score *= 1.2;
      return { ...d, score: Number(score.toFixed(3)) };
    })
    .filter((d) => !cat || d.cat === cat)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

function citationsFor(cat, q, k = 3) {
  const byCat = search(q || cat, cat, k);
  if (byCat.length) return byCat;
  return search(q || cat, '', k);
}

/* ---------------- 模型解读：限流 + 缓存 ---------------- */
const RATE = new Map();   // ip -> timestamps
const CACHE = new Map();  // hash -> { text, model, at }

function tooFast(ip) {
  const now = Date.now();
  const list = (RATE.get(ip) || []).filter((t) => now - t < 60000);
  list.push(now);
  RATE.set(ip, list);
  if (RATE.size > 500) RATE.clear();
  return list.length > 8; // 每分钟 8 次
}

function cleanInterpretBody(body) {
  const passages = Array.isArray(body.passages)
    ? body.passages.slice(0, 5).map((p) => ({
        bookTitle: String(p.bookTitle || '').slice(0, 40),
        chapter: String(p.chapter || '').slice(0, 60),
        kind: p.kind === '提要' ? '提要' : '原文',
        text: String(p.text || '').slice(0, 400),
      }))
    : [];
  return {
    kind: String(body.kind || '解读').slice(0, 20),
    chart: String(body.chart || '').slice(0, 4000),
    question: body.question ? String(body.question).slice(0, 200) : '',
    passages,
  };
}

/* ---------------- HTTP ---------------- */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp', '.md': 'text/markdown; charset=utf-8',
};

const json = (res, code, data) => {
  const body = JSON.stringify(data);
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
  });
  res.end(body);
};

const readBody = (req, max = 1e6) => new Promise((resolve, reject) => {
  let raw = '';
  req.on('data', (c) => {
    raw += c;
    if (raw.length > max) reject(new Error('payload too large'));
  });
  req.on('end', () => {
    try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('invalid JSON')); }
  });
  req.on('error', reject);
});

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;

  try {
    if (p === '/api/health') {
      return json(res, 200, { ok: true, books: BOOKS.books.length, passages: PASSAGES.length, version: BOOKS.version });
    }

    if (p === '/api/kb/categories') {
      const counts = {};
      BOOKS.books.forEach((b) => { counts[b.cat] = (counts[b.cat] || 0) + 1; });
      return json(res, 200, {
        categories: BOOKS.categories.map((c) => ({ ...c, bookCount: counts[c.id] || 0 })),
      });
    }

    if (p === '/api/kb/books') {
      const cat = url.searchParams.get('cat');
      const q = url.searchParams.get('q');
      let list = BOOKS.books;
      if (cat) list = list.filter((b) => b.cat === cat);
      if (q) list = list.filter((b) => (b.title + b.author + b.note).includes(q));
      return json(res, 200, {
        books: list.map((b) => ({ ...b, passageCount: PASSAGES.filter((x) => x.book === b.id).length })),
      });
    }

    if (p === '/api/kb/search') {
      const q = url.searchParams.get('q') || '';
      const cat = url.searchParams.get('cat') || '';
      const k = Math.min(20, Number(url.searchParams.get('k')) || 8);
      return json(res, 200, { query: q, cat, results: search(q, cat, k) });
    }

    if (p === '/api/kb/passages') {
      const book = url.searchParams.get('book');
      const list = PASSAGES.filter((x) => x.book === book).map((x) => ({ ...x, bookTitle: BOOK_MAP[x.book]?.title }));
      return json(res, 200, { book, passages: list });
    }

    if (p === '/api/vision/status') {
      return json(res, 200, visionStatus());
    }

    if (p.startsWith('/api/vision/') && p !== '/api/vision/status' && req.method === 'POST') {
      const kind = p.slice('/api/vision/'.length);
      if (kind !== 'face' && kind !== 'palm') return json(res, 404, { error: '不支持的照片类型' });

      const ip = req.socket.remoteAddress || 'local';
      if (tooFast(ip)) return json(res, 429, { error: '请求太快，休息一分钟再来' });

      const body = await readBody(req, 4e6);
      const image = String(body.image || '');
      if (!image) return json(res, 400, { error: '缺少照片' });

      const status = visionStatus();
      if (!status.ready) {
        return json(res, 503, {
          error: '视觉模型未配置',
          hint: '设置 FATETELL_VISION_MODEL（以及 FATETELL_VISION_KEY / FATETELL_VISION_BASE）后重启。',
        });
      }

      try {
        const out = await analyzeImage(kind, image);
        return json(res, 200, out);
      } catch (e) {
        const code = e.code === 'BAD_IMAGE' || e.code === 'BAD_KIND' ? 400 : e.code === 'TIMEOUT' ? 504 : 502;
        return json(res, code, { error: e.message, code: e.code || 'UPSTREAM' });
      }
    }

    if (p === '/api/llm/status') {
      return json(res, 200, llmStatus());
    }

    if (p === '/api/interpret' && req.method === 'POST') {
      const ip = req.socket.remoteAddress || 'local';
      if (tooFast(ip)) return json(res, 429, { error: '请求太快，休息一分钟再来' });

      const body = await readBody(req);
      const payload = cleanInterpretBody(body);
      if (!payload.chart) return json(res, 400, { error: '缺少排盘结果' });

      const hash = crypto.createHash('sha1').update('v2' + JSON.stringify(payload)).digest('hex');
      const hit = CACHE.get(hash);
      if (hit && Date.now() - hit.at < 1000 * 60 * 30) {
        return json(res, 200, { ...hit, cached: true });
      }

      const status = llmStatus();
      if (!status.ready) {
        return json(res, 503, {
          error: '模型未配置',
          hint: '启动前设置 FATETELL_LLM_KEY；可选 FATETELL_LLM_BASE 与 FATETELL_LLM_MODEL。',
        });
      }

      try {
        const out = await interpret(payload);
        const rec = { text: out.text, model: out.model, usage: out.usage, at: Date.now() };
        CACHE.set(hash, rec);
        if (CACHE.size > 100) CACHE.delete(CACHE.keys().next().value);
        return json(res, 200, { ...rec, cached: false, ms: out.ms });
      } catch (e) {
        return json(res, e.code === 'BAD_KEY' ? 502 : 504, {
          error: e.message,
          code: e.code || 'UPSTREAM',
          detail: e.detail || undefined,
        });
      }
    }

    if (p === '/api/skill') {
      return json(res, 200, {
        name: 'fatetell-divination',
        version: '0.2.0',
        description: '中国传统术数工具层：排盘、起课、择日、定盘、典籍检索。所有工具确定性输出，可被界面或 LLM 调用。',
        categories: BOOKS.categories.map((c) => ({ id: c.id, name: c.name, methods: c.methods.map((m) => m.id) })),
        tools: TOOL_MANIFEST,
        vision: {
          endpoint: '/api/vision/{face|palm}',
          params: { image: 'data:image/jpeg;base64,…', kind: 'face|palm' },
          note: '面相与手相照片识别，返回题目 id → 选项 value；未配置视觉模型时返回 503。',
          optional: true,
        },
        retrieval: {
          endpoint: '/api/kb/search',
          params: { q: '关键词', cat: 'ming|bu|xiang|kan|ze', k: '1-20' },
          note: '返回带书名、底本、篇章、原文/提要标注的片段，供断语引用。',
        },
      });
    }

    if (p.startsWith('/api/tools/') && req.method === 'POST') {
      const name = p.slice('/api/tools/'.length);
      const fn = TOOLS[name];
      if (!fn) return json(res, 404, { error: 'unknown tool' });
      const body = await readBody(req);
      const result = fn(body);
      const cat = { paipan: 'ming', xiaoliuren: 'bu', zeri: 'ze', bazhai: 'kan', yangzhai: 'kan', yinzha: 'kan' }[name];
      const topic = {
        paipan: '月令 用神 调候 十神',
        xiaoliuren: '小六壬 六宫 口诀',
        zeri: '建除 择日 月建',
        bazhai: '八宅 命卦 生气',
        yangzhai: '八宅 命卦 床位 灶',
        yinzha: '葬书 乘生气 水法',
      }[name];
      result.citations = citationsFor(cat, topic, 3);
      return json(res, 200, result);
    }

    if (p.startsWith('/api/')) return json(res, 404, { error: 'not found' });

    /* 静态文件 */
    let file = path.normalize(path.join(ROOT, decodeURIComponent(p)));
    if (!file.startsWith(ROOT)) return json(res, 403, { error: 'forbidden' });
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      return res.end('404');
    }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      'content-type': MIME[ext] || 'application/octet-stream',
      'cache-control': ['.html', '.js', '.css'].includes(ext) ? 'no-store' : 'public, max-age=86400',
    });
    fs.createReadStream(file).pipe(res);
  } catch (err) {
    json(res, 400, { error: String(err.message || err) });
  }
});

/* 可选 HTTPS：手机端定位/方向传感器要求安全上下文。证书放 server/certs/{cert,key}.pem，可用 mkcert 生成并信任。 */
const useHttps = process.argv.includes('--https');
const handle = server.listeners('request')[0];

const onListen = (scheme) => () => {
  console.log(`fatetell server → ${scheme}://${HOST}:${PORT}  (${BOOKS.books.length} 部典籍 / ${PASSAGES.length} 条片段)`);
};

if (useHttps) {
  const cert = path.join(ROOT, 'server/certs/cert.pem');
  const key = path.join(ROOT, 'server/certs/key.pem');
  if (!fs.existsSync(cert) || !fs.existsSync(key)) {
    console.error('缺少证书：server/certs/cert.pem 或 server/certs/key.pem');
    console.error('可用 mkcert 生成：');
    console.error('  mkcert -install');
    console.error('  mkcert -key-file server/certs/key.pem -cert-file server/certs/cert.pem localhost 192.168.x.x');
    process.exit(1);
  }
  https.createServer({ key: fs.readFileSync(key), cert: fs.readFileSync(cert) }, handle)
    .listen(PORT, HOST, onListen('https'));
} else {
  server.listen(PORT, HOST, onListen('http'));
}

export { server };


