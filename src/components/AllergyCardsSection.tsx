import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Plus,
  Trash2,
  Volume2,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  X,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  User,
  Layers,
  Info,
  HeartPulse,
  Edit3,
  Share2,
  BookOpen,
  Loader2,
} from 'lucide-react';
import { AllergyCardData } from '../types';
import {
  speakVietnamese,
  getSavedAllergyCards,
  saveSingleAllergyCard,
  deleteSavedAllergyCard,
  saveAllergyCards,
  DEFAULT_ALLERGY_CARDS,
  subscribeSpeechState,
  stopAllSpeech,
} from '../utils/storage';
import { AudioWaveIndicator } from './AudioWaveIndicator';
import { useScrollLock } from '../hooks/useScrollLock';

interface AllergyCardsSectionProps {
  isOnline: boolean;
}

export interface PresetRestriction {
  id: string;
  emoji: string;
  labelEs: string;       // Spanish label for traveler UI
  labelVi: string;       // Vietnamese name for the restaurant card
  forbiddenVi: string[]; // Pure Vietnamese items
  forbiddenEs: string[]; // Spanish explanations
  category:
    | 'frecuentes'
    | 'frutos_secos'
    | 'marisco_pescado'
    | 'granos_gluten'
    | 'lacteos_huevos'
    | 'frutas_verduras'
    | 'especias_hierbas'
    | 'carnes'
    | 'dietas';
}

// Clean helper to strip any "Sin " or "sin " prefix
export function cleanAllergenLabel(raw: string): string {
  return raw
    .trim()
    .replace(/^(sin|no)\s+/i, '')
    .trim();
}

