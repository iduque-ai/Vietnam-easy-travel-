/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { CurrencyConverter } from './components/CurrencyConverter';
import { VietnameseTranslator } from './components/VietnameseTranslator';
import { RestaurantFinder } from './components/RestaurantFinder';
import { DownloadableMaps } from './components/DownloadableMaps';
import { ItineraryPlanner } from './components/ItineraryPlanner';
import { FreeTourGuide } from './components/FreeTourGuide';
import { MobileBottomNav } from './components/MobileBottomNav';
import { ExchangeRatesData, ActiveTabType, PointOfInterest } from './types';
import { getSavedRates, saveRates, isRatesStale } from './utils/storage';
import { fetchLiveExchangeRates } from './utils/currencyApi';
import { useItineraryState } from './utils/useItineraryState';
import { Compass, Wifi, WifiOff, Clock, ShieldCheck, HelpCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTabType>('converter');
  const [translatorSubTab, setTranslatorSubTab] = useState<'conversation' | 'phrases' | 'food' | 'allergy' | undefined>(undefined);
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    try {
      const override = localStorage.getItem('vietnam_travel_online_manual_override');
      if (override === 'offline') return false;
      if (override === 'online') return true;
    } catch {
      // fallback
    }
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [ratesData, setRatesData] = useState<ExchangeRatesData>(getSavedRates);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [offlineToast, setOfflineToast] = useState<string | null>(null);
  const [isMapsQuotaExceeded, setIsMapsQuotaExceeded] = useState<boolean>(false);
  const [freeTourTargetPoi, setFreeTourTargetPoi] = useState<PointOfInterest | null>(null);

  // Centralized shared itinerary state for Maps & Planner
  const itineraryState = useItineraryState();
  const [targetMapRegionId, setTargetMapRegionId] = useState<string>('reg-hanoi-north');

  const handleNavigateToMaps = useCallback(
    (dayId?: string) => {
      if (dayId) {
        itineraryState.setSelectedDayId(dayId);
        const activePlan = itineraryState.activePlan;
        if (activePlan) {
          const day = activePlan.days.find((d) => d.id === dayId);
          if (day) {
            const city = day.destinationCity.toLowerCase();
            if (
              city.includes('huế') ||
              city.includes('hội an') ||
              city.includes('đà nẵng') ||
              city.includes('phong nha')
            ) {
              setTargetMapRegionId('reg-central');
            } else if (
              city.includes('hồ chí minh') ||
              city.includes('saigon') ||
              city.includes('mekong') ||
              city.includes('cần thơ')
            ) {
              setTargetMapRegionId('reg-saigon-south');
            } else if (
              city.includes('hạ long') ||
              city.includes('vịnh') ||
              city.includes('ba bể') ||
              city.includes('cát bà')
            ) {
              setTargetMapRegionId('reg-nature');
            } else {
              setTargetMapRegionId('reg-hanoi-north');
            }
          }
        }
      }
      setActiveTab('maps');
    },
    [itineraryState]
  );

  const handleStartFreeTour = useCallback((poi?: PointOfInterest | null) => {
    if (poi) {
      setFreeTourTargetPoi(poi);
    }
    setActiveTab('freetour');
  }, []);

  useEffect(() => {
    const handleQuota = () => setIsMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  // Check URL parameters/hash on load (e.g. #conversation or ?mode=conversation)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      if (hash.includes('conversation') || params.get('mode') === 'conversation') {
        setActiveTab('translator');
        setTranslatorSubTab('conversation');
      }
    }
  }, []);

  const handleOpenConversationMode = useCallback(() => {
    setActiveTab('translator');
    setTranslatorSubTab('conversation');
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', '#conversation');
    }
  }, []);

  // Fetch exchange rates from live providers with fallback and user feedback
  const refreshRates = useCallback(async (force = false, showFeedbackToast = false) => {
    if (!navigator.onLine && !force) {
      if (showFeedbackToast) {
        setOfflineToast('Sin conexión a internet. Manteniendo última tasa guardada.');
        setTimeout(() => setOfflineToast(null), 3500);
      }
      return;
    }

    setIsRefreshing(true);
    try {
      const freshData = await fetchLiveExchangeRates();
      if (freshData && freshData.rates && freshData.rates.VND) {
        setRatesData(freshData);
        saveRates(freshData);
        if (showFeedbackToast) {
          const eurVnd = Math.round(freshData.rates.VND / (freshData.rates.EUR || 0.8965));
          setOfflineToast(`¡Tasa actualizada en directo! 1 € ≈ ${eurVnd.toLocaleString('es-ES')} ₫`);
          setTimeout(() => setOfflineToast(null), 3500);
        }
      } else if (showFeedbackToast) {
        setOfflineToast('No se pudo conectar a los servidores de divisas. Manteniendo última tasa guardada.');
        setTimeout(() => setOfflineToast(null), 3500);
      }
    } catch (err) {
      console.warn('Could not refresh exchange rates:', err);
      if (showFeedbackToast) {
        setOfflineToast('Error de red al actualizar tasa. Se mantiene la última guardada.');
        setTimeout(() => setOfflineToast(null), 3500);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const handleUpdateCustomRates = useCallback((newRates: ExchangeRatesData) => {
    setRatesData(newRates);
    saveRates(newRates);
    const eurVnd = Math.round(newRates.rates.VND / (newRates.rates.EUR || 0.8965));
    setOfflineToast(`Tasa personalizada guardada: 1 € = ${eurVnd.toLocaleString('es-ES')} ₫`);
    setTimeout(() => setOfflineToast(null), 3500);
  }, []);

  // Manual Online / Offline Mode Toggle (triggered by top banner green dot)
  const handleToggleOnlineMode = useCallback(() => {
    setIsOnline((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('vietnam_travel_online_manual_override', next ? 'online' : 'offline');
      } catch {
        // ignore
      }
      setOfflineToast(
        next
          ? 'Modo Online activado: Búsqueda completa de restaurantes en tiempo real e IA activa.'
          : 'Modo Offline activado: Funcionando 100% sin datos con catálogo y mapas guardados.'
      );
      setTimeout(() => setOfflineToast(null), 3500);
      if (next) {
        refreshRates(false, true);
      }
      return next;
    });
  }, [refreshRates]);

  // Monitor online / offline state from browser network events
  useEffect(() => {
    const handleOnline = () => {
      // Only auto-switch if no strict manual offline override was set
      try {
        const override = localStorage.getItem('vietnam_travel_online_manual_override');
        if (override === 'offline') return;
      } catch {
        // ignore
      }
      setIsOnline(true);
      setOfflineToast('Conexión reestablecida. Actualizando tasas online...');
      setTimeout(() => setOfflineToast(null), 3500);
      refreshRates(false, true);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setOfflineToast('Modo sin conexión activado. La app sigue 100% funcional con tasas y mapas en caché.');
      setTimeout(() => setOfflineToast(null), 4000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshRates]);

  // Initial mount: load cached rates immediately, then automatically update from network upon entering
  useEffect(() => {
    const current = getSavedRates();
    setRatesData(current);

    // Automatically update the exchange rate upon entering the web if network is available
    if (navigator.onLine) {
      refreshRates(false, false);
    }
  }, [refreshRates]);

  // Vietnam local time helper (UTC+7)
  const [vietnamTime, setVietnamTime] = useState<string>('');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const vnFormatter = new Intl.DateTimeFormat('es-ES', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      setVietnamTime(vnFormatter.format(now));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-stone-100 text-stone-800 flex flex-col font-sans overflow-x-hidden w-full max-w-full">
      {/* Quota Exceeded Sticky Banner */}
      {isMapsQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Top Header with Navigation & Rates Ticker */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        ratesData={ratesData}
        isOnline={isOnline}
        isRefreshing={isRefreshing}
        onRefreshRates={() => refreshRates(true, true)}
        onOpenConversationMode={handleOpenConversationMode}
        onToggleOnlineMode={handleToggleOnlineMode}
      />

      {/* Floating Offline Notification Toast (positioned above mobile bottom nav) */}
      {offlineToast && (
        <div className="fixed bottom-20 md:bottom-4 right-4 z-50 max-w-sm bg-stone-900 text-white px-4 py-3 rounded-xl shadow-xl border border-stone-700 text-xs flex items-center gap-3 animate-fade-in">
          {isOnline ? (
            <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          <span>{offlineToast}</span>
        </div>
      )}

      {/* Main Content Area: with bottom padding for mobile navigation */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-8 min-w-0 overflow-x-hidden pb-24 md:pb-8">
        {activeTab === 'converter' && (
          <CurrencyConverter
            ratesData={ratesData}
            isOnline={isOnline}
            onRefreshRates={() => refreshRates(true, true)}
            onSaveCustomRates={handleUpdateCustomRates}
            isRefreshing={isRefreshing}
          />
        )}

        {activeTab === 'translator' && (
          <VietnameseTranslator isOnline={isOnline} initialSubTab={translatorSubTab} />
        )}

        {activeTab === 'restaurants' && (
          <RestaurantFinder
            ratesData={ratesData}
            isOnline={isOnline}
            itineraryState={itineraryState}
            onNavigateToItinerary={() => setActiveTab('itinerary')}
            onToggleOnlineMode={handleToggleOnlineMode}
          />
        )}

        {activeTab === 'maps' && (
          <DownloadableMaps
            ratesData={ratesData}
            isOnline={isOnline}
            onNavigateToItinerary={() => setActiveTab('itinerary')}
            onStartFreeTour={handleStartFreeTour}
            itineraryState={itineraryState}
            initialRegionId={targetMapRegionId}
          />
        )}

        {activeTab === 'itinerary' && (
          <ItineraryPlanner
            ratesData={ratesData}
            isOnline={isOnline}
            onNavigateToMaps={handleNavigateToMaps}
            onStartFreeTour={handleStartFreeTour}
            itineraryState={itineraryState}
          />
        )}

        {activeTab === 'freetour' && (
          <FreeTourGuide
            initialPoi={freeTourTargetPoi}
            onClearInitialPoi={() => setFreeTourTargetPoi(null)}
            isOnline={isOnline}
          />
        )}
      </main>

      {/* Fixed Bottom Navigation for Mobile Devices */}
      <MobileBottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Bottom Sticky Footer with Essential Vietnam Travel Facts */}
      <footer className="bg-stone-900 text-stone-400 border-t border-stone-800 py-4 text-xs mb-16 md:mb-0">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="text-base" role="img" aria-label="Vietnam">🇻🇳</span>
            <span className="font-semibold text-stone-200">Vietnam Travel Companion</span>
            <span className="text-stone-600 hidden sm:inline">·</span>
            <span className="text-stone-400 text-[11px] hidden sm:inline">100% funcional sin conexión</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-stone-300">
            <div className="flex items-center gap-1.5 bg-stone-800/80 px-2.5 py-1 rounded-lg border border-stone-700/80">
              <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Vietnam (UTC+7): </span>
              <strong className="font-mono text-amber-300">{vietnamTime || '--:--:--'}</strong>
            </div>

            <div className="flex items-center gap-1 bg-stone-800/80 px-2.5 py-1 rounded-lg border border-stone-700/80">
              <span>🔌 220V (A, C, G)</span>
            </div>

            <div className="flex items-center gap-1 bg-stone-800/80 px-2.5 py-1 rounded-lg border border-stone-700/80">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Policía: 113</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
