/**
 * Helpers for task_quiz reference assets (R2 URLs and safe display).
 */

export function safeTaskAssetUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const s = url.trim();
  if (!/^https?:\/\//i.test(s)) return null;
  return s;
}

/** R2 public object URL; strips leading "=" from env/key (e.g. .env KEY==https…). */
export function buildR2PublicObjectUrl(r2Key) {
  if (!r2Key || typeof r2Key !== 'string') return null;
  let key = String(r2Key).trim().replace(/^=+/, '').replace(/^\/+/, '');
  if (!key) return null;
  if (/^https?:\/\//i.test(key)) {
    return key;
  }
  let base = String(import.meta.env.VITE_R2_PUBLIC_DOMAIN || '')
    .trim()
    .replace(/^=+/, '')
    .replace(/\/+$/, '');
  if (!base) return null;
  if (!/^https?:\/\//i.test(base)) {
    base = `https://${base.replace(/^\/+/, '')}`;
  }
  return `${base}/${key}`;
}

/** Safe basename for Content-Disposition / anchor download= (no path separators). */
export function sanitizeDownloadBasename(name, { maxLen = 120, fallback = 'submission' } = {}) {
  if (!name || typeof name !== 'string') return fallback;
  let s = name
    .trim()
    .replace(/[\u0000-\u001f<>:"/\\|?*]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return fallback;
  s = s.replace(/\.zip$/i, '');
  if (s.length > maxLen) s = s.slice(0, maxLen).trim();
  return s || fallback;
}

/** Safe href for opening a live demo (schemeless hosts get https://). */
export function normalizeLiveDemoOpenUrl(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let u = raw.trim().replace(/^=+/, '');
  if (!u) return null;
  const lower = u.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:')) return null;
  if (!/^https?:\/\//i.test(u)) {
    if (/^\/\//.test(u)) u = `https:${u}`;
    else u = `https://${u.replace(/^\/+/, '')}`;
  }
  try {
    new URL(u);
  } catch {
    return null;
  }
  return u;
}

/** iframe src: https always; http only when the app is on http (avoids mixed content). */
export function normalizeLiveDemoEmbedUrl(raw) {
  const u = normalizeLiveDemoOpenUrl(raw);
  if (!u) return null;
  if (/^https:\/\//i.test(u)) return u;
  if (/^http:\/\//i.test(u)) {
    if (typeof window !== 'undefined' && window.location.protocol === 'http:') return u;
    return null;
  }
  return null;
}

export function liveDemoHttpEmbedBlocked(raw) {
  const open = normalizeLiveDemoOpenUrl(raw);
  const embed = normalizeLiveDemoEmbedUrl(raw);
  return Boolean(open && !embed && /^http:\/\//i.test(open));
}

/** @returns {'image'|'pdf'|'video'|'file'|null} */
export function taskQuizAssetKind(url) {
  const safe = safeTaskAssetUrl(url);
  if (!safe) return null;
  let pathname = '';
  try {
    pathname = new URL(safe).pathname.toLowerCase();
  } catch {
    return 'file';
  }
  if (/\.(jpe?g|png|gif|webp|svg)(\?|$)/i.test(pathname)) return 'image';
  if (/\.pdf(\?|$)/i.test(pathname)) return 'pdf';
  if (/\.(mp4|webm)(\?|$)/i.test(pathname)) return 'video';
  return 'file';
}