// Extensive standard culinary food dictionary (Spanish -> Vietnamese + Emoji)
const KNOWN_CULINARY_ITEMS: Record<string, { vi: string; viForbidden: string; emoji: string }> = {
  // Frutos secos y semillas
  cacahuete: { vi: 'ĐẬU PHỘNG (LẠC)', viForbidden: 'Đậu phộng / Lạc, dầu lạc', emoji: '🥜' },
  cacahuetes: { vi: 'ĐẬU PHỘNG (LẠC)', viForbidden: 'Đậu phộng / Lạc, dầu lạc', emoji: '🥜' },
  mani: { vi: 'ĐẬU PHỘNG (LẠC)', viForbidden: 'Đậu phộng / Lạc', emoji: '🥜' },
  maní: { vi: 'ĐẬU PHỘNG (LẠC)', viForbidden: 'Đậu phộng / Lạc', emoji: '🥜' },
  frutos: { vi: 'CÁC LOẠI HẠT', viForbidden: 'Hạt điều, óc chó, hạnh nhân', emoji: '🥜' },
  nueces: { vi: 'QUẢ ÓC CHÓ & CÁC LOẠI HẠT', viForbidden: 'Hạt óc chó, hạt dẻ', emoji: '🌰' },
  nuez: { vi: 'QUẢ ÓC CHÓ & CÁC LOẠI HẠT', viForbidden: 'Hạt óc chó, hạt dẻ', emoji: '🌰' },
  anacardos: { vi: 'HẠT ĐIỀU', viForbidden: 'Hạt điều', emoji: '🥜' },
  anacardo: { vi: 'HẠT ĐIỀU', viForbidden: 'Hạt điều', emoji: '🥜' },
  almendras: { vi: 'HẠNH NHÂN', viForbidden: 'Hạt hạnh nhân', emoji: '🌰' },
  almendra: { vi: 'HẠNH NHÂN', viForbidden: 'Hạt hạnh nhân', emoji: '🌰' },
  avellanas: { vi: 'HẠT PHỈ', viForbidden: 'Hạt phỉ, hạt dẻ', emoji: '🌰' },
  avellana: { vi: 'HẠT PHỈ', viForbidden: 'Hạt phỉ', emoji: '🌰' },
  pistachos: { vi: 'HẠT DẺ CƯỜI (PISTACHIO)', viForbidden: 'Hạt dẻ cười', emoji: '🥜' },
  pistacho: { vi: 'HẠT DẺ CƯỜI (PISTACHIO)', viForbidden: 'Hạt dẻ cười', emoji: '🥜' },
  sesamo: { vi: 'HẠT MÈ / VỪNG & DẦU MÈ', viForbidden: 'Hạt mè, dầu mè', emoji: '🌱' },
  sésamo: { vi: 'HẠT MÈ / VỪNG & DẦU MÈ', viForbidden: 'Hạt mè, dầu mè', emoji: '🌱' },
  ajonjoli: { vi: 'HẠT MÈ / VỪNG & DẦU MÈ', viForbidden: 'Hạt mè, dầu mè', emoji: '🌱' },
  ajonjolí: { vi: 'HẠT MÈ / VỪNG & DẦU MÈ', viForbidden: 'Hạt mè, dầu mè', emoji: '🌱' },
  amapola: { vi: 'HẠT ANH TÚC', viForbidden: 'Hạt anh túc', emoji: '🌱' },
  girasol: { vi: 'HẠT HƯỚNG DƯƠNG', viForbidden: 'Hạt hướng dương, dầu hướng dương', emoji: '🌻' },
  calabaza: { vi: 'HẠT BÍ & BÍ ĐỎ', viForbidden: 'Hạt bí, bí đỏ', emoji: '🎃' },

  // Marisco y pescado
  marisco: { vi: 'HẢI SẢN (TÔM, CUA, MỰC, SÒ)', viForbidden: 'Tôm, cua, mực, nghêu, sò', emoji: '🦐' },
  mariscos: { vi: 'HẢI SẢN (TÔM, CUA, MỰC, SÒ)', viForbidden: 'Tôm, cua, mực, nghêu, sò', emoji: '🦐' },
  gambas: { vi: 'TÔM / TÉP', viForbidden: 'Tôm tươi, tép khô', emoji: '🦐' },
  gamba: { vi: 'TÔM / TÉP', viForbidden: 'Tôm tươi, tép khô', emoji: '🦐' },
  langostinos: { vi: 'TÔM SÚ / TÔM CÀNG', viForbidden: 'Tôm sú, tôm càng', emoji: '🦐' },
  langostino: { vi: 'TÔM SÚ', viForbidden: 'Tôm sú', emoji: '🦐' },
  camarones: { vi: 'TÔM / TÉP', viForbidden: 'Tôm tươi, tép khô', emoji: '🦐' },
  camaron: { vi: 'TÔM / TÉP', viForbidden: 'Tôm tươi, tép khô', emoji: '🦐' },
  calamar: { vi: 'MỰC TƯƠI & MỰC KHÔ', viForbidden: 'Mực tươi, mực khô', emoji: '🦑' },
  calamares: { vi: 'MỰC TƯƠI & MỰC KHÔ', viForbidden: 'Mực tươi, mực khô', emoji: '🦑' },
  pulpo: { vi: 'BẠCH TUỘC', viForbidden: 'Bạch tuộc tươi', emoji: '🐙' },
  cangrejo: { vi: 'CUA / GHẸ', viForbidden: 'Cua đồng, ghẹ biển', emoji: '🦀' },
  almejas: { vi: 'NGHÊU / NGAO', viForbidden: 'Nghêu, ngao biển', emoji: '🦪' },
  mejillones: { vi: 'VẸM XANH', viForbidden: 'Vẹm xanh, chem chép', emoji: '🦪' },
  ostras: { vi: 'HÀU SỮA', viForbidden: 'Hàu biển', emoji: '🦪' },
  pescado: { vi: 'CÁ & NƯỚC MẮM CÁ', viForbidden: 'Cá tươi, nước mắm cá', emoji: '🐟' },
  pescados: { vi: 'CÁ & NƯỚC MẮM CÁ', viForbidden: 'Cá tươi, nước mắm cá', emoji: '🐟' },
  atun: { vi: 'CÁ NGỪ', viForbidden: 'Cá ngừ', emoji: '🐟' },
  atún: { vi: 'CÁ NGỪ', viForbidden: 'Cá ngừ', emoji: '🐟' },
  salmon: { vi: 'CÁ HỒI', viForbidden: 'Cá hồi', emoji: '🐟' },
  salmón: { vi: 'CÁ HỒI', viForbidden: 'Cá hồi', emoji: '🐟' },
  salsa_pescado: { vi: 'NƯỚC MẮM CÁ TRUYỀN THỐNG', viForbidden: 'Nước mắm cá', emoji: '🐟' },

  // Granos, cereales y gluten
  gluten: { vi: 'GLUTEN & BỘT MÌ', viForbidden: 'Bột mì, bánh mì, mì sợi vàng', emoji: '🌾' },
  trigo: { vi: 'LÚA MÌ & BỘT MÌ', viForbidden: 'Bột mì, bánh mì', emoji: '🌾' },
  celiaco: { vi: 'DỊ ỨNG GLUTEN NGHIÊM NGẶT', viForbidden: 'Bột mì, mì gói, bánh mì', emoji: '🩺' },
  celíaco: { vi: 'DỊ ỨNG GLUTEN NGHIÊM NGẶT', viForbidden: 'Bột mì, mì gói, bánh mì', emoji: '🩺' },
  pan: { vi: 'BÁNH MÌ BỘT MÌ', viForbidden: 'Bánh mì làm từ bột mì', emoji: '🥖' },
  avena: { vi: 'YẾN MẠCH', viForbidden: 'Yến mạch', emoji: '🌾' },
  cebada: { vi: 'LÚA MẠCH', viForbidden: 'Lúa mạch, bia mạch', emoji: '🌾' },
  centeno: { vi: 'LÚA MẠCH ĐEN', viForbidden: 'Lúa mạch đen', emoji: '🌾' },
  maiz: { vi: 'BẮP / NGÔ', viForbidden: 'Bắp ngô, tinh bột bắp', emoji: '🌽' },
  maíz: { vi: 'BẮP / NGÔ', viForbidden: 'Bắp ngô, tinh bột bắp', emoji: '🌽' },
  arroz: { vi: 'GẠO & CƠM', viForbidden: 'Gạo, bột gạo', emoji: '🍚' },
  soja: { vi: 'ĐẬU NÀNH & XÌ DẦU', viForbidden: 'Đậu nành, đậu phụ, xì dầu', emoji: '🫘' },

  // Lácteos y huevos
  lactosa: { vi: 'SỮA BÒ & SỮA ĐẶC', viForbidden: 'Sữa tươi, sữa đặc Ông Thọ, bơ', emoji: '🥛' },
  leche: { vi: 'SỮA BÒ & SỮA ĐẶC', viForbidden: 'Sữa tươi, sữa đặc, phô mai', emoji: '🥛' },
  queso: { vi: 'PHÔ MAI & BƠ', viForbidden: 'Phô mai, kem béo, bơ', emoji: '🧀' },
  mantequilla: { vi: 'BƠ ĐỘNG VẬT', viForbidden: 'Bơ thực vật, bơ động vật', emoji: '🧈' },
  nata: { vi: 'KEM TƯƠI / WHIPPING CREAM', viForbidden: 'Kem béo từ sữa', emoji: '🥛' },
  yogur: { vi: 'SỮA CHUA', viForbidden: 'Sữa chua', emoji: '🥛' },
  huevo: { vi: 'TRỨNG (GÀ, VỊT, CÚT)', viForbidden: 'Trứng gà, trứng vịt, sốt trứng', emoji: '🥚' },
  huevos: { vi: 'TRỨNG (GÀ, VỊT, CÚT)', viForbidden: 'Trứng gà, trứng vịt, sốt trứng', emoji: '🥚' },

  // Especias, hierbas y condimentos
  msg: { vi: 'BỘT NGỌT / MÌ CHÍNH (AJINOMOTO)', viForbidden: 'Bột ngọt, mì chính, hạt nêm Knorr', emoji: '🧂' },
  glutamato: { vi: 'BỘT NGỌT / MÌ CHÍNH (AJINOMOTO)', viForbidden: 'Bột ngọt, mì chính, hạt nêm Knorr', emoji: '🧂' },
  picante: { vi: 'ỚT TƯƠI & VỊ CAY', viForbidden: 'Ớt tươi, tương ớt, sa tế', emoji: '🌶️' },
  chile: { vi: 'ỚT TƯƠI & VỊ CAY', viForbidden: 'Ớt tươi, sa tế ớt', emoji: '🌶️' },
  guindilla: { vi: 'ỚT TƯƠI', viForbidden: 'Ớt tươi thái lát', emoji: '🌶️' },
  cilantro: { vi: 'RAU MÙI / NGÒ RÍ', viForbidden: 'Rau mùi, ngò rí, ngò gai', emoji: '🌿' },
  perejil: { vi: 'NGÒ TÂY (PARSLEY)', viForbidden: 'Ngò tây', emoji: '🌿' },
  albahaca: { vi: 'HÚNG QUẾ', viForbidden: 'Rau húng quế', emoji: '🌿' },
  menta: { vi: 'HÚNG LỦI / BẠC HÀ', viForbidden: 'Rau húng lủi, lá bạc hà', emoji: '🌿' },
  oregano: { vi: 'KINH GIỚI / OREGANO', viForbidden: 'Lá oregano', emoji: '🌿' },
  orégano: { vi: 'KINH GIỚI / OREGANO', viForbidden: 'Lá oregano', emoji: '🌿' },
  tomillo: { vi: 'XẠ HƯƠNG / THYME', viForbidden: 'Cây xạ hương', emoji: '🌿' },
  romero: { vi: 'HƯƠNG THẢO / ROSEMARY', viForbidden: 'Lá hương thảo', emoji: '🌿' },
  ajo: { vi: 'TỎI TƯƠI & HÀNH', viForbidden: 'Tỏi tươi, hành phi', emoji: '🧄' },
  cebolla: { vi: 'HÀNH TÂY & HÀNH LÁ', viForbidden: 'Hành tây, hành lá, hành phi', emoji: '🧅' },
  cebolleta: { vi: 'HÀNH LÁ', viForbidden: 'Hành lá tươi, hành phi', emoji: '🧅' },
  puerro: { vi: 'TỎI TÂY (LEEK)', viForbidden: 'Hành boa-rô / Tỏi tây', emoji: '🥬' },
  jengibre: { vi: 'GỪNG TƯƠI', viForbidden: 'Gừng tươi', emoji: '🫚' },
  curcuma: { vi: 'NGHỆ TƯƠI & BỘT NGHỆ', viForbidden: 'Củ nghệ, bột nghệ', emoji: '🫚' },
  cúrcuma: { vi: 'NGHỆ TƯƠI & BỘT NGHỆ', viForbidden: 'Củ nghệ, bột nghệ', emoji: '🫚' },
  canela: { vi: 'QUẾ & BỘT QUẾ', viForbidden: 'Vỏ quế, bột quế', emoji: '🪵' },
  mostaza: { vi: 'MÙ TẠT', viForbidden: 'Mù tạt vàng, mù tạt xanh', emoji: '🟡' },
  pimienta: { vi: 'TIÊU ĐEN / TIÊU TRẮNG', viForbidden: 'Hạt tiêu, bột tiêu', emoji: '🧂' },
  comino: { vi: 'THÌ LÀ AI CẬP (CUMIN)', viForbidden: 'Hạt thì là Ai Cập', emoji: '🧂' },

  // Verduras y hortalizas
  apio: { vi: 'CẦN TÂY', viForbidden: 'Cần tây tươi, bột cần tây', emoji: '🥬' },
  tomate: { vi: 'CÀ CHUA', viForbidden: 'Cà chua tươi, sốt cà chua', emoji: '🍅' },
  tomates: { vi: 'CÀ CHUA', viForbidden: 'Cà chua tươi', emoji: '🍅' },
  pimiento: { vi: 'ỚT CHUÔNG / ỚT ĐÀ LẠT', viForbidden: 'Ớt chuông ngọt', emoji: '🫑' },
  pimientos: { vi: 'ỚT CHUÔNG', viForbidden: 'Ớt chuông', emoji: '🫑' },
  berenjena: { vi: 'CÀ TÍM', viForbidden: 'Cà tím', emoji: '🍆' },
  pepino: { vi: 'DƯA LEO / DƯA CHUỘT', viForbidden: 'Dưa leo tươi', emoji: '🥒' },
  zanahoria: { vi: 'CÀ RỐT', viForbidden: 'Cà rốt', emoji: '🥕' },
  zanahorias: { vi: 'CÀ RỐT', viForbidden: 'Cà rốt', emoji: '🥕' },
  patata: { vi: 'KHOAI TÂY', viForbidden: 'Khoai tây', emoji: '🥔' },
  patatas: { vi: 'KHOAI TÂY', viForbidden: 'Khoai tây', emoji: '🥔' },
  boniato: { vi: 'KHOAI LANG', viForbidden: 'Khoai lang', emoji: '🍠' },
  setas: { vi: 'NẤM CÁC LOẠI', viForbidden: 'Nấm rơm, nấm đông cô', emoji: '🍄' },
  champiñones: { vi: 'NẤM CÁC LOẠI', viForbidden: 'Nấm rơm, nấm hương', emoji: '🍄' },
  champinones: { vi: 'NẤM CÁC LOẠI', viForbidden: 'Nấm rơm, nấm hương', emoji: '🍄' },
  espinacas: { vi: 'RAU CHÂN VỊT / CẢI BÓ XÔI', viForbidden: 'Cải bó xôi', emoji: '🥬' },
  lechuga: { vi: 'XÀ LÁCH', viForbidden: 'Rau xà lách', emoji: '🥬' },
  aguacate: { vi: 'QUẢ BƠ', viForbidden: 'Quả bơ tươi, sinh tố bơ', emoji: '🥑' },
  remolacha: { vi: 'CỦ DỀN', viForbidden: 'CỦ dền đỏ', emoji: '🍠' },

  // Frutas
  kiwi: { vi: 'QUẢ KIWI', viForbidden: 'Quả kiwi tươi', emoji: '🥝' },
  pina: { vi: 'QUẢ DỨA (THƠM)', viForbidden: 'Quả dứa / thơm', emoji: '🍍' },
  piña: { vi: 'QUẢ DỨA (THƠM)', viForbidden: 'Quả dứa / thơm', emoji: '🍍' },
  fresas: { vi: 'DÂU TÂY', viForbidden: 'Dâu tây', emoji: '🍓' },
  fresa: { vi: 'DÂU TÂY', viForbidden: 'Dâu tây', emoji: '🍓' },
  platano: { vi: 'CHUỐI', viForbidden: 'Quả chuối', emoji: '🍌' },
  plátano: { vi: 'CHUỐI', viForbidden: 'Quả chuối', emoji: '🍌' },
  manzana: { vi: 'TÁO', viForbidden: 'Quả táo', emoji: '🍎' },
  mango: { vi: 'XOÀI', viForbidden: 'Quả xoài', emoji: '🥭' },
  limon: { vi: 'CHANH VÀNG / CHANH TÂY', viForbidden: 'Chanh vàng', emoji: '🍋' },
  limón: { vi: 'CHANH VÀNG', viForbidden: 'Chanh vàng', emoji: '🍋' },
  naranja: { vi: 'CAM', viForbidden: 'Quả cam, nước cam', emoji: '🍊' },
  miel: { vi: 'MẬT ONG', viForbidden: 'Mật ong nguyên chất', emoji: '🍯' },

  // Carnes
  cerdo: { vi: 'THỊT HEO (LỢN) & MỠ HEO', viForbidden: 'Thịt heo, mỡ heo, chả lụa', emoji: '🥩' },
  ternera: { vi: 'THỊT BÒ', viForbidden: 'Thịt bò, nước dùng ninh xương bò', emoji: '🐂' },
  pollo: { vi: 'THỊT GÀ', viForbidden: 'Thịt gà, nước luộc gà', emoji: '🍗' },
  pato: { vi: 'THỊT VỊT', viForbidden: 'Thịt vịt', emoji: '🦆' },
  cordero: { vi: 'THỊT CỪU', viForbidden: 'Thịt cừu', emoji: '🥩' },

  // Dietas
  vegetariano: { vi: 'ĂN CHAY THANH TỊNH (KHÔNG THỊT CÁ)', viForbidden: 'Thịt các loại, cá, hải sản, mỡ động vật', emoji: '🥗' },
  vegano: { vi: 'THUẦN CHAY 100% (KHÔNG TRỨNG SỮA MỠ)', viForbidden: 'Thịt, cá, trứng, sữa, mỡ động vật, mật ong', emoji: '🌱' },
  halal: { vi: 'KHÔNG THỊT HEO & MỠ HEO (HALAL)', viForbidden: 'Thịt heo, mỡ heo, thịt không Halal', emoji: '🕌' },
};

