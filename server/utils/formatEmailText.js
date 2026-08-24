/**
 * Utility for formatting email body and markdown text into email-safe, high-contrast HTML.
 * Handles key-value highlight blocks (e.g. **Date:** 25/08/2026), WhatsApp group links, bold, italic, lists, and links.
 */

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
 * Format inline markdown safely (after HTML escaping)
 */
function formatInlineMarkdown(str) {
  if (!str) return '';
  let escaped = escapeHtml(str);

  // Bold: **text** or __text__
  escaped = escaped.replace(/\*\*(.+?)\*\*/g, '<strong style="color: #031C35; font-weight: 700;">$1</strong>');
  escaped = escaped.replace(/__(.+?)__/g, '<strong style="color: #031C35; font-weight: 700;">$1</strong>');

  // Italic: *text* or _text_
  escaped = escaped.replace(/(^|[^*])\*([^*]+)\*([^*]|$)/g, '$1<em>$2</em>$3');
  escaped = escaped.replace(/(^|[^_])_([^_]+)_([^_]|$)/g, '$1<em>$2</em>$3');

  // Inline code: `code`
  escaped = escaped.replace(/`([^`]+)`/g, '<code style="background-color: rgba(3, 169, 244, 0.1); color: #0d7bd8; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 13px;">$1</code>');

  // Markdown links: [Label](url)
  escaped = escaped.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (match, label, url) => {
    // Special WhatsApp styling if WhatsApp group link
    if (url.includes('chat.whatsapp.com')) {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #25D366; font-weight: 700; text-decoration: underline;">${label}</a>`;
    }
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #0d7bd8; text-decoration: underline; font-weight: 600;">${label}</a>`;
  });

  return escaped;
}

/**
 * Check if a line is a key-value format line like:
 * **Date:** 25/08/2026  or  **Time:** 1:00 PM  or  **Presented by:** Team
 */
function parseKeyValueLine(line) {
  const match = line.match(/^\*\*([^*:]+):\*\*\s*(.*)$/);
  if (match) {
    return {
      key: match[1].trim(),
      value: match[2].trim()
    };
  }
  return null;
}

/**
 * Smart pre-processor to normalize inline pasted blocks into structured lines:
 * - Separates inline **Date:** ... **Time:** ... into distinct lines
 * - Separates instructions and sign-offs into distinct paragraphs
 */
