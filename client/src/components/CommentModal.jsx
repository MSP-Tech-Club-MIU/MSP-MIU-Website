import React from 'react';
import { createPortal } from 'react-dom';

const CommentModal = ({ commentModal, setCommentModal, closeCommentModal, saveComment, textareaRef }) => {
  if (!commentModal.isOpen) return null;

  return createPortal(
    <div
      className="AdminPanel__modal RegAdmin__modal"
      onClick={closeCommentModal}
      role="presentation"
    >
      <div
        className="AdminPanel__modalContent RegAdmin__modalContent"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reg-comment-modal-title"
      >
        <div className="AdminPanel__modalHeader">
          <h3 id="reg-comment-modal-title">
            Interview Comment — {commentModal.application?.full_name}
          </h3>
          <button
            type="button"
            className="AdminPanel__modalClose"
            onClick={closeCommentModal}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="AdminPanel__formGroup">
          <textarea
            ref={textareaRef}
            value={commentModal.comment}
            onChange={(e) => setCommentModal((prev) => ({ ...prev, comment: e.target.value }))}
            placeholder="Enter interview comment here..."
            rows={8}
          />
        </div>
        <div className="AdminPanel__modalActions">
          <button
            type="button"
            className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
            onClick={closeCommentModal}
          >
            Cancel
          </button>
          <button
            type="button"
            className="AdminPanel__modalBtn AdminPanel__modalBtn--primary"
            onClick={saveComment}
          >
            Save Comment
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CommentModal;
