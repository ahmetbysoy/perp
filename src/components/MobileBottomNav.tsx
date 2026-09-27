import React from 'react';
import { MobileTab } from '../types';
import { BarChart3, Zap, Brain, Layers, Clock, ShieldCheck } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: MobileTab;
  theme?: 'light' | 'dark';
  onSelectTab: (tab: MobileTab) => void;
  rawFlowScore?: number;
  consensusScore?: number;
  mevRiskScore?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  theme = 'dark',
  onSelectTab,
  rawFlowScore,
  consensusScore,
  mevRiskScore
}) => {
  const isLight = theme === 'light';

  const tabs: { id: MobileTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: 'chart',
      label: 'Grafik',
      icon: <BarChart3 size={17} />
    },
    {
      id: 'signal',
      label: 'Sinyal',
      icon: <Zap size={17} />,
      badge: rawFlowScore ? `%${rawFlowScore}` : undefined
    },
    {
      id: 'pool',
      label: 'Havuz',
      icon: <Brain size={17} />
    },
    {
      id: 'walls',
      label: 'Duvarlar',
      icon: <Layers size={17} />
    },
    {
      id: 'consensus',
      label: 'Konsensüs',
      icon: <Clock size={17} />,
      badge: consensusScore ? `%${consensusScore}` : undefined
    },
    {
      id: 'mev',
      label: 'MEV',
      icon: <ShieldCheck size={17} />,
      badge: mevRiskScore && mevRiskScore >= 60 ? 'RİSK' : undefined
    }
  ];

  return (
    <nav
      className={`h-14 min-h-14 border-t backdrop-blur-md flex items-center justify-around px-1 z-30 select-none transition-colors duration-200 ${
        isLight ? 'bg-white/95 border-slate-200' : 'bg-[#0a0d14]/95 border-white/10'
      }`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`flex-1 py-1 flex flex-col items-center justify-center gap-0.5 transition active:scale-95 relative min-w-0 ${
              isActive
                ? isLight
                  ? 'text-blue-600 font-extrabold'
                  : 'text-cyan-400 font-extrabold'
                : isLight
                ? 'text-slate-500 font-medium hover:text-slate-800'
                : 'text-slate-400 font-medium hover:text-white'
            }`}
          >
            <div className="relative">
              {tab.icon}
              {tab.badge && (
                <span
                  className={`absolute -top-1.5 -right-3.5 px-1 py-0.2 rounded-full text-[8px] font-black leading-none ${
                    tab.badge === 'RİSK'
                      ? 'bg-rose-500 text-white animate-pulse'
                      : 'bg-blue-600 text-white'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </div>
            <span className="text-[9.5px] tracking-tight truncate max-w-full">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
