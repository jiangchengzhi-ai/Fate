import { store } from '../store.js';
import { ENGINE_VERSION } from '../engine.js';
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

const llmBlock = (llm) => `<section class="rep-sec llm"><h3>AI 建议 · 仅供娱乐</h3>${llmInner(llm)}</section>`;

/* ==========================================================================
   通俗总评：模块名保留「总评」以示有出处，内容按普通读者重写。
   原则：先给一句结论，再给能照着做的事；术语降级到下方专业表格里。
   ========================================================================== */
const ELEM_CAREER = {
  木: '教育、出版、园艺、医药、木材家具、农业这类“慢慢长起来”的事',
  火: '餐饮、能源、电子、传媒、美容健身这类“热热闹闹”的事',
  土: '建筑、地产、仓储、工程管理、农业这类“脚踏实地”的事',
  金: '金融、机械、汽车、五金、法律、精密制造这类“讲规则、硬碰硬”的事',
  水: '贸易、物流、航运、水产、咨询、信息这类“来回调动”的事',
};

/* 行业关键词：给总评做短标签，避免一整段行业名词堆成文字墙 */
const ELEM_CAREER_SHORT = {
  木: ['教育', '出版', '花木', '医药'],
  火: ['餐饮', '能源', '电子', '传媒'],
  土: ['建筑', '地产', '工程', '农业'],
  金: ['金融', '机械', '汽车', '法律'],
  水: ['贸易', '物流', '航运', '咨询'],
};

const kvRows = (rec, title) =>
  (rec.blocks || []).find((b) => b.title === title && b.kind === 'kv')?.rows || [];

const stripPrefix = (s) => String(s || '').replace(/^[^：:]{1,8}[：:]\s*/, '');

function fortuneOf(rec) {
  if (rec.meta?.fortune) return rec.meta.fortune;
  const kv = Object.fromEntries(kvRows(rec, '开运（娱乐）'));
  if (!kv['颜色'] && !kv['方位']) return null;
  return {
    colors: kv['颜色'], foods: kv['饮食'], sports: kv['运动'],
    direction: kv['方位'], cities: kv['城市'],
    use: String(kv['喜用'] || '').split('、').filter(Boolean),
  };
}

