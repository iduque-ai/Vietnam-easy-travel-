import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  ExternalLink,
  Copy,
  Check,
  ArrowLeftRight,
  Languages,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { speakVietnamese, speakEnglish, openGoogleTranslate } from '../utils/storage';

interface ConversationModeProps {
  isOnline: boolean;
}

interface QuickPhrase {
  label: string;
  en: string;
  es: string;
  vi: string;
  phonetic: string;
  tip?: string;
}

const QUICK_PHRASES: QuickPhrase[] = [
  {
    label: '¿Cuánto cuesta?',
    en: 'How much is this?',
    es: '¿Cuánto cuesta esto?',
    vi: 'Cái này bao nhiêu tiền vậy ạ?',
    phonetic: 'Cai nay bao nyew tien vay ah?',
    tip: 'Pregunta estándar para puestos callejeros y tiendas.',
  },
  {
    label: 'La cuenta, por favor',
    en: 'Can I have the bill please?',
    es: 'La cuenta, por favor',
    vi: 'Em ơi, tính tiền giúp anh / chị với!',
    phonetic: 'Em oy, tin tien zoop anh voy!',
    tip: '"Em ơi" es el llamado cortés y universal para camareros.',
  },
  {
    label: 'Sin picante',
    en: 'No spicy, no chili please',
    es: 'Sin picante ni guindilla por favor',
    vi: 'Làm ơn đừng cho ớt và không cay nhé!',
    phonetic: 'Lam on dung cho ot va khong cay nye!',
    tip: 'Muy útil en sopas y fideos callejeros donde suelen añadir guindilla fresca.',
  },
  {
    label: 'Alergia a cacahuetes',
    en: 'Severe allergy to peanuts / nuts',
    es: 'Alergia severa a cacahuetes y frutos secos',
    vi: 'Tôi bị dị ứng lạc (đậu phộng) rất nặng, xin đừng cho!',
    phonetic: 'Toi bee zee ung lack (dau fong) rut nung, sin dung cho!',
    tip: 'En el norte se dice "lạc", en el sur "đậu phộng".',
  },
  {
    label: '¿Dónde está el baño?',
    en: 'Where is the restroom?',
    es: '¿Dónde está el servicio / baño?',
    vi: 'Nhà vệ sinh ở đâu vậy ạ?',
    phonetic: 'Nya vee sin o dau vay ah?',
    tip: 'Se pronuncia suavemente "nya ve sin".',
  },
  {
    label: 'Muchas gracias',
    en: 'Thank you very much',
    es: 'Muchas gracias',
    vi: 'Cảm ơn bạn rất nhiều!',
    phonetic: 'Cam on ban rut nyew!',
    tip: 'Acompaña con una sonrisa o ligera inclinación de cabeza.',
  },
  {
    label: '1 Cà phê sữa đá',
    en: 'One iced milk coffee please',
    es: 'Un café con leche condensada y hielo por favor',
    vi: 'Cho tôi một ly cà phê sữa đá nhé!',
    phonetic: 'Cho toi mot lee ca fe sua da nye!',
    tip: 'El icónico café vietnamita filtrado con leche condensada y hielo.',
  },
  {
    label: '¿Tiene wifi?',
    en: 'Do you have wifi? Password please',
    es: '¿Tiene wifi? ¿Cuál es la contraseña?',
    vi: 'Ở đây có wifi không? Cho tôi xin mật khẩu với.',
    phonetic: 'O day co wifi khong? Cho toi sin mot khao voy.',
    tip: 'Casi todas las cafeterías tienen wifi gratuito.',
  },
  {
    label: '20.000 ₫ (~0,75 €)',
    en: 'Twenty thousand VND',
    es: 'Veinte mil dongs',
    vi: 'Hai mươi nghìn',
    phonetic: 'Hai muoi nghin',
    tip: '20k VND. Suele ser el precio de un café o té helado (trà đá).',
  },
  {
    label: '50.000 ₫ (~1,90 €)',
    en: 'Fifty thousand VND',
    es: 'Cincuenta mil dongs',
    vi: 'Năm mươi nghìn',
    phonetic: 'Nam muoi nghin',
    tip: '50k VND. Precio típico de un plato de phở o bún chả en la calle.',
  },
  {
    label: '100.000 ₫ (~3,80 €)',
    en: 'One hundred thousand VND',
    es: 'Cien mil dongs',
    vi: 'Một trăm nghìn',
    phonetic: 'Mot tram nghin',
    tip: '100k VND. Billete verde de polímero.',
  },
  {
    label: 'Espera un momento',
    en: 'Please wait a moment',
    es: 'Espera un momento por favor',
    vi: 'Chờ tôi một chút nhé!',
    phonetic: 'Cho toi mot choot nye!',
    tip: 'Frase útil para mirar la cartera o consultar el mapa.',
  },
];

