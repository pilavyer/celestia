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
- **Chart Analysis** — Moon phase, Part of Fortune, element/modality distribution, hemisphere emphasis, stellium detection

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
npm test         # run 13-test suite
```

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

---

### `GET /api/house-systems`

List all supported house systems with descriptions.

### `GET /health`

Health check. Returns `{ status, engine, version }`.

## Project Structure

```
celestia/
├── ephe/               # Swiss Ephemeris data files (1800-2400 AD)
├── src/
│   ├── calculator.js   # Natal chart calculation engine
│   ├── synastry.js     # Synastry: cross-aspects, house overlay, composite
│   ├── transit.js      # Transit engine: scanning, exact timing, lunar metrics
│   ├── aspects.js      # Aspect calculation (intra-chart + cross-chart)
│   ├── dignities.js    # Planetary dignity table
│   ├── timezone.js     # IANA timezone to UTC conversion (Luxon)
│   ├── utils.js        # Longitude→sign, moon phase, Part of Fortune, etc.
│   └── constants.js    # Celestial bodies, aspects, signs, house systems
├── server.js           # Express REST API (5 endpoints)
├── test.js             # Test suite (13 tests)
└── package.json
```

## Coordinate Notes

- **West longitudes are negative:** New York = -74.01, London = -0.12
- **East longitudes are positive:** Istanbul = 28.97, Tokyo = 139.69
- Always use IANA timezone IDs, never raw UTC offsets

## License

AGPL-3.0. Swiss Ephemeris is developed by Astrodienst AG. For commercial closed-source use, a professional license must be obtained from [Astrodienst](https://www.astro.com/swisseph/).
