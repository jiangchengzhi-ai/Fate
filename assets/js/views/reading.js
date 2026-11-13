import { FACE, PALM } from '../data.js';
import { buildFace, buildPalm, makeRecord } from '../engine.js';
import { measureFace } from '../facemesh.js';
import { store } from '../store.js';
import { $, esc, pickImage, toast, go, goReplace, openSheet, closeSheet } from '../ui.js';
import { api } from '../api.js';

function photoHtml(photo, kind) {
  if (!photo) {
    return `<button class="photo-box" type="button" data-photo>
      ${kind === 'face' ? '上传正面照' : '上传掌心照'}
      <span>照片默认只存在本机；点「看相」时才发给一次视觉模型</span>
    </button>`;
  }
  return `
    <div class="photo-shot">
      <img src="${photo}" alt="参考照片">
      ${kind === 'face' ? '<div class="grid"></div>' : ''}
      <div class="cap">本机保存${kind === 'face' ? ' · 三停线' : ''}</div>
    </div>
    <div class="photo-drop">
      <button class="btn btn-ghost btn-sm" type="button" data-photo>换一张</button>
      <button class="btn btn-ghost btn-sm" type="button" data-photo-clear>移除</button>
    </div>`;
}

function questionHtml(q) {
  return `
  <section class="q" data-qid="${q.id}">
    <div class="q-head">
      <span class="q-num">${esc(q.num)}</span>
      <h2>${esc(q.title)}</h2>
    </div>
    <p class="q-hint">${esc(q.hint)}</p>
    <div class="q-body">
      <div class="opts" role="group" aria-label="${esc(q.title)}">
        ${q.options.map((o) => `<button class="opt" type="button" data-q="${q.id}" data-v="${o.v}" aria-pressed="false">${esc(o.label)}</button>`).join('')}
      </div>
      <p class="group-note"></p>
    </div>
  </section>`;
}

/* 用识别结果里的关键项去典籍里找依据 */
const KEYWORDS = {
  face: ['三停', '五官', '五岳', '气色', '骨相', '痣'],
  palm: ['掌型', '生命线', '智慧线', '感情线', '掌丘', '指长'],
};

