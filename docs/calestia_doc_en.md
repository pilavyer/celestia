# ASTRO-ENGINE: Swiss Ephemeris Natal Chart Calculation API — Project Specification

## WHAT IS THIS DOCUMENT?

This document is a comprehensive technical specification for building a professional-grade natal chart calculation API using the Swiss Ephemeris library. It includes step-by-step instructions, code examples, critical points to be aware of, and testing procedures.

**Goal:** Build an open-source (AGPL) calculation engine and REST API that replaces third-party services like AstrologyAPI.com and matches the precision of astro.com.

**Technology Stack:**

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js (v18+) |
| Calculation | sweph npm package (Swiss Ephemeris Node.js binding) |
| Timezone | luxon (IANA timezone database) |
| HTTP Server | Express.js |
| License | AGPL-3.0 (open source) |

---

## STEP 1: PROJECT SETUP

### 1.1 Create Project Directory

```bash
mkdir astro-engine
cd astro-engine
npm init -y
```

### 1.2 Install Dependencies

```bash
npm install sweph luxon express cors
npm install --save-dev nodemon
```

**CRITICAL NOTE — regarding sweph installation:**

sweph compiles C code (native N-API addon via node-gyp).

- On Mac, Xcode Command Line Tools are required: `xcode-select --install`
- If installation fails: `npm install -g node-gyp` then try again

sweph is based on Swiss Ephemeris version 2.10.3b and is the most up-to-date and best-maintained Node.js binding (`timotejroiko/sweph`).

The alternative `swisseph` package (mivion) uses an old callback-based API — DO NOT use it.

### 1.3 Download Ephemeris Data Files

Swiss Ephemeris requires `.se1` files for high precision. It works without them (Moshier fallback, 0.1 arcsec precision) but these files are needed for full precision (0.001 arcsec).

```bash
mkdir ephe
cd ephe
# Main planet files (1800-2400 AD)
curl -LO https://raw.githubusercontent.com/aloistr/swisseph/master/ephe/sepl_18.se1
curl -LO https://raw.githubusercontent.com/aloistr/swisseph/master/ephe/semo_18.se1
curl -LO https://raw.githubusercontent.com/aloistr/swisseph/master/ephe/seas_18.se1
cd ..
```

**File descriptions:**

- `sepl_18.se1` — Planet positions (Sun, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto)
- `semo_18.se1` — Moon positions
- `seas_18.se1` — Asteroids + Chiron

Total size: ~2MB
Coverage: Years 1800–2400 (more than sufficient for modern natal charts)

### 1.4 Project Structure

Create the following file/directory structure:

```
astro-engine/
├── ephe/                  # Ephemeris data files
│   ├── sepl_18.se1
│   ├── semo_18.se1
│   └── seas_18.se1
├── src/
│   ├── calculator.js      # Main calculation engine
│   ├── timezone.js        # Timezone conversion module
│   ├── aspects.js         # Aspect calculation module
│   ├── dignities.js       # Planetary dignity (domicile/fall) module
│   ├── utils.js           # Helper functions
│   └── constants.js       # Constants and configuration
├── server.js              # Express API server
├── test.js                # Test and validation script
├── package.json
├── .gitignore
├── LICENSE                # AGPL-3.0
└── README.md
```

### 1.5 Update package.json

```json
{
  "name": "astro-engine",
  "version": "1.0.0",
  "description": "High-precision natal chart calculation engine powered by Swiss Ephemeris",
  "main": "server.js",
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "node test.js"
  },
  "keywords": ["astrology", "natal-chart", "swiss-ephemeris", "horoscope"],
  "license": "AGPL-3.0",
  "dependencies": {
    "sweph": "^2.10.3",
    "luxon": "^3.0.0",
    "express": "^4.18.0",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "nodemon": "^3.0.0"
  }
}
```

### 1.6 Create .gitignore

```
node_modules/
.DS_Store
.env
```

**NOTE:** Do NOT add `ephe/` to `.gitignore`. Ephemeris files should be distributed with the repo so others can use them.

---

## STEP 2: CONSTANTS AND CONFIGURATION (src/constants.js)

```javascript
// src/constants.js

// Zodiac sign names — index starts at 0 (0° = start of Aries)
export const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

// Turkish zodiac sign names (optional, for locale support)
export const SIGNS_TR = [
  'Koç', 'Boğa', 'İkizler', 'Yengeç', 'Aslan', 'Başak',
  'Terazi', 'Akrep', 'Yay', 'Oğlak', 'Kova', 'Balık'
];

// Swiss Ephemeris celestial body IDs
export const CELESTIAL_BODIES = [
  { id: 0,  name: 'Sun',       trName: 'Güneş' },
  { id: 1,  name: 'Moon',      trName: 'Ay' },
  { id: 2,  name: 'Mercury',   trName: 'Merkür' },
  { id: 3,  name: 'Venus',     trName: 'Venüs' },
  { id: 4,  name: 'Mars',      trName: 'Mars' },
  { id: 5,  name: 'Jupiter',   trName: 'Jüpiter' },
  { id: 6,  name: 'Saturn',    trName: 'Satürn' },
  { id: 7,  name: 'Uranus',    trName: 'Uranüs' },
  { id: 8,  name: 'Neptune',   trName: 'Neptün' },
  { id: 9,  name: 'Pluto',     trName: 'Plüton' },
  { id: 15, name: 'Chiron',    trName: 'Chiron' },
  { id: 11, name: 'True Node', trName: 'Kuzey Ay Düğümü' },
  { id: 12, name: 'Lilith',    trName: 'Lilith' },
];

// Aspect definitions
// orb = tolerance in degrees (widened by 25% when Sun or Moon is involved)
export const ASPECTS = [
  { name: 'Conjunction',  angle: 0,   orb: 8,   symbol: '☌', trName: 'Kavuşum' },
  { name: 'Opposition',   angle: 180, orb: 8,   symbol: '☍', trName: 'Karşıt' },
  { name: 'Trine',        angle: 120, orb: 7,   symbol: '△', trName: 'Üçgen' },
  { name: 'Square',       angle: 90,  orb: 7,   symbol: '□', trName: 'Kare' },
  { name: 'Sextile',      angle: 60,  orb: 5,   symbol: ' ', trName: 'Altıgen' },
  { name: 'Quincunx',     angle: 150, orb: 2.5, symbol: ' ', trName: 'Quincunx' },
  { name: 'Semi-sextile', angle: 30,  orb: 1.5, symbol: ' ', trName: 'Yarı Altıgen' },
];

// Supported house systems
// Swiss Ephemeris uses single-character codes
export const HOUSE_SYSTEMS = {
  'P': { name: 'Placidus',       description: 'Most common Western system (default)' },
  'K': { name: 'Koch',           description: 'Similar to Placidus, preferred by some European astrologers' },
  'W': { name: 'Whole Sign',     description: 'Oldest system, Hellenistic astrology. Works at all latitudes' },
  'E': { name: 'Equal',          description: 'Each house is 30°, starting from ASC' },
  'B': { name: 'Alcabitius',     description: 'Medieval Arabic astrology' },
  'R': { name: 'Regiomontanus',  description: 'Preferred in horary astrology' },
  'O': { name: 'Porphyry',       description: 'Simplest quadrant system' },
  'C': { name: 'Campanus',       description: 'Space-based division' },
};

// Element and modality classification
export const ELEMENTS = {
  Fire:  ['Aries', 'Leo', 'Sagittarius'],
  Earth: ['Taurus', 'Virgo', 'Capricorn'],
  Air:   ['Gemini', 'Libra', 'Aquarius'],
  Water: ['Cancer', 'Scorpio', 'Pisces'],
};

export const MODALITIES = {
  Cardinal: ['Aries', 'Cancer', 'Libra', 'Capricorn'],
  Fixed:    ['Taurus', 'Leo', 'Scorpio', 'Aquarius'],
  Mutable:  ['Gemini', 'Virgo', 'Sagittarius', 'Pisces'],
};
```

