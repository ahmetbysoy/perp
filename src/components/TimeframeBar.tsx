import React from 'react';
import { Interval } from '../types';
import { INTERVALS } from '../services/dataFeed';

interface TimeframeBarProps {
  currentInterval: Interval;
  theme?: 'light' | 'dark';
  onSelectInterval: (interval: Interval) => void;
}

export const TimeframeBar: React.FC<TimeframeBarProps> = ({
  currentInterval,
  theme = 'dark',
  onSelectInterval
}) => {
  const isLight = theme === 'light';

  return (
    <div
      className={`px-2 py-1.5 flex items-center gap-1.5 overflow-x-auto scrollbar-none border-b select-none transition-colors duration-200 ${
        isLight ? 'bg-white border-slate-200' : 'bg-[#0c0e14] border-white/5'
      }`}
    >
      {INTERVALS.map((tf) => {
        const isActive = tf === currentInterval;
        return (
          <button
            key={tf}
            onClick={() => onSelectInterval(tf)}
            className={`px-3 py-1 rounded-lg text-xs font-black tracking-tight transition active:scale-95 flex-shrink-0 ${
              isActive
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : isLight
                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 border border-slate-200/80'
                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            {tf.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
};
