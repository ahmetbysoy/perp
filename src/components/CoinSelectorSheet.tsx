import React, { useState, useMemo } from 'react';
import { MarketInfo } from '../types';
import { fmtPrice, fmtPct } from '../services/dataFeed';
import { X, Search, Radar } from 'lucide-react';

interface CoinSelectorSheetProps {
  isOpen: boolean;
  onClose: () => void;
  markets: MarketInfo[];
  tickersMap: Record<string, { last: number; changePct: number; quoteVol?: number }>;
  selectedKey: string;
  providerName: string;
  locale: string;
  theme?: 'light' | 'dark';
  onSelectCoin: (key: string) => void;
  onOpenScreener?: () => void;
}

export const CoinSelectorSheet: React.FC<CoinSelectorSheetProps> = ({
  isOpen,
  onClose,
  markets,
  tickersMap,
  selectedKey,
  providerName,
  locale,
  theme = 'dark',
  onSelectCoin,
  onOpenScreener
}) => {
  const [search, setSearch] = useState('');
  const isLight = theme === 'light';

  const filteredMarkets = useMemo(() => {
    const q = search.trim().toUpperCase();
    if (!q) return markets.slice(0, 150);
    return markets
      .filter((m) => m.key.includes(q) || m.base.includes(q))
      .slice(0, 150);
  }, [markets, search]);

  if (!isOpen) return null;

  const getBadgeGradient = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
    const h = hash % 360;
    return `linear-gradient(135deg, hsl(${h}, 75%, 50%), hsl(${(h + 40) % 360}, 75%, 40%))`;
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/65 backdrop-blur-sm animate-in fade-in select-none">
      <div
        className={`w-full border-t rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200 transition-colors ${
          isLight
            ? 'bg-white border-slate-200 text-slate-800'
            : 'bg-[#141822] border-white/10 text-white'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Grip bar */}
        <div
          className={`w-10 h-1 rounded-full mx-auto my-2.5 flex-shrink-0 ${
            isLight ? 'bg-slate-300' : 'bg-white/20'
          }`}
        />

        {/* Header */}
        <div
          className={`px-4 py-2 flex items-center justify-between border-b ${
            isLight ? 'border-slate-200' : 'border-white/5'
          }`}
        >
          <div>
            <h3
              className={`font-extrabold text-base tracking-tight ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}
            >
              Futures Coin Seç
            </h3>
            <span
              className={`text-[10px] font-medium ${
                isLight ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
              {markets.length} Sürekli Kontrat · {providerName}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onOpenScreener && (
              <button
                onClick={() => {
                  onClose();
                  onOpenScreener();
                }}
                className="px-2.5 py-1 rounded-xl text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 flex items-center gap-1.5 transition active:scale-95"
                title="Tüm coinleri sinyale göre tara"
              >
                <Radar size={13} className="text-purple-400" />
                <span>Sinyal Radarı</span>
              </button>
            )}

            <button
              onClick={onClose}
              className={`p-1.5 rounded-full transition ${
                isLight
                  ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Search input */}
        <div className={`p-3 border-b ${isLight ? 'border-slate-200' : 'border-white/5'}`}>
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border focus-within:border-blue-500 transition ${
              isLight
                ? 'bg-slate-100 border-slate-200'
                : 'bg-white/[0.04] border-white/10'
            }`}
          >
            <Search
              size={16}
              className={`flex-shrink-0 ${isLight ? 'text-slate-400' : 'text-slate-400'}`}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Coin ara (BTC, DOGE, PEPE, SOL...)"
              className={`bg-transparent border-none outline-none text-xs w-full font-medium ${
                isLight
                  ? 'text-slate-900 placeholder:text-slate-400'
                  : 'text-white placeholder:text-slate-500'
              }`}
              autoFocus
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className={isLight ? 'text-slate-400 hover:text-slate-700' : 'text-slate-400 hover:text-white'}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Coin List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredMarkets.length === 0 ? (
            <div className={`p-8 text-center text-xs ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
              "{search}" ile eşleşen coin bulunamadı.
            </div>
          ) : (
            filteredMarkets.map((m) => {
              const ticker = tickersMap[m.native] || tickersMap[m.key];
              const price = ticker?.last;
              const chg = ticker?.changePct ?? 0;
              const isSelected = m.key === selectedKey;

              return (
                <div
                  key={m.key}
                  onClick={() => {
                    onSelectCoin(m.key);
                    onClose();
                  }}
                  className={`p-2.5 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition active:scale-98 ${
                    isSelected
                      ? isLight
                        ? 'bg-blue-50 border border-blue-200 text-blue-900'
                        : 'bg-blue-500/15 border border-blue-500/30'
                      : isLight
                      ? 'hover:bg-slate-100'
                      : 'hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center font-extrabold text-xs text-white shadow-sm flex-shrink-0"
                      style={{ background: getBadgeGradient(m.base) }}
                    >
                      {m.base.slice(0, 3).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <div
                        className={`font-extrabold text-sm tracking-tight truncate flex items-center gap-1 ${
                          isLight ? 'text-slate-900' : 'text-white'
                        }`}
                      >
                        {m.base}
                        <span className={`text-[10px] font-normal ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                          /USDT
                        </span>
                      </div>
                      <div className={`text-[10px] font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                        Sürekli · {m.precision} basamak
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div
                      className={`font-mono font-bold text-xs ${
                        isLight ? 'text-slate-900' : 'text-white'
                      }`}
                    >
                      {price != null ? fmtPrice(price, m.precision, locale) : '—'}
                    </div>
                    <div
                      className={`font-mono text-[10px] font-bold ${
                        chg >= 0
                          ? isLight
                            ? 'text-emerald-600'
                            : 'text-emerald-400'
                          : isLight
                          ? 'text-rose-600'
                          : 'text-rose-400'
                      }`}
                    >
                      {fmtPct(chg)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
