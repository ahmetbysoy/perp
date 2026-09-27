import React from 'react';
import { StrategyChain } from '../types';
import { fmtPrice, fmtPct } from '../services/dataFeed';
import { ArrowDownRight, Target, Calculator } from 'lucide-react';

interface PositionChipProps {
  activeChain: StrategyChain | null;
  lastClose: number | null;
  currentGaussian: number | null;
  precision: number;
  locale: string;
  theme?: 'light' | 'dark';
  onOpenCalculator: () => void;
}

export const PositionChip: React.FC<PositionChipProps> = ({
  activeChain,
  lastClose,
  currentGaussian,
  precision,
  locale,
  theme = 'dark',
  onOpenCalculator
}) => {
  if (!activeChain || activeChain.status !== 'acik' || activeChain.sellPrice == null || lastClose == null) {
    return null;
  }

  const isLight = theme === 'light';

  // Short trade PnL = (Entry - Current) / Entry * 100
  const pnlPct = ((activeChain.sellPrice - lastClose) / activeChain.sellPrice) * 100;
  const isProfit = pnlPct >= 0;

  // Distance to Dynamic TP (Gaussian line)
  const distToTp = currentGaussian != null ? Math.abs((currentGaussian - lastClose) / lastClose) * 100 : null;

  return (
    <div
      className={`mx-2 my-1 px-3 py-1.5 rounded-xl border shadow-md flex items-center justify-between gap-2 flex-wrap text-xs select-none transition-colors duration-200 ${
        isLight
          ? 'bg-white border-slate-200/90 text-slate-800 shadow-sm'
          : 'bg-gradient-to-r from-[#171a24] to-[#12151e] border-white/10 text-slate-200'
      }`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className="flex items-center gap-1 font-extrabold px-2 py-0.5 rounded-md bg-rose-500 text-white shadow-sm text-[11px]">
          <ArrowDownRight size={13} />
          SATIŞ{activeChain.id}
        </span>

        <span className={isLight ? 'text-slate-600 font-medium' : 'text-slate-300 font-medium'}>
          Giriş:{' '}
          <b className={`font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>
            {fmtPrice(activeChain.sellPrice, precision, locale)}
          </b>
        </span>

        <span className={`flex items-center gap-1 font-medium ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
          <Target size={12} className="text-emerald-500" />
          Dinamik TP:{' '}
          <b className="font-mono text-emerald-500">
            {currentGaussian != null ? fmtPrice(currentGaussian, precision, locale) : 'Yeşil Çizgi'}
          </b>
        </span>

        {distToTp != null && (
          <span className={`text-[11px] font-mono hidden sm:inline ${isLight ? 'text-slate-400' : 'text-slate-400'}`}>
            (Mesafe: %{distToTp.toFixed(2)})
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <span
          className={`font-mono text-xs font-black px-2 py-0.5 rounded-md ${
            isProfit
              ? isLight
                ? 'text-emerald-700 bg-emerald-100 border border-emerald-200'
                : 'text-emerald-400 bg-emerald-500/15'
              : isLight
              ? 'text-rose-700 bg-rose-100 border border-rose-200'
              : 'text-rose-400 bg-rose-500/15'
          }`}
        >
          {fmtPct(pnlPct)}
        </span>

        <button
          onClick={onOpenCalculator}
          className={`p-1 rounded-lg transition ${
            isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white'
          }`}
          title="Bu sinyalle hesaplama yap"
        >
          <Calculator size={14} />
        </button>
      </div>
    </div>
  );
};
