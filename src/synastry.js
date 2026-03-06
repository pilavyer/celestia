// src/synastry.js
import * as swe from 'sweph';
import { calculateNatalChart } from './calculator.js';
import { calculateAspects, calculateCrossAspects } from './aspects.js';
import {
  longitudeToSign,
  findPlanetInHouse,
  getElementDistribution,
  getModalityDistribution,
  roundTo,
} from './utils.js';
import { getDignity } from './dignities.js';

/**
 * Calculate the midpoint between two longitudes.
 * Correctly handles the 0°/360° wrap-around.
 *
 * @param {number} lon1 - First longitude (0-360°)
 * @param {number} lon2 - Second longitude (0-360°)
 * @returns {number} Midpoint longitude (0-360°)
 */
export function midpoint(lon1, lon2) {
  let diff = Math.abs(lon1 - lon2);

  if (diff <= 180) {
    // Short-arc midpoint
    let mid = (lon1 + lon2) / 2;
    if (mid < 0) mid += 360;
    return mid % 360;
  } else {
    // Long-arc midpoint — add 180° and take the short-arc
    let mid = (lon1 + lon2) / 2 + 180;
    if (mid < 0) mid += 360;
    return mid % 360;
  }
}

/**
 * Calculate full synastry: natal charts for both persons, cross-aspects,
 * house overlay, and composite chart.
 *
 * @param {object} person1Data - Person 1's birth data (calculateNatalChart parameters)
 * @param {object} person2Data - Person 2's birth data
 * @returns {object} Synastry result
 */
export function calculateSynastry(person1Data, person2Data) {
  // ========== NATAL CHARTS ==========
  const chart1 = calculateNatalChart(person1Data);
  const chart2 = calculateNatalChart(person2Data);

  // ========== CROSS-ASPECTS ==========
  // Planets from both charts + ASC/MC included
  const bodies1 = [
    ...chart1.planets,
    { name: 'Ascendant', trName: 'Yükselen', longitude: chart1.houses.ascendant.longitude, speed: 0 },
    { name: 'Midheaven', trName: 'Gökyüzü Ortası', longitude: chart1.houses.midheaven.longitude, speed: 0 },
  ];
  const bodies2 = [
    ...chart2.planets,
    { name: 'Ascendant', trName: 'Yükselen', longitude: chart2.houses.ascendant.longitude, speed: 0 },
    { name: 'Midheaven', trName: 'Gökyüzü Ortası', longitude: chart2.houses.midheaven.longitude, speed: 0 },
  ];

  const crossAspects = calculateCrossAspects(bodies1, bodies2);

  // ========== HOUSE OVERLAY ==========
  // Person 1's planets in Person 2's houses
  const cusps2 = [0, ...chart2.houses.cusps.map(h => h.cusp)];
  const person1InPerson2Houses = chart1.planets.map(planet => ({
    planet: planet.name,
    planetTr: planet.trName,
    sign: planet.sign,
    longitude: planet.longitude,
    house: findPlanetInHouse(planet.longitude, cusps2),
  }));

  // Person 2's planets in Person 1's houses
  const cusps1 = [0, ...chart1.houses.cusps.map(h => h.cusp)];
  const person2InPerson1Houses = chart2.planets.map(planet => ({
    planet: planet.name,
    planetTr: planet.trName,
    sign: planet.sign,
    longitude: planet.longitude,
    house: findPlanetInHouse(planet.longitude, cusps1),
  }));

  // ========== COMPOSITE CHART ==========
  const composite = calculateComposite(chart1, chart2);

  // ========== DAVISON RELATIONSHIP CHART ==========
  const davison = calculateDavison(chart1, chart2, person1Data, person2Data);

  // ========== COMPATIBILITY SCORE ==========
  const score = calculateCompatibilityScore(crossAspects);

  // ========== RESULT ==========
  return {
    person1: {
      input: chart1.input,
      planets: chart1.planets,
      houses: chart1.houses,
      aspects: chart1.aspects,
      analysis: chart1.analysis,
    },
    person2: {
      input: chart2.input,
      planets: chart2.planets,
      houses: chart2.houses,
      aspects: chart2.aspects,
      analysis: chart2.analysis,
    },
    synastry: {
      crossAspects,
      houseOverlay: {
        person1InPerson2Houses,
        person2InPerson1Houses,
      },
      score,
    },
    composite,
    davison,
  };
}

/**
 * Calculate composite chart (midpoint method).
 * Midpoints are computed for each planet pair, ASC, MC, and house cusps.
 */
