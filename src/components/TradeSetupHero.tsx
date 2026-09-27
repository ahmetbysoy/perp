import React from 'react';
import { TradeSetup, MultiTimeframeConsensus } from '../types';
import { fmtPrice } from '../services/dataFeed';
import { Target, ShieldAlert, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';

interface TradeSetupHeroProps {
  setup: TradeSetup | null;
  consensus: MultiTimeframeConsensus | null;
  currentPrice: number | null;
  precision: number;
  locale: string;
  theme?: 'light' | 'dark';
}

export const TradeSetupHero: React.FC<TradeSetupHeroProps> = ({
  setup,
  consensus,
  currentPrice,
  precision,
  locale,
  theme = 'dark'
}) => {
  if (!setup || currentPrice == null) return null;

  const isShort = setup.direction === 'SHORT';
  const isLight = theme === 'light';

  return (
    <div
      className={`mx-2 my-2 p-3.5 rounded-2xl border shadow-lg space-y-3 select-none transition-colors duration-200 ${
        isLight
          ? 'bg-white border-slate-200/90 shadow-sm text-slate-800'
          : 'bg-gradient-to-r from-[#161d2d] to-[#111622] border-white/10 text-slate-200'
      }`}
    >
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5 ${
          isLight ? 'border-slate-100' : 'border-white/5'
        }`}
      >
        <div>
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            Otonom Algoritmik Kurulum
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`font-mono text-xs font-black px-2.5 py-0.5 rounded-lg flex items-center gap-1 ${
                isShort
                  ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30'
                  : 'bg-emerald-500/20 text-emerald-600 border border-emerald-500/30'
              }`}
            >
              {isShort ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
              {isShort ? 'SATIŞ1 (SHORT)' : 'GÜÇLÜ AL (LONG)'}
            </span>

            <span className={`font-mono text-xs font-bold ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              R:R {setup.riskRewardRatio}
            </span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-slate-400 font-medium block">Beklenen Kâr</span>
          <span className="font-mono text-sm font-black text-emerald-500">
            +%{setup.expectedPnlPct}
          </span>
        </div>
      </div>

      {/* Grid of Entry, SL, TP1, TP2 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
        <div
          className={`p-2 rounded-xl border ${
            isLight ? 'bg-cyan-50/60 border-cyan-200/60' : 'bg-white/[0.02] border-white/5'
          }`}
        >
          <span className="text-[9px] text-slate-400 uppercase font-sans font-bold block">GİRİŞ (ENTRY)</span>
          <span className={`font-bold text-sm mt-0.5 block ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`}>
            {fmtPrice(setup.entry, precision, locale)}
          </span>
        </div>

        <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
          <span className="text-[9px] text-rose-500 uppercase font-sans font-bold block">STOP LOSS (SL)</span>
          <span className="font-bold text-rose-500 text-sm mt-0.5 block">
            {fmtPrice(setup.sl, precision, locale)}
          </span>
        </div>

        <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <span className="text-[9px] text-emerald-600 uppercase font-sans font-bold block">HEDEF 1 (TP1)</span>
          <span className="font-bold text-emerald-600 text-sm mt-0.5 block">
            {fmtPrice(setup.tp1, precision, locale)}
          </span>
        </div>

        <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <span className="text-[9px] text-emerald-600 uppercase font-sans font-bold block">DİNAMİK TP (TP2)</span>
          <span className="font-bold text-emerald-600 text-sm mt-0.5 block">
            {fmtPrice(setup.tp2, precision, locale)}
          </span>
        </div>
      </div>
    </div>
  );
};
