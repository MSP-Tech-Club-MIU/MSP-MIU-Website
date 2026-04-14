/** All quiz schedule fields are stored as UTC; we display them in Egypt (Africa/Cairo). */
export const QUIZ_DISPLAY_TZ = 'Africa/Cairo';

export function formatQuizDateTimeCairo(iso) {
  if (!iso) return 'N/A';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'N/A';
  const formatted = new Intl.DateTimeFormat('en-GB', {
    timeZone: QUIZ_DISPLAY_TZ,
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(d);
  return `${formatted} (Cairo)`;
}

/** Split instant into date / time strings for admin inputs (Cairo wall clock). */
export function toCairoDateAndTimeStrings(iso) {
  if (!iso) return { date: '', time: '' };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: '', time: '' };
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: QUIZ_DISPLAY_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const parts = Object.fromEntries(fmt.formatToParts(d).map((p) => [p.type, p.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`
  };
}