function calculateComposite(chart1, chart2) {
  // Composite planet positions
  const compositePlanets = [];

  for (const p1 of chart1.planets) {
    const p2 = chart2.planets.find(p => p.name === p1.name);
    if (!p2) continue;

    const mid = midpoint(p1.longitude, p2.longitude);
    const signData = longitudeToSign(mid);
    // Midpoint speed: average of both speeds
    const avgSpeed = (p1.speed + p2.speed) / 2;

    compositePlanets.push({
      name: p1.name,
      trName: p1.trName,
      longitude: roundTo(mid, 6),
      speed: roundTo(avgSpeed, 6),
      sign: signData.sign,
      signIndex: signData.signIndex,
      degree: signData.degree,
      minute: signData.minute,
      second: signData.second,
      isRetrograde: avgSpeed < 0,
      dignity: getDignity(p1.name, signData.sign),
      formattedPosition: `${signData.degree}°${String(signData.minute).padStart(2, '0')}'${String(signData.second).padStart(2, '0')}" ${signData.sign}`,
    });
  }

  // Composite ASC and MC
  const compAsc = midpoint(chart1.houses.ascendant.longitude, chart2.houses.ascendant.longitude);
  const compMc = midpoint(chart1.houses.midheaven.longitude, chart2.houses.midheaven.longitude);

  const ascData = longitudeToSign(compAsc);
  const mcData = longitudeToSign(compMc);

  // Composite house cusps (midpoint)
  const compositeHouseCusps = [];
  for (let i = 0; i < 12; i++) {
    const cusp1 = chart1.houses.cusps[i].cusp;
    const cusp2 = chart2.houses.cusps[i].cusp;
    const mid = midpoint(cusp1, cusp2);
    const cuspData = longitudeToSign(mid);

    compositeHouseCusps.push({
      house: i + 1,
      cusp: roundTo(mid, 6),
      sign: cuspData.sign,
      degree: cuspData.degree,
      minute: cuspData.minute,
      formattedCusp: `${cuspData.degree}°${String(cuspData.minute).padStart(2, '0')}' ${cuspData.sign}`,
    });
  }

  // Composite cusps array (1-indexed, for findPlanetInHouse)
  const compCusps = [0, ...compositeHouseCusps.map(h => h.cusp)];

  // Composite planets + house assignment
  const compositePlanetsWithHouses = compositePlanets.map(planet => ({
    ...planet,
    house: findPlanetInHouse(planet.longitude, compCusps),
  }));

  // Composite aspects
  const aspectBodies = [
    ...compositePlanetsWithHouses,
    { name: 'Ascendant', trName: 'Yükselen', longitude: compAsc, speed: 0 },
    { name: 'Midheaven', trName: 'Gökyüzü Ortası', longitude: compMc, speed: 0 },
  ];
  const compositeAspects = calculateAspects(aspectBodies);

  // Composite Vertex (midpoint)
  const compVertex = midpoint(chart1.houses.vertex.longitude, chart2.houses.vertex.longitude);
  const vtxData = longitudeToSign(compVertex);

  // Element and modality distribution
  const elementDist = getElementDistribution(compositePlanetsWithHouses);
  const modalityDist = getModalityDistribution(compositePlanetsWithHouses);

  return {
    planets: compositePlanetsWithHouses,
    houses: {
      system: chart1.houses.system,
      systemName: chart1.houses.systemName,
      cusps: compositeHouseCusps,
      ascendant: {
        longitude: roundTo(compAsc, 6),
        sign: ascData.sign,
        degree: ascData.degree,
        minute: ascData.minute,
        formatted: `${ascData.degree}°${String(ascData.minute).padStart(2, '0')}' ${ascData.sign}`,
      },
      midheaven: {
        longitude: roundTo(compMc, 6),
        sign: mcData.sign,
        degree: mcData.degree,
        minute: mcData.minute,
        formatted: `${mcData.degree}°${String(mcData.minute).padStart(2, '0')}' ${mcData.sign}`,
      },
      vertex: {
        longitude: roundTo(compVertex, 6),
        sign: vtxData.sign,
        degree: vtxData.degree,
        minute: vtxData.minute,
      },
    },
    aspects: compositeAspects,
    analysis: {
      elements: elementDist,
      modalities: modalityDist,
    },
  };
}

/**
 * Calculate Davison Relationship Chart.
 * Uses the arithmetic midpoint in time (JD average) and space (coordinate average)
 * to create a real natal chart representing the relationship itself.
 *
 * Unlike the composite chart (mathematical midpoints of planet longitudes),
 * the Davison chart is a real astronomical chart calculated at the midpoint moment.
 */
