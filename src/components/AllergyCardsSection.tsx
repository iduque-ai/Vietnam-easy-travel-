import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, ShieldCheck, Plus, Trash2, Volume2, Copy, Check, 
  Maximize2, Minimize2, X, Sparkles, RefreshCw, AlertTriangle, 
  CheckCircle2, User, Layers, Info, Search, Filter, PhoneCall,
  VolumeX, Share2, HeartPulse, Stethoscope
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
  label: string; // Clean label without "Sin "
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

// Comprehensive library of 40+ allergens and ingredients in Vietnam
export const PRESET_RESTRICTIONS: PresetRestriction[] = [
  // --- 1. ALERGIAS MÁS FRECUENTES ---
  {
    id: 'peanuts',
    emoji: '🥜',
    label: 'Cacahuetes y frutos secos',
    subVi: 'Đậu phộng / Lạc & các loại hạt',
    category: 'frecuentes',
  },
  {
    id: 'seafood',
    emoji: '🦐',
    label: 'Marisco, gambas y calamar',
    subVi: 'Hải sản: tôm, cua, mực, nghêu, sò',
    category: 'frecuentes',
  },
  {
    id: 'gluten',
    emoji: '🌾',
    label: 'Gluten / Trigo / Celíaco',
    subVi: 'Gluten / Bột mì, bánh mì, mì sợi vàng',
    category: 'frecuentes',
  },
  {
    id: 'lactose',
    emoji: '🥛',
    label: 'Lactosa / Leche de vaca',
    subVi: 'Sữa bò, sữa đặc Ông Thọ, bơ động vật',
    category: 'frecuentes',
  },
  {
    id: 'egg',
    emoji: '🥚',
    label: 'Huevo (gallina, pato, codorniz)',
    subVi: 'Trứng gà, trứng vịt, trứng cút',
    category: 'frecuentes',
  },
  {
    id: 'soy',
    emoji: '🫘',
    label: 'Soja / Salsa de soja',
    subVi: 'Đậu nành / Xì dầu, nước tương',
    category: 'frecuentes',
  },
  {
    id: 'sesame',
    emoji: '🌱',
    label: 'Sésamo / Ajonjolí / Aceite de sésamo',
    subVi: 'Hạt mè / Vừng & dầu mè',
    category: 'frecuentes',
  },

  // --- 2. MARISCOS, PESCADOS Y SALSAS ---
  {
    id: 'fish_sauce',
    emoji: '🐟',
    label: 'Salsa de pescado tradicional',
    subVi: 'Nước mắm cá truyền thống',
    category: 'marisco_pescado',
  },
  {
    id: 'fish',
    emoji: '🐠',
    label: 'Pescado fresco y seco',
    subVi: 'Cá tươi & cá khô các loại',
    category: 'marisco_pescado',
  },
  {
    id: 'shrimp_paste',
    emoji: '🏺',
    label: 'Pasta de gamba fermentada (Mắm tôm)',
    subVi: 'Mắm tôm / Mắm ruốc / Mắm tép',
    category: 'marisco_pescado',
  },
  {
    id: 'mollusks',
    emoji: '🦪',
    label: 'Ostras, almejas y caracoles',
    subVi: 'Hàu, nghêu, sò, ốc',
    category: 'marisco_pescado',
  },
  {
    id: 'crab',
    emoji: '🦀',
    label: 'Cangrejo de río o mar',
    subVi: 'Cua đồng, cua biển, ghẹ',
    category: 'marisco_pescado',
  },

  // --- 3. LÁCTEOS, HUEVOS Y DULCES ---
  {
    id: 'condensed_milk',
    emoji: '☕',
    label: 'Leche condensada (Cà phê sữa)',
    subVi: 'Sữa đặc có đường (sữa Ông Thọ)',
    category: 'lacteos_huevos',
  },
  {
    id: 'cheese_butter',
    emoji: '🧀',
    label: 'Queso y mantequilla',
    subVi: 'Phô mai & bơ động vật',
    category: 'lacteos_huevos',
  },
  {
    id: 'mayo',
    emoji: '🥪',
    label: 'Mayonesa con huevo (en Bánh mì)',
    subVi: 'Sốt bơ trứng / Mayonnaise',
    category: 'lacteos_huevos',
  },
  {
    id: 'honey',
    emoji: '🍯',
    label: 'Miel natural',
    subVi: 'Mật ong',
    category: 'lacteos_huevos',
  },

  // --- 4. ESPECIAS, HIERBAS Y CONDIMENTOS ---
  {
    id: 'msg',
    emoji: '🧂',
    label: 'Glutamato monosódico (MSG / Bột ngọt)',
    subVi: 'Bột ngọt (Ajinomoto) / Mì chính',
    category: 'especias_hierbas',
  },
  {
    id: 'spicy',
    emoji: '🌶️',
    label: 'Picante, guindilla y chile fresco',
    subVi: 'Ớt tươi, tương ớt, sa tế cay',
    category: 'especias_hierbas',
  },
  {
    id: 'garlic',
    emoji: '🧄',
    label: 'Ajo crudo o frito',
    subVi: 'Tỏi tươi & tỏi phi',
    category: 'especias_hierbas',
  },
  {
    id: 'onion_shallot',
    emoji: '🧅',
    label: 'Cebolla, cebolleta y chalota',
    subVi: 'Hành tây, hành lá, hành tím phi',
    category: 'especias_hierbas',
  },
  {
    id: 'cilantro',
    emoji: '🌿',
    label: 'Cilantro y aromáticas (Rau mùi / ngò)',
    subVi: 'Rau mùi (Hà Nội) / Ngò rí (Sài Gòn)',
    category: 'especias_hierbas',
  },
  {
    id: 'thai_basil_mint',
    emoji: '🍃',
    label: 'Albahaca tailandesa y menta',
    subVi: 'Húng quế, rau húng lủi, bạc hà',
    category: 'especias_hierbas',
  },
  {
    id: 'ginger_galangal',
    emoji: '🫚',
    label: 'Jengibre y galanga',
    subVi: 'Gừng & củ riềng',
    category: 'especias_hierbas',
  },
  {
    id: 'black_pepper',
    emoji: '⚫',
    label: 'Pimienta negra o blanca',
    subVi: 'Hạt tiêu đen, tiêu trắng Phú Quốc',
    category: 'especias_hierbas',
  },
  {
    id: 'added_sugar',
    emoji: '🍬',
    label: 'Azúcar añadido en bebidas / zumos',
    subVi: 'Đường cát / Nước đường pha sẵn',
    category: 'especias_hierbas',
  },
  {
    id: 'street_ice',
    emoji: '🧊',
    label: 'Hielo no embotellado de la calle',
    subVi: 'Đá viên vỉa hè / Đá cây không đóng túi',
    category: 'especias_hierbas',
  },

  // --- 5. GRANOS, HARINAS Y CEREALES ---
  {
    id: 'bread_baguette',
    emoji: '🥖',
    label: 'Pan baguette de trigo (Bánh mì)',
    subVi: 'Bánh mì làm từ bột mì',
    category: 'granos_gluten',
  },
  {
    id: 'instant_noodles',
    emoji: '🍜',
    label: 'Fideos amarillos de trigo (Mì tôm / mì trứng)',
    subVi: 'Mì sợi vàng / Mì gói làm từ lúa mì',
    category: 'granos_gluten',
  },
  {
    id: 'corn',
    emoji: '🌽',
    label: 'Maíz y fécula de maíz',
    subVi: 'Bắp / Ngô & tinh bột bắp',
    category: 'granos_gluten',
  },
  {
    id: 'cashews_almonds',
    emoji: '🌰',
    label: 'Anacardos, almendras y nueces',
    subVi: 'Hạt điều, hạnh nhân, hạt dẻ',
    category: 'granos_gluten',
  },

  // --- 6. CARNES Y GRASAS ANIMALES ---
  {
    id: 'pork',
    emoji: '🥩',
    label: 'Carne de cerdo y manteca de cerdo',
    subVi: 'Thịt heo (lợn), mỡ heo, giò lụa',
    category: 'carnes',
  },
  {
    id: 'beef',
    emoji: '🐂',
    label: 'Carne de ternera / vacuno',
    subVi: 'Thịt bò & nước dùng ninh xương bò',
    category: 'carnes',
  },
  {
    id: 'chicken',
    emoji: '🍗',
    label: 'Carne de pollo y caldos de ave',
    subVi: 'Thịt gà & nước luộc gà',
    category: 'carnes',
  },
  {
    id: 'duck',
    emoji: '🦆',
    label: 'Carne de pato',
    subVi: 'Thịt vịt & tiết canh',
    category: 'carnes',
  },
  {
    id: 'animal_fat',
    emoji: '🍳',
    label: 'Grasa o manteca animal en frituras',
    subVi: 'Mỡ động vật chiên rán',
    category: 'carnes',
  },

  // --- 7. DIETAS Y ESTILOS DE VIDA ---
  {
    id: 'vegetarian',
    emoji: '🥗',
    label: 'Vegetariano estricto (Ăn chay budista)',
    subVi: 'Ăn chay thanh tịnh, không thịt cá mỡ',
    category: 'dietas',
  },
  {
    id: 'vegan',
    emoji: '🌱',
    label: 'Vegano 100% (Thuần chay)',
    subVi: 'Thuần chay 100%, không trứng, sữa, mật ong',
    category: 'dietas',
  },
  {
    id: 'halal',
    emoji: '☪️',
    label: 'Halal (Sin cerdo ni alcohol en la comida)',
    subVi: 'Chuẩn Halal: không thịt heo, không rượu nấu',
    category: 'dietas',
  },
  {
    id: 'celiac_strict',
    emoji: '🩺',
    label: 'Celíaco estricto (Sin contaminación cruzada)',
    subVi: 'Dị ứng Gluten nghiêm ngặt, chảo muỗng riêng',
    category: 'dietas',
  },
];

