# 🚀 PROJE ENTEGRASYON VE GELİŞTİRME PLANI (TASK.md)
## İlham Kaynağı: "Binance Otonom WSS Analiz & MEV Bot" Mimarisinin Projemize Entegrasyonu

---

### 1. KOD ANALİZİ & DEĞERLİ PARÇALARIN TESPİTİ

İncelenen HTML kodunda yer alan ve mevcut **Futures Trader & VWMA-Gaussian SATIŞ1 Platformumuza** entegre edilen kritik bileşenler:

1. **Orderbook Likidite Duvarları (Destek & Direnç Kümeleri):**
   - Tahtadaki (Bids & Asks) en yoğun limit emir bloklarının tespit edilerek görselleştirilmesi.
   - Alıcı / Satıcı hacim hakimiyet oranı (Bid/Ask Volume Imbalance % - örn: Alıcı %64.2).
   - Duvarın güncel fiyata olan yüzde mesafesi (`distancePct`) ve kümülatif BTC büyüklüğü.

2. **Çoklu Zaman Dilimi Konsensüs Motoru (1m • 5m • 15m):**
   - Tek bir zaman dilimine bağımlı kalmadan; 1m, 5m ve 15m periyotlarının indikatör (VWMA + Gaussian + Momentum + Hacim Deltası) durumlarını birleştirip tek bir konsensüs yönü ve güven skoru (% Confidence) üretmesi.
   - Her zaman dilimi için açık gerekçeler (örn: EMA kesişimi, taker alım baskısı, Gaussian sıçraması).

3. **Gerçek Derinlik Tabanlı Slippage & Piyasa Etkisi Radarı:**
   - Farklı piyasa emri hacimlerinde ($10K, $50K, $100K, $250K) tahta taranarak (Orderbook Walk) gerçek alış/satış kayma oranı (Slippage %) ve en kötü dolum fiyatının (Worst Price) hesaplanması.
   - Yüksek slippage ve frontrunning riskine karşı trader uyarı göstergesi.

4. **Ticaret Kurulum Kartı (Trade Setup Card):**
   - SATIŞ1 ve Alış sinyalleri için anlık Giriş (Entry), Zarar Kes (SL), Hedef 1 (TP1) ve Dinamik Hedef 2 (TP2 - Gaussian temas) seviyelerinin Risk/Ödül (R:R) oranıyla net bir kutuda sunulması.

5. **Ağ Gecikmesi & WSS Kalp Atışı Monitörü:**
   - Gerçek zamanlı WebSocket ping/gecikme (ms) sayacı ve canlı nabız göstergesi.

---

### 2. GÖREV LİSTESİ (TODO TASKS) - DURUM

- [x] **TASK 1: Orderbook Veri Katmanı & Likidite Duvarı Motoru**
  - Binance Futures `@depth20@100ms` WebSocket akışının entegre edilmesi (`src/services/orderbookService.ts`).
  - Bids ve Asks için en büyük hacimli destek/direnç kümelerinin (Liquidity Walls) filtrelenmesi.
  - Alıcı vs Satıcı hacim hakimiyet oranı (Bid/Ask Imbalance %) formülasyonu.

- [x] **TASK 2: Çoklu Zaman Dilimi (1m, 5m, 15m) Konsensüs Motoru**
  - 1m, 5m ve 15m barları için Gaussian, VWMA ve hacim trendinin eşzamanlı hesaplanması (`src/services/consensusEngine.ts`).
  - Konsensüs skoru (0 - 100%) ve yön sinyali (GÜÇLÜ AL, AL, NÖTR, SAT, GÜÇLÜ SAT) algoritması.
  - Her zaman dilimi için dinamik gerekçe üretici (Reason Engine).

- [x] **TASK 3: Orderbook Walk Tabanlı Gerçek Slippage & Risk Radarı**
  - $10K, $50K, $100K ve $250K piyasa emirleri için tahta derinliğini tarayan `calculateSlippageMatrix(orderbook)` algoritması.
  - Alış/Satış kayma yüzdesi, en kötü gerçekleşme fiyatı ve risk seviyesi (DÜŞÜK / ORTA / KRİTİK).
  - Trader için slippage koruma tavsiye metni ve 3 adımlı sandwich simülasyonu (`src/components/MevRadarPanel.tsx`).

- [x] **TASK 4: Gelişmiş Trade Setup Kartı (Entry, SL, TP1, TP2, R:R)**
  - SATIŞ1 ve trend sinyalleri için anlık giriş, SL, TP1 ve TP2 seviyelerini gösteren hero kartı (`src/components/TradeSetupHero.tsx`).
  - Risk/Ödül (R:R) oranı ve beklenen yüzde kar hesabı.

- [x] **TASK 5: WSS Gecikme (Ping) Ölçer & Mobil Sekmeli Navigasyon**
  - WebSocket mesaj gidiş-dönüş gecikmesini (ms) ölçüp üst barda gösteren canlı nabız monitörü.
  - Mobilde altta yer alan hızlı erişim sekmeleri: "📊 Grafik", "🧱 Duvarlar", "⏱️ Konsensüs", "⚡ MEV Radar" (`src/components/MobileBottomNav.tsx`).

- [x] **TASK 6: Nisan 2026 Binance WSS Uç Noktası & Tick-by-Tick (@aggTrade) Boru Hattı**
  - `wss://fstream.binance.com/market/ws` ana rotasyon uç noktası (`@kline` + `@ticker` + `@aggTrade` tek bağlantıda).
  - 15 saniyelik hızlı sessizlik bekçisi (eski 45 saniyelik donma kaldırıldı).
  - `@aggTrade` işlem akışı ile her gerçekleşen işlemde canlı mum ve fiyatın 60fps rAF + 250ms yedek flush ile anlık akıtılması.