// Rich preset catalog with strictly separated Spanish UI and pure Vietnamese translations
export const BASE_PRESET_RESTRICTIONS: PresetRestriction[] = [
  // 1. Frecuentes (Top most common)
  {
    id: 'peanuts',
    emoji: '🥜',
    labelEs: 'Cacahuetes y frutos secos',
    labelVi: 'Đậu phộng (lạc) & các loại hạt',
    forbiddenVi: ['Đậu phộng / Lạc', 'Dầu lạc', 'Hạt điều', 'Bơ đậu phộng'],
    forbiddenEs: ['Cacahuetes / Maní', 'Aceite de cacahuete', 'Anacardos', 'Mantequilla de cacahuete'],
    category: 'frecuentes',
  },
  {
    id: 'seafood',
    emoji: '🦐',
    labelEs: 'Marisco, gambas y calamar',
    labelVi: 'Hải sản (tôm, cua, mực, sò)',
    forbiddenVi: ['Tôm / Tép', 'Mực tươi', 'Cua / Ghẹ', 'Nước luộc hải sản'],
    forbiddenEs: ['Gambas / Camarones', 'Calamar', 'Cangrejo', 'Caldos de marisco'],
    category: 'frecuentes',
  },
  {
    id: 'gluten',
    emoji: '🌾',
    labelEs: 'Gluten / Trigo / Celíaco',
    labelVi: 'Gluten & bột mì',
    forbiddenVi: ['Bột mì', 'Bánh mì', 'Mì gói / Mì sợi vàng', 'Bột chiên xù'],
    forbiddenEs: ['Harina de trigo', 'Pan (Bánh mì)', 'Fideos amarillos de trigo', 'Rebozados'],
    category: 'frecuentes',
  },
  {
    id: 'lactose',
    emoji: '🥛',
    labelEs: 'Lactosa y leche de vaca',
    labelVi: 'Sữa bò & sữa đặc',
    forbiddenVi: ['Sữa tươi bò', 'Sữa đặc Ông Thọ', 'Bơ động vật', 'Phô mai'],
    forbiddenEs: ['Leche de vaca', 'Leche condensada', 'Mantequilla', 'Queso'],
    category: 'frecuentes',
  },
  {
    id: 'egg',
    emoji: '🥚',
    labelEs: 'Huevo (gallina, pato, codorniz)',
    labelVi: 'Trứng các loại (gà, vịt, cút)',
    forbiddenVi: ['Trứng gà / Trứng vịt', 'Sốt trứng mayonesa', 'Trứng cút'],
    forbiddenEs: ['Huevo de gallina / pato', 'Mayonesa con huevo', 'Huevos de codorniz'],
    category: 'frecuentes',
  },
  {
    id: 'soy',
    emoji: '🫘',
    labelEs: 'Soja y salsa de soja',
    labelVi: 'Đậu nành & xì dầu',
    forbiddenVi: ['Hạt đậu nành', 'Đậu phụ / Đậu hũ', 'Xì dầu / Nước tương'],
    forbiddenEs: ['Habas de soja', 'Tofu (si es alérgico)', 'Salsa de soja'],
    category: 'frecuentes',
  },
  {
    id: 'sesame',
    emoji: '🌱',
    labelEs: 'Sésamo y aceite de sésamo',
    labelVi: 'Hạt mè (vừng) & dầu mè',
    forbiddenVi: ['Hạt mè / Vừng', 'Dầu mè', 'Muối vừng'],
    forbiddenEs: ['Semillas de sésamo', 'Aceite de sésamo', 'Condimento de sésamo'],
    category: 'frecuentes',
  },
  {
    id: 'celery_freq',
    emoji: '🥬',
    labelEs: 'Apio',
    labelVi: 'Cần tây tươi & bột cần tây',
    forbiddenVi: ['Cần tây tươi', 'Bột cần tây', 'Nước ép cần tây'],
    forbiddenEs: ['Apio fresco', 'Polvo de apio', 'Caldos con apio'],
    category: 'frecuentes',
  },
  {
    id: 'mustard_freq',
    emoji: '🟡',
    labelEs: 'Mostaza',
    labelVi: 'Mù tạt (Mustard)',
    forbiddenVi: ['Mù tạt vàng', 'Mù tạt xanh', 'Sốt mù tạt'],
    forbiddenEs: ['Mostaza', 'Granos de mostaza', 'Salsas de mostaza'],
    category: 'frecuentes',
  },
  {
    id: 'msg_freq',
    emoji: '🧂',
    labelEs: 'Glutamato / MSG (Mì chính)',
    labelVi: 'Bột ngọt / Mì chính (Ajinomoto)',
    forbiddenVi: ['Bột ngọt (Ajinomoto)', 'Mì chính', 'Hạt nêm Knorr'],
    forbiddenEs: ['Glutamato monosódico', 'Potenciador de sabor Ajinomoto', 'Pastillas de caldo'],
    category: 'frecuentes',
  },

  // 2. Frutos Secos y Semillas
  {
    id: 'cashews',
    emoji: '🥜',
    labelEs: 'Anacardos (Hạt điều)',
    labelVi: 'Hạt điều',
    forbiddenVi: ['Hạt điều', 'Dầu hạt điều', 'Bơ hạt điều'],
    forbiddenEs: ['Anacardos', 'Aceite de anacardo'],
    category: 'frutos_secos',
  },
  {
    id: 'walnuts',
    emoji: '🌰',
    labelEs: 'Nueces (Óc chó)',
    labelVi: 'Quả óc chó',
    forbiddenVi: ['Hạt óc chó', 'Dầu óc chó'],
    forbiddenEs: ['Nueces', 'Aceite de nuez'],
    category: 'frutos_secos',
  },
  {
    id: 'almonds',
    emoji: '🌰',
    labelEs: 'Almendras (Hạnh nhân)',
    labelVi: 'Hạnh nhân',
    forbiddenVi: ['Hạt hạnh nhân', 'Sữa hạnh nhân', 'Bột hạnh nhân'],
    forbiddenEs: ['Almendras', 'Leche de almendras'],
    category: 'frutos_secos',
  },
  {
    id: 'hazelnuts',
    emoji: '🌰',
    labelEs: 'Avellanas (Hạt phỉ)',
    labelVi: 'Hạt phỉ',
    forbiddenVi: ['Hạt phỉ', 'Kem hạt phỉ'],
    forbiddenEs: ['Avellanas', 'Crema de avellana'],
    category: 'frutos_secos',
  },
  {
    id: 'pistachios',
    emoji: '🥜',
    labelEs: 'Pistachos (Dẻ cười)',
    labelVi: 'Hạt dẻ cười',
    forbiddenVi: ['Hạt dẻ cười (Pistachio)'],
    forbiddenEs: ['Pistachos'],
    category: 'frutos_secos',
  },
  {
    id: 'sesame_nuts',
    emoji: '🌱',
    labelEs: 'Sésamo y semillas de sésamo',
    labelVi: 'Hạt mè / Vừng & dầu mè',
    forbiddenVi: ['Hạt mè / Vừng', 'Dầu mè', 'Muối vừng'],
    forbiddenEs: ['Semillas de sésamo', 'Aceite de sésamo'],
    category: 'frutos_secos',
  },
  {
    id: 'sunflower_seeds',
    emoji: '🌻',
    labelEs: 'Semillas de girasol y calabaza',
    labelVi: 'Hạt hướng dương & hạt bí',
    forbiddenVi: ['Hạt hướng dương', 'Hạt bí đỏ'],
    forbiddenEs: ['Pipás de girasol', 'Semillas de calabaza'],
    category: 'frutos_secos',
  },

  // 3. Marisco y Pescado
  {
    id: 'shrimp_prawns',
    emoji: '🦐',
    labelEs: 'Gambas, langostinos y camarones',
    labelVi: 'Tôm, tép, tôm sú',
    forbiddenVi: ['Tôm tươi', 'Tép khô', 'Tôm sú', 'Tôm càng'],
    forbiddenEs: ['Gambas', 'Langostinos', 'Camarones secos'],
    category: 'marisco_pescado',
  },
  {
    id: 'squid_octopus',
    emoji: '🦑',
    labelEs: 'Calamar, sepia y pulpo',
    labelVi: 'Mực & bạch tuộc',
    forbiddenVi: ['Mực tươi', 'Mực khô', 'Bạch tuộc'],
    forbiddenEs: ['Calamar fresco', 'Calamar seco', 'Pulpo'],
    category: 'marisco_pescado',
  },
  {
    id: 'crab',
    emoji: '🦀',
    labelEs: 'Cangrejo (Cua / Ghẹ)',
    labelVi: 'Cua đồng & ghẹ biển',
    forbiddenVi: ['Cua đồng', 'Ghẹ biển', 'Thịt cua'],
    forbiddenEs: ['Cangrejo de río', 'Cangrejo de mar', 'Carne de cangrejo'],
    category: 'marisco_pescado',
  },
  {
    id: 'clams_mussels',
    emoji: '🦪',
    labelEs: 'Almejas, mejillones y ostras',
    labelVi: 'Nghêu, sò, vẹm xanh, hàu',
    forbiddenVi: ['Nghêu / Ngao', 'Sò huyết', 'Vẹm xanh', 'Hàu sữa'],
    forbiddenEs: ['Almejas', 'Mejillones', 'Ostras', 'Berberechos'],
    category: 'marisco_pescado',
  },
  {
    id: 'fish_fresh',
    emoji: '🐟',
    labelEs: 'Pescado fresco y caldos de pescado',
    labelVi: 'Cá tươi & nước dùng cá',
    forbiddenVi: ['Cá tươi các loại', 'Nước ninh xương cá', 'Chả cá'],
    forbiddenEs: ['Pescado fresco', 'Caldo de pescado', 'Pasteles de pescado'],
    category: 'marisco_pescado',
  },
  {
    id: 'fish_sauce',
    emoji: '🍶',
    labelEs: 'Salsa de pescado tradicional (Nước mắm)',
    labelVi: 'Nước mắm cá truyền thống',
    forbiddenVi: ['Nước mắm cá', 'Cá khô', 'Mắm tép'],
    forbiddenEs: ['Salsa de pescado vietnamita', 'Pescado seco', 'Pasta de pescado'],
    category: 'marisco_pescado',
  },
  {
    id: 'shrimp_paste',
    emoji: '🟣',
    labelEs: 'Pasta de gamba fermentada (Mắm tôm)',
    labelVi: 'Mắm tôm & mắm ruốc',
    forbiddenVi: ['Mắm tôm', 'Mắm ruốc', 'Mắm tép'],
    forbiddenEs: ['Pasta morada de gamba (Mắm tôm)', 'Pasta de camarón'],
    category: 'marisco_pescado',
  },
  {
    id: 'tuna_salmon',
    emoji: '🐠',
    labelEs: 'Atún y Salmón',
    labelVi: 'Cá ngừ & cá hồi',
    forbiddenVi: ['Cá ngừ', 'Cá hồi'],
    forbiddenEs: ['Atún', 'Salmón'],
    category: 'marisco_pescado',
  },

  // 4. Granos, Cereales y Gluten
  {
    id: 'wheat_bread',
    emoji: '🥖',
    labelEs: 'Pan tradicional de trigo (Bánh mì)',
    labelVi: 'Bánh mì làm từ bột mì',
    forbiddenVi: ['Bánh mì bột mì', 'Vỏ bánh bao', 'Bánh ngọt bột mì'],
    forbiddenEs: ['Pan de bocadillo (Bánh mì)', 'Masa de pan al vapor'],
    category: 'granos_gluten',
  },
  {
    id: 'egg_noodles',
    emoji: '🍜',
    labelEs: 'Fideos amarillos de trigo (Mì sợi / Mì gói)',
    labelVi: 'Mì sợi vàng & mì gói',
    forbiddenVi: ['Mì trứng bột mì', 'Mì gói / Mì tôm', 'Mì hoành thánh'],
    forbiddenEs: ['Fideos de trigo amarillos', 'Fideos instantáneos', 'Pasta wonton'],
    category: 'granos_gluten',
  },
  {
    id: 'soy_gluten_cat',
    emoji: '🫘',
    labelEs: 'Soja, tofu y salsa de soja',
    labelVi: 'Đậu nành, đậu phụ & xì dầu',
    forbiddenVi: ['Hạt đậu nành', 'Đậu phụ', 'Nước tương / Xì dầu'],
    forbiddenEs: ['Soja', 'Tofu', 'Salsa de soja'],
    category: 'granos_gluten',
  },
  {
    id: 'oats_barley',
    emoji: '🌾',
    labelEs: 'Avena, cebada y centeno',
    labelVi: 'Yến mạch & lúa mạch',
    forbiddenVi: ['Yến mạch', 'Lúa mạch', 'Lúa mạch đen'],
    forbiddenEs: ['Avena', 'Cebada', 'Centeno'],
    category: 'granos_gluten',
  },
  {
    id: 'corn',
    emoji: '🌽',
    labelEs: 'Maíz y almidón de maíz',
    labelVi: 'Bắp ngô & tinh bột bắp',
    forbiddenVi: ['Bắp ngô tươi', 'Bột bắp ngô'],
    forbiddenEs: ['Maíz dulce', 'Almidón de maíz'],
    category: 'granos_gluten',
  },

  // 5. Lácteos y Huevos
  {
    id: 'condensed_milk',
    emoji: '🥫',
    labelEs: 'Leche condensada (en café vietnamita)',
    labelVi: 'Sữa đặc Ông Thọ',
    forbiddenVi: ['Sữa đặc có đường', 'Sữa đặc pha cà phê'],
    forbiddenEs: ['Leche condensada dulce', 'Café con leche condensada'],
    category: 'lacteos_huevos',
  },
  {
    id: 'milk_cow',
    emoji: '🥛',
    labelEs: 'Leche de vaca y derivados lácteos',
    labelVi: 'Sữa tươi bò & chế phẩm sữa',
    forbiddenVi: ['Sữa tươi bò', 'Váng sữa', 'Kem sữa tươi'],
    forbiddenEs: ['Leche de vaca', 'Nata', 'Crema de leche'],
    category: 'lacteos_huevos',
  },
  {
    id: 'cheese_dairy',
    emoji: '🧀',
    labelEs: 'Queso y nata',
    labelVi: 'Phô mai & kem béo',
    forbiddenVi: ['Phô mai các loại', 'Kem tươi whipping'],
    forbiddenEs: ['Queso', 'Nata para cocinar'],
    category: 'lacteos_huevos',
  },
  {
    id: 'butter',
    emoji: '🧈',
    labelEs: 'Mantequilla y margarina',
    labelVi: 'Bơ thực vật & bơ động vật',
    forbiddenVi: ['Bơ thực vật', 'Bơ động vật', 'Sốt bơ tỏi'],
    forbiddenEs: ['Mantequilla', 'Margarina', 'Salsa de mantequilla'],
    category: 'lacteos_huevos',
  },
  {
    id: 'egg_poultry',
    emoji: '🥚',
    labelEs: 'Huevos de gallina, pato y codorniz',
    labelVi: 'Trứng gà, vịt, cút',
    forbiddenVi: ['Trứng gà', 'Trứng vịt', 'Trứng cút', 'Mayonesa trứng'],
    forbiddenEs: ['Huevos de gallina', 'Huevos de pato', 'Huevos de codorniz'],
    category: 'lacteos_huevos',
  },

  // 6. Verduras y Frutas
  {
    id: 'celery_veg',
    emoji: '🥬',
    labelEs: 'Apio (Cần tây)',
    labelVi: 'Cần tây',
    forbiddenVi: ['Cần tây tươi', 'Bột cần tây'],
    forbiddenEs: ['Apio'],
    category: 'frutas_verduras',
  },
  {
    id: 'tomato',
    emoji: '🍅',
    labelEs: 'Tomate y salsa de tomate',
    labelVi: 'Cà chua tươi & sốt cà chua',
    forbiddenVi: ['Cà chua tươi', 'Sốt cà chua'],
    forbiddenEs: ['Tomate fresco', 'Salsa de tomate'],
    category: 'frutas_verduras',
  },
  {
    id: 'peppers',
    emoji: '🫑',
    labelEs: 'Pimientos y pimiento dulce',
    labelVi: 'Ớt chuông ngọt',
    forbiddenVi: ['Ớt chuông ngọt Đà Lạt'],
    forbiddenEs: ['Pimiento rojo/verde'],
    category: 'frutas_verduras',
  },
  {
    id: 'eggplant',
    emoji: '🍆',
    labelEs: 'Berenjena (Cà tím)',
    labelVi: 'Cà tím',
    forbiddenVi: ['Cà tím'],
    forbiddenEs: ['Berenjena'],
    category: 'frutas_verduras',
  },
  {
    id: 'cucumber',
    emoji: '🥒',
    labelEs: 'Pepino (Dưa leo)',
    labelVi: 'Dưa leo / Dưa chuột',
    forbiddenVi: ['Dưa leo tươi'],
    forbiddenEs: ['Pepino fresco'],
    category: 'frutas_verduras',
  },
  {
    id: 'carrot',
    emoji: '🥕',
    labelEs: 'Zanahoria (Cà rốt)',
    labelVi: 'Cà rốt',
    forbiddenVi: ['Cà rốt tươi', 'Cà rốt chua'],
    forbiddenEs: ['Zanahoria'],
    category: 'frutas_verduras',
  },
  {
    id: 'potato',
    emoji: '🥔',
    labelEs: 'Patata y boniato',
    labelVi: 'Khoai tây & khoai lang',
    forbiddenVi: ['Khoai tây', 'Khoai lang'],
    forbiddenEs: ['Patata', 'Boniato'],
    category: 'frutas_verduras',
  },
  {
    id: 'mushrooms',
    emoji: '🍄',
    labelEs: 'Setas y champiñones (Nấm)',
    labelVi: 'Nấm các loại',
    forbiddenVi: ['Nấm rơm', 'Nấm hương / đông cô', 'Nấm kim châm'],
    forbiddenEs: ['Champiñones', 'Setas shiitake', 'Setas de paja'],
    category: 'frutas_verduras',
  },
  {
    id: 'avocado',
    emoji: '🥑',
    labelEs: 'Aguacate (Quả bơ)',
    labelVi: 'Quả bơ tươi & sinh tố bơ',
    forbiddenVi: ['Quả bơ tươi', 'Sinh tố bơ'],
    forbiddenEs: ['Aguacate fresco', 'Batido de aguacate'],
    category: 'frutas_verduras',
  },
  {
    id: 'kiwi_fruit',
    emoji: '🥝',
    labelEs: 'Kiwi (Quả kiwi)',
    labelVi: 'Quả kiwi',
    forbiddenVi: ['Quả kiwi tươi'],
    forbiddenEs: ['Kiwi'],
    category: 'frutas_verduras',
  },
  {
    id: 'pineapple',
    emoji: '🍍',
    labelEs: 'Piña (Quả dứa / thơm)',
    labelVi: 'Quả dứa / thơm',
    forbiddenVi: ['Quả dứa tươi', 'Canh chua dứa'],
    forbiddenEs: ['Piña fresca', 'Sopa agridulce con piña'],
    category: 'frutas_verduras',
  },
  {
    id: 'strawberries',
    emoji: '🍓',
    labelEs: 'Fresas (Dâu tây)',
    labelVi: 'Dâu tây',
    forbiddenVi: ['Dâu tây tươi'],
    forbiddenEs: ['Fresas'],
    category: 'frutas_verduras',
  },
  {
    id: 'banana',
    emoji: '🍌',
    labelEs: 'Plátano (Chuối)',
    labelVi: 'Quả chuối',
    forbiddenVi: ['Quả chuối tươi', 'Chuối chiên'],
    forbiddenEs: ['Plátano fresco', 'Plátano frito'],
    category: 'frutas_verduras',
  },
  {
    id: 'mango_fruit',
    emoji: '🥭',
    labelEs: 'Mango (Quả xoài)',
    labelVi: 'Quả xoài',
    forbiddenVi: ['Xoài chín', 'Xoài xanh làm gỏi'],
    forbiddenEs: ['Mango maduro', 'Mango verde en ensalada'],
    category: 'frutas_verduras',
  },

  // 7. Hierbas y Especias
  {
    id: 'msg_spice',
    emoji: '🧂',
    labelEs: 'Glutamato / MSG (Bột ngọt / Ajinomoto)',
    labelVi: 'Bột ngọt / Mì chính (Ajinomoto)',
    forbiddenVi: ['Bột ngọt (Ajinomoto)', 'Mì chính', 'Hạt nêm Knorr'],
    forbiddenEs: ['Glutamato monosódico', 'Potenciador de sabor Ajinomoto', 'Pastillas de caldo'],
    category: 'especias_hierbas',
  },
  {
    id: 'spicy',
    emoji: '🌶️',
    labelEs: 'Picante / Guindilla fresca (Ớt tươi)',
    labelVi: 'Ớt tươi & vị cay',
    forbiddenVi: ['Ớt tươi cắt lát', 'Tương ớt cay', 'Sa tế ớt'],
    forbiddenEs: ['Guindilla fresca cortada', 'Salsa picante', 'Aceite con chile (Saté)'],
    category: 'especias_hierbas',
  },
  {
    id: 'cilantro',
    emoji: '🌿',
    labelEs: 'Cilantro y hierbas vietnamitas (Rau mùi)',
    labelVi: 'Rau mùi / Ngò rí / Rau thơm',
    forbiddenVi: ['Rau mùi (ngò rí)', 'Ngò gai', 'Rau răm', 'Húng quế'],
    forbiddenEs: ['Cilantro fresco', 'Cilantro espinoso', 'Hierbas aromáticas'],
    category: 'especias_hierbas',
  },
  {
    id: 'garlic_onion',
    emoji: '🧄',
    labelEs: 'Ajo y cebolleta frita (Tỏi & hành)',
    labelVi: 'Tỏi tươi & hành lá',
    forbiddenVi: ['Tỏi tươi', 'Hành lá', 'Hành phi giòn', 'Hành tây'],
    forbiddenEs: ['Ajo fresco', 'Cebolleta verde', 'Cebolla frita crujiente'],
    category: 'especias_hierbas',
  },
  {
    id: 'mustard_spice',
    emoji: '🟡',
    labelEs: 'Mostaza y semillas de mostaza',
    labelVi: 'Mù tạt (Mustard)',
    forbiddenVi: ['Mù tạt vàng', 'Mù tạt xanh'],
    forbiddenEs: ['Mostaza', 'Granos de mostaza'],
    category: 'especias_hierbas',
  },
  {
    id: 'cinnamon',
    emoji: '🪵',
    labelEs: 'Canela y anís estrellado (Quế & hoa hồi)',
    labelVi: 'Quế & hoa hồi',
    forbiddenVi: ['Vỏ quế', 'Bột quế', 'Hoa hồi ninh nước dùng'],
    forbiddenEs: ['Canela en rama', 'Anís estrellado del caldo Phở'],
    category: 'especias_hierbas',
  },
  {
    id: 'ginger_turmeric',
    emoji: '🫚',
    labelEs: 'Jengibre y cúrcuma (Gừng & nghệ)',
    labelVi: 'Gừng tươi & nghệ',
    forbiddenVi: ['Gừng tươi thái sợi', 'Củ nghệ tươi', 'Bột nghệ vàng'],
    forbiddenEs: ['Jengibre fresco', 'Cúrcuma amarilla'],
    category: 'especias_hierbas',
  },

  // 8. Carnes
  {
    id: 'pork',
    emoji: '🥩',
    labelEs: 'Carne de cerdo y manteca (Mỡ heo)',
    labelVi: 'Thịt heo (lợn) & mỡ heo',
    forbiddenVi: ['Thịt heo / lợn', 'Mỡ heo', 'Chả lụa heo', 'Nước dùng ninh xương heo'],
    forbiddenEs: ['Carne de cerdo', 'Manteca de cerdo', 'Embutido de cerdo', 'Caldo con huesos de cerdo'],
    category: 'carnes',
  },
  {
    id: 'beef',
    emoji: '🐂',
    labelEs: 'Carne de ternera y caldo de res',
    labelVi: 'Thịt bò & nước dùng ninh xương bò',
    forbiddenVi: ['Thịt bò', 'Nước dùng phở bò ninh xương'],
    forbiddenEs: ['Carne de ternera', 'Caldo tradicional de ternera'],
    category: 'carnes',
  },
  {
    id: 'chicken',
    emoji: '🍗',
    labelEs: 'Pollo y caldo de ave',
    labelVi: 'Thịt gà & nước luộc gà',
    forbiddenVi: ['Thịt gà', 'Nước luộc gà'],
    forbiddenEs: ['Carne de pollo', 'Caldo de pollo'],
    category: 'carnes',
  },
  {
    id: 'duck',
    emoji: '🦆',
    labelEs: 'Pato (Thịt vịt)',
    labelVi: 'Thịt vịt',
    forbiddenVi: ['Thịt vịt quay', 'Tiết canh vịt'],
    forbiddenEs: ['Carne de pato'],
    category: 'carnes',
  },
  {
    id: 'lamb',
    emoji: '🥩',
    labelEs: 'Cordero (Thịt cừu)',
    labelVi: 'Thịt cừu',
    forbiddenVi: ['Thịt cừu'],
    forbiddenEs: ['Carne de cordero'],
    category: 'carnes',
  },

  // 9. Dietas
  {
    id: 'vegetarian',
    emoji: '🥗',
    labelEs: 'Vegetariano (Ăn chay - Sin carne ni pescado)',
    labelVi: 'Ăn chay thanh tịnh (không thịt cá mỡ)',
    forbiddenVi: ['Thịt các loại', 'Cá & hải sản', 'Mỡ động vật', 'Nước mắm cá'],
    forbiddenEs: ['Cualquier carne', 'Pescado y marisco', 'Grasa animal', 'Salsa de pescado tradicional'],
    category: 'dietas',
  },
  {
    id: 'vegan',
    emoji: '🌱',
    labelEs: 'Vegano estricto (Thuần chay 100%)',
    labelVi: 'Thuần chay 100% (không trứng, sữa, mỡ)',
    forbiddenVi: ['Thịt, cá, hải sản', 'Trứng các loại', 'Sữa & bơ', 'Nước mắm cá', 'Mật ong'],
    forbiddenEs: ['Carnes y pescados', 'Huevos', 'Lácteos y mantequilla', 'Salsa de pescado', 'Miel'],
    category: 'dietas',
  },
  {
    id: 'halal',
    emoji: '🕌',
    labelEs: 'Halal (Sin cerdo ni manteca)',
    labelVi: 'Không thịt heo & mỡ heo (Halal)',
    forbiddenVi: ['Thịt heo (lợn)', 'Mỡ heo', 'Thịt không có chứng nhận Halal'],
    forbiddenEs: ['Carne de cerdo', 'Manteca de cerdo', 'Carne no certificada Halal'],
    category: 'dietas',
  },
  {
    id: 'celiac_strict',
    emoji: '🩺',
    labelEs: 'Celíaco estricto (Sin trazas de trigo)',
    labelVi: 'Dị ứng Gluten nghiêm ngặt',
    forbiddenVi: ['Bánh mì', 'Mì gói', 'Bột mì chiên', 'Nước tương có lúa mì'],
    forbiddenEs: ['Pan', 'Fideos de trigo', 'Rebozados con harina', 'Salsas con trigo'],
    category: 'dietas',
  },
];

