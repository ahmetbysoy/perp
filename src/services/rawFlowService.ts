import { RawFlowMetrics, OrderbookData, StrategyChain } from '../types';

interface TradeRecord {
  time: number;
  qty: number;
  price: number;
  isBuyerMaker: boolean; // true = taker sell (hit bid), false = taker buy (lift ask)
}

interface LiquidationRecord {
  time: number;
  side: 'BUY' | 'SELL';
  sizeUsd: number;
}

class RawFlowService {
  private trades60s: TradeRecord[] = [];
  private liquidations60s: LiquidationRecord[] = [];
  private openInterest: number = 0;
  private previousOi: number = 0;
  private oiChangePct: number = 0;
  private fundingRate: number = 0.0001; // default 0.01%
  private lastOiFetch: number = 0;
  private whaleEvents: { time: number; type: 'BUY' | 'SELL'; sizeUsd: number; price: number }[] = [];
  private activeSymbol: string = 'BTCUSDT';

  public setSymbol(sym: string) {
    if (this.activeSymbol !== sym) {
      this.activeSymbol = sym;
      this.trades60s = [];
      this.liquidations60s = [];
      this.whaleEvents = [];
      this.previousOi = 0;
      this.fetchOiAndFunding();
    }
  }

  /**
   * Ingest real-time trade event from @aggTrade WebSocket
   */
  public pushTrade(price: number, qty: number, isBuyerMaker: boolean, timeMs: number = Date.now()) {
    const record: TradeRecord = {
      time: timeMs,
      qty,
      price,
      isBuyerMaker
    };
    this.trades60s.push(record);

    const sizeUsd = price * qty;
    if (sizeUsd >= 150000) {
      // Large whale trade
      this.whaleEvents.push({
        time: timeMs,
        type: isBuyerMaker ? 'SELL' : 'BUY',
        sizeUsd,
        price
      });
      if (this.whaleEvents.length > 20) this.whaleEvents.shift();
    }

    // Prune older than 60s
    const cutoff = timeMs - 60000;
    while (this.trades60s.length && this.trades60s[0].time < cutoff) {
      this.trades60s.shift();
    }
  }

  /**
   * Ingest liquidation event
   */
  public pushLiquidation(side: 'BUY' | 'SELL', sizeUsd: number, timeMs: number = Date.now()) {
    this.liquidations60s.push({ time: timeMs, side, sizeUsd });
    const cutoff = timeMs - 60000;
    while (this.liquidations60s.length && this.liquidations60s[0].time < cutoff) {
      this.liquidations60s.shift();
    }
  }

  /**
   * Fetch live Open Interest and Funding Rate from Binance Futures REST API
   */
  public async fetchOiAndFunding() {
    const now = Date.now();
    if (now - this.lastOiFetch < 12000) return; // rate limit friendly
    this.lastOiFetch = now;

    try {
      const sym = this.activeSymbol.toUpperCase();
      const [oiRes, fundRes] = await Promise.allSettled([
        fetch(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${sym}`),
        fetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${sym}`)
      ]);

      if (oiRes.status === 'fulfilled' && oiRes.value.ok) {
        const oiJson = await oiRes.value.json();
        const currentOi = parseFloat(oiJson.openInterest) || 0;
        if (this.previousOi > 0) {
          this.oiChangePct = ((currentOi - this.previousOi) / this.previousOi) * 100;
        } else {
          this.oiChangePct = 0;
        }
        this.previousOi = this.openInterest || currentOi;
        this.openInterest = currentOi;
      }

      if (fundRes.status === 'fulfilled' && fundRes.value.ok) {
        const fundJson = await fundRes.value.json();
        this.fundingRate = parseFloat(fundJson.lastFundingRate) || 0.0001;
      }
    } catch {
      // Fallback grace
    }
  }

