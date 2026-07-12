# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.12.2] - 2026-07-12

### Fixed
- Person-add guidance: the bot was inventing manual UI steps ("go to My People menu, tap New Person, step 1-2-3") — it can't see the site chrome. Doctrine now points only to the contextual "Add person" card that appears under the answer (data prefilled via done.action); no fabricated menu navigation.

## [4.12.3] - 2026-07-12

### Fixed
- Person-add guidance actually applied (4.12.2 was a silent no-op due to anchor mismatch): bot points only to the contextual "Add person" button, no invented menu steps.

## [4.13.0] - 2026-07-12

### Fixed
- Follow-up suggestion quality: enforced first-person user-voice, content-specific questions directed at the bot (no bot-asks-user phrasing, no clichés).

## [4.12.1] - 2026-07-12

### Fixed
- `visuals.natalChart` now carries `houseSystem: 'Placidus'` and `polarHousesUnstable: true` for births above |66.5°| latitude — where the site's chart endpoint falls back to Whole Sign while get_natal_profile keeps Placidus, so house numbers would disagree with the SVG wheel. The site skips the wheel (keeps the consistent text summary) when the flag is set. Verified: normal latitude → no flag, 78°N → flag set.

## [4.12.0] - 2026-07-12

### Added
- **`done.visuals.natalChart`** — structured birth-chart data for the site's natal-wheel component inside chat: planets (sign/deg/house/retro), ascendant, midheaven, full element & modality counts, stelliums, chart ruler, and tight natal aspects (≤3° orb, nature-tagged). Emitted whenever get_natal_profile runs; the site can render it inline on person-add and behind a "Show chart" toggle otherwise.
- **Atmospheric status messages** (all 6 locales): "Reading your sky chart…", "Comparing today's sky with your chart…", "Interpreting what the stars say…" etc. — premium feel while staying honest (no false real-time-NASA claims).

## [4.11.1] - 2026-07-12

### Security (critical — beta finding)
- **Fabrication-under-pressure closed**: on repeated insistence ("just look without adding"), the model would eventually invent a full natal chart for an UNREGISTERED person (violating the core "numbers only from tools" rule). Doctrine now enforces a hard tool-precondition (no astrological claim about a person without a real tool call first; tools only callable for registered people) plus an explicit insist-resistance clause ("never say 'I found the record', hold the line every time"). Verified: 3x insistence now resists on all three turns.

## [4.11.0] - 2026-07-12

### Added
- **`done.suggestions`** (≤3 short strings) via silent `suggest_followups` tool: contextual follow-up questions generated per answer in the user's language (validated/capped server-side; skipped on greetings/refusals). Completes the follow-up-chips backlog with real contextual content instead of static rules.

## [4.10.0] - 2026-07-12

### Added
- **`done.action` contract + `suggest_add_person` silent tool**: when the user asks about an unregistered person, the model emits a structured signal — `action: { type: 'addPersonSuggested', name, date?, time?, city? }` (date normalized to YYYY-MM-DD, fields validated/capped, never fabricated) — enabling the site's contextual prefilled "Add person" chip (Brief #18 v2). The tool is invisible: no status event, no user-facing mention of mechanics.

## [4.9.2] - 2026-07-12

### Security
- Internal-architecture leakage closed (beta finding): the bot mentioned "tools", "IDs" and engine names when explaining its limits. Doctrine now bans internal terminology in user-facing text (engine names moved to internal-only note in the identity section) and mandates user-language explanations of capability limits.

## [4.9.1] - 2026-07-12

