/**
 * HMAC-signed unsubscribe tokens for marketing email opt-out.
 */
const crypto = require('crypto');

function getUnsubscribeSecret() {
  return (
    process.env.EMAIL_UNSUBSCRIBE_SECRET ||
    process.env.JWT_SECRET ||
    'msp-miu-email-unsubscribe-dev'
  );
}

function getPublicApiBase() {
  const raw =
    process.env.API_PUBLIC_URL ||
    process.env.BACKEND_URL ||
    process.env.WEBSITE_URL ||
    process.env.FRONTEND_URL ||
    'https://msp-miu.tech';
  return String(raw).replace(/\/$/, '').replace(/\/api$/i, '') + '/api';
}

/**
 * @param {number|string} userId
 * @param {string} email
 * @returns {string}
 */
function createUnsubscribeToken(userId, email) {
  const payload = Buffer.from(
    JSON.stringify({
      u: Number(userId),
      e: String(email || '').trim().toLowerCase()
    }),
    'utf8'
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', getUnsubscribeSecret())
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

/**
 * @param {string} token
 * @returns {{ userId: number, email: string } | null}
 */
function verifyUnsubscribeToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = crypto
    .createHmac('sha256', getUnsubscribeSecret())
    .update(payload)
    .digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    const userId = Number(data.u);
    const email = String(data.e || '').trim().toLowerCase();
    if (!Number.isFinite(userId) || userId < 1 || !email.includes('@')) return null;
    return { userId, email };
  } catch {
    return null;
  }
}

/**
 * @param {number|string} userId
 * @param {string} email
 * @returns {string}
 */
function buildUnsubscribeUrl(userId, email) {
  const token = createUnsubscribeToken(userId, email);
  return `${getPublicApiBase()}/email/unsubscribe?token=${encodeURIComponent(token)}`;
}

module.exports = {
  createUnsubscribeToken,
  verifyUnsubscribeToken,
  buildUnsubscribeUrl,
  getPublicApiBase
};
