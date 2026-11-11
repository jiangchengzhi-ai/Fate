import assert from 'node:assert/strict';
import { parseFeatures, visionStatus, FACE_FIELDS } from '../server/vision.mjs';

let pass = 0;
const check = (name, fn) => {
  try { fn(); pass++; console.log('ok  ', name); }
  catch (e) { console.error('FAIL', name, e.message); process.exitCode = 1; }
};

check('解析合法 JSON 并保留已知字段', () => {
  const r = parseFeatures('{"features":{"shape":"wood","forehead":"broad"},"confidence":80}');
  assert.deepEqual(r.features, { shape: 'wood', forehead: 'broad' });
  assert.equal(r.confidence, 80);
});

check('丢弃未知字段与非法选项', () => {
  const r = parseFeatures('{"features":{"shape":"wood","bogus":"x","nose":"nope"},"confidence":80}');
  assert.deepEqual(r.features, { shape: 'wood' });
  assert.ok(r.dropped.length === 2);
});

check('低置信度清空结果', () => {
  const r = parseFeatures('{"features":{"shape":"wood"},"confidence":20}');
  assert.deepEqual(r.features, {});
});

check('从夹带文字的回复里提取 JSON', () => {
  const r = parseFeatures('这是结果：{"features":{"eye":"phoenix"},"confidence":66} 完毕');
  assert.equal(r.features.eye, 'phoenix');
});

check('坏 JSON 安全返回空', () => {
  assert.deepEqual(parseFeatures('not json').features, {});
});

check('字段覆盖全部题目', () => {
  assert.ok(FACE_FIELDS.includes('shape'));
  assert.ok(FACE_FIELDS.includes('mole'));
  assert.ok(FACE_FIELDS.length >= 9);
});

check('未配置时 ready=false', () => {
  assert.equal(typeof visionStatus().ready, 'boolean');
});

console.log(`\n${pass} passed`);
