/**
 * Natural & Soft Voice Synthesis Engine for Vietnam Travel Companion
 * 
 * Features:
 * - High-Definition Neural Speech Synthesis via /api/tts (Google Neural MP3 Chunker)
 * - Rock-solid HTML5 Audio & Web Audio compatibility for all mobile & desktop browsers
 * - Concurrency Safe: Strict atomic session tokens prevent double narrations or overlapping audio on rapid clicks
 * - Real-time Progress Tracking (currentTime, duration, progress percentage)
 * - True Play / Pause / Resume / Seek / Speed controls
 * - Intelligent Prosody & Cadence Optimizer (abbreviations, numbers, phonetic naturalness)
 * - Advanced Natural Voice Ranker for Web Speech API offline fallback
 * - Sub-millisecond in-memory audio blob caching
 * - Reactive state for UI wave animations and synchronized playback
 */

export type VoiceLanguage = 'vi-VN' | 'es-ES' | 'en-US' | 'vi' | 'es' | 'en';
export type VoiceSpeedPreset = 'slow' | 'natural' | 'fast';
export type VoiceGender = 'female' | 'male';
export type VoiceEngineMode = 'auto' | 'neural' | 'browser';

export interface SpeechSettings {
  engineMode: VoiceEngineMode;
  speedPreset: VoiceSpeedPreset;
  speedValue: number; // 0.82, 0.92, 1.08
  gender: VoiceGender;
  autoPlaySample: boolean;
}

const SETTINGS_KEY = 'vietnam_travel_speech_settings_v2';

export const DEFAULT_SPEECH_SETTINGS: SpeechSettings = {
  engineMode: 'auto',
  speedPreset: 'natural',
  speedValue: 1.05,
  gender: 'female',
  autoPlaySample: false,
};

export function getSavedSpeechSettings(): SpeechSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SPEECH_SETTINGS, ...parsed };
    }
  } catch {}
  return DEFAULT_SPEECH_SETTINGS;
}

export function saveSpeechSettings(settings: Partial<SpeechSettings>): SpeechSettings {
  const current = getSavedSpeechSettings();
  const updated = { ...current, ...settings };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  } catch {}
  notifySettingsChanged(updated);
  return updated;
}

export interface GlobalSpeakingState {
  isSpeaking: boolean;
  isLoading: boolean;
  isPaused: boolean;
  speakingId: string | null;
  speakingText: string | null;
  lang: string | null;
  source: 'neural' | 'browser' | null;
  currentTime: number;
  duration: number;
  progress: number; // 0 to 1
}

// Global Event Emitter for speech state and settings
type SpeechStateListener = (state: GlobalSpeakingState) => void;
type SettingsListener = (settings: SpeechSettings) => void;

const stateListeners = new Set<SpeechStateListener>();
const settingsListeners = new Set<SettingsListener>();

let globalSpeakingState: GlobalSpeakingState = {
  isSpeaking: false,
  isLoading: false,
  isPaused: false,
  speakingId: null,
  speakingText: null,
  lang: null,
  source: null,
  currentTime: 0,
  duration: 0,
  progress: 0,
};

function notifyStateChanged() {
  stateListeners.forEach((l) => l(globalSpeakingState));
}

function notifySettingsChanged(s: SpeechSettings) {
  settingsListeners.forEach((l) => l(s));
}

export function subscribeSpeechState(listener: SpeechStateListener): () => void {
  stateListeners.add(listener);
  listener(globalSpeakingState);
  return () => {
    stateListeners.delete(listener);
  };
}

export function subscribeSpeechSettings(listener: SettingsListener): () => void {
  settingsListeners.add(listener);
  listener(getSavedSpeechSettings());
  return () => {
    settingsListeners.delete(listener);
  };
}

export function isSpeechActive(): boolean {
  return globalSpeakingState.isSpeaking;
}

export function isSpeechPaused(): boolean {
  return globalSpeakingState.isPaused;
}