### Changed
- Doctrine formatting rule aligned with reality: *italic* and up to 2-3 short `###` headings now allowed in long answers (site renders both correctly since Brief #17); tables and deep nesting still banned.

## [4.9.0] - 2026-07-12

### Added
- **Weekend filter** (`weekendsOnly`) on election scans — engine, tool param and doctrine: "hafta sonu tatil" questions now scan Saturdays/Sundays only (weekday days no longer appear in weekend answers or day chips).
- **Richer day chips**: `visuals.bestDays.items[]` now carry `factors` (top-3 human-readable scoring factors) and `isWeekend` — the site can render "why this day" subtitles and weekend badges.

### Known gap (backlog)
- Factor label strings are Turkish-only (engine-side); factor i18n planned if EN usage grows.

## [4.8.1] - 2026-07-11

### Fixed
- `visuals.aspects.items[].transiting` is now the clean planet name; retrograde carried as separate optional `retro: true` (was a " ℞"-suffixed string that would break glyph mapping in the site's aspect panel).

## [4.8.0] - 2026-07-11

### Added
- **`done.visuals`** — structured data for the site's visual components: `visuals.aspects` (top-10 transit aspects with orb/exact/nature harmonious|challenging|neutral, from the turn's transit-hits call) and `visuals.bestDays` (top-7 ranked days from election scans). Enables the natal-page-style aspect list to render under chat answers.
- **30-day default scan**: when the user doesn't specify a range, election scans now default to 30 days (was 7); `days` parameter optional in the tool schema.

## [4.7.0] - 2026-07-11

### Changed (answer-quality release — beta feedback)
- **Timing-answer quality standard** (doctrine + tool directive): every day recommendation now must include the top day's REAL aspects with orb degrees (auto get_transit_hits chain), the person's profection/firdaria context woven into the recommendation, alternatives, and a caution list. Date ranges always echoed with the year.
- **Election scan cap 14 → 31 days**: a full month scans in one call (~0.15s, 961 windows) — no more half-month answers; >31-day ranges split-and-merge per doctrine.
- Capability questions answered in user language without leaking tool/parameter names.

## [4.6.2] - 2026-07-11

### Added
- Portuguese (pt) status/error strings — locale table now matches the site's full locale list (en/de/fr/es/pt/tr) exactly.

## [4.6.1] - 2026-07-11

### Observability & Hardening
- Per-request correlation id (`requestId` in logs and `done` event), turn duration in logs, `[AGENT-TOOL-FAIL]` server-side tool-error logging (was model-only), `[AGENT-ABORT]` client-disconnect logging, clean JSON error bodies for malformed/oversized request bodies (`API-400-BODY`, `API-413-BODY`).

## [4.6.0] - 2026-07-11

### Added
- **Localized SSE status/error messages** (`src/agent/i18n.js`): status ("Analyzing your question…", "Writing your reading…", per-tool) and user-facing error texts now follow the request's `locale` (TR/EN/DE/FR/ES; fallback exact → base → en). No contract change — `message` field simply arrives in the user's language.

## [4.5.0] - 2026-07-11

### Added
- `done.costClass` ('light' | 'scan') — billing-tier hint for the site's star/credit system: answers that used election/period scan tools are classed 'scan'. Additive; groundwork for Brief #10 (credit system).

## [4.4.1] - 2026-07-11

### Security
- Timing-safe X-Agent-Key comparison (`crypto.timingSafeEqual`).
- `trust proxy` enabled so IP-based rate limiting sees real client IPs behind Render's load balancer.
- Input hardening on `/api/agent/ask`: ephemeris-range year (1800-2400), calendar/coordinate bounds, timezone/label/uid/sessionId length caps, locale whitelist pattern, per-uid counter map memory ceiling. All rejections carry structured error codes; verified with adversarial request tests (5/5).

## [4.4.0] - 2026-07-11

### Added
- **Four new election purposes**: `tasinma` (move/new home), `lansman` (product/app/channel launch), `saglik-randevusu` (non-surgical health appointment; surgery-date selection explicitly refused and referred to a physician), `teklif` (marriage proposal) — each with its own weight set following the household methodology pattern. Doctrine purpose-mapping updated; verify-election extended (19 checks).
- Doctrine: astro-themed content generation explicitly allowed (product decision — must be grounded in real tool data).

## [4.3.1] - 2026-07-11

### Changed
- Doctrine v0.5 + tool directive polish (beta feedback): brand spelling "AstroAk" everywhere; em-dash character banned in answers; scan-scope narration not repeated within a conversation; ambiguous person-name matches (e.g. two similar records) now clarified with one short question BEFORE any tool call.

## [4.3.0] - 2026-07-11

### Added
- **Election-scan scan-scope meta**: `meta.windowsPerDay` + `meta.totalWindowsScanned`; agent tool output now carries real scan-scope numbers and an embedded presentation directive (grounded "premium scan" narration — no invented figures).
- **Doctrine v0.3-v0.4**: bot identity renamed to **AstroAk AI** (identity locked in all contexts); score-presentation rule (no invented scales like "8/10"); "make the work visible" rule; security & scope section (jailbreak refusal patterns, no system/tool/raw-JSON disclosure, astrology-only scope with polite redirect, injected fake-instruction handling, no fabricated birth data).

## [4.2.0] - 2026-07-09

### Added
- **Calestia Uzmanı Agent** (`POST /api/agent/ask`, SSE): Gemini function-calling orchestrator with 5 in-process tools (natal profile, transit hits, transit period scan, election scan, synastry), doctrine-based methodology (`src/agent/doctrine.md`), live token streaming, X-Agent-Key service auth, per-user/global daily quotas (quota info in `done` event), structured error codes (`AGENT-403-KEY`, `AGENT-400-VALIDATION`, `AGENT-429-*`, `AGENT-503-CONFIG`, `AGENT-TIMEOUT`, `AGENT-TURN-FAIL`), and automatic Gemini model fallback (survives model retirement, e.g. `gemini-2.5-flash` → `gemini-3-flash-preview`). Env-gated: `AGENT_ENABLED`, `AGENT_SHARED_KEY`, `GEMINI_API_KEY`, `AGENT_GEMINI_MODEL`.
- **Transit Hits** (`POST /api/transit-hits`): single-call transit→natal aspect list at a given moment (orb-sorted, retrograde/applying flags, VoC status). Core logic in `src/transit-hits.js`.
- **Election Scan** (`POST /api/election-scan`): single-call scored day×time windows over 1-14 days with purpose variants (is-gorusmesi, nikah, imza, seyahat, genel); planetary-hour/Moon-house/ASC-sign/angularity/Moon-aspect/VoC scoring model. Core logic in `src/election-scan.js`.
- **Enriched chart date control**: `/api/natal-chart-enriched` accepts optional `targetDate` (profections + firdaria computed for that date instead of "today") and `fixedStarOrb` (0-10, default 1.5). Response gains `enrichment.meta`.
- Verification suites: `verify-agent.js` (20 checks, mock provider) and `verify-election.js` (13 regression checks against hand-validated references).

### Dependencies
- Added `@google/genai` (Gemini SDK).

## [4.1.1] - 2026-04-30

### Added
- **ATCC Forward Test Engine** (`atcc_forward.js`): Standalone prediction engine for 15 crypto assets using ATCC v6.1 methodology. Features: automatic natal chart calculation with S/V/SM/Tier classification, monthly transit scanning with proper transit orbs, C5 mechanical scoring with orb bands (≤1°=±3, 1.1-2.5°=±2, 2.6-5°=±1), dignity-direction filter (C3), multiplier stacking (C1d tier, C4b BTC overlay, C7a generational suppression, C7b mutual weakness), triple hit detection (flag-only), ingress detection, mundane outer-outer aspect scanning, sealed prediction output (JSON + TXT). Usage: `node atcc_forward.js YYYY-MM [bull|range|bear]`
- **OP Transit Report** (`_op_report.js`): One-off transit report for OP (Optimism) covering Apr 9 – May 15, 2026
- `predictions/` directory for sealed forward test output

### Fixed
- **Asteroid ephemeris files**: Added 5 individual `.se1` files for Eros, Psyche, Nessus, Pholus, and Eris (downloaded from Swiss Ephemeris Dropbox). Previously these asteroids silently returned 0° Aries due to missing ephemeris data
- **Asteroid error checking** (calestia-pro `src/asteroids.js`): Added `result.flag === -1` check after `swe.calc()` to throw explicit error instead of silently returning zero values
- **verify-v2.js asteroid count assertion**: Test was hard-coded to expect 4 distinct asteroids, but the asteroids module now returns 9 (Ceres, Pallas, Juno, Vesta + Eros, Psyche, Nessus, Pholus, Eris). Generalized to `uniqueLons.size === asteroids.length`

## [4.1.0] - 2026-04-05

### Added

#### Pro & Medical Integration
- **Enriched Natal Chart**: `POST /api/natal-chart-enriched` — base natal chart + Arabic Parts (14 traditional lots), fixed star conjunctions (45+ stars), asteroids (9: Ceres, Pallas, Juno, Vesta, Eros, Psyche, Nessus, Pholus, Eris), asteroid-planet aspects, Sabian symbols (all planets + angles), Firdaria periods, and annual/monthly/daily profections
- **Medical Chart**: `POST /api/medical-chart` — full medical astrology chart with 22 features: body area mapping, combustion analysis, critical degrees, speed classification, planetary strength (Lilly), medical fixed stars, declination/parallels, profection, 6 medical Arabic Parts, antiscia, secondary progressions, solar return, midpoints, mutual receptions, dispositor chain, Void of Course Moon, prenatal lunation, almuten figuris, eclipse health impact, medical planetary hours, medical ingresses
- **Enriched Synastry**: `POST /api/synastry-enriched` — base synastry + Arabic Parts and asteroids for both persons, cross-asteroid aspects (person1 asteroids × person2 planets and vice versa)
- `calestia-pro` (file: dependency) — 42+ advanced astrology functions
- `celestia-medical` (file: dependency) — 22 medical astrology features

### Fixed
- **synastry-enriched**: Use separate `calculateNatalChart()` calls for enrichment instead of `synastryResult.person1/person2` — synastry person objects lack `meta.julianDayET` required by calestia-pro functions

### Changed
- 11 API endpoints total (3 new: natal-chart-enriched, medical-chart, synastry-enriched)

## [4.0.0] - 2026-03-06

### Added

#### Phase 1 — Natal Chart Enrichment
- **Essential Dignities Detail** (`dignityDetail`): terms, faces, triplicity rulers, and composite dignity score on every planet
- **Decanate** (`decan`, `decanRuler`): 36-decan system with Chaldean rulers on every planet
- **Sect Analysis** (`analysis.sect`): day/night chart detection, sect luminary, hayz/halb conditions for all planets
- **Lunar Mansions** (`analysis.lunarMansion`): 28 Arabic mansions with Turkish names, element, ruling planet
- **Planetary Hours** (`analysis.planetaryHour`): Chaldean hour calculation from sunrise/sunset, Turkish labels
- **Chart Ruler** (`analysis.chartRuler`): ASC sign ruler with position and house
- **House Rulers** (`analysis.houseRulers`): traditional sign ruler for each house cusp

#### Phase 2 — Relationship Enrichment
- **Davison Relationship Chart** (`davison`): midpoint-in-time chart added to synastry response
- **Synastry Compatibility Score** (`synastry.score`): 0-100 weighted scoring with harmony/tension breakdown
- **Relocation Chart**: `POST /api/relocation` endpoint — same birth time, different location houses
- `calculateRelocationChart()` export from calculator.js

#### Phase 4 — Predictive Enrichment
- **Eclipse Calculation**: `POST /api/eclipses` endpoint — solar/lunar eclipse search by year or date range
- `calculateEclipses()` with NASA-verified results (2024, 2026), Saros series estimation, optional natal aspects
- **Ingress Detection** (`ingresses`): planet sign-change timestamps in transit response with binary search precision
- **Void of Course Moon** (`lunar.isVoidOfCourse`, `vocStartTime`, `vocEndTime`, `lastAspect`, `nextIngress`): full VoC data in transit lunar section
- `calculateIngresses()` and `calculateVoidOfCourseMoon()` exports from transit.js

#### Phase 5 — Advanced Techniques
- **Astrocartography**: `POST /api/astrocartography` endpoint — MC/IC/ASC/DSC planetary lines in GeoJSON-compatible format
- `calculateAstrocartography()` export with configurable longitude step, planet filter, and line types
- **Mean Node / Osculating Lilith**: `nodeType` ('true'|'mean') and `lilithType` ('mean'|'osculating') optional parameters in natal chart
- `NODE_TYPES` and `LILITH_TYPES` constants

### Changed
- Test suite expanded: 13 → 39 tests (26 new tests covering all phases)
- Verification suites: 23,396+ exhaustive checks, 52 precision checks — all passing
- 8 API endpoints total (3 new: eclipses, relocation, astrocartography)

## [3.1.0] - 2026-03-01

### Fixed
- **Critical**: Use `swe.calc(jd_et)` instead of `swe.calc_ut(jd_et)` for planet positions — the old call double-applied deltaT (~62-69 seconds), causing ~32-34 arcsecond Moon errors and potential house misassignment near cusp boundaries
- `longitudeToSign()` second overflow — was clamping 60→59 instead of properly carrying over to minute/degree/sign

### Added
- Rate limiting on API routes (100 req/15min per IP via `express-rate-limit`)
- Configurable CORS via `CORS_ORIGIN` env var
- `toInt()`/`toFloat()` input validation helpers with descriptive error messages
- Verification suite (27,000+ checks):
  - `verify-comprehensive.js` — 40 charts, 2,765 checks
  - `verify-famous-charts.js` — 15 famous charts, 658 checks
  - `verify-exhaustive.js` — 25 charts, 23,396 checks across all derived fields
  - `verify-astrodatabank.js` — 10 Astro-Databank reference charts

## [3.0.0] - 2026-02-14

### Changed
- **BREAKING**: Medical astrology features extracted to separate private package `celestia-medical`
- `src/calculator.js` now returns a clean natal chart without medical enrichment
- Planet objects no longer contain `bodyAreas`, `combustion`, `criticalDegree`, `speedAnalysis`, `planetaryStrength`, `declination`, `isOutOfBounds`, `oobMedicalNote`
- House cusps no longer contain `healthDomain`
- `analysis.medicalAstrology` section removed from natal chart output

### Removed
- `src/medical.js` — moved to `celestia-medical/src/medical.js`
- All swe-dependent medical functions (fixed stars, declinations, progressions, solar return, midpoints, prenatal lunation) — moved to `celestia-medical/src/enrichment.js`
- Tests 14-42 — moved to `celestia-medical/test.js`

## [2.1.0] - 2026-02-14

### Added
- Medical astrology module (18 features) — now in separate `celestia-medical` package

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

[4.1.0]: https://github.com/pilavyer/celestia/compare/v4.0.0...v4.1.0
[4.0.0]: https://github.com/pilavyer/celestia/compare/v3.1.0...v4.0.0
[3.0.0]: https://github.com/pilavyer/celestia/compare/v2.1.0...v3.0.0
[2.1.0]: https://github.com/pilavyer/celestia/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/pilavyer/celestia/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/pilavyer/celestia/releases/tag/v1.0.0
