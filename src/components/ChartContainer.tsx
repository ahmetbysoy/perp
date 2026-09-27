import React, { useEffect, useRef, useCallback } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  ColorType,
  LineStyle,
  CrosshairMode,
  Time,
  CandlestickSeries,
  LineSeries,
  AreaSeries,
  HistogramSeries
} from 'lightweight-charts';
import { Candle, AppSettings, StrategyChain, LevelRay, VLineMarker } from '../types';
import { fmtPrice, binarySearchBar } from '../services/dataFeed';

interface ChartContainerProps {
  bars: Candle[];
  gaussianData: (number | null)[];
  vwmaData: (number | null)[];
  strategyChains: StrategyChain[];
  manualLevels: LevelRay[];
  manualVLines: VLineMarker[];
  settings: AppSettings;
  precision: number;
  onCrosshairMove?: (bar: Candle | null) => void;
  onAddManualLevel?: (price: number, time: number) => void;
  onAddManualVLine?: (time: number) => void;
  onDeleteManualLevel?: (id: string | number) => void;
  onSingleShotAdded?: () => void;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
  bars,
  gaussianData,
  vwmaData,
  strategyChains,
  manualLevels,
  manualVLines,
  settings,
  precision,
  onCrosshairMove,
  onAddManualLevel,
  onAddManualVLine,
  onDeleteManualLevel,
  onSingleShotAdded
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick' | 'Line' | 'Area'> | null>(null);
  const gaussianSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const vwmaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  const rafIdRef = useRef<number | null>(null);
  const isDraggingRef = useRef<boolean>(false);

  // Keep latest props in refs for smooth animation frame access
  const latestPropsRef = useRef({
    bars,
    gaussianData,
    vwmaData,
    strategyChains,
    manualLevels,
    manualVLines,
    settings,
    precision
  });
  latestPropsRef.current = {
    bars,
    gaussianData,
    vwmaData,
    strategyChains,
    manualLevels,
    manualVLines,
    settings,
    precision
  };

  /**
   * High performance collision-avoidance drawing for overlay rays and vertical lines
   */
  const drawCanvasOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const chart = chartRef.current;
    const candleSeries = candleSeriesRef.current;
    if (!canvas || !container || !chart || !candleSeries) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const {
      bars: curBars,
      strategyChains: curChains,
      manualLevels: curLevels,
      manualVLines: curVLines,
      settings: curSettings,
      precision: curPrecision
    } = latestPropsRef.current;

