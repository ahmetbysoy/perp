import {
  OrderbookLevel,
  OrderbookData,
  LiquidityWall,
  SlippageMatrixItem,
  MevAnalytics
} from '../types';

export class OrderbookService {
  private ws: WebSocket | null = null;
  private currentSymbol: string = '';
  private onDataCallback: ((data: OrderbookData, latencyMs: number) => void) | null = null;
  private isAlive: boolean = false;
  private fallbackTimer: ReturnType<typeof setInterval> | null = null;

  public subscribe(
    symbol: string,
    onData: (data: OrderbookData, latencyMs: number) => void
  ) {
    this.close();
    this.currentSymbol = symbol;
    this.onDataCallback = onData;

    const formattedSymbol = symbol.toLowerCase();
    const wsUrl = `wss://fstream.binance.com/market/ws/${formattedSymbol}@depth20@100ms`;

    let lastPingSend = Date.now();

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isAlive = true;
      };

      this.ws.onmessage = (event) => {
        const receiveTime = Date.now();
        const latencyMs = Math.max(8, receiveTime - lastPingSend);
        lastPingSend = receiveTime;

        try {
          const raw = JSON.parse(event.data);
          if (raw && raw.b && raw.a) {
            const parsed = this.parseBinanceDepth(raw.b, raw.a);
            if (this.onDataCallback) {
              this.onDataCallback(parsed, latencyMs);
            }
          }
        } catch {
          // parse error
        }
      };

      this.ws.onerror = () => {
        this.startFallbackPolling(symbol);
      };

