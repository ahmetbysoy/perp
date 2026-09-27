# 🚀 İLERİ DÜZEY PROJE YOL HARİTASI (TASK.md)
## İlham Kaynağı: "Futures Scanner — Stage 4" Mimarisi & SATIŞ1 Platform Entegrasyonu

---

### 1. DETAYLI KOD VE SİSTEM ANALİZİ

İncelenen **Futures Scanner — Stage 4** mimarisindeki en kritik ve yüksek değerli parçalar:

1. **Katmanlı Karar Mimarisi (2-Layer Engine):**
   - **Katman 1 (Çekirdek Kural / Sinyal Motoru):** İndikatör ve formasyon tetikleyicisi (Bizim projemizde: *VWMA 34 & Gaussian 8 kesişimi, V1 seviye tespiti, V2 ve SATIŞ1 short/long tetikleyicisi*).
   - **Katman 2 (Raw Order Flow Confirm / Veto Katmanı):** Sinyalin tek başına yetersiz kaldığı durumları önlemek için gerçek zamanlı piyasa mikroyapısı teyidi:
     - **CVD 60s (Cumulative Volume Delta):** Son 60 saniyedeki piyasa alıcı vs satıcı agresif hacim deltası.
     - **OBI (Order Book Imbalance):** Tam derinlik tahta dengesizliği (Bid vs Ask baskı yüzdesi).
     - **Open Interest Δ (Açık Pozisyon Değişimi):** Sinyal anında piyasaya yeni para mı giriyor (Aggressive buildup) yoksa kâr mı alınıyor / likidasyon mu var?
     - **Funding Rate & Sıkışma Baskısı:** Fonlama arbitrajı ve squeeze olasılığı.
     - **Liq 60s (Likidasyon Patlamaları):** Son 60 saniyede patlayan Long/Short hacmi (Cascade tespiti).
     - **Whale Aktivitesi:** Sweep (tahta süpürme), Spoofing (sahte derinlik çekme), Absorption (pasif emirle emme).
   - Bu metriklerden üretilen **0 - 100 Raw Flow Güven Skoru** ile SATIŞ1 sinyali doğrulanır ya da "VETO" edilir.

2. **İstatistiksel Desen Havuzu Motoru (Pattern Pool Engine & Leaderboard):**
   - Her sinyal oluştuğunda sisteme özgü bir imza (Pattern Key) atanır:
     - Örnek: `5m:VWMA_X_GAUSS_DOWN_V1_CONFIRM` veya `1m:9x21_DOWN_SAR0_F1`.
   - Sistem geçmiş barlar (1m/5m backfill) ve canlı akış üzerinden her desenin istatistik havuzunu tutar:
     - **N (Örnek Sayısı):** Bu formasyon kaç kez gerçekleşti?
     - **Wilson Score Interval (%):** Bayesian güven aralığı ile hesaplanan gerçek kazanma olasılığı (küçük örneklem yanılsamasını önler).
     - **Ret10 (%):** Sinyal oluştuktan 10 bar sonraki ortalama net getiri.
     - **MFE / MAE (Risk/Ödül Kalitesi):** Maximum Favorable Excursion (ulaşılan en yüksek kâr) / Maximum Adverse Excursion (görülen en yüksek ters hareket).
     - **Durum:** `İyi (Good)` • `Zayıf (Bad)` • `Veri Topluyor (Wait)`.
   - **Zayıf Desenleri Sustur (Mute Weak Patterns):** Wilson skoru düşük olan sinyalleri otomatik filtreleme.
   - **JSON İçe/Dışa Aktarma:** Desen havuzu hafızasını dışa aktarma (Export) ve geri yükleme (Import).

3. **Gelişmiş Görsel Tahta & Order Flow Overlay Katmanları:**
   - **Likidite Isı Haritası (Heatmap Canvas):** Tahtadaki limit emir yoğunluklarının zaman ekseninde grafik arkasına dinamik ısı haritası (Bookmap tarzı) olarak yansıtılması.
   - **DOM Ladder & Derinlik Merdiveni:** Fiyat basamaklarında anlık kümülatif emir blokları.
   - **Flow Mini Panel:** Grafik üzerinde sağ üstte canlı akan CVD60, OBI, OIΔ ve Funding bilgi çipi.
   - **Balina & Likidasyon Marker'ları:** Grafikte gerçekleşen büyük hacimli emir süpürmeleri ve likidasyon noktaları.

