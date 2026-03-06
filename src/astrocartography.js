// src/astrocartography.js
// Astrocartography — planetary line calculations across world coordinates
import * as swe from 'sweph';
import path from 'path';
import { fileURLToPath } from 'url';
import { CELESTIAL_BODIES, SIGNS } from './constants.js';
import { longitudeToSign, roundTo } from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ephePath = path.join(__dirname, '..', 'ephe');
swe.set_ephe_path(ephePath);

const calcFlags = swe.constants.SEFLG_SWIEPH | swe.constants.SEFLG_SPEED;

// Turkish planet name lookup
const PLANET_TR = {};
CELESTIAL_BODIES.forEach(b => { PLANET_TR[b.name] = b.trName; });
PLANET_TR['Ascendant'] = 'Yükselen';
PLANET_TR['Midheaven'] = 'Gökyüzü Ortası';

/**
 * Calculate astrocartography lines for a natal chart.
 *
 * For each planet, calculates where it would be on the ASC, DSC, MC, or IC
 * at various longitudes around the world. This produces lines that can be
 * plotted on a world map.
 *
 * @param {object} natalChart - Chart from calculateNatalChart()
 * @param {object} [options]
 * @param {number} [options.longitudeStep=5] - Step size in degrees for longitude sampling (smaller = more points, slower)
 * @param {string[]} [options.planets] - Planet names to include (default: all)
 * @param {string[]} [options.lineTypes] - Line types: 'ASC', 'DSC', 'MC', 'IC' (default: all)
 * @returns {object} Astrocartography data with GeoJSON-compatible lines
 */
