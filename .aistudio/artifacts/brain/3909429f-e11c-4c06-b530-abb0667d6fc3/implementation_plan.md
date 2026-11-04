# Renovación Integral de la Audioguía Free Tour

Este plan resuelve el problema por el cual la audioguía cargaba siempre el mismo texto genérico y transforma la experiencia en un reproductor de recorrido inmersivo con guiones únicos verificados por monumento, reproducción continua automática entre paradas, controles de línea de tiempo, mapa interactivo del recinto y respuestas por voz del guía local.

## User Review & Critical Decisions

> [!IMPORTANT]
> Se han incorporado todas las decisiones confirmadas para garantizar que cada monumento tenga su propia narrativa histórica y cultural profunda sin plantillas repetitivas.

- **Guion Único y Profundo por Monumento**: Se elimina el adaptador de enfoques temáticos que sobrescribía los textos reales con una plantilla genérica. Cada monumento contará con un único guion extenso, documentado y específico, tanto en su introducción como en cada una de sus paradas.
- **Catálogo Completo de Monumentos Verificados**: Todos los monumentos sugeridos en las ciudades de Vietnam (Hanói, Huế, Hội An, Đà Nẵng, Ninh Bình, Ciudad Ho Chi Minh y Bahía de Hạ Long) tendrán guiones propios verificados y coordenadas exactas para acceso instantáneo con o sin conexión.
- **Reproductor Avanzado y Auto-Avance**: El reproductor incorpora barra de progreso interactiva, salto de $\pm 10\text{ segundos}$ y reproducción continua automática desde la introducción hasta la última parada del recorrido.
- **Mapa Interactivo de Paradas y Guía por Voz**: Se añade un mapa interactivo con el trazado numerado de las paradas dentro de cada recinto y controles de lectura en voz alta para las respuestas del chat con el guía local Nguyễn.

---

## 1. Overview & Core Concept

- **What It Does**: Ofrece una audioguía paso a paso para los principales templos, ciudadelas, cuevas y monumentos de Vietnam, combinando narración natural en español, ruta visual en mapa, paradas secuenciales y un guía conversacional con voz.
- **Target Audience / Persona**: Viajeros hispanohablantes que recorren Vietnam a pie y necesitan escuchar la historia, el simbolismo arquitectónico y los consejos prácticos de cada parada sin mirar constantemente la pantalla.
- **Key Value**: Elimina por completo las narraciones clónicas o genéricas, permitiendo escuchar un recorrido completo de principio a fin en modo manos libres mientras el mapa y las paradas avanzan automáticamente.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Selección de Monumento**: El usuario elige una ciudad y pulsa sobre cualquiera de los monumentos sugeridos, usa el botón de detección GPS («Cerca de mí») o busca cualquier templo de Vietnam.
  2. **Escucha con Reproductor Avanzado y Auto-Avance**: Al pulsar «Escuchar Guía Completa», comienza la introducción del monumento y, al finalizar cada pista, el reproductor avanza automáticamente a la Parada 1, Parada 2, etc., desplazando suavemente el foco visual y el marcador activo en el mapa.
  3. **Control Preciso del Audio**: Desde la consola de reproducción integrada, el usuario puede arrastrar la barra de tiempo, retroceder o avanzar $10\text{ segundos}$, cambiar la velocidad ($0.9\times$ a $1.5\times$) o saltar directamente a cualquier parada.
  4. **Exploración en Mapa del Recinto**: El usuario visualiza el mapa interactivo con los puntos numerados del recorrido unidos por una línea de ruta; al tocar un marcador en el mapa, se selecciona la parada correspondiente y se ofrece reproducir su narración.
  5. **Consulta por Voz al Guía Nguyễn**: Al enviar una pregunta en el chat interactivo o pulsar una pregunta rápida, la respuesta del guía incluye un botón «Escuchar respuesta» (y opción de lectura automática) para oír la explicación con voz natural.

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Editorial de viajes cálido y legible a plena luz del día, optimizado para uso móvil con una sola mano.
  - *Color Palette & Mood*: Superficies limpias en piedra cálida (`bg-stone-50`, `bg-white`), bordes sutiles (`border-stone-200`) y acento ámbar (`bg-amber-500`, `text-amber-950`) reservado para las acciones primarias de reproducción y la parada activa.
  - *Typography & Hierarchy*: Encabezados editoriales en serif para nombres de monumentos y paradas, cuerpo de lectura clara en sans-serif y numerales tabulares (`tabular-nums`) en todos los contadores de tiempo, duración y distancias.
  - *Component Styling & Layout*: Áreas táctiles mínimas de $44 \times 44\text{px}$ en controles de audio, metadatos limpios con separadores tipográficos (`·`) sin acumulación de etiquetas decorativas, y distribución equilibrada entre el reproductor, el mapa de ruta y las tarjetas de parada.

