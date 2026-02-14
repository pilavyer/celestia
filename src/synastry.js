// src/synastry.js
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
    },
    composite,
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
