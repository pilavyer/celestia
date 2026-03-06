# Celestia — Developer Guide

## Project Overview

Celestia is a high-precision astrology calculation engine exposing a REST API. It computes natal charts, synastry (cross-aspects + composite + Davison), transits (with ingresses and VoC Moon), eclipses, relocation charts, and astrocartography using the Swiss Ephemeris (sweph).

## Tech Stack

- **Runtime:** Node.js v18+ (ES modules)
- **Framework:** Express
- **Ephemeris:** sweph (Swiss Ephemeris native binding)
- **Timezone:** Luxon (IANA timezone → UTC with historical DST)
- **Ephemeris Data:** `ephe/` directory contains Swiss Ephemeris data files covering 1800–2400 AD + fixed star catalog (`sefstars.txt`)

## Architecture

### `server.js`
Express app with 8 endpoints: `POST /api/natal-chart`, `POST /api/synastry`, `POST /api/transits`, `POST /api/eclipses`, `POST /api/relocation`, `POST /api/astrocartography`, `GET /api/house-systems`, `GET /health`. Input validation via `toInt()`/`toFloat()` helpers, rate limiting (100 req/15min per IP via `express-rate-limit`), configurable CORS via `CORS_ORIGIN` env var.

### `src/calculator.js`
Main natal chart engine. Takes birth data → timezone conversion → Julian Day → planet positions via `swe.calc()` → house cusps via `swe.houses()` → aspects → analysis (moon phase, Part of Fortune, elements, modalities, hemispheres, stelliums, chart ruler, house rulers, sect, lunar mansion, planetary hour). Supports `nodeType` ('true'|'mean') and `lilithType` ('mean'|'osculating') options. Also exports `calculateRelocationChart()`.

### `src/synastry.js`
Computes two natal charts, then: cross-aspects (planet×planet including ASC/MC), bidirectional house overlay, composite chart using midpoint method, Davison relationship chart (midpoint-in-time), and compatibility score (0-100). Exports `midpoint()` and `calculateSynastry()`.

### `src/transit.js`
Scans planetary positions at 0.5-day intervals over a configurable period. Detects when transit planets enter/exit aspect orbs with natal positions. Uses golden section search (`refineExactTime`) for ~8.6 second exact timing precision. Also computes lunar metrics, ingresses (planet sign changes), and Void of Course Moon. Exports `calculateTransits()`, `calculateIngresses()`, `calculateVoidOfCourseMoon()`.

### `src/eclipses.js`
Solar and lunar eclipse detection using `swe.sol_eclipse_when_glob()` and `swe.lun_eclipse_when()`. Supports year-based and date-range search. Decodes eclipse type bitmasks, estimates Saros series. Optional natal aspect calculation. Exports `calculateEclipses()`.

### `src/astrocartography.js`
Planetary lines (ASC/DSC/MC/IC) across world coordinates. MC/IC lines are vertical based on RA vs ARMC; ASC/DSC lines are curved via latitude scanning. Returns GeoJSON-compatible coordinate arrays. Exports `calculateAstrocartography()`.

### `src/aspects.js`
`calculateAspects()` for intra-chart aspects (triangular loop). `calculateCrossAspects()` for synastry/transit (rectangular loop). Both support luminary orb widening (+25%) and angle orb narrowing (-25%).

### `src/dignities.js`
Planetary dignity lookup table: domicile, exaltation, detriment, fall, peregrine. Extended with `getDignityDetail()` for terms, faces, triplicity, and composite scoring.

### `src/sect.js`
Day/night chart sect analysis. Determines sect luminary, in-sect/out-of-sect benefics and malefics, hayz/halb conditions for all planets. Exports `calculateSect()`.

### `src/lunar-mansions.js`
28 Arabic lunar mansions with Turkish names, element, ruling planet, and meanings. Exports `getLunarMansion()`.

### `src/planetary-hours.js`
Chaldean planetary hour calculation from sunrise/sunset. Exports `calculatePlanetaryHour()`.

### `src/timezone.js`
Converts local birth time to UTC using Luxon. Handles DST spring-forward gaps (throws error) and fall-back ambiguity (warns). Validates IANA timezone IDs.

