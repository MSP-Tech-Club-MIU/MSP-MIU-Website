const { SiteContent } = require('../models');
const { ALLOWED_KEYS, getDefault } = require('../utils/siteContentDefaults');

async function ensureKey(key) {
  let row = await SiteContent.findByPk(key);
  if (!row) {
    row = await SiteContent.create({
      content_key: key,
      content_value: getDefault(key)
    });
  }
  return row;
}

/**
 * GET /site-content — all keys (public)
 * GET /site-content?keys=hero,footer — subset
 */
const getAllSiteContent = async (req, res) => {
  try {
    let keys = ALLOWED_KEYS;
    if (req.query.keys) {
      keys = String(req.query.keys)
        .split(',')
        .map((k) => k.trim())
        .filter((k) => ALLOWED_KEYS.includes(k));
    }

    const data = {};
    for (const key of keys) {
      try {
        const row = await ensureKey(key);
        data[key] = row.content_value;
      } catch (err) {
        // Table may not exist yet — serve defaults so the public site still loads
        console.warn(`site-content fallback for ${key}:`, err.message);
        data[key] = getDefault(key);
      }
    }

    return res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching site content:', error);
    // Last resort: all defaults
    const data = {};
    const keys = req.query.keys
      ? String(req.query.keys).split(',').map((k) => k.trim()).filter((k) => ALLOWED_KEYS.includes(k))
      : ALLOWED_KEYS;
    for (const key of keys) data[key] = getDefault(key);
    return res.json({ success: true, data, fallback: true });
  }
};

/**
 * GET /site-content/:key
 */
const getSiteContentByKey = async (req, res) => {
  try {
    const { key } = req.params;
    if (!ALLOWED_KEYS.includes(key)) {
      return res.status(404).json({ success: false, error: `Unknown content key: ${key}` });
    }
    const row = await ensureKey(key);
    return res.json({
      success: true,
      data: { key, value: row.content_value, updated_at: row.updated_at }
    });
  } catch (error) {
    console.error('Error fetching site content key:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch site content' });
  }
};

/**
 * PUT /site-content/:key — admin/board
 * Body: { value: ... } or raw JSON body as the value
 */
const updateSiteContent = async (req, res) => {
  try {
    const { key } = req.params;
    if (!ALLOWED_KEYS.includes(key)) {
      return res.status(404).json({ success: false, error: `Unknown content key: ${key}` });
    }

    const value = req.body?.value !== undefined ? req.body.value : req.body;
    if (value === undefined || value === null || typeof value !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Request body must be a JSON object (or { value: object })'
      });
    }

    const [row] = await SiteContent.upsert({
      content_key: key,
      content_value: value,
      updated_at: new Date()
    });

    const fresh = row || (await SiteContent.findByPk(key));

    return res.json({
      success: true,
      data: { key, value: fresh.content_value, updated_at: fresh.updated_at }
    });
  } catch (error) {
    console.error('Error updating site content:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to update site content' });
  }
};

/**
 * POST /site-content/:key/reset — restore default
 */
const resetSiteContent = async (req, res) => {
  try {
    const { key } = req.params;
    if (!ALLOWED_KEYS.includes(key)) {
      return res.status(404).json({ success: false, error: `Unknown content key: ${key}` });
    }
    const value = getDefault(key);
    await SiteContent.upsert({
      content_key: key,
      content_value: value,
      updated_at: new Date()
    });
    return res.json({ success: true, data: { key, value } });
  } catch (error) {
    console.error('Error resetting site content:', error);
    return res.status(500).json({ success: false, error: 'Failed to reset site content' });
  }
};

module.exports = {
  getAllSiteContent,
  getSiteContentByKey,
  updateSiteContent,
  resetSiteContent,
  ALLOWED_KEYS
};