---

## STEP 3: TIMEZONE CONVERSION MODULE (src/timezone.js)

**THIS MODULE IS OF CRITICAL IMPORTANCE.** The vast majority of natal chart errors originate from timezone conversion. A 1-hour error = wrong Ascendant sign.

```javascript
// src/timezone.js
import { DateTime } from 'luxon';

/**
 * Converts birth time from local time to UTC.
 *
 * CRITICAL NOTES:
 * - DO NOT use raw UTC offsets (e.g. "+3"), always use IANA timezone IDs
 * - IANA IDs encode historical DST changes
 * - Turkey example: before 2016 UTC+2/+3 (DST), after 2016 fixed UTC+3
 *
 * @param {number} year - Birth year
 * @param {number} month - Birth month (1-12, different from JavaScript's 0-based Date!)
 * @param {number} day - Birth day
 * @param {number} hour - Birth hour (0-23)
 * @param {number} minute - Birth minute (0-59)
 * @param {string} timezone - IANA timezone ID (e.g.: "Europe/Istanbul", "America/New_York")
 * @returns {object} UTC information and warnings
 */
export function birthTimeToUTC(year, month, day, hour, minute, timezone) {
  // IANA timezone validation
  const testZone = DateTime.now().setZone(timezone);
  if (!testZone.isValid) {
    throw new Error(`Invalid timezone: "${timezone}". Use IANA format (e.g.: "Europe/Istanbul")`);
  }

  // Create local time
  const local = DateTime.fromObject(
    { year, month, day, hour, minute, second: 0 },
    { zone: timezone }
  );

  // DST spring-forward gap check
  // Example: When the clock jumps from 02:00 to 03:00, 02:30 is invalid
  if (!local.isValid) {
    throw new Error(
      `Invalid time: ${year}-${month}-${day} ${hour}:${minute} does not exist in timezone "${timezone}". ` +
      `This time was likely skipped due to a daylight saving time transition. ` +
      `Reason: ${local.invalidReason}. Explanation: ${local.invalidExplanation}`
    );
  }

  // Convert to UTC
  const utc = local.toUTC();

  // Generate warnings
  const warnings = [];

  if (year < 1970) {
    warnings.push(
      'Timezone data before 1970 may not be reliable. ' +
      'Cross-checking with the astro.com atlas is recommended.'
    );
  }

  if (year < 1883 && timezone.startsWith('America/')) {
    warnings.push(
      'Standard time zones did not exist in the US before 1883. ' +
      'Local Mean Time (LMT) may have been in use.'
    );
  }

  // DST fall-back ambiguity check (the same hour occurs twice)
  // Luxon prefers the first occurrence (DST time) in this case
  const oneHourLater = local.plus({ hours: 1 });
  if (local.offset !== oneHourLater.offset && local.isInDST) {
    warnings.push(
      'This time coincides with a DST transition. ' +
      'The same hour may have occurred twice (DST and standard). ' +
      'The DST version was used.'
    );
  }

  return {
    utcYear: utc.year,
    utcMonth: utc.month,
    utcDay: utc.day,
    utcHour: utc.hour,
    utcMinute: utc.minute,
    utcSecond: utc.second,
    // Decimal hour (for Swiss Ephemeris julday function)
    utcDecimalHour: utc.hour + utc.minute / 60 + utc.second / 3600,
    // Offset information (in minutes)
    offsetMinutes: local.offset,
    offsetHours: local.offset / 60,
    // DST status
    isDST: local.isInDST,
    // Original input (for debugging)
    originalInput: {
      localTime: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      timezone,
      utcTime: utc.toISO(),
    },
    // Warnings
    warnings,
  };
}

/**
 * Estimate IANA timezone from coordinates.
 * NOTE: This is a simple approximation. In production, using Google Time Zone API or
 * a service like timezonefinder would be more accurate.
 *
 * Important known timezones:
 * - Turkey: "Europe/Istanbul" (valid for all of Turkey, fixed UTC+3 since 2016)
 * - Eastern US: "America/New_York"
 * - Western US: "America/Los_Angeles"
 * - Brazil: "America/Sao_Paulo"
 * - India: "Asia/Kolkata"
 */
export function getTimezoneInfo(timezone) {
  const now = DateTime.now().setZone(timezone);
  return {
    timezone,
    currentOffset: now.offset / 60,
    isDST: now.isInDST,
    abbreviation: now.offsetNameShort,
    longName: now.offsetNameLong,
  };
}
```

---

## STEP 4: MAIN CALCULATION ENGINE (src/calculator.js)