### `src/utils.js`
Helper functions: `longitudeToSign()`, `determineMoonPhase()`, `calculatePartOfFortune()`, element/modality distribution, hemisphere emphasis, `findPlanetInHouse()`.

### `src/constants.js`
Defines celestial bodies (with Swiss Ephemeris IDs), aspect definitions (angles + orbs), zodiac signs (EN + TR), house systems, elements, modalities, `NODE_TYPES`, `LILITH_TYPES`.

### `docs/`
- `calestia_doc.pdf` — Project documentation
- `MIGRATION_GUIDE_ASTROAK.md` — Guide for embedding Celestia into AstroAK

### `CHANGELOG.md`
Version history in [Keep a Changelog](https://keepachangelog.com) format. Update when releasing new versions.

## Medical Astrology

Medical astrology features are in a separate private package: **celestia-medical**. It depends on this package (`celestia`) and adds 22 health-oriented chart analysis features via `calculateMedicalChart()`.

## Critical Rules

### Julian Day: ET vs UT
- `swe.utc_to_jd()` returns two values: `data[0]` = JD in ET (Ephemeris Time), `data[1]` = JD in UT (Universal Time)
- **Planet calculations** (`swe.calc`) use **JD_ET**
- **House calculations** (`swe.houses`) use **JD_UT**
- Mixing these up produces wrong results — always use the correct one

### IANA Timezone
- Never use raw UTC offsets like "+3" — always use IANA IDs like `"Europe/Istanbul"`
- IANA IDs encode historical DST changes (e.g., Turkey switched to permanent UTC+3 in 2016)
- Luxon handles all historical DST transitions automatically

### Transit Orb Scaling
- Transit orbs = natal orbs × 0.5 (`TRANSIT_ORB_SCALE`)
- Luminary modifier: ×1.25 when Sun or Moon is involved
- Angle modifier: ×0.75 when ASC or MC is involved
- Max possible transit orb: 8 × 0.5 × 1.25 = 5.0° (Conjunction with luminary)

### Coordinate Convention
- West longitudes are **negative** (e.g., New York = -74.01)
- East longitudes are **positive** (e.g., Istanbul = 28.97)
- Swiss Ephemeris `swe.houses()` expects this same convention

## Commands

```bash
npm start        # Start production server (port 3000)
npm run dev      # Start with nodemon (auto-reload)
npm test         # Run 39-test suite
npm run compare  # Run compare.js (dev utility, not committed)

# Verification suite (27,000+ checks)
node verify-precision.js       # Swiss Ephemeris precision (52 checks)
node verify-comprehensive.js   # 40 charts, planet/house/sign (2,765 checks)
node verify-famous-charts.js   # 15 famous charts (658 checks)
node verify-exhaustive.js      # All derived fields: aspects, dignities, PoF, etc. (23,396 checks)
node verify-astrodatabank.js   # 10 Astro-Databank reference charts
```

## Tests

`test.js` contains 39 tests:
- Tests 1-5: Natal chart (Istanbul, DST, New York, high latitude, full output)
- Tests 6-8: Synastry (basic, house overlay, composite midpoint)
- Tests 9-13: Transit (response shape, orb validation, event timing, lunar metrics, aspect angle validation)
- Tests 14-20: Phase 1 (essential dignities, decan, sect, lunar mansions, planetary hours, backward compat, cross-validation)
- Tests 21-27: Phase 2 (Davison, compatibility score, score consistency, relocation, same-location, Davison JD, backward compat)
- Tests 28-35: Phase 4 (eclipses 2026, NASA 2024 verification, natal aspects, date range, ingresses, ingress order, VoC Moon, backward compat)
- Tests 36-39: Phase 5 (Mean Node/Osc Lilith, astrocartography structure, ASC/DSC lines, backward compat)

Run with `node test.js` — all tests should print "PASS".

## Environment Variables

- `PORT` — Server port (default: 3000)
- `CORS_ORIGIN` — Allowed CORS origin (default: `*` for development)

## Security

- `compare.js` and `verify-synastry.js` contain API keys — they are in `.gitignore` and must NEVER be committed
- Rate limiting: 100 requests per 15 minutes per IP on `/api/` routes
- No other secrets or environment variables are required to run the project
