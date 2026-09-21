import { DishItem } from '../types';

export const VIETNAMESE_DISHES: DishItem[] = [
  {
    id: 'dish-pho-bo',
    nameVi: 'Phở Bò',
    nameEs: 'Sopa de Fideos con Ternera',
    phonetic: 'Fuh Baw',
    region: 'Norte',
    category: 'Sopa / Fideos',
    description: 'El plato nacional por excelencia. Caldo aromático cocido a fuego lento durante 12 horas con canela, anís estrellado y jengibre, fideos de arroz planos (bánh phở) y finas láminas de ternera.',
    ingredients: ['Fideos de arroz', 'Ternera (tái/chín)', 'Caldo de huesos de res', 'Cebollino', 'Cilantro', 'Jengibre quemado'],
    howToOrderTip: 'Pide "Phở Bò Tái" si quieres la carne poco hecha en el caldo caliente, o "Phở Bò Chín" si la prefieres bien cocinada. Añade lima y rodajas de guindilla al gusto.',
    dietaryNotes: 'Lleva caldo de carne. No apto para vegetarianos.'
  },
  {
    id: 'dish-bun-cha',
    nameVi: 'Bún Chả',
    nameEs: 'Fideos de Arroz con Cerdo a la Brasa de Hanoi',
    phonetic: 'Boon Chah',
    region: 'Norte',
    category: 'Plato Principal',
    description: 'El plato que Barack Obama y Anthony Bourdain comieron juntos en Hanoi. Albóndigas de cerdo y panceta marinadas y asadas al carbón, servidas en un caldo tibio agridulce de nước mắm con papaya verde encurtida, acompañadas de fideos de arroz (bún) y cesta de hierbas frescas.',
    ingredients: ['Panceta de cerdo a la brasa', 'Fideos bún', 'Caldo nước mắm con vinagre y azúcar', 'Papaya verde', 'Menta, albahaca tailandesa'],
    howToOrderTip: 'Pide "Bún chả nem" si quieres añadir rollitos crujientes de marisco/cerdo (nem rán) como guarnición.',
    dietaryNotes: 'Contiene cerdo y salsa de pescado.'
  },
  {
    id: 'dish-banh-mi',
    nameVi: 'Bánh Mì',
    nameEs: 'Bocadillo Vietnamita Crujiente',
    phonetic: 'Bain Mee',
    region: 'Nacional',
    category: 'Bocadillo / Street',
    description: 'Baguette ligera y ultra-crujiente rellena con paté casero, carnes vietnamitas (chả lụa), pepino fresco, zanahoria y rábano daikon encurtidos (đồ chua), cilantro y un toque de salsa de chile o mayonesa.',
    ingredients: ['Pan baguette crujiente', 'Paté de hígado', 'Embutido vietnamita (chả lụa)', 'Zanahoria y rábano encurtidos', 'Pepino', 'Cilantro'],
    howToOrderTip: 'Si no te gusta el picante di "Không ớt". Pide "Bánh mì trứng" para una versión con huevos fritos recién hechos al momento.',
    dietaryNotes: 'Contiene gluten (trigo) y cerdo salvo que pidas solo huevo o queso.'
  },
  {
    id: 'dish-ca-phe-trung',
    nameVi: 'Cà Phê Trứng',
    nameEs: 'Café de Huevo de Hanoi',
    phonetic: 'Cah Feh Troong',
    region: 'Norte',
    category: 'Bebida / Café',
    description: 'Invención legendaria de Hanoi de 1946 originada en el Café Giảng. Café robusta vietnamita denso cubierto por una crema sedosa y aireada batida con yema de huevo y leche condensada. Sabe similar a un tiramisú bebible.',
    ingredients: ['Café robusta prensado en filtro Phin', 'Yema de huevo', 'Leche condensada', 'Azúcar'],
    howToOrderTip: 'Se sirve caliente dentro de un cuenco con agua caliente para mantener la temperatura, o frío con hielo ("uống đá"). Cómelo primero con la cucharilla.',
    dietaryNotes: 'Contiene huevo y lácteos (leche condensada).'
  },
  {
    id: 'dish-ca-phe-sua-da',
    nameVi: 'Cà Phê Sữa Đá',
    nameEs: 'Café Helado con Leche Condensada',
    phonetic: 'Cah Feh Soo-ah Dah',
    region: 'Sur',
    category: 'Bebida / Café',
    description: 'La bebida cotidiana de todo Vietnam. Café oscuro muy fuerte filtrado gota a gota con el tradicional filtro de metal "phin" sobre una generosa base de leche condensada dulce y servido sobre hielo picado.',
    ingredients: ['Café robusta molido', 'Leche condensada', 'Hielo'],
    howToOrderTip: 'Si lo quieres negro sin leche condensada pide "Cà phê đen đá" (o "Cà phê đen nóng" caliente).',
    dietaryNotes: 'Contiene cafeína potente y leche condensada.'
  },
  {
    id: 'dish-bun-bo-hue',
    nameVi: 'Bún Bò Huế',
    nameEs: 'Sopa Picante de Ternera Estilo Imperial de Hue',
    phonetic: 'Boon Baw Hway',
    region: 'Centro',
    category: 'Sopa / Fideos',
    description: 'La reina de las sopas del centro de Vietnam. Mucho más picante, aromática y compleja que el Phở. Fideos cilíndricos más gruesos en un caldo condimentado con citronela (sả), pasta de gamba fermentada (mắm ruốc) y aceite de achiote.',
    ingredients: ['Fideos gruesos de arroz', 'Jarrete de ternera', 'Manitas de cerdo', 'Citronela fresca', 'Aceite de chile', 'Flores de plátano'],
    howToOrderTip: 'Viene picante por defecto. Si tienes estómago sensible, avisa diciendo "Ít cay" (poco picante).',
    dietaryNotes: 'Contiene marisco fermentado (mắm ruốc), cerdo y ternera.'
  },
  {
    id: 'dish-banh-xeo',
    nameVi: 'Bánh Xèo',
    nameEs: 'Crepe Crujiente Vietnamita de Arroz y Cúrcuma',
    phonetic: 'Bain Seh-oh',
    region: 'Sur',
    category: 'Plato Principal',
    description: 'Gran crepe dorada y crujiente hecha con harina de arroz, leche de coco y cúrcuma (no lleva huevo aunque lo parezca por su color amarillo). Se rellena de brotes de soja, gambas y panceta de cerdo.',
    ingredients: ['Harina de arroz y cúrcuma', 'Gambas', 'Cerdo', 'Brotes de soja', 'Hojas de lechuga y papel de arroz para envolver'],
    howToOrderTip: 'Corta un trozo con las tijeras o palillos, envuélvelo en una hoja grande de lechuga con hierbas aromáticas y móntalo en la salsa agridulce nước chấm.',
    dietaryNotes: 'Suele no llevar gluten ni huevo en la masa base.'
  },
  {
    id: 'dish-cao-lau',
    nameVi: 'Cao Lầu',
    nameEs: 'Fideos de Cerdo Ahumado Exclusivos de Hội An',
    phonetic: 'Cow Lao',
    region: 'Centro',
    category: 'Plato Principal',
    description: 'Plato único que según la tradición solo puede prepararse en Hội An, ya que los fideos se amasan con agua sagrada del pozo milenario Bá Lễ y cenizas de leña de las islas Cham. Servido con cerdo char siu, picatostes crujientes y un fondo concentrado de caldo.',
    ingredients: ['Fideos cao lầu artesanos', 'Cerdo asado marinado', 'Picatostes de piel o masa frita', 'Hierbas de Trà Quế'],
    howToOrderTip: 'Imprescindible comerlo en el mercado central de Hội An o en los restaurantes familiares del casco histórico.',
    dietaryNotes: 'Contiene cerdo y trigo.'
  },
  {
    id: 'dish-goi-cuon',
    nameVi: 'Gỏi Cuốn',
    nameEs: 'Rollitos de Primavera Frescos no Fritos',
    phonetic: 'Goi Cu-on',
    region: 'Sur',
    category: 'Bocadillo / Street',
    description: 'Rollos frescos envueltos en papel de arroz transparente rellenos de gambas cocidas enteras, finas tiras de cerdo, fideos de arroz, menta y cebollino verde. Se acompañan de salsa densa de cacahuete (tương đậu phộng).',
    ingredients: ['Papel de arroz (bánh tráng)', 'Gambas', 'Fideos de arroz', 'Menta', 'Salsa hoisin con cacahuete'],
    howToOrderTip: '¡Atención si tienes alergia a frutos secos! Avisa antes si la salsa lleva cacahuete (đậu phộng).',
    dietaryNotes: 'Bajo en calorías y muy refrescante para días de calor húmedo.'
  },
  {
    id: 'dish-cha-ca-la-vong',
    nameVi: 'Chả Cá Lã Vọng',
    nameEs: 'Pescado Marinado a la Cúrcuma con Eneldo de Hanoi',
    phonetic: 'Chah Cah Lah Vong',
    region: 'Norte',
    category: 'Plato Principal',
    description: 'Especialidad histórica de Hanoi con más de 100 años de historia. Tacos de pescado de río (bagre) marinados en cúrcuma y galanga que se saltean en una sartén humeante en tu propia mesa con montañas de eneldo fresco y cebolleta verde.',
    ingredients: ['Pescado blanco', 'Cúrcuma fresca', 'Eneldo abundante (thì là)', 'Cacahuetes tostados', 'Fideos bún', 'Mắm tôm (pasta de gamba)'],
    howToOrderTip: 'Si el olor fuerte del mắm tôm no te convence, pide que te lo cambien por salsa de pescado tradicional (nước mắm).',
    dietaryNotes: 'Contiene pescado y cacahuetes.'
  }
];
