/**
 * Helpers for task_quiz reference assets (R2 URLs and safe display).
 */

export function safeTaskAssetUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const s = url.trim();
  if (!/^https?:\/\//i.test(s)) return null;
  return s;
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
