import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, ShieldCheck, Plus, Trash2, Volume2, Copy, Check, 
  Maximize2, Minimize2, X, Sparkles, RefreshCw, AlertTriangle, 
  CheckCircle2, User, Layers, Info, Search, HeartPulse, Edit3
} from 'lucide-react';
import { AllergyCardData } from '../types';
import { 
  speakVietnamese, 
  getSavedAllergyCards, 
  saveSingleAllergyCard, 
  deleteSavedAllergyCard,
  DEFAULT_ALLERGY_CARDS 
} from '../utils/storage';

interface AllergyCardsSectionProps {
  isOnline: boolean;
}

export interface PresetRestriction {
  id: string;
  emoji: string;
  label: string;
  subVi: string;
  category: 'frecuentes' | 'marisco_pescado' | 'lacteos_huevos' | 'especias_hierbas' | 'granos_gluten' | 'carnes' | 'dietas';
}

// Clean helper to strip any "Sin " or "sin " prefix
export function cleanAllergenLabel(raw: string): string {
  return raw
    .trim()
    .replace(/^(sin|no)\s+/i, '')
    .trim();
}

// Preset allergens library
export const PRESET_RESTRICTIONS: PresetRestriction[] = [
  // 1. Frecuentes
  { id: 'peanuts', emoji: '🥜', label: 'Cacahuetes y frutos secos', subVi: 'Đậu phộng / Lạc & các loại hạt', category: 'frecuentes' },
  { id: 'seafood', emoji: '🦐', label: 'Marisco, gambas y calamar', subVi: 'Hải sản: tôm, cua, mực, nghêu', category: 'frecuentes' },
  { id: 'gluten', emoji: '🌾', label: 'Gluten / Trigo / Celíaco', subVi: 'Gluten / Bột mì, bánh mì', category: 'frecuentes' },
  { id: 'lactose', emoji: '🥛', label: 'Lactosa / Leche de vaca', subVi: 'Sữa bò, sữa đặc Ông Thọ', category: 'frecuentes' },
  { id: 'egg', emoji: '🥚', label: 'Huevo (gallina, pato)', subVi: 'Trứng gà, trứng vịt', category: 'frecuentes' },
  { id: 'soy', emoji: '🫘', label: 'Soja / Salsa de soja', subVi: 'Đậu nành / Xì dầu, nước tương', category: 'frecuentes' },
  { id: 'sesame', emoji: '🌱', label: 'Sésamo y aceite de sésamo', subVi: 'Hạt mè / Vừng & dầu mè', category: 'frecuentes' },

  // 2. Marisco y Pescado
  { id: 'fish_sauce', emoji: '🐟', label: 'Salsa de pescado tradicional', subVi: 'Nước mắm cá truyền thống', category: 'marisco_pescado' },
  { id: 'fish', emoji: '🐠', label: 'Pescado en caldo o fresco', subVi: 'Cá tươi & nước luộc cá', category: 'marisco_pescado' },
  { id: 'shrimp_paste', emoji: '🟣', label: 'Pasta de gamba fermentada (Mắm tôm)', subVi: 'Mắm tôm & mắm ruốc', category: 'marisco_pescado' },

  // 3. Hierbas y Especias
  { id: 'cilantro', emoji: '🌿', label: 'Cilantro / Hierbas aromáticas', subVi: 'Rau mùi / Ngò rí / Rau thơm', category: 'especias_hierbas' },
  { id: 'msg', emoji: '🧂', label: 'Glutamato / MSG (Bột ngọt)', subVi: 'Bột ngọt / Mì chính (Ajinomoto)', category: 'especias_hierbas' },
  { id: 'spicy', emoji: '🌶️', label: 'Picante / Guindilla fresca', subVi: 'Ớt tươi, tương ớt cay', category: 'especias_hierbas' },
  { id: 'garlic_onion', emoji: '🧄', label: 'Ajo y cebolleta', subVi: 'Tỏi & hành lá, hành phi', category: 'especias_hierbas' },

  // 4. Lácteos y Huevos
  { id: 'condensed_milk', emoji: '🥫', label: 'Leche condensada (Café vietnamita)', subVi: 'Sữa đặc Ông Thọ pha cà phê', category: 'lacteos_huevos' },
  { id: 'butter', emoji: '🧈', label: 'Mantequilla y margarina', subVi: 'Bơ thực vật, sốt bơ trứng', category: 'lacteos_huevos' },

  // 5. Carnes
  { id: 'pork', emoji: '🥩', label: 'Carne de cerdo y manteca', subVi: 'Thịt heo (lợn), mỡ heo', category: 'carnes' },
  { id: 'beef', emoji: '🐂', label: 'Carne de ternera y caldos de res', subVi: 'Thịt bò & nước dùng ninh xương', category: 'carnes' },
  { id: 'chicken', emoji: '🍗', label: 'Pollo y caldo de ave', subVi: 'Thịt gà & nước luộc gà', category: 'carnes' },

  // 6. Dietas
  { id: 'vegetarian', emoji: '🥗', label: 'Vegetariano (Ăn chay)', subVi: 'Ăn chay không thịt cá mỡ', category: 'dietas' },
  { id: 'vegan', emoji: '🌱', label: 'Vegano (Thuần chay)', subVi: 'Thuần chay 100%, không trứng sữa', category: 'dietas' },
  { id: 'celiac_strict', emoji: '🩺', label: 'Celíaco estricto (Sin trazas)', subVi: 'Dị ứng Gluten nghiêm ngặt', category: 'dietas' },
];

