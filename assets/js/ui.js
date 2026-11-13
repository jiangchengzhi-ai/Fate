/* ==========================================================================
   ui.js — 组件与绘图
   ========================================================================== */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------- 首页命盘 ---------------- */
const pt = (cx, cy, r, deg) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
};

function arc(cx, cy, r1, r2, a0, a1) {
  const [x1, y1] = pt(cx, cy, r2, a0);
  const [x2, y2] = pt(cx, cy, r2, a1);
  const [x3, y3] = pt(cx, cy, r1, a1);
  const [x4, y4] = pt(cx, cy, r1, a0);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${r2} ${r2} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L${x3.toFixed(2)} ${y3.toFixed(2)} A${r1} ${r1} 0 ${large} 0 ${x4.toFixed(2)} ${y4.toFixed(2)} Z`;
}

const MODULES = [
  { key: 'ming', title: '命', center: 0, href: '#/c/ming' },
  { key: 'bu', title: '卜', center: 72, href: '#/c/bu' },
  { key: 'xiang', title: '相', center: 144, href: '#/c/xiang' },
  { key: 'kan', title: '堪舆', center: 216, href: '#/c/kan' },
  { key: 'ze', title: '择日', center: 288, href: '#/c/ze' },
];

export function dialSVG() {
  const C = 160;
  let ticks = '';
  for (let d = 0; d < 360; d += 5) {
    const major = d % 15 === 0;
    const r1 = 150;
    const r2 = major ? 158 : 154;
    const [x1, y1] = pt(C, C, r1, d);
    const [x2, y2] = pt(C, C, r2, d);
    ticks += `<line class="tick${major ? ' major' : ''}" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke-width="${major ? 1 : 0.6}"/>`;
  }

  const guaGlyphs = ['☰', '☵', '☶', '☳', '☴', '☲', '☷', '☱'];
  let guas = '';
  guaGlyphs.forEach((g, i) => {
    const [x, y] = pt(C, C, 143, i * 45);
    guas += `<text class="gua" x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle">${g}</text>`;
  });

  let wedges = '';
  MODULES.forEach((m) => {
    const a0 = m.center - 32;
    const a1 = m.center + 32;
    const [tx, ty] = pt(C, C, 94, m.center);
    const chars = [...m.title];
    const n = chars.length;
    const fs = n > 1 ? 22 : 26;
    const step = n > 1 ? 26 : 30;
    const charTxt = chars.map((ch, i) => {
      const y = ty + (i - (n - 1) / 2) * step + fs * 0.35;
      return `<text class="wedge-t" style="font-size:${fs}px" x="${tx.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle">${esc(ch)}</text>`;
    }).join('');
    wedges += `
      <a class="wedge" href="${m.href}" xlink:href="${m.href}" aria-label="${esc(m.title)}">
        <path class="wedge-fill" d="${arc(C, C, 52, 132, a0, a1)}"/>
        ${charTxt}
      </a>`;
  });

  return `
  <svg class="dial dial-in" viewBox="0 0 320 320" xmlns:xlink="http://www.w3.org/1999/xlink" role="navigation" aria-label="五门命盘">
    <circle class="ring-faint" cx="160" cy="160" r="158"/>
    ${ticks}
    ${guas}
    <circle class="ring" cx="160" cy="160" r="136"/>
    ${wedges}
    <circle class="core" cx="160" cy="160" r="42"/>
    <text class="core-t" x="160" y="157" text-anchor="middle">命盘</text>
    <text class="core-s" x="160" y="175" text-anchor="middle">FATETELL</text>
  </svg>`;
}

/* ---------------- 雷达图 ---------------- */
export function radarSVG(dims, opt = {}) {
  const size = opt.size || 260;
  const C = size / 2;
  const R = opt.radius || 82;
  const n = dims.length;
  const angle = (i) => (360 / n) * i;
  const p = (i, r) => pt(C, C, r, angle(i));

  let rings = '';
  [0.25, 0.5, 0.75, 1].forEach((k) => {
    const ps = Array.from({ length: n }, (_, i) => p(i, R * k).map((v) => v.toFixed(1)).join(','));
    rings += `<polygon class="grid" points="${ps.join(' ')}"/>`;
  });

  let axes = '';
  for (let i = 0; i < n; i++) {
    const [x, y] = p(i, R);
    axes += `<line class="axis" x1="${C}" y1="${C}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`;
  }

  const shape = dims.map((d, i) => {
    const r = (Math.max(42, Math.min(96, d.v)) - 40) / 56 * R * 0.92 + R * 0.08;
    return p(i, r).map((v) => v.toFixed(1)).join(',');
  });
  const dots = dims.map((d, i) => {
    const r = (Math.max(42, Math.min(96, d.v)) - 40) / 56 * R * 0.92 + R * 0.08;
    const [x, y] = p(i, r);
    return `<circle class="dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.9"/>`;
  }).join('');

  let labels = '';
  dims.forEach((d, i) => {
    const [x, y] = p(i, R + 20);
    const anchor = Math.abs(x - C) < 6 ? 'middle' : (x > C ? 'start' : 'end');
    labels += `<text class="lab" x="${x.toFixed(1)}" y="${(y + 3.5).toFixed(1)}" text-anchor="${anchor}">${esc(d.label)}</text>`;
    if (opt.showVal) {
      labels += `<text class="val" x="${x.toFixed(1)}" y="${(y + 14).toFixed(1)}" text-anchor="${anchor}">${d.v}</text>`;
    }
  });

  return `<svg class="radar" viewBox="0 0 ${size} ${size}" role="img" aria-label="六维气象图">
    ${rings}${axes}
    <polygon class="shape" points="${shape.join(' ')}"/>
    ${dots}${labels}
  </svg>`;
}