// Offline fallback card generator with comprehensive coverage
function generateClientFallbackCard(rawConditions: string[], personName?: string): AllergyCardData {
  const cleanList = rawConditions.length > 0 
    ? rawConditions.map(cleanAllergenLabel) 
    : ['Cacahuetes y frutos secos'];
  
  const fullLower = cleanList.join(' ').toLowerCase();

  const matchedViItems: string[] = [];
  const forbidden: string[] = [];
  const safeFoods: string[] = [];

  // Peanut & Tree nuts
  if (fullLower.includes('cacahuete') || fullLower.includes('fruto') || fullLower.includes('anacardo') || fullLower.includes('lạc') || fullLower.includes('đậu phộng')) {
    matchedViItems.push('ĐẬU PHỘNG / LẠC & CÁC LOẠI HẠT (Cacahuete y frutos secos)');
    forbidden.push('Đậu phộng / Lạc (Cacahuete)', 'Dầu lạc (Aceite cacahuete)', 'Hạt điều (Anacardo)', 'Bơ đậu phộng');
    safeFoods.push('Cơm trắng (Arroz blanco)', 'Trứng chiên', 'Thịt luộc không lạc');
  }

  // Seafood & Shellfish
  if (fullLower.includes('marisco') || fullLower.includes('gamba') || fullLower.includes('calamar') || fullLower.includes('cangrejo') || fullLower.includes('hải sản') || fullLower.includes('tôm') || fullLower.includes('mực')) {
    matchedViItems.push('HẢI SẢN: TÔM, CUA, MỰC, TÉP, NGHÊU, SÒ (Marisco y crustáceos)');
    forbidden.push('Tôm / Tép (Gambas)', 'Cua / Ghẹ (Cangrejo)', 'Mực (Calamar)', 'Mắm ruốc / Mắm tép', 'Nước dùng ninh hải sản');
    safeFoods.push('Thịt gà (Pollo)', 'Thịt bò (Ternera)', 'Cơm trắng', 'Rau luộc');
  }

  // Fish & Fish Sauce
  if (fullLower.includes('pescado') || fullLower.includes('nước mắm') || fullLower.includes('cá')) {
    matchedViItems.push('NƯỚC MẮM CÁ & CÁ CÁC LOẠI (Salsa de pescado y pescado)');
    forbidden.push('Nước mắm cá truyền thống', 'Cá tươi / cá khô', 'Mắm tôm / mắm ruốc');
    safeFoods.push('Nước tương / Xì dầu (Salsa de soja)', 'Muối tiêu chanh', 'Đậu hũ chiên');
  }

  // Gluten & Wheat
  if (fullLower.includes('gluten') || fullLower.includes('trigo') || fullLower.includes('celíac') || fullLower.includes('pan') || fullLower.includes('bột mì')) {
    matchedViItems.push('GLUTEN / LÚA MÌ / BỘT MÌ (Bột mì, bánh mì baguette, mì sợi vàng)');
    forbidden.push('Bánh mì (Baguette)', 'Mì gói / mì tôm (Trigo)', 'Bột mì chiên xù', 'Mì vằn thắn');
    safeFoods.push('Phở (Fideos de arroz 100%)', 'Bún tươi', 'Cơm trắng', 'Bánh tráng cuốn');
  }

  // Lactose & Dairy
  if (fullLower.includes('lactos') || fullLower.includes('leche') || fullLower.includes('queso') || fullLower.includes('sữa')) {
    matchedViItems.push('SỮA BÒ, SỮA ĐẶC & CHẾ PHẨM SỮA (Lactosa y lácteos)');
    forbidden.push('Sữa đặc Ông Thọ', 'Sữa tươi bò', 'Bơ động vật', 'Phô mai');
    safeFoods.push('Cà phê đen (Café solo)', 'Trà đá / Trà chanh', 'Nước dừa tươi', 'Nước mía');
  }

  // Egg
  if (fullLower.includes('huevo') || fullLower.includes('trứng') || fullLower.includes('mayonesa')) {
    matchedViItems.push('TRỨNG GÀ, TRỨNG VỊT, TRỨNG CÚT (Huevos y derivados)');
    forbidden.push('Trứng chiên / ốp la', 'Sốt bơ trứng mayonesa', 'Bánh bông lan', 'Trứng cút');
    safeFoods.push('Cơm thịt luộc', 'Phở bò chín', 'Rau củ xào');
  }

  // Sesame
  if (fullLower.includes('sésamo') || fullLower.includes('ajonjolí') || fullLower.includes('mè') || fullLower.includes('vừng')) {
    matchedViItems.push('HẠT MÈ / VỪNG & DẦU MÈ (Sésamo y aceite de sésamo)');
    forbidden.push('Hạt mè trắng / đen', 'Dầu mè thơm', 'Muối vừng');
    safeFoods.push('Cơm trắng', 'Món luộc thanh đạm', 'Nước suối');
  }

  // MSG / Glutamate
  if (fullLower.includes('msg') || fullLower.includes('glutamat') || fullLower.includes('bột ngọt') || fullLower.includes('mì chính')) {
    matchedViItems.push('BỘT NGỌT / MÌ CHÍNH (Glutamato monosódico / MSG)');
    forbidden.push('Bột ngọt (Ajinomoto)', 'Mì chính', 'Hạt nêm thịt Knorr');
    safeFoods.push('Món nướng ướp muối', 'Rau luộc chấm kho quẹt chay', 'Cơm trắng');
  }

  // Spicy / Chili
  if (fullLower.includes('picante') || fullLower.includes('guindilla') || fullLower.includes('chile') || fullLower.includes('ớt')) {
    matchedViItems.push('ỚT TƯƠI / VỊ CAY (Không ăn cay / Đừng cho ớt)');
    forbidden.push('Ớt tươi thái lát', 'Tương ớt cay', 'Sa tế ớt', 'Bột ớt');
    safeFoods.push('Phở nước trong không ớt', 'Món luộc thanh đạm', 'Cơm chiên trứng');
  }

  // Garlic / Onion
  if (fullLower.includes('ajo') || fullLower.includes('cebolla') || fullLower.includes('tỏi') || fullLower.includes('hành')) {
    matchedViItems.push('TỎI & HÀNH (Không ăn tỏi, hành lá, hành tây, hành phi)');
    forbidden.push('Tỏi phi / tỏi sống', 'Hành lá cắt nhỏ', 'Hành tây', 'Hành tím phi');
    safeFoods.push('Cơm trắng', 'Rau luộc', 'Món nướng ướp muối');
  }

  // Cilantro / Coriander
  if (fullLower.includes('cilantro') || fullLower.includes('rau mùi') || fullLower.includes('ngò')) {
    matchedViItems.push('RAU MÙI / NGÒ RÍ / NGÒ GAI (Không cho rau thơm)');
    forbidden.push('Rau mùi (Hà Nội)', 'Ngò rí (Sài Gòn)', 'Ngò gai', 'Húng quế');
    safeFoods.push('Phở không hành ngò', 'Cơm tấm sườn', 'Bánh mì không rau');
  }

  // Pork / Animal Fat / Halal
  if (fullLower.includes('cerdo') || fullLower.includes('puerco') || fullLower.includes('heo') || fullLower.includes('lợn') || fullLower.includes('halal')) {
    matchedViItems.push('THỊT HEO & MỠ HEO (Không ăn thịt lợn / Mỡ động vật)');
    forbidden.push('Thịt heo (lợn)', 'Mỡ heo', 'Chả lụa heo', 'Nước dùng ninh xương heo');
    safeFoods.push('Thịt gà', 'Thịt bò', 'Cơm rau củ', 'Cá tươi');
  }

  // Street Ice
  if (fullLower.includes('hielo') || fullLower.includes('đá')) {
    matchedViItems.push('ĐÁ LẠNH (Không lấy đá / Chỉ uống nước đóng chai)');
    forbidden.push('Đá viên vỉa hè / Đá cây không đóng túi');
    safeFoods.push('Nước suối nguyên chai đóng nắp', 'Trà nóng', 'Nước dừa tươi nguyên trái');
  }

  // Sugar
  if (fullLower.includes('azúcar') || fullLower.includes('đường')) {
    matchedViItems.push('ĐƯỜNG CÁT (Không cho đường / Ít ngọt)');
    forbidden.push('Đường cát trắng', 'Siro đường', 'Nước đường pha sẵn');
    safeFoods.push('Cà phê không đường', 'Nước dừa tươi', 'Trà đá không ngọt');
  }

  // Vegetarian / Vegan
  if (fullLower.includes('vegetar') || fullLower.includes('vegan') || fullLower.includes('chay')) {
    matchedViItems.push('ĂN CHAY THANH TỊNH / THUẦN CHAY (Không thịt, cá, mỡ, nước mắm)');
    forbidden.push('Thịt các loại', 'Cá & hải sản', 'Mỡ heo (Manteca)', 'Nước mắm cá', 'Hạt nêm Knorr');
    safeFoods.push('Đậu phụ / Đậu hũ (Tofu)', 'Nấm các loại', 'Rau xào xì dầu', 'Cơm trắng');
  }

  // Include any extra custom words not yet matched
  cleanList.forEach((item) => {
    if (!forbidden.some((f) => f.toLowerCase().includes(item.toLowerCase()))) {
      forbidden.push(item);
    }
  });

  const bulletList = matchedViItems.length > 0 
    ? matchedViItems.map((v) => `• ${v}`).join('\n')
    : cleanList.map((c) => `• TUYỆT ĐỐI KHÔNG DÙNG: ${c.toUpperCase()}`).join('\n');

  const title = cleanList.length > 1 
    ? `Ficha Médica (${cleanList.length} restricciones)` 
    : `Ficha Médica: ${cleanList[0]}`;

  return {
    id: 'card-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    title,
    personName: personName || 'Ficha Personal',
    conditions: cleanList,
    vietnameseLarge: `XIN CHÚ Ý ĐẶC BIỆT!\nTôi bị DỊ ỨNG & BẤT DUNG NẠP NGUY HIỂM TÍNH MẠNG với các thứ sau:\n\n${bulletList}\n\nXin đầu bếp TUYỆT ĐỐI KHÔNG SỬ DỤNG những nguyên liệu này hoặc bất kỳ chế phẩm nào trong món ăn của tôi! Cảm ơn bạn rất nhiều!`,
    phonetic: 'Xin chu y dac biet! Toi bi di ung nguy hiem tinh mang voi cac mon nay... Xin tuyet doi khong cho vao do an.',
    allowedFoods: safeFoods.length > 0 ? Array.from(new Set(safeFoods)).slice(0, 6) : ['Cơm trắng (Arroz blanco)', 'Món luộc thanh đạm', 'Nước suối nguyên chai đóng nắp'],
    forbiddenIngredients: Array.from(new Set(forbidden)).slice(0, 10),
    emergencyNote: 'Nếu tôi ăn phải và có dấu hiệu sưng họng, khó thở hoặc sốc phản vệ, xin làm ơn gọi cấp cứu 115 ngay lập tức!',
    createdAt: Date.now(),
  };
}