// Helper to translate any arbitrary Spanish condition into Vietnamese
function findVietnameseTranslation(raw: string): { viTitle: string; viForbidden: string; emoji: string } {
  const clean = cleanAllergenLabel(raw).toLowerCase();

  // 1. Direct match in preset catalog
  const presetMatch = BASE_PRESET_RESTRICTIONS.find(
    (p) => p.labelEs.toLowerCase().includes(clean) || clean.includes(p.labelEs.toLowerCase())
  );
  if (presetMatch) {
    return {
      viTitle: presetMatch.labelVi.toUpperCase(),
      viForbidden: presetMatch.forbiddenVi.join(', '),
      emoji: presetMatch.emoji,
    };
  }

  // 2. Direct dictionary match
  for (const [key, val] of Object.entries(KNOWN_CULINARY_ITEMS)) {
    if (clean.includes(key) || key.includes(clean)) {
      return {
        viTitle: val.vi,
        viForbidden: val.viForbidden,
        emoji: val.emoji,
      };
    }
  }

  // 3. Fallback: clean title casing
  return {
    viTitle: clean.toUpperCase(),
    viForbidden: clean,
    emoji: '🍽️',
  };
}

// Banned non-food keywords for client-side validation
const BANNED_NON_FOOD_TERMS = new Set([
  'test', 'prueba', 'testing', 'asdf', 'asdfgh', 'xxx', 'abc', '123', 'foo',
  'bar', 'temp', 'null', 'undefined', 'qwerty', 'cosa', 'algo', 'nada', 'hola',
  'coche', 'auto', 'carro', 'moto', 'bicicleta', 'telefono', 'teléfono', 'movil',
  'móvil', 'ordenador', 'computadora', 'casa', 'edificio', 'ropa', 'pantalon',
  'pantalón', 'camisa', 'zapato', 'zapatos', 'perro', 'gato', 'mesa', 'silla',
  'puerta', 'ventana', 'futbol', 'fútbol', 'musica', 'música', 'pelicula', 'película',
  'dinero', 'moneda', 'tarjeta', 'avion', 'avión', 'tren', 'hotel', 'playa', 'montaña',
  'ciudad', 'pais', 'país', 'viaje', 'maleta', 'lapiz', 'lápiz', 'papel', 'libro'
]);

