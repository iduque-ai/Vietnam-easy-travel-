import { FreeTourData } from '../types';

export const CURATED_CLIENT_TOURS: FreeTourData[] = [
  // ===================== HÀ NỘI =====================
  {
    placeName: 'Templo de la Literatura (Văn Miếu - Quốc Tử Giám)',
    cityName: 'Hà Nội',
    vietnameseName: 'Văn Miếu – Quốc Tử Giám',
    centerLat: 21.0286,
    centerLng: 105.8358,
    tagline: 'Mil años de sabiduría confuciana, tortugas sagradas y la primera universidad imperial de Vietnam.',
    durationMinutes: 45,
    audioGuideScript: `¡Xin chào y bienvenido al santuario del conocimiento de Vietnam! Estás pisando el suelo del Văn Miếu, fundado en el año 1070 por el emperador Lý Thánh Tông y ampliado seis años después con el Quốc Tử Giám, la primera universidad imperial del país. Al cruzar la monumental puerta principal de madera y piedra, deja atrás el incesante zumbido de las miles de motocicletas de Hanói y sumérgete en una atmósfera de paz, estanques de loto y aroma a incienso dulce.

Este complejo está dividido en cinco patios amurallados alineados en un eje de simetría sagrado que imita el templo natal de Confucio en Qufu. Antiguamente, solo el emperador tenía permitido caminar por el sendero central pavimentado con ladrillos rojos de Bát Tràng, mientras que los mandarines civiles y militares debían desmontar de sus caballos frente a los pilares de piedra exteriores y acceder por las puertas laterales de la Virtud Alcanzada y el Talento Consumado.

Avanza despacio hacia el corazón del recinto. En el tercer patio te esperan las 82 estelas doctorales de piedra azul sostenidas sobre caparazones de tortugas milenarias. Cada losa lleva grabados en caracteres clásicos los nombres, lugares de nacimiento y méritos de los 1.307 doctores imperiales que superaron los exámenes reales más exigentes de Asia entre 1442 y 1779. Siente la brisa bajo los banianos centenarios y descubre cómo la devoción por el estudio forjó el alma de esta nación.`,
    stops: [
      {
        number: 1,
        title: 'Puerta Văn Miếu Môn y Pabellón Khuê Văn Các',
        whatToLookAt: 'El pabellón rojo de dos plantas sobre cuatro pilares de piedra blanca con ventanas circulares radiantes.',
        story: 'Erigido en 1805 bajo la dinastía Nguyễn, el Pabellón de la Constelación de la Literatura es el emblema oficial de Hanói. Sus ventanas redondas representan el cielo (principio Yang) irradiando la luz del saber sobre el estanque cuadrado inferior, que simboliza la tierra (principio Yin).',
        insiderTip: 'Saca un billete de 100.000 Dong vietnamitas de tu cartera: verás grabado exactamente este pabellón en su reverso.',
        lat: 21.0275,
        lng: 105.8359,
      },
      {
        number: 2,
        title: 'Estanque de la Claridad Celestial (Thiên Quang Tỉnh)',
        whatToLookAt: 'El gran estanque cuadrado rodeado de balaustradas de ladrillo antiguo reflejando los árboles y el cielo.',
        story: 'El agua serena actuaba como un espejo espiritual donde los aspirantes a mandarines debían contemplar su propio reflejo para purificar la mente y despojarse de toda arrogancia antes de escuchar el veredicto imperial.',
        insiderTip: 'Observa las carpas nadando cerca de los muros; en la mitología vietnamita, la carpa que nada contracorriente y salta la Puerta del Dragón se transforma en dragón celestial, metáfora del estudiante perseverante.',
        lat: 21.0281,
        lng: 105.8357,
      },
      {
        number: 3,
        title: 'Jardín de las 82 Estelas Doctorales sobre Tortugas',
        whatToLookAt: 'Las hileras de tortugas de piedra talladas a mano, cada una con un rostro y expresión únicos.',
        story: 'La tortuga (Rùa) es uno de los cuatro animales sagrados de Vietnam, símbolo de sabiduría e inmortalidad. La primera inscripción de cada estela proclama: "Los talentos virtuosos son la savia vital de la nación; cuando la savia es fuerte, el país prospera".',
        insiderTip: 'Fíjate en las estelas del lado oriental: la más antigua data de 1484 bajo el reinado del sabio emperador Lê Thánh Tông, declaradas Memoria del Mundo por la UNESCO.',
        lat: 21.0284,
        lng: 105.8356,
      },
      {
        number: 4,
        title: 'Santuario Mayor Đại Thành Điện y Universidad Quốc Tử Giám',
        whatToLookAt: 'El altar lacado en rojo y pan de oro con la estatua de Confucio flanqueado por dos grullas de bronce posadas sobre tortugas.',
        story: 'Las columnas de madera de hierro (gỗ lim) han resistido tifones y guerras durante siglos. En el patio trasero se alzaba la Academia Imperial, presidida hoy por la estatua de Chu Văn An, el rector más íntegro de Vietnam que llegó a pedir la cabeza de siete mandarines corruptos.',
        insiderTip: 'Sube a la segunda planta del edificio trasero para contemplar el gigantesco tambor del trueno (Trống Sấm) de dos metros de diámetro.',
        lat: 21.0291,
        lng: 105.8354,
      },
    ],
    photoSpot: {
      location: 'En la orilla norte del estanque Thiên Quang mirando hacia el pabellón Khuê Văn Các.',
      bestLight: 'Entre las 15:30 y las 17:00, cuando el sol poniente baña de oro la madera bermellón.',
      instruction: 'Agáchate a la altura del pretil para encuadrar el reflejo simétrico del pabellón en el agua.',
    },
    culturalEtiquette: {
      dressCode: 'Hombros y rodillas cubiertos obligatoriamente. Retira gorras y gafas de sol en los pabellones interiores.',
      whatNotToDo: 'Nunca toques ni te apoyes sobre las cabezas de las tortugas de piedra doctorales.',
      scamWarning: 'No compres incienso a vendedores ambulantes en la acera exterior; no es necesario para entrar.',
    },
    streetFoodReward: {
      dishNameVi: 'Phở Cuốn & Bún Chả',
      dishNameEs: 'Rollos frescos de masa de arroz rellenos de ternera salteada y hierbas con salsa agridulce',
      whereToFind: 'En la calle Nguyễn Khuyến o Văn Miếu, a solo 3 minutos a pie de la salida.',
      priceEstimate: '50.000 ₫ – 75.000 ₫ por ración',
    },
    suggestedQuestions: [
      '¿Por qué los estudiantes vietnamitas siguen viniendo aquí antes de los exámenes nacionales?',
      '¿Qué simboliza la grulla posada sobre el caparazón de la tortuga en el altar?',
      '¿Cómo eran las celdas donde los candidatos hacían los exámenes imperiales?',
    ],
  },

  {
    placeName: 'Lago Hoàn Kiếm y Templo Ngọc Sơn',
    cityName: 'Hà Nội',
    vietnameseName: 'Hồ Hoàn Kiếm & Đền Ngọc Sơn',
    centerLat: 21.0307,
    centerLng: 105.8524,
    tagline: 'La leyenda viva de la Espada Restituida, la tortuga sagrada gigante y el puente escarlata de Hanói.',
    durationMinutes: 40,
    audioGuideScript: `¡Hola viajero! Te encuentras en el corazón espiritual y sentimental de todo Vietnam: el lago Hoàn Kiếm. A principios del siglo XV, cuando el país sufría veinte años de dura ocupación por la dinastía Ming, un humilde pescador llamado Lê Thận sacó en sus redes una hoja de metal resplandeciente. Poco después, el líder rebelde Lê Lợi halló una empuñadura engastada en joyas entre las ramas de un baniano. Al unirlas, la espada mágica Thuận Thiên ("Voluntad del Cielo") le otorgó una fuerza invencible para liberar el país y fundar la dinastía Lê.

Un día de primavera tras la paz, mientras el ya coronado emperador navegaba en su barca real por estas aguas esmeralda, una descomunal tortuga de caparazón dorado emergió de las profundidades, habló con voz humana para reclamar la espada prestada por el Rey Dragón y la tomó con sus fauces antes de sumergirse. Desde aquel instante, el lago cambió su nombre a Hồ Hoàn Kiếm: el Lago de la Espada Restituida.

A tu alrededor late la vida hanoyense en su máxima pureza: abuelos practicando Tai Chi entre la bruma del alba, parejas bajo los sauces llorones y el célebre puente rojo Cầu Thê Húc invitándote a cruzar hacia el islote de Jade.`,
    stops: [
      {
        number: 1,
        title: 'Torre del Pincel (Tháp Bút) y Puerta del Tintero (Đài Nghiên)',
        whatToLookAt: 'El obelisco de piedra de cinco pisos con forma de pincel caligráfico apuntando al cielo.',
        story: 'Construida en 1865 por el erudito Nguyễn Văn Siêu sobre un montículo de rocas. Lleva grabados tres caracteres: "Tả Thanh Thiên" (Escribir en el cielo azul), proclamando la rectitud moral de los sabios frente al poder.',
        insiderTip: 'Al cruzar bajo la puerta del Tintero, mira hacia arriba: el cuenco de piedra está sostenido por tres sapos tallados, símbolo de la sabiduría lunar.',
        lat: 21.0308,
        lng: 105.8533,
      },
      {
        number: 2,
        title: 'Puente Cầu Thê Húc (El Puente del Sol Naciente)',
        whatToLookAt: 'El puente curvo de madera pintado en rojo escarlata intenso sobre el agua verde del lago.',
        story: 'Su nombre poético significa "Donde se posa la luz del sol de la mañana". Sus 15 vanos sobre 32 pilares redondos de madera están orientados al este para recibir los primeros rayos del alba y bloquear a los espíritus malignos.',
        insiderTip: 'Cruzarlo a las 07:30 de la mañana o iluminado al anochecer regala dos atmósferas completamente distintas.',
        lat: 21.0311,
        lng: 105.8528,
      },
      {
        number: 3,
        title: 'Templo Ngọc Sơn y la Gran Tortuga Centenaria Preservada',
        whatToLookAt: 'La vitrina acristalada que custodia el ejemplar real de la tortuga gigante de caparazón blando Rafetus swinhoei.',
        story: 'Esta colosal tortuga de 2,10 metros de largo y 250 kilos vivió realmente en el lago hasta 1968, demostrando que el mito de Lê Lợi nació de una especie endémica única en el planeta, venerada por los hanoyenses como "Cụ Rùa" (Abuela Tortuga).',
        insiderTip: 'Detrás del pabellón principal hay una terraza tranquila desde donde se contempla la mejor vista frontal de la Torre de la Tortuga.',
        lat: 21.0315,
        lng: 105.8525,
      },
      {
        number: 4,
        title: 'Torre de la Tortuga (Tháp Rùa)',
        whatToLookAt: 'La pequeña torre de tres pisos que se alza solitaria en el islote central del lago.',
        story: 'Levantada en 1886 en el antiguo islote donde los reyes pescaban en verano, su arquitectura fusiona arcos ojivales de influencia francesa con tejados curvos vietnamitas.',
        insiderTip: 'Camina por la orilla suroeste del lago al caer el sol para ver la torre iluminada reflejada sobre el agua inmóvil.',
        lat: 21.0279,
        lng: 105.8523,
      },
    ],
    photoSpot: {
      location: 'En la orilla este, a 25 metros al sur de la entrada del puente rojo Cầu Thê Húc.',
      bestLight: 'Hora azul (17:45 - 18:15) cuando se encienden los focos rojos del puente.',
      instruction: 'Enmarca el puente en diagonal dejando caer las ramas de sauce llorón en la parte superior del encuadre.',
    },
    culturalEtiquette: {
      dressCode: 'Ropa que cubra hombros y rodillas para acceder a las salas interiores del Templo Ngọc Sơn.',
      whatNotToDo: 'No arrojes monedas ni comida al agua del lago; su ecosistema está estrictamente protegido.',
      scamWarning: 'Rechaza con firmeza ("Không, cảm ơn") a limpiabotas que intenten tocar tu calzado sin permiso o vendedoras que coloquen cestas de fruta en tu hombro para pedir dinero.',
    },
    streetFoodReward: {
      dishNameVi: 'Cà Phê Trứng (Café de Huevo)',
      dishNameEs: 'Café robusta vietnamita coronado con una crema tibia y esponjosa de yema de huevo batida y leche condensada',
      whereToFind: 'En el histórico Café Giảng (39 Nguyễn Hữu Huân), a 4 minutos caminando del lago.',
      priceEstimate: '35.000 ₫ – 45.000 ₫',
    },
    suggestedQuestions: [
      '¿Queda todavía alguna tortuga gigante viva en el lago Hoàn Kiếm?',
      '¿Por qué se cierra todo el tráfico alrededor del lago durante los fines de semana?',
      '¿A quién está dedicado el altar principal del Templo Ngọc Sơn?',
    ],
  },

  {
    placeName: 'Calle del Tren (Train Street)',
    cityName: 'Hà Nội',
    vietnameseName: 'Phố Đường Tàu Hà Nội',
    centerLat: 21.0289,
    centerLng: 105.8427,
    tagline: 'La estrecha vía ferroviaria colonial donde las locomotoras rozan los balcones y cafeterías.',
    durationMinutes: 30,
    audioGuideScript: `¡Pega tu espalda a la fachada y siente cómo tiembla el suelo bajo tus pies! Estás en la célebre Calle del Tren de Hanói (Phố Đường Tàu), uno de los corredores urbanos más asombrosos del sudeste asiático. Esta línea de vía métrica fue trazada por los ingenieros coloniales franceses en 1902 para unir la capital con el puerto de Hải Phòng, la frontera montañosa de Yunnan y el largo expreso Reunificación hacia Saigón.

A mediados del siglo XX, los trabajadores ferroviarios comenzaron a levantar sus estrechas "casas tubo" (nhà ống) a ambos lados del balasto de piedra, dejando apenas metro y medio entre los rieles de acero y los umbrales de sus salones. Aquí han crecido generaciones enteras habituadas a cocinar sobre hornillos de carbón, pelar verduras y charlar en taburetes diminutos sobre las traviesas.

Cuando suena la campana metálica del guardabarreras y el silbato retumba en la curva de Phùng Hưng, el callejón entero ejecuta una coreografía milimétrica: en menos de treinta segundos se pliegan las mesas, se recogen las motos y una mole diésel de decenas de toneladas cruza a escasos palmos de tus ojos.`,
    stops: [
      {
        number: 1,
        title: 'El Paso a Nivel de Trần Phú y las Casas Tubo',
        whatToLookAt: 'Las fachadas de apenas 3 metros de ancho con balcones llenos de buganvillas, jaulas de pájaros y cables entrelazados.',
        story: 'Los vecinos conocen el horario de cada convoy de memoria y distinguen por la vibración del raíl si se aproxima un tren ligero del norte o el expreso nocturno del sur.',
        insiderTip: 'Si hay control policial en la barrera, avisa al propietario de cualquiera de las cafeterías interiores; saldrán a acompañarte hasta su terraza de forma segura.',
        lat: 21.0298,
        lng: 105.8441,
      },
      {
        number: 2,
        title: 'La Curva de los Cafés Ferroviarios (Tramo Phùng Hưng)',
        whatToLookAt: 'Las chapas de botella aplastadas sobre el riel y la línea límite pintada junto a los escalones de las casas.',
        story: 'Los antiguos talleres ferroviarios se transformaron en cafeterías familiares dirigidas por antiguos maquinistas y sus nietos.',
        insiderTip: 'Sube a una terraza del segundo piso si prefieres ver el techo del tren pasando justo debajo de tus pies con total tranquilidad.',
        lat: 21.0321,
        lng: 105.8452,
      },
      {
        number: 3,
        title: 'Los Murales de Phùng Hưng bajo el Viaducto',
        whatToLookAt: 'Los arcos de piedra del viaducto ferroviario decorados con frescos tridimensionales del Hanói antiguo.',
        story: 'Diecinueve arcos del viaducto de 1902 fueron intervenidos por artistas vietnamitas y surcoreanos para recrear los tranvías antiguos, los puestos de phở ambulantes y el mercado de flores del Tết.',
        insiderTip: 'Camina 150 metros siguiendo los arcos hacia el norte para ver los murales sin aglomeraciones.',
        lat: 21.0352,
        lng: 105.8461,
      },
    ],
    photoSpot: {
      location: 'En la curva suave entre Trần Phú y Tống Duy Tân o desde un balcón del primer piso.',
      bestLight: 'A media tarde (15:15) o en los trenes nocturnos (19:30 - 21:15) cuando el faro frontal ilumina los rieles.',
      instruction: 'Mantén siempre el cuerpo, trípodes y brazos por detrás de la línea de seguridad marcada por los vecinos.',
    },
    culturalEtiquette: {
      dressCode: 'Calzado cerrado y plano para no tropezar con las piedras de balasto ni los raíles.',
      whatNotToDo: 'Jamás permanezcas en el centro de la vía cuando suene la sirena de aviso ni uses palos selfie que sobresalgan hacia el tren.',
      scamWarning: 'Consume al menos un café o refresco (35.000 ₫ – 50.000 ₫) en la cafetería cuya silla ocupes.',
    },
    streetFoodReward: {
      dishNameVi: 'Cà Phê Muối & Nước Mía',
      dishNameEs: 'Café vietnamita con espuma de crema salada o jugo de caña de azúcar recién prensado con kumquat',
      whereToFind: 'En las cafeterías familiares a pie de vía en el tramo de Trần Phú.',
      priceEstimate: '30.000 ₫ – 50.000 ₫',
    },
    suggestedQuestions: [
      '¿A qué horas exactas pasan los trenes entre semana y el fin de semana?',
      '¿Por qué las casas de Hanói son tan estrechas y tan profundas?',
      '¿Cuánto tarda el tren expreso en recorrer todo Vietnam de Hanói a Saigón?',
    ],
  },

  {
    placeName: 'Catedral de San José',
    cityName: 'Hà Nội',
    vietnameseName: 'Nhà Thờ Lớn Hà Nội',
    centerLat: 21.0288,
    centerLng: 105.8490,
    tagline: 'El eco neogótico de Notre-Dame de París erguido sobre los cimientos de una pagoda imperial del siglo XI.',
    durationMinutes: 30,
    audioGuideScript: `Frente a ti se alza Nhà Thờ Lớn ("La Gran Iglesia"), la catedral más antigua y carismática de Hanói, inaugurada en la Nochebuena de 1886. Sus dos torres cuadradas de 31,5 metros de altura, sus arcos ojivales y su fachada de piedra gris modelada por más de un siglo de lluvias monzónicas evocan al instante la silueta de Notre-Dame de París.

Sin embargo, este solar sagrado esconde un palimpsesto histórico fascinante. Ocho siglos antes de la llegada de los misioneros franceses, aquí mismo se levantaba la legendaria Pagoda Báo Thiên, fundada en 1056 bajo la dinastía Lý con una torre de bronce de doce pisos que era considerada una de las cuatro maravillas sagradas del antiguo reino de Đại Việt.

Hoy, la plazoleta adoquinada que precede a la catedral es el salón social al aire libre más animado de la capital: al caer la tarde, cientos de jóvenes hanoyenses se sientan en taburetes bajos alrededor de la estatua de bronce para beber té helado con lima (Trà Chanh), comer pipas de girasol y escuchar el profundo tañido de sus cinco campanas.`,
    stops: [
      {
        number: 1,
        title: 'La Plaza de la Virgen y las Torres Gemelas',
        whatToLookAt: 'El reloj mecánico central entre las dos torres y la estatua de Regina Pacis en el centro de la explanada.',
        story: 'El reloj francés original de 1886 sigue funcionando conectado a un carillón de cinco campanas de bronce que suman más de cuatro toneladas.',
        insiderTip: 'Detente en la plaza a las 18:00 en punto para escuchar el repique completo de las campanas resonando por las calles del Barrio Antiguo.',
        lat: 21.0288,
        lng: 105.8493,
      },
      {
        number: 2,
        title: 'Las Vidrieras de Chartres y el Altar Dorado',
        whatToLookAt: 'Los vitrales policromados europeos y el retablo mayor tallado en madera lacada en rojo y oro al estilo tradicional vietnamita.',
        story: 'El interior es una joya del sincretismo artístico: mientras las bóvedas siguen cánones góticos franceses, el santuario de San José fue esculpido por maestros ebanistas vietnamitas con pan de oro.',
        insiderTip: 'Si la puerta frontal está cerrada fuera de horario de misa, acércate por la pequeña cancela lateral izquierda junto a la curia.',
        lat: 21.0288,
        lng: 105.8488,
      },
      {
        number: 3,
        title: 'La Calle Nhà Chung y las Terrazas de Té con Lima',
        whatToLookAt: 'Los callejones arbolados llenos de puestos de bocadillos calientes y terrazas de café retro.',
        story: 'En vietnamita, la expresión "Trà chanh chém gió" ("cortar el viento tomando té con limón") nació precisamente en estas aceras como sinónimo de charlar animadamente entre amigos.',
        insiderTip: 'Sube al balcón del segundo piso de Cộng Cà Phê justo enfrente para tener una vista a la altura del rosetón central.',
        lat: 21.0285,
        lng: 105.8495,
      },
    ],
    photoSpot: {
      location: 'Desde el balcón del segundo piso de las cafeterías de la calle Nhà Thờ frente a la plaza.',
      bestLight: 'Al atardecer (17:45) cuando se ilumina la fachada neogótica contra el cielo azul oscuro.',
      instruction: 'Encuadra las dos torres simétricas incluyendo una taza de café con coco en el alféizar en primer plano.',
    },
    culturalEtiquette: {
      dressCode: 'Para entrar a la nave interior es obligatorio llevar hombros y rodillas cubiertos.',
      whatNotToDo: 'No camines por el pasillo central ni uses flash mientras se esté celebrando misa.',
      scamWarning: 'Un vaso de Trà Chanh en los taburetes de la calle cuesta entre 15.000 ₫ y 25.000 ₫; pregunta el precio antes si pides bandejas de aperitivos.',
    },
    streetFoodReward: {
      dishNameVi: 'Trà Chanh & Bánh Gối Lý Quốc Sư',
      dishNameEs: 'Té verde helado con lima y miel acompañado de empanadillas crujientes rellenas de carne, setas y fideos de cristal',
      whereToFind: 'En la calle Lý Quốc Sư (a 80 metros al norte de la catedral, bajo el gran baniano).',
      priceEstimate: '35.000 ₫ – 55.000 ₫',
    },
    suggestedQuestions: [
      '¿Por qué la fachada tiene ese tono negro y gris tan característico?',
      '¿Qué porcentaje de la población vietnamita es católica hoy en día?',
      '¿Qué talleres artesanales famosos hay en las calles que rodean la catedral?',
    ],
  },

  {
    placeName: 'Mausoleo de Hồ Chí Minh',
    cityName: 'Hà Nội',
    vietnameseName: 'Lăng Chủ tịch Hồ Chí Minh & Quảng trường Ba Đình',
    centerLat: 21.0369,
    centerLng: 105.8346,
    tagline: 'La histórica Plaza Ba Đình, la casa sobre pilotes del Tío Hồ y la sagrada Pagoda del Pilar Único.',
    durationMinutes: 45,
    audioGuideScript: `¡Bienvenido a la explanada más solemne de la historia moderna de Vietnam! Te encuentras en la Plaza Ba Đình, el lugar exacto donde el 2 de septiembre de 1945 Hồ Chí Minh leyó la Declaración de Independencia ante medio millón de ciudadanos, proclamando el nacimiento de la República Democrática de Vietnam.

Presidiendo la inmensa pradera de césped dividida en 240 cuadros verdes se alza el Mausoleo de granito gris y mármol rojo, inaugurado en 1975 e inspirado en el loto vietnamita. Aunque en su testamento el líder pidió ser incinerado y repartir sus cenizas entre el norte, centro y sur del país, el Estado decidió preservar su cuerpo embalsamado en un sarcófago de cristal custodiado por una guardia de honor inmaculada de uniforme blanco.

Pero el verdadero corazón íntimo de este recinto se esconde tras el mausoleo, entre estanques de carpas y árboles de mango: allí verás la humilde Casa sobre Pilotes de madera donde Hồ Chí Minh prefirió vivir en lugar del ostentoso Palacio Presidencial colonial amarillo, así como la milenaria Pagoda del Pilar Único que emerge del agua como una flor de loto.`,
    stops: [
      {
        number: 1,
        title: 'Explanada de Ba Đình y el Mausoleo de Granito',
        whatToLookAt: 'El pórtico de columnas cuadradas de mármol y la guardia de honor haciendo el cambio de turno.',
        story: 'Los materiales para su construcción fueron enviados por ciudadanos de todas las provincias de Vietnam: granito de Ngũ Hành Sơn, maderas preciosas del altiplano central y 250 especies de plantas en sus jardines.',
        insiderTip: 'Si vienes a las 06:00 de la mañana o a las 21:00 de la noche, podrás presenciar la solemne ceremonia militar de izado o arriado de la bandera nacional.',
        lat: 21.0369,
        lng: 105.8346,
      },
      {
        number: 2,
        title: 'El Palacio Presidencial y la Casa sobre Pilotes (Nhà Sàn)',
        whatToLookAt: 'El contraste entre el palacio colonial amarillo mostaza de 1906 y la sencilla cabaña de madera sobre un estanque.',
        story: 'Construido originalmente para el Gobernador General de la Indochina Francesa, Hồ Chí Minh rechazó habitar el palacio por considerarlo un símbolo colonial y mandó construir una casa tradicional de las etnias montañosas Tày-Thái con solo dos pequeñas habitaciones.',
        insiderTip: 'Asómate a la barandilla del estanque: dando tres palmadas verás acudir a las enormes carpas naranjas que nadan entre las raíces de los cipreses de agua.',
        lat: 21.0385,
        lng: 105.8342,
      },
      {
        number: 3,
        title: 'Pagoda del Pilar Único (Chùa Một Cột)',
        whatToLookAt: 'El diminuto templo de madera sostenido sobre un único pilar de piedra en medio de un estanque cuadrado de loto.',
        story: 'Fundada en 1049 por el emperador Lý Thái Tông, quien sin tener heredero soñó que la diosa de la misericordia Quan Âm le entregaba un hijo sentada sobre una flor de loto. Meses después nació el príncipe heredero y el rey ordenó construir la pagoda con la forma exacta de aquel sueño.',
        insiderTip: 'Rodea la escalinata de ladrillo antiguo y observa el árbol Bodhi trasero, regalo oficial de la India en 1958.',
        lat: 21.0359,
        lng: 105.8336,
      },
    ],
    photoSpot: {
      location: 'En la esquina del estanque cuadrado de la Pagoda del Pilar Único (Chùa Một Cột).',
      bestLight: 'Por la mañana entre las 08:00 y las 10:00, con luz limpia sobre el tejado curvo.',
      instruction: 'Encuadra el pilar central y el tejado con forma de pétalos de loto reflejados en el agua.',
    },
    culturalEtiquette: {
      dressCode: 'Estricto: pantalones o faldas por debajo de la rodilla y hombros cubiertos en todo el perímetro de seguridad.',
      whatNotToDo: 'Dentro del mausoleo está terminantemente prohibido hablar, meter las manos en los bolsillos, llevar gafas de sol o hacer fotografías.',
      scamWarning: 'El acceso a la plaza y los jardines tiene taquilla oficial muy económica (40.000 ₫ para jardines); no contrates guías no acreditados en la calle.',
    },
    streetFoodReward: {
      dishNameVi: 'Bánh Tôm Hồ Tây',
      dishNameEs: 'Tortitas crujientes de boniato rallado y camarones de agua dulce del Lago del Oeste con verduras frescas',
      whereToFind: 'Caminando 10 minutos hacia la orilla entre el Lago Trúc Bạch y el Lago Tây (calle Thanh Niên).',
      priceEstimate: '60.000 ₫ – 90.000 ₫',
    },
    suggestedQuestions: [
      '¿En qué meses del año cierra el interior del Mausoleo por mantenimiento?',
      '¿Qué coches históricos se conservan en el garaje junto a la Casa sobre Pilotes?',
      '¿Por qué las raíces de los árboles alrededor del estanque sobresalen verticalmente del suelo?',
    ],
  },

  // ===================== HUẾ =====================
  {
    placeName: 'Ciudadela Imperial de Huế (Đại Nội)',
    cityName: 'Huế',
    vietnameseName: 'Hoàng Thành Huế – Đại Nội',
    centerLat: 16.4698,
    centerLng: 107.5786,
    tagline: 'El trono de los trece emperadores Nguyễn, dragones de cinco garras y los secretos de la Ciudad Púrpura Prohibida.',
    durationMinutes: 55,
    audioGuideScript: `¡Saluda al corazón dinástico de Vietnam! Tras cruzar los fosos tapizados de flores de loto rosa y las formidables murallas abaluartadas de diez kilómetros de perímetro, entras al recinto sagrado de la dinastía Nguyễn, soberanos del país entre 1802 y 1945.

Este monumental complejo fue trazado por decenas de miles de obreros siguiendo la geomancia imperial: el Río del Perfume (Sông Hương) actúa como serpiente protectora al frente, los islotes de Cồn Hến y Dã Viên encarnan al dragón azul a la izquierda y al tigre blanco a la derecha, y el monte Ngự Bình sirve de pantalla real. En su centro más reservado se ocultaba la Tử Cấm Thành (Ciudad Púrpura Prohibida), donde solo el Hijo del Cielo, la Emperatriz Madre, las concubinas y los eunucos podían entrar.

Aunque la Ofensiva del Tết de 1968 destruyó decenas de pabellones, los palacios restaurados de madera de hierro lacada en rojo y el deslumbrante arte imperial del Khảm sành —mosaicos creados con miles de fragmentos de porcelana real rota— siguen brillando bajo el sol de Huế.`,
    stops: [
      {
        number: 1,
        title: 'Puerta del Mediodía (Ngọ Môn) y Pabellón de los Cinco Fénix',
        whatToLookAt: 'Los cinco accesos inferiores de piedra maciza y el pabellón superior de madera con tejas esmaltadas amarillas y verdes.',
        story: 'La puerta central solo se abría para el paso del Emperador. Desde esta galería superior, el 30 de agosto de 1945, el último emperador Bảo Đại leyó su abdicación y entregó el sello real de oro y la espada de jade.',
        insiderTip: 'Observa el color de las tejas: las amarillas cubrían la zona del Emperador y las verdes las de los mandarines acompañantes.',
        lat: 16.4678,
        lng: 107.5797,
      },
      {
        number: 2,
        title: 'Palacio de la Suprema Armonía (Điện Thái Hòa)',
        whatToLookAt: 'Las 80 columnas de madera lacada en bermellón con dragones dorados entre nubes y el Trono Imperial al fondo.',
        story: 'Escenario de las grandes audiencias imperiales los días 1 y 15 de cada mes lunar. Los mandarines de los 9 rangos se alineaban en el patio exterior junto a los hitos de piedra según su jerarquía civil o militar.',
        insiderTip: 'Cuenta las garras de los dragones en las columnas: tienen 5 garras, privilegio exclusivo del Emperador.',
        lat: 16.4689,
        lng: 107.5791,
      },
      {
        number: 3,
        title: 'Templo Ancestral Thế Miếu y las Nueve Urnas Dinásticas (Cửu Đỉnh)',
        whatToLookAt: 'Las nueve gigantescas urnas trípodes de bronce fundidas en 1835 alineadas frente al templo dinástico.',
        story: 'Cada urna pesa entre 1,9 y 2,6 toneladas y lleva grabados 17 relieves que catalogan las plantas, animales, ríos, armas y mares de Vietnam. La urna central (Cao Đỉnh), dedicada al fundador Gia Long, está adelantada 3 metros en señal de reverencia.',
        insiderTip: 'Cruza después hacia el Pabellón Hiển Lâm Các justo enfrente, la estructura más alta permitida dentro de la Ciudadela.',
        lat: 16.4685,
        lng: 107.5772,
      },
      {
        number: 4,
        title: 'Teatro Real Duyệt Thị Đường y Corredores Rojos',
        whatToLookAt: 'Los largos pasillos de madera roja (Hành Lang) y el teatro cubierto con techo pintado de constelaciones celestes.',
        story: 'Construido en 1826, es el teatro en activo más antiguo de Vietnam, donde la corte escuchaba el Nhã nhạc (música cortesana declarada Patrimonio Inmaterial por la UNESCO).',
        insiderTip: 'Los pasillos rojos que conectan con la Ciudad Prohibida tienen la mejor acústica y sombra para descansar del calor.',
        lat: 16.4706,
        lng: 107.5794,
      },
    ],
    photoSpot: {
      location: 'En los corredores lacados en rojo (Hành Lang) que rodean el patio de la Ciudad Prohibida.',
      bestLight: 'Entre las 08:00 y las 09:30, cuando los rayos oblicuos entran entre las columnas rojas.',
      instruction: 'Colócate en el centro del pasillo buscando una simetría perfecta de punto de fuga.',
    },
    culturalEtiquette: {
      dressCode: 'Obligatorio cubrir hombros y llevar pantalón o falda por debajo de la rodilla.',
      whatNotToDo: 'Está prohibido fotografiar el interior del salón del trono en Điện Thái Hòa o tocar las urnas de bronce.',
      scamWarning: 'Si tomas un ciclo (xích lô) o carrito eléctrico en el exterior, exige ver la tarifa oficial por escrito antes de subir.',
    },
    streetFoodReward: {
      dishNameVi: 'Bún Bò Huế & Bánh Khoái',
      dishNameEs: 'Sopa imperial de fideos gruesos con ternera, citronela y aceite de chile, más crepes crujientes rellenos',
      whereToFind: 'En los restaurantes tradicionales de la calle Đinh Tiên Hoàng (junto a la puerta Thượng Tứ).',
      priceEstimate: '40.000 ₫ – 60.000 ₫',
    },
    suggestedQuestions: [
      '¿Qué funciones cumplían los eunucos dentro de la Ciudad Púrpura Prohibida?',
      '¿Por qué la capital imperial se trasladó de Hanói a Huế en 1802?',
      '¿En qué consiste la gastronomía real (Cơm Cung Đình) de los emperadores?',
    ],
  },

  {
    placeName: 'Pagoda Thiên Mụ',
    cityName: 'Huế',
    vietnameseName: 'Chùa Thiên Mụ (Pagoda de la Dama Celestial)',
    centerLat: 16.4533,
    centerLng: 107.5448,
    tagline: 'La torre octogonal de siete pisos que vigila el Río del Perfume y el histórico Austin azul de 1963.',
    durationMinutes: 35,
    audioGuideScript: `¡Respira el aroma a pino y sándalo sobre la colina Hà Khê! Te encuentras en la Pagoda Thiên Mụ ("Pagoda de la Dama Celestial"), fundada en el año 1601 y considerada el símbolo espiritual más sagrado de la antigua capital imperial.

Cuenta la crónica real que los pescadores del Río del Perfume veían aparecer cada noche en la cima de este montículo a una anciana de cabellos blancos vestida con túnica roja y pantalones verdes. Ella profetizó que cuando llegara un verdadero soberano capaz de levantar aquí una pagoda, la vena del dragón de la tierra quedaría sellada y su dinastía reinaría por siglos. Al escuchar el relato, el señor feudal Nguyễn Hoàng ordenó alzar inmediatamente el templo.

Además de su misticismo ancestral, esta pagoda fue el epicentro de la resistencia pacífica budista en el siglo XX: en su patio trasero aún se conserva el automóvil celeste con el que el venerado monje Thích Quảng Đức partió hacia Saigón en junio de 1963.`,
    stops: [
      {
        number: 1,
        title: 'Torre Octogonal Phước Duyên de Siete Niveles',
        whatToLookAt: 'La estilizada torre de ladrillo rojizo de 21 metros de altura frente al embarcadero de barcos dragón.',
        story: 'Erigida en 1844 por el emperador Thiệu Trị para celebrar el 80 cumpleaños de su abuela real. Cada uno de los siete pisos decrecientes alberga una efigie de Buda que simboliza los siete pasos hacia la iluminación.',
        insiderTip: 'A su izquierda verás un pabellón con la gigantesca campana Đại Hồng Chung de 1710 (2.052 kg), cuyo tañido se oía a 10 km río abajo.',
        lat: 16.4530,
        lng: 107.5449,
      },
      {
        number: 2,
        title: 'Santuario Principal Đại Hùng Điện y los Guardianes Hộ Pháp',
        whatToLookAt: 'El Buda Maitreya sonriente de bronce en la entrada y las seis estatuas colosales de guardianes guerreros.',
        story: 'El santuario conserva una placa de bronce fundida en 1677 y poemas caligrafiados por los propios emperadores de la dinastía Nguyễn.',
        insiderTip: 'Descalzate antes de pisar la alfombra del santuario central y mantén silencio mientras los monjes novicios rezan.',
        lat: 16.4535,
        lng: 107.5447,
      },
      {
        number: 3,
        title: 'El Automóvil Austin Westminster de Thích Quảng Đức y el Pinar',
        whatToLookAt: 'El sedán Austin A95 azul pálido de 1956 conservado junto a la histórica fotografía de Malcolm Browne.',
        story: 'El 11 de junio de 1963, el abad Thích Quảng Đức bajó de este mismo coche en un cruce de Saigón y se inmoló en posición de loto sin emitir un solo quejido para protestar contra la persecución de los budistas.',
        insiderTip: 'Continúa hasta el final del jardín de bonsáis para ver la estela funeraria del maestro rodeada de pinos tranquilos.',
        lat: 16.4540,
        lng: 107.5445,
      },
    ],
    photoSpot: {
      location: 'En los escalones inferiores junto al muelle del Río del Perfume mirando hacia arriba.',
      bestLight: 'Al atardecer (17:00 - 17:45), cuando el sol se pone directamente sobre la curva del río.',
      instruction: 'Encuadra la torre Phước Duyên flanqueada por los cuatro pilares de piedra de la entrada.',
    },
    culturalEtiquette: {
      dressCode: 'Es un monasterio activo: hombros y rodillas cubiertos sin excepción.',
      whatNotToDo: 'En Vietnam existe la superstición de que las parejas de novios no deben hacerse selfies juntos frente a esta pagoda por una antigua leyenda de amor trágico.',
      scamWarning: 'La entrada a la pagoda es 100% gratuita; si llegas en barco dragón, acuerda si el precio incluye el regreso.',
    },
    streetFoodReward: {
      dishNameVi: 'Đậu Hũ Nóng Nước Gừng',
      dishNameEs: 'Cuajada de soja sedosa recién hecha servida templada con almíbar de caña y jengibre picado',
      whereToFind: 'En las vendedoras tradicionales sentadas al pie de la escalinata frente al río.',
      priceEstimate: '15.000 ₫ – 20.000 ₫ por cuenco',
    },
    suggestedQuestions: [
      '¿Cuál es la leyenda de la joven pareja que dio origen a la superstición de los enamorados en Thiên Mụ?',
      '¿Cómo es la rutina diaria de los monjes que viven en este monasterio?',
      '¿Por qué el Río del Perfume recibe ese nombre tan poético?',
    ],
  },

  {
    placeName: 'Tumba Imperial de Khải Định',
    cityName: 'Huế',
    vietnameseName: 'Lăng Khải Định (Ứng Lăng)',
    centerLat: 16.3989,
    centerLng: 107.5903,
    tagline: 'El palacio barroco de hormigón ennegrecido y porcelana rota donde oriente y occidente chocan con esplendor.',
    durationMinutes: 40,
    audioGuideScript: `¡Prepárate para el mausoleo más excéntrico, teatral y deslumbrante de todo Vietnam! Construida entre 1920 y 1931 en la ladera de la montaña Châu Chữ, la Tumba de Khải Định (Ứng Lăng) rompe con todos los esquemas de los jardines zen de los emperadores anteriores.

Khải Định, penúltimo monarca de la dinastía Nguyễn, quedó fascinado por la arquitectura europea tras su viaje a la Exposición Colonial de Marsella en 1922. Para financiar este monumento, subió un 30% los impuestos campesinos e importó cemento de Francia, hierro de Europa, pizarras de Ardoise y miles de cajas de porcelana fina de China y Japón.

Al subir los 127 escalones flanqueados por los mayores dragones de piedra de Vietnam, pasarás de un exterior dramático de hormigón ennegrecido a un salón interior que te dejará sin aliento: cada centímetro de pared y columna está recubierto de mosaicos de cerámica y cristal de colores, coronado por una estatua de bronce del emperador bañada en oro puro a tamaño real.`,
    stops: [
      {
        number: 1,
        title: 'Escalinata de los Dragones y Patio de Honor (Sân Chầu)',
        whatToLookAt: 'Las dos filas de guardias reales, mandarines, caballos y elefantes esculpidos en piedra a tamaño real.',
        story: 'A diferencia de otras tumbas donde las estatuas son simbólicas, aquí los rostros de los soldados vietnamitas fueron tallados con un realismo casi fotográfico, portando sables y uniformes de la época colonial.',
        insiderTip: 'En el centro del patio se levanta el pabellón octogonal con la estela de piedra redactada por su hijo, el último emperador Bảo Đại.',
        lat: 16.3988,
        lng: 107.5904,
      },
      {
        number: 2,
        title: 'Palacio Thiên Định y el Techo de los Nueve Dragones',
        whatToLookAt: 'Los murales tridimensionales hechos con fragmentos de tazas de porcelana y botellas de vidrio coloreado.',
        story: 'En el techo brilla "Cửu Long Ẩn Vân" (Nueve dragones ocultos entre las nubes), la mayor obra maestra pictórica de Vietnam, que el artista Phan Văn Tánh pintó usando tanto las manos como los pies mientras yacía boca arriba en un andamio.',
        insiderTip: 'Fíjate en los detalles de los mosaicos de pared: los artesanos usaron fondos de botellas de cerveza y platos de porcelana japonesa del siglo XIX.',
        lat: 16.3991,
        lng: 107.5906,
      },
      {
        number: 3,
        title: 'El Dosel de Hormigón de una Tonelada y la Estatua de Oro',
        whatToLookAt: 'La estatua sedente de bronce dorado bajo un baldaquino que parece tela de seda ondeando, pero es hormigón armado.',
        story: 'La estatua fue fundida en Marsella en 1920 a escala exacta (1,60 metros, la estatura real del monarca). Los restos mortales de Khải Định descansan 18 metros exactamente debajo del trono.',
        insiderTip: 'Mira hacia las colinas frontales desde la balaustrada superior: la cima cónica del frente actúa como el pincel geomántico de la tumba.',
        lat: 16.3993,
        lng: 107.5907,
      },
    ],
    photoSpot: {
      location: 'En el Patio de Honor entre las dos filas de mandarines de piedra mirando hacia el palacio superior.',
      bestLight: 'A primera hora (08:00) o a las 16:00 para resaltar las texturas de la piedra oscura.',
      instruction: 'Encuadra en perspectiva baja junto al primer caballo de piedra con el palacio al fondo.',
    },
    culturalEtiquette: {
      dressCode: 'Ropa respetuosa (hombros y rodillas cubiertos para acceder a la cripta imperial).',
      whatNotToDo: 'No arranques ni rasques los fragmentos de porcelana de los muros.',
      scamWarning: 'Si visitas también la Ciudadela y las tumbas de Minh Mạng o Tự Đức, compra el billete combinado oficial en taquilla para ahorrar un 25%.',
    },
    streetFoodReward: {
      dishNameVi: 'Bánh Lọc & Bánh Nậm Huế',
      dishNameEs: 'Empanadillas translúcidas de tapioca rellenas de gamba y panceta envueltas en hoja de plátano al vapor',
      whereToFind: 'En las casas tradicionales camino de regreso al centro de Huế (calle Lê Ngô Cát).',
      priceEstimate: '30.000 ₫ – 45.000 ₫ por bandeja',
    },
    suggestedQuestions: [
      '¿Cómo lograron que un dosel de hormigón de una tonelada parezca tela de seda flotando?',
      '¿Por qué el emperador Khải Định era tan impopular entre el pueblo pero dejó esta obra de arte?',
      '¿A qué profundidad exacta está enterrado el cuerpo del emperador?',
    ],
  },

  // ===================== HỘI AN =====================
  {
    placeName: 'Puente Japonés Cubierto (Chùa Cầu)',
    cityName: 'Hội An',
    vietnameseName: 'Chùa Cầu (Lai Viễn Kiều)',
    centerLat: 15.8771,
    centerLng: 108.3261,
    tagline: 'El puente-santuario del siglo XVI que clavó una espada mística sobre el monstruo marino Namazu.',
    durationMinutes: 35,
    audioGuideScript: `¡Bienvenido a la joya más venerada del antiguo puerto mercante de Faifo, hoy Hội An! Frente a ti se tiende Chùa Cầu, el legendario Puente Japonés Cubierto levantado en 1593 por la próspera comunidad de navegantes nipones para conectar su barrio con el barrio de los comerciantes chinos al otro lado del arroyo.

Según la cosmología compartida por marineros japoneses y vietnamitas, bajo la corteza terrestre dormía un colosal monstruo mítico llamado Namazu (o Con Cù): su cabeza descansaba en la India, su cola en Japón y su lomo justo bajo el canal de Hội An. Cada vez que la bestia se agitaba, desataba terremotos en Japón e inundaciones devastadoras en Vietnam. Por ello, este puente fue concebido como una espada sagrada clavada en el espinazo del monstruo para mantener la paz en los tres reinos.

Camina despacio sobre su tablazón de madera de hierro curvada: descubrirás por qué es el único puente del mundo que alberga un templo taoísta adosado en su costado norte y por qué su silueta preside el billete de 20.000 Dong.`,
    stops: [
      {
        number: 1,
        title: 'Los Guardianes Sagrados: Los Monos (Thần Hầu) y los Perros (Thần Khuyển)',
        whatToLookAt: 'Las parejas de esculturas de madera tallada que custodian las entradas oriental y occidental del puente.',
        story: 'Talladas en madera de jaca, conmemoran que las obras de construcción comenzaron en el Año del Mono (1593) y concluyeron en el Año del Perro (1595) del calendario lunar.',
        insiderTip: 'Observa las varillas de incienso frente a los pedestales: aún hoy los comerciantes locales piden aquí protección para sus negocios.',
        lat: 15.8771,
        lng: 108.3262,
      },
      {
        number: 2,
        title: 'Santuario Interior de Bắc Đế Trấn Vũ',
        whatToLookAt: 'El altar lateral sin Buda dedicado al Emperador del Norte y la placa dorada Lai Viễn Kiều.',
        story: 'A pesar de llamarse "Chùa" (Pagoda), aquí se venera a Trấn Vũ, dios taoísta protector de los navegantes y señor de las aguas. En 1719, el señor Nguyễn Phúc Chu le otorgó el título imperial de "Puente de los Amigos que Vienen de Lejos".',
        insiderTip: 'Mira las vigas superiores: el puente fue ensamblado con cajas y espigas de carpintería naval japonesa para flexionar durante los tifones sin romperse.',
        lat: 15.8771,
        lng: 108.3261,
      },
      {
        number: 3,
        title: 'El Canal Hoài y las Casas Amarillas de Nguyễn Thị Minh Khai',
        whatToLookAt: 'El reflejo de los arcos de piedra del puente sobre el canal y las fachadas color mostaza cubiertas de buganvillas.',
        story: 'Por este canal entraban los sampanes cargados de seda cruda, canela, madera de agar y cerámica que se exportaban a Nagasaki, Macao y Ámsterdam en el siglo XVII.',
        insiderTip: 'Al cruzar hacia el lado occidental entrarás en la calle Nguyễn Thị Minh Khai, mucho más tranquila y auténtica que el lado oriental.',
        lat: 15.8770,
        lng: 108.3258,
      },
    ],
    photoSpot: {
      location: 'Desde la pasarela peatonal situada a 25 metros al sur sobre el mismo canal.',
      bestLight: 'En la hora azul (17:45 - 18:15) cuando se iluminan los farolillos de seda.',
      instruction: 'Encuadra el puente completo junto a su reflejo en el agua calmada del canal.',
    },
    culturalEtiquette: {
      dressCode: 'Vestimenta respetuosa para entrar al pequeño altar interior.',
      whatNotToDo: 'No te sientes en las barandillas históricas de madera ni bloquees el paso estrecho con sesiones largas de fotos.',
      scamWarning: 'Si compras el bono oficial del Casco Antiguo de Hội An (120.000 ₫), guárdalo contigo: incluye 5 entradas a monumentos históricos como este puente y la Casa Tấn Ký.',
    },
    streetFoodReward: {
      dishNameVi: 'Cao Lầu & Nước Mót Hội An',
      dishNameEs: 'Fideos gruesos ahumados con cerdo char siu y hierbas frescas, acompañados de infusión fría de hierba limón y pétalo de loto',
      whereToFind: 'En la calle Trần Phú (a 3 minutos a pie del puente).',
      priceEstimate: '35.000 ₫ – 55.000 ₫',
    },
    suggestedQuestions: [
      '¿Por qué el puente aparece impreso en el billete de 20.000 Dong?',
      '¿Cómo ha sobrevivido la estructura de madera a las grandes inundaciones de Hội An?',
      '¿Por qué desapareció la comunidad japonesa de Hội An en el siglo XVII?',
    ],
  },

  {
    placeName: 'Casa Antigua Tan Ky',
    cityName: 'Hội An',
    vietnameseName: 'Nhà Cổ Tấn Ký (101 Nguyễn Thái Học)',
    centerLat: 15.8768,
    centerLng: 108.3283,
    tagline: 'Doscientos años de arquitectura mercantil sino-japonesa-vietnamita y las marcas históricas de las riadas.',
    durationMinutes: 30,
    audioGuideScript: `¡Bienvenido a la residencia mercantil mejor conservada de Vietnam! Construida en 1741 por un próspero comerciante de origen chino llamado Lê Công, la Casa Antigua Tấn Ký ("Tienda de la Prosperidad Progresiva") ha sido habitada de forma ininterrumpida por siete generaciones de la misma familia durante casi tres siglos.

Esta casa "tubo" es un prodigio de ingeniería climática y fusión cultural: no utiliza ni un solo clavo de hierro en su estructura. Sus vigas triples representan el Cielo, la Tierra y el Hombre (estilo japonés), sus poemas en nácar y techos en forma de caparazón de cangrejo siguen la simbología china, y sus tallas en madera de hierro de Kim Bồng son pura maestría vietnamita.

Además, su diseño tenía un propósito comercial vital: la puerta delantera da a la calle comercial Nguyễn Thái Học para vender a los clientes, mientras que la puerta trasera daba directamente al embarcadero del río Thu Bồn para descargar barcos de seda, especias y porcelana.`,
    stops: [
      {
        number: 1,
        title: 'El Salón Principal y los Ojos de la Puerta (Mắt Cửa)',
        whatToLookAt: 'Los dos medallones circulares de madera tallada sobre el dintel de la entrada y las columnas sin clavos.',
        story: 'Los "ojos de la puerta" (Mắt Cửa) son exclusivos de Hội An: vigilan quién entra con intenciones honestas y protegen la riqueza familiar. En el salón verás las marcas en la columna de piedra que señalan hasta dónde subió el agua en la histórica inundación de 1964.',
        insiderTip: 'Con un sistema de poleas en el techo, la familia sube todos los muebles de nácar a la planta alta en menos de media hora cuando el río se desborda en octubre.',
        lat: 15.8769,
        lng: 108.3283,
      },
      {
        number: 2,
        title: 'Los Paneles de los Cien Pájaros (Bách Điểu) en Nácar',
        whatToLookAt: 'Los cuatro cuadros verticales colgados en las columnas con caligrafía china hecha en concha de nácar iridiscente.',
        story: 'Observa de cerca cada trazo caligráfico: en realidad son cien pájaros en pleno vuelo (grullas, golondrinas, fénix) que al mirarse a cierta distancia forman un poema clásico sobre la armonía.',
        insiderTip: 'Pide ver la legendaria "Copa de Confucio" (Chén Khổng Tử): una taza antigua con sifón oculto que se vacía por completo si la llenas más del 80%, enseñando moderación contra la codicia.',
        lat: 15.8768,
        lng: 108.3283,
      },
      {
        number: 3,
        title: 'El Patio de Luz Central (Giếng Trời) y la Salida Fluvial',
        whatToLookAt: 'El patio abierto pavimentado con baldosas de piedra de Thanh Hóa y el balcón de madera tallada con hojas de vid.',
        story: 'Dado que las casas tubo de Hội An no tienen ventanas laterales, este pozo de cielo recoge el agua de lluvia (símbolo de fortuna en el Feng Shui), ventila toda la vivienda y deja escapar el humo del incienso.',
        insiderTip: 'Fíjate en los murciélagos tallados en las esquinas de las vigas: en chino "murciélago" (Phúc) suena igual que "felicidad y bendición".',
        lat: 15.8766,
        lng: 108.3283,
      },
    ],
    photoSpot: {
      location: 'En el patio interior de luz (Giếng Trời) mirando hacia el balcón de madera superior.',
      bestLight: 'Entre las 10:00 y las 14:00 cuando la luz natural cae vertical sobre el patio.',
      instruction: 'Captura el contraste de las maderas oscuras centenarias con las plantas verdes del pozo de luz.',
    },
    culturalEtiquette: {
      dressCode: 'Ropa cómoda y respetuosa; la planta superior sigue siendo la vivienda privada de los descendientes de la familia Lê.',
      whatNotToDo: 'No te sientes en las sillas antiguas de madera con incrustaciones de mármol y nácar.',
      scamWarning: 'Usa una de las casillas de tu entrada oficial del Casco Antiguo de Hội An para acceder.',
    },
    streetFoodReward: {
      dishNameVi: 'Bánh Bao Bánh Vạc (White Rose Dumplings)',
      dishNameEs: 'Empanadillas de arroz translúcidas moldeadas a mano como pétalos de rosa blanca rellenas de gamba especiada',
      whereToFind: 'En los restaurantes de la calle Nguyễn Thái Học o en el taller White Rose (533 Hai Bà Trưng).',
      priceEstimate: '50.000 ₫ – 70.000 ₫ por plato',
    },
    suggestedQuestions: [
      '¿Cómo funciona el truco físico de la Copa de Confucio que guardan en la casa?',
      '¿Qué nivel alcanzó el agua dentro del salón durante la gran inundación de 1964?',
      '¿Por qué hay uvas europeas talladas en las vigas de una casa asiática del siglo XVIII?',
    ],
  },

  {
    placeName: 'Mercado de Farolillos',
    cityName: 'Hội An',
    vietnameseName: 'Chợ Đêm Nguyễn Hoàng & Sông Hoài',
    centerLat: 15.8758,
    centerLng: 108.3292,
    tagline: 'El hipnótico laberinto nocturno de miles de linternas de seda, barcas de madera y velas de deseos en el río Hoài.',
    durationMinutes: 35,
    audioGuideScript: `¡Deja que tus ojos se llenen de luz y color! Al cruzar el puente An Hội hacia la isla de An Hội, entras en el epicentro mágico de las noches de Vietnam: el Mercado de Farolillos de la calle Nguyễn Hoàng y la ribera iluminada del río Hoài.

La tradición de los farolillos de Hội An nació a finales del siglo XVI cuando los comerciantes chinos y japoneses colgaron linternas de seda frente a sus portales para recordar su tierra natal y atraer la buena fortuna. Con los siglos, los artesanos locales perfeccionaron una técnica propia: armazones de bambú viejo sumergido durante diez días en agua salada para que ninguna termita pueda atacarlo, recubiertos con seda tejida en las aldeas cercanas de Duy Xuyên.

Cada forma tiene un significado: el farolillo redondo de ajo simboliza la plenitud familiar, el de diamante atrae la riqueza y el de loto purifica el espíritu. Y en las noches de luna llena (día 14 del mes lunar), toda la ciudad apaga sus bombillas eléctricas para iluminarse únicamente con velas y seda.`,
    stops: [
      {
        number: 1,
        title: 'Puente de las Luces An Hội y las Velas Flotantes (Hoa Đăng)',
        whatToLookAt: 'Las barcas de remo iluminadas sobre el río Hoài y las pequeñas flores de papel con velas flotando en la corriente.',
        story: 'Soltar una vela de papel (Hoa Đăng) sobre el agua con la mano izquierda pidiendo paz y salud es un antiguo ritual budista para honrar a los espíritus del río.',
        insiderTip: 'El precio justo de una vela de papel es de 10.000 ₫ a 20.000 ₫, y el paseo oficial en barca de remo tiene taquilla con precio fijo (150.000 ₫ para 1-3 personas).',
        lat: 15.8763,
        lng: 108.3275,
      },
      {
        number: 2,
        title: 'Los Puestos de Seda e Iluminación de la Calle Nguyễn Hoàng',
        whatToLookAt: 'Los arcos semicirculares repletos de cientos de farolillos encendidos en tonos carmesí, índigo, esmeralda y oro.',
        story: 'Los farolillos auténticos de Hội An llevan un mecanismo plegable tipo paraguas que permite cerrarlos completamente planos para meterlos en la maleta sin que se deforme el bambú.',
        insiderTip: 'Si quieres hacerte una foto dentro de uno de los puestos de farolillos sin comprar ninguno, los dueños suelen pedir una pequeña colaboración de 10.000 ₫ – 20.000 ₫ con mucha amabilidad.',
        lat: 15.8755,
        lng: 108.3271,
      },
      {
        number: 3,
        title: 'El Canto Tradicional Bài Chòi junto a la Ribera',
        whatToLookAt: 'Los pabellones de bambú junto a la rotonda del puente donde cantantes con trajes tradicionales cantan versos rimados con música en vivo.',
        story: 'El Bài Chòi es un juego musical folclórico del centro de Vietnam (Patrimonio de la UNESCO) que combina poesía improvisada, humor y cartas de madera pintadas.',
        insiderTip: 'Se celebra todas las tardes a partir de las 19:00 junto al puente An Hội; puedes sentarte en una silla de bambú y participar por solo 20.000 ₫.',
        lat: 15.8765,
        lng: 108.3280,
      },
    ],
    photoSpot: {
      location: 'En mitad del puente An Hội mirando hacia la hilera de barcas iluminadas en el río.',
      bestLight: 'Entre las 18:15 y las 19:30, cuando aún queda un rastro azul en el cielo y todos los farolillos brillan.',
      instruction: 'Acércate a un puesto de farolillos para que su luz cálida ilumine los rostros en modo retrato sin usar flash.',
    },
    culturalEtiquette: {
      dressCode: 'Ropa fresca y cómoda para pasear junto al río.',
      whatNotToDo: 'No entres dentro de los puestos de farolillos empujando ni toques la seda con las manos manchadas de comida callejera.',
      scamWarning: 'Compra el ticket de las barcas de farolillos en la caseta oficial junto al puente para pagar la tarifa regulada.',
    },
    streetFoodReward: {
      dishNameVi: 'Bánh Xoài & Bánh Mì Phượng / Madam Khánh',
      dishNameEs: 'Pastelito dulce de arroz glutinoso relleno de cacahuete y sésamo, más el legendario bocadillo crujiente de Hội An',
      whereToFind: 'En el mercado nocturno Nguyễn Hoàng y en la calle Phan Chu Trinh.',
      priceEstimate: '15.000 ₫ – 35.000 ₫',
    },
    suggestedQuestions: [
      '¿Cómo se pliega un farolillo de bambú y seda para llevarlo en el avión?',
      '¿Qué noches del año se celebra el Festival de la Luna Llena en Hội An?',
      '¿Por qué sumergen el bambú en agua con sal antes de fabricar los farolillos?',
    ],
  },

  // ===================== ĐÀ NẴNG =====================
  {
    placeName: 'Puente del Dragón (Cầu Rồng)',
    cityName: 'Đà Nẵng',
    vietnameseName: 'Cầu Rồng Đà Nẵng',
    centerLat: 16.0611,
    centerLng: 108.2275,
    tagline: 'El coloso de acero dorado de 666 metros que escupe fuego real y agua sobre el río Hàn.',
    durationMinutes: 35,
    audioGuideScript: `¡Estás ante el icono de la modernidad y la ambición de Đà Nẵng! Inaugurado el 29 de marzo de 2013 para conmemorar el 38º aniversario de la ciudad, el Puente del Dragón (Cầu Rồng) es una proeza de ingeniería de 666 metros de longitud y más de 9.000 toneladas de acero que cruza las aguas del río Hàn rumbo a la playa de Mỹ Khê.

Su silueta ondulante no es casual: reproduce la figura del Dragón Dorado de la dinastía Lý del siglo XI, símbolo de nobleza, prosperidad y despegue hacia el Mar del Este. Por la noche, más de 2.500 luces LED inteligentes hacen que las escamas del puente cambien gradualmente de dorado imperial a azul zafiro, verde esmeralda y rojo rubí.

Pero el momento culminante llega cada viernes, sábado y domingo a las 21:00 en punto: el tráfico se corta por completo, la boca del dragón ruge y lanza nueve imponentes llamaradas de fuego real hacia el cielo nocturno, seguidas de tres ráfagas de vapor de agua pulverizada que bendicen a la multitud.`,
    stops: [
      {
        number: 1,
        title: 'La Cabeza del Dragón que Escupe Fuego (Orilla Oriental)',
        whatToLookAt: 'La monumental cabeza de acero amarillo de 18 metros con forma de corazón ardiente en la mandíbula.',
        story: 'El sistema pirotécnico interior consume gasóleo presurizado para proyectar bolas de fuego de hasta 10 metros de alcance sin humo negro, seguido de 1.800 litros de agua a presión.',
        insiderTip: 'Si vas a ver el espectáculo de las 21:00 (viernes, sábado o domingo), colócate a 30 metros de la cabeza si no quieres terminar empapado en la fase de agua final.',
        lat: 16.0612,
        lng: 108.2291,
      },
      {
        number: 2,
        title: 'El Puente del Amor (Cầu Tình Yêu) y el Dragón-Carpa (Cá Chép Hóa Rồng)',
        whatToLookAt: 'La estatua de mármol blanco de una carpa con cabeza de dragón escupiendo agua junto al muelle iluminado con faroles de corazones rojos.',
        story: 'Inspirada en la leyenda vietnamita de la carpa que supera las cascadas para convertirse en dragón, esta estatua de 200 toneladas fue tallada en los talleres tradicionales de Non Nước.',
        insiderTip: 'Es el paseo peatonal más agradable de Đà Nẵng con brisa fresca del río y cafeterías frente al skyline iluminado.',
        lat: 16.0626,
        lng: 108.2298,
      },
      {
        number: 3,
        title: 'Mercado Nocturno Sơn Trà (Chợ Đêm Sơn Trà)',
        whatToLookAt: 'Las calles peatonales repletas de parrillas de langosta, pulpo a la brasa y batidos de frutas tropicales.',
        story: 'Situado justo a los pies de la cola y la cabeza oriental del puente, reúne la cultura marinera de Đà Nẵng cada noche de 18:00 a 24:00.',
        insiderTip: 'Pregunta siempre el precio por peso o por bandeja antes de que pongan el marisco en la parrilla.',
        lat: 16.0605,
        lng: 108.2312,
      },
    ],
    photoSpot: {
      location: 'Desde el muelle del Puente del Amor (Cầu Tình Yêu) mirando en diagonal hacia la cabeza del dragón.',
      bestLight: 'Entre las 20:30 y las 21:10 con las luces LED reflejadas en el río Hàn.',
      instruction: 'Dispara en ráfaga justo cuando la boca del dragón se ilumina en naranja antes de lanzar la llamarada.',
    },
    culturalEtiquette: {
      dressCode: 'Ropa fresca; lleva funda impermeable para el móvil si te sitúas justo debajo de la cabeza a las 21:00.',
      whatNotToDo: 'No invadas los carriles centrales de vehículos antes de que la policía municipal cierre las barreras a las 20:50.',
      scamWarning: 'Los cruceros nocturnos por el río Hàn se contratan en la taquilla oficial del puerto fluvial de Bạch Đằng.',
    },
    streetFoodReward: {
      dishNameVi: 'Bánh Tráng Cuốn Thịt Heo & Hải Sản Nướng',
      dishNameEs: 'Rollos de papel de arroz con panceta cocida en dos texturas, hierbas aromáticas y salsa mắm nêm de anchoa y piña',
      whereToFind: 'En el Mercado Nocturno Sơn Trà o en la calle Trần Phú al otro lado del puente.',
      priceEstimate: '60.000 ₫ – 120.000 ₫',
    },
    suggestedQuestions: [
      '¿Qué días y a qué hora exacta lanza fuego y agua el Puente del Dragón?',
      '¿Por qué el puente mide exactamente 666 metros de longitud?',
      '¿Cuántos puentes emblemáticos cruzan el río Hàn en Đà Nẵng?',
    ],
  },

  {
    placeName: 'Montañas de Mármol (Ngũ Hành Sơn)',
    cityName: 'Đà Nẵng',
    vietnameseName: 'Ngũ Hành Sơn Đà Nẵng',
    centerLat: 16.0034,
    centerLng: 108.2638,
    tagline: 'Cinco colinas kársticas de los cinco elementos con cavernas iluminadas por rayos solares cenitales.',
    durationMinutes: 45,
    audioGuideScript: `¡Siente la energía telúrica de las Montañas de Mármol! Este archipiélago de cinco colinas de caliza y mármol que emerge entre la llanura costera y el mar de Đà Nẵng fue bautizado en el siglo XIX por el emperador Minh Mạng con el nombre de los cinco elementos del cosmos oriental: Kim (Metal), Mộc (Madera), Thủy (Agua), Hỏa (Fuego) y Thổ (Tierra).

Según la leyenda del pueblo Cham, un dragón marino emergió de las olas y depositó en la arena un huevo gigante. Mil días después, el huevo se abrió dando a luz a una doncella celestial, mientras que los cinco fragmentos de su cáscara crecieron hasta convertirse en estas cinco montañas místicas.

Hoy recorreremos Thủy Sơn (la Montaña del Agua), la mayor y más sagrada: un laberinto vertical de pagodas del siglo XVII, portales de piedra cubiertos de musgo y la sobrecogedora cueva Huyền Không, cuya bóveda natural perforada deja caer columnas de luz solar sobre las nubes de incienso.`,
    stops: [
      {
        number: 1,
        title: 'Torre Xá Lợi y Pagoda Tam Thai',
        whatToLookAt: 'La estupa hexagonal de siete pisos con 200 estatuas de piedra y la puerta de tres arcos de la Pagoda Tam Thai (1630).',
        story: 'El emperador Minh Mạng visitó varias veces esta montaña y mandó construir caminos de piedra; aún se conserva el medallón de bronce en forma de corazón de fuego que regaló a los monjes.',
        insiderTip: 'Puedes subir en el ascensor panorámico de cristal por el lado este (15.000 ₫) y bajar caminando por la escalinata antigua de 156 peldaños.',
        lat: 16.0029,
        lng: 108.2643,
      },
      {
        number: 2,
        title: 'Cueva Huyền Không y los Haces de Luz Divina',
        whatToLookAt: 'La inmensa cámara subterránea a cielo semiabierto con el gran Buda tallado en la pared de roca a 5 metros de altura.',
        story: 'Cinco aberturas en la cúpula de roca permiten que el sol entre como focos teatrales. Durante la guerra, las fuerzas guerrilleras usaron los recovecos de esta cueva como hospital secreto.',
        insiderTip: 'En la entrada de la cueva, fíjate en los dos guardianes del bien y del mal y en las formaciones estalactíticas con forma de grulla.',
        lat: 16.0041,
        lng: 108.2634,
      },
      {
        number: 3,
        title: 'Mirador Vọng Giang Đài y Cueva Âm Phủ',
        whatToLookAt: 'El mirador hacia las otras cuatro montañas de los elementos y la costa de Non Nước.',
        story: 'En la base de la montaña se encuentra también la Cueva Âm Phủ, que recrea los nueve niveles del juicio kármico budista y el puente hacia la iluminación.',
        insiderTip: 'Lleva agua fresca contigo; la brisa en el mirador superior Vọng Hải Đài es el mejor premio tras subir las escaleras de roca.',
        lat: 16.0038,
        lng: 108.2629,
      },
    ],
    photoSpot: {
      location: 'En el centro de la Cueva Huyền Không mirando hacia la estatua de Buda y las aberturas del techo.',
      bestLight: 'Entre las 11:00 y las 13:00, cuando el sol está en el cenit y dibuja rayos diagonales sobre el humo del incienso.',
      instruction: 'Baja ligeramente la exposición en tu cámara para destacar los haces de luz contra la pared oscura de la cueva.',
    },
    culturalEtiquette: {
      dressCode: 'Calzado cerrado con suela antideslizante (el mármol húmedo resbala) y ropa que cubra hombros y rodillas.',
      whatNotToDo: 'No subas en chanclas lisas a los picos de roca superiores ni toques los altares dentro de las cuevas.',
      scamWarning: 'Las tiendas de mármol al pie del ascensor cobran precios turísticos; no te sientas obligado a entrar a ninguna tienda para salir del recinto.',
    },
    streetFoodReward: {
      dishNameVi: 'Mì Quảng Ếch / Tôm Thịt',
      dishNameEs: 'Fideos de arroz amarillos a la cúrcuma con gambas, cerdo, huevo de codorniz, cacahuetes y galleta de arroz negra tostada',
      whereToFind: 'En la calle Huyền Trân Công Chúa o Lê Văn Hiến junto a la base de la montaña.',
      priceEstimate: '35.000 ₫ – 50.000 ₫',
    },
    suggestedQuestions: [
      '¿Por qué ya está prohibido extraer mármol de estas cinco montañas?',
      '¿Qué representa cada uno de los cinco elementos en la cosmología vietnamita?',
      '¿Cuál es la historia de los talleres de escultura de la aldea Non Nước?',
    ],
  },

  {
    placeName: 'Pagoda Linh Ứng (Son Tra)',
    cityName: 'Đà Nẵng',
    vietnameseName: 'Chùa Linh Ứng Bãi Bụt – Sơn Trà (Lady Buddha)',
    centerLat: 16.1003,
    centerLng: 108.2776,
    tagline: 'La imponente Dama Buda blanca de 67 metros que protege a los pescadores desde la Península de Sơn Trà.',
    durationMinutes: 40,
    audioGuideScript: `¡Alza la vista hacia el cielo azul de la Península de Sơn Trà! Estás en la Pagoda Linh Ứng Bãi Bụt ("El lugar donde Buda apareció en medio del mundo humano"), custodiada por la estatua de Quan Âm (Lady Buddha) más alta de todo Vietnam: 67 metros de blancura inmaculada, equivalente a un edificio de 30 plantas, erguida sobre un pedestal de loto de 35 metros de diámetro.

Cuenta la tradición de los pescadores de Đà Nẵng que en el siglo XIX apareció flotando en la orilla de esta bahía una estatua de Buda sin que nadie supiera de dónde venía. Los aldeanos le levantaron un pequeño altar y, desde aquel día, las aguas turbulentas se calmaron y los barcos regresaron siempre a salvo.

Hoy, los pescadores miran hacia el manto blanco de esta colosal bodhisattva de la compasión desde kilómetros mar adentro: con una mano hace el mudra de la paz y con la otra sostiene un jarrón de néctar sagrado que, según la fe local, desvía los tifones que se acercan a la costa central de Vietnam.`,
    stops: [
      {
        number: 1,
        title: 'La Estatua Colosal de Quan Âm (Lady Buddha de 67 metros)',
        whatToLookAt: 'La estatua blanca mirando al mar con un Buda de 2 metros en su tocado y 17 pisos de altares en su interior.',
        story: 'Inaugurada en 2010 tras seis años de escultura, en varias ocasiones durante su finalización apareció un halo solar arcoíris completo rodeando su cabeza ante miles de testigos.',
        insiderTip: 'Camina hasta la barandilla del mirador frontal para disfrutar de la panorámica completa de los 10 kilómetros de bahía de Đà Nẵng.',
        lat: 16.0996,
        lng: 108.2778,
      },
      {
        number: 2,
        title: 'El Patio de los 18 Arhats de Mármol Blanco y los Bonsáis',
        whatToLookAt: 'Las 18 esculturas de mármol monolítico alineadas a ambos lados de la explanada principal.',
        story: 'Cada Arhat (discípulo iluminado de Buda) fue tallado por los maestros de Non Nước con una emoción humana diferente: alegría, ira, meditación, amor o serenidad.',
        insiderTip: 'Vigila tus gafas, gorras y bolsas de comida: por los jardines bajan a menudo macacos salvajes de la selva de Sơn Trà.',
        lat: 16.1003,
        lng: 108.2774,
      },
      {
        number: 3,
        title: 'Santuario Principal y Estupa Xá Lợi de Nueve Pisos',
        whatToLookAt: 'El tejado curvo con dragones gemelos flanqueando la rueda del Dharma.',
        story: 'Esta pagoda forma junto con la de las Montañas de Mármol y la de Bà Nà Hills el "Triángulo Espiritual" que protege la ciudad de Đà Nẵng.',
        insiderTip: 'La visita y el aparcamiento son gratuitos (solo hay una caja de donación voluntaria para el aceite de las lámparas).',
        lat: 16.1008,
        lng: 108.2771,
      },
    ],
    photoSpot: {
      location: 'Al pie de la escalinata del patio de los Arhats encuadrando a Lady Buddha junto a los pinos bonsái.',
      bestLight: 'Al amanecer (06:00) sobre el mar o a las 16:30 cuando la luz cálida ilumina el rostro de la estatua.',
      instruction: 'Usa las puertas de tres arcos (Tam Quan) como marco arquitectónico natural con el mar de fondo.',
    },
    culturalEtiquette: {
      dressCode: 'Hombros y rodillas cubiertos obligatoriamente (en la entrada prestan pareos largos gratuitamente si llevas pantalón corto).',
      whatNotToDo: 'Nunca des de comer ni te acerques demasiado a los monos salvajes de la península.',
      scamWarning: 'Si vienes en moto alquilada, revisa bien los frenos para la bajada de las cuestas de Sơn Trà.',
    },
    streetFoodReward: {
      dishNameVi: 'Gỏi Cá Nam Ô & Dừa Xiêm Lạnh',
      dishNameEs: 'Coco fresco helado en la costa y ensalada marinera tradicional con pescado fresco marinado en galanga y sésamo',
      whereToFind: 'En los restaurantes costeros de la avenida Hoàng Sa bajando hacia la playa de Mỹ Khê.',
      priceEstimate: '25.000 ₫ (coco) – 90.000 ₫ (plato marinero)',
    },
    suggestedQuestions: [
      '¿Cuáles son las tres pagodas llamadas Linh Ứng que forman el triángulo protector de Đà Nẵng?',
      '¿Qué representa el pequeño Buda que lleva la estatua sobre su corona?',
      '¿Se puede ver al raro langur de patas rojas en la selva de Sơn Trà?',
    ],
  },

  // ===================== NINH BÌNH =====================
  {
    placeName: 'Complejo Paisajístico de Tràng An',
    cityName: 'Ninh Bình',
    vietnameseName: 'Quần thể Danh thắng Tràng An',
    centerLat: 20.2506,
    centerLng: 105.9169,
    tagline: 'La Bahía de Hạ Long en tierra firme: grutas fluviales bajo montañas kársticas y templos de hace mil años.',
    durationMinutes: 50,
    audioGuideScript: `¡Sube a bordo de tu sampán de remo y déjate deslizar por el agua cristalina de Tràng An! Declarado Patrimonio Mixto (Cultural y Natural) de la Humanidad por la UNESCO, este laberinto de torres de piedra caliza de 250 millones de años de antigüedad fue la fortaleza natural indestructible que protegió a la primera capital imperial de Vietnam en el siglo X: Hoa Lư.

Mientras las remeras locales impulsan la barca en absoluto silencio entre nenúfares y paredes verticales tapizadas de selva virgen, atravesarás cuevas inundadas de hasta un kilómetro de longitud donde el techo de estalactitas roza tu cabeza, abriéndose de pronto a valles cerrados (thung) donde solo se escucha el canto de las aves acuáticas.

A lo largo de la travesía fluvial emergen del agua pagodas y templos milenarios con tejados de piedra gris, levantados para honrar a los reyes Đinh y Tiền Lê y a los generales leales que defendieron estos desfiladeros frente a los ejércitos del norte.`,
    stops: [
      {
        number: 1,
        title: 'Embarcadero de Tràng An y Templo Trình (Đền Trình)',
        whatToLookAt: 'El templo de piedra de mil años de antigüedad flanqueado por dos colosales peces de roca a los pies del acantilado.',
        story: '"Trình" significa "presentarse con respeto": aquí los viajeros y mandarines pedían permiso a los dos generales de la dinastía Đinh que custodiaban la corte antes de adentrarse en los valles interiores.',
        insiderTip: 'Al comprar el ticket (250.000 ₫ con barca incluida), te recomendamos elegir la Ruta 2 o la Ruta 3: son las más completas y escénicas.',
        lat: 20.2541,
        lng: 105.9165,
      },
      {
        number: 2,
        title: 'La Cueva de un Kilómetro (Hang Địa Linh / Hang Đại) y las Grutas Sumergidas',
        whatToLookAt: 'Las formaciones de calcita brillante y el reflejo esmeralda del agua en la boca de las cuevas.',
        story: 'El agua del río Sao Khê ha excavado durante milenios 48 cuevas transfronterizas que comunican los valles cerrados como pasadizos secretos.',
        insiderTip: 'Agacha bien la cabeza cuando la barquera avise ("Cúi đầu xuống!"): hay tramos donde la roca pasa a pocos centímetros.',
        lat: 20.2485,
        lng: 105.9082,
      },
      {
        number: 3,
        title: 'Templo Suối Tiên y el Pabellón Flotante Vũ Lâm (Hành Cung Vũ Lâm)',
        whatToLookAt: 'El pabellón hexagonal de madera que parece flotar en mitad del lago rodeado de picos verticales.',
        story: 'En el siglo XIII, los reyes de la dinastía Trần establecieron aquí el cuartel general secreto de Vũ Lâm para reorganizar sus tropas y derrotar a las hordas mongolas de Kublai Khan.',
        insiderTip: 'Es la parada más fotogénica del recorrido en barca; puedes desembarcar 20 minutos para caminar por los puentes de piedra.',
        lat: 20.2442,
        lng: 105.9034,
      },
    ],
    photoSpot: {
      location: 'En la pasarela de piedra frente al pabellón octogonal sobre el agua en Hành Cung Vũ Lâm.',
      bestLight: 'A primera hora de la mañana (07:30 - 09:00) con bruma suave entre las montañas kársticas.',
      instruction: 'Siéntate en la proa de la barca de madera para que un compañero te fotografíe entrando a la boca de una cueva.',
    },
    culturalEtiquette: {
      dressCode: 'Es obligatorio llevar puesto el chaleco salvavidas naranja mientras la barca está en movimiento.',
      whatNotToDo: 'No te pongas de pie bruscamente en el sampán ni toques las estalactitas del techo de las cuevas.',
      scamWarning: 'Tràng An está muy bien organizado y libre de presiones comerciales; una propina voluntaria de 50.000 ₫ por barca tras 3 horas remando es muy agradecida.',
    },
    streetFoodReward: {
      dishNameVi: 'Thịt Dê Núi Ninh Bình & Cơm Cháy',
      dishNameEs: 'Carne de cabra de montaña al vapor con hierba limón y jengibre acompañada de corteza de arroz crujiente dorada',
      whereToFind: 'En los restaurantes familiares de la carretera Tràng An - Hoa Lư al terminar el paseo en barca.',
      priceEstimate: '120.000 ₫ – 180.000 ₫ por plato para compartir',
    },
    suggestedQuestions: [
      '¿Qué diferencia hay entre las Rutas 1, 2 y 3 de las barcas de Tràng An?',
      '¿Por qué las cabras de las montañas de Ninh Bình tienen una carne tan apreciada?',
      '¿Dónde se rodó la película Kong: Skull Island dentro de este parque?',
    ],
  },

  {
    placeName: 'Cueva y Mirador de Hang Múa',
    cityName: 'Ninh Bình',
    vietnameseName: 'Hang Múa – Đỉnh Ngọa Long (Pico del Dragón Yacente)',
    centerLat: 20.2314,
    centerLng: 105.9369,
    tagline: 'Los 486 escalones de piedra blanca hasta el dragón de la cima con la vista aérea más épica de Tam Cốc.',
    durationMinutes: 45,
    audioGuideScript: `¡Prepara tus piernas para conquistar el techo panorámico de Ninh Bình! Estás a los pies del Monte Ngọa Long ("Montaña del Dragón Yacente") y la Cueva de Hang Múa ("Cueva de la Danza"). Según las crónicas antiguas, cuando el rey Trần Thái Tông se retiró a estas montañas en el siglo XIII, solía acudir en barca a la amplia caverna de la base para contemplar las danzas reales y la música cortesana de sus bailarinas, dando origen al nombre Hang Múa.

Desde la base rodeada de enormes estanques de flores de loto parte una escalinata monumental de 486 peldaños de piedra caliza tallada que serpentea por la cresta afilada de la montaña como una pequeña Muralla China. En el camino se bifurca en dos cimas: a la derecha la torre estupa budista y a la izquierda el legendario Dragón de Piedra que custodia el horizonte.

Al alcanzar la cumbre, la recompensa te corta la respiración: bajo tus pies se extiende el río Ngô Đồng serpenteando entre campos de arroz dorado y decenas de agujas kársticas donde las diminutas barcas de Tam Cốc parecen hojas flotando en un cuadro de tinta.`,
    stops: [
      {
        number: 1,
        title: 'Pasarela de Madera sobre el Gran Estanque de Lotos y Cueva del Tigre',
        whatToLookAt: 'El camino en zigzag de madera sobre las hectáreas de hojas y flores de loto rosas al pie del acantilado.',
        story: 'A diferencia del loto de verano convencional, aquí cultivan también variedades de loto japonés que florecen durante gran parte del año.',
        insiderTip: 'Cruza primero por la Cueva Múa en la base de la roca para refrescarte antes de iniciar el ascenso por las escaleras.',
        lat: 20.2305,
        lng: 105.9372,
      },
      {
        number: 2,
        title: 'Bifurcación de la Escalinata y la Torre Estupa (Cima Derecha)',
        whatToLookAt: 'La pequeña torre en forma de vasija budista en el pico menor con vistas a los arrozales.',
        story: 'Los peldaños están flanqueados por barandillas esculpidas con fénix y dragones de la era Trần.',
        insiderTip: 'Este pico derecho tiene mucha menos cola que el pico del dragón y ofrece un ángulo espectacular para fotografiar la cresta principal.',
        lat: 20.2317,
        lng: 105.9368,
      },
      {
        number: 3,
        title: 'La Cresta del Dragón de Piedra (Đỉnh Ngọa Long) sobre el Río Ngô Đồng',
        whatToLookAt: 'La escultura del dragón ondulando por las rocas puntiagudas de la cima y el cañón fluvial de Tam Cốc abajo.',
        story: 'El dragón mira hacia el antiguo palacio real de Hoa Lư, protegiendo las tierras fértiles del delta del Río Rojo.',
        insiderTip: 'Los últimos 20 metros junto a la cabeza del dragón son de roca caliza afilada: sujétate con ambas manos y nunca trepes al lomo de la escultura.',
        lat: 20.2321,
        lng: 105.9361,
      },
    ],
    photoSpot: {
      location: 'Desde la cima de la estupa derecha apuntando hacia el pico del Dragón con el río de Tam Cốc al fondo.',
      bestLight: 'Al amanecer (06:30) o durante la puesta de sol (16:45 - 17:45) cuando el valle se tiñe de ámbar.',
      instruction: 'Utiliza un encuadre abierto que muestre tanto la escalinata en la arista como las barcas en el río abajo.',
    },
    culturalEtiquette: {
      dressCode: 'Zapatillas deportivas con suela firme; lleva una botella de agua para los 486 escalones desiguales.',
      whatNotToDo: 'Por tu seguridad, jamás te subas encima de la cabeza o el cuerpo del dragón de piedra al borde del precipicio.',
      scamWarning: 'Al llegar con moto o bicicleta, sigue recto hasta la taquilla oficial del recinto (aparcamiento 10.000 ₫); ignora a quienes en la carretera te hagan señas con silbatos para entrar a parkings privados caros.',
    },
    streetFoodReward: {
      dishNameVi: 'Nước Mía Đá & Miến Lươn Ninh Bình',
      dishNameEs: 'Jugo helado de caña de azúcar recién exprimido y sopa de fideos de cristal con anguila crujiente',
      whereToFind: 'En las terrazas frente al estanque de lotos al bajar de la montaña.',
      priceEstimate: '20.000 ₫ (jugo) – 50.000 ₫ (sopa)',
    },
    suggestedQuestions: [
      '¿En qué mes del año están los campos de arroz de Tam Cốc completamente amarillos?',
      '¿Cuánto tiempo se tarda en subir los 486 escalones a ritmo tranquilo?',
      '¿Por qué los barqueros del río que se ve abajo reman con los pies?',
    ],
  },

  {
    placeName: 'Tam Cốc - Bích Động',
    cityName: 'Ninh Bình',
    vietnameseName: 'Tam Cốc – Chùa Bích Động',
    centerLat: 20.2156,
    centerLng: 105.9372,
    tagline: 'El río que serpentea entre arrozales dorados donde los barqueros reman con los pies y la Pagoda de Jade.',
    durationMinutes: 45,
    audioGuideScript: `¡Bienvenido al paisaje fluvial más poético del norte de Vietnam! Tam Cốc significa literalmente "Las Tres Cuevas" (Hang Cả, Hang Hai y Hang Ba), labradas a lo largo de millones de años por el suave curso del río Ngô Đồng al atravesar el corazón mismo de tres montañas de roca caliza sin que exista ningún camino terrestre paralelo.

Lo primero que te sorprenderá al embarcar en el muelle de Đình Các es la destreza única de sus remeros: para descansar la espalda y los brazos durante las travesías de dos horas bajo el sol, los habitantes de la aldea de Văn Lâm han perfeccionado durante generaciones el arte de remar suavemente con los pies, manteniendo un ritmo hipnótico mientras el sampán corta las espigas de arroz que crecen dentro del propio cauce del río.

Y a solo dos kilómetros entre arrozales se esconde su joya hermana: Chùa Bích Động ("La Pagoda de la Cueva de Jade"), un templo rupestre de 1428 incrustado en tres niveles verticales de la montaña junto a un puente de piedra rodeado de lotos.`,
    stops: [
      {
        number: 1,
        title: 'Muelle de Đình Các y la Técnica de Remo con los Pies',
        whatToLookAt: 'Las centenares de barcas alineadas y la postura de los barqueros apoyando los tobillos sobre los remos de madera.',
        story: 'Cada familia de la comuna local hace turno rotatorio para remar, complementando el cultivo tradicional de arroz de una sola cosecha anual en las riberas inundables.',
        insiderTip: 'Lleva sombrero o paraguas para el sol, ya que el tramo entre cuevas es completamente abierto al cielo.',
        lat: 20.2156,
        lng: 105.9372,
      },
      {
        number: 2,
        title: 'Las Tres Cuevas Fluviales (Hang Cả, Hang Hai y Hang Ba)',
        whatToLookAt: 'La primera cueva de 127 metros de longitud y los arrozales encajonados entre cañones verticales a la salida.',
        story: 'Dentro de las cuevas la temperatura baja varios grados de golpe y el eco del agua goteando desde las estalactitas crea un silencio sobrecogedor.',
        insiderTip: 'A finales de mayo y principios de junio, las orillas se transforman en una alfombra de arroz amarillo brillante lista para la siega.',
        lat: 20.2231,
        lng: 105.9315,
      },
      {
        number: 3,
        title: 'Pagoda Bích Động ("La Segunda Cueva Más Bella bajo el Cielo")',
        whatToLookAt: 'El puente de ladrillo antiguo sobre el estanque de lotos y los tres templos escalonados en la roca (Hạ, Trung y Thượng).',
        story: 'Fundada en 1428 por dos monjes errantes; en 1707 mandaron fundir su gran campana de bronce que aún cuelga en la cueva oscura intermedia antes de subir al mirador superior.',
        insiderTip: 'La entrada a la Pagoda Bích Động es gratuita; sube hasta el tercer nivel (Chùa Thượng) para ver el valle de los Cinco Elementos.',
        lat: 20.2179,
        lng: 105.9154,
      },
    ],
    photoSpot: {
      location: 'En el puente de piedra de entrada a la Pagoda Bích Động con el arco antiguo al fondo.',
      bestLight: 'Por la mañana (08:30) cuando se abren las flores de loto rosa en el estanque.',
      instruction: 'Sitúate al principio de la pasarela curva para reflejar el arco de piedra en el agua entre las hojas de loto.',
    },
    culturalEtiquette: {
      dressCode: 'Chaleco salvavidas en la barca y hombros/rodillas cubiertos para subir a los tres niveles de la Pagoda Bích Động.',
      whatNotToDo: 'En el retorno de la tercera cueva hay barcas flotantes que venden bebidas o bordados; si no deseas comprar nada, sonríe y di amablemente "Không, cảm ơn" sin sentir compromiso.',
      scamWarning: 'Si un fotógrafo desde una roca te hace fotos al salir de la cueva, recuerda que su compra al regresar al muelle es totalmente opcional.',
    },
    streetFoodReward: {
      dishNameVi: 'Vịt Nướng & Cơm Cháy Sốt Dê',
      dishNameEs: 'Pato asado a la brasa con hierbas de río y arroz crujiente con salsa de cabra especiada',
      whereToFind: 'En los restaurantes familiares frente al embarcadero de Tam Cốc.',
      priceEstimate: '90.000 ₫ – 150.000 ₫',
    },
    suggestedQuestions: [
      '¿Qué diferencia hay entre el paseo en barca de Tam Cốc y el de Tràng An?',
      '¿Cómo aprenden los barqueros de Tam Cốc a dirigir los remos con los pies?',
      '¿Qué hay en la cima de la tercera pagoda (Chùa Thượng) de Bích Động?',
    ],
  },

  // ===================== TP. HỒ CHÍ MINH =====================
  {
    placeName: 'Túneles de Củ Chi',
    cityName: 'TP. Hồ Chí Minh',
    vietnameseName: 'Địa Đạo Củ Chi',
    centerLat: 11.1419,
    centerLng: 106.4628,
    tagline: 'La asombrosa ciudad subterránea de 250 kilómetros cavada a mano en tres niveles bajo la selva.',
    durationMinutes: 45,
    audioGuideScript: `¡Bienvenido al complejo subterráneo más extraordinario de la historia militar contemporánea! Bajo el suelo de arcilla laterítica ferruginosa que pisas en Củ Chi, a las afueras de Ciudad Ho Chi Minh, los campesinos y guerrilleros excavaron a mano con azadas cortas y cestas de bambú una telaraña secreta de más de 250 kilómetros de túneles que llegó hasta la frontera con Camboya.

Comenzados en 1948 contra las tropas francesas y ampliados durante la Guerra de Vietnam en los años 60, estos pasadizos se estructuraban en tres niveles de profundidad (3, 6 y hasta 10 metros bajo tierra), cerrados con compuertas herméticas de madera para bloquear inundaciones y gases, y ventilados mediante conductos ocultos dentro de termiteros reales.

Aquí abajo transcurría la vida entera de miles de personas durante meses sin ver el sol: había quirófanos iluminados con dinamos de bicicleta, talleres donde se desactivaban bombas sin explotar para fabricar minas artesanales, escuelas y las célebres cocinas sin humo Hoàng Cầm.`,
    stops: [
      {
        number: 1,
        title: 'La Trampilla Secreta de Camuflaje (Hầm Nắp) y los Respiraderos de Termitero',
        whatToLookAt: 'El diminuto hueco de madera de 25 x 35 cm cubierto de hojarasca y los montículos de barro con tubos de bambú ocultos.',
        story: 'Un combatiente local de apenas 45 kilos podía desaparecer bajo tierra en dos segundos sin dejar ni una hoja movida en el suelo del bosque.',
        insiderTip: 'Fíjate en cómo los respiraderos estaban orientados en ángulos opuestos para renovar el aire pero impedir que entraran granadas.',
        lat: 11.1418,
        lng: 106.4625,
      },
      {
        number: 2,
        title: 'El Tanque M41 Americano y los Talleres de Reciclaje de Proyectiles',
        whatToLookAt: 'El carro de combate blindado detenido en la selva en 1970 y las herramientas con las que serraban bombas aéreas a mano.',
        story: 'Los herreros subterráneos extraían el explosivo TNT de las bombas no detonadas para fabricar artefactos defensivos y usaban neumáticos de camiones abandonados para cortar las famosas sandalias "Ho Chi Minh" (Dép Râu) que se llevaban al revés para confundir el rastro de las huellas.',
        insiderTip: 'Mira las sandalias de caucho en el taller: el talón es más ancho que la puntera para que pareciera que caminaban en dirección contraria.',
        lat: 11.1424,
        lng: 106.4631,
      },
      {
        number: 3,
        title: 'Tramo de Túnel Subterráneo y la Cocina sin Humo Hoàng Cầm',
        whatToLookAt: 'La galería subterránea de 100 metros con salidas cada 20 metros y los canales de disipación de humo a ras de tierra.',
        story: 'Inventada por el cocinero militar Hoàng Cầm, la cocina hacía pasar el humo por tres cámaras subterráneas húmedas cubiertas de hojas, de modo que al salir al exterior al amanecer parecía simple neblina matinal.',
        insiderTip: 'Al salir del túnel te servirán té caliente de pandano y yuca cocida con sal de cacahuete y sésamo, el alimento energético de los guerrilleros.',
        lat: 11.1429,
        lng: 106.4636,
      },
    ],
    photoSpot: {
      location: 'En la trampilla de camuflaje bajo los árboles de caucho o junto al tanque M41 cubierto de musgo.',
      bestLight: 'Por la mañana (09:00 - 11:00) con los rayos de sol filtrándose entre el follaje tropical.',
      instruction: 'Coloca la cámara a ras del suelo para captar el grosor de las hojas secas sobre la tapa del túnel.',
    },
    culturalEtiquette: {
      dressCode: 'Ropa transpirable oscura y calzado deportivo cerrado.',
      whatNotToDo: 'Nunca te salgas de los senderos señalizados en el bosque ni entres al túnel si sufres claustrofobia o asma.',
      scamWarning: 'El campo de tiro deportivo está separado del recorrido histórico; las balas tienen coste individual elevado si decides entrar.',
    },
    streetFoodReward: {
      dishNameVi: 'Khoai Mì Luộc Muối Đậu Phộng & Bò Tơ Củ Chi',
      dishNameEs: 'Yuca hervida tierna con sal de cacahuete tostado (en el recinto) y ternera joven de Củ Chi enrollada en papel de arroz',
      whereToFind: 'En el comedor de la salida de los túneles y en la carretera provincial 15.',
      priceEstimate: 'Incluido / 100.000 ₫ en restaurante local',
    },
    suggestedQuestions: [
      '¿Por qué la tierra de Củ Chi no se derrumbaba al excavar tres pisos sin vigas de cemento?',
      '¿Por qué las sandalias de caucho tenían la suela invertida?',
      '¿Qué diferencia hay entre el sector de túneles de Bến Đình y el de Bến Dược?',
    ],
  },

  {
    placeName: 'Mercado Bến Thành',
    cityName: 'TP. Hồ Chí Minh',
    vietnameseName: 'Chợ Bến Thành Sài Gòn',
    centerLat: 10.7725,
    centerLng: 106.6980,
    tagline: 'La icónica torre del reloj de 1914, los cuatro portales cardinales y el paraíso gastronómico de Saigón.',
    durationMinutes: 35,
    audioGuideScript: `¡Xin chào y bienvenido al kilómetro cero de la vida comercial de Ciudad Ho Chi Minh! Ante ti se alza el histórico Mercado Bến Thành ("El Mercado de la Ribera de la Ciudadela"), cuyo nombre recuerda que en el siglo XVII este mismo solar era una marisma junto al río Bến Nghé por donde desembarcaban los soldados y mercaderes que visitaban el fuerte real de Gia Định.

El edificio actual con su inconfundible torre del reloj de tres esferas fue inaugurado en marzo de 1914 por la firma francesa Brossard et Mopin con una fiesta de tres días y fuegos artificiales que los saigoneses llamaron "el Año Nuevo en pleno verano".

Sus 13.000 metros cuadrados se abren a través de cuatro puertas monumentales orientadas a los cuatro puntos cardinales, cada una decorada con bajorrelieves de cerámica vidriada creados en 1952 en los hornos artesanales de Biên Hòa que anuncian lo que se vendía antiguamente en cada ala: plátanos, rayas marinas, vacas y patos.`,
    stops: [
      {
        number: 1,
        title: 'Puerta Sur (Cửa Nam) y la Torre del Reloj con el Altar de los Espíritus',
        whatToLookAt: 'La torre del reloj sobre el arco principal y el relieve cerámico de las rayas marinas.',
        story: 'Justo debajo del reloj en el piso superior existe un santuario oculto dedicado al Dios del Mercado y la Tierra donde los comerciantes encienden incienso cada mañana para pedir ventas prósperas.',
        insiderTip: 'Fíjate en la gran plaza peatonal recién renovada sobre la estación central de la Línea 1 del Metro de Saigón.',
        lat: 10.7721,
        lng: 106.6983,
      },
      {
        number: 2,
        title: 'El Pasillo Gastronómico Central y las Cocinas de Vapor',
        whatToLookAt: 'Las barras llenas de ollas de caldo Bún Riêu, rollitos recién hechos y vitrinas multicolores de postres Chè.',
        story: 'Muchos puestos gastronómicos del centro del mercado pertenecen a la misma familia desde hace más de 60 años y tienen sus precios impresos en carteles visibles.',
        insiderTip: 'Pide un Bún Thịt Nướng (fideos con cerdo a la parrilla y rollitos) o el famoso Chè Bé (puesto 1154, abierto desde 1968).',
        lat: 10.7726,
        lng: 106.6980,
      },
      {
        number: 3,
        title: 'Puerta Norte de las Frutas Tropicales y el Café en Grano',
        whatToLookAt: 'Las pirámides de mangostanes morados, rambutanes, durián, fruta del dragón y sacos de café Arábica de Đà Lạt.',
        story: 'El ala norte hacia la calle Lê Thánh Tôn conserva los bajorrelieves cerámicos originales de 1952 con racimos de plátanos y frutas del Delta del Mekong.',
        insiderTip: 'Si compras café en grano o anacardos tostados con piel, pide siempre probar una muestra y verifica el peso en la báscula digital.',
        lat: 10.7730,
        lng: 106.6977,
      },
    ],
    photoSpot: {
      location: 'Desde el centro de la nueva explanada peatonal frente a la Puerta Sur mirando a la Torre del Reloj.',
      bestLight: 'Al atardecer (17:45) cuando se ilumina el reloj y se montan las carpas del mercado nocturno lateral.',
      instruction: 'Encuadra la torre del reloj en el centro con las palmeras y los rascacielos del Distrito 1 detrás.',
    },
    culturalEtiquette: {
      dressCode: 'Ropa ligera de algodón (los pasillos interiores de tela y ropa concentran calor).',
      whatNotToDo: 'En Vietnam se cree que el primer cliente de la mañana ("mở hàng") determina la suerte de todo el día: a primera hora solo regatea si realmente tienes intención de comprar.',
      scamWarning: 'En ropa, bolsos y recuerdos (no en comida), el primer precio suele ser el doble del precio final; ofrece el 50% con una sonrisa amable.',
    },
    streetFoodReward: {
      dishNameVi: 'Bánh Xèo Miền Nam & Chè Ba Màu',
      dishNameEs: 'Gran crepe crujiente amarillo relleno de gambas, cerdo y brotes de soja envuelto en hojas de mostaza, y postre tricolor con leche de coco',
      whereToFind: 'En la zona de comida del interior de Bến Thành (Puerta Oeste / Norte).',
      priceEstimate: '45.000 ₫ – 70.000 ₫',
    },
    suggestedQuestions: [
      '¿Qué representan los relieves de cerámica de animales y frutas sobre las cuatro puertas?',
      '¿Cómo regatear en Vietnam con educación sin ofender al vendedor?',
      '¿A qué hora abre el mercado nocturno en las calles laterales Phan Bội Châu y Phan Chu Trinh?',
    ],
  },

  {
    placeName: 'Basílica de Notre-Dame y Correos',
    cityName: 'TP. Hồ Chí Minh',
    vietnameseName: 'Nhà thờ Đức Bà Sài Gòn & Bưu điện Trung tâm',
    centerLat: 10.7798,
    centerLng: 106.6990,
    tagline: 'Ladrillos rojos de Marsella, la bóveda ferroviaria de estilo Eiffel y el último escribano de cartas de Saigón.',
    durationMinutes: 40,
    audioGuideScript: `¡Estás en la Plaza de la Comuna de París, el corazón arquitectónico del antiguo Saigón colonial! En un mismo giro de 180 grados contemplas los dos monumentos más célebres del siglo XIX en el sur de Vietnam: la Basílica Catedral de Notre-Dame y la Oficina Central de Correos, acompañados por el fragante Callejón de los Libros bajo la sombra de los tamarindos.

La Basílica fue erigida entre 1877 y 1880 por el arquitecto Jules Bourard con una particularidad asombrosa: absolutamente todos sus materiales —desde los ladrillos rojos vistos que jamás acumulan musgo hasta las tejas y los 56 vitrales de Chartres— fueron transportados en barco desde Marsella y Toulouse.

Cruza ahora dos pasos hacia el edificio amarillo brillante de enfrente: la Oficina Central de Correos (1886-1891). Al atravesar su pórtico con el reloj, te sorprenderá una majestuosa nave abovedada de hierro forjado verde con mapas históricos pintados a mano en 1892 y cabinas telefónicas de caoba con los relojes de las capitales del mundo.`,
    stops: [
      {
        number: 1,
        title: 'Basílica de Notre-Dame (Nhà thờ Đức Bà) y la Virgen de la Paz',
        whatToLookAt: 'Las dos agujas de hierro de 58 metros, los ladrillos rosados de Marsella y la estatua de mármol de Carrara en el jardín.',
        story: 'La estatua de Nuestra Señora de la Paz fue esculpida en Roma en 1959 y sostiene un globo terráqueo con una cruz. Sus dos campanarios albergan seis campanas de bronce (30 toneladas) cuyas notas reproducen el Sol, La, Si, Do, Re y Mi.',
        insiderTip: 'Observa el color terracota vivo de los ladrillos exteriores tras más de 140 años de lluvias tropicales sin llevar capa de pintura.',
        lat: 10.7798,
        lng: 106.6990,
      },
      {
        number: 2,
        title: 'Oficina Central de Correos (Bưu điện Trung tâm Sài Gòn)',
        whatToLookAt: 'La bóveda metálica verde de inspiración ferroviaria, los dos mapas murales de 1892 y las antiguas cabinas telefónicas.',
        story: 'Diseñada por el arquitecto municipal Alfred Foulhoux combinando estructura industrial europea con decoración renacentista y oriental. Durante décadas trabajó en sus mesas centrales el legendario señor Dương Văn Ngà, el último traductor público de cartas en francés e inglés de Vietnam.',
        insiderTip: 'Mira hacia arriba apenas entres: a izquierda y derecha de la bóveda verás los mapas originales pintados a mano de las líneas telegráficas de Indochina de 1892.',
        lat: 10.7800,
        lng: 106.6998,
      },
      {
        number: 3,
        title: 'Calle de los Libros de Nguyễn Văn Bình y el Café Bệt',
        whatToLookAt: 'El bulevar peatonal sombreado lleno de librerías independientes, cafeterías literarias y exposiciones fotográficas.',
        story: 'En el parque contiguo nació la cultura juvenil saigonesa del "Cà phê bệt": sentarse en el bordillo a la sombra de los árboles centenarios con un vaso de café helado con leche condensada viendo pasar la ciudad.',
        insiderTip: 'Puedes enviar una postal real sellada desde el mostrador 1 de Correos; llega a Europa o América en unas dos semanas.',
        lat: 10.7807,
        lng: 106.6996,
      },
    ],
    photoSpot: {
      location: 'En el eje central de la gran sala interior de la Oficina Central de Correos o desde la esquina de la Calle de los Libros.',
      bestLight: 'Por la mañana (08:30 - 10:30) cuando la luz solar entra por los grandes ventanales de Correos.',
      instruction: 'En el interior de Correos, alinea las baldosas geométricas del suelo con los arcos verdes del techo.',
    },
    culturalEtiquette: {
      dressCode: 'Casual y respetuoso; recuerda que la Oficina Central de Correos sigue siendo un edificio postal público en funcionamiento.',
      whatNotToDo: 'No bloquees las ventanillas de atención postal donde los ciudadanos locales envían paquetes y cartas.',
      scamWarning: 'La entrada a la Oficina Central de Correos y a la Calle de los Libros es totalmente gratuita.',
    },
    streetFoodReward: {
      dishNameVi: 'Cà Phê Sữa Đá Sài Gòn & Bánh Mì Hòa Mã',
      dishNameEs: 'Café helado saigonés cargado con leche condensada y bocadillo caliente de embutidos vietnamitas',
      whereToFind: 'En las cafeterías de la Calle de los Libros Nguyễn Văn Bình (junto al lateral de Correos).',
      priceEstimate: '30.000 ₫ – 55.000 ₫',
    },
    suggestedQuestions: [
      '¿Quién diseñó realmente la Oficina Central de Correos: Gustave Eiffel o Alfred Foulhoux?',
      '¿Qué muestran los dos grandes mapas pintados en las paredes de la entrada de Correos?',
      '¿Quién fue el famoso señor Dương Văn Ngà que trabajó aquí durante 70 años?',
    ],
  },

  // ===================== HẠ LONG =====================
  {
    placeName: 'Bahía de Hạ Long (Vịnh Hạ Long)',
    cityName: 'Quảng Ninh / Hạ Long',
    vietnameseName: 'Vịnh Hạ Long – Hang Sửng Sốt & Đảo Ti Tốp',
    centerLat: 20.9101,
    centerLng: 107.1839,
    tagline: 'Donde el dragón celestial descendió al mar: 1.969 islas kársticas de esmeralda y la Cueva de las Sorpresas.',
    durationMinutes: 45,
    audioGuideScript: `¡Estás navegando sobre una de las Siete Maravillas Naturales del Mundo! Hạ Long significa en vietnamita antiguo "Donde el dragón desciende al mar". Cuenta la leyenda fundacional que cuando el joven pueblo vietnamita luchaba por defender su costa frente a una inmensa flota invasora, el Emperador de Jade envió desde el cielo a la Madre Dragón y a sus hijos.

Los dragones escupieron fuego y miles de perlas y esmeraldas divinas que, al chocar contra las aguas del golfo de Tonkín, se petrificaron al instante levantando una muralla laberíntica de 1.969 islas e islotes de roca caliza donde los navíos enemigos quedaron atrapados. Tras la victoria, la Madre Dragón decidió quedarse a descansar en esta bahía tranquila (Hạ Long) y sus crías en la bahía vecina de Bái Tử Long.

Mientras tu barco surca estas aguas de color jade de 500 millones de años de evolución geológica, visitaremos las cámaras colosales de la Cueva de las Sorpresas (Hang Sửng Sốt), el islote símbolo del amor eterno y el mirador panorámico de la Isla Ti Tốp.`,
    stops: [
      {
        number: 1,
        title: 'Cueva de las Sorpresas (Hang Sửng Sốt) en la Isla Bồ Hòn',
        whatToLookAt: 'Las tres cámaras subterráneas de 10.000 metros cuadrados y el techo ondulado como olas petrificadas.',
        story: 'Bautizada por los exploradores franceses en 1901 como "Grotte des Surprises" porque tras una entrada diminuta y un pasadizo estrecho se abre de repente una catedral subterránea de 30 metros de altura capaz de albergar a miles de personas.',
        insiderTip: 'En la tercera sala busca la famosa roca con forma de tortuga sagrada y el "jardín real" con su estanque de agua dulce interior.',
        lat: 20.8442,
        lng: 107.0908,
      },
      {
        number: 2,
        title: 'Islote de los Gallos de Pelea o del Beso (Hòn Trống Mái)',
        whatToLookAt: 'Las dos agujas de roca de 12 metros que emergen del mar frente a frente sobre una base estrecha.',
        story: 'Conocidas como el Gallo (Trống) y la Gallina (Mái), desafían las leyes de la gravedad desde hace milenios y son el emblema oficial del turismo de Vietnam.',
        insiderTip: 'Saca un billete de 200.000 Dong vietnamitas: verás impreso en la parte trasera el islote соседний de Hòn Đỉnh Hương (el Incensario de Piedra) de esta misma bahía.',
        lat: 20.9275,
        lng: 107.0439,
      },
      {
        number: 3,
        title: 'Cima Panorámica de la Isla Ti Tốp (Đảo Ti Tốp) y Cueva Luồn',
        whatToLookAt: 'La playa en forma de media luna blanca y la vista de 360 grados desde el pabellón superior tras 400 escalones.',
        story: 'En 1962, Hồ Chí Minh visitó esta isla junto al cosmonauta soviético Gherman Titov (el segundo ser humano en orbitar la Tierra) y bautizó la isla en su honor como símbolo de amistad.',
        insiderTip: 'En la cercana Hang Luồn (Cueva Túnel) puedes pasar en kayak o barca de bambú por debajo del arco de roca hacia una laguna volcánica cerrada llena de monos.',
        lat: 20.8588,
        lng: 107.0819,
      },
    ],
    photoSpot: {
      location: 'Desde el balcón natural a la salida de la Cueva Hang Sửng Sốt o desde el mirador de la cima de la Isla Ti Tốp.',
      bestLight: 'Al atardecer (16:45 - 17:45) cuando el sol dorado cae detrás de los mogotes kársticos.',
      instruction: 'Incluye los barcos tradicionales de madera fondeados en la bahía para dar escala a los gigantes de roca.',
    },
    culturalEtiquette: {
      dressCode: 'Calzado cerrado cómodo para las escaleras de Hang Sửng Sốt y Ti Tốp; chaleco salvavidas en los botes.',
      whatNotToDo: 'Está estrictamente prohibido introducir botellas de plástico de un solo uso en las islas y cuevas de la bahía de Hạ Long.',
      scamWarning: 'Si compras perlas o marisco extra a barcas vendedoras, confirma siempre el precio exacto con el guía de tu barco.',
    },
    streetFoodReward: {
      dishNameVi: 'Chả Mực Giã Tay Hạ Long & Bún Bề Bề',
      dishNameEs: 'Pastel de calamar fresco de la bahía machacado a mano en mortero de piedra y sopa de fideos con galera marina',
      whereToFind: 'En la zona portuaria de Bãi Cháy / Hòn Gai o servido recién frito a bordo del crucero.',
      priceEstimate: '60.000 ₫ – 100.000 ₫',
    },
    suggestedQuestions: [
      '¿Cómo se formaron geológicamente los miles de pilares de roca en medio del mar?',
      '¿Cómo vivían las familias en las antiguas aldeas flotantes de Cửa Vạn y Vung Viêng?',
      '¿Por qué el agua de la bahía tiene ese tono verde esmeralda tan calmado sin grandes olas?',
    ],
  },
];

