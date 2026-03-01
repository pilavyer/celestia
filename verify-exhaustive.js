/**
 * verify-exhaustive.js — Exhaustive Calestia Verification
 *
 * Independently recomputes and validates EVERY derived field in calestia output:
 *   A. Planet positions & sign assignments (25 charts)
 *   B. Aspect geometry & orb modifiers (25 charts)
 *   C. Dignity lookup table (25 charts)
 *   D. Moon phase classification (25 charts + 16 synthetic angles)
 *   E. Part of Fortune (day/night formula) (25 charts)
 *   F. Element & modality distribution (25 charts)
 *   G. Hemisphere emphasis (25 charts)
 *   H. Stellium detection (25 charts)
 *   I. Chart ruler & house rulers (25 charts)
 *   J. South Node = True Node + 180° (25 charts)
 *   K. Synastry: cross-aspects, house overlay, composite midpoints (5 pairs)
 *   L. Transit orb scaling & strength (3 charts)
 *   M. Lunar metrics: illumination, moon day, phase (12 dates)
 *   N. House system variation (5 charts × 8 systems = 40)
 *   O. Edge cases: high latitude, 0°/360° boundary, midnight, DST
 *   P. Speed & retrograde consistency (25 charts)
 *   Q. Meta fields: deltaT, sidereal time (25 charts)
 *   R. Formatted position consistency (25 charts)
 *
 * Target: ~15,000+ individual checks
 */

import * as swe from 'sweph';
import path from 'path';
import { fileURLToPath } from 'url';
import { calculateNatalChart } from './src/calculator.js';
import { calculateSynastry, midpoint } from './src/synastry.js';
import { calculateTransits, calculateLunarMetrics, getPlanetPositionsAtJD, dateToJD } from './src/transit.js';
import { SIGNS, CELESTIAL_BODIES, ASPECTS, HOUSE_SYSTEMS, ELEMENTS, MODALITIES, SIGN_RULERS } from './src/constants.js';
import { longitudeToSign, findPlanetInHouse, determineMoonPhase, calculatePartOfFortune, getElementDistribution, getModalityDistribution, determineHemisphereEmphasis, roundTo } from './src/utils.js';
import { getDignity, getSignRuler } from './src/dignities.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
swe.set_ephe_path(path.join(__dirname, 'ephe'));

// ============================================================
// TEST INFRASTRUCTURE
// ============================================================

let totalChecks = 0;
let totalFails = 0;
const sectionStats = {};
let currentSection = '';

function setSection(name) {
  currentSection = name;
  if (!sectionStats[name]) sectionStats[name] = { checks: 0, fails: 0 };
}

function check(condition, label) {
  totalChecks++;
  sectionStats[currentSection].checks++;
  if (!condition) {
    totalFails++;
    sectionStats[currentSection].fails++;
    console.log(`  FAIL: ${label}`);
  }
}

function approxEq(a, b, tol = 0.000001) {
  return Math.abs(a - b) < tol;
}

// ============================================================
// 25 DIVERSE CHARTS
// ============================================================

