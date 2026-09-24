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
  const [vndAmount, setVndAmount] = useState<string>('50000');

  // Custom rate editor state
  const [isCustomEditorOpen, setIsCustomEditorOpen] = useState<boolean>(false);
  const [customRateInput, setCustomRateInput] = useState<string>('');

  // Calculate rate: Rates are relative to USD base
  const usdVndRate = ratesData.rates['VND'] || 26000;
  const foreignUsdRate = ratesData.rates[selectedCurrency] || (selectedCurrency === 'USD' ? 1 : 0.8965);
  const foreignToVndRate = usdVndRate / foreignUsdRate;

  // Initialize with exact 2 decimals in foreign currency
  const [foreignAmount, setForeignAmount] = useState<string>(() => (50000 / (26000 / 0.8965)).toFixed(2));

  // Bargaining tool state
  const [quotedVnd, setQuotedVnd] = useState<string>('300000');
  const [targetDiscount, setTargetDiscount] = useState<number>(40); // 40% discount

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

  // Rate freshness label
  const dateFormatted = new Date(ratesData.timestamp).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

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
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Rate Status Card */}
      <div className="bg-stone-900 text-stone-100 rounded-2xl p-4 sm:p-5 border border-stone-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0 mt-0.5">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">Tasa de conversión</span>
                <span
                  className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1 ${
                    ratesData.source === 'live_network'
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                      : ratesData.source === 'manual_custom'
                      ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                      : ratesData.source === 'server_cache'
                      ? 'bg-sky-950/80 text-sky-300 border border-sky-800'
                      : 'bg-stone-800 text-stone-300 border border-stone-700'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    ratesData.source === 'live_network'
                      ? 'bg-emerald-400'
                      : ratesData.source === 'manual_custom'
                      ? 'bg-amber-400'
                      : ratesData.source === 'server_cache'
                      ? 'bg-sky-400'
                      : 'bg-stone-400'
                  }`} />
                  {ratesData.source === 'live_network' && 'Online en directo'}
                  {ratesData.source === 'manual_custom' && 'Personalizada por ti'}
                  {ratesData.source === 'server_cache' && 'Al día'}
                  {ratesData.source === 'offline_fallback' && 'Estimación offline'}
                  {ratesData.source === 'local_storage' && 'Guardada en dispositivo'}
                </span>
              </div>
              <p className="text-xs text-stone-300 mt-1">
                1 {selectedCurrency} = <strong className="text-amber-300 font-mono text-sm">{formatVND(foreignToVndRate)}</strong>
                <span className="mx-2 text-stone-500">•</span>
                <span className="text-stone-400">Última tasa: {dateFormatted}</span>
              </p>
            </div>
          </div>

          {/* Action buttons: Direct Live Refresh & Custom Manual Adjust */}
          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <button
              id="btn-force-refresh"
              onClick={onRefreshRates}
              disabled={isRefreshing || !isOnline}
              title={isOnline ? 'Consultar tipo de cambio en directo' : 'Sin conexión a internet'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white border border-stone-700 active:scale-95 disabled:opacity-40 text-xs font-medium transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : 'text-stone-400'}`} />
              <span>{isRefreshing ? 'Consultando...' : 'Actualizar online'}</span>
            </button>

            <button
              id="btn-toggle-custom-rate"
              onClick={handleOpenCustomEditor}
              title="Ajustar manualmente la tasa de cambio"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                isCustomEditorOpen || ratesData.source === 'manual_custom'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white border-stone-700'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
              <span>{ratesData.source === 'manual_custom' ? 'Tasa propia' : 'Fijar tasa'}</span>
            </button>
          </div>
        </div>

        {/* Expandable Manual Rate Editor */}
        {isCustomEditorOpen && (
          <div className="pt-3 border-t border-stone-800 space-y-3 animate-fade-in">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="text-xs font-semibold text-white">Personalizar tasa para 1 {selectedCurrency}</h4>
                <p className="text-[11px] text-stone-400">
                  Introduce el tipo de cambio que te aplican en tu casa de cambio, cajero o tarjeta (se guardará de forma permanente en tu dispositivo).
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-44">
                <input
                  type="text"
                  inputMode="numeric"
                  value={customRateInput ? parseInt(customRateInput, 10).toLocaleString('es-ES') : ''}
                  onChange={(e) => setCustomRateInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="29000"
                  className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-1.5 text-sm font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-400 pr-8"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-500">₫</span>
              </div>

              <button
                onClick={() => handleApplyCustomRate(Number(customRateInput) || 0)}
                disabled={!customRateInput || Number(customRateInput) <= 0}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-stone-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Guardar tasa fija</span>
              </button>

              <button
                onClick={() => setIsCustomEditorOpen(false)}
                className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 text-xs transition cursor-pointer"
              >
                Cancelar
              </button>

              {ratesData.source === 'manual_custom' && (
                <button
                  onClick={() => {
                    onRefreshRates();
                    setIsCustomEditorOpen(false);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-amber-300 text-xs flex items-center gap-1 transition cursor-pointer ml-auto"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restaurar tasa oficial</span>
                </button>
              )}
            </div>

            {/* Quick preset chips */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[11px] text-stone-500">Accesos rápidos:</span>
              {selectedCurrency === 'EUR' ? (
                <>
                  <button
                    onClick={() => {
                      setCustomRateInput('28500');
                      handleApplyCustomRate(28500);
                    }}
                    className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-[11px] font-mono text-stone-300 transition"
                  >
                    28.500 ₫
                  </button>
                  <button
                    onClick={() => {
                      setCustomRateInput('29000');
                      handleApplyCustomRate(29000);
                    }}
                    className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-[11px] font-mono font-bold text-amber-300 border border-amber-500/30 transition"
                  >
                    29.000 ₫ (29k)
                  </button>
                  <button
                    onClick={() => {
                      setCustomRateInput('29500');
                      handleApplyCustomRate(29500);
                    }}
                    className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-[11px] font-mono text-stone-300 transition"
                  >
                    29.500 ₫
                  </button>
                  <button
                    onClick={() => {
                      setCustomRateInput('30000');
                      handleApplyCustomRate(30000);
                    }}
                    className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-[11px] font-mono text-stone-300 transition"
                  >
                    30.000 ₫ (30k)
                  </button>
                </>
              ) : selectedCurrency === 'USD' ? (
                <>
                  <button
                    onClick={() => {
                      setCustomRateInput('25500');
                      handleApplyCustomRate(25500);
                    }}
                    className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-[11px] font-mono text-stone-300 transition"
                  >
                    25.500 ₫
                  </button>
                  <button
                    onClick={() => {
                      setCustomRateInput('26000');
                      handleApplyCustomRate(26000);
                    }}
                    className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-[11px] font-mono font-bold text-amber-300 border border-amber-500/30 transition"
                  >
                    26.000 ₫ (26k)
                  </button>
                  <button
                    onClick={() => {
                      setCustomRateInput('26500');
                      handleApplyCustomRate(26500);
                    }}
                    className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-[11px] font-mono text-stone-300 transition"
                  >
                    26.500 ₫
                  </button>
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Main Converter Card */}
      <div className="bg-white rounded-2xl p-5 sm:p-7 border border-stone-200 shadow-sm space-y-6">
        {/* Currency selection */}
        <div className="flex items-center gap-2 pb-4 border-b border-stone-100">
          <label htmlFor="currency-select" className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Moneda:
          </label>
          <select
            id="currency-select"
            value={selectedCurrency}
            onChange={(e) => handleCurrencyChange(e.target.value as CurrencyCode)}
            className="bg-stone-100 hover:bg-stone-200 font-semibold text-stone-900 text-sm px-3 py-1.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
          >
            {CURRENCIES.map((curr) => (
              <option key={curr.code} value={curr.code}>
                {curr.flag} {curr.code} ({curr.name} - {curr.symbol})
              </option>
            ))}
          </select>
        </div>

        {/* Big Dual Display / Input */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          {/* VND Box */}
          <div className="p-4 sm:p-5 rounded-xl border border-stone-200 bg-stone-50/70 focus-within:border-amber-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-amber-500/20 transition shadow-2xs">
            <div className="flex items-center justify-between text-xs font-medium text-stone-500 mb-1.5">
              <span className="flex items-center gap-1.5">
                <span className="text-base">🇻🇳</span>
                <span className="font-semibold text-stone-800">Đồng Vietnamita (VND)</span>
              </span>
            </div>

            <div className="relative">
              <input
                id="input-vnd"
                type="text"
                inputMode="numeric"
                value={vndAmount ? parseInt(vndAmount, 10).toLocaleString('es-ES') : ''}
                onChange={(e) => handleVndChange(e.target.value)}
                placeholder="0"
                className="w-full text-2xl sm:text-3xl font-bold font-mono text-stone-900 bg-transparent border-none focus:outline-none pr-10"
              />
              <span className="absolute right-0 top-1/2 -translate-y-1/2 text-lg font-bold text-stone-400">
                ₫
              </span>
            </div>

            <div className="mt-2 text-xs text-stone-500 flex items-center justify-between">
              <span>
                {vndAmount ? `${(parseFloat(vndAmount) / 1000).toLocaleString('es-ES')}k VND` : '0k VND'}
              </span>
              {vndAmount && (
                <button
                  onClick={clearAmount}
                  className="text-stone-400 hover:text-stone-700 text-[11px] underline cursor-pointer"
                >
                  Borrar
                </button>
              )}
            </div>
          </div>

          {/* Foreign Currency Box */}
          <div className="p-4 sm:p-5 rounded-xl border border-stone-200 bg-stone-50/70 focus-within:border-amber-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-amber-500/20 transition shadow-2xs">
            <div className="flex items-center justify-between text-xs font-medium text-stone-500 mb-1.5">
              <span className="flex items-center gap-1.5">
                <span className="text-base">
                  {CURRENCIES.find((c) => c.code === selectedCurrency)?.flag}
                </span>
                <span className="font-semibold text-stone-800">{selectedCurrency} ({currSymbol})</span>
              </span>
            </div>

            <div className="relative">
              <input
                id="input-foreign"
                type="text"
                inputMode="decimal"
                value={foreignAmount}
                onChange={(e) => handleForeignChange(e.target.value)}
                onBlur={handleForeignBlur}
                placeholder="0.00"
                className="w-full text-2xl sm:text-3xl font-bold font-mono text-stone-900 bg-transparent border-none focus:outline-none pr-10"
              />
              <span className="absolute right-0 top-1/2 -translate-y-1/2 text-lg font-bold text-stone-400">
                {currSymbol}
              </span>
            </div>

            <div className="mt-2 text-xs text-stone-500">
              1 {currSymbol} ≈ {Math.round(foreignToVndRate).toLocaleString('es-ES')} ₫
            </div>
          </div>
        </div>

        {/* Banknote buttons that add to total */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Billetes habituales:
            </span>
            {vndAmount && parseFloat(vndAmount) > 0 && (
              <button
                onClick={clearAmount}
                className="text-stone-400 hover:text-stone-700 text-xs underline cursor-pointer"
              >
                Poner a cero (0 ₫)
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              onClick={() => addVnd(10000)}
              className="p-3 rounded-xl border border-amber-200 bg-amber-50/40 hover:bg-amber-100/70 active:scale-[0.98] text-left transition cursor-pointer shadow-2xs group"
            >
              <div className="font-bold text-sm text-stone-900 font-mono">10.000 ₫</div>
              <div className="text-xs font-semibold text-stone-700 mt-1 font-mono">
                ≈ {formatForeign(10000 / foreignToVndRate, currSymbol)}
              </div>
              <div className="text-[10px] text-stone-500 mt-0.5">Amarillo / Ocre</div>
            </button>

            <button
              onClick={() => addVnd(20000)}
              className="p-3 rounded-xl border border-blue-200 bg-blue-50/40 hover:bg-blue-100/70 active:scale-[0.98] text-left transition cursor-pointer shadow-2xs group"
            >
              <div className="font-bold text-sm text-blue-900 font-mono">20.000 ₫</div>
              <div className="text-xs font-semibold text-stone-700 mt-1 font-mono">
                ≈ {formatForeign(20000 / foreignToVndRate, currSymbol)}
              </div>
              <div className="text-[10px] text-stone-500 mt-0.5">Azul marino</div>
            </button>

            <button
              onClick={() => addVnd(50000)}
              className="p-3 rounded-xl border border-fuchsia-200 bg-fuchsia-50/40 hover:bg-fuchsia-100/70 active:scale-[0.98] text-left transition cursor-pointer shadow-2xs group"
            >
              <div className="font-bold text-sm text-fuchsia-900 font-mono">50.000 ₫</div>
              <div className="text-xs font-semibold text-stone-700 mt-1 font-mono">
                ≈ {formatForeign(50000 / foreignToVndRate, currSymbol)}
              </div>
              <div className="text-[10px] text-stone-500 mt-0.5">Rosa / Magenta</div>
            </button>

            <button
              onClick={() => addVnd(100000)}
              className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/40 hover:bg-emerald-100/70 active:scale-[0.98] text-left transition cursor-pointer shadow-2xs group"
            >
              <div className="font-bold text-sm text-emerald-900 font-mono">100.000 ₫</div>
              <div className="text-xs font-semibold text-stone-700 mt-1 font-mono">
                ≈ {formatForeign(100000 / foreignToVndRate, currSymbol)}
              </div>
              <div className="text-[10px] text-stone-500 mt-0.5">Verde oliva</div>
            </button>

            <button
              onClick={() => addVnd(200000)}
              className="p-3 rounded-xl border border-rose-200 bg-rose-50/40 hover:bg-rose-100/70 active:scale-[0.98] text-left transition cursor-pointer shadow-2xs group"
            >
              <div className="font-bold text-sm text-rose-900 font-mono">200.000 ₫</div>
              <div className="text-xs font-semibold text-stone-700 mt-1 font-mono">
                ≈ {formatForeign(200000 / foreignToVndRate, currSymbol)}
              </div>
              <div className="text-[10px] text-stone-500 mt-0.5">Rojo / Terracota</div>
            </button>

            <button
              onClick={() => addVnd(500000)}
              className="p-3 rounded-xl border border-cyan-300 bg-cyan-50/50 hover:bg-cyan-100/70 active:scale-[0.98] text-left transition cursor-pointer shadow-2xs group"
            >
              <div className="font-bold text-sm text-cyan-900 font-mono">500.000 ₫</div>
              <div className="text-xs font-semibold text-stone-700 mt-1 font-mono">
                ≈ {formatForeign(500000 / foreignToVndRate, currSymbol)}
              </div>
              <div className="text-[10px] text-stone-500 mt-0.5">Azul verdoso (Máximo)</div>
            </button>

            <button
              onClick={() => addVnd(1000000)}
              className="p-3 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 active:scale-[0.98] text-left transition cursor-pointer shadow-2xs group"
            >
              <div className="font-bold text-sm text-stone-900 font-mono">1.000.000 ₫</div>
              <div className="text-xs font-semibold text-stone-700 mt-1 font-mono">
                ≈ {formatForeign(1000000 / foreignToVndRate, currSymbol)}
              </div>
              <div className="text-[10px] text-stone-500 mt-0.5">1 Millón (2 x 500k)</div>
            </button>

            <button
              onClick={() => addVnd(2000000)}
              className="p-3 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 active:scale-[0.98] text-left transition cursor-pointer shadow-2xs group"
            >
              <div className="font-bold text-sm text-stone-900 font-mono">2.000.000 ₫</div>
              <div className="text-xs font-semibold text-stone-700 mt-1 font-mono">
                ≈ {formatForeign(2000000 / foreignToVndRate, currSymbol)}
              </div>
              <div className="text-[10px] text-stone-500 mt-0.5">2 Millones (4 x 500k)</div>
            </button>
          </div>
        </div>
      </div>

      {/* Bargaining Calculator for Street Markets */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-800">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-stone-900">
              Asistente de Regateo para Mercados Calle
            </h3>
            <p className="text-xs text-stone-600">
              En mercados como Bến Thành (Saigón) o Đêm Hội An, el primer precio pedido suele estar inflado un 40-60%.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {/* Quoted Price Input */}
          <div>
            <label htmlFor="input-quoted" className="block text-xs font-semibold text-stone-700 mb-1">
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
                className="w-full text-base font-bold font-mono text-stone-900 bg-white px-3 py-2 rounded-lg border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">₫</span>
            </div>
            <span className="text-[11px] text-stone-500 mt-1 block">
              ≈ {formatForeign(parsedQuote / foreignToVndRate, currSymbol)}
            </span>
          </div>

          {/* Recommended Counter-offer */}
          <div className="bg-white p-3 rounded-xl border border-emerald-300 shadow-xs">
            <span className="text-xs font-semibold text-emerald-800 block">
              1ª Contraoferta recomendada:
            </span>
            <div className="text-lg font-bold font-mono text-emerald-700 mt-0.5">
              {formatVND(initialCounterOffer)}
            </div>
            <span className="text-[11px] text-emerald-600">
              ≈ {formatForeign(initialCounterOffer / foreignToVndRate, currSymbol)} (rebaja {targetDiscount}%)
            </span>
          </div>

          {/* Fair Deal Range */}
          <div className="bg-white p-3 rounded-xl border border-amber-300 shadow-xs">
            <span className="text-xs font-semibold text-amber-900 block">
              Precio justo de cierre estimado:
            </span>
            <div className="text-lg font-bold font-mono text-amber-800 mt-0.5">
              {formatVND(fairDealMax)}
            </div>
            <span className="text-[11px] text-amber-700">
              ≈ {formatForeign(fairDealMax / foreignToVndRate, currSymbol)}
            </span>
          </div>
        </div>

        <div className="text-xs text-amber-900/80 bg-amber-100/60 p-2.5 rounded-lg flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Consejo local:</strong> Si no aceptan, di sonriendo <em>"Không, cảm ơn"</em> (No, gracias) y haz el gesto de marcharte. En 8 de cada 10 ocasiones te llamarán de vuelta aceptando tu oferta.
          </span>
        </div>
      </div>
    </div>
  );
};
