/* ==========================================================================
   stats.mjs — 访问与调用计数（本地 JSON，按天聚合）
   data/stats.json：{ days: { 'YYYY-MM-DD': { views, events, models } }, totals }
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'data', 'stats.json');

const blankBucket = () => ({ views: {}, events: {}, models: {} });
const blank = () => ({ days: {}, totals: blankBucket() });

let state = (() => {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return blank(); }
})();

let timer = null;
let dirty = false;

function save() {
  if (!dirty) return;
  dirty = false;
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(state, null, 2) + '\n');
  } catch { /* 只留内存态 */ }
}

function schedule() {
  dirty = true;
  if (timer) return;
  timer = setTimeout(() => { timer = null; save(); }, 900);
  timer.unref?.();
}

const dayKey = (d = new Date()) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

function bucket(day = dayKey()) {
  if (!state.days[day]) state.days[day] = blankBucket();
  return state.days[day];
}

const bump = (obj, key, n = 1) => { obj[key] = (obj[key] || 0) + n; };

export function recordView(p) {
  const k = String(p || '/').slice(0, 120);
  bump(bucket().views, k);
  bump(state.totals.views, k);
  schedule();
}

export function recordEvent(name) {
  const k = String(name || '').slice(0, 120);
  if (!k) return;
  bump(bucket().events, k);
  bump(state.totals.events, k);
  schedule();
}

export function recordModel(kind, usage) {
  const b = bucket();
  if (!b.models[kind]) b.models[kind] = { calls: 0, in: 0, out: 0 };
  if (!state.totals.models[kind]) state.totals.models[kind] = { calls: 0, in: 0, out: 0 };
  const inTok = Number(usage?.prompt_tokens || 0);
  const outTok = Number(usage?.completion_tokens || 0);
  for (const m of [b.models[kind], state.totals.models[kind]]) {
    m.calls += 1;
    m.in += inTok;
    m.out += outTok;
  }
  schedule();
}

export function snapshot(days = 14) {
  const out = { days: [], totals: state.totals };
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = dayKey(d);
    const b = state.days[key] || blankBucket();
    const sum = (o) => Object.values(o || {}).reduce((a, n) => a + n, 0);
    out.days.push({
      day: key,
      views: sum(b.views),
      events: sum(b.events),
      calls: sum(Object.values(b.models).map((m) => m.calls || 0)),
      tokens: sum(Object.values(b.models).map((m) => (m.in || 0) + (m.out || 0))),
      raw: b,
    });
  }
  return out;
}

export function today() {
  const b = bucket();
  const sum = (o) => Object.values(o || {}).reduce((a, n) => a + n, 0);
  const models = Object.entries(b.models || {});
  return {
    day: dayKey(),
    views: sum(b.views),
    events: sum(b.events),
    calls: sum(models.map(([, m]) => m.calls || 0)),
    tokens: sum(models.map(([, m]) => (m.in || 0) + (m.out || 0))),
    topViews: Object.entries(b.views || {}).sort((a, b2) => b2[1] - a[1]).slice(0, 8),
    topEvents: Object.entries(b.events || {}).sort((a, b2) => b2[1] - a[1]).slice(0, 10),
    models: b.models || {},
  };
}

export function flush() { save(); }
