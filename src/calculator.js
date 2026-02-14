// src/calculator.js
import * as swe from 'sweph';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { CELESTIAL_BODIES, SIGNS, HOUSE_SYSTEMS } from './constants.js';
import { birthTimeToUTC } from './timezone.js';
import { calculateAspects } from './aspects.js';
import { getDignity, getSignRuler } from './dignities.js';
import {
  longitudeToSign,
  determineMoonPhase,
  calculatePartOfFortune,
  getElementDistribution,
  getModalityDistribution,
  determineHemisphereEmphasis,
  findPlanetInHouse,
  roundTo,
} from './utils.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');

// __dirname ES module equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set the ephemeris file path
// CRITICAL: This function must be called before ALL calculations
// Performs internal initialization; must be called even if null is passed
const ephePath = path.join(__dirname, '..', 'ephe');
swe.set_ephe_path(ephePath);

/**
 * Calculate full natal chart.
 *
 * @param {object} params - Birth data
 * @param {number} params.year - Birth year
 * @param {number} params.month - Birth month (1-12)
 * @param {number} params.day - Birth day
 * @param {number} params.hour - Birth hour (0-23)
 * @param {number} params.minute - Birth minute (0-59)
 * @param {number} params.latitude - Birth place latitude (north positive)
 * @param {number} params.longitude - Birth place longitude (east positive, WEST NEGATIVE)
 * @param {string} params.timezone - IANA timezone (e.g., "Europe/Istanbul")
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
  // CRITICAL: Use utc_to_jd() instead of julday() — it handles the ΔT conversion automatically
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

    // Check result.flag — if it differs from the input flags, Moshier fallback may have occurred
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

  // housesResult.data.houses: 0-indexed array (houses[0] = House 1, houses[11] = House 12)
  // housesResult.data.points: [ASC, MC, ARMC, Vertex, EquatorialASC, co-ASC Koch, co-ASC Munkasey, PolarASC]
  const rawHouses = housesResult.data.houses;
  const points = housesResult.data.points;

  // Convert to 1-indexed cusps array (cusps[1]-cusps[12], cusps[0] is empty)
  const cusps = [0, ...rawHouses];

  const ascendant = points[0];
  const midheaven = points[1];
  const armc = points[2]; // Sidereal time (ARMC)
  const vertex = points[3];

  // Polar latitude warning (Placidus and Koch fail above ~66.5°)
  const warnings = [...utcData.warnings];

  if (['P', 'K'].includes(houseSystem) && Math.abs(latitude) > 66) {
    warnings.push(
      `${HOUSE_SYSTEMS[houseSystem].name} house system may be unreliable at ${Math.abs(latitude)}° latitude. ` +
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

  // Ascendant and MC detailed
  const ascData = longitudeToSign(ascendant);
  const mcData = longitudeToSign(midheaven);
  const vtxData = longitudeToSign(vertex);

  // Find which house each planet is in
  const sunPlanet = planets.find(p => p.name === 'Sun');

  // Day/night chart detection (is the Sun above the horizon?)
  const isDayChart = sunPlanet ? isAboveHorizon(sunPlanet.longitude, ascendant) : true;

  const planetsWithHouses = planets.map(planet => {
    const house = findPlanetInHouse(planet.longitude, cusps);
    return {
      ...planet,
      house,
    };
  });

  // ========== ASPECTS ==========

  // Include Ascendant and MC in aspect calculations
  const aspectBodies = [
    ...planetsWithHouses,
    { name: 'Ascendant', trName: 'Yükselen', longitude: ascendant, speed: 0 },
    { name: 'Midheaven', trName: 'Gökyüzü Ortası', longitude: midheaven, speed: 0 },
  ];

  const aspects = calculateAspects(aspectBodies);

  // ========== CHART ANALYSIS ==========

  const sun = planetsWithHouses.find(p => p.name === 'Sun');
  const moon = planetsWithHouses.find(p => p.name === 'Moon');

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

  // Chart ruler (ruler of the rising sign)
  const chartRulerName = getSignRuler(ascData.sign);
  const chartRulerPlanet = planetsWithHouses.find(p => p.name === chartRulerName);
  const chartRuler = chartRulerPlanet ? {
    name: chartRulerPlanet.name,
    trName: chartRulerPlanet.trName,
    sign: chartRulerPlanet.sign,
    house: chartRulerPlanet.house,
    longitude: chartRulerPlanet.longitude,
    isRetrograde: chartRulerPlanet.isRetrograde,
    dignity: chartRulerPlanet.dignity,
    formattedPosition: chartRulerPlanet.formattedPosition,
  } : null;

  // House rulers (ruler of each house cusp sign + its position)
  const houseRulers = houses.map(h => {
    const rulerName = getSignRuler(h.sign);
    const rulerPlanet = planetsWithHouses.find(p => p.name === rulerName);
    return {
      house: h.house,
      cuspSign: h.sign,
      rulingPlanet: rulerName,
      rulingPlanetTr: rulerPlanet?.trName || null,
      rulerSign: rulerPlanet?.sign || null,
      rulerHouse: rulerPlanet?.house || null,
      rulerLongitude: rulerPlanet?.longitude || null,
      rulerIsRetrograde: rulerPlanet?.isRetrograde || false,
      rulerDignity: rulerPlanet?.dignity || null,
    };
  });

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
      chartRuler,
      houseRulers,
    },

    meta: {
      julianDayET: roundTo(jd_et, 8),
      julianDayUT: roundTo(jd_ut, 8),
      siderealTime: roundTo(armc, 6),
      deltaT: roundTo((jd_et - jd_ut) * 86400, 2), // in seconds
      ephemerisMode: planetsWithHouses.some(p => p.usedMoshierFallback) ? 'Moshier (fallback)' : 'Swiss Ephemeris',
      engine: 'sweph (Swiss Ephemeris Node.js binding)',
      version,
      warnings,
    },
  };
}

// ========== HELPER FUNCTIONS ==========

function isAboveHorizon(planetLon, ascLon) {
  const desc = (ascLon + 180) % 360;
  if (ascLon < desc) {
    return planetLon >= ascLon && planetLon < desc ? false : true;
  } else {
    return planetLon >= ascLon || planetLon < desc ? false : true;
  }
}

function findStelliums(planets) {
  // Sun, Moon, and traditional planets (excluding Chiron and Nodes)
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