---

### 2. GÖREV LİSTESİ (TODO TASKS)

Aşağıdaki görevler adım adım, modüler ve sıfır mock veri prensibiyle uygulanacaktır:

#### [x] FAZ 1: Katman 2 — Raw Order Flow Motoru (CVD, OBI, OI, Liq, Funding)
- [x] **Task 1.1:** `@aggTrade` akışından 60 saniyelik yuvarlanan pencerede (rolling window) **CVD (Cumulative Volume Delta)** hesaplayıcı motoru yaz.
- [x] **Task 1.2:** Tahta derinliği (`@depth20`) üzerinden anlık **OBI (Order Book Imbalance %)** hesaplayıcı geliştir.
- [x] **Task 1.3:** Binance Futures REST API üzerinden 15 saniyede bir periyodik **Open Interest (Açık Pozisyon) ve Funding Rate** senkronizasyonu kur.
- [x] **Task 1.4:** WebSocket `forceOrder` (likidasyon akışı) veya REST verisinden son 60 saniyede gerçekleşen **Long vs Short Likidasyonlarını** hesapla.
- [x] **Task 1.5:** Bu 5 mikro yapı verisini harmanlayarak **0 - 100 Raw Flow Güven Skoru** üreten `RawFlowEngine` servisini oluştur (`src/services/rawFlowService.ts`).

#### [x] FAZ 2: Karar Kartı (Decision Card) & Sinyal Veto/Teyit Paneli
- [x] **Task 2.1:** SATIŞ1 ve V1/V2 sinyallerini Katman 2 Raw Flow güven skoru ile birleştiren **Karar Kartı (Decision Card)** bileşeni oluştur (`AL`, `SAT`, `İZLEMEDE`, `NÖTR`) (`src/components/DecisionSignalCard.tsx`).
- [x] **Task 2.2:** Karar gerekçeleri listesi (Reason Engine: örn. *"CVD negatif baskı kuruyor"*, *"Tahtada %18 alıcı duvarı var"*, *"OI artışı ile short pozisyon birikiyor"*).
- [x] **Task 2.3:** Grafik üzerine açılıp kapatılabilen kompakt **Flow Mini Panel** ekle (CVD60, OBI, OIΔ, Funding göstergesi) (`src/components/FlowMiniOverlay.tsx`).

#### [x] FAZ 3: Pattern Pool Engine (Desen Havuzu & Bayesian Wilson Skoru)
- [x] **Task 3.1:** Her sinyal için benzersiz desen anahtarı üretici (`buildPatternKey(timeframe, setup, flowState)`).
- [x] **Task 3.2:** Tarihsel ve canlı barlarda sinyal sonrasındaki 10 barı izleyerek **Ret10, MFE, MAE** ve **Wilson Score** hesaplayan `patternPoolService.ts` motorunu geliştir (`src/services/patternPoolService.ts`).
- [x] **Task 3.3:** **Havuz (Pattern Leaderboard)** sekmesi oluştur (`src/components/PatternPoolPanel.tsx`):
  - Timeframe (1m, 5m, Tümü) ve Min Örneklem filtreleri.
  - Desen listesi: Desen Adı, TF, N (örnek sayısı), Wilson %, Ret10 %, MFE/MAE, Durum rozeti (`iyi`, `zayıf`, `veri topluyor`).
  - Seçilen desenin detay tablosu ve geçmiş örneklem dökümü.
- [x] **Task 3.4:** Zayıf desenleri otomatik susturma filtresi ve Desen Havuzunu JSON olarak İndir/Yükle fonksiyonları.

#### [x] FAZ 4: Likidite Isı Haritası (Heatmap Canvas) & DOM Ladder
- [x] **Task 4.1:** Lightweight Charts üzerinde zaman ekseniyle senkronize çalışan, derinlik verisini zaman damgalarıyla tamponlayıp parlaklık/renk yoğunluğu olarak çizen **Heatmap Canvas** katmanı ekle (`src/components/ChartContainer.tsx`).
- [x] **Task 4.2:** Tahtadaki balina hareketlerini (Whale Sweep / Spoofing) tespit edip grafiğe opsiyonel marker olarak basan avcı mekanizması kur.