/* ---------------- 罗盘 ---------------- */
export function compassSVG(mountains, guas) {
  const C = 160;
  let ticks = '';
  for (let d = 0; d < 360; d += 5) {
    const major = d % 15 === 0;
    const [x1, y1] = pt(C, C, 127, d);
    const [x2, y2] = pt(C, C, major ? 135 : 132, d);
    ticks += `<line class="cp-tick${major ? ' major' : ''}" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke-width="${major ? 0.9 : 0.5}"/>`;
  }

  let shan = '';
  mountains.forEach((m) => {
    const [x, y] = pt(C, C, 145, m.deg);
    shan += `<text class="cp-shan" x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" data-deg="${m.deg}">${m.n}</text>`;
  });

  let guaLabels = '';
  Object.entries(guas).forEach(([, g]) => {
    const [x, y] = pt(C, C, 112, g.angle);
    guaLabels += `<text class="cp-gua" x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle">${g.glyph}</text>`;
  });

  return `
  <svg viewBox="0 0 320 320" role="img" aria-label="二十四山罗盘">
    <circle class="cp-ring-outer" cx="160" cy="160" r="156"/>
    <circle class="cp-ring-outer" cx="160" cy="160" r="136" stroke-opacity=".22"/>
    <circle class="cp-ring-outer" cx="160" cy="160" r="96" stroke-opacity=".18"/>
    <g id="cpDial">
      <g class="cp-ticks">${ticks}</g>
      ${shan}
      ${guaLabels}
    </g>
    <g id="cpNeedle">
      <line class="cp-needle" x1="160" y1="160" x2="160" y2="86"/>
      <line class="cp-needle-tail" x1="160" y1="160" x2="160" y2="196"/>
      <path class="cp-hand" d="M160 80 L155 92 L165 92 Z"/>
      <circle cx="160" cy="160" r="3.2" fill="#0F1916" stroke="#A98A4E" stroke-opacity=".6"/>
    </g>
  </svg>`;
}

/* ---------------- 提示与弹层 ---------------- */
let toastTimer;
export function toast(msg, opts = {}) {
  let t = $('.toast');
  if (!t) {
    t = document.createElement('div');
    t.className = 'toast';
    t.setAttribute('role', 'status');
    t.setAttribute('aria-live', 'polite');
    document.body.appendChild(t);
  }
  t.innerHTML = `<span>${esc(msg)}</span>${opts.actionLabel ? '<button class="toast-act" type="button">' + esc(opts.actionLabel) + '</button>' : ''}`;
  t.onclick = (e) => {
    if (!e.target.closest('.toast-act')) return;
    t.classList.remove('on');
    opts.onAction?.();
  };
  const ms = opts.ms || (opts.actionLabel ? 6000 : 2400);
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), ms);
}

let lastFocus = null;
export function openSheet(html, opts = {}) {
  const layer = $('#layer');
  lastFocus = document.activeElement;
  layer.innerHTML = `<div class="scrim" data-close></div><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(opts.label || '对话框')}" tabindex="-1">${html}</div>`;
  document.body.classList.add('sheet-open');
  requestAnimationFrame(() => layer.classList.add('on'));

  const sheet = $('.sheet', layer);
  $$('[data-close]', layer).forEach((b) => b.addEventListener('click', closeSheet));

  /* 默认聚焦「安全的那个」：优先 data-close，绝不默认聚焦删除 */
  const safe = $('[data-close]', sheet) || sheet;
  safe.focus?.();

  /* 焦点锁在弹层内 + Esc 关闭 */
  sheet.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeSheet();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = [...sheet.querySelectorAll('button, a[href], input, [tabindex]:not([tabindex="-1"])')]
      .filter((el) => !el.disabled && el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
}

export function closeSheet() {
  const layer = $('#layer');
  layer.classList.remove('on');
  document.body.classList.remove('sheet-open');
  setTimeout(() => { layer.innerHTML = ''; }, 380);
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}

/* ---------------- 图片 ---------------- */
export function pickImage(cb) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast('请选择图片文件');
    try {
      cb(await shrink(file, 720, 0.82));
    } catch {
      toast('这张图读不出来，换一张试试');
    }
  });
  input.click();
}