export const AllergyCardsSection: React.FC<AllergyCardsSectionProps> = ({ isOnline }) => {
  // Stored cards list (starts empty if user hasn't created any)
  const [savedCards, setSavedCards] = useState<AllergyCardData[]>(() => getSavedAllergyCards());
  const [activeCardId, setActiveCardId] = useState<string>(() => {
    const list = getSavedAllergyCards();
    return list.length > 0 ? list[0].id : 'new';
  });

  // Current working card state (starts null if no cards saved yet)
  const [currentCard, setCurrentCard] = useState<AllergyCardData | null>(() => {
    const list = getSavedAllergyCards();
    return list.length > 0 ? list[0] : null;
  });

  // Editor form state (starts with empty selection)
  const [selectedConditions, setSelectedConditions] = useState<string[]>(() => {
    const list = getSavedAllergyCards();
    return list.length > 0 ? (list[0].conditions || []).map(cleanAllergenLabel) : [];
  });
  const [personName, setPersonName] = useState<string>(() => {
    const list = getSavedAllergyCards();
    return list.length > 0 ? (list[0].personName || 'Mi Ficha') : 'Mi Ficha';
  });

  // Search & Filter state for the ingredients list
  const [ingredientSearch, setIngredientSearch] = useState<string>('');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('todos');
  const [customInput, setCustomInput] = useState<string>('');

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [isFullscreenMode, setIsFullscreenMode] = useState<boolean>(false);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(() => {
    return getSavedAllergyCards().length === 0;
  });

  // Sync when active card changes
  const handleSelectCard = (card: AllergyCardData) => {
    setActiveCardId(card.id);
    setCurrentCard(card);
    setSelectedConditions((card.conditions || []).map(cleanAllergenLabel));
    setPersonName(card.personName || card.title);
    setIsCreatingNew(false);
  };

  // Start creating a brand new card
  const handleStartNewCard = () => {
    setIsCreatingNew(true);
    setActiveCardId('new');
    setSelectedConditions([]);
    const defaultName = `Ficha ${savedCards.length + 1}`;
    setPersonName(defaultName);
    setCurrentCard(null);
  };

  // Toggle a condition chip (always clean of "Sin ")
  const handleToggleCondition = (rawCondition: string) => {
    const clean = cleanAllergenLabel(rawCondition);
    setSelectedConditions((prev) => {
      if (prev.includes(clean)) {
        return prev.filter((c) => c !== clean);
      } else {
        return [...prev, clean];
      }
    });
  };

  // Add custom typed condition
  const handleAddCustom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = cleanAllergenLabel(customInput);
    if (!clean) return;
    if (!selectedConditions.includes(clean)) {
      setSelectedConditions((prev) => [...prev, clean]);
    }
    setCustomInput('');
  };

  // Add from search bar directly if user typed something custom
  const handleAddFromSearch = () => {
    const clean = cleanAllergenLabel(ingredientSearch);
    if (!clean) return;
    if (!selectedConditions.includes(clean)) {
      setSelectedConditions((prev) => [...prev, clean]);
    }
    setIngredientSearch('');
  };

  // Remove a specific tag
  const handleRemoveCondition = (cond: string) => {
    setSelectedConditions((prev) => prev.filter((c) => c !== cond));
  };

  // Generate / Regenerate Card with AI or smart multi-item fallback
  const handleGenerateCard = async () => {
    if (selectedConditions.length === 0) {
      alert('Por favor selecciona al menos una alergia o ingrediente para generar la ficha.');
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

  // Filtered ingredients by search and category
  const filteredPresets = useMemo(() => {
    const q = ingredientSearch.toLowerCase().trim();
    return PRESET_RESTRICTIONS.filter((p) => {
      const matchesCategory = selectedCategoryTab === 'todos' || p.category === selectedCategoryTab;
      const matchesQuery = 
        !q ||
        p.label.toLowerCase().includes(q) ||
        p.subVi.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [ingredientSearch, selectedCategoryTab]);

  const CATEGORY_TABS = [
    { id: 'todos', label: 'Todos' },
    { id: 'frecuentes', label: '⭐ Frecuentes' },
    { id: 'marisco_pescado', label: '🦐 Marisco & Pescado' },
    { id: 'especias_hierbas', label: '🌿 Especias & Hierbas' },
    { id: 'lacteos_huevos', label: '🥛 Lácteos & Huevos' },
    { id: 'granos_gluten', label: '🌾 Trigo & Gluten' },
    { id: 'carnes', label: '🥩 Carnes' },
    { id: 'dietas', label: '🥗 Dietas' },
  ];

  return (
    <div className="space-y-6 max-w-4xl w-full mx-auto min-w-0">
      {/* 1. Header Banner & Saved Cards Navigation */}
      <div className="bg-gradient-to-br from-rose-950 via-rose-900 to-rose-800 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-rose-700/60 relative overflow-hidden">
        {/* Subtle decorative background glow */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-white/10 text-white backdrop-blur-md border border-white/20 shadow-inner">
              <ShieldAlert className="w-6 h-6 sm:w-7 sm:h-7 text-rose-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  Fichas Médicas de Alérgenos & Intolerancias
                </h3>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-rose-500/40 text-rose-100 border border-rose-400/40 tracking-wider">
                  Traducción Garantizada
                </span>
              </div>
              <p className="text-xs sm:text-sm text-rose-100/90 mt-1 max-w-2xl leading-relaxed">
                Selecciona ingredientes con el buscador, genera tu tarjeta en vietnamita para el restaurante y activa el <strong>Modo Pantalla Completa</strong> para mostrárselo al cocinero.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleStartNewCard}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-rose-950 hover:bg-rose-50 font-bold text-xs sm:text-sm shadow-sm hover:shadow transition cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 text-rose-700" />
            <span>Nueva Ficha</span>
          </button>
        </div>

        {/* Saved Cards Carousel Tabs */}
        <div className="mt-5 pt-4 border-t border-white/15">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span className="text-xs font-bold text-rose-200 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-rose-300" />
              Tus Fichas Guardadas ({savedCards.length}):
            </span>
            <span className="text-[11px] text-rose-200/80 font-medium">
              100% disponibles sin conexión
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar touch-pan-x">
            {savedCards.map((card) => {
              const isActive = activeCardId === card.id && !isCreatingNew;
              return (
                <div
                  key={card.id}
                  onClick={() => handleSelectCard(card)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition cursor-pointer shrink-0 select-none shadow-2xs ${
                    isActive
                      ? 'bg-white text-rose-950 border-white shadow-sm'
                      : 'bg-white/10 text-white border-white/15 hover:bg-white/20'
                  }`}
                >
                  <User className={`w-3.5 h-3.5 ${isActive ? 'text-rose-600' : 'text-rose-300'}`} />
                  <span className="truncate max-w-[130px] sm:max-w-[170px]">
                    {card.personName || card.title}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                    isActive ? 'bg-rose-100 text-rose-800' : 'bg-white/20 text-white'
                  }`}>
                    {card.conditions?.length || 1}
                  </span>
                  {savedCards.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteCard(card.id, e)}
                      title="Eliminar esta ficha médica"
                      className={`p-1 rounded-md hover:bg-rose-200/50 transition cursor-pointer ml-1 ${
                        isActive ? 'text-stone-400 hover:text-rose-700' : 'text-rose-300 hover:text-white'
                      }`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}

            {isCreatingNew && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 text-amber-950 font-black text-xs shrink-0 shadow-sm animate-pulse">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Configurando nueva ficha...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {saveToast && (
        <div className="bg-emerald-50 text-emerald-900 border border-emerald-300 px-4 py-3 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold animate-in fade-in slide-in-from-top-2 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{saveToast}</span>
          </div>
          <button type="button" onClick={() => setSaveToast(null)} className="text-emerald-700 hover:text-emerald-950">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. INGREDIENT & ALLERGY BUILDER PANEL */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-stone-200 shadow-sm space-y-6">
        {/* Panel Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700 font-black text-sm">
              1
            </div>
            <div>
              <h4 className="font-bold text-base text-stone-900">
                {isCreatingNew ? 'Configurar Ficha de Alérgenos' : `Restricciones de "${personName}"`}
              </h4>
              <p className="text-xs text-stone-500">
                Selecciona ingredientes o alérgenos. Puedes combinar varios en la misma tarjeta.
              </p>
            </div>
          </div>

          {/* Name Field */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto bg-stone-50 p-1.5 rounded-xl border border-stone-200">
            <span className="text-xs font-bold text-stone-500 pl-2 shrink-0">Nombre:</span>
            <input
              type="text"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              placeholder="Ej: Ficha Carlos, Niños..."
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 w-full sm:w-44"
            />
          </div>
        </div>

        {/* ACTIVE INGREDIENTS TRAY (Chips without "Sin ") */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-stone-800 uppercase tracking-wide flex items-center gap-1.5">
              <span>Ingredientes añadidos a excluir ({selectedConditions.length}):</span>
            </label>
            {selectedConditions.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedConditions([])}
                className="text-[11px] text-stone-400 hover:text-rose-600 font-semibold transition cursor-pointer"
              >
                Limpiar selección
              </button>
            )}
          </div>

          {selectedConditions.length === 0 ? (
            <div className="p-4 rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50/50 text-center">
              <p className="text-xs text-stone-500">
                Aún no has seleccionado ingredientes. Busca o toca en la lista inferior para agregarlos a tu ficha.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 p-3 rounded-2xl bg-rose-50/40 border border-rose-200/80">
              {selectedConditions.map((cond) => (
                <span
                  key={cond}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs shadow-2xs group"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{cond}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCondition(cond)}
                    className="p-0.5 rounded-full hover:bg-rose-700 transition cursor-pointer ml-0.5 text-white/80 hover:text-white"
                    title="Eliminar ingrediente"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* INGREDIENTS SEARCH & CATEGORIES BAR */}
        <div className="space-y-3 pt-1">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar alérgeno o ingrediente (ej. cacahuete, huevo, marisco, gluten, sésamo, picante...)"
                value={ingredientSearch}
                onChange={(e) => setIngredientSearch(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-500 transition shadow-2xs"
              />
              {ingredientSearch && (
                <button
                  type="button"
                  onClick={() => setIngredientSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Custom typed add button if searched term is not in list */}
            {ingredientSearch.trim() && (
              <button
                type="button"
                onClick={handleAddFromSearch}
                className="px-3.5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir "{cleanAllergenLabel(ingredientSearch)}"</span>
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar touch-pan-x text-xs">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCategoryTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-bold transition cursor-pointer shrink-0 ${
                  selectedCategoryTab === tab.id
                    ? 'bg-stone-900 text-white shadow-2xs'
                    : 'bg-stone-100 hover:bg-stone-200/80 text-stone-600 border border-stone-200/60'
                }`}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* EXTENDED INGREDIENTS GRID */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>
              Mostrando {filteredPresets.length} {filteredPresets.length === 1 ? 'ingrediente' : 'ingredientes'}:
            </span>
            <span className="text-[11px] text-stone-400">
              Toca para marcar o desmarcar
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
            {filteredPresets.map((preset) => {
              const isSelected = selectedConditions.includes(preset.label);
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleToggleCondition(preset.label)}
                  className={`text-left p-3 rounded-2xl border transition cursor-pointer flex items-start gap-3 select-none ${
                    isSelected
                      ? 'bg-rose-50/90 border-rose-400 text-rose-950 shadow-xs ring-1 ring-rose-400'
                      : 'bg-white border-stone-200 hover:border-stone-300 hover:bg-stone-50/70 text-stone-700'
                  }`}
                >
                  <span className="text-2xl shrink-0 mt-0.5">{preset.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className={`text-xs font-bold truncate leading-tight ${isSelected ? 'text-rose-950' : 'text-stone-900'}`}>
                        {preset.label}
                      </span>
                      {isSelected ? (
                        <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0 fill-rose-100" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-stone-300 shrink-0" />
                      )}
                    </div>
                    <span className="text-[11px] text-stone-500 block truncate mt-1 font-sans">
                      {preset.subVi}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {filteredPresets.length === 0 && (
            <div className="text-center py-8 bg-stone-50 rounded-2xl border border-stone-200 text-stone-500 text-xs space-y-2">
              <p>No se encontraron ingredientes en la lista con "{ingredientSearch}".</p>
              <button
                type="button"
                onClick={handleAddFromSearch}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir "{cleanAllergenLabel(ingredientSearch)}" a la ficha</span>
              </button>
            </div>
          )}
        </div>

        {/* CUSTOM INGREDIENT MANUAL INPUT */}
        <form onSubmit={handleAddCustom} className="pt-2 border-t border-stone-100 space-y-2">
          <label className="text-xs font-semibold text-stone-700 block">
            ¿Quieres añadir otro ingrediente personalizado? (ej. fresas, mostaza, canela, apio...):
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Escribe el alimento o ingrediente..."
              className="flex-1 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-2xs"
            />
            <button
              type="submit"
              disabled={!customInput.trim()}
              className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-white font-bold text-xs sm:text-sm transition cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir</span>
            </button>
          </div>
        </form>

        {/* GENERATE & SAVE ACTIONS */}
        <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-stone-100">
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <Info className="w-4 h-4 text-stone-400 shrink-0" />
            <span>
              {isOnline ? 'Traducción culinaria profesional con IA y revisión fonética.' : 'Modo sin conexión: plantilla médica inmediata.'}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleGenerateCard}
              disabled={isGenerating || selectedConditions.length === 0}
              className="flex-1 sm:flex-initial px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-black text-xs sm:text-sm shadow-md hover:shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Traduciendo al vietnamita...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-rose-200" />
                  <span>Generar Ficha en Vietnamita</span>
                </>
              )}
            </button>

            {currentCard && (
              <button
                type="button"
                onClick={handleSaveCard}
                className="px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm shadow-md hover:shadow-lg transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                title="Guardar en tu colección de fichas de viaje"
              >
                <Check className="w-4 h-4" />
                <span>Guardar Ficha</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. RESTAURANT PRESENTATION CARD (HIGH CONTRAST & CLEAR FOR COOKS) */}
      {currentCard && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 border-2 border-rose-300 shadow-lg space-y-5 relative">
          {/* Card Top Ribbon */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-600 text-white shadow-xs">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-rose-700 uppercase tracking-wider">
                    {currentCard.personName || 'Ficha Médica'}
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-200">
                    {currentCard.conditions?.length || 1} {currentCard.conditions?.length === 1 ? 'ingrediente' : 'ingredientes'}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-stone-900 mt-0.5">
                  {currentCard.title || 'THẺ DỊ ỨNG THỰC PHẨM (Ficha de Alérgenos)'}
                </h3>
              </div>
            </div>

            {/* Quick Actions: Fullscreen Restaurant Mode, TTS, Copy */}
            <div className="w-full sm:w-auto flex items-center justify-start sm:justify-end gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIsFullscreenMode(true)}
                className="flex items-center gap-1.5 text-xs font-black px-3.5 py-2 rounded-xl bg-stone-900 text-white hover:bg-stone-800 transition cursor-pointer shadow-sm"
                title="Abrir en pantalla completa para mostrar directamente al cocinero"
              >
                <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Modo Pantalla Completa</span>
              </button>

              <button
                type="button"
                onClick={() => handleSpeak(currentCard.vietnameseLarge)}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-950 transition cursor-pointer border border-rose-200"
                title="Escuchar pronunciación"
              >
                <Volume2 className="w-3.5 h-3.5 text-rose-700" />
                <span>Pronunciar</span>
              </button>

              <button
                type="button"
                onClick={() => handleCopyText(`${currentCard.vietnameseLarge}\n\n${currentCard.emergencyNote || ''}`)}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 transition cursor-pointer border border-stone-200"
                title="Copiar texto para enviar por Grab o chat"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-stone-500" />}
                <span>{copied ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
          </div>

          {/* Vietnamese Large Display Card */}
          <div className="bg-rose-50/60 rounded-2xl p-5 sm:p-6 border-2 border-rose-300 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black tracking-widest uppercase text-rose-700 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Aviso médico y alimentario:
              </span>
              <span className="text-[11px] font-bold text-stone-400 font-sans">
                Tiếng Việt (Vietnamita)
              </span>
            </div>

            <div className="text-xl sm:text-2xl font-black text-stone-950 leading-relaxed font-sans whitespace-pre-line tracking-tight">
              {currentCard.vietnameseLarge}
            </div>

            {currentCard.phonetic && (
              <div className="pt-2.5 border-t border-rose-200/80 text-xs text-stone-600 font-mono leading-relaxed">
                <strong className="text-stone-500 font-sans">Guía de pronunciación aproximada: </strong>
                {currentCard.phonetic}
              </div>
            )}
          </div>

          {/* Forbidden Ingredients Breakdown */}
          {currentCard.forbiddenIngredients && currentCard.forbiddenIngredients.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                <span className="text-rose-600 font-black">🚫</span>
                Ingredientes prohibidos para el cocinero (TUYỆT ĐỐI KHÔNG DÙNG):
              </span>
              <div className="flex flex-wrap gap-2">
                {currentCard.forbiddenIngredients.map((ing) => (
                  <span
                    key={ing}
                    className="bg-rose-100 border border-rose-300 text-rose-950 font-black text-xs sm:text-sm px-3 py-1.5 rounded-xl shadow-2xs"
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
                <span className="text-emerald-600 font-black">✅</span>
                Platos recomendados seguros (MÓN AN TOÀN NÊN DÙNG):
              </span>
              <div className="flex flex-wrap gap-2">
                {currentCard.allowedFoods.map((food) => (
                  <span
                    key={food}
                    className="bg-emerald-50 border border-emerald-300 text-emerald-950 font-bold text-xs px-3 py-1 rounded-lg"
                  >
                    {food}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Emergency Note 115 */}
          {currentCard.emergencyNote && (
            <div className="text-xs text-rose-950 bg-rose-50 p-4 rounded-2xl border border-rose-200 font-medium flex items-start gap-3">
              <HeartPulse className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong>Instrucción médica de emergencia: </strong>
                {currentCard.emergencyNote}
                <div className="mt-1 font-bold text-rose-900">
                  Teléfono de ambulancia en Vietnam: <span className="underline font-black text-rose-950">115</span> | Policía: <span className="underline font-black text-rose-950">113</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. FULLSCREEN VENDOR OVERLAY (FOR BUSY RESTAURANTS & FOOD CARTS) */}
      {isFullscreenMode && currentCard && (
        <div className="fixed inset-0 z-50 bg-stone-950/95 backdrop-blur-md flex flex-col p-4 sm:p-8 overflow-y-auto">
          <div className="max-w-3xl w-full mx-auto my-auto space-y-6">
            {/* Top Close Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-400 font-black text-sm uppercase tracking-widest">
                <ShieldAlert className="w-5 h-5 text-rose-500" />
                <span>Pantalla Completa (Tiếng Việt)</span>
              </div>
              <button
                type="button"
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
                  <span>XIN ĐỌC KỸ TRƯỚC KHI NẤU (LEER ANTES DE COCINAR)</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSpeak(currentCard.vietnameseLarge)}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-xs"
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
                <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 border-2 border-rose-300 space-y-2">
                  <span className="text-xs sm:text-sm font-black text-rose-950 uppercase tracking-wide block">
                    🚫 NGUYÊN LIỆU TUYỆT ĐỐI CẤM (PROHIBIDO USAR):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {currentCard.forbiddenIngredients.map((item) => (
                      <span
                        key={item}
                        className="bg-rose-600 text-white font-black text-sm sm:text-lg px-4 py-2 rounded-xl shadow-xs"
                      >
                        {cleanAllergenLabel(item)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Emergency Call Note */}
              <div className="text-sm font-bold text-rose-900 bg-stone-100 p-4 rounded-2xl border border-stone-300">
                🚑 <strong>Cấp cứu khẩn cấp:</strong> Nếu có dấu hiệu sốc phản vệ, vui lòng gọi cấp cứu <strong>115</strong> ngay lập tức!
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
