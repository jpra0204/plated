import { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from '../components/Toast.jsx';
import { get, post, patch, del } from '../lib/api.js';
import { queryKeys } from '../lib/queryKeys.js';
import useVoiceInput from '../hooks/useVoiceInput.js';

/**
 * Pantry — main grid view + full-screen Add Item flow.
 *
 * States:
 *   view='main'  → ingredient grid with category filters + FAB
 *   view='add'   → full-screen Add Item sheet (Scan / Voice / Manual tabs)
 */

const CATEGORIES = ['All', 'Produce', 'Dairy', 'Grains', 'Protein', 'Other'];

const UNITS_BY_CAT = {
  Produce: ['pcs', 'g', 'kg'],
  Dairy:   ['pcs', 'ml', 'g'],
  Grains:  ['g', 'kg', 'cups'],
  Protein: ['g', 'kg', 'pcs'],
  Other:   ['g', 'ml', 'tsp', 'tbsp'],
};

function formatQty(qty) {
  const n = parseFloat(qty);
  return isNaN(n) ? String(qty) : String(n);
}

function getStep(unit) {
  if (['kg', 'l'].includes(unit)) return 0.1;
  if (unit === 'g') return 10;
  if (unit === 'ml') return 50;
  return 1;
}

export default function Pantry() {
  const queryClient = useQueryClient();
  const [view, setView] = useState('main');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [toast, setToast] = useState({ visible: false, message: '' });
  const [expandedId, setExpandedId] = useState(null);
  const [expandedQty, setExpandedQty] = useState(0);
  // expiry_date for the currently expanded tile — ISO string or null
  const [expandedExpiry, setExpandedExpiry] = useState(null);
  const expandedQtyRef = useRef(null);
  const expandedUnitRef = useRef('');
  const saveTimerRef = useRef(null);

  // ── Selection mode (A7 — bulk delete) ────────────────────────────────────────
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  // [ASSUMPTION]: bulkConfirm is an in-bar confirmation step (not a modal) so it
  // doesn't block the rest of the UI and keeps the interaction lightweight.
  const [bulkConfirm, setBulkConfirm] = useState(false);

  const showToast = (message) => setToast({ visible: true, message });

  // ── Pantry query ──────────────────────────────────────────────────────────
  const {
    data: pantryData,
    isLoading: pantryLoading,
    isError: pantryError,
    refetch: refetchPantry,
  } = useQuery({
    queryKey: queryKeys.pantry.list(),
    queryFn: () => get('/api/v1/pantry'),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const allItems = useMemo(() => pantryData?.items ?? [], [pantryData]);

  // last_pantry_update is exposed on the GET /api/v1/pantry response (A4).
  const lastUpdate = pantryData?.lastPantryUpdate ?? null;

  const filtered = useMemo(() => {
    const bySearch = search
      ? allItems.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
      : allItems;
    return activeCategory === 'All'
      ? bySearch
      : bySearch.filter(i => capitalize(i.category) === activeCategory);
  }, [allItems, search, activeCategory]);

  const grouped = useMemo(() => {
    const result = {};
    for (const item of filtered) {
      const cat = capitalize(item.category);
      (result[cat] ??= []).push(item);
    }
    return result;
  }, [filtered]);

  // ── Edit mutation ─────────────────────────────────────────────────────────
  const editMutation = useMutation({
    mutationFn: ({ id, quantity, unit, expiry_date }) => {
      const body = {};
      if (quantity != null) body.quantity = quantity;
      if (unit     != null) body.unit     = unit;
      // expiry_date may be explicitly null (to clear) — send only when key present.
      if (expiry_date !== undefined) body.expiry_date = expiry_date;
      return patch(`/api/v1/pantry/${id}`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pantry.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.root() });
    },
    onError: () => showToast('Could not update item. Please try again.'),
  });

  // ── Delete mutation ───────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id) => del(`/api/v1/pantry/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pantry.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.root() });
      queryClient.invalidateQueries({ queryKey: queryKeys.recipes.suggestions() });
      showToast('Removed from pantry');
    },
    onError: () => showToast('Could not remove item. Please try again.'),
  });

  // ── Bulk delete mutation (A7) ────────────────────────────────────────────────
  const bulkDeleteMutation = useMutation({
    mutationFn: (ids) => del('/api/v1/pantry/bulk', { ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pantry.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.root() });
      queryClient.invalidateQueries({ queryKey: queryKeys.recipes.suggestions() });
      exitSelectionMode();
      showToast('Removed from pantry');
    },
    onError: () => showToast('Could not remove items. Please try again.'),
  });

  // ── Selection mode helpers (A7) ───────────────────────────────────────────────

  function enterSelectionMode() {
    flushPendingSave();
    setExpandedId(null);
    expandedQtyRef.current = null;
    setSelectionMode(true);
    setSelectedIds(new Set());
    setBulkConfirm(false);
  }

  function exitSelectionMode() {
    setSelectionMode(false);
    setSelectedIds(new Set());
    setBulkConfirm(false);
  }

  function toggleSelection(itemId, e) {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  function handleBulkDeletePress() {
    if (selectedIds.size === 0) return;
    setBulkConfirm(true);
  }

  function confirmBulkDelete() {
    bulkDeleteMutation.mutate(Array.from(selectedIds));
  }

  // ── Tile expand / stepper ─────────────────────────────────────────────────

  function flushPendingSave() {
    if (saveTimerRef.current !== null) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
      if (expandedId && expandedQtyRef.current !== null) {
        editMutation.mutate({ id: expandedId, quantity: expandedQtyRef.current, unit: expandedUnitRef.current });
      }
    }
  }

  function handleTileClick(item) {
    if (expandedId === item.id) { handleClose(); return; }
    flushPendingSave();
    const qty = parseFloat(item.quantity) || 0;
    setExpandedId(item.id);
    setExpandedQty(qty);
    setExpandedExpiry(item.expiry_date ?? null);
    expandedQtyRef.current = qty;
    expandedUnitRef.current = item.unit;
  }

  function handleClose() {
    flushPendingSave();
    setExpandedId(null);
    setExpandedExpiry(null);
    expandedQtyRef.current = null;
  }

  /**
   * Save an expiry date change immediately (no debounce — single deliberate user action).
   * dateInputValue is 'YYYY-MM-DD' from <input type="date">, or '' to clear.
   *
   * [ASSUMPTION]: expiry_date is stored as UTC midnight of the selected date.
   * Using 'T00:00:00Z' so the date value is unambiguous regardless of client timezone.
   */
  function handleExpiryChange(itemId, dateInputValue) {
    const newExpiry = dateInputValue ? new Date(dateInputValue + 'T00:00:00Z').toISOString() : null;
    setExpandedExpiry(newExpiry);
    editMutation.mutate({ id: itemId, expiry_date: newExpiry });
  }

  function handleStep(itemId, delta) {
    const newQty = Math.max(0, parseFloat(((expandedQtyRef.current ?? 0) + delta).toFixed(3)));
    expandedQtyRef.current = newQty;
    setExpandedQty(newQty);
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      editMutation.mutate({ id: itemId, quantity: newQty, unit: expandedUnitRef.current });
    }, 600);
  }

  function handleInlineDelete(id) {
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = null;
    setExpandedId(null);
    expandedQtyRef.current = null;
    deleteMutation.mutate(id);
  }

  // ── Add item callback (from AddItemScreen) ────────────────────────────────
  function handleItemAdded() {
    setView('main');
    queryClient.invalidateQueries({ queryKey: queryKeys.pantry.all() });
    queryClient.invalidateQueries({ queryKey: queryKeys.profile.root() });
    queryClient.invalidateQueries({ queryKey: queryKeys.recipes.suggestions() });
    showToast('Added to your pantry');
  }

  // ── Add Item full-screen ──────────────────────────────────────────────────
  if (view === 'add') {
    return (
      <AddItemScreen
        onBack={() => setView('main')}
        onAdded={handleItemAdded}
      />
    );
  }

  // ── Main view ─────────────────────────────────────────────────────────────
  return (
    <div
      className={`page page--relative${selectionMode ? ' page--selection-mode' : ''}`}
      onClick={() => { if (expandedId && !selectionMode) handleClose(); }}
    >
      <div className="page-header">
        <h1 className="page-title">My pantry</h1>
        {/* "Select" link — hidden once selection mode is active (Cancel lives in the action bar) */}
        {!selectionMode && (
          <button
            className="select-link"
            onClick={enterSelectionMode}
            aria-label="Select pantry items"
          >
            Select
          </button>
        )}
      </div>
      {lastUpdate && (
        <p className="last-updated-line">
          {formatLastUpdate(lastUpdate)}
        </p>
      )}

      <Toast
        message={toast.message}
        visible={toast.visible}
        onDismiss={() => setToast(t => ({ ...t, visible: false }))}
      />

      {/* Search */}
      <div className="search-bar">
        <SearchIcon aria-hidden="true" />
        <input
          className="search-bar__input"
          placeholder="Search ingredients…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="Search pantry"
        />
        {search && (
          <button className="search-bar__clear" onClick={() => setSearch('')} aria-label="Clear search">×</button>
        )}
      </div>

      {/* Category chips */}
      <div className="chips-row">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`chip ${activeCategory === cat ? 'chip--active' : ''}`}
            onClick={() => setActiveCategory(cat)}
            aria-pressed={activeCategory === cat}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Content */}
      {pantryLoading ? (
        <div className="empty-state"><p>Loading your pantry…</p></div>
      ) : pantryError ? (
        <div className="empty-state">
          <p>Could not load pantry.</p>
          <button className="btn btn--secondary" onClick={() => refetchPantry()}>Try again</button>
        </div>
      ) : allItems.length === 0 ? (
        <div className="empty-state">
          <p>Your pantry is empty. Tap + to add ingredients.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <p>No ingredients match &ldquo;{search}&rdquo;</p>
        </div>
      ) : (
        Object.entries(grouped).map(([cat, items]) => (
          <div key={cat}>
            <p className="cat-label">{cat}</p>
            <div className="ing-grid">
              {items.map(item => {
                if (selectionMode) {
                  const isSelected = selectedIds.has(item.id);
                  return (
                    <div
                      key={item.id}
                      className={`ing-tile ing-tile--selectable${isSelected ? ' ing-tile--selected' : ''}`}
                      onClick={e => toggleSelection(item.id, e)}
                      role="checkbox"
                      aria-checked={isSelected}
                      aria-label={item.name}
                    >
                      <div className="ing-tile__checkbox" aria-hidden="true">
                        {isSelected ? <CheckboxCheckedIcon /> : <CheckboxUncheckedIcon />}
                      </div>
                      <div className="ing-tile__emoji" aria-hidden="true" />
                      <div className="ing-tile__body">
                        <div className="ing-tile__name">{item.name}</div>
                        <div className="ing-tile__qty">{formatQty(item.quantity)} {item.unit}</div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={item.id}
                    className={`ing-tile${expandedId === item.id ? ' ing-tile--editing' : ''}`}
                    onClick={e => { e.stopPropagation(); handleTileClick(item); }}
                  >
                    {expandedId === item.id ? (
                      <>
                        <div className="expanded-top">
                          <div className="expanded-top__info">
                            <div className="ing-tile__emoji" aria-hidden="true" />
                            <span className="expanded-top__name">{item.name}</span>
                          </div>
                          <button
                            className="tile-delete-btn"
                            onClick={e => { e.stopPropagation(); handleInlineDelete(item.id); }}
                            aria-label={`Delete ${item.name}`}
                          >
                            <TrashIcon aria-hidden="true" />
                          </button>
                        </div>

                        <div className="tile-stepper">
                          <button
                            className="tile-stepper__btn"
                            onClick={e => { e.stopPropagation(); handleStep(item.id, -getStep(item.unit)); }}
                            disabled={expandedQty <= 0}
                            aria-label="Decrease quantity"
                          >
                            <MinusIcon aria-hidden="true" />
                          </button>
                          <span className="tile-stepper__val">{formatQty(expandedQty)} {item.unit}</span>
                          <button
                            className="tile-stepper__btn"
                            onClick={e => { e.stopPropagation(); handleStep(item.id, getStep(item.unit)); }}
                            aria-label="Increase quantity"
                          >
                            <PlusIcon aria-hidden="true" />
                          </button>
                        </div>

                        {/* Expiry date editor — shown in expanded state */}
                        <div className="expiry-editor">
                          <label className="expiry-editor__label" htmlFor={`expiry-${item.id}`}>
                            Use by
                          </label>
                          <div className="expiry-editor__row">
                            <input
                              id={`expiry-${item.id}`}
                              className="expiry-editor__input"
                              type="date"
                              value={toDateInputValue(expandedExpiry)}
                              onChange={e => handleExpiryChange(item.id, e.target.value)}
                              onClick={e => e.stopPropagation()}
                              aria-label={`Expiry date for ${item.name}`}
                            />
                            {expandedExpiry && (
                              <button
                                className="expiry-editor__clear"
                                onClick={e => { e.stopPropagation(); handleExpiryChange(item.id, ''); }}
                                aria-label="Clear expiry date"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="expanded-hint">Changes save automatically · tap outside to close</p>
                      </>
                    ) : (
                      <>
                        <div className="ing-tile__emoji" aria-hidden="true" />
                        <div className="ing-tile__body">
                          <div className="ing-tile__name">{item.name}</div>
                          <div className="ing-tile__qty">{formatQty(item.quantity)} {item.unit}</div>
                          {item.expiry_date && (
                            <div
                              className={`ing-tile__expiry${isExpiringSoon(item.expiry_date) ? ' ing-tile__expiry--warning' : ''}`}
                              aria-label={formatExpiry(item.expiry_date)}
                            >
                              {isExpiringSoon(item.expiry_date) && (
                                <WarningIcon className="ing-tile__expiry-icon" aria-hidden="true" />
                              )}
                              {formatExpiry(item.expiry_date)}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* FAB — hidden during selection mode */}
      {!selectionMode && (
        <button className="fab" onClick={() => setView('add')} aria-label="Add ingredient">
          <PlusIcon aria-hidden="true" />
        </button>
      )}

      {/* Bulk action bar — docked above the tab bar during selection mode */}
      {selectionMode && (
        <div className="bulk-action-bar" role="toolbar" aria-label="Bulk delete actions">
          {bulkConfirm ? (
            <>
              <p className="bulk-confirm__prompt">
                Delete {selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''}?
              </p>
              <div className="bulk-action-bar__row">
                <button
                  className="btn btn--secondary"
                  onClick={() => setBulkConfirm(false)}
                  disabled={bulkDeleteMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  className="btn btn--danger btn--flex2"
                  onClick={confirmBulkDelete}
                  disabled={bulkDeleteMutation.isPending}
                >
                  {bulkDeleteMutation.isPending ? 'Deleting…' : 'Confirm'}
                </button>
              </div>
            </>
          ) : (
            <div className="bulk-action-bar__row">
              <button
                className="btn btn--secondary"
                onClick={exitSelectionMode}
              >
                Cancel
              </button>
              <button
                className="btn btn--danger btn--flex2"
                onClick={handleBulkDeletePress}
                disabled={selectedIds.size === 0}
                aria-disabled={selectedIds.size === 0}
              >
                Delete ({selectedIds.size})
              </button>
            </div>
          )}
        </div>
      )}

      <div className="page-bottom" />
    </div>
  );
}

// ── Add Item full-screen ───────────────────────────────────────────────────────

function AddItemScreen({ onBack, onAdded }) {
  const [tab, setTab] = useState('voice');

  const TABS = [
    // { id: 'scan',   label: 'Scan',   icon: ScanIcon },
    { id: 'voice',  label: 'Voice',  icon: MicIcon },
    { id: 'manual', label: 'Manual', icon: PencilIcon },
  ];

  return (
    <div className="page">
      <div className="fs-nav">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeftIcon aria-hidden="true" /> Pantry
        </button>
        <h1 className="fs-nav__title">Add item</h1>
        <div className="fs-nav__spacer" />
      </div>

      <div className="method-tabs">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`method-tab ${tab === id ? 'method-tab--active' : ''}`}
            onClick={() => setTab(id)}
            aria-pressed={tab === id}
          >
            <Icon aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'scan'   && <ScanTab onSwitchManual={() => setTab('manual')} />}
      {tab === 'voice'  && <VoiceTab onAdded={onAdded} />}
      {tab === 'manual' && <ManualTab onAdded={onAdded} />}

      <div className="page-bottom" />
    </div>
  );
}

// ── Scan tab ──────────────────────────────────────────────────────────────────

function ScanTab({ onSwitchManual }) {
  return (
    <>
      <div className="scan-viewport" aria-label="Camera viewfinder">
        <div className="scan-corner scan-corner--tl" />
        <div className="scan-corner scan-corner--tr" />
        <div className="scan-corner scan-corner--bl" />
        <div className="scan-corner scan-corner--br" />
        <div className="scan-line" />
      </div>
      <p className="scan-hint">Point your camera at a barcode or food label</p>
      <div className="scan-or">
        <div className="scan-or__line" />
        <span>or add manually</span>
        <div className="scan-or__line" />
      </div>
      <button className="manual-trigger" onClick={onSwitchManual}>
        <PencilIcon aria-hidden="true" /> Type an ingredient instead
      </button>
    </>
  );
}

// ── Voice tab ─────────────────────────────────────────────────────────────────

function VoiceTab({ onAdded }) {
  const queryClient = useQueryClient();
  const [parsedItems, setParsedItems] = useState([]); // [{name,quantity,unit,...}] editable
  const [showParsed, setShowParsed]   = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '' });

  const voiceMutation = useMutation({
    mutationFn: (transcript) => post('/api/v1/pantry/voice', { transcript }),
    onSuccess: (data) => {
      setParsedItems(data.items ?? []);
      setShowParsed(true);
    },
    onError: () => {
      setToast({ visible: true, message: 'Could not parse voice input. Please try again.' });
    },
  });

  const bulkMutation = useMutation({
    mutationFn: (items) => post('/api/v1/pantry/bulk', { items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pantry.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.root() });
      queryClient.invalidateQueries({ queryKey: queryKeys.recipes.suggestions() });
      onAdded();
    },
    onError: () => setToast({ visible: true, message: 'Could not add items. Please try again.' }),
  });

  const { supported, start, stop, status } = useVoiceInput({
    onResult: (finalTranscript) => voiceMutation.mutate(finalTranscript),
  });

  function handleMicTap() {
    if (status === 'idle') {
      start();
    } else if (status === 'listening') {
      stop();
    }
  }

  function handleRedo() {
    setParsedItems([]);
    setShowParsed(false);
  }

  function updateItem(i, field, value) {
    setParsedItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  }

  const isProcessing = status === 'processing' || voiceMutation.isPending;

  if (!supported) {
    return (
      <div className="voice-area">
        <div className="empty-state">
          <p>Voice input isn&rsquo;t supported in this browser.</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            Try Chrome or Edge, or use the Manual tab instead.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="voice-area">
      <Toast
        message={toast.message}
        visible={toast.visible}
        onDismiss={() => setToast(t => ({ ...t, visible: false }))}
      />

      {!showParsed && (
        <>
          <button
            className={`mic-ring ${status === 'listening' ? 'mic-ring--listening' : ''}`}
            onClick={handleMicTap}
            disabled={isProcessing}
            aria-label={status === 'listening' ? 'Stop listening' : 'Start listening'}
          >
            <MicIcon aria-hidden="true" />
          </button>
          <p className="voice-hint">
            {status === 'listening'
              ? 'Listening… tap to stop'
              : isProcessing
                ? 'Processing…'
                : 'Tap the mic and say your ingredients.\nYou can list multiple at once.'}
          </p>
          {status === 'idle' && !isProcessing && (
            <div className="voice-example">&ldquo;6 eggs, 500g of rice, 2 onions, 1L of milk&rdquo;</div>
          )}
        </>
      )}

      {showParsed && (
        <>
          <p className="section-label">Heard {parsedItems.length} items — edit if needed, then add</p>
          <div className="voice-parsed">
            {parsedItems.map((item, i) => (
              <div key={i} className="parsed-row">
                <div className="parsed-row__name">
                  <CheckCircleIcon aria-hidden="true" /> {item.name}
                </div>
                <div className="parsed-row__edit">
                  <input
                    className="parsed-row__qty-input"
                    type="number"
                    min="0"
                    value={item.quantity}
                    onChange={e => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)}
                    aria-label={`Quantity for ${item.name}`}
                  />
                  <input
                    className="parsed-row__unit-input"
                    value={item.unit}
                    onChange={e => updateItem(i, 'unit', e.target.value)}
                    aria-label={`Unit for ${item.name}`}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="cta-row">
            <button className="btn btn--secondary" onClick={handleRedo} disabled={bulkMutation.isPending}>
              <MicIcon aria-hidden="true" /> Redo
            </button>
            <button
              className="btn btn--primary btn--flex2"
              onClick={() => bulkMutation.mutate(parsedItems)}
              disabled={bulkMutation.isPending}
            >
              <PlusCircleIcon aria-hidden="true" />
              {bulkMutation.isPending ? 'Adding…' : 'Add all to pantry'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Manual tab ────────────────────────────────────────────────────────────────

function ManualTab() {
  const queryClient = useQueryClient();

  const [query, setQuery]       = useState('');
  const [selected, setSelected] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit]         = useState('');
  const [category, setCategory] = useState('');
  const [toast, setToast]       = useState({ visible: false, message: '' });

  // Ingredient catalogue for autosuggest
  const { data: catalogueData } = useQuery({
    queryKey: queryKeys.ingredients.catalogue(),
    queryFn: () => get('/api/v1/ingredients'),
    staleTime: Infinity, // catalogue rarely changes
  });
  const suggestions = useMemo(() => {
    if (!query || selected) return [];
    const catalogue = catalogueData?.ingredients ?? [];
    return catalogue
      .filter(i => i.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5);
  }, [query, selected, catalogueData]);

  const addMutation = useMutation({
    mutationFn: (item) => post('/api/v1/pantry', item),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pantry.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.root() });
      queryClient.invalidateQueries({ queryKey: queryKeys.recipes.suggestions() });
      setToast({ visible: true, message: `${variables.name} added to pantry!` });
      setSelected(null);
      setQuery('');
      setQuantity('');
      setUnit('');
      setCategory('');
    },
    onError: () => setToast({ visible: true, message: 'Could not add item. Please try again.' }),
  });

  function handleSelect(ing) {
    setSelected(ing);
    setQuery(ing.name);
    setUnit(ing.default_unit);
    setCategory(capitalize(ing.category));
  }

  function handleClear() {
    setSelected(null);
    setQuery('');
    setUnit('');
    setCategory('');
  }

  function handleAdd() {
    if (!selected || !quantity) return;
    addMutation.mutate({
      name:          selected.name,
      category:      selected.category,   // DB uses lowercase
      quantity:      parseFloat(quantity),
      unit,
      ingredient_id: selected.id,
    });
  }

  const unitOptions = UNITS_BY_CAT[category] ?? ['g', 'ml', 'pcs'];

  return (
    <>
      <Toast
        message={toast.message}
        visible={toast.visible}
        variant={addMutation.isError ? 'default' : 'success'}
        onDismiss={() => setToast(t => ({ ...t, visible: false }))}
      />

      <div className="form-field">
        <label className="form-label" htmlFor="ing-name">Ingredient name</label>
        <div className={`form-input ${selected ? 'form-input--selected' : query ? 'form-input--active' : ''}`}>
          <input
            id="ing-name"
            className="form-input__text"
            placeholder="Type an ingredient…"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(null); }}
            autoComplete="off"
          />
          {(query || selected) && (
            <button className="form-input__clear" onClick={handleClear} aria-label="Clear">
              {selected ? <CheckCircleIcon className="icon--primary" aria-hidden="true" /> : '×'}
            </button>
          )}
        </div>

        {suggestions.length > 0 && (
          <div className="autosuggest-list">
            {suggestions.map(ing => (
              <button
                key={ing.id}
                className="suggest-row"
                type="button"
                onClick={() => handleSelect(ing)}
              >
                <div className="suggest-row__icon" aria-hidden="true" />
                <div>
                  <div className="suggest-row__name">{ing.name}</div>
                  <div className="suggest-row__cat">{capitalize(ing.category)}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <>
          <div className="qty-unit-row">
            <div className="form-field">
              <label className="form-label" htmlFor="ing-qty">Quantity</label>
              <input
                id="ing-qty"
                className="form-input form-input--text"
                type="number"
                min="0"
                placeholder="0"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="ing-unit">Unit</label>
              <div className="unit-selector">
                <select
                  id="ing-unit"
                  className="unit-selector__select"
                  value={unit}
                  onChange={e => setUnit(e.target.value)}
                >
                  {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                {unit === selected.default_unit && (
                  <span className="unit-auto-badge">Auto</span>
                )}
              </div>
            </div>
          </div>

          <div className="form-field">
            <label className="form-label">Category</label>
            <div className="chips-row">
              {['Produce', 'Protein', 'Dairy', 'Grains', 'Other'].map(cat => (
                <button
                  key={cat}
                  className={`chip chip--sm ${category === cat ? 'chip--secondary' : ''}`}
                  onClick={() => setCategory(cat)}
                  aria-pressed={category === cat}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <button
            className="btn btn--primary btn--large btn--full"
            onClick={handleAdd}
            disabled={!quantity || addMutation.isPending}
          >
            <PlusCircleIcon aria-hidden="true" />
            {addMutation.isPending ? 'Adding…' : 'Add to pantry'}
          </button>
        </>
      )}
    </>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function capitalize(str = '') {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Return a human-readable relative time string for a UTC date string.
 * e.g. "2h ago", "3m ago", "just now"
 *
 * @param {string} dateStr - ISO 8601 timestamp
 * @returns {string}
 */
function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)      return 'just now';
  if (diff < 3600)    return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)   return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return `${Math.floor(diff / 2592000)}mo ago`;
}

/**
 * Return the number of whole days until expiryDate from now.
 * Negative values mean the item has already expired.
 * Returns null if expiryDate is falsy.
 *
 * @param {string|null} expiryDate - ISO 8601 timestamp
 * @returns {number|null}
 */
function daysUntilExpiry(expiryDate) {
  if (!expiryDate) return null;
  const msPerDay = 24 * 60 * 60 * 1000;
  const diff = new Date(expiryDate).getTime() - Date.now();
  return Math.floor(diff / msPerDay);
}

/**
 * Format the expiry date into a human-readable countdown string shown on the tile.
 *
 * @param {string|null} expiryDate - ISO 8601 timestamp
 * @returns {string|null}
 */
function formatExpiry(expiryDate) {
  const days = daysUntilExpiry(expiryDate);
  if (days === null) return null;
  if (days < 0)  return 'Expired';
  if (days === 0) return 'Expires today';
  if (days === 1) return 'Expires in 1 day';
  return `Expires in ${days} days`;
}

/**
 * Returns true when the item is expiring within the 3-day warning threshold.
 * Expired items (days < 0) are also considered "expiring soon" for amber styling.
 *
 * [ASSUMPTION]: "Expiring soon" threshold is 3 days, matching the spec.
 *
 * @param {string|null} expiryDate - ISO 8601 timestamp
 * @returns {boolean}
 */
function isExpiringSoon(expiryDate) {
  const days = daysUntilExpiry(expiryDate);
  return days !== null && days <= 3;
}

/**
 * Convert an ISO timestamp to a YYYY-MM-DD string for <input type="date">.
 * Returns '' if expiryDate is falsy.
 *
 * @param {string|null} expiryDate - ISO 8601 timestamp
 * @returns {string}
 */
function toDateInputValue(expiryDate) {
  if (!expiryDate) return '';
  // ISO strings start with YYYY-MM-DD — slice is safe.
  return expiryDate.slice(0, 10);
}

/**
 * Format the last_pantry_update object into the display string shown below
 * the Pantry header: "Last updated: {label} · {time ago}"
 *
 * @param {{ type: string, recipe_name?: string, updated_at: string }|null} update
 * @returns {string|null}
 */
function formatLastUpdate(update) {
  if (!update) return null;
  const { type, recipe_name, updated_at } = update;
  // [ASSUMPTION]: If recipe_name is missing on a 'cook' record, fall back to 'Cook this'.
  const label =
    type === 'cook'   ? (recipe_name || 'Cook this') :
    type === 'add'    ? 'manual add'    :
    type === 'edit'   ? 'manual edit'   :
    type === 'delete' ? 'manual delete' :
    type;
  return `Last updated: ${label} · ${timeAgo(updated_at)}`;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function SearchIcon(props)     { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>; }
function PlusIcon(props)       { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>; }
function MinusIcon(props)      { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>; }
function PlusCircleIcon(props) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>; }
function ArrowLeftIcon(props)  { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>; }
// eslint-disable-next-line no-unused-vars
function ScanIcon(props)       { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><line x1="3" y1="12" x2="21" y2="12" /></svg>; }
function MicIcon(props)        { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>; }
function PencilIcon(props)     { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>; }
function TrashIcon(props)      { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>; }
function CheckCircleIcon({ className, ...props }) { return <svg className={className} {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>; }
/* Checkbox icons for selection mode (A7) */
function CheckboxCheckedIcon(props)   { return <svg {...props} viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="2" y="2" width="20" height="20" rx="5" /><polyline points="7 12 10.5 15.5 17 9" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>; }
function CheckboxUncheckedIcon(props) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" /></svg>; }
/* Warning icon for expiring-soon indicator on pantry tiles */
function WarningIcon(props) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>; }