    if (!curBars.length) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const expectedWidth = Math.round(width * dpr);
    const expectedHeight = Math.round(height * dpr);
    if (canvas.width !== expectedWidth || canvas.height !== expectedHeight) {
      canvas.width = expectedWidth;
      canvas.height = expectedHeight;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const timeScale = chart.timeScale();

    // Helper: draw single vertical marker line
    const drawVLine = (time: number, color: string, lineWidth: number = 2, labelText?: string) => {
      const x = timeScale.timeToCoordinate(time as unknown as Time);
      if (x == null || x < 0 || x > width) return null;

      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      if (labelText && curSettings.strategyShowLabels) {
        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        const tw = ctx.measureText(labelText).width;
        let tagX = x + 3;
        if (tagX + tw + 10 > width) tagX = x - tw - 12;

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(tagX, 8, tw + 8, 16, 4) : ctx.rect(tagX, 8, tw + 8, 16);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.fillText(labelText, tagX + 4, 20);
      }
      ctx.restore();
      return x;
    };

    // Helper: draw horizontal ray with collision-managed right tag
    interface RayToDraw {
      price: number;
      startTime?: number;
      color: string;
      width: number;
      dash?: number[];
      tag?: string;
      isCustom?: boolean;
      id?: string | number;
    }

    const raysToRender: RayToDraw[] = [];

    // 1. Manual user levels & Strategy Rays
    const isDark = curSettings.theme === 'dark';
    // For horizontal lines:
    // In dark theme: NEVER let it be black (#000000). Use bright electric sky-blue (#38bdf8), gold (#facc15), or custom strategyLevelColor!
    // In light theme: use crisp deep slate (#0f172a) or ocean blue (#0284c7)
    const defaultLevelColor = isDark
      ? (curSettings.strategyLevelColor &&
         curSettings.strategyLevelColor !== '#000000' &&
         curSettings.strategyLevelColor.toLowerCase() !== '#000' &&
         curSettings.strategyLevelColor.toLowerCase() !== 'black'
          ? curSettings.strategyLevelColor
          : '#38bdf8')
      : (curSettings.strategyLevelColor &&
         curSettings.strategyLevelColor !== '#38bdf8' &&
         curSettings.strategyLevelColor !== '#000000'
          ? curSettings.strategyLevelColor
          : '#0f172a');

    if (curSettings.levelsVisible) {
      curLevels.forEach((lv) => {
        const isBlackOrNearBlack =
          !lv.color ||
          lv.color === '#000000' ||
          lv.color.toLowerCase() === '#000' ||
          lv.color.toLowerCase() === 'black' ||
          lv.color === '#111111' ||
          lv.color === '#0c0e14' ||
          lv.color === '#0e111a';

        const effectiveColor = isDark
          ? (isBlackOrNearBlack ? defaultLevelColor : lv.color)
          : (isBlackOrNearBlack ? '#0f172a' : (lv.color === '#38bdf8' ? '#0284c7' : lv.color));

        raysToRender.push({
          price: lv.price,
          startTime: lv.startTime ?? curBars[0]?.time,
          color: effectiveColor,
          width: lv.width || 2,
          dash: lv.dash || [],
          tag: lv.tag || 'Düzey',
          isCustom: true,
          id: lv.id
        });
      });
    }

    // 2. Strategy SATIŞ1 rays (V1 level ray & SATIŞ1 short entry ray)
    if (curSettings.strategyMode && curSettings.strategyShowRays && curChains.length) {
      const hLookback = Math.max(1, curSettings.strategyHLookback || 3);
      const recentChains = curChains.slice(-hLookback);

      recentChains.forEach((ch) => {
        const b1 = curBars[ch.v1Bar];
        if (b1) {
          // Rule 2: Seviye Işını (V1 mumunun kapanış fiyatı)
          // Koyu temada ASLA siyah kalmaz: parlak ve net çizilir (#38bdf8 / defaultLevelColor)
          raysToRender.push({
            price: ch.level,
            startTime: b1.time,
            color: defaultLevelColor,
            width: curSettings.strategyRayWidth || 2,
            dash: [],
            tag: `V${ch.id} ${fmtPrice(ch.level, curPrecision, curSettings.priceLocale)}`
          });
        }

        // Rule 4: SATIŞ1 Short Entry Işını (V2 mumunun açılış fiyatı)
        if (ch.sellPrice != null && ch.v2Bar >= 0 && curBars[ch.v2Bar]) {
          const v2Time = curBars[ch.v2Bar].time;
          raysToRender.push({
            price: ch.sellPrice,
            startTime: v2Time,
            color: curSettings.strategySellColor || '#f23645',
            width: curSettings.strategyRayWidth || 2,
            dash: [6, 4],
            tag: `SATIŞ${ch.id}${ch.status === 'tp' ? ' [TP ✓]' : ''}`
          });
        }
      });
    }

    // Collect visual Y coordinates to avoid label collision
    interface RenderedRay {
      ray: RayToDraw;
      y: number;
      startX: number;
      tagY: number;
      tagText: string;
      tagWidth: number;
    }

    const calculatedRays: RenderedRay[] = [];
    ctx.font = 'bold 10.5px "JetBrains Mono", monospace';

    raysToRender.forEach((ray) => {
      const y = candleSeries.priceToCoordinate(ray.price);
      if (y == null || y < -10 || y > height + 10) return;

      let startX = 0;
      if (ray.startTime != null) {
        const sx = timeScale.timeToCoordinate(ray.startTime as unknown as Time);
        if (sx != null) startX = Math.max(0, sx);
      }
      if (startX > width) return;

      const tagText = (ray.tag ? ray.tag + ' ' : '') + fmtPrice(ray.price, curPrecision, curSettings.priceLocale);
      const tagWidth = curSettings.strategyShowTags ? ctx.measureText(tagText).width + 14 : 0;

      calculatedRays.push({
        ray,
        y,
        startX,
        tagY: y,
        tagText,
        tagWidth
      });
    });

    // Collision Resolution Algorithm for right-side price tags
    calculatedRays.sort((a, b) => a.y - b.y);
    const minSpacing = 19;
    for (let i = 1; i < calculatedRays.length; i++) {
      const prev = calculatedRays[i - 1];
      const curr = calculatedRays[i];
      if (curr.tagY - prev.tagY < minSpacing) {
        curr.tagY = prev.tagY + minSpacing;
      }
    }

    // Draw the rays and labels
    calculatedRays.forEach((item) => {
      const { ray, y, startX, tagY, tagText, tagWidth } = item;
      const endX = Math.max(startX, width - tagWidth);

      // Backing definition stroke for crisp contrast against candles
      ctx.save();
      ctx.strokeStyle = isDark ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.7)';
      ctx.lineWidth = ray.width + 1.5;
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = ray.color;
      ctx.lineWidth = ray.width;
      if (ray.dash && ray.dash.length) {
        ctx.setLineDash(ray.dash);
      } else {
        ctx.setLineDash([]);
      }

      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Start origin dot/square
      if (curSettings.strategyShowDots) {
        ctx.fillStyle = ray.color;
        ctx.beginPath();
        ctx.arc(startX, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Right price tag
      if (curSettings.strategyShowTags && tagWidth > 0) {
        const boxX = width - tagWidth;
        const boxY = tagY - 9;

        // Connecting stroke if tag was adjusted due to collision
        if (Math.abs(tagY - y) > 2) {
          ctx.strokeStyle = ray.color;
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.moveTo(endX, y);
          ctx.lineTo(boxX, tagY);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        ctx.fillStyle = ray.color;
        ctx.beginPath();
        ctx.roundRect
          ? ctx.roundRect(boxX, boxY, tagWidth, 18, [4, 0, 0, 4])
          : ctx.rect(boxX, boxY, tagWidth, 18);
        ctx.fill();

        // High contrast text inside tag badge
        const isBrightTag =
          ray.color === '#f8fafc' ||
          ray.color === '#ffffff' ||
          ray.color === '#f1f5f9' ||
          ray.color.toLowerCase() === '#fff';
        ctx.fillStyle = isBrightTag ? '#0f172a' : '#ffffff';
        ctx.fillText(tagText, boxX + 6, tagY + 4);
      }

      ctx.restore();
    });

    // 3. Strategy Vertical Lines (V1 and V2)
    if (curSettings.strategyMode && curSettings.strategyShowVLines && curChains.length) {
      const vLookback = Math.max(1, curSettings.strategyVLookback || 3);
      const recentChains = curChains.slice(-vLookback);

      recentChains.forEach((ch) => {
        const b1 = curBars[ch.v1Bar];
        if (b1) {
          drawVLine(b1.time, curSettings.strategyLineColor || '#2962ff', 2, `V1-${ch.id}`);
        }
        if (ch.v2Bar >= 0 && curBars[ch.v2Bar]) {
          const b2 = curBars[ch.v2Bar];
          drawVLine(b2.time, curSettings.strategySellColor || '#f23645', 2, `SATIŞ1-${ch.id}`);
        }
      });

      // TP Markers on chart
      if (curSettings.strategyShowTp) {
        recentChains.forEach((ch) => {
          if (ch.tpBar >= 0 && curBars[ch.tpBar]) {
            const bTp = curBars[ch.tpBar];
            const x = timeScale.timeToCoordinate(bTp.time as unknown as Time);
            const y = ch.tpPrice != null ? candleSeries.priceToCoordinate(ch.tpPrice) : null;
            if (x != null && y != null) {
              ctx.save();
              ctx.fillStyle = curSettings.strategyTpColor || '#089981';
              ctx.beginPath();
              ctx.arc(x, y, 5, 0, Math.PI * 2);
              ctx.fill();

              ctx.font = 'bold 10px "JetBrains Mono", monospace';
              const text = `TP${ch.id} ✓`;
              const tw = ctx.measureText(text).width;
              ctx.fillStyle = curSettings.strategyTpColor || '#089981';
              ctx.beginPath();
              ctx.roundRect ? ctx.roundRect(x - tw / 2 - 4, y - 24, tw + 8, 16, 4) : ctx.rect(x - tw / 2 - 4, y - 24, tw + 8, 16);
              ctx.fill();
              ctx.fillStyle = '#ffffff';
              ctx.fillText(text, x - tw / 2, y - 12);
              ctx.restore();
            }
          }
        });
      }
    }

    // 4. Manual user vertical lines
    if (curSettings.vlinesVisible && curVLines.length) {
      curVLines.forEach((vl) => {
        drawVLine(vl.time, vl.color || '#2962ff', 2, vl.label || 'V-Çizgi');
      });
    }

    ctx.restore();
  }, []);

  const requestRender = useCallback(() => {
    if (rafIdRef.current != null) return;
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      drawCanvasOverlay();
    });
  }, [drawCanvasOverlay]);

  // Initialize TradingView Lightweight Chart
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      layout: {
        background: {
          type: ColorType.Solid,
          color: settings.backgroundColor || '#0c0e14'
        },
        textColor: settings.theme === 'light' ? '#374151' : '#94a3b8',
        fontSize: 11,
        fontFamily: "'JetBrains Mono', monospace"
      },
      grid: {
        vertLines: { visible: settings.gridVisible, color: settings.gridColor || 'rgba(255,255,255,0.04)' },
        horzLines: { visible: settings.gridVisible, color: settings.gridColor || 'rgba(255,255,255,0.04)' }
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: settings.theme === 'light' ? '#6b7280' : '#475569',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: settings.theme === 'light' ? '#1f2937' : '#334155'
        },
        horzLine: {
          color: settings.theme === 'light' ? '#6b7280' : '#475569',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: settings.theme === 'light' ? '#1f2937' : '#334155'
        }
      },
      rightPriceScale: {
        borderColor: settings.theme === 'light' ? '#e5e7eb' : '#1e293b',
        scaleMargins: { top: 0.08, bottom: settings.volumeVisible ? 0.22 : 0.08 },
        entireTextOnly: true
      },
      timeScale: {
        borderColor: settings.theme === 'light' ? '#e5e7eb' : '#1e293b',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 6,
        barSpacing: settings.barSpacing || 8,
        minBarSpacing: 2
      },
      handleScale: true,
      handleScroll: true,
      kineticScroll: { touch: true, mouse: true }
    });

    chartRef.current = chart;

    // Build series
    const pf = {
      type: 'price' as const,
      precision,
      minMove: Math.pow(10, -precision)
    };

    let mainSeries: ISeriesApi<'Candlestick' | 'Line' | 'Area'>;
    if (settings.chartType === 'candles' || settings.chartType === 'hollow') {
      const isHollow = settings.chartType === 'hollow';
      mainSeries = chart.addSeries(CandlestickSeries, {
        priceFormat: pf,
        priceLineVisible: settings.priceLineVisible,
        lastValueVisible: settings.priceLabelVisible,
        upColor: isHollow ? 'transparent' : settings.upColor,
        downColor: isHollow ? 'transparent' : settings.downColor,
        borderUpColor: settings.upColor,
        borderDownColor: settings.downColor,
        wickUpColor: settings.upColor,
        wickDownColor: settings.downColor
      });
    } else if (settings.chartType === 'area') {
      mainSeries = chart.addSeries(AreaSeries, {
        priceFormat: pf,
        priceLineVisible: settings.priceLineVisible,
        lastValueVisible: settings.priceLabelVisible,
        lineColor: settings.upColor,
        lineWidth: 2,
        topColor: `${settings.upColor}33`,
        bottomColor: `${settings.upColor}05`
      });
    } else {
      mainSeries = chart.addSeries(LineSeries, {
        priceFormat: pf,
        priceLineVisible: settings.priceLineVisible,
        lastValueVisible: settings.priceLabelVisible,
        color: settings.upColor,
        lineWidth: 2
      });
    }
    candleSeriesRef.current = mainSeries;

    // Gaussian Line Series
    const gSeries = chart.addSeries(LineSeries, {
      priceFormat: { type: 'price', precision: Math.max(precision, 4), minMove: Math.pow(10, -Math.max(precision, 4)) },
      color: settings.gaussianColor || '#4caf50',
      lineWidth: (settings.gaussianWidth || 2) as 1 | 2 | 3 | 4,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false
    });
    gaussianSeriesRef.current = gSeries;

    // VWMA Line Series
    const vSeries = chart.addSeries(LineSeries, {
      priceFormat: { type: 'price', precision: Math.max(precision, 4), minMove: Math.pow(10, -Math.max(precision, 4)) },
      color: settings.vwmaColor || '#ff9800',
      lineWidth: (settings.vwmaWidth || 2) as 1 | 2 | 3 | 4,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false
    });
    vwmaSeriesRef.current = vSeries;

    // Volume Series
    const volSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume_scale',
      priceLineVisible: false,
      lastValueVisible: false
    });
    volSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 }
    });
    volumeSeriesRef.current = volSeries;

    // Resize observer
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          chart.applyOptions({ width, height });
          requestRender();
        }
      }
    });
    ro.observe(container);

    // Crosshair move subscription with Binary Search
    chart.subscribeCrosshairMove((param) => {
      requestRender();
      if (!onCrosshairMove) return;
      if (!param || !param.time) {
        onCrosshairMove(null);
        return;
      }
      const curBars = latestPropsRef.current.bars;
      const found = binarySearchBar(curBars, param.time as number);
      onCrosshairMove(found);
    });

    // Time scale changes
    chart.timeScale().subscribeVisibleTimeRangeChange(requestRender);
    chart.timeScale().subscribeVisibleLogicalRangeChange(requestRender);

    // Click handler for adding levels
    chart.subscribeClick((param) => {
      const curSettings = latestPropsRef.current.settings;
      if (!param.point || !param.time) return;

      if (curSettings.clickAddLevel && onAddManualLevel) {
        const price = candleSeriesRef.current?.coordinateToPrice(param.point.y);
        if (price != null) {
          onAddManualLevel(price, param.time as number);
          if (onSingleShotAdded) onSingleShotAdded();
        }
      } else if (curSettings.clickAddVLine && onAddManualVLine) {
        onAddManualVLine(param.time as number);
        if (onSingleShotAdded) onSingleShotAdded();
      }
    });

    // Keep requestAnimationFrame running smoothly during active dragging/swiping
    const onPointerDown = () => {
      isDraggingRef.current = true;
      const animateLoop = () => {
        if (!isDraggingRef.current) return;
        drawCanvasOverlay();
        requestAnimationFrame(animateLoop);
      };
      requestAnimationFrame(animateLoop);
    };

    const onPointerUp = () => {
      isDraggingRef.current = false;
      drawCanvasOverlay();
    };

    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    container.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchend', onPointerUp, { passive: true });

    return () => {
      container.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('touchstart', onPointerDown);
      window.removeEventListener('touchend', onPointerUp);
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  // Update Chart Theme & Options
  useEffect(() => {
    if (!chartRef.current) return;
    const isDark = settings.theme === 'dark';
    const chartBg = isDark ? (settings.backgroundColor || '#0c0e14') : '#ffffff';
    const chartTextColor = isDark ? '#94a3b8' : '#334155';
    const chartGridColor = isDark ? (settings.gridColor || 'rgba(255,255,255,0.04)') : 'rgba(0,0,0,0.05)';
    const chartBorderColor = isDark ? '#1e293b' : '#cbd5e1';
    const crosshairLineColor = isDark ? '#475569' : '#94a3b8';
    const crosshairLabelBg = isDark ? '#1e293b' : '#0f172a';

    chartRef.current.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: chartBg },
        textColor: chartTextColor
      },
      grid: {
        vertLines: { visible: settings.gridVisible, color: chartGridColor },
        horzLines: { visible: settings.gridVisible, color: chartGridColor }
      },
      crosshair: {
        vertLine: {
          color: crosshairLineColor,
          labelBackgroundColor: crosshairLabelBg
        },
        horzLine: {
          color: crosshairLineColor,
          labelBackgroundColor: crosshairLabelBg
        }
      },
      rightPriceScale: {
        borderColor: chartBorderColor
      },
      timeScale: {
        borderColor: chartBorderColor,
        barSpacing: settings.barSpacing || 8
      }
    });
    requestRender();
  }, [settings, requestRender]);

  // Update Data in Series
  useEffect(() => {
    if (!candleSeriesRef.current || !chartRef.current || !bars.length) return;

    // Apply main candle data
    if (settings.chartType === 'candles' || settings.chartType === 'hollow') {
      candleSeriesRef.current.setData(
        bars.map((b) => ({
          time: b.time as unknown as Time,
          open: b.open,
          high: b.high,
          low: b.low,
          close: b.close
        }))
      );
    } else {
      candleSeriesRef.current.setData(
        bars.map((b) => ({
          time: b.time as unknown as Time,
          value: b.close
        }))
      );
    }

    // Apply Gaussian data
    if (gaussianSeriesRef.current) {
      gaussianSeriesRef.current.applyOptions({
        visible: settings.gaussianVisible,
        color: settings.gaussianColor || '#4caf50',
        lineWidth: (settings.gaussianWidth || 2) as 1 | 2 | 3 | 4
      });
      const gPoints = [];
      for (let i = 0; i < bars.length; i++) {
        if (gaussianData[i] != null) {
          gPoints.push({ time: bars[i].time as unknown as Time, value: gaussianData[i]! });
        }
      }
      gaussianSeriesRef.current.setData(gPoints);
    }

    // Apply VWMA data
    if (vwmaSeriesRef.current) {
      vwmaSeriesRef.current.applyOptions({
        visible: settings.vwmaVisible,
        color: settings.vwmaColor || '#ff9800',
        lineWidth: (settings.vwmaWidth || 2) as 1 | 2 | 3 | 4
      });
      const vPoints = [];
      for (let i = 0; i < bars.length; i++) {
        if (vwmaData[i] != null) {
          vPoints.push({ time: bars[i].time as unknown as Time, value: vwmaData[i]! });
        }
      }
      vwmaSeriesRef.current.setData(vPoints);
    }

    // Apply Volume data
    if (volumeSeriesRef.current) {
      volumeSeriesRef.current.applyOptions({ visible: settings.volumeVisible });
      volumeSeriesRef.current.setData(
        bars.map((b) => ({
          time: b.time as unknown as Time,
          value: b.volume,
          color: b.close >= b.open ? `${settings.upColor}77` : `${settings.downColor}77`
        }))
      );
    }

    requestRender();
  }, [bars, gaussianData, vwmaData, settings, requestRender]);

  return (
    <div className="relative w-full h-full select-none overflow-hidden touch-none">
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-10 w-full h-full"
      />
    </div>
  );
};
