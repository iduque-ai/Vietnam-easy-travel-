import { PhraseItem } from '../types';

export const TRAVEL_PHRASES: PhraseItem[] = [
  // --- COMPRAS Y REGATEO ---
  {
    id: 'p-comp-1',
    category: 'compras',
    spanish: '¿Cuánto cuesta esto?',
    vietnamese: 'Cái này bao nhiêu tiền?',
    phonetic: 'Cai nai bao niew tien?',
    toneTip: 'Tono ascendente en "cái", descendente en "tiền". Pregunta clave en todo mercado.',
    priority: true
  },
  {
    id: 'p-comp-2',
    category: 'compras',
    spanish: '¡Muy caro! ¿Puedes rebajarlo un poco?',
    vietnamese: 'Đắt quá! Bớt một chút được không?',
    phonetic: 'Dat cua! But mot chut duoc khom?',
    toneTip: 'Dilo siempre con una sonrisa. En Vietnam regatear con amabilidad funciona.',
    priority: true
  },
  {
    id: 'p-comp-3',
    category: 'compras',
    spanish: 'No quiero, gracias',
    vietnamese: 'Tôi không mua đâu, cảm ơn',
    phonetic: 'Toi jom mua dau, cam uhn',
    toneTip: 'Útil ante vendedores insistentes en la calle. Firme pero educado.'
  },
  {
    id: 'p-comp-4',
    category: 'compras',
    spanish: '¿Tiene cambio para 500.000₫?',
    vietnamese: 'Có tiền lẻ thối không?',
    phonetic: 'Co tien le toi khom?',
    toneTip: 'Muchos puestos pequeños no aceptan billetes de 500k a primera hora.'
  },
  {
    id: 'p-comp-5',
    category: 'compras',
    spanish: 'Solo estoy mirando',
    vietnamese: 'Tôi chỉ xem thôi',
    phonetic: 'Toi chi sem toi',
    toneTip: 'Para mirar tiendas sin presión.'
  },

  // --- COMIDA Y RESTAURANTE ---
  {
    id: 'p-com-1',
    category: 'comida',
    spanish: '¡La cuenta, por favor!',
    vietnamese: 'Em ơi, tính tiền!',
    phonetic: 'Em oi, tin tien!',
    toneTip: '"Em ơi" se usa para llamar amablemente a los camareros (jóvenes).',
    priority: true
  },
  {
    id: 'p-com-2',
    category: 'comida',
    spanish: 'Sin azúcar (para café o zumos)',
    vietnamese: 'Không đường',
    phonetic: 'Jom duong',
    toneTip: '¡IMPRESCINDIBLE! En Vietnam añaden azúcar y leche condensada a casi todo.',
    priority: true
  },
  {
    id: 'p-com-3',
    category: 'comida',
    spanish: 'Sin hielo',
    vietnamese: 'Không lấy đá',
    phonetic: 'Jom lai da',
    toneTip: 'Si prefieres bebida natural para cuidar el estómago.'
  },
  {
    id: 'p-com-4',
    category: 'comida',
    spanish: 'No picante / Sin guindilla',
    vietnamese: 'Không ăn cay / Không ớt',
    phonetic: 'Jom an cai / Jom ut',
    toneTip: 'El chile fresco vietnamita (ớt hiểm) es extremadamente potente.',
    priority: true
  },
  {
    id: 'p-com-5',
    category: 'comida',
    spanish: 'Soy vegetariano / Comida vegetariana',
    vietnamese: 'Tôi ăn chay',
    phonetic: 'Toi an chai',
    toneTip: '"Chay" significa vegetariano/budista (sin carne ni salsa de pescado).',
    priority: true
  },
  {
    id: 'p-com-6',
    category: 'comida',
    spanish: 'Sin glutamato (MSG)',
    vietnamese: 'Không cho mì chính (hoặc bột ngọt)',
    phonetic: 'Jom cho mi chin (bot ngot)',
    toneTip: '"Mì chính" en el Norte, "bột ngọt" en el Sur.'
  },
  {
    id: 'p-com-7',
    category: 'comida',
    spanish: '¡Está muy delicioso!',
    vietnamese: 'Ngon quá!',
    phonetic: 'Ngon cua!',
    toneTip: 'Decir esto a la cocinera callejera siempre te ganará una sonrisa radiante.'
  },
  {
    id: 'p-com-8',
    category: 'comida',
    spanish: 'Una botella de agua mineral',
    vietnamese: 'Cho tôi một chai nước suối',
    phonetic: 'Cho toi mot chai nuoc suoi',
    toneTip: 'Pide siempre botella cerrada (nước suối).'
  },
  {
    id: 'p-com-9',
    category: 'comida',
    spanish: 'Sin cilantro / Sin hierbas',
    vietnamese: 'Không rau mùi (ngò rí)',
    phonetic: 'Jom rau mui (ngo ri)',
    toneTip: '"Rau mùi" en Hanoi, "ngò" en Saigón.'
  },

  // --- TRANSPORTE Y TAXI / GRAB ---
  {
    id: 'p-trans-1',
    category: 'transporte',
    spanish: 'Por favor, encienda el taxímetro',
    vietnamese: 'Làm ơn bật đồng hồ tính tiền',
    phonetic: 'Lam un bat dong ho tin tien',
    toneTip: 'En taxis tradicionales (Mai Linh o Vinasun). ¡Nunca subas sin taxímetro!',
    priority: true
  },
  {
    id: 'p-trans-2',
    category: 'transporte',
    spanish: 'Pare aquí, por favor',
    vietnamese: 'Dừng ở đây, làm ơn',
    phonetic: 'Zung uh dai, lam un',
    toneTip: 'Pronunciación suave de la "D" norteña como Z, o en el Sur como Y (Yung).'
  },
  {
    id: 'p-trans-3',
    category: 'transporte',
    spanish: 'Quiero ir al aeropuerto',
    vietnamese: 'Tôi muốn đi sân bay',
    phonetic: 'Toi muon di san bai',
    toneTip: 'Hà Nội: Nội Bài (HAN). Ciudad Ho Chi Minh: Tân Sơn Nhất (SGN).'
  },
  {
    id: 'p-trans-4',
    category: 'transporte',
    spanish: '¿Cuánto tiempo se tarda?',
    vietnamese: 'Mất bao lâu?',
    phonetic: 'Mat bao lau?',
    toneTip: 'Preguntar antes de iniciar ruta.'
  },
  {
    id: 'p-trans-5',
    category: 'transporte',
    spanish: '¿Es este el autobús a...?',
    vietnamese: 'Đây có phải xe buýt đi... không?',
    phonetic: 'Dai co fai se buit di... khom?',
    toneTip: 'Para confirmar antes de subir a autobuses locales.'
  },

  // --- EMERGENCIAS Y SALUD ---
  {
    id: 'p-eme-1',
    category: 'emergencias',
    spanish: '¡Ayuda, por favor!',
    vietnamese: 'Cứu tôi với!',
    phonetic: 'Coo toi voi!',
    toneTip: 'Llamada de socorro urgente en caso de accidente o peligro.',
    priority: true
  },
  {
    id: 'p-eme-2',
    category: 'emergencias',
    spanish: 'Necesito ver a un médico',
    vietnamese: 'Tôi cần gặp bác sĩ',
    phonetic: 'Toi can gap bac si',
    toneTip: 'Los hospitales internacionales suelen estar en Hanoi, Danang y HCMC.',
    priority: true
  },
  {
    id: 'p-eme-3',
    category: 'emergencias',
    spanish: '¿Dónde hay una farmacia?',
    vietnamese: 'Hiệu thuốc ở đâu?',
    phonetic: 'Hiew tuoc uh dau?',
    toneTip: 'Las farmacias se identifican con el letrero "Nhà Thuốc".'
  },
  {
    id: 'p-eme-4',
    category: 'emergencias',
    spanish: 'Me duele el estómago',
    vietnamese: 'Tôi bị đau bụng',
    phonetic: 'Toi bi dau bung',
    toneTip: 'Muy común en caso de desajuste estomacal por agua o picante.'
  },
  {
    id: 'p-eme-5',
    category: 'emergencias',
    spanish: 'Llama a la policía',
    vietnamese: 'Làm ơn gọi cảnh sát',
    phonetic: 'Lam un goi cainh sat',
    toneTip: 'El número de policía de emergencia en Vietnam es el 113.'
  },

  // --- CORTESÍA Y BÁSICOS ---
  {
    id: 'p-cor-1',
    category: 'cortesia',
    spanish: 'Hola',
    vietnamese: 'Xin chào',
    phonetic: 'Sin chow',
    toneTip: 'El saludo universal más respetuoso para cualquier persona.',
    priority: true
  },
  {
    id: 'p-cor-2',
    category: 'cortesia',
    spanish: 'Muchas gracias',
    vietnamese: 'Cảm ơn nhiều',
    phonetic: 'Cam uhn niew',
    toneTip: 'Acompañado de una leve inclinación de cabeza o juntando ambas manos.',
    priority: true
  },
  {
    id: 'p-cor-3',
    category: 'cortesia',
    spanish: 'Disculpe / Lo siento',
    vietnamese: 'Xin lỗi',
    phonetic: 'Sin loy',
    toneTip: 'Para pedir paso en calles abarrotadas o disculparse.',
    priority: true
  },
  {
    id: 'p-cor-4',
    category: 'cortesia',
    spanish: 'Sí (formal)',
    vietnamese: 'Dạ / Vâng',
    phonetic: 'Ya (Sur) / Vang (Norte)',
    toneTip: '"Vâng" es la forma afirmativa educada del Norte, "Dạ" en el Sur.'
  },
  {
    id: 'p-cor-5',
    category: 'cortesia',
    spanish: 'No',
    vietnamese: 'Không',
    phonetic: 'Jom / Khom',
    toneTip: 'Negación común.'
  },
  {
    id: 'p-cor-6',
    category: 'cortesia',
    spanish: '¿Habla usted inglés?',
    vietnamese: 'Bạn có nói tiếng Anh không?',
    phonetic: 'Ban co noi tieng An khom?',
    toneTip: 'Muy útil en hoteles y cafeterías modernas.'
  },
  {
    id: 'p-cor-7',
    category: 'cortesia',
    spanish: 'Adiós',
    vietnamese: 'Tạm biệt',
    phonetic: 'Tam biet',
    toneTip: 'Despedida habitual.'
  },

  // --- NÚMEROS (PARA REGATEO Y PRECIOS) ---
  {
    id: 'p-num-1',
    category: 'numeros',
    spanish: '1, 2, 3, 4, 5',
    vietnamese: 'Một, hai, ba, bốn, năm',
    phonetic: 'Mot, hai, ba, bon, nam',
    toneTip: 'Nota: cuando el 5 va en unidades tras decenas (ej. 15, 25), se pronuncia "lăm".'
  },
  {
    id: 'p-num-2',
    category: 'numeros',
    spanish: '6, 7, 8, 9, 10',
    vietnamese: 'Sáu, bảy, tám, chín, mười',
    phonetic: 'Sau, bai, tam, chin, muoi',
    toneTip: '10 es "mười". Veinte es "hai mươi".'
  },
  {
    id: 'p-num-3',
    category: 'numeros',
    spanish: '100 (Cien)',
    vietnamese: 'Một trăm',
    phonetic: 'Mot tram',
    toneTip: 'Ej: 200 = Hai trăm.'
  },
  {
    id: 'p-num-4',
    category: 'numeros',
    spanish: '1.000 (Mil - "K")',
    vietnamese: 'Một nghìn (hoặc một ngàn)',
    phonetic: 'Mot ngin (Norte) / Mot ngan (Sur)',
    toneTip: 'En la calle dicen "Hai mươi nghìn" (20k) o simplemente "Hai mươi" (veinte).'
  },
  {
    id: 'p-num-5',
    category: 'numeros',
    spanish: '100.000 (Cien mil)',
    vietnamese: 'Một trăm nghìn',
    phonetic: 'Mot tram ngin',
    toneTip: 'Billete verde habitual.'
  },
  {
    id: 'p-num-6',
    category: 'numeros',
    spanish: '1.000.000 (Un millón)',
    vietnamese: 'Một triệu',
    phonetic: 'Mot triew',
    toneTip: 'Dos billetes de 500.000 ₫.'
  }
];
