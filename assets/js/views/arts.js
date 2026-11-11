import { api } from '../api.js';
import { HOURS } from '../data.js';
import { lunarParts, zhiIndexNow, nowLabel } from '../lunar.js';
import { makeRecord, levelOf } from '../engine.js';
import { store } from '../store.js';
import { $, esc, toast, go } from '../ui.js';

const today = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const VERDICT = {
  ming: ['命是底牌，运是出牌的顺序。', '知命不是认命，是知道力气该往哪使。', '四柱只说明起点，不说明终点。'],
  bu: ['卜以决疑，不疑何卜。', '一事一占，占过不再占。', '课是当下的切片，不是一生的判词。'],
  ze: ['择日不如择事，择事不如择人。', '吉日不等于必成，凶日不等于必败。', '先看用事，再看日辰。'],
  kan: ['山管人丁水管财。', '形势在前，理气在后。', '地有吉气，土随而起。'],
};
const pickLine = (arr) => arr[Math.floor(Math.random() * arr.length)];

function shell(title, body, dock) {
  return `
    <div class="flow">
      <header class="page-head">
        <a class="back" href="#/" data-back><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>返回</a>
        <h1>${esc(title)}</h1>
        <a class="tb-link right" href="#/about">关于</a>
      </header>
      ${body}
    </div>
    <div class="dock">
      <div class="dock-info"><b>本地</b>推演</div>
      ${dock}
    </div>`;
}

export function finish(result, extra) {
  const rec = makeRecord({
    type: result.type,
    title: extra.title,
    heading: extra.heading,
    glyph: extra.glyph,
    overall: extra.overall ?? null,
    level: extra.level ?? null,
    summary: result.summary,
    subtitle: extra.subtitle,
    blocks: extra.blocks,
    citations: result.citations || [],
    advice: extra.advice || [],
    meta: extra.meta || undefined,
    verdict: pickLine(VERDICT[result.type] || VERDICT.bu),
  });
  store.addReport(rec);
  go(`#/report/${rec.id}`);
}

