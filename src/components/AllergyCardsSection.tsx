import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, ShieldCheck, Plus, Trash2, Volume2, Copy, Check, 
  Maximize2, Minimize2, X, Sparkles, RefreshCw, AlertTriangle, 
  CheckCircle2, User, Layers, Info
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

interface PresetRestriction {
  id: string;
  emoji: string;
  label: string;
  subVi: string;
  category: 'allergy' | 'diet' | 'sensitive';
}

const PRESET_RESTRICTIONS: PresetRestriction[] = [
  {
    id: 'peanuts',
    emoji: '🥜',
    label: 'Cacahuetes y frutos secos',
    subVi: 'Đậu phộng / Lạc & các loại hạt',
    category: 'allergy',
  },
  {
    id: 'seafood',
    emoji: '🦐',
    label: 'Marisco, gambas y calamar',
    subVi: 'Hải sản: tôm, cua, mực, nghêu',
    category: 'allergy',
  },
  {
    id: 'fish_sauce',
    emoji: '🐟',
    label: 'Sin salsa de pescado',
    subVi: 'Không dùng nước mắm cá',
    category: 'allergy',
  },
  {
    id: 'gluten',
    emoji: '🌾',
    label: 'Gluten / Trigo / Celíaco',
    subVi: 'Không Gluten / Bột mì, bánh mì',
    category: 'allergy',
  },
  {
    id: 'lactose',
    emoji: '🥛',
    label: 'Lactosa / Leche condensada',
    subVi: 'Không sữa bò, không sữa đặc',
    category: 'allergy',
  },
  {
    id: 'msg',
    emoji: '🧂',
    label: 'Sin Glutamato / MSG',
    subVi: 'Không bột ngọt / Mì chính',
    category: 'sensitive',
  },
  {
    id: 'vegetarian',
    emoji: '🥗',
    label: 'Vegetariano estricto',
    subVi: 'Ăn chay thanh tịnh, không mỡ heo',
    category: 'diet',
  },
  {
    id: 'vegan',
    emoji: '🌱',
    label: 'Vegano 100%',
    subVi: 'Thuần chay 100%, không trứng sữa',
    category: 'diet',
  },
  {
    id: 'egg',
    emoji: '🥚',
    label: 'Huevo',
    subVi: 'Không ăn trứng gà, vịt',
    category: 'allergy',
  },
  {
    id: 'spicy',
    emoji: '🌶️',
    label: 'Sin picante ni guindilla',
    subVi: 'Không ăn cay / Không ớt',
    category: 'sensitive',
  },
  {
    id: 'garlic_onion',
    emoji: '🧄',
    label: 'Sin ajo ni cebolleta',
    subVi: 'Không tỏi, không hành',
    category: 'sensitive',
  },
  {
    id: 'pork',
    emoji: '🥩',
    label: 'Sin cerdo / Halal',
    subVi: 'Không thịt heo / Không mỡ lợn',
    category: 'diet',
  },
  {
    id: 'ice',
    emoji: '🧊',
    label: 'Sin hielo de la calle',
    subVi: 'Không lấy đá / Chỉ nước đóng chai',
    category: 'sensitive',
  },
  {
    id: 'soy',
    emoji: '🫘',
    label: 'Soja / Salsa de soja',
    subVi: 'Không đậu nành / xì dầu',
    category: 'allergy',
  },
  {
    id: 'cilantro',
    emoji: '🌿',
    label: 'Sin cilantro / aromáticas',
    subVi: 'Không rau mùi / ngò gai',
    category: 'sensitive',
  },
];

