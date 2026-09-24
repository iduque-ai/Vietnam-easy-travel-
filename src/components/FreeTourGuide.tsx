import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Compass,
  Headphones,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  MapPin,
  Clock,
  Camera,
  AlertTriangle,
  Utensils,
  MessageSquare,
  Send,
  Bookmark,
  BookmarkCheck,
  Share2,
  ChevronRight,
  Search,
  Navigation,
  CheckCircle2,
  Sparkle,
  Eye,
  Info,
  Layers,
  ArrowRight,
  History,
  Trash2,
  RefreshCw,
  BookOpen,
  ExternalLink,
} from 'lucide-react';
import { FreeTourData, FreeTourStop, PointOfInterest, TourChatMessage } from '../types';
import { POINTS_OF_INTEREST } from '../data/pois';
import { CURATED_CLIENT_TOURS, findClientCuratedTour } from '../data/curatedTours';
import { getSavedFreeTours, saveFreeTour, deleteSavedFreeTour } from '../utils/storage';
import {
  getSmartGeolocation,
  createSimulatedResult,
  VIETNAM_SIMULATION_PRESETS,
  SmartGeoResult,
  SmartGeoError,
} from '../utils/geolocation';

interface FreeTourGuideProps {
  initialPoi?: PointOfInterest | null;
  onClearInitialPoi?: () => void;
  isOnline: boolean;
}

type VibeType = 'curiosidades' | 'historia' | 'express' | 'fotografia' | 'gastronomia';

const VIBE_OPTIONS: { id: VibeType; label: string; icon: string; desc: string }[] = [
  {
    id: 'curiosidades',
    label: 'Mitos & Curiosidades',
    icon: '🔮',
    desc: 'Secretos locales, supersticiones y leyendas poco conocidas',
  },
  {
    id: 'historia',
    label: 'Historia & Dinastías',
    icon: '📜',
    desc: 'Reyes, guerras de resistencia y arquitectura tradicional',
  },
  {
    id: 'express',
    label: 'Tour Exprés (15m)',
    icon: '⚡',
    desc: 'Lo absolutamente imprescindible si tienes poco tiempo',
  },
  {
    id: 'fotografia',
    label: 'Enfoque Fotográfico',
    icon: '📸',
    desc: 'Ángulos secretos, juego de luces y cómo evitar aglomeraciones',
  },
  {
    id: 'gastronomia',
    label: 'Cultura & Vida Local',
    icon: '🍜',
    desc: 'Vida en la calle, aromas, té y mercados de los alrededores',
  },
];

const POPULAR_CITIES = [
  {
    name: 'Hà Nội',
    samplePois: [
      'Templo de la Literatura',
      'Lago Hoàn Kiếm y Templo Ngọc Sơn',
      'Calle del Tren (Train Street)',
      'Catedral de San José',
      'Mausoleo de Hồ Chí Minh',
    ],
  },
  {
    name: 'Huế',
    samplePois: [
      'Ciudadela Imperial de Huế (Đại Nội)',
      'Pagoda Thiên Mụ',
      'Tumba Imperial de Khải Định',
    ],
  },
  {
    name: 'Hội An',
    samplePois: [
      'Puente Japonés Cubierto (Chùa Cầu)',
      'Casa Antigua Tan Ky',
      'Mercado de Farolillos',
    ],
  },
  {
    name: 'Đà Nẵng',
    samplePois: [
      'Puente del Dragón (Cầu Rồng)',
      'Montañas de Mármol (Ngũ Hành Sơn)',
      'Pagoda Linh Ứng (Son Tra)',
    ],
  },
  {
    name: 'Ninh Bình',
    samplePois: [
      'Complejo Paisajístico de Tràng An',
      'Cueva y Mirador de Hang Múa',
      'Tam Cốc - Bích Động',
    ],
  },
  {
    name: 'TP. Hồ Chí Minh',
    samplePois: [
      'Túneles de Củ Chi',
      'Mercado Bến Thành',
      'Basílica de Notre-Dame y Correos',
    ],
  },
];