export function getActiveSpeakingId(): string | null {
  return globalSpeakingState.speakingId;
}

export function getGlobalSpeakingState(): GlobalSpeakingState {
  return globalSpeakingState;
}

// In-Memory Audio Cache (stores generated audio Blob URLs)
const audioBlobCache = new Map<string, { blobUrl: string; mimeType: string }>();

// Currently playing audio instance
let currentHtmlAudio: HTMLAudioElement | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;

// Concurrency session token & abort controller
let currentPlaybackSession = 0;
let currentAbortController: AbortController | null = null;

/**
 * Text Preprocessing & Prosody Softener
 * Converts harsh symbols, prices, and abbreviations into gentle, clear, natural spoken phrases.
 */
export function preprocessTextForNaturalSpeech(text: string, lang: string): string {
  if (!text) return '';

  let cleaned = text
    // Remove markdown symbols (*, _, #, `, [ ])
    .replace(/[*_#`~]/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    // Remove emojis
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, ' ')
    // Remove parenthetical notes e.g. (opcional) or (50k)
    .replace(/\(.*?\)/g, ' ')
    // Normalize slashes to pause words or commas
    .replace(/\s*\/\s*/g, ', ')
    // Replace multiple spaces/newlines
    .replace(/\s+/g, ' ')
    .trim();

  const isVi = lang.toLowerCase().startsWith('vi');
  const isEs = lang.toLowerCase().startsWith('es');

  if (isVi) {
    // Expand Vietnamese abbreviations and currency for melodic pronunciation
    cleaned = cleaned
      .replace(/(\d+)\s*[kK]\b/g, '$1 nghìn ')
      .replace(/(\d+)\s*[đ₫]\b/g, '$1 đồng ')
      .replace(/\bVND\b/gi, 'đồng')
      .replace(/\bATM\b/g, 'A-T-M')
      .replace(/\bTP\.?\s*HCM\b/gi, 'Thành phố Hồ Chí Minh')
      .replace(/\bHN\b/g, 'Hà Nội')
      .replace(/\bĐN\b/g, 'Đà Nẵng')
      .replace(/\bQ\.?\s*(\d+)\b/gi, 'Quận $1')
      .replace(/\bP\.?\s*(\d+)\b/gi, 'Phường $1')
      .replace(/!+/g, '. ')
      .replace(/\?+/g, '? ');
  } else if (isEs) {
    // Expand Spanish abbreviations, currency, metrics and dates
    cleaned = cleaned
      .replace(/(\d+)\s*[kK]\s*(?:₫|vnd|dongs?)?/gi, '$1 mil dongs ')
      .replace(/(\d+)\s*[đ₫]/g, '$1 dongs ')
      .replace(/\bVND\b/gi, 'dongs')
      .replace(/\bATM\b/gi, 'cajero automático')
      .replace(/\bp\.?\s*ej\.?\b/gi, 'por ejemplo')
      .replace(/\baprox\.?\b/gi, 'aproximadamente')
      .replace(/\bmin\b/gi, 'minutos')
      .replace(/\bkm\/h\b/gi, 'kilómetros por hora')
      .replace(/\bkm\b/gi, 'kilómetros')
      .replace(/\bmts?\.?\b/gi, 'metros')
      .replace(/\bn[ºo]\.?\s*(\d+)/gi, 'número $1')
      .replace(/\bs\.\s*XXI\b/gi, 'siglo veintiuno')
      .replace(/\bs\.\s*XX\b/gi, 'siglo veinte')
      .replace(/\bs\.\s*XIX\b/gi, 'siglo diecinueve')
      .replace(/\bs\.\s*XVIII\b/gi, 'siglo dieciocho')
      .replace(/\bUNESCO\b/gi, 'Unesco');
  }

  return cleaned.trim();
}

/**
 * Base64 string to Uint8Array helper
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Cache voices for browser Web Speech API
 */
let cachedVoices: SpeechSynthesisVoice[] = [];
if (typeof window !== 'undefined' && window.speechSynthesis) {
  const refreshVoices = () => {
    try {
      cachedVoices = window.speechSynthesis.getVoices();
    } catch {}
  };
  refreshVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = refreshVoices;
  }
}