      this.ws.onclose = () => {
        this.isAlive = false;
        this.startFallbackPolling(symbol);
      };
    } catch {
      this.startFallbackPolling(symbol);
    }
  }

  private startFallbackPolling(symbol: string) {
    if (this.fallbackTimer) return;
    this.fallbackTimer = setInterval(async () => {
      try {
        const start = Date.now();
        const res = await fetch(
          `https://fapi.binance.com/fapi/v1/depth?symbol=${symbol.toUpperCase()}&limit=20`
        );
        const latencyMs = Date.now() - start;
        if (!res.ok) return;
        const raw = await res.json();
        if (raw && raw.bids && raw.asks) {
          const parsed = this.parseBinanceDepth(raw.bids, raw.asks);
          if (this.onDataCallback) {
            this.onDataCallback(parsed, latencyMs);
          }
        }
      } catch {}
    }, 1500);
  }

  public parseBinanceDepth(rawBids: string[][], rawAsks: string[][]): OrderbookData {
    const bids: OrderbookLevel[] = rawBids.map((b) => [parseFloat(b[0]), parseFloat(b[1])]);
    const asks: OrderbookLevel[] = rawAsks.map((a) => [parseFloat(a[0]), parseFloat(a[1])]);

    bids.sort((a, b) => b[0] - a[0]); // highest bid first
    asks.sort((a, b) => a[0] - b[0]); // lowest ask first

    const bestBid = bids[0]?.[0] || 0;
    const bestAsk = asks[0]?.[0] || 0;
    const midPrice = bestBid && bestAsk ? (bestBid + bestAsk) / 2 : bestBid || bestAsk;

    let totalBidDepthUsd = 0;
    let totalAskDepthUsd = 0;

    bids.forEach(([p, q]) => (totalBidDepthUsd += p * q));
    asks.forEach(([p, q]) => (totalAskDepthUsd += p * q));

    const totalDepth = totalBidDepthUsd + totalAskDepthUsd;
    const bidDominance = totalDepth > 0 ? (totalBidDepthUsd / totalDepth) * 100 : 50;

    // Detect Liquidity Walls (Significant volume clusters)
    const avgBidVol = bids.length ? bids.reduce((acc, b) => acc + b[1], 0) / bids.length : 1;
    const avgAskVol = asks.length ? asks.reduce((acc, a) => acc + a[1], 0) / asks.length : 1;

    const bidWalls: LiquidityWall[] = bids
      .filter(([_, q]) => q >= avgBidVol * 1.3)
      .slice(0, 5)
      .map(([p, q]) => ({
        price: p,
        volume: q,
        volumeUsd: p * q,
        distancePct: midPrice > 0 ? Number((((midPrice - p) / midPrice) * 100).toFixed(2)) : 0,
        isSupport: true
      }));

    const askWalls: LiquidityWall[] = asks
      .filter(([_, q]) => q >= avgAskVol * 1.3)
      .slice(0, 5)
      .map(([p, q]) => ({
        price: p,
        volume: q,
        volumeUsd: p * q,
        distancePct: midPrice > 0 ? Number((((p - midPrice) / midPrice) * 100).toFixed(2)) : 0,
        isSupport: false
      }));

    return {
      bids,
      asks,
      bidWalls,
      askWalls,
      bidDominance: Number(bidDominance.toFixed(1)),
      totalBidDepthUsd,
      totalAskDepthUsd,
      timestamp: Date.now()
    };
  }

  /**
   * Real Orderbook Walk Algorithm:
   * Simulates filling market orders of specified USD sizes against real bids and asks.
   */
  public calculateSlippageMatrix(orderbook: OrderbookData): SlippageMatrixItem[] {
    const sizes = [10000, 50000, 100000, 250000];
    const { bids, asks } = orderbook;

    if (!bids.length || !asks.length) return [];

    const bestBid = bids[0][0];
    const bestAsk = asks[0][0];

    return sizes.map((sizeUsd) => {
      // 1. Walk Asks for Buy Market Order
      let remainingBuyUsd = sizeUsd;
      let totalBuyCoins = 0;
      let totalSpentUsd = 0;
      let buyWorstPrice = bestAsk;

      for (const [askPrice, askQty] of asks) {
        const levelUsd = askPrice * askQty;
        if (remainingBuyUsd <= levelUsd) {
          const coinsNeeded = remainingBuyUsd / askPrice;
          totalBuyCoins += coinsNeeded;
          totalSpentUsd += remainingBuyUsd;
          buyWorstPrice = askPrice;
          remainingBuyUsd = 0;
          break;
        } else {
          totalBuyCoins += askQty;
          totalSpentUsd += levelUsd;
          remainingBuyUsd -= levelUsd;
          buyWorstPrice = askPrice;
        }
      }

      // If orderbook isn't deep enough, extrapolate
      if (remainingBuyUsd > 0 && buyWorstPrice > 0) {
        const extraCoins = remainingBuyUsd / (buyWorstPrice * 1.01);
        totalBuyCoins += extraCoins;
        totalSpentUsd += remainingBuyUsd;
        buyWorstPrice = buyWorstPrice * 1.01;
      }

      const buyAvgPrice = totalBuyCoins > 0 ? totalSpentUsd / totalBuyCoins : bestAsk;
      const buySlippagePct = bestAsk > 0 ? ((buyAvgPrice - bestAsk) / bestAsk) * 100 : 0;

      // 2. Walk Bids for Sell Market Order
      let remainingSellUsd = sizeUsd;
      let totalSellCoins = 0;
      let totalReceivedUsd = 0;
      let sellWorstPrice = bestBid;

      for (const [bidPrice, bidQty] of bids) {
        const levelUsd = bidPrice * bidQty;
        if (remainingSellUsd <= levelUsd) {
          const coinsNeeded = remainingSellUsd / bidPrice;
          totalSellCoins += coinsNeeded;
          totalReceivedUsd += remainingSellUsd;
          sellWorstPrice = bidPrice;
          remainingSellUsd = 0;
          break;
        } else {
          totalSellCoins += bidQty;
          totalReceivedUsd += levelUsd;
          remainingSellUsd -= levelUsd;
          sellWorstPrice = bidPrice;
        }
      }

      if (remainingSellUsd > 0 && sellWorstPrice > 0) {
        const extraCoins = remainingSellUsd / (sellWorstPrice * 0.99);
        totalSellCoins += extraCoins;
        totalReceivedUsd += remainingSellUsd;
        sellWorstPrice = sellWorstPrice * 0.99;
      }

      const sellAvgPrice = totalSellCoins > 0 ? totalReceivedUsd / totalSellCoins : bestBid;
      const sellSlippagePct = bestBid > 0 ? ((bestBid - sellAvgPrice) / bestBid) * 100 : 0;

      return {
        sizeUsd,
        buySlippagePct: Number(buySlippagePct.toFixed(2)),
        sellSlippagePct: Number(sellSlippagePct.toFixed(2)),
        buyWorstPrice: Number(buyWorstPrice.toFixed(2)),
        sellWorstPrice: Number(sellWorstPrice.toFixed(2)),
        buyAvgPrice: Number(buyAvgPrice.toFixed(2)),
        sellAvgPrice: Number(sellAvgPrice.toFixed(2))
      };
    });
  }

  /**
   * Evaluates MEV / Frontrun risk based on depth density and 100k slippage
   */
  public evaluateMevRisk(orderbook: OrderbookData): MevAnalytics {
    const slippageMatrix = this.calculateSlippageMatrix(orderbook);
    const slip100k = slippageMatrix.find((s) => s.sizeUsd === 100000) || slippageMatrix[2];
    const avgSlippage = slip100k ? (slip100k.buySlippagePct + slip100k.sellSlippagePct) / 2 : 0.08;

    // Risk score 0 - 100%
    let score = Math.min(95, Math.max(12, Math.round(avgSlippage * 220 + (100 - orderbook.bidDominance) * 0.2)));
    if (orderbook.totalBidDepthUsd < 200000 || orderbook.totalAskDepthUsd < 200000) {
      score = Math.min(98, score + 25);
    }

    let riskLevel: 'LOW' | 'ELEVATED' | 'CRITICAL' = 'LOW';
    let recommendation = 'Likidite derinliği yüksek. $50K altı piyasa emirlerinde slippage riski minimal.';

    if (score >= 65) {
      riskLevel = 'CRITICAL';
      recommendation =
        'YÜKSEK RİSK: Tahta derinliği sığ. Piyasa emri yerine limit emir veya TWAP algoritması kullanın!';
    } else if (score >= 35) {
      riskLevel = 'ELEVATED';
      recommendation =
        'ORTA RİSK: $50K üzeri tek parça piyasa emirlerinde kayma riski mevcut. Kademeli emir önerilir.';
    }

    // Simulation for $100K victim order
    const victimSlippageLossUsd = 100000 * (avgSlippage / 100);
    const estimatedMevProfitUsd = victimSlippageLossUsd * 0.72; // net of fees & gas

    return {
      frontrunRiskScore: score,
      riskLevel,
      recommendation,
      slippageMatrix,
      sandwichSimulation: {
        estimatedMevProfitUsd: Number(estimatedMevProfitUsd.toFixed(2)),
        victimSlippageLossUsd: Number(victimSlippageLossUsd.toFixed(2))
      }
    };
  }

  public close() {
    if (this.ws) {
      try {
        this.ws.onclose = null;
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    if (this.fallbackTimer) {
      clearInterval(this.fallbackTimer);
      this.fallbackTimer = null;
    }
    this.isAlive = false;
    this.onDataCallback = null;
  }
}

export const orderbookService = new OrderbookService();
