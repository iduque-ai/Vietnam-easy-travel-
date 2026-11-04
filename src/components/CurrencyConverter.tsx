import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  TrendingDown,
  RotateCcw,
  ArrowRightLeft,
  Plus,
  ChevronRight,
  Banknote,
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

const BANKNOTE_DENOMINATIONS = [
  { k: 10, label: '10k', full: '10.000 ₫', note: 'Amarillo', dot: 'bg-amber-400' },
  { k: 20, label: '20k', full: '20.000 ₫', note: 'Azul puente', dot: 'bg-sky-500' },
  { k: 50, label: '50k', full: '50.000 ₫', note: 'Rosado Huế', dot: 'bg-rose-400' },
  { k: 100, label: '100k', full: '100.000 ₫', note: 'Verde Templo', dot: 'bg-emerald-500' },
  { k: 200, label: '200k', full: '200.000 ₫', note: 'Rojo Hạ Long', dot: 'bg-orange-500' },
  { k: 500, label: '500k', full: '500.000 ₫', note: 'Azul cian', dot: 'bg-cyan-500' },
  { k: 1000, label: '1M', full: '1.000.000 ₫', note: '2× 500k', dot: 'bg-stone-500' },
  { k: 2000, label: '2M', full: '2.000.000 ₫', note: '4× 500k', dot: 'bg-stone-700' },
];

