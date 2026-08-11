/**
 * Extract an 11-char YouTube video id from watch/share/shorts/embed URLs.
 */
export function extractYouTubeId(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const url = raw.trim();
  if (!url) return null;

  if (/^[\w-]{11}$/.test(url)) return url;

  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) {
      return u.pathname.replace(/^\//, '').split('/')[0] || null;
    }
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname.startsWith('/watch')) return u.searchParams.get('v');
      if (u.pathname.startsWith('/shorts/')) return u.pathname.split('/')[2] || null;
      if (u.pathname.startsWith('/live/')) return u.pathname.split('/')[2] || null;
      if (u.pathname.startsWith('/embed/')) return u.pathname.split('/')[2] || null;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Convert a YouTube watch/share/shorts URL into an embeddable URL.
 * Returns null if the input is not a recognizable YouTube link.
 */
export function toYouTubeEmbedUrl(raw) {
  const id = extractYouTubeId(raw);
  if (!id) return null;
  return `https://www.youtube.com/embed/${id}`;
}

export function courseAccessTokenKey(courseId) {
  return `course_access_token_${courseId}`;
}
