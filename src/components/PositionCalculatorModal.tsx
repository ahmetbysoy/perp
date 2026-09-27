import React, { useState } from 'react';
import { fmtPrice } from '../services/dataFeed';
import { X, Calculator, ShieldCheck, DollarSign, Percent } from 'lucide-react';

interface PositionCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEntryPrice: number | null;
  defaultTpPrice: number | null;
  precision: number;
  locale: string;
  theme?: 'light' | 'dark';
}

export const PositionCalculatorModal: React.FC<PositionCalculatorModalProps> = ({
  isOpen,
  onClose,
  defaultEntryPrice,
  defaultTpPrice,
  precision,
  locale,
  theme = 'dark'
}) => {
  const [balance, setBalance] = useState<number>(1000);
  const [riskPct, setRiskPct] = useState<number>(1.5);
  const [leverage, setLeverage] = useState<number>(10);
  const [entryPrice, setEntryPrice] = useState<number>(defaultEntryPrice || 50000);
  const [stopPrice, setStopPrice] = useState<number>(
    defaultEntryPrice ? defaultEntryPrice * 1.02 : 51000
  );
  const [tpPrice, setTpPrice] = useState<number>(defaultTpPrice || 48000);

  if (!isOpen) return null;

  const isLight = theme === 'light';

  // Math:
  // Short trade:
  // Stop Loss distance = (Stop - Entry) / Entry
  // If user risks riskPct % of balance:
  // RiskAmount = balance * (riskPct / 100)
  // DistancePct = abs(stopPrice - entryPrice) / entryPrice
  // Required Position Size (USDT) = RiskAmount / DistancePct
  const riskAmount = (balance * riskPct) / 100;
  const slDistPct = entryPrice > 0 ? Math.abs(stopPrice - entryPrice) / entryPrice : 0.01;
  const positionSizeUsdt = slDistPct > 0 ? riskAmount / slDistPct : 0;
  const marginRequired = leverage > 0 ? positionSizeUsdt / leverage : positionSizeUsdt;
  const coinAmount = entryPrice > 0 ? positionSizeUsdt / entryPrice : 0;

  // Short TP profit:
  const tpDistPct = entryPrice > 0 ? (entryPrice - tpPrice) / entryPrice : 0;
  const potentialProfitUsdt = positionSizeUsdt * tpDistPct;
  const riskReward = riskAmount > 0 ? potentialProfitUsdt / riskAmount : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in select-none">
      <div
        className={`w-full max-w-md border rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden transition-colors ${
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
            <Calculator className="text-emerald-500" size={20} />
            <h3
              className={`font-extrabold text-base tracking-tight ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}
            >
              Futures Pozisyon & Risk Hesaplayıcı
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

        {/* Inputs & Calculation Results */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {/* Inputs Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className={`text-[11px] font-bold block mb-1 ${
                  isLight ? 'text-slate-600' : 'text-slate-400'
                }`}
              >
                Kasa Bakiyesi (USDT)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={balance}
                  onChange={(e) => setBalance(Math.max(1, parseFloat(e.target.value) || 0))}
                  className={`w-full px-3 py-2 rounded-xl font-mono font-bold border outline-none focus:border-emerald-500 ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900'
                      : 'bg-white/[0.04] border-white/10 text-white'
                  }`}
                />
                <span className="absolute right-3 top-2 text-slate-400 font-mono text-xs">$</span>
              </div>
            </div>

            <div>
              <label
                className={`text-[11px] font-bold block mb-1 ${
                  isLight ? 'text-slate-600' : 'text-slate-400'
                }`}
              >
                Risk Oranı (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={riskPct}
                  onChange={(e) => setRiskPct(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                  className={`w-full px-3 py-2 rounded-xl font-mono font-bold border outline-none focus:border-emerald-500 ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900'
                      : 'bg-white/[0.04] border-white/10 text-white'
                  }`}
                />
                <span className="absolute right-3 top-2 text-slate-400 font-mono text-xs">%</span>
              </div>
            </div>

            <div>
              <label
                className={`text-[11px] font-bold block mb-1 ${
                  isLight ? 'text-slate-600' : 'text-slate-400'
                }`}
              >
                Kaldıraç (1x - 50x)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={leverage}
                onChange={(e) =>
                  setLeverage(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))
                }
                className={`w-full px-3 py-2 rounded-xl font-mono font-bold border outline-none focus:border-emerald-500 ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900'
                    : 'bg-white/[0.04] border-white/10 text-white'
                }`}
              />
            </div>

            <div>
              <label
                className={`text-[11px] font-bold block mb-1 ${
                  isLight ? 'text-slate-600' : 'text-slate-400'
                }`}
              >
                Giriş Fiyatı (Short)
              </label>
              <input
                type="number"
                step="any"
                value={entryPrice}
                onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
                className={`w-full px-3 py-2 rounded-xl font-mono font-bold border outline-none focus:border-emerald-500 ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900'
                    : 'bg-white/[0.04] border-white/10 text-white'
                }`}
              />
            </div>

            <div>
              <label
                className={`text-[11px] font-bold block mb-1 ${
                  isLight ? 'text-rose-600' : 'text-rose-400'
                }`}
              >
                Zarar Kes (Stop Loss)
              </label>
              <input
                type="number"
                step="any"
                value={stopPrice}
                onChange={(e) => setStopPrice(parseFloat(e.target.value) || 0)}
                className={`w-full px-3 py-2 rounded-xl font-mono font-bold border outline-none focus:border-rose-500 ${
                  isLight
                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              />
            </div>

            <div>
              <label
                className={`text-[11px] font-bold block mb-1 ${
                  isLight ? 'text-emerald-600' : 'text-emerald-400'
                }`}
              >
                Hedef Fiyat (Dinamik TP)
              </label>
              <input
                type="number"
                step="any"
                value={tpPrice}
                onChange={(e) => setTpPrice(parseFloat(e.target.value) || 0)}
                className={`w-full px-3 py-2 rounded-xl font-mono font-bold border outline-none focus:border-emerald-500 ${
                  isLight
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                }`}
              />
            </div>
          </div>

          {/* Quick presets for risk */}
          <div className="flex items-center gap-1.5 pt-1">
            <span
              className={`text-[10px] font-bold mr-1 ${
                isLight ? 'text-slate-500' : 'text-slate-500'
              }`}
            >
              Hızlı Risk:
            </span>
            {[0.5, 1.0, 1.5, 2.0, 3.0].map((r) => (
              <button
                key={r}
                onClick={() => setRiskPct(r)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                  riskPct === r
                    ? 'bg-emerald-500 text-black font-extrabold shadow-sm'
                    : isLight
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                %{r}
              </button>
            ))}
          </div>

          {/* Output Results Card */}
          <div
            className={`p-3.5 rounded-xl border space-y-2.5 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.03] border-white/10'
            }`}
          >
            <div className="flex justify-between items-center text-xs">
              <span className={isLight ? 'text-slate-600 font-medium' : 'text-slate-400 font-medium'}>
                Risk Tutarı (Maks Kayıp):
              </span>
              <span
                className={`font-mono font-bold ${isLight ? 'text-rose-600' : 'text-rose-400'}`}
              >
                ${riskAmount.toFixed(2)} USDT (%{riskPct} risk)
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className={isLight ? 'text-slate-600 font-medium' : 'text-slate-400 font-medium'}>
                Gerekli Teminat (Margin):
              </span>
              <span
                className={`font-mono font-black text-sm ${
                  isLight ? 'text-amber-600' : 'text-amber-300'
                }`}
              >
                ${marginRequired.toFixed(2)} USDT ({leverage}x)
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className={isLight ? 'text-slate-600 font-medium' : 'text-slate-400 font-medium'}>
                Toplam Pozisyon Büyüklüğü:
              </span>
              <span
                className={`font-mono font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}
              >
                ${positionSizeUsdt.toFixed(2)} USDT ({coinAmount.toFixed(4)} Kontrat)
              </span>
            </div>

            <div
              className={`border-t pt-2 flex justify-between items-center text-xs ${
                isLight ? 'border-slate-200' : 'border-white/10'
              }`}
            >
              <span className={isLight ? 'text-slate-600 font-medium' : 'text-slate-400 font-medium'}>
                TP Gerçekleşirse Kazanç:
              </span>
              <span
                className={`font-mono font-black text-sm ${
                  isLight ? 'text-emerald-600' : 'text-emerald-400'
                }`}
              >
                +${potentialProfitUsdt.toFixed(2)} USDT (%{(tpDistPct * 100).toFixed(2)})
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className={isLight ? 'text-slate-600 font-medium' : 'text-slate-400 font-medium'}>
                Risk / Ödül Oranı (R:R):
              </span>
              <span
                className={`font-mono font-black ${isLight ? 'text-blue-600' : 'text-blue-400'}`}
              >
                1 : {riskReward.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
