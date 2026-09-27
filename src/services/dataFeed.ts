import { Candle, Interval, MarketInfo, TickerData, ConnectionStatus } from '../types';

export const INTERVAL_SEC: Record<Interval, number> = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '30m': 1800,
  '1h': 3600,
  '4h': 14400,
  '12h': 43200,
  '1d': 86400
};

export const INTERVALS: Interval[] = ['1m', '5m', '15m', '30m', '1h', '4h', '12h', '1d'];

export function tickDecimals(tick: string | number | null | undefined): number | null {
  if (tick == null) return null;
  const s = String(tick).trim().toLowerCase();
  if (!s) return null;
  if (s.includes('e')) {
    const v = parseFloat(s);
    if (!isFinite(v) || v <= 0) return null;
    return tickDecimals(v.toFixed(12).replace(/0+$/, ''));
  }
  const dot = s.indexOf('.');
  if (dot < 0) return 0;
  const frac = s.slice(dot + 1).replace(/0+$/, '');
  return Math.max(0, Math.min(12, frac.length));
}

export function smartDecimals(p: number | null | undefined): number {
  if (p == null || !isFinite(p)) return 2;
  const a = Math.abs(p);
  if (a >= 1000) return 1;
  if (a >= 100) return 2;
  if (a >= 1) return 4;
  if (a >= 0.01) return 5;
  if (a >= 0.0001) return 7;
  if (a >= 0.000001) return 9;
  return 11;
}

export function fmtPrice(v: number | null | undefined, decimals?: number, locale: string = 'tr-TR'): string {
  if (v == null || !isFinite(v)) return '—';
  const d = decimals == null ? smartDecimals(v) : Math.max(0, Math.min(12, Math.floor(decimals)));
  return v.toLocaleString(locale, {
    minimumFractionDigits: d,
    maximumFractionDigits: d
  });
}

export function fmtPct(v: number | null | undefined): string {
  if (v == null || !isFinite(v)) return '—';
  return (v >= 0 ? '+' : '') + v.toFixed(2) + '%';
}

/**
 * Binary search for candle at exact timestamp or nearest bar:
 * Replaces O(N) linear search on crosshair move with O(log N) lookup
 */
export function binarySearchBar(bars: Candle[], targetTime: number): Candle | null {
  if (!bars.length) return null;
  let low = 0;
  let high = bars.length - 1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    const bar = bars[mid];
    if (bar.time === targetTime) {
      return bar;
    } else if (bar.time < targetTime) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  // If exact not found, return nearest within threshold
  if (low < bars.length && Math.abs(bars[low].time - targetTime) <= 60) {
    return bars[low];
  }
  if (high >= 0 && Math.abs(bars[high].time - targetTime) <= 60) {
    return bars[high];
  }
  return null;
}

// Built-in Seed Data for instant fallback demo
export const SEED_DATA: Record<string, { p: number; c: number }> = {
  BTC: { p: 89450.0, c: 1.45 },
  ETH: { p: 2715.3, c: -0.22 },
  SOL: { p: 135.8, c: 3.12 },
  BNB: { p: 589.4, c: 0.85 },
  XRP: { p: 1.542, c: -1.25 },
  DOGE: { p: 0.184, c: 4.8 },
  AVAX: { p: 22.45, c: 2.1 },
  LINK: { p: 15.65, c: 0.95 },
  SUI: { p: 2.34, c: 5.4 },
  PEPE: { p: 0.00000892, c: 6.2 },
  SHIB: { p: 0.0000142, c: 1.1 },
  NEAR: { p: 5.12, c: -2.3 }
};

export interface DataFeedCallback {
  onCandle: (candle: Candle, isFinal: boolean) => void;
  onTicker: (ticker: TickerData) => void;
  onTick?: (price: number, quantity: number) => void;
  onStatus: (status: ConnectionStatus) => void;
}

export interface IDataProvider {
  name: string;
  key: string;
  markets: MarketInfo[];
  init(): Promise<void>;
  fetchKlines(key: string, interval: Interval, limit?: number): Promise<Candle[]>;
  fetchTicker(key: string): Promise<TickerData>;
  fetchAllTickers(): Promise<Record<string, { last: number; changePct: number; quoteVol?: number }>>;
  subscribe(key: string, interval: Interval, cb: DataFeedCallback): void;
  close(): void;
}