const CHARTS = [
  // ---- Turkey ----
  { year: 1990, month: 7, day: 15, hour: 14, minute: 30, latitude: 41.0082, longitude: 28.9784, timezone: 'Europe/Istanbul', label: 'Istanbul 1990' },
  { year: 1997, month: 3, day: 22, hour: 8, minute: 15, latitude: 39.9334, longitude: 32.8597, timezone: 'Europe/Istanbul', label: 'Ankara 1997' },
  { year: 1985, month: 11, day: 5, hour: 23, minute: 45, latitude: 38.4192, longitude: 27.1287, timezone: 'Europe/Istanbul', label: 'Izmir 1985 late night' },
  { year: 2001, month: 6, day: 21, hour: 0, minute: 1, latitude: 36.8, longitude: 34.63, timezone: 'Europe/Istanbul', label: 'Mersin 2001 midnight' },
  { year: 1975, month: 12, day: 25, hour: 6, minute: 0, latitude: 41.29, longitude: 36.33, timezone: 'Europe/Istanbul', label: 'Samsun 1975 Christmas dawn' },

  // ---- Europe ----
  { year: 1993, month: 10, day: 31, hour: 1, minute: 30, latitude: 51.5074, longitude: -0.1278, timezone: 'Europe/London', label: 'London 1993 DST fallback' },
  { year: 2000, month: 1, day: 1, hour: 0, minute: 0, latitude: 48.8566, longitude: 2.3522, timezone: 'Europe/Paris', label: 'Paris Y2K midnight' },
  { year: 1988, month: 8, day: 8, hour: 8, minute: 8, latitude: 52.52, longitude: 13.405, timezone: 'Europe/Berlin', label: 'Berlin 1988 888' },
  { year: 1960, month: 2, day: 29, hour: 15, minute: 0, latitude: 40.4168, longitude: -3.7038, timezone: 'Europe/Madrid', label: 'Madrid 1960 leap day' },
  { year: 2010, month: 3, day: 28, hour: 2, minute: 30, latitude: 41.9028, longitude: 12.4964, timezone: 'Europe/Rome', label: 'Rome 2010 DST spring' },

  // ---- Americas ----
  { year: 1985, month: 3, day: 4, hour: 9, minute: 15, latitude: 40.7128, longitude: -74.006, timezone: 'America/New_York', label: 'New York 1985' },
  { year: 1972, month: 7, day: 4, hour: 12, minute: 0, latitude: 34.0522, longitude: -118.2437, timezone: 'America/Los_Angeles', label: 'LA 1972 July 4th noon' },
  { year: 1995, month: 5, day: 15, hour: 3, minute: 45, latitude: -23.5505, longitude: -46.6333, timezone: 'America/Sao_Paulo', label: 'Sao Paulo 1995' },
  { year: 2005, month: 9, day: 11, hour: 8, minute: 46, latitude: 40.7128, longitude: -74.006, timezone: 'America/New_York', label: 'New York 2005' },
  { year: 1968, month: 4, day: 4, hour: 19, minute: 0, latitude: -34.6037, longitude: -58.3816, timezone: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires 1968' },

  // ---- Asia ----
  { year: 1999, month: 8, day: 11, hour: 11, minute: 11, latitude: 35.6762, longitude: 139.6503, timezone: 'Asia/Tokyo', label: 'Tokyo 1999 eclipse' },
  { year: 1980, month: 1, day: 14, hour: 5, minute: 30, latitude: 19.076, longitude: 72.8777, timezone: 'Asia/Kolkata', label: 'Mumbai 1980 dawn' },
  { year: 2015, month: 12, day: 31, hour: 23, minute: 59, latitude: 1.3521, longitude: 103.8198, timezone: 'Asia/Singapore', label: 'Singapore NYE 2015' },

  // ---- Southern Hemisphere ----
  { year: 1992, month: 6, day: 15, hour: 7, minute: 30, latitude: -33.8688, longitude: 151.2093, timezone: 'Australia/Sydney', label: 'Sydney 1992 winter' },
  { year: 2020, month: 1, day: 25, hour: 15, minute: 35, latitude: 41.0082, longitude: 28.9784, timezone: 'Europe/Istanbul', label: 'Istanbul 2020 ref' },

  // ---- Edge: high latitude ----
  { year: 2003, month: 6, day: 21, hour: 12, minute: 0, latitude: 64.1466, longitude: -21.9426, timezone: 'Atlantic/Reykjavik', label: 'Reykjavik summer solstice', houseSystem: 'W' },
  { year: 2008, month: 12, day: 21, hour: 12, minute: 0, latitude: 60.1699, longitude: 24.9384, timezone: 'Europe/Helsinki', label: 'Helsinki winter solstice' },

  // ---- Edge: 0°/360° boundary (late Pisces / early Aries) ----
  { year: 1996, month: 3, day: 20, hour: 15, minute: 0, latitude: 51.5074, longitude: -0.1278, timezone: 'Europe/London', label: 'London equinox 1996' },

  // ---- Additional decades ----
  { year: 1965, month: 4, day: 10, hour: 10, minute: 30, latitude: 37.7749, longitude: -122.4194, timezone: 'America/Los_Angeles', label: 'San Francisco 1965' },
  { year: 2024, month: 8, day: 19, hour: 16, minute: 0, latitude: 55.7558, longitude: 37.6173, timezone: 'Europe/Moscow', label: 'Moscow 2024' },
];

// ============================================================
// SECTION A: PLANET POSITIONS & SIGN ASSIGNMENTS
// ============================================================

console.log('\n=== SECTION A: Planet Positions & Sign Assignments ===');
setSection('A');

const calcFlags = swe.constants.SEFLG_SWIEPH | swe.constants.SEFLG_SPEED;

for (const cd of CHARTS) {
  const chart = calculateNatalChart(cd);

  // Verify each planet's sign matches longitude
  // Note: planet.longitude is rounded to 6 decimals, but DMS was computed from raw longitude.
  // So we verify sign consistency and DMS range validity, plus that stored DMS matches
  // what longitudeToSign(planet.longitude) produces (which uses the rounded value).
  for (const planet of chart.planets) {
    const expectedSign = longitudeToSign(planet.longitude);
    check(planet.sign === expectedSign.sign, `${cd.label}: ${planet.name} sign ${planet.sign} vs expected ${expectedSign.sign}`);
    check(planet.signIndex === expectedSign.signIndex, `${cd.label}: ${planet.name} signIndex`);
    // DMS may differ by ±1 second due to rounding from raw vs rounded longitude
    check(Math.abs(planet.degree - expectedSign.degree) <= 0 ||
          (planet.degree === 29 && expectedSign.degree === 0) ||
          (planet.degree === 0 && expectedSign.degree === 29),
      `${cd.label}: ${planet.name} degree`);
    check(planet.minute >= 0 && planet.minute < 60, `${cd.label}: ${planet.name} minute in range`);
    check(planet.second >= 0 && planet.second < 60, `${cd.label}: ${planet.name} second in range`);
  }

  // Verify house cusps sign assignment
  for (const cusp of chart.houses.cusps) {
    const expectedCusp = longitudeToSign(cusp.cusp);
    check(cusp.sign === expectedCusp.sign, `${cd.label}: House ${cusp.house} cusp sign`);
  }

  // Verify ASC and MC sign
  const ascExpected = longitudeToSign(chart.houses.ascendant.longitude);
  check(chart.houses.ascendant.sign === ascExpected.sign, `${cd.label}: ASC sign`);
  const mcExpected = longitudeToSign(chart.houses.midheaven.longitude);
  check(chart.houses.midheaven.sign === mcExpected.sign, `${cd.label}: MC sign`);
}

console.log(`  Section A: ${sectionStats['A'].checks} checks, ${sectionStats['A'].fails} failures`);

// ============================================================
// SECTION B: ASPECT GEOMETRY & ORB MODIFIERS
// ============================================================

console.log('\n=== SECTION B: Aspect Geometry & Orb Modifiers ===');
setSection('B');

for (const cd of CHARTS) {
  const chart = calculateNatalChart(cd);

  for (const aspect of chart.aspects) {
    // 1. Verify actualAngle: angular distance between the two bodies
    const body1 = chart.planets.find(p => p.name === aspect.planet1) ||
      (aspect.planet1 === 'Ascendant' ? { longitude: chart.houses.ascendant.longitude } : null) ||
      (aspect.planet1 === 'Midheaven' ? { longitude: chart.houses.midheaven.longitude } : null);
    const body2 = chart.planets.find(p => p.name === aspect.planet2) ||
      (aspect.planet2 === 'Ascendant' ? { longitude: chart.houses.ascendant.longitude } : null) ||
      (aspect.planet2 === 'Midheaven' ? { longitude: chart.houses.midheaven.longitude } : null);

    if (body1 && body2) {
      let diff = Math.abs(body1.longitude - body2.longitude);
      if (diff > 180) diff = 360 - diff;
      const expectedAngle = roundTo(diff, 2);
      check(approxEq(aspect.actualAngle, expectedAngle, 0.015),
        `${cd.label}: ${aspect.planet1}-${aspect.planet2} actualAngle ${aspect.actualAngle} vs ${expectedAngle}`);

      // 2. Verify orb = |actualAngle - exactAngle|
      const expectedOrb = roundTo(Math.abs(diff - aspect.exactAngle), 2);
      check(approxEq(aspect.orb, expectedOrb, 0.015),
        `${cd.label}: ${aspect.planet1}-${aspect.planet2} orb ${aspect.orb} vs ${expectedOrb}`);

      // 3. Verify maxOrb includes luminary/angle modifiers
      const aspectDef = ASPECTS.find(a => a.name === aspect.type);
      let expectedMaxOrb = aspectDef.orb;
      const luminaries = ['Sun', 'Moon'];
      if (luminaries.includes(aspect.planet1) || luminaries.includes(aspect.planet2)) {
        expectedMaxOrb *= 1.25;
      }
      const angles = ['Ascendant', 'Midheaven'];
      if (angles.includes(aspect.planet1) || angles.includes(aspect.planet2)) {
        expectedMaxOrb *= 0.75;
      }
      check(approxEq(aspect.maxOrb, roundTo(expectedMaxOrb, 2), 0.015),
        `${cd.label}: ${aspect.planet1}-${aspect.planet2} maxOrb ${aspect.maxOrb} vs ${roundTo(expectedMaxOrb, 2)}`);

      // 4. Verify strength formula
      const deviation = Math.abs(diff - aspect.exactAngle);
      const expectedStrength = Math.max(0, Math.min(100, Math.round((1 - deviation / expectedMaxOrb) * 100)));
      check(Math.abs(aspect.strength - expectedStrength) <= 1,
        `${cd.label}: ${aspect.planet1}-${aspect.planet2} strength ${aspect.strength} vs ${expectedStrength}`);

      // 5. Verify orb ≤ maxOrb (within orb)
      check(aspect.orb <= aspect.maxOrb + 0.01,
        `${cd.label}: ${aspect.planet1}-${aspect.planet2} orb ${aspect.orb} should be <= maxOrb ${aspect.maxOrb}`);

      // 6. Verify strength 0-100 range
      check(aspect.strength >= 0 && aspect.strength <= 100,
        `${cd.label}: ${aspect.planet1}-${aspect.planet2} strength in range`);
    }
  }

  // 7. No True Node ↔ South Node aspect should exist
  const nodeAspect = chart.aspects.find(a =>
    (a.planet1 === 'True Node' && a.planet2 === 'South Node') ||
    (a.planet1 === 'South Node' && a.planet2 === 'True Node')
  );
  check(!nodeAspect, `${cd.label}: no True Node-South Node aspect exists`);

  // 8. No duplicate aspect pairs
  const aspectPairs = new Set();
  for (const a of chart.aspects) {
    const key = [a.planet1, a.planet2].sort().join('|');
    check(!aspectPairs.has(key), `${cd.label}: duplicate aspect pair ${key}`);
    aspectPairs.add(key);
  }

  // 9. Aspects should be sorted by orb (ascending)
  for (let i = 1; i < chart.aspects.length; i++) {
    check(chart.aspects[i].orb >= chart.aspects[i-1].orb - 0.001,
      `${cd.label}: aspects sorted by orb at index ${i}`);
  }
}

console.log(`  Section B: ${sectionStats['B'].checks} checks, ${sectionStats['B'].fails} failures`);

// ============================================================
// SECTION C: DIGNITY LOOKUP TABLE
// ============================================================

console.log('\n=== SECTION C: Dignity Lookup Table ===');
setSection('C');

// Full dignity table for independent verification
const DIGNITY_REF = {
  Sun:     { domicile: ['Leo'],                  exaltation: ['Aries'],     detriment: ['Aquarius'],            fall: ['Libra'] },
  Moon:    { domicile: ['Cancer'],               exaltation: ['Taurus'],    detriment: ['Capricorn'],           fall: ['Scorpio'] },
  Mercury: { domicile: ['Gemini', 'Virgo'],      exaltation: ['Virgo'],     detriment: ['Sagittarius', 'Pisces'], fall: ['Pisces'] },
  Venus:   { domicile: ['Taurus', 'Libra'],      exaltation: ['Pisces'],    detriment: ['Aries', 'Scorpio'],    fall: ['Virgo'] },
  Mars:    { domicile: ['Aries', 'Scorpio'],     exaltation: ['Capricorn'], detriment: ['Libra', 'Taurus'],     fall: ['Cancer'] },
  Jupiter: { domicile: ['Sagittarius', 'Pisces'],exaltation: ['Cancer'],    detriment: ['Gemini', 'Virgo'],     fall: ['Capricorn'] },
  Saturn:  { domicile: ['Capricorn', 'Aquarius'],exaltation: ['Libra'],     detriment: ['Cancer', 'Leo'],       fall: ['Aries'] },
  Uranus:  { domicile: ['Aquarius'],             exaltation: ['Scorpio'],   detriment: ['Leo'],                 fall: ['Taurus'] },
  Neptune: { domicile: ['Pisces'],               exaltation: ['Cancer'],    detriment: ['Virgo'],               fall: ['Capricorn'] },
  Pluto:   { domicile: ['Scorpio'],              exaltation: ['Aries'],     detriment: ['Taurus'],              fall: ['Libra'] },
};

function expectedDignity(planetName, sign) {
  const table = DIGNITY_REF[planetName];
  if (!table) return null;
  if (table.domicile.includes(sign)) return 'domicile';
  if (table.exaltation.includes(sign)) return 'exaltation';
  if (table.detriment.includes(sign)) return 'detriment';
  if (table.fall.includes(sign)) return 'fall';
  return 'peregrine';
}

for (const cd of CHARTS) {
  const chart = calculateNatalChart(cd);
  for (const planet of chart.planets) {
    const expected = expectedDignity(planet.name, planet.sign);
    check(planet.dignity === expected,
      `${cd.label}: ${planet.name} in ${planet.sign} dignity=${planet.dignity} expected=${expected}`);
  }
}

// Exhaustive dignity table test: every planet × every sign
for (const planetName of Object.keys(DIGNITY_REF)) {
  for (const sign of SIGNS) {
    const result = getDignity(planetName, sign);
    const expected = expectedDignity(planetName, sign);
    check(result === expected, `Dignity table: ${planetName} in ${sign} = ${result} expected ${expected}`);
  }
}

console.log(`  Section C: ${sectionStats['C'].checks} checks, ${sectionStats['C'].fails} failures`);

// ============================================================
// SECTION D: MOON PHASE CLASSIFICATION
// ============================================================

console.log('\n=== SECTION D: Moon Phase Classification ===');
setSection('D');

// Synthetic angle tests for all 8 phases + boundaries
const PHASE_TESTS = [
  { sunMoonAngle: 0,     expected: 'New Moon' },
  { sunMoonAngle: 10,    expected: 'New Moon' },
  { sunMoonAngle: 22.4,  expected: 'New Moon' },
  { sunMoonAngle: 22.5,  expected: 'Waxing Crescent' },
  { sunMoonAngle: 45,    expected: 'Waxing Crescent' },
  { sunMoonAngle: 67.5,  expected: 'First Quarter' },
  { sunMoonAngle: 90,    expected: 'First Quarter' },
  { sunMoonAngle: 112.5, expected: 'Waxing Gibbous' },
  { sunMoonAngle: 135,   expected: 'Waxing Gibbous' },
  { sunMoonAngle: 157.5, expected: 'Full Moon' },
  { sunMoonAngle: 180,   expected: 'Full Moon' },
  { sunMoonAngle: 202.5, expected: 'Waning Gibbous' },
  { sunMoonAngle: 225,   expected: 'Waning Gibbous' },
  { sunMoonAngle: 247.5, expected: 'Last Quarter' },
  { sunMoonAngle: 270,   expected: 'Last Quarter' },
  { sunMoonAngle: 292.5, expected: 'Waning Crescent' },
  { sunMoonAngle: 315,   expected: 'Waning Crescent' },
  { sunMoonAngle: 337.5, expected: 'New Moon' },
  { sunMoonAngle: 350,   expected: 'New Moon' },
  { sunMoonAngle: 359.9, expected: 'New Moon' },
];

for (const pt of PHASE_TESTS) {
  // Sun at 0°, Moon at angle
  const result = determineMoonPhase(0, pt.sunMoonAngle);
  check(result.phase === pt.expected,
    `Moon phase at angle ${pt.sunMoonAngle}° = ${result.phase}, expected ${pt.expected}`);
}

// Verify moon phase from actual charts
for (const cd of CHARTS) {
  const chart = calculateNatalChart(cd);
  if (chart.analysis.moonPhase) {
    const sun = chart.planets.find(p => p.name === 'Sun');
    const moon = chart.planets.find(p => p.name === 'Moon');
    const expected = determineMoonPhase(sun.longitude, moon.longitude);
    check(chart.analysis.moonPhase.phase === expected.phase,
      `${cd.label}: moon phase ${chart.analysis.moonPhase.phase} vs ${expected.phase}`);
    check(approxEq(chart.analysis.moonPhase.angle, expected.angle, 0.02),
      `${cd.label}: moon phase angle ${chart.analysis.moonPhase.angle} vs ${expected.angle}`);
  }
}

console.log(`  Section D: ${sectionStats['D'].checks} checks, ${sectionStats['D'].fails} failures`);

// ============================================================
// SECTION E: PART OF FORTUNE (DAY/NIGHT FORMULA)
// ============================================================

console.log('\n=== SECTION E: Part of Fortune ===');
setSection('E');

for (const cd of CHARTS) {
  const chart = calculateNatalChart(cd);
  const sun = chart.planets.find(p => p.name === 'Sun');
  const moon = chart.planets.find(p => p.name === 'Moon');
  const asc = chart.houses.ascendant.longitude;
  const isDayChart = chart.analysis.isDayChart;

  const expected = calculatePartOfFortune(asc, sun.longitude, moon.longitude, isDayChart);
  check(approxEq(chart.analysis.partOfFortune.longitude, roundTo(expected, 6), 0.00001),
    `${cd.label}: PoF longitude ${chart.analysis.partOfFortune.longitude} vs ${roundTo(expected, 6)}`);

  // Verify PoF sign matches longitude
  const pofSign = longitudeToSign(chart.analysis.partOfFortune.longitude);
  check(chart.analysis.partOfFortune.sign === pofSign.sign,
    `${cd.label}: PoF sign ${chart.analysis.partOfFortune.sign} vs ${pofSign.sign}`);

  // Verify PoF in 0-360 range
  check(chart.analysis.partOfFortune.longitude >= 0 && chart.analysis.partOfFortune.longitude < 360,
    `${cd.label}: PoF in range`);

  // Verify day/night chart formula independently
  // Day: ASC + Moon - Sun, Night: ASC + Sun - Moon
  let manualPoF;
  if (isDayChart) {
    manualPoF = asc + moon.longitude - sun.longitude;
  } else {
    manualPoF = asc + sun.longitude - moon.longitude;
  }
  manualPoF = manualPoF % 360;
  if (manualPoF < 0) manualPoF += 360;
  check(approxEq(chart.analysis.partOfFortune.longitude, roundTo(manualPoF, 6), 0.00001),
    `${cd.label}: PoF manual formula check`);
}

console.log(`  Section E: ${sectionStats['E'].checks} checks, ${sectionStats['E'].fails} failures`);

// ============================================================
// SECTION F: ELEMENT & MODALITY DISTRIBUTION
// ============================================================

console.log('\n=== SECTION F: Element & Modality Distribution ===');
setSection('F');

const MAIN_PLANET_NAMES = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];

