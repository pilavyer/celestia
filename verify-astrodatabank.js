/**
 * verify-astrodatabank.js — Astro-Databank Reference Verification
 *
 * Compares Calestia output against 10 well-known natal charts from
 * Astro-Databank (astro.com), Astro-Seek, and Mojan references.
 *
 * Charts include LMT (pre-timezone) births, modern timezones,
 * Rodden AA/A rated data.
 *
 * Reference positions in Turkish zodiac names from user's spreadsheet.
 */

import { calculateNatalChart } from './src/calculator.js';
import { roundTo } from './src/utils.js';

// ============================================================
// SIGN MAPPING (Turkish → English → base degree)
// ============================================================

const SIGN_BASE = {
  'Koç': 0, 'Boğa': 30, 'İkizler': 60, 'Yengeç': 90,
  'Aslan': 120, 'Başak': 150, 'Terazi': 180, 'Akrep': 210,
  'Yay': 240, 'Oğlak': 270, 'Kova': 300, 'Balık': 330,
};

const SIGN_TR_TO_EN = {
  'Koç': 'Aries', 'Boğa': 'Taurus', 'İkizler': 'Gemini', 'Yengeç': 'Cancer',
  'Aslan': 'Leo', 'Başak': 'Virgo', 'Terazi': 'Libra', 'Akrep': 'Scorpio',
  'Yay': 'Sagittarius', 'Oğlak': 'Capricorn', 'Kova': 'Aquarius', 'Balık': 'Pisces',
};

/**
 * Parse position string like "23°30' Balık" or "5° Balık" to decimal degrees.
 * Returns { longitude, sign, degree, minute, precision }
 */
