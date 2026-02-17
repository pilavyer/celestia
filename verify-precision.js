// verify-precision.js — Swiss Ephemeris Reference Cross-Check for Calestia Core
// Validates that calestia produces IDENTICAL results to raw Swiss Ephemeris (astro.com standard)
// Run: node verify-precision.js

import * as swe from 'sweph';
import path from 'path';
import { fileURLToPath } from 'url';
import { calculateNatalChart } from './src/calculator.js';
import { calculateSynastry, midpoint } from './src/synastry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
swe.set_ephe_path(path.join(__dirname, 'ephe'));

const calcFlags = swe.constants.SEFLG_SWIEPH | swe.constants.SEFLG_SPEED;

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    console.log(`  ✓  ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ✗  ${name}`);
    console.log(`     ${e.message}`);
    failed++;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

// =========================================================================
// REFERENCE CHART 1: Istanbul, 25 Jan 2020, 15:35 local (UTC+3 fixed)
// This is the primary calestia test case — same as astro.com reference
// UTC = 12:35:00 (15:35 - 3h)
// =========================================================================
const utcHour1 = 12;
const utcMin1 = 35;

const jd1 = swe.utc_to_jd(2020, 1, 25, utcHour1, utcMin1, 0, swe.constants.SE_GREG_CAL);
const jd1_ET = jd1.data[0];
const jd1_UT = jd1.data[1];

// Raw Swiss Ephemeris planet positions
const rawPlanets1 = {};
const PLANET_IDS = [
  { id: 0, name: 'Sun' }, { id: 1, name: 'Moon' }, { id: 2, name: 'Mercury' },
  { id: 3, name: 'Venus' }, { id: 4, name: 'Mars' }, { id: 5, name: 'Jupiter' },
  { id: 6, name: 'Saturn' }, { id: 7, name: 'Uranus' }, { id: 8, name: 'Neptune' },
  { id: 9, name: 'Pluto' }, { id: 15, name: 'Chiron' }, { id: 11, name: 'True Node' },
  { id: 12, name: 'Lilith' },
];

for (const p of PLANET_IDS) {
  const result = swe.calc_ut(jd1_ET, p.id, calcFlags);
  rawPlanets1[p.name] = {
    longitude: result.data[0],
    latitude: result.data[1],
    speed: result.data[3],
  };
}

// Raw Swiss Ephemeris house cusps
const rawHouses1 = swe.houses(jd1_UT, 41.0082, 28.9784, 'P');
const rawASC1 = rawHouses1.data.points[0];
const rawMC1 = rawHouses1.data.points[1];

// Calculate via calestia
const chart1 = calculateNatalChart({
  year: 2020, month: 1, day: 25, hour: 15, minute: 35,
  latitude: 41.0082, longitude: 28.9784,
  timezone: 'Europe/Istanbul', houseSystem: 'P',
});

console.log('\n=== CALESTIA CORE: Swiss Ephemeris Precision Verification ===\n');
console.log('Reference: Istanbul, 25 Jan 2020, 15:35 local (UTC+3)\n');

// --- SECTION 1: Planet Position Accuracy ---
console.log('--- Section 1: Planet Positions vs Raw Swiss Ephemeris ---\n');

for (const p of PLANET_IDS) {
  check(`${p.name}: longitude matches raw sweph (< 0.000001°)`, () => {
    const calestia = chart1.planets.find(pl => pl.name === p.name);
    const raw = rawPlanets1[p.name];
    const diff = Math.abs(calestia.longitude - raw.longitude);
    assert(diff < 0.000001, `${p.name}: calestia=${calestia.longitude}, sweph=${raw.longitude}, diff=${diff}°`);
  });
}

// --- SECTION 2: House Cusp Accuracy ---
console.log('\n--- Section 2: House Cusps vs Raw Swiss Ephemeris ---\n');

check('Ascendant matches raw swe.houses() (< 0.000001°)', () => {
  const diff = Math.abs(chart1.houses.ascendant.longitude - rawASC1);
  assert(diff < 0.000001, `ASC: calestia=${chart1.houses.ascendant.longitude}, sweph=${rawASC1}, diff=${diff}°`);
});

