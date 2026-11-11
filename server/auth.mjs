/* ==========================================================================
   auth.mjs — 手机号白名单 + 会话
   数据：data/access.json（白名单）、data/secret（签名密钥）
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
const ACCESS = path.join(DATA, 'access.json');
const SECRET_FILE = path.join(DATA, 'secret');

const ensure = () => {
  fs.mkdirSync(DATA, { recursive: true });
  if (!fs.existsSync(SECRET_FILE)) {
    fs.writeFileSync(SECRET_FILE, crypto.randomBytes(32).toString('hex'), 'utf8');
  }
};

const readJson = (p, fallback) => {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; }
};

const writeJson = (p, v) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(v, null, 2) + '\n');
};

const blank = () => ({ people: [] });

export function loadAccess() {
  ensure();
  const data = readJson(ACCESS, blank());
  if (!Array.isArray(data.people)) data.people = [];
  return data;
}

export function saveAccess(data) {
  ensure();
  writeJson(ACCESS, data);
}

export function listPeople() {
  return loadAccess().people;
}

export function addPerson({ phone, name, admin = false }) {
  const data = loadAccess();
  const trimmed = String(phone || '').replace(/\s+/g, '');
  if (!/^1\d{10}$/.test(trimmed)) return { error: '手机号要是 11 位，以 1 开头' };
  if (data.people.some((p) => p.phone === trimmed)) return { error: '这个手机号已经在名单里' };
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const person = { phone: trimmed, name: String(name || '').slice(0, 20) || '未命名', code, admin: Boolean(admin), enabled: true, createdAt: new Date().toISOString(), lastSeen: null };
  data.people.push(person);
  saveAccess(data);
  return { person };
}

export function removePerson(phone) {
  const data = loadAccess();
  const before = data.people.length;
  data.people = data.people.filter((p) => p.phone !== phone);
  saveAccess(data);
  return before !== data.people.length;
}

export function setEnabled(phone, enabled) {
  const data = loadAccess();
  const p = data.people.find((x) => x.phone === phone);
  if (!p) return false;
  p.enabled = Boolean(enabled);
  saveAccess(data);
  return true;
}

export function regenerateCode(phone) {
  const data = loadAccess();
  const p = data.people.find((x) => x.phone === phone);
  if (!p) return null;
  p.code = String(Math.floor(100000 + Math.random() * 900000));
  saveAccess(data);
  return p.code;
}

export function renamePerson(phone, name) {
  const data = loadAccess();
  const p = data.people.find((x) => x.phone === phone);
  if (!p) return false;
  p.name = String(name || '').slice(0, 20) || p.name;
  saveAccess(data);
  return true;
}

export function verifyPerson(phone, code) {
  const p = loadAccess().people.find((x) => x.phone === String(phone || '').trim());
  if (!p || !p.enabled) return null;
  if (String(code || '').trim() !== p.code) return null;
  p.lastSeen = new Date().toISOString();
  const data = loadAccess();
  const target = data.people.find((x) => x.phone === p.phone);
  if (target) { target.lastSeen = p.lastSeen; saveAccess(data); }
  return { phone: p.phone, name: p.name, admin: Boolean(p.admin) };
}

export function touchLastSeen(phone) {
  const data = loadAccess();
  const p = data.people.find((x) => x.phone === phone);
  if (!p) return;
  p.lastSeen = new Date().toISOString();
  saveAccess(data);
}

const secret = () => {
  ensure();
  return fs.readFileSync(SECRET_FILE, 'utf8').trim();
};

const sign = (payload) => crypto.createHmac('sha256', secret()).update(payload).digest('base64url');

const encode = (obj) => Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url');
const decode = (str) => {
  try { return JSON.parse(Buffer.from(str, 'base64url').toString('utf8')); } catch { return null; }
};

export const SESSION_DAYS = 30;

export function makeSession({ phone, name, admin }) {
  const payload = encode({ phone, name, admin: Boolean(admin), exp: Date.now() + SESSION_DAYS * 864e5 });
  return `${payload}.${sign(payload)}`;
}

export function parseCookies(req) {
  const raw = req.headers.cookie || '';
  const out = {};
  raw.split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

export function readSession(req) {
  return readToken(req, 'ft_session');
}

export function readAdmin(req) {
  return readToken(req, 'ft_admin');
}

function readToken(req, name) {
  const token = parseCookies(req)[name];
  if (!token || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  if (sign(payload) !== sig) return null;
  const data = decode(payload);
  if (!data || !data.phone || !data.exp || data.exp < Date.now()) return null;
  return data;
}

export function cookie(name, value, { days = SESSION_DAYS, path: p = '/' } = {}) {
  const maxAge = Math.floor(days * 86400);
  return `${name}=${encodeURIComponent(value)}; Path=${p}; Max-Age=${maxAge}; HttpOnly; SameSite=Lax`;
}

export function clearCookie(name) {
  return `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
}

export function adminToken() {
  ensure();
  if (process.env.FATETELL_ADMIN_TOKEN) return process.env.FATETELL_ADMIN_TOKEN;
  const file = path.join(DATA, 'admin-token');
  if (!fs.existsSync(file)) fs.writeFileSync(file, crypto.randomBytes(16).toString('hex'), 'utf8');
  return fs.readFileSync(file, 'utf8').trim();
}

export function verifyAdminKey(key) {
  const token = adminToken();
  if (!key || !token) return false;
  const a = Buffer.from(String(key));
  const b = Buffer.from(token);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function hasPeople() {
  return loadAccess().people.length > 0;
}
