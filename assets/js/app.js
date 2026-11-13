/* ==========================================================================
   app.js — 路由与装配
   ========================================================================== */
import { $, esc, installFrame, upgradeChoices, toast, go, goBack , maybeWechatHint } from './ui.js';
import { track } from './track.js';
import { homeView } from './views/home.js';
import { faceView, palmView } from './views/reading.js';
import { comboView } from './views/combo.js';
import { compassView } from './views/compass.js';
import { reportView } from './views/report.js';
import { historyView, aboutView } from './views/misc.js';
import { store } from './store.js';
import { categoryView } from './views/library.js';
import { mingView, buView, zeView, hepanView } from './views/arts.js';
import { yinzhaView } from './views/yinzha.js';

const routes = [
  { re: /^#\/?$/, view: homeView, title: '问鹤 · 五门问事' },
  { re: /^#\/c\/(ming|bu|xiang|kan|ze)$/, view: categoryView, title: '门 · 问鹤', params: (m) => [m[1]] },
  { re: /^#\/ming$/, view: mingView, title: '四柱 · 问鹤' },
  { re: /^#\/bu$/, view: buView, title: '起课 · 问鹤' },
  { re: /^#\/ze$/, view: zeView, title: '择日 · 问鹤' },
  { re: /^#\/hepan$/, view: hepanView, title: '合盘 · 问鹤' },
  { re: /^#\/yinzha$/, view: yinzhaView, title: '阴宅 · 问鹤' },
  { re: /^#\/face$/, view: faceView, title: '面相 · 问鹤' },
  { re: /^#\/palm$/, view: palmView, title: '手相 · 问鹤' },
  { re: /^#\/combo$/, view: comboView, title: '综合相 · 问鹤' },
  { re: /^#\/compass$/, view: compassView, title: '罗盘风水 · 问鹤' },
  { re: /^#\/report\/([\w-]+)$/, view: reportView, title: '批注 · 问鹤', params: (m) => [m[1]] },
  { re: /^#\/history$/, view: historyView, title: '批注簿 · 问鹤' },
  { re: /^#\/about$/, view: aboutView, title: '关于 · 问鹤' },
];

function notFoundView() {
  return {
    html: `
      <header class="topbar">
        <a class="brand" href="#/">fatetell</a>
        <a class="tb-link" href="#/history">批注簿</a>
      </header>
      <div class="empty">
        <span class="glyph">缺</span>
        这一页没有找到。<br>
        可能是页面还是旧版本，刷新一次再试；<br>
        或者<a href="#/" style="color:var(--brass-hi)">回命盘</a>。
      </div>`,
  };
}

let lastHash = null;
let lastAt = 0;

/* 站内足迹：返回时回到上一级，而不是一律回首页 */
let trail = (() => {
  try {
    const raw = JSON.parse(sessionStorage.getItem('ft.trail') || '[]');
    return Array.isArray(raw) ? raw.filter((x) => typeof x === 'string' && x.startsWith('#/')) : [];
  } catch { return []; }
})();

function remember(hash) {
  if (!hash.startsWith('#/')) return;
  if (trail[trail.length - 1] === hash) return;
  trail.push(hash);
  if (trail.length > 30) trail.shift();
  try { sessionStorage.setItem('ft.trail', JSON.stringify(trail)); } catch { /* 隐私模式 */ }
}

window.__back = (fallback = '#/') => {
  trail.pop();
  const prev = trail[trail.length - 1];
  try { sessionStorage.setItem('ft.trail', JSON.stringify(trail)); } catch { /* ignore */ }
  go(prev || fallback);
};

function renderPage(target) {
  const hash = (typeof target === 'string' && target) ? target : (location.hash || '#/');
  const app = $('#app');
  const now = Date.now();
  // 同一次跳转可能被 hashchange 与兜底逻辑各触发一次，去重
  if (hash === lastHash && now - lastAt < 150) return;
  lastHash = hash;
  lastAt = now;
  remember(hash);


  // 换页时关掉可能残留的弹层，避免遮住新页面
  const layer = $('#layer');
  if (layer && layer.classList.contains('on')) {
    layer.classList.remove('on');
    layer.innerHTML = '';
  }

  let matched = null;
  for (const r of routes) {
    const m = hash.match(r.re);
    if (m) { matched = { route: r, args: r.params ? r.params(m) : [] }; break; }
  }
  if (!matched) {
    if (hash && hash !== '#' && hash !== '#/') {
      console.warn('[fatetell] 未匹配的路由：', hash);
      matched = { route: { view: notFoundView, title: '未找到 · 问鹤' }, args: [] };
    } else {
      matched = { route: routes[0], args: [] };
    }
  }

  const { html, mount: after } = matched.route.view(...matched.args);
  document.title = matched.route.title;
  app.innerHTML = `<div class="view" role="main">${html}</div>`;
  after?.();
  window.scrollTo(0, 0);
  upgradeChoices(app);
  if (store.takeTrimNotice()) toast('批注簿最多存 24 页，最旧的一页已移出', { ms: 4000 });
  installFrame();
  track('view', { path: hash });
}

/* 渲染失败时给出可见提示，不让页面变成一片黑 */
function mount(target) {
  try {
    renderPage(target);
  } catch (err) {
    console.error('[fatetell] 渲染失败', err);
    const app = $('#app');
    if (app) {
      app.innerHTML = `<div class="empty"><span class="glyph">错</span>页面渲染失败：${esc(err.message || String(err))}<br>刷新一次；仍不行就把这句发我。</div>`;
    }
  }
}

/* 给 ui.go() 用：受限面板里 location 不能改，也能跳 */
window.__route = mount;

/* 点击后同步单选状态（视图仍维护 aria-pressed，样式不动） */
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[role="radio"]');
  if (!btn) return;
  const g = btn.closest('[role="radiogroup"]');
  if (!g) return;
  g.querySelectorAll('[role="radio"]').forEach((x) => {
    const on = x === btn;
    x.setAttribute('aria-checked', String(on));
    x.tabIndex = on ? 0 : -1;
  });
});

window.addEventListener('hashchange', () => mount());
window.addEventListener('popstate', () => mount());

/* 自己接管站内跳转：内嵌预览面板常禁用链接默认行为，甚至锁住 location，
   所以不让跳转依赖浏览器，直接按目标 hash 重挂。 */
document.addEventListener('click', (e) => {
  const back = e.target.closest('[data-back]');
  if (back) {
    e.preventDefault();
    goBack(back.getAttribute('data-fallback') || '#/');
    return;
  }

  const submit = e.target.closest('[data-go],[data-submit]');
  if (submit) {
    const label = (submit.textContent || '').trim().replace(/\s+/g, '').slice(0, 12);
    track('click', { name: `${location.hash || '#/'} · ${label || '提交'}` });
  }

  const a = e.target.closest('a[href^="#/"]');
  if (!a) return;
  const href = a.getAttribute('href');
  e.preventDefault();

  const label = (a.querySelector('.gate-name')?.textContent || a.querySelector('.method-name')?.textContent || '')
    .trim().replace(/\s+/g, '').slice(0, 24);
  track('click', { name: label ? `入口:${label}` : `链接:${href}` });

  try { location.hash = href; } catch { /* 面板限制时忽略 */ }
  mount(href);
});

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => { mount(); maybeWechatHint(); });
} else {
  mount();
  maybeWechatHint();
}

/* 键盘：Esc 关闭弹层 */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const layer = $('#layer');
    if (layer && layer.classList.contains('on')) {
      layer.classList.remove('on');
      setTimeout(() => { layer.innerHTML = ''; }, 380);
    }
  }
});
