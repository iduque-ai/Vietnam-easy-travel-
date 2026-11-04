import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Compass,
  Headphones,
  Volume2,
  Play,
  Pause,
  Square,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
  Sparkles,
  MapPin,
  Camera,
  AlertTriangle,
  Utensils,
  MessageSquare,
  Send,
  Bookmark,
  BookmarkCheck,
  Share2,
  Search,
  Navigation,
  Sparkle,
  Eye,
  Info,
  Layers,
  RefreshCw,
  Loader2,
  Map as MapIcon,
  ListMusic,
  Repeat,
} from 'lucide-react';
import { FreeTourData, PointOfInterest, TourChatMessage } from '../types';
import { CURATED_CLIENT_TOURS, findClientCuratedTour } from '../data/curatedTours';
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
  GlobalSpeakingState,
} from '../utils/speechSynthesis';
import { AudioWaveIndicator } from './AudioWaveIndicator';
import { InteractiveOpenStreetMap } from './InteractiveOpenStreetMap';
import {
  getSmartGeolocation,
  createSimulatedResult,
  SmartGeoResult,
  SmartGeoError,
} from '../utils/geolocation';

interface FreeTourGuideProps {
  initialPoi?: PointOfInterest | null;
  onClearInitialPoi?: () => void;
  isOnline: boolean;
}

interface TourAudioTrack {
  index: number; // 0 = Intro, 1..N = Stop 1..N
  id: string;
  label: string;
  shortLabel: string;
  text: string;
  stopIndex: number | null; // null for Intro, 0..N-1 for stops
}

const POPULAR_CITIES = [
  {
    name: 'Hà Nội',
    center: { lat: 21.0285, lng: 105.8542 },
    samplePois: [
      'Templo de la Literatura (Văn Miếu - Quốc Tử Giám)',
      'Lago Hoàn Kiếm y Templo Ngọc Sơn',
      'Calle del Tren (Train Street)',
      'Catedral de San José',
      'Mausoleo de Hồ Chí Minh',
    ],
  },
  {
    name: 'Huế',
    center: { lat: 16.4637, lng: 107.5909 },
    samplePois: [
      'Ciudadela Imperial de Huế (Đại Nội)',
      'Pagoda Thiên Mụ',
      'Tumba Imperial de Khải Định',
    ],
  },
  {
    name: 'Hội An',
    center: { lat: 15.8801, lng: 108.3380 },
    samplePois: [
      'Puente Japonés Cubierto (Chùa Cầu)',
      'Casa Antigua Tan Ky',
      'Mercado de Farolillos',
    ],
  },
  {
    name: 'Đà Nẵng',
    center: { lat: 16.0544, lng: 108.2022 },
    samplePois: [
      'Puente del Dragón (Cầu Rồng)',
      'Montañas de Mármol (Ngũ Hành Sơn)',
      'Pagoda Linh Ứng (Son Tra)',
    ],
  },
  {
    name: 'Ninh Bình',
    center: { lat: 20.2506, lng: 105.9745 },
    samplePois: [
      'Complejo Paisajístico de Tràng An',
      'Cueva y Mirador de Hang Múa',
      'Tam Cốc - Bích Động',
    ],
  },
  {
    name: 'TP. Hồ Chí Minh',
    center: { lat: 10.7769, lng: 106.7009 },
    samplePois: [
      'Túneles de Củ Chi',
      'Mercado Bến Thành',
      'Basílica de Notre-Dame y Correos',
    ],
  },
  {
    name: 'Quảng Ninh / Hạ Long',
    center: { lat: 20.9101, lng: 107.1839 },
    samplePois: [
      'Bahía de Hạ Long (Vịnh Hạ Long)',
    ],
  },
];

