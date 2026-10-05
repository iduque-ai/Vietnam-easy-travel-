import React, { useState } from 'react';
import {
  PhoneCall,
  ShieldAlert,
  HeartPulse,
  Flame,
  Globe,
  MapPin,
  Clock,
  Volume2,
  X,
  ExternalLink,
  AlertTriangle,
  Building2,
  Copy,
  Check,
} from 'lucide-react';
import { speakVietnamese } from '../utils/storage';
import { useScrollLock } from '../hooks/useScrollLock';

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  vietnamTime: string;
  spainTime: string;
}

const EMERGENCY_SERVICES = [
  {
    number: '115',
    title: 'Ambulancia / Urgencias Médicas',
    titleVi: 'Cấp cứu y tế',
    desc: 'Atención médica de emergencia y traslados a hospital',
    icon: HeartPulse,
    bgClass: 'bg-rose-50 border-rose-200 text-rose-700',
    btnClass: 'bg-rose-600 hover:bg-rose-700 text-white',
  },
  {
    number: '113',
    title: 'Policía Nacional',
    titleVi: 'Cảnh sát phản ứng nhanh',
    desc: 'Incidentes graves, robos, agresiones o accidentes de tráfico',
    icon: ShieldAlert,
    bgClass: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  },
  {
    number: '114',
    title: 'Bomberos & Rescate',
    titleVi: 'Cứu hỏa và cứu hộ',
    desc: 'Incendios, inundaciones y rescates de emergencia',
    icon: Flame,
    bgClass: 'bg-amber-50 border-amber-200 text-amber-700',
    btnClass: 'bg-amber-600 hover:bg-amber-700 text-white',
  },
];

const EMERGENCY_PHRASES = [
  {
    vi: 'Tôi cần giúp đỡ khẩn cấp!',
    phonetic: 'Toi kan yiup do kan kap!',
    es: '¡Necesito ayuda urgente!',
  },
  {
    vi: 'Làm ơn gọi xe cấp cứu giúp tôi!',
    phonetic: 'Lam on goi se cap kiu yiup toi!',
    es: '¡Por favor llame a una ambulancia!',
  },
  {
    vi: 'Tôi bị mất hộ chiếu và ví tiền.',
    phonetic: 'Toi bi mat ho chieu va vi tien.',
    es: 'He perdido mi pasaporte y mi cartera.',
  },
  {
    vi: 'Bệnh viện quốc tế gần nhất ở đâu?',
    phonetic: 'Ben vien kuoc te gan nhat o dau?',
    es: '¿Dónde está el hospital internacional más cercano?',
  },
];