function shrink(file, max, quality) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(cv.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode')); };
    img.src = url;
  });
}

/* ---------------- 站内跳转：不依赖 location（受限面板可能锁 URL） ---------------- */
export function go(hash) {
  try { location.hash = hash; } catch { /* 面板限制时忽略 */ }
  if (typeof window.__route === 'function') window.__route(hash);
}

/* 返回上一页；优先走 app.js 的站内足迹，直接打开链接时退回 fallback */
export function goBack(fallback = '#/') {
  if (typeof window.__back === 'function') {
    window.__back(fallback);
    return;
  }
  try { history.back(); } catch { go(fallback); return; }
  const before = location.hash;
  setTimeout(() => {
    if (location.hash === before) go(fallback);
  }, 280);
}

/* ---------------- 包装层：传统文化 / 娱乐标签 ---------------- */
export function noticeSeen() {
  try { return localStorage.getItem('fatetell.notice.v1') === '1'; } catch { return true; }
}

export function markNoticeSeen() {
  try { localStorage.setItem('fatetell.notice.v1', '1'); } catch { /* 无痕模式 */ }
}

export function installFrame() {
  if (!document.querySelector('.legal-rail')) {
    const rail = document.createElement('div');
    rail.className = 'legal-rail';
    rail.setAttribute('aria-hidden', 'true');
    rail.textContent = '传统文化 · 娱乐参考';
    document.body.appendChild(rail);
  }
}


/* ---------------- 单选组语义升级 ---------------- */
export function upgradeChoices(root = document) {
  const groups = root.querySelectorAll('.q .opts, .hour-grid, .dir-grid, .opts');
  groups.forEach((g) => {
    const radios = [...g.querySelectorAll('[data-q],[data-gender],[data-hour],[data-hi],[data-door],[data-bed],[data-stove],[data-desk],[data-days]')];
    if (radios.length < 2) return;
    g.setAttribute('role', 'radiogroup');
    radios.forEach((r) => {
      const on = r.getAttribute('aria-pressed') === 'true';
      r.setAttribute('role', 'radio');
      r.setAttribute('aria-checked', String(on));
      r.tabIndex = on ? 0 : -1;
    });
  });
}

/* ---------------- 复制 / 存图 ---------------- */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('已复制，可粘贴到任意地方');
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); toast('已复制'); } catch { toast('复制失败，请长按选择'); }
    ta.remove();
  }
}

export function recordToText(r) {
  const lines = [
    `问鹤 ／ ${r.title}`,
    `${r.dateLabel || ''}　${r.level?.name || ''}　${r.overall} 分`,
    '',
    r.summary,
    '',
    ...(r.dims || []).map((d) => `${d.label} ${d.v}`),
    '',
    ...(r.strengths || []).map((s) => `· ${s}`),
    ...(r.cautions || []).map((s) => `· 留意：${s}`),
    '',
    `「${r.verdict}」`,
    '',
    '传统文化趣味解读，不构成任何决策依据。',
  ];
  return lines.join('\n');
}

