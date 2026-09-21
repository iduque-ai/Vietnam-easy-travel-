/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { CurrencyConverter } from './components/CurrencyConverter';
import { VietnameseTranslator } from './components/VietnameseTranslator';
import { DownloadableMaps } from './components/DownloadableMaps';
import { ItineraryPlanner } from './components/ItineraryPlanner';
import { ExchangeRatesData, ActiveTabType } from './types';
import { getSavedRates, saveRates, isRatesStale } from './utils/storage';
import { Compass, Wifi, WifiOff, Clock, ShieldCheck, HelpCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTabType>('converter');
  const [translatorSubTab, setTranslatorSubTab] = useState<'conversation' | 'phrases' | 'food' | 'allergy' | undefined>(undefined);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [ratesData, setRatesData] = useState<ExchangeRatesData>(getSavedRates);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [offlineToast, setOfflineToast] = useState<string | null>(null);

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

  // Fetch exchange rates once a day (or on demand)
  const refreshRates = useCallback(async (force = false) => {
    if (!navigator.onLine && !force) {
      return;
    }

    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/rates${force ? '?force=true' : ''}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.rates && data.rates.VND) {
          const freshData: ExchangeRatesData = {
            timestamp: data.lastUpdated || Date.now(),
            date: data.date || new Date().toISOString().split('T')[0],
            base: data.base || 'USD',
            rates: data.rates,
            source: data.source || 'live_network',
          };
          setRatesData(freshData);
          saveRates(freshData);
        }
      }
    } catch (err) {
      console.warn('Could not refresh exchange rates from server, using cached/fallback:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Monitor online / offline state
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setOfflineToast('Conexión reestablecida. Actualizando tasas online...');
      setTimeout(() => setOfflineToast(null), 3500);
      // Automatically refresh rates when regaining network connectivity
      refreshRates();
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
      refreshRates();
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
      {/* Top Header with Navigation & Rates Ticker */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        ratesData={ratesData}
        isOnline={isOnline}
        isRefreshing={isRefreshing}
        onRefreshRates={() => refreshRates(true)}
        onOpenConversationMode={handleOpenConversationMode}
      />

      {/* Floating Offline Notification Toast */}
      {offlineToast && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-stone-900 text-white px-4 py-3 rounded-xl shadow-xl border border-stone-700 text-xs flex items-center gap-3 animate-fade-in">
          {isOnline ? (
            <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          <span>{offlineToast}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-4 py-6 sm:py-8 min-w-0 overflow-x-hidden">
        {activeTab === 'converter' && (
          <CurrencyConverter
            ratesData={ratesData}
            isOnline={isOnline}
            onRefreshRates={() => refreshRates(true)}
            isRefreshing={isRefreshing}
          />
        )}

        {activeTab === 'translator' && (
          <VietnameseTranslator isOnline={isOnline} initialSubTab={translatorSubTab} />
        )}

        {activeTab === 'maps' && (
          <DownloadableMaps
            ratesData={ratesData}
            isOnline={isOnline}
            onNavigateToItinerary={() => setActiveTab('itinerary')}
          />
        )}

        {activeTab === 'itinerary' && (
          <ItineraryPlanner
            ratesData={ratesData}
            isOnline={isOnline}
            onNavigateToMaps={() => setActiveTab('maps')}
          />
        )}
      </main>

      {/* Bottom Sticky Footer with Essential Vietnam Travel Facts */}
      <footer className="bg-stone-900 text-stone-400 border-t border-stone-800 py-6 text-xs">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-base">🇻🇳</span>
            <span className="font-semibold text-stone-200">Vietnam Travel Companion</span>
            <span className="text-stone-500">•</span>
            <span className="text-stone-400">Diseñado para funcionar 100% sin conexión en todo Vietnam</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-stone-300">
            <div className="flex items-center gap-1.5 bg-stone-800/80 px-2.5 py-1 rounded-md border border-stone-700">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Hora en Vietnam (UTC+7): </span>
              <strong className="font-mono text-amber-300">{vietnamTime || '--:--:--'}</strong>
            </div>

            <div className="flex items-center gap-1.5 bg-stone-800/80 px-2.5 py-1 rounded-md border border-stone-700">
              <span>🔌 Enchufes: Tipo A, C y G (220V)</span>
            </div>

            <div className="flex items-center gap-1.5 bg-stone-800/80 px-2.5 py-1 rounded-md border border-stone-700">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Policía Turística: 113</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