export const EmergencyModal: React.FC<EmergencyModalProps> = ({
  isOpen,
  onClose,
  vietnamTime,
  spainTime,
}) => {
  useScrollLock(isOpen);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-[#FAF8F5] rounded-3xl border border-stone-200/90 max-w-xl w-full shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden my-6">
        {/* Header - Luxury Noir with Rose Accent */}
        <div className="bg-[#141210] text-white px-6 py-4.5 flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center border border-rose-500/30 shadow-inner">
              <ShieldAlert className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-stone-100 tracking-wide">Emergencias & Asistencia Consular</h3>
              <p className="text-xs text-stone-400 font-light">Teléfonos 24h oficiales y frases clave en Vietnam</p>
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
          {/* Dual Local Time Banner */}
          <div className="bg-white border border-stone-200/90 rounded-2xl p-4 flex items-center justify-around gap-2 text-center shadow-xs">
            <div>
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block font-mono">
                🇻🇳 Vietnam (UTC+7)
              </span>
              <span className="font-mono text-xl font-black text-amber-600 tabular-nums tracking-tight">
                {vietnamTime || '--:--:--'}
              </span>
            </div>
            <div className="h-8 w-px bg-stone-200" />
            <div>
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block font-mono">
                🇪🇸 España (Península)
              </span>
              <span className="font-mono text-xl font-bold text-stone-800 tabular-nums tracking-tight">
                {spainTime || '--:--:--'}
              </span>
            </div>
          </div>

          {/* Quick Dial Primary Emergency Numbers in Vietnam */}
          <div className="space-y-2.5">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-stone-500 font-mono">
              Teléfonos de Emergencia Oficiales en Vietnam
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {EMERGENCY_SERVICES.map((srv) => {
                const IconComponent = srv.icon;
                return (
                  <div
                    key={srv.number}
                    className={`p-4 rounded-2xl border ${srv.bgClass} flex flex-col justify-between shadow-xs transition hover:shadow-md`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <IconComponent className="w-4.5 h-4.5" />
                        <span className="font-mono font-black text-2xl tabular-nums tracking-tight">{srv.number}</span>
                      </div>
                      <h5 className="font-bold text-xs text-stone-900 leading-tight">{srv.title}</h5>
                      <span className="text-[10px] opacity-75 italic block mt-0.5">{srv.titleVi}</span>
                    </div>

                    <a
                      href={`tel:${srv.number}`}
                      className={`mt-3.5 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${srv.btnClass} shadow-xs active:scale-95`}
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>Llamar {srv.number}</span>
                    </a>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Spanish Embassy & Consulates */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-stone-500 font-mono">
              Embajada y Protección Consular de España
            </h4>

            {/* Emergency Hotline 24h */}
            <div className="bg-rose-500/10 border border-rose-300/80 rounded-2xl p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-black tracking-wider uppercase">
                    EMERGENCIA 24H
                  </span>
                  <h5 className="font-bold text-sm text-stone-900">Móvil de Emergencia Consular</h5>
                </div>
                <p className="text-xs text-stone-600 mt-1 font-light leading-relaxed">
                  Exclusivo para españoles en situación de grave necesidad (accidentes, detenciones o fallecimientos).
                </p>
                <div className="font-mono text-base font-black text-rose-700 mt-1.5 tabular-nums">
                  +84 93 628 0663
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopy('+84936280663', 'consular')}
                  className="px-3 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition shadow-2xs active:scale-95"
                >
                  {copiedText === 'consular' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedText === 'consular' ? 'Copiado' : 'Copiar'}</span>
                </button>
                <a
                  href="tel:+84936280663"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs active:scale-95"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Llamar</span>
                </a>
              </div>
            </div>

            {/* Central Embassy Hanoi */}
            <div className="bg-white border border-stone-200/90 rounded-2xl p-4.5 space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-4.5 h-4.5 text-amber-600" />
                  <h5 className="font-bold text-xs sm:text-sm text-stone-900">Embajada de España en Hanói</h5>
                </div>
                <a
                  href="https://www.exteriores.gob.es/embajadas/hanoi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-stone-400 hover:text-stone-700 text-xs flex items-center gap-1 transition"
                >
                  <span>Web Oficial</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed font-light">
                4 Hoang Dieu, Ba Dinh, Hanoi (Lunes a Viernes 08:30 - 16:00)
              </p>
              <div className="flex items-center gap-3 pt-1 text-xs">
                <a
                  href="tel:+842437715207"
                  className="text-amber-700 hover:text-amber-900 font-semibold font-mono tabular-nums flex items-center gap-1"
                >
                  <PhoneCall className="w-3.5 h-3.5" /> +84 24 3771 5207
                </a>
              </div>
            </div>
          </div>

          {/* Useful Vietnamese Emergency Phrases */}
          <div className="space-y-2.5">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-stone-500 font-mono">
              Frases de Emergencia en Vietnamita con Audio
            </h4>
            <div className="space-y-2">
              {EMERGENCY_PHRASES.map((phrase, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-white hover:bg-stone-50/80 rounded-2xl border border-stone-200/90 flex items-center justify-between gap-3 transition shadow-2xs"
                >
                  <div className="min-w-0">
                    <p className="font-serif font-bold text-sm text-stone-900 leading-snug">{phrase.vi}</p>
                    <p className="text-[11px] text-stone-500 italic mt-0.5 font-sans">"{phrase.phonetic}"</p>
                    <p className="text-xs text-stone-700 font-medium mt-0.5">{phrase.es}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => speakVietnamese(phrase.vi)}
                    className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 transition cursor-pointer shrink-0 shadow-2xs active:scale-95"
                    title="Reproducir audio en vietnamita"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
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
