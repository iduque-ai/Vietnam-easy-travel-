/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { CurrencyConverter } from './components/CurrencyConverter';
import { VietnameseTranslator } from './components/VietnameseTranslator';
import { RestaurantFinder } from './components/RestaurantFinder';
import { TripPlanner } from './components/TripPlanner';
import { FreeTourGuide } from './components/FreeTourGuide';
import { MobileBottomNav } from './components/MobileBottomNav';
import { PermissionsModal } from './components/PermissionsModal';
import { EmergencyModal } from './components/EmergencyModal';
import { VoiceSettingsModal } from './components/VoiceSettingsModal';
import { ExchangeRatesData, ActiveTabType, PointOfInterest, CurrencyCode } from './types';
import { getSavedRates, saveRates } from './utils/storage';
import { fetchLiveExchangeRates } from './utils/currencyApi';
import { useItineraryState } from './utils/useItineraryState';
import { VIETNAM_SIMULATION_PRESETS } from './utils/geolocation';
import { getCurrencyInfo } from './utils/currencyUtils';
import { Wifi, WifiOff, Clock, ShieldCheck, HeartPulse } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTabType>('converter');
  const [translatorSubTab, setTranslatorSubTab] = useState<'conversation' | 'phrases' | 'food' | 'allergy' | undefined>(undefined);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>(() => {
    try {
      const saved = localStorage.getItem('vietnam_travel_preferred_currency');
      if (saved) return saved as CurrencyCode;
    } catch {
      // fallback
    }
    return 'EUR';
  });
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
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState<boolean>(false);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState<boolean>(false);
  const [isVoiceSettingsOpen, setIsVoiceSettingsOpen] = useState<boolean>(false);

  // Centralized shared itinerary state for Maps & Planner
  const itineraryState = useItineraryState();
  const [, setTargetMapRegionId] = useState<string>('reg-hanoi-north');

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

  const handleSelectCurrency = useCallback((currency: CurrencyCode) => {
    setSelectedCurrency(currency);
    try {
      localStorage.setItem('vietnam_travel_preferred_currency', currency);
    } catch {
      // ignore
    }
    const curr = getCurrencyInfo(currency);
    setOfflineToast(`Divisa de referencia: ${curr.flag} ${curr.name} (${curr.code})`);
    setTimeout(() => setOfflineToast(null), 3500);
  }, []);

  // Manual Online / Offline Mode Toggle
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

    if (navigator.onLine) {
      refreshRates(false, false);
    }
  }, [refreshRates]);

  // Vietnam local time helper (UTC+7) & Spain local time helper (Europe/Madrid)
  const [vietnamTime, setVietnamTime] = useState<string>('');
  const [spainTime, setSpainTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const vnFormatter = new Intl.DateTimeFormat('es-ES', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const esFormatter = new Intl.DateTimeFormat('es-ES', {
        timeZone: 'Europe/Madrid',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      setVietnamTime(vnFormatter.format(now));
      setSpainTime(esFormatter.format(now));
    };

    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-[100dvh] bg-[#FAF8F5] text-stone-900 flex flex-col font-sans overflow-x-hidden w-full max-w-full selection:bg-amber-200 selection:text-stone-900">
      {/* Quota Exceeded Sticky Banner */}
      {isMapsQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2 text-xs md:text-sm text-center sticky top-0 z-50">
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

      {/* Top Header with Navigation & Settings Drawer */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        ratesData={ratesData}
        isOnline={isOnline}
        isRefreshing={isRefreshing}
        onRefreshRates={() => refreshRates(true, true)}
        onSaveCustomRates={handleUpdateCustomRates}
        onOpenConversationMode={handleOpenConversationMode}
        onToggleOnlineMode={handleToggleOnlineMode}
        onOpenPermissionsModal={() => setIsPermissionsModalOpen(true)}
        onOpenEmergencyModal={() => setIsEmergencyModalOpen(true)}
        onOpenVoiceSettings={() => setIsVoiceSettingsOpen(true)}
        vietnamTime={vietnamTime}
        spainTime={spainTime}
        selectedCurrency={selectedCurrency}
        onSelectCurrency={handleSelectCurrency}
      />

      {/* Unified Voice & Pronunciation Modal */}
      <VoiceSettingsModal
        isOpen={isVoiceSettingsOpen}
        onClose={() => setIsVoiceSettingsOpen(false)}
        isOnline={isOnline}
      />

      {/* Permissions Modal */}
      <PermissionsModal
        isOpen={isPermissionsModalOpen}
        onClose={() => setIsPermissionsModalOpen(false)}
        onSelectSimulationPreset={(presetId) => {
          const preset = VIETNAM_SIMULATION_PRESETS.find((p) => p.id === presetId);
          if (preset) {
            setTargetMapRegionId(preset.regionId);
            setOfflineToast(`📍 Posición en Vietnam activada: ${preset.name}`);
            setTimeout(() => setOfflineToast(null), 3500);
          }
        }}
      />

      {/* Emergency & Consular Assistance Modal */}
      <EmergencyModal
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
        vietnamTime={vietnamTime}
        spainTime={spainTime}
      />

      {/* Floating Notification Toast */}
      {offlineToast && (
        <div className="fixed bottom-20 md:bottom-5 right-4 z-50 max-w-sm bg-stone-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-stone-800 text-xs flex items-center gap-3 animate-fade-in">
          {isOnline ? (
            <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          <span className="font-medium leading-snug">{offlineToast}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 pt-3 sm:pt-5 min-w-0 overflow-x-hidden pb-20 md:pb-8">
        {activeTab === 'converter' && (
          <CurrencyConverter
            ratesData={ratesData}
            isOnline={isOnline}
            onRefreshRates={() => refreshRates(true, true)}
            onSaveCustomRates={handleUpdateCustomRates}
            isRefreshing={isRefreshing}
            selectedCurrency={selectedCurrency}
          />
        )}

        {activeTab === 'translator' && (
          <VietnameseTranslator
            isOnline={isOnline}
            initialSubTab={translatorSubTab}
            onOpenVoiceSettings={() => setIsVoiceSettingsOpen(true)}
          />
        )}

        {activeTab === 'restaurants' && (
          <RestaurantFinder
            ratesData={ratesData}
            isOnline={isOnline}
            itineraryState={itineraryState}
            onNavigateToItinerary={() => setActiveTab('trip')}
            onToggleOnlineMode={handleToggleOnlineMode}
            onOpenPermissionsModal={() => setIsPermissionsModalOpen(true)}
            onNavigateToAllergies={() => {
              setTranslatorSubTab('allergy');
              setActiveTab('translator');
            }}
            selectedCurrency={selectedCurrency}
          />
        )}

        {(activeTab === 'trip' || activeTab === 'itinerary' || activeTab === 'maps') && (
          <TripPlanner
            ratesData={ratesData}
            isOnline={isOnline}
            itineraryState={itineraryState}
            selectedCurrency={selectedCurrency}
            onStartFreeTour={handleStartFreeTour}
            onOpenPermissionsModal={() => setIsPermissionsModalOpen(true)}
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

      {/* Clean, Lightweight Utility Footer */}
      <footer
        className="bg-white/80 backdrop-blur-md text-stone-600 border-t border-stone-200/80 py-3 text-xs"
        style={{ paddingBottom: 'calc(4.75rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap items-center justify-between gap-3">
          {/* Dual Time */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 bg-stone-100/90 px-2.5 py-1 rounded-lg border border-stone-200/70">
              <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="text-stone-500">Vietnam:</span>
              <strong className="font-mono text-stone-900 tabular-nums">{vietnamTime || '--:--'}</strong>
            </div>

            <div className="flex items-center gap-1.5 bg-stone-100/90 px-2.5 py-1 rounded-lg border border-stone-200/70">
              <Clock className="w-3.5 h-3.5 text-stone-500 shrink-0" />
              <span className="text-stone-500">España:</span>
              <strong className="font-mono text-stone-900 tabular-nums">{spainTime || '--:--'}</strong>
            </div>
          </div>

          {/* Emergency Quick Call Links */}
          <div className="flex items-center gap-2 text-xs">
            <a
              href="tel:115"
              className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100/80 text-rose-800 px-2.5 py-1 rounded-lg border border-rose-200/80 font-medium transition active:scale-95"
              title="Llamar a Ambulancia / Emergencias médicas (115)"
            >
              <HeartPulse className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>Ambulancia:</span>
              <strong className="font-mono font-bold">115</strong>
            </a>

            <a
              href="tel:113"
              className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-200/80 font-medium transition active:scale-95"
              title="Llamar a Policía de Vietnam (113)"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Policía:</span>
              <strong className="font-mono font-bold">113</strong>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
