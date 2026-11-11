const B = 'http://127.0.0.1:5173';
const IMG = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Abraham_Lincoln_O-77_matte_collodion_print.jpg/512px-Abraham_Lincoln_O-77_matte_collodion_print.jpg';

const r = await fetch(IMG);
console.log('image', r.status, r.headers.get('content-type'), r.headers.get('content-length'));
const buf = Buffer.from(await r.arrayBuffer());
const dataUrl = `data:image/jpeg;base64,${buf.toString('base64')}`;
console.log('bytes', buf.length);

const s = await fetch(`${B}/api/vision/status`).then((x) => x.json());
console.log('status', s);

const t0 = Date.now();
const res = await fetch(`${B}/api/vision/face`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ image: dataUrl }),
});
const out = await res.json();
console.log('http', res.status, 'ms', Date.now() - t0);
console.log(JSON.stringify(out, null, 2));
