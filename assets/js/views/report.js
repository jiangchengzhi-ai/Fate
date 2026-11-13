import { store } from '../store.js';
import { api } from '../api.js';
import { $, esc, radarSVG, copyText, saveCard, recordToText, toast } from '../ui.js';

const SEAL = ['相', '由', '心', '生'];

const KIND = { face: '面相', palm: '手相', combo: '综合相', compass: '罗盘风水', ming: '四柱', bu: '小六壬', ze: '择日', hepan: '合盘' };
const AGAIN = { face: '#/face', palm: '#/palm', combo: '#/combo', compass: '#/compass', ming: '#/ming', bu: '#/bu', ze: '#/ze', kan: '#/yinzha', hepan: '#/hepan' };
const SCORE_LABEL = { compass: '宅运', kan: '地气', ming: '命格', bu: '课象', ze: '日课', hepan: '合盘' };

/* 把已算好的结果压成一段给模型看的上下文；模型只读不写 */
function chartText(rec) {
  const L = [];
  if (rec.summary) L.push(rec.summary);
  (rec.blocks || []).forEach((b) => {
    if (b.kind === 'table') L.push(`${b.title}：${b.head.join('｜')}；${b.rows.map((r) => r.join('｜')).join('；')}`);
    else if (b.kind === 'kv') L.push(`${b.title}：${b.rows.map(([k, v]) => `${k}${v}`).join('，')}`);
    else if (b.kind === 'list') L.push(`${b.title}：${b.items.join('；')}`);
    else if (b.kind === 'elems') L.push(`${b.title}：${b.items.map((e) => e.e + e.v).join(' ')}`);
    else L.push(`${b.title}：${b.text || ''}`);
  });
  if (rec.dims) L.push(`六维：${rec.dims.map((d) => d.label + d.v).join(' ')}`);
  if (rec.items) L.push(`逐项：${rec.items.map((i) => `${i.title}${i.chosen}`).join('；')}`);
  if (rec.stops) L.push(`三停：${rec.stops.map((s) => s.label + s.v).join(' ')}`);
  if (rec.tri) L.push(`三源：${rec.tri.map((t) => t.text).join(' ')}`);
  if (rec.meta?.houseGua) L.push(`宅${rec.meta.houseGua} 命${rec.meta.mGua} 坐${rec.meta.sitting.n}向${rec.meta.facing.n}`);
  if (rec.meta?.question) L.push(`所问：${rec.meta.question}`);
  L.push(`批语：${rec.verdict}`);

  const others = store.get().reports
    .filter((r) => r.id !== rec.id && r.type !== rec.type)
    .slice(0, 3);
  if (others.length) {
    L.push(`其他批注：${others.map((o) => `${KIND[o.type] || o.heading || ''}${o.overall ? o.overall + '分' : ''}`).join('；')}`);
    L.push('请先用一句话总括这些批注，再聚焦当前这一门给建议。');
  }
  return L.join('\n');
}

const llmInner = (llm) => `
  ${String(llm.text).split(/\n+/).filter(Boolean).map((p) => `<p class="llm-text">${esc(p)}</p>`).join('')}
  <p class="llm-note">AI 解读，可能出错；排盘数字与引文以上文为准。<b>AI 建议，仅供娱乐。</b></p>`;

const llmBlock = (llm) => `<section class="rep-sec llm"><h3>模型解读 · AI 建议</h3>${llmInner(llm)}</section>`;

function listBlock(title, arr, cls = '') {
  if (!arr?.length) return '';
  return `
  <section class="rep-sec">
    <h3>${title}</h3>
    <ul class="rep-list ${cls}">
      ${arr.map((x) => `<li>${esc(x)}</li>`).join('')}
    </ul>
  </section>`;
}

function stopsBlock(rec) {
  if (!rec.stops) return '';
  return `
  <section class="rep-sec">
    <h3>三停</h3>
    <div class="stops">
      ${rec.stops.map((s) => `
        <div class="stop">
          <span class="stop-l">${s.label}</span>
          <span class="stop-h">${s.hint}</span>
          <span class="bar"><i style="width:${s.v}%"></i></span>
          <span class="stop-v">${s.v}</span>
        </div>`).join('')}
    </div>
    <p>${esc(rec.stopNote || '')}</p>
  </section>`;
}