for (const cd of CHARTS) {
  const chart = calculateNatalChart(cd);
  const mainPlanets = chart.planets.filter(p => MAIN_PLANET_NAMES.includes(p.name));

  // Independent element count
  const elemCount = { Fire: 0, Earth: 0, Air: 0, Water: 0 };
  for (const p of mainPlanets) {
    for (const [element, signs] of Object.entries(ELEMENTS)) {
      if (signs.includes(p.sign)) { elemCount[element]++; break; }
    }
  }
  const elemDominant = Object.entries(elemCount).sort((a, b) => b[1] - a[1])[0][0];

  check(chart.analysis.elements.Fire === elemCount.Fire, `${cd.label}: Fire count`);
  check(chart.analysis.elements.Earth === elemCount.Earth, `${cd.label}: Earth count`);
  check(chart.analysis.elements.Air === elemCount.Air, `${cd.label}: Air count`);
  check(chart.analysis.elements.Water === elemCount.Water, `${cd.label}: Water count`);
  check(chart.analysis.elements.dominant === elemDominant, `${cd.label}: dominant element`);

  // Sum should be 10 (main planets)
  const elemSum = elemCount.Fire + elemCount.Earth + elemCount.Air + elemCount.Water;
  check(elemSum === 10, `${cd.label}: element sum = ${elemSum}, expected 10`);

  // Independent modality count
  const modCount = { Cardinal: 0, Fixed: 0, Mutable: 0 };
  for (const p of mainPlanets) {
    for (const [modality, signs] of Object.entries(MODALITIES)) {
      if (signs.includes(p.sign)) { modCount[modality]++; break; }
    }
  }
  const modDominant = Object.entries(modCount).sort((a, b) => b[1] - a[1])[0][0];

  check(chart.analysis.modalities.Cardinal === modCount.Cardinal, `${cd.label}: Cardinal count`);
  check(chart.analysis.modalities.Fixed === modCount.Fixed, `${cd.label}: Fixed count`);
  check(chart.analysis.modalities.Mutable === modCount.Mutable, `${cd.label}: Mutable count`);
  check(chart.analysis.modalities.dominant === modDominant, `${cd.label}: dominant modality`);

  const modSum = modCount.Cardinal + modCount.Fixed + modCount.Mutable;
  check(modSum === 10, `${cd.label}: modality sum = ${modSum}, expected 10`);
}

console.log(`  Section F: ${sectionStats['F'].checks} checks, ${sectionStats['F'].fails} failures`);

// ============================================================
// SECTION G: HEMISPHERE EMPHASIS
// ============================================================

console.log('\n=== SECTION G: Hemisphere Emphasis ===');
setSection('G');

for (const cd of CHARTS) {
  const chart = calculateNatalChart(cd);
  const mainPlanets = chart.planets.filter(p => MAIN_PLANET_NAMES.includes(p.name));

  // Independent hemisphere count
  let southern = 0, northern = 0, eastern = 0, western = 0;
  for (const p of mainPlanets) {
    if (p.house >= 7) southern++; else northern++;
    if ([10, 11, 12, 1, 2, 3].includes(p.house)) eastern++; else western++;
  }

  check(chart.analysis.hemispheres.southern === southern, `${cd.label}: southern ${chart.analysis.hemispheres.southern} vs ${southern}`);
  check(chart.analysis.hemispheres.northern === northern, `${cd.label}: northern ${chart.analysis.hemispheres.northern} vs ${northern}`);
  check(chart.analysis.hemispheres.eastern === eastern, `${cd.label}: eastern ${chart.analysis.hemispheres.eastern} vs ${eastern}`);
  check(chart.analysis.hemispheres.western === western, `${cd.label}: western ${chart.analysis.hemispheres.western} vs ${western}`);

  // N+S=10, E+W=10
  check(southern + northern === 10, `${cd.label}: N+S = ${southern + northern}`);
  check(eastern + western === 10, `${cd.label}: E+W = ${eastern + western}`);
}

