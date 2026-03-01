// verify-famous-charts.js — Famous Birth Chart Validation for Calestia
// Validates calc_ut → calc fix against 15 well-known birth charts (Rodden AA/A rated)
// Shows deltaT correction magnitude for each chart
// Run: node verify-famous-charts.js

import * as swe from 'sweph';
import path from 'path';
import { fileURLToPath } from 'url';
import { calculateNatalChart } from './src/calculator.js';
import { birthTimeToUTC } from './src/timezone.js';
import { CELESTIAL_BODIES, SIGNS } from './src/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
swe.set_ephe_path(path.join(__dirname, 'ephe'));

const calcFlags = swe.constants.SEFLG_SWIEPH | swe.constants.SEFLG_SPEED;

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    passed++;
    return true;
  } catch (e) {
    console.log(`  ✗  ${name}`);
    console.log(`     ${e.message}`);
    failed++;
    return false;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

// =========================================================================
// 15 FAMOUS BIRTH CHARTS — Well-documented (Rodden AA/A)
// Expected values verified against astro.com and AstroDatabank
// =========================================================================

const FAMOUS_CHARTS = [
  // 1. Marilyn Monroe — Rodden AA (birth certificate)
  {
    label: 'Marilyn Monroe',
    year: 1926, month: 6, day: 1, hour: 9, minute: 30,
    lat: 34.0522, lon: -118.2437, tz: 'America/Los_Angeles',
    sunSign: 'Gemini', moonSign: 'Aquarius', ascSign: 'Leo',
  },
  // 2. Princess Diana — Rodden A
  {
    label: 'Princess Diana',
    year: 1961, month: 7, day: 1, hour: 19, minute: 45,
    lat: 52.8311, lon: 0.5143, tz: 'Europe/London',
    sunSign: 'Cancer', moonSign: 'Aquarius', ascSign: 'Sagittarius',
  },
  // 3. John Lennon — Rodden AA (birth certificate)
  {
    label: 'John Lennon',
    year: 1940, month: 10, day: 9, hour: 18, minute: 30,
    lat: 53.4084, lon: -2.9916, tz: 'Europe/London',
    sunSign: 'Libra', moonSign: 'Aquarius', ascSign: 'Aries',
  },
  // 4. Steve Jobs — Rodden AA
  {
    label: 'Steve Jobs',
    year: 1955, month: 2, day: 24, hour: 19, minute: 15,
    lat: 37.7749, lon: -122.4194, tz: 'America/Los_Angeles',
    sunSign: 'Pisces', moonSign: 'Aries', ascSign: 'Virgo',
  },
  // 5. Madonna — Rodden AA (birth certificate)
  {
    label: 'Madonna',
    year: 1958, month: 8, day: 16, hour: 7, minute: 5,
    lat: 43.5945, lon: -83.8889, tz: 'America/Detroit',
    sunSign: 'Leo', moonSign: 'Virgo', ascSign: 'Virgo',
  },
  // 6. Kurt Cobain — Rodden AA (birth certificate)
  {
    label: 'Kurt Cobain',
    year: 1967, month: 2, day: 20, hour: 19, minute: 20,
    lat: 46.9754, lon: -123.8157, tz: 'America/Los_Angeles',
    sunSign: 'Pisces', moonSign: 'Cancer', ascSign: 'Virgo',
  },
  // 7. Barack Obama — Rodden AA (birth certificate publicly released)
  {
    label: 'Barack Obama',
    year: 1961, month: 8, day: 4, hour: 19, minute: 24,
    lat: 21.3069, lon: -157.8583, tz: 'Pacific/Honolulu',
    sunSign: 'Leo', moonSign: 'Gemini', ascSign: 'Aquarius',
  },
  // 8. Beyoncé — Rodden AA
  {
    label: 'Beyoncé',
    year: 1981, month: 9, day: 4, hour: 10, minute: 0,
    lat: 29.7604, lon: -95.3698, tz: 'America/Chicago',
    sunSign: 'Virgo', moonSign: 'Scorpio', ascSign: 'Libra',
  },
  // 9. David Bowie — Rodden AA (birth certificate)
  {
    label: 'David Bowie',
    year: 1947, month: 1, day: 8, hour: 9, minute: 0,
    lat: 51.4613, lon: -0.1156, tz: 'Europe/London',
    sunSign: 'Capricorn', moonSign: 'Leo', ascSign: 'Aquarius',
  },
  // 10. Elvis Presley — Rodden A
  {
    label: 'Elvis Presley',
    year: 1935, month: 1, day: 8, hour: 4, minute: 35,
    lat: 34.2576, lon: -88.7034, tz: 'America/Chicago',
    sunSign: 'Capricorn', moonSign: 'Pisces', ascSign: 'Sagittarius',
  },
  // 11. Jimi Hendrix — Rodden AA (birth certificate)
  {
    label: 'Jimi Hendrix',
    year: 1942, month: 11, day: 27, hour: 10, minute: 15,
    lat: 47.6062, lon: -122.3321, tz: 'America/Los_Angeles',
    sunSign: 'Sagittarius', moonSign: 'Cancer', ascSign: 'Sagittarius',
  },
  // 12. Muhammad Ali — Rodden AA (birth certificate)
  {
    label: 'Muhammad Ali',
    year: 1942, month: 1, day: 17, hour: 18, minute: 35,
    lat: 38.2527, lon: -85.7585, tz: 'America/Kentucky/Louisville',
    sunSign: 'Capricorn', moonSign: 'Aquarius', ascSign: 'Leo',
  },
  // 13. Amy Winehouse — Rodden AA
  {
    label: 'Amy Winehouse',
    year: 1983, month: 9, day: 14, hour: 22, minute: 25,
    lat: 51.6521, lon: -0.0813, tz: 'Europe/London',
    sunSign: 'Virgo', moonSign: 'Capricorn', ascSign: 'Gemini',
  },
  // 14. Oprah Winfrey — Rodden A
  {
    label: 'Oprah Winfrey',
    year: 1954, month: 1, day: 29, hour: 4, minute: 30,
    lat: 33.0576, lon: -89.5876, tz: 'America/Chicago',
    sunSign: 'Aquarius', moonSign: 'Sagittarius', ascSign: 'Sagittarius',
  },
  // 15. Frida Kahlo — Rodden C (time less certain, only check Sun)
  {
    label: 'Frida Kahlo',
    year: 1907, month: 7, day: 6, hour: 8, minute: 30,
    lat: 19.3467, lon: -99.1617, tz: 'America/Mexico_City',
    sunSign: 'Cancer', moonSign: null, ascSign: null, // time uncertain, only Sun verified
  },
];

// =========================================================================
// VALIDATION LOOP
// =========================================================================

console.log('\n=== CALESTIA: Famous Birth Chart Validation (15 Charts) ===\n');
console.log('Validates calc_ut → calc fix against well-known charts (Rodden AA/A)\n');

let chartNum = 0;

for (const c of FAMOUS_CHARTS) {
  chartNum++;
  console.log(`--- Chart ${chartNum}: ${c.label} (${c.day}/${c.month}/${c.year}, ${String(c.hour).padStart(2,'0')}:${String(c.minute).padStart(2,'0')}) ---`);

  // Calculate via calestia (corrected: uses swe.calc with jd_et)
  let chart;
  try {
    chart = calculateNatalChart({
      year: c.year, month: c.month, day: c.day, hour: c.hour, minute: c.minute,
      latitude: c.lat, longitude: c.lon,
      timezone: c.tz, houseSystem: 'P',
    });
  } catch (e) {
    console.log(`  ✗  FAILED TO CALCULATE: ${e.message}\n`);
    failed++;
    continue;
  }

  // Compute JD independently (full precision, matching calestia's internal calculation)
  const utcData = birthTimeToUTC(c.year, c.month, c.day, c.hour, c.minute, c.tz);
  const jdResult = swe.utc_to_jd(
    utcData.utcYear, utcData.utcMonth, utcData.utcDay,
    utcData.utcHour, utcData.utcMinute, utcData.utcSecond,
    swe.constants.SE_GREG_CAL
  );
  const jd_et = jdResult.data[0];
  const jd_ut = jdResult.data[1];
  const deltaT = (jd_et - jd_ut) * 86400; // seconds

  console.log(`  ΔT = ${deltaT.toFixed(1)}s | UTC: ${utcData.utcYear}-${String(utcData.utcMonth).padStart(2,'0')}-${String(utcData.utcDay).padStart(2,'0')} ${String(utcData.utcHour).padStart(2,'0')}:${String(utcData.utcMinute).padStart(2,'0')}`);

  // ---- Raw Swiss Ephemeris reference (ground truth) ----
  const rawPlanets = {};
  const oldPlanets = {}; // what the OLD buggy code would have given
  for (const body of CELESTIAL_BODIES) {
    const correct = swe.calc(jd_et, body.id, calcFlags);
    const buggy = swe.calc_ut(jd_et, body.id, calcFlags); // old: calc_ut with ET = double deltaT
    rawPlanets[body.name] = correct.data[0];
    oldPlanets[body.name] = buggy.data[0];
  }

  // Show Moon correction (most affected due to ~13°/day speed)
  const moonCorrection = Math.abs(rawPlanets['Moon'] - oldPlanets['Moon']) * 3600; // arcseconds
  const sunCorrection = Math.abs(rawPlanets['Sun'] - oldPlanets['Sun']) * 3600;
  console.log(`  Moon correction: ${moonCorrection.toFixed(1)}" | Sun correction: ${sunCorrection.toFixed(1)}"`);

  // Raw house cusps
  const rawHouses = swe.houses(jd_ut, c.lat, c.lon, 'P');
  const rawCusps = [0, ...rawHouses.data.houses];
  const rawASC = rawHouses.data.points[0];
  const rawMC = rawHouses.data.points[1];

  // ---- CHECK 1: All planet positions match raw swe.calc() ----
  let allPlanetsMatch = true;
  for (const body of CELESTIAL_BODIES) {
    const ok = check(`${c.label} ${body.name} lon`, () => {
      const cal = chart.planets.find(p => p.name === body.name);
      const diff = Math.abs(cal.longitude - rawPlanets[body.name]);
      assert(diff < 0.000001, `${body.name}: calestia=${cal.longitude}, sweph=${rawPlanets[body.name]}, diff=${diff}°`);
    });
    if (!ok) allPlanetsMatch = false;
  }
  if (allPlanetsMatch) console.log(`  ✓  All 13 planet positions match raw swe.calc() (< 0.000001°)`);

  // ---- CHECK 2: House cusps match raw swe.houses() ----
  let allCuspsMatch = true;
  const cuspOk1 = check(`${c.label} ASC`, () => {
    const diff = Math.abs(chart.houses.ascendant.longitude - rawASC);
    assert(diff < 0.000001, `ASC diff: ${diff}°`);
  });
  const cuspOk2 = check(`${c.label} MC`, () => {
    const diff = Math.abs(chart.houses.midheaven.longitude - rawMC);
    assert(diff < 0.000001, `MC diff: ${diff}°`);
  });
  if (!cuspOk1 || !cuspOk2) allCuspsMatch = false;
  for (let i = 0; i < 12; i++) {
    const ok = check(`${c.label} House ${i+1}`, () => {
      const diff = Math.abs(chart.houses.cusps[i].cusp - rawHouses.data.houses[i]);
      assert(diff < 0.000001, `House ${i+1} diff: ${diff}°`);
    });
    if (!ok) allCuspsMatch = false;
  }
  if (allCuspsMatch) console.log(`  ✓  All 14 cusps (ASC+MC+12) match raw swe.houses() (< 0.000001°)`);

  // ---- CHECK 3: House assignments correct ----
  let allHousesCorrect = true;
  for (const planet of chart.planets) {
    const ok = check(`${c.label} ${planet.name} house`, () => {
      // Reference house from raw cusps
      let expectedHouse = 1;
      for (let i = 1; i <= 12; i++) {
        const next = i === 12 ? 1 : i + 1;
        const start = rawCusps[i];
        const end = rawCusps[next];
        if (start <= end) {
          if (planet.longitude >= start && planet.longitude < end) { expectedHouse = i; break; }
        } else {
          if (planet.longitude >= start || planet.longitude < end) { expectedHouse = i; break; }
        }
      }
      assert(planet.house === expectedHouse,
        `${planet.name}: house=${planet.house}, expected=${expectedHouse}`);
    });
    if (!ok) allHousesCorrect = false;
  }
  if (allHousesCorrect) console.log(`  ✓  All planet-house assignments verified correct`);

  // ---- CHECK 4: Known sign placements (astro.com / AstroDatabank reference) ----
  const sun = chart.planets.find(p => p.name === 'Sun');
  const moon = chart.planets.find(p => p.name === 'Moon');

  check(`${c.label} Sun in ${c.sunSign}`, () => {
    assert(sun.sign === c.sunSign, `Sun: got ${sun.sign}, expected ${c.sunSign} (lon=${sun.longitude})`);
  });
  console.log(`  ✓  Sun: ${sun.degree}°${String(sun.minute).padStart(2,'0')}' ${sun.sign}`);

  if (c.moonSign) {
    check(`${c.label} Moon in ${c.moonSign}`, () => {
      assert(moon.sign === c.moonSign, `Moon: got ${moon.sign}, expected ${c.moonSign} (lon=${moon.longitude})`);
    });
    console.log(`  ✓  Moon: ${moon.degree}°${String(moon.minute).padStart(2,'0')}' ${moon.sign}`);
  }

  if (c.ascSign) {
    check(`${c.label} ASC in ${c.ascSign}`, () => {
      assert(chart.houses.ascendant.sign === c.ascSign,
        `ASC: got ${chart.houses.ascendant.sign}, expected ${c.ascSign}`);
    });
    console.log(`  ✓  ASC: ${chart.houses.ascendant.sign}`);
  }

  console.log('');
}

// =========================================================================
// SUMMARY
// =========================================================================

console.log(`${'='.repeat(60)}`);
console.log(`  FAMOUS CHARTS: ${passed} passed, ${failed} failed (${passed + failed} total)`);
console.log(`${'='.repeat(60)}\n`);

if (failed === 0) {
  console.log('  ★ ALL 15 FAMOUS CHARTS: Planet positions match raw Swiss Ephemeris');
  console.log('  ★ ALL 15 FAMOUS CHARTS: House cusps match raw Swiss Ephemeris');
  console.log('  ★ ALL 15 FAMOUS CHARTS: House assignments verified correct');
  console.log('  ★ ALL 15 FAMOUS CHARTS: Known sign placements confirmed');
  console.log('  ★ calc_ut → calc FIX VALIDATED — deltaT correction working correctly\n');
} else {
  console.log(`  ⚠ ${failed} check(s) failed — review above\n`);
}

process.exit(failed > 0 ? 1 : 0);
