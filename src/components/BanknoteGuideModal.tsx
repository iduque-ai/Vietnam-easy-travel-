import React from 'react';
import { AlertTriangle, X, ShieldAlert, CheckCircle2, Info } from 'lucide-react';
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
  accentBg: string;
  borderColor: string;
  tagColor: string;
}

const BANKNOTES: BanknoteInfo[] = [
  {
    vnd: 500000,
    color: '#14b8a6',
    colorName: 'Azul verdoso / Cian',
    landmark: 'Casa natal del Presidente Ho Chi Minh (Kim Liên, Nghệ An)',
    material: 'Polímero plástico (billete más grande)',
    accentBg: 'bg-teal-950/20 border-teal-500/40 text-teal-800',
    borderColor: 'border-teal-400',
    tagColor: 'bg-teal-100 text-teal-900',
  },
  {
    vnd: 200000,
    color: '#e11d48',
    colorName: 'Rojo teja / Terracota',
    landmark: 'Bahía de Ha Long (Barco tradicional de juncos)',
    material: 'Polímero plástico',
    accentBg: 'bg-rose-950/20 border-rose-500/40 text-rose-800',
    borderColor: 'border-rose-400',
    tagColor: 'bg-rose-100 text-rose-900',
  },
  {
    vnd: 100000,
    color: '#16a34a',
    colorName: 'Verde hoja / Oliva',
    landmark: 'Pabellón Khue Van Cac (Templo de la Literatura, Hanói)',
    material: 'Polímero plástico',
    accentBg: 'bg-emerald-950/20 border-emerald-500/40 text-emerald-800',
    borderColor: 'border-emerald-400',
    tagColor: 'bg-emerald-100 text-emerald-900',
  },
  {
    vnd: 50000,
    color: '#ea580c',
    colorName: 'Rosa magenta / Violeta suave',
    landmark: 'Pabellón Nghênh Lương Đình y Phu Văn Lâu (Huế)',
    material: 'Polímero plástico',
    accentBg: 'bg-orange-950/20 border-orange-500/40 text-orange-800',
    borderColor: 'border-orange-400',
    tagColor: 'bg-orange-100 text-orange-900',
  },
  {
    vnd: 20000,
    color: '#2563eb',
    colorName: 'Azul marino / Añil',
    landmark: 'Puente Cubierto Japonés Chùa Cầu (Hội An)',
    material: 'Polímero plástico',
    accentBg: 'bg-blue-950/20 border-blue-500/40 text-blue-800',
    borderColor: 'border-blue-400',
    tagColor: 'bg-blue-100 text-blue-900',
  },
  {
    vnd: 10000,
    color: '#ca8a04',
    colorName: 'Marrón amarillento / Ocre dorado',
    landmark: 'Plataforma petrolífera marina Bạch Hổ',
    material: 'Polímero plástico (billete más pequeño)',
    accentBg: 'bg-yellow-950/20 border-yellow-500/40 text-yellow-800',
    borderColor: 'border-yellow-400',
    tagColor: 'bg-yellow-100 text-yellow-900',
  },
];

