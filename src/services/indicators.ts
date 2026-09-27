import { Candle } from '../types';

/**
 * Exact Pine Script fgaussian() filter:
 * sigmaSq = max(1e-9, bandwidth^2)
 * maxK    = min(499, max(1, ceil(bandwidth * 4.8)))
 * out[i]  = Σ(k=0..maxK) w_k * src[i-1-k] / Σw_k
 * Note: uses i-1-k, which means it depends only on closed past bars (no repaint).
 */
export function fgaussian(srcIn: number[], bandwidth: number): (number | null)[] {
  const sigmaSq = Math.max(1e-9, bandwidth * bandwidth);
  const maxK = Math.min(499, Math.max(1, Math.ceil(bandwidth * 4.8)));
  const out: (number | null)[] = new Array(srcIn.length).fill(null);

  // Precompute kernel weights
  const w = new Float64Array(maxK + 1);
  let sumw = 0;
  for (let k = 0; k <= maxK; k++) {
    w[k] = Math.exp(-(k * k) / (2 * sigmaSq));
    sumw += w[k];
  }

  for (let i = 0; i < srcIn.length; i++) {
    if (i > maxK && i - 1 - maxK >= 0) {
      let sum = 0;
      for (let k = 0; k <= maxK; k++) {
        sum += w[k] * srcIn[i - 1 - k];
      }
      out[i] = sumw > 0 ? sum / sumw : null;
    }
  }
  return out;
}

/**
 * Exact Volume Weighted Moving Average (VWMA):
 * ta.vwma(close, period) = Σ(close * volume) / Σ(volume) over last period bars
 */
export function vwmaCalc(closes: number[], volumes: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(closes.length).fill(null);
  for (let i = period - 1; i < closes.length; i++) {
    let pv = 0;
    let vv = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const v = volumes[j] || 0;
      pv += closes[j] * v;
      vv += v;
    }
    out[i] = vv > 0 ? pv / vv : null;
  }
  return out;
}

/**
 * Price source extractor: close, hl2, hlc3, ohlc4
 */
export function pickSource(bars: Candle[], source: 'close' | 'hl2' | 'hlc3' | 'ohlc4'): number[] {
  return bars.map((b) => {
    switch (source) {
      case 'hl2':
        return (b.high + b.low) / 2;
      case 'hlc3':
        return (b.high + b.low + b.close) / 3;
      case 'ohlc4':
        return (b.open + b.high + b.low + b.close) / 4;
      case 'close':
      default:
        return b.close;
    }
  });
}

export interface IndicatorCross {
  time: number;
  dir: 'up' | 'down';
  price: number;
  barIndex: number;
}

export function findCrosses(g: (number | null)[], v: (number | null)[], bars: Candle[]): IndicatorCross[] {
  const crosses: IndicatorCross[] = [];
  for (let i = 1; i < bars.length; i++) {
    const gi = g[i];
    const vi = v[i];
    const gp = g[i - 1];
    const vp = v[i - 1];
    if (gi == null || vi == null || gp == null || vp == null) continue;

    if (gp <= vp && gi > vi) {
      crosses.push({ time: bars[i].time, dir: 'up', price: gi, barIndex: i });
    } else if (gp >= vp && gi < vi) {
      crosses.push({ time: bars[i].time, dir: 'down', price: gi, barIndex: i });
    }
  }
  return crosses;
}