/**
 * Normalizes strings by removing Vietnamese and Spanish diacritics, punctuation, and extra spaces
 * so that any variation of a monument name matches reliably.
 */
function normalizeSearchText(input: string): string {
  return (input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function findClientCuratedTour(placeName: string, cityName?: string): FreeTourData | undefined {
  const cleanP = normalizeSearchText(placeName);
  const cleanC = normalizeSearchText(cityName || '');

  if (!cleanP || cleanP.length < 3) return undefined;

  // 1. Direct or keyword synonym matching with high precision
  const KEYWORD_MATCHERS: Array<{ test: (p: string) => boolean; matchIndex: number }> = [
    { test: (p) => p.includes('literatura') || p.includes('van mieu') || p.includes('quoc tu giam'), matchIndex: 0 },
    { test: (p) => p.includes('hoan kiem') || p.includes('ngoc son') || p.includes('espada restituida'), matchIndex: 1 },
    { test: (p) => p.includes('calle del tren') || p.includes('train street') || p.includes('duong tau'), matchIndex: 2 },
    { test: (p) => p.includes('san jose') || p.includes('nha tho lon') || (p.includes('catedral') && !p.includes('notre')), matchIndex: 3 },
    { test: (p) => p.includes('mausoleo') || p.includes('ba dinh') || p.includes('pilar unico') || p.includes('mot cot'), matchIndex: 4 },
    { test: (p) => p.includes('ciudadela') || p.includes('dai noi') || p.includes('hoang thanh') || p.includes('imperial de hue'), matchIndex: 5 },
    { test: (p) => p.includes('thien mu') || p.includes('dama celestial'), matchIndex: 6 },
    { test: (p) => p.includes('khai dinh') || p.includes('tumba imperial') || p.includes('ung lang'), matchIndex: 7 },
    { test: (p) => p.includes('puente japones') || p.includes('chua cau') || p.includes('lai vien kieu'), matchIndex: 8 },
    { test: (p) => p.includes('tan ky') || p.includes('casa antigua'), matchIndex: 9 },
    { test: (p) => p.includes('farolillos') || p.includes('nguyen hoang') || p.includes('cho dem hoi an'), matchIndex: 10 },
    { test: (p) => p.includes('puente del dragon') || p.includes('cau rong'), matchIndex: 11 },
    { test: (p) => p.includes('marmol') || p.includes('ngu hanh son') || p.includes('marble mountain'), matchIndex: 12 },
    { test: (p) => p.includes('linh ung') || p.includes('son tra') || p.includes('lady buddha') || p.includes('bai but'), matchIndex: 13 },
    { test: (p) => p.includes('trang an'), matchIndex: 14 },
    { test: (p) => p.includes('hang mua') || p.includes('ngoa long'), matchIndex: 15 },
    { test: (p) => p.includes('tam coc') || p.includes('bich dong'), matchIndex: 16 },
    { test: (p) => p.includes('cu chi') || p.includes('tuneles'), matchIndex: 17 },
    { test: (p) => p.includes('ben thanh'), matchIndex: 18 },
    { test: (p) => p.includes('notre dame') || p.includes('correos') || p.includes('duc ba') || p.includes('buu dien'), matchIndex: 19 },
    { test: (p) => p.includes('ha long') || p.includes('halong') || p.includes('sung sot') || p.includes('ti top'), matchIndex: 20 },
  ];

  for (const matcher of KEYWORD_MATCHERS) {
    if (matcher.test(cleanP)) {
      return CURATED_CLIENT_TOURS[matcher.matchIndex];
    }
  }

  // 2. Fallback normalized substring comparison
  return CURATED_CLIENT_TOURS.find((tour) => {
    const tPlace = normalizeSearchText(tour.placeName);
    const tCity = normalizeSearchText(tour.cityName);
    const tVi = normalizeSearchText(tour.vietnameseName || '');

    const placeMatches =
      cleanP.includes(tPlace) ||
      tPlace.includes(cleanP) ||
      (tVi.length > 3 && (cleanP.includes(tVi) || tVi.includes(cleanP)));

    if (!placeMatches) return false;
    if (cleanC && cleanC !== 'vietnam' && !tCity.includes(cleanC) && !cleanC.includes(tCity)) {
      return cleanP.length > 8;
    }
    return true;
  });
}
