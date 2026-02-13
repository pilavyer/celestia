# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[2.0.0]: https://github.com/pilavyer/celestia/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/pilavyer/celestia/releases/tag/v1.0.0
