export type Interval = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '12h' | '1d';
export const INTERVALS: Interval[] = ['1m', '5m', '15m', '30m', '1h', '4h', '12h', '1d'];

export interface Candle {
  time: number; // UTC timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TickerData {
  last: number;
  changePct: number;
  high?: number;
  low?: number;
  quoteVol?: number;
}

export interface MarketInfo {
  key: string;
  native: string;
  base: string;
  quote: string;
  precision: number;
  tickSize: string | null;
  seed?: { p: number; c: number };
}

export type StrategyStatus = 'bekliyor' | 'acik' | 'tp' | 'gecersiz';

export interface StrategyChain {
  id: number;
  v1Bar: number;
  v1Time: number;
  level: number;
  v2Bar: number;
  v2Time: number | null;
  sellPrice: number | null;
  tpBar: number;
  tpTime: number | null;
  tpPrice: number | null;
  status: StrategyStatus;
  pnlPct: number;
  durationBars: number;
  isConfirmed: boolean; // bar closed flag
}

export interface BacktestStats {
  totalSignals: number;
  activeSignals: number;
  tpCount: number;
  pendingCount: number;
  winRate: number;
  avgPnlPct: number;
  cumulativePnlPct: number;
  maxDrawdownPct: number;
  bestTradePct: number;
  worstTradePct: number;
}

export interface LevelRay {
  id: string | number;
  price: number;
  startTime?: number;
  color: string;
  width: number;
  dash?: number[];
  tag?: string;
  isCustom?: boolean;
}

export interface VLineMarker {
  id: string | number;
  time: number;
  color: string;
  label?: string;
}

export interface AppSettings {
  providerPref: 'binance' | 'binance-only' | 'okx' | 'demo';
  theme: 'light' | 'dark';
  chartType: 'candles' | 'hollow' | 'area' | 'line';
  upColor: string;
  downColor: string;
  backgroundColor: string;
  gridVisible: boolean;
  gridColor: string;
  priceLocale: 'tr-TR' | 'en-US';
  borderVisible: boolean;
  wickVisible: boolean;

  // Gaussian (Fast MA)
  gaussianVisible: boolean;
  gaussianBandwidth: number;
  gaussianSource: 'close' | 'hl2' | 'hlc3' | 'ohlc4';
  gaussianColor: string;
  gaussianWidth: number;

  // VWMA (Slow MA)
  vwmaVisible: boolean;
  vwmaPeriod: number;
  vwmaColor: string;
  vwmaWidth: number;

  // Strategy - SATIŞ1
  strategyMode: boolean;
  strategyShowVLines: boolean;
  strategyVLookback: number;
  strategyShowRays: boolean;
  strategyHLookback: number;
  strategyShowTp: boolean;
  strategyShowLabels: boolean;
  strategyShowTags: boolean;
  strategyShowDots: boolean;
  strategyShowChip: boolean;
  strategyRayWidth: number;
  strategyLevelColor?: string;
  strategyLineColor: string;
  strategySellColor: string;
  strategyTpColor: string;

  // Manual Drawings
  levelsVisible: boolean;
  vlinesVisible: boolean;
  clickAddLevel: boolean;
  clickAddVLine: boolean;

  // Other UI & Sound
  soundEnabled: boolean;
  volumeVisible: boolean;
  legendVisible: boolean;
  countdownVisible: boolean;
  priceLineVisible: boolean;
  priceLabelVisible: boolean;
  barSpacing: number;

  // Layer 2: Raw Flow & Heatmap & Pattern Pool settings
  showHeatmap: boolean;
  showFlowMini: boolean;
  rawConfirmEnabled: boolean;
  patternWinThreshold: number;
  muteWeakPatterns: boolean;
  whaleThresholdUsd: number;
}

export interface ConnectionStatus {
  state: 'connecting' | 'open' | 'retry' | 'fallback' | 'closed';
  url?: string;
  delay?: number;
  latencyMs?: number;
  providerName: string;
  isFallback: boolean;
}

export type MobileTab = 'chart' | 'signal' | 'pool' | 'walls' | 'consensus' | 'mev';

export interface RawFlowMetrics {
  cvd60: number; // net CVD in last 60s
  cvd60Buy: number;
  cvd60Sell: number;
  obi: number; // Order Book Imbalance (-100 to +100%)
  bidDepthUsd: number;
  askDepthUsd: number;
  openInterest: number;
  oiChangePct: number;
  fundingRate: number; // e.g. +0.0050%
  liq60LongUsd: number;
  liq60ShortUsd: number;
  spread: number;
  spreadPct: number;
  whaleMode: string;
  whaleCount: number;
  rawScore: number; // 0 - 100
  verdict: 'CONFIRM' | 'VETO' | 'WAIT';
  reasons: string[];
}

export interface PatternRecord {
  key: string;
  name: string;
  timeframe: '1m' | '5m';
  count: number;
  wins: number;
  losses: number;
  wilsonScore: number; // 0 - 100%
  ret10: number; // mean return % at bar 10
  mfe: number; // Maximum Favorable Excursion %
  mae: number; // Maximum Adverse Excursion %
  status: 'good' | 'bad' | 'wait';
  lastTriggered?: number;
  recentReturns?: number[];
}

export type OrderbookLevel = [price: number, qty: number];

export interface LiquidityWall {
  price: number;
  volume: number;
  volumeUsd: number;
  distancePct: number;
  isSupport: boolean;
}

export interface OrderbookData {
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
  bidWalls: LiquidityWall[];
  askWalls: LiquidityWall[];
  bidDominance: number; // 0 - 100%
  totalBidDepthUsd: number;
  totalAskDepthUsd: number;
  timestamp: number;
}

export interface SlippageMatrixItem {
  sizeUsd: number;
  buySlippagePct: number;
  sellSlippagePct: number;
  buyWorstPrice: number;
  sellWorstPrice: number;
  buyAvgPrice: number;
  sellAvgPrice: number;
}

export interface MevAnalytics {
  frontrunRiskScore: number;
  riskLevel: 'LOW' | 'ELEVATED' | 'CRITICAL';
  recommendation: string;
  slippageMatrix: SlippageMatrixItem[];
  sandwichSimulation: {
    estimatedMevProfitUsd: number;
    victimSlippageLossUsd: number;
  };
}

export interface TimeframeForecast {
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence: number;
  reasons: string[];
}

export interface MultiTimeframeConsensus {
  consensusDirection: 'STRONG_LONG' | 'LONG' | 'NEUTRAL' | 'SHORT' | 'STRONG_SHORT';
  overallScore: number;
  timeframes: {
    '1m': TimeframeForecast;
    '5m': TimeframeForecast;
    '15m': TimeframeForecast;
  };
}

export interface TradeSetup {
  direction: 'LONG' | 'SHORT';
  entry: number;
  sl: number;
  tp1: number;
  tp2: number;
  riskRewardRatio: string;
  expectedPnlPct: number;
}

export type ScreenerSignalType =
  | 'SHORT_ACTIVE'
  | 'V1_PENDING'
  | 'TP_HIT'
  | 'DYNAMIC_TP_NEAR'
  | 'BULLISH'
  | 'NEUTRAL';

export interface ScreenerItem {
  symbol: string;
  base: string;
  price: number;
  changePct: number;
  quoteVol24h: number; // in USD
  high24h: number;
  low24h: number;
  gaussianPrice: number | null;
  vwmaPrice: number | null;
  distToGaussianPct: number | null;
  signalType: ScreenerSignalType;
  signalLabel: string;
  confidence: number; // 0-100
  chain?: StrategyChain;
  lastUpdated: number;
}


