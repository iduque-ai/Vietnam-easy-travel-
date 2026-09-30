import React, { useState } from 'react';
import {
  Calculator,
  Clock,
  HelpCircle,
  AlertTriangle,
  Sparkles,
  TrendingDown,
  RefreshCw,
  Sliders,
  Check,
  RotateCcw,
  Globe,
  SlidersHorizontal,
} from 'lucide-react';
import { CurrencyCode, ExchangeRatesData } from '../types';
import { BanknoteGuideModal } from './BanknoteGuideModal';

interface CurrencyConverterProps {
  ratesData: ExchangeRatesData;
  isOnline: boolean;
  onRefreshRates: () => void;
  onSaveCustomRates?: (newRates: ExchangeRatesData) => void;
  isRefreshing: boolean;
}

const CURRENCIES: { code: CurrencyCode; name: string; symbol: string; flag: string }[] = [
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'USD', name: 'Dólar USA', symbol: '$', flag: '🇺🇸' },
  { code: 'GBP', name: 'Libra Esterlina', symbol: '£', flag: '🇬🇧' },
  { code: 'AUD', name: 'Dólar Australiano', symbol: 'A$', flag: '🇦🇺' },
  { code: 'CAD', name: 'Dólar Canadiense', symbol: 'C$', flag: '🇨🇦' },
  { code: 'JPY', name: 'Yen Japonés', symbol: '¥', flag: '🇯🇵' },
  { code: 'CHF', name: 'Franco Suizo', symbol: 'CHF', flag: '🇨🇭' },
  { code: 'MXN', name: 'Peso Mexicano', symbol: 'Mex$', flag: '🇲🇽' },
  { code: 'SGD', name: 'Dólar Singapur', symbol: 'S$', flag: '🇸🇬' },
  { code: 'THB', name: 'Baht Tailandés', symbol: '฿', flag: '🇹🇭' },
];