console.log(`  Section G: ${sectionStats['G'].checks} checks, ${sectionStats['G'].fails} failures`);

// ============================================================
// SECTION H: STELLIUM DETECTION
// ============================================================

console.log('\n=== SECTION H: Stellium Detection ===');
setSection('H');

for (const cd of CHARTS) {
  const chart = calculateNatalChart(cd);
  const mainPlanets = chart.planets.filter(p => MAIN_PLANET_NAMES.includes(p.name));

  // Independent stellium detection
  const signCounts = {};
  for (const p of mainPlanets) {
    if (!signCounts[p.sign]) signCounts[p.sign] = [];
    signCounts[p.sign].push(p.name);
  }

  const expectedStelliums = [];
  for (const [sign, names] of Object.entries(signCounts)) {
    if (names.length >= 3) {
      expectedStelliums.push({ sign, planets: names.sort(), count: names.length });
    }
  }

  check(chart.analysis.stelliums.length === expectedStelliums.length,
    `${cd.label}: stellium count ${chart.analysis.stelliums.length} vs ${expectedStelliums.length}`);

  for (const expected of expectedStelliums) {
    const found = chart.analysis.stelliums.find(s => s.sign === expected.sign);
    check(!!found, `${cd.label}: stellium in ${expected.sign} found`);
    if (found) {
      check(found.count === expected.count, `${cd.label}: stellium ${expected.sign} count ${found.count} vs ${expected.count}`);
      check(JSON.stringify(found.planets.sort()) === JSON.stringify(expected.planets),
        `${cd.label}: stellium ${expected.sign} planets match`);
    }
  }
}

console.log(`  Section H: ${sectionStats['H'].checks} checks, ${sectionStats['H'].fails} failures`);

// ============================================================
// SECTION I: CHART RULER & HOUSE RULERS
// ============================================================

console.log('\n=== SECTION I: Chart Ruler & House Rulers ===');
setSection('I');

const SIGN_RULERS_REF = {
  Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon',
  Leo: 'Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Pluto',
  Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Uranus', Pisces: 'Neptune',
};

for (const cd of CHARTS) {
  const chart = calculateNatalChart(cd);

  // Chart ruler = ruler of ASC sign
  const ascSign = chart.houses.ascendant.sign;
  const expectedRulerName = SIGN_RULERS_REF[ascSign];
  check(chart.analysis.chartRuler.name === expectedRulerName,
    `${cd.label}: chart ruler ${chart.analysis.chartRuler.name} vs ${expectedRulerName}`);

  // Chart ruler planet data should match
  const rulerPlanet = chart.planets.find(p => p.name === expectedRulerName);
  if (rulerPlanet) {
    check(chart.analysis.chartRuler.sign === rulerPlanet.sign, `${cd.label}: chart ruler sign`);
    check(chart.analysis.chartRuler.house === rulerPlanet.house, `${cd.label}: chart ruler house`);
    check(chart.analysis.chartRuler.longitude === rulerPlanet.longitude, `${cd.label}: chart ruler longitude`);
    check(chart.analysis.chartRuler.isRetrograde === rulerPlanet.isRetrograde, `${cd.label}: chart ruler retrograde`);
    check(chart.analysis.chartRuler.dignity === rulerPlanet.dignity, `${cd.label}: chart ruler dignity`);
  }

  // House rulers: each house cusp sign → ruler
  check(chart.analysis.houseRulers.length === 12, `${cd.label}: 12 house rulers`);
  for (const hr of chart.analysis.houseRulers) {
    const expectedRuler = SIGN_RULERS_REF[hr.cuspSign];
    check(hr.rulingPlanet === expectedRuler,
      `${cd.label}: house ${hr.house} ruler ${hr.rulingPlanet} vs ${expectedRuler}`);

    // Cusp sign should match the house cusp
    const cusp = chart.houses.cusps.find(c => c.house === hr.house);
    check(hr.cuspSign === cusp.sign,
      `${cd.label}: house ${hr.house} cuspSign ${hr.cuspSign} vs ${cusp.sign}`);

    // Ruler planet data
    const rPlanet = chart.planets.find(p => p.name === expectedRuler);
    if (rPlanet) {
      check(hr.rulerSign === rPlanet.sign, `${cd.label}: house ${hr.house} ruler sign`);
      check(hr.rulerHouse === rPlanet.house, `${cd.label}: house ${hr.house} ruler house`);
    }
  }
}

console.log(`  Section I: ${sectionStats['I'].checks} checks, ${sectionStats['I'].fails} failures`);

// ============================================================
// SECTION J: SOUTH NODE = TRUE NODE + 180°
// ============================================================

console.log('\n=== SECTION J: South Node = True Node + 180° ===');
setSection('J');

for (const cd of CHARTS) {
  const chart = calculateNatalChart(cd);
  const trueNode = chart.planets.find(p => p.name === 'True Node');
  const southNode = chart.planets.find(p => p.name === 'South Node');

  check(!!trueNode && !!southNode, `${cd.label}: both nodes exist`);
  if (trueNode && southNode) {
    const expectedSouthLon = roundTo((trueNode.longitude + 180) % 360, 6);
    check(approxEq(southNode.longitude, expectedSouthLon, 0.00001),
      `${cd.label}: South Node lon ${southNode.longitude} vs ${expectedSouthLon}`);

    // South Node latitude = -True Node latitude
    check(approxEq(southNode.latitude, roundTo(-trueNode.latitude, 6), 0.00001),
      `${cd.label}: South Node lat ${southNode.latitude} vs ${roundTo(-trueNode.latitude, 6)}`);

    // South Node speed = True Node speed
    check(southNode.speed === trueNode.speed,
      `${cd.label}: South Node speed ${southNode.speed} vs True Node ${trueNode.speed}`);

    // South Node dignity should be null
    check(southNode.dignity === null, `${cd.label}: South Node dignity is null`);
  }
}

console.log(`  Section J: ${sectionStats['J'].checks} checks, ${sectionStats['J'].fails} failures`);

// ============================================================
// SECTION K: SYNASTRY (5 PAIRS)
// ============================================================

console.log('\n=== SECTION K: Synastry ===');
setSection('K');

const SYNASTRY_PAIRS = [
  [CHARTS[0], CHARTS[1]],   // Istanbul × Ankara
  [CHARTS[5], CHARTS[10]],  // London × New York
  [CHARTS[15], CHARTS[16]], // Tokyo × Mumbai
  [CHARTS[3], CHARTS[19]],  // Mersin × Istanbul 2020
  [CHARTS[11], CHARTS[14]], // LA × Buenos Aires
];

for (const [p1Data, p2Data] of SYNASTRY_PAIRS) {
  const syn = calculateSynastry(p1Data, p2Data);
  const label = `${p1Data.label} × ${p2Data.label}`;

  // 1. Both natal charts should be valid
  check(syn.person1.planets.length === 14, `${label}: person1 has 14 planets`);
  check(syn.person2.planets.length === 14, `${label}: person2 has 14 planets`);
  check(syn.person1.houses.cusps.length === 12, `${label}: person1 has 12 cusps`);
  check(syn.person2.houses.cusps.length === 12, `${label}: person2 has 12 cusps`);

  // 2. Cross-aspects: verify geometry
  for (const ca of syn.synastry.crossAspects) {
    const b1 = syn.person1.planets.find(p => p.name === ca.planet1) ||
      (ca.planet1 === 'Ascendant' ? { longitude: syn.person1.houses.ascendant.longitude } : null) ||
      (ca.planet1 === 'Midheaven' ? { longitude: syn.person1.houses.midheaven.longitude } : null);
    const b2 = syn.person2.planets.find(p => p.name === ca.planet2) ||
      (ca.planet2 === 'Ascendant' ? { longitude: syn.person2.houses.ascendant.longitude } : null) ||
      (ca.planet2 === 'Midheaven' ? { longitude: syn.person2.houses.midheaven.longitude } : null);

    if (b1 && b2) {
      let diff = Math.abs(b1.longitude - b2.longitude);
      if (diff > 180) diff = 360 - diff;
      check(approxEq(ca.actualAngle, roundTo(diff, 2), 0.015),
        `${label}: cross-aspect ${ca.planet1}-${ca.planet2} actualAngle`);
    }
  }

  // 3. House overlay: verify person1 planets in person2 houses
  const cusps2 = [0, ...syn.person2.houses.cusps.map(h => h.cusp)];
  for (const overlay of syn.synastry.houseOverlay.person1InPerson2Houses) {
    const planet = syn.person1.planets.find(p => p.name === overlay.planet);
    if (planet) {
      const expectedHouse = findPlanetInHouse(planet.longitude, cusps2);
      check(overlay.house === expectedHouse,
        `${label}: ${overlay.planet} in person2 house ${overlay.house} vs ${expectedHouse}`);
    }
  }

  // 4. House overlay: person2 in person1 houses
  const cusps1 = [0, ...syn.person1.houses.cusps.map(h => h.cusp)];
  for (const overlay of syn.synastry.houseOverlay.person2InPerson1Houses) {
    const planet = syn.person2.planets.find(p => p.name === overlay.planet);
    if (planet) {
      const expectedHouse = findPlanetInHouse(planet.longitude, cusps1);
      check(overlay.house === expectedHouse,
        `${label}: ${overlay.planet} in person1 house ${overlay.house} vs ${expectedHouse}`);
    }
  }

  // 5. Composite: verify midpoints
  for (const cp of syn.composite.planets) {
    const p1 = syn.person1.planets.find(p => p.name === cp.name);
    const p2 = syn.person2.planets.find(p => p.name === cp.name);
    if (p1 && p2) {
      const expectedMid = midpoint(p1.longitude, p2.longitude);
      check(approxEq(cp.longitude, roundTo(expectedMid, 6), 0.00001),
        `${label}: composite ${cp.name} midpoint ${cp.longitude} vs ${roundTo(expectedMid, 6)}`);
    }
  }

  // 6. Composite ASC midpoint
  const expectedCompAsc = midpoint(syn.person1.houses.ascendant.longitude, syn.person2.houses.ascendant.longitude);
  check(approxEq(syn.composite.houses.ascendant.longitude, roundTo(expectedCompAsc, 6), 0.00001),
    `${label}: composite ASC midpoint`);

  // 7. Composite MC midpoint
  const expectedCompMc = midpoint(syn.person1.houses.midheaven.longitude, syn.person2.houses.midheaven.longitude);
  check(approxEq(syn.composite.houses.midheaven.longitude, roundTo(expectedCompMc, 6), 0.00001),
    `${label}: composite MC midpoint`);

  // 8. Composite house cusps midpoints
  for (let i = 0; i < 12; i++) {
    const c1 = syn.person1.houses.cusps[i].cusp;
    const c2 = syn.person2.houses.cusps[i].cusp;
    const expectedCusp = midpoint(c1, c2);
    check(approxEq(syn.composite.houses.cusps[i].cusp, roundTo(expectedCusp, 6), 0.00001),
      `${label}: composite cusp ${i + 1} midpoint`);
  }

  // 9. Composite aspects sorted by orb
  for (let i = 1; i < syn.composite.aspects.length; i++) {
    check(syn.composite.aspects[i].orb >= syn.composite.aspects[i-1].orb - 0.001,
      `${label}: composite aspects sorted`);
  }
}

