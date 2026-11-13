/* ==========================================================================
   rules.mjs — 相法规则引擎
   规则来自 knowledge/rules/*.json，判据来自 468 点测量值，
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
  const rules = loadJson('knowledge/rules/face.json');
  const passages = loadJson('knowledge/passages.json');
  const books = loadJson('knowledge/books.json');
  const passageList = Array.isArray(passages) ? passages : passages.passages;
  const bookList = Array.isArray(books) ? books : books.books;

  const byId = new Map(passageList.map((p) => [p.id, p]));
  const bookName = (id) => bookList.find((b) => b.id === id)?.title || id;

  cache = { rules, byId, bookName };
  return cache;
}

const matchWhen = (measures, when = {}) => {
  for (const [key, cond] of Object.entries(when)) {
    const v = measures?.[key];
    if (typeof v !== 'number') return false;
    if (cond.min != null && v < cond.min) return false;
    if (cond.max != null && v > cond.max) return false;
  }
  return true;
};

export function loadFaceRules() {
  return load().rules;
}

/* 返回 { features, applied: [{id, field, value, title, reason}], basis: [{id, book, chapter, text}] } */
export function applyFaceRules(measures) {
  if (!measures || typeof measures !== 'object') return { features: {}, applied: [], basis: [] };
  const { rules, byId, bookName } = load();

  const features = {};
  const applied = [];
  const basisIds = new Set();

  for (const rule of rules.rules) {
    if (features[rule.field] != null) continue; // 同一字段先命中先采用
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

export function ruleMeta() {
  const { rules } = load();
  return {
    version: rules.version,
    ruleCount: rules.rules.length,
    modelOnlyFields: rules.modelOnlyFields,
    modelOnlyNote: rules.modelOnlyNote,
  };
}
