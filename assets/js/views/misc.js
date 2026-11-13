import { store } from '../store.js';
import { $, esc, openSheet, closeSheet, toast, go } from '../ui.js';

function listHtml(reports) {
  if (!reports.length) {
    return `
      <div class="empty">
        <span class="glyph">簿</span>
        还没有批注。<br>
        从<a href="#/face" style="color:var(--brass-hi)">面相</a>或<a href="#/palm" style="color:var(--brass-hi)">手相</a>开始，第一页就有了。
      </div>`;
  }

  const groups = [];
  for (const r of reports) {
    const last = groups[groups.length - 1];
    if (last && last.date === r.dateLabel) last.items.push(r);
    else groups.push({ date: r.dateLabel, items: [r] });
  }

  return groups.map((g) => `
    <section class="hist-group">
      <div class="hist-date">${esc(g.date)}</div>
      <div class="recent" data-list>
        ${g.items.map((r) => `
          <div class="rec" data-id="${esc(r.id)}">
            <a class="rec-seal" href="#/report/${esc(r.id)}">${esc(r.glyph || '相')}</a>
            <a class="rec-main" href="#/report/${esc(r.id)}">
              <span class="rec-title">${esc(r.title)}</span>
              <span class="rec-meta">${esc(r.level?.name || '')}　${esc((r.traits || []).slice(0, 2).join('、'))}</span>
            </a>
            <span class="rec-score">${r.overall ?? '—'}<small>${r.overall ? '分' : ''}</small></span>
            <button class="rec-del" type="button" data-del="${esc(r.id)}" aria-label="删除这条批注">×</button>
          </div>`).join('')}
      </div>
    </section>`).join('');
}

export function historyView() {
  const { reports } = store.get();

  const html = `
    <header class="topbar">
      <a class="brand" href="#/">问鹤</a>
      ${reports.length ? '<button class="tb-link" type="button" data-clear>清空</button>' : '<a class="tb-link" href="#/">回命盘</a>'}
    </header>

    <header class="page-head">
      <a class="back" href="#/" data-back><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>返回</a>
      <h1>我的记录</h1>
      <span></span>
    </header>

    <div data-listwrap>${listHtml(reports)}</div>

    <footer class="foot" data-foot>共 ${reports.length} 页，存在本机浏览器里</footer>`;

  const mount = () => {
    const root = $('#app .view');
    root.addEventListener('click', (e) => {
      const del = e.target.closest('[data-del]');
      if (del) {
        const id = del.dataset.del;
        openSheet(`
          <h2>删掉这页？</h2>
          <p>删除后无法恢复，其余批注不受影响。</p>
          <div class="acts">
            <button class="btn btn-primary" type="button" data-confirm>删除</button>
            <button class="btn btn-ghost" type="button" data-close>保留</button>
          </div>`);
        const confirmBtn = $('[data-confirm]');
        confirmBtn?.addEventListener('click', () => {
          const removed = store.report(id);
          store.remove(id);
          closeSheet();
          const left = store.get().reports;
          const wrap = $('[data-listwrap]', root);
          if (wrap) wrap.innerHTML = listHtml(left);
          const foot = $('[data-foot]', root);
          if (foot) foot.textContent = `共 ${left.length} 页，存在本机浏览器里`;
          if (!left.length) $('[data-clear]', root)?.remove();
          if (removed) {
            toast('已删除这页批注', {
              actionLabel: '撤销',
              onAction: () => {
                store.addReport(removed);
                const back = store.get().reports;
                const w = $('[data-listwrap]', root);
                if (w) w.innerHTML = listHtml(back);
                const f = $('[data-foot]', root);
                if (f) f.textContent = `共 ${back.length} 页，存在本机浏览器里`;
                toast('已恢复');
              },
            });
          }
        });
        return;
      }

      if (e.target.closest('[data-clear]')) {
        openSheet(`
          <h2>清空全部记录？</h2>
          <p>所有记录都会被删除，不能恢复。</p>
          <div class="acts">
            <button class="btn btn-primary" type="button" data-confirm>全部清空</button>
            <button class="btn btn-ghost" type="button" data-close>再想想</button>
          </div>`);
        $('[data-confirm]')?.addEventListener('click', () => {
          store.clearAll();
          closeSheet();
          go('#/');
        });
      }
    });
  };

  return { html, mount };
}

export function aboutView() {
  return {
    html: `
    <header class="topbar">
      <a class="brand" href="#/">问鹤</a>
      <a class="tb-link" href="#/history">我的记录</a>
    </header>

    <header class="page-head">
      <a class="back" href="#/" data-back><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>返回</a>
      <h1>相法</h1>
      <span></span>
    </header>

    <section class="sec" style="margin-top:16px">
      <div class="sec-head"><h2>这是什么</h2></div>
      <p class="lead" style="margin-top:14px">
        问鹤以五门组织：命、卜、相、堪舆、择日。相与堪舆在本机推演，命、卜、择日由本机 Node 服务里的工具层排算。
        五类古籍已内化为本机知识库，用来生成批注，不在页面逐条列出。
      </p>
    </section>

    <section class="sec">
      <div class="sec-head"><h2>怎么算</h2></div>
      <p class="lead" style="margin-top:14px">
        相法每题挂六维增减，按题内均值中心化后计分；综合相把面相四成、手相三成七、五行二成五合在一起。
        命用四柱与五行强弱，卜用小六壬月日时三数，择日用建除十二神，堪舆用八宅的东西四宅与门位。
        所有工具都是确定性函数：同样输入，永远同样输出。
      </p>
    </section>

    <section class="sec">
      <div class="sec-head"><h2>数据在哪</h2></div>
      <p class="lead" style="margin-top:14px">
        全部在你浏览器的 localStorage 里。照片默认只存在本机；只有你点「按照片预填」时，它才会发给一次视觉模型，
        服务端不保存，识别完即弃，写入批注时也会丢掉。
        换设备、换浏览器、清缓存都会消失，这里没有账号，也没有云端。
      </p>
    </section>

    <section class="sec">
      <div class="sec-head"><h2>不做什么</h2></div>
      <p class="lead" style="margin-top:14px">
        不预测具体事件，不判断吉凶祸福，不替代医疗、投资、婚恋与法律意见。
        相学是一套古人观察人的语言，它的价值在于提供一个换角度看待自己的位置，
        而不是给你一个结论。分数低不代表命不好，只代表这套规则认为你该往哪边多用一点力。
      </p>
    </section>

    <footer class="foot">问鹤 0.1 · 本机规则版 · 2026</footer>`,
  };
}
