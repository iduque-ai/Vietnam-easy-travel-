import React, { useState, useEffect } from 'react';
import {
  Volume2,
  Sliders,
  Sparkles,
  Check,
  X,
  Play,
  Square,
  Zap,
  Gauge,
  User,
  Headphones,
  RefreshCw,
} from 'lucide-react';
import {
  SpeechSettings,
  getSavedSpeechSettings,
  saveSpeechSettings,
  playNaturalSpeech,
  stopAllSpeech,
  subscribeSpeechState,
} from '../utils/speechSynthesis';

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
  const [settings, setSettings] = useState<SpeechSettings>(() => getSavedSpeechSettings());
  const [isPlayingTest, setIsPlayingTest] = useState(false);

  useEffect(() => {
    const unsub = subscribeSpeechState((state) => {
      setIsPlayingTest(state.isSpeaking && state.speakingId === 'test-voice-sample');
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  const handleUpdate = (updated: Partial<SpeechSettings>) => {
    const newSettings = saveSpeechSettings(updated);
    setSettings(newSettings);
  };

  const handleTestVoice = (lang: 'vi' | 'es' = 'vi') => {
    if (isPlayingTest) {
      stopAllSpeech();
      return;
    }

    const testText =
      lang === 'vi'
        ? 'Xin chào bạn! Chúc bạn có một chuyến du lịch Việt Nam thật tuyệt vời và nhiều trải nghiệm đẹp.'
        : '¡Hola! Bienvenido a Vietnam. Te ayudamos a comunicarte de forma natural y sin complicaciones.';

    playNaturalSpeech({
      text: testText,
      lang: lang === 'vi' ? 'vi-VN' : 'es-ES',
      id: 'test-voice-sample',
      speed: settings.speedValue,
      gender: settings.gender,
      engineMode: settings.engineMode,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[#181614] text-stone-100 border border-stone-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl space-y-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-stone-800 flex items-center justify-between bg-gradient-to-r from-stone-900 to-[#1e1b18]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-inner">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-white flex items-center gap-2">
                Ajustes de Voz & Síntesis Natural
              </h3>
              <p className="text-xs text-stone-400">
                Calibración de tono suave, pausas humanas y pronunciación tonal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Engine Mode */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Motor de Síntesis Vocal
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleUpdate({ engineMode: 'auto' })}
                className={`p-3.5 rounded-2xl text-left border transition cursor-pointer flex flex-col justify-between ${
                  settings.engineMode === 'auto'
                    ? 'bg-amber-500/15 border-amber-500/50 text-white shadow-sm'
                    : 'bg-stone-900/70 border-stone-800 text-stone-300 hover:bg-stone-800/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm flex items-center gap-1.5 text-amber-300">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Voz Natural IA (HD)
                  </span>
                  {settings.engineMode === 'auto' && (
                    <span className="w-5 h-5 rounded-full bg-amber-400 text-stone-950 flex items-center justify-center text-xs font-bold">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-stone-400 mt-1.5 leading-relaxed">
                  Sonido humano ultra suave con entonación de los 6 tonos vietnamitas y pausas de respiración.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleUpdate({ engineMode: 'browser' })}
                className={`p-3.5 rounded-2xl text-left border transition cursor-pointer flex flex-col justify-between ${
                  settings.engineMode === 'browser'
                    ? 'bg-amber-500/15 border-amber-500/50 text-white shadow-sm'
                    : 'bg-stone-900/70 border-stone-800 text-stone-300 hover:bg-stone-800/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm flex items-center gap-1.5 text-stone-200">
                    <Headphones className="w-4 h-4 text-stone-400" />
                    Voz del Dispositivo
                  </span>
                  {settings.engineMode === 'browser' && (
                    <span className="w-5 h-5 rounded-full bg-amber-400 text-stone-950 flex items-center justify-center text-xs font-bold">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-stone-400 mt-1.5 leading-relaxed">
                  Sintetizador nativo del navegador calibrado a cadencia suave para funcionar 100% offline.
                </p>
              </button>
            </div>
          </div>

          {/* Speed Preset */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-amber-400" />
              Velocidad y Cadencia de Pronunciación
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleUpdate({ speedPreset: 'slow', speedValue: 0.82 })}
                className={`p-3 rounded-2xl border text-center transition cursor-pointer ${
                  settings.speedPreset === 'slow'
                    ? 'bg-amber-400 text-stone-950 font-bold border-amber-300 shadow-md'
                    : 'bg-stone-900 border-stone-800 text-stone-300 hover:bg-stone-800'
                }`}
              >
                <div className="text-xs font-bold">0.8x Lenta</div>
                <div className="text-[10px] opacity-80 mt-0.5">Para aprender</div>
              </button>

              <button
                type="button"
                onClick={() => handleUpdate({ speedPreset: 'natural', speedValue: 0.92 })}
                className={`p-3 rounded-2xl border text-center transition cursor-pointer ${
                  settings.speedPreset === 'natural'
                    ? 'bg-amber-400 text-stone-950 font-bold border-amber-300 shadow-md'
                    : 'bg-stone-900 border-stone-800 text-stone-300 hover:bg-stone-800'
                }`}
              >
                <div className="text-xs font-bold">0.92x Natural</div>
                <div className="text-[10px] opacity-80 mt-0.5">Recomendada</div>
              </button>

              <button
                type="button"
                onClick={() => handleUpdate({ speedPreset: 'fast', speedValue: 1.08 })}
                className={`p-3 rounded-2xl border text-center transition cursor-pointer ${
                  settings.speedPreset === 'fast'
                    ? 'bg-amber-400 text-stone-950 font-bold border-amber-300 shadow-md'
                    : 'bg-stone-900 border-stone-800 text-stone-300 hover:bg-stone-800'
                }`}
              >
                <div className="text-xs font-bold">1.1x Fluida</div>
                <div className="text-[10px] opacity-80 mt-0.5">Nativa rápida</div>
              </button>
            </div>
            <p className="text-[11px] text-stone-400">
              💡 <strong className="text-stone-300">Consejo:</strong> El vietnamita tiene 6 tonos melódicos; una cadencia entre 0.8x y 0.92x permite que los vietnamitas entiendan perfectamente la inflexión de cada palabra sin prisas.
            </p>
          </div>

          {/* Voice Gender Tone */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-amber-400" />
              Timbre y Tono Vocal
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleUpdate({ gender: 'female' })}
                className={`p-3 rounded-2xl border flex items-center justify-between transition cursor-pointer ${
                  settings.gender === 'female'
                    ? 'bg-amber-500/20 border-amber-400 text-white font-medium'
                    : 'bg-stone-900 border-stone-800 text-stone-400 hover:bg-stone-800'
                }`}
              >
                <span className="text-xs font-semibold">Voz Femenina (Cálida)</span>
                {settings.gender === 'female' && <Check className="w-4 h-4 text-amber-400" />}
              </button>

              <button
                type="button"
                onClick={() => handleUpdate({ gender: 'male' })}
                className={`p-3 rounded-2xl border flex items-center justify-between transition cursor-pointer ${
                  settings.gender === 'male'
                    ? 'bg-amber-500/20 border-amber-400 text-white font-medium'
                    : 'bg-stone-900 border-stone-800 text-stone-400 hover:bg-stone-800'
                }`}
              >
                <span className="text-xs font-semibold">Voz Masculina (Profunda)</span>
                {settings.gender === 'male' && <Check className="w-4 h-4 text-amber-400" />}
              </button>
            </div>
          </div>

          {/* Audio Test Section */}
          <div className="p-4 rounded-2xl bg-stone-900/90 border border-stone-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-200">
                Probar calidad de síntesis
              </span>
              <span className="text-[10px] text-amber-400/90 font-mono">
                {isOnline ? 'Online HD' : 'Modo Offline'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleTestVoice('vi')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  isPlayingTest
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold'
                }`}
              >
                {isPlayingTest ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Detener prueba</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Escuchar en Vietnamita</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleTestVoice('es')}
                className="py-2.5 px-3 rounded-xl text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 transition cursor-pointer"
              >
                <span>Probar en Español</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:px-6 bg-stone-900 border-t border-stone-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs transition cursor-pointer shadow-sm"
          >
            Listo, guardar preferencias
          </button>
        </div>
      </div>
    </div>
  );
};
