# Celestia

High-precision natal chart calculation engine powered by Swiss Ephemeris. Open-source astrology API.

## Features

- Swiss Ephemeris (0.001 arcsec precision) with full ephemeris data files
- 13 celestial bodies: Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, Chiron, True Node, Lilith + South Node
- 8 house systems: Placidus, Koch, Whole Sign, Equal, Alcabitius, Regiomontanus, Porphyry, Campanus
- 7 aspect types with applying/separating detection and strength scoring
- Planetary dignities (domicile, exaltation, detriment, fall)
- IANA timezone support with historical DST handling
- Moon phase, Part of Fortune, element/modality distribution, hemisphere emphasis, stellium detection
- Bilingual output (English + Turkish)

## Requirements

- Node.js v18+
- macOS: Xcode Command Line Tools (`xcode-select --install`) for native sweph compilation

## Installation

```bash
git clone https://github.com/pilavyer/celestia.git
cd celestia
npm install
```

## Usage

### Start the API server

```bash
# Production
npm start

# Development (auto-reload)
npm run dev
```

### API Endpoints

#### `POST /api/natal-chart`

Calculate a natal chart.

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

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| year | number | Yes | Birth year |
| month | number | Yes | Birth month (1-12) |
| day | number | Yes | Birth day |
| hour | number | Yes | Birth hour (0-23) |
| minute | number | Yes | Birth minute (0-59) |
| latitude | number | Yes | Birth location latitude (north positive) |
| longitude | number | Yes | Birth location longitude (east positive, west negative) |
| timezone | string | Yes | IANA timezone ID (e.g. "Europe/Istanbul") |
| houseSystem | string | No | House system code, default "P" (Placidus) |

**Response includes:** planet positions, house cusps, aspects, dignities, moon phase, Part of Fortune, element/modality distribution, hemisphere emphasis, stelliums, and metadata.

#### `GET /api/house-systems`

List supported house systems.

#### `GET /health`

Health check.

### Run tests

```bash
npm test
```

## Coordinate Notes

- **West longitudes are negative:** New York = -74.01, London = -0.12
- **East longitudes are positive:** Istanbul = 28.97, Tokyo = 139.69
- Always use IANA timezone IDs, never raw UTC offsets

## Project Structure

```
celestia/
├── ephe/               # Swiss Ephemeris data files (1800-2400 AD)
├── src/
│   ├── calculator.js   # Main calculation engine
│   ├── timezone.js     # IANA timezone to UTC conversion
│   ├── aspects.js      # Aspect calculation
│   ├── dignities.js    # Planetary dignities
│   ├── utils.js        # Helper functions
│   └── constants.js    # Constants and configuration
├── server.js           # Express REST API
├── test.js             # Test suite
└── package.json
```

## License

AGPL-3.0. Swiss Ephemeris is developed by Astrodienst AG. For commercial closed-source use, a professional license must be obtained from [Astrodienst](https://www.astro.com/swisseph/).
