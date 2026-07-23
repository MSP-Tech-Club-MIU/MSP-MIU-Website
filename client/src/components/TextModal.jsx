import React from 'react';
import { createPortal } from 'react-dom';

const TextModal = ({ expandedText, closeExpandedText }) => {
  if (!expandedText.field) return null;

  const fieldTitle = expandedText.field === 'skills' ? 'Skills' : 'Why Join MSP?';

  return createPortal(
    <div
      className="AdminPanel__modal RegAdmin__modal"
      onClick={closeExpandedText}
      role="presentation"
    >
      <div
        className="AdminPanel__modalContent RegAdmin__modalContent RegAdmin__modalContent--text"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reg-text-modal-title"
      >
        <div className="AdminPanel__modalHeader">
          <h3 id="reg-text-modal-title">{fieldTitle}</h3>
          <button
            type="button"
            className="AdminPanel__modalClose"
            onClick={closeExpandedText}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="RegAdmin__modalBodyText">
          {expandedText.text}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default TextModal;