function plainSummary(rec) {
  const rows = [];
  let lead = '';
  let note = '';

  if (rec.type === 'ming') {
    const f = fortuneOf(rec);
    lead = /身旺/.test(rec.summary || '')
      ? '你的底子偏“自己扛”那一类：精力足、主意正，眼下容易用力太猛，什么都想自己兜着。'
      : '你更吃“有人搭把手、按节奏来”的做事方式：硬撑容易累，借力反而走得远。';
    if (f?.colors) {
      const [main, alt] = String(f.colors).split('；');
      rows.push({ k: '穿什么', v: `${main}为主${alt ? `，${alt.replace(/^次选\s*/, '')}换着穿` : ''}。贴身的围巾、包、内搭用上一点就够，不用整套换。` });
    }
    if (f?.direction || f?.cities) {
      rows.push({ k: '住哪儿', v: `${f?.direction || '东西向都行'}更顺手；长期生活可留意${f?.cities || '自己熟悉的城市'}。换个房间朝向也算。` });
    }
    const judge = Object.fromEntries(kvRows(rec, '判读'));
    const use = f?.use?.length
      ? f.use
      : (rec.meta?.yong || String(judge['喜用'] || '').split('、').filter(Boolean));
    const careerTags = use.flatMap((e) => ELEM_CAREER_SHORT[e] || []);
    rows.push({ k: '做什么', v: use.length
      ? '传统说法里偏下面这些方向——当个参考，别当成“现在就得换工作”。'
      : '按自己的节奏挑事做，比照着标签选更准。',
      tags: careerTags });
    if (f?.foods) rows.push({ k: '吃什么', v: `${f.foods}。当口味参考就好，过敏或慢性病照医生的来。` });
    if (f?.sports) rows.push({ k: '动一动', v: `${f.sports}。一周两三次就够，量力而行。` });
    note = '以上按传统五行喜用推演，属娱乐参考；不是医嘱，也不是职业建议。';
  } else if (rec.type === 'face' || rec.type === 'palm' || rec.type === 'combo') {
    lead = rec.type === 'combo'
      ? '把面相、手相、生日三样放一起看，比只看一样更稳。'
      : `你给人的第一印象偏“${rec.traits?.[0] || '稳'}”这一类。`;
    if (rec.strengths?.[0]) rows.push({ k: '你的长处', v: stripPrefix(rec.strengths[0]) });
    if (rec.cautions?.[0]) rows.push({ k: '留意的', v: stripPrefix(rec.cautions[0]) });
    if (rec.advice?.[0]) rows.push({ k: '可以这么调', v: rec.advice[0] });
    if (rec.type === 'combo') rows.push({ k: '别搞混', v: '这是三样合起来看你自己，不是看两个人合不合，两者不是一回事。' });
    note = '六维权重与分数为本项目自定，不是古籍原文；照片只作辅助。当个参考，别把自己看窄。';
  } else if (rec.type === 'compass' || rec.type === 'kan') {
    lead = rec.meta?.match
      ? '按你说的朝向，这房子跟你挺合拍，不用大改。'
      : '按你说的朝向，房子跟你不太同组，但不用改门，微调就够。';
    const labels = ['床头朝哪', '身体弱时', '哪里放东西', '记住这句'];
    (rec.advice || []).slice(0, 4).forEach((a, i) => rows.push({ k: labels[i] || '建议', v: a }));
    note = '方位是传统参考；采光、通风、动线比摆件更实在。不构成装修或购房建议。';
  } else if (rec.type === 'bu') {
    const m = String(rec.summary || '').match(/落([^（(]+)[（(]([^）)]+)[）)]。(.*)/);
    lead = m
      ? `这件事眼下落在“${m[1].trim()}”——说白了：${m[3].split('。')[0]}。`
      : '这件事眼下先看清节奏，再决定动不动。';
    if (m?.[3]) rows.push({ k: '眼下怎么走', v: m[3] });
    if (rec.advice?.[0]) rows.push({ k: '提醒', v: rec.advice[0] });
    note = '小六壬取的是当下切片，一件事问一次就够；不构成决定依据。';
  } else if (rec.type === 'ze') {
    const picks = (rec.blocks || []).find((b) => b.title === '可选的日子');
    const list = picks?.rows || [];
    lead = list.length
      ? `这段时间比较合适的是 ${list.slice(0, 3).map((r) => r[0]).join('、')} 这几天。`
      : '这段时间没有特别合适的日子，先按自己的节奏推进。';
    if (list.length) rows.push({ k: '怎么挑', v: `一共挑出 ${list.length} 个可选日子，越靠前越合适；具体安排还得看你自己。` });
    if (rec.advice?.[0]) rows.push({ k: '挑日子的分寸', v: rec.advice[0] });
    note = '建除只论日辰，不代替对具体事项的判断；婚丧嫁娶请结合实际情况。';
  } else if (rec.type === 'hepan') {
    lead = (rec.overall || 0) >= 70
      ? '两个人的节奏比较合得来，遇事商量着来，默契会越来越足。'
      : '两个人的节奏有差异，但差异本身不是问题，先说清楚再动。';
    kvRows(rec, '关系').slice(0, 2).forEach(([k, v]) => rows.push({ k, v }));
    if (rec.advice?.[0]) rows.push({ k: '相处提醒', v: rec.advice[0] });
    note = '只看日柱与五行，不涉及双方家庭、价值观与现实条件；合得来还得靠相处。';
  } else {
    return null; // 没把握的类型保留原文，不瞎编
  }

  return { lead, rows, note };
}

