import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  MdEmail,
  MdSend,
  MdStar,
  MdStarBorder,
  MdDelete,
  MdDeleteOutline,
  MdDrafts,
  MdAttachFile,
  MdClose,
  MdSearch,
  MdRefresh,
  MdOpenInFull,
  MdCloseFullscreen,
  MdMinimize,
  MdFormatBold,
  MdFormatItalic,
  MdFormatUnderlined,
  MdFormatListBulleted,
  MdFormatListNumbered,
  MdInsertLink,
  MdCode,
  MdArrowBack,
  MdFileDownload,
  MdDescription,
  MdImage,
  MdFolderZip,
  MdCheckCircle,
  MdError,
  MdChevronLeft,
  MdChevronRight,
  MdRestore,
  MdCleaningServices
} from 'react-icons/md';
import ApiService from '../../services/api';
import './WebmailAdminTab.css';

// Helper to format file size
function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Helper to format date
function formatEmailDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  const isThisYear = date.getFullYear() === now.getFullYear();
  if (isThisYear) {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
}

// Helper for attachment icon
function getAttachmentIcon(filename) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
    return <MdImage className="Webmail__attIcon" />;
  }
  if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) {
    return <MdFolderZip className="Webmail__attIcon" />;
  }
  return <MdDescription className="Webmail__attIcon" />;
}

