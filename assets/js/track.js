/* 客户端埋点：页面访问与功能点击，失败静默 */
export function track(name, props = {}) {
  try {
    fetch('/api/stats/event', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...props, name }),
      keepalive: true,
    }).catch(() => {});
  } catch { /* ignore */ }
}
