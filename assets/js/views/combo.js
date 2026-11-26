import { HOURS } from '../data.js';
import { buildCombo, makeRecord, elementsOf, ganzhi } from '../engine.js';
import { store } from '../store.js';
import { $, esc, toast, go, solarDateHTML, readSolarDate } from '../ui.js';

export function comboView() {
  const st = store.get();
  const face = st.reports.find((r) => r.type === 'face') || null;
  const palm = st.reports.find((r) => r.type === 'palm') || null;
  let birth = st.birth || { year: null, month: null, day: null, hour: null, gender: null };

  const isComplete = () => !!(face && palm && birth.year && birth.hour && birth.gender);
  const readyCount = () => (face ? 1 : 0) + (palm ? 1 : 0) + (birth.year && birth.hour && birth.gender ? 1 : 0);

  const row = (name, note, done, href, todoText, doneText) => `
    <div class="ready-row ${done ? 'is-done' : ''}">
      <div class="ready-info">
        <span class="ready-name">${name}</span>
        <span class="ready-note">${esc(note)}</span>
      </div>
      <a class="ready-go" href="${href === '#birth' ? '#/combo' : href}"${href === '#birth' ? ' data-scroll-birth' : ''}>${done ? doneText : todoText}</a>
    </div>`;

  const html = `
    <div class="flow">
      <header class="page-head">
        <a class="back" href="#/" data-back><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>返回</a>
        <h1>综合看相</h1>
        <a class="tb-link right" href="#/about">关于</a>
      </header>

      <p class="lead">把面相、手相、生日三样合起来看自己，比只看一样更稳。<b>这是看一个人，不是看两个人合不合。</b>缺一处，就少一个参照。</p>

      <div class="ready">
        ${row('面相', face ? `已录 ${face.overall} 分 · ${face.dateLabel}` : '还没测', !!face, '#/face', '测面相', '重测')}
        ${row('手相', palm ? `已录 ${palm.overall} 分 · ${palm.dateLabel}` : '还没测', !!palm, '#/palm', '测手相', '重测')}
        ${row('生辰', birth.year ? `${ganzhi(birth.year)}年 · ${birth.hour}时 · ${birth.gender === 'male' ? '男' : birth.gender === 'female' ? '女' : '未填'}` : '填公历生日与时辰', !!(birth.year && birth.hour && birth.gender), '#birth', '填生辰', '重填')}
      </div>

      <div class="field" id="birth">
        <label>出生那天 · 公历</label>
        ${solarDateHTML('bdate', birth.year ? `${birth.year}-${String(birth.month).padStart(2, '0')}-${String(birth.day).padStart(2, '0')}` : '')}
      </div>

      <div class="field">
        <label>出生时辰</label>
        <div class="hour-grid" role="group" aria-label="出生时辰">
          ${HOURS.map((h) => `<button class="hour" type="button" data-hour="${h.v}" aria-pressed="${birth.hour === h.v}">
            <b>${h.label}</b><span>${h.range}</span>
          </button>`).join('')}
        </div>
        <p class="q-hint" style="margin-left:0">记不清就选大致时段，时辰只影响五行权重的一成。</p>
      </div>

      <div class="field">
        <label>性别</label>
        <div class="opts">
          <button class="opt" type="button" data-gender="male" aria-pressed="${birth.gender === 'male'}">男</button>
          <button class="opt" type="button" data-gender="female" aria-pressed="${birth.gender === 'female'}">女</button>
        </div>
      </div>

      <div class="elem-preview" data-preview></div>

      <p class="foot">五行用年干、年支、纳音、月支、时支五项加权，属简化推演，不是排八字。</p>
    </div>

    <div class="dock">
      <div class="dock-info"><b data-count>${readyCount()}/3</b>已齐备</div>
      <button class="btn btn-primary" type="button" data-submit ${isComplete() ? '' : 'disabled'}>看结果</button>
    </div>`;

  const mount = () => {
    const root = $('#app .view');
    const submit = $('[data-submit]', root);
    const countEl = $('[data-count]', root);
    const preview = $('[data-preview]', root);

    const refresh = () => {
      countEl.textContent = `${readyCount()}/3`;
      submit.disabled = !isComplete();
      if (birth.year && birth.hour) {
        const el = elementsOf(birth);
        preview.innerHTML = `<p class="preview-line">${esc(el.gan + el.zhi)}年　纳音${esc(el.nayin)}　${esc(el.dom)}旺${esc(el.weak)}弱　<span>「${esc(el.ge)}」</span></p>`;
      } else {
        preview.innerHTML = '';
      }
      const rows = root.querySelectorAll('.ready-row');
      const ok3 = !!(birth.year && birth.hour && birth.gender);
      if (rows[2]) {
        rows[2].classList.toggle('is-done', ok3);
        const link = rows[2].querySelector('.ready-go');
        if (link) link.textContent = ok3 ? '重填' : '填生辰';
      }
      const notes = root.querySelectorAll('.ready-note');
      if (notes[2]) {
        notes[2].textContent = birth.year
          ? `${birth.year}年${birth.month}月${birth.day}日 · ${birth.hour}时 · ${birth.gender === 'male' ? '男' : birth.gender === 'female' ? '女' : '性别未填'}`
          : '填公历生日与时辰';
      }
      if (notes[0] && face) notes[0].textContent = `已录 ${face.overall} 分 · ${face.dateLabel}`;
      if (notes[1] && palm) notes[1].textContent = `已录 ${palm.overall} 分 · ${palm.dateLabel}`;
    };

    root.addEventListener('change', (e) => {
      if (!e.target.closest('[data-date3="bdate"]')) return;
      const v = readSolarDate(root, 'bdate');
      if (!v) return;
      const [y, m, d] = v.split('-').map(Number);
      birth = { ...birth, year: y, month: m, day: d };
      store.patch({ birth });
      refresh();
    });

    root.addEventListener('click', (e) => {
      const birthLink = e.target.closest('[data-scroll-birth]');
      if (birthLink) {
        e.preventDefault();
        $('#birth', root)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      const h = e.target.closest('[data-hour]');
      if (h) {
        birth = { ...birth, hour: h.dataset.hour };
        root.querySelectorAll('[data-hour]').forEach((b) => b.setAttribute('aria-pressed', String(b === h)));
        store.patch({ birth });
        refresh();
        return;
      }
      const g = e.target.closest('[data-gender]');
      if (g) {
        birth = { ...birth, gender: g.dataset.gender };
        root.querySelectorAll('[data-gender]').forEach((b) => b.setAttribute('aria-pressed', String(b === g)));
        store.patch({ birth });
        refresh();
        return;
      }
      if (e.target.closest('[data-submit]')) {
        if (!face || !palm) {
          toast('先把面相和手相各做一次');
          return;
        }
        if (!(birth.year && birth.hour && birth.gender)) {
          toast('还差生日、时辰或性别');
          return;
        }
        const report = buildCombo(face, palm, birth);
        const rec = store.addReport(makeRecord(report));
        go(`#/report/${rec.id}`);
      }
    });

    refresh();
  };

  return { html, mount };
}
