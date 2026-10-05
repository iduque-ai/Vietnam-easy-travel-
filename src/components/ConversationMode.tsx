import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  ExternalLink,
  Copy,
  Check,
  ArrowLeftRight,
  Languages,
  Sparkles,
  HelpCircle,
  Maximize2,
  Minimize2,
  X,
  RotateCcw,
  Bookmark,
  BookmarkCheck,
  Plus,
  Trash2,
  Star,
  Sliders,
  Zap,
  Banknote,
  Coins,
  WifiOff,
  BookOpen,
  UtensilsCrossed,
  ShieldAlert,
} from 'lucide-react';
import {
  speakVietnamese,
  speakSpanish,
  speakEnglish,
  openGoogleTranslate,
  CustomTranslationCard,
  getSavedCustomCards,
  saveCustomCard,
  deleteSavedCustomCard,
  subscribeSpeechState,
  stopAllSpeech,
  getSavedSpeechSettings,
  subscribeSpeechSettings,
  SpeechSettings,
} from '../utils/storage';
import { TRAVEL_PHRASES } from '../data/phrases';
import { requestMicrophonePermission } from '../utils/permissions';
import { AudioWaveIndicator } from './AudioWaveIndicator';
import { useScrollLock } from '../hooks/useScrollLock';

export interface ConversationTargetPhrase {
  es: string;
  vi: string;
  phonetic?: string;
  tip?: string;
}

interface ConversationModeProps {
  isOnline: boolean;
  targetPhrase?: ConversationTargetPhrase | null;
  onClearTargetPhrase?: () => void;
  onNavigateTab?: (tab: 'phrases' | 'food' | 'allergy') => void;
  onOpenVoiceSettings?: () => void;
}

export interface QuickPhrase {
  id?: string;
  label: string;
  category: 'frecuentes' | 'precios' | 'comida' | 'transporte' | 'cortesia' | 'emergencia';
  en: string;
  es: string;
  vi: string;
  phonetic: string;
  tip?: string;
  isCustom?: boolean;
  isBanknote?: boolean;
  banknoteColor?: string;
  banknoteDong?: string;
  banknoteEur?: string;
}

