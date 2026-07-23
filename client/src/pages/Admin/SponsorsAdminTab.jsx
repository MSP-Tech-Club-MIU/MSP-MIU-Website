import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MdAdd, MdBusiness, MdClose, MdCloudUpload, MdLink, MdOpenInNew } from 'react-icons/md';
import ApiService from '../../services/api';
import Pagination from '../../components/Pagination';

const emptyForm = () => ({
  name: '',
  tagline: '',
  description: '',
  logo_url: '',
  website_url: '',
  tier: '',
  sort_order: 0,
  social_links: ''
});

const LIST_LIMIT = 20;

export default function SponsorsAdminTab({ onAlert }) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const result = await ApiService.getSponsors({ page, limit: LIST_LIMIT });
      setItems(Array.isArray(result?.data) ? result.data : []);
      setPagination(result?.pagination || null);
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Failed to load sponsors' });
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, onAlert]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!modalOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setModalOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [modalOpen]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      name: row.name || '',
      tagline: row.tagline || '',
      description: row.description || '',
      logo_url: row.logo_url || '',
      website_url: row.website_url || '',
      tier: row.tier || '',
      sort_order: row.sort_order ?? 0,
      social_links:
        typeof row.social_links === 'string'
          ? row.social_links
          : row.social_links
            ? JSON.stringify(row.social_links, null, 2)
            : ''
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving || uploading) return;
    setModalOpen(false);
  };

  const handleLogoUpload = async (file) => {
    if (!file) return;
    try {
      setUploading(true);
      const result = await ApiService.uploadFile(file, 'assets');
      setForm((f) => ({ ...f, logo_url: result.url || '' }));
      onAlert?.({ type: 'success', message: 'Logo uploaded.' });
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Upload failed' });
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.name.trim()) {
      onAlert?.({ type: 'error', message: 'Name is required' });
      return;
    }
    try {
      setSaving(true);
      const payload = {
        name: form.name.trim(),
        tagline: form.tagline || null,
        description: form.description || null,
        logo_url: form.logo_url || null,
        website_url: form.website_url || null,
        tier: form.tier || null,
        sort_order: Number(form.sort_order) || 0,
        social_links: form.social_links?.trim() || null
      };
      if (editing) {
        await ApiService.updateSponsor(editing.sponsor_id, payload);
        onAlert?.({ type: 'success', message: 'Sponsor updated.' });
      } else {
        await ApiService.createSponsor(payload);
        onAlert?.({ type: 'success', message: 'Sponsor created.' });
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete sponsor "${row.name}"?`)) return;
    try {
      await ApiService.deleteSponsor(row.sponsor_id);
      onAlert?.({ type: 'success', message: 'Sponsor deleted.' });
      await load();
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Delete failed' });
    }
  };

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const modal = modalOpen
    ? createPortal(
        <div
          className="AdminPanel__modalOverlay SponsorsAdmin__overlay"
          onClick={closeModal}
          role="presentation"
        >
          <div
            className="AdminPanel__modalContent AdminPanel__modalContent--large SponsorsAdmin__modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sponsors-modal-title"
          >
            <div className="AdminPanel__modalHeader SponsorsAdmin__modalHeader">
              <div>
                <h3 id="sponsors-modal-title">{editing ? 'Edit sponsor' : 'Add sponsor'}</h3>
                <p className="SponsorsAdmin__modalSub">
                  {editing ? `Updating ${editing.name}` : 'Create a new partner for the public sponsors page'}
                </p>
              </div>
              <button
                type="button"
                className="AdminPanel__modalClose"
                onClick={closeModal}
                aria-label="Close"
                disabled={saving || uploading}
              >
                <MdClose />
              </button>
            </div>

            <div className="SponsorsAdmin__body">
              <div className="SponsorsAdmin__logoPane">
                <div className="SponsorsAdmin__logoPreview">
                  {form.logo_url ? (
                    <img src={form.logo_url} alt="" />
                  ) : (
                    <span className="SponsorsAdmin__logoPlaceholder">
                      <MdBusiness />
                      Logo preview
                    </span>
                  )}
                </div>
                <label className="SponsorsAdmin__fileBtn">
                  <MdCloudUpload />
                  {uploading ? 'Uploading…' : 'Upload logo'}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploading || saving}
                    onChange={(e) => handleLogoUpload(e.target.files?.[0])}
                  />
                </label>
                <p className="SponsorsAdmin__hint">PNG or SVG recommended. You can also paste a logo URL below.</p>
              </div>

              <div className="SponsorsAdmin__formPane">
                <div className="AdminPanel__formGrid SponsorsAdmin__formGrid">
                  <label>
                    Name
                    <input
                      value={form.name}
                      onChange={setField('name')}
                      placeholder="Sponsor name"
                      autoFocus
                    />
                  </label>
                  <label>
                    Tier
                    <input
                      value={form.tier}
                      onChange={setField('tier')}
                      placeholder="gold, partner…"
                    />
                  </label>
                  <label className="AdminPanel__fullWidth">
                    Tagline
                    <input
                      value={form.tagline}
                      onChange={setField('tagline')}
                      placeholder="Short tagline"
                    />
                  </label>
                  <label>
                    Sort order
                    <input
                      type="number"
                      value={form.sort_order}
                      onChange={setField('sort_order')}
                    />
                  </label>
                  <label>
                    Website URL
                    <input
                      value={form.website_url}
                      onChange={setField('website_url')}
                      placeholder="https://"
                    />
                  </label>
                  <label className="AdminPanel__fullWidth">
                    Logo URL
                    <input
                      value={form.logo_url}
                      onChange={setField('logo_url')}
                      placeholder="https://…/logo.png"
                    />
                  </label>
                  <label className="AdminPanel__fullWidth">
                    Description
                    <textarea
                      rows={4}
                      value={form.description}
                      onChange={setField('description')}
                      placeholder="About this sponsor"
                    />
                  </label>
                  <label className="AdminPanel__fullWidth">
                    Social links (JSON)
                    <textarea
                      className="AdminPanel__jsonEditor"
                      rows={3}
                      value={form.social_links}
                      onChange={setField('social_links')}
                      placeholder='{"linkedin":"https://..."}'
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="AdminPanel__modalActions SponsorsAdmin__actions">
              <button
                type="button"
                className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
                onClick={closeModal}
                disabled={saving || uploading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="AdminPanel__modalBtn AdminPanel__modalBtn--primary"
                disabled={saving || uploading}
                onClick={save}
              >
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Create sponsor'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <div className="AdminPanel__section SponsorsAdmin">
      <div className="AdminPanel__sectionHeader">
        <div>
          <h2 className="AdminPanel__sectionTitle">
            <MdBusiness /> Sponsors
          </h2>
          <p className="SponsorsAdmin__sectionSub">
            Manage partner logos and details shown on the public sponsors page.
          </p>
        </div>
        <button type="button" className="AdminPanel__addBtn" onClick={openCreate}>
          <MdAdd /> Add Sponsor
        </button>
      </div>

      {loading ? (
        <div className="AdminPanel__empty"><p>Loading…</p></div>
      ) : items.length === 0 ? (
        <div className="AdminPanel__empty SponsorsAdmin__empty">
          <MdBusiness />
          <p>No sponsors yet.</p>
          <button type="button" className="AdminPanel__addBtn" onClick={openCreate}>
            <MdAdd /> Add your first sponsor
          </button>
        </div>
      ) : (
        <div className="AdminPanel__tableWrap">
          <table className="AdminPanel__table SponsorsAdmin__table">
            <thead>
              <tr>
                <th>Sponsor</th>
                <th>Tier</th>
                <th>Order</th>
                <th>Website</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.sponsor_id}>
                  <td>
                    <div className="SponsorsAdmin__rowIdentity">
                      <div className="SponsorsAdmin__rowLogo">
                        {row.logo_url ? (
                          <img src={row.logo_url} alt="" />
                        ) : (
                          <MdBusiness />
                        )}
                      </div>
                      <div className="SponsorsAdmin__rowText">
                        <span className="SponsorsAdmin__rowName">{row.name}</span>
                        {row.tagline ? (
                          <span className="SponsorsAdmin__rowTagline">{row.tagline}</span>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td>
                    {row.tier ? (
                      <span className="SponsorsAdmin__tier">{row.tier}</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{row.sort_order}</td>
                  <td>
                    {row.website_url ? (
                      <a
                        className="SponsorsAdmin__link"
                        href={row.website_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <MdLink /> Visit <MdOpenInNew />
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <div className="SponsorsAdmin__rowActions">
                      <button
                        type="button"
                        className="AdminPanel__actionBtn AdminPanel__actionBtn--edit"
                        onClick={() => openEdit(row)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="AdminPanel__actionBtn AdminPanel__actionBtn--delete"
                        onClick={() => remove(row)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination pagination={pagination} onPageChange={setPage} />
      {modal}
    </div>
  );
}
