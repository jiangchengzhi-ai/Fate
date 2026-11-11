import http from 'node:http';

const server = http.createServer((req, res) => {
  let raw = '';
  req.on('data', (c) => { raw += c; });
  req.on('end', () => {
    if (req.url !== '/v1/chat/completions') {
      res.writeHead(404); return res.end('{}');
    }
    if (req.headers.authorization !== 'Bearer test-key') {
      res.writeHead(401, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ error: { message: 'invalid key' } }));
    }
    const body = JSON.parse(raw);
    const user = body.messages.find((m) => m.role === 'user')?.content || '';
    // 把 prompt 里的关键片段回显出来，方便断言“模型只读不改”
    const sawCite = /《/.test(user);
    const sawChart = /六维|四柱|宫位|日辰/.test(user);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      model: 'mock-1',
      choices: [{ message: { content: `从盘面看，这是一段克制的解读。\n\n引文${sawCite ? '已收到' : '缺失'}，排盘${sawChart ? '已收到' : '缺失'}。` } }],
      usage: { prompt_tokens: 120, completion_tokens: 48 },
    }));
  });
});

server.listen(5199, '127.0.0.1', () => console.log('mock llm on 5199'));