function calculateDavison(chart1, chart2, person1Data, person2Data) {
  // Midpoint Julian Day (use JD_UT for date reconstruction)
  const midJD_UT = (chart1.meta.julianDayUT + chart2.meta.julianDayUT) / 2;

  // Midpoint coordinates
  const midLat = (person1Data.latitude + person2Data.latitude) / 2;
  const midLon = (person1Data.longitude + person2Data.longitude) / 2;

  // Convert midpoint JD back to calendar date (UTC)
  const rev = swe.revjul(midJD_UT, swe.constants.SE_GREG_CAL);
  const year = rev.year;
  const month = rev.month;
  const day = rev.day;
  const hour = Math.floor(rev.hour);
  const minute = Math.round((rev.hour - hour) * 60);

  // Calculate full natal chart at the midpoint
  const davisonChart = calculateNatalChart({
    year,
    month,
    day,
    hour,
    minute: Math.min(minute, 59), // safety clamp
    latitude: midLat,
    longitude: midLon,
    timezone: 'UTC',
    houseSystem: person1Data.houseSystem || 'P',
  });

  // Format midpoint date as ISO string
  const midpointDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(Math.min(minute, 59)).padStart(2, '0')}:00.000Z`;

  return {
    midpointDate,
    midpointJD: roundTo(midJD_UT, 8),
    midpointLocation: {
      latitude: roundTo(midLat, 4),
      longitude: roundTo(midLon, 4),
    },
    planets: davisonChart.planets,
    houses: davisonChart.houses,
    aspects: davisonChart.aspects,
    analysis: davisonChart.analysis,
  };
}

/**
 * Calculate synastry compatibility score from cross-aspects.
 *
 * Scoring methodology:
 * - Each cross-aspect contributes weighted points based on aspect type, planet importance, and tightness
 * - Harmonious aspects (conjunction, trine, sextile, semi-sextile) add positive points
 * - Challenging aspects (square, opposition, quincunx) add negative points
 * - Final score: ratio of positive to total absolute points, mapped to 0-100
 */
function calculateCompatibilityScore(crossAspects) {
  // Aspect type weights (positive = harmonious, negative = challenging)
  const ASPECT_WEIGHTS = {
    'Conjunction':  10,
    'Trine':         8,
    'Sextile':       6,
    'Semi-sextile':  2,
    'Square':       -4,
    'Opposition':   -6,
    'Quincunx':     -2,
  };

  // Planet importance coefficients (Sun/Moon/Venus/Mars = high, outer = lower)
  const PLANET_IMPORTANCE = {
    'Sun': 10, 'Moon': 10, 'Venus': 9, 'Mars': 8,
    'Ascendant': 8, 'Jupiter': 7, 'Mercury': 6, 'Saturn': 6,
    'Midheaven': 6, 'Uranus': 4, 'Neptune': 4, 'Pluto': 4,
    'Chiron': 3, 'True Node': 3, 'Lilith': 2, 'South Node': 2,
  };

  let totalPositive = 0;
  let totalNegative = 0;
  const details = [];

  for (const aspect of crossAspects) {
    const weight = ASPECT_WEIGHTS[aspect.type];
    if (weight === undefined) continue;

    const imp1 = PLANET_IMPORTANCE[aspect.planet1] || 3;
    const imp2 = PLANET_IMPORTANCE[aspect.planet2] || 3;
    const planetFactor = (imp1 + imp2) / 20; // ~0.3-1.0 range
    const strengthFactor = aspect.strength / 100; // 0-1 based on orb tightness

    const points = Math.abs(weight) * planetFactor * strengthFactor;
    const isHarmonious = weight > 0;

    if (isHarmonious) {
      totalPositive += points;
    } else {
      totalNegative += points;
    }

    details.push({
      planet1: aspect.planet1,
      planet2: aspect.planet2,
      type: aspect.type,
      points: roundTo(isHarmonious ? points : -points, 2),
      isHarmonious,
    });
  }

  // Score = positive ratio * 100
  const total = totalPositive + totalNegative;
  const score = total > 0 ? Math.round((totalPositive / total) * 100) : 50;

  // Score labels
  const scoreLabel = getScoreLabel(score);

  return {
    score: Math.max(0, Math.min(100, score)),
    scoreTr: scoreLabel.tr,
    scoreLabel: scoreLabel.en,
    totalHarmony: roundTo(totalPositive, 2),
    totalTension: roundTo(totalNegative, 2),
    harmoniousCount: details.filter(d => d.isHarmonious).length,
    challengingCount: details.filter(d => !d.isHarmonious).length,
    topAspects: details.sort((a, b) => Math.abs(b.points) - Math.abs(a.points)).slice(0, 10),
  };
}

function getScoreLabel(score) {
  if (score >= 80) return { en: 'Excellent Harmony', tr: 'Mükemmel Uyum' };
  if (score >= 65) return { en: 'Strong Harmony', tr: 'Güçlü Uyum' };
  if (score >= 50) return { en: 'Balanced', tr: 'Dengeli' };
  if (score >= 35) return { en: 'Challenging', tr: 'Zorlu' };
  return { en: 'Very Challenging', tr: 'Çok Zorlu' };
}
