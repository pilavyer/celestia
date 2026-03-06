# Celestia

High-precision astrology calculation engine powered by Swiss Ephemeris. Calculates natal charts, synastry (cross-aspects + composite + Davison), transits (with ingresses + VoC Moon), eclipses, relocation charts, and astrocartography via a REST API.

## Features

- **Natal Charts** — 13+ celestial bodies (Sun through Pluto, Chiron, True/Mean Node, Mean/Osculating Lilith, South Node) with 0.001 arcsec precision
- **Synastry** — Cross-aspects, house overlays, composite chart, Davison relationship chart, compatibility score (0-100)
- **Transits** — Planetary transits against natal chart with exact timing, event windows, strength scoring, ingresses, and Void of Course Moon
- **Eclipses** — Solar/lunar eclipse search by year or date range, NASA-verified, with optional natal aspects
- **Relocation** — Same birth time recalculated for a different location (new houses/ASC/MC)
- **Astrocartography** — Planetary lines (ASC/DSC/MC/IC) across world coordinates in GeoJSON format
- **Lunar Metrics** — Moon phase, illumination, moon day, supermoon/perigee/apogee detection
- **8 House Systems** — Placidus, Koch, Whole Sign, Equal, Alcabitius, Regiomontanus, Porphyry, Campanus
- **7 Aspect Types** — Conjunction, Opposition, Trine, Square, Sextile, Quincunx, Semi-sextile with applying/separating detection
- **Planetary Dignities** — Domicile, exaltation, detriment, fall + detailed terms, faces, triplicity, dignity score
- **Sect Analysis** — Day/night chart, hayz/halb conditions, sect luminary
- **Lunar Mansions** — 28 Arabic mansions with Turkish names
- **Planetary Hours** — Chaldean planetary hour calculation
- **IANA Timezone Support** — Historical DST handling via Luxon
- **Bilingual Output** — English + Turkish labels on all entities
- **Chart Analysis** — Moon phase, Part of Fortune, element/modality distribution, hemisphere emphasis, stellium detection, chart ruler, house rulers

## Requirements

- Node.js v18+
- macOS: Xcode Command Line Tools (`xcode-select --install`) for native `sweph` compilation

## Quick Start

```bash
git clone https://github.com/pilavyer/celestia.git
cd celestia
npm install
npm start        # http://localhost:3000
npm run dev      # auto-reload with nodemon
npm test         # run test suite (39 tests)
```

