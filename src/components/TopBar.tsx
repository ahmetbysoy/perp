import React from 'react';
import { MarketInfo, ConnectionStatus } from '../types';
import { Settings, BarChart2, Calculator, Volume2, VolumeX, ChevronDown, Sun, Moon } from 'lucide-react';

interface TopBarProps {
  market: MarketInfo | null;
  connection: ConnectionStatus;
  soundEnabled: boolean;
  theme: 'light' | 'dark';
  winRate: number;
  onOpenCoinSelect: () => void;
  onOpenSettings: () => void;
  onOpenBacktest: () => void;
  onOpenCalculator: () => void;
  onToggleSound: () => void;
  onToggleTheme: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  market,
  connection,
  soundEnabled,
  theme,
  winRate,
  onOpenCoinSelect,
  onOpenSettings,
  onOpenBacktest,
  onOpenCalculator,
  onToggleSound,
  onToggleTheme
}) => {
  const base = market?.base || 'BTC';
  const isLight = theme === 'light';

  const getBadgeGradient = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
    const h = hash % 360;
    return `linear-gradient(135deg, hsl(${h}, 75%, 50%), hsl(${(h + 40) % 360}, 75%, 40%))`;
  };

  const getStatusColor = () => {
    if (connection.state === 'open') {
      return connection.isFallback ? 'bg-amber-400 text-amber-400' : 'bg-emerald-400 text-emerald-400';
    }
    if (connection.state === 'retry') {
      return 'bg-rose-500 text-rose-500';
    }
    return 'bg-amber-500 text-amber-500';
  };

  return (
    <header
      className={`h-14 min-h-14 px-3 flex items-center justify-between gap-2 border-b backdrop-blur-md z-30 select-none transition-colors duration-200 ${
        isLight
          ? 'bg-white/95 border-slate-200 text-slate-800'
          : 'bg-[#0c0e14]/90 border-white/5 text-[#e8eaf2]'
      }`}
    >
      {/* Coin Selector Button */}
      <button
        onClick={onOpenCoinSelect}
        className={`flex items-center gap-2.5 p-1.5 pr-2.5 rounded-xl active:scale-98 transition min-w-0 ${
          isLight ? 'hover:bg-slate-100' : 'hover:bg-white/5'
        }`}
        aria-label="Coin Seç"
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center font-black text-xs text-white shadow-md flex-shrink-0"
          style={{ background: getBadgeGradient(base) }}
        >
          {base.slice(0, 2).toUpperCase()}
        </div>

        <div className="text-left min-w-0">
          <div className="flex items-center gap-1.5 leading-none">
            <span
              className={`font-extrabold text-sm sm:text-base tracking-tight truncate ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}
            >
              {market?.key || 'BTCUSDT'}
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-500 border border-blue-500/30">
              PERP
            </span>
          </div>

          <div
            className={`flex items-center gap-1.5 mt-0.5 text-[10px] font-medium truncate ${
              isLight ? 'text-slate-500' : 'text-slate-400'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${getStatusColor().split(' ')[0]}`} />
            <span className="truncate">{connection.providerName}</span>
            {connection.latencyMs != null && (
              <span className="font-mono text-[9px] text-cyan-500 bg-cyan-500/10 px-1 py-0.2 rounded border border-cyan-500/20">
                {connection.latencyMs}ms
              </span>
            )}
            {connection.isFallback && (
              <span className="px-1 text-[8px] font-bold rounded bg-amber-500/20 text-amber-600">
                YEDEK
              </span>
            )}
          </div>
        </div>

        <ChevronDown
          size={14}
          className={`flex-shrink-0 ml-0.5 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}
        />
      </button>

      {/* Action Buttons */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        {/* Strategy / Backtest Button */}
        <button
          onClick={onOpenBacktest}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 active:scale-95 border border-blue-500/20 text-blue-500 transition"
          title="Strateji İstatistikleri & Backtest"
        >
          <BarChart2 size={15} />
          <span className="text-[11px] font-bold hidden xs:inline">SATIŞ1</span>
          <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-blue-500 text-white shadow-sm">
            %{winRate.toFixed(0)}
          </span>
        </button>

        {/* Position & Risk Calculator */}
        <button
          onClick={onOpenCalculator}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition active:scale-95 ${
            isLight
              ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
          title="Kaldıraç & Risk Hesaplayıcı"
        >
          <Calculator size={18} />
        </button>

        {/* Sound Toggle */}
        <button
          onClick={onToggleSound}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition active:scale-95 ${
            soundEnabled
              ? 'text-emerald-500 hover:bg-emerald-500/10'
              : isLight
              ? 'text-slate-400 hover:bg-slate-100'
              : 'text-slate-500 hover:bg-white/5'
          }`}
          title={soundEnabled ? 'Sesli Alarmlar Açık' : 'Sesli Alarmlar Kapalı'}
        >
          {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>

        {/* 1-Tap Theme Toggle Button (Sun / Moon) */}
        <button
          onClick={onToggleTheme}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition active:scale-95 ${
            isLight
              ? 'text-amber-500 hover:bg-amber-500/10'
              : 'text-indigo-300 hover:bg-white/5'
          }`}
          title={isLight ? 'Koyu Temaya Geç' : 'Aydınlık Temaya Geç'}
          aria-label="Tema Değiştir"
        >
          {isLight ? <Sun size={18} className="animate-spin-slow" /> : <Moon size={18} />}
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition active:scale-95 ${
            isLight
              ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
          aria-label="Ayarlar"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
};