export default function WebmailAdminTab({ onAlert }) {
  // Folder & navigation
  const [currentFolder, setCurrentFolder] = useState('sent');
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ sent: 0, starred: 0, drafts: 0, trash: 0 });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'attachments'

  // Selected email for detail view
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // SMTP Server status
  const [smtpStatus, setSmtpStatus] = useState(null);

  // Composer state
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerMinimized, setComposerMinimized] = useState(false);
  const [composerMaximized, setComposerMaximized] = useState(false);

  const [toChips, setToChips] = useState([]);
  const [toInput, setToInput] = useState('');
  const [ccChips, setCcChips] = useState([]);
  const [ccInput, setCcInput] = useState('');
  const [bccChips, setBccChips] = useState([]);
  const [bccInput, setBccInput] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Autocomplete contacts
  const [suggestions, setSuggestions] = useState([]);
  const [activeField, setActiveField] = useState('to'); // 'to' | 'cc' | 'bcc'
  const fileInputRef = useRef(null);
  const bodyTextareaRef = useRef(null);

  // Total size of attachments
  const totalAttachmentBytes = useMemo(() => {
    return attachments.reduce((acc, f) => acc + (f.size || 0), 0);
  }, [attachments]);

  // Fetch SMTP status once
  useEffect(() => {
    ApiService.getMailStatus()
      .then((status) => setSmtpStatus(status))
      .catch(() => setSmtpStatus(null));
  }, []);

  // Fetch emails
  const fetchEmails = useCallback(async (quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      const res = await ApiService.listDirectEmails({
        folder: currentFolder,
        search: searchQuery,
        page,
        limit: 25
      });
      setEmails(res.emails || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
      if (res.counts) setCounts(res.counts);
    } catch (err) {
      if (!quiet) {
        onAlert?.({ type: 'error', message: err.message || 'Failed to fetch emails' });
      }
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [currentFolder, searchQuery, page, onAlert]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  // Autocomplete contact search
  const handleRecipientInput = async (val, field) => {
    if (field === 'to') setToInput(val);
    else if (field === 'cc') setCcInput(val);
    else if (field === 'bcc') setBccInput(val);
    setActiveField(field);

    if (val.trim().length >= 2) {
      try {
        const list = await ApiService.searchMailRecipients(val.trim());
        setSuggestions(list || []);
      } catch (_) {
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
    }
  };

  const addRecipientChip = (email, field = 'to') => {
    const cleanEmail = String(email || '').trim().replace(/[,;]/g, '');
    if (!cleanEmail) return;

    if (field === 'to') {
      if (!toChips.includes(cleanEmail)) setToChips((prev) => [...prev, cleanEmail]);
      setToInput('');
    } else if (field === 'cc') {
      if (!ccChips.includes(cleanEmail)) setCcChips((prev) => [...prev, cleanEmail]);
      setCcInput('');
    } else if (field === 'bcc') {
      if (!bccChips.includes(cleanEmail)) setBccChips((prev) => [...prev, cleanEmail]);
      setBccInput('');
    }
    setSuggestions([]);
  };

  const removeChip = (index, field) => {
    if (field === 'to') setToChips((prev) => prev.filter((_, i) => i !== index));
    else if (field === 'cc') setCcChips((prev) => prev.filter((_, i) => i !== index));
    else if (field === 'bcc') setBccChips((prev) => prev.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e, field) => {
    const val = field === 'to' ? toInput : field === 'cc' ? ccInput : bccInput;
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      if (val.trim()) {
        addRecipientChip(val, field);
      }
    } else if (e.key === 'Backspace' && !val) {
      const list = field === 'to' ? toChips : field === 'cc' ? ccChips : bccChips;
      if (list.length > 0) {
        removeChip(list.length - 1, field);
      }
    }
  };

  // Attachments handler
  const handleFilesSelected = (fileList) => {
    if (!fileList || fileList.length === 0) return;
    const newFiles = Array.from(fileList);
    setAttachments((prev) => [...prev, ...newFiles]);
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Send Email Handler
  const handleSendEmail = async () => {
    // If user has pending text in toInput, add it first
    let allTo = [...toChips];
    if (toInput.trim()) {
      allTo.push(toInput.trim());
      setToChips(allTo);
      setToInput('');
    }

    if (allTo.length === 0) {
      onAlert?.({ type: 'warning', message: 'Please specify at least one recipient email address.' });
      return;
    }

    if (!subject.trim()) {
      onAlert?.({ type: 'warning', message: 'Please enter an email subject.' });
      return;
    }

    if (!body.trim()) {
      onAlert?.({ type: 'warning', message: 'Please write a message body.' });
      return;
    }

    if (totalAttachmentBytes > 25 * 1024 * 1024) {
      onAlert?.({ type: 'error', message: 'Total attachment size exceeds the 25 MB SMTP limit.' });
      return;
    }

    try {
      setIsSending(true);
      const formData = new FormData();
      formData.append('to', allTo.join(', '));
      if (ccChips.length > 0) formData.append('cc', ccChips.join(', '));
      if (bccChips.length > 0) formData.append('bcc', bccChips.join(', '));
      formData.append('subject', subject);
      formData.append('body', body);
      formData.append('isHtml', 'true');

      attachments.forEach((file) => {
        formData.append('attachments', file);
      });

      const res = await ApiService.sendDirectEmail(formData);

      onAlert?.({
        type: 'success',
        message: `Email successfully delivered to ${allTo.join(', ')}!`
      });

      // Reset composer
      setToChips([]);
      setToInput('');
      setCcChips([]);
      setCcInput('');
      setBccChips([]);
      setBccInput('');
      setSubject('');
      setBody('');
      setAttachments([]);
      setComposerOpen(false);

      // Refresh list
      fetchEmails();
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Failed to send email.' });
    } finally {
      setIsSending(false);
    }
  };

  // Toggle star
  const handleToggleStar = async (emailId, e) => {
    e?.stopPropagation();
    try {
      // Optimistic update
      setEmails((prev) =>
        prev.map((item) =>
          item.email_id === emailId ? { ...item, is_starred: !item.is_starred } : item
        )
      );
      if (selectedEmail && selectedEmail.email_id === emailId) {
        setSelectedEmail((prev) => ({ ...prev, is_starred: !prev.is_starred }));
      }
      await ApiService.toggleDirectEmailStar(emailId);
      fetchEmails(true);
    } catch (err) {
      onAlert?.({ type: 'error', message: 'Failed to star email' });
      fetchEmails(true);
    }
  };

  // Delete / Trash email
  const handleDeleteEmail = async (emailId, e, permanent = false) => {
    e?.stopPropagation();
    try {
      await ApiService.deleteDirectEmail(emailId, permanent);
      onAlert?.({
        type: 'info',
        message: permanent ? 'Email permanently deleted' : 'Email moved to trash'
      });
      if (selectedEmail && selectedEmail.email_id === emailId) {
        setSelectedEmail(null);
      }
      fetchEmails();
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Failed to delete email' });
    }
  };

  // Restore email from trash
  const handleRestoreEmail = async (emailId, e) => {
    e?.stopPropagation();
    try {
      await ApiService.restoreDirectEmail(emailId);
      onAlert?.({ type: 'success', message: 'Email restored' });
      if (selectedEmail && selectedEmail.email_id === emailId) {
        setSelectedEmail(null);
      }
      fetchEmails();
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Failed to restore email' });
    }
  };

  // View email detail
  const handleOpenEmail = async (email) => {
    try {
      setDetailLoading(true);
      const full = await ApiService.getDirectEmail(email.email_id);
      setSelectedEmail(full || email);
    } catch (err) {
      setSelectedEmail(email);
    } finally {
      setDetailLoading(false);
    }
  };

  // Format insertion in textarea
  const insertFormatting = (prefix, suffix = prefix) => {
    const textarea = bodyTextareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    const replacement = `${prefix}${selected || 'text'}${suffix}`;
    const newText = text.substring(0, start) + replacement + text.substring(end);
    setBody(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selected ? selected.length : 4));
    }, 0);
  };

  // Filtered emails
  const filteredEmails = useMemo(() => {
    if (activeFilter === 'attachments') {
      return emails.filter((e) => Array.isArray(e.attachments) && e.attachments.length > 0);
    }
    return emails;
  }, [emails, activeFilter]);

  return (
    <div className="Webmail">
      {/* --- Top Header Bar --- */}
      <div className="Webmail__header">
        <div className="Webmail__headerLeft">
          <div className="Webmail__brand">
            <span className="Webmail__brandIcon"><MdEmail /></span>
            <span>MSP Webmail</span>
          </div>

          <form
            className="Webmail__searchForm"
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              fetchEmails();
            }}
          >
            <MdSearch className="Webmail__searchIcon" />
            <input
              type="text"
              className="Webmail__searchInput"
              placeholder="Search by subject, recipient, or content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="Webmail__searchClear"
                onClick={() => {
                  setSearchQuery('');
                  setPage(1);
                  setTimeout(() => fetchEmails(), 0);
                }}
              >
                <MdClose />
              </button>
            )}
          </form>
        </div>

        <div className="Webmail__headerRight">
          {smtpStatus?.isReady && (
            <div className="Webmail__smtpBadge" title={`Connected to ${smtpStatus.host}:${smtpStatus.port}`}>
              <span className="Webmail__smtpDot" />
              <span>{smtpStatus.host} (Online)</span>
            </div>
          )}
          <button
            type="button"
            className="Webmail__refreshBtn"
            title="Refresh emails"
            onClick={() => fetchEmails()}
          >
            <MdRefresh />
          </button>
        </div>
      </div>

      {/* --- Main Grid: Sidebar + Content --- */}
      <div className="Webmail__main">
        {/* Left Folder Navigation Sidebar */}
        <div className="Webmail__sidebar">
          <button
            type="button"
            className="Webmail__composeBtn"
            onClick={() => {
              setComposerOpen(true);
              setComposerMinimized(false);
            }}
          >
            <MdSend className="Webmail__composeIcon" />
            <span>Compose</span>
          </button>

          <div className="Webmail__nav">
            <button
              type="button"
              className={`Webmail__navItem ${currentFolder === 'sent' && !selectedEmail ? 'Webmail__navItem--active' : ''}`}
              onClick={() => {
                setCurrentFolder('sent');
                setSelectedEmail(null);
                setPage(1);
              }}
            >
              <div className="Webmail__navItemLeft">
                <MdSend className="Webmail__navIcon" />
                <span>Sent</span>
              </div>
              {counts.sent > 0 && <span className="Webmail__navCount">{counts.sent}</span>}
            </button>

            <button
              type="button"
              className={`Webmail__navItem ${currentFolder === 'starred' && !selectedEmail ? 'Webmail__navItem--active' : ''}`}
              onClick={() => {
                setCurrentFolder('starred');
                setSelectedEmail(null);
                setPage(1);
              }}
            >
              <div className="Webmail__navItemLeft">
                <MdStar className="Webmail__navIcon" style={{ color: '#ffbf00' }} />
                <span>Starred</span>
              </div>
              {counts.starred > 0 && <span className="Webmail__navCount">{counts.starred}</span>}
            </button>

            <button
              type="button"
              className={`Webmail__navItem ${currentFolder === 'drafts' && !selectedEmail ? 'Webmail__navItem--active' : ''}`}
              onClick={() => {
                setCurrentFolder('drafts');
                setSelectedEmail(null);
                setPage(1);
              }}
            >
              <div className="Webmail__navItemLeft">
                <MdDrafts className="Webmail__navIcon" />
                <span>Drafts</span>
              </div>
              {counts.drafts > 0 && <span className="Webmail__navCount">{counts.drafts}</span>}
            </button>

            <button
              type="button"
              className={`Webmail__navItem ${currentFolder === 'trash' && !selectedEmail ? 'Webmail__navItem--active' : ''}`}
              onClick={() => {
                setCurrentFolder('trash');
                setSelectedEmail(null);
                setPage(1);
              }}
            >
              <div className="Webmail__navItemLeft">
                <MdDeleteOutline className="Webmail__navIcon" />
                <span>Trash</span>
              </div>
              {counts.trash > 0 && <span className="Webmail__navCount">{counts.trash}</span>}
            </button>
          </div>

          <div className="Webmail__sidebarFooter">
            <div className="Webmail__infoCard">
              <strong>Direct Mail Platform</strong>
              Send emails to any address worldwide with attachments via official MSP SMTP.
            </div>
          </div>
        </div>

        {/* Content Area: Either Email List or Detail Viewer */}
        <div className="Webmail__content">
          {selectedEmail ? (
            /* --- Email Detail View --- */
            <div className="Webmail__detail">
              <div className="Webmail__detailToolbar">
                <button
                  type="button"
                  className="Webmail__backBtn"
                  onClick={() => setSelectedEmail(null)}
                >
                  <MdArrowBack />
                  <span>Back to {currentFolder}</span>
                </button>

                <div className="Webmail__detailActions">
                  <button
                    type="button"
                    className="Webmail__actionIconBtn"
                    title={selectedEmail.is_starred ? 'Unstar' : 'Star'}
                    onClick={(e) => handleToggleStar(selectedEmail.email_id, e)}
                  >
                    {selectedEmail.is_starred ? (
                      <MdStar style={{ color: '#ffbf00' }} />
                    ) : (
                      <MdStarBorder />
                    )}
                  </button>

                  {selectedEmail.is_trash ? (
                    <button
                      type="button"
                      className="Webmail__actionIconBtn"
                      title="Restore email"
                      onClick={(e) => handleRestoreEmail(selectedEmail.email_id, e)}
                    >
                      <MdRestore />
                    </button>
                  ) : null}

                  <button
                    type="button"
                    className="Webmail__actionIconBtn"
                    title={selectedEmail.is_trash ? 'Delete Permanently' : 'Move to Trash'}
                    onClick={(e) =>
                      handleDeleteEmail(selectedEmail.email_id, e, selectedEmail.is_trash)
                    }
                  >
                    <MdDelete />
                  </button>
                </div>
              </div>

              <div className="Webmail__detailBody">
                <h1 className="Webmail__detailSubject">{selectedEmail.subject}</h1>

                <div className="Webmail__detailMeta">
                  <div className="Webmail__senderInfo">
                    <div className="Webmail__avatar">
                      {(selectedEmail.sender_name || 'M')[0].toUpperCase()}
                    </div>
                    <div className="Webmail__senderNames">
                      <div className="Webmail__senderTitle">
                        {selectedEmail.sender_name}{' '}
                        <span style={{ color: '#94a3b8', fontWeight: 400 }}>
                          &lt;{selectedEmail.sender_email}&gt;
                        </span>
                      </div>
                      <div className="Webmail__recipientsLine">
                        <strong>To:</strong> {selectedEmail.to_emails}
                        {selectedEmail.cc_emails && (
                          <span> · <strong>Cc:</strong> {selectedEmail.cc_emails}</span>
                        )}
                        {selectedEmail.bcc_emails && (
                          <span> · <strong>Bcc:</strong> {selectedEmail.bcc_emails}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="Webmail__detailDate">
                    <div>{new Date(selectedEmail.created_at).toLocaleString()}</div>
                    <div className="Webmail__deliveryInfo">
                      <MdCheckCircle />
                      <span>Delivered via smtp.gmail.com</span>
                    </div>
                  </div>
                </div>

                {/* Email Body */}
                <div
                  className="Webmail__messageBody"
                  dangerouslySetInnerHTML={{
                    __html: selectedEmail.body_html || selectedEmail.body_text || '(Empty message)'
                  }}
                />

                {/* Attachments Section */}
                {Array.isArray(selectedEmail.attachments) && selectedEmail.attachments.length > 0 && (
                  <div className="Webmail__attachmentsSection">
                    <h3 className="Webmail__attachmentsTitle">
                      <MdAttachFile />
                      <span>Attachments ({selectedEmail.attachments.length})</span>
                    </h3>
                    <div className="Webmail__attachmentGrid">
                      {selectedEmail.attachments.map((att, idx) => (
                        <a
                          key={idx}
                          href={att.url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="Webmail__attachmentCard"
                          download={att.filename}
                          onClick={(e) => {
                            if (!att.url) {
                              e.preventDefault();
                              onAlert?.({
                                type: 'info',
                                message: `Attachment "${att.filename}" was sent directly with the email.`
                              });
                            }
                          }}
                        >
                          {getAttachmentIcon(att.filename)}
                          <div className="Webmail__attMeta">
                            <span className="Webmail__attName" title={att.filename}>
                              {att.filename}
                            </span>
                            <span className="Webmail__attSize">{formatBytes(att.size)}</span>
                          </div>
                          {att.url && <MdFileDownload className="Webmail__attDownload" />}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* --- Email List View --- */
            <>
              <div className="Webmail__toolbar">
                <div className="Webmail__toolbarLeft">
                  <div className="Webmail__filterPills">
                    <button
                      type="button"
                      className={`Webmail__filterPill ${activeFilter === 'all' ? 'Webmail__filterPill--active' : ''}`}
                      onClick={() => setActiveFilter('all')}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      className={`Webmail__filterPill ${activeFilter === 'attachments' ? 'Webmail__filterPill--active' : ''}`}
                      onClick={() => setActiveFilter('attachments')}
                    >
                      With Attachments
                    </button>
                  </div>
                </div>

                <div className="Webmail__toolbarRight">
                  <span>
                    {total === 0 ? '0' : `${(page - 1) * 25 + 1}-${Math.min(page * 25, total)} of ${total}`}
                  </span>
                  <button
                    type="button"
                    className="Webmail__pageBtn"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <MdChevronLeft />
                  </button>
                  <button
                    type="button"
                    className="Webmail__pageBtn"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    <MdChevronRight />
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="Webmail__empty">
                  <div className="Webmail__emptyIcon" style={{ animation: 'spin 1.5s linear infinite' }}>
                    <MdRefresh />
                  </div>
                  <div className="Webmail__emptyTitle">Loading emails...</div>
                </div>
              ) : filteredEmails.length === 0 ? (
                <div className="Webmail__empty">
                  <MdEmail className="Webmail__emptyIcon" />
                  <div className="Webmail__emptyTitle">No emails in {currentFolder}</div>
                  <p>Click "Compose" to contact any email address with attachments.</p>
                </div>
              ) : (
                <div className="Webmail__list">
                  {filteredEmails.map((email) => {
                    const hasAttachments = Array.isArray(email.attachments) && email.attachments.length > 0;
                    return (
                      <div
                        key={email.email_id}
                        className="Webmail__row"
                        onClick={() => handleOpenEmail(email)}
                      >
                        <button
                          type="button"
                          className={`Webmail__starBtn ${email.is_starred ? 'Webmail__starBtn--starred' : ''}`}
                          onClick={(e) => handleToggleStar(email.email_id, e)}
                        >
                          {email.is_starred ? <MdStar /> : <MdStarBorder />}
                        </button>

                        <div className="Webmail__rowRecipients" title={email.to_emails}>
                          To: {email.to_emails}
                        </div>

                        <div className="Webmail__rowSubjectGroup">
                          <span className="Webmail__rowSubject">{email.subject}</span>
                          <span className="Webmail__rowSnippet">
                            - {(email.body_text || '').substring(0, 80)}
                          </span>
                        </div>

                        {hasAttachments ? (
                          <span className="Webmail__attachBadge" title={`${email.attachments.length} attachment(s)`}>
                            <MdAttachFile />
                            <span>{email.attachments.length}</span>
                          </span>
                        ) : (
                          <span />
                        )}

                        <span className="Webmail__rowDate">{formatEmailDate(email.created_at)}</span>

                        <div className="Webmail__rowActions">
                          <button
                            type="button"
                            className="Webmail__actionIconBtn"
                            title={email.is_trash ? 'Delete Permanently' : 'Delete'}
                            onClick={(e) => handleDeleteEmail(email.email_id, e, email.is_trash)}
                          >
                            <MdDelete />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* =========================================================================
         Docked Gmail-like Composer Window
         ========================================================================= */}
      {composerOpen && (
        <div
          className={`Webmail__composer ${composerMinimized ? 'Webmail__composer--minimized' : ''} ${composerMaximized ? 'Webmail__composer--maximized' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            handleFilesSelected(e.dataTransfer.files);
          }}
        >
          {/* Header Bar */}
          <div
            className="Webmail__composerHeader"
            onClick={() => {
              if (composerMinimized) setComposerMinimized(false);
            }}
          >
            <div className="Webmail__composerTitle">
              <MdEmail />
              <span>{subject ? subject : 'New Message'}</span>
            </div>
            <div className="Webmail__composerControls">
              <button
                type="button"
                className="Webmail__composerControlBtn"
                title={composerMinimized ? 'Expand' : 'Minimize'}
                onClick={(e) => {
                  e.stopPropagation();
                  setComposerMinimized(!composerMinimized);
                  setComposerMaximized(false);
                }}
              >
                <MdMinimize />
              </button>
              <button
                type="button"
                className="Webmail__composerControlBtn"
                title={composerMaximized ? 'Restore' : 'Maximize'}
                onClick={(e) => {
                  e.stopPropagation();
                  setComposerMaximized(!composerMaximized);
                  setComposerMinimized(false);
                }}
              >
                {composerMaximized ? <MdCloseFullscreen /> : <MdOpenInFull />}
              </button>
              <button
                type="button"
                className="Webmail__composerControlBtn"
                title="Close"
                onClick={(e) => {
                  e.stopPropagation();
                  setComposerOpen(false);
                }}
              >
                <MdClose />
              </button>
            </div>
          </div>

          {/* Form Content (hidden when minimized) */}
          {!composerMinimized && (
            <div className="Webmail__composerBody">
              {/* Recipient ("To") Field */}
              <div className="Webmail__fieldRow">
                <span className="Webmail__fieldLabel">To</span>
                <div className="Webmail__chipInputContainer">
                  {toChips.map((chip, i) => (
                    <span key={i} className="Webmail__chip">
                      <span>{chip}</span>
                      <button
                        type="button"
                        className="Webmail__chipRemove"
                        onClick={() => removeChip(i, 'to')}
                      >
                        <MdClose />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    className="Webmail__textInput"
                    placeholder={toChips.length === 0 ? 'Type email address and press Enter...' : ''}
                    value={toInput}
                    onChange={(e) => handleRecipientInput(e.target.value, 'to')}
                    onKeyDown={(e) => handleKeyDown(e, 'to')}
                  />
                </div>
                <div className="Webmail__ccToggles">
                  {!showCc && (
                    <button
                      type="button"
                      className="Webmail__ccToggleBtn"
                      onClick={() => setShowCc(true)}
                    >
                      Cc
                    </button>
                  )}
                  {!showBcc && (
                    <button
                      type="button"
                      className="Webmail__ccToggleBtn"
                      onClick={() => setShowBcc(true)}
                    >
                      Bcc
                    </button>
                  )}
                </div>

                {/* Autocomplete Suggestions */}
                {activeField === 'to' && suggestions.length > 0 && (
                  <div className="Webmail__autocompleteDropdown">
                    {suggestions.map((c, i) => (
                      <div
                        key={i}
                        className="Webmail__autocompleteItem"
                        onClick={() => addRecipientChip(c.email, 'to')}
                      >
                        <div>
                          <div className="Webmail__autoName">{c.name}</div>
                          <div className="Webmail__autoEmail">{c.email}</div>
                        </div>
                        <span className="Webmail__autoRole">{c.role}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Optional CC Field */}
              {showCc && (
                <div className="Webmail__fieldRow">
                  <span className="Webmail__fieldLabel">Cc</span>
                  <div className="Webmail__chipInputContainer">
                    {ccChips.map((chip, i) => (
                      <span key={i} className="Webmail__chip">
                        <span>{chip}</span>
                        <button
                          type="button"
                          className="Webmail__chipRemove"
                          onClick={() => removeChip(i, 'cc')}
                        >
                          <MdClose />
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      className="Webmail__textInput"
                      placeholder="Add CC email..."
                      value={ccInput}
                      onChange={(e) => handleRecipientInput(e.target.value, 'cc')}
                      onKeyDown={(e) => handleKeyDown(e, 'cc')}
                    />
                  </div>
                </div>
              )}

              {/* Optional BCC Field */}
              {showBcc && (
                <div className="Webmail__fieldRow">
                  <span className="Webmail__fieldLabel">Bcc</span>
                  <div className="Webmail__chipInputContainer">
                    {bccChips.map((chip, i) => (
                      <span key={i} className="Webmail__chip">
                        <span>{chip}</span>
                        <button
                          type="button"
                          className="Webmail__chipRemove"
                          onClick={() => removeChip(i, 'bcc')}
                        >
                          <MdClose />
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      className="Webmail__textInput"
                      placeholder="Add BCC email..."
                      value={bccInput}
                      onChange={(e) => handleRecipientInput(e.target.value, 'bcc')}
                      onKeyDown={(e) => handleKeyDown(e, 'bcc')}
                    />
                  </div>
                </div>
              )}

              {/* Subject Field */}
              <div className="Webmail__fieldRow">
                <span className="Webmail__fieldLabel">Subject</span>
                <input
                  type="text"
                  className="Webmail__textInput"
                  placeholder="Subject of your message..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              {/* Formatting Toolbar */}
              <div className="Webmail__formattingBar">
                <button
                  type="button"
                  className="Webmail__formatBtn"
                  title="Bold (**text**)"
                  onClick={() => insertFormatting('**')}
                >
                  <MdFormatBold />
                </button>
                <button
                  type="button"
                  className="Webmail__formatBtn"
                  title="Italic (*text*)"
                  onClick={() => insertFormatting('*')}
                >
                  <MdFormatItalic />
                </button>
                <button
                  type="button"
                  className="Webmail__formatBtn"
                  title="Underline"
                  onClick={() => insertFormatting('<u>', '</u>')}
                >
                  <MdFormatUnderlined />
                </button>
                <span className="Webmail__formatDivider" />
                <button
                  type="button"
                  className="Webmail__formatBtn"
                  title="Bullet list"
                  onClick={() => insertFormatting('\n- ')}
                >
                  <MdFormatListBulleted />
                </button>
                <button
                  type="button"
                  className="Webmail__formatBtn"
                  title="Numbered list"
                  onClick={() => insertFormatting('\n1. ')}
                >
                  <MdFormatListNumbered />
                </button>
                <button
                  type="button"
                  className="Webmail__formatBtn"
                  title="Code snippet (`code`)"
                  onClick={() => insertFormatting('`')}
                >
                  <MdCode />
                </button>
                <button
                  type="button"
                  className="Webmail__formatBtn"
                  title="Insert Link ([Title](url))"
                  onClick={() => insertFormatting('[Link Title](https://', ')')}
                >
                  <MdInsertLink />
                </button>
              </div>

              {/* Message Body Textarea */}
              <textarea
                ref={bodyTextareaRef}
                className="Webmail__bodyTextarea"
                placeholder="Write your email here... Supports markdown formatting, links, and bold text."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    handleSendEmail();
                  }
                }}
              />

              {/* Attachments Tray */}
              {attachments.length > 0 && (
                <div className="Webmail__composerAttachments">
                  {attachments.map((file, idx) => (
                    <div key={idx} className="Webmail__fileChip">
                      <MdAttachFile />
                      <span title={file.name}>{file.name}</span>
                      <span className="Webmail__fileChipSize">({formatBytes(file.size)})</span>
                      <button
                        type="button"
                        className="Webmail__fileChipRemove"
                        title="Remove file"
                        onClick={() => removeAttachment(idx)}
                      >
                        <MdClose />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Bottom Action Bar */}
              <div className="Webmail__composerFooter">
                <div className="Webmail__composerFooterLeft">
                  <button
                    type="button"
                    className="Webmail__sendBtn"
                    disabled={isSending}
                    onClick={handleSendEmail}
                  >
                    <MdSend />
                    <span>{isSending ? 'Sending...' : 'Send'}</span>
                  </button>

                  {/* Hidden File Input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    style={{ display: 'none' }}
                    onChange={(e) => handleFilesSelected(e.target.files)}
                  />

                  <button
                    type="button"
                    className="Webmail__attachTriggerBtn"
                    title="Attach files (PDF, images, docs, zip...)"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <MdAttachFile />
                  </button>

                  <span
                    className={`Webmail__attachmentSizeNote ${
                      totalAttachmentBytes > 20 * 1024 * 1024 ? 'Webmail__attachmentSizeNote--warn' : ''
                    }`}
                  >
                    {totalAttachmentBytes > 0 && `${formatBytes(totalAttachmentBytes)} / 25 MB max`}
                  </span>
                </div>

                <div className="Webmail__composerFooterRight">
                  <button
                    type="button"
                    className="Webmail__discardBtn"
                    title="Discard draft"
                    onClick={() => {
                      setToChips([]);
                      setToInput('');
                      setSubject('');
                      setBody('');
                      setAttachments([]);
                      setComposerOpen(false);
                    }}
                  >
                    <MdDeleteOutline />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