#### [x] FAZ 5: Navigasyon, Ayarlar & Entegrasyon Doğrulaması
- [x] **Task 5.1:** Alt navigasyon barına (`MobileBottomNav.tsx`) ve masaüstü sekmelere **"🧠 Havuz"** ve **"⚡ Karar/Sinyal"** sekmelerini entegre et.
- [x] **Task 5.2:** `SettingsSheet.tsx` içine Katman 2 ayarlarını (Min likidasyon, OI yenileme periyodu, Heatmap aç/kapat, Desen win eşiği) ekle.
- [x] **Task 5.3:** Kod tabanını derle (`compile_applet`), tip testlerini (`lint_applet`) tamamla ve uçtan uca doğrula.

---

### 3. FAZ 6: Görsel İyileştirmeler, Glow (Parlama) Efektleri & Overlap Giderimi (TAMAMLANDI)

- [x] **Task 6.1: Strateji Çizgilerine Dinamik Glow (Parlama) ve Kenar Yumuşatma:**
  - `ChartContainer.tsx` Canvas 2D çizim döngüsünde V1 Seviye Işını (`#38bdf8`) ve SATIŞ1 Giriş Işını (`#f23645`) için `shadowColor` + `shadowBlur` (karanlık modda neon ışıma, aydınlık modda derinlik konturu) entegrasyonu.
  - Sub-pixel kenar yumuşatma (anti-aliasing) ile retina ekranlarda (dpr 2 ve 3) pürüzsüz çizgi geçişleri.

- [x] **Task 6.2: TP1 / TP2 Rozetlerine Profesyonel Glow ve Çift Katmanlı Kontrast:**
  - TP dairesi ve `TP1 ✓` rozetinin arkasına `rgba(8, 153, 129, 0.75)` zümrüt parlama halesi ve nabız halkası eklendi.
  - Aydınlık ve karanlık temada yüksek kontrastlı çift katmanlı sınır (border) ve net tipografi.