console.log(`  Section K: ${sectionStats['K'].checks} checks, ${sectionStats['K'].fails} failures`);

// ============================================================
// SECTION L: TRANSIT ORB SCALING & STRENGTH
// ============================================================

console.log('\n=== SECTION L: Transit Orb Scaling & Strength ===');
setSection('L');

const TRANSIT_CHARTS = [CHARTS[0], CHARTS[10], CHARTS[19]]; // Istanbul, NY, Istanbul 2020

for (const cd of TRANSIT_CHARTS) {
  const transitResult = calculateTransits(cd, { days: 7, startDate: '2025-06-01' });

  // 1. Response shape
  check(transitResult.success === true, `${cd.label}: transit success`);
  check(typeof transitResult.moonPhase === 'string', `${cd.label}: transit moonPhase is string`);
  check(Array.isArray(transitResult.allTransits), `${cd.label}: allTransits is array`);
  check(Array.isArray(transitResult.allEvents), `${cd.label}: allEvents is array`);
  check(Array.isArray(transitResult.retrogrades), `${cd.label}: retrogrades is array`);
  check(transitResult.meta.transitOrbScale === 0.5, `${cd.label}: transitOrbScale is 0.5`);

  // 2. Verify orb scaling and strength for all events
  for (const ev of transitResult.allEvents) {
    // Orb should not exceed maxOrb
    check(ev.orb <= ev.maxOrb + 0.01,
      `${cd.label}: event ${ev.transitPlanet}-${ev.natalPlanet} orb ${ev.orb} <= maxOrb ${ev.maxOrb}`);

    // Strength should be 0-100
    check(ev.strength >= 0 && ev.strength <= 100,
      `${cd.label}: event strength in range`);

    // Verify maxOrb calculation: base × 0.5 × modifiers
    const aspectDef = ASPECTS.find(a => a.name === ev.type);
    if (aspectDef) {
      let expectedMaxOrb = aspectDef.orb * 0.5;
      const luminaries = ['Sun', 'Moon'];
      if (luminaries.includes(ev.transitPlanet) || luminaries.includes(ev.natalPlanet)) {
        expectedMaxOrb *= 1.25;
      }
      const angles = ['Ascendant', 'Midheaven'];
      if (angles.includes(ev.transitPlanet) || angles.includes(ev.natalPlanet)) {
        expectedMaxOrb *= 0.75;
      }
      check(approxEq(ev.maxOrb, roundTo(expectedMaxOrb, 2), 0.015),
        `${cd.label}: event ${ev.transitPlanet}-${ev.natalPlanet} maxOrb ${ev.maxOrb} vs ${roundTo(expectedMaxOrb, 2)}`);
    }

    // Verify timing fields exist
    check(typeof ev.startTime === 'string', `${cd.label}: event has startTime`);
    check(typeof ev.exactTime === 'string', `${cd.label}: event has exactTime`);
  }

  // 3. Lunar metrics
  check(typeof transitResult.lunar === 'object', `${cd.label}: lunar metrics exist`);
  check(typeof transitResult.lunar.moonSign === 'string', `${cd.label}: lunar moonSign`);
  check(typeof transitResult.lunar.moonPhase === 'string', `${cd.label}: lunar moonPhase`);
  check(transitResult.lunar.moonIllumination >= 0 && transitResult.lunar.moonIllumination <= 100,
    `${cd.label}: lunar illumination in range`);
  check(transitResult.lunar.moonDay >= 1 && transitResult.lunar.moonDay <= 30,
    `${cd.label}: lunar moonDay in range`);
}

console.log(`  Section L: ${sectionStats['L'].checks} checks, ${sectionStats['L'].fails} failures`);

// ============================================================
// SECTION M: LUNAR METRICS (12 DIVERSE DATES)
// ============================================================

console.log('\n=== SECTION M: Lunar Metrics ===');
setSection('M');

const LUNAR_DATES = [
  { year: 2024, month: 1, day: 11 },  // New Moon
  { year: 2024, month: 1, day: 18 },  // First Quarter
  { year: 2024, month: 1, day: 25 },  // Full Moon
  { year: 2024, month: 2, day: 2 },   // Last Quarter
  { year: 2024, month: 3, day: 25 },  // Penumbral Lunar Eclipse
  { year: 2024, month: 4, day: 8 },   // Solar Eclipse
  { year: 2025, month: 6, day: 15 },  // Random date
  { year: 2025, month: 9, day: 21 },  // Equinox nearby
  { year: 2020, month: 4, day: 8 },   // Super Full Moon
  { year: 1999, month: 8, day: 11 },  // Solar Eclipse
  { year: 1990, month: 7, day: 15 },  // Random
  { year: 2000, month: 1, day: 1 },   // Y2K
];

for (const ld of LUNAR_DATES) {
  const jd = dateToJD(ld.year, ld.month, ld.day, 12);
  const lunar = calculateLunarMetrics(jd);

  // 1. Moon sign is valid
  check(SIGNS.includes(lunar.moonSign), `${ld.year}-${ld.month}-${ld.day}: valid moon sign ${lunar.moonSign}`);

  // 2. Moon phase is valid
  const validPhases = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
    'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'];
  check(validPhases.includes(lunar.moonPhase), `${ld.year}-${ld.month}-${ld.day}: valid phase ${lunar.moonPhase}`);

  // 3. Illumination in range
  check(lunar.moonIllumination >= 0 && lunar.moonIllumination <= 100,
    `${ld.year}-${ld.month}-${ld.day}: illumination ${lunar.moonIllumination} in range`);

  // 4. Moon day in range
  check(lunar.moonDay >= 1 && lunar.moonDay <= 30,
    `${ld.year}-${ld.month}-${ld.day}: moonDay ${lunar.moonDay} in range`);

  // 5. Verify illumination formula independently
  const moonResult = swe.calc(jd, 1, calcFlags);
  const sunResult = swe.calc(jd, 0, calcFlags);
  let phaseAngle = moonResult.data[0] - sunResult.data[0];
  if (phaseAngle < 0) phaseAngle += 360;
  const expectedIllum = roundTo((1 - Math.cos(phaseAngle * Math.PI / 180)) / 2 * 100, 1);
  check(approxEq(lunar.moonIllumination, expectedIllum, 0.15),
    `${ld.year}-${ld.month}-${ld.day}: illumination ${lunar.moonIllumination} vs ${expectedIllum}`);

  // 6. Supermoon: only if perigee AND (Full or New Moon)
  if (lunar.isSuperMoon) {
    check(lunar.withinPerigee, `${ld.year}-${ld.month}-${ld.day}: supermoon requires perigee`);
    check(lunar.moonPhase === 'Full Moon' || lunar.moonPhase === 'New Moon',
      `${ld.year}-${ld.month}-${ld.day}: supermoon requires Full/New Moon`);
  }

  // 7. perigee and apogee are mutually exclusive
  check(!(lunar.withinPerigee && lunar.withinApogee),
    `${ld.year}-${ld.month}-${ld.day}: perigee and apogee mutually exclusive`);

  // 8. Moon age consistency: angle/360 * 29.53
  const expectedAge = roundTo(phaseAngle * 29.53 / 360, 1);
  check(approxEq(lunar.moonAgeInDays, expectedAge, 0.15),
    `${ld.year}-${ld.month}-${ld.day}: moonAge ${lunar.moonAgeInDays} vs ${expectedAge}`);
}

