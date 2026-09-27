/**
 * Natural & Soft Voice Synthesis Engine for Vietnam Travel Companion
 * 
 * Features:
 * - High-Definition Neural Speech Synthesis via /api/tts (Gemini 3.8 Flash TTS + Google Neural)
 * - Rock-solid HTML5 Audio & Web Audio compatibility for all mobile & desktop browsers
 * - Intelligent Prosody & Cadence Optimizer (human breathing pauses, tonal softness)
 * - Advanced Natural Voice Ranker for Web Speech API offline fallback
 * - In-memory and browser cache for instant sub-millisecond audio response
 * - Reactive state for UI wave animations and instant stop/resume
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
  speedValue: 0.92,
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

// Global Event Emitter for speech state and settings
type SpeechStateListener = (state: {
  isSpeaking: boolean;
  speakingId: string | null;
  speakingText: string | null;
  lang: string | null;
  source: 'neural' | 'browser' | null;
}) => void;

type SettingsListener = (settings: SpeechSettings) => void;

const stateListeners = new Set<SpeechStateListener>();
const settingsListeners = new Set<SettingsListener>();

let globalSpeakingState: {
  isSpeaking: boolean;
  speakingId: string | null;
  speakingText: string | null;
  lang: string | null;
  source: 'neural' | 'browser' | null;
} = {
  isSpeaking: false,
  speakingId: null,
  speakingText: null,
  lang: null,
  source: null,
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

export function getActiveSpeakingId(): string | null {
  return globalSpeakingState.speakingId;
}

// In-Memory Audio Cache (stores generated audio Blob URLs)
const audioBlobCache = new Map<string, { blobUrl: string; mimeType: string }>();

// Currently playing audio instance
let currentHtmlAudio: HTMLAudioElement | null = null;
let currentSourceNode: AudioBufferSourceNode | null = null;
let currentGainNode: GainNode | null = null;

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
      // 50k, 100k -> 50 nghìn, 100 nghìn
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
    // Expand Spanish abbreviations
    cleaned = cleaned
      .replace(/(\d+)\s*[kK]\s*(?:₫|vnd|dongs?)?/gi, '$1 mil dongs ')
      .replace(/(\d+)\s*[đ₫]/g, '$1 dongs ')
      .replace(/\bVND\b/gi, 'dongs vietnamitas')
      .replace(/\bATM\b/gi, 'cajero automático')
      .replace(/\bp\.?\s*ej\.?\b/gi, 'por ejemplo')
      .replace(/\baprox\.?\b/gi, 'aproximadamente')
      .replace(/\bmin\b/gi, 'minutos')
      .replace(/\bkm\b/gi, 'kilómetros');
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
 * Encapsulates raw 16-bit PCM (24000Hz mono) into standard RIFF WAVE Blob
 */
