import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic, MicOff, X, Calendar, MapPin, Tractor,
  AlertCircle, Sparkles, Check, Globe, RotateCcw,
  Info, ShieldAlert, Wifi, WifiOff, ChevronDown, ChevronUp
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

// ─────────────────────────────────────────────────────────────────────────────
// Error code → human-readable message
// ─────────────────────────────────────────────────────────────────────────────
const ERROR_MESSAGES = {
  'not-allowed':            '🔒 Microphone access denied. Click the lock icon in your browser address bar and allow microphone access, then retry.',
  'network':                '🌐 Chrome Web Speech API requires a connection to Google\'s servers (speech.googleapis.com). This fails on localhost/HTTP. Use the text input below instead, or open the app over HTTPS.',
  'no-speech':              '🔇 No speech detected. Please speak clearly and try again.',
  'audio-capture':          '🎤 No microphone found. Please connect a microphone and try again.',
  'aborted':                'ℹ️ Recording was stopped.',
  'bad-grammar':            '⚠️ Grammar error in speech service. Please try again.',
  'language-not-supported': '⚠️ Selected language is not supported by your browser\'s speech engine.',
  'service-not-allowed':    '🔒 Speech service blocked. This may be a browser security policy restriction.',
};

// ─────────────────────────────────────────────────────────────────────────────
// Diagnostics: run once and return a frozen object
// ─────────────────────────────────────────────────────────────────────────────
function runDiagnostics() {
  const ua            = navigator.userAgent;
  const isChrome      = /Chrome\//.test(ua) && !/Edg\//.test(ua) && !/OPR\//.test(ua);
  const isFirefox     = /Firefox\//.test(ua);
  const isEdge        = /Edg\//.test(ua);
  const isSafari      = /Safari\//.test(ua) && !isChrome;
  const isSecure      = window.isSecureContext;           // true on HTTPS or localhost + flag
  const isLocalhost   = ['localhost','127.0.0.1'].includes(window.location.hostname);
  const protocol      = window.location.protocol;

  const hasSpeechAPI   = typeof window.SpeechRecognition       !== 'undefined';
  const hasWebkitAPI   = typeof window.webkitSpeechRecognition !== 'undefined';
  const apiAvailable   = hasSpeechAPI || hasWebkitAPI;

  // Detect browser name
  let browserName = 'Unknown';
  if (isEdge)    browserName = 'Microsoft Edge';
  else if (isChrome)  browserName = 'Google Chrome';
  else if (isFirefox) browserName = 'Mozilla Firefox';
  else if (isSafari)  browserName = 'Safari';

  // Chrome Web Speech API needs HTTPS (or localhost with special flags)
  // Network error almost always means the audio can't reach Google's servers
  const networkErrorLikely = isChrome && (!isSecure || protocol === 'http:') && !isLocalhost;
  // On plain http://localhost Vite dev server it typically works if Chrome allows it
  const devMode = isLocalhost && protocol === 'http:';

  console.group('[VoiceBooking] Browser Diagnostics');
  console.log('userAgent          :', ua);
  console.log('browserName        :', browserName);
  console.log('window.SpeechRecognition       :', hasSpeechAPI);
  console.log('window.webkitSpeechRecognition :', hasWebkitAPI);
  console.log('apiAvailable       :', apiAvailable);
  console.log('isSecureContext     :', isSecure);
  console.log('protocol            :', protocol);
  console.log('isLocalhost         :', isLocalhost);
  console.log('devMode             :', devMode);
  console.log('networkErrorLikely  :', networkErrorLikely);
  console.groupEnd();

  return {
    ua, browserName, isChrome, isFirefox, isEdge, isSafari,
    isSecure, isLocalhost, protocol, devMode,
    hasSpeechAPI, hasWebkitAPI, apiAvailable,
    networkErrorLikely,
  };
}