```javascript
// src/calculator.js
import * as swe from 'sweph';
import path from 'path';
import { fileURLToPath } from 'url';
import { CELESTIAL_BODIES, SIGNS, HOUSE_SYSTEMS } from './constants.js';
import { birthTimeToUTC } from './timezone.js';
import { calculateAspects } from './aspects.js';
import { getDignity } from './dignities.js';
import {
  longitudeToSign,
  determineMoonPhase,
  calculatePartOfFortune,
  getElementDistribution,
  getModalityDistribution,
  determineHemisphereEmphasis,
  findPlanetInHouse,
} from './utils.js';

// __dirname ES module equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set ephemeris file path
// CRITICAL: This function MUST be called BEFORE all calculations
// It performs internal initialization; calling it is required even if null is passed
const ephePath = path.join(__dirname, '..', 'ephe');
swe.set_ephe_path(ephePath);

/**
 * Calculate a full natal chart.
 *
 * @param {object} params - Birth data
 * @param {number} params.year - Birth year
 * @param {number} params.month - Birth month (1-12)
 * @param {number} params.day - Birth day
 * @param {number} params.hour - Birth hour (0-23)
 * @param {number} params.minute - Birth minute (0-59)
 * @param {number} params.latitude - Birth place latitude (north positive)
 * @param {number} params.longitude - Birth place longitude (east positive, WEST NEGATIVE)
 * @param {string} params.timezone - IANA timezone (e.g.: "Europe/Istanbul")
 * @param {string} [params.houseSystem='P'] - House system code (default: Placidus)
 * @returns {object} Full natal chart data
 */
export function calculateNatalChart({
  year, month, day, hour, minute,
  latitude, longitude, timezone,
  houseSystem = 'P'
}) {
  // ========== INPUT VALIDATION ==========
  if (!HOUSE_SYSTEMS[houseSystem]) {
    throw new Error(
      `Invalid house system: "${houseSystem}". ` +
      `Supported systems: ${Object.keys(HOUSE_SYSTEMS).join(', ')}`
    );
  }
  if (latitude < -90 || latitude > 90) {
    throw new Error(`Invalid latitude: ${latitude}. Must be between -90 and 90.`);
  }
  if (longitude < -180 || longitude > 180) {
    throw new Error(`Invalid longitude: ${longitude}. Must be between -180 and 180.`);
  }
  if (month < 1 || month > 12) {
    throw new Error(`Invalid month: ${month}. Must be between 1 and 12.`);
  }
  if (day < 1 || day > 31) {
    throw new Error(`Invalid day: ${day}. Must be between 1 and 31.`);
  }
  if (hour < 0 || hour > 23) {
    throw new Error(`Invalid hour: ${hour}. Must be between 0 and 23.`);
  }
  if (minute < 0 || minute > 59) {
    throw new Error(`Invalid minute: ${minute}. Must be between 0 and 59.`);
  }

  // ========== TIMEZONE CONVERSION ==========
  const utcData = birthTimeToUTC(year, month, day, hour, minute, timezone);

  // ========== JULIAN DAY CALCULATION ==========
  // utc_to_jd returns both jd_et (Ephemeris Time) and jd_ut (Universal Time)
  // CRITICAL: Use utc_to_jd() instead of julday() — it handles the Delta-T conversion automatically
  const jdResult = swe.utc_to_jd(
    utcData.utcYear,
    utcData.utcMonth,
    utcData.utcDay,
    utcData.utcHour,
    utcData.utcMinute,
    utcData.utcSecond,
    swe.constants.SE_GREG_CAL
  );

  // jdResult.data[0] = JD in ET (Ephemeris Time) — for planet calculations
  // jdResult.data[1] = JD in UT (Universal Time) — for house calculations
  const jd_et = jdResult.data[0];
  const jd_ut = jdResult.data[1];

  // ========== PLANET POSITIONS ==========
  // SEFLG_SWIEPH: Use Swiss Ephemeris files (falls back to Moshier if unavailable)
  // SEFLG_SPEED: Also return speed data (required for retrograde detection)
  const calcFlags = swe.constants.SEFLG_SWIEPH | swe.constants.SEFLG_SPEED;

  const planets = CELESTIAL_BODIES.map(body => {
    const result = swe.calc_ut(jd_et, body.id, calcFlags);

    // Check result.flag — if different from input flag, Moshier fallback may have occurred
    const usedMoshier = (result.flag & swe.constants.SEFLG_SWIEPH) === 0;

    // result.data array:
    // [0] = ecliptic longitude (0-360°)
    // [1] = ecliptic latitude
    // [2] = distance (AU)
    // [3] = longitude speed (°/day) — negative = retrograde
    // [4] = latitude speed
    // [5] = distance speed
    const lon = result.data[0];
    const lat = result.data[1];
    const distance = result.data[2];
    const speedLon = result.data[3];

    const signData = longitudeToSign(lon);

    return {
      id: body.id,
      name: body.name,
      trName: body.trName,
      longitude: roundTo(lon, 6),
      latitude: roundTo(lat, 6),
      distance: roundTo(distance, 6),
      speed: roundTo(speedLon, 6),
      sign: signData.sign,
      signIndex: signData.signIndex,
      degree: signData.degree,
      minute: signData.minute,
      second: signData.second,
      isRetrograde: speedLon < 0,
      dignity: getDignity(body.name, signData.sign),
      formattedPosition: `${signData.degree}°${String(signData.minute).padStart(2, '0')}'${String(signData.second).padStart(2, '0')}" ${signData.sign}`,
      usedMoshierFallback: usedMoshier,
    };
  });

  // Calculate South Node (North Node + 180°)
  const northNode = planets.find(p => p.name === 'True Node');
  if (northNode) {
    const southLon = (northNode.longitude + 180) % 360;
    const southSignData = longitudeToSign(southLon);
    planets.push({
      id: -1,
      name: 'South Node',
      trName: 'Güney Ay Düğümü',
      longitude: roundTo(southLon, 6),
      latitude: roundTo(-northNode.latitude, 6),
      distance: northNode.distance,
      speed: northNode.speed,
      sign: southSignData.sign,
      signIndex: southSignData.signIndex,
      degree: southSignData.degree,
      minute: southSignData.minute,
      second: southSignData.second,
      isRetrograde: northNode.isRetrograde,
      dignity: null,
      formattedPosition: `${southSignData.degree}°${String(southSignData.minute).padStart(2, '0')}'${String(southSignData.second).padStart(2, '0')}" ${southSignData.sign}`,
      usedMoshierFallback: false,
    });
  }

  // ========== HOUSE CALCULATION ==========
  // CRITICAL: The houses function takes jd_ut (Universal Time), NOT jd_et!
  // CRITICAL: Swiss Ephemeris expects NEGATIVE values for western longitudes
  const housesResult = swe.houses(jd_ut, latitude, longitude, houseSystem);

  // housesResult.data.cusps: cusps[0] is empty, cusps[1]-cusps[12] are house boundaries
  // housesResult.data.points: [ASC, MC, ARMC, Vertex, EquatorialASC, co-ASC Koch, co-ASC Munkasey, PolarASC]
  const cusps = housesResult.data.cusps;
  const points = housesResult.data.points;
  const ascendant = points[0];
  const midheaven = points[1];
  const armc = points[2]; // Sidereal time (ARMC)
  const vertex = points[3];

  // Polar latitude warning (Placidus and Koch fail above ~66.5°)
  const warnings = [...utcData.warnings];
  if (['P', 'K'].includes(houseSystem) && Math.abs(latitude) > 66) {
    warnings.push(
      `The ${HOUSE_SYSTEMS[houseSystem].name} house system may not be reliable at ${Math.abs(latitude)}° latitude. ` +
      `Whole Sign ("W") system is recommended for polar regions. ` +
      `Swiss Ephemeris may have automatically switched to Porphyry.`
    );
  }

  // Convert house cusps to detailed format
  const houses = [];
  for (let i = 1; i <= 12; i++) {
    const cuspData = longitudeToSign(cusps[i]);
    houses.push({
      house: i,
      cusp: roundTo(cusps[i], 6),
      sign: cuspData.sign,
      degree: cuspData.degree,
      minute: cuspData.minute,
      formattedCusp: `${cuspData.degree}°${String(cuspData.minute).padStart(2, '0')}' ${cuspData.sign}`,
    });
  }

  // Detailed Ascendant and MC
  const ascData = longitudeToSign(ascendant);
  const mcData = longitudeToSign(midheaven);
  const vtxData = longitudeToSign(vertex);

  // Find which house each planet is in
  const planetsWithHouses = planets.map(planet => ({
    ...planet,
    house: findPlanetInHouse(planet.longitude, cusps),
  }));

  // ========== ASPECTS ==========
  // Include Ascendant and MC in aspect calculation
  const aspectBodies = [
    ...planetsWithHouses,
    { name: 'Ascendant', trName: 'Yükselen', longitude: ascendant, speed: 0 },
    { name: 'Midheaven', trName: 'Gökyüzü Ortası', longitude: midheaven, speed: 0 },
  ];
  const aspects = calculateAspects(aspectBodies);

  // ========== CHART ANALYSIS ==========
  const sun = planetsWithHouses.find(p => p.name === 'Sun');
  const moon = planetsWithHouses.find(p => p.name === 'Moon');

  // Day/night chart detection (Is the Sun above the horizon?)
  const isDayChart = sun ? isAboveHorizon(sun.longitude, ascendant) : true;

  // Part of Fortune
  const partOfFortune = calculatePartOfFortune(ascendant, sun?.longitude, moon?.longitude, isDayChart);
  const pofData = longitudeToSign(partOfFortune);

  // Moon phase
  const moonPhase = moon && sun ? determineMoonPhase(sun.longitude, moon.longitude) : null;

  // Element and modality distribution
  const elementDist = getElementDistribution(planetsWithHouses);
  const modalityDist = getModalityDistribution(planetsWithHouses);

  // Hemisphere emphasis
  const hemisphereEmphasis = determineHemisphereEmphasis(planetsWithHouses, ascendant, midheaven);

  // Stellium detection (3+ planets in the same sign)
  const stelliums = findStelliums(planetsWithHouses);

  // ========== RESULT ==========
  return {
    input: {
      localTime: utcData.originalInput.localTime,
      timezone: timezone,
      utcTime: utcData.originalInput.utcTime,
      coordinates: { latitude, longitude },
      offsetHours: utcData.offsetHours,
      isDST: utcData.isDST,
    },
    planets: planetsWithHouses,
    houses: {
      system: houseSystem,
      systemName: HOUSE_SYSTEMS[houseSystem].name,
      cusps: houses,
      ascendant: {
        longitude: roundTo(ascendant, 6),
        sign: ascData.sign,
        degree: ascData.degree,
        minute: ascData.minute,
        formatted: `${ascData.degree}°${String(ascData.minute).padStart(2, '0')}' ${ascData.sign}`,
      },
      midheaven: {
        longitude: roundTo(midheaven, 6),
        sign: mcData.sign,
        degree: mcData.degree,
        minute: mcData.minute,
        formatted: `${mcData.degree}°${String(mcData.minute).padStart(2, '0')}' ${mcData.sign}`,
      },
      vertex: {
        longitude: roundTo(vertex, 6),
        sign: vtxData.sign,
        degree: vtxData.degree,
        minute: vtxData.minute,
      },
    },
    aspects,
    analysis: {
      sunSign: sun?.sign || null,
      moonSign: moon?.sign || null,
      risingSign: ascData.sign,
      isDayChart,
      moonPhase,
      partOfFortune: {
        longitude: roundTo(partOfFortune, 6),
        sign: pofData.sign,
        degree: pofData.degree,
        minute: pofData.minute,
        formatted: `${pofData.degree}°${String(pofData.minute).padStart(2, '0')}' ${pofData.sign}`,
      },
      elements: elementDist,
      modalities: modalityDist,
      hemispheres: hemisphereEmphasis,
      stelliums,
    },
    meta: {
      julianDayET: roundTo(jd_et, 8),
      julianDayUT: roundTo(jd_ut, 8),
      siderealTime: roundTo(armc, 6),
      deltaT: roundTo((jd_et - jd_ut) * 86400, 2), // in seconds
      ephemerisMode: planetsWithHouses.some(p => p.usedMoshierFallback) ? 'Moshier (fallback)' : 'Swiss Ephemeris',
      engine: 'sweph (Swiss Ephemeris Node.js binding)',
      version: '1.0.0',
      warnings,
    },
  };
}

