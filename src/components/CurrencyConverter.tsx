import React, { useState, useEffect } from 'react';
import {
  Calculator,
  HelpCircle,
  AlertTriangle,
  TrendingDown,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { CurrencyCode, ExchangeRatesData } from '../types';
import { BanknoteGuideModal } from './BanknoteGuideModal';
import { CURRENCIES, getCurrencyInfo, calculateForeignToVndRate } from '../utils/currencyUtils';

interface CurrencyConverterProps {
  ratesData: ExchangeRatesData;
  isOnline: boolean;
  onRefreshRates: () => void;
  onSaveCustomRates?: (newRates: ExchangeRatesData) => void;
  isRefreshing: boolean;
  selectedCurrency: CurrencyCode;
}

export const CurrencyConverter: React.FC<CurrencyConverterProps> = ({
  ratesData,
  selectedCurrency,
}) => {
  // VND Amount in thousands (k) with auto +3 zeros (.000 ₫)
  const [vndKAmount, setVndKAmount] = useState<string>('');

  // Calculate rate: Rates are relative to USD base
  const foreignToVndRate = calculateForeignToVndRate(ratesData.rates, selectedCurrency);
  const currInfo = getCurrencyInfo(selectedCurrency);
  const currSymbol = currInfo.symbol;

  // Initialize foreign amount empty
  const [foreignAmount, setForeignAmount] = useState<string>('');

  // Update foreignAmount when currency or rates change
  useEffect(() => {
    if (vndKAmount) {
      const numK = parseFloat(vndKAmount) || 0;
      const totalVnd = numK * 1000;
      const converted = totalVnd / foreignToVndRate;
      setForeignAmount(converted ? converted.toFixed(2) : '');
    }
  }, [selectedCurrency, foreignToVndRate]);

  // Bargaining tool state (starts blank, auto-appends 3 zeros / calculates in k)
  const [quotedKInput, setQuotedKInput] = useState<string>('');
  const targetDiscount = 40;

  // Banknote guide modal state
  const [isBanknoteGuideOpen, setIsBanknoteGuideOpen] = useState<boolean>(false);

  // Formatting helpers
  const formatVND = (num: number) => Math.round(num).toLocaleString('es-ES') + ' ₫';
  const formatForeign = (num: number, symbol: string) => {
    return num.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + symbol;
  };

  // Handlers for VND (with auto 3k / .000 ₫)
  const handleVndKChange = (valStr: string) => {
    const clean = valStr.replace(/\D/g, '');
    setVndKAmount(clean);
    const numK = parseFloat(clean) || 0;
    const totalVnd = numK * 1000;
    const converted = totalVnd / foreignToVndRate;
    setForeignAmount(converted ? converted.toFixed(2) : '');
  };

  const handleForeignChange = (valStr: string) => {
    // Allow decimal input with period or comma for foreign currencies (euros, usd)
    const clean = valStr.replace(/,/g, '.').replace(/[^\d.]/g, '');
    setForeignAmount(clean);
    const num = parseFloat(clean) || 0;
    const totalVnd = Math.round(num * foreignToVndRate);
    const kVal = totalVnd > 0 ? Math.round(totalVnd / 1000) : 0;
    setVndKAmount(kVal > 0 ? kVal.toString() : '');
  };

  const handleForeignBlur = () => {
    if (foreignAmount) {
      const num = parseFloat(foreignAmount);
      if (!isNaN(num)) {
        setForeignAmount(num.toFixed(2));
      }
    }
  };

  const setExactVndK = (valK: number) => {
    setVndKAmount(Math.round(valK).toString());
    const totalVnd = valK * 1000;
    const converted = totalVnd / foreignToVndRate;
    setForeignAmount(converted.toFixed(2));
  };

  const addVndK = (valK: number) => {
    const currentK = parseFloat(vndKAmount) || 0;
    const updatedK = Math.round(currentK + valK);
    setExactVndK(updatedK);
  };

  const clearAmount = () => {
    setVndKAmount('');
    setForeignAmount('');
  };

  // Bargaining calculations: User enters e.g. "300" -> auto interprets as 300.000 VND (300k)
  const rawKValue = parseFloat(quotedKInput.replace(/\D/g, '')) || 0;
  const parsedQuote = rawKValue > 0 ? (rawKValue < 1000 ? rawKValue * 1000 : rawKValue) : 0;
  const initialCounterOffer = parsedQuote > 0 ? Math.round((parsedQuote * (100 - targetDiscount)) / 100) : 0;
  const fairDealMax = parsedQuote > 0 ? Math.round((parsedQuote * (100 - (targetDiscount - 10))) / 100) : 0;

  const currentTotalVnd = (parseFloat(vndKAmount) || 0) * 1000;

  return (
    <div className="space-y-3 sm:space-y-3.5 max-w-4xl mx-auto">
      {/* Main Converter Card */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-4.5 border border-stone-200/90 shadow-[0_4px_20px_rgba(28,25,23,0.04)] space-y-2.5">
        {/* Big Dual Display / Input Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3 items-stretch">
          {/* VND Box (Auto 3k / .000 ₫) */}
          <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border-2 border-stone-200/90 bg-gradient-to-br from-amber-500/[0.04] to-transparent focus-within:border-amber-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-amber-500/10 transition-all shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-stone-500 mb-0.5">
              <span className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg leading-none">🇻🇳</span>
                <span className="font-bold text-stone-800 text-xs sm:text-sm">Đồng Vietnamita (VND)</span>
              </span>
            </div>

            <div className="relative my-1">
              <input
                id="input-vnd"
                type="text"
                inputMode="numeric"
                value={vndKAmount ? parseInt(vndKAmount, 10).toLocaleString('es-ES') : ''}
                onChange={(e) => handleVndKChange(e.target.value)}
                placeholder="0"
                className="w-full text-2xl sm:text-3xl lg:text-4xl font-extrabold font-mono tabular-nums text-stone-900 bg-transparent border-none focus:outline-none pr-16 py-0.5 tracking-tight"
              />
              <span className="absolute right-0 top-1/2 -translate-y-1/2 text-base sm:text-lg font-bold font-mono text-amber-700 select-none">
                .000 ₫
              </span>
            </div>

            <div className="pt-1.5 border-t border-stone-100 flex items-center justify-between gap-2 flex-wrap">
              <span className="font-mono text-xs text-stone-600 font-semibold">
                {currentTotalVnd > 0 ? `${currentTotalVnd.toLocaleString('es-ES')} ₫` : '0 ₫'}
              </span>
              {vndKAmount && (
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
          <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border-2 border-stone-200/90 bg-stone-50/60 focus-within:border-amber-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-amber-500/10 transition-all shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-stone-500 mb-0.5">
              <span className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg leading-none">
                  {currInfo.flag}
                </span>
                <span className="font-bold text-stone-800 text-xs sm:text-sm">
                  {currInfo.name} ({currInfo.code})
                </span>
              </span>
            </div>

            <div className="relative my-1">
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
        <div className="pt-0.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-stone-500">
              Añadir billetes al cálculo:
            </span>
            {vndKAmount && parseFloat(vndKAmount) > 0 && (
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
              onClick={() => addVndK(10)}
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
              onClick={() => addVndK(20)}
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
              onClick={() => addVndK(50)}
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
              onClick={() => addVndK(100)}
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
              onClick={() => addVndK(200)}
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
              onClick={() => addVndK(500)}
              className="p-2 sm:p-2.5 rounded-xl border border-cyan-400/80 bg-cyan-50/70 hover:bg-cyan-100/90 active:scale-[0.98] text-left transition cursor-pointer shadow-2xs group ring-1 ring-cyan-400/30"
            >
              <div className="font-bold text-xs sm:text-sm text-cyan-950 font-mono tabular-nums group-hover:text-cyan-800 flex items-center justify-between">
                <span>+500.000 ₫</span>
                <span className="text-[9px] bg-cyan-200 text-cyan-950 px-1 py-0.2 rounded font-sans font-bold">Máx</span>
              </div>
              <div className="text-[11px] sm:text-xs font-semibold text-stone-600 mt-0.5 font-mono tabular-nums">
                ≈ {formatForeign(50000 / foreignToVndRate, currSymbol)}
              </div>
              <div className="text-[10px] text-cyan-700 font-medium truncate mt-0.5">Kim Liên (Ho Chi Minh)</div>
            </button>

            {/* 1.000.000 */}
            <button
              onClick={() => addVndK(1000)}
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
              onClick={() => addVndK(2000)}
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

      {/* Caution Banner: 20k vs 500k Polymer Alert */}
      <div
        onClick={() => setIsBanknoteGuideOpen(true)}
        className="px-3 py-1.5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent hover:bg-amber-500/15 border border-amber-300/80 rounded-xl flex items-center justify-between gap-2 cursor-pointer transition group shadow-2xs"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 rounded-md bg-amber-500/20 flex items-center justify-center text-amber-700 shrink-0">
            <AlertTriangle className="w-3 h-3" />
          </div>
          <p className="text-xs text-amber-950 leading-relaxed">
            No confundir el billete azul de <strong className="font-mono">20.000 ₫</strong> con el de <strong className="font-mono">500.000 ₫</strong>.
          </p>
        </div>
        <span className="text-xs font-bold text-amber-800 group-hover:text-amber-950 shrink-0 underline whitespace-nowrap">
          Guía →
        </span>
      </div>

      {/* Bargaining Calculator for Street Markets (Compact with reduced bottom whitespace) */}
      <div className="bg-white border border-stone-200/90 rounded-2xl sm:rounded-3xl p-3 sm:p-4 space-y-2.5 shadow-[0_4px_20px_rgba(28,25,23,0.03)]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700 shrink-0">
            <TrendingDown className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-xs sm:text-sm text-stone-900 leading-snug">
              Asistente de Regateo Callejero
            </h3>
            <p className="text-[10px] sm:text-[11px] text-stone-500">
              Contraofertas recomendadas (-40%) para puestos callejeros y mercados
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-0.5">
          {/* Quoted Price Input (Auto-appends .000 / k) */}
          <div className="p-2 sm:p-2.5 rounded-xl bg-stone-50 border border-stone-200 flex flex-col justify-between">
            <div className="mb-1">
              <label htmlFor="input-quoted" className="block text-xs font-bold text-stone-700">
                Precio que te piden:
              </label>
            </div>
            <div className="relative">
              <input
                id="input-quoted"
                type="text"
                inputMode="numeric"
                value={quotedKInput}
                onChange={(e) => setQuotedKInput(e.target.value.replace(/\D/g, ''))}
                placeholder="Ej: 300"
                className="w-full text-base font-bold font-mono tabular-nums text-stone-900 bg-white px-2 py-1 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 pr-14"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold font-mono text-amber-700 select-none">
                .000 ₫
              </span>
            </div>
            {parsedQuote > 0 && (
              <span className="text-[10px] text-stone-500 mt-1 block font-mono">
                Total: {parsedQuote.toLocaleString('es-ES')} ₫ ≈ {formatForeign(parsedQuote / foreignToVndRate, currSymbol)}
              </span>
            )}
          </div>

          {/* Recommended Counter-offer */}
          <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200 shadow-2xs flex flex-col justify-between">
            <span className="text-xs font-bold text-emerald-900 block">
              1ª Contraoferta (-{targetDiscount}%):
            </span>
            <div className="text-base sm:text-lg font-extrabold font-mono tabular-nums text-emerald-700 my-0.5">
              {parsedQuote > 0 ? formatVND(initialCounterOffer) : '-- ₫'}
            </div>
            {parsedQuote > 0 && (
              <span className="text-[10px] text-emerald-800/80 font-mono">
                ≈ {formatForeign(initialCounterOffer / foreignToVndRate, currSymbol)} ({Math.round(initialCounterOffer / 1000)}k ₫)
              </span>
            )}
          </div>

          {/* Fair Deal Range */}
          <div className="p-2 sm:p-2.5 rounded-xl bg-amber-50/60 border border-amber-200 shadow-2xs flex flex-col justify-between">
            <span className="text-xs font-bold text-amber-900 block">
              Punto de acuerdo estimado:
            </span>
            <div className="text-base sm:text-lg font-extrabold font-mono tabular-nums text-amber-800 my-0.5">
              {parsedQuote > 0 ? formatVND(fairDealMax) : '-- ₫'}
            </div>
            {parsedQuote > 0 && (
              <span className="text-[10px] text-amber-800/80 font-mono">
                ≈ {formatForeign(fairDealMax / foreignToVndRate, currSymbol)} ({Math.round(fairDealMax / 1000)}k ₫)
              </span>
            )}
          </div>
        </div>

        <div className="text-[11px] text-stone-600 bg-stone-50 px-2.5 py-1.5 rounded-lg border border-stone-200 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-amber-600 shrink-0" />
          <span>
            <strong>Consejo cultural:</strong> Siempre con una sonrisa. Si no bajan, di <em>"Không, cảm ơn"</em> (No, gracias) y simula marcharte despacio.
          </span>
        </div>
      </div>

      {/* Banknote Guide & 20k vs 500k Confusion Modal */}
      <BanknoteGuideModal
        isOpen={isBanknoteGuideOpen}
        onClose={() => setIsBanknoteGuideOpen(false)}
        eurToVndRate={foreignToVndRate}
        currencyCode={selectedCurrency}
      />
    </div>
  );
};