async function collectCitations(type, answers, questions) {
  const labels = questions
    .map((q) => {
      const v = answers[q.id];
      return v ? q.options.find((o) => o.v === v)?.label : '';
    })
    .filter(Boolean);

  const words = [...new Set([...(KEYWORDS[type] || []), ...labels])].slice(0, 6);

  const out = [];
  for (const w of words) {
    try {
      const { results } = await api.search(w, 'xiang', 2);
      results.forEach((r) => out.push(r));
    } catch { /* 服务不可用时留空 */ }
  }

  const seen = new Set();
  return out
    .filter((r) => {
      const k = r.text.slice(0, 24);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => (a.kind === '原文' ? -1 : 1) - (b.kind === '原文' ? -1 : 1))
    .slice(0, 5)
    .map((r) => ({ book: r.book, bookTitle: r.bookTitle, chapter: r.chapter, kind: r.kind, text: r.text }));
}

function readingView(cfg) {
  const { module: MOD, type, draftKey } = cfg;
  const saved = store.get()[draftKey];
  const draft = {
    answers: { ...(saved?.answers || {}) },
    photo: saved?.photo || null,
  };

  Object.keys(draft.answers).forEach((qid) => {
    const q = MOD.questions.find((x) => x.id === qid);
    if (!q || !q.options.some((o) => o.v === draft.answers[qid])) delete draft.answers[qid];
  });

  const required = MOD.questions;
  const countAnswered = () => required.filter((q) => draft.answers[q.id]).length;

  const html = `
    <div class="flow">
      <header class="page-head">
        <a class="back" href="#/" data-back>
          <svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>返回
        </a>
        <h1>${esc(MOD.title)}</h1>
        <a class="tb-link right" href="#/about">相法</a>
      </header>

      <p class="lead">${esc(MOD.lead)}</p>

      <div class="photo-slot" data-slot>${photoHtml(draft.photo, type)}</div>

      <p class="auto-note">上传照片，点下面的「看 相」，马上出结果，不用做题。</p>

      <p class="scan-status" data-scan hidden><span class="spinner"></span><span>正在识别照片，约 5–15 秒…</span></p>

      <button class="manual-link" type="button" data-manual-toggle>没有照片，或想自己逐项选</button>

      <div data-manual hidden>
        ${MOD.questions.map(questionHtml).join('')}
        <p class="foot">逐项选好后点下方按钮，本机生成批注。</p>
      </div>
    </div>

    <div class="dock">
      <div class="dock-info"><b data-count>${countAnswered()}/${required.length}</b><span data-count-label>已落笔</span></div>
      <button class="btn btn-primary" type="button" data-go>看 相</button>
    </div>`;

  const mount = () => {
    const root = $('#app .view');
    const goBtn = $('[data-go]', root);
    const countEl = $('[data-count]', root);
    const countLabel = $('[data-count-label]', root);
    const slot = $('[data-slot]', root);
    const manual = $('[data-manual]', root);
    const scan = $('[data-scan]', root);
    let manualMode = false;

    const refresh = () => {
      const n = countAnswered();
      countEl.textContent = manualMode ? `${n}/${required.length}` : '—';
      countLabel.textContent = manualMode ? '已落笔' : '照片识别';
      goBtn.disabled = manualMode && n < required.length;
    };

    const paintAnswers = () => {
      root.querySelectorAll('.opt[aria-pressed="true"]').forEach((b) => {
        b.setAttribute('aria-pressed', 'false');
        const n = b.closest('.q-body')?.querySelector('.group-note');
        if (n) n.textContent = '';
      });
      for (const [qid, v] of Object.entries(draft.answers)) {
        const btn = root.querySelector(`[data-q="${qid}"][data-v="${v}"]`);
        if (!btn) continue;
        btn.setAttribute('aria-pressed', 'true');
        const q = MOD.questions.find((x) => x.id === qid);
        const opt = q?.options.find((o) => o.v === v);
        const note = btn.closest('.q-body')?.querySelector('.group-note');
        if (note && opt) note.textContent = opt.note || '';
      }
      refresh();
    };

    const setManual = (on) => {
      manualMode = on;
      manual.hidden = !on;
      goBtn.textContent = on ? '生成批注' : '看 相';
      refresh();
    };
    paintAnswers();
    setManual(false);

    /* 在线版先探一次视觉模型，没配就地提示，不等到点「看相」才报错 */
    if (location.protocol !== 'file:') {
      api.visionStatus().then((s) => {
        if (s?.ready) return;
        const warn = document.createElement('div');
        warn.className = 'inline-warn';
        warn.innerHTML = '<p>视觉模型未配置：在 启动.bat 里设置 FATETELL_VISION_MODEL 与 KEY，然后重启服务。也可以自己逐项选。</p><button class="btn btn-ghost btn-sm" type="button" data-manual-toggle>自己逐项选</button>';
        slot.after(warn);
      }).catch(() => { /* 服务没起时保持安静 */ });
    }

    const finish = async (answers, auto, visionMeta) => {
      const report = type === 'face' ? buildFace(answers) : buildPalm(answers);
      try {
        report.citations = await collectCitations(type, answers, required);
      } catch { /* 无依据也能出批注 */ }
      const rec = makeRecord(report);
      rec.meta = { ...(rec.meta || {}), auto: Boolean(auto) };
      if (visionMeta) rec.meta.vision = visionMeta;
      store.addReport(rec);
      go(`#/report/${rec.id}`);
    };

    const look = () => {
      if (!draft.photo) {
        toast(type === 'face' ? '先上传一张正面照' : '先上传一张掌心照');
        return;
      }
      openSheet(`
        <h2>把照片发给视觉模型？</h2>
        <p>我们会看这张照片，然后直接给出结果。照片不会保存，也不会写进记录里。</p>
        <p>不用您一项项选，直接看结论就行。</p>
        <div class="acts">
          <button class="btn btn-primary" type="button" data-confirm>发送并看相</button>
          <button class="btn btn-ghost" type="button" data-close>取消</button>
        </div>`, { label: '照片识别确认' });

      $('[data-confirm]')?.addEventListener('click', async () => {
        closeSheet();
        goBtn.disabled = true;
        goBtn.innerHTML = '<span class="spinner"></span>看 相 中';
        scan.hidden = false;
        scan.scrollIntoView({ behavior: 'smooth', block: 'center' });
        toast('识别中，约 5–15 秒');
        try {
          let local = null;
          if (type === 'face') {
            try {
              const m = await measureFace(draft.photo);
              if (m.ok) {
                local = m.measures;
                draft.measures = local;
              }
            } catch { /* 关键点不可用就走模型估测 */ }
          }
          const out = await api.vision(type, draft.photo, local);
          const entries = Object.entries(out.features || {});
          if (!entries.length) {
            toast('模型没看清，可以换张照片，或自己逐项选');
            return;
          }
          entries.forEach(([qid, v]) => { draft.answers[qid] = v; });
          try { store.saveDraft(type, draft); } catch { /* 存储满也不影响本次结果 */ }
          paintAnswers();
          const items = required
            .map((q) => ({ t: q.title, v: q.options.find((o) => o.v === draft.answers[q.id])?.label || '' }))
            .filter((x) => x.v);
          await finish({ ...draft.answers }, true, {
            confidence: out.confidence ?? null,
            model: out.model || null,
            measures: out.measures || null,
            applied: out.applied || [],
            basis: out.basis || [],
            items,
          });
        } catch (err) {
          const msg = String(err.message || '');
          if (err.status === 503) {
            if (location.protocol === 'file:') {
              toast('这是离线包，不接视觉模型。用「启动.bat」打开在线版再看相');
            } else {
              toast('视觉模型未配置：检查 启动.bat 里的 FATETELL_VISION_MODEL 后重启服务');
            }
          } else if (/超时|超時|timeout/i.test(msg)) {
            toast('识别超时了，换个网络或稍后再点一次');
          } else if (/没有返回结果|截断/.test(msg)) {
            toast('模型这次没给出结果，再点一次「看 相」');
          } else if (/格式|过大|不支持/.test(msg)) {
            toast('这张照片读不了，换成 JPG 或 PNG 再试');
          } else {
            toast(msg || '识别失败，再试一次');
          }
        } finally {
          scan.hidden = true;
          goBtn.disabled = false;
          goBtn.textContent = manualMode ? '生成批注' : '看 相';
        }
      });
    };

    root.addEventListener('click', (e) => {
      const optBtn = e.target.closest('.opt');
      if (optBtn) {
        const qid = optBtn.dataset.q;
        const v = optBtn.dataset.v;
        const group = optBtn.closest('.q-body');
        group.querySelectorAll('.opt').forEach((b) => b.setAttribute('aria-pressed', 'false'));
        optBtn.setAttribute('aria-pressed', 'true');
        draft.answers[qid] = v;
        const q = MOD.questions.find((x) => x.id === qid);
        const o = q?.options.find((x) => x.v === v);
        const note = group.querySelector('.group-note');
        if (note) note.textContent = o?.note || '';
        store.saveDraft(type, draft);
        refresh();
        return;
      }

      if (e.target.closest('[data-manual-toggle]')) {
        const on = !manualMode;
        setManual(on);
        if (on) manual.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }

      if (e.target.closest('[data-photo]')) {
        pickImage((dataUrl) => {
          draft.photo = dataUrl;
          try { store.saveDraft(type, draft); } catch { /* 本机存储满，仍用内存里的照片 */ }
          slot.innerHTML = photoHtml(draft.photo, type);
          toast('照片已添加');
        });
        return;
      }

      if (e.target.closest('[data-photo-clear]')) {
        draft.photo = null;
        store.saveDraft(type, draft);
        slot.innerHTML = photoHtml(null, type);
        return;
      }

      if (e.target.closest('[data-go]')) {
        if (!manualMode) {
          look();
          return;
        }
        const n = countAnswered();
        if (n < required.length) {
          const firstMissing = required.find((q) => !draft.answers[q.id]);
          toast(`还有一题未落笔：${firstMissing?.title || ''}`);
          return;
        }
        finish({ ...draft.answers }, false);
      }
    });
  };

  return { html, mount };
}

export const faceView = () => readingView({
  module: FACE,
  type: 'face',
  draftKey: 'faceDraft',
});

export const palmView = () => readingView({
  module: PALM,
  type: 'palm',
  draftKey: 'palmDraft',
});