// Offline fallback card generator
function generateClientFallbackCard(rawConditions: string[], personName?: string): AllergyCardData {
  const cleanList = rawConditions.length > 0 
    ? rawConditions.map(cleanAllergenLabel) 
    : ['Cacahuetes y frutos secos'];
  
  const fullLower = cleanList.join(' ').toLowerCase();
  const forbidden: string[] = [];
  const safeFoods: string[] = [];
  const vietnameseConditions: string[] = [];

  if (fullLower.includes('cacahuete') || fullLower.includes('fruto') || fullLower.includes('anacardo') || fullLower.includes('lạc') || fullLower.includes('đậu phộng')) {
    vietnameseConditions.push('ĐẬU PHỘNG / LẠC & CÁC LOẠI HẠT');
    forbidden.push('Đậu phộng / Lạc (Cacahuetes)', 'Dầu lạc (Aceite)', 'Hạt điều (Anacardos)');
    safeFoods.push('Cơm trắng (Arroz blanco)', 'Trứng chiên', 'Thịt luộc');
  }

  if (fullLower.includes('marisco') || fullLower.includes('gamba') || fullLower.includes('calamar') || fullLower.includes('tôm') || fullLower.includes('mực')) {
    vietnameseConditions.push('HẢI SẢN (TÔM, CUA, MỰC, SÒ)');
    forbidden.push('Tôm (Gambas)', 'Mực (Calamar)', 'Cua (Cangrejo)', 'Nước dùng ninh hải sản');
    safeFoods.push('Thịt gà (Pollo)', 'Thịt bò (Ternera)', 'Cơm trắng', 'Rau luộc');
  }

  if (fullLower.includes('pescado') || fullLower.includes('nước mắm') || fullLower.includes('cá')) {
    vietnameseConditions.push('CÁ & NƯỚC MẮM TRUYỀN THỐNG');
    forbidden.push('Nước mắm cá (Salsa pescado)', 'Cá tươi', 'Mắm tôm');
    safeFoods.push('Xì dầu / Nước tương (Soja)', 'Muối tiêu chanh', 'Đậu hũ chiên');
  }

  if (fullLower.includes('gluten') || fullLower.includes('trigo') || fullLower.includes('celíac') || fullLower.includes('pan') || fullLower.includes('bột mì')) {
    vietnameseConditions.push('GLUTEN / LÚA MÌ / BỘT MÌ');
    forbidden.push('Bánh mì (Pan)', 'Mì gói / Mì sợi vàng (Trigo)', 'Bột chiên xù');
    safeFoods.push('Phở (Fideos de arroz 100%)', 'Bún tươi', 'Cơm trắng', 'Bánh tráng cuốn');
  }

  if (fullLower.includes('lactos') || fullLower.includes('leche') || fullLower.includes('queso') || fullLower.includes('sữa')) {
    vietnameseConditions.push('SỮA BÒ, SỮA ĐẶC & BƠ');
    forbidden.push('Sữa đặc Ông Thọ', 'Sữa tươi bò', 'Bơ động vật', 'Phô mai');
    safeFoods.push('Cà phê đen (Café solo)', 'Trà đá / Trà chanh', 'Nước dừa tươi');
  }

  if (fullLower.includes('huevo') || fullLower.includes('trứng')) {
    vietnameseConditions.push('TRỨNG CÁC LOẠI');
    forbidden.push('Trứng gà / Trứng vịt', 'Sốt bơ trứng mayonesa', 'Trứng cút');
    safeFoods.push('Cơm thịt luộc', 'Phở bò chín', 'Rau củ xào');
  }

  if (fullLower.includes('sésamo') || fullLower.includes('ajonjolí') || fullLower.includes('mè')) {
    vietnameseConditions.push('HẠT MÈ / VỪNG & DẦU MÈ');
    forbidden.push('Hạt mè (Sésamo)', 'Dầu mè', 'Muối vừng');
    safeFoods.push('Cơm trắng', 'Món luộc thanh đạm');
  }

  if (fullLower.includes('msg') || fullLower.includes('glutamat') || fullLower.includes('bột ngọt')) {
    vietnameseConditions.push('BỘT NGỌT / MÌ CHÍNH');
    forbidden.push('Bột ngọt (Ajinomoto)', 'Mì chính', 'Hạt nêm Knorr');
    safeFoods.push('Món nướng ướp muối', 'Rau luộc', 'Cơm trắng');
  }

  if (fullLower.includes('picante') || fullLower.includes('chile') || fullLower.includes('ớt')) {
    vietnameseConditions.push('ỚT TƯƠI & VỊ CAY');
    forbidden.push('Ớt tươi thái lát', 'Tương ớt cay', 'Sa tế ớt');
    safeFoods.push('Phở nước trong không ớt', 'Cơm chiên trứng');
  }

  if (fullLower.includes('cilantro') || fullLower.includes('ngò') || fullLower.includes('rau mùi')) {
    vietnameseConditions.push('RAU MÙI / NGÒ RÍ');
    forbidden.push('Rau mùi (Ngò rí)', 'Ngò gai', 'Rau thơm');
    safeFoods.push('Phở không hành ngò', 'Cơm tấm sườn');
  }

  if (fullLower.includes('cerdo') || fullLower.includes('heo') || fullLower.includes('lợn')) {
    vietnameseConditions.push('THỊT HEO & MỠ HEO');
    forbidden.push('Thịt heo (Cerdo)', 'Mỡ heo', 'Chả lụa', 'Nước dùng ninh xương heo');
    safeFoods.push('Thịt gà', 'Thịt bò', 'Cơm rau củ');
  }

  if (fullLower.includes('vegetar') || fullLower.includes('vegan') || fullLower.includes('chay')) {
    vietnameseConditions.push('ĂN CHAY THANH TỊNH (KHÔNG THỊT, CÁ, MỠ, NƯỚC MẮM)');
    forbidden.push('Thịt các loại', 'Cá & hải sản', 'Mỡ heo', 'Nước mắm cá');
    safeFoods.push('Đậu hũ chiên (Tofu)', 'Nấm các loại', 'Rau xào xì dầu', 'Cơm trắng');
  }

  // Fallback if no specific condition matched
  if (vietnameseConditions.length === 0) {
    vietnameseConditions.push(cleanList.join(', ').toUpperCase());
  }

  cleanList.forEach((item) => {
    if (!forbidden.some((f) => f.toLowerCase().includes(item.toLowerCase()))) {
      forbidden.push(item);
    }
  });

  const conditionTextVi = vietnameseConditions.join(' + ');

  const vietnameseLarge = `XIN CHÀO! TÔI BỊ DỊ ỨNG THỰC PHẨM NGHIÊM TRỌNG.

TÔI TUYỆT ĐỐI KHÔNG ĐƯỢC ĂN:
⛔ ${conditionTextVi}

Xin vui lòng KHÔNG cho các nguyên liệu này, KHÔNG dùng dầu đã chiên qua các món trên, và KHÔNG dùng nước dùng ninh từ các thành phần này.

Ăn phải sẽ nguy hiểm đến tính mạng. Xin chân thành cảm ơn nhà hàng!`;

  return {
    id: 'card-' + Date.now(),
    title: `Aviso: ${cleanList.slice(0, 2).join(' + ')}`,
    personName: personName || 'Mi Tarjeta',
    conditions: cleanList,
    vietnameseLarge,
    phonetic: 'Sin chao! Toy bi di ung nghiem chong. Toy tuyet doy khong duoc an...',
    allowedFoods: safeFoods.length > 0 ? safeFoods : ['Cơm trắng (Arroz)', 'Trứng chiên', 'Rau luộc'],
    forbiddenIngredients: forbidden.length > 0 ? forbidden : cleanList,
    emergencyNote: 'Si tengo síntomas de reacción alérgica o dificultad para respirar, por favor llame a una ambulancia al 115.',
    createdAt: Date.now(),
  };
}