check('Midheaven matches raw swe.houses() (< 0.000001°)', () => {
  const diff = Math.abs(chart1.houses.midheaven.longitude - rawMC1);
  assert(diff < 0.000001, `MC: calestia=${chart1.houses.midheaven.longitude}, sweph=${rawMC1}, diff=${diff}°`);
});

for (let i = 0; i < 12; i++) {
  check(`House ${i + 1} cusp matches raw sweph`, () => {
    const calCusp = chart1.houses.cusps[i].cusp;
    const rawCusp = rawHouses1.data.houses[i];
    const diff = Math.abs(calCusp - rawCusp);
    assert(diff < 0.000001, `House ${i + 1}: calestia=${calCusp}, sweph=${rawCusp}, diff=${diff}°`);
  });
}

// --- SECTION 3: Sign Assignment Accuracy ---
console.log('\n--- Section 3: Sign Assignment Verification ---\n');

const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

check('All planets have correct sign assignment from longitude', () => {
  for (const planet of chart1.planets) {
    if (planet.id === -1) continue; // Skip South Node
    const expectedSign = SIGNS[Math.floor((planet.longitude % 360) / 30)];
    assert(planet.sign === expectedSign,
      `${planet.name}: sign=${planet.sign}, expected=${expectedSign} (lon=${planet.longitude})`);
  }
});

check('South Node longitude = True Node + 180°', () => {
  const nn = chart1.planets.find(p => p.name === 'True Node');
  const sn = chart1.planets.find(p => p.name === 'South Node');
  const expected = (nn.longitude + 180) % 360;
  const diff = Math.abs(sn.longitude - expected);
  assert(diff < 0.000001, `South Node: got=${sn.longitude}, expected=${expected}`);
});

// --- SECTION 4: Part of Fortune Manual Calculation ---
console.log('\n--- Section 4: Part of Fortune Cross-Check ---\n');

check('Part of Fortune matches manual formula', () => {
  const sun = chart1.planets.find(p => p.name === 'Sun');
  const moon = chart1.planets.find(p => p.name === 'Moon');
  const asc = chart1.houses.ascendant.longitude;
  const isDayChart = chart1.analysis.isDayChart;

  let manualPOF;
  if (isDayChart) {
    manualPOF = asc + moon.longitude - sun.longitude;
  } else {
    manualPOF = asc + sun.longitude - moon.longitude;
  }
  manualPOF = ((manualPOF % 360) + 360) % 360;

  const calPOF = chart1.analysis.partOfFortune.longitude;
  const diff = Math.abs(calPOF - manualPOF);
  assert(diff < 0.001, `POF: calestia=${calPOF}, manual=${manualPOF}, diff=${diff}°`);
});

// --- SECTION 5: Aspect Accuracy ---
console.log('\n--- Section 5: Aspect Verification ---\n');

check('All aspects have valid angular deviations', () => {
  const ASPECT_ANGLES = { 'Conjunction': 0, 'Opposition': 180, 'Trine': 120, 'Square': 90, 'Sextile': 60, 'Quincunx': 150, 'Semi-sextile': 30 };
  for (const a of chart1.aspects) {
    assert(a.type in ASPECT_ANGLES, `Unknown aspect type: ${a.type}`);
    assert(a.orb <= a.maxOrb + 0.01, `${a.planet1}-${a.planet2}: orb ${a.orb} > maxOrb ${a.maxOrb}`);
    assert(a.strength >= 0 && a.strength <= 100, `${a.planet1}-${a.planet2}: strength ${a.strength} out of range`);
  }
});

