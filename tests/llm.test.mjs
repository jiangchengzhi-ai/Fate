/* 端到端验证模型接入：本地假模型 + 同进程启动服务，不依赖外网 */
import http from 'node:http';

const MOCK = 5199;
const APP = 5174;

process.env.FATETELL_LLM_KEY = 'test-key';
process.env.FATETELL_LLM_BASE = `http://127.0.0.1:${MOCK}/v1`;
process.env.FATETELL_LLM_MODEL = 'mock-1';
process.argv = [process.argv[0], 'server', '--port', String(APP)];

let sawCite = false;
let sawChart = false;
let calls = 0;

const mock = http.createServer((req, res) => {
  let raw = '';
  req.on('data', (c) => { raw += c; });
  req.on('end', () => {
    calls++;
    if (req.headers.authorization !== 'Bearer test-key') {
      res.writeHead(401, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ error: { message: 'invalid key' } }));
    }
    const body = JSON.parse(raw);
    const user = body.messages.find((m) => m.role === 'user')?.content || '';
    sawCite = /《三命通会》/.test(user);
    sawChart = /六维/.test(user) && /甲戌/.test(user);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      model: 'mock-1',
      choices: [{ message: { content: '第一段：从盘面看，火土偏旺。\n\n第二段：宜守中带进，不必急。' } }],
      usage: { prompt_tokens: 120, completion_tokens: 48 },
    }));
  });
});
await new Promise((r) => mock.listen(MOCK, '127.0.0.1', r));

const { server } = await import('../server/server.mjs');
await new Promise((r) => setTimeout(r, 400));

const post = (body) => fetch(`http://127.0.0.1:${APP}/api/interpret`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

const payload = {
  kind: '命',
  chart: '四柱：甲戌 壬申 丙午 乙未\n六维：事业80 财帛70',
  passages: [{ bookTitle: '三命通会', chapter: '卷首·十神', kind: '提要', text: '十神是关系的名字' }],
  question: '我适合换工作吗',
};

const status = await (await fetch(`http://127.0.0.1:${APP}/api/llm/status`)).json();
console.log('status', status);

const first = await post(payload);
const a = await first.json();
console.log('first', first.status, JSON.stringify(a).slice(0, 160));

const second = await post(payload);
const b = await second.json();
console.log('second cached =', b.cached);

// 密钥错误
process.env.FATETELL_LLM_KEY = 'test-key'; // 不重启，改 mock 侧校验无法触发；跳过

const bad = await post({ kind: '命', chart: '' });
console.log('empty chart =', bad.status);

let fail = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fail++; };
ok(status.ready === true && status.model === 'mock-1', '状态已就绪');
ok(first.status === 200 && a.text.includes('第一段'), '返回模型文本');
ok(sawCite, 'prompt 中带上了引文');
ok(sawChart, 'prompt 中带上了排盘');
ok(b.cached === true && calls === 1, '第二次命中缓存，未重复调用');
ok(bad.status === 400, '缺排盘时返回 400');

await new Promise((r) => server.close(r));
mock.close();
setTimeout(() => { process.exitCode = fail ? 1 : 0; }, 50);
