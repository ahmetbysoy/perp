import { Candle, StrategyChain, BacktestStats } from '../types';

/**
 * SATIŞ1 State Machine & Strategy Engine:
 * 1) Turuncu (VWMA) yeşilin (Gaussian) altına indiğinde -> Bar kapanışında V1 tespit edilir.
 * 2) V1 mumunun KAPANIŞ fiyatına sağa doğru Siyah Yatay Seviye (Işın) çizilir.
 * 3) Turuncu çizgi bu siyah seviyeyi kestiğinde -> V2 dikey çizgisi oluşur.
 * 4) V2 mumunun AÇILIŞ fiyatından SATIŞ1 (Short) aktif olur.
 * 5) TP DİNAMİK: Fiyat (düşük iğne veya kapanış) yeşil Gaussian çizgisine temas ettiğinde -> Dinamik TP gerçekleşir.
 */
export function detectStrategy(
  bars: Candle[],
  g: (number | null)[],
  v: (number | null)[],
  isLiveBarClosed: boolean = false
): { chains: StrategyChain[]; stats: BacktestStats } {
  const chains: StrategyChain[] = [];
  if (bars.length < 5) {
    return { chains: [], stats: emptyStats() };
  }

  // Determine the max bar index that is fully closed
  const lastClosedIdx = isLiveBarClosed ? bars.length - 1 : bars.length - 2;

  let n = 0;
  let activeChainIndex: number = -1;

  for (let i = 1; i < bars.length; i++) {
    const gi = g[i];
    const vi = v[i];
    const gp = g[i - 1];
    const vp = v[i - 1];
    if (gi == null || vi == null || gp == null || vp == null) continue;

    // Rule 1: VWMA (turuncu) crosses below Gaussian (yeşil)
    const isV1Cross = vp >= gp && vi < gi;

    if (isV1Cross) {
      // Repaint protection: V1 is confirmed only if bar is closed
      const isConfirmed = i <= lastClosedIdx;

      // Do not spawn overlapping duplicate V1 if previous chain is still pending on immediate adjacent bar
      if (
        activeChainIndex >= 0 &&
        chains[activeChainIndex].status === 'bekliyor' &&
        i - chains[activeChainIndex].v1Bar < 3
      ) {
        // keep existing or update
        continue;
      }

      n++;
      const ch: StrategyChain = {
        id: n,
        v1Bar: i,
        v1Time: bars[i].time,
        level: bars[i].close,
        v2Bar: -1,
        v2Time: null,
        sellPrice: null,
        tpBar: -1,
        tpTime: null,
        tpPrice: null,
        status: 'bekliyor',
        pnlPct: 0,
        durationBars: 0,
        isConfirmed
      };

      chains.push(ch);
      activeChainIndex = chains.length - 1;
    }

    // Process active chains
    for (let cIdx = 0; cIdx < chains.length; cIdx++) {
      const ch = chains[cIdx];

      // Step A: Waiting for V2 (VWMA crossing ch.level)
      if (ch.status === 'bekliyor' && i > ch.v1Bar) {
        const prevV = v[i - 1];
        const currV = v[i];
        if (prevV != null && currV != null) {
          const d0 = prevV - ch.level;
          const d1 = currV - ch.level;
          const crossedLevel = (d0 <= 0 && d1 > 0) || (d0 >= 0 && d1 < 0) || d1 === 0;

          if (crossedLevel) {
            ch.v2Bar = i;
            ch.v2Time = bars[i].time;
            ch.sellPrice = bars[i].open; // Rule 4: SATIŞ1 = V2 bar opening price
            ch.status = 'acik';
            continue;
          }
        }
      }

      // Step B: Position open -> Monitor for Dynamic TP (Price touches Gaussian)
      if (ch.status === 'acik' && ch.sellPrice != null && ch.v2Bar >= 0 && i >= ch.v2Bar) {
        const currG = g[i];
        if (currG != null) {
          // For a SHORT position, TP is hit if low touches or falls below Gaussian
          // or if close crosses Gaussian
          const barLow = bars[i].low;
          const barClose = bars[i].close;

          const isTpHit = barLow <= currG || barClose <= currG;

          if (isTpHit && i > ch.v2Bar) {
            ch.tpBar = i;
            ch.tpTime = bars[i].time;
            ch.tpPrice = currG;
            ch.status = 'tp';
            ch.pnlPct = ((ch.sellPrice - currG) / ch.sellPrice) * 100;
            ch.durationBars = ch.tpBar - ch.v2Bar;
          } else {
            // Live unrealized PnL based on current close
            ch.pnlPct = ((ch.sellPrice - bars[i].close) / ch.sellPrice) * 100;
            ch.durationBars = i - ch.v2Bar;
          }
        }
      }
    }
  }

  const stats = calculateBacktestStats(chains, bars);
  return { chains, stats };
}

function emptyStats(): BacktestStats {
  return {
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
  };
}

export function calculateBacktestStats(chains: StrategyChain[], bars: Candle[]): BacktestStats {
  if (!chains.length) return emptyStats();

  let tpCount = 0;
  let activeSignals = 0;
  let pendingCount = 0;
  let closedPnls: number[] = [];
  let cumPnl = 0;
  let peakPnl = 0;
  let maxDd = 0;
  let best = -Infinity;
  let worst = Infinity;

  chains.forEach((ch) => {
    if (ch.status === 'tp' && ch.sellPrice != null && ch.tpPrice != null) {
      tpCount++;
      const pnl = ch.pnlPct;
      closedPnls.push(pnl);
      cumPnl += pnl;
      if (cumPnl > peakPnl) peakPnl = cumPnl;
      const dd = peakPnl - cumPnl;
      if (dd > maxDd) maxDd = dd;
      if (pnl > best) best = pnl;
      if (pnl < worst) worst = pnl;
    } else if (ch.status === 'acik') {
      activeSignals++;
      if (bars.length && ch.sellPrice != null) {
        const lastBar = bars[bars.length - 1];
        const unrlPnl = ((ch.sellPrice - lastBar.close) / ch.sellPrice) * 100;
        ch.pnlPct = unrlPnl;
      }
    } else if (ch.status === 'bekliyor') {
      pendingCount++;
    }
  });

  const totalExecuted = tpCount + activeSignals;
  const winRate = totalExecuted > 0 ? (tpCount / totalExecuted) * 100 : 0;
  const avgPnl = closedPnls.length ? closedPnls.reduce((a, b) => a + b, 0) / closedPnls.length : 0;

  return {
    totalSignals: chains.length,
    activeSignals,
    tpCount,
    pendingCount,
    winRate,
    avgPnlPct: avgPnl,
    cumulativePnlPct: cumPnl,
    maxDrawdownPct: maxDd,
    bestTradePct: best === -Infinity ? 0 : best,
    worstTradePct: worst === Infinity ? 0 : worst
  };
}
