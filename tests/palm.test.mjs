import assert from 'node:assert/strict';
import { applyPalmRules } from '../server/rules.mjs';
import { parseFeatures } from '../server/vision.mjs';

let pass = 0;
const ok = (name, fn) => { fn(); pass++; console.log('ok  ', name); };

ok('掌型：长宽比 → 木 / 金 / 水 / 土', () => {
  assert.equal(applyPalmRules({ palmRatio: 1.5 }).features.shape, 'wood');
  assert.equal(applyPalmRules({ palmRatio: 1.3 }).features.shape, 'metal');
  assert.equal(applyPalmRules({ palmRatio: 1.1 }).features.shape, 'water');
  assert.equal(applyPalmRules({ palmRatio: 0.95 }).features.shape, 'earth');
});

ok('指长：指掌比 ≥1 偏思，≤0.8 偏行', () => {
  assert.equal(applyPalmRules({ fingerPalmRatio: 1.05 }).features.finger, 'long');
  assert.equal(applyPalmRules({ fingerPalmRatio: 0.75 }).features.finger, 'short');
});

ok('食指/无名指比例', () => {
  assert.equal(applyPalmRules({ indexRingRatio: 1.08 }).features.finger, 'index');
  assert.equal(applyPalmRules({ indexRingRatio: 0.86 }).features.finger, 'ring');
});

ok('依据指向麻衣神相', () => {
  const r = applyPalmRules({ palmRatio: 1.45 });
  assert.ok(r.basis.length >= 1);
  assert.ok(r.basis.some((b) => b.book.includes('麻衣')));
});

ok('parseFeatures 合并手相测量并覆盖模型判断', () => {
  const out = parseFeatures(JSON.stringify({ features: { shape: 'fire', thick: 'thick' }, confidence: 70 }), 'palm', { palmRatio: 1.46 });
  assert.equal(out.features.shape, 'wood');
  assert.equal(out.features.thick, 'thick');
  assert.equal(out.measures.source, 'mediapipe-hand-21');
  assert.equal(out.applied[0].id, 'palm-wood');
});

console.log(`\n${pass} passed`);
