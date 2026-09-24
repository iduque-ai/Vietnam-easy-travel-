import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  RestaurantItem,
  RestaurantMenuItem,
  RestaurantReviewPhoto,
  RestaurantMenuData,
} from '../types';
import { CURATED_RESTAURANT_MENUS, generateSmartMenuForRestaurant } from '../data/restaurantMenus';
import {
  X,
  UtensilsCrossed,
  Volume2,
  Eye,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  ShoppingBag,
  Plus,
  Minus,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  Share2,
} from 'lucide-react';

interface RestaurantMenuModalProps {
  restaurant: RestaurantItem | null;
  onClose: () => void;
  eurRate: number; // 1 EUR = X VND (e.g. 29000)
}

type MenuCategoryFilter = 'all' | 'Platos Principales' | 'Entrantes & Frituras' | 'Bebidas & Cafés' | 'Postres & Extras';
type PhotoCategoryFilter = 'all' | 'menu_board' | 'dish' | 'atmosphere';

export const RestaurantMenuModal: React.FC<RestaurantMenuModalProps> = ({
  restaurant,
  onClose,
  eurRate,
}) => {
  if (!restaurant) return null;

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<'dishes' | 'photos' | 'reviews' | 'tips'>('dishes');

  // Menu Category Filter
  const [categoryFilter, setCategoryFilter] = useState<MenuCategoryFilter>('all');

  // Photo Category Filter
  const [photoCategory, setPhotoCategory] = useState<PhotoCategoryFilter>('all');

  // Order Cart state (dishId -> quantity)
  const [orderQuantities, setOrderQuantities] = useState<Record<string, number>>({});

  // Fullscreen Photo Lightbox State
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panPosition, setPanPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // "Show to Waiter" Modal state for large text display
  const [waiterDish, setWaiterDish] = useState<RestaurantMenuItem | null>(null);
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  // Live Menu Data & Loading state
  const [menuData, setMenuData] = useState<RestaurantMenuData>(() => {
    return (
      CURATED_RESTAURANT_MENUS[restaurant.id] ||
      generateSmartMenuForRestaurant(restaurant)
    );
  });
  const [isLoadingLivePhotos, setIsLoadingLivePhotos] = useState<boolean>(false);
  const [livePhotosLoaded, setLivePhotosLoaded] = useState<boolean>(false);

  // Convert VND to EUR
  const formatVndToEur = useCallback((vnd: number) => {
    if (!eurRate || eurRate <= 0) return '';
    const eur = (vnd / eurRate).toFixed(2).replace('.', ',');
    return `~${eur} €`;
  }, [eurRate]);

  // Fetch live Google Place photos and reviews for any restaurant
  useEffect(() => {
    let isCancelled = false;
    const initialMenu =
      CURATED_RESTAURANT_MENUS[restaurant.id] ||
      generateSmartMenuForRestaurant(restaurant);
    setMenuData(initialMenu);

    const fetchLiveMenuAndPhotos = async () => {
      setIsLoadingLivePhotos(true);
      try {
        const response = await fetch('/api/restaurants/menu', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            restaurantId: restaurant.id,
            name: restaurant.name,
            address: restaurant.address,
            city: restaurant.city,
            placeId: restaurant.source === 'google_live' ? restaurant.id : undefined,
          }),
        });

        if (!response.ok) throw new Error('Failed to load live menu details');
        const json = await response.json();

        if (json.success && json.data && !isCancelled) {
          const liveData = json.data;

          setMenuData((prev) => {
            // Combine curated dishes (or smart dishes) with live photos and reviews
            const mergedPhotos = [
              ...(prev.photos || []),
              ...(liveData.photos || []),
            ];

            // Deduplicate photos by ID or URL
            const seen = new Set<string>();
            const distinctPhotos: RestaurantReviewPhoto[] = [];
            for (const p of mergedPhotos) {
              if (p.url && !seen.has(p.url)) {
                seen.add(p.url);
                distinctPhotos.push(p);
              }
            }

            return {
              ...prev,
              photos: distinctPhotos.length > 0 ? distinctPhotos : prev.photos,
              recentReviews: (liveData.recentReviews && liveData.recentReviews.length > 0)
                ? liveData.recentReviews
                : prev.recentReviews,
              source: liveData.photos?.length > 0 ? 'google_places_live' : prev.source,
            };
          });
          setLivePhotosLoaded(true);
        }
      } catch (err) {
        console.warn('Could not load live Google review photos:', err);
      } finally {
        if (!isCancelled) {
          setIsLoadingLivePhotos(false);
        }
      }
    };

    fetchLiveMenuAndPhotos();

    return () => {
      isCancelled = true;
    };
  }, [restaurant]);

  // Voice synthesis for Vietnamese dish pronunciation
  const speakVietnamese = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'vi-VN';
      utterance.rate = 0.88;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis not available:', e);
    }
  };

  // Filtered dishes
  const filteredDishes = useMemo(() => {
    if (categoryFilter === 'all') return menuData.items;
    return menuData.items.filter((item) => item.category === categoryFilter);
  }, [menuData.items, categoryFilter]);

  // Filtered Photos
  const filteredPhotos = useMemo(() => {
    if (photoCategory === 'all') return menuData.photos;
    return menuData.photos.filter((p) => p.category === photoCategory);
  }, [menuData.photos, photoCategory]);

  // Order Calculations
  const orderSummary = useMemo(() => {
    let totalVnd = 0;
    let totalItems = 0;
    const selectedList: { item: RestaurantMenuItem; qty: number }[] = [];

    menuData.items.forEach((item) => {
      const qty = orderQuantities[item.id] || 0;
      if (qty > 0) {
        totalVnd += item.priceVnd * qty;
        totalItems += qty;
        selectedList.push({ item, qty });
      }
    });

    // Bill suggestions
    let billSuggestion = '';
    if (totalVnd > 0) {
      const thousands = Math.round(totalVnd / 1000);
      if (thousands <= 50) {
        billSuggestion = 'Prepara 1 billete de 50k o 2 de 20k';
      } else if (thousands <= 100) {
        billSuggestion = 'Prepara 1 billete de 100k';
      } else if (thousands <= 200) {
        billSuggestion = 'Prepara 1 o 2 billetes de 100k o 1 de 200k';
      } else {
        billSuggestion = `Aprox. ${(Math.ceil(totalVnd / 100000) * 100).toLocaleString()}k en billetes grandes`;
      }
    }

    return { totalVnd, totalItems, selectedList, billSuggestion };
  }, [menuData.items, orderQuantities]);

  const updateQuantity = (dishId: string, delta: number) => {
    setOrderQuantities((prev) => {
      const current = prev[dishId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[dishId];
        return copy;
      }
      return { ...prev, [dishId]: next };
    });
  };

  const copyOrderTextToClipboard = () => {
    if (orderSummary.selectedList.length === 0) return;
    const lines = [
      `Xin chào! Làm ơn cho tôi gọi món tại ${restaurant.name}:`,
      ...orderSummary.selectedList.map(
        (s) => `• ${s.qty}x ${s.item.nameVi} (${(s.item.priceVnd / 1000).toLocaleString()}k ₫)`
      ),
      `Tổng tiền: ${(orderSummary.totalVnd / 1000).toLocaleString()}k ₫ (${formatVndToEur(orderSummary.totalVnd)})`,
      'Cảm ơn bạn rất nhiều!',
    ].join('\n');

    navigator.clipboard?.writeText(lines);
    setCopiedNotification('¡Pedido copiado al portapapeles!');
    setTimeout(() => setCopiedNotification(null), 3000);
  };

  // Keyboard navigation for photo lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedPhotoIndex === null) return;
      if (e.key === 'Escape') {
        setSelectedPhotoIndex(null);
        setZoomLevel(1);
        setPanPosition({ x: 0, y: 0 });
      } else if (e.key === 'ArrowRight') {
        setSelectedPhotoIndex((prev) => (prev !== null && prev < menuData.photos.length - 1 ? prev + 1 : 0));
        setZoomLevel(1);
        setPanPosition({ x: 0, y: 0 });
      } else if (e.key === 'ArrowLeft') {
        setSelectedPhotoIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : menuData.photos.length - 1));
        setZoomLevel(1);
        setPanPosition({ x: 0, y: 0 });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPhotoIndex, menuData.photos.length]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-stone-950/80 backdrop-blur-md overflow-hidden animate-fade-in">
      {/* Modal Container */}
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-stone-900 border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden text-stone-100">
        
        {/* Top Header Banner */}
        <div className="relative px-4 py-3.5 sm:px-6 sm:py-4 bg-gradient-to-r from-stone-950 via-stone-900 to-amber-950/40 border-b border-stone-800 flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[11px] font-bold tracking-wide uppercase flex items-center gap-1 border border-amber-500/30">
                <UtensilsCrossed className="w-3 h-3 text-amber-400" />
                Carta & Menú Oficial
              </span>
              {restaurant.michelinGuide && (
                <span className="px-2 py-0.5 rounded-md bg-red-950/80 text-red-300 text-[11px] font-semibold border border-red-500/30">
                  Michelin {restaurant.michelinGuide}
                </span>
              )}
              {menuData.source === 'google_places_live' && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 text-[11px] font-semibold flex items-center gap-1 border border-emerald-500/30">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Fotos de reviews en vivo
                </span>
              )}
            </div>

            <h2 className="text-lg sm:text-2xl font-black text-stone-100 tracking-tight flex items-center gap-2 truncate">
              {restaurant.name}
            </h2>
            <p className="text-xs sm:text-sm text-stone-400 truncate mt-0.5">
              <span className="text-amber-300/90 font-medium italic">{restaurant.nameVi}</span> • {restaurant.district}, {restaurant.city}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-stone-400 hover:text-white transition cursor-pointer shrink-0"
            aria-label="Cerrar carta"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-4 sm:px-6 bg-stone-950/60 border-b border-stone-800/80 overflow-x-auto no-scrollbar shrink-0 gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('dishes')}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold transition flex items-center gap-1.5 border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'dishes'
                ? 'text-amber-400 border-amber-500 bg-amber-500/5'
                : 'text-stone-400 border-transparent hover:text-stone-200'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>Platos & Precios ({menuData.items.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('photos')}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold transition flex items-center gap-1.5 border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'photos'
                ? 'text-amber-400 border-amber-500 bg-amber-500/5'
                : 'text-stone-400 border-transparent hover:text-stone-200'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>Fotos de Reviews & Carta ({menuData.photos.length})</span>
            {isLoadingLivePhotos && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping ml-0.5" />
            )}
          </button>

          {menuData.recentReviews && menuData.recentReviews.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('reviews')}
              className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold transition flex items-center gap-1.5 border-b-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'reviews'
                  ? 'text-amber-400 border-amber-500 bg-amber-500/5'
                  : 'text-stone-400 border-transparent hover:text-stone-200'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Opiniones Comensales ({menuData.recentReviews.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('tips')}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold transition flex items-center gap-1.5 border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'tips'
                ? 'text-amber-400 border-amber-500 bg-amber-500/5'
                : 'text-stone-400 border-transparent hover:text-stone-200'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Cómo Pedir & Trucos</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {/* TAB 1: PLatos & Precios */}
          {activeTab === 'dishes' && (
            <div className="space-y-4">
              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                {(
                  [
                    { id: 'all', label: 'Todos' },
                    { id: 'Platos Principales', label: '🍜 Platos Principales' },
                    { id: 'Entrantes & Frituras', label: '🥢 Entrantes & Frituras' },
                    { id: 'Bebidas & Cafés', label: '☕ Bebidas & Cafés' },
                    { id: 'Postres & Extras', label: '🍮 Postres & Extras' },
                  ] as const
                ).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`px-3 py-1.5 rounded-lg font-medium cursor-pointer transition whitespace-nowrap ${
                      categoryFilter === cat.id
                        ? 'bg-amber-500 text-stone-950 font-bold shadow'
                        : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Notice Banner */}
              <div className="p-3 bg-amber-950/30 border border-amber-500/20 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-200/90">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Pulsa en <strong className="text-amber-300">"Mostrar al camarero"</strong> para ver el plato en pantalla gigante en vietnamita, o el altavoz para escuchar su pronunciación.
                  </span>
                </div>
              </div>

              {/* Dishes Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredDishes.map((dish) => {
                  const qty = orderQuantities[dish.id] || 0;
                  return (
                    <div
                      key={dish.id}
                      className={`p-3.5 sm:p-4 rounded-xl border transition flex flex-col justify-between ${
                        qty > 0
                          ? 'bg-amber-950/20 border-amber-500/50 shadow-md ring-1 ring-amber-500/30'
                          : 'bg-stone-850/80 border-stone-800 hover:border-stone-700'
                      }`}
                    >
                      <div>
                        {/* Title & Signature Tag */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-base text-amber-300 leading-snug">
                                {dish.nameVi}
                              </h3>
                              {dish.isSignature && (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-amber-500 text-stone-950">
                                  ⭐ Especialidad
                                </span>
                              )}
                            </div>
                            <h4 className="text-xs font-semibold text-stone-300 mt-0.5">
                              {dish.nameEs}
                            </h4>
                          </div>

                          {/* Audio pronunciation button */}
                          <button
                            type="button"
                            onClick={() => speakVietnamese(dish.nameVi)}
                            className="p-2 rounded-lg bg-stone-800 hover:bg-amber-500/20 text-stone-400 hover:text-amber-300 transition cursor-pointer shrink-0"
                            title="Escuchar pronunciación nativa en vietnamita"
                            aria-label={`Pronunciar ${dish.nameVi}`}
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Phonetics Guide */}
                        {dish.phonetic && (
                          <p className="text-[11px] text-stone-400 italic mt-1 font-mono">
                            🗣️ Pronunciación: "{dish.phonetic}"
                          </p>
                        )}

                        {/* Description */}
                        <p className="text-xs text-stone-300 mt-2 leading-relaxed">
                          {dish.description}
                        </p>

                        {/* Dietary Tags */}
                        {dish.dietary && dish.dietary.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2.5">
                            {dish.dietary.map((tag, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 text-[10px] rounded bg-stone-800/90 text-stone-300 border border-stone-700/50"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Card Bottom: Price, Show to Waiter, and Order Quantity */}
                      <div className="mt-4 pt-3 border-t border-stone-800/80 flex items-center justify-between gap-2 flex-wrap">
                        <div>
                          <div className="text-base font-black text-white font-mono">
                            {(dish.priceVnd / 1000).toLocaleString('es-ES')}k ₫
                          </div>
                          <div className="text-[11px] text-stone-400 font-medium">
                            {formatVndToEur(dish.priceVnd)}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setWaiterDish(dish)}
                            className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center gap-1 transition cursor-pointer border border-stone-700"
                            title="Mostrar tarjeta con texto grande al camarero"
                          >
                            <Eye className="w-3.5 h-3.5 text-amber-400" />
                            <span>Mostrar</span>
                          </button>

                          {/* Counter (+ / -) */}
                          <div className="flex items-center bg-stone-800 rounded-lg p-0.5 border border-stone-700">
                            {qty > 0 && (
                              <button
                                type="button"
                                onClick={() => updateQuantity(dish.id, -1)}
                                className="p-1 rounded text-stone-400 hover:text-white hover:bg-stone-700 transition cursor-pointer"
                                aria-label="Restar ración"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {qty > 0 && (
                              <span className="px-2 text-xs font-bold text-amber-400 font-mono">
                                {qty}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => updateQuantity(dish.id, 1)}
                              className={`p-1.5 rounded text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                                qty > 0
                                  ? 'bg-amber-500 text-stone-950 hover:bg-amber-400'
                                  : 'text-stone-300 hover:bg-stone-700'
                              }`}
                              aria-label="Añadir a mi pedido"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              {qty === 0 && <span className="text-[11px] pr-1">Pedir</span>}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: FOTOS DE REVIEWS & CARTA */}
          {activeTab === 'photos' && (
            <div className="space-y-4">
              {/* Photo Filter Pills */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                  {(
                    [
                      { id: 'all', label: `Todas las fotos (${menuData.photos.length})` },
                      { id: 'menu_board', label: '📋 Cartas & Menús físicos' },
                      { id: 'dish', label: '🍜 Platos servidos' },
                      { id: 'atmosphere', label: '🏪 Local & Fachada' },
                    ] as const
                  ).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setPhotoCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-lg font-medium cursor-pointer transition whitespace-nowrap ${
                        photoCategory === cat.id
                          ? 'bg-amber-500 text-stone-950 font-bold shadow'
                          : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <span className="text-xs text-stone-400 flex items-center gap-1">
                  <ZoomIn className="w-3.5 h-3.5 text-amber-400" />
                  Pulsa en cualquier foto para abrir el visor con zoom legible
                </span>
              </div>

              {/* Photos Grid */}
              {filteredPhotos.length === 0 ? (
                <div className="p-8 text-center text-stone-400 bg-stone-950/40 rounded-xl border border-stone-800">
                  <p className="text-sm">No hay fotos en esta categoría.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  {filteredPhotos.map((photo, index) => {
                    const originalIndex = menuData.photos.findIndex((p) => p.id === photo.id);
                    return (
                      <div
                        key={photo.id}
                        onClick={() => {
                          setSelectedPhotoIndex(originalIndex !== -1 ? originalIndex : index);
                          setZoomLevel(1);
                          setPanPosition({ x: 0, y: 0 });
                        }}
                        className="group relative bg-stone-800 rounded-xl overflow-hidden border border-stone-700/60 hover:border-amber-500/60 transition cursor-pointer shadow-md flex flex-col justify-between"
                      >
                        {/* Image Box */}
                        <div className="relative aspect-4/3 w-full bg-stone-950 overflow-hidden">
                          <img
                            src={photo.url}
                            alt={photo.caption}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            onError={(e) => {
                              // Graceful fallback to food photography if proxy fails
                              (e.target as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=800&q=80';
                            }}
                          />

                          {/* Badges on top */}
                          <div className="absolute top-2 left-2 flex flex-col gap-1">
                            {photo.isLegibleMenu && (
                              <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px] shadow-md flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                Carta Legible
                              </span>
                            )}
                            {photo.category === 'menu_board' && !photo.isLegibleMenu && (
                              <span className="px-2 py-0.5 rounded bg-amber-500 text-stone-950 font-bold text-[10px] shadow-md">
                                📋 Menú
                              </span>
                            )}
                          </div>

                          {/* Hover Zoom Hint Overlay */}
                          <div className="absolute inset-0 bg-stone-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                            <div className="px-3 py-1.5 rounded-lg bg-stone-900/90 text-amber-400 font-bold text-xs flex items-center gap-1.5 border border-amber-500/40 shadow-lg">
                              <ZoomIn className="w-4 h-4" />
                              <span>Ampliar con zoom</span>
                            </div>
                          </div>
                        </div>

                        {/* Caption & Author Info */}
                        <div className="p-3 bg-stone-900 border-t border-stone-800/80">
                          <p className="text-xs font-semibold text-stone-200 line-clamp-2 leading-snug">
                            {photo.caption}
                          </p>
                          <div className="mt-1.5 flex items-center justify-between text-[11px] text-stone-400">
                            <span className="truncate max-w-[140px]">
                              {photo.authorName ? `Foto: ${photo.authorName}` : 'Comensal verificado'}
                            </span>
                            {photo.relativeTime && (
                              <span className="shrink-0 text-stone-500">{photo.relativeTime}</span>
                            )}
                          </div>
                          {photo.reviewSnippet && (
                            <p className="mt-1 text-[11px] text-amber-200/80 italic line-clamp-2">
                              "{photo.reviewSnippet}"
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: RESEÑAS DE LA CARTA */}
          {activeTab === 'reviews' && (
            <div className="space-y-3.5">
              <div className="p-3 bg-stone-950/40 border border-stone-800 rounded-xl text-xs text-stone-300">
                Reseñas verificadas de comensales que mencionan platos específicos, tamaños de raciones y precios.
              </div>

              {menuData.recentReviews?.map((rev, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-stone-850 border border-stone-800 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs flex items-center justify-center border border-amber-500/30">
                        {rev.authorName.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-bold text-sm text-stone-200">{rev.authorName}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-amber-400 font-bold text-xs">
                        {'★'.repeat(Math.round(rev.rating))}
                      </span>
                      <span className="text-[11px] text-stone-500 ml-1">{rev.relativeTime}</span>
                    </div>
                  </div>
                  <p className="text-xs text-stone-300 leading-relaxed">
                    "{rev.text}"
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: CONSEJOS PARA PEDIR & TRUCOS */}
          {activeTab === 'tips' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-3">
                <h3 className="font-bold text-sm text-amber-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  Consejos locales para comer en {restaurant.name}
                </h3>
                <ul className="space-y-2.5 text-xs text-stone-200">
                  {menuData.tipsForOrdering?.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold shrink-0">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold shrink-0">•</span>
                    <span>
                      <strong>Para pedir la cuenta:</strong> Llama amablemente al camarero diciendo <em className="text-amber-300 font-mono">"Em ơi, tính tiền!"</em> (Em oy, tin tien!).
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold shrink-0">•</span>
                    <span>
                      <strong>Servilletas húmedas (Khăn lạnh):</strong> En muchos restaurantes tradicionales te pondrán una toallita envasada. Si la abres, suelen cobrar entre 2.000 ₫ y 5.000 ₫ (~0,10 €) al final en la cuenta.
                    </span>
                  </li>
                </ul>
              </div>

              {/* Quick Vietnamese phrases for ordering */}
              <div className="p-4 rounded-xl bg-stone-850 border border-stone-800 space-y-3">
                <h3 className="font-bold text-sm text-stone-200">
                  Frases exprés para pedir comida
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-stone-900 border border-stone-800">
                    <div className="font-bold text-amber-300">Không cay, cảm ơn!</div>
                    <div className="text-stone-400 text-[11px]">Khom kai, cam on! (¡Sin picante, gracias!)</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-stone-900 border border-stone-800">
                    <div className="font-bold text-amber-300">Cho tôi một phần này</div>
                    <div className="text-stone-400 text-[11px]">Cho toy mot fan nay (Póngame una ración de esto)</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-stone-900 border border-stone-800">
                    <div className="font-bold text-amber-300">Cho tôi thêm nước đá</div>
                    <div className="text-stone-400 text-[11px]">Cho toy them noo-ok da (Póngame más hielo)</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-stone-900 border border-stone-800">
                    <div className="font-bold text-amber-300">Có thanh toán thẻ không?</div>
                    <div className="text-stone-400 text-[11px]">Co tan toan te khom? (¿Aceptan pago con tarjeta?)</div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Sticky Order Bar / Bottom Action */}
        {orderSummary.totalItems > 0 && (
          <div className="p-3 sm:p-4 bg-stone-950 border-t border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 animate-fade-in shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-black text-sm shrink-0 shadow">
                {orderSummary.totalItems}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-400 font-medium">Total estimado del pedido:</span>
                  <span className="text-base font-black text-amber-400 font-mono">
                    {(orderSummary.totalVnd / 1000).toLocaleString('es-ES')}k ₫
                  </span>
                  <span className="text-xs text-stone-300 font-bold">
                    ({formatVndToEur(orderSummary.totalVnd)})
                  </span>
                </div>
                <div className="text-[11px] text-stone-400">
                  💡 {orderSummary.billSuggestion}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={copyOrderTextToClipboard}
                className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{copiedNotification || 'Copiar pedido en vietnamita'}</span>
              </button>
              <button
                type="button"
                onClick={() => setOrderQuantities({})}
                className="px-2.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white text-xs font-medium transition cursor-pointer"
                title="Limpiar pedido"
              >
                Limpiar
              </button>
            </div>
          </div>
        )}

      </div>

      {/* FULLSCREEN PHOTO LIGHTBOX WITH ZOOM & PAN */}
      {selectedPhotoIndex !== null && menuData.photos[selectedPhotoIndex] && (
        <div
          className="fixed inset-0 z-60 bg-stone-950/95 backdrop-blur-lg flex flex-col justify-between p-2 sm:p-4 select-none animate-fade-in"
          onClick={() => {
            setSelectedPhotoIndex(null);
            setZoomLevel(1);
            setPanPosition({ x: 0, y: 0 });
          }}
        >
          {/* Lightbox Top Bar */}
          <div
            className="flex items-center justify-between gap-2 px-3 py-2 bg-stone-900/80 rounded-xl border border-stone-800 z-10 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[11px]">
                  {selectedPhotoIndex + 1} / {menuData.photos.length}
                </span>
                <span className="text-xs text-stone-300 font-semibold truncate">
                  {menuData.photos[selectedPhotoIndex].caption}
                </span>
              </div>
              <p className="text-[11px] text-stone-400 truncate mt-0.5">
                {menuData.photos[selectedPhotoIndex].authorName || 'Reseña de Google Maps'} • {menuData.photos[selectedPhotoIndex].relativeTime || 'Reciente'}
              </p>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(3.5, z + 0.5))}
                className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 transition cursor-pointer"
                title="Acercar (Zoom In)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setZoomLevel((z) => Math.max(1, z - 0.5));
                  if (zoomLevel <= 1.5) setPanPosition({ x: 0, y: 0 });
                }}
                className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 transition cursor-pointer"
                title="Alejar (Zoom Out)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setZoomLevel(1);
                  setPanPosition({ x: 0, y: 0 });
                }}
                className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 transition cursor-pointer"
                title="Restablecer tamaño original"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedPhotoIndex(null);
                  setZoomLevel(1);
                  setPanPosition({ x: 0, y: 0 });
                }}
                className="p-2 rounded-lg bg-stone-800 hover:bg-red-900/50 text-stone-200 hover:text-white transition cursor-pointer ml-1"
                title="Cerrar visor"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Lightbox Center Image with Drag & Zoom */}
          <div
            className="relative flex-1 flex items-center justify-center overflow-hidden my-2 cursor-grab active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => {
              if (zoomLevel > 1) {
                setIsDragging(true);
                dragStartRef.current = { x: e.clientX - panPosition.x, y: e.clientY - panPosition.y };
              }
            }}
            onMouseMove={(e) => {
              if (isDragging && zoomLevel > 1) {
                setPanPosition({
                  x: e.clientX - dragStartRef.current.x,
                  y: e.clientY - dragStartRef.current.y,
                });
              }
            }}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
            onTouchStart={(e) => {
              if (zoomLevel > 1 && e.touches[0]) {
                setIsDragging(true);
                dragStartRef.current = {
                  x: e.touches[0].clientX - panPosition.x,
                  y: e.touches[0].clientY - panPosition.y,
                };
              }
            }}
            onTouchMove={(e) => {
              if (isDragging && zoomLevel > 1 && e.touches[0]) {
                setPanPosition({
                  x: e.touches[0].clientX - dragStartRef.current.x,
                  y: e.touches[0].clientY - dragStartRef.current.y,
                });
              }
            }}
            onTouchEnd={() => setIsDragging(false)}
          >
            <img
              src={menuData.photos[selectedPhotoIndex].url}
              alt={menuData.photos[selectedPhotoIndex].caption}
              className="max-h-[82vh] max-w-[92vw] object-contain rounded-lg shadow-2xl transition-transform duration-150 ease-out"
              style={{
                transform: `scale(${zoomLevel}) translate(${panPosition.x / zoomLevel}px, ${panPosition.y / zoomLevel}px)`,
              }}
              draggable={false}
            />

            {/* Left Nav Button */}
            {menuData.photos.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPhotoIndex((prev) =>
                    prev !== null && prev > 0 ? prev - 1 : menuData.photos.length - 1
                  );
                  setZoomLevel(1);
                  setPanPosition({ x: 0, y: 0 });
                }}
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-stone-900/80 hover:bg-stone-800 text-white transition cursor-pointer border border-stone-700 shadow-xl"
                aria-label="Foto anterior"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Right Nav Button */}
            {menuData.photos.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPhotoIndex((prev) =>
                    prev !== null && prev < menuData.photos.length - 1 ? prev + 1 : 0
                  );
                  setZoomLevel(1);
                  setPanPosition({ x: 0, y: 0 });
                }}
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-stone-900/80 hover:bg-stone-800 text-white transition cursor-pointer border border-stone-700 shadow-xl"
                aria-label="Foto siguiente"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Lightbox Bottom Info Bar */}
          <div
            className="px-4 py-2.5 bg-stone-900/80 rounded-xl border border-stone-800 flex items-center justify-between text-xs text-stone-300 z-10 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <span>
              🔍 Nivel de zoom: <strong className="text-amber-400">{Math.round(zoomLevel * 100)}%</strong>
              {zoomLevel > 1 && ' (Arrastra para mover la imagen y leer letras pequeñas)'}
            </span>
            <span className="text-[11px] text-stone-400 hidden sm:inline">
              Usa las flechas del teclado o los botones laterales para navegar
            </span>
          </div>
        </div>
      )}

      {/* "SHOW TO WAITER" LARGE SCREEN MODAL */}
      {waiterDish && (
        <div
          className="fixed inset-0 z-70 bg-stone-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setWaiterDish(null)}
        >
          <div
            className="w-full max-w-lg bg-stone-900 border-2 border-amber-500 rounded-2xl p-6 shadow-2xl text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-md bg-amber-500 text-stone-950 font-black text-xs uppercase tracking-wider">
                Para mostrar al camarero
              </span>
              <button
                type="button"
                onClick={() => setWaiterDish(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-white bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-400">
              Enseña esta pantalla al camarero o cocinero del puesto:
            </p>

            <div className="p-4 rounded-xl bg-stone-950 border border-amber-500/40 space-y-2">
              <div className="text-2xl sm:text-3xl font-black text-amber-400 leading-tight">
                LÀM ƠN CHO TÔI:
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white tracking-wide">
                {waiterDish.nameVi}
              </div>
              <div className="text-sm font-semibold text-stone-300 font-mono pt-1">
                {(waiterDish.priceVnd / 1000).toLocaleString('es-ES')}k ₫ ({formatVndToEur(waiterDish.priceVnd)})
              </div>
            </div>

            <p className="text-xs text-stone-300 italic">
              Traducción en español: "{waiterDish.nameEs}"
            </p>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => speakVietnamese(waiterDish.nameVi)}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow"
              >
                <Volume2 className="w-4 h-4" />
                <span>Reproducir audio nativo</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  updateQuantity(waiterDish.id, 1);
                  setWaiterDish(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Añadir a mi pedido</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