/* ---------------- 命 · 四柱 ---------------- */
export function mingView() {
  return {
    html: shell('四柱', `
      <p class="lead">以公历生日与时辰立四柱，再排起运、大运与流年。年柱以立春为界，月柱以十二节为界，日柱按儒略日推算，时柱由日干起。</p>
      <div class="field">
        <label for="md">出生日期 · 公历</label>
        <input class="input" type="date" id="md" data-date max="${today()}" min="1900-01-01">
      </div>
      <div class="field">
        <label>出生时辰</label>
        <div class="hour-grid">
          ${HOURS.map((h) => `<button class="hour" type="button" data-hour="${h.v}" aria-pressed="${h.v === '午'}">
            <b>${h.label}</b><span>${h.range}</span></button>`).join('')}
        </div>
      </div>
      <div class="field">
        <label>性别</label>
        <div class="opts">
          <button class="opt" type="button" data-gender="male" aria-pressed="true">男</button>
          <button class="opt" type="button" data-gender="female" aria-pressed="false">女</button>
        </div>
      </div>
      <p class="foot">节气按太阳视黄经计算；起运以三日折一年。日柱如与万年历不符，以历书为准。</p>
    `, '<button class="btn btn-primary" type="button" data-go>起 盘</button>'),
    mount: () => {
      const root = $('#app .view');
      let hour = '午';
      let gender = 'male';
      root.addEventListener('click', (e) => {
        const h = e.target.closest('[data-hour]');
        if (h) {
          hour = h.dataset.hour;
          root.querySelectorAll('[data-hour]').forEach((b) => b.setAttribute('aria-pressed', String(b === h)));
          return;
        }
        const g = e.target.closest('[data-gender]');
        if (g) {
          gender = g.dataset.gender;
          root.querySelectorAll('[data-gender]').forEach((b) => b.setAttribute('aria-pressed', String(b === g)));
          return;
        }
        if (e.target.closest('[data-go]')) submit();
      });

      const submit = async () => {
        const date = $('[data-date]', root).value;
        if (!date) return toast('先选出生日期');
        const btn = $('[data-go]', root);
        btn.disabled = true;
        btn.textContent = '排 盘 中';
        try {
          const r = await api.tool('paipan', { date, hour, gender });
          const rows = r.pillars.map((p) => `${p.gan}${p.zhi}`);
          finish(r, {
            title: '命盘批注',
            heading: '命',
            glyph: '命',
            subtitle: rows.join('　'),
            overall: r.overall,
            level: levelOf(r.overall),
            blocks: [
              { kind: 'table', title: '四柱', head: r.pillars.map((p) => p.label), rows: [rows, r.tenGods] },
              { kind: 'elems', title: '五行', items: r.elems },
              { kind: 'kv', title: '判读', rows: [
                ['日主', `${r.dayMaster}${r.dayMasterElem}`],
                ['身强弱', r.strong ? '身旺' : '身弱'],
                ['喜用', r.yong.filter(Boolean).join('、')],
              ] },
              { kind: 'kv', title: '起运', rows: [
                ['顺逆', r.luck.forward ? '顺行' : '逆行'],
                ['起运', `${r.luck.startAge.years}岁${r.luck.startAge.months ? `${r.luck.startAge.months}个月` : ''}`],
                ['交运', r.luck.startDate],
              ] },
              { kind: 'table', title: '大运', head: ['大运', '起岁', '十神'],
                rows: r.luck.cycles.map((c) => [c.gan + c.zhi, c.startLabel, c.tenGod]) },
              { kind: 'kv', title: '流年', rows: [
                ['流年', `${r.luck.liunian.year}　${r.luck.liunian.ganZhi}`],
                ['十神', r.luck.liunian.tenGod],
                ['年龄', `${r.luck.liunian.age} 岁`],
                ['所在大运', r.luck.liunian.cycle],
              ] },
              { kind: 'kv', title: '开运（娱乐）', rows: [
                ['颜色', r.fortune.colors],
                ['饮食', r.fortune.foods],
                ['运动', r.fortune.sports],
                ['方位', r.fortune.direction],
                ['城市', r.fortune.cities],
              ] },
              { kind: 'text', title: '说明', text: r.fortune.note },
            ],
            advice: [
              `喜用${r.yong.filter(Boolean).join('、')}：有意识地用这两个方向补，不是改命，是调状态。`,
              `忌一味补${r.dom}：旺处再加，容易过。`,
              `${r.luck.liunian.year} 年流年 ${r.luck.liunian.ganZhi}，落在 ${r.luck.liunian.cycle} 运里；流年只说明引动，不说明结果。`,
              '颜色、饮食、运动、城市按喜用五行推，属娱乐；不是医疗或择业建议，量力而行。',
            ],
          });
        } catch (err) {
          btn.disabled = false;
          btn.textContent = '起 盘';
          toast(err.message.includes('fetch') ? '服务未启动' : err.message);
        }
      };
    },
  };
}

