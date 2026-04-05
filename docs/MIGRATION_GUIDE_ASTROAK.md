# Celestia → AstroAK Integration Guide

Integration guide for using the Celestia astrology engine with AstroAK. Covers both AstroAK v2 (current, Next.js) and v1 (legacy, Express/Render.com) architectures.

> **Celestia v4.0.0** — 8 endpoints, 13+ celestial bodies, 8 house systems, sect analysis, dignity detail, lunar mansions, planetary hours, and more.

---

## Table of Contents

- [AstroAK v2 Integration (Next.js)](#astroak-v2-integration-nextjs)
  - [Architecture](#v2-architecture)
  - [Base Configuration](#v2-base-configuration)
  - [All Endpoints](#v2-all-endpoints)
  - [Common Request Fields](#common-request-fields)
  - [Optional Parameters](#optional-parameters)
  - [Response Field Reference](#response-field-reference)
  - [TypeScript Integration Examples](#typescript-integration-examples)
  - [Calestia-Pro Integration](#calestia-pro-integration)
- [AstroAK v1 Integration (Legacy)](#astroak-v1-integration-legacy-express)
- [Critical Rules](#critical-rules)

---

## AstroAK v2 Integration (Next.js)

### V2 Architecture

AstroAK v2 is a Next.js application that calls the Celestia REST API directly. No adapter layer needed — Celestia responses are used as-is.

```
AstroAK v2 (Next.js on Vercel)
├── app/api/                    ← Next.js API routes (server-side)
│   ├── natal/route.ts          ← fetch('http://api.astroak.com/api/natal-chart', ...)
│   ├── synastry/route.ts       ← fetch('http://api.astroak.com/api/synastry', ...)
│   ├── transits/route.ts       ← fetch('http://api.astroak.com/api/transits', ...)
│   ├── eclipses/route.ts       ← fetch('http://api.astroak.com/api/eclipses', ...)
│   ├── relocation/route.ts     ← fetch('http://api.astroak.com/api/relocation', ...)
│   └── astrocartography/route.ts ← fetch('http://api.astroak.com/api/astrocartography', ...)
└── ...

Celestia API (Express on api.astroak.com)
├── server.js                   ← 8 endpoints
├── src/                        ← Calculation engine
└── ephe/                       ← Swiss Ephemeris data
```

**Domain strategy:**
- `astroak.com` → AstroAK v2 (Next.js)
- `v1.astroak.com` → AstroAK v1 (legacy PWA, 1200+ users)
- `api.astroak.com` → Celestia REST API

### V2 Base Configuration

```typescript
// lib/celestia.ts
const CELESTIA_BASE_URL = process.env.CELESTIA_API_URL || 'http://localhost:3000';

interface BirthData {
  year: number;
  month: number;      // 1-12
  day: number;
  hour: number;       // 0-23
  minute: number;     // 0-59
  latitude: number;   // north positive, south negative
  longitude: number;  // east positive, WEST NEGATIVE
  timezone: string;   // IANA timezone ID (e.g. "Europe/Istanbul")
}

async function celestiaFetch<T>(endpoint: string, body: object): Promise<T> {
  const res = await fetch(`${CELESTIA_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || `Celestia API error: ${res.status}`);
  }
  return res.json();
}
```

### V2 All Endpoints

#### 1. `GET /health`

Health check. No body needed.

```typescript
const health = await fetch(`${CELESTIA_BASE_URL}/health`);
// { "status": "ok", "engine": "celestia", "version": "4.0.0" }
```

#### 2. `POST /api/natal-chart`

Full natal chart with planets, houses, aspects, and analysis.

```typescript
const chart = await celestiaFetch('/api/natal-chart', {
  year: 1998, month: 11, day: 25,
  hour: 10, minute: 17,
  latitude: 41.2867, longitude: 36.33,
  timezone: 'Europe/Istanbul',
  // Optional:
  houseSystem: 'P',        // default Placidus (P|K|W|E|B|R|O|C)
  nodeType: 'true',        // 'true' (default) or 'mean'
  lilithType: 'mean',      // 'mean' (default) or 'osculating'
});
```

**Response structure:**
```
{
  input: { localTime, timezone, utcTime, coordinates, offsetHours, isDST },
  planets: [
    {
      name, trName,                    // "Sun", "Gunes"
      longitude,                       // 0-360 ecliptic longitude
      sign, degree, minute, second,    // "Sagittarius", 2, 24, 15
      isRetrograde,                    // boolean
      dignity,                         // "domicile" | "exaltation" | "detriment" | "fall" | "peregrine"
      house,                           // 1-12
      decan, decanRuler,               // 1-3, "Jupiter"
      dignityDetail: {                 // NEW in v4
        domicile, exaltation, detriment, fall, peregrine,  // booleans
        termRuler, faceRuler,          // planet names
        essentialScore,                // -10 to +10
      },
      formattedPosition,               // "2°24'15\" Sagittarius"
    }
  ],
  houses: {
    system, systemName,                // "P", "Placidus"
    cusps: [{ house, cusp, sign, degree, minute }],  // 12 cusps
    ascendant: { longitude, sign, degree, minute },
    midheaven: { longitude, sign, degree, minute },
  },
  aspects: [
    {
      planet1, planet2,                // "Sun", "Moon"
      type, symbol,                    // "Conjunction", "☌"
      actualAngle, orb, strength,      // 0.18, 0.18, 98
      isApplying,                      // boolean
    }
  ],
  analysis: {
    sunSign, moonSign, risingSign,     // "Sagittarius", "Aquarius", "Capricorn"
    isDayChart,                        // boolean
    moonPhase: { phase, phaseTr, angle },
    partOfFortune: { sign, degree, minute },
    elements: { Fire, Earth, Air, Water, dominant },
    modalities: { Cardinal, Fixed, Mutable, dominant },
    hemispheres: { eastern, western, northern, southern, dominantHorizontal, dominantVertical },
    stelliums: [{ sign, planets, count }],
    sect: {                            // NEW in v4
      chartSect,                       // "Gunduz Haritasi" | "Gece Haritasi"
      luminary,                        // "Gunes" | "Ay"
      planets: [{ name, condition, inSect }],  // "Tam Hayz", true
    },
    lunarMansion: {                    // NEW in v4
      number, name, trName,            // 2, "Al-Butain", "Kucuk Karin"
      element, rulingPlanet, meaning, meaningTr,
    },
    planetaryHour: {                   // NEW in v4
      planet, planetTr,                // "Sun", "Gunes"
      hourNumber, isDay,               // 8, true
    },
    chartRuler: { planet, sign, house },  // NEW in v4
    houseRulers: [{ house, cuspSign, ruler, rulerHouse }],  // NEW in v4
  },
  meta: { julianDayET, engine, version },
}
```

#### 3. `POST /api/synastry`

Two natal charts + cross-aspects + composite + Davison + score.

```typescript
const synastry = await celestiaFetch('/api/synastry', {
  person1: {
    year: 1998, month: 11, day: 25, hour: 10, minute: 17,
    latitude: 41.2867, longitude: 36.33, timezone: 'Europe/Istanbul',
  },
  person2: {
    year: 2000, month: 3, day: 15, hour: 14, minute: 30,
    latitude: 39.9208, longitude: 32.8541, timezone: 'Europe/Istanbul',
  },
});
```

**Response structure:**
```
{
  person1: { planets, houses, aspects, analysis },   // Full natal chart
  person2: { planets, houses, aspects, analysis },   // Full natal chart
  synastry: {
    crossAspects: [{ planet1, planet2, type, orb, strength, isApplying }],
    houseOverlay: {
      person1InPerson2Houses: [{ planet, sign, house }],
      person2InPerson1Houses: [{ planet, sign, house }],
    },
    score: {
      score,                 // 0-100
      scoreLabel,            // "Harmonious" | "Balanced" | "Challenging" | ...
      scoreTr,               // Turkish label
      harmony, tension,      // raw scores
    },
  },
  composite: { planets, houses, aspects, analysis },  // Midpoint chart
  davison: {                                          // Midpoint-in-time chart
    midpointDate, midpointLocation,
    planets, houses, aspects, analysis,
  },
}
```

#### 4. `POST /api/transits`

Planetary transits against natal chart with timing, ingresses, and VoC Moon.

```typescript
const transits = await celestiaFetch('/api/transits', {
  year: 1998, month: 11, day: 25,
  hour: 10, minute: 17,
  latitude: 41.2867, longitude: 36.33,
  timezone: 'Europe/Istanbul',
  // Optional:
  days: 30,                   // scan period (1-365, default 30)
  startDate: '2026-04-01',   // default: today
  topN: 10,                  // top N important transits (default 10)
});
```

**Response structure:**
```
{
  success: true,
  periodDays: 30,
  ascendant: "Capricorn",
  allTransits: [{ transitPlanet, natalPlanet, type, orb, strength }],
  todayTransits: [...],
  weekTransits: [...],
  weeklyWithTiming: [{ transitPlanet, natalPlanet, type, orb, strength, startTime, exactTime, endTime }],
  importantTransits: [...],    // Top N by strength
  allEvents: [...],            // Full event list with start/exact/end
  ingresses: [                 // Planet sign changes
    { planet, planetTr, fromSign, toSign, exactTime },
  ],
  lunar: {
    moonSign, moonPhase, moonIllumination, moonDay,
    isSuperMoon, withinPerigee, withinApogee,
    isVoidOfCourse,            // boolean
    vocStartTime, vocEndTime,  // ISO timestamps
    lastAspect: { planet, type },
    nextIngress: { sign, time },
  },
  retrogrades: [{ planet, isRetrograde }],
  meta: { engine, transitOrbScale },
}
```

#### 5. `POST /api/eclipses`

Solar and lunar eclipse search by year or date range.

```typescript
// By year
const eclipses = await celestiaFetch('/api/eclipses', {
  year: 2026,
});

// By date range
const eclipses = await celestiaFetch('/api/eclipses', {
  startDate: '2026-01-01',
  endDate: '2026-12-31',
});

// With natal aspects
const eclipses = await celestiaFetch('/api/eclipses', {
  year: 2026,
  natal: {
    year: 1998, month: 11, day: 25, hour: 10, minute: 17,
    latitude: 41.2867, longitude: 36.33, timezone: 'Europe/Istanbul',
  },
});
```

**Response structure:**
```
{
  eclipses: [
    {
      type: "solar" | "lunar",
      subType: "total" | "annular" | "partial" | "penumbral",
      date,                    // ISO timestamp
      longitude, sign, degree, // ecliptic position
      sarosSeriesEstimate,     // Saros cycle number
      natalAspects: [          // only if natal data provided
        { planet, type, orb },
      ],
    }
  ],
  meta: { count, solar, lunar },
}
```

#### 6. `POST /api/relocation`

Same birth time, different location — recalculates houses/ASC/MC.

```typescript
const relocation = await celestiaFetch('/api/relocation', {
  year: 1998, month: 11, day: 25,
  hour: 10, minute: 17,
  latitude: 41.2867, longitude: 36.33,
  timezone: 'Europe/Istanbul',
  // Required:
  newLatitude: 40.7128,
  newLongitude: -74.0060,   // New York (west = negative!)
  // Optional:
  newHouseSystem: 'P',
});
```

**Response:** Full natal chart structure with recalculated houses/ASC/MC for the new location. Planet positions remain identical.

#### 7. `POST /api/astrocartography`

Planetary lines across world coordinates for mapping.

```typescript
const astro = await celestiaFetch('/api/astrocartography', {
  year: 1998, month: 11, day: 25,
  hour: 10, minute: 17,
  latitude: 41.2867, longitude: 36.33,
  timezone: 'Europe/Istanbul',
  // Optional:
  longitudeStep: 10,              // degrees (default 10)
  planets: ['Sun', 'Moon'],       // filter planets (default: all)
  lineTypes: ['MC', 'ASC'],       // filter lines (default: all)
});
```

**Response structure:**
```
{
  lines: [
    {
      planet: "Sun",
      lineType: "MC",            // MC | IC | ASC | DSC
      coordinates: [             // GeoJSON-compatible
        { latitude, longitude },
        ...
      ],
    }
  ],
  meta: { ... },
}
```

#### 8. `GET /api/house-systems`

List all supported house systems.

```typescript
const systems = await fetch(`${CELESTIA_BASE_URL}/api/house-systems`);
// Returns: { P: { name: "Placidus", description: "..." }, K: {...}, ... }
```

**Supported systems:** Placidus (P), Koch (K), Whole Sign (W), Equal (E), Alcabitius (B), Regiomontanus (R), Porphyry (O), Campanus (C).

### Common Request Fields

All chart calculation endpoints share these fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `year` | number | Yes | Birth year |
| `month` | number | Yes | Birth month (1-12) |
| `day` | number | Yes | Birth day |
| `hour` | number | Yes | Birth hour (0-23) |
| `minute` | number | Yes | Birth minute (0-59) |
| `latitude` | number | Yes | North positive, south negative |
| `longitude` | number | Yes | East positive, **west negative** |
| `timezone` | string | Yes | IANA timezone ID (`"Europe/Istanbul"`) |

### Optional Parameters

| Field | Endpoint | Default | Values |
|-------|----------|---------|--------|
| `houseSystem` | natal-chart, synastry | `"P"` | `P` `K` `W` `E` `B` `R` `O` `C` |
| `nodeType` | natal-chart | `"true"` | `"true"` (True Node), `"mean"` (Mean Node) |
| `lilithType` | natal-chart | `"mean"` | `"mean"` (Mean Lilith), `"osculating"` (Osc. Lilith) |
| `days` | transits | `30` | 1-365 (scan period) |
| `startDate` | transits | today | `"YYYY-MM-DD"` |
| `topN` | transits | `10` | Number of top transits |
| `year` | eclipses | — | Year to search (1800-2400) |
| `startDate`/`endDate` | eclipses | — | Date range alternative |
| `natal` | eclipses | — | Birth data for natal aspects |
| `newLatitude`/`newLongitude` | relocation | — | Required: target location |
| `longitudeStep` | astrocartography | `10` | Resolution in degrees |
| `planets` | astrocartography | all | Filter to specific planets |
| `lineTypes` | astrocartography | all | Filter to MC/IC/ASC/DSC |

### Response Field Reference

#### Planet Object Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | English name (`"Sun"`, `"Moon"`, ..., `"True Node"`, `"Lilith"`, `"South Node"`) |
| `trName` | string | Turkish name |
| `longitude` | number | 0-360 ecliptic longitude |
| `sign` | string | Zodiac sign |
| `degree` | number | Degree within sign (0-29) |
| `minute` | number | Arc-minute (0-59) |
| `second` | number | Arc-second (0-59) |
| `isRetrograde` | boolean | Retrograde motion |
| `dignity` | string | `"domicile"` `"exaltation"` `"detriment"` `"fall"` `"peregrine"` |
| `house` | number | House placement (1-12) |
| `decan` | number | Decanate (1-3) |
| `decanRuler` | string | Chaldean decan ruler planet |
| `dignityDetail` | object | Extended dignity scoring (terms, faces, triplicity, essentialScore) |
| `formattedPosition` | string | Human-readable position |

#### 14 Celestial Bodies

Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, Chiron, True Node (or Mean Node), Lilith (Mean or Osculating), South Node.

#### 7 Aspect Types

| Type | Angle | Default Orb |
|------|-------|-------------|
| Conjunction | 0° | 8° |
| Opposition | 180° | 8° |
| Trine | 120° | 7° |
| Square | 90° | 7° |
| Sextile | 60° | 5° |
| Quincunx | 150° | 2° |
| Semi-sextile | 30° | 2° |

Modifiers: Luminary (Sun/Moon) = orb × 1.25, Angle (ASC/MC) = orb × 0.75, Transit = orb × 0.5.

### TypeScript Integration Examples

#### Next.js API Route — Natal Chart

```typescript
// app/api/natal/route.ts
import { NextRequest, NextResponse } from 'next/server';

const CELESTIA_URL = process.env.CELESTIA_API_URL!;

export async function POST(req: NextRequest) {
  const body = await req.json();

  const res = await fetch(`${CELESTIA_URL}/api/natal-chart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      year: body.year,
      month: body.month,
      day: body.day,
      hour: body.hour,
      minute: body.minute,
      latitude: body.latitude,
      longitude: body.longitude,
      timezone: body.timezone,
      houseSystem: body.houseSystem || 'P',
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    return NextResponse.json({ error: error.error }, { status: res.status });
  }

  const chart = await res.json();
  return NextResponse.json(chart);
}
```

#### Next.js API Route — Transits with AI Context

```typescript
// app/api/transits/route.ts
import { NextRequest, NextResponse } from 'next/server';

const CELESTIA_URL = process.env.CELESTIA_API_URL!;

export async function POST(req: NextRequest) {
  const { birthData, days, startDate } = await req.json();

  const res = await fetch(`${CELESTIA_URL}/api/transits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...birthData,
      days: days || 30,
      startDate: startDate || undefined,
      topN: 10,
    }),
  });

  const transits = await res.json();

  // Build AI context from transit data
  const aiContext = buildTransitContext(transits);

  return NextResponse.json({ ...transits, aiContext });
}

function buildTransitContext(transits: any): string {
  const lines: string[] = [];

  // Top transits
  if (transits.importantTransits?.length) {
    lines.push('Important transits:');
    transits.importantTransits.forEach((t: any) => {
      lines.push(`- ${t.transitPlanet} ${t.type} natal ${t.natalPlanet} (orb: ${t.orb}°, strength: ${t.strength})`);
    });
  }

  // VoC Moon
  if (transits.lunar?.isVoidOfCourse) {
    lines.push(`Moon is Void of Course until ${transits.lunar.vocEndTime}`);
  }

  // Ingresses
  if (transits.ingresses?.length) {
    lines.push('Upcoming sign changes:');
    transits.ingresses.slice(0, 5).forEach((i: any) => {
      lines.push(`- ${i.planet}: ${i.fromSign} → ${i.toSign} at ${i.exactTime}`);
    });
  }

  return lines.join('\n');
}
```

### Calestia-Pro Integration

For advanced features (fixed stars, asteroids, returns, progressions, firdaria, draconic, harmonics, sidereal, vedic, etc.), use [calestia-pro](https://github.com/pilavyer/calestia-pro) as a direct import library. Calestia-Pro has no HTTP API — it's a pure calculation library.

```typescript
// Import calestia-pro functions directly (server-side only)
import {
  calculateSolarReturn,
  calculateSecondaryProgressions,
  calculateFirdaria,
  calculateVedicChart,
  calculateZodiacalReleasing,
  calculateProfections,
  findStarConjunctions,
  calculateChartAsteroids,
} from 'calestia-pro/src/index.js';

// All calestia-pro functions take a natal chart object (from Celestia API)
const chart = await celestiaFetch('/api/natal-chart', birthData);

const solarReturn = calculateSolarReturn(chart, 2026, { latitude: 41.01, longitude: 28.97 });
const progressions = calculateSecondaryProgressions(chart, '2026-06-15');
const firdaria = calculateFirdaria(chart);
const vedic = calculateVedicChart(chart, 'lahiri');
const zr = calculateZodiacalReleasing(chart, 'fortune', '2026-06-15');
const profections = calculateProfections(chart, '2026-06-15');
const starConjunctions = findStarConjunctions(chart);
const asteroids = calculateChartAsteroids(chart);
```

> **Note:** Calestia-Pro requires the `ephe/` directory (symlinked from `../celestia/ephe`) and `sweph` native dependency. It must run server-side.

---

## AstroAK v1 Integration (Legacy Express)

> **This section is for the legacy AstroAK v1 (Express.js on Render.com).** For v2 (Next.js), see above.

### V1 Architecture

AstroAK v1 embedded Celestia as a local import inside an Express backend, replacing the third-party AstrologyAPI.

```
AstroAK v1 Backend (Express on Render.com)
├── server.js              ← Express app with adapter functions
├── celestia/              ← Celestia engine (copied into backend)
│   ├── src/
│   └── ephe/
└── package.json           ← sweph + luxon dependencies
```

**Flow:** Frontend (PWA) → Next.js API routes → Express Backend → Celestia (local import)

### V1 Setup Steps

1. Copy `celestia/src/` and `celestia/ephe/` into the Express backend directory
2. Add `sweph` and `luxon` to backend `package.json`
3. Migrate backend to ES modules (`"type": "module"`)
4. Import Celestia functions and write adapter functions to convert Celestia response format to AstroAK v1 format
5. Switch endpoints one by one, test each

### V1 Adapter Functions

AstroAK v1 expects a different response format than Celestia's native output. Adapter functions convert between formats:

```js
import { calculateNatalChart } from './celestia/src/calculator.js';
import { calculateSynastry } from './celestia/src/synastry.js';
import { calculateTransits } from './celestia/src/transit.js';

// Natal adapter: Celestia → AstroAK v1 format
function adaptNatalResponse(celestiaResult) {
  return {
    success: true,
    chart: null,
    planets: celestiaResult.planets.map(p => ({
      name: p.name,
      sign: p.sign,
      fullDegree: p.longitude,
      normDegree: p.degree + p.minute / 60 + p.second / 3600,
      isRetro: p.isRetrograde,
      house: p.house,
    })),
    houses: celestiaResult.houses.cusps.map(h => ({
      houseId: h.house,
      sign: h.sign,
      startDegree: h.cusp,
      endDegree: null,
    })),
    aspects: celestiaResult.aspects.map(a => ({
      aspecting_planet: a.planet1,
      aspected_planet: a.planet2,
      type: a.type,
      orb: a.orb,
    })),
    analysis: celestiaResult.analysis,
    meta: celestiaResult.meta,
  };
}
```

### V1 Response Formats

**Natal (AstroAK v1 format):**
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
  "birthData": { "day": 15, "month": 7, "year": 1990, "hour": 14, "min": 30, "lat": 41.01, "lon": 28.97, "tzone": 3 }
}
```

### V1 IANA Timezone Note

Celestia requires IANA timezone strings (`"Europe/Istanbul"`), not numeric offsets (`3`). The AstroAK v1 frontend sends `timezoneName` from the geo-details API. For older records without `timezoneName`, the user must re-select their city.

---

## Critical Rules

### 1. West Longitudes Are Negative

```
Istanbul:  latitude: 41.01,  longitude:  28.97   ✅
New York:  latitude: 40.71,  longitude: -74.01   ✅ (west = negative)
London:    latitude: 51.51,  longitude:  -0.12   ✅ (west = negative)
Tokyo:     latitude: 35.68,  longitude: 139.69   ✅
```

### 2. Always Use IANA Timezone IDs

```
"Europe/Istanbul"     ✅
"America/New_York"    ✅
"Asia/Tokyo"          ✅
"+3"                  ❌ (doesn't encode historical DST changes)
3                     ❌
"UTC+3"               ❌
```

### 3. Julian Day ET vs UT

- `swe.calc()` — uses **JD_ET** (Ephemeris Time) for planet positions
- `swe.houses()` — uses **JD_UT** (Universal Time) for house cusps
- Mixing these produces ~32-34 arcsecond errors

### 4. Rate Limiting

Celestia API has rate limiting: **100 requests per 15 minutes per IP**. For high-traffic applications, consider:
- Caching natal chart results (they never change for the same birth data)
- Caching transit results for short periods (e.g., 1 hour)
- Running multiple Celestia instances behind a load balancer

### 5. Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Celestia server port |
| `CORS_ORIGIN` | `*` | Allowed CORS origin (set to your domain in production) |

### 6. Swiss Ephemeris Compilation

`sweph` is a native N-API addon. It compiles C code during `npm install`.

- **macOS:** Requires Xcode Command Line Tools (`xcode-select --install`)
- **Linux:** Requires `build-essential` (`apt-get install build-essential`)
- **Node.js:** v18+ required
