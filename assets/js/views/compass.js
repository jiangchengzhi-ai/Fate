import { MOUNTAINS, GUAS, DIRS8, BAZHAI } from '../data.js';
import { buildCompass, makeRecord, mountainAt, norm360, levelOf } from '../engine.js';
import { store } from '../store.js';
import { $, $$, esc, toast, compassSVG, go } from '../ui.js';

export function compassView() {
  const saved = store.get().compassDraft || {};
  let heading = typeof saved.heading === 'number' ? saved.heading : 0;
  let locked = false;
  let sensorOn = false;
  let sensorHandler = null;
  let birth = { year: saved.year || null, gender: saved.gender || null };
  let door = saved.door || null;
  let bed = null;
  let stove = null;
  let desk = null;

  const ORDER = [['乾', '西北'], ['坎', '北'], ['艮', '东北'], ['兑', '西'], null, ['震', '东'], ['坤', '西南'], ['离', '南'], ['巽', '东南']];
  const dirGrid = (key, core) => `
    <div class="dir-grid" role="group" aria-label="${core}方位">
      ${ORDER.map((d) => (d
        ? `<button class="dir-btn" type="button" data-${key}="${d[0]}" aria-pressed="false"><b>${d[1]}</b><span>${d[0]}</span></button>`
        : `<div class="dir-core">${core}</div>`)).join('')}
    </div>`;

  const html = `
    <div class="flow">
      <header class="page-head">
        <a class="back" href="#/" data-back><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>返回</a>
        <h1>阳宅</h1>
        <a class="tb-link right" href="#/about">相法</a>
      </header>

      <p class="lead">先定房屋坐向，再看门、床、灶、书桌各在何方。站在屋内中心，让手机顶部指向大门方向；没有传感器就拖动转盘。</p>

      <h2 class="step"><b>一</b>定朝向</h2>
      <div class="compass-stage" data-stage>
        ${compassSVG(MOUNTAINS, GUAS)}
      </div>

      <div class="cp-read">
        <div class="deg" data-readout>朝向 0° · 坎卦 · 北</div>
        <div class="dir" data-dir>坐 <span>子</span> 向 午</div>
        <div class="hint" data-hint>拖动转盘，或启用设备指南针</div>
      </div>

      <div class="cp-actions">
        <button class="btn btn-ghost btn-sm" type="button" data-sensor>启用指南针</button>
        <button class="btn btn-line btn-sm" type="button" data-lock>定盘</button>
      </div>

      <div class="dir-quick" data-quick aria-label="直接选朝向">
        <button class="opt" type="button" data-face="0">北</button>
        <button class="opt" type="button" data-face="45">东北</button>
        <button class="opt" type="button" data-face="90">东</button>
        <button class="opt" type="button" data-face="135">东南</button>
        <button class="opt" type="button" data-face="180">南</button>
        <button class="opt" type="button" data-face="225">西南</button>
        <button class="opt" type="button" data-face="270">西</button>
        <button class="opt" type="button" data-face="315">西北</button>
      </div>
      <p class="q-hint" style="margin-left:0">不想转罗盘，就直接点上面的大字。</p>

      <section class="sec" style="margin-top:26px">
        <h2 class="step"><b>二</b>填宅主</h2>

        <div class="field">
          <label for="byear">出生年 · 公历</label>
          <input class="input" id="byear" type="number" inputmode="numeric" min="1900" max="2100"
            placeholder="例如 1994" value="${birth.year || ''}" data-year>
        </div>

        <div class="field">
          <label>性别 · 用于命卦</label>
          <div class="opts">
            <button class="opt" type="button" data-gender="male" aria-pressed="${birth.gender === 'male'}">男</button>
            <button class="opt" type="button" data-gender="female" aria-pressed="${birth.gender === 'female'}">女</button>
          </div>
        </div>

        <h2 class="step"><b>三</b>选入户门</h2>
        <div class="field">
          <label>门开在哪一边</label>
          <div class="dir-grid" role="group" aria-label="入户门方位">
            <button class="dir-btn" type="button" data-door="乾" aria-pressed="${door === '乾'}"><b>西北</b><span>乾</span></button>
            <button class="dir-btn" type="button" data-door="坎" aria-pressed="${door === '坎'}"><b>北</b><span>坎</span></button>
            <button class="dir-btn" type="button" data-door="艮" aria-pressed="${door === '艮'}"><b>东北</b><span>艮</span></button>
            <button class="dir-btn" type="button" data-door="兑" aria-pressed="${door === '兑'}"><b>西</b><span>兑</span></button>
            <div class="dir-core">门</div>
            <button class="dir-btn" type="button" data-door="震" aria-pressed="${door === '震'}"><b>东</b><span>震</span></button>
            <button class="dir-btn" type="button" data-door="坤" aria-pressed="${door === '坤'}"><b>西南</b><span>坤</span></button>
            <button class="dir-btn" type="button" data-door="离" aria-pressed="${door === '离'}"><b>南</b><span>离</span></button>
            <button class="dir-btn" type="button" data-door="巽" aria-pressed="${door === '巽'}"><b>东南</b><span>巽</span></button>
          </div>
          <p class="q-hint" style="margin-left:0">以整栋楼的入户门为准；若门在斜角，取最接近的八向。</p>
        </div>

        <button class="more-toggle" type="button" data-more-toggle aria-expanded="false">
          再加床 / 灶 / 书桌的方位（可选）
        </button>

        <div class="more-fields" data-more hidden>
          <div class="field">
            <label>床头所在方位（按命卦）</label>
            ${dirGrid('bed', '床')}
          </div>

          <div class="field">
            <label>灶所在方位（按宅卦）</label>
            ${dirGrid('stove', '灶')}
          </div>

          <div class="field">
            <label>书桌所在方位（按命卦）</label>
            ${dirGrid('desk', '桌')}
          </div>
        </div>
      </section>

      <p class="foot">八宅法只论方位，不替代采光、通风与结构安全。</p>
    </div>

    <div class="dock">
      <div class="dock-info"><b data-count>0/3</b>必填</div>
      <button class="btn btn-primary" type="button" data-submit disabled>看宅运</button>
    </div>`;

  const mount = () => {
    const root = $('#app .view');
    const stage = $('[data-stage]', root);
    const needle = $('#cpNeedle', root);
    const degEl = $('[data-readout]', root);
    const dirEl = $('[data-dir]', root);
    const hint = $('[data-hint]', root);
    const submit = $('[data-submit]', root);
    const countEl = $('[data-count]', root);

    const readyCount = () => (birth.year ? 1 : 0) + (birth.gender ? 1 : 0) + (door ? 1 : 0);
    const ready = () => !!(birth.year && birth.gender && door);

    const refreshDock = () => {
      countEl.textContent = `${readyCount()}/3`;
      submit.disabled = !ready();
    };

    const paint = () => {
      const facing = mountainAt(heading);
      const sitting = mountainAt(heading + 180);
      needle.setAttribute('transform', `rotate(${norm360(heading).toFixed(1)} 160 160)`);
      degEl.textContent = `朝向 ${Math.round(norm360(heading))}° · ${facing.gua}卦 · ${GUAS[facing.gua].dir}`;
      dirEl.innerHTML = `坐 <span>${sitting.n}</span> 向 ${facing.n}`;
      $$('.cp-shan', root).forEach((t) => {
        const d = Number(t.dataset.deg);
        t.classList.toggle('hot', d === facing.deg || d === sitting.deg);
      });
    };

    const setHeading = (h) => {
      heading = norm360(h);
      paint();
    };

    paint();
    refreshDock();

    $$('[data-face]', root).forEach((b) => {
      b.addEventListener('click', () => {
        if (locked) return;
        setHeading(Number(b.dataset.face));
        $$('[data-face]', root).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        hint.textContent = '已按所选方向定盘，可再微调';
      });
    });

    /* --- 拖动转盘 --- */
    const angleAt = (e) => {
      const r = stage.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2);
      const y = e.clientY - (r.top + r.height / 2);
      return (Math.atan2(x, -y) * 180) / Math.PI;
    };
    let dragging = false;
    let startAngle = 0;
    let startHeading = 0;

    stage.addEventListener('pointerdown', (e) => {
      if (locked) return;
      dragging = true;
      startAngle = angleAt(e);
      startHeading = heading;
      stage.setPointerCapture?.(e.pointerId);
      hint.textContent = '转到你想要的朝向，松手即定';
    });
    stage.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      setHeading(startHeading + (angleAt(e) - startAngle));
    });
    const stop = () => {
      if (!dragging) return;
      dragging = false;
      heading = Math.round(norm360(heading));
      paint();
      store.patch({ compassDraft: { ...(store.get().compassDraft || {}), heading, door, ...birth } });
    };
    stage.addEventListener('pointerup', stop);
    stage.addEventListener('pointercancel', stop);

    /* --- 设备指南针 --- */
    const sensorBtn = $('[data-sensor]', root);
    if (!('DeviceOrientationEvent' in window)) sensorBtn.style.display = 'none';

    sensorBtn.addEventListener('click', async () => {
      if (sensorOn) {
        window.removeEventListener('deviceorientationabsolute', sensorHandler, true);
        window.removeEventListener('deviceorientation', sensorHandler, true);
        sensorOn = false;
        sensorBtn.textContent = '启用指南针';
        hint.textContent = '已关闭传感器，可继续拖动转盘';
        return;
      }
      try {
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
          const res = await DeviceOrientationEvent.requestPermission();
          if (res !== 'granted') {
            toast('未获得方向权限，可拖动转盘');
            return;
          }
        }
        sensorHandler = (e) => {
          if (locked) return;
          let h = null;
          if (typeof e.webkitCompassHeading === 'number') h = e.webkitCompassHeading;
          else if (typeof e.alpha === 'number') h = 360 - e.alpha;
          if (h === null) return;
          setHeading(h);
        };
        const absolute = 'ondeviceorientationabsolute' in window;
        window.addEventListener(absolute ? 'deviceorientationabsolute' : 'deviceorientation', sensorHandler, true);
        sensorOn = true;
        sensorBtn.textContent = '关闭指南针';
        hint.textContent = '转动手机，让顶部指向大门；读数有偏差时手动微调';
      } catch {
        toast('此设备不支持方向感应，请拖动转盘');
      }
    });

    /* --- 定盘 --- */
    const lockBtn = $('[data-lock]', root);
    lockBtn.addEventListener('click', () => {
      locked = !locked;
      lockBtn.textContent = locked ? '重新定盘' : '定盘';
      stage.style.cursor = locked ? 'default' : '';
      if (locked) {
        heading = Math.round(norm360(heading));
        paint();
        hint.textContent = `已定盘：坐 ${mountainAt(heading + 180).n} 向 ${mountainAt(heading).n}`;
        store.patch({ compassDraft: { ...(store.get().compassDraft || {}), heading, door, ...birth } });
      } else {
        hint.textContent = '拖动转盘，或启用设备指南针';
      }
    });

    /* --- 表单 --- */
    root.addEventListener('change', (e) => {
      const input = e.target.closest('[data-year]');
      if (!input) return;
      const y = Number(input.value);
      birth.year = y >= 1900 && y <= 2100 ? y : null;
      if (input.value && !birth.year) {
        input.value = '';
        toast('请填 1900 至 2100 之间的年份');
      }
      store.patch({ compassDraft: { ...(store.get().compassDraft || {}), heading, door, ...birth } });
      refreshDock();
    });

    const more = $('[data-more]', root);
    const moreBtn = $('[data-more-toggle]', root);
    moreBtn?.addEventListener('click', () => {
      const open = more.hasAttribute('hidden');
      if (open) more.removeAttribute('hidden');
      else more.setAttribute('hidden', '');
      moreBtn.setAttribute('aria-expanded', String(open));
      moreBtn.textContent = open ? '收起可选方位' : '再加床 / 灶 / 书桌的方位（可选）';
    });

    root.addEventListener('click', (e) => {
      const g = e.target.closest('[data-gender]');
      if (g) {
        birth.gender = g.dataset.gender;
        root.querySelectorAll('[data-gender]').forEach((b) => b.setAttribute('aria-pressed', String(b === g)));
        store.patch({ compassDraft: { ...(store.get().compassDraft || {}), heading, door, ...birth } });
        refreshDock();
        return;
      }

      const d = e.target.closest('[data-door]');
      if (d) {
        door = d.dataset.door;
        root.querySelectorAll('[data-door]').forEach((b) => b.setAttribute('aria-pressed', String(b === d)));
        store.patch({ compassDraft: { ...(store.get().compassDraft || {}), heading, door, ...birth } });
        refreshDock();
        return;
      }

      const place = e.target.closest('[data-bed], [data-stove], [data-desk]');
      if (place) {
        const key = place.dataset.bed ? 'bed' : place.dataset.stove ? 'stove' : 'desk';
        const val = place.dataset[key] || place.textContent;
        const cur = key === 'bed' ? bed : key === 'stove' ? stove : desk;
        const next = cur === val ? null : val;
        if (key === 'bed') bed = next;
        if (key === 'stove') stove = next;
        if (key === 'desk') desk = next;
        root.querySelectorAll(`[data-${key}]`).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset[key] === next)));
        return;
      }

      if (e.target.closest('[data-submit]')) {
        if (!birth.year) {
          toast('先填出生年');
          return;
        }
        if (!birth.gender) {
          toast('还差性别');
          return;
        }
        if (!door) {
          toast('选一个入户门方位');
          return;
        }
        const base = buildCompass({
          heading,
          birthYear: birth.year,
          gender: birth.gender,
          door,
        });
        const houseMap = BAZHAI[base.meta.houseGua];
        const mingMap = BAZHAI[base.meta.mGua];
        const picks = [
          ['大门', door, '宅卦'],
          ['灶', stove, '宅卦'],
          ['床', bed, '命卦'],
          ['书桌', desk, '命卦'],
        ].filter((x) => x[1]);
        const rows = picks.map(([name, g, basis]) => {
          const star = (basis === '命卦' ? mingMap : houseMap)[g];
          return { name, dir: GUAS[g].dir, star: star.name, level: star.level, good: star.good };
        });
        const goodN = rows.filter((r) => r.good).length;
        const score = Math.round(Math.max(45, Math.min(92,
          62 + goodN * 6 - (rows.length - goodN) * 4 + (base.meta.match ? 4 : 0))));
        const mingGood = ['生气', '天医', '延年'].map((s) => {
          const g = Object.keys(mingMap).find((x) => mingMap[x].name === s);
          return { s, dir: GUAS[g].dir };
        });
        const bad = rows.filter((r) => !r.good);

        const report = {
          ...base,
          overall: score,
          level: levelOf(score),
          blocks: [{
            kind: 'table',
            title: '摆放',
            head: ['位置', '方位', '星', '吉凶'],
            rows: rows.map((r) => [r.name, r.dir, r.star, r.level]),
          }],
          advice: [
            `床头宜朝${mingGood[0].dir}（生气）或${mingGood[1].dir}（天医），按命卦算，不按宅卦。`,
            base.meta.match
              ? '命宅同组，格局本来就顺；先处理采光、通风、动线，再谈方位。'
              : '命宅不同组，不必改门；把床、书桌挪到命卦吉方即可。',
            bad.length
              ? `有 ${bad.length} 处落在凶方：${bad.map((r) => r.name + '（' + r.star + '）').join('、')}，能挪则挪，挪不动就用柜体、帘子隔断，别久卧久坐。`
              : '门、床、灶、桌都在吉方，剩下的就是把光、风、水处理好。',
          ],
          cautions: bad.map((r) => `${r.name}在${r.dir}方，为${r.star}（${r.level}）。`),
        };
        const rec = store.addReport(makeRecord(report));
        go(`#/report/${rec.id}`);
      }
    });

  };

  return { html, mount };
}
