/* ==========================================================================
   supervise.mjs — 单实例守护：本地服务 + 公网隧道
   用法：node server/supervise.mjs all
   日志：data/logs/{server,tunnel}.log（只有本进程写，避免多实例抢文件）
   ========================================================================== */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
const LOGS = path.join(DATA, 'logs');
const LOCK = path.join(DATA, 'supervise.lock');
const URL_FILE = path.join(DATA, 'current-url.txt');
fs.mkdirSync(LOGS, { recursive: true });

const MODE = process.argv[2] || 'all';

/* ---------- 单实例锁 ---------- */
function alreadyRunning() {
  try {
    const pid = Number(fs.readFileSync(LOCK, 'utf8').trim());
    if (!pid) return false;
    process.kill(pid, 0);
    return pid !== process.pid;
  } catch {
    return false;
  }
}

if (alreadyRunning()) {
  console.log('supervisor already running, exit.');
  process.exit(0);
}
fs.writeFileSync(LOCK, String(process.pid), 'utf8');

/* ---------- 读取 .env.cmd ---------- */
function loadEnv() {
  const file = path.join(ROOT, '.env.cmd');
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*set\s+([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
loadEnv();

const logStream = (name) => fs.createWriteStream(path.join(LOGS, `${name}.log`), { flags: 'a' });
const stamp = () => new Date().toISOString();

function run(name, command, args, { onLine } = {}) {
  const log = logStream(name);
  log.write(`\n[${stamp()}] start ${command} ${args.join(' ')}\n`);

  const child = spawn(command, args, {
    cwd: ROOT,
    env: process.env,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let buf = '';
  const handle = (chunk) => {
    const text = chunk.toString('utf8');
    log.write(text);
    if (!onLine) return;
    buf += text;
    const lines = buf.split(/\r?\n/);
    buf = lines.pop() || '';
    lines.forEach(onLine);
  };
  child.stdout.on('data', handle);
  child.stderr.on('data', handle);

  child.on('exit', (code, signal) => {
    log.write(`[${stamp()}] ${name} exited code=${code} signal=${signal}, restart in 3s\n`);
    setTimeout(() => run(name, command, args, { onLine }), 3000);
  });

  return child;
}

/* ---------- 服务 ---------- */
run('server', process.execPath, ['server/server.mjs', '--port', '5173', '--host', '0.0.0.0']);

/* ---------- 隧道 ---------- */
if (MODE === 'all' || MODE === 'tunnel') {
  const ssh = 'C:\\Windows\\System32\\OpenSSH\\ssh.exe';
  run('tunnel', ssh, [
    '-o', 'StrictHostKeyChecking=no',
    '-o', 'ServerAliveInterval=15',
    '-o', 'ServerAliveCountMax=4',
    '-o', 'TCPKeepAlive=yes',
    '-o', 'ExitOnForwardFailure=yes',
    '-R', '80:127.0.0.1:5173',
    'nokey@localhost.run',
  ], {
    onLine: (line) => {
      const m = line.match(/https:\/\/[a-z0-9]+\.lhr\.life/);
      if (m) {
        fs.writeFileSync(URL_FILE, m[0] + '\n', 'utf8');
        console.log('tunnel:', m[0]);
      }
    },
  });
}

const shutdown = () => {
  try { fs.unlinkSync(LOCK); } catch { /* ignore */ }
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('exit', () => { try { fs.unlinkSync(LOCK); } catch { /* ignore */ } });

console.log(`fatetell supervisor ${MODE} running, pid ${process.pid}`);
