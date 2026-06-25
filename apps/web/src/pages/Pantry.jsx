 
import { useState, useMemo } from 'react';
import { FAKE_PANTRY, INGREDIENT_CATALOGUE } from '../data/fakeData.js';

/**
 * Pantry — main grid view + full-screen Add Item flow.
 *
 * States:
 *   view='main'     → ingredient grid with category filters + FAB
 *   view='add'      → full-screen Add Item sheet (Scan / Voice / Manual tabs)
 *
 * Add Item sub-states (tab):
 *   'scan'     → camera viewport placeholder + manual fallback
 *   'voice'    → mic button; voiceState='idle'|'listening'|'parsed'
 *   'manual'   → autosuggest input → item confirmation form
 */

const CATEGORIES = ['All', 'Produce', 'Dairy', 'Grains', 'Protein', 'Other'];

export default function Pantry() {
  const [view, setView] = useState('main');   // 'main' | 'add'
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  // Flatten pantry for filtering
  const allItems = useMemo(() => Object.entries(FAKE_PANTRY).flatMap(
    ([cat, items]) => items.map(item => ({ ...item, category: cat }))
  ), []);

  const filtered = useMemo(() => {
    const bySearch = search
      ? allItems.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
      : allItems;
    return activeCategory === 'All'
      ? bySearch
      : bySearch.filter(i => i.category === activeCategory);
  }, [allItems, search, activeCategory]);

  // Group filtered items by category
  const grouped = useMemo(() => {
    const result = {};
    for (const item of filtered) {
      (result[item.category] ??= []).push(item);
    }
    return result;
  }, [filtered]);

  if (view === 'add') {
    return <AddItemScreen onBack={() => setView('main')} />;
  }

  return (
    <div className="page page--relative">
      <div className="page-header">
        <h1 className="page-title">My pantry</h1>
        <span className="page-count">{allItems.length} items</span>
      </div>

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

      {/* Ingredient grid by category */}
      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat}>
          <p className="cat-label">{cat}</p>
          <div className="ing-grid">
            {items.map(item => (
              <div key={item.id} className="ing-tile">
                <div className="ing-tile__icon" aria-hidden="true" />
                <div>
                  <div className="ing-tile__name">{item.name}</div>
                  <div className="ing-tile__qty">{item.quantity} {item.unit}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <p className="empty-state">No ingredients match &ldquo;{search}&rdquo;</p>
      )}

      {/* FAB */}
      <button className="fab" onClick={() => setView('add')} aria-label="Add ingredient">
        <PlusIcon aria-hidden="true" />
      </button>

      <div className="page-bottom" />
    </div>
  );
}

// ── Add Item full-screen ───────────────────────────────────────────────────────

