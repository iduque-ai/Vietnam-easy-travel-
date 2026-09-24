import { FreeTourData } from '../types';

export const CURATED_CLIENT_TOURS: FreeTourData[] = [
  {
    placeName: 'Templo de la Literatura (Văn Miếu - Quốc Tử Giám)',
    cityName: 'Hà Nội',
    vietnameseName: 'Văn Miếu – Quốc Tử Giám',
    tagline: 'Mil años de sabiduría confuciana, tortugas sagradas y la primera universidad imperial de Vietnam.',
    durationMinutes: 45,
    audioGuideScript: `¡Xin chào y bienvenido al santuario del conocimiento de Vietnam! Estás pisando el suelo del Văn Miếu, fundado en el año 1070 por el emperador Lý Thánh Tông. Al cruzar la puerta principal de madera, deja atrás el incesante zumbido de las miles de motocicletas de Hanói y sumérgete en una atmósfera de paz, estanques de loto y aroma a incienso dulce.

Este complejo está dividido en cinco patios alineados en un eje de simetría sagrado. Antiguamente, solo los emperadores, mandarines y los estudiantes más brillantes del imperio tenían permitido caminar por el sendero central pavimentado con ladrillos rojos de Bát Tràng.

Avanza despacio. En el tercer patio te esperan las 82 estelas doctorales de piedra sostenidas sobre caparazones de tortugas milenarias. Cada una lleva grabados los nombres de los 1.307 doctores imperiales que superaron los exámenes más exigentes de Asia. Siente la brisa bajo los banianos centenarios y prepárate para descubrir cómo la devoción por el estudio forjó el alma de esta nación.`,
    stops: [
      {
        number: 1,
        title: 'Puerta Principal Văn Miếu Môn y Pabellón Khuê Văn Các',
        whatToLookAt: 'El pabellón rojo de dos plantas con ventanas circulares que representan la estrella más brillante de la literatura.',
        story: 'Construido en 1805, este pabellón es el símbolo oficial de la ciudad de Hanói. Sus círculos representan el cielo yang y el estanque cuadrado a sus pies la tierra yin.',
        insiderTip: 'Compara el pabellón con el billete de 100.000 Dong que llevas en el bolsillo: ¡es exactamente la misma fachada!'
      },
      {
        number: 2,
        title: 'Estanque de la Claridad Celestial (Thiên Quang Tỉnh)',
        whatToLookAt: 'El estanque cuadrado reflejando el cielo y los sauces que lo rodean.',
        story: 'El agua tranquila actuaba como un espejo donde los eruditos debían contemplar su reflejo para asegurarse de tener la mente y el corazón limpios de arrogancia antes de entrar a examinar.',
        insiderTip: 'Observa las carpas de colores nadando cerca de las orillas; en la mitología vietnamita, la carpa se transforma en dragón cuando persevera, igual que el estudiante perseverante.'
      },
      {
        number: 3,
        title: 'Las 82 Estelas Doctorales sobre Tortugas Sagradas',
        whatToLookAt: 'Las tortugas de piedra azul talladas con expresiones faciales únicas y caparazones gastados.',
        story: 'La tortuga (Rùa) es uno de los cuatro animales sagrados de Vietnam. Antaño los estudiantes frotaban la cabeza de las tortugas la noche antes de su examen para tener suerte, tradición hoy protegida por cordones de seguridad tras ser declaradas Patrimonio de la Humanidad por la UNESCO.',
        insiderTip: 'Fíjate en las fechas grabadas: la estela más antigua data de 1484 bajo el reinado del sabio emperador Lê Thánh Tông.'
      },
      {
        number: 4,
        title: 'Santuario Mayor Đại Thành Điện y Altar de Confucio',
        whatToLookAt: 'El altar lacado en rojo y pan de oro con la estatua de Khổng Tử (Confucio) y sus cuatro discípulos predilectos.',
        story: 'Aquí los reyes ofrecían sacrificios estacionales. Las maderas de lim (árbol de hierro) han resistido siglos de tifones e invasiones sin una sola gota de termita gracias a su densidad extrema.',
        insiderTip: 'Respira hondo para apreciar el aroma a sándalo e incienso agárico. Inclina levemente la cabeza con ambas manos juntas si deseas rendir respeto al sabio.'
      }
    ],
    photoSpot: {
      location: 'Frente al pabellón Khuê Văn Các mirando hacia el estanque Thiên Quang.',
      bestLight: 'Entre las 15:30 y las 17:00, cuando el sol poniente baña de oro la madera roja del pabellón.',
      instruction: 'Agáchate un poco para encuadrar el reflejo del pabellón en la superficie inmóvil del estanque.'
    },
    culturalEtiquette: {
      dressCode: 'Hombros y rodillas cubiertos obligatoriamente. Quítate sombreros y gafas de sol al entrar a los altares interiores.',
      whatNotToDo: 'Nunca toques ni te sientes sobre las tortugas de piedra doctorales; están cercadas para preservar el mármol del siglo XV.',
      scamWarning: 'Evita comprar incienso a vendedores ambulantes fuera de la puerta; dentro del templo no necesitas comprar nada para visitar.'
    },
    streetFoodReward: {
      dishNameVi: 'Phở Cuốn & Phở Chiên Phồng',
      dishNameEs: 'Rollos frescos de masa de phở con ternera salteada, hierbas y salsa nước mắm',
      whereToFind: 'Caminando 5 minutos hacia la calle Nguyễn Khuyến o en el barrio Ngũ Xã.',
      priceEstimate: '50.000 ₫ – 75.000 ₫ por ración'
    },
    suggestedQuestions: [
      '¿Por qué los estudiantes vietnamitas siguen rezando aquí antes de Selectividad?',
      '¿Qué significan las inscripciones chinas en las columnas de madera?',
      '¿Cuál era el castigo para quien hacía trampa en los exámenes imperiales?'
    ]
  },
  {
    placeName: 'Lago Hoàn Kiếm y Templo Ngọc Sơn',
    cityName: 'Hà Nội',
    vietnameseName: 'Hồ Hoàn Kiếm & Đền Ngọc Sơn',
    tagline: 'La leyenda viva de la Espada Restituida, la tortuga sagrada gigante y el puente escarlata de Hanói.',
    durationMinutes: 40,
    audioGuideScript: `¡Hola viajero! Te encuentras en el epicentro espiritual y sentimental de todo Vietnam: el lago Hoàn Kiếm. A principios del siglo XV, cuando el país sufría la ocupación de la dinastía Ming, un humilde pescador sacó en sus redes una hoja de espada celestial. El rebelde Lê Lợi montó la espada en una empuñadura hallada en un árbol y, con esa fuerza mágica, expulsó al ejército invasor y se convirtió en emperador.

Tiempo después, paseando en barca por este lago, una inmensa tortuga dorada emergió, tomó la espada con el hocico y se sumergió en las profundidades para devolverla a los dioses. Desde aquel día, este remanso se llama 'Lago de la Espada Restituida'.

A tu alrededor se despliega la vida hanoyense en su máxima expresión: abuelos practicando Tai Chi al amanecer, parejas jóvenes conversando bajo los sauces llorones y el célebre puente rojo Cầu Thê Húc conectando con la isla de la Montaña de Jade.`,
    stops: [
      {
        number: 1,
        title: 'Puente Cầu Thê Húc (El Puente del Sol Naciente)',
        whatToLookAt: 'El puente curvo de madera lacada en rojo brillante sobre el agua verde esmeralda.',
        story: 'Su nombre poético significa "lugar donde se condensa la luz del sol matutino". El color rojo bermellón simboliza la vida, el fuego purificador y la buena fortuna.',
        insiderTip: 'Caminar sobre el puente temprano en la mañana ofrece una vista despejada de los vapores sobre el agua antes de que abran los comercios.'
      },
      {
        number: 2,
        title: 'Templo Ngọc Sơn y la Gran Tortuga Sagrada Preservada',
        whatToLookAt: 'La vitrina de cristal en la sala interior que resguarda el ejemplar disecado de la tortuga gigante Rafetus swinhoei.',
        story: 'Esta gigantesca tortuga de más de 170 kg vivió en el lago hasta el siglo XX, confirmando que la leyenda de la tortuga gigante tenía una base biológica real en este ecosistema.',
        insiderTip: 'Fíjate en las patas membranosas y el caparazón blando de este espécimen extraordinario de una de las especies más raras del planeta.'
      },
      {
        number: 3,
        title: 'Torre Tháp Rùa (Torre de la Tortuga)',
        whatToLookAt: 'La pequeña torre de tres pisos que emerge sobre un islote solitario en mitad del lago.',
        story: 'Iluminada de noche con tonos cálidos, fue construida en 1886 combinando elementos góticos franceses y tejados curvados tradicionales vietnamitas.',
        insiderTip: 'Los mejores bancos de piedra para contemplarla se encuentran en la orilla oeste, a la altura de la estatua del rey Lê Thái Tổ.'
      }
    ],
    photoSpot: {
      location: 'Desde la orilla este mirando en diagonal hacia el Puente Rojo Cầu Thê Húc.',
      bestLight: 'Durante la hora dorada (17:15) o de noche con el puente completamente iluminado.',
      instruction: 'Encuadra los sauces llorones en primer plano para dar profundidad natural al puente rojo.'
    },
    culturalEtiquette: {
      dressCode: 'Ropa recatada para cruzar al Templo Ngọc Sơn (cubrir hombros).',
      whatNotToDo: 'No arrojes monedas ni basura al lago; es un santuario biológico y espiritual.',
      scamWarning: 'Cuidado con señores con cestas de fruta que te ofrecen ponerte el sombrero cónico en el hombro para una foto y luego exigen dinero.'
    },
    streetFoodReward: {
      dishNameVi: 'Cà Phê Trứng (Café de Huevo)',
      dishNameEs: 'Café vietnamita con densa crema batida de yema de huevo, leche condensada y azúcar',
      whereToFind: 'En Café Giảng (39 Nguyễn Hữu Huân), a solo 300 metros del puente.',
      priceEstimate: '35.000 ₫ – 40.000 ₫'
    },
    suggestedQuestions: [
      '¿Aún quedan tortugas vivas en el lago Hoàn Kiếm hoy en día?',
      '¿Por qué el puente es rojo y no dorado?',
      '¿Qué significan los tres caracteres chinos tallados en la roca a la entrada del templo?'
    ]
  },
  {
    placeName: 'Calle del Tren (Hanoi Train Street)',
    cityName: 'Hà Nội',
    vietnameseName: 'Phố Đường Tàu Hà Nội',
    tagline: 'La estrecha vía ferroviaria colonial donde los trenes rozan los balcones y cafeterías.',
    durationMinutes: 30,
    audioGuideScript: `¡Pega tu espalda a la pared y siente la vibración en los pies! Estás en la Calle del Tren de Hanói, uno de los rincones urbanos más peculiares de todo el sudeste asiático. Esta vía fue trazada por los ingenieros coloniales franceses en 1902 para conectar la capital con la frontera norte y con Saigón.

Durante décadas, las familias locales instalaron sus hogares a escasos centímetros de los rieles: aquí los niños jugaban, las abuelas pelaban verduras y se tendía la ropa sobre las traviesas de madera. En los últimos años, florecieron decenas de diminutas cafeterías con taburetes de plástico.

Cuando suena la campana metálica y el silbato a lo lejos, todo el mundo retira sus mesas en segundos para dejar pasar la descomunal locomotora diésel que pasa a palmos de tus ojos.`,
    stops: [
      {
        number: 1,
        title: 'Los Raíles Coloniales y el Barrio Ferroviario',
        whatToLookAt: 'El pavimento de baldosas estrechas, las plantas en maceta pegadas a la pared y los cables eléctricos colgantes.',
        story: 'Los vecinos desarrollaron un sentido del oído milimétrico: saben qué tren se acerca según la vibración de las vías metálicas antes de que se vea la luz.',
        insiderTip: 'Los tramos más activos y pintorescos están entre las calles Trần Phú y Phùng Hưng.'
      },
      {
        number: 2,
        title: 'El Momento del Paso del Tren',
        whatToLookAt: 'Las señales rojas de los guardianes ferroviarios y la ráfaga de aire que desplaza la locomotora.',
        story: 'El tren de la línea Norte-Sur cruza diariamente transportando a miles de pasajeros que saludan desde las ventanillas.',
        insiderTip: 'Pide permiso en una de las cafeterías locales consumiendo un jugo de caña o café; sus dueños te avisarán 5 minutos antes con total seguridad.'
      }
    ],
    photoSpot: {
      location: 'Desde el primer piso de una de las casas estrechas (cafeterías de balcón) o mirando a lo largo del riel.',
      bestLight: 'A media tarde antes de la puesta de sol.',
      instruction: 'Mantén siempre los pies y las manos detrás de la línea amarilla de seguridad marcada en el suelo.'
    },
    culturalEtiquette: {
      dressCode: 'Ropa cómoda y calzado antideslizante (cuidado con los rieles mojados).',
      whatNotToDo: 'Bajo ninguna circunstancia te asomes con un selfie stick cuando el tren esté en movimiento.',
      scamWarning: 'Si la policía bloquea el acceso por seguridad, no intentes saltarte las vallas; espera a que un cafetero local te acompañe a su mesa reservada.'
    },
    streetFoodReward: {
      dishNameVi: 'Nước Mía & Nem Rán',
      dishNameEs: 'Zumo de caña de azúcar recién exprimido con kumquat y rollitos primavera crujientes',
      whereToFind: 'En los puestos situados en la intersección con Trần Phú.',
      priceEstimate: '15.000 ₫ – 40.000 ₫'
    },
    suggestedQuestions: [
      '¿A qué horas exactas pasa el tren hoy?',
      '¿Cómo es la vida cotidiana de las familias que viven en estas casas de riel?',
      '¿Hacia dónde se dirige este tren?'
    ]
  },
  {
    placeName: 'Catedral de San José (Nhà Thờ Lớn)',
    cityName: 'Hà Nội',
    vietnameseName: 'Nhà Thờ Lớn Hà Nội',
    tagline: 'El eco neogótico de Notre Dame de París en el corazón tropical de Hanói.',
    durationMinutes: 30,
    audioGuideScript: `Frente a ti se alza la catedral más antigua de Hanói, consagrada en la Navidad de 1886. Su fachada de piedra tiznada y estilo neogótico recuerda de inmediato a la mismísima catedral de Notre Dame de París, con sus dos torres gemelas de 31 metros de altura y un gran rosetón central.

Sin embargo, este lugar guarda capas de historia mucho más profundas: antes de la llegada francesa, aquí se erguía la majestuosa Pagoda Báo Thiên, una de las cuatro maravillas del reino Đại Việt del siglo XI.

Hoy en día, la plaza adoquinada frente a la catedral es el punto de encuentro predilecto de la juventud hanoyense: jóvenes sentados en taburetes bajos bebiendo té con limón (Trà Chanh) y comiendo pipas de girasol mientras contemplan las campanas centenarias.`,
    stops: [
      {
        number: 1,
        title: 'Fachada Neogótica y la Estatua de la Virgen María',
        whatToLookAt: 'La pátina envejecida de la piedra, los arcos ojivales y la estatua rodeada de rejería floral.',
        story: 'Fue construida bajo el mandato del vicario apostólico Paul-François Puginier utilizando ladrillos de terracota recubiertos de estuco de cal.',
        insiderTip: 'A las 18:00 horas las campanas suenan con un tañido profundo que se escucha en todo el Barrio Antiguo.'
      },
      {
        number: 2,
        title: 'Las Vidrieras y el Interior de Madera Dorada',
        whatToLookAt: 'Las vidrieras francesas fabricadas en los talleres Lorin de Chartres y el altar de madera lacada al estilo vietnamita.',
        story: 'El interior fusiona elementos del gótico europeo con técnicas artesanales locales de madera roja y dorada.',
        insiderTip: 'La puerta lateral suele estar abierta para los fieles a primera hora de la mañana y antes de la misa vespertina.'
      }
    ],
    photoSpot: {
      location: 'Desde la terraza del segundo piso de los cafés de la calle Nhà Thờ o en el centro de la plaza.',
      bestLight: 'Al atardecer, cuando las luces de la catedral se encienden contrastando con el cielo azul cobalto.',
      instruction: 'Usa una lente gran angular para captar las dos torres y el bullicio de los taburetes en la plaza.'
    },
    culturalEtiquette: {
      dressCode: 'Ropa respetuosa si decides entrar al templo durante los oficios religiosos.',
      whatNotToDo: 'No tomes fotos con flash ni hables en voz alta durante las misas cantadas.',
      scamWarning: 'Los puestos de café alrededor cobran precio normal; desconfía si alguien te cobra más de 30.000 ₫ por un té helado.'
    },
    streetFoodReward: {
      dishNameVi: 'Trà Chanh & Nem Chua Rán',
      dishNameEs: 'Té helado de jazmín con limón fresco acompañado de rollitos de cerdo fermentado fritos',
      whereToFind: 'En cualquiera de los cafés con taburetes en la misma acera de la plaza de la catedral.',
      priceEstimate: '15.000 ₫ – 45.000 ₫'
    },
    suggestedQuestions: [
      '¿Qué ocurrió con la antigua pagoda budista que estaba aquí antes?',
      '¿Cuántos católicos hay en Vietnam en la actualidad?',
      '¿Por qué las paredes exteriores tienen ese color gris desgastado?'
    ]
  },
  {
    placeName: 'Puente Japonés Cubierto (Chùa Cầu)',
    cityName: 'Hội An',
    vietnameseName: 'Chùa Cầu Hội An',
    tagline: 'El puente-templo que calma al dragón marino mitológico en la ciudad de los farolillos.',
    durationMinutes: 35,
    audioGuideScript: `¡Bienvenido a la joya arquitectónica más venerada de Hoi An! Estás ante Chùa Cầu, el legendario Puente Japonés Cubierto erigido a finales del siglo XVI por la próspera comunidad de comerciantes nipones que residían en este floreciente puerto de la Ruta de la Seda marina.

Según la leyenda ancestral, un monstruo marino gigante llamado Namazu o Cù tenía la cabeza en la India, el cuerpo en Vietnam y la cola en Japón. Cada vez que el monstruo se movía, provocaba terremotos e inundaciones destructivas. Los sabios japoneses construyeron este puente como una espada clavada en el lomo del monstruo para inmovilizarlo y proteger la paz de la ciudad.

Cruza lentamente sus tablas de madera noble: a un lado verás un perro sagrado y al otro un mono guardián, marcando los años propicios en que se inició y concluyó esta obra de arte.`,
    stops: [
      {
        number: 1,
        title: 'Estatua del Perro Sagrado (Thần Khuyển) y el Mono (Thần Hầu)',
        whatToLookAt: 'Las figuras de madera talladas en los dos extremos del puente cubierto.',
        story: 'Simbolizan los signos del zodíaco en que comenzó (año del mono) y finalizó (año del perro) la construcción del puente en la era feudal.',
        insiderTip: 'Los comerciantes solían acariciar sus patas con reverencia para pedir travesías marítimas seguras.'
      },
      {
        number: 2,
        title: 'El Pequeño Santuario de Bắc Đế Trấn Vũ',
        whatToLookAt: 'El altar interior con la deidad taoísta del norte y del clima.',
        story: 'A diferencia de la mayoría de puentes, este alberga un templo sin Buda: la deidad venerada controla las tempestades y las aguas.',
        insiderTip: 'Comprueba el billete de 20.000 Dong de polímero azul: en el reverso aparece este mismo puente reflejado en el canal.'
      }
    ],
    photoSpot: {
      location: 'Desde el pequeño puente peatonal de cemento situado a 30 metros al sur del puente japonés.',
      bestLight: 'Al caer la noche (18:30) cuando los farolillos de seda y las velas flotantes en el río Thu Bồn se encienden.',
      instruction: 'Captura el reflejo de las linternas en el agua oscura con una exposición nocturna suave.'
    },
    culturalEtiquette: {
      dressCode: 'Ropa respetuosa al pasar por el altar interior.',
      whatNotToDo: 'No te apoyes con fuerza en las barandillas de madera antigua restaurada ni grabes nombres en la madera.',
      scamWarning: 'Para cruzar por fuera no necesitas pagar; el billete oficial de Hoi An se pica si decides entrar al templo interior.'
    },
    streetFoodReward: {
      dishNameVi: 'Cao Lầu Hội An',
      dishNameEs: 'Fideos gruesos con lomo de cerdo braseado, torreznos crujientes y hierbas frescas regadas con agua de pozo ancestral',
      whereToFind: 'En el Mercado Central de Hoi An o en el restaurante Trung Bac (calle Tran Phu).',
      priceEstimate: '35.000 ₫ – 50.000 ₫'
    },
    suggestedQuestions: [
      '¿Por qué el agua de los pozos Bá Lễ de Hoi An es indispensable para hacer el Cao Lầu?',
      '¿Cómo sobrevivió el puente a las inundaciones anuales del río?',
      '¿Qué relación tenían los comerciantes japoneses con los señores Nguyễn?'
    ]
  },
  {
    placeName: 'Ciudadela Imperial de Huế (Đại Nội)',
    cityName: 'Huế',
    vietnameseName: 'Hoàng Thành Huế (Đại Nội)',
    tagline: 'El trono de los trece emperadores Nguyễn, dragones dorados y los secretos de la Ciudad Púrpura Prohibida.',
    durationMinutes: 50,
    audioGuideScript: `¡Saluda al corazón imperial de Vietnam! Tras cruzar los fosos repletos de flores de loto y las murallas de estilo Vauban, entras al recinto sagrado de la dinastía Nguyễn, gobernantes de Vietnam entre 1802 y 1945.

Este monumental palacio fue diseñado siguiendo las estrictas reglas del Feng Shui oriental: respaldado por las montañas del oeste y bañado por el río Perfume al este. En su punto culminante se encontraba la Tử Cấm Thành (Ciudad Púrpura Prohibida), un recinto donde solo el emperador, sus esposas, concubinas y los eunucos imperiales podían penetrar bajo pena de muerte inmediata.

A pesar de las cruentas batallas de la Ofensiva del Tet en 1968, que dejaron cicatrices aún visibles en los muros de ladrillo, el espíritu de los dragones imperiales de cinco garras y el arte de la cerámica vidriada Khảm sành renacen en cada rincón restaurado.`,
    stops: [
      {
        number: 1,
        title: 'Puerta Ngọ Môn (Puerta del Mediodía)',
        whatToLookAt: 'El balcón de los Cinco Fénix (Lầu Ngũ Phụng) y los cinco arcos de entrada.',
        story: 'El arco central estaba reservado exclusivamente para el paso del Emperador. Desde este balcón, en 1945, el último emperador Bảo Đại abdicó solemnemente entregando la espada de jade dorada.',
        insiderTip: 'Sube al piso superior del balcón para disfrutar de una vista panorámica del mástil de la bandera imperial (Kỳ Đài).'
      },
      {
        number: 2,
        title: 'Palacio de la Suprema Armonía (Điện Thái Hòa)',
        whatToLookAt: 'El trono dorado bajo el dosel imperial y las 80 columnas de madera de lim lacadas con dragones celestiales.',
        story: 'Aquí se celebraban las coronaciones, los cumpleaños del monarca y la recepción de embajadores extranjeros en días de luna nueva y llena.',
        insiderTip: 'Los dragones de este palacio tienen cinco garras (símbolo exclusivo del emperador), mientras que los de príncipes solo tenían cuatro.'
      },
      {
        number: 3,
        title: 'Las Nueve Urnas Dinásticas de Bronce (Cửu Đỉnh)',
        whatToLookAt: 'Las colosales urnas de bronce del siglo XIX situadas frente al templo Thế Miếu.',
        story: 'Cada urna pesa más de dos toneladas y está dedicada a un emperador, representando la soberanía y la riqueza natural de ríos, montañas y costas de Vietnam.',
        insiderTip: 'Busca los relieves de los barcos de guerra y el mar del Este: son testimonios históricos de la navegación vietnamita.'
      }
    ],
    photoSpot: {
      location: 'Frente a los jardines de Điện Thái Hòa con los estanques de carpas doradas.',
      bestLight: 'A primera hora de la mañana (8:30) con poca gente y luz suave sobre los tejados dorados.',
      instruction: 'Aprovecha las puertas circulares tradicionales enmarcadas en ladrillo rojo para crear composiciones naturales.'
    },
    culturalEtiquette: {
      dressCode: 'Hombros y rodillas cubiertos para entrar a los templos ancestrales Thế Miếu.',
      whatNotToDo: 'No toques las urnas de bronce ni te sientes en los tronos o réplicas sin autorización.',
      scamWarning: 'Si alquilas un traje tradicional de mandarín para fotos, pacta el precio total y la duración antes de colocarte la corona.'
    },
    streetFoodReward: {
      dishNameVi: 'Bún Bò Huế & Bánh Bèo',
      dishNameEs: 'Sopa de fideos de arroz con ternera especiada, hierba limón y tortitas de arroz al vapor con gambas',
      whereToFind: 'En los puestos de la calle Đinh Tiên Hoàng, a 200 metros de la puerta este de la Ciudadela.',
      priceEstimate: '35.000 ₫ – 50.000 ₫'
    },
    suggestedQuestions: [
      '¿Cuántas esposas y concubinas vivían en la Ciudad Prohibida de Huế?',
      '¿Cómo se protegía el palacio del calor abrasador y las lluvias del monzón?',
      '¿Qué significan los fragmentos de platos de porcelana rotos incrustados en los dragones?'
    ]
  },
  {
    placeName: 'Montañas de Mármol (Ngũ Hành Sơn)',
    cityName: 'Đà Nẵng',
    vietnameseName: 'Ngũ Hành Sơn Đà Nẵng',
    tagline: 'Cinco picos de piedra caliza dedicados a los cinco elementos universales con cuevas místicas y pagodas.',
    durationMinutes: 45,
    audioGuideScript: `¡Siente la energía de la tierra en las Montañas de Mármol! Este conjunto de cinco colinas cársticas que se alzan junto a las playas de Da Nang lleva el nombre de los cinco elementos de la cosmología oriental: Kim (Metal), Mộc (Madera), Thủy (Agua), Hỏa (Fuego) y Thổ (Tierra).

Durante siglos, el pueblo Cham adoró aquí a sus dioses hindúes, antes de que los monjes budistas transformaran las cavernas subterráneas en santuarios de meditación. Más adelante, durante los conflictos bélicos, los túneles naturales sirvieron de refugio secreto y hospital de campaña para la resistencia local.

La joya indiscutible es la montaña Thủy Sơn (Agua), repleta de escalinatas talladas en la roca viva que conducen a la sobrecogedora cueva Huyền Không, donde rayos de sol celestiales atraviesan el techo de piedra para iluminar una colosal estatua de Buda.`,
    stops: [
      {
        number: 1,
        title: 'Pagoda Linh Ứng de Ngũ Hành Sơn',
        whatToLookAt: 'La pagoda centenaria con la torre Xá Lợi de siete pisos frente al mar del Este.',
        story: 'Fundada bajo el reinado del emperador Minh Mạng en 1825, es la más antigua de las tres célebres pagodas Linh Ung de Da Nang.',
        insiderTip: 'Acércate al mirador Vọng Hải Đài para contemplar la inmensidad del mar y la curva de la playa Non Nuoc.'
      },
      {
        number: 2,
        title: 'Cueva Sagrada Huyền Không',
        whatToLookAt: 'El agujero cenital en el techo de la cueva por donde descienden haces de luz solar directa sobre el altar.',
        story: 'El microclima interior es fresco y húmedo. Los guerrilleros instalaron aquí una base secreta sin que la aviación enemiga pudiera detectarlos desde el cielo.',
        insiderTip: 'El mejor momento para ver el haz de luz místico es entre las 11:30 y las 13:00 en días despejados.'
      }
    ],
    photoSpot: {
      location: 'En el interior de la Cueva Huyền Không mirando hacia la estatua de Buda iluminada por el haz de luz cenital.',
      bestLight: 'Al mediodía solar cuando los rayos caen verticales a través de la hendidura superior.',
      instruction: 'Usa una velocidad de obturación rápida para capturar las partículas de polvo e incienso flotando en el haz de luz.'
    },
    culturalEtiquette: {
      dressCode: 'Calzado deportivo con buen agarre (los escalones de mármol están muy pulidos y resbalan con humedad).',
      whatNotToDo: 'No entres en bañador o tirantes a las cuevas-altar; son templos activos con monjes residentes.',
      scamWarning: 'En la base de la montaña hay docenas de tiendas de esculturas de mármol; no compres estatuas que pesen demasiado para tu equipaje de avión.'
    },
    streetFoodReward: {
      dishNameVi: 'Mì Quảng Đà Nẵng',
      dishNameEs: 'Fideos planos de cúrcuma con langostinos, cerdo, cacahuetes tostados, galleta de sésamo crujiente y caldo reducido',
      whereToFind: 'En los restaurantes populares de la calle Lê Văn Hiến junto a la salida norte.',
      priceEstimate: '30.000 ₫ – 45.000 ₫'
    },
    suggestedQuestions: [
      '¿Por qué cada montaña lleva el nombre de uno de los 5 elementos de la naturaleza?',
      '¿Cómo se formaron estas cuevas naturales tan cerca del mar?',
      '¿Cuál era el rol de esta montaña para el antiguo reino de Champa?'
    ]
  },
  {
    placeName: 'Túneles de Củ Chi',
    cityName: 'TP. Hồ Chí Minh',
    vietnameseName: 'Địa đạo Củ Chi',
    tagline: 'La legendaria ciudad subterránea de 250 kilómetros cavada a mano que desafió a los ejércitos más poderosos.',
    durationMinutes: 45,
    audioGuideScript: `¡Bienvenido al subsuelo de la historia contemporánea! Estás pisando el suelo de Củ Chi, una zona rural que albergó la red de túneles más asombrosa del siglo XX: más de 250 kilómetros de galerías interconectadas cavadas a mano con simples azadones y cestos de mimbre.

Los combatientes construyeron tres niveles de profundidad: el primer nivel a 3 metros (resistente a metralla de tanques), el segundo a 6 metros (resistente a bombardeos) y el tercero a 9-12 metros (resistente a las bombas pesadas de los B-52).

Bajo esta arcilla roja había cocinas invisibles con chimeneas subterráneas Hoàng Cầm que dispersaban el humo al ras del suelo entre la niebla matutina, hospitales de campaña, fábricas de armas con proyectiles reciclados y trampas de bambú con ingenio formidable.`,
    stops: [
      {
        number: 1,
        title: 'Trampillas de Acceso Camufladas con Hojas Secas',
        whatToLookAt: 'El pequeño rectángulo de madera de 25x35 cm que desaparece entre las hojas de la selva.',
        story: 'Los soldados entraban deslizándose con los brazos en alto y cerraban la tapa sobre sí mismos sin dejar el menor rastro visible en el suelo.',
        insiderTip: 'Los guías locales te invitarán a meterte dentro de la trampilla para experimentar el espacio milimétrico original.'
      },
      {
        number: 2,
        title: 'La Cocina Hoàng Cầm y el Sistema de Ventilación Subterráneo',
        whatToLookAt: 'Los montículos de termiteros falsos con diminutos orificios de ventilación orientados hacia el viento.',
        story: 'El cocinero Hoàng Cầm diseñó conductos de humo horizontales de 20 metros con filtros de ramas y carbón para enfriar el humo y evitar ser blanco de cazas aéreos.',
        insiderTip: 'Prueba la yuca hervida con sal de sésamo y cacahuete que sirven en la salida: era el alimento diario de supervivencia de los soldados.'
      }
    ],
    photoSpot: {
      location: 'Saliendo de la trampilla camuflada de madera con las manos en el borde de la tierra.',
      bestLight: 'A través del dosel de los árboles de caucho durante la mañana.',
      instruction: 'Enfoca el contraste entre el camuflaje vegetal de la tapa y el pozo vertical.'
    },
    culturalEtiquette: {
      dressCode: 'Ropa resistente y zapatos que se puedan manchar de arcilla roja.',
      whatNotToDo: 'Si padeces claustrofobia severa o problemas cardíacos, no intentes gatear por los tramos largos de túnel subterráneo.',
      scamWarning: 'El campo de tiro al final es ruidoso y opcional; el precio de las balas se cobra por separado.'
    },
    streetFoodReward: {
      dishNameVi: 'Khoai Mì Luộc Chấm Muối Mè',
      dishNameEs: 'Yuca tierna cocida al vapor con mezcla de sal marina, azúcar y semillas de sésamo tostadas',
      whereToFind: 'Incluido en la zona de descanso del complejo de Củ Chi junto al río Saigón.',
      priceEstimate: 'Gratuito en el recorrido / 15.000 ₫ ración extra'
    },
    suggestedQuestions: [
      '¿Cómo hacían los combatientes para respirar durante los ataques con gases?',
      '¿Por qué las trampillas eran tan estrechas?',
      '¿Cómo lograban evacuar el agua en temporada de monzones torrenciales?'
    ]
  },
  {
    placeName: 'Mercado Bến Thành',
    cityName: 'TP. Hồ Chí Minh',
    vietnameseName: 'Chợ Bến Thành Sài Gòn',
    tagline: 'La torre del reloj colonial, el frenesí comercial del sur y el epicentro del street food saigonés.',
    durationMinutes: 35,
    audioGuideScript: `¡Bienvenido al corazón palpitante de Saigón! Estás frente al mercado más emblemático de todo Vietnam del Sur: Chợ Bến Thành. Inaugurado en 1914 por las autoridades coloniales francesas, su inconfundible torre del reloj de cuatro esferas es la postal icónica de Ciudad Ho Chi Minh.

Bajo sus tejados de tejas y bóvedas metálicas conviven más de 1.500 puestos organizados por gremios: sedas naturales de Hà Đông, café de comadreja de las tierras altas de Buôn Ma Thuột, frutas tropicales exóticas como el mangostán y la fruta del dragón, y un pasillo gastronómico central donde el vapor de los woks no se detiene jamás.

Aquí el regateo no es solo una transacción económica, sino un diálogo social lleno de sonrisas y picardía. Al caer la tarde, las calles exteriores se cortan al tráfico para dar paso al vibrante mercado nocturno.`,
    stops: [
      {
        number: 1,
        title: 'Torre del Reloj de la Puerta Sur (Cửa Nam)',
        whatToLookAt: 'El reloj mecánico de tres caras sobre el arco de entrada y los relieves cerámicos que muestran la fauna de Cochinchina.',
        story: 'Esta puerta ha sido testigo del paso de tranvías coloniales, tanques de liberación en 1975 y la moderna línea 1 del metro de Saigón subterráneo.',
        insiderTip: 'La rotonda frontal es el mejor punto para cruzar con paso firme y constante; las motos te esquivarán con fluidez natural si no te detienes bruscamente.'
      },
      {
        number: 2,
        title: 'Pasillo de Street Food y Dulces Tradicionales (Chè)',
        whatToLookAt: 'Los cuencos multicolores con jaleas, leche de coco, judías dulces, perlas de tapioca y frutas.',
        story: 'Las recetas de estos puestos se han transmitido de madres a hijas durante más de tres generaciones de cocineras saigonesas.',
        insiderTip: 'Pide un "Chè Ba Màu" (postre de tres colores con hielo picado) para refrescarte del calor tropical.'
      }
    ],
    photoSpot: {
      location: 'Desde la acera de la estación de metro mirando hacia la torre del reloj de la puerta sur.',
      bestLight: 'A las 18:00 cuando se encienden los neones del reloj y el cielo toma un tono índigo.',
      instruction: 'Usa exposición prolongada para capturar las estelas de luz roja de las motos circulando por delante.'
    },
    culturalEtiquette: {
      dressCode: 'Ropa fresca y ligera (el interior del mercado puede ser caluroso al mediodía).',
      whatNotToDo: 'No muestres enfado al regatear; hazlo siempre con una sonrisa y humor.',
      scamWarning: 'La regla de oro para souvenirs y ropa: ofrece inicialmente entre el 40% y 50% del primer precio pedido y pacta en el punto medio.'
    },
    streetFoodReward: {
      dishNameVi: 'Bún Thịt Nướng Chả Giò',
      dishNameEs: 'Fideos fríos de arroz con panceta de cerdo a la brasa, rollitos crujientes, cacahuetes y salsa dulce nước mắm',
      whereToFind: 'En el puesto número 7 o en los restaurantes locales de la calle Phan Bội Châu (puerta este).',
      priceEstimate: '45.000 ₫ – 60.000 ₫'
    },
    suggestedQuestions: [
      '¿Qué frutas exóticas del Delta del Mekong son las más dulces según la temporada?',
      '¿Cómo saber si el café de comadreja que venden es auténtico o aromatizado?',
      '¿Por qué el mercado tiene cuatro puertas principales con cuatro puntos cardinales?'
    ]
  },
  {
    placeName: 'Bahía de Hạ Long (Vịnh Hạ Long)',
    cityName: 'Quảng Ninh / Hạ Long',
    vietnameseName: 'Vịnh Hạ Long',
    tagline: 'Donde el dragón descendió al mar: miles de pilares kársticos de esmeralda esculpidos por los dioses.',
    durationMinutes: 45,
    audioGuideScript: `¡Estás navegando sobre una de las Nuevas Siete Maravillas de la Naturaleza! Hạ Long significa literalmente 'donde el dragón desciende al mar'. Según la cosmología vietnamita, cuando el país recién nacido luchaba contra invasores marítimos, el Emperador de Jade envió a una madre dragón y a sus crías celestiales.

Los dragones escupieron perlas y jades que, al caer sobre las aguas del golfo de Tonkín, se transformaron de inmediato en casi 2.000 islas e islotes de roca caliza, levantando una muralla defensiva infranqueable donde encallaron los navíos enemigos.

Alrededor de tu barco, los acantilados kársticos de 250 millones de años de antigüedad se alzan cubiertos de vegetación tropical impenetrable. Respira la brisa salina, escucha el graznido de las águilas marinas y déjate envolver por la bruma matutina que inspiró a poetas imperiales durante milenios.`,
    stops: [
      {
        number: 1,
        title: 'Cueva de las Sorpresas (Hang Sửng Sốt)',
        whatToLookAt: 'Las tres cámaras colosales repletas de estalactitas con formas de caballos, dragones y árboles de piedra.',
        story: 'Descubierta por exploradores franceses en 1901, quienes la llamaron "Grotte des Surprises" por la sorpresa monumental al pasar de una pequeña hendidura a una bóveda natural de 30 metros de altura.',
        insiderTip: 'Observa el techo ondulado de la segunda cámara: parece el lecho de un río petrificado en el aire.'
      },
      {
        number: 2,
        title: 'Islote del Beso de los Gallos (Hòn Trống Mái)',
        whatToLookAt: 'Dos formaciones rocosas gemelas que parecen un gallo y una gallina tocándose los picos sobre el agua.',
        story: 'Es el símbolo supremo del amor fiel y eterno en la bahía, resistiendo oleajes y tempestades desde hace milenios.',
        insiderTip: 'Pídele al capitán del barco que reduzca la velocidad al rodearlo para captar la silueta exacta contra el horizonte.'
      }
    ],
    photoSpot: {
      location: 'Desde la cubierta superior del barco o desde el mirador en la cima de la isla Ti Tốp.',
      bestLight: 'Al amanecer (6:00) entre la bruma mística o al atardecer cuando el sol se oculta tras los mogotes kársticos.',
      instruction: 'Incluye la proa tradicional de madera del barco o una vela roja en una esquina del encuadre para dar escala humana.'
    },
    culturalEtiquette: {
      dressCode: 'Chaleco salvavidas obligatorio al subir a botes auxiliares y kayaks.',
      whatNotToDo: 'Bajo ninguna circunstancia arrojes plásticos o botellas al mar; la bahía tiene un programa estricto de protección ambiental.',
      scamWarning: 'Evita comprar marisco en barcas pequeñas que se pegan a tu crucero si el precio no está claro de antemano.'
    },
    streetFoodReward: {
      dishNameVi: 'Chả Mực Hạ Long',
      dishNameEs: 'Pastel de calamar fresco machacado a mano en mortero y frito hasta dorar crujiente',
      whereToFind: 'En los puestos de la ciudad costera de Hạ Long (Bãi Cháy) o servido a bordo con arroz glutinoso xôi.',
      priceEstimate: '50.000 ₫ – 80.000 ₫ ración'
    },
    suggestedQuestions: [
      '¿Cómo se formaron geológicamente estos miles de pilares de piedra en el mar?',
      '¿Aún viven pescadores en las aldeas flotantes tradicionales de la bahía?',
      '¿Por qué el agua tiene ese color verde esmeralda tan particular?'
    ]
  }
];