function itemsBlock(rec) {
  if (!rec.items?.length) return '';
  const title = rec.type === 'palm' ? '掌纹逐一' : '五官逐一';
  return `
  <section class="rep-sec">
    <h3>${title}</h3>
    <div class="rep-items">
      ${rec.items.map((i) => `
        <div class="rep-item">
          <div class="ri-head"><h4>${esc(i.title)}</h4><span>${esc(i.chosen)}</span></div>
          <p>${esc(i.text)}</p>
        </div>`).join('')}
    </div>
  </section>`;
}

function radarBlock(rec) {
  if (!rec.dims?.length) return '';
  return `
  <section class="rep-sec">
    <h3>六维</h3>
    ${radarSVG(rec.dims)}
    <div class="dim-list" style="margin-top:14px">
      ${rec.dims.map((d) => `
        <div class="dim">
          <span class="dim-name">${d.label}</span>
          <span class="bar"><i style="width:${d.v}%"></i></span>
          <span class="v">${d.v}</span>
        </div>`).join('')}
    </div>
  </section>`;
}

function triBlock(rec) {
  if (!rec.tri) return '';
  return `
  <section class="rep-sec">
    <h3>三源对照</h3>
    <div class="tri">
      ${rec.tri.map((t) => `<div class="tri-row"><span class="tri-key">${esc(t.key)}</span><span class="tri-val">${esc(t.text)}</span></div>`).join('')}
    </div>
  </section>`;
}

function elemsBlock(rec) {
  if (!rec.elems) return '';
  return `
  <section class="rep-sec">
    <h3>五行分布</h3>
    <div class="elem-bars">
      ${rec.elems.map((e) => `
        <div class="elem" data-e="${e.e}">
          <span class="ch">${e.e}</span>
          <span class="bar"><i style="width:${e.v}%"></i></span>
          <span class="pct">${e.v}%</span>
        </div>`).join('')}
    </div>
    <p>${esc(rec.elemMeta.dom)}旺${esc(rec.elemMeta.weak)}弱，成「${esc(rec.elemMeta.ge)}」。旺处是你的顺手，弱处是你的功课。</p>
  </section>`;
}

function compassBlock(rec) {
  const m = rec.meta;
  return `
  <section class="rep-sec">
    <h3>宅命</h3>
    <div class="tri">
      <div class="tri-row"><span class="tri-key">坐向</span><span class="tri-val">坐${esc(m.sitting.n)}向${esc(m.facing.n)}（${esc(m.sitting.n)}山${esc(m.facing.n)}向），${Math.round(m.heading)}°，宅卦属${esc(m.houseGua)}，${esc(m.houseGroup)}。</span></div>
      <div class="tri-row"><span class="tri-key">命卦</span><span class="tri-val">${esc(m.mGua)}卦，${esc(m.mingGroup)}；与宅${m.match ? '同组，气口相合' : '异组，需借方位化解'}。</span></div>
      <div class="tri-row"><span class="tri-key">门位</span><span class="tri-val">门在${esc(m.doorDir)}方（${esc(m.door)}），为${esc(rec.doorStar.name)}，${esc(rec.doorStar.level)}：${esc(rec.doorStar.line)}。</span></div>
    </div>
  </section>

  <section class="rep-sec">
    <h3>八方位</h3>
    <div class="tbl">
      <div class="tbl-head"><span>方位</span><span>星</span><span>宜作</span></div>
      ${rec.table.map((t) => `
        <div class="tbl-row ${t.star.good ? 'good' : 'bad'}">
          <span class="d">${t.dir}</span>
          <span class="s">${t.star.name}</span>
          <span class="t">${t.star.level}　${t.star.use}</span>
        </div>`).join('')}
    </div>
  </section>

  <section class="rep-sec">
    <h3>可做之事</h3>
    <ul class="rep-list">
      ${rec.advice.map((a) => `<li>${esc(a)}</li>`).join('')}
    </ul>
  </section>`;
}