// Offline fallback generator for combined multiple conditions
function generateClientFallbackCard(conditions: string[], personName?: string): AllergyCardData {
  const cleanList = conditions.length > 0 ? conditions : ['Cacahuetes y frutos secos'];
  const fullLower = cleanList.join(' ').toLowerCase();

  const matchedViItems: string[] = [];
  const forbidden: string[] = [];
  const safeFoods: string[] = [];

  if (fullLower.includes('cacahuete') || fullLower.includes('fruto') || fullLower.includes('đậu phộng') || fullLower.includes('lạc')) {
    matchedViItems.push('ĐẬU PHỘNG / LẠC & CÁC LOẠI HẠT (Cacahuete y frutos secos)');
    forbidden.push('Đậu phộng / Lạc (Cacahuete)', 'Dầu lạc (Aceite cacahuete)', 'Bơ đậu phộng', 'Hạt điều (Anacardo)');
    safeFoods.push('Cơm trắng (Arroz blanco)', 'Thịt luộc', 'Trứng chiên');
  }

  if (fullLower.includes('marisco') || fullLower.includes('gamba') || fullLower.includes('calamar') || fullLower.includes('hải sản') || fullLower.includes('tôm') || fullLower.includes('cua')) {
    matchedViItems.push('HẢI SẢN: TÔM, CUA, MỰC, TÉP, NGHÊU (Marisco)');
    forbidden.push('Tôm / Tép (Gambas)', 'Cua / Ghẹ (Cangrejo)', 'Mực (Calamar)', 'Nước luộc hải sản');
    safeFoods.push('Thịt gà (Pollo)', 'Thịt bò (Ternera)', 'Thịt heo');
  }

  if (fullLower.includes('salsa de pescado') || fullLower.includes('nước mắm') || fullLower.includes('pescado')) {
    matchedViItems.push('NƯỚC MẮM CÁ (Salsa de pescado truyền thống)');
    forbidden.push('Nước mắm cá', 'Mắm tôm', 'Mắm ruốc');
    safeFoods.push('Nước tương / Xì dầu (Salsa de soja)', 'Muối tiêu chanh');
  }

  if (fullLower.includes('gluten') || fullLower.includes('trigo') || fullLower.includes('celíac') || fullLower.includes('bột mì')) {
    matchedViItems.push('GLUTEN / LÚA MÌ / BỘT MÌ (Bột mì, bánh mì, mì sợi vàng)');
    forbidden.push('Bánh mì (Baguette)', 'Mì gói / mì tôm (Fideos trigo)', 'Bột mì chiên giòn');
    safeFoods.push('Phở (Fideos de arroz 100%)', 'Bún tươi', 'Cơm trắng');
  }

  if (fullLower.includes('lactos') || fullLower.includes('leche') || fullLower.includes('sữa')) {
    matchedViItems.push('SỮA BÒ & SỮA ĐẶC (Lactosa y lácteos)');
    forbidden.push('Sữa đặc có đường Ông Thọ', 'Sữa tươi', 'Bơ động vật', 'Phô mai');
    safeFoods.push('Cà phê đen (Café solo)', 'Trà đá / Trà chanh', 'Nước dừa tươi');
  }

  if (fullLower.includes('vegetar') || fullLower.includes('vegan') || fullLower.includes('chay')) {
    matchedViItems.push('ĂN CHAY THANH TỊNH (Vegetariano / Vegano)');
    forbidden.push('Thịt các loại', 'Cá & hải sản', 'Mỡ heo (Manteca)', 'Nước mắm cá');
    safeFoods.push('Đậu phụ / Đậu hũ (Tofu)', 'Nấm các loại', 'Rau xào xì dầu', 'Cơm trắng');
  }

  if (fullLower.includes('msg') || fullLower.includes('glutamat') || fullLower.includes('bột ngọt') || fullLower.includes('mì chính')) {
    matchedViItems.push('BỘT NGỌT / MÌ CHÍNH (MSG / Glutamato)');
    forbidden.push('Bột ngọt (Ajinomoto)', 'Mì chính', 'Hạt nêm thịt Knorr');
    safeFoods.push('Món nướng ướp muối', 'Rau luộc', 'Cơm trắng');
  }

  if (fullLower.includes('picante') || fullLower.includes('guindilla') || fullLower.includes('ớt')) {
    matchedViItems.push('ỚT / VỊ CAY (Không ăn cay)');
    forbidden.push('Ớt tươi', 'Tương ớt cay', 'Sa tế ớt', 'Bột ớt');
    safeFoods.push('Phở nước trong', 'Món luộc thanh đạm', 'Cơm chiên không ớt');
  }

  if (fullLower.includes('cerdo') || fullLower.includes('heo') || fullLower.includes('halal')) {
    matchedViItems.push('THỊT HEO / MỠ HEO (Không ăn thịt lợn)');
    forbidden.push('Thịt heo', 'Mỡ heo', 'Chả lụa heo', 'Nước dùng ninh xương heo');
    safeFoods.push('Thịt gà', 'Thịt bò', 'Cơm rau');
  }

  if (fullLower.includes('hielo') || fullLower.includes('đá')) {
    matchedViItems.push('ĐÁ LẠNH (Không lấy đá / Chỉ uống nước đóng chai)');
    forbidden.push('Đá viên / Đá cây vỉa hè');
    safeFoods.push('Nước suối nguyên chai đóng nắp', 'Trà nóng');
  }

  // Include any extra custom words
  cleanList.forEach((item) => {
    if (!forbidden.some((f) => f.toLowerCase().includes(item.toLowerCase()))) {
      forbidden.push(item);
    }
  });

  const bulletList = matchedViItems.length > 0 
    ? matchedViItems.map((v) => `• ${v}`).join('\n')
    : cleanList.map((c) => `• KHÔNG ĂN: ${c.toUpperCase()}`).join('\n');

  const title = cleanList.length > 1 
    ? `Ficha Médica Combinada (${cleanList.length} restricciones)` 
    : `Ficha Médica: ${cleanList[0]}`;

  return {
    id: 'card-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    title,
    personName: personName || 'Ficha Personal',
    conditions: cleanList,
    vietnameseLarge: `XIN CHÚ Ý ĐẶC BIỆT! Tôi bị DỊ ỨNG & BẤT DUNG NẠP NGUY HIỂM TÍNH MẠNG với các thứ sau:\n${bulletList}\nXin đầu bếp TUYỆT ĐỐI KHÔNG SỬ DỤNG những nguyên liệu này hoặc bất kỳ chế phẩm nào trong món ăn của tôi! Cảm ơn bạn rất nhiều!`,
    phonetic: 'Xin chu y dac biet! Toi bi di ung nguy hiem tinh mang voi cac mon nay... Xin khong cho vao do an.',
    allowedFoods: safeFoods.length > 0 ? Array.from(new Set(safeFoods)).slice(0, 6) : ['Cơm trắng (Arroz blanco)', 'Món luộc thanh đạm', 'Nước suối đóng chai'],
    forbiddenIngredients: Array.from(new Set(forbidden)).slice(0, 10),
    emergencyNote: 'Nếu tôi ăn phải và có dấu hiệu sưng họng, khó thở hoặc sốc phản vệ, xin làm ơn gọi cấp cứu 115 ngay lập tức!',
    createdAt: Date.now(),
  };
}