function validateIngredientLocally(input: string): {
  isDefinitelyFood: boolean;
  isDefinitelyInvalid: boolean;
  cleanName: string;
  error?: string;
  matchedTranslation?: { vi: string; viForbidden: string; emoji: string };
} {
  const clean = cleanAllergenLabel(input).trim();
  if (!clean || clean.length < 2) {
    return { isDefinitelyFood: false, isDefinitelyInvalid: true, cleanName: '', error: 'Escribe un nombre de ingrediente válido (mínimo 2 letras).' };
  }

  const lower = clean.toLowerCase();

  // 1. Check known non-food and dummy words
  if (BANNED_NON_FOOD_TERMS.has(lower) || /^([a-z0-9])\1{2,}$/i.test(lower) || /^[0-9\W_]+$/.test(clean)) {
    return {
      isDefinitelyFood: false,
      isDefinitelyInvalid: true,
      cleanName: '',
      error: `"${clean}" no parece ser un ingrediente o alimento comestible reconocido.`,
    };
  }

  // 2. Check if it matches existing presets or the culinary dictionary
  const inPreset = BASE_PRESET_RESTRICTIONS.find(
    (p) => p.labelEs.toLowerCase().includes(lower) || lower.includes(p.labelEs.toLowerCase())
  );
  if (inPreset) {
    return {
      isDefinitelyFood: true,
      isDefinitelyInvalid: false,
      cleanName: inPreset.labelEs,
      matchedTranslation: { vi: inPreset.labelVi.toUpperCase(), viForbidden: inPreset.forbiddenVi.join(', '), emoji: inPreset.emoji }
    };
  }

  for (const [key, val] of Object.entries(KNOWN_CULINARY_ITEMS)) {
    if (lower.includes(key) || key.includes(lower)) {
      const formatted = clean.charAt(0).toUpperCase() + clean.slice(1);
      return {
        isDefinitelyFood: true,
        isDefinitelyInvalid: false,
        cleanName: formatted,
        matchedTranslation: val
      };
    }
  }

  // If not immediately recognized locally, mark for AI validation if online
  const formatted = clean.charAt(0).toUpperCase() + clean.slice(1);
  return {
    isDefinitelyFood: false,
    isDefinitelyInvalid: false,
    cleanName: formatted,
  };
}