const TIMEOUT = (ms = 12000) => {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  return { signal: c.signal, done: () => clearTimeout(t) };
};

async function jfetch<T = unknown>(url: string, ms = 12000): Promise<T> {
  const { signal, done } = TIMEOUT(ms);
  try {
    const r = await fetch(url, { signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return (await r.json()) as T;
  } finally {
    done();
  }
}

const WS_BASES = [
  'wss://fstream.binance.com/market/ws',
  'wss://fstream.binance.com/ws'
];

class RobustWsLink {
  private urlFn: (baseIdx: number) => string;
  private onMsg: (data: string) => void;
  private onStatus: (status: { state: 'open' | 'retry' | 'closed'; url: string; delay?: number }) => void;
  private onOpen?: (ws: WebSocket) => void;
  private pingPayload?: string;

  private ws: WebSocket | null = null;
  private gen: number = 0;
  private baseIdx: number = 0;
  private retry: number = 0;
  private lastMsgTime: number = 0;
  private isAlive: boolean = false;
  private watcher: ReturnType<typeof setInterval> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private closedExplicitly: boolean = false;

  constructor(opts: {
    url: (baseIdx: number) => string;
    onMsg: (data: string) => void;
    onStatus: (status: { state: 'open' | 'retry' | 'closed'; url: string; delay?: number }) => void;
    onOpen?: (ws: WebSocket) => void;
    pingPayload?: string;
  }) {
    this.urlFn = opts.url;
    this.onMsg = opts.onMsg;
    this.onStatus = opts.onStatus;
    this.onOpen = opts.onOpen;
    this.pingPayload = opts.pingPayload;
  }

  public connect() {
    this.closedExplicitly = false;
    const currentGen = ++this.gen;

    if (this.ws) {
      try {
        this.ws.onclose = null;
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    const targetUrl = this.urlFn(this.baseIdx);
    let ws: WebSocket;
    try {
      ws = new WebSocket(targetUrl);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws = ws;

    ws.onopen = () => {
      if (currentGen !== this.gen) return;
      this.retry = 0;
      this.isAlive = true;
      this.lastMsgTime = Date.now();

      if (this.pingPayload) {
        clearInterval(this.pingTimer!);
        this.pingTimer = setInterval(() => {
          try {
            if (ws.readyState === WebSocket.OPEN) ws.send(this.pingPayload!);
          } catch {}
        }, 25000);
      }

      if (this.onOpen) {
        try {
          this.onOpen(ws);
        } catch {}
      }

      this.onStatus({ state: 'open', url: targetUrl });
    };

    ws.onmessage = (ev) => {
      if (currentGen !== this.gen) return;
      this.lastMsgTime = Date.now();
      this.onMsg(ev.data);
    };

    ws.onclose = () => {
      if (currentGen !== this.gen || this.closedExplicitly) return;
      this.isAlive = false;
      this.scheduleReconnect();
    };

    ws.onerror = () => {
      try {
        ws.close();
      } catch {}
    };

    if (!this.watcher) {
      this.watcher = setInterval(() => {
        if (this.isAlive && this.lastMsgTime && Date.now() - this.lastMsgTime > 15000) {
          try {
            this.ws?.close();
          } catch {}
        }
      }, 5000);
    }
  }

  private scheduleReconnect() {
    const delay = Math.min(30000, 1000 * Math.pow(2, this.retry++));
    this.baseIdx++;
    clearTimeout(this.retryTimer!);
    const nextUrl = this.urlFn(this.baseIdx);
    this.onStatus({ state: 'retry', delay, url: nextUrl });
    this.retryTimer = setTimeout(() => this.connect(), delay);
  }

  public close() {
    this.closedExplicitly = true;
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.watcher) {
      clearInterval(this.watcher);
      this.watcher = null;
    }
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.onclose = null;
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.isAlive = false;
  }
}

/**
 * Binance Futures Provider
 */
export class BinanceProvider implements IDataProvider {
  public name = 'Binance Futures';
  public key = 'binance';
  public markets: MarketInfo[] = [];

  private links: RobustWsLink[] = [];
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private activeCallback: DataFeedCallback | null = null;

  async init(): Promise<void> {
    interface BinanceExchangeInfo {
      symbols: Array<{
        symbol: string;
        contractType: string;
        baseAsset: string;
        quoteAsset: string;
        status: string;
        pricePrecision?: number;
        filters?: Array<{ filterType: string; tickSize?: string }>;
      }>;
    }
    const info = await jfetch<BinanceExchangeInfo>('https://fapi.binance.com/fapi/v1/exchangeInfo');
    this.markets = info.symbols
      .filter((s) => s.contractType === 'PERPETUAL' && s.quoteAsset === 'USDT' && s.status === 'TRADING')
      .map((s) => {
        const tf = (s.filters || []).find((f) => f.filterType === 'PRICE_FILTER');
        return {
          key: s.baseAsset + 'USDT',
          native: s.symbol,
          base: s.baseAsset,
          quote: 'USDT',
          precision: s.pricePrecision != null ? s.pricePrecision : (tickDecimals(tf?.tickSize) ?? 2),
          tickSize: tf?.tickSize || null
        };
      });

    if (!this.markets.length) throw new Error('Binance: Market bulunamadı');
  }

  private getMarket(key: string): MarketInfo | undefined {
    return this.markets.find((m) => m.key === key);
  }

  async fetchKlines(key: string, interval: Interval, limit = 500): Promise<Candle[]> {
    const m = this.getMarket(key);
    if (!m) throw new Error('Sembol bulunamadı: ' + key);
    type RawKline = [number, string, string, string, string, string, ...unknown[]];
    const raw = await jfetch<RawKline[]>(
      `https://fapi.binance.com/fapi/v1/klines?symbol=${m.native}&interval=${interval}&limit=${limit}`
    );
    return raw.map((k) => ({
      time: Math.floor(k[0] / 1000),
      open: +k[1],
      high: +k[2],
      low: +k[3],
      close: +k[4],
      volume: +k[5]
    }));
  }

  async fetchTicker(key: string): Promise<TickerData> {
    const m = this.getMarket(key);
    if (!m) throw new Error('Sembol bulunamadı');
    interface RawTicker {
      lastPrice: string;
      priceChangePercent: string;
      highPrice: string;
      lowPrice: string;
      quoteVolume: string;
    }
    const t = await jfetch<RawTicker>(`https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=${m.native}`);
    return {
      last: +t.lastPrice,
      changePct: +t.priceChangePercent,
      high: +t.highPrice,
      low: +t.lowPrice,
      quoteVol: +t.quoteVolume
    };
  }

  async fetchAllTickers(): Promise<Record<string, { last: number; changePct: number; quoteVol?: number }>> {
    interface RawTicker {
      symbol: string;
      lastPrice: string;
      priceChangePercent: string;
      quoteVolume: string;
    }
    const arr = await jfetch<RawTicker[]>('https://fapi.binance.com/fapi/v1/ticker/24hr');
    const map: Record<string, { last: number; changePct: number; quoteVol?: number }> = {};
    for (const t of arr) {
      map[t.symbol] = {
        last: +t.lastPrice,
        changePct: +t.priceChangePercent,
        quoteVol: +t.quoteVolume
      };
    }
    return map;
  }

  subscribe(key: string, interval: Interval, cb: DataFeedCallback): void {
    this.close();
    this.activeCallback = cb;
    const m = this.getMarket(key);
    if (!m) return;
    const s = m.native.toLowerCase();

    const parseMessage = (raw: string) => {
      let d: Record<string, any>;
      try {
        d = JSON.parse(raw);
      } catch {
        return;
      }
      if (d && d.data) d = d.data;

      // 1. Kline stream event
      if (d && d.e === 'kline' && d.k) {
        const k = d.k;
        cb.onCandle(
          {
            time: Math.floor(k.t / 1000),
            open: +k.o,
            high: +k.h,
            low: +k.l,
            close: +k.c,
            volume: +k.v
          },
          !!k.x
        );
      }
      // 2. aggTrade / trade tick-by-tick event
      else if (d && (d.e === 'aggTrade' || d.e === 'trade')) {
        const p = parseFloat(d.p);
        const q = parseFloat(d.q);
        if (isFinite(p)) {
          cb.onTick?.(p, q);
        }
      }
      // 3. 24hr Ticker event
      else if (d && d.c != null && d.P != null) {
        cb.onTicker({
          last: +d.c,
          changePct: +d.P
        });
      }
    };

    const getRotatedBase = (idx: number) => WS_BASES[idx % WS_BASES.length];

    // Single combined stream on /market/ws for kline, ticker, and aggTrade
    const linkCombined = new RobustWsLink({
      url: (i) => `${getRotatedBase(i)}/${s}@kline_${interval}/${s}@ticker/${s}@aggTrade`,
      onMsg: parseMessage,
      onStatus: (st) => {
        cb.onStatus({
          state: st.state === 'open' ? 'open' : st.state === 'retry' ? 'retry' : 'closed',
          url: st.url,
          delay: st.delay,
          providerName: this.name,
          isFallback: false
        });
      }
    });

    this.links = [linkCombined];
    linkCombined.connect();

    // Responsive 10s REST poll fallback in case WS disconnects
    this.pollTimer = setInterval(async () => {
      try {
        const t = await this.fetchTicker(key);
        cb.onTicker(t);
      } catch {}
    }, 10000);
  }

  close(): void {
    for (const link of this.links) {
      try {
        link.close();
      } catch {}
    }
    this.links = [];
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.activeCallback = null;
  }
}

/**
 * OKX Provider
 */
export class OKXProvider implements IDataProvider {
  public name = 'OKX Futures';
  public key = 'okx';
  public markets: MarketInfo[] = [];

  private links: RobustWsLink[] = [];

  async init(): Promise<void> {
    interface OKXInstrumentResponse {
      data?: Array<{
        instId: string;
        settleCcy: string;
        state: string;
        tickSz?: string;
      }>;
    }
    const res = await jfetch<OKXInstrumentResponse>('https://www.okx.com/api/v5/public/instruments?instType=SWAP');
    this.markets = (res.data || [])
      .filter((i) => i.settleCcy === 'USDT' && i.state === 'live' && i.instId.endsWith('-USDT-SWAP'))
      .map((i) => {
        const base = i.instId.replace('-USDT-SWAP', '');
        return {
          key: base + 'USDT',
          native: i.instId,
          base,
          quote: 'USDT',
          precision: tickDecimals(i.tickSz) ?? smartDecimals(parseFloat(i.tickSz || '1')),
          tickSize: i.tickSz || null
        };
      });

    if (!this.markets.length) throw new Error('OKX: Market bulunamadı');
  }

  private getMarket(key: string): MarketInfo | undefined {
    return this.markets.find((m) => m.key === key);
  }

  private okxBar(interval: Interval): string {
    const map: Record<Interval, string> = {
      '1m': '1m',
      '5m': '5m',
      '15m': '15m',
      '30m': '30m',
      '1h': '1H',
      '4h': '4H',
      '12h': '12H',
      '1d': '1D'
    };
    return map[interval] || '1m';
  }

  async fetchKlines(key: string, interval: Interval, limit = 500): Promise<Candle[]> {
    const m = this.getMarket(key);
    if (!m) throw new Error('Sembol bulunamadı: ' + key);
    const bar = this.okxBar(interval);

    interface OKXCandleResponse {
      data?: string[][];
    }

    const parseRow = (k: string[]): Candle => ({
      time: Math.floor(+k[0] / 1000),
      open: +k[1],
      high: +k[2],
      low: +k[3],
      close: +k[4],
      volume: +k[5]
    });

    const raw = await jfetch<OKXCandleResponse>(
      `https://www.okx.com/api/v5/market/candles?instId=${m.native}&bar=${bar}&limit=300`
    );
    let rows: Candle[] = (raw.data || []).map(parseRow);
    rows.reverse();

    while (rows.length < limit) {
      const oldest = rows.length ? rows[0].time * 1000 : Date.now();
      const hist = await jfetch<OKXCandleResponse>(
        `https://www.okx.com/api/v5/market/history-candles?instId=${m.native}&bar=${bar}&after=${oldest}&limit=100`
      );
      if (!hist.data || !hist.data.length) break;
      const older = hist.data.map(parseRow);
      older.reverse();
      if (rows.length && older.length && older[older.length - 1].time >= rows[0].time) break;
      rows = older.concat(rows);
      if (hist.data.length < 100) break;
    }
    return rows.slice(-limit);
  }

  async fetchTicker(key: string): Promise<TickerData> {
    const m = this.getMarket(key);
    if (!m) throw new Error('Sembol bulunamadı');
    interface OKXTickerResponse {
      data?: Array<{
        last: string;
        open24h: string;
        high24h: string;
        low24h: string;
        volCcy24h: string;
      }>;
    }
    const res = await jfetch<OKXTickerResponse>(`https://www.okx.com/api/v5/market/ticker?instId=${m.native}`);
    const t = (res.data || [])[0];
    if (!t) throw new Error('Ticker bulunamadı');
    const open24 = +t.open24h;
    return {
      last: +t.last,
      changePct: open24 ? ((+t.last - open24) / open24) * 100 : 0,
      high: +t.high24h,
      low: +t.low24h,
      quoteVol: +t.volCcy24h * (parseFloat(t.last) || 1)
    };
  }

  async fetchAllTickers(): Promise<Record<string, { last: number; changePct: number; quoteVol?: number }>> {
    interface OKXTickersResponse {
      data?: Array<{
        instId: string;
        last: string;
        open24h: string;
        volCcy24h: string;
      }>;
    }
    const res = await jfetch<OKXTickersResponse>('https://www.okx.com/api/v5/market/tickers?instType=SWAP');
    const map: Record<string, { last: number; changePct: number; quoteVol?: number }> = {};
    for (const t of res.data || []) {
      if (!t.instId.endsWith('-USDT-SWAP')) continue;
      const base = t.instId.replace('-USDT-SWAP', '');
      const open24 = +t.open24h;
      map[base + 'USDT'] = {
        last: +t.last,
        changePct: open24 ? ((+t.last - open24) / open24) * 100 : 0,
        quoteVol: +t.volCcy24h * (parseFloat(t.last) || 1)
      };
    }
    return map;
  }

  subscribe(key: string, interval: Interval, cb: DataFeedCallback): void {
    this.close();
    const m = this.getMarket(key);
    if (!m) return;
    const bar = this.okxBar(interval);

    const onMsg = (data: string) => {
      if (data === 'pong') return;
      let msg: Record<string, any>;
      try {
        msg = JSON.parse(data);
      } catch {
        return;
      }
      if (msg.event) return;
      const ch = msg.arg?.channel;
      if (ch && ch.startsWith('candle')) {
        const k = (msg.data || [])[0];
        if (!k) return;
        cb.onCandle(
          {
            time: Math.floor(+k[0] / 1000),
            open: +k[1],
            high: +k[2],
            low: +k[3],
            close: +k[4],
            volume: +k[5]
          },
          k[8] === '1'
        );
      } else if (ch === 'tickers') {
        const t = (msg.data || [])[0];
        if (!t) return;
        const open24 = +t.open24h;
        cb.onTicker({
          last: +t.last,
          changePct: open24 ? ((+t.last - open24) / open24) * 100 : 0
        });
      } else if (ch === 'trades') {
        const t = (msg.data || [])[0];
        if (t && t.px) {
          const px = parseFloat(t.px);
          const sz = parseFloat(t.sz || '0');
          if (isFinite(px)) {
            cb.onTick?.(px, sz);
          }
        }
      }
    };

    const linkCandle = new RobustWsLink({
      url: () => 'wss://ws.okx.com:8443/ws/v5/business',
      onMsg,
      pingPayload: 'ping',
      onOpen: (ws) => {
        ws.send(JSON.stringify({ op: 'subscribe', args: [{ channel: 'candle' + bar, instId: m.native }] }));
      },
      onStatus: (st) => {
        cb.onStatus({
          state: st.state === 'open' ? 'open' : st.state === 'retry' ? 'retry' : 'closed',
          url: st.url,
          delay: st.delay,
          providerName: this.name,
          isFallback: true
        });
      }
    });

    const linkTicker = new RobustWsLink({
      url: () => 'wss://ws.okx.com:8443/ws/v5/public',
      onMsg,
      pingPayload: 'ping',
      onOpen: (ws) => {
        ws.send(JSON.stringify({
          op: 'subscribe',
          args: [
            { channel: 'tickers', instId: m.native },
            { channel: 'trades', instId: m.native }
          ]
        }));
      },
      onStatus: () => {}
    });

    this.links = [linkCandle, linkTicker];
    linkCandle.connect();
    linkTicker.connect();
  }

  close(): void {
    for (const l of this.links) {
      try {
        l.close();
      } catch {}
    }
    this.links = [];
  }
}

/**
 * Synthetic Demo Provider
 */
export class SyntheticProvider implements IDataProvider {
  public name = 'Demo Sentetik Veri';
  public key = 'synthetic';
  public markets: MarketInfo[] = [];

  private timer: ReturnType<typeof setInterval> | null = null;

  async init(): Promise<void> {
    this.markets = Object.entries(SEED_DATA).map(([base, v]) => ({
      key: base + 'USDT',
      native: base + 'USDT',
      base,
      quote: 'USDT',
      precision: smartDecimals(v.p),
      tickSize: null,
      seed: v
    }));
  }

  private getMarket(key: string): MarketInfo | undefined {
    return this.markets.find((m) => m.key === key) || this.markets[0];
  }

  async fetchKlines(key: string, interval: Interval, limit = 500): Promise<Candle[]> {
    const m = this.getMarket(key);
    const sec = INTERVAL_SEC[interval] || 60;
    const now = Math.floor(Date.now() / 1000);
    const t0 = now - (now % sec) - (limit - 1) * sec;

    const basePrice = m?.seed?.p || 50000;
    let p = basePrice * 0.95;
    const bars: Candle[] = [];

    for (let i = 0; i < limit; i++) {
      const shock = (Math.random() - 0.495) * 0.006 * p;
      const open = p;
      const close = Math.max(open + shock, basePrice * 0.2);
      const hi = Math.max(open, close) * (1 + Math.random() * 0.003);
      const lo = Math.min(open, close) * (1 - Math.random() * 0.003);
      bars.push({
        time: t0 + i * sec,
        open,
        high: hi,
        low: lo,
        close,
        volume: Math.random() * 500 + 50
      });
      p = close;
    }
    return bars;
  }

  async fetchTicker(key: string): Promise<TickerData> {
    const m = this.getMarket(key);
    const p = m?.seed?.p || 50000;
    const c = m?.seed?.c || 0;
    return {
      last: p,
      changePct: c,
      high: p * 1.03,
      low: p * 0.97,
      quoteVol: 100000000
    };
  }

  async fetchAllTickers(): Promise<Record<string, { last: number; changePct: number; quoteVol?: number }>> {
    const map: Record<string, { last: number; changePct: number; quoteVol?: number }> = {};
    for (const m of this.markets) {
      map[m.key] = {
        last: m.seed?.p || 10,
        changePct: m.seed?.c || 0,
        quoteVol: 50000000
      };
    }
    return map;
  }

  subscribe(key: string, interval: Interval, cb: DataFeedCallback): void {
    this.close();
    const m = this.getMarket(key);
    const sec = INTERVAL_SEC[interval] || 60;
    let price = m?.seed?.p || 50000;

    cb.onStatus({
      state: 'open',
      providerName: this.name,
      isFallback: true
    });

    this.timer = setInterval(() => {
      if (document.hidden) return;
      const now = Math.floor(Date.now() / 1000);
      const bucket = now - (now % sec);
      const open = price;
      price = price * (1 + (Math.random() - 0.498) * 0.002);
      const close = price;

      cb.onCandle(
        {
          time: bucket,
          open,
          high: Math.max(open, close) * (1 + Math.random() * 0.001),
          low: Math.min(open, close) * (1 - Math.random() * 0.001),
          close,
          volume: Math.random() * 200 + 20
        },
        false
      );

      cb.onTicker({
        last: close,
        changePct: (m?.seed?.c || 0) + ((close / (m?.seed?.p || 1) - 1) * 100)
      });
    }, 1000);
  }

  close(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