export const CurrencyConverter: React.FC<CurrencyConverterProps> = ({
  ratesData,
  isOnline,
  onRefreshRates,
  onSaveCustomRates,
  isRefreshing,
}) => {
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('EUR');
  const [vndAmount, setVndAmount] = useState<string>('');

  // Custom rate editor state
  const [isCustomEditorOpen, setIsCustomEditorOpen] = useState<boolean>(false);
  const [customRateInput, setCustomRateInput] = useState<string>('');

  // Calculate rate: Rates are relative to USD base
  const usdVndRate = ratesData.rates['VND'] || 26000;
  const foreignUsdRate = ratesData.rates[selectedCurrency] || (selectedCurrency === 'USD' ? 1 : 0.8965);
  const foreignToVndRate = usdVndRate / foreignUsdRate;

  // Initialize empty
  const [foreignAmount, setForeignAmount] = useState<string>('');

  // Bargaining tool state (fixed at 40% discount)
  const [quotedVnd, setQuotedVnd] = useState<string>('300000');
  const targetDiscount = 40;

  // Banknote guide modal state
  const [isBanknoteGuideOpen, setIsBanknoteGuideOpen] = useState<boolean>(false);

  // Formatting helpers: Dongs NEVER have decimals (0 decimals, rounded integer); Foreign has EXACTLY 2 decimals
  const formatVND = (num: number) => Math.round(num).toLocaleString('es-ES') + ' ₫';
  const formatForeign = (num: number, symbol: string) => {
    return num.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + symbol;
  };

  const currSymbol = CURRENCIES.find((c) => c.code === selectedCurrency)?.symbol || selectedCurrency;

  // Handlers
  const handleVndChange = (valStr: string) => {
    // Only integers for VND (no decimals in dongs)
    const clean = valStr.replace(/\D/g, '');
    setVndAmount(clean);
    const num = parseFloat(clean) || 0;
    const converted = num / foreignToVndRate;
    setForeignAmount(converted ? converted.toFixed(2) : '');
  };

  const handleForeignChange = (valStr: string) => {
    // Allow decimal input with period or comma for foreign currencies (euros, usd)
    const clean = valStr.replace(/,/g, '.').replace(/[^\d.]/g, '');
    setForeignAmount(clean);
    const num = parseFloat(clean) || 0;
    const converted = Math.round(num * foreignToVndRate);
    setVndAmount(converted ? converted.toString() : '');
  };

  const handleForeignBlur = () => {
    // Format to 2 decimals when leaving the field
    if (foreignAmount) {
      const num = parseFloat(foreignAmount);
      if (!isNaN(num)) {
        setForeignAmount(num.toFixed(2));
      }
    }
  };

  const handleCurrencyChange = (newCode: CurrencyCode) => {
    setSelectedCurrency(newCode);
    const newForeignUsd = ratesData.rates[newCode] || (newCode === 'USD' ? 1 : 0.92);
    const newRate = usdVndRate / newForeignUsd;
    if (vndAmount) {
      const numVnd = parseFloat(vndAmount) || 0;
      setForeignAmount((numVnd / newRate).toFixed(2));
    }
  };

  const setExactVnd = (val: number) => {
    // VND is integer
    setVndAmount(Math.round(val).toString());
    const converted = val / foreignToVndRate;
    setForeignAmount(converted.toFixed(2));
  };

  const addVnd = (val: number) => {
    const current = parseFloat(vndAmount) || 0;
    const updated = Math.round(current + val);
    setExactVnd(updated);
  };

  const clearAmount = () => {
    setVndAmount('');
    setForeignAmount('');
  };

  // Bargaining calculations (0 decimals for dongs, 2 decimals for foreign currency)
  const parsedQuote = parseFloat(quotedVnd.replace(/\D/g, '')) || 0;
  const initialCounterOffer = Math.round((parsedQuote * (100 - targetDiscount)) / 100);
  const fairDealMax = Math.round((parsedQuote * (100 - (targetDiscount - 10))) / 100);

  // Rate freshness label (ultra compact numeric date e.g. 25/09 17:32)
  const d = new Date(ratesData.timestamp);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const dateFormatted = `${day}/${month} ${hours}:${minutes}`;

  const handleAddThousandMultiplier = () => {
    const current = parseFloat(vndAmount) || 0;
    if (current > 0) {
      setExactVnd(current * 1000);
    }
  };

  const handleOpenCustomEditor = () => {
    setCustomRateInput(Math.round(foreignToVndRate).toString());
    setIsCustomEditorOpen(!isCustomEditorOpen);
  };

  const handleApplyCustomRate = (targetRate: number) => {
    if (!targetRate || targetRate <= 0) return;
    const baseForeignUsd = ratesData.rates[selectedCurrency] || (selectedCurrency === 'USD' ? 1 : 0.8965);
    const newUsdVnd = Math.round(targetRate * baseForeignUsd);

    const updatedRates: ExchangeRatesData = {
      ...ratesData,
      timestamp: Date.now(),
      date: new Date().toISOString().split('T')[0],
      rates: {
        ...ratesData.rates,
        VND: newUsdVnd,
      },
      source: 'manual_custom',
    };

    if (onSaveCustomRates) {
      onSaveCustomRates(updatedRates);
    }
    setIsCustomEditorOpen(false);
  };

  return (
    <div className="space-y-3 sm:space-y-4 max-w-4xl mx-auto">
      {/* Main Converter Card */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-5 border border-stone-200/90 shadow-[0_4px_20px_rgba(28,25,23,0.04)] space-y-3">
        {/* Discreet Currency Selector */}
        <div className="flex items-center justify-end">
          <div className="inline-flex items-center">
            <select
              id="currency-select"
              aria-label="Seleccionar divisa"
              value={selectedCurrency}
              onChange={(e) => handleCurrencyChange(e.target.value as CurrencyCode)}
              className="bg-stone-50 hover:bg-stone-100 text-stone-700 text-[11px] sm:text-xs py-0.5 px-2 rounded-lg border border-stone-200 focus:outline-none focus:ring-1 focus:ring-amber-500/30 cursor-pointer transition font-medium"
            >
              {CURRENCIES.map((curr) => (
                <option key={curr.code} value={curr.code}>
                  {curr.flag} {curr.code} ({curr.symbol})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Big Dual Display / Input Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3.5 items-stretch">
          {/* VND Box */}
          <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 border-stone-200/90 bg-gradient-to-br from-amber-500/[0.04] to-transparent focus-within:border-amber-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-amber-500/10 transition-all shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-stone-500 mb-0.5">
              <span className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg leading-none">🇻🇳</span>
                <span className="font-bold text-stone-800 text-xs sm:text-sm">Đồng Vietnamita (VND)</span>
              </span>
              <span className="text-[10px] sm:text-[11px] font-mono font-medium text-amber-700 bg-amber-100/70 px-1.5 py-0.5 rounded-md">
                Sin decimales
              </span>
            </div>

            <div className="relative my-1 sm:my-1.5">
              <input
                id="input-vnd"
                type="text"
                inputMode="numeric"
                value={vndAmount ? parseInt(vndAmount, 10).toLocaleString('es-ES') : ''}
                onChange={(e) => handleVndChange(e.target.value)}
                placeholder="0"
                className="w-full text-2xl sm:text-3xl lg:text-4xl font-extrabold font-mono tabular-nums text-stone-900 bg-transparent border-none focus:outline-none pr-8 py-0.5 tracking-tight"
              />
              <span className="absolute right-0 top-1/2 -translate-y-1/2 text-lg sm:text-xl font-bold text-amber-600/70">
                ₫
              </span>
            </div>

            <div className="pt-1.5 border-t border-stone-100 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs text-stone-600 font-semibold">
                  {vndAmount ? `${(parseFloat(vndAmount) / 1000).toLocaleString('es-ES')}k VND` : '0k VND'}
                </span>
                <button
                  type="button"
                  onClick={handleAddThousandMultiplier}
                  title="Añadir 3 ceros (×1000)"
                  className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md bg-amber-500 text-stone-950 font-bold text-[10px] sm:text-[11px] transition cursor-pointer hover:bg-amber-400 active:scale-95 shadow-2xs"
                >
                  +3 ceros (k)
                </button>
              </div>
              {vndAmount && (
                <button
                  onClick={clearAmount}
                  className="text-stone-400 hover:text-rose-600 text-xs flex items-center gap-1 cursor-pointer transition font-medium"
                  title="Borrar importe"
                >
                  <span>Borrar</span>
                </button>
              )}
            </div>
          </div>

          {/* Foreign Currency Box */}
          <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 border-stone-200/90 bg-stone-50/60 focus-within:border-amber-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-amber-500/10 transition-all shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-stone-500 mb-0.5">
              <span className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg leading-none">
                  {CURRENCIES.find((c) => c.code === selectedCurrency)?.flag}
                </span>
                <span className="font-bold text-stone-800 text-xs sm:text-sm">{selectedCurrency} ({currSymbol})</span>
              </span>
              <span className="text-[10px] sm:text-[11px] font-mono text-stone-500">
                2 decimales
              </span>
            </div>

            <div className="relative my-1 sm:my-1.5">
              <input
                id="input-foreign"
                type="text"
                inputMode="decimal"
                value={foreignAmount}
                onChange={(e) => handleForeignChange(e.target.value)}
                onBlur={handleForeignBlur}
                placeholder="0.00"
                className="w-full text-2xl sm:text-3xl lg:text-4xl font-extrabold font-mono tabular-nums text-stone-900 bg-transparent border-none focus:outline-none pr-8 py-0.5 tracking-tight"
              />
              <span className="absolute right-0 top-1/2 -translate-y-1/2 text-lg sm:text-xl font-bold text-stone-400">
                {currSymbol}
              </span>
            </div>

            <div className="pt-1.5 border-t border-stone-100 flex items-center justify-between">
              <span className="font-mono text-xs text-stone-600">
                1 {currSymbol} ≈ {Math.round(foreignToVndRate).toLocaleString('es-ES')} ₫
              </span>
              {foreignAmount && (
                <button
                  onClick={clearAmount}
                  className="text-stone-400 hover:text-rose-600 text-xs flex items-center gap-1 cursor-pointer transition font-medium"
                  title="Borrar importe"
                >
                  <span>Borrar</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Banknote buttons that add to total */}
        <div className="pt-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-stone-500">
              Añadir billetes al cálculo:
            </span>
            {vndAmount && parseFloat(vndAmount) > 0 && (
              <button
                onClick={clearAmount}
                className="text-amber-700 hover:text-amber-900 font-semibold text-xs underline cursor-pointer transition"
              >
                Poner a cero (0 ₫)
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
            {/* 10.000 */}
            <button
              onClick={() => addVnd(10000)}
              className="p-2 sm:p-2.5 rounded-xl border border-amber-300/80 bg-amber-50/60 hover:bg-amber-100/80 active:scale-[0.98] text-left transition cursor-pointer shadow-2xs group"
            >
              <div className="font-bold text-xs sm:text-sm text-amber-950 font-mono tabular-nums group-hover:text-amber-800">
                +10.000 ₫
              </div>
              <div className="text-[11px] sm:text-xs font-semibold text-stone-600 mt-0.5 font-mono tabular-nums">
                ≈ {formatForeign(10000 / foreignToVndRate, currSymbol)}
              </div>
              <div className="text-[10px] text-amber-700/80 font-medium truncate mt-0.5">Petróleo offshore</div>
            </button>

            {/* 20.000 */}
            <button
              onClick={() => addVnd(20000)}
              className="p-2 sm:p-2.5 rounded-xl border border-blue-300/80 bg-blue-50/60 hover:bg-blue-100/80 active:scale-[0.98] text-left transition cursor-pointer shadow-2xs group"
            >
              <div className="font-bold text-xs sm:text-sm text-blue-950 font-mono tabular-nums group-hover:text-blue-800">
                +20.000 ₫
              </div>
              <div className="text-[11px] sm:text-xs font-semibold text-stone-600 mt-0.5 font-mono tabular-nums">
                ≈ {formatForeign(20000 / foreignToVndRate, currSymbol)}
              </div>
              <div className="text-[10px] text-blue-700/80 font-medium truncate mt-0.5">Puente Hoi An</div>
            </button>

            {/* 50.000 */}
            <button
              onClick={() => addVnd(50000)}
              className="p-2 sm:p-2.5 rounded-xl border border-fuchsia-300/80 bg-fuchsia-50/60 hover:bg-fuchsia-100/80 active:scale-[0.98] text-left transition cursor-pointer shadow-2xs group"
            >
              <div className="font-bold text-xs sm:text-sm text-fuchsia-950 font-mono tabular-nums group-hover:text-fuchsia-800">
                +50.000 ₫
              </div>
              <div className="text-[11px] sm:text-xs font-semibold text-stone-600 mt-0.5 font-mono tabular-nums">
                ≈ {formatForeign(50000 / foreignToVndRate, currSymbol)}
              </div>
              <div className="text-[10px] text-fuchsia-700/80 font-medium truncate mt-0.5">Pabellón de Huế</div>
            </button>

            {/* 100.000 */}
            <button
              onClick={() => addVnd(100000)}
              className="p-2 sm:p-2.5 rounded-xl border border-emerald-300/80 bg-emerald-50/60 hover:bg-emerald-100/80 active:scale-[0.98] text-left transition cursor-pointer shadow-2xs group"
            >
              <div className="font-bold text-xs sm:text-sm text-emerald-950 font-mono tabular-nums group-hover:text-emerald-800">
                +100.000 ₫
              </div>
              <div className="text-[11px] sm:text-xs font-semibold text-stone-600 mt-0.5 font-mono tabular-nums">
                ≈ {formatForeign(100000 / foreignToVndRate, currSymbol)}
              </div>
              <div className="text-[10px] text-emerald-700/80 font-medium truncate mt-0.5">Templo Literatura</div>
            </button>

            {/* 200.000 */}
            <button
              onClick={() => addVnd(200000)}
              className="p-2 sm:p-2.5 rounded-xl border border-rose-300/80 bg-rose-50/60 hover:bg-rose-100/80 active:scale-[0.98] text-left transition cursor-pointer shadow-2xs group"
            >
              <div className="font-bold text-xs sm:text-sm text-rose-950 font-mono tabular-nums group-hover:text-rose-800">
                +200.000 ₫
              </div>
              <div className="text-[11px] sm:text-xs font-semibold text-stone-600 mt-0.5 font-mono tabular-nums">
                ≈ {formatForeign(200000 / foreignToVndRate, currSymbol)}
              </div>
              <div className="text-[10px] text-rose-700/80 font-medium truncate mt-0.5">Bahía Ha Long</div>
            </button>

            {/* 500.000 */}
            <button
              onClick={() => addVnd(500000)}
              className="p-2 sm:p-2.5 rounded-xl border border-cyan-400/80 bg-cyan-50/70 hover:bg-cyan-100/90 active:scale-[0.98] text-left transition cursor-pointer shadow-2xs group ring-1 ring-cyan-400/30"
            >
              <div className="font-bold text-xs sm:text-sm text-cyan-950 font-mono tabular-nums group-hover:text-cyan-800 flex items-center justify-between">
                <span>+500.000 ₫</span>
                <span className="text-[9px] bg-cyan-200 text-cyan-950 px-1 py-0.2 rounded font-sans font-bold">Máx</span>
              </div>
              <div className="text-[11px] sm:text-xs font-semibold text-stone-600 mt-0.5 font-mono tabular-nums">
                ≈ {formatForeign(500000 / foreignToVndRate, currSymbol)}
              </div>
              <div className="text-[10px] text-cyan-700 font-medium truncate mt-0.5">Kim Liên (Ho Chi Minh)</div>
            </button>

            {/* 1.000.000 */}
            <button
              onClick={() => addVnd(1000000)}
              className="p-2 sm:p-2.5 rounded-xl border border-stone-300/80 bg-stone-50 hover:bg-stone-100 active:scale-[0.98] text-left transition cursor-pointer shadow-2xs"
            >
              <div className="font-bold text-xs sm:text-sm text-stone-900 font-mono tabular-nums">
                +1.000.000 ₫
              </div>
              <div className="text-[11px] sm:text-xs font-semibold text-stone-600 mt-0.5 font-mono tabular-nums">
                ≈ {formatForeign(1000000 / foreignToVndRate, currSymbol)}
              </div>
              <div className="text-[10px] text-stone-400 font-medium truncate mt-0.5">1 millón</div>
            </button>

            {/* 2.000.000 */}
            <button
              onClick={() => addVnd(2000000)}
              className="p-2 sm:p-2.5 rounded-xl border border-stone-300/80 bg-stone-50 hover:bg-stone-100 active:scale-[0.98] text-left transition cursor-pointer shadow-2xs"
            >
              <div className="font-bold text-xs sm:text-sm text-stone-900 font-mono tabular-nums">
                +2.000.000 ₫
              </div>
              <div className="text-[11px] sm:text-xs font-semibold text-stone-600 mt-0.5 font-mono tabular-nums">
                ≈ {formatForeign(2000000 / foreignToVndRate, currSymbol)}
              </div>
              <div className="text-[10px] text-stone-400 font-medium truncate mt-0.5">2 millones</div>
            </button>
          </div>
        </div>
      </div>

      {/* Rate Status Bar - Positioned under banknotes */}
      <div className="bg-[#141210] text-stone-100 rounded-2xl p-2.5 sm:px-4 sm:py-2.5 border border-stone-800 shadow-md">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Rate & Date */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 min-w-0">
              <span className="text-amber-300 text-sm sm:text-base font-bold font-mono tabular-nums whitespace-nowrap">
                1 {selectedCurrency} = {formatVND(foreignToVndRate)}
              </span>
              <div className="flex items-center gap-1.5 text-[11px] text-stone-400 whitespace-nowrap">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    ratesData.source === 'live_network'
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse'
                      : ratesData.source === 'manual_custom'
                      ? 'bg-amber-400'
                      : 'bg-sky-400'
                  }`}
                />
                <span>{ratesData.source === 'manual_custom' ? 'Tasa propia guardada' : `Actualizado: ${dateFormatted}`}</span>
              </div>
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              id="btn-banknote-guide"
              onClick={() => setIsBanknoteGuideOpen(true)}
              title="Guía de billetes y alerta 20k vs 500k"
              className="inline-flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[11px] sm:text-xs font-semibold transition cursor-pointer active:scale-95 shadow-2xs"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden sm:inline">Guía Billetes</span>
            </button>

            <button
              id="btn-force-refresh"
              onClick={onRefreshRates}
              disabled={isRefreshing || !isOnline}
              title={isOnline ? 'Consultar tipo de cambio en directo' : 'Sin conexión a internet'}
              className="inline-flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 active:scale-95 text-stone-200 hover:text-white border border-stone-800 disabled:opacity-40 text-[11px] sm:text-xs font-semibold transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : 'text-stone-400'}`} />
              <span className="hidden md:inline">{isRefreshing ? 'Actualizando...' : 'Actualizar'}</span>
            </button>

            <button
              id="btn-toggle-custom-rate"
              onClick={handleOpenCustomEditor}
              title="Ajustar manualmente la tasa de cambio"
              className={`inline-flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold border transition cursor-pointer active:scale-95 ${
                isCustomEditorOpen || ratesData.source === 'manual_custom'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-stone-900 hover:bg-stone-800 text-stone-200 hover:text-white border-stone-800'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden md:inline">{ratesData.source === 'manual_custom' ? 'Tasa propia' : 'Fijar tasa'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal Dialog for Custom Rate Editor - Centered on screen */}
      {isCustomEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#181614] border border-stone-800 text-stone-100 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm text-stone-100">Fijar tasa de cambio personalizada</h3>
              </div>
              <button
                onClick={() => setIsCustomEditorOpen(false)}
                className="text-stone-400 hover:text-stone-200 p-1.5 rounded-lg hover:bg-stone-800 transition cursor-pointer"
                title="Cerrar"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-stone-400 leading-relaxed">
              Introduce la tasa que te cobran en tu cajero o casa de cambio para 1 {selectedCurrency}:
            </p>

            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={customRateInput ? parseInt(customRateInput, 10).toLocaleString('es-ES') : ''}
                onChange={(e) => setCustomRateInput(e.target.value.replace(/\D/g, ''))}
                placeholder="29000"
                className="w-full bg-[#12110F] border border-stone-700/80 rounded-2xl px-4 py-3 text-base font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-400 pr-10"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-stone-500">₫</span>
            </div>

            {/* Quick preset chips */}
            <div>
              <span className="text-[11px] text-stone-400 block mb-1.5">Valores orientativos:</span>
              <div className="flex items-center gap-2 flex-wrap">
                {selectedCurrency === 'EUR' ? (
                  <>
                    {['28000', '28500', '29000', '29500', '30000'].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setCustomRateInput(preset)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-mono transition cursor-pointer border ${
                          customRateInput === preset
                            ? 'bg-amber-500 text-stone-950 font-bold border-amber-400 shadow-xs'
                            : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border-stone-800'
                        }`}
                      >
                        {Number(preset).toLocaleString('es-ES')} ₫
                      </button>
                    ))}
                  </>
                ) : selectedCurrency === 'USD' ? (
                  <>
                    {['25000', '25500', '26000', '26500'].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setCustomRateInput(preset)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-mono transition cursor-pointer border ${
                          customRateInput === preset
                            ? 'bg-amber-500 text-stone-950 font-bold border-amber-400 shadow-xs'
                            : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border-stone-800'
                        }`}
                      >
                        {Number(preset).toLocaleString('es-ES')} ₫
                      </button>
                    ))}
                  </>
                ) : null}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-stone-800">
              {ratesData.source === 'manual_custom' ? (
                <button
                  onClick={() => {
                    onRefreshRates();
                    setIsCustomEditorOpen(false);
                  }}
                  className="px-3 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-300 text-xs flex items-center gap-1.5 transition cursor-pointer border border-stone-800"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restaurar oficial</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCustomEditorOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs transition cursor-pointer border border-stone-800"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleApplyCustomRate(Number(customRateInput) || 0)}
                  disabled={!customRateInput || Number(customRateInput) <= 0}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 text-stone-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Guardar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Caution Banner: 20k vs 500k Polymer Alert */}
      <div
        onClick={() => setIsBanknoteGuideOpen(true)}
        className="px-3.5 py-2 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent hover:bg-amber-500/15 border border-amber-300/80 rounded-xl flex items-center justify-between gap-2.5 cursor-pointer transition group shadow-2xs"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-700 shrink-0">
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
          <p className="text-xs text-amber-950 leading-relaxed">
            No confundir el billete azul de <strong className="font-mono">20.000 ₫</strong> con el de <strong className="font-mono">500.000 ₫</strong> (tonalidades parecidas).
          </p>
        </div>
        <span className="text-xs font-bold text-amber-800 group-hover:text-amber-950 shrink-0 underline whitespace-nowrap">
          Ver guía →
        </span>
      </div>

      {/* Bargaining Calculator for Street Markets */}
      <div className="bg-white border border-stone-200/90 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 space-y-3 shadow-[0_4px_20px_rgba(28,25,23,0.03)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700 shrink-0">
            <TrendingDown className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-sm sm:text-base text-stone-900 leading-snug">
              Asistente de Regateo Callejero
            </h3>
            <p className="text-[11px] sm:text-xs text-stone-500">
              Contraofertas recomendadas (-40%) para puestos callejeros y mercados
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-0.5">
          {/* Quoted Price Input */}
          <div className="p-2.5 sm:p-3 rounded-xl bg-stone-50 border border-stone-200">
            <label htmlFor="input-quoted" className="block text-xs font-bold text-stone-600 mb-1">
              Precio que te piden:
            </label>
            <div className="relative">
              <input
                id="input-quoted"
                type="text"
                inputMode="numeric"
                value={quotedVnd ? parseInt(quotedVnd, 10).toLocaleString('es-ES') : ''}
                onChange={(e) => setQuotedVnd(e.target.value.replace(/\D/g, ''))}
                placeholder="300000"
                className="w-full text-base sm:text-lg font-bold font-mono tabular-nums text-stone-900 bg-white px-2.5 py-1.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">₫</span>
            </div>
            <span className="text-[11px] text-stone-500 mt-1 block font-mono">
              ≈ {formatForeign(parsedQuote / foreignToVndRate, currSymbol)}
            </span>
          </div>

          {/* Recommended Counter-offer */}
          <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 shadow-2xs flex flex-col justify-between">
            <span className="text-xs font-bold text-emerald-900 block">
              1ª Contraoferta (-{targetDiscount}%):
            </span>
            <div className="text-lg sm:text-xl font-extrabold font-mono tabular-nums text-emerald-700 my-0.5">
              {formatVND(initialCounterOffer)}
            </div>
            <span className="text-[11px] text-emerald-800/80 font-mono">
              ≈ {formatForeign(initialCounterOffer / foreignToVndRate, currSymbol)}
            </span>
          </div>

          {/* Fair Deal Range */}
          <div className="p-2.5 sm:p-3 rounded-xl bg-amber-50/60 border border-amber-200 shadow-2xs flex flex-col justify-between">
            <span className="text-xs font-bold text-amber-900 block">
              Punto de acuerdo estimado:
            </span>
            <div className="text-lg sm:text-xl font-extrabold font-mono tabular-nums text-amber-800 my-0.5">
              {formatVND(fairDealMax)}
            </div>
            <span className="text-[11px] text-amber-800/80 font-mono">
              ≈ {formatForeign(fairDealMax / foreignToVndRate, currSymbol)}
            </span>
          </div>
        </div>

        <div className="text-xs text-stone-600 bg-stone-50 p-2.5 rounded-xl border border-stone-200 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span className="text-[11px] sm:text-xs">
            <strong>Consejo cultural:</strong> El regateo siempre con una sonrisa. Si no bajan, di con calma <em>"Không, cảm ơn"</em> (No, gracias) y simula marcharte despacio.
          </span>
        </div>
      </div>

      {/* Banknote Guide & 20k vs 500k Confusion Modal */}
      <BanknoteGuideModal
        isOpen={isBanknoteGuideOpen}
        onClose={() => setIsBanknoteGuideOpen(false)}
        eurToVndRate={foreignToVndRate}
      />
    </div>
  );
};
