import fs from 'node:fs';

const PORT = 9226;
const FILE = 'file:///C:/Users/12053/Desktop/%E5%A7%9C%E6%89%BF%E5%BF%97/fatetell%E8%BD%AF%E4%BB%B6/fatetell-offline.html';
const OUT = 'C:/Users/12053/Desktop/姜承志/fatetell软件/shots3';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });

async function pageWs() {
  for (let i = 0; i < 40; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch { /* wait */ }
    await sleep(250);
  }
  throw new Error('devtools not reachable');
}

const ws = new WebSocket(await pageWs());
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let seq = 0;
const pending = new Map();
const errors = [];
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { res, rej } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result);
    return;
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    const d = msg.params.exceptionDetails;
    errors.push(`EXCEPTION: ${d.text} ${d.exception?.description || ''}`);
  }
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
    errors.push(`CONSOLE: ${msg.params.args.map((a) => a.value || a.description || '').join(' ')}`);
  }
});
const send = (method, params = {}) => new Promise((res, rej) => {
  const id = ++seq;
  pending.set(id, { res, rej });
  ws.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
  return r.result.value;
};

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

await send('Page.navigate', { url: FILE });
await sleep(1500);
console.log('html length:', await evaluate(`document.querySelector('#app').innerHTML.length`));
console.log('text:', (await evaluate('document.body.innerText')).slice(0, 100).replace(/\n/g, ' | '));

async function shot(name) {
  const m = await send('Page.getLayoutMetrics');
  const h = Math.min(5000, Math.ceil(m.cssContentSize.height));
  const { data } = await send('Page.captureScreenshot', {
    format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: 390, height: h, scale: 1 },
  });
  fs.writeFileSync(`${OUT}/${name}.png`, Buffer.from(data, 'base64'));
}
await shot('offline-home');

await evaluate(`location.hash = '#/c/kan'`);
await sleep(900);
console.log('kan:', (await evaluate('document.body.innerText')).slice(0, 90).replace(/\n/g, ' | '));

await evaluate(`location.hash = '#/yinzha'`);
await sleep(900);
console.log('yinzha:', (await evaluate('document.body.innerText')).slice(0, 90).replace(/\n/g, ' | '));
await shot('offline-yinzha');

console.log('--- errors ---');
console.log(errors.length ? errors.join('\n') : 'none');
ws.close();
