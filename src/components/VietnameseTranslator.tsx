import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Volume2,
  UtensilsCrossed,
  AlertCircle,
  Check,
  Copy,
  BookOpen,
  MessageSquareText,
  ShieldAlert,
  HeartHandshake,
  Car,
  ShoppingBag,
  Languages,
  Star,
  Trash2,
  X,
  Sliders,
  Sparkles,
  MessageCircle,
  Zap,
} from 'lucide-react';
import { PhraseItem, DishItem } from '../types';
import { TRAVEL_PHRASES } from '../data/phrases';
import { VIETNAMESE_DISHES } from '../data/dishes';
import {
  speakVietnamese,
  getDefaultTranslatorSubTab,
  getSavedCustomCards,
  saveCustomCard,
  deleteSavedCustomCard,
  CustomTranslationCard,
  subscribeSpeechState,
  stopAllSpeech,
  getSavedSpeechSettings,
  subscribeSpeechSettings,
  SpeechSettings,
} from '../utils/storage';
import { AllergyCardsSection } from './AllergyCardsSection';
import { ConversationMode, ConversationTargetPhrase } from './ConversationMode';
import { AudioWaveIndicator } from './AudioWaveIndicator';

interface VietnameseTranslatorProps {
  isOnline: boolean;
  initialSubTab?: 'conversation' | 'phrases' | 'food' | 'allergy';
  onOpenVoiceSettings?: () => void;
}

