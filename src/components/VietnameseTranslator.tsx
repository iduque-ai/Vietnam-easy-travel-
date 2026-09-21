import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Volume2,
  Sparkles,
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
  ShieldCheck,
  Languages,
  ExternalLink,
  Mic
} from 'lucide-react';
import { PhraseItem, DishItem } from '../types';
import { TRAVEL_PHRASES } from '../data/phrases';
import { VIETNAMESE_DISHES } from '../data/dishes';
import { speakVietnamese, getDefaultTranslatorSubTab, setDefaultTranslatorSubTab, openGoogleTranslateConversation } from '../utils/storage';
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
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter phrases
  const filteredPhrases = useMemo(() => {
    return TRAVEL_PHRASES.filter((p) => {
      const matchesCat = selectedCategory === 'todas' || p.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        p.spanish.toLowerCase().includes(q) ||
        p.vietnamese.toLowerCase().includes(q) ||
        p.phonetic.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [searchQuery, selectedCategory]);

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
    <div className="space-y-6 max-w-4xl w-full mx-auto min-w-0 overflow-x-hidden">
      {/* Sub tabs navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-stone-200/80 p-1.5 rounded-xl w-full">
          <button
            id="subtab-conversation"
            onClick={() => setSubTab('conversation')}
            className={`py-2 px-2.5 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer text-center ${
              subTab === 'conversation'
                ? 'bg-amber-500 text-stone-950 font-bold shadow-xs'
                : 'text-stone-700 hover:text-stone-900 hover:bg-stone-300/50'
            }`}
          >
            <Languages className="w-4 h-4 shrink-0" />
            <span className="truncate">Conversación & Traductor</span>
          </button>

          <button
            id="subtab-phrases"
            onClick={() => setSubTab('phrases')}
            className={`py-2 px-2.5 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer text-center ${
              subTab === 'phrases'
                ? 'bg-white text-stone-900 shadow-xs font-bold'
                : 'text-stone-700 hover:text-stone-900 hover:bg-stone-300/50'
            }`}
          >
            <BookOpen className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="truncate">Frases Esenciales</span>
          </button>

          <button
            id="subtab-food"
            onClick={() => setSubTab('food')}
            className={`py-2 px-2.5 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer text-center ${
              subTab === 'food'
                ? 'bg-white text-stone-900 shadow-xs font-bold'
                : 'text-stone-700 hover:text-stone-900 hover:bg-stone-300/50'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="truncate">Descifrador Menú</span>
          </button>

          <button
            id="subtab-allergy"
            onClick={() => setSubTab('allergy')}
            className={`py-2 px-2.5 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer text-center ${
              subTab === 'allergy'
                ? 'bg-white text-stone-900 shadow-xs font-bold'
                : 'text-stone-700 hover:text-stone-900 hover:bg-stone-300/50'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="truncate">Ficha Dietas</span>
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

      {/* 0. CONVERSATION MODE (ENGLISH <-> VIETNAMESE) */}
      {subTab === 'conversation' && (
        <ConversationMode isOnline={isOnline} />
      )}

      {/* 1. PHRASES TAB */}
      {subTab === 'phrases' && (
        <div className="space-y-4 w-full min-w-0">
          {/* Categories bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 text-xs no-scrollbar w-full max-w-full overscroll-x-contain touch-pan-x">
            {[
              { id: 'todas', label: 'Todas las frases', icon: BookOpen },
              { id: 'compras', label: 'Regateo & Compras', icon: ShoppingBag },
              { id: 'comida', label: 'Comida & Restaurante', icon: UtensilsCrossed },
              { id: 'transporte', label: 'Transporte & Grab', icon: Car },
              { id: 'cortesia', label: 'Cortesía & Saludos', icon: HeartHandshake },
              { id: 'emergencias', label: 'Emergencias & Salud', icon: ShieldAlert },
              { id: 'numeros', label: 'Números', icon: MessageSquareText },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  selectedCategory === cat.id
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Phrases list */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full min-w-0">
            {filteredPhrases.map((phrase) => (
              <div
                key={phrase.id}
                className="bg-white rounded-xl p-4 border border-stone-200 shadow-xs hover:border-amber-300 transition space-y-2 flex flex-col justify-between min-w-0 break-words"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                      {phrase.category}
                    </span>
                    {phrase.priority && (
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-medium shrink-0">
                        Imprescindible
                      </span>
                    )}
                  </div>

                  <h4 className="font-bold text-base text-stone-900 mt-1 break-words">
                    {phrase.spanish}
                  </h4>

                  <div className="bg-stone-50 rounded-lg p-2.5 mt-2 border border-stone-100 min-w-0">
                    <div className="text-lg font-bold text-amber-950 tracking-wide font-sans break-words">
                      {phrase.vietnamese}
                    </div>
                    <div className="text-xs text-stone-500 font-mono mt-0.5 break-words">
                      🗣️ Fonética: <strong className="text-stone-700">{phrase.phonetic}</strong>
                    </div>
                  </div>

                  {phrase.toneTip && (
                    <p className="text-[11px] text-stone-500 mt-2 leading-relaxed">
                      💡 {phrase.toneTip}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                  <button
                    onClick={() => handleSpeak(phrase.vietnamese)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-medium transition cursor-pointer border border-amber-200/60"
                    title="Reproducir pronunciación en vietnamita"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-amber-600" />
                    <span>Escuchar</span>
                  </button>

                  <button
                    onClick={() => handleCopy(phrase.vietnamese, phrase.id)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium transition cursor-pointer"
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
            ))}
          </div>

          {filteredPhrases.length === 0 && (
            <div className="text-center py-10 bg-white rounded-xl border border-stone-200 text-stone-500">
              No se encontraron frases con "{searchQuery}". Prueba con otra palabra clave.
            </div>
          )}
        </div>
      )}

      {/* 2. FOOD MENU DECODER TAB */}
      {subTab === 'food' && (
        <div className="space-y-4">
          <div className="bg-amber-50 rounded-xl p-3.5 border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5">
            <UtensilsCrossed className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold">Guía gastronómica callejera de Vietnam</strong>
              Descubre qué significa cada plato en los letreros de la calle, qué ingredientes contiene y cómo pedirlo a tu gusto.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full min-w-0">
            {filteredDishes.map((dish) => (
              <div
                key={dish.id}
                className="bg-white rounded-xl p-5 border border-stone-200 shadow-xs hover:border-amber-300 transition space-y-3 min-w-0 break-words"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                      {dish.category} • {dish.region}
                    </span>
                    <h3 className="text-xl font-bold text-stone-900 mt-1">
                      {dish.nameVi}
                    </h3>
                    <p className="text-xs font-medium text-stone-600">
                      {dish.nameEs}
                    </p>
                  </div>

                  <button
                    onClick={() => handleSpeak(dish.nameVi)}
                    className="p-2 rounded-lg bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-900 transition cursor-pointer"
                    title="Escuchar nombre del plato"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-xs text-stone-500 font-mono">
                  🗣️ Pronunciación: <strong className="text-stone-800">{dish.phonetic}</strong>
                </div>

                <p className="text-xs text-stone-600 leading-relaxed">
                  {dish.description}
                </p>

                {/* Ingredients tags */}
                <div className="flex flex-wrap gap-1">
                  {dish.ingredients.map((ing) => (
                    <span
                      key={ing}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-medium"
                    >
                      {ing}
                    </span>
                  ))}
                </div>

                {/* Ordering Tips */}
                <div className="bg-amber-50/50 rounded-lg p-2.5 border border-amber-100 text-xs space-y-1">
                  <div className="font-semibold text-amber-900 text-[11px]">
                    🍜 Cómo pedirlo:
                  </div>
                  <p className="text-[11px] text-stone-700">{dish.howToOrderTip}</p>
                </div>

                {/* Dietary Warning */}
                <div className="text-[11px] text-stone-500 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span>{dish.dietaryNotes}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. DIETARY / ALLERGY CARD GENERATOR */}
      {subTab === 'allergy' && (
        <AllergyCardsSection isOnline={isOnline} />
      )}
    </div>
  );
};
