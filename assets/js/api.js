/* 与 Node 服务通信；服务未启动时给出可读的降级提示 */
const base = '';

async function req(path, opt) {
  const res = await fetch(base + path, opt);
  let data = null;
  try { data = await res.json(); } catch { /* 非 JSON */ }
  if (!res.ok) {
    const err = new Error((data && data.error) || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  online: null,
  async health() {
    try {
      const r = await req('/api/health');
      api.online = true;
      return r;
    } catch {
      api.online = false;
      return null;
    }
  },
  categories: () => req('/api/kb/categories'),
  books: (cat = '', q = '') => req(`/api/kb/books?cat=${encodeURIComponent(cat)}&q=${encodeURIComponent(q)}`),
  search: (q, cat = '', k = 8) => req(`/api/kb/search?q=${encodeURIComponent(q)}&cat=${encodeURIComponent(cat)}&k=${k}`),
  passages: (book) => req(`/api/kb/passages?book=${encodeURIComponent(book)}`),
  tool: (name, body) => req(`/api/tools/${name}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }),
  llmStatus: () => req('/api/llm/status'),
  interpret: (body) => req('/api/interpret', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }),
  visionStatus: () => req('/api/vision/status'),
  vision: (kind, image, measures) => req(`/api/vision/${kind === 'palm' ? 'palm' : 'face'}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ image, measures: measures || undefined }),
  }),
  visionFace: (image) => req('/api/vision/face', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ image }),
  }),
};
