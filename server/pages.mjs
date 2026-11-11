/* ==========================================================================
   pages.mjs — 登录页与监测后台（服务端渲染，不依赖前端构建）
   ========================================================================== */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const baseCss = `
  :root{color-scheme:dark}
  *{box-sizing:border-box}
  body{margin:0;background:#0B1210;color:#E9E4D6;font-family:"PingFang SC","Microsoft YaHei",system-ui,sans-serif;font-size:16px;line-height:1.7}
  .wrap{max-width:1000px;margin:0 auto;padding:28px 20px 60px}
  h1{font-family:"Songti SC",STSong,serif;font-weight:400;font-size:30px;letter-spacing:.12em;margin:0 0 6px}
  h3{font-weight:400}
  .sub{color:rgba(233,228,214,.6);font-size:14px;margin:0 0 24px}
  .card{border:1px solid rgba(233,228,214,.16);background:rgba(233,228,214,.02);padding:18px;margin:0 0 16px}
  label{display:block;font-size:13px;letter-spacing:.1em;color:rgba(233,228,214,.65);margin:14px 0 6px}
  input{height:50px;padding:0 14px;font-size:16px;color:#E9E4D6;background:rgba(233,228,214,.03);border:1px solid rgba(233,228,214,.2);border-radius:2px;outline:none}
  input:focus{border-color:#A98A4E;background:rgba(169,138,78,.06)}
  button{height:50px;padding:0 20px;font-size:16px;letter-spacing:.06em;color:#F5EBD6;background:#A33B2B;border:1px solid rgba(245,235,214,.15);border-radius:2px;cursor:pointer}
  button:hover{background:#BE4C39}
  button.ghost{background:transparent;color:rgba(233,228,214,.78);border-color:rgba(233,228,214,.2)}
  button.sm{height:36px;font-size:13px;padding:0 10px}
  .err{color:#E58A78;font-size:14px;margin:10px 0 0}
  .ok{color:#9DB0A6;font-size:14px;margin:10px 0 0}
  .row{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
  .cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin:0 0 18px}
  .stat{border:1px solid rgba(233,228,214,.14);padding:14px}
  .stat b{display:block;font-size:30px;font-weight:400;color:#CBA968;font-family:"Songti SC",serif}
  .stat span{font-size:12px;color:rgba(233,228,214,.55);letter-spacing:.08em}
  table{width:100%;border-collapse:collapse;font-size:14px}
  th,td{text-align:left;padding:9px 8px;border-bottom:1px solid rgba(233,228,214,.1);white-space:nowrap}
  th{font-size:12px;color:rgba(233,228,214,.5);font-weight:400;letter-spacing:.08em}
  .scroll{overflow-x:auto}
  .muted{color:rgba(233,228,214,.5);font-size:13px}
  .code{font-family:ui-monospace,Consolas,monospace;font-size:15px;color:#CBA968;letter-spacing:.12em}
  .bar{height:8px;background:rgba(169,138,78,.25);display:inline-block;vertical-align:middle}
  .login{max-width:420px;margin:12vh auto 0}
  a{color:#CBA968}
  a.tab{padding:6px 12px;border:1px solid rgba(233,228,214,.2);color:rgba(233,228,214,.7)}
  a.tab.on{border-color:#CBA968;color:#CBA968}
  .nameinput{width:110px;height:36px;font-size:13px}
  @media (max-width:640px){th,td{font-size:13px;padding:8px 6px}.wrap{padding:20px 14px 50px}h1{font-size:26px}}
`;

const page = (title, body) => `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · fatetell</title>
<style>${baseCss}</style></head>
<body><div class="wrap">${body}</div></body></html>`;

export function loginPage({ error = '', phone = '' } = {}) {
  return page('访问受限', `
    <div class="login">
      <h1>fatetell</h1>
      <p class="sub">这个站点只对受邀的人开放。请输入管理员给你的手机号和访问码。</p>
      <form method="post" action="/login">
        <label for="phone">手机号</label>
        <input id="phone" name="phone" inputmode="numeric" autocomplete="tel" maxlength="11" value="${esc(phone)}" placeholder="11 位手机号" required style="width:100%">
        <label for="code">访问码</label>
        <input id="code" name="code" inputmode="numeric" maxlength="6" placeholder="6 位数字" required style="width:100%">
        ${error ? `<p class="err">${esc(error)}</p>` : ''}
        <div class="row" style="margin-top:20px"><button type="submit" style="width:100%">进 入</button></div>
      </form>
      <p class="muted" style="margin-top:22px">没有访问码？联系把这个链接发给你的人。</p>
    </div>`);
}

