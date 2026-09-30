import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Compass,
  Headphones,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
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
  Loader2,
} from 'lucide-react';
import { FreeTourData, FreeTourStop, PointOfInterest, TourChatMessage } from '../types';
import { POINTS_OF_INTEREST } from '../data/pois';
import { CURATED_CLIENT_TOURS, findClientCuratedTour } from '../data/curatedTours';
import {
  VibeType,
  VIBE_CONFIGS,
  adaptTourForVibe,
} from '../utils/tourVibeAdapter';
import {
  getSavedFreeTours,
  saveFreeTour,
  deleteSavedFreeTour,
} from '../utils/storage';
import {
  playNaturalSpeech,
  stopAllSpeech,
  pauseSpeech,
  resumeSpeech,
  setSpeechPlaybackRate,
  seekSpeech,
  subscribeSpeechState,
  speakVietnameseNatural,
  preprocessTextForNaturalSpeech,
  GlobalSpeakingState,
} from '../utils/speechSynthesis';
import { AudioWaveIndicator } from './AudioWaveIndicator';
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

const VIBE_OPTIONS = Object.values(VIBE_CONFIGS);

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
  // Input state (starts in blank by default)
  const [placeQuery, setPlaceQuery] = useState<string>(initialPoi?.nameEs || '');
  const [selectedCity, setSelectedCity] = useState<string>(initialPoi?.city || 'Hà Nội');
  const [selectedVibe, setSelectedVibe] = useState<VibeType>('curiosidades');
  const [isLocatingGps, setIsLocatingGps] = useState<boolean>(false);
  const [gpsNotice, setGpsNotice] = useState<string | null>(null);
  const [showGpsHelper, setShowGpsHelper] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<SmartGeoError | null>(null);
  const [gpsDetails, setGpsDetails] = useState<SmartGeoResult | null>(null);

  // Active tour state - start empty so user chooses or searches
  const [activeTour, setActiveTour] = useState<FreeTourData | null>(() => {
    if (initialPoi) {
      const match = findClientCuratedTour(initialPoi.nameEs, initialPoi.city);
      if (match) return adaptTourForVibe(match, 'curiosidades');
    }
    return null;
  });
  const [isLoadingTour, setIsLoadingTour] = useState<boolean>(false);
  const [tourError, setTourError] = useState<string | null>(null);
  const [activeStopIndex, setActiveStopIndex] = useState<number>(0);

  // Saved tours
  const [savedTours, setSavedTours] = useState<FreeTourData[]>(getSavedFreeTours);
  const [showSavedList, setShowSavedList] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Audio Guide Speech Synthesis state via global reactive state
  const [speechState, setSpeechState] = useState<GlobalSpeakingState>({
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
  });
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [speakingTextTitle, setSpeakingTextTitle] = useState<string>('');
  const lastAudioClickTimeRef = useRef<number>(0);

  useEffect(() => {
    return subscribeSpeechState((st) => {
      setSpeechState(st);
    });
  }, []);

  // Format seconds mm:ss
  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

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
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // Handle switching tour vibe with instant active tour adaptation
  const handleSelectVibe = useCallback(
    (newVibe: VibeType) => {
      setSelectedVibe(newVibe);
      if (activeTour) {
        stopAllSpeech();
        setSpeakingTextTitle('');

        const baseMatch = findClientCuratedTour(activeTour.placeName, activeTour.cityName);
        const adapted = adaptTourForVibe(baseMatch || activeTour, newVibe);
        setActiveTour(adapted);
        setActiveStopIndex(0);
        showToast(`Enfoque ${VIBE_CONFIGS[newVibe].icon} ${VIBE_CONFIGS[newVibe].label} aplicado`);
      }
    },
    [activeTour, showToast]
  );

  // Stop any playing speech safely
  const stopAudio = useCallback(() => {
    const now = Date.now();
    if (now - lastAudioClickTimeRef.current < 150) return;
    lastAudioClickTimeRef.current = now;
    stopAllSpeech();
    setSpeakingTextTitle('');
  }, []);

  // Natural Voice Audioguide playback
  const playAudio = useCallback(
    (text: string, title: string, customId?: string) => {
      const now = Date.now();
      if (now - lastAudioClickTimeRef.current < 200) return;
      lastAudioClickTimeRef.current = now;

      const playId = customId || `tour-narrative-${activeTour?.placeName || 'audio'}`;

      // Toggle pause/resume if this exact item is active
      if (speechState.isSpeaking && speechState.speakingId === playId) {
        if (speechState.isPaused) {
          resumeSpeech();
        } else {
          pauseSpeech();
        }
        return;
      }

      setSpeakingTextTitle(title);
      playNaturalSpeech({
        text,
        lang: 'es-ES',
        speed: playbackSpeed,
        id: playId,
        onStart: () => {
          setSpeakingTextTitle(title);
        },
        onEnd: () => {
          setSpeakingTextTitle('');
        },
        onError: () => {
          setSpeakingTextTitle('');
        },
      });
    },
    [activeTour?.placeName, playbackSpeed, speechState.isPaused, speechState.isSpeaking, speechState.speakingId]
  );

  const toggleSpeed = () => {
    const nextSpeed = playbackSpeed === 1.0 ? 1.2 : playbackSpeed === 1.2 ? 1.5 : playbackSpeed === 1.5 ? 0.9 : 1.0;
    setPlaybackSpeed(nextSpeed);
    setSpeechPlaybackRate(nextSpeed);
    showToast(`Velocidad de narración: ${nextSpeed}x`);
  };

  // Pronounce Vietnamese term using high-definition natural engine
  const speakVietnamese = (text: string) => {
    speakVietnameseNatural(text, `tour-vi-${text.slice(0, 20)}`);
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

      // Fast check for test words or gibberish
      const INVALID_TEST_WORDS = ['test', 'prueba', 'asdf', '123', 'xxx', 'foo', 'bar', 'temp', 'hola', 'abc', 'qwerty', 'testing', 'monumento', 'nada', 'none'];
      if (targetPlace.length < 3 || INVALID_TEST_WORDS.includes(targetPlace.toLowerCase())) {
        setTourError(`No se encontró «${targetPlace}» como monumento o templo en Vietnam. Elige una de las sugerencias o escribe un lugar auténtico.`);
        setIsLoadingTour(false);
        return;
      }

      stopAudio();
      setIsLoadingTour(true);
      setTourError(null);

      // 1. Instant check against curated tours for immediate 0-latency experience
      const curatedMatch = findClientCuratedTour(targetPlace, targetCity);
      if (curatedMatch) {
        const adapted = adaptTourForVibe(curatedMatch, selectedVibe);
        setActiveTour(adapted);
        setActiveStopIndex(0);
        setPlaceQuery(curatedMatch.placeName);
        setSelectedCity(curatedMatch.cityName);
        setChatMessages([
          {
            id: `welcome-${Date.now()}`,
            role: 'assistant',
            text: `¡Xin chào! Soy Nguyễn, tu guía local aquí en ${curatedMatch.placeName}. Tienes la audioguía con enfoque "${VIBE_CONFIGS[selectedVibe].label}" lista. ¡Pregúntame cualquier cosa que veas a tu alrededor!`,
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

          const data = await response.json();

          if (response.ok && data && data.success && data.tour) {
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
            showToast(`¡Free Tour (${VIBE_CONFIGS[selectedVibe].label}) generado!`);
            return;
          } else if (data && data.error) {
            // Server explicitly rejected as invalid or unknown place
            setTourError(data.error);
            setIsLoadingTour(false);
            return;
          }
        } catch (err) {
          console.warn('Network tour fetch error:', err);
        }
      }

      // 3. Robust client-side fallback ONLY for legitimate named places if offline
      if (targetPlace.length >= 3 && !INVALID_TEST_WORDS.includes(targetPlace.toLowerCase())) {
        const fallbackTour = createClientFallbackTour(targetPlace, targetCity);
        const adaptedFallback = adaptTourForVibe(fallbackTour, selectedVibe);
        setActiveTour(adaptedFallback);
        setActiveStopIndex(0);
        setChatMessages([
          {
            id: `welcome-fb-${Date.now()}`,
            role: 'assistant',
            text: `¡Xin chào! Soy Nguyễn, tu guía local en ${fallbackTour.placeName}. He preparado esta audioguía para ti. ¡Pregúntame cualquier duda que tengas!`,
            timestamp: Date.now(),
          },
        ]);
        setIsLoadingTour(false);
        showToast(`¡Tour cargado para ${targetPlace}!`);
      } else {
        setTourError(`No encontramos «${targetPlace}» en Vietnam. Elige una de las sugerencias.`);
        setIsLoadingTour(false);
      }
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

  // Scroll chat messages container internally when new messages arrive (without moving window position)
  useEffect(() => {
    if (chatContainerRef.current && chatMessages.length > 1) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
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

      {/* Top Header & Tour Explorer Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-stone-200/90 shadow-[0_4px_24px_rgba(28,25,23,0.04)] space-y-4">
        {/* Row 1: Title & Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700 shrink-0">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-xl sm:text-2xl text-stone-900 leading-tight">
                Audioguía Free Tour
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Narración en español, arquitectura, secretos y paradas guiadas
              </p>
            </div>
          </div>

          {/* Right Action Buttons: GPS + Saved (vertically centered) */}
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
            <button
              type="button"
              id="btn-detect-gps"
              onClick={handleDetectGps}
              disabled={isLocatingGps}
              title="Detectar monumento más cercano mediante GPS"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 text-xs font-semibold transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Navigation className={`w-3.5 h-3.5 ${isLocatingGps ? 'animate-spin text-amber-600' : 'text-stone-500'}`} />
              <span>{isLocatingGps ? 'Buscando...' : 'Cerca de mí'}</span>
            </button>

            <button
              id="btn-saved-tours-toggle"
              onClick={() => setShowSavedList(!showSavedList)}
              title="Ver tours descargados para acceso sin conexión"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer ${
                showSavedList
                  ? 'bg-amber-500 text-stone-950 font-bold shadow-xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5 text-amber-500" />
              <span>Guardados ({savedTours.length})</span>
            </button>
          </div>
        </div>

        {/* Row 2: Vibe Selector Chips, Search Controls & Suggestions */}
        <div className="space-y-2.5">
          {/* Vibe Selector Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            <span className="text-[11px] font-semibold text-stone-400 mr-1 shrink-0">Enfoque:</span>
            {VIBE_OPTIONS.map((vibe) => {
              const isSelected = selectedVibe === vibe.id;
              return (
                <button
                  key={vibe.id}
                  type="button"
                  onClick={() => handleSelectVibe(vibe.id)}
                  title={vibe.desc}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer shrink-0 flex items-center gap-1.5 active:scale-95 ${
                    isSelected
                      ? 'bg-amber-500 text-stone-950 font-bold shadow-xs'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-600 border border-stone-200/50'
                  }`}
                >
                  <span>{vibe.icon}</span>
                  <span>{vibe.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search bar & City Selector */}
          <div className="pt-2 border-t border-stone-100 flex flex-col sm:flex-row gap-2">
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
                placeholder="Buscar templo o monumento"
                className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white text-stone-900 transition-all placeholder:text-stone-400"
              />
            </div>

            <select
              id="select-tour-city"
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              aria-label="Seleccionar ciudad de Vietnam"
              className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-medium text-stone-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500 shrink-0"
            >
              {POPULAR_CITIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
              <option value="Vietnam">Otra ciudad de Vietnam</option>
            </select>
          </div>

          {/* Quick suggestions for active city */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {POPULAR_CITIES.find((c) => c.name === selectedCity)?.samplePois.map((poiName) => (
              <button
                key={poiName}
                onClick={() => {
                  setPlaceQuery(poiName);
                  handleGenerateTour(poiName);
                }}
                className="px-2.5 py-1 bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-900 rounded-lg text-[11px] font-medium border border-stone-200/60 transition flex items-center gap-1 shrink-0 cursor-pointer active:scale-95"
              >
                <span>{poiName}</span>
              </button>
            ))}
          </div>

          {/* Cargar Tour button */}
          <div className="pt-1 flex justify-end">
            <button
              id="btn-start-tour"
              onClick={() => handleGenerateTour()}
              disabled={isLoadingTour || !placeQuery.trim()}
              className="w-full sm:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs sm:text-sm shadow-xs flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoadingTour ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-stone-950" />
                  <span>Generando tour...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-stone-950" />
                  <span>Cargar Tour</span>
                </>
              )}
            </button>
          </div>
        </div>

        {gpsNotice && !showGpsHelper && (
          <div className="bg-amber-50 text-amber-900 px-3.5 py-2 rounded-xl text-xs border border-amber-200 flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{gpsNotice}</span>
          </div>
        )}

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
        <div id="active-tour-view" className="space-y-4 animate-fade-in">
          {/* Unified Tour Card & Audioguide Player */}
          <div className="bg-white rounded-3xl p-4 sm:p-6 border border-stone-200/90 shadow-[0_4px_24px_rgba(28,25,23,0.04)] space-y-3.5">
            {/* Top row: Badges + Action Buttons */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                <span className="font-semibold text-stone-700 bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-200/60">
                  📍 {activeTour.cityName}
                </span>
                <span className={`px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1 ${VIBE_CONFIGS[selectedVibe].badgeColor}`}>
                  <span>{VIBE_CONFIGS[selectedVibe].icon}</span>
                  <span>{VIBE_CONFIGS[selectedVibe].shortLabel}</span>
                </span>
                <span className="text-stone-500 font-medium hidden sm:inline text-xs">
                  • ~{activeTour.durationMinutes} min • {activeTour.stops.length} paradas
                </span>
              </div>

              {/* Action Buttons: Save & Share */}
              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  id="btn-save-tour-toggle"
                  onClick={handleToggleSaveTour}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer ${
                    isCurrentTourSaved
                      ? 'bg-amber-500 text-stone-950 font-bold shadow-xs'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200/70'
                  }`}
                  title={isCurrentTourSaved ? 'Tour guardado sin conexión' : 'Guardar tour'}
                >
                  {isCurrentTourSaved ? (
                    <>
                      <BookmarkCheck className="w-3.5 h-3.5 text-stone-950" />
                      <span>Guardado</span>
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-3.5 h-3.5 text-amber-500" />
                      <span>Guardar</span>
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
                      showToast('¡Guía copiada al portapapeles!');
                    }
                  }}
                  className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-600 hover:text-stone-900 rounded-xl border border-stone-200/70 text-xs transition cursor-pointer active:scale-95"
                  title="Copiar guía completa"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Place Title & Subtitle */}
            <div>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 tracking-tight">
                {activeTour.placeName}
              </h2>
              {activeTour.vietnameseName && activeTour.vietnameseName.trim().toLowerCase() !== activeTour.placeName.trim().toLowerCase() && (
                <div className="flex items-center gap-1.5 text-xs text-stone-500 mt-0.5">
                  <span className="font-semibold text-stone-700">🇻🇳 {activeTour.vietnameseName}</span>
                  <button
                    onClick={() => speakVietnamese(activeTour.vietnameseName || '')}
                    title="Escuchar pronunciación nativa"
                    className="p-0.5 text-amber-600 hover:text-amber-700 transition"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <p className="text-stone-600 text-xs sm:text-sm italic mt-1">
                {activeTour.tagline.replace(/^["']|["']$/g, '')}
              </p>
            </div>

            {/* Integrated Audioguide Player Toolbar */}
            <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2 flex-wrap bg-stone-50/90 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 rounded-xl">
              <div className="flex items-center gap-2">
                <button
                  id="btn-toggle-audio-guide"
                  onClick={() => {
                    const mainId = `tour-main-${activeTour.placeName}`;
                    if (speechState.isSpeaking && speechState.speakingId === mainId) {
                      if (speechState.isPaused) {
                        resumeSpeech();
                      } else {
                        pauseSpeech();
                      }
                    } else {
                      playAudio(activeTour.audioGuideScript, `Audioguía: ${activeTour.placeName}`, mainId);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer ${
                    speechState.isLoading && speechState.speakingId === `tour-main-${activeTour.placeName}`
                      ? 'bg-amber-300 text-stone-950 border border-amber-400'
                      : speechState.isSpeaking && speechState.speakingId === `tour-main-${activeTour.placeName}` && !speechState.isPaused
                      ? 'bg-amber-400 text-stone-950 border border-amber-500/40 ring-2 ring-amber-400/20'
                      : speechState.isSpeaking && speechState.speakingId === `tour-main-${activeTour.placeName}` && speechState.isPaused
                      ? 'bg-amber-300 text-stone-900 border border-amber-400'
                      : 'bg-amber-500 hover:bg-amber-400 text-stone-950'
                  }`}
                >
                  {speechState.isLoading && speechState.speakingId === `tour-main-${activeTour.placeName}` ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-stone-900" />
                      <span>Cargando audio...</span>
                    </>
                  ) : speechState.isSpeaking && speechState.speakingId === `tour-main-${activeTour.placeName}` && !speechState.isPaused ? (
                    <>
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>Pausar</span>
                    </>
                  ) : speechState.isSpeaking && speechState.speakingId === `tour-main-${activeTour.placeName}` && speechState.isPaused ? (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Reanudar</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Escuchar Guía</span>
                    </>
                  )}
                </button>

                {speechState.isSpeaking && speechState.speakingId === `tour-main-${activeTour.placeName}` && (
                  <button
                    id="btn-stop-audio"
                    onClick={stopAudio}
                    className="flex items-center gap-1 px-3 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95"
                    title="Detener audioguía"
                  >
                    <Square className="w-3 h-3 fill-current text-stone-700" />
                    <span>Parar</span>
                  </button>
                )}

                <button
                  id="btn-toggle-audio-speed"
                  onClick={toggleSpeed}
                  className="px-2.5 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg text-xs font-mono font-bold transition border border-stone-300/60 cursor-pointer"
                  title="Cambiar velocidad de narración"
                >
                  {playbackSpeed.toFixed(1)}x
                </button>
              </div>

              {/* Minimal sound wave visualizer when speaking */}
              {speechState.isSpeaking && (
                <div className="flex items-center gap-1.5 text-xs ml-auto">
                  <AudioWaveIndicator isPlaying={!speechState.isPaused} size="sm" colorClass="text-amber-600" />
                </div>
              )}
            </div>

            {/* Narrative text */}
            <div className="pt-1 text-stone-700 text-xs sm:text-sm leading-relaxed font-serif">
              <p className="whitespace-pre-line">{activeTour.audioGuideScript}</p>
            </div>
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
                const stopPlayId = `tour-stop-${stop.number}-${activeTour.placeName}`;
                const isThisStopLoading = speechState.isLoading && speechState.speakingId === stopPlayId;
                const isThisStopPlaying = speechState.isSpeaking && speechState.speakingId === stopPlayId && !speechState.isPaused;
                const isThisStopPaused = speechState.isSpeaking && speechState.speakingId === stopPlayId && speechState.isPaused;

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

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isThisStopPlaying) {
                              pauseSpeech();
                            } else if (isThisStopPaused) {
                              resumeSpeech();
                            } else {
                              playAudio(
                                `Parada ${stop.number}: ${stop.title}. Qué mirar con los ojos: ${stop.whatToLookAt}. Historia y secretos: ${stop.story}. Consejo del guía: ${stop.insiderTip || ''}`,
                                `Parada ${stop.number}: ${stop.title}`,
                                stopPlayId
                              );
                            }
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                            isThisStopLoading
                              ? 'bg-amber-300 text-stone-950 border border-amber-400'
                              : isThisStopPlaying
                              ? 'bg-amber-400 text-stone-950 shadow-xs border border-amber-500/40 ring-2 ring-amber-400/20'
                              : isThisStopPaused
                              ? 'bg-amber-300 text-stone-900 border border-amber-400'
                              : 'bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-stone-950 border border-stone-200/80'
                          }`}
                          title={isThisStopPlaying ? 'Pausar narración' : isThisStopPaused ? 'Reanudar narración' : 'Escuchar narración de esta parada'}
                        >
                          {isThisStopLoading ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-stone-900" />
                              <span className="text-[11px]">Cargando...</span>
                            </>
                          ) : isThisStopPlaying ? (
                            <>
                              <Pause className="w-3.5 h-3.5 fill-current" />
                              <span className="text-[11px]">Pausar</span>
                            </>
                          ) : isThisStopPaused ? (
                            <>
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span className="text-[11px]">Reanudar</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span className="text-[11px]">Escuchar</span>
                            </>
                          )}
                        </button>

                        {(isThisStopPlaying || isThisStopPaused) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              stopAudio();
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95"
                            title="Parar audio de la parada"
                          >
                            <Square className="w-3 h-3 fill-current text-stone-700" />
                            <span className="text-[11px]">Parar</span>
                          </button>
                        )}
                      </div>
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
            <div ref={chatContainerRef} className="space-y-3 max-h-72 overflow-y-auto pr-1">
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