function normalizeEmailText(raw) {
  let text = String(raw || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

  // 1. Separate consecutive inline key-values like **Date:** ... **Time:** ...
  text = text.replace(/([^\n])\s*\*\*(Date|Time|Session|Presented by|Location|Speaker|Topic|Instructor|Room|Platform|Prerequisites):\*\*\s*/gi, '$1\n\n**$2:** ');

  // 2. Separate notes and instructions that follow a key-value row
  text = text.replace(/(\*\*[A-Za-z\s]+:\*\*[^\n]+?)\s+(Please note|Note:|Important:|Don't forget|Make sure|The meeting link|Meeting link)/gi, '$1\n\n$2');

  // 3. Separate sign-offs
  text = text.replace(/\s*(See you soon!?|Best regards,?\s*|Sincerely,?\s*|Cheers,?\s*)\s*\*\*/gi, '\n\n$1\n**');

  return text;
}

/**
 * Convert plain text / markdown description into styled email HTML.
 *
 * @param {string} rawText - Raw input text from the admin composer
 * @returns {string} Clean, responsive HTML markup for email templates
 */
function formatEmailBodyHtml(rawText) {
  if (!rawText) return '';
  const text = normalizeEmailText(rawText);
  if (!text) return '';

  // Split into block chunks by double newlines
  const blocks = text.split(/\n\s*\n+/);

  const htmlBlocks = blocks.map((block) => {
    const rawLines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (rawLines.length === 0) return '';

    // 1. Check if the entire block is a series of Key-Value items
    const keyValueItems = rawLines.map(parseKeyValueLine);
    const isKeyValueBlock = keyValueItems.every((item) => item !== null);

    if (isKeyValueBlock && keyValueItems.length > 0) {
      const rowsHtml = keyValueItems
        .map((item, idx) => {
          const isLast = idx === keyValueItems.length - 1;
          const borderStyle = isLast ? '' : 'border-bottom: 1px solid #eef4fc;';
          return `<tr>
            <td style="padding: 10px 14px; font-weight: 700; color: #031C35; font-size: 14px; width: 36%; vertical-align: top; background-color: #f8fbfe; ${borderStyle}">
              ${escapeHtml(item.key)}:
            </td>
            <td style="padding: 10px 14px; color: #333333; font-size: 14px; vertical-align: top; ${borderStyle}">
              ${formatInlineMarkdown(item.value)}
            </td>
          </tr>`;
        })
        .join('');

      return `<div style="margin: 16px 0; background-color: #ffffff; border-radius: 8px; border: 1px solid #d0e3f7; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: separate; border-spacing: 0;">
          ${rowsHtml}
        </table>
      </div>`;
    }

    // 2. Check if this block contains a WhatsApp Group link callout
    const fullBlockText = rawLines.join(' ');
    const waMatch = fullBlockText.match(/https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9?=&_\-]+/);
    if (waMatch) {
      const waUrl = waMatch[0];
      return `<div style="margin: 16px 0; padding: 14px 18px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #25D366; border-radius: 8px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="vertical-align: middle;">
              <p style="margin: 0 0 4px; font-weight: 700; color: #166534; font-size: 14px;">💬 Course WhatsApp Group</p>
              <p style="margin: 0; font-size: 13px; color: #15803d; line-height: 1.4;">Join for instant session updates and live meeting links.</p>
            </td>
            <td align="right" style="vertical-align: middle; padding-left: 12px;">
              <a href="${escapeHtml(waUrl)}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 10px 18px; background-color: #25D366; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 13px; white-space: nowrap; box-shadow: 0 2px 6px rgba(37,211,102,0.3);">Join WhatsApp</a>
            </td>
          </tr>
        </table>
      </div>`;
    }

    // 3. Check if bullet list
    const isBulletList = rawLines.every((l) => /^[-*•]\s+/.test(l));
    if (isBulletList) {
      const itemsHtml = rawLines
        .map((l) => {
          const cleanItem = l.replace(/^[-*•]\s+/, '');
          return `<li style="margin-bottom: 6px; color: #333333; font-size: 15px; line-height: 1.6;">${formatInlineMarkdown(cleanItem)}</li>`;
        })
        .join('');
      return `<ul style="margin: 12px 0 16px 20px; padding: 0;">${itemsHtml}</ul>`;
    }

    // 4. Check if numbered list
    const isNumberedList = rawLines.every((l) => /^\d+\.\s+/.test(l));
    if (isNumberedList) {
      const itemsHtml = rawLines
        .map((l) => {
          const cleanItem = l.replace(/^\d+\.\s+/, '');
          return `<li style="margin-bottom: 6px; color: #333333; font-size: 15px; line-height: 1.6;">${formatInlineMarkdown(cleanItem)}</li>`;
        })
        .join('');
      return `<ol style="margin: 12px 0 16px 20px; padding: 0;">${itemsHtml}</ol>`;
    }

    // 5. Regular paragraph: format inline markdown and handle single newlines as <br/>
    const renderedLines = rawLines.map((line) => {
      const kv = parseKeyValueLine(line);
      if (kv) {
        return `<strong style="color: #031C35; font-weight: 700;">${escapeHtml(kv.key)}:</strong> ${formatInlineMarkdown(kv.value)}`;
      }
      return formatInlineMarkdown(line);
    }).join('<br/>');

    return `<p style="margin: 0 0 14px 0; color: #333333; font-size: 15px; line-height: 1.65;">${renderedLines}</p>`;
  });

  return htmlBlocks.filter(Boolean).join('');
}

module.exports = {
  escapeHtml,
  formatInlineMarkdown,
  parseKeyValueLine,
  normalizeEmailText,
  formatEmailBodyHtml
};