// ========== HELPER FUNCTIONS ==========

function roundTo(num, decimals) {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

function isAboveHorizon(planetLon, ascLon) {
  const desc = (ascLon + 180) % 360;
  if (ascLon < desc) {
    return planetLon >= ascLon && planetLon < desc ? false : true;
  } else {
    return planetLon >= ascLon || planetLon < desc ? false : true;
  }
}

function findStelliums(planets) {
  // Sun, Moon, and traditional planets (excluding Chiron, Nodes)
  const mainPlanets = planets.filter(p =>
    ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'].includes(p.name)
  );
  const signCounts = {};
  mainPlanets.forEach(p => {
    if (!signCounts[p.sign]) signCounts[p.sign] = [];
    signCounts[p.sign].push(p.name);
  });
  const stelliums = [];
  for (const [sign, names] of Object.entries(signCounts)) {
    if (names.length >= 3) {
      stelliums.push({ sign, planets: names, count: names.length });
    }
  }
  return stelliums;
}
```

---

## STEP 5: ASPECT CALCULATION MODULE (src/aspects.js)

```javascript
// src/aspects.js
import { ASPECTS } from './constants.js';

/**
 * Calculate aspects between all celestial bodies.
 *
 * @param {Array} bodies - List of planets and points (each must contain {name, longitude, speed})
 * @returns {Array} List of aspects
 */
export function calculateAspects(bodies) {
  const aspects = [];

  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const body1 = bodies[i];
      const body2 = bodies[j];

      // Skip inter-Node aspects and South Node aspects (most astrologers exclude these)
      if (
        (body1.name === 'True Node' && body2.name === 'South Node') ||
        (body1.name === 'South Node' && body2.name === 'True Node')
      ) continue;

      // Angle between two longitudes (0-180°)
      let diff = Math.abs(body1.longitude - body2.longitude);
      if (diff > 180) diff = 360 - diff;

      for (const aspect of ASPECTS) {
        // Widen orb by 25% for aspects involving the Sun or Moon
        let effectiveOrb = aspect.orb;
        const luminaries = ['Sun', 'Moon'];
        if (luminaries.includes(body1.name) || luminaries.includes(body2.name)) {
          effectiveOrb *= 1.25;
        }

        // Slightly narrow orb for ASC/MC aspects
        const angles = ['Ascendant', 'Midheaven'];
        if (angles.includes(body1.name) || angles.includes(body2.name)) {
          effectiveOrb *= 0.75;
        }

        const deviation = Math.abs(diff - aspect.angle);
        if (deviation <= effectiveOrb) {
          // Determine applying vs separating
          const isApplying = determineApplying(body1, body2, aspect.angle);

          aspects.push({
            planet1: body1.name,
            planet1Tr: body1.trName,
            planet2: body2.name,
            planet2Tr: body2.trName,
            type: aspect.name,
            typeTr: aspect.trName,
            symbol: aspect.symbol,
            exactAngle: aspect.angle,
            actualAngle: roundTo(diff, 2),
            orb: roundTo(deviation, 2),
            maxOrb: roundTo(effectiveOrb, 2),
            isApplying,
            strength: calculateAspectStrength(deviation, effectiveOrb),
          });
          // Only one aspect per pair (the one with the tightest orb)
          break;
        }
      }
    }
  }

  // Sort by orb (strongest aspects first)
  return aspects.sort((a, b) => a.orb - b.orb);
}

