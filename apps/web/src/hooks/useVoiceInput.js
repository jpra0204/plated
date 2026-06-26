import { useState, useRef, useCallback, useEffect } from 'react';

const SpeechRecognition =
  typeof window !== 'undefined'
    ? (window.SpeechRecognition || window.webkitSpeechRecognition || null)
    : null;

/**
 * Wraps the Web Speech API for voice capture.
 *
 * Returns { supported, start, stop, status, transcript, error }
 *   status: 'idle' | 'listening' | 'processing'
 *   supported: false when SpeechRecognition is unavailable
 *
 * onResult(finalTranscript) fires once after stop() resolves the final text.
 */
export default function useVoiceInput({ onResult } = {}) {
  const [status, setStatus]       = useState('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError]         = useState(null);

  const recognitionRef  = useRef(null);
  const finalAccumRef   = useRef('');
  const onResultRef     = useRef(onResult);

  useEffect(() => {
    onResultRef.current = onResult;
  });

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    if (!SpeechRecognition) return;

    setTranscript('');
    setError(null);
    setStatus('listening');
    finalAccumRef.current = '';

    const recognition = new SpeechRecognition();
    recognition.continuous     = true;
    recognition.interimResults = true;
    recognition.lang           = 'en-US';

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalAccumRef.current += event.results[i][0].transcript + ' ';
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setTranscript(finalAccumRef.current + interim);
    };

    recognition.onerror = (event) => {
      setError(event.error);
      setStatus('idle');
    };

    recognition.onend = () => {
      const result = finalAccumRef.current.trim();
      if (result) {
        setStatus('processing');
        onResultRef.current?.(result);
      } else {
        setStatus('idle');
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  return {
    supported: Boolean(SpeechRecognition),
    start,
    stop,
    status,
    transcript,
    error,
  };
}
