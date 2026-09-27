import {
  Candle,
  MultiTimeframeConsensus,
  TimeframeForecast,
  TradeSetup
} from '../types';
import { fgaussian, vwmaCalc } from './indicators';

export class ConsensusEngine {
  /**
   * Evaluates a single timeframe's bars and generates directional forecast + reasoning
   */
  public evaluateTimeframe(bars: Candle[], tfName: '1m' | '5m' | '15m'): TimeframeForecast {
    if (bars.length < 15) {
      return {
        direction: 'NEUTRAL',
        confidence: 50,
        reasons: ['Yetersiz geçmiş bar verisi.']
      };
    }

    const closes = bars.map((b) => b.close);
    const volumes = bars.map((b) => b.volume);

    // Indicators: Gaussian(8) & VWMA(34 or proportional period for shorter tf)
    const gPeriod = tfName === '1m' ? 6 : 8;
    const vPeriod = tfName === '1m' ? 21 : 34;

    const g = fgaussian(closes, gPeriod);
    const v = vwmaCalc(closes, volumes, Math.min(vPeriod, closes.length - 1));

    const lastIdx = bars.length - 1;
    const curClose = closes[lastIdx];
    const curG = g[lastIdx];
    const curV = v[lastIdx];
    const prevG = g[lastIdx - 1];
    const prevV = v[lastIdx - 1];

    const reasons: string[] = [];
    let bullishPoints = 0;
    let bearishPoints = 0;

    // 1. VWMA vs Gaussian Alignment
    if (curV != null && curG != null) {
      if (curV > curG) {
        bullishPoints += 2;
        reasons.push(
          tfName === '1m'
            ? 'Hızlı MA (VWMA) Gaussian üzerinde pozitif trendde'
            : 'VWMA > Gaussian yükseliş kanal hizalanması stabil'
        );
      } else {
        bearishPoints += 2;
        reasons.push(
          tfName === '1m'
            ? 'VWMA Gaussian altında: SATIŞ1 potansiyeli aktif'
            : 'VWMA < Gaussian ayı piyasası baskısı sürüyor'
        );
      }

      // Check recent cross
      if (prevV != null && prevG != null) {
        if (prevV <= prevG && curV > curG) {
          bullishPoints += 2;
          reasons.push('Yeni Golden Cross kesişimi teyit edildi');
        } else if (prevV >= prevG && curV < curG) {
          bearishPoints += 2;
          reasons.push('V1 kesişimi: Turuncu yeşili aşağı kırdı (Düşüş Sinyali)');
        }
      }
    }

    // 2. Price Position relative to Gaussian
    if (curG != null) {
      const gStr = curG.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
      if (curClose >= curG) {
        bullishPoints += 1;
        reasons.push(`Fiyat Gaussian (${gStr}) seviyesi üzerinde tutunuyor`);
      } else {
        bearishPoints += 1;
        reasons.push(`Fiyat Gaussian (${gStr}) direncinin altında`);
      }
    }

    // 3. Volume and Candle Momentum (Last 3 bars)
    const recentBars = bars.slice(-3);
    const greenBars = recentBars.filter((b) => b.close >= b.open).length;
    const totalVol = recentBars.reduce((acc, b) => acc + b.volume, 0);
    const greenVol = recentBars
      .filter((b) => b.close >= b.open)
      .reduce((acc, b) => acc + b.volume, 0);

    const buyerVolDominance = totalVol > 0 ? (greenVol / totalVol) * 100 : 50;

    if (buyerVolDominance > 60) {
      bullishPoints += 1.5;
      reasons.push(`Taker alım hacmi baskısı: %${buyerVolDominance.toFixed(0)} alıcı üstünlüğü`);
    } else if (buyerVolDominance < 40) {
      bearishPoints += 1.5;
      reasons.push(`Taker satış hacmi baskısı: %${(100 - buyerVolDominance).toFixed(0)} satıcı üstünlüğü`);
    } else {
      reasons.push('Hacim dengeli, likidite konsolidasyon bölgesinde');
    }

    // 4. Direction & Confidence Computation
    const total = bullishPoints + bearishPoints;
    let direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    let confidence = 50;

    if (bullishPoints > bearishPoints + 0.5) {
      direction = 'BULLISH';
      confidence = Math.min(94, Math.round(55 + (bullishPoints / (total || 1)) * 38));
    } else if (bearishPoints > bullishPoints + 0.5) {
      direction = 'BEARISH';
      confidence = Math.min(94, Math.round(55 + (bearishPoints / (total || 1)) * 38));
    } else {
      direction = 'NEUTRAL';
      confidence = 52;
    }

    return {
      direction,
      confidence,
      reasons: reasons.slice(0, 3)
    };
  }

