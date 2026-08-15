const EmailTemplate = require('../../models/EmailTemplate');
const { getDefaultTemplate, listDefaultTemplates } = require('./defaults');
const logger = require('../logger');

function interpolate(str, vars = {}) {
  if (str == null) return '';
  return String(str).replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (Object.prototype.hasOwnProperty.call(vars, key) && vars[key] != null) {
      return String(vars[key]);
    }
    return '';
  });
}

function escapeHtml(text) {
  if (text == null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Merge DB row with code default. Falls back entirely to default if missing.
 */
function mergeTemplate(key, row) {
  const fallback = getDefaultTemplate(key);
  if (!fallback && !row) return null;
  const defaultMeta = fallback?.meta || null;
  if (!row) {
    return {
      ...fallback,
      meta: defaultMeta,
      isDefault: true,
      updated_at: null
    };
  }
  return {
    template_key: key,
    name: row.name || fallback?.name || key,
    category: row.category || fallback?.category || 'system',
    subject: row.subject || fallback?.subject || '',
    html_body: row.html_body || fallback?.html_body || '',
    text_body: row.text_body || fallback?.text_body || '',
    placeholders: row.placeholders || fallback?.placeholders || [],
    meta: row.meta != null ? row.meta : defaultMeta,
    updated_at: row.updated_at || null,
    isDefault: false
  };
}

async function getTemplate(key) {
  let row = null;
  try {
    row = await EmailTemplate.findByPk(key);
  } catch (err) {
    // Table may not exist yet — use defaults
    logger.warn(`[emailTemplates] getTemplate(${key}):`, { message: err.message });
  }
  return mergeTemplate(key, row ? row.toJSON() : null);
}

async function listTemplates() {
  const defaults = listDefaultTemplates();
  let rows = [];
  try {
    rows = await EmailTemplate.findAll();
  } catch (err) {
    logger.warn('[emailTemplates] listTemplates:', { message: err.message });
  }
  const byKey = Object.fromEntries(rows.map((r) => [r.template_key, r.toJSON()]));
  return defaults.map((d) => mergeTemplate(d.template_key, byKey[d.template_key] || null));
}

/**
 * @returns {{ subject: string, html: string, text: string, template_key: string }}
 */
async function renderTemplate(key, vars = {}) {
  const tpl = await getTemplate(key);
  if (!tpl) {
    throw new Error(`Unknown email template: ${key}`);
  }
  const mergedVars = {
    ...(tpl.meta && typeof tpl.meta === 'object' ? tpl.meta : {}),
    ...vars
  };
  // Prefer explicit courseName from meta when not overridden
  if (key === 'course_certificate' && !mergedVars.courseName) {
    mergedVars.courseName = 'Course';
  }
  return {
    template_key: key,
    subject: interpolate(tpl.subject, mergedVars),
    html: interpolate(tpl.html_body, mergedVars),
    text: interpolate(tpl.text_body, mergedVars)
  };
}

/**
 * Resolve the saved course name for certificate emails.
 */
async function getCertificateCourseName() {
  const tpl = await getTemplate('course_certificate');
  const fromMeta = tpl?.meta?.courseName;
  if (fromMeta && String(fromMeta).trim()) return String(fromMeta).trim();
  if (process.env.COURSE_NAME && String(process.env.COURSE_NAME).trim()) {
    return String(process.env.COURSE_NAME).trim();
  }
  return 'Front-End Course';
}

module.exports = {
  interpolate,
  escapeHtml,
  mergeTemplate,
  getTemplate,
  listTemplates,
  renderTemplate,
  getCertificateCourseName
};
