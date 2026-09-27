import React from 'react';
import { BacktestStats, StrategyChain } from '../types';
import { fmtPrice, fmtPct } from '../services/dataFeed';
import { X, Award, TrendingUp, AlertCircle, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';

interface BacktestModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: BacktestStats;
  chains: StrategyChain[];
  precision: number;
  locale: string;
  theme?: 'light' | 'dark';
}

export const BacktestModal: React.FC<BacktestModalProps> = ({
  isOpen,
  onClose,
  stats,
  chains,
  precision,
  locale,
  theme = 'dark'
}) => {
  if (!isOpen) return null;

  const isLight = theme === 'light';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in select-none">
      <div
        className={`w-full max-w-lg border rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden transition-colors ${
          isLight
            ? 'bg-white border-slate-200 text-slate-800'
            : 'bg-[#141822] border-white/10 text-white'
        }`}
      >
        {/* Header */}
        <div
          className={`px-4 py-3.5 border-b flex items-center justify-between ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.02] border-white/10'
          }`}
        >
          <div className="flex items-center gap-2">
            <Award className="text-blue-500" size={20} />
            <h3
              className={`font-extrabold text-base tracking-tight ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}
            >
              SATIŞ1 Strateji Analizi & Backtest
            </h3>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-full transition ${
              isLight
                ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-200'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div
              className={`p-3 rounded-xl border ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.03] border-white/5'
              }`}
            >
              <span
                className={`text-[10px] font-bold uppercase tracking-wider block ${
                  isLight ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                Kazanma Oranı
              </span>
              <span
                className={`font-mono text-xl font-black mt-1 block ${
                  isLight ? 'text-emerald-600' : 'text-emerald-400'
                }`}
              >
                %{stats.winRate.toFixed(1)}
              </span>
              <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                {stats.tpCount} TP / {stats.tpCount + stats.activeSignals} İşlem
              </span>
            </div>

            <div
              className={`p-3 rounded-xl border ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.03] border-white/5'
              }`}
            >
              <span
                className={`text-[10px] font-bold uppercase tracking-wider block ${
                  isLight ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                Toplam PnL
              </span>
              <span
                className={`font-mono text-xl font-black mt-1 block ${
                  stats.cumulativePnlPct >= 0
                    ? isLight
                      ? 'text-emerald-600'
                      : 'text-emerald-400'
                    : isLight
                    ? 'text-rose-600'
                    : 'text-rose-400'
                }`}
              >
                {fmtPct(stats.cumulativePnlPct)}
              </span>
              <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                Kümülatif Kazanç
              </span>
            </div>

            <div
              className={`p-3 rounded-xl border ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.03] border-white/5'
              }`}
            >
              <span
                className={`text-[10px] font-bold uppercase tracking-wider block ${
                  isLight ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                Ort. Kar/Zarar
              </span>
              <span
                className={`font-mono text-xl font-black mt-1 block ${
                  stats.avgPnlPct >= 0
                    ? isLight
                      ? 'text-emerald-600'
                      : 'text-emerald-400'
                    : isLight
                    ? 'text-rose-600'
                    : 'text-rose-400'
                }`}
              >
                {fmtPct(stats.avgPnlPct)}
              </span>
              <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                İşlem Başına
              </span>
            </div>

            <div
              className={`p-3 rounded-xl border ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.03] border-white/5'
              }`}
            >
              <span
                className={`text-[10px] font-bold uppercase tracking-wider block ${
                  isLight ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                Maksimum DD
              </span>
              <span
                className={`font-mono text-xl font-black mt-1 block ${
                  isLight ? 'text-amber-600' : 'text-amber-400'
                }`}
              >
                %{stats.maxDrawdownPct.toFixed(2)}
              </span>
              <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                En Fazla Düşüş
              </span>
            </div>
          </div>

          {/* Strateji Kuralları Özeti */}
          <div
            className={`p-3 rounded-xl border space-y-1 ${
              isLight
                ? 'bg-blue-50/80 border-blue-200 text-slate-700'
                : 'bg-blue-500/10 border-blue-500/20 text-slate-300'
            }`}
          >
            <span
              className={`font-bold block mb-1 ${
                isLight ? 'text-blue-700' : 'text-blue-400'
              }`}
            >
              Pine Script "VWMA + Gaussian" SATIŞ1 Kuralları:
            </span>
            <ul
              className={`list-disc list-inside space-y-0.5 text-[11px] ${
                isLight ? 'text-slate-600' : 'text-slate-300'
              }`}
            >
              <li>
                <b>V1 Sinyali:</b> Turuncu (VWMA), yeşil (Gaussian) altına indiğinde oluşur.
              </li>
              <li>
                <b>Yatay Seviye Işını:</b> V1 mumunun kapanış fiyatına sağa uzanan seviye ışını çekilir.
              </li>
              <li>
                <b>V2 & SATIŞ1:</b> Turuncu bu seviyeyi yukarı kestiğinde V2 mumu açılışından Short girilir.
              </li>
              <li>
                <b>Dinamik TP:</b> Fiyat iğnesi yeşil Gaussian çizgisine temas ettiğinde pozisyon kârla kapanır.
              </li>
            </ul>
          </div>

          {/* Trade History Table */}
          <div>
            <span
              className={`font-extrabold text-xs uppercase tracking-wider block mb-2 ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}
            >
              Sinyal Geçmişi ({chains.length})
            </span>

            {chains.length === 0 ? (
              <div className="p-6 text-center text-slate-500">
                Bu zaman diliminde henüz sinyal bulunmuyor.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {[...chains].reverse().map((ch) => {
                  const isClosed = ch.status === 'tp';
                  const isOpen = ch.status === 'acik';

                  return (
                    <div
                      key={ch.id}
                      className={`p-2.5 rounded-lg border transition flex items-center justify-between gap-2 ${
                        isLight
                          ? 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                          : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isClosed
                              ? 'bg-emerald-500'
                              : isOpen
                              ? 'bg-blue-500 animate-pulse'
                              : 'bg-slate-400'
                          }`}
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`font-mono font-bold ${
                                isLight ? 'text-slate-900' : 'text-white'
                              }`}
                            >
                              SATIŞ{ch.id}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                isClosed
                                  ? isLight
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-emerald-500/20 text-emerald-400'
                                  : isOpen
                                  ? isLight
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-blue-500/20 text-blue-400'
                                  : isLight
                                  ? 'bg-slate-200 text-slate-700'
                                  : 'bg-slate-500/20 text-slate-400'
                              }`}
                            >
                              {isClosed ? 'TP ALINDI' : isOpen ? 'AÇIK' : 'BEKLİYOR'}
                            </span>
                          </div>

                          <div
                            className={`text-[10px] mt-0.5 ${
                              isLight ? 'text-slate-500' : 'text-slate-400'
                            }`}
                          >
                            {ch.sellPrice != null ? (
                              <>
                                Giriş:{' '}
                                <span
                                  className={`font-mono ${
                                    isLight ? 'text-slate-800' : 'text-slate-200'
                                  }`}
                                >
                                  {fmtPrice(ch.sellPrice, precision, locale)}
                                </span>
                              </>
                            ) : (
                              <>
                                Seviye:{' '}
                                <span
                                  className={`font-mono ${
                                    isLight ? 'text-slate-800' : 'text-slate-200'
                                  }`}
                                >
                                  {fmtPrice(ch.level, precision, locale)}
                                </span>
                              </>
                            )}
                            {ch.tpPrice != null && (
                              <>
                                {' '}
                                · TP:{' '}
                                <span className="font-mono text-emerald-500 font-bold">
                                  {fmtPrice(ch.tpPrice, precision, locale)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        {ch.sellPrice != null && (
                          <div
                            className={`font-mono font-black text-xs ${
                              ch.pnlPct >= 0
                                ? isLight
                                  ? 'text-emerald-600'
                                  : 'text-emerald-400'
                                : isLight
                                ? 'text-rose-600'
                                : 'text-rose-400'
                            }`}
                          >
                            {fmtPct(ch.pnlPct)}
                          </div>
                        )}
                        {ch.durationBars > 0 && (
                          <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                            {ch.durationBars} bar sürdü
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
