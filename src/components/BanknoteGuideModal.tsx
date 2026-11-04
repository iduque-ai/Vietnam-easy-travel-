import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X, ShieldAlert, Info } from 'lucide-react';
import { useScrollLock } from '../hooks/useScrollLock';
import { CurrencyCode } from '../types';
import { getCurrencyInfo } from '../utils/currencyUtils';

interface BanknoteGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  eurToVndRate: number;
  currencyCode?: CurrencyCode;
}

interface BanknoteInfo {
  vnd: number;
  color: string;
  colorName: string;
  landmark: string;
  material: string;
}

const BANKNOTES: BanknoteInfo[] = [
  {
    vnd: 500000,
    color: '#0d9488',
    colorName: 'Azul verdoso / Cian',
    landmark: 'Casa natal de Ho Chi Minh (Kim Liên, Nghệ An)',
    material: 'Polímero plástico · Billete de mayor valor y tamaño',
  },
  {
    vnd: 200000,
    color: '#e11d48',
    colorName: 'Rojo teja / Terracota',
    landmark: 'Bahía de Hạ Long (Islote Đỉnh Hương)',
    material: 'Polímero plástico',
  },
  {
    vnd: 100000,
    color: '#16a34a',
    colorName: 'Verde hoja / Oliva',
    landmark: 'Pabellón Khuê Văn Các (Templo de la Literatura, Hanói)',
    material: 'Polímero plástico',
  },
  {
    vnd: 50000,
    color: '#db2777',
    colorName: 'Rosa magenta / Violeta suave',
    landmark: 'Pabellón Nghênh Lương Đình y Phu Văn Lâu (Huế)',
    material: 'Polímero plástico',
  },
  {
    vnd: 20000,
    color: '#2563eb',
    colorName: 'Azul marino / Añil',
    landmark: 'Puente Cubierto Japonés Chùa Cầu (Hội An)',
    material: 'Polímero plástico',
  },
  {
    vnd: 10000,
    color: '#ca8a04',
    colorName: 'Marrón amarillento / Ocre dorado',
    landmark: 'Plataforma petrolífera marina Bạch Hổ',
    material: 'Polímero plástico · Billete de polímero más pequeño',
  },
];

