import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  TrendingDown,
  Sparkles,
  RotateCcw,
  ArrowRightLeft,
} from 'lucide-react';
import { CurrencyCode, ExchangeRatesData } from '../types';
import { BanknoteGuideModal } from './BanknoteGuideModal';
import { getCurrencyInfo, calculateForeignToVndRate } from '../utils/currencyUtils';

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
  }, [selectedCurrency, foreignToVndRate, vndKAmount]);

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

  // Bargaining calculations
  const rawKValue = parseFloat(quotedKInput.replace(/\D/g, '')) || 0;
  const parsedQuote = rawKValue > 0 ? (rawKValue < 1000 ? rawKValue * 1000 : rawKValue) : 0;
  const initialCounterOffer = parsedQuote > 0 ? Math.round((parsedQuote * (100 - targetDiscount)) / 100) : 0;
  const fairDealMax = parsedQuote > 0 ? Math.round((parsedQuote * (100 - (targetDiscount - 10))) / 100) : 0;

  const currentTotalVnd = (parseFloat(vndKAmount) || 0) * 1000;

  return (
    <div className="space-y-4 max-w-4xl mx-auto animate-fade-in">
      {/* Main Converter Card */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-stone-200/90 shadow-[0_2px_20px_rgba(28,25,23,0.03)] space-y-4">
        {/* Card Header */}
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-700 shrink-0">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-lg sm:text-xl text-stone-900 leading-tight">
                Conversor Rápido
              </h2>
              <p className="text-xs text-stone-500">
                Los miles (<span className="font-mono">.000 ₫</span>) se añaden solos al escribir en VND
              </p>
            </div>
          </div>

          {(vndKAmount || foreignAmount) && (
            <button
              type="button"
              onClick={clearAmount}
              className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer active:scale-95"
              title="Poner a cero"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reiniciar</span>
            </button>
          )}
        </div>

        {/* Big Dual Display / Input Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch">
          {/* VND Box (Auto 3k / .000 ₫) */}
          <div className="p-4 rounded-2xl border-2 border-stone-200/90 bg-amber-50/30 focus-within:border-amber-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-amber-500/10 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
              <span className="flex items-center gap-2">
                <span className="text-base leading-none">🇻🇳</span>
                <span className="font-bold text-stone-800 text-xs sm:text-sm">Đồng Vietnamita (VND)</span>
              </span>
              <span className="text-[11px] text-amber-800 font-medium bg-amber-100/70 px-2 py-0.5 rounded-md">
                × 1.000
              </span>
            </div>

            <div className="relative my-1.5">
              <input
                id="input-vnd"
                type="text"
                inputMode="numeric"
                value={vndKAmount ? parseInt(vndKAmount, 10).toLocaleString('es-ES') : ''}
                onChange={(e) => handleVndKChange(e.target.value)}
                placeholder="0"
                className="w-full text-3xl sm:text-4xl font-extrabold font-mono tabular-nums text-stone-900 bg-transparent border-none focus:outline-none pr-16 py-0.5 tracking-tight"
              />
              <span className="absolute right-0 top-1/2 -translate-y-1/2 text-base sm:text-lg font-bold font-mono text-amber-700 select-none">
                .000 ₫
              </span>
            </div>

            <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-stone-600 font-semibold tabular-nums">
                {currentTotalVnd > 0 ? `${currentTotalVnd.toLocaleString('es-ES')} ₫` : 'Escribe ej. 50 para 50.000 ₫'}
              </span>
            </div>
          </div>

          {/* Foreign Currency Box */}
          <div className="p-4 rounded-2xl border-2 border-stone-200/90 bg-stone-50/70 focus-within:border-amber-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-amber-500/10 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
              <span className="flex items-center gap-2">
                <span className="text-base leading-none">{currInfo.flag}</span>
                <span className="font-bold text-stone-800 text-xs sm:text-sm">
                  {currInfo.name} ({currInfo.code})
                </span>
              </span>
            </div>

            <div className="relative my-1.5">
              <input
                id="input-foreign"
                type="text"
                inputMode="decimal"
                value={foreignAmount}
                onChange={(e) => handleForeignChange(e.target.value)}
                onBlur={handleForeignBlur}
                placeholder="0.00"
                className="w-full text-3xl sm:text-4xl font-extrabold font-mono tabular-nums text-stone-900 bg-transparent border-none focus:outline-none pr-8 py-0.5 tracking-tight"
              />
              <span className="absolute right-0 top-1/2 -translate-y-1/2 text-lg sm:text-xl font-bold text-stone-400">
                {currSymbol}
              </span>
            </div>

            <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between">
              <span className="font-mono text-xs text-stone-600 tabular-nums">
                1 {currSymbol} ≈ {Math.round(foreignToVndRate).toLocaleString('es-ES')} ₫
              </span>
            </div>
          </div>
        </div>

        {/* Banknote buttons that add to total */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-600">
              Sumar billetes vietnamitas al cálculo:
            </span>
            {vndKAmount && parseFloat(vndKAmount) > 0 && (
              <button
                onClick={clearAmount}
                className="text-amber-800 hover:text-amber-950 font-semibold text-xs underline cursor-pointer transition"
              >
                Poner a cero
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { k: 10, label: '+10.000 ₫', note: 'Amarillo', classes: 'border-amber-200 bg-amber-50/50 hover:bg-amber-100/70 text-amber-950' },
              { k: 20, label: '+20.000 ₫', note: 'Azul puente', classes: 'border-sky-200 bg-sky-50/50 hover:bg-sky-100/70 text-sky-950' },
              { k: 50, label: '+50.000 ₫', note: 'Rosado Huế', classes: 'border-rose-200 bg-rose-50/50 hover:bg-rose-100/70 text-rose-950' },
              { k: 100, label: '+100.000 ₫', note: 'Verde Templo', classes: 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/70 text-emerald-950' },
              { k: 200, label: '+200.000 ₫', note: 'Rojo Ha Long', classes: 'border-orange-200 bg-orange-50/50 hover:bg-orange-100/70 text-orange-950' },
              { k: 500, label: '+500.000 ₫', note: 'Azul cian (Máx)', classes: 'border-cyan-300 bg-cyan-50/60 hover:bg-cyan-100/80 text-cyan-950' },
              { k: 1000, label: '+1.000.000 ₫', note: '1 millón', classes: 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-900' },
              { k: 2000, label: '+2.000.000 ₫', note: '2 millones', classes: 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-900' },
            ].map((item) => (
              <button
                key={item.k}
                type="button"
                onClick={() => addVndK(item.k)}
                className={`p-2.5 rounded-2xl border text-left transition cursor-pointer active:scale-[0.98] ${item.classes}`}
              >
                <div className="font-bold text-xs sm:text-sm font-mono tabular-nums">
                  {item.label}
                </div>
                <div className="text-xs font-semibold text-stone-700 mt-0.5 font-mono tabular-nums">
                  ≈ {formatForeign((item.k * 1000) / foreignToVndRate, currSymbol)}
                </div>
                <div className="text-[10px] opacity-75 font-medium truncate mt-0.5">{item.note}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Caution Banner: 20k vs 500k Polymer Alert */}
      <button
        type="button"
        onClick={() => setIsBanknoteGuideOpen(true)}
        className="w-full px-4 py-3 bg-amber-50/90 hover:bg-amber-100/80 border border-amber-200/90 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition group text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-800 shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <p className="text-xs text-amber-950 leading-relaxed">
            <strong>Aviso importante:</strong> No confundas el billete azul de <strong className="font-mono">20.000 ₫</strong> con el de <strong className="font-mono">500.000 ₫</strong>.
          </p>
        </div>
        <span className="text-xs font-bold text-amber-900 group-hover:underline shrink-0 whitespace-nowrap">
          Ver guía →
        </span>
      </button>

      {/* Bargaining Calculator for Street Markets */}
      <div className="bg-white border border-stone-200/90 rounded-3xl p-4 sm:p-6 space-y-3.5 shadow-[0_2px_20px_rgba(28,25,23,0.03)]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-700 shrink-0">
            <TrendingDown className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-base sm:text-lg text-stone-900 leading-tight">
              Calculadora de Regateo
            </h3>
            <p className="text-xs text-stone-500">
              Introduce lo que te piden en mercados para ver la contraoferta ideal
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Quoted Price Input */}
          <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/90 flex flex-col justify-between">
            <label htmlFor="input-quoted" className="block text-xs font-bold text-stone-700 mb-1.5">
              Precio que te piden:
            </label>
            <div className="relative">
              <input
                id="input-quoted"
                type="text"
                inputMode="numeric"
                value={quotedKInput}
                onChange={(e) => setQuotedKInput(e.target.value.replace(/\D/g, ''))}
                placeholder="Ej: 300"
                className="w-full text-lg font-bold font-mono tabular-nums text-stone-900 bg-white px-3 py-1.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 pr-14"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold font-mono text-amber-700 select-none">
                .000 ₫
              </span>
            </div>
            <span className="text-[11px] text-stone-500 mt-1.5 block font-mono tabular-nums">
              {parsedQuote > 0
                ? `${parsedQuote.toLocaleString('es-ES')} ₫ ≈ ${formatForeign(parsedQuote / foreignToVndRate, currSymbol)}`
                : 'Se multiplica × 1.000'}
            </span>
          </div>

          {/* Recommended Counter-offer */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/90 flex flex-col justify-between">
            <span className="text-xs font-bold text-emerald-900 block">
              1ª Contraoferta (-{targetDiscount}%):
            </span>
            <div className="text-xl font-extrabold font-mono tabular-nums text-emerald-800 my-1">
              {parsedQuote > 0 ? formatVND(initialCounterOffer) : '-- ₫'}
            </div>
            <span className="text-[11px] text-emerald-800/80 font-mono tabular-nums">
              {parsedQuote > 0
                ? `≈ ${formatForeign(initialCounterOffer / foreignToVndRate, currSymbol)} (${Math.round(initialCounterOffer / 1000)}k ₫)`
                : 'Tu oferta inicial'}
            </span>
          </div>

          {/* Fair Deal Range */}
          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/90 flex flex-col justify-between">
            <span className="text-xs font-bold text-amber-900 block">
              Precio justo de cierre:
            </span>
            <div className="text-xl font-extrabold font-mono tabular-nums text-amber-900 my-1">
              {parsedQuote > 0 ? formatVND(fairDealMax) : '-- ₫'}
            </div>
            <span className="text-[11px] text-amber-800/80 font-mono tabular-nums">
              {parsedQuote > 0
                ? `≈ ${formatForeign(fairDealMax / foreignToVndRate, currSymbol)} (${Math.round(fairDealMax / 1000)}k ₫)`
                : 'Acuerdo razonable'}
            </span>
          </div>
        </div>

        <div className="text-xs text-stone-600 bg-stone-50 px-3.5 py-2.5 rounded-xl border border-stone-200/80 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>
            <strong>Consejo local:</strong> Regatea siempre con una sonrisa. Si no aceptan, di <em>«Không, cảm ơn»</em> (No, gracias) y camina despacio.
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