const fmt = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export function adminPage({ today, snap, people, msg = '', adminKey, range = 14 }) {
  const maxViews = Math.max(1, ...snap.days.map((d) => d.views));
  const rows = snap.days.map((d) => `
    <tr><td>${esc(d.day.slice(5))}</td><td>${d.views}</td>
      <td><span class="bar" style="width:${Math.round((d.views / maxViews) * 120)}px"></span></td>
      <td>${d.calls}</td><td>${d.tokens.toLocaleString()}</td></tr>`).join('');

  const topViews = today.topViews.length
    ? today.topViews.map(([k, n]) => `<tr><td>${esc(k)}</td><td>${n}</td></tr>`).join('')
    : '<tr><td colspan="2" class="muted">今天还没有访问</td></tr>';

  const topEvents = today.topEvents.length
    ? today.topEvents.map(([k, n]) => `<tr><td>${esc(k)}</td><td>${n}</td></tr>`).join('')
    : '<tr><td colspan="2" class="muted">今天还没有点击</td></tr>';

  const models = Object.entries(today.models).length
    ? Object.entries(today.models).map(([k, m]) => `<tr><td>${esc(k)}</td><td>${m.calls}</td><td>${m.in.toLocaleString()}</td><td>${m.out.toLocaleString()}</td></tr>`).join('')
    : '<tr><td colspan="4" class="muted">今天还没有调用模型</td></tr>';

  const peopleRows = people.length
    ? people.map((p) => {
      const uToday = (today.users || {})[p.phone] || { views: 0, calls: 0 };
      const uAll = (snap.users || {})[p.phone] || { views: 0, calls: 0, tokens: 0 };
      return `
      <tr>
        <td>${esc(p.phone)}</td>
        <td>
          <form method="post" action="/admin/people/rename" class="row" style="gap:4px">
            <input class="nameinput" name="name" value="${esc(p.name)}" maxlength="20">
            <input type="hidden" name="phone" value="${esc(p.phone)}">
            <button class="ghost sm" type="submit">改名</button>
          </form>
        </td>
        <td class="code">${esc(p.code)}
          <form method="post" action="/admin/people/code" style="display:inline">
            <input type="hidden" name="phone" value="${esc(p.phone)}">
            <button class="ghost sm" type="submit" title="换一个访问码">换码</button>
          </form>
        </td>
        <td>${p.enabled ? '启用' : '<span class="muted">停用</span>'}</td>
        <td>${uToday.views} / ${uToday.calls}</td>
        <td>${uAll.views} / ${uAll.calls} / ${uAll.tokens.toLocaleString()}</td>
        <td class="muted">${fmt(p.lastSeen)}</td>
        <td>
          <form method="post" action="/admin/people/toggle" style="display:inline">
            <input type="hidden" name="phone" value="${esc(p.phone)}">
            <button class="ghost sm" type="submit">${p.enabled ? '停用' : '启用'}</button>
          </form>
          <form method="post" action="/admin/people/remove" style="display:inline" onsubmit="return confirm('确定移除？')">
            <input type="hidden" name="phone" value="${esc(p.phone)}">
            <button class="ghost sm" type="submit">移除</button>
          </form>
        </td>
      </tr>`;
    }).join('')
    : '<tr><td colspan="8" class="muted">还没有人。先在下面添加。</td></tr>';

  const tab = (n, label) => `<a class="tab ${range === n ? 'on' : ''}" href="/admin?range=${n}">近 ${label} 天</a>`;

  return page('监测后台', `
    <div class="row" style="justify-content:space-between">
      <div><h1>监测后台</h1><p class="sub">今天 ${esc(today.day)} · 数据在本机 data/stats.json</p></div>
      <div class="row"><a class="muted" href="/admin/export.csv">导出 CSV</a><a class="muted" href="/logout">退出</a></div>
    </div>
    ${msg ? `<p class="ok">${esc(msg)}</p>` : ''}

    <div class="cols">
      <div class="stat"><b>${today.views}</b><span>今日访问</span></div>
      <div class="stat"><b>${today.calls}</b><span>今日模型调用</span></div>
      <div class="stat"><b>${today.tokens.toLocaleString()}</b><span>今日 tokens</span></div>
      <div class="stat"><b>${people.length}</b><span>白名单人数</span></div>
    </div>

    <div class="card">
      <div class="row" style="justify-content:space-between;margin-bottom:10px">
        <h3 style="margin:0;font-size:16px">访问趋势</h3>
        <div class="row" style="gap:8px">${tab(7, 7)}${tab(14, 14)}${tab(30, 30)}</div>
      </div>
      <div class="scroll"><table><thead><tr><th>日期</th><th>访问</th><th></th><th>模型调用</th><th>tokens</th></tr></thead><tbody>${rows}</tbody></table></div>
    </div>

    <div class="cols">
      <div class="card" style="margin:0">
        <h3 style="margin:0 0 10px;font-size:16px">今日页面</h3>
        <div class="scroll"><table><tbody>${topViews}</tbody></table></div>
      </div>
      <div class="card" style="margin:0">
        <h3 style="margin:0 0 10px;font-size:16px">今日点击</h3>
        <div class="scroll"><table><tbody>${topEvents}</tbody></table></div>
      </div>
    </div>

    <div class="card">
      <h3 style="margin:0 0 10px;font-size:16px">今日模型</h3>
      <div class="scroll"><table><thead><tr><th>类型</th><th>次数</th><th>输入 tokens</th><th>输出 tokens</th></tr></thead><tbody>${models}</tbody></table></div>
    </div>

    <div class="card">
      <h3 style="margin:0 0 10px;font-size:16px">白名单</h3>
      <div class="scroll">
        <table>
          <thead><tr><th>手机号</th><th>称呼</th><th>访问码</th><th>状态</th><th>今日 访问/调用</th><th>累计 访问/调用/tokens</th><th>最近登录</th><th></th></tr></thead>
          <tbody>${peopleRows}</tbody>
        </table>
      </div>
      <form method="post" action="/admin/people/add" style="margin-top:18px">
        <div class="row">
          <input name="phone" placeholder="手机号" maxlength="11" style="flex:1;min-width:150px">
          <input name="name" placeholder="称呼（如：张阿姨）" style="flex:1;min-width:150px">
          <label style="margin:0;display:flex;align-items:center;gap:6px;font-size:14px"><input type="checkbox" name="admin" style="width:auto;height:auto"> 管理员</label>
          <button type="submit">添加</button>
        </div>
      </form>
      <p class="muted" style="margin-top:12px">把「手机号 + 访问码」发给对方即可。停用后立即进不来；换码后旧码作废。</p>
    </div>

    <p class="muted">后台地址带 key：/admin?key=${esc(adminKey || '')} —— 别外传。</p>`);
}