const QUICK_PHRASES: QuickPhrase[] = [
  // --- 0. FRECUENTES (TOP 8 ACCIONES RÁPIDAS) ---
  {
    label: '¿Cuánto cuesta esto?',
    category: 'frecuentes',
    en: 'How much is this?',
    es: '¿Cuánto cuesta esto?',
    vi: 'Cái này bao nhiêu tiền vậy ạ?',
    phonetic: 'Cai nay bao nyew tien vay ah?',
    tip: 'Pregunta universal para puestos callejeros y tiendas.',
  },
  {
    label: 'La cuenta, por favor',
    category: 'frecuentes',
    en: 'Can I have the bill please?',
    es: 'La cuenta, por favor',
    vi: 'Em ơi, tính tiền giúp anh / chị với!',
    phonetic: 'Em oy, tin tien zoop anh voy!',
    tip: '"Em ơi" es el llamado cortés y universal a camareros jóvenes.',
  },
  {
    label: 'Sin picante ni guindilla',
    category: 'frecuentes',
    en: 'No spicy, no chili please',
    es: 'Sin picante ni guindilla por favor',
    vi: 'Làm ơn đừng cho ớt và không cay nhé!',
    phonetic: 'Lam on dung cho ot va khong cay nye!',
    tip: 'Imprescindible en sopas callejeras donde suelen poner rodajas de guindilla.',
  },
  {
    label: '1 Cà phê sữa đá',
    category: 'frecuentes',
    en: 'One iced milk coffee please',
    es: 'Un café con leche condensada y hielo',
    vi: 'Cho tôi một ly cà phê sữa đá nhé!',
    phonetic: 'Cho toi mot ly ca fe sua da nye!',
    tip: 'El emblemático café vietnamita con leche condensada espesa y hielo picado.',
  },
  {
    label: 'Hola / Buenos días',
    category: 'frecuentes',
    en: 'Hello / Good morning',
    es: 'Hola / Buenos días',
    vi: 'Xin chào bạn!',
    phonetic: 'Sin chao ban!',
    tip: 'Saludo cortés y amigable universal para cualquier situación.',
  },
  {
    label: 'Muchas gracias',
    category: 'frecuentes',
    en: 'Thank you very much',
    es: 'Muchas gracias',
    vi: 'Cảm ơn bạn rất nhiều!',
    phonetic: 'Cam on ban rut nyew!',
    tip: 'Acompaña con una sonrisa o ligera inclinación de cabeza.',
  },
  {
    label: '¿Dónde está el baño?',
    category: 'frecuentes',
    en: 'Where is the restroom?',
    es: '¿Dónde está el baño / servicio?',
    vi: 'Nhà vệ sinh ở đâu vậy ạ?',
    phonetic: 'Nya vee sin o dau vay ah?',
    tip: 'En carteles verás a menudo "WC" o "Nhà vệ sinh".',
  },
  {
    label: 'Lléveme a esta dirección',
    category: 'frecuentes',
    en: 'Please take me to this address',
    es: 'Por favor lléveme a esta dirección',
    vi: 'Làm ơn chở tôi đến địa chỉ này nhé!',
    phonetic: 'Lam on cho toi den dia chi nay nye!',
    tip: 'Muestra la pantalla con la dirección de tu hotel o mapa.',
  },

  // --- 1. PRECIOS & BILLETES ---
  {
    label: '20.000 ₫',
    category: 'precios',
    isBanknote: true,
    banknoteDong: '20.000 ₫',
    banknoteEur: '~0,75 €',
    banknoteColor: 'border-blue-300 bg-blue-50 text-blue-900',
    en: 'Twenty thousand VND',
    es: 'Veinte mil dongs',
    vi: 'Hai mươi nghìn',
    phonetic: 'Hai muoi nghin',
    tip: '20k VND. Billete azul de polímero. Típico de un té helado (trà đá) o agua.',
  },
  {
    label: '50.000 ₫',
    category: 'precios',
    isBanknote: true,
    banknoteDong: '50.000 ₫',
    banknoteEur: '~1,90 €',
    banknoteColor: 'border-rose-300 bg-rose-50 text-rose-900',
    en: 'Fifty thousand VND',
    es: 'Cincuenta mil dongs',
    vi: 'Năm mươi nghìn',
    phonetic: 'Nam muoi nghin',
    tip: '50k VND. Billete rosa rojizo. Precio habitual de un phở o bún chả.',
  },
  {
    label: '100.000 ₫',
    category: 'precios',
    isBanknote: true,
    banknoteDong: '100.000 ₫',
    banknoteEur: '~3,80 €',
    banknoteColor: 'border-emerald-300 bg-emerald-50 text-emerald-900',
    en: 'One hundred thousand VND',
    es: 'Cien mil dongs',
    vi: 'Một trăm nghìn',
    phonetic: 'Mot tram nghin',
    tip: '100k VND. Billete verde de polímero. Muy común para compras medias.',
  },
  {
    label: '200.000 ₫',
    category: 'precios',
    isBanknote: true,
    banknoteDong: '200.000 ₫',
    banknoteEur: '~7,60 €',
    banknoteColor: 'border-amber-300 bg-amber-50 text-amber-950',
    en: 'Two hundred thousand VND',
    es: 'Doscientos mil dongs',
    vi: 'Hai trăm nghìn',
    phonetic: 'Hai tram nghin',
    tip: '200k VND. Billete granate rojizo. Frecuente en transportes y souvenirs.',
  },
  {
    label: '500.000 ₫',
    category: 'precios',
    isBanknote: true,
    banknoteDong: '500.000 ₫',
    banknoteEur: '~19,00 €',
    banknoteColor: 'border-teal-300 bg-teal-50 text-teal-950',
    en: 'Five hundred thousand VND',
    es: 'Quinientos mil dongs',
    vi: 'Năm trăm nghìn',
    phonetic: 'Nam tram nghin',
    tip: '500k VND. El billete de mayor valor (azul/verde cian).',
  },
  {
    label: '¿Cuánto cuesta esto?',
    category: 'precios',
    en: 'How much is this?',
    es: '¿Cuánto cuesta esto?',
    vi: 'Cái này bao nhiêu tiền vậy ạ?',
    phonetic: 'Cai nay bao nyew tien vay ah?',
    tip: 'Pregunta universal para puestos callejeros y tiendas.',
  },
  {
    label: '¿Puede rebajar un poco?',
    category: 'precios',
    en: 'Can you give a discount please?',
    es: '¿Puede hacerme una rebaja por favor?',
    vi: 'Bớt một chút được không ạ?',
    phonetic: 'Bot mot choot duoc khong ah?',
    tip: 'Para regatear amablemente con una sonrisa en mercados.',
  },
  {
    label: 'Demasiado caro, gracias',
    category: 'precios',
    en: 'Too expensive, thank you',
    es: 'Demasiado caro, gracias',
    vi: 'Đắt quá, cảm ơn bạn nhé!',
    phonetic: 'Dat kwa, cam on ban nye!',
    tip: 'Para retirarte educadamente si el precio inicial está muy inflado.',
  },
  {
    label: '¿Acepta tarjeta o solo efectivo?',
    category: 'precios',
    en: 'Do you accept card or cash only?',
    es: '¿Acepta tarjeta o solo efectivo?',
    vi: 'Ở đây quẹt thẻ được không hay chỉ tiền mặt?',
    phonetic: 'O day kwet the duoc khong hay chi tien mat?',
    tip: 'En mercados y comida callejera casi siempre es solo efectivo.',
  },
  {
    label: '¿Dónde hay un cajero ATM?',
    category: 'precios',
    en: 'Where is the nearest ATM?',
    es: '¿Dónde hay un cajero ATM cercano?',
    vi: 'Cây ATM gần nhất ở đâu vậy ạ?',
    phonetic: 'Cay ATM gun nyut o dau vay ah?',
    tip: 'Cajeros de TPBank, VPBank o BIDV suelen admitir tarjetas extranjeras.',
  },

  // --- 2. COMIDA & CAFÉ ---
  {
    label: 'La cuenta, por favor',
    category: 'comida',
    en: 'Can I have the bill please?',
    es: 'La cuenta, por favor',
    vi: 'Em ơi, tính tiền giúp anh / chị với!',
    phonetic: 'Em oy, tin tien zoop anh voy!',
    tip: '"Em ơi" es el llamado cortés y universal a camareros jóvenes.',
  },
  {
    label: 'Sin picante ni guindilla',
    category: 'comida',
    en: 'No spicy, no chili please',
    es: 'Sin picante ni guindilla por favor',
    vi: 'Làm ơn đừng cho ớt và không cay nhé!',
    phonetic: 'Lam on dung cho ot va khong cay nye!',
    tip: 'Imprescindible en sopas callejeras donde suelen poner rodajas de guindilla.',
  },
  {
    label: '1 Cà phê sữa đá',
    category: 'comida',
    en: 'One iced milk coffee please',
    es: 'Un café con leche condensada y hielo',
    vi: 'Cho tôi một ly cà phê sữa đá nhé!',
    phonetic: 'Cho toi mot ly ca fe sua da nye!',
    tip: 'El emblemático café vietnamita con leche condensada espesa y hielo picado.',
  },
  {
    label: 'Agua mineral embotellada',
    category: 'comida',
    en: 'One bottle of sealed mineral water',
    es: 'Una botella de agua mineral cerrada',
    vi: 'Cho tôi một chai nước suối đóng chai nhé!',
    phonetic: 'Cho toi mot chai nuoc suoy dong chai nye!',
    tip: 'Pide siempre botella sellada de fábrica (La Vie, Aquafina o Dasani).',
  },
  {
    label: 'Para llevar, por favor (take-away)',
    category: 'comida',
    en: 'Take away / To go please',
    es: 'Para llevar, por favor',
    vi: 'Mang về giúp tôi nhé!',
    phonetic: 'Mang ve zoop toi nye!',
    tip: 'Ideal para pedir bánh mì o cafés de paso para pasear.',
  },
  {
    label: 'Comida vegetariana (Chay)',
    category: 'comida',
    en: 'I am vegetarian / Vegetarian food',
    es: 'Soy vegetariano / Comida vegetariana',
    vi: 'Tôi ăn chay, không thịt không cá nước mắm',
    phonetic: 'Toi an chay, khong thit khong ca nuoc mam',
    tip: 'En Vietnam los restaurantes vegetarianos se señalan con el cartel "Quán Chay".',
  },
  {
    label: 'Sin azúcar / Poco azúcar',
    category: 'comida',
    en: 'No sugar / Less sugar please',
    es: 'Sin azúcar / poco azúcar por favor',
    vi: 'Không đường / ít đường giúp tôi nhé!',
    phonetic: 'Khong duong / it duong zoop toi nye!',
    tip: 'Muy útil para zumos de fruta fresca, batidos y cafés.',
  },
  {
    label: 'Un vaso con hielo',
    category: 'comida',
    en: 'A glass with ice please',
    es: 'Un vaso con hielo por favor',
    vi: 'Cho tôi xin một cốc đá nhé!',
    phonetic: 'Cho toi sin mot kok da nye!',
    tip: 'En puestos de comida es costumbre pedir un vaso de hielo con té.',
  },
  {
    label: '¿Tiene wifi? Contraseña',
    category: 'comida',
    en: 'Do you have wifi? Password please',
    es: '¿Tiene wifi? ¿Cuál es la contraseña?',
    vi: 'Ở đây có wifi không? Cho tôi xin mật khẩu với.',
    phonetic: 'O day co wifi khong? Cho toi sin mat khau voy.',
    tip: 'Casi todas las cafeterías de Vietnam tienen wifi de alta velocidad gratis.',
  },

  // --- 3. TRANSPORTE & GRAB ---
  {
    label: 'Lléveme a esta dirección',
    category: 'transporte',
    en: 'Please take me to this address',
    es: 'Por favor lléveme a esta dirección',
    vi: 'Làm ơn chở tôi đến địa chỉ này nhé!',
    phonetic: 'Lam on cho toi den dia chi nay nye!',
    tip: 'Muestra la pantalla con la dirección de tu hotel o mapa.',
  },
  {
    label: 'Ponga el taxímetro por favor',
    category: 'transporte',
    en: 'Please turn on the taximeter',
    es: 'Ponga el taxímetro por favor',
    vi: 'Bật đồng hồ tính tiền giúp tôi nhé!',
    phonetic: 'But dong ho tin tien zoop toi nye!',
    tip: 'Esencial en taxis de calle como Mai Linh o Vinasun si no vas con Grab.',
  },
  {
    label: 'Pare aquí mismo por favor',
    category: 'transporte',
    en: 'Please stop right here',
    es: 'Pare aquí mismo por favor',
    vi: 'Dừng lại ở đây giúp tôi nhé!',
    phonetic: 'Dung lai o day zoop toi nye!',
    tip: 'Para bajarte exactamente en tu callejón o destino.',
  },
  {
    label: '¿Cuánto cuesta al aeropuerto?',
    category: 'transporte',
    en: 'How much to the airport?',
    es: '¿Cuánto cuesta ir al aeropuerto?',
    vi: 'Đi ra sân bay bao nhiêu tiền vậy ạ?',
    phonetic: 'Di ra sun bay bao nyew tien vay ah?',
    tip: 'Hanoi (Nội Bài) suele costar entre 250k y 350k VND.',
  },
  {
    label: 'Gire a la derecha / izquierda',
    category: 'transporte',
    en: 'Turn right / Turn left please',
    es: 'Gire a la derecha / izquierda por favor',
    vi: 'Rẽ phải / Rẽ trái giúp tôi nhé!',
    phonetic: 'Re fay / Re tray zoop toi nye!',
    tip: '"Rẽ phải" es derecha, "Rẽ trái" es izquierda.',
  },
  {
    label: '¿Dónde está la parada de autobús?',
    category: 'transporte',
    en: 'Where is the bus stop?',
    es: '¿Dónde está la parada de autobús?',
    vi: 'Trạm xe buýt ở đâu vậy ạ?',
    phonetic: 'Tram se bweet o dau vay ah?',
    tip: 'Para autobuses locales o lanzaderas turísticas.',
  },

  // --- 4. CORTESÍA & SALUDOS ---
  {
    label: 'Hola / Buenos días',
    category: 'cortesia',
    en: 'Hello / Good morning',
    es: 'Hola / Buenos días',
    vi: 'Xin chào bạn!',
    phonetic: 'Sin chao ban!',
    tip: 'Saludo cortés y amigable universal para cualquier situación.',
  },
  {
    label: 'Muchas gracias',
    category: 'cortesia',
    en: 'Thank you very much',
    es: 'Muchas gracias',
    vi: 'Cảm ơn bạn rất nhiều!',
    phonetic: 'Cam on ban rut nyew!',
    tip: 'Acompaña con una sonrisa o ligera inclinación de cabeza.',
  },
  {
    label: 'Por favor / Con permiso',
    category: 'cortesia',
    en: 'Please / Excuse me',
    es: 'Por favor / Con permiso',
    vi: 'Làm ơn / Xin phép nhé!',
    phonetic: 'Lam on / Sin fehp nye!',
    tip: 'Fórmula muy apreciada al pasar entre mesas o puestos estrechos.',
  },
  {
    label: 'Lo siento / Disculpe',
    category: 'cortesia',
    en: 'I am sorry / Excuse me',
    es: 'Lo siento / Disculpe',
    vi: 'Xin lỗi bạn nhé!',
    phonetic: 'Sin loy ban nye!',
    tip: 'Para disculparse si tropiezas o necesitas llamar la atención con educación.',
  },
  {
    label: 'Espera un momento por favor',
    category: 'cortesia',
    en: 'Please wait a moment',
    es: 'Espera un momento por favor',
    vi: 'Chờ tôi một chút nhé!',
    phonetic: 'Cho toi mot choot nye!',
    tip: 'Útil mientras buscas dinero, la cartera o miras el mapa.',
  },
  {
    label: 'No hablo vietnamita',
    category: 'cortesia',
    en: 'I do not speak Vietnamese',
    es: 'No hablo vietnamita',
    vi: 'Tôi không nói được tiếng Việt',
    phonetic: 'Toi khong noy duoc tieng Viet',
    tip: 'Para indicar con simpatía que necesitas comunicarte con traductor o gestos.',
  },
  {
    label: '¿Habla inglés?',
    category: 'cortesia',
    en: 'Do you speak English?',
    es: '¿Habla inglés?',
    vi: 'Bạn có nói được tiếng Anh không?',
    phonetic: 'Ban co noy duoc tieng Anh khong?',
    tip: 'Muchos jóvenes y recepcionistas de hotel lo dominan.',
  },
  {
    label: '¡Muy delicioso / Qué rico!',
    category: 'cortesia',
    en: 'Very delicious!',
    es: '¡Está muy rico / delicioso!',
    vi: 'Món này ngon quá!',
    phonetic: 'Mon nay ngon kwa!',
    tip: 'El mejor cumplido que le puedes dar a cualquier cocinero callejero vietnamita.',
  },

  // --- 5. EMERGENCIAS & BAÑO ---
  {
    label: '¿Dónde está el baño?',
    category: 'emergencia',
    en: 'Where is the restroom?',
    es: '¿Dónde está el baño / servicio?',
    vi: 'Nhà vệ sinh ở đâu vậy ạ?',
    phonetic: 'Nya vee sin o dau vay ah?',
    tip: 'En carteles verás a menudo "WC" o "Nhà vệ sinh".',
  },
  {
    label: 'Alergia a cacahuetes',
    category: 'emergencia',
    en: 'Severe allergy to peanuts / nuts',
    es: 'Alergia severa a cacahuetes y frutos secos',
    vi: 'Tôi bị dị ứng lạc (đậu phộng) rất nặng, xin đừng cho!',
    phonetic: 'Toi bee zee ung lack (dau fong) rut nung, sin dung cho!',
    tip: 'En el norte se dice "lạc", en el sur "đậu phộng". Muestra esta pantalla en grande.',
  },
  {
    label: '¿Puede ayudarme por favor?',
    category: 'emergencia',
    en: 'Can you help me please?',
    es: '¿Puede ayudarme por favor?',
    vi: 'Làm ơn giúp tôi với được không?',
    phonetic: 'Lam on zoop toi voy duoc khong?',
    tip: 'Para pedir auxilio o indicaciones inmediatas en la calle.',
  },
  {
    label: 'Farmacia más cercana',
    category: 'emergencia',
    en: 'Where is the nearest pharmacy?',
    es: '¿Dónde está la farmacia más cercana?',
    vi: 'Nhà thuốc gần nhất ở đâu vậy ạ?',
    phonetic: 'Nya twok gun nyut o dau vay ah?',
    tip: 'Cadenas como Pharmacity o Long Châu están en casi todas las esquinas.',
  },
  {
    label: 'Me encuentro mal / dolor',
    category: 'emergencia',
    en: 'I feel sick / stomach ache',
    es: 'Me siento mal / me duele el estómago',
    vi: 'Tôi thấy rất mệt và đau bụng',
    phonetic: 'Toi thay rut meht va dau boong',
    tip: 'Para describir malestar o golpe de calor.',
  },
  {
    label: 'Necesito ir a un hospital',
    category: 'emergencia',
    en: 'I need to go to a hospital urgently',
    es: 'Necesito ir a un hospital urgente',
    vi: 'Tôi cần đi bệnh viện gấp!',
    phonetic: 'Toi cun di benh vien gup!',
    tip: 'En Hanoi: Vinmec o Viet Duc; en Saigon: FV Hospital o Cho Ray.',
  },
  {
    label: 'Llame a la policía por favor',
    category: 'emergencia',
    en: 'Please call the police',
    es: 'Llame a la policía por favor',
    vi: 'Làm ơn gọi cảnh sát giúp tôi!',
    phonetic: 'Lam on goy cun sat zoop toi!',
    tip: 'El teléfono de policía turística y emergencias en Vietnam es el 113.',
  },
];