export function getBrowserVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  if (cachedVoices.length === 0) {
    try {
      cachedVoices = window.speechSynthesis.getVoices();
    } catch {}
  }
  return cachedVoices;
}

/**
 * Finds the smoothest, most natural human voice for the target language.
 */
export function findBestNaturalVoice(lang: string, gender: VoiceGender = 'female'): SpeechSynthesisVoice | null {
  const voices = getBrowserVoices();
  if (voices.length === 0) return null;

  const isVi = lang.toLowerCase().startsWith('vi');
  const isEs = lang.toLowerCase().startsWith('es');
  const isEn = lang.toLowerCase().startsWith('en');

  if (isVi) {
    const viVoices = voices.filter(
      (v) => v.lang.replace('_', '-').toLowerCase().startsWith('vi') || /vietnam|tiếng việt/i.test(v.name)
    );
    if (viVoices.length > 0) {
      const premiumVi = viVoices.find((v) =>
        /google|natural|neural|online|hoaimy|namminh|linh|mai|siri/i.test(v.name)
      );
      if (premiumVi) return premiumVi;
      return viVoices[0];
    }
  } else if (isEs) {
    const esVoices = voices.filter(
      (v) => v.lang.toLowerCase().startsWith('es') || /spanish|español/i.test(v.name)
    );
    if (esVoices.length > 0) {
      // Prioritize modern high-fidelity neural and natural voices
      const premiumEs = esVoices.find((v) =>
        /google español|natural|neural|online|elvira|alvaro|jorge|monica|salome|carlos|paulina|marta|siri|wavenet|neural2/i.test(v.name)
      );
      if (premiumEs) return premiumEs;

      const standardEs = esVoices.find((v) => v.lang === 'es-ES' || v.lang === 'es_ES');
      if (standardEs) return standardEs;

      return esVoices[0];
    }
  } else if (isEn) {
    const enVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
    const premiumEn = enVoices.find((v) => /google|natural|neural|samantha|daniel|jenny/i.test(v.name));
    if (premiumEn) return premiumEn;
    if (enVoices.length > 0) return enVoices[0];
  }

  return null;
}

/**
 * Stops any ongoing speech immediately across all audio engines and cancels any in-flight requests
 */
export function stopAllSpeech(): void {
  // Invalidate any in-flight async request
  currentPlaybackSession++;
  if (currentAbortController) {
    try {
      currentAbortController.abort();
    } catch {}
    currentAbortController = null;
  }

  // 1. HTML5 Audio stop
  if (currentHtmlAudio) {
    try {
      currentHtmlAudio.pause();
      currentHtmlAudio.currentTime = 0;
      currentHtmlAudio.src = '';
    } catch {}
    currentHtmlAudio = null;
  }

  // 2. Browser Speech Synthesis stop
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
    currentUtterance = null;
  }

  globalSpeakingState = {
    isSpeaking: false,
    isLoading: false,
    isPaused: false,
    speakingId: null,
    speakingText: null,
    lang: null,
    source: null,
    currentTime: 0,
    duration: 0,
    progress: 0,
  };
  notifyStateChanged();
}

/**
 * Pauses current speech playback
 */
export function pauseSpeech(): void {
  if (currentHtmlAudio && !currentHtmlAudio.paused) {
    try {
      currentHtmlAudio.pause();
      globalSpeakingState.isPaused = true;
      notifyStateChanged();
    } catch {}
  } else if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking) {
    try {
      window.speechSynthesis.pause();
      globalSpeakingState.isPaused = true;
      notifyStateChanged();
    } catch {}
  }
}

/**
 * Resumes paused speech playback
 */