export function findClientCuratedTour(placeName: string, cityName?: string): FreeTourData | undefined {
  const cleanP = placeName.toLowerCase().trim();
  const cleanC = (cityName || '').toLowerCase().trim();

  return CURATED_CLIENT_TOURS.find((tour) => {
    const tPlace = tour.placeName.toLowerCase();
    const tCity = tour.cityName.toLowerCase();
    const tVi = (tour.vietnameseName || '').toLowerCase();

    const placeMatches =
      cleanP.includes(tPlace) ||
      tPlace.includes(cleanP) ||
      (tVi && (cleanP.includes(tVi) || tVi.includes(cleanP))) ||
      // Specific famous synonyms
      (cleanP.includes('literatura') && tPlace.includes('literatura')) ||
      (cleanP.includes('hoan kiem') && tPlace.includes('hoàn kiếm')) ||
      (cleanP.includes('tren') && tPlace.includes('tren')) ||
      (cleanP.includes('train street') && tPlace.includes('tren')) ||
      (cleanP.includes('catedral') && tPlace.includes('catedral')) ||
      (cleanP.includes('jose') && tPlace.includes('josé')) ||
      (cleanP.includes('japones') && tPlace.includes('japonés')) ||
      (cleanP.includes('chua cau') && tPlace.includes('chùa cầu')) ||
      (cleanP.includes('ciudadela') && tPlace.includes('ciudadela')) ||
      (cleanP.includes('marmol') && tPlace.includes('mármol')) ||
      (cleanP.includes('cu chi') && tPlace.includes('củ chi')) ||
      (cleanP.includes('ben thanh') && tPlace.includes('bến thành')) ||
      (cleanP.includes('ha long') && tPlace.includes('hạ long'));

    if (!placeMatches) return false;
    if (cleanC && cleanC !== 'vietnam' && !tCity.includes(cleanC) && !cleanC.includes(tCity)) {
      // If city doesn't match and was specific, only allow if place name is very specific
      return cleanP.length > 8;
    }
    return true;
  });
}
