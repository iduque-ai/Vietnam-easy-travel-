import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  RestaurantItem,
  RestaurantMenuItem,
  RestaurantReviewPhoto,
  RestaurantMenuData,
  CurrencyCode,
  ExchangeRatesData,
} from '../types';
import { getCurrencyInfo, calculateForeignToVndRate } from '../utils/currencyUtils';
import {
  CURATED_RESTAURANT_MENUS,
  findCuratedMenuForRestaurant,
  generateSmartMenuForRestaurant,
} from '../data/restaurantMenus';
import { speakVietnameseNatural } from '../utils/speechSynthesis';
import { useScrollLock } from '../hooks/useScrollLock';
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
  MapPin,
  FileText,
} from 'lucide-react';

interface RestaurantMenuModalProps {
  restaurant: RestaurantItem | null;
  onClose: () => void;
  eurRate?: number; // fallback: 1 EUR = X VND
  ratesData?: ExchangeRatesData;
  selectedCurrency?: CurrencyCode;
  initialTab?: 'dishes' | 'photos' | 'reviews' | 'tips';
  initialPhotoCategory?: 'all' | 'menu_board' | 'bill' | 'dish' | 'atmosphere';
}

type MenuCategoryFilter = 'all' | 'Platos Principales' | 'Entrantes & Frituras' | 'Bebidas & Cafés' | 'Postres & Extras';
type PhotoCategoryFilter = 'all' | 'menu_board' | 'bill' | 'dish' | 'atmosphere';

