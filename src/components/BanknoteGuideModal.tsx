import React from 'react';
import { AlertTriangle, X, ShieldAlert, CheckCircle2, Info } from 'lucide-react';

interface BanknoteGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  eurToVndRate: number;
}

interface BanknoteInfo {
  vnd: number;
  color: string;
  colorName: string;
  landmark: string;
  material: string;
  approxEur: (vnd: number, rate: number) => string;
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
    approxEur: (v, r) => `≈ ${(v / r).toFixed(1)} €`,
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
    approxEur: (v, r) => `≈ ${(v / r).toFixed(1)} €`,
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
    approxEur: (v, r) => `≈ ${(v / r).toFixed(1)} €`,
    accentBg: 'bg-emerald-950/20 border-emerald-500/40 text-emerald-800',
    borderColor: 'border-emerald-400',
    tagColor: 'bg-emerald-100 text-emerald-900',
  },
  {
    vnd: 50000,
    color: '#d946ef',
    colorName: 'Rosa magenta / Púrpura',
    landmark: 'Pabellón Nghinh Lương y Phu Van Lau (Huế)',
    material: 'Polímero plástico',
    approxEur: (v, r) => `≈ ${(v / r).toFixed(1)} €`,
    accentBg: 'bg-fuchsia-950/20 border-fuchsia-500/40 text-fuchsia-800',
    borderColor: 'border-fuchsia-400',
    tagColor: 'bg-fuchsia-100 text-fuchsia-900',
  },
  {
    vnd: 20000,
    color: '#2563eb',
    colorName: 'Azul zafiro oscuro',
    landmark: 'Puente Pagoda Japonés Chùa Cầu (Hội An)',
    material: 'Polímero plástico (tamaño mediano)',
    approxEur: (v, r) => `≈ ${(v / r).toFixed(1)} €`,
    accentBg: 'bg-blue-950/20 border-blue-500/40 text-blue-800',
    borderColor: 'border-blue-400',
    tagColor: 'bg-blue-100 text-blue-900',
  },
  {
    vnd: 10000,
    color: '#d97706',
    colorName: 'Amarillo ocre / Marrón claro',
    landmark: 'Plataforma petrolífera marina Bạch Hổ',
    material: 'Polímero plástico (billete más pequeño de polímero)',
    approxEur: (v, r) => `≈ ${(v / r).toFixed(1)} €`,
    accentBg: 'bg-amber-950/20 border-amber-500/40 text-amber-800',
    borderColor: 'border-amber-400',
    tagColor: 'bg-amber-100 text-amber-900',
  },
];

export const BanknoteGuideModal: React.FC<BanknoteGuideModalProps> = ({
  isOpen,
  onClose,
  eurToVndRate,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-[#FAF8F5] rounded-3xl border border-stone-200/90 max-w-2xl w-full shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden my-6">
        {/* Header */}
        <div className="bg-[#141210] text-white px-6 py-4.5 flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/30 shadow-inner">
              <AlertTriangle className="w-4.5 h-4.5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-stone-100 tracking-wide">Guía de Billetes de Vietnam</h3>
              <p className="text-xs text-stone-400 font-light">Identificación rápida y cómo evitar la confusión 20k vs 500k</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-stone-800/80 text-stone-400 hover:text-white transition cursor-pointer border border-transparent hover:border-stone-700"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* THE FAMOUS 20K VS 500K CONFUSION ALERT */}
          <div className="bg-rose-500/10 border-2 border-rose-300/80 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-[11px] uppercase tracking-wider font-mono">
                ¡Alerta Viajero!
              </span>
              <h4 className="font-bold text-sm sm:text-base text-rose-950">
                La confusión más cara: 20.000₫ vs 500.000₫
              </h4>
            </div>

            <p className="text-xs text-rose-900 leading-relaxed font-light">
              Ambos billetes son de <strong>polímero plástico y tonos azulados</strong>. De noche en un taxi o mercado con poca luz, es muy fácil entregar un billete de <strong>500.000 ₫ (≈ 17,20 €)</strong> creyendo que es de <strong>20.000 ₫ (≈ 0,70 €)</strong>. ¡Una diferencia de <strong>25 veces su valor</strong>!
            </p>

            {/* Comparison Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 bg-white rounded-2xl border border-blue-200 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-black text-blue-700 text-lg tracking-tight">20.000 ₫</span>
                  <span className="text-xs font-semibold text-stone-500 font-mono">
                    ≈ {(20000 / eurToVndRate).toFixed(2)} €
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
                    ≈ {(500000 / eurToVndRate).toFixed(2)} €
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
              Catálogo de Billetes Oficiales de Vietnam (Polímero)
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
                      {note.approxEur(note.vnd, eurToVndRate)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 border border-stone-400/80 shadow-2xs"
                      style={{ backgroundColor: note.color }}
                    />
                    <span>{note.colorName}</span>
                  </div>

                  <p className="text-xs text-stone-600 leading-snug font-light">
                    🏛️ <strong>Monumento:</strong> {note.landmark}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* No Coins in Vietnam Note */}
          <div className="bg-white border border-stone-200/90 rounded-2xl p-4 flex items-start gap-3 text-xs text-stone-600 shadow-2xs">
            <Info className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
            <div className="leading-relaxed font-light">
              <strong className="text-stone-800 font-semibold">En Vietnam no circulan monedas:</strong> Todas las transacciones se realizan con billetes. Existen también billetes de papel de 1.000 ₫, 2.000 ₫ y 5.000 ₫ que se utilizan habitualmente para pagar el estacionamiento de motos o el vuelto en puestos callejeros (menos de 0,20 €).
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-stone-100/80 px-6 py-3.5 border-t border-stone-200/90 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#141210] hover:bg-stone-800 text-white text-xs font-semibold cursor-pointer transition shadow-xs active:scale-95"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