export const ConversationMode: React.FC<ConversationModeProps> = ({
  isOnline,
  targetPhrase,
  onClearTargetPhrase,
  onNavigateTab,
  onOpenVoiceSettings,
}) => {
  // Mode direction: 'traveler-to-vi' (Tourist speaks -> Vietnamese) or 'vi-to-traveler' (Vendor speaks -> Tourist)
  const [direction, setDirection] = useState<'traveler-to-vi' | 'vi-to-traveler'>('traveler-to-vi');
  const [travelerLang, setTravelerLang] = useState<'es' | 'en'>('es');

  // Input & output text
  const [inputText, setInputText] = useState('¿Cuánto cuesta esto?');
  const [translatedText, setTranslatedText] = useState('Cái này bao nhiêu tiền vậy ạ?');
  const [phoneticText, setPhoneticText] = useState('Cai nay bao nyew tien vay ah?');
  const [tipText, setTipText] = useState('Pregunta estándar para puestos callejeros y tiendas.');

  const [isTranslating, setIsTranslating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [isFullscreenOutput, setIsFullscreenOutput] = useState(false);
  useScrollLock(isFullscreenOutput);
  const [quickCategory, setQuickCategory] = useState<string>('frecuentes');
  const [customCards, setCustomCards] = useState<CustomTranslationCard[]>(() => getSavedCustomCards());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [speechSettings, setSpeechSettings] = useState<SpeechSettings>(() => getSavedSpeechSettings());
  const [speakingState, setSpeakingState] = useState<{
    isSpeaking: boolean;
    speakingId: string | null;
  }>({ isSpeaking: false, speakingId: null });

  // Subscribe to speech settings changes
  useEffect(() => {
    return subscribeSpeechSettings((s) => setSpeechSettings(s));
  }, []);

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

  // Handle incoming phrase from Guía & Diccionario
  useEffect(() => {
    if (targetPhrase) {
      setInputText(targetPhrase.es);
      setTranslatedText(targetPhrase.vi);
      setPhoneticText(targetPhrase.phonetic || '');
      setTipText(targetPhrase.tip || '');
      setDirection('traveler-to-vi');
      if (autoSpeak) {
        speakVietnamese(targetPhrase.vi, 'conversation-incoming-phrase');
      }
      setTimeout(() => {
        if (translationBoardRef.current) {
          translationBoardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 80);
      onClearTargetPhrase?.();
    }
  }, [targetPhrase, autoSpeak, onClearTargetPhrase]);

  // Modal for creating custom cards
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customFormEs, setCustomFormEs] = useState('');
  const [customFormVi, setCustomFormVi] = useState('');
  const [customFormPhonetic, setCustomFormPhonetic] = useState('');
  const [customFormCategory, setCustomFormCategory] = useState<'precios' | 'comida' | 'transporte' | 'cortesia' | 'emergencia'>('precios');
  const [isAutoTranslatingCustom, setIsAutoTranslatingCustom] = useState(false);

  // Speech recognition
  const recognitionRef = useRef<any>(null);
  const [isListening, setIsListening] = useState(false);
  const translationBoardRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2800);
  };

  // Check if current translation is already saved as a custom card
  const isCurrentCardSaved = customCards.some(
    (c) =>
      Boolean(translatedText && c.vi.trim().toLowerCase() === translatedText.trim().toLowerCase()) ||
      Boolean(inputText && c.es.trim().toLowerCase() === inputText.trim().toLowerCase()) ||
      Boolean(inputText && c.label.trim().toLowerCase() === inputText.trim().toLowerCase())
  );

  const handleToggleSaveCurrentCard = () => {
    if (!translatedText) return;

    const existing = customCards.find(
      (c) =>
        Boolean(translatedText && c.vi.trim().toLowerCase() === translatedText.trim().toLowerCase()) ||
        Boolean(inputText && c.es.trim().toLowerCase() === inputText.trim().toLowerCase()) ||
        Boolean(inputText && c.label.trim().toLowerCase() === inputText.trim().toLowerCase())
    );

    if (existing) {
      const updated = deleteSavedCustomCard(existing.id);
      setCustomCards(updated);
      showToast('Tarjeta eliminada de tus guardadas');
    } else {
      const validCategory: 'precios' | 'comida' | 'transporte' | 'cortesia' | 'emergencia' =
        quickCategory === 'guardadas' || quickCategory === 'frecuentes'
          ? 'cortesia'
          : (quickCategory as any) || 'cortesia';

      const labelText = (travelerLang === 'es' ? inputText : inputText).trim() || translatedText.slice(0, 30);
      const newCard: CustomTranslationCard = {
        id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        label: labelText,
        category: validCategory,
        en: travelerLang === 'en' ? inputText.trim() : translatedText.trim(),
        es: travelerLang === 'es' ? inputText.trim() : translatedText.trim(),
        vi: isTravelerToVi ? translatedText.trim() : inputText.trim(),
        phonetic: phoneticText || '',
        tip: tipText || 'Guardada por ti',
        createdAt: Date.now(),
      };

      const updated = saveCustomCard(newCard);
      setCustomCards(updated);
      showToast('⭐ ¡Tarjeta guardada en tus frases!');
    }
  };

  const handleDeleteCustomCard = (cardId: string) => {
    const updated = deleteSavedCustomCard(cardId);
    setCustomCards(updated);
    showToast('Tarjeta eliminada');
  };

  const handleAutoTranslateCustomForm = async () => {
    if (!customFormEs.trim()) return;
    setIsAutoTranslatingCustom(true);
    try {
      if (isOnline) {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: customFormEs.trim(),
            sourceLang: 'es',
            targetLang: 'vi',
          }),
        });
        const data = await res.json();
        if (data && data.translation) {
          setCustomFormVi(data.translation.translatedText || data.translation.vietnamese || '');
          if (data.translation.phonetic) {
            setCustomFormPhonetic(data.translation.phonetic);
          }
          return;
        }
      }

      // Offline dictionary fallback for custom creation
      const clean = customFormEs.trim().toLowerCase();
      const match = TRAVEL_PHRASES.find(
        (p) =>
          p.spanish.toLowerCase().includes(clean) ||
          clean.includes(p.spanish.toLowerCase())
      );
      if (match) {
        setCustomFormVi(match.vietnamese);
        setCustomFormPhonetic(match.phonetic);
      } else {
        setCustomFormVi(customFormEs.trim());
      }
    } catch {
      // Ignore network errors in custom creator
    } finally {
      setIsAutoTranslatingCustom(false);
    }
  };

  const handleSaveNewCustomCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFormEs.trim() || !customFormVi.trim()) return;

    const newCard: CustomTranslationCard = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label: customFormEs.trim(),
      category: customFormCategory,
      en: customFormEs.trim(),
      es: customFormEs.trim(),
      vi: customFormVi.trim(),
      phonetic: customFormPhonetic.trim() || customFormVi.trim(),
      tip: 'Tarjeta personalizada',
      createdAt: Date.now(),
    };

    const updated = saveCustomCard(newCard);
    setCustomCards(updated);
    setQuickCategory('guardadas');

    // Also populate in current translator board
    setInputText(newCard.es);
    setTranslatedText(newCard.vi);
    setPhoneticText(newCard.phonetic);
    setTipText(newCard.tip || '');

    // Reset form and close
    setCustomFormEs('');
    setCustomFormVi('');
    setCustomFormPhonetic('');
    setIsCustomModalOpen(false);
    showToast('⭐ ¡Tarjeta creada y añadida con éxito!');
  };

  // Close fullscreen on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreenOutput(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Speech recognition cleanup
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  const handleToggleDirection = () => {
    if (direction === 'traveler-to-vi') {
      setDirection('vi-to-traveler');
      setInputText(translatedText || 'Năm mươi nghìn');
      setTranslatedText(travelerLang === 'es' ? 'Cincuenta mil dongs (~1,90 €)' : 'Fifty thousand VND (~1.90 €)');
      setPhoneticText('Nam muoi nghin');
      setTipText('50.000 dongs vietnamitas');
    } else {
      setDirection('traveler-to-vi');
      setInputText(travelerLang === 'es' ? '¿Cuánto cuesta esto?' : 'How much is this?');
      setTranslatedText('Cái này bao nhiêu tiền vậy ạ?');
      setPhoneticText('Cai nay bao nyew tien vay ah?');
      setTipText('Pregunta de precio habitual en tiendas y mercados.');
    }
  };

  const handleTranslate = async (overrideText?: string) => {
    const textToTranslate = (overrideText !== undefined ? overrideText : inputText).trim();
    if (!textToTranslate) return;

    setIsTranslating(true);

    try {
      const isViToTraveler = direction === 'vi-to-traveler';
      const sourceLang = isViToTraveler ? 'vi' : travelerLang;
      const targetLang = isViToTraveler ? travelerLang : 'vi';

      if (isOnline) {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: textToTranslate, sourceLang, targetLang }),
        });
        const data = await res.json();
        if (data && data.translation) {
          const resultVi = data.translation.translatedText || data.translation.vietnamese || textToTranslate;
          setTranslatedText(resultVi);
          setPhoneticText(data.translation.phonetic || '');
          setTipText(data.translation.tip || '');

          if (autoSpeak) {
            if (isViToTraveler) {
              if (travelerLang === 'es') {
                speakSpanish(resultVi);
              } else {
                speakEnglish(resultVi);
              }
            } else {
              speakVietnamese(resultVi);
            }
          }
          return;
        }
      }

      // Offline fallback
      if (direction === 'traveler-to-vi') {
        const normalized = textToTranslate.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        // 1. Check quick phrases
        const quickMatch = QUICK_PHRASES.find(
          (q) =>
            q.en.toLowerCase().includes(textToTranslate.toLowerCase()) ||
            q.es.toLowerCase().includes(textToTranslate.toLowerCase()) ||
            q.label.toLowerCase().includes(textToTranslate.toLowerCase())
        );

        // 2. Check travel phrases
        const travelMatch = TRAVEL_PHRASES.find((p) => {
          const pNorm = p.spanish.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          return normalized.includes(pNorm) || pNorm.includes(normalized);
        });

        // 3. Keyword dictionary for common conversational travel expressions
        let viText = '';
        let phoText = '';
        let tip = '';

        if (quickMatch) {
          viText = quickMatch.vi;
          phoText = quickMatch.phonetic;
          tip = quickMatch.tip || '';
        } else if (travelMatch) {
          viText = travelMatch.vietnamese;
          phoText = travelMatch.phonetic;
          tip = travelMatch.toneTip || '';
        } else if (normalized.includes('hola') || normalized.includes('que tal') || normalized.includes('buenos dias')) {
          viText = 'Xin chào, bạn khỏe không?';
          phoText = 'Sin chao, ban kwoe khong?';
          tip = 'Saludo cordial universal en Vietnam.';
        } else if (normalized.includes('cuanto') || normalized.includes('precio') || normalized.includes('cuesta')) {
          viText = 'Cái này bao nhiêu tiền vậy ạ?';
          phoText = 'Cai nay bao nyew tien vay ah?';
          tip = 'Pregunta clave para compras.';
        } else if (normalized.includes('gracias')) {
          viText = 'Cảm ơn bạn rất nhiều!';
          phoText = 'Cam on ban rut nyew!';
          tip = 'Acompaña con una sonrisa cordial.';
        } else if (normalized.includes('cuenta') || normalized.includes('pagar')) {
          viText = 'Em ơi, tính tiền giúp anh / chị với!';
          phoText = 'Em oy, tin tien zoop voy!';
          tip = 'Llamada educada para pedir la cuenta.';
        } else if (normalized.includes('picante') || normalized.includes('chile')) {
          viText = 'Làm ơn đừng cho ớt và không cay nhé!';
          phoText = 'Lam on dung cho ot va khong cay nye!';
          tip = 'Pide sin picante ni guindilla fresca.';
        } else if (normalized.includes('bano') || normalized.includes('servicios') || normalized.includes('toilet')) {
          viText = 'Nhà vệ sinh ở đâu vậy ạ?';
          phoText = 'Nya ve sin o dau vay ah?';
          tip = 'Pregunta por el baño o aseos.';
        } else if (normalized.includes('cafe')) {
          viText = 'Cho tôi một ly cà phê sữa đá nhé!';
          phoText = 'Cho toi mot ly ca fe sua da nye!';
          tip = 'Café con leche condensada y hielo.';
        } else if (normalized.includes('agua')) {
          viText = 'Cho tôi một chai nước suối nhé!';
          phoText = 'Cho toi mot chai nuoc suoy nye!';
          tip = 'Botella de agua mineral cerrada.';
        } else if (normalized.includes('ayuda') || normalized.includes('socorro') || normalized.includes('por favor')) {
          viText = 'Làm ơn giúp tôi với được không?';
          phoText = 'Lam on zoop toi voy duoc khong?';
          tip = 'Petición cortés de auxilio o ayuda.';
        } else {
          viText = 'Xin chào, tôi cần sự giúp đỡ.';
          phoText = 'Sin chao, toi can su zoop do.';
          tip = 'Modo sin conexión. Puedes seleccionar frases rápidas directamente desde el menú inferior.';
        }

        setTranslatedText(viText);
        setPhoneticText(phoText);
        setTipText(tip);
        if (autoSpeak) speakVietnamese(viText);
      } else {
        const viText = textToTranslate;
        setTranslatedText(travelerLang === 'es' ? 'Traducción rápida: por favor elige una frase del panel inferior' : 'Quick translation: please choose a phrase from the panel below');
        setPhoneticText(viText);
        setTipText('Para traducciones completas utiliza la conexión a internet.');
      }
    } catch (err) {
      console.warn('Translate error:', err);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleQuickPhraseClick = (phrase: QuickPhrase) => {
    const playId = `quick-${phrase.id || phrase.label}`;
    if (direction === 'traveler-to-vi') {
      const query = travelerLang === 'es' ? phrase.es : phrase.en;
      setInputText(query);
      setTranslatedText(phrase.vi);
      setPhoneticText(phrase.phonetic);
      setTipText(phrase.tip || '');
      if (autoSpeak) {
        speakVietnamese(phrase.vi, playId);
      }
    } else {
      setInputText(phrase.vi);
      setTranslatedText(travelerLang === 'es' ? phrase.es : phrase.en);
      setPhoneticText(phrase.phonetic);
      setTipText(phrase.tip || '');
      if (autoSpeak) {
        if (travelerLang === 'es') {
          speakSpanish(phrase.es, playId);
        } else {
          speakEnglish(phrase.en, playId);
        }
      }
    }

    // Smooth scroll to the translation board
    setTimeout(() => {
      if (translationBoardRef.current) {
        translationBoardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  };

  const handleSpeakOutput = () => {
    if (!translatedText) return;
    const playId = 'conversation-main-output';
    if (speakingState.isSpeaking && speakingState.speakingId === playId) {
      stopAllSpeech();
      return;
    }
    if (direction === 'traveler-to-vi') {
      speakVietnamese(translatedText, playId);
    } else {
      if (travelerLang === 'es') {
        speakSpanish(translatedText, playId);
      } else {
        speakEnglish(translatedText, playId);
      }
    }
  };

  const handleCopy = () => {
    if (!translatedText) return;
    navigator.clipboard.writeText(translatedText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const toggleMic = async () => {
    const micPerm = await requestMicrophonePermission();
    if (!micPerm.success && micPerm.status === 'denied') {
      showToast('⚠️ Permiso de micrófono bloqueado. Actívalo en el icono de candado 🔒 de la barra del navegador.');
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition ||
      (window as any).mozSpeechRecognition ||
      (window as any).msSpeechRecognition;

    if (!SpeechRecognition) {
      showToast('⚠️ Micrófono no soportado en este navegador. Escribe o selecciona un atajo rápido.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      if (direction === 'traveler-to-vi') {
        recognition.lang = travelerLang === 'es' ? 'es-ES' : 'en-US';
      } else {
        recognition.lang = 'vi-VN';
      }

      recognition.onstart = () => {
        setIsListening(true);
        showToast('🎙️ Escuchando... Habla ahora');
      };

      recognition.onresult = (e: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = e.resultIndex; i < e.results.length; ++i) {
          if (e.results[i].isFinal) {
            finalTranscript += e.results[i][0].transcript;
          } else {
            interimTranscript += e.results[i][0].transcript;
          }
        }

        const currentText = finalTranscript || interimTranscript;
        if (currentText) {
          setInputText(currentText);
        }

        if (finalTranscript) {
          setIsListening(false);
          handleTranslate(finalTranscript);
        }
      };

      recognition.onerror = async (e: any) => {
        setIsListening(false);
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              stream.getTracks().forEach((track) => track.stop());
              showToast('✅ Permiso de micrófono concedido. Pulsa de nuevo para dictar.');
              return;
            } catch {
              showToast('⚠️ Permiso de micrófono bloqueado en Chrome.');
              return;
            }
          }
          showToast('⚠️ Permiso de micrófono bloqueado.');
        } else if (e.error === 'no-speech') {
          showToast('No se detectó voz. Pulsa el botón para hablar de nuevo.');
        } else if (e.error === 'network') {
          showToast('Error de red en el procesado de voz.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.warn('SpeechRecognition start error:', err);
      setIsListening(false);
    }
  };

  const isTravelerToVi = direction === 'traveler-to-vi';

  // Custom cards for active category
  const activeCustomCards = customCards.filter(
    (c) => quickCategory === 'guardadas' || quickCategory === 'frecuentes' || c.category === quickCategory
  );

  const activeDefaultCards =
    quickCategory === 'guardadas'
      ? []
      : QUICK_PHRASES.filter((p) => p.category === quickCategory);

  // Custom cards come FIRST in displayed list
  const displayedPhrases: QuickPhrase[] = [
    ...activeCustomCards.map((c) => ({
      id: c.id,
      label: c.label,
      category: c.category as any,
      en: c.en,
      es: c.es,
      vi: c.vi,
      phonetic: c.phonetic,
      tip: c.tip,
      isCustom: true,
    })),
    ...activeDefaultCards.map((p) => ({
      ...p,
      id: `default-${p.category}-${p.label}`,
      isCustom: false,
    })),
  ];

  const categoryTabs = [
    { id: 'frecuentes', label: '⚡ Frecuentes' },
    { id: 'precios', label: '💰 Billetes & Precios' },
    { id: 'comida', label: '🍜 Comida & Café' },
    { id: 'transporte', label: '🚗 Grab & Transporte' },
    { id: 'cortesia', label: '💬 Cortesía' },
    { id: 'emergencia', label: '🚨 Ayuda & Baño' },
    ...(customCards.length > 0
      ? [{ id: 'guardadas', label: `⭐ Guardadas (${customCards.length})` }]
      : []),
  ];

  return (
    <div className="space-y-5 max-w-4xl mx-auto w-full min-w-0 relative">
      {/* TOAST FEEDBACK */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-stone-700 text-xs font-semibold flex items-center gap-2 animate-bounce">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. COMPACT STATUS & CONTROLS HEADER */}
      <div className="bg-gradient-to-r from-[#181614] via-[#201d19] to-[#181614] text-stone-100 rounded-2xl p-3.5 sm:px-5 sm:py-4 border border-amber-500/20 shadow-[0_4px_20px_rgba(0,0,0,0.25)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
            <Languages className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-serif font-bold text-sm sm:text-base text-white tracking-tight">Traductor en Vivo</span>
              <span className={`flex items-center gap-1.5 text-[10px] sm:text-[11px] px-2.5 py-0.5 rounded-full border shadow-2xs ${
                isOnline
                  ? 'bg-stone-900/90 text-stone-300 border-stone-800'
                  : 'bg-amber-950/80 text-amber-300 border-amber-800/80'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span className="font-medium">{isOnline ? 'Online (IA)' : 'Sin conexión'}</span>
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-stone-400 mt-0.5">
              {isOnline
                ? 'Habla o escribe para traducir al instante con IA y voz'
                : 'Traductor con IA pausado. Consulta las secciones 100% offline'}
            </p>
          </div>
        </div>

        {/* Actions: Voice Settings + Google Translate external link */}
        <div className="flex items-center gap-2">
          {onOpenVoiceSettings && (
            <button
              type="button"
              onClick={onOpenVoiceSettings}
              className="px-3 py-1.5 rounded-xl bg-stone-900/90 hover:bg-stone-800 text-amber-300 hover:text-amber-200 border border-stone-700/80 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-2xs"
              title="Ajustar velocidad y tipo de voz"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>Voz {speechSettings.gender === 'female' ? '👩' : '👨'} · {speechSettings.speedPreset === 'slow' ? '0.8x' : speechSettings.speedPreset === 'fast' ? '1.1x' : '0.95x'}</span>
            </button>
          )}

          <button
            id="btn-open-google-translate"
            onClick={() => openGoogleTranslate(travelerLang === 'es' ? 'es' : 'en', 'vi', inputText)}
            className="px-3 py-1.5 rounded-xl bg-stone-900/90 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-700/80 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-2xs"
            title="Abrir en Google Translate oficial"
          >
            <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
            <span>Google Translate ↗</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN TRANSLATOR BOARD */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-stone-200/90 shadow-[0_4px_24px_rgba(28,25,23,0.04)] space-y-6">
        {isOnline ? (
          <>
            {/* Top Control Bar: Unified Direction, Language Toggle & Voice Auto-Play */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
              {/* Unified Language Direction Switcher */}
              <div className="flex items-center gap-2 bg-stone-100/90 p-1.5 rounded-2xl border border-stone-200/80 shadow-2xs max-w-full overflow-x-auto">
                {/* Left / Source Language Card */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-stone-900 font-bold text-xs shadow-xs border border-stone-200/60">
                  {direction === 'traveler-to-vi' ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-stone-400">🗣️</span>
                      <span>{travelerLang === 'es' ? '🇪🇸 Español' : '🇬🇧 English'}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = travelerLang === 'es' ? 'en' : 'es';
                          setTravelerLang(next);
                          if (next === 'en' && inputText === '¿Cuánto cuesta esto?') setInputText('How much is this?');
                          if (next === 'es' && inputText === 'How much is this?') setInputText('¿Cuánto cuesta esto?');
                        }}
                        className="text-[10px] text-amber-800 font-bold bg-amber-50 hover:bg-amber-100 px-1.5 py-0.5 rounded-md border border-amber-200 ml-1 transition cursor-pointer"
                        title="Cambiar entre Español e Inglés"
                      >
                        {travelerLang === 'es' ? 'EN' : 'ES'}
                      </button>
                    </div>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <span>🇻🇳 Tiếng Việt (Local)</span>
                    </span>
                  )}
                </div>

                {/* Central Swap Button */}
                <button
                  type="button"
                  onClick={handleToggleDirection}
                  title="Invertir quién habla"
                  className="p-2 rounded-xl bg-white hover:bg-amber-400 text-stone-700 hover:text-stone-950 border border-stone-200/80 transition-all cursor-pointer active:scale-90 shadow-2xs group"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 text-stone-700 group-hover:text-stone-950 group-hover:rotate-180 transition-transform duration-200" />
                </button>

                {/* Right / Target Language Card */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-stone-900 font-bold text-xs shadow-xs border border-stone-200/60">
                  {direction === 'traveler-to-vi' ? (
                    <span className="flex items-center gap-1.5">
                      <span>🇻🇳 Tiếng Việt (Local)</span>
                    </span>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="text-stone-400">🗣️</span>
                      <span>{travelerLang === 'es' ? '🇪🇸 Español' : '🇬🇧 English'}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = travelerLang === 'es' ? 'en' : 'es';
                          setTravelerLang(next);
                        }}
                        className="text-[10px] text-amber-800 font-bold bg-amber-50 hover:bg-amber-100 px-1.5 py-0.5 rounded-md border border-amber-200 ml-1 transition cursor-pointer"
                        title="Cambiar entre Español e Inglés"
                      >
                        {travelerLang === 'es' ? 'EN' : 'ES'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Auto voice playback pill toggle */}
              <button
                type="button"
                onClick={() => setAutoSpeak(!autoSpeak)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-semibold border transition cursor-pointer active:scale-95 shadow-2xs select-none ${
                  autoSpeak
                    ? 'bg-amber-50 border-amber-300 text-amber-950 font-bold'
                    : 'bg-stone-50 border-stone-200 text-stone-500 hover:bg-stone-100'
                }`}
                title="Activar o pausar la voz automática al traducir"
              >
                <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${autoSpeak ? 'bg-amber-500 text-stone-950 font-black' : 'bg-stone-300 text-transparent'}`}>
                  ✓
                </div>
                <span>Voz automática</span>
              </button>
            </div>

            {/* Dual Input/Output Translation Cards */}
            <div ref={translationBoardRef} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch scroll-mt-6">
              {/* Card 1: Input Box (Source) */}
              <div className="rounded-3xl border-2 border-stone-200/90 bg-stone-50/60 p-5 flex flex-col justify-between focus-within:border-amber-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-amber-500/10 transition-all">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-stone-500">
                    <span className="flex items-center gap-1.5">
                      <span>{isTravelerToVi ? (travelerLang === 'es' ? '🇪🇸 Tu frase (Español)' : '🇬🇧 Your text (English)') : '🇻🇳 Tiếng Việt (Local)'}</span>
                    </span>
                    {inputText && (
                      <button
                        type="button"
                        onClick={() => setInputText('')}
                        className="text-stone-400 hover:text-stone-700 text-[11px] font-semibold cursor-pointer"
                      >
                        Borrar
                      </button>
                    )}
                  </div>

                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleTranslate();
                      }
                    }}
                    placeholder={
                      isTravelerToVi
                        ? travelerLang === 'es'
                          ? 'Escribe o pulsa el micro para hablar...'
                          : 'Type or tap microphone to speak...'
                        : 'Nói hoặc gõ tiếng Việt...'
                    }
                    rows={3}
                    className="w-full bg-transparent border-0 resize-none text-stone-900 placeholder:text-stone-400 font-sans text-base sm:text-lg focus:outline-none leading-snug"
                  />
                </div>

                {/* Input Action Controls */}
                <div className="flex items-center justify-between pt-3 border-t border-stone-200/60 mt-2 gap-2">
                  <button
                    type="button"
                    onClick={toggleMic}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold transition cursor-pointer active:scale-95 shadow-2xs ${
                      isListening
                        ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-300'
                        : 'bg-white hover:bg-stone-100 text-stone-800 border border-stone-300/80'
                    }`}
                    title="Hablar por micrófono"
                  >
                    {isListening ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4 text-amber-600" />}
                    <span>{isListening ? 'Escuchando...' : 'Hablar'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTranslate()}
                    disabled={isTranslating || !inputText.trim()}
                    className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-bold text-xs transition cursor-pointer active:scale-95 shadow-xs"
                    title="Traducir con IA"
                  >
                    <Sparkles className={`w-4 h-4 ${isTranslating ? 'animate-spin' : ''}`} />
                    <span>{isTranslating ? 'Traduciendo...' : 'Traducir'}</span>
                  </button>
                </div>
              </div>

              {/* Card 2: Output Box (Target) */}
              <div className="rounded-3xl border-2 border-amber-300/80 bg-gradient-to-br from-amber-50/70 via-amber-50/30 to-amber-100/20 p-5 flex flex-col justify-between relative shadow-xs">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                    <span className="flex items-center gap-1.5">
                      <span>{isTravelerToVi ? '🇻🇳 Traducción (Tiếng Việt)' : travelerLang === 'es' ? '🇪🇸 Traducción (Español)' : '🇬🇧 Translation (English)'}</span>
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleToggleSaveCurrentCard}
                        className={`p-1.5 rounded-xl transition cursor-pointer ${
                          isCurrentCardSaved
                            ? 'bg-amber-400 text-stone-950 font-bold'
                            : 'text-amber-800 hover:bg-amber-200/60'
                        }`}
                        title={isCurrentCardSaved ? 'Eliminar de tus guardadas' : 'Guardar frase'}
                      >
                        <Star className={`w-3.5 h-3.5 ${isCurrentCardSaved ? 'fill-stone-950' : ''}`} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsFullscreenOutput(true)}
                        className="p-1.5 rounded-xl text-amber-800 hover:bg-amber-200/60 transition cursor-pointer"
                        title="Mostrar en pantalla completa"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="font-serif font-black text-xl sm:text-2xl text-stone-950 leading-snug break-words">
                    {translatedText || '...'}
                  </p>

                  {phoneticText && (
                    <div className="text-xs font-mono text-stone-700 flex items-center gap-1.5 flex-wrap pt-0.5">
                      <span className="text-stone-400 font-sans">🗣️ Fonética:</span>
                      <strong className="text-amber-950 font-semibold">{phoneticText}</strong>
                    </div>
                  )}

                  {tipText && (
                    <p className="text-[11px] text-amber-900/90 leading-relaxed font-medium bg-amber-100/40 p-2 rounded-xl border border-amber-200/60">
                      💡 {tipText}
                    </p>
                  )}
                </div>

                {/* Output Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-amber-200/70 mt-3 gap-2">
                  <button
                    type="button"
                    onClick={handleSpeakOutput}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold transition cursor-pointer active:scale-95 shadow-2xs ${
                      speakingState.isSpeaking && speakingState.speakingId === 'conversation-main-output'
                        ? 'bg-amber-400 text-stone-950 ring-2 ring-amber-400/40'
                        : 'bg-white hover:bg-stone-100 text-stone-900 border border-amber-200/80'
                    }`}
                    title="Reproducir pronunciación"
                  >
                    <AudioWaveIndicator
                      isPlaying={speakingState.isSpeaking && speakingState.speakingId === 'conversation-main-output'}
                      size="sm"
                      colorClass="text-stone-950"
                    />
                    <span>
                      {speakingState.isSpeaking && speakingState.speakingId === 'conversation-main-output'
                        ? 'Reproduciendo...'
                        : 'Escuchar'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white/80 hover:bg-white text-stone-700 text-xs font-semibold border border-amber-200/80 transition cursor-pointer active:scale-95"
                    title="Copiar traducción"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* DEDICATED OFFLINE STATE CARD */
          <div className="rounded-3xl border-2 border-stone-200/90 bg-stone-50/70 p-6 sm:p-8 text-center space-y-4 shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 mx-auto shadow-inner">
              <WifiOff className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <h4 className="font-serif font-bold text-base sm:text-lg text-stone-900">
                El Traductor en Vivo requiere conexión a internet
              </h4>
              <p className="text-xs text-stone-500 leading-relaxed">
                Para traducir texto libre y utilizar el dictado por voz con IA en tiempo real se necesita conexión. Mientras no tengas cobertura, puedes consultar las secciones 100% offline:
              </p>
            </div>

            {/* Quick jumps to offline tabs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-w-xl mx-auto pt-2">
              <button
                type="button"
                onClick={() => onNavigateTab?.('phrases')}
                className="p-3.5 rounded-2xl bg-white hover:bg-stone-50 border border-stone-200 hover:border-amber-400 text-left transition cursor-pointer shadow-2xs group flex flex-col justify-between gap-1.5 active:scale-95"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-600" />
                  <span className="font-bold text-xs text-stone-900 group-hover:text-amber-800">Frases Útiles</span>
                </div>
                <p className="text-[11px] text-stone-500 leading-tight">
                  Expresiones con fonética y audio local offline.
                </p>
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab?.('food')}
                className="p-3.5 rounded-2xl bg-white hover:bg-stone-50 border border-stone-200 hover:border-amber-400 text-left transition cursor-pointer shadow-2xs group flex flex-col justify-between gap-1.5 active:scale-95"
              >
                <div className="flex items-center gap-2">
                  <UtensilsCrossed className="w-4 h-4 text-amber-600" />
                  <span className="font-bold text-xs text-stone-900 group-hover:text-amber-800">Platos & Menú</span>
                </div>
                <p className="text-[11px] text-stone-500 leading-tight">
                  Guía de comidas típicas e ingredientes.
                </p>
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab?.('allergy')}
                className="p-3.5 rounded-2xl bg-white hover:bg-stone-50 border border-stone-200 hover:border-amber-400 text-left transition cursor-pointer shadow-2xs group flex flex-col justify-between gap-1.5 active:scale-95"
              >
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span className="font-bold text-xs text-stone-900 group-hover:text-rose-800">Alergias</span>
                </div>
                <p className="text-[11px] text-stone-500 leading-tight">
                  Fichas médicas a pantalla completa.
                </p>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. FULLSCREEN DISPLAY MODAL (For showing the phone to vendors) */}
      {isFullscreenOutput && (
        <div
          className="fixed inset-0 z-50 bg-stone-950/95 backdrop-blur-sm flex flex-col justify-between p-4 sm:p-10 text-white animate-fade-in"
          style={{
            paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))',
            paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
          }}
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between border-b border-stone-800 pb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{isTravelerToVi ? '🇻🇳' : '🇪🇸'}</span>
              <span className="text-sm sm:text-base font-bold text-amber-300 uppercase tracking-wider">
                {isTravelerToVi ? 'Tiếng Việt' : 'Español'}
              </span>
            </div>

            <button
              onClick={() => setIsFullscreenOutput(false)}
              className="px-3.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Cerrar</span>
            </button>
          </div>

          {/* Large Print Text in Center */}
          <div className="my-auto text-center space-y-4 max-w-2xl mx-auto px-4">
            <div className="text-3xl sm:text-5xl font-black text-white leading-relaxed font-sans tracking-tight">
              {translatedText}
            </div>

            {phoneticText && (
              <div className="text-lg sm:text-2xl text-amber-300 font-mono">
                {phoneticText}
              </div>
            )}

            {tipText && (
              <p className="text-xs sm:text-sm text-stone-400 max-w-md mx-auto">
                {tipText}
              </p>
            )}
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center justify-center gap-4 pt-4 border-t border-stone-800">
            <button
              onClick={handleSpeakOutput}
              className={`px-6 py-3 rounded-2xl font-bold text-sm shadow-lg flex items-center gap-2 cursor-pointer transition active:scale-95 ${
                speakingState.isSpeaking && speakingState.speakingId === 'conversation-main-output'
                  ? 'bg-amber-400 text-stone-950 ring-4 ring-amber-400/30'
                  : 'bg-amber-500 hover:bg-amber-400 text-stone-950'
              }`}
            >
              <AudioWaveIndicator
                isPlaying={speakingState.isSpeaking && speakingState.speakingId === 'conversation-main-output'}
                size="lg"
                colorClass="text-stone-950"
              />
              <span>
                {speakingState.isSpeaking && speakingState.speakingId === 'conversation-main-output'
                  ? 'Reproduciendo voz (Clic para pausar)'
                  : isTravelerToVi
                  ? 'Reproducir voz en vietnamita'
                  : 'Reproducir voz'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