export const FreeTourGuide: React.FC<FreeTourGuideProps> = ({
  initialPoi,
  onClearInitialPoi,
  isOnline,
}) => {
  // Input state
  const [placeQuery, setPlaceQuery] = useState<string>(initialPoi?.nameEs || 'Templo de la Literatura');
  const [selectedCity, setSelectedCity] = useState<string>(initialPoi?.city || 'Hà Nội');
  const [selectedVibe, setSelectedVibe] = useState<VibeType>('curiosidades');
  const [isLocatingGps, setIsLocatingGps] = useState<boolean>(false);
  const [gpsNotice, setGpsNotice] = useState<string | null>(null);
  const [showGpsHelper, setShowGpsHelper] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<SmartGeoError | null>(null);
  const [gpsDetails, setGpsDetails] = useState<SmartGeoResult | null>(null);

  // Active tour state - initialize with a curated tour immediately so tour mode is never blank!
  const [activeTour, setActiveTour] = useState<FreeTourData>(() => {
    if (initialPoi) {
      const match = findClientCuratedTour(initialPoi.nameEs, initialPoi.city);
      if (match) return match;
    }
    return CURATED_CLIENT_TOURS[0];
  });
  const [isLoadingTour, setIsLoadingTour] = useState<boolean>(false);
  const [tourError, setTourError] = useState<string | null>(null);
  const [activeStopIndex, setActiveStopIndex] = useState<number>(0);

  // Saved tours
  const [savedTours, setSavedTours] = useState<FreeTourData[]>(getSavedFreeTours);
  const [showSavedList, setShowSavedList] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Audio Guide Speech Synthesis state
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [isPausedAudio, setIsPausedAudio] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [speakingTextTitle, setSpeakingTextTitle] = useState<string>('');
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState<number>(-1);
  const [audioSentences, setAudioSentences] = useState<string[]>([]);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const keepAliveIntervalRef = useRef<any>(null);

  // Interactive Guide Chat state
  const [chatMessages, setChatMessages] = useState<TourChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: `¡Xin chào! Soy Nguyễn, tu guía local aquí en ${CURATED_CLIENT_TOURS[0].placeName}. Disfruta de la audioguía y si tienes cualquier duda sobre lo que estás viendo, pregúntame aquí en directo.`,
      timestamp: Date.now(),
    },
  ]);
  const [chatInput, setChatInput] = useState<string>('');
  const [isSendingChat, setIsSendingChat] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // Stop any playing speech safely
  const stopAudio = useCallback(() => {
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingAudio(false);
    setIsPausedAudio(false);
    setSpeakingTextTitle('');
    setCurrentSentenceIndex(-1);
  }, []);

  // SpeechSynthesis audio playback with sentence-by-sentence queueing to prevent browser 15s freeze
  const playAudio = useCallback(
    (text: string, title: string) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        showToast('Tu navegador no soporta síntesis de voz interactiva.');
        return;
      }

      stopAudio();

      // Split text into readable sentences
      const rawSentences = text
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const sentences = rawSentences.length > 0 ? rawSentences : [text];
      setAudioSentences(sentences);
      setSpeakingTextTitle(title);
      setIsPlayingAudio(true);
      setIsPausedAudio(false);

      // Keepalive timer for Chrome / Android iframe speech pause issue
      keepAliveIntervalRef.current = setInterval(() => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
          }
        }
      }, 9000);

      let idx = 0;

      const speakSentence = (sentenceIdx: number) => {
        if (sentenceIdx >= sentences.length) {
          stopAudio();
          return;
        }

        setCurrentSentenceIndex(sentenceIdx);
        const utterance = new SpeechSynthesisUtterance(sentences[sentenceIdx]);
        utterance.lang = 'es-ES';
        utterance.rate = playbackSpeed;

        const voices = window.speechSynthesis.getVoices();
        const esVoice = voices.find(
          (v) =>
            v.lang.startsWith('es') &&
            (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Premium'))
        );
        if (esVoice) {
          utterance.voice = esVoice;
        }

        utterance.onend = () => {
          idx++;
          speakSentence(idx);
        };

        utterance.onerror = (e) => {
          console.warn('Speech sentence error:', e);
          idx++;
          if (idx < sentences.length) {
            speakSentence(idx);
          } else {
            stopAudio();
          }
        };

        speechUtteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      };

      speakSentence(0);
    },
    [playbackSpeed, stopAudio, showToast]
  );

  const pauseAudio = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (isPlayingAudio && !isPausedAudio) {
        window.speechSynthesis.pause();
        setIsPausedAudio(true);
      } else if (isPausedAudio) {
        window.speechSynthesis.resume();
        setIsPausedAudio(false);
      }
    }
  };

  const toggleSpeed = () => {
    const nextSpeed = playbackSpeed === 1.0 ? 1.2 : playbackSpeed === 1.2 ? 0.9 : 1.0;
    setPlaybackSpeed(nextSpeed);
    showToast(`Velocidad de narración: ${nextSpeed}x`);
  };

  // Pronounce Vietnamese term
  const speakVietnamese = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  // Helper to construct a reliable fallback tour client-side
  const createClientFallbackTour = (place: string, city: string): FreeTourData => {
    return {
      placeName: place,
      cityName: city || 'Vietnam',
      vietnameseName: place,
      tagline: `Un viaje fascinante por la memoria, la arquitectura y los secretos de ${place}.`,
      durationMinutes: 35,
      audioGuideScript: `¡Xin chào y bienvenido a ${place}! Te encuentras en uno de los enclaves más especiales de ${city}. Al observar a tu alrededor, notarás el equilibrio armónico entre la tradición vietnamita, las influencias orientales y el latido cotidiano de sus habitantes.\n\nTómate un momento para respirar el ambiente local. A lo largo de esta audioguía exploraremos las tres paradas fundamentales para comprender su historia, el simbolismo de sus detalles y las leyendas que han perdurado a través de los siglos.`,
      stops: [
        {
          number: 1,
          title: `Entrada y primer vistazo a ${place}`,
          whatToLookAt: 'La fachada principal, los aleros del tejado y la orientación tradicional del edificio.',
          story: 'Las construcciones vietnamitas tradicionales se erigen respetando la energía del entorno, buscando siempre la armonía entre el viento y el agua.',
          insiderTip: 'Observa la madera y los colores decorativos antes de que lleguen grupos grandes.',
        },
        {
          number: 2,
          title: 'Detalles ornamentales y simbolismo sagrado',
          whatToLookAt: 'Las figuras de dragones, fénix, carpas o lotos tallados en los aleros o altares.',
          story: 'En la mitología vietnamita, el dragón representa la fuerza del cielo y la carpa simboliza la perseverancia del estudiante que nunca se rinde.',
          insiderTip: 'Los artesanos locales solían emplear fragmentos de cerámica vidriada reciclada para dar vida a los mosaicos más brillantes.',
        },
        {
          number: 3,
          title: 'Patio interior y perspectiva de calma',
          whatToLookAt: 'El patio interior, los bonsáis centenarios y las ofrendas frescas de frutas y flores.',
          story: 'Los patios tradicionales actúan como pulmones de luz y sosiego, aislando el bullicio exterior de las motocicletas.',
          insiderTip: 'Aprovecha este rincón tranquilo para contemplar los tejados superpuestos.',
        },
      ],
      photoSpot: {
        location: `Frente a la perspectiva principal de ${place}.`,
        bestLight: 'A media tarde (16:00 - 17:30) con luz cálida.',
        instruction: 'Busca un ángulo que enmarque los aleros del tejado con el cielo o vegetación.',
      },
      culturalEtiquette: {
        dressCode: 'Hombros y rodillas cubiertos. Retirar gorras y gafas de sol en altares o templos.',
        whatNotToDo: 'Evitar hablar en voz alta frente a los altares de culto o señalar con un solo dedo.',
        scamWarning: 'Declina con cortesía si alguien te ofrece varitas de incienso no solicitadas diciendo "Không, cảm ơn".',
      },
      streetFoodReward: {
        dishNameVi: 'Cà Phê Sữa Đá / Trà Chanh',
        dishNameEs: 'Café vietnamita con leche condensada y hielo, o té verde helado con limón',
        whereToFind: 'En las cafeterías o puestos con taburetes bajos de las calles contiguas.',
        priceEstimate: '20.000 ₫ – 35.000 ₫',
      },
      suggestedQuestions: [
        `¿Cuál es la leyenda más fascinante de ${place}?`,
        '¿Qué significado tienen los dragones y fénix en la decoración?',
        '¿Qué plato típico de esta zona recomiendas probar hoy?',
      ],
    };
  };

  // Main tour loader & generator
  const handleGenerateTour = useCallback(
    async (customPlace?: string, customCity?: string) => {
      const targetPlace = (customPlace || placeQuery).trim();
      const targetCity = (customCity || selectedCity).trim();

      if (!targetPlace) {
        setTourError('Por favor indica el lugar o monumento donde estás.');
        return;
      }

      stopAudio();
      setIsLoadingTour(true);
      setTourError(null);

      // 1. Instant check against curated tours for immediate 0-latency experience
      const curatedMatch = findClientCuratedTour(targetPlace, targetCity);
      if (curatedMatch) {
        setActiveTour(curatedMatch);
        setActiveStopIndex(0);
        setPlaceQuery(curatedMatch.placeName);
        setSelectedCity(curatedMatch.cityName);
        setChatMessages([
          {
            id: `welcome-${Date.now()}`,
            role: 'assistant',
            text: `¡Xin chào! Soy Nguyễn, tu guía local aquí en ${curatedMatch.placeName}. Tienes la audioguía completa y detallada lista. ¡Pregúntame cualquier cosa que veas a tu alrededor!`,
            timestamp: Date.now(),
          },
        ]);
        setIsLoadingTour(false);
        showToast(`¡Tour de ${curatedMatch.placeName} listo!`);
        return;
      }

      // 2. Fetch from backend API if online
      if (isOnline) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 9000);

          const response = await fetch('/api/free-tour', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              placeName: targetPlace,
              cityName: targetCity,
              userVibe: selectedVibe,
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            if (data && data.success && data.tour) {
              setActiveTour(data.tour);
              setActiveStopIndex(0);
              setChatMessages([
                {
                  id: `welcome-${Date.now()}`,
                  role: 'assistant',
                  text: `¡Xin chào! Soy Nguyễn, tu guía local en ${data.tour.placeName}. Disfruta del recorrido y pregúntame lo que necesites.`,
                  timestamp: Date.now(),
                },
              ]);
              setIsLoadingTour(false);
              showToast('¡Free Tour generado con Gemini!');
              return;
            }
          }
        } catch (err) {
          console.warn('Network tour fetch fallback:', err);
        }
      }

      // 3. Robust client-side fallback if offline or server timeout
      const fallbackTour = createClientFallbackTour(targetPlace, targetCity);
      setActiveTour(fallbackTour);
      setActiveStopIndex(0);
      setChatMessages([
        {
          id: `welcome-fb-${Date.now()}`,
          role: 'assistant',
          text: `¡Xin chào! Soy Nguyễn, tu guía local en ${fallbackTour.placeName}. He preparado esta guía para ti. ¡Pregúntame cualquier duda que tengas!`,
          timestamp: Date.now(),
        },
      ]);
      setIsLoadingTour(false);
      showToast(`¡Tour cargado para ${targetPlace}!`);
    },
    [placeQuery, selectedCity, selectedVibe, isOnline, stopAudio, showToast]
  );

  // When opened with an initial POI, immediately start tour
  useEffect(() => {
    if (initialPoi) {
      setPlaceQuery(initialPoi.nameEs);
      setSelectedCity(initialPoi.city);
      handleGenerateTour(initialPoi.nameEs, initialPoi.city);
      if (onClearInitialPoi) {
        onClearInitialPoi();
      }
    }
  }, [initialPoi, handleGenerateTour, onClearInitialPoi]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, [stopAudio]);

  // Scroll chat to bottom
  useEffect(() => {
    if (chatMessages.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // Smart GPS detection with two-tier fallback and simulated testing
  const handleDetectGps = async () => {
    setIsLocatingGps(true);
    setGpsNotice('Buscando satélites GPS y redes...');
    setGpsError(null);
    setGpsDetails(null);

    const result = await getSmartGeolocation();
    setIsLocatingGps(false);

    if (result.success) {
      setGpsDetails(result.data);
      const { closestPoi, isInsideVietnam, distanceToVietnamKm, distanceToClosestPoiKm } = result.data;
      setPlaceQuery(closestPoi.nameEs);
      setSelectedCity(closestPoi.city);

      if (isInsideVietnam) {
        setGpsNotice(
          `🎯 ¡Ubicación GPS en Vietnam! Estás a ~${
            distanceToClosestPoiKm < 1 ? Math.round(distanceToClosestPoiKm * 1000) + ' m' : distanceToClosestPoiKm + ' km'
          } de ${closestPoi.nameEs}. Cargando audioguía...`
        );
      } else {
        setGpsNotice(
          `📍 Señal GPS detectada (${result.data.coords.latitude.toFixed(2)}, ${result.data.coords.longitude.toFixed(2)} - a ~${distanceToVietnamKm.toLocaleString()} km de Vietnam). Como estás preparando el viaje desde fuera, te hemos situado en ${closestPoi.nameEs} (${closestPoi.city}) para explorar su Free Tour.`
        );
        setShowGpsHelper(true);
      }
      handleGenerateTour(closestPoi.nameEs, closestPoi.city);
    } else {
      setGpsError(result.error);
      setGpsNotice(result.error.message);
      setShowGpsHelper(true);
    }
  };

  const handleSimulatePosition = (presetId: string) => {
    const sim = createSimulatedResult(presetId);
    setGpsDetails(sim);
    setGpsError(null);
    setShowGpsHelper(false);
    setPlaceQuery(sim.closestPoi.nameEs);
    setSelectedCity(sim.closestPoi.city);
    setGpsNotice(`🧭 Ubicación situada en: ${sim.simulatedName}. ¡Audioguía lista!`);
    handleGenerateTour(sim.closestPoi.nameEs, sim.closestPoi.city);
    showToast(`Posicionado en ${sim.simulatedName}`);
  };

  // Save / Bookmark Tour
  const handleToggleSaveTour = () => {
    if (!activeTour) return;
    const isAlreadySaved = savedTours.some(
      (t) => t.placeName.toLowerCase() === activeTour.placeName.toLowerCase()
    );

    if (isAlreadySaved) {
      const updated = deleteSavedFreeTour(activeTour.placeName);
      setSavedTours(updated);
      showToast('Tour eliminado de tus guardados offline.');
    } else {
      const updated = saveFreeTour(activeTour);
      setSavedTours(updated);
      showToast('¡Tour guardado! Puedes acceder a él 100% sin conexión.');
    }
  };

  const isCurrentTourSaved = activeTour
    ? savedTours.some((t) => t.placeName.toLowerCase() === activeTour.placeName.toLowerCase())
    : false;

  // Ask tour guide a question (Live Q&A with offline intelligence)
  const handleSendChatMessage = async (presetQuestion?: string) => {
    const questionText = (presetQuestion || chatInput).trim();
    if (!questionText || !activeTour || isSendingChat) return;

    const userMsg: TourChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: questionText,
      timestamp: Date.now(),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!presetQuestion) setChatInput('');
    setIsSendingChat(true);

    if (isOnline) {
      try {
        const res = await fetch('/api/tour-guide-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            placeName: activeTour.placeName,
            cityName: activeTour.cityName,
            question: questionText,
            chatHistory: chatMessages.slice(-4),
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.reply) {
            const guideMsg: TourChatMessage = {
              id: `guide-${Date.now()}`,
              role: 'assistant',
              text: data.reply,
              timestamp: Date.now(),
            };
            setChatMessages((prev) => [...prev, guideMsg]);
            setIsSendingChat(false);
            return;
          }
        }
      } catch (e) {
        console.warn('Tour guide online chat error:', e);
      }
    }

    // Smart contextual reply if offline
    let localAnswer = `¡Excelente pregunta sobre ${activeTour.placeName}! `;
    const qLower = questionText.toLowerCase();

    if (qLower.includes('leyenda') || qLower.includes('historia')) {
      localAnswer += `La historia central de este monumento refleja la resiliencia de la cultura vietnamita. Durante siglos ha sido respetado por emperadores y monjes por igual. Si miras a los tejados, notarás cómo los artesanos usaban fragmentos de cerámica vidriada rota para crear dragones celestiales y fénix.`;
    } else if (qLower.includes('color') || qLower.includes('amarillo') || qLower.includes('rojo')) {
      localAnswer += `En Vietnam, el rojo simboliza la buena fortuna, la sangre vital y la alegría popular, mientras que el amarillo representa la tierra sagrada, la nobleza imperial y la prosperidad espiritual de Buda.`;
    } else if (qLower.includes('plato') || qLower.includes('comer') || qLower.includes('comida')) {
      localAnswer += `Te recomiendo probar ${activeTour.streetFoodReward?.dishNameVi || 'un buen Phở o Bún Chả'} en los puestos con taburetes bajos de las calles adyacentes. ¡El caldo fresco con hierbas aromáticas es insuperable!`;
    } else {
      localAnswer += `Aquí en ${activeTour.placeName}, los detalles que estás observando buscan la armonía entre el cielo, la tierra y el respeto a los antepasados. Tómate un minuto para contemplar el tallado de madera y respirar el aroma a incienso.`;
    }

    const offlineGuideMsg: TourChatMessage = {
      id: `guide-offline-${Date.now()}`,
      role: 'assistant',
      text: localAnswer,
      timestamp: Date.now(),
    };
    setChatMessages((prev) => [...prev, offlineGuideMsg]);
    setIsSendingChat(false);
  };

  return (
    <div className="space-y-6" id="free-tour-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          id="free-tour-toast"
          className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-stone-700 text-sm flex items-center gap-2.5 animate-fade-in"
        >
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner & Mode Switcher */}
      <div
        id="free-tour-hero-banner"
        className="bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950 text-stone-100 rounded-2xl p-5 sm:p-6 shadow-md border border-stone-700/60 relative overflow-hidden"
      >
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full text-xs font-medium border border-amber-500/30 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Modo Free Tour con Gemini</span>
              <span className="text-stone-400">•</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Guía Local Inteligente (Online & Offline)
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Audioguía & Free Tour en Directo
            </h1>
            <p className="text-stone-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Ponte frente a cualquier templo, pagoda, lago o calle de Vietnam. Tu audioguía narrará
              en español las leyendas, qué buscar con los ojos, ángulos fotográficos y responderá tus preguntas en vivo.
            </p>
          </div>

          {/* Offline Saved Tours Toggle Button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              id="btn-saved-tours-toggle"
              onClick={() => setShowSavedList(!showSavedList)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-semibold transition-all"
            >
              <Bookmark className="w-4 h-4 text-amber-400" />
              <span>Tours Guardados ({savedTours.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Featured Famous Monuments Quick Switcher */}
      <div id="quick-tours-carousel" className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <span className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-amber-600" />
            <span>Tours destacados de Vietnam (Acceso Instantáneo 0s)</span>
          </span>
          <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
            ✓ Listos Offline
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
          {CURATED_CLIENT_TOURS.map((tour) => {
            const isCurrent = activeTour?.placeName === tour.placeName;
            return (
              <button
                key={tour.placeName}
                id={`pill-tour-${tour.cityName.replace(/\s+/g, '-').toLowerCase()}`}
                onClick={() => {
                  stopAudio();
                  setActiveTour(tour);
                  setActiveStopIndex(0);
                  setPlaceQuery(tour.placeName);
                  setSelectedCity(tour.cityName);
                  showToast(`Cargado tour: ${tour.placeName}`);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all flex items-center gap-2 border ${
                  isCurrent
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-stone-50 hover:bg-amber-50 text-stone-800 hover:text-amber-900 border-stone-200 hover:border-amber-300'
                }`}
              >
                <span>📍 {tour.placeName.split('(')[0].trim()}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${isCurrent ? 'bg-amber-700 text-amber-100' : 'bg-stone-200 text-stone-600'}`}>
                  {tour.cityName}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Saved Tours List View Modal/Drawer */}
      {showSavedList && (
        <div id="saved-tours-section" className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm space-y-4 animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200">
            <div className="flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
                Tours Descargados para Uso Offline
              </h3>
            </div>
            <button
              onClick={() => setShowSavedList(false)}
              className="text-xs text-stone-500 hover:text-stone-800 font-semibold"
            >
              Cerrar ✕
            </button>
          </div>

          {savedTours.length === 0 ? (
            <div className="text-center py-6 text-stone-500 text-xs">
              No tienes tours guardados todavía. Cuando visualices un tour, pulsa "Guardar para Viaje" para tenerlo disponible 100% sin internet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {savedTours.map((t) => (
                <div
                  key={t.placeName}
                  className="bg-stone-50 hover:bg-stone-100 rounded-xl p-3 border border-stone-200 transition-all flex flex-col justify-between gap-2 text-left"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 text-[11px] text-amber-700 font-semibold mb-1">
                      <span>{t.cityName}</span>
                      <span>⏱️ {t.durationMinutes} min</span>
                    </div>
                    <h4 className="text-xs font-bold text-stone-900 line-clamp-1">{t.placeName}</h4>
                    <p className="text-[11px] text-stone-600 line-clamp-2 mt-0.5">{t.tagline}</p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-stone-200">
                    <button
                      onClick={() => {
                        stopAudio();
                        setActiveTour(t);
                        setShowSavedList(false);
                        showToast(`Cargado tour offline: ${t.placeName}`);
                      }}
                      className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1"
                    >
                      <span>Abrir tour</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        const updated = deleteSavedFreeTour(t.placeName);
                        setSavedTours(updated);
                        showToast('Tour eliminado.');
                      }}
                      className="text-stone-400 hover:text-red-500 p-1"
                      title="Eliminar tour"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search & Custom Place Selection Section */}
      <div id="tour-search-box" className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-2">
            <MapPin className="w-4 h-4 text-amber-600" />
            <span>¿En qué monumento o lugar estás ahora?</span>
          </label>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              id="btn-detect-gps"
              onClick={handleDetectGps}
              disabled={isLocatingGps}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
            >
              <Navigation className={`w-3.5 h-3.5 ${isLocatingGps ? 'animate-spin' : 'text-amber-600'}`} />
              <span>{isLocatingGps ? 'Buscando satélites...' : '📍 Detectar mi lugar exacto'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowGpsHelper(!showGpsHelper)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                showGpsHelper
                  ? 'bg-amber-600 text-white border-amber-600 font-bold'
                  : 'bg-stone-100 hover:bg-amber-50 text-stone-700 hover:text-amber-900 border-stone-300'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-amber-600" />
              <span>Simular Posición</span>
            </button>
          </div>
        </div>

        {/* GPS Diagnostic & Simulation Assistant Card */}
        {showGpsHelper && (
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 text-xs text-amber-950 space-y-3 animate-fade-in shadow-xs">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-amber-700 shrink-0" />
                <span className="font-bold text-amber-900 text-sm">
                  {gpsError ? 'Diagnóstico de Señal GPS' : '🧭 Simulación de Posición en Vietnam'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowGpsHelper(false)}
                className="text-stone-500 hover:text-stone-800 text-xs font-bold p-1 cursor-pointer"
              >
                ✕ Cerrar
              </button>
            </div>

            {gpsError ? (
              <div className="space-y-2">
                <p className="text-amber-900 leading-relaxed font-medium">
                  {gpsError.message}
                </p>
                <p className="text-amber-800/80 leading-relaxed text-[11px]">
                  {gpsError.userTip}
                </p>
                {gpsError.isIframeBlocked && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => window.open(window.location.href, '_blank')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Abrir app en ventana completa (Habilitar GPS nativo)</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-amber-900 leading-relaxed">
                Selecciona cualquier monumento para situarte virtualmente en él y escuchar su audioguía:
              </p>
            )}

            <div>
              <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block mb-2">
                O sitúate con 1 clic en un monumento emblemático de Vietnam:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {VIETNAM_SIMULATION_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSimulatePosition(preset.id)}
                    className="p-2.5 rounded-xl bg-white hover:bg-amber-100/70 border border-amber-200 text-left transition cursor-pointer flex flex-col gap-0.5 shadow-2xs group"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-stone-900 group-hover:text-amber-800 text-xs">
                      <span>{preset.icon}</span>
                      <span className="truncate">{preset.cityName}</span>
                    </div>
                    <span className="text-[11px] text-stone-600 truncate">
                      {preset.poiName}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {gpsNotice && !showGpsHelper && (
          <div className="bg-amber-50 text-amber-900 px-3.5 py-2 rounded-xl text-xs border border-amber-200 flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{gpsNotice}</span>
          </div>
        )}

        {/* Input bar */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="input-tour-place"
              type="text"
              value={placeQuery}
              onChange={(e) => setPlaceQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && placeQuery.trim()) {
                  handleGenerateTour();
                }
              }}
              placeholder="Escribe el nombre del templo, calle, pagoda o monumento (ej. Templo de la Literatura)..."
              className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white text-stone-900 transition-all placeholder:text-stone-400"
            />
          </div>

          <select
            id="select-tour-city"
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            aria-label="Seleccionar ciudad de Vietnam"
            className="px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm font-medium text-stone-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500 shrink-0"
          >
            {POPULAR_CITIES.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
            <option value="Vietnam">Otra ciudad de Vietnam</option>
          </select>

          <button
            id="btn-start-tour"
            onClick={() => handleGenerateTour()}
            disabled={isLoadingTour || !placeQuery.trim()}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl text-sm font-semibold shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {isLoadingTour ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Generando Tour...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-200" />
                <span>Empezar Free Tour</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Monument Suggestions by selected City */}
        <div className="pt-1">
          <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-2">
            Lugares populares en {selectedCity}:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {POPULAR_CITIES.find((c) => c.name === selectedCity)?.samplePois.map((poiName) => (
              <button
                key={poiName}
                onClick={() => {
                  setPlaceQuery(poiName);
                  handleGenerateTour(poiName);
                }}
                className="px-2.5 py-1 bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-900 rounded-lg text-xs font-medium border border-stone-200/80 transition-all flex items-center gap-1"
              >
                <span>{poiName}</span>
                <ChevronRight className="w-3 h-3 opacity-50" />
              </button>
            ))}
          </div>
        </div>

        {/* Tour Vibe Selector */}
        <div className="pt-3 border-t border-stone-100">
          <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-2">
            Elige el enfoque de tu guía:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {VIBE_OPTIONS.map((v) => {
              const isSelected = selectedVibe === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  id={`btn-vibe-${v.id}`}
                  onClick={() => setSelectedVibe(v.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-amber-50 border-amber-500 shadow-xs ring-1 ring-amber-500'
                      : 'bg-stone-50 hover:bg-stone-100 border-stone-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-base">{v.icon}</span>
                    <span className={`text-xs font-bold ${isSelected ? 'text-amber-900' : 'text-stone-800'}`}>
                      {v.label}
                    </span>
                  </div>
                  <p className="text-[10px] text-stone-500 line-clamp-2 leading-tight">{v.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {tourError && (
          <div className="bg-red-50 text-red-800 p-3 rounded-xl border border-red-200 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{tourError}</span>
          </div>
        )}
      </div>

      {/* Loading state indicator */}
      {isLoadingTour && (
        <div id="tour-loading-card" className="bg-white rounded-2xl p-8 border border-stone-200 shadow-sm text-center space-y-4 animate-pulse">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
            <Compass className="w-6 h-6 animate-spin" />
          </div>
          <div>
            <h3 className="text-base font-bold text-stone-900">
              Conectando con tu guía local en {selectedCity}...
            </h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto mt-1">
              Recopilando las leyendas, el simbolismo de los altares, los mejores ángulos fotográficos y preparando el guion de audioguía para {placeQuery}.
            </p>
          </div>
        </div>
      )}

      {/* ACTIVE TOUR VIEW */}
      {activeTour && !isLoadingTour && (
        <div id="active-tour-view" className="space-y-6 animate-fade-in">
          {/* Tour Header Banner */}
          <div className="bg-stone-900 text-white rounded-2xl p-5 sm:p-6 border border-stone-800 shadow-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium mb-1.5">
                  <span className="bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-md border border-amber-500/30">
                    📍 {activeTour.cityName}
                  </span>
                  <span className="bg-stone-800 text-stone-300 px-2.5 py-0.5 rounded-md border border-stone-700">
                    ⏱️ ~{activeTour.durationMinutes} minutos de recorrido
                  </span>
                  <span className="bg-stone-800 text-stone-300 px-2.5 py-0.5 rounded-md border border-stone-700">
                    🚶‍♂️ {activeTour.stops.length} paradas guiadas
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-stone-100 tracking-tight">
                  {activeTour.placeName}
                </h2>

                {activeTour.vietnameseName && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-semibold text-amber-300">
                      🇻🇳 {activeTour.vietnameseName}
                    </span>
                    <button
                      onClick={() => speakVietnamese(activeTour.vietnameseName || '')}
                      title="Escuchar pronunciación nativa en vietnamita"
                      className="p-1 hover:bg-stone-800 rounded-md text-amber-400 hover:text-amber-300 transition-colors"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <p className="text-stone-300 text-xs sm:text-sm italic mt-2 max-w-2xl">
                  "{activeTour.tagline}"
                </p>
              </div>

              {/* Action buttons: Save & Share */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  id="btn-save-tour-toggle"
                  onClick={handleToggleSaveTour}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isCurrentTourSaved
                      ? 'bg-amber-500 text-stone-950 shadow-sm'
                      : 'bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700'
                  }`}
                >
                  {isCurrentTourSaved ? (
                    <>
                      <BookmarkCheck className="w-4 h-4 text-stone-950" />
                      <span>Guardado Offline</span>
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-4 h-4 text-amber-400" />
                      <span>Guardar para Viaje</span>
                    </>
                  )}
                </button>

                <button
                  id="btn-copy-tour-text"
                  onClick={() => {
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(
                        `Free Tour de ${activeTour.placeName} (${activeTour.cityName}):\n\n${activeTour.audioGuideScript}\n\nParadas:\n${activeTour.stops.map((s) => `${s.number}. ${s.title}: ${s.story}`).join('\n')}`
                      );
                      showToast('¡Guía completa copiada al portapapeles!');
                    }
                  }}
                  className="p-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl border border-stone-700 text-xs transition-all"
                  title="Copiar guía completa"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Audio Guide Player Toolbar */}
            <div className="mt-5 pt-4 border-t border-stone-800 bg-stone-950/60 -mx-5 -mb-5 sm:-mx-6 sm:-mb-6 p-4 sm:px-6 rounded-b-2xl flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  id="btn-toggle-audio-guide"
                  onClick={() => {
                    if (isPlayingAudio && !isPausedAudio) {
                      pauseAudio();
                    } else if (isPausedAudio) {
                      pauseAudio();
                    } else {
                      playAudio(activeTour.audioGuideScript, `Audioguía: ${activeTour.placeName}`);
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-md transition-all active:scale-95"
                >
                  {isPlayingAudio && !isPausedAudio ? (
                    <>
                      <Pause className="w-4 h-4 fill-current" />
                      <span>Pausar Audioguía</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>{isPausedAudio ? 'Reanudar' : 'Escuchar Audioguía'}</span>
                    </>
                  )}
                </button>

                {isPlayingAudio && (
                  <button
                    id="btn-stop-audio"
                    onClick={stopAudio}
                    className="p-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs transition-all"
                    title="Detener audio"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  id="btn-toggle-audio-speed"
                  onClick={toggleSpeed}
                  className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-amber-300 rounded-lg text-xs font-mono font-bold transition-all border border-stone-700"
                  title="Cambiar velocidad de reproducción"
                >
                  {playbackSpeed.toFixed(1)}x
                </button>
              </div>

              {/* Sound wave visualizer / playback indicator */}
              <div className="flex items-center gap-2 text-xs text-stone-400">
                {isPlayingAudio && !isPausedAudio ? (
                  <div className="flex items-center gap-1">
                    <span className="w-1 h-3 bg-amber-400 animate-pulse rounded-full" />
                    <span className="w-1 h-5 bg-amber-400 animate-pulse delay-75 rounded-full" />
                    <span className="w-1 h-2 bg-amber-400 animate-pulse delay-150 rounded-full" />
                    <span className="w-1 h-4 bg-amber-400 animate-pulse delay-100 rounded-full" />
                    <span className="text-amber-300 font-medium ml-1 truncate max-w-[200px]">
                      {speakingTextTitle || 'Reproduciendo...'}
                    </span>
                  </div>
                ) : (
                  <span className="text-stone-400 flex items-center gap-1.5">
                    <Headphones className="w-3.5 h-3.5 text-stone-500" />
                    <span>Ideal con auriculares mientras caminas</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Introductory Narrative Script Card with Synchronized Reading */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
                  Narrativa del Guía Local
                </h3>
              </div>
              <button
                onClick={() => playAudio(activeTour.audioGuideScript, 'Narrativa del Guía')}
                className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Leer en voz alta</span>
              </button>
            </div>

            {/* If currently speaking this script, highlight active sentence */}
            {isPlayingAudio && speakingTextTitle.includes('Narrativa') && audioSentences.length > 0 ? (
              <div className="text-stone-700 text-sm leading-relaxed font-serif space-y-2">
                {audioSentences.map((sent, sIdx) => (
                  <span
                    key={sIdx}
                    className={`transition-all rounded-sm px-0.5 inline ${
                      sIdx === currentSentenceIndex
                        ? 'bg-amber-200 text-stone-950 font-medium'
                        : 'text-stone-700'
                    }`}
                  >
                    {sent}{' '}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-stone-700 text-sm leading-relaxed whitespace-pre-line font-serif">
                {activeTour.audioGuideScript}
              </p>
            )}
          </div>

          {/* PARADAS DEL TOUR (Interactive Stops) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
                  Paradas del Recorrido ({activeTour.stops.length})
                </h3>
              </div>
              <span className="text-xs text-stone-500">Sigue este orden dentro del recinto</span>
            </div>

            <div className="space-y-3">
              {activeTour.stops.map((stop, idx) => {
                const isSelected = activeStopIndex === idx;
                return (
                  <div
                    key={stop.number}
                    id={`stop-card-${stop.number}`}
                    onClick={() => setActiveStopIndex(idx)}
                    className={`rounded-2xl p-5 border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-50/40 border-amber-300 shadow-xs'
                        : 'bg-white hover:bg-stone-50 border-stone-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="w-7 h-7 rounded-xl bg-amber-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                          {stop.number}
                        </span>
                        <div>
                          <h4 className="text-base font-bold text-stone-900 leading-snug">
                            {stop.title}
                          </h4>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          playAudio(
                            `${stop.title}. Qué mirar: ${stop.whatToLookAt}. Historia: ${stop.story}. Consejo de guía: ${stop.insiderTip}`,
                            `Parada ${stop.number}: ${stop.title}`
                          );
                        }}
                        className="p-1.5 bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-900 rounded-lg text-xs transition-colors shrink-0"
                        title="Escuchar esta parada"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      {/* What to look at */}
                      <div className="bg-white/80 rounded-xl p-3 border border-stone-200/80">
                        <div className="font-bold text-amber-800 flex items-center gap-1.5 mb-1">
                          <Eye className="w-3.5 h-3.5 text-amber-600" />
                          <span>Qué buscar con los ojos</span>
                        </div>
                        <p className="text-stone-700 leading-relaxed">{stop.whatToLookAt}</p>
                      </div>

                      {/* Story */}
                      <div className="bg-white/80 rounded-xl p-3 border border-stone-200/80 md:col-span-2">
                        <div className="font-bold text-stone-800 flex items-center gap-1.5 mb-1">
                          <Sparkle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Historia o Secreto</span>
                        </div>
                        <p className="text-stone-700 leading-relaxed">{stop.story}</p>
                      </div>
                    </div>

                    {/* Insider tip */}
                    {stop.insiderTip && (
                      <div className="mt-2.5 bg-amber-100/50 rounded-xl p-2.5 text-xs text-amber-950 border border-amber-200/60 flex items-start gap-2">
                        <span className="text-amber-700 font-bold shrink-0">💡 Consejo de guía:</span>
                        <span>{stop.insiderTip}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* PHOTO SPOT & CULTURAL ETIQUETTE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Photo spot */}
            <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
                  <Camera className="w-4 h-4 text-sky-600" />
                  <span>El Rincón Fotográfico Secreto</span>
                </div>
                <span className="text-[11px] font-semibold bg-sky-50 text-sky-700 px-2 py-0.5 rounded-md border border-sky-200">
                  {activeTour.photoSpot?.bestLight || 'Hora dorada'}
                </span>
              </div>
              <div className="text-xs text-stone-700 space-y-1.5 pt-1">
                <div>
                  <strong className="text-stone-900">Dónde pararse: </strong>
                  <span>{activeTour.photoSpot?.location || 'Frente a la puerta principal.'}</span>
                </div>
                <div>
                  <strong className="text-stone-900">Encuadre perfecto: </strong>
                  <span>{activeTour.photoSpot?.instruction || 'Enfoca los aleros con luz diagonal.'}</span>
                </div>
              </div>
            </div>

            {/* Cultural etiquette */}
            <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Etiqueta Cultural & Qué NO Hacer</span>
              </div>
              <div className="text-xs text-stone-700 space-y-1.5 pt-1">
                <div>
                  <strong className="text-stone-900">Vestimenta: </strong>
                  <span>{activeTour.culturalEtiquette?.dressCode || 'Hombros y rodillas cubiertos.'}</span>
                </div>
                <div>
                  <strong className="text-stone-900">Evitar: </strong>
                  <span>{activeTour.culturalEtiquette?.whatNotToDo || 'No tocar altares sagrados ni hablar en tono alto.'}</span>
                </div>
                {activeTour.culturalEtiquette?.scamWarning && (
                  <div className="text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-1">
                    <strong>Picaresca local: </strong>
                    <span>{activeTour.culturalEtiquette.scamWarning}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* STREET FOOD REWARD */}
          {activeTour.streetFoodReward && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-5 border border-amber-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                  <Utensils className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                    La Recompensa del Guía al Salir
                  </div>
                  <h4 className="text-sm font-bold text-stone-900">
                    {activeTour.streetFoodReward.dishNameVi} ({activeTour.streetFoodReward.dishNameEs})
                  </h4>
                  <p className="text-xs text-stone-600 mt-0.5">
                    {activeTour.streetFoodReward.whereToFind}
                  </p>
                </div>
              </div>
              <div className="bg-white px-3.5 py-1.5 rounded-xl border border-amber-200 text-xs font-bold text-amber-900 self-stretch sm:self-auto text-center shrink-0">
                Precio justo: {activeTour.streetFoodReward.priceEstimate}
              </div>
            </div>
          )}

          {/* INTERACTIVE GUIDE CHAT (Pregúntale a tu guía Nguyễn) */}
          <div id="guide-chat-card" className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-xs">
                  N
                </div>
                <div>
                  <h4 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                    <span>Pregunta a tu Guía Nguyễn en Directo</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    ¿Ves una estatua, un altar o un símbolo raro? Escríbelo o elige una pregunta rápida.
                  </p>
                </div>
              </div>
              <MessageSquare className="w-4 h-4 text-amber-600" />
            </div>

            {/* Suggested quick questions */}
            {activeTour.suggestedQuestions && activeTour.suggestedQuestions.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-2">
                  Preguntas curiosas para hacerle:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {activeTour.suggestedQuestions.map((q) => (
                    <button
                      key={q}
                      onClick={() => handleSendChatMessage(q)}
                      disabled={isSendingChat}
                      className="px-2.5 py-1 bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-900 rounded-lg text-xs font-medium border border-stone-200 transition-all text-left"
                    >
                      💬 {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Conversation messages scroll area */}
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {chatMessages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <div className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                        N
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                        isUser
                          ? 'bg-amber-600 text-white rounded-tr-xs'
                          : 'bg-stone-100 text-stone-800 rounded-tl-xs border border-stone-200'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })}
              {isSendingChat && (
                <div className="flex items-center gap-2 text-xs text-stone-400">
                  <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-600 flex items-center justify-center text-[10px] animate-pulse">
                    N
                  </div>
                  <span className="italic">Nguyễn está respondiendo...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input Field */}
            <div className="flex gap-2 pt-2 border-t border-stone-100">
              <input
                id="input-tour-chat"
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSendChatMessage();
                  }
                }}
                placeholder="Escribe una pregunta para tu guía (ej. ¿Qué significa la tortuga?)..."
                className="flex-1 px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white text-stone-900 placeholder:text-stone-400"
              />
              <button
                id="btn-send-tour-chat"
                onClick={() => handleSendChatMessage()}
                disabled={!chatInput.trim() || isSendingChat}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Preguntar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