/**
 * Determine whether an aspect is applying or separating.
 * If the faster planet is moving toward the slower one = applying
 */
function determineApplying(body1, body2, aspectAngle) {
  // If neither body has speed data, it cannot be determined
  if (body1.speed === undefined || body2.speed === undefined) return null;
  if (body1.speed === 0 && body2.speed === 0) return null;

  // Faster planet = greater absolute speed
  const speed1 = Math.abs(body1.speed);
  const speed2 = Math.abs(body2.speed);

  // Relative motion: is the faster planet approaching the slower one?
  const relativeSpeed = body1.speed - body2.speed;

  let currentDiff = body1.longitude - body2.longitude;
  // Normalize to 0-360 range
  if (currentDiff < 0) currentDiff += 360;
  if (currentDiff > 180) currentDiff = 360 - currentDiff;

  // Will the angle approach the aspect angle in the next "step"?
  const futureBody1 = body1.longitude + body1.speed * 0.01;
  const futureBody2 = body2.longitude + body2.speed * 0.01;
  let futureDiff = Math.abs(futureBody1 - futureBody2);
  if (futureDiff > 180) futureDiff = 360 - futureDiff;

  const currentDeviation = Math.abs(currentDiff - aspectAngle);
  const futureDeviation = Math.abs(futureDiff - aspectAngle);

  return futureDeviation < currentDeviation;
}

/**
 * Calculate aspect strength on a 0-100 scale.
 * Orb 0° = 100 (exact aspect), orb = maxOrb = 0 (at the aspect boundary)
 */
function calculateAspectStrength(deviation, maxOrb) {
  if (maxOrb === 0) return 100;
  const strength = Math.round((1 - deviation / maxOrb) * 100);
  return Math.max(0, Math.min(100, strength));
}

function roundTo(num, decimals) {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}
```

---

## STEP 6: DIGNITY MODULE (src/dignities.js)

```javascript
// src/dignities.js

/**
 * Traditional planetary dignity table.
 * Domicile = Planet in its own sign (strongest)
 * Exaltation = Sign where it is exalted
 * Detriment = Opposite sign (weak)
 * Fall = Sign of its fall (weakest)
 * Peregrine = None of the above
 */
const DIGNITY_TABLE = {
  Sun:     { domicile: ['Leo'],                    exaltation: ['Aries'],      detriment: ['Aquarius'],              fall: ['Libra'] },
  Moon:    { domicile: ['Cancer'],                 exaltation: ['Taurus'],     detriment: ['Capricorn'],             fall: ['Scorpio'] },
  Mercury: { domicile: ['Gemini', 'Virgo'],        exaltation: ['Virgo'],      detriment: ['Sagittarius', 'Pisces'], fall: ['Pisces'] },
  Venus:   { domicile: ['Taurus', 'Libra'],        exaltation: ['Pisces'],     detriment: ['Aries', 'Scorpio'],      fall: ['Virgo'] },
  Mars:    { domicile: ['Aries', 'Scorpio'],       exaltation: ['Capricorn'],  detriment: ['Libra', 'Taurus'],       fall: ['Cancer'] },
  Jupiter: { domicile: ['Sagittarius', 'Pisces'],  exaltation: ['Cancer'],     detriment: ['Gemini', 'Virgo'],       fall: ['Capricorn'] },
  Saturn:  { domicile: ['Capricorn', 'Aquarius'],  exaltation: ['Libra'],      detriment: ['Cancer', 'Leo'],         fall: ['Aries'] },
  Uranus:  { domicile: ['Aquarius'],               exaltation: ['Scorpio'],    detriment: ['Leo'],                   fall: ['Taurus'] },
  Neptune: { domicile: ['Pisces'],                 exaltation: ['Cancer'],     detriment: ['Virgo'],                 fall: ['Capricorn'] },
  Pluto:   { domicile: ['Scorpio'],                exaltation: ['Aries'],      detriment: ['Taurus'],                fall: ['Libra'] },
};