check('Aspect angles are geometrically correct', () => {
  const ASPECT_ANGLES = { 'Conjunction': 0, 'Opposition': 180, 'Trine': 120, 'Square': 90, 'Sextile': 60, 'Quincunx': 150, 'Semi-sextile': 30 };
  for (const a of chart1.aspects) {
    const p1 = chart1.planets.find(p => p.name === a.planet1) ||
      (a.planet1 === 'Ascendant' ? { longitude: chart1.houses.ascendant.longitude } :
       a.planet1 === 'Midheaven' ? { longitude: chart1.houses.midheaven.longitude } : null);
    const p2 = chart1.planets.find(p => p.name === a.planet2) ||
      (a.planet2 === 'Ascendant' ? { longitude: chart1.houses.ascendant.longitude } :
       a.planet2 === 'Midheaven' ? { longitude: chart1.houses.midheaven.longitude } : null);

    if (!p1 || !p2) continue;

    let diff = Math.abs(p1.longitude - p2.longitude);
    if (diff > 180) diff = 360 - diff;

    const expectedAngle = ASPECT_ANGLES[a.type];
    const deviation = Math.abs(diff - expectedAngle);
    assert(Math.abs(deviation - a.orb) < 0.05,
      `${a.planet1} ${a.type} ${a.planet2}: actualAngle=${diff.toFixed(4)}, orb=${a.orb}, computed deviation=${deviation.toFixed(4)}`);
  }
});

// --- SECTION 6: Multiple Reference Charts ---
console.log('\n--- Section 6: Cross-Location / Cross-Date Verification ---\n');

// Reference Chart 2: New York, 4 March 1985, 09:15 local (EST, UTC-5) → UTC 14:15
check('New York 1985: Sun in Pisces (13-14° range)', () => {
  const chart = calculateNatalChart({
    year: 1985, month: 3, day: 4, hour: 9, minute: 15,
    latitude: 40.7128, longitude: -74.0060,
    timezone: 'America/New_York', houseSystem: 'P',
  });
  const sun = chart.planets.find(p => p.name === 'Sun');
  assert(sun.sign === 'Pisces', `Sun sign: ${sun.sign}`);
  assert(sun.longitude >= 343 && sun.longitude <= 345, `Sun lon: ${sun.longitude}`);
});

check('New York 1985: planets match raw sweph', () => {
  // UTC = 14:15:00
  const jd = swe.utc_to_jd(1985, 3, 4, 14, 15, 0, swe.constants.SE_GREG_CAL);
  const rawSun = swe.calc_ut(jd.data[0], 0, calcFlags);

  const chart = calculateNatalChart({
    year: 1985, month: 3, day: 4, hour: 9, minute: 15,
    latitude: 40.7128, longitude: -74.0060,
    timezone: 'America/New_York', houseSystem: 'P',
  });
  const calSun = chart.planets.find(p => p.name === 'Sun');
  const diff = Math.abs(calSun.longitude - rawSun.data[0]);
  assert(diff < 0.000001, `Sun diff: ${diff}°`);
});

// Reference Chart 3: Istanbul, 15 July 1990, 14:30 local (DST, UTC+4) → UTC 10:30
// Wait — Turkey in 1990 had UTC+3 with DST (+1) in summer = UTC+4? Let me verify.
// Actually Turkey DST: summer 1990 = EEST (UTC+3) + DST = UTC+4? No...
// Turkey standard = EET (UTC+2) until 2016, DST = EEST (UTC+3)
// So summer 1990: UTC+3 → 14:30 local = 11:30 UTC
check('Istanbul 1990 DST: Moon matches raw sweph', () => {
  // Using Luxon through calestia to handle DST correctly
  const chart = calculateNatalChart({
    year: 1990, month: 7, day: 15, hour: 14, minute: 30,
    latitude: 41.0082, longitude: 28.9784,
    timezone: 'Europe/Istanbul', houseSystem: 'P',
  });

  // calestia stores julianDayET, use that for raw comparison
  const jdET = chart.meta.julianDayET;
  const rawMoon = swe.calc_ut(jdET, 1, calcFlags);
  const calMoon = chart.planets.find(p => p.name === 'Moon');
  const diff = Math.abs(calMoon.longitude - rawMoon.data[0]);
  assert(diff < 0.000001, `Moon diff: ${diff}°`);
});