export const AllergyCardsSection: React.FC<AllergyCardsSectionProps> = ({ isOnline }) => {
  // Stored cards list
  const [savedCards, setSavedCards] = useState<AllergyCardData[]>(() => getSavedAllergyCards());
  const [activeCardId, setActiveCardId] = useState<string>(() => {
    const list = getSavedAllergyCards();
    return list.length > 0 ? list[0].id : 'new';
  });

  // Current working card state
  const [currentCard, setCurrentCard] = useState<AllergyCardData | null>(() => {
    const list = getSavedAllergyCards();
    return list.length > 0 ? list[0] : DEFAULT_ALLERGY_CARDS[0];
  });

  // Editor form state
  const [selectedConditions, setSelectedConditions] = useState<string[]>(() => {
    const list = getSavedAllergyCards();
    return list.length > 0 ? list[0].conditions : ['Cacahuetes y frutos secos'];
  });
  const [personName, setPersonName] = useState<string>(() => {
    const list = getSavedAllergyCards();
    return list.length > 0 ? (list[0].personName || 'Ficha Principal') : 'Ficha Principal';
  });
  const [customInput, setCustomInput] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [isFullscreenMode, setIsFullscreenMode] = useState<boolean>(false);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);

  // Sync when active card changes
  const handleSelectCard = (card: AllergyCardData) => {
    setActiveCardId(card.id);
    setCurrentCard(card);
    setSelectedConditions(card.conditions || []);
    setPersonName(card.personName || card.title);
    setIsCreatingNew(false);
  };

  // Start creating a brand new card
  const handleStartNewCard = () => {
    setIsCreatingNew(true);
    setActiveCardId('new');
    setSelectedConditions(['Cacahuetes y frutos secos']);
    setPersonName(`Ficha ${savedCards.length + 1}`);
    const draft = generateClientFallbackCard(['Cacahuetes y frutos secos'], `Ficha ${savedCards.length + 1}`);
    setCurrentCard(draft);
  };

  // Toggle a condition chip
  const handleToggleCondition = (conditionLabel: string) => {
    setSelectedConditions((prev) => {
      let next: string[];
      if (prev.includes(conditionLabel)) {
        next = prev.filter((c) => c !== conditionLabel);
      } else {
        next = [...prev, conditionLabel];
      }
      return next;
    });
  };

  // Add custom typed condition
  const handleAddCustom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = customInput.trim();
    if (!clean) return;
    if (!selectedConditions.includes(clean)) {
      setSelectedConditions((prev) => [...prev, clean]);
    }
    setCustomInput('');
  };

  // Remove a specific tag
  const handleRemoveCondition = (cond: string) => {
    setSelectedConditions((prev) => prev.filter((c) => c !== cond));
  };

  // Generate / Regenerate Card with AI or smart multi-item fallback
  const handleGenerateCard = async () => {
    if (selectedConditions.length === 0) {
      alert('Por favor selecciona al menos una alergia o restricción.');
      return;
    }

    setIsGenerating(true);

    if (!isOnline) {
      const offlineCard = generateClientFallbackCard(selectedConditions, personName);
      if (currentCard && !isCreatingNew) {
        offlineCard.id = currentCard.id;
      }
      setCurrentCard(offlineCard);
      setIsGenerating(false);
      return;
    }

    try {
      const res = await fetch('/api/allergy-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conditions: selectedConditions,
          personName,
        }),
      });
      const data = await res.json();
      if (data && data.card) {
        const generated: AllergyCardData = {
          id: currentCard && !isCreatingNew ? currentCard.id : 'card-' + Date.now(),
          title: data.card.title || `Ficha: ${selectedConditions.slice(0, 2).join(' + ')}`,
          personName: personName || 'Ficha de Viaje',
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
        if (currentCard && !isCreatingNew) fallback.id = currentCard.id;
        setCurrentCard(fallback);
      }
    } catch (err) {
      console.warn('Fallback due to network:', err);
      const fallback = generateClientFallbackCard(selectedConditions, personName);
      if (currentCard && !isCreatingNew) fallback.id = currentCard.id;
      setCurrentCard(fallback);
    } finally {
      setIsGenerating(false);
    }
  };

  // Save current card into localStorage collection
  const handleSaveCard = () => {
    if (!currentCard) return;
    const cardToSave: AllergyCardData = {
      ...currentCard,
      id: isCreatingNew || currentCard.id.startsWith('draft') ? 'card-' + Date.now() : currentCard.id,
      personName: personName.trim() || currentCard.personName || 'Ficha de Viaje',
      conditions: selectedConditions,
      createdAt: Date.now(),
    };

    const updatedList = saveSingleAllergyCard(cardToSave);
    setSavedCards(updatedList);
    setActiveCardId(cardToSave.id);
    setCurrentCard(cardToSave);
    setIsCreatingNew(false);

    setSaveToast(`¡Ficha "${cardToSave.personName}" guardada con éxito!`);
    setTimeout(() => setSaveToast(null), 3000);
  };

  // Delete card from saved collection
  const handleDeleteCard = (cardId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (savedCards.length <= 1) {
      alert('Debes mantener al menos una ficha guardada.');
      return;
    }
    if (!confirm('¿Seguro que deseas eliminar esta ficha médica?')) return;

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

  const handleSpeak = (text: string) => {
    speakVietnamese(text);
  };

  return (
    <div className="space-y-6 max-w-4xl w-full mx-auto min-w-0">
      {/* 1. Header Banner & Context */}
      <div className="bg-gradient-to-r from-rose-900 to-rose-800 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-rose-700/50">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-white/10 text-white backdrop-blur-xs border border-white/20">
              <ShieldAlert className="w-6 h-6 text-rose-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                  Fichas Médicas y Alergias para Restaurantes
                </h3>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-200 border border-rose-400/30">
                  Multirrestricción
                </span>
              </div>
              <p className="text-xs sm:text-sm text-rose-100/90 mt-0.5">
                Crea, combina varias alergias a la vez y guarda múltiples fichas para ti o tus acompañantes de viaje.
              </p>
            </div>
          </div>

          <button
            onClick={handleStartNewCard}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-rose-900 hover:bg-rose-50 font-bold text-xs sm:text-sm shadow-sm transition cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 text-rose-700" />
            <span>Nueva Ficha</span>
          </button>
        </div>

        {/* Saved Cards Quick Selector Tabs */}
        <div className="mt-5 pt-4 border-t border-white/15">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span className="text-xs font-semibold text-rose-200 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              Tus Fichas Guardadas ({savedCards.length}):
            </span>
            <span className="text-[11px] text-rose-200/80">
              Disponibles 100% sin conexión
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {savedCards.map((card) => {
              const isActive = activeCardId === card.id && !isCreatingNew;
              return (
                <div
                  key={card.id}
                  onClick={() => handleSelectCard(card)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer shrink-0 select-none ${
                    isActive
                      ? 'bg-white text-rose-950 border-white shadow-md'
                      : 'bg-white/10 text-white border-white/15 hover:bg-white/20'
                  }`}
                >
                  <User className={`w-3.5 h-3.5 ${isActive ? 'text-rose-600' : 'text-rose-300'}`} />
                  <span className="truncate max-w-[140px] sm:max-w-[180px]">
                    {card.personName || card.title}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-rose-100 text-rose-800' : 'bg-white/20 text-white'
                  }`}>
                    {card.conditions?.length || 1}
                  </span>
                  {savedCards.length > 1 && (
                    <button
                      onClick={(e) => handleDeleteCard(card.id, e)}
                      title="Eliminar esta ficha"
                      className={`p-0.5 rounded hover:bg-rose-200/50 transition cursor-pointer ${
                        isActive ? 'text-stone-400 hover:text-rose-700' : 'text-rose-300 hover:text-white'
                      }`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}

            {isCreatingNew && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 text-amber-950 font-bold text-xs shrink-0 shadow-sm animate-pulse">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Creando nueva ficha...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Success Toast */}
      {saveToast && (
        <div className="bg-emerald-50 text-emerald-900 border border-emerald-300 px-4 py-2.5 rounded-xl flex items-center justify-between gap-3 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{saveToast}</span>
          </div>
          <button onClick={() => setSaveToast(null)} className="text-emerald-700 hover:text-emerald-950">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. CREATION / EDITING PANEL */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700 font-bold text-sm">
              1
            </div>
            <div>
              <h4 className="font-bold text-sm sm:text-base text-stone-900">
                {isCreatingNew ? 'Configurar Nueva Ficha' : `Editar Restricciones de "${personName}"`}
              </h4>
              <p className="text-xs text-stone-500">
                Selecciona una o varias condiciones para combinarlas en la misma ficha en vietnamita.
              </p>
            </div>
          </div>

          {/* Person / Card Name Field */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <span className="text-xs font-semibold text-stone-500 shrink-0">Nombre:</span>
            <input
              type="text"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              placeholder="Ej: Ficha de Carlos / Niños..."
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-rose-500 w-full sm:w-48"
            />
          </div>
        </div>

        {/* Selected Conditions Active Chips Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-stone-800 uppercase tracking-wide flex items-center gap-1.5">
              <span>Restricciones añadidas a esta ficha ({selectedConditions.length}):</span>
            </label>
            {selectedConditions.length > 0 && (
              <button
                onClick={() => setSelectedConditions([])}
                className="text-[11px] text-stone-400 hover:text-rose-600 transition cursor-pointer"
              >
                Limpiar todas
              </button>
            )}
          </div>

          {selectedConditions.length === 0 ? (
            <div className="p-3.5 rounded-xl border border-dashed border-stone-200 bg-stone-50/50 text-center">
              <p className="text-xs text-stone-500">
                No has añadido ninguna restricción aún. Haz clic en las etiquetas de abajo o escribe un ingrediente personalizado.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 p-2.5 rounded-xl bg-stone-50 border border-stone-200">
              {selectedConditions.map((cond) => (
                <span
                  key={cond}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-xs shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{cond}</span>
                  <button
                    onClick={() => handleRemoveCondition(cond)}
                    className="p-0.5 rounded-full hover:bg-rose-700 transition cursor-pointer"
                    title="Eliminar de la ficha"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Quick Presets Grid (categorized and easy to tap) */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold text-stone-700 block">
            Alergias e intolerancias más comunes en Vietnam (toca para añadir o quitar):
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {PRESET_RESTRICTIONS.map((preset) => {
              const isSelected = selectedConditions.includes(preset.label);
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleToggleCondition(preset.label)}
                  className={`text-left p-2.5 rounded-xl border transition cursor-pointer flex items-start gap-2.5 ${
                    isSelected
                      ? 'bg-rose-50 border-rose-400 text-rose-950 shadow-xs'
                      : 'bg-white border-stone-200 hover:border-stone-300 hover:bg-stone-50/80 text-stone-700'
                  }`}
                >
                  <span className="text-xl shrink-0 mt-0.5">{preset.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-xs font-bold truncate ${isSelected ? 'text-rose-950' : 'text-stone-900'}`}>
                        {preset.label}
                      </span>
                      {isSelected ? (
                        <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-stone-300 shrink-0" />
                      )}
                    </div>
                    <span className="text-[11px] text-stone-500 block truncate mt-0.5 font-sans">
                      {preset.subVi}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Ingredient / Allergy Adder */}
        <form onSubmit={handleAddCustom} className="space-y-1.5 pt-1">
          <label className="text-xs font-semibold text-stone-700 block">
            ¿Tienes otra alergia o ingrediente personalizado? (ej: sésamo, fresas, mostaza, apio...):
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Escribe ingrediente o alimento..."
              className="flex-1 text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <button
              type="button"
              onClick={() => handleAddCustom()}
              disabled={!customInput.trim()}
              className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-900 disabled:opacity-40 text-white font-semibold text-xs sm:text-sm transition cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir</span>
            </button>
          </div>
        </form>

        {/* Action Button: Generate / Update Card */}
        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-stone-100">
          <div className="flex items-center gap-1.5 text-xs text-stone-500">
            <Info className="w-4 h-4 text-stone-400 shrink-0" />
            <span>
              {isOnline ? 'Traduce con vocabulario culinario vietnamita certificado.' : 'Modo sin conexión: plantilla médica inmediata.'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGenerateCard}
              disabled={isGenerating || selectedConditions.length === 0}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-bold text-xs sm:text-sm shadow-sm transition cursor-pointer flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Generando ficha...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generar Ficha en Vietnamita</span>
                </>
              )}
            </button>

            {currentCard && (
              <button
                type="button"
                onClick={handleSaveCard}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-sm transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                title="Guardar en tu colección de fichas de viaje"
              >
                <Check className="w-4 h-4" />
                <span>Guardar Ficha</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. PRESENTATION CARD (High Contrast, Restaurant & Vendor Ready) */}
      {currentCard && (
        <div className="bg-rose-50/70 rounded-2xl p-5 sm:p-7 border-2 border-rose-300 shadow-lg space-y-5 relative">
          {/* Card Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rose-200/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-600 text-white shadow-xs">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">
                    {currentCard.personName || 'Ficha Médica'}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-200 text-rose-900">
                    {currentCard.conditions?.length || 1} {currentCard.conditions?.length === 1 ? 'restricción' : 'restricciones'}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-rose-950">
                  {currentCard.title || 'THẺ DỊ ỨNG / ALERGIAS'}
                </h3>
              </div>
            </div>

            {/* Presentation Controls: Fullscreen Mode, TTS, Copy */}
            <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
              <button
                onClick={() => setIsFullscreenMode(true)}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-stone-900 text-white hover:bg-stone-800 transition cursor-pointer shadow-xs"
                title="Abrir en pantalla completa para mostrar directamente al cocinero"
              >
                <Maximize2 className="w-3.5 h-3.5 text-rose-300" />
                <span>Modo Restaurante</span>
              </button>

              <button
                onClick={() => handleSpeak(currentCard.vietnameseLarge)}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-rose-200 text-rose-900 hover:bg-rose-300 transition cursor-pointer"
                title="Escuchar pronunciación"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Pronunciar</span>
              </button>

              <button
                onClick={() => handleCopyText(`${currentCard.vietnameseLarge}\n\n${currentCard.emergencyNote || ''}`)}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-white border border-rose-200 text-rose-900 hover:bg-rose-100 transition cursor-pointer"
                title="Copiar texto para enviar por chat"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
          </div>

          {/* Vietnamese Large Print Box - Designed to be shown across the counter */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border-2 border-rose-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black tracking-widest uppercase text-rose-600 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                Muestra esta pantalla al dependiente o cocinero:
              </span>
              <span className="text-[11px] text-stone-400 font-sans">
                Tiếng Việt (Vietnamita)
              </span>
            </div>

            <div className="text-xl sm:text-2xl font-black text-stone-950 leading-relaxed font-sans whitespace-pre-line tracking-tight">
              {currentCard.vietnameseLarge}
            </div>

            {currentCard.phonetic && (
              <div className="pt-2 border-t border-stone-100 text-xs text-stone-500 italic">
                <strong>Guía fonética aproximada:</strong> {currentCard.phonetic}
              </div>
            )}
          </div>

          {/* Forbidden Ingredients Breakdown */}
          {currentCard.forbiddenIngredients && currentCard.forbiddenIngredients.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                <span className="text-rose-600">🚫</span>
                Ingredientes prohibidos para el cocinero (TUYỆT ĐỐI KHÔNG DÙNG):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {currentCard.forbiddenIngredients.map((ing) => (
                  <span
                    key={ing}
                    className="bg-rose-200/90 border border-rose-300 text-rose-950 font-black text-xs sm:text-sm px-3 py-1.5 rounded-lg shadow-2xs"
                  >
                    {ing}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Safe Food Suggestions */}
          {currentCard.allowedFoods && currentCard.allowedFoods.length > 0 && (
            <div className="space-y-2 pt-1">
              <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <span className="text-emerald-600">✅</span>
                Platos recomendados seguros (MÓN AN TOÀN NÊN DÙNG):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {currentCard.allowedFoods.map((food) => (
                  <span
                    key={food}
                    className="bg-emerald-100/90 border border-emerald-300 text-emerald-950 font-bold text-xs px-2.5 py-1 rounded-md"
                  >
                    {food}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Emergency Note 115 */}
          {currentCard.emergencyNote && (
            <div className="text-xs text-rose-950 bg-rose-200/80 p-3.5 rounded-xl border border-rose-300 font-medium flex items-start gap-2.5">
              <span className="text-lg shrink-0">🚑</span>
              <div className="leading-relaxed">
                <strong>Instrucción médica de emergencia:</strong> {currentCard.emergencyNote}
                <div className="mt-1 font-bold text-rose-900">
                  Teléfono de ambulancia en Vietnam: <span className="underline text-rose-950">115</span> | Policía: <span className="underline text-rose-950">113</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. FULLSCREEN / RESTAURANT VENDOR OVERLAY */}
      {isFullscreenMode && currentCard && (
        <div className="fixed inset-0 z-50 bg-stone-950/95 backdrop-blur-md flex flex-col p-4 sm:p-8 overflow-y-auto">
          <div className="max-w-3xl w-full mx-auto my-auto space-y-6">
            {/* Top Close Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm uppercase tracking-widest">
                <ShieldAlert className="w-5 h-5 text-rose-500" />
                <span>Modo Vendedor Ambulante / Nhà Hàng</span>
              </div>
              <button
                onClick={() => setIsFullscreenMode(false)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition cursor-pointer border border-white/20"
              >
                <Minimize2 className="w-4 h-4 text-white" />
                <span>Cerrar Pantalla</span>
              </button>
            </div>

            {/* High-Contrast Card for the Vendor */}
            <div className="bg-white rounded-3xl p-6 sm:p-10 border-4 border-rose-600 shadow-2xl text-stone-950 space-y-6">
              <div className="flex items-center justify-between border-b-2 border-stone-200 pb-4">
                <div className="flex items-center gap-2 text-rose-700 font-black text-sm uppercase tracking-wider">
                  <AlertTriangle className="w-5 h-5" />
                  <span>XIN ĐỌC KỸ TRƯỚC KHI NẤU (POR FAVOR LEA ANTES DE COCINAR)</span>
                </div>
                <button
                  onClick={() => handleSpeak(currentCard.vietnameseLarge)}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Phát âm (Audio)</span>
                </button>
              </div>

              {/* Massive Vietnamese Text */}
              <div className="text-2xl sm:text-4xl font-black text-black leading-snug font-sans whitespace-pre-line tracking-tight">
                {currentCard.vietnameseLarge}
              </div>

              {/* Prohibited items badges */}
              {currentCard.forbiddenIngredients && currentCard.forbiddenIngredients.length > 0 && (
                <div className="p-4 rounded-2xl bg-rose-100 border-2 border-rose-400">
                  <span className="text-xs sm:text-sm font-black text-rose-950 uppercase tracking-wide block mb-2">
                    🚫 TUYỆT ĐỐI KHÔNG SỬ DỤNG (PROHIBIDO USAR):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {currentCard.forbiddenIngredients.map((item) => (
                      <span
                        key={item}
                        className="bg-rose-600 text-white font-black text-sm sm:text-lg px-3.5 py-1.5 rounded-xl shadow-xs"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Emergency Call Note */}
              <div className="text-sm font-bold text-rose-900 bg-stone-100 p-4 rounded-2xl border border-stone-300">
                🚑 <strong>Cấp cứu khẩn cấp:</strong> Nếu xảy ra sốc phản vệ, vui lòng gọi <strong>115</strong> ngay lập tức!
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