export const BanknoteGuideModal: React.FC<BanknoteGuideModalProps> = ({
  isOpen,
  onClose,
  eurToVndRate,
  currencyCode = 'EUR',
}) => {
  useScrollLock(isOpen);

  if (!isOpen) return null;

  const currInfo = getCurrencyInfo(currencyCode);
  const formatApprox = (vnd: number) => {
    const val = vnd / eurToVndRate;
    if (currencyCode === 'JPY') {
      return `≈ ${Math.round(val).toLocaleString('es-ES')} ${currInfo.symbol}`;
    }
    return `≈ ${val.toFixed(val < 1 ? 2 : 1)} ${currInfo.symbol}`;
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-[#FAF8F5] rounded-3xl border border-stone-200/90 max-w-2xl w-full shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden my-6">
        {/* Header */}
        <div className="bg-[#141210] text-white px-6 py-4.5 flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/30 shadow-inner">
              <AlertTriangle className="w-4.5 h-4.5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-white tracking-wide">
                Guía Visual de Billetes de Vietnam
              </h3>
              <p className="text-xs text-stone-400 font-light">
                Evita confusiones habituales entre billetes de color similar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-2 rounded-xl hover:bg-stone-800 transition cursor-pointer"
            title="Cerrar guía"
            aria-label="Cerrar guía visual de billetes"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Critical Warning Box */}
          <div className="bg-rose-50 border-2 border-rose-300/80 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs">
            <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
              <span>¡Alerta Máxima de Confusión: 20.000 ₫ vs 500.000 ₫!</span>
            </div>

            <p className="text-xs text-rose-900 leading-relaxed font-light">
              Ambos billetes son de <strong>polímero plástico y tonos azulados</strong>. De noche en un taxi o mercado con poca luz, es muy fácil entregar un billete de <strong>500.000 ₫ ({formatApprox(500000)})</strong> creyendo que es de <strong>20.000 ₫ ({formatApprox(20000)})</strong>. ¡Una diferencia de <strong>25 veces su valor</strong>!
            </p>

            {/* Comparison Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 bg-white rounded-2xl border border-blue-200 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-black text-blue-700 text-lg tracking-tight">20.000 ₫</span>
                  <span className="text-xs font-semibold text-stone-500 font-mono">
                    {formatApprox(20000)}
                  </span>
                </div>
                <div className="text-xs font-bold text-stone-800 mt-1">Azul marino oscuro</div>
                <p className="text-[11px] text-stone-600 mt-1 font-light leading-relaxed">
                  • Reverso: <strong>Puente Japonés (Hội An)</strong>
                  <br />• Tamaño mediano / pequeño
                  <br />• Ventana transparente con "20000"
                </p>
              </div>

              <div className="p-3.5 bg-white rounded-2xl border border-teal-300 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-black text-teal-700 text-lg tracking-tight">500.000 ₫</span>
                  <span className="text-xs font-semibold text-stone-500 font-mono">
                    {formatApprox(500000)}
                  </span>
                </div>
                <div className="text-xs font-bold text-stone-800 mt-1">Azul verdoso / Cian claro</div>
                <p className="text-[11px] text-stone-600 mt-1 font-light leading-relaxed">
                  • Reverso: <strong>Casa de Ho Chi Minh en Kim Liên</strong>
                  <br />• Billete de <strong>máximo valor</strong> y mayor tamaño
                  <br />• Ventana transparente con "500000"
                </p>
              </div>
            </div>

            <div className="bg-white/90 p-3 rounded-xl text-xs text-rose-950 font-medium border border-rose-200/60 shadow-2xs">
              💡 <strong>Regla de oro:</strong> Guarda los billetes de 500.000 ₫ en un compartimento separado o bolsillo interior y nunca los mezcles con el dinero suelto diario de 10k/20k.
            </div>
          </div>

          {/* Complete Banknote Catalog */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-stone-500 font-mono">
              Catálogo de Billetes de Vietnam (Polímero)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {BANKNOTES.map((note) => (
                <div
                  key={note.vnd}
                  className={`p-4 rounded-2xl border ${note.borderColor} ${note.accentBg} space-y-1.5 transition shadow-2xs`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-lg text-stone-900 tabular-nums tracking-tight">
                      {note.vnd.toLocaleString('es-ES')} ₫
                    </span>
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold ${note.tagColor}`}>
                      {formatApprox(note.vnd)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 border border-stone-400/80 shadow-2xs"
                      style={{ backgroundColor: note.color }}
                    />
                    <span>{note.colorName}</span>
                  </div>

                  <p className="text-[11px] text-stone-600 font-light leading-relaxed">
                    🏛️ <strong>Ilustración:</strong> {note.landmark}
                  </p>
                  <p className="text-[10px] text-stone-500 font-mono">
                    {note.material}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Tips for Foreign Travelers */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-2 text-stone-800">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Consejos prácticos para pagar en efectivo en Vietnam:</span>
            </div>
            <ul className="text-xs text-stone-700 space-y-1.5 font-light list-disc list-inside">
              <li>
                <strong>Billetes de papel antiguos (1.000, 2.000, 5.000 ₫):</strong> Apenas valen unos céntimos de {currInfo.symbol}. Suelen usarse para vueltas exactas o propinas simbólicas en templos.
              </li>
              <li>
                <strong>Comprueba siempre los ceros:</strong> En puestos callejeros y menús a menudo se abrevia "50" por 50.000 ₫ o "100k" por 100.000 ₫.
              </li>
              <li>
                <strong>No dobles ni rompas billetes de polímero:</strong> Los billetes rotos o muy deteriorados suelen ser rechazados en tiendas y cajeros automáticos.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-stone-50 px-6 py-3.5 border-t border-stone-200/80 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold cursor-pointer transition shadow-xs"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