// Run once at module load
const DIAG = runDiagnostics();

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function VoiceBookingModal({ isOpen, onClose, onBookingCreated, onVoiceParse }) {
  const { apiFetch } = useAuth();
  const { t, locale } = useLanguage();

  const [isListening, setIsListening]           = useState(false);
  const [transcript, setTranscript]             = useState('');
  const [manualInput, setManualInput]           = useState('');
  const [isLoading, setIsLoading]               = useState(false);
  const [parsedResult, setParsedResult]         = useState(null);
  const [errorMsg, setErrorMsg]                 = useState('');
  const [errorCode, setErrorCode]               = useState('');
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [speechLang, setSpeechLang]             = useState(locale === 'ta' ? 'ta-IN' : 'en-IN');
  const [isSupported, setIsSupported]           = useState(DIAG.apiAvailable);
  const [micPermission, setMicPermission]       = useState('unknown'); // 'granted'|'denied'|'prompt'|'unknown'
  const [showDiag, setShowDiag]                 = useState(false);
  const [forceTextMode, setForceTextMode]       = useState(false);  // auto-enable after network error

  const recognitionRef = useRef(null);

  // ── Query microphone permission ──────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.permissions) return;
    navigator.permissions.query({ name: 'microphone' })
      .then(status => {
        setMicPermission(status.state);
        console.log('[VoiceBooking] mic permission:', status.state);
        status.onchange = () => {
          setMicPermission(status.state);
          console.log('[VoiceBooking] mic permission changed to:', status.state);
        };
      })
      .catch(() => setMicPermission('unknown'));
  }, []);

  // ── Reset all UI state ───────────────────────────────────────────────────────
  const resetState = useCallback(() => {
    setIsListening(false);
    setTranscript('');
    setManualInput('');
    setIsLoading(false);
    setParsedResult(null);
    setErrorMsg('');
    setErrorCode('');
    setBookingConfirmed(false);
    // do NOT reset forceTextMode — keep it if speech already failed
  }, []);

  // ── Build / rebuild recognition (single-use Web Speech API instances) ────────
  const buildRecognition = useCallback((lang) => {
    if (!DIAG.apiAvailable) {
      console.warn('[VoiceBooking] buildRecognition: API not available');
      setIsSupported(false);
      return null;
    }

    // Abort any existing instance before creating a new one
    if (recognitionRef.current) {
      try { recognitionRef.current.onend = null; recognitionRef.current.abort(); } catch (_) {}
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SpeechRecognition();
    rec.continuous      = false;
    rec.interimResults  = false;
    rec.maxAlternatives = 1;
    rec.lang            = lang;

    rec.onstart = () => {
      console.log('[VoiceBooking] onstart — recognition started | lang:', lang,
        '| secure:', DIAG.isSecure, '| protocol:', DIAG.protocol);
      setIsListening(true);
      setErrorMsg('');
      setErrorCode('');
      setParsedResult(null);
    };

    rec.onresult = (event) => {
      const text       = event.results[0][0].transcript;
      const confidence = event.results[0][0].confidence;
      console.log('[VoiceBooking] onresult — text:', text, '| confidence:', confidence);
      setTranscript(text);
      setManualInput(text);   // auto-populate editable textbox
      processVoiceText(text);
    };

    rec.onerror = (e) => {
      const code = e.error || 'unknown';
      console.error('[VoiceBooking] onerror — code:', code,
        '| browser:', DIAG.browserName,
        '| secure:', DIAG.isSecure,
        '| protocol:', DIAG.protocol,
        '| full event:', e);

      setErrorCode(code);
      setErrorMsg(ERROR_MESSAGES[code] || `Speech recognition error (${code}). Please type instead.`);
      setIsListening(false);

      // Auto-switch to text-only mode on network/not-allowed errors
      if (code === 'network' || code === 'not-allowed' || code === 'service-not-allowed') {
        console.warn('[VoiceBooking] Auto-enabling text-only fallback due to error:', code);
        setForceTextMode(true);
      }

      // Rebuild so user can retry (or text-submit) without page reload
      const fresh = buildRecognition(lang);
      recognitionRef.current = fresh;
    };

    rec.onend = () => {
      console.log('[VoiceBooking] onend — recognition ended');
      setIsListening(false);
      // Rebuild for next session (Web Speech API objects are single-use)
      const fresh = buildRecognition(lang);
      recognitionRef.current = fresh;
    };

    return rec;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Lifecycle: open/close ────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      resetState();
      if (DIAG.apiAvailable) {
        const rec = buildRecognition(speechLang);
        recognitionRef.current = rec;
      }
      console.log('[VoiceBooking] modal opened — diagnostics:', DIAG);
    } else {
      if (recognitionRef.current) {
        try { recognitionRef.current.onend = null; recognitionRef.current.abort(); } catch (_) {}
      }
      console.log('[VoiceBooking] modal closed — recognition aborted');
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Lifecycle: language switch ───────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !DIAG.apiAvailable) return;
    if (isListening) {
      try { recognitionRef.current?.stop(); } catch (_) {}
    }
    const rec = buildRecognition(speechLang);
    recognitionRef.current = rec;
    console.log('[VoiceBooking] language switched — rebuilt, lang:', speechLang);
  }, [speechLang]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cleanup on unmount ───────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.onend = null; recognitionRef.current.abort(); } catch (_) {}
      }
    };
  }, []);

  // ── Reset button handler ─────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.onend = null; recognitionRef.current.abort(); } catch (_) {}
    }
    resetState();
    setForceTextMode(false);
    if (DIAG.apiAvailable) {
      const rec = buildRecognition(speechLang);
      recognitionRef.current = rec;
    }
    console.log('[VoiceBooking] manual reset — state cleared');
  }, [speechLang, resetState, buildRecognition]);

  // ── Safe close ───────────────────────────────────────────────────────────────
  const handleClose = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.onend = null; recognitionRef.current.abort(); } catch (_) {}
    }
    resetState();
    onClose();
  }, [onClose, resetState]);

  // ── Start / Stop ─────────────────────────────────────────────────────────────
  const startListening = () => {
    if (forceTextMode) return;
    if (!recognitionRef.current) {
      const rec = buildRecognition(speechLang);
      if (!rec) return;
      recognitionRef.current = rec;
    }
    try {
      setTranscript('');
      setManualInput('');
      setErrorMsg('');
      setErrorCode('');
      setParsedResult(null);
      recognitionRef.current.start();
      console.log('[VoiceBooking] start() called');
    } catch (e) {
      console.error('[VoiceBooking] start() threw:', e.name, e.message);
      if (e.name === 'InvalidStateError') {
        try { recognitionRef.current.stop(); } catch (_) {}
        const rec = buildRecognition(speechLang);
        recognitionRef.current = rec;
      } else {
        setErrorMsg(`Could not start microphone: ${e.message}`);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        console.log('[VoiceBooking] stop() called');
      } catch (e) {
        console.warn('[VoiceBooking] stop() threw:', e.message);
      }
    }
  };

  // ── Process text (voice OR manual) ───────────────────────────────────────────
  const processVoiceText = async (text) => {
    if (!text.trim()) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      const data = await apiFetch('/api/ai/voice-booking/', {
        method: 'POST',
        body: JSON.stringify({ text })
      });
      setParsedResult(data);
    } catch (e) {
      console.error('[VoiceBooking] processVoiceText error:', e);
      setErrorMsg(e.message || 'Failed to parse request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSubmit = () => {
    const text = manualInput.trim();
    if (!text) return;
    setTranscript(text);
    processVoiceText(text);
  };

  // ── Create booking ────────────────────────────────────────────────────────────
  const handleCreateBooking = async () => {
    if (!parsedResult) return;
    setIsLoading(true);
    try {
      const listings = await apiFetch(`/api/equipment/?category=${parsedResult.equipment_type}`);
      if (!listings || listings.length === 0) {
        throw new Error(`No available ${parsedResult.equipment_type} listed on the platform right now.`);
      }
      const selectedEquipment = listings.find(l => l.is_available) || listings[0];
      const startDate = new Date(`${parsedResult.booking_date}T09:00:00`);
      const endDate   = new Date(`${parsedResult.booking_date}T13:00:00`);
      await apiFetch('/api/bookings/', {
        method: 'POST',
        body: JSON.stringify({
          equipment:  selectedEquipment.id,
          start_date: startDate.toISOString(),
          end_date:   endDate.toISOString()
        })
      });
      setBookingConfirmed(true);
      if (onBookingCreated) onBookingCreated();
      setTimeout(() => {
        onClose();
        setBookingConfirmed(false);
        setParsedResult(null);
        setTranscript('');
        setManualInput('');
      }, 2000);
    } catch (e) {
      setErrorMsg(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  // Determine if voice button should be accessible
  const voiceDisabled = !isSupported || forceTextMode || isLoading || micPermission === 'denied';

  // Mic permission badge colour
  const permColor = {
    granted: 'text-emerald-600',
    denied:  'text-red-500',
    prompt:  'text-amber-500',
    unknown: 'text-slate-400',
  }[micPermission] ?? 'text-slate-400';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-scale-up">

        {/* ── Header ── */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Mic className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
            {t('voiceBookingTitle')}
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowDiag(v => !v)}
              title="Show browser diagnostics"
              className="text-slate-400 hover:text-blue-500 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Info className="w-4 h-4" />
            </button>
            <button
              onClick={handleReset}
              title="Reset — clear transcript and errors"
              className="text-slate-400 hover:text-amber-500 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Diagnostics Panel (collapsible) ── */}
        {showDiag && (
          <div className="mx-5 mt-3 mb-0 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-950/20 p-3 text-[11px] font-mono text-blue-700 dark:text-blue-300 space-y-1">
            <p className="font-bold text-xs mb-1 text-blue-800 dark:text-blue-200">🔍 Browser Diagnostics</p>
            <p><span className="opacity-60">Browser    :</span> {DIAG.browserName}</p>
            <p>
              <span className="opacity-60">Speech API :</span>{' '}
              {DIAG.apiAvailable
                ? <span className="text-emerald-600 font-bold">✓ Available ({DIAG.hasSpeechAPI ? 'SpeechRecognition' : 'webkitSpeechRecognition'})</span>
                : <span className="text-red-500 font-bold">✗ Not available</span>}
            </p>
            <p>
              <span className="opacity-60">Protocol   :</span>{' '}
              <span className={DIAG.protocol === 'https:' ? 'text-emerald-600' : 'text-amber-500'}>
                {DIAG.protocol}//{window.location.hostname}
              </span>
            </p>
            <p>
              <span className="opacity-60">Secure ctx :</span>{' '}
              {DIAG.isSecure
                ? <span className="text-emerald-600">✓ Yes</span>
                : <span className="text-amber-500">⚠ No (may cause "network" error)</span>}
            </p>
            <p>
              <span className="opacity-60">Mic perm   :</span>{' '}
              <span className={permColor}>{micPermission}</span>
            </p>
            {DIAG.isChrome && !DIAG.isSecure && (
              <p className="text-amber-600 dark:text-amber-400 mt-1 font-sans font-medium text-[10px] leading-tight">
                ⚠ Chrome Web Speech API sends audio to Google servers via WSS. On HTTP/localhost this may fail with "network". Use text input below.
              </p>
            )}
          </div>
        )}

        <div className="p-6 flex flex-col items-center">
          <p className="text-sm text-center text-slate-500 dark:text-slate-400 mb-4">
            {t('voiceBookingDesc')}
          </p>

          {/* ── Status banners ── */}
          {!isSupported && (
            <div className="w-full mb-4 flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300">
              <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Voice recognition not supported on this browser. Please use the text input below.</span>
            </div>
          )}
          {isSupported && forceTextMode && (
            <div className="w-full mb-4 flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300">
              <WifiOff className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                Voice recognition failed (<code className="font-mono font-bold">{errorCode || 'network'}</code>).
                Text input mode is active. Type your request below.{' '}
                <button
                  onClick={() => { setForceTextMode(false); setErrorMsg(''); setErrorCode(''); }}
                  className="underline font-semibold hover:text-amber-900"
                >
                  Retry voice
                </button>
              </span>
            </div>
          )}
          {isSupported && !forceTextMode && micPermission === 'denied' && (
            <div className="w-full mb-4 flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400">
              <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Microphone access is blocked. Click the lock/camera icon in the address bar and allow microphone, then reload.</span>
            </div>
          )}

          {/* ── Language toggle ── */}
          <div className="flex items-center gap-2 mb-5">
            <Globe className="w-4 h-4 text-slate-400" />
            {['en-IN', 'ta-IN'].map(lang => (
              <button
                key={lang}
                onClick={() => setSpeechLang(lang)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  speechLang === lang
                    ? 'bg-emerald-600 text-white shadow'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {lang === 'en-IN' ? 'English (en-IN)' : 'தமிழ் (ta-IN)'}
              </button>
            ))}
          </div>

          {/* ── Microphone button (hidden in text-only mode) ── */}
          {isSupported && !forceTextMode && (
            <div className="relative mb-6">
              {isListening && (
                <>
                  <span className="animate-ping absolute inset-0 rounded-full bg-emerald-500 opacity-20" />
                  <span className="animate-ping absolute inset-1.5 rounded-full bg-emerald-500 opacity-30" style={{ animationDelay: '100ms' }} />
                </>
              )}
              <button
                onClick={isListening ? stopListening : startListening}
                disabled={voiceDisabled}
                aria-label={isListening ? 'Stop recording' : 'Start voice recording'}
                className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all border-4 ${
                  voiceDisabled
                    ? 'bg-slate-300 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-400 cursor-not-allowed'
                    : isListening
                      ? 'bg-red-500 border-red-300 text-white animate-pulse'
                      : 'bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 border-emerald-100 dark:border-slate-800 text-white'
                }`}
              >
                {isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
              </button>
              {isListening && (
                <p className="text-xs text-center text-emerald-600 font-medium mt-2 animate-pulse">
                  Listening… speak now
                </p>
              )}
              {/* Mic permission dot */}
              <span
                title={`Microphone: ${micPermission}`}
                className={`absolute top-1 right-1 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${
                  micPermission === 'granted' ? 'bg-emerald-500' :
                  micPermission === 'denied'  ? 'bg-red-500' :
                  micPermission === 'prompt'  ? 'bg-amber-400' : 'bg-slate-300'
                }`}
              />
            </div>
          )}

          {/* ── Transcript / text input ── */}
          <div className="w-full mb-4">
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              {forceTextMode || !isSupported ? 'Type your booking request' : 'Transcript / Type your request'}
            </label>
            <textarea
              rows={2}
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleManualSubmit();
                }
              }}
              placeholder='e.g. "Book a tractor in Salem for tomorrow" or "Naalaikku Salem-la tractor venum"'
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              onClick={handleManualSubmit}
              disabled={isLoading || !manualInput.trim()}
              className="mt-2 w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-40 disabled:bg-slate-200 disabled:text-slate-400 transition-all"
            >
              Submit Request
            </button>
          </div>

          {/* ── Error message ── */}
          {errorMsg && (
            <div className="w-full px-4 py-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50 rounded-xl flex items-start gap-2.5 mb-4 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <span>{errorMsg}</span>
                {errorCode && (
                  <span className="ml-2 inline-block px-1.5 py-0.5 bg-red-100 dark:bg-red-900/40 rounded text-[10px] font-mono font-bold">
                    {errorCode}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ── Loading ── */}
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium my-2">
              <span className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              Analyzing request…
            </div>
          )}

          {/* ── Parsed result ── */}
          {parsedResult && !bookingConfirmed && (
            <div className="w-full bg-emerald-50/50 dark:bg-slate-800/40 border border-emerald-100 dark:border-slate-800 rounded-xl p-4 mb-4 animate-fade-in text-slate-800 dark:text-slate-200">
              <h4 className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Parsed AI Booking Details
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Tractor className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="block text-[10px] text-slate-400 leading-none">Equipment</span>
                    <strong>{parsedResult.equipment_type}</strong>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="block text-[10px] text-slate-400 leading-none">Date</span>
                    <strong>{parsedResult.booking_date}</strong>
                  </div>
                </div>
                <div className="flex items-center gap-2 col-span-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="block text-[10px] text-slate-400 leading-none">Location</span>
                    <strong>{parsedResult.location}</strong>
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700/50 mt-4 pt-3 flex items-center justify-between text-xs">
                <span className="text-slate-400">Est. Price: <strong>₹{parsedResult.estimated_price_per_hour}/hr</strong></span>
                <button
                  onClick={() => onVoiceParse ? onVoiceParse(parsedResult) : handleCreateBooking()}
                  disabled={isLoading}
                  className="px-4 py-2 bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-md transition-all"
                >
                  Configure Booking
                </button>
              </div>
            </div>
          )}

          {/* ── Success ── */}
          {bookingConfirmed && (
            <div className="w-full py-4 text-center text-emerald-600 font-semibold flex flex-col items-center gap-2 animate-fade-in">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <Check className="w-6 h-6 text-emerald-600" />
              </div>
              Booking Request Submitted Successfully!
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