export const ConversationMode: React.FC<ConversationModeProps> = ({ isOnline }) => {
  // Mode direction: 'traveler-to-vi' (Tourist speaks English/Spanish -> Vietnamese) or 'vi-to-traveler' (Vendor speaks Vietnamese -> English)
  const [direction, setDirection] = useState<'traveler-to-vi' | 'vi-to-traveler'>('traveler-to-vi');
  const [travelerLang, setTravelerLang] = useState<'en' | 'es'>('en');

  // Input & output text
  const [inputText, setInputText] = useState('How much is this?');
  const [translatedText, setTranslatedText] = useState('Cái này bao nhiêu tiền vậy ạ?');
  const [phoneticText, setPhoneticText] = useState('Cai nay bao nyew tien vay ah?');
  const [tipText, setTipText] = useState('Pregunta estándar para puestos callejeros y tiendas.');

  const [isTranslating, setIsTranslating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);

  // Speech recognition
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Speech synthesis check
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  const handleToggleDirection = () => {
    if (direction === 'traveler-to-vi') {
      setDirection('vi-to-traveler');
      setInputText(translatedText || 'Năm mươi nghìn');
      setTranslatedText('Fifty thousand VND (~1.90 €)');
      setPhoneticText('Nam muoi nghin');
      setTipText('50.000 dongs vietnamitas');
    } else {
      setDirection('traveler-to-vi');
      setInputText('How much is this?');
      setTranslatedText('Cái này bao nhiêu tiền vậy ạ?');
      setPhoneticText('Cai nay bao nyew tien vay ah?');
      setTipText('Pregunta de precio para mostrar al vendedor.');
    }
  };

  const handleTranslate = async (overrideText?: string) => {
    const textToTranslate = (overrideText !== undefined ? overrideText : inputText).trim();
    if (!textToTranslate) return;

    setIsTranslating(true);

    try {
      const isViToTraveler = direction === 'vi-to-traveler';
      const sourceLang = isViToTraveler ? 'vi' : travelerLang;
      const targetLang = isViToTraveler ? travelerLang : 'vi';

      if (isOnline) {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: textToTranslate, sourceLang, targetLang }),
        });
        const data = await res.json();
        if (data && data.translation) {
          const resultVi = data.translation.translatedText || data.translation.vietnamese || textToTranslate;
          setTranslatedText(resultVi);
          setPhoneticText(data.translation.phonetic || '');
          setTipText(data.translation.tip || '');

          if (autoSpeak) {
            if (isViToTraveler) {
              speakEnglish(resultVi);
            } else {
              speakVietnamese(resultVi);
            }
          }
          return;
        }
      }

      // Offline fallback
      if (direction === 'traveler-to-vi') {
        const match = QUICK_PHRASES.find(
          (q) =>
            q.en.toLowerCase().includes(textToTranslate.toLowerCase()) ||
            q.es.toLowerCase().includes(textToTranslate.toLowerCase()) ||
            q.label.toLowerCase().includes(textToTranslate.toLowerCase())
        );
        if (match) {
          setTranslatedText(match.vi);
          setPhoneticText(match.phonetic);
          setTipText(match.tip || '');
          if (autoSpeak) speakVietnamese(match.vi);
        } else {
          setTranslatedText(`Tôi muốn hỏi: "${textToTranslate}"`);
          setPhoneticText('Toi muon hoi... (Muestra esta pantalla)');
          setTipText('Traducción básica sin conexión');
        }
      } else {
        setTranslatedText(`(Local said): "${textToTranslate}"`);
        setPhoneticText(textToTranslate);
        setTipText('Respuesta del vendedor vietnamita');
      }
    } catch (err) {
      console.warn('Translate error:', err);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleQuickPhraseClick = (phrase: QuickPhrase) => {
    if (direction === 'traveler-to-vi') {
      const query = travelerLang === 'es' ? phrase.es : phrase.en;
      setInputText(query);
      setTranslatedText(phrase.vi);
      setPhoneticText(phrase.phonetic);
      setTipText(phrase.tip || '');
      if (autoSpeak) {
        speakVietnamese(phrase.vi);
      }
    } else {
      setInputText(phrase.vi);
      setTranslatedText(travelerLang === 'es' ? phrase.es : phrase.en);
      setPhoneticText(phrase.phonetic);
      setTipText(phrase.tip || '');
      if (autoSpeak) {
        speakEnglish(phrase.en);
      }
    }
  };

  const handleSpeakOutput = () => {
    if (!translatedText) return;
    if (direction === 'traveler-to-vi') {
      speakVietnamese(translatedText);
    } else {
      speakEnglish(translatedText);
    }
  };

  const handleCopy = () => {
    if (!translatedText) return;
    navigator.clipboard.writeText(translatedText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const toggleMic = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Tu navegador no soporta reconocimiento por voz directo. Puedes escribir el texto o abrir Google Translate con el botón superior.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = false;

      if (direction === 'traveler-to-vi') {
        recognition.lang = travelerLang === 'es' ? 'es-ES' : 'en-US';
      } else {
        recognition.lang = 'vi-VN';
      }

      setIsListening(true);

      recognition.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        setInputText(transcript);
        setIsListening(false);
        handleTranslate(transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const isTravelerToVi = direction === 'traveler-to-vi';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 1. STATUS CARD (Exact design of Currency Converter's Rate Status Card) */}
      <div className="bg-stone-900 text-stone-100 rounded-xl p-4 border border-stone-800 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 mt-0.5">
            <Languages className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">Modo Conversación Directa</span>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                  isOnline
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-amber-950 text-amber-300 border border-amber-800'
                }`}
              >
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              {isTravelerToVi ? (
                <>
                  <strong className="text-amber-300">
                    {travelerLang === 'en' ? 'Inglés' : 'Español'} ➔ Vietnamita
                  </strong>
                  <span className="mx-2">•</span>
                  Muestra la pantalla o pulsa el audio
                </>
              ) : (
                <>
                  <strong className="text-amber-300">Vietnamita ➔ {travelerLang === 'en' ? 'Inglés' : 'Español'}</strong>
                  <span className="mx-2">•</span>
                  Traducción directa al instante
                </>
              )}
            </p>
          </div>
        </div>

        {/* Action: Open official Google Translate in text mode */}
        <button
          id="btn-open-google-translate"
          onClick={() => openGoogleTranslate(travelerLang === 'es' ? 'es' : 'en', 'vi', inputText)}
          className="px-3.5 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white border border-stone-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0"
          title="Abrir en Google Translate en modo texto con la frase actual"
        >
          <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Google Translate</span>
          <span className="sm:hidden">Translate</span>
        </button>
      </div>

      {/* 2. MAIN CONVERTER CARD (Exact design of Currency Converter's Main Card) */}
      <div className="bg-white rounded-2xl p-5 sm:p-7 border border-stone-200 shadow-sm space-y-6">
        {/* Top Controls row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Dirección:
            </span>

            {/* Direction switcher button */}
            <button
              id="btn-switch-direction"
              onClick={handleToggleDirection}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-900 text-xs sm:text-sm font-semibold border border-stone-300 transition cursor-pointer"
              title="Invertir dirección de la conversación"
            >
              <span>{isTravelerToVi ? (travelerLang === 'en' ? '🇬🇧 Inglés' : '🇪🇸 Español') : '🇻🇳 Tiếng Việt'}</span>
              <ArrowLeftRight className="w-3.5 h-3.5 text-amber-600" />
              <span>{isTravelerToVi ? '🇻🇳 Tiếng Việt' : (travelerLang === 'en' ? '🇬🇧 Inglés' : '🇪🇸 Español')}</span>
            </button>

            {/* Language toggle for tourist */}
            <button
              onClick={() => {
                const nextLang = travelerLang === 'en' ? 'es' : 'en';
                setTravelerLang(nextLang);
                if (inputText === 'How much is this?' && nextLang === 'es') setInputText('¿Cuánto cuesta esto?');
                if (inputText === '¿Cuánto cuesta esto?' && nextLang === 'en') setInputText('How much is this?');
              }}
              className="text-[11px] font-semibold text-stone-600 hover:text-stone-900 bg-stone-100 px-2 py-1 rounded border border-stone-200 transition cursor-pointer"
              title="Cambiar idioma del turista"
            >
              {travelerLang === 'en' ? 'Cambiar a Español' : 'Cambiar a English'}
            </button>
          </div>

          {/* Auto voice speech toggle */}
          <label className="flex items-center gap-2 text-xs text-stone-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoSpeak}
              onChange={(e) => setAutoSpeak(e.target.checked)}
              className="rounded border-stone-300 text-amber-600 focus:ring-amber-500 h-3.5 w-3.5 cursor-pointer"
            />
            <span className="font-medium">Audio automático</span>
          </label>
        </div>

        {/* Dual Input/Output Display (Mirrors VND & Foreign boxes in CurrencyConverter) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
          {/* Box 1: Input Box (Lo que dices) */}
          <div className="p-4 sm:p-5 rounded-xl border border-stone-200 bg-stone-50/70 focus-within:border-amber-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-amber-500/20 transition shadow-2xs flex flex-col justify-between min-h-[160px]">
            <div>
              <div className="flex items-center justify-between text-xs font-medium text-stone-500 mb-2">
                <span className="flex items-center gap-1.5 font-semibold text-stone-800">
                  <span className="text-base">{isTravelerToVi ? (travelerLang === 'en' ? '🇬🇧' : '🇪🇸') : '🇻🇳'}</span>
                  <span>{isTravelerToVi ? (travelerLang === 'en' ? 'Tú hablas (Inglés)' : 'Tú hablas (Español)') : 'El vendedor habla (Vietnamita)'}</span>
                </span>

                <button
                  onClick={toggleMic}
                  className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                    isListening
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-stone-200/80 hover:bg-stone-300 text-stone-800'
                  }`}
                  title={isListening ? 'Detener micrófono' : 'Hablar por micrófono'}
                >
                  {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-amber-600" />}
                  <span className="text-[11px]">{isListening ? 'Escuchando...' : 'Hablar'}</span>
                </button>
              </div>

              <textarea
                id="input-translate-text"
                rows={3}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleTranslate();
                  }
                }}
                placeholder={
                  isTravelerToVi
                    ? (travelerLang === 'en' ? 'Type or speak in English (e.g. How much is this?)...' : 'Escribe o habla lo que quieres decir...')
                    : 'Nhập hoặc nói tiếng Việt...'
                }
                className="w-full text-base sm:text-lg font-medium text-stone-900 bg-transparent border-none focus:outline-none resize-none placeholder-stone-400"
              />
            </div>

            <div className="mt-3 pt-2 border-t border-stone-200/70 flex items-center justify-between text-xs">
              {inputText ? (
                <button
                  onClick={() => setInputText('')}
                  className="text-stone-400 hover:text-stone-700 text-[11px] underline cursor-pointer"
                >
                  Borrar
                </button>
              ) : (
                <span className="text-stone-400 text-[11px]">Pulsa Enter para traducir</span>
              )}

              <button
                id="btn-submit-translate"
                onClick={() => handleTranslate()}
                disabled={isTranslating || !inputText.trim()}
                className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-stone-950 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isTranslating ? 'animate-spin' : ''}`} />
                <span>{isTranslating ? 'Traduciendo...' : 'Traducir'}</span>
              </button>
            </div>
          </div>

          {/* Box 2: Result Box (Lo que lee el local) */}
          <div className="p-4 sm:p-5 rounded-xl border border-amber-200/80 bg-amber-50/40 transition shadow-2xs flex flex-col justify-between min-h-[160px]">
            <div>
              <div className="flex items-center justify-between text-xs font-medium text-stone-500 mb-2">
                <span className="flex items-center gap-1.5 font-semibold text-amber-950">
                  <span className="text-base">{isTravelerToVi ? '🇻🇳' : (travelerLang === 'en' ? '🇬🇧' : '🇪🇸')}</span>
                  <span>{isTravelerToVi ? 'Para mostrar al local (Tiếng Việt)' : 'Traducción para ti'}</span>
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleSpeakOutput}
                    disabled={!translatedText}
                    className="p-1.5 rounded-lg bg-white border border-amber-200 hover:bg-amber-100 text-stone-700 hover:text-amber-900 transition cursor-pointer"
                    title="Escuchar pronunciación nativa"
                  >
                    <Volume2 className="w-4 h-4 text-amber-700" />
                  </button>

                  <button
                    onClick={handleCopy}
                    disabled={!translatedText}
                    className="p-1.5 rounded-lg bg-white border border-amber-200 hover:bg-amber-100 text-stone-700 hover:text-amber-900 transition cursor-pointer"
                    title="Copiar texto"
                  >
                    {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-stone-600" />}
                  </button>
                </div>
              </div>

              {/* Big readable text to show the phone to the vendor */}
              <div className="py-1">
                <p className="text-xl sm:text-2xl font-bold font-sans text-stone-950 leading-snug break-words">
                  {translatedText || '...'}
                </p>
              </div>

              {/* Phonetic pronunciation */}
              {phoneticText && (
                <div className="mt-2.5 p-2 rounded-lg bg-white/90 border border-amber-200/80 text-xs font-mono text-stone-800">
                  <span className="text-stone-500 font-sans">🗣️ Fonética: </span>
                  <strong className="text-amber-950">{phoneticText}</strong>
                </div>
              )}

              {/* Context / Tip */}
              {tipText && (
                <p className="text-[11px] text-amber-900 mt-2 font-medium leading-relaxed">
                  💡 {tipText}
                </p>
              )}
            </div>

            <div className="mt-3 pt-2 border-t border-amber-200/60 flex items-center justify-between text-[11px] text-stone-500">
              <span>{isTravelerToVi ? 'Gira la pantalla hacia el dependiente' : 'Respuesta traducida'}</span>
              <button
                onClick={handleSpeakOutput}
                className="text-amber-800 font-bold hover:underline cursor-pointer flex items-center gap-1"
              >
                <Volume2 className="w-3 h-3" />
                <span>Repetir audio</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. QUICK CHIPS (Exact design of Currency Converter's quick amount chips) */}
        <div className="space-y-2 pt-2 border-t border-stone-100">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-stone-500">
            <span>Frases y preguntas rápidas (1 toque):</span>
            <span className="text-[11px] text-stone-400 font-normal normal-case hidden sm:inline">
              Traduce y pronuncia al instante
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {QUICK_PHRASES.map((phrase) => (
              <button
                key={phrase.label}
                onClick={() => handleQuickPhraseClick(phrase)}
                className="p-2.5 rounded-xl border border-stone-200 bg-stone-50/70 hover:bg-amber-50 hover:border-amber-300 text-left transition cursor-pointer flex flex-col justify-between group"
              >
                <div className="text-xs font-bold text-stone-900 group-hover:text-amber-950">
                  {phrase.label}
                </div>
                <div className="text-[11px] text-amber-700 font-medium mt-1 truncate">
                  {phrase.vi}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 4. Practical Tip Card */}
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 text-xs text-stone-600 flex items-start gap-3">
          <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-stone-800">Consejo para comunicarte en Vietnam:</p>
            <p>
              El vietnamita es una lengua tonal (6 tonos). Si al hablar el conductor o camarero duda, <strong>muéstrale directamente la pantalla en grande</strong> con el texto en vietnamita o pulsa el botón del altavoz para reproducir la voz nativa.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
