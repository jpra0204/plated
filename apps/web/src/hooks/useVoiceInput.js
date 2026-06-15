/**
 * useVoiceInput — wraps the Web Speech API (SpeechRecognition) for voice capture.
 *
 * TODO: implement full hook.
 *
 * Planned interface:
 *
 *   const { isListening, transcript, start, stop, error } = useVoiceInput({
 *     onResult: (finalTranscript) => { ... },
 *   });
 *
 * Notes:
 * - SpeechRecognition is only available in Chromium browsers; check
 *   `window.SpeechRecognition || window.webkitSpeechRecognition` before use.
 * - The final transcript is sent to POST /api/v1/chef/voice-parse which
 *   returns structured pantry items via Gemini.
 * - Use `interimResults: true` for live captions during recording.
 */

import { useState, useRef, useCallback } from 'react';

export default function useVoiceInput({ onResult } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);

  const start = useCallback(() => {
    // TODO: implement SpeechRecognition setup
    void onResult;
    setIsListening(true);
    setTranscript('');
    setError(null);
  }, [onResult]);

  const stop = useCallback(() => {
    // TODO: stop recognition and fire onResult with final transcript
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return { isListening, transcript, start, stop, error };
}
