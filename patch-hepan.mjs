import fs from 'node:fs';

const p = 'assets/js/views/arts.js';
let s = fs.readFileSync(p, 'utf8');
const rep = (a, b) => { if (!s.includes(a)) throw new Error('arts anchor: ' + a.slice(0, 50)); s = s.split(a).join(b); };

/* 命理页加合盘入口 */
rep(
  `      <p class="lead">填出生日期和时辰，就能排出命盘，看一生的运势起伏。</p>`,
  `      <p class="lead">填出生日期和时辰，就能排出命盘，看一生的运势起伏。</p>
      <p style="margin:-6px 0 18px"><a class="more" href="#/hepan">和另一半合盘 ›</a></p>`,
);

/* 未来七天：提交时顺带取 */
rep(
  "          const r = await api.tool('paipan', payload);",
  `          const r = await api.tool('paipan', payload);
          let week = null;
          try { week = await api.tool('daily', { birth: payload, days: 7 }); } catch { week = null; }`,
);

rep(
  `              { kind: 'table', title: '流月', head: ['月', '干支', '十神'],
                rows: (r.deep?.months || []).map((m) => [m.label, m.ganZhi, m.tenGod]) },`,
  `              { kind: 'table', title: '流月', head: ['月', '干支', '十神'],
                rows: (r.deep?.months || []).map((m) => [m.label, m.ganZhi, m.tenGod]) },
              ...(week ? [{ kind: 'table', title: '未来七天', head: ['日期', '干支', '十神', '能量'],
                rows: week.days.map((d) => [d.date.slice(5), d.ganzhi, d.tenGod, String(d.energy)]) }] : []),`,
);

/* 合盘视图 */
if (!s.includes('export function hepanView')) {
  s += `

/* ---------------- 合盘 ---------------- */
export function hepanView() {
  const hourOpts = HOURS.map((h) => \`<option value="\${h.v}">\${h.label}</option>\`).join('');
  const person = (k, label) => \`
    <div class="field">
      <label>\${label}生日</label>
      <input class="input" type="date" data-\${k}-date max="\${today()}" min="1900-01-01">
    </div>
    <div class="field">
      <label>\${label}时辰</label>
      <select class="input" data-\${k}-hour>\${hourOpts}</select>
    </div>
    <div class="field">
      <label>\${label}性别</label>
      <select class="input" data-\${k}-g><option value="male">男</option><option value="female">女</option></select>
    </div>\`;

  return {
    html: shell('合盘', \`
      <p class="lead">填两个人的生日与时辰，看日柱冲合、五行互补。</p>
      <h2 class="step"><b>一</b>第一个人</h2>
      \${person('a', '他/她')}
      <h2 class="step"><b>二</b>第二个人</h2>
      \${person('b', '对方')}
      <p class="foot">合盘只看日柱与五行互补，不替代相处与沟通。</p>
    \`, '<button class="btn btn-primary" type="button" data-go>看 合 盘</button>'),
    mount: () => {
      const root = $('#app .view');
      root.addEventListener('click', async (e) => {
        if (!e.target.closest('[data-go]')) return;
        const aDate = $('[data-a-date]', root).value;
        const bDate = $('[data-b-date]', root).value;
        if (!aDate || !bDate) return toast('两个人的生日都要填');
        const btn = $('[data-go]', root);
        btn.disabled = true;
        btn.textContent = '合 盘 中';
        try {
          const a = { date: aDate, hour: $('[data-a-hour]', root).value, gender: $('[data-a-g]', root).value };
          const b = { date: bDate, hour: $('[data-b-hour]', root).value, gender: $('[data-b-g]', root).value };
          const r = await api.tool('hepan', { a, b });
          const pa = r.a.pillars.map((x) => x.gan + x.zhi).join(' ');
          const pb = r.b.pillars.map((x) => x.gan + x.zhi).join(' ');
          finish(r, {
            title: '合盘批注',
            heading: '合盘',
            glyph: '合',
            subtitle: \`\${pa}　×　\${pb}\`,
            overall: r.overall,
            level: levelOf(r.overall),
            blocks: [
              { kind: 'table', title: '双方四柱', head: ['', '第一个', '第二个'], rows: [
                ['四柱', pa, pb],
                ['日主', r.a.dayMaster, r.b.dayMaster],
                ['喜用', r.a.yong.filter(Boolean).join('、'), r.b.yong.filter(Boolean).join('、')],
              ] },
              { kind: 'kv', title: '关系', rows: r.relations.length ? r.relations.map((x) => [x.type, x.text]) : [['日柱', '无直接冲合']] },
            ],
            advice: [
              r.overall >= 70 ? '两人五行互补较多，遇事商量着来，别把默契当理所当然。' : '互补不算多，反而要留出各自的空间，少替对方做决定。',
              '日柱相冲不代表不能处，代表节奏不同：一个快一个慢，先说清楚再动。',
              '合盘只论日柱与五行，不涉及双方家庭、价值观与现实条件。',
            ],
          });
        } catch (err) {
          btn.disabled = false;
          btn.textContent = '看 合 盘';
          toast(err.message.includes('fetch') ? '服务未启动' : err.message);
        }
      });
    },
  };
}
`;
}

fs.writeFileSync(p, s);
console.log('hepan view + daily block');