> **Medical Astrology** features (planetary strength, fixed stars, progressions, midpoints, etc.) are in a separate private package: [`calestia-medical`](https://github.com/pilavyer/calestia-medical).

## API Reference

### `POST /api/natal-chart`

Calculate a full natal chart.

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `year` | number | Yes | Birth year |
| `month` | number | Yes | Birth month (1-12) |
| `day` | number | Yes | Birth day |
| `hour` | number | Yes | Birth hour (0-23) |
| `minute` | number | Yes | Birth minute (0-59) |
| `latitude` | number | Yes | Birth latitude (north positive) |
| `longitude` | number | Yes | Birth longitude (east positive, west negative) |
| `timezone` | string | Yes | IANA timezone ID (e.g. `"Europe/Istanbul"`) |
| `houseSystem` | string | No | House system code, default `"P"` (Placidus) |
| `nodeType` | string | No | `"true"` (default) or `"mean"` — True Node vs Mean Node |
| `lilithType` | string | No | `"mean"` (default) or `"osculating"` — Mean Lilith vs Osculating Lilith |

```bash
curl -X POST http://localhost:3000/api/natal-chart \
  -H "Content-Type: application/json" \
  -d '{
    "year": 1990, "month": 7, "day": 15,
    "hour": 14, "minute": 30,
    "latitude": 41.0082, "longitude": 28.9784,
    "timezone": "Europe/Istanbul"
  }'
```

**Response:** Planet positions (sign, degree, house, dignity, dignityDetail, decan, retrograde), house cusps, aspects with strength, analysis (moon phase, Part of Fortune, elements, modalities, hemispheres, stelliums, sect, lunar mansion, planetary hour, chart ruler, house rulers), metadata.

<details>
<summary>Example response (abbreviated)</summary>

```json
{
  "input": {
    "localTime": "1990-07-15T14:30",
    "timezone": "Europe/Istanbul",
    "utcTime": "1990-07-15T11:30:00.000Z",
    "coordinates": { "latitude": 41.0082, "longitude": 28.9784 },
    "offsetHours": 3,
    "isDST": true
  },
  "planets": [
    {
      "name": "Sun", "trName": "Güneş",
      "longitude": 112.726913, "sign": "Cancer",
      "degree": 22, "minute": 43, "second": 37,
      "isRetrograde": false, "dignity": "peregrine", "house": 9,
      "decan": 3, "decanRuler": "Moon",
      "dignityDetail": {
        "domicile": false, "exaltation": false, "detriment": false, "fall": false,
        "peregrine": true, "termRuler": "Jupiter", "faceRuler": "Moon",
        "essentialScore": -5
      },
      "formattedPosition": "22°43'37\" Cancer"
    }
  ],
  "houses": {
    "system": "P", "systemName": "Placidus",
    "cusps": [
      { "house": 1, "cusp": 215.037781, "sign": "Scorpio", "degree": 5, "minute": 2 }
    ],
    "ascendant": { "longitude": 215.037781, "sign": "Scorpio", "degree": 5, "minute": 2 },
    "midheaven": { "longitude": 130.070622, "sign": "Leo", "degree": 10, "minute": 4 }
  },
  "aspects": [
    {
      "planet1": "Sun", "planet2": "Jupiter",
      "type": "Conjunction", "symbol": "☌",
      "actualAngle": 0.18, "orb": 0.18, "strength": 98,
      "isApplying": false
    }
  ],
  "analysis": {
    "sunSign": "Cancer", "moonSign": "Aries", "risingSign": "Scorpio",
    "isDayChart": true,
    "moonPhase": { "phase": "Last Quarter", "phaseTr": "Son Dördün" },
    "partOfFortune": { "sign": "Leo", "degree": 5, "minute": 17 },
    "elements": { "Fire": 1, "Earth": 3, "Air": 1, "Water": 5, "dominant": "Water" },
    "modalities": { "Cardinal": 5, "Fixed": 2, "Mutable": 3, "dominant": "Cardinal" },
    "stelliums": [{ "sign": "Capricorn", "planets": ["Saturn","Uranus","Neptune"], "count": 3 }],
    "sect": {
      "chartSect": "Gündüz Haritası",
      "luminary": "Güneş",
      "planets": [{ "name": "Sun", "condition": "Kısmi Hayz", "inSect": true }]
    },
    "lunarMansion": { "number": 2, "name": "Al-Butain", "trName": "Küçük Karın" },
    "planetaryHour": { "planet": "Sun", "planetTr": "Güneş", "hourNumber": 8, "isDay": true },
    "chartRuler": { "planet": "Pluto", "sign": "Scorpio", "house": 1 },
    "houseRulers": [{ "house": 1, "cuspSign": "Scorpio", "ruler": "Pluto", "rulerHouse": 1 }]
  },
  "meta": {
    "julianDayET": 2448090.97916667,
    "engine": "sweph (Swiss Ephemeris Node.js binding)",
    "version": "4.0.0"
  }
}
```
</details>

---

### `POST /api/synastry`

Calculate synastry between two people: individual natal charts, cross-aspects, house overlays, composite chart, Davison relationship chart, and compatibility score.

**Request body:**

```json
{
  "person1": { "year": 1998, "month": 11, "day": 25, "hour": 10, "minute": 17, "latitude": 41.2867, "longitude": 36.33, "timezone": "Europe/Istanbul" },
  "person2": { "year": 2000, "month": 3, "day": 15, "hour": 14, "minute": 30, "latitude": 39.9208, "longitude": 32.8541, "timezone": "Europe/Istanbul" }
}
```

Each person object has the same fields as the natal-chart endpoint.

**Response:** Both natal charts (`person1`, `person2`), `synastry` (cross-aspects with `score` 0-100, house overlay in both directions), `composite` (midpoint planets, houses, aspects, analysis), `davison` (midpoint-in-time relationship chart with full natal structure).

<details>
<summary>Example response (abbreviated)</summary>

```json
{
  "person1": { "planets": [], "houses": {}, "aspects": [], "analysis": {} },
  "person2": { "planets": [], "houses": {}, "aspects": [], "analysis": {} },
  "synastry": {
    "crossAspects": [
      { "planet1": "Sun", "planet2": "Mercury", "type": "Square", "orb": 0.05, "strength": 99 }
    ],
    "houseOverlay": {
      "person1InPerson2Houses": [{ "planet": "Sun", "sign": "Sagittarius", "house": 4 }],
      "person2InPerson1Houses": [{ "planet": "Sun", "sign": "Pisces", "house": 2 }]
    },
    "score": {
      "score": 63, "scoreLabel": "Balanced", "scoreTr": "Dengeli",
      "harmony": 91.14, "tension": 52.61
    }
  },
  "composite": {
    "planets": [{ "name": "Sun", "sign": "Aquarius", "longitude": 299.04 }],
    "houses": { "ascendant": { "sign": "Scorpio" } },
    "aspects": []
  },
  "davison": {
    "midpointDate": "1999-07-21T10:24:00.000Z",
    "midpointLocation": { "latitude": 40.6038, "longitude": 34.5921 },
    "planets": [], "houses": {}, "aspects": [], "analysis": {}
  }
}
```
</details>

---

### `POST /api/transits`

Calculate current planetary transits against a natal chart.

**Request body:** Same natal fields as `/api/natal-chart`, plus:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `days` | number | No | Scan period in days (1-365, default 30) |
| `startDate` | string | No | Start date `"YYYY-MM-DD"` (default: now) |
| `topN` | number | No | Number of important transits to return (default 10) |

```bash
curl -X POST http://localhost:3000/api/transits \
  -H "Content-Type: application/json" \
  -d '{
    "year": 1998, "month": 11, "day": 25,
    "hour": 10, "minute": 17,
    "latitude": 41.2867, "longitude": 36.33,
    "timezone": "Europe/Istanbul",
    "days": 30, "startDate": "2026-02-12", "topN": 10
  }'
```

**Response:** `allTransits`, `todayTransits`, `weekTransits`, `weeklyWithTiming`, `importantTransits` (top N by strength), `allEvents` (full event list with start/exact/end times), `lunar` (moon metrics + VoC data), `retrogrades`, `ingresses` (planet sign changes), metadata.

<details>
<summary>Example response (abbreviated)</summary>

```json
{
  "success": true,
  "periodDays": 30,
  "ascendant": "Capricorn",
  "allTransits": [
    { "transitPlanet": "Sun", "natalPlanet": "Mars", "type": "Quincunx", "orb": 0.0, "strength": 100 }
  ],
  "ingresses": [
    {
      "planet": "Moon", "planetTr": "Ay",
      "fromSign": "Leo", "toSign": "Virgo",
      "exactTime": "2026-03-02T12:34:00.000Z"
    },
    {
      "planet": "Mars", "planetTr": "Mars",
      "fromSign": "Aquarius", "toSign": "Pisces",
      "exactTime": "2026-03-02T14:16:00.000Z"
    }
  ],
  "lunar": {
    "moonSign": "Libra", "moonPhase": "Waning Gibbous",
    "moonIllumination": 93.6, "moonDay": 18,
    "isVoidOfCourse": false,
    "vocStartTime": "2026-03-06T18:57:19.000Z",
    "vocEndTime": "2026-03-07T04:02:39.000Z",
    "lastAspect": { "planet": "Chiron", "type": "Opposition" },
    "nextIngress": { "sign": "Scorpio", "time": "2026-03-07T04:02:39.000Z" }
  },
  "meta": { "engine": "Celestia (Swiss Ephemeris)", "transitOrbScale": 0.5 }
}
```
</details>

---

### `POST /api/eclipses`

Search for solar and lunar eclipses by year or date range.

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `year` | number | Either year or startDate+endDate | Year to search (1800-2400) |
| `startDate` | string | Either year or startDate+endDate | Start date `"YYYY-MM-DD"` |
| `endDate` | string | Either year or startDate+endDate | End date `"YYYY-MM-DD"` |
| `natal` | object | No | Birth data for natal aspect calculation |

```bash
curl -X POST http://localhost:3000/api/eclipses \
  -H "Content-Type: application/json" \
  -d '{ "year": 2026 }'
```

**Response:** Array of eclipses with type, subtype, date, longitude, sign, degree, Saros series. If natal data provided, includes aspects to natal planets.

<details>
<summary>Example response (abbreviated)</summary>

```json
{
  "eclipses": [
    {
      "type": "solar", "subType": "annular",
      "date": "2026-02-17T12:00:00.000Z",
      "longitude": 328.83, "sign": "Aquarius", "degree": 28,
      "sarosSeriesEstimate": 121
    },
    {
      "type": "lunar", "subType": "total",
      "date": "2026-03-03T11:33:00.000Z",
      "longitude": 162.84, "sign": "Virgo", "degree": 12,
      "sarosSeriesEstimate": 112
    }
  ],
  "meta": { "count": 4, "solar": 2, "lunar": 2 }
}
```
</details>

---

### `POST /api/relocation`

Calculate a relocation chart — same birth time, different location.

**Request body:** Same natal fields as `/api/natal-chart`, plus:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `newLatitude` | number | Yes | New location latitude |
| `newLongitude` | number | Yes | New location longitude |
| `newHouseSystem` | string | No | House system for relocation (default: same as natal) |

```bash
curl -X POST http://localhost:3000/api/relocation \
  -H "Content-Type: application/json" \
  -d '{
    "year": 1990, "month": 7, "day": 15, "hour": 14, "minute": 30,
    "latitude": 41.01, "longitude": 28.97, "timezone": "Europe/Istanbul",
    "newLatitude": 40.7128, "newLongitude": -74.0060
  }'
```

**Response:** Full natal chart structure with recalculated houses/ASC/MC for the new location. Planet positions remain identical to the natal chart.

---

### `POST /api/astrocartography`

Calculate planetary lines across the world map.

**Request body:** Same natal fields as `/api/natal-chart`, plus:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `longitudeStep` | number | No | Longitude step in degrees (default 10) |
| `planets` | array | No | Filter to specific planets (e.g. `["Sun", "Moon"]`) |
| `lineTypes` | array | No | Filter to specific line types (e.g. `["MC", "ASC"]`) |

**Response:** Planetary lines with GeoJSON-compatible coordinate arrays for MC, IC, ASC, and DSC lines per planet.

---

### `GET /api/house-systems`

List all supported house systems with descriptions.

<details>
<summary>Example response</summary>

```json
{
  "P": { "name": "Placidus", "description": "Most common Western system (default)" },
  "K": { "name": "Koch", "description": "Similar to Placidus, preferred by some European astrologers" },
  "W": { "name": "Whole Sign", "description": "Oldest system, Hellenistic astrology. Works at all latitudes" },
  "E": { "name": "Equal", "description": "Each house 30°, starting from ASC" },
  "B": { "name": "Alcabitius", "description": "Medieval Arabic astrology" },
  "R": { "name": "Regiomontanus", "description": "Preferred in horary astrology" },
  "O": { "name": "Porphyry", "description": "Simplest quadrant system" },
  "C": { "name": "Campanus", "description": "Space-based division" }
}
```
</details>

### `GET /health`

Health check.

```json
{ "status": "ok", "engine": "celestia", "version": "4.0.0" }
```

## Project Structure

```
celestia/
├── docs/
│   ├── calestia_doc.pdf              # Project documentation
│   └── MIGRATION_GUIDE_ASTROAK.md    # AstroAK embedding guide
├── ephe/                              # Swiss Ephemeris data files
│   ├── seas_18.se1                    # Asteroid data (1800-2400 AD)
│   ├── sefstars.txt                   # Fixed star catalog
│   ├── semo_18.se1                    # Moon data (1800-2400 AD)
│   └── sepl_18.se1                    # Planet data (1800-2400 AD)
├── src/
│   ├── calculator.js       # Natal chart engine + relocation
│   ├── synastry.js         # Synastry: cross-aspects, composite, Davison, score
│   ├── transit.js          # Transits: scanning, timing, ingresses, VoC Moon
│   ├── eclipses.js         # Solar/lunar eclipse search
│   ├── astrocartography.js # Planetary lines across world coordinates
│   ├── aspects.js          # Aspect calculation (intra-chart + cross-chart)
│   ├── dignities.js        # Planetary dignity table + detailed terms/faces/triplicity
│   ├── sect.js             # Day/night chart sect analysis
│   ├── lunar-mansions.js   # 28 Arabic lunar mansions
│   ├── planetary-hours.js  # Chaldean planetary hours
│   ├── timezone.js         # IANA timezone to UTC conversion (Luxon)
│   ├── utils.js            # Longitude→sign, moon phase, Part of Fortune, etc.
│   └── constants.js        # Celestial bodies, aspects, signs, house systems, NODE_TYPES, LILITH_TYPES
├── .editorconfig            # Editor settings (2-space indent, UTF-8, LF)
├── .gitignore               # Git ignore rules
├── CHANGELOG.md             # Version history
├── CLAUDE.md                # AI developer guide
├── LICENSE                  # AGPL-3.0
├── server.js                # Express REST API (8 endpoints)
├── test.js                  # Test suite (39 tests)
└── package.json
```

## Coordinate Notes

- **West longitudes are negative:** New York = -74.01, London = -0.12
- **East longitudes are positive:** Istanbul = 28.97, Tokyo = 139.69
- Always use IANA timezone IDs, never raw UTC offsets

## License

AGPL-3.0. Swiss Ephemeris is developed by Astrodienst AG. For commercial closed-source use, a professional license must be obtained from [Astrodienst](https://www.astro.com/swisseph/).
