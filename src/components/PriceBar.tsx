import React from 'react';
import { TickerData } from '../types';
import { fmtPrice, fmtPct } from '../services/dataFeed';
import { PlusCircle, MoveHorizontal, MoveVertical } from 'lucide-react';

interface PriceBarProps {
  ticker: TickerData | null;
  lastClose: number | null;
  precision: number;
  locale: string;
  countdown: string;
  theme?: 'light' | 'dark';
  clickAddLevel: boolean;
  clickAddVLine: boolean;
  onToggleAddLevel: () => void;
  onToggleAddVLine: () => void;
}

export const PriceBar: React.FC<PriceBarProps> = ({
  ticker,
  lastClose,
  precision,
  locale,
  countdown,
  theme = 'dark',
  clickAddLevel,
  clickAddVLine,
  onToggleAddLevel,
  onToggleAddVLine
}) => {
  const currentPrice = ticker?.last ?? lastClose ?? null;
  const changePct = ticker?.changePct ?? 0;
  const isUp = changePct >= 0;
  const isLight = theme === 'light';

  return (
    <div
      className={`px-3 py-1.5 flex items-center justify-between gap-2 border-b select-none transition-colors duration-200 ${
        isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0e111a]/70 border-white/5'
      }`}
    >
      {/* Price & Change */}
      <div className="flex items-baseline gap-1.5 sm:gap-2.5 min-w-0 truncate">
        <span
          className={`font-mono text-xl sm:text-3xl font-black tracking-tight leading-none truncate ${
            isUp ? (isLight ? 'text-emerald-600' : 'text-emerald-400') : (isLight ? 'text-rose-600' : 'text-rose-400')
          }`}
        >
          {fmtPrice(currentPrice, precision, locale)}
        </span>

        <span
          className={`font-mono text-[11px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded-lg leading-tight shrink-0 ${
            isUp
              ? isLight
                ? 'text-emerald-700 bg-emerald-100 border border-emerald-200'
                : 'text-emerald-400 bg-emerald-500/15'
              : isLight
              ? 'text-rose-700 bg-rose-100 border border-rose-200'
              : 'text-rose-400 bg-rose-500/15'
          }`}
        >
          {fmtPct(changePct)}
        </span>
      </div>

      {/* Right Controls: Drawing Mode Chips & Bar Countdown */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Click to add level quick button */}
        <button
          onClick={onToggleAddLevel}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition active:scale-95 ${
            clickAddLevel
              ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30 ring-2 ring-amber-400'
              : isLight
              ? 'bg-slate-200/80 text-slate-700 hover:text-slate-900 hover:bg-slate-300/80 border border-slate-300/60'
              : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
          }`}
          title="Grafiğe dokunduğun fiyata yatay seviye ekle"
        >
          <MoveHorizontal size={12} />
          <span className="hidden sm:inline">Seviye</span>
        </button>

        {/* Click to add vertical line quick button */}
        <button
          onClick={onToggleAddVLine}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition active:scale-95 ${
            clickAddVLine
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 ring-2 ring-blue-400'
              : isLight
              ? 'bg-slate-200/80 text-slate-700 hover:text-slate-900 hover:bg-slate-300/80 border border-slate-300/60'
              : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
          }`}
          title="Grafiğe dokunduğun zamana dikey çizgi ekle"
        >
          <MoveVertical size={12} />
          <span className="hidden sm:inline">Dikey</span>
        </button>

        {/* Bar Close Countdown */}
        {countdown && (
          <div
            className={`font-mono text-xs font-bold px-2 py-1 rounded-lg border ${
              isLight
                ? 'bg-blue-50 text-blue-600 border-blue-200'
                : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
            }`}
          >
            {countdown}
          </div>
        )}
      </div>
    </div>
  );
};
