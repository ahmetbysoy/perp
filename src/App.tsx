import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Candle,
  Interval,
  MarketInfo,
  TickerData,
  AppSettings,
  LevelRay,
  VLineMarker,
  ConnectionStatus,
  MobileTab,
  OrderbookData,
  MevAnalytics,
  MultiTimeframeConsensus,
  TradeSetup,
  RawFlowMetrics,
  PatternRecord
} from './types';
import {
  BinanceProvider,
  OKXProvider,
  SyntheticProvider,
  IDataProvider,
  INTERVAL_SEC,
  fmtPrice
} from './services/dataFeed';
import { fgaussian, vwmaCalc, pickSource } from './services/indicators';
import { detectStrategy } from './services/strategy';
import { sound } from './services/sound';
import { orderbookService } from './services/orderbookService';
import { consensusEngine } from './services/consensusEngine';
import { rawFlowService } from './services/rawFlowService';
import { patternPoolService } from './services/patternPoolService';
import { ChartContainer } from './components/ChartContainer';
import { TopBar } from './components/TopBar';
import { PriceBar } from './components/PriceBar';
import { TimeframeBar } from './components/TimeframeBar';
import { PositionChip } from './components/PositionChip';
import { FlowMiniOverlay } from './components/FlowMiniOverlay';
import { DecisionSignalCard } from './components/DecisionSignalCard';
import { PatternPoolPanel } from './components/PatternPoolPanel';
import { TradeSetupHero } from './components/TradeSetupHero';
import { LiquidityWallsPanel } from './components/LiquidityWallsPanel';
import { ConsensusPanel } from './components/ConsensusPanel';
import { MevRadarPanel } from './components/MevRadarPanel';
import { MobileBottomNav } from './components/MobileBottomNav';
import { BacktestModal } from './components/BacktestModal';
import { PositionCalculatorModal } from './components/PositionCalculatorModal';
import { CoinSelectorSheet } from './components/CoinSelectorSheet';
import { SettingsSheet } from './components/SettingsSheet';
import { ScreenerModal } from './components/ScreenerModal';