/**
 * Returns the dignity status of a planet in its current sign.
 *
 * @param {string} planetName - Planet name (English)
 * @param {string} sign - Sign name (English)
 * @returns {string|null} 'domicile' | 'exaltation' | 'detriment' | 'fall' | 'peregrine' | null
 */
export function getDignity(planetName, sign) {
  const table = DIGNITY_TABLE[planetName];
  if (!table) return null; // No dignity data for Chiron, Nodes, etc.

  if (table.domicile.includes(sign))   return 'domicile';
  if (table.exaltation.includes(sign)) return 'exaltation';
  if (table.detriment.includes(sign))  return 'detriment';
  if (table.fall.includes(sign))       return 'fall';

  return 'peregrine';
}

/**
 * Turkish dignity equivalent
 */
export function getDignityTr(dignity) {
  const map = {
    domicile: 'Hane (Güçlü)',
    exaltation: 'Yücelme',
    detriment: 'Sürgün (Zayıf)',
    fall: 'Düşüş',
    peregrine: 'Peregrine (Nötr)',
  };
  return map[dignity] || null;
}
```

---

## STEP 7: HELPER FUNCTIONS (src/utils.js)

```javascript
// src/utils.js
import { SIGNS, ELEMENTS, MODALITIES } from './constants.js';

/**
 * Convert ecliptic longitude to sign, degree, minute, second.
 *
 * @param {number} longitude - 0-360° ecliptic longitude
 * @returns {object} {sign, signIndex, degree, minute, second}
 */
export function longitudeToSign(longitude) {
  // Normalize negative or 360+ values
  let lon = longitude % 360;
  if (lon < 0) lon += 360;

  const signIndex = Math.floor(lon / 30);
  const posInSign = lon % 30; // 0-30° range

  const degree = Math.floor(posInSign);
  const fractional = (posInSign - degree) * 60;
  const minute = Math.floor(fractional);
  const second = Math.round((fractional - minute) * 60);

  return {
    sign: SIGNS[signIndex],
    signIndex,
    degree,
    minute,
    second: second >= 60 ? 59 : second, // Prevent rounding overflow
  };
}

/**
 * Determine Moon phase.
 * Returns one of 8 phases based on the Sun-Moon angle.
 */
export function determineMoonPhase(sunLon, moonLon) {
  let angle = moonLon - sunLon;
  if (angle < 0) angle += 360;

  if (angle < 22.5)  return { phase: 'New Moon',         phaseTr: 'Yeni Ay',                angle: roundTo(angle, 2) };
  if (angle < 67.5)  return { phase: 'Waxing Crescent',  phaseTr: 'Hilal (Büyüyen)',         angle: roundTo(angle, 2) };
  if (angle < 112.5) return { phase: 'First Quarter',    phaseTr: 'İlk Dördün',              angle: roundTo(angle, 2) };
  if (angle < 157.5) return { phase: 'Waxing Gibbous',   phaseTr: 'Şişkin Ay (Büyüyen)',     angle: roundTo(angle, 2) };
  if (angle < 202.5) return { phase: 'Full Moon',        phaseTr: 'Dolunay',                 angle: roundTo(angle, 2) };
  if (angle < 247.5) return { phase: 'Waning Gibbous',   phaseTr: 'Şişkin Ay (Küçülen)',     angle: roundTo(angle, 2) };
  if (angle < 292.5) return { phase: 'Last Quarter',     phaseTr: 'Son Dördün',              angle: roundTo(angle, 2) };
  if (angle < 337.5) return { phase: 'Waning Crescent',  phaseTr: 'Hilal (Küçülen)',         angle: roundTo(angle, 2) };

  return { phase: 'New Moon', phaseTr: 'Yeni Ay', angle: roundTo(angle, 2) };
}

/**
 * Calculate Part of Fortune (Fortuna Point).
 * Day chart: ASC + Moon - Sun
 * Night chart: ASC + Sun - Moon
 */
export function calculatePartOfFortune(ascLon, sunLon, moonLon, isDayChart) {
  if (sunLon === undefined || moonLon === undefined) return 0;

  let pof;
  if (isDayChart) {
    pof = ascLon + moonLon - sunLon;
  } else {
    pof = ascLon + sunLon - moonLon;
  }

  // Normalize to 0-360 range
  pof = pof % 360;
  if (pof < 0) pof += 360;
  return pof;
}

/**
 * Calculate element distribution (Fire/Earth/Air/Water)
 */
export function getElementDistribution(planets) {
  const mainPlanets = planets.filter(p =>
    ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'].includes(p.name)
  );
  const dist = { Fire: 0, Earth: 0, Air: 0, Water: 0 };
  mainPlanets.forEach(p => {
    for (const [element, signs] of Object.entries(ELEMENTS)) {
      if (signs.includes(p.sign)) {
        dist[element]++;
        break;
      }
    }
  });
  // Dominant element
  const dominant = Object.entries(dist).sort((a, b) => b[1] - a[1])[0];
  return { ...dist, dominant: dominant[0] };
}

/**
 * Calculate modality distribution (Cardinal/Fixed/Mutable)
 */
export function getModalityDistribution(planets) {
  const mainPlanets = planets.filter(p =>
    ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'].includes(p.name)
  );
  const dist = { Cardinal: 0, Fixed: 0, Mutable: 0 };
  mainPlanets.forEach(p => {
    for (const [modality, signs] of Object.entries(MODALITIES)) {
      if (signs.includes(p.sign)) {
        dist[modality]++;
        break;
      }
    }
  });
  const dominant = Object.entries(dist).sort((a, b) => b[1] - a[1])[0];
  return { ...dist, dominant: dominant[0] };
}

/**
 * Calculate hemisphere emphasis.
 * North/South (relative to ASC-DSC axis) and East/West (relative to MC-IC axis)
 */
export function determineHemisphereEmphasis(planets, ascLon, mcLon) {
  const mainPlanets = planets.filter(p =>
    ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'].includes(p.name)
  );

  const descLon = (ascLon + 180) % 360;
  const icLon = (mcLon + 180) % 360;

  let southern = 0, northern = 0, eastern = 0, western = 0;

  mainPlanets.forEach(p => {
    // Southern hemisphere = houses 7-12 (above the horizon)
    // Northern hemisphere = houses 1-6 (below the horizon)
    if (p.house >= 7) southern++;
    else northern++;

    // Eastern hemisphere = houses 10-3 (ASC side)
    // Western hemisphere = houses 4-9 (DSC side)
    if ([10, 11, 12, 1, 2, 3].includes(p.house)) eastern++;
    else western++;
  });

  return { southern, northern, eastern, western };
}