export function resumeSpeech(): void {
  if (currentHtmlAudio && currentHtmlAudio.paused && globalSpeakingState.speakingId) {
    try {
      currentHtmlAudio.play();
      globalSpeakingState.isPaused = false;
      notifyStateChanged();
    } catch {}
  } else if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.paused) {
    try {
      window.speechSynthesis.resume();
      globalSpeakingState.isPaused = false;
      notifyStateChanged();
    } catch {}
  }
}

/**
 * Changes playback rate in real time without cutting audio
 */
export function setSpeechPlaybackRate(speed: number, lang?: string): void {
  const isEs = lang ? lang.toLowerCase().startsWith('es') : (globalSpeakingState.lang?.toLowerCase().startsWith('es') ?? true);
  const calibrated = isEs ? speed * 1.16 : speed;
  const safeSpeed = Math.max(0.75, Math.min(1.7, calibrated));
  if (currentHtmlAudio) {
    try {
      currentHtmlAudio.playbackRate = safeSpeed;
    } catch {}
  }
}

/**
 * Seeks playback to a specific timestamp in seconds
 */
export function seekSpeech(timeInSeconds: number): void {
  if (currentHtmlAudio && currentHtmlAudio.duration) {
    try {
      const safeTime = Math.max(0, Math.min(currentHtmlAudio.duration, timeInSeconds));
      currentHtmlAudio.currentTime = safeTime;
      globalSpeakingState.currentTime = safeTime;
      globalSpeakingState.progress = currentHtmlAudio.duration > 0 ? safeTime / currentHtmlAudio.duration : 0;
      notifyStateChanged();
    } catch {}
  }
}

export interface PlayNaturalSpeechOptions {
  text: string;
  lang?: VoiceLanguage;
  id?: string;
  gender?: VoiceGender;
  speed?: number;
  engineMode?: VoiceEngineMode;
  onStart?: () => void;
  onEnd?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number, progress: number) => void;
  onError?: (err: any) => void;
  sessionId?: number;
}

/**
 * High-Level Natural Speech Playback Function
 * 1. Tries Neural HD TTS (Google Neural MP3 Chunker) via /api/tts.
 * 2. Plays with HTML5 Audio & Blob URL for 100% universal device playback.
 * 3. Gracefully falls back to Calibrated Browser Speech Synthesis if offline or network failure.
 */