function parsePosition(str) {
  str = str.replace('(R)', '').replace('~', '').trim();

  // Minute precision: "23°30' Balık"
  const minuteMatch = str.match(/(\d+)°(\d+)'\s+(.+)/);
  if (minuteMatch) {
    const deg = parseInt(minuteMatch[1]);
    const min = parseInt(minuteMatch[2]);
    const signTr = minuteMatch[3].trim();
    const base = SIGN_BASE[signTr];
    return {
      longitude: base + deg + min / 60,
      sign: SIGN_TR_TO_EN[signTr],
      degree: deg,
      minute: min,
      precision: 'minute', // ±0.02° tolerance
    };
  }

  // Degree precision: "5° Balık"
  const degreeMatch = str.match(/(\d+)°\s+(.+)/);
  if (degreeMatch) {
    const deg = parseInt(degreeMatch[1]);
    const signTr = degreeMatch[2].trim();
    const base = SIGN_BASE[signTr];
    return {
      longitude: base + deg + 0.5, // center of degree
      sign: SIGN_TR_TO_EN[signTr],
      degree: deg,
      minute: null,
      precision: 'degree', // ±1° tolerance
    };
  }

  throw new Error(`Cannot parse position: "${str}"`);
}

// ============================================================
// 10 REFERENCE CHARTS
// ============================================================

const CHARTS = [
  {
    name: 'Albert Einstein',
    rodden: 'AA',
    // LMT birth: Ulm 10°00'E → offset +40min → UTC = 10:50
    calestia: { year: 1879, month: 3, day: 14, hour: 10, minute: 50, latitude: 48.4, longitude: 10.0, timezone: 'UTC' },
    ref: {
      Sun: "23°30' Balık", Moon: "14°32' Yay", Mercury: "3°09' Koç",
      Venus: "16°59' Koç", Mars: "26°55' Oğlak", Jupiter: "27°29' Kova",
      Saturn: "4°11' Koç", Uranus: "1°17' Başak", Neptune: "7°52' Boğa",
      Pluto: "24°44' Boğa", 'True Node': "2°44' Kova",
    },
    refPoints: { Ascendant: "11°39' Yengeç", MC: "12°50' Balık" },
    retrograde: ['Uranus'],
  },
  {
    name: 'Marilyn Monroe',
    rodden: 'AA',
    // PST (UTC-8): 09:30 PST → UTC 17:30
    calestia: { year: 1926, month: 6, day: 1, hour: 17, minute: 30, latitude: 34.05, longitude: -118.25, timezone: 'UTC' },
    ref: {
      Sun: "10°27' İkizler", Moon: "19°06' Kova", Mercury: "6°47' İkizler",
      Venus: "28°45' Koç", Mars: "20°44' Balık", Jupiter: "26°50' Kova",
      Saturn: "21°26' Akrep", Uranus: "29°00' Balık", Neptune: "22°13' Aslan",
      Pluto: "13°23' Yengeç", 'True Node': "16°54' Yengeç",
    },
    refPoints: { Ascendant: "13°05' Aslan", MC: "6°01' Boğa" },
    retrograde: ['Saturn'],
  },
  {
    name: 'Princess Diana',
    rodden: 'AA',
    // BST (UTC+1): 19:45 BST → UTC 18:45
    calestia: { year: 1961, month: 7, day: 1, hour: 18, minute: 45, latitude: 52.8333, longitude: 0.5, timezone: 'UTC' },
    ref: {
      Sun: "9°40' Yengeç", Moon: "25°02' Kova", Mercury: "3°12' Yengeç",
      Venus: "24°24' Boğa", Mars: "1°39' Başak", Jupiter: "5°06' Kova",
      Saturn: "27°49' Oğlak", Uranus: "23°20' Aslan", Neptune: "8°38' Akrep",
      Pluto: "6°03' Başak", 'True Node': "28°11' Aslan",
    },
    refPoints: { Ascendant: "18°25' Yay", MC: "23°03' Terazi" },
    retrograde: [],
  },
  {
    name: 'Steve Jobs',
    rodden: 'AA',
    // PST (UTC-8): 19:15 PST → UTC 03:15 next day (Feb 25)
    calestia: { year: 1955, month: 2, day: 25, hour: 3, minute: 15, latitude: 37.7833, longitude: -122.4167, timezone: 'UTC' },
    ref: {
      Sun: "5° Balık", Moon: "7° Koç", Mercury: "14° Kova",
      Venus: "21° Oğlak", Mars: "29° Koç", Jupiter: "20° Yengeç",
      Saturn: "21° Akrep", Uranus: "24° Yengeç", Neptune: "28° Terazi",
      Pluto: "25° Aslan",
    },
    refPoints: { Ascendant: "20° Başak", MC: "18° İkizler" },
    retrograde: ['Jupiter', 'Uranus', 'Neptune', 'Pluto'],
  },
  {
    name: 'Queen Elizabeth II',
    rodden: 'AA',
    // GMT (UTC+0): 02:40 GMT → UTC 02:40
    calestia: { year: 1926, month: 4, day: 21, hour: 2, minute: 40, latitude: 51.5, longitude: -0.1167, timezone: 'UTC' },
    ref: {
      Sun: "0° Boğa", Moon: "12° Aslan", Mercury: "4° Koç",
      Venus: "13° Balık", Mars: "20° Kova", Jupiter: "22° Kova",
      Saturn: "24° Akrep", Uranus: "27° Balık", Neptune: "22° Aslan",
      Pluto: "12° Yengeç",
    },
    refPoints: { Ascendant: "21° Oğlak", MC: "25° Akrep" },
    retrograde: ['Saturn', 'Neptune'],
  },
  {
    name: 'Muhammad Ali',
    rodden: 'AA',
    // CST (UTC-6): 18:35 CST → UTC 00:35 next day (Jan 18)
    calestia: { year: 1942, month: 1, day: 18, hour: 0, minute: 35, latitude: 38.25, longitude: -85.7667, timezone: 'UTC' },
    ref: {
      Sun: "27°17' Oğlak", Moon: "12°25' Kova", Mercury: "13°30' Oğlak",
      Venus: "20°40' Kova", Mars: "3°03' Boğa", Jupiter: "11°57' İkizler",
      Saturn: "21°39' Boğa", Uranus: "26°28' Boğa", Neptune: "29°48' Başak",
      Pluto: "4°48' Aslan", 'True Node': "15°56' Başak",
    },
    refPoints: { Ascendant: "19°31' Aslan", MC: "12°13' Boğa" },
    retrograde: ['Venus', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'True Node'],
  },
  {
    name: 'Frida Kahlo',
    rodden: 'AA',
    // LMT birth: Coyoacán 99°10'W → offset -6h 36m 40s → UTC ≈ 15:07
    calestia: { year: 1907, month: 7, day: 6, hour: 15, minute: 7, latitude: 19.35, longitude: -99.1667, timezone: 'UTC' },
    ref: {
      Sun: "13° Yengeç", Moon: "29° Boğa", Mercury: "6° Aslan",
      Venus: "24° İkizler", Mars: "13° Oğlak", Jupiter: "20° Yengeç",
      Saturn: "27° Balık", Uranus: "10° Oğlak", Neptune: "12° Yengeç",
      Pluto: "23° İkizler",
    },
    refPoints: { Ascendant: "29° Aslan", MC: "24° Boğa" },
    retrograde: ['Mars', 'Uranus'],
  },
  {
    name: 'Mahatma Gandhi',
    rodden: 'AA',
    // LMT birth: Porbandar 69°36'E → offset +4h 38m 24s → UTC ≈ 02:33
    calestia: { year: 1869, month: 10, day: 2, hour: 2, minute: 33, latitude: 21.6333, longitude: 69.6, timezone: 'UTC' },
    ref: {
      Sun: "8° Terazi", Moon: "19° Aslan", Mercury: "3° Akrep",
      Venus: "16° Akrep", Mars: "18° Akrep", Jupiter: "20° Boğa",
      Saturn: "12° Yay", Uranus: "21° Yengeç", Neptune: "18° Koç",
      Pluto: "17° Boğa",
    },
    refPoints: { Ascendant: "15° Terazi", MC: "20° Yengeç" },
    retrograde: ['Jupiter', 'Neptune', 'Pluto'],
  },
  {
    name: 'Beyoncé Knowles',
    rodden: 'A',
    // CDT (UTC-5): 10:00 CDT → UTC 15:00
    calestia: { year: 1981, month: 9, day: 4, hour: 15, minute: 0, latitude: 29.7667, longitude: -95.3667, timezone: 'UTC' },
    ref: {
      Sun: "12° Başak", Moon: "26° Akrep", Mercury: "3° Terazi",
      Venus: "20° Terazi", Mars: "1° Aslan", Jupiter: "12° Terazi",
      Saturn: "9° Terazi", Uranus: "26° Akrep", Neptune: "22° Yay",
      Pluto: "22° Terazi",
    },
    refPoints: { Ascendant: "20° Terazi", MC: "25° Yengeç" },
    retrograde: [],
  },
  {
    name: 'Nikola Tesla',
    rodden: 'AA',
    // LMT birth: Smiljan 15°19'E → offset +1h 01m 16s → UTC ≈ Jul 9 22:59
    calestia: { year: 1856, month: 7, day: 9, hour: 22, minute: 59, latitude: 44.5667, longitude: 15.3167, timezone: 'UTC' },
    ref: {
      Sun: "17° Yengeç", Moon: "24° Terazi", Mercury: "9° Aslan",
      Venus: "7° İkizler", Mars: "9° Terazi", Jupiter: "18° Koç",
      Saturn: "8° Yengeç", Uranus: "21° Boğa", Neptune: "18° Balık",
      Pluto: "4° Boğa",
    },
    refPoints: { Ascendant: "7° Koç", MC: "4° Oğlak" },
    retrograde: [],
  },
];

// ============================================================
// RUN VERIFICATION
// ============================================================

let totalChecks = 0;
let totalFails = 0;
let totalPlanetChecks = 0;
let totalPlanetFails = 0;

console.log('='.repeat(70));
console.log('ASTRO-DATABANK REFERENCE VERIFICATION');
console.log('Comparing Calestia output against 10 famous natal charts');
console.log('='.repeat(70));

for (const chartDef of CHARTS) {
  console.log(`\n${'─'.repeat(70)}`);
  console.log(`${chartDef.name} (Rodden ${chartDef.rodden})`);
  console.log(`${'─'.repeat(70)}`);

  const chart = calculateNatalChart(chartDef.calestia);

  // ========== PLANET POSITIONS ==========
  let chartFails = 0;

  for (const [bodyName, refStr] of Object.entries(chartDef.ref)) {
    const ref = parsePosition(refStr);
    const planet = chart.planets.find(p => p.name === bodyName);

    if (!planet) {
      console.log(`  FAIL: ${bodyName} not found in chart`);
      totalFails++; totalChecks++; chartFails++;
      continue;
    }

    totalChecks++;
    totalPlanetChecks++;

    // Determine tolerance based on precision level
    const tolerance = ref.precision === 'minute' ? 0.02 : 1.0; // 0.02° ≈ 1.2' for minute precision

    // Compare longitude
    let lonDiff = Math.abs(planet.longitude - ref.longitude);
    if (lonDiff > 180) lonDiff = 360 - lonDiff;

    const pass = lonDiff <= tolerance;
    const signMatch = planet.sign === ref.sign;

    if (!pass || !signMatch) {
      totalFails++;
      totalPlanetFails++;
      chartFails++;
      console.log(`  FAIL: ${bodyName.padEnd(12)} Calestia: ${planet.formattedPosition.padEnd(22)} Ref: ${refStr.padEnd(22)} diff: ${roundTo(lonDiff, 3)}° (tol: ${tolerance}°)`);
    } else {
      console.log(`  PASS: ${bodyName.padEnd(12)} Calestia: ${planet.formattedPosition.padEnd(22)} Ref: ${refStr.padEnd(22)} diff: ${roundTo(lonDiff, 3)}°`);
    }
  }

  // ========== ASC & MC ==========
  if (chartDef.refPoints) {
    for (const [pointName, refStr] of Object.entries(chartDef.refPoints)) {
      const ref = parsePosition(refStr);
      totalChecks++;

      let calestiaLon, calestiaFormatted;
      if (pointName === 'Ascendant') {
        calestiaLon = chart.houses.ascendant.longitude;
        calestiaFormatted = chart.houses.ascendant.formatted;
      } else if (pointName === 'MC') {
        calestiaLon = chart.houses.midheaven.longitude;
        calestiaFormatted = chart.houses.midheaven.formatted;
      }

      const tolerance = ref.precision === 'minute' ? 0.05 : 1.5; // Slightly wider for houses (sensitive to birth time)

      let lonDiff = Math.abs(calestiaLon - ref.longitude);
      if (lonDiff > 180) lonDiff = 360 - lonDiff;

      const signMatch = (pointName === 'Ascendant' ? chart.houses.ascendant.sign : chart.houses.midheaven.sign) === ref.sign;
      const pass = lonDiff <= tolerance && signMatch;

      if (!pass) {
        totalFails++;
        chartFails++;
        console.log(`  FAIL: ${pointName.padEnd(12)} Calestia: ${calestiaFormatted.padEnd(22)} Ref: ${refStr.padEnd(22)} diff: ${roundTo(lonDiff, 3)}° (tol: ${tolerance}°)`);
      } else {
        console.log(`  PASS: ${pointName.padEnd(12)} Calestia: ${calestiaFormatted.padEnd(22)} Ref: ${refStr.padEnd(22)} diff: ${roundTo(lonDiff, 3)}°`);
      }
    }
  }

  // ========== RETROGRADE STATUS ==========
  if (chartDef.retrograde) {
    for (const retroName of chartDef.retrograde) {
      const planet = chart.planets.find(p => p.name === retroName);
      if (planet) {
        totalChecks++;
        if (!planet.isRetrograde) {
          totalFails++;
          chartFails++;
          console.log(`  FAIL: ${retroName} should be retrograde`);
        } else {
          console.log(`  PASS: ${retroName.padEnd(12)} retrograde confirmed`);
        }
      }
    }
  }

  // ========== SUMMARY FOR THIS CHART ==========
  if (chartFails === 0) {
    console.log(`  ★ ${chartDef.name}: ALL CHECKS PASSED`);
  } else {
    console.log(`  ✗ ${chartDef.name}: ${chartFails} FAILURE(S)`);
  }
}

// ============================================================
// FINAL SUMMARY
// ============================================================

console.log('\n' + '='.repeat(70));
console.log('FINAL SUMMARY');
console.log('='.repeat(70));
console.log(`  Charts tested:     10`);
console.log(`  Total checks:      ${totalChecks}`);
console.log(`  Total failures:    ${totalFails}`);
console.log(`  Planet checks:     ${totalPlanetChecks} (${totalPlanetFails} failures)`);
console.log(`  Pass rate:         ${roundTo((totalChecks - totalFails) / totalChecks * 100, 1)}%`);
console.log('='.repeat(70));

if (totalFails === 0) {
  console.log('  ★ ALL POSITIONS MATCH ASTRO-DATABANK REFERENCES');
} else {
  console.log(`  ⚠ ${totalFails} position(s) differ from reference`);
  console.log('  Note: Small differences may be due to:');
  console.log('    - LMT offset rounding (seconds matter for Moon/ASC)');
  console.log('    - Reference source using different ephemeris edition');
  console.log('    - Reference rounding conventions');
}

console.log('='.repeat(70));

if (totalFails > 0) process.exit(1);
