import React, { useState } from 'react';
import { AppSettings, LevelRay } from '../types';
import { fmtPrice } from '../services/dataFeed';
import { X, Trash2, Plus, RotateCcw, Sun, Moon, Palette, Eye, Sliders } from 'lucide-react';

interface SettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  manualLevels: LevelRay[];
  precision: number;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onAddManualLevel: (price: number) => void;
  onDeleteManualLevel: (id: string | number) => void;
  onClearManualLevels: () => void;
  onResetDefaults: () => void;
}

export const SettingsSheet: React.FC<SettingsSheetProps> = ({
  isOpen,
  onClose,
  settings,
  manualLevels,
  precision,
  onUpdateSettings,
  onAddManualLevel,
  onDeleteManualLevel,
  onClearManualLevels,
  onResetDefaults
}) => {
  const [newLevelPrice, setNewLevelPrice] = useState('');

  if (!isOpen) return null;

  const isLight = settings.theme === 'light';

  const handleAddLevel = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(newLevelPrice);
    if (isFinite(val) && val > 0) {
      onAddManualLevel(val);
      setNewLevelPrice('');
    }
  };

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    onUpdateSettings({
      theme: newTheme,
      backgroundColor: newTheme === 'dark' ? '#0c0e14' : '#ffffff',
      gridColor: newTheme === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.05)'
    });
  };

  // Color preset options for horizontal level rays
  const levelColorPresets = [
    { label: 'Gök Mavisi', color: '#38bdf8' },
    { label: 'Altın', color: '#facc15' },
    { label: 'Beyaz', color: '#f8fafc' },
    { label: 'Yeşil', color: '#10b981' },
    { label: 'Koyu Lacivert', color: '#0f172a' }
  ];

  const currentLevelColor = settings.strategyLevelColor || (isLight ? '#0f172a' : '#38bdf8');

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/65 backdrop-blur-sm animate-in fade-in select-none">
      <div
        className={`w-full border-t rounded-t-3xl max-h-[88vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200 transition-colors ${
          isLight
            ? 'bg-white border-slate-200 text-slate-800'
            : 'bg-[#141822] border-white/10 text-[#e8eaf2]'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Grip */}
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
          <div className="flex items-center gap-2">
            <Sliders size={18} className={isLight ? 'text-blue-600' : 'text-blue-400'} />
            <h3
              className={`font-extrabold text-base tracking-tight ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}
            >
              Grafik & Strateji Ayarları
            </h3>
          </div>
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
          {/* 1. TEMA SEÇİMİ (Aydınlık / Koyu) */}
          <div className="space-y-2">
            <h4
              className={`text-[10px] font-black tracking-wider uppercase ${
                isLight ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
              Arayüz & Grafik Teması
            </h4>

            <div
              className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.03] border-white/5'
              }`}
            >
              <div>
                <span className={`font-bold block ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Tema Modu
                </span>
                <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  {isLight ? 'Aydınlık (Beyaz & Net Kontrast)' : 'Koyu (Karanlık Terminal)'}
                </span>
              </div>

              <div
                className={`flex items-center p-1 rounded-xl border ${
                  isLight ? 'bg-white border-slate-200' : 'bg-[#0c0e14] border-white/10'
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleThemeChange('dark')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                    !isLight
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Moon size={14} />
                  <span>Koyu</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleThemeChange('light')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                    isLight
                      ? 'bg-amber-500 text-black shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sun size={14} />
                  <span>Aydınlık</span>
                </button>
              </div>
            </div>
          </div>

          {/* 2. STRATEJİ - SATIŞ1 SİSTEMİ & YATAY IŞIN ÇÖZÜMÜ */}
          <div className="space-y-3">
            <h4
              className={`text-[10px] font-black tracking-wider uppercase ${
                isLight ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
              SATIŞ1 Strateji Motoru & Çizgiler
            </h4>

            <div
              className={`p-3.5 rounded-2xl border space-y-3 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.03] border-white/5'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className={`font-bold block ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Strateji Motoru Aktif
                  </span>
                  <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    V1 → Yatay Seviye → V2 → SATIŞ1 → Dinamik TP
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.strategyMode}
                  onChange={(e) => onUpdateSettings({ strategyMode: e.target.checked })}
                  className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                />
              </div>

              {/* Yatay Seviye Işını Rengi ve Kalınlığı - SİYAH KALMA SORUNUNA ÇÖZÜM */}
              <div
                className={`p-3 rounded-xl border space-y-2 ${
                  isLight ? 'bg-white border-slate-200' : 'bg-white/[0.02] border-white/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <label
                      className={`text-[11px] font-bold block ${
                        isLight ? 'text-slate-900' : 'text-white'
                      }`}
                    >
                      Yatay Seviye Işını Rengi
                    </label>
                    <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      Koyu temada net görünmesi için parlak renk tavsiye edilir
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-5 h-5 rounded-full border border-black/20 shadow-sm"
                      style={{ backgroundColor: currentLevelColor }}
                    />
                    <input
                      type="color"
                      value={currentLevelColor}
                      onChange={(e) => onUpdateSettings({ strategyLevelColor: e.target.value })}
                      className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
                      title="Özel Renk Seç"
                    />
                  </div>
                </div>

                {/* Hızlı Renk Paleti */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {levelColorPresets.map((p) => {
                    const isSelected = currentLevelColor.toLowerCase() === p.color.toLowerCase();
                    return (
                      <button
                        key={p.color}
                        type="button"
                        onClick={() => onUpdateSettings({ strategyLevelColor: p.color })}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold border transition ${
                          isSelected
                            ? isLight
                              ? 'border-blue-600 bg-blue-50 text-blue-700'
                              : 'border-blue-500 bg-blue-500/20 text-white'
                            : isLight
                            ? 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                            : 'border-white/5 bg-white/5 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: p.color }}
                        />
                        <span>{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dikey ve SATIŞ Çizgi Renkleri */}
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-white/5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      className={`text-[11px] font-medium ${
                        isLight ? 'text-slate-700' : 'text-slate-300'
                      }`}
                    >
                      V1 Dikey Çizgi
                    </label>
                    <input
                      type="color"
                      value={settings.strategyLineColor}
                      onChange={(e) => onUpdateSettings({ strategyLineColor: e.target.value })}
                      className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.strategyShowVLines}
                      onChange={(e) => onUpdateSettings({ strategyShowVLines: e.target.checked })}
                      className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                    />
                    <span className={`text-[10px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                      Göster
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      className={`text-[11px] font-medium ${
                        isLight ? 'text-slate-700' : 'text-slate-300'
                      }`}
                    >
                      SATIŞ1 Giriş Rengi
                    </label>
                    <input
                      type="color"
                      value={settings.strategySellColor}
                      onChange={(e) => onUpdateSettings({ strategySellColor: e.target.value })}
                      className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.strategyShowRays}
                      onChange={(e) => onUpdateSettings({ strategyShowRays: e.target.checked })}
                      className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                    />
                    <span className={`text-[10px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                      Göster
                    </span>
                  </div>
                </div>

                <div>
                  <label
                    className={`text-[11px] font-medium block mb-1 ${
                      isLight ? 'text-slate-700' : 'text-slate-300'
                    }`}
                  >
                    Dikey Lookback
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={settings.strategyVLookback}
                    onChange={(e) =>
                      onUpdateSettings({ strategyVLookback: parseInt(e.target.value) || 3 })
                    }
                    className={`w-full px-2 py-1 rounded-lg font-mono font-bold border ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900'
                        : 'bg-white/5 border-white/10 text-white'
                    }`}
                  />
                </div>

                <div>
                  <label
                    className={`text-[11px] font-medium block mb-1 ${
                      isLight ? 'text-slate-700' : 'text-slate-300'
                    }`}
                  >
                    Yatay Lookback
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={settings.strategyHLookback}
                    onChange={(e) =>
                      onUpdateSettings({ strategyHLookback: parseInt(e.target.value) || 3 })
                    }
                    className={`w-full px-2 py-1 rounded-lg font-mono font-bold border ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900'
                        : 'bg-white/5 border-white/10 text-white'
                    }`}
                  />
                </div>
              </div>

              <div
                className={`grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t text-[11px] ${
                  isLight ? 'border-slate-200' : 'border-white/5'
                }`}
              >
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.strategyShowTp}
                    onChange={(e) => onUpdateSettings({ strategyShowTp: e.target.checked })}
                    className="w-4 h-4 accent-blue-600 rounded"
                  />
                  <span>TP İşaretleri</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.strategyShowLabels}
                    onChange={(e) => onUpdateSettings({ strategyShowLabels: e.target.checked })}
                    className="w-4 h-4 accent-blue-600 rounded"
                  />
                  <span>V1/S1 İsim Etiketi</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.strategyShowTags}
                    onChange={(e) => onUpdateSettings({ strategyShowTags: e.target.checked })}
                    className="w-4 h-4 accent-blue-600 rounded"
                  />
                  <span>Sağ Fiyat Kutusu</span>
                </label>
              </div>
            </div>
          </div>

          {/* 3. PINE SCRIPT PARAMETRELERİ (Gaussian & VWMA) */}
          <div className="space-y-3">
            <h4
              className={`text-[10px] font-black tracking-wider uppercase ${
                isLight ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
              Pine Script Parametreleri
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Gaussian Card */}
              <div
                className={`p-3.5 rounded-2xl border space-y-2.5 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.03] border-white/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Gaussian Smoother
                  </span>
                  <input
                    type="color"
                    value={settings.gaussianColor}
                    onChange={(e) => onUpdateSettings({ gaussianColor: e.target.value })}
                    className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                  />
                </div>

                <div>
                  <div
                    className={`flex justify-between text-[11px] mb-1 ${
                      isLight ? 'text-slate-600' : 'text-slate-400'
                    }`}
                  >
                    <span>Bandwidth (h)</span>
                    <span className="font-mono text-emerald-500 font-bold">
                      {settings.gaussianBandwidth}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="40"
                    value={settings.gaussianBandwidth}
                    onChange={(e) =>
                      onUpdateSettings({ gaussianBandwidth: parseInt(e.target.value) || 8 })
                    }
                    className="w-full accent-emerald-500"
                  />
                </div>

                <div>
                  <label
                    className={`text-[11px] block mb-1 ${
                      isLight ? 'text-slate-600' : 'text-slate-400'
                    }`}
                  >
                    Kaynak
                  </label>
                  <select
                    value={settings.gaussianSource}
                    onChange={(e) => onUpdateSettings({ gaussianSource: e.target.value as any })}
                    className={`w-full px-2 py-1 rounded font-mono text-xs border ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900'
                        : 'bg-white/5 border-white/10 text-white'
                    }`}
                  >
                    <option value="close">close</option>
                    <option value="hl2">hl2</option>
                    <option value="hlc3">hlc3</option>
                    <option value="ohlc4">ohlc4</option>
                  </select>
                </div>
              </div>

              {/* VWMA Card */}
              <div
                className={`p-3.5 rounded-2xl border space-y-2.5 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.03] border-white/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    VWMA (Hacim Ağırlıklı)
                  </span>
                  <input
                    type="color"
                    value={settings.vwmaColor}
                    onChange={(e) => onUpdateSettings({ vwmaColor: e.target.value })}
                    className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                  />
                </div>

                <div>
                  <div
                    className={`flex justify-between text-[11px] mb-1 ${
                      isLight ? 'text-slate-600' : 'text-slate-400'
                    }`}
                  >
                    <span>Periyot (vwmaLength)</span>
                    <span className="font-mono text-amber-500 font-bold">{settings.vwmaPeriod}</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    value={settings.vwmaPeriod}
                    onChange={(e) =>
                      onUpdateSettings({ vwmaPeriod: parseInt(e.target.value) || 34 })
                    }
                    className="w-full accent-amber-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 4. MANUEL ÇİZİM SEVİYELERİ YÖNETİMİ */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4
                className={`text-[10px] font-black tracking-wider uppercase ${
                  isLight ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                Manuel Çizim Seviyeleri ({manualLevels.length})
              </h4>
              {manualLevels.length > 0 && (
                <button
                  onClick={onClearManualLevels}
                  className="text-[10px] font-bold text-rose-500 hover:text-rose-600 transition"
                >
                  Tümünü Temizle
                </button>
              )}
            </div>

            <div
              className={`p-3.5 rounded-2xl border space-y-3 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.03] border-white/5'
              }`}
            >
              <form onSubmit={handleAddLevel} className="flex gap-2">
                <input
                  type="number"
                  step="any"
                  placeholder="Seviye Fiyatı (örn: 89500)"
                  value={newLevelPrice}
                  onChange={(e) => setNewLevelPrice(e.target.value)}
                  className={`flex-1 px-3 py-1.5 rounded-xl font-mono text-xs outline-none border ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                      : 'bg-white/5 border-white/10 text-white placeholder:text-slate-500'
                  }`}
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-white flex items-center gap-1 shadow-sm active:scale-95 transition"
                >
                  <Plus size={14} /> Ekle
                </button>
              </form>

              {manualLevels.length > 0 ? (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {manualLevels.map((lv) => (
                    <div
                      key={lv.id}
                      className={`flex items-center justify-between p-2 rounded-lg border ${
                        isLight
                          ? 'bg-white border-slate-200 text-slate-900'
                          : 'bg-white/[0.02] border-white/5 text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor:
                              !lv.color || lv.color === '#000000' || lv.color === '#000'
                                ? currentLevelColor
                                : lv.color
                          }}
                        />
                        <span className="font-mono font-bold">
                          {fmtPrice(lv.price, precision, settings.priceLocale)}
                        </span>
                      </div>
                      <button
                        onClick={() => onDeleteManualLevel(lv.id)}
                        className="p-1 text-slate-400 hover:text-rose-500 transition"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className={`text-[11px] text-center py-2 ${
                    isLight ? 'text-slate-500' : 'text-slate-500'
                  }`}
                >
                  Grafiğe tıklayarak veya yukarıdan fiyat girerek seviye ışınları ekleyebilirsiniz.
                </div>
              )}
            </div>
          </div>

          {/* 5. GÖRÜNÜM & SES AYARLARI */}
          <div className="space-y-3">
            <h4
              className={`text-[10px] font-black tracking-wider uppercase ${
                isLight ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
              Grafik & Arayüz Detayları
            </h4>

            <div
              className={`p-3.5 rounded-2xl border space-y-2.5 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.03] border-white/5'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={isLight ? 'text-slate-800' : 'text-slate-200'}>
                  Sesli Uyarılar (V1, SATIŞ1, TP)
                </span>
                <input
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={(e) => onUpdateSettings({ soundEnabled: e.target.checked })}
                  className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className={isLight ? 'text-slate-800' : 'text-slate-200'}>Fiyat Formatı</span>
                <select
                  value={settings.priceLocale}
                  onChange={(e) => onUpdateSettings({ priceLocale: e.target.value as any })}
                  className={`px-2 py-1 rounded font-mono text-xs border ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-900'
                      : 'bg-white/5 border-white/10 text-white'
                  }`}
                >
                  <option value="tr-TR">Türkçe (0,9334)</option>
                  <option value="en-US">İngilizce (0.9334)</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className={isLight ? 'text-slate-800' : 'text-slate-200'}>Grafik Tipi</span>
                <select
                  value={settings.chartType}
                  onChange={(e) => onUpdateSettings({ chartType: e.target.value as any })}
                  className={`px-2 py-1 rounded text-xs border ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-900'
                      : 'bg-white/5 border-white/10 text-white'
                  }`}
                >
                  <option value="candles">Dolu Mumlar</option>
                  <option value="hollow">İçi Boş Mumlar</option>
                  <option value="area">Alan Grafiği</option>
                  <option value="line">Çizgi Grafiği</option>
                </select>
              </div>
            </div>
          </div>

          {/* Reset Defaults Button */}
          <button
            onClick={onResetDefaults}
            className={`w-full py-3 rounded-xl font-extrabold flex items-center justify-center gap-2 border transition ${
              isLight
                ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                : 'bg-white/5 border-white/5 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30'
            }`}
          >
            <RotateCcw size={15} />
            Varsayılan Ayarlara Sıfırla
          </button>
        </div>
      </div>
    </div>
  );
};