export const RestaurantMenuModal: React.FC<RestaurantMenuModalProps> = ({
  restaurant,
  onClose,
  eurRate,
  ratesData,
  selectedCurrency = 'EUR',
  initialTab = 'dishes',
  initialPhotoCategory = 'all',
}) => {
  useScrollLock(Boolean(restaurant));

  if (!restaurant) return null;

  const currInfo = getCurrencyInfo(selectedCurrency);
  const foreignToVndRate = ratesData
    ? calculateForeignToVndRate(ratesData.rates, selectedCurrency)
    : (eurRate || 27000);

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<'dishes' | 'photos' | 'reviews' | 'tips'>(initialTab);

  // Menu Category Filter
  const [categoryFilter, setCategoryFilter] = useState<MenuCategoryFilter>('all');

  // Photo Category Filter
  const [photoCategory, setPhotoCategory] = useState<PhotoCategoryFilter>(initialPhotoCategory);

  // Scanning & AI OCR state
  const [isScanningPhotoId, setIsScanningPhotoId] = useState<string | null>(null);
  const [isSearchingReviewPhotos, setIsSearchingReviewPhotos] = useState<boolean>(false);
  const [highContrastMode, setHighContrastMode] = useState<boolean>(false);
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [customPhotoInput, setCustomPhotoInput] = useState<string>('');

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
      findCuratedMenuForRestaurant(restaurant) ||
      CURATED_RESTAURANT_MENUS[restaurant.id] ||
      generateSmartMenuForRestaurant(restaurant)
    );
  });
  const [isLoadingLivePhotos, setIsLoadingLivePhotos] = useState<boolean>(false);
  const [livePhotosLoaded, setLivePhotosLoaded] = useState<boolean>(false);

  // Convert VND to selected currency
  const formatVndToEur = useCallback((vnd: number) => {
    if (!foreignToVndRate || foreignToVndRate <= 0) return '';
    const val = vnd / foreignToVndRate;
    if (selectedCurrency === 'JPY') {
      return `${Math.round(val).toLocaleString('es-ES')} ¥`;
    }
    const formatted = val.toFixed(2).replace('.', ',');
    return `${formatted} ${currInfo.symbol}`;
  }, [foreignToVndRate, selectedCurrency, currInfo]);

  // Fetch live Google Place photos and reviews for any restaurant
  useEffect(() => {
    let isCancelled = false;
    const initialMenu =
      findCuratedMenuForRestaurant(restaurant) ||
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
            const incomingLivePhotos: RestaurantReviewPhoto[] = Array.isArray(liveData.photos) ? liveData.photos : [];
            const hasRealGooglePhotos = incomingLivePhotos.some((p) => p.url?.includes('/api/restaurants/photo'));

            // Keep verified legible menu boards & customer receipts from prev, and if real Google Maps
            // photos exist for this restaurant, prioritize them for dish & atmosphere shots
            const basePhotos = hasRealGooglePhotos
              ? (prev.photos || []).filter((p) => p.category === 'menu_board' || p.category === 'bill' || p.isLegibleMenu)
              : (prev.photos || []);

            const mergedPhotos = [
              ...basePhotos,
              ...incomingLivePhotos,
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
              googleRating: liveData.googleRating || prev.googleRating,
              googleReviewsCount: liveData.googleReviewsCount || prev.googleReviewsCount,
              source: hasRealGooglePhotos ? 'google_places_live' : (liveData.source || prev.source),
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
    speakVietnameseNatural(text, `menu-${text.slice(0, 20)}`);
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

  // AI OCR Scanner for any individual photo
  const handleScanPhoto = async (photo: RestaurantReviewPhoto) => {
    setIsScanningPhotoId(photo.id);
    try {
      const resp = await fetch('/api/restaurants/scan-menu-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: photo.url,
          photoRef: photo.photoReference,
          restaurantName: restaurant.name,
        }),
      });
      const resJson = await resp.json();
      if (resJson.success && resJson.data) {
        const { extractedDishes, extractedMenuText, isLegibleMenu, menuTitle, category } = resJson.data;
        setMenuData((prev) => ({
          ...prev,
          photos: prev.photos.map((p) => {
            if (p.id === photo.id) {
              return {
                ...p,
                category: category || p.category,
                isLegibleMenu: Boolean(isLegibleMenu || (extractedDishes && extractedDishes.length > 0)),
                extractedDishes: extractedDishes && extractedDishes.length > 0 ? extractedDishes : p.extractedDishes,
                extractedMenuText: extractedMenuText || p.extractedMenuText,
                caption: p.caption.includes('Carta') || p.caption.includes('Menú') ? p.caption : `📋 ${menuTitle || 'Carta escaneada'} (Precios detectados)`,
                isAiScanned: true,
              };
            }
            return p;
          }),
        }));
        setCopiedNotification(`¡${(extractedDishes || []).length} platos con precios detectados en la foto!`);
        setTimeout(() => setCopiedNotification(null), 3500);
      }
    } catch (err) {
      console.warn('Scan menu photo failed:', err);
      setCopiedNotification('No se pudo escanear la foto en este momento.');
      setTimeout(() => setCopiedNotification(null), 3000);
    } finally {
      setIsScanningPhotoId(null);
    }
  };

  // Live search for more menu photos with prices from reviews
  const handleFetchMoreMenuPhotos = async () => {
    setIsSearchingReviewPhotos(true);
    try {
      const resp = await fetch('/api/restaurants/menu-photos', {
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
      const resJson = await resp.json();
      if (resJson.success && Array.isArray(resJson.photos) && resJson.photos.length > 0) {
        setMenuData((prev) => {
          const seen = new Set(prev.photos.map((p) => p.url));
          const newPhotos = resJson.photos.filter((p: RestaurantReviewPhoto) => !seen.has(p.url));
          return {
            ...prev,
            photos: [...newPhotos, ...prev.photos],
          };
        });
        setCopiedNotification(`¡${resJson.photos.length} fotos de reseñas encontradas!`);
        setTimeout(() => setCopiedNotification(null), 3500);
      } else {
        setCopiedNotification('No se encontraron fotos adicionales en Google Reviews.');
        setTimeout(() => setCopiedNotification(null), 3000);
      }
    } catch (err) {
      console.warn('Fetch review menu photos error:', err);
    } finally {
      setIsSearchingReviewPhotos(false);
    }
  };

  // Upload or analyze user provided menu photo
  const handleAnalyzeCustomPhoto = async (photoPayload: string) => {
    if (!photoPayload.trim()) return;
    setIsScanningPhotoId('custom-upload');
    try {
      const isBase64 = photoPayload.startsWith('data:');
      const resp = await fetch('/api/restaurants/scan-menu-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: isBase64 ? undefined : photoPayload.trim(),
          imageBase64: isBase64 ? photoPayload.trim() : undefined,
          restaurantName: restaurant.name,
        }),
      });
      const resJson = await resp.json();
      if (resJson.success && resJson.data) {
        const { extractedDishes, extractedMenuText, menuTitle } = resJson.data;
        const newPhoto: RestaurantReviewPhoto = {
          id: `custom-photo-${Date.now()}`,
          url: photoPayload.trim(),
          width: 1200,
          height: 1400,
          caption: `📋 ${menuTitle || 'Carta con precios analizada'}`,
          category: 'menu_board',
          isLegibleMenu: true,
          authorName: 'Foto aportada por viajero',
          relativeTime: 'Ahora mismo',
          reviewSnippet: 'Carta con precios extraída en tiempo real con IA.',
          extractedDishes: extractedDishes || [],
          extractedMenuText: extractedMenuText || '',
          isAiScanned: true,
        };
        setMenuData((prev) => ({
          ...prev,
          photos: [newPhoto, ...prev.photos],
        }));
        setShowUploadModal(false);
        setCustomPhotoInput('');
        setActiveTab('photos');
        setPhotoCategory('menu_board');
        setCopiedNotification(`¡Carta analizada! ${(extractedDishes || []).length} platos con precios extraídos.`);
        setTimeout(() => setCopiedNotification(null), 3500);
      }
    } catch (err) {
      console.warn('Custom photo scan error:', err);
    } finally {
      setIsScanningPhotoId(null);
    }
  };

  const menuPhotosCount = useMemo(() => {
    return menuData.photos.filter((p) => p.category === 'menu_board' || p.category === 'bill' || p.isLegibleMenu).length;
  }, [menuData.photos]);

  const billPhotosCount = useMemo(() => {
    return menuData.photos.filter((p) => p.category === 'bill').length;
  }, [menuData.photos]);

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
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#141210] border border-stone-800 rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden text-stone-100">
        
        {/* Top Header Banner */}
        <div className="relative px-5 py-4 sm:px-7 sm:py-5 bg-gradient-to-r from-stone-950 via-[#141210] to-amber-950/20 border-b border-stone-800/80 flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-[10px] font-bold tracking-wider uppercase flex items-center gap-1.5 border border-amber-500/30 font-mono">
                <UtensilsCrossed className="w-3 h-3 text-amber-400" />
                Carta & Menú Oficial
              </span>
              {restaurant.michelinGuide && (
                <span className="px-2.5 py-0.5 rounded-full bg-red-950/80 text-red-300 text-[10px] font-bold border border-red-500/30 font-mono uppercase tracking-wider">
                  Michelin {restaurant.michelinGuide}
                </span>
              )}
              <span className="px-2.5 py-0.5 rounded-full bg-stone-900 text-amber-300 text-[10px] font-bold flex items-center gap-1 border border-stone-700 font-mono">
                <span className="text-amber-400">★</span> {(menuData.googleRating || restaurant.rating).toFixed(1)} ({(menuData.googleReviewsCount || restaurant.reviewsCount).toLocaleString('es-ES')} reseñas)
              </span>
              {menuPhotosCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('photos');
                    setPhotoCategory('menu_board');
                  }}
                  className="px-2.5 py-0.5 rounded-full bg-amber-500 text-stone-950 hover:bg-amber-400 font-black text-[10px] flex items-center gap-1 cursor-pointer transition shadow-xs font-mono uppercase tracking-wider active:scale-95"
                  title="Ver fotos reales de la carta con precios de las reseñas"
                >
                  <span>📋 {menuPhotosCount} cartas con precios</span>
                </button>
              )}
              {menuData.source === 'google_places_live' && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 text-[10px] font-bold flex items-center gap-1 border border-emerald-500/30 font-mono uppercase tracking-wider">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Google Maps en vivo
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-100 tracking-wide flex items-center gap-2 truncate">
              {restaurant.name}
            </h2>
            <p className="text-xs sm:text-sm text-stone-400 truncate mt-1 font-light">
              <span className="text-amber-300 font-serif italic">{restaurant.nameVi}</span> • {restaurant.district}, {restaurant.city}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${restaurant.name} ${restaurant.address || restaurant.city || 'Vietnam'}`.trim())}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-200 hover:text-white border border-stone-800 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              title={`Ver ${restaurant.name} en Google Maps`}
            >
              <MapPin className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">Ver en Maps</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-stone-900/80 hover:bg-stone-800 text-stone-400 hover:text-white transition cursor-pointer border border-stone-800/60"
              aria-label="Cerrar carta"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
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

              {/* Quick Access Banner to Official Menu Board (Bảng Giá) & Receipt (Hóa Đơn) + Waiter Helper */}
              <div className="p-3.5 bg-gradient-to-r from-amber-950/35 via-stone-900/90 to-stone-900 border border-amber-500/25 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center gap-2.5 text-xs text-amber-200/90">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
                  <span>
                    Carta verificada de <strong className="text-white">{restaurant.name}</strong>. Pulsa <strong className="text-amber-300">"Mostrar"</strong> para enseñar el plato en vietnamita al camarero o el altavoz para su pronunciación.
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const boardIdx = menuData.photos.findIndex((p) => p.category === 'menu_board');
                      if (boardIdx !== -1) {
                        setSelectedPhotoIndex(boardIdx);
                        setZoomLevel(1);
                        setPanPosition({ x: 0, y: 0 });
                      } else {
                        setActiveTab('photos');
                        setPhotoCategory('menu_board');
                      }
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <span>📋 Ver Tablero Bảng Giá</span>
                  </button>
                  {billPhotosCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const billIdx = menuData.photos.findIndex((p) => p.category === 'bill');
                        if (billIdx !== -1) {
                          setSelectedPhotoIndex(billIdx);
                          setZoomLevel(1);
                          setPanPosition({ x: 0, y: 0 });
                        } else {
                          setActiveTab('photos');
                          setPhotoCategory('bill');
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <span>🧾 Ver Cuenta Real</span>
                    </button>
                  )}
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
                            <h4 className="text-xs font-semibold text-stone-200 mt-0.5">
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
              {/* Review Photos Action Bar: Live search & Custom Upload */}
              <div className="p-3.5 bg-gradient-to-r from-amber-950/30 via-stone-900 to-stone-900 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0 border border-amber-500/30">
                    📸
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-stone-100 flex items-center gap-2">
                      <span>Tableros de Precios (Bảng Giá), Cuentas y Fotos Reales</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/30">
                        {menuPhotosCount} con precios
                      </span>
                    </h3>
                    <p className="text-[11px] text-stone-400">
                      Cartas completas en alta definición, tickets de caja (hóa đơn) y fotos reales de comensales.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={handleFetchMoreMenuPhotos}
                    disabled={isSearchingReviewPhotos}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isSearchingReviewPhotos ? 'animate-spin' : ''}`} />
                    <span>{isSearchingReviewPhotos ? 'Buscando en Google Maps...' : 'Buscar más fotos en Google Maps'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowUploadModal(true)}
                    className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-stone-700"
                    title="Analizar mi propia foto de la carta o recibo con IA"
                  >
                    <span>📷 Analizar mi foto</span>
                  </button>
                </div>
              </div>

              {/* Photo Filter Pills */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                  {(
                    [
                      { id: 'all', label: `⭐ Todas las fotos (${menuData.photos.length})` },
                      { id: 'menu_board', label: `📋 Cartas con Precios (${menuData.photos.filter(p => p.category === 'menu_board').length})` },
                      { id: 'bill', label: `🧾 Cuentas & Facturas (${billPhotosCount})` },
                      { id: 'dish', label: `🍜 Platos servidos (${menuData.photos.filter(p => p.category === 'dish').length})` },
                      { id: 'atmosphere', label: `🏪 Local & Fachada (${menuData.photos.filter(p => p.category === 'atmosphere').length})` },
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
                  Pulsa en la imagen para abrir visor con lupa
                </span>
              </div>

              {/* Photos Grid */}
              {filteredPhotos.length === 0 ? (
                <div className="p-8 text-center text-stone-400 bg-stone-950/40 rounded-xl border border-stone-800 space-y-2">
                  <p className="text-sm">No hay fotos en esta categoría.</p>
                  <button
                    type="button"
                    onClick={() => setPhotoCategory('all')}
                    className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 text-xs font-semibold cursor-pointer"
                  >
                    Ver todas las fotos ({menuData.photos.length})
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  {filteredPhotos.map((photo, index) => {
                    const originalIndex = menuData.photos.findIndex((p) => p.id === photo.id);
                    const isScanning = isScanningPhotoId === photo.id;
                    const hasExtractedDishes = Array.isArray(photo.extractedDishes) && photo.extractedDishes.length > 0;
                    const isSvgDocument = photo.url.startsWith('data:image/svg+xml');
                    const isLiveGooglePhoto = photo.url.includes('/api/restaurants/photo');

                    return (
                      <div
                        key={photo.id}
                        className="group relative bg-stone-800 rounded-xl overflow-hidden border border-stone-700/60 hover:border-amber-500/60 transition shadow-md flex flex-col justify-between"
                      >
                        {/* Image Box */}
                        <div
                          onClick={() => {
                            setSelectedPhotoIndex(originalIndex !== -1 ? originalIndex : index);
                            setZoomLevel(1);
                            setPanPosition({ x: 0, y: 0 });
                          }}
                          className="relative aspect-4/3 w-full bg-stone-950 overflow-hidden cursor-pointer flex items-center justify-center"
                        >
                          <img
                            src={photo.url}
                            alt={photo.caption}
                            loading="lazy"
                            className={`w-full h-full transition duration-300 ${
                              isSvgDocument
                                ? 'object-contain p-1.5 group-hover:scale-102'
                                : 'object-cover group-hover:scale-105'
                            }`}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=800&q=80';
                            }}
                          />

                          {/* Badges on top */}
                          <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                            {photo.category === 'bill' && (
                              <span className="px-2 py-0.5 rounded bg-sky-600 text-white font-bold text-[10px] shadow-md flex items-center gap-1 font-mono uppercase tracking-wider">
                                🧾 Cuenta / Hóa Đơn
                              </span>
                            )}
                            {(photo.category === 'menu_board' || photo.isLegibleMenu) && photo.category !== 'bill' && (
                              <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px] shadow-md flex items-center gap-1 font-mono uppercase tracking-wider">
                                <Check className="w-3 h-3" />
                                Carta Bảng Giá
                              </span>
                            )}
                            {isLiveGooglePhoto && (
                              <span className="px-2 py-0.5 rounded bg-stone-900/90 text-amber-300 border border-amber-500/40 font-bold text-[10px] shadow-md font-mono">
                                📍 Google Maps
                              </span>
                            )}
                            {photo.isAiScanned && (
                              <span className="px-2 py-0.5 rounded bg-amber-500 text-stone-950 font-bold text-[10px] shadow-md font-mono">
                                ⚡ OCR IA
                              </span>
                            )}
                          </div>

                          {/* Hover Zoom Hint Overlay */}
                          <div className="absolute inset-0 bg-stone-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                            <div className="px-3 py-1.5 rounded-lg bg-stone-900/90 text-amber-400 font-bold text-xs flex items-center gap-1.5 border border-amber-500/40 shadow-lg">
                              <ZoomIn className="w-4 h-4" />
                              <span>Ampliar con lupa</span>
                            </div>
                          </div>
                        </div>

                        {/* Caption & Author Info */}
                        <div className="p-3 bg-stone-900 border-t border-stone-800/80 space-y-2">
                          <p className="text-xs font-semibold text-stone-200 line-clamp-2 leading-snug">
                            {photo.caption}
                          </p>
                          <div className="flex items-center justify-between text-[11px] text-stone-400">
                            <span className="truncate max-w-[140px]">
                              {photo.authorName ? `Foto: ${photo.authorName}` : 'Comensal verificado'}
                            </span>
                            {photo.relativeTime && (
                              <span className="shrink-0 text-stone-500">{photo.relativeTime}</span>
                            )}
                          </div>
                          {photo.reviewSnippet && (
                            <p className="text-[11px] text-amber-200/80 italic line-clamp-2">
                              "{photo.reviewSnippet}"
                            </p>
                          )}

                          {/* Extracted Legible Dishes from Photo */}
                          {hasExtractedDishes ? (
                            <div className="pt-2 border-t border-stone-800 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-between gap-1 text-[11px] font-bold text-emerald-400">
                                <div className="flex items-center gap-1">
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>Precios extraídos ({photo.extractedDishes!.length}):</span>
                                </div>
                                <span className="text-[10px] text-stone-400 font-normal">Pulsa para pedir</span>
                              </div>
                              <div className="space-y-1 max-h-36 overflow-y-auto no-scrollbar">
                                {photo.extractedDishes!.map((dish, dIdx) => (
                                  <div
                                    key={dIdx}
                                    className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-stone-950/70 border border-stone-800 text-[11px]"
                                  >
                                    <div className="min-w-0">
                                      <div className="font-semibold text-stone-200 truncate flex items-center gap-1">
                                        <span>{dish.nameVi}</span>
                                        <button
                                          type="button"
                                          onClick={() => speakVietnamese(dish.nameVi)}
                                          className="text-stone-400 hover:text-amber-300 cursor-pointer"
                                          title={`Pronunciar ${dish.nameVi}`}
                                        >
                                          <Volume2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                      {dish.nameEs && (
                                        <div className="text-[10px] text-stone-400 truncate">{dish.nameEs}</div>
                                      )}
                                    </div>
                                    <div className="text-right shrink-0 flex items-center gap-1">
                                      <span className="font-mono font-bold text-amber-400">
                                        {(dish.priceVnd / 1000).toLocaleString('es-ES')}k ₫
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const matched = menuData.items.find((it) => it.nameVi.toLowerCase() === dish.nameVi.toLowerCase());
                                          if (matched) {
                                            updateQuantity(matched.id, 1);
                                          } else {
                                            setWaiterDish({
                                              id: `photo-dish-${dIdx}`,
                                              nameVi: dish.nameVi,
                                              nameEs: dish.nameEs || dish.nameVi,
                                              description: dish.notes || dish.nameEs || dish.nameVi,
                                              priceVnd: dish.priceVnd,
                                              category: 'Platos Principales',
                                            });
                                          }
                                        }}
                                        className="px-1.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-[10px] cursor-pointer"
                                        title="Añadir al pedido o mostrar al camarero"
                                      >
                                        + Pedir
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="pt-2 border-t border-stone-800">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleScanPhoto(photo);
                                }}
                                disabled={isScanning}
                                className="w-full py-1.5 px-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                              >
                                <Sparkles className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                                <span>{isScanning ? 'Escaneando precios...' : 'Escanear precios con IA (OCR)'}</span>
                              </button>
                            </div>
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
              <div className="p-3.5 bg-stone-950/60 border border-stone-800 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs text-stone-300">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 font-bold text-sm">
                    ★ {(menuData.googleRating || restaurant.rating).toFixed(1)}
                  </span>
                  <span className="text-stone-300">
                    Basado en <strong>{(menuData.googleReviewsCount || restaurant.reviewsCount).toLocaleString('es-ES')}</strong> reseñas verificadas.
                  </span>
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${restaurant.name} ${restaurant.address || restaurant.city || 'Vietnam'}`.trim())}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 hover:text-amber-300 font-semibold underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Ver todas las reseñas</span>
                </a>
              </div>

              {menuData.recentReviews && menuData.recentReviews.length > 0 ? (
                menuData.recentReviews.map((rev, idx) => (
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
                          {'★'.repeat(Math.round(rev.rating || 5))}
                        </span>
                        <span className="text-[11px] text-stone-500 ml-1">{rev.relativeTime}</span>
                      </div>
                    </div>
                    <p className="text-xs text-stone-300 leading-relaxed">
                      "{rev.text}"
                    </p>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-stone-400 bg-stone-900/50 rounded-xl border border-stone-800">
                  <p className="text-xs">Cargando reseñas en vivo...</p>
                </div>
              )}
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
                      <strong>Servilletas húmedas (Khăn lạnh):</strong> En muchos restaurantes tradicionales te pondrán una toallita envasada. Si la abres, suelen cobrar entre 2.000 ₫ y 5.000 ₫ (0,10 €) al final en la cuenta.
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
                onClick={() => setHighContrastMode((m) => !m)}
                className={`px-2 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                  highContrastMode
                    ? 'bg-amber-500 text-stone-950 font-bold shadow'
                    : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                }`}
                title="Modo Lupa de Alto Contraste (para leer pizarras tenues o precios)"
              >
                <span>{highContrastMode ? '🔆 Lupa ON' : '🔆 Lupa Precios'}</span>
              </button>
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
                filter: highContrastMode ? 'contrast(1.45) brightness(1.15) saturate(1.1)' : 'none',
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
            className="px-4 py-2.5 bg-stone-900/90 rounded-xl border border-stone-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-stone-300 z-10 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span>
                🔍 Nivel de zoom: <strong className="text-amber-400">{Math.round(zoomLevel * 100)}%</strong>
                {zoomLevel > 1 && ' (Arrastra para mover)'}
              </span>
              {selectedPhotoIndex !== null && menuData.photos[selectedPhotoIndex]?.extractedDishes && (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  Texto y precios transcritos legibles
                </span>
              )}
              {selectedPhotoIndex !== null && !menuData.photos[selectedPhotoIndex]?.extractedDishes && (
                <button
                  type="button"
                  onClick={() => handleScanPhoto(menuData.photos[selectedPhotoIndex])}
                  disabled={isScanningPhotoId === menuData.photos[selectedPhotoIndex].id}
                  className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1 cursor-pointer transition shadow disabled:opacity-50"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isScanningPhotoId === menuData.photos[selectedPhotoIndex].id ? 'animate-spin' : ''}`} />
                  <span>{isScanningPhotoId === menuData.photos[selectedPhotoIndex].id ? 'Escaneando...' : 'Escanear precios con IA (OCR)'}</span>
                </button>
              )}
            </div>

            {selectedPhotoIndex !== null && menuData.photos[selectedPhotoIndex]?.extractedDishes && (
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-full no-scrollbar">
                {menuData.photos[selectedPhotoIndex].extractedDishes!.map((dish, dIdx) => (
                  <button
                    key={dIdx}
                    type="button"
                    onClick={() => setWaiterDish({
                      id: `lightbox-dish-${dIdx}`,
                      nameVi: dish.nameVi,
                      nameEs: dish.nameEs || dish.nameVi,
                      description: dish.notes || dish.nameEs || dish.nameVi,
                      priceVnd: dish.priceVnd,
                      category: 'Platos Principales',
                    })}
                    className="px-2 py-1 rounded-lg bg-stone-800 hover:bg-amber-500 hover:text-stone-950 text-stone-200 border border-stone-700 text-[11px] font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1"
                  >
                    <span>{dish.nameVi}</span>
                    <span className="font-mono text-amber-300 group-hover:text-stone-950 font-bold">
                      {(dish.priceVnd / 1000).toLocaleString('es-ES')}k
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* UPLOAD / PASTE MENU PHOTO MODAL */}
      {showUploadModal && (
        <div
          className="fixed inset-0 z-70 bg-stone-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowUploadModal(false)}
        >
          <div
            className="w-full max-w-md bg-stone-900 border border-amber-500/40 rounded-2xl p-5 shadow-2xl space-y-4 text-stone-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-amber-300 flex items-center gap-2">
                <span>📷 Analizar Foto de Carta o Recibo con IA</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-300">
              Sube una foto que hayas tomado tú mismo de la carta en el restaurante o pega el enlace URL de una foto de Google Maps para extraer automáticamente todos los platos y precios con IA.
            </p>

            <div className="space-y-3">
              <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 space-y-1.5">
                <label className="text-[11px] font-bold text-amber-400 block">
                  Opción 1: Subir imagen de tu galería o cámara
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const base64 = ev.target?.result as string;
                        if (base64) {
                          handleAnalyzeCustomPhoto(base64);
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full text-xs text-stone-300 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-500 file:text-stone-950 hover:file:bg-amber-400 cursor-pointer"
                />
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-stone-800"></div>
                <span className="shrink mx-2 text-[10px] text-stone-500 uppercase font-mono">o también</span>
                <div className="flex-grow border-t border-stone-800"></div>
              </div>

              <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 space-y-1.5">
                <label className="text-[11px] font-bold text-amber-400 block">
                  Opción 2: Pegar enlace URL de una foto de reseña
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://...foto-menu.jpg"
                    value={customPhotoInput}
                    onChange={(e) => setCustomPhotoInput(e.target.value)}
                    className="flex-1 bg-stone-900 border border-stone-750 rounded-xl px-3 py-1.5 text-xs text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAnalyzeCustomPhoto(customPhotoInput)}
                    disabled={!customPhotoInput.trim() || isScanningPhotoId === 'custom-upload'}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {isScanningPhotoId === 'custom-upload' ? 'Escaneando...' : 'Escanear'}
                  </button>
                </div>
              </div>
            </div>
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
