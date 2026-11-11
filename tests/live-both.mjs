import fs from 'node:fs';

const B = 'http://127.0.0.1:5173';
const b64 = fs.readFileSync('preview/face-test.jpg').toString('base64');

const t0 = Date.now();
const r = await fetch(`${B}/api/vision/face`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ image: `data:image/jpeg;base64,${b64}` }),
});
console.log('vision http', r.status, 'ms', Date.now() - t0);
const v = await r.json();
console.log(JSON.stringify(v, null, 2));

const t1 = Date.now();
const lr = await fetch(`${B}/api/interpret`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    kind: '命',
    chart: '甲戌 壬申 丙午 甲午｜日主丙火，身旺，喜用金、土｜起运8岁11个月｜大运：癸酉、甲戌、乙亥、丙子',
    question: '今年工作怎么安排',
    passages: [],
  }),
});
console.log('llm http', lr.status, 'ms', Date.now() - t1);
const l = await lr.json();
console.log(JSON.stringify(l, null, 2).slice(0, 1600));