console.log(`  Section M: ${sectionStats['M'].checks} checks, ${sectionStats['M'].fails} failures`);

// ============================================================
// SECTION N: HOUSE SYSTEM VARIATION (5 charts × 8 systems)
// ============================================================

console.log('\n=== SECTION N: House System Variation ===');
setSection('N');

const HOUSE_SYSTEM_CHARTS = [CHARTS[0], CHARTS[5], CHARTS[10], CHARTS[15], CHARTS[18]];
const HOUSE_SYS_CODES = Object.keys(HOUSE_SYSTEMS);

for (const cd of HOUSE_SYSTEM_CHARTS) {
  for (const sys of HOUSE_SYS_CODES) {
    // Skip Placidus/Koch at very high latitudes — they may be unreliable
    if (['P', 'K'].includes(sys) && Math.abs(cd.latitude) > 66) continue;

    const chart = calculateNatalChart({ ...cd, houseSystem: sys });

    // 1. House system metadata
    check(chart.houses.system === sys, `${cd.label} [${sys}]: system code`);
    check(chart.houses.systemName === HOUSE_SYSTEMS[sys].name, `${cd.label} [${sys}]: system name`);

    // 2. 12 cusps
    check(chart.houses.cusps.length === 12, `${cd.label} [${sys}]: 12 cusps`);

    // 3. Cusps in 0-360 range
    for (const cusp of chart.houses.cusps) {
      check(cusp.cusp >= 0 && cusp.cusp < 360, `${cd.label} [${sys}]: cusp ${cusp.house} in range`);
    }

    // 4. ASC = cusp 1 (only for quadrant systems, not Whole Sign)
    // In Whole Sign, cusp 1 is 0° of ASC's sign, not ASC itself
    if (sys !== 'W') {
      check(approxEq(chart.houses.ascendant.longitude, chart.houses.cusps[0].cusp, 0.00001),
        `${cd.label} [${sys}]: ASC = cusp 1`);
    }

    // 5. MC = cusp 10 (only for quadrant systems, not Whole Sign or Equal)
    // In Equal, cusps are 30° from ASC; MC is computed independently
    // In Whole Sign, MC is also independent of cusp 10
    if (!['W', 'E'].includes(sys)) {
      check(approxEq(chart.houses.midheaven.longitude, chart.houses.cusps[9].cusp, 0.00001),
        `${cd.label} [${sys}]: MC = cusp 10`);
    }

    // 6. Planet positions should be the same regardless of house system
    // (only house assignments change)
    const defaultChart = calculateNatalChart({ ...cd, houseSystem: 'P' });
    for (const planet of chart.planets) {
      const defaultPlanet = defaultChart.planets.find(p => p.name === planet.name);
      if (defaultPlanet) {
        check(approxEq(planet.longitude, defaultPlanet.longitude, 0.00001),
          `${cd.label} [${sys}]: ${planet.name} longitude same as Placidus`);
      }
    }

    // 7. Whole Sign: each cusp should be at 0° of its sign
    if (sys === 'W') {
      for (const cusp of chart.houses.cusps) {
        const posInSign = cusp.cusp % 30;
        check(approxEq(posInSign, 0, 0.01),
          `${cd.label} [W]: cusp ${cusp.house} at 0° of sign (${roundTo(posInSign, 2)})`);
      }
    }

    // 8. Equal: each cusp should be 30° apart
    if (sys === 'E') {
      for (let i = 1; i < 12; i++) {
        let diff = chart.houses.cusps[i].cusp - chart.houses.cusps[i-1].cusp;
        if (diff < 0) diff += 360;
        check(approxEq(diff, 30, 0.01),
          `${cd.label} [E]: cusp ${i+1} - cusp ${i} = ${roundTo(diff, 2)}° (expected 30)`);
      }
    }

    // 9. Every planet has a valid house (1-12)
    for (const planet of chart.planets) {
      check(planet.house >= 1 && planet.house <= 12,
        `${cd.label} [${sys}]: ${planet.name} house ${planet.house} in range`);
    }

    // 10. Planet house assignment matches findPlanetInHouse
    const cusps = [0, ...chart.houses.cusps.map(h => h.cusp)];
    for (const planet of chart.planets) {
      const expectedHouse = findPlanetInHouse(planet.longitude, cusps);
      check(planet.house === expectedHouse,
        `${cd.label} [${sys}]: ${planet.name} house ${planet.house} vs findPlanetInHouse ${expectedHouse}`);
    }
  }
}

console.log(`  Section N: ${sectionStats['N'].checks} checks, ${sectionStats['N'].fails} failures`);

// ============================================================
// SECTION O: EDGE CASES
// ============================================================

console.log('\n=== SECTION O: Edge Cases ===');
setSection('O');

// 1. longitudeToSign boundary tests
const BOUNDARY_TESTS = [
  { lon: 0, sign: 'Aries', degree: 0 },
  // 29.999999° → DMS rounding: 29°59'59.9964" → rounds second to 60 → carry-over to Taurus 0°
  { lon: 29.999999, sign: 'Taurus', degree: 0 },
  { lon: 30, sign: 'Taurus', degree: 0 },
  { lon: 359.999, sign: 'Pisces', degree: 29 },
  { lon: 0.0001, sign: 'Aries', degree: 0 },
  { lon: 89.999, sign: 'Gemini', degree: 29 },
  { lon: 90, sign: 'Cancer', degree: 0 },
  { lon: 179.999, sign: 'Virgo', degree: 29 },
  { lon: 180, sign: 'Libra', degree: 0 },
  { lon: 269.999, sign: 'Sagittarius', degree: 29 },
  { lon: 270, sign: 'Capricorn', degree: 0 },
];

for (const bt of BOUNDARY_TESTS) {
  const result = longitudeToSign(bt.lon);
  check(result.sign === bt.sign, `longitudeToSign(${bt.lon}): sign ${result.sign} vs ${bt.sign}`);
  check(result.degree === bt.degree, `longitudeToSign(${bt.lon}): degree ${result.degree} vs ${bt.degree}`);
  // DMS values should be in valid range
  check(result.degree >= 0 && result.degree < 30, `longitudeToSign(${bt.lon}): degree in range`);
  check(result.minute >= 0 && result.minute < 60, `longitudeToSign(${bt.lon}): minute in range`);
  check(result.second >= 0 && result.second < 60, `longitudeToSign(${bt.lon}): second in range`);
}

// 2. Negative longitude normalization
const negResult = longitudeToSign(-10);
check(negResult.sign === 'Pisces', `longitudeToSign(-10): sign Pisces`);

// 3. >360 longitude normalization
const overResult = longitudeToSign(370);
check(overResult.sign === 'Aries', `longitudeToSign(370): sign Aries`);
check(overResult.degree === 10, `longitudeToSign(370): degree 10`);

// 4. Midpoint wrap-around tests
check(approxEq(midpoint(350, 10), 0, 0.001), `midpoint(350, 10) = ${midpoint(350, 10)}, expected ~0`);
check(approxEq(midpoint(10, 350), 0, 0.001), `midpoint(10, 350) = ${midpoint(10, 350)}, expected ~0`);
check(approxEq(midpoint(0, 180), 90, 0.001), `midpoint(0, 180) = ${midpoint(0, 180)}, expected 90`);
check(approxEq(midpoint(180, 0), 90, 0.001), `midpoint(180, 0) = ${midpoint(180, 0)}, expected 90`);
check(approxEq(midpoint(100, 100), 100, 0.001), `midpoint(100, 100) = ${midpoint(100, 100)}, expected 100`);
check(approxEq(midpoint(1, 359), 0, 0.001), `midpoint(1, 359) = ${midpoint(1, 359)}, expected ~0`);

// 5. findPlanetInHouse boundary crossing (0°/360°)
const cuspsWrap = [0, 350, 20, 50, 80, 110, 140, 170, 200, 230, 260, 290, 320];
check(findPlanetInHouse(355, cuspsWrap) === 1, `findPlanetInHouse(355, wrap) = house 1`);
check(findPlanetInHouse(5, cuspsWrap) === 1, `findPlanetInHouse(5, wrap) = house 1`);
check(findPlanetInHouse(25, cuspsWrap) === 2, `findPlanetInHouse(25, wrap) = house 2`);

// 6. High latitude chart: Whole Sign should work perfectly
const highLatChart = calculateNatalChart({
  year: 2003, month: 6, day: 21, hour: 12, minute: 0,
  latitude: 64.1466, longitude: -21.9426, timezone: 'Atlantic/Reykjavik', houseSystem: 'W'
});
check(highLatChart.planets.length === 14, 'High latitude Whole Sign: 14 planets');
check(highLatChart.houses.cusps.length === 12, 'High latitude Whole Sign: 12 cusps');