/* ---------------- 分享卡 ---------------- */
export function saveCard(r) {
  const W = 1080;
  const H = 1350;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');

  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#F1EBDB');
  bg.addColorStop(0.55, '#E9E1CF');
  bg.addColorStop(1, '#E1D7C1');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);

  g.strokeStyle = 'rgba(36,31,23,.35)';
  g.lineWidth = 2;
  g.strokeRect(42, 42, W - 84, H - 84);
  g.strokeStyle = 'rgba(36,31,23,.18)';
  g.lineWidth = 1;
  g.strokeRect(56, 56, W - 112, H - 112);

  const serif = '"Songti SC","STSong","Noto Serif CJK SC","Source Han Serif SC",serif';
  const sans = '"PingFang SC","Noto Sans CJK SC","Microsoft YaHei",sans-serif';

  g.fillStyle = 'rgba(36,31,23,.55)';
  g.font = `20px ${sans}`;
  g.fillText('WENHE · 问鹤', 100, 132);
  g.fillStyle = 'rgba(36,31,23,.9)';
  g.font = `54px ${serif}`;
  g.fillText(r.heading || r.title, 100, 214);

  g.fillStyle = 'rgba(36,31,23,.5)';
  g.font = `22px ${sans}`;
  g.fillText(`${r.dateLabel || ''}　${r.meta?.birth?.year ? r.meta.birth.year + ' 年生' : ''}`, 100, 254);

  g.strokeStyle = 'rgba(36,31,23,.25)';
  g.beginPath(); g.moveTo(100, 300); g.lineTo(W - 100, 300); g.stroke();

  g.fillStyle = '#241F17';
  g.font = `210px ${serif}`;
  g.fillText(String(r.overall), 96, 500);

  g.fillStyle = 'rgba(36,31,23,.45)';
  g.font = `24px ${serif}`;
  g.fillText('分', 330, 500);

  g.fillStyle = '#A33B2B';
  g.font = `40px ${serif}`;
  g.textAlign = 'right';
  g.fillText(r.level?.name || '', W - 100, 470);
  g.fillStyle = 'rgba(36,31,23,.45)';
  g.font = `20px ${sans}`;
  g.fillText(r.level?.note || '', W - 100, 506);
  g.textAlign = 'left';

  // 摘要
  g.fillStyle = 'rgba(36,31,23,.85)';
  g.font = `26px ${serif}`;
  wrapText(g, r.summary || '', 100, 600, W - 200, 44, 5);

  // 六维
  let y = 800;
  (r.dims || []).slice(0, 6).forEach((d) => {
    g.fillStyle = 'rgba(36,31,23,.6)';
    g.font = `20px ${sans}`;
    g.fillText(d.label, 100, y);
    g.fillStyle = 'rgba(36,31,23,.13)';
    g.fillRect(190, y - 12, W - 340, 6);
    g.fillStyle = '#A33B2B';
    g.fillRect(190, y - 12, (W - 340) * (d.v / 100), 6);
    g.fillStyle = 'rgba(36,31,23,.55)';
    g.font = `20px ${serif}`;
    g.textAlign = 'right';
    g.fillText(String(d.v), W - 100, y);
    g.textAlign = 'left';
    y += 42;
  });

  // 批语
  g.strokeStyle = 'rgba(36,31,23,.22)';
  g.beginPath(); g.moveTo(100, H - 300); g.lineTo(W - 100, H - 300); g.stroke();
  g.fillStyle = '#2A2318';
  g.font = `30px ${serif}`;
  g.textAlign = 'center';
  g.fillText(`「${r.verdict}」`, W / 2, H - 230);
  g.textAlign = 'left';

  // 印
  g.save();
  g.translate(W - 168, H - 168);
  g.rotate(-0.06);
  g.fillStyle = '#9C3325';
  g.fillRect(0, 0, 96, 96);
  g.strokeStyle = 'rgba(242,232,211,.35)';
  g.lineWidth = 3;
  g.strokeRect(8, 8, 80, 80);
  g.fillStyle = '#F2E8D3';
  g.font = `26px ${serif}`;
  g.textAlign = 'center';
  g.fillText('相', 26, 40);
  g.fillText('由', 68, 40);
  g.fillText('心', 26, 78);
  g.fillText('生', 68, 78);
  g.restore();

  g.fillStyle = 'rgba(36,31,23,.42)';
  g.font = `18px ${sans}`;
  g.fillText('传统文化趣味解读 · 不构成任何决策依据', 100, H - 92);

  const a = document.createElement('a');
  a.download = `wenhe-${r.type}-${Date.now()}.png`;
  a.href = cv.toDataURL('image/png');
  a.click();
  toast('已生成图片，请查看下载');
}

function wrapText(g, text, x, y, maxW, lineH, maxLines) {
  const chars = [...text];
  let line = '';
  let lines = 0;
  for (const ch of chars) {
    const test = line + ch;
    if (g.measureText(test).width > maxW && line) {
      g.fillText(line, x, y);
      y += lineH;
      lines++;
      line = ch;
      if (lines >= maxLines - 1) break;
    } else {
      line = test;
    }
  }
  if (line && lines < maxLines) g.fillText(line, x, y);
}


/* 微信内置浏览器：提示改用浏览器打开 */
export function maybeWechatHint() {
  if (!/MicroMessenger/i.test(navigator.userAgent)) return;
  if (document.getElementById('wx-tip')) return;
  const el = document.createElement('div');
  el.id = 'wx-tip';
  el.className = 'wx-tip';
  el.innerHTML = '<span>微信里可能显示不全或打不开：点右上角 ··· → 在浏览器打开</span>'
    + '<button type="button" data-wx-copy>复制网址</button>'
    + '<button type="button" data-wx-close aria-label="关闭">×</button>';
  el.addEventListener('click', async (e) => {
    if (e.target.closest('[data-wx-close]')) { el.remove(); return; }
    if (e.target.closest('[data-wx-copy]')) {
      try {
        await navigator.clipboard.writeText(location.href);
        e.target.textContent = '已复制';
      } catch {
        e.target.textContent = '长按地址栏复制';
      }
      setTimeout(() => { e.target.textContent = '复制网址'; }, 2000);
    }
  });
  document.body.appendChild(el);
}
