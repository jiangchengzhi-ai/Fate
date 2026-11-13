import { api } from '../api.js';
import { $, esc } from '../ui.js';

const CAT_NAME = { ming: '命', bu: '卜', xiang: '相', kan: '堪舆', ze: '择日' };

/* 服务不可用时的兜底：五门与入口必须永远可达 */
const STATIC_CATS = [
  {
    id: 'ming', name: '命',
    intro: '以出生年月日时立四柱，看五行强弱与十神格局。命是底色，运是次序。',
    methods: [{ name: '四柱排盘', desc: '生日时辰 → 四柱、五行、运程', href: '#/ming' }],
  },
  {
    id: 'bu', name: '卜',
    intro: '以当下之时起课，问一件具体的事。卜重时机，讲究一事一占。',
    methods: [{ name: '小六壬', desc: '月日时三数 → 六宫吉凶', href: '#/bu' }],
  },
  {
    id: 'xiang', name: '相',
    intro: '相人形神气色，观其骨肉与神态。相不独论，须与命、行合看。',
    methods: [
      { name: '面相', desc: '上传正面照 → 直接看相', href: '#/face' },
      { name: '手相', desc: '上传掌心照 → 直接看相', href: '#/palm' },
      { name: '综合相', desc: '面 + 掌 + 命 → 合参', href: '#/combo' },
    ],
  },
  {
    id: 'kan', name: '堪舆',
    intro: '以坐向定宅卦，以生年定命卦。宅有宅气，人有命气，两气相参。',
    methods: [
      { name: '阳宅', desc: '宅向 · 门 · 床 · 灶 · 书桌', href: '#/compass' },
      { name: '阴宅', desc: '罗盘定坐向 · 来去水 · 形势', href: '#/yinzha' },
    ],
  },
  {
    id: 'ze', name: '择日',
    intro: '以月建日辰定建除十二神，参黄道黑道，择可用之日，避所忌之时。',
    methods: [{ name: '黄历择日', desc: '事由 → 建除、宜忌、可选日', href: '#/ze' }],
  },
];

const head = `
  <header class="topbar">
    <a class="brand" href="#/">问鹤</a>
    <a class="tb-link" href="#/about">关于</a>
  </header>`;

const backHead = (title) => `
  <header class="page-head">
    <a class="back" href="#/" data-back><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>返回</a>
    <h1>${esc(title)}</h1>
    <span class="right"></span>
  </header>`;

const methodRow = (m) => `
  <a class="method" href="${esc(m.href)}">
    <span class="method-name">${esc(m.name)}</span>
    <span class="method-desc">${esc(m.desc)}</span>
    <span class="method-go">→</span>
  </a>`;

export function categoryView(catId) {
  const fallback = STATIC_CATS.find((c) => c.id === catId) || STATIC_CATS[0];

  return {
    html: `
      ${head}
      ${backHead(fallback.name)}
      <p class="lead" data-intro>${esc(fallback.intro)}</p>
      <div class="methods" data-methods>${fallback.methods.map(methodRow).join('')}</div>
      <div data-svc></div>
      <footer class="foot">结果仅供娱乐参考。</footer>`,
    mount: async () => {
      const root = $('#app .view');
      const intro = $('[data-intro]', root);
      const methods = $('[data-methods]', root);

      let cats = null;
      try { cats = await api.categories(); } catch { cats = null; }
      if (!cats) return;

      const c = cats.categories.find((x) => x.id === catId);
      if (!c) return;
      intro.textContent = c.intro;
      methods.innerHTML = c.methods.map(methodRow).join('');
    },
  };
}

export const CATEGORY_NAMES = CAT_NAME;
