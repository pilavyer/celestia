// verify-comprehensive.js — 40-Chart Comprehensive Validation for Calestia
// Validates planet positions, house cusps, house assignments, sign assignments, and formatted positions
// against raw Swiss Ephemeris (swe.calc + swe.houses) as ground truth.
// Run: node verify-comprehensive.js

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
let totalChecks = 0;

function check(name, fn) {
  try {
    fn();
    passed++;
    totalChecks++;
  } catch (e) {
    console.log(`  ✗  ${name}`);
    console.log(`     ${e.message}`);
    failed++;
    totalChecks++;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

// Helper: find which house a planet is in given cusps array (1-indexed, cusps[0] unused)
function referenceHouse(planetLon, cusps) {
  for (let i = 1; i <= 12; i++) {
    const next = i === 12 ? 1 : i + 1;
    const start = cusps[i];
    const end = cusps[next];
    if (start <= end) {
      if (planetLon >= start && planetLon < end) return i;
    } else {
      if (planetLon >= start || planetLon < end) return i;
    }
  }
  return 1;
}

// Helper: longitude to expected sign
function lonToSign(lon) {
  let l = lon % 360;
  if (l < 0) l += 360;
  return SIGNS[Math.floor(l / 30)];
}

// Helper: longitude to expected DMS
function lonToDMS(lon) {
  let l = lon % 360;
  if (l < 0) l += 360;
  let signIndex = Math.floor(l / 30);
  const posInSign = l % 30;
  let degree = Math.floor(posInSign);
  const fractional = (posInSign - degree) * 60;
  let minute = Math.floor(fractional);
  let second = Math.round((fractional - minute) * 60);
  if (second >= 60) { second = 0; minute++; }
  if (minute >= 60) { minute = 0; degree++; }
  if (degree >= 30) { degree = 0; signIndex = (signIndex + 1) % 12; }
  return { sign: SIGNS[signIndex], degree, minute, second };
}

// =========================================================================
// 40 TEST CHARTS
// =========================================================================

const CHARTS = [
  // --- Turkey (12 charts) ---
  { label: 'Istanbul 1965-03-21 08:00',    year: 1965, month: 3, day: 21, hour: 8, minute: 0,  lat: 41.0082, lon: 28.9784, tz: 'Europe/Istanbul', hs: 'P' },
  { label: 'Ankara 1972-11-15 14:30',      year: 1972, month: 11, day: 15, hour: 14, minute: 30, lat: 39.9208, lon: 32.8541, tz: 'Europe/Istanbul', hs: 'P' },
  { label: 'Izmir 1980-06-22 03:45',       year: 1980, month: 6, day: 22, hour: 3, minute: 45, lat: 38.4192, lon: 27.1287, tz: 'Europe/Istanbul', hs: 'P' },
  { label: 'Samsun 1988-01-10 19:20',      year: 1988, month: 1, day: 10, hour: 19, minute: 20, lat: 41.2867, lon: 36.3300, tz: 'Europe/Istanbul', hs: 'P' },
  { label: 'Konya 1993-04-07 11:15',       year: 1993, month: 4, day: 7, hour: 11, minute: 15, lat: 37.8746, lon: 32.4932, tz: 'Europe/Istanbul', hs: 'P' },
  { label: 'Istanbul 1994-09-23 06:30',    year: 1994, month: 9, day: 23, hour: 6, minute: 30, lat: 41.0082, lon: 28.9784, tz: 'Europe/Istanbul', hs: 'P' },
  { label: 'Mersin 1995-12-25 23:50',      year: 1995, month: 12, day: 25, hour: 23, minute: 50, lat: 36.8121, lon: 34.6415, tz: 'Europe/Istanbul', hs: 'P' },
  { label: 'Istanbul 1996-07-14 16:00',    year: 1996, month: 7, day: 14, hour: 16, minute: 0, lat: 41.0082, lon: 28.9784, tz: 'Europe/Istanbul', hs: 'P' },
  { label: 'Ankara 1997-03-30 09:45',      year: 1997, month: 3, day: 30, hour: 9, minute: 45, lat: 39.9208, lon: 32.8541, tz: 'Europe/Istanbul', hs: 'P' },
  { label: 'Istanbul 1997-10-26 02:15',    year: 1997, month: 10, day: 26, hour: 2, minute: 15, lat: 41.0082, lon: 28.9784, tz: 'Europe/Istanbul', hs: 'P' },
  { label: 'Istanbul 1998-11-25 10:17',    year: 1998, month: 11, day: 25, hour: 10, minute: 17, lat: 41.0082, lon: 28.9784, tz: 'Europe/Istanbul', hs: 'P' },
  { label: 'Istanbul 1999-08-11 15:00',    year: 1999, month: 8, day: 11, hour: 15, minute: 0, lat: 41.0082, lon: 28.9784, tz: 'Europe/Istanbul', hs: 'P' },

  // --- Europe (6 charts) ---
  { label: 'Düsseldorf 1990-05-20 07:30',  year: 1990, month: 5, day: 20, hour: 7, minute: 30, lat: 51.2277, lon: 6.7735, tz: 'Europe/Berlin', hs: 'P' },
  { label: 'London 1978-02-14 22:00',      year: 1978, month: 2, day: 14, hour: 22, minute: 0, lat: 51.5074, lon: -0.1278, tz: 'Europe/London', hs: 'P' },
  { label: 'Berlin 1985-10-03 13:45',      year: 1985, month: 10, day: 3, hour: 13, minute: 45, lat: 52.5200, lon: 13.4050, tz: 'Europe/Berlin', hs: 'K' },
  { label: 'Paris 2001-07-04 00:30',       year: 2001, month: 7, day: 4, hour: 0, minute: 30, lat: 48.8566, lon: 2.3522, tz: 'Europe/Paris', hs: 'P' },
  { label: 'Helsinki 1975-12-21 06:00',    year: 1975, month: 12, day: 21, hour: 6, minute: 0, lat: 60.1699, lon: 24.9384, tz: 'Europe/Helsinki', hs: 'P' },
  { label: 'Reykjavik 2005-06-21 12:00',   year: 2005, month: 6, day: 21, hour: 12, minute: 0, lat: 64.1466, lon: -21.9426, tz: 'Atlantic/Reykjavik', hs: 'P' },

  // --- Americas (6 charts) ---
  { label: 'New York 1970-04-15 05:20',    year: 1970, month: 4, day: 15, hour: 5, minute: 20, lat: 40.7128, lon: -74.0060, tz: 'America/New_York', hs: 'P' },
  { label: 'New York 1997-06-18 14:00',    year: 1997, month: 6, day: 18, hour: 14, minute: 0, lat: 40.7128, lon: -74.0060, tz: 'America/New_York', hs: 'P' },
  { label: 'Los Angeles 1983-08-29 21:30', year: 1983, month: 8, day: 29, hour: 21, minute: 30, lat: 34.0522, lon: -118.2437, tz: 'America/Los_Angeles', hs: 'P' },
  { label: 'São Paulo 2010-01-01 00:00',   year: 2010, month: 1, day: 1, hour: 0, minute: 0, lat: -23.5505, lon: -46.6333, tz: 'America/Sao_Paulo', hs: 'P' },
  { label: 'Buenos Aires 1992-03-28 18:45',year: 1992, month: 3, day: 28, hour: 18, minute: 45, lat: -34.6037, lon: -58.3816, tz: 'America/Argentina/Buenos_Aires', hs: 'P' },
  { label: 'Chicago 2000-09-11 08:46',     year: 2000, month: 9, day: 11, hour: 8, minute: 46, lat: 41.8781, lon: -87.6298, tz: 'America/Chicago', hs: 'P' },

  // --- Asia (4 charts) ---
  { label: 'Tokyo 1986-04-26 10:00',       year: 1986, month: 4, day: 26, hour: 10, minute: 0, lat: 35.6762, lon: 139.6503, tz: 'Asia/Tokyo', hs: 'P' },
  { label: 'Mumbai 1995-01-17 04:30',      year: 1995, month: 1, day: 17, hour: 4, minute: 30, lat: 19.0760, lon: 72.8777, tz: 'Asia/Kolkata', hs: 'P' },
  { label: 'Shanghai 2003-10-15 20:00',    year: 2003, month: 10, day: 15, hour: 20, minute: 0, lat: 31.2304, lon: 121.4737, tz: 'Asia/Shanghai', hs: 'P' },
  { label: 'Dubai 2015-05-08 12:30',       year: 2015, month: 5, day: 8, hour: 12, minute: 30, lat: 25.2048, lon: 55.2708, tz: 'Asia/Dubai', hs: 'P' },

  // --- Southern hemisphere / Oceania (2 charts) ---
  { label: 'Sydney 1991-11-30 09:15',      year: 1991, month: 11, day: 30, hour: 9, minute: 15, lat: -33.8688, lon: 151.2093, tz: 'Australia/Sydney', hs: 'P' },
  { label: 'Cape Town 2008-07-22 17:00',   year: 2008, month: 7, day: 22, hour: 17, minute: 0, lat: -33.9249, lon: 18.4241, tz: 'Africa/Johannesburg', hs: 'P' },

  // --- DST edge cases (3 charts) ---
  { label: 'Istanbul DST Mar 1993',        year: 1993, month: 3, day: 28, hour: 14, minute: 0, lat: 41.0082, lon: 28.9784, tz: 'Europe/Istanbul', hs: 'P' },
  { label: 'New York DST Nov 2007',        year: 2007, month: 11, day: 4, hour: 13, minute: 30, lat: 40.7128, lon: -74.0060, tz: 'America/New_York', hs: 'P' },
  { label: 'London DST Oct 1996',          year: 1996, month: 10, day: 27, hour: 15, minute: 0, lat: 51.5074, lon: -0.1278, tz: 'Europe/London', hs: 'P' },

  // --- 0°/360° boundary (Pisces-Aries cusp) (2 charts) ---
  { label: 'Istanbul Equinox 2020',        year: 2020, month: 3, day: 20, hour: 6, minute: 50, lat: 41.0082, lon: 28.9784, tz: 'Europe/Istanbul', hs: 'P' },
  { label: 'London Equinox 2015',          year: 2015, month: 3, day: 20, hour: 22, minute: 45, lat: 51.5074, lon: -0.1278, tz: 'Europe/London', hs: 'P' },

  // --- Different house systems (3 charts) ---
  { label: 'Istanbul 2020 Koch',           year: 2020, month: 1, day: 25, hour: 15, minute: 35, lat: 41.0082, lon: 28.9784, tz: 'Europe/Istanbul', hs: 'K' },
  { label: 'Istanbul 2020 Whole Sign',     year: 2020, month: 1, day: 25, hour: 15, minute: 35, lat: 41.0082, lon: 28.9784, tz: 'Europe/Istanbul', hs: 'W' },
  { label: 'Istanbul 2020 Equal',          year: 2020, month: 1, day: 25, hour: 15, minute: 35, lat: 41.0082, lon: 28.9784, tz: 'Europe/Istanbul', hs: 'E' },

  // --- Recent / 2020s (2 charts) ---
  { label: 'Istanbul 2024-08-19 10:30',    year: 2024, month: 8, day: 19, hour: 10, minute: 30, lat: 41.0082, lon: 28.9784, tz: 'Europe/Istanbul', hs: 'P' },
  { label: 'Berlin 2025-01-01 00:00',      year: 2025, month: 1, day: 1, hour: 0, minute: 0, lat: 52.5200, lon: 13.4050, tz: 'Europe/Berlin', hs: 'P' },
];

// Planet IDs for raw Swiss Ephemeris calls
const PLANET_IDS = CELESTIAL_BODIES.map(b => ({ id: b.id, name: b.name }));

// =========================================================================
// MAIN VALIDATION LOOP
// =========================================================================

console.log('\n=== CALESTIA COMPREHENSIVE VALIDATION: 40 Charts ===\n');

let chartNum = 0;

for (const c of CHARTS) {
  chartNum++;

  // Calculate via calestia
  let chart;
  try {
    chart = calculateNatalChart({
      year: c.year, month: c.month, day: c.day, hour: c.hour, minute: c.minute,
      latitude: c.lat, longitude: c.lon,
      timezone: c.tz, houseSystem: c.hs,
    });
  } catch (e) {
    console.log(`\n--- Chart ${chartNum}: ${c.label} ---`);
    console.log(`  ✗  FAILED TO CALCULATE: ${e.message}`);
    failed++;
    totalChecks++;
    continue;
  }

  // Compute JD independently (full precision, not from chart.meta which is rounded to 8 decimals)
  const utcData = birthTimeToUTC(c.year, c.month, c.day, c.hour, c.minute, c.tz);
  const jdResult = swe.utc_to_jd(
    utcData.utcYear, utcData.utcMonth, utcData.utcDay,
    utcData.utcHour, utcData.utcMinute, utcData.utcSecond,
    swe.constants.SE_GREG_CAL
  );
  const jd_et = jdResult.data[0];
  const jd_ut = jdResult.data[1];

  // Raw Swiss Ephemeris planet positions (ground truth)
  const rawPlanets = {};
  for (const p of PLANET_IDS) {
    const result = swe.calc(jd_et, p.id, calcFlags);
    rawPlanets[p.name] = {
      longitude: result.data[0],
      latitude: result.data[1],
      speed: result.data[3],
    };
  }

  // Raw Swiss Ephemeris house cusps (ground truth)
  const rawHouses = swe.houses(jd_ut, c.lat, c.lon, c.hs);
  const rawCusps = [0, ...rawHouses.data.houses]; // 1-indexed
  const rawASC = rawHouses.data.points[0];
  const rawMC = rawHouses.data.points[1];

  const prefix = `Chart ${chartNum} [${c.label}]`;

  // --- CHECK 1: Planet longitude accuracy (<0.000001°) ---
  for (const p of PLANET_IDS) {
    check(`${prefix} ${p.name} longitude`, () => {
      const cal = chart.planets.find(pl => pl.name === p.name);
      const raw = rawPlanets[p.name];
      const diff = Math.abs(cal.longitude - raw.longitude);
      assert(diff < 0.000001, `${p.name}: calestia=${cal.longitude}, sweph=${raw.longitude}, diff=${diff}°`);
    });
  }

  // --- CHECK 2: House cusps accuracy ---
  check(`${prefix} ASC`, () => {
    const diff = Math.abs(chart.houses.ascendant.longitude - rawASC);
    assert(diff < 0.000001, `ASC: calestia=${chart.houses.ascendant.longitude}, sweph=${rawASC}, diff=${diff}°`);
  });
  check(`${prefix} MC`, () => {
    const diff = Math.abs(chart.houses.midheaven.longitude - rawMC);
    assert(diff < 0.000001, `MC: calestia=${chart.houses.midheaven.longitude}, sweph=${rawMC}, diff=${diff}°`);
  });
  for (let i = 0; i < 12; i++) {
    check(`${prefix} House ${i + 1} cusp`, () => {
      const calCusp = chart.houses.cusps[i].cusp;
      const rawCusp = rawHouses.data.houses[i];
      const diff = Math.abs(calCusp - rawCusp);
      assert(diff < 0.000001, `House ${i + 1}: calestia=${calCusp}, sweph=${rawCusp}, diff=${diff}°`);
    });
  }

  // --- CHECK 3: Planet-house assignment correctness ---
  for (const planet of chart.planets) {
    check(`${prefix} ${planet.name} house=${planet.house}`, () => {
      const expectedHouse = referenceHouse(planet.longitude, rawCusps);
      assert(planet.house === expectedHouse,
        `${planet.name}: calestia house=${planet.house}, expected=${expectedHouse} (lon=${planet.longitude})`);
    });
  }

  // --- CHECK 4: Sign assignment consistency ---
  for (const planet of chart.planets) {
    check(`${prefix} ${planet.name} sign=${planet.sign}`, () => {
      // Use the DMS function which handles the carry-over correctly
      const dms = lonToDMS(planet.longitude);
      assert(planet.sign === dms.sign,
        `${planet.name}: sign=${planet.sign}, expected=${dms.sign} (lon=${planet.longitude})`);
    });
  }

  // --- CHECK 5: Formatted position internal consistency ---
  // formattedPosition is computed from raw (pre-rounding) longitude, so we verify
  // it matches the stored degree/minute/second/sign fields (which share the same source)
  for (const planet of chart.planets) {
    check(`${prefix} ${planet.name} formatted`, () => {
      const expected = `${planet.degree}°${String(planet.minute).padStart(2, '0')}'${String(planet.second).padStart(2, '0')}" ${planet.sign}`;
      assert(planet.formattedPosition === expected,
        `${planet.name}: formatted="${planet.formattedPosition}", expected="${expected}"`);
    });
  }
}

// =========================================================================
// SECTION 2: astro.com Manual Reference Cross-Check (5 charts)
// =========================================================================

console.log('\n--- astro.com Reference Cross-Check ---\n');

// Reference 1: Istanbul 25 Jan 2020 15:35 — well-known reference
check('astro.com Ref 1: Istanbul 2020 Sun in Aquarius ~4°41\'', () => {
  const chart = calculateNatalChart({
    year: 2020, month: 1, day: 25, hour: 15, minute: 35,
    latitude: 41.0082, longitude: 28.9784, timezone: 'Europe/Istanbul', houseSystem: 'P',
  });
  const sun = chart.planets.find(p => p.name === 'Sun');
  assert(sun.sign === 'Aquarius', `Sun sign: ${sun.sign}`);
  assert(sun.degree >= 4 && sun.degree <= 5, `Sun degree: ${sun.degree}`);
  assert(chart.houses.ascendant.sign === 'Cancer', `ASC: ${chart.houses.ascendant.sign}`);
});

// Reference 2: Istanbul 15 Jul 1990 14:30 — Scorpio rising
check('astro.com Ref 2: Istanbul 1990 ASC Scorpio, Sun Cancer', () => {
  const chart = calculateNatalChart({
    year: 1990, month: 7, day: 15, hour: 14, minute: 30,
    latitude: 41.0082, longitude: 28.9784, timezone: 'Europe/Istanbul', houseSystem: 'P',
  });
  assert(chart.houses.ascendant.sign === 'Scorpio', `ASC: ${chart.houses.ascendant.sign}`);
  const sun = chart.planets.find(p => p.name === 'Sun');
  assert(sun.sign === 'Cancer', `Sun: ${sun.sign}`);
});

// Reference 3: New York 4 Mar 1985 09:15
check('astro.com Ref 3: New York 1985 Sun in Pisces', () => {
  const chart = calculateNatalChart({
    year: 1985, month: 3, day: 4, hour: 9, minute: 15,
    latitude: 40.7128, longitude: -74.0060, timezone: 'America/New_York', houseSystem: 'P',
  });
  const sun = chart.planets.find(p => p.name === 'Sun');
  assert(sun.sign === 'Pisces', `Sun: ${sun.sign}`);
  assert(sun.longitude >= 343 && sun.longitude <= 345, `Sun lon: ${sun.longitude}`);
});

// Reference 4: 1997 birth (reported problem area) — Istanbul 15 Sep 1997 10:00
check('astro.com Ref 4: Istanbul 1997 chart consistency', () => {
  const chart = calculateNatalChart({
    year: 1997, month: 9, day: 15, hour: 10, minute: 0,
    latitude: 41.0082, longitude: 28.9784, timezone: 'Europe/Istanbul', houseSystem: 'P',
  });
  const sun = chart.planets.find(p => p.name === 'Sun');
  assert(sun.sign === 'Virgo', `Sun: ${sun.sign}`);
  // Verify raw sweph matches
  const jd = swe.utc_to_jd(1997, 9, 15, 7, 0, 0, swe.constants.SE_GREG_CAL); // UTC+3 → 07:00 UTC
  const rawSun = swe.calc(jd.data[0], 0, calcFlags);
  const diff = Math.abs(sun.longitude - rawSun.data[0]);
  assert(diff < 0.000001, `Sun diff: ${diff}°`);
});

// Reference 5: 2000 birth — Ankara 1 Jun 2000 14:00
check('astro.com Ref 5: Ankara 2000 chart consistency', () => {
  const chart = calculateNatalChart({
    year: 2000, month: 6, day: 1, hour: 14, minute: 0,
    latitude: 39.9208, longitude: 32.8541, timezone: 'Europe/Istanbul', houseSystem: 'P',
  });
  const sun = chart.planets.find(p => p.name === 'Sun');
  assert(sun.sign === 'Gemini', `Sun: ${sun.sign}`);
  // Verify raw sweph matches
  const jd = swe.utc_to_jd(2000, 6, 1, 11, 0, 0, swe.constants.SE_GREG_CAL); // UTC+3
  const rawSun = swe.calc(jd.data[0], 0, calcFlags);
  const diff = Math.abs(sun.longitude - rawSun.data[0]);
  assert(diff < 0.000001, `Sun diff: ${diff}°`);
});

// =========================================================================
// SUMMARY
// =========================================================================

console.log(`\n${'='.repeat(60)}`);
console.log(`  COMPREHENSIVE VALIDATION: ${passed} passed, ${failed} failed (${totalChecks} total)`);
console.log(`${'='.repeat(60)}\n`);

if (failed === 0) {
  console.log('  ★ ALL 40 CHARTS: Planet positions match raw Swiss Ephemeris');
  console.log('  ★ ALL 40 CHARTS: House cusps match raw Swiss Ephemeris');
  console.log('  ★ ALL 40 CHARTS: House assignments verified correct');
  console.log('  ★ ALL 40 CHARTS: Sign assignments consistent with longitudes');
  console.log('  ★ ALL 40 CHARTS: Formatted positions verified');
  console.log('  ★ 5 ASTRO.COM REFERENCES: Cross-checked and confirmed\n');
} else {
  console.log(`  ⚠ ${failed} check(s) failed — review above\n`);
}

process.exit(failed > 0 ? 1 : 0);