const DEFAULT_SETTINGS: AppSettings = {
  providerPref: 'binance',
  theme: 'dark',
  chartType: 'candles',
  upColor: '#089981',
  downColor: '#f23645',
  backgroundColor: '#0c0e14',
  gridVisible: true,
  gridColor: 'rgba(255, 255, 255, 0.04)',
  priceLocale: 'tr-TR',
  borderVisible: true,
  wickVisible: true,

  gaussianVisible: true,
  gaussianBandwidth: 8,
  gaussianSource: 'close',
  gaussianColor: '#4caf50',
  gaussianWidth: 2,

  vwmaVisible: true,
  vwmaPeriod: 34,
  vwmaColor: '#ff9800',
  vwmaWidth: 2,

  strategyMode: true,
  strategyShowVLines: true,
  strategyVLookback: 3,
  strategyShowRays: true,
  strategyHLookback: 3,
  strategyShowTp: true,
  strategyShowLabels: true,
  strategyShowTags: true,
  strategyShowDots: true,
  strategyShowChip: true,
  strategyRayWidth: 2,
  strategyLevelColor: '#38bdf8',
  strategyLineColor: '#2962ff',
  strategySellColor: '#f23645',
  strategyTpColor: '#089981',

  levelsVisible: true,
  vlinesVisible: true,
  clickAddLevel: false,
  clickAddVLine: false,

  soundEnabled: true,
  volumeVisible: false,
  legendVisible: false,
  countdownVisible: true,
  priceLineVisible: true,
  priceLabelVisible: true,
  barSpacing: 8,

  showHeatmap: true,
  showFlowMini: true,
  rawConfirmEnabled: true,
  patternWinThreshold: 0.15,
  muteWeakPatterns: false,
  whaleThresholdUsd: 250000
};

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('fc_settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [symbolKey, setSymbolKey] = useState<string>(() => {
    return localStorage.getItem('fc_symbol') || 'BTCUSDT';
  });

  const [interval, setInterval] = useState<Interval>(() => {
    const saved = localStorage.getItem('fc_interval') as Interval;
    return saved || '5m';
  });

  const [provider, setProvider] = useState<IDataProvider | null>(null);
  const [market, setMarket] = useState<MarketInfo | null>(null);
  const [connection, setConnection] = useState<ConnectionStatus>({
    state: 'connecting',
    providerName: 'Binance Futures',
    isFallback: false
  });

  const [activeTab, setActiveTab] = useState<MobileTab>('chart');
  const [orderbook, setOrderbook] = useState<OrderbookData | null>(null);
  const [consensus, setConsensus] = useState<MultiTimeframeConsensus | null>(null);
  const [tradeSetup, setTradeSetup] = useState<TradeSetup | null>(null);
  const [rawFlowMetrics, setRawFlowMetrics] = useState<RawFlowMetrics | null>(null);
  const [bestPattern, setBestPattern] = useState<PatternRecord | null>(null);

  const [bars, setBars] = useState<Candle[]>([]);
  const [ticker, setTicker] = useState<TickerData | null>(null);
  const [tickersMap, setTickersMap] = useState<Record<string, { last: number; changePct: number; quoteVol?: number }>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Manual Drawings
  const [manualLevels, setManualLevels] = useState<LevelRay[]>(() => {
    try {
      const saved = localStorage.getItem(`fc_levels_${symbolKey}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [manualVLines, setManualVLines] = useState<VLineMarker[]>(() => {
    try {
      const saved = localStorage.getItem(`fc_vlines_${symbolKey}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Modals & Sheets
  const [isCoinSheetOpen, setIsCoinSheetOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBacktestOpen, setIsBacktestOpen] = useState(false);
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [isScreenerOpen, setIsScreenerOpen] = useState(false);

  // Countdown timer string
  const [countdown, setCountdown] = useState<string>('');

  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wsGenRef = useRef<number>(0);
  const previousChainsCountRef = useRef<number>(0);
  const previousTpCountRef = useRef<number>(0);

  // Tick-by-tick buffer for 60fps real-time trades stream
  const tickQueueRef = useRef<{ price: number; qty: number } | null>(null);
  const tickRafRef = useRef<number | null>(null);

  const flushTick = useCallback(() => {
    const tick = tickQueueRef.current;
    if (!tick) return;
    const { price, qty } = tick;
    tickQueueRef.current = null;

    // 1. Instant header price update
    setTicker((prev) => (prev ? { ...prev, last: price } : { last: price, changePct: 0 }));

    // 2. Instant active candle update (high, low, close)
    setBars((prev) => {
      if (!prev.length) return prev;
      const last = prev[prev.length - 1];
      if (last.close === price && price <= last.high && price >= last.low) return prev;
      const updated = [...prev];
      updated[updated.length - 1] = {
        ...last,
        high: Math.max(last.high, price),
        low: Math.min(last.low, price),
        close: price,
        volume: last.volume + (qty > 0 ? qty : 0)
      };
      return updated;
    });
  }, []);

  const scheduleTick = useCallback((price: number, qty: number) => {
    tickQueueRef.current = { price, qty };
    const lastP = bars.length ? bars[bars.length - 1].close : price;
    const isSellerAggressive = price < lastP;
    rawFlowService.pushTrade(price, qty, isSellerAggressive);

    if (tickRafRef.current == null) {
      tickRafRef.current = requestAnimationFrame(() => {
        tickRafRef.current = null;
        flushTick();
      });
    }
  }, [bars, flushTick]);

  // 250ms backup flush to keep trades ticking even when background tab throttles rAF
  useEffect(() => {
    const backupTimer = window.setInterval(flushTick, 250);
    return () => {
      window.clearInterval(backupTimer);
      if (tickRafRef.current != null) cancelAnimationFrame(tickRafRef.current);
    };
  }, [flushTick]);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMsg(null);
    }, 2800);
  }, []);

  // Sync sound service toggle
  useEffect(() => {
    sound.setEnabled(settings.soundEnabled);
  }, [settings.soundEnabled]);

  // Persist settings
  useEffect(() => {
    try {
      localStorage.setItem('fc_settings', JSON.stringify(settings));
      localStorage.setItem('fc_symbol', symbolKey);
      localStorage.setItem('fc_interval', interval);
      localStorage.setItem(`fc_levels_${symbolKey}`, JSON.stringify(manualLevels));
      localStorage.setItem(`fc_vlines_${symbolKey}`, JSON.stringify(manualVLines));
    } catch {}
  }, [settings, symbolKey, interval, manualLevels, manualVLines]);

  // Initialize Provider
  useEffect(() => {
    let isCancelled = false;

    async function initProvider() {
      setIsLoading(true);
      const pref = settings.providerPref;
      const providersToTry =
        pref === 'okx'
          ? [new OKXProvider()]
          : pref === 'demo'
          ? [new SyntheticProvider()]
          : pref === 'binance-only'
          ? [new BinanceProvider()]
          : [new BinanceProvider(), new OKXProvider(), new SyntheticProvider()];

      for (const p of providersToTry) {
        try {
          await p.init();
          if (isCancelled) return;
          setProvider(p);
          const isFallback = p.key !== 'binance';
          setConnection({
            state: 'open',
            providerName: p.name,
            isFallback
          });

          // Fetch all tickers in background for coin selector
          p.fetchAllTickers().then((tm) => {
            if (!isCancelled) setTickersMap(tm);
          }).catch(() => {});

          return;
        } catch {
          // try next
        }
      }

      if (!isCancelled) {
        showToast('Veri sağlayıcılarına bağlanılamadı');
        setIsLoading(false);
      }
    }

    initProvider();

    return () => {
      isCancelled = true;
    };
  }, [settings.providerPref, showToast]);

  // Resolve Market when provider or symbolKey changes
  useEffect(() => {
    if (!provider || !provider.markets.length) return;
    const found =
      provider.markets.find((m) => m.key === symbolKey) ||
      provider.markets.find((m) => m.key === 'BTCUSDT') ||
      provider.markets[0];

    setMarket(found);
    if (found.key !== symbolKey) {
      setSymbolKey(found.key);
    }
  }, [provider, symbolKey]);

  // Load Klines & Start Real-time Stream
  useEffect(() => {
    if (!provider || !market) return;

    const curGen = ++wsGenRef.current;
    setIsLoading(true);

    async function loadData() {
      try {
        const [klines, tData] = await Promise.all([
          provider!.fetchKlines(market!.key, interval, 500),
          provider!.fetchTicker(market!.key).catch(() => null)
        ]);

        if (curGen !== wsGenRef.current) return;

        setBars(klines);
        if (tData) setTicker(tData);
        setIsLoading(false);

        // Subscribe to real-time WebSocket stream
        provider!.subscribe(market!.key, interval, {
          onCandle: (c, isFinal) => {
            if (curGen !== wsGenRef.current) return;
            setBars((prev) => {
              if (!prev.length) return [c];
              const last = prev[prev.length - 1];

              if (c.time > last.time) {
                // New bar opened
                const updated = [...prev, c];
                if (updated.length > 650) updated.shift();
                return updated;
              } else if (c.time === last.time) {
                // Update current forming bar
                const merged: Candle = {
                  time: last.time,
                  open: last.open,
                  high: Math.max(last.high, c.high),
                  low: Math.min(last.low, c.low),
                  close: c.close,
                  volume: Math.max(last.volume, c.volume)
                };
                const updated = [...prev];
                updated[updated.length - 1] = merged;
                return updated;
              }
              return prev;
            });

            setTicker((prev) => (prev ? { ...prev, last: c.close } : { last: c.close, changePct: 0 }));
          },
          onTicker: (t) => {
            if (curGen !== wsGenRef.current) return;
            setTicker((prev) => ({ ...(prev || {}), ...t }));
          },
          onTick: (price, qty) => {
            if (curGen !== wsGenRef.current) return;
            scheduleTick(price, qty);
          },
          onStatus: (st) => {
            if (curGen !== wsGenRef.current) return;
            setConnection(st);
          }
        });
      } catch (err: any) {
        if (curGen !== wsGenRef.current) return;
        setIsLoading(false);
        showToast('Veri çekilemedi: ' + (err?.message || 'Bilinmeyen hata'));
      }
    }

    loadData();

    return () => {
      provider.close();
    };
  }, [provider, market, interval, showToast]);

  // Countdown timer for bar closure
  useEffect(() => {
    const sec = INTERVAL_SEC[interval] || 60;
    const intervalTimer = window.setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const remain = sec - (now % sec);
      const m = Math.floor(remain / 60);
      const s = remain % 60;
      setCountdown(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    }, 500);

    return () => window.clearInterval(intervalTimer);
  }, [interval]);

  // Calculate Indicators & Strategy Chains
  const { gaussianData, vwmaData, strategyChains, stats } = useMemo(() => {
    if (!bars.length) {
      return {
        gaussianData: [],
        vwmaData: [],
        strategyChains: [],
        stats: {
          totalSignals: 0,
          activeSignals: 0,
          tpCount: 0,
          pendingCount: 0,
          winRate: 0,
          avgPnlPct: 0,
          cumulativePnlPct: 0,
          maxDrawdownPct: 0,
          bestTradePct: 0,
          worstTradePct: 0
        }
      };
    }

    const src = pickSource(bars, settings.gaussianSource);
    const g = fgaussian(src, settings.gaussianBandwidth);
    const v = vwmaCalc(
      bars.map((b) => b.close),
      bars.map((b) => b.volume),
      settings.vwmaPeriod
    );

    const { chains, stats: bStats } = detectStrategy(bars, g, v, false);
    return { gaussianData: g, vwmaData: v, strategyChains: chains, stats: bStats };
  }, [bars, settings.gaussianSource, settings.gaussianBandwidth, settings.vwmaPeriod]);

  // Audio Alerts on Strategy Signals
  useEffect(() => {
    if (!settings.strategyMode || !settings.soundEnabled) return;

    if (strategyChains.length > previousChainsCountRef.current && previousChainsCountRef.current > 0) {
      const latest = strategyChains[strategyChains.length - 1];
      if (latest.status === 'acik') {
        sound.playSellEntry();
        showToast(`SATIŞ${latest.id} Girişi Aktif!`);
      } else {
        sound.playV1Signal();
        showToast(`V1 Sinyali Tespit Edildi (#${latest.id})`);
      }
    }
    previousChainsCountRef.current = strategyChains.length;

    if (stats.tpCount > previousTpCountRef.current && previousTpCountRef.current > 0) {
      sound.playTpSuccess();
      showToast('Dinamik TP Hedefine Ulaşıldı! ✓');
    }
    previousTpCountRef.current = stats.tpCount;
  }, [strategyChains, stats.tpCount, settings.strategyMode, settings.soundEnabled, showToast]);

  const activeChain = useMemo(() => {
    return strategyChains.filter((c) => c.status === 'acik').pop() || null;
  }, [strategyChains]);

  const currentGaussian = useMemo(() => {
    return gaussianData.length ? gaussianData[gaussianData.length - 1] : null;
  }, [gaussianData]);

  const lastClose = useMemo(() => {
    return bars.length ? bars[bars.length - 1].close : null;
  }, [bars]);

  // Hook up Orderbook Depth & Real-time WSS Latency
  useEffect(() => {
    if (!market) return;
    orderbookService.subscribe(market.key, (data, latencyMs) => {
      setOrderbook(data);
      setConnection((prev) => ({ ...prev, latencyMs }));
    });

    return () => {
      orderbookService.close();
    };
  }, [market]);

  // Evaluate Real-time MEV & Slippage Matrix
  const mevAnalytics = useMemo(() => {
    return orderbook ? orderbookService.evaluateMevRisk(orderbook) : null;
  }, [orderbook]);

  // Multi-Timeframe Background Sync (1m, 5m, 15m)
  useEffect(() => {
    if (!provider || !market) return;
    let isCancelled = false;

    async function syncConsensus() {
      try {
        const [b1m, b5m, b15m] = await Promise.all([
          provider!.fetchKlines(market!.key, '1m', 80),
          provider!.fetchKlines(market!.key, '5m', 80),
          provider!.fetchKlines(market!.key, '15m', 80)
        ]);

        if (isCancelled) return;
        const cons = consensusEngine.buildConsensus(b1m, b5m, b15m);
        setConsensus(cons);

        const currentP = b1m[b1m.length - 1]?.close || 0;
        const setup = consensusEngine.generateTradeSetup(cons, currentP, currentGaussian);
        setTradeSetup(setup);
      } catch {}
    }

    syncConsensus();
    const timer = window.setInterval(syncConsensus, 15000);

    return () => {
      isCancelled = true;
      window.clearInterval(timer);
    };
  }, [provider, market, currentGaussian]);

  // Synchronize Raw Order Flow Metrics (CVD, OBI, OI, Liq, Funding)
  useEffect(() => {
    rawFlowService.setSymbol(symbolKey);
    const syncFlow = () => {
      const flow = rawFlowService.computeMetrics(orderbook, activeChain, lastClose);
      setRawFlowMetrics(flow);
    };

    syncFlow();
    const intervalTimer = window.setInterval(syncFlow, 1000);
    return () => window.clearInterval(intervalTimer);
  }, [symbolKey, orderbook, activeChain, lastClose]);

  // Analyze historical and live candles for Pattern Pool Engine (Wilson scoring)
  useEffect(() => {
    if (bars.length >= 25) {
      patternPoolService.analyzeCandles(
        bars,
        interval === '1m' ? '1m' : '5m',
        gaussianData,
        vwmaData
      );
      const all = patternPoolService.getAllPatterns();
      if (all.length) setBestPattern(all[0]);
    }
  }, [bars, interval, gaussianData, vwmaData]);

  // Manual Drawings Actions
  const handleAddManualLevel = useCallback(
    (price: number, time?: number) => {
      const isDark = settings.theme === 'dark';
      const levelColor = isDark
        ? (settings.strategyLevelColor || '#38bdf8')
        : '#0284c7';

      const newRay: LevelRay = {
        id: Date.now(),
        price,
        startTime: time || bars[0]?.time,
        color: levelColor,
        width: 2,
        tag: 'Düzey'
      };
      setManualLevels((prev) => [...prev, newRay]);
      showToast(`Seviye Eklendi: ${fmtPrice(price, market?.precision || 2, settings.priceLocale)}`);
    },
    [bars, market?.precision, settings.priceLocale, settings.theme, settings.strategyLevelColor, showToast]
  );

  const handleAddManualVLine = useCallback(
    (time: number) => {
      const newV: VLineMarker = {
        id: Date.now(),
        time,
        color: settings.strategyLineColor || '#2962ff'
      };
      setManualVLines((prev) => [...prev, newV]);
      showToast('Dikey Çizgi Eklendi');
    },
    [settings.strategyLineColor, showToast]
  );

  const handleDeleteManualLevel = useCallback((id: string | number) => {
    setManualLevels((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const handleClearManualLevels = useCallback(() => {
    setManualLevels([]);
    showToast('Tüm manuel seviyeler temizlendi');
  }, [showToast]);

  // Single-Shot Mode auto-disarm
  const handleSingleShotAdded = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      clickAddLevel: false,
      clickAddVLine: false
    }));
  }, []);

  // Theme toggle action
  const handleToggleTheme = useCallback(() => {
    setSettings((prev) => {
      const nextTheme = prev.theme === 'dark' ? 'light' : 'dark';
      return {
        ...prev,
        theme: nextTheme,
        backgroundColor: nextTheme === 'dark' ? '#0c0e14' : '#ffffff',
        gridColor: nextTheme === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.05)'
      };
    });
    showToast(settings.theme === 'dark' ? 'Aydınlık Tema Aktif' : 'Koyu Tema Aktif');
  }, [settings.theme, showToast]);

  const isLight = settings.theme === 'light';

  return (
    <div
      className={`fixed inset-0 flex flex-col overflow-hidden select-none font-sans transition-colors duration-200 ${
        isLight ? 'bg-slate-100 text-slate-900' : 'bg-[#0c0e14] text-[#e8eaf2]'
      }`}
    >
      {/* Top Header */}
      <TopBar
        market={market}
        connection={connection}
        soundEnabled={settings.soundEnabled}
        theme={settings.theme}
        winRate={stats.winRate}
        onOpenCoinSelect={() => setIsCoinSheetOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenBacktest={() => setIsBacktestOpen(true)}
        onOpenCalculator={() => setIsCalcOpen(true)}
        onOpenScreener={() => setIsScreenerOpen(true)}
        onToggleSound={() => setSettings((s) => ({ ...s, soundEnabled: !s.soundEnabled }))}
        onToggleTheme={handleToggleTheme}
      />

      {/* Price & Countdown Bar */}
      <PriceBar
        ticker={ticker}
        lastClose={lastClose}
        precision={market?.precision || 2}
        locale={settings.priceLocale}
        countdown={countdown}
        theme={settings.theme}
        clickAddLevel={settings.clickAddLevel}
        clickAddVLine={settings.clickAddVLine}
        onToggleAddLevel={() => {
          const next = !settings.clickAddLevel;
          setSettings((s) => ({ ...s, clickAddLevel: next, clickAddVLine: false }));
          if (next) showToast('Grafiğe dokunduğun yere seviye çizgisi eklenir');
        }}
        onToggleAddVLine={() => {
          const next = !settings.clickAddVLine;
          setSettings((s) => ({ ...s, clickAddVLine: next, clickAddLevel: false }));
          if (next) showToast('Grafiğe dokunduğun yere dikey çizgi eklenir');
        }}
      />

      {/* Main Content Area based on Active Mobile Tab */}
      <div
        className={`flex-1 relative flex flex-col min-h-0 overflow-hidden transition-colors duration-200 ${
          isLight ? 'bg-slate-100' : 'bg-[#0c0e14]'
        }`}
      >
        {activeTab === 'chart' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Active Position Tracking Chip */}
            <PositionChip
              activeChain={activeChain}
              lastClose={lastClose}
              currentGaussian={currentGaussian}
              precision={market?.precision || 2}
              locale={settings.priceLocale}
              theme={settings.theme}
              onOpenCalculator={() => setIsCalcOpen(true)}
            />

            {/* Timeframe selector */}
            <TimeframeBar
              currentInterval={interval}
              theme={settings.theme}
              onSelectInterval={(tf) => setInterval(tf)}
            />

            {/* Main Interactive Chart & Canvas Overlay */}
            <main
              className={`flex-1 relative min-h-0 border-t overflow-hidden transition-colors duration-200 ${
                isLight ? 'bg-white border-slate-200' : 'bg-[#0e111a] border-white/5'
              }`}
            >
              {/* Floating Live Flow Mini Panel (Stage 4 feature) */}
              {settings.showFlowMini && (
                <FlowMiniOverlay metrics={rawFlowMetrics} theme={settings.theme} />
              )}

              {isLoading && (
                <div
                  className={`absolute inset-0 z-40 backdrop-blur-sm flex flex-col items-center justify-center gap-3 ${
                    isLight ? 'bg-white/80' : 'bg-[#0c0e14]/80'
                  }`}
                >
                  <div className="w-9 h-9 rounded-full border-3 border-slate-300 border-t-blue-500 animate-spin" />
                  <span
                    className={`text-xs font-bold ${
                      isLight ? 'text-slate-800' : 'text-slate-300'
                    }`}
                  >
                    Piyasa verisi yükleniyor...
                  </span>
                </div>
              )}

              <ChartContainer
                bars={bars}
                gaussianData={gaussianData}
                vwmaData={vwmaData}
                strategyChains={strategyChains}
                manualLevels={manualLevels}
                manualVLines={manualVLines}
                orderbook={orderbook}
                settings={settings}
                precision={market?.precision || 2}
                onAddManualLevel={handleAddManualLevel}
                onAddManualVLine={handleAddManualVLine}
                onDeleteManualLevel={handleDeleteManualLevel}
                onSingleShotAdded={handleSingleShotAdded}
              />
            </main>
          </div>
        )}

        {activeTab === 'signal' && (
          <div className="flex-1 overflow-y-auto pb-24 overscroll-contain">
            <TradeSetupHero
              setup={tradeSetup}
              consensus={consensus}
              currentPrice={lastClose}
              precision={market?.precision || 2}
              locale={settings.priceLocale}
              theme={settings.theme}
            />
            <DecisionSignalCard
              metrics={rawFlowMetrics}
              activeChain={activeChain}
              bestPattern={bestPattern}
              precision={market?.precision || 2}
              locale={settings.priceLocale}
              theme={settings.theme}
            />
          </div>
        )}

        {activeTab === 'pool' && (
          <div className="flex-1 overflow-y-auto pb-24 overscroll-contain">
            <PatternPoolPanel theme={settings.theme} />
          </div>
        )}

        {activeTab === 'walls' && (
          <div className="flex-1 overflow-y-auto pb-24 overscroll-contain">
            <LiquidityWallsPanel
              orderbook={orderbook}
              precision={market?.precision || 2}
              locale={settings.priceLocale}
              theme={settings.theme}
            />
          </div>
        )}

        {activeTab === 'consensus' && (
          <div className="flex-1 overflow-y-auto pb-24 overscroll-contain">
            <ConsensusPanel consensus={consensus} theme={settings.theme} />
          </div>
        )}

        {activeTab === 'mev' && (
          <div className="flex-1 overflow-y-auto pb-24 overscroll-contain">
            <MevRadarPanel
              mev={mevAnalytics}
              precision={market?.precision || 2}
              locale={settings.priceLocale}
              theme={settings.theme}
            />
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        activeTab={activeTab}
        theme={settings.theme}
        onSelectTab={setActiveTab}
        rawFlowScore={rawFlowMetrics?.rawScore}
        consensusScore={consensus?.overallScore}
        mevRiskScore={mevAnalytics?.frontrunRiskScore}
      />

      {/* Coin Selector Sheet */}
      <CoinSelectorSheet
        isOpen={isCoinSheetOpen}
        onClose={() => setIsCoinSheetOpen(false)}
        markets={provider?.markets || []}
        tickersMap={tickersMap}
        selectedKey={symbolKey}
        providerName={provider?.name || 'Binance Futures'}
        locale={settings.priceLocale}
        theme={settings.theme}
        onSelectCoin={(k) => setSymbolKey(k)}
        onOpenScreener={() => setIsScreenerOpen(true)}
      />

      {/* Settings Sheet */}
      <SettingsSheet
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        manualLevels={manualLevels}
        precision={market?.precision || 2}
        onUpdateSettings={(newOpts) => setSettings((s) => ({ ...s, ...newOpts }))}
        onAddManualLevel={handleAddManualLevel}
        onDeleteManualLevel={handleDeleteManualLevel}
        onClearManualLevels={handleClearManualLevels}
        onResetDefaults={() => {
          setSettings(DEFAULT_SETTINGS);
          showToast('Varsayılan ayarlar yüklendi');
        }}
      />

      {/* Backtest & Statistics Modal */}
      <BacktestModal
        isOpen={isBacktestOpen}
        onClose={() => setIsBacktestOpen(false)}
        stats={stats}
        chains={strategyChains}
        precision={market?.precision || 2}
        locale={settings.priceLocale}
        theme={settings.theme}
      />

      {/* Position & Risk Calculator Modal */}
      <PositionCalculatorModal
        isOpen={isCalcOpen}
        onClose={() => setIsCalcOpen(false)}
        defaultEntryPrice={activeChain?.sellPrice || lastClose}
        defaultTpPrice={currentGaussian || (lastClose ? lastClose * 0.98 : null)}
        precision={market?.precision || 2}
        locale={settings.priceLocale}
        theme={settings.theme}
      />

      {/* Live Screener / Signal Radar Modal */}
      <ScreenerModal
        isOpen={isScreenerOpen}
        onClose={() => setIsScreenerOpen(false)}
        currentInterval={interval}
        currentSymbol={symbolKey}
        theme={settings.theme}
        locale={settings.priceLocale}
        onSelectCoin={(symbol) => {
          setSymbolKey(symbol);
          showToast(`${symbol} grafiğine geçildi!`);
        }}
      />

      {/* Floating Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl shadow-2xl backdrop-blur-md text-xs font-bold tracking-tight animate-in fade-in slide-in-from-bottom-2 ${
            isLight
              ? 'bg-slate-900/90 text-white border border-slate-700'
              : 'bg-slate-900/90 text-white border border-white/10'
          }`}
        >
          {toastMsg}
        </div>
      )}
    </div>
  );
}