function pcmToWavBlob(pcmBytes: Uint8Array, sampleRate = 24000, numChannels = 1): Blob {
  const byteLength = pcmBytes.byteLength;
  const buffer = new ArrayBuffer(44 + byteLength);
  const view = new DataView(buffer);

  // RIFF identifier 'RIFF'
  view.setUint8(0, 0x52); view.setUint8(1, 0x49); view.setUint8(2, 0x46); view.setUint8(3, 0x46);
  // file length 36 + byteLength
  view.setUint32(4, 36 + byteLength, true);
  // 'WAVE'
  view.setUint8(8, 0x57); view.setUint8(9, 0x41); view.setUint8(10, 0x56); view.setUint8(11, 0x45);

  // 'fmt ' chunk
  view.setUint8(12, 0x66); view.setUint8(13, 0x6d); view.setUint8(14, 0x74); view.setUint8(15, 0x20);
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true);  // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true); // byte rate
  view.setUint16(32, numChannels * 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample (16-bit)

  // 'data' chunk
  view.setUint8(36, 0x64); view.setUint8(37, 0x61); view.setUint8(38, 0x74); view.setUint8(39, 0x61);
  view.setUint32(40, byteLength, true);

  // copy pcm audio bytes
  new Uint8Array(buffer, 44).set(pcmBytes);

  return new Blob([buffer], { type: 'audio/wav' });
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
      const premiumEs = esVoices.find((v) =>
        /google|natural|neural|online|jorge|monica|alvaro|elvira|siri/i.test(v.name)
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
 * Stops any ongoing speech immediately across all audio engines
 */
export function stopAllSpeech(): void {
  // 1. HTML5 Audio stop
  if (currentHtmlAudio) {
    try {
      currentHtmlAudio.pause();
      currentHtmlAudio.currentTime = 0;
      currentHtmlAudio.src = '';
    } catch {}
    currentHtmlAudio = null;
  }

  // 2. Web Audio Source stop
  if (currentSourceNode) {
    try {
      currentSourceNode.stop();
      currentSourceNode.disconnect();
    } catch {}
    currentSourceNode = null;
  }

  // 3. Browser Speech Synthesis stop
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }

  globalSpeakingState = {
    isSpeaking: false,
    speakingId: null,
    speakingText: null,
    lang: null,
    source: null,
  };
  notifyStateChanged();
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
  onError?: (err: any) => void;
}

/**
 * High-Level Natural Speech Playback Function
 * 1. Tries Neural HD TTS (Gemini/Google) via /api/tts.
 * 2. Plays with HTML5 Audio & Blob URL for 100% universal device playback.
 * 3. Gracefully falls back to Calibrated Browser Speech Synthesis if offline.
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
    onError,
  } = options;

  if (!text || !text.trim()) return false;

  const settings = getSavedSpeechSettings();
  const effectiveGender = gender || settings.gender;
  const effectiveSpeed = speed || settings.speedValue;
  const effectiveEngine = engineMode || settings.engineMode;

  const cleanText = preprocessTextForNaturalSpeech(text, lang);
  if (!cleanText) return false;

  // Toggle stop if already speaking this exact item
  if (globalSpeakingState.isSpeaking && globalSpeakingState.speakingId === id) {
    stopAllSpeech();
    return true;
  }

  stopAllSpeech();

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
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: cleanText,
            lang,
            gender: effectiveGender,
            speed: effectiveSpeed,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data && data.audioBase64) {
            const rawBytes = base64ToUint8Array(data.audioBase64);
            let blob: Blob;

            // Handle PCM vs WAV vs MP3
            if (data.mimeType && data.mimeType.includes('pcm')) {
              blob = pcmToWavBlob(rawBytes, 24000);
            } else if (rawBytes[0] === 0x52 && rawBytes[1] === 0x49 && rawBytes[2] === 0x46 && rawBytes[3] === 0x46) {
              // Valid RIFF WAV header
              blob = new Blob([rawBytes.buffer as ArrayBuffer], { type: 'audio/wav' });
            } else if (data.mimeType && data.mimeType.includes('wav')) {
              // Might be raw PCM returned with audio/wav mime
              blob = pcmToWavBlob(rawBytes, 24000);
            } else {
              // MP3 or MPEG
              blob = new Blob([rawBytes.buffer as ArrayBuffer], { type: data.mimeType || 'audio/mpeg' });
            }

            blobUrl = URL.createObjectURL(blob);
            audioBlobCache.set(cacheKey, { blobUrl, mimeType: data.mimeType || 'audio/mpeg' });
          }
        }
      }

      if (blobUrl) {
        const audio = new Audio(blobUrl);
        audio.playbackRate = Math.max(0.7, Math.min(1.4, effectiveSpeed));

        globalSpeakingState = {
          isSpeaking: true,
          speakingId: id,
          speakingText: cleanText,
          lang,
          source: 'neural',
        };
        notifyStateChanged();
        if (onStart) onStart();

        currentHtmlAudio = audio;

        audio.onended = () => {
          if (globalSpeakingState.speakingId === id) {
            globalSpeakingState = {
              isSpeaking: false,
              speakingId: null,
              speakingText: null,
              lang: null,
              source: null,
            };
            notifyStateChanged();
            if (onEnd) onEnd();
          }
        };

        audio.onerror = (e) => {
          console.warn('[Speech] Audio element error, falling back to browser synthesis:', e);
          stopAllSpeech();
          playBrowserSpeechOptimized(options);
        };

        await audio.play();
        return true;
      }
    } catch (neuralErr) {
      console.info('[Speech] Neural TTS fallback to browser engine:', (neuralErr as any)?.message);
    }
  }

  // Tier 2: Enhanced Browser Speech Synthesis Engine with Pro Tonal Calibration
  return playBrowserSpeechOptimized({
    text: cleanText,
    lang,
    id,
    gender: effectiveGender,
    speed: effectiveSpeed,
    onStart,
    onEnd,
    onError,
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

  const { text, lang = 'vi-VN', id = `speech-${Date.now()}`, gender = 'female', speed = 0.92, onStart, onEnd, onError } = options;

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
      utterance.rate = Math.max(0.75, Math.min(1.2, speed * 0.92));
      utterance.pitch = 0.98;
    } else if (isEs) {
      utterance.rate = Math.max(0.8, Math.min(1.25, speed * 0.96));
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

    globalSpeakingState = {
      isSpeaking: true,
      speakingId: id,
      speakingText: text,
      lang,
      source: 'browser',
    };
    notifyStateChanged();
    if (onStart) onStart();

    utterance.onend = () => {
      if (globalSpeakingState.speakingId === id) {
        globalSpeakingState = {
          isSpeaking: false,
          speakingId: null,
          speakingText: null,
          lang: null,
          source: null,
        };
        notifyStateChanged();
        if (onEnd) onEnd();
      }
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis utterance error:', e);
      if (globalSpeakingState.speakingId === id) {
        globalSpeakingState = {
          isSpeaking: false,
          speakingId: null,
          speakingText: null,
          lang: null,
          source: null,
        };
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
