import React from 'react';
import { OrderbookData } from '../types';
import { fmtPrice } from '../services/dataFeed';
import { ShieldCheck, ShieldAlert, ArrowUpRight, ArrowDownRight, Layers } from 'lucide-react';

interface LiquidityWallsPanelProps {
  orderbook: OrderbookData | null;
  precision: number;
  locale: string;
  theme?: 'light' | 'dark';
}

export const LiquidityWallsPanel: React.FC<LiquidityWallsPanelProps> = ({
  orderbook,
  precision,
  locale,
  theme = 'dark'
}) => {
  if (!orderbook) {
    return (
      <div className="p-8 text-center text-slate-500 text-xs">
        Orderbook derinlik verisi bekleniyor...
      </div>
    );
  }

  const isLight = theme === 'light';
  const { bidWalls, askWalls, bidDominance, totalBidDepthUsd, totalAskDepthUsd } = orderbook;
  const askDominance = Number((100 - bidDominance).toFixed(1));

  // Find max wall volume for percentage fill scaling
  const maxBidVol = bidWalls.length ? Math.max(...bidWalls.map((w) => w.volume)) : 1;
  const maxAskVol = askWalls.length ? Math.max(...askWalls.map((w) => w.volume)) : 1;

  return (
    <div className="space-y-4 p-3 sm:p-4 text-xs select-none">
      {/* Buyer vs Seller Dominance Bar */}
      <div
        className={`p-3.5 rounded-2xl border space-y-2 transition-colors duration-200 ${
          isLight ? 'bg-white border-slate-200/90 shadow-sm' : 'bg-white/[0.03] border-white/5'
        }`}
      >
        <div className="flex justify-between items-center text-xs font-bold">
          <div className="flex items-center gap-1.5 text-emerald-500">
            <ArrowUpRight size={15} />
            <span>Alıcı Hakimiyeti: %{bidDominance}</span>
          </div>
          <div className="flex items-center gap-1.5 text-rose-500">
            <span>Satıcı Hakimiyeti: %{askDominance}</span>
            <ArrowDownRight size={15} />
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full h-2 rounded-full overflow-hidden bg-rose-500/25 flex">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${bidDominance}%` }}
          />
        </div>

        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
          <span>Toplam Alış Derinliği: ${(totalBidDepthUsd / 1000).toFixed(0)}K</span>
          <span>Toplam Satış Derinliği: ${(totalAskDepthUsd / 1000).toFixed(0)}K</span>
        </div>
      </div>

      {/* Walls Grid: Bids (Support) & Asks (Resistance) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Support Bids Panel */}
        <div
          className={`p-3.5 rounded-2xl border space-y-2 transition-colors duration-200 ${
            isLight ? 'bg-white border-slate-200/90 shadow-sm' : 'bg-white/[0.02] border-white/5'
          }`}
        >
          <div
            className={`flex items-center justify-between font-bold text-xs pb-1 border-b ${
              isLight ? 'border-slate-100' : 'border-white/5'
            }`}
          >
            <span className="text-emerald-500 flex items-center gap-1">
              <ShieldCheck size={14} /> DESTEK DUVARLARI (BIDS)
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Hacim & Mesafe</span>
          </div>

          <div className="space-y-1.5 pt-1">
            {bidWalls.length === 0 ? (
              <div className="py-4 text-center text-slate-400 text-[11px]">
                Aktif büyük alıcı duvarı tespit edilmedi.
              </div>
            ) : (
              bidWalls.map((wall, i) => {
                const fillWidth = Math.min(100, Math.round((wall.volume / (maxBidVol || 1)) * 100));
                return (
                  <div
                    key={i}
                    className={`relative h-8 rounded-lg overflow-hidden border flex items-center px-2.5 ${
                      isLight
                        ? 'bg-slate-50 border-slate-200/60'
                        : 'bg-white/[0.02] border-white/[0.03]'
                    }`}
                  >
                    <div
                      className="absolute inset-y-0 left-0 bg-emerald-500/20 rounded-lg pointer-events-none transition-all duration-300"
                      style={{ width: `${fillWidth}%` }}
                    />
                    <div className="relative z-10 w-full flex justify-between items-center font-mono">
                      <span className="font-extrabold text-emerald-500 text-xs">
                        {fmtPrice(wall.price, precision, locale)}
                      </span>
                      <div className="text-right text-[11px]">
                        <span className={`font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>
                          {wall.volume.toFixed(2)} BTC
                        </span>
                        <span className="text-slate-400 ml-1.5">(-%{wall.distancePct})</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Resistance Asks Panel */}
        <div
          className={`p-3.5 rounded-2xl border space-y-2 transition-colors duration-200 ${
            isLight ? 'bg-white border-slate-200/90 shadow-sm' : 'bg-white/[0.02] border-white/5'
          }`}
        >
          <div
            className={`flex items-center justify-between font-bold text-xs pb-1 border-b ${
              isLight ? 'border-slate-100' : 'border-white/5'
            }`}
          >
            <span className="text-rose-500 flex items-center gap-1">
              <ShieldAlert size={14} /> DİRENÇ DUVARLARI (ASKS)
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Hacim & Mesafe</span>
          </div>

          <div className="space-y-1.5 pt-1">
            {askWalls.length === 0 ? (
              <div className="py-4 text-center text-slate-400 text-[11px]">
                Aktif büyük satıcı duvarı tespit edilmedi.
              </div>
            ) : (
              askWalls.map((wall, i) => {
                const fillWidth = Math.min(100, Math.round((wall.volume / (maxAskVol || 1)) * 100));
                return (
                  <div
                    key={i}
                    className={`relative h-8 rounded-lg overflow-hidden border flex items-center px-2.5 ${
                      isLight
                        ? 'bg-slate-50 border-slate-200/60'
                        : 'bg-white/[0.02] border-white/[0.03]'
                    }`}
                  >
                    <div
                      className="absolute inset-y-0 left-0 bg-rose-500/20 rounded-lg pointer-events-none transition-all duration-300"
                      style={{ width: `${fillWidth}%` }}
                    />
                    <div className="relative z-10 w-full flex justify-between items-center font-mono">
                      <span className="font-extrabold text-rose-500 text-xs">
                        {fmtPrice(wall.price, precision, locale)}
                      </span>
                      <div className="text-right text-[11px]">
                        <span className={`font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>
                          {wall.volume.toFixed(2)} BTC
                        </span>
                        <span className="text-slate-400 ml-1.5">(+%{wall.distancePct})</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
