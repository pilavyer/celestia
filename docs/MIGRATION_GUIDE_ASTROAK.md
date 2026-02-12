# Celestia → AstroAK Backend Entegrasyon Rehberi

Bu döküman, AstroAK backend'ine (Express.js, Render.com) Celestia astroloji motorunun entegre edilmesi için adım adım talimatları içerir. Amaç: AstrologyAPI (ücretli 3. parti servis) tamamen kaldırılacak, yerine Celestia'nın lokal hesaplama fonksiyonları kullanılacak.

## Ön Bilgi

- **Celestia repo:** `github.com/pilavyer/celestia` (AGPL-3.0, public)
- **AstroAK backend:** `backend/server.js` (Express.js, Render.com)
- **Mevcut akış:** Frontend → Next.js API routes → Backend → AstrologyAPI
- **Hedef akış:** Frontend → Next.js API routes → Backend → Celestia (lokal import)
- **Frontend'de DEĞİŞİKLİK YOK** — Backend aynı response formatını döndürmeye devam edecek

## Genel Mimari

```
AstroAK Backend (Render.com)
├── server.js              ← Mevcut Express app (endpoint'ler değişecek)
├── celestia/              ← YENİ: Celestia motoru
│   ├── src/
│   │   ├── calculator.js
│   │   ├── synastry.js
│   │   ├── transit.js
│   │   ├── aspects.js
│   │   ├── dignities.js
│   │   ├── timezone.js
│   │   ├── utils.js
│   │   └── constants.js
│   └── ephe/              ← Swiss Ephemeris data dosyaları
├── data/
│   └── retrogrades.json   ← Mevcut (değişmeyecek)
└── package.json           ← sweph + luxon dependency eklenecek
```

---

## ADIM 1: Celestia dosyalarını backend'e kopyala

### Talimat:

1. AstroAK backend klasöründe `celestia/` dizini oluştur:
   ```bash
   cd /path/to/astroak/backend
   mkdir -p celestia
   ```

2. Celestia reposundan `src/` ve `ephe/` klasörlerini kopyala:
   ```bash
   cp -r /path/to/calestia/src celestia/
   cp -r /path/to/calestia/ephe celestia/
   ```

3. `backend/package.json` dosyasına şu dependency'leri ekle (zaten yoksa):
   ```json
   "sweph": "2.10.3-4",
   "luxon": "^3.0.0"
   ```

4. `backend/package.json` dosyasına `"type": "module"` ekle. Eğer backend şu an CommonJS kullanıyorsa (require/module.exports), **iki seçenek var:**

   **Seçenek A (Önerilen):** Backend'i ES modules'a geçir — tüm `require()` → `import`, `module.exports` → `export`

   **Seçenek B:** Celestia'nın src dosyalarını CommonJS'e çevir — daha çok iş, önerilmez

   **NOT:** Mevcut backend `require()` kullanıyor (CommonJS). Celestia ise `import/export` (ES modules). Bu uyumsuzluğu çözmek şart.

5. `npm install` çalıştır ve `sweph` native addon'ının başarıyla derlendiğini doğrula.

### Doğrulama:
- `ls backend/celestia/src/` → 8 JS dosyası görünmeli
- `ls backend/celestia/ephe/` → `.se1` ephemeris dosyaları görünmeli
- `npm install` hatasız tamamlanmalı
- `node -e "import('sweph')"` çalışmalı (ES module test) VEYA `node -e "require('sweph')"` (CommonJS)

### Beklenen Dönüş:
- Dosya yapısı screenshot'ı veya `ls` çıktısı
- `npm install` başarılı mı?
- Backend şu an CommonJS mı (require) yoksa ES modules mı (import)?

---

## ADIM 2: Backend'i ES Modules'a geçir (CommonJS → ESM)

### Neden:
Celestia `import/export` kullanıyor. Backend `require()` kullanıyor. Aynı projede karıştırmak sorun çıkarır.

### Talimat:

1. `backend/package.json` dosyasına `"type": "module"` ekle