export const FreeTourGuide: React.FC<FreeTourGuideProps> = ({
  initialPoi,
  onClearInitialPoi,
  isOnline,
}) => {
  // Input state
  const [placeQuery, setPlaceQuery] = useState<string>(initialPoi?.nameEs || '');
  const [selectedCity, setSelectedCity] = useState<string>(initialPoi?.city || 'Hà Nội');
  const [isLocatingGps, setIsLocatingGps] = useState<boolean>(false);
  const [gpsNotice, setGpsNotice] = useState<string | null>(null);
  const [showGpsHelper, setShowGpsHelper] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<SmartGeoError | null>(null);
  const [gpsDetails, setGpsDetails] = useState<SmartGeoResult | null>(null);

  // Active tour state — preserves the monument's authentic script without overwriting
  const [activeTour, setActiveTour] = useState<FreeTourData | null>(() => {
    if (initialPoi) {
      const match = findClientCuratedTour(initialPoi.nameEs, initialPoi.city);
      if (match) return JSON.parse(JSON.stringify(match));
    }
    return null;
  });
  const [isLoadingTour, setIsLoadingTour] = useState<boolean>(false);
  const [tourError, setTourError] = useState<string | null>(null);
  const [activeStopIndex, setActiveStopIndex] = useState<number>(0);
  const [activeTrackIndex, setActiveTrackIndex] = useState<number>(0); // 0 = Intro, 1..N = Stops
  const [autoAdvance, setAutoAdvance] = useState<boolean>(true);
  const [showRouteMap, setShowRouteMap] = useState<boolean>(true);

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
  const lastAudioClickTimeRef = useRef<number>(0);
  const autoAdvanceRef = useRef<boolean>(autoAdvance);
  useEffect(() => {
    autoAdvanceRef.current = autoAdvance;
  }, [autoAdvance]);

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
      text: `¡Xin chào! Soy Nguyễn, tu guía local. Elige un monumento para comenzar la audioguía y pregúntame cualquier duda en directo; también puedes escuchar mis respuestas en voz alta.`,
      timestamp: Date.now(),
    },
  ]);
  const [chatInput, setChatInput] = useState<string>('');
  const [isSendingChat, setIsSendingChat] = useState<boolean>(false);
  const [autoSpeakChatReplies, setAutoSpeakChatReplies] = useState<boolean>(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // Build ordered playlist of tracks for the active tour (0: Intro, 1..N: Stops)
  const tourTracks = useMemo<TourAudioTrack[]>(() => {
    if (!activeTour) return [];
    const list: TourAudioTrack[] = [
      {
        index: 0,
        id: `tour-main-${activeTour.placeName}`,
        label: `Introducción: ${activeTour.placeName}`,
        shortLabel: 'Introducción',
        text: activeTour.audioGuideScript,
        stopIndex: null,
      },
    ];
    activeTour.stops.forEach((stop, idx) => {
      list.push({
        index: idx + 1,
        id: `tour-stop-${stop.number}-${activeTour.placeName}`,
        label: `Parada ${stop.number}: ${stop.title}`,
        shortLabel: `Parada ${stop.number}`,
        text: `Parada ${stop.number}: ${stop.title}. Qué mirar con los ojos: ${stop.whatToLookAt}. Historia y secretos: ${stop.story}. ${
          stop.insiderTip ? `Consejo de guía local: ${stop.insiderTip}` : ''
        }`,
        stopIndex: idx,
      });
    });
    return list;
  }, [activeTour]);

  const tourTracksRef = useRef<TourAudioTrack[]>(tourTracks);
  useEffect(() => {
    tourTracksRef.current = tourTracks;
  }, [tourTracks]);

  // Stop any playing speech safely
  const stopAudio = useCallback(() => {
    const now = Date.now();
    if (now - lastAudioClickTimeRef.current < 150) return;
    lastAudioClickTimeRef.current = now;
    stopAllSpeech();
  }, []);

  // Play a specific track by index with automatic sequential queue support
  const playTrackByIndex = useCallback(
    (trackIdx: number, isAutoTriggered = false) => {
      const tracks = tourTracksRef.current;
      if (!tracks || trackIdx < 0 || trackIdx >= tracks.length) return;

      if (!isAutoTriggered) {
        const now = Date.now();
        if (now - lastAudioClickTimeRef.current < 200) return;
        lastAudioClickTimeRef.current = now;
      }

      const track = tracks[trackIdx];
      setActiveTrackIndex(trackIdx);
      if (track.stopIndex !== null) {
        setActiveStopIndex(track.stopIndex);
      }

      // Toggle pause/resume if this exact track is already active (and clicked manually)
      if (!isAutoTriggered && speechState.isSpeaking && speechState.speakingId === track.id) {
        if (speechState.isPaused) {
          resumeSpeech();
        } else {
          pauseSpeech();
        }
        return;
      }

      playNaturalSpeech({
        text: track.text,
        lang: 'es-ES',
        speed: playbackSpeed,
        id: track.id,
        onStart: () => {
          setActiveTrackIndex(trackIdx);
          if (track.stopIndex !== null) {
            setActiveStopIndex(track.stopIndex);
          }
        },
        onEnd: () => {
          // If auto-advance is enabled, automatically launch the next track in the monument tour
          const currentTracks = tourTracksRef.current;
          if (autoAdvanceRef.current && trackIdx + 1 < currentTracks.length) {
            const nextTrack = currentTracks[trackIdx + 1];
            showToast(`Reproduciendo siguiente: ${nextTrack.shortLabel}`);
            setTimeout(() => {
              playTrackByIndex(trackIdx + 1, true);
            }, 450);
          }
        },
      });
    },
    [playbackSpeed, showToast, speechState.isPaused, speechState.isSpeaking, speechState.speakingId]
  );

  // Play any standalone text (e.g. Guía Nguyễn chat messages)
  const playCustomAudio = useCallback(
    (text: string, customId: string) => {
      const now = Date.now();
      if (now - lastAudioClickTimeRef.current < 200) return;
      lastAudioClickTimeRef.current = now;

      if (speechState.isSpeaking && speechState.speakingId === customId) {
        if (speechState.isPaused) {
          resumeSpeech();
        } else {
          pauseSpeech();
        }
        return;
      }

      playNaturalSpeech({
        text,
        lang: 'es-ES',
        speed: playbackSpeed,
        id: customId,
      });
    },
    [playbackSpeed, speechState.isPaused, speechState.isSpeaking, speechState.speakingId]
  );

  const toggleSpeed = () => {
    const nextSpeed =
      playbackSpeed === 1.0 ? 1.2 : playbackSpeed === 1.2 ? 1.5 : playbackSpeed === 1.5 ? 0.9 : 1.0;
    setPlaybackSpeed(nextSpeed);
    setSpeechPlaybackRate(nextSpeed);
    showToast(`Velocidad de narración: ${nextSpeed}x`);
  };

  const handleSkipSeconds = (deltaSeconds: number) => {
    if (!speechState.isSpeaking && !speechState.isPaused) return;
    const target = Math.max(0, Math.min(speechState.duration || 120, speechState.currentTime + deltaSeconds));
    seekSpeech(target);
  };

  // Pronounce Vietnamese term using high-definition natural engine
  const speakVietnamese = (text: string) => {
    speakVietnameseNatural(text, `tour-vi-${text.slice(0, 20)}`);
  };

  // Helper to construct a contextual fallback tour client-side ONLY when offline and searching an unlisted monument
  const createClientFallbackTour = (place: string, city: string): FreeTourData => {
    const cityMeta = POPULAR_CITIES.find((c) => c.name === city) || POPULAR_CITIES[0];
    const baseLat = cityMeta.center.lat;
    const baseLng = cityMeta.center.lng;

    return {
      placeName: place,
      cityName: city || 'Vietnam',
      vietnameseName: place,
      centerLat: baseLat,
      centerLng: baseLng,
      tagline: `Recorrido cultural, arquitectura tradicional y memoria histórica de ${place} en ${city}.`,
      durationMinutes: 35,
      audioGuideScript: `¡Xin chào y bienvenido a ${place}! Te encuentras en uno de los enclaves patrimoniales de ${city}. Al observar tu entorno, notarás cómo la arquitectura tradicional vietnamita busca siempre la armonía geomántica entre la orientación del viento, la presencia del agua y las maderas nobles talladas por los antiguos gremios de artesanos.\n\nA lo largo de este recorrido guiado exploraremos sus tres paradas principales: desde el pórtico ceremonial de acceso y el significado de sus guardianes protectores, hasta el santuario interior y el patio de calma donde los habitantes locales depositan sus ofrendas de flores de loto e incienso.`,
      stops: [
        {
          number: 1,
          title: `Pórtico Principal y Acceso a ${place}`,
          whatToLookAt: 'La puerta de tres vanos (Tam Quan), los aleros curvados y el umbral elevado de madera.',
          story: 'Las puertas tradicionales vietnamitas cuentan con tres accesos que simbolizan las tres visiones budistas de la existencia, obligando a dar un paso por encima del umbral en señal de respeto.',
          insiderTip: 'Nunca pises directamente sobre el listón de madera inferior de la puerta al cruzar.',
          lat: baseLat + 0.0004,
          lng: baseLng - 0.0004,
        },
        {
          number: 2,
          title: `Santuario Central y Simbolismo de ${place}`,
          whatToLookAt: 'Las tallas de dragones, fénix y tortugas junto a las bandejas de ofrendas impares.',
          story: 'Los artesanos empleaban madera de hierro (gỗ lim) y laca natural roja y dorada para preservar las columnas frente a la humedad monzónica durante siglos.',
          insiderTip: 'Observa las espirales de incienso colgadas del techo, que arden lentamente durante semanas.',
          lat: baseLat,
          lng: baseLng,
        },
        {
          number: 3,
          title: 'Jardín Interior, Estelas y Rincón de Calma',
          whatToLookAt: 'Los árboles centenarios, los bonsáis modelados sobre roca (Hòn Non Bộ) y las campanas de bronce.',
          story: 'Los patios interiores reproducen en miniatura las montañas y los mares de Vietnam para atraer la serenidad espiritual.',
          insiderTip: 'Es el mejor punto del recinto para disfrutar de la sombra antes de salir de nuevo al bullicio urbano.',
          lat: baseLat - 0.0004,
          lng: baseLng + 0.0004,
        },
      ],
      photoSpot: {
        location: `En diagonal frente a la fachada principal de ${place}.`,
        bestLight: 'A media mañana (08:30 - 10:00) o durante la hora dorada vespertina.',
        instruction: 'Encuadra los tejados curvos con la vegetación tropical en primer plano.',
      },
      culturalEtiquette: {
        dressCode: 'Hombros y rodillas cubiertos. Retirar gorras y gafas de sol al entrar a los salones interiores.',
        whatNotToDo: 'Evitar hablar en tono alto frente a los altares o señalar las estatuas con un solo dedo.',
        scamWarning: 'Declina con una sonrisa ("Không, cảm ơn") si alguien intenta entregarte incienso o amuletos en la calle exterior.',
      },
      streetFoodReward: {
        dishNameVi: 'Cà Phê Sữa Đá & Bánh Mì Giòn',
        dishNameEs: 'Café vietnamita helado con leche condensada y bocadillo crujiente tradicional',
        whereToFind: `En las cafeterías locales de las calles adyacentes a ${place}.`,
        priceEstimate: '25.000 ₫ – 45.000 ₫',
      },
      suggestedQuestions: [
        `¿Cuál es la historia principal de ${place}?`,
        '¿Qué significan los cuatro animales sagrados (Long, Lân, Quy, Phụng) en Vietnam?',
        `¿Qué especialidad gastronómica de ${city} recomiendas probar cerca de aquí?`,
      ],
    };
  };

  // Main tour loader & generator — loads the unique deep script for each monument
  const handleGenerateTour = useCallback(
    async (customPlace?: string, customCity?: string) => {
      const targetPlace = (customPlace ?? placeQuery).trim();
      const targetCity = (customCity ?? selectedCity).trim();

      if (!targetPlace) {
        setTourError('Por favor selecciona o escribe el monumento que deseas escuchar.');
        return;
      }

      const INVALID_TEST_WORDS = [
        'test', 'prueba', 'asdf', '123', 'xxx', 'foo', 'bar', 'temp',
        'hola', 'abc', 'qwerty', 'testing', 'monumento', 'nada', 'none',
      ];
      if (targetPlace.length < 3 || INVALID_TEST_WORDS.includes(targetPlace.toLowerCase())) {
        setTourError(
          `No se encontró «${targetPlace}» como monumento o templo en Vietnam. Elige uno de los monumentos verificados o escribe un lugar real.`
        );
        setIsLoadingTour(false);
        return;
      }

      stopAudio();
      setIsLoadingTour(true);
      setTourError(null);

      // 1. Instant check against our 21 verified curated tours (0-latency, 100% unique deep script)
      const curatedMatch = findClientCuratedTour(targetPlace, targetCity);
      if (curatedMatch) {
        const cleanCopy: FreeTourData = JSON.parse(JSON.stringify(curatedMatch));
        setActiveTour(cleanCopy);
        setActiveStopIndex(0);
        setActiveTrackIndex(0);
        setPlaceQuery(cleanCopy.placeName);
        setSelectedCity(cleanCopy.cityName);
        setChatMessages([
          {
            id: `welcome-${Date.now()}`,
            role: 'assistant',
            text: `¡Xin chào! Soy Nguyễn, tu guía local en ${cleanCopy.placeName}. Tienes lista la audioguía completa con ${cleanCopy.stops.length} paradas geolocalizadas. ¡Pregúntame cualquier curiosidad que veas a tu alrededor!`,
            timestamp: Date.now(),
          },
        ]);
        setIsLoadingTour(false);
        showToast(`Audioguía cargada: ${cleanCopy.placeName}`);
        return;
      }

      // 2. Fetch from backend AI generator if it's a custom monument not in the curated list
      if (isOnline) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 9500);

          const response = await fetch('/api/free-tour', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              placeName: targetPlace,
              cityName: targetCity,
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          const data = await response.json();

          if (response.ok && data && data.success && data.tour) {
            setActiveTour(data.tour);
            setActiveStopIndex(0);
            setActiveTrackIndex(0);
            setChatMessages([
              {
                id: `welcome-${Date.now()}`,
                role: 'assistant',
                text: `¡Xin chào! Soy Nguyễn, tu guía local en ${data.tour.placeName}. Disfruta del recorrido paso a paso y pregúntame lo que necesites.`,
                timestamp: Date.now(),
              },
            ]);
            setIsLoadingTour(false);
            showToast(`Audioguía de ${data.tour.placeName} generada`);
            return;
          } else if (data && data.error) {
            setTourError(data.error);
            setIsLoadingTour(false);
            return;
          }
        } catch (err) {
          console.warn('Network tour fetch error:', err);
        }
      }

      // 3. Offline fallback for uncatalogued places
      const fallbackTour = createClientFallbackTour(targetPlace, targetCity);
      setActiveTour(fallbackTour);
      setActiveStopIndex(0);
      setActiveTrackIndex(0);
      setChatMessages([
        {
          id: `welcome-fb-${Date.now()}`,
          role: 'assistant',
          text: `¡Xin chào! Soy Nguyễn, tu guía local en ${fallbackTour.placeName}. He preparado esta audioguía offline para ti.`,
          timestamp: Date.now(),
        },
      ]);
      setIsLoadingTour(false);
      showToast(`Audioguía cargada para ${targetPlace}`);
    },
    [placeQuery, selectedCity, isOnline, stopAudio, showToast]
  );

  // When opened with an initial POI from Map/Itinerary, immediately load its tour
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

  // Scroll chat messages container internally when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current && chatMessages.length > 1) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Smart GPS detection
  const handleDetectGps = async () => {
    setIsLocatingGps(true);
    setGpsNotice('Buscando satélites GPS y monumento más cercano...');
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
          `Ubicación GPS en Vietnam: estás a ~${
            distanceToClosestPoiKm < 1
              ? Math.round(distanceToClosestPoiKm * 1000) + ' m'
              : distanceToClosestPoiKm + ' km'
          } de ${closestPoi.nameEs}.`
        );
      } else {
        setGpsNotice(
          `Señal GPS detectada a ~${distanceToVietnamKm.toLocaleString()} km de Vietnam. Te hemos situado en ${closestPoi.nameEs} (${closestPoi.city}) para explorar su audioguía.`
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
    setGpsNotice(`Ubicación situada en ${sim.simulatedName}.`);
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
      showToast('Tour guardado para acceso 100% sin conexión.');
    }
  };

  const isCurrentTourSaved = activeTour
    ? savedTours.some((t) => t.placeName.toLowerCase() === activeTour.placeName.toLowerCase())
    : false;

  // Build map POIs and routePolyline from the active tour's stops
  const tourMapData = useMemo(() => {
    if (!activeTour) return null;
    const cityFallback =
      POPULAR_CITIES.find((c) => c.name === activeTour.cityName)?.center || {
        lat: 21.0285,
        lng: 105.8542,
      };
    const centerLat = activeTour.centerLat || cityFallback.lat;
    const centerLng = activeTour.centerLng || cityFallback.lng;

    const stopPois: PointOfInterest[] = activeTour.stops.map((s, idx) => {
      const lat = s.lat ?? centerLat + (idx - 1) * 0.00045;
      const lng = s.lng ?? centerLng + (idx - 1) * 0.00045;
      return {
        id: `tour-stop-poi-${s.number}`,
        regionId: 'tour-active',
        nameVi: `${s.number}. ${s.title}`,
        nameEs: `${s.number}. ${s.title}`,
        category: 'Monumento',
        city: activeTour.cityName,
        lat,
        lng,
        rating: 4.9,
        ticketVnd: 0,
        openingHours: 'Parada del recorrido',
        bestTime: s.whatToLookAt,
        description: s.story,
        travelerTips: s.insiderTip,
        howToGet: `Parada ${s.number} de ${activeTour.stops.length}`,
        grabFriendly: true,
        isIconic: idx === activeStopIndex,
      };
    });

    const routePolyline = stopPois.map((p, idx) => ({
      lat: p.lat,
      lng: p.lng,
      stopIndex: idx + 1,
      title: activeTour.stops[idx]?.title || p.nameEs,
    }));

    const selectedStopPoi = stopPois[activeStopIndex] || stopPois[0];

    return {
      center: { lat: centerLat, lng: centerLng },
      stopPois,
      routePolyline,
      selectedStopPoi,
    };
  }, [activeTour, activeStopIndex]);

  // Ask tour guide a question (Live Q&A + voice playback support)
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
            const msgId = `guide-${Date.now()}`;
            const guideMsg: TourChatMessage = {
              id: msgId,
              role: 'assistant',
              text: data.reply,
              timestamp: Date.now(),
            };
            setChatMessages((prev) => [...prev, guideMsg]);
            setIsSendingChat(false);
            if (autoSpeakChatReplies) {
              playNaturalSpeech({
                text: data.reply,
                lang: 'es-ES',
                speed: playbackSpeed,
                id: `chat-voice-${msgId}`,
              });
            }
            return;
          }
        }
      } catch (e) {
        console.warn('Tour guide online chat error:', e);
      }
    }

    // Smart monument-specific contextual reply if offline
    let localAnswer = `Sobre ${activeTour.placeName}: `;
    const qLower = questionText.toLowerCase();

    if (qLower.includes('comida') || qLower.includes('plato') || qLower.includes('comer') || qLower.includes('probar')) {
      localAnswer += `Al terminar la visita te recomiendo pedir ${
        activeTour.streetFoodReward?.dishNameVi || 'Phở o Bún Chả'
      } (${activeTour.streetFoodReward?.dishNameEs || 'especialidad local'}). Lo encontrarás en: ${
        activeTour.streetFoodReward?.whereToFind || 'los puestos cercanos'
      }, con un precio justo de ${activeTour.streetFoodReward?.priceEstimate || '35.000 ₫ – 55.000 ₫'}.`;
    } else if (qLower.includes('foto') || qLower.includes('luz') || qLower.includes('hora')) {
      localAnswer += `El mejor punto fotográfico es ${activeTour.photoSpot.location}. La luz ideal se da en este horario: ${activeTour.photoSpot.bestLight}. Truco de encuadre: ${activeTour.photoSpot.instruction}`;
    } else if (qLower.includes('ropa') || qLower.includes('vestimenta') || qLower.includes('norma') || qLower.includes('timo')) {
      localAnswer += `Recuerda la etiqueta del lugar: ${activeTour.culturalEtiquette.dressCode}. Evita siempre: ${
        activeTour.culturalEtiquette.whatNotToDo
      }. ${activeTour.culturalEtiquette.scamWarning || ''}`;
    } else {
      const relevantStop = activeTour.stops[activeStopIndex] || activeTour.stops[0];
      localAnswer += `${relevantStop.story} Además, un detalle clave que pocos visitantes notan: ${relevantStop.insiderTip}`;
    }

    const msgId = `guide-offline-${Date.now()}`;
    const offlineGuideMsg: TourChatMessage = {
      id: msgId,
      role: 'assistant',
      text: localAnswer,
      timestamp: Date.now(),
    };
    setChatMessages((prev) => [...prev, offlineGuideMsg]);
    setIsSendingChat(false);
    if (autoSpeakChatReplies) {
      playNaturalSpeech({
        text: localAnswer,
        lang: 'es-ES',
        speed: playbackSpeed,
        id: `chat-voice-${msgId}`,
      });
    }
  };

  // Determine if any track from the current tour is currently active in speechSynthesis
  const currentActiveTrack = useMemo(() => {
    if (!activeTour || tourTracks.length === 0) return null;
    const playingMatch = tourTracks.find((t) => t.id === speechState.speakingId);
    if (playingMatch) return playingMatch;
    return tourTracks[activeTrackIndex] || tourTracks[0];
  }, [activeTour, tourTracks, speechState.speakingId, activeTrackIndex]);

  const isTourAudioActive = Boolean(
    currentActiveTrack &&
      speechState.speakingId === currentActiveTrack.id &&
      (speechState.isSpeaking || speechState.isLoading)
  );

  // Curated monuments for the currently selected city
  const cityCuratedMonuments = useMemo(() => {
    return CURATED_CLIENT_TOURS.filter(
      (t) =>
        t.cityName.toLowerCase().includes(selectedCity.toLowerCase()) ||
        selectedCity.toLowerCase().includes(t.cityName.toLowerCase())
    );
  }, [selectedCity]);

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

      {/* Top Header & Monument Explorer Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-stone-200/90 shadow-[0_4px_24px_rgba(28,25,23,0.04)] space-y-4">
        {/* Row 1: Title & Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700 shrink-0">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-xl sm:text-2xl text-stone-900 leading-tight">
                Audioguía Free Tour
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Guiones históricos verificados por monumento · Reproducción continua · Mapa de paradas
              </p>
            </div>
          </div>

          {/* Right Action Buttons: GPS + Saved */}
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
            <button
              type="button"
              id="btn-detect-gps"
              onClick={handleDetectGps}
              disabled={isLocatingGps}
              title="Detectar monumento más cercano mediante GPS"
              className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 text-xs font-semibold transition active:scale-95 cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <Navigation
                className={`w-3.5 h-3.5 ${isLocatingGps ? 'animate-spin text-amber-600' : 'text-stone-500'}`}
              />
              <span>{isLocatingGps ? 'Buscando...' : 'Cerca de mí'}</span>
            </button>

            <button
              type="button"
              id="btn-saved-tours-toggle"
              onClick={() => setShowSavedList(!showSavedList)}
              title="Ver tours descargados para acceso sin conexión"
              className={`min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer whitespace-nowrap shrink-0 ${
                showSavedList
                  ? 'bg-amber-500 text-stone-950 font-bold shadow-xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5 text-amber-600" />
              <span className="tabular-nums">Guardados ({savedTours.length})</span>
            </button>
          </div>
        </div>

        {/* Saved Offline Tours Drawer */}
        {showSavedList && (
          <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-800">
                Tus Audioguías Guardadas Offline ({savedTours.length})
              </span>
              <button
                type="button"
                onClick={() => setShowSavedList(false)}
                className="text-xs text-stone-500 hover:text-stone-800 font-medium"
              >
                Cerrar
              </button>
            </div>
            {savedTours.length === 0 ? (
              <p className="text-xs text-stone-500 py-2">
                Aún no has guardado ninguna audioguía. Pulsa «Guardar» dentro de cualquier monumento para tenerlo disponible sin internet.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {savedTours.map((saved) => (
                  <div
                    key={saved.placeName}
                    className="flex items-center justify-between gap-2 bg-white p-3 rounded-xl border border-stone-200 hover:border-amber-400 transition"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        stopAudio();
                        setActiveTour(saved);
                        setActiveStopIndex(0);
                        setActiveTrackIndex(0);
                        setPlaceQuery(saved.placeName);
                        setSelectedCity(saved.cityName);
                        setShowSavedList(false);
                        showToast(`Audioguía cargada: ${saved.placeName}`);
                      }}
                      className="text-left flex-1 min-w-0 cursor-pointer"
                    >
                      <div className="text-xs font-bold text-stone-900 truncate">{saved.placeName}</div>
                      <div className="text-[11px] text-stone-500">
                        {saved.cityName} · {saved.stops.length} paradas · {saved.durationMinutes} min
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = deleteSavedFreeTour(saved.placeName);
                        setSavedTours(updated);
                      }}
                      className="p-2 text-stone-400 hover:text-red-600 transition cursor-pointer"
                      title="Eliminar de guardados"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Row 2: City Tabs + Search Controls */}
        <div className="space-y-3">
          {/* City Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {POPULAR_CITIES.map((cityObj) => {
              const isSelected = selectedCity === cityObj.name;
              return (
                <button
                  key={cityObj.name}
                  type="button"
                  onClick={() => {
                    setSelectedCity(cityObj.name);
                  }}
                  className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer shrink-0 flex items-center gap-1.5 active:scale-95 ${
                    isSelected
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200/70'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5 text-amber-500" />
                  <span>{cityObj.name}</span>
                </button>
              );
            })}
          </div>

          {/* Search bar & Load Button */}
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
                placeholder={`Buscar monumento o templo en ${selectedCity}...`}
                className="w-full min-h-[44px] pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white text-stone-900 transition-all placeholder:text-stone-400"
              />
            </div>

            <button
              type="button"
              id="btn-start-tour"
              onClick={() => handleGenerateTour()}
              disabled={isLoadingTour || !placeQuery.trim()}
              className="min-h-[44px] w-full sm:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs sm:text-sm shadow-xs flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap shrink-0"
            >
              {isLoadingTour ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-stone-950" />
                  <span>Cargando...</span>
                </>
              ) : (
                <>
                  <Headphones className="w-4 h-4 text-stone-950" />
                  <span>Cargar Audioguía</span>
                </>
              )}
            </button>
          </div>

          {/* Verified Monuments Selector Chips for Active City */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-medium text-stone-500">
              Monumentos con guion verificado en {selectedCity} (pulsa uno para cargar al instante):
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {cityCuratedMonuments.map((monument) => {
                const isCurrent =
                  activeTour?.placeName.toLowerCase() === monument.placeName.toLowerCase();
                return (
                  <button
                    key={monument.placeName}
                    type="button"
                    onClick={() => {
                      setPlaceQuery(monument.placeName);
                      handleGenerateTour(monument.placeName, monument.cityName);
                    }}
                    className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-medium border transition flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95 whitespace-nowrap ${
                      isCurrent
                        ? 'bg-amber-500 text-stone-950 font-bold border-amber-500 shadow-xs'
                        : 'bg-stone-50 hover:bg-amber-50 text-stone-700 hover:text-amber-950 border-stone-200'
                    }`}
                  >
                    <Headphones className="w-3.5 h-3.5 shrink-0" />
                    <span>{monument.placeName}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {gpsNotice && (
          <div className="bg-amber-50 text-amber-900 px-3.5 py-2.5 rounded-xl text-xs border border-amber-200 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{gpsNotice}</span>
            </div>
            {showGpsHelper && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSimulatePosition('hanoi-old-quarter')}
                  className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 rounded-lg border border-amber-300 text-[11px] font-semibold cursor-pointer"
                >
                  Simular Hanói
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulatePosition('hoian-ancient-town')}
                  className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 rounded-lg border border-amber-300 text-[11px] font-semibold cursor-pointer"
                >
                  Simular Hội An
                </button>
              </div>
            )}
          </div>
        )}

        {tourError && (
          <div className="bg-red-50 text-red-800 p-3 rounded-xl border border-red-200 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{tourError}</span>
          </div>
        )}
      </div>

      {/* Zero-State Catalog Grid when no monument is selected yet */}
      {!activeTour && !isLoadingTour && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200/90 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif font-bold text-lg text-stone-900">
                Catálogo de Audioguías en {selectedCity}
              </h3>
              <p className="text-xs text-stone-500">
                Cada monumento incluye un guion histórico único, paradas paso a paso y mapa del recinto
              </p>
            </div>
            <span className="text-xs text-stone-500 tabular-nums">
              {cityCuratedMonuments.length} disponibles
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {cityCuratedMonuments.map((tour) => (
              <button
                key={tour.placeName}
                type="button"
                onClick={() => {
                  setPlaceQuery(tour.placeName);
                  handleGenerateTour(tour.placeName, tour.cityName);
                }}
                className="text-left p-4 rounded-2xl border border-stone-200 hover:border-amber-400 hover:bg-amber-50/20 transition group flex flex-col justify-between gap-3 cursor-pointer"
              >
                <div className="space-y-1">
                  <div className="text-xs text-stone-500 flex items-center gap-1.5 tabular-nums">
                    <span>{tour.cityName}</span>
                    <span aria-hidden="true">·</span>
                    <span>{tour.durationMinutes} min</span>
                    <span aria-hidden="true">·</span>
                    <span>{tour.stops.length} paradas</span>
                  </div>
                  <h4 className="font-serif font-bold text-base text-stone-900 group-hover:text-amber-800 transition">
                    {tour.placeName}
                  </h4>
                  {tour.vietnameseName && (
                    <div className="text-xs font-medium text-stone-600">{tour.vietnameseName}</div>
                  )}
                  <p className="text-xs text-stone-600 line-clamp-2 pt-1">{tour.tagline}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs font-semibold text-amber-700">
                  <span>Abrir audioguía y mapa</span>
                  <Play className="w-3.5 h-3.5 fill-current" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading state indicator */}
      {isLoadingTour && (
        <div
          id="tour-loading-card"
          className="bg-white rounded-2xl p-8 border border-stone-200 shadow-xs text-center space-y-4 animate-pulse"
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
            <Compass className="w-6 h-6 animate-spin" />
          </div>
          <div>
            <h3 className="text-base font-bold text-stone-900">
              Preparando audioguía de {placeQuery} en {selectedCity}...
            </h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto mt-1">
              Cargando narrativa histórica, paradas geolocalizadas y consejos del guía local.
            </p>
          </div>
        </div>
      )}

      {/* ACTIVE TOUR VIEW */}
      {activeTour && !isLoadingTour && (
        <div id="active-tour-view" className="space-y-5 animate-fade-in">
          {/* Unified Tour Card & Pro Audioguide Player Console */}
          <div className="bg-white rounded-3xl p-4 sm:p-6 border border-stone-200/90 shadow-[0_4px_24px_rgba(28,25,23,0.04)] space-y-4">
            {/* Top row: Clean Unboxed Metadata + Save/Share Actions */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-xs text-stone-500 tabular-nums">
                <span className="font-semibold text-stone-800">{activeTour.cityName}</span>
                <span aria-hidden="true">·</span>
                <span>{activeTour.durationMinutes} min</span>
                <span aria-hidden="true">·</span>
                <span>{activeTour.stops.length} paradas guiadas</span>
              </div>

              {/* Action Buttons: Map Toggle, Save & Share */}
              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  type="button"
                  onClick={() => setShowRouteMap((prev) => !prev)}
                  className={`min-h-[40px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer whitespace-nowrap shrink-0 ${
                    showRouteMap
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200/70'
                  }`}
                >
                  <MapIcon className="w-3.5 h-3.5 text-amber-500" />
                  <span>{showRouteMap ? 'Ocultar Mapa' : 'Ver Mapa'}</span>
                </button>

                <button
                  type="button"
                  id="btn-save-tour-toggle"
                  onClick={handleToggleSaveTour}
                  className={`min-h-[40px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer whitespace-nowrap shrink-0 ${
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
                      <Bookmark className="w-3.5 h-3.5 text-amber-600" />
                      <span>Guardar</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  id="btn-copy-tour-text"
                  onClick={() => {
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(
                        `Audioguía de ${activeTour.placeName} (${activeTour.cityName}):\n\n${activeTour.audioGuideScript}\n\nParadas:\n${activeTour.stops
                          .map((s) => `${s.number}. ${s.title}: ${s.story}`)
                          .join('\n')}`
                      );
                      showToast('Guía copiada al portapapeles');
                    }
                  }}
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center p-2 bg-stone-100 hover:bg-stone-200 text-stone-600 hover:text-stone-900 rounded-xl border border-stone-200/70 text-xs transition cursor-pointer active:scale-95"
                  title="Copiar guía completa"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Place Title & Subtitle */}
            <div>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 tracking-tight text-balance">
                {activeTour.placeName}
              </h2>
              {activeTour.vietnameseName &&
                activeTour.vietnameseName.trim().toLowerCase() !==
                  activeTour.placeName.trim().toLowerCase() && (
                  <div className="flex items-center gap-2 text-xs text-stone-600 mt-1">
                    <span className="font-semibold text-stone-800">{activeTour.vietnameseName}</span>
                    <button
                      type="button"
                      onClick={() => speakVietnamese(activeTour.vietnameseName || '')}
                      title="Escuchar pronunciación nativa en vietnamita"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/70 text-[11px] font-semibold transition cursor-pointer"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>Pronunciar en vietnamita</span>
                    </button>
                  </div>
                )}
              <p className="text-stone-600 text-xs sm:text-sm mt-1.5">{activeTour.tagline}</p>
            </div>

            {/* PRO AUDIO CONSOLE WITH INTERACTIVE PROGRESS BAR, +/-10s SEEK & AUTO-ADVANCE */}
            <div className="bg-stone-900 text-white rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-sm">
              {/* Top Track Header & Auto-Advance Toggle */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold text-xs shrink-0 tabular-nums">
                    {currentActiveTrack?.index === 0 ? 'Intro' : `#${currentActiveTrack?.index || 1}`}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] text-stone-400 font-medium">
                      Pista { (currentActiveTrack?.index ?? 0) + 1 } de {tourTracks.length}
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-white truncate">
                      {currentActiveTrack?.label || `Introducción: ${activeTour.placeName}`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  {speechState.isSpeaking && (
                    <AudioWaveIndicator
                      isPlaying={!speechState.isPaused}
                      size="sm"
                      colorClass="text-amber-400"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const nextVal = !autoAdvance;
                      setAutoAdvance(nextVal);
                      showToast(
                        nextVal
                          ? 'Reproducción continua activada: avanzará sola por cada parada'
                          : 'Reproducción continua desactivada'
                      );
                    }}
                    title="Reproducir automáticamente la siguiente parada al terminar cada pista"
                    className={`min-h-[36px] px-2.5 py-1 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 border transition cursor-pointer whitespace-nowrap shrink-0 ${
                      autoAdvance
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-stone-800 text-stone-400 border-stone-700 hover:text-stone-200'
                    }`}
                  >
                    <Repeat className="w-3.5 h-3.5" />
                    <span>Auto-avance: {autoAdvance ? 'Sí' : 'No'}</span>
                  </button>
                </div>
              </div>

              {/* Interactive Timeline Scrubbing Bar */}
              <div className="space-y-1">
                <input
                  type="range"
                  aria-label="Barra de progreso de la audioguía"
                  min={0}
                  max={Math.max(1, speechState.duration || 60)}
                  step={0.5}
                  value={isTourAudioActive ? speechState.currentTime : 0}
                  disabled={!isTourAudioActive}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    seekSpeech(val);
                  }}
                  className="w-full h-2 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-amber-500 disabled:opacity-50"
                />
                <div className="flex items-center justify-between text-[11px] text-stone-400 font-mono tabular-nums">
                  <span>{isTourAudioActive ? formatTime(speechState.currentTime) : '0:00'}</span>
                  <span>
                    {isTourAudioActive && speechState.duration > 0
                      ? formatTime(speechState.duration)
                      : 'Listo para reproducir'}
                  </span>
                </div>
              </div>

              {/* Main Transport Controls: Prev Track, -10s, Play/Pause, +10s, Next Track, Speed */}
              <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  {/* Previous Track */}
                  <button
                    type="button"
                    onClick={() => playTrackByIndex(Math.max(0, activeTrackIndex - 1))}
                    disabled={activeTrackIndex <= 0}
                    title="Pista anterior"
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 disabled:opacity-35 transition cursor-pointer"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>

                  {/* -10 Seconds */}
                  <button
                    type="button"
                    onClick={() => handleSkipSeconds(-10)}
                    disabled={!isTourAudioActive}
                    title="Retroceder 10 segundos"
                    className="min-h-[44px] px-2.5 flex items-center justify-center gap-1 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold tabular-nums disabled:opacity-35 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>-10s</span>
                  </button>

                  {/* Primary Play / Pause Button */}
                  <button
                    type="button"
                    id="btn-toggle-audio-guide"
                    onClick={() => playTrackByIndex(activeTrackIndex)}
                    className="min-h-[44px] px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition active:scale-95 cursor-pointer whitespace-nowrap"
                  >
                    {isTourAudioActive && speechState.isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-stone-950" />
                        <span>Cargando voz...</span>
                      </>
                    ) : isTourAudioActive && !speechState.isPaused ? (
                      <>
                        <Pause className="w-4 h-4 fill-current" />
                        <span>Pausar</span>
                      </>
                    ) : isTourAudioActive && speechState.isPaused ? (
                      <>
                        <Play className="w-4 h-4 fill-current" />
                        <span>Reanudar</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current" />
                        <span>
                          {activeTrackIndex === 0
                            ? 'Escuchar Guía Completa'
                            : `Escuchar Parada ${activeTrackIndex}`}
                        </span>
                      </>
                    )}
                  </button>

                  {/* +10 Seconds */}
                  <button
                    type="button"
                    onClick={() => handleSkipSeconds(10)}
                    disabled={!isTourAudioActive}
                    title="Avanzar 10 segundos"
                    className="min-h-[44px] px-2.5 flex items-center justify-center gap-1 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold tabular-nums disabled:opacity-35 transition cursor-pointer"
                  >
                    <span>+10s</span>
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>

                  {/* Next Track */}
                  <button
                    type="button"
                    onClick={() =>
                      playTrackByIndex(Math.min(tourTracks.length - 1, activeTrackIndex + 1))
                    }
                    disabled={activeTrackIndex >= tourTracks.length - 1}
                    title="Siguiente parada"
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 disabled:opacity-35 transition cursor-pointer"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>

                  {/* Stop Audio */}
                  {isTourAudioActive && (
                    <button
                      type="button"
                      id="btn-stop-audio"
                      onClick={stopAudio}
                      className="min-h-[44px] px-3 rounded-xl bg-stone-800 hover:bg-red-900/60 text-stone-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      title="Detener narración"
                    >
                      <Square className="w-3 h-3 fill-current" />
                      <span>Parar</span>
                    </button>
                  )}
                </div>

                {/* Speed Control */}
                <button
                  type="button"
                  id="btn-toggle-audio-speed"
                  onClick={toggleSpeed}
                  className="min-h-[44px] px-3 py-2 bg-stone-800 hover:bg-stone-700 text-amber-400 rounded-xl text-xs font-mono font-bold tabular-nums transition border border-stone-700 cursor-pointer"
                  title="Cambiar velocidad de narración"
                >
                  {playbackSpeed.toFixed(1)}x
                </button>
              </div>

              {/* Quick Chapter / Track Selector Strip */}
              <div className="pt-2 border-t border-stone-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <ListMusic className="w-3.5 h-3.5 text-stone-400 shrink-0 mr-1" />
                {tourTracks.map((track) => {
                  const isSelected = activeTrackIndex === track.index;
                  const isCurrentlyPlaying =
                    speechState.speakingId === track.id && speechState.isSpeaking;
                  return (
                    <button
                      key={track.id}
                      type="button"
                      onClick={() => playTrackByIndex(track.index)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer shrink-0 flex items-center gap-1.5 tabular-nums ${
                        isCurrentlyPlaying
                          ? 'bg-amber-500 text-stone-950 font-bold'
                          : isSelected
                          ? 'bg-stone-700 text-white font-semibold'
                          : 'bg-stone-800/80 hover:bg-stone-800 text-stone-300'
                      }`}
                    >
                      <span>{track.shortLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Introduction Narrative Text */}
            <div className="pt-1 text-stone-700 text-xs sm:text-sm leading-relaxed font-serif space-y-2">
              <div className="text-[11px] font-sans font-bold uppercase tracking-wider text-amber-800">
                Guion de Introducción General
              </div>
              <p className="whitespace-pre-line">{activeTour.audioGuideScript}</p>
            </div>
          </div>

          {/* INTERACTIVE TOUR ROUTE MAP */}
          {showRouteMap && tourMapData && (
            <div className="bg-white rounded-3xl p-4 sm:p-5 border border-stone-200/90 shadow-[0_4px_24px_rgba(28,25,23,0.04)] space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <MapIcon className="w-4 h-4 text-amber-600" />
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">
                      Mapa Interactivo del Recorrido ({activeTour.stops.length} paradas)
                    </h3>
                    <p className="text-[11px] text-stone-500">
                      Toca cualquier marcador numerado para saltar a esa parada y escuchar su historia
                    </p>
                  </div>
                </div>
                <span className="text-xs text-stone-600 font-medium tabular-nums">
                  Activa: Parada {activeStopIndex + 1} de {activeTour.stops.length}
                </span>
              </div>

              <div className="rounded-2xl overflow-hidden border border-stone-200">
                <InteractiveOpenStreetMap
                  center={tourMapData.center}
                  zoom={16}
                  pois={tourMapData.stopPois}
                  selectedPoiId={tourMapData.selectedStopPoi?.id || null}
                  selectedLocationTarget={
                    tourMapData.selectedStopPoi
                      ? {
                          lat: tourMapData.selectedStopPoi.lat,
                          lng: tourMapData.selectedStopPoi.lng,
                        }
                      : null
                  }
                  routePolyline={tourMapData.routePolyline}
                  onSelectPoi={(poi) => {
                    const idx = tourMapData.stopPois.findIndex((p) => p.id === poi.id);
                    if (idx !== -1) {
                      setActiveStopIndex(idx);
                      setActiveTrackIndex(idx + 1);
                      const el = document.getElementById(`stop-card-${idx + 1}`);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                  }}
                  className="h-[260px] sm:h-[340px]"
                />
              </div>
            </div>
          )}

          {/* PARADAS DEL TOUR (Interactive Sequential Stops) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-stone-900">
                  Paradas del Recorrido ({activeTour.stops.length})
                </h3>
              </div>
              <span className="text-xs text-stone-500">
                {autoAdvance ? 'Auto-avance activado entre paradas' : 'Selecciona una parada para escuchar'}
              </span>
            </div>

            <div className="space-y-3">
              {activeTour.stops.map((stop, idx) => {
                const isSelected = activeStopIndex === idx;
                const trackIdx = idx + 1;
                const stopPlayId = `tour-stop-${stop.number}-${activeTour.placeName}`;
                const isThisStopLoading =
                  speechState.isLoading && speechState.speakingId === stopPlayId;
                const isThisStopPlaying =
                  speechState.isSpeaking &&
                  speechState.speakingId === stopPlayId &&
                  !speechState.isPaused;
                const isThisStopPaused =
                  speechState.isSpeaking &&
                  speechState.speakingId === stopPlayId &&
                  speechState.isPaused;

                return (
                  <div
                    key={stop.number}
                    id={`stop-card-${stop.number}`}
                    onClick={() => {
                      setActiveStopIndex(idx);
                      setActiveTrackIndex(trackIdx);
                    }}
                    className={`rounded-2xl p-5 border transition-all cursor-pointer ${
                      isThisStopPlaying || isSelected
                        ? 'bg-amber-50/40 border-amber-400 shadow-xs'
                        : 'bg-white hover:bg-stone-50 border-stone-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="w-8 h-8 rounded-xl bg-amber-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-xs tabular-nums">
                          {stop.number}
                        </span>
                        <div>
                          <h4 className="text-base font-bold text-stone-900 leading-snug">
                            {stop.title}
                          </h4>
                          {stop.lat && stop.lng && (
                            <span className="text-[11px] text-stone-500 tabular-nums">
                              Parada {stop.number} en el mapa del recinto
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            playTrackByIndex(trackIdx);
                          }}
                          className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 whitespace-nowrap ${
                            isThisStopLoading
                              ? 'bg-amber-300 text-stone-950 border border-amber-400'
                              : isThisStopPlaying
                              ? 'bg-amber-500 text-stone-950 shadow-xs'
                              : isThisStopPaused
                              ? 'bg-amber-300 text-stone-900 border border-amber-400'
                              : 'bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-stone-950 border border-stone-200/80'
                          }`}
                          title={
                            isThisStopPlaying
                              ? 'Pausar narración'
                              : isThisStopPaused
                              ? 'Reanudar narración'
                              : 'Escuchar narración de esta parada'
                          }
                        >
                          {isThisStopLoading ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-stone-900" />
                              <span>Cargando...</span>
                            </>
                          ) : isThisStopPlaying ? (
                            <>
                              <Pause className="w-3.5 h-3.5 fill-current" />
                              <span>Pausar</span>
                            </>
                          ) : isThisStopPaused ? (
                            <>
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>Reanudar</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>Escuchar Parada</span>
                            </>
                          )}
                        </button>

                        {(isThisStopPlaying || isThisStopPaused) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              stopAudio();
                            }}
                            className="min-h-[40px] flex items-center gap-1 px-2.5 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95"
                            title="Parar audio de la parada"
                          >
                            <Square className="w-3 h-3 fill-current text-stone-700" />
                            <span>Parar</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      {/* What to look at */}
                      <div className="bg-white/90 rounded-xl p-3 border border-stone-200/80">
                        <div className="font-bold text-amber-800 flex items-center gap-1.5 mb-1">
                          <Eye className="w-3.5 h-3.5 text-amber-600" />
                          <span>Qué buscar con los ojos</span>
                        </div>
                        <p className="text-stone-700 leading-relaxed">{stop.whatToLookAt}</p>
                      </div>

                      {/* Story */}
                      <div className="bg-white/90 rounded-xl p-3 border border-stone-200/80 md:col-span-2">
                        <div className="font-bold text-stone-800 flex items-center gap-1.5 mb-1">
                          <Sparkle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Historia y Simbolismo</span>
                        </div>
                        <p className="text-stone-700 leading-relaxed">{stop.story}</p>
                      </div>
                    </div>

                    {/* Insider tip */}
                    {stop.insiderTip && (
                      <div className="mt-2.5 bg-amber-100/50 rounded-xl p-2.5 text-xs text-amber-950 border border-amber-200/60 flex items-start gap-2">
                        <span className="text-amber-800 font-bold shrink-0">Consejo de guía:</span>
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
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
                  <Camera className="w-4 h-4 text-sky-600" />
                  <span>El Rincón Fotográfico Secreto</span>
                </div>
                <span className="text-xs text-sky-700 font-medium">
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
                  <span>
                    {activeTour.photoSpot?.instruction || 'Enfoca los aleros con luz diagonal.'}
                  </span>
                </div>
              </div>
            </div>

            {/* Cultural etiquette */}
            <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Etiqueta Cultural y Qué Evitar</span>
              </div>
              <div className="text-xs text-stone-700 space-y-1.5 pt-1">
                <div>
                  <strong className="text-stone-900">Vestimenta: </strong>
                  <span>
                    {activeTour.culturalEtiquette?.dressCode || 'Hombros y rodillas cubiertos.'}
                  </span>
                </div>
                <div>
                  <strong className="text-stone-900">Evitar: </strong>
                  <span>
                    {activeTour.culturalEtiquette?.whatNotToDo ||
                      'No tocar altares sagrados ni hablar en tono alto.'}
                  </span>
                </div>
                {activeTour.culturalEtiquette?.scamWarning && (
                  <div className="text-amber-900 bg-amber-50 p-2.5 rounded-xl border border-amber-200 mt-1">
                    <strong>Consejo práctico: </strong>
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
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center shrink-0">
                  <Utensils className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-amber-800">
                    La Recompensa Gastronómica al Salir
                  </div>
                  <h4 className="text-sm font-bold text-stone-900">
                    {activeTour.streetFoodReward.dishNameVi} ({activeTour.streetFoodReward.dishNameEs})
                  </h4>
                  <p className="text-xs text-stone-600 mt-0.5">
                    {activeTour.streetFoodReward.whereToFind}
                  </p>
                </div>
              </div>
              <div className="bg-white px-3.5 py-2 rounded-xl border border-amber-200 text-xs font-bold text-amber-900 self-stretch sm:self-auto text-center shrink-0 tabular-nums">
                Precio justo: {activeTour.streetFoodReward.priceEstimate}
              </div>
            </div>
          )}

          {/* INTERACTIVE GUIDE CHAT WITH VOICE PLAYBACK (Pregúntale a tu guía Nguyễn) */}
          <div
            id="guide-chat-card"
            className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200 shadow-xs space-y-4"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  N
                </div>
                <div>
                  <h4 className="text-sm font-bold text-stone-900">
                    Pregunta a tu Guía Nguyễn en Directo
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    Escribe tu duda o elige una pregunta rápida; puedes escuchar cada respuesta en voz alta.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const next = !autoSpeakChatReplies;
                  setAutoSpeakChatReplies(next);
                  showToast(
                    next
                      ? 'Lectura automática de respuestas de Nguyễn activada'
                      : 'Lectura automática de respuestas desactivada'
                  );
                }}
                className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition cursor-pointer ${
                  autoSpeakChatReplies
                    ? 'bg-amber-500 text-stone-950 border-amber-500 font-bold'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200'
                }`}
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>{autoSpeakChatReplies ? 'Voz automática: Sí' : 'Voz automática: No'}</span>
              </button>
            </div>

            {/* Suggested quick questions */}
            {activeTour.suggestedQuestions && activeTour.suggestedQuestions.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-stone-600 mb-2">
                  Preguntas sugeridas sobre {activeTour.placeName}:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {activeTour.suggestedQuestions.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => handleSendChatMessage(q)}
                      disabled={isSendingChat}
                      className="min-h-[38px] px-3 py-1.5 bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-950 rounded-xl text-xs font-medium border border-stone-200 transition-all text-left cursor-pointer"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Conversation messages scroll area */}
            <div ref={chatContainerRef} className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {chatMessages.map((msg) => {
                const isUser = msg.role === 'user';
                const msgVoiceId = `chat-voice-${msg.id}`;
                const isSpeakingThisMsg =
                  speechState.speakingId === msgVoiceId && speechState.isSpeaking && !speechState.isPaused;
                const isPausedThisMsg =
                  speechState.speakingId === msgVoiceId && speechState.isSpeaking && speechState.isPaused;
                const isLoadingThisMsg =
                  speechState.speakingId === msgVoiceId && speechState.isLoading;

                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <div className="w-7 h-7 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                        N
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed space-y-2 ${
                        isUser
                          ? 'bg-amber-600 text-white rounded-tr-xs'
                          : 'bg-stone-100 text-stone-800 rounded-tl-xs border border-stone-200'
                      }`}
                    >
                      <p>{msg.text}</p>
                      {!isUser && (
                        <div className="pt-1 border-t border-stone-200/80 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => playCustomAudio(msg.text, msgVoiceId)}
                            className={`min-h-[32px] px-2.5 py-1 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1.5 transition cursor-pointer ${
                              isSpeakingThisMsg
                                ? 'bg-amber-500 text-stone-950 font-bold'
                                : isPausedThisMsg
                                ? 'bg-amber-300 text-stone-900'
                                : 'bg-white hover:bg-amber-50 text-stone-700 border border-stone-200'
                            }`}
                          >
                            {isLoadingThisMsg ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Cargando voz...</span>
                              </>
                            ) : isSpeakingThisMsg ? (
                              <>
                                <Pause className="w-3 h-3 fill-current" />
                                <span>Pausar voz</span>
                              </>
                            ) : isPausedThisMsg ? (
                              <>
                                <Play className="w-3 h-3 fill-current" />
                                <span>Reanudar voz</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3 h-3 text-amber-600" />
                                <span>Escuchar respuesta</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {isSendingChat && (
                <div className="flex items-center gap-2 text-xs text-stone-500">
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-700 flex items-center justify-center text-[10px] font-bold">
                    N
                  </div>
                  <span className="italic">Nguyễn está preparando tu respuesta...</span>
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
                placeholder="Escribe una pregunta para tu guía Nguyễn..."
                className="flex-1 min-h-[44px] px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white text-stone-900 placeholder:text-stone-400"
              />
              <button
                type="button"
                id="btn-send-tour-chat"
                onClick={() => handleSendChatMessage()}
                disabled={!chatInput.trim() || isSendingChat}
                className="min-h-[44px] px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shrink-0"
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