export const AllergyCardsSection: React.FC<AllergyCardsSectionProps> = ({ isOnline }) => {
  const [savedCards, setSavedCards] = useState<AllergyCardData[]>(() => {
    const cards = getSavedAllergyCards();
    return cards.length > 0 ? cards : DEFAULT_ALLERGY_CARDS;
  });

  const [activeCardId, setActiveCardId] = useState<string>(() => {
    return savedCards[0]?.id || 'default-peanuts';
  });

  const [currentCard, setCurrentCard] = useState<AllergyCardData | null>(() => {
    return savedCards[0] || generateClientFallbackCard(['Cacahuetes y frutos secos'], 'Mi Tarjeta');
  });

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [personName, setPersonName] = useState<string>(() => currentCard?.personName || 'Mi Tarjeta');
  const [selectedConditions, setSelectedConditions] = useState<string[]>(() => {
    return (currentCard?.conditions || ['Cacahuetes y frutos secos']).map(cleanAllergenLabel);
  });

  const [ingredientSearch, setIngredientSearch] = useState<string>('');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('todos');
  const [customInput, setCustomInput] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [isFullscreenMode, setIsFullscreenMode] = useState<boolean>(false);

  // Sync active card
  const handleSelectCard = (card: AllergyCardData) => {
    setActiveCardId(card.id);
    setCurrentCard(card);
    setSelectedConditions((card.conditions || []).map(cleanAllergenLabel));
    setPersonName(card.personName || card.title);
    setIsEditing(false);
  };

  // Start creating new card
  const handleStartNewCard = () => {
    setActiveCardId('new');
    setSelectedConditions([]);
    const defaultName = `Tarjeta ${savedCards.length + 1}`;
    setPersonName(defaultName);
    const draft = generateClientFallbackCard([], defaultName);
    setCurrentCard(draft);
    setIsEditing(true);
  };

  // Toggle condition chip
  const handleToggleCondition = (rawCondition: string) => {
    const clean = cleanAllergenLabel(rawCondition);
    const next = selectedConditions.includes(clean)
      ? selectedConditions.filter((c) => c !== clean)
      : [...selectedConditions, clean];
    
    setSelectedConditions(next);
    // Instant live update for smooth experience
    if (next.length > 0) {
      const updated = generateClientFallbackCard(next, personName);
      if (currentCard) updated.id = currentCard.id;
      setCurrentCard(updated);
    }
  };

  // Add custom ingredient
  const handleAddCustom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = cleanAllergenLabel(customInput);
    if (!clean) return;
    if (!selectedConditions.includes(clean)) {
      const next = [...selectedConditions, clean];
      setSelectedConditions(next);
      const updated = generateClientFallbackCard(next, personName);
      if (currentCard) updated.id = currentCard.id;
      setCurrentCard(updated);
    }
    setCustomInput('');
  };

  const handleAddFromSearch = () => {
    const clean = cleanAllergenLabel(ingredientSearch);
    if (!clean) return;
    if (!selectedConditions.includes(clean)) {
      const next = [...selectedConditions, clean];
      setSelectedConditions(next);
      const updated = generateClientFallbackCard(next, personName);
      if (currentCard) updated.id = currentCard.id;
      setCurrentCard(updated);
    }
    setIngredientSearch('');
  };

  const handleRemoveCondition = (cond: string) => {
    const next = selectedConditions.filter((c) => c !== cond);
    setSelectedConditions(next);
    if (next.length > 0) {
      const updated = generateClientFallbackCard(next, personName);
      if (currentCard) updated.id = currentCard.id;
      setCurrentCard(updated);
    }
  };

  // Generate with AI (Online) or instant fallback
  const handleGenerateCard = async () => {
    if (selectedConditions.length === 0) {
      alert('Por favor selecciona al menos una alergia o ingrediente.');
      return;
    }

    setIsGenerating(true);

    if (!isOnline) {
      const offlineCard = generateClientFallbackCard(selectedConditions, personName);
      if (currentCard && activeCardId !== 'new') offlineCard.id = currentCard.id;
      setCurrentCard(offlineCard);
      setIsGenerating(false);
      setIsEditing(false);
      return;
    }

    try {
      const res = await fetch('/api/allergy-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conditions: selectedConditions, personName }),
      });
      const data = await res.json();
      if (data && data.card) {
        const generated: AllergyCardData = {
          id: currentCard && activeCardId !== 'new' ? currentCard.id : 'card-' + Date.now(),
          title: data.card.title || `Aviso: ${selectedConditions.slice(0, 2).join(' + ')}`,
          personName: personName || 'Mi Tarjeta',
          conditions: selectedConditions,
          vietnameseLarge: data.card.vietnameseLarge,
          phonetic: data.card.phonetic,
          allowedFoods: data.card.allowedFoods,
          forbiddenIngredients: data.card.forbiddenIngredients,
          emergencyNote: data.card.emergencyNote,
          createdAt: Date.now(),
        };
        setCurrentCard(generated);
      } else {
        const fallback = generateClientFallbackCard(selectedConditions, personName);
        if (currentCard && activeCardId !== 'new') fallback.id = currentCard.id;
        setCurrentCard(fallback);
      }
    } catch (err) {
      console.warn('Network fallback:', err);
      const fallback = generateClientFallbackCard(selectedConditions, personName);
      if (currentCard && activeCardId !== 'new') fallback.id = currentCard.id;
      setCurrentCard(fallback);
    } finally {
      setIsGenerating(false);
      setIsEditing(false);
    }
  };

  // Save current card
  const handleSaveCard = () => {
    if (!currentCard) return;
    const cardToSave: AllergyCardData = {
      ...currentCard,
      id: activeCardId === 'new' || currentCard.id.startsWith('draft') ? 'card-' + Date.now() : currentCard.id,
      personName: personName.trim() || currentCard.personName || 'Mi Tarjeta',
      conditions: selectedConditions,
      createdAt: Date.now(),
    };

    const updatedList = saveSingleAllergyCard(cardToSave);
    setSavedCards(updatedList);
    setActiveCardId(cardToSave.id);
    setCurrentCard(cardToSave);
    setIsEditing(false);

    setSaveToast(`¡Tarjeta "${cardToSave.personName}" guardada!`);
    setTimeout(() => setSaveToast(null), 3000);
  };

  // Delete card
  const handleDeleteCard = (cardId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (savedCards.length <= 1) {
      alert('Debes mantener al menos una tarjeta.');
      return;
    }
    if (!confirm('¿Eliminar esta tarjeta?')) return;

    const updated = deleteSavedAllergyCard(cardId);
    setSavedCards(updated);
    if (activeCardId === cardId && updated.length > 0) {
      handleSelectCard(updated[0]);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredPresets = useMemo(() => {
    const q = ingredientSearch.toLowerCase().trim();
    return PRESET_RESTRICTIONS.filter((p) => {
      const matchesCategory = selectedCategoryTab === 'todos' || p.category === selectedCategoryTab;
      const matchesQuery = !q || p.label.toLowerCase().includes(q) || p.subVi.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [ingredientSearch, selectedCategoryTab]);

  const CATEGORY_TABS = [
    { id: 'todos', label: 'Todos' },
    { id: 'frecuentes', label: '⭐ Frecuentes' },
    { id: 'marisco_pescado', label: '🦐 Marisco & Pescado' },
    { id: 'especias_hierbas', label: '🌿 Especias & Hierbas' },
    { id: 'lacteos_huevos', label: '🥛 Lácteos & Huevos' },
    { id: 'carnes', label: '🥩 Carnes' },
    { id: 'dietas', label: '🥗 Dietas' },
  ];

  return (
    <div className="space-y-5 max-w-4xl w-full mx-auto min-w-0">
      {/* 1. Header Status Bar */}
      <div className="bg-gradient-to-r from-[#181614] via-[#201d19] to-[#181614] text-stone-100 rounded-2xl p-3.5 sm:px-5 sm:py-4 border border-amber-500/20 shadow-[0_4px_20px_rgba(0,0,0,0.25)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 shadow-inner">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-sm sm:text-base text-white tracking-tight">Tarjetas de Alergias & Dietas</h3>
            <p className="text-[11px] sm:text-xs text-stone-400 mt-0.5">
              Muestra estas tarjetas en vietnamita en restaurantes y puestos de comida
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleStartNewCard}
          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Nueva Tarjeta</span>
        </button>
      </div>

      {/* 2. Horizontal Saved Cards Selector */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-stone-200/90 shadow-2xs space-y-2">
        <div className="flex items-center justify-between text-xs text-stone-600">
          <span className="font-bold flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-rose-600" />
            <span>Tus Tarjetas:</span>
          </span>
          <span className="text-[11px] text-stone-400">
            Toca una para ver o mostrar
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar touch-pan-x">
          {savedCards.map((card) => {
            const isActive = activeCardId === card.id && !isEditing;
            return (
              <div
                key={card.id}
                onClick={() => handleSelectCard(card)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold transition cursor-pointer shrink-0 select-none ${
                  isActive
                    ? 'bg-stone-900 text-white border-stone-900 font-bold shadow-xs'
                    : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                }`}
              >
                <User className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-stone-400'}`} />
                <span className="truncate max-w-[150px]">
                  {card.personName || card.title}
                </span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive ? 'bg-stone-800 text-amber-300' : 'bg-stone-200 text-stone-600'
                }`}>
                  {card.conditions?.length || 1}
                </span>
                {savedCards.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteCard(card.id, e)}
                    title="Eliminar tarjeta"
                    className="p-0.5 rounded hover:bg-rose-500 hover:text-white transition cursor-pointer text-stone-400 ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          {activeCardId === 'new' && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-100 border border-amber-300 text-amber-950 font-bold text-xs shrink-0 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Nueva tarjeta en curso...</span>
            </div>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {saveToast && (
        <div className="bg-emerald-50 text-emerald-900 border border-emerald-300 px-4 py-2.5 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{saveToast}</span>
          </div>
          <button type="button" onClick={() => setSaveToast(null)} className="text-emerald-700 hover:text-emerald-950">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. MAIN RESTAURANT CARD DISPLAY */}
      {currentCard && !isEditing && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-stone-200 shadow-sm space-y-5">
          {/* Card Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-rose-700 uppercase tracking-wider">
                  {currentCard.personName || 'Mi Tarjeta'}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
                  {currentCard.conditions?.length || 1} alérgeno(s)
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-serif font-bold text-stone-900 mt-0.5">
                Aviso de Alergia Alimentaria
              </h3>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIsFullscreenMode(true)}
                className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-stone-900 text-white hover:bg-stone-800 transition cursor-pointer shadow-xs active:scale-95"
                title="Mostrar en pantalla completa al camarero o cocinero"
              >
                <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Pantalla Completa</span>
              </button>

              <button
                type="button"
                onClick={() => speakVietnamese(currentCard.vietnameseLarge)}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-200/80 transition cursor-pointer active:scale-95"
                title="Escuchar pronunciación en voz alta"
              >
                <Volume2 className="w-3.5 h-3.5 text-amber-700" />
                <span>Pronunciar</span>
              </button>

              <button
                type="button"
                onClick={() => handleCopyText(`${currentCard.vietnameseLarge}\n\n${currentCard.emergencyNote || ''}`)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition cursor-pointer border border-stone-200 active:scale-95"
                title="Copiar texto"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado' : 'Copiar'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 transition cursor-pointer active:scale-95"
                title="Modificar ingredientes de esta tarjeta"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editar</span>
              </button>
            </div>
          </div>

          {/* Vietnamese Box */}
          <div className="bg-rose-50/70 rounded-2xl p-5 sm:p-6 border-2 border-rose-200/90 space-y-3">
            <div className="flex items-center justify-between text-[11px] font-bold text-rose-800">
              <span className="flex items-center gap-1.5 uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Aviso para el cocinero (Tiếng Việt):
              </span>
              <span className="text-stone-400 font-normal">Texto para mostrar</span>
            </div>

            <div className="text-lg sm:text-xl font-bold text-stone-950 leading-relaxed font-sans whitespace-pre-line">
              {currentCard.vietnameseLarge}
            </div>
          </div>

          {/* Forbidden Ingredients */}
          {currentCard.forbiddenIngredients && currentCard.forbiddenIngredients.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                <span>🚫</span>
                <span>Ingredientes que no debe llevar:</span>
              </span>
              <div className="flex flex-wrap gap-2">
                {currentCard.forbiddenIngredients.map((ing) => (
                  <span
                    key={ing}
                    className="bg-rose-100/90 border border-rose-300 text-rose-950 font-bold text-xs sm:text-sm px-3 py-1.5 rounded-xl shadow-2xs"
                  >
                    {cleanAllergenLabel(ing)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Safe Food Suggestions */}
          {currentCard.allowedFoods && currentCard.allowedFoods.length > 0 && (
            <div className="space-y-2 pt-1">
              <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <span>✅</span>
                <span>Platos y opciones habitualmente seguros:</span>
              </span>
              <div className="flex flex-wrap gap-2">
                {currentCard.allowedFoods.map((food) => (
                  <span
                    key={food}
                    className="bg-emerald-50 border border-emerald-200 text-emerald-900 font-semibold text-xs px-3 py-1 rounded-xl"
                  >
                    {food}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Emergency Note */}
          {currentCard.emergencyNote && (
            <div className="text-xs text-rose-950 bg-rose-50/80 p-3.5 rounded-2xl border border-rose-200 font-medium flex items-start gap-2.5">
              <HeartPulse className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span>{currentCard.emergencyNote}</span>
                <span className="block mt-1 font-bold text-rose-900">
                  Teléfono de ambulancia en Vietnam: <strong className="underline text-rose-950">115</strong>
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. EDIT / CREATE ALLERGENS PANEL */}
      {isEditing && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 border-2 border-rose-300 shadow-md space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
            <div>
              <h4 className="font-serif font-bold text-base text-stone-900">
                {activeCardId === 'new' ? 'Crear Nueva Tarjeta' : `Editar "${personName}"`}
              </h4>
              <p className="text-xs text-stone-500">
                Marca los alérgenos o escribe ingredientes para añadirlos a la tarjeta.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-stone-500">Nombre:</span>
              <input
                type="text"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                placeholder="Ej. Mi Tarjeta, Niños..."
                className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 w-40"
              />
            </div>
          </div>

          {/* Selected items tray */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-stone-800">
              <span>Alérgenos seleccionados ({selectedConditions.length}):</span>
              {selectedConditions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedConditions([])}
                  className="text-stone-400 hover:text-rose-600 font-normal cursor-pointer"
                >
                  Limpiar todos
                </button>
              )}
            </div>

            {selectedConditions.length === 0 ? (
              <div className="p-4 rounded-2xl border border-dashed border-stone-300 text-center text-xs text-stone-500">
                Selecciona al menos un alérgeno en la lista inferior.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 p-3 rounded-2xl bg-rose-50/60 border border-rose-200">
                {selectedConditions.map((cond) => (
                  <span
                    key={cond}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs shadow-2xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{cond}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCondition(cond)}
                      className="p-0.5 rounded-full hover:bg-rose-700 transition cursor-pointer text-white/80 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Search bar & filter pills */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar alérgeno (ej. cacahuete, huevo, marisco, gluten, sésamo)..."
                  value={ingredientSearch}
                  onChange={(e) => setIngredientSearch(e.target.value)}
                  className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-stone-300 text-xs sm:text-sm bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 transition"
                />
                {ingredientSearch && (
                  <button
                    type="button"
                    onClick={() => setIngredientSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {ingredientSearch.trim() && (
                <button
                  type="button"
                  onClick={handleAddFromSearch}
                  className="px-3.5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir</span>
                </button>
              )}
            </div>

            {/* Category tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
              {CATEGORY_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedCategoryTab(tab.id)}
                  className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-bold transition cursor-pointer shrink-0 ${
                    selectedCategoryTab === tab.id
                      ? 'bg-stone-900 text-white shadow-2xs'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Presets grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
            {filteredPresets.map((preset) => {
              const isSelected = selectedConditions.includes(preset.label);
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleToggleCondition(preset.label)}
                  className={`text-left p-3 rounded-2xl border transition cursor-pointer flex items-start gap-2.5 select-none ${
                    isSelected
                      ? 'bg-rose-50 border-rose-400 text-rose-950 shadow-xs ring-1 ring-rose-400'
                      : 'bg-white border-stone-200 hover:border-stone-300 hover:bg-stone-50 text-stone-700'
                  }`}
                >
                  <span className="text-xl shrink-0">{preset.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-xs font-bold truncate ${isSelected ? 'text-rose-950' : 'text-stone-900'}`}>
                        {preset.label}
                      </span>
                      {isSelected ? (
                        <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0 fill-rose-100" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-stone-300 shrink-0" />
                      )}
                    </div>
                    <span className="text-[11px] text-stone-500 block truncate mt-0.5">
                      {preset.subVi}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom ingredient form */}
          <form onSubmit={handleAddCustom} className="pt-2 border-t border-stone-100 flex items-center gap-2">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Añadir otro ingrediente (ej. apio, mostaza, canela)..."
              className="flex-1 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <button
              type="submit"
              disabled={!customInput.trim()}
              className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-white font-bold text-xs transition cursor-pointer"
            >
              Añadir
            </button>
          </form>

          {/* Action buttons */}
          <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs transition cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSaveCard}
              disabled={selectedConditions.length === 0}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-bold text-xs transition cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Guardar y Ver Tarjeta</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. FULLSCREEN RESTAURANT DISPLAY */}
      {isFullscreenMode && currentCard && (
        <div className="fixed inset-0 z-50 bg-stone-950/95 backdrop-blur-md flex flex-col p-4 sm:p-8 overflow-y-auto">
          <div className="max-w-3xl w-full mx-auto my-auto space-y-5">
            {/* Top Close Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm uppercase tracking-wider">
                <ShieldAlert className="w-5 h-5 text-rose-500" />
                <span>Tarjeta para Restaurante (Tiếng Việt)</span>
              </div>
              <button
                type="button"
                onClick={() => setIsFullscreenMode(false)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition cursor-pointer border border-white/20"
              >
                <Minimize2 className="w-4 h-4 text-white" />
                <span>Cerrar</span>
              </button>
            </div>

            {/* High-Contrast Card for the Vendor */}
            <div className="bg-white rounded-3xl p-6 sm:p-10 border-4 border-rose-600 shadow-2xl text-stone-950 space-y-6">
              <div className="flex items-center justify-between border-b-2 border-stone-200 pb-4">
                <div className="flex items-center gap-2 text-rose-700 font-black text-sm uppercase tracking-wider">
                  <AlertTriangle className="w-5 h-5" />
                  <span>XIN ĐỌC KỸ TRƯỚC KHI NẤU (POR FAVOR LEER ANTES DE COCINAR)</span>
                </div>
                <button
                  type="button"
                  onClick={() => speakVietnamese(currentCard.vietnameseLarge)}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Audio</span>
                </button>
              </div>

              {/* Massive Vietnamese Text */}
              <div className="text-2xl sm:text-3xl font-black text-black leading-snug font-sans whitespace-pre-line tracking-tight">
                {currentCard.vietnameseLarge}
              </div>

              {/* Prohibited items badges */}
              {currentCard.forbiddenIngredients && currentCard.forbiddenIngredients.length > 0 && (
                <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 border-2 border-rose-300 space-y-2">
                  <span className="text-xs sm:text-sm font-black text-rose-950 uppercase tracking-wide block">
                    🚫 NGUYÊN LIỆU TUYỆT ĐỐI CẤM (PROHIBIDO USAR):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {currentCard.forbiddenIngredients.map((item) => (
                      <span
                        key={item}
                        className="bg-rose-600 text-white font-black text-sm sm:text-base px-3.5 py-1.5 rounded-xl shadow-xs"
                      >
                        {cleanAllergenLabel(item)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Emergency Call Note */}
              <div className="text-xs sm:text-sm font-bold text-rose-900 bg-stone-100 p-3.5 rounded-2xl border border-stone-300">
                🚑 <strong>Cấp cứu khẩn cấp:</strong> Nếu có dấu hiệu sốc phản vệ, vui lòng gọi cấp cứu <strong>115</strong> ngay lập tức!
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