// Generate the card content with pure Vietnamese for the chef and pure Spanish for traveler
export function generateClientFallbackCard(rawConditions: string[], personName?: string): AllergyCardData {
  const cleanList = rawConditions.length > 0
    ? rawConditions.map(cleanAllergenLabel)
    : ['Cacahuetes y frutos secos'];

  const vietnameseWarningLines: string[] = [];
  const pureForbiddenVi = new Set<string>();
  const safeFoodsVi = new Set<string>();

  cleanList.forEach((cond) => {
    const translation = findVietnameseTranslation(cond);
    vietnameseWarningLines.push(translation.viTitle);

    // Look up presets for forbidden & safe items
    const preset = BASE_PRESET_RESTRICTIONS.find(
      (p) => p.labelEs.toLowerCase() === cond.toLowerCase() || p.labelEs.toLowerCase().includes(cond.toLowerCase())
    );

    if (preset) {
      preset.forbiddenVi.forEach((item) => pureForbiddenVi.add(item));
    } else {
      pureForbiddenVi.add(translation.viForbidden);
    }
  });

  // Standard safe food items in Vietnamese
  const lowerAll = cleanList.join(' ').toLowerCase();
  if (lowerAll.includes('vegetar') || lowerAll.includes('vegan') || lowerAll.includes('chay')) {
    safeFoodsVi.add('Cơm trắng (Arroz blanco)');
    safeFoodsVi.add('Đậu hũ chiên xì dầu (Tofu)');
    safeFoodsVi.add('Rau muống xào tỏi (Espinaca de agua)');
    safeFoodsVi.add('Nấm xào chay (Setas salteadas)');
  } else if (lowerAll.includes('gluten') || lowerAll.includes('celíac') || lowerAll.includes('trigo')) {
    safeFoodsVi.add('Phở bò / Phở gà (bánh phở 100% gạo)');
    safeFoodsVi.add('Bún tươi (sợi bún từ gạo)');
    safeFoodsVi.add('Cơm trắng (Arroz blanco)');
    safeFoodsVi.add('Bánh tráng cuốn');
  } else {
    safeFoodsVi.add('Cơm trắng (Arroz blanco)');
    safeFoodsVi.add('Trứng chiên (Tortilla simple)');
    safeFoodsVi.add('Thịt luộc thanh đạm (Carne hervida)');
    safeFoodsVi.add('Rau luộc (Verduras hervidas)');
  }

  const warningListFormatted = Array.from(new Set(vietnameseWarningLines))
    .map((line) => `⛔ ${line}`)
    .join('\n');

  // Pure authentic Vietnamese statement for the restaurant staff
  const vietnameseLarge = `XIN CHÀO NHÀ HÀNG!
TÔI BỊ DỊ ỨNG & KHÔNG THỂ ĂN CÁC THỨ SAU:

${warningListFormatted}

XIN VUI LÒNG:
1. TUYỆT ĐỐI KHÔNG CHO các nguyên liệu trên vào món ăn của tôi.
2. KHÔNG DÙNG dầu đã chiên qua các món trên.
3. KHÔNG DÙNG nước dùng ninh từ các nguyên liệu này.

Ăn phải sẽ rất nguy hiểm đến tính mạng. Xin chân thành cảm ơn nhà hàng!`;

  return {
    id: 'card-' + Date.now(),
    title: `Aviso: ${cleanList.slice(0, 3).join(' + ')}`,
    personName: personName || 'Mi Tarjeta',
    conditions: cleanList,
    vietnameseLarge,
    phonetic: 'Sin chao! Toi bi di ung: Tuyet doi khong an ' + Array.from(pureForbiddenVi).slice(0, 4).join(', ') + '. Xin cam on!',
    allowedFoods: Array.from(safeFoodsVi),
    forbiddenIngredients: Array.from(pureForbiddenVi),
    emergencyNote: 'Nếu tôi có dấu hiệu khó thở hoặc sốc phản vệ, vui lòng gọi cấp cứu 115 ngay lập tức.',
    createdAt: Date.now(),
  };
}