- [x] **Task 6.3: FlowMiniOverlay ile Sağ Fiyat Skalası ve Tepe Işın Çakışmasını (Overlap #1) Çözme:**
  - `FlowMiniOverlay` bileşeni grafiğin sağ kenarındaki fiyat skalasının (`PriceScale`) üzerinden çekilerek `right-14 sm:right-16` akıllı dock pozisyonuna alındı.
  - Tek dokunuşla küçültme / büyütme (Chevron toggle) eklendi.

- [x] **Task 6.4: Sağ Fiyat Etiketlerinin (Price Tags) Sağ Eksen ile Çakışmasını (Overlap #2) Çözme:**
  - `ChartContainer.tsx` içindeki fiyat etiketi formülü `priceScaleWidth = 56px` ile içeri çekildi (`boxX = rightLimit - tagWidth - 2`). Etiketler fiyat eksenindeki rakamlarla asla çakışmaz.

- [x] **Task 6.5: V1 / SATIŞ1 Dikey Çizgi Başlıklarının Üst Menü ile Çarpışmasını (Overlap #3) Önleme:**
  - Dikey çizgi etiketlerinin (`drawVLine`) tepe koordinatı `safeTop = 26px` dinamik güvenlik marjı ve laser glow ile güncellendi.

- [x] **Task 6.6: Mobil Alt Navigasyon Panel Taşıntısını (Overlap #4) Giderme:**
  - Tüm kaydırılabilir panellere (`signal`, `pool`, `walls`, `consensus`, `mev`) `pb-24` ve `overscroll-contain` eklendi; en alttaki kartların `MobileBottomNav` arkasında sıkışması önlendi.

- [x] **Task 6.7: Dar Ekranlarda (iPhone SE / 360px) PriceBar & PositionChip Sıkışmasını (Overlap #5) Giderme:**
  - `PriceBar.tsx` bileşenindeki fiyat ve butonlar için `truncate`, `shrink-0` ve `text-xl sm:text-3xl` responsive düzenleme tamamlandı.

---

### 4. FAZ 7: Screenshot Analiz Düzeltmeleri & Mobil UI Rafinasyonu (TAMAMLANDI)

- [x] **Task 7.1: Havuz Motoru Sonsuz Akümülasyon Sayacı Düzeltildi:**
  - `patternPoolService.ts` içinde `evaluatedEvents` seti kurularak her mum zaman damgasının yalnızca BİR KEZ analiz edilmesi sağlandı. Canlı ticklerde on binlere fırlayan sayaç bug'ı tamamen giderildi, bozuk eski kayıtlar temizlendi.
- [x] **Task 7.2: FlowMiniOverlay Sol Üste Alındı:**
  - `FlowMiniOverlay` grafiğin sağ eksen ve canlı mum alanından çıkarılarak `top-2.5 left-2.5` konumuna taşındı. Sağ fiyat ekseni ve mumlar %100 görünür kılındı.
- [x] **Task 7.3: Alt Seviye Işın Etiket Mesafesi (Overlap) Giderildi:**
  - `ChartContainer.tsx` içindeki `minSpacing = 23px` ve `boxX = rightLimit - tagWidth - 4` yapılarak `Düzey` ve `SATIŞ12` etiketlerinin dikeyde birbirine yapışması önlendi.
- [x] **Task 7.4: Duvarlar, Konsensüs ve MEV Sekmelerindeki Tekrar Kartı Kaldırıldı:**
  - `TradeSetupHero` büyük kartı yalnızca `Sinyal` sekmesinde bırakıldı; Duvarlar, Konsensüs ve MEV sekmelerinde ekranın %60'ını kaplaması engellendi, paneller doğrudan görünür kılındı.
- [x] **Task 7.5: Havuz Tablosu & Tipografi Düzenlemesi:**
  - Sütun aralıkları dar mobilde çakışmayacak şekilde yeniden oranlandı (`Örnek`, `Wilson`, `Durum`).
  - Font-mono glif ayrışması (`% 0 . 13`) giderildi (`+0.13%`, `-0.06%`).
- [x] **Task 7.6: Fiyat Formatı & Yüklenme Durumları:**
  - Konsensüs maddelerindeki ham `84634.5` formatı yerel para formatına bağlandı.
  - Duvarlar ve MEV panellerine ilk veri bağlantısı esnasında dönen spinner/loading durumları eklendi.

---

### 5. FAZ 8: Canlı Sinyal Radarı & Çoklu Parite Tarayıcısı (Multi-Coin Screener) (TAMAMLANDI)

- [x] **Task 8.1: Canlı Tarayıcı Motoru (`screenerService.ts`):**
  - Binance Vadeli piyasasındaki en yüksek hacimli 15 parite (BTC, ETH, SOL, BNB, XRP, DOGE, AVAX, LINK, SUI, NEAR, ADA, PEPE, APT, RENDER, ARB) için 24s hacim, fiyat ve son 45 mumu eş zamanlı tarama motoru.
  - Her coin için VWMA (34) ve Gaussian (8) hesaplanarak SATIŞ1, V1 İzlemede, Dinamik TP Yakın ve Yükseliş Trendi durumlarının anlık tespiti.
  - 10 saniyelik akıllı bellek önbelleği ve otomatik periyodik yenileme.
- [x] **Task 8.2: Canlı Sinyal Radarı Arayüzü (`ScreenerModal.tsx`):**
  - Hızlı filtreler: `Tümü`, `🔥 Fırsatlar`, `🔴 SATIŞ1 Aktif`, `🟡 V1 İzleme`, `🟢 TP Yakın`.
  - Canlı geri sayım sayacı (10s), arama çubuğu ve aciliyet skoruna göre sıralama.
  - Tek tıkla ilgili coin'e geçiş (`onSelectCoin`) ve anlık toast bildirimi.
- [x] **Task 8.3: Header & Coin Seçici Entegrasyonu:**
  - `TopBar.tsx` içine neon mor ışıltılı ve canlı nabız atan `📡 Radar (CANLI)` butonu eklendi.
  - `CoinSelectorSheet.tsx` içine doğrudan Radara geçiş sağlayan hızlı buton entegre edildi.

