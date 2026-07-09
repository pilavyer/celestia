// src/transit-hits.js
// Single-call "transit hits" calculation: all aspects the transiting planets make
// to a natal chart at a given moment, sorted by orb. Designed as an aggregation
// layer for agent/chatbot consumers so they don't need N separate calls.

import { calculateNatalChart } from './calculator.js';
import { calculateCrossAspects } from './aspects.js';
import { calculateVoidOfCourseMoon } from './transit.js';

const TRANSIT_BODIES = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Chiron',
];

const NATAL_TARGET_BODIES = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Chiron', 'True Node',
];

/**
 * Calculate all transit→natal aspects at a single moment.
 *
 * @param {object} params
 * @param {number} params.year   - Natal birth year
 * @param {number} params.month  - Natal birth month (1-12)
 * @param {number} params.day    - Natal birth day
 * @param {number} params.hour   - Natal birth hour
 * @param {number} params.minute - Natal birth minute
 * @param {number} params.latitude  - Natal latitude
 * @param {number} params.longitude - Natal longitude (east positive)
 * @param {string} params.timezone  - IANA timezone (also used for the transit moment)
 * @param {string} [params.houseSystem='P'] - House system for the natal chart
 * @param {string} params.date   - Transit date "YYYY-MM-DD"
 * @param {string} [params.time='12:00'] - Transit local time "HH:mm" (in params.timezone)
 * @param {number} [params.orbScale=0.5] - Orb scale applied to natal aspect orbs
 *   (0.5 is the engine's standard transit orb rule)
 * @param {boolean} [params.includeAngles=true] - Include natal ASC/MC as targets
 * @returns {object} { transitMoment, transits, lunar, retrogrades, meta }
 */
export function calculateTransitHits(params) {
  const {
    year, month, day, hour, minute, latitude, longitude, timezone,
    houseSystem = 'P',
    date, time = '12:00',
    orbScale = 0.5,
    includeAngles = true,
  } = params;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
    throw new Error(`Invalid date: "${date}". Expected format: YYYY-MM-DD`);
  }
  if (!/^\d{2}:\d{2}$/.test(String(time))) {
    throw new Error(`Invalid time: "${time}". Expected format: HH:mm`);
  }
  if (typeof orbScale !== 'number' || orbScale <= 0 || orbScale > 2) {
    throw new Error('Invalid orbScale. Expected a number in (0, 2]');
  }

  // Natal chart
  const natal = calculateNatalChart({
    year, month, day, hour, minute, latitude, longitude, timezone, houseSystem,
  });

  // Transit-moment chart (planet longitudes are location-independent; we reuse the
  // natal coordinates and interpret date/time in the given IANA timezone)
  const [tYear, tMonth, tDay] = date.split('-').map(Number);
  const [tHour, tMinute] = time.split(':').map(Number);
  const transitChart = calculateNatalChart({
    year: tYear, month: tMonth, day: tDay, hour: tHour, minute: tMinute,
    latitude, longitude, timezone, houseSystem,
  });

  const transitBodies = transitChart.planets
    .filter((p) => TRANSIT_BODIES.includes(p.name))
    .map((p) => ({ name: p.name, longitude: p.longitude, isRetrograde: p.isRetrograde }));

  const natalTargets = natal.planets
    .filter((p) => NATAL_TARGET_BODIES.includes(p.name))
    .map((p) => ({ name: p.name, longitude: p.longitude }));

  if (includeAngles) {
    natalTargets.push(
      { name: 'Ascendant', longitude: natal.houses.ascendant.longitude },
      { name: 'Midheaven', longitude: natal.houses.midheaven.longitude },
    );
  }

  const retroByName = new Map(transitBodies.map((b) => [b.name, b.isRetrograde]));

  const hits = calculateCrossAspects(transitBodies, natalTargets, { orbScale })
    .map((a) => ({
      transitPlanet: a.planet1,
      isRetrograde: retroByName.get(a.planet1) ?? false,
      type: a.type,
      symbol: a.symbol,
      natalPoint: a.planet2,
      orb: a.orb,
      actualAngle: a.actualAngle,
      strength: a.strength,
      isApplying: a.isApplying,
      isExact: a.orb < 0.8,
    }))
    .sort((x, y) => x.orb - y.orb);

  // Lunar / VoC status at the transit moment
  const vocMoon = calculateVoidOfCourseMoon(transitChart.meta.julianDayET);
  const moon = transitChart.planets.find((p) => p.name === 'Moon');

  return {
    transitMoment: {
      localTime: `${date}T${time}`,
      timezone,
      utcTime: transitChart.input?.utcTime,
    },
    transits: hits,
    lunar: {
      moonSign: moon?.sign,
      moonLongitude: moon?.longitude,
      isVoidOfCourse: vocMoon.isVoidOfCourse,
      vocStartTime: vocMoon.vocStartTime,
      vocEndTime: vocMoon.vocEndTime,
      nextIngress: vocMoon.nextIngress,
    },
    retrogrades: transitBodies.filter((b) => b.isRetrograde).map((b) => b.name),
    meta: {
      orbScale,
      includeAngles,
      houseSystem,
      hitCount: hits.length,
      engine: 'Celestia transit-hits (Swiss Ephemeris)',
    },
  };
}