export const AllergyCardsSection: React.FC<AllergyCardsSectionProps> = ({ isOnline }) => {
  const [savedCards, setSavedCards] = useState<AllergyCardData[]>(() => {
    return getSavedAllergyCards();
  });

  const [activeCardId, setActiveCardId] = useState<string>(() => {
    return savedCards[0]?.id || '';
  });

  const [currentCard, setCurrentCard] = useState<AllergyCardData | null>(() => {
    return savedCards[0] || null;
  });

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [personName, setPersonName] = useState<string>(() => currentCard?.personName || 'Mi Tarjeta');
  const [selectedConditions, setSelectedConditions] = useState<string[]>(() => {
    return (currentCard?.conditions || ['Cacahuetes y frutos secos']).map(cleanAllergenLabel);
  });

  // Dynamic list of custom restrictions added by user
  const [customPresets, setCustomPresets] = useState<PresetRestriction[]>([]);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('todos');
  const [customInput, setCustomInput] = useState<string>('');
  const [customError, setCustomError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [isFullscreenMode, setIsFullscreenMode] = useState<boolean>(false);
  const [deleteConfirmCardId, setDeleteConfirmCardId] = useState<string | null>(null);
  useScrollLock(isFullscreenMode || Boolean(deleteConfirmCardId));

  // Audio speech synthesis state
  const [speakingState, setSpeakingState] = useState<{ isSpeaking: boolean; speakingId: string | null }>({
    isSpeaking: false,
    speakingId: null,
  });

  React.useEffect(() => {
    const unsub = subscribeSpeechState((state) => {
      setSpeakingState({
        isSpeaking: state.isSpeaking,
        speakingId: state.speakingId,
      });
    });
    return unsub;
  }, []);

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
    setSelectedCategoryTab('todos');
    setCustomError(null);
  };

  // Start editing current card
  const handleStartEditCurrentCard = () => {
    if (!currentCard) return;
    setPersonName(currentCard.personName || currentCard.title);
    setSelectedConditions((currentCard.conditions || []).map(cleanAllergenLabel));
    setIsEditing(true);
    setCustomError(null);
  };

  // Toggle condition chip
  const handleToggleCondition = (rawCondition: string) => {
    const clean = cleanAllergenLabel(rawCondition);
    const next = selectedConditions.includes(clean)
      ? selectedConditions.filter((c) => c !== clean)
      : [...selectedConditions, clean];

    setSelectedConditions(next);
    if (next.length > 0) {
      const updated = generateClientFallbackCard(next, personName);
      if (currentCard && activeCardId !== 'new') updated.id = currentCard.id;
      setCurrentCard(updated);
    }
  };

  // Add validated custom ingredient with AI verification & local database
  const handleAddCustom = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setCustomError(null);

    const rawInput = customInput.trim();
    if (!rawInput) return;

    // 1. First run instant local validation
    const localResult = validateIngredientLocally(rawInput);
    if (localResult.isDefinitelyInvalid) {
      setCustomError(localResult.error || 'Por favor introduce un nombre de alimento o ingrediente real.');
      return;
    }

    let finalName = localResult.cleanName;
    let translationVi = localResult.matchedTranslation?.vi || '';
    let forbiddenVi = localResult.matchedTranslation?.viForbidden ? [localResult.matchedTranslation.viForbidden] : [];
    let emoji = localResult.matchedTranslation?.emoji || '🍽️';

    // 2. If not recognized locally in offline dictionary and we are online, verify with server AI
    if (!localResult.isDefinitelyFood && isOnline) {
      setIsValidating(true);
      try {
        const res = await fetch('/api/validate-ingredient', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ingredient: rawInput }),
        });
        const data = await res.json();
        if (data && data.valid === false) {
          setCustomError(data.error || `"${rawInput}" no parece ser un ingrediente o alimento real.`);
          setIsValidating(false);
          return;
        } else if (data && data.valid === true) {
          finalName = data.canonicalEs || finalName;
          translationVi = data.translationVi || translationVi;
          forbiddenVi = data.forbiddenVi || forbiddenVi;
          emoji = data.emoji || emoji;
        }
      } catch (err) {
        console.warn('Network ingredient validation error, proceeding with normalized text:', err);
      } finally {
        setIsValidating(false);
      }
    }

    if (!translationVi) {
      const fallbackTrans = findVietnameseTranslation(finalName);
      translationVi = fallbackTrans.viTitle;
      forbiddenVi = [fallbackTrans.viForbidden];
      emoji = fallbackTrans.emoji;
    }

    // 3. Add to selected conditions
    if (!selectedConditions.includes(finalName)) {
      const next = [...selectedConditions, finalName];
      setSelectedConditions(next);
      const updated = generateClientFallbackCard(next, personName);
      if (currentCard && activeCardId !== 'new') updated.id = currentCard.id;
      setCurrentCard(updated);
    }

    // 4. Add dynamically to available presets
    const existsInBase = BASE_PRESET_RESTRICTIONS.some(
      (p) => p.labelEs.toLowerCase() === finalName.toLowerCase()
    );
    const existsInCustom = customPresets.some(
      (p) => p.labelEs.toLowerCase() === finalName.toLowerCase()
    );

    if (!existsInBase && !existsInCustom) {
      const newCustomItem: PresetRestriction = {
        id: 'custom-' + Date.now(),
        emoji: emoji,
        labelEs: finalName,
        labelVi: translationVi,
        forbiddenVi: forbiddenVi.length > 0 ? forbiddenVi : [translationVi],
        forbiddenEs: [finalName],
        category: 'frecuentes',
      };
      setCustomPresets((prev) => [newCustomItem, ...prev]);
    }

    setCustomInput('');
    setCustomError(null);
  };

  const handleRemoveCondition = (cond: string) => {
    const next = selectedConditions.filter((c) => c !== cond);
    setSelectedConditions(next);
    if (next.length > 0) {
      const updated = generateClientFallbackCard(next, personName);
      if (currentCard && activeCardId !== 'new') updated.id = currentCard.id;
      setCurrentCard(updated);
    }
  };

  // Save current card
  const handleSaveCard = () => {
    if (!currentCard) return;
    if (selectedConditions.length === 0) {
      alert('Por favor selecciona al menos un alérgeno o restricción alimentaria.');
      return;
    }

    const newId = activeCardId === 'new' || currentCard.id.startsWith('draft') ? 'card-' + Date.now() : currentCard.id;
    const finalName = personName.trim() || currentCard.personName || 'Mi Tarjeta';

    const cardToSave: AllergyCardData = {
      ...currentCard,
      id: newId,
      title: `Aviso: ${selectedConditions.slice(0, 2).join(' + ')}`,
      personName: finalName,
      conditions: selectedConditions,
      createdAt: Date.now(),
    };

    const updatedList = saveSingleAllergyCard(cardToSave);
    setSavedCards(updatedList);
    setActiveCardId(cardToSave.id);
    setCurrentCard(cardToSave);
    setIsEditing(false);

    setSaveToast(`¡Tarjeta "${cardToSave.personName}" guardada correctamente!`);
    setTimeout(() => setSaveToast(null), 3500);
  };

  // Confirm delete card: Jump to next card if available; DO NOT restore defaults when empty
  const handleConfirmDelete = (cardId: string) => {
    const targetIdx = savedCards.findIndex((c) => c.id === cardId);
    const updated = deleteSavedAllergyCard(cardId);
    setSavedCards(updated);
    setDeleteConfirmCardId(null);

    if (updated.length > 0) {
      // Jump to the next remaining card (or the previous if the deleted was the last in list)
      const nextIdx = targetIdx < updated.length ? targetIdx : updated.length - 1;
      const nextCard = updated[nextIdx] || updated[0];
      handleSelectCard(nextCard);
    } else {
      // When NO cards are left: DO NOT restore example cards automatically!
      saveAllergyCards([]);
      setActiveCardId('');
      setCurrentCard(null);
      setIsEditing(false);
    }

    setSaveToast('Tarjeta eliminada.');
    setTimeout(() => setSaveToast(null), 3000);
  };

  // Explicit user-triggered reset to default sample cards
  const handleResetDefaults = () => {
    saveAllergyCards(DEFAULT_ALLERGY_CARDS);
    setSavedCards(DEFAULT_ALLERGY_CARDS);
    handleSelectCard(DEFAULT_ALLERGY_CARDS[0]);
    setSaveToast('Tarjetas de ejemplo cargadas.');
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleAudio = (text: string) => {
    const audioId = `allergy-${currentCard?.id || 'main'}`;
    if (speakingState.isSpeaking && speakingState.speakingId === audioId) {
      stopAllSpeech();
      return;
    }
    speakVietnamese(text, audioId);
  };

  // Combined list of base presets + dynamically added custom items
  const allAvailablePresets = useMemo(() => {
    return [...customPresets, ...BASE_PRESET_RESTRICTIONS];
  }, [customPresets]);

  const filteredPresets = useMemo(() => {
    return allAvailablePresets.filter((p) => {
      return selectedCategoryTab === 'todos' || p.category === selectedCategoryTab;
    });
  }, [allAvailablePresets, selectedCategoryTab]);

  const CATEGORY_TABS = [
    { id: 'todos', label: 'Todos' },
    { id: 'frecuentes', label: '⭐ Más Frecuentes' },
    { id: 'frutos_secos', label: '🥜 Frutos Secos' },
    { id: 'marisco_pescado', label: '🦐 Marisco & Pescado' },
    { id: 'granos_gluten', label: '🌾 Gluten & Granos' },
    { id: 'lacteos_huevos', label: '🥛 Lácteos & Huevos' },
    { id: 'frutas_verduras', label: '🥗 Verduras & Frutas' },
    { id: 'especias_hierbas', label: '🧂 Especias & MSG' },
    { id: 'carnes', label: '🥩 Carnes' },
    { id: 'dietas', label: '🌱 Dietas' },
  ];

  return (
    <div className="space-y-4 max-w-4xl w-full mx-auto min-w-0">
      {/* 1. Header Banner (100% Spanish) */}
      <div className="bg-gradient-to-r from-[#181614] via-[#201d19] to-[#181614] text-stone-100 rounded-2xl p-4 sm:px-5 sm:py-4 border border-rose-500/20 shadow-[0_4px_20px_rgba(0,0,0,0.25)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 shadow-inner">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-sm sm:text-base text-white tracking-tight">
              Tarjetas de Alergias & Dietas
            </h3>
            <p className="text-[11px] sm:text-xs text-stone-400 mt-0.5">
              Genera tarjetas médicas en vietnamita para enseñar a camareros y cocineros
            </p>
          </div>
        </div>

        {savedCards.length > 0 && !isEditing && (
          <button
            type="button"
            onClick={handleStartNewCard}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nueva Tarjeta</span>
          </button>
        )}
      </div>

      {/* 2. Traveler Profiles / Saved Cards Switcher */}
      {savedCards.length > 0 && (
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-stone-200/90 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between text-xs text-stone-600">
            <div className="flex items-center gap-1.5 font-bold text-stone-900">
              <User className="w-4 h-4 text-rose-600" />
              <span>Tus Tarjetas Guardadas ({savedCards.length}):</span>
            </div>
            <button
              type="button"
              onClick={handleResetDefaults}
              className="text-[11px] text-stone-400 hover:text-stone-700 underline cursor-pointer"
            >
              Cargar ejemplos
            </button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar touch-pan-x">
            {savedCards.map((card) => {
              const isActive = activeCardId === card.id && !isEditing;
              return (
                <div
                  key={card.id}
                  onClick={() => handleSelectCard(card)}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer shrink-0 select-none ${
                    isActive
                      ? 'bg-[#181614] text-white border-stone-900 font-bold shadow-xs'
                      : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-rose-400' : 'bg-stone-300'}`} />
                  <span className="font-semibold whitespace-nowrap">
                    {card.personName || card.title}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      isActive ? 'bg-stone-800 text-rose-300' : 'bg-stone-200 text-stone-600'
                    }`}
                  >
                    {card.conditions?.length || 1} alérgeno(s)
                  </span>
                </div>
              );
            })}

            {activeCardId === 'new' && isEditing && (
              <div className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-950 font-bold text-xs shrink-0 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                <span>Creando nueva tarjeta...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {saveToast && (
        <div className="bg-emerald-50 text-emerald-950 border border-emerald-300 px-4 py-2.5 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold shadow-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveToast}</span>
          </div>
          <button type="button" onClick={() => setSaveToast(null)} className="text-emerald-700 hover:text-emerald-950 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* EMPTY STATE (When all cards have been deleted) */}
      {savedCards.length === 0 && !isEditing && (
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-stone-200 text-center space-y-4 shadow-2xs">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h4 className="font-serif font-bold text-base sm:text-lg text-stone-900">
              No tienes ninguna tarjeta guardada
            </h4>
            <p className="text-xs text-stone-500 leading-relaxed">
              Crea una tarjeta personalizada con tus alergias o restricciones para mostrarla a camareros y cocineros en Vietnam.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleStartNewCard}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Mi Primera Tarjeta</span>
            </button>
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs transition cursor-pointer"
            >
              Cargar ejemplos
            </button>
          </div>
        </div>
      )}

      {/* 3. MAIN RESTAURANT CARD VIEW (CLEAR SEPARATION OF LANGUAGES) */}
      {currentCard && !isEditing && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 border-2 border-stone-200 shadow-sm space-y-5">
          {/* Card Top Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-rose-700 uppercase tracking-wider">
                  {currentCard.personName || 'Mi Tarjeta'}
                </span>
                <span className="text-[11px] text-stone-400">·</span>
                <span className="text-xs text-stone-600 font-medium">
                  {currentCard.conditions?.length || 1} restricción(es)
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-serif font-bold text-stone-950 mt-0.5">
                {currentCard.title || 'Aviso de Alergia Alimentaria'}
              </h3>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Fullscreen Waiter Mode */}
              <button
                type="button"
                onClick={() => setIsFullscreenMode(true)}
                className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-stone-950 text-white hover:bg-stone-800 active:scale-95 transition cursor-pointer shadow-xs"
                title="Mostrar en pantalla completa al camarero o cocinero"
              >
                <Maximize2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Modo Pantalla Grande</span>
              </button>

              {/* Audio Pronunciation */}
              <button
                type="button"
                onClick={() => handleToggleAudio(currentCard.vietnameseLarge)}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border transition cursor-pointer active:scale-95 ${
                  speakingState.isSpeaking && speakingState.speakingId === `allergy-${currentCard.id}`
                    ? 'bg-rose-500 text-white border-rose-600 shadow-xs'
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-950 border-rose-200'
                }`}
                title="Escuchar pronunciación en voz alta en vietnamita"
              >
                <AudioWaveIndicator
                  isPlaying={speakingState.isSpeaking && speakingState.speakingId === `allergy-${currentCard.id}`}
                  size="sm"
                  colorClass={speakingState.isSpeaking && speakingState.speakingId === `allergy-${currentCard.id}` ? 'text-white' : 'text-rose-700'}
                />
                <span>
                  {speakingState.isSpeaking && speakingState.speakingId === `allergy-${currentCard.id}` ? 'Hablando...' : 'Pronunciar'}
                </span>
              </button>

              {/* Edit Card */}
              <button
                type="button"
                onClick={handleStartEditCurrentCard}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 transition cursor-pointer border border-stone-200 active:scale-95"
                title="Modificar los alérgenos o el nombre de esta tarjeta"
              >
                <Edit3 className="w-3.5 h-3.5 text-stone-600" />
                <span>Editar</span>
              </button>

              {/* Copy Text */}
              <button
                type="button"
                onClick={() => handleCopyText(`${currentCard.vietnameseLarge}\n\n${currentCard.emergencyNote || ''}`)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-stone-50 hover:bg-stone-100 text-stone-700 transition cursor-pointer border border-stone-200 active:scale-95"
                title="Copiar texto en vietnamita"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-stone-500" />}
                <span>{copied ? 'Copiado' : 'Copiar'}</span>
              </button>

              {/* Delete Card Button */}
              <button
                type="button"
                onClick={() => setDeleteConfirmCardId(currentCard.id)}
                className="p-2 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer border border-transparent hover:border-rose-200"
                title="Eliminar esta tarjeta"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Section A: Pure Vietnamese Card for the Chef */}
          <div className="bg-gradient-to-br from-rose-50/90 to-amber-50/40 rounded-2xl p-5 sm:p-6 border-2 border-rose-300 shadow-2xs space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-rose-900 border-b border-rose-200/70 pb-2.5">
              <span className="flex items-center gap-1.5 uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Tarjeta para mostrar al personal del restaurante (en Vietnamita):</span>
              </span>
              <span className="text-[11px] text-stone-500 font-normal">Tiếng Việt</span>
            </div>

            {/* Authentic, Unmixed Vietnamese Warning Statement */}
            <div className="text-base sm:text-lg font-black text-stone-950 leading-relaxed font-sans whitespace-pre-line">
              {currentCard.vietnameseLarge}
            </div>
          </div>

          {/* Section B: Spanish Explanation for the Traveler */}
          <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-stone-900">
              <BookOpen className="w-4 h-4 text-amber-600" />
              <span>¿Qué le estás diciendo al cocinero? (Traducción en Español):</span>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Le estás advirtiendo formalmente de que padeces una alergia o intolerancia alimentaria severa a:{' '}
              <strong className="text-stone-900 font-semibold">{currentCard.conditions?.join(', ')}</strong>.
              La tarjeta le solicita explícitamente no incluir estos ingredientes, no reutilizar aceite donde se hayan cocinado y no usar caldos que contengan estos productos.
            </p>
          </div>

          {/* Section C: Phonetic Guide for Speaking */}
          {currentCard.phonetic && (
            <div className="bg-amber-50/50 rounded-2xl p-3.5 border border-amber-200/80 text-xs text-stone-700 space-y-1">
              <div className="font-bold text-amber-950 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                <span>🗣️ Pronunciación fonética (para leer en voz alta):</span>
              </div>
              <p className="font-mono text-stone-800 text-xs sm:text-sm font-semibold leading-relaxed">
                "{currentCard.phonetic}"
              </p>
            </div>
          )}

          {/* Section D: Dual-Column Breakdown (Prohibited vs Safe Foods) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Prohibited Items Column */}
            <div className="bg-rose-50/50 rounded-2xl p-4 border border-rose-200 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-rose-950">
                <span className="flex items-center gap-1.5">
                  <span className="text-base">🚫</span>
                  <span>Ingredientes Prohibidos ({currentCard.forbiddenIngredients?.length || 0}):</span>
                </span>
                <span className="text-[10px] text-rose-800 font-semibold">Tiếng Việt</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {(currentCard.forbiddenIngredients || []).map((item) => (
                  <span
                    key={item}
                    className="bg-rose-600 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-2xs"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Safe Dishes Recommendations Column */}
            <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-200 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
                <span className="flex items-center gap-1.5">
                  <span className="text-base">✅</span>
                  <span>Platos Habitualmente Seguros:</span>
                </span>
                <span className="text-[10px] text-emerald-800 font-semibold">Món gợi ý</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {(currentCard.allowedFoods && currentCard.allowedFoods.length > 0
                  ? currentCard.allowedFoods
                  : ['Cơm trắng (Arroz blanco)', 'Trứng chiên (Tortilla)', 'Thịt luộc (Carne hervida)', 'Rau luộc (Verduras hervidas)']
                ).map((food) => (
                  <span
                    key={food}
                    className="bg-white border border-emerald-300 text-emerald-900 font-semibold text-xs px-3 py-1.5 rounded-xl shadow-2xs"
                  >
                    {food}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Section E: Emergency Medical Note */}
          <div className="text-xs text-rose-950 bg-rose-50 p-4 rounded-2xl border border-rose-300 flex items-start gap-3">
            <HeartPulse className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed space-y-1">
              <span className="font-semibold">{currentCard.emergencyNote}</span>
              <div className="text-stone-600 text-[11px] pt-0.5">
                Teléfono de ambulancia y emergencias médicas en Vietnam: <strong className="text-rose-900 font-bold underline">115</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. INTUITIVE CREATOR & EDITOR PANEL (Clean, No Search Bar) */}
      {isEditing && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 border-2 border-rose-400 shadow-lg space-y-6">
          {/* Editor Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
            <div>
              <h4 className="font-serif font-bold text-lg text-stone-950">
                {activeCardId === 'new' ? 'Crear Nueva Tarjeta de Alergia' : `Editar Tarjeta: "${personName}"`}
              </h4>
              <p className="text-xs text-stone-500 mt-0.5">
                Marca los ingredientes en la lista o añade otros abajo para generar tu tarjeta en vietnamita
              </p>
            </div>

            {/* Profile Name Input */}
            <div className="flex items-center gap-2">
              <label htmlFor="card-person-name" className="text-xs font-bold text-stone-700 whitespace-nowrap">
                Nombre del Viajero:
              </label>
              <input
                id="card-person-name"
                type="text"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                placeholder="Ej. Mi Tarjeta, Niños, Ana..."
                className="text-xs font-semibold px-3 py-2 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 w-44"
              />
            </div>
          </div>

          {/* Selected Restrictions Tray */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-stone-800">
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>Restricciones seleccionadas ({selectedConditions.length}):</span>
              </span>
              {selectedConditions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedConditions([])}
                  className="text-stone-400 hover:text-rose-600 text-xs font-normal cursor-pointer"
                >
                  Limpiar todas
                </button>
              )}
            </div>

            {selectedConditions.length === 0 ? (
              <div className="p-4 rounded-2xl border-2 border-dashed border-rose-200 bg-rose-50/40 text-center text-xs text-rose-900 font-medium">
                Toca las opciones inferiores o añade un ingrediente nuevo abajo para incluirlo en tu tarjeta.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 p-3.5 rounded-2xl bg-rose-50 border border-rose-200">
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
                      className="p-0.5 rounded-full hover:bg-rose-700 transition cursor-pointer text-white/80 hover:text-white ml-0.5"
                      title="Quitar alérgeno"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Category Tabs Filter */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-800">
                Selecciona alérgenos o alimentos ({filteredPresets.length} disponibles):
              </span>
              {selectedCategoryTab !== 'todos' && (
                <button
                  type="button"
                  onClick={() => setSelectedCategoryTab('todos')}
                  className="text-[11px] text-rose-600 hover:underline font-semibold cursor-pointer"
                >
                  Ver todos ({allAvailablePresets.length})
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs touch-pan-x">
              {CATEGORY_TABS.map((tab) => {
                const count = tab.id === 'todos' 
                  ? allAvailablePresets.length 
                  : allAvailablePresets.filter(p => p.category === tab.id).length;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedCategoryTab(tab.id)}
                    className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-bold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                      selectedCategoryTab === tab.id
                        ? 'bg-stone-900 text-white shadow-2xs'
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedCategoryTab === tab.id ? 'bg-stone-800 text-rose-300' : 'bg-stone-200 text-stone-600'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Presets Grid (Includes all ingredients nicely laid out) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[420px] overflow-y-auto pr-1">
              {filteredPresets.map((preset) => {
                const isSelected = selectedConditions.includes(preset.labelEs);
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleToggleCondition(preset.labelEs)}
                    className={`text-left p-3.5 rounded-2xl border transition cursor-pointer flex items-start gap-2.5 select-none ${
                      isSelected
                        ? 'bg-rose-50 border-rose-400 text-rose-950 shadow-xs ring-1 ring-rose-400'
                        : 'bg-white border-stone-200 hover:border-stone-300 hover:bg-stone-50 text-stone-700'
                    }`}
                  >
                    <span className="text-xl shrink-0 mt-0.5">{preset.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-1.5">
                        <span className={`text-xs font-bold leading-snug break-words ${isSelected ? 'text-rose-950' : 'text-stone-900'}`}>
                          {preset.labelEs}
                        </span>
                        {isSelected ? (
                          <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0 fill-rose-100 mt-0.5" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-stone-300 shrink-0 mt-0.5" />
                        )}
                      </div>
                      <span className="text-[11px] text-stone-500 block leading-tight break-words mt-1 font-sans">
                        {preset.labelVi}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Add Custom Ingredient Form with AI + Lexicon Verification */}
          <div className="pt-2 border-t border-stone-100 space-y-2">
            <div className="flex items-center justify-between text-xs text-stone-600">
              <span className="font-semibold text-stone-800">¿No encuentras tu ingrediente? Escríbelo para añadirlo:</span>
            </div>
            <form onSubmit={handleAddCustom} className="flex items-center gap-2">
              <input
                type="text"
                value={customInput}
                disabled={isValidating}
                onChange={(e) => {
                  setCustomInput(e.target.value);
                  if (customError) setCustomError(null);
                }}
                placeholder="Ingrediente (apio, anacardo, mostaza, kiwi...)"
                className={`flex-1 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 disabled:opacity-60 ${
                  customError ? 'border-rose-400 focus:ring-rose-400 bg-rose-50/20' : 'border-stone-300 focus:ring-rose-500'
                }`}
              />
              <button
                type="submit"
                disabled={!customInput.trim() || isValidating}
                className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 active:scale-95 disabled:opacity-40 text-white font-bold text-xs transition cursor-pointer shrink-0 shadow-xs flex items-center gap-1.5"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                    <span>Verificando...</span>
                  </>
                ) : (
                  <span>+ Añadir</span>
                )}
              </button>
            </form>

            {customError && (
              <p className="text-xs text-rose-600 font-semibold flex items-center gap-1.5 animate-fade-in pl-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{customError}</span>
              </p>
            )}
          </div>

          {/* Editor Action Buttons */}
          <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                if (activeCardId === 'new') {
                  if (savedCards.length > 0) {
                    handleSelectCard(savedCards[0]);
                  } else {
                    setActiveCardId('');
                    setCurrentCard(null);
                  }
                }
              }}
              className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs transition cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSaveCard}
              disabled={selectedConditions.length === 0}
              className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-bold text-xs transition cursor-pointer shadow-xs flex items-center gap-1.5 active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Guardar y Mostrar Tarjeta</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. FULLSCREEN HIGH-CONTRAST WAITER MODE (100% VIETNAMESE FOR CHEF) */}
      {isFullscreenMode && currentCard && (
        <div className="fixed inset-0 z-50 bg-stone-950/95 backdrop-blur-md flex flex-col p-4 sm:p-8 overflow-y-auto animate-fade-in">
          <div className="max-w-3xl w-full mx-auto my-auto space-y-4">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs sm:text-sm uppercase tracking-wider">
                <ShieldAlert className="w-5 h-5 text-rose-500" />
                <span>Tarjeta para Restaurante (Tiếng Việt)</span>
              </div>
              <button
                type="button"
                onClick={() => setIsFullscreenMode(false)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs transition cursor-pointer border border-white/20 active:scale-95"
              >
                <Minimize2 className="w-4 h-4 text-white" />
                <span>Cerrar</span>
              </button>
            </div>

            {/* High-Contrast Card for the Vietnamese Cook */}
            <div className="bg-white rounded-3xl p-6 sm:p-10 border-4 border-rose-600 shadow-2xl text-stone-950 space-y-6">
              <div className="flex items-center justify-between border-b-2 border-stone-200 pb-4">
                <div className="flex items-center gap-2 text-rose-700 font-black text-xs sm:text-sm uppercase tracking-wider">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                  <span>XIN ĐỌC KỸ TRƯỚC KHI NẤU (VUI LÒNG GIÚP ĐỠ)</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleAudio(currentCard.vietnameseLarge)}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Đọc To (Phát Âm)</span>
                </button>
              </div>

              {/* Massive Vietnamese Warning */}
              <div className="text-xl sm:text-3xl font-black text-black leading-snug font-sans whitespace-pre-line tracking-tight">
                {currentCard.vietnameseLarge}
              </div>

              {/* Forbidden Items Badges (100% Pure Vietnamese) */}
              {(currentCard.forbiddenIngredients || []).length > 0 && (
                <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 border-2 border-rose-400 space-y-2.5">
                  <span className="text-xs sm:text-sm font-black text-rose-950 uppercase tracking-wide block">
                    🚫 NGUYÊN LIỆU TUYỆT ĐỐI CẤM (VUI LÒNG KHÔNG CHO):
                  </span>
                  <div className="flex flex-wrap gap-2.5">
                    {(currentCard.forbiddenIngredients || []).map((item) => (
                      <span
                        key={item}
                        className="bg-rose-600 text-white font-black text-sm sm:text-base px-4 py-2 rounded-xl shadow-xs"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Emergency Call Hotline */}
              <div className="text-xs sm:text-sm font-bold text-rose-950 bg-stone-100 p-4 rounded-2xl border border-stone-300 flex items-center justify-between">
                <span>🚑 Cấp cứu y tế: Gọi <strong>115</strong></span>
                <span className="text-stone-500 font-normal text-xs">{currentCard.personName}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. DELETE CONFIRMATION MODAL */}
      {deleteConfirmCardId && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-stone-200 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600 font-bold text-base">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <span>¿Eliminar tarjeta?</span>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Esta acción eliminará la tarjeta seleccionada de tus perfiles guardados.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmCardId(null)}
                className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDelete(deleteConfirmCardId)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition cursor-pointer shadow-xs"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
