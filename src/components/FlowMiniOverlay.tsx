import React, { useState } from 'react';
import { RawFlowMetrics } from '../types';
import { ChevronDown, ChevronUp, Activity } from 'lucide-react';

interface FlowMiniOverlayProps {
  metrics: RawFlowMetrics | null;
  theme?: 'light' | 'dark';
}

export const FlowMiniOverlay: React.FC<FlowMiniOverlayProps> = ({
  metrics,
  theme = 'dark'
}) => {
  const [collapsed, setCollapsed] = useState(false);
  if (!metrics) return null;

  const isLight = theme === 'light';
  const { cvd60, obi, oiChangePct, fundingRate } = metrics;

  const fmtUsdCompact = (val: number) => {
    const sign = val > 0 ? '+' : '';
    if (Math.abs(val) >= 1_000_000) return `${sign}${(val / 1_000_000).toFixed(1)}M`;
    if (Math.abs(val) >= 1_000) return `${sign}${(val / 1_000).toFixed(0)}k`;
    return `${sign}${Math.round(val)}`;
  };

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className={`absolute top-2.5 left-2.5 z-20 px-2 py-1 rounded-lg border backdrop-blur-md text-[10px] font-mono font-bold flex items-center gap-1.5 shadow-lg transition-all active:scale-95 ${
          isLight
            ? 'bg-white/95 border-slate-300 text-slate-800 shadow-sm'
            : 'bg-[#141822]/95 border-cyan-500/30 text-cyan-400 shadow-cyan-950/40'
        }`}
        title="Order Flow Panelini Genişlet"
      >
        <Activity size={12} className={cvd60 >= 0 ? 'text-emerald-500' : 'text-rose-500'} />
        <span>CVD {fmtUsdCompact(cvd60)}</span>
        <ChevronDown size={11} className="opacity-70" />
      </button>
    );
  }

  return (
    <div
      className={`absolute top-2.5 left-2.5 z-20 min-w-[124px] p-2 rounded-xl border backdrop-blur-md text-[10.5px] select-none shadow-xl transition-all duration-200 pointer-events-auto ${
        isLight
          ? 'bg-white/95 border-slate-200/90 text-slate-800 shadow-sm'
          : 'bg-[#141822]/95 border-white/10 text-slate-300 shadow-black/60'
      }`}
    >
      <div className="flex items-center justify-between gap-1 pb-1 mb-1 border-b border-inherit">
        <span className="font-extrabold text-[9px] uppercase tracking-wider text-slate-400 flex items-center gap-1">
          <Activity size={10} className="text-cyan-400" />
          Raw Flow
        </span>
        <button
          onClick={() => setCollapsed(true)}
          className="p-0.5 rounded hover:bg-white/10 text-slate-400 hover:text-white transition"
          title="Paneli Küçült"
        >
          <ChevronUp size={11} />
        </button>
      </div>

      <div className="flex items-center justify-between gap-2.5 mb-1">
        <span className="font-semibold text-slate-400 text-[10px]">CVD60</span>
        <b
          className={`font-mono font-bold ${
            cvd60 >= 0
              ? isLight
                ? 'text-emerald-600'
                : 'text-emerald-400'
              : isLight
              ? 'text-rose-600'
              : 'text-rose-400'
          }`}
        >
          {fmtUsdCompact(cvd60)}
        </b>
      </div>

      <div className="flex items-center justify-between gap-2.5 mb-1">
        <span className="font-semibold text-slate-400 text-[10px]">OBI</span>
        <b
          className={`font-mono font-bold ${
            obi >= 0
              ? isLight
                ? 'text-emerald-600'
                : 'text-emerald-400'
              : isLight
              ? 'text-rose-600'
              : 'text-rose-400'
          }`}
        >
          {obi >= 0 ? `+${obi.toFixed(1)}%` : `${obi.toFixed(1)}%`}
        </b>
      </div>

      <div className="flex items-center justify-between gap-2.5 mb-1">
        <span className="font-semibold text-slate-400 text-[10px]">OI Δ</span>
        <b
          className={`font-mono font-bold ${
            oiChangePct >= 0
              ? isLight
                ? 'text-emerald-600'
                : 'text-emerald-400'
              : isLight
              ? 'text-rose-600'
              : 'text-rose-400'
          }`}
        >
          {oiChangePct >= 0 ? `+${oiChangePct.toFixed(2)}%` : `${oiChangePct.toFixed(2)}%`}
        </b>
      </div>

      <div className="flex items-center justify-between gap-2.5">
        <span className="font-semibold text-slate-400 text-[10px]">Funding</span>
        <b
          className={`font-mono font-bold ${
            fundingRate >= 0 ? 'text-amber-500' : 'text-cyan-400'
          }`}
        >
          {fundingRate >= 0 ? `+${(fundingRate * 100).toFixed(4)}%` : `${(fundingRate * 100).toFixed(4)}%`}
        </b>
      </div>
    </div>
  );
};
