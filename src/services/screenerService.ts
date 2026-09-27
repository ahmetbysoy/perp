import { Candle, Interval, ScreenerItem, ScreenerSignalType } from '../types';
import { fgaussian, vwmaCalc } from './indicators';
import { detectStrategy } from './strategy';

export const POPULAR_SCREENER_SYMBOLS = [
  { symbol: 'BTCUSDT', base: 'BTC' },
  { symbol: 'ETHUSDT', base: 'ETH' },
  { symbol: 'SOLUSDT', base: 'SOL' },
  { symbol: 'BNBUSDT', base: 'BNB' },
  { symbol: 'XRPUSDT', base: 'XRP' },
  { symbol: 'DOGEUSDT', base: 'DOGE' },
  { symbol: 'AVAXUSDT', base: 'AVAX' },
  { symbol: 'LINKUSDT', base: 'LINK' },
  { symbol: 'SUIUSDT', base: 'SUI' },
  { symbol: 'NEARUSDT', base: 'NEAR' },
  { symbol: 'ADAUSDT', base: 'ADA' },
  { symbol: 'PEPEUSDT', base: 'PEPE' },
  { symbol: 'APTUSDT', base: 'APT' },
  { symbol: 'RENDERUSDT', base: 'RENDER' },
  { symbol: 'ARBUSDT', base: 'ARB' }
];

interface Raw24HrTicker {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  quoteVolume: string;
}

class ScreenerService {
  private cache: ScreenerItem[] = [];
  private lastScanTime: number = 0;
  private cacheDurationMs: number = 10000; // 10 seconds cache
  private isScanning: boolean = false;

  public async scan(
    interval: Interval = '1m',
    force: boolean = false
  ): Promise<ScreenerItem[]> {
    const now = Date.now();
    if (!force && this.cache.length > 0 && now - this.lastScanTime < this.cacheDurationMs) {
      return this.cache;
    }

    if (this.isScanning && this.cache.length > 0) {
      return this.cache;
    }

    this.isScanning = true;

    try {
      // 1. Fetch 24hr tickers in single batch call from Binance Futures
      const tickersMap: Record<string, Raw24HrTicker> = {};
      try {
        const resp = await fetch('https://fapi.binance.com/fapi/v1/ticker/24hr', {
          signal: AbortSignal.timeout(6000)
        });
        if (resp.ok) {
          const list: Raw24HrTicker[] = await resp.json();
          list.forEach((t) => {
            tickersMap[t.symbol] = t;
          });
        }
      } catch (e) {
        console.warn('Screener: 24hr ticker batch fetch error, using fallback tickers', e);
      }

      // 2. Fetch candles for top 15 symbols with concurrency chunking (5 at a time)
      const results: ScreenerItem[] = [];
      const chunkSize = 5;

      for (let i = 0; i < POPULAR_SCREENER_SYMBOLS.length; i += chunkSize) {
        const chunk = POPULAR_SCREENER_SYMBOLS.slice(i, i + chunkSize);
        const chunkPromises = chunk.map(async ({ symbol, base }) => {
          return this.analyzeSymbol(symbol, base, interval, tickersMap[symbol]);
        });

        const chunkResults = await Promise.all(chunkPromises);
        results.push(...chunkResults);
      }

      // Sort by urgency: SHORT_ACTIVE first, then V1_PENDING, then DYNAMIC_TP_NEAR, then volume
      results.sort((a, b) => {
        const score = (item: ScreenerItem) => {
          if (item.signalType === 'SHORT_ACTIVE') return 1000;
          if (item.signalType === 'V1_PENDING') return 800;
          if (item.signalType === 'DYNAMIC_TP_NEAR') return 600;
          if (item.signalType === 'TP_HIT') return 400;
          if (item.signalType === 'BULLISH') return 200;
          return 0;
        };
        const diff = score(b) - score(a);
        if (diff !== 0) return diff;
        return b.quoteVol24h - a.quoteVol24h;
      });

      this.cache = results;
      this.lastScanTime = Date.now();
      return results;
    } finally {
      this.isScanning = false;
    }
  }