  /**
   * Compute comprehensive Layer 2 Raw Flow metrics
   */
  public computeMetrics(
    orderbook: OrderbookData | null,
    activeChain: StrategyChain | null,
    currentPrice: number | null
  ): RawFlowMetrics {
    const now = Date.now();
    const cutoff = now - 60000;

    // 1. Calculate CVD 60s
    let cvd60Buy = 0;
    let cvd60Sell = 0;
    for (const t of this.trades60s) {
      if (t.time >= cutoff) {
        const val = t.price * t.qty;
        if (t.isBuyerMaker) {
          cvd60Sell += val;
        } else {
          cvd60Buy += val;
        }
      }
    }
    const cvd60 = cvd60Buy - cvd60Sell;

    // 2. Calculate OBI (Order Book Imbalance)
    let bidDepthUsd = orderbook?.totalBidDepthUsd || 0;
    let askDepthUsd = orderbook?.totalAskDepthUsd || 0;
    let obi = 0;
    if (bidDepthUsd + askDepthUsd > 0) {
      obi = ((bidDepthUsd - askDepthUsd) / (bidDepthUsd + askDepthUsd)) * 100;
    }

    // 3. Liquidations in last 60s
    let liq60LongUsd = 0;
    let liq60ShortUsd = 0;
    for (const l of this.liquidations60s) {
      if (l.time >= cutoff) {
        if (l.side === 'BUY') liq60ShortUsd += l.sizeUsd; // Short was liquidated (forced buy)
        else liq60LongUsd += l.sizeUsd; // Long was liquidated (forced sell)
      }
    }

    // 4. Spread
    let spread = 0;
    let spreadPct = 0;
    if (orderbook && orderbook.bids.length && orderbook.asks.length) {
      const bestBid = orderbook.bids[0][0];
      const bestAsk = orderbook.asks[0][0];
      spread = Math.max(0, bestAsk - bestBid);
      spreadPct = bestBid > 0 ? (spread / bestBid) * 100 : 0;
    }

    // 5. Whale Mode determination
    const recentWhales = this.whaleEvents.filter((w) => w.time >= cutoff);
    let whaleMode = 'Dengeli / Sakin';
    const whaleBuys = recentWhales.filter((w) => w.type === 'BUY').length;
    const whaleSells = recentWhales.filter((w) => w.type === 'SELL').length;

    if (whaleSells > whaleBuys + 1) {
      whaleMode = 'Agresif Satış (Sweep Sell)';
    } else if (whaleBuys > whaleSells + 1) {
      whaleMode = 'Agresif Alış (Sweep Buy)';
    } else if (recentWhales.length > 0) {
      whaleMode = 'Balina Emilimi (Absorption)';
    }

    // 6. Layer 2 Raw Flow Confidence Scoring (0 - 100) & Reasons
    const reasons: string[] = [];
    let score = 50; // base neutral

    const isShortCandidate = !activeChain || activeChain.status === 'acik' || activeChain.status === 'bekliyor';

    if (isShortCandidate) {
      // Evaluating for SHORT
      if (cvd60 < 0) {
        const boost = Math.min(20, Math.round(Math.abs(cvd60) / 50000) * 4);
        score += boost;
        reasons.push(`CVD60 net satıcı baskısı (-$${Math.round(Math.abs(cvd60)).toLocaleString()})`);
      } else {
        score -= 15;
        reasons.push(`CVD60 pozitif alıcı akışı (Short için ters delta)`);
      }

      if (obi < -5) {
        score += 15;
        reasons.push(`OBI satıcı duvarı baskın (%${obi.toFixed(1)})`);
      } else if (obi > 10) {
        score -= 15;
        reasons.push(`OBI alıcı derinliği yüksek (%+${obi.toFixed(1)})`);
      }

      if (this.oiChangePct > 0.05) {
        score += 10;
        reasons.push(`Açık Pozisyon (OI) artıyor (+%${this.oiChangePct.toFixed(2)} yeni likidite)`);
      }

      if (liq60LongUsd > 100000) {
        score += 10;
        reasons.push(`Long likidasyon tetiklendi ($${Math.round(liq60LongUsd).toLocaleString()})`);
      }

      if (this.fundingRate > 0.0003) {
        score += 5;
        reasons.push(`Fonlama yüksek pozitif (+%${(this.fundingRate * 100).toFixed(4)} long primi)`);
      }
    }

    score = Math.max(5, Math.min(98, score));

    let verdict: 'CONFIRM' | 'VETO' | 'WAIT' = 'WAIT';
    if (score >= 68) {
      verdict = 'CONFIRM';
    } else if (score <= 38) {
      verdict = 'VETO';
    } else {
      verdict = 'WAIT';
    }

    return {
      cvd60,
      cvd60Buy,
      cvd60Sell,
      obi,
      bidDepthUsd,
      askDepthUsd,
      openInterest: this.openInterest,
      oiChangePct: this.oiChangePct,
      fundingRate: this.fundingRate,
      liq60LongUsd,
      liq60ShortUsd,
      spread,
      spreadPct,
      whaleMode,
      whaleCount: recentWhales.length,
      rawScore: score,
      verdict,
      reasons
    };
  }
}

export const rawFlowService = new RawFlowService();
