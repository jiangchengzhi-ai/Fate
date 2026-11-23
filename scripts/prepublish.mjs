/* 发布前门禁：全量校验 + 离线包构建一致性。
   用法：npm run prepublish-check
   任一环节失败即以非零码退出，部署脚本 / 手动发布都应先过这一关。 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let fail = 0;
const run = (label, file) => {
  const r = spawnSync(process.execPath, [file], { cwd: ROOT, encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  if (r.status === 0) console.log(`✅ ${label}`);
  else { fail++; console.log(`❌ ${label}\n${out.split(/\r?\n/).slice(-14).join('\n')}`); }
};

console.log('== 1/2 全量校验 ==\n');
run('全量校验（15 项）', 'scripts/check.mjs');

console.log('\n== 2/2 离线包构建一致性 ==\n');
const offline = path.join(ROOT, 'fatetell-offline.html');
const before = fs.existsSync(offline) ? fs.statSync(offline).mtimeMs : 0;
run('重建离线包', 'scripts/build-offline.mjs');
const after = fs.existsSync(offline) ? fs.statSync(offline).mtimeMs : 0;
if (after <= before) { fail++; console.log('❌ 离线包未更新（mtime 未变化）'); }
else console.log(`✅ 离线包已重建（${(fs.statSync(offline).size / 1024).toFixed(0)} KB）`);

console.log(fail ? `\n发布门禁未通过：${fail} 项失败，禁止发布。` : '\n发布门禁通过，可以发布。');
process.exit(fail ? 1 : 0);