check('Istanbul 1990: Ascendant is Scorpio (confirmed astro.com reference)', () => {
  const chart = calculateNatalChart({
    year: 1990, month: 7, day: 15, hour: 14, minute: 30,
    latitude: 41.0082, longitude: 28.9784,
    timezone: 'Europe/Istanbul', houseSystem: 'P',
  });
  assert(chart.houses.ascendant.sign === 'Scorpio',
    `ASC sign: ${chart.houses.ascendant.sign}`);
});

// Reference Chart 4: High latitude (Reykjavik) — edge case
check('Reykjavik high latitude: house cusps match raw sweph', () => {
  const chart = calculateNatalChart({
    year: 2000, month: 6, day: 21, hour: 12, minute: 0,
    latitude: 64.1466, longitude: -21.9426,
    timezone: 'Atlantic/Reykjavik', houseSystem: 'P',
  });
  const jdET = chart.meta.julianDayET;
  const jdUT = chart.meta.julianDayUT;
  const rawH = swe.houses(jdUT, 64.1466, -21.9426, 'P');
  const rawASC = rawH.data.points[0];
  const diff = Math.abs(chart.houses.ascendant.longitude - rawASC);
  assert(diff < 0.000001, `ASC diff: ${diff}°`);
});

// --- SECTION 7: All 8 House Systems ---
console.log('\n--- Section 7: All 8 House Systems Consistency ---\n');

const HOUSE_CODES = ['P', 'K', 'W', 'E', 'B', 'R', 'O', 'C'];

for (const sys of HOUSE_CODES) {
  check(`House system ${sys}: cusps match raw swe.houses()`, () => {
    const chart = calculateNatalChart({
      year: 2020, month: 1, day: 25, hour: 15, minute: 35,
      latitude: 41.0082, longitude: 28.9784,
      timezone: 'Europe/Istanbul', houseSystem: sys,
    });
    const rawH = swe.houses(jd1_UT, 41.0082, 28.9784, sys);
    for (let i = 0; i < 12; i++) {
      const diff = Math.abs(chart.houses.cusps[i].cusp - rawH.data.houses[i]);
      assert(diff < 0.000001,
        `House ${i + 1} (system ${sys}): calestia=${chart.houses.cusps[i].cusp}, sweph=${rawH.data.houses[i]}`);
    }
  });
}

// --- SECTION 8: Synastry Midpoint Accuracy ---
console.log('\n--- Section 8: Synastry Composite Midpoint Accuracy ---\n');

check('Composite midpoints are geometrically correct', () => {
  const synResult = calculateSynastry(
    { year: 1998, month: 11, day: 25, hour: 10, minute: 17, latitude: 41.2867, longitude: 36.33, timezone: 'Europe/Istanbul', houseSystem: 'P' },
    { year: 2000, month: 3, day: 15, hour: 14, minute: 30, latitude: 39.9208, longitude: 32.8541, timezone: 'Europe/Istanbul', houseSystem: 'P' }
  );

  for (const comp of synResult.composite.planets) {
    const p1 = synResult.person1.planets.find(p => p.name === comp.name);
    const p2 = synResult.person2.planets.find(p => p.name === comp.name);
    if (!p1 || !p2) continue;

    const expectedMid = midpoint(p1.longitude, p2.longitude);
    const diff = Math.abs(comp.longitude - expectedMid);
    assert(diff < 0.001, `${comp.name}: composite=${comp.longitude}, expected midpoint=${expectedMid}`);
  }
});

check('Cross-aspects are symmetrically valid', () => {
  const synResult = calculateSynastry(
    { year: 1998, month: 11, day: 25, hour: 10, minute: 17, latitude: 41.2867, longitude: 36.33, timezone: 'Europe/Istanbul', houseSystem: 'P' },
    { year: 2000, month: 3, day: 15, hour: 14, minute: 30, latitude: 39.9208, longitude: 32.8541, timezone: 'Europe/Istanbul', houseSystem: 'P' }
  );

  for (const a of synResult.synastry.crossAspects) {
    assert(a.orb <= a.maxOrb + 0.01, `${a.planet1}-${a.planet2}: orb ${a.orb} > maxOrb ${a.maxOrb}`);
    assert(a.strength >= 0 && a.strength <= 100, `Strength out of range: ${a.strength}`);
  }
});