export async function playNaturalSpeech(options: PlayNaturalSpeechOptions): Promise<boolean> {
  const {
    text,
    lang = 'vi-VN',
    id = `speech-${Date.now()}`,
    gender,
    speed,
    engineMode,
    onStart,
    onEnd,
    onTimeUpdate,
    onError,
  } = options;

  if (!text || !text.trim()) return false;

  const settings = getSavedSpeechSettings();
  const effectiveGender = gender || settings.gender;
  const effectiveSpeed = speed || settings.speedValue;
  const effectiveEngine = engineMode || settings.engineMode;

  const cleanText = preprocessTextForNaturalSpeech(text, lang);
  if (!cleanText) return false;

  // Toggle stop/pause if already speaking this exact item
  if (globalSpeakingState.isSpeaking && globalSpeakingState.speakingId === id) {
    if (globalSpeakingState.isPaused) {
      resumeSpeech();
      return true;
    } else {
      stopAllSpeech();
      return true;
    }
  }

  // Atomically cancel any ongoing or pending speech and start new session token
  stopAllSpeech();
  const thisSessionId = ++currentPlaybackSession;

  // Immediate visual feedback: mark as loading right away
  globalSpeakingState = {
    isSpeaking: false,
    isLoading: true,
    isPaused: false,
    speakingId: id,
    speakingText: cleanText,
    lang,
    source: null,
    currentTime: 0,
    duration: 0,
    progress: 0,
  };
  notifyStateChanged();

  // Try Tier 1: Neural Voice Engine via server /api/tts (when online & engine is auto or neural)
  const canAttemptNeural =
    effectiveEngine !== 'browser' &&
    typeof navigator !== 'undefined' &&
    navigator.onLine;

  if (canAttemptNeural) {
    try {
      const cacheKey = `${lang}:${effectiveGender}:${cleanText.toLowerCase()}`;
      let blobUrl: string | null = null;

      // Check client-side memory cache
      const cached = audioBlobCache.get(cacheKey);
      if (cached && cached.blobUrl) {
        blobUrl = cached.blobUrl;
      }

      if (!blobUrl) {
        currentAbortController = new AbortController();
        const timeoutId = setTimeout(() => currentAbortController?.abort(), 3500);

        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: cleanText,
            lang,
            gender: effectiveGender,
            speed: effectiveSpeed,
          }),
          signal: currentAbortController.signal,
        });
        clearTimeout(timeoutId);

        // RACE CONDITION SHIELD: If another request started while fetching, discard this result!
        if (thisSessionId !== currentPlaybackSession) {
          return false;
        }

        if (res.ok) {
          const data = await res.json();
          if (data && data.audioBase64) {
            const rawBytes = base64ToUint8Array(data.audioBase64);
            const mime = data.mimeType || 'audio/mpeg';
            const blob = new Blob([rawBytes.buffer as ArrayBuffer], { type: mime });
            blobUrl = URL.createObjectURL(blob);
            audioBlobCache.set(cacheKey, { blobUrl, mimeType: mime });
          }
        }
      }

      // RACE CONDITION SHIELD: Verify session before creating audio
      if (thisSessionId !== currentPlaybackSession) {
        return false;
      }

      if (blobUrl) {
        // Stop any leftover instance
        if (currentHtmlAudio) {
          try {
            currentHtmlAudio.pause();
            currentHtmlAudio.currentTime = 0;
            currentHtmlAudio.src = '';
          } catch {}
          currentHtmlAudio = null;
        }

        const isEs = lang.toLowerCase().startsWith('es');
        const audio = new Audio(blobUrl);
        // Calibrate Spanish speed for energetic, natural conversational rhythm (avoids dragging)
        const calibratedSpeed = isEs ? effectiveSpeed * 1.16 : effectiveSpeed;
        audio.playbackRate = Math.max(0.75, Math.min(1.7, calibratedSpeed));

        globalSpeakingState = {
          isSpeaking: true,
          isLoading: false,
          isPaused: false,
          speakingId: id,
          speakingText: cleanText,
          lang,
          source: 'neural',
          currentTime: 0,
          duration: 0,
          progress: 0,
        };
        notifyStateChanged();
        if (onStart) onStart();

        currentHtmlAudio = audio;

        audio.ontimeupdate = () => {
          if (thisSessionId === currentPlaybackSession && globalSpeakingState.speakingId === id && audio.duration) {
            const cur = audio.currentTime;
            const dur = audio.duration;
            const prog = dur > 0 ? cur / dur : 0;
            globalSpeakingState.currentTime = cur;
            globalSpeakingState.duration = dur;
            globalSpeakingState.progress = prog;
            notifyStateChanged();
            if (onTimeUpdate) onTimeUpdate(cur, dur, prog);
          }
        };

        audio.onended = () => {
          if (thisSessionId === currentPlaybackSession && globalSpeakingState.speakingId === id) {
            stopAllSpeech();
            if (onEnd) onEnd();
          }
        };

        audio.onerror = (e) => {
          if (thisSessionId === currentPlaybackSession) {
            console.warn('[Speech] Audio element error, falling back to browser synthesis:', e);
            stopAllSpeech();
            playBrowserSpeechOptimized({ ...options, sessionId: thisSessionId });
          }
        };

        await audio.play();
        return true;
      }
    } catch (neuralErr: any) {
      if (thisSessionId !== currentPlaybackSession) {
        return false;
      }
      console.info('[Speech] Neural TTS fallback to browser engine:', neuralErr?.message);
    }
  }

  // RACE CONDITION SHIELD: Verify session before browser fallback
  if (thisSessionId !== currentPlaybackSession) {
    return false;
  }

  return playBrowserSpeechOptimized({
    text: cleanText,
    lang,
    id,
    gender: effectiveGender,
    speed: effectiveSpeed,
    onStart,
    onEnd,
    onTimeUpdate,
    onError,
    sessionId: thisSessionId,
  });
}