// 7. Midnight birth: hour=0, minute=0
const midnightChart = calculateNatalChart({
  year: 2001, month: 6, day: 21, hour: 0, minute: 1,
  latitude: 36.8, longitude: 34.63, timezone: 'Europe/Istanbul'
});
check(midnightChart.planets.length === 14, 'Midnight chart: 14 planets');

// 8. Part of Fortune formula: verify day vs night gives different results
const dayNightAsc = 100;
const dayNightSun = 50;
const dayNightMoon = 200;
const pofDay = calculatePartOfFortune(dayNightAsc, dayNightSun, dayNightMoon, true);
const pofNight = calculatePartOfFortune(dayNightAsc, dayNightSun, dayNightMoon, false);
check(pofDay !== pofNight, `PoF day ${pofDay} !== night ${pofNight}`);
// Day: ASC + Moon - Sun = 100 + 200 - 50 = 250
check(approxEq(pofDay, 250, 0.001), `PoF day formula: ${pofDay} vs 250`);
// Night: ASC + Sun - Moon = 100 + 50 - 200 = -50 → 310
check(approxEq(pofNight, 310, 0.001), `PoF night formula: ${pofNight} vs 310`);

console.log(`  Section O: ${sectionStats['O'].checks} checks, ${sectionStats['O'].fails} failures`);

// ============================================================
// SECTION P: SPEED & RETROGRADE CONSISTENCY
// ============================================================

console.log('\n=== SECTION P: Speed & Retrograde ===');
setSection('P');

for (const cd of CHARTS) {
  const chart = calculateNatalChart(cd);

  for (const planet of chart.planets) {
    if (planet.name === 'South Node') {
      // South Node inherits True Node's retrograde status
      const trueNode = chart.planets.find(p => p.name === 'True Node');
      check(planet.isRetrograde === trueNode.isRetrograde,
        `${cd.label}: South Node retrograde matches True Node`);
      continue;
    }

    // isRetrograde should match speed < 0
    check(planet.isRetrograde === (planet.speed < 0),
      `${cd.label}: ${planet.name} isRetrograde=${planet.isRetrograde} vs speed=${planet.speed}`);

    // Sun and Moon should never be retrograde
    if (planet.name === 'Sun' || planet.name === 'Moon') {
      check(!planet.isRetrograde, `${cd.label}: ${planet.name} should not be retrograde`);
    }
  }
}

console.log(`  Section P: ${sectionStats['P'].checks} checks, ${sectionStats['P'].fails} failures`);

// ============================================================
// SECTION Q: META FIELDS
// ============================================================

console.log('\n=== SECTION Q: Meta Fields ===');
setSection('Q');

for (const cd of CHARTS) {
  const chart = calculateNatalChart(cd);

  // 1. Julian Day ET > UT (ET is always ahead by deltaT)
  check(chart.meta.julianDayET > chart.meta.julianDayUT,
    `${cd.label}: JD_ET ${chart.meta.julianDayET} > JD_UT ${chart.meta.julianDayUT}`);

  // 2. DeltaT = (JD_ET - JD_UT) * 86400
  const expectedDeltaT = roundTo((chart.meta.julianDayET - chart.meta.julianDayUT) * 86400, 2);
  check(approxEq(chart.meta.deltaT, expectedDeltaT, 0.02),
    `${cd.label}: deltaT ${chart.meta.deltaT} vs ${expectedDeltaT}`);

  // 3. DeltaT should be in reasonable range (30-75 seconds for 1960-2025)
  check(chart.meta.deltaT > 30 && chart.meta.deltaT < 75,
    `${cd.label}: deltaT ${chart.meta.deltaT} in range 30-75s`);

  // 4. Sidereal time should be 0-360
  check(chart.meta.siderealTime >= 0 && chart.meta.siderealTime < 360,
    `${cd.label}: sidereal time ${chart.meta.siderealTime} in range`);

  // 5. Ephemeris mode should be Swiss Ephemeris (not Moshier fallback)
  check(chart.meta.ephemerisMode === 'Swiss Ephemeris',
    `${cd.label}: ephemeris mode = ${chart.meta.ephemerisMode}`);

  // 6. Input fields
  check(chart.input.timezone === cd.timezone, `${cd.label}: input timezone`);
  check(chart.input.coordinates.latitude === cd.latitude, `${cd.label}: input latitude`);
  check(chart.input.coordinates.longitude === cd.longitude, `${cd.label}: input longitude`);

  // 7. Analysis: sunSign, moonSign, risingSign should be valid signs
  check(SIGNS.includes(chart.analysis.sunSign), `${cd.label}: sunSign valid`);
  check(SIGNS.includes(chart.analysis.moonSign), `${cd.label}: moonSign valid`);
  check(SIGNS.includes(chart.analysis.risingSign), `${cd.label}: risingSign valid`);

  // 8. risingSign = ASC sign
  check(chart.analysis.risingSign === chart.houses.ascendant.sign,
    `${cd.label}: risingSign = ASC sign`);

  // 9. sunSign = Sun's sign
  const sun = chart.planets.find(p => p.name === 'Sun');
  check(chart.analysis.sunSign === sun.sign, `${cd.label}: sunSign = Sun's sign`);

  // 10. moonSign = Moon's sign
  const moon = chart.planets.find(p => p.name === 'Moon');
  check(chart.analysis.moonSign === moon.sign, `${cd.label}: moonSign = Moon's sign`);
}

console.log(`  Section Q: ${sectionStats['Q'].checks} checks, ${sectionStats['Q'].fails} failures`);

// ============================================================
// SECTION R: FORMATTED POSITION CONSISTENCY
// ============================================================

console.log('\n=== SECTION R: Formatted Position Consistency ===');
setSection('R');

for (const cd of CHARTS) {
  const chart = calculateNatalChart(cd);

  for (const planet of chart.planets) {
    // formattedPosition should match degree°minute'second" sign
    const expected = `${planet.degree}°${String(planet.minute).padStart(2, '0')}'${String(planet.second).padStart(2, '0')}" ${planet.sign}`;
    check(planet.formattedPosition === expected,
      `${cd.label}: ${planet.name} formattedPosition "${planet.formattedPosition}" vs "${expected}"`);
  }

  // ASC formatted
  const asc = chart.houses.ascendant;
  const ascExpected = `${asc.degree}°${String(asc.minute).padStart(2, '0')}' ${asc.sign}`;
  check(asc.formatted === ascExpected, `${cd.label}: ASC formatted`);

  // MC formatted
  const mc = chart.houses.midheaven;
  const mcExpected = `${mc.degree}°${String(mc.minute).padStart(2, '0')}' ${mc.sign}`;
  check(mc.formatted === mcExpected, `${cd.label}: MC formatted`);

  // House cusp formatted
  for (const cusp of chart.houses.cusps) {
    const cuspExpected = `${cusp.degree}°${String(cusp.minute).padStart(2, '0')}' ${cusp.sign}`;
    check(cusp.formattedCusp === cuspExpected, `${cd.label}: cusp ${cusp.house} formatted`);
  }

  // PoF formatted
  const pof = chart.analysis.partOfFortune;
  const pofExpected = `${pof.degree}°${String(pof.minute).padStart(2, '0')}' ${pof.sign}`;
  check(pof.formatted === pofExpected, `${cd.label}: PoF formatted`);
}

console.log(`  Section R: ${sectionStats['R'].checks} checks, ${sectionStats['R'].fails} failures`);

// ============================================================
// SECTION S: ASPECT COMPLETENESS — NO MISSING ASPECTS
// ============================================================

console.log('\n=== SECTION S: Aspect Completeness ===');
setSection('S');

// For 5 selected charts, independently compute all aspects and verify none are missing
const COMPLETENESS_CHARTS = [CHARTS[0], CHARTS[5], CHARTS[10], CHARTS[15], CHARTS[19]];

for (const cd of COMPLETENESS_CHARTS) {
  const chart = calculateNatalChart(cd);

  // Build the same body list that calculator.js uses
  const bodies = [
    ...chart.planets,
    { name: 'Ascendant', longitude: chart.houses.ascendant.longitude, speed: 0 },
    { name: 'Midheaven', longitude: chart.houses.midheaven.longitude, speed: 0 },
  ];

  // Independent aspect computation
  const expectedAspects = [];
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const b1 = bodies[i];
      const b2 = bodies[j];

      // Skip True Node ↔ South Node
      if ((b1.name === 'True Node' && b2.name === 'South Node') ||
          (b1.name === 'South Node' && b2.name === 'True Node')) continue;

      let diff = Math.abs(b1.longitude - b2.longitude);
      if (diff > 180) diff = 360 - diff;

      for (const aspect of ASPECTS) {
        let effectiveOrb = aspect.orb;
        if (['Sun', 'Moon'].includes(b1.name) || ['Sun', 'Moon'].includes(b2.name)) {
          effectiveOrb *= 1.25;
        }
        if (['Ascendant', 'Midheaven'].includes(b1.name) || ['Ascendant', 'Midheaven'].includes(b2.name)) {
          effectiveOrb *= 0.75;
        }

        const deviation = Math.abs(diff - aspect.angle);
        if (deviation <= effectiveOrb) {
          expectedAspects.push(`${b1.name}|${b2.name}|${aspect.name}`);
          break;
        }
      }
    }
  }

  // Verify counts match
  check(chart.aspects.length === expectedAspects.length,
    `${cd.label}: aspect count ${chart.aspects.length} vs expected ${expectedAspects.length}`);

  // Verify each expected aspect exists
  for (const key of expectedAspects) {
    const [p1, p2, type] = key.split('|');
    const found = chart.aspects.find(a =>
      ((a.planet1 === p1 && a.planet2 === p2) || (a.planet1 === p2 && a.planet2 === p1)) &&
      a.type === type
    );
    check(!!found, `${cd.label}: expected aspect ${key} found`);
  }
}