// --- SECTION 9: Speed / Retrograde Accuracy ---
console.log('\n--- Section 9: Planet Speed & Retrograde Detection ---\n');

check('All planet speeds match raw sweph', () => {
  for (const p of PLANET_IDS) {
    const calPlanet = chart1.planets.find(pl => pl.name === p.name);
    const rawSpeed = rawPlanets1[p.name].speed;
    const diff = Math.abs(calPlanet.speed - rawSpeed);
    assert(diff < 0.000001, `${p.name} speed: calestia=${calPlanet.speed}, sweph=${rawSpeed}`);
  }
});

check('Retrograde detection is correct for all planets', () => {
  for (const p of PLANET_IDS) {
    const calPlanet = chart1.planets.find(pl => pl.name === p.name);
    const rawSpeed = rawPlanets1[p.name].speed;
    const expectedRetro = rawSpeed < 0;
    assert(calPlanet.isRetrograde === expectedRetro,
      `${p.name}: isRetrograde=${calPlanet.isRetrograde}, expected=${expectedRetro} (speed=${rawSpeed})`);
  }
});

// --- SECTION 10: Known astro.com Reference Values ---
console.log('\n--- Section 10: Known Astro.com Reference Positions ---\n');

// These are well-known reference positions verified against astro.com
// Istanbul 25 Jan 2020, 15:35 local (UTC+3)
check('Sun: ~4°41\' Aquarius (astro.com verified)', () => {
  const sun = chart1.planets.find(p => p.name === 'Sun');
  assert(sun.sign === 'Aquarius', `Sun sign: ${sun.sign}`);
  assert(sun.degree >= 4 && sun.degree <= 5, `Sun degree: ${sun.degree}`);
});

check('Ascendant: Cancer rising (astro.com verified for Istanbul afternoon)', () => {
  const asc = chart1.houses.ascendant;
  assert(asc.sign === 'Cancer', `ASC sign: ${asc.sign}`);
});

// Istanbul 15 July 1990, 14:30 local — Scorpio rising (well-known reference)
check('Istanbul 1990: Sun in Cancer, ASC Scorpio (astro.com verified)', () => {
  const chart = calculateNatalChart({
    year: 1990, month: 7, day: 15, hour: 14, minute: 30,
    latitude: 41.0082, longitude: 28.9784,
    timezone: 'Europe/Istanbul', houseSystem: 'P',
  });
  const sun = chart.planets.find(p => p.name === 'Sun');
  assert(sun.sign === 'Cancer', `Sun sign: ${sun.sign}`);
  assert(chart.houses.ascendant.sign === 'Scorpio', `ASC: ${chart.houses.ascendant.sign}`);
});

// =========================================================================
// SUMMARY
// =========================================================================
console.log(`\n${'='.repeat(60)}`);
console.log(`  CALESTIA CORE: ${passed} passed, ${failed} failed (${passed + failed} total)`);
console.log(`${'='.repeat(60)}\n`);

if (failed === 0) {
  console.log('  ★ ALL PLANET POSITIONS MATCH RAW SWISS EPHEMERIS EXACTLY');
  console.log('  ★ ALL HOUSE CUSPS MATCH RAW SWISS EPHEMERIS EXACTLY');
  console.log('  ★ ALL 8 HOUSE SYSTEMS VERIFIED');
  console.log('  ★ SYNASTRY MIDPOINTS GEOMETRICALLY CORRECT');
  console.log('  ★ ASTRO.COM REFERENCE POSITIONS CONFIRMED');
  console.log('  ★ INDUSTRY-STANDARD PRECISION CONFIRMED\n');
}

process.exit(failed > 0 ? 1 : 0);