2. `backend/server.js` dosyasının başındaki `require()` satırlarını `import`'a çevir:

   **Önceki (CommonJS):**
   ```js
   require('dotenv').config();
   const express = require('express');
   const cors = require('cors');
   const rateLimit = require('express-rate-limit');
   const OpenAI = require('openai');
   const { DateTime } = require('luxon');
   const fs = require('fs');
   const path = require('path');
   ```

   **Sonraki (ES Modules):**
   ```js
   import 'dotenv/config';
   import express from 'express';
   import cors from 'cors';
   import rateLimit from 'express-rate-limit';
   import OpenAI from 'openai';
   import { DateTime } from 'luxon';
   import fs from 'fs';
   import path from 'path';
   import { fileURLToPath } from 'url';

   const __filename = fileURLToPath(import.meta.url);
   const __dirname = path.dirname(__filename);
   ```

3. Dosyanın geri kalanında `require()` kullanılan yer varsa onları da `import`'a çevir.

4. `module.exports` varsa `export` yap (muhtemelen yok, server.js genelde export etmez).

### Doğrulama:
- `node server.js` çalışmalı (mevcut AstrologyAPI ile — henüz Celestia bağlanmadı)
- Tüm mevcut endpoint'ler çalışmaya devam etmeli
- Hiçbir frontend davranışı değişmemeli

### Beklenen Dönüş:
- `node server.js` başarıyla başlıyor mu?
- Mevcut natal/synastry/transit endpoint'leri hala çalışıyor mu?

---

## ADIM 3: Celestia import'larını ekle ve adapter fonksiyonları yaz

### Talimat:

`server.js` dosyasının başına Celestia import'larını ekle:

```js
import { calculateNatalChart } from './celestia/src/calculator.js';
import { calculateSynastry } from './celestia/src/synastry.js';
import { calculateTransits, calculateLunarMetrics, nowToJD } from './celestia/src/transit.js';
```

