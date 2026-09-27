import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Interval, ScreenerItem } from '../types';
import { screenerService } from '../services/screenerService';
import { fmtPrice, fmtPct } from '../services/dataFeed';
import {
  X,
  Radar,
  RefreshCw,
  Search,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  Target,
  Clock,
  Zap,
  Activity,
  ChevronRight
} from 'lucide-react';

interface ScreenerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentInterval: Interval;
  currentSymbol: string;
  theme?: 'light' | 'dark';
  locale?: string;
  onSelectCoin: (symbol: string) => void;
}

export const ScreenerModal: React.FC<ScreenerModalProps> = ({
  isOpen,
  onClose,
  currentInterval,
  currentSymbol,
  theme = 'dark',
  locale = 'tr-TR',
  onSelectCoin
}) => {
  const [items, setItems] = useState<ScreenerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<
    'ALL' | 'OPPORTUNITIES' | 'SHORT' | 'V1' | 'TP'
  >('ALL');
  const [countdown, setCountdown] = useState(10);

  const isLight = theme === 'light';

  const fetchScan = useCallback(
    async (force = false) => {
      setLoading(true);
      try {
        const res = await screenerService.scan(currentInterval, force);
        setItems(res);
      } finally {
        setLoading(false);
        setCountdown(10);
      }
    },
    [currentInterval]
  );

  useEffect(() => {
    if (!isOpen) return;
    fetchScan(false);

    const timer = window.setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          fetchScan(true);
          return 10;
        }
        return c - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isOpen, fetchScan]);

  const filteredItems = useMemo(() => {
    let list = items;

    if (search.trim()) {
      const q = search.trim().toUpperCase();
      list = list.filter((i) => i.symbol.includes(q) || i.base.includes(q));
    }

    switch (filterType) {
      case 'OPPORTUNITIES':
        list = list.filter(
          (i) => i.signalType === 'SHORT_ACTIVE' || i.signalType === 'V1_PENDING' || i.signalType === 'DYNAMIC_TP_NEAR'
        );
        break;
      case 'SHORT':
        list = list.filter((i) => i.signalType === 'SHORT_ACTIVE');
        break;
      case 'V1':
        list = list.filter((i) => i.signalType === 'V1_PENDING');
        break;
      case 'TP':
        list = list.filter((i) => i.signalType === 'DYNAMIC_TP_NEAR' || i.signalType === 'TP_HIT');
        break;
      case 'ALL':
      default:
        break;
    }

    return list;
  }, [items, search, filterType]);

  if (!isOpen) return null;

  const getBadgeGradient = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
    const h = hash % 360;
    return `linear-gradient(135deg, hsl(${h}, 75%, 50%), hsl(${(h + 40) % 360}, 75%, 40%))`;
  };

  const fmtUsdVolume = (val: number) => {
    if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(1)}B`;
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(0)}M`;
    return `$${Math.round(val)}`;
  };

  const shortCount = items.filter((i) => i.signalType === 'SHORT_ACTIVE').length;
  const v1Count = items.filter((i) => i.signalType === 'V1_PENDING').length;
  const tpCount = items.filter((i) => i.signalType === 'DYNAMIC_TP_NEAR' || i.signalType === 'TP_HIT').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in select-none">
      <div
        className={`w-full max-w-3xl max-h-[92vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden transition-colors duration-200 ${
          isLight
            ? 'bg-white border-slate-200 text-slate-800'
            : 'bg-[#121622] border-white/10 text-white shadow-cyan-950/20'
        }`}
      >
        {/* Header */}
        <div
          className={`p-4 sm:p-5 border-b flex items-center justify-between gap-3 ${
            isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-white/[0.02] border-white/5'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/25">
              <Radar size={22} className="animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-base sm:text-lg tracking-tight">
                  Canlı Sinyal Radarı
                </h2>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
                  CANLI ({currentInterval})
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Binance Vadeli Piyasasında VWMA 34 & Gaussian 8 Kırılımları
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchScan(true)}
              disabled={loading}
              className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition active:scale-95 ${
                isLight
                  ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
              }`}
              title="Radarı Şimdi Yenile"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline font-mono">{countdown}s</span>
            </button>

            <button
              onClick={onClose}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition active:scale-95 ${
                isLight
                  ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              aria-label="Kapat"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div
          className={`p-3 sm:px-5 border-b space-y-2.5 ${
            isLight ? 'bg-slate-50/40 border-slate-200' : 'bg-white/[0.01] border-white/5'
          }`}
        >
          {/* Quick Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition active:scale-95 ${
                filterType === 'ALL'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                  : isLight
                  ? 'bg-slate-200/80 text-slate-700 hover:bg-slate-300'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              Tümü ({items.length})
            </button>

            <button
              onClick={() => setFilterType('OPPORTUNITIES')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition active:scale-95 flex items-center gap-1.5 ${
                filterType === 'OPPORTUNITIES'
                  ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-md'
                  : isLight
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}
            >
              <Zap size={13} />
              <span>Fırsatlar ({shortCount + v1Count + tpCount})</span>
            </button>

            <button
              onClick={() => setFilterType('SHORT')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition active:scale-95 flex items-center gap-1.5 ${
                filterType === 'SHORT'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-500/30'
                  : isLight
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              <TrendingDown size={13} />
              <span>SATIŞ1 Aktif ({shortCount})</span>
            </button>

            <button
              onClick={() => setFilterType('V1')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition active:scale-95 flex items-center gap-1.5 ${
                filterType === 'V1'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/30 font-black'
                  : isLight
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}
            >
              <Clock size={13} />
              <span>V1 İzlemede ({v1Count})</span>
            </button>

            <button
              onClick={() => setFilterType('TP')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition active:scale-95 flex items-center gap-1.5 ${
                filterType === 'TP'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30'
                  : isLight
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}
            >
              <Target size={13} />
              <span>TP Yakın ({tpCount})</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search
              size={15}
              className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${
                isLight ? 'text-slate-400' : 'text-slate-500'
              }`}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Parite veya coin ara (örn: SOL, DOGE, XRP)..."
              className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs border outline-none transition ${
                isLight
                  ? 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-purple-500'
                  : 'bg-white/5 border-white/10 text-white placeholder-slate-500 focus:border-purple-500/60'
              }`}
            />
          </div>
        </div>

        {/* Screener Items List */}
        <div className="flex-1 overflow-y-auto divide-y divide-inherit p-2 sm:p-3 space-y-1.5">
          {loading && items.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-500 text-xs">
              <div className="w-9 h-9 rounded-full border-3 border-purple-300 border-t-purple-600 animate-spin" />
              <span className="font-bold">Binance Vadeli Piyasası Taranıyor...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              Bu filtreye uygun parite bulunamadı.
            </div>
          ) : (
            filteredItems.map((item) => {
              const isCurrent = item.symbol === currentSymbol;
              const isShort = item.signalType === 'SHORT_ACTIVE';
              const isV1 = item.signalType === 'V1_PENDING';
              const isTpNear = item.signalType === 'DYNAMIC_TP_NEAR' || item.signalType === 'TP_HIT';
              const isUp = item.changePct >= 0;

              return (
                <div
                  key={item.symbol}
                  onClick={() => {
                    onSelectCoin(item.symbol);
                    onClose();
                  }}
                  className={`p-3 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 active:scale-[0.99] ${
                    isCurrent
                      ? isLight
                        ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20 shadow-sm'
                        : 'bg-blue-500/10 border-blue-500/30 ring-2 ring-blue-500/20'
                      : isShort
                      ? isLight
                        ? 'bg-rose-50/70 border-rose-200 hover:bg-rose-100/70'
                        : 'bg-rose-500/[0.04] border-rose-500/25 hover:bg-rose-500/[0.08]'
                      : isV1
                      ? isLight
                        ? 'bg-amber-50/70 border-amber-200 hover:bg-amber-100/70'
                        : 'bg-amber-500/[0.04] border-amber-500/25 hover:bg-amber-500/[0.08]'
                      : isLight
                      ? 'bg-white border-slate-200 hover:bg-slate-50'
                      : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05]'
                  }`}
                >
                  {/* Left: Avatar & Symbol info */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs text-white shadow-md flex-shrink-0"
                      style={{ background: getBadgeGradient(item.base) }}
                    >
                      {item.base.slice(0, 2).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 leading-none">
                        <span className={`font-black text-sm tracking-tight truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          {item.symbol}
                        </span>
                        {isCurrent && (
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-blue-500 text-white">
                            AÇIK
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 font-medium">
                        <span>Hacim: {fmtUsdVolume(item.quoteVol24h)}</span>
                        {item.distToGaussianPct != null && (
                          <span className="font-mono">
                            Gaussian: %{item.distToGaussianPct > 0 ? `+${item.distToGaussianPct}` : item.distToGaussianPct}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Center: Signal Badge */}
                  <div className="hidden sm:flex flex-col items-center justify-center text-center">
                    <span
                      className={`px-2.5 py-1 rounded-xl text-[10.5px] font-black flex items-center gap-1.5 shadow-sm ${
                        isShort
                          ? 'bg-rose-500 text-white shadow-rose-500/30 animate-pulse'
                          : isV1
                          ? 'bg-amber-500 text-black shadow-amber-500/30'
                          : isTpNear
                          ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                          : item.signalType === 'BULLISH'
                          ? isLight
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : isLight
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-white/5 text-slate-400'
                      }`}
                    >
                      {isShort ? (
                        <TrendingDown size={13} />
                      ) : isV1 ? (
                        <Clock size={13} />
                      ) : isTpNear ? (
                        <Target size={13} />
                      ) : (
                        <Activity size={13} />
                      )}
                      <span>{item.signalLabel}</span>
                    </span>

                    <span className="text-[9px] text-slate-400 font-bold mt-1">
                      Güven: %{item.confidence}
                    </span>
                  </div>

                  {/* Right: Price & 24h Change */}
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <span className={`font-mono text-sm font-black block ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {fmtPrice(item.price, undefined, locale)}
                      </span>
                      <span
                        className={`font-mono text-[11px] font-bold mt-0.5 inline-block ${
                          isUp
                            ? isLight
                              ? 'text-emerald-700'
                              : 'text-emerald-400'
                            : isLight
                            ? 'text-rose-700'
                            : 'text-rose-400'
                        }`}
                      >
                        {fmtPct(item.changePct)}
                      </span>
                    </div>

                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center transition ${
                        isLight ? 'bg-slate-100 text-slate-400' : 'bg-white/5 text-slate-400'
                      }`}
                    >
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div
          className={`p-3 px-5 border-t text-[11px] flex items-center justify-between text-slate-400 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.02] border-white/5'
          }`}
        >
          <span>Top 15 Vadeli Parite • VWMA 34 & Gaussian 8</span>
          <span className="text-purple-400 font-bold">Tek dokunuşla pariteyi aç</span>
        </div>
      </div>
    </div>
  );
};