/* ---------------- 卜 · 小六壬 ---------------- */
export function buView() {
  const now = lunarParts() || { month: 1, day: 1 };
  const initHour = zhiIndexNow();

  const sel = (label, name, max, current) => `
    <div class="field">
      <label>${label}</label>
      <select class="input" data-${name}>
        ${Array.from({ length: max }, (_, i) => `<option value="${i + 1}"${i + 1 === current ? ' selected' : ''}>${i + 1}</option>`).join('')}
      </select>
    </div>`;

  return {
    html: shell('起课', `
      <p class="lead">小六壬以农历月、日、时辰三个数起课，从大安顺数，落宫断事。默认取此刻的农历与时辰，可以改。</p>

      <div class="field">
        <label for="bq">要问的事</label>
        <input class="input" type="text" id="bq" data-question maxlength="60" placeholder="例如：这次面试能不能过 / 这个月适合搬家吗">
        <p class="q-hint" style="margin-left:0">一事一占，问得越具体越好；同一件事不要反复起课。</p>
        <p class="q-hint" style="margin-left:0">小六壬只断此刻吉凶。若问「哪天合适」，请用 <a href="#/ze" style="color:var(--brass-hi);border-bottom:1px solid var(--brass-soft)">择日</a>。</p>
      </div>

      ${sel('农历月', 'month', 12, now.month)}
      ${sel('农历日', 'day', 30, now.day)}

      <div class="field">
        <label>时辰</label>
        <div class="hour-grid">
          ${HOURS.map((h, i) => `<button class="hour" type="button" data-hi="${i + 1}" aria-pressed="${i + 1 === initHour}">
            <b>${h.label}</b><span>${h.range}</span></button>`).join('')}
        </div>
      </div>

      <div class="cp-actions">
        <button class="btn btn-ghost btn-sm" type="button" data-now>用当前时间</button>
      </div>
      <p class="foot">当前：<span data-now-label>${now.month}月${now.day}日</span>　一事一占，同一件事别反复起课。</p>
    `, '<button class="btn btn-primary" type="button" data-go>起 课</button>'),
    mount: () => {
      const root = $('#app .view');
      let hi = initHour;

      const markHour = () => {
        root.querySelectorAll('[data-hi]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.hi) === hi)));
      };

      const syncNow = () => {
        const p = lunarParts();
        if (!p) {
          toast('当前浏览器不支持农历换算，请手动选择');
          return;
        }
        $('[data-month]', root).value = String(p.month);
        $('[data-day]', root).value = String(p.day);
        hi = zhiIndexNow();
        markHour();
        $('[data-now-label]', root).textContent = `${p.month}月${p.day}日 · ${nowLabel()}`;
        toast('已对齐当前时间');
      };

      root.addEventListener('click', async (e) => {
        const h = e.target.closest('[data-hi]');
        if (h) {
          hi = Number(h.dataset.hi);
          markHour();
          return;
        }
        if (e.target.closest('[data-now]')) {
          syncNow();
          return;
        }
        if (!e.target.closest('[data-go]')) return;

        const question = ($('[data-question]', root)?.value || '').trim();
        if (!question) {
          toast('先写下要问的事');
          $('[data-question]', root)?.focus();
          return;
        }

        const month = Number($('[data-month]', root).value);
        const day = Number($('[data-day]', root).value);
        const btn = $('[data-go]', root);
        btn.disabled = true;
        btn.textContent = '起 课 中';
        try {
          const r = await api.tool('xiaoliuren', { month, day, hourIndex: hi });
          finish(r, {
            title: '起课批注',
            heading: '卜',
            glyph: '卜',
            subtitle: `${question} · ${r.gua.name}`,
            overall: r.overall,
            level: levelOf(r.overall),
            meta: { question },
            blocks: [
              { kind: 'kv', title: '所问', rows: [
                ['问题', question],
                ['起课', `${r.month}月${r.day}日 ${HOURS[hi - 1]?.label || ''}`],
              ] },
              { kind: 'kv', title: '落宫', rows: [['宫位', r.gua.name], ['吉凶', r.gua.luck]] },
              { kind: 'list', title: '起课', items: r.steps.map((s) => `${s.label}：${s.text}`) },
              { kind: 'text', title: '断语', text: r.gua.body },
            ],
            advice: [
              r.gua.luck === '吉' ? '吉课不等于必成，该做的准备一样不能少。' : '凶课不是判决，是提醒你把节奏放慢、把话说清。',
              '所问之事若已过时，就不要再占。',
              '若问的是「具体哪天」，小六壬给不了日期，请到「择日」按事由挑日子。',
            ],
          });
        } catch (err) {
          btn.disabled = false;
          btn.textContent = '起 课';
          toast(err.message.includes('fetch') ? '服务未启动' : err.message);
        }
      });
    },
  };
}

/* ---------------- 择日 ---------------- */
const ZE_GROUPS = [
  { id: 'marry', name: '婚嫁', events: [['marry', '嫁娶订婚'], ['propose', '求婚']] },
  { id: 'move', name: '迁移出行', events: [['move', '入宅搬家'], ['travel', '出行赴任']] },
  { id: 'work', name: '事务', events: [['open', '开业开市'], ['sign', '签约立约'], ['build', '动土装修']] },
  { id: 'care', name: '医疗身后', events: [['medical', '求医问诊'], ['bury', '安葬破土']] },
  { id: 'rite', name: '礼仪学业', events: [['worship', '祭祀祈福'], ['study', '入学考试']] },
];

export function zeView() {
  return {
    html: shell('择日', `
      <p class="lead">先说清楚要办什么事，再选一个时间段。以月建与日辰定建除十二神，参宜忌与冲煞，挑出合适的日子。</p>

      <div class="field">
        <label>类别</label>
        <div class="opts" data-zg>
          ${ZE_GROUPS.map((g, i) => `<button class="opt" type="button" data-zgroup="${g.id}" aria-pressed="${i === 0}">${g.name}</button>`).join('')}
        </div>
      </div>

      <div class="field">
        <label>要办的事</label>
        <div class="opts" data-ze>
          ${ZE_GROUPS[0].events.map(([id, name], i) => `<button class="opt" type="button" data-zev="${id}" aria-pressed="${i === 0}">${name}</button>`).join('')}
        </div>
      </div>

      <div class="field">
        <label>看多久之内</label>
        <div class="opts" data-span>
          <button class="opt" type="button" data-days="30" aria-pressed="true">未来 30 天</button>
          <button class="opt" type="button" data-days="60" aria-pressed="false">60 天</button>
          <button class="opt" type="button" data-days="90" aria-pressed="false">90 天</button>
        </div>
      </div>

      <div class="field">
        <label for="zy">主事人出生年（可选，用来避开冲本命）</label>
        <input class="input" type="number" id="zy" inputmode="numeric" min="1900" max="2100" placeholder="例如 1994" data-year>
      </div>

      <p class="foot">建除只论日辰，不代替对具体事项的判断；婚丧嫁娶等大事请结合实际情况。</p>
    `, '<button class="btn btn-primary" type="button" data-go>挑 日 子</button>'),
    mount: () => {
      const root = $('#app .view');
      let event = 'marry';
      let days = 30;

      const paintEvents = (gid) => {
        const g = ZE_GROUPS.find((x) => x.id === gid) || ZE_GROUPS[0];
        $('[data-ze]', root).innerHTML = g.events
          .map(([id, name], i) => `<button class="opt" type="button" data-zev="${id}" aria-pressed="${i === 0}">${name}</button>`)
          .join('');
        event = g.events[0][0];
      };

      root.addEventListener('click', async (e) => {
        const zg = e.target.closest('[data-zgroup]');
        if (zg) {
          root.querySelectorAll('[data-zgroup]').forEach((b) => b.setAttribute('aria-pressed', String(b === zg)));
          paintEvents(zg.dataset.zgroup);
          return;
        }
        const ze = e.target.closest('[data-zev]');
        if (ze) {
          event = ze.dataset.zev;
          root.querySelectorAll('[data-zev]').forEach((b) => b.setAttribute('aria-pressed', String(b === ze)));
          return;
        }
        const sp = e.target.closest('[data-days]');
        if (sp) {
          days = Number(sp.dataset.days);
          root.querySelectorAll('[data-days]').forEach((b) => b.setAttribute('aria-pressed', String(b === sp)));
          return;
        }
        if (!e.target.closest('[data-go]')) return;

        const yearRaw = ($('[data-year]', root).value || '').trim();
        const birthYear = yearRaw ? Number(yearRaw) : undefined;
        if (yearRaw && (!birthYear || birthYear < 1900 || birthYear > 2100)) {
          toast('出生年填 1900–2100');
          return;
        }

        const btn = $('[data-go]', root);
        btn.disabled = true;
        btn.textContent = '挑 日 子 中';
        try {
          const r = await api.tool('zeri', { event, days, birthYear });
          const evName = r.event?.name || '';
          finish(r, {
            title: '择日批注',
            heading: '择日',
            glyph: '择',
            subtitle: `${evName} · ${r.from} 起 ${r.days} 天`,
            blocks: [
              { kind: 'table', title: '可选的日子', head: ['日期', '干支', '吉凶'],
                rows: r.picks.map((x) => [`${x.date.slice(5)} 周${x.weekday}`, x.ganzhi, `${x.jianchu}${x.luck}`]) },
              ...(r.avoid.length ? [{ kind: 'table', title: '避开的日子', head: ['日期', '干支', '原因'],
                rows: r.avoid.map((x) => [`${x.date.slice(5)}`, x.ganzhi, `${x.reasons[0] || '日辰不利'}`]) }] : []),
            ],
            advice: r.advice,
            overall: r.overall,
            level: levelOf(r.overall),
            meta: { event: r.event, days: r.days, birthYear: birthYear || null },
          });
        } catch (err) {
          btn.disabled = false;
          btn.textContent = '挑 日 子';
          toast(err.message.includes('fetch') ? '服务未启动' : err.message);
        }
      });
    },
  };
}