export function calculateAstrocartography(natalChart, options = {}) {
  const {
    longitudeStep = 5,
    planets: planetFilter,
    lineTypes = ['ASC', 'DSC', 'MC', 'IC'],
  } = options;

  const jd_ut = natalChart.meta?.julianDayUT;
  const jd_et = natalChart.meta?.julianDayET;
  if (!jd_ut || !jd_et) {
    throw new Error('Natal chart must contain meta.julianDayUT and meta.julianDayET');
  }

  // Get planet positions at birth (these are fixed — same everywhere on Earth)
  const natalPlanets = natalChart.planets.filter(p => {
    if (planetFilter) return planetFilter.includes(p.name);
    // Exclude nodes and Lilith for ACG (not traditionally used)
    return !['True Node', 'Mean Node', 'South Node', 'Lilith', 'Osculating Lilith'].includes(p.name);
  });

  const lines = [];

  // ARMC (sidereal time at birth) — this is fixed for the birth moment
  const armc = natalChart.meta.siderealTime;

  for (const planet of natalPlanets) {
    // Get declination for this planet
    const result = swe.calc(jd_et, planet.id, calcFlags | swe.constants.SEFLG_EQUATORIAL);
    const declination = result.data[1]; // equatorial latitude = declination

    // ======== MC/IC LINES ========
    // MC/IC lines are vertical (constant longitude) where the planet culminates
    // MC line: planet is on the meridian (conjunction with MC)
    // The longitude where planet is on MC depends on ARMC and planet's RA

    if (lineTypes.includes('MC') || lineTypes.includes('IC')) {
      // Planet's right ascension
      const raResult = swe.calc(jd_et, planet.id, calcFlags | swe.constants.SEFLG_EQUATORIAL);
      const planetRA = raResult.data[0]; // right ascension

      // MC longitude = where ARMC matches planet's RA
      // The planet's RA - natal ARMC gives the longitude offset
      let mcLongitude = planetRA - armc;
      // Normalize to -180 to +180
      while (mcLongitude > 180) mcLongitude -= 360;
      while (mcLongitude < -180) mcLongitude += 360;

      if (lineTypes.includes('MC')) {
        // MC line is vertical at this longitude
        const mcPoints = [];
        for (let lat = -65; lat <= 65; lat += 5) {
          mcPoints.push([roundTo(mcLongitude, 2), lat]);
        }
        lines.push({
          planet: planet.name,
          planetTr: PLANET_TR[planet.name] || planet.name,
          lineType: 'MC',
          lineTypeTr: 'Gökyüzü Ortası',
          coordinates: mcPoints,
        });
      }

      if (lineTypes.includes('IC')) {
        // IC is 180° from MC
        let icLongitude = mcLongitude + 180;
        if (icLongitude > 180) icLongitude -= 360;

        const icPoints = [];
        for (let lat = -65; lat <= 65; lat += 5) {
          icPoints.push([roundTo(icLongitude, 2), lat]);
        }
        lines.push({
          planet: planet.name,
          planetTr: PLANET_TR[planet.name] || planet.name,
          lineType: 'IC',
          lineTypeTr: 'Göğüs Altı',
          coordinates: icPoints,
        });
      }
    }

    // ======== ASC/DSC LINES ========
    // ASC line: planet is on the eastern horizon (rising)
    // DSC line: planet is on the western horizon (setting)
    // These are curved lines that depend on latitude

    if (lineTypes.includes('ASC') || lineTypes.includes('DSC')) {
      const ascPoints = [];
      const dscPoints = [];

      // For each longitude, find the latitude where this planet would be on ASC/DSC
      for (let lon = -180; lon <= 180; lon += longitudeStep) {
        // Calculate houses at this longitude for a range of latitudes
        // We find the latitude where the ASC matches the planet's longitude

        // Binary search approach: scan latitudes to find where planet is on ASC
        for (let lat = -65; lat <= 65; lat += 2) {
          try {
            const housesResult = swe.houses(jd_ut, lat, lon, 'P');
            const asc = housesResult.data.points[0];

            // Check if planet longitude is near ASC
            let diff = Math.abs(planet.longitude - asc);
            if (diff > 180) diff = 360 - diff;

            if (diff < 3) {
              // Refine with smaller steps
              for (let refineLat = lat - 2; refineLat <= lat + 2; refineLat += 0.5) {
                try {
                  const refineResult = swe.houses(jd_ut, refineLat, lon, 'P');
                  const refineAsc = refineResult.data.points[0];
                  let refineDiff = Math.abs(planet.longitude - refineAsc);
                  if (refineDiff > 180) refineDiff = 360 - refineDiff;

                  if (refineDiff < 1.5) {
                    if (lineTypes.includes('ASC')) {
                      ascPoints.push([roundTo(lon, 2), roundTo(refineLat, 1)]);
                    }
                    // DSC is 180° from ASC on the same latitude
                    if (lineTypes.includes('DSC')) {
                      const dsc = (refineAsc + 180) % 360;
                      let dscDiff = Math.abs(planet.longitude - dsc);
                      if (dscDiff > 180) dscDiff = 360 - dscDiff;
                      // DSC check not needed here — we compute DSC line separately
                    }
                    break;
                  }
                } catch (e) { /* skip invalid latitudes */ }
              }
            }

            // Check DSC (= ASC + 180)
            const dsc = (asc + 180) % 360;
            let dscDiff = Math.abs(planet.longitude - dsc);
            if (dscDiff > 180) dscDiff = 360 - dscDiff;

            if (dscDiff < 3) {
              for (let refineLat = lat - 2; refineLat <= lat + 2; refineLat += 0.5) {
                try {
                  const refineResult = swe.houses(jd_ut, refineLat, lon, 'P');
                  const refineAsc = refineResult.data.points[0];
                  const refineDsc = (refineAsc + 180) % 360;
                  let refineDiff = Math.abs(planet.longitude - refineDsc);
                  if (refineDiff > 180) refineDiff = 360 - refineDiff;

                  if (refineDiff < 1.5) {
                    if (lineTypes.includes('DSC')) {
                      dscPoints.push([roundTo(lon, 2), roundTo(refineLat, 1)]);
                    }
                    break;
                  }
                } catch (e) { /* skip */ }
              }
            }
          } catch (e) { /* skip invalid locations */ }
        }
      }

      if (lineTypes.includes('ASC') && ascPoints.length > 0) {
        lines.push({
          planet: planet.name,
          planetTr: PLANET_TR[planet.name] || planet.name,
          lineType: 'ASC',
          lineTypeTr: 'Yükselen',
          coordinates: ascPoints,
        });
      }

      if (lineTypes.includes('DSC') && dscPoints.length > 0) {
        lines.push({
          planet: planet.name,
          planetTr: PLANET_TR[planet.name] || planet.name,
          lineType: 'DSC',
          lineTypeTr: 'Alçalan',
          coordinates: dscPoints,
        });
      }
    }
  }

  return {
    success: true,
    type: 'astrocartography',
    totalLines: lines.length,
    longitudeStep,
    lines,
    meta: {
      birthTime: natalChart.input?.localTime,
      engine: 'Celestia (Swiss Ephemeris)',
    },
  };
}
