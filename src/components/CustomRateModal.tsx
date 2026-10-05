import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, Check, X } from 'lucide-react';
import { CurrencyCode, ExchangeRatesData } from '../types';
import { useScrollLock } from '../hooks/useScrollLock';
import { CURRENCIES, getCurrencyInfo, calculateForeignToVndRate } from '../utils/currencyUtils';

interface CustomRateModalProps {
  isOpen: boolean;
  onClose: () => void;
  ratesData: ExchangeRatesData;
  onSaveCustomRates: (newRates: ExchangeRatesData) => void;
  onRefreshRates?: () => void;
  activeCurrency?: CurrencyCode;
}

export const CustomRateModal: React.FC<CustomRateModalProps> = ({
  isOpen,
  onClose,
  ratesData,
  onSaveCustomRates,
  activeCurrency = 'EUR',
}) => {
  useScrollLock(isOpen);

  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>(activeCurrency);
  const [customRateInput, setCustomRateInput] = useState<string>('');

  const usdVndRate = ratesData.rates['VND'] || 26000;
  const foreignToVndRate = calculateForeignToVndRate(ratesData.rates, selectedCurrency);
  const currInfo = getCurrencyInfo(selectedCurrency);

  const cajeroRate = Math.round(foreignToVndRate * 0.98);
  const baseRate = Math.round(foreignToVndRate);
  const aeropuertoRate = Math.round(foreignToVndRate * 0.95);

  const isCajeroSelected = customRateInput === String(cajeroRate);
  const isBaseSelected = customRateInput === String(baseRate);
  const isAeropuertoSelected = customRateInput === String(aeropuertoRate);

  useEffect(() => {
    if (isOpen) {
      setSelectedCurrency(activeCurrency);
      const initRate = calculateForeignToVndRate(ratesData.rates, activeCurrency);
      setCustomRateInput(String(Math.round(initRate)));
    }
  }, [isOpen, activeCurrency, ratesData.rates]);

  if (!isOpen) return null;

  const handleCurrencyChange = (newCurrency: CurrencyCode) => {
    setSelectedCurrency(newCurrency);
    const newRate = calculateForeignToVndRate(ratesData.rates, newCurrency);
    setCustomRateInput(String(Math.round(newRate)));
  };

  const handleSave = () => {
    const val = parseInt(customRateInput, 10);
    if (!val || val <= 0) return;

    let newUsdVnd = usdVndRate;
    const newRates = { ...ratesData.rates };

    if (selectedCurrency === 'USD') {
      newUsdVnd = val;
      newRates['VND'] = val;
    } else {
      const foreignUsd = ratesData.rates[selectedCurrency] || 1;
      newUsdVnd = Math.round(val * foreignUsd);
      newRates['VND'] = newUsdVnd;
    }

    const updatedData: ExchangeRatesData = {
      ...ratesData,
      source: 'manual_custom',
      timestamp: Date.now(),
      rates: newRates,
    };

    onSaveCustomRates(updatedData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
      <div className="bg-[#181614] border border-stone-800 text-stone-100 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-sm text-stone-100">Fijar tipo de cambio personalizado</h3>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-200 p-1.5 rounded-lg hover:bg-stone-800 transition cursor-pointer"
            title="Cerrar"
            aria-label="Cerrar ventana"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Currency Selector */}
        <div className="flex items-center justify-between gap-2 bg-stone-900/80 p-2 rounded-xl border border-stone-800 text-xs">
          <span className="text-stone-400 px-1 font-medium">Divisa a ajustar:</span>
          <select
            value={selectedCurrency}
            onChange={(e) => handleCurrencyChange(e.target.value as CurrencyCode)}
            className="bg-stone-800 hover:bg-stone-750 text-amber-300 font-bold px-3 py-1.5 rounded-lg border border-stone-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-400"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code} className="bg-stone-900 text-stone-100">
                {c.flag} {c.code} ({c.symbol})
              </option>
            ))}
          </select>
        </div>

        <p className="text-xs text-stone-400 leading-relaxed">
          Introduce la tasa real que te cobran en tu cajero o casa de cambio para 1 {currInfo.name} ({currInfo.code}):
        </p>

        {/* Custom Input */}
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            value={customRateInput ? parseInt(customRateInput, 10).toLocaleString('es-ES') : ''}
            onChange={(e) => setCustomRateInput(e.target.value.replace(/\D/g, ''))}
            placeholder={`Ej: ${Math.round(foreignToVndRate).toLocaleString('es-ES')}`}
            className="w-full bg-stone-900 border border-stone-700 rounded-xl px-4 py-3 text-lg font-bold font-mono text-amber-300 focus:outline-none focus:border-amber-400 text-center"
            autoFocus
          />
          <span className="absolute right-4 top-3.5 text-xs font-bold text-stone-400">₫ VND</span>
        </div>

        {/* Quick Presets */}
        <div className="space-y-1.5">
          <span className="text-[11px] text-stone-400 font-medium">Valores de referencia comunes:</span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setCustomRateInput(String(cajeroRate))}
              className={`py-2 px-2 rounded-xl text-xs font-mono font-semibold text-center cursor-pointer transition border ${
                isCajeroSelected
                  ? 'bg-amber-500 text-stone-950 font-bold border-amber-400 shadow-sm'
                  : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border-stone-800 hover:border-amber-500/30'
              }`}
            >
              -2% (Cajero)
            </button>
            <button
              type="button"
              onClick={() => setCustomRateInput(String(baseRate))}
              className={`py-2 px-2 rounded-xl text-xs font-mono font-semibold text-center cursor-pointer transition border ${
                isBaseSelected
                  ? 'bg-amber-500 text-stone-950 font-bold border-amber-400 shadow-sm'
                  : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border-stone-800 hover:border-amber-500/30'
              }`}
            >
              Oficial
            </button>
            <button
              type="button"
              onClick={() => setCustomRateInput(String(aeropuertoRate))}
              className={`py-2 px-2 rounded-xl text-xs font-mono font-semibold text-center cursor-pointer transition border ${
                isAeropuertoSelected
                  ? 'bg-amber-500 text-stone-950 font-bold border-amber-400 shadow-sm'
                  : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border-stone-800 hover:border-amber-500/30'
              }`}
            >
              -5% (Aeropuerto)
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-stone-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!customRateInput || parseInt(customRateInput, 10) <= 0}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-stone-950 transition cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95"
          >
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Guardar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
