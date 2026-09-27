import React from 'react';
import { MevAnalytics } from '../types';
import { fmtPrice } from '../services/dataFeed';
import { Zap, AlertTriangle, ShieldCheck, ShieldAlert, TrendingDown } from 'lucide-react';

interface MevRadarPanelProps {
  mev: MevAnalytics | null;
  precision: number;
  locale: string;
  theme?: 'light' | 'dark';
}

export const MevRadarPanel: React.FC<MevRadarPanelProps> = ({
  mev,
  precision,
  locale,
  theme = 'dark'
}) => {
  if (!mev) {
    return (
      <div className="p-8 text-center text-slate-500 text-xs">
        MEV & Slippage analizi hesaplanıyor...
      </div>
    );
  }

  const isLight = theme === 'light';
  const { frontrunRiskScore, riskLevel, recommendation, slippageMatrix, sandwichSimulation } = mev;

  const getRiskStyle = () => {
    switch (riskLevel) {
      case 'CRITICAL':
        return {
          textColor: isLight ? 'text-rose-600' : 'text-rose-400',
          badge: isLight ? 'bg-rose-100 text-rose-700 border-rose-300' : 'bg-rose-500/20 text-rose-400 border-rose-500/40',
          text: 'YÜKSEK RİSK'
        };
      case 'ELEVATED':
        return {
          textColor: isLight ? 'text-amber-600' : 'text-amber-400',
          badge: isLight ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-amber-500/20 text-amber-400 border-amber-500/40',
          text: 'ORTA RİSK'
        };
      case 'LOW':
      default:
        return {
          textColor: isLight ? 'text-emerald-600' : 'text-emerald-400',
          badge: isLight ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
          text: 'DÜŞÜK RİSK'
        };
    }
  };

  const riskStyle = getRiskStyle();

  return (
    <div className="space-y-4 p-3 sm:p-4 text-xs select-none">
      {/* Risk Gauge Header Card */}
      <div
        className={`p-4 rounded-2xl border shadow-xl space-y-3 transition-colors duration-200 ${
          isLight
            ? 'bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200 text-slate-800'
            : 'bg-gradient-to-r from-[#1a162b] to-[#111222] border-purple-900/40 text-white'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className={isLight ? 'text-purple-600' : 'text-purple-400'} size={18} />
            <h3 className={`font-extrabold text-sm tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              SANDWICH / FRONTRUNNING (MEV) RADARI
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <span className={`font-mono text-2xl font-black ${riskStyle.textColor}`}>
              %{frontrunRiskScore}
            </span>
            <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${riskStyle.badge}`}>
              {riskStyle.text}
            </span>
          </div>
        </div>

        <div
          className={`text-[11px] p-2.5 rounded-xl border ${
            isLight
              ? 'bg-white/80 border-purple-200 text-slate-700'
              : 'bg-purple-500/10 border-purple-500/20 text-slate-300'
          }`}
        >
          💡 <b>Tavsiye:</b> {recommendation}
        </div>
      </div>

      {/* Real Orderbook Walk Slippage Matrix Table */}
      <div
        className={`p-3.5 rounded-2xl border space-y-2 transition-colors duration-200 ${
          isLight ? 'bg-white border-slate-200/90 shadow-sm text-slate-800' : 'bg-white/[0.02] border-white/5 text-white'
        }`}
      >
        <div
          className={`flex justify-between items-center text-xs font-bold border-b pb-2 ${
            isLight ? 'border-slate-100 text-slate-900' : 'border-white/5 text-white'
          }`}
        >
          <span>Gerçek Tahta Taraması (Slippage Matrix)</span>
          <span className="text-[10px] text-slate-400">Piyasa Emri Kayma Oranı</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-[11px]">
            <thead>
              <tr className={`border-b text-[10px] uppercase ${isLight ? 'border-slate-100 text-slate-500' : 'border-white/5 text-slate-400'}`}>
                <th className="py-1.5">İşlem Hacmi</th>
                <th className="py-1.5">Alış Kayması</th>
                <th className="py-1.5">Satış Kayması</th>
                <th className="py-1.5 text-right">En Kötü Fiyat</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? 'divide-slate-100' : 'divide-white/5'}`}>
              {slippageMatrix.map((row) => (
                <tr key={row.sizeUsd} className={`transition ${isLight ? 'hover:bg-slate-50' : 'hover:bg-white/[0.02]'}`}>
                  <td className={`py-2 font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    ${(row.sizeUsd / 1000).toFixed(0)}K
                  </td>
                  <td className="py-2 text-emerald-500 font-bold">+{row.buySlippagePct}%</td>
                  <td className="py-2 text-rose-500 font-bold">-{row.sellSlippagePct}%</td>
                  <td className={`py-2 text-right ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    {fmtPrice(row.buyWorstPrice, precision, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visual Sandwich Attack Flow Diagram */}
      <div
        className={`p-3.5 rounded-2xl border space-y-2.5 transition-colors duration-200 ${
          isLight ? 'bg-white border-purple-200/80 shadow-sm text-slate-800' : 'bg-[#0f111a] border-purple-500/20'
        }`}
      >
        <div className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">
          Canlı Sandwich Saldırı Simülasyonu ($100K Piyasa Emri)
        </div>

        <div className="space-y-2">
          <div
            className={`flex items-center gap-2.5 p-2 rounded-lg border ${
              isLight ? 'bg-slate-50 border-slate-200/60' : 'bg-white/[0.02] border-white/5'
            }`}
          >
            <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-600 font-bold flex items-center justify-center flex-shrink-0 text-xs">
              1
            </div>
            <div>
              <div className="font-bold text-cyan-600 text-[11px]">FRONTRUN ALIM (MEV Ajanı)</div>
              <div className="text-[10px] text-slate-400">Ajan yüksek öncelikle mağdurdan hemen önce alım yaparak fiyatı yukarı iter.</div>
            </div>
          </div>

          <div
            className={`flex items-center gap-2.5 p-2 rounded-lg border ${
              isLight ? 'bg-slate-50 border-slate-200/60' : 'bg-white/[0.02] border-white/5'
            }`}
          >
            <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-600 font-bold flex items-center justify-center flex-shrink-0 text-xs">
              2
            </div>
            <div>
              <div className="font-bold text-amber-600 text-[11px]">MAĞDUR EMRİ (Büyük Piyasa Emri)</div>
              <div className="text-[10px] text-slate-400">
                Kullanıcı şişirilmiş fiyattan emir doldurur. (Kayma kaybı: <b>-${sandwichSimulation.victimSlippageLossUsd}</b>)
              </div>
            </div>
          </div>

          <div
            className={`flex items-center gap-2.5 p-2 rounded-lg border ${
              isLight ? 'bg-slate-50 border-slate-200/60' : 'bg-white/[0.02] border-white/5'
            }`}
          >
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-600 font-bold flex items-center justify-center flex-shrink-0 text-xs">
              3
            </div>
            <div>
              <div className="font-bold text-emerald-600 text-[11px]">BACKRUN SATIŞ (Kâr Realizasyonu)</div>
              <div className="text-[10px] text-slate-400">
                Ajan saniyeler içinde satarak net kâr elde eder: <b className="text-emerald-500">+${sandwichSimulation.estimatedMevProfitUsd}</b>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
