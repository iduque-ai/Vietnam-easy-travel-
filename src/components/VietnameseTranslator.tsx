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
  Trash2
} from 'lucide-react';
import { PhraseItem, DishItem } from '../types';
import { TRAVEL_PHRASES } from '../data/phrases';
import { VIETNAMESE_DISHES } from '../data/dishes';
import {
  speakVietnamese,
  getDefaultTranslatorSubTab,
  getSavedCustomCards,
  deleteSavedCustomCard,
  CustomTranslationCard
} from '../utils/storage';
import { AllergyCardsSection } from './AllergyCardsSection';
import { ConversationMode } from './ConversationMode';

interface VietnameseTranslatorProps {
  isOnline: boolean;
  initialSubTab?: 'conversation' | 'phrases' | 'food' | 'allergy';
}

export const VietnameseTranslator: React.FC<VietnameseTranslatorProps> = ({ isOnline, initialSubTab }) => {
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
  const [selectedCategory, setSelectedCategory] = useState<string>('compras');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [customCards, setCustomCards] = useState<CustomTranslationCard[]>(() => getSavedCustomCards());

  // Reload custom cards when switching tabs or when window focuses
  useEffect(() => {
    const handleFocus = () => {
      setCustomCards(getSavedCustomCards());
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const handleDeleteCustom = (id: string) => {
    const updated = deleteSavedCustomCard(id);
    setCustomCards(updated);
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
    const matchedCustomCards: PhraseItem[] = customCards
      .filter((c) => {
        const targetCat = catMap[c.category] || 'cortesia';
        const matchesCat = isSearching || selectedCategory === 'guardadas' || targetCat === selectedCategory;
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
        toneTip: c.tip || 'Tarjeta personalizada guardada por ti',
        priority: true,
        isCustom: true,
      }));

    // Standard static phrases
    const matchedStaticPhrases = (selectedCategory === 'guardadas' && !isSearching)
      ? []
      : TRAVEL_PHRASES.filter((p) => {
          const matchesCat = isSearching || p.category === selectedCategory;
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

  const handleSpeak = (text: string) => {
    speakVietnamese(text);
  };

  return (
    <div className="space-y-6 max-w-4xl w-full mx-auto min-w-0">
      {/* Sub tabs navigation */}
      <div className="w-full">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-stone-100 p-1.5 rounded-2xl border border-stone-200">
          <button
            id="subtab-conversation"
            onClick={() => setSubTab('conversation')}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              subTab === 'conversation'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/70'
            }`}
          >
            <Languages className="w-4 h-4 shrink-0" />
            <span className="truncate">Conversación</span>
          </button>

          <button
            id="subtab-phrases"
            onClick={() => setSubTab('phrases')}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              subTab === 'phrases'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/70'
            }`}
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            <span className="truncate">Frases Clave</span>
          </button>

          <button
            id="subtab-food"
            onClick={() => setSubTab('food')}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              subTab === 'food'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/70'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4 shrink-0" />
            <span className="truncate">Menú & Platos</span>
          </button>

          <button
            id="subtab-allergy"
            onClick={() => setSubTab('allergy')}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              subTab === 'allergy'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/70'
            }`}
          >
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span className="truncate">Fichas Dietas</span>
          </button>
        </div>
      </div>

      {/* SEARCH BAR (For phrases & food) */}
      {(subTab === 'phrases' || subTab === 'food') && (
        <div className="relative w-full min-w-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder={
              subTab === 'phrases'
                ? 'Buscar frase (ej. "¿cuánto cuesta?", "sin azúcar", "cuenta", "hospital")...'
                : 'Buscar plato o ingrediente (ej. "Phở", "Bánh mì", "café", "cerdo", "vegetariano")...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 bg-white text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
          />
        </div>
      )}

      {/* 0. CONVERSATION MODE (BIDIRECTIONAL) */}
      {subTab === 'conversation' && (
        <ConversationMode isOnline={isOnline} />
      )}

      {/* 1. PHRASES TAB */}
      {subTab === 'phrases' && (
        <div className="space-y-4 w-full min-w-0">
          {/* Categories bar (without 'todas' clump, focused by situation) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 text-xs no-scrollbar w-full max-w-full overscroll-x-contain touch-pan-x">
            {[
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
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-medium transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  selectedCategory === cat.id
                    ? 'bg-stone-900 text-white font-bold shadow-xs'
                    : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Active Search Result Bar */}
          {searchQuery.trim() && (
            <div className="flex items-center justify-between bg-amber-50 border border-amber-200/80 rounded-xl px-3.5 py-2 text-xs">
              <span className="text-amber-950 font-medium">
                🔍 {filteredPhrases.length} {filteredPhrases.length === 1 ? 'frase encontrada' : 'frases encontradas'} para <strong className="text-stone-950 font-bold">"{searchQuery}"</strong> en todo el diccionario:
              </span>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-amber-800 hover:text-amber-950 font-bold text-xs underline cursor-pointer"
              >
                Limpiar búsqueda
              </button>
            </div>
          )}

          {/* Phrases list */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 w-full min-w-0">
            {filteredPhrases.map((phrase) => (
              <div
                key={phrase.id}
                className={`rounded-2xl p-4 sm:p-5 border transition flex flex-col justify-between min-w-0 break-words ${
                  phrase.isCustom
                    ? 'bg-amber-50/50 border-amber-300 shadow-xs hover:border-amber-400'
                    : 'bg-white border-stone-200 shadow-2xs hover:border-amber-400 hover:shadow-xs'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {phrase.isCustom ? (
                        <span className="text-[10px] text-amber-900 font-bold bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                          <span>Tarjeta personal</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                          {phrase.category}
                        </span>
                      )}
                    </div>
                    {phrase.priority && !phrase.isCustom && (
                      <span className="text-[10px] text-amber-800 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                        ★ Imprescindible
                      </span>
                    )}
                  </div>

                  <h4 className="font-bold text-base text-stone-900 leading-snug break-words">
                    {phrase.spanish}
                  </h4>

                  <div className="bg-amber-50/50 rounded-xl p-3 border border-amber-200/60 min-w-0 space-y-1">
                    <div className="text-lg font-black text-amber-950 font-sans tracking-wide break-words">
                      {phrase.vietnamese}
                    </div>
                    <div className="text-xs text-stone-600 font-mono break-words">
                      <span className="text-stone-400 font-sans">🗣️ Fonética: </span>
                      <strong className="text-amber-950 font-bold">{phrase.phonetic}</strong>
                    </div>
                  </div>

                  {phrase.toneTip && (
                    <p className="text-[11px] text-stone-500 leading-relaxed">
                      💡 {phrase.toneTip}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-stone-100">
                  <div>
                    {phrase.isCustom && (
                      <button
                        onClick={() => handleDeleteCustom(phrase.id)}
                        className="flex items-center gap-1 text-[11px] text-stone-400 hover:text-rose-600 transition cursor-pointer p-1 rounded-lg hover:bg-rose-50"
                        title="Eliminar esta tarjeta personalizada"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSpeak(phrase.vietnamese)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-950 text-xs font-semibold transition cursor-pointer border border-amber-200/70"
                      title="Reproducir pronunciación en vietnamita"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-amber-700" />
                      <span>Escuchar</span>
                    </button>

                    <button
                      onClick={() => handleCopy(phrase.vietnamese, phrase.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition cursor-pointer"
                      title="Copiar texto en vietnamita"
                    >
                      {copiedId === phrase.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Copiado</span>
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
            ))}
          </div>

          {filteredPhrases.length === 0 && (
            <div className="text-center py-10 px-4 bg-white rounded-2xl border border-stone-200 text-stone-500 text-sm space-y-3">
              <p className="font-semibold text-stone-800">
                No se encontraron frases que coincidan con "{searchQuery}".
              </p>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                Puedes escribir la frase libremente en el <strong>Traductor Conversación</strong> para traducirla al instante con IA y escuchar la voz nativa.
              </p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-3.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition cursor-pointer"
                >
                  Limpiar búsqueda
                </button>
                <button
                  type="button"
                  onClick={() => setSubTab('conversation')}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition cursor-pointer"
                >
                  Ir al Traductor ➔
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. FOOD MENU DECODER TAB */}
      {subTab === 'food' && (
        <div className="space-y-4">
          <div className="bg-amber-50/80 rounded-2xl p-4 border border-amber-200 text-xs text-amber-950 flex items-start gap-3">
            <UtensilsCrossed className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <strong className="block font-bold text-sm text-stone-900">Guía gastronómica callejera de Vietnam</strong>
              <p className="text-stone-600">
                Descubre qué significa cada plato en los letreros de la calle, qué ingredientes contiene y cómo pedirlo a tu gusto.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full min-w-0">
            {filteredDishes.map((dish) => (
              <div
                key={dish.id}
                className="bg-white rounded-2xl p-5 border border-stone-200 shadow-2xs hover:border-amber-400 hover:shadow-xs transition flex flex-col justify-between min-w-0 break-words"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                        {dish.category} · {dish.region}
                      </div>
                      <h3 className="text-xl font-black text-stone-900 mt-1">
                        {dish.nameVi}
                      </h3>
                      <p className="text-xs font-medium text-stone-600">
                        {dish.nameEs}
                      </p>
                    </div>

                    <button
                      onClick={() => handleSpeak(dish.nameVi)}
                      className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200/70 text-amber-900 transition cursor-pointer shrink-0"
                      title="Escuchar nombre del plato"
                    >
                      <Volume2 className="w-4 h-4 text-amber-700" />
                    </button>
                  </div>

                  <div className="text-xs text-stone-600 font-mono">
                    <span className="text-stone-400 font-sans">🗣️ Pronunciación: </span>
                    <strong className="text-amber-950 font-bold">{dish.phonetic}</strong>
                  </div>

                  <p className="text-xs text-stone-600 leading-relaxed">
                    {dish.description}
                  </p>

                  {/* Ingredients: Clean unboxed typographic list with middle dots */}
                  <div className="text-xs text-stone-500">
                    <strong className="text-stone-700 font-semibold">Ingredientes: </strong>
                    <span>{dish.ingredients.join(' · ')}</span>
                  </div>

                  {/* How to order */}
                  <div className="bg-amber-50/60 rounded-xl p-3 border border-amber-200/60 text-xs space-y-1">
                    <div className="font-bold text-amber-950 text-[11px]">
                      🍜 Cómo pedirlo:
                    </div>
                    <p className="text-[11px] text-stone-700 leading-relaxed">{dish.howToOrderTip}</p>
                  </div>
                </div>

                {/* Dietary Warning */}
                <div className="mt-3 pt-3 border-t border-stone-100 text-[11px] text-stone-500 flex items-center gap-1.5">
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
