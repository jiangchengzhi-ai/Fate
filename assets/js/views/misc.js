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

    <footer class="foot" data-foot>共 ${reports.length} 页，存在这台设备上</footer>`;

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
          if (foot) foot.textContent = `共 ${left.length} 页，存在这台设备上`;
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
                if (f) f.textContent = `共 ${back.length} 页，存在这台设备上`;
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
      <h1>关于问鹤</h1>
      <span></span>
    </header>

    <section class="sec" style="margin-top:16px">
      <div class="sec-head"><h2>这是什么</h2></div>
      <p class="lead" style="margin-top:14px">
        问鹤有五门：命、卜、相、堪舆、择日。用的都是古人传下来的老办法，
        配上收录的古籍，在你自己手机上算出结果、写成批注。
        内容只是传统文化里认识自己的一种角度，当参考看就好。
      </p>
    </section>

    <section class="sec">
      <div class="sec-head"><h2>结果是怎么来的</h2></div>
      <p class="lead" style="margin-top:14px">
        各门按各自的传统规则来：命理看四柱五行，问一事看月日时，看相看面相手相，
        择日看日子，看房子看坐向方位。
        同一份资料、同一个时间，算出来的结果都一样——它是一套固定的规则，不是随手编的。
      </p>
    </section>

    <section class="sec">
      <div class="sec-head"><h2>你的资料存在哪</h2></div>
      <p class="lead" style="margin-top:14px">
        你的记录和填空都存在这台设备上，我们没有账号，也不会传到网上。
        只有你主动用「按照片预填」时，照片才会发出去识别一次，用完就丢，我们不留底。
        换手机、换浏览器或清理浏览器数据，记录就会不见，想留着可以截图保存。
      </p>
    </section>

    <section class="sec">
      <div class="sec-head"><h2>我们不做什么</h2></div>
      <p class="lead" style="margin-top:14px">
        不预测具体事件，不判断吉凶祸福，也不能代替医疗、投资、感情和法律上的决定。
        分数低不是说你不好，只表示这套老规则觉得你这方面可以多用点心。
        把它当成一面镜子，别当成一句判词。
      </p>
    </section>

    <footer class="foot">问鹤 0.1 · 2026</footer>`,
  };
}
