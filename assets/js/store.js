/* ==========================================================================
   store.js — 本机存档（localStorage）
   不上传任何数据；照片只留在草稿里，不写进批注簿。
   ========================================================================== */

const KEY = 'fatetell.v1';
const MAX_REPORTS = 24;

const blank = () => ({
  faceDraft: { answers: {}, photo: null },
  palmDraft: { answers: {}, photo: null },
  birth: null,
  reports: [],
});

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    const data = JSON.parse(raw);
    return { ...blank(), ...data, reports: Array.isArray(data.reports) ? data.reports : [] };
  } catch {
    return blank();
  }
}

let state = read();

function write() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // 空间不够时，舍弃最旧的批注再试一次
    state.reports = state.reports.slice(0, Math.max(2, state.reports.length - 6));
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* 只留内存态 */ }
  }
}

export const store = {
  get: () => state,
  patch(obj) {
    Object.assign(state, obj);
    write();
  },
  saveDraft(type, draft) {
    state[type === 'face' ? 'faceDraft' : 'palmDraft'] = draft;
    write();
  },
  addReport(rec) {
    const clean = { ...rec };
    if (clean.meta) {
      clean.meta = { ...clean.meta };
      delete clean.meta.photo;
    }
    state.reports.unshift(clean);
    if (state.reports.length > MAX_REPORTS) {
      state.reports.length = MAX_REPORTS;
      state._trimmed = true;
    }
    write();
    return clean;
  },
  latest(type) {
    return state.reports.find((r) => r.type === type) || null;
  },
  report(id) {
    return state.reports.find((r) => r.id === id) || null;
  },
  updateReport(id, patch) {
    const i = state.reports.findIndex((r) => r.id === id);
    if (i < 0) return null;
    state.reports[i] = { ...state.reports[i], ...patch };
    write();
    return state.reports[i];
  },
  remove(id) {
    state.reports = state.reports.filter((r) => r.id !== id);
    write();
  },
  takeTrimNotice() {
    if (!state._trimmed) return false;
    state._trimmed = false;
    write();
    return true;
  },
  clear() {
    state.reports = [];
    write();
  },
  clearAll() {
    state = blank();
    write();
  },
};