const STREET_PRICE_REFERENCES = [
  { label: 'Bia Hơi / Agua', k: 15 },
  { label: 'Bánh Mì callejero', k: 30 },
  { label: 'Cà Phê Trứng', k: 40 },
  { label: 'Bol de Phở / Bún Chả', k: 65 },
  { label: 'Trayecto Grab (3 km)', k: 45 },
  { label: 'Masaje de pies (60m)', k: 250 },
];

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
  const [targetDiscount, setTargetDiscount] = useState<number>(40);

  // Banknote guide modal state
  const [isBanknoteGuideOpen, setIsBanknoteGuideOpen] = useState<boolean>(false);

  // Formatting helpers
  const formatVND = (num: number) => Math.round(num).toLocaleString('es-ES') + ' ₫';
  const formatForeign = (num: number, symbol: string) => {
    return (
      num.toLocaleString('es-ES', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) +
      ' ' +
      symbol
    );
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
  const initialCounterOffer =
    parsedQuote > 0 ? Math.round((parsedQuote * (100 - targetDiscount)) / 100) : 0;
  const fairDealMax =
    parsedQuote > 0 ? Math.round((parsedQuote * (100 - (targetDiscount - 12))) / 100) : 0;

  const hasActiveConversion = Boolean(vndKAmount || foreignAmount);

  return (
    <div className="space-y-5 max-w-4xl mx-auto animate-fade-in">
      {/* SECTION 1: EXCHANGE DESK & BANKNOTE ACCUMULATOR */}
      <section className="bg-white rounded-3xl border border-stone-200/90 shadow-[0_2px_24px_rgba(28,25,23,0.04)] overflow-hidden">
        {/* Top Editorial Bar */}
        <div className="px-5 py-3.5 sm:px-6 border-b border-stone-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="font-serif font-bold text-lg sm:text-xl text-stone-900 tracking-tight">
              Conversor de Divisa
            </h2>
            <span className="text-stone-300" aria-hidden="true">
              ·
            </span>
            <span className="text-xs text-stone-500 font-mono tabular-nums truncate">
              1 {currSymbol} ≈ {Math.round(foreignToVndRate).toLocaleString('es-ES')} ₫
            </span>
          </div>

          {hasActiveConversion ? (
            <button
              type="button"
              onClick={clearAmount}
              className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200/80 text-stone-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer active:scale-95 shrink-0"
              title="Poner a cero"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpiar</span>
            </button>
          ) : (
            <span className="text-[11px] text-stone-400 hidden sm:inline">
              Los miles (.000 ₫) se añaden solos
            </span>
          )}
        </div>

        {/* Dual Split Exchange Ledger */}
        <div className="relative grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-stone-200/80 bg-gradient-to-b from-white to-stone-50/30">
          {/* Center directional badge on desktop */}
          <div
            className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white border border-stone-200 shadow-xs items-center justify-center text-stone-400 pointer-events-none z-10"
            aria-hidden="true"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
          </div>

          {/* Left Pane: VND (Auto × 1.000) */}
          <label
            htmlFor="input-vnd"
            className="block p-5 sm:p-6 cursor-text transition-colors focus-within:bg-amber-50/25"
          >
            <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
              <span className="flex items-center gap-2 font-semibold text-stone-700">
                <span className="text-base leading-none">🇻🇳</span>
                <span>Đồng Vietnamita</span>
                <span className="text-stone-400 font-normal">· VND</span>
              </span>
              <span className="text-[11px] font-mono text-amber-800 font-semibold">
                Escala ×1.000
              </span>
            </div>

            <div className="flex items-baseline gap-1.5">
              <input
                id="input-vnd"
                type="text"
                inputMode="numeric"
                value={vndKAmount ? parseInt(vndKAmount, 10).toLocaleString('es-ES') : ''}
                onChange={(e) => handleVndKChange(e.target.value)}
                placeholder="0"
                className="w-full text-3xl sm:text-4xl font-extrabold font-mono tabular-nums text-stone-900 placeholder:text-stone-300 bg-transparent border-none focus:outline-none tracking-tight p-0"
              />
              <span className="text-xl sm:text-2xl font-bold font-mono text-amber-700/90 select-none shrink-0">
                .000 ₫
              </span>
            </div>
          </label>

          {/* Right Pane: Foreign Currency */}
          <label
            htmlFor="input-foreign"
            className="block p-5 sm:p-6 cursor-text transition-colors focus-within:bg-amber-50/25"
          >
            <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
              <span className="flex items-center gap-2 font-semibold text-stone-700">
                <span className="text-base leading-none">{currInfo.flag}</span>
                <span>{currInfo.name}</span>
                <span className="text-stone-400 font-normal">· {currInfo.code}</span>
              </span>
              <span className="text-[11px] text-stone-400">Importe exacto</span>
            </div>

            <div className="flex items-baseline gap-2">
              <input
                id="input-foreign"
                type="text"
                inputMode="decimal"
                value={foreignAmount}
                onChange={(e) => handleForeignChange(e.target.value)}
                onBlur={handleForeignBlur}
                placeholder="0.00"
                className="w-full text-3xl sm:text-4xl font-extrabold font-mono tabular-nums text-stone-900 placeholder:text-stone-300 bg-transparent border-none focus:outline-none tracking-tight p-0"
              />
              <span className="text-2xl sm:text-3xl font-bold font-mono text-stone-400 select-none shrink-0">
                {currSymbol}
              </span>
            </div>
          </label>
        </div>

        {/* Tactile Polymer Banknote Accumulator */}
        <div className="px-5 py-4 sm:px-6 bg-stone-50/70 border-t border-stone-200/80 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-stone-600">
              <Banknote className="w-3.5 h-3.5 text-stone-400" />
              <span className="font-semibold text-stone-700">Sumar billetes al total</span>
              <span className="text-stone-300" aria-hidden="true">
                ·
              </span>
              <span className="text-stone-500 hidden sm:inline">
                Toca para acumular billetes de tu cartera
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsBanknoteGuideOpen(true)}
              className="text-xs font-semibold text-amber-800 hover:text-amber-950 flex items-center gap-1 cursor-pointer transition group"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Alerta 20k vs 500k</span>
              <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {BANKNOTE_DENOMINATIONS.map((item) => {
              const eqForeign = (item.k * 1000) / foreignToVndRate;
              return (
                <button
                  key={item.k}
                  type="button"
                  onClick={() => addVndK(item.k)}
                  className="group relative py-2.5 px-3 rounded-xl bg-white hover:bg-amber-50/60 border border-stone-200/90 hover:border-amber-400/80 text-left transition cursor-pointer active:scale-95 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                  title={`Sumar ${item.full} (${item.note})`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono font-bold text-xs sm:text-sm text-stone-900 tabular-nums">
                      +{item.full}
                    </span>
                    <span className={`w-2.5 h-2.5 rounded-full ${item.dot} shrink-0`} />
                  </div>
                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    <span className="text-[11px] text-stone-500 font-medium">
                      {item.note}
                    </span>
                    <span className="font-mono text-[11px] font-semibold text-stone-700 tabular-nums shrink-0">
                      ≈ {eqForeign < 10
                        ? eqForeign.toFixed(2).replace('.', ',')
                        : Math.round(eqForeign)}{' '}
                      {currSymbol}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Street Price Quick References (2 rows on mobile and desktop) */}
          <div className="pt-3 border-t border-stone-200/60 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-stone-700">
                Referencias rápidas de precios callejeros
              </span>
              <span className="text-[11px] text-stone-400">
                Toca para convertir
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {STREET_PRICE_REFERENCES.map((ref) => {
                const isSelected = vndKAmount === ref.k.toString();
                const eqVal = (ref.k * 1000) / foreignToVndRate;
                return (
                  <button
                    key={ref.label}
                    type="button"
                    onClick={() => setExactVndK(ref.k)}
                    className={`px-3 py-2.5 rounded-xl text-left transition cursor-pointer flex flex-col justify-between gap-1 border ${
                      isSelected
                        ? 'bg-stone-900 text-white border-stone-900 shadow-2xs'
                        : 'bg-white hover:bg-stone-100/80 text-stone-800 border-stone-200/90'
                    }`}
                  >
                    <span className="text-xs font-semibold leading-snug">
                      {ref.label}
                    </span>
                    <div className="flex items-center justify-between gap-1 w-full pt-0.5">
                      <span
                        className={`font-mono text-[11px] font-bold tabular-nums ${
                          isSelected ? 'text-amber-300' : 'text-amber-800'
                        }`}
                      >
                        {ref.k}.000 ₫
                      </span>
                      <span
                        className={`font-mono text-[11px] tabular-nums ${
                          isSelected ? 'text-stone-300' : 'text-stone-500'
                        }`}
                      >
                        ≈ {eqVal.toFixed(2).replace('.', ',')} {currSymbol}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: STREET MARKET BARGAINING CALCULATOR */}
      <section className="bg-white rounded-3xl border border-stone-200/90 shadow-[0_2px_24px_rgba(28,25,23,0.04)] overflow-hidden">
        <div className="px-5 py-3.5 sm:px-6 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <TrendingDown className="w-4 h-4 text-amber-700 shrink-0" />
            <h3 className="font-serif font-bold text-base sm:text-lg text-stone-900">
              Calculadora de Regateo en Mercados
            </h3>
          </div>

          {/* Interactive Discount Intensity Selector */}
          <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-xl self-start sm:self-auto">
            {[
              { pct: 25, label: 'Suave -25%' },
              { pct: 40, label: 'Estándar -40%' },
              { pct: 55, label: 'Turístico -55%' },
            ].map((mode) => (
              <button
                key={mode.pct}
                type="button"
                onClick={() => setTargetDiscount(mode.pct)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                  targetDiscount === mode.pct
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-stone-200/80">
          {/* Quoted Input */}
          <div className="md:col-span-5 p-5 sm:p-6 flex flex-col justify-center">
            <label
              htmlFor="input-quoted"
              className="block text-xs font-semibold text-stone-600 mb-2"
            >
              Precio inicial que pide el vendedor
            </label>
            <div className="flex items-baseline gap-1.5 border-b-2 border-stone-200 focus-within:border-amber-600 pb-1.5 transition-colors">
              <input
                id="input-quoted"
                type="text"
                inputMode="numeric"
                value={quotedKInput ? parseInt(quotedKInput, 10).toLocaleString('es-ES') : ''}
                onChange={(e) => setQuotedKInput(e.target.value.replace(/\D/g, ''))}
                placeholder="Ej: 300"
                className="w-full text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-stone-900 placeholder:text-stone-300 bg-transparent border-none focus:outline-none p-0"
              />
              <span className="text-base sm:text-lg font-bold font-mono text-amber-700 select-none shrink-0">
                .000 ₫
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-stone-500 font-mono tabular-nums">
              <span>
                {parsedQuote > 0
                  ? `Pide ≈ ${formatForeign(parsedQuote / foreignToVndRate, currSymbol)}`
                  : 'Introduce la cifra en miles'}
              </span>
              {parsedQuote > 0 && (
                <button
                  type="button"
                  onClick={() => setQuotedKInput('')}
                  className="text-stone-400 hover:text-stone-700 underline font-sans cursor-pointer"
                >
                  Borrar
                </button>
              )}
            </div>
          </div>

          {/* Counter-Offer Readout */}
          <div className="md:col-span-7 grid grid-cols-2 divide-x divide-stone-200/80 bg-stone-50/40">
            <div className="p-5 sm:p-6 flex flex-col justify-between">
              <div className="text-xs font-semibold text-emerald-800">
                1ª Contraoferta (-{targetDiscount}%)
              </div>
              <div className="my-2">
                <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-emerald-900 tracking-tight">
                  {parsedQuote > 0
                    ? `${Math.round(initialCounterOffer / 1000).toLocaleString('es-ES')}k ₫`
                    : '-- ₫'}
                </div>
                <div className="text-xs font-mono tabular-nums text-emerald-700 mt-0.5">
                  {parsedQuote > 0
                    ? `≈ ${formatForeign(initialCounterOffer / foreignToVndRate, currSymbol)}`
                    : 'Tu primera oferta'}
                </div>
              </div>
              <div className="text-[11px] text-stone-500">
                Empieza ofreciendo este importe con una sonrisa
              </div>
            </div>

            <div className="p-5 sm:p-6 flex flex-col justify-between">
              <div className="text-xs font-semibold text-amber-900">
                Precio justo de cierre
              </div>
              <div className="my-2">
                <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-stone-900 tracking-tight">
                  {parsedQuote > 0
                    ? `${Math.round(fairDealMax / 1000).toLocaleString('es-ES')}k ₫`
                    : '-- ₫'}
                </div>
                <div className="text-xs font-mono tabular-nums text-amber-800 mt-0.5">
                  {parsedQuote > 0
                    ? `≈ ${formatForeign(fairDealMax / foreignToVndRate, currSymbol)}`
                    : 'Acuerdo ideal'}
                </div>
              </div>
              <div className="text-[11px] text-stone-500">
                Si supera esto, di <em className="text-stone-700">«Không, cảm ơn»</em>
              </div>
            </div>
          </div>
        </div>
      </section>

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