/**
 * Find which house a planet is in.
 * Search for the planet's longitude between house boundaries (cusps).
 */
export function findPlanetInHouse(planetLon, cusps) {
  // cusps[1] - cusps[12] (index 0 is empty)
  for (let i = 1; i <= 12; i++) {
    const nextHouse = i === 12 ? 1 : i + 1;
    const start = cusps[i];
    const end = cusps[nextHouse];

    // Handle the 0°/360° crossing
    if (start <= end) {
      if (planetLon >= start && planetLon < end) return i;
    } else {
      // Sign boundary crossing (e.g.: 350° - 10°)
      if (planetLon >= start || planetLon < end) return i;
    }
  }
  return 1; // Fallback (should not happen, but for safety)
}

function roundTo(num, decimals) {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}
```

---

## STEP 8: EXPRESS API SERVER (server.js)

```javascript
// server.js
import express from 'express';
import cors from 'cors';
import { calculateNatalChart } from './src/calculator.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ========== HEALTH CHECK ==========
app.get('/health', (req, res) => {
  res.json({ status: 'ok', engine: 'astro-engine', version: '1.0.0' });
});

// ========== CALCULATE NATAL CHART ==========
app.post('/api/natal-chart', (req, res) => {
  try {
    const {
      year, month, day, hour, minute,
      latitude, longitude, timezone,
      houseSystem
    } = req.body;

    // Required field validation
    const required = { year, month, day, hour, minute, latitude, longitude, timezone };
    const missing = Object.entries(required)
      .filter(([key, val]) => val === undefined || val === null)
      .map(([key]) => key);

    if (missing.length > 0) {
      return res.status(400).json({
        error: 'Missing fields',
        missing,
        example: {
          year: 1990, month: 7, day: 15, hour: 14, minute: 30,
          latitude: 41.01, longitude: 28.97,
          timezone: 'Europe/Istanbul',
          houseSystem: 'P'
        }
      });
    }

    const chart = calculateNatalChart({
      year: parseInt(year),
      month: parseInt(month),
      day: parseInt(day),
      hour: parseInt(hour),
      minute: parseInt(minute),
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      timezone,
      houseSystem: houseSystem || 'P',
    });

    res.json(chart);
  } catch (error) {
    console.error('Calculation error:', error.message);
    res.status(400).json({
      error: error.message,
      hint: 'Use IANA format for timezone (e.g.: "Europe/Istanbul", "America/New_York")'
    });
  }
});

// ========== SUPPORTED HOUSE SYSTEMS ==========
app.get('/api/house-systems', (req, res) => {
  const { HOUSE_SYSTEMS } = require('./src/constants.js');
  res.json(HOUSE_SYSTEMS);
});

// ========== START SERVER ==========
app.listen(PORT, () => {
  console.log(`Astro Engine running: http://localhost:${PORT}`);
  console.log(`API endpoint: POST http://localhost:${PORT}/api/natal-chart`);
  console.log(`Health check: GET http://localhost:${PORT}/health`);
});
```

---

## STEP 9: TESTING AND VALIDATION (test.js)

This script calculates natal charts with known birth data and displays the results. You need to manually compare them with astro.com.

```javascript
// test.js
import { calculateNatalChart } from './src/calculator.js';

console.log('='.repeat(70));
console.log('ASTRO-ENGINE TEST SUITE');
console.log('Compare results with astro.com: https://www.astro.com/cgi/chart.cgi');
console.log('='.repeat(70));

// ========== TEST 1: Istanbul, 2020 (fixed UTC+3, no DST) ==========
console.log('\nTEST 1: Istanbul, January 25, 2020, 15:35');
console.log('-'.repeat(50));
try {
  const test1 = calculateNatalChart({
    year: 2020, month: 1, day: 25, hour: 15, minute: 35,
    latitude: 41.0082, longitude: 28.9784,
    timezone: 'Europe/Istanbul',
    houseSystem: 'P',
  });
  console.log(`Sun: ${test1.planets.find(p => p.name === 'Sun').formattedPosition}`);
  console.log(`Moon: ${test1.planets.find(p => p.name === 'Moon').formattedPosition}`);
  console.log(`Ascendant: ${test1.houses.ascendant.formatted}`);
  console.log(`MC: ${test1.houses.midheaven.formatted}`);
  console.log(`Warnings: ${test1.meta.warnings.length > 0 ? test1.meta.warnings.join('; ') : 'None'}`);
  console.log(`Ephemeris mode: ${test1.meta.ephemerisMode}`);
} catch (e) {
  console.error('ERROR:', e.message);
}

// ========== TEST 2: Istanbul, 1990 (DST active period, summer) ==========
console.log('\nTEST 2: Istanbul, July 15, 1990, 14:30 (during DST period)');
console.log('-'.repeat(50));
try {
  const test2 = calculateNatalChart({
    year: 1990, month: 7, day: 15, hour: 14, minute: 30,
    latitude: 41.0082, longitude: 28.9784,
    timezone: 'Europe/Istanbul',
    houseSystem: 'P',
  });
  console.log(`Sun: ${test2.planets.find(p => p.name === 'Sun').formattedPosition}`);
  console.log(`Moon: ${test2.planets.find(p => p.name === 'Moon').formattedPosition}`);
  console.log(`Ascendant: ${test2.houses.ascendant.formatted}`);
  console.log(`DST active: ${test2.input.isDST}`);
  console.log(`UTC offset: ${test2.input.offsetHours} hours`);
} catch (e) {
  console.error('ERROR:', e.message);
}

// ========== TEST 3: New York, 1985 ==========
console.log('\nTEST 3: New York, March 4, 1985, 09:15');
console.log('-'.repeat(50));
try {
  const test3 = calculateNatalChart({
    year: 1985, month: 3, day: 4, hour: 9, minute: 15,
    latitude: 40.7128, longitude: -74.0060, // WEST LONGITUDE = NEGATIVE
    timezone: 'America/New_York',
    houseSystem: 'P',
  });
  console.log(`Sun: ${test3.planets.find(p => p.name === 'Sun').formattedPosition}`);
  console.log(`Moon: ${test3.planets.find(p => p.name === 'Moon').formattedPosition}`);
  console.log(`Ascendant: ${test3.houses.ascendant.formatted}`);
} catch (e) {
  console.error('ERROR:', e.message);
}