  /**
   * Aggregates 1m, 5m, and 15m into single unified multi-timeframe consensus
   */
  public buildConsensus(
    bars1m: Candle[],
    bars5m: Candle[],
    bars15m: Candle[]
  ): MultiTimeframeConsensus {
    const f1m = this.evaluateTimeframe(bars1m, '1m');
    const f5m = this.evaluateTimeframe(bars5m, '5m');
    const f15m = this.evaluateTimeframe(bars15m, '15m');

    // Weights: 15m (45%), 5m (35%), 1m (20%)
    let netScore = 0; // positive = bullish, negative = bearish

    const scoreFor = (f: TimeframeForecast) => {
      const mul = f.direction === 'BULLISH' ? 1 : f.direction === 'BEARISH' ? -1 : 0;
      return mul * (f.confidence / 100);
    };

    netScore += scoreFor(f15m) * 0.45;
    netScore += scoreFor(f5m) * 0.35;
    netScore += scoreFor(f1m) * 0.2;

    let consensusDirection: 'STRONG_LONG' | 'LONG' | 'NEUTRAL' | 'SHORT' | 'STRONG_SHORT' = 'NEUTRAL';
    const absScore = Math.abs(netScore);

    if (netScore > 0.45) consensusDirection = 'STRONG_LONG';
    else if (netScore > 0.15) consensusDirection = 'LONG';
    else if (netScore < -0.45) consensusDirection = 'STRONG_SHORT';
    else if (netScore < -0.15) consensusDirection = 'SHORT';
    else consensusDirection = 'NEUTRAL';

    const overallScore = Math.min(98, Math.max(50, Math.round(50 + absScore * 48)));

    return {
      consensusDirection,
      overallScore,
      timeframes: {
        '1m': f1m,
        '5m': f5m,
        '15m': f15m
      }
    };
  }

  /**
   * Generates actionable Trade Setup (Entry, SL, TP1, TP2, R:R)
   */
  public generateTradeSetup(
    consensus: MultiTimeframeConsensus,
    currentPrice: number,
    gaussianValue: number | null
  ): TradeSetup {
    const isShort =
      consensus.consensusDirection === 'SHORT' || consensus.consensusDirection === 'STRONG_SHORT';

    const entry = currentPrice;
    const atrApprox = currentPrice * 0.006; // ~0.6% standard swing distance

    let sl: number;
    let tp1: number;
    let tp2: number;

    if (isShort) {
      sl = Number((entry + atrApprox * 1.2).toFixed(2));
      tp1 = Number((entry - atrApprox * 1.5).toFixed(2));
      // Dynamic TP2 anchored to Gaussian line or 2.5x ATR
      tp2 = gaussianValue && gaussianValue < entry ? gaussianValue : Number((entry - atrApprox * 2.6).toFixed(2));
    } else {
      sl = Number((entry - atrApprox * 1.2).toFixed(2));
      tp1 = Number((entry + atrApprox * 1.5).toFixed(2));
      tp2 = gaussianValue && gaussianValue > entry ? gaussianValue : Number((entry + atrApprox * 2.6).toFixed(2));
    }

    const slDist = Math.abs(entry - sl);
    const tp1Dist = Math.abs(entry - tp1);
    const rr = slDist > 0 ? (tp1Dist / slDist).toFixed(1) : '1:2.0';
    const expectedPnl = Number(((Math.abs(entry - tp1) / entry) * 100).toFixed(2));

    return {
      direction: isShort ? 'SHORT' : 'LONG',
      entry,
      sl,
      tp1,
      tp2,
      riskRewardRatio: `1:${rr}`,
      expectedPnlPct: expectedPnl
    };
  }
}

export const consensusEngine = new ConsensusEngine();
