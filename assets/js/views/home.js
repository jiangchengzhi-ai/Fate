import { esc, noticeSeen, markNoticeSeen } from '../ui.js';
import { store } from '../store.js';

const MARK = `<svg class="brand-mark" viewBox="0 0 24 24" aria-hidden="true">
  <circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" stroke-width="1"/>
  <circle cx="12" cy="12" r="4.6" fill="none" stroke="currentColor" stroke-width=".7" opacity=".55"/>
  <circle cx="12" cy="12" r="1.3" fill="#A33B2B"/>
</svg>`;

const GATES = [
  { glyph: '命', name: '命理', desc: '填写出生时间，看一生的运势起伏', href: '#/ming' },
  { glyph: '卜', name: '占卜', desc: '心里想一件事，看眼下顺不顺', href: '#/bu' },
  { glyph: '相', name: '看相', desc: '上传照片，看面相或手相', href: '#/face' },
  { glyph: '堪', name: '风水', desc: '看房子的坐向，讲家里怎么摆', href: '#/compass' },
  { glyph: '择', name: '择日', desc: '挑好日子：结婚、搬家、开业', href: '#/ze' },
];

export function homeView() {
  const { reports } = store.get();
  const recent = reports.slice(0, 3);

  const recentHtml = recent.length ? `
    <section class="sec">
      <div class="sec-head">
        <h2>上次看过的</h2>
        <a class="more" href="#/history">全部</a>
      </div>
      <div class="recent">
        ${recent.map((r) => `
          <a class="rec" href="#/report/${esc(r.id)}">
            <span class="rec-seal">${esc(r.glyph || '相')}</span>
            <span class="rec-main">
              <span class="rec-title">${esc(r.title)}</span>
              <span class="rec-meta">${esc(r.dateLabel)}　${esc(r.level?.name || '')}</span>
            </span>
            <span class="rec-go">查看 ›</span>
          </a>`).join('')}
      </div>
    </section>` : '';

  return {
    html: `
    <header class="topbar">
      <a class="brand" href="#/">${MARK}<span>问鹤</span></a>
      <a class="tb-link" href="#/history">我的记录</a>
    </header>

    ${noticeSeen() ? '' : `
    <div class="notice-card" data-notice>
      <p>仅供娱乐参考，不能代替专业意见。</p>
      <button type="button" data-notice-close>知道了</button>
    </div>`}

    <h1 class="home-title">您想看什么？</h1>
    <p class="home-sub">点一下下面的方框，按提示填写即可。</p>

    <nav class="gate-list">
      ${GATES.map((g) => `
        <a class="gate-card" href="${g.href}">
          <span class="gate-glyph">${g.glyph}</span>
          <span class="gate-text">
            <span class="gate-name">${g.name}</span>
            <span class="gate-desc">${g.desc}</span>
          </span>
          <span class="gate-arrow">›</span>
        </a>`).join('')}
    </nav>

${recentHtml}

    <div class="home-help">
      看不清字？可以把手机字号调大，页面会跟着放大。
      <a href="#/about">关于这个软件</a>
    </div>

    <footer class="foot">仅供娱乐参考</footer>
    `,
    mount: () => {
      const notice = document.querySelector('[data-notice]');
      notice?.querySelector('[data-notice-close]')?.addEventListener('click', () => {
        markNoticeSeen();
        notice.remove();
      });
    },
  };
}