// ========== TEST 4: High latitude test (Reykjavik, Iceland) ==========
console.log('\nTEST 4: Reykjavik, June 21, 2000, 12:00 (high latitude)');
console.log('-'.repeat(50));
try {
  const test4 = calculateNatalChart({
    year: 2000, month: 6, day: 21, hour: 12, minute: 0,
    latitude: 64.1466, longitude: -21.9426,
    timezone: 'Atlantic/Reykjavik',
    houseSystem: 'P',
  });
  console.log(`Ascendant: ${test4.houses.ascendant.formatted}`);
  console.log(`Warnings: ${test4.meta.warnings.length > 0 ? test4.meta.warnings.join('; ') : 'None'}`);
} catch (e) {
  console.error('ERROR:', e.message);
}

// ========== TEST 5: Full output example ==========
console.log('\nTEST 5: Full JSON output (Istanbul, July 15, 1990)');
console.log('-'.repeat(50));
try {
  const fullChart = calculateNatalChart({
    year: 1990, month: 7, day: 15, hour: 14, minute: 30,
    latitude: 41.0082, longitude: 28.9784,
    timezone: 'Europe/Istanbul',
  });

  // Planet positions table
  console.log('\nPlanet Positions:');
  fullChart.planets.forEach(p => {
    const retro = p.isRetrograde ? ' R' : '';
    const dignity = p.dignity ? ` [${p.dignity}]` : '';
    console.log(`  ${p.trName.padEnd(20)} ${p.formattedPosition.padEnd(25)} House ${p.house}${retro}${dignity}`);
  });

  // House cusps
  console.log('\nHouse Cusps:');
  fullChart.houses.cusps.forEach(h => {
    console.log(`  House ${String(h.house).padStart(2)}: ${h.formattedCusp}`);
  });

  // Aspects (first 10)
  console.log('\nAspects (first 10):');
  fullChart.aspects.slice(0, 10).forEach(a => {
    const applying = a.isApplying ? 'applying' : 'separating';
    console.log(`  ${a.planet1} ${a.symbol} ${a.planet2} ${a.type} (orb: ${a.orb}°, ${applying}, strength: ${a.strength}%)`);
  });

  // Analysis
  console.log('\nAnalysis:');
  console.log(`  Sun Sign: ${fullChart.analysis.sunSign}`);
  console.log(`  Moon Sign: ${fullChart.analysis.moonSign}`);
  console.log(`  Rising Sign: ${fullChart.analysis.risingSign}`);
  console.log(`  Day Chart: ${fullChart.analysis.isDayChart}`);
  console.log(`  Moon Phase: ${fullChart.analysis.moonPhase?.phaseTr}`);
  console.log(`  Part of Fortune: ${fullChart.analysis.partOfFortune.formatted}`);
  console.log(`  Dominant Element: ${fullChart.analysis.elements.dominant}`);
  console.log(`  Dominant Modality: ${fullChart.analysis.modalities.dominant}`);
  if (fullChart.analysis.stelliums.length > 0) {
    fullChart.analysis.stelliums.forEach(s => {
      console.log(`  Stellium: ${s.sign} (${s.planets.join(', ')})`);
    });
  }
} catch (e) {
  console.error('ERROR:', e.message);
}

console.log('\n' + '='.repeat(70));
console.log('Tests completed. Don\'t forget to compare results with astro.com!');
console.log('='.repeat(70));
```

---

## STEP 10: VERIFICATION PROCEDURE

After running the tests, compare the results with astro.com:

1. Go to https://www.astro.com/cgi/chart.cgi
2. Enter the same birth data
3. Compare the following values (in order of importance):

| Comparison | Acceptable Difference | Reason |
|---|---|---|
| Planet longitudes | <= 1 arc-minute (0°01') | Same ephemeris, should match exactly |
| Ascendant | <= 1 arc-minute | Timezone errors will show up here |
| MC | <= 1 arc-minute | Check alongside ASC |
| Moon position | <= 1 arc-minute | Fastest body, most sensitive to time errors |
| House cusps | <= 2 arc-minutes | May vary by house system |

**If differences are larger than this:**

1. **First check:** Is the timezone conversion correct? (Compare the UTC time)
2. **Second check:** Are jd_et vs jd_ut being used in the correct places?
3. **Third check:** Is the longitude sign correct? (West = negative)

---

## IMPORTANT NOTES AND WARNINGS

### Critical Information About the sweph API

1. **`set_ephe_path()` MUST always be called** — before any calculation. Even if null is passed, it performs internal initialization.

2. **`calc_ut()` takes jd_et** — despite the name containing "ut", it expects Ephemeris Time. This is a confusing naming convention in Swiss Ephemeris.

3. **`houses()` takes jd_ut** — Universal Time. Do not mix up jd_et and jd_ut!

4. **`SEFLG_SPEED` flag is required** — speed data is needed for retrograde detection. Without this flag, `result.data[3]` always returns 0.

5. **Western longitudes are NEGATIVE** — New York: -74.01, London: -0.12, Istanbul: 28.97 (east, positive).

6. **Month is 1-based** — January = 1, February = 2... Different from JavaScript Date's 0-based convention!

7. **Return flag check** — if `result.flag` differs from the input flag, Moshier fallback has occurred. The ephemeris files may not have been found.

### Known Limitations

- **Chiron:** Only reliable for 675 CE – 4650 CE (not an issue for modern use)
- **Placidus/Koch:** Do not work above ~66.5° latitude (automatic Porphyry fallback)
- **Pre-1970 timezone:** IANA database may be limited; a warning is generated
- **Thread safety:** sweph uses global state; be careful with worker_threads

---

## Future Improvements (not covered in this specification)

- Synastry (two-person comparison)
- Transit calculation
- Solar/Lunar return
- Progressions
- Vedic astrology (sidereal zodiac) support
- SVG/Canvas natal chart visualization

---

## RUNNING THE PROJECT

```bash
# Start in development mode
npm run dev

# Run tests
npm test

# Test the API (with curl)
curl -X POST http://localhost:3000/api/natal-chart \
  -H "Content-Type: application/json" \
  -d '{
    "year": 1990, "month": 7, "day": 15,
    "hour": 14, "minute": 30,
    "latitude": 41.0082, "longitude": 28.9784,
    "timezone": "Europe/Istanbul"
  }'
```

---

## LICENSE

This project is under the AGPL-3.0 license. Swiss Ephemeris is developed by Astrodienst AG. For commercial closed-source use, a professional license must be purchased from Astrodienst (https://www.astro.com/swisseph/).