console.log(`  Section S: ${sectionStats['S'].checks} checks, ${sectionStats['S'].fails} failures`);

// ============================================================
// SECTION T: HOUSE ASSIGNMENT CORRECTNESS
// ============================================================

console.log('\n=== SECTION T: House Assignment ===');
setSection('T');

for (const cd of CHARTS) {
  const chart = calculateNatalChart(cd);
  const cusps = [0, ...chart.houses.cusps.map(h => h.cusp)];

  for (const planet of chart.planets) {
    // Independent house lookup
    const expectedHouse = findPlanetInHouse(planet.longitude, cusps);
    check(planet.house === expectedHouse,
      `${cd.label}: ${planet.name} house ${planet.house} vs findPlanetInHouse ${expectedHouse}`);

    // House should be 1-12
    check(planet.house >= 1 && planet.house <= 12,
      `${cd.label}: ${planet.name} house ${planet.house} in range`);
  }
}

console.log(`  Section T: ${sectionStats['T'].checks} checks, ${sectionStats['T'].fails} failures`);

// ============================================================
// SECTION U: PLANET COUNT & BODY COMPLETENESS
// ============================================================

console.log('\n=== SECTION U: Planet Count & Body Completeness ===');
setSection('U');

const EXPECTED_BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn',
  'Uranus', 'Neptune', 'Pluto', 'Chiron', 'True Node', 'Lilith', 'South Node'];

for (const cd of CHARTS) {
  const chart = calculateNatalChart(cd);

  // 14 bodies total
  check(chart.planets.length === 14, `${cd.label}: 14 planets`);

  // Each expected body exists
  for (const bodyName of EXPECTED_BODIES) {
    const found = chart.planets.find(p => p.name === bodyName);
    check(!!found, `${cd.label}: ${bodyName} exists`);
    if (found) {
      // Longitude in 0-360
      check(found.longitude >= 0 && found.longitude < 360,
        `${cd.label}: ${bodyName} longitude ${found.longitude} in range`);
      // Sign is valid
      check(SIGNS.includes(found.sign), `${cd.label}: ${bodyName} sign ${found.sign} valid`);
      // Degree 0-29
      check(found.degree >= 0 && found.degree <= 29,
        `${cd.label}: ${bodyName} degree ${found.degree} in range`);
      // Minute 0-59
      check(found.minute >= 0 && found.minute < 60,
        `${cd.label}: ${bodyName} minute ${found.minute} in range`);
      // Second 0-59
      check(found.second >= 0 && found.second < 60,
        `${cd.label}: ${bodyName} second ${found.second} in range`);
    }
  }
}

console.log(`  Section U: ${sectionStats['U'].checks} checks, ${sectionStats['U'].fails} failures`);

// ============================================================
// SECTION V: isDayChart CONSISTENCY
// ============================================================

console.log('\n=== SECTION V: isDayChart Consistency ===');
setSection('V');

for (const cd of CHARTS) {
  const chart = calculateNatalChart(cd);
  const sun = chart.planets.find(p => p.name === 'Sun');
  const asc = chart.houses.ascendant.longitude;

  // Independent isAboveHorizon check
  // Above horizon = between DESC and ASC (going counterclockwise through the southern houses)
  const desc = (asc + 180) % 360;
  let sunAbove;
  if (asc < desc) {
    // Normal: ASC < DESC
    // Below horizon: between ASC and DESC
    // Above horizon: NOT between ASC and DESC
    sunAbove = !(sun.longitude >= asc && sun.longitude < desc);
  } else {
    // Wrap-around: ASC > DESC
    // Below horizon: >= ASC OR < DESC
    sunAbove = !(sun.longitude >= asc || sun.longitude < desc);
  }

  check(chart.analysis.isDayChart === sunAbove,
    `${cd.label}: isDayChart ${chart.analysis.isDayChart} vs sunAbove ${sunAbove} (Sun=${roundTo(sun.longitude, 2)}°, ASC=${roundTo(asc, 2)}°, DESC=${roundTo(desc, 2)}°)`);

  // For afternoon births (roughly 10am-6pm local), isDayChart should typically be true
  // This is a heuristic sanity check, not absolute
  if (cd.hour >= 11 && cd.hour <= 16 && Math.abs(cd.latitude) < 55) {
    check(chart.analysis.isDayChart === true,
      `${cd.label}: midday birth (hour=${cd.hour}) should likely be day chart`);
  }
}

console.log(`  Section V: ${sectionStats['V'].checks} checks, ${sectionStats['V'].fails} failures`);

// ============================================================
// SECTION W: VERTEX & ADDITIONAL POINTS
// ============================================================

console.log('\n=== SECTION W: Vertex & Additional Points ===');
setSection('W');

for (const cd of CHARTS) {
  const chart = calculateNatalChart(cd);

  // Vertex should exist and be in valid range
  check(chart.houses.vertex.longitude >= 0 && chart.houses.vertex.longitude < 360,
    `${cd.label}: vertex longitude in range`);
  check(SIGNS.includes(chart.houses.vertex.sign), `${cd.label}: vertex sign valid`);

  // Vertex sign should match longitude
  const vtxSign = longitudeToSign(chart.houses.vertex.longitude);
  check(chart.houses.vertex.sign === vtxSign.sign, `${cd.label}: vertex sign matches longitude`);
}

console.log(`  Section W: ${sectionStats['W'].checks} checks, ${sectionStats['W'].fails} failures`);

// ============================================================
// SECTION X: CROSS-REPO PLANET PRECISION — DIRECT SWEPH COMPARISON
// ============================================================

console.log('\n=== SECTION X: Direct Swiss Ephemeris Comparison ===');
setSection('X');

import { birthTimeToUTC } from './src/timezone.js';

for (const cd of CHARTS) {
  const chart = calculateNatalChart(cd);

  // Compute JD independently
  const utcData = birthTimeToUTC(cd.year, cd.month, cd.day, cd.hour, cd.minute, cd.timezone);
  const jdResult = swe.utc_to_jd(
    utcData.utcYear, utcData.utcMonth, utcData.utcDay,
    utcData.utcHour, utcData.utcMinute, utcData.utcSecond,
    swe.constants.SE_GREG_CAL
  );
  const jd_et = jdResult.data[0];
  const jd_ut = jdResult.data[1];

  // Verify each planet against direct swe.calc
  for (const body of CELESTIAL_BODIES) {
    const result = swe.calc(jd_et, body.id, calcFlags);
    const expectedLon = roundTo(result.data[0], 6);
    const planet = chart.planets.find(p => p.name === body.name);

    check(planet.longitude === expectedLon,
      `${cd.label}: ${body.name} lon ${planet.longitude} vs swe.calc ${expectedLon}`);
  }

  // Verify house cusps against direct swe.houses
  const housesResult = swe.houses(jd_ut, cd.latitude, cd.longitude, cd.houseSystem || 'P');
  for (let i = 0; i < 12; i++) {
    const expectedCusp = roundTo(housesResult.data.houses[i], 6);
    check(chart.houses.cusps[i].cusp === expectedCusp,
      `${cd.label}: cusp ${i + 1} ${chart.houses.cusps[i].cusp} vs swe.houses ${expectedCusp}`);
  }

  // Verify ASC and MC
  check(approxEq(chart.houses.ascendant.longitude, roundTo(housesResult.data.points[0], 6), 0.00001),
    `${cd.label}: ASC vs swe.houses`);
  check(approxEq(chart.houses.midheaven.longitude, roundTo(housesResult.data.points[1], 6), 0.00001),
    `${cd.label}: MC vs swe.houses`);
}

console.log(`  Section X: ${sectionStats['X'].checks} checks, ${sectionStats['X'].fails} failures`);

// ============================================================
// FINAL SUMMARY
// ============================================================

console.log('\n' + '='.repeat(60));
console.log('EXHAUSTIVE VERIFICATION SUMMARY');
console.log('='.repeat(60));

for (const [section, stats] of Object.entries(sectionStats)) {
  const status = stats.fails === 0 ? 'PASS' : 'FAIL';
  console.log(`  Section ${section}: ${stats.checks} checks, ${stats.fails} failures — ${status}`);
}

console.log('-'.repeat(60));
console.log(`  TOTAL: ${totalChecks} checks, ${totalFails} failures`);
console.log(`  RESULT: ${totalFails === 0 ? 'ALL PASSED' : `${totalFails} FAILURES`}`);
console.log('='.repeat(60));

if (totalFails > 0) process.exit(1);
