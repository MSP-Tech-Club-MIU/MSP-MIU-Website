const fs = require('fs');
const path = require('path');
const { resolveSeoForPath, applyMetaToHtml } = require('../utils/seo');
const logger = require('../utils/logger');

const INDEX_PATH = path.join(__dirname, '..', '..', 'client', 'public', 'index.html');

let cachedHtml = null;
let cachedAt = 0;
const CACHE_MS = process.env.NODE_ENV === 'production' ? 30_000 : 0;

function readIndexHtml() {
  const now = Date.now();
  if (cachedHtml && now - cachedAt < CACHE_MS) return cachedHtml;
  cachedHtml = fs.readFileSync(INDEX_PATH, 'utf8');
  cachedAt = now;
  return cachedHtml;
}

async function sendSeoSpa(req, res) {
  try {
    const seo = await resolveSeoForPath(req.path);
    const html = readIndexHtml();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    return res.send(applyMetaToHtml(html, seo));
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      logger.error('[seo] Missing client/public/index.html — run npm run build');
      return res.status(503).type('text/plain').send('Frontend build is missing');
    }
    logger.error('[seo] SPA render failed:', err);
    return res.sendFile(INDEX_PATH);
  }
}

module.exports = { sendSeoSpa };