  private async analyzeSymbol(
    symbol: string,
    base: string,
    interval: Interval,
    ticker?: Raw24HrTicker
  ): Promise<ScreenerItem> {
    let candles: Candle[] = [];

    try {
      const resp = await fetch(
        `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=45`,
        { signal: AbortSignal.timeout(4000) }
      );
      if (resp.ok) {
        const raw: Array<[number, string, string, string, string, string]> = await resp.json();
        candles = raw.map((k) => ({
          time: Math.floor(k[0] / 1000),
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5])
        }));
      }
    } catch {
      // ignore, fallback
    }

    const price = ticker ? parseFloat(ticker.lastPrice) : (candles[candles.length - 1]?.close || 100);
    const changePct = ticker ? parseFloat(ticker.priceChangePercent) : 0;
    const high24h = ticker ? parseFloat(ticker.highPrice) : price * 1.02;
    const low24h = ticker ? parseFloat(ticker.lowPrice) : price * 0.98;
    const quoteVol24h = ticker ? parseFloat(ticker.quoteVolume) : 50_000_000;

    if (candles.length < 20) {
      return {
        symbol,
        base,
        price,
        changePct,
        high24h,
        low24h,
        quoteVol24h,
        gaussianPrice: null,
        vwmaPrice: null,
        distToGaussianPct: null,
        signalType: 'NEUTRAL',
        signalLabel: 'Yatay / Konsolidasyon',
        confidence: 50,
        lastUpdated: Date.now()
      };
    }

    // Technical calculations
    const closes = candles.map((c) => c.close);
    const volumes = candles.map((c) => c.volume);

    const gaussianArr = fgaussian(closes, 8);
    const vwmaArr = vwmaCalc(closes, volumes, 34);

    const curGaussian = gaussianArr[gaussianArr.length - 1];
    const curVwma = vwmaArr[vwmaArr.length - 1];

    const distToGaussianPct =
      curGaussian != null && price > 0
        ? parseFloat((((price - curGaussian) / price) * 100).toFixed(2))
        : null;

    // Detect strategy chains
    const { chains } = detectStrategy(candles, gaussianArr, vwmaArr, false);
    const activeChain = chains.length ? chains[chains.length - 1] : undefined;

    let signalType: ScreenerSignalType = 'NEUTRAL';
    let signalLabel = 'Yatay / Konsolidasyon';
    let confidence = 50;

    if (activeChain) {
      if (activeChain.status === 'acik') {
        signalType = 'SHORT_ACTIVE';
        signalLabel = `SATIŞ${activeChain.id} (Short Aktif)`;
        confidence = 94;
      } else if (activeChain.status === 'bekliyor') {
        signalType = 'V1_PENDING';
        signalLabel = `V1 (Seviye Kırılımı Bekleniyor)`;
        confidence = 82;
      } else if (activeChain.status === 'tp') {
        signalType = 'TP_HIT';
        signalLabel = `TP${activeChain.id} Gerçekleşti ✓`;
        confidence = 88;
      }
    }

    if (signalType === 'NEUTRAL') {
      if (distToGaussianPct != null && Math.abs(distToGaussianPct) <= 0.35) {
        signalType = 'DYNAMIC_TP_NEAR';
        signalLabel = `Dinamik TP Yakın (%${Math.abs(distToGaussianPct).toFixed(2)})`;
        confidence = 78;
      } else if (curVwma != null && curGaussian != null && curVwma > curGaussian && price > curGaussian) {
        signalType = 'BULLISH';
        signalLabel = 'Yükseliş Trendi';
        confidence = 65;
      }
    }

    return {
      symbol,
      base,
      price,
      changePct,
      high24h,
      low24h,
      quoteVol24h,
      gaussianPrice: curGaussian,
      vwmaPrice: curVwma,
      distToGaussianPct,
      signalType,
      signalLabel,
      confidence,
      chain: activeChain,
      lastUpdated: Date.now()
    };
  }
}

export const screenerService = new ScreenerService();
