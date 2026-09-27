import React from 'react';
import { MultiTimeframeConsensus } from '../types';
import { Zap, Clock, CheckCircle2, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ConsensusPanelProps {
  consensus: MultiTimeframeConsensus | null;
  theme?: 'light' | 'dark';
}

export const ConsensusPanel: React.FC<ConsensusPanelProps> = ({
  consensus,
  theme = 'dark'
}) => {
  if (!consensus) {
    return (
      <div className="p-8 text-center text-slate-500 text-xs">
        Çoklu zaman dilimi verisi hesaplanıyor...
      </div>
    );
  }

  const isLight = theme === 'light';
  const { consensusDirection, overallScore, timeframes } = consensus;

  const getConsensusBadge = () => {
    switch (consensusDirection) {
      case 'STRONG_LONG':
        return {
          text: '▲ GÜÇLÜ AL (STRONG LONG)',
          color: isLight
            ? 'text-emerald-700 bg-emerald-100 border-emerald-300'
            : 'text-emerald-400 bg-emerald-500/15 border-emerald-500/40'
        };
      case 'LONG':
        return {
          text: '▲ AL (BULLISH)',
          color: isLight
            ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
            : 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30'
        };
      case 'STRONG_SHORT':
        return {
          text: '▼ GÜÇLÜ SAT (STRONG SHORT)',
          color: isLight
            ? 'text-rose-700 bg-rose-100 border-rose-300'
            : 'text-rose-400 bg-rose-500/15 border-rose-500/40'
        };
      case 'SHORT':
        return {
          text: '▼ SAT (BEARISH)',
          color: isLight
            ? 'text-rose-700 bg-rose-50 border-rose-200'
            : 'text-rose-300 bg-rose-500/10 border-rose-500/30'
        };
      case 'NEUTRAL':
      default:
        return {
          text: '◆ NÖTR / YATAY (KONSOLİDASYON)',
          color: isLight
            ? 'text-amber-800 bg-amber-100 border-amber-300'
            : 'text-amber-400 bg-amber-500/15 border-amber-500/40'
        };
    }
  };

  const badge = getConsensusBadge();

  return (
    <div className="space-y-4 p-3 sm:p-4 text-xs select-none">
      {/* Overall Consensus Hero Card */}
      <div
        className={`p-4 rounded-2xl border shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors duration-200 ${
          isLight
            ? 'bg-white border-slate-200/90 shadow-sm text-slate-800'
            : 'bg-gradient-to-r from-[#161d2d] to-[#111622] border-white/10 text-slate-200'
        }`}
      >
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Genel Algoritmik Konsensüs (1m • 5m • 15m)
          </span>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span
              className={`font-mono font-black text-sm px-3 py-1 rounded-xl border ${badge.color}`}
            >
              {badge.text}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block font-medium">Konsensüs Güveni</span>
            <span className={`font-mono text-xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
              %{overallScore}
            </span>
          </div>
          <div className="w-10 h-10 rounded-full border-3 border-blue-500/30 border-t-blue-500 flex items-center justify-center font-mono font-black text-xs text-blue-500">
            {overallScore}
          </div>
        </div>
      </div>

      {/* Timeframe Forecast Grid (1m, 5m, 15m) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(['1m', '5m', '15m'] as const).map((tf) => {
          const item = timeframes[tf];
          const isBull = item.direction === 'BULLISH';
          const isBear = item.direction === 'BEARISH';

          return (
            <div
              key={tf}
              className={`p-3.5 rounded-2xl border space-y-2.5 flex flex-col justify-between transition-colors duration-200 ${
                isLight ? 'bg-white border-slate-200/90 shadow-sm' : 'bg-white/[0.02] border-white/5'
              }`}
            >
              <div
                className={`flex justify-between items-center border-b pb-2 ${
                  isLight ? 'border-slate-100' : 'border-white/5'
                }`}
              >
                <span
                  className={`font-mono font-black text-sm flex items-center gap-1.5 ${
                    isLight ? 'text-blue-600' : 'text-cyan-400'
                  }`}
                >
                  <Clock size={14} /> {tf.toUpperCase()} ({tf === '1m' ? '1 Dk' : tf === '5m' ? '5 Dk' : '15 Dk'})
                </span>
                <span
                  className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    isBull
                      ? isLight
                        ? 'text-emerald-700 bg-emerald-100'
                        : 'text-emerald-400 bg-emerald-500/15'
                      : isBear
                      ? isLight
                        ? 'text-rose-700 bg-rose-100'
                        : 'text-rose-400 bg-rose-500/15'
                      : isLight
                      ? 'text-amber-800 bg-amber-100'
                      : 'text-amber-400 bg-amber-500/15'
                  }`}
                >
                  {isBull ? 'AL' : isBear ? 'SAT' : 'NÖTR'} (%{item.confidence})
                </span>
              </div>

              {/* Reasons list */}
              <div className="space-y-1.5 flex-1">
                {item.reasons.map((r, rIdx) => (
                  <div
                    key={rIdx}
                    className={`flex items-start gap-1.5 text-[11px] ${
                      isLight ? 'text-slate-600' : 'text-slate-300'
                    }`}
                  >
                    <span className={isLight ? 'text-blue-600 font-bold mt-0.5' : 'text-cyan-400 font-bold mt-0.5'}>
                      •
                    </span>
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
