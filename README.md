# Celestia

High-precision astrology calculation engine powered by Swiss Ephemeris. Calculates natal charts, synastry (cross-aspects + composite), and planetary transits via a REST API.

## Features

- **Natal Charts** — 13 celestial bodies (Sun through Pluto, Chiron, True Node, Lilith, South Node) with 0.001 arcsec precision
- **Synastry** — Cross-aspects, house overlays, and composite chart (midpoint method)
- **Transits** — Planetary transits against natal chart with exact timing, event windows, and strength scoring
- **Lunar Metrics** — Moon phase, illumination, moon day, supermoon/perigee/apogee detection
- **8 House Systems** — Placidus, Koch, Whole Sign, Equal, Alcabitius, Regiomontanus, Porphyry, Campanus
- **7 Aspect Types** — Conjunction, Opposition, Trine, Square, Sextile, Quincunx, Semi-sextile with applying/separating detection
- **Planetary Dignities** — Domicile, exaltation, detriment, fall
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
npm test         # run test suite (13 tests)
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

**Response:** Planet positions (sign, degree, house, dignity, retrograde), house cusps, aspects with strength, moon phase, Part of Fortune, element/modality distribution, hemisphere emphasis, stelliums, metadata.

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
    "stelliums": [{ "sign": "Capricorn", "planets": ["Saturn","Uranus","Neptune"], "count": 3 }]
  },
  "meta": {
    "julianDayET": 2448090.97916667,
    "engine": "sweph (Swiss Ephemeris Node.js binding)",
    "version": "3.0.0"
  }
}
```
</details>

---

### `POST /api/synastry`

Calculate synastry between two people: individual natal charts, cross-aspects, house overlays, and composite chart.

**Request body:**

```json
{
  "person1": { "year": 1998, "month": 11, "day": 25, "hour": 10, "minute": 17, "latitude": 41.2867, "longitude": 36.33, "timezone": "Europe/Istanbul" },
  "person2": { "year": 2000, "month": 3, "day": 15, "hour": 14, "minute": 30, "latitude": 39.9208, "longitude": 32.8541, "timezone": "Europe/Istanbul" }
}
```

Each person object has the same fields as the natal-chart endpoint.

**Response:** Both natal charts (`person1`, `person2`), `synastry` (cross-aspects, house overlay in both directions), `composite` (midpoint planets, houses, aspects, element/modality analysis).

<details>
<summary>Example response (abbreviated)</summary>

```json
{
  "person1": {
    "input": { "localTime": "1998-11-25T10:17", "timezone": "Europe/Istanbul" },
    "planets": [ { "name": "Sun", "sign": "Sagittarius", "house": 10 } ],
    "houses": { "system": "P", "ascendant": { "sign": "Capricorn" } },
    "aspects": [],
    "analysis": { "sunSign": "Sagittarius", "moonSign": "Leo" }
  },
  "person2": {
    "input": { "localTime": "2000-03-15T14:30", "timezone": "Europe/Istanbul" },
    "planets": [ { "name": "Sun", "sign": "Pisces", "house": 8 } ],
    "houses": { "system": "P", "ascendant": { "sign": "Leo" } },
    "aspects": [],
    "analysis": { "sunSign": "Pisces", "moonSign": "Capricorn" }
  },
  "synastry": {
    "crossAspects": [
      {
        "planet1": "Sun", "planet2": "Mercury",
        "type": "Square", "symbol": "□",
        "orb": 0.05, "strength": 99, "isApplying": false
      }
    ],
    "houseOverlay": {
      "person1InPerson2Houses": [
        { "planet": "Sun", "sign": "Sagittarius", "house": 4 }
      ],
      "person2InPerson1Houses": [
        { "planet": "Sun", "sign": "Pisces", "house": 2 }
      ]
    }
  },
  "composite": {
    "planets": [
      { "name": "Sun", "sign": "Aquarius", "longitude": 299.04, "house": 1 }
    ],
    "houses": {
      "ascendant": { "sign": "Scorpio" },
      "midheaven": { "sign": "Virgo" }
    },
    "aspects": [],
    "analysis": {
      "elements": { "Fire": 2, "Earth": 3, "Air": 2, "Water": 3, "dominant": "Earth" }
    }
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

**Response:** `allTransits` (deduplicated), `todayTransits`, `weekTransits`, `weeklyWithTiming`, `importantTransits` (top N by strength), `allEvents` (full event list with start/exact/end times), `lunar` (moon metrics), `retrogrades`, metadata.

<details>
<summary>Example response (abbreviated)</summary>

```json
{
  "success": true,
  "monthStartDate": "12-2-2026",
  "monthEndDate": "14-3-2026",
  "periodDays": 30,
  "ascendant": "Capricorn",
  "moonPhase": "Waning Crescent",
  "retrogrades": [
    { "planet": "Mars", "planetTr": "Mars", "sign": "Cancer" }
  ],
  "allTransits": [
    {
      "transitPlanet": "Sun", "transitPlanetTr": "Güneş",
      "natalPlanet": "Mars", "natalPlanetTr": "Mars",
      "type": "Quincunx", "symbol": "⚻",
      "orb": 0.0, "maxOrb": 1.56, "strength": 100
    }
  ],
  "importantTransits": [
    {
      "transitPlanet": "Mars", "natalPlanet": "Moon",
      "type": "Conjunction", "symbol": "☌",
      "orb": 0.001, "strength": 100,
      "startTime": "2026-02-11T00:01:12.000Z",
      "exactTime": "2026-02-11T00:01:12.000Z",
      "endTime": "2026-02-15T00:01:09.000Z"
    }
  ],
  "lunar": {
    "moonSign": "Capricorn", "moonSignTr": "Oğlak",
    "moonPhase": "Waning Crescent", "moonPhaseTr": "Hilal (Küçülen)",
    "moonIllumination": 13.5,
    "moonDay": 27, "moonAgeInDays": 26,
    "isSuperMoon": false
  },
  "meta": {
    "engine": "Celestia (Swiss Ephemeris)",
    "transitOrbScale": 0.5
  }
}
```
</details>

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
{ "status": "ok", "engine": "celestia", "version": "3.0.0" }
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
│   ├── calculator.js   # Natal chart calculation engine
│   ├── synastry.js     # Synastry: cross-aspects, house overlay, composite
│   ├── transit.js      # Transit engine: scanning, exact timing, lunar metrics
│   ├── aspects.js      # Aspect calculation (intra-chart + cross-chart)
│   ├── dignities.js    # Planetary dignity table
│   ├── timezone.js     # IANA timezone to UTC conversion (Luxon)
│   ├── utils.js        # Longitude→sign, moon phase, Part of Fortune, etc.
│   └── constants.js    # Celestial bodies, aspects, signs, house systems
├── .editorconfig        # Editor settings (2-space indent, UTF-8, LF)
├── .gitignore           # Git ignore rules
├── CHANGELOG.md         # Version history
├── CLAUDE.md            # AI developer guide
├── LICENSE              # AGPL-3.0
├── server.js            # Express REST API (5 endpoints)
├── test.js              # Test suite (13 tests)
└── package.json
```

## Coordinate Notes

- **West longitudes are negative:** New York = -74.01, London = -0.12
- **East longitudes are positive:** Istanbul = 28.97, Tokyo = 139.69
- Always use IANA timezone IDs, never raw UTC offsets

## License

AGPL-3.0. Swiss Ephemeris is developed by Astrodienst AG. For commercial closed-source use, a professional license must be obtained from [Astrodienst](https://www.astro.com/swisseph/).
