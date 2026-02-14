# Celestia — Developer Guide

## Project Overview

Celestia is a high-precision astrology calculation engine exposing a REST API. It computes natal charts, synastry (cross-aspects + composite), and planetary transits using the Swiss Ephemeris (sweph).

## Tech Stack

- **Runtime:** Node.js v18+ (ES modules)
- **Framework:** Express
- **Ephemeris:** sweph (Swiss Ephemeris native binding)
- **Timezone:** Luxon (IANA timezone → UTC with historical DST)
- **Ephemeris Data:** `ephe/` directory contains Swiss Ephemeris data files covering 1800–2400 AD

## Architecture

### `server.js`
Express app with 5 endpoints: `POST /api/natal-chart`, `POST /api/synastry`, `POST /api/transits`, `GET /api/house-systems`, `GET /health`. Input validation and error handling per endpoint.

### `src/calculator.js`
Main natal chart engine. Takes birth data → timezone conversion → Julian Day → planet positions via `swe.calc_ut()` → house cusps via `swe.houses()` → aspects → analysis (moon phase, Part of Fortune, elements, modalities, hemispheres, stelliums).

### `src/synastry.js`
Computes two natal charts, then: cross-aspects (planet×planet including ASC/MC), bidirectional house overlay (person1's planets in person2's houses and vice versa), and composite chart using midpoint method. Exports `midpoint()` and `calculateSynastry()`.

### `src/transit.js`
Scans planetary positions at 0.5-day intervals over a configurable period. Detects when transit planets enter/exit aspect orbs with natal positions. Uses golden section search (`refineExactTime`) for ~8.6 second exact timing precision. Also computes lunar metrics (phase, illumination, moon day, supermoon detection).

### `src/aspects.js`
`calculateAspects()` for intra-chart aspects (triangular loop). `calculateCrossAspects()` for synastry/transit (rectangular loop). Both support luminary orb widening (+25%) and angle orb narrowing (-25%).

### `src/dignities.js`
Planetary dignity lookup table: domicile, exaltation, detriment, fall, peregrine.

### `src/timezone.js`
Converts local birth time to UTC using Luxon. Handles DST spring-forward gaps (throws error) and fall-back ambiguity (warns). Validates IANA timezone IDs.

### `src/utils.js`
Helper functions: `longitudeToSign()`, `determineMoonPhase()`, `calculatePartOfFortune()`, element/modality distribution, hemisphere emphasis, `findPlanetInHouse()`.

### `src/medical.js`
Medical astrology module. Lookup tables for sign→body areas, planet→body systems, house→health domains, critical degrees, average planetary speeds, medical Arabic parts, Dorothean triplicity, Egyptian terms, Chaldean faces, Lilly dignity scores, 22 medical fixed stars catalog, OOB medical interpretations, progressed Moon health themes (12 signs), 23 Ebertin medical midpoint pairs, traditional rulers, and exaltation rulers. Functions: `getBodyAreas()`, `getCombustionStatus()` (cazimi/combust/under beams), `getCriticalDegree()`, `getSpeedClassification()`, `calculateProfection()` (annual profection with year lord), `calculateMedicalArabicParts()` (6 medical lots), `calculateAntiscia()` (antiscion/contra-antiscion with hidden connections), `calculatePlanetaryStrength()` (Lilly-system essential+accidental dignity scoring with mutual reception bonus), `findMutualReceptions()` (domicile/exaltation/mixed), `buildDispositorChain()` (final dispositor + chain tracing), `calculateAlmutenFiguris()` (5 hylegical points dignity scoring), `isVoidOfCourse()` (natal VoC Moon detection). Fixed star conjunctions, declination, parallel aspects, secondary progressions, solar return, medical midpoints, and prenatal lunation (bisection-based syzygy search) are computed in `calculator.js`.

### `src/constants.js`
Defines celestial bodies (with Swiss Ephemeris IDs), aspect definitions (angles + orbs), zodiac signs (EN + TR), house systems, elements, and modalities.

### `docs/`
- `calestia_doc.pdf` — Project documentation
- `MIGRATION_GUIDE_ASTROAK.md` — Guide for embedding Celestia into AstroAK

### `CHANGELOG.md`
Version history in [Keep a Changelog](https://keepachangelog.com) format. Update when releasing new versions.

## Critical Rules

### Julian Day: ET vs UT
- `swe.utc_to_jd()` returns two values: `data[0]` = JD in ET (Ephemeris Time), `data[1]` = JD in UT (Universal Time)
- **Planet calculations** (`swe.calc_ut`) use **JD_ET**
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
npm test         # Run 42-test suite (natal, synastry, transit, medical, strength, stars, declination, progressions, solar return, midpoints, mutual reception, dispositor, VoC, prenatal lunation, almuten)
npm run compare  # Run compare.js (dev utility, not committed)
```

## Tests

`test.js` contains 42 tests:
- Tests 1-5: Natal chart (Istanbul, DST, New York, high latitude, full output)
- Tests 6-8: Synastry (basic, house overlay, composite midpoint)
- Tests 9-13: Transit (response shape, orb validation, event timing, lunar metrics, aspect angle validation)
- Tests 14-20: Medical astrology (body areas, combustion, critical degrees, speed analysis, profection, Arabic parts, antiscia)
- Tests 21-23: Planetary strength (Lilly score + breakdown consistency + known dignity validation)
- Tests 24-28: Fixed stars (conjunctions), declination (values, planet fields, OOB consistency), parallel aspects
- Tests 29-30: Secondary progressions (age/solarArc/progressedMoon + progressed aspects to natal)
- Tests 31-32: Solar return (sun accuracy < 0.01° + health analysis structure)
- Tests 33-35: Medical midpoints (catalog/Mars-Saturn + 90° dial natal contacts + wrap-around validation)
- Tests 36-37: Mutual reception (detection + strength bonus) and dispositor chain (final dispositor + chain tracing)
- Tests 38-39: Void of Course Moon (isVoid + degreesRemaining) and prenatal lunation (syzygy type + JD before birth)
- Tests 40-42: Almuten Figuris (scores + hylegical points consistency) and mutual reception bonus consistency

Run with `node test.js` — all tests should print "BASARILI" (success).

## Security

- `compare.js` and `verify-synastry.js` contain API keys — they are in `.gitignore` and must NEVER be committed
- No other secrets or environment variables are required to run the project