function blocksBlock(rec) {
  return rec.blocks.map((b) => {
    let body = '';
    if (b.kind === 'table') {
      body = `<table class="blk-table"><thead><tr>${b.head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
        <tbody>${b.rows.map((row, i) => `<tr>${row.map((c) => `<td${i === 0 ? ' class="em"' : ''}>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    } else if (b.kind === 'kv') {
      body = `<dl class="blk-kv">${b.rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
    } else if (b.kind === 'list') {
      body = `<ul class="rep-list">${b.items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
    } else if (b.kind === 'elems') {
      body = `<div class="elem-bars">${b.items.map((e) => `
        <div class="elem" data-e="${e.e}"><span class="ch">${e.e}</span>
        <span class="bar"><i style="width:${e.v}%"></i></span><span class="pct">${e.v}%</span></div>`).join('')}</div>`;
    } else {
      body = `<p>${esc(b.text || '')}</p>`;
    }
    return `<section class="rep-sec"><h3>${esc(b.title)}</h3>${body}</section>`;
  }).join('');
}

/* 推演依据：把"哪些是古法、哪些是本项目自定"写清楚，才谈得上权威 */
const BASIS = {
  ming: {
    school: '子平法 · 四柱',
    rules: [
      '年柱以立春为界，月柱以十二节为界，节气按太阳视黄经推算。',
      '日柱按儒略日连续推算；时柱由日干五鼠遁。',
      '大运：阳男阴女顺行，三日折一年，起运按月日折算。',
      '五行按四柱八字本气计数；喜用取扶抑法。',
    ],
    custom: '五行百分比、总分与等级为本项目自定，不对应古籍；十神、干支、大运为通行算法。',
  },
  bu: {
    school: '小六壬',
    rules: [
      '寅上起月，月上起日，日上起时，顺数六宫。',
      '六宫：大安、留连、速喜、赤口、小吉、空亡。',
      '断语取六宫通行象义，不另起卦。',
    ],
    custom: '总分由宫位吉凶映射，为本项目自定。',
  },
  ze: {
    school: '建除十二神 · 通书宜忌',
    rules: [
      '月建上起建，依次除、满、平、定、执、破、危、成、收、开、闭。',
      '宜忌取通书通行条目；冲煞按日支与生肖相冲。',
      '择日只论日辰，不论时家奇门。',
    ],
    custom: '权重打分与"可选日子"排序为本项目自定。',
  },
  compass: {
    school: '八宅 · 大游年',
    rules: [
      '以宅坐向定宅卦，以生年定命卦（男逆女顺，五黄寄坤艮）。',
      '九星按大游年歌排布：生气、天医、延年、伏位、绝命、五鬼、六煞、祸害。',
      '门、床、灶、桌各按所属卦取吉凶。',
    ],
    custom: '宅运分数为本项目自定；未计玄空飞星与形峦。',
  },
  kan: {
    school: '三合 · 双山五行',
    rules: [
      '二十四山按双山五行定局：申子辰水、寅午戌火、巳酉丑金、亥卯未木。',
      '来去水按十二长生取生旺墓绝。',
      '形势三项为可见要素，不作龙脉推断。',
    ],
    custom: '地气分数为本项目自定；未做实地测量。',
  },
  face: {
    school: '三停五官',
    rules: [
      '三停：发际至眉为上停，眉至鼻底为中停，鼻底至颏为下停。',
      '五官：眉、眼、鼻、口、耳，各有主属。',
      '六维取传统名目，权重为本项目设定。',
    ],
    custom: '六维权重、分数与等级均为本项目自定，不对应任何古籍条文；照片识别只作辅助。',
  },
  palm: {
    school: '掌型 · 三线',
    rules: [
      '掌型分五行：木长、土厚、水圆、金方、火尖。',
      '三线：生命线、智慧线、感情线，另参事业线与掌丘。',
      '以惯用手为主，另一手为辅。',
    ],
    custom: '六维权重、分数与等级均为本项目自定，不对应任何古籍条文；照片识别只作辅助。',
  },
  combo: {
    school: '相 · 命合参',
    rules: [
      '面相、手相各按本门规则取象，再参四柱五行强弱。',
      '合参只做加权平均，不新增判断。',
    ],
    custom: '合参权重与分数为本项目自定。',
  },
};

function basisBlock(rec) {
  const b = BASIS[rec.type];
  if (!b) return '';
  return `
  <details class="basis">
    <summary>推演依据 · ${esc(b.school)}</summary>
    <ul>${b.rules.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
    <p class="basis-assume">统一假设：按北京时间，未校正真太阳时；立春换年；结果不构成任何决策依据。</p>
    <p class="basis-custom">${esc(b.custom)}</p>
  </details>`;
}

/* 照片看相：把模型看到的项折起来，可查、不抢结论 */
function visionBlock(rec) {
  const v = rec.meta?.vision;
  if (!v?.items?.length) return '';
  const conf = Number.isFinite(v.confidence) ? ` · 置信度 ${v.confidence}` : '';
  const mm = v.measures;
  const src = mm?.source === 'mediapipe-468' ? '468 点实测' : '模型估测';
  const mline = mm
    ? `<p class="vision-measure">${src}：${[
        mm.faceWH != null ? `脸长宽比 ${mm.faceWH}` : '',
        mm.upper != null ? `三庭 ${Math.round(mm.upper * 100)}/${Math.round((mm.middle || 0) * 100)}/${Math.round((mm.lower || 0) * 100)}` : '',
        mm.eyeGap != null ? `眼距 ${mm.eyeGap} 眼宽` : '',
        mm.eyeTilt != null ? `眼角倾斜 ${mm.eyeTilt}` : '',
        mm.noseWidth != null ? `鼻宽比 ${mm.noseWidth}` : '',
        mm.jawWidth != null ? `下颌比 ${mm.jawWidth}` : '',
        mm.cheekWidth != null ? `颧宽比 ${mm.cheekWidth}` : '',
      ].filter(Boolean).join(' · ')}</p>`
    : '';
  return `
  <details class="vision-note">
    <summary>识别依据 · 模型看到的 ${v.items.length} 项${conf}</summary>
    <dl>${v.items.map((i) => `<div><dt>${esc(i.t)}</dt><dd>${esc(i.v)}</dd></div>`).join('')}</dl>
    <p>由照片识别得到，仅作预填；可在「相」页点「自己逐项选」修改后重出批注。</p>
    ${mline}
  </details>`;
}

export function reportView(id) {
  const rec = store.report(id);

  if (!rec) {
    return {
      html: `
      <header class="topbar">
        <a class="brand" href="#/">问鹤</a>
        <a class="tb-link" href="#/history">我的记录</a>
      </header>
      <div class="empty"><span class="glyph">空</span>找不到这页批注，可能已被删除。<br><a class="tb-link" href="#/history" style="color:var(--brass-hi)">去批注簿看看</a></div>`,
    };
  }

  const subtitle = (() => {
    if (rec.subtitle) return rec.subtitle;
    if (rec.type === 'combo') {
      const e = rec.elemMeta;
      return `${e.gan}${e.zhi}年　纳音${e.nayin}　「${e.ge}」`;
    }
    if (rec.type === 'compass') {
      const m = rec.meta;
      return `坐${m.sitting.n}向${m.facing.n}　${m.houseGua}宅　${m.mGua}命`;
    }
    return `${rec.elem}形　${(rec.traits || []).slice(0, 3).join('、')}`;
  })();

  const scoreLabel = SCORE_LABEL[rec.type] || '气象';
  const again = AGAIN[rec.type] || '#/';
  const parent = { ming: '#/ming', bu: '#/bu', ze: '#/ze', compass: '#/compass', kan: '#/yinzha', hepan: '#/hepan', face: '#/c/xiang', palm: '#/c/xiang', combo: '#/combo' }[rec.type] || '#/';

  return {
    html: `
    <header class="topbar">
      <a class="brand" href="#/"><span>问鹤</span></a>
      <a class="tb-link" data-back data-parent="${parent}" href="${parent}">返回</a>
      <a class="tb-link" href="#/history">我的记录</a>
    </header>

    <div class="paper-wrap">
      <article class="paper">
        <div class="paper-inner">
          <span class="rep-side">${esc(rec.title)}</span>

          <header class="rep-head">
            <div class="rep-kicker">${esc(rec.dateLabel)}<span class="rep-tag">传统文化 · 娱乐参考</span></div>
            <h1 class="rep-title">${esc(rec.heading)}</h1>
            <p class="rep-sub">${esc(subtitle)}</p>
          </header>

          ${rec.overall != null ? `
          <div class="rep-score">
            <span class="n">${rec.overall}</span>
            <span class="unit">分 · ${scoreLabel}</span>
            <div class="lvl">
              <b>${esc(rec.level?.name || '')}</b>
              <span>${esc(rec.level?.note || '')}</span>
            </div>
          </div>` : ''}

          <section class="rep-sec">
            <h3>总评</h3>
            <p>${esc(rec.summary)}</p>
            ${rec.traits?.length ? `<div class="tags">${rec.traits.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
          </section>

          ${rec.blocks ? blocksBlock(rec) : ''}

          ${rec.type === 'compass' ? compassBlock(rec) : ''}

          ${rec.dims ? radarBlock(rec) : ''}
          ${stopsBlock(rec)}
          ${triBlock(rec)}
          ${elemsBlock(rec)}
          ${itemsBlock(rec)}

          ${listBlock('可恃之处', rec.strengths)}
          ${listBlock('需留意处', rec.cautions)}
          ${!rec.blocks ? listBlock('可做之事', rec.advice) : ''}
          ${rec.blocks && rec.advice?.length ? listBlock('可做之事', rec.advice) : ''}
          ${rec.llm ? llmBlock(rec.llm) : ''}

          <div class="verdict">
            <small>批 语</small>
            「${esc(rec.verdict)}」
          </div>

          <footer class="rep-foot">
            <div class="meta">仅供娱乐参考，不能代替医生、律师等专业意见。</div>
            <div class="seal">${SEAL.map((s) => `<span>${s}</span>`).join('')}</div>
          </footer>
        </div>
      </article>
    </div>

    <div class="rep-actions">
      <a class="btn btn-ghost" href="${again}">再算一次</a>
      <button class="btn btn-ghost" type="button" data-copy>复制</button>
      <button class="btn btn-line" type="button" data-card>存图</button>
    </div>

    <button class="btn btn-ghost btn-block" type="button" data-llm style="margin-top:8px">AI 建议 · 仅供娱乐</button>

    <p class="foot" style="margin-top:22px">批注已存在本机，换设备不会同步。</p>
    `,
    mount: () => {
      const root = $('#app .view');
      $('[data-copy]', root)?.addEventListener('click', () => copyText(recordToText(rec)));
      $('[data-card]', root)?.addEventListener('click', () => {
        try { saveCard(rec); } catch { toast('生成失败，请重试'); }
      });

      const btn = $('[data-llm]', root);

      const runLlm = async (auto = false) => {
        let placeholder = null;
        if (auto) {
          placeholder = document.createElement('section');
          placeholder.className = 'rep-sec llm';
          placeholder.innerHTML = '<h3>模型解读 · AI 建议</h3><p class="llm-loading">正在根据批注与知识库写解读…</p>';
          root.querySelector('.verdict')?.before(placeholder);
        }
        if (btn) {
          btn.disabled = true;
          btn.textContent = '模型解读中…';
        }
        try {
          const out = await api.interpret({
            kind: KIND[rec.type] || rec.heading || '解读',
            chart: chartText(rec),
            passages: rec.citations || [],
          });
          const llm = { text: out.text, model: out.model, at: Date.now() };
          store.updateReport(rec.id, { llm });
          rec.llm = llm;

          const sec = placeholder || document.createElement('section');
          sec.className = 'rep-sec llm';
          sec.innerHTML = `<h3>模型解读 · AI 建议</h3>${llmInner(llm)}`;
          if (!placeholder) root.querySelector('.verdict')?.before(sec);

          btn?.remove();
          toast(out.cached ? '已取回先前的解读' : '解读完成');
        } catch (err) {
          placeholder?.remove();
          if (btn) {
            btn.disabled = false;
            btn.textContent = 'AI 建议 · 仅供娱乐';
          }
          if (err.status === 503) {
            toast('模型未配置：设置 FATETELL_LLM_KEY 后重启服务');
          } else if (!auto) {
            toast(err.message || '模型解读失败');
          }
        }
      };

      btn?.addEventListener('click', () => runLlm(false));

      /* 照片看相：不展示题目，直接出结论 → 自动补一段模型解读 */
      if (rec.meta?.auto && !rec.llm) {
        setTimeout(() => runLlm(true), 350);
      }
    },
  };
}
