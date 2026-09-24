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
} from 'lucide-react';
import {
  speakVietnamese,
  speakEnglish,
  openGoogleTranslate,
  CustomTranslationCard,
  getSavedCustomCards,
  saveCustomCard,
  deleteSavedCustomCard,
} from '../utils/storage';
import { TRAVEL_PHRASES } from '../data/phrases';

interface ConversationModeProps {
  isOnline: boolean;
}

export interface QuickPhrase {
  id?: string;
  label: string;
  category: 'precios' | 'comida' | 'transporte' | 'cortesia' | 'emergencia';
  en: string;
  es: string;
  vi: string;
  phonetic: string;
  tip?: string;
  isCustom?: boolean;
}

const QUICK_PHRASES: QuickPhrase[] = [
  // --- 1. PRECIOS & COMPRAS ---
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
  {
    label: '20.000 ₫ (~0,75 €)',
    category: 'precios',
    en: 'Twenty thousand VND',
    es: 'Veinte mil dongs',
    vi: 'Hai mươi nghìn',
    phonetic: 'Hai muoi nghin',
    tip: '20k VND. Billete azul de papel/polímero. Típico de un té helado (trà đá).',
  },
  {
    label: '50.000 ₫ (~1,90 €)',
    category: 'precios',
    en: 'Fifty thousand VND',
    es: 'Cincuenta mil dongs',
    vi: 'Năm mươi nghìn',
    phonetic: 'Nam muoi nghin',
    tip: '50k VND. Billete rosa rojizo. Precio habitual de un plato de phở o bún chả.',
  },
  {
    label: '100.000 ₫ (~3,80 €)',
    category: 'precios',
    en: 'One hundred thousand VND',
    es: 'Cien mil dongs',
    vi: 'Một trăm nghìn',
    phonetic: 'Mot tram nghin',
    tip: '100k VND. Billete verde de polímero. Muy común para compras medias.',
  },
  {
    label: '200.000 ₫ (~7,60 €)',
    category: 'precios',
    en: 'Two hundred thousand VND',
    es: 'Doscientos mil dongs',
    vi: 'Hai trăm nghìn',
    phonetic: 'Hai tram nghin',
    tip: '200k VND. Billete granate rojizo. Frecuente en transportes y souvenirs.',
  },
  {
    label: '500.000 ₫ (~19,00 €)',
    category: 'precios',
    en: 'Five hundred thousand VND',
    es: 'Quinientos mil dongs',
    vi: 'Năm trăm nghìn',
    phonetic: 'Nam tram nghin',
    tip: '500k VND. El billete de mayor valor (azul/verde cian). Cuidado al dar cambio.',
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

export const ConversationMode: React.FC<ConversationModeProps> = ({ isOnline }) => {
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
  const [quickCategory, setQuickCategory] = useState<string>('precios');
  const [customCards, setCustomCards] = useState<CustomTranslationCard[]>(() => getSavedCustomCards());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
        quickCategory === 'guardadas' ? 'cortesia' : (quickCategory as any) || 'cortesia';

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
    setQuickCategory(customFormCategory);

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

  // Speech synthesis cleanup
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
      setTipText('Pregunta de precio para mostrar al vendedor.');
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
                speakEnglish(resultVi); // Fallback TTS
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
          tip = 'Pregunta clave para regatear y comprar.';
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
          // Genuine polite Vietnamese phrase for requesting something
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
        setTipText('Para traducciones bidireccionales completas utiliza la conexión a internet.');
      }
    } catch (err) {
      console.warn('Translate error:', err);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleQuickPhraseClick = (phrase: QuickPhrase) => {
    if (direction === 'traveler-to-vi') {
      const query = travelerLang === 'es' ? phrase.es : phrase.en;
      setInputText(query);
      setTranslatedText(phrase.vi);
      setPhoneticText(phrase.phonetic);
      setTipText(phrase.tip || '');
      if (autoSpeak) {
        speakVietnamese(phrase.vi);
      }
    } else {
      setInputText(phrase.vi);
      setTranslatedText(travelerLang === 'es' ? phrase.es : phrase.en);
      setPhoneticText(phrase.phonetic);
      setTipText(phrase.tip || '');
      if (autoSpeak) {
        speakEnglish(phrase.en);
      }
    }
  };

  const handleSpeakOutput = () => {
    if (!translatedText) return;
    if (direction === 'traveler-to-vi') {
      speakVietnamese(translatedText);
    } else {
      speakEnglish(translatedText);
    }
  };

  const handleCopy = () => {
    if (!translatedText) return;
    navigator.clipboard.writeText(translatedText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const toggleMic = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Tu navegador no soporta reconocimiento por voz directo. Puedes escribir el texto o abrir Google Translate con el botón superior.');
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
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = false;

      if (direction === 'traveler-to-vi') {
        recognition.lang = travelerLang === 'es' ? 'es-ES' : 'en-US';
      } else {
        recognition.lang = 'vi-VN';
      }

      setIsListening(true);

      recognition.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        setInputText(transcript);
        setIsListening(false);
        handleTranslate(transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const isTravelerToVi = direction === 'traveler-to-vi';

  // Custom cards for active category
  const activeCustomCards = customCards.filter(
    (c) => quickCategory === 'guardadas' || c.category === quickCategory
  );

  const activeDefaultCards =
    quickCategory === 'guardadas'
      ? []
      : QUICK_PHRASES.filter((p) => p.category === quickCategory);

  // Custom cards come FIRST!
  const displayedPhrases: QuickPhrase[] = [
    ...activeCustomCards.map((c) => ({
      id: c.id,
      label: c.label,
      category: c.category,
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
    { id: 'precios', label: '💰 Precios' },
    { id: 'comida', label: '🍜 Comida & Café' },
    { id: 'transporte', label: '🚗 Transporte & Grab' },
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

      {/* 1. STATUS CARD */}
      <div className="bg-stone-900 text-stone-100 rounded-2xl p-4 sm:p-5 border border-stone-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
            <Languages className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">Traductor Bidireccional</span>
              <span className="flex items-center gap-1.5 text-xs text-stone-300">
                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span>{isOnline ? 'Online con IA' : 'Modo Offline'}</span>
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              {isTravelerToVi ? (
                <span>
                  Traduciendo de <strong className="text-amber-300">{travelerLang === 'es' ? 'Español' : 'Inglés'}</strong> a <strong className="text-amber-300">Vietnamita</strong> para mostrar al dependiente.
                </span>
              ) : (
                <span>
                  Traduciendo de <strong className="text-amber-300">Vietnamita</strong> a <strong className="text-amber-300">{travelerLang === 'es' ? 'Español' : 'Inglés'}</strong>.
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Action: Google Translate external link */}
        <button
          id="btn-open-google-translate"
          onClick={() => openGoogleTranslate(travelerLang === 'es' ? 'es' : 'en', 'vi', inputText)}
          className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white border border-stone-700 text-xs font-semibold flex items-center gap-2 transition cursor-pointer shrink-0"
          title="Abrir frase en Google Translate oficial"
        >
          <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
          <span>Google Translate ↗</span>
        </button>
      </div>

      {/* 2. MAIN TRANSLATOR BOARD */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200 shadow-xs space-y-5">
        {/* Top Control Bar: Direction + Language toggle + Audio preference */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
          {/* Direction segmented pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex p-1 bg-stone-100 rounded-xl border border-stone-200 text-xs font-semibold">
              <button
                onClick={() => setDirection('traveler-to-vi')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  direction === 'traveler-to-vi'
                    ? 'bg-white text-stone-900 shadow-xs font-bold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <span>🗣️ Tú</span>
                <span className="text-stone-400">➔</span>
                <span>🇻🇳 Local</span>
              </button>

              <button
                onClick={handleToggleDirection}
                title="Invertir dirección"
                className="px-2 py-1.5 rounded-lg hover:bg-stone-200 text-stone-600 transition cursor-pointer"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-amber-600" />
              </button>

              <button
                onClick={() => setDirection('vi-to-traveler')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  direction === 'vi-to-traveler'
                    ? 'bg-white text-stone-900 shadow-xs font-bold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <span>🇻🇳 Local</span>
                <span className="text-stone-400">➔</span>
                <span>🗣️ Tú</span>
              </button>
            </div>

            {/* Tourist Language Picker (ES / EN) */}
            <div className="inline-flex p-1 bg-stone-100 rounded-xl border border-stone-200 text-xs font-semibold">
              <button
                onClick={() => {
                  setTravelerLang('es');
                  if (inputText === 'How much is this?') setInputText('¿Cuánto cuesta esto?');
                }}
                className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                  travelerLang === 'es' ? 'bg-white text-stone-900 shadow-xs font-bold' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                🇪🇸 ES
              </button>
              <button
                onClick={() => {
                  setTravelerLang('en');
                  if (inputText === '¿Cuánto cuesta esto?') setInputText('How much is this?');
                }}
                className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                  travelerLang === 'en' ? 'bg-white text-stone-900 shadow-xs font-bold' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                🇬🇧 EN
              </button>
            </div>
          </div>

          {/* Auto voice playback toggle */}
          <label className="inline-flex items-center gap-2 text-xs text-stone-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoSpeak}
              onChange={(e) => setAutoSpeak(e.target.checked)}
              className="rounded border-stone-300 text-amber-600 focus:ring-amber-500 h-4 w-4 cursor-pointer"
            />
            <span className="font-medium">Audio automático</span>
          </label>
        </div>

        {/* Dual Input/Output Translation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
          {/* Card 1: Input Box (Source) */}
          <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4 sm:p-5 flex flex-col justify-between focus-within:border-amber-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-amber-500/20 transition shadow-2xs min-h-[250px]">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-200/80">
              <div className="flex items-center gap-2">
                <span className="text-xl">{isTravelerToVi ? (travelerLang === 'es' ? '🇪🇸' : '🇬🇧') : '🇻🇳'}</span>
                <div>
                  <span className="text-xs font-bold text-stone-900 block leading-tight">
                    {isTravelerToVi ? (travelerLang === 'es' ? 'Tú hablas (Español)' : 'Tú hablas (Inglés)') : 'Habla el dependiente (Vietnamita)'}
                  </span>
                  <span className="text-[10px] text-stone-500 font-medium">Idioma de entrada</span>
                </div>
              </div>

              {/* Mic Speech Button */}
              <button
                type="button"
                onClick={toggleMic}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  isListening
                    ? 'bg-rose-600 text-white animate-pulse shadow-sm'
                    : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200'
                }`}
                title={isListening ? 'Detener micrófono' : 'Dictar por voz'}
              >
                {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-amber-600" />}
                <span className="text-[11px]">{isListening ? 'Escuchando...' : 'Voz'}</span>
              </button>
            </div>

            {/* Body: Textarea */}
            <div className="my-3 flex-1 flex flex-col justify-center">
              <textarea
                id="input-translate-text"
                rows={3}
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
                    ? (travelerLang === 'es' ? 'Escribe o dicta en español (ej. ¿Cuánto cuesta esto?)...' : 'Type or speak in English (e.g. How much is this?)...')
                    : 'Nhập hoặc nói tiếng Việt...'
                }
                className="w-full flex-1 text-base sm:text-lg font-medium text-stone-900 bg-transparent border-none focus:outline-none resize-none placeholder-stone-400 leading-snug"
              />
            </div>

            {/* Footer Toolbar */}
            <div className="pt-3 border-t border-stone-200/80 flex items-center justify-between text-xs">
              <div>
                {inputText ? (
                  <button
                    type="button"
                    onClick={() => setInputText('')}
                    className="text-stone-400 hover:text-stone-700 text-xs underline cursor-pointer"
                  >
                    Borrar
                  </button>
                ) : (
                  <span className="text-stone-400 text-[11px]">Pulsa Enter para traducir</span>
                )}
              </div>

              <button
                type="button"
                id="btn-submit-translate"
                onClick={() => handleTranslate()}
                disabled={isTranslating || !inputText.trim()}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-stone-950 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isTranslating ? 'animate-spin' : ''}`} />
                <span>{isTranslating ? 'Traduciendo...' : 'Traducir'}</span>
              </button>
            </div>
          </div>

          {/* Card 2: Output Box (Target / Presentation) */}
          <div className="rounded-2xl border border-amber-300/90 bg-amber-50/50 p-4 sm:p-5 flex flex-col justify-between shadow-2xs min-h-[250px] relative">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-amber-200/70">
              <div className="flex items-center gap-2">
                <span className="text-xl">{isTravelerToVi ? '🇻🇳' : (travelerLang === 'es' ? '🇪🇸' : '🇬🇧')}</span>
                <div>
                  <span className="text-xs font-bold text-amber-950 block leading-tight">
                    {isTravelerToVi ? 'Para mostrar al local (Tiếng Việt)' : (travelerLang === 'es' ? 'Traducción para ti (Español)' : 'Translation for you (English)')}
                  </span>
                  <span className="text-[10px] text-amber-800 font-medium">Resultado traducido</span>
                </div>
              </div>

              {/* Action Buttons: Audio, Copy, Fullscreen, Save */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleToggleSaveCurrentCard}
                  disabled={!translatedText}
                  className={`px-2.5 py-1.5 rounded-xl border transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
                    isCurrentCardSaved
                      ? 'bg-amber-100 text-amber-950 border-amber-300 font-bold'
                      : 'bg-white hover:bg-amber-100 text-stone-700 hover:text-amber-900 border-amber-200'
                  }`}
                  title={isCurrentCardSaved ? 'Tarjeta guardada (clic para quitar)' : 'Guardar esta traducción como tarjeta personal'}
                >
                  {isCurrentCardSaved ? (
                    <BookmarkCheck className="w-3.5 h-3.5 text-amber-700" />
                  ) : (
                    <Bookmark className="w-3.5 h-3.5 text-stone-600" />
                  )}
                  <span className="text-[11px] hidden sm:inline">
                    {isCurrentCardSaved ? 'Guardada ⭐' : 'Guardar'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleSpeakOutput}
                  disabled={!translatedText}
                  className="p-1.5 rounded-xl bg-white hover:bg-amber-100 text-stone-700 hover:text-amber-900 border border-amber-200 transition cursor-pointer"
                  title="Escuchar pronunciación nativa"
                >
                  <Volume2 className="w-4 h-4 text-amber-700" />
                </button>

                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={!translatedText}
                  className="p-1.5 rounded-xl bg-white hover:bg-amber-100 text-stone-700 hover:text-amber-900 border border-amber-200 transition cursor-pointer"
                  title="Copiar texto"
                >
                  {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-stone-600" />}
                </button>

                <button
                  type="button"
                  onClick={() => setIsFullscreenOutput(true)}
                  disabled={!translatedText}
                  className="p-1.5 rounded-xl bg-white hover:bg-amber-100 text-stone-700 hover:text-amber-900 border border-amber-200 transition cursor-pointer"
                  title="Pantalla completa para mostrar al dependiente"
                >
                  <Maximize2 className="w-4 h-4 text-amber-800" />
                </button>
              </div>
            </div>

            {/* Body: Translation and phonetics */}
            <div className="my-3 flex-1 flex flex-col justify-center space-y-2">
              <p className="text-xl sm:text-2xl font-bold font-sans text-stone-950 leading-snug break-words">
                {translatedText || '...'}
              </p>

              {phoneticText && (
                <div className="text-xs font-mono text-stone-700 flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-stone-400 font-sans">🗣️ Fonética:</span>
                  <strong className="text-amber-950 font-semibold">{phoneticText}</strong>
                </div>
              )}

              {tipText && (
                <p className="text-[11px] text-amber-900/90 leading-relaxed font-medium">
                  💡 {tipText}
                </p>
              )}
            </div>

            {/* Footer Toolbar */}
            <div className="pt-3 border-t border-amber-200/70 flex items-center justify-between text-xs text-stone-600">
              <span className="text-[11px] text-amber-900/80">
                {isTravelerToVi ? 'Muestra la pantalla hacia el vendedor' : 'Traducción directa al instante'}
              </span>

              <button
                type="button"
                onClick={handleSpeakOutput}
                className="text-amber-900 font-bold hover:underline cursor-pointer flex items-center gap-1 text-xs"
              >
                <Volume2 className="w-3.5 h-3.5 text-amber-700" />
                <span>Repetir voz</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. QUICK PHRASES (Categorized cards, user-saved cards first) */}
        <div className="space-y-3 pt-3 border-t border-stone-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-600">
              Frases y preguntas rápidas (1 toque para traducir):
            </span>

            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Category tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
                {categoryTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setQuickCategory(tab.id)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer shrink-0 ${
                      quickCategory === tab.id
                        ? 'bg-stone-900 text-white font-bold shadow-xs'
                        : 'text-stone-600 hover:text-stone-900 bg-stone-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Add custom card button */}
              <button
                type="button"
                onClick={() => {
                  setCustomFormCategory(
                    quickCategory === 'guardadas' ? 'precios' : (quickCategory as any) || 'precios'
                  );
                  setIsCustomModalOpen(true);
                }}
                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1 transition cursor-pointer shrink-0 shadow-2xs"
                title="Crear una tarjeta de traducción personalizada"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nueva</span>
              </button>
            </div>
          </div>

          {/* Cards Grid */}
          {displayedPhrases.length === 0 ? (
            <div className="p-8 text-center bg-stone-50 border border-stone-200 rounded-2xl space-y-2">
              <Star className="w-6 h-6 text-amber-500 mx-auto opacity-70" />
              <p className="text-xs font-bold text-stone-700">No tienes tarjetas guardadas todavía.</p>
              <p className="text-[11px] text-stone-500">
                Guarda cualquier traducción pulsando el botón "Guardar ⭐" o pulsa "+ Nueva" para crear una tarjeta personalizada.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {displayedPhrases.map((phrase) => (
                <button
                  key={phrase.id || phrase.label}
                  type="button"
                  onClick={() => handleQuickPhraseClick(phrase)}
                  className={`p-3 rounded-xl text-left transition cursor-pointer flex flex-col justify-between min-h-[82px] group relative shadow-2xs ${
                    phrase.isCustom
                      ? 'border border-amber-400 bg-amber-50/80 hover:bg-amber-100/90'
                      : 'border border-stone-200 bg-stone-50 hover:bg-amber-50 hover:border-amber-300'
                  }`}
                >
                  <div>
                    {phrase.isCustom && (
                      <div className="flex items-center justify-between gap-1 w-full text-[10px] text-amber-800 font-bold mb-1">
                        <span className="flex items-center gap-1">
                          <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                          <span>Personal</span>
                        </span>
                        <span
                          role="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (phrase.id) handleDeleteCustomCard(phrase.id);
                          }}
                          className="p-1 -mr-1 -mt-1 rounded-md text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Eliminar tarjeta personal"
                        >
                          <Trash2 className="w-3 h-3" />
                        </span>
                      </div>
                    )}
                    <div className="text-xs font-bold text-stone-900 group-hover:text-amber-950 leading-snug line-clamp-2">
                      {phrase.label}
                    </div>
                  </div>

                  <div className="text-[11px] text-amber-700 font-medium mt-1 truncate">
                    {phrase.vi}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 4. Practical communication tip */}
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 text-xs text-stone-600 flex items-start gap-3">
          <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-stone-800">Consejo de viaje en Vietnam:</p>
            <p className="leading-relaxed">
              El vietnamita tiene 6 tonos fonéticos. Si al hablar no te entienden de inmediato, <strong>pulsa el icono de pantalla completa ⛶ para mostrárselo en grande</strong> o presiona el altavoz 🔊 para reproducir la voz nativa.
            </p>
          </div>
        </div>
      </div>

      {/* 5. CREATE CUSTOM CARD MODAL */}
      {isCustomModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200 shadow-xl max-w-md w-full space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
                  <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                </div>
                <h3 className="font-bold text-sm text-stone-900">Nueva tarjeta de traducción</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomModalOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewCustomCard} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Frase en español (o inglés):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={customFormEs}
                    onChange={(e) => setCustomFormEs(e.target.value)}
                    placeholder="Ej. Mi hotel es el Rex Hotel en Quận 1"
                    className="flex-1 px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-xs text-stone-900 font-medium"
                  />
                  <button
                    type="button"
                    onClick={handleAutoTranslateCustomForm}
                    disabled={isAutoTranslatingCustom || !customFormEs.trim()}
                    className="px-3 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold disabled:opacity-40 transition cursor-pointer flex items-center gap-1 shrink-0"
                    title="Traducir automáticamente al vietnamita"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isAutoTranslatingCustom ? 'animate-spin' : ''}`} />
                    <span>Auto</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Traducción en vietnamita (Tiếng Việt):
                </label>
                <input
                  type="text"
                  required
                  value={customFormVi}
                  onChange={(e) => setCustomFormVi(e.target.value)}
                  placeholder="Ej. Khách sạn của tôi là Rex Hotel ở Quận 1"
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-xs text-stone-900 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Pronunciación fonética (opcional):
                </label>
                <input
                  type="text"
                  value={customFormPhonetic}
                  onChange={(e) => setCustomFormPhonetic(e.target.value)}
                  placeholder="Ej. Jach san cua toi la..."
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-xs text-stone-900 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Categoría de la tarjeta:
                </label>
                <select
                  value={customFormCategory}
                  onChange={(e) => setCustomFormCategory(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-xs text-stone-900 font-medium bg-white cursor-pointer"
                >
                  <option value="precios">💰 Precios & Compras</option>
                  <option value="comida">🍜 Comida & Café</option>
                  <option value="transporte">🚗 Transporte & Grab</option>
                  <option value="cortesia">💬 Cortesía & Saludos</option>
                  <option value="emergencia">🚨 Ayuda & Baño</option>
                </select>
                <p className="text-[10px] text-stone-500 mt-1">
                  Saldrá la primera en esta sección destacada con la etiqueta ⭐ Personal.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsCustomModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-stone-600 hover:bg-stone-100 font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!customFormEs.trim() || !customFormVi.trim()}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-stone-950 font-bold transition cursor-pointer shadow-xs"
                >
                  Guardar tarjeta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                {isTravelerToVi ? 'Muestra esta pantalla al dependiente' : 'Traducción directa'}
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
              className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm shadow-lg flex items-center gap-2 cursor-pointer transition active:scale-95"
            >
              <Volume2 className="w-5 h-5 text-stone-950" />
              <span>Reproducir voz en vietnamita</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
