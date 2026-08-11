/**
 * Convert a YouTube watch/share/shorts URL into an embeddable URL.
 * Returns null if the input is not a recognizable YouTube link.
 */
export function toYouTubeEmbedUrl(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const url = raw.trim();
  if (!url) return null;

  // Already embed
  if (/youtube\.com\/embed\//i.test(url)) {
    return url.split('?')[0];
  }

  let id = null;
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) {
      id = u.pathname.replace(/^\//, '').split('/')[0];
    } else if (u.hostname.includes('youtube.com')) {
      if (u.pathname.startsWith('/watch')) {
        id = u.searchParams.get('v');
      } else if (u.pathname.startsWith('/shorts/')) {
        id = u.pathname.split('/')[2];
      } else if (u.pathname.startsWith('/live/')) {
        id = u.pathname.split('/')[2];
      }
    }
  } catch {
    // plain id?
    if (/^[\w-]{11}$/.test(url)) id = url;
  }

  if (!id) return null;
  return `https://www.youtube.com/embed/${id}`;
}

export function courseAccessTokenKey(courseId) {
  return `course_access_token_${courseId}`;
}
