import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  MdAdd,
  MdBusiness,
  MdClose,
  MdCloudUpload,
  MdHistory,
  MdLink,
  MdOpenInNew
} from 'react-icons/md';
import ApiService from '../../services/api';
import Pagination from '../../components/Pagination';
import SeasonBadge from '../../components/SeasonBadge';
import { useSeason } from '../../context/SeasonContext';

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
const IMPORT_LIMIT = 100;

const normalizeName = (name) => String(name || '').trim().toLowerCase();

const toCreatePayload = (row, seasonId) => {
  let socialLinks = row.social_links ?? null;
  if (socialLinks && typeof socialLinks === 'object') {
    socialLinks = JSON.stringify(socialLinks);
  }
  return {
    name: String(row.name || '').trim(),
    tagline: row.tagline || null,
    description: row.description || null,
    logo_url: row.logo_url || null,
    website_url: row.website_url || null,
    tier: row.tier || null,
    sort_order: Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : 0,
    social_links: socialLinks,
    season_id: seasonId
  };
};

export default function SponsorsAdminTab({ onAlert }) {
  const { seasonFilters, isAll, selectedSeasonId, seasons, defaultSeasonId } = useSeason();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const [importSourceId, setImportSourceId] = useState(null);
  const [importCandidates, setImportCandidates] = useState([]);
  const [importSelected, setImportSelected] = useState(() => new Set());
  const [importExistingNames, setImportExistingNames] = useState(() => new Set());
  const [importLoading, setImportLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const targetSeasonId = useMemo(() => {
    if (isAll) return null;
    if (selectedSeasonId === 'current') return defaultSeasonId ?? null;
    if (typeof selectedSeasonId === 'number') return selectedSeasonId;
    const parsed = parseInt(selectedSeasonId, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }, [isAll, selectedSeasonId, defaultSeasonId]);

  const canImport = targetSeasonId != null;

  const sourceSeasons = useMemo(
    () =>
      (Array.isArray(seasons) ? seasons : [])
        .filter((s) => Number(s.season_id) !== Number(targetSeasonId))
        .slice()
        .sort((a, b) => {
          const yearDiff = (Number(b.start_year) || 0) - (Number(a.start_year) || 0);
          if (yearDiff !== 0) return yearDiff;
          return (Number(b.season_id) || 0) - (Number(a.season_id) || 0);
        }),
    [seasons, targetSeasonId]
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const result = await ApiService.getSponsors({ page, limit: LIST_LIMIT, ...seasonFilters });
      setItems(Array.isArray(result?.data) ? result.data : []);
      setPagination(result?.pagination || null);
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Failed to load sponsors' });
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, onAlert, seasonFilters]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!modalOpen && !importOpen) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (importOpen && !importing) setImportOpen(false);
      else if (modalOpen && !saving && !uploading) setModalOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [modalOpen, importOpen, saving, uploading, importing]);

  const loadImportCandidates = useCallback(
    async (sourceId) => {
      if (!sourceId || targetSeasonId == null) {
        setImportCandidates([]);
        setImportSelected(new Set());
        return;
      }
      try {
        setImportLoading(true);
        const [sourceResult, targetResult] = await Promise.all([
          ApiService.getSponsors({ page: 1, limit: IMPORT_LIMIT, season_id: sourceId }),
          ApiService.getSponsors({ page: 1, limit: IMPORT_LIMIT, season_id: targetSeasonId })
        ]);
        const candidates = Array.isArray(sourceResult?.data) ? sourceResult.data : [];
        const existing = new Set(
          (Array.isArray(targetResult?.data) ? targetResult.data : []).map((row) =>
            normalizeName(row.name)
          )
        );
        setImportCandidates(candidates);
        setImportExistingNames(existing);
        setImportSelected(
          new Set(
            candidates
              .filter((row) => !existing.has(normalizeName(row.name)))
              .map((row) => row.sponsor_id)
          )
        );
      } catch (err) {
        onAlert?.({ type: 'error', message: err.message || 'Failed to load previous sponsors' });
        setImportCandidates([]);
        setImportSelected(new Set());
        setImportExistingNames(new Set());
      } finally {
        setImportLoading(false);
      }
    },
    [targetSeasonId, onAlert]
  );

  const openImport = () => {
    if (!canImport) {
      onAlert?.({
        type: 'error',
        message: 'Select a specific season (not All) to copy sponsors into.'
      });
      return;
    }
    if (!sourceSeasons.length) {
      onAlert?.({ type: 'error', message: 'No other seasons available to copy from.' });
      return;
    }
    const initialSource = sourceSeasons[0]?.season_id ?? null;
    setImportSourceId(initialSource);
    setImportOpen(true);
    loadImportCandidates(initialSource);
  };

  const closeImport = () => {
    if (importing) return;
    setImportOpen(false);
  };

  const handleImportSourceChange = (e) => {
    const nextId = parseInt(e.target.value, 10);
    setImportSourceId(Number.isFinite(nextId) ? nextId : null);
    loadImportCandidates(Number.isFinite(nextId) ? nextId : null);
  };

  const selectableCandidates = useMemo(
    () => importCandidates.filter((row) => !importExistingNames.has(normalizeName(row.name))),
    [importCandidates, importExistingNames]
  );

  const allSelectableChecked =
    selectableCandidates.length > 0 &&
    selectableCandidates.every((row) => importSelected.has(row.sponsor_id));

  const toggleSelectAll = () => {
    if (allSelectableChecked) {
      setImportSelected(new Set());
      return;
    }
    setImportSelected(new Set(selectableCandidates.map((row) => row.sponsor_id)));
  };

  const toggleCandidate = (sponsorId, disabled) => {
    if (disabled) return;
    setImportSelected((prev) => {
      const next = new Set(prev);
      if (next.has(sponsorId)) next.delete(sponsorId);
      else next.add(sponsorId);
      return next;
    });
  };

  const confirmImport = async () => {
    if (targetSeasonId == null) return;
    const toCopy = importCandidates.filter(
      (row) =>
        importSelected.has(row.sponsor_id) && !importExistingNames.has(normalizeName(row.name))
    );
    if (!toCopy.length) {
      onAlert?.({ type: 'error', message: 'Select at least one sponsor to copy.' });
      return;
    }
    try {
      setImporting(true);
      let created = 0;
      for (const row of toCopy) {
        await ApiService.createSponsor(toCreatePayload(row, targetSeasonId));
        created += 1;
      }
      onAlert?.({
        type: 'success',
        message:
          created === 1
            ? 'Copied 1 sponsor into this season.'
            : `Copied ${created} sponsors into this season.`
      });
      setImportOpen(false);
      await load();
    } catch (err) {
      onAlert?.({ type: 'error', message: err.message || 'Failed to copy sponsors' });
    } finally {
      setImporting(false);
    }
  };

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
      if (!editing && targetSeasonId != null) {
        payload.season_id = targetSeasonId;
      }
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

  const headerActions = (
    <div className="SponsorsAdmin__headerActions">
      <button
        type="button"
        className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
        onClick={openImport}
        disabled={!canImport}
        title={canImport ? undefined : 'Select a specific season to copy into'}
      >
        <MdHistory style={{ marginRight: 4, verticalAlign: 'text-bottom' }} />
        Add from previous sponsors
      </button>
      <button type="button" className="AdminPanel__addBtn" onClick={openCreate}>
        <MdAdd /> Add Sponsor
      </button>
    </div>
  );

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

  const importModal = importOpen
    ? createPortal(
        <div
          className="AdminPanel__modalOverlay SponsorsAdmin__overlay"
          onClick={closeImport}
          role="presentation"
        >
          <div
            className="AdminPanel__modalContent AdminPanel__modalContent--large SponsorsAdmin__modal SponsorsAdmin__importModal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sponsors-import-title"
          >
            <div className="AdminPanel__modalHeader SponsorsAdmin__modalHeader">
              <div>
                <h3 id="sponsors-import-title">Add from previous sponsors</h3>
                <p className="SponsorsAdmin__modalSub">
                  Copy selected partners into the currently selected season.
                </p>
              </div>
              <button
                type="button"
                className="AdminPanel__modalClose"
                onClick={closeImport}
                aria-label="Close"
                disabled={importing}
              >
                <MdClose />
              </button>
            </div>

            <div className="SponsorsAdmin__importBody">
              <label className="SponsorsAdmin__importSeason">
                Source season
                <select
                  value={importSourceId ?? ''}
                  onChange={handleImportSourceChange}
                  disabled={importing || importLoading}
                >
                  {sourceSeasons.map((season) => (
                    <option key={season.season_id} value={season.season_id}>
                      {season.label || `${season.start_year}/${season.end_year}`}
                      {season.is_default ? ' (current)' : ''}
                    </option>
                  ))}
                </select>
              </label>

              {importLoading ? (
                <p className="SponsorsAdmin__importHint">Loading sponsors…</p>
              ) : importCandidates.length === 0 ? (
                <p className="SponsorsAdmin__importHint">No sponsors in this season.</p>
              ) : (
                <>
                  <div className="SponsorsAdmin__importToolbar">
                    <label className="SponsorsAdmin__importSelectAll">
                      <input
                        type="checkbox"
                        checked={allSelectableChecked}
                        onChange={toggleSelectAll}
                        disabled={importing || selectableCandidates.length === 0}
                      />
                      Select all available
                    </label>
                    <span className="SponsorsAdmin__importCount">
                      {importSelected.size} selected
                    </span>
                  </div>
                  <ul className="SponsorsAdmin__importList">
                    {importCandidates.map((row) => {
                      const already = importExistingNames.has(normalizeName(row.name));
                      const checked = importSelected.has(row.sponsor_id);
                      return (
                        <li
                          key={row.sponsor_id}
                          className={`SponsorsAdmin__importRow${already ? ' is-disabled' : ''}`}
                        >
                          <label>
                            <input
                              type="checkbox"
                              checked={checked && !already}
                              disabled={already || importing}
                              onChange={() => toggleCandidate(row.sponsor_id, already)}
                            />
                            <span className="SponsorsAdmin__rowLogo">
                              {row.logo_url ? <img src={row.logo_url} alt="" /> : <MdBusiness />}
                            </span>
                            <span className="SponsorsAdmin__rowText">
                              <span className="SponsorsAdmin__rowName">{row.name}</span>
                              {row.tier ? (
                                <span className="SponsorsAdmin__rowTagline">{row.tier}</span>
                              ) : null}
                              {already ? (
                                <span className="SponsorsAdmin__importAlready">
                                  Already in this season
                                </span>
                              ) : null}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>

            <div className="AdminPanel__modalActions SponsorsAdmin__actions">
              <button
                type="button"
                className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
                onClick={closeImport}
                disabled={importing}
              >
                Cancel
              </button>
              <button
                type="button"
                className="AdminPanel__modalBtn AdminPanel__modalBtn--primary"
                disabled={importing || importLoading || importSelected.size === 0}
                onClick={confirmImport}
              >
                {importing
                  ? 'Copying…'
                  : importSelected.size
                    ? `Copy ${importSelected.size} sponsor${importSelected.size === 1 ? '' : 's'}`
                    : 'Copy sponsors'}
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
        {headerActions}
      </div>

      {loading ? (
        <div className="AdminPanel__empty"><p>Loading…</p></div>
      ) : items.length === 0 ? (
        <div className="AdminPanel__empty SponsorsAdmin__empty">
          <MdBusiness />
          <p>No sponsors yet.</p>
          <div className="SponsorsAdmin__emptyActions">
            <button type="button" className="AdminPanel__addBtn" onClick={openCreate}>
              <MdAdd /> Add your first sponsor
            </button>
            <button
              type="button"
              className="AdminPanel__modalBtn AdminPanel__modalBtn--secondary"
              onClick={openImport}
              disabled={!canImport}
              title={canImport ? undefined : 'Select a specific season to copy into'}
            >
              <MdHistory style={{ marginRight: 4, verticalAlign: 'text-bottom' }} />
              Add from previous sponsors
            </button>
          </div>
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
                        <span className="SponsorsAdmin__rowName">
                          {row.name}
                          {isAll && (row.season || row.season_id) && (
                            <> {' '}<SeasonBadge season={row.season} /></>
                          )}
                        </span>
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
      {importModal}
    </div>
  );
}
