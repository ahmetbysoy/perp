import React, { useState, useMemo } from 'react';
import { PatternRecord } from '../types';
import { patternPoolService } from '../services/patternPoolService';
import { Brain, Filter, Download, Upload, CheckCircle2, AlertTriangle, Clock, RefreshCw, ChevronRight } from 'lucide-react';

interface PatternPoolPanelProps {
  theme?: 'light' | 'dark';
}

export const PatternPoolPanel: React.FC<PatternPoolPanelProps> = ({
  theme = 'dark'
}) => {
  const isLight = theme === 'light';
  const [tfFilter, setTfFilter] = useState<'all' | '1m' | '5m'>('all');
  const [minNFilter, setMinNFilter] = useState<number>(0);
  const [selectedPatternKey, setSelectedPatternKey] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState<number>(0);

  const patterns = useMemo(() => {
    let list = patternPoolService.getAllPatterns();
    if (tfFilter !== 'all') list = list.filter((p) => p.timeframe === tfFilter);
    if (minNFilter > 0) list = list.filter((p) => p.count >= minNFilter);
    return list;
  }, [tfFilter, minNFilter, refreshNonce]);

  const selectedPattern = useMemo(() => {
    if (!selectedPatternKey) return patterns[0] || null;
    return patterns.find((p) => p.key === selectedPatternKey) || null;
  }, [patterns, selectedPatternKey]);

  const handleExport = () => {
    const json = patternPoolService.exportJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `futures_pattern_pool_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        patternPoolService.importJson(content);
        setRefreshNonce((n) => n + 1);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4 p-3 sm:p-4 text-xs select-none">
      {/* 1. Header & Filters Card */}
      <div
        className={`p-3.5 rounded-2xl border shadow-xl space-y-3 transition-colors duration-200 ${
          isLight ? 'bg-white border-slate-200/90 shadow-sm' : 'bg-white/[0.03] border-white/5'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-slate-400">
            <Brain size={15} className="text-purple-400" />
            <span>Havuz Motoru (Pattern Pool Leaderboard)</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleExport}
              title="JSON Olarak Dışa Aktar"
              className={`p-1.5 rounded-lg border transition text-[11px] flex items-center gap-1 ${
                isLight ? 'border-slate-200 hover:bg-slate-100 text-slate-700' : 'border-white/10 hover:bg-white/5 text-slate-300'
              }`}
            >
              <Download size={13} />
              <span className="hidden sm:inline">İndir</span>
            </button>

            <label
              title="JSON İçe Aktar"
              className={`p-1.5 rounded-lg border cursor-pointer transition text-[11px] flex items-center gap-1 ${
                isLight ? 'border-slate-200 hover:bg-slate-100 text-slate-700' : 'border-white/10 hover:bg-white/5 text-slate-300'
              }`}
            >
              <Upload size={13} />
              <span className="hidden sm:inline">Yükle</span>
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
          </div>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <select
            value={tfFilter}
            onChange={(e) => setTfFilter(e.target.value as any)}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold outline-none ${
              isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-white/5 border-white/10 text-white'
            }`}
          >
            <option value="all">TF: Tümü</option>
            <option value="1m">1m</option>
            <option value="5m">5m</option>
          </select>

          <select
            value={minNFilter}
            onChange={(e) => setMinNFilter(parseInt(e.target.value) || 0)}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold outline-none ${
              isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-white/5 border-white/10 text-white'
            }`}
          >
            <option value={0}>Min Örnek: Tümü</option>
            <option value={5}>Min Örnek: 5+</option>
            <option value={15}>Min Örnek: 15+</option>
            <option value={30}>Min Örnek: 30+</option>
          </select>

          <button
            onClick={() => {
              patternPoolService.resetAll();
              setRefreshNonce((n) => n + 1);
            }}
            className={`px-2.5 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-1 transition ${
              isLight ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100' : 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20'
            }`}
            title="Havuz Sayacını ve İstatistiklerini Sıfırla"
          >
            <span>Sıfırla</span>
          </button>

          <button
            onClick={() => setRefreshNonce((n) => n + 1)}
            className={`px-3 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-1 transition ${
              isLight ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
            }`}
          >
            <RefreshCw size={12} />
            <span>Yenile</span>
          </button>
        </div>
      </div>

      {/* 2. Patterns Table */}
      <div
        className={`rounded-2xl border shadow-xl overflow-hidden transition-colors duration-200 ${
          isLight ? 'bg-white border-slate-200/90 shadow-sm' : 'bg-white/[0.03] border-white/5'
        }`}
      >
        <div
          className={`grid grid-cols-12 gap-1.5 px-3 py-2.5 font-bold uppercase tracking-wider text-[10px] border-b ${
            isLight ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-white/[0.02] border-white/5 text-slate-400'
          }`}
        >
          <span className="col-span-5 sm:col-span-4 truncate">Desen / Kural</span>
          <span className="col-span-1 text-center">TF</span>
          <span className="col-span-2 text-center">Örnek</span>
          <span className="col-span-2 text-right">Wilson</span>
          <span className="col-span-2 text-right">Durum</span>
        </div>

        <div className="divide-y divide-inherit max-h-72 overflow-y-auto">
          {patterns.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              Bu filtrede henüz desen bulunmuyor. Mum akışı oldukça havuz zenginleşir.
            </div>
          ) : (
            patterns.map((p) => {
              const isSelected = selectedPattern?.key === p.key;
              return (
                <div
                  key={p.key}
                  onClick={() => setSelectedPatternKey(p.key)}
                  className={`grid grid-cols-12 gap-1.5 px-3 py-2.5 items-center cursor-pointer transition active:scale-[0.99] text-xs ${
                    isSelected
                      ? isLight
                        ? 'bg-blue-50/80 border-l-3 border-blue-600'
                        : 'bg-blue-500/15 border-l-3 border-blue-500'
                      : isLight
                      ? 'hover:bg-slate-50'
                      : 'hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="col-span-5 sm:col-span-4 min-w-0 pr-1">
                    <span className={`font-bold block truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {p.name}
                    </span>
                    <span className="font-mono text-[9px] text-slate-400 block truncate">
                      {p.key}
                    </span>
                  </div>

                  <span className="col-span-1 font-mono font-bold text-center text-slate-400 text-[11px]">
                    {p.timeframe}
                  </span>

                  <span className="col-span-2 font-mono font-bold text-center text-slate-300 text-[11px]">
                    {p.count}
                  </span>

                  <span className="col-span-2 font-sans font-extrabold text-right text-emerald-500 text-xs tracking-tight">
                    %{p.wilsonScore}
                  </span>

                  <div className="col-span-2 text-right">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                        p.status === 'good'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : p.status === 'bad'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {p.status === 'good' ? 'İyi' : p.status === 'bad' ? 'Zayıf' : 'Topluyor'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 3. Selected Pattern Deep Dive Detail Card */}
      {selectedPattern && (
        <div
          className={`p-4 rounded-2xl border shadow-xl space-y-3 transition-colors duration-200 ${
            isLight ? 'bg-white border-slate-200/90 shadow-sm' : 'bg-white/[0.03] border-white/5'
          }`}
        >
          <div className="flex items-center justify-between border-b pb-2 border-inherit">
            <span className="font-bold text-[11px] uppercase tracking-wider text-slate-400">
              Desen Detayı & Tarihsel İstatistikler
            </span>
            <span className="font-mono text-[10px] text-blue-500 font-bold">
              {selectedPattern.key}
            </span>
          </div>

          <div className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
            {selectedPattern.name}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className={`p-2.5 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.02] border-white/5'}`}>
              <span className="text-[10px] text-slate-400 block mb-0.5">Wilson Başarı Skoru</span>
              <b className="font-sans text-base font-extrabold text-emerald-500 tracking-tight">
                %{selectedPattern.wilsonScore}
              </b>
              <span className="text-[9px] text-slate-400 block mt-0.5">
                {selectedPattern.wins} Kazanç / {selectedPattern.losses} Kayıp
              </span>
            </div>

            <div className={`p-2.5 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.02] border-white/5'}`}>
              <span className="text-[10px] text-slate-400 block mb-0.5">10-Bar Ort. Getiri</span>
              <b className={`font-sans text-base font-extrabold tracking-tight ${selectedPattern.ret10 >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {selectedPattern.ret10 >= 0 ? `+${selectedPattern.ret10}%` : `${selectedPattern.ret10}%`}
              </b>
              <span className="text-[9px] text-slate-400 block mt-0.5">Net kâr/zarar</span>
            </div>

            <div className={`p-2.5 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.02] border-white/5'}`}>
              <span className="text-[10px] text-slate-400 block mb-0.5">MFE (Maks Kâr)</span>
              <b className="font-sans text-base font-extrabold text-emerald-400 tracking-tight">
                +{selectedPattern.mfe}%
              </b>
              <span className="text-[9px] text-slate-400 block mt-0.5">En yüksek dalgalanma</span>
            </div>

            <div className={`p-2.5 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.02] border-white/5'}`}>
              <span className="text-[10px] text-slate-400 block mb-0.5">MAE (Maks Drawdown)</span>
              <b className="font-sans text-base font-extrabold text-amber-500 tracking-tight">
                -{selectedPattern.mae}%
              </b>
              <span className="text-[9px] text-slate-400 block mt-0.5">En yüksek geri çekilme</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
