import React from 'react';
import { RawFlowMetrics, StrategyChain, PatternRecord } from '../types';
import { fmtPrice } from '../services/dataFeed';
import { Zap, CheckCircle2, XCircle, Clock, AlertTriangle, ShieldCheck, TrendingDown, TrendingUp } from 'lucide-react';

interface DecisionSignalCardProps {
  metrics: RawFlowMetrics | null;
  activeChain: StrategyChain | null;
  bestPattern: PatternRecord | null;
  precision: number;
  locale: string;
  theme?: 'light' | 'dark';
}

export const DecisionSignalCard: React.FC<DecisionSignalCardProps> = ({
  metrics,
  activeChain,
  bestPattern,
  precision,
  locale,
  theme = 'dark'
}) => {
  const isLight = theme === 'light';

  const isShortActive = activeChain && activeChain.status === 'acik';
  const isPending = activeChain && activeChain.status === 'bekliyor';

  let statusLabel = 'NÖTR';
  let statusClass = isLight ? 'text-slate-500' : 'text-slate-400';
  let triggerRule = 'Aktif sinyal taranıyor... VWMA 34 & Gaussian 8 izleniyor.';

  if (isShortActive) {
    statusLabel = 'SAT (SHORT)';
    statusClass = isLight ? 'text-rose-600' : 'text-rose-400';
    triggerRule = `SATIŞ${activeChain.id}: Turuncu çizgi seviyeyi kesti. Short pozisyon aktif.`;
  } else if (isPending) {
    statusLabel = 'İZLEMEDE (V1)';
    statusClass = isLight ? 'text-amber-600' : 'text-amber-400';
    triggerRule = `V1 tespit edildi (Seviye: ${fmtPrice(activeChain.level, precision, locale)}). V2 kesişimi bekleniyor.`;
  }

  const rawScore = metrics?.rawScore || 50;

  const getScoreColor = (sc: number) => {
    if (sc >= 70) return isLight ? 'bg-emerald-500' : 'bg-emerald-400';
    if (sc <= 35) return isLight ? 'bg-rose-500' : 'bg-rose-400';
    return isLight ? 'bg-amber-500' : 'bg-amber-400';
  };

  const fmtUsd = (val: number) => {
    if (Math.abs(val) >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
    if (Math.abs(val) >= 1_000) return `$${(val / 1_000).toFixed(1)}k`;
    return `$${Math.round(val)}`;
  };

  return (
    <div className="space-y-4 p-3 sm:p-4 text-xs select-none">
      {/* 1. Karar Kartı (Decision Card) */}
      <div
        className={`p-4 rounded-2xl border shadow-xl space-y-3 transition-colors duration-200 ${
          isLight ? 'bg-white border-slate-200/90 shadow-sm' : 'bg-white/[0.03] border-white/5'
        }`}
      >
        <div className="flex items-center justify-between border-b pb-2 border-inherit">
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-slate-400">
            <Zap size={14} className="text-amber-400" />
            <span>Algoritmik Karar Kartı (Katman 1 + 2)</span>
          </div>
          {metrics && (
            <span
              className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-black border ${
                metrics.verdict === 'CONFIRM'
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : metrics.verdict === 'VETO'
                  ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                  : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
              }`}
            >
              {metrics.verdict === 'CONFIRM' ? 'TEYİT EDİLDİ ✓' : metrics.verdict === 'VETO' ? 'VETO EDİLDİ ✕' : 'BEKLEMEDE'}
            </span>
          )}
        </div>

        <div className={`font-mono text-2xl font-black ${statusClass}`}>
          {statusLabel}
        </div>

        <div className={`text-[11.5px] font-medium leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
          {triggerRule}
        </div>

        {/* Score Progress Bar */}
        <div className="pt-1">
          <div className="flex justify-between items-center text-[11px] text-slate-400 mb-1.5">
            <span>Raw Flow Güven Skoru</span>
            <span className={`font-mono font-black text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
              %{rawScore}
            </span>
          </div>
          <div
            className={`w-full h-2 rounded-full overflow-hidden ${
              isLight ? 'bg-slate-200' : 'bg-white/10'
            }`}
          >
            <div
              className={`h-full transition-all duration-300 ${getScoreColor(rawScore)}`}
              style={{ width: `${rawScore}%` }}
            />
          </div>
        </div>

        {/* Reasons List */}
        {metrics && metrics.reasons.length > 0 && (
          <div className="space-y-1 pt-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Piyasa Mikroyapısı Nedenleri:
            </span>
            <div className="grid grid-cols-1 gap-1">
              {metrics.reasons.map((r, i) => (
                <div
                  key={i}
                  className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-medium flex items-center gap-1.5 ${
                    isLight
                      ? 'bg-slate-50 border-slate-200 text-slate-700'
                      : 'bg-white/[0.02] border-white/5 text-slate-300'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                  <span>{r}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pattern History Quick Box */}
        {bestPattern && (
          <div
            className={`p-2.5 rounded-xl border text-[11px] space-y-1 ${
              isLight ? 'bg-blue-50 border-blue-200/80 text-blue-900' : 'bg-blue-500/10 border-blue-500/20 text-slate-300'
            }`}
          >
            <div className="font-bold flex items-center justify-between">
              <span>Tarihsel Performans: {bestPattern.name}</span>
              <span className="font-mono text-emerald-500 font-extrabold">
                Wilson: %{bestPattern.wilsonScore}
              </span>
            </div>
            <div className="text-[10px] opacity-80 flex items-center justify-between">
              <span>{bestPattern.count} örnekte 10-bar ortalama net getiri: <b>%{bestPattern.ret10}</b></span>
              <span>MFE/MAE: <b>{bestPattern.mfe} / {bestPattern.mae}</b></span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Raw Flow Anlık Tablosu (Live Metrics Grid) */}
      <div
        className={`p-4 rounded-2xl border shadow-xl space-y-3 transition-colors duration-200 ${
          isLight ? 'bg-white border-slate-200/90 shadow-sm' : 'bg-white/[0.03] border-white/5'
        }`}
      >
        <div className="font-bold uppercase tracking-wider text-[11px] text-slate-400">
          Raw Order Flow Anlık Metrikleri
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* CVD 60s */}
          <div
            className={`p-2.5 rounded-xl border ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.02] border-white/5'
            }`}
          >
            <span className="text-[10px] text-slate-400 block mb-0.5">CVD 60s</span>
            <b
              className={`font-mono text-sm font-black ${
                (metrics?.cvd60 || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'
              }`}
            >
              {metrics ? fmtUsd(metrics.cvd60) : '—'}
            </b>
            <span className="text-[9px] text-slate-400 block mt-0.5 truncate">
              A:{fmtUsd(metrics?.cvd60Buy || 0)} / S:{fmtUsd(metrics?.cvd60Sell || 0)}
            </span>
          </div>

          {/* OBI */}
          <div
            className={`p-2.5 rounded-xl border ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.02] border-white/5'
            }`}
          >
            <span className="text-[10px] text-slate-400 block mb-0.5">OBI (Tam Derinlik)</span>
            <b
              className={`font-mono text-sm font-black ${
                (metrics?.obi || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'
              }`}
            >
              {metrics ? `${metrics.obi >= 0 ? '+' : ''}${metrics.obi.toFixed(1)}%` : '—'}
            </b>
            <span className="text-[9px] text-slate-400 block mt-0.5 truncate">
              B:{fmtUsd(metrics?.bidDepthUsd || 0)} / A:{fmtUsd(metrics?.askDepthUsd || 0)}
            </span>
          </div>

          {/* Open Interest */}
          <div
            className={`p-2.5 rounded-xl border ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.02] border-white/5'
            }`}
          >
            <span className="text-[10px] text-slate-400 block mb-0.5">Open Interest (OI Δ)</span>
            <b
              className={`font-mono text-sm font-black ${
                (metrics?.oiChangePct || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'
              }`}
            >
              {metrics ? `${metrics.oiChangePct >= 0 ? '+' : ''}${metrics.oiChangePct.toFixed(2)}%` : '—'}
            </b>
            <span className="text-[9px] text-slate-400 block mt-0.5 truncate">
              {metrics ? fmtUsd(metrics.openInterest) : '—'}
            </span>
          </div>

          {/* Funding */}
          <div
            className={`p-2.5 rounded-xl border ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.02] border-white/5'
            }`}
          >
            <span className="text-[10px] text-slate-400 block mb-0.5">Funding Rate</span>
            <b className="font-mono text-sm font-black text-amber-500">
              {metrics ? `+${(metrics.fundingRate * 100).toFixed(4)}%` : '—'}
            </b>
            <span className="text-[9px] text-slate-400 block mt-0.5">8s periyot</span>
          </div>

          {/* Liq 60s */}
          <div
            className={`p-2.5 rounded-xl border ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.02] border-white/5'
            }`}
          >
            <span className="text-[10px] text-slate-400 block mb-0.5">Liq 60s (L / S)</span>
            <b className="font-mono text-xs font-bold text-slate-200">
              L:{fmtUsd(metrics?.liq60LongUsd || 0)}
            </b>
            <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
              S:{fmtUsd(metrics?.liq60ShortUsd || 0)}
            </span>
          </div>

          {/* Spread */}
          <div
            className={`p-2.5 rounded-xl border ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.02] border-white/5'
            }`}
          >
            <span className="text-[10px] text-slate-400 block mb-0.5">Spread</span>
            <b className="font-mono text-xs font-bold text-slate-200">
              {metrics ? fmtPrice(metrics.spread, precision, locale) : '—'}
            </b>
            <span className="text-[9px] font-mono text-slate-400 block mt-0.5">
              %{metrics ? metrics.spreadPct.toFixed(3) : '0'}
            </span>
          </div>

          {/* Whale Mode */}
          <div
            className={`col-span-2 p-2.5 rounded-xl border flex items-center justify-between ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.02] border-white/5'
            }`}
          >
            <div>
              <span className="text-[10px] text-slate-400 block mb-0.5">Balina / Whale Modu</span>
              <b className="text-xs font-black text-blue-500">
                {metrics?.whaleMode || 'Sakin'}
              </b>
            </div>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 font-bold">
              {metrics?.whaleCount || 0} Büyük İşlem
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
