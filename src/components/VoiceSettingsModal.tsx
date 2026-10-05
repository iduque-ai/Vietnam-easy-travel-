import React, { useState, useEffect } from 'react';
import {
  Volume2,
  Sliders,
  Check,
  X,
  Play,
  Square,
  Sparkles,
  Gauge,
  User,
  Languages,
} from 'lucide-react';
import {
  SpeechSettings,
  getSavedSpeechSettings,
  saveSpeechSettings,
  playNaturalSpeech,
  stopAllSpeech,
  subscribeSpeechState,
  subscribeSpeechSettings,
} from '../utils/speechSynthesis';
import { useScrollLock } from '../hooks/useScrollLock';

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
}

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({
  isOpen,
  onClose,
  isOnline,
}) => {
  useScrollLock(isOpen);

  const [settings, setSettings] = useState<SpeechSettings>(() => getSavedSpeechSettings());
  const [isPlayingTest, setIsPlayingTest] = useState(false);
  const [testLang, setTestLang] = useState<'vi' | 'es'>('vi');

  useEffect(() => {
    const unsub = subscribeSpeechState((state) => {
      setIsPlayingTest(state.isSpeaking && (state.speakingId === 'test-voice-sample-vi' || state.speakingId === 'test-voice-sample-es'));
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = subscribeSpeechSettings((s) => {
      setSettings(s);
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  const handleUpdate = (updated: Partial<SpeechSettings>, autoPreview = false) => {
    const newSettings = saveSpeechSettings(updated);
    setSettings(newSettings);

    if (autoPreview) {
      setTimeout(() => {
        playNaturalSpeech({
          text: testLang === 'vi' ? 'Xin chào! Cảm ơn bạn rất nhiều.' : '¡Hola! Te ayudamos en tu viaje.',
          lang: testLang === 'vi' ? 'vi-VN' : 'es-ES',
          id: `test-voice-sample-${testLang}`,
          speed: newSettings.speedValue,
          gender: newSettings.gender,
          engineMode: newSettings.engineMode,
        });
      }, 50);
    }
  };

  const handleTestVoice = (lang: 'vi' | 'es') => {
    const sampleId = `test-voice-sample-${lang}`;
    if (isPlayingTest) {
      stopAllSpeech();
      return;
    }

    setTestLang(lang);
    const testText =
      lang === 'vi'
        ? 'Xin chào! Tôi có thể giúp gì cho bạn? Chúc bạn có một chuyến đi tuyệt vời.'
        : '¡Hola! Te ayudamos a comunicarte fácilmente durante tu viaje por Vietnam.';

    playNaturalSpeech({
      text: testText,
      lang: lang === 'vi' ? 'vi-VN' : 'es-ES',
      id: sampleId,
      speed: settings.speedValue,
      gender: settings.gender,
      engineMode: settings.engineMode,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white text-stone-900 border border-stone-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl space-y-0 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Clean Header */}
        <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/15 text-amber-700 border border-amber-500/25 flex items-center justify-center shadow-2xs">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-stone-900">
                Ajuste de Voz & Pronunciación
              </h3>
              <p className="text-xs text-stone-500">
                Configuración global para traductor, diccionario y guías
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition cursor-pointer"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* 1. Voice Gender Picker */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-amber-600" />
              <span>Tipo de Voz</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleUpdate({ gender: 'female' }, true)}
                className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex items-center justify-between ${
                  settings.gender === 'female'
                    ? 'bg-amber-50 border-amber-500 text-stone-950 font-bold ring-2 ring-amber-500/20 shadow-2xs'
                    : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">👩</span>
                  <div>
                    <div className="text-xs font-bold">Femenina</div>
                    <div className="text-[10px] text-stone-500 font-normal">Cálida y clara</div>
                  </div>
                </div>
                {settings.gender === 'female' && (
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center text-[10px]">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleUpdate({ gender: 'male' }, true)}
                className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex items-center justify-between ${
                  settings.gender === 'male'
                    ? 'bg-amber-50 border-amber-500 text-stone-950 font-bold ring-2 ring-amber-500/20 shadow-2xs'
                    : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">👨</span>
                  <div>
                    <div className="text-xs font-bold">Masculina</div>
                    <div className="text-[10px] text-stone-500 font-normal">Grave y pausada</div>
                  </div>
                </div>
                {settings.gender === 'male' && (
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center text-[10px]">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* 2. Speed Preset */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-amber-600" />
                <span>Velocidad de habla</span>
              </span>
              <span className="text-[11px] font-mono text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                {settings.speedPreset === 'slow' ? '0.8x Lenta' : settings.speedPreset === 'fast' ? '1.1x Rápida' : '0.95x Normal'}
              </span>
            </label>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleUpdate({ speedPreset: 'slow', speedValue: 0.82 }, true)}
                className={`py-3 px-2 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                  settings.speedPreset === 'slow'
                    ? 'bg-amber-500 text-stone-950 font-bold border-amber-400 shadow-xs ring-2 ring-amber-500/20'
                    : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <span className="text-base">🐢</span>
                <span className="text-xs font-bold">Lenta</span>
                <span className="text-[10px] opacity-75">Para aprender</span>
              </button>

              <button
                type="button"
                onClick={() => handleUpdate({ speedPreset: 'natural', speedValue: 0.95 }, true)}
                className={`py-3 px-2 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                  settings.speedPreset === 'natural'
                    ? 'bg-amber-500 text-stone-950 font-bold border-amber-400 shadow-xs ring-2 ring-amber-500/20'
                    : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <span className="text-base">✨</span>
                <span className="text-xs font-bold">Normal</span>
                <span className="text-[10px] opacity-75">Recomendada</span>
              </button>

              <button
                type="button"
                onClick={() => handleUpdate({ speedPreset: 'fast', speedValue: 1.1 }, true)}
                className={`py-3 px-2 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                  settings.speedPreset === 'fast'
                    ? 'bg-amber-500 text-stone-950 font-bold border-amber-400 shadow-xs ring-2 ring-amber-500/20'
                    : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <span className="text-base">🐇</span>
                <span className="text-xs font-bold">Rápida</span>
                <span className="text-[10px] opacity-75">Fluida</span>
              </button>
            </div>
            <p className="text-[11px] text-stone-500">
              💡 La velocidad lenta te ayuda a escuchar la diferencia entre los 6 tonos del vietnamita.
            </p>
          </div>

          {/* 3. Audio Test Box */}
          <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-amber-950 font-semibold">
              <span>Probar cómo suena:</span>
              <span className="text-[10px] text-stone-500">
                {isOnline ? '🟢 Conexión de voz HD' : '🟠 Modo offline'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleTestVoice('vi')}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 shadow-2xs ${
                  isPlayingTest && testLang === 'vi'
                    ? 'bg-rose-600 text-white animate-pulse ring-2 ring-rose-300'
                    : 'bg-stone-900 hover:bg-stone-800 text-amber-300'
                }`}
              >
                {isPlayingTest && testLang === 'vi' ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Parar</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>🇻🇳 Vietnamita</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleTestVoice('es')}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 shadow-2xs ${
                  isPlayingTest && testLang === 'es'
                    ? 'bg-rose-600 text-white animate-pulse ring-2 ring-rose-300'
                    : 'bg-stone-900 hover:bg-stone-800 text-amber-300'
                }`}
              >
                {isPlayingTest && testLang === 'es' ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Parar</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>🇪🇸 Español</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition cursor-pointer shadow-xs active:scale-95"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
