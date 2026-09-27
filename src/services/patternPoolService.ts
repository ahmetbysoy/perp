import { Candle, PatternRecord, RawFlowMetrics, StrategyChain } from '../types';

class PatternPoolService {
  private patterns: Map<string, PatternRecord> = new Map();
  private evaluatedEvents: Set<string> = new Set();
  private storageKey = 'fc_pattern_pool_v2';

  constructor() {
    this.loadFromStorage();
  }

  public resetAll() {
    this.patterns.clear();
    this.evaluatedEvents.clear();
    try {
      localStorage.removeItem(this.storageKey);
      localStorage.removeItem('fc_pattern_pool'); // remove legacy corrupted key
    } catch {}
  }

  private loadFromStorage() {
    try {
      localStorage.removeItem('fc_pattern_pool'); // clean up legacy corrupted storage
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed: PatternRecord[] = JSON.parse(saved);
        parsed.forEach((p) => {
          // If previous bug caused counts > 500, skip corrupted record
          if (p && p.count < 500) {
            this.patterns.set(p.key, p);
          }
        });
      }
    } catch {}
  }

  public saveToStorage() {
    try {
      const arr = Array.from(this.patterns.values());
      localStorage.setItem(this.storageKey, JSON.stringify(arr));
    } catch {}
  }

  /**
   * Wilson Score lower bound (Bayesian probability confidence)
   * Prevents small sample illusion (e.g. 1/1 = 100% vs 85/100 = 85%)
   */
  public calculateWilsonScore(wins: number, total: number, z: number = 1.44): number {
    if (total <= 0) return 0;
    const p = wins / total;
    const z2 = z * z;
    const numerator = p + z2 / (2 * total) - z * Math.sqrt((p * (1 - p) + z2 / (4 * total)) / total);
    const denominator = 1 + z2 / total;
    const score = Math.max(0, numerator / denominator);
    return Math.round(score * 100);
  }

  /**
   * Scan historical candles and populate the pattern database
   */
  public analyzeCandles(
    bars: Candle[],
    timeframe: '1m' | '5m',
    gaussianData: (number | null)[],
    vwmaData: (number | null)[]
  ) {
    if (bars.length < 30) return;

    for (let i = 20; i < bars.length - 10; i++) {
      const prevG = gaussianData[i - 1];
      const prevV = vwmaData[i - 1];
      const curG = gaussianData[i];
      const curV = vwmaData[i];

      if (prevG == null || prevV == null || curG == null || curV == null) continue;

      // Check pattern 1: VWMA cross below Gaussian (V1 Setup)
      if (prevV >= prevG && curV < curG) {
        this.evaluateOutcome(
          bars,
          i,
          timeframe,
          'VWMA_GAUSS_DEATH_CROSS',
          'VWMA / Gaussian Düşüş Kesişimi (V1)',
          'SHORT'
        );
      }

      // Check pattern 2: Bullish rebound when Close bounces off Gaussian
      if (bars[i - 1].low <= curG && bars[i].close > curG && curV > curG) {
        this.evaluateOutcome(
          bars,
          i,
          timeframe,
          'GAUSS_BOUNCE_UP',
          'Gaussian Dinamik Destek Sıçraması',
          'LONG'
        );
      }

      // Check pattern 3: Volume surge breakdown
      const avgVol = (bars[i - 1].volume + bars[i - 2].volume + bars[i - 3].volume) / 3;
      if (bars[i].volume > avgVol * 1.8 && bars[i].close < bars[i].open && curV < curG) {
        this.evaluateOutcome(
          bars,
          i,
          timeframe,
          'HIGH_VOL_BREAKDOWN',
          'Hacimli Kırılım + Ayı Baskısı',
          'SHORT'
        );
      }
    }

    this.saveToStorage();
  }

  private evaluateOutcome(
    bars: Candle[],
    idx: number,
    timeframe: '1m' | '5m',
    patternId: string,
    patternName: string,
    direction: 'LONG' | 'SHORT'
  ) {
    const entryBar = bars[idx];
    if (!entryBar || entryBar.close <= 0) return;

    const eventId = `${timeframe}:${patternId}:${entryBar.time}`;
    if (this.evaluatedEvents.has(eventId)) return;
    this.evaluatedEvents.add(eventId);

    const entryPrice = entryBar.close;

    const horizon = 10;
    let maxFavorable = 0;
    let maxAdverse = 0;

    for (let h = 1; h <= horizon; h++) {
      const b = bars[idx + h];
      if (!b) break;

      if (direction === 'SHORT') {
        const gain = ((entryPrice - b.low) / entryPrice) * 100;
        const loss = ((b.high - entryPrice) / entryPrice) * 100;
        if (gain > maxFavorable) maxFavorable = gain;
        if (loss > maxAdverse) maxAdverse = loss;
      } else {
        const gain = ((b.high - entryPrice) / entryPrice) * 100;
        const loss = ((entryPrice - b.low) / entryPrice) * 100;
        if (gain > maxFavorable) maxFavorable = gain;
        if (loss > maxAdverse) maxAdverse = loss;
      }
    }

    const endBar = bars[idx + horizon] || bars[bars.length - 1];
    const finalReturn =
      direction === 'SHORT'
        ? ((entryPrice - endBar.close) / entryPrice) * 100
        : ((endBar.close - entryPrice) / entryPrice) * 100;

    const isWin = finalReturn > 0.15; // > +0.15% profit after fees

    const key = `${timeframe}:${patternId}`;
    let record = this.patterns.get(key);

    if (!record) {
      record = {
        key,
        name: patternName,
        timeframe,
        count: 0,
        wins: 0,
        losses: 0,
        wilsonScore: 0,
        ret10: 0,
        mfe: 0,
        mae: 0,
        status: 'wait',
        recentReturns: []
      };
      this.patterns.set(key, record);
    }

    record.count++;
    if (isWin) record.wins++;
    else record.losses++;

    record.wilsonScore = this.calculateWilsonScore(record.wins, record.count);

    if (!record.recentReturns) record.recentReturns = [];
    record.recentReturns.push(finalReturn);
    if (record.recentReturns.length > 50) record.recentReturns.shift();

    const sumRet = record.recentReturns.reduce((acc, r) => acc + r, 0);
    record.ret10 = parseFloat((sumRet / record.recentReturns.length).toFixed(2));

    record.mfe = parseFloat(((record.mfe * (record.count - 1) + maxFavorable) / record.count).toFixed(2));
    record.mae = parseFloat(((record.mae * (record.count - 1) + maxAdverse) / record.count).toFixed(2));

    if (record.count < 6) {
      record.status = 'wait';
    } else if (record.wilsonScore >= 45 && record.ret10 > 0.1) {
      record.status = 'good';
    } else {
      record.status = 'bad';
    }
  }

  public getAllPatterns(): PatternRecord[] {
    return Array.from(this.patterns.values()).sort((a, b) => b.wilsonScore - a.wilsonScore);
  }

  public exportJson(): string {
    return JSON.stringify(Array.from(this.patterns.values()), null, 2);
  }

  public importJson(jsonStr: string): boolean {
    try {
      const parsed: PatternRecord[] = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) {
        parsed.forEach((p) => {
          if (p.key && p.name) this.patterns.set(p.key, p);
        });
        this.saveToStorage();
        return true;
      }
    } catch {}
    return false;
  }
}

export const patternPoolService = new PatternPoolService();