- **Interactive Feedback & Motion**:
  - Indicador de ondas de audio sincronizado con el estado de reproducción, resaltado dinámico de la parada en curso y transiciones suaves de $\le 200\text{ms}$.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Eliminación del sobrescritor de enfoques (`adaptTourForVibe`)**
  - *Chosen Approach*: Preservar intacto el `audioGuideScript`, `tagline` y las paradas documentadas de cada monumento sin reemplazarlos por plantillas de enfoque.
  - *Why*: El adaptador anterior sustituía el guion real de cualquier monumento por un párrafo prefabricado idéntico donde solo cambiaba el nombre del lugar, causando que el usuario escuchara siempre el mismo texto.
  - *Alternatives Considered*: Mantener 5 variantes por cada uno de los 20+ monumentos incrementaría innecesariamente el peso del cliente frente a ofrecer un único guion magistral que ya integra historia, mitos, fotografía y gastronomía.

- **Decision 2: Cobertura 100% Curada + Coordenadas de Paradas en Cliente y Servidor**
  - *Chosen Approach*: Ampliar el catálogo curado para cubrir todos los monumentos sugeridos de las 6 ciudades y normalizar el buscador insensible a acentos/diacríticos vietnamitas; para búsquedas libres nuevas, el endpoint `/api/free-tour` con Gemini generará un guion profundo único con coordenadas estimadas de las paradas.
  - *Why*: Garantiza respuesta instantánea ($0\text{ ms}$) y disponibilidad 100% offline en los puntos clave del viaje, dejando la generación IA para lugares fuera de ruta.

- **Decision 3: Cola de Reproducción Secuencial (Auto-Play entre Paradas)**
  - *Chosen Approach*: Gestionar una lista ordenada de pistas del tour (`[Introducción, Parada 1, Parada 2, ... Parada N]`) conectada al callback `onEnd` del motor de voz (`speechSynthesis`).
  - *Why*: Permite al viajero guardar el teléfono en el bolsillo y escuchar todo el recorrido guiado sin tener que desbloquear la pantalla tras cada parada.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FreeTourGuide (Vista Principal)                 │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Buscador de Monumentos + Selector de Ciudad + Detector GPS        │  │
│  └───────────────┬───────────────────────────────────┬───────────────┘  │
│                  │ Coincidencia normalizada          │ Lugar nuevo      │
│                  ▼ (sin tildes / vietnamita)         ▼ (Online)         │
│  ┌───────────────────────────────┐   ┌───────────────────────────────┐  │
│  │ Catálogo Curado Verificado    │   │ POST /api/free-tour (Gemini)  │  │
│  │ (20+ Monumentos con Paradas   │   │ Guion profundo específico +   │  │
│  │  geolocalizadas y guion real) │   │ paradas contextualizadas      │  │
│  └───────────────┬───────────────┘   └───────────────┬───────────────┘  │
│                  └─────────────────┬─────────────────┘                  │
│                                    ▼                                    │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Estado del Tour Activo (activeTour, activeTrackIndex, autoAdvance)│  │
│  └───────┬─────────────────────────┬─────────────────────────┬───────┘  │
│          ▼                         ▼                         ▼          │
│  ┌──────────────────────┐ ┌─────────────────────────┐ ┌──────────────┐  │
│  │ Consola de Audio Pro │ │ Mapa de Ruta del Tour   │ │ Chat Guía    │  │
│  │ • Barra Seek (mm:ss) │ │ (InteractiveOSM)        │ │ Nguyễn + Voz │  │
│  │ • Salto -10s / +10s  │ │ • Polilínea de paradas  │ │ • Respuestas │  │
│  │ • Auto-avance 1..N   │ │ • Selección sincronizada│ │   habladas   │  │
│  └──────────────────────┘ └─────────────────────────┘ └──────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Data Model & State**:
  - Extensión de `FreeTourStop` con coordenadas opcionales `lat?: number`, `lng?: number` y `durationSeconds?: number` para situar cada parada en el mapa del recinto.
  - Pistas de audio unificadas (`TourAudioTrack`): índice `0` para la Introducción General y `1..N` para cada parada del recorrido, permitiendo conocer en todo momento qué capítulo suena y cuál es el siguiente en la cola.

- **Interactive Component & State Mapping**:
  - **Buscador y Sugerencias por Ciudad**: Al seleccionar una ciudad, filtra las sugerencias verificadas y permite cargar cualquiera con un toque, reiniciando el índice de pista a `0` y centrando el mapa en las coordenadas del monumento.
  - **Consola del Reproductor**:
    - Control deslizante (`<input type="range">`) conectado a `seekSpeech(newTime)` mostrando `currentTime` y `duration` en formato `tabular-nums`.
    - Botones `-10s` y `+10s` que invocan `seekSpeech(Math.max(0, currentTime - 10))` y `seekSpeech(Math.min(duration, currentTime + 10))`.
    - Botones «Anterior» y «Siguiente» para saltar entre la Introducción y las Paradas `1..N`.
    - Interruptor «Auto-avance»: cuando está activo, al dispararse `onEnd` de una pista sin cancelación manual, lanza automáticamente la siguiente parada de la lista y actualiza `activeStopIndex`.
  - **Mapa Interactivo de Paradas**: Despliega `InteractiveOpenStreetMap` con `routePolyline` formada por las coordenadas de las paradas del tour; al pulsar una parada en la lista o en el mapa, ambos se sincronizan visualmente.
  - **Chat con Guía Nguyễn con Voz**: Cada burbuja de respuesta del guía incluye un botón de altavoz conectado a `playNaturalSpeech` para leer o pausar esa respuesta concreta, más un conmutador opcional para escuchar automáticamente cada nueva respuesta recibida.
