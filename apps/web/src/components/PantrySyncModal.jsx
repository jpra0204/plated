import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, patch, del } from '../lib/api.js';
import { queryKeys } from '../lib/queryKeys.js';
import useVoiceInput from '../hooks/useVoiceInput.js';

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

/**
 * Bottom-sheet modal that lets the user quickly reconcile pantry quantities
 * after cooking. Triggered by usePantrySync based on meal-time windows.
 */
export default function PantrySyncModal({ mealLabel, onClose }) {
  const queryClient = useQueryClient();
  const [localQties, setLocalQties] = useState({});
  const localQtiesRef = useRef({});
  const saveTimersRef = useRef({});
  const [voiceError, setVoiceError] = useState('');
  const [voicePending, setVoicePending] = useState(false);

  const { data: pantryData } = useQuery({
    queryKey: queryKeys.pantry.list(),
    queryFn: () => get('/api/v1/pantry'),
    staleTime: 30_000,
  });

  const items = pantryData?.items ?? [];

  function getDisplayQty(item) {
    return localQties[item.id] ?? parseFloat(item.quantity);
  }

  const editMutation = useMutation({
    mutationFn: ({ id, quantity, unit }) => patch(`/api/v1/pantry/${id}`, { quantity, unit }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pantry.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.root() });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => del(`/api/v1/pantry/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pantry.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.root() });
      queryClient.invalidateQueries({ queryKey: queryKeys.recipes.suggestions() });
    },
  });

  const voiceSyncMutation = useMutation({
    mutationFn: (transcript) => post('/api/v1/pantry/voice-sync', { transcript }),
    onSuccess: (data) => {
      setVoiceError('');
      setVoicePending(false);
      (data.updates ?? []).forEach(({ id, newQuantity, unit }) => {
        applyQty(id, newQuantity, unit);
      });
    },
    onError: () => {
      setVoiceError("Couldn't quite catch that — try again or adjust manually");
      setVoicePending(false);
    },
  });

  const { supported, start, stop, status: voiceStatus } = useVoiceInput({
    onResult: (transcript) => {
      setVoicePending(true);
      setVoiceError('');
      voiceSyncMutation.mutate(transcript);
    },
  });

  function applyQty(id, newQty, unit) {
    const clamped = Math.max(0, parseFloat(parseFloat(newQty).toFixed(3)));
    localQtiesRef.current[id] = clamped;
    setLocalQties(prev => ({ ...prev, [id]: clamped }));
    scheduleSave(id, clamped, unit);
  }

  function scheduleSave(id, qty, unit) {
    clearTimeout(saveTimersRef.current[id]);
    saveTimersRef.current[id] = setTimeout(() => {
      editMutation.mutate({ id, quantity: qty, unit });
    }, 600);
  }

  function handleStep(item, delta) {
    const current = localQtiesRef.current[item.id] ?? parseFloat(item.quantity);
    const newQty = Math.max(0, parseFloat((current + delta).toFixed(3)));
    applyQty(item.id, newQty, item.unit);
  }

  function handleDelete(id) {
    clearTimeout(saveTimersRef.current[id]);
    delete saveTimersRef.current[id];
    delete localQtiesRef.current[id];
    setLocalQties(prev => { const n = { ...prev }; delete n[id]; return n; });
    deleteMutation.mutate(id);
  }

  const isListening  = voiceStatus === 'listening';
  const isProcessing = voicePending || voiceSyncMutation.isPending;

  return (
    <div
      className="sync-scrim"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Quick pantry update"
    >
      <div className="sync-sheet" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="sync-header">
          <div>
            <h2 className="sync-title">Quick pantry update</h2>
            <p className="sync-subtitle">
              Cooked something since your last visit? Update your pantry so Chef stays accurate.
            </p>
          </div>
          <button className="sync-close-btn" onClick={onClose} aria-label="Close">
            <XIcon />
          </button>
        </div>

        {/* Meal badge */}
        <div className="sync-badge">{mealLabel}</div>

        {/* Scrollable body */}
        <div className="sync-body">

          {/* Voice bar */}
          {supported && (
            <div className="sync-voice-bar">
              <button
                className={`sync-mic-btn${isListening ? ' sync-mic-btn--active' : ''}`}
                onClick={() => isListening ? stop() : start()}
                disabled={isProcessing}
                aria-label={isListening ? 'Stop listening' : 'Start voice input'}
              >
                <MicIcon />
              </button>
              <p className="sync-voice-text">
                {isListening
                  ? 'Listening…'
                  : isProcessing
                    ? 'Processing…'
                    : '"used 2 eggs and half the rice"  or  "eggs −2, rice −100g"'}
              </p>
            </div>
          )}

          {voiceError && <p className="sync-voice-error">{voiceError}</p>}

          {/* Pantry rows */}
          {items.length === 0 ? (
            <p className="sync-empty">Your pantry is empty.</p>
          ) : (
            <div className="sync-list">
              {items.map(item => {
                const qty  = getDisplayQty(item);
                const step = getStep(item.unit);
                return (
                  <div key={item.id} className="sync-row">
                    <div className="sync-row__info">
                      <div className="sync-row__emoji" aria-hidden="true" />
                      <div>
                        <div className="sync-row__name">{item.name}</div>
                        <div className="sync-row__unit">{item.unit}</div>
                      </div>
                    </div>

                    <div className="sync-row__controls">
                      <div className="sync-stepper">
                        <button
                          className="sync-stepper__btn"
                          onClick={() => handleStep(item, -step)}
                          disabled={qty <= 0}
                          aria-label={`Decrease ${item.name}`}
                        >
                          <MinusIcon />
                        </button>
                        <span className="sync-stepper__val">{formatQty(qty)}</span>
                        <button
                          className="sync-stepper__btn"
                          onClick={() => handleStep(item, step)}
                          aria-label={`Increase ${item.name}`}
                        >
                          <PlusIcon />
                        </button>
                      </div>
                      <button
                        className="sync-delete-btn"
                        onClick={() => handleDelete(item.id)}
                        aria-label={`Delete ${item.name}`}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sync-footer">
          <p className="sync-autosave-note">
            <CheckIcon aria-hidden="true" /> Changes save automatically
          </p>
          <button className="btn btn--primary btn--full" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function XIcon(props)     { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>; }
function MicIcon(props)   { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>; }
function TrashIcon(props) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>; }
function PlusIcon(props)  { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function MinusIcon(props) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function CheckIcon(props) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>; }