export const VietnameseTranslator: React.FC<VietnameseTranslatorProps> = ({
  isOnline,
  initialSubTab,
  onOpenVoiceSettings,
}) => {
  const [subTab, setSubTab] = useState<'conversation' | 'phrases' | 'food' | 'allergy'>(() => {
    if (initialSubTab) return initialSubTab;
    if (typeof window !== 'undefined') {
      if (window.location.hash.includes('conversation') || window.location.search.includes('conversation')) {
        return 'conversation';
      }
    }
    const saved = getDefaultTranslatorSubTab();
    if (saved === 'conversation' || saved === 'phrases' || saved === 'food' || saved === 'allergy') {
      return saved as any;
    }
    return 'conversation';
  });

  useEffect(() => {
    if (initialSubTab) {
      setSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('frecuentes');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [customCards, setCustomCards] = useState<CustomTranslationCard[]>(() => getSavedCustomCards());
  const [speechSettings, setSpeechSettings] = useState<SpeechSettings>(() => getSavedSpeechSettings());
  const [targetConversationPhrase, setTargetConversationPhrase] = useState<ConversationTargetPhrase | null>(null);
  const [speakingState, setSpeakingState] = useState<{
    isSpeaking: boolean;
    speakingId: string | null;
  }>({ isSpeaking: false, speakingId: null });

  // Subscribe to speech state changes
  useEffect(() => {
    const unsub = subscribeSpeechState((state) => {
      setSpeakingState({
        isSpeaking: state.isSpeaking,
        speakingId: state.speakingId,
      });
    });
    return unsub;
  }, []);

  // Subscribe to speech settings changes
  useEffect(() => {
    const unsub = subscribeSpeechSettings((s) => {
      setSpeechSettings(s);
    });
    return unsub;
  }, []);

  // Reload custom cards when switching tabs or when window focuses
  useEffect(() => {
    const handleFocus = () => {
      setCustomCards(getSavedCustomCards());
      setSpeechSettings(getSavedSpeechSettings());
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const handleDeleteCustom = (id: string) => {
    const updated = deleteSavedCustomCard(id);
    setCustomCards(updated);
  };

  const handleToggleFavoritePhrase = (phrase: PhraseItem) => {
    const existing = customCards.find(
      (c) =>
        c.vi.trim().toLowerCase() === phrase.vietnamese.trim().toLowerCase() ||
        c.es.trim().toLowerCase() === phrase.spanish.trim().toLowerCase()
    );

    if (existing) {
      const updated = deleteSavedCustomCard(existing.id);
      setCustomCards(updated);
    } else {
      const catMap: Record<string, 'precios' | 'comida' | 'transporte' | 'cortesia' | 'emergencia'> = {
        compras: 'precios',
        comida: 'comida',
        transporte: 'transporte',
        cortesia: 'cortesia',
        emergencias: 'emergencia',
        numeros: 'precios',
      };
      const newCard: CustomTranslationCard = {
        id: `custom-fav-${phrase.id || Date.now()}`,
        label: phrase.spanish,
        category: catMap[phrase.category] || 'cortesia',
        en: phrase.spanish,
        es: phrase.spanish,
        vi: phrase.vietnamese,
        phonetic: phrase.phonetic || '',
        tip: phrase.toneTip || 'Guardada desde el Diccionario',
        createdAt: Date.now(),
      };
      const updated = saveCustomCard(newCard);
      setCustomCards(updated);
    }
  };

  const handleSendToConversation = (phrase: {
    spanish: string;
    vietnamese: string;
    phonetic?: string;
    toneTip?: string;
  }) => {
    setTargetConversationPhrase({
      es: phrase.spanish,
      vi: phrase.vietnamese,
      phonetic: phrase.phonetic,
      tip: phrase.toneTip,
    });
    setSubTab('conversation');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filter phrases with custom cards sorted first (searches globally when user types in search bar)
  const filteredPhrases = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const isSearching = Boolean(q);

    // Map custom card category to phrase category
    const catMap: Record<string, string> = {
      precios: 'compras',
      comida: 'comida',
      transporte: 'transporte',
      cortesia: 'cortesia',
      emergencia: 'emergencias',
    };

    // Custom cards
    const matchedCustomCards: (PhraseItem & { isCustom?: boolean })[] = customCards
      .filter((c) => {
        const targetCat = catMap[c.category] || 'cortesia';
        const matchesCat = isSearching || selectedCategory === 'guardadas' || selectedCategory === 'frecuentes' || targetCat === selectedCategory;
        const matchesQuery =
          !q ||
          c.es.toLowerCase().includes(q) ||
          c.vi.toLowerCase().includes(q) ||
          c.phonetic.toLowerCase().includes(q) ||
          (c.tip && c.tip.toLowerCase().includes(q));
        return matchesCat && matchesQuery;
      })
      .map((c) => ({
        id: c.id,
        category: (catMap[c.category] as any) || 'cortesia',
        spanish: c.es,
        vietnamese: c.vi,
        phonetic: c.phonetic,
        toneTip: c.tip || 'Tarjeta guardada en tus frases',
        priority: true,
        isCustom: true,
      }));

    // Standard static phrases
    const matchedStaticPhrases = (selectedCategory === 'guardadas' && !isSearching)
      ? []
      : TRAVEL_PHRASES.filter((p) => {
          const matchesCat = isSearching || (selectedCategory === 'frecuentes' ? p.priority : p.category === selectedCategory);
          const matchesQuery =
            !q ||
            p.spanish.toLowerCase().includes(q) ||
            p.vietnamese.toLowerCase().includes(q) ||
            p.phonetic.toLowerCase().includes(q) ||
            (p.toneTip && p.toneTip.toLowerCase().includes(q));
          return matchesCat && matchesQuery;
        });

    // Custom cards always appear FIRST!
    return [...matchedCustomCards, ...matchedStaticPhrases];
  }, [searchQuery, selectedCategory, customCards]);

  // Filter dishes
  const filteredDishes = useMemo(() => {
    return VIETNAMESE_DISHES.filter((d) => {
      const q = searchQuery.toLowerCase().trim();
      return (
        !q ||
        d.nameVi.toLowerCase().includes(q) ||
        d.nameEs.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        d.ingredients.some((i) => i.toLowerCase().includes(q))
      );
    });
  }, [searchQuery]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSpeak = (text: string, id?: string) => {
    const playId = id || `phrase-${text.slice(0, 25)}`;
    if (speakingState.isSpeaking && speakingState.speakingId === playId) {
      stopAllSpeech();
      return;
    }
    speakVietnamese(text, playId);
  };

  return (
    <div className="space-y-6 max-w-4xl w-full mx-auto min-w-0">
      {/* SUB-TABS NAVIGATION */}
      <div className="w-full space-y-2.5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-stone-200/60 p-1.5 rounded-2xl border border-stone-300/70 shadow-2xs">
          <button
            id="subtab-conversation"
            onClick={() => setSubTab('conversation')}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              subTab === 'conversation'
                ? 'bg-[#181614] text-amber-300 shadow-xs border border-stone-800'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
            }`}
            title="Traducción bidireccional y diálogo en vivo"
          >
            <Languages className="w-4 h-4 shrink-0" />
            <span className="truncate">Diálogo en Vivo</span>
          </button>

          <button
            id="subtab-phrases"
            onClick={() => setSubTab('phrases')}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              subTab === 'phrases'
                ? 'bg-[#181614] text-amber-300 shadow-xs border border-stone-800'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
            }`}
            title="Frases útiles y pronunciación offline"
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            <span className="truncate">Frases Útiles</span>
          </button>

          <button
            id="subtab-food"
            onClick={() => setSubTab('food')}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              subTab === 'food'
                ? 'bg-[#181614] text-amber-300 shadow-xs border border-stone-800'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
            }`}
            title="Platos típicos e ingredientes"
          >
            <UtensilsCrossed className="w-4 h-4 shrink-0" />
            <span className="truncate">Platos & Menú</span>
          </button>

          <button
            id="subtab-allergy"
            onClick={() => setSubTab('allergy')}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              subTab === 'allergy'
                ? 'bg-[#181614] text-amber-300 shadow-xs border border-stone-800'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
            }`}
            title="Tarjetas médicas y alergias"
          >
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span className="truncate">Alergias & Dietas</span>
          </button>
        </div>
      </div>

      {/* 0. TRADUCTOR EN VIVO (CONVERSATION MODE) */}
      {subTab === 'conversation' && (
        <ConversationMode
          isOnline={isOnline}
          targetPhrase={targetConversationPhrase}
          onClearTargetPhrase={() => setTargetConversationPhrase(null)}
          onNavigateTab={(tab) => setSubTab(tab)}
          onOpenVoiceSettings={onOpenVoiceSettings}
        />
      )}

      {/* 1. GUÍA & DICCIONARIO TAB */}
      {subTab === 'phrases' && (
        <div className="space-y-3.5 w-full min-w-0">
          {/* Header context badge */}
          <div className="bg-gradient-to-r from-[#181614] via-[#201d19] to-[#181614] text-stone-100 rounded-2xl p-3.5 sm:px-5 sm:py-4 border border-amber-500/20 shadow-[0_4px_20px_rgba(0,0,0,0.25)] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-sm sm:text-base text-white tracking-tight">Diccionario de Frases</h3>
                <p className="text-[11px] sm:text-xs text-stone-400 mt-0.5">
                  Pronunciación fonética y consejos prácticos para viajar por Vietnam
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onOpenVoiceSettings && (
                <button
                  type="button"
                  onClick={onOpenVoiceSettings}
                  className="px-3 py-1.5 rounded-xl bg-stone-900/90 hover:bg-stone-800 text-amber-300 hover:text-amber-200 border border-stone-700/80 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-2xs"
                  title="Ajuste de voz y pronunciación"
                >
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  <span>Voz {speechSettings.gender === 'female' ? '👩' : '👨'} · {speechSettings.speedPreset === 'slow' ? '0.8x' : speechSettings.speedPreset === 'fast' ? '1.1x' : '0.95x'}</span>
                </button>
              )}
              <span className="bg-stone-900/90 px-2.5 py-1.5 rounded-xl border border-stone-800 font-medium text-xs text-stone-300 font-mono hidden sm:inline-flex items-center shadow-2xs">
                {filteredPhrases.length} frases
              </span>
            </div>
          </div>

          {/* Search Bar placed directly under dark header */}
          <div className="relative w-full min-w-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar frase (ej. cuenta, cuánto vale, gracias, baño)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-stone-300/80 bg-white text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-2xs transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-0.5 cursor-pointer"
                title="Borrar búsqueda"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Categories bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 text-xs no-scrollbar w-full max-w-full overscroll-x-contain touch-pan-x">
            {[
              { id: 'frecuentes', label: '⚡ Más Usadas', icon: Zap },
              { id: 'compras', label: '💰 Regateo & Compras', icon: ShoppingBag },
              { id: 'comida', label: '🍜 Comida & Restaurante', icon: UtensilsCrossed },
              { id: 'transporte', label: '🚗 Transporte & Grab', icon: Car },
              { id: 'cortesia', label: '💬 Cortesía & Saludos', icon: HeartHandshake },
              { id: 'emergencias', label: '🚨 Emergencias & Salud', icon: ShieldAlert },
              { id: 'numeros', label: '🔢 Números', icon: MessageSquareText },
              ...(customCards.length > 0
                ? [{ id: 'guardadas', label: `⭐ Guardadas (${customCards.length})`, icon: Star }]
                : []),
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-2 rounded-xl whitespace-nowrap text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  selectedCategory === cat.id
                    ? 'bg-[#181614] text-amber-300 font-bold shadow-xs border border-stone-800'
                    : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200/90'
                }`}
              >
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Active Search Result Bar */}
          {searchQuery.trim() && (
            <div className="flex items-center justify-between bg-amber-50/80 border border-amber-200/80 rounded-xl px-3 py-1.5 text-xs">
              <span className="text-amber-950 font-medium">
                {filteredPhrases.length} {filteredPhrases.length === 1 ? 'resultado' : 'resultados'} para <strong className="text-stone-900 font-semibold">"{searchQuery}"</strong>
              </span>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-amber-800 hover:text-amber-950 font-bold text-xs underline cursor-pointer"
              >
                ✕ Limpiar
              </button>
            </div>
          )}

          {/* Phrases list */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full min-w-0">
            {filteredPhrases.map((phrase) => {
              const isSaved = customCards.some(
                (c) =>
                  c.vi.trim().toLowerCase() === phrase.vietnamese.trim().toLowerCase() ||
                  c.es.trim().toLowerCase() === phrase.spanish.trim().toLowerCase()
              );

              return (
                <div
                  key={phrase.id}
                  className={`rounded-3xl p-5 sm:p-6 border transition-all flex flex-col justify-between min-w-0 break-words ${
                    phrase.isCustom
                      ? 'bg-amber-50/40 border-amber-300 shadow-sm hover:border-amber-400 hover:shadow-md'
                      : 'bg-white border-stone-200/90 shadow-[0_2px_16px_rgba(28,25,23,0.03)] hover:border-amber-400/80 hover:shadow-md'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {phrase.isCustom ? (
                          <span className="text-[10px] text-amber-900 font-bold bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                            <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                            <span>Tarjeta personal</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                            {phrase.category}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {phrase.priority && !phrase.isCustom && (
                          <span className="text-[10px] text-amber-800 font-bold bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full shadow-2xs">
                            ★ Imprescindible
                          </span>
                        )}

                        {/* Favorite star toggle button */}
                        <button
                          type="button"
                          onClick={() => handleToggleFavoritePhrase(phrase)}
                          className={`p-1.5 rounded-xl transition cursor-pointer ${
                            isSaved
                              ? 'bg-amber-100 text-amber-900 font-bold'
                              : 'text-stone-400 hover:text-amber-600 hover:bg-stone-100'
                          }`}
                          title={isSaved ? 'Guardada en tus atajos' : 'Guardar en tus atajos'}
                        >
                          <Star className={`w-3.5 h-3.5 ${isSaved ? 'fill-amber-500 text-amber-500' : ''}`} />
                        </button>
                      </div>
                    </div>

                    <h4 className="font-serif font-bold text-base sm:text-lg text-stone-900 leading-snug break-words">
                      {phrase.spanish}
                    </h4>

                    <div className="bg-gradient-to-br from-amber-500/[0.08] to-amber-500/[0.02] rounded-2xl p-3.5 border border-amber-200/70 min-w-0 space-y-1.5 shadow-2xs">
                      <div className="text-xl font-black text-amber-950 font-sans tracking-wide break-words">
                        {phrase.vietnamese}
                      </div>
                      <div className="text-xs text-stone-600 font-mono break-words flex items-center gap-1.5">
                        <span className="text-stone-400 font-sans">🗣️ Fonética:</span>
                        <strong className="text-amber-950 font-bold">{phrase.phonetic}</strong>
                      </div>
                    </div>

                    {phrase.toneTip && (
                      <p className="text-[11px] text-stone-500 leading-relaxed bg-stone-50/70 p-2.5 rounded-xl border border-stone-100">
                        💡 {phrase.toneTip}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-stone-100 flex-wrap">
                    {/* Bridge action: Send to live conversation */}
                    <button
                      type="button"
                      onClick={() => handleSendToConversation(phrase)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-950 border border-amber-500/30 text-xs font-bold transition cursor-pointer active:scale-95"
                      title="Cargar en el Diálogo en Vivo para mostrarla en grande o hablarla"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />
                      <span>Decir ahora</span>
                    </button>

                    <div className="flex items-center gap-2 ml-auto">
                      {phrase.isCustom && (
                        <button
                          onClick={() => handleDeleteCustom(phrase.id)}
                          className="flex items-center gap-1 text-[11px] text-stone-400 hover:text-rose-600 transition cursor-pointer p-1.5 rounded-xl hover:bg-rose-50"
                          title="Eliminar esta tarjeta personalizada"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => handleSpeak(phrase.vietnamese, `phrase-${phrase.id}`)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border shadow-2xs ${
                          speakingState.isSpeaking && speakingState.speakingId === `phrase-${phrase.id}`
                            ? 'bg-amber-400 text-stone-950 font-bold border-amber-300 ring-2 ring-amber-400/30'
                            : 'bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-950 border-amber-200/70'
                        }`}
                        title="Reproducir pronunciación en vietnamita (Voz natural suave)"
                      >
                        <AudioWaveIndicator
                          isPlaying={speakingState.isSpeaking && speakingState.speakingId === `phrase-${phrase.id}`}
                          size="sm"
                          colorClass="text-amber-950"
                        />
                        <span>
                          {speakingState.isSpeaking && speakingState.speakingId === `phrase-${phrase.id}`
                            ? 'Reproduciendo...'
                            : 'Escuchar'}
                        </span>
                      </button>

                      <button
                        onClick={() => handleCopy(phrase.vietnamese, phrase.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-700 text-xs font-semibold transition cursor-pointer"
                        title="Copiar texto en vietnamita"
                      >
                        {copiedId === phrase.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                            <span className="text-emerald-700 font-bold">Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-stone-500" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredPhrases.length === 0 && (
            <div className="text-center py-10 px-4 bg-white rounded-3xl border border-stone-200 text-stone-500 text-sm space-y-3">
              <p className="font-semibold text-stone-800">
                No se encontraron frases que coincidan con "{searchQuery}".
              </p>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                Puedes escribir la frase libremente en el <strong>Traductor en Vivo</strong> para traducirla al instante con IA y escuchar la voz nativa.
              </p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition cursor-pointer"
                >
                  Limpiar búsqueda
                </button>
                <button
                  type="button"
                  onClick={() => setSubTab('conversation')}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  Ir al Traductor en Vivo ➔
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. FOOD MENU DECODER TAB */}
      {subTab === 'food' && (
        <div className="space-y-4">
          {/* Top Status Bar: Dark Noir with Gold Trim */}
          <div className="bg-gradient-to-r from-[#181614] via-[#201d19] to-[#181614] text-stone-100 rounded-2xl p-3.5 sm:px-5 sm:py-4 border border-amber-500/20 shadow-[0_4px_20px_rgba(0,0,0,0.25)] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
                <UtensilsCrossed className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-sm sm:text-base text-white tracking-tight">Platos & Comida Callejera</h3>
                <p className="text-[11px] sm:text-xs text-stone-400 mt-0.5">
                  Ingredientes, pronunciación y cómo pedir cada plato como un local
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onOpenVoiceSettings && (
                <button
                  type="button"
                  onClick={onOpenVoiceSettings}
                  className="px-3 py-1.5 rounded-xl bg-stone-900/90 hover:bg-stone-800 text-amber-300 hover:text-amber-200 border border-stone-700/80 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-2xs"
                  title="Ajuste de voz y pronunciación"
                >
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  <span>Voz {speechSettings.gender === 'female' ? '👩' : '👨'} · {speechSettings.speedPreset === 'slow' ? '0.8x' : speechSettings.speedPreset === 'fast' ? '1.1x' : '0.95x'}</span>
                </button>
              )}
              <span className="bg-stone-900/90 px-2.5 py-1.5 rounded-xl border border-stone-800 font-medium text-xs text-stone-300 font-mono hidden sm:inline-flex items-center shadow-2xs">
                {filteredDishes.length} platos
              </span>
            </div>
          </div>

          {/* Search Bar placed directly under dark header */}
          <div className="relative w-full min-w-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar plato o ingrediente (ej. Phở, Bánh mì, café, ternera)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-stone-300/80 bg-white text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-2xs transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-0.5 cursor-pointer"
                title="Borrar búsqueda"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full min-w-0">
            {filteredDishes.map((dish) => (
              <div
                key={dish.id}
                className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200/90 shadow-[0_2px_16px_rgba(28,25,23,0.03)] hover:border-amber-400/80 hover:shadow-md transition-all flex flex-col justify-between min-w-0 break-words"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                        {dish.category} · {dish.region}
                      </div>
                      <h3 className="text-xl font-black text-stone-900 mt-1 font-serif">
                        {dish.nameVi}
                      </h3>
                      <p className="text-xs font-semibold text-stone-600 mt-0.5">
                        {dish.nameEs}
                      </p>
                    </div>

                    <button
                      onClick={() => handleSpeak(dish.nameVi, `dish-${dish.id}`)}
                      className={`p-2.5 rounded-xl border transition cursor-pointer shrink-0 active:scale-95 shadow-2xs flex items-center justify-center ${
                        speakingState.isSpeaking && speakingState.speakingId === `dish-${dish.id}`
                          ? 'bg-amber-400 text-stone-950 border-amber-300 ring-2 ring-amber-400/30'
                          : 'bg-amber-50 hover:bg-amber-100 border-amber-200/70 text-amber-900'
                      }`}
                      title="Escuchar pronunciación suave del plato"
                    >
                      <AudioWaveIndicator
                        isPlaying={speakingState.isSpeaking && speakingState.speakingId === `dish-${dish.id}`}
                        size="md"
                        colorClass="text-amber-950"
                      />
                    </button>
                  </div>

                  <div className="text-xs text-stone-600 font-mono bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-100">
                    <span className="text-stone-400 font-sans">🗣️ Pronunciación: </span>
                    <strong className="text-amber-950 font-bold">{dish.phonetic}</strong>
                  </div>

                  <p className="text-xs text-stone-600 leading-relaxed">
                    {dish.description}
                  </p>

                  {/* Ingredients: Clean unboxed typographic list with middle dots */}
                  <div className="text-xs text-stone-500 pt-1">
                    <strong className="text-stone-700 font-semibold">Ingredientes: </strong>
                    <span>{dish.ingredients.join(' · ')}</span>
                  </div>

                  {/* How to order */}
                  <div className="bg-amber-50/50 rounded-2xl p-3.5 border border-amber-200/60 text-xs space-y-1 shadow-2xs">
                    <div className="font-bold text-amber-950 text-[11px]">
                      🍜 Cómo pedirlo:
                    </div>
                    <p className="text-[11px] text-stone-700 leading-relaxed">{dish.howToOrderTip}</p>
                  </div>
                </div>

                {/* Dietary Warning */}
                <div className="mt-3.5 pt-3 border-t border-stone-100 text-[11px] text-stone-500 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span>{dish.dietaryNotes}</span>
                </div>
              </div>
            ))}
          </div>

          {filteredDishes.length === 0 && (
            <div className="text-center py-10 bg-white rounded-2xl border border-stone-200 text-stone-500 text-sm">
              No se encontraron platos con "{searchQuery}". Prueba buscando "phở", "café", "arroz" o "cerdo".
            </div>
          )}
        </div>
      )}

      {/* 4. DIETARY / ALLERGY CARD GENERATOR */}
      {subTab === 'allergy' && (
        <AllergyCardsSection isOnline={isOnline} />
      )}
    </div>
  );
};