/**
 * Calibrated Browser Speech Synthesis (Zero Robotic Stutter)
 */
function playBrowserSpeechOptimized(options: PlayNaturalSpeechOptions): boolean {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    if (options.onError) options.onError(new Error('Speech synthesis not supported on this device.'));
    return false;
  }

  const {
    text,
    lang = 'vi-VN',
    id = `speech-${Date.now()}`,
    gender = 'female',
    speed = 0.95,
    onStart,
    onEnd,
    onError,
    sessionId,
  } = options;

  if (sessionId && sessionId !== currentPlaybackSession) {
    return false;
  }

  try {
    window.speechSynthesis.cancel();
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const isVi = lang.toLowerCase().startsWith('vi');
    const isEs = lang.toLowerCase().startsWith('es');

    utterance.lang = isVi ? 'vi-VN' : isEs ? 'es-ES' : 'en-US';

    if (isVi) {
      utterance.rate = Math.max(0.75, Math.min(1.2, speed * 0.95));
      utterance.pitch = 0.98;
    } else if (isEs) {
      utterance.rate = Math.max(1.0, Math.min(1.4, speed * 1.16));
      utterance.pitch = 1.0;
    } else {
      utterance.rate = speed;
      utterance.pitch = 1.0;
    }

    utterance.volume = 1.0;

    const bestVoice = findBestNaturalVoice(lang, gender);
    if (bestVoice) {
      utterance.voice = bestVoice;
    }

    currentUtterance = utterance;

    globalSpeakingState = {
      isSpeaking: true,
      isLoading: false,
      isPaused: false,
      speakingId: id,
      speakingText: text,
      lang,
      source: 'browser',
      currentTime: 0,
      duration: 0,
      progress: 0,
    };
    notifyStateChanged();
    if (onStart) onStart();

    utterance.onend = () => {
      if (globalSpeakingState.speakingId === id) {
        globalSpeakingState = {
          isSpeaking: false,
          isLoading: false,
          isPaused: false,
          speakingId: null,
          speakingText: null,
          lang: null,
          source: null,
          currentTime: 0,
          duration: 0,
          progress: 0,
        };
        currentUtterance = null;
        notifyStateChanged();
        if (onEnd) onEnd();
      }
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis utterance error:', e);
      if (globalSpeakingState.speakingId === id) {
        globalSpeakingState = {
          isSpeaking: false,
          isLoading: false,
          isPaused: false,
          speakingId: null,
          speakingText: null,
          lang: null,
          source: null,
          currentTime: 0,
          duration: 0,
          progress: 0,
        };
        currentUtterance = null;
        notifyStateChanged();
      }
      if (onError) onError(e);
    };

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    console.warn('Browser speech synthesis exception:', err);
    if (onError) onError(err);
    return false;
  }
}

/**
 * Convenient wrappers for components
 */
export function speakVietnameseNatural(text: string, id?: string): boolean {
  playNaturalSpeech({
    text,
    lang: 'vi-VN',
    id: id || `vi-${text.slice(0, 20)}`,
  });
  return true;
}

export function speakSpanishNatural(text: string, id?: string): boolean {
  playNaturalSpeech({
    text,
    lang: 'es-ES',
    id: id || `es-${text.slice(0, 20)}`,
  });
  return true;
}

export function speakEnglishNatural(text: string, id?: string): boolean {
  playNaturalSpeech({
    text,
    lang: 'en-US',
    id: id || `en-${text.slice(0, 20)}`,
  });
  return true;
}
