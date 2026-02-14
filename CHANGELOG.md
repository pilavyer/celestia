# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2026-02-14

### Added
- **Medical astrology module** (`src/medical.js`): 11 features for health-oriented chart analysis
- **Body area mapping**: each planet enriched with `bodyAreas` combining planet and sign body rulerships
- **Combustion status**: cazimi (≤0.283°), combust (≤8.5°), under the beams (≤17°), or free for each planet relative to the Sun
- **Critical degrees**: cardinal (0°, 13°, 26°), fixed (9°, 21°), mutable (4°, 17°) and anaretic (29°) detection
- **Speed classification**: stationary, slow, average, or fast based on planet's speed ratio to its average
- **Annual profection**: active house, year lord, and year lord's natal position based on current age
- **Medical Arabic parts**: 6 health-related lots (Illness, Surgery, Healing, Vitality, Crisis, Death) with house placement
- **Antiscia & contra-antiscia**: mirror points on Cancer-Capricorn and Aries-Libra axes with hidden connection detection
- **Planetary strength score** (Lilly system): essential dignity (domicile, exaltation, Dorothean triplicity, Egyptian terms, Chaldean faces, peregrine) + accidental dignity (angular/succedent/cadent) + modifiers (retrograde, combustion, speed) with full breakdown and strength label
- `healthDomain` field added to each house cusp (e.g., house 6 → "acute illness, daily health and hygiene")
- `planetaryStrength` field added to each planet with `totalScore`, `breakdown`, `strength`, `strengthTr`
- `analysis.medicalAstrology` section in natal chart output containing profection, Arabic parts, and antiscia
- **Fixed star conjunctions**: 22 medically significant stars (Algol, Regulus, Antares, Spica, Fomalhaut, etc.) with planet proximity detection via `swe.fixstar2_ut()`
- **Declination & parallel aspects**: equatorial declination for all planets, Out-of-Bounds detection (|dec| > 23.44°) with medical notes, parallel (conjunction effect) and contra-parallel (opposition effect) aspect calculation
- **Secondary progressions**: day-for-a-year method with all 13 progressed planet positions, solar arc ASC/MC advancement, progressed Moon sign with health theme (12-sign PROGRESSED_MOON_HEALTH lookup), and progressed-to-natal aspects (1° orb, 5 aspect types)
- **Solar return**: bisection search (`findExactSunReturn`) for exact JD when Sun returns to natal degree (< 0.01° accuracy), full return chart with planets/ASC/MC at birth coordinates, health analysis (6th/8th/12th house lords, malefic/benefic placement, risk level 0-10)
- **Medical midpoints** (Ebertin system): 23 medically significant planet pairs, shortest-arc midpoint calculation (`calcMidpoint`), 90° dial natal contacts (0°/90°/180°/270° with 1.5° orb), Mars/Saturn midpoint highlighted as critical priority
- `ephe/sefstars.txt` — Swiss Ephemeris fixed star catalog (1602 stars)
- 22 new tests (Tests 14-35): body areas, combustion, critical degrees, speed analysis, profection, Arabic parts, antiscia, planetary strength score, breakdown consistency, known dignity validation, fixed star conjunctions, declination values, planet declination fields, parallel aspects, OOB consistency, secondary progressions (structure + aspects), solar return (accuracy + health analysis), medical midpoints (catalog + contacts + wrap-around)

## [2.0.0] - 2026-02-12

### Added
- **Synastry module** (`src/synastry.js`): cross-aspects (planet×planet including ASC/MC), bidirectional house overlays, composite chart via midpoint method
- **Transit module** (`src/transit.js`): planetary transit scanning at 0.5-day intervals, golden section search for exact timing (~8.6s precision), event windows (start/exact/end)
- **Lunar metrics**: moon phase, illumination percentage, moon day, supermoon/perigee/apogee detection
- **Retrograde detection** for transit planets
- `POST /api/synastry` endpoint
- `POST /api/transits` endpoint
- Cross-chart aspect calculation (`calculateCrossAspects`) with configurable orb scaling
- Transit orb scaling (natal orbs × 0.5) with luminary (+25%) and angle (-25%) modifiers
- 8 new tests (Tests 6-13): synastry, house overlay, composite midpoint, transit shape/orb/timing/lunar/aspect validation
- `docs/` directory with project documentation PDF and AstroAK migration guide
- CLAUDE.md developer guide
- AGPL-3.0 license

### Changed
- Upgraded package.json metadata (keywords, repository, description)
- README.md rewritten with full API reference for all 5 endpoints

## [1.0.0] - 2026-02-11

### Added
- **Natal chart engine** (`src/calculator.js`): 13 celestial bodies (Sun–Pluto, Chiron, True Node, Lilith, South Node) via Swiss Ephemeris
- **Aspect calculation** (`src/aspects.js`): 7 aspect types (conjunction, opposition, trine, square, sextile, quincunx, semi-sextile) with applying/separating detection
- **Planetary dignities** (`src/dignities.js`): domicile, exaltation, detriment, fall lookup table
- **Timezone conversion** (`src/timezone.js`): IANA timezone to UTC via Luxon with DST handling
- **Chart analysis**: moon phase, Part of Fortune, element/modality distribution, hemisphere emphasis, stellium detection
- 8 house systems: Placidus, Koch, Whole Sign, Equal, Alcabitius, Regiomontanus, Porphyry, Campanus
- `POST /api/natal-chart` endpoint
- `GET /api/house-systems` endpoint
- `GET /health` endpoint
- Express REST API (`server.js`) with input validation and error handling
- Swiss Ephemeris data files covering 1800–2400 AD (`ephe/`)
- 5 natal chart tests (Tests 1-5)

[2.1.0]: https://github.com/pilavyer/celestia/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/pilavyer/celestia/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/pilavyer/celestia/releases/tag/v1.0.0