function AddItemScreen({ onBack }) {
  const [tab, setTab] = useState('scan'); // 'scan' | 'voice' | 'manual'

  const TABS = [
    { id: 'scan',   label: 'Scan',   icon: ScanIcon },
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

      {/* Method tabs */}
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
      {tab === 'voice'  && <VoiceTab onBack={onBack} />}
      {tab === 'manual' && <ManualTab onBack={onBack} />}

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

const FAKE_PARSED = [
  { name: 'Eggs',   quantity: 6,   unit: 'pcs' },
  { name: 'Rice',   quantity: 500, unit: 'g' },
  { name: 'Onions', quantity: 2,   unit: 'pcs' },
  { name: 'Milk',   quantity: 1,   unit: 'L' },
];

function VoiceTab({ onBack }) {
  const [voiceState, setVoiceState] = useState('idle'); // 'idle' | 'listening' | 'parsed'

  function handleMicTap() {
    if (voiceState === 'idle') {
      setVoiceState('listening');
      // Simulate 2 s of listening then parse
      setTimeout(() => setVoiceState('parsed'), 2000);
    } else if (voiceState === 'listening') {
      setVoiceState('parsed');
    }
  }

  function handleRedo() {
    setVoiceState('idle');
  }

  return (
    <div className="voice-area">
      {voiceState !== 'parsed' && (
        <>
          <button
            className={`mic-ring ${voiceState === 'listening' ? 'mic-ring--active' : ''}`}
            onClick={handleMicTap}
            aria-label={voiceState === 'listening' ? 'Stop listening' : 'Start listening'}
          >
            <MicIcon aria-hidden="true" />
          </button>
          <p className="voice-hint">
            {voiceState === 'listening'
              ? 'Listening… tap to stop'
              : 'Tap the mic and say your ingredients.\nYou can list multiple at once.'}
          </p>
          {voiceState === 'idle' && (
            <div className="voice-example">&ldquo;6 eggs, 500g of rice, 2 onions, 1L of milk&rdquo;</div>
          )}
        </>
      )}

      {voiceState === 'parsed' && (
        <>
          <p className="section-label">Heard {FAKE_PARSED.length} items — confirm to add</p>
          <div className="voice-parsed">
            {FAKE_PARSED.map((item, i) => (
              <div key={i} className="parsed-row">
                <div className="parsed-row__name">
                  <CheckCircleIcon aria-hidden="true" /> {item.name}
                </div>
                <span className="parsed-row__qty">{item.quantity} {item.unit}</span>
              </div>
            ))}
          </div>
          <div className="cta-row">
            <button className="btn btn--secondary" onClick={handleRedo}>
              <MicIcon aria-hidden="true" /> Redo
            </button>
            <button className="btn btn--primary btn--flex2" onClick={onBack}>
              <PlusCircleIcon aria-hidden="true" /> Add all to pantry
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Manual tab ────────────────────────────────────────────────────────────────

const UNITS_BY_CAT = {
  Produce: ['pcs', 'g', 'kg'],
  Dairy:   ['pcs', 'ml', 'g'],
  Grains:  ['g', 'kg', 'cups'],
  Protein: ['g', 'kg', 'pcs'],
  Other:   ['g', 'ml', 'tsp', 'tbsp'],
};

function ManualTab({ onBack }) {
  const [query, setQuery]         = useState('');
  const [selected, setSelected]   = useState(null);
  const [quantity, setQuantity]   = useState('');
  const [unit, setUnit]           = useState('');
  const [category, setCategory]   = useState('');

  const suggestions = useMemo(() => {
    if (!query || selected) return [];
    return INGREDIENT_CATALOGUE
      .filter(i => i.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5);
  }, [query, selected]);

  function handleSelect(ing) {
    setSelected(ing);
    setQuery(ing.name);
    setUnit(ing.defaultUnit);
    setCategory(ing.category);
  }

  function handleClear() {
    setSelected(null);
    setQuery('');
    setUnit('');
    setCategory('');
  }

  const unitOptions = UNITS_BY_CAT[category] ?? ['g', 'ml', 'pcs'];

  return (
    <>
      {/* Ingredient name field */}
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
              <div key={ing.id} className="suggest-row" onClick={() => handleSelect(ing)} role="button" tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && handleSelect(ing)}>
                <div className="suggest-row__icon" aria-hidden="true" />
                <div>
                  <div className="suggest-row__name">{ing.name}</div>
                  <div className="suggest-row__cat">{ing.category}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <>
          {/* Quantity + unit */}
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
                {unit === selected.defaultUnit && (
                  <span className="unit-auto-badge">Auto</span>
                )}
              </div>
            </div>
          </div>

          {/* Category */}
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
            onClick={onBack}
            disabled={!quantity}
          >
            <PlusCircleIcon aria-hidden="true" /> Add to pantry
          </button>
        </>
      )}
    </>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function SearchIcon(props)     { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>; }
function PlusIcon(props)       { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>; }
function PlusCircleIcon(props) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>; }
function ArrowLeftIcon(props)  { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>; }
function ScanIcon(props)       { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><line x1="3" y1="12" x2="21" y2="12" /></svg>; }
function MicIcon(props)        { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>; }
function PencilIcon(props)     { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>; }
function CheckCircleIcon({ className, ...props }) { return <svg className={className} {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>; }
