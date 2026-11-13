import assert from 'node:assert/strict';
import { applyFaceRules, ruleMeta } from '../server/rules.mjs';
import { parseFeatures } from '../server/vision.mjs';

let pass = 0;
const ok = (name, fn) => { fn(); pass++; console.log('ok  ', name); };

ok('规则库已加载', () => {
  const m = ruleMeta();
  assert.ok(m.ruleCount >= 23);
  assert.deepEqual(m.modelOnlyFields, ['brow', 'chin', 'mole']);
});

ok('脸型：长宽比 → 木，下颌宽 → 土', () => {
  assert.equal(applyFaceRules({ faceWH: 1.6 }).features.shape, 'wood');
  assert.equal(applyFaceRules({ jawWidth: 0.85 }).features.shape, 'earth');
  assert.equal(applyFaceRules({ faceWH: 1.2, jawWidth: 0.7 }).features.shape, 'water');
});

ok('上停：高阔 / 窄', () => {
  assert.equal(applyFaceRules({ upper: 0.39 }).features.forehead, 'broad');
  assert.equal(applyFaceRules({ upper: 0.30 }).features.forehead, 'narrow');
});

ok('眼：上扬 / 下垂 / 三白', () => {
  assert.equal(applyFaceRules({ eyeTilt: -0.02 }).features.eye, 'uplift');
  assert.equal(applyFaceRules({ eyeTilt: 0.02 }).features.eye, 'droop');
  assert.equal(applyFaceRules({ eyeGap: 1.4 }).features.eye, 'sanbai');
});

ok('鼻：宽 / 小 / 高', () => {
  assert.equal(applyFaceRules({ noseWidth: 0.3 }).features.nose, 'flare');
  assert.equal(applyFaceRules({ noseWidth: 0.18 }).features.nose, 'small');
  assert.equal(applyFaceRules({ noseLen: 0.36 }).features.nose, 'high');
});

ok('颧与口', () => {
  assert.equal(applyFaceRules({ cheekWidth: 0.9 }).features.cheek, 'full');
  assert.equal(applyFaceRules({ cheekWidth: 0.7 }).features.cheek, 'thin');
  assert.equal(applyFaceRules({ mouthWidth: 0.45 }).features.mouth, 'wide');
  assert.equal(applyFaceRules({ lipThick: 0.1 }).features.mouth, 'thick');
});

ok('地阁：方 / 尖 / 圆', () => {
  assert.equal(applyFaceRules({ chinRatio: 0.9 }).features.chin, 'square');
  assert.equal(applyFaceRules({ chinRatio: 0.6 }).features.chin, 'pointed');
  assert.equal(applyFaceRules({ chinRatio: 0.75 }).features.chin, 'round');
});

ok('两颧高起：颧宽/下颌宽 ≥ 1.12', () => {
  assert.equal(applyFaceRules({ cheekWidth: 0.86, cheekJawRatio: 1.2 }).features.cheek, 'high');
});

ok('每条命中都带古籍依据', () => {
  const r = applyFaceRules({ faceWH: 1.6, upper: 0.39 });
  assert.ok(r.applied.length >= 2);
  assert.ok(r.basis.length >= 1);
  assert.ok(r.basis.every((b) => b.book && b.chapter && b.text));
  assert.ok(r.basis.some((b) => b.book === '神相全编'));
});

ok('无测量值时不产生覆盖', () => {
  const r = applyFaceRules(null);
  assert.deepEqual(r.features, {});
  assert.equal(r.applied.length, 0);
});

ok('parseFeatures 合并客户端测量并返回依据', () => {
  const out = parseFeatures(JSON.stringify({ features: { shape: 'fire', brow: 'thick' }, confidence: 66 }), 'face', { faceWH: 1.58, upper: 0.38 });
  assert.equal(out.features.shape, 'wood');
  assert.equal(out.features.forehead, 'broad');
  assert.equal(out.features.brow, 'thick');
  assert.equal(out.measures.source, 'mediapipe-468');
  assert.ok(out.applied.some((a) => a.id === 'shape-wood'));
});

console.log(`\n${pass} passed`);
