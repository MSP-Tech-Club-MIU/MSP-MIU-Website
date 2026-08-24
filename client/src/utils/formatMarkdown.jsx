import React from 'react';
import {
  MdFormatBold,
  MdFormatItalic,
  MdEventNote,
  MdLink,
  MdFormatListBulleted,
  MdVisibility,
  MdEdit
} from 'react-icons/md';
import './formatMarkdown.css';

/**
 * Event / Session details template that matches the highlighted format
 */
export const EVENT_DETAILS_TEMPLATE = `**Date:** ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
**Time:** 1:00–3:00 PM sharp
**Session:** Introduction to Cybersecurity
**Presented by:** MSP Cybersecurity Team`;

/**
 * Helper to check if a line is a key-value pair line like **Date:** 25/08/2026
 */
export function parseKeyValueLine(line) {
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
 * Renders inline markdown tokens (bold, italic, code, links) as React nodes
 */
export function renderInlineMarkdown(str) {
  if (!str) return null;

  // Simple token parser for **bold**, *italic*, `code`, and [link](url)
  // Split by markdown delimiters while keeping matches
  const regex = /(\*\*.*?\*\*|__.*?__|\*.*?\*|_.*?_|`.*?`|\[.*?\]\(https?:\/\/[^\s)]+\))/g;
  const parts = str.split(regex);

  return parts.map((part, index) => {
    if (!part) return null;

    // Bold: **text** or __text__
    if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
      const content = part.slice(2, -2);
      return <strong key={index} className="FormattedText__bold">{content}</strong>;
    }

    // Inline Code: `code`
    if (part.startsWith('`') && part.endsWith('`')) {
      const content = part.slice(1, -1);
      return <code key={index} className="FormattedText__code">{content}</code>;
    }

    // Markdown Link: [Label](url)
    const linkMatch = part.match(/^\[(.*?)\]\((https?:\/\/[^\s)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={index}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="FormattedText__link"
        >
          {linkMatch[1]}
        </a>
      );
    }

    // Italic: *text* or _text_
    if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
      const content = part.slice(1, -1);
      return <em key={index} className="FormattedText__italic">{content}</em>;
    }

    return part;
  });
}

/**
 * Render multi-line rich text with key-value highlight blocks, bullet lists, and paragraphs.
 */
export function FormattedText({ text, className = '' }) {
  if (!text) return null;
  const clean = String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!clean) return null;

  const blocks = clean.split(/\n\s*\n+/);

  return (
    <div className={`FormattedText ${className}`}>
      {blocks.map((block, bIdx) => {
        const rawLines = block.split('\n').map((l) => l.trim()).filter(Boolean);
        if (rawLines.length === 0) return null;

        // 1. Check if the entire block is a series of Key-Value items
        const keyValueItems = rawLines.map(parseKeyValueLine);
        const isKeyValueBlock = keyValueItems.every((item) => item !== null);

        if (isKeyValueBlock && keyValueItems.length > 0) {
          return (
            <div key={bIdx} className="FormattedText__kvCard">
              <table className="FormattedText__kvTable">
                <tbody>
                  {keyValueItems.map((item, idx) => (
                    <tr key={idx} className="FormattedText__kvRow">
                      <td className="FormattedText__kvKey">{item.key}:</td>
                      <td className="FormattedText__kvVal">{renderInlineMarkdown(item.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        // 2. Check if bullet list
        const isBulletList = rawLines.every((l) => /^[-*•]\s+/.test(l));
        if (isBulletList) {
          return (
            <ul key={bIdx} className="FormattedText__list">
              {rawLines.map((l, lIdx) => {
                const cleanItem = l.replace(/^[-*•]\s+/, '');
                return (
                  <li key={lIdx} className="FormattedText__listItem">
                    {renderInlineMarkdown(cleanItem)}
                  </li>
                );
              })}
            </ul>
          );
        }

        // 3. Regular paragraph
        return (
          <p key={bIdx} className="FormattedText__paragraph">
            {rawLines.map((line, lIdx) => {
              const kv = parseKeyValueLine(line);
              return (
                <React.Fragment key={lIdx}>
                  {lIdx > 0 && <br />}
                  {kv ? (
                    <>
                      <strong className="FormattedText__bold">{kv.key}:</strong>{' '}
                      {renderInlineMarkdown(kv.value)}
                    </>
                  ) : (
                    renderInlineMarkdown(line)
                  )}
                </React.Fragment>
              );
            })}
          </p>
        );
      })}
    </div>
  );
}

/**
 * Visual toolbar above email description/message textareas
 */
export function EmailComposerToolbar({
  onInsert,
  isPreview = false,
  onTogglePreview,
  disabled = false
}) {
  const insertBold = () => onInsert?.('**Bold Text**');
  const insertItalic = () => onInsert?.('*Italic Text*');
  const insertTemplate = () => onInsert?.(`\n${EVENT_DETAILS_TEMPLATE}\n`);
  const insertLink = () => onInsert?.('[Link Title](https://msp-miu.tech)');
  const insertList = () => onInsert?.('\n- First item\n- Second item\n- Third item\n');

  return (
    <div className="EmailComposerToolbar">
      <div className="EmailComposerToolbar__left">
        <button
          type="button"
          className="EmailComposerToolbar__btn"
          onClick={insertBold}
          disabled={disabled || isPreview}
          title="Bold (**text**)"
        >
          <MdFormatBold /> <span>Bold</span>
        </button>

        <button
          type="button"
          className="EmailComposerToolbar__btn"
          onClick={insertItalic}
          disabled={disabled || isPreview}
          title="Italic (*text*)"
        >
          <MdFormatItalic /> <span>Italic</span>
        </button>

        <button
          type="button"
          className="EmailComposerToolbar__btn EmailComposerToolbar__btn--highlight"
          onClick={insertTemplate}
          disabled={disabled || isPreview}
          title="Insert highlighted Event/Session details block"
        >
          <MdEventNote /> <span>Insert Event Details</span>
        </button>

        <button
          type="button"
          className="EmailComposerToolbar__btn"
          onClick={insertLink}
          disabled={disabled || isPreview}
          title="Insert Link [title](url)"
        >
          <MdLink /> <span>Link</span>
        </button>

        <button
          type="button"
          className="EmailComposerToolbar__btn"
          onClick={insertList}
          disabled={disabled || isPreview}
          title="Insert Bullet List"
        >
          <MdFormatListBulleted /> <span>List</span>
        </button>
      </div>

      {onTogglePreview && (
        <div className="EmailComposerToolbar__right">
          <button
            type="button"
            className={`EmailComposerToolbar__toggleBtn${isPreview ? ' is-preview' : ''}`}
            onClick={onTogglePreview}
            title={isPreview ? 'Switch back to editor' : 'Preview formatted email output'}
          >
            {isPreview ? (
              <>
                <MdEdit style={{ marginRight: 4 }} /> Edit
              </>
            ) : (
              <>
                <MdVisibility style={{ marginRight: 4 }} /> Live Preview
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
