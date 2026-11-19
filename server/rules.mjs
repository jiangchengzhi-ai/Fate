/* ==========================================================================
   rules.mjs — 相法规则引擎（面相 468 点 / 手相 21 点）
   规则来自 knowledge/rules/{face,palm}.json，
   依据指向 knowledge/passages.json 里的公版相法条文。
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const loadJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

let cache = null;

function load() {
  if (cache) return cache;
  const face = loadJson('knowledge/rules/face.json');
  const palm = loadJson('knowledge/rules/palm.json');
  const passages = loadJson('knowledge/passages.json');
  const books = loadJson('knowledge/books.json');
  const passageList = Array.isArray(passages) ? passages : passages.passages;
  const bookList = Array.isArray(books) ? books : books.books;

  const byId = new Map(passageList.map((p) => [p.id, p]));
  const bookName = (id) => bookList.find((b) => b.id === id)?.title || id;

  cache = { face, palm, byId, bookName };
  return cache;
}

const matchWhen = (measures, when = {}) => {
  for (const [key, cond] of Object.entries(when)) {
    const v = measures?.[key];
    if (typeof v !== 'number') return false;
    if (cond.min != null && v < cond.min) return false;
    if (cond.max != null && v > cond.max) return false;
    if (Array.isArray(cond.between)) {
      const [lo, hi] = cond.between;
      if (v < lo || v > hi) return false;
    }
  }
  return true;
};

function applyRuleSet(ruleSet, measures) {
  if (!measures || typeof measures !== 'object') return { features: {}, applied: [], basis: [] };
  const { byId, bookName } = load();
  const features = {};
  const applied = [];
  const basisIds = new Set();

  for (const rule of ruleSet.rules) {
    if (features[rule.field] != null) continue;
    if (!matchWhen(measures, rule.when)) continue;
    features[rule.field] = rule.value;
    applied.push({ id: rule.id, field: rule.field, value: rule.value, title: rule.title, reason: rule.reason });
    for (const b of rule.basis || []) basisIds.add(b);
  }

  const basis = [...basisIds].map((id) => {
    const p = byId.get(id);
    if (!p) return { id, book: '', chapter: '', text: '' };
    return { id, book: bookName(p.book), chapter: p.chapter, text: p.text };
  });

  return { features, applied, basis };
}

export const loadFaceRules = () => load().face;
export const loadPalmRules = () => load().palm;
export const applyFaceRules = (m) => applyRuleSet(load().face, m);
export const applyPalmRules = (m) => applyRuleSet(load().palm, m);

export function ruleMeta(kind = 'face') {
  const { face, palm } = load();
  const r = kind === 'palm' ? palm : face;
  return { version: r.version, ruleCount: r.rules.length, modelOnlyFields: r.modelOnlyFields, modelOnlyNote: r.modelOnlyNote };
}