function summaryBlock(rec) {
  const p = plainSummary(rec);
  if (!p) {
    return `<section class="rep-sec"><h3>总评</h3><p>${esc(rec.summary)}</p></section>`;
  }
  return `
  <section class="rep-sec plain-summary">
    <h3>总评</h3>
    <p class="plain-lead">${esc(p.lead)}</p>
    ${rec.traits?.length ? `<div class="tags">${rec.traits.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
    <div class="plain-rows">
      ${p.rows.map((r) => `<div class="plain-row"><b>${esc(r.k)}</b><div class="plain-cell"><span>${esc(r.v)}</span>${r.tags?.length ? `<div class="plain-tags">${r.tags.map((t) => `<em>${esc(t)}</em>`).join('')}</div>` : ''}</div></div>`).join('')}
    </div>
    <p class="plain-note">${esc(p.note)}</p>
  </section>`;
}

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
      <div class="tri-row"><span class="tri-key">命卦</span><span class="tri-val">${esc(m.mGua)}卦，${esc(m.mingGroup)}；与宅${m.match ? '同组，气口相合' : '不同组，方位上多留意'}。</span></div>
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

/* 命理页的术语表格默认折叠；“开运/说明”已写进通俗总评，不再重复 */
const MING_DETAIL_TITLES = new Set(['四柱', '五行', '判读', '排盘约定', '格局', '神煞', '流月', '未来七天', '起运', '大运', '流年']);
const MING_MERGED_TITLES = new Set(['开运（娱乐）', '说明']);

function blockBody(b) {
  if (b.kind === 'table') {
    return `<table class="blk-table"><thead><tr>${b.head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
      <tbody>${b.rows.map((row, i) => `<tr>${row.map((c) => `<td${i === 0 ? ' class="em"' : ''}>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }
  if (b.kind === 'kv') {
    return `<dl class="blk-kv">${b.rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
  }
  if (b.kind === 'list') {
    return `<ul class="rep-list">${b.items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
  }
  if (b.kind === 'elems') {
    return `<div class="elem-bars">${b.items.map((e) => `
      <div class="elem" data-e="${e.e}"><span class="ch">${e.e}</span>
      <span class="bar"><i style="width:${e.v}%"></i></span><span class="pct">${e.v}%</span></div>`).join('')}</div>`;
  }
  return `<p>${esc(b.text || '')}</p>`;
}

function blocksBlock(rec) {
  const detailed = [];
  const normal = [];
  (rec.blocks || []).forEach((b) => {
    if (rec.type === 'ming' && MING_MERGED_TITLES.has(b.title)) return;
    const sec = `<section class="rep-sec"><h3>${esc(b.title)}</h3>${blockBody(b)}</section>`;
    if (rec.type === 'ming' && MING_DETAIL_TITLES.has(b.title)) detailed.push(sec);
    else normal.push(sec);
  });
  return normal.join('') + (detailed.length
    ? `<details class="detail-blocks"><summary>详细排盘 · 想看干支术语再展开</summary>${detailed.join('')}</details>`
    : '');
}

/* 分数旁的等级注解也翻成人话 */
const LEVEL_PLAIN = {
  '气厚而顺，宜守成拓新': '状态不错，稳住现有局面，也可以试试新的。',
  '底子扎实，进中有守': '基础扎实，往前走时留一手就好。',
  '有起有伏，贵在节奏': '有好有坏，掌握节奏比硬冲更重要。',
  '平中见稳，宜先立后破': '整体平稳，先站稳根基再谈改变。',
  '借势而行，忌独断': '顺着势头做事更顺，重要决定多听一句。',
  '先安其内，再图其外': '先把身边的事理顺，再顾外面的。',
};

function adviceBlock(rec) {
  let advice = rec.advice || [];
  if (rec.type === 'ming') {
    advice = advice.filter((a) => !a.includes('颜色、饮食、运动、城市'));
    if (!advice.length) return '';
    // 命理的调候建议带干支术语，属于专业层：收进折叠，想看再展开，不抢总评的人话结论
    return `
    <details class="adv-notes">
      <summary>排盘调候建议 · 想看术语再展开</summary>
      <ul class="rep-list">
        ${advice.map((a) => `<li>${esc(a)}</li>`).join('')}
      </ul>
    </details>`;
  }
  return listBlock('可做之事', advice);
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
    school: '相 · 命合看',
    rules: [
      '面相、手相各按本门规则取象，再参四柱五行强弱。',
      '三处只做加权平均，不新增判断。',
    ],
    custom: '综合看相的权重与分数为本项目自定。',
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
  const conf = '';
  const mm = v.measures;
  const isPalm = rec.type === 'palm';
  const src = mm?.source === 'mediapipe-468'
    ? '照片测量'
    : mm?.source === 'mediapipe-hand-21'
      ? '照片测量'
      : '照片判断';
  const mline = mm
    ? `<p class="vision-measure">${src}：${(isPalm ? [
        mm.palmRatio != null ? `掌长宽比 ${mm.palmRatio}` : '',
        mm.fingerPalmRatio != null ? `指掌比 ${mm.fingerPalmRatio}` : '',
        mm.indexRingRatio != null ? `食指/无名指 ${mm.indexRingRatio}` : '',
        mm.handSpread != null ? `摊开度 ${mm.handSpread}` : '',
      ] : [
        mm.faceWH != null ? `脸长宽比 ${mm.faceWH}` : '',
        mm.upper != null ? `三庭 ${Math.round(mm.upper * 100)}/${Math.round((mm.middle || 0) * 100)}/${Math.round((mm.lower || 0) * 100)}` : '',
        mm.eyeGap != null ? `眼距 ${mm.eyeGap} 眼宽` : '',
        mm.eyeTilt != null ? `眼角倾斜 ${mm.eyeTilt}` : '',
        mm.noseWidth != null ? `鼻宽比 ${mm.noseWidth}` : '',
        mm.jawWidth != null ? `下颌比 ${mm.jawWidth}` : '',
        mm.cheekWidth != null ? `颧宽比 ${mm.cheekWidth}` : '',
      ]).filter(Boolean).join(' · ')}</p>`
    : '';
  const basis = (v.basis || []).slice(0, 3);
  const basisLine = basis.length
    ? `<p class="vision-basis">依据：${basis.map((b) => `${esc(b.book)}·${esc(b.chapter)}`).join('；')}</p>`
    : '';
  return `
  <details class="vision-note">
    <summary>照片里看到了什么 · ${v.items.length} 项</summary>
    <dl>${v.items.map((i) => `<div><dt>${esc(i.t)}</dt><dd>${esc(i.v)}</dd></div>`).join('')}</dl>
    <p>由照片识别得到，仅作预填；可在「相」页点「自己逐项选」修改后重出批注。</p>
    ${mline}
    ${v.quality ? `<p class="vision-measure">拍摄质量：${v.quality.ok ? '良好' : esc((v.quality.issues || []).join('；'))}</p>` : ''}
    ${basisLine}
    <p class="vision-limit">照片只能看形：神态、气色、举止无法从一张照片判断；相不独论，结论只作参考。</p>
  </details>`;
}

export function reportView(id) {
  const rec = store.report(id);

  if (!rec) {
    return {
      html: `
      <header class="topbar">
        <a class="brand" href="#/"><img class="brand-mark" src="./assets/brand/crane.svg" alt=""><span>问鹤</span></a>
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
      <a class="brand" href="#/"><img class="brand-mark" src="./assets/brand/crane.svg" alt=""><span>问鹤</span></a>
      <a class="tb-link" data-back data-parent="${parent}" href="${parent}">返回</a>
      <a class="tb-link" href="#/history">我的记录</a>
    </header>

    <div class="paper-wrap">
      <article class="paper">
        <div class="paper-inner">
          <span class="rep-side">${esc(rec.title)}</span>

          <header class="rep-head">
            ${(!rec.engineVersion || rec.engineVersion !== ENGINE_VERSION) ? `<p class="rep-legacy">旧版算法：日柱已修正，建议 <a href="${again}">重新算一次</a></p>` : ''}
            <div class="rep-kicker">${esc(rec.dateLabel)}<span class="rep-tag">传统文化 · 娱乐参考</span></div>
            <h1 class="rep-title">${esc(rec.heading)}</h1>
            <p class="rep-sub">${esc(subtitle)}</p>
          </header>

          ${rec.overall != null ? `
          <div class="rep-score">
            <div class="score-num">
              <span class="n">${rec.overall}</span>
              <span class="unit">分 · ${scoreLabel}</span>
            </div>
            <div class="score-lvl">
              <b>${esc(rec.level?.name || '')}</b>
              <span>${esc(LEVEL_PLAIN[rec.level?.note] || rec.level?.note || '')}</span>
            </div>
          </div>` : ''}

          ${summaryBlock(rec)}

          ${rec.blocks ? blocksBlock(rec) : ''}

          ${rec.type === 'compass' ? compassBlock(rec) : ''}

          ${rec.dims ? radarBlock(rec) : ''}
          ${stopsBlock(rec)}
          ${triBlock(rec)}
          ${elemsBlock(rec)}
          ${itemsBlock(rec)}

          ${listBlock('可恃之处', rec.strengths)}
          ${listBlock('需留意处', rec.cautions)}
          ${adviceBlock(rec)}
          ${rec.llm ? llmBlock(rec.llm) : ''}

          <div class="verdict">
            <small>批 语</small>
            「${esc(rec.verdict)}」
          </div>

          <footer class="rep-foot">
            <img class="rep-crane" src="./assets/brand/crane.svg" alt="">
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
          placeholder.innerHTML = '<h3>AI 建议 · 仅供娱乐</h3><p class="llm-loading">正在根据批注写一段解读…</p>';
          root.querySelector('.verdict')?.before(placeholder);
        }
        if (btn) {
          btn.disabled = true;
          btn.textContent = '写解读中…';
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
          sec.innerHTML = `<h3>AI 建议 · 仅供娱乐</h3>${llmInner(llm)}`;
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
            toast('解读暂时用不了，可以自己先看看上面的结果');
          } else if (!auto) {
            toast(err.message || '解读暂时没成功，稍后再试');
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