export const BanknoteGuideModal: React.FC<BanknoteGuideModalProps> = ({
  isOpen,
  onClose,
  eurToVndRate,
  currencyCode = 'EUR',
}) => {
  useScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const currInfo = getCurrencyInfo(currencyCode);
  const formatApprox = (vnd: number) => {
    const val = vnd / eurToVndRate;
    if (currencyCode === 'JPY') {
      return `≈ ${Math.round(val).toLocaleString('es-ES')} ${currInfo.symbol}`;
    }
    return `≈ ${val.toFixed(val < 1 ? 2 : 1).replace('.', ',')} ${currInfo.symbol}`;
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-5 bg-stone-950/75 backdrop-blur-sm animate-fade-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="banknote-guide-title"
    >
      <div
        className="bg-[#FAF8F5] rounded-3xl border border-stone-200/90 max-w-2xl w-full max-h-[88dvh] flex flex-col shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Header */}
        <div className="bg-[#141210] text-white px-5 py-4 sm:px-6 flex items-center justify-between border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="min-w-0">
              <h3
                id="banknote-guide-title"
                className="font-serif font-bold text-base sm:text-lg text-white tracking-wide truncate"
              >
                Guía Visual de Billetes de Vietnam
              </h3>
              <p className="text-xs text-stone-400 truncate">
                Evita confusiones habituales entre billetes de color similar
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-white p-2 rounded-xl hover:bg-stone-800 transition cursor-pointer shrink-0"
            title="Cerrar guía"
            aria-label="Cerrar guía visual de billetes"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-5">
          {/* Critical Warning Box: 20k vs 500k */}
          <div className="bg-white border border-rose-200/90 rounded-2xl overflow-hidden shadow-2xs">
            <div className="px-4 py-3 bg-rose-50/90 border-b border-rose-200/70 flex items-center gap-2 text-rose-900 font-bold text-xs sm:text-sm">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>¡Alerta de Confusión: 20.000 ₫ vs 500.000 ₫!</span>
            </div>

            <div className="p-4 space-y-3.5">
              <p className="text-xs text-stone-700 leading-relaxed">
                Ambos billetes son de <strong>polímero plástico y tonos azulados</strong>. Con poca luz en un taxi o mercado nocturno es fácil entregar un billete de{' '}
                <strong className="font-mono text-stone-900">500.000 ₫ ({formatApprox(500000)})</strong> creyendo que es de{' '}
                <strong className="font-mono text-stone-900">20.000 ₫ ({formatApprox(20000)})</strong>: una diferencia de <strong>25 veces su valor</strong>.
              </p>

              {/* Side-by-side comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-stone-200 border border-stone-200 rounded-xl overflow-hidden bg-stone-50/50">
                <div className="p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-extrabold text-blue-700 text-base sm:text-lg tabular-nums">
                      20.000 ₫
                    </span>
                    <span className="text-xs font-mono text-stone-500 tabular-nums">
                      {formatApprox(20000)}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-stone-800">
                    Azul marino intenso · Tamaño corto
                  </div>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    Reverso con el <strong>Puente Japonés de Hội An</strong> y ventana transparente con el número «20000».
                  </p>
                </div>

                <div className="p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-extrabold text-teal-700 text-base sm:text-lg tabular-nums">
                      500.000 ₫
                    </span>
                    <span className="text-xs font-mono text-stone-500 tabular-nums">
                      {formatApprox(500000)}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-stone-800">
                    Azul cian verdoso · Más largo
                  </div>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    Reverso con la <strong>Casa natal de Ho Chi Minh</strong> y ventana transparente con «500000».
                  </p>
                </div>
              </div>

              <p className="text-xs text-rose-900 bg-rose-50/60 px-3.5 py-2.5 rounded-xl border border-rose-200/60">
                <strong>Regla de oro:</strong> Guarda siempre los billetes de 500.000 ₫ en un compartimento separado de la cartera y no los mezcles con los billetes pequeños de 10k o 20k.
              </p>
            </div>
          </div>

          {/* Complete Banknote Catalog */}
          <div className="space-y-2.5">
            <h4 className="font-serif font-bold text-sm sm:text-base text-stone-900">
              Catálogo de Billetes de Polímero en Circulación
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {BANKNOTES.map((note) => (
                <div
                  key={note.vnd}
                  className="p-3.5 rounded-2xl bg-white border border-stone-200/90 space-y-1.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: note.color }}
                      />
                      <span className="font-mono font-extrabold text-base text-stone-900 tabular-nums tracking-tight">
                        {note.vnd.toLocaleString('es-ES')} ₫
                      </span>
                    </div>
                    <span className="text-xs font-mono font-semibold text-stone-600 tabular-nums">
                      {formatApprox(note.vnd)}
                    </span>
                  </div>

                  <div className="text-xs font-semibold text-stone-700">
                    {note.colorName}
                  </div>

                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    Reverso: {note.landmark}
                  </p>
                  <p className="text-[10px] text-stone-400">
                    {note.material}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Tips for Foreign Travelers */}
          <div className="bg-white border border-stone-200/90 rounded-2xl p-4 space-y-2 text-stone-800">
            <div className="flex items-center gap-2 text-xs font-bold text-stone-900">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Consejos prácticos al pagar en efectivo</span>
            </div>
            <ul className="text-xs text-stone-600 space-y-1.5 list-disc list-inside leading-relaxed">
              <li>
                <strong>Billetes de papel (1.000, 2.000 y 5.000 ₫):</strong> Valen pocos céntimos ({currInfo.symbol}) y se usan para vueltas exactas o aparcamiento de motos.
              </li>
              <li>
                <strong>Precios abreviados en «k»:</strong> En cartas y mercados «50» o «50k» significa siempre 50.000 ₫.
              </li>
              <li>
                <strong>Revisa el estado del billete:</strong> Los comercios suelen rechazar billetes con roturas o cortes visibles.
              </li>
            </ul>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="bg-white px-5 py-3.5 sm:px-6 border-t border-stone-200/80 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold cursor-pointer transition shadow-xs"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