Ardından şu adapter fonksiyonlarını `server.js` içine ekle (endpoint'lerden ÖNCE):

```js
// ============================================
// Celestia → AstroAK Response Adapter
// ============================================

/**
 * Celestia natal chart sonucunu AstroAK frontend formatına dönüştür.
 * Frontend'de HİÇBİR DEĞİŞİKLİK gerekmez.
 */
function adaptNatalResponse(celestiaResult) {
  // Planets: Celestia formatını AstroAK formatına dönüştür
  const planets = celestiaResult.planets.map(p => ({
    name: p.name,
    sign: p.sign,
    fullDegree: p.longitude,
    normDegree: p.degree + p.minute / 60 + p.second / 3600,
    isRetro: p.isRetrograde,
    house: p.house,
  }));

  // Houses: Celestia formatını AstroAK formatına dönüştür
  const houses = celestiaResult.houses.cusps.map(h => ({
    houseId: h.house,
    sign: h.sign,
    startDegree: h.cusp,
    endDegree: null, // Celestia'da endDegree yok, frontend zaten kullanmıyor
  }));

  // Aspects: Celestia formatını AstroAK formatına dönüştür
  const aspects = celestiaResult.aspects.map(a => ({
    aspecting_planet: a.planet1,
    aspected_planet: a.planet2,
    type: a.type,
    orb: a.orb,
  }));

  return {
    success: true,
    chart: null, // SVG wheel chart — Celestia'da yok, ayrı çözülecek
    planets,
    houses,
    aspects,
    // Celestia'nın ekstra verileri (AI context için çok değerli)
    analysis: celestiaResult.analysis,
    meta: celestiaResult.meta,
  };
}

/**
 * Celestia synastry sonucunu AstroAK frontend formatına dönüştür.
 */
function adaptSynastryResponse(celestiaResult) {
  const adaptPlanets = (planets) => planets.map(p => ({
    name: p.name,
    sign: p.sign,
    full_degree: p.longitude,
    norm_degree: p.degree + p.minute / 60 + p.second / 3600,
    is_retro: p.isRetrograde,
    house: p.house,
  }));

  const adaptHouses = (cusps) => cusps.map(h => ({
    houseId: h.house,
    sign: h.sign,
    startDegree: h.cusp,
    endDegree: null,
  }));

  // Cross-aspects → synastry.aspects formatı
  const aspects = celestiaResult.synastry.crossAspects.map(a => ({
    aspecting_planet: a.planet1,
    aspected_planet: a.planet2,
    type: a.type,
    orb: a.orb,
  }));

  return {
    success: true,
    synastry: {
      first: adaptPlanets(celestiaResult.person1.planets),
      second: adaptPlanets(celestiaResult.person2.planets),
      aspects: aspects,
      // Yeni bonus veriler (frontend kullanmasa bile AI context için)
      houseOverlay: celestiaResult.synastry.houseOverlay,
      composite: celestiaResult.composite,
    },
    houses1: adaptHouses(celestiaResult.person1.houses.cusps),
    houses2: adaptHouses(celestiaResult.person2.houses.cusps),
  };
}

/**
 * Celestia transit sonucunu AstroAK frontend formatına dönüştür.
 */
function adaptTransitResponse(celestiaResult) {
  const adaptTransitList = (list) => list.map(t => ({
    date: t.date,
    transit_planet: t.transitPlanet,
    natal_planet: t.natalPlanet,
    type: t.type,
    orb: t.orb,
    // Ekstra Celestia verileri
    strength: t.strength,
    maxOrb: t.maxOrb,
  }));

  const adaptTimingList = (list) => list.map(t => ({
    transit_planet: t.transitPlanet,
    natal_planet: t.natalPlanet,
    type: t.type,
    orb: t.orb,
    strength: t.strength,
    start_time: t.startTime,
    exact_time: t.exactTime,
    end_time: t.endTime,
  }));

  return {
    success: true,
    monthStartDate: celestiaResult.monthStartDate,
    monthEndDate: celestiaResult.monthEndDate,
    ascendant: celestiaResult.ascendant,
    moonPhase: celestiaResult.moonPhase,
    retrogrades: celestiaResult.retrogrades,
    allTransits: adaptTransitList(celestiaResult.allTransits),
    todayTransits: adaptTransitList(celestiaResult.todayTransits),
    weekTransits: adaptTransitList(celestiaResult.weekTransits),
    weeklyWithTiming: adaptTimingList(celestiaResult.weeklyWithTiming),
    importantTransits: adaptTimingList(celestiaResult.importantTransits),
    allEvents: adaptTimingList(celestiaResult.allEvents),
    lunar: celestiaResult.lunar,
    fetchedAt: celestiaResult.fetchedAt,
  };
}
```

### Doğrulama:
- `node server.js` hatasız başlamalı (import'lar çalışmalı)
- Henüz endpoint'ler değişmemiş olacak, mevcut AstrologyAPI hala aktif

### Beklenen Dönüş:
- Import hataları var mı?
- `node server.js` başlıyor mu?

---

## ADIM 4: Endpoint'leri Celestia'ya geçir

### Talimat:

Her endpoint'i tek tek geçir. Her birini geçirdikten sonra test et.

### 4a: `/api/natal` endpoint'i

Mevcut AstrologyAPI çağrılarını kaldır, Celestia'yı kullan:

```js
app.post('/api/natal', async (req, res) => {
  try {
    const { day, month, year, hour, min, lat, lon, tzone, timezoneName } = req.body;

    if (!day || !month || !year || hour === undefined || min === undefined || !lat || !lon) {
      return res.status(400).json({ error: 'Missing required birth data fields' });
    }

    // IANA timezone kullan (Celestia IANA bekliyor, numeric offset değil)
    if (!timezoneName) {
      return res.status(400).json({
        error: 'timezoneName (IANA format) is required',
        example: 'Europe/Istanbul'
      });
    }

    const chart = calculateNatalChart({
      year: parseInt(year),
      month: parseInt(month),
      day: parseInt(day),
      hour: parseInt(hour),
      minute: parseInt(min),
      latitude: parseFloat(lat),
      longitude: parseFloat(lon),
      timezone: timezoneName,
      houseSystem: 'P',
    });

    const response = adaptNatalResponse(chart);

    // birthData'yı da ekle (uyumluluk için)
    response.birthData = {
      day: parseInt(day),
      month: parseInt(month),
      year: parseInt(year),
      hour: parseInt(hour),
      min: parseInt(min),
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      tzone: parseFloat(tzone || 0),
    };

    res.json(response);
  } catch (error) {
    log.error('Natal Chart Error:', error.message);
    res.status(400).json({ error: error.message });
  }
});
```

### 4b: `/api/synastry` endpoint'i

```js
app.post('/api/synastry', async (req, res) => {
  try {
    const { person1, person2 } = req.body;

    if (!person1 || !person2) {
      return res.status(400).json({ error: 'Both person1 and person2 birth data required' });
    }

    if (!person1.timezoneName || !person2.timezoneName) {
      return res.status(400).json({ error: 'timezoneName required for both persons' });
    }

    const result = calculateSynastry(
      {
        year: parseInt(person1.year),
        month: parseInt(person1.month),
        day: parseInt(person1.day),
        hour: parseInt(person1.hour),
        minute: parseInt(person1.min),
        latitude: parseFloat(person1.lat),
        longitude: parseFloat(person1.lon),
        timezone: person1.timezoneName,
        houseSystem: 'P',
      },
      {
        year: parseInt(person2.year),
        month: parseInt(person2.month),
        day: parseInt(person2.day),
        hour: parseInt(person2.hour),
        minute: parseInt(person2.min),
        latitude: parseFloat(person2.lat),
        longitude: parseFloat(person2.lon),
        timezone: person2.timezoneName,
        houseSystem: 'P',
      }
    );

    res.json(adaptSynastryResponse(result));
  } catch (error) {
    log.error('Synastry Error:', error.message);
    res.status(400).json({ error: error.message });
  }
});
```

### 4c: `/api/transits` endpoint'i

```js
app.post('/api/transits', async (req, res) => {
  try {
    const birthData = req.body.birthData || req.body;

    if (!birthData || !birthData.day || !birthData.month || !birthData.year) {
      return res.status(400).json({ error: 'Birth data required' });
    }

    const timezoneName = birthData.timezoneName || req.body.timezoneName;
    if (!timezoneName) {
      return res.status(400).json({ error: 'timezoneName required' });
    }

    const hour = birthData.hour;
    const min = birthData.min ?? birthData.minute;
    const lat = birthData.lat ?? birthData.latitude;
    const lon = birthData.lon ?? birthData.longitude;

    const result = calculateTransits(
      {
        year: parseInt(birthData.year),
        month: parseInt(birthData.month),
        day: parseInt(birthData.day),
        hour: parseInt(hour),
        minute: parseInt(min),
        latitude: parseFloat(lat),
        longitude: parseFloat(lon),
        timezone: timezoneName,
        houseSystem: 'P',
      },
      {
        days: 30,
        startDate: null,  // bugünden başla
        topN: 10,
      }
    );

    res.json(adaptTransitResponse(result));
  } catch (error) {
    log.error('Transit Error:', error.message);
    res.status(400).json({ error: error.message });
  }
});
```

### 4d: `/api/lunar-metrics` endpoint'i

```js
app.post('/api/lunar-metrics', async (req, res) => {
  try {
    const { day, month, year, hour, min, lat, lon, tzone } = req.body;

    if (!day || !month || !year) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Celestia'nın lunar metrics fonksiyonunu kullan
    const { dateToJD, calculateLunarMetrics: calcLunar } = await import('./celestia/src/transit.js');
    const jd = dateToJD(parseInt(year), parseInt(month), parseInt(day), parseInt(hour || 12));
    const lunar = calcLunar(jd);

    res.json({
      moonSign: lunar.moonSign,
      moonPhase: lunar.moonPhase,
      moonIllumination: lunar.moonIllumination,
      illumination: lunar.moonIllumination,
      moonDay: lunar.moonDay,
      moonAgeInDays: lunar.moonAgeInDays,
      isSuperMoon: lunar.isSuperMoon,
      withinPerigee: lunar.withinPerigee,
      withinApogee: lunar.withinApogee,
    });
  } catch (error) {
    log.error('Lunar Metrics Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch lunar metrics' });
  }
});
```

### 4e: `/api/current-planets` endpoint'i

Bu endpoint zaten `data/retrogrades.json` kullanıyor (lokal). **Değişmesine gerek yok.** Ama isterseniz Celestia'nın gerçek zamanlı retrograd tespitini de ekleyebilirsiniz (opsiyonel).

### 4f: `/api/natal-wheel-chart` endpoint'i

Bu endpoint AstrologyAPI'den SVG alıyordu. **Celestia'da SVG üretimi yok.** Seçenekler:
- (a) Bu endpoint'i tamamen kaldır, frontend'de wheel chart gösterme
- (b) Sadece bu endpoint için AstrologyAPI'yi tut
- (c) Açık kaynak bir SVG chart renderer entegre et (ileride)

**Önerilen:** Şimdilik (b) — sadece SVG için AstrologyAPI'yi tut, diğer tüm hesaplamalar Celestia'dan gelsin. İleride (c) ile tamamen bağımsız ol.

### Doğrulama (her endpoint için):
- Endpoint'e mevcut frontend'den istek at
- Response formatı doğru mu? (Frontend doğru gösteriyor mu?)
- AI context doğru oluşuyor mu?
- Eski AstrologyAPI response'u ile karşılaştır

### Beklenen Dönüş:
- Her endpoint testi sonucu
- Frontend'de görüntüleme sorunları var mı?
- Hata mesajları varsa paylaş

---

## ADIM 5: Temizlik ve deploy

### Talimat:

1. AstrologyAPI ile ilgili kodu kaldır:
   - `fetchWithTimeout` AstrologyAPI çağrıları
   - `ASTROLOGY_API_USER_ID` ve `ASTROLOGY_API_KEY` referansları (SVG hariç)
   - `validateConfig()` içinden AstrologyAPI kontrolü

2. Render.com environment variables:
   - `ASTROLOGY_API_USER_ID` → SVG endpoint tutulacaksa kalsın, yoksa kaldır
   - `ASTROLOGY_API_KEY` → aynı
   - Yeni env gerekmez (Celestia hiçbir API key kullanmaz)

3. Render.com build ayarları:
   - Build command: `npm install` (sweph native derleme için yeterli olmalı)
   - Node.js version: 18+ olmalı
   - Eğer sweph derleme hatası alırsan: `apt-get install build-essential` veya Render.com'da "Native Build" seçeneğini etkinleştir

4. Deploy et ve tüm endpoint'leri test et.

### Doğrulama:
- Render.com build başarılı mı?
- Tüm endpoint'ler production'da çalışıyor mu?
- Frontend normal çalışıyor mu?
- AstrologyAPI faturalandırması durdu mu?

---

## KRİTİK NOT: timezoneName Gereksinimi

Celestia IANA timezone string bekliyor (`"Europe/Istanbul"`), numeric offset değil (`3`).

AstroAK frontend zaten `timezoneName` gönderiyor (geo-details API'den geliyor). Ama eski kayıtlarda `timezoneName` olmayabilir.

**Fallback stratejisi:** Eğer `timezoneName` yoksa, mevcut `calculateTimezoneOffset` fonksiyonunu TERSİNE kullanarak numeric offset'ten IANA timezone tahmin etmeye ÇALIŞMA — bu güvenilmez. Bunun yerine:
1. Frontend'den `timezoneName`'in her zaman gönderildiğinden emin ol
2. Eski kayıtlar için: kullanıcıdan şehrini tekrar seçmesini iste (bir kerelik)

---

## Response Format Özeti

### Natal — AstroAK'ın beklediği format:
```json
{
  "success": true,
  "chart": null,
  "planets": [
    { "name": "Sun", "sign": "Cancer", "fullDegree": 112.7, "normDegree": 22.7, "isRetro": false, "house": 9 }
  ],
  "houses": [
    { "houseId": 1, "sign": "Scorpio", "startDegree": 215.03, "endDegree": null }
  ],
  "aspects": [
    { "aspecting_planet": "Sun", "aspected_planet": "Moon", "type": "Square", "orb": 0.25 }
  ],
  "birthData": { ... }
}
```

### Synastry — AstroAK'ın beklediği format:
```json
{
  "success": true,
  "synastry": {
    "first": [ ... planets ... ],
    "second": [ ... planets ... ],
    "aspects": [ ... cross-aspects ... ]
  },
  "houses1": [ ... ],
  "houses2": [ ... ]
}
```

### Transit — AstroAK'ın beklediği format:
```json
{
  "success": true,
  "monthStartDate": "12-2-2026",
  "monthEndDate": "14-3-2026",
  "ascendant": "Capricorn",
  "moonPhase": "Waning Crescent",
  "retrogrades": [ ... ],
  "allTransits": [ { "date": "...", "transit_planet": "...", "natal_planet": "...", "type": "..." } ],
  "todayTransits": [ ... ],
  "weekTransits": [ ... ],
  "weeklyWithTiming": [ ... ],
  "importantTransits": [ ... ],
  "lunar": { "moonSign": "...", "moonPhase": "...", "moonIllumination": 24.1, ... },
  "fetchedAt": "2026-02-12T..."
}
```
